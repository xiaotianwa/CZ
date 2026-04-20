import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgAdmin, requireTcgOps } from '@/lib/tcg/auth';
import { auditLog } from '@/lib/tcg/audit';
import { ok, fail, paginated, handleError } from '@/lib/api';
import { synergiesArraySchema, parseSynergies } from '@/lib/tcg/synergy';
import { effectHooksArraySchema, parseEffectHooks } from '@/lib/tcg/effectHooks';

// ==================== 列表 GET ====================

export async function GET(req: NextRequest) {
  try {
    await requireTcgAdmin(req);

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
    const keyword = url.searchParams.get('keyword')?.trim() || '';
    const type = url.searchParams.get('type') || '';
    const rarity = url.searchParams.get('rarity') || '';
    const status = url.searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (keyword) {
      where.OR = [
        { id: { contains: keyword } },
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }
    if (type) where.type = type;
    if (rarity) where.rarity = rarity;
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.tcgCard.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tcgCard.count({ where }),
    ]);

    const formatted = list.map((c) => ({
      ...c,
      effectHooks: parseEffectHooks(c.effectHooks),
      keywords: safeParseJsonArray(c.keywords),
      synergies: parseSynergies(c.synergies),
    }));

    return paginated(formatted, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

// ==================== 创建 POST ====================

const createSchema = z.object({
  id: z.string().regex(/^[A-Z]\d{2,3}$/, '卡牌 ID 格式应为 C01 / I08 / E12 / V06'),
  name: z.string().trim().min(1, '卡牌名称不能为空').max(50),
  type: z.enum(['character', 'item', 'equipment', 'effect', 'event']),
  subtype: z.enum(['instant', 'delayed', 'weapon', 'armor']).optional().nullable(),
  rarity: z.enum(['N', 'R', 'SR', 'SSR']),
  cost: z.number().int().min(0).max(99),
  attack: z.number().int().min(0).max(99).optional().nullable(),
  health: z.number().int().min(0).max(99).optional().nullable(),
  description: z.string().trim().min(1, '卡牌描述不能为空'),
  flavor: z.string().optional().nullable(),
  imagePath: z.string().optional().nullable(),
  effectHooks: effectHooksArraySchema.default([]),
  keywords: z.array(z.string()).default([]),
  synergies: synergiesArraySchema.default([]),
  seasonId: z.string().optional().nullable(),
  status: z.enum(['active', 'disabled', 'draft']).default('active'),
  sortOrder: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireTcgOps(req);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }
    const data = parsed.data;

    const existing = await prisma.tcgCard.findUnique({ where: { id: data.id } });
    if (existing) return fail(`卡牌 ID ${data.id} 已存在`, 409);

    const created = await prisma.tcgCard.create({
      data: {
        id: data.id,
        name: data.name,
        type: data.type,
        subtype: data.subtype ?? null,
        rarity: data.rarity,
        cost: data.cost,
        attack: data.attack ?? null,
        health: data.health ?? null,
        description: data.description,
        flavor: data.flavor ?? null,
        imagePath: data.imagePath ?? null,
        effectHooks: JSON.stringify(data.effectHooks),
        keywords: JSON.stringify(data.keywords),
        synergies: JSON.stringify(data.synergies),
        seasonId: data.seasonId ?? null,
        status: data.status,
        sortOrder: data.sortOrder,
      },
    });

    await auditLog({
      operatorId: admin.id,
      action: 'card.create',
      targetType: 'card',
      targetId: created.id,
      after: created,
      req,
    });

    return ok({ ...created, effectHooks: data.effectHooks, keywords: data.keywords, synergies: data.synergies });
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
