import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { mergeGameCenterEntries, type GameCenterEntryRecord } from '@/lib/game-center';

export const dynamic = 'force-dynamic';

function isMissingTableError(err: unknown) {
  return err instanceof Error && /GameCenterEntry/i.test(err.message) && /(no such table|no such column|does not exist)/i.test(err.message);
}

export async function GET() {
  try {
    const entries = await prisma.$queryRaw<GameCenterEntryRecord[]>(Prisma.sql`
      SELECT
        "id",
        "entryKey",
        "title",
        "href",
        "subtitle",
        "desc",
        "iconKey",
        "gradient",
        "glowColor",
        "badge",
        "isEnabled",
        "sortOrder"
      FROM "GameCenterEntry"
      ORDER BY "sortOrder" ASC
    `);

    return ok(mergeGameCenterEntries(entries));
  } catch (err) {
    if (isMissingTableError(err)) {
      return ok(mergeGameCenterEntries([]));
    }
    return handleError(err);
  }
}
