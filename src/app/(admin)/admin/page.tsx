'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, FileText, MessageSquare, Calendar, Image, Gamepad2,
  FolderOpen, TrendingUp, AlertCircle, Plus, Upload, Eye,
  ArrowRight, UserPlus, MessageSquarePlus, ArrowUpRight, ArrowDownRight,
  BarChart3, Activity,
} from 'lucide-react';
import { adminGet } from '@/lib/admin-fetch';

interface RecentFeedback {
  id: string;
  type: string;
  content: string;
  status: string;
  createdAt: string;
  user: { name: string } | null;
}

interface TrendData {
  dates: string[];
  users: number[];
  posts: number[];
  comments: number[];
  views: number[];
}

interface Stats {
  users: number;
  posts: number;
  comments: number;
  events: number;
  albums: number;
  games: number;
  media: number;
  photos: number;
  feedbacks: number;
  pendingFeedbacks: number;
  todayPosts: number;
  todayUsers: number;
  todayComments: number;
  todayViews: number;
  totalViews30d: number;
  activeUsers: number;
  trend: TrendData;
  recentFeedbacks: RecentFeedback[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

const feedbackTypeMap: Record<string, string> = {
  suggestion: '建议',
  bug: 'Bug',
  other: '其他',
};

const feedbackStatusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'bg-orange-50 text-warning' },
  read: { label: '已读', cls: 'bg-primary-bg text-primary' },
  resolved: { label: '已解决', cls: 'bg-green-50 text-success' },
};

/** 迷你柱状图（纯 CSS） */
function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className={`w-[6px] rounded-sm ${color} transition-all duration-300`}
          style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}

