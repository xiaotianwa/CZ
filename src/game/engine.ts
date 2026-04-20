// 战斗引擎主入口
// 对外暴露：initGame / applyAction
// 纯函数：state in → state out，无副作用

import type {
  Action,
  CardDef,
  CardInstance,
  Deck,
  EffectHook,
  EventCard,
  GameState,
  Keyword,
  Minion,
  PlayerId,
  PlayerState,
  TargetRef,
} from './types';
import {
  addLog,
  allMinions,
  checkGameOver,
  dealDamage,
  drawCards,
  enemyOf,
  findMinion,
  hasTauntMinion,
  healHero,
  nextRandom,
  reapMinions,
  shuffle,
  updateMinion,
  updatePlayer,
} from './engine-utils';
import { runEffect } from './effects';
import { triggerSynergiesOnEntry } from './synergyRuntime';

// ============ 卡牌数据库（由外部注入 / cards.ts 填充） ============

export const CARD_DB = new Map<string, CardDef>();

export function registerCard(def: CardDef): void {
  CARD_DB.set(def.id, def);
}

export function registerCards(defs: CardDef[]): void {
  for (const d of defs) registerCard(d);
}

export function getCardDef(id: string): CardDef | undefined {
  return CARD_DB.get(id);
}

export function allCardDefs(): CardDef[] {
  return Array.from(CARD_DB.values());
}

// ============ 常量 ============

const HERO_HP = 40;
const MANA_MAX_CAP = 10;
const BOARD_MAX = 6;
const HAND_MAX = 10;
/** 终局回合数：走完此回合（双方各完成一轮）仍未分胜负则按流量高低判胜 */
export const MAX_TURNS = 30;

// ============ 初始化 ============

export interface InitOptions {
  seed?: number;
  p1Deck: Deck;
  p2Deck: Deck;
  /** 谁先手；不传则按 seed 随机 */
  firstPlayer?: PlayerId;
  /** 跳过换牌阶段直接进入第 1 回合（默认 true；UI 层可显式传 false 启用换牌） */
  skipMulligan?: boolean;
}

let nextInstanceCounter = 1;
function genInstanceId(prefix: string): string {
  return `${prefix}_${nextInstanceCounter++}`;
}

export function initGame(opts: InitOptions): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const initialState: GameState = {
    seed,
    rngCursor: 0,
    turn: 0,
    activePlayer: 'P1',
    ended: false,
    log: [],
    players: {
      P1: makePlayer('P1', opts.p1Deck),
      P2: makePlayer('P2', opts.p2Deck),
    },
    phase: 'mulligan',
    mulliganPending: ['P1', 'P2'],
  };

  // 决定先手
  let s = initialState;
  let first: PlayerId;
  if (opts.firstPlayer) {
    first = opts.firstPlayer;
  } else {
    const [r, ns] = nextRandom(s);
    s = ns;
    first = r < 0.5 ? 'P1' : 'P2';
  }
  const second = enemyOf(first);
  s = { ...s, activePlayer: first, mulliganPending: [first, second] };

  // 洗牌
  for (const pid of ['P1', 'P2'] as PlayerId[]) {
    const [shuffled, ns] = shuffle(s, s.players[pid].deck);
    s = ns;
    s = updatePlayer(s, pid, (p) => ({ ...p, deck: shuffled }));
  }

  // 起手：先手 3，后手 4
  s = drawCards(s, first, 3);
  s = drawCards(s, second, 4);

  // 默认跳过换牌（测试兼容）；UI 层需显式 skipMulligan:false
  const skipMulligan = opts.skipMulligan !== false;
  if (skipMulligan) {
    s = { ...s, phase: 'main', mulliganPending: [] };
    s = startTurn(s);
  }
  return s;
}

