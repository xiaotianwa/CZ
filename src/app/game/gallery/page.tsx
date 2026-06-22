'use client';

// 首发卡池总览：一页看 40 张
// 已有素材的卡正常显示图片；未上传素材的卡以「纯文字」占位渲染

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import CardFrame from '@/components/game/CardFrame';
import type { CardPreset } from '@/data/cardPresets';
import { useCardPresets } from '@/lib/tcg/useCardPresets';
import * as Icons from '@/components/game/GameIcons';
import { KEYWORD_DICT, MECHANIC_DICT, extractMechanicTags } from '@/app/game/_components/battle/shared';

type FilterType = 'all' | 'character' | 'item' | 'equipment' | 'effect' | 'event';
type FilterRarity = 'all' | 'N' | 'R' | 'SR' | 'SSR';
type FilterAsset = 'all' | 'with' | 'without';

type ChipOption = {
  v: string;
  l: string;
  Icon?: React.ComponentType<{ className?: string; size?: number }>;
};

const TYPE_OPTIONS: ChipOption[] = [
  { v: 'all',       l: '全部' },
  { v: 'character', l: '角色',  Icon: Icons.CharacterIcon },
  { v: 'item',      l: '道具',  Icon: Icons.ItemIcon },
  { v: 'equipment', l: '装备',  Icon: Icons.EquipmentIcon },
  { v: 'effect',    l: '消耗',  Icon: Icons.EffectIcon },
  { v: 'event',     l: '事件',  Icon: Icons.EventIcon },
];

const ASSET_OPTIONS: ChipOption[] = [
  { v: 'all',     l: '全部' },
  { v: 'with',    l: '已有', Icon: Icons.CheckIcon },
  { v: 'without', l: '待补', Icon: Icons.TimerIcon },
];

const TYPE_LABELS: Record<CardPreset['type'], string> = {
  character: '角色',
  item: '道具',
  equipment: '装备',
  effect: '消耗',
  event: '事件',
};

const SUBTYPE_LABELS: Record<NonNullable<CardPreset['subtype']>, string> = {
  instant: '即时',
  delayed: '延时',
  weapon: '武器',
  armor: '防具',
};

const TRIGGER_LABELS: Record<string, string> = {
  battlecry: '登场',
  deathrattle: '退场',
  onEquip: '装备时',
  onAttack: '攻击后',
  turnStart: '回合开始',
  turnEnd: '回合结束',
  onCountdown0: '倒计时归零',
  onSecretTrigger: '暗箱触发',
  aura: '粉圈光环',
};

const EFFECT_LABELS: Record<string, string> = {
  damage_target: '对目标造成伤害',
  damage_enemy_hero: '对敌方经纪人造成伤害',
  damage_all_enemy_minions: '对敌方所有角色造成伤害',
  damage_all_minions: '对全场角色造成伤害',
  heal_self_hero: '己方经纪人回复流量',
  heal_target_minion: '治疗目标角色',
  heal_all_friendly_minions: '治疗己方全体角色',
  heal_self_hero_and_minions: '己方整体回复流量',
  draw_cards: '抽牌',
  draw_and_reduce_cost: '抽牌并降低费用',
  discover_effect: '挖掘消耗牌',
  buff_all_friendly: '己方全体强化',
  buff_all_friendly_attack_turn: '己方全体本回合加攻',
  debuff_all_enemy_attack: '降低敌方全体攻击',
  destroy_random_enemy_event: '摧毁敌方事件',
  silence_target: '沉默目标',
  return_target_to_hand: '目标回手',
  give_target_divine_shield: '给予粉丝盾',
  damage_full_health_target_bonus: '满血目标额外伤害',
};

const SYNERGY_TRIGGER_LABELS: Record<string, string> = {
  both_in_play: '双方同时在场',
  partner_equipped: '伙伴装备已装上',
  partner_in_hand: '伙伴在手牌',
};

const SYNERGY_SCOPE_LABELS: Record<string, string> = {
  self: '自己',
  partner: '伙伴',
  both: '双方',
  all_allies: '己方全体',
};

