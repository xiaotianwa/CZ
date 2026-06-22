import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, handleError } from '@/lib/api';

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

async function countByDay(
  model: { count: (args: { where: { createdAt: { gte: Date; lt: Date } } }) => Promise<number> },
  days: string[],
) {
  return Promise.all(
    days.map((dateStr) => {
      const gte = new Date(`${dateStr}T00:00:00`);
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
      userCount,
      gameCount,
      mediaCount,
      feedbackCount,
      pendingFeedbacks,
      todayUsers,
      userTrend,
      todayViews,
      totalViews30d,
      recentFeedbacks,
      activeUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.media.count(),
      prisma.feedback.count(),
      prisma.feedback.count({ where: { status: 'pending' } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      countByDay(prisma.user as never, days7),
      prisma.pageView.count({ where: { date: days7[days7.length - 1] } }),
      prisma.pageView.count({ where: { createdAt: { gte: days30Start } } }),
      prisma.feedback.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, content: true, status: true, createdAt: true, user: { select: { name: true } } },
      }),
      prisma.pointLog.groupBy({ by: ['userId'], where: { createdAt: { gte: days30Start } } }).then((r) => r.length),
    ]);

    const viewTrend = await Promise.all(
      days7.map((dateStr) => prisma.pageView.count({ where: { date: dateStr } })),
    );

    return ok({
      users: userCount,
      games: gameCount,
      media: mediaCount,
      feedbacks: feedbackCount,
      pendingFeedbacks,
      todayUsers,
      todayViews,
      totalViews30d,
      activeUsers,
      trend: {
        dates: days7,
        users: userTrend,
        views: viewTrend,
      },
      recentFeedbacks,
    });
  } catch (err) {
    return handleError(err);
  }
}
