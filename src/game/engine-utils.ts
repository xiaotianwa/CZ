// 引擎工具函数：纯函数的 state 变换原子
// 所有函数不 mutate 输入 state，返回新对象

import type {
  CardInstance,
  EventCard,
  GameState,
  LogEntry,
  Minion,
  PlayerId,
  PlayerState,
  TargetRef,
} from './types';
// 循环依赖：effects 也 import engine-utils。ESM 允许，运行时 Effects.runEffect 在首次调用时已定义。
import * as Effects from './effects';
// 循环引用：engine.ts 也 import 本模块；仅在函数体内读取 CARD_DB，运行时已初始化。
import { CARD_DB } from './engine';

// ============ PlayerId ============

export function enemyOf(id: PlayerId): PlayerId {
  return id === 'P1' ? 'P2' : 'P1';
}

// ============ 日志 ============

export function addLog(state: GameState, entry: LogEntry): GameState {
  return { ...state, log: [...state.log, entry] };
}

// ============ Player 更新 ============

export function updatePlayer(
  state: GameState,
  id: PlayerId,
  updater: (p: PlayerState) => PlayerState,
): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [id]: updater(state.players[id]),
    },
  };
}

// ============ Minion 更新/查找 ============

export function findMinion(
  state: GameState,
  owner: PlayerId,
  instanceId: string,
): Minion | undefined {
  return state.players[owner].minions.find((m) => m.instanceId === instanceId);
}

export function findMinionAnywhere(
  state: GameState,
  instanceId: string,
): { owner: PlayerId; minion: Minion } | undefined {
  for (const pid of ['P1', 'P2'] as PlayerId[]) {
    const m = state.players[pid].minions.find((x) => x.instanceId === instanceId);
    if (m) return { owner: pid, minion: m };
  }
  return undefined;
}

export function updateMinion(
  state: GameState,
  owner: PlayerId,
  instanceId: string,
  updater: (m: Minion) => Minion,
): GameState {
  return updatePlayer(state, owner, (p) => ({
    ...p,
    minions: p.minions.map((m) => (m.instanceId === instanceId ? updater(m) : m)),
  }));
}

export function allMinions(state: GameState): Minion[] {
  return [...state.players.P1.minions, ...state.players.P2.minions];
}

// ============ RNG（可复现） ============

/** 基于 mulberry32，返回 [0,1) */
export function nextRandom(state: GameState): [number, GameState] {
  let a = (state.seed + state.rngCursor * 0x6d2b79f5) | 0;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  const v = ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  return [v, { ...state, rngCursor: state.rngCursor + 1 }];
}

