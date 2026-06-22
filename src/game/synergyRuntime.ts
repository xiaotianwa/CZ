// CardSynergy runtime.
// Triggered when a minion/equipment enters the board and completes a configured pair.

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
  updatePlayer,
} from './engine-utils';

interface FieldEntity {
  kind: 'minion' | 'equipment';
  defId: string;
  instanceId: string;
}

interface SynergyTriggerKeyParts {
  owner: PlayerId;
  trigger: CardSynergy['trigger'];
  synergyId: string;
  firstInstanceId: string;
  secondInstanceId: string;
}

const SYNERGY_KEY_PREFIX = 'syn';
const SYNERGY_KEY_SEPARATOR = '|';

function makeSynergyTriggerKey(
  owner: PlayerId,
  syn: CardSynergy,
  host: FieldEntity,
  partner: FieldEntity,
): string {
  const [firstInstanceId, secondInstanceId] = [host.instanceId, partner.instanceId].sort();
  return [
    SYNERGY_KEY_PREFIX,
    owner,
    syn.trigger,
    syn.id,
    firstInstanceId,
    secondInstanceId,
  ].join(SYNERGY_KEY_SEPARATOR);
}

function parseSynergyTriggerKey(key: string): SynergyTriggerKeyParts | null {
  const parts = key.split(SYNERGY_KEY_SEPARATOR);
  if (parts.length !== 6 || parts[0] !== SYNERGY_KEY_PREFIX) return null;
  const owner = parts[1] === 'P1' || parts[1] === 'P2' ? parts[1] : null;
  if (!owner) return null;

  return {
    owner,
    trigger: parts[2] as CardSynergy['trigger'],
    synergyId: parts[3],
    firstInstanceId: parts[4],
    secondInstanceId: parts[5],
  };
}

function pruneTriggeredSynergies(
  state: GameState,
  owner: PlayerId,
  fieldEntities: FieldEntity[],
): GameState {
  const currentKeys = state.triggeredSynergies ?? [];
  if (currentKeys.length === 0) return state;

  const liveInstanceIds = new Set(fieldEntities.map((entity) => entity.instanceId));
  const nextKeys = currentKeys.filter((key) => {
    const parsed = parseSynergyTriggerKey(key);
    if (!parsed) return false;
    if (parsed.owner !== owner) return true;
    return liveInstanceIds.has(parsed.firstInstanceId) && liveInstanceIds.has(parsed.secondInstanceId);
  });

  return nextKeys.length === currentKeys.length ? state : { ...state, triggeredSynergies: nextKeys };
}

function hasSynergyTriggered(state: GameState, key: string): boolean {
  return (state.triggeredSynergies ?? []).includes(key);
}

function markSynergyTriggered(state: GameState, key: string): GameState {
  if (hasSynergyTriggered(state, key)) return state;
  return { ...state, triggeredSynergies: [...(state.triggeredSynergies ?? []), key] };
}

export function triggerSynergiesOnEntry(
  state: GameState,
  owner: PlayerId,
  newEntity: FieldEntity,
): GameState {
  const player = state.players[owner];
  const fieldEntities: FieldEntity[] = [
    ...player.minions.map((minion) => ({
      kind: 'minion' as const,
      defId: minion.defId,
      instanceId: minion.instanceId,
    })),
  ];

  if (player.equipped) {
    fieldEntities.push({
      kind: 'equipment',
      defId: player.equipped.defId,
      instanceId: player.equipped.instanceId,
    });
  }

  if (!fieldEntities.some((entity) => entity.instanceId === newEntity.instanceId)) {
    fieldEntities.push(newEntity);
  }

  const acceptedTriggers: Set<CardSynergy['trigger']> =
    newEntity.kind === 'equipment'
      ? new Set<CardSynergy['trigger']>(['partner_equipped', 'both_in_play'])
      : new Set<CardSynergy['trigger']>(['both_in_play']);

  let s = pruneTriggeredSynergies(state, owner, fieldEntities);

  for (const host of fieldEntities) {
    const def = CARD_DB.get(host.defId);
    const synergies = def?.synergies;
    if (!synergies || synergies.length === 0) continue;

    const isHostNew = host.instanceId === newEntity.instanceId;

    for (const syn of synergies) {
      if (!acceptedTriggers.has(syn.trigger)) continue;

      const matchedPartners = fieldEntities.filter(
        (entity) => entity.instanceId !== host.instanceId && syn.partners.includes(entity.defId),
      );

      for (const partner of matchedPartners) {
        const isNewPartner = partner.instanceId === newEntity.instanceId;
        if (!isHostNew && !isNewPartner) continue;

        if (syn.trigger === 'partner_equipped' && host.kind !== 'equipment' && partner.kind !== 'equipment') {
          continue;
        }

        const triggerKey = makeSynergyTriggerKey(owner, syn, host, partner);
        if (hasSynergyTriggered(s, triggerKey)) continue;

        s = markSynergyTriggered(s, triggerKey);
        s = addLog(s, {
          turn: s.turn,
          player: owner,
          kind: 'combo',
          text: `${def?.name ?? host.defId} 联动触发：${syn.name}`,
        });

        for (const effect of syn.effects) {
          s = applySynergyEffect(s, owner, host, [partner], syn.scope, effect);
        }
      }
    }
  }

  return s;
}

