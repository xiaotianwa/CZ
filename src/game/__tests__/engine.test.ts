// 战斗引擎核心流程单元测试
// 运行: pnpm test -- engine

import { describe, it, expect, beforeAll } from 'vitest';
import { initGame, applyAction, getCardDef } from '../engine';
import { registerAllCards } from '../cards';
import type { Deck, GameState, PlayerId, TargetRef } from '../types';

// 仅注册一次
beforeAll(() => {
  // 若重复注册会抛；用 try 忽略（vitest 多 describe 也仅走一次）
  try { registerAllCards(); } catch { /* already registered */ }
});

// ============ 工具 ============

/** 构造一个由指定卡 id 组成的 25 张卡组（不够的用 C02 填充） */
function buildDeck(cardIds: string[]): Deck {
  const padded = [...cardIds];
  while (padded.length < 25) padded.push('C02');
  return { heroName: '测试经纪人', heroPowerId: 'hp_draw1', cards: padded.slice(0, 25) };
}

function findCardInHand(s: GameState, player: PlayerId, defId: string): string | undefined {
  return s.players[player].hand.find((c) => c.defId === defId)?.instanceId;
}

function findMinionByDef(s: GameState, owner: PlayerId, defId: string): string | undefined {
  return s.players[owner].minions.find((m) => m.defId === defId)?.instanceId;
}

// 把某张卡强行放到当前玩家手上（用于精确测试某个效果）
function forceCardIntoHand(s: GameState, player: PlayerId, defId: string): GameState {
  const def = getCardDef(defId);
  if (!def) throw new Error(`Unknown card ${defId}`);
  const inst = { instanceId: `forced_${defId}_${Math.random()}`, defId, owner: player, currentCost: def.cost };
  return {
    ...s,
    players: {
      ...s.players,
      [player]: { ...s.players[player], hand: [...s.players[player].hand, inst] },
    },
  };
}

// 直接把玩家 mana 调上去，方便测高费卡
function setMana(s: GameState, player: PlayerId, mana: number, max = mana): GameState {
  return {
    ...s,
    players: {
      ...s.players,
      [player]: { ...s.players[player], mana, manaMax: Math.max(s.players[player].manaMax, max) },
    },
  };
}

// ============ 用例 ============

describe('引擎初始化', () => {
  it('起手先手抽 3，后手抽 4', () => {
    const s = initGame({
      seed: 1,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });
    // P1 第 1 回合开始后又抽了 1 张 → 手牌 4
    expect(s.players.P1.hand.length).toBe(4);
    expect(s.players.P2.hand.length).toBe(4);
    expect(s.turn).toBe(1);
    expect(s.activePlayer).toBe('P1');
  });

  it('回合开始能量 +1 回满', () => {
    const s = initGame({ seed: 1, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    expect(s.players.P1.mana).toBe(1);
    expect(s.players.P1.manaMax).toBe(1);
  });
});

describe('打出人物卡', () => {
  it('打 C02（2/3）占位 -2 费', () => {
    let s = initGame({ seed: 2, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceCardIntoHand(s, 'P1', 'C02');
    s = setMana(s, 'P1', 3, 3);
    const id = findCardInHand(s, 'P1', 'C02')!;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: id });
    expect(s.players.P1.minions.length).toBe(1);
    expect(s.players.P1.minions[0].attack).toBe(2);
    expect(s.players.P1.minions[0].health).toBe(3);
    expect(s.players.P1.mana).toBe(1); // 3 - 2 = 1
  });

  it('召唤疲劳：当回合不能攻击', () => {
    let s = initGame({ seed: 3, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceCardIntoHand(s, 'P1', 'C02');
    s = setMana(s, 'P1', 5, 5);
    const id = findCardInHand(s, 'P1', 'C02')!;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: id });
    const minionId = findMinionByDef(s, 'P1', 'C02')!;
    const before = s.players.P2.hp;
    s = applyAction(s, {
      type: 'ATTACK',
      player: 'P1',
      attackerId: minionId,
      target: { kind: 'hero', player: 'P2' },
    });
    expect(s.players.P2.hp).toBe(before); // 未造成伤害
    expect(s.log.some((l) => l.kind === 'invalid')).toBe(true);
  });

  it('C05 4哥（冲锋）当回合可攻击', () => {
    let s = initGame({ seed: 4, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceCardIntoHand(s, 'P1', 'C05');
    s = setMana(s, 'P1', 2, 2);
    const id = findCardInHand(s, 'P1', 'C05')!;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: id });
    const mid = findMinionByDef(s, 'P1', 'C05')!;
    const before = s.players.P2.hp;
    s = applyAction(s, {
      type: 'ATTACK',
      player: 'P1',
      attackerId: mid,
      target: { kind: 'hero', player: 'P2' },
    });
    expect(s.players.P2.hp).toBe(before - 5);
  });

  it('C01 战吼抽 1 张', () => {
    let s = initGame({ seed: 5, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceCardIntoHand(s, 'P1', 'C01');
    const handBefore = s.players.P1.hand.length;
    const id = findCardInHand(s, 'P1', 'C01')!;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: id });
    // 打出后手牌数：-1（打出） +1（战吼抽）= 不变
    expect(s.players.P1.hand.length).toBe(handBefore);
  });
});

describe('嘲讽机制', () => {
  it('敌方有嘲讽时必须先打嘲讽', () => {
    let s = initGame({ seed: 6, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // P2 出嘲讽 C03
    s = forceCardIntoHand(s, 'P2', 'C03');
    s = setMana(s, 'P2', 3, 3);
    const tauntId = findCardInHand(s, 'P2', 'C03')!;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P2', instanceId: tauntId });
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });

    // P1 出 C05 冲锋 然后想打脸
    s = forceCardIntoHand(s, 'P1', 'C05');
    s = setMana(s, 'P1', 2, 2);
    const cid = findCardInHand(s, 'P1', 'C05')!;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: cid });
    const atkId = findMinionByDef(s, 'P1', 'C05')!;
    const hpBefore = s.players.P2.hp;
    s = applyAction(s, {
      type: 'ATTACK',
      player: 'P1',
      attackerId: atkId,
      target: { kind: 'hero', player: 'P2' },
    });
    expect(s.players.P2.hp).toBe(hpBefore); // 打脸被拒
    expect(s.log.at(-1)?.text).toContain('嘲讽');
  });
});