export function shuffle<T>(state: GameState, arr: T[]): [T[], GameState] {
  const out = [...arr];
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const [r, ns] = nextRandom(s);
    s = ns;
    const j = Math.floor(r * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return [out, s];
}

// ============ 抽牌 ============

export function drawCards(state: GameState, owner: PlayerId, count: number): GameState {
  let next = state;
  for (let i = 0; i < count; i++) {
    next = drawOne(next, owner);
    if (next.ended) break;
  }
  return next;
}

function drawOne(state: GameState, owner: PlayerId): GameState {
  const p = state.players[owner];
  if (p.deck.length === 0) {
    // 疲劳
    const fatigueDmg = p.fatigue + 1;
    const afterFatigue = updatePlayer(state, owner, (pl) => ({
      ...pl,
      fatigue: fatigueDmg,
    }));
    const logged = addLog(afterFatigue, {
      turn: state.turn,
      player: owner,
      kind: 'fatigue',
      text: `${owner} 疲劳 -${fatigueDmg}`,
    });
    return dealDamage(logged, { kind: 'hero', player: owner }, fatigueDmg, {
      kind: 'hero',
      id: 'fatigue',
      owner,
    });
  }
  const [card, ...rest] = p.deck;
  const isBurn = p.hand.length >= 10;
  let next = updatePlayer(state, owner, (pl) => ({
    ...pl,
    deck: rest,
    // 手牌上限 10，超出的烧毁
    hand: isBurn ? pl.hand : [...pl.hand, card],
    graveyard: isBurn ? [...pl.graveyard, card] : pl.graveyard,
  }));
  next = addLog(next, {
    turn: next.turn,
    player: owner,
    kind: isBurn ? 'burn' : 'draw',
    text: isBurn ? `${owner} 手牌已满，烧毁 ${card.defId}` : `${owner} 抽牌 ${card.defId}`,
  });
  return next;
}

// ============ 暗箱（旧称「奥秘」）内部工具 ============

/** 运行一张 secret 自身的 onSecretTrigger 钩子（按 CARD_DB 查询 def 上挂的 effect）。 */
function runSecretHooks(state: GameState, sec: EventCard, owner: PlayerId): GameState {
  const def = CARD_DB.get(sec.defId);
  const hooks = (def?.effects ?? []).filter((e) => e.trigger === 'onSecretTrigger');
  let s = state;
  for (const h of hooks) {
    s = Effects.runEffect(s, h.effectId, {
      source: { kind: 'event', id: sec.instanceId, owner },
      params: h.params,
    });
  }
  return s;
}

/** 把触发过的 secret 从事件槽移到墓地（带 triggered 标记避免同回合重入）。 */
function consumeSecret(state: GameState, sec: EventCard, owner: PlayerId): GameState {
  return updatePlayer(state, owner, (p) => ({
    ...p,
    events: p.events.filter((e) => e.instanceId !== sec.instanceId),
    graveyard: [
      ...p.graveyard,
      { instanceId: sec.instanceId, defId: sec.defId, owner, currentCost: 0 },
    ],
  }));
}

// ============ 伤害结算 ============

export function dealDamage(
  state: GameState,
  target: TargetRef,
  amount: number,
  source: { kind: 'card' | 'minion' | 'hero' | 'event'; id: string; owner: PlayerId },
): GameState {
  if (target.kind === 'none' || amount <= 0 || state.ended) return state;

  if (target.kind === 'hero') {
    let finalAmount = amount;
    let s = state;
    // 暗箱 1：enemyPlaysEffectDamage（来源是效果/道具卡 + 敌方英雄）→ 取消伤害
    if (
      source.kind === 'card' &&
      source.owner !== target.player &&
      finalAmount > 0
    ) {
      const secrets = s.players[target.player].events.filter(
        (e) =>
          e.kind === 'secret' &&
          !e.triggered &&
          e.secretTrigger === 'enemyPlaysEffectDamage',
      );
      if (secrets.length > 0) {
        const sec = secrets[0];
        s = addLog(s, {
          turn: s.turn,
          player: target.player,
          kind: 'secret',
          text: `暗箱触发: ${sec.defId}（效果伤害被无效）`,
        });
        s = runSecretHooks(s, sec, target.player);
        s = consumeSecret(s, sec, target.player);
        finalAmount = 0;
      }
    }
    // 暗箱 2：heroTakesDamageGte5（任意来源 ≥5 伤害）→ 减为 1，再执行暗箱自身 hooks
    if (
      finalAmount >= 5 &&
      source.owner !== target.player
    ) {
      const secrets = s.players[target.player].events.filter(
        (e) =>
          e.kind === 'secret' &&
          !e.triggered &&
          e.secretTrigger === 'heroTakesDamageGte5',
      );
      if (secrets.length > 0) {
        const sec = secrets[0];
        s = addLog(s, {
          turn: s.turn,
          player: target.player,
          kind: 'secret',
          text: `暗箱触发: ${sec.defId}（伤害改为 1）`,
        });
        finalAmount = 1;
        s = runSecretHooks(s, sec, target.player);
        s = consumeSecret(s, sec, target.player);
      }
    }
    if (finalAmount <= 0) return checkGameOver(s);
    const logged = addLog(s, {
      turn: s.turn,
      player: target.player,
      kind: 'damage',
      text: `${target.player} 玩家 -${finalAmount}（来源 ${source.id}）`,
    });
    const next = updatePlayer(logged, target.player, (p) => ({
      ...p,
      hp: p.hp - finalAmount,
    }));
    return checkGameOver(next);
  }

  // minion
  return updateMinionWithDamage(state, target.player, target.instanceId, amount, source);
}

function updateMinionWithDamage(
  state: GameState,
  owner: PlayerId,
  instanceId: string,
  amount: number,
  source: { kind: 'card' | 'minion' | 'hero' | 'event'; id: string; owner: PlayerId },
): GameState {
  const m = findMinion(state, owner, instanceId);
  if (!m) return state;

  // 粉丝盾：吸收首次伤害
  if (m.divineShieldActive && amount > 0) {
    const logged = addLog(state, {
      turn: state.turn,
      player: owner,
      kind: 'damage',
      text: `${m.defId} 粉丝盾抵消 ${amount}`,
    });
    return updateMinion(logged, owner, instanceId, (x) => ({
      ...x,
      divineShieldActive: false,
    }));
  }

  let next = updateMinion(state, owner, instanceId, (x) => ({
    ...x,
    health: x.health - amount,
  }));
  next = addLog(next, {
    turn: next.turn,
    player: owner,
    kind: 'damage',
    text: `${m.defId} -${amount}`,
  });

  // 封杀（旧称「剧毒」）：来源若是携带 poisonous 的人物，目标直接死
  if (source.kind === 'minion') {
    const src = findMinionAnywhere(state, source.id);
    if (src && src.minion.keywords.has('poisonous') && !src.minion.silenced) {
      next = updateMinion(next, owner, instanceId, (x) => ({ ...x, health: 0 }));
    }
  }

  return next;
}

// ============ 治疗 ============

export function healHero(state: GameState, owner: PlayerId, amount: number): GameState {
  if (amount <= 0) return state;
  const logged = addLog(state, {
    turn: state.turn,
    player: owner,
    kind: 'heal',
    text: `${owner} 玩家 +${amount}`,
  });
  return updatePlayer(logged, owner, (p) => ({
    ...p,
    hp: Math.min(p.hpMax, p.hp + amount),
  }));
}

export function healMinion(
  state: GameState,
  owner: PlayerId,
  instanceId: string,
  amount: number,
): GameState {
  if (amount <= 0) return state;
  return updateMinion(state, owner, instanceId, (m) => ({
    ...m,
    health: Math.min(m.maxHealth, m.health + amount),
  }));
}

// ============ 死亡结算 ============

/** 清理所有 HP<=0 的人物，触发退场（旧称「亡语」） */
export function reapMinions(state: GameState): GameState {
  // 需要反复扫描，直到没有新死亡（退场可能产生连锁死亡）
  let next = state;
  for (let pass = 0; pass < 10; pass++) {
    const dead: { owner: PlayerId; minion: Minion }[] = [];
    for (const pid of ['P1', 'P2'] as PlayerId[]) {
      for (const m of next.players[pid].minions) {
        if (m.health <= 0) dead.push({ owner: pid, minion: m });
      }
    }
    if (dead.length === 0) break;
    // 移除并放入墓地，顺序 log
    for (const { owner, minion } of dead) {
      // 复出（旧称「不朽」）：首次死亡后以 1 血复活（未被沉默时生效）
      if (minion.rebornAvailable && !minion.silenced) {
        next = updateMinion(next, owner, minion.instanceId, (m) => ({
          ...m,
          health: 1,
          rebornAvailable: false,
        }));
        next = addLog(next, {
          turn: next.turn,
          player: owner,
          kind: 'death',
          text: `${minion.defId} 触发人气永驻，以 1 血复活`,
        });
        continue;
      }
      next = updatePlayer(next, owner, (p) => ({
        ...p,
        minions: p.minions.filter((x) => x.instanceId !== minion.instanceId),
        graveyard: [
          ...p.graveyard,
          {
            instanceId: minion.instanceId,
            defId: minion.defId,
            owner,
            currentCost: 0,
          },
        ],
      }));
      next = addLog(next, {
        turn: next.turn,
        player: owner,
        kind: 'death',
        text: `${minion.defId} 死亡`,
      });
      // 退场（旧称「亡语」）：仅未被沉默时触发
      if (!minion.silenced) {
        for (const hook of minion.deathrattles) {
          next = Effects.runEffect(next, hook.effectId, {
            source: { kind: 'minion', id: minion.instanceId, owner },
            params: hook.params,
          });
          next = addLog(next, {
            turn: next.turn,
            player: owner,
            kind: 'deathrattle',
            text: `${minion.defId} 退场: ${hook.effectId}`,
          });
        }
      }
    }
  }
  return next;
}

// ============ 游戏结束判定 ============

export function checkGameOver(state: GameState): GameState {
  if (state.ended) return state;
  const p1Dead = state.players.P1.hp <= 0 || state.players.P1.surrendered;
  const p2Dead = state.players.P2.hp <= 0 || state.players.P2.surrendered;
  if (!p1Dead && !p2Dead) return state;
  let winner: PlayerId | 'draw';
  if (p1Dead && p2Dead) winner = 'draw';
  else if (p1Dead) winner = 'P2';
  else winner = 'P1';
  return addLog(
    { ...state, ended: true, winner },
    {
      turn: state.turn,
      player: winner === 'draw' ? 'P1' : winner,
      kind: 'gameOver',
      text: `对局结束：${winner === 'draw' ? '平局' : winner + ' 胜利'}`,
    },
  );
}

// ============ 挡枪辅助（旧称「嘲讽」） ============

export function hasTauntMinion(state: GameState, owner: PlayerId): boolean {
  return state.players[owner].minions.some(
    (m) => m.keywords.has('taunt') && !m.silenced && !m.keywords.has('stealth'),
  );
}
