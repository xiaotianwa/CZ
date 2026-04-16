'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colors: Record<ToastType, { border: string; icon: string; progress: string }> = {
  success: { border: 'border-green-200 dark:border-green-800', icon: 'text-success', progress: 'bg-success/60' },
  error: { border: 'border-red-200 dark:border-red-800', icon: 'text-danger', progress: 'bg-danger/60' },
  info: { border: 'border-blue-200 dark:border-blue-800', icon: 'text-primary', progress: 'bg-primary/60' },
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon = icons[item.type];
  const c = colors[item.type];

  return (
    <div className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-card shadow-dropdown border bg-white dark:bg-[#1e1e22] ${c.border} animate-fade-in-up`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${c.icon}`} />
      <span className="text-body text-text-title max-w-xs">{item.message}</span>
      <button onClick={onClose} className="p-0.5 rounded-btn text-text-muted hover:bg-gray-100 dark:hover:bg-[#28282c] cursor-pointer flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
      {item.duration > 0 && (
        <span
          className={`absolute left-0 bottom-0 h-0.5 ${c.progress}`}
          style={{
            animation: `toast-shrink ${item.duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed z-[200] top-20 right-4 sm:right-6 flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastCard item={t} onClose={() => remove(t.id)} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
