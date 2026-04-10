'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = '确认操作',
  message,
  confirmText = '确定',
  cancelText = '取消',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, onCancel]);

  if (!open) return null;

  const iconColor = variant === 'danger' ? 'text-danger bg-red-50' : variant === 'warning' ? 'text-warning bg-orange-50' : 'text-primary bg-primary-bg';
  const btnClass = variant === 'danger'
    ? 'bg-danger hover:bg-red-600 text-white'
    : variant === 'warning'
      ? 'bg-warning hover:bg-orange-600 text-white'
      : 'btn-primary';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={onCancel} />
      <div className="relative bg-white rounded-card shadow-dropdown w-full max-w-sm p-6 animate-in zoom-in-95 fade-in duration-200">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-body font-semibold text-text-title">{title}</h3>
            <p className="text-caption text-text-muted mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="h-9 px-4 rounded-btn border border-border text-body font-medium text-text-body hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`h-9 px-4 rounded-btn text-body font-medium transition-colors cursor-pointer ${btnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
