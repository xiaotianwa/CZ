import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize, status } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.event.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const eventSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  description: z.string().min(1, '描述不能为空'),
  cover: z.string().min(1, '封面不能为空'),
  startTime: z.string().transform((s) => new Date(s)),
  endTime: z.string().transform((s) => new Date(s)),
  location: z.string().min(1, '地点不能为空'),
  status: z.enum(['upcoming', 'ongoing', 'ended']).default('upcoming'),
  participants: z.number().default(0),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const event = await prisma.event.create({ data: parsed.data });
    invalidateCache('public:home');
    return ok(event, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}
