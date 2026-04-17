// Phase 2 引擎深化功能测试：道具攻击、奥秘触发、关键字（隐身/不朽/rush 限制）、事件/装备摧毁

import { describe, it, expect, beforeAll } from 'vitest';
import { initGame, applyAction, getCardDef, HERO_ATTACKER_ID } from '../engine';
import { registerAllCards } from '../cards';
import type { CardDef, Deck, GameState, PlayerId, TargetRef } from '../types';

beforeAll(() => {
  try { registerAllCards(); } catch { /* already registered */ }
});

// ============ 工具 ============

function buildDeck(cardIds: string[]): Deck {
  const padded = [...cardIds];
  while (padded.length < 25) padded.push('C02');
  return { heroName: 't', heroPowerId: 'hp', cards: padded.slice(0, 25) };
}

function findCardInHand(s: GameState, p: PlayerId, defId: string): string | undefined {
  return s.players[p].hand.find((c) => c.defId === defId)?.instanceId;
}

function findMinionByDef(s: GameState, o: PlayerId, defId: string): string | undefined {
  return s.players[o].minions.find((m) => m.defId === defId)?.instanceId;
}

function forceIntoHand(s: GameState, p: PlayerId, defId: string): GameState {
  const def = getCardDef(defId);
  if (!def) throw new Error(defId);
  const inst = { instanceId: `f_${defId}_${Math.random()}`, defId, owner: p, currentCost: def.cost };
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

function setHp(s: GameState, p: PlayerId, hp: number): GameState {
  return { ...s, players: { ...s.players, [p]: { ...s.players[p], hp } } };
}

// ============ 道具系统 ============

describe('道具 / 武器', () => {
  it('I04 金色话筒装备后经纪人可攻击 + 耐久消耗', () => {
    let s = initGame({ seed: 100, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'I04');
    s = setMana(s, 'P1', 5);
    s = applyAction(s, {
      type: 'PLAY_CARD', player: 'P1',
      instanceId: findCardInHand(s, 'P1', 'I04')!,
    });
    expect(s.players.P1.equipped?.defId).toBe('I04');
    expect(s.players.P1.equipped?.attack).toBe(3);
    expect(s.players.P1.equipped?.durability).toBe(2);
    expect(s.players.P1.heroAttacksLeftThisTurn).toBe(1);

    const before = s.players.P2.hp;
    const handBefore = s.players.P1.hand.length;
    s = applyAction(s, {
      type: 'ATTACK', player: 'P1', attackerId: HERO_ATTACKER_ID,
      target: { kind: 'hero', player: 'P2' },
    });
    expect(s.players.P2.hp).toBe(before - 3);
    expect(s.players.P1.equipped?.durability).toBe(1);
    expect(s.players.P1.heroAttacksLeftThisTurn).toBe(0);
    // onAttack: 抽 1 张 → 手牌 +1
    expect(s.players.P1.hand.length).toBe(handBefore + 1);
  });

  it('武器耐久归零损毁', () => {
    let s = initGame({ seed: 101, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'I04');
    s = setMana(s, 'P1', 10);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'I04')! });
    s = applyAction(s, { type: 'ATTACK', player: 'P1', attackerId: HERO_ATTACKER_ID, target: { kind: 'hero', player: 'P2' } });
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });
    // P1 再攻击一次 → 耐久 1 → 0 → 损毁
    s = applyAction(s, { type: 'ATTACK', player: 'P1', attackerId: HERO_ATTACKER_ID, target: { kind: 'hero', player: 'P2' } });
    expect(s.players.P1.equipped).toBeNull();
  });

  it('攻击人物时武器反击伤害经纪人', () => {
    let s = initGame({ seed: 102, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // P2 出 C03 嘲讽 (2/4)
    s = forceIntoHand(s, 'P2', 'C03');
    s = setMana(s, 'P2', 3);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P2', instanceId: findCardInHand(s, 'P2', 'C03')! });
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });

    // P1 装备 I04 (3/2) 打 C03
    s = forceIntoHand(s, 'P1', 'I04');
    s = setMana(s, 'P1', 5);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'I04')! });
    const c03 = findMinionByDef(s, 'P2', 'C03')!;
    const before = s.players.P1.hp;
    s = applyAction(s, {
      type: 'ATTACK', player: 'P1', attackerId: HERO_ATTACKER_ID,
      target: { kind: 'minion', player: 'P2', instanceId: c03 },
    });
    // 反击 2 点伤害到经纪人
    expect(s.players.P1.hp).toBe(before - 2);
  });

  it('覆盖装备：旧武器进墓地', () => {
    let s = initGame({ seed: 103, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'I04');
    s = forceIntoHand(s, 'P1', 'I07');
    s = setMana(s, 'P1', 10);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'I04')! });
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'I07')! });
    expect(s.players.P1.equipped?.defId).toBe('I07');
    expect(s.players.P1.graveyard.some((c) => c.defId === 'I04')).toBe(true);
  });
});

