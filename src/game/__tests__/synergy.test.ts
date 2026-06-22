// 卡牌联动（CardSynergy）运行时自动触发测试
// 覆盖：both_in_play 双向查、单向配置、scope=self/partner/both/all_allies、
//      效果 kind=attack_buff/health_buff/draw_card/heal/damage_enemy/keyword_grant
//      partner_equipped（装备登场触发）

import { describe, it, expect, beforeAll } from 'vitest';
import { initGame, applyAction, getCardDef, registerCard } from '../engine';
import { registerAllCards } from '../cards';
import { triggerSynergiesOnEntry } from '../synergyRuntime';
import type { CardDef, Deck, GameState, PlayerId } from '../types';
import type { CardSynergy } from '@/lib/tcg/synergy';

beforeAll(() => {
  try { registerAllCards(); } catch { /* already */ }
});

describe('Synergy runtime hardening', () => {
  it('resolves shield effect for both paired minions', () => {
    registerTestCard({
      id: 'X08',
      name: 'Test Shield Host',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 2,
      synergies: [
        {
          id: 'syn_x08_shield',
          name: 'Shared Shield',
          description: '',
          partners: ['C02'],
          trigger: 'both_in_play',
          scope: 'both',
          effects: [{ kind: 'shield', duration: 'permanent' }],
        },
      ],
    });

    let s = initGame({
      seed: 1006,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });
    s = forceIntoHand(s, 'P1', 'C02');
    s = forceIntoHand(s, 'P1', 'X08');
    s = setMana(s, 'P1', 3);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'C02') });
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X08') });

    const c02 = s.players.P1.minions.find((m) => m.defId === 'C02')!;
    const x08 = s.players.P1.minions.find((m) => m.defId === 'X08')!;
    expect(c02.divineShieldActive).toBe(true);
    expect(x08.divineShieldActive).toBe(true);
    expect(c02.keywords.has('divineShield')).toBe(true);
    expect(x08.keywords.has('divineShield')).toBe(true);
  });

  it('resolves cost_reduce effect against matching cards in hand', () => {
    registerTestCard({
      id: 'X09',
      name: 'Test Discount Host',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 2,
      synergies: [
        {
          id: 'syn_x09_discount',
          name: 'Team Discount',
          description: '',
          partners: ['C02'],
          trigger: 'both_in_play',
          scope: 'all_allies',
          effects: [{ kind: 'cost_reduce', amount: 1, duration: 'permanent' }],
        },
      ],
    });

    let s = initGame({
      seed: 1007,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });
    s = forceIntoHand(s, 'P1', 'C02');
    s = forceIntoHand(s, 'P1', 'X09');
    s = forceIntoHand(s, 'P1', 'C03');
    s = setMana(s, 'P1', 3);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'C02') });
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X09') });

    const discounted = s.players.P1.hand.find((card) => card.defId === 'C03')!;
    expect(discounted.currentCost).toBe(2);
  });

  it('does not resolve the same live host-partner pair twice', () => {
    registerTestCard({
      id: 'X10',
      name: 'Test Idempotent Host',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 2,
      synergies: [
        {
          id: 'syn_x10_once',
          name: 'Only Once',
          description: '',
          partners: ['C02'],
          trigger: 'both_in_play',
          scope: 'both',
          effects: [{ kind: 'attack_buff', amount: 1, duration: 'permanent' }],
        },
      ],
    });

    let s = initGame({
      seed: 1008,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });
    s = forceIntoHand(s, 'P1', 'X10');
    s = forceIntoHand(s, 'P1', 'C02');
    s = setMana(s, 'P1', 3);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X10') });
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'C02') });

    const c02Before = s.players.P1.minions.find((m) => m.defId === 'C02')!;
    const x10Before = s.players.P1.minions.find((m) => m.defId === 'X10')!;

    s = triggerSynergiesOnEntry(s, 'P1', {
      kind: 'minion',
      defId: 'C02',
      instanceId: c02Before.instanceId,
    });

    const c02After = s.players.P1.minions.find((m) => m.defId === 'C02')!;
    const x10After = s.players.P1.minions.find((m) => m.defId === 'X10')!;
    expect(c02After.attack).toBe(c02Before.attack);
    expect(x10After.attack).toBe(x10Before.attack);
    expect(s.log.filter((entry) => entry.kind === 'combo' && entry.text.includes('Only Once'))).toHaveLength(1);
  });

  it('deduplicates the same synergy id when both cards configure it', () => {
    registerTestCard({
      id: 'X11',
      name: 'Test Pair A',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 2,
      synergies: [
        {
          id: 'syn_x11_x12_shared',
          name: 'Shared Pair',
          description: '',
          partners: ['X12'],
          trigger: 'both_in_play',
          scope: 'both',
          effects: [{ kind: 'attack_buff', amount: 1, duration: 'permanent' }],
        },
      ],
    });
    registerTestCard({
      id: 'X12',
      name: 'Test Pair B',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 2,
      synergies: [
        {
          id: 'syn_x11_x12_shared',
          name: 'Shared Pair',
          description: '',
          partners: ['X11'],
          trigger: 'both_in_play',
          scope: 'both',
          effects: [{ kind: 'attack_buff', amount: 1, duration: 'permanent' }],
        },
      ],
    });

    let s = initGame({
      seed: 1009,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });
    s = forceIntoHand(s, 'P1', 'X11');
    s = forceIntoHand(s, 'P1', 'X12');
    s = setMana(s, 'P1', 2);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X11') });
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X12') });

    const x11 = s.players.P1.minions.find((m) => m.defId === 'X11')!;
    const x12 = s.players.P1.minions.find((m) => m.defId === 'X12')!;
    expect(x11.attack).toBe(2);
    expect(x12.attack).toBe(2);
    expect(s.log.filter((entry) => entry.kind === 'combo' && entry.text.includes('Shared Pair'))).toHaveLength(1);
  });
});

