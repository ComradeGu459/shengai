// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createUuid, installRandomUuidFallback } from '../../frontend/src/platform/randomUuid.js';

const cryptoApi = globalThis.crypto as Crypto & { randomUUID?: () => string };
const originalDescriptor = Object.getOwnPropertyDescriptor(cryptoApi, 'randomUUID');
const originalGetRandomValues = cryptoApi.getRandomValues;

afterEach(() => {
  if (originalDescriptor) Object.defineProperty(cryptoApi, 'randomUUID', originalDescriptor);
  else delete cryptoApi.randomUUID;
  Object.defineProperty(cryptoApi, 'getRandomValues', { configurable: true, writable: true, value: originalGetRandomValues });
  vi.restoreAllMocks();
});

describe('员工端安全 UUID 启动能力', () => {
  it('原生 randomUUID 存在时保持原生实现', () => {
    const native = vi.fn(() => 'native-uuid');
    Object.defineProperty(cryptoApi, 'randomUUID', { configurable: true, writable: true, value: native });
    installRandomUuidFallback();
    expect(createUuid()).toBe('native-uuid');
    expect(native).toHaveBeenCalledOnce();
  });

  it('缺少原生 randomUUID 时用 getRandomValues 生成 RFC4122 v4', () => {
    Object.defineProperty(cryptoApi, 'randomUUID', { configurable: true, writable: true, value: undefined });
    const getRandomValues = vi.spyOn(cryptoApi, 'getRandomValues');
    installRandomUuidFallback();
    const uuid = createUuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(getRandomValues).toHaveBeenCalled();
  });

  it('getRandomValues 不可用时明确抛错', () => {
    Object.defineProperty(cryptoApi, 'randomUUID', { configurable: true, writable: true, value: undefined });
    Object.defineProperty(cryptoApi, 'getRandomValues', { configurable: true, writable: true, value: undefined });
    expect(() => installRandomUuidFallback()).toThrow('crypto.getRandomValues 不可用');
    expect(() => createUuid()).toThrow('crypto.getRandomValues 不可用');
  });
});
