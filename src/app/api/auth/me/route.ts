import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        level: true,
        badge: true,
        points: true,
        bio: true,
        city: true,
        createdAt: true,
      },
    });

    if (!user) {
      return fail('用户不存在', 404);
    }

    return ok(user);
  } catch (err) {
    return handleError(err);
  }
}
