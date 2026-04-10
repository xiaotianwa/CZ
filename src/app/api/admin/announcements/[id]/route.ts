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
      title: z.string().min(1).optional(),
      content: z.string().min(1).optional(),
      type: z.enum(['info', 'warning', 'event', 'update']).optional(),
      image: z.string().nullable().optional(),
      link: z.string().nullable().optional(),
      linkText: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
      startAt: z.string().nullable().optional(),
      endAt: z.string().nullable().optional(),
      sortOrder: z.number().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { startAt, endAt, image, link, linkText, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (image !== undefined) updateData.image = image || null;
    if (link !== undefined) updateData.link = link || null;
    if (linkText !== undefined) updateData.linkText = linkText || null;
    if (startAt !== undefined) updateData.startAt = startAt ? new Date(startAt) : null;
    if (endAt !== undefined) updateData.endAt = endAt ? new Date(endAt) : null;

    const item = await prisma.announcement.update({ where: { id }, data: updateData as any });
    invalidateCache('public:announcements');
    return ok(item, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await prisma.announcement.delete({ where: { id } });
    invalidateCache('public:announcements');
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
