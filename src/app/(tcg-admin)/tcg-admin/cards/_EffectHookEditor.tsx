'use client';

/**
 * 卡牌效果钩子 (EffectHook) 可视化编辑器
 *
 * 设计：
 * - 列表显示已挂载的效果，每条可改 trigger / 参数 / 删除
 * - 顶部"+ 添加效果"展开 inline panel，按分类分组展示所有内置 preset
 * - 未知 effectId（老数据 / 开发者手写）会降级为"只读 raw"显示
 *
 * value / onChange 模式（受控组件）：
 * - value: CardEffectHook[]
 * - onChange: (next: CardEffectHook[]) => void
 */

import { useMemo, useState } from 'react';
import { Plus, X, ChevronDown, Zap, AlertCircle } from 'lucide-react';
import {
  EFFECT_PRESETS,
  EFFECT_PRESET_MAP,
  EFFECT_TRIGGERS,
  TRIGGER_LABELS,
  TRIGGER_HINTS,
  groupPresetsByCategory,
  createHookFromPreset,
  type CardEffectHook,
  type EffectPreset,
  type EffectTrigger,
} from '@/lib/tcg/effectHooks';

export interface EffectHookEditorProps {
  value: CardEffectHook[];
  onChange: (next: CardEffectHook[]) => void;
}

