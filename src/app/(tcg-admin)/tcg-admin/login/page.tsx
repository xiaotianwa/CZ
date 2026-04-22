'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function TcgAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/tcg/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (json.code !== 0) {
        setError(json.message || '登录失败');
        return;
      }
      router.push('/tcg-admin');
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#0f0f23' }}>
      {/* 霓虹背景 */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.25),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(244,63,94,0.18),transparent_55%)]" />
      <div aria-hidden className="absolute inset-0 opacity-[0.04] mix-blend-overlay bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.6)_3px,rgba(255,255,255,0.6)_4px)]" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="font-waterbrush inline-block text-[11px] tracking-[0.5em] text-[#A78BFA] mb-2">CHENZE · GAME · OPS</div>
          <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif", letterSpacing: '0.04em' }}>
            游戏端管理
          </h1>
          <p className="text-sm text-white/50">当前项目游戏 + TCG 子类 · 统一管理入口</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-[#141432]/60 backdrop-blur-md p-6 space-y-4"
          style={{ boxShadow: '0 0 0 1px rgba(124,58,237,0.08), 0 20px 60px -20px rgba(0,0,0,0.7)' }}
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-white/85 mb-1.5 block">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tcg-super@chenze.com"
                required
                autoComplete="email"
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#A78BFA]/60 focus:ring-2 focus:ring-[#7C3AED]/20"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-white/85 mb-1.5 block">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入运营账号密码"
                required
                autoComplete="current-password"
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#A78BFA]/60 focus:ring-2 focus:ring-[#7C3AED]/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg flex items-center justify-center gap-2 text-base font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              boxShadow: '0 0 0 1px rgba(124,58,237,0.25), 0 8px 30px -8px rgba(124,58,237,0.6)',
            }}
          >
            {loading ? '登录中...' : '进入后台'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] tracking-[0.25em] text-white/30">
          v1.0 · 独立于社区 /admin 的游戏端后台
        </p>
      </div>
    </div>
  );
}
