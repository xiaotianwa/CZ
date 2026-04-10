'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Users, MessageSquare, TrendingUp, ArrowRight, Gamepad2 } from 'lucide-react';

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

      {/* Content */}
      <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 pt-24 sm:pt-28 pb-20">
        <div className="grid lg:grid-cols-[1fr_280px] gap-12 items-center">
          <div>
            {/* Online badge */}
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
              <Gamepad2 className="w-4 h-4 text-primary" />
              <span className="text-caption font-medium text-primary">
                {formatNum(communityStats.onlineNow)} 老铁正在互动
              </span>
            </div>

            <h1 className="text-[32px] sm:text-[44px] leading-[1.15] font-bold text-white tracking-tight">
              欢迎来到
              <br />
              <span className="text-primary">{profile.name}</span>的专属社区
            </h1>

            <p className="mt-4 text-[48px] sm:text-[64px] leading-none text-primary" style={{ fontFamily: "'Blazed', sans-serif" }}>
              {profile.englishName}
            </p>

            <p className="text-[15px] leading-[1.8] text-gray-300 mt-4 max-w-lg">
              {profile.intro}
            </p>

            <div className="flex items-center gap-3 mt-8">
              <Link
                href="/join"
                className="btn-primary inline-flex items-center gap-1.5 h-11 px-6 text-base"
              >
                加入社区 <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-btn text-body font-medium text-white border border-white/25 cursor-pointer hover:bg-white/10 transition-colors duration-150"
              >
                了解更多
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-3 mt-10">
              {[
                { label: '社区粉丝', value: formatNum(communityStats.totalFans), icon: Users },
                { label: '今日帖子', value: formatNum(communityStats.todayPosts), icon: MessageSquare },
                { label: '总互动', value: formatNum(communityStats.totalInteractions), icon: TrendingUp },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-card px-4 py-3">
                  <s.icon className="w-4 h-4 text-primary" />
                  <span className="text-heading-sm text-white">{s.value}</span>
                  <span className="text-caption text-gray-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Profile card */}
          <div className="hidden lg:block">
            <div className="bg-gray-800 border border-gray-700 rounded-card p-5">
              <div className="relative rounded-card overflow-hidden aspect-square bg-gray-700">
                {profile.avatar && <Image src={profile.avatar} alt={profile.name} fill className="object-cover" priority />}
              </div>
              <div className="mt-4 text-center">
                <p className="text-heading-sm text-white">{profile.name}</p>
                <p className="text-caption text-primary mt-1">{profile.englishName}</p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {profile.tags.slice(0, 4).map((tag: string) => (
                    <span key={tag} className="bg-gray-700 border border-gray-600 rounded-tag px-2.5 py-1 text-caption font-medium text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
