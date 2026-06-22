export type HeroPowerKind = 'draw' | 'heal' | 'summon';

export interface HeroPowerDef {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  cost: number;
  kind: HeroPowerKind;
  amount?: number;
  tokenDefId?: string;
}

const DEFAULT_HERO_POWER_ID = 'hp_draw1';

export const HERO_POWER_DEFS: Record<string, HeroPowerDef> = {
  hp_draw1: {
    id: 'hp_draw1',
    name: '补充手牌',
    shortLabel: '抽牌',
    description: '抽 1 张牌。适合快攻和中速卡组补资源。',
    cost: 2,
    kind: 'draw',
    amount: 1,
  },
  hp_heal2: {
    id: 'hp_heal2',
    name: '稳住节奏',
    shortLabel: '治疗',
    description: '己方玩家恢复 2 点流量。适合防守和控制卡组拖后期。',
    cost: 2,
    kind: 'heal',
    amount: 2,
  },
  hp_recruit: {
    id: 'hp_recruit',
    name: '召集应援',
    shortLabel: '召唤',
    description: '召唤 1 个 1/1 的「应援新人」。战场满时不能使用。',
    cost: 2,
    kind: 'summon',
    tokenDefId: 'C15',
  },
};

export function getHeroPowerDef(id: string | undefined | null): HeroPowerDef {
  return HERO_POWER_DEFS[id ?? DEFAULT_HERO_POWER_ID] ?? HERO_POWER_DEFS[DEFAULT_HERO_POWER_ID];
}
