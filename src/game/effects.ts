// 效果函数注册表
// 每张卡的登场/退场/被动都通过 effectId 映射到此处的函数（旧称「战吼/亡语」）
// 函数必须是纯函数：接收 state 返回新 state，不 mutate

import type {
  EffectContext,
  EffectFn,
  GameState,
  Keyword,
  Minion,
} from './types';
import {
  addLog,
  allMinions,
  dealDamage,
  drawCards,
  enemyOf,
  findMinion,
  healHero,
  nextRandom,
  updateMinion,
  updatePlayer,
} from './engine-utils';
// 循环引用：engine.ts 也 import 本模块；仅在运行时（函数体内）读取 CARD_DB，
// 运行时 Map 已初始化，不会出问题。
import { CARD_DB } from './engine';

// ============ Registry ============

const registry = new Map<string, EffectFn>();

export function registerEffect(id: string, fn: EffectFn): void {
  if (registry.has(id)) throw new Error(`Effect already registered: ${id}`);
  registry.set(id, fn);
}

export function getEffect(id: string): EffectFn | undefined {
  return registry.get(id);
}

export function runEffect(
  state: GameState,
  effectId: string,
  ctx: EffectContext,
): GameState {
  const fn = registry.get(effectId);
  if (!fn) {
    return addLog(state, {
      turn: state.turn,
      player: ctx.source.owner,
      kind: 'invalid',
      text: `[效果未注册] ${effectId}`,
    });
  }
  return fn(state, ctx);
}

// ============ 通用帮助 ============

function paramNum(ctx: EffectContext, key: string, fallback = 0): number {
  const v = ctx.params?.[key];
  return typeof v === 'number' ? v : fallback;
}

// ============ 通用原子效果 ============

// damage_target: 对目标造成 N 伤害（params.amount）
registerEffect('damage_target', (s, ctx) => {
  const amt = paramNum(ctx, 'amount', 0);
  if (!ctx.target || ctx.target.kind === 'none') return s;
  return dealDamage(s, ctx.target, amt, ctx.source);
});

// damage_enemy_hero: 对敌方经纪人造成 N 伤害
registerEffect('damage_enemy_hero', (s, ctx) => {
  const amt = paramNum(ctx, 'amount', 0);
  const enemy = enemyOf(ctx.source.owner);
  return dealDamage(s, { kind: 'hero', player: enemy }, amt, ctx.source);
});

// damage_all_enemy_minions: AOE 对所有敌方人物 N 伤害
registerEffect('damage_all_enemy_minions', (s, ctx) => {
  const amt = paramNum(ctx, 'amount', 0);
  const enemy = enemyOf(ctx.source.owner);
  let next = s;
  for (const m of [...next.players[enemy].minions]) {
    next = dealDamage(next, { kind: 'minion', player: enemy, instanceId: m.instanceId }, amt, ctx.source);
  }
  return next;
});

// damage_all_minions: AOE 对所有人物 N 伤害（含己方）
registerEffect('damage_all_minions', (s, ctx) => {
  const amt = paramNum(ctx, 'amount', 0);
  let next = s;
  for (const m of allMinions(next)) {
    next = dealDamage(next, { kind: 'minion', player: m.owner, instanceId: m.instanceId }, amt, ctx.source);
  }
  return next;
});

// heal_self_hero: 回己方经纪人 N 流量
registerEffect('heal_self_hero', (s, ctx) => {
  const amt = paramNum(ctx, 'amount', 0);
  return healHero(s, ctx.source.owner, amt);
});

// draw_cards: 抽 N 张
registerEffect('draw_cards', (s, ctx) => {
  const n = paramNum(ctx, 'amount', 1);
  return drawCards(s, ctx.source.owner, n);
});

// buff_all_friendly: 己方全体 +atk/+hp（永久）
registerEffect('buff_all_friendly', (s, ctx) => {
  const atk = paramNum(ctx, 'atk', 0);
  const hp = paramNum(ctx, 'hp', 0);
  const owner = ctx.source.owner;
  let next = s;
  for (const m of [...next.players[owner].minions]) {
    next = updateMinion(next, owner, m.instanceId, (x) => ({
      ...x,
      attack: x.attack + atk,
      maxHealth: x.maxHealth + hp,
      health: x.health + hp,
    }));
  }
  return addLog(next, {
    turn: next.turn,
    player: owner,
    kind: 'battlecry',
    text: `己方全体 +${atk}/+${hp}`,
  });
});

