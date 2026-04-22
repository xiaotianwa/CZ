'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  User, FileText, MessageCircle, Trophy, Lock,
  Edit3, Camera, Save, X, Heart, ChevronRight,
  Shield, Star, Award, Zap, Clock, Eye, EyeOff,
  LogOut, AlertCircle, Check, Trash2, Loader2, MapPin, Search, ChevronDown,
  Bookmark, Bell, Pin,
} from 'lucide-react';
import { CITY_GROUPS } from '@/data/cities';
import { MAX_LEVEL, POINTS_PER_LEVEL, getLevelInfo, getLevelRange } from '@/lib/level';

// ===== Types =====

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  level: number;
  badge: string | null;
  points: number;
  bio: string | null;
  city: string | null;
  createdAt: string;
  joinOrder?: number;
}

interface PostItem {
  id: string;
  content: string;
  images: string;
  likes: number;
  status: string;
  createdAt: string;
  postTags: { tag: { name: string } }[];
  _count: { comments: number };
}

interface CommentItem {
  id: string;
  content: string;
  likes: number;
  createdAt: string;
  post: { id: string; content: string };
}

interface PointLogItem {
  id: string;
  action: string;
  points: number;
  detail: string | null;
  createdAt: string;
}

type TabKey = 'profile' | 'posts' | 'comments' | 'bookmarks' | 'notifications' | 'level' | 'security';

const tabs: { key: TabKey; label: string; icon: typeof User }[] = [
  { key: 'profile', label: '个人资料', icon: User },
  { key: 'posts', label: '我的帖子', icon: FileText },
  { key: 'comments', label: '我的评论', icon: MessageCircle },
  { key: 'bookmarks', label: '我的收藏', icon: Bookmark },
  { key: 'notifications', label: '消息通知', icon: Bell },
  { key: 'level', label: '积分等级', icon: Trophy },
  { key: 'security', label: '账号安全', icon: Lock },
];

// ===== Helpers =====

async function authFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<{ code: number; message: string; data: T }> {
  const res = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || `请求失败 (${res.status})`);
  }
  return json;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(date).toLocaleDateString('zh-CN');
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getRoleName(role: string): string {
  switch (role) {
    case 'star': return '董事长';
    case 'assistant': return '传媒成员';
    case 'admin': return '管理员';
    default: return '粉丝';
  }
}

function LevelBadge({ level, name, color, prefix }: { level: number; name: string; color: string; prefix?: string }) {
  if (level < MAX_LEVEL) {
    return <span className={`tag text-white ${color}`}>{prefix ? `${prefix} ${name}` : name}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#7c3aed] px-2.5 py-1 text-white shadow-[0_8px_20px_rgba(59,130,246,0.22)] ring-1 ring-white/15">
      {prefix && <span className="rounded-full bg-white/16 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">{prefix}</span>}
      <Star className="w-3 h-3 text-[#ffe7a3] fill-[#ffe7a3]" />
      <span className="font-waterbrush text-[15px] leading-none text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.25)]">1103</span>
    </span>
  );
}

// ===== Confirm Modal =====

