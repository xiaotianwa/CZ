import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

// POST — 收藏帖子
export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) return fail('未登录', 401);

    const { postId } = params;

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return fail('帖子不存在', 404);

    await prisma.bookmark.upsert({
      where: { userId_postId: { userId: payload.id, postId } },
      create: { userId: payload.id, postId },
      update: {},
    });

    return ok(null, '收藏成功');
  } catch (err) {
    return handleError(err);
  }
}

// DELETE — 取消收藏
export async function DELETE(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) return fail('未登录', 401);

    await prisma.bookmark.deleteMany({
      where: { userId: payload.id, postId: params.postId },
    });

    return ok(null, '已取消收藏');
  } catch (err) {
    return handleError(err);
  }
}
