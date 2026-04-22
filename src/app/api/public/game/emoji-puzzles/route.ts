import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

interface EmojiPuzzleRecord {
  id: string;
  emoji: string;
  answer: string;
  hints: string;
  category: string;
}

function isMissingTable(err: unknown) {
  return err instanceof Error && /GameEmojiPuzzle/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
}

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<EmojiPuzzleRecord[]>(Prisma.sql`
      SELECT "id","emoji","answer","hints","category"
      FROM "GameEmojiPuzzle"
      WHERE "isActive" = true
      ORDER BY "sortOrder" ASC, "createdAt" ASC
    `);

    const puzzles = rows.map((r) => ({
      id: r.id,
      emoji: r.emoji,
      answer: r.answer,
      hints: typeof r.hints === 'string' ? JSON.parse(r.hints) : r.hints,
      category: r.category,
    }));

    return ok(puzzles);
  } catch (err) {
    if (isMissingTable(err)) return ok([]);
    return handleError(err);
  }
}
