import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * B3 · 自定义卡组 API（单条操作）
 *
 * PUT    /api/tcg/decks/:id    更新卡组（名称 / 卡牌 / 出战状态，任一）
 * DELETE /api/tcg/decks/:id    删除卡组
 *
 * 只允许修改/删除本人的卡组。
 * 卡牌数量仅做粗粒度上限防刷；35 张 / 五类必备 / SSR 限制由客户端和对战路由负责。
 */

const MAX_CARDS_PER_DECK = 60;

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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const row = await prisma.tcgDeck.findUnique({ where: { id } });
    if (!row || row.userId !== user.id) {
      return NextResponse.json({ code: 404, message: '卡组不存在' }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body?.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ code: 400, message: '请填写卡组名称' }, { status: 400 });
      }
      if (name.length > 20) {
        return NextResponse.json({ code: 400, message: '名称过长（上限 20 字）' }, { status: 400 });
      }
      data.name = name;
    }

    if (Array.isArray(body?.cards)) {
      const cards = body.cards.filter((c: unknown): c is string => typeof c === 'string');
      if (cards.length > MAX_CARDS_PER_DECK) {
        return NextResponse.json({
          code: 422,
          message: `卡组卡牌数不能超过 ${MAX_CARDS_PER_DECK} 张`,
        }, { status: 422 });
      }
      data.cardIds = JSON.stringify(cards);
    }

    if (typeof body?.isActive === 'boolean') {
      data.isActive = body.isActive;
      // 设为出战卡组时，先把其他卡组的 isActive 全部关闭
      if (body.isActive === true) {
        await prisma.tcgDeck.updateMany({
          where: { userId: user.id, isActive: true, NOT: { id } },
          data: { isActive: false },
        });
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ code: 400, message: '没有可更新字段' }, { status: 400 });
    }

    const updated = await prisma.tcgDeck.update({ where: { id }, data });
    return NextResponse.json({ code: 0, data: rowToResponse(updated) });
  } catch (err) {
    console.error('[API Error] PUT /api/tcg/decks/[id]', err);
    return NextResponse.json({ code: 500, message: '更新卡组失败' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const row = await prisma.tcgDeck.findUnique({ where: { id } });
    if (!row || row.userId !== user.id) {
      return NextResponse.json({ code: 404, message: '卡组不存在' }, { status: 404 });
    }

    await prisma.tcgDeck.delete({ where: { id } });
    return NextResponse.json({ code: 0, data: { id } });
  } catch (err) {
    console.error('[API Error] DELETE /api/tcg/decks/[id]', err);
    return NextResponse.json({ code: 500, message: '删除卡组失败' }, { status: 500 });
  }
}
