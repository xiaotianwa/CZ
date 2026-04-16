import { ok, fail } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'public:world-map';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const WORLD_MAP_SOURCES = [
  'https://fastly.jsdelivr.net/npm/echarts@5/map/json/world.json',
  'https://cdn.jsdelivr.net/npm/echarts@5/map/json/world.json',
  'https://unpkg.com/echarts@5/map/json/world.json',
  'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json',
  'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',
];

type GeoJsonLike = {
  features?: unknown[];
  geometries?: unknown[];
};

function isGeoJsonLike(value: unknown): value is GeoJsonLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const geoJson = value as GeoJsonLike;
  return Array.isArray(geoJson.features) || Array.isArray(geoJson.geometries);
}

async function fetchGeoJson(url: string): Promise<GeoJsonLike> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`world-map-source-${response.status}`);
    }

    const geoJson: unknown = await response.json();
    if (!isGeoJsonLike(geoJson)) {
      throw new Error('world-map-invalid-geojson');
    }

    return geoJson;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const cached = getCache<GeoJsonLike>(CACHE_KEY);
  if (cached) {
    return ok(cached);
  }

  for (const source of WORLD_MAP_SOURCES) {
    try {
      const geoJson = await fetchGeoJson(source);
      setCache(CACHE_KEY, geoJson, CACHE_TTL);
      return ok(geoJson);
    } catch {}
  }

  return fail('世界地图资源加载失败', 502);
}
