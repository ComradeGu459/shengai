import { describe, expect, it, vi } from 'vitest';

import {
  TencentAsrConfigurationError,
  TencentOfficialAsrTransport,
  TencentAsrTransportError,
  createTencentAsrSdkFactory,
  createTencentAsrRegistryFromEnv,
  createTencentAsrRuntimeConfigFromEnv,
  type TencentOfficialSdkClient,
} from '../../backend/src/modules/asr/tencent-asr-runtime.js';
import { ProductionS3CompatibleUploadStorage } from '../../backend/src/modules/storage/s3-compatible-storage.js';
import { createAsrWorkerRegistryFromEnv } from '../../backend/src/workers/asr.worker.entry.js';
import { createServerAsrRegistryFromEnv } from '../../backend/src/server.js';
import { createDefaultScreenTextAdapterRegistry } from '../../backend/src/modules/screen-text/screen-text.adapter-registry.js';
import { resolveRegisteredEngine, runRegisteredProbe } from '../../backend/src/modules/system-control/system-control.engine-registry.js';
import type { AsrAdapterInput } from '../../backend/src/modules/asr/asr-adapter.js';

const baseEnv = {
  NODE_ENV: 'test',
  QIMAO_TENCENT_ASR_ENABLED: 'true',
  QIMAO_TENCENT_ASR_REGION: 'ap-guangzhou',
  QIMAO_TENCENT_ASR_SECRET_ID: 'test-secret-id',
  QIMAO_TENCENT_ASR_SECRET_KEY: 'test-secret-key',
  QIMAO_TENCENT_ASR_OBJECT_URL_TTL_SECONDS: '600',
  QIMAO_TENCENT_ASR_PRICE_CNY_PER_HOUR: '1.75',
};

const deps = () => ({
  sdkFactory: { create: vi.fn(() => ({
    CreateRecTask: vi.fn(async () => ({ Response: { Data: { TaskId: 'task-1' } } })),
    DescribeTaskStatus: vi.fn(async () => ({ Response: { Data: { Status: 2, Result: 'ok', AudioDuration: 1 } } })),
  })) },
  objectUrlSigner: { createGetUrl: vi.fn(async () => 'https://cos.example.invalid/object?signature=redacted') },
});

