import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkBannedWords } from '@/lib/banned-words';
import { invalidateCache } from '@/lib/cache';
import { grantPoints } from '@/lib/points';

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

    // 违禁词检测
    const banned = await checkBannedWords(content);
    if (banned) {
      return fail(`内容包含违禁词「${banned}」，请修改后重新发布`);
    }

    const post = await prisma.post.create({
      data: {
        content,
        images: JSON.stringify(images),
        authorId: payload.id,
        postTags: tagIds.length > 0
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true, level: true, badge: true },
        },
        postTags: { include: { tag: { select: { id: true, name: true } } } },
        _count: { select: { comments: true } },
      },
    });

    invalidateCache('public:home');

    // 发帖积分 +10
    grantPoints(payload.id, 'post', `发布帖子`).catch(() => {});

    return ok(post, '发布成功');
  } catch (err) {
    return handleError(err);
  }
}
