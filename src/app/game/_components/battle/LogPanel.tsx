'use client';

/**
 * 战斗日志面板。
 * 从 Battle.tsx 抽出（D2 部分拆分），保持渲染结构不变。
 */

import React, { useEffect, useRef, useState } from 'react';
import * as Icons from '@/components/game/GameIcons';
import type { GameState } from '@/game/types';

const KIND_COLOR: Record<string, string> = {
  damage: 'text-rose-300',
  heal: 'text-emerald-300',
  death: 'text-slate-400',
  play: 'text-sky-300',
  attack: 'text-amber-200',
  battlecry: 'text-cyan-200',
  deathrattle: 'text-rose-400',
  secret: 'text-amber-400 font-bold',
  countdown: 'text-sky-300',
  invalid: 'text-red-500',
  gameOver: 'text-lime-400 font-bold',
  draw: 'text-white/40',
  fatigue: 'text-red-400',
  turnStart: 'text-white/90 font-semibold',
  turnEnd: 'text-white/30',
  combo: 'text-amber-200 font-bold',
};

export function LogPanel({ state }: { state: GameState }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // 移动端默认折叠，避免占用宝贵垂直空间；lg 以上始终展示
  const [open, setOpen] = useState(false);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [state.log.length]);
  return (
    <div className="lg:w-80 shrink-0 flex flex-col min-h-0 max-h-full">
      <button onClick={() => setOpen(!open)}
              className="lg:hidden mb-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded text-white text-sm font-bold flex items-center justify-between cursor-pointer shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <Icons.LogIcon size={14} /> 战斗日志 ({state.log.length})
        </span>
        <Icons.ChevronIcon size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      <div ref={scrollRef}
           className={`overflow-y-auto flex-1 min-h-0 rounded-[24px] border border-[#b58b4a]/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(8,12,24,0.90))] p-4 text-xs text-white/70 shadow-[0_18px_44px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)] ${
             open ? 'max-h-[240px] lg:max-h-none' : 'hidden lg:block'
           }`}>
        <div className="hidden lg:flex sticky top-0 z-10 -mx-1 mb-2 items-center justify-between bg-[#0b1220]/95 px-1 pb-2 font-bold text-white">
          <span className="inline-flex items-center gap-1.5">
            <Icons.LogIcon size={14} /> 战斗日志
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black text-white/55 tabular-nums">
            {state.log.length}
          </span>
        </div>
        <div className="space-y-1.5">
          {state.log.slice(-100).map((l, i) => {
            const isTurnStart = l.kind === 'turnStart';
            return (
              <div
                key={i}
                className={[
                  'flex items-start gap-2 rounded-lg px-2.5 py-1.5 leading-snug border text-[12px]',
                  isTurnStart
                    ? 'bg-[#b58b4a]/10 border-[#b58b4a]/20 mt-1'
                    : 'bg-white/[0.035] border-white/[0.06]',
                  KIND_COLOR[l.kind] ?? 'text-white/70',
                ].join(' ')}
              >
                <span className="shrink-0 text-[10px] text-white/40 font-mono leading-snug tabular-nums">
                  T{l.turn}·{l.player}
                </span>
                <span className="flex-1">{l.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
