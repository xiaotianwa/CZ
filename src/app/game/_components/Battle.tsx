'use client';

/**
 * Battle 组件：通用对战 UI（hotseat 与 vs AI 共享）
 * - hotseat: 不传 perspective / aiPlayer，视角跟随 activePlayer
 * - vs AI:   传 perspective='P1' + aiPlayer='P2'，AI 自动出招
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCardPresets } from '@/lib/tcg/useCardPresets';
import { useGame } from '@/game/useGame';
import { HERO_ATTACKER_ID, getCardDef, MAX_TURNS } from '@/game/engine';
import { mergeLivePresetsIntoEngine } from '@/game/cardLoader';
import { nextAction as aiNextAction, type AIDifficulty } from '@/game/ai';
import type { CardInstance, Minion, PlayerId } from '@/game/types';
import * as Icons from '@/components/game/GameIcons';
import { sfx, isMuted as isSfxMuted, setMuted as setSfxMuted, unlockAudio as unlockSfx } from '@/game/sound';
// D2 部分拆分：低耦合子组件外移
import { GameOverOverlay } from './battle/GameOverOverlay';
import { LogPanel } from './battle/LogPanel';
import { HeroBar } from './battle/HeroBar';
import { BoardRow } from './battle/BattleStage';
import { HandArea, OpponentHandArea } from './battle/HandArea';
import {
  CardHoverPreview, AimArrow, MulliganOverlay, HelpModal,
  SpeakerOnIcon, SpeakerOffIcon,
} from './battle/BattleOverlay';
import {
  useDamageFloaters, DamageFloaters,
  useAttackFx, AttackFxLayer,
  useSfxFromState,
} from './battle/effects';
import {
  PRESET_MAP, getPreset,
  defNeedsTarget, rectCenter,
  type Point,
} from './battle/shared';

// ============ Battle ============

export interface BattleProps {
  p1Deck: import('@/game/types').Deck;
  p2Deck: import('@/game/types').Deck;
  firstPlayer: PlayerId;
  onQuit: () => void;
  /** 锁定视角（hotseat 默认不传，单人模式传 'P1'） */
  perspective?: PlayerId;
  /** 哪一侧由 AI 控制（单人模式传 'P2'） */
  aiPlayer?: PlayerId;
  /** AI 每步之间的延迟（ms），默认 750 */
  aiStepDelayMs?: number;
  /** AI 难度（C1）。easy = 随机贪心；normal = 原贪心；hard = 1 步前瞻打分。默认 normal */
  aiDifficulty?: AIDifficulty;
  /** 在线模式：本方玩家每次 dispatch 后回调（用于上传到服务器） */
  onAction?: (action: import('@/game/types').Action) => void;
  /** 在线模式：父组件通过此 ref 获取 inject 函数，用于注入对手动作 */
  injectRef?: React.MutableRefObject<((a: import('@/game/types').Action) => void) | null>;
  /** 在线模式：固定随机种子（双端一致） */
  seed?: number;
}

type PendingPlay = { instanceId: string; needsTarget: boolean; origin: Point } | null;
type PendingAttack = { attackerId: string; origin: Point } | null;

