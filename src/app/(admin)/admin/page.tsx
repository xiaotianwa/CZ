'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, BarChart3, FolderOpen, Gamepad2, MessageSquarePlus, Users } from 'lucide-react';
import { adminGet } from '@/lib/admin-fetch';

interface RecentFeedback {
  id: string;
  type: string;
  content: string;
  status: string;
  createdAt: string;
  user: { name: string } | null;
}

interface Stats {
  users: number;
  games: number;
  media: number;
  feedbacks: number;
  pendingFeedbacks: number;
  todayUsers: number;
  todayViews: number;
  totalViews30d: number;
  activeUsers: number;
  trend: {
    dates: string[];
    users: number[];
    views: number[];
  };
  recentFeedbacks: RecentFeedback[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGet<Stats>('/api/admin/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="card text-danger">{error}</div>;

  const cards = [
    { key: 'users', label: '用户', icon: Users, href: '/admin/users' },
    { key: 'games', label: '游戏', icon: Gamepad2, href: '/admin/games' },
    { key: 'media', label: '媒体', icon: FolderOpen, href: '/admin/media' },
    { key: 'feedbacks', label: '反馈', icon: MessageSquarePlus, href: '/admin/feedback' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="card !p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-white to-primary/5 p-5">
          <p className="text-text-muted text-caption">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
          <h2 className="text-heading-sm text-text-title mt-0.5">运营概览</h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-5">
            <div>
              <p className="text-caption text-text-muted">今日新用户</p>
              <p className="text-heading-sm text-text-title">{stats?.todayUsers ?? '-'}</p>
            </div>
            <div>
              <p className="text-caption text-text-muted">今日访问</p>
              <p className="text-heading-sm text-text-title">{stats?.todayViews ?? '-'}</p>
            </div>
            <div>
              <p className="text-caption text-text-muted">30 天访问</p>
              <p className="text-heading-sm text-text-title">{stats?.totalViews30d ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {stats && stats.pendingFeedbacks > 0 && (
        <Link href="/admin/feedback" className="card flex items-center gap-3 hover:border-primary transition-colors">
          <MessageSquarePlus className="w-5 h-5 text-warning" />
          <span className="text-body text-text-body">有 {stats.pendingFeedbacks} 条反馈待处理</span>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.key} href={card.href} className="card flex items-center gap-3 hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-10 h-10 rounded-btn bg-primary-bg flex items-center justify-center">
              <card.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-caption text-text-muted">{card.label}</p>
              <p className="text-heading-sm text-text-title">{stats ? Number(stats[card.key] ?? 0).toLocaleString() : '-'}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-body font-semibold text-text-title flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            访问趋势
          </h3>
          <div className="space-y-2">
            {(stats?.trend?.dates ?? []).map((date, i) => {
              const views = stats?.trend?.views ?? [];
              const value = views[i] ?? 0;
              const max = Math.max(...views, 1);
              return (
                <div key={date} className="flex items-center gap-3">
                  <span className="text-caption text-text-muted w-16">{date.slice(5)}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
                  </div>
                  <span className="text-caption text-text-muted w-10 text-right">{value}</span>
                </div>
              );
            }) ?? <p className="text-caption text-text-muted">加载中...</p>}
          </div>
        </div>

        <div className="card">
          <h3 className="text-body font-semibold text-text-title flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            最近反馈
          </h3>
          <div className="divide-y divide-divider">
            {stats?.recentFeedbacks?.length ? stats.recentFeedbacks.map((fb) => (
              <div key={fb.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-body text-text-body line-clamp-1">{fb.content}</p>
                <p className="text-caption text-text-muted mt-1">{fb.user?.name || '匿名'} · {fb.status}</p>
              </div>
            )) : <p className="text-caption text-text-muted">暂无反馈</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
