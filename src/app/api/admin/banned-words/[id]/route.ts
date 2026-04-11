import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { resetBannedWordsCache } from '@/lib/banned-words';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();

    const schema = z.object({
      word: z.string().min(1).max(50).optional(),
      category: z.enum(['politics', 'porn', 'gambling', 'violence', 'ad', 'abuse', 'custom']).optional(),
      isActive: z.boolean().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const item = await prisma.bannedWord.update({
      where: { id },
      data: parsed.data,
    });

    resetBannedWordsCache();
    return ok(item, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await prisma.bannedWord.delete({ where: { id } });
    resetBannedWordsCache();
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
