'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Palette, Play, Image as ImageIcon, Star, ExternalLink, User, Plus, Upload, X, Clock, CheckCircle2, XCircle, Loader2, Link2, Trophy, Vote, ChevronDown, ChevronUp } from 'lucide-react';
import SafeImage from '@/components/SafeImage';

interface FanWorkItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  cover: string;
  contentUrl: string | null;
  images: string;
  authorName: string;
  authorAvatar: string | null;
  userId: string | null;
  source: string | null;
  sourceUrl: string | null;
  likes: number;
  isFeatured: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Palette; color: string }> = {
  image: { label: '绘画/图片', icon: ImageIcon, color: 'text-primary bg-primary/10' },
  video: { label: '视频', icon: Play, color: 'text-success bg-green-50 dark:bg-green-900/20' },
};

const TYPE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '绘画/图片' },
  { key: 'video', label: '视频' },
];

interface MyWork {
  id: string;
  title: string;
  type: string;
  cover: string;
  status: string;
  rejectReason: string | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '审核中', cls: 'text-warning bg-orange-50 dark:bg-orange-900/20' },
  approved: { label: '已通过', cls: 'text-success bg-green-50 dark:bg-green-900/20' },
  rejected: { label: '未通过', cls: 'text-danger bg-red-50 dark:bg-red-900/20' },
};

interface VotePeriod {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
}

interface RankingItem {
  fanWorkId: string;
  title: string;
  cover: string;
  authorName: string;
  type: string;
  totalVotes: number;
  score: number;
  avgScore: number;
  ratings: Record<string, number>;
}

const RATING_OPTIONS = [
  { key: 'awesome', label: '夯爆了', emoji: '🔥', score: 5, color: 'bg-red-500 hover:bg-red-600' },
  { key: 'good', label: '夯', emoji: '👍', score: 4, color: 'bg-orange-500 hover:bg-orange-600' },
  { key: 'normal', label: '一般', emoji: '😐', score: 3, color: 'bg-gray-400 hover:bg-gray-500' },
  { key: 'bad', label: '拉', emoji: '👎', score: 2, color: 'bg-blue-400 hover:bg-blue-500' },
  { key: 'terrible', label: '拉爆了', emoji: '💩', score: 1, color: 'bg-purple-500 hover:bg-purple-600' },
] as const;

const RATING_LABEL: Record<string, string> = {
  awesome: '🔥 夯爆了',
  good: '👍 夯',
  normal: '😐 一般',
  bad: '👎 拉',
  terrible: '💩 拉爆了',
};

