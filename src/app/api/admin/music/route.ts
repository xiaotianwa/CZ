import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const list = await prisma.musicTrack.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return ok(list);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { title, artist, src, cover, duration } = body;

    if (!title || !src) {
      return fail('标题和音频文件必填');
    }

    const maxOrder = await prisma.musicTrack.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const track = await prisma.musicTrack.create({
      data: {
        title,
        artist: artist || '陈泽',
        src,
        cover: cover || null,
        duration: duration || null,
        sortOrder,
      },
    });
    invalidateCache('public:music');
    return ok(track, '添加成功');
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { id, title, artist, src, cover, duration, isActive, sortOrder } = body;

    if (!id) return fail('缺少 id');

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (artist !== undefined) data.artist = artist;
    if (src !== undefined) data.src = src;
    if (cover !== undefined) data.cover = cover || null;
    if (duration !== undefined) data.duration = duration;
    if (isActive !== undefined) data.isActive = isActive;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const track = await prisma.musicTrack.update({
      where: { id },
      data,
    });
    invalidateCache('public:music');
    return ok(track, '更新成功');
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

    await prisma.musicTrack.delete({ where: { id } });
    invalidateCache('public:music');
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
