import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';

const CACHE_KEY = 'public:announcements';
const CACHE_TTL = 30_000; // 30秒

export async function GET() {
  try {
    const cached = getCache(CACHE_KEY);
    if (cached) return ok(cached);

    const now = new Date();

    const list = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { startAt: null },
          { startAt: { lte: now } },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // 过滤掉已过期的
    const active = list.filter((a) => !a.endAt || new Date(a.endAt) > now);

    setCache(CACHE_KEY, active, CACHE_TTL);
    return ok(active);
  } catch (err) {
    return handleError(err);
  }
}
