import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { calcLevelFromPoints, getBadgeByLevel } from '@/lib/level';

export async function GET(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        level: true,
        badge: true,
        points: true,
        bio: true,
        city: true,
        createdAt: true,
      },
    });

    if (!user) {
      return fail('用户不存在', 404);
    }

    const syncedLevel = calcLevelFromPoints(user.points);
    const syncedBadge = getBadgeByLevel(syncedLevel);

    if (user.level !== syncedLevel || user.badge !== syncedBadge) {
      await prisma.user.update({
        where: { id: user.id },
        data: { level: syncedLevel, badge: syncedBadge },
      });
      user.level = syncedLevel;
      user.badge = syncedBadge;
    }

    // 计算注册顺序：注册时间 <= 当前用户的用户数量 = 该用户是第几位
    const joinOrder = await prisma.user.count({
      where: { createdAt: { lte: user.createdAt } },
    });

    const res = ok({ ...user, joinOrder });
    // 防止 Nginx proxy_cache 缓存带用户信息的响应导致串号
    res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (err) {
    return handleError(err);
  }
}
