import { NextRequest } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgAdmin, requireTcgOps } from '@/lib/tcg/auth';
import { paginated, fail, handleError, getSearchParams, ok } from '@/lib/api';

interface GameQuizQuestionRecord {
  id: string;
  question: string;
  options: string;
  answer: number;
  isActive: boolean | number;
  sortOrder: number;
}

const quizSchema = z.object({
  question: z.string().trim().min(1, '题目不能为空').max(300, '题目不能超过 300 个字符'),
  options: z.array(z.string().trim().min(1, '选项不能为空')).min(2, '至少需要2个选项').max(6, '最多6个选项'),
  answer: z.number().int().min(0, '答案索引无效'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

function isMissingTableError(err: unknown) {
  return err instanceof Error && /GameQuizQuestion/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
}

function normalizeRow(row: GameQuizQuestionRecord) {
  return {
    ...row,
    isActive: typeof row.isActive === 'boolean' ? row.isActive : Boolean(row.isActive),
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireTcgAdmin(req);
    const { page, pageSize } = getSearchParams(req.url);
    const offset = (page - 1) * pageSize;

    const [listRows, totalRows] = await Promise.all([
      prisma.$queryRaw<GameQuizQuestionRecord[]>(Prisma.sql`
        SELECT
          "id",
          "question",
          "options",
          "answer",
          "isActive",
          "sortOrder"
        FROM "GameQuizQuestion"
        ORDER BY "sortOrder" ASC, "createdAt" ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*) as total
        FROM "GameQuizQuestion"
      `),
    ]);

    return paginated(listRows.map(normalizeRow), Number(totalRows[0]?.total ?? 0), page, pageSize);
  } catch (err) {
    if (isMissingTableError(err)) {
      const { page, pageSize } = getSearchParams(req.url);
      return paginated([], 0, page, pageSize);
    }
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireTcgOps(req);
    const body = await req.json();
    const parsed = quizSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { options, ...data } = parsed.data;
    if (data.answer >= options.length) return fail('答案索引超出选项范围');

    const id = crypto.randomUUID();
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "GameQuizQuestion" (
        "id", "question", "options", "answer", "isActive", "sortOrder", "createdAt", "updatedAt"
      ) VALUES (
        ${id},
        ${data.question},
        ${JSON.stringify(options)},
        ${data.answer},
        ${data.isActive},
        ${data.sortOrder},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);

    return ok({ id }, '创建成功');
  } catch (err) {
    if (isMissingTableError(err)) {
      return fail('请先执行数据库迁移后再使用游戏问答管理');
    }
    return handleError(err);
  }
}