// ============ 事件/装备摧毁 ============

describe('摧毁类效果', () => {
  it('E08 反黑作战 摧毁对方装备', () => {
    let s = initGame({ seed: 110, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P2', 'I04');
    s = setMana(s, 'P2', 5);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P2', instanceId: findCardInHand(s, 'P2', 'I04')! });
    expect(s.players.P2.equipped).not.toBeNull();
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });

    s = forceIntoHand(s, 'P1', 'E08');
    s = setMana(s, 'P1', 5);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'E08')! });
    expect(s.players.P2.equipped).toBeNull();
    expect(s.players.P2.graveyard.some((c) => c.defId === 'I04')).toBe(true);
  });

  it('C10 李哥战吼摧毁对方随机事件', () => {
    let s = initGame({ seed: 111, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // P2 放 V01（场地）
    s = forceIntoHand(s, 'P2', 'V01');
    s = setMana(s, 'P2', 3);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P2', instanceId: findCardInHand(s, 'P2', 'V01')! });
    expect(s.players.P2.events.length).toBe(1);
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });

    // P1 打 C10
    s = forceIntoHand(s, 'P1', 'C10');
    s = setMana(s, 'P1', 5);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'C10')! });
    expect(s.players.P2.events.length).toBe(0);
  });

  it('I08 黑料爆料单 装备时摧毁对方事件', () => {
    let s = initGame({ seed: 112, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P2', 'V01');
    s = setMana(s, 'P2', 5);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P2', instanceId: findCardInHand(s, 'P2', 'V01')! });
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });

    s = forceIntoHand(s, 'P1', 'I08');
    s = setMana(s, 'P1', 10);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'I08')! });
    expect(s.players.P2.events.length).toBe(0);
  });
});

// ============ 奥秘机制 ============

describe('奥秘触发', () => {
  it('V02 路透流出：对方召唤人物时使其本回合不能攻击', () => {
    let s = initGame({ seed: 120, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'V02');
    s = setMana(s, 'P1', 2);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'V02')! });
    expect(s.players.P1.events.length).toBe(1);
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });

    // P2 召唤冲锋单位 C05 4哥，应被冻结
    s = forceIntoHand(s, 'P2', 'C05');
    s = setMana(s, 'P2', 3);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P2', instanceId: findCardInHand(s, 'P2', 'C05')! });
    const mid = findMinionByDef(s, 'P2', 'C05')!;
    // 奥秘应已消耗
    expect(s.players.P1.events.length).toBe(0);
    const before = s.players.P1.hp;
    s = applyAction(s, {
      type: 'ATTACK', player: 'P2', attackerId: mid,
      target: { kind: 'hero', player: 'P1' },
    });
    expect(s.players.P1.hp).toBe(before);
  });

  it('V04 塑料奥秘：召唤 ⚔≥5 的人物时沉默', () => {
    let s = initGame({ seed: 121, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'V04');
    s = setMana(s, 'P1', 5);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'V04')! });
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });

    // P2 召唤 C11（6/4 有 rush+poisonous）
    s = forceIntoHand(s, 'P2', 'C11');
    s = setMana(s, 'P2', 10);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P2', instanceId: findCardInHand(s, 'P2', 'C11')! });
    const rong = s.players.P2.minions.find((m) => m.defId === 'C11');
    expect(rong?.silenced).toBe(true);
    expect(rong?.keywords.size).toBe(0);
    expect(s.players.P1.events.length).toBe(0);
  });

  it('V06 危机公关：经纪人首次 ≥5 伤害改为 1 并抽 2 张', () => {
    let s = initGame({ seed: 122, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'V06');
    s = setMana(s, 'P1', 5);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'V06')! });
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });

    // P2 出 E10（+ 无陈泽 5 伤害）攻击 P1
    s = forceIntoHand(s, 'P2', 'E10');
    s = setMana(s, 'P2', 10);
    const hpBefore = s.players.P1.hp;
    const handBefore = s.players.P1.hand.length;
    s = applyAction(s, {
      type: 'PLAY_CARD', player: 'P2',
      instanceId: findCardInHand(s, 'P2', 'E10')!,
      target: { kind: 'hero', player: 'P1' },
    });
    // 先触发奥秘 heal 5（上限 40 → 仍 40），再结算减伤后的 1 伤 → 39
    expect(s.players.P1.hp).toBe(Math.min(40, hpBefore + 5) - 1);
    expect(s.players.P1.hand.length).toBe(handBefore + 2);
    expect(s.players.P1.events.length).toBe(0);
  });

  it('同奥秘不可重复', () => {
    let s = initGame({ seed: 123, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'V02');
    s = forceIntoHand(s, 'P1', 'V02');
    s = setMana(s, 'P1', 10);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'V02')! });
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'V02')! });
    expect(s.players.P1.events.length).toBe(1);
    expect(s.log.some((l) => l.kind === 'invalid' && l.text.includes('奥秘不可重复'))).toBe(true);
  });
});

