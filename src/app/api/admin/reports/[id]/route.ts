import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

const patchSchema = z.object({
  status: z.enum(['reviewed', 'resolved', 'dismissed']),
  adminNote: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const report = await prisma.report.update({
      where: { id: params.id },
      data: {
        status: parsed.data.status,
        adminNote: parsed.data.adminNote || undefined,
      },
    });

    return ok(report);
  } catch (err) {
    return handleError(err);
  }
}
