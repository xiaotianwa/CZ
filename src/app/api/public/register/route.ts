import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, signUserToken, setTokenCookie, USER_COOKIE_NAME } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit } from '@/lib/rate-limit';
import { consumeQuizPassToken, consumeVerificationCode, getRequestMeta, recordSecurityEvent } from '@/lib/registration-security';

const registerSchema = z.object({
  name: z.string().min(1, '昵称不能为空').max(20, '昵称最多20个字符'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  code: z.string().length(6, '验证码为6位数字'),
  quizToken: z.string().min(1, '请先完成答题验证'),
});

export async function POST(req: NextRequest) {
  let requestEmail = '';
  const requestMeta = getRequestMeta(req);
  try {
    const { ip, uaHash } = requestMeta;
    const wait = await checkRateLimit(ip, { namespace: 'register', windowMs: 60_000, max: 5 });
    if (wait !== null) {
      return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { name, email, password, code, quizToken } = parsed.data;
    requestEmail = email;

    // 检查邮箱是否已注册
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await recordSecurityEvent(prisma as any, {
        eventType: 'register_attempt',
        result: 'reject',
        reason: 'email_exists',
        email,
        ip,
        uaHash,
      }).catch(() => {});
      return fail('该邮箱已被注册');
    }

    // 检查昵称是否重复
    const nameExists = await prisma.user.findFirst({ where: { name } });
    if (nameExists) {
      await recordSecurityEvent(prisma as any, {
        eventType: 'register_attempt',
        result: 'reject',
        reason: 'name_exists',
        email,
        ip,
        uaHash,
      }).catch(() => {});
      return fail('该昵称已被使用');
    }

    // 创建用户
    const hashed = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const codeResult = await consumeVerificationCode(tx as any, {
        email,
        scene: 'register',
        code,
      });
      if (!codeResult.ok) {
        throw new Error(codeResult.reason);
      }

      const quizResult = await consumeQuizPassToken(tx as any, {
        token: quizToken,
        email,
        ip,
        uaHash,
      });
      if (!quizResult.ok) {
        throw new Error(quizResult.reason);
      }

      return (tx as any).user.create({
        data: {
          email,
          password: hashed,
          name,
          role: 'fan',
        },
      });
    });

    await recordSecurityEvent(prisma as any, {
      eventType: 'register_success',
      result: 'success',
      email,
      userId: user.id,
      ip,
      uaHash,
    }).catch(() => {});

    // 自动登录：签发 token
    const token = signUserToken({ id: user.id, email: user.email, role: user.role });
    const response = ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }, '注册成功');
    setTokenCookie(response, token, USER_COOKIE_NAME);
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === '验证码错误或已过期' || msg.startsWith('答题验证')) {
      await recordSecurityEvent(prisma as any, {
        eventType: 'register_attempt',
        result: 'reject',
        reason: msg === '验证码错误或已过期' ? 'invalid_code' : 'invalid_quiz_token',
        email: requestEmail || null,
        ip: requestMeta.ip,
        uaHash: requestMeta.uaHash,
      }).catch(() => {});
      return fail(msg, 400);
    }
    return handleError(err);
  }
}
