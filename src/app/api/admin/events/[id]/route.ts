import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return fail('活动不存在', 404);
    return ok(event);
  } catch (err) {
    return handleError(err);
  }
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  cover: z.string().optional(),
  startTime: z.string().transform((s) => new Date(s)).optional(),
  endTime: z.string().transform((s) => new Date(s)).optional(),
  location: z.string().optional(),
  status: z.enum(['upcoming', 'ongoing', 'ended']).optional(),
  participants: z.number().optional(),
});

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const event = await prisma.event.update({ where: { id }, data: parsed.data });
    return ok(event, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await prisma.event.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