function makePlayer(id: PlayerId, deck: Deck): PlayerState {
  const cards: CardInstance[] = deck.cards.map((defId) => ({
    instanceId: genInstanceId('card'),
    defId,
    owner: id,
    currentCost: CARD_DB.get(defId)?.cost ?? 0,
  }));
  return {
    id,
    hp: HERO_HP,
    hpMax: HERO_HP,
    mana: 0,
    manaMax: 0,
    overloadNext: 0,
    deck: cards,
    hand: [],
    graveyard: [],
    minions: [],
    equipped: null,
    events: [],
    fatigue: 0,
    heroPowerUsed: false,
    cardsPlayedThisTurn: 0,
    heroAttacksLeftThisTurn: 0,
    surrendered: false,
    recentCardTypesThisTurn: [],
  };
}

/** 约定：attackerId = 'HERO' 时为经纪人持武器攻击 */
export const HERO_ATTACKER_ID = 'HERO';

// ============ 回合开始/结束 ============

function startTurn(state: GameState): GameState {
  const newTurn = state.turn + 1;
  const active = state.activePlayer;
  // 能量上限 +1，受透支扣减
  let s: GameState = { ...state, turn: newTurn };
  s = updatePlayer(s, active, (p) => {
    const newMax = Math.min(MANA_MAX_CAP, p.manaMax + 1);
    const afterOverload = Math.max(0, newMax - p.overloadNext);
    return {
      ...p,
      manaMax: newMax,
      mana: afterOverload,
      overloadNext: 0,
      heroPowerUsed: false,
      cardsPlayedThisTurn: 0,
      recentCardTypesThisTurn: [],
      heroAttacksLeftThisTurn: p.equipped ? 1 : 0,
      // 解冻 / 清除召唤疲劳、重置攻击次数
      minions: p.minions.map((m) => ({
        ...m,
        summoningSickness: false,
        justSummoned: false,
        attacksLeftThisTurn: m.keywords.has('windfury') && !m.silenced ? 2 : 1,
      })),
      equipped: p.equipped ? { ...p.equipped, justEquipped: false } : null,
    };
  });
  s = addLog(s, {
    turn: newTurn,
    player: active,
    kind: 'turnStart',
    text: `第 ${newTurn} 回合 · ${active}`,
  });
  // 抽 1 张
  s = drawCards(s, active, 1);
  // 触发己方场上所有单位/事件的 turnStart hook
  s = runPhaseHooks(s, active, 'turnStart');
  return reapMinions(s);
}

function endTurn(state: GameState): GameState {
  const active = state.activePlayer;
  let s = addLog(state, {
    turn: state.turn,
    player: active,
    kind: 'turnEnd',
    text: `${active} 回合结束`,
  });
  // 触发己方场上所有单位/事件的 turnEnd hook
  s = runPhaseHooks(s, active, 'turnEnd');
  s = reapMinions(s);
  // 事件槽倒计时 -1（仅己方场地型）
  s = tickEvents(s, active);
  // 交给对方
  s = { ...s, activePlayer: enemyOf(active) };
  // 最大回合数结束：流量高者胜
  if (s.turn >= MAX_TURNS && s.activePlayer === 'P1') {
    const p1 = s.players.P1.hp;
    const p2 = s.players.P2.hp;
    const winner = p1 === p2 ? 'draw' : p1 > p2 ? 'P1' : 'P2';
    s = { ...s, ended: true, winner };
    s = addLog(s, {
      turn: s.turn,
      player: 'P1',
      kind: 'gameOver',
      text: `${MAX_TURNS} 回合终局：${winner === 'draw' ? '平局' : winner + ' 胜利'}`,
    });
    return s;
  }
  return startTurn(s);
}

/**
 * 统一触发 owner 场上所有人物/事件的 phase hook（turnStart / turnEnd）。
 * - 人物：被沉默跳过
 * - 事件：奥秘/场地均可挂钩（secret 同时命中 secretTrigger 则另走 triggerSecrets 分支）
 */
