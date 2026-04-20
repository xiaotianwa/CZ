import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '卡牌对战 · CHENZE TCG',
  description: '1103 陈泽传媒 · 卡牌对战 Demo · 卡池 / 练习 / 对战',
};

const ENTRIES: Array<{
  href: string;
  title: string;
  subtitle: string;
  desc: string;
  accent: string;
  icon: (p: { className?: string }) => React.ReactElement;
}> = [
  {
    href: '/game/gallery',
    title: '卡池',
    subtitle: 'CARD POOL',
    desc: '浏览全部首发卡牌与词条释义',
    accent: 'from-[#7C3AED] to-[#A78BFA]',
    icon: IconCards,
  },
  {
    href: '/game/practice',
    title: '练习',
    subtitle: 'PRACTICE',
    desc: '与 AI 对手进行离线练习对战',
    accent: 'from-[#A78BFA] to-[#38BDF8]',
    icon: IconRobot,
  },
  {
    href: '/game/room',
    title: '好友对战',
    subtitle: 'FRIEND ROOM',
    desc: '创建房间邀请好友进行 1v1 对决',
    accent: 'from-[#38BDF8] to-[#7C3AED]',
    icon: IconInvite,
  },
  {
    href: '/game/rank',
    title: '排行榜',
    subtitle: 'LEADERBOARD',
    desc: '查看玩家战绩与排名',
    accent: 'from-[#F43F5E] to-[#F59E0B]',
    icon: IconTrophy,
  },
];

export default function GameHomePage() {
  return (
    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
      {/* 头图 / 标题 */}
      <header className="mb-10 sm:mb-14 text-center">
        <p className="font-waterbrush text-[11px] tracking-[0.5em] text-[#A78BFA]/80 mb-3">CHENZE · TCG · 1103</p>
        <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-wide text-white drop-shadow-[0_0_24px_rgba(124,58,237,0.35)]">
          卡牌对战
        </h1>
        <p className="mt-4 text-sm sm:text-base text-white/60 max-w-xl mx-auto leading-relaxed">
          一款以陈泽宇宙为题材的回合制集换式卡牌游戏 Demo
          <br className="hidden sm:block" />
          选择下方入口体验不同模式
        </p>
      </header>

      {/* 入口网格 */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {ENTRIES.map(({ href, title, subtitle, desc, accent, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group relative block h-full rounded-2xl border border-white/10 bg-[#141432]/60 backdrop-blur-md p-5 sm:p-6 overflow-hidden transition-colors duration-200 hover:border-[#A78BFA]/40 hover:bg-[#1A1A3F]/70"
            >
              {/* 渐变光斑 */}
              <div
                aria-hidden
                className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-35`}
              />

              <div className="relative flex items-start gap-4">
                <span
                  className={`inline-flex items-center justify-center w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${accent} text-white shadow-[0_0_24px_-4px_rgba(124,58,237,0.6)]`}
                >
                  <Icon className="w-6 h-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] tracking-[0.3em] text-white/45">{subtitle}</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-white">{title}</h2>
                  <p className="mt-2 text-sm text-white/60 leading-relaxed">{desc}</p>
                </div>
              </div>

              <div className="relative mt-6 flex items-center justify-between">
                <span className="text-xs tracking-widest text-[#A78BFA]/70 uppercase">进入</span>
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-white/70 transition-colors duration-200 group-hover:bg-white/10 group-hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* 页脚提示 */}
      <p className="mt-12 text-center text-[11px] tracking-[0.25em] text-white/30">
        v1.0 DEMO · 仅供体验 · 数据不保存
      </p>
    </div>
  );
}

// =============== Icons ===============

function IconCards({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="12" height="16" rx="2" />
      <path d="M9 9h2M9 13h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v12" />
    </svg>
  );
}

function IconPalette({ className = '' }: { className?: string }) {
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

function IconDeck({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="10" height="14" rx="1.5" />
      <rect x="7" y="7" width="10" height="14" rx="1.5" />
      <path d="M14 11h1M14 14h1" />
    </svg>
  );
}

function IconRobot({ className = '' }: { className?: string }) {
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

function IconInvite({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconTrophy({ className = '' }: { className?: string }) {
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

