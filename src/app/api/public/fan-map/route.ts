import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';
import { getCityDisplayName, getCityLngLat } from '@/data/city-coords';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'public:fan-map';
const CACHE_TTL = 120_000;

interface CityUserPreview {
  name: string;
  avatar: string | null;
}

interface CityAggregate {
  city: string;
  count: number;
  users: CityUserPreview[];
  coord: [number, number] | null;
}

const MUNICIPALITIES = new Set(['北京', '上海', '天津', '重庆']);

function getRegionName(city: string): string {
  const normalized = city.trim();
  const [firstPart] = normalized.split(/\s*[·/,-]\s*/).filter(Boolean);

  if (firstPart && firstPart.length >= 2 && firstPart.length <= 8 && !MUNICIPALITIES.has(normalized)) {
    return firstPart;
  }

  const municipality = Array.from(MUNICIPALITIES).find((name) => normalized.includes(name));
  if (municipality) return municipality;

  return '其他地区';
}

function buildRegions(cities: CityAggregate[]) {
  const regionMap = new Map<string, { name: string; count: number; cityCount: number; topCities: Array<{ city: string; count: number }> }>();

  cities.forEach((city) => {
    const regionName = getRegionName(city.city);
    const current = regionMap.get(regionName) ?? {
      name: regionName,
      count: 0,
      cityCount: 0,
      topCities: [],
    };

    current.count += city.count;
    current.cityCount += 1;
    current.topCities.push({ city: city.city, count: city.count });
    regionMap.set(regionName, current);
  });

  return Array.from(regionMap.values())
    .map((region) => ({
      ...region,
      topCities: region.topCities.sort((a, b) => b.count - a.count).slice(0, 4),
    }))
    .sort((a, b) => b.count - a.count);
}

export async function GET() {
  try {
    const cached = getCache(CACHE_KEY);
    if (cached) return ok(cached);

    const users = await prisma.user.findMany({
      where: { isActive: true, city: { not: null } },
      select: { city: true, name: true, avatar: true },
    });

    const cityMap: Record<string, CityUserPreview[]> = {};
    for (const user of users) {
      if (!user.city) continue;

      const city = getCityDisplayName(user.city.trim());
      if (!city) continue;

      cityMap[city] ??= [];
      cityMap[city].push({ name: user.name, avatar: user.avatar ?? null });
    }

    const cities = Object.entries(cityMap)
      .map<CityAggregate>(([city, cityUsers]) => ({
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
      regions: buildRegions(mappedCities),
      totalFans,
      filledCount,
      mappedCount,
      mappedCityCount: mappedCities.length,
      unmappedCount: filledCount - mappedCount,
      unmappedCities,
      coverageRate: filledCount > 0 ? Math.round((mappedCount / filledCount) * 100) : 0,
      updatedAt: new Date().toISOString(),
    };

    setCache(CACHE_KEY, data, CACHE_TTL);
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}
