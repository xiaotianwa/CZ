'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, Send, ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react';

type Step = 'email' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const getPasswordStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    if (pwd.length >= 12) score++;
    if (score <= 1) return { level: 1, label: '弱', color: 'bg-red-500' };
    if (score <= 2) return { level: 2, label: '一般', color: 'bg-yellow-500' };
    if (score <= 3) return { level: 3, label: '中等', color: 'bg-blue-500' };
    return { level: 4, label: '强', color: 'bg-success' };
  };

  const pwdStrength = getPasswordStrength(password);
  const pwdMatch = confirmPwd && password === confirmPwd;

  const handleSendCode = async () => {
    if (!email.trim() || countdown > 0 || sendingCode) return;
    setSendingCode(true);
    setError('');
    try {
      const res = await fetch('/api/public/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'reset' }),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      setCodeSent(true);
      setStep('reset');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || '发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  const handleReset = async () => {
    if (!code.trim() || !password || password !== confirmPwd) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      setStep('done');
    } catch (err: any) {
      setError(err.message || '重置密码失败');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
        <div className="card max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-text-title">密码重置成功</h2>
          <p className="text-body text-text-body">你的密码已更新，请使用新密码登录。</p>
          <button
            onClick={() => router.push('/login')}
            className="btn-primary w-full h-11 text-base font-semibold"
          >
            去登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
      <div className="card max-w-md w-full p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/login" className="p-1.5 rounded-btn hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-title">忘记密码</h1>
            <p className="text-caption text-text-muted mt-0.5">
              {step === 'email' ? '输入注册邮箱，发送验证码' : '输入验证码和新密码'}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger text-center bg-red-50 rounded-card py-2 px-3 mb-4">{error}</p>
        )}

        {step === 'email' && (
          <div className="space-y-4">
            <div>
              <label className="text-caption font-medium text-text-body block mb-1">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="输入注册邮箱"
                  className="w-full h-10 pl-10 pr-4 rounded-card border border-divider text-body text-text-title placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                />
              </div>
            </div>
            <button
              onClick={handleSendCode}
              disabled={!email.trim() || sendingCode}
              className="btn-primary w-full h-11 text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sendingCode ? (
                '发送中...'
              ) : (
                <><Send className="w-4 h-4" /> 发送验证码</>
              )}
            </button>
          </div>
        )}

        {step === 'reset' && (
          <div className="space-y-4">
            {/* Email display */}
            <div className="flex items-center gap-2 text-sm text-text-body bg-gray-50 rounded-card px-3 py-2">
              <Mail className="w-4 h-4 text-text-muted" />
              <span>{email}</span>
            </div>

            {/* Verify Code */}
            <div>
              <label className="text-caption font-medium text-text-body block mb-1">验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="输入6位验证码"
                  maxLength={6}
                  className="flex-1 h-10 px-4 rounded-card border border-divider text-body text-text-title placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                />
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || sendingCode}
                  className="h-10 px-4 rounded-card text-caption font-medium whitespace-nowrap border border-primary text-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {countdown > 0 ? `${countdown}s` : '重新发送'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="text-caption font-medium text-text-body block mb-1">新密码</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少6位"
                  className="w-full h-10 pl-10 pr-10 rounded-card border border-divider text-body text-text-title placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                />
                <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-body cursor-pointer">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= pwdStrength.level ? pwdStrength.color : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">密码强度：{pwdStrength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-caption font-medium text-text-body block mb-1">确认密码</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="再次输入新密码"
                  className="w-full h-10 pl-10 pr-10 rounded-card border border-divider text-body text-text-title placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                />
                <button onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-body cursor-pointer">
                  {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPwd && !pwdMatch && (
                <p className="text-[11px] text-red-500 mt-1">两次密码不一致</p>
              )}
              {confirmPwd && pwdMatch && (
                <p className="text-[11px] text-success mt-1">密码一致</p>
              )}
            </div>

            <button
              onClick={handleReset}
              disabled={!code.trim() || !password || password.length < 6 || password !== confirmPwd || loading}
              className="btn-primary w-full h-11 text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? '重置中...' : <><ShieldCheck className="w-4 h-4" /> 重置密码</>}
            </button>
          </div>
        )}

        <p className="text-caption text-text-muted text-center mt-5">
          <Link href="/login" className="text-primary hover:underline">返回登录</Link>
        </p>
      </div>
    </div>
  );
}
