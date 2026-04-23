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
// 公共读接口限流（防爬虫批量抓取）与写限流分桶，避免互相挤占。
const readRateStore = new Map<string, RateRecord>();

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

/**
 * 公共读接口限流：同一 IP 每分钟 120 次 GET（平均每秒 2 次），
 * 正常浏览/翻页远低于此阈值，爬虫批量抓取会被快速拦截。
 * key 按 IP 全局限流（不按 path），避免爬虫换 path 绕过。
 */
function checkPublicReadRate(ip: string): number | null {
  const WINDOW = 60_000;
  const MAX = 120;
  const now = Date.now();
  const record = readRateStore.get(ip);
  if (record && now < record.resetAt) {
    if (record.count >= MAX) {
      return Math.ceil((record.resetAt - now) / 1000);
    }
    record.count++;
    return null;
  }
  readRateStore.set(ip, { count: 1, resetAt: now + WINDOW });
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
      Array.from(readRateStore.entries()).forEach(([k, r]) => {
        if (now >= r.resetAt) readRateStore.delete(k);
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

/** 判断是否属于社区管理后台区域（页面 + API） */
function isAdminAreaPath(pathname: string): boolean {
  return pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname.startsWith('/api/admin/');
}

/** 判断是否属于 TCG 运营后台区域（页面 + API） */
function isTcgAdminAreaPath(pathname: string): boolean {
  return pathname === '/tcg-admin'
    || pathname.startsWith('/tcg-admin/')
    || pathname.startsWith('/api/tcg/admin/');
}

/**
 * 从 Authorization 头解析 HTTP Basic Auth 的密码部分。
 * Edge runtime 没有 Buffer，这里用 atob 解码。
 * 解析失败返回空字符串。
 */
function parseBasicAuthPassword(authHeader: string | null): string {
  if (!authHeader || !authHeader.toLowerCase().startsWith('basic ')) return '';
  try {
    const encoded = authHeader.slice(6).trim();
    const decoded = atob(encoded); // "username:password"
    const idx = decoded.indexOf(':');
    if (idx < 0) return '';
    return decoded.slice(idx + 1);
  } catch {
    return '';
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const start = Date.now();
  const ip = getClientIp(req);

  // 请求日志（提前声明，供后续各拦截分支调用）
  const logRequest = (status: number) => {
    const duration = Date.now() - start;
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    console.log(
      `[${level}] ${req.method} ${pathname} ${status} ${duration}ms ip=${ip}`
    );
  };

  // ===================== 管理后台预授权闸门（HTTP Basic Auth） =====================
  // 即使有人知道 /admin 或 /tcg-admin/login 的 URL，先要通过这道 Basic Auth 才能看到登录表单，
  // 相当于把后台入口藏在一层共享密码后面（密码由管理员线下分发，不进数据库）。
  // 密码通过环境变量配置；未配置时跳过该闸门（兼容本地开发）。
  const requireAdminGate = isAdminAreaPath(pathname);
  const requireTcgGate = isTcgAdminAreaPath(pathname);
  if (requireAdminGate || requireTcgGate) {
    const gatePassword = requireAdminGate
      ? process.env.ADMIN_GATE_PASSWORD
      : process.env.TCG_ADMIN_GATE_PASSWORD;
    if (gatePassword) {
      const provided = parseBasicAuthPassword(req.headers.get('authorization'));
      if (provided !== gatePassword) {
        logRequest(401);
        const realm = requireAdminGate ? 'Admin Area' : 'TCG Admin Area';
        return new NextResponse('Authentication required', {
          status: 401,
          headers: {
            'WWW-Authenticate': `Basic realm="${realm}", charset="UTF-8"`,
            'Cache-Control': 'no-store',
          },
        });
      }
    }
  }

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

  // 写入请求统一限流（仅作用于 API 路径，避免扩展到页面后对 SSR 表单 POST 误限）
  if (WRITE_METHODS.has(req.method) && pathname.startsWith('/api/')) {
    const wait = checkWriteRate(getClientIp(req), pathname);
    if (wait !== null) {
      logRequest(429);
      return addNoCacheHeaders(NextResponse.json(
        { code: 429, message: `操作过于频繁，请 ${wait} 秒后再试`, data: null },
        { status: 429 }
      ));
    }
  }

  // 公共读接口限流（防爬虫批量抓取公开数据）：
  // 仅对 /api/public/* 的 GET 请求生效，正常浏览远低于 120/min 阈值，不影响普通用户。
  if (req.method === 'GET' && pathname.startsWith('/api/public/')) {
    const wait = checkPublicReadRate(ip);
    if (wait !== null) {
      logRequest(429);
      return addNoCacheHeaders(NextResponse.json(
        { code: 429, message: `请求过于频繁，请 ${wait} 秒后再试`, data: null },
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
  // 同时覆盖 API 路径和后台页面路径：
  // - /api/:path*           —— 原有 API 鉴权 / 限流 / 防缓存
  // - /admin/:path*         —— 社区管理后台 Basic Auth 闸门（/admin 自身也覆盖）
  // - /tcg-admin/:path*     —— TCG 运营后台 Basic Auth 闸门
  matcher: ['/api/:path*', '/admin', '/admin/:path*', '/tcg-admin', '/tcg-admin/:path*'],
};
