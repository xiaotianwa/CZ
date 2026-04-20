import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit } from '@/lib/rate-limit';
import { consumeVerificationCode, getRequestMeta, recordSecurityEvent } from '@/lib/registration-security';

const schema = z.object({
  email: z.string().email('邮箱格式不正确'),
  code: z.string().length(6, '验证码为6位数字'),
  password: z.string().min(6, '密码至少6位'),
});

export async function POST(req: NextRequest) {
  try {
    const { ip, uaHash } = getRequestMeta(req);
    const wait = await checkRateLimit(ip, { namespace: 'reset-pwd', windowMs: 60_000, max: 5 });
    if (wait !== null) {
      return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { email, code, password } = parsed.data;
    const codeResult = await consumeVerificationCode(prisma as any, {
      email,
      scene: 'reset',
      code,
    });
    if (!codeResult.ok) {
      await recordSecurityEvent(prisma as any, {
        eventType: 'reset_password',
        result: 'reject',
        reason: 'invalid_code',
        email,
        ip,
        uaHash,
      }).catch(() => {});
      return fail(codeResult.reason);
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return fail('该邮箱未注册');
    }

    // 更新密码
    const hashed = await hashPassword(password);
    await prisma.user.update({
      where: { email },
      data: { password: hashed },
    });

    await recordSecurityEvent(prisma as any, {
      eventType: 'reset_password',
      result: 'success',
      email,
      userId: user.id,
      ip,
      uaHash,
    }).catch(() => {});

    return ok(null, '密码重置成功，请重新登录');
  } catch (err) {
    return handleError(err);
  }
}
