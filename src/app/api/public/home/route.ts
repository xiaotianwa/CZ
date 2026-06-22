import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'public:home';
const CACHE_TTL = 60_000;

export async function GET() {
  try {
    const cached = getCache(CACHE_KEY);
    if (cached) return ok(cached);

    const [slides, totalFans, profileConfigs] = await Promise.all([
      prisma.heroSlide.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.siteConfig.findMany({ where: { group: 'profile' } }),
    ]);

    const profile: Record<string, string> = {};
    for (const c of profileConfigs) {
      profile[c.key] = c.value;
    }

    const data = {
      slides,
      communityStats: { totalFans },
      profile,
    };

    setCache(CACHE_KEY, data, CACHE_TTL);
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}
