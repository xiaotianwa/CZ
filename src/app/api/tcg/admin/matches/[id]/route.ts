import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTcgAdmin } from '@/lib/tcg/auth';
import { ok, fail, handleError } from '@/lib/api';

/**
 * 战报详情 —— 包含完整 replay JSON、双方卡组快照、玩家信息
 * P0 版本：返回原始 replay，前端做基础展示
 * P1 版本：接入 engine reducer 支持逐帧回看
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireTcgAdmin(req);

    const match = await prisma.tcgMatch.findUnique({ where: { id: params.id } });
    if (!match) return fail('战报不存在', 404);

    const userIds = [match.playerAId];
    if (match.playerBId) userIds.push(match.playerBId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatar: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // 尝试解析 replay，失败时返回字符串
    let replayParsed: unknown = null;
    let replayError: string | null = null;
    try {
      replayParsed = JSON.parse(match.replay);
    } catch (e) {
      replayError = e instanceof Error ? e.message : 'replay JSON 解析失败';
    }

    // 尝试解析 deck 快照
    let deckA: unknown = null;
    let deckB: unknown = null;
    try { deckA = JSON.parse(match.deckA); } catch { /* ignore */ }
    try { deckB = JSON.parse(match.deckB); } catch { /* ignore */ }

    return ok({
      ...match,
      deckA,
      deckB,
      replay: replayParsed,
      replayRaw: match.replay,
      replayError,
      playerA: userMap.get(match.playerAId) ?? null,
      playerB: match.playerBId ? userMap.get(match.playerBId) ?? null : null,
    });
  } catch (err) {
    return handleError(err);
  }
}
