'use client';

import { useRef, useState, useEffect } from 'react';
import { Clapperboard, Trophy, Music, Flame, Pin } from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; glow: string; bg: string }> = {
  debut:     { icon: <Clapperboard className="w-5 h-5" />, color: 'from-green-400 to-emerald-500', glow: 'shadow-[0_0_16px_rgba(52,211,153,0.5)]', bg: 'bg-emerald-500' },
  award:     { icon: <Trophy className="w-5 h-5" />, color: 'from-amber-400 to-yellow-500', glow: 'shadow-[0_0_16px_rgba(251,191,36,0.5)]', bg: 'bg-amber-500' },
  release:   { icon: <Music className="w-5 h-5" />, color: 'from-blue-400 to-cyan-500', glow: 'shadow-[0_0_16px_rgba(56,189,248,0.5)]', bg: 'bg-cyan-500' },
  milestone: { icon: <Flame className="w-5 h-5" />, color: 'from-orange-400 to-red-500', glow: 'shadow-[0_0_16px_rgba(251,146,60,0.5)]', bg: 'bg-orange-500' },
  event:     { icon: <Pin className="w-5 h-5" />, color: 'from-blue-400 to-indigo-500', glow: 'shadow-[0_0_16px_rgba(99,102,241,0.5)]', bg: 'bg-indigo-500' },
};

export default function StickyTimeline({ events }: { events: TimelineEvent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const viewportH = window.innerHeight;

      // How far the container top has scrolled past the viewport top
      const scrolled = Math.max(0, -rect.top);
      // Total scrollable distance = container height minus one viewport
      const totalScroll = rect.height - viewportH;
      if (totalScroll <= 0) return;

      const progress = Math.min(1, Math.max(0, scrolled / totalScroll));

      // Map progress [0, 1] → index [0, N-1]
      const newIndex = Math.min(
        events.length - 1,
        Math.floor(progress * events.length)
      );
      setActiveIndex(newIndex);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [events.length]);

  if (events.length === 0) return null;

  // (N-1) steps to go from first → last event. Each step = 30vh scroll.
  // Plus exactly 100vh for the sticky viewport. Last event → sticky releases immediately.
  const stepsNeeded = Math.max(1, events.length - 1);
  const vhPerStep = 30;
  const totalHeight = stepsNeeded * vhPerStep + 100; // vh

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: `${totalHeight}vh` }}
    >
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen flex items-center justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
          {/* Title */}
          <div className="text-center mb-10">
            <h2 className="text-heading-lg text-text-title mb-1">成功之路步履蹒跚</h2>
            <p className="text-heading-sm text-text-body">举起呐喊 <span className="font-blazed text-primary">1103</span></p>
          </div>

          <div className="flex items-start gap-8 md:gap-12">
            {/* Left: Timeline rail */}
            <div className="flex flex-col items-center flex-shrink-0 pt-2">
              {events.map((event, idx) => {
                const tc = typeConfig[event.type] || typeConfig.event;
                const isActive = idx === activeIndex;
                const isPast = idx < activeIndex;
                return (
                  <div key={event.id} className="flex flex-col items-center">
                    {idx > 0 && (
                      <div className={`w-px h-5 transition-colors duration-400 ${isPast || isActive ? 'bg-primary' : 'bg-gray-200'}`} />
                    )}
                    <button
                      onClick={() => setActiveIndex(idx)}
                      className={`relative rounded-full flex items-center justify-center text-white transition-all duration-400 cursor-pointer ${
                        isActive
                          ? `w-10 h-10 bg-gradient-to-br ${tc.color} ${tc.glow}`
                          : isPast
                            ? `w-6 h-6 bg-gradient-to-br ${tc.color} opacity-50`
                            : 'w-6 h-6 bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isActive && tc.icon}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Right: Irregular stacked cards */}
            <div className="relative flex-1 h-[260px]">
              {events.map((event, idx) => {
                const tc = typeConfig[event.type] || typeConfig.event;
                const isActive = idx === activeIndex;
                const offset = idx - activeIndex;
                const absOffset = Math.abs(offset);

                // Irregular offsets for stacked deck feel
                const rotations = [-2.5, 1.8, -1.2, 2.4, -1.8, 1.5, -2.0, 2.2];
                const xShifts = [8, -6, 10, -8, 6, -10, 8, -6];
                const yShifts = [6, -4, 8, -6, 4, -8, 6, -4];

                const rot = rotations[idx % rotations.length];
                const xShift = xShifts[idx % xShifts.length];
                const yShift = yShifts[idx % yShifts.length];

                let transform: string;
                let opacity: number;

                if (isActive) {
                  transform = 'translateX(0) translateY(0) rotate(0deg) scale(1)';
                  opacity = 1;
                } else if (absOffset <= 2) {
                  transform = `translateX(${xShift * absOffset}px) translateY(${offset * 12 + yShift}px) rotate(${rot}deg) scale(${1 - absOffset * 0.04})`;
                  opacity = absOffset === 1 ? 0.5 : 0.2;
                } else {
                  transform = `translateX(${xShift * 3}px) translateY(${offset * 12}px) rotate(${rot}deg) scale(0.88)`;
                  opacity = 0;
                }

                return (
                  <div
                    key={event.id}
                    className="absolute inset-x-0 top-0 transition-all duration-600 ease-out"
                    style={{
                      opacity,
                      transform,
                      zIndex: events.length - absOffset,
                      pointerEvents: isActive ? 'auto' : 'none',
                    }}
                  >
                    <div className="rounded-2xl p-6 sm:p-8 bg-white/50 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_8px_32px_rgba(0,0,0,0.08)]">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-bold text-white bg-gradient-to-r ${tc.color}`}>
                          {tc.icon}
                          {event.date}
                        </span>
                        <span className="text-caption text-text-muted">{idx + 1} / {events.length}</span>
                      </div>
                      <h3 className="text-heading text-text-title mb-2">{event.title}</h3>
                      <p className="text-body text-text-body leading-relaxed">{event.description}</p>

                      <div className="mt-5 flex items-center gap-1.5">
                        {events.map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 rounded-full transition-all duration-500 ${
                              i === activeIndex
                                ? `flex-[3] bg-gradient-to-r ${tc.color}`
                                : i < activeIndex ? 'flex-1 bg-primary/30' : 'flex-1 bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
