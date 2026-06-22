import { prisma } from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const wait = await checkRateLimit(getClientIp(req), { namespace: 'search', windowMs: 60_000, max: 30 });
    if (wait !== null) {
      return fail(`搜索过于频繁，请 ${wait} 秒后再试`, 429);
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 20));
    const skip = (page - 1) * pageSize;

    if (!q) {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, avatar: true, role: true, level: true, badge: true, bio: true, city: true },
        orderBy: { points: 'desc' },
        take: 10,
      });
      return ok({ users, userTotal: users.length });
    }

    const userWhere = {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { bio: { contains: q } },
        { city: { contains: q } },
      ],
    };

    const [users, userTotal] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: { id: true, name: true, avatar: true, role: true, level: true, badge: true, bio: true, city: true },
        orderBy: { points: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where: userWhere }),
    ]);

    return ok({ users, userTotal });
  } catch (err) {
    return handleError(err);
  }
}
