import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';

// GET — 获取投票周期列表
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize } = getSearchParams(req.url);

    const [list, total] = await Promise.all([
      prisma.fanWorkVotePeriod.findMany({
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { votes: true } } },
      }),
      prisma.fanWorkVotePeriod.count(),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const periodSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  startAt: z.string().transform((s) => new Date(s)),
  endAt: z.string().transform((s) => new Date(s)),
  isActive: z.boolean().default(true),
});

// POST — 创建投票周期
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = periodSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    if (parsed.data.endAt <= parsed.data.startAt) {
      return fail('结束时间必须晚于开始时间');
    }

    const period = await prisma.fanWorkVotePeriod.create({ data: parsed.data });
    return ok(period, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}

// PUT — 更新投票周期
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return fail('缺少ID');

    const parsed = periodSchema.partial().safeParse(rest);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const period = await prisma.fanWorkVotePeriod.update({
      where: { id },
      data: parsed.data,
    });
    return ok(period, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

// DELETE — 删除投票周期（级联删除投票记录）
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return fail('缺少ID');

    await prisma.fanWorkVotePeriod.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
