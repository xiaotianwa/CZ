import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTcgAdmin } from '@/lib/tcg/auth';
import { paginated, handleError } from '@/lib/api';

/**
 * TCG 玩家列表
 * 以 TcgPlayer 为主表，按 userId 关联 User（社区用户）
 * 支持：按昵称/邮箱/ID 模糊搜索 · 按段位 / 封禁状态筛选
 */
export async function GET(req: NextRequest) {
  try {
    await requireTcgAdmin(req);

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
    const keyword = url.searchParams.get('keyword')?.trim() || '';
    const tier = url.searchParams.get('tier') || '';
    const banStatus = url.searchParams.get('banStatus') || '';

    // 如果搜索昵称/邮箱，需要先查 User 拿 id 列表
    let userIdFilter: string[] | null = null;
    if (keyword) {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { id: { contains: keyword } },
            { name: { contains: keyword } },
            { email: { contains: keyword } },
          ],
        },
        select: { id: true },
        take: 500,
      });
      userIdFilter = users.map((u) => u.id);
      if (userIdFilter.length === 0) {
        return paginated([], 0, page, pageSize);
      }
    }

    const where: Record<string, unknown> = {};
    if (userIdFilter) where.userId = { in: userIdFilter };
    if (tier) where.tier = tier;
    if (banStatus) where.banStatus = banStatus;

    const [players, total] = await Promise.all([
      prisma.tcgPlayer.findMany({
        where,
        orderBy: [{ lastPlayAt: 'desc' }, { rating: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tcgPlayer.count({ where }),
    ]);

    // 批量回查 User 信息
    const userIds = players.map((p) => p.userId);
    const users = userIds.length
      ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, avatar: true, role: true, level: true, isActive: true },
      })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const list = players.map((p) => ({
      ...p,
      user: userMap.get(p.userId) ?? null,
    }));

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}