function runPhaseHooks(
  state: GameState,
  owner: PlayerId,
  trigger: 'turnStart' | 'turnEnd',
): GameState {
  let s = state;
  const label = trigger === 'turnStart' ? '回合开始' : '回合结束';

  // 场上人物（可能在迭代中死亡，但 runEffect 不会 mutate 数组；下一轮 reapMinions 清理）
  const minionsSnapshot = s.players[owner].minions.map((m) => ({
    instanceId: m.instanceId,
    defId: m.defId,
    silenced: m.silenced,
  }));
  for (const m of minionsSnapshot) {
    if (m.silenced) continue;
    const def = CARD_DB.get(m.defId);
    const hooks = (def?.effects ?? []).filter((e) => e.trigger === trigger);
    for (const h of hooks) {
      s = addLog(s, {
        turn: s.turn,
        player: owner,
        kind: trigger,
        text: `${def?.name ?? m.defId} ${label}: ${h.effectId}`,
      });
      s = runEffect(s, h.effectId, {
        source: { kind: 'minion', id: m.instanceId, owner },
        params: h.params,
      });
    }
  }

  // 事件槽（场地/奥秘，按 DB 定义挂 turnStart/turnEnd 即可）
  const eventsSnapshot = s.players[owner].events.map((e) => ({
    instanceId: e.instanceId,
    defId: e.defId,
  }));
  for (const ev of eventsSnapshot) {
    const def = CARD_DB.get(ev.defId);
    const hooks = (def?.effects ?? []).filter((e) => e.trigger === trigger);
    for (const h of hooks) {
      s = addLog(s, {
        turn: s.turn,
        player: owner,
        kind: trigger,
        text: `${def?.name ?? ev.defId} ${label}: ${h.effectId}`,
      });
      s = runEffect(s, h.effectId, {
        source: { kind: 'event', id: ev.instanceId, owner },
        params: h.params,
      });
    }
  }

  return s;
}

function tickEvents(state: GameState, owner: PlayerId): GameState {
  let s = state;
  const events = [...s.players[owner].events];
  const remaining: EventCard[] = [];
  for (const ev of events) {
    if (ev.kind === 'location' && typeof ev.countdownRemaining === 'number') {
      const nextCd = ev.countdownRemaining - 1;
      if (nextCd <= 0) {
        // 结算
        s = addLog(s, {
          turn: s.turn,
          player: owner,
          kind: 'countdown',
          text: `场地 ${ev.defId} 倒计时结算`,
        });
        const def = CARD_DB.get(ev.defId);
        if (def?.effects) {
          for (const h of def.effects.filter((e) => e.trigger === 'onCountdown0')) {
            s = runEffect(s, h.effectId, {
              source: { kind: 'event', id: ev.instanceId, owner },
              params: h.params,
            });
          }
        }
        // 离场：进入墓地
        s = updatePlayer(s, owner, (p) => ({
          ...p,
          graveyard: [
            ...p.graveyard,
            { instanceId: ev.instanceId, defId: ev.defId, owner, currentCost: 0 },
          ],
        }));
      } else {
        remaining.push({ ...ev, countdownRemaining: nextCd });
      }
    } else {
      remaining.push(ev);
    }
  }
  s = updatePlayer(s, owner, (p) => ({ ...p, events: remaining }));
  return reapMinions(s);
}

// ============ Action dispatch ============

export function applyAction(state: GameState, action: Action): GameState {
  if (state.ended) return state;

  // 换牌阶段：只接受 MULLIGAN / SURRENDER
  if (state.phase === 'mulligan') {
    if (action.type === 'MULLIGAN') return handleMulligan(state, action.player, action.replaceInstanceIds);
    if (action.type === 'SURRENDER') {
      return checkGameOver(
        updatePlayer(state, action.player, (p) => ({ ...p, surrendered: true })),
      );
    }
    return addLog(state, {
      turn: state.turn,
      player: action.player,
      kind: 'invalid',
      text: '换牌阶段尚未完成',
    });
  }

  // 仅当前玩家可操作（SURRENDER 例外）
  if (action.type !== 'SURRENDER' && action.player !== state.activePlayer) {
    return addLog(state, {
      turn: state.turn,
      player: action.player,
      kind: 'invalid',
      text: `非当前回合 (${state.activePlayer})`,
    });
  }

  switch (action.type) {
    case 'PLAY_CARD':
      return handlePlayCard(state, action.player, action.instanceId, action.target);
    case 'ATTACK':
      return handleAttack(state, action.player, action.attackerId, action.target);
    case 'HERO_POWER':
      return handleHeroPower(state, action.player, action.target);
    case 'END_TURN':
      return endTurn(state);
    case 'SURRENDER':
      return checkGameOver(
        updatePlayer(state, action.player, (p) => ({ ...p, surrendered: true })),
      );
    case 'MULLIGAN':
      return addLog(state, {
        turn: state.turn,
        player: action.player,
        kind: 'invalid',
        text: '已非换牌阶段',
      });
  }
}