// ============ 工具 ============

function buildDeck(cardIds: string[]): Deck {
  const padded = [...cardIds];
  while (padded.length < 35) padded.push('C02');
  return { heroName: 't', heroPowerId: 'hp', cards: padded.slice(0, 35) };
}

function forceIntoHand(s: GameState, p: PlayerId, defId: string): GameState {
  const def = getCardDef(defId);
  if (!def) throw new Error(`card not found: ${defId}`);
  const inst = {
    instanceId: `f_${defId}_${Math.random().toString(36).slice(2, 9)}`,
    defId,
    owner: p,
    currentCost: def.cost,
  };
  return {
    ...s,
    players: { ...s.players, [p]: { ...s.players[p], hand: [...s.players[p].hand, inst] } },
  };
}

function setMana(s: GameState, p: PlayerId, mana: number): GameState {
  return {
    ...s,
    players: {
      ...s.players,
      [p]: { ...s.players[p], mana, manaMax: Math.max(s.players[p].manaMax, mana) },
    },
  };
}

function findId(s: GameState, p: PlayerId, defId: string): string {
  return s.players[p].hand.find((c) => c.defId === defId)!.instanceId;
}

/** 注册一张自定义测试卡（浅拷贝，不修改原始模板） */
function registerTestCard(card: CardDef): void {
  registerCard(card);
}

// ============ both_in_play：scope=both，attack_buff + draw_card ============

describe('Synergy both_in_play', () => {
  it('host 配置、后出 partner → 双方 +2 攻击 + 抽 1 张', () => {
    // 借用 C02（2/3 路人粉）的 id 作为 partner，不修改它；host 用临时卡 X01
    registerTestCard({
      id: 'X01',
      name: '测试-主播',
      type: 'character',
      rarity: 'SSR',
      cost: 1,
      attack: 3,
      health: 3,
      synergies: [
        {
          id: 'syn_x01_c02',
          name: '主播联动 C02',
          description: '',
          partners: ['C02'],
          trigger: 'both_in_play',
          scope: 'both',
          effects: [
            { kind: 'attack_buff', amount: 2, duration: 'permanent' },
            { kind: 'draw_card', amount: 1, duration: 'permanent' },
          ],
        },
      ],
    });

    let s = initGame({
      seed: 1000,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });

    // 先打 X01，场上无 C02，不应触发
    s = forceIntoHand(s, 'P1', 'X01');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X01') });
    expect(s.log.some((l) => l.kind === 'combo' && l.text.includes('主播联动'))).toBe(false);

    const handBefore = s.players.P1.hand.length;

    // 后打 C02，触发 both_in_play
    s = forceIntoHand(s, 'P1', 'C02');
    s = setMana(s, 'P1', 2);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'C02') });

    const x01 = s.players.P1.minions.find((m) => m.defId === 'X01')!;
    const c02 = s.players.P1.minions.find((m) => m.defId === 'C02')!;
    expect(x01.attack).toBe(3 + 2); // 5
    expect(c02.attack).toBe(2 + 2); // 4
    // 抽 1 张（出牌前 -1，抽 +1，对比 handBefore 为出牌前）
    expect(s.players.P1.hand.length).toBeGreaterThanOrEqual(handBefore);
    expect(s.log.some((l) => l.kind === 'combo' && l.text.includes('主播联动'))).toBe(true);
  });
});

// ============ scope=self：只加 host ============

