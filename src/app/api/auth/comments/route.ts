import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkBannedWords } from '@/lib/banned-words';
import { moderateText, saveModerationLog } from '@/lib/content-moderation';
import { enqueueJob } from '@/lib/async-job';

const createCommentSchema = z.object({
  postId: z.string().min(1, '帖子ID不能为空'),
  content: z.string().min(1, '评论不能为空').max(500, '评论最多500字'),
  parentId: z.string().optional(),
  replyToName: z.string().optional(),
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

    const { postId, content, parentId, replyToName } = parsed.data;

    // 验证父评论存在
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true },
      });
      if (!parentComment || parentComment.postId !== postId) {
        return fail('父评论不存在或不属于该帖子');
      }
    }

    // 本地违禁词检测
    const banned = await checkBannedWords(content);
    if (banned) {
      return fail(`评论包含违禁词「${banned}」，请修改后重新发布`);
    }

    // 腾讯云文本审核（双重保障）
    const textMod = await moderateText(content);

    // 确认违规 -> 直接拒绝；审核异常 -> 待审核
    if (!textMod.pass && !textMod.needsReview) {
      return fail(`评论审核未通过：${textMod.detail || '内容违规'}，请修改后重新发布`);
    }

    const commentStatus = textMod.pass ? 'published' : 'pending_review';

    // 验证帖子存在
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, authorId: true },
    });

    if (!post || post.status !== 'published') {
      return fail('帖子不存在或已下架', 404);
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        status: commentStatus,
        postId,
        authorId: payload.id,
        parentId: parentId || null,
        replyToName: replyToName || null,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true, level: true, badge: true, customBadge: true },
        },
      },
    });

    // 审核结果落库
    saveModerationLog({
      targetType: 'comment',
      targetId: comment.id,
      action: 'text_moderation',
      result: textMod.pass ? 'pass' : (textMod.needsReview ? 'review' : 'block'),
      label: textMod.label,
      score: textMod.score,
      detail: textMod.detail,
    }).catch(() => {});

    if (commentStatus === 'published') {
      // 评论积分 - 异步任务队列
      enqueueJob({
        type: 'grant_points',
        payload: { userId: payload.id, action: 'comment', detail: '发表评论' },
        idempotencyKey: `points:comment:${comment.id}`,
      }).catch(() => {});

      // 热度更新 - 异步任务队列
      enqueueJob({
        type: 'update_hot_score',
        payload: { postId },
        idempotencyKey: `hotscore:comment:${comment.id}`,
      }).catch(() => {});

      // 通知帖子作者 - 异步任务队列
      enqueueJob({
        type: 'notify_comment',
        payload: {
          postAuthorId: post.authorId,
          commenter: { id: payload.id, name: comment.author.name, avatar: comment.author.avatar },
          postId,
          commentContent: content,
        },
        idempotencyKey: `notify:comment:${comment.id}`,
      }).catch(() => {});
    }

    const message = commentStatus === 'published' ? '评论成功' : '评论已提交，待审核后将公开展示';
    return ok(comment, message);
  } catch (err) {
    return handleError(err);
  }
}
