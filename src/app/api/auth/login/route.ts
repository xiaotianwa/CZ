import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword, signUserToken, setTokenCookie, USER_COOKIE_NAME } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { grantDailyLogin } from '@/lib/points';
import { recordSecurityEvent, getRequestMeta } from '@/lib/registration-security';

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
});

export async function POST(req: NextRequest) {
  const { ip, uaHash } = getRequestMeta(req);
  try {
    const wait = await checkRateLimit(ip, { namespace: 'user-login', windowMs: 60_000, max: 10 });
    if (wait !== null) {
      return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, avatar: true, role: true, password: true, isActive: true },
    });

    if (!user) {
      await recordSecurityEvent(prisma as any, {
        eventType: 'login_attempt',
        result: 'reject',
        reason: 'user_not_found',
        email,
        ip,
        uaHash,
      }).catch(() => {});
      return fail('邮箱或密码错误', 401);
    }

    if (!user.isActive) {
      await recordSecurityEvent(prisma as any, {
        eventType: 'login_attempt',
        result: 'reject',
        reason: 'account_disabled',
        email,
        userId: user.id,
        ip,
        uaHash,
      }).catch(() => {});
      return fail('账号已被禁用', 403);
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      await recordSecurityEvent(prisma as any, {
        eventType: 'login_attempt',
        result: 'reject',
        reason: 'wrong_password',
        email,
        userId: user.id,
        ip,
        uaHash,
      }).catch(() => {});
      return fail('邮箱或密码错误', 401);
    }

    const token = signUserToken({ id: user.id, email: user.email, role: user.role });

    // 每日登录积分（异步，不阻塞登录）
    const dailyResult = await grantDailyLogin(user.id).catch(() => null);

    const response = ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      pointsEarned: dailyResult ? dailyResult.points : 0,
      levelUp: dailyResult?.levelUp || false,
    });
    setTokenCookie(response, token, USER_COOKIE_NAME);

    await recordSecurityEvent(prisma as any, {
      eventType: 'login_success',
      result: 'success',
      email: user.email,
      userId: user.id,
      ip,
      uaHash,
    }).catch(() => {});

    return response;
  } catch (err) {
    return handleError(err);
  }
}