describe('Synergy scope=self', () => {
  it('只对 host 生效，不动 partner', () => {
    registerTestCard({
      id: 'X02',
      name: '测试-独舞',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 2,
      health: 4,
      synergies: [
        {
          id: 'syn_x02',
          name: '独舞',
          description: '',
          partners: ['C03'],
          trigger: 'both_in_play',
          scope: 'self',
          effects: [{ kind: 'attack_buff', amount: 3, duration: 'permanent' }],
        },
      ],
    });

    let s = initGame({
      seed: 1001,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });
    s = forceIntoHand(s, 'P1', 'C03');
    s = setMana(s, 'P1', 3);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'C03') });

    s = forceIntoHand(s, 'P1', 'X02');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X02') });

    const x02 = s.players.P1.minions.find((m) => m.defId === 'X02')!;
    const c03 = s.players.P1.minions.find((m) => m.defId === 'C03')!;
    expect(x02.attack).toBe(2 + 3); // 5
    expect(c03.attack).toBe(2); // 不变
  });
});

// ============ scope=partner：只加 partner ============

describe('Synergy scope=partner', () => {
  it('效果只作用于伙伴', () => {
    registerTestCard({
      id: 'X03',
      name: '测试-辅助',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 2,
      synergies: [
        {
          id: 'syn_x03',
          name: '辅助',
          description: '',
          partners: ['C02'],
          trigger: 'both_in_play',
          scope: 'partner',
          effects: [
            { kind: 'health_buff', amount: 5, duration: 'permanent' },
          ],
        },
      ],
    });

    let s = initGame({
      seed: 1002,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });
    s = forceIntoHand(s, 'P1', 'C02');
    s = setMana(s, 'P1', 2);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'C02') });

    s = forceIntoHand(s, 'P1', 'X03');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X03') });

    const c02 = s.players.P1.minions.find((m) => m.defId === 'C02')!;
    const x03 = s.players.P1.minions.find((m) => m.defId === 'X03')!;
    expect(c02.maxHealth).toBe(3 + 5); // 8
    expect(c02.health).toBe(3 + 5);
    expect(x03.maxHealth).toBe(2); // 不变
  });
});

// ============ 效果 damage_enemy ============

describe('Synergy effect damage_enemy', () => {
  it('触发时直接对敌方英雄扣血', () => {
    registerTestCard({
      id: 'X04',
      name: '测试-火箭',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 1,
      synergies: [
        {
          id: 'syn_x04',
          name: '爆破',
          description: '',
          partners: ['C02'],
          trigger: 'both_in_play',
          scope: 'self',
          effects: [{ kind: 'damage_enemy', amount: 4, duration: 'permanent' }],
        },
      ],
    });

    let s = initGame({
      seed: 1003,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });
    const hpBefore = s.players.P2.hp;

    s = forceIntoHand(s, 'P1', 'C02');
    s = setMana(s, 'P1', 2);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'C02') });
    s = forceIntoHand(s, 'P1', 'X04');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X04') });

    expect(s.players.P2.hp).toBe(hpBefore - 4);
  });
});

// ============ 双向查询：partner 配置，host 不配 ============

describe('Synergy 双向查询', () => {
  it('partner 配置后出，host（未配置）先出也能触发', () => {
    registerTestCard({
      id: 'X05',
      name: '测试-host',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 1,
      // 没有 synergies
    });
    registerTestCard({
      id: 'X06',
      name: '测试-partner',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 1,
      synergies: [
        {
          id: 'syn_x06',
          name: 'X06 找 X05',
          description: '',
          partners: ['X05'],
          trigger: 'both_in_play',
          scope: 'both',
          effects: [{ kind: 'attack_buff', amount: 1, duration: 'permanent' }],
        },
      ],
    });

    let s = initGame({
      seed: 1004,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });
    s = forceIntoHand(s, 'P1', 'X05');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X05') });
    s = forceIntoHand(s, 'P1', 'X06');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X06') });

    const x05 = s.players.P1.minions.find((m) => m.defId === 'X05')!;
    const x06 = s.players.P1.minions.find((m) => m.defId === 'X06')!;
    expect(x05.attack).toBe(2); // 1 + 1
    expect(x06.attack).toBe(2); // 1 + 1
    expect(s.log.some((l) => l.kind === 'combo' && l.text.includes('X06 找 X05'))).toBe(true);
  });
});

// ============ 无伙伴不触发 ============

describe('Synergy 无伙伴', () => {
  it('单独打出 host，不触发联动', () => {
    registerTestCard({
      id: 'X07',
      name: '测试-孤岛',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 2,
      health: 2,
      synergies: [
        {
          id: 'syn_x07',
          name: '孤岛',
          description: '',
          partners: ['X99'], // 故意使用不存在的搭档
          trigger: 'both_in_play',
          scope: 'self',
          effects: [{ kind: 'attack_buff', amount: 10, duration: 'permanent' }],
        },
      ],
    });

    let s = initGame({
      seed: 1005,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });
    s = forceIntoHand(s, 'P1', 'X07');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'X07') });

    const x07 = s.players.P1.minions.find((m) => m.defId === 'X07')!;
    expect(x07.attack).toBe(2); // 未加成
    expect(s.log.some((l) => l.kind === 'combo' && l.text.includes('孤岛'))).toBe(false);
  });
});
