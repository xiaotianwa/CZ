import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    bannedWord: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { checkBannedWords, findAllBannedWords, resetBannedWordsCache } from '@/lib/banned-words';

beforeEach(() => {
  resetBannedWordsCache();
});

describe('checkBannedWords', () => {
  it('test_checkBannedWords_cleanContent_returnsNull', async () => {
    expect(await checkBannedWords('今天天气真好，我很开心')).toBeNull();
  });

  it('test_checkBannedWords_containsBannedWord_returnsWord', async () => {
    expect(await checkBannedWords('你好，傻逼')).toBe('傻逼');
  });

  it('test_checkBannedWords_caseInsensitive_detectsEnglish', async () => {
    expect(await checkBannedWords('what the FUCK is this')).toBe('fuck');
  });

  it('test_checkBannedWords_emptyString_returnsNull', async () => {
    expect(await checkBannedWords('')).toBeNull();
  });

  it('test_checkBannedWords_bannedWordInMiddle_returnsWord', async () => {
    expect(await checkBannedWords('我要去赌博了明天')).toBe('赌博');
  });

  // 变体检测测试
  it('test_checkBannedWords_variant_shaB_detected', async () => {
    expect(await checkBannedWords('傻b')).toBe('傻逼');
  });

  it('test_checkBannedWords_variant_sb_detected', async () => {
    expect(await checkBannedWords('你是个sb')).toBe('傻逼');
  });

  it('test_checkBannedWords_variant_symbolBypass_detected', async () => {
    expect(await checkBannedWords('傻.逼')).toBe('傻逼');
  });

  it('test_checkBannedWords_variant_tmd_detected', async () => {
    expect(await checkBannedWords('tmd真烦')).toBe('他妈的');
  });

  it('test_checkBannedWords_variant_nmb_detected', async () => {
    expect(await checkBannedWords('nmb')).toBe('你妈逼');
  });

  it('test_checkBannedWords_variant_fuckSpaced_detected', async () => {
    expect(await checkBannedWords('f u c k')).toBe('fuck');
  });

  it('test_checkBannedWords_variant_shaBI_detected', async () => {
    expect(await checkBannedWords('沙比东西')).toBe('傻逼');
  });
});

describe('findAllBannedWords', () => {
  it('test_findAllBannedWords_multipleBannedWords_returnsAll', async () => {
    const result = await findAllBannedWords('傻逼脑残去死');
    expect(result).toContain('傻逼');
    expect(result).toContain('脑残');
    expect(result).toContain('去死');
  });

  it('test_findAllBannedWords_cleanContent_returnsEmptyArray', async () => {
    expect(await findAllBannedWords('正常内容')).toEqual([]);
  });

  it('test_findAllBannedWords_emptyString_returnsEmptyArray', async () => {
    expect(await findAllBannedWords('')).toEqual([]);
  });
});
