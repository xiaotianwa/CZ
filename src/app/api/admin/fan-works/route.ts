import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize, keyword, category } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { authorName: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }
    if (category) where.type = category;

    const [list, total] = await Promise.all([
      prisma.fanWork.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.fanWork.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const fanWorkSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  description: z.string().optional().nullable(),
  type: z.enum(['image', 'video', 'audio', 'text', 'other']).default('image'),
  cover: z.string().min(1, '封面不能为空'),
  contentUrl: z.string().optional().nullable(),
  images: z.array(z.string()).default([]),
  authorName: z.string().min(1, '作者名不能为空'),
  authorAvatar: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  likes: z.number().default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = fanWorkSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { images, ...data } = parsed.data;
    const fanWork = await prisma.fanWork.create({
      data: { ...data, images: JSON.stringify(images) },
    });
    return ok(fanWork, '创建成功');
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

    const parsed = fanWorkSchema.partial().safeParse(rest);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.images) {
      updateData.images = JSON.stringify(parsed.data.images);
    }

    const fanWork = await prisma.fanWork.update({ where: { id }, data: updateData });
    return ok(fanWork, '更新成功');
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

    await prisma.fanWork.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
