'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/components/AdminAuthProvider';
import { cn } from '@/lib/utils';

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
      { href: '/admin/feedback', label: '反馈管理', icon: MessageSquare },
      { href: '/admin/users', label: '用户管理', icon: Users },
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
  const { admin, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 移动端顶部导航 */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="font-semibold">管理后台</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
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
          {admin && (
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
          )}

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
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
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
        <main className="flex-1 p-4 lg:p-6 min-w-0">
          {/* 面包屑 */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <Link href="/admin" className="hover:text-foreground transition-colors">
              管理后台
            </Link>
            {pathname !== '/admin' && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground">
                  {sidebarGroups
                    .flatMap((g) => g.items)
                    .find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.label ||
                    '当前页面'}
                </span>
              </>
            )}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
