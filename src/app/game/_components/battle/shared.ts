/**
 * Battle 公共常量 / 词典 / 工具函数。
 * 从 Battle.tsx 抽出（D2 剩余拆分的基础）；不包含任何 JSX。
 *
 * 注意：PRESET_MAP 是 module-level 可变对象，Battle.tsx 在 useCardPresets 变化时会 merge 进来，
 * 其他子组件通过 getPreset() 读取。这是原实现（沿用），保持行为不变。
 */

import * as Icons from '@/components/game/GameIcons';
import { CARD_PRESETS, type CardPreset } from '@/data/cardPresets';
import type { CardDef } from '@/game/types';

// ============ defId → preset 映射（含 imagePath） ============

/** 静态初始化的 defId→preset 表。Battle 顶层 useEffect 会把 live presets 合并进来。 */
export const PRESET_MAP: Record<string, CardPreset> = {};
for (const p of CARD_PRESETS) PRESET_MAP[p.id] = p;

export function getPreset(defId: string): CardPreset | undefined {
  return PRESET_MAP[defId];
}

// ============ 稀有度样式 ============

export const RARITY_COLOR: Record<string, string> = {
  N: 'border-slate-400',
  R: 'border-sky-400',
  SR: 'border-fuchsia-400',
  SSR: 'border-amber-400',
};

export const RARITY_GLOW: Record<string, string> = {
  N: '',
  R: 'shadow-[0_0_10px_rgba(56,189,248,0.4)]',
  SR: 'shadow-[0_0_12px_rgba(232,121,249,0.5)]',
  SSR: 'shadow-[0_0_18px_rgba(251,191,36,0.7)]',
};

// ============ 关键字图标（场上角色徽章） ============

export type KwIconInfo = {
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  zh: string;
  color: string;
};

export const KW_ICON: Record<string, KwIconInfo> = {
  taunt:        { Icon: Icons.TauntIcon,        zh: '挡枪',     color: 'text-slate-300' },
  charge:       { Icon: Icons.ChargeIcon,       zh: '紧急通告', color: 'text-yellow-300' },
  rush:         { Icon: Icons.RushIcon,         zh: '试水',     color: 'text-sky-300' },
  windfury:     { Icon: Icons.WindfuryIcon,     zh: '双开',     color: 'text-teal-300' },
  stealth:      { Icon: Icons.StealthIcon,      zh: '潜水',     color: 'text-violet-300' },
  poisonous:    { Icon: Icons.PoisonousIcon,    zh: '封杀',     color: 'text-lime-400' },
  lifesteal:    { Icon: Icons.LifestealIcon,    zh: '吸粉',     color: 'text-rose-300' },
  divineShield: { Icon: Icons.DivineShieldIcon, zh: '粉丝盾',   color: 'text-yellow-200' },
  reborn:       { Icon: Icons.RebornIcon,       zh: '复出',     color: 'text-emerald-300' },
};

// ============ 需要选目标的特殊效果 effectId 集合 ============

export const TARGETED_EFFECTS = new Set([
  'damage_target', 'silence_target', 'transform_target_1_1', 'combo_damage_with_chenze',
]);

// ============ 坐标点 ============

export type Point = { x: number; y: number };

// ============ 术语词典 ============

// 所有关键字命名 MCN 化，不再使用炉石传说术语
export type DictEntry = {
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  name: string;
  desc: string;
};

