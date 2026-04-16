import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const memes = await prisma.meme.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { popularity: 'desc' }],
    });
    return ok(memes);
  } catch (err) {
    return handleError(err);
  }
}
