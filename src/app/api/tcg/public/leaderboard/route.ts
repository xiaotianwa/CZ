import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/tcg/public/leaderboard?limit=50
 * 公开排行榜 —— 按 ELO 分排名
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    const players = await (prisma as any).tcgPlayer.findMany({
      orderBy: { rating: 'desc' },
      take: limit,
      select: {
        userId: true,
        rating: true,
        tier: true,
        wins: true,
        losses: true,
      },
    });

    // 尝试关联用户信息（名称、头像）
    const userIds = players.map((p: any) => p.userId);
    let userMap: Record<string, { name: string; avatar: string | null }> = {};
    try {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, avatar: true },
      });
      for (const u of users) {
        userMap[u.id] = { name: u.name, avatar: u.avatar };
      }
    } catch {
      // 关联失败则使用空映射
    }

    const leaderboard = players.map((p: any, idx: number) => ({
      rank: idx + 1,
      userId: p.userId,
      name: userMap[p.userId]?.name || `玩家${p.userId.slice(-4)}`,
      avatar: userMap[p.userId]?.avatar || null,
      rating: p.rating,
      tier: p.tier,
      wins: p.wins,
      losses: p.losses,
      winRate: p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0,
    }));

    return NextResponse.json(
      { code: 0, data: { leaderboard } },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    );
  } catch (err) {
    console.error('[API Error] /api/tcg/public/leaderboard', err);
    return NextResponse.json({ code: 500, message: '排行榜加载失败' }, { status: 500 });
  }
}
