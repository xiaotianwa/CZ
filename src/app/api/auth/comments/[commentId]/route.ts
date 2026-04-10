import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

export async function DELETE(req: NextRequest, { params }: { params: { commentId: string } }) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const { commentId } = params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true },
    });

    if (!comment) {
      return fail('评论不存在', 404);
    }

    // 只有作者本人或管理员可以删除
    if (comment.authorId !== payload.id && payload.role !== 'admin' && payload.role !== 'star') {
      return fail('无权删除此评论', 403);
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
