/**
 * 程序化音效系统（Web Audio API 纯代码合成 —— 无需音频文件）
 * -----------------------------------------------------------
 * 设计原则：
 *  1. Lazy init：首次用户手势后才创建 AudioContext（浏览器 autoplay 策略）
 *  2. 全局静音开关：localStorage 持久化
 *  3. 节流：相同 key 的音效在 40ms 内只播一次，防攻击连击刷爆扬声器
 *  4. 轻量 envelope：所有音效都走 ADSR（Attack/Sustain/Release）
 *
 * 使用：
 *   import { sfx, setMuted, isMuted, unlockAudio } from '@/game/sound';
 *   sfx.play();  sfx.attack();  sfx.damage();  ...
 *   (UI 在首次点击时调用 unlockAudio() 激活 AudioContext)
 */

export type SfxName =
  | 'play'        // 出牌
  | 'attack'      // 攻击命中
  | 'damage'      // 受击
  | 'heal'        // 治疗
  | 'death'       // 死亡
  | 'combo'       // 联动触发
  | 'buff'        // 增益
  | 'coin'        // 抽牌
  | 'click'       // UI 点击
  | 'hover'       // UI hover
  | 'turnStart'   // 新回合
  | 'win'         // 胜利
  | 'lose';       // 失败

const STORAGE_KEY = 'chenze_tcg_sfx_muted_v1';
const THROTTLE_MS = 40;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;
const lastPlayedAt = new Map<SfxName, number>();

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** 读取初始静音状态（SSR 安全） */
if (isBrowser()) {
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch { /* ignore */ }
}

/** 由用户手势触发，懒初始化 AudioContext。多次调用无副作用。 */
export function unlockAudio(): void {
  if (!isBrowser() || ctx) return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.35;
    masterGain.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

export function isMuted(): boolean { return muted; }

export function setMuted(next: boolean): void {
  muted = next;
  if (isBrowser()) {
    try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
  }
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(next ? 0 : 0.35, ctx.currentTime, 0.02);
  }
}

// ============ 基础合成原语 ============

interface ToneOpts {
  /** 频率 Hz */
  freq: number;
  /** 终止频率（做滑音，默认等于 freq） */
  endFreq?: number;
  /** 振荡器类型 */
  type?: OscillatorType;
  /** 起音时长 s */
  attack?: number;
  /** 总时长 s */
  duration?: number;
  /** 响度 0-1 */
  gain?: number;
  /** 延迟播放 s */
  delay?: number;
}

function tone({ freq, endFreq, type = 'sine', attack = 0.005, duration = 0.12, gain = 0.5, delay = 0 }: ToneOpts): void {
  if (!ctx || !masterGain || muted) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq && endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
  }
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** 白噪声（爆裂声） */
function noise({ attack = 0.005, duration = 0.15, gain = 0.3, delay = 0, highpass = 800, lowpass = 3000 }: {
  attack?: number; duration?: number; gain?: number; delay?: number; highpass?: number; lowpass?: number;
}): void {
  if (!ctx || !masterGain || muted) return;
  const now = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = highpass;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(hp);
  hp.connect(lp);
  lp.connect(g);
  g.connect(masterGain);
  src.start(now);
  src.stop(now + duration + 0.02);
}

// ============ 节流包装 ============

function throttled(name: SfxName, impl: () => void): void {
  if (muted) return;
  const now = Date.now();
  const last = lastPlayedAt.get(name) ?? 0;
  if (now - last < THROTTLE_MS) return;
  lastPlayedAt.set(name, now);
  // 若 ctx 尚未解锁，尝试静默解锁（可能失败）；失败则放弃本次
  if (!ctx) unlockAudio();
  if (!ctx) return;
  try { impl(); } catch { /* ignore */ }
}

// ============ 具体音效 ============