// ============ 换牌阶段 ============

function handleMulligan(state: GameState, player: PlayerId, replaceIds: string[]): GameState {
  if (state.phase !== 'mulligan') {
    return addLog(state, { turn: 0, player, kind: 'invalid', text: '非换牌阶段' });
  }
  if (!state.mulliganPending.includes(player)) {
    return addLog(state, { turn: 0, player, kind: 'invalid', text: `${player} 已完成换牌` });
  }
  // 先手必须先换
  if (state.mulliganPending[0] !== player) {
    return addLog(state, { turn: 0, player, kind: 'invalid', text: `请等待 ${state.mulliganPending[0]} 先完成换牌` });
  }

  let s = state;
  const p = s.players[player];
  const toReplace = p.hand.filter((c) => replaceIds.includes(c.instanceId));
  if (toReplace.length > 0) {
    // 移除手牌
    const keep = p.hand.filter((c) => !replaceIds.includes(c.instanceId));
    // 放回牌库底 + 洗牌
    const mergedDeck = [...p.deck, ...toReplace];
    const [shuffled, ns] = shuffle(s, mergedDeck);
    s = ns;
    s = updatePlayer(s, player, (pl) => ({ ...pl, hand: keep, deck: shuffled }));
    // 补抽同等数量
    s = drawCards(s, player, toReplace.length);
  }

  s = addLog(s, {
    turn: 0,
    player,
    kind: 'mulligan',
    text: `${player} 换牌 ${toReplace.length} 张`,
  });

  const nextPending = s.mulliganPending.filter((pid) => pid !== player);
  s = { ...s, mulliganPending: nextPending };

  // 所有人都换完 → 进入正常对局
  if (nextPending.length === 0) {
    s = { ...s, phase: 'main' };
    s = startTurn(s);
  }
  return s;
}

// ============ 打出卡牌 ============

function handlePlayCard(
  state: GameState,
  owner: PlayerId,
  instanceId: string,
  target?: TargetRef,
): GameState {
  const p = state.players[owner];
  const card = p.hand.find((c) => c.instanceId === instanceId);
  if (!card) return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '手牌中找不到该卡' });
  const def = CARD_DB.get(card.defId);
  if (!def) return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: `未定义的卡 ${card.defId}` });

  // 能量检查
  if (p.mana < card.currentCost) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '能量不足' });
  }

  // 扣费 + 从手牌移除 + 累积本回合打出类型（用于三连爆款联动）
  let s = updatePlayer(state, owner, (pl) => ({
    ...pl,
    mana: pl.mana - card.currentCost,
    hand: pl.hand.filter((c) => c.instanceId !== instanceId),
    cardsPlayedThisTurn: pl.cardsPlayedThisTurn + 1,
    recentCardTypesThisTurn: [...pl.recentCardTypesThisTurn, def.type],
  }));
  s = addLog(s, { turn: s.turn, player: owner, kind: 'play', text: `${owner} 打出 ${def.name}（${def.id}）` });

  switch (def.type) {
    case 'character':
      s = summonMinion(s, owner, card, def, target);
      break;
    case 'equipment':
      s = equipItem(s, owner, card, def);
      break;
    case 'item':
      // 新语义：道具（instant/delayed）= 即时触发效果，不占装备槽
      // 向后兼容：若仍带 attack/health 字段（旧数据），仍走装备槽
      if (def.attack != null || def.health != null) {
        s = equipItem(s, owner, card, def);
      } else {
        s = playEffectCard(s, owner, card, def, target);
      }
      break;
    case 'effect':
      s = playEffectCard(s, owner, card, def, target);
      break;
    case 'event':
      s = playEventCard(s, owner, card, def);
      break;
  }

  // 联动检测：三连爆款（同回合连续 3 张同类型 → 对方全体 -2 AOE）
  s = checkTripleCombo(s, owner);

  return reapMinions(s);
}

