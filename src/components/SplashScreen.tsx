'use client';

import { useState, useEffect } from 'react';

type Phase = 'loading' | 'ready' | 'exiting' | 'gone';

export default function SplashScreen() {
  const [phase, setPhase] = useState<Phase>('loading');

  useEffect(() => {
    if (sessionStorage.getItem('splash_done')) {
      setPhase('gone');
      return;
    }

    // Wait min 1.5s + page load, then show enter button
    const start = Date.now();
    const checkReady = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= 1500 && document.readyState === 'complete') {
        setPhase('ready');
      } else {
        setTimeout(checkReady, 200);
      }
    };
    setTimeout(checkReady, 1500);
  }, []);

  const handleEnter = () => {
    // User click = browser allows audio playback
    window.dispatchEvent(new CustomEvent('splash-enter'));
    setPhase('exiting');
    sessionStorage.setItem('splash_done', '1');
    setTimeout(() => setPhase('gone'), 600);
  };

  if (phase === 'gone') return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-950 transition-all duration-600 ${
        phase === 'exiting' ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background subtle glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      {/* Brand - large centered */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <span
          className="text-[80px] sm:text-[100px] leading-none font-bold fire-text"
          style={{ fontFamily: "'Blazed', sans-serif" }}
        >
          1103
        </span>
        <span
          className="text-[28px] sm:text-[36px] leading-none tracking-[0.2em] fire-text fire-text-glow"
          style={{ fontFamily: "'Blazed', sans-serif" }}
        >
          ChenZe
        </span>
      </div>

      <p className="text-sm text-white/20 mb-12">1103 社区</p>

      {/* Loading / Enter */}
      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-[pulse_1s_ease-in-out_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-[pulse_1s_ease-in-out_infinite_0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-[pulse_1s_ease-in-out_infinite_0.4s]" />
          </div>
          <span className="text-xs text-white/20">加载中...</span>
        </div>
      )}

      {phase === 'ready' && (
        <button
          onClick={handleEnter}
          className="group relative px-8 py-3 rounded-full bg-white/10 text-white/80 text-sm font-medium
                     backdrop-blur border border-white/10 cursor-pointer
                     hover:bg-white/15 hover:text-white hover:border-white/20
                     active:scale-95 transition-all duration-200
                     animate-[fadeInUp_0.5s_ease-out]"
        >
          进入社区
          <span className="absolute inset-0 rounded-full bg-white/5 animate-[ping_2s_ease-in-out_infinite] pointer-events-none" />
        </button>
      )}
    </div>
  );
}