const SYNERGY_DURATION_LABELS: Record<string, string> = {
  permanent: '永久',
  turn: '本回合',
  while_paired: '联动期间',
};

const SYNERGY_EFFECT_LABELS: Record<string, string> = {
  attack_buff: '攻击增加 N',
  health_buff: '生命增加 N',
  cost_reduce: '手牌费用降低 N',
  keyword_grant: '获得关键字',
  draw_card: '抽 N 张牌',
  heal: '治疗 N 点',
  damage_enemy: '敌方经纪人受 N 点伤害',
  shield: '获得护盾',
};

export default function CardGalleryPage() {
  const [ft, setFt] = useState<FilterType>('all');
  const [fr, setFr] = useState<FilterRarity>('all');
  const [fa, setFa] = useState<FilterAsset>('all');
  const [selectedCard, setSelectedCard] = useState<CardPreset | null>(null);
  const presets = useCardPresets();

  useEffect(() => {
    if (!selectedCard) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedCard(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCard]);

  const filtered = useMemo(() => {
    return presets.filter((p) => {
      if (ft !== 'all' && p.type !== ft) return false;
      if (fr !== 'all' && p.rarity !== fr) return false;
      const has = !!p.imagePath;
      if (fa === 'with' && !has) return false;
      if (fa === 'without' && has) return false;
      return true;
    });
  }, [ft, fr, fa, presets]);

  const stats = useMemo(() => {
    const total = presets.length;
    const withImg = presets.filter((p) => p.imagePath).length;
    return { total, withImg, missing: total - withImg };
  }, [presets]);

  return (
    <div className="pt-6 pb-14 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#A78BFA]/80 mb-1">
                <span className="inline-block w-6 h-px bg-[#A78BFA]/60" /> CARD POOL · <span className="font-waterbrush">1103</span>
              </div>
              <h1 className="neon-heading text-3xl sm:text-4xl">首发卡池总览</h1>
              <p className="text-white/60 mt-2 text-sm">
                共 <b className="text-[#A78BFA]">{stats.total}</b> 张 · 已有素材{' '}
                <b className="text-emerald-300">{stats.withImg}</b> · 待补{' '}
                <b className="text-[#FB7185]">{stats.missing}</b>
              </p>
            </div>
            <Link
              href="/game/preview"
              className="btn-neon-primary group inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-bold cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              前往制作器
            </Link>
          </div>

          {/* 筛选栏 */}
          <div className="mt-4 flex flex-wrap gap-3">
            <FilterGroup
              label="类型"
              value={ft}
              onChange={(v) => setFt(v as FilterType)}
              options={TYPE_OPTIONS}
            />
            <FilterGroup
              label="稀有度"
              value={fr}
              onChange={(v) => setFr(v as FilterRarity)}
              options={[
                { v: 'all', l: '全部' },
                { v: 'N', l: 'N' },
                { v: 'R', l: 'R' },
                { v: 'SR', l: 'SR' },
                { v: 'SSR', l: 'SSR' },
              ]}
            />
            <FilterGroup
              label="素材"
              value={fa}
              onChange={(v) => setFa(v as FilterAsset)}
              options={ASSET_OPTIONS}
            />
          </div>
        </header>

        {/* 卡牌网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((p) => (
            <GalleryCard key={p.id} preset={p} onOpen={() => setSelectedCard(p)} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-white/40 py-16">
            该筛选条件下没有卡牌
          </div>
        )}
      </div>

      {selectedCard && (
        <CardDetailModal
          preset={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}

// =============== 子组件 ===============

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ChipOption[];
}) {
  return (
    <div className="flex items-center gap-1.5 glass-card rounded-xl px-3 py-1.5">
      <span className="text-[11px] text-white/45 font-semibold tracking-wider uppercase mr-1">{label}</span>
      {options.map((o) => {
        const Ico = o.Icon;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            aria-pressed={value === o.v}
            className={['chip inline-flex items-center gap-1', value === o.v && 'chip-active'].filter(Boolean).join(' ')}
          >
            {Ico && <Ico size={12} />}
            <span>{o.l}</span>
          </button>
        );
      })}
    </div>
  );
}

function GalleryCard({ preset, onOpen }: { preset: CardPreset; onOpen: () => void }) {
  const hasImg = !!preset.imagePath;
  // imagePath 已由 cardPresets 的 resolveImagePath 统一编码，直接使用
  const imgUrl = preset.imagePath ?? '';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col items-center gap-1.5 cursor-pointer neon-card-hover p-1.5 text-left"
      title={`点击查看 ${preset.id} 详细信息`}
      aria-label={`查看卡牌 ${preset.name} 的详细信息`}
    >
      <CardFrame
        name={preset.name}
        image={imgUrl}
        type={preset.type}
        subtype={preset.subtype}
        rarity={preset.rarity}
        cost={preset.cost}
        attack={preset.attack}
        health={preset.health}
        description={preset.description}
        flavor={preset.flavor}
        width={180}
        interactive
      />
      <div className="inline-flex items-center gap-1 text-[11px] text-white/60 font-mono text-center">
        <span className="text-[#A78BFA] font-bold">{preset.id}</span>
        {hasImg ? (
          <span
            aria-label="已有素材"
            className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
          />
        ) : (
          <span
            aria-label="待补素材"
            className="inline-block w-1.5 h-1.5 rounded-full border border-[#FB7185]"
          />
        )}
      </div>
    </button>
  );
}

function CardDetailModal({ preset, onClose }: { preset: CardPreset; onClose: () => void }) {
  const imgUrl = preset.imagePath ?? '';
  const mechanicTags = extractMechanicTags(preset.description);
  const keywords = (preset.keywords ?? []).filter((keyword) => KEYWORD_DICT[keyword]);
  const effects = preset.effects ?? [];
  const synergies = preset.synergies ?? [];
  const subtypeLabel = preset.subtype ? SUBTYPE_LABELS[preset.subtype] : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-detail-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[24px] border border-white/10 bg-[#0b0717]/95 shadow-[0_24px_90px_rgba(0,0,0,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#0b0717]/90 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.28em] text-[#A78BFA]/75">CARD DETAIL · {preset.id}</p>
            <h2 id="card-detail-title" className="mt-1 truncate text-2xl font-black text-white">
              {preset.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="关闭卡牌详情"
          >
            <Icons.CloseIcon size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[300px_1fr]">
          <div className="flex flex-col items-center gap-4">
            <CardFrame
              name={preset.name}
              image={imgUrl}
              type={preset.type}
              subtype={preset.subtype}
              rarity={preset.rarity}
              cost={preset.cost}
              attack={preset.attack}
              health={preset.health}
              description={preset.description}
              flavor={preset.flavor}
              width={260}
              interactive={false}
            />
            <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="grid grid-cols-3 gap-3">
                <DetailStat label="消耗" value={formatValue(preset.cost)} Icon={Icons.ManaIcon} />
                <DetailStat label="攻击" value={formatValue(preset.attack)} Icon={Icons.AttackIcon} />
                <DetailStat label="生命" value={formatValue(preset.health)} Icon={Icons.HealthIcon} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetaPill label="类型" value={subtypeLabel ? `${TYPE_LABELS[preset.type]} · ${subtypeLabel}` : TYPE_LABELS[preset.type]} />
              <MetaPill label="稀有度" value={preset.rarity} />
              <MetaPill label="素材" value={preset.imagePath ? '已有素材' : '待补素材'} />
            </div>

            <DetailSection title="卡牌描述">
              <p className="text-sm leading-7 text-white/82">
                {preset.description || '暂无描述'}
              </p>
              {preset.flavor && (
                <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm italic leading-6 text-white/55">
                  {preset.flavor}
                </p>
              )}
            </DetailSection>

            <DetailSection title="机制说明">
              {mechanicTags.length > 0 || keywords.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {mechanicTags.map((tag) => {
                    const info = MECHANIC_DICT[tag];
                    return <MechanicItem key={tag} name={info.name} desc={info.desc} Icon={info.Icon} />;
                  })}
                  {keywords.map((keyword) => {
                    const info = KEYWORD_DICT[keyword];
                    return <MechanicItem key={keyword} name={info.name} desc={info.desc} Icon={info.Icon} />;
                  })}
                </div>
              ) : (
                <EmptyDetailText>这张卡没有额外机制关键词。</EmptyDetailText>
              )}
            </DetailSection>

            <DetailSection title="效果钩子">
              {effects.length > 0 ? (
                <div className="space-y-2">
                  {effects.map((effect, index) => (
                    <div key={`${effect.trigger}-${effect.effectId}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-200">
                          {TRIGGER_LABELS[effect.trigger] ?? effect.trigger}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {EFFECT_LABELS[effect.effectId] ?? effect.effectId}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-white/50">{formatParams(effect.params)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyDetailText>没有单独配置钩子，按卡面描述结算。</EmptyDetailText>
              )}
            </DetailSection>

            <DetailSection title="卡牌联动">
              {synergies.length > 0 ? (
                <div className="space-y-3">
                  {synergies.map((synergy) => (
                    <div key={synergy.id} className="rounded-xl border border-[#A78BFA]/20 bg-[#A78BFA]/[0.06] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-white">{synergy.name}</span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/55">
                          {SYNERGY_TRIGGER_LABELS[synergy.trigger] ?? synergy.trigger}
                        </span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/55">
                          作用：{SYNERGY_SCOPE_LABELS[synergy.scope] ?? synergy.scope}
                        </span>
                      </div>
                      {synergy.description && (
                        <p className="mt-2 text-sm leading-6 text-white/70">{synergy.description}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-lg bg-white/5 px-2 py-1 text-white/60">
                          伙伴：{synergy.partners.join('、')}
                        </span>
                        {synergy.effects.map((effect, index) => (
                          <span key={`${synergy.id}-effect-${index}`} className="rounded-lg bg-emerald-500/10 px-2 py-1 text-emerald-200">
                            {describeSynergyEffect(effect)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyDetailText>暂无联动配置。</EmptyDetailText>
              )}
            </DetailSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailStat({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3 text-center">
      <Icon className="mx-auto text-white/45" size={16} />
      <p className="mt-1 text-[11px] text-white/40">{label}</p>
      <p className="mt-0.5 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="text-[11px] text-white/38">{label}</p>
      <p className="mt-1 text-sm font-bold text-white/86">{value}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <h3 className="mb-3 text-sm font-black tracking-wide text-white">{title}</h3>
      {children}
    </section>
  );
}

function MechanicItem({
  name,
  desc,
  Icon,
}: {
  name: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <Icon className="text-[#A78BFA]" size={16} />
        <span>{name}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-white/52">{desc}</p>
    </div>
  );
}

function EmptyDetailText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/42">{children}</p>;
}

function formatValue(value: number | undefined): string {
  return typeof value === 'number' ? String(value) : '-';
}

function formatParams(params: Record<string, number | string | boolean> | undefined): string {
  const entries = Object.entries(params ?? {});
  if (entries.length === 0) return '无参数';
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ');
}

function describeSynergyEffect(effect: {
  kind: string;
  amount?: number;
  keyword?: string;
  duration?: string;
}): string {
  if (effect.kind === 'keyword_grant') {
    const keywordName = effect.keyword ? (KEYWORD_DICT[effect.keyword]?.name ?? effect.keyword) : '未配置';
    return `获得【${keywordName}】`;
  }

  const base = SYNERGY_EFFECT_LABELS[effect.kind] ?? effect.kind;
  const value = typeof effect.amount === 'number' ? effect.amount : 0;
  const text = base.includes('N') ? base.replace('N', String(value)) : base;
  const duration = effect.duration ? SYNERGY_DURATION_LABELS[effect.duration] : undefined;
  return duration ? `${text} · ${duration}` : text;
}
