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
  battlecry: 'text-fuchsia-300',
  deathrattle: 'text-rose-400',
  secret: 'text-amber-400 font-bold',
  countdown: 'text-indigo-300',
  invalid: 'text-red-500',
  gameOver: 'text-lime-400 font-bold',
  draw: 'text-white/40',
  fatigue: 'text-red-400',
  turnStart: 'text-white font-semibold border-t border-white/10 pt-1 mt-1',
  turnEnd: 'text-white/30',
  combo: 'text-pink-300 font-bold',
};

export function LogPanel({ state }: { state: GameState }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // 移动端默认折叠，避免占用宝贵垂直空间；lg 以上始终展示
  const [open, setOpen] = useState(false);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [state.log.length]);
  return (
    <div className="lg:w-72 shrink-0 flex flex-col min-h-0 max-h-full">
      <button onClick={() => setOpen(!open)}
              className="lg:hidden mb-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded text-white text-sm font-bold flex items-center justify-between cursor-pointer shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <Icons.LogIcon size={14} /> 战斗日志 ({state.log.length})
        </span>
        <Icons.ChevronIcon size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      <div ref={scrollRef}
           className={`bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/70 overflow-y-auto flex-1 min-h-0 ${
             open ? 'max-h-[240px] lg:max-h-none' : 'hidden lg:block'
           }`}>
        <div className="hidden lg:flex sticky top-0 bg-slate-900/80 pb-2 font-bold text-white items-center gap-1.5">
          <Icons.LogIcon size={14} /> 战斗日志
        </div>
        <div className="space-y-0.5">
          {state.log.slice(-100).map((l, i) => (
            <div key={i} className={KIND_COLOR[l.kind] ?? 'text-white/60'}>
              <span className="text-white/30">T{l.turn}·{l.player}</span> {l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
