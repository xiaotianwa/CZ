// 联动系统测试：三连爆款 + 陈泽默契开播

import { describe, it, expect, beforeAll } from 'vitest';
import { initGame, applyAction, getCardDef } from '../engine';
import { registerAllCards } from '../cards';
import type { Deck, GameState, PlayerId } from '../types';

beforeAll(() => {
  try { registerAllCards(); } catch { /* already registered */ }
});

// ============ 工具 ============

function buildDeck(cardIds: string[]): Deck {
  const padded = [...cardIds];
  while (padded.length < 35) padded.push('C02');
  return { heroName: 't', heroPowerId: 'hp', cards: padded.slice(0, 35) };
}

function findCardInHand(s: GameState, p: PlayerId, defId: string): string | undefined {
  return s.players[p].hand.find((c) => c.defId === defId)?.instanceId;
}

function forceIntoHand(s: GameState, p: PlayerId, defId: string): GameState {
  const def = getCardDef(defId);
  if (!def) throw new Error(defId);
  const inst = { instanceId: `f_${defId}_${Math.random().toString(36).slice(2, 9)}`, defId, owner: p, currentCost: def.cost };
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

// ============ 三连爆款 ============

describe('三连爆款联动', () => {
  it('同回合连续 3 张同类型「消耗」牌 → 触发对方全体 -2', () => {
    let s = initGame({ seed: 200, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck(['C02', 'C02', 'C02']) });
    // 给 P2 召唤两个人物（为了验证 AOE 命中）
    s = {
      ...s,
      players: {
        ...s.players,
        P2: {
          ...s.players.P2,
          minions: [
            {
              instanceId: 'm_test1', defId: 'C02', owner: 'P2',
              attack: 2, maxHealth: 3, health: 3, attacksLeftThisTurn: 0,
              summoningSickness: true, keywords: new Set(), silenced: false,
              deathrattles: [], divineShieldActive: false,
            },
            {
              instanceId: 'm_test2', defId: 'C02', owner: 'P2',
              attack: 2, maxHealth: 3, health: 3, attacksLeftThisTurn: 0,
              summoningSickness: true, keywords: new Set(), silenced: false,
              deathrattles: [], divineShieldActive: false,
            },
          ],
        },
      },
    };
    // P1 连续打 3 张 effect 类型卡：E05（下次一定，1 费，抽 1）× 3
    s = forceIntoHand(s, 'P1', 'E05');
    s = forceIntoHand(s, 'P1', 'E05');
    s = forceIntoHand(s, 'P1', 'E05');
    s = setMana(s, 'P1', 10);

    const id1 = s.players.P1.hand.find((c) => c.defId === 'E05')!.instanceId;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: id1 });
    const id2 = s.players.P1.hand.find((c) => c.defId === 'E05')!.instanceId;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: id2 });
    // 第 3 张打出后应触发三连爆款
    const id3 = s.players.P1.hand.find((c) => c.defId === 'E05')!.instanceId;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: id3 });

    // P2 的两个人物均 -2 血
    const survivors = s.players.P2.minions.filter((m) => m.instanceId.startsWith('m_test'));
    for (const m of survivors) expect(m.health).toBe(1);
    // 日志里有 combo 记录
    expect(s.log.some((l) => l.kind === 'combo' && l.text.includes('三连爆款'))).toBe(true);
  });

  it('不同类型混打不触发', () => {
    let s = initGame({ seed: 201, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'E05'); // effect
    s = forceIntoHand(s, 'P1', 'E05'); // effect
    s = forceIntoHand(s, 'P1', 'I02'); // item (黑蒜)
    s = setMana(s, 'P1', 10);

    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'E05')! });
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'E05')! });
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'I02')! });

    expect(s.log.some((l) => l.kind === 'combo')).toBe(false);
  });

  it('回合切换后计数重置，跨回合同类不触发', () => {
    let s = initGame({ seed: 202, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'E05');
    s = forceIntoHand(s, 'P1', 'E05');
    s = setMana(s, 'P1', 10);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'E05')! });
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'E05')! });
    // 结束回合给对方
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });
    // 回到 P1，recentCardTypesThisTurn 应已清空
    expect(s.players.P1.recentCardTypesThisTurn.length).toBe(0);
    s = forceIntoHand(s, 'P1', 'E05');
    s = setMana(s, 'P1', 10);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'E05')! });
    expect(s.log.filter((l) => l.kind === 'combo').length).toBe(0);
  });
});

// ============ 陈泽 × 搭档小助理 默契开播 ============

describe('陈泽默契开播联动', () => {
  it('先出搭档（C01），后出陈泽（C14）→ 双方 +2/+0 并抽 1', () => {
    let s = initGame({ seed: 210, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // P1 先手：第 1 回合开始时 mana=1
    s = forceIntoHand(s, 'P1', 'C01');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'C01')! });
    // 此时只有 C01，无联动触发
    expect(s.log.some((l) => l.kind === 'combo')).toBe(false);

    // 同回合强塞陈泽 + 升级 mana 到 9
    s = forceIntoHand(s, 'P1', 'C14');
    s = setMana(s, 'P1', 9);
    const handBefore = s.players.P1.hand.length;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'C14')! });

    const c01 = s.players.P1.minions.find((m) => m.defId === 'C01');
    const c14 = s.players.P1.minions.find((m) => m.defId === 'C14');
    expect(c01).toBeDefined();
    expect(c14).toBeDefined();
    // C01 原 1/2 → 3/2
    expect(c01!.attack).toBe(1 + 2);
    expect(c01!.maxHealth).toBe(2);
    // C14 原 8/9 → 10/9
    expect(c14!.attack).toBe(8 + 2);
    expect(c14!.maxHealth).toBe(9);
    // 抽 1 张（handBefore 已是 C14 登场前数量-C14 出牌消耗）
    expect(s.players.P1.hand.length).toBeGreaterThanOrEqual(handBefore);
    // 联动日志
    expect(s.log.some((l) => l.kind === 'combo' && l.text.includes('默契开播'))).toBe(true);
  });

  it('先出陈泽（C14），后出搭档（C01）→ 同样触发', () => {
    let s = initGame({ seed: 211, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'C14');
    s = setMana(s, 'P1', 9);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'C14')! });
    expect(s.log.some((l) => l.kind === 'combo')).toBe(false);

    s = forceIntoHand(s, 'P1', 'C01');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'C01')! });

    const c14 = s.players.P1.minions.find((m) => m.defId === 'C14')!;
    const c01 = s.players.P1.minions.find((m) => m.defId === 'C01')!;
    expect(c14.attack).toBe(10);
    expect(c01.attack).toBe(3);
    expect(s.log.some((l) => l.kind === 'combo' && l.text.includes('默契开播'))).toBe(true);
  });

  it('只出陈泽不出搭档，不触发联动', () => {
    let s = initGame({ seed: 212, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceIntoHand(s, 'P1', 'C14');
    s = setMana(s, 'P1', 9);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s, 'P1', 'C14')! });
    expect(s.log.some((l) => l.kind === 'combo' && l.text.includes('默契开播'))).toBe(false);
    const c14 = s.players.P1.minions.find((m) => m.defId === 'C14')!;
    expect(c14.attack).toBe(8); // 未 buff
  });
});
