'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft, Heart, MessageCircle, Share2, Pin, Loader2,
  Send, ChevronDown, ChevronUp, Flag, X, Bookmark, ChevronLeft, ChevronRight, Star,
} from 'lucide-react';
import LoginRequiredModal from '@/components/LoginRequiredModal';
import SafeImage from '@/components/SafeImage';

interface Author {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  level: number;
  badge: string | null;
  customBadge: string | null;
}

interface CommentItem {
  id: string;
  content: string;
  likes: number;
  createdAt: string;
  author: Author;
  parentId: string | null;
  replyToName: string | null;
  replies?: CommentItem[];
}

interface PostDetail {
  id: string;
  content: string;
  images: string;
  likes: number;
  isPinned: boolean;
  createdAt: string;
  author: Author;
  postTags: { tag: { id: string; name: string; color: string | null } }[];
  comments: CommentItem[];
  _count: { comments: number };
}

const roleLabel: Record<string, { text: string; cls: string }> = {
  star: { text: '★ 董事长', cls: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white' },
  assistant: { text: '传媒成员', cls: 'bg-primary-bg text-primary' },
};

function UserLevelBadge({ level }: { level: number }) {
  return <span className="inline-flex items-center h-5 px-2 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">Lv.{level}</span>;
}

function SystemUserTagBadge({ label }: { label: string | null | undefined }) {
  if (!label) return null;
  if (label === '1103') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#7c3aed] px-2.5 py-1 text-white shadow-[0_8px_20px_rgba(59,130,246,0.22)] ring-1 ring-white/15">
        <Star className="w-3 h-3 text-[#ffe7a3] fill-[#ffe7a3]" />
        <span className="font-waterbrush text-[15px] leading-none text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.25)]">1103</span>
      </span>
    );
  }

  return <span className="inline-flex items-center h-5 px-2 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{label}</span>;
}

function CustomUserTagBadge({ label }: { label: string | null | undefined }) {
  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-gradient-to-r from-white to-primary-bg px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
      <span>{label}</span>
    </span>
  );
}

function UserBadgeGroup({ customBadge, badge }: { customBadge: string | null | undefined; badge: string | null | undefined }) {
  const normalizedCustomBadge = customBadge?.trim();
  const normalizedBadge = badge?.trim();

  return (
    <>
      <CustomUserTagBadge label={normalizedCustomBadge} />
      <SystemUserTagBadge label={normalizedBadge && normalizedBadge !== normalizedCustomBadge ? normalizedBadge : null} />
    </>
  );
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(date).toLocaleDateString('zh-CN');
}

