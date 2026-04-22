import { NextRequest } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgAdmin, requireTcgOps } from '@/lib/tcg/auth';
import { paginated, fail, handleError, getSearchParams, ok } from '@/lib/api';

interface EmojiPuzzleRecord {
  id: string;
  emoji: string;
  answer: string;
  hints: string;
  category: string;
  isActive: boolean | number;
  sortOrder: number;
}

const puzzleSchema = z.object({
  emoji: z.string().trim().min(1, 'emoji 不能为空').max(50),
  answer: z.string().trim().min(1, '答案不能为空').max(20),
  hints: z.array(z.string().trim().min(1)).min(1, '至少需要1个提示').max(5),
  category: z.string().trim().min(1).max(20).default('日常'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

function isMissingTable(err: unknown) {
  return err instanceof Error && /GameEmojiPuzzle/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
}

function normalizeRow(row: EmojiPuzzleRecord) {
  return { ...row, isActive: typeof row.isActive === 'boolean' ? row.isActive : Boolean(row.isActive) };
}

export async function GET(req: NextRequest) {
  try {
    await requireTcgAdmin(req);
    const { page, pageSize } = getSearchParams(req.url);
    const offset = (page - 1) * pageSize;

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<EmojiPuzzleRecord[]>(Prisma.sql`
        SELECT "id","emoji","answer","hints","category","isActive","sortOrder"
        FROM "GameEmojiPuzzle"
        ORDER BY "sortOrder" ASC, "createdAt" ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`SELECT COUNT(*) as total FROM "GameEmojiPuzzle"`),
    ]);

    return paginated(rows.map(normalizeRow), Number(totalRows[0]?.total ?? 0), page, pageSize);
  } catch (err) {
    if (isMissingTable(err)) {
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
    const parsed = puzzleSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { hints, ...data } = parsed.data;
    const id = crypto.randomUUID();
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "GameEmojiPuzzle" ("id","emoji","answer","hints","category","isActive","sortOrder","createdAt","updatedAt")
      VALUES (${id}, ${data.emoji}, ${data.answer}, ${JSON.stringify(hints)}, ${data.category}, ${data.isActive}, ${data.sortOrder}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    return ok({ id }, '创建成功');
  } catch (err) {
    if (isMissingTable(err)) return fail('请先执行数据库迁移');
    return handleError(err);
  }
}
