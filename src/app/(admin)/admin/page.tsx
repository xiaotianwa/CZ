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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
            <Card key={card.key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(card.href)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">
                      {isLoading ? '-' : value.toLocaleString()}
                    </p>
                  </div>
                  <Icon className={`w-8 h-8 ${card.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 今日概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              今日新增用户
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? '-' : stats?.todayUsers ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              今日反馈
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? '-' : stats?.todayFeedback ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              待处理反馈
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? '-' : stats?.pendingFeedback ?? 0}
            </p>
            {stats && stats.pendingFeedback > 0 && (
              <Button
                variant="link"
                className="p-0 h-auto text-sm mt-2"
                onClick={() => router.push('/admin/feedback')}
              >
                去处理
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            快速操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="justify-start" onClick={() => router.push('/admin/announcements/new')}>
              <Megaphone className="w-4 h-4 mr-2" />
              发布公告
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => router.push('/admin/feedback')}>
              <MessageSquare className="w-4 h-4 mr-2" />
              处理反馈
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => router.push('/admin/media')}>
              <ImageIcon className="w-4 h-4 mr-2" />
              审核媒体
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => router.push('/admin/users')}>
              <Users className="w-4 h-4 mr-2" />
              管理用户
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
