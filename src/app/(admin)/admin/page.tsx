'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  MessageSquare,
  ImageIcon,
  Megaphone,
  BarChart3,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useAdminAuth } from '@/components/AdminAuthProvider';
import { api } from '@/lib/api';

interface Stats {
  users: number;
  feedback: number;
  media: number;
  announcements: number;
  admins: number;
  todayUsers: number;
  todayFeedback: number;
  pendingFeedback: number;
}

export default function AdminDashboardPage() {
  const { admin, isLoggedIn } = useAdminAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/admin/login');
      return;
    }
    loadStats();
  }, [isLoggedIn, router]);

  const loadStats = async () => {
    try {
      const res = await api.get('/api/admin/stats');
      if (res.ok && res.data) {
        setStats(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const cards = [
    { key: 'users', label: '用户', icon: Users, href: '/admin/users', color: 'text-blue-500' },
    { key: 'feedback', label: '反馈', icon: MessageSquare, href: '/admin/feedback', color: 'text-yellow-500' },
    { key: 'media', label: '媒体', icon: ImageIcon, href: '/admin/media', color: 'text-purple-500' },
    { key: 'announcements', label: '公告', icon: Megaphone, href: '/admin/announcements', color: 'text-green-500' },
  ];

  if (!isLoggedIn || !admin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 欢迎区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理后台</h1>
          <p className="text-muted-foreground mt-1">
            欢迎回来，{admin.name} ({admin.role === 'super_admin' ? '超级管理员' : admin.role === 'admin' ? '管理员' : '编辑'})
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4" />
          <span>权限正常</span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const value = stats ? (stats[card.key as keyof Stats] as number) ?? 0 : 0;
          return (
            <div
              key={card.key}
              className="bg-card rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(card.href)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">
                    {isLoading ? '-' : value.toLocaleString()}
                  </p>
                </div>
                <Icon className={`w-8 h-8 ${card.color} opacity-60`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 今日概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm font-medium flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" />
            今日新增用户
          </p>
          <p className="text-2xl font-bold">
            {isLoading ? '-' : stats?.todayUsers ?? 0}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm font-medium flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4" />
            今日反馈
          </p>
          <p className="text-2xl font-bold">
            {isLoading ? '-' : stats?.todayFeedback ?? 0}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm font-medium flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            待处理反馈
          </p>
          <p className="text-2xl font-bold">
            {isLoading ? '-' : stats?.pendingFeedback ?? 0}
          </p>
          {stats && stats.pendingFeedback > 0 && (
            <button
              type="button"
              className="text-sm mt-2 text-primary hover:underline flex items-center gap-1"
              onClick={() => router.push('/admin/feedback')}
            >
              去处理
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-card rounded-lg border p-4">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5" />
          快速操作
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-divider px-4 py-2.5 text-sm font-medium text-text-body hover:bg-muted transition-colors"
            onClick={() => router.push('/admin/announcements/new')}
          >
            <Megaphone className="w-4 h-4" />
            发布公告
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-divider px-4 py-2.5 text-sm font-medium text-text-body hover:bg-muted transition-colors"
            onClick={() => router.push('/admin/feedback')}
          >
            <MessageSquare className="w-4 h-4" />
            处理反馈
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-divider px-4 py-2.5 text-sm font-medium text-text-body hover:bg-muted transition-colors"
            onClick={() => router.push('/admin/media')}
          >
            <ImageIcon className="w-4 h-4" />
            审核媒体
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-divider px-4 py-2.5 text-sm font-medium text-text-body hover:bg-muted transition-colors"
            onClick={() => router.push('/admin/users')}
          >
            <Users className="w-4 h-4" />
            管理用户
          </button>
        </div>
      </div>
    </div>
  );
}
