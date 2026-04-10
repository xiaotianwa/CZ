import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const schema = z.object({
      image: z.string().optional(),
      alt: z.string().optional(),
      link: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const slide = await prisma.heroSlide.update({ where: { id }, data: parsed.data });
    invalidateCache('public:home');
    return ok(slide, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await prisma.heroSlide.delete({ where: { id } });
    invalidateCache('public:home');
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
