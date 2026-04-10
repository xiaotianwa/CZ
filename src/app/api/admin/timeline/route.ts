import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const list = await prisma.timelineEvent.findMany({ orderBy: { sortOrder: 'asc' } });
    return ok(list);
  } catch (err) {
    return handleError(err);
  }
}

const schema = z.object({
  date: z.string().min(1, '日期不能为空'),
  title: z.string().min(1, '标题不能为空'),
  description: z.string().min(1, '描述不能为空'),
  type: z.enum(['debut', 'award', 'release', 'milestone', 'event']),
  sortOrder: z.number().default(0),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const item = await prisma.timelineEvent.create({ data: parsed.data });
    return ok(item, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}
