import { prisma } from '@/lib/db';

// ===== 积分规则配置 =====

export const POINT_RULES = {
  daily_login: { points: 5, label: '每日登录' },
  post: { points: 10, label: '发布帖子' },
  comment: { points: 3, label: '发表评论' },
  be_liked: { points: 2, label: '被点赞' },
  event: { points: 20, label: '参与活动' },
} as const;

export type PointAction = keyof typeof POINT_RULES;

// ===== 等级阈值 =====

const LEVEL_THRESHOLDS = [
  { level: 1, minPoints: 0 },    // 新粉
  { level: 2, minPoints: 100 },  // 铁粉
  { level: 3, minPoints: 300 },  // 金粉
  { level: 4, minPoints: 1000 }, // 传奇粉丝
];

function calcLevel(points: number): number {
  let level = 1;
  for (const t of LEVEL_THRESHOLDS) {
    if (points >= t.minPoints) level = t.level;
  }
  return level;
}

// ===== 核心：发放积分 =====

export async function grantPoints(
  userId: string,
  action: PointAction,
  detail?: string,
): Promise<{ points: number; totalPoints: number; level: number; levelUp: boolean }> {
  const rule = POINT_RULES[action];

  const [, updatedUser] = await prisma.$transaction([
    // 1. 写入积分记录
    prisma.pointLog.create({
      data: {
        userId,
        action,
        points: rule.points,
        detail: detail || rule.label,
      },
    }),
    // 2. 更新用户积分
    prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: rule.points },
      },
      select: { points: true, level: true },
    }),
  ]);

  // 3. 检查是否升级
  const newLevel = calcLevel(updatedUser.points);
  const levelUp = newLevel > updatedUser.level;

  if (levelUp) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    });
  }

  return {
    points: rule.points,
    totalPoints: updatedUser.points,
    level: levelUp ? newLevel : updatedUser.level,
    levelUp,
  };
}

// ===== 每日登录去重 =====

export async function grantDailyLogin(userId: string): Promise<ReturnType<typeof grantPoints> | null> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existing = await prisma.pointLog.findFirst({
    where: {
      userId,
      action: 'daily_login',
      createdAt: { gte: todayStart },
    },
  });

  if (existing) return null; // 今天已签到

  return grantPoints(userId, 'daily_login', '每日登录奖励');
}
