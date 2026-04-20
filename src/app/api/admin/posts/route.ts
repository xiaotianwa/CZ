import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize, keyword, status } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (keyword) where.content = { contains: keyword };

    const [list, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true } },
          postTags: { include: { tag: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const createPostSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
  images: z.array(z.string()).default([]),
  isPinned: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'hidden']).default('published'),
  authorId: z.string().min(1, '作者不能为空'),
  tagIds: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { tagIds, images, ...data } = parsed.data;

    // 校验 authorId 是否是真实存在的用户
    const userExists = await prisma.user.findUnique({ where: { id: data.authorId }, select: { id: true } });
    if (!userExists) {
      return fail('指定的作者用户不存在');
    }

    const post = await prisma.post.create({
      data: {
        ...data,
        images: JSON.stringify(images),
        postTags: tagIds.length > 0
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
        postTags: { include: { tag: true } },
      },
    });

    invalidateCache('public:home');
    return ok(post, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}