describe('特殊效果', () => {
  it('E01 上热搜对敌方英雄造成 3 伤害', () => {
    let s = initGame({ seed: 7, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceCardIntoHand(s, 'P1', 'E01');
    s = setMana(s, 'P1', 2, 2);
    const id = findCardInHand(s, 'P1', 'E01')!;
    const before = s.players.P2.hp;
    s = applyAction(s, {
      type: 'PLAY_CARD',
      player: 'P1',
      instanceId: id,
      target: { kind: 'hero', player: 'P2' } as TargetRef,
    });
    expect(s.players.P2.hp).toBe(before - 3);
  });

  it('E06 全网热议 AOE 对所有敌方人物 -2', () => {
    let s = initGame({ seed: 8, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // P2 先铺场
    s = forceCardIntoHand(s, 'P2', 'C02');
    s = forceCardIntoHand(s, 'P2', 'C03');
    s = setMana(s, 'P2', 10, 10);
    const id1 = findCardInHand(s, 'P2', 'C02')!;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P2', instanceId: id1 });
    const id2 = findCardInHand(s, 'P2', 'C03')!;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P2', instanceId: id2 });
    expect(s.players.P2.minions.length).toBe(2);
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });

    // P1 打 E06
    s = forceCardIntoHand(s, 'P1', 'E06');
    s = setMana(s, 'P1', 10, 10);
    const e6 = findCardInHand(s, 'P1', 'E06')!;
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: e6 });
    // C02 (2/3) - 2 → 1 HP 存活；C03 (2/4) - 2 → 2 HP 存活
    expect(s.players.P2.minions.find((m) => m.defId === 'C02')?.health).toBe(1);
    expect(s.players.P2.minions.find((m) => m.defId === 'C03')?.health).toBe(2);
  });

  it('E10 OK了老铁 无陈泽 5 伤 / 有陈泽 8 伤', () => {
    // 无陈泽
    let s = initGame({ seed: 9, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = forceCardIntoHand(s, 'P1', 'E10');
    s = setMana(s, 'P1', 10, 10);
    const e10 = findCardInHand(s, 'P1', 'E10')!;
    const before = s.players.P2.hp;
    s = applyAction(s, {
      type: 'PLAY_CARD', player: 'P1', instanceId: e10,
      target: { kind: 'hero', player: 'P2' },
    });
    expect(s.players.P2.hp).toBe(before - 5);

    // 有陈泽在场
    let s2 = initGame({ seed: 10, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s2 = forceCardIntoHand(s2, 'P1', 'C14');
    s2 = forceCardIntoHand(s2, 'P1', 'E10');
    s2 = setMana(s2, 'P1', 20, 20);
    s2 = applyAction(s2, { type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s2, 'P1', 'C14')! });
    const before2 = s2.players.P2.hp;
    s2 = applyAction(s2, {
      type: 'PLAY_CARD', player: 'P1', instanceId: findCardInHand(s2, 'P1', 'E10')!,
      target: { kind: 'hero', player: 'P2' },
    });
    expect(s2.players.P2.hp).toBe(before2 - 8);
  });
});

describe('回合流程', () => {
  it('结束回合，交给对方', () => {
    let s = initGame({ seed: 11, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    expect(s.activePlayer).toBe('P1');
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });
    expect(s.activePlayer).toBe('P2');
    expect(s.turn).toBe(2);
    // 炉石式：每玩家独立递进 mana。P2 的第 1 个回合 manaMax=1
    expect(s.players.P2.manaMax).toBe(1);
    expect(s.players.P2.mana).toBe(1);
  });

  it('疲劳：牌库空时抽牌扣血递增', () => {
    let s = initGame({ seed: 12, firstPlayer: 'P1', p1Deck: { heroName: 'x', heroPowerId: '', cards: [] }, p2Deck: buildDeck([]) });
    // 此时 P1 牌库空，每次抽都疲劳
    // 手动触发 endTurn → 对方回合 → 再回自己抽牌
    const hpStart = s.players.P1.hp;
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });
    // 回到 P1 抽牌 → 疲劳 1
    expect(s.players.P1.hp).toBeLessThan(hpStart);
  });
});

describe('游戏结束', () => {
  it('投降对方胜', () => {
    let s = initGame({ seed: 13, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = applyAction(s, { type: 'SURRENDER', player: 'P1' });
    expect(s.ended).toBe(true);
    expect(s.winner).toBe('P2');
  });

  it('HP <= 0 立即结束', () => {
    let s = initGame({ seed: 14, firstPlayer: 'P1', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // 打 E01 × 够多次到 P2 HP <= 0
    s = { ...s, players: { ...s.players, P2: { ...s.players.P2, hp: 2 } } };
    s = forceCardIntoHand(s, 'P1', 'E01');
    s = setMana(s, 'P1', 10, 10);
    const id = findCardInHand(s, 'P1', 'E01')!;
    s = applyAction(s, {
      type: 'PLAY_CARD', player: 'P1', instanceId: id,
      target: { kind: 'hero', player: 'P2' },
    });
    expect(s.ended).toBe(true);
    expect(s.winner).toBe('P1');
  });
});
