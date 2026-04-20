import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';

const memeSelect = {
  id: true,
  title: true,
  origin: true,
  description: true,
  example: true,
  image: true,
  tags: true,
  popularity: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  video: true,
  updatedAt: true,
} as const;

function toMemeResponse<T extends Record<string, unknown>>(meme: T) {
  return meme;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize, keyword } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { origin: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.meme.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { popularity: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: memeSelect,
      }),
      prisma.meme.count({ where }),
    ]);

    return paginated(list.map(toMemeResponse), total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const memeSchema = z.object({
  title: z.string().min(1, '梗名不能为空'),
  origin: z.string().min(1, '出处不能为空'),
  description: z.string().min(1, '释义不能为空'),
  example: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  video: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  popularity: z.number().default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = memeSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { tags, ...data } = parsed.data;
    const meme = await prisma.meme.create({
      data: { ...data, tags: JSON.stringify(tags) },
      select: memeSelect,
    });
    return ok(toMemeResponse(meme), '创建成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return fail('缺少ID');

    const parsed = memeSchema.partial().safeParse(rest);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.tags) {
      updateData.tags = JSON.stringify(parsed.data.tags);
    }

    const meme = await prisma.meme.update({ where: { id }, data: updateData, select: memeSelect });
    return ok(toMemeResponse(meme), '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return fail('缺少ID');

    await prisma.meme.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
