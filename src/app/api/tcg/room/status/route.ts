import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/tcg/room/status?code=XXXXXX&since=0
 * 轮询房间状态 + 增量动作（客户端 1s/次）
 * since = 客户端已有的动作数量，返回 since 之后的新动作
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = (url.searchParams.get('code') || '').toUpperCase().trim();
    const since = parseInt(url.searchParams.get('since') || '0', 10);

    if (!code) {
      return NextResponse.json({ code: 400, message: '缺少房间码' }, { status: 400 });
    }

    const room = await prisma.tcgRoom.findUnique({ where: { code } });
    if (!room) {
      return NextResponse.json({ code: 404, message: '房间不存在' }, { status: 404 });
    }

    const gameState = JSON.parse(room.state || '{"actions":[]}');
    const allActions: unknown[] = gameState.actions || [];
    const newActions = allActions.slice(since);

    return NextResponse.json({
      code: 0,
      data: {
        status: room.status,
        version: room.version,
        hostId: room.hostId,
        guestId: room.guestId,
        hostDeck: room.hostDeck ? JSON.parse(room.hostDeck) : null,
        guestDeck: room.guestDeck ? JSON.parse(room.guestDeck) : null,
        seed: gameState.seed,
        firstPlayer: gameState.firstPlayer,
        totalActions: allActions.length,
        newActions,
        ended: !!gameState.ended,
        winnerId: gameState.winnerId ?? room.winnerId ?? null,
      },
    });
  } catch (err) {
    console.error('[API Error] /api/tcg/room/status', err);
    return NextResponse.json({ code: 500, message: '查询状态失败' }, { status: 500 });
  }
}