function collectTargetMinionIds(
  state: GameState,
  owner: PlayerId,
  host: FieldEntity,
  partners: FieldEntity[],
  scope: CardSynergy['scope'],
): string[] {
  const targetMinionIds: string[] = [];
  const addIfMinion = (entity: FieldEntity): void => {
    if (entity.kind === 'minion') targetMinionIds.push(entity.instanceId);
  };

  if (scope === 'self' || scope === 'both') addIfMinion(host);
  if (scope === 'partner' || scope === 'both') partners.forEach(addIfMinion);
  if (scope === 'all_allies') {
    targetMinionIds.push(...state.players[owner].minions.map((minion) => minion.instanceId));
  }

  return targetMinionIds;
}

function resolveCostTargetDefIds(
  host: FieldEntity,
  partners: FieldEntity[],
  scope: CardSynergy['scope'],
): Set<string> | null {
  if (scope === 'all_allies') return null;

  const defIds = new Set<string>();
  if (scope === 'self' || scope === 'both') defIds.add(host.defId);
  if (scope === 'partner' || scope === 'both') {
    partners.forEach((partner) => defIds.add(partner.defId));
  }
  return defIds;
}

function applySynergyEffect(
  state: GameState,
  owner: PlayerId,
  host: FieldEntity,
  partners: FieldEntity[],
  scope: CardSynergy['scope'],
  effect: CardSynergyEffect,
): GameState {
  const targetMinionIds = collectTargetMinionIds(state, owner, host, partners, scope);
  let s = state;
  const amount = effect.amount ?? 0;

  switch (effect.kind) {
    case 'attack_buff':
      for (const id of targetMinionIds) {
        s = updateMinion(s, owner, id, (minion) => ({ ...minion, attack: minion.attack + amount }));
      }
      break;

    case 'health_buff':
      for (const id of targetMinionIds) {
        s = updateMinion(s, owner, id, (minion) => ({
          ...minion,
          maxHealth: minion.maxHealth + amount,
          health: minion.health + amount,
        }));
      }
      break;

    case 'keyword_grant':
      if (effect.keyword) {
        const keyword = effect.keyword as Keyword;
        for (const id of targetMinionIds) {
          s = updateMinion(s, owner, id, (minion) => {
            const keywords = new Set(minion.keywords);
            keywords.add(keyword);
            return {
              ...minion,
              keywords,
              divineShieldActive: keyword === 'divineShield' ? true : minion.divineShieldActive,
            };
          });
        }
      }
      break;

    case 'draw_card':
      s = drawCards(s, owner, Math.max(1, amount));
      break;

    case 'heal':
      s = healHero(s, owner, Math.max(0, amount));
      break;

    case 'damage_enemy':
      s = dealDamage(
        s,
        { kind: 'hero', player: enemyOf(owner) },
        Math.max(0, amount),
        { kind: 'hero', id: `synergy:${host.instanceId}`, owner },
      );
      break;

    case 'shield':
      for (const id of targetMinionIds) {
        s = updateMinion(s, owner, id, (minion) => {
          const keywords = new Set(minion.keywords);
          keywords.add('divineShield');
          return { ...minion, keywords, divineShieldActive: true };
        });
      }
      break;

    case 'cost_reduce': {
      const reduceBy = Math.max(0, amount);
      if (reduceBy === 0) break;

      const targetDefIds = resolveCostTargetDefIds(host, partners, scope);
      s = updatePlayer(s, owner, (player) => ({
        ...player,
        hand: player.hand.map((card) => {
          if (targetDefIds && !targetDefIds.has(card.defId)) return card;
          const currentCost = Math.max(0, card.currentCost - reduceBy);
          return currentCost === card.currentCost ? card : { ...card, currentCost };
        }),
      }));
      break;
    }

    default: {
      const _exhaustive: never = effect.kind;
      void _exhaustive;
    }
  }

  return s;
}
