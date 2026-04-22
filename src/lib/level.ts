export const POINTS_PER_LEVEL = 100;
export const MAX_LEVEL = 100;
export const SPECIAL_BADGE_LEVEL = 100;

export const POINT_RULE_POINTS = {
  daily_login: 50,
  post: 50,
  comment: 10,
  be_liked: 10,
  event: 20,
} as const;

export function calcLevelFromPoints(points: number): number {
  const safePoints = Math.max(0, points);
  return Math.min(MAX_LEVEL, Math.floor(safePoints / POINTS_PER_LEVEL) + 1);
}

export function getBadgeByLevel(level: number): string | null {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, level));

  if (safeLevel >= SPECIAL_BADGE_LEVEL) {
    return '1103';
  }

  const badgeTier = Math.floor(safeLevel / 10);
  if (badgeTier < 1) {
    return null;
  }

  return `${badgeTier}阶标签`;
}

export function getLevelInfo(level: number): { name: string; badge: string | null; color: string } {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, level));
  const badge = getBadgeByLevel(safeLevel);

  if (safeLevel >= SPECIAL_BADGE_LEVEL) {
    return { name: '1103特殊标签', badge, color: 'bg-gradient-to-r from-[#111827] via-[#1d4ed8] to-[#dc2626]' };
  }

  if (safeLevel >= 70) {
    return { name: badge ?? '成长中', badge, color: 'bg-gradient-to-r from-fuchsia-500 to-rose-500' };
  }

  if (safeLevel >= 40) {
    return { name: badge ?? '成长中', badge, color: 'bg-gradient-to-r from-violet-500 to-indigo-500' };
  }

  if (safeLevel >= 10) {
    return { name: badge ?? '成长中', badge, color: 'bg-gradient-to-r from-sky-500 to-cyan-500' };
  }

  return { name: '成长中', badge: null, color: 'bg-gray-400' };
}

export function getLevelRange(level: number): {
  currentLevel: number;
  currentMinPoints: number;
  nextLevel: number;
  nextMinPoints: number;
} {
  const currentLevel = Math.max(1, Math.min(MAX_LEVEL, level));
  const currentMinPoints = (currentLevel - 1) * POINTS_PER_LEVEL;

  if (currentLevel >= MAX_LEVEL) {
    return {
      currentLevel,
      currentMinPoints,
      nextLevel: MAX_LEVEL,
      nextMinPoints: currentMinPoints,
    };
  }

  return {
    currentLevel,
    currentMinPoints,
    nextLevel: currentLevel + 1,
    nextMinPoints: currentLevel * POINTS_PER_LEVEL,
  };
}