export function Battle({ p1Deck, p2Deck, firstPlayer, onQuit, perspective, aiPlayer, aiStepDelayMs = 750, aiDifficulty = 'normal', onAction, injectRef, seed: fixedSeed }: BattleProps) {
  const { state, dispatch: rawDispatch, reset, injectAction } = useGame({
    seed: fixedSeed ?? (Date.now() % 2147483647),
    p1Deck,
    p2Deck,
    firstPlayer,
  });

  // 在线模式：暴露 inject 函数给父组件
  useEffect(() => {
    if (injectRef) injectRef.current = injectAction;
    return () => { if (injectRef) injectRef.current = null; };
  }, [injectRef, injectAction]);

  // C1：对局耗时（从组件挂载到首次 state.ended 变 true 之间）
  const startAtRef = useRef<number>(Date.now());
  const [endedDurationMs, setEndedDurationMs] = useState<number | null>(null);
  useEffect(() => {
    if (state.ended && endedDurationMs === null) {
      setEndedDurationMs(Date.now() - startAtRef.current);
    }
    // reset 后重新计时（state.ended=false 时清空并重置起点）
    if (!state.ended && endedDurationMs !== null) {
      startAtRef.current = Date.now();
      setEndedDurationMs(null);
    }
  }, [state.ended, endedDurationMs]);

  // 包装 dispatch：本方操作时触发 onAction 回调
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const dispatch = useCallback((action: import('@/game/types').Action) => {
    rawDispatch(action);
    onActionRef.current?.(action);
  }, [rawDispatch]);

  // 进入对战：隐藏全局顶部导航（由 GameNav 监听 body 属性）
  useEffect(() => {
    document.body.dataset.inBattle = '1';
    return () => { delete document.body.dataset.inBattle; };
  }, []);

  // live 卡池同步：
  //  1. UI 层：merge 进模块级 PRESET_MAP（imagePath / flavor / description）
  //  2. 引擎层：merge 到 CARD_DB（effects / keywords / cost / attack / health）
  //     → 运营后台修改的战斗数值 / 效果钩子立即被 engine 消费
  // 对战中 CardInstance.currentCost 已在初始化时固化，不会动态变化；
  // 但后续打出该卡时的登场查询 effects、结算数值查询 attack，都走 getCardDef → 拿到 live 版本。
  const livePresets = useCardPresets();
  useEffect(() => {
    for (const p of livePresets) PRESET_MAP[p.id] = p;
    mergeLivePresetsIntoEngine(livePresets);
  }, [livePresets]);

  // me = 玩家视角。hotseat 下跟随 activePlayer，vs AI 下固定为 perspective
  const me: PlayerId = perspective ?? state.activePlayer;
  const opp: PlayerId = me === 'P1' ? 'P2' : 'P1';
  const mePlayer = state.players[me];
  const oppPlayer = state.players[opp];
  const isAIMode = !!aiPlayer;
  const isAITurn = isAIMode && state.activePlayer === aiPlayer;
  // 在线模式：仅在自己回合才能操作；hotseat 模式：始终可操作
  const isOnline = !!onAction;
  const isMyTurn = !perspective || state.activePlayer === perspective;
  const isHumanTurn = isOnline ? isMyTurn : (!isAIMode || state.activePlayer === me);

  const [pendingPlay, setPendingPlay] = useState<PendingPlay>(null);
  const [pendingAttack, setPendingAttack] = useState<PendingAttack>(null);
  const [hoverCard, setHoverCard] = useState<{ defId: string; cost: number; rect: DOMRect } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // 攻击/施法发起瞬间锁定 hover preview，避免动画期间被大卡面挡住
  const hoverUiLockRef = useRef(false);
  const lockHoverUi = useCallback((ms: number = 700) => {
    hoverUiLockRef.current = true;
    setHoverCard(null);
    window.setTimeout(() => { hoverUiLockRef.current = false; }, ms);
  }, []);
  const onHandHover = useCallback((c: CardInstance | null, rect?: DOMRect) => {
    if (hoverUiLockRef.current || isSelectingRef.current) return;
    setHoverCard(c && rect ? { defId: c.defId, cost: c.currentCost, rect } : null);
  }, []);
  const onMinionHover = useCallback((_m: Minion | null, _rect?: DOMRect) => {
    // 上场牌 hover 不再显示大卡面预览，防止挡住战场和动画
    void _m; void _rect;
    setHoverCard(null);
  }, []);
  // 鼠标位置（用于绘制瞄准箭头）
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const isSelectingRef = useRef(false);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (isSelectingRef.current) setMousePos({ x: e.clientX, y: e.clientY }); };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // 移动端触屏无 mouseleave：凡是点到非卡牌锚点（按钮、空白、日志等）就关闭浮动预览
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (!t.closest('[data-hover-anchor]')) setHoverCard(null);
    };
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, []);

  // 切换回合时清除选中态
  const lastTurnRef = useRef(state.turn + '_' + state.activePlayer);
  useEffect(() => {
    const k = state.turn + '_' + state.activePlayer;
    if (k !== lastTurnRef.current) {
      lastTurnRef.current = k;
      setPendingPlay(null);
      setPendingAttack(null);
    }
  }, [state.turn, state.activePlayer]);

  // ====== 合法目标计算 ======
  const legalTargets = useMemo(() => {
    // 返回 { heroes: Set<PlayerId>, minions: Set<string> }
    const heroes = new Set<PlayerId>();
    const minions = new Set<string>();

    const oppHasTaunt = oppPlayer.minions.some((m) => m.keywords.has('taunt') && !m.silenced);

    if (pendingAttack) {
      // 攻击可选目标：敌方 hero（仅当无挡枪）+ 敌方随从（有挡枪则只挡枪、潜水不可选）
      for (const m of oppPlayer.minions) {
        const isStealth = m.keywords.has('stealth') && !m.silenced;
        if (isStealth) continue;
        if (oppHasTaunt) {
          if (m.keywords.has('taunt') && !m.silenced) minions.add(m.instanceId);
        } else {
          minions.add(m.instanceId);
        }
      }
      if (!oppHasTaunt) heroes.add(opp);
      return { heroes, minions };
    }

    if (pendingPlay) {
      // 特殊效果可选目标：所有人物 + 两英雄（不区分敌我，由引擎校验）
      for (const m of mePlayer.minions) minions.add(m.instanceId);
      for (const m of oppPlayer.minions) {
        const isStealth = m.keywords.has('stealth') && !m.silenced;
        if (!isStealth) minions.add(m.instanceId);
      }
      heroes.add(me);
      heroes.add(opp);
      return { heroes, minions };
    }
    return { heroes, minions };
  }, [pendingAttack, pendingPlay, mePlayer, oppPlayer, me, opp]);

  // 可攻击的己方随从
  const attackableMyMinions = useMemo(() => {
    const s = new Set<string>();
    for (const m of mePlayer.minions) {
      if (m.attacksLeftThisTurn > 0 && !m.summoningSickness && m.attack > 0) s.add(m.instanceId);
    }
    return s;
  }, [mePlayer]);

  // ====== HP 变化动画 ======
  const [flashPlayer, setFlashPlayer] = useState<Record<PlayerId, number>>({ P1: 0, P2: 0 });
  const lastHpRef = useRef({ P1: state.players.P1.hp, P2: state.players.P2.hp });
  useEffect(() => {
    for (const p of ['P1', 'P2'] as PlayerId[]) {
      if (state.players[p].hp !== lastHpRef.current[p]) {
        lastHpRef.current[p] = state.players[p].hp;
        setFlashPlayer((f) => ({ ...f, [p]: f[p] + 1 }));
      }
    }
  }, [state.players.P1.hp, state.players.P2.hp]);

  // ====== 事件处理 ======

  const onHandCardClick = useCallback((card: CardInstance, e?: React.MouseEvent<HTMLElement>) => {
    if (state.ended || !isHumanTurn) return;
    if (card.currentCost > mePlayer.mana) return;
    const def = getCardDef(card.defId);
    if (!def) return;
    if (defNeedsTarget(def)) {
      const origin = rectCenter(e?.currentTarget) ?? { x: 0, y: 0 };
      setPendingPlay({ instanceId: card.instanceId, needsTarget: true, origin });
      setPendingAttack(null);
    } else {
      dispatch({ type: 'PLAY_CARD', player: me, instanceId: card.instanceId });
      setPendingPlay(null);
    }
  }, [state.ended, isHumanTurn, me, mePlayer.mana, dispatch]);

  const onMinionClick = useCallback((owner: PlayerId, minion: Minion, e?: React.MouseEvent<HTMLElement>) => {
    if (state.ended || !isHumanTurn) return;
    // 若当前有 pendingAttack 且点的是合法目标
    if (pendingAttack) {
      if (legalTargets.minions.has(minion.instanceId)) {
        // 预捕获 target rect：一击致死时 DOM 会立刻移除，提前缓存以便动画 fallback
        const all = document.querySelectorAll(`[data-minion-id="${minion.instanceId}"]`);
        for (let i = 0; i < all.length; i++) {
          const el = all[i] as HTMLElement;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            lastKnownMinionRectsRef.current.set(minion.instanceId, r);
            break;
          }
        }
        lockHoverUi();
        dispatch({
          type: 'ATTACK', player: me, attackerId: pendingAttack.attackerId,
          target: { kind: 'minion', player: owner, instanceId: minion.instanceId },
        });
        setPendingAttack(null);
      }
      return;
    }
    if (pendingPlay) {
      if (legalTargets.minions.has(minion.instanceId)) {
        lockHoverUi();
        dispatch({
          type: 'PLAY_CARD', player: me, instanceId: pendingPlay.instanceId,
          target: { kind: 'minion', player: owner, instanceId: minion.instanceId },
        });
        setPendingPlay(null);
      }
      return;
    }
    // 无选中态 → 自己随从进入攻击选择
    if (owner === me && attackableMyMinions.has(minion.instanceId)) {
      const origin = rectCenter(e?.currentTarget) ?? { x: 0, y: 0 };
      setPendingAttack({ attackerId: minion.instanceId, origin });
    }
  }, [state.ended, isHumanTurn, me, pendingAttack, pendingPlay, legalTargets, attackableMyMinions, dispatch, lockHoverUi]);

  const onHeroClick = useCallback((player: PlayerId) => {
    if (state.ended || !isHumanTurn) return;
    if (pendingAttack && legalTargets.heroes.has(player)) {
      lockHoverUi();
      dispatch({
        type: 'ATTACK', player: me, attackerId: pendingAttack.attackerId,
        target: { kind: 'hero', player },
      });
      setPendingAttack(null);
      return;
    }
    if (pendingPlay && legalTargets.heroes.has(player)) {
      lockHoverUi();
      dispatch({
        type: 'PLAY_CARD', player: me, instanceId: pendingPlay.instanceId,
        target: { kind: 'hero', player },
      });
      setPendingPlay(null);
    }
  }, [state.ended, isHumanTurn, pendingAttack, pendingPlay, legalTargets, me, dispatch, lockHoverUi]);

  const onHeroAttack = useCallback((e?: React.MouseEvent<HTMLElement>) => {
    if (!isHumanTurn) return;
    if (!mePlayer.equipped) return;
    if (mePlayer.heroAttacksLeftThisTurn <= 0) return;
    const origin = rectCenter(e?.currentTarget) ?? { x: 0, y: 0 };
    setPendingAttack({ attackerId: HERO_ATTACKER_ID, origin });
  }, [isHumanTurn, mePlayer]);

  const cancelSelection = useCallback(() => {
    setPendingPlay(null);
    setPendingAttack(null);
  }, []);

  const endTurn = useCallback(() => {
    if (!isHumanTurn) return;
    dispatch({ type: 'END_TURN', player: me });
  }, [dispatch, isHumanTurn, me]);

  const onSurrender = useCallback(() => {
    if (state.ended) return;
    if (!window.confirm(`确定投降吗？对方（${opp}）将获胜。`)) return;
    dispatch({ type: 'SURRENDER', player: me });
  }, [dispatch, me, opp, state.ended]);

  const onHeroPower = useCallback(() => {
    if (!isHumanTurn) return;
    dispatch({ type: 'HERO_POWER', player: me });
  }, [dispatch, isHumanTurn, me]);

  // ====== 60 秒回合计时器 ======
  const TURN_SECONDS = 60;
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS);
  useEffect(() => {
    // 换牌阶段或结束时不计时；AI 回合 / 在线对手回合不计时
    const skipTimer = state.phase !== 'main' || state.ended || isAITurn || (isOnline && !isMyTurn);
    if (skipTimer) { setSecondsLeft(TURN_SECONDS); return; }
    setSecondsLeft(TURN_SECONDS);
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          // 自动结束回合
          dispatch({ type: 'END_TURN', player: state.activePlayer });
          return TURN_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [state.turn, state.activePlayer, state.phase, state.ended, isAITurn, isOnline, isMyTurn, dispatch]);

  // ====== AI 自动出招（单人模式） ======
  useEffect(() => {
    if (!aiPlayer || state.ended) return;
    // 换牌阶段：AI 需要主动换牌
    if (state.phase === 'mulligan') {
      if (state.mulliganPending[0] !== aiPlayer) return;
      const timer = setTimeout(() => {
        dispatch(aiNextAction(state, aiPlayer, aiDifficulty));
      }, aiStepDelayMs);
      return () => clearTimeout(timer);
    }
    // 主阶段：仅当 AI 回合才出招
    if (state.activePlayer !== aiPlayer) return;
    const timer = setTimeout(() => {
      const action = aiNextAction(state, aiPlayer, aiDifficulty);
      dispatch(action);
    }, aiStepDelayMs);
    return () => clearTimeout(timer);
  }, [state, aiPlayer, aiStepDelayMs, aiDifficulty, dispatch]);

  // ESC 取消
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelSelection(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [cancelSelection]);

  // ====== 飘字 & 音效 & 攻击冲击 ======
  // 缓存当前 minion 的屏幕 rect，用于一击致死时 fallback 播动画（DOM 已移除场景）
  const lastKnownMinionRectsRef = useRef<Map<string, DOMRect>>(new Map());
  useEffect(() => {
    const map = lastKnownMinionRectsRef.current;
    for (const p of ['P1', 'P2'] as PlayerId[]) {
      for (const m of state.players[p].minions) {
        const all = document.querySelectorAll(`[data-minion-id="${m.instanceId}"]`);
        for (let i = 0; i < all.length; i++) {
          const el = all[i] as HTMLElement;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) { map.set(m.instanceId, r); break; }
        }
      }
    }
  });
  const floaters = useDamageFloaters(state);
  const strikes = useAttackFx(state, lastKnownMinionRectsRef);
  useSfxFromState(state, perspective);

  // 静音状态（SSR 下默认 false，挂载后同步 localStorage）
  const [muted, setMutedState] = useState(false);
  useEffect(() => { setMutedState(isSfxMuted()); }, []);

  // 横屏引导：仅在移动端窄屏首次对战显示，用户可关闭
  const [rotateHintDismissed, setRotateHintDismissed] = useState(true);
  useEffect(() => {
    try { setRotateHintDismissed(localStorage.getItem('battle-rotate-hint') === 'dismissed'); }
    catch { setRotateHintDismissed(false); }
  }, []);
  const dismissRotateHint = useCallback(() => {
    try { localStorage.setItem('battle-rotate-hint', 'dismissed'); } catch { /* ignore */ }
    setRotateHintDismissed(true);
  }, []);
  const toggleMute = useCallback(() => {
    unlockSfx();
    const next = !isSfxMuted();
    setSfxMuted(next);
    setMutedState(next);
    if (!next) sfx.click();
  }, []);

  // ====== 渲染 ======

  const isSelecting = !!(pendingAttack || pendingPlay);
  isSelectingRef.current = isSelecting;
  const attackerOrigin = pendingAttack?.origin ?? pendingPlay?.origin ?? null;

  return (
    <div
      className="relative pt-2 pb-2 px-2 sm:pt-3 sm:pb-3 sm:px-4 [@media(max-height:520px)]:!pt-1 [@media(max-height:520px)]:!pb-1 [@media(max-height:520px)]:!px-2 flex flex-col gap-1.5 sm:gap-2 [@media(max-height:520px)]:!gap-1 sm:h-[calc(100dvh-24px)] sm:min-h-0 sm:overflow-hidden [@media(max-height:520px)]:!h-auto [@media(max-height:520px)]:!min-h-0 [@media(max-height:520px)]:!overflow-visible"
      onClickCapture={unlockSfx}
    >
      {/* 背景光效装饰 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#7C3AED] opacity-[0.08] blur-[140px]" />
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-cyan-500 opacity-[0.06] blur-[120px]" />
        <div className="absolute -bottom-40 right-0 w-[600px] h-[600px] rounded-full bg-rose-500 opacity-[0.06] blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,15,35,0.6)_80%)]" />
      </div>
      {/* 主内容保持在光效之上：移动端竖屏自然高度可滚动，sm+ 与短视窗（手机横屏）占满视窗 */}
      <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2 [@media(max-height:520px)]:!gap-1 sm:flex-1 sm:min-h-0 [@media(max-height:520px)]:!flex-none [@media(max-height:520px)]:!min-h-0">
      {/* 顶部状态栏：demo 风格 panel 容器，移动端保持换行 */}
      <div className="relative flex flex-wrap lg:flex-nowrap items-center gap-x-1.5 gap-y-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap lg:flex-nowrap min-w-0">
          {/* 品牌 logo：整合自原顶部导航（纯展示，不可点击） */}
          <div className="flex items-baseline gap-1.5 select-none pr-2 mr-0.5 sm:mr-1 border-r border-white/10 lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:border-r-0 lg:pr-0 lg:mr-0 lg:z-10">
            <span className="font-waterbrush text-[26px] leading-none tracking-tight pr-[6px] bg-gradient-to-br from-[#A78BFA] via-[#C084FC] to-[#FB7185] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(167,139,250,0.45)]">
              1103
            </span>
            <span className="hidden sm:flex items-baseline gap-1.5 leading-none">
              <span className="font-logo text-[22px] leading-none text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]">陈泽传媒</span>
              <span className="font-waterbrush text-[14px] leading-none text-[#A78BFA]/80">CHENZE · TCG</span>
            </span>
          </div>
          <button onClick={onQuit} aria-label="返回" className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 btn-ghost rounded-lg text-sm cursor-pointer">
            <Icons.BackIcon size={14} /><span className="hidden sm:inline">返回</span>
          </button>
          <button onClick={() => reset()} aria-label="重开" className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 btn-ghost rounded-lg text-sm cursor-pointer">
            <Icons.RestartIcon size={14} /><span className="hidden sm:inline">重开</span>
          </button>
          <button onClick={() => setHelpOpen(true)} aria-label="卡牌说明" className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer bg-[#7C3AED]/20 hover:bg-[#7C3AED]/35 border border-[#A78BFA]/40 text-[#E9D5FF] transition-colors duration-200">
            <Icons.HelpIcon size={14} /><span className="hidden sm:inline">卡牌说明</span>
          </button>
          <button onClick={onSurrender} disabled={state.ended || state.phase === 'mulligan'} aria-label="投降"
                  className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer bg-[#F43F5E]/20 hover:bg-[#F43F5E]/40 disabled:opacity-30 disabled:cursor-not-allowed border border-[#FB7185]/40 text-[#FECDD3] transition-colors duration-200">
            <Icons.SurrenderIcon size={14} /><span className="hidden sm:inline">投降</span>
          </button>
          {!state.ended && isAIMode && isAITurn && (
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 rounded text-rose-100 text-xs sm:text-sm font-semibold">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              AI 思考中<span className="tracking-widest">…</span>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3 text-white font-bold flex-nowrap justify-end shrink-0">
          {state.phase === 'main' && !state.ended && (
            <span className={`inline-flex lg:hidden items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg font-black text-base sm:text-lg tabular-nums ${
              secondsLeft <= 10 ? 'bg-rose-500/30 text-rose-100 animate-pulse ring-1 ring-rose-500/50' : 'bg-slate-800/70 text-cyan-200 ring-1 ring-cyan-500/30'
            }`}>
              <Icons.TimerIcon size={14} />
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
            </span>
          )}
          <span className="inline-flex lg:hidden items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-800/60 border border-white/10 text-xs sm:text-sm font-bold">
            <span className="text-white/45 text-[10px] sm:text-[11px] tracking-wide">T</span>
            <span className={state.turn >= MAX_TURNS - 2 ? 'text-rose-300' : 'text-amber-200'}>{state.turn}</span>
            <span className="text-white/35 text-[10px] sm:text-[11px]">/ {MAX_TURNS}</span>
          </span>
          <span className="inline-flex lg:hidden items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-800/60 border border-white/10 text-xs sm:text-sm font-bold">
            <span className="text-white/45 text-[10px] sm:text-[11px] tracking-wide">行动</span>
            <span className="text-amber-300">{state.activePlayer}</span>
          </span>
          {state.phase === 'mulligan' && <span className="text-amber-300 text-xs sm:text-sm">· 换牌阶段</span>}
          {state.ended && (
            <span className="inline-flex items-center gap-1 text-lime-400 text-xs sm:text-sm">
              <Icons.TrophyIcon size={14} />
              {state.winner === 'draw' ? '平局' : state.winner + ' 胜！'}
            </span>
          )}
          <button
            onClick={toggleMute}
            aria-pressed={muted}
            title={muted ? '音效已关闭（点击开启）' : '音效已开启（点击关闭）'}
            className={[
              'inline-flex items-center justify-center w-8 h-8 rounded-lg border cursor-pointer transition-colors',
              muted
                ? 'bg-slate-800/70 text-slate-400 border-slate-600/60 hover:text-slate-200'
                : 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30',
            ].join(' ')}
          >
            {muted ? <SpeakerOffIcon size={16} /> : <SpeakerOnIcon size={16} />}
          </button>
        </div>
      </div>

      {/* 移动端竖屏引导：横屏体验更佳（localStorage 一次性关闭） */}
      {!rotateHintDismissed && (
        <div className="sm:hidden flex items-center gap-2 px-2.5 py-1.5 bg-cyan-500/15 border border-cyan-500/40 rounded-lg text-cyan-100 text-xs shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-cyan-300" aria-hidden>
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M12 18h.01" />
            <path d="M20 10l2 2-2 2" />
            <path d="M22 12h-6" />
          </svg>
          <span className="flex-1 leading-snug">横屏玩更顺畅，战场会自动铺开；竖屏下可上下滑动查看。</span>
          <button onClick={dismissRotateHint} className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs cursor-pointer">
            <Icons.CloseIcon size={10} /> 知道了
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 [@media(max-height:520px)]:!gap-1.5 sm:flex-1 sm:min-h-0 sm:overflow-hidden [@media(max-height:520px)]:!flex-none [@media(max-height:520px)]:!min-h-0 [@media(max-height:520px)]:!overflow-visible">
        {/* 主战场（移动端：原 flex-col 堆叠；桌面端走下方 grid） */}
        <div className="flex flex-col gap-1.5 [@media(max-height:520px)]:!gap-1 min-w-0 lg:hidden sm:flex-1 sm:min-h-0 sm:overflow-hidden [@media(max-height:520px)]:!flex-none [@media(max-height:520px)]:!min-h-0 [@media(max-height:520px)]:!overflow-visible">
          {/* HeroBar + BoardRow 行（对手）*/}
          <div className="shrink-0">
            <HeroBar player={oppPlayer} side="opp" onClick={() => onHeroClick(opp)}
                     targetable={legalTargets.heroes.has(opp)}
                     flashKey={flashPlayer[opp]} />
          </div>
          <div className="shrink-0 rounded-xl px-2 sm:px-3 py-1 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/8 overflow-hidden">
            <OpponentHandArea
              count={oppPlayer.hand.length}
              cardWidth={oppPlayer.hand.length >= 8 ? 40 : oppPlayer.hand.length >= 6 ? 44 : 48}
              maxVisible={8}
              dim={state.ended}
            />
          </div>
          <div className="h-[132px] sm:h-auto sm:flex-1 sm:min-h-0 sm:overflow-hidden [@media(max-height:520px)]:!h-[96px] [@media(max-height:520px)]:!flex-none [@media(max-height:520px)]:!min-h-0 [@media(max-height:520px)]:!overflow-hidden">
            <BoardRow minions={oppPlayer.minions} owner={opp} onClick={(m, e) => onMinionClick(opp, m, e)}
                      onHover={onMinionHover}
                      legalMinions={legalTargets.minions} isSelecting={isSelecting} />
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent shrink-0" />
          <div className="h-[132px] sm:h-auto sm:flex-1 sm:min-h-0 sm:overflow-hidden [@media(max-height:520px)]:!h-[96px] [@media(max-height:520px)]:!flex-none [@media(max-height:520px)]:!min-h-0 [@media(max-height:520px)]:!overflow-hidden">
            <BoardRow minions={mePlayer.minions} owner={me} onClick={(m, e) => onMinionClick(me, m, e)}
                      onHover={onMinionHover}
                      legalMinions={legalTargets.minions} isSelecting={isSelecting}
                      selectedId={pendingAttack?.attackerId}
                      attackableSet={!isSelecting ? attackableMyMinions : undefined} />
          </div>
          <div className="shrink-0">
            <HeroBar player={mePlayer} side="me" onClick={() => onHeroClick(me)}
                     targetable={legalTargets.heroes.has(me)}
                     onHeroAttack={onHeroAttack}
                     onHeroPower={onHeroPower}
                     heroPowerAvailable={!mePlayer.heroPowerUsed && mePlayer.mana >= 2 && !state.ended}
                     flashKey={flashPlayer[me]} />
          </div>
        </div>

        {/* 桌面端（lg+）demo 风格：左 arena（corner HeroBar + BoardRow），右 LogPanel */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] gap-3 flex-1 min-h-0 overflow-hidden">
          <div className="relative grid grid-rows-[minmax(220px,1fr)_auto_minmax(220px,1fr)] [@media(max-height:720px)]:grid-rows-[minmax(170px,1fr)_auto_minmax(170px,1fr)] gap-2 p-3 rounded-2xl bg-slate-900/40 border border-white/5 min-h-0 overflow-hidden">
            <div className="relative pl-[200px] min-h-0">
              <div className="absolute left-0 top-0 bottom-0 w-[186px] flex items-start"><HeroBar variant="corner" player={oppPlayer} side="opp" onClick={() => onHeroClick(opp)} targetable={legalTargets.heroes.has(opp)} flashKey={flashPlayer[opp]} /></div>
              <div className="h-full min-h-[148px]"><BoardRow minions={oppPlayer.minions} owner={opp} onClick={(m, e) => onMinionClick(opp, m, e)} onHover={onMinionHover} legalMinions={legalTargets.minions} isSelecting={isSelecting} /></div>
            </div>
            <div className="relative flex items-center z-10">
              {/* 左侧信息块：对齐 HeroCorner 宽度，展示 回合 / 倒计时 / 行动 */}
              <div className="w-[186px] [@media(max-height:640px)]:w-[168px] shrink-0 flex items-center justify-center gap-2 px-2 py-1 rounded-xl bg-slate-900/60 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[2px]">
                <span className="inline-flex items-baseline gap-0.5">
                  <span className="text-[9px] text-white/45 tracking-[0.2em] uppercase font-semibold">T</span>
                  <b className={`text-sm font-black tabular-nums ${state.turn >= MAX_TURNS - 2 ? 'text-rose-300' : 'text-amber-300'}`}>{state.turn}</b>
                  <span className="text-white/25 text-[9px] tabular-nums">/ {MAX_TURNS}</span>
                </span>
                {state.phase === 'main' && !state.ended && (
                  <>
                    <span className="h-3 w-px bg-white/15" />
                    <span className={`inline-flex items-center gap-0.5 text-xs font-black tabular-nums ${
                      secondsLeft <= 10 ? 'text-rose-300 animate-pulse' : 'text-cyan-200'
                    }`}>
                      <Icons.TimerIcon size={10} />
                      {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
                    </span>
                  </>
                )}
                <span className="h-3 w-px bg-white/15" />
                <span className="inline-flex items-baseline gap-0.5">
                  <span className="text-[9px] text-white/45 tracking-[0.2em] uppercase font-semibold">行动</span>
                  <b className="text-xs font-black text-amber-300">{state.activePlayer}</b>
                </span>
              </div>
              {/* VS 分割线 + 圆形，靠右 flex-1 铺满，居中 BoardRow 区域 */}
              <div className="flex-1 flex items-center justify-center gap-4 pl-3">
                <div className="flex-1 max-w-[260px] h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent shadow-[0_0_16px_rgba(98,240,255,0.6)]" />
                <span className="w-11 h-11 rounded-full flex items-center justify-center font-black text-amber-300 border border-white/15 bg-[radial-gradient(circle,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] shadow-[0_0_20px_rgba(255,207,112,0.25)]">VS</span>
                <div className="flex-1 max-w-[260px] h-px bg-gradient-to-r from-transparent via-rose-400/60 to-transparent shadow-[0_0_16px_rgba(255,143,160,0.6)]" />
              </div>
            </div>
            <div className="relative pl-[200px] min-h-0">
              <div className="absolute left-0 top-0 bottom-0 w-[186px] flex items-end"><HeroBar variant="corner" player={mePlayer} side="me" onClick={() => onHeroClick(me)} targetable={legalTargets.heroes.has(me)} onHeroAttack={onHeroAttack} onHeroPower={onHeroPower} heroPowerAvailable={!mePlayer.heroPowerUsed && mePlayer.mana >= 2 && !state.ended} flashKey={flashPlayer[me]} /></div>
              <div className="h-full min-h-[148px]"><BoardRow minions={mePlayer.minions} owner={me} onClick={(m, e) => onMinionClick(me, m, e)} onHover={onMinionHover} legalMinions={legalTargets.minions} isSelecting={isSelecting} selectedId={pendingAttack?.attackerId} attackableSet={!isSelecting ? attackableMyMinions : undefined} /></div>
            </div>
          </div>
          <LogPanel state={state} />
        </div>

        {/* 移动端日志（桌面端已并入上方 grid） */}
        <div className="lg:hidden"><LogPanel state={state} /></div>

        {/* 手牌 + 结束回合（桌面 / 移动共用，位于底部全宽） */}
        <HandArea hand={mePlayer.hand} mana={mePlayer.mana} ended={state.ended} isSelecting={isSelecting} isHumanTurn={isHumanTurn} pendingPlayId={pendingPlay?.instanceId} deckCount={mePlayer.deck.length} onCardClick={onHandCardClick} onCardHover={onHandHover} onEndTurn={endTurn} />
      </div>

      {/* 攻击冲击线 + 爆发圆环（位于飘字之下） */}
      <AttackFxLayer strikes={strikes} />

      {/* 伤害/治疗飘字层 */}
      <DamageFloaters floaters={floaters} />

      {/* 卡牌悬浮预览（固定位置，避开容器裁切） */}
      <CardHoverPreview card={hoverCard} />

      {/* 瞄准箭头 */}
      {isSelecting && attackerOrigin && (
        <AimArrow from={attackerOrigin} to={mousePos} mode={pendingAttack ? 'attack' : 'cast'} />
      )}

      {/* 帮助弹窗 */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      {/* 胜利 / 失败 全屏弹窗 */}
      {state.ended && (
        <GameOverOverlay
          winner={state.winner}
          me={me}
          onRestart={() => reset()}
          onQuit={onQuit}
          isOnline={isOnline}
          aiDifficulty={isAIMode ? aiDifficulty : undefined}
          durationMs={endedDurationMs ?? undefined}
          turns={state.turn}
        />
      )}

      {/* 换牌阶段弹窗：AI/在线模式下仅对本方玩家显示 */}
      {state.phase === 'mulligan' && state.mulliganPending.length > 0 && (() => {
        const cur = state.mulliganPending[0];
        // AI 模式下只对 perspective 侧玩家显示；AI 侧由 useEffect 自动 dispatch
        if (isAIMode && cur !== me) return null;
        // 在线模式下只显示自己的换牌，对手的由轮询同步
        if (isOnline && cur !== me) return null;
        return (
          <MulliganOverlay
            player={cur}
            hand={state.players[cur].hand}
            onConfirm={(replaceIds) => dispatch({ type: 'MULLIGAN', player: cur, replaceInstanceIds: replaceIds })}
          />
        );
      })()}
      </div>
    </div>
  );
}

// ============ 子组件已全部抽出至 battle/ 子目录（D2 完成） ============
