import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit } from '@/lib/rate-limit';
import { createQuizPassToken, getRequestMeta, recordSecurityEvent } from '@/lib/registration-security';

const schema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1, '题目不能为空'),
    answer: z.number().int().min(0, '答案无效'),
  })).min(1, '请至少回答1题').max(10, '最多校验10题'),
  email: z.string().email('邮箱格式不正确').optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { ip, uaHash } = getRequestMeta(req);
    const wait = checkRateLimit(ip, { namespace: 'quiz-verify', windowMs: 60_000, max: 8 });
    if (wait !== null) {
      return fail(`验证过于频繁，请 ${wait} 秒后再试`, 429);
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { answers, email } = parsed.data;
    const uniqueIds = Array.from(new Set(answers.map((item) => item.questionId)));
    if (uniqueIds.length !== answers.length) {
      return fail('题目数据重复，请重新答题');
    }

    const questions = await prisma.quizQuestion.findMany({
      where: {
        id: { in: uniqueIds },
        isActive: true,
      },
      select: { id: true, answer: true },
    });

    if (questions.length !== uniqueIds.length) {
      await recordSecurityEvent(prisma as any, {
        eventType: 'quiz_verify',
        result: 'reject',
        reason: 'invalid_question_set',
        email: email || null,
        ip,
        uaHash,
      }).catch(() => null);
      return fail('题目已失效，请重新获取题目');
    }

    const answerMap = new Map(answers.map((item) => [item.questionId, item.answer]));
    const correctCount = questions.reduce((sum, item) => sum + (answerMap.get(item.id) === item.answer ? 1 : 0), 0);

    if (correctCount !== questions.length) {
      await recordSecurityEvent(prisma as any, {
        eventType: 'quiz_verify',
        result: 'reject',
        reason: 'wrong_answer',
        email: email || null,
        ip,
        uaHash,
        meta: JSON.stringify({ total: questions.length, correctCount }),
      }).catch(() => null);
      return fail('答题未通过，请重新答题', 403);
    }

    const token = await createQuizPassToken(prisma as any, {
      email: email || null,
      ip,
      uaHash,
      questionIds: uniqueIds,
      score: correctCount,
    });

    await recordSecurityEvent(prisma as any, {
      eventType: 'quiz_verify',
      result: 'success',
      email: email || null,
      ip,
      uaHash,
      meta: JSON.stringify({ total: questions.length, correctCount }),
    }).catch(() => null);

    return ok({
      token: token.token,
      expiresIn: token.expiresIn,
      score: correctCount,
      total: questions.length,
    }, '验证通过');
  } catch (err) {
    return handleError(err);
  }
}
