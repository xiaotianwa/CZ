'use client';

/**
 * 对局结束全屏弹窗。
 * 从 Battle.tsx 抽出（D2 部分拆分），不改变任何可见行为。
 */

import React from 'react';
import * as Icons from '@/components/game/GameIcons';
import type { PlayerId } from '@/game/types';
import type { AIDifficulty } from '@/game/ai';

export interface GameOverOverlayProps {
  winner: PlayerId | 'draw' | null | undefined;
  me: PlayerId;
  onRestart: () => void;
  onQuit: () => void;
  /** 在线模式不允许本地 reset（对手无法同步），隐藏"再来一局" */
  isOnline?: boolean;
  /** C1：AI 模式下显示难度 */
  aiDifficulty?: AIDifficulty;
  /** C1：对局耗时（毫秒） */
  durationMs?: number;
  /** C1：对局回合数 */
  turns?: number;
}

export function GameOverOverlay({
  winner, me, onRestart, onQuit, isOnline = false, aiDifficulty, durationMs, turns,
}: GameOverOverlayProps) {
  const isDraw = winner === 'draw';
  const isWin = !isDraw && winner === me;
  const title = isDraw ? '平 局' : isWin ? '胜 利' : '失 败';
  const difficultyLabel = aiDifficulty === 'easy' ? '轻松'
    : aiDifficulty === 'hard' ? '高压'
    : aiDifficulty === 'normal' ? '标准'
    : null;
  const durationText = (() => {
    if (typeof durationMs !== 'number') return null;
    const total = Math.round(durationMs / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}分${s.toString().padStart(2, '0')}秒` : `${s}秒`;
  })();
  const ResultIcon = isDraw ? Icons.HandshakeIcon : isWin ? Icons.TrophyIcon : Icons.SkullIcon;
  const subtitle = isDraw
    ? '双方玩家同归于尽'
    : isWin
      ? '对方玩家流量归零，恭喜你拿下这一局！'
      : '你的玩家流量归零，再接再厉！';
  const accent = isDraw
    ? 'from-slate-400 to-slate-600 text-slate-100'
    : isWin
      ? 'from-amber-300 via-yellow-400 to-amber-500 text-amber-950'
      : 'from-rose-500 via-rose-600 to-rose-800 text-rose-50';
  const ring = isDraw ? 'ring-slate-400/40' : isWin ? 'ring-amber-400/60' : 'ring-rose-500/60';

  return (
    <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className={`relative max-w-md w-full bg-slate-900 border-2 rounded-3xl p-8 sm:p-10 text-center shadow-2xl ring-8 ${ring} ${isWin ? 'border-amber-400/60' : isDraw ? 'border-slate-500/40' : 'border-rose-500/60'}`}>
        <div className="mb-4 flex justify-center animate-bounce-slow">
          <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br ${accent} flex items-center justify-center shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]`}>
            <ResultIcon size={56} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
          </div>
        </div>
        <div className={`inline-block text-4xl sm:text-5xl font-black tracking-[0.3em] px-6 py-2 rounded-xl bg-gradient-to-br ${accent} mb-4 shadow-lg`}>
          {title}
        </div>
        <div className="text-white/80 text-sm sm:text-base mb-3">{subtitle}</div>
        {(difficultyLabel || durationText || turns) && (
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-xs text-white/70">
            {difficultyLabel && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15">
                难度 <span className="text-amber-200 font-semibold">{difficultyLabel}</span>
              </span>
            )}
            {typeof turns === 'number' && turns > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15">
                回合 <span className="text-cyan-200 font-semibold">{turns}</span>
              </span>
            )}
            {durationText && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15">
                耗时 <span className="text-emerald-200 font-semibold">{durationText}</span>
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {!isOnline && (
            <button
              onClick={onRestart}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-bold rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              <Icons.RestartIcon size={16} /> 再来一局
            </button>
          )}
          <button
            onClick={onQuit}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-transform hover:scale-105 cursor-pointer"
          >
            <Icons.BackIcon size={16} /> {isOnline ? '返回好友房' : '返回大厅'}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bounce-slow { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        .animate-fade-in { animation: fade-in 0.3s ease-out }
        .animate-bounce-slow { animation: bounce-slow 1.8s ease-in-out infinite }
      `}</style>
    </div>
  );
}
