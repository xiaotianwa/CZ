// AI 决策器基础测试
// 重点：确保 AI 不会产生非法 action（能出牌会出、有嘲讽会打嘲讽、能斩杀优先、rush 不打脸）

import { describe, it, expect, beforeAll } from 'vitest';
import { initGame, applyAction, getCardDef, HERO_ATTACKER_ID } from '../engine';
import { registerAllCards } from '../cards';
import { nextAction } from '../ai';
import type { CardInstance, Deck, GameState, Keyword, Minion, PlayerId } from '../types';

beforeAll(() => {
  try { registerAllCards(); } catch { /* already registered */ }
});

function buildDeck(cardIds: string[]): Deck {
  const padded = [...cardIds];
  while (padded.length < 25) padded.push('C02');
  return { heroName: 't', heroPowerId: 'hp', cards: padded.slice(0, 25) };
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

function forceIntoHand(s: GameState, p: PlayerId, defId: string): GameState {
  const def = getCardDef(defId);
  if (!def) throw new Error(defId);
  const inst: CardInstance = {
    instanceId: `f_${defId}_${Math.random().toString(36).slice(2, 9)}`,
    defId, owner: p, currentCost: def.cost,
  };
  return {
    ...s,
    players: { ...s.players, [p]: { ...s.players[p], hand: [...s.players[p].hand, inst] } },
  };
}

function pushMinion(s: GameState, p: PlayerId, m: Partial<Minion> & { defId: string }): GameState {
  const full: Minion = {
    instanceId: m.instanceId ?? `ai_${Math.random().toString(36).slice(2, 9)}`,
    defId: m.defId,
    owner: p,
    attack: m.attack ?? 2,
    maxHealth: m.maxHealth ?? 3,
    health: m.health ?? m.maxHealth ?? 3,
    attacksLeftThisTurn: m.attacksLeftThisTurn ?? 1,
    summoningSickness: m.summoningSickness ?? false,
    keywords: m.keywords ?? new Set(),
    silenced: m.silenced ?? false,
    deathrattles: m.deathrattles ?? [],
    divineShieldActive: m.divineShieldActive ?? false,
    justSummoned: m.justSummoned,
  };
  return {
    ...s,
    players: { ...s.players, [p]: { ...s.players[p], minions: [...s.players[p].minions, full] } },
  };
}

// ============ 测试 ============

describe('AI: 换牌', () => {
  it('换掉 cost>=5 的高费起手', () => {
    let s = initGame({ seed: 300, firstPlayer: 'P1', p1Deck: buildDeck(['C14', 'C14', 'C02', 'C02', 'C02']), p2Deck: buildDeck([]), skipMulligan: false });
    // P1 换牌先
    const p1Action = nextAction(s, 'P1');
    if (p1Action.type === 'MULLIGAN') {
      s = applyAction(s, p1Action);
    }
    // P2 AI 换牌
    const action = nextAction(s, 'P2');
    expect(action.type).toBe('MULLIGAN');
    if (action.type === 'MULLIGAN') {
      // 所有被选中的都是 cost>=5
      for (const id of action.replaceInstanceIds) {
        const c = s.players.P2.hand.find((x) => x.instanceId === id)!;
        const def = getCardDef(c.defId)!;
        expect(def.cost).toBeGreaterThanOrEqual(5);
      }
    }
  });
});

describe('AI: 主阶段决策', () => {
  it('有能打的手牌 → 优先打牌', () => {
    let s = initGame({ seed: 301, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // P2 回合，给手牌一张 C02（2 费 2/3）
    s = forceIntoHand(s, 'P2', 'C02');
    s = setMana(s, 'P2', 3);

    const action = nextAction(s, 'P2');
    expect(action.type).toBe('PLAY_CARD');
    if (action.type === 'PLAY_CARD') {
      const c = s.players.P2.hand.find((x) => x.instanceId === action.instanceId)!;
      expect(c.defId).toBe('C02');
    }
  });

  it('无手牌 + 无攻击者 + 有能量 → 使用玩家技能', () => {
    let s = initGame({ seed: 302, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // 清空 P2 手牌 + 拉满 mana
    s = {
      ...s,
      players: { ...s.players, P2: { ...s.players.P2, hand: [], mana: 3, manaMax: 3 } },
    };
    const action = nextAction(s, 'P2');
    expect(action.type).toBe('HERO_POWER');
  });

  it('啥都做不了 → END_TURN', () => {
    let s = initGame({ seed: 303, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = {
      ...s,
      players: { ...s.players, P2: { ...s.players.P2, hand: [], mana: 0, heroPowerUsed: true } },
    };
    const action = nextAction(s, 'P2');
    expect(action.type).toBe('END_TURN');
  });
});

describe('AI: 攻击决策', () => {
  it('对方有嘲讽 → 必须打嘲讽', () => {
    let s = initGame({ seed: 310, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // 清空 P2 手牌避免干扰
    s = { ...s, players: { ...s.players, P2: { ...s.players.P2, hand: [], mana: 0, heroPowerUsed: true } } };
    // P2 有一个 3/3 随从，可攻击
    s = pushMinion(s, 'P2', { instanceId: 'atk1', defId: 'C02', attack: 3, maxHealth: 3, health: 3, attacksLeftThisTurn: 1 });
    // P1 有一个普通 2/2 和一个嘲讽 1/2
    s = pushMinion(s, 'P1', { instanceId: 'm_plain', defId: 'C02', attack: 2, maxHealth: 2, health: 2 });
    s = pushMinion(s, 'P1', { instanceId: 'm_taunt', defId: 'C03', attack: 1, maxHealth: 2, health: 2, keywords: new Set<Keyword>(['taunt']) });

    const action = nextAction(s, 'P2');
    expect(action.type).toBe('ATTACK');
    if (action.type === 'ATTACK') {
      expect(action.target.kind).toBe('minion');
      if (action.target.kind === 'minion') {
        expect(action.target.instanceId).toBe('m_taunt');
      }
    }
  });

  it('能斩杀对方玩家 → 全力打脸', () => {
    let s = initGame({ seed: 311, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    // P1 只剩 3 血 + 无嘲讽
    s = { ...s, players: { ...s.players, P1: { ...s.players.P1, hp: 3 }, P2: { ...s.players.P2, hand: [], mana: 0, heroPowerUsed: true } } };
    // P2 两个 3/3 可攻击
    s = pushMinion(s, 'P2', { instanceId: 'a', defId: 'C02', attack: 3, attacksLeftThisTurn: 1 });
    s = pushMinion(s, 'P2', { instanceId: 'b', defId: 'C02', attack: 3, attacksLeftThisTurn: 1 });

    const action = nextAction(s, 'P2');
    expect(action.type).toBe('ATTACK');
    if (action.type === 'ATTACK') {
      expect(action.target.kind).toBe('hero');
      if (action.target.kind === 'hero') expect(action.target.player).toBe('P1');
    }
  });

  it('rush 刚登场不打脸，只打随从', () => {
    let s = initGame({ seed: 312, firstPlayer: 'P2', p1Deck: buildDeck([]), p2Deck: buildDeck([]) });
    s = { ...s, players: { ...s.players, P2: { ...s.players.P2, hand: [], mana: 0, heroPowerUsed: true } } };
    // P1 有一个非嘲讽 2/2
    s = pushMinion(s, 'P1', { instanceId: 'target', defId: 'C02', attack: 2, maxHealth: 2, health: 2 });
    // P2 有 rush+justSummoned 3/3
    s = pushMinion(s, 'P2', {
      instanceId: 'rusher', defId: 'C11', attack: 3, maxHealth: 3, health: 3,
      attacksLeftThisTurn: 1, justSummoned: true, keywords: new Set<Keyword>(['rush']),
    });

    const action = nextAction(s, 'P2');
    expect(action.type).toBe('ATTACK');
    if (action.type === 'ATTACK') {
      expect(action.target.kind).toBe('minion');
      if (action.target.kind === 'minion') {
        expect(action.target.instanceId).toBe('target');
      }
    }
  });
});
