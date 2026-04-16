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
  parentId: string | null;
  replyToName: string | null;
  author: { id: string; name: string; avatar: string | null; role: string; level: number; badge: string | null };
  replies?: CommentItem[];
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
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); handleCreate(); } }}
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
                    isSelected ? 'bg-primary/5 text-primary' : 'text-text-body hover:bg-gray-50 dark:hover:bg-[#28282c]'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isExpanded = expanded || content.length > 0 || mediaFiles.length > 0 || selectedTopics.length > 0;

  // Inline # 话题提示
  const [hashQuery, setHashQuery] = useState<string | null>(null);
  const [hashStart, setHashStart] = useState(0);
  const [creatingInline, setCreatingInline] = useState(false);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setError('');

    // 检测光标前是否有 # 触发词
    const pos = e.target.selectionStart ?? val.length;
    const before = val.slice(0, pos);
    const hashIdx = before.lastIndexOf('#');
    if (hashIdx >= 0) {
      const afterHash = before.slice(hashIdx + 1);
      // 只有 # 后面没有空格且不超过20字才视为正在输入话题
      if (!afterHash.includes(' ') && !afterHash.includes('\n') && afterHash.length <= 20) {
        setHashQuery(afterHash);
        setHashStart(hashIdx);
        return;
      }
    }
    setHashQuery(null);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (hashQuery !== null && (e.key === 'Escape' || e.key === 'Tab')) {
      e.preventDefault();
      setHashQuery(null);
    }
  };

  const selectInlineTopic = (topic: TopicItem) => {
    // 替换 #xxx 为 #话题名 + 空格
    const before = content.slice(0, hashStart);
    const cursorPos = textareaRef.current?.selectionStart ?? content.length;
    const after = content.slice(cursorPos);
    const newContent = `${before}#${topic.name} ${after}`;
    setContent(newContent);
    setHashQuery(null);
    // 关联话题
    if (selectedTopics.length < 5 && !selectedTopics.some((t) => t.id === topic.id)) {
      setSelectedTopics((prev) => [...prev, topic]);
    }
    // 聚焦光标到插入位置后
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        const newPos = before.length + 1 + topic.name.length + 1;
        ta.focus();
        ta.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const createInlineTopic = async () => {
    if (!hashQuery || creatingInline) return;
    const name = hashQuery.replace(/^#+/, '').trim();
    if (!name || name.length > 20) return;
    setCreatingInline(true);
    try {
      const res = await fetch('/api/auth/topics', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      const newTopic: TopicItem = json.data;
      onTopicCreated(newTopic);
      selectInlineTopic(newTopic);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建话题失败');
      setHashQuery(null);
    } finally {
      setCreatingInline(false);
    }
  };

  const inlineFiltered = hashQuery !== null
    ? topics.filter((t) => t.name.toLowerCase().includes(hashQuery.toLowerCase()))
    : [];
  const inlineExactMatch = hashQuery !== null && topics.some((t) => t.name === hashQuery.replace(/^#+/, '').trim());
  const inlineCanCreate = hashQuery !== null && hashQuery.replace(/^#+/, '').trim().length > 0 && hashQuery.length <= 20 && !inlineExactMatch;

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
        // 通过服务端上传到 COS（避免 COS CORS 问题，同时自动记录媒体库）
        const fd = new FormData();
        fd.append('file', file);

        const uploadResult = await new Promise<{ url: string }>((resolve, reject) => {
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
            try {
              const json = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300 && json.code === 0) {
                resolve(json.data);
              } else {
                reject(new Error(json.message || `上传失败(${xhr.status})`));
              }
            } catch {
              reject(new Error(`上传失败(${xhr.status})`));
            }
          };
          xhr.onerror = () => reject(new Error('网络错误，上传失败'));
          xhr.open('POST', '/api/auth/upload-media');
          xhr.withCredentials = true;
          xhr.send(fd);
        });

        setMediaFiles((prev) =>
          prev.map((m) => m.id === localId ? { ...m, url: uploadResult.url, uploading: false, progress: 100 } : m)
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
    <div className="rounded-card p-3 sm:p-5">
      <LoginRequiredModal open={loginModal} redirectTo="/community" onCancel={() => setLoginModal(false)} />
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onFocus={() => { if (!isLoggedIn) { setLoginModal(true); return; } setExpanded(true); }}
          onChange={handleContentChange}
          onKeyDown={handleTextareaKeyDown}
          placeholder="分享你的追星心情...  输入 # 可添加话题"
          maxLength={2000}
          rows={isExpanded ? undefined : 1}
          className={`w-full resize-none border-none outline-none text-body text-text-body placeholder:text-text-muted bg-transparent transition-all duration-200 ${
            isExpanded ? 'min-h-[56px] sm:min-h-[72px]' : 'min-h-0 h-7'
          }`}
        />
        {/* Inline # 话题下拉提示 */}
        {hashQuery !== null && (inlineFiltered.length > 0 || inlineCanCreate) && (
          <div className="absolute left-0 right-0 top-full mt-1 w-64 bg-white rounded-card shadow-lg border border-divider z-30 py-1 max-h-52 overflow-y-auto">
            {inlineCanCreate && (
              <button
                onClick={createInlineTopic}
                disabled={creatingInline}
                className="w-full flex items-center gap-2 px-3 py-2 text-caption text-primary hover:bg-primary/5 transition-colors duration-100 cursor-pointer border-b border-divider"
              >
                {creatingInline ? (
                  <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                ) : (
                  <Plus className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="flex-1 text-left truncate">
                  {creatingInline ? '创建中...' : `创建「${hashQuery.replace(/^#+/, '').trim()}」`}
                </span>
              </button>
            )}
            {inlineFiltered.map((topic) => {
              const isSelected = selectedTopics.some((t) => t.id === topic.id);
              return (
                <button
                  key={topic.id}
                  onClick={() => selectInlineTopic(topic)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-caption transition-colors duration-100 cursor-pointer ${
                    isSelected ? 'bg-primary/5 text-primary' : 'text-text-body hover:bg-gray-50 dark:hover:bg-[#28282c]'
                  }`}
                >
                  <Hash className="w-3 h-3 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{topic.name}</span>
                  <span className="text-[11px] text-text-disabled">{topic.postCount}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Media Previews */}
          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {mediaFiles.map((mf) => (
                <div key={mf.id} className="relative rounded-btn overflow-hidden aspect-video bg-gray-100 dark:bg-[#28282c] group">
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
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
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
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/posts/${postId}/comments`);
      const json = await res.json();
      if (json.data) setComments(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const mentionCandidates = Array.from(new Set([
    ...comments.map((c) => c.author.name),
    ...comments.flatMap((c) => (c.replies || []).map((r) => r.author.name)),
  ])).filter(Boolean);

  const filteredMentionNames = mentionCandidates
    .filter((name) => !mentionQuery || name.toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 6);

  const handleContentChange = (value: string) => {
    setContent(value);
    setError('');
    const match = value.match(/(?:^|\s)@([\w\u4e00-\u9fa5-]{0,20})$/);
    if (match) {
      setMentionQuery(match[1] || '');
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = (name: string) => {
    setContent((prev) => {
      const replaced = prev.replace(/(?:^|\s)@([\w\u4e00-\u9fa5-]{0,20})$/, (m, p1) => m.replace(`@${p1}`, `@${name} `));
      return replaced === prev ? `${prev}@${name} ` : replaced;
    });
    setMentionOpen(false);
    setMentionQuery('');
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    if (!isLoggedIn) {
      setLoginModal(true);
      return;
    }
    setSending(true);
    setError('');
    try {
      const body: Record<string, string> = { postId, content: content.trim() };
      if (replyTo) {
        body.parentId = replyTo.id;
        body.replyToName = replyTo.name;
      }
      const res = await fetch('/api/auth/comments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      if (replyTo) {
        setComments((prev) => prev.map((c) =>
          c.id === replyTo.id ? { ...c, replies: [...(c.replies || []), json.data] } : c
        ));
      } else {
        setComments((prev) => [{ ...json.data, replies: [] }, ...prev]);
      }
      setContent('');
      setReplyTo(null);
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
      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 text-[11px] text-primary bg-primary-bg rounded-btn px-2.5 py-1">
          <span>回复 <strong>{replyTo.name}</strong></span>
          <button onClick={() => setReplyTo(null)} className="ml-auto p-0.5 rounded hover:bg-primary/10 cursor-pointer"><X className="w-3 h-3" /></button>
        </div>
      )}
      {/* Comment Input */}
      <div className="relative mb-3">
        <div className="flex gap-2">
          <input
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={(e) => {
              if (mentionOpen && filteredMentionNames.length > 0 && e.key === 'Enter') {
                e.preventDefault();
                insertMention(filteredMentionNames[0]);
                return;
              }
              if (mentionOpen && e.key === 'Escape') {
                e.preventDefault();
                setMentionOpen(false);
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={replyTo ? `回复 ${replyTo.name}...` : '写评论...（输入 @ 可提及）'}
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

        {mentionOpen && filteredMentionNames.length > 0 && (
          <div className="absolute left-0 right-10 top-full mt-1 z-20 bg-white border border-divider rounded-card shadow-dropdown p-1">
            {filteredMentionNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => insertMention(name)}
                className="w-full h-8 px-2 rounded-btn text-left text-caption text-text-body hover:bg-gray-50 inline-flex items-center gap-1 cursor-pointer"
              >
                <span className="text-primary">@</span>{name}
              </button>
            ))}
          </div>
        )}
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
            <div key={c.id}>
              <div className="flex items-start gap-2">
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
                  <button
                    onClick={() => setReplyTo({ id: c.id, name: c.author.name })}
                    className="mt-0.5 text-[11px] text-text-muted hover:text-primary cursor-pointer transition-colors inline-flex items-center gap-0.5"
                  >
                    <MessageCircle className="w-2.5 h-2.5" /> 回复
                  </button>
                </div>
              </div>
              {/* Nested replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="ml-8 mt-1.5 pl-2.5 border-l-2 border-primary/10 space-y-1.5">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex items-start gap-1.5">
                      <div className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 mt-0.5">
                        {r.author?.avatar ? (
                          <Image src={r.author.avatar} alt={r.author.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-bg text-[9px] font-bold text-primary">{r.author.name[0]}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium text-text-title">{r.author.name}</span>
                        {r.replyToName && <span className="text-[11px] text-text-muted"> 回复 <span className="text-primary">{r.replyToName}</span></span>}
                        <p className="text-[11px] text-text-body">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
  const [checkedDays, setCheckedDays] = useState<number[]>([]);
  const [calMonth, setCalMonth] = useState(0);
  const [calYear, setCalYear] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);

  useEffect(() => {
    fetch('/api/auth/checkin', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setCheckedIn(json.data.checkedIn);
          setStreak(json.data.streak);
          setCheckedDays(json.data.checkedDays || []);
          setCalMonth(json.data.month || new Date().getMonth() + 1);
          setCalYear(json.data.year || new Date().getFullYear());
          setMonthTotal(json.data.monthTotal || 0);
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
        const today = new Date().getDate();
        setCheckedDays((prev) => prev.includes(today) ? prev : [...prev, today]);
        setMonthTotal((prev) => prev + 1);
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

  // 生成日历网格
  const calendarGrid = (() => {
    if (!calYear || !calMonth) return [];
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const today = new Date().getDate();
    const isCurrentMonth = calYear === new Date().getFullYear() && calMonth === new Date().getMonth() + 1;
    const grid: { day: number; checked: boolean; isToday: boolean; isPast: boolean }[] = [];
    // 填充空白
    for (let i = 0; i < firstDay; i++) grid.push({ day: 0, checked: false, isToday: false, isPast: false });
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({
        day: d,
        checked: checkedDays.includes(d),
        isToday: isCurrentMonth && d === today,
        isPast: isCurrentMonth ? d < today : true,
      });
    }
    return grid;
  })();

  if (loading) return null;

  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="rounded-card bg-white/40 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-4">
      <LoginRequiredModal open={loginModal} redirectTo="/community" onCancel={() => setLoginModal(false)} />
      <div className="flex items-center justify-between">
        <h3 className="text-caption font-semibold text-text-title flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-primary" /> 每日签到
        </h3>
        {streak > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-orange-500 font-medium">
            <Flame className="w-3 h-3" /> 连续{streak}天
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-primary/[0.06] px-2 py-1.5 text-center">
          <p className="text-body font-semibold text-primary">{monthTotal}</p>
          <p className="text-[10px] text-text-muted">{calMonth}月签到</p>
        </div>
        <div className="rounded-lg bg-orange-500/[0.06] px-2 py-1.5 text-center">
          <p className="text-body font-semibold text-orange-500">{streak}</p>
          <p className="text-[10px] text-text-muted">连续天数</p>
        </div>
      </div>

      {/* Calendar grid */}
      {isLoggedIn && calendarGrid.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] text-text-muted mb-1">{calYear}年{calMonth}月</p>
          <div className="grid grid-cols-7 gap-0 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-[9px] text-text-disabled py-0.5">{w}</div>
            ))}
            {calendarGrid.map((cell, i) => (
              <div
                key={i}
                className={`w-full aspect-square flex items-center justify-center rounded-full text-[10px] transition-colors ${
                  cell.day === 0
                    ? ''
                    : cell.checked
                      ? 'bg-primary text-white font-bold'
                      : cell.isToday
                        ? 'ring-1 ring-primary text-primary font-medium'
                        : cell.isPast
                          ? 'text-text-disabled'
                          : 'text-text-muted'
                }`}
              >
                {cell.day > 0 ? cell.day : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleCheckin}
        disabled={(isLoggedIn && checkedIn) || doing}
        className={`mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-btn font-medium text-caption transition-all duration-200 ${
          isLoggedIn && checkedIn
            ? 'bg-gray-100 dark:bg-[#28282c] text-text-muted cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-sm'
        }`}
      >
        {doing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className={`w-3.5 h-3.5 ${isLoggedIn && checkedIn ? 'text-success' : ''}`} />}
        {!isLoggedIn ? '登录后签到' : checkedIn ? '今日已签到 ✓' : '立即签到 +5积分'}
      </button>
      {toast && <p className={`text-[11px] mt-1.5 text-center ${toast.ok ? 'text-success' : 'text-danger'}`}>{toast.msg}</p>}
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
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' });
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loginModal, setLoginModal] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

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
  const fetchPosts = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), pageSize: String(PAGE_SIZE), sort: sortBy });
      if (activeTopicId) params.set('tagId', activeTopicId);
      const res = await fetch(`/api/public/posts?${params}`);
      const json = await res.json();
      if (json.data?.list) {
        if (append) {
          setPosts((prev) => [...prev, ...json.data.list]);
        } else {
          setPosts(json.data.list);
        }
        const { pagination } = json.data;
        setHasMore(pagination.page < pagination.totalPages);
      }
    } catch { /* ignore */ }
    setLoading(false);
    setLoadingMore(false);
  }, [activeTopicId, sortBy]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPosts(1, false);
  }, [activeTopicId, sortBy, fetchPosts]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((prev) => {
            const next = prev + 1;
            fetchPosts(next, true);
            return next;
          });
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchPosts]);

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

  const sortedPosts = posts;

  const activeTopicName = activeTopicId ? topics.find((topic) => topic.id === activeTopicId)?.name ?? '当前话题' : '全部动态';

  return (
    <>
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <LoginRequiredModal open={loginModal} redirectTo="/community" onCancel={() => setLoginModal(false)} />

      {/* Cover Banner — 与关于/相册页保持一致 */}
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
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-caption font-medium text-primary">1103 社区</span>
          </div>
          <h1 className="text-heading-lg text-white">老铁们一起唠嗑、整活、开黑</h1>
          <p className="text-body text-gray-400 mt-1.5 max-w-md mx-auto">
            发布动态、参与热门话题、分享追星现场
          </p>
        </div>
      </section>


      <section className="section-block relative animate-fade-in-up">
        {/* 柔和渐变背景 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(24,144,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(250,173,20,0.05) 0%, transparent 60%)',
        }} />
      <div className="container-main relative z-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4 sm:space-y-5">
            {/* New Post */}
            <div className="rounded-card bg-white/40 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-0">
              <PostComposer topics={topics} onPostCreated={handlePostCreated} onTopicCreated={handleTopicCreated} isLoggedIn={isLoggedIn} />
            </div>


            {/* Filters: dropdown + sort */}
            <div className="sticky top-16 z-20 -mx-1 rounded-card bg-white/60 dark:bg-[#1e1e22]/90 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] p-3 sm:mx-0 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-caption font-medium text-text-title">{activeTopicName}</p>
                  <p className="mt-1 text-caption leading-6 text-text-muted">按话题筛选并切换热门或最新排序，快速找到你想看的社区动态。</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="relative flex-shrink-0">
                    <select
                      value={activeTopicId || ''}
                      onChange={(e) => setActiveTopicId(e.target.value || null)}
                      className="h-9 appearance-none rounded-btn border border-border bg-white dark:bg-[#28282c] pl-3 pr-9 text-caption font-medium text-text-body transition-colors cursor-pointer focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">全部分类</option>
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>{topic.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  </div>
                  <div className="flex gap-1 rounded-full bg-gray-50 dark:bg-[#28282c] p-1">
                    {(['hot', 'new'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSortBy(s)}
                        className={`h-8 rounded-full px-3 text-caption font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer ${sortBy === s ? 'bg-white dark:bg-[#1e1e22] text-primary shadow-sm' : 'text-text-muted hover:text-primary'}`}
                      >
                        {s === 'hot' ? '热门' : '最新'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Posts */}
            {loading && posts.length === 0 ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-card bg-white/40 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] p-4 sm:p-5 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#28282c] flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-[#28282c]" />
                          <div className="h-3 w-16 rounded bg-gray-100 dark:bg-[#333]" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 w-full rounded bg-gray-200 dark:bg-[#28282c]" />
                          <div className="h-3 w-4/5 rounded bg-gray-200 dark:bg-[#28282c]" />
                          <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-[#333]" />
                        </div>
                        <div className="flex gap-4 pt-1">
                          <div className="h-3 w-12 rounded bg-gray-100 dark:bg-[#333]" />
                          <div className="h-3 w-12 rounded bg-gray-100 dark:bg-[#333]" />
                          <div className="h-3 w-12 rounded bg-gray-100 dark:bg-[#333]" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedPosts.length === 0 ? (
              <p className="text-body text-text-muted text-center py-12">暂无帖子</p>
            ) : sortedPosts.map((post) => {
              const mediaUrls: string[] = (() => { try { return JSON.parse(post.images || '[]'); } catch { return []; } })();
              const images = mediaUrls.filter((u) => !u.match(/\.(mp4|webm|mov)$/i));
              const videos = mediaUrls.filter((u) => u.match(/\.(mp4|webm|mov)$/i));
              return (
                <article key={post.id} className="group rounded-card bg-white/40 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/50 dark:hover:bg-[#1e1e22] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.10)] sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                      {post.author?.avatar ? (
                        <Image src={post.author.avatar} alt={post.author.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-bg text-body font-bold text-primary">{post.author.name[0]}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-body font-medium text-text-title">{post.author.name}</span>
                            <RoleBadge role={post.author.role} />
                            {post.isPinned && (
                              <span className="inline-flex items-center gap-0.5 text-danger text-caption font-medium">
                                <Pin className="w-3 h-3" /> 置顶
                              </span>
                            )}
                          </div>
                          <span className="mt-1 inline-flex text-caption text-text-muted">{timeAgo(post.createdAt)}</span>
                        </div>
                        <Link
                          href={`/community/${post.id}`}
                          className="hidden text-caption text-text-muted transition-colors duration-150 hover:text-primary sm:inline-flex"
                        >
                          查看详情
                        </Link>
                      </div>

                      <p className="mt-3 text-body text-text-body leading-7 whitespace-pre-wrap">{post.content}</p>

                      {post.postTags && post.postTags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
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
                        <div className={`mt-4 grid gap-2 ${images.length === 1 ? 'grid-cols-1 max-w-2xl' : 'grid-cols-2'}`}>
                          {images.map((img, idx) => (
                            <div key={idx} className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 cursor-pointer">
                              <Image src={img} alt="" fill className="object-cover transition-transform duration-200 group-hover:scale-[1.01]" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Videos */}
                      {videos.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {videos.map((vid, idx) => (
                            <video key={idx} src={vid} controls className="w-full max-w-2xl rounded-xl bg-black" />
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-[#28282c] px-3 py-2.5">
                        <button
                          onClick={() => toggleLike(post.id)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-caption transition-colors duration-150 cursor-pointer ${
                            likedPosts.has(post.id) ? 'text-danger' : 'text-text-muted hover:text-danger'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                          {formatNum(post.likes)}
                        </button>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-caption transition-colors duration-150 cursor-pointer ${
                            expandedComments.has(post.id) ? 'text-primary' : 'text-text-muted hover:text-primary'
                          }`}
                        >
                          <MessageCircle className="w-4 h-4" /> {post._count.comments}
                        </button>
                        <Link
                          href={`/community/${post.id}`}
                          className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-caption text-text-muted transition-colors duration-150 hover:text-primary sm:hidden"
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

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-caption text-text-muted">加载更多...</span>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-caption text-text-disabled text-center py-6">— 没有更多了 —</p>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block self-start sticky top-20">
            <div className="space-y-3 stagger-children pb-4">
              <CheckinCard />


              <div className="rounded-card bg-white/40 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-4">
                <h3 className="mb-2 text-caption font-semibold text-text-title">热门话题</h3>
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
              <div className="rounded-card bg-white/40 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-4">
                <h3 className="mb-2 text-caption font-semibold text-text-title">发帖须知</h3>
                <div className="space-y-1 text-[12px] text-text-muted leading-5">
                  <p>· 图片：JPG/PNG/WebP/GIF，≤5MB</p>
                  <p>· 视频：MP4/WebM，≤50MB</p>
                  <p>· 每帖最多{MAX_FILES}个附件</p>
                  <p>· 内容不得包含违禁词</p>
                </div>
              </div>

              <div className="rounded-card border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 backdrop-blur-md p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-caption font-bold text-primary">社区公约</h3>
                </div>
                <ol className="list-none space-y-1.5 text-[12px] text-text-body">
                  {[
                    '友善交流，互相尊重',
                    '禁止发布不实信息',
                    '尊重明星隐私',
                    '原创内容请标注来源',
                    '禁止商业推广和广告',
                  ].map((rule, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">{i + 1}</span>
                      <span className="leading-4">{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </aside>
        </div>
      </div>
      </section>
    </>
  );
}
