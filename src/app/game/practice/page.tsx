'use client';

/**
 * 练习模式（单人 vs AI）
 * - 玩家固定为 P1 视角；P2 由 AI 贪心策略接管
 * - 复用 _components/Battle 组件，传入 perspective='P1' + aiPlayer='P2'
 * - 开场选自己卡组 + 难度（此处"难度"仅影响 AI 思考节奏，算法与规则相同）
 */

import React, { useState } from 'react';
import Link from 'next/link';
import type { PlayerId } from '@/game/types';
import { Battle } from '../_components/Battle';
import { DeckPicker, useAllDeckOptions, type DeckOptionKey } from '../_components/DeckPicker';
import { unlockAudio as unlockSfx } from '@/game/sound';

type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTY_META: Record<Difficulty, { label: string; desc: string; delay: number; accent: string }> = {
  easy:   { label: '休闲',   desc: 'AI 思考慢一点，方便看清楚每一步',          delay: 1100, accent: 'from-emerald-400 to-emerald-600' },
  normal: { label: '标准',   desc: '默认节奏，与正式对战相近',                   delay: 750,  accent: 'from-sky-400 to-indigo-500' },
  hard:   { label: '高压',   desc: 'AI 决策非常快，基本贴身压制',                delay: 400,  accent: 'from-rose-500 to-fuchsia-600' },
};

export default function PracticePage() {
  const options = useAllDeckOptions();
  const [playerDeckKey, setPlayerDeckKey] = useState<DeckOptionKey>({ kind: 'preset', key: 'rush' });
  const [aiDeckKey, setAiDeckKey] = useState<DeckOptionKey>({ kind: 'preset', key: 'taunt' });
  const [firstPlayer, setFirstPlayer] = useState<PlayerId>('P1');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [started, setStarted] = useState(false);

  if (started) {
    const pDeck = options.resolve(playerDeckKey);
    const aDeck = options.resolve(aiDeckKey);
    return (
      <Battle
        p1Deck={pDeck}
        p2Deck={aDeck}
        firstPlayer={firstPlayer}
        onQuit={() => setStarted(false)}
        perspective="P1"
        aiPlayer="P2"
        aiStepDelayMs={DIFFICULTY_META[difficulty].delay}
      />
    );
  }

  return (
    <div className="pt-6 pb-14 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#A78BFA]/80 mb-2">
          <span className="inline-block w-6 h-px bg-[#A78BFA]/60" /> TRAINING · SOLO
        </div>
        <h1 className="neon-heading text-3xl sm:text-4xl mb-3">练习模式</h1>
        <p className="text-white/60 mb-6 text-sm">
          自动生成 AI 对手陪你跑一局，熟悉卡池与联动。你操作玩家 1，AI 接管玩家 2。可先在
          <Link href="/game/deck" className="text-[#A78BFA] hover:text-white transition-colors"> 构筑 </Link>
          页创建自定义卡组，或前往
          <Link href="/game/play" className="text-[#A78BFA] hover:text-white transition-colors"> 对战 </Link>
          挑战真人。
        </p>

        {/* 玩家 / AI 卡组 */}
        <div className="grid md:grid-cols-2 gap-4">
          <DeckPicker label="你的卡组" value={playerDeckKey} onChange={setPlayerDeckKey} options={options} />
          <DeckPicker label="AI 卡组"  value={aiDeckKey}     onChange={setAiDeckKey}     options={options} />
        </div>

        {/* 难度 */}
        <div className="glass-card rounded-xl p-4 mt-4">
          <div className="text-white/85 font-semibold mb-3 text-sm tracking-wide">难度（AI 节奏）</div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((key) => {
              const m = DIFFICULTY_META[key];
              const active = difficulty === key;
              return (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  aria-pressed={active}
                  className={[
                    'text-left px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-200 border',
                    active
                      ? `bg-gradient-to-r ${m.accent} text-white border-white/40 shadow-[0_0_14px_-4px_rgba(167,139,250,0.7)] font-bold`
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border-white/5 hover:border-[#A78BFA]/30',
                  ].join(' ')}
                >
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">{m.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 先手 */}
        <div className="mt-5 flex items-center gap-2">
          <span className="text-white/70 text-xs tracking-[0.2em] uppercase mr-1">先手</span>
          {(['P1', 'P2'] as PlayerId[]).map((p) => (
            <button
              key={p}
              onClick={() => setFirstPlayer(p)}
              aria-pressed={firstPlayer === p}
              className={['chip', firstPlayer === p && 'chip-active'].filter(Boolean).join(' ')}
            >
              {p === 'P1' ? 'P1（你）' : 'P2（AI）'}
            </button>
          ))}
        </div>

        <button
          onClick={() => { unlockSfx(); setStarted(true); }}
          className="btn-neon-primary mt-6 px-6 py-3 font-black rounded-xl cursor-pointer inline-flex items-center gap-2 text-base tracking-wide"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          开始练习
        </button>
      </div>
    </div>
  );
}

