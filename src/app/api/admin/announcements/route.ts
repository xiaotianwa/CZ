import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize } = getSearchParams(req.url);

    const [list, total] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.announcement.count(),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const announcementSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  type: z.enum(['info', 'warning', 'event', 'update']).default('info'),
  image: z.string().nullable().default(null),
  link: z.string().nullable().default(null),
  linkText: z.string().nullable().default(null),
  isActive: z.boolean().default(true),
  startAt: z.string().nullable().default(null),
  endAt: z.string().nullable().default(null),
  sortOrder: z.number().default(0),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = announcementSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { startAt, endAt, image, link, linkText, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (image) data.image = image;
    if (link) data.link = link;
    if (linkText) data.linkText = linkText;
    if (startAt) data.startAt = new Date(startAt);
    if (endAt) data.endAt = new Date(endAt);

    const item = await prisma.announcement.create({ data: data as any });
    invalidateCache('public:announcements');
    return ok(item, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}
