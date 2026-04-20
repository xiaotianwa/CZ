import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toCardPreset } from '@/lib/tcg/cardAdapter';

/**
 * 公开卡池查询 —— 前台 /game/* 页面消费
 *
 * 缓存策略：
 *   - HTTP `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
 *     → CDN / 浏览器缓存 5 分钟，过期后允许返回旧版本同时后台刷新（最多 10 分钟）
 *   - 运营在 /tcg-admin 改一张卡，最坏 5 分钟全网生效
 *
 * 性能：单次查询 ~40 张卡 ≈ 2KB JSON，DB 时间 < 5ms
 */
export async function GET() {
  try {
    const rows = await prisma.tcgCard.findMany({
      where: { status: 'active' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const cards = rows.map(toCardPreset);

    return NextResponse.json(
      { code: 0, message: 'success', data: { cards, cachedAt: Date.now() } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (err) {
    console.error('[API Error] /api/tcg/public/cards', err);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误', data: null },
      { status: 500 },
    );
  }
}
