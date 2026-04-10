import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { extractProfile, getAutoStats } from '@/lib/site-data';
import { getCache, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'public:config';
const CACHE_TTL = 5 * 60_000; // 5分钟，站点配置变化极少

export async function GET() {
  try {
    const cached = getCache(CACHE_KEY);
    if (cached) return ok(cached);

    const configs = await prisma.siteConfig.findMany();
    const cfg: Record<string, string> = {};
    for (const c of configs) {
      cfg[c.key] = c.value;
    }

    const data = {
      siteName: cfg.site_name || '1103社区',
      siteDescription: cfg.site_description || '',
      profile: extractProfile(cfg),
      communityStats: await getAutoStats(),
    };

    setCache(CACHE_KEY, data, CACHE_TTL);
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}
