import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';

export async function DELETE(req: NextRequest, { params }: { params: { postId: string } }) {
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

    // 只有作者本人或管理员可以删除
    if (post.authorId !== payload.id && payload.role !== 'admin' && payload.role !== 'star') {
      return fail('无权删除此帖子', 403);
    }

    // 先删除关联数据，再删除帖子
    await prisma.$transaction([
      prisma.postTag.deleteMany({ where: { postId } }),
      prisma.comment.deleteMany({ where: { postId } }),
      prisma.post.delete({ where: { id: postId } }),
    ]);

    invalidateCache('public:home');
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