// ============ 联动：三连爆款 ============

/**
 * 检查己方最近 3 张打出的卡是否为同一类型；若是则对敌方所有人物造成 2 点 AOE，
 * 触发后清空 recentCardTypesThisTurn 以避免同回合第 4/5/6 张继续连续触发。
 */
function checkTripleCombo(state: GameState, owner: PlayerId): GameState {
  const recent = state.players[owner].recentCardTypesThisTurn;
  if (recent.length < 3) return state;
  const last3 = recent.slice(-3);
  if (last3[0] !== last3[1] || last3[1] !== last3[2]) return state;

  const typeLabel: Record<import('./types').CardType, string> = {
    character: '角色',
    item: '道具',
    equipment: '装备',
    effect: '消耗',
    event: '事件',
  };
  let s = addLog(state, {
    turn: state.turn,
    player: owner,
    kind: 'combo',
    text: `三连爆款！${typeLabel[last3[0]]} × 3 → 对方全体 -2`,
  });
  // 触发后清空，避免第 4 张同类再次触发
  s = updatePlayer(s, owner, (p) => ({ ...p, recentCardTypesThisTurn: [] }));
  // 对敌方所有人物 AOE 2 伤
  s = runEffect(s, 'damage_all_enemy_minions', {
    source: { kind: 'hero', id: 'combo_triple', owner },
    params: { amount: 2 },
  });
  return s;
}

function summonMinion(
  state: GameState,
  owner: PlayerId,
  card: CardInstance,
  def: CardDef,
  target?: TargetRef,
): GameState {
  if (state.players[owner].minions.length >= BOARD_MAX) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '战场已满' });
  }
  const keywords = new Set<Keyword>(def.keywords ?? []);
  const deathrattles = (def.effects ?? []).filter((e) => e.trigger === 'deathrattle');
  const hasCharge = keywords.has('charge');
  const hasRush = keywords.has('rush');
  const minion: Minion = {
    instanceId: card.instanceId,
    defId: def.id,
    owner,
    attack: def.attack ?? 0,
    maxHealth: def.health ?? 1,
    health: def.health ?? 1,
    attacksLeftThisTurn: hasCharge || hasRush ? (keywords.has('windfury') ? 2 : 1) : 0,
    summoningSickness: !hasCharge && !hasRush,
    keywords,
    silenced: false,
    deathrattles,
    divineShieldActive: keywords.has('divineShield'),
    justSummoned: true,
    rebornAvailable: keywords.has('reborn'),
  };
  let s = updatePlayer(state, owner, (p) => ({ ...p, minions: [...p.minions, minion] }));
  // 登场（旧称「战吼」）
  const battlecries = (def.effects ?? []).filter((e) => e.trigger === 'battlecry');
  for (const h of battlecries) {
    s = addLog(s, { turn: s.turn, player: owner, kind: 'battlecry', text: `${def.name} 登场: ${h.effectId}` });
    s = runEffect(s, h.effectId, {
      source: { kind: 'minion', id: minion.instanceId, owner },
      target,
      params: h.params,
    });
  }
  // 奥秘触发：召唤人物 + 召唤 ⚔≥5 人物
  s = triggerSecrets(s, owner, 'enemyPlaysMinion', minion.instanceId);
  if (minion.attack >= 5) {
    s = triggerSecrets(s, owner, 'enemyPlaysMinionAtkGte5', minion.instanceId);
  }
  // 卡牌联动（both_in_play）：新人物登场，双向扫描场上是否有伙伴
  s = triggerSynergiesOnEntry(s, owner, {
    kind: 'minion',
    defId: def.id,
    instanceId: minion.instanceId,
  });
  return s;
}

