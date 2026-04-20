import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTcgAdmin } from '@/lib/tcg/auth';
import { ok, fail, handleError } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const payload = await requireTcgAdmin(req);
    const op = await prisma.tcgOperator.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        isActive: true,
      },
    });
    if (!op) return fail('账号不存在', 404);
    if (!op.isActive) return fail('账号已被禁用', 403);
    return ok(op);
  } catch (err) {
    return handleError(err);
  }
}
