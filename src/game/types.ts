// 陈泽传媒卡牌游戏 · 战斗引擎核心类型
// 参考《对战规则.md》v1
// 所有字段保持不可变/纯函数风格，便于服务端权威判定与战报回放

// 联动类型：仅做 type-only 引用，避免把 zod runtime 拉进 engine bundle
import type { CardSynergy } from '@/lib/tcg/synergy';

// ============ 基础枚举 ============

export type CardType = 'character' | 'item' | 'equipment' | 'effect' | 'event';
export type CardRarity = 'N' | 'R' | 'SR' | 'SSR';
export type PlayerId = 'P1' | 'P2';

/** 卡牌子分类（用于 UI 细分展示）
 *  - item: 'instant'=即时 / 'delayed'=延时
 *  - equipment: 'weapon'=武器 / 'armor'=防具
 */
export type CardSubtype = 'instant' | 'delayed' | 'weapon' | 'armor';

/** 关键字 —— 命名全部 MCN 化，去「炉石传说」同名词
 *  内部 id 保持不变（不破坏引擎、effects、测试）
 *  中文显示名参见 @/app/game/_components/Battle.tsx KEYWORD_DICT
 */
export type Keyword =
  | 'taunt'          // 挡枪 (原嘲讽)
  | 'charge'         // 紧急通告 (原冲锋)
  | 'rush'           // 试水 (原突袭)
  | 'windfury'       // 双开 (原双账号)
  | 'stealth'        // 潜水 (原隐身)
  | 'poisonous'      // 封杀 (原剧毒)
  | 'lifesteal'      // 吸粉 (原吸血)
  | 'divineShield'   // 粉丝盾 (原圣盾)
  | 'combo'          // 联动 (原连招)
  | 'overload'       // 透支
  | 'discover'       // 挖掘
  | 'swap'           // 换号
  | 'echo'           // 重播 (原回响)
  | 'reborn';        // 复出 (原不朽)

// ============ 卡牌定义（不可变模板） ============

export interface CardDef {
  /** 编号 C01 / I04 / E10 / V06 */
  id: string;
  name: string;
  type: CardType;
  /** 子分类（仅对 item / equipment 有意义） */
  subtype?: CardSubtype;
  rarity: CardRarity;
  cost: number;
  /** 角色/装备：攻击；道具/消耗/事件：无 */
  attack?: number;
  /** 角色：生命；装备：耐久；其他：无 */
  health?: number;
  /** 角色天生关键字 */
  keywords?: Keyword[];
  /** 事件 - 场地倒计时（⏳N） */
  countdown?: number;
  /** 事件 - 暗箱触发条件 key（旧称「奥秘」） */
  secretTrigger?: SecretTriggerKey;
  /** 效果钩子 id 列表，引擎按 id 从 effects registry 查函数 */
  effects?: EffectHook[];
  /** 卡牌联动（运营后台配置；引擎在 summon/equip 时双向检查命中） */
  synergies?: CardSynergy[];
  /** 描述/flavor 仅 UI，不影响逻辑 */
  description?: string;
  flavor?: string;
}

/** 效果钩子：在哪个时机跑哪个已注册函数 */
export interface EffectHook {
  /** 触发时机 */
  trigger: EffectTrigger;
  /** 已在 effects registry 注册的函数 id */
  effectId: string;
  /** 效果可选参数（由 effect 实现自行解释） */
  params?: Record<string, unknown>;
}

export type EffectTrigger =
  | 'battlecry'       // 登场（旧称「战吼」，打出时立即）
  | 'deathrattle'     // 退场（旧称「亡语」，死亡时）
  | 'onEquip'         // 道具装备时
  | 'onAttack'        // 己方本卡攻击后
  | 'turnStart'       // 回合开始（拥有者）
  | 'turnEnd'         // 回合结束（拥有者）
  | 'onCountdown0'    // 场地倒计时归零
  | 'onSecretTrigger' // 暗箱条件满足（旧称「奥秘」）
  | 'aura';           // 粉圈光环（在场时持续生效，每次 recomputeAuras 调用）

/** 暗箱触发条件 key（旧称「奥秘」；引擎在关键点 emit，命中时调 effect） */
export type SecretTriggerKey =
  | 'enemyPlaysMinion'
  | 'enemyPlaysMinionAtkGte5'
  | 'enemyPlaysEffectDamage'
  | 'heroTakesDamageGte5';

// ============ 目标选择 ============

export type TargetRef =
  | { kind: 'hero'; player: PlayerId }
  | { kind: 'minion'; player: PlayerId; instanceId: string }
  | { kind: 'none' };

// ============ 运行时实体（可变状态） ============

/** 手牌/牌库/墓地中的卡牌实例（同一张 CardDef 可能有多个实例） */
export interface CardInstance {
  instanceId: string;
  defId: string;
  owner: PlayerId;
  /** 对于道具/效果/事件，打出时等同 def.cost；但有些效果会临时修改 */
  currentCost: number;
}

/** 战场上的人物（随从） */
export interface Minion {
  instanceId: string;
  defId: string;
  owner: PlayerId;
  attack: number;
  maxHealth: number;
  health: number;
  /** 本回合还能攻击的次数（普通=1 双开=2；开局受召唤疲劳影响） */
  attacksLeftThisTurn: number;
  /** 召唤疲劳（本回合不能攻击，除非 charge/rush） */
  summoningSickness: boolean;
  /** 活跃关键字（天生 + 被 aura 临时赋予） */
  keywords: Set<Keyword>;
  /** 是否被沉默（清除所有技能与光环） */
  silenced: boolean;
  /** 退场效果列表（旧称「亡语」；在死亡时调用，silenced 后失效） */
  deathrattles: EffectHook[];
  /** 粉丝盾剩余（0/1） */
  divineShieldActive: boolean;
  /** 本回合刚召唤（rush 首回合不能打脸） */
  justSummoned?: boolean;
  /** 复出（旧称「不朽」）：首次死亡后以 1 血复活；复活后该标记清除 */
  rebornAvailable?: boolean;
}

