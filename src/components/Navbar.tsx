'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import localFont from 'next/font/local';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Search, LogIn, LogOut, User as UserIcon, Bell, MessageCircle, Heart, Pin, Info, ChevronDown } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface UserInfo {
  id: string;
  name: string;
  avatar?: string | null;
  role: string;
}

const brandHandwriting = localFont({
  src: '../../public/fonts/brand/Pinzelan-Regular.ttf',
  display: 'swap',
  weight: '400',
});

export default function Navbar({ profileName }: { profileName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const navLinks = [
    { href: '/', label: '首页' },
    { href: '/profile', label: `关于${profileName}` },
    { href: '/community', label: '社区' },
    { href: '/games', label: '最近在玩' },
    { href: '/fan-map', label: '粉丝地图' },
  ];
  const moreLinks = [
    { href: '/play', label: '游戏中心' },
    { href: '/gallery', label: '相册' },
    { href: '/memes', label: '梗百科' },
    { href: '/fan-works', label: '二创作品' },
    { href: '/events', label: '活动' },
  ];
  const allLinks = [...navLinks, ...moreLinks];
  const isMoreActive = moreLinks.some((l) => pathname === l.href);
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; type: string; title: string; content: string; link?: string | null; isRead: boolean; fromAvatar?: string | null; createdAt: string }[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const mobileMenuId = 'mobile-nav-menu';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 非首页始终使用深色（实心白底）导航栏样式
  const solid = !isHome || scrolled;

  useEffect(() => {
    // 先从缓存恢复，避免闪烁
    try {
      const cached = localStorage.getItem('user');
      if (cached) setUser(JSON.parse(cached));
    } catch { /* ignore */ }

    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setUser(json.data);
          localStorage.setItem('user', JSON.stringify(json.data));
        } else {
          setUser(null);
          localStorage.removeItem('user');
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  // 获取未读通知数
  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      fetch('/api/auth/notifications?pageSize=5', { credentials: 'same-origin' })
        .then((r) => r.json())
        .then((json) => {
          if (json.code === 0 && json.data) {
            setUnreadCount(json.data.unreadCount || 0);
            setNotifications(json.data.list || []);
          }
        })
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => {
    fetch('/api/auth/notifications', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) {
          setUnreadCount(0);
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        }
      })
      .catch(() => {});
  };

  const notifIcon: Record<string, typeof Bell> = {
    comment: MessageCircle,
    like: Heart,
    pin: Pin,
    system: Info,
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .finally(() => {
        localStorage.removeItem('user');
        setUser(null);
        setDropdownOpen(false);
        router.push('/');
      });
  };

  // Capsule mode: scrolled on home, or any non-home page
  const capsule = solid;
  // Dark capsule only on home (scrolled); light capsule on other pages
  const darkMode = isHome;

  // Shared color tokens
  const txtPrimary = darkMode ? 'text-white/80' : 'text-text-body';
  const txtHover = darkMode ? 'hover:text-white' : 'hover:text-primary';
  const txtLogo = darkMode ? 'text-white' : 'text-text-title';
  const txtMuted = darkMode ? 'text-white/70' : 'text-text-muted';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" aria-label="主导航">
      <div className="container-main px-4 sm:px-6 lg:px-8 pt-3">
        {/* ─── Desktop ─── */}
        <div className={`hidden md:flex items-center justify-between relative transition-all duration-300 ${
          capsule
            ? darkMode
              ? 'h-12 rounded-full bg-[#1a1a1a]/75 border border-white/15 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-md px-5'
              : 'h-12 rounded-full bg-white/90 border border-gray-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md px-5'
            : 'h-14 px-1'
        }`}>
          {/* Left: nav links */}
          <div className={`flex items-center gap-5 text-[13px] font-medium ${txtPrimary}`}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${txtHover} transition-colors duration-150 whitespace-nowrap`}
              >
                {link.label}
              </Link>
            ))}
            {/* "发现" 下拉菜单 */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                onMouseEnter={() => setMoreOpen(true)}
                className={`inline-flex items-center gap-0.5 ${txtHover} transition-colors duration-150 whitespace-nowrap cursor-pointer ${isMoreActive ? (darkMode ? 'text-white' : 'text-primary') : ''}`}
              >
                发现
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen && (
                <div
                  className={`absolute left-1/2 -translate-x-1/2 top-full pt-2`}
                  onMouseLeave={() => setMoreOpen(false)}
                >
                  <div className={`w-32 rounded-xl py-1.5 border backdrop-blur-md ${
                    darkMode
                      ? 'bg-[#1a1a1a]/90 border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
                      : 'bg-white/95 border-gray-200 shadow-dropdown'
                  }`}>
                    {moreLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        className={`block px-4 py-2 text-[13px] font-medium transition-colors duration-150 ${
                          pathname === link.href
                            ? 'text-primary'
                            : darkMode
                              ? 'text-white/80 hover:text-white hover:bg-white/10'
                              : 'text-text-body hover:text-primary hover:bg-gray-50'
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: logo — absolute positioned for true centering */}
          <Link href="/" className={`${brandHandwriting.className} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${txtLogo} text-[23px] leading-none tracking-[0.02em]`}>
            1103 - Chenze
          </Link>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false); }}
                  className={`relative p-1.5 rounded-full ${txtMuted} ${txtHover} transition-colors duration-150 cursor-pointer`}
                  aria-label="通知"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-card border border-divider shadow-dropdown">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
                      <span className="text-body font-medium text-text-title">消息通知</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-caption text-primary hover:underline cursor-pointer">全部已读</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center">
                          <Bell className="w-8 h-8 text-text-disabled mx-auto mb-2" />
                          <p className="text-caption text-text-muted">暂无通知</p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const Icon = notifIcon[n.type] || Bell;
                          return (
                            <Link
                              key={n.id}
                              href={n.link || '/me'}
                              onClick={() => setNotifOpen(false)}
                              className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-divider last:border-0 ${!n.isRead ? 'bg-primary/[0.03]' : ''}`}
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-bg">
                                {n.fromAvatar ? (
                                  <Image src={n.fromAvatar} alt="通知来源头像" width={32} height={32} className="rounded-full object-cover" />
                                ) : (
                                  <Icon className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-caption font-medium text-text-title line-clamp-1">{n.title}</p>
                                <p className="text-caption text-text-muted line-clamp-1 mt-0.5">{n.content}</p>
                              </div>
                              {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                            </Link>
                          );
                        })
                      )}
                    </div>
                    <Link
                      href="/me?tab=notifications"
                      onClick={() => setNotifOpen(false)}
                      className="block text-center py-2.5 border-t border-divider text-caption text-primary font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      查看全部通知
                    </Link>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-2 h-8 pl-0.5 pr-2.5 rounded-full transition-colors duration-150 cursor-pointer ${darkMode ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-text-body hover:text-text-title hover:bg-gray-100'}`}
                >
                  <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-white/20' : 'bg-primary-bg'}`}>
                    {user.avatar ? (
                      <Image src={user.avatar} alt={user.name} width={28} height={28} className="object-cover" />
                    ) : (
                      <span className={`text-caption font-bold ${darkMode ? 'text-white' : 'text-primary'}`}>{user.name[0]}</span>
                    )}
                  </div>
                  <span className={`text-[13px] font-medium max-w-[80px] truncate ${darkMode ? 'text-white' : 'text-text-title'}`}>{user.name}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-card border border-divider shadow-dropdown py-1">
                    <div className="px-3 py-2 border-b border-divider">
                      <p className="text-body font-medium text-text-title truncate">{user.name}</p>
                      <p className="text-caption text-text-muted">{user.role === 'star' ? '董事长' : user.role === 'assistant' ? '传媒成员' : '粉丝'}</p>
                    </div>
                    <Link
                      href="/me"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-body text-text-body hover:bg-gray-50 hover:text-primary transition-colors duration-150 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4" />
                      个人中心
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-body text-text-body hover:bg-red-50 hover:text-danger transition-colors duration-150 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className={`text-[13px] font-medium ${txtPrimary} ${txtHover} transition-colors duration-150`}>
                  登录
                </Link>
                <Link href="/join" className={`h-8 px-4 rounded-full border text-[13px] font-medium inline-flex items-center transition-colors duration-150 whitespace-nowrap ${
                  darkMode ? 'border-white/40 text-white hover:bg-white/10' : 'border-gray-300 text-text-title hover:bg-gray-100'
                }`}>
                  加入社区
                </Link>
              </>
            )}

          </div>
        </div>

        {/* ─── Mobile ─── */}
        <div className={`md:hidden flex items-center justify-between transition-all duration-300 ${
          capsule
            ? darkMode
              ? 'h-11 rounded-full bg-[#1a1a1a]/75 border border-white/15 backdrop-blur-md px-4'
              : 'h-11 rounded-full bg-white/90 border border-gray-200 shadow-sm backdrop-blur-md px-4'
            : 'h-14 px-1'
        }`}>
          <Link href="/" className={`${brandHandwriting.className} ${txtLogo} text-[19px] leading-none tracking-[0.02em]`}>
            1103 - Chenze
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              className={`p-1.5 transition-colors duration-150 ${darkMode ? 'text-white/80 hover:text-white' : 'text-text-muted hover:text-text-title'}`}
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={isOpen}
              aria-controls={mobileMenuId}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div id={mobileMenuId} className={`md:hidden mt-2 rounded-xl p-3 backdrop-blur-md ${
            darkMode
              ? 'bg-[#1a1a1a]/90 border border-white/15'
              : 'bg-white/95 border border-gray-200 shadow-dropdown'
          }`}>
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-[13px] font-medium ${darkMode ? 'text-white/90 hover:bg-white/10' : 'text-text-body hover:bg-gray-50 hover:text-primary'}`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {/* 移动端「发现」分组 */}
              <div className={`mt-1 pt-1 border-t ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
                <span className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${darkMode ? 'text-white/40' : 'text-text-disabled'}`}>发现</span>
                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-[13px] font-medium ${darkMode ? 'text-white/90 hover:bg-white/10' : 'text-text-body hover:bg-gray-50 hover:text-primary'}`}
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className={`mt-2 pt-2 border-t flex flex-col gap-1 ${darkMode ? 'border-white/15' : 'border-gray-200'}`}>
                {user ? (
                  <>
                    <Link href="/me" onClick={() => setIsOpen(false)} className={`px-3 py-2 rounded-lg text-[13px] font-medium ${darkMode ? 'text-white/90 hover:bg-white/10' : 'text-text-body hover:bg-gray-50'}`}>
                      个人中心
                    </Link>
                    <button onClick={() => { handleLogout(); setIsOpen(false); }} className={`px-3 py-2 rounded-lg text-[13px] font-medium text-left ${darkMode ? 'text-red-400 hover:bg-white/10' : 'text-danger hover:bg-red-50'}`}>
                      退出登录
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setIsOpen(false)} className={`px-3 py-2 rounded-lg text-[13px] font-medium ${darkMode ? 'text-white/90 hover:bg-white/10' : 'text-text-body hover:bg-gray-50'}`}>
                      登录
                    </Link>
                    <Link href="/join" onClick={() => setIsOpen(false)} className={`px-3 py-2 rounded-lg text-[13px] font-medium ${darkMode ? 'text-white/90 hover:bg-white/10' : 'text-text-body hover:bg-gray-50'}`}>
                      加入社区
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
