// 卡组规则校验测试

import { describe, it, expect } from 'vitest';
import { validateDeck, DECK_RULES } from '../deck-builder';
import { ALL_DECKS } from '../decks';

describe('validateDeck', () => {
  it('预设卡组应通过校验', () => {
    for (const { deck } of ALL_DECKS) {
      const r = validateDeck(deck.cards);
      expect(r.ok, `${deck.heroName} 校验失败：${JSON.stringify(r.errors)}`).toBe(true);
    }
  });

  it('数量不等于 25 应报错', () => {
    const r = validateDeck(['C02', 'C02']);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'size')).toBe(true);
  });

  it('单卡超过 2 应报错', () => {
    const cards = Array(25).fill('C02'); // C02 是 N，全 25 张 C02
    const r = validateDeck(cards);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'duplicate' && (e as any).defId === 'C02')).toBe(true);
  });

  it('SSR 超过 1 应报错', () => {
    // 10 张 C02 + 10 张 C03 + 5 张 SSR 陈泽（C14）→ SSR 5 超过 1
    const cards = [
      ...Array(2).fill('C02'),
      ...Array(2).fill('C03'),
      ...Array(2).fill('C04'),
      ...Array(2).fill('C06'),
      ...Array(2).fill('I03'),
      ...Array(2).fill('E02'),
      ...Array(2).fill('V01'),
      ...Array(6).fill('C14'),  // SSR × 6 非法
      ...Array(5).fill('C10'),  // 也会触发 duplicate
    ];
    expect(cards.length).toBe(25);
    const r = validateDeck(cards);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'ssr_exceeded')).toBe(true);
  });

  it('缺少某个类型应报错', () => {
    // 全是 character 类型
    const cards = [
      ...Array(2).fill('C02'),
      ...Array(2).fill('C03'),
      ...Array(2).fill('C04'),
      ...Array(2).fill('C05'),
      ...Array(2).fill('C06'),
      ...Array(2).fill('C07'),
      ...Array(2).fill('C08'),
      ...Array(2).fill('C09'),
      ...Array(2).fill('C10'),
      ...Array(2).fill('C11'),
      ...Array(2).fill('C12'),
      ...Array(1).fill('C13'),
      ...Array(2).fill('C01'),
    ];
    expect(cards.length).toBe(25);
    const r = validateDeck(cards);
    expect(r.ok).toBe(false);
    const missing = r.errors.filter((e) => e.code === 'missing_type').map((e) => (e as any).type);
    expect(missing).toContain('item');
    expect(missing).toContain('equipment');
    expect(missing).toContain('effect');
    expect(missing).toContain('event');
  });
});
