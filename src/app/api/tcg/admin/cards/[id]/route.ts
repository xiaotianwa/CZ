import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgAdmin, requireTcgOps } from '@/lib/tcg/auth';
import { auditLog } from '@/lib/tcg/audit';
import { ok, fail, handleError } from '@/lib/api';
import { synergiesArraySchema, parseSynergies } from '@/lib/tcg/synergy';
import { effectHooksArraySchema, parseEffectHooks } from '@/lib/tcg/effectHooks';

// ==================== 详情 GET ====================

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireTcgAdmin(req);
    const id = decodeURIComponent(params.id);
    const card = await prisma.tcgCard.findUnique({ where: { id } });
    if (!card) return fail('卡牌不存在', 404);
    return ok({
      ...card,
      effectHooks: parseEffectHooks(card.effectHooks),
      keywords: safeParseJsonArray(card.keywords),
      synergies: parseSynergies(card.synergies),
    });
  } catch (err) {
    return handleError(err);
  }
}

// ==================== 更新 PATCH ====================

const updateSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  type: z.enum(['character', 'item', 'equipment', 'effect', 'event']).optional(),
  subtype: z.enum(['instant', 'delayed', 'weapon', 'armor']).optional().nullable(),
  rarity: z.enum(['N', 'R', 'SR', 'SSR']).optional(),
  cost: z.number().int().min(0).max(99).optional(),
  attack: z.number().int().min(0).max(99).optional().nullable(),
  health: z.number().int().min(0).max(99).optional().nullable(),
  description: z.string().trim().min(1).optional(),
  flavor: z.string().optional().nullable(),
  imagePath: z.string().optional().nullable(),
  effectHooks: effectHooksArraySchema.optional(),
  keywords: z.array(z.string()).optional(),
  synergies: synergiesArraySchema.optional(),
  seasonId: z.string().optional().nullable(),
  status: z.enum(['active', 'disabled', 'draft']).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireTcgOps(req);
    const id = decodeURIComponent(params.id);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const data = parsed.data;

    const before = await prisma.tcgCard.findUnique({ where: { id } });
    if (!before) return fail('卡牌不存在', 404);

    // SSR 卡写操作额外告警（暂不拦截，仅审计 note 标记）
    const isSSR = before.rarity === 'SSR';
    const note = isSSR ? `SSR 卡修改` : undefined;

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.subtype !== undefined) updateData.subtype = data.subtype;
    if (data.rarity !== undefined) updateData.rarity = data.rarity;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.attack !== undefined) updateData.attack = data.attack;
    if (data.health !== undefined) updateData.health = data.health;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.flavor !== undefined) updateData.flavor = data.flavor;
    if (data.imagePath !== undefined) updateData.imagePath = data.imagePath;
    if (data.effectHooks !== undefined) updateData.effectHooks = JSON.stringify(data.effectHooks);
    if (data.keywords !== undefined) updateData.keywords = JSON.stringify(data.keywords);
    if (data.synergies !== undefined) updateData.synergies = JSON.stringify(data.synergies);
    if (data.seasonId !== undefined) updateData.seasonId = data.seasonId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const after = await prisma.tcgCard.update({ where: { id }, data: updateData });

    await auditLog({
      operatorId: admin.id,
      action: 'card.update',
      targetType: 'card',
      targetId: id,
      before,
      after,
      note,
      req,
    });

    return ok({
      ...after,
      effectHooks: parseEffectHooks(after.effectHooks),
      keywords: safeParseJsonArray(after.keywords),
      synergies: parseSynergies(after.synergies),
    });
  } catch (err) {
    return handleError(err);
  }
}

// ==================== 删除 DELETE（软删除） ====================

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireTcgOps(req);
    const id = decodeURIComponent(params.id);

    const before = await prisma.tcgCard.findUnique({ where: { id } });
    if (!before) return fail('卡牌不存在', 404);

    // 软删除：status=disabled，保留数据（审计可回溯）
    const after = await prisma.tcgCard.update({
      where: { id },
      data: { status: 'disabled' },
    });

    await auditLog({
      operatorId: admin.id,
      action: 'card.delete',
      targetType: 'card',
      targetId: id,
      before,
      after,
      note: '软删除（status=disabled）',
      req,
    });

    return ok(null, '卡牌已停用');
  } catch (err) {
    return handleError(err);
  }
}

// ==================== helpers ====================

function safeParseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
