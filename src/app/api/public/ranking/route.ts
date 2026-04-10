import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        avatar: true,
        level: true,
        badge: true,
        points: true,
        _count: { select: { posts: true, comments: true } },
      },
      orderBy: { points: 'desc' },
      take: 50,
    });

    const rankings = users.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      avatar: u.avatar || '',
      level: u.level,
      badge: u.badge || '',
      points: u.points,
      postCount: u._count.posts,
      commentCount: u._count.comments,
    }));

    return ok(rankings);
  } catch (err) {
    return handleError(err);
  }
}
