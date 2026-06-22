'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Sparkles, Users, Gamepad2,
  ScrollText, Settings, LogOut, Menu, X,
  ChevronRight, FileBox, UserCog, LibraryBig,
} from 'lucide-react';

interface SidebarLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  superOnly?: boolean;
  comingSoon?: boolean;
}

interface SidebarGroup {
  title: string;
  links: SidebarLink[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    title: '',
    links: [
      { href: '/tcg-admin', label: '仪表盘', icon: LayoutDashboard },
    ],
  },
  {
    title: '当前项目',
    links: [
      { href: '/tcg-admin/project-games', label: '游戏总览', icon: LibraryBig },
    ],
  },
  {
    title: 'TCG 子类',
    links: [
      { href: '/tcg-admin/cards', label: '卡池', icon: Sparkles },
      { href: '/tcg-admin/deck-presets', label: '预设卡组', icon: FileBox, comingSoon: true },
    ],
  },
  {
    title: 'TCG 玩家服务',
    links: [
      { href: '/tcg-admin/players', label: '玩家', icon: Users },
      { href: '/tcg-admin/matches', label: '战报', icon: Gamepad2 },
    ],
  },
  {
    title: '系统',
    links: [
      { href: '/tcg-admin/settings', label: '系统参数', icon: Settings, comingSoon: true },
      { href: '/tcg-admin/operators', label: '运营账号', icon: UserCog, superOnly: true, comingSoon: true },
      { href: '/tcg-admin/audit', label: '审计日志', icon: ScrollText, superOnly: true, comingSoon: true },
    ],
  },
];

interface Operator {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  tcg_super: '超管',
  tcg_ops: '运营',
  tcg_editor: '策划',
};

export default function TcgAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [op, setOp] = useState<Operator | null>(null);

  const isLoginPage = pathname === '/tcg-admin/login';

  useEffect(() => {
    if (isLoginPage) return;
    fetch('/api/tcg/admin/auth/me', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((json) => {
        if (json.code !== 0) {
          router.push('/tcg-admin/login');
          return;
        }
        setOp(json.data);
      })
      .catch(() => router.push('/tcg-admin/login'));
  }, [router, isLoginPage]);

  const handleLogout = () => {
    fetch('/api/tcg/admin/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .finally(() => router.push('/tcg-admin/login'));
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!op) {
    return (
      <div className="tcg-shell min-h-screen flex items-center justify-center" style={{ background: '#0f0f23' }}>
        <div className="text-white/50 text-sm tracking-widest">LOADING · · ·</div>
      </div>
    );
  }

  const allLinks = sidebarGroups.flatMap((g) => g.links);
  const currentLink = [...allLinks]
    .sort((a, b) => b.href.length - a.href.length)
    .find((l) => pathname === l.href || (l.href !== '/tcg-admin' && pathname.startsWith(`${l.href}/`)));

  return (
    <div className="tcg-shell min-h-screen flex relative text-[#E2E8F0]" style={{ background: '#0f0f23', fontFamily: "'Chakra Petch', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif" }}>
      {/* 背景霓虹 */}
      <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.14),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(244,63,94,0.1),transparent_55%)]" />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-white/5 transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'rgba(10,10,25,0.9)', backdropFilter: 'blur(14px)' }}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/5">
          <Link href="/tcg-admin" className="font-bold text-white text-lg tracking-wider" style={{ fontFamily: "'Russo One', sans-serif" }}>
            GAME · OPS
          </Link>
          <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded-sm bg-[#7C3AED]/25 text-[#C4B5FD] border border-[#7C3AED]/40">
            v1.0
          </span>
        </div>

        <nav className="p-3 overflow-y-auto" style={{ height: 'calc(100vh - 56px - 64px)' }}>
          {sidebarGroups.map((group, gi) => {
            const visibleLinks = group.links.filter((l) => !l.superOnly || op.role === 'tcg_super');
            if (visibleLinks.length === 0) return null;
            return (
              <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                {group.title && (
                  <div className="px-3 mb-1.5 flex items-center gap-1.5">
                    <span className="h-px flex-1 bg-gradient-to-r from-[#7C3AED]/30 to-transparent" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78BFA]/70">{group.title}</span>
                    <span className="h-px flex-[3] bg-gradient-to-l from-[#7C3AED]/30 to-transparent" />
                  </div>
                )}
                <div className="space-y-0.5">
                  {visibleLinks.map((link) => {
                    const isActive = currentLink?.href === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.comingSoon ? '#' : link.href}
                        onClick={(e) => {
                          if (link.comingSoon) {
                            e.preventDefault();
                            return;
                          }
                          setSidebarOpen(false);
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                          isActive
                            ? 'bg-[#7C3AED]/20 text-white border border-[#7C3AED]/30'
                            : link.comingSoon
                              ? 'text-white/30 cursor-not-allowed'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <link.icon className="w-4 h-4 flex-shrink-0" />
                        {link.label}
                        {link.comingSoon && (
                          <span className="ml-auto text-[9px] font-semibold tracking-wider px-1.5 py-px rounded-sm bg-amber-500/10 text-amber-300/80 border border-amber-500/20">SOON</span>
                        )}
                        {!link.comingSoon && isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5" style={{ background: 'rgba(10,10,25,0.95)' }}>
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#7C3AED]/25 flex items-center justify-center text-[#A78BFA] text-sm font-bold border border-[#7C3AED]/40">
              {op.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{op.name}</p>
              <p className="text-[11px] text-white/45">{ROLE_LABEL[op.role] || op.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-14 border-b border-white/5 flex items-center px-4 lg:px-6" style={{ background: 'rgba(15,15,35,0.7)', backdropFilter: 'blur(14px)' }}>
          <button
            className="lg:hidden p-2 -ml-2 mr-2 rounded-lg text-white/60 hover:bg-white/5 cursor-pointer"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-base font-semibold text-white tracking-wider" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>
            {currentLink?.label || '游戏端管理'}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/play" target="_blank" className="text-[11px] tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/65 hover:bg-[#7C3AED]/20 hover:text-[#C4B5FD] hover:border-[#7C3AED]/30 transition-colors">
              游戏大厅 ↗
            </Link>
            <Link href="/game" target="_blank" className="text-[11px] tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/65 hover:bg-[#7C3AED]/20 hover:text-[#C4B5FD] hover:border-[#7C3AED]/30 transition-colors">
              卡牌前台 ↗
            </Link>
            <Link href="/" className="text-[11px] tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/65 hover:bg-[#7C3AED]/20 hover:text-[#C4B5FD] hover:border-[#7C3AED]/30 transition-colors">
              社区主站 ↗
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
