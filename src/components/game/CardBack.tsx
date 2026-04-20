'use client';

import React from 'react';

export type CardBackRarity = 'N' | 'R' | 'SR' | 'SSR';
export type CardBackVariant = 'default' | 'mini';

export interface CardBackProps {
  width?: number;
  rarity?: CardBackRarity;
  variant?: CardBackVariant;
  count?: number;
  interactive?: boolean;
  faded?: boolean;
  className?: string;
  onClick?: () => void;
  absolute?: boolean;
}

const RARITY_BORDER: Record<CardBackRarity, string> = {
  N:   'from-slate-400 via-slate-300 to-slate-400',
  R:   'from-sky-400 via-blue-300 to-sky-400',
  SR:  'from-fuchsia-500 via-purple-400 to-fuchsia-500',
  SSR: 'from-amber-400 via-yellow-200 to-amber-400',
};

const RARITY_GLOW: Record<CardBackRarity, string> = {
  N:   'shadow-[0_0_12px_rgba(148,163,184,0.35)]',
  R:   'shadow-[0_0_16px_rgba(56,189,248,0.5)]',
  SR:  'shadow-[0_0_20px_rgba(217,70,239,0.6)]',
  SSR: 'shadow-[0_0_28px_rgba(251,191,36,0.8)]',
};

const BRAND_BORDER = 'from-[#7C3AED] via-[#A78BFA] to-[#F43F5E]';
const BRAND_GLOW = 'shadow-[0_0_18px_rgba(124,58,237,0.55)]';

