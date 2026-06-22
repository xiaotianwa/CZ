import { NextRequest } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { requireTcgAdmin } from '@/lib/tcg/auth';
import { ok, handleError } from '@/lib/api';
import { REMOVED_GAME_CENTER_ENTRY_KEYS } from '@/data/gameCenterEntries';

function isMissingGameCenterTable(err: unknown) {
  return err instanceof Error && /GameCenterEntry/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
}

 function isMissingProjectGameProfileTable(err: unknown) {
  return err instanceof Error && /ProjectGameProfile/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
 }

/** TCG 运营后台仪表盘 —— 数据总览统计 */
export async function GET(req: NextRequest) {
  try {
    await requireTcgAdmin(req);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86400000);

    const [
      cardsTotal,
      cardsActive,
      currentProjectGames,
      playersTotal,
      playersBanned,
      matchesTotal,
      matchesToday,
      decksTotal,
      recentMatches,
      cardsByRarity,
      enabledEntriesRaw,
    ] = await Promise.all([
      prisma.tcgCard.count(),
      prisma.tcgCard.count({ where: { status: 'active' } }),
      prisma.projectGameProfile.count().catch((err: unknown) => {
        if (isMissingProjectGameProfileTable(err)) {
          return 0;
        }
        throw err;
      }),
      prisma.tcgPlayer.count(),
      prisma.tcgPlayer.count({ where: { banStatus: 'banned' } }),
      prisma.tcgMatch.count(),
      prisma.tcgMatch.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.tcgDeckPreset.count({ where: { status: 'active' } }),
      prisma.tcgMatch.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, mode: true, playerAId: true, playerBId: true,
          winnerId: true, turns: true, durationSec: true, endedReason: true, createdAt: true,
        },
      }),
      prisma.tcgCard.groupBy({
        by: ['rarity'],
        where: { status: 'active' },
        _count: { _all: true },
      }),
      prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*) as count
        FROM "GameCenterEntry"
        WHERE "isEnabled" = true
          AND "entryKey" NOT IN (${Prisma.join(REMOVED_GAME_CENTER_ENTRY_KEYS)})
      `).catch((err: unknown) => {
        if (isMissingGameCenterTable(err)) {
          return [{ count: 0 }];
        }
        throw err;
      }),
    ]);

    // 近 7 天每日对局（按 UTC 日期分组）
    const trendRaw = await prisma.tcgMatch.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });
    const trendMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      trendMap.set(key, 0);
    }
    for (const m of trendRaw) {
      const key = m.createdAt.toISOString().slice(0, 10);
      trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
    const trend = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

    // 回查战报玩家昵称
    const userIds = Array.from(new Set(recentMatches.flatMap((m) => [m.playerAId, m.playerBId].filter(Boolean) as string[])));
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return ok({
      currentProject: {
        games: currentProjectGames,
        enabledEntries: Number(enabledEntriesRaw[0]?.count ?? 0),
      },
      cards: {
        total: cardsTotal,
        active: cardsActive,
        byRarity: cardsByRarity.map((g) => ({ rarity: g.rarity, count: g._count._all })),
      },
      players: { total: playersTotal, banned: playersBanned },
      matches: { total: matchesTotal, today: matchesToday, trend },
      decks: { total: decksTotal },
      recentMatches: recentMatches.map((m) => ({
        ...m,
        playerA: userMap.get(m.playerAId) ?? null,
        playerB: m.playerBId ? userMap.get(m.playerBId) ?? null : null,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
