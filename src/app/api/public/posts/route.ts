import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { paginated, handleError, getSearchParams } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize } = getSearchParams(req.url);
    const url = new URL(req.url);
    const tagId = url.searchParams.get('tagId') || '';
    const sort = url.searchParams.get('sort') || 'new'; // hot | new

    const where: Record<string, unknown> = { status: 'published' };
    if (tagId) {
      where.postTags = { some: { tagId } };
    }

    // hot: 按点赞数降序（置顶优先）; new: 按时间降序（置顶优先）
    const orderBy =
      sort === 'hot'
        ? [{ isPinned: 'desc' as const }, { likes: 'desc' as const }, { createdAt: 'desc' as const }]
        : [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }];

    const [list, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true, level: true, badge: true } },
          postTags: { include: { tag: { select: { id: true, name: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy,
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
