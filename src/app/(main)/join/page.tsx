'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserPlus, CheckCircle, ArrowRight, XCircle, HelpCircle, Mail, Lock, Eye, EyeOff, Send } from 'lucide-react';

function formatNum(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
}

type Step = 'quiz' | 'register' | 'done';

const QUIZ_COUNT = 3;

export default function JoinPage() {
  const [communityStats, setCommunityStats] = useState({ totalFans: 0, todayPosts: 0, totalInteractions: 0, onlineNow: 0 });

  useEffect(() => {
    fetch('/api/public/config')
      .then((r) => r.json())
      .then((res) => { if (res.data?.communityStats) setCommunityStats(res.data.communityStats); })
      .catch(() => {});
  }, []);

  const [step, setStep] = useState<Step>('quiz');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizFailed, setQuizFailed] = useState(false);

  const fetchQuiz = () => {
    setQuizLoading(true);
    fetch(`/api/public/quiz?count=${QUIZ_COUNT}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.code === 0 && res.data?.length) {
          setQuestions(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setQuizLoading(false));
  };

  useEffect(() => { fetchQuiz(); }, []);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  const q = questions[currentQ];
  const totalQ = questions.length;

  const handleSelect = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    if (idx === q.answer) {
      setCorrect((c) => c + 1);
    } else {
      // Wrong answer = instant fail
      setTimeout(() => setQuizFailed(true), 800);
    }
  };

  const handleNext = () => {
    if (currentQ < totalQ - 1) {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      // All answered correctly
      setStep('register');
    }
  };

  const handleRetry = () => {
    fetchQuiz();
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setCorrect(0);
    setQuizFailed(false);
  };

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
  const canSubmit = nickname.trim() && email.trim() && verifyCode.trim() && password.length >= 8 && password === confirmPwd;

  const handleSendCode = async () => {
    if (!email.trim() || countdown > 0) return;
    setRegError('');
    try {
      const res = await fetch('/api/public/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'register' }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setRegError(json.message || '发送失败');
        return;
      }
      setCodeSent(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch {
      setRegError('网络错误，请稍后重试');
    }
  };

  const handleJoin = async () => {
    if (!canSubmit || regLoading) return;
    setRegError('');
    setRegLoading(true);
    try {
      const res = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nickname.trim(),
          email: email.trim(),
          password,
          code: verifyCode.trim(),
        }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setRegError(json.message || '注册失败');
        return;
      }
      if (json.data?.user) {
        localStorage.setItem('user', JSON.stringify(json.data.user));
      }
      setStep('done');
    } catch {
      setRegError('网络错误，请稍后重试');
    } finally {
      setRegLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="relative min-h-screen pt-20 pb-16 overflow-hidden animate-fade-in-up">
        {/* 1103 Background watermarks */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          <span className="absolute top-16 -left-8 text-[200px] font-bold text-gray-900/[0.07] leading-none" style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span>
          <span className="absolute bottom-10 -right-12 text-[280px] font-bold text-gray-900/[0.06] leading-none rotate-12" style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span>
        </div>

        <div className="container-main px-4 sm:px-6 lg:px-8 max-w-md mx-auto text-center relative z-10">
          <div className="card p-8 sm:p-10">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-heading text-text-title mt-5">
              欢迎加入 <span style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span>
            </h1>
            <p className="text-body text-text-muted mt-2">
              {nickname}，你已成为社区的第 {formatNum(communityStats.totalFans + 1)} 位成员
            </p>
            <div className="flex flex-col gap-3 mt-8">
              <a href="/community" className="btn-primary inline-flex items-center justify-center gap-1.5 h-11 text-base">
                进入社区 <ArrowRight className="w-4 h-4" />
              </a>
              <a href="/" className="btn-outline inline-flex items-center justify-center h-11 text-base">
                返回首页
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-16 pb-8 overflow-hidden animate-fade-in-up">
      {/* 1103 Background watermarks */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        <span className="absolute top-12 -left-10 text-[220px] font-bold text-gray-900/[0.07] leading-none" style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span>
        <span className="absolute top-[40%] -right-16 text-[300px] font-bold text-gray-900/[0.06] leading-none -rotate-12" style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span>
        <span className="absolute -bottom-8 left-[20%] text-[180px] font-bold text-gray-900/[0.07] leading-none rotate-6" style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span>
      </div>

      <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-5">
          <h1 className="text-[24px] sm:text-[28px] font-bold text-text-title">
            加入 <span style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span> 社区
          </h1>
          <p className="text-body text-text-muted mt-2">
            与 {formatNum(communityStats.totalFans)} 位老铁一起，看直播、聊游戏、整活儿
          </p>
        </div>

        {/* Step indicator */}
        <div className="max-w-md mx-auto mb-5">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 flex-1 ${step === 'quiz' ? 'text-primary' : 'text-success'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${step === 'quiz' ? 'bg-primary' : 'bg-success'}`}>
                {step === 'quiz' ? '1' : <CheckCircle className="w-4 h-4" />}
              </div>
              <span className="text-caption font-medium">答题验证</span>
            </div>
            <div className="h-px flex-1 bg-divider" />
            <div className={`flex items-center gap-2 flex-1 ${step === 'register' ? 'text-primary' : 'text-text-muted'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'register' ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'}`}>
                2
              </div>
              <span className="text-caption font-medium">填写信息</span>
            </div>
          </div>
        </div>

        {step === 'quiz' && !quizFailed && quizLoading && (
          <div className="max-w-lg mx-auto">
            <div className="card p-6 sm:p-8 text-center py-12">
              <HelpCircle className="w-10 h-10 text-text-disabled mx-auto mb-3 animate-pulse" />
              <p className="text-body text-text-muted">正在加载题目...</p>
            </div>
          </div>
        )}

        {step === 'quiz' && !quizFailed && !quizLoading && questions.length === 0 && (
          <div className="max-w-lg mx-auto">
            <div className="card p-6 sm:p-8 text-center py-12">
              <HelpCircle className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="text-body text-text-muted">暂无题目，请稍后再试</p>
              <button onClick={handleRetry} className="btn-primary h-9 px-5 text-sm mt-4">
                重新加载
              </button>
            </div>
          </div>
        )}

        {step === 'quiz' && !quizFailed && !quizLoading && questions.length > 0 && (
          <div className="max-w-lg mx-auto">
            <div className="card p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <h2 className="text-heading-sm text-text-title">你真的是泽小将嘛？</h2>
                </div>
                <span className="text-caption text-text-muted">
                  {currentQ + 1} / {totalQ}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-gray-100 rounded-full mb-6">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${((currentQ + (showResult ? 1 : 0)) / totalQ) * 100}%` }}
                />
              </div>

              <p className="text-body font-semibold text-text-title mb-4">{q.question}</p>

              <div className="space-y-2.5">
                {q.options.map((opt, idx) => {
                  let optClass = 'bg-white border border-divider text-text-body hover:border-primary hover:text-primary';
                  if (showResult) {
                    if (idx === q.answer) {
                      optClass = 'bg-green-50 border-2 border-success text-success';
                    } else if (idx === selected && idx !== q.answer) {
                      optClass = 'bg-red-50 border-2 border-danger text-danger';
                    } else {
                      optClass = 'bg-white border border-divider text-text-muted opacity-50';
                    }
                  } else if (idx === selected) {
                    optClass = 'bg-primary/10 border-2 border-primary text-primary';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      disabled={showResult}
                      className={`w-full text-left px-4 py-3 rounded-card text-body font-medium transition-all duration-150 cursor-pointer disabled:cursor-default ${optClass}`}
                    >
                      <span className="inline-flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-caption font-bold flex-shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {showResult && selected === q.answer && (
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-caption font-medium text-success">回答正确</span>
                  <button onClick={handleNext} className="btn-primary h-9 px-5 text-sm">
                    {currentQ < totalQ - 1 ? '下一题' : '完成验证'}
                  </button>
                </div>
              )}

              {showResult && selected !== q.answer && !quizFailed && (
                <div className="mt-6">
                  <span className="text-caption font-medium text-danger">回答错误，即将重新开始...</span>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-divider">
                <p className="text-caption text-text-muted text-center">
                  必须全部答对才能通过验证
                  <span className="ml-2">当前: {correct}/{currentQ + (showResult ? 1 : 0)}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'quiz' && quizFailed && (
          <div className="max-w-md mx-auto text-center">
            <div className="card p-8 sm:p-10">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-danger" />
              </div>
              <h2 className="text-heading text-text-title mt-5">你根本就不是泽小将</h2>
              <p className="text-body text-text-muted mt-2">
                你答对了 {correct}/{totalQ} 题，需要全部正确才能通过
              </p>
              <p className="text-caption text-text-muted mt-1">
                先去了解一下泽哥再来吧
              </p>
              <div className="flex flex-col gap-3 mt-8">
                <button onClick={handleRetry} className="btn-primary h-11 text-base">
                  重新答题
                </button>
                <Link href="/" className="btn-outline inline-flex items-center justify-center h-11 text-base">
                  返回首页
                </Link>
              </div>
            </div>
          </div>
        )}

        {step === 'register' && (
          <div className="grid md:grid-cols-[340px_1fr] gap-6 max-w-4xl mx-auto items-start">
            {/* Left — Branded Welcome Panel */}
            <div className="relative bg-gray-900 rounded-card overflow-hidden md:sticky md:top-20">
              {/* 1103 decorative background inside dark panel */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
                <span className="absolute -top-4 -left-4 text-[120px] font-bold text-white/[0.03] leading-none" style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span>
                <span className="absolute -bottom-6 -right-6 text-[100px] font-bold text-white/[0.04] leading-none rotate-12" style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span>
              </div>

              <div className="relative z-10 p-5 sm:p-6">
                {/* Brand mark */}
                <div className="text-center mb-4">
                  <p className="text-[48px] leading-none text-primary/90" style={{ fontFamily: "'Blazed', sans-serif" }}>
                    1103
                  </p>
                  <div className="w-12 h-0.5 bg-primary/40 mx-auto mt-2" />
                </div>

                {/* Success badge */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-success" />
                  </div>
                  <span className="text-caption font-medium text-success">答题验证已通过</span>
                </div>

                <h2 className="text-[18px] font-bold text-white text-center leading-tight">
                  欢迎新的泽小将<br />加入社区
                </h2>
                <p className="text-caption text-gray-500 mt-2 text-center leading-relaxed">
                  完成注册后，即可与 {formatNum(communityStats.totalFans)} 位老铁<br />一起看直播、聊游戏、整活儿
                </p>

                {/* Divider */}
                <div className="border-t border-white/10 my-4" />

                {/* Quick info items */}
                <div className="space-y-2">
                  {[
                    { icon: UserPlus, text: '专属社区身份标识' },
                    { icon: ArrowRight, text: '第一时间获取泽哥动态' },
                    { icon: CheckCircle, text: '参与陈泽杯等专属活动' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-3.5 h-3.5 text-primary/80" />
                      </div>
                      <span className="text-caption text-gray-400">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Form */}
            <div className="card p-5 sm:p-6">
              <h3 className="text-heading-sm text-text-title mb-4">注册信息</h3>

              {regError && (
                <div className="flex items-center gap-2 p-3 rounded-btn bg-red-50 text-danger text-body mb-4">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  {regError}
                </div>
              )}

              <div className="space-y-3">
                {/* Nickname */}
                <div>
                  <label className="text-caption font-medium text-text-body block mb-1">昵称</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="给自己取个响亮的名字"
                      className="w-full h-10 pl-10 pr-4 rounded-card border border-divider text-body text-text-title placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-caption font-medium text-text-body block mb-1">邮箱</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="你的邮箱地址"
                      className="w-full h-10 pl-10 pr-4 rounded-card border border-divider text-body text-text-title placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Verification Code */}
                <div>
                  <label className="text-caption font-medium text-text-body block mb-1">验证码</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="输入邮箱验证码"
                      maxLength={6}
                      className="flex-1 h-10 px-4 rounded-card border border-divider text-body text-text-title placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                    />
                    <button
                      onClick={handleSendCode}
                      disabled={!email.trim() || countdown > 0}
                      className="h-10 px-4 rounded-card text-caption font-medium whitespace-nowrap border border-primary text-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {countdown > 0 ? `${countdown}s` : codeSent ? '重新发送' : '发送验证码'}
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-caption font-medium text-text-body block mb-1">密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="至少8位，包含大小写+数字"
                      className="w-full h-10 pl-10 pr-10 rounded-card border border-divider text-body text-text-title placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-body cursor-pointer"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password strength */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-200 ${
                              i <= pwdStrength.level ? pwdStrength.color : 'bg-gray-100'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-[11px] mt-1 ${
                        pwdStrength.level <= 1 ? 'text-red-500' :
                        pwdStrength.level <= 2 ? 'text-yellow-500' :
                        pwdStrength.level <= 3 ? 'text-blue-500' : 'text-success'
                      }`}>
                        密码强度：{pwdStrength.label}
                        {pwdStrength.level <= 2 && <span className="text-text-muted"> — 建议使用大小写字母+数字+特殊字符</span>}
                      </p>
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
                      placeholder="再次输入密码"
                      className={`w-full h-10 pl-10 pr-10 rounded-card border text-body text-text-title placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all duration-150 ${
                        confirmPwd
                          ? pwdMatch
                            ? 'border-success focus:border-success focus:ring-success/20'
                            : 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                          : 'border-divider focus:border-primary focus:ring-primary/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-body cursor-pointer"
                    >
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

              </div>

              <button
                onClick={handleJoin}
                disabled={!canSubmit || regLoading}
                className="btn-primary w-full h-11 text-base font-semibold mt-5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {regLoading ? '注册中...' : '加入社区'}
              </button>

              <p className="text-caption text-text-muted text-center mt-3">
                加入即表示你同意遵守社区公约
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
