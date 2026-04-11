import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { grantPoints } from '@/lib/points';
import { notifyLike } from '@/lib/notification';

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const { postId } = params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, likes: true, authorId: true },
    });

    if (!post) {
      return fail('帖子不存在', 404);
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        likes: post.likes + 1,
      },
    });

    // 被点赞积分 +2（给帖子作者，不给自己点赞）
    if (post.authorId !== payload.id) {
      grantPoints(post.authorId, 'be_liked', '帖子被点赞').catch(() => {});
      notifyLike(
        post.authorId,
        { id: payload.id, name: payload.email.split('@')[0], avatar: null },
        postId,
      ).catch(() => {});
    }

    return ok({ likes: updatedPost.likes }, '点赞成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const { postId } = params;

    // 检查帖子是否存在
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return fail('帖子不存在', 404);
    }

    // 取消点赞
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        likes: Math.max(0, post.likes - 1),
      },
    });

    return ok({ likes: updatedPost.likes }, '取消点赞成功');
  } catch (err) {
    return handleError(err);
  }
}
