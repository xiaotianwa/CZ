import { NextRequest } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgOps } from '@/lib/tcg/auth';
import { fail, handleError, ok } from '@/lib/api';

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  content: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(20).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

function isMissingTable(err: unknown) {
  return err instanceof Error && /GameTypingSentence/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireTcgOps(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const currentRows = await prisma.$queryRaw<Array<{ content: string; category: string; isActive: boolean | number; sortOrder: number }>>(
      Prisma.sql`SELECT "content","category","isActive","sortOrder" FROM "GameTypingSentence" WHERE "id" = ${id}`
    );
    if (currentRows.length === 0) return fail('词条不存在', 404);

    const c = currentRows[0];
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "GameTypingSentence" SET
        "content" = ${parsed.data.content ?? c.content},
        "category" = ${parsed.data.category ?? c.category},
        "isActive" = ${typeof parsed.data.isActive === 'boolean' ? parsed.data.isActive : c.isActive},
        "sortOrder" = ${typeof parsed.data.sortOrder === 'number' ? parsed.data.sortOrder : c.sortOrder},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `);
    return ok(null, '更新成功');
  } catch (err) {
    if (isMissingTable(err)) return fail('请先执行数据库迁移');
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireTcgOps(req);
    const { id } = await params;
    await prisma.$executeRaw(Prisma.sql`DELETE FROM "GameTypingSentence" WHERE "id" = ${id}`);
    return ok(null, '删除成功');
  } catch (err) {
    if (isMissingTable(err)) return fail('请先执行数据库迁移');
    return handleError(err);
  }
}
