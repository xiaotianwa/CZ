import { Prisma } from '@/generated/prisma/client';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, handleError, getSearchParams } from '@/lib/api';

function getUaInfo(ua?: string | null) {
  const source = ua || '';

  const browser = source.includes('Edg/')
    ? 'Edge'
    : source.includes('Chrome/')
      ? 'Chrome'
      : source.includes('Firefox/')
        ? 'Firefox'
        : source.includes('Safari/') && !source.includes('Chrome/')
          ? 'Safari'
          : source.includes('MicroMessenger/')
            ? '微信'
            : '未知浏览器';

  const os = source.includes('Windows')
    ? 'Windows'
    : source.includes('Mac OS X')
      ? 'macOS'
      : source.includes('Android')
        ? 'Android'
        : source.includes('iPhone') || source.includes('iPad')
          ? 'iOS'
          : source.includes('Linux')
            ? 'Linux'
            : '未知系统';

  const device = source.includes('iPad') || source.includes('Tablet')
    ? '平板'
    : source.includes('Mobile') || source.includes('Android') || source.includes('iPhone')
      ? '移动端'
      : '桌面端';

  return { browser, os, device };
}

function getReferrerHost(referrer?: string | null) {
  if (!referrer) return null;
  try {
    return new URL(referrer).host || referrer;
  } catch {
    return referrer;
  }
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const { page, pageSize, keyword } = getSearchParams(req.url);
    const { searchParams } = new URL(req.url);
    const days = Math.min(30, Math.max(1, Number(searchParams.get('days')) || 7));
    const trimmedKeyword = keyword.trim();

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const today = formatDateKey(new Date());
    const where: Prisma.PageViewWhereInput = { createdAt: { gte: since } };

    if (trimmedKeyword) {
      where.OR = [
        { path: { contains: trimmedKeyword } },
        { ip: { contains: trimmedKeyword } },
        { referrer: { contains: trimmedKeyword } },
        { ua: { contains: trimmedKeyword } },
      ];
    }

    const [totalViews, todayViews, groupedPaths, groupedReferrers, groupedIps, groupedDates, uniqueIps, latestVisit, rawList] = await Promise.all([
      prisma.pageView.count({ where }),
      prisma.pageView.count({ where: { ...where, date: today } }),
      prisma.pageView.groupBy({
        by: ['path'],
        where,
        _count: { path: true },
      }),
      prisma.pageView.groupBy({
        by: ['referrer'],
        where: { ...where, referrer: { not: null } },
        _count: { referrer: true },
      }),
      prisma.pageView.groupBy({
        by: ['ip'],
        where: { ...where, ip: { not: null } },
        _count: { ip: true },
      }),
      prisma.pageView.groupBy({
        by: ['date'],
        where,
        _count: { date: true },
      }),
      prisma.pageView.groupBy({
        by: ['ip'],
        where: { ...where, ip: { not: null } },
      }),
      prisma.pageView.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.pageView.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          path: true,
          ip: true,
          ua: true,
          referrer: true,
          date: true,
          createdAt: true,
        },
      }),
    ]);

    const topPaths = groupedPaths
      .map((item) => ({ label: item.path, count: item._count.path }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topReferrers = groupedReferrers
      .filter((item) => item.referrer)
      .map((item) => ({
        label: getReferrerHost(item.referrer) || '直接访问',
        count: item._count.referrer,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topIps = groupedIps
      .filter((item) => item.ip)
      .map((item) => ({ label: item.ip || '未知', count: item._count.ip }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const dateCountMap = new Map(groupedDates.map((item) => [item.date, item._count.date]));
    const trend = Array.from({ length: days }, (_, index) => {
      const current = new Date(since);
      current.setDate(since.getDate() + index);
      const date = formatDateKey(current);
      return {
        date,
        count: dateCountMap.get(date) || 0,
      };
    });

    const list = rawList.map((item) => ({
      ...item,
      uaInfo: getUaInfo(item.ua),
      referrerHost: getReferrerHost(item.referrer),
    }));

    return ok({
      summary: {
        totalViews,
        todayViews,
        uniquePaths: groupedPaths.length,
        uniqueIps: uniqueIps.filter((item) => item.ip).length,
        lastVisitAt: latestVisit?.createdAt ?? null,
        rangeDays: days,
        keyword: trimmedKeyword,
      },
      aggregations: {
        topPaths,
        topReferrers,
        topIps,
        trend,
      },
      list,
      pagination: {
        total: totalViews,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalViews / pageSize)),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