export default function FanWorksPage() {
  const [works, setWorks] = useState<FanWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [lightbox, setLightbox] = useState<{ workId: string; imageIndex: number } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showMyWorks, setShowMyWorks] = useState(false);
  const [myWorks, setMyWorks] = useState<MyWork[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitForm, setSubmitForm] = useState({ title: '', description: '', type: 'image', cover: '', contentUrl: '', images: [] as string[] });
  const [uploading, setUploading] = useState(false);
  const [videoMode, setVideoMode] = useState<'link' | 'upload'>('link');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' });

  // 投票相关状态
  const [votePeriod, setVotePeriod] = useState<VotePeriod | null>(null);
  const [votedToday, setVotedToday] = useState(false);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [showRanking, setShowRanking] = useState(false);
  const [votingWorkId, setVotingWorkId] = useState<string | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000);
  }, []);

  // 获取投票状态
  const fetchVoteStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/fan-work-votes', { credentials: 'same-origin' });
      const json = await res.json();
      if (json.code === 0 && json.data) {
        setVotePeriod(json.data.period);
        setVotedToday(json.data.votedToday);
      }
    } catch { /* ignore */ }
  }, []);

  // 获取排名
  const fetchRanking = useCallback(async () => {
    try {
      const res = await fetch('/api/public/fan-work-votes');
      const json = await res.json();
      if (json.code === 0 && json.data) {
        if (json.data.period) setVotePeriod(json.data.period);
        setRanking(json.data.ranking || []);
      }
    } catch { /* ignore */ }
  }, []);

  // 投票
  const handleVote = useCallback(async (fanWorkId: string, rating: string) => {
    setVotingLoading(true);
    try {
      const res = await fetch('/api/auth/fan-work-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ fanWorkId, rating }),
      });
      const json = await res.json();
      if (json.code === 0) {
        showToast('投票成功！');
        setVotedToday(true);
        setVotingWorkId(null);
        fetchRanking();
      } else {
        showToast(json.message || '投票失败', 'error');
      }
    } catch {
      showToast('网络错误', 'error');
    }
    setVotingLoading(false);
  }, [showToast, fetchRanking]);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => { if (json.code === 0) { setIsLoggedIn(true); setCurrentUserId(json.data?.id || null); } })
      .catch(() => {});
    fetchVoteStatus();
    fetchRanking();
  }, [fetchVoteStatus, fetchRanking]);

  useEffect(() => {
    fetch('/api/public/fan-works')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setWorks(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchMyWorks = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/fan-works', { credentials: 'same-origin' });
      const json = await res.json();
      if (json.code === 0 && json.data) setMyWorks(json.data);
    } catch {}
  }, []);

  const handleSubmit = async () => {
    if (!submitForm.title.trim()) { showToast('请输入标题', 'error'); return; }
    if (submitForm.images.length === 0) { showToast('请至少上传一个文件', 'error'); return; }
    if (!submitForm.cover.trim()) {
      // 自动用第一张图作为封面
      submitForm.cover = submitForm.images[0];
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/fan-works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(submitForm),
      });
      const json = await res.json();
      if (json.code === 0) {
        showToast(json.message || '投稿成功');
        setShowSubmit(false);
        setSubmitForm({ title: '', description: '', type: 'image', cover: '', contentUrl: '', images: [] });
        // 刷新作品列表，让新发布的作品立即可见
        fetch('/api/public/fan-works').then((r) => r.json()).then((r) => { if (r.data) setWorks(r.data); }).catch(() => {});
      } else {
        showToast(json.message || '投稿失败', 'error');
      }
    } catch {
      showToast('网络错误', 'error');
    }
    setSubmitting(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // 三段式上传：presign → COS直传 → media-record
        const presignRes = await fetch('/api/auth/presign-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, mimeType: file.type, size: file.size, category: 'fan-work' }),
        });
        const presignJson = await presignRes.json();
        if (presignJson.code !== 0) throw new Error(presignJson.message || '获取上传凭证失败');
        const { uploadUrl, cosKey, fileUrl } = presignJson.data;

        await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });

        const recordRes = await fetch('/api/auth/media-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, url: fileUrl, cosKey, size: file.size, mimeType: file.type, category: 'fan-work' }),
        });
        const recordJson = await recordRes.json();
        if (recordJson.code !== 0) throw new Error(recordJson.message || '媒体入库失败');

        newUrls.push(fileUrl);
      } catch (err) {
        showToast(err instanceof Error ? err.message : `上传 ${file.name} 失败`, 'error');
      }
    }
    if (newUrls.length > 0) {
      setSubmitForm((prev) => ({ ...prev, images: [...prev.images, ...newUrls] }));
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (url: string) => {
    setSubmitForm({ ...submitForm, images: submitForm.images.filter((i) => i !== url) });
  };

  const filtered = useMemo(() => {
    if (activeType === 'all') return works;
    return works.filter((w) => w.type === activeType);
  }, [works, activeType]);

  // 分离精选和普通作品
  const featured = useMemo(() => filtered.filter((w) => w.isFeatured), [filtered]);
  const regular = useMemo(() => filtered.filter((w) => !w.isFeatured), [filtered]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // Lightbox 图片浏览
  const currentWork = lightbox ? works.find((w) => w.id === lightbox.workId) : null;
  const currentImages: string[] = currentWork ? (() => { try { return JSON.parse(currentWork.images); } catch { return []; } })() : [];
  const currentImage = currentImages[lightbox?.imageIndex ?? 0];

  return (
    <>
      {/* 页头 */}
      <section className="relative h-48 sm:h-56 bg-gray-900 overflow-hidden mt-14">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 flex items-center justify-center gap-4 sm:gap-6 select-none pointer-events-none">
          <span
            className="font-waterbrush text-[56px] sm:text-[80px] leading-none text-white/10"
          >
            1103
          </span>
          <span
            className="font-waterbrush text-[28px] sm:text-[40px] leading-none text-primary/50 tracking-[0.15em]"
          >
            ChenZe
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-page to-transparent" />
        <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 h-full flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-3">
            <Palette className="w-4 h-4 text-primary" />
            <span className="text-caption font-medium text-primary">二创作品</span>
          </div>
          <h1 className="text-heading-lg text-white">粉丝二创作品集</h1>
          <p className="text-body text-gray-400 mt-1.5 max-w-md mx-auto">
            照片、视频... 1103粉丝的才华展示
          </p>
        </div>
      </section>

      {/* 类型筛选 + 投稿入口 */}
      <section className="section-block pb-0 animate-fade-in-up">
        <div className="container-main">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-wrap gap-2">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveType(tab.key)}
                  className={`h-8 px-4 rounded-full text-body font-medium transition-colors duration-150 cursor-pointer ${
                    activeType === tab.key
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-[#1e1e22] border border-divider text-text-body hover:border-primary hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {isLoggedIn && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowMyWorks(true); fetchMyWorks(); }}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-divider text-caption font-medium text-text-body hover:border-primary hover:text-primary transition-colors cursor-pointer bg-white dark:bg-[#1e1e22]"
                >
                  <Clock className="w-3.5 h-3.5" />
                  我的投稿
                </button>
                <button
                  onClick={() => setShowSubmit(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-primary text-white text-caption font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  投稿作品
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 投票排名区域 */}
      {votePeriod && (
        <section className="section-block pb-0 animate-fade-in-up">
          <div className="container-main">
            <div className="rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
              {/* 渐变头部 */}
              <div className="relative bg-gradient-to-r from-primary via-blue-500 to-indigo-500 px-5 sm:px-6 py-5">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9zdmc+')] opacity-60" />
                <div className="relative flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-body font-bold text-white">{votePeriod.title}</h2>
                      <p className="text-caption text-white/75">
                        {new Date(votePeriod.startAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                        {' ~ '}
                        {new Date(votePeriod.endAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                        {votedToday && <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[11px]">今日已投 ✓</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRanking(!showRanking)}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-caption font-medium text-white transition-colors cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    {showRanking ? '收起' : '排行榜'}
                    {showRanking ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 排名榜单 */}
              {showRanking && (
                <div className="bg-white/70 dark:bg-[#1e1e22]/90 backdrop-blur-md px-5 sm:px-6 py-5">
                  {ranking.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-[#28282c] mx-auto mb-3 flex items-center justify-center">
                        <Vote className="w-7 h-7 text-text-disabled" />
                      </div>
                      <p className="text-body font-medium text-text-muted">暂无投票数据</p>
                      <p className="text-caption text-text-disabled mt-1">快去给喜欢的作品投票吧</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ranking.map((item, idx) => {
                        const medalBg = ['bg-gradient-to-r from-yellow-50 to-amber-50/50 dark:from-yellow-900/20 dark:to-amber-900/10 border-yellow-200/60 dark:border-yellow-800/30', 'bg-gradient-to-r from-gray-50 to-slate-50/50 dark:from-gray-800/30 dark:to-slate-800/20 border-gray-200/60 dark:border-gray-700/30', 'bg-gradient-to-r from-orange-50 to-amber-50/50 dark:from-orange-900/15 dark:to-amber-900/10 border-orange-200/60 dark:border-orange-800/30'];
                        const medalEmoji = ['🥇', '🥈', '🥉'];
                        const maxScore = ranking[0]?.score || 1;
                        const barWidth = Math.max(8, (item.score / maxScore) * 100);
                        return (
                          <div
                            key={item.fanWorkId}
                            className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border transition-all hover:shadow-sm ${
                              idx < 3 ? medalBg[idx] : 'bg-gray-50/50 dark:bg-[#28282c]/40 border-transparent'
                            }`}
                          >
                            {/* 排名 */}
                            <div className="w-8 text-center flex-shrink-0">
                              {idx < 3 ? (
                                <span className="text-xl leading-none">{medalEmoji[idx]}</span>
                              ) : (
                                <span className="text-body font-bold text-text-muted/60">{idx + 1}</span>
                              )}
                            </div>

                            {/* 封面 */}
                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 dark:bg-[#28282c] flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                              <SafeImage src={item.cover} alt={item.title} width={44} height={44} className="object-cover w-full h-full" />
                            </div>

                            {/* 信息 + 分数条 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-body font-semibold text-text-title truncate">{item.title}</p>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-[#333] overflow-hidden">
                                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500" style={{ width: `${barWidth}%` }} />
                                </div>
                                <span className="text-[11px] font-semibold text-primary tabular-nums flex-shrink-0">{item.score}分</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-text-muted">{item.authorName}</span>
                                <span className="text-[11px] text-text-disabled">·</span>
                                <span className="text-[11px] text-text-muted">{item.totalVotes}票</span>
                                <span className="text-[11px] text-text-disabled">·</span>
                                <span className="text-[11px] text-text-muted">均分 {item.avgScore}</span>
                              </div>
                            </div>

                            {/* 评分分布 */}
                            <div className="hidden sm:flex items-center gap-0.5 flex-shrink-0">
                              {RATING_OPTIONS.map((opt) => {
                                const count = item.ratings[opt.key] || 0;
                                if (count === 0) return null;
                                return (
                                  <span key={opt.key} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white dark:bg-[#28282c] shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[10px] text-text-muted" title={opt.label}>
                                    {opt.emoji}<span className="font-medium">{count}</span>
                                  </span>
                                );
                              })}
                            </div>

                            {/* 投票按钮（排除自己的作品） */}
                            {isLoggedIn && !votedToday && (() => {
                              const matchWork = works.find((w) => w.id === item.fanWorkId);
                              if (matchWork?.userId === currentUserId) return null;
                              return (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setVotingWorkId(votingWorkId === item.fanWorkId ? null : item.fanWorkId); }}
                                  className="h-8 px-3.5 rounded-full bg-primary/10 text-primary text-caption font-medium hover:bg-primary hover:text-white transition-all cursor-pointer flex-shrink-0 inline-flex items-center gap-1"
                                >
                                  <Vote className="w-3.5 h-3.5" />
                                  投票
                                </button>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 投票选项弹窗 */}
      {votingWorkId && (() => {
        const votingWork = works.find((w) => w.id === votingWorkId);
        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setVotingWorkId(null)} />
            <div className="relative w-full max-w-[360px] overflow-hidden animate-fade-in-up">
              {/* 卡片主体 */}
              <div className="rounded-3xl bg-white dark:bg-[#1e1e22] shadow-[0_25px_60px_rgba(0,0,0,0.3)] overflow-hidden">
                {/* 作品封面区域 */}
                {votingWork && (
                  <div className="relative h-44 overflow-hidden">
                    <SafeImage
                      src={votingWork.cover}
                      alt={votingWork.title}
                      fill
                      className="object-cover"
                      sizes="360px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-body font-bold text-white truncate">{votingWork.title}</h3>
                      <p className="text-caption text-white/70 mt-0.5">{votingWork.authorName}</p>
                    </div>
                    <button
                      onClick={() => setVotingWorkId(null)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {!votingWork && (
                  <div className="flex items-center justify-between px-5 pt-5">
                    <h3 className="text-body font-semibold text-text-title">投票评价</h3>
                    <button onClick={() => setVotingWorkId(null)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#28282c] transition-colors cursor-pointer">
                      <X className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                )}

                {/* 投票选项 */}
                <div className="p-5">
                  <p className="text-caption text-text-muted text-center mb-4">为这个作品打分吧 · 每天限投一票</p>
                  <div className="grid grid-cols-5 gap-2">
                    {RATING_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => handleVote(votingWorkId, opt.key)}
                        disabled={votingLoading}
                        className="group flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 border-transparent hover:border-primary/30 bg-gray-50 dark:bg-[#28282c] hover:bg-white dark:hover:bg-[#333] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                      >
                        <span className="text-2xl group-hover:scale-125 transition-transform duration-200">{opt.emoji}</span>
                        <span className="text-[11px] font-medium text-text-body group-hover:text-primary transition-colors whitespace-nowrap">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  {votingLoading && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-caption text-text-muted">提交中...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 精选作品 */}
      {!loading && featured.length > 0 && (
        <section className="section-block pb-0 animate-fade-in-up">
          <div className="container-main">
            <div className="flex items-center gap-2 mb-5">
              <Star className="w-5 h-5 text-primary" />
              <h2 className="text-heading-sm text-text-title">精选推荐</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
              {featured.map((work) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  featured
                  onImageClick={(idx) => setLightbox({ workId: work.id, imageIndex: idx })}
                  formatDate={formatDate}
                  canVote={!!votePeriod && isLoggedIn && !votedToday && work.userId !== currentUserId}
                  onVote={(id) => setVotingWorkId(id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 作品列表 */}
      <section className="section-block animate-fade-in-up">
        <div className="container-main">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-card bg-gray-200 dark:bg-[#28282c]" />
                  <div className="mt-3 h-4 bg-gray-200 dark:bg-[#28282c] rounded w-3/4" />
                  <div className="mt-1.5 h-3 bg-gray-100 dark:bg-[#1e1e22] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Palette className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="text-body text-text-muted">暂无二创作品</p>
            </div>
          ) : (
            <>
              {regular.length > 0 && featured.length > 0 && (
                <div className="flex items-center gap-2 mb-5">
                  <Palette className="w-5 h-5 text-text-muted" />
                  <h2 className="text-heading-sm text-text-title">全部作品</h2>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 stagger-children">
                {(featured.length > 0 ? regular : filtered).map((work) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    onImageClick={(idx) => setLightbox({ workId: work.id, imageIndex: idx })}
                    formatDate={formatDate}
                    canVote={!!votePeriod && isLoggedIn && !votedToday && work.userId !== currentUserId}
                    onVote={(id) => setVotingWorkId(id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* 底部统计 */}
          {!loading && filtered.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-caption text-text-muted">
                共 {works.length} 件作品 · 当前显示 {filtered.length} 件
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 作品详情查看器 */}
      {lightbox && currentWork && (
        <div
          className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setLightbox(null)}
        >
          <div
            className="w-full max-w-5xl max-h-[88vh] rounded-card bg-white/60 dark:bg-[#1e1e22]/85 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_16px_48px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部栏 */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/70 dark:border-[#333] bg-white/70 dark:bg-[#232329]/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-[#28282c] flex-shrink-0 flex items-center justify-center">
                  {currentWork.authorAvatar ? (
                    <SafeImage src={currentWork.authorAvatar} alt={currentWork.authorName} width={32} height={32} className="object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-text-muted" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-body font-semibold text-text-title truncate">{currentWork.title}</h2>
                  <p className="text-caption text-text-muted truncate">{currentWork.authorName} · {formatDate(currentWork.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {currentWork.source && currentWork.sourceUrl && (
                  <a
                    href={currentWork.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1 h-8 px-3 rounded-full text-caption text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
                  >
                    {currentWork.source}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {currentWork.type === 'video' && currentWork.contentUrl && !(/\.(mp4|webm|mov)$/i.test(currentWork.contentUrl)) && (
                  <a
                    href={currentWork.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-caption text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    原视频
                  </a>
                )}
                <button
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#28282c] text-text-muted hover:bg-gray-200 dark:hover:bg-[#333] hover:text-text-title transition-colors cursor-pointer flex items-center justify-center"
                  onClick={() => setLightbox(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* 主体 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-3">
                  {/* 主媒体 */}
                  <div className="relative rounded-card overflow-hidden bg-gray-900 border border-white/20 dark:border-[#333]">
                    {currentWork.type === 'video' && currentWork.contentUrl ? (
                      /\.(mp4|webm|mov)$/i.test(currentWork.contentUrl) ? (
                        <div className="aspect-video">
                          <video src={currentWork.contentUrl} controls autoPlay className="w-full h-full" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-black">
                          <iframe
                            src={currentWork.contentUrl}
                            className="w-full h-full"
                            allowFullScreen
                            allow="autoplay; fullscreen"
                          />
                        </div>
                      )
                    ) : currentImages.length > 0 ? (
                      <div className="relative aspect-[4/3] sm:aspect-video">
                        <SafeImage
                          src={currentImages[lightbox.imageIndex]}
                          alt={currentWork.title || '作品大图'}
                          fill
                          className="object-contain"
                          priority
                          sizes="80vw"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video flex items-center justify-center text-text-muted bg-gray-100 dark:bg-[#28282c]">
                        暂无可预览内容
                      </div>
                    )}
                    {currentImages.length > 1 && (
                      <>
                        <button
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors flex items-center justify-center cursor-pointer"
                          onClick={() => setLightbox({ ...lightbox, imageIndex: Math.max(lightbox.imageIndex - 1, 0) })}
                          disabled={lightbox.imageIndex === 0}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors flex items-center justify-center cursor-pointer"
                          onClick={() => setLightbox({ ...lightbox, imageIndex: Math.min(lightbox.imageIndex + 1, currentImages.length - 1) })}
                          disabled={lightbox.imageIndex === currentImages.length - 1}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                  {currentImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {currentImages.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setLightbox({ ...lightbox, imageIndex: idx })}
                          className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors cursor-pointer ${
                            idx === lightbox.imageIndex ? 'border-primary' : 'border-transparent hover:border-primary/40'
                          }`}
                        >
                          <SafeImage src={url} alt={`缩略图${idx + 1}`} width={56} height={56} className="object-cover w-full h-full" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 右侧信息 */}
                <div className="rounded-card bg-white/80 dark:bg-[#232329]/90 border border-white/70 dark:border-[#333] p-4 sm:p-5 space-y-3">
                  <div>
                    <p className="text-caption text-text-muted">作品信息</p>
                    <h3 className="text-heading-sm text-text-title mt-1 break-words">{currentWork.title}</h3>
                  </div>
                  {currentWork.description && (
                    <p className="text-body leading-6 text-text-body break-words">{currentWork.description}</p>
                  )}
                  <div className="space-y-1.5 text-caption text-text-muted">
                    <p>作者：{currentWork.authorName}</p>
                    <p>发布时间：{formatDate(currentWork.createdAt)}</p>
                    <p>类型：{TYPE_CONFIG[currentWork.type]?.label || currentWork.type}</p>
                    {currentImages.length > 1 && <p>图片：{lightbox.imageIndex + 1} / {currentImages.length}</p>}
                  </div>
                  {currentWork.source && (
                    <div className="pt-1">
                      <p className="text-caption text-text-muted mb-1">来源平台</p>
                      {currentWork.sourceUrl ? (
                        <a
                          href={currentWork.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-body text-primary hover:underline"
                        >
                          {currentWork.source}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <p className="text-body text-text-body">{currentWork.source}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 投稿弹窗 */}
      {showSubmit && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSubmit(false)} />
          <div className="relative bg-white dark:bg-[#1e1e22] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm text-text-title">投稿作品</h3>
              </div>
              <button onClick={() => setShowSubmit(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#28282c] transition-colors cursor-pointer">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">标题 *</label>
                <input
                  value={submitForm.title}
                  onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })}
                  placeholder="给你的作品取个名字"
                  maxLength={100}
                  className="w-full h-9 px-3 rounded-lg border border-divider bg-gray-50/50 dark:bg-[#28282c] text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">类型 *</label>
                <div className="flex gap-2">
                  {(['image', 'video'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSubmitForm({ ...submitForm, type: t })}
                      className={`h-8 px-4 rounded-full text-caption font-medium transition-colors cursor-pointer ${
                        submitForm.type === t ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-[#28282c] border border-divider text-text-body'
                      }`}
                    >
                      {t === 'image' ? '照片/图片' : '视频'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">描述（可选）</label>
                <textarea
                  value={submitForm.description}
                  onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                  rows={2}
                  maxLength={500}
                  placeholder="简单介绍一下你的作品"
                  className="w-full p-3 rounded-lg border border-divider bg-gray-50/50 dark:bg-[#28282c] text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>
              {submitForm.type === 'video' && (
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">视频来源 *</label>
                  <div className="flex gap-2 mb-2">
                    {([['link', '填写链接'], ['upload', '上传视频']] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        onClick={() => setVideoMode(mode)}
                        className={`h-7 px-3 rounded-full text-caption font-medium transition-colors cursor-pointer ${
                          videoMode === mode ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-[#28282c] border border-divider text-text-body'
                        }`}
                      >
                        {mode === 'link' ? <span className="inline-flex items-center gap-1"><Link2 className="w-3 h-3" />{label}</span> : <span className="inline-flex items-center gap-1"><Upload className="w-3 h-3" />{label}</span>}
                      </button>
                    ))}
                  </div>
                  {videoMode === 'link' ? (
                    <input
                      value={submitForm.contentUrl}
                      onChange={(e) => setSubmitForm({ ...submitForm, contentUrl: e.target.value })}
                      placeholder="B站/YouTube 视频链接"
                      className="w-full h-9 px-3 rounded-lg border border-divider bg-gray-50/50 dark:bg-[#28282c] text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                    />
                  ) : (
                    <>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingVideo(true);
                          try {
                            // 三段式上传：presign → COS直传 → media-record
                            const presignRes = await fetch('/api/auth/presign-upload', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ filename: file.name, mimeType: file.type, size: file.size, category: 'fan-work' }),
                            });
                            const presignJson = await presignRes.json();
                            if (presignJson.code !== 0) throw new Error(presignJson.message || '获取上传凭证失败');
                            const { uploadUrl, cosKey, fileUrl } = presignJson.data;

                            await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });

                            const recordRes = await fetch('/api/auth/media-record', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ filename: file.name, url: fileUrl, cosKey, size: file.size, mimeType: file.type, category: 'fan-work' }),
                            });
                            const recordJson = await recordRes.json();
                            if (recordJson.code !== 0) throw new Error(recordJson.message || '媒体入库失败');

                            setSubmitForm((prev) => ({ ...prev, contentUrl: fileUrl }));
                            showToast('视频上传成功');
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : '视频上传失败', 'error');
                          }
                          setUploadingVideo(false);
                          if (videoInputRef.current) videoInputRef.current.value = '';
                        }}
                        className="hidden"
                      />
                      {submitForm.contentUrl ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-divider bg-green-50/50 dark:bg-green-900/10">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                          <span className="text-caption text-text-body truncate flex-1">视频已上传</span>
                          <button onClick={() => setSubmitForm((prev) => ({ ...prev, contentUrl: '' }))} className="p-0.5 rounded hover:bg-black/10 cursor-pointer">
                            <X className="w-3.5 h-3.5 text-text-muted" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => !uploadingVideo && videoInputRef.current?.click()}
                          disabled={uploadingVideo}
                          className="w-full h-20 rounded-lg border-2 border-dashed border-divider hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingVideo ? (
                            <><Loader2 className="w-5 h-5 text-primary animate-spin" /><span className="text-caption text-text-muted">视频上传中...</span></>
                          ) : (
                            <><Play className="w-5 h-5 text-text-muted" /><span className="text-caption text-text-muted">点击选择视频文件</span><span className="text-[10px] text-text-disabled">支持 MP4/WebM，最大 50MB</span></>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">
                  {submitForm.type === 'image' ? '上传图片 *' : '上传封面/截图 *'}
                  <span className="text-text-disabled ml-1">（支持 JPG/PNG/WebP/GIF，最大 5MB）</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={submitForm.type === 'image' ? 'image/*' : 'image/*,video/*'}
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                {submitForm.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {submitForm.images.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-[#28282c] border border-divider">
                        <SafeImage src={url} alt={`图片${idx + 1}`} fill className="object-cover" />
                        <button
                          onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white hover:bg-danger opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-20 rounded-lg border-2 border-dashed border-divider hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <><Loader2 className="w-5 h-5 text-primary animate-spin" /><span className="text-caption text-text-muted">上传中...</span></>
                  ) : (
                    <><Upload className="w-5 h-5 text-text-muted" /><span className="text-caption text-text-muted">点击选择文件（可多选）</span></>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-divider">
              <button onClick={() => setShowSubmit(false)} className="h-9 px-5 rounded-lg border border-divider text-caption font-medium text-text-body hover:border-primary transition-colors cursor-pointer">取消</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="h-9 px-5 rounded-lg bg-primary text-white text-caption font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 提交中...</> : '提交投稿'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 我的投稿面板 */}
      {showMyWorks && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMyWorks(false)} />
          <div className="relative bg-white dark:bg-[#1e1e22] rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
              <h3 className="text-heading-sm text-text-title">我的投稿</h3>
              <button onClick={() => setShowMyWorks(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#28282c] transition-colors cursor-pointer">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {myWorks.length === 0 ? (
                <div className="text-center py-12">
                  <Palette className="w-8 h-8 text-text-disabled mx-auto mb-2" />
                  <p className="text-body text-text-muted">还没有投稿记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myWorks.map((w) => {
                    const st = STATUS_MAP[w.status] || STATUS_MAP.pending;
                    return (
                      <div key={w.id} className="flex items-center gap-3 p-3 rounded-card border border-divider">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-[#28282c] flex-shrink-0">
                          <SafeImage src={w.cover} alt={w.title} width={48} height={48} className="object-cover w-full h-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-medium text-text-title truncate">{w.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${st.cls}`}>
                              {w.status === 'pending' && <Clock className="w-3 h-3" />}
                              {w.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                              {w.status === 'rejected' && <XCircle className="w-3 h-3" />}
                              {st.label}
                            </span>
                            <span className="text-caption text-text-disabled">{new Date(w.createdAt).toLocaleDateString('zh-CN')}</span>
                          </div>
                          {w.status === 'rejected' && w.rejectReason && (
                            <p className="text-caption text-danger mt-1">原因：{w.rejectReason}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.open && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-card shadow-dropdown border ${
            toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-danger'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span className="text-body font-medium">{toast.message}</span>
            <button onClick={() => setToast((t) => ({ ...t, open: false }))} className="ml-2 p-0.5 rounded-full hover:bg-black/10 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// 作品卡片组件
function WorkCard({
  work,
  featured,
  onImageClick,
  formatDate,
  canVote,
  onVote,
}: {
  work: FanWorkItem;
  featured?: boolean;
  onImageClick: (index: number) => void;
  formatDate: (d: string) => string;
  canVote?: boolean;
  onVote?: (workId: string) => void;
}) {
  const typeConfig = TYPE_CONFIG[work.type] || TYPE_CONFIG.image;
  const TypeIcon = typeConfig.icon;
  let images: string[] = [];
  try { images = JSON.parse(work.images); } catch { /* ignore */ }

  const handleClick = () => {
    onImageClick(0);
  };

  return (
    <div
      className={`group cursor-pointer rounded-card overflow-hidden bg-white/60 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.10)] transition-all duration-200 ${
        featured ? 'ring-1 ring-primary/20' : ''
      }`}
      onClick={handleClick}
    >
      {/* 封面 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-[#28282c]">
        <SafeImage
          src={work.cover}
          alt={work.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* 类型标签 */}
        <div className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium ${typeConfig.color}`}>
          <TypeIcon className="w-3 h-3" />
          {typeConfig.label}
        </div>

        {/* 精选角标 */}
        {work.isFeatured && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary text-white text-caption font-medium">
            <Star className="w-3 h-3" />
            精选
          </div>
        )}

        {/* 视频播放指示 */}
        {work.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-primary/80 transition-colors duration-200">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>
        )}
      </div>

      {/* 信息 */}
      <div className="p-3.5">
        <h3 className="text-body font-semibold text-text-title truncate">{work.title}</h3>
        {work.description && (
          <p className="text-caption text-text-muted mt-1 line-clamp-2">{work.description}</p>
        )}

        {/* 作者信息 */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-[#28282c] flex-shrink-0 flex items-center justify-center">
              {work.authorAvatar ? (
                <SafeImage src={work.authorAvatar} alt={work.authorName} width={20} height={20} className="object-cover" />
              ) : (
                <User className="w-3 h-3 text-text-muted" />
              )}
            </div>
            <span className="text-caption text-text-muted truncate">{work.authorName}</span>
          </div>

          {/* 来源 */}
          {work.source && work.sourceUrl && (
            <a
              href={work.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 text-caption text-primary hover:underline cursor-pointer flex-shrink-0"
            >
              {work.source}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <p className="text-caption text-text-disabled mt-1.5">{formatDate(work.createdAt)}</p>

        {canVote && onVote && (
          <button
            onClick={(e) => { e.stopPropagation(); onVote(work.id); }}
            className="mt-2.5 w-full h-8 rounded-lg bg-primary/10 text-primary text-caption font-medium hover:bg-primary/20 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Vote className="w-3.5 h-3.5" />
            投票
          </button>
        )}
      </div>
    </div>
  );
}
