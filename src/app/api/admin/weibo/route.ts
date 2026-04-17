import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, handleError, getSearchParams } from '@/lib/api';
import { syncWeibo, getSyncStatus } from '@/lib/weibo/sync';
import { invalidateCache } from '@/lib/cache';
import { sanitizeImageUrl } from '@/lib/weibo/fetcher';

/** GET /api/admin/weibo —— 后台分页列表（含隐藏条目 + 统计 + 同步状态） */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize } = getSearchParams(req.url);

    const [rawList, total, visibleCount] = await Promise.all([
      prisma.weiboPost.findMany({
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.weiboPost.count(),
      prisma.weiboPost.count({ where: { isVisible: true } }),
    ]);

    const list = rawList.map((item) => ({
      ...item,
      // 兼容已入库的带时效签名的旧 URL
      avatar: sanitizeImageUrl(item.avatar),
      videoUrl: sanitizeImageUrl(item.videoUrl),
      videoCover: sanitizeImageUrl(item.videoCover),
      images: safeJsonParse<string[]>(item.images, [])
        .map((u) => sanitizeImageUrl(u))
        .filter((u): u is string => !!u),
    }));

    return ok({
      list,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        total,
        visibleCount,
        hiddenCount: total - visibleCount,
      },
      syncStatus: getSyncStatus(),
    });
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/admin/weibo —— 手动触发一次同步 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const result = await syncWeibo();
    if (result.inserted > 0) {
      invalidateCache('public:weibo');
    }
    return ok(result, result.success ? '同步完成' : '同步失败');
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