function equipItem(state: GameState, owner: PlayerId, card: CardInstance, def: CardDef): GameState {
  const onAttackEffects = (def.effects ?? []).filter((e) => e.trigger === 'onAttack');
  // 旧道具进墓地
  let s = updatePlayer(state, owner, (p) => ({
    ...p,
    graveyard: p.equipped
      ? [...p.graveyard, { instanceId: p.equipped.instanceId, defId: p.equipped.defId, owner, currentCost: 0 }]
      : p.graveyard,
    equipped: {
      instanceId: card.instanceId,
      defId: def.id,
      attack: def.attack ?? 0,
      durability: def.health ?? 1,
      justEquipped: true,
      onAttackEffects,
    },
    heroAttacksLeftThisTurn: 1, // 刚装备的武器本回合可挥一下
  }));
  // onEquip 效果
  const hooks = (def.effects ?? []).filter((e) => e.trigger === 'onEquip');
  for (const h of hooks) {
    s = runEffect(s, h.effectId, {
      source: { kind: 'card', id: card.instanceId, owner },
      params: h.params,
    });
  }
  // 卡牌联动（partner_equipped / both_in_play）：新装备登场
  s = triggerSynergiesOnEntry(s, owner, {
    kind: 'equipment',
    defId: def.id,
    instanceId: card.instanceId,
  });
  return s;
}

function playEffectCard(
  state: GameState,
  owner: PlayerId,
  card: CardInstance,
  def: CardDef,
  target?: TargetRef,
): GameState {
  let s = state;
  const hooks = (def.effects ?? []).filter((e) => e.trigger === 'battlecry');
  for (const h of hooks) {
    s = runEffect(s, h.effectId, {
      source: { kind: 'card', id: card.instanceId, owner },
      target,
      params: h.params,
    });
  }
  // 进墓地
  s = updatePlayer(s, owner, (p) => ({
    ...p,
    graveyard: [...p.graveyard, { ...card, currentCost: 0 }],
  }));
  return s;
}

function playEventCard(state: GameState, owner: PlayerId, card: CardInstance, def: CardDef): GameState {
  if (state.players[owner].events.length >= 3) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '事件槽已满' });
  }
  const kind: EventCard['kind'] = def.secretTrigger ? 'secret' : 'location';
  // 同 ID 暗箱不可重复（旧称「奥秘」）
  if (kind === 'secret' && state.players[owner].events.some((e) => e.defId === def.id)) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '同暗箱不可重复' });
  }
  const ev: EventCard = {
    instanceId: card.instanceId,
    defId: def.id,
    owner,
    kind,
    countdownRemaining: kind === 'location' ? def.countdown ?? 3 : undefined,
    secretTrigger: def.secretTrigger,
  };
  return updatePlayer(state, owner, (p) => ({ ...p, events: [...p.events, ev] }));
}

// ============ 奥秘触发 ============

/**
 * 在引擎关键时机调用；扫描对方所有未触发的奥秘，命中 triggerKey 则执行其效果并清理该奥秘。
 * @param state 当前 state
 * @param owner 触发方（奥秘的所有者是 enemyOf(owner)）
 * @param triggerKey 触发条件
 * @param triggerTarget 可选：触发对象（比如对方打出的人物 id），供 effect 使用
 */
export function triggerSecrets(
  state: GameState,
  actorOwner: PlayerId,
  triggerKey: import('./types').SecretTriggerKey,
  triggerMinionId?: string,
): GameState {
  const defender = enemyOf(actorOwner);
  const secrets = state.players[defender].events.filter(
    (e) => e.kind === 'secret' && !e.triggered && e.secretTrigger === triggerKey,
  );
  if (secrets.length === 0) return state;
  let s = state;
  for (const sec of secrets) {
    s = addLog(s, {
      turn: s.turn,
      player: defender,
      kind: 'secret',
      text: `暗箱触发: ${sec.defId}`,
    });
    const def = CARD_DB.get(sec.defId);
    const hooks = (def?.effects ?? []).filter((e) => e.trigger === 'onSecretTrigger');
    for (const h of hooks) {
      s = runEffect(s, h.effectId, {
        source: { kind: 'event', id: sec.instanceId, owner: defender },
        target: triggerMinionId
          ? { kind: 'minion', player: actorOwner, instanceId: triggerMinionId }
          : undefined,
        params: h.params,
      });
    }
    // 触发后移除奥秘
    s = updatePlayer(s, defender, (p) => ({
      ...p,
      events: p.events.filter((e) => e.instanceId !== sec.instanceId),
      graveyard: [
        ...p.graveyard,
        { instanceId: sec.instanceId, defId: sec.defId, owner: defender, currentCost: 0 },
      ],
    }));
  }
  return s;
}

