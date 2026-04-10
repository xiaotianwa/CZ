import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();

    const schema = z.object({
      question: z.string().min(1).optional(),
      options: z.array(z.string().min(1)).min(2).max(6).optional(),
      answer: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { options, ...data } = parsed.data;
    const updateData: Record<string, unknown> = { ...data };
    if (options !== undefined) {
      updateData.options = JSON.stringify(options);
      if (data.answer !== undefined && data.answer >= options.length) {
        return fail('答案索引超出选项范围');
      }
    }

    const item = await prisma.quizQuestion.update({ where: { id }, data: updateData });
    return ok(item, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await prisma.quizQuestion.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
