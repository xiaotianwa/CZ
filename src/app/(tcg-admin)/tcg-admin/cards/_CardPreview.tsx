'use client';

/**
 * 右侧 sticky 卡牌实时预览
 * - 直接复用前台 CardFrame 组件，保证"后台所见 = 前台所得"
 * - 表单字段变更立刻反映
 * - imagePath 为空时显示占位框（未上传卡面）
 */

import CardFrame, { type CardSubtype } from '@/components/game/CardFrame';
import type { CardFormData } from './_CardForm';
import { EFFECT_PRESET_MAP, TRIGGER_LABELS } from '@/lib/tcg/effectHooks';
import { Zap } from 'lucide-react';

export default function CardPreview({ form }: { form: CardFormData }) {
  const hasImage = Boolean(form.imagePath);
  const showAttack = form.type === 'character' || form.type === 'equipment';
  const showHealth = form.type === 'character' || form.type === 'equipment';

  return (
    <div
      className="relative rounded-2xl border border-[#A78BFA]/18 p-4 overflow-hidden"
      style={{
        background: 'rgba(23, 23, 48, 0.55)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 8px 32px -12px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* 顶部 1px 渐变高光线 */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A78BFA]/60 to-transparent" />

      {/* Live Preview 标题（居中 + 装饰短线） */}
      <div className="flex items-center justify-center gap-2 text-[#A78BFA]/75 text-[10px] tracking-[0.35em] mb-3 uppercase font-bold">
        <span className="inline-block w-6 h-px bg-[#A78BFA]/50" />
        Live Preview
        <span className="inline-block w-6 h-px bg-[#A78BFA]/50" />
      </div>

      {/* 卡牌主体 */}
      <div className="flex justify-center py-1">
        {hasImage ? (
          <CardFrame
            name={form.name || '卡牌名称'}
            image={form.imagePath!}
            type={form.type}
            subtype={(form.subtype as CardSubtype | null) ?? undefined}
            rarity={form.rarity}
            cost={form.cost}
            attack={showAttack ? (form.attack ?? undefined) : undefined}
            health={showHealth ? (form.health ?? undefined) : undefined}
            description={form.description || undefined}
            flavor={form.flavor ?? undefined}
            interactive={false}
            width={260}
          />
        ) : (
          <PlaceholderCard form={form} />
        )}
      </div>

      {/* 效果钩子摘要 */}
      {form.effectHooks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1.5">
            效果钩子（{form.effectHooks.length}）
          </div>
          <div className="space-y-1">
            {form.effectHooks.map((h, i) => {
              const preset = EFFECT_PRESET_MAP[h.effectId];
              return (
                <div
                  key={i}
                  className="text-[10px] text-white/60 flex items-start gap-1.5 leading-snug"
                >
                  <Zap className="w-2.5 h-2.5 text-[#A78BFA] flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="text-[#C4B5FD]/80">{TRIGGER_LABELS[h.trigger]}</span>
                    <span className="text-white/35"> · </span>
                    <span className="text-white/75">{preset?.label ?? h.effectId}</span>
                    {h.params && Object.keys(h.params).length > 0 && (
                      <span className="text-white/35 font-mono ml-1">
                        {Object.entries(h.params)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(' ')}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 联动 & 关键字摘要 */}
      {(form.synergies.length > 0 || form.keywords.length > 0) && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
          {form.keywords.length > 0 && (
            <div className="flex items-start gap-1.5 text-[10px]">
              <span className="text-white/40 flex-shrink-0">关键字</span>
              <div className="flex flex-wrap gap-1">
                {form.keywords.map((k) => (
                  <span
                    key={k}
                    className="px-1.5 py-px rounded bg-[#7C3AED]/15 text-[#C4B5FD]/80"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
          {form.synergies.length > 0 && (
            <div className="text-[10px] text-white/40">
              联动：<span className="text-white/75">{form.synergies.length}</span> 条
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40">
        <span>
          状态：<span className={statusColor(form.status)}>{form.status}</span>
        </span>
        <span>排序：{form.sortOrder}</span>
      </div>
    </div>
  );
}

function PlaceholderCard({ form }: { form: CardFormData }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed border-white/15 bg-gradient-to-br from-white/[0.02] to-transparent flex flex-col items-center justify-center text-center px-4 gap-2"
      style={{ width: 260, height: 347 }}
    >
      <div className="text-xs text-white/50">{form.name || '卡牌名称'}</div>
      <div className="text-[10px] text-white/30">
        {form.type} · {form.rarity}
        {form.cost > 0 && <> · 费用 {form.cost}</>}
      </div>
      <div className="text-[10px] text-white/30 mt-4 leading-relaxed">
        上传卡面图片后
        <br />
        这里将显示完整预览
      </div>
    </div>
  );
}

function statusColor(status: CardFormData['status']): string {
  switch (status) {
    case 'active':
      return 'text-emerald-300';
    case 'draft':
      return 'text-amber-300';
    case 'disabled':
      return 'text-rose-300';
    default:
      return 'text-white/60';
  }
}
