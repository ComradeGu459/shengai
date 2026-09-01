const uuidError = '当前浏览器不支持安全随机标识生成：crypto.getRandomValues 不可用。';

const createUuidFromValues = (): string => {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') throw new Error(uuidError);
  const bytes = new Uint8Array(16);
  try {
    cryptoApi.getRandomValues(bytes);
  } catch {
    throw new Error(uuidError);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const installRandomUuidFallback = (): void => {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') throw new Error(uuidError);
  if (typeof cryptoApi.randomUUID === 'function') return;
  try {
    Object.defineProperty(cryptoApi, 'randomUUID', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: createUuidFromValues,
    });
  } catch {
    // 某些纯 HTTP 浏览器会把 Crypto 设为不可扩展；所有业务调用都走
    // createUuid，因此仍可使用同一份安全 getRandomValues fallback。
    return;
  }
};

export const createUuid = (): string => {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  return createUuidFromValues();
};

installRandomUuidFallback();
