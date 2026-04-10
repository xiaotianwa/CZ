import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, handleError } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      userCount, postCount, commentCount, eventCount,
      albumCount, gameCount, mediaCount, photoCount,
      feedbackCount, pendingFeedbacks,
      todayPosts, todayUsers, todayComments,
      recentPosts, recentFeedbacks,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.event.count(),
      prisma.album.count(),
      prisma.game.count(),
      prisma.media.count(),
      prisma.photo.count(),
      prisma.feedback.count(),
      prisma.feedback.count({ where: { status: 'pending' } }),
      prisma.post.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.comment.count({ where: { createdAt: { gte: today } } }),
      prisma.post.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, content: true, createdAt: true, author: { select: { name: true } } },
      }),
      prisma.feedback.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, content: true, status: true, createdAt: true, user: { select: { name: true } } },
      }),
    ]);

    return ok({
      users: userCount,
      posts: postCount,
      comments: commentCount,
      events: eventCount,
      albums: albumCount,
      games: gameCount,
      media: mediaCount,
      photos: photoCount,
      feedbacks: feedbackCount,
      pendingFeedbacks,
      todayPosts,
      todayUsers,
      todayComments,
      recentPosts,
      recentFeedbacks,
    });
  } catch (err) {
    return handleError(err);
  }
}
