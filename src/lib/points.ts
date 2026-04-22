import { prisma } from '@/lib/db';
import { POINT_RULE_POINTS, calcLevelFromPoints, getBadgeByLevel } from '@/lib/level';

// ===== 积分规则配置 =====

export const POINT_RULES = {
  daily_login: { points: POINT_RULE_POINTS.daily_login, label: '每日登录' },
  post: { points: POINT_RULE_POINTS.post, label: '发布帖子' },
  comment: { points: POINT_RULE_POINTS.comment, label: '发表评论' },
  be_liked: { points: POINT_RULE_POINTS.be_liked, label: '被点赞' },
  event: { points: POINT_RULE_POINTS.event, label: '参与活动' },
} as const;

export type PointAction = keyof typeof POINT_RULES;

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
      select: { points: true, level: true, badge: true },
    }),
  ]);

  // 3. 检查是否升级
  const newLevel = calcLevelFromPoints(updatedUser.points);
  const newBadge = getBadgeByLevel(newLevel);
  const levelUp = newLevel > updatedUser.level;
  const badgeChanged = newBadge !== updatedUser.badge;

  if (levelUp || badgeChanged) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel, badge: newBadge },
    });
  }

  return {
    points: rule.points,
    totalPoints: updatedUser.points,
    level: newLevel,
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

export interface AdminPointGrantActor {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface AdminPointGrantResult {
  id: string;
  name: string;
  totalPoints: number;
  level: number;
  levelUp: boolean;
}

export async function grantAdminPointsToUsers(params: {
  userIds: string[];
  points: number;
  reason: string;
  actor: AdminPointGrantActor;
}): Promise<AdminPointGrantResult[]> {
  const uniqueUserIds = Array.from(new Set(params.userIds.filter(Boolean)));

  if (uniqueUserIds.length === 0) {
    return [];
  }

  return prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: {
        id: true,
        name: true,
      },
    });

    if (users.length !== uniqueUserIds.length) {
      throw new Error('部分用户不存在');
    }

    const userMap = new Map(users.map((user) => [user.id, user]));
    const results: AdminPointGrantResult[] = [];

    for (const userId of uniqueUserIds) {
      const user = userMap.get(userId);

      if (!user) {
        throw new Error('部分用户不存在');
      }

      await tx.pointLog.create({
        data: {
          userId,
          action: 'admin_grant',
          points: params.points,
          detail: `管理员加分：${params.reason}`,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          points: { increment: params.points },
        },
        select: {
          points: true,
          level: true,
          badge: true,
        },
      });

      const nextLevel = calcLevelFromPoints(updatedUser.points);
      const nextBadge = getBadgeByLevel(nextLevel);
      const levelUp = nextLevel > updatedUser.level;

      if (nextLevel !== updatedUser.level || nextBadge !== updatedUser.badge) {
        await tx.user.update({
          where: { id: userId },
          data: {
            level: nextLevel,
            badge: nextBadge,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId,
          type: 'system',
          title: '积分到账通知',
          content: `管理员为你增加了 ${params.points} 积分。原因：${params.reason}`,
          fromId: params.actor.id,
          fromName: params.actor.name,
          fromAvatar: params.actor.avatar ?? undefined,
        },
      });

      results.push({
        id: userId,
        name: user.name,
        totalPoints: updatedUser.points,
        level: nextLevel,
        levelUp,
      });
    }

    return results;
  });
}