// debuff_all_enemy_attack: 对方所有人物本回合 -atk（此处实现为永久，简化）
registerEffect('debuff_all_enemy_attack', (s, ctx) => {
  const atk = paramNum(ctx, 'atk', 1);
  const enemy = enemyOf(ctx.source.owner);
  let next = s;
  for (const m of [...next.players[enemy].minions]) {
    next = updateMinion(next, enemy, m.instanceId, (x) => ({
      ...x,
      attack: Math.max(0, x.attack - atk),
    }));
  }
  return addLog(next, {
    turn: next.turn,
    player: ctx.source.owner,
    kind: 'battlecry',
    text: `对方全体 ⚔-${atk}`,
  });
});

// silence_target: 沉默目标人物
registerEffect('silence_target', (s, ctx) => {
  if (!ctx.target || ctx.target.kind !== 'minion') return s;
  const { player, instanceId } = ctx.target;
  return updateMinion(s, player, instanceId, (m) => ({
    ...m,
    silenced: true,
    keywords: new Set<Keyword>(),
    deathrattles: [],
    divineShieldActive: false,
  }));
});

// transform_target_1_1: 将目标人物变为 1/1 无技能
registerEffect('transform_target_1_1', (s, ctx) => {
  if (!ctx.target || ctx.target.kind !== 'minion') return s;
  const { player, instanceId } = ctx.target;
  return updateMinion(s, player, instanceId, (m) => ({
    ...m,
    attack: 1,
    maxHealth: 1,
    health: 1,
    keywords: new Set<Keyword>(),
    deathrattles: [],
    silenced: true,
    divineShieldActive: false,
  }));
});

// buff_all_friendly_attack_turn: 己方全体本回合 ⚔+N（此处简化为永久）
registerEffect('buff_all_friendly_attack_turn', (s, ctx) => {
  const atk = paramNum(ctx, 'atk', 1);
  const owner = ctx.source.owner;
  let next = s;
  for (const m of [...next.players[owner].minions]) {
    next = updateMinion(next, owner, m.instanceId, (x) => ({
      ...x,
      attack: x.attack + atk,
    }));
  }
  return next;
});

// restore_hero_mana_turn: 己方本回合 +N 能量（加热度）
registerEffect('restore_hero_mana_turn', (s, ctx) => {
  const n = paramNum(ctx, 'amount', 2);
  return updatePlayer(s, ctx.source.owner, (p) => ({
    ...p,
    mana: Math.min(12, p.mana + n),
  }));
});

// combo_damage_with_chenze: 对目标造成 base 伤害；若场上有陈泽 +bonus
registerEffect('combo_damage_with_chenze', (s, ctx) => {
  const base = paramNum(ctx, 'base', 5);
  const bonus = paramNum(ctx, 'bonus', 3);
  if (!ctx.target || ctx.target.kind === 'none') return s;
  const owner = ctx.source.owner;
  const hasChenze = s.players[owner].minions.some((m) => m.defId === 'C14');
  const total = base + (hasChenze ? bonus : 0);
  return dealDamage(s, ctx.target, total, ctx.source);
});

