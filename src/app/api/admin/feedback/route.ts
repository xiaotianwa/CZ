import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { paginated, handleError, getSearchParams } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize, status } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatar: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.feedback.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}
