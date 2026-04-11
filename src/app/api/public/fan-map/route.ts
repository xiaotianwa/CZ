import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'public:fan-map';
const CACHE_TTL = 120_000; // 2分钟缓存

export async function GET() {
  try {
    const cached = getCache(CACHE_KEY);
    if (cached) return ok(cached);

    const users = await prisma.user.findMany({
      where: { isActive: true, city: { not: null } },
      select: { city: true },
    });

    // 按城市聚合统计
    const cityMap: Record<string, number> = {};
    for (const u of users) {
      if (u.city) {
        const city = u.city.trim();
        if (city) {
          cityMap[city] = (cityMap[city] || 0) + 1;
        }
      }
    }

    // 转为数组，按人数降序
    const cities = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    const totalFans = await prisma.user.count({ where: { isActive: true } });
    const filledCount = users.length;

    const data = { cities, totalFans, filledCount };
    setCache(CACHE_KEY, data, CACHE_TTL);
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}
