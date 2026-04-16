import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { paginated, handleError, getSearchParams } from '@/lib/api';

// 热门排序：综合点赞数、评论数、发帖时间加权
// score = (likes * 3 + comments * 5) / (hoursSincePost + 2) ^ 1.2
// 置顶帖始终优先
function calcHotScore(likes: number, comments: number, createdAt: Date): number {
  const hoursSincePost = (Date.now() - createdAt.getTime()) / 3600000;
  const engagement = likes * 3 + comments * 5;
  return engagement / Math.pow(hoursSincePost + 2, 1.2);
}

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

    if (sort === 'hot') {
      // 热门排序：拉取所有帖子的关键字段计算热度分，再取当前页
      const allPosts = await prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true, level: true, badge: true } },
          postTags: { include: { tag: { select: { id: true, name: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 按热度分排序（置顶帖优先）
      const scored = allPosts.map((p) => ({
        ...p,
        _hotScore: p.isPinned ? Infinity : calcHotScore(p.likes, p._count.comments, p.createdAt),
      }));
      scored.sort((a, b) => b._hotScore - a._hotScore);

      const list = scored.slice((page - 1) * pageSize, page * pageSize).map(({ _hotScore, ...rest }) => rest);
      const res = paginated(list, total, page, pageSize);
      res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
      return res;
    }

    // new: 按时间降序（置顶优先）
    const list = await prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true, level: true, badge: true } },
        postTags: { include: { tag: { select: { id: true, name: true } } } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
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
