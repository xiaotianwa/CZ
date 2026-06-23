'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LogOut,
  User,
  Settings,
  Trash2,
  ChevronRight,
  ShieldCheck,
  MessageSquarePlus,
  ImageUp,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { UserProfileForm } from '@/components/UserProfileForm';
import { UserAvatarUpload } from '@/components/UserAvatarUpload';
import { UserMediaGallery } from '@/components/UserMediaGallery';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  city?: string;
  province?: string;
  createdAt: string;
}

interface FeedbackItem {
  id: string;
  type: string;
  content: string;
  status: string;
  createdAt: string;
  reply?: string | null;
  repliedAt?: string | null;
}

export default function MePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 获取用户信息
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data?.user) {
          setUser(json.data.user);
          setIsLoggedIn(true);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // 加载反馈列表
  const loadFeedback = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsFeedbackLoading(true);
    try {
      const res = await api.get('/api/auth/feedback');
      if (res.ok && Array.isArray(res.data)) {
        setFeedbackList(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsFeedbackLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (activeTab === 'feedback') {
      loadFeedback();
    }
  }, [activeTab, loadFeedback]);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      const json = await res.json();
      if (json.code === 0 && json.data?.user) {
        setUser(json.data.user);
      }
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    setIsLoading(false);
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '确定要注销账号吗？此操作不可恢复，您的所有数据将被永久删除。'
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const res = await api.delete('/api/auth/me');
      if (res.ok) {
        toast({ title: '账号已注销', description: '您的账号和所有数据已被删除' });
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        router.push('/');
      } else {
        toast({
          title: '注销失败',
          description: res.message || '请稍后重试',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: User, label: '个人资料', tab: 'profile' },
    { icon: ImageUp, label: '我的相册', tab: 'gallery' },
    { icon: MessageSquarePlus, label: '我的反馈', tab: 'feedback' },
    { icon: Settings, label: '账号设置', tab: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部用户信息 */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-background shadow-lg">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <User className="w-8 h-8 text-primary/60" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                注册于 {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab 导航 */}
        <div className="w-full grid grid-cols-4 mb-6 border-b">
          {menuItems.map((item) => (
            <button
              key={item.tab}
              type="button"
              className={cn(
                'flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === item.tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-text-body'
              )}
              onClick={() => setActiveTab(item.tab)}
            >
              <item.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>

        {/* 个人资料 */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                编辑资料
              </h2>
              <UserProfileForm user={user} onSuccess={refreshUser} />
            </div>
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">头像设置</h2>
              <UserAvatarUpload currentAvatar={user.avatar} onSuccess={refreshUser} />
            </div>
          </div>
        )}

        {/* 我的相册 */}
        {activeTab === 'gallery' && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ImageUp className="w-5 h-5" />
              我的相册
            </h2>
            <UserMediaGallery />
          </div>
        )}

        {/* 我的反馈 */}
        {activeTab === 'feedback' && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5" />
              我的反馈
            </h2>
            {isFeedbackLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">加载中...</p>
              </div>
            ) : feedbackList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无反馈记录</p>
                <p className="text-sm mt-1">遇到问题？去反馈页面提交建议吧</p>
                <button
                  type="button"
                  className="btn-primary mt-4 px-4 py-2 rounded-lg text-sm"
                  onClick={() => router.push('/feedback')}
                >
                  去反馈
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackList.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{item.type}</span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          item.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : item.status === 'replied'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {item.status === 'pending'
                          ? '待处理'
                          : item.status === 'replied'
                            ? '已回复'
                            : '已处理'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{item.content}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                    {item.reply && (
                      <div className="mt-3 bg-muted rounded-lg p-3">
                        <p className="text-sm font-medium mb-1">管理员回复：</p>
                        <p className="text-sm">{item.reply}</p>
                        {item.repliedAt && (
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(item.repliedAt)}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 账号设置 */}
        {activeTab === 'settings' && (
          <div className="bg-card rounded-lg border p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              账号设置
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">修改密码</p>
                  <p className="text-sm text-muted-foreground">定期更换密码可提高账号安全性</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-divider px-4 py-2 text-sm font-medium text-text-body hover:bg-muted transition-colors"
                  onClick={() => router.push('/settings/password')}
                >
                  修改
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    账号安全
                  </p>
                  <p className="text-sm text-muted-foreground">邮箱已验证，账号状态正常</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-divider px-4 py-2.5 text-sm font-medium text-text-body hover:bg-muted transition-colors disabled:opacity-50"
                onClick={handleLogout}
                disabled={isLoading}
              >
                <LogOut className="w-4 h-4" />
                {isLoading ? '退出中...' : '退出登录'}
              </button>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                onClick={handleDeleteAccount}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" />
                注销账号
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
