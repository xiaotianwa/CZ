'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { House, Images, MapPin, User, RefreshCw, Gamepad2 } from 'lucide-react';

interface MobileTab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  glow: string;
  center?: boolean;
}

interface MobileUXFeatures {
  galleryEnabled?: boolean;
  playEnabled?: boolean;
}

const baseHomeTab: MobileTab = { href: '/', label: '首页', icon: House, gradient: 'from-blue-500 via-sky-500 to-cyan-500', glow: 'rgba(14,165,233,0.4)' };
const fanMapTab: MobileTab = { href: '/fan-map', label: '粉丝地图', icon: MapPin, gradient: 'from-emerald-500 via-green-500 to-teal-500', glow: 'rgba(16,185,129,0.4)' };
const playTab: MobileTab = { href: '/play', label: '游戏', icon: Gamepad2, gradient: 'from-violet-500 via-purple-500 to-indigo-600', glow: 'rgba(124,58,237,0.45)', center: true };
const galleryTab: MobileTab = { href: '/gallery', label: '相册', icon: Images, gradient: 'from-amber-500 via-orange-500 to-yellow-500', glow: 'rgba(245,158,11,0.4)' };
const meTab: MobileTab = { href: '/me', label: '我的', icon: User, gradient: 'from-pink-500 via-rose-500 to-red-500', glow: 'rgba(244,63,94,0.4)' };

function buildMobileTabs(features: MobileUXFeatures): MobileTab[] {
  const { galleryEnabled = true, playEnabled = true } = features;
  const tabs: MobileTab[] = [baseHomeTab, fanMapTab];
  if (playEnabled) tabs.push(playTab);
  if (galleryEnabled) tabs.push(galleryTab);
  tabs.push(meTab);
  // 如果关闭 play，把剩下的第三个 tab 临时标记为 center（保证中间凸起）
  if (!playEnabled && tabs.length >= 3) {
    const mid = Math.floor(tabs.length / 2);
    tabs[mid] = { ...tabs[mid], center: true };
  }
  return tabs;
}

export default function MobileUXEnhancer({ features }: { features?: MobileUXFeatures } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);
  const swipeTriggeredRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const mobileTabs = useMemo(() => buildMobileTabs(features ?? {}), [features]);
  const rootTabPaths = useMemo(() => new Set(mobileTabs.map((t) => t.href)), [mobileTabs]);

  const shouldEnableSwipeBack = useMemo(() => {
    if (!pathname) return false;
    if (rootTabPaths.has(pathname)) return false;
    return pathname.includes('/');
  }, [pathname, rootTabPaths]);

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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.08] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <div className="grid grid-cols-5 min-h-[62px] pb-[env(safe-area-inset-bottom)] items-end pt-1">
          {mobileTabs.map((tab) => {
            const active = isActive(tab.href);
            const isCenter = 'center' in tab && tab.center;
            const size = isCenter ? 'w-[52px] h-[52px]' : 'w-[44px] h-[44px]';
            const iconSize = isCenter ? 'w-[22px] h-[22px]' : 'w-[19px] h-[19px]';
            const inactiveIconSize = isCenter ? 'w-[20px] h-[20px]' : 'w-[18px] h-[18px]';

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex flex-col items-center justify-end pb-0.5 transition-all duration-200 ${
                  isCenter && active ? '-mt-5' : ''
                }`}
              >
                <div className="relative">
                  {active && (
                    <div
                      className="absolute -inset-1 rounded-2xl blur-md animate-pulse"
                      style={{ background: tab.glow }}
                    />
                  )}
                  <div
                    className={`relative transition-all duration-300 ${
                      active
                        ? `${size} rounded-2xl flex items-center justify-center bg-gradient-to-br ${tab.gradient} scale-105 active:scale-90`
                        : 'flex items-center justify-center'
                    }`}
                    style={
                      active
                        ? { boxShadow: `0 4px 18px ${tab.glow}` }
                        : undefined
                    }
                  >
                    <tab.icon className={`${active ? iconSize : inactiveIconSize} transition-all duration-200 ${
                      active
                        ? 'text-white'
                        : 'text-text-muted'
                    }`} />
                  </div>
                </div>
                <span className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
                  active ? 'text-text-title dark:text-white' : 'text-gray-400 dark:text-gray-500'
                }`}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
