'use client';

/**
 * Battle 特效层：伤害飘字 / 攻击冲击 / 音效派发。
 * 从 Battle.tsx 抽出（D2 加分项）；保持观察的状态字段与派发时序不变。
 *
 * 设计要点：所有 hook 都仅消费 GameState，使用 DOM 查询获取屏幕坐标，
 * 因此 Battle 的 JSX 只需渲染 data-hero-id / data-minion-id 锚点即可。
 */

import React, { useEffect, useRef, useState } from 'react';
import { sfx } from '@/game/sound';
import type { GameState, PlayerId } from '@/game/types';
import type { Point } from './shared';

// ============ 伤害飘字 ============

export type Floater = {
  id: string;
  x: number;
  y: number;
  text: string;
  tone: 'damage' | 'heal' | 'combo' | 'shield';
};

/** 监听 state 前后 HP 变化，生成浮动数字 */
export function useDamageFloaters(state: GameState): Floater[] {
  const prevRef = useRef<GameState>(state);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = state;
    if (prev === state) return;

    const additions: Floater[] = [];
    const now = Date.now();

    // Hero HP 变化
    for (const p of ['P1', 'P2'] as PlayerId[]) {
      const before = prev.players[p].hp;
      const after = state.players[p].hp;
      if (after !== before) {
        const el = typeof document !== 'undefined'
          ? document.querySelector(`[data-hero-id="${p}"]`)
          : null;
        if (el) {
          const r = (el as HTMLElement).getBoundingClientRect();
          additions.push({
            id: `fh_${p}_${now}_${Math.random().toString(36).slice(2, 7)}`,
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            text: after < before ? `-${before - after}` : `+${after - before}`,
            tone: after < before ? 'damage' : 'heal',
          });
        }
      }
    }

    // Minion HP 变化（仅存活单位，死亡单位 DOM 已移除）
    for (const p of ['P1', 'P2'] as PlayerId[]) {
      const prevMap = new Map(prev.players[p].minions.map((m) => [m.instanceId, m]));
      for (const m of state.players[p].minions) {
        const b = prevMap.get(m.instanceId);
        if (!b) continue;
        if (m.health === b.health && m.divineShieldActive === b.divineShieldActive) continue;
        const el = typeof document !== 'undefined'
          ? document.querySelector(`[data-minion-id="${m.instanceId}"]`)
          : null;
        if (!el) continue;
        const r = (el as HTMLElement).getBoundingClientRect();
        if (b.divineShieldActive && !m.divineShieldActive && m.health === b.health) {
          additions.push({
            id: `fs_${m.instanceId}_${now}`,
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            text: '盾!',
            tone: 'shield',
          });
        } else if (m.health !== b.health) {
          additions.push({
            id: `fm_${m.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            text: m.health < b.health ? `-${b.health - m.health}` : `+${m.health - b.health}`,
            tone: m.health < b.health ? 'damage' : 'heal',
          });
        }
      }
    }

    // 新 log 中包含 combo 的，视作连击反馈
    const newLogs = state.log.slice(prev.log.length);
    for (const l of newLogs) {
      if (l.kind === 'combo') {
        // combo 飘字放屏幕中央上方
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
        additions.push({
          id: `fc_${now}_${Math.random().toString(36).slice(2, 7)}`,
          x: vw / 2,
          y: 160,
          text: '✦ COMBO ✦',
          tone: 'combo',
        });
      }
    }

    if (additions.length > 0) {
      setFloaters((xs) => [...xs, ...additions]);
      const ids = additions.map((a) => a.id);
      setTimeout(() => {
        setFloaters((xs) => xs.filter((f) => !ids.includes(f.id)));
      }, 1400);
    }
  }, [state]);

  return floaters;
}

export function DamageFloaters({ floaters }: { floaters: Floater[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9500]" aria-hidden>
      {floaters.map((f) => (
        <span
          key={f.id}
          className={[
            'absolute font-black drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]',
            'damage-floater',
            f.tone === 'damage' ? 'text-rose-300'
              : f.tone === 'heal' ? 'text-emerald-300'
              : f.tone === 'combo' ? 'text-pink-200 tracking-widest'
              : 'text-amber-300',
            f.tone === 'combo' ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl',
          ].join(' ')}
          style={{ left: f.x, top: f.y }}
        >
          {f.text}
        </span>
      ))}
      <style jsx>{`
        .damage-floater {
          transform: translate(-50%, -50%);
          animation: damageFloat 1.4s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
        }
        @keyframes damageFloat {
          0%   { transform: translate(-50%, -50%)  scale(0.4); opacity: 0; }
          12%  { transform: translate(-50%, -90%)  scale(1.25); opacity: 1; }
          55%  { transform: translate(-50%, -160%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -260%) scale(0.92); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ============ 攻击冲击特效 ============

export interface Strike {
  id: string;
  from: Point;
  to: Point;
}

/** 监听 state.log 中的 attack，驱动冲击线 + 攻击者冲刺 + 目标抖动 */
export function useAttackFx(state: GameState): Strike[] {
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const prevLogLenRef = useRef(state.log.length);

  useEffect(() => {
    const prevLen = prevLogLenRef.current;
    prevLogLenRef.current = state.log.length;
    const newLogs = state.log.slice(prevLen);
    if (newLogs.length === 0) return;

    const adds: Strike[] = [];
    const now = Date.now();
    let idx = 0;

    for (const l of newLogs) {
      if (l.kind !== 'attack' || !l.data) continue;
      const d = l.data as {
        attackerKind?: string; attackerId?: string; attackerOwner?: string;
        targetKind?: string; targetId?: string; targetPlayer?: string;
      };
      if (typeof document === 'undefined') continue;

      const attackerEl =
        d.attackerKind === 'hero'
          ? document.querySelector(`[data-hero-id="${d.attackerOwner}"]`)
          : d.attackerId
            ? document.querySelector(`[data-minion-id="${d.attackerId}"]`)
            : null;
      const targetEl =
        d.targetKind === 'hero'
          ? document.querySelector(`[data-hero-id="${d.targetPlayer}"]`)
          : d.targetKind === 'minion' && d.targetId
            ? document.querySelector(`[data-minion-id="${d.targetId}"]`)
            : null;
      if (!attackerEl || !targetEl) continue;

      const aRect = (attackerEl as HTMLElement).getBoundingClientRect();
      const tRect = (targetEl as HTMLElement).getBoundingClientRect();
      const from = { x: aRect.left + aRect.width / 2, y: aRect.top + aRect.height / 2 };
      const to   = { x: tRect.left + tRect.width / 2, y: tRect.top + tRect.height / 2 };

      adds.push({ id: `strike_${now}_${idx++}`, from, to });

      // 攻击者：冲刺到目标方向 0.4s
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const aEl = attackerEl as HTMLElement;
      aEl.style.setProperty('--strike-dx', `${dx}px`);
      aEl.style.setProperty('--strike-dy', `${dy}px`);
      aEl.classList.remove('is-striking');
      // 强制重排以让动画重新开始
      void aEl.offsetWidth;
      aEl.classList.add('is-striking');
      window.setTimeout(() => aEl.classList.remove('is-striking'), 460);

      // 目标：等攻击者冲到位时再抖动
      const tEl = targetEl as HTMLElement;
      window.setTimeout(() => {
        tEl.classList.remove('is-hit');
        void tEl.offsetWidth;
        tEl.classList.add('is-hit');
        window.setTimeout(() => tEl.classList.remove('is-hit'), 420);
      }, 160);
    }

    if (adds.length === 0) return;
    setStrikes((xs) => [...xs, ...adds]);
    const ids = adds.map((a) => a.id);
    window.setTimeout(() => {
      setStrikes((xs) => xs.filter((x) => !ids.includes(x.id)));
    }, 620);
  }, [state]);

  return strikes;
}

/** 全屏 SVG 冲击线 + 爆发圆环（自动淡出） */
export function AttackFxLayer({ strikes }: { strikes: Strike[] }) {
  if (strikes.length === 0) return null;
  return (
    <svg className="pointer-events-none fixed inset-0 z-[9550]" width="100%" height="100%" aria-hidden>
      <defs>
        <filter id="attackStrikeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {strikes.map((s) => (
        <g key={s.id} className="attack-strike">
          {/* 外层黄色光晕 */}
          <line x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y}
                stroke="#fde047" strokeWidth="6" strokeLinecap="round"
                filter="url(#attackStrikeGlow)" opacity="0.9" />
          {/* 内层白色锐线 */}
          <line x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y}
                stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
          {/* 目标处爆发圆环 */}
          <circle cx={s.to.x} cy={s.to.y} r="8" fill="none"
                  stroke="#fde047" strokeWidth="3" className="attack-burst"
                  filter="url(#attackStrikeGlow)" />
          <circle cx={s.to.x} cy={s.to.y} r="14" fill="none"
                  stroke="#fb923c" strokeWidth="2" className="attack-burst-outer" />
        </g>
      ))}
    </svg>
  );
}

// ============ 音效派发 ============

/** 监听 state.log 增量，派发音效 */
export function useSfxFromState(state: GameState, perspective: PlayerId | undefined): void {
  const prevLogLenRef = useRef(state.log.length);
  const prevEndedRef = useRef(state.ended);

  useEffect(() => {
    const prevLen = prevLogLenRef.current;
    prevLogLenRef.current = state.log.length;
    const newLogs = state.log.slice(prevLen);
    if (newLogs.length === 0) return;

    // 聚合本批次出现过的 kind（忽略 damage：让 attack/play 代表击打声）
    const kinds = new Set(newLogs.map((l) => l.kind));

    if (kinds.has('combo')) sfx.combo();
    if (kinds.has('turnStart')) sfx.turnStart();
    if (kinds.has('mulligan')) sfx.click();
    if (kinds.has('draw')) sfx.coin();
    if (kinds.has('play')) sfx.play();
    if (kinds.has('attack')) sfx.attack();
    // 仅治疗没有攻击时响（否则被 attack 压过去）
    if (kinds.has('heal') && !kinds.has('attack')) sfx.heal();
    // 死亡延迟播放，让 attack 的金属声先过去
    if (kinds.has('death')) {
      setTimeout(() => sfx.death(), 180);
    }
    if (kinds.has('battlecry') || kinds.has('deathrattle') || kinds.has('secret')) {
      // 这些在 play/death 之后会有，用 buff 做一个小叮铃叠加
      setTimeout(() => sfx.buff(), 60);
    }
  }, [state.log]);

  // 胜负：仅在 ended 从 false→true 的那一次触发
  useEffect(() => {
    if (!prevEndedRef.current && state.ended) {
      const winner = state.winner;
      if (!winner || winner === 'draw') {
        sfx.lose();
      } else if (perspective) {
        if (winner === perspective) sfx.win(); else sfx.lose();
      } else {
        sfx.win();
      }
    }
    prevEndedRef.current = state.ended;
  }, [state.ended, state.winner, perspective]);
}
