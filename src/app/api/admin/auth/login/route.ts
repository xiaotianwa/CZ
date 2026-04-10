import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword, signAdminToken, setTokenCookie, ADMIN_COOKIE_NAME } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
});

export async function POST(req: NextRequest) {
  try {
    const wait = checkRateLimit(getClientIp(req), { namespace: 'admin-login', windowMs: 60_000, max: 5 });
    if (wait !== null) {
      return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);
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
    setTokenCookie(response, token, ADMIN_COOKIE_NAME);
    return response;
  } catch (err) {
    return handleError(err);
  }
}
