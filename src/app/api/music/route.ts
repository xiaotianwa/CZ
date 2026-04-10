import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';

const CACHE_KEY = 'public:music';
const CACHE_TTL = 5 * 60_000; // 5分钟

export async function GET() {
  try {
    const cached = getCache(CACHE_KEY);
    if (cached) return ok(cached);

    const tracks = await prisma.musicTrack.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        artist: true,
        src: true,
        cover: true,
        duration: true,
      },
    });

    setCache(CACHE_KEY, tracks, CACHE_TTL);
    return ok(tracks);
  } catch (err) {
    return handleError(err);
  }
}