export default function EffectHookEditor({ value, onChange }: EffectHookEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const grouped = useMemo(() => groupPresetsByCategory(), []);

  const update = (idx: number, patch: Partial<CardEffectHook>) => {
    const next = value.map((h, i) => (i === idx ? { ...h, ...patch } : h));
    onChange(next);
  };

  const updateParam = (idx: number, key: string, val: number | string | boolean) => {
    const next = value.map((h, i) => {
      if (i !== idx) return h;
      return { ...h, params: { ...(h.params ?? {}), [key]: val } };
    });
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const add = (preset: EffectPreset) => {
    onChange([...value, createHookFromPreset(preset)]);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* 已有效果列表 */}
      {value.length === 0 ? (
        <div className="px-3 py-6 rounded-md border border-dashed border-white/10 text-center text-xs text-white/40">
          还没有效果 · 点击下方按钮从内置技能库挑选
        </div>
      ) : (
        <div className="space-y-2">
          {value.map((hook, idx) => (
            <HookRow
              key={idx}
              hook={hook}
              preset={EFFECT_PRESET_MAP[hook.effectId]}
              onTriggerChange={(t) => update(idx, { trigger: t })}
              onParamChange={(k, v) => updateParam(idx, k, v)}
              onRemove={() => remove(idx)}
            />
          ))}
        </div>
      )}

      {/* 添加按钮 + picker 面板 */}
      <div>
        {!pickerOpen ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={value.length >= 10}
            className="h-9 px-4 rounded-md bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-[#C4B5FD] text-xs hover:bg-[#7C3AED]/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> 添加效果
            <span className="text-white/30 ml-1">{value.length}/10</span>
          </button>
        ) : (
          <div className="rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/[0.04] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-[#C4B5FD] font-semibold">挑选内置技能</div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="h-6 w-6 rounded-md hover:bg-white/10 text-white/50 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {Object.entries(grouped).map(([cat, presets]) => (
                <div key={cat}>
                  <div className="text-[10px] tracking-wider text-white/35 uppercase mb-1.5">{cat}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {presets.map((p) => (
                      <PresetCard key={p.id} preset={p} onPick={() => add(p)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 单行 Hook ====================

function HookRow({
  hook,
  preset,
  onTriggerChange,
  onParamChange,
  onRemove,
}: {
  hook: CardEffectHook;
  preset: EffectPreset | undefined;
  onTriggerChange: (t: EffectTrigger) => void;
  onParamChange: (k: string, v: number | string | boolean) => void;
  onRemove: () => void;
}) {
  const isUnknown = !preset;

  return (
    <div
      className={`rounded-md border px-3 py-2.5 ${
        isUnknown
          ? 'border-amber-500/30 bg-amber-500/[0.04]'
          : 'border-[#7C3AED]/20 bg-[#7C3AED]/[0.03]'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* trigger 下拉 */}
        <select
          value={hook.trigger}
          onChange={(e) => onTriggerChange(e.target.value as EffectTrigger)}
          className="h-7 px-2 rounded bg-[#0f0f23]/80 border border-white/10 text-[11px] text-white focus:border-[#7C3AED]/50 focus:outline-none"
          title={TRIGGER_HINTS[hook.trigger]}
        >
          {EFFECT_TRIGGERS.map((t) => (
            <option key={t} value={t}>
              {TRIGGER_LABELS[t]}
            </option>
          ))}
        </select>

        {/* effectId 标签 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isUnknown ? (
              <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
            ) : (
              <Zap className="w-3 h-3 text-[#A78BFA] flex-shrink-0" />
            )}
            <div className="text-xs text-white/85 truncate font-medium">
              {preset?.label ?? hook.effectId}
            </div>
          </div>
          <div className="text-[10px] text-white/35 font-mono mt-0.5 truncate">
            {hook.effectId}
          </div>
          {preset?.description && (
            <div className="text-[10px] text-white/45 mt-1 leading-snug">{preset.description}</div>
          )}
          {isUnknown && (
            <div className="text-[10px] text-amber-400/80 mt-1">
              未知技能（不在内置注册表中），保存时会原样保留
            </div>
          )}
          {preset?.needsTarget && (
            <div className="text-[10px] text-[#F0B340] mt-1">需要玩家选目标</div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 rounded-md bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-300 flex items-center justify-center flex-shrink-0"
          title="删除"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 参数网格 */}
      {preset?.params && preset.params.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2.5 pl-1">
          {preset.params.map((p) => {
            const raw = hook.params?.[p.key];
            return (
              <label key={p.key} className="block">
                <span className="block text-[10px] text-white/50 mb-0.5">
                  {p.label}
                  {p.hint && <span className="text-white/30 ml-1">· {p.hint}</span>}
                </span>
                {p.type === 'number' ? (
                  <input
                    type="number"
                    value={typeof raw === 'number' ? raw : (typeof raw === 'string' ? raw : (p.default ?? 0))}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      onParamChange(p.key, Number.isFinite(n) ? n : 0);
                    }}
                    min={p.min}
                    max={p.max}
                    className="w-full h-7 px-2 rounded bg-[#0f0f23]/80 border border-white/10 text-xs text-white focus:border-[#7C3AED]/50 focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={typeof raw === 'string' ? raw : String(raw ?? p.default ?? '')}
                    onChange={(e) => onParamChange(p.key, e.target.value)}
                    className="w-full h-7 px-2 rounded bg-[#0f0f23]/80 border border-white/10 text-xs text-white focus:border-[#7C3AED]/50 focus:outline-none"
                  />
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== Preset 卡片（picker 项） ====================

function PresetCard({ preset, onPick }: { preset: EffectPreset; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="text-left px-2.5 py-1.5 rounded border border-white/10 bg-white/[0.02] hover:bg-[#7C3AED]/15 hover:border-[#7C3AED]/30 transition-colors group"
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <Zap className="w-3 h-3 text-[#A78BFA]/70 group-hover:text-[#A78BFA]" />
        <span className="text-xs text-white/90 font-medium truncate">{preset.label}</span>
      </div>
      <div className="text-[10px] text-white/45 leading-snug line-clamp-2">{preset.description}</div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[9px] px-1 py-px rounded bg-[#7C3AED]/15 text-[#C4B5FD]/70 font-mono">
          {TRIGGER_LABELS[preset.defaultTrigger]}
        </span>
        {preset.needsTarget && (
          <span className="text-[9px] px-1 py-px rounded bg-[#F0B340]/10 text-[#F0B340]/80">
            需目标
          </span>
        )}
      </div>
    </button>
  );
}
