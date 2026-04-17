import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';
import { sanitizeImageUrl } from '@/lib/weibo/fetcher';

const CACHE_TTL = 60_000; // 1 分钟（Cron 每 3 分钟抓一次，展示层缓存无需太长）

interface PublicWeiboItem {
  id: string;
  mid: string;
  bid: string | null;
  uid: string;
  screenName: string;
  avatar: string | null;
  text: string;
  images: string[];
  videoUrl: string | null;
  videoCover: string | null;
  source: string | null;
  sourceUrl: string;
  repostCount: number;
  commentCount: number;
  likeCount: number;
  publishedAt: string;
}

/** GET /api/public/weibo —— 前台展示（分页，仅 isVisible=true） */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(20, Math.max(1, Number(url.searchParams.get('pageSize')) || 10));

    const cacheKey = `public:weibo:p${page}:s${pageSize}`;
    const cached = getCache<{
      list: PublicWeiboItem[];
      pagination: { total: number; page: number; pageSize: number; totalPages: number };
    }>(cacheKey);
    if (cached) {
      return Response.json({ code: 0, message: 'success', data: cached });
    }

    const [raw, total] = await Promise.all([
      prisma.weiboPost.findMany({
        where: { isVisible: true },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.weiboPost.count({ where: { isVisible: true } }),
    ]);

    const list: PublicWeiboItem[] = raw.map((item) => ({
      id: item.id,
      mid: item.mid,
      bid: item.bid,
      uid: item.uid,
      screenName: item.screenName,
      // 兼容已入库的带时效签名的旧 URL
      avatar: sanitizeImageUrl(item.avatar),
      text: item.text,
      images: safeJsonParse<string[]>(item.images, [])
        .map((u) => sanitizeImageUrl(u))
        .filter((u): u is string => !!u),
      videoUrl: sanitizeImageUrl(item.videoUrl),
      videoCover: sanitizeImageUrl(item.videoCover),
      source: item.source,
      sourceUrl: item.sourceUrl,
      repostCount: item.repostCount,
      commentCount: item.commentCount,
      likeCount: item.likeCount,
      publishedAt: item.publishedAt.toISOString(),
    }));

    const data = {
      list,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
    setCache(cacheKey, data, CACHE_TTL);
    return Response.json({ code: 0, message: 'success', data });
  } catch (err) {
    return handleError(err);
  }
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
