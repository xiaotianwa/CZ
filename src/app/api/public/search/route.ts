import { prisma } from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const type = searchParams.get('type') || 'all'; // all | posts | users
    const tagId = searchParams.get('tagId') || '';
    const authorId = searchParams.get('authorId') || '';
    const sort = searchParams.get('sort') || 'relevant'; // relevant | new | hot
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 20));

    // 无关键词时返回热门标签和热门帖子
    if (!q) {
      const [hotTags, hotPosts] = await Promise.all([
        prisma.tag.findMany({
          select: { id: true, name: true, color: true, _count: { select: { postTags: true } } },
          orderBy: { postTags: { _count: 'desc' } },
          take: 12,
        }),
        prisma.post.findMany({
          where: { status: 'published' },
          select: {
            id: true,
            content: true,
            images: true,
            likes: true,
            createdAt: true,
            author: { select: { id: true, name: true, avatar: true, role: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { likes: 'desc' },
          take: 5,
        }),
      ]);
      return ok({ hotTags, hotPosts });
    }

    const skip = (page - 1) * pageSize;

    const results: { posts?: unknown; users?: unknown; postTotal?: number; userTotal?: number } = {};

    // 搜索帖子（内容 + 标签名 + 标签/作者筛选）
    if (type === 'all' || type === 'posts') {
      const postWhere: Record<string, unknown> = {
        status: 'published',
      };
      if (q) {
        postWhere.OR = [
          { content: { contains: q } },
          { postTags: { some: { tag: { name: { contains: q } } } } },
          { author: { name: { contains: q } } },
        ];
      }
      if (tagId) {
        postWhere.postTags = { some: { tagId } };
      }
      if (authorId) {
        postWhere.authorId = authorId;
      }

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
          orderBy: sort === 'hot' ? { hotScore: 'desc' as const }
                 : sort === 'new' ? { createdAt: 'desc' as const }
                 : { createdAt: 'desc' as const },
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
