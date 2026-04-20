import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgAdmin, requireTcgOps } from '@/lib/tcg/auth';
import { auditLog } from '@/lib/tcg/audit';
import { ok, fail, handleError } from '@/lib/api';

const VALID_TIERS = ['iron', 'silver', 'gold', 'diamond', 'master'] as const;
const VALID_BAN = ['normal', 'warned', 'banned'] as const;

// ==================== 详情 GET ====================

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await requireTcgAdmin(req);
    const userId = params.userId;

    const [player, user, collection, decks, recentMatches] = await Promise.all([
      prisma.tcgPlayer.findUnique({ where: { userId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, avatar: true, role: true, level: true, points: true, city: true, bio: true, isActive: true, createdAt: true },
      }),
      prisma.tcgCollection.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
      prisma.tcgDeck.findMany({ where: { userId }, orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }] }),
      prisma.tcgMatch.findMany({
        where: { OR: [{ playerAId: userId }, { playerBId: userId }] },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, mode: true, playerAId: true, playerBId: true, winnerId: true, ratingDelta: true, turns: true, durationSec: true, endedReason: true, createdAt: true },
      }),
    ]);

    if (!user) return fail('用户不存在', 404);

    return ok({
      user,
      player: player ?? null,
      collection,
      decks,
      recentMatches,
    });
  } catch (err) {
    return handleError(err);
  }
}

// ==================== 更新 PATCH（封禁 / 改段位 / 改 ELO） ====================

const patchSchema = z.object({
  tier: z.enum(VALID_TIERS).optional(),
  rating: z.number().int().min(0).max(9999).optional(),
  banStatus: z.enum(VALID_BAN).optional(),
  banUntil: z.string().nullable().optional(),   // ISO string
  banReason: z.string().nullable().optional(),
  energy: z.number().int().min(0).max(99).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const admin = await requireTcgOps(req);
    const userId = params.userId;

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const data = parsed.data;

    // 玩家不存在时，视作"首次纳入 TCG 体系"自动创建
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!user) return fail('用户不存在', 404);

    const before = await prisma.tcgPlayer.findUnique({ where: { userId } });

    const updateData: Record<string, unknown> = {};
    if (data.tier !== undefined) updateData.tier = data.tier;
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.banStatus !== undefined) updateData.banStatus = data.banStatus;
    if (data.banUntil !== undefined) updateData.banUntil = data.banUntil ? new Date(data.banUntil) : null;
    if (data.banReason !== undefined) updateData.banReason = data.banReason;
    if (data.energy !== undefined) updateData.energy = data.energy;

    let after;
    if (before) {
      after = await prisma.tcgPlayer.update({ where: { userId }, data: updateData });
    } else {
      // 不存在则建一条记录，把本次变更作为初始化值
      after = await prisma.tcgPlayer.create({
        data: {
          userId,
          tier: data.tier ?? 'iron',
          rating: data.rating ?? 1000,
          banStatus: data.banStatus ?? 'normal',
          banUntil: data.banUntil ? new Date(data.banUntil) : null,
          banReason: data.banReason ?? null,
          energy: data.energy ?? 5,
          energyDate: '',
        },
      });
    }

    await auditLog({
      operatorId: admin.id,
      action: data.banStatus ? `player.${data.banStatus}` : 'player.update',
      targetType: 'player',
      targetId: userId,
      before,
      after,
      note: data.banReason ?? undefined,
      req,
    });

    return ok(after);
  } catch (err) {
    return handleError(err);
  }
}
