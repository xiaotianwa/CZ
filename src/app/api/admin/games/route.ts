import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize, status } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.game.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const gameSchema = z.object({
  name: z.string().min(1, '游戏名不能为空'),
  cover: z.string().min(1, '封面不能为空'),
  platform: z.string().min(1),
  genre: z.string().min(1),
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
    await requireAdmin(req);
    const body = await req.json();
    const parsed = gameSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { downloadLinks, ...data } = parsed.data;
    const game = await prisma.game.create({
      data: { ...data, downloadLinks: JSON.stringify(downloadLinks) },
    });
    return ok(game, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}
