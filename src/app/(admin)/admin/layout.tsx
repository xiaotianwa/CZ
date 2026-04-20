'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Image, Calendar, Gamepad2,
  Clock, SlidersHorizontal, FolderOpen, Users, Settings,
  LogOut, Menu, X, ChevronDown, MessageSquarePlus, HelpCircle, Megaphone, Music, Flag, ShieldBan,
  BookOpen, Palette, Vote, UserCog,
} from 'lucide-react';

interface SidebarLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface SidebarGroup {
  key: string;
  title: string;
  icon: typeof LayoutDashboard;
  links: SidebarLink[];
}

const topLinks: SidebarLink[] = [
  { href: '/admin', label: '仪表盘', icon: LayoutDashboard },
];

const sidebarGroups: SidebarGroup[] = [
  {
    key: 'content',
    title: '内容管理',
    icon: FileText,
    links: [
      { href: '/admin/posts', label: '帖子管理', icon: FileText },
      { href: '/admin/albums', label: '相册管理', icon: Image },
      { href: '/admin/events', label: '活动管理', icon: Calendar },
      { href: '/admin/games', label: '游戏管理', icon: Gamepad2 },
      { href: '/admin/memes', label: '梗百科', icon: BookOpen },
      { href: '/admin/fan-works', label: '二创作品', icon: Palette },
      { href: '/admin/fan-work-votes', label: '二创投票', icon: Vote },
      { href: '/admin/timeline', label: '时间线', icon: Clock },
    ],
  },
  {
    key: 'media',
    title: '媒体资源',
    icon: FolderOpen,
    links: [
      { href: '/admin/slides', label: '轮播管理', icon: SlidersHorizontal },
      { href: '/admin/media', label: '媒体库', icon: FolderOpen },
      { href: '/admin/music', label: '音乐管理', icon: Music },
    ],
  },
  {
    key: 'interaction',
    title: '用户互动',
    icon: Users,
    links: [
      { href: '/admin/users', label: '用户管理', icon: Users },
      { href: '/admin/quiz', label: '答题管理', icon: HelpCircle },
      { href: '/admin/announcements', label: '公告管理', icon: Megaphone },
      { href: '/admin/feedback', label: '反馈管理', icon: MessageSquarePlus },
      { href: '/admin/reports', label: '举报管理', icon: Flag },
    ],
  },
  {
    key: 'system',
    title: '系统设置',
    icon: Settings,
    links: [
      { href: '/admin/admins', label: '管理员管理', icon: UserCog },
      { href: '/admin/banned-words', label: '违禁词管理', icon: ShieldBan },
      { href: '/admin/settings', label: '站点设置', icon: Settings },
    ],
  },
];

// 扁平列表用于头部标题查找
const allSidebarLinks = [...topLinks, ...sidebarGroups.flatMap((g) => g.links)];

/** 判断当前分组是否有激活的链接 */
function isGroupActive(group: SidebarGroup, pathname: string) {
  return group.links.some(
    (l) => pathname === l.href || (l.href !== '/admin' && pathname.startsWith(l.href)),
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  // 初始化展开状态：包含当前激活路径的分组默认展开
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sidebarGroups.forEach((g) => {
      init[g.key] = isGroupActive(g, pathname);
    });
    return init;
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) return;

    fetch('/api/admin/auth/me', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((json) => {
        if (json.code !== 0) {
          router.push('/admin/login');
          return;
        }
        setUser(json.data);
      })
      .catch(() => {
        router.push('/admin/login');
      });
  }, [router, isLoginPage]);

  // 路由变化时自动展开对应分组
  useEffect(() => {
    sidebarGroups.forEach((g) => {
      if (isGroupActive(g, pathname)) {
        setExpandedGroups((prev) => ({ ...prev, [g.key]: true }));
      }
    });
  }, [pathname]);

  const handleLogout = () => {
    fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .finally(() => router.push('/admin/login'));
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="text-text-muted">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-page flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-divider transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-divider flex-shrink-0">
          <Link href="/admin" className="font-waterbrush text-heading-sm text-primary">
            1103
          </Link>
          <span className="tag-primary text-caption">管理端</span>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {/* 顶级链接（仪表盘） */}
          {topLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-btn text-body font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary-bg text-primary'
                    : 'text-text-body hover:bg-gray-50 hover:text-primary'
                }`}
              >
                <link.icon className="w-4 h-4 flex-shrink-0" />
                {link.label}
              </Link>
            );
          })}

          {/* 可折叠分组 */}
          {sidebarGroups.map((group) => {
            const isOpen = !!expandedGroups[group.key];
            const hasActive = isGroupActive(group, pathname);
            return (
              <div key={group.key} className="mt-1">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-btn text-body font-medium transition-colors duration-150 cursor-pointer ${
                    hasActive ? 'text-primary' : 'text-text-body hover:bg-gray-50 hover:text-primary'
                  }`}
                >
                  <group.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{group.title}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="ml-4 pl-3 border-l border-divider space-y-0.5 mt-0.5 mb-1">
                    {group.links.map((link) => {
                      const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-btn text-caption font-medium transition-colors duration-150 ${
                            isActive
                              ? 'bg-primary-bg text-primary'
                              : 'text-text-muted hover:bg-gray-50 hover:text-primary'
                          }`}
                        >
                          <link.icon className="w-3.5 h-3.5 flex-shrink-0" />
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="flex-shrink-0 p-3 border-t border-divider bg-white">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center text-primary text-caption font-bold">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-text-title truncate">{user.name}</p>
              <p className="text-caption text-text-muted">{user.role === 'admin' || user.role === 'super_admin' ? '管理员' : user.role === 'star' ? '董事长' : '编辑'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 transition-colors cursor-pointer"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-divider h-14 flex items-center px-4 lg:px-6">
          <button
            className="lg:hidden p-2 -ml-2 mr-2 rounded-btn text-text-muted hover:bg-gray-50 cursor-pointer"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-heading-sm text-text-title">
            {allSidebarLinks.find((l) => l.href === pathname || (l.href !== '/admin' && pathname.startsWith(l.href)))?.label || '管理后台'}
          </h1>
          <div className="ml-auto">
            <Link href="/" className="text-caption text-text-muted hover:text-primary transition-colors">
              ← 返回前台
            </Link>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
