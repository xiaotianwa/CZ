import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

// GET — 获取当前用户的收藏列表
export async function GET(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) return fail('未登录', 401);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 20));

    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId: payload.id },
        include: {
          post: {
            include: {
              author: { select: { id: true, name: true, avatar: true, role: true, level: true, badge: true } },
              postTags: { select: { tag: { select: { id: true, name: true, color: true } } } },
              _count: { select: { comments: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bookmark.count({ where: { userId: payload.id } }),
    ]);

    return ok({
      list: bookmarks,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return handleError(err);
  }
}
