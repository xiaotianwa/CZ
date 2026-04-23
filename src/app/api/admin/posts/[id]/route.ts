import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { logAdminAction } from '@/lib/admin-audit';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
        comments: {
          include: { author: { select: { id: true, name: true, avatar: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        postTags: { include: { tag: true } },
      },
    });

    if (!post) return fail('帖子不存在', 404);
    return ok(post);
  } catch (err) {
    return handleError(err);
  }
}

const updatePostSchema = z.object({
  content: z.string().min(1).optional(),
  images: z.array(z.string().url()).optional(),
  isPinned: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'hidden']).optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { tagIds, images, ...data } = parsed.data;
    const updateData: Record<string, unknown> = { ...data };
    if (images) updateData.images = JSON.stringify(images);

    // 审计前快照（取核心可变字段即可，避免 include 全量）
    const before = await prisma.post.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, isPinned: true, content: true },
    });

    if (tagIds) {
      await prisma.postTag.deleteMany({ where: { postId: id } });
      if (tagIds.length > 0) {
        await prisma.postTag.createMany({
          data: tagIds.map((tagId) => ({ postId: id, tagId })),
        });
      }
    }

    const post = await prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
        postTags: { include: { tag: true } },
      },
    });

    // 审计：优先用更细粒度的 action 命名
    let action: string = 'post.update';
    if (parsed.data.isPinned === true && before?.isPinned === false) action = 'post.pin';
    else if (parsed.data.isPinned === false && before?.isPinned === true) action = 'post.unpin';
    else if (parsed.data.status === 'hidden' && before?.status !== 'hidden') action = 'post.hide';

    logAdminAction({
      operator: { id: admin.id, email: admin.email },
      action,
      targetType: 'post',
      targetId: id,
      before,
      after: { id: post.id, status: post.status, isPinned: post.isPinned },
      req,
    });

    return ok(post, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    // 审计前抓取关键字段用于溯源（帖子被删后无法再查）
    const before = await prisma.post.findUnique({
      where: { id },
      select: { id: true, authorId: true, content: true, status: true, createdAt: true },
    });

    await prisma.post.delete({ where: { id } });

    logAdminAction({
      operator: { id: admin.id, email: admin.email },
      action: 'post.delete',
      targetType: 'post',
      targetId: id,
      before,
      req,
    });

    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
