import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * B3 · 自定义卡组 API
 *
 * GET  /api/tcg/decks          列出当前用户的所有卡组
 * POST /api/tcg/decks          新建一个卡组（允许未完成的草稿，合法性由客户端 / 对战接口校验）
 *
 * 单人卡组数上限 MAX_DECKS_PER_USER，超出则拒绝。
 * cardIds 字段以 JSON 字符串（string[]）形式存储。
 */

const MAX_DECKS_PER_USER = 20;
const MAX_CARDS_PER_DECK = 60;   // 粗粒度防刷上限

type DeckResponse = {
  id: string;
  name: string;
  cards: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function parseCardIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is string => typeof c === 'string');
  } catch {
    return [];
  }
}

function rowToResponse(row: {
  id: string;
  name: string;
  cardIds: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DeckResponse {
  return {
    id: row.id,
    name: row.name,
    cards: parseCardIds(row.cardIds),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }
    const rows = await prisma.tcgDeck.findMany({
      where: { userId: user.id },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json({ code: 0, data: { decks: rows.map(rowToResponse) } });
  } catch (err) {
    console.error('[API Error] GET /api/tcg/decks', err);
    return NextResponse.json({ code: 500, message: '查询卡组失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const cards = Array.isArray(body?.cards)
      ? body.cards.filter((c: unknown): c is string => typeof c === 'string')
      : [];
    const wantActive = !!body?.isActive;

    if (!name) {
      return NextResponse.json({ code: 400, message: '请填写卡组名称' }, { status: 400 });
    }
    if (name.length > 20) {
      return NextResponse.json({ code: 400, message: '名称过长（上限 20 字）' }, { status: 400 });
    }

    if (cards.length > MAX_CARDS_PER_DECK) {
      return NextResponse.json({
        code: 422,
        message: `卡组卡牌数不能超过 ${MAX_CARDS_PER_DECK} 张`,
      }, { status: 422 });
    }

    const count = await prisma.tcgDeck.count({ where: { userId: user.id } });
    if (count >= MAX_DECKS_PER_USER) {
      return NextResponse.json({
        code: 409,
        message: `单账号最多保存 ${MAX_DECKS_PER_USER} 套卡组，请先删除旧卡组`,
      }, { status: 409 });
    }

    // 若置为出战卡组，先把旧的出战卡组全部取消
    if (wantActive) {
      await prisma.tcgDeck.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
      });
    }

    const row = await prisma.tcgDeck.create({
      data: {
        userId: user.id,
        name,
        cardIds: JSON.stringify(cards),
        isActive: wantActive,
      },
    });

    return NextResponse.json({ code: 0, data: rowToResponse(row) });
  } catch (err) {
    console.error('[API Error] POST /api/tcg/decks', err);
    return NextResponse.json({ code: 500, message: '新建卡组失败' }, { status: 500 });
  }
}
