import { describe, it, expect } from 'vitest';
import { timingSafeEqualStr } from '@/lib/timing-safe';

describe('timingSafeEqualStr', () => {
  // ========== 正常流程 ==========
  it('test_timingSafeEqualStr_identicalAscii_returnsTrue', () => {
    expect(timingSafeEqualStr('Bearer abc123', 'Bearer abc123')).toBe(true);
  });

  it('test_timingSafeEqualStr_identicalLongSecret_returnsTrue', () => {
    const s = 'x'.repeat(256) + 'END';
    expect(timingSafeEqualStr(s, s)).toBe(true);
  });

  // ========== 内容不等 ==========
  it('test_timingSafeEqualStr_differentContent_sameLength_returnsFalse', () => {
    expect(timingSafeEqualStr('secret-aaa', 'secret-bbb')).toBe(false);
  });

  it('test_timingSafeEqualStr_firstByteDiffers_returnsFalse', () => {
    expect(timingSafeEqualStr('Asecret', 'Bsecret')).toBe(false);
  });

  it('test_timingSafeEqualStr_lastByteDiffers_returnsFalse', () => {
    expect(timingSafeEqualStr('secretA', 'secretB')).toBe(false);
  });

  // ========== 长度不等 ==========
  it('test_timingSafeEqualStr_differentLength_returnsFalse', () => {
    expect(timingSafeEqualStr('short', 'short-but-longer')).toBe(false);
    expect(timingSafeEqualStr('short-but-longer', 'short')).toBe(false);
  });

  it('test_timingSafeEqualStr_prefixMatch_rejected', () => {
    // 前缀完全匹配但长度不同，必须拒绝（防长度延伸攻击）
    expect(timingSafeEqualStr('Bearer abc', 'Bearer abc123')).toBe(false);
  });

  // ========== 边界：空值 ==========
  it('test_timingSafeEqualStr_bothEmpty_returnsTrue', () => {
    expect(timingSafeEqualStr('', '')).toBe(true);
  });

  it('test_timingSafeEqualStr_oneEmpty_returnsFalse', () => {
    expect(timingSafeEqualStr('', 'secret')).toBe(false);
    expect(timingSafeEqualStr('secret', '')).toBe(false);
  });

  // ========== 边界：Unicode / 非 ASCII ==========
  it('test_timingSafeEqualStr_identicalUnicode_returnsTrue', () => {
    expect(timingSafeEqualStr('密钥-🔑-测试', '密钥-🔑-测试')).toBe(true);
  });

  it('test_timingSafeEqualStr_differentUnicode_returnsFalse', () => {
    expect(timingSafeEqualStr('密钥-🔑-A', '密钥-🔑-B')).toBe(false);
  });

  it('test_timingSafeEqualStr_unicodeVsAsciiSameVisualLength_returnsFalse', () => {
    // 中文 "abc" 三个字符，但 UTF-8 字节数远不同，必须能正确判定不等
    expect(timingSafeEqualStr('abc', '甲乙丙')).toBe(false);
  });

  // ========== 典型攻击面：Bearer Token ==========
  it('test_timingSafeEqualStr_bearerTokenSingleCharFlip_returnsFalse', () => {
    const expected = 'Bearer super-secret-production-key-2026';
    const attacker = 'Bearer super-secret-production-key-2027'; // 最后一位不同
    expect(timingSafeEqualStr(attacker, expected)).toBe(false);
  });

  // ========== 性能/时序特性（非严格检测，只证明遍历到底） ==========
  // 注：真正的时序测量需要 nanosecond 精度 + 多次采样，单元测试无法稳定验证。
  // 这里仅确保函数在长度差异巨大时仍正确返回 false，不做短路。
  it('test_timingSafeEqualStr_massiveLengthMismatch_returnsFalse', () => {
    const a = 'x';
    const b = 'x'.repeat(10_000);
    expect(timingSafeEqualStr(a, b)).toBe(false);
  });
});
