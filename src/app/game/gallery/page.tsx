'use client';

// 首发卡池总览：一页看 40 张
// 已有素材的卡正常显示图片；未上传素材的卡以「纯文字」占位渲染

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import CardFrame from '@/components/game/CardFrame';
import { CARD_PRESETS, CardPreset } from '@/data/cardPresets';
import * as Icons from '@/components/game/GameIcons';

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

export default function CardGalleryPage() {
  const [ft, setFt] = useState<FilterType>('all');
  const [fr, setFr] = useState<FilterRarity>('all');
  const [fa, setFa] = useState<FilterAsset>('all');

  const filtered = useMemo(() => {
    return CARD_PRESETS.filter((p) => {
      if (ft !== 'all' && p.type !== ft) return false;
      if (fr !== 'all' && p.rarity !== fr) return false;
      const has = !!p.imagePath;
      if (fa === 'with' && !has) return false;
      if (fa === 'without' && has) return false;
      return true;
    });
  }, [ft, fr, fa]);

  const stats = useMemo(() => {
    const total = CARD_PRESETS.length;
    const withImg = CARD_PRESETS.filter((p) => p.imagePath).length;
    return { total, withImg, missing: total - withImg };
  }, []);

  return (
    <div className="pt-6 pb-14 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#A78BFA]/80 mb-1">
                <span className="inline-block w-6 h-px bg-[#A78BFA]/60" /> CARD POOL · 1103
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
            <GalleryCard key={p.id} preset={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-white/40 py-16">
            该筛选条件下没有卡牌
          </div>
        )}
      </div>
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

function GalleryCard({ preset }: { preset: CardPreset }) {
  const hasImg = !!preset.imagePath;
  const imgUrl = hasImg
    ? preset.imagePath!.split('/').map(encodeURIComponent).join('/').replace(/%2F/g, '/')
    : '';

  return (
    <Link
      href={`/game/preview?preset=${preset.id}`}
      className="group flex flex-col items-center gap-1.5 cursor-pointer neon-card-hover p-1.5"
      title={`点击打开制作器编辑 ${preset.id}`}
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
    </Link>
  );
}
