'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check } from 'lucide-react';

function formatNum(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
}

interface HeroSlide {
  id: string;
  image: string;
  alt: string;
}

interface Profile {
  name: string;
  englishName: string;
  avatar: string;
  intro: string;
  tags: string[];
}

interface CommunityStats {
  totalFans: number;
  todayPosts: number;
  totalInteractions: number;
  onlineNow: number;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  profile: Profile;
  communityStats: CommunityStats;
  communityEnabled: boolean;
  eventsEnabled?: boolean;
}

export default function HeroCarousel({ slides, profile, communityStats, communityEnabled, eventsEnabled = true }: HeroCarouselProps) {
  const heroSlides = slides.length > 0 ? slides : [{ id: 'placeholder', image: '', alt: '默认' }];
  const [current, setCurrent] = useState(0);
  const total = heroSlides.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, total]);

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#0a0a0a]">
      {/* Layer 1: Carousel background slides (base layer) */}
      {heroSlides.map((slide, idx) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            idx === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {slide.image && (
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              className="object-cover object-top sm:object-center"
              priority={idx === 0}
            />
          )}
        </div>
      ))}

      {/* Layer 2: Heavy dark wash to unify image into dark tone */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Layer 3: Left vignette for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0) 55%)',
        }}
      />
      {/* Layer 5: Bottom vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 35%)',
        }}
      />

      {/* Content */}
      <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 min-h-screen pt-24 sm:pt-32 pb-10 flex flex-col justify-between">
        {/* Hero text block – left aligned */}
        <div className="max-w-xl mt-8 sm:mt-16">
          <p
            className="animate-fade-in-up inline-flex items-center gap-2 text-white/75 text-sm font-medium"
            style={{ animationDelay: '0.05s' }}
          >
            <Check className="w-4 h-4" /> <span className="font-waterbrush">1103</span>  ·  幺幺零叁
          </p>

          <p
            className="animate-fade-in-up mt-5 text-[20px] sm:text-[24px] lg:text-[28px] leading-[1.3] font-medium text-white/70 tracking-wide font-logo"
            style={{ animationDelay: '0.14s' }}
          >
            成功之路步履蹒跚
          </p>
          <h1
            className="animate-fade-in-up mt-2 text-[42px] sm:text-[56px] lg:text-[64px] leading-[1.05] text-white tracking-tight"
            style={{ animationDelay: '0.22s' }}
          >
            <span className="font-logo">举起呐喊</span>
            <span className="text-white/40 mx-1 font-light">—</span>
            <span className="font-waterbrush text-white inline-block translate-y-[0.02em] tracking-[0.02em]">1103</span>
          </h1>

          <p
            className="animate-fade-in-up mt-5 text-[15px] sm:text-base text-white/65"
            style={{ animationDelay: '0.3s' }}
          >
            恭喜你 发现了一个神秘社区
          </p>

          <div
            className="animate-fade-in-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '0.45s' }}
          >
            {communityEnabled && (
              <Link
                href="/community"
                className="inline-flex items-center justify-center h-11 px-7 rounded-full bg-[#ffffff] text-[#1a1a1a] text-sm font-semibold hover:bg-[#f2f2f2] transition-colors duration-150"
              >
                进入社区
              </Link>
            )}
            {eventsEnabled && (
              <Link
                href="/events"
                className="inline-flex items-center justify-center h-11 px-7 rounded-full border border-white/30 text-white/90 text-sm font-semibold hover:bg-white/10 transition-colors duration-150"
              >
                看看整活
              </Link>
            )}
          </div>
        </div>

      </div>

    </section>
  );
}
