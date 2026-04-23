import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword, signAdminToken, setTokenCookie, ADMIN_COOKIE_NAME } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit, rollbackRateLimit, getClientIp } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
});

// 管理员登录失败次数的 24 小时累计限制，防慢速爆破：
// 分钟级限流之上再叠加一层，单 IP 每 24 小时最多 50 次登录请求
// （认证成功会 rollback 归还配额，所以实际上只数失败次数）
const ADMIN_LOGIN_DAILY_NS = 'admin-login-24h';
const ADMIN_LOGIN_DAILY_WINDOW = 24 * 60 * 60 * 1000;
const ADMIN_LOGIN_DAILY_MAX = 50;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    // 第一层：分钟级（5 次/min）
    const wait = await checkRateLimit(ip, { namespace: 'admin-login', windowMs: 60_000, max: 5 });
    if (wait !== null) {
      return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);
    }

    // 第二层：24 小时失败累计（50 次/day），防慢速爆破
    const dailyWait = await checkRateLimit(ip, {
      namespace: ADMIN_LOGIN_DAILY_NS,
      windowMs: ADMIN_LOGIN_DAILY_WINDOW,
      max: ADMIN_LOGIN_DAILY_MAX,
    });
    if (dailyWait !== null) {
      return fail(`登录失败次数过多，请 ${Math.ceil(dailyWait / 3600)} 小时后再试`, 429);
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { email, password } = parsed.data;

    const admin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, avatar: true, role: true, password: true, isActive: true },
    });

    if (!admin) {
      return fail('账号或密码错误', 401);
    }

    if (!admin.isActive) {
      return fail('账号已被禁用', 403);
    }

    const valid = await verifyPassword(password, admin.password);
    if (!valid) {
      return fail('账号或密码错误', 401);
    }

    // 登录成功 —— 归还 24 小时累计配额，避免正常使用被锁定
    await rollbackRateLimit(ip, ADMIN_LOGIN_DAILY_NS);

    // 更新最后登录时间
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    const token = signAdminToken({ id: admin.id, email: admin.email, role: admin.role });

    const response = ok({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        avatar: admin.avatar,
        role: admin.role,
      },
    });
    // 管理员 cookie 使用 session-only：关闭浏览器即失效，强制每次打开重新登录
    setTokenCookie(response, token, ADMIN_COOKIE_NAME, { sessionOnly: true });
    return response;
  } catch (err) {
    return handleError(err);
  }
}
