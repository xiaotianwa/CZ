import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

interface GameQuizQuestionRecord {
  id: string;
  question: string;
  options: string;
  answer: number;
}

function isMissingTableError(err: unknown) {
  return err instanceof Error && /GameQuizQuestion/i.test(err.message) && /(no such table|does not exist)/i.test(err.message);
}

/**
 * 游戏中心知识问答 - 获取完整题目（含答案）
 * 与注册验证的 quiz API 不同，这里返回 answer 供纯前端游戏使用
 */
export async function GET() {
  try {
    const all = await prisma.$queryRaw<GameQuizQuestionRecord[]>(Prisma.sql`
      SELECT
        "id",
        "question",
        "options",
        "answer"
      FROM "GameQuizQuestion"
      WHERE "isActive" = true
      ORDER BY "sortOrder" ASC, "createdAt" ASC
    `);

    const questions = all.map((q) => ({
      id: q.id,
      question: q.question,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      answer: q.answer,
    }));

    return ok(questions);
  } catch (err) {
    if (isMissingTableError(err)) {
      return ok([]);
    }
    return handleError(err);
  }
}
