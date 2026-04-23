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

    // 被点赞积分（给帖子作者，不给自己点赞）
    // 幂等策略：同一 (authorId, postId, fromUserId) 一辈子只奖励一次，避免 like→unlike→like 刷分。
    // 由于 PostLike 的 unique(userId, postId) 已阻断并发重复 like（上面的 P2002 分支），
    // 本次执行到这里代表 PostLike 为新建，此时查询 PointLog 判定幂等是安全的（无 TOCTOU）。
    if (post.authorId !== payload.id) {
      const idempotencyDetail = `帖子被点赞|post:${postId}|from:${payload.id}`;
      prisma.pointLog.findFirst({
        where: { userId: post.authorId, action: 'be_liked', detail: idempotencyDetail },
        select: { id: true },
      }).then((existing) => {
        if (!existing) {
          grantPoints(post.authorId, 'be_liked', idempotencyDetail).catch(() => {});
        }
      }).catch(() => {});

      // 通知保持每次都发（业务上每次点赞都值得触达一次作者）
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
