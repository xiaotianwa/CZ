import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgOps } from '@/lib/tcg/auth';
import { ok, fail, handleError } from '@/lib/api';

type RouteParams = { params: Promise<{ id: string }> };

 function isMissingProjectGameProfileTable(err: unknown) {
  return err instanceof Error && /ProjectGameProfile/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
 }

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireTcgOps(req);
    const { id } = await params;
    const body = await req.json();

    const schema = z.object({
      name: z.string().optional(),
      cover: z.string().optional(),
      platform: z.string().optional(),
      genre: z.string().optional(),
      status: z.enum(['playing', 'recent', 'favorite']).optional(),
      lastPlayed: z.string().optional(),
      hours: z.number().optional(),
      rating: z.number().min(1).max(5).optional(),
      comment: z.string().optional(),
      description: z.string().optional(),
      downloadLinks: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
      sortOrder: z.number().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { downloadLinks, ...data } = parsed.data;
    const updateData: Record<string, unknown> = { ...data };
    if (downloadLinks) updateData.downloadLinks = JSON.stringify(downloadLinks);

    const game = await prisma.projectGameProfile.update({ where: { id }, data: updateData });
    return ok(game, '更新成功');
  } catch (err) {
    if (isMissingProjectGameProfileTable(err)) return fail('请先执行数据库迁移');
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireTcgOps(req);
    const { id } = await params;
    await prisma.projectGameProfile.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    if (isMissingProjectGameProfileTable(err)) return fail('请先执行数据库迁移');
    return handleError(err);
  }
}
