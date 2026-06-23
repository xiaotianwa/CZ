'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  ImageIcon,
  Megaphone,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
  FileText,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminInfo {
  id: string;
  name: string;
  role: string;
}

const sidebarGroups = [
  {
    title: '内容管理',
    items: [
      { href: '/admin/announcements', label: '公告管理', icon: Megaphone },
      { href: '/admin/media', label: '媒体审核', icon: ImageIcon },
      { href: '/admin/banned-words', label: '敏感词', icon: Ban },
    ],
  },
  {
    title: '用户互动',
    items: [
      { href: '/admin/users', label: '用户管理', icon: Users },
      { href: '/admin/feedback', label: '反馈处理', icon: MessageSquare },
    ],
  },
  {
    title: '系统设置',
    items: [
      { href: '/admin/settings', label: '站点设置', icon: Settings },
      { href: '/admin/site-logs', label: '访问日志', icon: FileText },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setAdmin(json.data);
        } else {
          router.push('/admin/login');
        }
      })
      .catch(() => router.push('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'same-origin' });
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* 移动端顶部导航 */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="font-semibold">管理后台</span>
        </div>
        <button
          type="button"
          className="rounded-md p-2 text-text-muted hover:bg-muted transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex">
        {/* 侧边栏 */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 p-4 border-b">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">管理后台</span>
          </div>

          {/* 管理员信息 */}
          <div className="p-4 border-b">
            <p className="font-medium text-sm">{admin.name}</p>
            <p className="text-xs text-muted-foreground">
              {admin.role === 'super_admin'
                ? '超级管理员'
                : admin.role === 'admin'
                  ? '管理员'
                  : '编辑'}
            </p>
          </div>

          {/* 导航 */}
          <nav className="p-2 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            {/* 仪表盘 */}
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                pathname === '/admin'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted'
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <LayoutDashboard className="w-4 h-4" />
              仪表盘
            </Link>

            {/* 分组导航 */}
            {sidebarGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 text-xs font-medium text-muted-foreground mb-1">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* 退出登录 */}
          <div className="absolute bottom-0 left-0 right-0 p-2 border-t bg-card">
            <button
              type="button"
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-muted hover:bg-muted transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </aside>

        {/* 遮罩 */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* 主内容 */}
        <main className="flex-1 p-4 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
