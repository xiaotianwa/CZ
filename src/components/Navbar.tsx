'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, X, Search, LogIn, LogOut, User as UserIcon } from 'lucide-react';

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
  ];
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
            <button className="p-2 rounded-btn text-text-muted hover:text-text-body hover:bg-gray-50 transition-colors duration-150 cursor-pointer" aria-label="搜索">
              <Search className="w-4 h-4" />
            </button>

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
