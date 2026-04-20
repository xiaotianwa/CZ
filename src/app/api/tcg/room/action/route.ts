import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  parseRoomState,
  parseDeck,
  rebuildGameState,
  validateAction,
  calcElo,
  tierOf,
} from '../_helpers';
import type { Action } from '@/game/types';

/**
 * POST /api/tcg/room/action
 * Body: { roomCode, action, actionIndex }
 *
 * Phase A1/A2：
 *  - 服务端重建 GameState 并校验合法性（权威判定）
 *  - 对局结束自动写 TcgMatch + 更新双方 ELO/tier/wins/losses
 *  - 幂等：actionIndex 已存在则直接返回
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const body = await req.json();
    const roomCode = (body.roomCode || '').toUpperCase().trim();
    const action = body.action as Action | undefined;
    const actionIndex: number = body.actionIndex ?? -1;

    if (!roomCode || !action) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    const room = await prisma.tcgRoom.findUnique({ where: { code: roomCode } });
    if (!room) {
      return NextResponse.json({ code: 404, message: '房间不存在' }, { status: 404 });
    }

    // 只有房间内的两名玩家能提交动作
    if (room.hostId !== user.id && room.guestId !== user.id) {
      return NextResponse.json({ code: 403, message: '非房间成员' }, { status: 403 });
    }

    const gameMeta = parseRoomState(room.state);
    if (gameMeta.ended) {
      return NextResponse.json({ code: 409, message: '对局已结束' }, { status: 409 });
    }

    // 幂等：actionIndex 已存在
    if (actionIndex >= 0 && actionIndex < gameMeta.actions.length) {
      return NextResponse.json({ code: 0, data: { version: room.version, duplicate: true } });
    }

    // 解析双方 deck
    const p1Deck = parseDeck(room.hostDeck);
    const p2Deck = parseDeck(room.guestDeck);
    if (!p1Deck || !p2Deck) {
      return NextResponse.json({ code: 500, message: '房间 deck 数据损坏' }, { status: 500 });
    }

    // 防止伪造对方动作
    const myPerspective = room.hostId === user.id ? 'P1' : 'P2';
    const actionPlayer = (action as Action & { player?: string }).player;
    if (actionPlayer && actionPlayer !== myPerspective) {
      return NextResponse.json({ code: 403, message: '不能提交对方动作' }, { status: 403 });
    }

    // 重建状态并校验
    const state = rebuildGameState({
      seed: gameMeta.seed,
      firstPlayer: gameMeta.firstPlayer,
      p1Deck,
      p2Deck,
      actions: gameMeta.actions,
    });

    const result = validateAction(state, action);
    if (!result.valid || !result.nextState) {
      return NextResponse.json({ code: 422, message: `动作非法：${result.reason}` }, { status: 422 });
    }

    const nextActions = [...gameMeta.actions, action];
    const nextState = result.nextState;
    const ended = nextState.ended;
    let winnerId: string | null = null;
    let endedReason: string | null = null;
    if (ended && nextState.winner && nextState.winner !== 'draw') {
      winnerId = nextState.winner === 'P1' ? room.hostId : room.guestId;
    }
    if (ended) {
      if (action.type === 'SURRENDER') endedReason = 'surrender';
      else if (nextState.turn >= 30) endedReason = 'turn_limit';
      else endedReason = 'hp_zero';
    }

    const newRoomState = {
      seed: gameMeta.seed,
      firstPlayer: gameMeta.firstPlayer,
      actions: nextActions,
      ended,
      winnerId,
    };

    await prisma.tcgRoom.update({
      where: { id: room.id },
      data: {
        state: JSON.stringify(newRoomState),
        version: room.version + 1,
        status: ended ? 'finished' : 'playing',
        winnerId,
      },
    });

    // ====== Phase A2：对局结束落库 + ELO 更新 ======
    if (ended) {
      try {
        await settleMatch({
          hostId: room.hostId,
          guestId: room.guestId,
          hostDeckRaw: room.hostDeck,
          guestDeckRaw: room.guestDeck,
          winnerId,
          replay: nextActions,
          turns: nextState.turn,
          endedReason,
        });
      } catch (settleErr) {
        console.error('[settleMatch] failed:', settleErr);
      }
    }

    return NextResponse.json({
      code: 0,
      data: {
        version: room.version + 1,
        actionIndex: nextActions.length - 1,
        ended,
        winnerId,
      },
    });
  } catch (err) {
    console.error('[API Error] /api/tcg/room/action', err);
    return NextResponse.json({ code: 500, message: '提交动作失败' }, { status: 500 });
  }
}

async function settleMatch(opts: {
  hostId: string;
  guestId: string | null;
  hostDeckRaw: string;
  guestDeckRaw: string;
  winnerId: string | null;
  replay: unknown[];
  turns: number;
  endedReason: string | null;
}): Promise<void> {
  const { hostId, guestId, hostDeckRaw, guestDeckRaw, winnerId, replay, turns, endedReason } = opts;
  if (!guestId) return;

  const [host, guest] = await Promise.all([
    prisma.tcgPlayer.upsert({
      where: { userId: hostId },
      create: { userId: hostId },
      update: {},
    }),
    prisma.tcgPlayer.upsert({
      where: { userId: guestId },
      create: { userId: guestId },
      update: {},
    }),
  ]);

  const outcome: 'A' | 'B' | 'draw' =
    winnerId === hostId ? 'A' : winnerId === guestId ? 'B' : 'draw';
  const [newHostRating, newGuestRating] = calcElo(host.rating, guest.rating, outcome);
  const ratingDelta = newHostRating - host.rating;

  await Promise.all([
    prisma.tcgPlayer.update({
      where: { userId: hostId },
      data: {
        rating: newHostRating,
        tier: tierOf(newHostRating),
        wins: { increment: outcome === 'A' ? 1 : 0 },
        losses: { increment: outcome === 'B' ? 1 : 0 },
        lastPlayAt: new Date(),
      },
    }),
    prisma.tcgPlayer.update({
      where: { userId: guestId },
      data: {
        rating: newGuestRating,
        tier: tierOf(newGuestRating),
        wins: { increment: outcome === 'B' ? 1 : 0 },
        losses: { increment: outcome === 'A' ? 1 : 0 },
        lastPlayAt: new Date(),
      },
    }),
    prisma.tcgMatch.create({
      data: {
        mode: 'friend',
        playerAId: hostId,
        playerBId: guestId,
        deckA: hostDeckRaw,
        deckB: guestDeckRaw,
        replay: JSON.stringify(replay),
        winnerId,
        ratingDelta,
        turns,
        endedReason,
      },
    }),
  ]);
}
