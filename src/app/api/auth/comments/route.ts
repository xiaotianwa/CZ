import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkBannedWords } from '@/lib/banned-words';

const createCommentSchema = z.object({
  postId: z.string().min(1, '帖子ID不能为空'),
  content: z.string().min(1, '评论不能为空').max(500, '评论最多500字'),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { postId, content } = parsed.data;

    // 违禁词检测
    const banned = checkBannedWords(content);
    if (banned) {
      return fail(`评论包含违禁词「${banned}」，请修改后重新发布`);
    }

    // 验证帖子存在
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    });

    if (!post || post.status !== 'published') {
      return fail('帖子不存在或已下架', 404);
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: payload.id,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true, level: true, badge: true },
        },
      },
    });

    return ok(comment, '评论成功');
  } catch (err) {
    return handleError(err);
  }
}
