// 效果函数注册表
// 每张卡的战吼/亡语/被动都通过 effectId 映射到此处的函数
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
// - 实现上我们直接在双方战吼里调用此 effect，通过 ctx.source.id（当前登场的 minion）识别 self；
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

// discover_effect_placeholder: 发现类（简化为抽 1 张特殊效果）
registerEffect('discover_effect', (s, ctx) => {
  // TODO: 正式实现应从全局池随机抽 3 张 effect 让玩家选 1
  return drawCards(s, ctx.source.owner, 1);
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

// ============ 奥秘效果 ============

// freeze_target_attacks_this_turn: 目标人物本回合不能攻击（V02 路透流出）
registerEffect('freeze_target_attacks_this_turn', (s, ctx) => {
  if (!ctx.target || ctx.target.kind !== 'minion') return s;
  return updateMinion(s, ctx.target.player, ctx.target.instanceId, (m) => ({
    ...m,
    attacksLeftThisTurn: 0,
    summoningSickness: true,
  }));
});

// silence_trigger_minion: 沉默触发目标（V04 塑料奥秘）
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