export const KEYWORD_DICT: Record<string, DictEntry> = {
  taunt:        { Icon: Icons.TauntIcon,        name: '挡枪',     desc: '对方攻击时必须优先攻击带「挡枪」的角色；玩家与其它角色受到保护。' },
  charge:       { Icon: Icons.ChargeIcon,       name: '紧急通告', desc: '登场当回合即可攻击（角色或玩家皆可）。' },
  rush:         { Icon: Icons.RushIcon,         name: '试水',     desc: '登场当回合只能攻击对方角色，不能直接打玩家。' },
  windfury:     { Icon: Icons.WindfuryIcon,     name: '双开',     desc: '每回合可以攻击两次。' },
  stealth:      { Icon: Icons.StealthIcon,      name: '潜水',     desc: '无法被选为攻击或消耗目标，它攻击后失效。' },
  poisonous:    { Icon: Icons.PoisonousIcon,    name: '封杀',     desc: '只要造成一点伤害，对方角色立即死亡（对玩家无额外效果）。' },
  lifesteal:    { Icon: Icons.LifestealIcon,    name: '吸粉',     desc: '造成伤害时，己方玩家恢复等量流量。' },
  divineShield: { Icon: Icons.DivineShieldIcon, name: '粉丝盾',   desc: '第一次受到任何伤害免除，之后失效。' },
  reborn:       { Icon: Icons.RebornIcon,       name: '复出',     desc: '死亡后以 1 流量复活一次（只触发一次）。' },
};

// 描述文案里用中文 tag 标注的机制（卡面描述 【xxx】）
export const MECHANIC_DICT: Record<string, DictEntry> = {
  '登场':   { Icon: Icons.BattlecryIcon,   name: '登场',   desc: '打出这张牌时立即触发一次效果（原「战吼」）。' },
  '退场':   { Icon: Icons.DeathrattleIcon, name: '退场',   desc: '这张牌死亡时触发效果（原「亡语」）。' },
  '联动':   { Icon: Icons.ComboIcon,       name: '联动',   desc: '本回合已经打过其它牌时，这张再打会触发额外效果（原「连招」）。' },
  '重播':   { Icon: Icons.EchoIcon,        name: '重播',   desc: '这张牌本回合内仍留在手牌中，可重复打出；回合结束消失（原「回响」）。' },
  '暗箱':   { Icon: Icons.SecretIcon,      name: '暗箱',   desc: '秘密部署在玩家事件槽，对手不可见；满足条件时自动触发（原「奥秘」）。' },
  '即时':   { Icon: Icons.InstantIcon,     name: '即时',   desc: '道具被使用后立即触发效果，不占装备槽。' },
  '延时':   { Icon: Icons.DelayedIcon,     name: '延时',   desc: '道具带有倒计时，到期后自动结算（场地类）。' },
  '装备时': { Icon: Icons.OnEquipIcon,     name: '装备时', desc: '装备到玩家槽位时立即触发一次效果。' },
  '场地':   { Icon: Icons.LocationIcon,    name: '场地',   desc: '延时事件，在己方事件槽按回合倒数，到 0 自动结算。' },
  // 关键字 tag 同名引用
  '挡枪':     KEYWORD_DICT.taunt,
  '紧急通告': KEYWORD_DICT.charge,
  '试水':     KEYWORD_DICT.rush,
  '双开':     KEYWORD_DICT.windfury,
  '潜水':     KEYWORD_DICT.stealth,
  '封杀':     KEYWORD_DICT.poisonous,
  '吸粉':     KEYWORD_DICT.lifesteal,
  '粉丝盾':   KEYWORD_DICT.divineShield,
  '复出':     KEYWORD_DICT.reborn,
};

// ============ 工具函数 ============

/** 从卡牌描述里提取【xxx】tag（仅保留 MECHANIC_DICT 中已知的） */
export function extractMechanicTags(desc: string | undefined): string[] {
  if (!desc) return [];
  const tags: string[] = [];
  const re = /【([^】]+)】/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(desc)) !== null) {
    const tag = m[1].trim();
    if (!tags.includes(tag) && MECHANIC_DICT[tag]) tags.push(tag);
  }
  return tags;
}

/** 判断某张消耗牌是否需要指定目标 */
export function defNeedsTarget(def: CardDef | undefined): boolean {
  if (!def) return false;
  if (def.type !== 'effect') return false;
  return (def.effects ?? []).some((e) => TARGETED_EFFECTS.has(e.effectId));
}

/** 计算 DOM 元素中心点（屏幕坐标） */
export function rectCenter(el: Element | null | undefined): Point | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
