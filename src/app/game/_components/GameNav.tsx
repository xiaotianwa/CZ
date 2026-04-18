'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// 浮动霓虹顶部导航：三页共享
// 设计指引：retro-futurism 霓虹 + 毛玻璃 + 稳定 hover（颜色过渡，不做缩放避免 layout shift）

const LINKS = [
  { href: '/game/gallery',  label: '卡池',     icon: CardsIcon },
  { href: '/game/deck',     label: '卡组',     icon: DeckBuildIcon },
  { href: '/game/practice', label: '练习',     icon: RobotIcon },
  { href: '/game/room',     label: '好友房', icon: InviteIcon },
  { href: '/game/rank',     label: '排行',     icon: TrophyIcon },
];

export default function GameNav() {
  const pathname = usePathname() || '';
  // 对战进行中隐藏顶部导航（由 Battle 组件设置 body[data-in-battle]）；
  // 选择界面等其它状态仍保留顶栏。
  const [inBattle, setInBattle] = useState(false);
  useEffect(() => {
    const check = () => setInBattle(document.body.dataset.inBattle === '1');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-in-battle'] });
    return () => obs.disconnect();
  }, []);
  if (inBattle) return null;
  return (
    <header className="sticky top-3 z-50 px-3 sm:px-4">
      <nav className="mx-auto max-w-7xl flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0F0F23]/70 backdrop-blur-xl shadow-[0_0_0_1px_rgba(124,58,237,0.15),0_12px_40px_-12px_rgba(124,58,237,0.35)] px-3 sm:px-5 h-14">
        <Link
          href="/game"
          className="group flex items-center gap-2 select-none cursor-pointer"
          aria-label="返回游戏大厅"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#F43F5E] text-white text-sm font-black shadow-[0_0_16px_rgba(124,58,237,0.55)]">
            1103
          </span>
          <span className="hidden sm:flex flex-col leading-none">
            <span className="font-display text-[15px] tracking-[0.18em] text-white">卡牌对战</span>
            <span className="text-[10px] tracking-[0.3em] text-[#A78BFA]/80">CHENZE · TCG</span>
          </span>
        </Link>

        <ul className="flex items-center gap-1 sm:gap-2">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'group relative flex items-center gap-1.5 px-3 sm:px-4 h-9 rounded-lg text-sm font-semibold cursor-pointer',
                    'transition-colors duration-200',
                    active
                      ? 'text-white bg-white/10 ring-1 ring-[#7C3AED]/60 shadow-[0_0_18px_-4px_rgba(124,58,237,0.7)]'
                      : 'text-white/70 hover:text-white hover:bg-white/5',
                  ].join(' ')}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#A78BFA]' : 'text-white/60 group-hover:text-white/90'}`} />
                  <span>{label}</span>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-[#A78BFA] to-transparent"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

// =============== Lucide-style inline SVG icons ===============

function CardsIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="12" height="16" rx="2" />
      <path d="M9 9h2M9 13h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v12" />
    </svg>
  );
}

function PaletteIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="10.5" r="1" fill="currentColor" />
      <path d="M12 21a3 3 0 0 0 3-3c0-1.5-1-2-1-3s1-1 2-1h1.5a2.5 2.5 0 0 0 0-5" />
    </svg>
  );
}

function DeckBuildIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="10" height="14" rx="1.5" />
      <rect x="7" y="7" width="10" height="14" rx="1.5" />
      <path d="M14 11h1M14 14h1" />
    </svg>
  );
}

function RobotIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <circle cx="9" cy="13" r="1" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <path d="M10 17h4" />
      <path d="M12 3v4" />
      <path d="M8 19v2" />
      <path d="M16 19v2" />
    </svg>
  );
}

function InviteIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function TrophyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

