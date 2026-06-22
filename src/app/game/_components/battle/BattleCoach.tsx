'use client';

import React from 'react';

export type BattleHintTone = 'cyan' | 'amber' | 'rose' | 'emerald' | 'slate';

export interface BattleHint {
  key: string;
  title: string;
  value: string;
  detail: string;
  tone: BattleHintTone;
  Icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
}

const TONE_CLASS: Record<BattleHintTone, string> = {
  cyan: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100',
  amber: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  rose: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
  emerald: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  slate: 'border-white/10 bg-slate-900/55 text-white/72',
};

export function BattleCoach({ hints }: { hints: BattleHint[] }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 shrink-0 lg:grid-cols-4 [@media(max-height:640px)]:hidden">
      {hints.map(({ key, title, value, detail, tone, Icon }) => (
        <div
          key={key}
          className={`min-h-[58px] rounded-xl border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${TONE_CLASS[tone]}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] opacity-75">
              <Icon size={13} className="shrink-0" />
              <span className="truncate">{title}</span>
            </div>
            <div className="shrink-0 text-sm font-black text-white">{value}</div>
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/54">{detail}</div>
        </div>
      ))}
    </div>
  );
}
