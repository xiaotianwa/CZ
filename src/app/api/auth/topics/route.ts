import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkBannedWords } from '@/lib/banned-words';

const createTopicSchema = z.object({
  name: z.string()
    .min(1, '话题名不能为空')
    .max(20, '话题名最多20个字符')
    .transform((s) => s.trim().replace(/^#+/, '')),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const body = await req.json();
    const parsed = createTopicSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { name } = parsed.data;
    if (!name) return fail('话题名不能为空');

    // 违禁词检测
    const banned = checkBannedWords(name);
    if (banned) {
      return fail(`话题包含违禁词「${banned}」`);
    }

    // 去重：已存在则直接返回
    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      return ok({
        id: existing.id,
        name: existing.name,
        color: existing.color,
        postCount: 0,
      }, '话题已存在');
    }

    const tag = await prisma.tag.create({
      data: { name },
    });

    return ok({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      postCount: 0,
    }, '话题创建成功');
  } catch (err) {
    return handleError(err);
  }
}