export default function CardBack({
  width = 240,
  rarity,
  variant = 'default',
  count,
  interactive = false,
  faded = false,
  className,
  onClick,
  absolute = false,
}: CardBackProps) {
  const height = Math.round(width * (4 / 3));
  const border = rarity ? RARITY_BORDER[rarity] : BRAND_BORDER;
  const glow = rarity ? RARITY_GLOW[rarity] : BRAND_GLOW;
  const isMini = variant === 'mini' || width < 90;
  const logoFont = Math.max(14, Math.round(width / 4.6));
  const subFont = Math.max(7, Math.round(width / 26));
  const crestSize = Math.round(width * 0.52);

  return (
    <div
      onClick={onClick}
      style={{ width, height }}
      className={[
        'relative select-none',
        absolute ? 'absolute' : '',
        interactive ? 'transition-transform duration-300 hover:-translate-y-2 hover:scale-[1.03]' : '',
        onClick ? 'cursor-pointer' : '',
        faded ? 'opacity-45 grayscale' : '',
        className ?? '',
      ].join(' ')}
    >
      <div
        className={[
          'absolute inset-0 rounded-[14px] p-[3px] bg-gradient-to-br',
          border,
          glow,
        ].join(' ')}
      >
        <div className="relative w-full h-full rounded-[11px] overflow-hidden bg-[radial-gradient(ellipse_at_center,#2E1065_0%,#1E1B4B_55%,#0B0820_100%)]">
          <svg
            aria-hidden
            className="absolute inset-0 w-full h-full opacity-[0.18] mix-blend-screen"
            viewBox="0 0 100 133"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern id={`cardback-hex-${width}`} x="0" y="0" width="10" height="11.55" patternUnits="userSpaceOnUse">
                <polygon
                  points="5,0.5 9.5,3 9.5,8.55 5,11.05 0.5,8.55 0.5,3"
                  fill="none"
                  stroke="rgba(196,181,253,0.5)"
                  strokeWidth="0.3"
                />
              </pattern>
              <radialGradient id={`cardback-radial-${width}`} cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="rgba(167,139,250,0.35)" />
                <stop offset="70%" stopColor="rgba(124,58,237,0.05)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>
            <rect width="100" height="133" fill={`url(#cardback-hex-${width})`} />
            <rect width="100" height="133" fill={`url(#cardback-radial-${width})`} />
          </svg>
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.12] pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 6px)',
            }}
          />
          {!isMini && (
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen animate-[cardback-spin_18s_linear_infinite]"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0deg, rgba(167,139,250,0.4) 12deg, transparent 24deg, transparent 60deg, rgba(244,63,94,0.35) 72deg, transparent 84deg, transparent 120deg, rgba(167,139,250,0.4) 132deg, transparent 144deg, transparent 180deg, rgba(244,63,94,0.35) 192deg, transparent 204deg, transparent 240deg, rgba(167,139,250,0.4) 252deg, transparent 264deg, transparent 300deg, rgba(244,63,94,0.35) 312deg, transparent 324deg, transparent 360deg)',
                WebkitMaskImage:
                  'radial-gradient(ellipse at center, black 0%, black 40%, transparent 72%)',
                maskImage:
                  'radial-gradient(ellipse at center, black 0%, black 40%, transparent 72%)',
              }}
            />
          )}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ width: crestSize, height: crestSize }}
          >
            <div
              className={[
                'absolute inset-0 rotate-45 rounded-lg',
                'bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#F43F5E]',
                'shadow-[0_0_20px_rgba(124,58,237,0.6),inset_0_0_14px_rgba(255,255,255,0.18)]',
                'border border-white/25',
              ].join(' ')}
            />
            <div
              className="absolute inset-[8%] rotate-45 rounded-md border border-white/30 bg-gradient-to-br from-white/10 to-transparent"
            />
            <div className="relative z-10 flex flex-col items-center leading-none pointer-events-none">
              <span
                className="font-waterbrush text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight"
                style={{ fontSize: logoFont, letterSpacing: '-0.04em' }}
              >
                1103
              </span>
              {!isMini && (
                <span
                  className="mt-0.5 font-bold text-amber-200/90 tracking-[0.35em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
                  style={{ fontSize: subFont }}
                >
                  TCG
                </span>
              )}
            </div>
          </div>
          {!isMini && (
            <>
              <CornerDiamond pos="top-2 left-2" size={Math.round(width / 22)} />
              <CornerDiamond pos="top-2 right-2" size={Math.round(width / 22)} />
              <CornerDiamond pos="bottom-2 left-2" size={Math.round(width / 22)} />
              <CornerDiamond pos="bottom-2 right-2" size={Math.round(width / 22)} />
            </>
          )}
          {!isMini && (
            <div
              className="font-waterbrush absolute top-[8%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/40 border border-[#A78BFA]/40 text-[#C4B5FD] tracking-[0.45em] uppercase"
              style={{ fontSize: subFont }}
            >
              CHENZE
            </div>
          )}
          {!isMini && (
            <div
              className="absolute bottom-[6%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/50 border border-white/20 text-white/60 font-bold tracking-[0.4em]"
              style={{ fontSize: Math.max(6, subFont - 1) }}
            >
              CARD · BACK
            </div>
          )}
          {rarity === 'SSR' && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -inset-x-1/2 -top-1/2 h-full w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[cardback-shine_3s_linear_infinite]" />
            </div>
          )}
          {typeof count === 'number' && count > 0 && (
            <div className="absolute bottom-1 right-1 z-20 min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-md bg-slate-950/90 border border-[#A78BFA]/55 text-[#E9D5FF] text-[11px] font-black tabular-nums shadow-lg">
              {count}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes cardback-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cardback-shine {
          0% { transform: translateX(-50%) rotate(12deg); }
          100% { transform: translateX(250%) rotate(12deg); }
        }
      `}</style>
    </div>
  );
}

function CornerDiamond({ pos, size }: { pos: string; size: number }) {
  return (
    <div
      aria-hidden
      className={`absolute ${pos} rotate-45 bg-gradient-to-br from-[#A78BFA]/80 to-[#F43F5E]/70 rounded-[2px] border border-white/40 shadow-[0_0_6px_rgba(167,139,250,0.6)] pointer-events-none`}
      style={{ width: size, height: size }}
    />
  );
}
