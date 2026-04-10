import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize, category } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (category) where.category = category;

    const [list, total] = await Promise.all([
      prisma.album.findMany({
        where,
        include: { _count: { select: { photos: true } } },
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.album.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const albumSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  category: z.string().min(1, '分类不能为空'),
  cover: z.string().min(1, '封面不能为空'),
  sortOrder: z.number().default(0),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = albumSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const album = await prisma.album.create({ data: parsed.data });
    return ok(album, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}
