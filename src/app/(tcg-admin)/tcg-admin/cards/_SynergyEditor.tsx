'use client';

/**
 * 卡牌联动编辑器
 *
 * 使用位置：CardForm 的一个 Section
 *
 * 交互：
 *   - 列表展示已配置的联动（每条一个折叠卡）
 *   - 新建按钮 → 新增一条空联动并自动展开
 *   - 每条联动可编辑：name / description / partners(多选卡 ID) / trigger / scope / effects[]
 *   - partners 多选：下拉选择池来自 /api/tcg/admin/cards?pageSize=200（只缓存一次）
 *
 * 依赖类型：@/lib/tcg/synergy
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Zap, X, AlertTriangle } from 'lucide-react';
import {
  type CardSynergy,
  type CardSynergyEffect,
  type SynergyEffectKind,
  SYNERGY_TRIGGERS,
  SYNERGY_SCOPES,
  SYNERGY_EFFECT_KINDS,
  SYNERGY_DURATIONS,
  createEmptySynergy,
  createEmptyEffect,
  describeEffect,
} from '@/lib/tcg/synergy';

interface CardRow {
  id: string;
  name: string;
  type: string;
  rarity: string;
  imagePath: string | null;
}

export default function SynergyEditor({
  selfId,
  value,
  onChange,
}: {
  selfId: string; // 当前编辑的卡 ID，用于从候选池排除自己
  value: CardSynergy[];
  onChange: (next: CardSynergy[]) => void;
}) {
  const [allCards, setAllCards] = useState<CardRow[]>([]);
  const [loadingPool, setLoadingPool] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch('/api/tcg/admin/cards?pageSize=200', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) {
          setAllCards((json.data?.list ?? []) as CardRow[]);
        }
      })
      .finally(() => setLoadingPool(false));
  }, []);

  const cardMap = useMemo(() => {
    const m = new Map<string, CardRow>();
    for (const c of allCards) m.set(c.id, c);
    return m;
  }, [allCards]);

  const addSynergy = () => {
    const s = createEmptySynergy();
    onChange([...value, s]);
    setExpandedId(s.id);
  };

  const updateSynergy = (id: string, patch: Partial<CardSynergy>) => {
    onChange(value.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSynergy = (id: string) => {
    if (!confirm('确认删除这条联动？')) return;
    onChange(value.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="space-y-3">
      {/* 列表 */}
      {value.length === 0 && (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
          <Zap className="w-6 h-6 text-[#A78BFA]/60 mx-auto mb-2" />
          <p className="text-sm text-white/50">
            还没有配置联动 —— 点击右下按钮添加第一条
          </p>
          <p className="text-[11px] text-white/35 mt-1">
            例如：陈泽 + 高级话筒同时在场 → 陈泽攻击 +2（联动期间）
          </p>
        </div>
      )}

      {value.map((syn) => {
        const isOpen = expandedId === syn.id;
        const partnerNames = syn.partners
          .map((id) => cardMap.get(id)?.name || id)
          .join(' · ');
        return (
          <div
            key={syn.id}
            className={`rounded-lg border transition-colors ${
              isOpen
                ? 'border-[#7C3AED]/40 bg-[#7C3AED]/[0.05]'
                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
            }`}
          >
            {/* 列表行 */}
            <div className="flex items-center gap-3 px-4 py-3">
              <Zap className={`w-4 h-4 flex-shrink-0 ${isOpen ? 'text-[#A78BFA]' : 'text-white/40'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {syn.name || <span className="text-white/40">（未命名联动）</span>}
                  </span>
                  {syn.partners.length === 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-px rounded-sm bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <AlertTriangle className="w-2.5 h-2.5" /> 缺伙伴
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-white/45 mt-0.5 truncate">
                  {partnerNames ? `与 ${partnerNames}` : '伙伴未设置'} · {syn.effects.map(describeEffect).join(' / ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : syn.id)}
                className="h-7 px-2 rounded-md text-xs text-white/65 hover:bg-white/10 flex items-center gap-1"
              >
                {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {isOpen ? '收起' : '编辑'}
              </button>
              <button
                type="button"
                onClick={() => removeSynergy(syn.id)}
                className="h-7 w-7 rounded-md text-white/40 hover:bg-rose-500/15 hover:text-rose-300 flex items-center justify-center"
                title="删除联动"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 展开编辑器 */}
            {isOpen && (
              <SynergyDetail
                syn={syn}
                selfId={selfId}
                allCards={allCards}
                cardMap={cardMap}
                loadingPool={loadingPool}
                onChange={(patch) => updateSynergy(syn.id, patch)}
              />
            )}
          </div>
        );
      })}

      {/* 新增按钮 */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-white/40">
          已配置 <span className="text-white/70 font-semibold">{value.length}</span> / 10 条
        </span>
        <button
          type="button"
          onClick={addSynergy}
          disabled={value.length >= 10}
          className="h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#C4B5FD] hover:bg-[#7C3AED]/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" /> 新增联动
        </button>
      </div>
    </div>
  );
}

// ==================== 展开后的详情编辑器 ====================

function SynergyDetail({
  syn,
  selfId,
  allCards,
  cardMap,
  loadingPool,
  onChange,
}: {
  syn: CardSynergy;
  selfId: string;
  allCards: CardRow[];
  cardMap: Map<string, CardRow>;
  loadingPool: boolean;
  onChange: (patch: Partial<CardSynergy>) => void;
}) {
  const addPartner = (id: string) => {
    if (!id || syn.partners.includes(id)) return;
    onChange({ partners: [...syn.partners, id] });
  };
  const removePartner = (id: string) => {
    onChange({ partners: syn.partners.filter((x) => x !== id) });
  };

  const updateEffect = (idx: number, patch: Partial<CardSynergyEffect>) => {
    onChange({
      effects: syn.effects.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    });
  };
  const addEffect = () => {
    if (syn.effects.length >= 5) return;
    onChange({ effects: [...syn.effects, createEmptyEffect()] });
  };
  const removeEffect = (idx: number) => {
    if (syn.effects.length <= 1) return;
    onChange({ effects: syn.effects.filter((_, i) => i !== idx) });
  };

  return (
    <div className="border-t border-white/10 px-4 py-4 space-y-4">
      {/* 基础信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-white/85 mb-1 block">联动名 *</label>
          <input
            value={syn.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="陈泽之锚"
            maxLength={40}
            className="input-tcg"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-white/85 mb-1 block">文案（前端 tooltip）</label>
          <input
            value={syn.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="陈泽 + 高级话筒同时在场，攻击 +2"
            maxLength={200}
            className="input-tcg"
          />
        </div>
      </div>

      {/* 搭档选择 */}
      <div>
        <label className="text-xs font-medium text-white/85 mb-1.5 block">
          搭档卡 * <span className="text-white/45 font-normal">（至少 1 张，多选）</span>
        </label>
        {/* 已选 tag */}
        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
          {syn.partners.length === 0 && (
            <span className="text-[11px] text-white/35 italic">未选择搭档</span>
          )}
          {syn.partners.map((id) => {
            const c = cardMap.get(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-xs text-white"
              >
                <span className="font-mono text-[10px] text-[#A78BFA]">{id}</span>
                <span>{c?.name || '（未找到）'}</span>
                <button
                  type="button"
                  onClick={() => removePartner(id)}
                  className="w-4 h-4 rounded-sm hover:bg-rose-500/30 hover:text-rose-200 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
        {/* 选择框 */}
        <select
          value=""
          onChange={(e) => {
            addPartner(e.target.value);
            (e.target as HTMLSelectElement).value = '';
          }}
          disabled={loadingPool}
          className="input-tcg"
        >
          <option value="">{loadingPool ? '加载卡池中...' : '＋ 添加搭档卡'}</option>
          {allCards
            .filter((c) => c.id !== selfId && !syn.partners.includes(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.name}（{c.type} · {c.rarity}）
              </option>
            ))}
        </select>
      </div>

      {/* 触发 + 作用域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-white/85 mb-1 block">触发条件</label>
          <select
            value={syn.trigger}
            onChange={(e) => onChange({ trigger: e.target.value as CardSynergy['trigger'] })}
            className="input-tcg"
          >
            {SYNERGY_TRIGGERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="tcg-hint mt-1">{SYNERGY_TRIGGERS.find((t) => t.value === syn.trigger)?.hint}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-white/85 mb-1 block">效果作用对象</label>
          <select
            value={syn.scope}
            onChange={(e) => onChange({ scope: e.target.value as CardSynergy['scope'] })}
            className="input-tcg"
          >
            {SYNERGY_SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="tcg-hint mt-1">{SYNERGY_SCOPES.find((s) => s.value === syn.scope)?.hint}</p>
        </div>
      </div>

      {/* 效果列表 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-white/85">
            效果 * <span className="text-white/45 font-normal">（至少 1 条，最多 5 条）</span>
          </label>
          <button
            type="button"
            onClick={addEffect}
            disabled={syn.effects.length >= 5}
            className="h-7 px-2 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> 效果
          </button>
        </div>
        <div className="space-y-2">
          {syn.effects.map((ef, i) => (
            <EffectRow
              key={i}
              effect={ef}
              onChange={(patch) => updateEffect(i, patch)}
              onRemove={syn.effects.length > 1 ? () => removeEffect(i) : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== 单条效果行 ====================

function EffectRow({
  effect,
  onChange,
  onRemove,
}: {
  effect: CardSynergyEffect;
  onChange: (patch: Partial<CardSynergyEffect>) => void;
  onRemove: (() => void) | null;
}) {
  const def = SYNERGY_EFFECT_KINDS.find((k) => k.value === effect.kind);
  const showAmount = def?.needsAmount ?? false;
  const showKeyword = def?.needsKeyword ?? false;

  return (
    <div className="flex items-stretch gap-2 p-2 rounded-md bg-[#0f0f23]/60 border border-white/10">
      <select
        value={effect.kind}
        onChange={(e) => {
          const nextKind = e.target.value as SynergyEffectKind;
          const nextDef = SYNERGY_EFFECT_KINDS.find((k) => k.value === nextKind);
          const patch: Partial<CardSynergyEffect> = { kind: nextKind };
          // 切换时智能补/清默认
          if (nextDef?.needsAmount && effect.amount == null) patch.amount = 1;
          if (!nextDef?.needsAmount) patch.amount = undefined;
          if (nextDef?.needsKeyword && !effect.keyword) patch.keyword = 'taunt';
          if (!nextDef?.needsKeyword) patch.keyword = undefined;
          onChange(patch);
        }}
        className="input-tcg flex-1 !h-8 !text-xs"
      >
        {SYNERGY_EFFECT_KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      {showAmount && (
        <input
          type="number"
          min={-99}
          max={99}
          value={effect.amount ?? 0}
          onChange={(e) => onChange({ amount: Number(e.target.value) })}
          className="input-tcg w-20 !h-8 !text-xs text-center"
        />
      )}
      {showKeyword && (
        <select
          value={effect.keyword ?? ''}
          onChange={(e) => onChange({ keyword: e.target.value })}
          className="input-tcg w-36 !h-8 !text-xs"
        >
          <option value="taunt">taunt 挡枪</option>
          <option value="charge">charge 紧急通告</option>
          <option value="rush">rush 试水</option>
          <option value="stealth">stealth 潜水</option>
          <option value="divineShield">divineShield 粉丝盾</option>
          <option value="lifesteal">lifesteal 吸粉</option>
          <option value="windfury">windfury 双开</option>
          <option value="poisonous">poisonous 封杀</option>
        </select>
      )}
      <select
        value={effect.duration}
        onChange={(e) => onChange({ duration: e.target.value as CardSynergyEffect['duration'] })}
        className="input-tcg w-28 !h-8 !text-xs"
      >
        {SYNERGY_DURATIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="w-8 rounded-md text-white/40 hover:bg-rose-500/15 hover:text-rose-300 flex items-center justify-center"
          title="删除这条效果"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
