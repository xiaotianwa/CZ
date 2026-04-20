import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { expandDeckCardIds } from '@/lib/tcg/cardAdapter';

/**
 * 公开预设卡组查询 —— 前台 DeckPicker 消费
 *
 * 输出格式与 @/game/decks 的 ALL_DECKS 兼容：
 *   { key, label, deck: { heroName, heroPowerId, cards: ['C01','C01',...] } }
 *
 * 注意：DB 的 TcgDeckPreset 没有 heroName / heroPowerId 字段，
 *       目前所有官方卡组都用 'hp_draw1'（每回合抽 1）+ 默认 heroName，
 *       后续若需要差异化英雄技能再扩 schema。
 */
export async function GET() {
  try {
    const rows = await prisma.tcgDeckPreset.findMany({
      where: { status: 'active' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const presets = rows.map((row) => ({
      key: `preset-${row.id}`,
      label: row.name,
      description: row.description,
      archetype: row.archetype,
      isStarter: row.isStarter,
      deck: {
        heroName: '玩家',
        heroPowerId: 'hp_draw1',
        cards: expandDeckCardIds(row.cardIds),
      },
    }));

    return NextResponse.json(
      { code: 0, message: 'success', data: { presets, cachedAt: Date.now() } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (err) {
    console.error('[API Error] /api/tcg/public/deck-presets', err);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误', data: null },
      { status: 500 },
    );
  }
}
