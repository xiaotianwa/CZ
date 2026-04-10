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
    <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-card shadow-dropdown border ${isError ? 'bg-white border-red-100' : 'bg-white border-green-100'}`}>
        {isError ? (
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
        ) : (
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
        )}
        <span className="text-body text-text-title max-w-xs">{message}</span>
        <button onClick={onClose} className="p-0.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