// ============ 攻击 ============

function handleAttack(
  state: GameState,
  owner: PlayerId,
  attackerId: string,
  target: TargetRef,
): GameState {
  if (target.kind === 'none') {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '攻击需指定目标' });
  }
  if (attackerId === HERO_ATTACKER_ID) {
    return handleHeroWeaponAttack(state, owner, target);
  }
  const attacker = findMinion(state, owner, attackerId);
  if (!attacker) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '找不到攻击者' });
  }
  if (attacker.summoningSickness) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '召唤疲劳' });
  }
  if (attacker.attacksLeftThisTurn <= 0) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '本回合无法攻击' });
  }
  if (attacker.attack <= 0) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '0 攻击无法出击' });
  }

  const enemy = enemyOf(owner);

  // rush 首回合不能打脸（打出当回合）
  if (target.kind === 'hero' && attacker.keywords.has('rush') && attacker.justSummoned && !attacker.keywords.has('charge')) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: 'rush 当回合不能打脸' });
  }

  // 目标潜水（旧称「隐身」）：不可被指定
  if (target.kind === 'minion') {
    const tm = findMinion(state, target.player, target.instanceId);
    if (tm && tm.keywords.has('stealth') && !tm.silenced) {
      return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '目标处于潜水状态，不可指定' });
    }
  }

  // 挡枪校验（旧称「嘲讽」）：敌方有挡枪时必须打挡枪
  if (hasTauntMinion(state, enemy)) {
    const ok =
      target.kind === 'minion' &&
      target.player === enemy &&
      (() => {
        const tm = findMinion(state, enemy, target.instanceId);
        return tm ? tm.keywords.has('taunt') && !tm.silenced : false;
      })();
    if (!ok) {
      return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '必须优先攻击挡枪单位' });
    }
  }

  let s = addLog(state, {
    turn: state.turn,
    player: owner,
    kind: 'attack',
    text: `${attacker.defId} 攻击 ${target.kind === 'hero' ? `${target.player} 英雄` : target.instanceId}`,
    data: {
      attackerKind: 'minion',
      attackerId,
      attackerOwner: owner,
      targetKind: target.kind,
      targetId: target.kind === 'minion' ? target.instanceId : undefined,
      targetPlayer: target.kind === 'minion' || target.kind === 'hero' ? target.player : undefined,
    },
  });

  // 同时结算互扣
  const atkDmg = attacker.attack;
  let defDmg = 0;
  if (target.kind === 'minion') {
    const tm = findMinion(s, target.player, target.instanceId);
    if (tm) defDmg = tm.attack;
  }

  // 先扣己方攻击次数 + 标记本次攻击 + 清除 stealth
  s = updateMinion(s, owner, attackerId, (m) => {
    const newKw = new Set(m.keywords);
    newKw.delete('stealth');
    return {
      ...m,
      attacksLeftThisTurn: m.attacksLeftThisTurn - 1,
      keywords: newKw,
    };
  });

  // 对目标造成伤害
  s = dealDamage(s, target, atkDmg, { kind: 'minion', id: attackerId, owner });
  // 吸粉：同步治疗
  if (attacker.keywords.has('lifesteal') && atkDmg > 0 && !attacker.silenced) {
    s = healHero(s, owner, atkDmg);
  }
  // 对方反击
  if (defDmg > 0 && target.kind === 'minion') {
    s = dealDamage(
      s,
      { kind: 'minion', player: owner, instanceId: attackerId },
      defDmg,
      { kind: 'minion', id: target.instanceId, owner: target.player },
    );
  }

  // onAttack 钩子
  const def = CARD_DB.get(attacker.defId);
  const onAtk = (def?.effects ?? []).filter((e) => e.trigger === 'onAttack');
  for (const h of onAtk) {
    s = runEffect(s, h.effectId, {
      source: { kind: 'minion', id: attackerId, owner },
      params: h.params,
    });
  }

  return reapMinions(s);
}

