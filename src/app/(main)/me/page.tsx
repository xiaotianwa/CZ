'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, CalendarDays, Loader2, LogOut, Shield, UserRound } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: string;
  level: number;
  badge?: string | null;
  points: number;
  createdAt: string;
}

export default function MePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((json) => {
        if (json.code === 0 && json.data) setUser(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .finally(() => {
        localStorage.removeItem('user');
        window.location.href = '/';
      });
  };

  if (loading) {
    return (
      <div className="pt-14 min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-14 min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <UserRound className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="text-body text-text-muted">请先登录</p>
          <Link href="/login" className="btn-primary mt-4 inline-flex">去登录</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-14 min-h-screen bg-gray-50">
      <div className="container-main px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <aside className="card p-6">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-primary-bg flex-shrink-0">
                {user.avatar ? (
                  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary text-heading-sm font-bold">{user.name[0]}</div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-heading-sm text-text-title truncate">{user.name}</h1>
                <p className="text-caption text-text-muted truncate">{user.email}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-body">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">角色</span>
                <span className="font-medium text-text-title">{user.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">等级</span>
                <span className="font-medium text-text-title">Lv.{user.level}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">积分</span>
                <span className="font-medium text-text-title">{user.points}</span>
              </div>
              {user.badge && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">徽章</span>
                  <span className="tag-primary">{user.badge}</span>
                </div>
              )}
            </div>

            <button onClick={logout} className="btn-outline mt-6 w-full inline-flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </aside>

          <main className="space-y-4">
            <Link href="/me?tab=notifications" className="card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-200">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <p className="text-body font-medium text-text-title">消息通知</p>
                <p className="text-caption text-text-muted">查看系统通知与站内消息</p>
              </div>
            </Link>
            <Link href="/me?tab=points" className="card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-200">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="text-body font-medium text-text-title">积分记录</p>
                <p className="text-caption text-text-muted">查看登录与管理发放的积分变化</p>
              </div>
            </Link>
            <div className="card p-5 flex items-center gap-4">
              <CalendarDays className="w-5 h-5 text-primary" />
              <div>
                <p className="text-body font-medium text-text-title">加入时间</p>
                <p className="text-caption text-text-muted">{new Date(user.createdAt).toLocaleString('zh-CN')}</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
