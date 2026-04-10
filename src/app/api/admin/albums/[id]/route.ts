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

    const album = await prisma.album.findUnique({
      where: { id },
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!album) return fail('相册不存在', 404);
    return ok(album);
  } catch (err) {
    return handleError(err);
  }
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.string().optional(),
  cover: z.string().optional(),
  sortOrder: z.number().optional(),
});

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const album = await prisma.album.update({ where: { id }, data: parsed.data });
    return ok(album, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await prisma.album.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