function ConfirmModal({ open, title, message, loading, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  message: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#1e1e22] rounded-card shadow-dropdown border border-divider w-full max-w-sm mx-4 p-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h3 className="text-body font-semibold text-text-title">{title}</h3>
            <p className="text-caption text-text-muted mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-outline h-9 px-4 text-caption"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="h-9 px-4 rounded-btn text-caption font-medium text-white bg-danger hover:bg-red-600 transition-colors duration-150 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {loading ? '删除中...' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Toast Component =====

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-card shadow-dropdown border ${
        type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-danger'
      }`}>
        {type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        <span className="text-body font-medium">{message}</span>
      </div>
    </div>
  );
}

// ===== Main Page =====

export default function MePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    authFetch<UserProfile>('/api/auth/me')
      .then((res) => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('user');
        router.push('/login');
      });
  }, [router]);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .finally(() => {
        localStorage.removeItem('user');
        router.push('/');
      });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14">
        <div className="text-body text-text-muted">加载中...</div>
      </div>
    );
  }

  const levelInfo = getLevelInfo(user.level);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Cover */}
      <section className="relative h-40 sm:h-48 bg-gray-900 overflow-hidden mt-14">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1890ff]/80 via-[#096dd9]/60 to-gray-900" />
        <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
          <span className="font-waterbrush text-[80px] sm:text-[120px] leading-none text-white/[0.06]">
            1103
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-page to-transparent" />
      </section>

      {/* User Header Card */}
      <section className="container-main px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-10 animate-fade-in-up">
        <div className="card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-3 border-white dark:border-[#28282c] shadow-card -mt-14 sm:-mt-16 flex-shrink-0 bg-gray-100 dark:bg-[#28282c]">
              {user.avatar ? (
                <Image src={user.avatar} alt={user.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-bg">
                  <span className="text-heading font-bold text-primary">{user.name[0]}</span>
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-heading-sm text-text-title">{user.name}</h1>
                <span className="tag-primary">{getRoleName(user.role)}</span>
                <LevelBadge level={user.level} name={levelInfo.name} color={levelInfo.color} prefix={`Lv.${user.level}`} />
              </div>
              <p className="text-caption text-text-muted mt-1">{user.bio || '这个人很懒，什么都没写~'}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mt-2 text-caption text-text-muted">
                <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-warning" /> {user.points} 积分</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDate(user.createdAt)} 加入</span>
              </div>
            </div>
            <div className="w-full sm:w-auto flex justify-center sm:justify-end mt-1 sm:mt-0">
              <button
                onClick={handleLogout}
                className="btn-outline inline-flex items-center gap-1.5 h-9 px-4 text-caption text-text-muted hover:text-danger hover:border-danger"
              >
                <LogOut className="w-3.5 h-3.5" /> 退出
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container-main px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar Tabs */}
          <nav className="grid grid-cols-3 sm:grid-cols-4 lg:flex lg:flex-col gap-2 lg:gap-1.5 pb-1 lg:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center lg:justify-start gap-1.5 lg:gap-2 px-2.5 sm:px-3.5 lg:px-4 py-2.5 rounded-btn text-caption sm:text-body font-medium transition-colors duration-150 cursor-pointer min-h-[40px] ${
                  activeTab === tab.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-body hover:bg-gray-50 dark:hover:bg-[#28282c] hover:text-primary'
                }`}
              >
                <tab.icon className="hidden lg:block w-4 h-4" />
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <div className="min-w-0">
            {activeTab === 'profile' && <ProfileTab user={user} onUpdate={setUser} showToast={showToast} />}
            {activeTab === 'posts' && <PostsTab showToast={showToast} />}
            {activeTab === 'comments' && <CommentsTab showToast={showToast} />}
            {activeTab === 'bookmarks' && <BookmarksTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'level' && <LevelTab user={user} />}
            {activeTab === 'security' && <SecurityTab showToast={showToast} />}
          </div>
        </div>
      </section>
    </>
  );
}

// ===== Profile Tab =====

