/**
 * 好友房 API 共享工具：权威校验 + ELO 结算
 */
import { initGame, applyAction } from '@/game/engine';
import { registerAllCards } from '@/game/cards';
import type { Action, Deck, GameState, PlayerId } from '@/game/types';

// 服务端启动时注册一次硬编码卡池（幂等）
let cardsRegistered = false;
function ensureCardsRegistered(): void {
  if (cardsRegistered) return;
  try { registerAllCards(); } catch { /* 已注册会抛，忽略 */ }
  cardsRegistered = true;
}

export interface RoomStateShape {
  seed: number;
  firstPlayer: PlayerId;
  actions: Action[];
  /** 可选：对局结束标记（由服务端在结算时写入） */
  ended?: boolean;
  winnerId?: string | null;
}

/** 从房间 state + 双方 deck 完整重建 GameState */
export function rebuildGameState(params: {
  seed: number;
  firstPlayer: PlayerId;
  p1Deck: Deck;
  p2Deck: Deck;
  actions: Action[];
}): GameState {
  ensureCardsRegistered();
  let state = initGame({
    seed: params.seed,
    firstPlayer: params.firstPlayer,
    p1Deck: params.p1Deck,
    p2Deck: params.p2Deck,
    skipMulligan: false,
  });
  for (const a of params.actions) {
    state = applyAction(state, a);
  }
  return state;
}

/** 校验一个新动作能否在当前 state 下执行。返回 [valid, newState | null, reason] */
export function validateAction(
  state: GameState,
  action: Action,
): { valid: boolean; nextState: GameState | null; reason?: string } {
  if (state.ended) {
    return { valid: false, nextState: null, reason: '对局已结束' };
  }
  try {
    const next = applyAction(state, action);
    // 对比 log：若 apply 后新增了 kind:'invalid' 日志，视为非法
    const newLogs = next.log.slice(state.log.length);
    const hasInvalid = newLogs.some((l) => l.kind === 'invalid');
    if (hasInvalid) {
      const msg = newLogs.find((l) => l.kind === 'invalid')?.text || '动作非法';
      return { valid: false, nextState: null, reason: msg };
    }
    return { valid: true, nextState: next };
  } catch (err) {
    return { valid: false, nextState: null, reason: (err as Error).message || '引擎异常' };
  }
}

/** 解析房间 state JSON（带默认值容错） */
export function parseRoomState(raw: string | null | undefined): RoomStateShape {
  try {
    const obj = JSON.parse(raw || '{}');
    return {
      seed: typeof obj.seed === 'number' ? obj.seed : 0,
      firstPlayer: obj.firstPlayer === 'P2' ? 'P2' : 'P1',
      actions: Array.isArray(obj.actions) ? obj.actions : [],
      ended: !!obj.ended,
      winnerId: obj.winnerId ?? null,
    };
  } catch {
    return { seed: 0, firstPlayer: 'P1', actions: [] };
  }
}

/** 解析 deck JSON */
export function parseDeck(raw: string | null | undefined): Deck | null {
  try {
    const obj = JSON.parse(raw || '{}');
    if (!obj.cards || !Array.isArray(obj.cards)) return null;
    return {
      heroName: obj.heroName || '玩家',
      heroPowerId: obj.heroPowerId || 'hp_draw1',
      cards: obj.cards,
    };
  } catch {
    return null;
  }
}

/** ELO 计算（K=32）。返回新评分 [ratingA, ratingB]。 */
export function calcElo(
  ratingA: number,
  ratingB: number,
  winner: 'A' | 'B' | 'draw',
  K = 32,
): [number, number] {
  const expA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expB = 1 - expA;
  const scoreA = winner === 'A' ? 1 : winner === 'B' ? 0 : 0.5;
  const scoreB = 1 - scoreA;
  const newA = Math.round(ratingA + K * (scoreA - expA));
  const newB = Math.round(ratingB + K * (scoreB - expB));
  return [newA, newB];
}

/** 根据评分返回段位名 */
export function tierOf(rating: number): string {
  if (rating >= 2000) return 'master';
  if (rating >= 1700) return 'diamond';
  if (rating >= 1400) return 'gold';
  if (rating >= 1100) return 'silver';
  return 'iron';
}
