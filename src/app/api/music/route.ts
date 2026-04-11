import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';

const CACHE_KEY = 'public:music';
const CACHE_TTL = 5 * 60_000; // 5分钟

export async function GET() {
  try {
    const cached = getCache(CACHE_KEY);
    if (cached) {
      console.log('[Music API] 返回缓存数据, 条数:', (cached as unknown[]).length);
      return ok(cached);
    }

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

    console.log('[Music API] 数据库查询结果, 条数:', tracks.length, tracks.length > 0 ? '第一条:' + tracks[0].title : '(空)');

    setCache(CACHE_KEY, tracks, CACHE_TTL);
    return ok(tracks);
  } catch (err) {
    console.error('[Music API] 查询出错:', err);
    return handleError(err);
  }
}
