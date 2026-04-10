import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const albums = await prisma.album.findMany({
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return ok(albums);
  } catch (err) {
    return handleError(err);
  }
}
