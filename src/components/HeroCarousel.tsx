'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Users, TrendingUp, ArrowRight } from 'lucide-react';

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
}

export default function HeroCarousel({ slides, profile, communityStats }: HeroCarouselProps) {
  const heroSlides = slides.length > 0 ? slides : [{ id: 'placeholder', image: '', alt: '默认' }];
  const [current, setCurrent] = useState(0);
  const total = heroSlides.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative h-screen overflow-hidden bg-gray-900">
      {/* Carousel background slides */}
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
              className="object-cover"
              priority={idx === 0}
            />
          )}
        </div>
      ))}

      {/* Dark overlay — left heavier for text, right lighter to show image */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-gray-900/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />

      {/* Slide indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {heroSlides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              idx === current ? 'w-7 bg-primary' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`切换到第 ${idx + 1} 张`}
          />
        ))}
      </div>

      {/* Content — centered & minimal */}
      <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center justify-center h-full text-center">
        <div className="max-w-2xl">
          {/* Avatar */}
          {profile.avatar && (
            <div
              className="animate-fade-in-up relative w-20 h-20 mx-auto mb-6 rounded-full overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-gray-900"
              style={{ animationDelay: '0.1s' }}
            >
              <Image src={profile.avatar} alt={profile.name} fill className="object-cover" priority />
            </div>
          )}

          <h1
            className="animate-fade-in-up text-[36px] sm:text-[52px] leading-[1.1] font-bold text-white tracking-tight"
            style={{ animationDelay: '0.2s' }}
          >
            <span className="text-primary">{profile.name}</span>的专属社区
          </h1>

          <p
            className="animate-fade-in-up mt-3 text-[40px] sm:text-[56px] leading-none text-primary/80"
            style={{ animationDelay: '0.35s', fontFamily: "'Blazed', sans-serif" }}
          >
            {profile.englishName}
          </p>

          <p
            className="animate-fade-in-up text-[15px] leading-[1.7] text-gray-400 mt-5 max-w-md mx-auto"
            style={{ animationDelay: '0.5s' }}
          >
            {profile.intro}
          </p>

          <div
            className="animate-fade-in-up flex items-center justify-center gap-3 mt-8"
            style={{ animationDelay: '0.65s' }}
          >
            <Link
              href="/join"
              className="btn-primary inline-flex items-center gap-1.5 h-11 px-7 text-base"
            >
              加入社区 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 h-11 px-7 rounded-btn text-body font-medium text-white border border-white/25 cursor-pointer hover:bg-white/10 transition-colors duration-150"
            >
              了解更多
            </Link>
          </div>

          {/* Stats row */}
          <div
            className="animate-fade-in-up flex items-center justify-center gap-6 mt-10 text-sm"
            style={{ animationDelay: '0.8s' }}
          >
            <div className="flex items-center gap-1.5 text-gray-400">
              <Users className="w-4 h-4 text-primary/60" />
              <span className="font-semibold text-white">{formatNum(communityStats.totalFans)}</span>
              <span>泽小将</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              {communityStats.onlineNow > 0 ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="font-semibold text-white">{formatNum(communityStats.onlineNow)}</span>
                  <span>位泽小将在互动</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 text-primary/60" />
                  <span>期待你的互动</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