// ============ 经纪人持武器攻击 ============

function handleHeroWeaponAttack(
  state: GameState,
  owner: PlayerId,
  target: TargetRef,
): GameState {
  if (target.kind === 'none') {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '攻击需指定目标' });
  }
  const p = state.players[owner];
  const weapon = p.equipped;
  if (!weapon) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '未装备武器' });
  }
  if (weapon.attack <= 0) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '武器 0 攻击' });
  }
  if (p.heroAttacksLeftThisTurn <= 0) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '本回合已攻击' });
  }
  // 挡枪校验（旧称「嘲讽」）
  const enemy = enemyOf(owner);
  if (hasTauntMinion(state, enemy)) {
    const ok =
      target.kind === 'minion' &&
      target.player === enemy &&
      (() => {
        const tm = findMinion(state, enemy, target.instanceId);
        return tm ? tm.keywords.has('taunt') && !tm.silenced : false;
      })();
    if (!ok) {
      return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '必须优先攻击挡枪单位' });
    }
  }
  let s = addLog(state, {
    turn: state.turn,
    player: owner,
    kind: 'attack',
    text: `${owner} 玩家挥 ${weapon.defId}`,
    data: {
      attackerKind: 'hero',
      attackerOwner: owner,
      targetKind: target.kind,
      targetId: target.kind === 'minion' ? target.instanceId : undefined,
      targetPlayer: target.kind === 'minion' || target.kind === 'hero' ? target.player : undefined,
    },
  });
  const atkDmg = weapon.attack;
  let defDmg = 0;
  if (target.kind === 'minion') {
    const tm = findMinion(s, target.player, target.instanceId);
    if (tm) defDmg = tm.attack;
  }
  // 扣经纪人攻击次数 + 耐久 -1
  s = updatePlayer(s, owner, (pl) => ({
    ...pl,
    heroAttacksLeftThisTurn: pl.heroAttacksLeftThisTurn - 1,
    equipped: pl.equipped
      ? { ...pl.equipped, durability: pl.equipped.durability - 1 }
      : null,
  }));
  // 打目标
  s = dealDamage(s, target, atkDmg, { kind: 'hero', id: 'HERO', owner });
  // 反击伤到经纪人
  if (defDmg > 0 && target.kind === 'minion') {
    s = dealDamage(s, { kind: 'hero', player: owner }, defDmg, {
      kind: 'minion',
      id: target.instanceId,
      owner: target.player,
    });
  }
  // 武器 onAttack 钩子
  const hooks = s.players[owner].equipped?.onAttackEffects ?? [];
  for (const h of hooks) {
    s = runEffect(s, h.effectId, {
      source: { kind: 'card', id: weapon.instanceId, owner },
      params: h.params,
    });
  }
  // 耐久归零：武器损毁
  s = updatePlayer(s, owner, (pl) => {
    if (pl.equipped && pl.equipped.durability <= 0) {
      return {
        ...pl,
        graveyard: [
          ...pl.graveyard,
          { instanceId: pl.equipped.instanceId, defId: pl.equipped.defId, owner, currentCost: 0 },
        ],
        equipped: null,
      };
    }
    return pl;
  });
  return reapMinions(s);
}

// ============ 经纪人技能 ============

function handleHeroPower(state: GameState, owner: PlayerId, target?: TargetRef): GameState {
  const HP_COST = 2;
  const p = state.players[owner];
  if (p.heroPowerUsed) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '本回合已用过玩家技能' });
  }
  if (p.mana < HP_COST) {
    return addLog(state, { turn: state.turn, player: owner, kind: 'invalid', text: '能量不足' });
  }
  let s = updatePlayer(state, owner, (pl) => ({
    ...pl,
    mana: pl.mana - HP_COST,
    heroPowerUsed: true,
  }));
  // 默认经纪人技能：抽 1 张牌（可后续按角色切换）
  s = drawCards(s, owner, 1);
  s = addLog(s, { turn: s.turn, player: owner, kind: 'play', text: `${owner} 使用玩家技能` });
  return reapMinions(s);
}
