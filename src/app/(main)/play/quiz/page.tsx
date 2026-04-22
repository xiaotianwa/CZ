'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Brain, ArrowLeft, CheckCircle, XCircle, RotateCcw,
  Trophy, Clock, Zap, ChevronRight, Sparkles
} from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
}

type Phase = 'loading' | 'ready' | 'playing' | 'result';

export default function QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 从 API 获取题目
  useEffect(() => {
    fetch('/api/public/quiz/game')
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data && json.data.length > 0) {
          const parsed: QuizQuestion[] = json.data.map((q: any) => ({
            id: q.id,
            question: q.question,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
            answer: q.answer,
          }));
          // 随机打乱
          setQuestions(parsed.sort(() => Math.random() - 0.5));
          setPhase('ready');
        } else {
          // 无题目时使用内置题库
          setQuestions(FALLBACK_QUESTIONS.sort(() => Math.random() - 0.5));
          setPhase('ready');
        }
      })
      .catch(() => {
        setQuestions(FALLBACK_QUESTIONS.sort(() => Math.random() - 0.5));
        setPhase('ready');
      });
  }, []);

  const startGame = useCallback(() => {
    setCurrentIdx(0);
    setScore(0);
    setSelected(null);
    setAnswered(false);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(15);
    setTotalTime(0);
    setPhase('playing');
  }, []);

  // 倒计时
  useEffect(() => {
    if (phase !== 'playing' || answered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 时间到，自动判错
          setAnswered(true);
          setStreak(0);
          return 0;
        }
        return prev - 1;
      });
      setTotalTime((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, answered, currentIdx]);

  const handleSelect = (optIdx: number) => {
    if (answered) return;
    setSelected(optIdx);
    setAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const q = questions[currentIdx];
    if (optIdx === q.answer) {
      // 答对：基础分 + 时间奖励 + 连击奖励
      const timeBonus = Math.floor(timeLeft * 2);
      const newStreak = streak + 1;
      const streakBonus = Math.min(newStreak * 5, 50);
      setScore((prev) => prev + 10 + timeBonus + streakBonus);
      setStreak(newStreak);
      setBestStreak((prev) => Math.max(prev, newStreak));
    } else {
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrentIdx((prev) => prev + 1);
      setSelected(null);
      setAnswered(false);
      setTimeLeft(15);
    }
  };

  const q = questions[currentIdx];
  const isCorrect = selected !== null && q && selected === q.answer;
  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;

  return (
    <div className="pb-16 mt-14">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.5)_3px,rgba(255,255,255,0.5)_4px)]" />
        <div className="container-main px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          <Link href="/play" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> 返回游戏大厅
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">1103 知识问答</h1>
              <p className="text-sm text-white/70 mt-0.5">考验你对陈泽和 1103 的了解</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-main px-4 sm:px-6 lg:px-8 -mt-4 relative z-20">
        {/* Loading */}
        {phase === 'loading' && (
          <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-12 text-center">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-muted mt-4">加载题目中...</p>
          </div>
        )}

        {/* Ready */}
        {phase === 'ready' && (
          <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-text-title dark:text-white">准备好了吗？</h2>
            <p className="text-text-muted mt-2 text-sm leading-relaxed">
              共 <strong className="text-text-title dark:text-white">{questions.length}</strong> 道题，每题限时 <strong className="text-text-title dark:text-white">15 秒</strong>
              <br />答得越快、连击越多，分数越高！
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-text-muted">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>限时 15s</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-orange-500" />
                <span>连击加分</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-red-500" />
                <span>挑战高分</span>
              </div>
            </div>
            <button
              onClick={startGame}
              className="mt-8 h-12 px-8 rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold text-base hover:from-amber-400 hover:to-red-400 transition-all active:scale-[0.97] shadow-lg cursor-pointer"
            >
              开始答题
            </button>
          </div>
        )}

        {/* Playing */}
        {phase === 'playing' && q && (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* 状态栏 */}
            <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-text-title dark:text-white">
                    {currentIdx + 1} / {questions.length}
                  </span>
                  {streak > 1 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold">
                      <Zap className="w-3 h-3" /> {streak} 连击
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">{score} 分</span>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    timeLeft <= 5 ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-gray-100 dark:bg-white/10 text-text-muted dark:text-white/60'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    {timeLeft}s
                  </div>
                </div>
              </div>
              {/* 进度条 */}
              <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* 题目 */}
            <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-6 sm:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-text-title dark:text-white leading-relaxed">
                {q.question}
              </h3>

              <div className="mt-6 space-y-3">
                {q.options.map((opt, idx) => {
                  const isThisCorrect = idx === q.answer;
                  const isThisSelected = selected === idx;
                  let className = 'w-full text-left px-5 py-4 rounded-xl text-sm font-medium border-2 transition-all duration-200 cursor-pointer ';

                  if (!answered) {
                    className += 'border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-white/5 text-text-body dark:text-white/80 hover:border-amber-400 dark:hover:border-amber-500/60 hover:bg-amber-50/50 dark:hover:bg-amber-500/10';
                  } else if (isThisCorrect) {
                    className += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
                  } else if (isThisSelected && !isThisCorrect) {
                    className += 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400';
                  } else {
                    className += 'border-gray-200 dark:border-[#333] bg-gray-50/30 dark:bg-white/5 text-text-muted dark:text-white/40 opacity-60';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      disabled={answered}
                      className={className}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
                          answered && isThisCorrect
                            ? 'bg-emerald-500 text-white'
                            : answered && isThisSelected && !isThisCorrect
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 dark:bg-white/10 text-text-muted dark:text-white/60'
                        }`}>
                          {answered && isThisCorrect ? <CheckCircle className="w-4 h-4" /> :
                           answered && isThisSelected && !isThisCorrect ? <XCircle className="w-4 h-4" /> :
                           String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 答题结果提示 */}
              {answered && (
                <div className="mt-5 flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-sm font-bold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : timeLeft === 0 && selected === null ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isCorrect ? (
                      <><CheckCircle className="w-5 h-5" /> 回答正确！{timeLeft > 10 ? '⚡ 速度真快' : ''}</>
                    ) : timeLeft === 0 && selected === null ? (
                      <><Clock className="w-5 h-5" /> 时间到！正确答案是 {String.fromCharCode(65 + q.answer)}</>
                    ) : (
                      <><XCircle className="w-5 h-5" /> 答错了，正确答案是 {String.fromCharCode(65 + q.answer)}</>
                    )}
                  </div>
                  <button
                    onClick={nextQuestion}
                    className="inline-flex items-center gap-1 h-9 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    {currentIdx + 1 >= questions.length ? '查看结果' : '下一题'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {phase === 'result' && (
          <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-text-title dark:text-white">答题结束！</h2>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className="text-2xl font-bold text-primary">{score}</div>
                <div className="text-xs text-text-muted mt-1">总分</div>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className="text-2xl font-bold text-amber-500">{bestStreak}</div>
                <div className="text-xs text-text-muted mt-1">最长连击</div>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className="text-2xl font-bold text-emerald-500">{totalTime}s</div>
                <div className="text-xs text-text-muted mt-1">用时</div>
              </div>
            </div>

            {/* 评价 */}
            <div className="mt-6 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 p-4">
              <p className="text-sm font-medium text-primary">
                {score >= questions.length * 30
                  ? '🏆 1103 铁粉认证！你太懂陈泽了！'
                  : score >= questions.length * 15
                  ? '🔥 不错不错，老铁很有料！'
                  : score >= questions.length * 8
                  ? '😊 还行，继续加油！'
                  : '📚 建议多关注陈泽直播间哦~'}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={startGame}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold hover:from-amber-400 hover:to-red-400 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> 再来一局
              </button>
              <Link
                href="/play"
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full border-2 border-gray-200 dark:border-[#333] text-text-body dark:text-white/80 font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                返回大厅
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 内置题库（当 API 无数据时使用）
const FALLBACK_QUESTIONS: QuizQuestion[] = [
  {
    id: 'f1',
    question: '陈泽的生日是哪一天？',
    options: ['10月3日', '11月3日', '12月3日', '1月3日'],
    answer: 1,
  },
  {
    id: 'f2',
    question: '"1103"这个数字代表什么？',
    options: ['粉丝数', '陈泽生日', '直播间号', '车牌号'],
    answer: 1,
  },
  {
    id: 'f3',
    question: '陈泽最常直播的游戏类型是？',
    options: ['音游', 'FPS', 'MOBA', 'RPG'],
    answer: 2,
  },
  {
    id: 'f4',
    question: '陈泽的粉丝名是？',
    options: ['泽宝', '老铁', '家人', '小陈'],
    answer: 1,
  },
  {
    id: 'f5',
    question: '以下哪个是陈泽传媒卡牌游戏中的关键词？',
    options: ['冲锋', '挡枪', '嘲讽', '突袭'],
    answer: 1,
  },
  {
    id: 'f6',
    question: '社区签到一次可以获得多少积分？',
    options: ['10', '20', '30', '50'],
    answer: 3,
  },
  {
    id: 'f7',
    question: '陈泽传媒卡牌游戏中，SSR 卡牌最多放几张？',
    options: ['1', '2', '3', '不限'],
    answer: 0,
  },
  {
    id: 'f8',
    question: '社区积分每多少分升一级？',
    options: ['50', '100', '200', '500'],
    answer: 1,
  },
];
