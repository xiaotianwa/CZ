/**
 * TCG 卡牌效果钩子 (EffectHook)
 *
 * 与前台 engine 的 `src/game/types.ts` EffectHook 保持结构一致，
 * 后台运营在 /tcg-admin/cards 里配置的效果会原样写入 TcgCard.effectHooks，
 * 公开 API (/api/tcg/public/cards) 通过 cardAdapter 把 JSON 反序列化后
 * 透传给前台 Battle 引擎。
 *
 * 为什么不直接 import engine 的类型：
 * - engine 在 src/game/* 带 'use client' + React 依赖，服务端直接 import 会连带拉入
 * - 保持解耦：后台/引擎共享 **结构**，但各自独立维护（变更时显式同步）
 * - 内置技能注册表（EFFECT_PRESETS）是后台 UI 专属，引擎用不到
 */

import { z } from 'zod';

// ==================== 类型定义（与 engine/types.ts EffectHook 兼容） ====================

export type EffectTrigger =
  | 'battlecry'       // 登场：打出角色/道具/装备时立即（旧称「战吼」）
  | 'deathrattle'     // 退场：人物死亡时（旧称「亡语」）
  | 'onEquip'         // 装备上身时（装备卡专用）
  | 'onAttack'        // 己方本卡攻击后
  | 'turnStart'       // 回合开始（拥有者）
  | 'turnEnd'         // 回合结束（拥有者）
  | 'onCountdown0'    // 场地倒计时归零（事件卡专用）
  | 'onSecretTrigger' // 暗箱条件满足（旧称「奥秘」，事件卡专用）
  | 'aura';           // 粉圈光环：在场时持续生效

export const EFFECT_TRIGGERS: readonly EffectTrigger[] = [
  'battlecry',
  'deathrattle',
  'onEquip',
  'onAttack',
  'turnStart',
  'turnEnd',
  'onCountdown0',
  'onSecretTrigger',
  'aura',
] as const;

/** UI 下拉的中文 label（MCN 化术语，遵守对战规则.md §7.1） */
export const TRIGGER_LABELS: Record<EffectTrigger, string> = {
  battlecry: '登场',
  deathrattle: '退场',
  onEquip: '装备时',
  onAttack: '攻击后',
  turnStart: '回合开始',
  turnEnd: '回合结束',
  onCountdown0: '倒计时归零',
  onSecretTrigger: '暗箱触发',
  aura: '粉圈光环（持续）',
};

/** 触发时机说明 */
export const TRIGGER_HINTS: Record<EffectTrigger, string> = {
  battlecry: '角色/道具/装备打出时立即生效，最常用',
  deathrattle: '该人物被击杀时触发，适合保本效果',
  onEquip: '装备卡穿上时触发（装备卡专用）',
  onAttack: '该人物每次攻击结算后触发',
  turnStart: '拥有者的回合开始时触发',
  turnEnd: '拥有者的回合结束时触发',
  onCountdown0: '事件卡倒计时归零时触发（事件卡专用）',
  onSecretTrigger: '暗箱触发条件达成时（事件-暗箱卡专用）',
  aura: '在场时每次引擎结算都会评估（慎用）',
};

/** 效果钩子：一张卡可挂 N 个钩子（不同 trigger 或同 trigger 叠加效果） */
export interface CardEffectHook {
  /** 触发时机 */
  trigger: EffectTrigger;
  /** 已在 engine effects registry 注册的函数 id（如 'draw_cards', 'heal_self_hero'） */
  effectId: string;
  /** 效果参数（由 effect 实现自行解释，常见 amount / atk / hp） */
  params?: Record<string, number | string | boolean>;
}

// ==================== 内置技能注册表（后台 UI 下拉源） ====================

/** 效果需要的参数类型 */
export interface EffectParamSpec {
  key: string;
  label: string;
  type: 'number' | 'string';
  default?: number | string;
  min?: number;
  max?: number;
  hint?: string;
}

/** 单个 effectId 的元信息（UI 展示 + 参数提示） */
export interface EffectPreset {
  id: string;
  label: string;
  description: string;
  /** 默认推荐 trigger */
  defaultTrigger: EffectTrigger;
  /** 需要玩家选目标？（对战 UI 会让玩家点击目标） */
  needsTarget: boolean;
  /** 参数列表（UI 生成输入框） */
  params: EffectParamSpec[];
  /** 分类，用于 UI 分组 */
  category: '伤害' | '治疗' | '抽牌' | 'Buff/Debuff' | '控场' | '其他';
}

