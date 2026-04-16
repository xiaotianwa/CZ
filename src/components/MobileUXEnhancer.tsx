'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { House, Images, MessageCircle, CalendarDays, User, RefreshCw } from 'lucide-react';

const mobileTabs = [
  { href: '/', label: '首页', icon: House },
  { href: '/community', label: '社区', icon: MessageCircle },
  { href: '/gallery', label: '相册', icon: Images },
  { href: '/events', label: '活动', icon: CalendarDays },
  { href: '/me', label: '我的', icon: User },
];

const rootTabPaths = new Set(mobileTabs.map((t) => t.href));

export default function MobileUXEnhancer() {
  const pathname = usePathname();
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);
  const swipeTriggeredRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const shouldEnableSwipeBack = useMemo(() => {
    if (!pathname) return false;
    if (rootTabPaths.has(pathname)) return false;
    return pathname.includes('/');
  }, [pathname]);

  const setPull = (value: number) => {
    pullDistanceRef.current = value;
    setPullDistance(value);
  };

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= 768) return;
      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      isPullingRef.current = false;
      swipeTriggeredRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (window.innerWidth >= 768 || refreshing) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartXRef.current;
      const dy = touch.clientY - touchStartYRef.current;

      if (shouldEnableSwipeBack && touchStartXRef.current <= 28 && dx > 0 && Math.abs(dy) < 48) {
        if (dx > 96 && !swipeTriggeredRef.current) {
          swipeTriggeredRef.current = true;
          if (window.history.length > 1) {
            router.back();
          }
        }
        return;
      }

      if (window.scrollY <= 0 && dy > 0 && Math.abs(dx) < 40) {
        isPullingRef.current = true;
        const next = Math.min(96, dy * 0.45);
        setPull(next);
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!isPullingRef.current) return;

      if (pullDistanceRef.current > 72) {
        setRefreshing(true);
        setPull(56);
        window.setTimeout(() => {
          window.location.reload();
        }, 120);
      } else {
        setPull(0);
      }

      isPullingRef.current = false;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [refreshing, router, shouldEnableSwipeBack]);

  useEffect(() => {
    if (!refreshing) return;
    const timer = window.setTimeout(() => {
      setRefreshing(false);
      setPull(0);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [refreshing]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const showPullHint = pullDistance > 0 || refreshing;

  return (
    <>
      <div
        className={`md:hidden fixed left-1/2 top-[58px] z-40 pointer-events-none transition-opacity duration-150 ${showPullHint ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: `translate(-50%, ${Math.max(-20, pullDistance - 40)}px)` }}
      >
        <div className="h-8 px-3 rounded-full bg-white/95 dark:bg-[#1e1e22]/95 border border-divider shadow-sm backdrop-blur inline-flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 text-primary ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-[11px] text-text-muted">
            {refreshing ? '刷新中...' : pullDistance > 72 ? '松开刷新' : '下拉刷新'}
          </span>
        </div>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-divider bg-white/95 dark:bg-[#1e1e22]/95 backdrop-blur">
        <div className="grid grid-cols-5 min-h-[56px] pb-[env(safe-area-inset-bottom)]">
          {mobileTabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
                  active ? 'text-primary font-medium' : 'text-text-muted'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${active ? 'scale-105' : ''}`} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
