'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart, MessageCircle, Pin, Send, ImagePlus, ShieldCheck,
  X, Video, AlertCircle, Loader2, Hash, ChevronDown, Check, Plus, Search, Gift, Flame,
} from 'lucide-react';
import Toast from '@/components/admin/Toast';
import LoginRequiredModal from '@/components/LoginRequiredModal';

interface TopicItem {
  id: string;
  name: string;
  color: string | null;
  postCount: number;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 9;

function formatNum(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toLocaleString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}


function RoleBadge({ role }: { role: string }) {
  if (role === 'star') return <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm">★ 董事长</span>;
  if (role === 'assistant') return <span className="tag-primary">传媒成员</span>;
  if (role === 'admin') return <span className="tag bg-orange-50 text-orange-600">管理</span>;
  return null;
}

interface PostItem {
  id: string;
  content: string;
  images: string;
  isPinned: boolean;
  likes: number;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null; role: string; level: number; badge: string | null };
  postTags: { tag: { id: string; name: string } }[];
  _count: { comments: number };
}

interface MediaFile {
  id: string;
  file?: File;
  url: string;
  type: 'image' | 'video';
  uploading: boolean;
  progress: number;
  error?: string;
}

interface CommentItem {
  id: string;
  content: string;
  likes: number;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null; role: string; level: number; badge: string | null };
}

// ===== Post Composer =====

