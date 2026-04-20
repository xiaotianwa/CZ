import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTcgAdmin } from '@/lib/tcg/auth';
import { paginated, handleError } from '@/lib/api';

/**
 * 战报列表
 * 筛选：mode / endedReason / playerId (A 或 B 任一) / dateFrom / dateTo
 */
export async function GET(req: NextRequest) {
  try {
    await requireTcgAdmin(req);

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
    const mode = url.searchParams.get('mode') || '';
    const endedReason = url.searchParams.get('endedReason') || '';
    const playerId = url.searchParams.get('playerId') || '';
    const dateFrom = url.searchParams.get('dateFrom') || '';
    const dateTo = url.searchParams.get('dateTo') || '';

    const where: Record<string, unknown> = {};
    if (mode) where.mode = mode;
    if (endedReason) where.endedReason = endedReason;
    if (playerId) where.OR = [{ playerAId: playerId }, { playerBId: playerId }];
    if (dateFrom || dateTo) {
      const range: Record<string, Date> = {};
      if (dateFrom) range.gte = new Date(dateFrom);
      if (dateTo) range.lte = new Date(dateTo);
      where.createdAt = range;
    }

    const [matches, total] = await Promise.all([
      prisma.tcgMatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, mode: true, seasonId: true, playerAId: true, playerBId: true,
          winnerId: true, ratingDelta: true, turns: true, durationSec: true,
          endedReason: true, createdAt: true,
        },
      }),
      prisma.tcgMatch.count({ where }),
    ]);

    // 回查两边玩家用户信息
    const userIds = Array.from(new Set(matches.flatMap((m) => [m.playerAId, m.playerBId].filter(Boolean) as string[])));
    const users = userIds.length
      ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, avatar: true },
      })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const list = matches.map((m) => ({
      ...m,
      playerA: userMap.get(m.playerAId) ?? null,
      playerB: m.playerBId ? userMap.get(m.playerBId) ?? null : null,
    }));

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}
