import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const wait = await checkRateLimit(getClientIp(req), { namespace: 'check-name', windowMs: 60_000, max: 30 });
    if (wait !== null) {
      return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);
    }

    const name = req.nextUrl.searchParams.get('name')?.trim();
    if (!name) return fail('昵称不能为空');

    const exists = await prisma.user.findFirst({ where: { name } });
    return ok({ available: !exists });
  } catch (err) {
    return handleError(err);
  }
}