// chenze_partner_combo：「陈泽 × 搭档小助理」默契开播联动
// - 登场时若己方场上已有伙伴卡（partnerId），立即触发：双方 +2/+0 并抽 1 张
// - 触发后在被 buff 的两张卡上打个 `chenzeComboTriggered` 标记（通过 health>maxHealth 判断不可靠，改用 keyword 集合额外标记）
// - 为简化不引入新状态，依靠"partner 必须尚未被 buff"判定（检查 minion.attack 是否已被本卡片 buff 过）。
// - 实现上我们直接在双方登场里调用此 effect，通过 ctx.source.id（当前登场的 minion）识别 self；
//   若 self 或 partner 任一已被沉默/不存在，则不触发。
registerEffect('chenze_partner_combo', (s, ctx) => {
  const partnerId = (ctx.params?.partnerId as string) ?? '';
  const partnerName = (ctx.params?.partnerName as string) ?? partnerId;
  const selfName = (ctx.params?.selfName as string) ?? '本卡';
  const atkBuff = paramNum(ctx, 'atk', 2);
  const hpBuff = paramNum(ctx, 'hp', 0);
  const drawAmt = paramNum(ctx, 'draw', 1);
  const owner = ctx.source.owner;

  const selfId = ctx.source.id;
  const self = s.players[owner].minions.find((m) => m.instanceId === selfId);
  if (!self) return s;

  const partner = s.players[owner].minions.find((m) => m.defId === partnerId && !m.silenced);
  if (!partner) return s;

  let next = addLog(s, {
    turn: s.turn,
    player: owner,
    kind: 'combo',
    text: `默契开播！${selfName} × ${partnerName} 联动：双方 +${atkBuff}/+${hpBuff}，抽 ${drawAmt} 张`,
  });

  const buff = (m: Minion): Minion => ({
    ...m,
    attack: m.attack + atkBuff,
    maxHealth: m.maxHealth + hpBuff,
    health: m.health + hpBuff,
  });
  next = updateMinion(next, owner, self.instanceId, buff);
  next = updateMinion(next, owner, partner.instanceId, buff);
  next = drawCards(next, owner, drawAmt);
  return next;
});

// discover_effect: 挖掘。
// 正式实现应弹三选一 UI；此处简化为：从全池随机挑 1 张效果卡直接入手牌（currentCost=0），
// 避免阻塞引擎同步性；比单纯 draw 更具"发现"语义（可抽到牌库外的卡）。
registerEffect('discover_effect', (s, ctx) => {
  const owner = ctx.source.owner;
  const p = s.players[owner];
  if (p.hand.length >= 10) {
    return addLog(s, {
      turn: s.turn,
      player: owner,
      kind: 'invalid',
      text: '挖掘失败：手牌已满',
    });
  }
  // 全池效果卡候选（排除正在结算的自身 defId 以避免无限抽自己）
  const selfDefId = typeof ctx.source.id === 'string' ? ctx.source.id : '';
  const candidates: string[] = [];
  CARD_DB.forEach((def, id) => {
    if (def.type === 'effect' && id !== selfDefId) candidates.push(id);
  });
  if (candidates.length === 0) return drawCards(s, owner, 1);
  const [r, ns] = nextRandom(s);
  const pickDefId = candidates[Math.floor(r * candidates.length)];
  const pickDef = CARD_DB.get(pickDefId)!;
  const instanceId = `disc_${pickDefId}_${Math.random().toString(36).slice(2, 8)}`;
  let next = updatePlayer(ns, owner, (pl) => ({
    ...pl,
    hand: [
      ...pl.hand,
      { instanceId, defId: pickDefId, owner, currentCost: 0 },
    ],
  }));
  next = addLog(next, {
    turn: next.turn,
    player: owner,
    kind: 'draw',
    text: `挖掘出 ${pickDef.name}（cost 0 入手牌）`,
  });
  return next;
});

// destroy_random_enemy_event: 随机摧毁对方 1 张事件
registerEffect('destroy_random_enemy_event', (s, ctx) => {
  const enemy = enemyOf(ctx.source.owner);
  const evs = s.players[enemy].events;
  if (evs.length === 0) return s;
  const [r, ns] = nextRandom(s);
  const idx = Math.floor(r * evs.length);
  const victim = evs[idx];
  let next = updatePlayer(ns, enemy, (p) => ({
    ...p,
    events: p.events.filter((e) => e.instanceId !== victim.instanceId),
    graveyard: [
      ...p.graveyard,
      { instanceId: victim.instanceId, defId: victim.defId, owner: enemy, currentCost: 0 },
    ],
  }));
  return addLog(next, {
    turn: next.turn,
    player: ctx.source.owner,
    kind: 'play',
    text: `摧毁对方事件 ${victim.defId}`,
  });
});