/**
 * 与 src/game/effects.ts registerEffect(...) 注册的 id 一一对应。
 * 未在此处列出的 effectId 依然可由开发者手输（expert mode），但 UI 无提示。
 */
export const EFFECT_PRESETS: EffectPreset[] = [
  // ===== 伤害 =====
  {
    id: 'damage_target',
    label: '对目标造成伤害',
    description: '对玩家选中的单个人物/英雄造成 N 点伤害',
    defaultTrigger: 'battlecry',
    needsTarget: true,
    category: '伤害',
    params: [{ key: 'amount', label: '伤害', type: 'number', default: 2, min: 1, max: 99 }],
  },
  {
    id: 'damage_enemy_hero',
    label: '对敌方经纪人造成伤害',
    description: '直接打脸：对敌方英雄造成 N 点伤害',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '伤害',
    params: [{ key: 'amount', label: '伤害', type: 'number', default: 2, min: 1, max: 99 }],
  },
  {
    id: 'damage_all_enemy_minions',
    label: 'AOE：对敌方所有人物',
    description: '对敌方全场人物造成 N 点伤害',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '伤害',
    params: [{ key: 'amount', label: '伤害', type: 'number', default: 1, min: 1, max: 99 }],
  },
  {
    id: 'damage_all_minions',
    label: 'AOE：对全场所有人物',
    description: '对双方所有人物造成 N 点伤害（含己方）',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '伤害',
    params: [{ key: 'amount', label: '伤害', type: 'number', default: 2, min: 1, max: 99 }],
  },

  // ===== 治疗 =====
  {
    id: 'heal_self_hero',
    label: '回己方经纪人流量',
    description: '给己方英雄回 N 点流量（血）',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '治疗',
    params: [{ key: 'amount', label: '回血', type: 'number', default: 2, min: 1, max: 99 }],
  },
  {
    id: 'heal_target_minion',
    label: '治疗目标人物',
    description: '给玩家选中的单个人物回 N 点流量（不可超过满血）',
    defaultTrigger: 'battlecry',
    needsTarget: true,
    category: '治疗',
    params: [{ key: 'amount', label: '回血', type: 'number', default: 3, min: 1, max: 99 }],
  },
  {
    id: 'heal_all_friendly_minions',
    label: 'AOE：回己方全体人物',
    description: '回己方战场所有人物 N 点流量',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '治疗',
    params: [{ key: 'amount', label: '回血', type: 'number', default: 2, min: 1, max: 99 }],
  },
  {
    id: 'heal_self_hero_and_minions',
    label: '己方整体回血（经纪人 + 所有人物）',
    description: '同时为己方经纪人和所有己方人物回 N 点流量',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '治疗',
    params: [{ key: 'amount', label: '回血', type: 'number', default: 2, min: 1, max: 99 }],
  },

  // ===== 抽牌 =====
  {
    id: 'draw_cards',
    label: '抽牌',
    description: '抽 N 张牌到手牌',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '抽牌',
    params: [{ key: 'amount', label: '张数', type: 'number', default: 1, min: 1, max: 10 }],
  },
  {
    id: 'draw_and_reduce_cost',
    label: '抽牌并降 cost',
    description: '抽 N 张，并为这 N 张新抽的手牌 cost -X（下限 0）',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '抽牌',
    params: [
      { key: 'amount', label: '张数', type: 'number', default: 2, min: 1, max: 10 },
      { key: 'reduce', label: 'cost -', type: 'number', default: 1, min: 1, max: 5 },
    ],
  },
  {
    id: 'both_draw_cards',
    label: '双方各抽 N 张',
    description: '己方与对手各抽 N 张牌',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '抽牌',
    params: [{ key: 'amount', label: '张数', type: 'number', default: 1, min: 1, max: 5 }],
  },
  {
    id: 'discard_random_enemy_hand',
    label: '随机弃对方手牌',
    description: '随机弃对方 N 张手牌（进入对方墓地）',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '抽牌',
    params: [{ key: 'amount', label: '张数', type: 'number', default: 1, min: 1, max: 5 }],
  },

  // ===== Buff / Debuff =====
  {
    id: 'buff_all_friendly',
    label: '己方全体 +⚔/+❤（永久）',
    description: '给己方所有人物永久 +atk/+hp',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: 'Buff/Debuff',
    params: [
      { key: 'atk', label: '攻击加成', type: 'number', default: 1, min: 0, max: 10 },
      { key: 'hp', label: '生命加成', type: 'number', default: 1, min: 0, max: 10 },
    ],
  },
  {
    id: 'buff_all_friendly_attack_turn',
    label: '己方全体本回合 +⚔',
    description: '给己方所有人物本回合 +atk',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: 'Buff/Debuff',
    params: [{ key: 'atk', label: '攻击加成', type: 'number', default: 1, min: 1, max: 10 }],
  },
  {
    id: 'debuff_all_enemy_attack',
    label: '对方全体 -⚔',
    description: '敌方所有人物 -atk',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: 'Buff/Debuff',
    params: [{ key: 'atk', label: '削减量', type: 'number', default: 1, min: 1, max: 10 }],
  },
  {
    id: 'restore_hero_mana_turn',
    label: '己方本回合 +能量',
    description: '立即获得 N 点热度（能量）',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: 'Buff/Debuff',
    params: [{ key: 'amount', label: '能量', type: 'number', default: 2, min: 1, max: 10 }],
  },

  // ===== 控场 =====
  {
    id: 'silence_target',
    label: '沉默目标',
    description: '目标人物清除所有关键字和效果',
    defaultTrigger: 'battlecry',
    needsTarget: true,
    category: '控场',
    params: [],
  },
  {
    id: 'transform_target_1_1',
    label: '变身目标为 1/1',
    description: '目标人物变为 1/1 无技能',
    defaultTrigger: 'battlecry',
    needsTarget: true,
    category: '控场',
    params: [],
  },
  {
    id: 'freeze_target_attacks_this_turn',
    label: '冻结目标本回合',
    description: '目标人物本回合无法攻击',
    defaultTrigger: 'onSecretTrigger',
    needsTarget: true,
    category: '控场',
    params: [],
  },
  {
    id: 'destroy_random_enemy_event',
    label: '摧毁对方随机事件',
    description: '摧毁敌方 1 张随机事件卡',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '控场',
    params: [],
  },
  {
    id: 'destroy_enemy_weapon',
    label: '摧毁对方装备',
    description: '摧毁敌方装备卡',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '控场',
    params: [],
  },
  {
    id: 'return_target_to_hand',
    label: '弹回目标到手牌',
    description: '将选中的人物弹回其主人手牌（手牌已满则销毁）',
    defaultTrigger: 'battlecry',
    needsTarget: true,
    category: '控场',
    params: [],
  },
  {
    id: 'give_target_divine_shield',
    label: '给目标加粉丝盾',
    description: '为选中的人物附加一次粉丝盾（抵消下一次伤害）',
    defaultTrigger: 'battlecry',
    needsTarget: true,
    category: '控场',
    params: [],
  },
  {
    id: 'damage_full_health_target_bonus',
    label: '满血追击：对目标伤害 + 满血额外',
    description: '对目标造成 base 伤害；若目标处于满血则额外 +bonus',
    defaultTrigger: 'battlecry',
    needsTarget: true,
    category: '伤害',
    params: [
      { key: 'base', label: '基础伤害', type: 'number', default: 3, min: 1, max: 99 },
      { key: 'bonus', label: '满血追加', type: 'number', default: 3, min: 0, max: 99 },
    ],
  },
  {
    id: 'both_heroes_heal',
    label: '双方经纪人各回 N 流量',
    description: '双方英雄各回 N 点流量（用于节奏调节 / 和平场地卡）',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '治疗',
    params: [{ key: 'amount', label: '回血', type: 'number', default: 2, min: 1, max: 20 }],
  },
  {
    id: 'resurrect_last_friendly_character',
    label: '复活己方最近角色（1/1）',
    description: '从己方墓地倒序找第一张角色复活为 1/1（沉默、召唤疲劳）',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '其他',
    params: [],
  },

  // ===== 其他 =====
  {
    id: 'copy_random_friendly_minion',
    label: '复制己方随机人物',
    description: '复制己方一个人物（变为 1/1 入场）',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '其他',
    params: [],
  },
  {
    id: 'discover_effect',
    label: '发现：抽 1 张',
    description: '临时简化为抽 1 张（正式发现待实现）',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '其他',
    params: [],
  },

  // ===== 内置联动（与具体卡绑定；运营通常不手工配，仅保留 UI 提示避免"未知效果"警告） =====
  {
    id: 'chenze_partner_combo',
    label: '陈泽联动：伙伴互 buff + 抽牌',
    description: '【与 C01/C14 绑定】同时在场触发：双方 +atk/+hp（本卡参数），再抽 draw 张',
    defaultTrigger: 'battlecry',
    needsTarget: false,
    category: '其他',
    params: [
      { key: 'partnerId', label: '伙伴卡 ID', type: 'string', default: 'C14' },
      { key: 'partnerName', label: '伙伴名', type: 'string', default: '主播·陈泽' },
      { key: 'selfName', label: '本卡名', type: 'string', default: '搭档小助理' },
      { key: 'atk', label: '攻击加成', type: 'number', default: 2, min: 0, max: 10 },
      { key: 'hp', label: '生命加成', type: 'number', default: 0, min: 0, max: 10 },
      { key: 'draw', label: '抽牌数', type: 'number', default: 1, min: 0, max: 5 },
    ],
  },
  {
    id: 'combo_damage_with_chenze',
    label: '连击：对目标伤害 + 有陈泽时增量',
    description: '对目标造成 base 伤害；若场上存在陈泽（C14）则额外 +bonus',
    defaultTrigger: 'battlecry',
    needsTarget: true,
    category: '伤害',
    params: [
      { key: 'base', label: '基础伤害', type: 'number', default: 5, min: 1, max: 99 },
      { key: 'bonus', label: '有陈泽时追加', type: 'number', default: 3, min: 0, max: 99 },
    ],
  },
  {
    id: 'silence_trigger_minion',
    label: '沉默触发者（暗箱专用）',
    description: '暗箱触发：对触发条件涉及的人物沉默（通常由 V04 塑料奥秘使用）',
    defaultTrigger: 'onSecretTrigger',
    needsTarget: false,
    category: '控场',
    params: [],
  },
  {
    id: 'crisis_pr',
    label: '危机公关（V06 专用）',
    description: '暗箱触发：己方玩家回 5 流量 + 抽 2 张牌（硬编码数值，无参数）',
    defaultTrigger: 'onSecretTrigger',
    needsTarget: false,
    category: '其他',
    params: [],
  },
];

