import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

type RouteParams = { params: Promise<{ id: string }> };

const photoSchema = z.object({
  url: z.string().min(1),
  thumbnail: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = photoSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const photo = await prisma.photo.create({
      data: { ...parsed.data, albumId: id },
    });
    return ok(photo, '添加成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get('photoId');
    if (!photoId) return fail('缺少 photoId');

    await prisma.photo.delete({ where: { id: photoId } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
