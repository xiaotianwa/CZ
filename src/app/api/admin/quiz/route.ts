import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize } = getSearchParams(req.url);

    const [list, total] = await Promise.all([
      prisma.quizQuestion.findMany({
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.quizQuestion.count(),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const quizSchema = z.object({
  question: z.string().min(1, '题目不能为空'),
  options: z.array(z.string().min(1)).min(2, '至少需要2个选项').max(6, '最多6个选项'),
  answer: z.number().min(0, '答案索引无效'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = quizSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { options, ...data } = parsed.data;
    if (data.answer >= options.length) return fail('答案索引超出选项范围');

    const item = await prisma.quizQuestion.create({
      data: { ...data, options: JSON.stringify(options) },
    });
    return ok(item, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}
