import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const comments = await prisma.comment.findMany({
      where: { postId: id, parentId: null, status: 'published' },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true, level: true, badge: true, customBadge: true },
        },
        replies: {
          where: { status: 'published' },
          include: {
            author: {
              select: { id: true, name: true, avatar: true, role: true, level: true, badge: true, customBadge: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return ok(comments);
  } catch (err) {
    return handleError(err);
  }
}
