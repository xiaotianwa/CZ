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
      select: { city: true, name: true },
    });

    // 按城市聚合统计，同时收集用户名
    const cityMap: Record<string, string[]> = {};
    for (const u of users) {
      if (u.city) {
        const city = u.city.trim();
        if (city) {
          if (!cityMap[city]) cityMap[city] = [];
          cityMap[city].push(u.name);
        }
      }
    }

    // 转为数组，按人数降序
    const cities = Object.entries(cityMap)
      .map(([city, names]) => ({ city, count: names.length, users: names.slice(0, 20) }))
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
