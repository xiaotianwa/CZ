import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgOps } from '@/lib/tcg/auth';
import { fail, handleError, ok } from '@/lib/api';

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  question: z.string().trim().min(1, '题目不能为空').max(300, '题目不能超过 300 个字符').optional(),
  options: z.array(z.string().trim().min(1, '选项不能为空')).min(2, '至少需要2个选项').max(6, '最多6个选项').optional(),
  answer: z.number().int().min(0, '答案索引无效').optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

function isMissingTableError(err: unknown) {
  return err instanceof Error && /GameQuizQuestion/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireTcgOps(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const currentRows = await prisma.$queryRaw<Array<{ question: string; options: string; answer: number; isActive: boolean | number; sortOrder: number }>>(Prisma.sql`
      SELECT "question", "options", "answer", "isActive", "sortOrder"
      FROM "GameQuizQuestion"
      WHERE "id" = ${id}
    `);

    if (currentRows.length === 0) return fail('题目不存在', 404);

    const current = currentRows[0];
    const nextOptions = parsed.data.options ?? JSON.parse(currentRows[0].options);
    const nextAnswer = parsed.data.answer ?? current.answer;
    if (nextAnswer >= nextOptions.length) return fail('答案索引超出选项范围');

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "GameQuizQuestion"
      SET
        "question" = ${parsed.data.question ?? current.question},
        "options" = ${JSON.stringify(nextOptions)},
        "answer" = ${nextAnswer},
        "isActive" = ${typeof parsed.data.isActive === 'boolean' ? parsed.data.isActive : current.isActive},
        "sortOrder" = ${typeof parsed.data.sortOrder === 'number' ? parsed.data.sortOrder : current.sortOrder},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `);

    return ok(null, '更新成功');
  } catch (err) {
    if (isMissingTableError(err)) {
      return fail('请先执行数据库迁移后再使用游戏问答管理');
    }
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireTcgOps(req);
    const { id } = await params;
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "GameQuizQuestion"
      WHERE "id" = ${id}
    `);
    return ok(null, '删除成功');
  } catch (err) {
    if (isMissingTableError(err)) {
      return fail('请先执行数据库迁移后再使用游戏问答管理');
    }
    return handleError(err);
  }
}
