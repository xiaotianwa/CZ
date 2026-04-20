'use client';

/**
 * GameDialog —— 游戏区通用弹窗（深色玻璃态 / 霓虹紫）
 *
 * 两种形态：
 * - GamePromptDialog：输入型（替代原生 window.prompt）
 * - GameConfirmDialog：确认型（替代原生 window.confirm）
 *
 * 特性：
 * - 点击遮罩、Esc 取消
 * - Prompt 模式：Enter 提交、自动聚焦 + 全选默认值
 * - Confirm 模式：自动聚焦确认按钮
 * - 视觉风格与 /game 页面 glass-card 体系一致
 */

import React, { useEffect, useRef, useState } from 'react';

// ============ 通用 Shell ============

interface DialogShellProps {
  open: boolean;
  onCancel: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** 是否允许点击遮罩关闭（默认 true） */
  dismissOnOverlay?: boolean;
}

function DialogShell({ open, onCancel, title, children, footer, dismissOnOverlay = true }: DialogShellProps) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    // 锁滚
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={() => dismissOnOverlay && onCancel()}
      />
      {/* 弹窗主体 */}
      <div
        className={[
          'relative w-full max-w-sm rounded-2xl p-5',
          'border border-[#A78BFA]/30',
          'bg-[linear-gradient(180deg,rgba(30,20,60,0.95)_0%,rgba(15,10,35,0.95)_100%)]',
          'shadow-[0_10px_40px_-10px_rgba(124,58,237,0.55),0_0_0_1px_rgba(168,139,250,0.15)]',
          'animate-in zoom-in-95 fade-in duration-200',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-base tracking-wide">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="关闭"
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white/55 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="text-white/85 text-sm">{children}</div>

        <div className="flex justify-end gap-2 mt-5">{footer}</div>
      </div>
    </div>
  );
}

// ============ GamePromptDialog ============

interface GamePromptDialogProps {
  open: boolean;
  title: string;
  /** 输入框上方的标签（可选） */
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  /** 最大长度（默认 24） */
  maxLength?: number;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function GamePromptDialog({
  open,
  title,
  label,
  placeholder,
  defaultValue = '',
  confirmText = '确定',
  cancelText = '取消',
  maxLength = 24,
  onConfirm,
  onCancel,
}: GamePromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // 每次打开时，重置为最新默认值并全选
  useEffect(() => {
    if (!open) return;
    setValue(defaultValue);
    // 下一帧聚焦 + 全选，避免初始 render 时 ref 还没挂载
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [open, defaultValue]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <DialogShell open={open} onCancel={onCancel} title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-md text-sm font-medium text-white/80 border border-white/15 bg-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className="px-4 py-1.5 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#8B5CF6] hover:to-[#C084FC] border border-[#A78BFA]/50 shadow-[0_0_14px_-2px_rgba(124,58,237,0.7)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            {confirmText}
          </button>
        </>
      }
    >
      {label && <label className="block text-white/60 text-xs mb-1.5 tracking-wide">{label}</label>}
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        className="w-full px-3 py-2 rounded-md bg-black/40 border border-[#A78BFA]/25 text-white text-sm placeholder-white/30 outline-none focus:border-[#A78BFA]/70 focus:ring-2 focus:ring-[#A78BFA]/30 transition-all"
      />
      <div className="mt-1.5 text-right text-[10px] text-white/35 tabular-nums">
        {value.length} / {maxLength}
      </div>
    </DialogShell>
  );
}

// ============ GameConfirmDialog ============

interface GameConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function GameConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  variant = 'default',
  onConfirm,
  onCancel,
}: GameConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => confirmRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const confirmClass =
    variant === 'danger'
      ? 'text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 border border-rose-400/50 shadow-[0_0_14px_-2px_rgba(244,63,94,0.7)]'
      : 'text-white bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#8B5CF6] hover:to-[#C084FC] border border-[#A78BFA]/50 shadow-[0_0_14px_-2px_rgba(124,58,237,0.7)]';

  return (
    <DialogShell open={open} onCancel={onCancel} title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-md text-sm font-medium text-white/80 border border-white/15 bg-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${confirmClass}`}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="leading-relaxed">{message}</p>
    </DialogShell>
  );
}

// ============ Icon ============

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
