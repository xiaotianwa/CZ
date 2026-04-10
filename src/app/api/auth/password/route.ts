import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifyPassword, hashPassword, signUserToken, setTokenCookie, USER_COOKIE_NAME } from '@/lib/auth';
import { revokeUserTokens } from '@/lib/token-blacklist';
import { ok, fail, handleError } from '@/lib/api';

const changePasswordSchema = z.object({
  oldPassword: z.string().min(6, '旧密码至少6位'),
  newPassword: z.string().min(6, '新密码至少6位').max(50, '密码最多50个字符'),
});

export async function PUT(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { oldPassword, newPassword } = parsed.data;

    if (oldPassword === newPassword) {
      return fail('新密码不能与旧密码相同');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { password: true },
    });

    if (!user) {
      return fail('用户不存在', 404);
    }

    const valid = await verifyPassword(oldPassword, user.password);
    if (!valid) {
      return fail('旧密码不正确');
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: payload.id },
      data: { password: hashed },
    });

    await revokeUserTokens(payload.id);

    const newToken = signUserToken({ id: payload.id, email: payload.email, role: payload.role });
    const response = ok(null, '密码修改成功');
    setTokenCookie(response, newToken, USER_COOKIE_NAME);
    return response;
  } catch (err) {
    return handleError(err);
  }
}
