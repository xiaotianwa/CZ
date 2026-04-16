'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Palette, Play, Image as ImageIcon, Star, ExternalLink, User, Plus, Upload, X, Clock, CheckCircle2, XCircle, Loader2, Link2 } from 'lucide-react';
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

export default function FanWorksPage() {
  const [works, setWorks] = useState<FanWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [lightbox, setLightbox] = useState<{ workId: string; imageIndex: number } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, type });
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => { if (json.code === 0) setIsLoggedIn(true); })
      .catch(() => {});
  }, []);

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
        showToast('投稿成功，等待管理员审核');
        setShowSubmit(false);
        setSubmitForm({ title: '', description: '', type: 'image', cover: '', contentUrl: '', images: [] });
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
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/auth/upload-media', { method: 'POST', credentials: 'same-origin', body: fd });
        const json = await res.json();
        if (json.code === 0 && json.data?.url) {
          newUrls.push(json.data.url);
        } else {
          showToast(json.message || `上传 ${file.name} 失败`, 'error');
        }
      } catch {
        showToast(`上传 ${file.name} 失败`, 'error');
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
            className="text-[56px] sm:text-[80px] leading-none font-bold text-white/10"
            style={{ fontFamily: "'Blazed', sans-serif" }}
          >
            1103
          </span>
          <span
            className="text-[28px] sm:text-[40px] leading-none text-primary/50 tracking-[0.15em]"
            style={{ fontFamily: "'Blazed', sans-serif" }}
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
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors duration-150 cursor-pointer z-10"
            onClick={() => setLightbox(null)}
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 flex flex-col md:flex-row gap-4" onClick={(e) => e.stopPropagation()}>
            {/* 左侧：媒体展示 */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* 视频播放 */}
              {currentWork.type === 'video' && currentWork.contentUrl && (
                /\.(mp4|webm|mov)$/i.test(currentWork.contentUrl) ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-3">
                    <video src={currentWork.contentUrl} controls autoPlay className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 mb-3 flex items-center justify-center">
                    <iframe
                      src={currentWork.contentUrl.replace('www.bilibili.com/video/', 'player.bilibili.com/player.html?bvid=').replace(/\/.*$/, '')}
                      className="w-full h-full"
                      allowFullScreen
                      allow="autoplay"
                    />
                  </div>
                )
              )}
              {/* 图片浏览 */}
              {currentImages.length > 0 && (
                <>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    {/\.(mp4|webm|mov)$/i.test(currentImages[lightbox.imageIndex]) ? (
                      <video src={currentImages[lightbox.imageIndex]} controls className="w-full h-full object-contain" />
                    ) : (
                      <SafeImage
                        src={currentImages[lightbox.imageIndex]}
                        alt={currentWork.title || '作品大图'}
                        fill
                        className="object-contain"
                        priority
                        sizes="90vw"
                      />
                    )}
                    {currentImages.length > 1 && lightbox.imageIndex > 0 && (
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer transition-colors"
                        onClick={() => setLightbox({ ...lightbox, imageIndex: lightbox.imageIndex - 1 })}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                    )}
                    {currentImages.length > 1 && lightbox.imageIndex < currentImages.length - 1 && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer transition-colors"
                        onClick={() => setLightbox({ ...lightbox, imageIndex: lightbox.imageIndex + 1 })}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    )}
                  </div>
                  {/* 缩略图列表 */}
                  {currentImages.length > 1 && (
                    <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                      {currentImages.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setLightbox({ ...lightbox, imageIndex: idx })}
                          className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 cursor-pointer transition-colors ${
                            idx === lightbox.imageIndex ? 'border-primary' : 'border-transparent hover:border-white/30'
                          }`}
                        >
                          <SafeImage src={url} alt={`缩略图${idx + 1}`} width={56} height={56} className="object-cover w-full h-full" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {/* 右侧：作品信息 */}
            <div className="w-full md:w-72 flex-shrink-0 bg-white/5 backdrop-blur-sm rounded-xl p-5 text-white overflow-y-auto max-h-[60vh] md:max-h-[80vh]">
              <h2 className="text-lg font-bold text-white mb-2">{currentWork.title}</h2>
              {currentWork.description && (
                <p className="text-sm text-white/70 mb-4 leading-relaxed">{currentWork.description}</p>
              )}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                  {currentWork.authorAvatar ? (
                    <SafeImage src={currentWork.authorAvatar} alt={currentWork.authorName} width={32} height={32} className="object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-white/60" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{currentWork.authorName}</p>
                  <p className="text-xs text-white/50">{formatDate(currentWork.createdAt)}</p>
                </div>
              </div>
              {currentWork.source && (
                <div className="mb-3">
                  <p className="text-xs text-white/40 mb-1">来源平台</p>
                  {currentWork.sourceUrl ? (
                    <a href={currentWork.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      {currentWork.source} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="text-sm text-white/70">{currentWork.source}</p>
                  )}
                </div>
              )}
              {currentWork.type === 'video' && currentWork.contentUrl && !(/\.(mp4|webm|mov)$/i.test(currentWork.contentUrl)) && (
                <div className="mb-3">
                  <p className="text-xs text-white/40 mb-1">视频链接</p>
                  <a href={currentWork.contentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all">
                    <ExternalLink className="w-3 h-3 flex-shrink-0" /> 在新窗口打开
                  </a>
                </div>
              )}
              {currentImages.length > 1 && (
                <p className="text-xs text-white/40">{lightbox.imageIndex + 1} / {currentImages.length} 张图片</p>
              )}
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
                            const fd = new FormData();
                            fd.append('file', file);
                            const res = await fetch('/api/auth/upload-media', { method: 'POST', credentials: 'same-origin', body: fd });
                            const json = await res.json();
                            if (json.code === 0 && json.data?.url) {
                              setSubmitForm((prev) => ({ ...prev, contentUrl: json.data.url }));
                              showToast('视频上传成功');
                            } else {
                              showToast(json.message || '视频上传失败', 'error');
                            }
                          } catch {
                            showToast('视频上传失败', 'error');
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
}: {
  work: FanWorkItem;
  featured?: boolean;
  onImageClick: (index: number) => void;
  formatDate: (d: string) => string;
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
      </div>
    </div>
  );
}
