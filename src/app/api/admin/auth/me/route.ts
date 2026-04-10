import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAdmin(req);
    if (!payload) {
      return fail('管理员未登录', 401);
    }

    const admin = await prisma.admin.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return fail('管理员不存在', 404);
    }

    return ok(admin);
  } catch (err) {
    return handleError(err);
  }
}