/** 装备到经纪人的道具（武器） */
export interface EquippedItem {
  instanceId: string;
  defId: string;
  attack: number;
  durability: number;
  /** 武器是否是本回合刚装备（某些效果可能关心） */
  justEquipped?: boolean;
  /** onAttack 效果列表（每次武器攻击后触发） */
  onAttackEffects?: EffectHook[];
}

/** 己方事件槽：场地（倒计时）或暗箱（隐藏，旧称「奥秘」） */
export interface EventCard {
  instanceId: string;
  defId: string;
  owner: PlayerId;
  /** 'location' 带倒计时， 'secret' 带隐藏标志（暗箱） */
  kind: 'location' | 'secret';
  /** 场地：剩余回合；暗箱：undefined */
  countdownRemaining?: number;
  /** 暗箱触发条件 */
  secretTrigger?: SecretTriggerKey;
  /** 暗箱是否已触发（用于动画，触发即离场） */
  triggered?: boolean;
}

/** 玩家完整状态 */
export interface PlayerState {
  id: PlayerId;
  /** 经纪人生命（流量） */
  hp: number;
  hpMax: number;
  /** 当前能量 / 上限 */
  mana: number;
  manaMax: number;
  /** 下回合透支扣能量 */
  overloadNext: number;
  /** 牌库 / 手牌 / 墓地 */
  deck: CardInstance[];
  hand: CardInstance[];
  graveyard: CardInstance[];
  /** 战场 */
  minions: Minion[];
  /** 装备（单件） */
  equipped: EquippedItem | null;
  /** 事件槽（场地+暗箱混合，≤3） */
  events: EventCard[];
  /** 疲劳计数（牌库空时每次抽牌伤害递增） */
  fatigue: number;
  /** 是否本回合已用过经纪人技能 */
  heroPowerUsed: boolean;
  /** 本回合已打出卡数（用于连击判定） */
  cardsPlayedThisTurn: number;
  /** 经纪人本回合剩余攻击次数（由武器启用，普通 1 次 / 回合） */
  heroAttacksLeftThisTurn: number;
  /** 是否投降 */
  surrendered: boolean;
  /** 本回合已按顺序打出的卡类型（用于「三连爆款」联动检测） */
  recentCardTypesThisTurn: CardType[];
}

/** 对局阶段 */
export type GamePhase = 'mulligan' | 'main';

/** 整局游戏状态 */
export interface GameState {
  seed: number;             // 伪随机种子，便于重放
  rngCursor: number;        // 当前 RNG 指针
  turn: number;             // 第几回合（从 1 开始）
  activePlayer: PlayerId;   // 当前行动方
  players: Record<PlayerId, PlayerState>;
  /** 战斗日志 */
  log: LogEntry[];
  /** 是否已结束 */
  ended: boolean;
  winner?: PlayerId | 'draw';
  /** 对局阶段：mulligan=换牌阶段 / main=正常对局 */
  phase: GamePhase;
  /** 还未完成换牌的玩家（按先手→后手顺序） */
  mulliganPending: PlayerId[];
}

// ============ 动作（玩家指令） ============

export type Action =
  | { type: 'PLAY_CARD'; player: PlayerId; instanceId: string; target?: TargetRef }
  | { type: 'ATTACK'; player: PlayerId; attackerId: string; target: TargetRef }
  | { type: 'HERO_POWER'; player: PlayerId; target?: TargetRef }
  | { type: 'END_TURN'; player: PlayerId }
  | { type: 'SURRENDER'; player: PlayerId }
  | { type: 'MULLIGAN'; player: PlayerId; replaceInstanceIds: string[] };

// ============ 日志 ============

export interface LogEntry {
  turn: number;
  player: PlayerId;
  kind: LogKind;
  text: string;
  data?: Record<string, unknown>;
}

export type LogKind =
  | 'turnStart'
  | 'turnEnd'
  | 'draw'
  | 'play'
  | 'attack'
  | 'damage'
  | 'heal'
  | 'death'
  | 'fatigue'
  | 'battlecry'
  | 'deathrattle'
  | 'secret'
  | 'countdown'
  | 'gameOver'
  | 'invalid'
  | 'mulligan'
  | 'burn'
  | 'combo';

// ============ 效果函数签名 ============

/**
 * 效果函数：输入当前 state + 上下文，返回修改后的 state（新对象，永远不直接 mutate）
 * 引擎按 EffectHook.effectId 从 registry 查找并调用
 */
export type EffectFn = (
  state: GameState,
  ctx: EffectContext,
) => GameState;

export interface EffectContext {
  /** 效果来源（哪张卡/随从触发的） */
  source: { kind: 'card' | 'minion' | 'hero' | 'event'; id: string; owner: PlayerId };
  /** 玩家选的目标 */
  target?: TargetRef;
  /** EffectHook.params */
  params?: Record<string, unknown>;
}

// ============ 卡组 ============

export interface Deck {
  heroName: string;
  heroPowerId: string;     // 经纪人技能 id（如 'hp_draw1'）
  cards: string[];         // CardDef.id 列表（35 张）
}
