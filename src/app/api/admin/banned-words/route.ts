import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';
import { resetBannedWordsCache } from '@/lib/banned-words';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize, keyword, category } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (keyword) {
      where.word = { contains: keyword };
    }
    if (category) {
      where.category = category;
    }

    const [list, total] = await Promise.all([
      prisma.bannedWord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bannedWord.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  word: z.string().min(1, '违禁词不能为空').max(50, '违禁词最长50字'),
  category: z.enum(['politics', 'porn', 'gambling', 'violence', 'ad', 'abuse', 'custom']).default('custom'),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();

    // 支持批量添加：逗号或换行分隔
    if (typeof body.words === 'string') {
      const words = body.words.split(/[,，\n]/).map((w: string) => w.trim()).filter(Boolean);
      if (words.length === 0) return fail('请输入至少一个违禁词');

      const category = body.category || 'custom';
      let created = 0;
      let skipped = 0;

      for (const word of words) {
        try {
          await prisma.bannedWord.create({
            data: { word, category, isActive: true },
          });
          created++;
        } catch {
          skipped++; // unique 冲突，跳过
        }
      }

      resetBannedWordsCache();
      return ok({ created, skipped }, `成功添加 ${created} 个违禁词${skipped > 0 ? `，${skipped} 个已存在被跳过` : ''}`);
    }

    // 单个添加
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const existing = await prisma.bannedWord.findUnique({ where: { word: parsed.data.word } });
    if (existing) return fail(`违禁词「${parsed.data.word}」已存在`);

    const item = await prisma.bannedWord.create({ data: parsed.data });
    resetBannedWordsCache();
    return ok(item, '添加成功');
  } catch (err) {
    return handleError(err);
  }
}
