import { describe, it, expect, afterEach, vi } from 'vitest';
import { isModerationEnabled } from '@/lib/content-moderation';

describe('isModerationEnabled', () => {
  // vi.stubEnv 会在每次 stub 时保存原值，unstubAllEnvs 负责恢复，无需手工管理。
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('test_isModerationEnabled_explicitTrue_enabled', () => {
    vi.stubEnv('CONTENT_MODERATION_ENABLED', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    expect(isModerationEnabled()).toBe(true);
  });

  it('test_isModerationEnabled_explicitFalse_disabled_evenInProduction', () => {
    vi.stubEnv('CONTENT_MODERATION_ENABLED', 'false');
    vi.stubEnv('NODE_ENV', 'production');
    // 显式 false 在生产也必须尊重（运维应急开关）
    expect(isModerationEnabled()).toBe(false);
  });

  it('test_isModerationEnabled_unsetInProduction_defaultsEnabled', () => {
    vi.stubEnv('CONTENT_MODERATION_ENABLED', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(isModerationEnabled()).toBe(true);
  });

  it('test_isModerationEnabled_unsetInDevelopment_defaultsDisabled', () => {
    vi.stubEnv('CONTENT_MODERATION_ENABLED', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(isModerationEnabled()).toBe(false);
  });

  it('test_isModerationEnabled_unsetInTest_defaultsDisabled', () => {
    // 测试环境下默认关闭，避免触达腾讯云 API
    vi.stubEnv('CONTENT_MODERATION_ENABLED', '');
    vi.stubEnv('NODE_ENV', 'test');
    expect(isModerationEnabled()).toBe(false);
  });

  it('test_isModerationEnabled_invalidStringInProduction_treatedAsUnset_defaultsEnabled', () => {
    // 非 'true' 非 'false' 的任意字符串视为未设置 → 生产默认启用
    vi.stubEnv('CONTENT_MODERATION_ENABLED', '1');
    vi.stubEnv('NODE_ENV', 'production');
    expect(isModerationEnabled()).toBe(true);
  });

  it('test_isModerationEnabled_invalidStringInDevelopment_treatedAsUnset_defaultsDisabled', () => {
    vi.stubEnv('CONTENT_MODERATION_ENABLED', 'yes');
    vi.stubEnv('NODE_ENV', 'development');
    expect(isModerationEnabled()).toBe(false);
  });
});
