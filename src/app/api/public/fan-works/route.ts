import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';

    const where: Record<string, unknown> = { isActive: true, status: 'approved' };
    if (type && type !== 'all') {
      where.type = type;
    }

    const fanWorks = await prisma.fanWork.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return ok(fanWorks);
  } catch (err) {
    return handleError(err);
  }
}