function ProfileTab({ user, onUpdate, showToast }: { user: UserProfile; onUpdate: (u: UserProfile) => void; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: user.name, bio: user.bio || '', city: user.city || '' });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('昵称不能为空', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch<UserProfile>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: form.name.trim(), bio: form.bio.trim(), city: form.city.trim() || null }),
      });
      onUpdate(res.data);
      localStorage.setItem('user', JSON.stringify({ id: res.data.id, email: res.data.email, name: res.data.name, avatar: res.data.avatar, role: res.data.role }));
      setEditing(false);
      showToast('资料更新成功', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('头像大小不能超过2MB', 'error');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/auth/upload-avatar', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      onUpdate({ ...user, avatar: json.data.url });
      localStorage.setItem('user', JSON.stringify({ id: user.id, email: user.email, name: user.name, avatar: json.data.url, role: user.role }));
      showToast('头像更新成功', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '上传失败', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-heading-sm text-text-title">个人资料</h2>
          {!editing ? (
            <button onClick={() => { setForm({ name: user.name, bio: user.bio || '', city: user.city || '' }); setEditing(true); }} className="btn-outline inline-flex items-center gap-1.5 h-8 px-3 text-caption">
              <Edit3 className="w-3.5 h-3.5" /> 编辑
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-outline inline-flex items-center gap-1.5 h-8 px-3 text-caption">
                <X className="w-3.5 h-3.5" /> 取消
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-1.5 h-8 px-3 text-caption disabled:opacity-50">
                <Save className="w-3.5 h-3.5" /> {saving ? '保存中...' : '保存'}
              </button>
            </div>
          )}
        </div>

        {/* 注册顺序徽章 */}
        {user.joinOrder && user.joinOrder > 0 && (
          <div className="mb-5 sm:mb-6 rounded-card bg-gradient-to-r from-primary/10 via-primary/5 to-amber-50 dark:from-primary/20 dark:via-primary/10 dark:to-amber-900/10 border border-primary/20 dark:border-primary/30 p-4 flex items-center gap-3 animate-fade-in-up">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center flex-shrink-0 shadow-sm">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body text-text-body leading-snug">
                你是第{' '}
                <span className="font-bold text-primary text-heading-sm">
                  {user.joinOrder.toLocaleString()}
                </span>{' '}
                位进入该社区的泽小将
              </p>
              <p className="text-caption text-text-muted mt-0.5">感谢你的到来，始于热爱，聚于 1103 ✨</p>
            </div>
          </div>
        )}

        {/* Avatar */}
        <div className="flex items-start sm:items-center gap-4 pb-5 sm:pb-6 border-b border-divider">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-[#28282c] flex-shrink-0">
              {user.avatar ? (
                <Image src={user.avatar} alt={user.name} width={64} height={64} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-bg">
                  <span className="text-heading-sm font-bold text-primary">{user.name[0]}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center cursor-pointer"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <div>
            <p className="text-body font-medium text-text-title">头像</p>
            <p className="text-caption text-text-muted">支持 JPG/PNG/WebP，最大 2MB</p>
            {uploading && <p className="text-caption text-primary mt-0.5">上传中...</p>}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4 sm:space-y-5 mt-5 sm:mt-6">
          <div className="grid grid-cols-[78px_1fr] sm:grid-cols-[120px_1fr] gap-3 items-start">
            <label className="text-body font-medium text-text-muted pt-1.5 sm:pt-2">昵称</label>
            {editing ? (
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={20}
                className="h-10 px-3 rounded-btn border border-border bg-white dark:bg-[#28282c] text-body text-text-title focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-150"
              />
            ) : (
              <p className="text-body text-text-title pt-1.5 sm:pt-2 break-words">{user.name}</p>
            )}
          </div>

          <div className="grid grid-cols-[78px_1fr] sm:grid-cols-[120px_1fr] gap-3 items-start">
            <label className="text-body font-medium text-text-muted pt-1.5 sm:pt-2">邮箱</label>
            <p className="text-body text-text-title pt-1.5 sm:pt-2 break-all">{user.email}</p>
          </div>

          <div className="grid grid-cols-[78px_1fr] sm:grid-cols-[120px_1fr] gap-3 items-start">
            <label className="text-body font-medium text-text-muted pt-1.5 sm:pt-2">角色</label>
            <p className="text-body text-text-title pt-1.5 sm:pt-2">{getRoleName(user.role)}</p>
          </div>

          <div className="grid grid-cols-[78px_1fr] sm:grid-cols-[120px_1fr] gap-3 items-start">
            <label className="text-body font-medium text-text-muted pt-1.5 sm:pt-2">位置</label>
            {editing ? (
              <CitySelect value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            ) : (
              <p className="text-body text-text-title pt-1.5 sm:pt-2 flex items-center gap-1.5 break-words">
                {user.city ? (<><MapPin className="w-3.5 h-3.5 text-primary" />{user.city}</>) : <span className="text-text-muted">未设置</span>}
              </p>
            )}
          </div>

          <div className="grid grid-cols-[78px_1fr] sm:grid-cols-[120px_1fr] gap-3 items-start">
            <label className="text-body font-medium text-text-muted pt-1.5 sm:pt-2">签名</label>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                maxLength={200}
                rows={3}
                placeholder="介绍一下你自己吧..."
                className="px-3 py-2 rounded-btn border border-border bg-white dark:bg-[#28282c] text-body text-text-title placeholder:text-text-disabled resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-150"
              />
            ) : (
              <p className="text-body text-text-body pt-1.5 sm:pt-2 break-words">{user.bio || '暂未设置'}</p>
            )}
          </div>

          <div className="grid grid-cols-[78px_1fr] sm:grid-cols-[120px_1fr] gap-3 items-start">
            <label className="text-body font-medium text-text-muted pt-1.5 sm:pt-2">注册</label>
            <p className="text-body text-text-title pt-1.5 sm:pt-2 break-words">{formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Posts Tab =====

function PostsTab({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 0 });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = async (postId: string) => {
    setDeletingId(postId);
    try {
      await authFetch('/api/auth/posts/' + postId, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      showToast('帖子已删除', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await authFetch<{ list: PostItem[]; pagination: { total: number; page: number; totalPages: number } }>(`/api/auth/my-posts?page=${page}&pageSize=10`);
      setPosts(res.data.list);
      setPagination(res.data.pagination);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  if (loading) return <div className="card p-12 text-center text-body text-text-muted">加载中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-heading-sm text-text-title">我的帖子</h2>
        <span className="text-caption text-text-muted">共 {pagination.total} 篇</span>
      </div>

      {posts.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="text-body text-text-muted">还没有发过帖子</p>
          <p className="text-caption text-text-disabled mt-1">去社区发一条动态吧~</p>
        </div>
      ) : (
        <>
          {posts.map((post) => {
            const tags = post.postTags?.map((pt) => pt.tag.name) || [];
            return (
              <div key={post.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-text-body leading-relaxed line-clamp-3">{post.content}</p>
                    {tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {tags.map((tag) => <span key={tag} className="text-caption text-primary">#{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <span className={`tag flex-shrink-0 ${post.status === 'published' ? 'bg-green-50 dark:bg-green-900/20 text-success' : post.status === 'hidden' ? 'bg-red-50 dark:bg-red-900/20 text-danger' : 'bg-gray-100 dark:bg-[#28282c] text-text-muted'}`}>
                    {post.status === 'published' ? '已发布' : post.status === 'hidden' ? '已隐藏' : '草稿'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-divider text-caption text-text-muted">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {post.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {post._count.comments}</span>
                  <span className="ml-auto">{timeAgo(post.createdAt)}</span>
                  <button
                    onClick={() => setConfirmId(post.id)}
                    className="flex items-center gap-1 text-text-muted hover:text-danger transition-colors duration-150 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 删除
                  </button>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchPosts(p)}
                  className={`w-8 h-8 rounded-btn text-caption font-medium transition-colors duration-150 cursor-pointer ${
                    p === pagination.page ? 'bg-primary text-white' : 'text-text-muted hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!confirmId}
        title="删除帖子"
        message="删除后无法恢复，帖子下的所有评论也将被删除。"
        loading={!!deletingId}
        onConfirm={() => confirmId && handleDelete(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

// ===== Comments Tab =====

function CommentsTab({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 0 });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      await authFetch('/api/auth/comments/' + commentId, { method: 'DELETE' });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      showToast('评论已删除', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const fetchComments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await authFetch<{ list: CommentItem[]; pagination: { total: number; page: number; totalPages: number } }>(`/api/auth/my-comments?page=${page}&pageSize=10`);
      setComments(res.data.list);
      setPagination(res.data.pagination);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  if (loading) return <div className="card p-12 text-center text-body text-text-muted">加载中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-heading-sm text-text-title">我的评论</h2>
        <span className="text-caption text-text-muted">共 {pagination.total} 条</span>
      </div>

      {comments.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageCircle className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="text-body text-text-muted">还没有发过评论</p>
          <p className="text-caption text-text-disabled mt-1">去社区参与讨论吧~</p>
        </div>
      ) : (
        <>
          {comments.map((comment) => (
            <div key={comment.id} className="card">
              <p className="text-body text-text-body leading-relaxed">{comment.content}</p>
              <div className="mt-3 p-3 rounded-btn bg-gray-50 dark:bg-[#28282c] border border-divider">
                <div className="flex items-center gap-1 text-caption text-text-muted mb-1">
                  <ChevronRight className="w-3 h-3" /> 回复的帖子
                </div>
                <p className="text-caption text-text-body line-clamp-2">{comment.post.content}</p>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-divider text-caption text-text-muted">
                <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {comment.likes}</span>
                <span className="ml-auto">{timeAgo(comment.createdAt)}</span>
                <button
                  onClick={() => setConfirmId(comment.id)}
                  className="flex items-center gap-1 text-text-muted hover:text-danger transition-colors duration-150 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 删除
                </button>
              </div>
            </div>
          ))}

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchComments(p)}
                  className={`w-8 h-8 rounded-btn text-caption font-medium transition-colors duration-150 cursor-pointer ${
                    p === pagination.page ? 'bg-primary text-white' : 'text-text-muted hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!confirmId}
        title="删除评论"
        message="删除后无法恢复，确定要删除这条评论吗？"
        loading={!!deletingId}
        onConfirm={() => confirmId && handleDelete(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

// ===== Level Tab =====

function LevelTab({ user }: { user: UserProfile }) {
  const levelInfo = getLevelInfo(user.level);
  const levelRange = getLevelRange(user.level);
  const progress = levelRange.nextMinPoints > levelRange.currentMinPoints
    ? Math.min(100, ((user.points - levelRange.currentMinPoints) / (levelRange.nextMinPoints - levelRange.currentMinPoints)) * 100)
    : 100;

  const [logs, setLogs] = useState<PointLogItem[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [logPagination, setLogPagination] = useState({ total: 0, page: 1, totalPages: 0 });

  const fetchLogs = useCallback(async (page = 1) => {
    setLogLoading(true);
    try {
      const res = await authFetch<{ list: PointLogItem[]; pagination: { total: number; page: number; totalPages: number } }>(`/api/auth/point-logs?page=${page}&pageSize=15`);
      setLogs(res.data.list);
      setLogPagination(res.data.pagination);
    } catch { /* ignore */ }
    setLogLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actionLabels: Record<string, { label: string; icon: string }> = {
    daily_login: { label: '每日登录', icon: '🔑' },
    post: { label: '发布帖子', icon: '📝' },
    comment: { label: '发表评论', icon: '💬' },
    be_liked: { label: '被点赞', icon: '❤️' },
    event: { label: '参与活动', icon: '🎉' },
    admin_grant: { label: '管理员赠送', icon: '🎁' },
  };

  const milestones = [
    { level: 10, name: '10级小泽', points: 900, icon: Star, color: 'text-sky-500' },
    { level: 20, name: '20级小泽', points: 1900, icon: Shield, color: 'text-cyan-500' },
    { level: 30, name: '30级小泽', points: 2900, icon: Award, color: 'text-blue-500' },
    { level: 40, name: '40级小泽', points: 3900, icon: Trophy, color: 'text-violet-500' },
    { level: 50, name: '50级小泽', points: 4900, icon: Star, color: 'text-purple-500' },
    { level: 60, name: '60级小泽', points: 5900, icon: Shield, color: 'text-fuchsia-500' },
    { level: 70, name: '70级小泽', points: 6900, icon: Award, color: 'text-pink-500' },
    { level: 80, name: '80级小泽', points: 7900, icon: Trophy, color: 'text-rose-500' },
    { level: 90, name: '90级小泽', points: 8900, icon: Star, color: 'text-amber-500' },
    { level: 100, name: '100级小泽 · 1103', points: 9900, icon: Trophy, color: 'text-danger' },
  ];

  const rules = [
    { action: '每日登录', points: '+50', desc: '每天首次访问社区' },
    { action: '发帖', points: '+50', desc: '发布一篇新帖子' },
    { action: '评论', points: '+10', desc: '在帖子下评论' },
    { action: '被点赞', points: '+10', desc: '你的帖子被点赞' },
    { action: '参与活动', points: '+20', desc: '报名并参与社区活动' },
  ];

  return (
    <div className="space-y-6">
      {/* Current Level Card */}
      <div className="card p-6">
        <h2 className="text-heading-sm text-text-title mb-6">我的等级</h2>
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${levelInfo.color}`}>
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-heading-sm text-text-title">Lv.{user.level}</span>
              <LevelBadge level={user.level} name={levelInfo.name} color={levelInfo.color} />
            </div>
            <p className="text-caption text-text-muted mt-1">当前积分：{user.points}  ·  升级还需：{Math.max(0, levelRange.nextMinPoints - user.points)} 积分</p>
            <div className="mt-3 h-2 bg-gray-100 dark:bg-[#28282c] rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-caption text-text-disabled">Lv.{levelRange.currentLevel}</span>
              <span className="text-caption text-text-disabled">Lv.{levelRange.nextLevel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Point History */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-body font-semibold text-text-title">积分明细</h3>
          <span className="text-caption text-text-muted">共 {logPagination.total} 条记录</span>
        </div>
        {logLoading ? (
          <div className="py-8 text-center text-caption text-text-muted">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center">
            <Zap className="w-8 h-8 text-text-disabled mx-auto mb-2" />
            <p className="text-caption text-text-muted">暂无积分记录</p>
            <p className="text-caption text-text-disabled mt-0.5">去发帖、评论赚取积分吧~</p>
          </div>
        ) : (
          <>
            <div className="space-y-0 divide-y divide-divider">
              {logs.map((log) => {
                const info = actionLabels[log.action] || { label: log.action, icon: '⭐' };
                return (
                  <div key={log.id} className="flex items-center py-3 first:pt-0 last:pb-0">
                    <span className="text-lg mr-3 flex-shrink-0">{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-text-title">{info.label}</p>
                      <p className="text-caption text-text-muted truncate">{log.detail || info.label} · {timeAgo(log.createdAt)}</p>
                    </div>
                    <span className={`text-body font-bold flex-shrink-0 ${log.points > 0 ? 'text-success' : 'text-danger'}`}>
                      {log.points > 0 ? '+' : ''}{log.points}
                    </span>
                  </div>
                );
              })}
            </div>
            {logPagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                {Array.from({ length: logPagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchLogs(p)}
                    className={`w-8 h-8 rounded-btn text-caption font-medium transition-colors duration-150 cursor-pointer ${
                      p === logPagination.page ? 'bg-primary text-white' : 'text-text-muted hover:bg-gray-50 dark:hover:bg-[#28282c]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Milestones */}
      <div className="card p-6">
        <h3 className="text-body font-semibold text-text-title mb-4">等级里程碑</h3>
        <div className="space-y-3">
          {milestones.map((m) => {
            const reached = user.level >= m.level;
            return (
              <div key={m.level} className={`flex items-center gap-3 p-3 rounded-btn ${reached ? 'bg-primary-bg' : 'bg-gray-50 dark:bg-[#28282c]'}`}>
                <m.icon className={`w-5 h-5 ${reached ? m.color : 'text-text-disabled'}`} />
                <div className="flex-1">
                  <span className={`text-body font-medium ${reached ? 'text-text-title' : 'text-text-disabled'}`}>Lv.{m.level} {m.name}</span>
                  <span className="text-caption text-text-muted ml-2">{m.points.toLocaleString()} 积分</span>
                </div>
                {reached && <Check className="w-4 h-4 text-success" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Points Rules */}
      <div className="card p-6">
        <h3 className="text-body font-semibold text-text-title mb-4">积分规则</h3>
        <div className="space-y-0 divide-y divide-divider">
          {rules.map((r) => (
            <div key={r.action} className="flex items-center py-3 first:pt-0 last:pb-0">
              <span className="text-body font-medium text-text-title w-24">{r.action}</span>
              <span className="text-body font-bold text-primary w-16">{r.points}</span>
              <span className="text-caption text-text-muted">{r.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-caption text-text-muted mt-4">等级按每 {POINTS_PER_LEVEL} 积分提升 1 级，每 10 级提升 1 档标签等级，Lv.{MAX_LEVEL} 显示 1103 特殊标签。</p>
      </div>
    </div>
  );
}

// ===== Password Strength =====

function getPasswordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string; color: string; barColor: string } {
  if (!password) return { level: 0, label: '', color: '', barColor: 'bg-gray-200 dark:bg-gray-700' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 1, label: '弱', color: 'text-danger', barColor: 'bg-danger' };
  if (score <= 3) return { level: 2, label: '中', color: 'text-warning', barColor: 'bg-warning' };
  return { level: 3, label: '强', color: 'text-success', barColor: 'bg-success' };
}

function PasswordStrength({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (strength.level === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i <= strength.level ? strength.barColor : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      <p className={`text-caption font-medium ${strength.color}`}>
        密码强度：{strength.label}
      </p>
    </div>
  );
}

// ===== Security Tab =====

function SecurityTab({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [oldPwdStatus, setOldPwdStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  const verifyOldPassword = async () => {
    if (!form.oldPassword) { setOldPwdStatus('idle'); return; }
    setOldPwdStatus('checking');
    try {
      const res = await authFetch<{ valid: boolean }>('/api/auth/verify-password', {
        method: 'POST',
        body: JSON.stringify({ password: form.oldPassword }),
      });
      setOldPwdStatus(res.data.valid ? 'valid' : 'invalid');
    } catch {
      setOldPwdStatus('invalid');
    }
  };

  const handleChangePassword = async () => {
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      showToast('请填写所有密码字段', 'error');
      return;
    }
    if (oldPwdStatus === 'invalid') {
      showToast('当前密码不正确', 'error');
      return;
    }
    if (form.newPassword.length < 6) {
      showToast('新密码至少6位', 'error');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }
    setSaving(true);
    try {
      await authFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
      });
      showToast('密码修改成功', 'success');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setOldPwdStatus('idle');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '修改失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-heading-sm text-text-title mb-6">修改密码</h2>
        <div className="max-w-md space-y-4">
          {/* Old Password */}
          <div>
            <label className="text-body font-medium text-text-title mb-1.5 block">当前密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type={showOld ? 'text' : 'password'}
                value={form.oldPassword}
                onChange={(e) => { setForm({ ...form, oldPassword: e.target.value }); setOldPwdStatus('idle'); }}
                onBlur={verifyOldPassword}
                placeholder="请输入当前密码"
                className={`w-full h-10 pl-10 pr-10 rounded-btn border bg-white dark:bg-[#28282c] text-body text-text-title placeholder:text-text-disabled focus:outline-none focus:ring-2 transition-colors duration-150 ${
                  oldPwdStatus === 'invalid'
                    ? 'border-danger focus:border-danger focus:ring-danger/20'
                    : oldPwdStatus === 'valid'
                    ? 'border-success focus:border-success focus:ring-success/20'
                    : 'border-border focus:border-primary focus:ring-primary/20'
                }`}
              />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-body cursor-pointer">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {oldPwdStatus === 'checking' && (
              <p className="text-caption text-text-muted mt-1.5">验证中...</p>
            )}
            {oldPwdStatus === 'invalid' && (
              <p className="text-caption text-danger mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> 当前密码不正确
              </p>
            )}
            {oldPwdStatus === 'valid' && (
              <p className="text-caption text-success mt-1.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> 密码验证通过
              </p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="text-body font-medium text-text-title mb-1.5 block">新密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type={showNew ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="至少6位"
                className="w-full h-10 pl-10 pr-10 rounded-btn border border-border bg-white dark:bg-[#28282c] text-body text-text-title placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-150"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-body cursor-pointer">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.newPassword && <PasswordStrength password={form.newPassword} />}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-body font-medium text-text-title mb-1.5 block">确认新密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="再次输入新密码"
                className={`w-full h-10 pl-10 pr-10 rounded-btn border bg-white dark:bg-[#28282c] text-body text-text-title placeholder:text-text-disabled focus:outline-none focus:ring-2 transition-colors duration-150 ${
                  form.confirmPassword && form.newPassword !== form.confirmPassword
                    ? 'border-danger focus:border-danger focus:ring-danger/20'
                    : 'border-border focus:border-primary focus:ring-primary/20'
                }`}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-body cursor-pointer">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
              <p className="text-caption text-danger mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> 两次输入的密码不一致
              </p>
            )}
          </div>

          <button
            onClick={handleChangePassword}
            disabled={saving}
            className="btn-primary h-10 px-6 mt-2 disabled:opacity-50"
          >
            {saving ? '修改中...' : '确认修改'}
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div className="card p-6">
        <h3 className="text-body font-semibold text-text-title mb-4">安全提示</h3>
        <div className="space-y-3 text-body text-text-body">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            <span>定期修改密码，建议使用包含字母、数字和特殊字符的强密码</span>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            <span>不要将密码分享给他人，社区工作人员不会向你索要密码</span>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            <span>如果发现账号异常，请及时修改密码并联系管理员</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== City Select (搜索下拉) =====

function CitySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const keyword = search.trim().toLowerCase();
  const filtered = keyword
    ? CITY_GROUPS
        .map(g => ({
          province: g.province,
          cities: g.cities.filter(c => c.toLowerCase().includes(keyword) || g.province.toLowerCase().includes(keyword)),
        }))
        .filter(g => g.cities.length > 0)
    : CITY_GROUPS;

  const handleSelect = (city: string) => {
    onChange(city);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
  };

  // 支持自由输入：搜索无匹配时可用输入内容作为自定义位置
  const hasCustomOption = keyword.length > 0 && filtered.length === 0;

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`flex items-center h-10 rounded-btn border bg-white dark:bg-[#28282c] transition-colors duration-150 ${
          open ? 'border-primary ring-2 ring-primary/20' : 'border-border'
        }`}
      >
        <Search className="w-3.5 h-3.5 text-text-muted ml-3 flex-shrink-0" />
        <input
          value={open ? search : value}
          onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && keyword) {
              handleSelect(search.trim());
            }
          }}
          placeholder="搜索或输入位置（支持全球城市）"
          maxLength={50}
          className="flex-1 h-full px-2 text-body text-text-title placeholder:text-text-disabled bg-transparent outline-none"
        />
        {value && !open && (
          <button type="button" onClick={handleClear} className="p-1 mr-1 text-text-muted hover:text-text-body cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-text-muted mr-2.5 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#1e1e22] border border-divider rounded-card shadow-dropdown max-h-64 overflow-y-auto">
          {hasCustomOption ? (
            <div className="py-1">
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full text-left px-4 py-2.5 text-body text-primary hover:bg-primary/5 cursor-pointer flex items-center gap-2"
              >
                <MapPin className="w-3.5 h-3.5" />
                使用自定义位置：<span className="font-medium">{search.trim()}</span>
              </button>
              <p className="px-4 py-1.5 text-caption text-text-muted">
                列表中没有匹配项，按回车或点击上方确认
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-caption text-text-muted">没有找到匹配的位置</p>
            </div>
          ) : (
            <>
              {keyword && (
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="w-full text-left px-4 py-2 text-caption text-primary hover:bg-primary/5 cursor-pointer border-b border-divider flex items-center gap-1.5"
                >
                  <MapPin className="w-3 h-3" />
                  直接使用「{search.trim()}」
                </button>
              )}
              {filtered.map(group => (
                <div key={group.province}>
                  <div className="sticky top-0 bg-gray-50 dark:bg-[#28282c] px-3 py-1.5 text-caption font-medium text-text-muted border-b border-divider">
                    {group.province}
                  </div>
                  <div className="py-1">
                    {group.cities.map(city => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleSelect(city)}
                        className={`w-full text-left px-4 py-2 text-body transition-colors duration-100 cursor-pointer ${
                          city === value
                            ? 'text-primary bg-primary/5 font-medium'
                            : 'text-text-body hover:bg-gray-50 dark:hover:bg-[#28282c] hover:text-primary'
                        }`}
                      >
                        {city}
                        {city === value && <Check className="w-3.5 h-3.5 inline ml-2 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Bookmarks Tab =====

interface BookmarkItem {
  id: string;
  createdAt: string;
  post: {
    id: string;
    content: string;
    images: string;
    likes: number;
    createdAt: string;
    author: { id: string; name: string; avatar: string | null; role: string };
    postTags: { tag: { id: string; name: string } }[];
    _count: { comments: number };
  };
}

function BookmarksTab() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/bookmarks', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => { if (json.code === 0) setBookmarks(json.data.list || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (postId: string, bookmarkId: string) => {
    setRemoving(bookmarkId);
    try {
      await fetch(`/api/auth/bookmarks/${postId}`, { method: 'DELETE', credentials: 'same-origin' });
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch { /* ignore */ }
    setRemoving(null);
  };

  if (loading) return <div className="text-center py-12 text-text-muted">加载中...</div>;

  if (bookmarks.length === 0) {
    return (
      <div className="card text-center py-12">
        <Bookmark className="w-10 h-10 text-text-disabled mx-auto mb-3" />
        <p className="text-body text-text-muted">暂无收藏</p>
        <p className="text-caption text-text-disabled mt-1">在帖子详情页点击收藏按钮</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-caption text-text-muted">共 {bookmarks.length} 个收藏</p>
      {bookmarks.map((b) => {
        const mediaUrls: string[] = (() => { try { return JSON.parse(b.post.images || '[]'); } catch { return []; } })();
        const imgUrl = mediaUrls.find((u) => !u.match(/\.(mp4|webm|mov)$/i));
        return (
          <div key={b.id} className="card flex items-start gap-3">
            {imgUrl && (
              <div className="relative w-16 h-16 rounded-btn overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-[#28282c]">
                <Image src={imgUrl} alt="" fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <a href={`/community/${b.post.id}`} className="text-body text-text-body line-clamp-2 hover:text-primary transition-colors">
                {b.post.content}
              </a>
              <div className="flex items-center gap-3 mt-1.5 text-caption text-text-muted">
                <span>{b.post.author.name}</span>
                <span className="inline-flex items-center gap-0.5"><Heart className="w-3 h-3" /> {b.post.likes}</span>
                <span className="inline-flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {b.post._count.comments}</span>
              </div>
            </div>
            <button
              onClick={() => handleRemove(b.post.id, b.id)}
              disabled={removing === b.id}
              className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
              title="取消收藏"
            >
              {removing === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ===== Notifications Tab =====

interface NotifItem {
  id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  fromAvatar: string | null;
  fromName: string | null;
  createdAt: string;
}

function NotificationsTab() {
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const unreadCount = notifs.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetch('/api/auth/notifications?pageSize=50', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => { if (json.code === 0) setNotifs(json.data.list || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch('/api/auth/notifications', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
    setMarkingAll(false);
  };

  const typeIcon: Record<string, typeof Bell> = {
    comment: MessageCircle,
    like: Heart,
    pin: Pin,
    system: Bell,
  };

  if (loading) return <div className="text-center py-12 text-text-muted">加载中...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-caption text-text-muted">
          共 {notifs.length} 条通知{unreadCount > 0 ? `，${unreadCount} 条未读` : ''}
        </p>
        {unreadCount > 0 && (
          <button onClick={markAllRead} disabled={markingAll} className="text-caption text-primary hover:underline cursor-pointer disabled:opacity-50">
            {markingAll ? '处理中...' : '全部标为已读'}
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="card text-center py-12">
          <Bell className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="text-body text-text-muted">暂无通知</p>
        </div>
      ) : (
        notifs.map((n) => {
          const Icon = typeIcon[n.type] || Bell;
          return (
            <a
              key={n.id}
              href={n.link || '#'}
              onClick={() => {
                if (!n.isRead) {
                  fetch('/api/auth/notifications', {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: [n.id] }),
                  })
                    .then((r) => r.json())
                    .then((json) => {
                      if (json.code === 0) {
                        setNotifs((prev) => prev.map((item) => item.id === n.id ? { ...item, isRead: true } : item));
                      }
                    })
                    .catch(() => {});
                }
              }}
              className={`card flex items-start gap-3 hover:shadow-card-hover transition-shadow ${!n.isRead ? 'border-primary/20 bg-primary/[0.02]' : ''}`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-bg">
                {n.fromAvatar ? (
                  <Image src={n.fromAvatar} alt="" width={36} height={36} className="rounded-full object-cover" />
                ) : (
                  <Icon className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-text-title">{n.title}</p>
                <p className="text-caption text-text-muted mt-0.5">{n.content}</p>
                <p className="text-caption text-text-disabled mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
            </a>
          );
        })
      )}
    </div>
  );
}
