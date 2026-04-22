'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, ChevronLeft, ChevronRight, Eye, Filter, Globe2, MapPin, Monitor, RefreshCw, RotateCcw, Search } from 'lucide-react';
import { adminGet } from '@/lib/admin-fetch';

interface AggregationItem {
  label: string;
  count: number;
}

interface TrendItem {
  date: string;
  count: number;
}

interface SiteLogItem {
  id: string;
  path: string;
  ip: string | null;
  ua: string | null;
  referrer: string | null;
  referrerHost: string | null;
  date: string;
  createdAt: string;
  uaInfo: {
    browser: string;
    os: string;
    device: string;
  };
}

interface SiteLogResponse {
  summary: {
    totalViews: number;
    todayViews: number;
    uniquePaths: number;
    uniqueIps: number;
    lastVisitAt: string | null;
    rangeDays: number;
    keyword: string;
  };
  aggregations: {
    topPaths: AggregationItem[];
    topReferrers: AggregationItem[];
    topIps: AggregationItem[];
    trend: TrendItem[];
  };
  list: SiteLogItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function DetailModal({ item, onClose }: { item: SiteLogItem | null; onClose: () => void }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-card bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-divider px-5 py-4">
          <div>
            <h3 className="text-heading-sm text-text-title">访问详情</h3>
            <p className="mt-1 text-caption text-text-muted">查看完整访问来源、设备和时间信息</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-btn border border-border px-4 text-body text-text-body transition-colors hover:border-primary hover:text-primary"
          >
            关闭
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2">
          <div className="rounded-card border border-divider bg-gray-50/60 px-4 py-3 md:col-span-2">
            <p className="text-caption text-text-muted">访问路径</p>
            <p className="mt-1 break-all text-body font-medium text-text-title">{item.path}</p>
          </div>

          <div className="rounded-card border border-divider bg-gray-50/60 px-4 py-3">
            <p className="text-caption text-text-muted">访问时间</p>
            <p className="mt-1 text-body font-medium text-text-title">{formatDateTime(item.createdAt)}</p>
          </div>

          <div className="rounded-card border border-divider bg-gray-50/60 px-4 py-3">
            <p className="text-caption text-text-muted">访问 IP</p>
            <p className="mt-1 break-all text-body font-medium text-text-title">{item.ip || '未知'}</p>
          </div>

          <div className="rounded-card border border-divider bg-gray-50/60 px-4 py-3">
            <p className="text-caption text-text-muted">浏览器</p>
            <p className="mt-1 text-body font-medium text-text-title">{item.uaInfo.browser}</p>
          </div>

          <div className="rounded-card border border-divider bg-gray-50/60 px-4 py-3">
            <p className="text-caption text-text-muted">系统 / 设备</p>
            <p className="mt-1 text-body font-medium text-text-title">{item.uaInfo.os} / {item.uaInfo.device}</p>
          </div>

          <div className="rounded-card border border-divider bg-gray-50/60 px-4 py-3 md:col-span-2">
            <p className="text-caption text-text-muted">来源页面</p>
            <p className="mt-1 break-all text-body font-medium text-text-title">{item.referrer || '直接访问'}</p>
          </div>

          <div className="rounded-card border border-divider bg-gray-50/60 px-4 py-3 md:col-span-2">
            <p className="text-caption text-text-muted">完整 User-Agent</p>
            <p className="mt-1 break-all text-body leading-6 text-text-title">{item.ua || '未知'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankingCard({ title, icon: Icon, items, emptyText }: { title: string; icon: typeof Globe2; items: AggregationItem[]; emptyText: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-divider bg-white">
      <div className="flex items-center gap-2 border-b border-divider px-4 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-body font-medium text-text-title">{title}</h3>
      </div>
      <div className="space-y-3 px-4 py-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-body">
              <span className="truncate text-text-body" title={item.label}>{item.label}</span>
              <span className="text-caption font-medium text-text-muted">{item.count}</span>
            </div>
          ))
        ) : (
          <p className="text-caption text-text-muted">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

export default function AdminSiteLogsPage() {
  const [siteLogs, setSiteLogs] = useState<SiteLogResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logDays, setLogDays] = useState(7);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedLog, setSelectedLog] = useState<SiteLogItem | null>(null);
  const [error, setError] = useState('');

  const fetchSiteLogs = async (params?: { days?: number; page?: number; keyword?: string }) => {
    const nextDays = params?.days ?? logDays;
    const nextPage = params?.page ?? page;
    const nextKeyword = params?.keyword ?? keyword;

    setLogsLoading(true);
    setError('');
    try {
      const searchParams = new URLSearchParams({
        days: String(nextDays),
        page: String(nextPage),
        pageSize: '20',
      });
      if (nextKeyword) searchParams.set('keyword', nextKeyword);

      const res = await adminGet<SiteLogResponse>(`/api/admin/site-logs?${searchParams.toString()}`);
      setSiteLogs(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '网站日志加载失败');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteLogs();
  }, [logDays, page, keyword]);

  const trendMax = useMemo(() => {
    const counts = siteLogs?.aggregations.trend.map((item) => item.count) ?? [];
    return counts.length > 0 ? Math.max(...counts, 1) : 1;
  }, [siteLogs]);

  const handleSearch = () => {
    setPage(1);
    setKeyword(keywordInput.trim());
  };

  const handleReset = () => {
    setKeywordInput('');
    setKeyword('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex items-center gap-2 rounded-btn bg-red-50 px-4 py-3 text-body text-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-divider pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-btn bg-primary-bg">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-body font-semibold text-text-title">网站日志</h2>
              <p className="text-caption text-text-muted">支持路径、IP、来源和 User-Agent 搜索，并查看完整访问详情</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={logDays}
              onChange={(e) => {
                setPage(1);
                setLogDays(Number(e.target.value));
              }}
              className="h-9 rounded-btn border border-border bg-white px-3 text-body focus:outline-none focus:border-primary"
            >
              <option value={1}>最近 1 天</option>
              <option value={7}>最近 7 天</option>
              <option value={30}>最近 30 天</option>
            </select>
            <button
              type="button"
              onClick={() => fetchSiteLogs()}
              disabled={logsLoading}
              className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-border bg-white px-4 text-body text-text-body transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="搜索路径、IP、来源地址或 User-Agent"
              className="h-10 w-full rounded-btn border border-border bg-white pl-9 pr-3 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-primary px-4 text-body font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <Filter className="h-4 w-4" />
            筛选
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-border bg-white px-4 text-body text-text-body transition-colors hover:border-primary hover:text-primary"
          >
            <RotateCcw className="h-4 w-4" />
            重置
          </button>
        </div>

        {siteLogs?.summary.keyword ? (
          <div className="mt-3 rounded-btn bg-primary-bg px-3 py-2 text-caption text-primary">
            当前筛选关键词：{siteLogs.summary.keyword}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-card border border-divider bg-gray-50/70 px-4 py-3">
            <p className="text-caption text-text-muted">统计周期总访问</p>
            <p className="mt-1 text-[22px] font-semibold text-text-title">{siteLogs?.summary.totalViews ?? 0}</p>
          </div>
          <div className="rounded-card border border-divider bg-gray-50/70 px-4 py-3">
            <p className="text-caption text-text-muted">今日访问</p>
            <p className="mt-1 text-[22px] font-semibold text-text-title">{siteLogs?.summary.todayViews ?? 0}</p>
          </div>
          <div className="rounded-card border border-divider bg-gray-50/70 px-4 py-3">
            <p className="text-caption text-text-muted">访问路径数</p>
            <p className="mt-1 text-[22px] font-semibold text-text-title">{siteLogs?.summary.uniquePaths ?? 0}</p>
          </div>
          <div className="rounded-card border border-divider bg-gray-50/70 px-4 py-3">
            <p className="text-caption text-text-muted">访问 IP 数</p>
            <p className="mt-1 text-[22px] font-semibold text-text-title">{siteLogs?.summary.uniqueIps ?? 0}</p>
          </div>
          <div className="rounded-card border border-divider bg-gray-50/70 px-4 py-3">
            <p className="text-caption text-text-muted">最后访问时间</p>
            <p className="mt-1 text-body font-semibold text-text-title">
              {siteLogs?.summary.lastVisitAt ? formatDateTime(siteLogs.summary.lastVisitAt) : '暂无记录'}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-card border border-divider bg-white">
          <div className="border-b border-divider px-4 py-3">
            <h3 className="text-body font-medium text-text-title">访问趋势</h3>
          </div>
          <div className="px-4 py-4">
            <div className="flex h-48 items-end gap-2">
              {(siteLogs?.aggregations.trend ?? []).map((item) => (
                <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end justify-center rounded-btn bg-gray-50/80 px-1">
                    <div
                      className="w-full rounded-t-btn bg-primary/80 transition-all"
                      style={{ height: `${Math.max(8, (item.count / trendMax) * 100)}%` }}
                      title={`${formatShortDate(item.date)} ${item.count} 次`}
                    />
                  </div>
                  <div className="text-[11px] text-text-muted">{item.count}</div>
                  <div className="text-[11px] text-text-muted">{formatShortDate(item.date)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <RankingCard title="热门路径" icon={BarChart3} items={siteLogs?.aggregations.topPaths ?? []} emptyText="暂无路径统计" />
          <RankingCard title="来源站点" icon={Globe2} items={siteLogs?.aggregations.topReferrers ?? []} emptyText="暂无来源统计" />
          <RankingCard title="活跃 IP" icon={MapPin} items={siteLogs?.aggregations.topIps ?? []} emptyText="暂无 IP 统计" />
        </div>

        <div className="mt-4 overflow-hidden rounded-card border border-divider bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3">
            <div>
              <h3 className="text-body font-medium text-text-title">访问记录</h3>
              <p className="mt-1 text-caption text-text-muted">近 {siteLogs?.summary.rangeDays ?? logDays} 天，共 {siteLogs?.pagination.total ?? 0} 条</p>
            </div>
            <span className="text-caption text-text-muted">第 {siteLogs?.pagination.page ?? 1} / {siteLogs?.pagination.totalPages ?? 1} 页</span>
          </div>
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead>
                  <tr className="border-b border-divider bg-gray-50/60">
                    <th className="px-4 py-3 text-left font-medium text-text-muted">路径</th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">访客</th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">来源</th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">设备</th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">时间</th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-text-muted">加载中...</td>
                    </tr>
                  ) : (siteLogs?.list ?? []).length > 0 ? (
                    siteLogs?.list.map((item) => (
                      <tr key={item.id} className="border-b border-divider last:border-0 align-top">
                        <td className="px-4 py-3 text-text-title">
                          <div className="max-w-[260px] truncate" title={item.path}>{item.path}</div>
                          <div className="mt-1 text-[11px] text-text-muted">{item.date}</div>
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          <div className="whitespace-nowrap">{item.ip || '未知'}</div>
                          <div className="mt-1 text-[11px] text-text-muted">{item.uaInfo.device}</div>
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          <div className="max-w-[220px] truncate" title={item.referrerHost || item.referrer || ''}>{item.referrerHost || '直接访问'}</div>
                          {item.referrer ? <div className="mt-1 max-w-[220px] truncate text-[11px] text-text-muted" title={item.referrer}>{item.referrer}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          <div className="inline-flex items-center gap-1 text-text-body">
                            <Monitor className="h-3.5 w-3.5 text-primary" />
                            {item.uaInfo.browser}
                          </div>
                          <div className="mt-1 text-[11px] text-text-muted">{item.uaInfo.os}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-text-muted">{formatDateTime(item.createdAt)}</td>
                        <td className="px-4 py-3 text-text-muted">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(item)}
                            className="inline-flex h-8 items-center gap-1 rounded-btn border border-border px-3 text-caption text-text-body transition-colors hover:border-primary hover:text-primary"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            详情
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-text-muted">暂无日志记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          <div className="flex items-center justify-between border-t border-divider px-4 py-3">
            <span className="text-caption text-text-muted">共 {siteLogs?.pagination.total ?? 0} 条访问记录</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={logsLoading || page <= 1}
                className="inline-flex h-8 items-center gap-1 rounded-btn border border-border px-3 text-caption text-text-body transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                上一页
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(siteLogs?.pagination.totalPages || 1, prev + 1))}
                disabled={logsLoading || page >= (siteLogs?.pagination.totalPages || 1)}
                className="inline-flex h-8 items-center gap-1 rounded-btn border border-border px-3 text-caption text-text-body transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                下一页
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <DetailModal item={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