// destroy_enemy_weapon: 摧毁对方装备
registerEffect('destroy_enemy_weapon', (s, ctx) => {
  const enemy = enemyOf(ctx.source.owner);
  if (!s.players[enemy].equipped) return s;
  const eq = s.players[enemy].equipped!;
  const next = updatePlayer(s, enemy, (p) => ({
    ...p,
    equipped: null,
    graveyard: [
      ...p.graveyard,
      { instanceId: eq.instanceId, defId: eq.defId, owner: enemy, currentCost: 0 },
    ],
  }));
  return addLog(next, {
    turn: next.turn,
    player: ctx.source.owner,
    kind: 'play',
    text: `摧毁对方装备 ${eq.defId}`,
  });
});

// copy_random_friendly_minion: 复制己方随机人物（变为 1/1）入场
registerEffect('copy_random_friendly_minion', (s, ctx) => {
  const owner = ctx.source.owner;
  const mins = s.players[owner].minions;
  if (mins.length === 0) return s;
  if (mins.length > 5) return s; // 战场满
  const [r, ns] = nextRandom(s);
  const src = mins[Math.floor(r * mins.length)];
  const copy: Minion = {
    ...src,
    instanceId: `copy_${src.instanceId}_${Math.random().toString(36).slice(2, 8)}`,
    attack: 1,
    maxHealth: 1,
    health: 1,
    keywords: new Set<Keyword>(),
    deathrattles: [],
    silenced: true,
    divineShieldActive: false,
    summoningSickness: true,
    attacksLeftThisTurn: 0,
  };
  return updatePlayer(ns, owner, (p) => ({ ...p, minions: [...p.minions, copy] }));
});

// ============ 暗箱效果（旧称「奥秘」） ============

// freeze_target_attacks_this_turn: 目标人物本回合不能攻击（V02 路透流出）
registerEffect('freeze_target_attacks_this_turn', (s, ctx) => {
  if (!ctx.target || ctx.target.kind !== 'minion') return s;
  return updateMinion(s, ctx.target.player, ctx.target.instanceId, (m) => ({
    ...m,
    attacksLeftThisTurn: 0,
    summoningSickness: true,
  }));
});

// silence_trigger_minion: 沉默触发目标（V04 塑料奥秘，卡名保留文学引用）
registerEffect('silence_trigger_minion', (s, ctx) => {
  if (!ctx.target || ctx.target.kind !== 'minion') return s;
  return updateMinion(s, ctx.target.player, ctx.target.instanceId, (m) => ({
    ...m,
    silenced: true,
    keywords: new Set<Keyword>(),
    deathrattles: [],
    divineShieldActive: false,
  }));
});

// crisis_pr: V06 危机公关：已在 triggerSecrets 被击发，此处回 5 血 + 抽 2 张作为正面收益
registerEffect('crisis_pr', (s, ctx) => {
  let next = healHero(s, ctx.source.owner, 5);
  next = drawCards(next, ctx.source.owner, 2);
  return next;
});

// ============ 新增：治疗系扩充 ============

// heal_target_minion: 治疗目标人物 N 点（仅己方/全场皆可，由 UI 选目标）
registerEffect('heal_target_minion', (s, ctx) => {
  const amt = paramNum(ctx, 'amount', 0);
  if (!ctx.target || ctx.target.kind !== 'minion' || amt <= 0) return s;
  const { player, instanceId } = ctx.target;
  const m = findMinion(s, player, instanceId);
  if (!m) return s;
  const healed = Math.min(m.maxHealth, m.health + amt);
  const delta = healed - m.health;
  if (delta <= 0) return s;
  const next = updateMinion(s, player, instanceId, (x) => ({ ...x, health: healed }));
  return addLog(next, {
    turn: next.turn,
    player: ctx.source.owner,
    kind: 'heal',
    text: `${m.defId} +${delta}`,
  });
});

