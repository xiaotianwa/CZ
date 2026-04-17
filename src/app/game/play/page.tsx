'use client';

/**
 * 对战 Demo 入口（hotseat 模式 —— 一人手动操作双方）
 * 核心 UI 在 ../_components/Battle.tsx，此页只负责开局配置。
 */

import React, { useState } from 'react';
import Link from 'next/link';
import type { PlayerId } from '@/game/types';
import { Battle } from '../_components/Battle';
import { DeckPicker, useAllDeckOptions, type DeckOptionKey } from '../_components/DeckPicker';
import { unlockAudio as unlockSfx } from '@/game/sound';

export default function PlayPage() {
  const options = useAllDeckOptions();
  const [p1Key, setP1Key] = useState<DeckOptionKey>({ kind: 'preset', key: 'taunt' });
  const [p2Key, setP2Key] = useState<DeckOptionKey>({ kind: 'preset', key: 'rush' });
  const [firstPlayer, setFirstPlayer] = useState<PlayerId>('P1');
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div className="pt-6 pb-14 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#A78BFA]/80 mb-2">
            <span className="inline-block w-6 h-px bg-[#A78BFA]/60" /> BATTLE · HOTSEAT
          </div>
          <h1 className="neon-heading text-3xl sm:text-4xl mb-3">对战 Demo</h1>
          <p className="text-white/60 mb-6 text-sm">
            选择双方卡组与先手，然后开始对战。当前为 hotseat 模式，您手动控制双方。可先在
            <Link href="/game/deck" className="text-[#A78BFA] hover:text-white transition-colors"> 构筑 </Link>
            页创建自定义卡组。
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <DeckPicker label="玩家 1 卡组" value={p1Key} onChange={setP1Key} options={options} />
            <DeckPicker label="玩家 2 卡组" value={p2Key} onChange={setP2Key} options={options} />
          </div>
          <div className="mt-5 flex items-center gap-2">
            <span className="text-white/70 text-xs tracking-[0.2em] uppercase mr-1">先手</span>
            {(['P1', 'P2'] as PlayerId[]).map((p) => (
              <button
                key={p}
                onClick={() => setFirstPlayer(p)}
                aria-pressed={firstPlayer === p}
                className={['chip', firstPlayer === p && 'chip-active'].filter(Boolean).join(' ')}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => { unlockSfx(); setStarted(true); }}
            className="btn-neon-primary mt-6 px-6 py-3 font-black rounded-xl cursor-pointer inline-flex items-center gap-2 text-base tracking-wide"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            开始对战
          </button>
        </div>
      </div>
    );
  }

  const p1Deck = options.resolve(p1Key);
  const p2Deck = options.resolve(p2Key);
  return <Battle p1Deck={p1Deck} p2Deck={p2Deck} firstPlayer={firstPlayer} onQuit={() => setStarted(false)} />;
}
