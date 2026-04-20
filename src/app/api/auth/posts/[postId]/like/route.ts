import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { grantPoints } from '@/lib/points';
import { notifyLike } from '@/lib/notification';
import { updatePostHotScore } from '@/lib/hot-score';

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const { postId } = params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return fail('帖子不存在', 404);
    }

    // 原子操作：点赞计数 +1，同时创建点赞记录
    // 依赖 unique 约束 (userId, postId) 防止重复，catch 处理并发冲突
    let updatedPost;
    try {
      [updatedPost] = await prisma.$transaction([
        prisma.post.update({
          where: { id: postId },
          data: { likes: { increment: 1 } },
        }),
        prisma.postLike.create({
          data: { userId: payload.id, postId },
        }),
      ]);
    } catch (err: unknown) {
      // Prisma unique constraint violation = P2002
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
        return fail('你已经点过赞了');
      }
      throw err;
    }

    // 被点赞积分 +2（给帖子作者，不给自己点赞）
    if (post.authorId !== payload.id) {
      grantPoints(post.authorId, 'be_liked', '帖子被点赞').catch(() => {});
      // 查询真实用户名用于通知
      prisma.user.findUnique({
        where: { id: payload.id },
        select: { name: true, avatar: true },
      }).then((u) => {
        notifyLike(
          post.authorId,
          { id: payload.id, name: u?.name || '用户', avatar: u?.avatar || null },
          postId,
        );
      }).catch(() => {});
    }

    // 异步刷新热度分
    updatePostHotScore(postId).catch(() => {});

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

    // 检查点赞记录是否存在
    const existingLike = await prisma.postLike.findUnique({
      where: { userId_postId: { userId: payload.id, postId } },
    });

    if (!existingLike) {
      return fail('你还没有点过赞');
    }

    // 原子操作：取消点赞计数 -1，同时删除点赞记录
    const [updatedPost] = await prisma.$transaction([
      prisma.post.update({
        where: { id: postId },
        data: { likes: { decrement: 1 } },
      }),
      prisma.postLike.delete({
        where: { userId_postId: { userId: payload.id, postId } },
      }),
    ]);

    // 异步刷新热度分
    updatePostHotScore(postId).catch(() => {});

    return ok({ likes: Math.max(0, updatedPost.likes) }, '取消点赞成功');
  } catch (err) {
    return handleError(err);
  }
}
