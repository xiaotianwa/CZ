import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';
import { getGroupFromKey } from '@/lib/site-data';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const group = searchParams.get('group') || '';

    const where: Record<string, unknown> = {};
    if (group) where.group = group;

    const configs = await prisma.siteConfig.findMany({ where, orderBy: { key: 'asc' } });
    const result: Record<string, string> = {};
    for (const c of configs) {
      result[c.key] = c.value;
    }
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}

const updateSchema = z.record(z.string(), z.string());

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail('数据格式错误');

    const entries = Object.entries(parsed.data);
    for (const [key, value] of entries) {
      await prisma.siteConfig.upsert({
        where: { key },
        update: { value, group: getGroupFromKey(key) },
        create: { key, value, group: getGroupFromKey(key) },
      });
    }

    invalidateCache('public:config');
    invalidateCache('public:home');
    return ok(null, '保存成功');
  } catch (err) {
    return handleError(err);
  }
}
