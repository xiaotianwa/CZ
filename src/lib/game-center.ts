import {
  DEFAULT_GAME_CENTER_ENTRIES,
  GAME_CENTER_FALLBACK_META,
  REMOVED_GAME_CENTER_ENTRY_KEYS,
} from '@/data/gameCenterEntries';

export interface GameCenterEntryRecord {
  id: string;
  entryKey: string;
  title: string;
  href: string;
  subtitle?: string | null;
  desc?: string | null;
  iconKey?: string | null;
  gradient?: string | null;
  glowColor?: string | null;
  badge?: string | null;
  isEnabled: boolean;
  sortOrder: number;
}

export function isRemovedGameCenterEntryKey(entryKey: string) {
  return REMOVED_GAME_CENTER_ENTRY_KEYS.some((key) => key === entryKey);
}

export function mergeGameCenterEntries(records: GameCenterEntryRecord[]) {
  const defaultMap = new Map(DEFAULT_GAME_CENTER_ENTRIES.map((item) => [item.entryKey, item]));
  const removedKeys = new Set<string>(REMOVED_GAME_CENTER_ENTRY_KEYS);
  const activeRecords = records.filter((record) => !removedKeys.has(record.entryKey));

  const merged = activeRecords.map((record) => {
    const fallback = defaultMap.get(record.entryKey);

    return {
      id: record.id,
      entryKey: record.entryKey,
      title: record.title,
      href: record.href,
      subtitle: record.subtitle ?? fallback?.subtitle ?? GAME_CENTER_FALLBACK_META.subtitle,
      desc: record.desc ?? fallback?.desc ?? GAME_CENTER_FALLBACK_META.desc,
      iconKey: (record.iconKey ?? fallback?.iconKey ?? GAME_CENTER_FALLBACK_META.iconKey),
      gradient: record.gradient ?? fallback?.gradient ?? GAME_CENTER_FALLBACK_META.gradient,
      glowColor: record.glowColor ?? fallback?.glowColor ?? GAME_CENTER_FALLBACK_META.glowColor,
      badge: record.badge ?? fallback?.badge,
      sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : (fallback?.sortOrder ?? 0),
      isEnabled: typeof record.isEnabled === 'boolean' ? record.isEnabled : Boolean(record.isEnabled),
    };
  });

  const existingKeys = new Set(merged.map((item) => item.entryKey));

  const defaults = DEFAULT_GAME_CENTER_ENTRIES.filter((item) => !existingKeys.has(item.entryKey)).map((item) => ({
    id: item.entryKey,
    entryKey: item.entryKey,
    title: item.title,
    href: item.href,
    subtitle: item.subtitle,
    desc: item.desc,
    iconKey: item.iconKey,
    gradient: item.gradient,
    glowColor: item.glowColor,
    badge: item.badge,
    sortOrder: item.sortOrder,
    isEnabled: true,
  }));

  return [...merged, ...defaults].sort((a, b) => a.sortOrder - b.sortOrder);
}
