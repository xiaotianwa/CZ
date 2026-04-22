'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, RotateCcw, Trophy, Clock, CheckCircle, XCircle, ChevronRight, Zap } from 'lucide-react';

interface EmojiPuzzle {
  emoji: string;
  answer: string;
  hints: string[];
  category: string;
}

const FALLBACK_PUZZLES: EmojiPuzzle[] = [
  { emoji: '🎮🎙️📺', answer: '直播', hints: ['游戏', '主播', '屏幕'], category: '日常' },
  { emoji: '👨‍💼📱💰', answer: '老板', hints: ['上班', '手机', '赚钱'], category: '身份' },
  { emoji: '🔥🔥🔥💪', answer: '火力全开', hints: ['激烈', '使劲', '爆发'], category: '成语' },
  { emoji: '😎🎤🎵', answer: '唱歌', hints: ['帅气', '话筒', '音乐'], category: '活动' },
  { emoji: '🐔🍗🥤', answer: '吃鸡', hints: ['鸡', '食物', '游戏'], category: '游戏' },
  { emoji: '👊💥⭐', answer: '暴击', hints: ['拳头', '爆炸', '伤害'], category: '游戏' },
  { emoji: '🏃‍♂️💨🏆', answer: '冲刺', hints: ['跑步', '速度', '冠军'], category: '运动' },
  { emoji: '😂🤣😹', answer: '笑死', hints: ['搞笑', '哈哈', '乐'], category: '表情' },
  { emoji: '🎯🎪🤹', answer: '整活', hints: ['精准', '表演', '技术'], category: '日常' },
  { emoji: '👑👸🏰', answer: '公主', hints: ['皇冠', '女孩', '城堡'], category: '身份' },
  { emoji: '⚔️🛡️🐉', answer: '打怪', hints: ['武器', '防御', '怪兽'], category: '游戏' },
  { emoji: '🌙⭐💤', answer: '晚安', hints: ['月亮', '星星', '睡觉'], category: '问候' },
  { emoji: '🎁🎂🎉', answer: '生日', hints: ['礼物', '蛋糕', '庆祝'], category: '节日' },
  { emoji: '📱💬❤️', answer: '点赞', hints: ['手机', '评论', '爱心'], category: '社交' },
  { emoji: '🏠🛋️📺', answer: '宅家', hints: ['房子', '沙发', '看电视'], category: '日常' },
  { emoji: '🚀🌟💫', answer: '起飞', hints: ['火箭', '星星', '闪耀'], category: '弹幕' },
  { emoji: '🐂🍺👍', answer: '牛逼', hints: ['牛', '啤酒', '厉害'], category: '弹幕' },
  { emoji: '💀☠️😵', answer: '寄了', hints: ['骷髅', '死亡', '晕'], category: '弹幕' },
  { emoji: '🤝👥💪', answer: '团队', hints: ['握手', '人群', '力量'], category: '日常' },
  { emoji: '🎶🎧🎹', answer: '音乐', hints: ['音符', '耳机', '钢琴'], category: '娱乐' },
  { emoji: '🌊🏄‍♂️☀️', answer: '冲浪', hints: ['海浪', '运动', '阳光'], category: '运动' },
  { emoji: '🍜🥢🔥', answer: '火锅', hints: ['面条', '筷子', '辣'], category: '美食' },
  { emoji: '📸✨🖼️', answer: '拍照', hints: ['相机', '闪光', '照片'], category: '日常' },
  { emoji: '🎭🃏😈', answer: '小丑', hints: ['面具', '扑克', '恶魔'], category: '身份' },
];

// 从游戏子模块独立数据源加载题库
let _cachedPuzzles: EmojiPuzzle[] | null = null;
async function loadPuzzles(): Promise<EmojiPuzzle[]> {
  if (_cachedPuzzles) return _cachedPuzzles;
  try {
    const res = await fetch('/api/public/game/emoji-puzzles');
    const json = await res.json();
    if (json.code === 0 && json.data && json.data.length > 0) {
      _cachedPuzzles = json.data as EmojiPuzzle[];
      return _cachedPuzzles;
    }
  } catch { /* fallback */ }
  return FALLBACK_PUZZLES;
}

type Phase = 'ready' | 'playing' | 'result';

