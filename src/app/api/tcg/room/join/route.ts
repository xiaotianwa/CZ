import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/tcg/room/join
 * Body: { roomCode, guestName, guestDeck: { heroName, heroPowerId, cards } }
 * 加入好友房，返回双方卡组 + seed + firstPlayer
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const body = await req.json();
    const roomCode = (body.roomCode || '').toUpperCase().trim();
    const guestDeck = body.guestDeck || {};

    if (!roomCode || roomCode.length !== 6) {
      return NextResponse.json({ code: 400, message: '请输入 6 位房间码' }, { status: 400 });
    }

    const room = await prisma.tcgRoom.findUnique({ where: { code: roomCode } });
    if (!room) {
      return NextResponse.json({ code: 404, message: '房间不存在或已过期' }, { status: 404 });
    }
    if (room.status !== 'waiting') {
      return NextResponse.json({ code: 409, message: '房间已开始或已结束' }, { status: 409 });
    }
    if (room.guestId) {
      return NextResponse.json({ code: 409, message: '房间已有对手' }, { status: 409 });
    }
    if (room.hostId === user.id) {
      return NextResponse.json({ code: 409, message: '不能加入自己创建的房间' }, { status: 409 });
    }

    // 使用条件更新防止并发 join 竞态：只有 guestId 仍为空时才更新成功
    const updated = await prisma.tcgRoom.updateMany({
      where: { id: room.id, guestId: null, status: 'waiting' },
      data: {
        guestId: user.id,
        guestDeck: JSON.stringify(guestDeck),
        status: 'ready',
        version: room.version + 1,
      },
    });
    if (updated.count === 0) {
      return NextResponse.json({ code: 409, message: '房间已有对手或状态已变更' }, { status: 409 });
    }

    const gameState = JSON.parse(room.state || '{}');
    const hostDeck = JSON.parse(room.hostDeck || '{}');

    return NextResponse.json({
      code: 0,
      data: {
        roomId: room.id,
        roomCode: room.code,
        status: 'ready',
        seed: gameState.seed,
        firstPlayer: gameState.firstPlayer,
        hostId: room.hostId,
        hostDeck,
      },
    });
  } catch (err) {
    console.error('[API Error] /api/tcg/room/join', err);
    return NextResponse.json({ code: 500, message: '加入房间失败' }, { status: 500 });
  }
}
