import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const list = await prisma.heroSlide.findMany({ orderBy: { sortOrder: 'asc' } });
    return ok(list);
  } catch (err) {
    return handleError(err);
  }
}

const schema = z.object({
  image: z.string().min(1, '图片不能为空'),
  alt: z.string().min(1, '描述不能为空'),
  link: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const slide = await prisma.heroSlide.create({ data: parsed.data });
    invalidateCache('public:home');
    return ok(slide, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}
