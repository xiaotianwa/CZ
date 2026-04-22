import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkBannedWords } from '@/lib/banned-words';
import { moderateText, saveModerationLog } from '@/lib/content-moderation';
import { invalidateCache } from '@/lib/cache';
import { enqueueJob } from '@/lib/async-job';
import { calcHotScore } from '@/lib/hot-score';

const createPostSchema = z.object({
  content: z.string().min(1, '内容不能为空').max(2000, '内容最多2000字'),
  images: z.array(z.string().url()).max(9, '最多上传9个文件').default([]),
  tagIds: z.array(z.string()).max(5, '最多选择5个标签').default([]),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { content, images, tagIds } = parsed.data;

    // 验证用户在 DB 中存在（JWT 有效但用户可能已删除或 DB 重置）
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, isActive: true },
    });
    if (!dbUser || !dbUser.isActive) {
      return fail('用户不存在或已被禁用，请重新登录', 401);
    }

    // 本地违禁词检测
    const banned = await checkBannedWords(content);
    if (banned) {
      return fail(`内容包含违禁词「${banned}」，请修改后重新发布`);
    }

    // 腾讯云文本审核（双重保障）
    const textMod = await moderateText(content);

    // 确定发布状态：审核通过 -> published，异常/待审核 -> pending_review，确认违规 -> 直接拒绝
    if (!textMod.pass && !textMod.needsReview) {
      return fail(`内容审核未通过：${textMod.detail || '内容违规'}，请修改后重新发布`);
    }

    const postStatus = textMod.pass ? 'published' : 'pending_review';
    const initialHotScore = calcHotScore(0, 0, new Date());

    const post = await prisma.post.create({
      data: {
        content,
        images: JSON.stringify(images),
        hotScore: initialHotScore,
        status: postStatus,
        authorId: payload.id,
        postTags: tagIds.length > 0
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true, level: true, badge: true, customBadge: true },
        },
        postTags: { include: { tag: { select: { id: true, name: true } } } },
        _count: { select: { comments: true } },
      },
    });

    // 审核结果落库
    saveModerationLog({
      targetType: 'post',
      targetId: post.id,
      action: 'text_moderation',
      result: textMod.pass ? 'pass' : (textMod.needsReview ? 'review' : 'block'),
      label: textMod.label,
      score: textMod.score,
      detail: textMod.detail,
    }).catch(() => {});

    if (postStatus === 'published') {
      invalidateCache('public:home');
      // 发帖积分 - 异步任务队列
      enqueueJob({
        type: 'grant_points',
        payload: { userId: payload.id, action: 'post', detail: '发布帖子' },
        idempotencyKey: `points:post:${post.id}`,
      }).catch(() => {});
    }

    const message = postStatus === 'published' ? '发布成功' : '发布成功，内容待审核后将公开展示';
    return ok(post, message);
  } catch (err) {
    return handleError(err);
  }
}