// heal_all_friendly_minions: 回己方全体人物 N 点流量
registerEffect('heal_all_friendly_minions', (s, ctx) => {
  const amt = paramNum(ctx, 'amount', 0);
  if (amt <= 0) return s;
  const owner = ctx.source.owner;
  let next = s;
  for (const m of [...next.players[owner].minions]) {
    const target = Math.min(m.maxHealth, m.health + amt);
    if (target > m.health) {
      next = updateMinion(next, owner, m.instanceId, (x) => ({ ...x, health: target }));
    }
  }
  return addLog(next, {
    turn: next.turn,
    player: owner,
    kind: 'heal',
    text: `己方全体人物 +${amt}`,
  });
});

// heal_self_hero_and_minions: 同时回己方经纪人与所有己方人物 N 点
registerEffect('heal_self_hero_and_minions', (s, ctx) => {
  const amt = paramNum(ctx, 'amount', 0);
  if (amt <= 0) return s;
  const owner = ctx.source.owner;
  let next = healHero(s, owner, amt);
  for (const m of [...next.players[owner].minions]) {
    const target = Math.min(m.maxHealth, m.health + amt);
    if (target > m.health) {
      next = updateMinion(next, owner, m.instanceId, (x) => ({ ...x, health: target }));
    }
  }
  return next;
});

// ============ 新增：抽牌/所憨露扩充 ============

// draw_and_reduce_cost: 抽 N 张，并对新抽到的这 N 张手牌 currentCost -X（下限 0）
registerEffect('draw_and_reduce_cost', (s, ctx) => {
  const n = paramNum(ctx, 'amount', 1);
  const reduce = paramNum(ctx, 'reduce', 1);
  if (n <= 0) return s;
  const owner = ctx.source.owner;
  const before = s.players[owner].hand.length;
  let next = drawCards(s, owner, n);
  if (reduce <= 0) return next;
  const after = next.players[owner].hand.length;
  const drawnCount = after - before;
  if (drawnCount <= 0) return next;
  next = updatePlayer(next, owner, (p) => ({
    ...p,
    hand: p.hand.map((c, i) =>
      i >= before && i < before + drawnCount
        ? { ...c, currentCost: Math.max(0, c.currentCost - reduce) }
        : c,
    ),
  }));
  return addLog(next, {
    turn: next.turn,
    player: owner,
    kind: 'draw',
    text: `新抽 ${drawnCount} 张 cost -${reduce}`,
  });
});

// both_draw_cards: 双方各抽 N 张
registerEffect('both_draw_cards', (s, ctx) => {
  const n = paramNum(ctx, 'amount', 1);
  if (n <= 0) return s;
  let next = drawCards(s, ctx.source.owner, n);
  next = drawCards(next, enemyOf(ctx.source.owner), n);
  return next;
});

// discard_random_enemy_hand: 随机弃对方 N 张手牌
registerEffect('discard_random_enemy_hand', (s, ctx) => {
  const n = paramNum(ctx, 'amount', 1);
  if (n <= 0) return s;
  const enemy = enemyOf(ctx.source.owner);
  let next = s;
  for (let i = 0; i < n; i++) {
    const hand = next.players[enemy].hand;
    if (hand.length === 0) break;
    const [r, ns] = nextRandom(next);
    next = ns;
    const idx = Math.floor(r * hand.length);
    const victim = hand[idx];
    next = updatePlayer(next, enemy, (p) => ({
      ...p,
      hand: p.hand.filter((c) => c.instanceId !== victim.instanceId),
      graveyard: [...p.graveyard, victim],
    }));
    next = addLog(next, {
      turn: next.turn,
      player: ctx.source.owner,
      kind: 'burn',
      text: `对方弃牌 ${victim.defId}`,
    });
  }
  return next;
});

// ============ 新增：控场扩充 ============

