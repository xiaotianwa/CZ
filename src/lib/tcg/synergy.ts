/**
 * 卡牌联动（Card Synergy）数据模型 + 校验
 *
 * 使用场景：
 *   - 人物 + 专属武器/道具：`partners=['I03']`, trigger='partner_equipped', 数值加成
 *   - 人物 + 另一人物同时在场：`partners=['C05']`, trigger='both_in_play'
 *   - 人物触发某种"伙伴在手"条件：trigger='partner_in_hand'
 *
 * 数据位置：
 *   - 存储：TcgCard.synergies（JSON string）
 *   - 前台：Battle engine 出场 / 装备 / 抽牌时检查 owner 卡的 synergies[] 是否触发
 *
 * 运营建议：
 *   - 联动只配在"主角 / 人物卡"上；武器/道具不配，避免双向维护
 *   - 同一对伙伴只需一方配置即可（引擎双向查询）
 */
import { z } from 'zod';

// -------------------- 枚举 --------------------

export const SYNERGY_TRIGGERS = [
  { value: 'both_in_play', label: '双方同时在场', hint: '伙伴角色 / 装备已上场时触发' },
  { value: 'partner_equipped', label: '伙伴装备已装上', hint: '专属武器/道具装备到本人物时触发' },
  { value: 'partner_in_hand', label: '伙伴在手牌', hint: '伙伴卡在手牌中时预生效（提示型）' },
] as const;

export const SYNERGY_SCOPES = [
  { value: 'self', label: '自己', hint: '效果作用在本人物' },
  { value: 'partner', label: '伙伴', hint: '效果作用在伙伴卡' },
  { value: 'both', label: '双方', hint: '自己和伙伴都受效果' },
  { value: 'all_allies', label: '己方全体', hint: '己方所有角色受效果' },
] as const;

export const SYNERGY_EFFECT_KINDS = [
  { value: 'attack_buff', label: '攻击 +N', needsAmount: true, needsKeyword: false },
  { value: 'health_buff', label: '生命 +N', needsAmount: true, needsKeyword: false },
  { value: 'cost_reduce', label: '费用 -N（对应卡）', needsAmount: true, needsKeyword: false },
  { value: 'keyword_grant', label: '获得关键字', needsAmount: false, needsKeyword: true },
  { value: 'draw_card', label: '抽 N 张牌', needsAmount: true, needsKeyword: false },
  { value: 'heal', label: '治疗 N', needsAmount: true, needsKeyword: false },
  { value: 'damage_enemy', label: '对敌方 N 伤害', needsAmount: true, needsKeyword: false },
  { value: 'shield', label: '护盾 N', needsAmount: true, needsKeyword: false },
] as const;

export const SYNERGY_DURATIONS = [
  { value: 'permanent', label: '永久', hint: '一次触发后永久生效' },
  { value: 'turn', label: '本回合', hint: '仅当前回合生效' },
  { value: 'while_paired', label: '联动期间', hint: '伙伴离场即失效' },
] as const;

// 类型别名（string literal union）
export type SynergyTrigger = typeof SYNERGY_TRIGGERS[number]['value'];
export type SynergyScope = typeof SYNERGY_SCOPES[number]['value'];
export type SynergyEffectKind = typeof SYNERGY_EFFECT_KINDS[number]['value'];
export type SynergyDuration = typeof SYNERGY_DURATIONS[number]['value'];

// -------------------- 数据结构 --------------------

export interface CardSynergyEffect {
  kind: SynergyEffectKind;
  amount?: number;
  keyword?: string;
  duration: SynergyDuration;
}

export interface CardSynergy {
  id: string;            // 本条联动唯一 ID（卡内，用于 React key / 删除）
  name: string;          // 联动名："陈泽之锚"
  description: string;   // 前台 tooltip 文案
  partners: string[];    // 伙伴卡 ID 数组（至少 1 个）
  trigger: SynergyTrigger;
  scope: SynergyScope;
  effects: CardSynergyEffect[];
}

// -------------------- zod 校验 --------------------

const triggerValues = SYNERGY_TRIGGERS.map((t) => t.value) as [SynergyTrigger, ...SynergyTrigger[]];
const scopeValues = SYNERGY_SCOPES.map((s) => s.value) as [SynergyScope, ...SynergyScope[]];
const kindValues = SYNERGY_EFFECT_KINDS.map((e) => e.value) as [SynergyEffectKind, ...SynergyEffectKind[]];
const durationValues = SYNERGY_DURATIONS.map((d) => d.value) as [SynergyDuration, ...SynergyDuration[]];

export const effectSchema = z.object({
  kind: z.enum(kindValues),
  amount: z.number().int().min(-99).max(99).optional(),
  keyword: z.string().min(1).max(32).optional(),
  duration: z.enum(durationValues),
});

export const synergySchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1, '联动名必填').max(40),
  description: z.string().max(200).default(''),
  partners: z.array(z.string().regex(/^[A-Z]\d{2,3}$/, '卡牌 ID 格式应为 C01 / I08 等')).min(1, '至少 1 个伙伴卡'),
  trigger: z.enum(triggerValues),
  scope: z.enum(scopeValues),
  effects: z.array(effectSchema).min(1, '至少 1 条效果').max(5, '单条联动最多 5 条效果'),
});

export const synergiesArraySchema = z.array(synergySchema).max(10, '单张卡最多 10 条联动');

// -------------------- 工具 --------------------

/** 从数据库 JSON 字符串安全解析 */
export function parseSynergies(raw: string | null | undefined): CardSynergy[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const result = synergiesArraySchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/** 序列化用于写库 */
export function stringifySynergies(list: CardSynergy[]): string {
  return JSON.stringify(list);
}

/** 生成新联动的默认值 */
export function createEmptySynergy(): CardSynergy {
  return {
    id: `syn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    description: '',
    partners: [],
    trigger: 'both_in_play',
    scope: 'self',
    effects: [{ kind: 'attack_buff', amount: 1, duration: 'while_paired' }],
  };
}

/** 生成新效果的默认值 */
export function createEmptyEffect(): CardSynergyEffect {
  return { kind: 'attack_buff', amount: 1, duration: 'while_paired' };
}

/** 效果的简短摘要（列表展示用） */
export function describeEffect(e: CardSynergyEffect): string {
  const def = SYNERGY_EFFECT_KINDS.find((x) => x.value === e.kind);
  const label = def?.label ?? e.kind;
  if (e.kind === 'keyword_grant') return `获得【${e.keyword || '?'}】`;
  if (e.kind === 'cost_reduce') return `费用 -${e.amount ?? 0}`;
  if (label.includes('N')) return label.replace('N', String(e.amount ?? 0));
  return label;
}
