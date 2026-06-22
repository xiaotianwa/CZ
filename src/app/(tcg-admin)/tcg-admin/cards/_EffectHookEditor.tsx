'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Clock3, Plus, Sparkles, Wand2, X, Zap } from 'lucide-react';
import {
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

const COMMON_EFFECT_IDS = [
  'draw_cards',
  'damage_target',
  'damage_enemy_hero',
  'heal_self_hero',
  'buff_all_friendly',
  'silence_target',
  'destroy_enemy_weapon',
  'restore_hero_mana_turn',
] as const;

export default function EffectHookEditor({ value, onChange }: EffectHookEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const grouped = useMemo(() => groupPresetsByCategory(), []);
  const commonPresets = useMemo(
    () => COMMON_EFFECT_IDS
      .map((id) => EFFECT_PRESET_MAP[id])
      .filter((preset): preset is EffectPreset => Boolean(preset)),
    [],
  );

  const update = (idx: number, patch: Partial<CardEffectHook>) => {
    onChange(value.map((hook, i) => (i === idx ? { ...hook, ...patch } : hook)));
  };

  const updateParam = (idx: number, key: string, val: number | string | boolean) => {
    onChange(value.map((hook, i) => {
      if (i !== idx) return hook;
      return { ...hook, params: { ...(hook.params ?? {}), [key]: val } };
    }));
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const add = (preset: EffectPreset) => {
    onChange([...value, createHookFromPreset(preset)]);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <GuideCard
          icon={<Clock3 className="w-4 h-4" />}
          title="钩子就是触发时机"
          text="先想清楚这张卡什么时候生效：打出时、死亡时、装备时、回合开始，或暗箱触发时。"
        />
        <GuideCard
          icon={<Zap className="w-4 h-4" />}
          title="技能就是要做什么"
          text="再选择具体效果：抽牌、造成伤害、回血、加攻加血、沉默、摧毁装备等。"
        />
      </div>

      {value.length === 0 ? (
        <div className="px-4 py-6 rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-center">
          <Sparkles className="w-6 h-6 mx-auto mb-2 text-[#A78BFA]/70" />
          <p className="text-sm text-white/65">这张卡还没有普通效果</p>
          <p className="text-[11px] text-white/40 mt-1">白板卡可以不填；需要技能就点下面的“添加效果”。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((hook, idx) => (
            <HookRow
              key={`${hook.effectId}-${idx}`}
              index={idx}
              hook={hook}
              preset={EFFECT_PRESET_MAP[hook.effectId]}
              onTriggerChange={(trigger) => update(idx, { trigger })}
              onParamChange={(key, paramValue) => updateParam(idx, key, paramValue)}
              onRemove={() => remove(idx)}
            />
          ))}
        </div>
      )}

      <div>
        {!pickerOpen ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={value.length >= 10}
            className="h-9 px-4 rounded-md bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-[#C4B5FD] text-xs hover:bg-[#7C3AED]/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            添加效果
            <span className="text-white/35 ml-1">{value.length}/10</span>
          </button>
        ) : (
          <div className="rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/[0.04] p-3 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white font-semibold">选择这张卡要做的事</div>
                <div className="text-[11px] text-white/45 mt-0.5">选中后会自动带出推荐触发时机和默认参数。</div>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="h-7 w-7 rounded-md hover:bg-white/10 text-white/50 flex items-center justify-center"
                aria-label="关闭效果选择"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#C4B5FD] font-semibold mb-2">
                <Wand2 className="w-3.5 h-3.5" />
                常用效果
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {commonPresets.map((preset) => (
                  <PresetCard key={preset.id} preset={preset} onPick={() => add(preset)} compact />
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {Object.entries(grouped).map(([category, presets]) => (
                <div key={category}>
                  <div className="text-[10px] tracking-wider text-white/35 uppercase mb-1.5">{category}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {presets.map((preset) => (
                      <PresetCard key={preset.id} preset={preset} onPick={() => add(preset)} />
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

function GuideCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-white/85">
        <span className="text-[#A78BFA]">{icon}</span>
        {title}
      </div>
      <p className="text-[11px] leading-relaxed text-white/45 mt-1.5">{text}</p>
    </div>
  );
}

function HookRow({
  index,
  hook,
  preset,
  onTriggerChange,
  onParamChange,
  onRemove,
}: {
  index: number;
  hook: CardEffectHook;
  preset: EffectPreset | undefined;
  onTriggerChange: (trigger: EffectTrigger) => void;
  onParamChange: (key: string, value: number | string | boolean) => void;
  onRemove: () => void;
}) {
  const isUnknown = !preset;

  return (
    <div className={`rounded-lg border p-3 ${isUnknown ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-[#7C3AED]/20 bg-[#7C3AED]/[0.03]'}`}>
      <div className="flex items-start gap-3">
        <div className="h-7 w-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[11px] text-white/55 font-semibold">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[190px_minmax(0,1fr)] gap-3">
            <label className="block">
              <span className="block text-[11px] text-white/50 mb-1">什么时候触发</span>
              <select
                value={hook.trigger}
                onChange={(e) => onTriggerChange(e.target.value as EffectTrigger)}
                className="input-tcg !h-8 !text-xs"
                title={TRIGGER_HINTS[hook.trigger]}
              >
                {EFFECT_TRIGGERS.map((trigger) => (
                  <option key={trigger} value={trigger}>
                    {TRIGGER_LABELS[trigger]}
                  </option>
                ))}
              </select>
              <span className="block text-[10px] text-white/35 mt-1 leading-snug">
                {TRIGGER_HINTS[hook.trigger]}
              </span>
            </label>

            <div>
              <span className="block text-[11px] text-white/50 mb-1">触发后做什么</span>
              <div className="min-h-8 rounded-md border border-white/10 bg-[#0f0f23]/70 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  {isUnknown ? (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-[#A78BFA] flex-shrink-0" />
                  )}
                  <div className="text-xs text-white/90 font-medium truncate">
                    {preset?.label ?? hook.effectId}
                  </div>
                  {preset?.needsTarget && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[#F0B340]/10 text-[#F0B340]/85 border border-[#F0B340]/20">
                      需要选目标
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/35 font-mono mt-0.5 truncate">{hook.effectId}</div>
                {preset?.description && (
                  <div className="text-[11px] text-white/45 mt-1 leading-snug">{preset.description}</div>
                )}
                {isUnknown && (
                  <div className="text-[11px] text-amber-300/85 mt-1 leading-snug">
                    这是旧数据或开发者手写效果，不在当前技能库中；保存时会保留原值。
                  </div>
                )}
              </div>
            </div>
          </div>

          {preset?.params && preset.params.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {preset.params.map((param) => {
                const raw = hook.params?.[param.key];
                return (
                  <label key={param.key} className="block">
                    <span className="block text-[11px] text-white/50 mb-1">
                      {param.label}
                      {param.hint && <span className="text-white/30 ml-1">· {param.hint}</span>}
                    </span>
                    {param.type === 'number' ? (
                      <input
                        type="number"
                        value={typeof raw === 'number' ? raw : (typeof raw === 'string' ? raw : (param.default ?? 0))}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          onParamChange(param.key, Number.isFinite(next) ? next : 0);
                        }}
                        min={param.min}
                        max={param.max}
                        className="input-tcg !h-8 !text-xs"
                      />
                    ) : (
                      <input
                        type="text"
                        value={typeof raw === 'string' ? raw : String(raw ?? param.default ?? '')}
                        onChange={(e) => onParamChange(param.key, e.target.value)}
                        className="input-tcg !h-8 !text-xs"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 rounded-md bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-300 flex items-center justify-center flex-shrink-0"
          title="删除这个效果"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  onPick,
  compact = false,
}: {
  preset: EffectPreset;
  onPick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="text-left px-2.5 py-2 rounded-md border border-white/10 bg-white/[0.02] hover:bg-[#7C3AED]/15 hover:border-[#7C3AED]/30 transition-colors group"
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <Zap className="w-3 h-3 text-[#A78BFA]/70 group-hover:text-[#A78BFA]" />
        <span className="text-xs text-white/90 font-medium truncate">{preset.label}</span>
      </div>
      {!compact && (
        <div className="text-[10px] text-white/45 leading-snug line-clamp-2">{preset.description}</div>
      )}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-[9px] px-1.5 py-px rounded bg-[#7C3AED]/15 text-[#C4B5FD]/75">
          默认：{TRIGGER_LABELS[preset.defaultTrigger]}
        </span>
        {preset.needsTarget && (
          <span className="text-[9px] px-1.5 py-px rounded bg-[#F0B340]/10 text-[#F0B340]/80">
            需要目标
          </span>
        )}
      </div>
    </button>
  );
}
