'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
      <div className="glass max-w-md w-full p-8 text-center space-y-4">
        <div className="text-5xl">😵</div>
        <h2 className="text-xl font-bold text-text-title">页面出错了</h2>
        <p className="text-text-body text-sm">
          抱歉，页面遇到了一些问题。请尝试刷新页面。
        </p>
        {error.digest && (
          <p className="text-text-muted text-xs">错误代码：{error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-block px-6 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}