/** 增长指标 */
function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-caption text-text-muted">—</span>;
  if (previous === 0) return (
    <span className="inline-flex items-center gap-0.5 text-caption text-success">
      <ArrowUpRight className="w-3 h-3" /> 新增
    </span>
  );
  const pct = Math.round(((current - previous) / previous) * 100);
  const isUp = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-caption ${isUp ? 'text-success' : 'text-danger'}`}>
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGet<Stats>('/api/admin/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div className="card text-danger">{error}</div>;
  }

  const todayStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  // 计算7天的总和与前半/后半比较
  const trend = stats?.trend;
  const sum = (arr: number[] | undefined) => arr?.reduce((a, b) => a + b, 0) ?? 0;
  const recent3 = (arr: number[] | undefined) => arr?.slice(-3).reduce((a, b) => a + b, 0) ?? 0;
  const prev3 = (arr: number[] | undefined) => arr?.slice(0, 3).reduce((a, b) => a + b, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* ====== 今日概览横幅 ====== */}
      <div className="card !p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-white to-primary/5 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-text-muted text-caption">{todayStr}</p>
              <h2 className="text-heading-sm text-text-title mt-0.5">社区运营概览</h2>
            </div>
            <div className="flex items-center gap-5">
              {[
                { icon: UserPlus, label: '新用户', value: stats?.todayUsers },
                { icon: TrendingUp, label: '新帖子', value: stats?.todayPosts },
                { icon: MessageSquare, label: '新评论', value: stats?.todayComments },
                { icon: Eye, label: '今日访问', value: stats?.todayViews },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-heading-sm text-text-title leading-none">{item.value ?? '—'}</p>
                    <p className="text-caption text-text-muted">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ====== 待处理提醒 ====== */}
      {stats && stats.pendingFeedbacks > 0 && (
        <Link
          href="/admin/feedback"
          className="flex items-center gap-3 px-4 py-3 rounded-card bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors group"
        >
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
          <span className="text-body text-text-body">
            你有 <strong className="text-warning">{stats.pendingFeedbacks}</strong> 条待处理反馈
          </span>
          <ArrowRight className="w-4 h-4 text-text-muted ml-auto group-hover:text-warning transition-colors" />
        </Link>
      )}

      {/* ====== 核心数据 ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[
          { key: 'users', label: '用户', icon: Users, color: 'text-primary bg-primary-bg' },
          { key: 'posts', label: '帖子', icon: FileText, color: 'text-success bg-green-50' },
          { key: 'comments', label: '评论', icon: MessageSquare, color: 'text-warning bg-orange-50' },
          { key: 'feedbacks', label: '反馈', icon: MessageSquarePlus, color: 'text-danger bg-red-50' },
        ].map((card) => (
          <div key={card.key} className="card flex items-center gap-3">
            <div className={`w-10 h-10 rounded-btn flex items-center justify-center ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-caption text-text-muted">{card.label}</p>
              <p className="text-heading-sm text-text-title">
                {stats ? (stats[card.key as keyof Stats] as number ?? 0).toLocaleString() : '—'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ====== 增长趋势（7天） ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: '用户增长', trendKey: 'users' as const, icon: UserPlus, barColor: 'bg-primary', total: sum(trend?.users), todayVal: stats?.todayUsers ?? 0 },
          { label: '帖子增长', trendKey: 'posts' as const, icon: FileText, barColor: 'bg-success', total: sum(trend?.posts), todayVal: stats?.todayPosts ?? 0 },
          { label: '评论增长', trendKey: 'comments' as const, icon: MessageSquare, barColor: 'bg-warning', total: sum(trend?.comments), todayVal: stats?.todayComments ?? 0 },
          { label: '网站访问', trendKey: 'views' as const, icon: Eye, barColor: 'bg-purple-500', total: sum(trend?.views), todayVal: stats?.todayViews ?? 0 },
        ].map((item) => {
          const data = trend?.[item.trendKey] ?? [];
          return (
            <div key={item.trendKey} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <item.icon className="w-4 h-4 text-text-muted" />
                  <span className="text-caption text-text-muted">{item.label}</span>
                </div>
                <GrowthBadge current={recent3(trend?.[item.trendKey])} previous={prev3(trend?.[item.trendKey])} />
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-heading-sm text-text-title">{item.total}</p>
                  <p className="text-caption text-text-muted">近7天</p>
                </div>
                <MiniBarChart data={data} color={item.barColor} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ====== 内容数据 + 活跃数据 ====== */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'events', label: '活动', icon: Calendar, color: 'text-primary' },
          { key: 'albums', label: '相册', icon: Image, color: 'text-success' },
          { key: 'photos', label: '照片', icon: Image, color: 'text-warning' },
          { key: 'games', label: '游戏', icon: Gamepad2, color: 'text-danger' },
          { key: 'media', label: '媒体', icon: FolderOpen, color: 'text-primary' },
          { key: 'activeUsers', label: '活跃用户', icon: Activity, color: 'text-purple-500' },
        ].map((card) => (
          <div key={card.key} className="bg-white rounded-card px-4 py-3 border border-divider flex items-center gap-2.5">
            <card.icon className={`w-4 h-4 ${card.color} flex-shrink-0`} />
            <span className="text-caption text-text-muted">{card.label}</span>
            <span className="text-body font-semibold text-text-title ml-auto">
              {stats ? (stats[card.key as keyof Stats] as number ?? 0).toLocaleString() : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* ====== 访问量统计 + 快速操作 ====== */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* 访问量详情 */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-body font-semibold text-text-title flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-primary" />
              7日访问趋势
            </h3>
            <div className="flex items-center gap-3 text-caption text-text-muted">
              <span>30天总访问: <strong className="text-text-title">{stats?.totalViews30d?.toLocaleString() ?? '—'}</strong></span>
            </div>
          </div>
          {!stats ? (
            <div className="py-8 text-center text-text-muted text-caption">加载中...</div>
          ) : (
            <div className="space-y-1">
              {trend?.dates?.map((date, i) => {
                const views = trend.views?.[i] ?? 0;
                const maxView = Math.max(...trend.views, 1);
                const pct = (views / maxView) * 100;
                const weekday = new Date(date).toLocaleDateString('zh-CN', { weekday: 'short' });
                return (
                  <div key={date} className="flex items-center gap-3 py-1.5">
                    <span className="text-caption text-text-muted w-20 flex-shrink-0">
                      {date.slice(5)} {weekday}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="bg-primary/70 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      >
                        {pct > 15 && <span className="text-[10px] text-white font-medium">{views}</span>}
                      </div>
                    </div>
                    {pct <= 15 && <span className="text-caption text-text-muted w-8">{views}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 快速操作 */}
        <div className="card">
          <h3 className="text-body font-semibold text-text-title mb-3">快速操作</h3>
          <div className="space-y-2">
            {[
              { label: '发布帖子', href: '/admin/posts', icon: Plus, color: 'text-primary bg-primary-bg' },
              { label: '创建活动', href: '/admin/events', icon: Calendar, color: 'text-success bg-green-50' },
              { label: '上传图片', href: '/admin/media', icon: Upload, color: 'text-warning bg-orange-50' },
              { label: '添加游戏', href: '/admin/games', icon: Gamepad2, color: 'text-danger bg-red-50' },
              { label: '用户管理', href: '/admin/users', icon: Users, color: 'text-primary bg-primary-bg' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-2.5 p-2.5 rounded-btn border border-divider hover:border-primary hover:bg-primary-bg/30 transition-colors group"
              >
                <div className={`w-8 h-8 rounded-btn flex items-center justify-center ${action.color}`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <span className="text-body text-text-body group-hover:text-primary transition-colors">{action.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ====== 最近反馈 ====== */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-body font-semibold text-text-title flex items-center gap-1.5">
            <MessageSquarePlus className="w-4 h-4 text-warning" />
            最近反馈
          </h3>
          <Link href="/admin/feedback" className="text-caption text-primary hover:text-primary-hover transition-colors">
            查看全部 →
          </Link>
        </div>
        {!stats ? (
          <div className="py-6 text-center text-text-muted text-caption">加载中...</div>
        ) : !stats.recentFeedbacks?.length ? (
          <div className="py-6 text-center text-text-muted text-caption">暂无反馈</div>
        ) : (
          <div className="space-y-0 divide-y divide-divider">
            {stats.recentFeedbacks?.map((fb) => {
              const st = feedbackStatusMap[fb.status] || feedbackStatusMap.pending;
              return (
                <div key={fb.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`tag text-caption !h-5 ${st.cls}`}>{st.label}</span>
                    <span className="tag-muted text-caption !h-5">{feedbackTypeMap[fb.type] || fb.type}</span>
                    <span className="text-caption text-text-muted ml-auto">{timeAgo(fb.createdAt)}</span>
                  </div>
                  <p className="text-body text-text-body truncate">{fb.content}</p>
                  {fb.user && <p className="text-caption text-text-muted mt-0.5">{fb.user.name}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