// return_target_to_hand: 弹回目标人物到其主人手牌（手满则直接消失入墓地）
registerEffect('return_target_to_hand', (s, ctx) => {
  if (!ctx.target || ctx.target.kind !== 'minion') return s;
  const { player, instanceId } = ctx.target;
  const m = findMinion(s, player, instanceId);
  if (!m) return s;
  const baseDef = s.players[player].minions.find((x) => x.instanceId === instanceId);
  if (!baseDef) return s;
  const handFull = s.players[player].hand.length >= 10;
  let next = updatePlayer(s, player, (p) => ({
    ...p,
    minions: p.minions.filter((x) => x.instanceId !== instanceId),
    hand: handFull
      ? p.hand
      : [
          ...p.hand,
          { instanceId: m.instanceId, defId: m.defId, owner: player, currentCost: 0 },
        ],
    graveyard: handFull
      ? [
          ...p.graveyard,
          { instanceId: m.instanceId, defId: m.defId, owner: player, currentCost: 0 },
        ]
      : p.graveyard,
  }));
  next = addLog(next, {
    turn: next.turn,
    player: ctx.source.owner,
    kind: 'play',
    text: handFull
      ? `${m.defId} 被弹回但手牌已满，销毁`
      : `${m.defId} 被弹回 ${player} 手牌`,
  });
  return next;
});

// give_target_divine_shield: 给目标人物粉丝盾
registerEffect('give_target_divine_shield', (s, ctx) => {
  if (!ctx.target || ctx.target.kind !== 'minion') return s;
  const { player, instanceId } = ctx.target;
  const next = updateMinion(s, player, instanceId, (m) => ({
    ...m,
    divineShieldActive: true,
  }));
  return addLog(next, {
    turn: next.turn,
    player: ctx.source.owner,
    kind: 'play',
    text: `目标获得粉丝盾`,
  });
});

// damage_full_health_target_bonus: 对目标造成 base 伤害；若目标满血则额外 +bonus
registerEffect('damage_full_health_target_bonus', (s, ctx) => {
  const base = paramNum(ctx, 'base', 3);
  const bonus = paramNum(ctx, 'bonus', 3);
  if (!ctx.target || ctx.target.kind === 'none') return s;
  let extra = 0;
  if (ctx.target.kind === 'minion') {
    const m = findMinion(s, ctx.target.player, ctx.target.instanceId);
    if (m && m.health >= m.maxHealth) extra = bonus;
  } else if (ctx.target.kind === 'hero') {
    const p = s.players[ctx.target.player];
    if (p.hp >= p.hpMax) extra = bonus;
  }
  return dealDamage(s, ctx.target, base + extra, ctx.source);
});

// ============ 新增：环境/双方系 ============

// both_heroes_heal: 双方英雄各回 N 血
registerEffect('both_heroes_heal', (s, ctx) => {
  const amt = paramNum(ctx, 'amount', 0);
  if (amt <= 0) return s;
  let next = healHero(s, ctx.source.owner, amt);
  next = healHero(next, enemyOf(ctx.source.owner), amt);
  return next;
});

// resurrect_last_friendly_character: 复活己方墓地最近一张角色为 1/1（1 血、无关键字、被沉默）
registerEffect('resurrect_last_friendly_character', (s, ctx) => {
  const owner = ctx.source.owner;
  const mins = s.players[owner].minions;
  if (mins.length >= 6) return s;
  // 从后向前找墓地里的角色（依赖 CARD_DB，已 top-level 导入）
  const grave = s.players[owner].graveyard;
  let targetDefId: string | null = null;
  for (let i = grave.length - 1; i >= 0; i--) {
    const def = CARD_DB.get(grave[i].defId);
    if (def && def.type === 'character') {
      targetDefId = grave[i].defId;
      break;
    }
  }
  if (!targetDefId) return s;
  const copy: Minion = {
    instanceId: `rez_${targetDefId}_${Math.random().toString(36).slice(2, 8)}`,
    defId: targetDefId,
    owner,
    attack: 1,
    maxHealth: 1,
    health: 1,
    attacksLeftThisTurn: 0,
    summoningSickness: true,
    keywords: new Set<Keyword>(),
    silenced: true,
    deathrattles: [],
    divineShieldActive: false,
    justSummoned: true,
  };
  let next = updatePlayer(s, owner, (p) => ({ ...p, minions: [...p.minions, copy] }));
  next = addLog(next, {
    turn: next.turn,
    player: owner,
    kind: 'play',
    text: `复活 ${targetDefId}（1/1）`,
  });
  return next;
});
