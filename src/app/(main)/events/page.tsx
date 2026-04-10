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
          <div className="w-10 h-10 rounded-btn bg-primary-bg flex items-center justify-center">
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
      <section className="section-block pb-6 pt-20 animate-fade-in-up">
        <div className="container-main">
          <h1 className="section-title">活动公告</h1>
          <p className="section-desc">精彩活动，不要错过</p>

          <div className="flex gap-1.5 mt-6">
            {[
              { key: 'all', label: '全部' },
              { key: 'upcoming', label: '即将开始' },
              { key: 'ongoing', label: '进行中' },
              { key: 'ended', label: '已结束' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className={`h-8 px-3 rounded-btn text-body font-medium transition-colors duration-150 cursor-pointer ${
                  filter === f.key ? 'bg-primary text-white' : 'bg-white border border-divider text-text-body hover:border-primary hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <div className="container-main px-4 sm:px-6 lg:px-8 mb-8">
          <Link href={`/events/${featured.id}`} className="card p-0 overflow-hidden grid md:grid-cols-2 cursor-pointer">
            <div className="relative aspect-video md:aspect-auto md:min-h-[280px] bg-gray-100">
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

      {/* Event List */}
      <div className="container-main px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event: any) => (
            <div key={event.id} className="card p-0 overflow-hidden">
              <div className="relative aspect-video bg-gray-100">
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
    </>
  );
}
