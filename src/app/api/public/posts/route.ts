import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { paginated, handleError, getSearchParams } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize } = getSearchParams(req.url);
    const tagId = new URL(req.url).searchParams.get('tagId') || '';

    const where: Record<string, unknown> = { status: 'published' };
    if (tagId) {
      where.postTags = { some: { tagId } };
    }

    const [list, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true, level: true, badge: true } },
          postTags: { include: { tag: { select: { id: true, name: true } } } },
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
