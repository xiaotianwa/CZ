import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const schema = z.object({
      date: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      type: z.enum(['debut', 'award', 'release', 'milestone', 'event']).optional(),
      sortOrder: z.number().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const item = await prisma.timelineEvent.update({ where: { id }, data: parsed.data });
    return ok(item, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await prisma.timelineEvent.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
