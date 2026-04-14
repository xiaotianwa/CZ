import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, signUserToken, setTokenCookie, USER_COOKIE_NAME } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getCache, invalidateCache } from '@/lib/cache';

const registerSchema = z.object({
  name: z.string().min(1, '昵称不能为空').max(20, '昵称最多20个字符'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  code: z.string().length(6, '验证码为6位数字'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const wait = checkRateLimit(ip, { namespace: 'register', windowMs: 60_000, max: 5 });
    if (wait !== null) {
      return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { name, email, password, code } = parsed.data;

    // 验证验证码（使用类型隔离的 key）
    const cacheKey = `verify-code:register:${email}`;
    const savedCode = getCache<string>(cacheKey);
    if (!savedCode || savedCode !== code) {
      return fail('验证码错误或已过期');
    }
    invalidateCache(cacheKey);

    // 检查邮箱是否已注册
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return fail('该邮箱已被注册');
    }

    // 检查昵称是否重复
    const nameExists = await prisma.user.findFirst({ where: { name } });
    if (nameExists) {
      return fail('该昵称已被使用');
    }

    // 创建用户
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role: 'fan',
      },
    });

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
    return handleError(err);
  }
}
