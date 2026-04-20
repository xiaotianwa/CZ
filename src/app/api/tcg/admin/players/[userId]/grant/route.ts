import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgOps } from '@/lib/tcg/auth';
import { auditLog } from '@/lib/tcg/audit';
import { ok, fail, handleError } from '@/lib/api';

/**
 * 补偿发放：为玩家发放卡牌、碎片或积分
 * 强制审计：必须填写 reason（至少 4 字符）
 * 限额：单卡单次 ≤ 10 张，碎片 ≤ 500
 */
const grantSchema = z.object({
  reason: z.string().min(4, '补偿原因至少 4 字'),
  items: z.array(z.object({
    type: z.enum(['card', 'shards']),
    cardId: z.string(),
    count: z.number().int().min(1),
  })).min(1, '至少发放 1 项'),
});

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const admin = await requireTcgOps(req);
    const userId = params.userId;

    const body = await req.json();
    const parsed = grantSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { items, reason } = parsed.data;

    // 上限校验
    for (const it of items) {
      if (it.type === 'card' && it.count > 10) {
        return fail(`单卡单次最多发放 10 张，${it.cardId} 超限`);
      }
      if (it.type === 'shards' && it.count > 500) {
        return fail(`碎片单次最多发放 500，${it.cardId} 超限`);
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!user) return fail('用户不存在', 404);

    // 校验卡牌 ID 合法
    const cardIds = Array.from(new Set(items.map((i) => i.cardId)));
    const cards = await prisma.tcgCard.findMany({ where: { id: { in: cardIds } }, select: { id: true, name: true } });
    const cardMap = new Map(cards.map((c) => [c.id, c]));
    for (const id of cardIds) {
      if (!cardMap.has(id)) return fail(`卡牌 ${id} 不存在`);
    }

    // 发放（使用 upsert 保证幂等，多次运行结果一致）
    const results: Array<{ cardId: string; type: string; count: number; newCount: number; newShards: number }> = [];
    for (const it of items) {
      const existing = await prisma.tcgCollection.findUnique({
        where: { userId_cardId: { userId, cardId: it.cardId } },
      });

      if (existing) {
        const updated = await prisma.tcgCollection.update({
          where: { userId_cardId: { userId, cardId: it.cardId } },
          data: {
            count: it.type === 'card' ? existing.count + it.count : existing.count,
            shards: it.type === 'shards' ? existing.shards + it.count : existing.shards,
          },
        });
        results.push({ cardId: it.cardId, type: it.type, count: it.count, newCount: updated.count, newShards: updated.shards });
      } else {
        const created = await prisma.tcgCollection.create({
          data: {
            userId,
            cardId: it.cardId,
            count: it.type === 'card' ? it.count : 0,
            shards: it.type === 'shards' ? it.count : 0,
          },
        });
        results.push({ cardId: it.cardId, type: it.type, count: it.count, newCount: created.count, newShards: created.shards });
      }
    }

    await auditLog({
      operatorId: admin.id,
      action: 'player.grant',
      targetType: 'player',
      targetId: userId,
      after: { items, results },
      note: reason,
      req,
    });

    return ok({ granted: results });
  } catch (err) {
    return handleError(err);
  }
}
