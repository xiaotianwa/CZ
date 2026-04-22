import { prisma } from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true, level: true, badge: true, customBadge: true },
        },
        postTags: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
        comments: {
          where: { parentId: null },
          include: {
            author: {
              select: { id: true, name: true, avatar: true, role: true, level: true, badge: true, customBadge: true },
            },
            replies: {
              include: {
                author: {
                  select: { id: true, name: true, avatar: true, role: true, level: true, badge: true, customBadge: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { comments: true } },
      },
    });

    if (!post || post.status !== 'published') {
      return fail('帖子不存在', 404);
    }

    return ok(post);
  } catch (err) {
    return handleError(err);
  }
}