function TopicSelector({ topics, selected, onChange, onTopicCreated, isLoggedIn, onLoginRequired }: {
  topics: TopicItem[];
  selected: TopicItem[];
  onChange: (topics: TopicItem[]) => void;
  onTopicCreated: (topic: TopicItem) => void;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCreateError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const normalizedQuery = query.trim().replace(/^#+/, '');
  const filtered = topics.filter((t) =>
    t.name.toLowerCase().includes(normalizedQuery.toLowerCase())
  );
  const exactMatch = topics.some((t) => t.name === normalizedQuery);
  const canCreate = normalizedQuery.length > 0 && normalizedQuery.length <= 20 && !exactMatch;

  const toggle = (topic: TopicItem) => {
    const exists = selected.find((t) => t.id === topic.id);
    if (exists) {
      onChange(selected.filter((t) => t.id !== topic.id));
    } else if (selected.length < 5) {
      onChange([...selected, topic]);
    }
  };

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/auth/topics', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedQuery }),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);

      const newTopic: TopicItem = json.data;
      onTopicCreated(newTopic);
      if (selected.length < 5) {
        onChange([...selected, newTopic]);
      }
      setQuery('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { if (isLoggedIn === false) { onLoginRequired?.(); return; } setOpen(!open); }}
        className="p-1.5 rounded-btn text-text-muted hover:text-primary hover:bg-gray-50 transition-colors duration-150 cursor-pointer flex items-center gap-0.5"
        aria-label="选择话题"
      >
        <Hash className="w-4 h-4" />
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-card shadow-lg border border-divider z-20 py-1">
          <div className="px-2 py-1.5 border-b border-divider">
            <div className="flex items-center gap-1.5 h-7 px-2 rounded-btn border border-border bg-gray-50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
              <Search className="w-3 h-3 text-text-disabled flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCreateError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
                placeholder="搜索或创建话题..."
                maxLength={20}
                className="flex-1 bg-transparent border-none outline-none text-caption text-text-body placeholder:text-text-disabled"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {/* Create new topic option */}
            {canCreate && (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center gap-2 px-3 py-2 text-caption text-primary hover:bg-primary/5 transition-colors duration-100 cursor-pointer border-b border-divider"
              >
                {creating ? (
                  <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                ) : (
                  <Plus className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="flex-1 text-left truncate">
                  {creating ? '创建中...' : `创建「${normalizedQuery}」`}
                </span>
              </button>
            )}
            {createError && (
              <div className="px-3 py-1.5 text-[11px] text-danger flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" /> {createError}
              </div>
            )}
            {filtered.map((topic) => {
              const isSelected = selected.some((t) => t.id === topic.id);
              return (
                <button
                  key={topic.id}
                  onClick={() => toggle(topic)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-caption transition-colors duration-100 cursor-pointer ${
                    isSelected ? 'bg-primary/5 text-primary' : 'text-text-body hover:bg-gray-50'
                  }`}
                >
                  <Hash className="w-3 h-3 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{topic.name}</span>
                  <span className="text-[11px] text-text-disabled">{topic.postCount}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && !canCreate && (
              <p className="text-caption text-text-disabled text-center py-3">
                {normalizedQuery ? '无匹配话题' : '暂无话题'}
              </p>
            )}
          </div>
          <div className="px-3 py-1 text-[11px] text-text-disabled border-t border-divider">
            已选 {selected.length}/5 · 最多20字
          </div>
        </div>
      )}
    </div>
  );
}

function PostComposer({ topics, onPostCreated, onTopicCreated, isLoggedIn }: { topics: TopicItem[]; onPostCreated: (post: PostItem) => void; onTopicCreated: (topic: TopicItem) => void; isLoggedIn: boolean }) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<TopicItem[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isExpanded = expanded || content.length > 0 || mediaFiles.length > 0 || selectedTopics.length > 0;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_FILES - mediaFiles.length;
    if (files.length > remaining) {
      setError(`最多上传${MAX_FILES}个文件，还可添加${remaining}个`);
      return;
    }

    for (const file of files) {
      const isImage = IMAGE_TYPES.includes(file.type);
      const isVideo = VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        setError(`「${file.name}」格式不支持，仅支持图片(JPG/PNG/WebP/GIF)和视频(MP4/WebM)`);
        continue;
      }

      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        setError(`「${file.name}」(${formatSize(file.size)}) 超过${isVideo ? '50MB' : '5MB'}限制`);
        continue;
      }

      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      const mf: MediaFile = { id: localId, file, url: previewUrl, type: isVideo ? 'video' : 'image', uploading: true, progress: 0 };

      setMediaFiles((prev) => [...prev, mf]);

      try {
        // 1. 获取预签名URL
        const presignRes = await fetch('/api/auth/presign-upload', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            category: isVideo ? 'post-video' : 'post-image',
          }),
        });
        const presignJson = await presignRes.json();
        if (presignJson.code !== 0) throw new Error(presignJson.message);

        const { uploadUrl, fileUrl, cosKey } = presignJson.data;

        // 2. 直传COS（XHR支持进度）
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setMediaFiles((prev) =>
                prev.map((m) => m.id === localId ? { ...m, progress: pct } : m)
              );
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`COS上传失败(${xhr.status})`));
          };
          xhr.onerror = () => reject(new Error('网络错误，上传失败'));
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        // 3. 记录到媒体库
        await fetch('/api/auth/media-record', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, url: fileUrl, cosKey, size: file.size, mimeType: file.type, category: isVideo ? 'post-video' : 'post-image' }),
        });

        setMediaFiles((prev) =>
          prev.map((m) => m.id === localId ? { ...m, url: fileUrl, uploading: false, progress: 100 } : m)
        );
      } catch (err) {
        setMediaFiles((prev) =>
          prev.map((m) => m.id === localId ? { ...m, uploading: false, progress: 0, error: err instanceof Error ? err.message : '上传失败' } : m)
        );
      }
    }

    if (fileRef.current) fileRef.current.value = '';
    setError('');
  };

  const removeMedia = (id: string) => {
    setMediaFiles((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.file) URL.revokeObjectURL(item.url);
      return prev.filter((m) => m.id !== id);
    });
  };

  const handlePost = async () => {
    if (!isLoggedIn) { setLoginModal(true); return; }
    if (!content.trim()) { setError('请输入内容'); return; }
    const failedMedia = mediaFiles.filter((m) => m.error);
    if (failedMedia.length) { setError('有文件上传失败，请删除后重试'); return; }
    const uploadingMedia = mediaFiles.filter((m) => m.uploading);
    if (uploadingMedia.length) { setError('文件正在上传中，请稍候'); return; }

    setPosting(true);
    setError('');

    try {
      const images = mediaFiles.map((m) => m.url);
      const tagIds = selectedTopics.map((t) => t.id);
      const res = await fetch('/api/auth/posts', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), images, tagIds }),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);

      onPostCreated(json.data);
      setContent('');
      setMediaFiles([]);
      setSelectedTopics([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-white rounded-card p-3 sm:p-5 shadow-card border border-divider">
      <LoginRequiredModal open={loginModal} redirectTo="/community" onCancel={() => setLoginModal(false)} />
      <textarea
        value={content}
        onFocus={() => { if (!isLoggedIn) { setLoginModal(true); return; } setExpanded(true); }}
        onChange={(e) => { setContent(e.target.value); setError(''); }}
        placeholder="分享你的追星心情..."
        maxLength={2000}
        rows={isExpanded ? undefined : 1}
        className={`w-full resize-none border-none outline-none text-body text-text-body placeholder:text-text-muted bg-transparent transition-all duration-200 ${
          isExpanded ? 'min-h-[56px] sm:min-h-[72px]' : 'min-h-0 h-7'
        }`}
      />

      {isExpanded && (
        <>
          {/* Media Previews */}
          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {mediaFiles.map((mf) => (
                <div key={mf.id} className="relative rounded-btn overflow-hidden aspect-video bg-gray-100 group">
                  {mf.type === 'image' ? (
                    <Image src={mf.url} alt="" fill className="object-cover" />
                  ) : (
                    <video src={mf.url} className="w-full h-full object-cover" muted />
                  )}
                  {mf.uploading && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1.5">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                      <span className="text-[11px] text-white font-medium">{mf.progress}%</span>
                      <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${mf.progress}%` }} />
                      </div>
                    </div>
                  )}
                  {mf.error && (
                    <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(mf.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {mf.type === 'video' && !mf.uploading && !mf.error && (
                    <div className="absolute bottom-1 left-1">
                      <Video className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-1.5 mt-2 text-caption text-danger">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Selected Topics */}
          {selectedTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedTopics.map((topic) => (
                <span
                  key={topic.id}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-tag bg-primary/10 text-primary text-caption font-medium"
                >
                  #{topic.name}
                  <button
                    onClick={() => setSelectedTopics((prev) => prev.filter((t) => t.id !== topic.id))}
                    className="w-3.5 h-3.5 rounded-full hover:bg-primary/20 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Toolbar */}
      <div className={`flex items-center justify-between gap-2 ${isExpanded ? 'pt-3 border-t border-divider mt-3' : 'mt-1'}`}>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => { setExpanded(true); fileRef.current?.click(); }}
            disabled={mediaFiles.length >= MAX_FILES}
            className="p-1.5 rounded-btn text-text-muted hover:text-primary hover:bg-gray-50 transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="添加图片"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setExpanded(true); fileRef.current?.click(); }}
            disabled={mediaFiles.length >= MAX_FILES}
            className="p-1.5 rounded-btn text-text-muted hover:text-primary hover:bg-gray-50 transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="添加视频"
          >
            <Video className="w-4 h-4" />
          </button>
          <TopicSelector topics={topics} selected={selectedTopics} onChange={setSelectedTopics} onTopicCreated={onTopicCreated} onLoginRequired={() => setLoginModal(true)} isLoggedIn={isLoggedIn} />
          {isExpanded && (
            <span className="text-caption text-text-disabled ml-1 hidden sm:inline">
              图片≤5MB 视频≤50MB 最多{MAX_FILES}个
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isExpanded && <span className="text-caption text-text-disabled hidden sm:inline">{content.length}/2000</span>}
          <button
            onClick={handlePost}
            disabled={posting || !content.trim()}
            className="btn-primary inline-flex items-center gap-1.5 h-8 px-4 text-caption whitespace-nowrap disabled:opacity-50"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {posting ? '发布中...' : '发布'}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

// ===== Comment Section =====

function CommentSection({ postId, onToast, isLoggedIn }: { postId: string; onToast: (msg: string, type: 'success' | 'error') => void; isLoggedIn: boolean }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loginModal, setLoginModal] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/posts/${postId}/comments`);
      const json = await res.json();
      if (json.data) setComments(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSend = async () => {
    if (!content.trim()) return;
    if (!isLoggedIn) {
      setLoginModal(true);
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/comments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content: content.trim() }),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      setComments((prev) => [json.data, ...prev]);
      setContent('');
      onToast('评论发布成功', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '评论失败';
      setError(msg);
      onToast(msg, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-divider">
      <LoginRequiredModal open={loginModal} redirectTo="/community" onCancel={() => setLoginModal(false)} />
      {/* Comment Input */}
      <div className="flex gap-2 mb-3">
        <input
          value={content}
          onChange={(e) => { setContent(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="写评论..."
          maxLength={500}
          className="flex-1 h-8 px-3 rounded-btn border border-border bg-white text-caption text-text-body placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-150"
        />
        <button
          onClick={handleSend}
          disabled={sending || !content.trim()}
          className="btn-primary h-8 px-3 text-caption inline-flex items-center gap-1 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        </button>
      </div>
      {error && (
        <p className="text-caption text-danger mb-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}

      {/* Comments List */}
      {loading ? (
        <p className="text-caption text-text-muted py-2">加载中...</p>
      ) : comments.length === 0 ? (
        <p className="text-caption text-text-muted py-2">暂无评论，来抢沙发~</p>
      ) : (
        <div className="space-y-2.5">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 mt-0.5">
                {c.author?.avatar ? (
                  <Image src={c.author.avatar} alt={c.author.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-bg text-[10px] font-bold text-primary">{c.author.name[0]}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-caption font-medium text-text-title">{c.author.name}</span>
                  <RoleBadge role={c.author.role} />
                  <span className="text-[11px] text-text-disabled ml-auto">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-caption text-text-body mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Main Page =====

function CheckinCard() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [doing, setDoing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loginModal, setLoginModal] = useState(false);

  useEffect(() => {
    fetch('/api/auth/checkin', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setCheckedIn(json.data.checkedIn);
          setStreak(json.data.streak);
        } else if (json.code !== 0) {
          setIsLoggedIn(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCheckin = async () => {
    if (!isLoggedIn) {
      setLoginModal(true);
      return;
    }
    if (checkedIn || doing) return;
    setDoing(true);
    try {
      const res = await fetch('/api/auth/checkin', { method: 'POST', credentials: 'same-origin' });
      const json = await res.json();
      if (json.code === 0) {
        setCheckedIn(true);
        setStreak((s) => s + 1);
        setToast({ msg: `签到成功！+5积分${json.data?.levelUp ? ' 🎉 升级了！' : ''}`, ok: true });
        setTimeout(() => setToast(null), 3000);
      } else if (res.status === 401) {
        setIsLoggedIn(false);
        setLoginModal(true);
      } else {
        setToast({ msg: json.message || '签到失败', ok: false });
        setTimeout(() => setToast(null), 2000);
      }
    } catch {
      setToast({ msg: '签到失败，请重试', ok: false });
      setTimeout(() => setToast(null), 2000);
    } finally {
      setDoing(false);
    }
  };

  if (loading) return null;

  return (
    <div className="card">
      <LoginRequiredModal open={loginModal} redirectTo="/community" onCancel={() => setLoginModal(false)} />
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body font-semibold text-text-title flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-primary" /> 每日签到
        </h3>
        {streak > 0 && (
          <span className="inline-flex items-center gap-0.5 text-caption text-orange-500 font-medium">
            <Flame className="w-3.5 h-3.5" /> 连续{streak}天
          </span>
        )}
      </div>
      <button
        onClick={handleCheckin}
        disabled={(isLoggedIn && checkedIn) || doing}
        className={`w-full h-9 rounded-btn font-medium text-body transition-all duration-200 inline-flex items-center justify-center gap-2 ${
          isLoggedIn && checkedIn
            ? 'bg-gray-100 text-text-muted cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-sm'
        }`}
      >
        {doing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className={`w-4 h-4 ${isLoggedIn && checkedIn ? 'text-success' : ''}`} />}
        {!isLoggedIn ? '登录后签到' : checkedIn ? '今日已签到' : '立即签到 +5积分'}
      </button>
      {toast && <p className={`text-caption mt-2 text-center ${toast.ok ? 'text-success' : 'text-danger'}`}>{toast.msg}</p>}
    </div>
  );
}

export default function CommunityPage() {
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'hot' | 'new'>('new');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [hotTopics, setHotTopics] = useState<TopicItem[]>([]);
  const [communityStats, setCommunityStats] = useState({ totalFans: 0, todayPosts: 0, onlineNow: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' });
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loginModal, setLoginModal] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, type });
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => { if (json.code !== 0) setIsLoggedIn(false); })
      .catch(() => {});
  }, []);

  // Fetch topics once
  useEffect(() => {
    fetch('/api/public/topics')
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.list) setTopics(json.data.list);
        if (json.data?.hot) setHotTopics(json.data.hot);
      })
      .catch(() => {});
  }, []);

  // Fetch posts (re-fetch when topic filter changes)
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '50' });
    if (activeTopicId) params.set('tagId', activeTopicId);

    Promise.all([
      fetch(`/api/public/posts?${params}`).then((r) => r.json()),
      fetch('/api/public/config').then((r) => r.json()),
    ]).then(([postsRes, configRes]) => {
      if (postsRes.data?.list) setPosts(postsRes.data.list);
      if (configRes.data?.communityStats) setCommunityStats(configRes.data.communityStats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeTopicId]);

  const toggleLike = async (postId: string) => {
    if (!isLoggedIn) {
      setLoginModal(true);
      return;
    }
    const isLiked = likedPosts.has(postId);
    // Optimistic update
    setLikedPosts((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(postId) : next.add(postId);
      return next;
    });

    try {
      const res = await fetch(`/api/auth/posts/${postId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      // Update post likes count from server
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: json.data.likes } : p));
      showToast(isLiked ? '已取消点赞' : '点赞成功 ❤️', 'success');
    } catch (err) {
      // Rollback
      setLikedPosts((prev) => {
        const next = new Set(prev);
        isLiked ? next.add(postId) : next.delete(postId);
        return next;
      });
      showToast(err instanceof Error ? err.message : '操作失败，请重试', 'error');
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const handlePostCreated = (post: PostItem) => {
    setPosts((prev) => [post, ...prev]);
    showToast('帖子发布成功 🎉', 'success');
  };

  const handleTopicCreated = (topic: TopicItem) => {
    setTopics((prev) => prev.some((t) => t.id === topic.id) ? prev : [...prev, topic]);
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (sortBy === 'hot') {
      const likeDiff = b.likes - a.likes;
      if (likeDiff !== 0) return likeDiff;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <>
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <LoginRequiredModal open={loginModal} redirectTo="/community" onCancel={() => setLoginModal(false)} />
      <section className="hidden sm:block px-4 sm:px-6 lg:px-8 pt-20 pb-6 animate-fade-in-up">
        <div className="container-main">
          <h1 className="section-title" style={{ fontFamily: "'Blazed', sans-serif" }}>1103</h1>
          <p className="section-desc">老铁们一起唠嗑、整活、开黑</p>
        </div>
      </section>

      <div className="container-main px-3 sm:px-6 lg:px-8 pt-[60px] sm:pt-0 pb-16">
        <div className="grid lg:grid-cols-[1fr_280px] gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">
            {/* New Post */}
            <PostComposer topics={topics} onPostCreated={handlePostCreated} onTopicCreated={handleTopicCreated} isLoggedIn={isLoggedIn} />

            {/* Mobile: community stats (hidden on lg) */}
            <div className="flex items-center gap-4 text-caption text-text-muted lg:hidden">
              <span>成员 <strong className="text-text-title">{formatNum(communityStats.totalFans)}</strong></span>
              <span>今日 <strong className="text-text-title">{formatNum(communityStats.todayPosts)}</strong></span>
              <span>在线 <strong className="text-text-title">{formatNum(communityStats.onlineNow)}</strong></span>
            </div>

            {/* Filters: dropdown + sort */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-shrink-0">
                <select
                  value={activeTopicId || ''}
                  onChange={(e) => setActiveTopicId(e.target.value || null)}
                  className="h-8 pl-3 pr-8 rounded-btn border border-border bg-white text-caption font-medium text-text-body appearance-none cursor-pointer focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                >
                  <option value="">全部分类</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {(['hot', 'new'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`h-8 px-3 rounded-btn text-caption font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer ${sortBy === s ? 'text-primary bg-primary-bg' : 'text-text-muted hover:text-primary'}`}
                  >
                    {s === 'hot' ? '热门' : '最新'}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts */}
            {loading ? (
              <p className="text-body text-text-muted text-center py-12">加载中...</p>
            ) : sortedPosts.length === 0 ? (
              <p className="text-body text-text-muted text-center py-12">暂无帖子</p>
            ) : sortedPosts.map((post) => {
              const mediaUrls: string[] = (() => { try { return JSON.parse(post.images || '[]'); } catch { return []; } })();
              const images = mediaUrls.filter((u) => !u.match(/\.(mp4|webm|mov)$/i));
              const videos = mediaUrls.filter((u) => u.match(/\.(mp4|webm|mov)$/i));
              return (
                <article key={post.id} className="bg-white rounded-card p-3 sm:p-5 shadow-card border border-divider transition-shadow duration-150 hover:shadow-card-hover">
                  <div className="flex items-start gap-3">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                      {post.author?.avatar ? (
                        <Image src={post.author.avatar} alt={post.author.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-bg text-body font-bold text-primary">{post.author.name[0]}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-body font-medium text-text-title">{post.author.name}</span>
                        <RoleBadge role={post.author.role} />
                        {post.isPinned && (
                          <span className="inline-flex items-center gap-0.5 text-danger text-caption font-medium">
                            <Pin className="w-3 h-3" /> 置顶
                          </span>
                        )}
                        <span className="text-caption text-text-muted ml-auto">{timeAgo(post.createdAt)}</span>
                      </div>

                      <p className="text-body text-text-body mt-2 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                      {post.postTags && post.postTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {post.postTags.map((pt) => (
                            <button
                              key={pt.tag.id}
                              onClick={() => setActiveTopicId(pt.tag.id)}
                              className={`text-caption cursor-pointer transition-colors duration-150 ${
                                activeTopicId === pt.tag.id ? 'text-primary font-medium' : 'text-primary/70 hover:text-primary hover:underline'
                              }`}
                            >
                              #{pt.tag.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Images */}
                      {images.length > 0 && (
                        <div className={`mt-3 grid gap-2 ${images.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-2'}`}>
                          {images.map((img, idx) => (
                            <div key={idx} className="relative rounded-card overflow-hidden aspect-video bg-gray-100 cursor-pointer">
                              <Image src={img} alt="" fill className="object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Videos */}
                      {videos.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {videos.map((vid, idx) => (
                            <video key={idx} src={vid} controls className="w-full max-w-md rounded-card bg-black" />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-divider">
                        <button
                          onClick={() => toggleLike(post.id)}
                          className={`flex items-center gap-1 text-caption transition-colors duration-150 cursor-pointer ${
                            likedPosts.has(post.id) ? 'text-danger' : 'text-text-muted hover:text-danger'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                          {formatNum(post.likes)}
                        </button>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className={`flex items-center gap-1 text-caption transition-colors duration-150 cursor-pointer ${
                            expandedComments.has(post.id) ? 'text-primary' : 'text-text-muted hover:text-primary'
                          }`}
                        >
                          <MessageCircle className="w-4 h-4" /> {post._count.comments}
                        </button>
                        <Link
                          href={`/community/${post.id}`}
                          className="flex items-center gap-1 text-caption text-text-muted hover:text-primary transition-colors duration-150 ml-auto"
                        >
                          查看详情 →
                        </Link>
                      </div>

                      {/* Comments */}
                      {expandedComments.has(post.id) && <CommentSection postId={post.id} onToast={showToast} isLoggedIn={isLoggedIn} />}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 hidden lg:block">
            <CheckinCard />

            <div className="card">
              <h3 className="text-body font-semibold text-text-title mb-3">社区数据</h3>
              <div className="space-y-2">
                {[
                  { label: '社区成员', value: formatNum(communityStats.totalFans) },
                  { label: '今日帖子', value: formatNum(communityStats.todayPosts) },
                  { label: '在线人数', value: formatNum(communityStats.onlineNow) },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between items-center">
                    <span className="text-caption text-text-muted">{stat.label}</span>
                    <span className="text-body font-medium text-text-title">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-body font-semibold text-text-title mb-3">热门话题</h3>
              <div className="flex flex-wrap gap-1.5">
                {hotTopics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setActiveTopicId(topic.id)}
                    className={`tag-primary cursor-pointer transition-colors duration-150 ${
                      activeTopicId === topic.id ? 'ring-2 ring-primary/30' : ''
                    }`}
                  >
                    #{topic.name}
                  </button>
                ))}
                {hotTopics.length === 0 && (
                  <span className="text-caption text-text-disabled">暂无话题</span>
                )}
              </div>
            </div>

            {/* Upload Limits Info */}
            <div className="card">
              <h3 className="text-body font-semibold text-text-title mb-3">发帖须知</h3>
              <div className="space-y-1.5 text-caption text-text-muted">
                <p>· 图片：JPG/PNG/WebP/GIF，≤5MB</p>
                <p>· 视频：MP4/WebM，≤50MB</p>
                <p>· 每帖最多{MAX_FILES}个附件</p>
                <p>· 内容不得包含违禁词</p>
              </div>
            </div>

            <div className="bg-primary/5 border-2 border-primary/30 rounded-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-body font-bold text-primary">社区公约</h3>
              </div>
              <ol className="space-y-2 text-caption text-text-body list-none">
                {[
                  '友善交流，互相尊重',
                  '禁止发布不实信息',
                  '尊重明星隐私',
                  '原创内容请标注来源',
                  '禁止商业推广和广告',
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
