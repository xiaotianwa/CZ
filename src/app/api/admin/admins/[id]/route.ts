import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin, hashPassword } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['super_admin', 'admin', 'editor']).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const me = await requireAdmin(req);
    if (me.role !== 'super_admin') {
      return fail('仅超级管理员可修改管理员', 403);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.password) {
      data.password = await hashPassword(parsed.data.password);
    }

    const admin = await prisma.admin.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    return ok(admin, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const me = await requireAdmin(req);
    if (me.role !== 'super_admin') {
      return fail('仅超级管理员可删除管理员', 403);
    }

    const { id } = await params;

    if (me.id === id) {
      return fail('不能删除自己的账号');
    }

    await prisma.admin.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
