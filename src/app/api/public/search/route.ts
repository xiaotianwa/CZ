import { prisma } from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const type = searchParams.get('type') || 'all'; // all | posts | users
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 20));

    if (!q || q.length < 1) {
      return fail('请输入搜索关键词', 400);
    }

    const skip = (page - 1) * pageSize;
    const keyword = `%${q}%`;

    const results: { posts?: unknown; users?: unknown; postTotal?: number; userTotal?: number } = {};

    // 搜索帖子
    if (type === 'all' || type === 'posts') {
      const postWhere = {
        status: 'published',
        OR: [
          { content: { contains: q } },
        ],
      };

      const [posts, postTotal] = await Promise.all([
        prisma.post.findMany({
          where: postWhere,
          select: {
            id: true,
            content: true,
            images: true,
            likes: true,
            isPinned: true,
            createdAt: true,
            author: { select: { id: true, name: true, avatar: true, role: true } },
            postTags: { select: { tag: { select: { id: true, name: true, color: true } } } },
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.post.count({ where: postWhere }),
      ]);

      results.posts = posts;
      results.postTotal = postTotal;
    }

    // 搜索用户
    if (type === 'all' || type === 'users') {
      const userWhere = {
        isActive: true,
        OR: [
          { name: { contains: q } },
          { bio: { contains: q } },
        ],
      };

      const [users, userTotal] = await Promise.all([
        prisma.user.findMany({
          where: userWhere,
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            level: true,
            badge: true,
            bio: true,
            city: true,
            _count: { select: { posts: true, comments: true } },
          },
          orderBy: { points: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.user.count({ where: userWhere }),
      ]);

      results.users = users;
      results.userTotal = userTotal;
    }

    return ok(results);
  } catch (err) {
    return handleError(err);
  }
}
