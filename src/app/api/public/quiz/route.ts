import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = Math.min(10, Math.max(1, Number(searchParams.get('count')) || 3));

    const all = await prisma.quizQuestion.findMany({
      where: { isActive: true },
      select: { id: true, question: true, options: true },
    });

    // 随机打乱后取 count 个
    const shuffled = all.sort(() => Math.random() - 0.5).slice(0, count);

    const questions = shuffled.map((q) => ({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options),
    }));

    return ok(questions);
  } catch (err) {
    return handleError(err);
  }
}
