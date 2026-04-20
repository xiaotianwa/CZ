// 卡牌联动（CardSynergy）运行时触发
// ------------------------------------------------------------
// 设计原则（MVP）：
// 1. 触发点仅在"新单位加入场面的瞬间"调用，保证同一联动只触发一次：
//    - summonMinion 末尾  → 检查 both_in_play
//    - equipItem   末尾  → 检查 partner_equipped + both_in_play（装备也算"伙伴上场"）
// 2. 双向查询：任意一方（host / partner）配置都会命中
//    - 约定：同一对伙伴只需一方配置（synergy.ts 注释已说明）
// 3. duration 首版统一按 permanent 实现
//    - 'turn' / 'while_paired' 留到后续接入 minion 临时增益系统
// 4. scope 解释：self / partner / both / all_allies
//    - 非 minion 的 host/partner（装备卡）不吃数值加成，只会计数为场上"在位"单位

import type { CardSynergy, CardSynergyEffect } from '@/lib/tcg/synergy';
import type { GameState, Keyword, PlayerId } from './types';
import { CARD_DB } from './engine';
import {
  addLog,
  dealDamage,
  drawCards,
  enemyOf,
  healHero,
  updateMinion,
} from './engine-utils';

/** 场上参与联动的实体指针 */
interface FieldEntity {
  kind: 'minion' | 'equipment';
  defId: string;
  instanceId: string;
}

/**
 * 新 entity 加入场面时调用。扫描 owner 场上所有单位的 synergies[]，
 * 若某条联动命中（host 与 partner 都在场 + trigger 时机匹配），立即执行。
 *
 * @param newEntity 刚登场的单位（新 minion 或新 equipment）
 */
export function triggerSynergiesOnEntry(
  state: GameState,
  owner: PlayerId,
  newEntity: FieldEntity,
): GameState {
  const player = state.players[owner];

  // 收集 owner 场上所有在位实体（含新登场者——因为新实体可能是联动 host）
  const fieldEntities: FieldEntity[] = [
    ...player.minions.map((m) => ({
      kind: 'minion' as const,
      defId: m.defId,
      instanceId: m.instanceId,
    })),
  ];
  if (player.equipped) {
    fieldEntities.push({
      kind: 'equipment',
      defId: player.equipped.defId,
      instanceId: player.equipped.instanceId,
    });
  }

  // 若新 entity 还没进 fieldEntities（理论上 summonMinion/equipItem 调用前已入场），兜底补上
  if (!fieldEntities.some((e) => e.instanceId === newEntity.instanceId)) {
    fieldEntities.push(newEntity);
  }

  // 触发时机判定：
  // - 新 entity 是 equipment → 本次检查 partner_equipped + both_in_play
  // - 新 entity 是 minion    → 本次检查 both_in_play
  const acceptedTriggers: Set<CardSynergy['trigger']> =
    newEntity.kind === 'equipment'
      ? new Set<CardSynergy['trigger']>(['partner_equipped', 'both_in_play'])
      : new Set<CardSynergy['trigger']>(['both_in_play']);

  let s = state;

  for (const host of fieldEntities) {
    const def = CARD_DB.get(host.defId);
    const synergies = def?.synergies;
    if (!synergies || synergies.length === 0) continue;

    // 只考察涉及"新 entity"的联动：new 是 host，或 new 在 host.partners 中
    const isHostNew = host.instanceId === newEntity.instanceId;

    for (const syn of synergies) {
      if (!acceptedTriggers.has(syn.trigger)) continue;

      // 找到场上满足 partners 的其他实体（排除 host 自身 instance）
      const matchedPartners = fieldEntities.filter(
        (f) => f.instanceId !== host.instanceId && syn.partners.includes(f.defId),
      );
      if (matchedPartners.length === 0) continue;

      // 条件：new entity 必须参与本次联动（host 是新 或 new 在 matchedPartners 中）
      const isNewPartner = matchedPartners.some((p) => p.instanceId === newEntity.instanceId);
      if (!isHostNew && !isNewPartner) continue;

      // partner_equipped 特殊约束：必须至少有一个 matchedPartner 是装备
      if (syn.trigger === 'partner_equipped') {
        const anyEquip = matchedPartners.some((p) => p.kind === 'equipment') ||
          host.kind === 'equipment';
        if (!anyEquip) continue;
      }

      // 触发日志
      s = addLog(s, {
        turn: s.turn,
        player: owner,
        kind: 'combo',
        text: `${def?.name ?? host.defId} 联动触发：${syn.name}`,
      });

      // 逐个效果应用
      for (const eff of syn.effects) {
        s = applySynergyEffect(s, owner, host, matchedPartners, syn.scope, eff);
      }
    }
  }

  return s;
}

/** 将一条联动效果应用到目标身上 */
function applySynergyEffect(
  state: GameState,
  owner: PlayerId,
  host: FieldEntity,
  partners: FieldEntity[],
  scope: CardSynergy['scope'],
  effect: CardSynergyEffect,
): GameState {
  // 收集受效目标（minion instance 列表）
  const targetMinionIds: string[] = [];
  const addIfMinion = (e: FieldEntity) => {
    if (e.kind === 'minion') targetMinionIds.push(e.instanceId);
  };

  if (scope === 'self' || scope === 'both') addIfMinion(host);
  if (scope === 'partner' || scope === 'both') partners.forEach(addIfMinion);
  if (scope === 'all_allies') {
    targetMinionIds.push(...state.players[owner].minions.map((m) => m.instanceId));
  }

  let s = state;
  const amt = effect.amount ?? 0;

  switch (effect.kind) {
    case 'attack_buff':
      for (const id of targetMinionIds) {
        s = updateMinion(s, owner, id, (m) => ({ ...m, attack: m.attack + amt }));
      }
      break;

    case 'health_buff':
      for (const id of targetMinionIds) {
        s = updateMinion(s, owner, id, (m) => ({
          ...m,
          maxHealth: m.maxHealth + amt,
          health: m.health + amt,
        }));
      }
      break;

    case 'keyword_grant':
      if (effect.keyword) {
        const kw = effect.keyword as Keyword;
        for (const id of targetMinionIds) {
          s = updateMinion(s, owner, id, (m) => {
            const next = new Set(m.keywords);
            next.add(kw);
            return { ...m, keywords: next };
          });
        }
      }
      break;

    case 'draw_card':
      s = drawCards(s, owner, Math.max(1, amt));
      break;

    case 'heal':
      s = healHero(s, owner, Math.max(0, amt));
      break;

    case 'damage_enemy':
      s = dealDamage(
        s,
        { kind: 'hero', player: enemyOf(owner) },
        Math.max(0, amt),
        { kind: 'hero', id: `synergy:${host.instanceId}`, owner },
      );
      break;

    case 'cost_reduce':
    case 'shield':
      // MVP：登记日志，留待后续（需要 minion 临时增益或手牌增益系统）
      s = addLog(s, {
        turn: s.turn,
        player: owner,
        kind: 'combo',
        text: `联动效果 ${effect.kind} 暂未实装`,
      });
      break;

    default: {
      // exhaustive check
      const _exhaustive: never = effect.kind;
      void _exhaustive;
    }
  }

  return s;
}
