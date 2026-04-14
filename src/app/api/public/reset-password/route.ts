import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getCache, invalidateCache } from '@/lib/cache';

const schema = z.object({
  email: z.string().email('邮箱格式不正确'),
  code: z.string().length(6, '验证码为6位数字'),
  password: z.string().min(6, '密码至少6位'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const wait = checkRateLimit(ip, { namespace: 'reset-pwd', windowMs: 60_000, max: 5 });
    if (wait !== null) {
      return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { email, code, password } = parsed.data;

    // 验证验证码（使用类型隔离的 key）
    const cacheKey = `verify-code:reset:${email}`;
    const savedCode = getCache<string>(cacheKey);
    if (!savedCode || savedCode !== code) {
      return fail('验证码错误或已过期');
    }
    invalidateCache(cacheKey);

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

    return ok(null, '密码重置成功，请重新登录');
  } catch (err) {
    return handleError(err);
  }
}
