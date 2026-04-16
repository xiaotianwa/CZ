'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Users } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  description: string;
  cover: string;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
  participants: number;
}

function formatNum(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toLocaleString();
}

function useCountdown(targetDate: string) {
  const [left, setLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return;
      setLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff / 3600000) % 24),
        m: Math.floor((diff / 60000) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return left;
}

function Countdown({ date }: { date: string }) {
  const t = useCountdown(date);
  return (
    <div className="flex gap-2 mt-3">
      {[
        { v: t.d, l: '天' }, { v: t.h, l: '时' }, { v: t.m, l: '分' }, { v: t.s, l: '秒' },
      ].map((i) => (
        <div key={i.l} className="text-center">
          <div className="w-10 h-10 rounded-btn bg-primary-bg dark:bg-primary/15 flex items-center justify-center">
            <span className="text-heading-sm text-primary">{String(i.v).padStart(2, '0')}</span>
          </div>
          <span className="text-caption text-text-muted">{i.l}</span>
        </div>
      ))}
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'ended'>('all');

  useEffect(() => {
    fetch('/api/public/events')
      .then((r) => r.json())
      .then((res) => { if (res.data) setEvents(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.status === filter);
  const featured = events.find((e) => e.status === 'upcoming') || events[0];

  return (
    <>
      {/* Cover Banner */}
      <section className="relative h-48 sm:h-56 bg-gray-900 overflow-hidden mt-14">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 flex items-center justify-center gap-4 sm:gap-6 select-none pointer-events-none">
          <span className="text-[56px] sm:text-[80px] leading-none font-bold text-white/10" style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span>
          <span className="text-[28px] sm:text-[40px] leading-none text-primary/50 tracking-[0.15em]" style={{ fontFamily: "'Blazed', sans-serif" }}>ChenZe</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-page to-transparent" />
        <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 h-full flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-caption font-medium text-primary">1103 活动日历</span>
          </div>
          <h1 className="text-heading-lg text-white">活动公告</h1>
          <p className="text-body text-gray-400 mt-1.5 max-w-md mx-auto">
            把即将开始、进行中和已经结束的活动集中展示。
          </p>
        </div>
      </section>

      <div className="container-main px-4 sm:px-6 lg:px-8 mt-6">
        <div className="sticky top-16 z-20 -mx-1 rounded-card border border-divider bg-white/95 dark:bg-[#1e1e22]/95 p-3 shadow-sm backdrop-blur sm:mx-0 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-caption font-medium text-text-title">{filter === 'all' ? '全部活动' : filter === 'upcoming' ? '即将开始' : filter === 'ongoing' ? '进行中' : '已结束'}</p>
              <p className="mt-1 text-caption leading-6 text-text-muted">切换活动状态，快速筛选你当前最关心的活动内容。</p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-full bg-gray-50 dark:bg-[#28282c] p-1">
              {[
                { key: 'all', label: '全部' },
                { key: 'upcoming', label: '即将开始' },
                { key: 'ongoing', label: '进行中' },
                { key: 'ended', label: '已结束' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key as typeof filter)}
                  className={`h-8 rounded-full px-3 text-body font-medium transition-colors duration-150 cursor-pointer ${
                    filter === f.key ? 'bg-white dark:bg-[#1e1e22] text-primary shadow-sm' : 'text-text-muted hover:text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {featured && (
        <div className="container-main px-4 sm:px-6 lg:px-8 mb-8 mt-6">
          <Link href={`/events/${featured.id}`} className="grid cursor-pointer overflow-hidden rounded-card bg-white/40 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/50 dark:hover:bg-[#1e1e22] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.10)] md:grid-cols-2">
            <div className="relative aspect-video md:aspect-auto md:min-h-[280px] bg-gray-100 dark:bg-[#28282c]">
              <Image src={featured.cover} alt={featured.title} fill className="object-cover" />
            </div>
            <div className="p-6">
              <span className="tag-primary mb-2">即将开始</span>
              <h2 className="text-heading text-text-title mt-2">{featured.title}</h2>
              <p className="text-body text-text-muted mt-2 line-clamp-2">{featured.description}</p>

              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-caption text-text-muted">
                  <Calendar className="w-3.5 h-3.5" /> {new Date(featured.startTime).toLocaleString('zh-CN')}
                </div>
                <div className="flex items-center gap-2 text-caption text-text-muted">
                  <MapPin className="w-3.5 h-3.5" /> {featured.location}
                </div>
                <div className="flex items-center gap-2 text-caption text-text-muted">
                  <Users className="w-3.5 h-3.5" /> {formatNum(featured.participants)} 人感兴趣
                </div>
              </div>

              <Countdown date={featured.startTime} />
            </div>
          </Link>
        </div>
      )}

      <div className="section-block relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(24,144,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(250,173,20,0.05) 0%, transparent 60%)',
        }} />
        <div className="container-main relative z-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filteredEvents.map((event: any) => (
            <div key={event.id} className="overflow-hidden rounded-card bg-white/40 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/50 dark:hover:bg-[#1e1e22] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.10)]">
              <div className="relative aspect-video bg-gray-100 dark:bg-[#28282c]">
                <Image src={event.cover} alt={event.title} fill className="object-cover" />
                <div className="absolute top-2 left-2">
                  <span className={`tag text-white ${event.status === 'upcoming' ? 'bg-primary' : event.status === 'ongoing' ? 'bg-success' : 'bg-gray-400'}`}>
                    {event.status === 'upcoming' ? '即将开始' : event.status === 'ongoing' ? '进行中' : '已结束'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-body font-medium text-text-title line-clamp-1">{event.title}</p>
                <p className="text-caption text-text-muted mt-1 line-clamp-2">{event.description}</p>

                <div className="space-y-1.5 mt-3">
                  <div className="flex items-center gap-1.5 text-caption text-text-muted">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(event.startTime).toLocaleDateString('zh-CN')}
                  </div>
                  <div className="flex items-center gap-1.5 text-caption text-text-muted">
                    <MapPin className="w-3.5 h-3.5" /> <span className="truncate">{event.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-divider">
                  <span className="text-caption text-text-muted">{formatNum(event.participants)} 人感兴趣</span>
                  <Link href={`/events/${event.id}`} className="text-caption text-primary font-medium cursor-pointer hover:underline">详情</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </>
  );
}
