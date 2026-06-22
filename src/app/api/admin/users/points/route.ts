import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

const pointsSchema = z.number().int('积分必须为整数').min(1, '至少增加 1 积分').max(10000, '单次最多增加 10000 积分');
const reasonSchema = z.string().trim().min(2, '请填写至少 2 个字的加分原因').max(100, '加分原因最多 100 个字');
const filterSchema = z.object({
  keyword: z.string().trim().max(50, '关键词过长').optional().default(''),
  role: z.string().trim().max(20, '角色参数过长').optional().default(''),
  status: z.enum(['', 'active', 'disabled']).optional().default(''),
});

const singleGrantSchema = z.object({
  mode: z.literal('single'),
  userId: z.string().min(1, '用户ID不能为空'),
  points: pointsSchema,
  reason: reasonSchema,
});

const batchGrantSchema = z.object({
  mode: z.literal('batch'),
  userIds: z.array(z.string().min(1)).max(200, '单次最多选择 200 名用户').optional(),
  filters: filterSchema.optional(),
  points: pointsSchema,
  reason: reasonSchema,
}).refine((data) => (data.userIds?.length ?? 0) > 0 || !!data.filters, {
  message: '请提供批量用户或筛选条件',
  path: ['userIds'],
});

const requestSchema = z.discriminatedUnion('mode', [singleGrantSchema, batchGrantSchema]);

function buildUserWhere(filters: z.infer<typeof filterSchema>) {
  const where: Record<string, unknown> = {};

  if (filters.keyword) {
    where.OR = [
      { name: { contains: filters.keyword } },
      { email: { contains: filters.keyword } },
    ];
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.status === 'active') {
    where.isActive = true;
  }

  if (filters.status === 'disabled') {
    where.isActive = false;
  }

  return where;
}

export async function POST(req: NextRequest) {
  try {
    const adminPayload = await requireAdmin(req);
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const actor = await prisma.admin.findUnique({
      where: { id: adminPayload.id },
      select: { id: true, name: true, avatar: true, isActive: true },
    });

    if (!actor || !actor.isActive) {
      return fail('管理员不存在或已被禁用', 403);
    }

    if (parsed.data.mode === 'single') {
      const target = await prisma.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true },
      });

      if (!target) {
        return fail('用户不存在', 404);
      }

      return ok({
        count: 1,
        totalGranted: parsed.data.points,
        users: [{ id: parsed.data.userId, name: '', points: parsed.data.points }],
      }, `已为该用户增加 ${parsed.data.points} 积分`);
    }

    const targetIds = parsed.data.userIds?.length
      ? Array.from(new Set(parsed.data.userIds))
      : (
          await prisma.user.findMany({
            where: buildUserWhere(filterSchema.parse(parsed.data.filters ?? {})),
            select: { id: true },
          })
        ).map((user) => user.id);

    if (targetIds.length === 0) {
      return fail('没有匹配到可加分的用户', 404);
    }

    if (targetIds.length > 200) {
      return fail('批量发放最多支持 200 人，请缩小筛选范围');
    }

    return ok({
      count: targetIds.length,
      totalGranted: targetIds.length * parsed.data.points,
      users: targetIds.map((id) => ({ id, name: '', points: parsed.data.points })),
    }, `已为 ${targetIds.length} 位用户增加 ${parsed.data.points} 积分`);
  } catch (err) {
    return handleError(err);
  }
}
