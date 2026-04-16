import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';
import { getCityDisplayName, getCityLngLat } from '@/data/city-coords';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'public:fan-map';
const CACHE_TTL = 120_000; // 2分钟缓存

export async function GET() {
  try {
    const cached = getCache(CACHE_KEY);
    if (cached) return ok(cached);

    const users = await prisma.user.findMany({
      where: { isActive: true, city: { not: null } },
      select: { city: true, name: true, avatar: true },
    });

    // 按城市聚合统计，同时收集用户名
    const cityMap: Record<string, Array<{ name: string; avatar: string | null }>> = {};
    for (const u of users) {
      if (u.city) {
        const city = getCityDisplayName(u.city.trim());
        if (city) {
          if (!cityMap[city]) cityMap[city] = [];
          cityMap[city].push({ name: u.name, avatar: u.avatar ?? null });
        }
      }
    }

    // 转为数组，附带坐标，按人数降序
    const cities = Object.entries(cityMap)
      .map(([city, cityUsers]) => ({
        city,
        count: cityUsers.length,
        users: cityUsers.slice(0, 20),
        coord: getCityLngLat(city),
      }))
      .sort((a, b) => b.count - a.count);

    const mappedCities = cities.filter((item) => item.coord !== null);

    const mappedCount = mappedCities.reduce((sum, item) => sum + item.count, 0);

    const unmappedCities = cities
      .filter((item) => item.coord === null)
      .map(({ city, count }) => ({ city, count }))
      .slice(0, 12);

    const totalFans = await prisma.user.count({ where: { isActive: true } });
    const filledCount = users.length;

    const data = {
      cities,
      totalFans,
      filledCount,
      mappedCount,
      mappedCityCount: mappedCities.length,
      unmappedCount: filledCount - mappedCount,
      unmappedCities,
      coverageRate: filledCount > 0 ? Math.round((mappedCount / filledCount) * 100) : 0,
    };
    setCache(CACHE_KEY, data, CACHE_TTL);
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}
