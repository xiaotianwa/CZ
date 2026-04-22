import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

interface TypingSentenceRecord {
  id: string;
  content: string;
  category: string;
}

function isMissingTable(err: unknown) {
  return err instanceof Error && /GameTypingSentence/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
}

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<TypingSentenceRecord[]>(Prisma.sql`
      SELECT "id","content","category"
      FROM "GameTypingSentence"
      WHERE "isActive" = true
      ORDER BY "sortOrder" ASC, "createdAt" ASC
    `);

    return ok(rows);
  } catch (err) {
    if (isMissingTable(err)) return ok([]);
    return handleError(err);
  }
}
