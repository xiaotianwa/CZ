import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';
import { deleteObject } from '@/lib/cos';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize, category } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (category) where.category = category;

    const [list, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.media.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return fail('缺少 id');

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return fail('文件不存在', 404);

    try {
      await deleteObject(media.cosKey);
    } catch (cosErr) {
      // COS 删除失败不阻塞数据库删除
      console.warn('[COS Delete Failed]', media.cosKey, cosErr);
    }

    await prisma.media.delete({ where: { id } });
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
