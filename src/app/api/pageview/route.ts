import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path || typeof path !== 'string') {
      return ok(null);
    }

    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const ua = req.headers.get('user-agent') || undefined;
    const referrer = req.headers.get('referer') || undefined;

    await prisma.pageView.create({
      data: { path, ip, ua, referrer, date },
    });

    return ok(null);
  } catch (err) {
    return handleError(err);
  }
}
