// 回合开始/结束钩子（turnStart / turnEnd）运行时分发测试
// 覆盖 runPhaseHooks：
//  - turnStart：己方回合开始时触发己方场上单位的 turnStart effects
//  - turnEnd：  己方回合结束时触发己方场上单位的 turnEnd effects
//  - 沉默的单位跳过
//  - 事件槽（secret/location）也能挂 phase 钩子

import { describe, it, expect, beforeAll } from 'vitest';
import { initGame, applyAction, getCardDef, registerCard } from '../engine';
import { registerAllCards } from '../cards';
import type { CardDef, Deck, GameState, PlayerId } from '../types';

beforeAll(() => {
  try { registerAllCards(); } catch { /* already */ }
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

function registerTestCard(card: CardDef): void {
  registerCard(card);
}

// ============ turnStart on minion ============

describe('turnStart hook', () => {
  it('己方回合开始时触发己方人物的 turnStart effect（damage_enemy_hero）', () => {
    registerTestCard({
      id: 'T01',
      name: '测试-晨起',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 3,
      effects: [
        { trigger: 'turnStart', effectId: 'damage_enemy_hero', params: { amount: 2 } },
      ],
    });

    let s = initGame({
      seed: 2000,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });

    // P1 打 T01 进场
    s = forceIntoHand(s, 'P1', 'T01');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'T01') });

    const hpBeforeTurn = s.players.P2.hp;

    // P1 结束回合 → P2 回合（不触发 P1 的 T01）
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });
    expect(s.players.P2.hp).toBe(hpBeforeTurn); // P2 回合开始不会触发 P1 单位的 turnStart
    // P2 结束回合 → 回到 P1，T01 的 turnStart 触发 -> P2 -2
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });
    expect(s.players.P2.hp).toBe(hpBeforeTurn - 2);
    expect(s.log.some((l) => l.kind === 'turnStart' && l.text.includes('damage_enemy_hero'))).toBe(true);
  });

  it('被沉默的人物跳过 turnStart', () => {
    registerTestCard({
      id: 'T02',
      name: '测试-静默',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 3,
      effects: [
        { trigger: 'turnStart', effectId: 'damage_enemy_hero', params: { amount: 5 } },
      ],
    });

    let s = initGame({
      seed: 2001,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });

    s = forceIntoHand(s, 'P1', 'T02');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'T02') });

    // 手动沉默 T02（模拟敌方 E04 塑料兄弟情的效果）
    s = {
      ...s,
      players: {
        ...s.players,
        P1: {
          ...s.players.P1,
          minions: s.players.P1.minions.map((m) =>
            m.defId === 'T02' ? { ...m, silenced: true } : m,
          ),
        },
      },
    };

    const hpBefore = s.players.P2.hp;
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });
    expect(s.players.P2.hp).toBe(hpBefore); // 沉默了不触发
  });
});

// ============ turnEnd on minion ============

describe('turnEnd hook', () => {
  it('己方回合结束时触发 turnEnd effect（draw_cards）', () => {
    registerTestCard({
      id: 'T03',
      name: '测试-复盘',
      type: 'character',
      rarity: 'R',
      cost: 1,
      attack: 1,
      health: 2,
      effects: [
        { trigger: 'turnEnd', effectId: 'draw_cards', params: { amount: 1 } },
      ],
    });

    let s = initGame({
      seed: 2002,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });

    s = forceIntoHand(s, 'P1', 'T03');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'T03') });

    const handBefore = s.players.P1.hand.length;
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });
    // turnEnd 触发 draw_cards 1
    expect(s.players.P1.hand.length).toBe(handBefore + 1);
    expect(s.log.some((l) => l.kind === 'turnEnd' && l.text.includes('draw_cards'))).toBe(true);
  });
});

// ============ 事件槽上的 phase 钩子 ============

describe('事件槽 phase hook', () => {
  it('己方场地（暗箱）也能挂 turnStart，回合开始时触发', () => {
    // 模拟一张 secret 类事件卡，挂 turnStart 给自己回 1 血
    registerTestCard({
      id: 'T04',
      name: '测试-晨间暗箱',
      type: 'event',
      rarity: 'R',
      cost: 1,
      secretTrigger: 'enemyPlaysMinion', // 挂一个随意的 secretTrigger 满足数据要求
      effects: [
        { trigger: 'turnStart', effectId: 'heal_self_hero', params: { amount: 3 } },
      ],
    });

    let s = initGame({
      seed: 2003,
      firstPlayer: 'P1',
      p1Deck: buildDeck([]),
      p2Deck: buildDeck([]),
    });

    // 先让 P1 英雄扣 5 血
    s = {
      ...s,
      players: {
        ...s.players,
        P1: { ...s.players.P1, hp: s.players.P1.hp - 5 },
      },
    };
    const hpAfterDmg = s.players.P1.hp;

    s = forceIntoHand(s, 'P1', 'T04');
    s = setMana(s, 'P1', 1);
    s = applyAction(s, { type: 'PLAY_CARD', player: 'P1', instanceId: findId(s, 'P1', 'T04') });

    // 当回合末 + 下回合开始 —— turnStart 触发时 P1 + 3 血
    s = applyAction(s, { type: 'END_TURN', player: 'P1' });
    s = applyAction(s, { type: 'END_TURN', player: 'P2' });
    expect(s.players.P1.hp).toBe(hpAfterDmg + 3);
  });
});
