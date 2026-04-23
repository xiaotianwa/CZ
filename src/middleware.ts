import { NextRequest, NextResponse } from 'next/server';

/**
 * 统一中间件
 * 1. IP 级别写入限流（POST/PUT/PATCH/DELETE）
 * 2. /api/admin/* 路径（除 login/logout）要求 admin_token cookie 存在
 * 3. /api/auth/* 路径（除 login/logout/register 等公开接口）要求 token cookie 存在
 * 注意：此处仅做 cookie 存在性快速拒绝，具体 JWT 验证仍在各 route handler 中执行
 */

const ADMIN_PUBLIC_PATHS = ['/api/admin/auth/login', '/api/admin/auth/logout'];
const AUTH_PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/me'];
// TCG 独立运营后台 —— 独立 cookie（tcg_admin_token），与社区 /admin 互不干扰
const TCG_ADMIN_PUBLIC_PATHS = ['/api/tcg/admin/auth/login', '/api/tcg/admin/auth/logout'];

// ===================== 写入限流（内存级） =====================
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

interface RateRecord { count: number; resetAt: number }
const writeRateStore = new Map<string, RateRecord>();

// 不同路径的限流策略
function getWriteRateConfig(pathname: string): { windowMs: number; max: number } {
  // 登录/注册 —— 更严格
  if (pathname.includes('/login') || pathname.includes('/register')) {
    return { windowMs: 60_000, max: 10 };
  }
  // 文件上传 —— 限制频次防刷
  if (pathname.includes('/upload')) {
    return { windowMs: 60_000, max: 20 };
  }
  // 通用写入（发帖/评论/反馈等）
  return { windowMs: 60_000, max: 30 };
}

function checkWriteRate(ip: string, pathname: string): number | null {
  const config = getWriteRateConfig(pathname);
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const record = writeRateStore.get(key);

  if (record && now < record.resetAt) {
    if (record.count >= config.max) {
      return Math.ceil((record.resetAt - now) / 1000);
    }
    record.count++;
    return null;
  }
  writeRateStore.set(key, { count: 1, resetAt: now + config.windowMs });
  return null;
}

// 定期清理
if (typeof globalThis !== 'undefined') {
  const g = globalThis as unknown as { _mwCleanup?: boolean };
  if (!g._mwCleanup) {
    g._mwCleanup = true;
    setInterval(() => {
      const now = Date.now();
      Array.from(writeRateStore.entries()).forEach(([k, r]) => {
        if (now >= r.resetAt) writeRateStore.delete(k);
      });
    }, 3 * 60 * 1000).unref?.();
  }
}

// ===================== 防缓存工具 =====================

/** 为 API 响应注入 no-cache 头，防止 Nginx proxy_cache 缓存认证响应导致用户串号 */
function addNoCacheHeaders(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('Vary', 'Cookie, Authorization');
  return res;
}

// ===================== 中间件主函数 =====================

function getClientIp(req: NextRequest): string {
  // 优先使用反向代理设置的 X-Real-IP（由 Nginx 设置，不可伪造）
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  // x-forwarded-for 在无反代时可被客户端伪造，仅作为降级手段
  // 生产环境应确保 Nginx 设置了 X-Real-IP
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    // 只取第一个 IP（最外层代理添加的），并验证基本格式
    const ip = xff.split(',')[0].trim();
    if (/^[\d.:a-fA-F]+$/.test(ip)) return ip;
  }
  return '127.0.0.1';
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const start = Date.now();
  const ip = getClientIp(req);

  // 生产环境强制 https：
  // 登录 cookie 带 Secure，http 访问时浏览器不会回传 cookie，
  // 会导致用户前台显示“已登录”但所有鉴权接口 401（看起来像登录循环）。
  // Nginx 侧若未配置 301 到 https，就由应用层兜底。
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers.get('x-forwarded-proto');
    if (proto && proto.toLowerCase() === 'http') {
      const host = req.headers.get('host') || req.nextUrl.host;
      const target = `https://${host}${pathname}${req.nextUrl.search}`;
      return NextResponse.redirect(target, 308);
    }
  }

  // 请求日志（仅记录 API 请求）
  const logRequest = (status: number) => {
    const duration = Date.now() - start;
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    console.log(
      `[${level}] ${req.method} ${pathname} ${status} ${duration}ms ip=${ip}`
    );
  };

  // 写入请求统一限流
  if (WRITE_METHODS.has(req.method)) {
    const wait = checkWriteRate(getClientIp(req), pathname);
    if (wait !== null) {
      logRequest(429);
      return addNoCacheHeaders(NextResponse.json(
        { code: 429, message: `操作过于频繁，请 ${wait} 秒后再试`, data: null },
        { status: 429 }
      ));
    }
  }

  // Admin API 路径保护
  if (pathname.startsWith('/api/admin/')) {
    if (ADMIN_PUBLIC_PATHS.some((p) => pathname === p)) {
      return addNoCacheHeaders(NextResponse.next());
    }
    const adminToken = req.cookies.get('admin_token')?.value;
    if (!adminToken) {
      logRequest(401);
      return addNoCacheHeaders(NextResponse.json(
        { code: 401, message: '管理员未登录', data: null },
        { status: 401 }
      ));
    }
  }

  // TCG 运营后台 API 路径保护（独立 cookie tcg_admin_token）
  if (pathname.startsWith('/api/tcg/admin/')) {
    if (TCG_ADMIN_PUBLIC_PATHS.some((p) => pathname === p)) {
      return addNoCacheHeaders(NextResponse.next());
    }
    const tcgToken = req.cookies.get('tcg_admin_token')?.value;
    if (!tcgToken) {
      logRequest(401);
      return addNoCacheHeaders(NextResponse.json(
        { code: 401, message: 'TCG 运营账号未登录', data: null },
        { status: 401 }
      ));
    }
  }

  // Auth API 路径保护（需要用户登录的接口）
  if (pathname.startsWith('/api/auth/') && !AUTH_PUBLIC_PATHS.some((p) => pathname === p)) {
    const userToken = req.cookies.get('token')?.value;
    if (!userToken) {
      logRequest(401);
      return addNoCacheHeaders(NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      ));
    }
  }

  // TCG 好友房 API 保护（需要社区用户登录）
  if (pathname.startsWith('/api/tcg/room/')) {
    const userToken = req.cookies.get('token')?.value;
    if (!userToken) {
      logRequest(401);
      return addNoCacheHeaders(NextResponse.json(
        { code: 401, message: '请先登录后再进行好友对战', data: null },
        { status: 401 }
      ));
    }
  }

  // 正常放行 —— 统一注入防缓存头
  return addNoCacheHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/api/:path*'],
};
