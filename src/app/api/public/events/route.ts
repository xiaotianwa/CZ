import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'desc' },
    });
    return ok(events);
  } catch (err) {
    return handleError(err);
  }
}
