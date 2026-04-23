'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquarePlus, X, Send, Loader2, CheckCircle, Lightbulb, Bug, HelpCircle } from 'lucide-react';

const FEEDBACK_TYPES = [
  { value: 'suggestion', label: '建议', icon: Lightbulb, color: 'text-primary' },
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-danger' },
  { value: 'other', label: '其他', icon: HelpCircle, color: 'text-text-muted' },
] as const;

function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState<'suggestion' | 'bug' | 'other'>('suggestion');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setType('suggestion');
    setContent('');
    setContact('');
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const handleSubmit = async () => {
    if (!content.trim() || content.trim().length < 5) {
      setError('请至少输入5个字');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/public/feedback', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content: content.trim(), contact: contact.trim() || undefined }),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message || '提交失败');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-dropdown animate-fade-in-up mx-0 sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-heading-sm text-text-title flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
            反馈与建议
          </h3>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {success ? (
          <div className="px-5 pb-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <p className="text-body font-medium text-text-title">感谢你的反馈！</p>
            <p className="text-caption text-text-muted mt-1">我们会认真阅读每一条建议</p>
            <button onClick={handleClose} className="btn-primary mt-4 w-full">好的</button>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            {/* Type Selector */}
            <div>
              <label className="text-caption font-medium text-text-body mb-2 block">反馈类型</label>
              <div className="flex gap-2">
                {FEEDBACK_TYPES.map((ft) => (
                  <button
                    key={ft.value}
                    onClick={() => setType(ft.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-btn text-caption font-medium transition-all duration-150 cursor-pointer border ${
                      type === ft.value
                        ? 'border-primary bg-primary-bg text-primary'
                        : 'border-border bg-white text-text-muted hover:border-primary/50'
                    }`}
                  >
                    <ft.icon className="w-3.5 h-3.5" />
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="text-caption font-medium text-text-body mb-2 block">详细描述</label>
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setError(''); }}
                placeholder={type === 'bug' ? '请描述你遇到的问题、复现步骤...' : '你的建议或想法...'}
                maxLength={1000}
                className="w-full h-28 px-3 py-2.5 rounded-btn border border-border text-body text-text-body placeholder:text-text-disabled resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors bg-white"
              />
              <div className="text-right text-caption text-text-disabled mt-0.5">{content.length}/1000</div>
            </div>

            {/* Contact (optional) */}
            <div>
              <label className="text-caption font-medium text-text-body mb-2 block">
                联系方式 <span className="text-text-disabled font-normal">(选填)</span>
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="邮箱 / 微信号，方便我们回复你"
                maxLength={100}
                className="w-full h-10 px-3 rounded-btn border border-border text-body text-text-body placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors bg-white"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-caption text-danger">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || content.trim().length < 5}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? '提交中...' : '提交反馈'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface FooterFeatures {
  communityEnabled: boolean;
  galleryEnabled: boolean;
  memesEnabled: boolean;
  fanWorksEnabled: boolean;
  eventsEnabled: boolean;
  playEnabled: boolean;
}

export default function Footer({ profileName, siteDescription, features }: { profileName: string; siteDescription: string; features: FooterFeatures }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const visibleQuickLinks = [
    { href: '/', label: '首页' },
    { href: '/profile', label: `关于${profileName}` },
    features.galleryEnabled && { href: '/gallery', label: '相册' },
    features.communityEnabled && { href: '/community', label: '社区' },
    features.memesEnabled && { href: '/memes', label: '梗百科' },
    features.fanWorksEnabled && { href: '/fan-works', label: '二创作品' },
    features.eventsEnabled && { href: '/events', label: '活动' },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <>
      <footer className="border-t border-divider bg-white">
        <div className="container-main px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <p className="font-waterbrush text-heading-sm text-text-title">1103</p>
              <p className="text-body text-text-muted mt-2 max-w-xs">
                {siteDescription}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {visibleQuickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-body text-text-muted hover:text-primary transition-colors duration-150 cursor-pointer"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <button
                onClick={() => setFeedbackOpen(true)}
                className="inline-flex items-center gap-1.5 text-body text-text-muted hover:text-primary transition-colors duration-150 cursor-pointer self-start md:self-end"
              >
                <MessageSquarePlus className="w-4 h-4" />
                反馈与建议
              </button>
            </div>
          </div>

          <div className="border-t border-divider mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-caption text-text-muted">
              &copy; {new Date().getFullYear()} <span className="font-waterbrush">1103</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="text-caption text-text-muted hover:text-text-body transition-colors duration-150">渝ICP备2026000583号</a>
              <Link href="/privacy" className="text-caption text-text-muted hover:text-text-body transition-colors duration-150 cursor-pointer">隐私政策</Link>
              <Link href="/terms" className="text-caption text-text-muted hover:text-text-body transition-colors duration-150 cursor-pointer">使用条款</Link>
            </div>
          </div>
        </div>
      </footer>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
