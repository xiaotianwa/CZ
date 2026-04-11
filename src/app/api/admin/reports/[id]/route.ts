import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { status, adminNote } = body as { status?: string; adminNote?: string };

    if (!status || !['reviewed', 'resolved', 'dismissed'].includes(status)) {
      return fail('无效的状态');
    }

    const report = await prisma.report.update({
      where: { id: params.id },
      data: {
        status,
        adminNote: adminNote || undefined,
      },
    });

    return ok(report);
  } catch (err) {
    return handleError(err);
  }
}