export const sfx = {
  /** 出牌：一个短促的上升滑音 */
  play() {
    throttled('play', () => {
      tone({ freq: 420, endFreq: 720, type: 'triangle', duration: 0.14, gain: 0.28 });
      tone({ freq: 840, endFreq: 1440, type: 'sine', duration: 0.09, gain: 0.14, delay: 0.02 });
    });
  },

  /** 攻击：金属打击（两段噪声 + 低频咚） */
  attack() {
    throttled('attack', () => {
      tone({ freq: 160, endFreq: 60, type: 'square', duration: 0.11, gain: 0.28 });
      noise({ duration: 0.08, gain: 0.25, highpass: 1200, lowpass: 5500 });
    });
  },

  /** 受击：低沉咚 + 轻微噪声 */
  damage() {
    throttled('damage', () => {
      tone({ freq: 220, endFreq: 70, type: 'sawtooth', duration: 0.18, gain: 0.3 });
      noise({ duration: 0.1, gain: 0.2, highpass: 300, lowpass: 2400 });
    });
  },

  /** 治疗：温柔的和弦上扬 */
  heal() {
    throttled('heal', () => {
      tone({ freq: 523.25, type: 'sine', duration: 0.18, gain: 0.22 });           // C5
      tone({ freq: 659.25, type: 'sine', duration: 0.22, gain: 0.18, delay: 0.04 }); // E5
      tone({ freq: 783.99, type: 'sine', duration: 0.28, gain: 0.16, delay: 0.08 }); // G5
    });
  },

  /** 死亡：下行滑音 */
  death() {
    throttled('death', () => {
      tone({ freq: 300, endFreq: 40, type: 'sawtooth', duration: 0.5, gain: 0.28 });
      noise({ duration: 0.35, gain: 0.12, highpass: 200, lowpass: 1500, delay: 0.02 });
    });
  },

  /** 联动：华丽的四音上升琶音 + 尾声嗡 */
  combo() {
    throttled('combo', () => {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5-E5-G5-C6
      notes.forEach((f, i) => {
        tone({ freq: f, type: 'triangle', duration: 0.18, gain: 0.22, delay: i * 0.06 });
        tone({ freq: f * 2, type: 'sine', duration: 0.12, gain: 0.1, delay: i * 0.06 + 0.01 });
      });
      tone({ freq: 1046.5, endFreq: 1568, type: 'sine', duration: 0.45, gain: 0.15, delay: 0.28 });
    });
  },

  /** 增益：两段上升 bleep */
  buff() {
    throttled('buff', () => {
      tone({ freq: 660, endFreq: 990, type: 'square', duration: 0.1, gain: 0.18 });
      tone({ freq: 990, endFreq: 1320, type: 'square', duration: 0.1, gain: 0.18, delay: 0.08 });
    });
  },

  /** 抽牌/金币：两段 bell */
  coin() {
    throttled('coin', () => {
      tone({ freq: 1200, type: 'sine', duration: 0.14, gain: 0.22 });
      tone({ freq: 1800, type: 'sine', duration: 0.1, gain: 0.16, delay: 0.04 });
    });
  },

  /** UI 点击：极短 click */
  click() {
    throttled('click', () => {
      tone({ freq: 1200, type: 'square', duration: 0.04, gain: 0.14, attack: 0.001 });
    });
  },

  /** UI hover：更轻的 tick（避免太吵，默认不用） */
  hover() {
    throttled('hover', () => {
      tone({ freq: 2000, type: 'sine', duration: 0.03, gain: 0.06, attack: 0.001 });
    });
  },

  /** 新回合：两段号角 */
  turnStart() {
    throttled('turnStart', () => {
      tone({ freq: 392, type: 'triangle', duration: 0.18, gain: 0.22 });   // G4
      tone({ freq: 523.25, type: 'triangle', duration: 0.22, gain: 0.22, delay: 0.12 }); // C5
    });
  },

  /** 胜利：欢快三音 + 尾巴 */
  win() {
    throttled('win', () => {
      tone({ freq: 523.25, type: 'triangle', duration: 0.16, gain: 0.24 });                      // C5
      tone({ freq: 659.25, type: 'triangle', duration: 0.16, gain: 0.24, delay: 0.12 });         // E5
      tone({ freq: 783.99, type: 'triangle', duration: 0.22, gain: 0.26, delay: 0.24 });         // G5
      tone({ freq: 1046.5, type: 'triangle', duration: 0.45, gain: 0.3,  delay: 0.4 });          // C6
    });
  },

  /** 失败：低沉三音下行 */
  lose() {
    throttled('lose', () => {
      tone({ freq: 330, endFreq: 110, type: 'sawtooth', duration: 0.6, gain: 0.28 });
      tone({ freq: 220, endFreq: 82, type: 'sawtooth', duration: 0.7, gain: 0.22, delay: 0.2 });
    });
  },
};