export default function EmojiGuessPage() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [puzzles, setPuzzles] = useState<EmojiPuzzle[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalRounds = 10;

  const startGame = useCallback(async () => {
    const allPuzzles = await loadPuzzles();
    const shuffled = [...allPuzzles].sort(() => Math.random() - 0.5).slice(0, totalRounds);
    setPuzzles(shuffled);
    setCurrentIdx(0);
    setInput('');
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setHintsUsed(0);
    setShowHint(false);
    setAnswered(false);
    setIsCorrect(false);
    setTimeLeft(20);
    setPhase('playing');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // 倒计时
  useEffect(() => {
    if (phase !== 'playing' || answered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setAnswered(true);
          setIsCorrect(false);
          setStreak(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, answered, currentIdx]);

  const handleSubmit = () => {
    if (answered || !input.trim()) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const puzzle = puzzles[currentIdx];
    const correct = input.trim() === puzzle.answer;
    setAnswered(true);
    setIsCorrect(correct);

    if (correct) {
      const timeBonus = Math.floor(timeLeft * 2);
      const hintPenalty = showHint ? 5 : 0;
      const streakBonus = Math.min((streak + 1) * 3, 30);
      setScore((prev) => prev + 10 + timeBonus + streakBonus - hintPenalty);
      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
  };

  const nextPuzzle = () => {
    if (currentIdx + 1 >= puzzles.length) {
      setPhase('result');
    } else {
      setCurrentIdx((prev) => prev + 1);
      setInput('');
      setShowHint(false);
      setAnswered(false);
      setIsCorrect(false);
      setTimeLeft(20);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const useHint = () => {
    if (showHint || answered) return;
    setShowHint(true);
    setHintsUsed((prev) => prev + 1);
  };

  const puzzle = puzzles[currentIdx];

  return (
    <div className="pb-16 mt-14">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.5)_3px,rgba(255,255,255,0.5)_4px)]" />
        <div className="container-main px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          <Link href="/play" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> 返回游戏大厅
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">表情猜猜猜</h1>
              <p className="text-sm text-white/70 mt-0.5">看 emoji 猜出隐藏词语</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-main px-4 sm:px-6 lg:px-8 -mt-4 relative z-20">
        {/* Ready */}
        {phase === 'ready' && (
          <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="text-6xl mb-5">🤔💡✨</div>
            <h2 className="text-xl font-bold text-text-title dark:text-white">准备好了吗？</h2>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              每题给你一组 emoji，猜出它表达的词语
              <br />共 <strong className="text-text-title dark:text-white">{totalRounds}</strong> 题，每题限时 <strong className="text-text-title dark:text-white">20 秒</strong>，可使用提示
            </p>
            <button
              onClick={startGame}
              className="mt-8 h-12 px-8 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold text-base hover:from-pink-400 hover:to-red-400 transition-all active:scale-[0.97] shadow-lg cursor-pointer"
            >
              开始猜谜
            </button>
          </div>
        )}

        {/* Playing */}
        {phase === 'playing' && puzzle && (
          <div className="max-w-lg mx-auto space-y-4">
            {/* 状态栏 */}
            <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-text-title dark:text-white">
                    {currentIdx + 1} / {puzzles.length}
                  </span>
                  {streak > 1 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-bold">
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
              <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / puzzles.length) * 100}%` }}
                />
              </div>
            </div>

            {/* 谜题 */}
            <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-6 sm:p-8 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-bold mb-4">
                {puzzle.category}
              </span>

              {/* emoji 大字展示 */}
              <div className="text-6xl sm:text-7xl py-6 select-none animate-bounce" style={{ animationDuration: '2s' }}>
                {puzzle.emoji}
              </div>

              {/* 提示 */}
              {showHint && (
                <div className="mb-4 flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  提示：{puzzle.hints.join('、')}
                </div>
              )}

              {/* 输入 */}
              {!answered && (
                <div className="flex gap-2 mt-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="输入你的答案..."
                    maxLength={10}
                    className="flex-1 h-12 px-4 rounded-xl border-2 border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-white/5 text-lg font-bold text-text-title dark:text-white text-center placeholder-text-muted/50 focus:outline-none focus:border-pink-400 transition-colors"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                    className="h-12 px-5 rounded-xl bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold hover:from-pink-400 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    确定
                  </button>
                </div>
              )}

              {!answered && !showHint && (
                <button
                  onClick={useHint}
                  className="mt-3 text-xs text-text-muted hover:text-amber-500 transition-colors cursor-pointer"
                >
                  💡 需要提示？（-5 分）
                </button>
              )}

              {/* 答题结果 */}
              {answered && (
                <div className="mt-4 space-y-3">
                  <div className={`flex items-center justify-center gap-2 text-base font-bold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isCorrect ? (
                      <><CheckCircle className="w-5 h-5" /> 答对了！</>
                    ) : timeLeft === 0 ? (
                      <><Clock className="w-5 h-5" /> 时间到！答案是「{puzzle.answer}」</>
                    ) : (
                      <><XCircle className="w-5 h-5" /> 答错了，正确答案是「{puzzle.answer}」</>
                    )}
                  </div>
                  <button
                    onClick={nextPuzzle}
                    className="inline-flex items-center gap-1 h-9 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    {currentIdx + 1 >= puzzles.length ? '查看结果' : '下一题'}
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
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-text-title dark:text-white">猜谜结束！</h2>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className="text-2xl font-bold text-primary">{score}</div>
                <div className="text-xs text-text-muted mt-1">总分</div>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className="text-2xl font-bold text-pink-500">{bestStreak}</div>
                <div className="text-xs text-text-muted mt-1">最长连击</div>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className="text-2xl font-bold text-amber-500">{hintsUsed}</div>
                <div className="text-xs text-text-muted mt-1">使用提示</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 p-4">
              <p className="text-sm font-medium text-primary">
                {score >= totalRounds * 25
                  ? '🏆 emoji 达人！你的联想能力太强了！'
                  : score >= totalRounds * 15
                  ? '🔥 不错不错，脑子很灵活！'
                  : score >= totalRounds * 8
                  ? '😊 继续努力，相信你会更好！'
                  : '🤔 多玩几次就会找到感觉啦~'}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={startGame}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold hover:from-pink-400 hover:to-red-400 transition-all cursor-pointer"
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
