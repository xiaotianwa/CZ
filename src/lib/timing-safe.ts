/**
 * 常量时间字符串比较 —— 防御时序攻击（CWE-208）
 *
 * 场景：Basic Auth 密码、Bearer Token、CRON_SECRET、INTERNAL_API_SECRET 等对外部传入
 * 凭证的比较，不得使用 `a === b`，否则短路比较会因匹配前缀长度导致耗时差异，
 * 可被远程攻击者（理论上）通过大量测量逐字符爆破。
 *
 * 本实现不依赖 `node:crypto`，在 Next.js middleware 的 Edge Runtime 与 API route 的
 * Node Runtime 下行为一致，仅使用 `TextEncoder` + 位运算。
 *
 * 注意：长度差异无法完全隐藏（这是常量时间比较的固有限制，Node `crypto.timingSafeEqual`
 * 也要求等长 Buffer）。实现会将长度差累积到最终比对位，使长度不等时永远返回 false，
 * 且遍历次数取 max(a,b)，避免因长度差提前返回暴露时序信号。
 */

/**
 * 常量时间比较两个字符串是否完全相等。
 * - 长度不等 → 返回 false，且仍遍历 max(a,b) 长度以保持时序一致。
 * - 内容不等 → 返回 false，耗时与匹配前缀无关。
 *
 * @param a 字符串 A（通常是用户传入值）
 * @param b 字符串 B（通常是服务端密钥）
 * @returns 两字符串是否完全相等
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const len = Math.max(aBytes.length, bBytes.length);

  // 长度差异先累积到 diff，即使后续字节全相同也会被这个位干扰为非零
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) {
    const x = i < aBytes.length ? aBytes[i] : 0;
    const y = i < bBytes.length ? bBytes[i] : 0;
    diff |= x ^ y;
  }
  return diff === 0;
}
