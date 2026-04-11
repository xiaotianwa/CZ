'use client';

import { useRouter } from 'next/navigation';
import { LogIn, X } from 'lucide-react';

interface LoginRequiredModalProps {
  open: boolean;
  redirectTo?: string;
  onCancel: () => void;
}

export default function LoginRequiredModal({ open, redirectTo = '/', onCancel }: LoginRequiredModalProps) {
  const router = useRouter();

  if (!open) return null;

  const handleConfirm = () => {
    onCancel();
    router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-xs mx-4 bg-white rounded-card shadow-dropdown animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center flex-shrink-0">
              <LogIn className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-heading-sm text-text-title">需要登录</h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="px-5 pb-5 text-body text-text-body">请先登录后再进行此操作</p>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 h-9 rounded-btn border border-border text-body text-text-body hover:border-primary hover:text-primary transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 h-9 rounded-btn bg-primary text-white text-body font-medium hover:bg-primary-hover transition-colors cursor-pointer"
          >
            去登录
          </button>
        </div>
      </div>
    </div>
  );
}
