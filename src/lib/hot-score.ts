import { prisma } from './db';

/**
 * 热门排序算法（Hacker News 风格 + 基础分）
 * score = (baseScore + likes * 3 + comments * 5) / (hoursSincePost + 2) ^ 1.2
 * baseScore = 10，保证新帖在热门列表有初始曝光
 * 置顶帖在查询时通过 orderBy isPinned desc 保证优先
 */
export function calcHotScore(likes: number, comments: number, createdAt: Date): number {
  const hoursSincePost = (Date.now() - createdAt.getTime()) / 3600000;
  const engagement = 10 + likes * 3 + comments * 5;
  return engagement / Math.pow(hoursSincePost + 2, 1.2);
}

/**
 * 更新单个帖子的 hotScore
 */
export async function updatePostHotScore(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { likes: true, createdAt: true, _count: { select: { comments: true } } },
  });
  if (!post) return;
  const score = calcHotScore(post.likes, post._count.comments, post.createdAt);
  await prisma.post.update({ where: { id: postId }, data: { hotScore: score } });
}

/**
 * 批量刷新所有已发布帖子的 hotScore（定时任务调用）
 * 分批处理，每批 200 条
 */
export async function refreshAllHotScores() {
  const batchSize = 200;
  let cursor: string | undefined;
  let updated = 0;

  while (true) {
    const posts = await prisma.post.findMany({
      where: { status: 'published' },
      select: { id: true, likes: true, createdAt: true, _count: { select: { comments: true } } },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });

    if (posts.length === 0) break;

    const updates = posts.map((p) => {
      const score = calcHotScore(p.likes, p._count.comments, p.createdAt);
      return prisma.post.update({ where: { id: p.id }, data: { hotScore: score } });
    });

    await prisma.$transaction(updates);
    updated += posts.length;
    cursor = posts[posts.length - 1].id;

    if (posts.length < batchSize) break;
  }

  return updated;
}
