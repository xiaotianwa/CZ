// AI 决策器 —— 分档策略
// 给定 GameState 与 AI 玩家 id，返回 AI 下一步要执行的 Action
// 调用者循环 dispatch 直到 AI 结束回合（END_TURN）
//
// difficulty:
//   - 'easy'   轻松：贪心的随机版 —— 同类候选动作随机选，不会一直打最优
//   - 'normal' 标准：原贪心（按 cost/威胁度排序选最优）
//   - 'hard'   高压：1 步前瞻 + 打分函数，枚举所有合法 action 选最高分
//
// 策略概要（normal 基线）：
//   1. 若可换牌：换掉 cost > 4 的高费起手
//   2. 主阶段：按 cost 降序尝试出牌（需要目标的自动选优质目标）
//   3. 能斩杀对方 → 全员打脸
//   4. 否则按优先级：打挡枪 > 优质 trade > 打脸 > rush 清场
//   5. 剩余 mana 够 2 且未用技能 → 用玩家技能（抽 1 张）
//   6. 无可做 → END_TURN

import type { Action, CardDef, GameState, Minion, PlayerId, TargetRef } from './types';
import { applyAction, getCardDef, HERO_ATTACKER_ID } from './engine';

export type AIDifficulty = 'easy' | 'normal' | 'hard';

const TARGETED_EFFECT_IDS = new Set([
  'damage_target',
  'silence_target',
  'transform_target_1_1',
  'combo_damage_with_chenze',
]);

function needsTarget(def: CardDef): boolean {
  return (def.effects ?? []).some((e) => TARGETED_EFFECT_IDS.has(e.effectId));
}

function enemyOf(p: PlayerId): PlayerId {
  return p === 'P1' ? 'P2' : 'P1';
}

// ============ 主入口 ============

/**
 * 计算 AI 下一步动作。调用方循环 dispatch 直到返回 END_TURN。
 * 若 state.phase === 'mulligan' 且 AI 需要换牌，返回 MULLIGAN 动作。
 *
 * 兼容旧签名：difficulty 缺省为 'normal'。
 */
export function nextAction(
  state: GameState,
  ai: PlayerId,
  difficulty: AIDifficulty = 'normal',
): Action {
  // 换牌阶段
  if (state.phase === 'mulligan') {
    if (state.mulliganPending.includes(ai) && state.mulliganPending[0] === ai) {
      return decideMulligan(state, ai, difficulty);
    }
    // 非当前换牌者，只能等（正常流程中换牌是顺序进行的）
    return { type: 'END_TURN', player: ai };
  }

  if (state.ended) return { type: 'END_TURN', player: ai };
  if (state.activePlayer !== ai) return { type: 'END_TURN', player: ai };

  // hard 模式：枚举所有合法 action，选打分最高的
  if (difficulty === 'hard') {
    const best = bestLookaheadAction(state, ai);
    if (best) return best;
  }

  // easy/normal 回落到贪心（easy 会在各候选中随机）
  // 1) 优先打出可承担的最优手牌
  const play = tryPlayCard(state, ai, difficulty);
  if (play) return play;

  // 2) 攻击
  const attack = tryAttack(state, ai, difficulty);
  if (attack) return attack;

  // 3) 玩家技能（抽 1 张）—— 仅当剩 2+ 能量且未用
  const p = state.players[ai];
  if (!p.heroPowerUsed && p.mana >= 2) {
    return { type: 'HERO_POWER', player: ai };
  }

  // 4) 结束回合
  return { type: 'END_TURN', player: ai };
}

// ============ 通用工具 ============

function pickRandom<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============ 换牌决策 ============

function decideMulligan(state: GameState, ai: PlayerId, difficulty: AIDifficulty): Action {
  const hand = state.players[ai].hand;
  if (difficulty === 'easy') {
    // easy：每张 50% 概率换，模拟新手"没啥章法"
    const replaceIds = hand
      .filter(() => Math.random() < 0.5)
      .map((c) => c.instanceId);
    return { type: 'MULLIGAN', player: ai, replaceInstanceIds: replaceIds };
  }
  // normal / hard：换掉 cost>=5 的起手牌；保留低费快速铺场
  const replaceIds = hand
    .filter((c) => (getCardDef(c.defId)?.cost ?? 0) >= 5)
    .map((c) => c.instanceId);
  return { type: 'MULLIGAN', player: ai, replaceInstanceIds: replaceIds };
}

