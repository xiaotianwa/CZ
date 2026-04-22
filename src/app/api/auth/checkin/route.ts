import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { grantDailyLogin } from '@/lib/points';
import { calcLevelFromPoints } from '@/lib/level';

export const dynamic = 'force-dynamic';

// GET — 查询今日签到状态 + 连续签到天数
export async function GET(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) return fail('未登录', 401);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayLog, user] = await Promise.all([
      prisma.pointLog.findFirst({
        where: {
          userId: payload.id,
          action: 'daily_login',
          createdAt: { gte: todayStart },
        },
      }),
      prisma.user.findUnique({
        where: { id: payload.id },
        select: { points: true, level: true, isActive: true },
      }),
    ]);

    if (!user || !user.isActive) return fail('用户不存在或已被禁用，请重新登录', 401);

    // 查询当月签到记录（用于日历可视化）
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const logs = await prisma.pointLog.findMany({
      where: {
        userId: payload.id,
        action: 'daily_login',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // 当月签到日期列表 (day numbers)
    const checkedDays = Array.from(new Set(logs.map((l) => new Date(l.createdAt).getDate())));

    // 计算连续天数
    let streak = 0;
    const checkedInToday = !!todayLog;
    const startDay = checkedInToday ? 0 : 1;

    for (let i = startDay; i <= 30; i++) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStr = day.toDateString();
      const hasLog = logs.some((l) => new Date(l.createdAt).toDateString() === dayStr);
      if (hasLog) {
        streak++;
      } else {
        break;
      }
    }

    return ok({
      checkedIn: checkedInToday,
      streak,
      points: user.points,
      level: calcLevelFromPoints(user.points),
      checkedDays,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      monthTotal: checkedDays.length,
    });
  } catch (err) {
    return handleError(err);
  }
}

// POST — 执行签到
export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) return fail('未登录', 401);

    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, isActive: true },
    });
    if (!dbUser || !dbUser.isActive) return fail('用户不存在或已被禁用，请重新登录', 401);

    const result = await grantDailyLogin(payload.id);

    if (!result) {
      return fail('今天已经签到过了', 400);
    }

    return ok({
      points: result.points,
      totalPoints: result.totalPoints,
      level: result.level,
      levelUp: result.levelUp,
    }, '签到成功！获得 50 积分');
  } catch (err) {
    return handleError(err);
  }
}
