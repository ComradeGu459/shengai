import { describe, expect, it, vi } from 'vitest';

import {
  createTencentOcrRegistryFromEnv,
  createTencentOcrRuntimeConfigFromEnv,
  TencentOfficialOcrTransport,
  TencentOcrConfigurationError,
  type TencentOcrSdkFactory,
} from '../../backend/src/modules/screen-text/tencent-ocr-runtime.js';
import { TencentOcrTransportError } from '../../backend/src/modules/screen-text/tencent-ocr-adapter.js';

const enabledEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  QIMAO_TENCENT_OCR_ENABLED: 'true',
  QIMAO_TENCENT_OCR_REGION: 'ap-nanjing',
  QIMAO_TENCENT_OCR_SECRET_ID: 'test-secret-id',
  QIMAO_TENCENT_OCR_SECRET_KEY: 'test-secret-key',
  QIMAO_TENCENT_OCR_MAX_AMOUNT_CNY: '1.00',
  ...extra,
});

describe('Tencent OCR runtime', () => {
  it('默认关闭，生产关闭 fail-closed，半配置稳定拒绝', () => {
    expect(createTencentOcrRuntimeConfigFromEnv({ NODE_ENV: 'test' }).enabled).toBe(false);
    expect(() => createTencentOcrRegistryFromEnv({ env: { NODE_ENV: 'production' }, sdkFactory: { create: vi.fn() } })).toThrowError(new TencentOcrConfigurationError('DISABLED_IN_PRODUCTION'));
    expect(() => createTencentOcrRuntimeConfigFromEnv({ NODE_ENV: 'test', QIMAO_TENCENT_OCR_REGION: 'ap-nanjing' })).toThrowError(new TencentOcrConfigurationError('CONFIG_INCOMPLETE'));
    const missingQuote = enabledEnv();
    delete missingQuote.QIMAO_TENCENT_OCR_MAX_AMOUNT_CNY;
    expect(() => createTencentOcrRuntimeConfigFromEnv(missingQuote)).toThrowError(new TencentOcrConfigurationError('CONFIG_INCOMPLETE'));
    expect(() => createTencentOcrRuntimeConfigFromEnv(enabledEnv({ QIMAO_TENCENT_OCR_TIMEOUT_MS: '999' }))).toThrowError(new TencentOcrConfigurationError('CONFIG_INVALID'));
  });

  it('显式开启时注入专用 region/Secret/timeout，注册表只含 Tencent OCR', () => {
    const create = vi.fn(() => ({ GeneralBasicOCR: vi.fn() }));
    const sdkFactory: TencentOcrSdkFactory = { create };
    const registry = createTencentOcrRegistryFromEnv({ env: enabledEnv({ QIMAO_TENCENT_OCR_TIMEOUT_MS: '12000' }), sdkFactory });
    expect(create).toHaveBeenCalledWith({
      region: 'ap-nanjing', secretReference: { secretId: 'test-secret-id', secretKey: 'test-secret-key' }, timeoutMs: 12000,
    });
    expect(registry.descriptors()).toHaveLength(1);
    expect(registry.defaultDescriptor.adapter).toBe('screen_text_tencent_general_basic_ocr_v1');
    expect(registry.defaultDescriptor.billing.maximumAmount).toBe('1.00');
  });

  it('将官方 SDK 扁平 Promise 响应归一化为内部 Response，并保留 RequestId', async () => {
    const client = { GeneralBasicOCR: vi.fn().mockResolvedValue({
      TextDetections: [{ DetectedText: '屏幕字', Confidence: 88 }], RequestId: 'official-request-id',
    }) };
    const transport = new TencentOfficialOcrTransport(client);
    const response = await transport.GeneralBasicOCR({ ImageBase64: 'AQI=', LanguageType: 'zh' });
    expect(response.Response?.RequestId).toBe('official-request-id');
    expect(response.Response?.TextDetections?.[0]?.DetectedText).toBe('屏幕字');
    expect(client.GeneralBasicOCR).toHaveBeenCalledWith({ ImageBase64: 'AQI=', LanguageType: 'zh' }, expect.any(Function));
  });

  it('SDK 错误只映射稳定分类，超时不挂起', async () => {
    const unauthorized = new TencentOfficialOcrTransport({ GeneralBasicOCR: vi.fn().mockRejectedValue({ statusCode: 403, message: 'SECRET_VALUE' }) });
    try {
      await unauthorized.GeneralBasicOCR({ ImageBase64: 'AQI=' });
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toMatchObject({ code: 'unauthorized' });
      expect(String(error)).not.toContain('SECRET_VALUE');
    }
    const timeout = new TencentOfficialOcrTransport({ GeneralBasicOCR: vi.fn(() => new Promise(() => undefined)) }, 5);
    await expect(timeout.GeneralBasicOCR({ ImageBase64: 'AQI=' })).rejects.toMatchObject({ code: 'timeout' });
    expect(new TencentOcrTransportError('unknown').message).toBe('unknown');
  });
});
