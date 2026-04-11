'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, X, Search, LogIn, LogOut, User as UserIcon, Bell, MessageCircle, Heart, Pin, Info } from 'lucide-react';

interface UserInfo {
  id: string;
  name: string;
  avatar?: string | null;
  role: string;
}

export default function Navbar({ profileName }: { profileName: string }) {
  const router = useRouter();
  const navLinks = [
    { href: '/', label: '首页' },
    { href: '/profile', label: `关于${profileName}` },
    { href: '/gallery', label: '相册' },
    { href: '/community', label: '社区' },
    { href: '/games', label: '最近在玩' },
    { href: '/events', label: '活动' },
    { href: '/fan-map', label: '粉丝地图' },
  ];
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; type: string; title: string; content: string; link?: string | null; isRead: boolean; fromAvatar?: string | null; createdAt: string }[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-divider shadow-sm">
      <div className="container-main px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-heading-sm text-text-title cursor-pointer hover:text-primary transition-colors duration-150" style={{ fontFamily: "'Blazed', sans-serif" }}>
            1103
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-btn text-body font-medium text-text-body hover:text-primary hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/search" className="p-2 rounded-btn text-text-muted hover:text-text-body hover:bg-gray-50 transition-colors duration-150 cursor-pointer" aria-label="搜索">
              <Search className="w-4 h-4" />
            </Link>

            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false); }}
                  className="relative p-2 rounded-btn text-text-muted hover:text-text-body hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
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
                  <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-card border border-divider shadow-dropdown">
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
                                  <Image src={n.fromAvatar} alt="" width={32} height={32} className="rounded-full object-cover" />
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
                  className="flex items-center gap-2 h-9 pl-1 pr-3 rounded-full hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-primary-bg flex items-center justify-center flex-shrink-0">
                    {user.avatar ? (
                      <Image src={user.avatar} alt={user.name} width={28} height={28} className="object-cover" />
                    ) : (
                      <span className="text-caption font-bold text-primary">{user.name[0]}</span>
                    )}
                  </div>
                  <span className="text-body font-medium text-text-title max-w-[80px] truncate">{user.name}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-card border border-divider shadow-dropdown py-1">
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
              <Link href="/login" className="btn-primary inline-flex items-center gap-1.5">
                <LogIn className="w-4 h-4" />
                登录 / 加入
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-btn text-text-muted hover:text-text-body transition-colors duration-150 cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? '关闭菜单' : '打开菜单'}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-3 border-t border-divider mt-1 pt-3">
            <div className="flex flex-col gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2.5 rounded-btn text-body font-medium text-text-body hover:text-primary hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 px-3 space-y-2">
                {user ? (
                  <>
                    <Link
                      href="/me"
                      onClick={() => setIsOpen(false)}
                      className="btn-outline w-full inline-flex items-center justify-center gap-1.5"
                    >
                      <UserIcon className="w-4 h-4" />
                      个人中心
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setIsOpen(false); }}
                      className="btn-outline w-full inline-flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="btn-primary w-full inline-flex items-center justify-center gap-1.5" onClick={() => setIsOpen(false)}>
                    <LogIn className="w-4 h-4" />
                    登录 / 加入
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
