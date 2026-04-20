import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[randomInt(chars.length)];
  }
  return code;
}

/**
 * POST /api/tcg/room/create
 * Body: { hostName, hostDeck: { heroName, heroPowerId, cards } }
 * 创建好友房，返回 6 位邀请码 + 确定性 seed
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const body = await req.json();
    const hostDeck = body.hostDeck || {};
    const seed = randomInt(2147483647);
    const firstPlayer = randomInt(2) === 0 ? 'P1' : 'P2';

    // Phase A3：按需清理过期房间（避免 6 位码空间被废弃房间占满）
    //   - waiting > 30min  → 删除（无人加入）
    //   - playing > 2h     → 删除（疑似断线废弃）
    //   - finished > 24h   → 删除（历史已落 TcgMatch）
    const now = Date.now();
    try {
      await prisma.tcgRoom.deleteMany({
        where: {
          OR: [
            { status: 'waiting', createdAt: { lt: new Date(now - 30 * 60 * 1000) } },
            { status: 'playing', updatedAt: { lt: new Date(now - 2 * 60 * 60 * 1000) } },
            { status: 'finished', updatedAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } },
          ],
        },
      });
    } catch (cleanupErr) {
      console.warn('[cleanup rooms] failed:', cleanupErr);
    }

    // 生成唯一的 6 位房间码（重试 5 次）
    let code = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateRoomCode();
      const existing = await prisma.tcgRoom.findUnique({ where: { code: candidate } });
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return NextResponse.json({ code: 500, message: '房间码生成失败，请重试' }, { status: 500 });
    }

    const gameState = { seed, firstPlayer, actions: [] as unknown[] };

    const room = await prisma.tcgRoom.create({
      data: {
        code,
        hostId: user.id,
        hostDeck: JSON.stringify(hostDeck),
        state: JSON.stringify(gameState),
        status: 'waiting',
      },
    });

    return NextResponse.json({
      code: 0,
      data: { roomId: room.id, roomCode: room.code, seed, firstPlayer },
    });
  } catch (err) {
    console.error('[API Error] /api/tcg/room/create', err);
    return NextResponse.json({ code: 500, message: '创建房间失败' }, { status: 500 });
  }
}
