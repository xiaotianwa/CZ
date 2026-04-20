import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, handleError } from '@/lib/api';

/** 生成最近 N 天的日期字符串数组 (YYYY-MM-DD)，从旧到新 */
function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/** 根据 createdAt 统计最近 N 天每天的数量 */
async function countByDay(
  model: { count: (args: { where: { createdAt: { gte: Date; lt: Date } } }) => Promise<number> },
  days: string[],
) {
  return Promise.all(
    days.map((dateStr) => {
      const gte = new Date(dateStr + 'T00:00:00');
      const lt = new Date(gte);
      lt.setDate(lt.getDate() + 1);
      return model.count({ where: { createdAt: { gte, lt } } });
    }),
  );
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days7 = lastNDays(7);
    const days30Start = new Date(today);
    days30Start.setDate(days30Start.getDate() - 30);

    const [
      userCount, postCount, commentCount, eventCount,
      albumCount, gameCount, mediaCount, photoCount,
      feedbackCount, pendingFeedbacks,
      todayPosts, todayUsers, todayComments,
      // 7 天趋势
      userTrend, postTrend, commentTrend,
      // 访问量
      todayViews, totalViews30d,
      // 最近反馈
      recentFeedbacks,
      // 活跃用户（30天内发过帖或评论）
      activePosters, activeCommenters,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.event.count(),
      prisma.album.count(),
      prisma.game.count(),
      prisma.media.count(),
      prisma.photo.count(),
      prisma.feedback.count(),
      prisma.feedback.count({ where: { status: 'pending' } }),
      prisma.post.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.comment.count({ where: { createdAt: { gte: today } } }),
      // 7 天趋势
      countByDay(prisma.user as never, days7),
      countByDay(prisma.post as never, days7),
      countByDay(prisma.comment as never, days7),
      // 今日 PV
      prisma.pageView.count({ where: { date: days7[days7.length - 1] } }),
      // 30 天 PV
      prisma.pageView.count({ where: { createdAt: { gte: days30Start } } }),
      // 反馈
      prisma.feedback.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, content: true, status: true, createdAt: true, user: { select: { name: true } } },
      }),
      // 30天活跃用户
      prisma.post.groupBy({ by: ['authorId'], where: { createdAt: { gte: days30Start } } }).then((r) => r.length),
      prisma.comment.groupBy({ by: ['authorId'], where: { createdAt: { gte: days30Start } } }).then((r) => r.length),
    ]);

    // 7 天访问量趋势
    const viewTrend = await Promise.all(
      days7.map((dateStr) => prisma.pageView.count({ where: { date: dateStr } })),
    );

    return ok({
      users: userCount,
      posts: postCount,
      comments: commentCount,
      events: eventCount,
      albums: albumCount,
      games: gameCount,
      media: mediaCount,
      photos: photoCount,
      feedbacks: feedbackCount,
      pendingFeedbacks,
      todayPosts,
      todayUsers,
      todayComments,
      todayViews,
      totalViews30d,
      activeUsers: Math.max(activePosters, activeCommenters),
      // 7 天趋势（日期 + 数值数组）
      trend: {
        dates: days7,
        users: userTrend,
        posts: postTrend,
        comments: commentTrend,
        views: viewTrend,
      },
      recentFeedbacks,
    });
  } catch (err) {
    return handleError(err);
  }
}
