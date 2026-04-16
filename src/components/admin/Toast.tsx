'use client';

import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  open: boolean;
  message: string;
  type?: 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ open, message, type = 'error', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    if (open && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  const isError = type === 'error';

  return (
    <div className="fixed z-[200] left-1/2 -translate-x-1/2 bottom-6 sm:left-auto sm:translate-x-0 sm:bottom-auto sm:top-6 sm:right-6 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-card shadow-dropdown border ${isError ? 'bg-white border-red-100' : 'bg-white border-green-100'}`}>
        {isError ? (
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
        ) : (
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
        )}
        <span className="text-body text-text-title max-w-xs">{message}</span>
        <button onClick={onClose} className="p-0.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
        {duration > 0 && (
          <span
            className={`absolute left-0 bottom-0 h-0.5 ${isError ? 'bg-danger/60' : 'bg-success/60'} animate-[toast-progress_linear_forwards]`}
            style={{ animationDuration: `${duration}ms` }}
          />
        )}
      </div>
    </div>
  );
}
