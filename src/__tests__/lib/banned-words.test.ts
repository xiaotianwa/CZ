import { describe, it, expect, beforeEach } from 'vitest';
import { checkBannedWords, findAllBannedWords, resetBannedWordsCache } from '@/lib/banned-words';

beforeEach(() => {
  resetBannedWordsCache();
});

describe('checkBannedWords', () => {
  it('test_checkBannedWords_cleanContent_returnsNull', () => {
    expect(checkBannedWords('今天天气真好，我很开心')).toBeNull();
  });

  it('test_checkBannedWords_containsBannedWord_returnsWord', () => {
    expect(checkBannedWords('你好，傻逼')).toBe('傻逼');
  });

  it('test_checkBannedWords_caseInsensitive_detectsEnglish', () => {
    expect(checkBannedWords('what the FUCK is this')).toBe('fuck');
  });

  it('test_checkBannedWords_emptyString_returnsNull', () => {
    expect(checkBannedWords('')).toBeNull();
  });

  it('test_checkBannedWords_bannedWordInMiddle_returnsWord', () => {
    expect(checkBannedWords('我要去赌博了明天')).toBe('赌博');
  });
});

describe('findAllBannedWords', () => {
  it('test_findAllBannedWords_multipleBannedWords_returnsAll', () => {
    const result = findAllBannedWords('傻逼脑残去死');
    expect(result).toContain('傻逼');
    expect(result).toContain('脑残');
    expect(result).toContain('去死');
  });

  it('test_findAllBannedWords_cleanContent_returnsEmptyArray', () => {
    expect(findAllBannedWords('正常内容')).toEqual([]);
  });

  it('test_findAllBannedWords_emptyString_returnsEmptyArray', () => {
    expect(findAllBannedWords('')).toEqual([]);
  });
});
