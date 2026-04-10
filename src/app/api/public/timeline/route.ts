import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const events = await prisma.timelineEvent.findMany({ orderBy: { sortOrder: 'asc' } });
    return ok(events);
  } catch (err) {
    return handleError(err);
  }
}
