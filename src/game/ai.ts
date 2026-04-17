// AI 决策器 —— 贪心策略
// 给定 GameState 与 AI 玩家 id，返回 AI 下一步要执行的 Action
// 调用者循环 dispatch 直到 AI 结束回合（END_TURN）
//
// 策略概要：
//   1. 若可换牌：换掉 cost > 4 的高费起手
//   2. 主阶段：按 cost 降序尝试出牌（需要目标的自动选优质目标）
//   3. 能斩杀对方 → 全员打脸
//   4. 否则按优先级：打嘲讽 > 优质 trade > 打脸 > rush 清场
//   5. 剩余 mana 够 2 且未用技能 → 用玩家技能（抽 1 张）
//   6. 无可做 → END_TURN

import type { Action, CardDef, GameState, Minion, PlayerId, TargetRef } from './types';
import { getCardDef, HERO_ATTACKER_ID } from './engine';

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
 */
export function nextAction(state: GameState, ai: PlayerId): Action {
  // 换牌阶段
  if (state.phase === 'mulligan') {
    if (state.mulliganPending.includes(ai) && state.mulliganPending[0] === ai) {
      return decideMulligan(state, ai);
    }
    // 非当前换牌者，只能等（正常流程中换牌是顺序进行的）
    return { type: 'END_TURN', player: ai };
  }

  if (state.ended) return { type: 'END_TURN', player: ai };
  if (state.activePlayer !== ai) return { type: 'END_TURN', player: ai };

  // 1) 优先打出可承担的最优手牌
  const play = tryPlayCard(state, ai);
  if (play) return play;

  // 2) 攻击
  const attack = tryAttack(state, ai);
  if (attack) return attack;

  // 3) 玩家技能（抽 1 张）—— 仅当剩 2+ 能量且未用
  const p = state.players[ai];
  if (!p.heroPowerUsed && p.mana >= 2) {
    return { type: 'HERO_POWER', player: ai };
  }

  // 4) 结束回合
  return { type: 'END_TURN', player: ai };
}

// ============ 换牌决策 ============

function decideMulligan(state: GameState, ai: PlayerId): Action {
  const hand = state.players[ai].hand;
  // 换掉 cost>=5 的起手牌；保留低费快速铺场
  const replaceIds = hand
    .filter((c) => (getCardDef(c.defId)?.cost ?? 0) >= 5)
    .map((c) => c.instanceId);
  return { type: 'MULLIGAN', player: ai, replaceInstanceIds: replaceIds };
}

// ============ 出牌决策 ============

function tryPlayCard(state: GameState, ai: PlayerId): Action | null {
  const p = state.players[ai];
  const enemy = enemyOf(ai);
  const affordable = p.hand.filter((c) => c.currentCost <= p.mana);
  if (affordable.length === 0) return null;

  // 按 cost 从高到低尝试（优先大牌）
  const sorted = [...affordable].sort((a, b) => b.currentCost - a.currentCost);

  for (const card of sorted) {
    const def = getCardDef(card.defId);
    if (!def) continue;

    // 容量限制
    if (def.type === 'character' && p.minions.length >= 6) continue;
    if (def.type === 'event' && p.events.length >= 3) continue;
    // 同 secret 不可重复
    if (def.type === 'event' && def.secretTrigger && p.events.some((e) => e.defId === def.id)) continue;

    // 需要目标的效果
    if (needsTarget(def)) {
      const target = chooseTarget(state, ai, def);
      if (!target) continue;
      return { type: 'PLAY_CARD', player: ai, instanceId: card.instanceId, target };
    }

    // 装备：若已有武器，只在攻击 > 当前时才换
    if (def.type === 'equipment' && def.subtype === 'weapon' && p.equipped) {
      if ((def.attack ?? 0) <= p.equipped.attack) continue;
    }

    return { type: 'PLAY_CARD', player: ai, instanceId: card.instanceId };
  }
  return null;
}

/** 针对需要目标的 effect 选择最优目标 */
function chooseTarget(state: GameState, ai: PlayerId, def: CardDef): TargetRef | null {
  const enemy = enemyOf(ai);
  const enemyP = state.players[enemy];
  // 不可选中：对方隐身
  const attackableEnemyMinions = enemyP.minions.filter((m) => !(m.keywords.has('stealth') && !m.silenced));

  const effectIds = (def.effects ?? []).map((e) => e.effectId);

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

function tryAttack(state: GameState, ai: PlayerId): Action | null {
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

  // 斩杀检测：若对方无嘲讽 + 所有攻击总和 >= 对方 HP
  if (!enemyHasTaunt) {
    const totalDmg = attackers.reduce((s, a) => s + (canFace(a) ? a.attack : 0), 0);
    if (totalDmg >= enemyP.hp) {
      // 先用一个能打脸的出手
      for (const a of attackers) {
        if (!canFace(a)) continue;
        return { type: 'ATTACK', player: ai, attackerId: a.id, target: { kind: 'hero', player: enemy } };
      }
    }
  }

  // 逐个 attacker 决策：按攻击力升序（小的先用掉，留大的打脸或 trade 大目标）
  const ordered = [...attackers].sort((a, b) => a.attack - b.attack);
  for (const a of ordered) {
    // 有嘲讽 → 必须打嘲讽
    if (enemyHasTaunt) {
      // 选最便宜的嘲讽（低血优先）
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