function formatNum(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' });
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDesc, setReportDesc] = useState('');
  const [reporting, setReporting] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [loginModal, setLoginModal] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 3000);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => { if (json.code !== 0) setIsLoggedIn(false); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/public/posts/${postId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setPost(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  const handleLike = async () => {
    if (!isLoggedIn) {
      setLoginModal(true);
      return;
    }
    const isLiked = liked;
    setLiked(!isLiked);
    if (post) setPost({ ...post, likes: post.likes + (isLiked ? -1 : 1) });

    try {
      const res = await fetch(`/api/auth/posts/${postId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      if (post) setPost((prev) => prev ? { ...prev, likes: json.data.likes } : prev);
      showToast(isLiked ? '已取消点赞' : '点赞成功 ❤️');
    } catch (err) {
      setLiked(isLiked);
      if (post) setPost({ ...post, likes: post.likes });
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleComment = async () => {
    if (!isLoggedIn) {
      setLoginModal(true);
      return;
    }
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const body: Record<string, string> = { postId, content: commentText.trim() };
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
        // 将回复追加到父评论的 replies 中
        setPost((prev) => prev ? {
          ...prev,
          comments: prev.comments.map((c) =>
            c.id === replyTo.id
              ? { ...c, replies: [...(c.replies || []), json.data] }
              : c
          ),
          _count: { comments: prev._count.comments + 1 },
        } : prev);
      } else {
        setPost((prev) => prev ? {
          ...prev,
          comments: [{ ...json.data, replies: [] }, ...prev.comments],
          _count: { comments: prev._count.comments + 1 },
        } : prev);
      }
      setCommentText('');
      setReplyTo(null);
      showToast('评论成功');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '评论失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookmark = async () => {
    if (!isLoggedIn) {
      setLoginModal(true);
      return;
    }
    if (bookmarking) return;
    const wasBookmarked = bookmarked;
    setBookmarked(!wasBookmarked);
    setBookmarking(true);
    try {
      const res = await fetch(`/api/auth/bookmarks/${postId}`, {
        method: wasBookmarked ? 'DELETE' : 'POST',
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      showToast(wasBookmarked ? '已取消收藏' : '收藏成功 ★');
    } catch (err) {
      setBookmarked(wasBookmarked);
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setBookmarking(false);
    }
  };

  const handleReport = async () => {
    setReporting(true);
    try {
      const res = await fetch('/api/auth/reports', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'post', targetId: postId, reason: reportReason, description: reportDesc || undefined }),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      setReportOpen(false);
      setReportReason('spam');
      setReportDesc('');
      showToast('举报已提交，感谢你的反馈');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '举报失败', 'error');
    } finally {
      setReporting(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: post ? `${post.author.name}的帖子` : '帖子详情', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('链接已复制')).catch(() => showToast('复制失败', 'error'));
    }
  };

  const mediaUrls: string[] = (() => {
    if (!post) return [];
    try { return JSON.parse(post.images || '[]'); } catch { return []; }
  })();
  const imageUrls = mediaUrls.filter((u) => !u.match(/\.(mp4|webm|mov)$/i));
  const videoUrls = mediaUrls.filter((u) => u.match(/\.(mp4|webm|mov)$/i));

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (lightbox === null || imageUrls.length <= 1) return;
    const max = imageUrls.length - 1;
    const next = direction === 'prev'
      ? (lightbox - 1 + imageUrls.length) % imageUrls.length
      : (lightbox + 1) % imageUrls.length;
    setLightbox(Math.min(max, Math.max(0, next)));
  }, [lightbox, imageUrls.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') navigateLightbox('prev');
      if (e.key === 'ArrowRight') navigateLightbox('next');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightbox, navigateLightbox]);

  if (loading) {
    return (
      <div className="pt-14 min-h-screen bg-bg-page">
        <div className="sticky top-14 z-20 bg-white dark:bg-[#1e1e22] border-b border-divider">
          <div className="container-main px-4 sm:px-6 lg:px-8 flex items-center h-12">
            <div className="w-5 h-5 rounded bg-gray-200 dark:bg-[#28282c]" />
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-[#28282c] ml-2" />
          </div>
        </div>
        <div className="container-main px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto animate-pulse">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-[#28282c]" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-gray-200 dark:bg-[#28282c]" />
                <div className="h-3 w-20 rounded bg-gray-100 dark:bg-[#333]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-[#28282c]" />
              <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-[#28282c]" />
              <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-[#333]" />
            </div>
            <div className="flex gap-2">
              <div className="w-24 h-24 rounded-btn bg-gray-200 dark:bg-[#28282c]" />
              <div className="w-24 h-24 rounded-btn bg-gray-200 dark:bg-[#28282c]" />
            </div>
            <div className="flex gap-6 pt-4 border-t border-divider">
              <div className="h-4 w-16 rounded bg-gray-100 dark:bg-[#333]" />
              <div className="h-4 w-16 rounded bg-gray-100 dark:bg-[#333]" />
              <div className="h-4 w-16 rounded bg-gray-100 dark:bg-[#333]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-14 min-h-screen flex flex-col items-center justify-center">
        <p className="text-body text-text-muted">帖子不存在或已下架</p>
        <Link href="/community" className="btn-primary mt-4">返回社区</Link>
      </div>
    );
  }

  const visibleComments = showAllComments ? post.comments : post.comments.slice(0, 10);

  return (
    <div className="pt-14 min-h-screen bg-bg-page">
      <LoginRequiredModal open={loginModal} redirectTo={`/community/${postId}`} onCancel={() => setLoginModal(false)} />
      {/* Header */}
      <div className="sticky top-14 z-20 bg-white dark:bg-[#1e1e22] border-b border-divider">
        <div className="container-main px-4 sm:px-6 lg:px-8 flex items-center h-12">
          <button onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-btn hover:bg-gray-50 dark:hover:bg-[#28282c] transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-text-body" />
          </button>
          <span className="text-body font-medium text-text-title ml-2">帖子详情</span>
        </div>
      </div>

      <div className="container-main px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
        {/* Post Content */}
        <article className="card">
          {/* Author Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
              {post.author.avatar && (
                <SafeImage
                  src={post.author.avatar}
                  alt={post.author.name}
                  fill
                  className="object-cover"
                  sizes="44px"
                  loading="lazy"
                />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body font-medium text-text-title">{post.author.name}</span>
                {roleLabel[post.author.role] && (
                  <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-bold ${roleLabel[post.author.role].cls}`}>
                    {roleLabel[post.author.role].text}
                  </span>
                )}
                <UserLevelBadge level={post.author.level} />
                <UserBadgeGroup customBadge={post.author.customBadge} badge={post.author.badge} />
                {post.isPinned && <span className="tag bg-red-50 text-danger inline-flex items-center gap-0.5"><Pin className="w-3 h-3" /> 置顶</span>}
              </div>
              <div className="flex items-center gap-2 text-caption text-text-muted mt-0.5">
                <span>{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <p className="text-body text-text-body whitespace-pre-wrap leading-relaxed">{post.content}</p>

          {/* Tags */}
          {post.postTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {post.postTags.map((pt) => (
                <span key={pt.tag.id} className="tag-primary">{pt.tag.name}</span>
              ))}
            </div>
          )}

          {/* Video */}
          {videoUrls.length > 0 && (
            <div className="mt-4 rounded-btn overflow-hidden bg-black">
              <video src={videoUrls[0]} controls className="w-full max-h-96 rounded-btn" />
            </div>
          )}

          {/* Images */}
          {videoUrls.length === 0 && imageUrls.length > 0 && (
            <div className={`mt-4 grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' : imageUrls.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {imageUrls.map((url, i) => (
                <button
                  type="button"
                  key={i}
                  className="relative aspect-square rounded-btn overflow-hidden bg-gray-100 dark:bg-[#28282c] cursor-pointer"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightbox(i); }}
                >
                  <SafeImage
                    src={url}
                    alt={`帖子图片 ${i + 1}`}
                    fill
                    className="object-cover pointer-events-none"
                    loading="lazy"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-divider">
            <button
              onClick={handleLike}
              aria-label={liked ? '取消点赞' : '点赞'}
              className={`inline-flex items-center gap-1.5 text-body font-medium cursor-pointer transition-colors ${liked ? 'text-danger' : 'text-text-muted hover:text-danger'}`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              {formatNum(post.likes)}
            </button>
            <span className="inline-flex items-center gap-1.5 text-body text-text-muted">
              <MessageCircle className="w-5 h-5" />
              {formatNum(post._count.comments)}
            </span>
            <button onClick={handleShare} aria-label="分享帖子" className="inline-flex items-center gap-1.5 text-body text-text-muted hover:text-primary cursor-pointer transition-colors">
              <Share2 className="w-5 h-5" />
              分享
            </button>
            <button
              onClick={handleBookmark}
              disabled={bookmarking}
              aria-label={bookmarked ? '取消收藏' : '收藏帖子'}
              className={`inline-flex items-center gap-1.5 text-body cursor-pointer transition-colors ml-auto ${bookmarked ? 'text-primary' : 'text-text-muted hover:text-primary'}`}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
              {bookmarked ? '已收藏' : '收藏'}
            </button>
            <button onClick={() => setReportOpen(true)} aria-label="举报帖子" className="inline-flex items-center gap-1.5 text-body text-text-muted hover:text-danger cursor-pointer transition-colors">
              <Flag className="w-4 h-4" />
              举报
            </button>
          </div>
        </article>

        {/* Comment Input */}
        <div className="card mt-4">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-caption text-primary bg-primary-bg rounded-btn px-3 py-1.5">
              <span>回复 <strong>{replyTo.name}</strong></span>
              <button onClick={() => setReplyTo(null)} className="ml-auto p-0.5 rounded hover:bg-primary/10 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyTo ? `回复 ${replyTo.name}...` : '写下你的评论...'}
              maxLength={500}
              rows={2}
              className="flex-1 px-3 py-2.5 rounded-btn border border-border text-body text-text-body placeholder:text-text-disabled resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim() || submitting}
              className="btn-primary self-end h-10 px-4 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发布
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="mt-4">
          <h2 className="text-heading-sm text-text-title mb-3">评论 ({post._count.comments})</h2>
          {post.comments.length === 0 ? (
            <div className="card text-center py-8">
              <MessageCircle className="w-8 h-8 text-text-disabled mx-auto mb-2" />
              <p className="text-caption text-text-muted">还没有评论，来抢沙发吧</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleComments.map((comment) => (
                <div key={comment.id} className="card">
                  <div className="flex items-start gap-3">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                      {comment.author.avatar && (
                        <SafeImage
                          src={comment.author.avatar}
                          alt={comment.author.name}
                          fill
                          className="object-cover"
                          sizes="32px"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-caption font-medium text-text-title">{comment.author.name}</span>
                        {roleLabel[comment.author.role] && (
                          <span className={`inline-flex items-center h-4 px-1.5 rounded-full text-[10px] font-bold ${roleLabel[comment.author.role].cls}`}>
                            {roleLabel[comment.author.role].text}
                          </span>
                        )}
                        <UserLevelBadge level={comment.author.level} />
                        <UserBadgeGroup customBadge={comment.author.customBadge} badge={comment.author.badge} />
                      </div>
                      <p className="text-body text-text-body mt-1">{comment.content}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-caption text-text-muted">
                        <span>{timeAgo(comment.createdAt)}</span>
                        <span className="inline-flex items-center gap-0.5"><Heart className="w-3 h-3" /> {comment.likes}</span>
                        <button
                          onClick={() => setReplyTo({ id: comment.id, name: comment.author.name })}
                          className="inline-flex items-center gap-0.5 text-text-muted hover:text-primary cursor-pointer transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" /> 回复
                        </button>
                      </div>

                      {/* Nested Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 ml-0 pl-3 border-l-2 border-primary/15 space-y-2.5">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-2">
                              <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                                {reply.author.avatar && (
                                  <SafeImage
                                    src={reply.author.avatar}
                                    alt={reply.author.name}
                                    fill
                                    className="object-cover"
                                    sizes="24px"
                                    loading="lazy"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-caption font-medium text-text-title">{reply.author.name}</span>
                                  {roleLabel[reply.author.role] && (
                                    <span className={`inline-flex items-center h-4 px-1.5 rounded-full text-[10px] font-bold ${roleLabel[reply.author.role].cls}`}>
                                      {roleLabel[reply.author.role].text}
                                    </span>
                                  )}
                                  <UserLevelBadge level={reply.author.level} />
                                  <UserBadgeGroup customBadge={reply.author.customBadge} badge={reply.author.badge} />
                                  {reply.replyToName && (
                                    <span className="text-caption text-text-muted">
                                      回复 <span className="text-primary">{reply.replyToName}</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-caption text-text-body mt-0.5">{reply.content}</p>
                                <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                                  <span>{timeAgo(reply.createdAt)}</span>
                                  <button
                                    onClick={() => setReplyTo({ id: comment.id, name: reply.author.name })}
                                    className="inline-flex items-center gap-0.5 hover:text-primary cursor-pointer transition-colors"
                                  >
                                    <MessageCircle className="w-2.5 h-2.5" /> 回复
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {post.comments.length > 10 && !showAllComments && (
                <button
                  onClick={() => setShowAllComments(true)}
                  className="w-full card text-center text-body text-primary font-medium cursor-pointer hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-1"
                >
                  <ChevronDown className="w-4 h-4" />
                  查看全部 {post.comments.length} 条评论
                </button>
              )}
              {showAllComments && post.comments.length > 10 && (
                <button
                  onClick={() => { setShowAllComments(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="w-full card text-center text-body text-text-muted font-medium cursor-pointer hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-1"
                >
                  <ChevronUp className="w-4 h-4" />
                  收起
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReportOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-dropdown animate-fade-in-up mx-0 sm:mx-4">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-heading-sm text-text-title flex items-center gap-2"><Flag className="w-5 h-5 text-danger" /> 举报帖子</h3>
              <button onClick={() => setReportOpen(false)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <div className="px-5 pb-5 space-y-4">
              <div>
                <label className="text-caption font-medium text-text-body mb-2 block">举报原因</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{v:'spam',l:'垃圾内容'},{v:'abuse',l:'辱骂/骚扰'},{v:'inappropriate',l:'不当内容'},{v:'other',l:'其他'}].map((r) => (
                    <button key={r.v} onClick={() => setReportReason(r.v)}
                      className={`h-9 rounded-btn text-body font-medium border transition-colors cursor-pointer ${reportReason===r.v?'border-danger bg-red-50 text-danger':'border-border text-text-body hover:border-danger/50'}`}>
                      {r.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-caption font-medium text-text-body mb-2 block">补充说明 <span className="text-text-disabled font-normal">(选填)</span></label>
                <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} maxLength={200} rows={3}
                  placeholder="请描述具体问题..."
                  className="w-full px-3 py-2.5 rounded-btn border border-border text-body resize-none focus:outline-none focus:border-danger focus:ring-2 focus:ring-danger/20 transition-colors" />
              </div>
              <button onClick={handleReport} disabled={reporting}
                className="w-full h-10 rounded-btn bg-danger text-white font-medium text-body disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer">
                {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                提交举报
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && imageUrls[lightbox] && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={() => setLightbox(null)}>
          {imageUrls.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('prev');
              }}
              aria-label="上一张"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative max-w-[90vw] max-h-[90vh]" style={{ width: 1200, height: 800 }} onClick={(e) => e.stopPropagation()}>
            <SafeImage src={imageUrls[lightbox]} alt={`帖子大图 ${lightbox + 1}`} fill className="object-contain" priority sizes="90vw" />
          </div>

          {imageUrls.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('next');
              }}
              aria-label="下一张"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
          >
            ✕
          </button>
          {imageUrls.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-body bg-black/50 px-3 py-1 rounded-full">
              {lightbox + 1} / {imageUrls.length}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast.open && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-btn text-body font-medium shadow-dropdown animate-fade-in-up ${toast.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
