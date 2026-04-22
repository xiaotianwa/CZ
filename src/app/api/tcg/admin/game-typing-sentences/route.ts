import { NextRequest } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireTcgAdmin, requireTcgOps } from '@/lib/tcg/auth';
import { paginated, fail, handleError, getSearchParams, ok } from '@/lib/api';

interface TypingSentenceRecord {
  id: string;
  content: string;
  category: string;
  isActive: boolean | number;
  sortOrder: number;
}

const sentenceSchema = z.object({
  content: z.string().trim().min(1, '内容不能为空').max(100, '内容不能超过100字'),
  category: z.string().trim().min(1).max(20).default('弹幕'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

function isMissingTable(err: unknown) {
  return err instanceof Error && /GameTypingSentence/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
}

function normalizeRow(row: TypingSentenceRecord) {
  return { ...row, isActive: typeof row.isActive === 'boolean' ? row.isActive : Boolean(row.isActive) };
}

export async function GET(req: NextRequest) {
  try {
    await requireTcgAdmin(req);
    const { page, pageSize } = getSearchParams(req.url);
    const offset = (page - 1) * pageSize;

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<TypingSentenceRecord[]>(Prisma.sql`
        SELECT "id","content","category","isActive","sortOrder"
        FROM "GameTypingSentence"
        ORDER BY "sortOrder" ASC, "createdAt" ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`SELECT COUNT(*) as total FROM "GameTypingSentence"`),
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
    const parsed = sentenceSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const id = crypto.randomUUID();
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "GameTypingSentence" ("id","content","category","isActive","sortOrder","createdAt","updatedAt")
      VALUES (${id}, ${parsed.data.content}, ${parsed.data.category}, ${parsed.data.isActive}, ${parsed.data.sortOrder}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    return ok({ id }, '创建成功');
  } catch (err) {
    if (isMissingTable(err)) return fail('请先执行数据库迁移');
    return handleError(err);
  }
}
