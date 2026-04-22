'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Hash, RotateCcw, Trophy, ArrowUp, ArrowDown, CheckCircle, Target } from 'lucide-react';

type Difficulty = 'easy' | 'normal' | 'hard';

interface DiffConfig {
  label: string;
  max: number;
  maxGuesses: number;
  color: string;
}

const DIFFICULTIES: Record<Difficulty, DiffConfig> = {
  easy:   { label: '简单', max: 50,   maxGuesses: 10, color: 'from-emerald-400 to-emerald-600' },
  normal: { label: '标准', max: 100,  maxGuesses: 7,  color: 'from-sky-400 to-blue-600' },
  hard:   { label: '困难', max: 1000, maxGuesses: 10, color: 'from-rose-500 to-red-600' },
};

type Phase = 'menu' | 'playing' | 'won' | 'lost';

export default function GuessNumberPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [phase, setPhase] = useState<Phase>('menu');
  const [target, setTarget] = useState(0);
  const [guess, setGuess] = useState('');
  const [guesses, setGuesses] = useState<{ value: number; hint: 'high' | 'low' | 'correct' }[]>([]);
  const [bestScores, setBestScores] = useState<Record<Difficulty, number | null>>({ easy: null, normal: null, hard: null });
  const inputRef = useRef<HTMLInputElement>(null);

  // 从 localStorage 加载最佳记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem('guess_number_best');
      if (saved) setBestScores(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveBest = useCallback((diff: Difficulty, attempts: number) => {
    setBestScores((prev) => {
      const next = { ...prev };
      if (next[diff] === null || attempts < next[diff]!) {
        next[diff] = attempts;
        try { localStorage.setItem('guess_number_best', JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, []);

  const startGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    const max = DIFFICULTIES[diff].max;
    setTarget(Math.floor(Math.random() * max) + 1);
    setGuess('');
    setGuesses([]);
    setPhase('playing');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const cfg = DIFFICULTIES[difficulty];

  const handleGuess = () => {
    const num = parseInt(guess, 10);
    if (isNaN(num) || num < 1 || num > cfg.max) return;
    setGuess('');

    if (num === target) {
      setGuesses((prev) => [...prev, { value: num, hint: 'correct' }]);
      setPhase('won');
      saveBest(difficulty, guesses.length + 1);
    } else {
      const hint = num > target ? 'high' : 'low';
      const next = [...guesses, { value: num, hint: hint as 'high' | 'low' }];
      setGuesses(next);
      if (next.length >= cfg.maxGuesses) {
        setPhase('lost');
      } else {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  };

  return (
    <div className="pb-16 mt-14">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.5)_3px,rgba(255,255,255,0.5)_4px)]" />
        <div className="container-main px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          <Link href="/play" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> 返回游戏大厅
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Hash className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">猜数字</h1>
              <p className="text-sm text-white/70 mt-0.5">猜出系统心中的数字！</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-main px-4 sm:px-6 lg:px-8 -mt-4 relative z-20">
        {/* Menu */}
        {phase === 'menu' && (
          <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-8 sm:p-10 max-w-lg mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-text-title dark:text-white">选择难度</h2>
            <p className="text-sm text-text-muted mt-2">系统会随机一个数字，你来猜！</p>

            <div className="mt-6 space-y-3">
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => {
                const d = DIFFICULTIES[key];
                const best = bestScores[key];
                return (
                  <button
                    key={key}
                    onClick={() => startGame(key)}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-[#333] hover:border-primary/50 dark:hover:border-primary/40 bg-gray-50/50 dark:bg-white/5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all cursor-pointer group"
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-r ${d.color}`} />
                        <span className="font-bold text-text-title dark:text-white">{d.label}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        猜 1~{d.max}，最多 {d.maxGuesses} 次机会
                      </p>
                    </div>
                    <div className="text-right">
                      {best !== null && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                          最佳: {best} 次
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Playing */}
        {phase === 'playing' && (
          <div className="max-w-lg mx-auto space-y-4">
            {/* 状态 */}
            <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-text-title dark:text-white">
                  范围：1 ~ {cfg.max}
                </span>
                <span className={`text-sm font-bold ${
                  cfg.maxGuesses - guesses.length <= 2 ? 'text-red-500' : 'text-text-muted dark:text-white/60'
                }`}>
                  剩余 {cfg.maxGuesses - guesses.length} 次
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${cfg.color} rounded-full transition-all duration-300`}
                  style={{ width: `${(guesses.length / cfg.maxGuesses) * 100}%` }}
                />
              </div>
            </div>

            {/* 输入 */}
            <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-5">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="number"
                  min={1}
                  max={cfg.max}
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGuess();
                  }}
                  placeholder={`输入 1~${cfg.max}`}
                  className="flex-1 h-12 px-4 rounded-xl border-2 border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-white/5 text-lg font-bold text-text-title dark:text-white placeholder-text-muted/50 focus:outline-none focus:border-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={handleGuess}
                  disabled={!guess}
                  className="h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  猜！
                </button>
              </div>
            </div>

            {/* 历史记录 */}
            {guesses.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-5">
                <h3 className="text-sm font-bold text-text-title dark:text-white mb-3">猜测记录</h3>
                <div className="space-y-2">
                  {guesses.map((g, i) => (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm ${
                      g.hint === 'correct'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted w-6">#{i + 1}</span>
                        <span className="font-bold text-text-title dark:text-white text-base">{g.value}</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-bold ${
                        g.hint === 'high' ? 'text-red-500' : g.hint === 'low' ? 'text-blue-500' : 'text-emerald-500'
                      }`}>
                        {g.hint === 'high' && <><ArrowDown className="w-3.5 h-3.5" /> 太大了</>}
                        {g.hint === 'low' && <><ArrowUp className="w-3.5 h-3.5" /> 太小了</>}
                        {g.hint === 'correct' && <><CheckCircle className="w-3.5 h-3.5" /> 正确！</>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Won / Lost */}
        {(phase === 'won' || phase === 'lost') && (
          <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-8 sm:p-10 max-w-lg mx-auto text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg ${
              phase === 'won' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'
            }`}>
              {phase === 'won' ? <Trophy className="w-8 h-8 text-white" /> : <Hash className="w-8 h-8 text-white" />}
            </div>

            {phase === 'won' ? (
              <>
                <h2 className="text-2xl font-bold text-text-title dark:text-white">猜对了！ 🎉</h2>
                <p className="text-text-muted mt-2">
                  答案是 <strong className="text-emerald-600 dark:text-emerald-400 text-lg">{target}</strong>，你用了 <strong className="text-primary text-lg">{guesses.length}</strong> 次猜中
                </p>
                {bestScores[difficulty] !== null && guesses.length <= bestScores[difficulty]! && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-bold">
                    <Trophy className="w-4 h-4" /> 新纪录！
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-text-title dark:text-white">机会用完了 😅</h2>
                <p className="text-text-muted mt-2">
                  正确答案是 <strong className="text-red-500 text-lg">{target}</strong>
                </p>
              </>
            )}

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => startGame(difficulty)}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:from-emerald-400 hover:to-teal-500 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> 再来一局
              </button>
              <button
                onClick={() => setPhase('menu')}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full border-2 border-gray-200 dark:border-[#333] text-text-body dark:text-white/80 font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                换难度
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
