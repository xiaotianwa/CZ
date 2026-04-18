'use client';

/**
 * 卡组构筑器 —— /game/deck
 * - 左侧：全 40 张卡池（可过滤类型/稀有度）
 * - 右侧：当前编辑中的卡组（25 槽位）
 * - 点左侧卡 +1，点右侧槽 -1
 * - 实时规则校验 + localStorage 持久化
 */

import React, { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CardFrame from '@/components/game/CardFrame';
import type { CardPreset } from '@/data/cardPresets';
import { useCardPresetsWithMap } from '@/lib/tcg/useCardPresets';
import { useCustomDecks } from '@/lib/tcg/useCustomDecks';
import { ALL_CARDS } from '@/game/cards';
import {
  validateDeck,
  errorText,
  DECK_RULES,
} from '@/game/deck-builder';
import type { CardDef, CardRarity, CardType } from '@/game/types';

const RARITY_ORDER: Record<CardRarity, number> = { N: 0, R: 1, SR: 2, SSR: 3 };
const TYPE_LABEL: Record<CardType, string> = {
  character: '角色', item: '道具', equipment: '装备', effect: '消耗', event: '事件',
};

// ============ 主页 ============

export default function DeckBuilderPage() {
  const {
    decks,
    online,
    loading,
    error,
    createDeck,
    renameDeck: apiRenameDeck,
    deleteDeck: apiDeleteDeck,
    saveCards,
  } = useCustomDecks();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<CardType | 'all'>('all');
  const [filterRarity, setFilterRarity] = useState<CardRarity | 'all'>('all');
  const { map: presetMap } = useCardPresetsWithMap();

  const activeDeck = activeIdx !== null ? decks[activeIdx] : null;
  // B3: online 时按 server id 定位；offline 时按索引定位
  const activeRef: string | number =
    online === true && activeDeck?.id ? activeDeck.id : (activeIdx ?? -1);

  // 筛选的卡池
  const filteredPool = useMemo(() => {
    return ALL_CARDS
      .filter((c) => filterType === 'all' || c.type === filterType)
      .filter((c) => filterRarity === 'all' || c.rarity === filterRarity)
      .slice()
      .sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        if (RARITY_ORDER[a.rarity] !== RARITY_ORDER[b.rarity]) return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
        return a.cost - b.cost;
      });
  }, [filterType, filterRarity]);

  const validation = activeDeck ? validateDeck(activeDeck.cards) : null;
  const cardCount = activeDeck?.cards.length ?? 0;

  // 操作：添加一张（optimistic：hook 内部会先本地更新再同步）
  const addCard = useCallback(async (defId: string) => {
    if (!activeDeck) return;
    if (activeDeck.cards.length >= DECK_RULES.SIZE) return;
    const def = ALL_CARDS.find((c) => c.id === defId);
    if (!def) return;
    const existing = activeDeck.cards.filter((x) => x === defId).length;
    const cap = def.rarity === 'SSR' ? DECK_RULES.SSR_CARD_MAX : DECK_RULES.SINGLE_CARD_MAX;
    if (existing >= cap) return;
    const next = [...activeDeck.cards, defId];
    await saveCards(activeRef, next);
  }, [activeDeck, activeRef, saveCards]);

  // 操作：移除一张（从末尾移除同名）
  const removeCard = useCallback(async (defId: string) => {
    if (!activeDeck) return;
    const idx = activeDeck.cards.lastIndexOf(defId);
    if (idx < 0) return;
    const next = [...activeDeck.cards.slice(0, idx), ...activeDeck.cards.slice(idx + 1)];
    await saveCards(activeRef, next);
  }, [activeDeck, activeRef, saveCards]);

  // 新建 / 删除 / 重命名
  const handleNewDeck = useCallback(async () => {
    const name = prompt('卡组名称？', `自建卡组 ${decks.length + 1}`);
    if (!name) return;
    const created = await createDeck(name.trim() || '未命名');
    if (created) setActiveIdx(decks.length); // hook 将新卡组追加到末尾
  }, [decks.length, createDeck]);

  const handleDelete = useCallback(async (i: number) => {
    if (!window.confirm(`确定删除「${decks[i].name}」？`)) return;
    const ref: string | number = online === true && decks[i].id ? decks[i].id! : i;
    const ok = await apiDeleteDeck(ref);
    if (!ok) return;
    if (activeIdx === i) setActiveIdx(null);
    else if (activeIdx !== null && activeIdx > i) setActiveIdx(activeIdx - 1);
  }, [decks, activeIdx, online, apiDeleteDeck]);

  const handleRename = useCallback(async (i: number) => {
    const name = prompt('修改名称', decks[i].name);
    if (!name) return;
    const ref: string | number = online === true && decks[i].id ? decks[i].id! : i;
    await apiRenameDeck(ref, name.trim());
  }, [decks, online, apiRenameDeck]);

  return (
    <div className="pt-4 pb-8 px-3 sm:px-4 max-w-[1400px] mx-auto">
      <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#A78BFA]/80 mb-2">
        <span className="inline-block w-6 h-px bg-[#A78BFA]/60" /> DECK · BUILDER
      </div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="neon-heading text-2xl sm:text-3xl">卡组构筑器</h1>
          <p className="text-white/55 text-xs mt-0.5">
            规则：{DECK_RULES.SIZE} 张 · 五类至少各 1 · 单卡 ≤ 2 · SSR ≤ 1 ·{' '}
            {online === true ? (
              <span className="text-emerald-300">已登录（自动同步到服务器）</span>
            ) : online === false ? (
              <span className="text-amber-300">未登录（仅存本机 localStorage）</span>
            ) : (
              <span className="text-white/40">加载中…</span>
            )}
          </p>
          {error && (
            <p className="text-rose-300 text-[11px] mt-1">⚠ {error}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/game/room" className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm">
            <SwordsIcon size={14} /> 好友房
          </Link>
          <Link href="/game/practice" className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm">
            <RobotIcon size={14} /> 练习
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* ===== 左：卡池 ===== */}
        <section className="glass-card rounded-2xl p-3 sm:p-4 min-h-[520px]">
          {/* 过滤器 */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-white/60 text-xs tracking-[0.2em] uppercase">类型</span>
            <FilterChip label="全部" active={filterType === 'all'} onClick={() => setFilterType('all')} />
            {(Object.keys(TYPE_LABEL) as CardType[]).map((t) => (
              <FilterChip key={t} label={TYPE_LABEL[t]} active={filterType === t} onClick={() => setFilterType(t)} />
            ))}
            <span className="w-2" />
            <span className="text-white/60 text-xs tracking-[0.2em] uppercase">稀有度</span>
            <FilterChip label="全部" active={filterRarity === 'all'} onClick={() => setFilterRarity('all')} />
            {(['N', 'R', 'SR', 'SSR'] as CardRarity[]).map((r) => (
              <FilterChip key={r} label={r} active={filterRarity === r} onClick={() => setFilterRarity(r)} />
            ))}
            <div className="grow" />
            <span className="text-white/50 text-xs">显示 {filteredPool.length} / {ALL_CARDS.length}</span>
          </div>

          {/* 卡池网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {filteredPool.map((def) => {
              const inDeckCount = activeDeck?.cards.filter((c) => c === def.id).length ?? 0;
              const cap = def.rarity === 'SSR' ? 1 : 2;
              const full = inDeckCount >= cap;
              const disabled = activeDeck === null || (activeDeck.cards.length >= DECK_RULES.SIZE) || full;
              return (
                <PoolCard
                  key={def.id}
                  def={def}
                  presetMap={presetMap}
                  inDeckCount={inDeckCount}
                  cap={cap}
                  disabled={disabled}
                  onAdd={() => addCard(def.id)}
                />
              );
            })}
          </div>
        </section>

        {/* ===== 右：当前卡组 ===== */}
        <aside className="glass-card rounded-2xl p-3 sm:p-4 flex flex-col min-h-[520px] lg:sticky lg:top-20 lg:max-h-[calc(100dvh-120px)]">
          {/* 卡组列表切换 */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {decks.map((d, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={[
                  'px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors border',
                  activeIdx === i
                    ? 'bg-gradient-to-r from-[#7C3AED]/80 to-[#A855F7]/70 text-white border-[#A78BFA]/50 shadow-[0_0_10px_-2px_rgba(124,58,237,0.6)]'
                    : 'bg-white/5 hover:bg-white/10 text-white/75 border-white/10',
                ].join(' ')}
                title={d.name}
              >
                {d.name} <span className="text-white/40">({d.cards.length})</span>
              </button>
            ))}
            <button
              onClick={handleNewDeck}
              disabled={loading}
              className="px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-100 border border-emerald-400/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + 新建
            </button>
          </div>

          {activeDeck ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="text-white font-bold text-base">
                  {activeDeck.name}{' '}
                  <span className={`text-xs font-normal ${
                    cardCount === DECK_RULES.SIZE ? 'text-emerald-300' : 'text-amber-300'
                  }`}>
                    {cardCount} / {DECK_RULES.SIZE}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleRename(activeIdx!)} title="重命名" className="btn-ghost inline-flex items-center justify-center w-7 h-7 rounded">
                    <EditIcon size={12} />
                  </button>
                  <button onClick={() => handleDelete(activeIdx!)} title="删除" className="inline-flex items-center justify-center w-7 h-7 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-500/30">
                    <TrashIcon size={12} />
                  </button>
                </div>
              </div>

              {/* 卡组列表 */}
              <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-0.5 min-h-[240px]">
                {(() => {
                  const uniq = new Map<string, number>();
                  for (const id of activeDeck.cards) uniq.set(id, (uniq.get(id) ?? 0) + 1);
                  const rows = Array.from(uniq.entries())
                    .map(([id, n]) => ({ def: ALL_CARDS.find((c) => c.id === id), n }))
                    .filter((r) => r.def)
                    .sort((a, b) => (a.def!.cost - b.def!.cost) || RARITY_ORDER[a.def!.rarity] - RARITY_ORDER[b.def!.rarity]);
                  if (rows.length === 0) {
                    return (
                      <div className="text-white/35 text-center py-8 text-sm">
                        空卡组。点击左侧卡池添加。
                      </div>
                    );
                  }
                  return rows.map(({ def, n }) => (
                    <DeckRow key={def!.id} def={def!} count={n} onRemove={() => removeCard(def!.id)} />
                  ));
                })()}
              </div>

              {/* 校验结果 */}
              <div className="mt-3 border-t border-white/10 pt-2">
                {validation?.ok ? (
                  <div className="text-emerald-300 text-xs font-bold inline-flex items-center gap-1">
                    <CheckIcon size={12} /> 卡组合法，可用于对战
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {(validation?.errors ?? []).map((e, i) => (
                      <div key={i} className="text-rose-300 text-[11px] inline-flex items-center gap-1">
                        <WarnIcon size={10} /> {errorText(e)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-3 text-sm">
              <DeckIcon size={42} />
              <div>
                {decks.length === 0 ? '还没有卡组，点「+ 新建」开始构筑。' : '请选择上方卡组进行编辑。'}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ============ 子组件 ============

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={['chip', active && 'chip-active'].filter(Boolean).join(' ')}
    >
      {label}
    </button>
  );
}

function PoolCard({ def, presetMap, inDeckCount, cap, disabled, onAdd }: {
  def: CardDef;
  presetMap: Record<string, CardPreset>;
  inDeckCount: number;
  cap: number;
  disabled: boolean;
  onAdd: () => void;
}) {
  const preset = presetMap[def.id];
  const rarityColor: Record<CardRarity, string> = {
    N: 'border-slate-400',
    R: 'border-sky-400',
    SR: 'border-fuchsia-400',
    SSR: 'border-amber-400',
  };
  const rarityGlow: Record<CardRarity, string> = {
    N: '',
    R: 'shadow-[0_0_10px_rgba(56,189,248,0.4)]',
    SR: 'shadow-[0_0_12px_rgba(232,121,249,0.5)]',
    SSR: 'shadow-[0_0_18px_rgba(251,191,36,0.7)]',
  };

  return (
    <button
      onClick={onAdd}
      disabled={disabled}
      title={disabled ? (inDeckCount >= cap ? '已达上限' : '卡组已满') : `添加 ${def.name}`}
      className={[
        'relative block rounded-lg overflow-hidden border-[3px] transition-all',
        rarityColor[def.rarity],
        rarityGlow[def.rarity],
        'h-[170px] sm:h-[190px]',
        disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer',
        inDeckCount > 0 ? 'ring-2 ring-emerald-400/80' : '',
      ].join(' ')}
    >
      {preset?.imagePath ? (
        <Image src={preset.imagePath} alt={preset.name} fill sizes="160px" className="object-cover" unoptimized />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900" />
      )}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/85 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/85 to-transparent" />
      <span className="absolute top-1 left-1 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-700 border-2 border-white/80 flex items-center justify-center text-white text-xs font-black shadow-lg">
        {def.cost}
      </span>
      <span className="absolute top-1 right-1 px-1 rounded bg-black/60 text-white text-[9px] font-black tracking-wider">
        {def.rarity}
      </span>
      <div className="absolute bottom-1 left-1 right-1 text-center text-white text-[11px] font-black truncate drop-shadow-[0_1px_2px_black]">
        {def.name}
      </div>
      {inDeckCount > 0 && (
        <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-emerald-950 font-black border border-white/80 shadow">
          ×{inDeckCount}
        </span>
      )}
    </button>
  );
}

function DeckRow({ def, count, onRemove }: { def: CardDef; count: number; onRemove: () => void }) {
  const rarityBg: Record<CardRarity, string> = {
    N: 'from-slate-600/30 to-slate-800/30',
    R: 'from-sky-600/25 to-sky-900/30',
    SR: 'from-fuchsia-600/25 to-purple-900/35',
    SSR: 'from-amber-500/30 to-amber-800/40',
  };
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md bg-gradient-to-r ${rarityBg[def.rarity]} border border-white/10 hover:border-white/20 transition-colors`}>
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/80 text-white text-[10px] font-black border border-white/60">
        {def.cost}
      </span>
      <span className="text-white text-xs font-semibold truncate flex-1">{def.name}</span>
      <span className="text-[9px] px-1 py-0.5 rounded bg-black/40 text-white/80 font-bold">
        {def.rarity}
      </span>
      <span className="text-white/60 text-xs tabular-nums w-5 text-right">×{count}</span>
      <button
        onClick={onRemove}
        className="inline-flex items-center justify-center w-5 h-5 rounded bg-rose-500/25 hover:bg-rose-500/50 text-rose-200 cursor-pointer"
        title="-1"
      >
        <MinusIcon size={10} />
      </button>
    </div>
  );
}

// ============ 小图标 ============

function CheckIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function WarnIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 10 18H2z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>;
}
function MinusIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function EditIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
}
function TrashIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
}
function DeckIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="12" height="16" rx="2"/><path d="M9 9h2M9 13h2"/><path d="M17 3h2a2 2 0 0 1 2 2v12"/></svg>;
}
function SwordsIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M9.5 17.5 21 6V3h-3L6.5 14.5"/><path d="m11 19-6-6"/><path d="m8 16-4 4"/><path d="m5 21-2-2"/></svg>;
}
function RobotIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="16" height="12" rx="2"/><circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/><path d="M10 17h4"/><path d="M12 3v4"/></svg>;
}