describe('Tencent ASR runtime assembly', () => {
  it('默认关闭；生产关闭或半配置均 fail-closed，不回退 fake', () => {
    expect(createTencentAsrRuntimeConfigFromEnv({ NODE_ENV: 'test' }).enabled).toBe(false);
    expect(() => createTencentAsrRuntimeConfigFromEnv({
      ...baseEnv,
      QIMAO_TENCENT_ASR_SECRET_KEY: '',
    })).toThrowError(new TencentAsrConfigurationError('CONFIG_INCOMPLETE'));
    expect(() => createTencentAsrRuntimeConfigFromEnv({
      NODE_ENV: 'production',
      QIMAO_TENCENT_ASR_ENABLED: 'true',
    })).toThrowError(new TencentAsrConfigurationError('CONFIG_INCOMPLETE'));
    expect(() => createTencentAsrRegistryFromEnv({ env: { NODE_ENV: 'production' }, ...deps() }))
      .toThrowError(new TencentAsrConfigurationError('DISABLED_IN_PRODUCTION'));
  });

  it('生产显式开启时只登记腾讯适配器，并把 AI Secret 只交给注入的 SDK 工厂', () => {
    const injected = deps();
    const registry = createTencentAsrRegistryFromEnv({ env: { ...baseEnv, NODE_ENV: 'production' }, ...injected });
    expect(registry.descriptors()).toHaveLength(1);
    expect(registry.defaultDescriptor.provider).toBe('tencent_cloud');
    expect(registry.defaultDescriptor.adapter).toBe('tencent_cloud_recorded_v1');
    expect(registry.defaultDescriptor.billing).toMatchObject({
      billingClass: 'metered', currency: 'CNY', billingUnit: 'minute',
      maximumQuantity: '300', maximumAmount: '8.750000',
    });
    expect(injected.sdkFactory.create).toHaveBeenCalledWith({
      region: 'ap-guangzhou',
      secretReference: { secretId: 'test-secret-id', secretKey: 'test-secret-key' },
      });
  });

  it('启用腾讯 ASR 时单价必须显式为正数，报价按五小时封顶且保留六位小数', () => {
    const config = createTencentAsrRuntimeConfigFromEnv(baseEnv);
    expect(config.priceCnyPerHour).toBe(1.75);
    for (const value of [undefined, '', '0', '-1', 'not-a-price']) {
      const env = { ...baseEnv, ...(value === undefined ? { QIMAO_TENCENT_ASR_PRICE_CNY_PER_HOUR: undefined } : { QIMAO_TENCENT_ASR_PRICE_CNY_PER_HOUR: value }) };
      expect(() => createTencentAsrRuntimeConfigFromEnv(env)).toThrow();
    }
  });

  it('控制面只接受实际登记的腾讯 adapter key，连接测试只读描述且不调用供应商', async () => {
    const injected = deps();
    const providerCalls = { create: 0, describe: 0 };
    injected.sdkFactory.create = vi.fn(() => ({
      CreateRecTask: vi.fn(async () => { providerCalls.create += 1; return { Response: { Data: { TaskId: '1' } } }; }),
      DescribeTaskStatus: vi.fn(async () => { providerCalls.describe += 1; return { Response: { Data: { Status: 2 } } }; }),
    }));
    const registry = createTencentAsrRegistryFromEnv({ env: baseEnv, ...injected });
    const engine = resolveRegisteredEngine(
      { asr: registry, screenText: createDefaultScreenTextAdapterRegistry() },
      'asr', 'cloud_api', 'tencent_cloud_recorded_v1',
    );
    expect(engine.adapterKey).toBe('tencent_cloud_recorded_v1');
    expect(engine.descriptor.billing).toMatchObject({ maximumQuantity: '300', maximumAmount: '8.750000' });
    await expect(runRegisteredProbe(engine, { testRunId: 'control-probe-1' })).resolves.toMatchObject({ status: 'succeeded' });
    expect(providerCalls).toEqual({ create: 0, describe: 0 });
    expect(() => resolveRegisteredEngine(
      { asr: registry, screenText: createDefaultScreenTextAdapterRegistry() },
      'asr', 'cloud_api', 'tencent_cloud_not_registered',
    )).toThrow();
  });

  it('Worker registry 使用同一小时单价计算完成用量，不回到零金额', async () => {
    const injected = deps();
    injected.sdkFactory.create = vi.fn(() => ({
      CreateRecTask: vi.fn(async () => ({ Response: { Data: { TaskId: '42' } } })),
      DescribeTaskStatus: vi.fn(async () => ({ Response: { Data: { Status: 2, Result: 'ok', AudioDuration: 7_200 } } })),
    }));
    const registry = createTencentAsrRegistryFromEnv({ env: baseEnv, ...injected });
    const adapter = registry.get('tencent_cloud_recorded_v1');
    expect(adapter).toBeDefined();
    const value: AsrAdapterInput = {
      jobId: 'billing-job', episodeNumber: 1,
      asset: {
        assetId: 'billing-asset', objectKey: 'projects/p/assets/a.mp4',
        originalFilename: 'a.mp4', mediaKind: 'video', sizeBytes: 1,
        checksum: { algorithm: 'sha256', value: 'a'.repeat(64) },
      },
      attemptNumber: 1, providerRequestId: null, retryOfBatchId: null, hasPreviousResult: false,
      hotwords: { words: [], summary: {
        projectionVersion: 'test', digest: 'b'.repeat(64), termCount: 0,
        aliasCount: 0, filteredCount: 0, truncatedCount: 0,
      } },
    };
    const outcome = await adapter!.execute(value);
    expect(outcome).toMatchObject({
      kind: 'completed',
      usage: { billingQuantity: 120, estimatedAmount: '3.500000', finalAmount: '3.500000', reconciliationStatus: 'final' },
    });
  });

  it('官方 SDK callback 与 Promise 两种调用方式都归一化为同一 transport', async () => {
    let sdkTaskId: unknown;
    const client: TencentOfficialSdkClient = {
      CreateRecTask: (_request, callback) => { callback?.(null, { Data: { TaskId: 11 }, RequestId: 'request-1' }); },
      DescribeTaskStatus: async (request) => { sdkTaskId = request.TaskId; return { Data: { Status: 2, AudioDuration: 3 }, RequestId: 'request-2' }; },
    };
    const transport = new TencentOfficialAsrTransport(client);
    await expect(transport.CreateRecTask({ EngineModelType: '16k_zh', ChannelNum: 1, ResTextFormat: 2, SourceType: 0, Url: 'https://cos.example.invalid/object' }))
      .resolves.toMatchObject({ Response: { Data: { TaskId: 11 }, RequestId: 'request-1' } });
    await expect(transport.DescribeTaskStatus({ TaskId: 11 }))
      .resolves.toMatchObject({ Response: { Data: { Status: 2, AudioDuration: 3 } } });
    expect(sdkTaskId).toBe(11);
    await transport.DescribeTaskStatus({ TaskId: '12' });
    expect(sdkTaskId).toBe(12);
    await expect(transport.DescribeTaskStatus({ TaskId: '0' }))
      .rejects.toMatchObject({ code: 'unknown' });
    expect(sdkTaskId).toBe(12);
    await expect(transport.DescribeTaskStatus({ TaskId: '9007199254740992' }))
      .rejects.toMatchObject({ code: 'unknown' });
    expect(sdkTaskId).toBe(12);
  });

  it('SDK 鉴权、拒绝、超时和未知异常只归类为稳定 transport code', async () => {
    const cases: Array<{ error: Record<string, unknown>; code: TencentAsrTransportError['code'] }> = [
      { error: { code: 'AuthFailure.SecretId' }, code: 'unauthorized' },
      { error: { statusCode: 400 }, code: 'rejected' },
      { error: { code: 'ETIMEDOUT' }, code: 'timeout' },
      { error: { message: 'secret payload' }, code: 'unknown' },
    ];
    for (const item of cases) {
      const client: TencentOfficialSdkClient = {
        CreateRecTask: async () => { throw item.error; },
        DescribeTaskStatus: async () => ({ Data: { Status: 2 } }),
      };
      await expect(new TencentOfficialAsrTransport(client).CreateRecTask({
        EngineModelType: '16k_zh', ChannelNum: 1, ResTextFormat: 2, SourceType: 0, Url: 'https://cos.example.invalid/object',
      })).rejects.toMatchObject({ code: item.code });
    }
  });

  it('非法开关值只返回稳定配置错误，不泄露环境原值', () => {
    expect(() => createTencentAsrRuntimeConfigFromEnv({
      NODE_ENV: 'test', QIMAO_TENCENT_ASR_ENABLED: 'yes-secret-value',
    })).toThrowError('TENCENT_ASR_CONFIG_INVALID');
  });

  it('官方 SDK 缺失时启动候选 fail-closed，不把 require 原文或 Secret 带入错误', () => {
    expect(() => createTencentAsrSdkFactory('__qimao_missing_tencent_asr_sdk__').create({
      region: 'ap-guangzhou',
      secretReference: { secretId: 'secret-id', secretKey: 'secret-key' },
    })).toThrowError('TENCENT_ASR_SDK_UNAVAILABLE');
  });

  it('本地官方 ASR SDK 包可构造方法形客户端（仅构造，不发网络请求）', () => {
    const client = createTencentAsrSdkFactory().create({
      region: 'ap-guangzhou',
      secretReference: { secretId: 'test-secret-id', secretKey: 'test-secret-key' },
    });
    expect(typeof client.CreateRecTask).toBe('function');
    expect(typeof client.DescribeTaskStatus).toBe('function');
  });

  it('Production S3 signer 只为同一 objectKey 签 HTTPS GET，TTL 上限为 600 秒', async () => {
    const calls: Array<{ key: string; ttl: number }> = [];
    const storage = new ProductionS3CompatibleUploadStorage({
      endpoint: 'https://cos.ap-nanjing.myqcloud.com',
      bucket: 'milaidi-upload-1310313248',
      region: 'ap-nanjing',
      forcePathStyle: false,
      provider: 'tencent-cos',
      addressingStyle: 'virtual-hosted',
      accessKeyId: 'test-access',
      secretAccessKey: 'test-secret',
      presignTtlSeconds: 900,
      uploadMode: 'browser_direct',
    }, {
      presignGet: async (command, ttl) => {
        const input = (command as unknown as { input: { Key: string } }).input;
        calls.push({ key: input.Key, ttl });
        return 'https://milaidi-upload-1310313248.cos.ap-nanjing.myqcloud.com/projects/p/asset.mp4?X-Amz-Signature=opaque';
      },
    });
    const url = await storage.createGetUrl({ assetId: 'asset-1', objectKey: 'projects/p/asset.mp4', expiresInSeconds: 900 });
    expect(new URL(url).hostname).toBe('milaidi-upload-1310313248.cos.ap-nanjing.myqcloud.com');
    expect(calls).toEqual([{ key: 'projects/p/asset.mp4', ttl: 600 }]);
    await expect(storage.createGetUrl({ assetId: 'asset-1', objectKey: '', expiresInSeconds: 60 })).rejects.toThrow();
  });

  it('worker 与 server 控制面仅在显式开启时装配同一真实 registry，禁用保持现有 fake/可启动行为', () => {
    const disabled = { NODE_ENV: 'test' };
    expect(createAsrWorkerRegistryFromEnv({ env: disabled }).defaultDescriptor.provider).toBe('fake');
    expect(createServerAsrRegistryFromEnv({ env: disabled })).toBeNull();
    expect(() => createAsrWorkerRegistryFromEnv({ env: { NODE_ENV: 'production' } }))
      .toThrowError(new TencentAsrConfigurationError('DISABLED_IN_PRODUCTION'));
    const signer = deps().objectUrlSigner;
    const sdkFactory = deps().sdkFactory;
    const storage = new ProductionS3CompatibleUploadStorage({
      endpoint: 'https://cos.ap-nanjing.myqcloud.com', bucket: 'milaidi-upload-1310313248', region: 'ap-nanjing',
      forcePathStyle: false, provider: 'tencent-cos', addressingStyle: 'virtual-hosted',
      accessKeyId: 'test-access', secretAccessKey: 'test-secret', presignTtlSeconds: 600, uploadMode: 'browser_direct',
    }, { presignGet: async () => 'https://milaidi-upload-1310313248.cos.ap-nanjing.myqcloud.com/object?sig=opaque' });
    const enabledEnv = { ...baseEnv, NODE_ENV: 'production', QIMAO_UPLOAD_STORAGE_KIND: 's3', QIMAO_S3_PROVIDER: 'tencent-cos' };
    const workerRegistry = createAsrWorkerRegistryFromEnv({ env: enabledEnv, sdkFactory, objectUrlSigner: signer });
    expect(workerRegistry.defaultDescriptor.provider).toBe('tencent_cloud');
    expect(workerRegistry.defaultDescriptor.billing).toMatchObject({ maximumQuantity: '300', maximumAmount: '8.750000' });
    expect(createServerAsrRegistryFromEnv({ env: enabledEnv, uploadStorage: storage, sdkFactory })?.defaultDescriptor.provider).toBe('tencent_cloud');
    expect(() => createServerAsrRegistryFromEnv({ env: enabledEnv, sdkFactory })).toThrowError('TENCENT_ASR_CONFIG_INVALID');
  });
});
