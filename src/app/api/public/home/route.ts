import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'public:home';
const CACHE_TTL = 60_000; // 60秒缓存，平衡实时性与性能

export async function GET() {
  try {
    // 命中缓存直接返回
    const cached = getCache(CACHE_KEY);
    if (cached) return ok(cached);

    const [slides, posts, events, stats, profileConfigs] = await Promise.all([
      prisma.heroSlide.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.post.findMany({
        where: { status: 'published' },
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true } },
          postTags: { include: { tag: { select: { name: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 4,
      }),
      prisma.event.findMany({
        where: { isActive: true },
        orderBy: { startTime: 'desc' },
        take: 3,
      }),
      Promise.all([
        prisma.user.count(),
        prisma.post.count({ where: { status: 'published' } }),
      ]),
      prisma.siteConfig.findMany({ where: { group: 'profile' } }),
    ]);

    const profile: Record<string, string> = {};
    for (const c of profileConfigs) {
      profile[c.key] = c.value;
    }

    const data = {
      slides,
      posts,
      events,
      communityStats: {
        totalFans: stats[0],
        totalPosts: stats[1],
      },
      profile,
    };

    setCache(CACHE_KEY, data, CACHE_TTL);
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}
