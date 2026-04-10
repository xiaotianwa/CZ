import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { postTags: true } },
      },
    });

    const list = tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      postCount: t._count.postTags,
    }));

    // 热门话题：按帖子数量降序，取前 10
    const hot = [...list].sort((a, b) => b.postCount - a.postCount).slice(0, 10);

    return ok({ list, hot });
  } catch (err) {
    return handleError(err);
  }
}
