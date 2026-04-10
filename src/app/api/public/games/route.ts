import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const games = await prisma.game.findMany({ orderBy: { sortOrder: 'asc' } });
    return ok(games);
  } catch (err) {
    return handleError(err);
  }
}