// ============ 出牌决策 ============

function tryPlayCard(state: GameState, ai: PlayerId, difficulty: AIDifficulty): Action | null {
  const p = state.players[ai];
  const affordable = p.hand.filter((c) => c.currentCost <= p.mana);
  if (affordable.length === 0) return null;

  // easy：随机洗牌；normal：按 cost 从高到低尝试（优先大牌）
  const ordered = difficulty === 'easy'
    ? shuffle(affordable)
    : [...affordable].sort((a, b) => b.currentCost - a.currentCost);

  for (const card of ordered) {
    const def = getCardDef(card.defId);
    if (!def) continue;

    // 容量限制
    if (def.type === 'character' && p.minions.length >= 6) continue;
    if (def.type === 'event' && p.events.length >= 3) continue;
    // 同 secret 不可重复
    if (def.type === 'event' && def.secretTrigger && p.events.some((e) => e.defId === def.id)) continue;

    // 需要目标的效果
    if (needsTarget(def)) {
      const target = chooseTarget(state, ai, def, difficulty);
      if (!target) continue;
      return { type: 'PLAY_CARD', player: ai, instanceId: card.instanceId, target };
    }

    // 装备：若已有武器，只在攻击 > 当前时才换（easy 不关心直接覆盖）
    if (def.type === 'equipment' && def.subtype === 'weapon' && p.equipped && difficulty !== 'easy') {
      if ((def.attack ?? 0) <= p.equipped.attack) continue;
    }

    return { type: 'PLAY_CARD', player: ai, instanceId: card.instanceId };
  }
  return null;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** 针对需要目标的 effect 选择最优目标（easy 模式在合法候选间随机） */
function chooseTarget(state: GameState, ai: PlayerId, def: CardDef, difficulty: AIDifficulty = 'normal'): TargetRef | null {
  const enemy = enemyOf(ai);
  const enemyP = state.players[enemy];
  // 不可选中：对方潜水（旧称「隐身」）
  const attackableEnemyMinions = enemyP.minions.filter((m) => !(m.keywords.has('stealth') && !m.silenced));

  const effectIds = (def.effects ?? []).map((e) => e.effectId);

  // easy：从所有合法候选中随机挑一个（打脸 or 随机敌方随从）
  if (difficulty === 'easy') {
    const candidates: TargetRef[] = attackableEnemyMinions.map((m) => ({
      kind: 'minion' as const, player: enemy, instanceId: m.instanceId,
    }));
    // 伤害类允许打脸
    if (effectIds.includes('damage_target') || effectIds.includes('combo_damage_with_chenze')) {
      candidates.push({ kind: 'hero', player: enemy });
    }
    return pickRandom(candidates) ?? null;
  }

  // 伤害类（上热搜 / OK了老铁）
  if (effectIds.includes('damage_target') || effectIds.includes('combo_damage_with_chenze')) {
    const amt = estimateDirectDamage(def, state, ai);
    // 能斩杀 → 打脸
    if (amt >= enemyP.hp) {
      return { kind: 'hero', player: enemy };
    }
    // 能一发击杀对方随从 → 打最高性价比（高攻 or 高血）
    const killable = attackableEnemyMinions.filter((m) => amt >= (m.divineShieldActive ? 9999 : m.health));
    if (killable.length > 0) {
      const pick = [...killable].sort((a, b) => priority(b) - priority(a))[0];
      return { kind: 'minion', player: enemy, instanceId: pick.instanceId };
    }
    // 否则打对方最强随从（削血）；若对方空场则打脸
    if (attackableEnemyMinions.length > 0) {
      const pick = [...attackableEnemyMinions].sort((a, b) => priority(b) - priority(a))[0];
      return { kind: 'minion', player: enemy, instanceId: pick.instanceId };
    }
    return { kind: 'hero', player: enemy };
  }

  // 沉默（塑料兄弟情）：打对方最强带效果的
  if (effectIds.includes('silence_target')) {
    const withPower = attackableEnemyMinions.filter(
      (m) => !m.silenced && (m.keywords.size > 0 || m.deathrattles.length > 0 || m.divineShieldActive),
    );
    if (withPower.length === 0) return null;
    const pick = [...withPower].sort((a, b) => priority(b) - priority(a))[0];
    return { kind: 'minion', player: enemy, instanceId: pick.instanceId };
  }

  // 变 1/1（塌房）：打对方最强
  if (effectIds.includes('transform_target_1_1')) {
    if (attackableEnemyMinions.length === 0) return null;
    const pick = [...attackableEnemyMinions].sort((a, b) => priority(b) - priority(a))[0];
    return { kind: 'minion', player: enemy, instanceId: pick.instanceId };
  }

  return null;
}

function priority(m: Minion): number {
  // 威胁度 = 攻击 * 2 + 血量 + 关键字加权
  let score = m.attack * 2 + m.health;
  if (m.keywords.has('taunt')) score += 2;
  if (m.keywords.has('windfury')) score += 3;
  if (m.keywords.has('divineShield')) score += 2;
  if (m.keywords.has('poisonous')) score += 4;
  if (m.keywords.has('lifesteal')) score += 2;
  return score;
}

function estimateDirectDamage(def: CardDef, state: GameState, ai: PlayerId): number {
  for (const eff of def.effects ?? []) {
    if (eff.effectId === 'damage_target' || eff.effectId === 'damage_enemy_hero') {
      return (eff.params?.amount as number) ?? 0;
    }
    if (eff.effectId === 'combo_damage_with_chenze') {
      const base = (eff.params?.base as number) ?? 5;
      const bonus = (eff.params?.bonus as number) ?? 3;
      const hasChenze = state.players[ai].minions.some((m) => m.defId === 'C14');
      return base + (hasChenze ? bonus : 0);
    }
  }
  return 0;
}

// ============ 攻击决策 ============

function tryAttack(state: GameState, ai: PlayerId, difficulty: AIDifficulty = 'normal'): Action | null {
  const p = state.players[ai];
  const enemy = enemyOf(ai);
  const enemyP = state.players[enemy];
  const enemyHasTaunt = enemyP.minions.some((m) => m.keywords.has('taunt') && !m.silenced);
  const attackableEnemyMinions = enemyP.minions.filter((m) => !(m.keywords.has('stealth') && !m.silenced));
  const tauntMinions = enemyP.minions.filter((m) => m.keywords.has('taunt') && !m.silenced);

  // 收集所有可攻击单位
  type Attacker = {
    id: string;
    attack: number;
    health?: number;
    divineShield?: boolean;
    rush?: boolean;
    justSummoned?: boolean;
    charge?: boolean;
    isHero?: boolean;
  };
  const attackers: Attacker[] = [];
  for (const m of p.minions) {
    if (m.attacksLeftThisTurn > 0 && !m.summoningSickness && m.attack > 0) {
      attackers.push({
        id: m.instanceId,
        attack: m.attack,
        health: m.health,
        divineShield: m.divineShieldActive,
        rush: m.keywords.has('rush') && !m.silenced,
        charge: m.keywords.has('charge') && !m.silenced,
        justSummoned: m.justSummoned,
      });
    }
  }
  if (p.equipped && p.equipped.attack > 0 && p.heroAttacksLeftThisTurn > 0) {
    attackers.push({ id: HERO_ATTACKER_ID, attack: p.equipped.attack, isHero: true });
  }
  if (attackers.length === 0) return null;

  // 斩杀检测（仅 normal/hard 才会精确计算总伤；easy 随缘）
  if (difficulty !== 'easy' && !enemyHasTaunt) {
    const totalDmg = attackers.reduce((s, a) => s + (canFace(a) ? a.attack : 0), 0);
    if (totalDmg >= enemyP.hp) {
      // 先用一个能打脸的出手
      for (const a of attackers) {
        if (!canFace(a)) continue;
        return { type: 'ATTACK', player: ai, attackerId: a.id, target: { kind: 'hero', player: enemy } };
      }
    }
  }

  // easy：随机选一个 attacker 攻击随机合法目标
  if (difficulty === 'easy') {
    const a = pickRandom(attackers);
    if (!a) return null;
    // 有挡枪 → 必须打挡枪
    if (enemyHasTaunt) {
      const pick = pickRandom(tauntMinions);
      if (!pick) return null;
      return { type: 'ATTACK', player: ai, attackerId: a.id, target: { kind: 'minion', player: enemy, instanceId: pick.instanceId } };
    }
    const targets: TargetRef[] = attackableEnemyMinions.map((m) => ({
      kind: 'minion' as const, player: enemy, instanceId: m.instanceId,
    }));
    if (canFace(a)) targets.push({ kind: 'hero', player: enemy });
    const t = pickRandom(targets);
    if (!t) return null;
    return { type: 'ATTACK', player: ai, attackerId: a.id, target: t };
  }

  // 逐个 attacker 决策：按攻击力升序（小的先用掉，留大的打脸或 trade 大目标）
  const ordered = [...attackers].sort((a, b) => a.attack - b.attack);
  for (const a of ordered) {
    // 有挡枪 → 必须打挡枪
    if (enemyHasTaunt) {
      // 选最便宜的挡枪（低血优先）
      const pick = [...tauntMinions].sort((x, y) => x.health - y.health)[0];
      return {
        type: 'ATTACK', player: ai, attackerId: a.id,
        target: { kind: 'minion', player: enemy, instanceId: pick.instanceId },
      };
    }

    // 寻找优质 trade：能杀对面 + 自己不死（或带粉丝盾 + 武器不受反噬）
    const killTargets = attackableEnemyMinions.filter((m) => {
      if (m.divineShieldActive) return false; // 不耗主力去撞粉丝盾
      if (a.attack < m.health) return false;
      if (a.isHero) {
        // 武器攻击，我方英雄会吃反噬（m.attack）。只接受反噬 <= 5
        return (m.attack ?? 0) <= 5;
      }
      const myHp = a.health ?? 0;
      // 我方随从能活（或带盾）
      return a.divineShield || m.attack < myHp;
    });
    if (killTargets.length > 0) {
      const pick = [...killTargets].sort((x, y) => priority(y) - priority(x))[0];
      return {
        type: 'ATTACK', player: ai, attackerId: a.id,
        target: { kind: 'minion', player: enemy, instanceId: pick.instanceId },
      };
    }

    // 可打脸 → 打脸
    if (canFace(a)) {
      return { type: 'ATTACK', player: ai, attackerId: a.id, target: { kind: 'hero', player: enemy } };
    }

    // rush 刚登场：只能打随从（任意最弱的）
    if (attackableEnemyMinions.length > 0) {
      const pick = [...attackableEnemyMinions].sort((x, y) => x.health - y.health)[0];
      return {
        type: 'ATTACK', player: ai, attackerId: a.id,
        target: { kind: 'minion', player: enemy, instanceId: pick.instanceId },
      };
    }
    // 对方空场 + 自己是 rush 刚登场：跳过
  }

  return null;

  function canFace(a: Attacker): boolean {
    if (a.isHero) return true;
    if (a.charge) return true;
    if (a.rush && a.justSummoned) return false;
    return true;
  }
}

// ============ hard：1 步前瞻打分 ============

/** 用 applyAction 模拟；若 apply 后出现 'invalid' log 视为非法，返回 null */
function trySim(state: GameState, action: Action): GameState | null {
  try {
    const next = applyAction(state, action);
    const newLogs = next.log.slice(state.log.length);
    if (newLogs.some((l) => l.kind === 'invalid')) return null;
    return next;
  } catch {
    return null;
  }
}

/** 对 state 从 ai 视角打分：越高越有利 */
function scoreState(state: GameState, ai: PlayerId): number {
  if (state.ended) {
    if (state.winner === ai) return 1e6;
    if (state.winner && state.winner !== 'draw') return -1e6;
    return 0;
  }
  const me = state.players[ai];
  const opp = state.players[enemyOf(ai)];
  let score = 0;
  // HP：压迫对方比保自己更积极
  score += me.hp * 1.3;
  score -= opp.hp * 2.0;
  // 手牌/能量
  score += me.hand.length * 1.2;
  score -= opp.hand.length * 0.8;
  score += me.mana * 0.3;
  // 场面随从
  for (const m of me.minions) score += m.attack * 1.6 + m.health * 1.1 + kwBonus(m);
  for (const m of opp.minions) score -= (m.attack * 1.8 + m.health * 1.0 + kwBonus(m));
  // 装备武器
  if (me.equipped) score += me.equipped.attack * me.equipped.durability * 0.4;
  if (opp.equipped) score -= opp.equipped.attack * opp.equipped.durability * 0.5;
  return score;
}

function kwBonus(m: Minion): number {
  let b = 0;
  if (m.keywords.has('taunt')) b += 1.5;
  if (m.keywords.has('windfury')) b += 2;
  if (m.keywords.has('divineShield')) b += 2;
  if (m.keywords.has('poisonous')) b += 3;
  if (m.keywords.has('lifesteal')) b += 1.5;
  if (m.keywords.has('stealth')) b += 1;
  if (m.keywords.has('reborn')) b += 2;
  return b;
}

/** 枚举所有合法 action，返回打分最高的。END_TURN 总是候选之一作为保底。 */
function bestLookaheadAction(state: GameState, ai: PlayerId): Action | null {
  const candidates: Action[] = collectCandidates(state, ai);
  if (candidates.length === 0) return null;

  let bestScore = -Infinity;
  let bestAction: Action | null = null;
  for (const act of candidates) {
    const next = trySim(state, act);
    if (!next) continue;
    // END_TURN 后进入对方回合：我方无法再行动，打分应稍微惩罚（避免一开始就 END_TURN）
    let s = scoreState(next, ai);
    if (act.type === 'END_TURN') s -= 5;
    if (s > bestScore) {
      bestScore = s;
      bestAction = act;
    }
  }
  return bestAction;
}

/** 枚举所有可能候选（限制在"单步"粒度，不展开 END_TURN 下对手的所有可能） */
function collectCandidates(state: GameState, ai: PlayerId): Action[] {
  const out: Action[] = [];
  const p = state.players[ai];
  const enemy = enemyOf(ai);
  const enemyP = state.players[enemy];
  const attackableEnemyMinions = enemyP.minions.filter((m) => !(m.keywords.has('stealth') && !m.silenced));

  // PLAY_CARD
  for (const card of p.hand) {
    if (card.currentCost > p.mana) continue;
    const def = getCardDef(card.defId);
    if (!def) continue;
    if (def.type === 'character' && p.minions.length >= 6) continue;
    if (def.type === 'event' && p.events.length >= 3) continue;
    if (def.type === 'event' && def.secretTrigger && p.events.some((e) => e.defId === def.id)) continue;

    if (needsTarget(def)) {
      // 对所有合法目标各生成一个候选
      const targets: TargetRef[] = attackableEnemyMinions.map((m) => ({
        kind: 'minion' as const, player: enemy, instanceId: m.instanceId,
      }));
      const effectIds = (def.effects ?? []).map((e) => e.effectId);
      if (effectIds.includes('damage_target') || effectIds.includes('combo_damage_with_chenze')) {
        targets.push({ kind: 'hero', player: enemy });
      }
      for (const t of targets) {
        out.push({ type: 'PLAY_CARD', player: ai, instanceId: card.instanceId, target: t });
      }
    } else {
      out.push({ type: 'PLAY_CARD', player: ai, instanceId: card.instanceId });
    }
  }

  // ATTACK
  const attackers: { id: string; isHero?: boolean }[] = [];
  for (const m of p.minions) {
    if (m.attacksLeftThisTurn > 0 && !m.summoningSickness && m.attack > 0) {
      attackers.push({ id: m.instanceId });
    }
  }
  if (p.equipped && p.equipped.attack > 0 && p.heroAttacksLeftThisTurn > 0) {
    attackers.push({ id: HERO_ATTACKER_ID, isHero: true });
  }
  const enemyHasTaunt = enemyP.minions.some((m) => m.keywords.has('taunt') && !m.silenced);
  const tauntMinions = enemyP.minions.filter((m) => m.keywords.has('taunt') && !m.silenced);
  for (const a of attackers) {
    if (enemyHasTaunt) {
      for (const t of tauntMinions) {
        out.push({ type: 'ATTACK', player: ai, attackerId: a.id, target: { kind: 'minion', player: enemy, instanceId: t.instanceId } });
      }
    } else {
      for (const m of attackableEnemyMinions) {
        out.push({ type: 'ATTACK', player: ai, attackerId: a.id, target: { kind: 'minion', player: enemy, instanceId: m.instanceId } });
      }
      // 打脸（rush 首回合不行；hero/charge 可以）
      out.push({ type: 'ATTACK', player: ai, attackerId: a.id, target: { kind: 'hero', player: enemy } });
    }
  }

  // HERO_POWER
  if (!p.heroPowerUsed && p.mana >= 2) {
    out.push({ type: 'HERO_POWER', player: ai });
  }

  // 保底：END_TURN
  out.push({ type: 'END_TURN', player: ai });

  return out;
}
