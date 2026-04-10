import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { revokeUserTokens } from '@/lib/token-blacklist';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, avatar: true,
        role: true, level: true, badge: true, points: true,
        bio: true, isActive: true, createdAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });
    if (!user) return fail('用户不存在', 404);
    return ok(user);
  } catch (err) {
    return handleError(err);
  }
}

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['fan', 'star', 'assistant']).optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return fail('用户不存在', 404);

    // 不允许禁用 star(董事长) 角色
    if (parsed.data.isActive === false && existing.role === 'star') {
      return fail('无法禁用董事长账号');
    }

    const user = await prisma.user.update({ where: { id }, data: parsed.data });

    if (parsed.data.isActive === false) {
      await revokeUserTokens(id);
    }

    return ok({ id: user.id, isActive: user.isActive, role: user.role }, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}
