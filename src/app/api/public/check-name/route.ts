import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name')?.trim();
    if (!name) return fail('昵称不能为空');

    const exists = await prisma.user.findFirst({ where: { name } });
    return ok({ available: !exists });
  } catch (err) {
    return handleError(err);
  }
}
