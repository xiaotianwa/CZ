import { NextRequest } from 'next/server';
import { ok, handleError } from '@/lib/api';
import { refreshAllHotScores } from '@/lib/hot-score';
import { requireAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const updated = await refreshAllHotScores();
    return ok({ updated }, `已刷新 ${updated} 篇帖子的热度分`);
  } catch (err) {
    return handleError(err);
  }
}
