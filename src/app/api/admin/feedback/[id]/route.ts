import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  status: z.enum(['pending', 'read', 'resolved']).optional(),
  reply: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const feedback = await prisma.feedback.update({
      where: { id },
      data: parsed.data,
    });

    return ok(feedback);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await prisma.feedback.delete({ where: { id } });
    return ok(null, '已删除');
  } catch (err) {
    return handleError(err);
  }
}
