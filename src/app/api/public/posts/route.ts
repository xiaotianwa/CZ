import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { handleError, getSearchParams } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

const postInclude = {
  author: { select: { id: true, name: true, avatar: true, role: true, level: true, badge: true } },
  postTags: { include: { tag: { select: { id: true, name: true } } } },
  _count: { select: { comments: true } },
};

type PostListItem = Prisma.PostGetPayload<{ include: typeof postInclude }>;

async function getFallbackHotPosts(excludeIds: string[]): Promise<PostListItem[]> {
  return prisma.post.findMany({
    where: {
      status: 'published',
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    include: postInclude,
    orderBy: [{ isPinned: 'desc' }, { hotScore: 'desc' }, { createdAt: 'desc' }],
    take: 6,
  });
}

async function getRecommendedPosts(req: NextRequest, excludeIds: string[]): Promise<PostListItem[]> {
  const payload = await getCurrentUser(req);
  if (!payload) return getFallbackHotPosts(excludeIds);

  const [liked, commented] = await Promise.all([
    prisma.postLike.findMany({
      where: { userId: payload.id },
      select: { post: { select: { postTags: { select: { tagId: true } } } } },
      take: 120,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.comment.findMany({
      where: { authorId: payload.id },
      select: { post: { select: { postTags: { select: { tagId: true } } } } },
      take: 120,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const tagWeight = new Map<string, number>();
  liked.forEach((item) => {
    item.post.postTags.forEach((pt) => {
      tagWeight.set(pt.tagId, (tagWeight.get(pt.tagId) ?? 0) + 3);
    });
  });
  commented.forEach((item) => {
    item.post.postTags.forEach((pt) => {
      tagWeight.set(pt.tagId, (tagWeight.get(pt.tagId) ?? 0) + 2);
    });
  });

  const preferredTagIds = Array.from(tagWeight.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tagId]) => tagId);

  if (preferredTagIds.length === 0) {
    return getFallbackHotPosts(excludeIds);
  }

  const personalized = await prisma.post.findMany({
    where: {
      status: 'published',
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      postTags: { some: { tagId: { in: preferredTagIds } } },
    },
    include: postInclude,
    orderBy: [{ isPinned: 'desc' }, { hotScore: 'desc' }, { createdAt: 'desc' }],
    take: 6,
  });

  if (personalized.length >= 6) {
    return personalized;
  }

  const fillExcludeIds = [...excludeIds, ...personalized.map((post) => post.id)];
  const fallback = await getFallbackHotPosts(fillExcludeIds);
  return [...personalized, ...fallback].slice(0, 6);
}

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize } = getSearchParams(req.url);
    const url = new URL(req.url);
    const tagId = url.searchParams.get('tagId') || '';
    const authorId = url.searchParams.get('authorId') || '';
    const keyword = (url.searchParams.get('keyword') || '').trim();
    const sort = url.searchParams.get('sort') || 'new'; // hot | new
    const withRecommend = url.searchParams.get('withRecommend') === '1';

    const where: Prisma.PostWhereInput = { status: 'published' };
    if (tagId) {
      where.postTags = { some: { tagId } };
    }
    if (authorId) {
      where.authorId = authorId;
    }
    if (keyword) {
      where.OR = [
        { content: { contains: keyword } },
        { author: { name: { contains: keyword } } },
        { postTags: { some: { tag: { name: { contains: keyword } } } } },
      ];
    }

    const [total, list, authors] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        include: postInclude,
        orderBy: sort === 'hot'
          ? [{ isPinned: 'desc' as const }, { hotScore: 'desc' as const }]
          : [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.findMany({
        where: { isActive: true, posts: { some: { status: 'published' } } },
        select: { id: true, name: true },
        orderBy: [{ points: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      }),
    ]);

    const recommendations = withRecommend
      ? await getRecommendedPosts(req, list.map((post) => post.id))
      : [];

    const res = NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        list,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        authors,
        recommendations,
      },
    });
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    return res;
  } catch (err) {
    return handleError(err);
  }
}
