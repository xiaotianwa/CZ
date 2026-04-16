import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { paginated, handleError, getSearchParams } from '@/lib/api';

const postInclude = {
  author: { select: { id: true, name: true, avatar: true, role: true, level: true, badge: true } },
  postTags: { include: { tag: { select: { id: true, name: true } } } },
  _count: { select: { comments: true } },
};

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

    const total = await prisma.post.count({ where });

    // 热门：按 isPinned desc + hotScore desc 排序（利用数据库索引）
    // 最新：按 isPinned desc + createdAt desc 排序
    const orderBy = sort === 'hot'
      ? [{ isPinned: 'desc' as const }, { hotScore: 'desc' as const }]
      : [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }];

    const list = await prisma.post.findMany({
      where,
      include: postInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const res = paginated(list, total, page, pageSize);
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    return res;
  } catch (err) {
    return handleError(err);
  }
}