// ============ 关键字补齐 ============

describe('关键字完整性', () => {
  it('C11 荣一鸣 rush + 剧毒：当回合可打人物但不能打脸', () => {
    let s = initGame({ seed: 130, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // P2 放一个 C02 (2/3) 垫上
    s = forceIntoHand(s, 'P2', 'C02');
    s = setMana(s, 'P2', 2);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P2', instanceId: findCardInHand(s, 'P2', 'C02')! });
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });

    // P1 出 C11
    s = forceIntoHand(s, 'P1', 'C11');
    s = setMana(s, 'P1', 10);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'C11')! });
    const rong = findMinionByDef(s, 'P1', 'C11')!;

    // 打脸应该被拒
    const hpBefore = s.players.P2.hp;
    s = applyAction(s, { type: 'ATTACK', player: 'P1', attackerId: rong, target: { kind: 'hero', player: 'P2' } });
    expect(s.players.P2.hp).toBe(hpBefore);

    // 打人物应成功，且剧毒必杀
    const c02Id = findMinionByDef(s, 'P2', 'C02')!;
    s = applyAction(s, { type: 'ATTACK', player: 'P1', attackerId: rong, target: { kind: 'minion', player: 'P2', instanceId: c02Id } });
    expect(s.players.P2.minions.find((m) => m.defId === 'C02')).toBeUndefined();
  });

  it('粉丝盾：C13 黑白 首次免疫伤害', () => {
    let s = initGame({ seed: 131, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'C13');
    s = setMana(s, 'P1', 10);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'C13')! });
    const c13 = findMinionByDef(s, 'P1', 'C13')!;
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });

    // P2 打 E01 伤 3
    s = forceIntoHand(s, 'P2', 'E01');
    s = setMana(s, 'P2', 5);
    s = applyAction(s, {
      type: 'PLAY_CARD', player: 'P2',
      instanceId: findCardInHand(s, 'P2', 'E01')!,
      target: { kind: 'minion', player: 'P1', instanceId: c13 },
    });
    // 粉丝盾抵消，本身满血
    const m = s.players.P1.minions.find((x) => x.defId === 'C13')!;
    expect(m.health).toBe(7);
    expect(m.divineShieldActive).toBe(false);
  });

  it('吸粉：给 C02 临时加 lifesteal，攻击回血', () => {
    let s = initGame({ seed: 132, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // 打出 C05 4哥（冲锋）直接打脸测吸粉（需要手动给 keywords 加 lifesteal）
    s = forceIntoHand(s, 'P1', 'C05');
    s = setMana(s, 'P1', 2);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'C05')! });
    const mid = findMinionByDef(s, 'P1', 'C05')!;
    // 手动加 lifesteal
    s = {
      ...s,
      players: {
        ...s.players,
        P1: {
          ...s.players.P1,
          minions: s.players.P1.minions.map((m) =>
            m.instanceId === mid
              ? { ...m, keywords: new Set([...Array.from(m.keywords), 'lifesteal' as const]) }
              : m,
          ),
        },
      },
    };
    s = setHp(s, 'P1', 30);
    s = applyAction(s, {
      type: 'ATTACK', player: 'P1', attackerId: mid,
      target: { kind: 'hero', player: 'P2' },
    });
    expect(s.players.P2.hp).toBe(40 - 5);
    expect(s.players.P1.hp).toBe(30 + 5);
  });
});

// ============ 事件倒计时 ============

describe('事件倒计时', () => {
  it('V01 辣椒水 3 回合后对对方经纪人 3 伤', () => {
    let s = initGame({ seed: 140, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'V01');
    s = setMana(s, 'P1', 5);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'V01')! });
    const hpBefore = s.players.P2.hp;
    // 走 3 轮 endTurn（P1 → P2 → P1 → P2 → P1 回到该位置时 V01 结算）
    for (let i = 0; i < 6; i++) {
      s = applyAction(s, { type: 'END_TURN', player: s.activePlayer });
    }
    expect(s.players.P2.hp).toBeLessThanOrEqual(hpBefore - 3);
    expect(s.players.P1.events.some((e) => e.defId === 'V01')).toBe(false);
  });
});
