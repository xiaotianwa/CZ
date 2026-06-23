'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface WelcomeVideoProps {
  onFinished: () => void;
}

export default function WelcomeVideo({ onFinished }: WelcomeVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [show, setShow] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    // 短暂延迟后显示视频，确保 DOM 已渲染
    const timer = setTimeout(() => setShow(true), 100);
    // 3 秒后允许跳过
    const skipTimer = setTimeout(() => setCanSkip(true), 3000);
    return () => {
      clearTimeout(timer);
      clearTimeout(skipTimer);
    };
  }, []);

  const handleVideoEnd = useCallback(() => {
    onFinished();
  }, [onFinished]);

  const handleSkip = useCallback(() => {
    if (canSkip && videoRef.current) {
      videoRef.current.pause();
      onFinished();
    }
  }, [canSkip, onFinished]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleSkip();
      }
    },
    [handleSkip]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src="/videos/welcome.mp4"
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        className="w-full h-full object-contain"
        style={{ maxWidth: '100vw', maxHeight: '100vh' }}
      />

      {/* 跳过按钮 */}
      {canSkip && (
        <button
          onClick={handleSkip}
          className="absolute bottom-8 right-8 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-md text-white/80 text-sm font-medium border border-white/20 hover:bg-white/25 hover:text-white transition-all duration-200 cursor-pointer"
        >
          跳过
        </button>
      )}

      {/* 进度提示 */}
      {!canSkip && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-xs">
          欢迎回来
        </div>
      )}
    </div>
  );
}
