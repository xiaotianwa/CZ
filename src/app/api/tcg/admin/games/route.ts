import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgAdmin, requireTcgOps } from '@/lib/tcg/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';

 function isMissingProjectGameProfileTable(err: unknown) {
  return err instanceof Error && /ProjectGameProfile/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
 }

export async function GET(req: NextRequest) {
  try {
    await requireTcgAdmin(req);
    const { page, pageSize, status } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.projectGameProfile.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.projectGameProfile.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    if (isMissingProjectGameProfileTable(err)) {
      const { page, pageSize } = getSearchParams(req.url);
      return paginated([], 0, page, pageSize);
    }
    return handleError(err);
  }
}

const gameSchema = z.object({
  name: z.string().min(1, '游戏名不能为空'),
  cover: z.string().min(1, '封面不能为空'),
  platform: z.string().min(1, '平台不能为空'),
  genre: z.string().min(1, '类型不能为空'),
  status: z.enum(['playing', 'recent', 'favorite']).default('playing'),
  lastPlayed: z.string().default(''),
  hours: z.number().default(0),
  rating: z.number().min(1).max(5).default(5),
  comment: z.string().default(''),
  description: z.string().default(''),
  downloadLinks: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
  sortOrder: z.number().default(0),
});

export async function POST(req: NextRequest) {
  try {
    await requireTcgOps(req);
    const body = await req.json();
    const parsed = gameSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { downloadLinks, ...data } = parsed.data;
    const game = await prisma.projectGameProfile.create({
      data: { ...data, downloadLinks: JSON.stringify(downloadLinks) },
    });
    return ok(game, '创建成功');
  } catch (err) {
    if (isMissingProjectGameProfileTable(err)) return fail('请先执行数据库迁移');
    return handleError(err);
  }
}
