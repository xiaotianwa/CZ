import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

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
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { tagIds, images, ...data } = parsed.data;
    const updateData: Record<string, unknown> = { ...data };
    if (images) updateData.images = JSON.stringify(images);

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

    return ok(post, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;

    await prisma.post.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
