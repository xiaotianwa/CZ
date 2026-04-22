'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Image from 'next/image';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  image: string | null;
  link: string | null;
  linkText: string | null;
}

const typeConfig: Record<string, { icon: string; accent: string; bg: string }> = {
  info: { icon: '📢', accent: 'text-primary', bg: 'bg-primary' },
  warning: { icon: '⚠️', accent: 'text-warning', bg: 'bg-warning' },
  event: { icon: '🎉', accent: 'text-success', bg: 'bg-success' },
  update: { icon: '🔄', accent: 'text-primary', bg: 'bg-gray-600' },
};

const DISMISSED_KEY = '1103_dismissed_announcements';

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch { return []; }
}

function setDismissed(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

export default function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetch('/api/public/announcements', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.code !== 0 || !res.data?.length) return;
        const allItems = res.data as Announcement[];
        const allIds = new Set(allItems.map((a) => a.id));
        // 清理 localStorage 中已不存在的旧公告 ID，防止僵尸数据
        const dismissed = getDismissed().filter((id) => allIds.has(id));
        setDismissed(dismissed);
        const active = allItems.filter((a) => !dismissed.includes(a.id));
        if (active.length > 0) {
          setAnnouncements(active);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!visible || announcements.length === 0) return null;

  const item = announcements[current];
  const tc = typeConfig[item.type] || typeConfig.info;
  const total = announcements.length;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      // 记住已关闭的公告
      const dismissed = getDismissed();
      const ids = announcements.map((a) => a.id);
      setDismissed(Array.from(new Set([...dismissed, ...ids])));
    }, 200);
  };

  const handleDismissOne = () => {
    // 关闭当前这一条
    const dismissed = getDismissed();
    setDismissed(Array.from(new Set([...dismissed, item.id])));

    const remaining = announcements.filter((a) => a.id !== item.id);
    if (remaining.length === 0) {
      handleClose();
    } else {
      setAnnouncements(remaining);
      setCurrent(Math.min(current, remaining.length - 1));
    }
  };

  const goPrev = () => setCurrent((c) => (c - 1 + total) % total);
  const goNext = () => setCurrent((c) => (c + 1) % total);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200"
      style={{ opacity: closing ? 0 : 1 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Popup */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 顶部色条 */}
        <div className={`h-1 ${tc.bg}`} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{tc.icon}</span>
            <span className={`text-caption font-semibold ${tc.accent}`}>
              {item.type === 'info' ? '公告' : item.type === 'warning' ? '注意' : item.type === 'event' ? '活动' : '更新'}
            </span>
            {total > 1 && (
              <span className="text-[11px] text-text-muted bg-gray-100 px-1.5 py-0.5 rounded-full">
                {current + 1}/{total}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 hover:text-text-body transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5">
          <h3 className="text-[17px] font-bold text-text-title leading-snug">{item.title}</h3>

          {item.image && (
            <div className="mt-3 rounded-xl overflow-hidden relative aspect-[2/1] bg-gray-100">
              <Image src={item.image} alt={item.title} fill className="object-cover" />
            </div>
          )}

          <p className="mt-3 text-body text-text-body leading-relaxed whitespace-pre-line">{item.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary h-9 px-4 text-caption inline-flex items-center gap-1.5"
              >
                {item.linkText || '查看详情'}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={total > 1 ? handleDismissOne : handleClose}
              className="btn-outline h-9 px-4 text-caption"
            >
              {total > 1 ? '知道了' : '关闭'}
            </button>
          </div>
        </div>

        {/* Multi-announcement navigation */}
        {total > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-divider bg-gray-50/50">
            <button
              onClick={goPrev}
              className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 hover:text-text-body transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1.5">
              {announcements.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    i === current ? `${tc.bg} scale-110` : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 hover:text-text-body transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