/** 快速查字典 */
export const EFFECT_PRESET_MAP: Record<string, EffectPreset> = Object.fromEntries(
  EFFECT_PRESETS.map((p) => [p.id, p]),
);

// ==================== zod 校验 ====================

const paramsSchema = z.record(
  z.string(),
  z.union([z.number(), z.string(), z.boolean()]),
);

export const effectHookSchema = z.object({
  trigger: z.enum([
    'battlecry',
    'deathrattle',
    'onEquip',
    'onAttack',
    'turnStart',
    'turnEnd',
    'onCountdown0',
    'onSecretTrigger',
    'aura',
  ]),
  effectId: z.string().trim().min(1).max(64),
  params: paramsSchema.optional(),
}) satisfies z.ZodType<CardEffectHook>;

export const effectHooksArraySchema = z.array(effectHookSchema).max(10);

// ==================== 工具函数 ====================

/** 解析 DB JSON string → CardEffectHook[]（安全降级：异常返回空数组） */
export function parseEffectHooks(json: string | null | undefined): CardEffectHook[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    const result = effectHooksArraySchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/** 对 effectId 做白名单校验（开发者 expert mode 允许手输，但运营 UI 内只能选注册表里的） */
export function isKnownEffectId(id: string): boolean {
  return id in EFFECT_PRESET_MAP;
}

/** 按 category 分组用于 UI */
export function groupPresetsByCategory(): Record<string, EffectPreset[]> {
  return EFFECT_PRESETS.reduce(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    },
    {} as Record<string, EffectPreset[]>,
  );
}

/** 从 preset 构造默认的 EffectHook（带默认参数） */
export function createHookFromPreset(preset: EffectPreset): CardEffectHook {
  const params: Record<string, number | string | boolean> = {};
  for (const p of preset.params) {
    if (p.default !== undefined) params[p.key] = p.default;
  }
  return {
    trigger: preset.defaultTrigger,
    effectId: preset.id,
    params: Object.keys(params).length > 0 ? params : undefined,
  };
}
