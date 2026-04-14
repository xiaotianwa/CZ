import { NextRequest } from 'next/server';
import { z } from 'zod';
import { randomInt } from 'crypto';
import { ok, fail, handleError } from '@/lib/api';
import { sendVerifyCode } from '@/lib/mail';
import { checkRateLimit, rollbackRateLimit, getClientIp } from '@/lib/rate-limit';
import { setCache } from '@/lib/cache';

const schema = z.object({
  email: z.string().email('邮箱格式不正确'),
  type: z.enum(['register', 'reset']).optional().default('register'),
});

function generateCode(): string {
  return randomInt(100000, 999999).toString();
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // IP 级限流：每分钟最多 3 次
    const wait = checkRateLimit(ip, { namespace: 'send-code-ip', windowMs: 60_000, max: 3 });
    if (wait !== null) {
      return fail(`发送过于频繁，请 ${wait} 秒后再试`, 429);
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { email, type } = parsed.data;

    // 邮箱级限流：每分钟最多 1 次
    const emailWait = checkRateLimit(`code:${email}`, { namespace: 'send-code-email', windowMs: 60_000, max: 1 });
    if (emailWait !== null) {
      return fail(`该邮箱已发送验证码，请 ${emailWait} 秒后再试`, 429);
    }

    const code = generateCode();

    // 存入缓存，5 分钟过期（按类型隔离 key，防止注册码和重置码混用）
    setCache(`verify-code:${type}:${email}`, code, 5 * 60 * 1000);

    try {
      await sendVerifyCode(email, code, type);
    } catch (mailErr) {
      // 邮件发送失败，回退限流计数（不消耗用户配额）
      rollbackRateLimit(ip, 'send-code-ip');
      rollbackRateLimit(`code:${email}`, 'send-code-email');
      const msg = mailErr instanceof Error ? mailErr.message : '邮件发送失败';
      return fail(msg, 500);
    }

    return ok(null, '验证码已发送');
  } catch (err) {
    return handleError(err);
  }
}
