import { describe, expect, it, vi } from 'vitest';

import { createServerScreenTextRegistryFromEnv } from '../../backend/src/server.js';
import {
  createLocalOcrAdapterRegistryFromEnv,
  createLocalOcrRuntimeConfigFromEnv,
  localOcrTimeoutsFor,
  LocalOcrConfigurationError,
  LocalOcrLoopbackTransport,
  localOpenVinoPpOcrDescriptor,
  localOnnxPpOcrDescriptor,
} from '../../backend/src/modules/screen-text/local-ocr-runtime.js';
import { ScreenTextLocalOcrTransportError } from '../../backend/src/modules/screen-text/screen-text.local-ocr-sidecar.js';

const digest = 'a'.repeat(64);
const enabled = (extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: digest,
  QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true',
  QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT: 'http://127.0.0.1:19001/ocr',
  QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS: '1200',
  QIMAO_LOCAL_OCR_ONNX_ENABLED: 'true',
  QIMAO_LOCAL_OCR_ONNX_ENDPOINT: 'http://localhost:19002/ocr',
  QIMAO_LOCAL_OCR_ONNX_TIMEOUT_MS: '1500',
  ...extra,
});

const request = {
  protocolVersion: 'screen_text_local_ocr_v1' as const,
  attemptId: '00000000-0000-4000-8000-000000000001',
  requestId: 'openvino:job:1',
  media: { inputKind: 'server_extracted_frames' as const, contentType: 'video/mp4', sizeBytes: 5_000_000_000, checksumAlgorithm: 'sha256' as const, checksumValue: digest, videoDurationMs: 1_000, maxFrameCount: 600, maxPixels: 120_000_000 },
  frames: [{ frameIndex: 0, capturedAtMs: 100, width: 640, height: 360, contentType: 'image/png', bytes: Uint8Array.from([1, 2, 3]) }],
  language: 'zh-CN', modelVersion: `PP-OCRv6-Small@sha256:${digest}`,
};

describe('本地 PP-OCRv6 Small 主备 runtime', () => {
  it('默认关闭，半配置、缺模型摘要或非 loopback 稳定 fail-closed', () => {
    expect(createLocalOcrAdapterRegistryFromEnv({ env: { NODE_ENV: 'test' } })).toBeNull();
    expect(() => createLocalOcrRuntimeConfigFromEnv({ QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true' })).toThrowError(new LocalOcrConfigurationError('CONFIG_INCOMPLETE'));
    expect(() => createLocalOcrRuntimeConfigFromEnv(enabled({ QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: undefined, QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT: 'https://example.invalid/ocr' }))).toThrowError(new LocalOcrConfigurationError('CONFIG_INCOMPLETE'));
    expect(() => createLocalOcrRuntimeConfigFromEnv(enabled({ QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT: 'https://example.invalid/ocr' }))).toThrowError(new LocalOcrConfigurationError('CONFIG_INVALID'));
    expect(() => createLocalOcrRuntimeConfigFromEnv(enabled({ QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: 'not-a-digest' }))).toThrowError(new LocalOcrConfigurationError('CONFIG_INVALID'));
  });

  it('HTTP 请求 timeout 默认 60 秒，允许 120 秒但拒绝越界配置', () => {
    const withoutTimeout = enabled();
    delete withoutTimeout.QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS;
    delete withoutTimeout.QIMAO_LOCAL_OCR_ONNX_TIMEOUT_MS;
    const defaults = createLocalOcrRuntimeConfigFromEnv(withoutTimeout);
    expect(defaults.openvino?.timeoutMs).toBe(60_000);
    expect(defaults.onnxruntime?.timeoutMs).toBe(60_000);
    expect(createLocalOcrRuntimeConfigFromEnv(enabled({
      QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS: '120000',
      QIMAO_LOCAL_OCR_ONNX_TIMEOUT_MS: '120000',
    }))).toMatchObject({ openvino: { timeoutMs: 120_000 }, onnxruntime: { timeoutMs: 120_000 } });
    expect(() => createLocalOcrRuntimeConfigFromEnv(enabled({ QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS: '120001' })))
      .toThrowError(new LocalOcrConfigurationError('CONFIG_INVALID'));
  });

  it('固定三层预算顺序为 engine=T、HTTP=T+grace、adapter=T+2*grace', () => {
    expect(localOcrTimeoutsFor(60_000)).toEqual({ engineTimeoutMs: 60_000, httpTimeoutMs: 61_000, adapterTimeoutMs: 62_000 });
    expect(localOcrTimeoutsFor(120_000).adapterTimeoutMs).toBe(122_000);
  });

  it('主备各自 loopback 配置，严格复用同一模型摘要/协议，fallback 不在 registry 内发生', async () => {
    const created: string[] = [];
    const registry = createLocalOcrAdapterRegistryFromEnv({
      env: enabled(),
      transportFactory: (config) => {
        created.push(`${config.provider}:${config.endpoint}:${config.timeoutMs}`);
        return { invoke: async (wireRequest) => ({
          protocolVersion: request.protocolVersion,
          attemptId: request.attemptId,
          requestId: wireRequest.requestId,
          modelVersion: request.modelVersion,
          language: request.language,
          frameCount: 1,
          boxes: [],
        }) } as never;
      },
    })!;
    expect(registry.descriptors()).toHaveLength(2);
    const [primary, backup] = registry.descriptors();
    expect(primary.model).toBe(backup.model);
    expect(primary.inputVersion).toBe(backup.inputVersion);
    expect(primary.outputVersion).toBe(backup.outputVersion);
    expect(primary.deployment).toBe('loopback_http');
    expect(registry.defaultDescriptor.adapter).toBe('screen_text_openvino_ppocrv6_small');
    expect(created).toEqual([
      'openvino:http://127.0.0.1:19001/ocr:1200',
      'onnxruntime:http://localhost:19002/ocr:1500',
    ]);
    const adapter = registry.get(primary.adapter)!;
    const outcome = await adapter.execute({
      batchId: '00000000-0000-4000-8000-000000000002', jobId: '00000000-0000-4000-8000-000000000003',
      attemptId: request.attemptId, episodeNumber: 1, attemptNumber: 1,
      asset: { assetId: '00000000-0000-4000-8000-000000000004', objectKey: 'private/video.mp4', originalFilename: 'video.mp4', sizeBytes: request.media.sizeBytes, checksumAlgorithm: 'sha256', checksumValue: digest },
      media: { ...request.media, videoDurationMs: 1_000, frameCount: 1, pixelCount: 230_400, maxFrameCount: 600, maxPixels: 120_000_000, frames: request.frames },
      termProjectionDigest: digest, termEntries: [], frameStrategyVersion: 'v1', dedupeStrategyVersion: 'v1',
    });
    expect(outcome.kind).toBe('completed');
    expect(outcome.receipt).toBe('submitted');
  });

  it('loopback transport只发送一次、映射拒绝/鉴权/取消/未知为稳定 TransportError', async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.method).toBe('POST');
      expect(String(init.body)).toContain('bytesBase64');
      return new Response(JSON.stringify({ protocolVersion: 'screen_text_local_ocr_v1' }), { status: 200 });
    });
    const transport = new LocalOcrLoopbackTransport({ provider: 'openvino', endpoint: 'http://127.0.0.1:19001/ocr', timeoutMs: 1000, modelDigest: digest }, { fetchImpl });
    await transport.invoke(request, { signal: new AbortController().signal, deadlineAt: Date.now() + 1_000 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    for (const [status, body, code] of [
      [401, '', 'unauthorized'],
      [400, '', 'external_not_accepted'],
      [500, JSON.stringify({ error: { code: 'LOCAL_OCR_ENGINE_TIMEOUT', message: '本地 OCR 请求未完成。' } }), 'external_unknown'],
      [504, JSON.stringify({ error: { code: 'LOCAL_OCR_ENGINE_TIMEOUT', message: '本地 OCR 请求未完成。' } }), 'external_not_accepted'],
      [504, JSON.stringify({ error: { code: 'LOCAL_OCR_WRONG_TIMEOUT', message: '本地 OCR 请求未完成。' } }), 'external_unknown'],
      [504, '{bad-json', 'external_unknown'],
    ] as const) {
      const current = new LocalOcrLoopbackTransport({ provider: 'openvino', endpoint: 'http://127.0.0.1:19001/ocr', timeoutMs: 1000, modelDigest: digest }, { fetchImpl: vi.fn(async () => new Response(body, { status })) });
      await expect(current.invoke(request, { signal: new AbortController().signal, deadlineAt: Date.now() + 1_000 })).rejects.toMatchObject({ kind: code === 'unauthorized' ? 'unauthorized' : code === 'external_not_accepted' ? 'external_not_accepted' : 'external_unknown' });
    }
    const deterministicTimeout = new LocalOcrLoopbackTransport({ provider: 'openvino', endpoint: 'http://127.0.0.1:19001/ocr', timeoutMs: 1000, modelDigest: digest }, {
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({ error: { code: 'LOCAL_OCR_ENGINE_TIMEOUT', message: '本地 OCR 请求未完成。' } }), { status: 504 })),
    });
    await expect(deterministicTimeout.invoke(request, { signal: new AbortController().signal, deadlineAt: Date.now() + 1_000 }))
      .rejects.toMatchObject({ kind: 'external_not_accepted', code: 'LOCAL_OCR_ENGINE_TIMEOUT', retryable: true, externalSideEffectPossible: false });
    const timeoutTransport = new LocalOcrLoopbackTransport({ provider: 'openvino', endpoint: 'http://127.0.0.1:19001/ocr', timeoutMs: 1000, modelDigest: digest }, {
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({ error: { code: 'LOCAL_OCR_ENGINE_TIMEOUT', message: '本地 OCR 请求未完成。', extra: true } }), { status: 504 })),
    });
    await expect(timeoutTransport.invoke(request, { signal: new AbortController().signal, deadlineAt: Date.now() + 1_000 }))
      .rejects.toMatchObject({ kind: 'external_unknown', code: 'LOCAL_OCR_UNKNOWN' });
    const aborted = new AbortController();
    aborted.abort();
    await expect(transport.invoke(request, { signal: aborted.signal, deadlineAt: Date.now() + 1_000 })).rejects.toBeInstanceOf(ScreenTextLocalOcrTransportError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('历史 Tencent OCR 环境不会进入当前活动 registry', () => {
    expect(createServerScreenTextRegistryFromEnv({ env: { NODE_ENV: 'test', QIMAO_TENCENT_OCR_ENABLED: 'true', QIMAO_TENCENT_OCR_REGION: 'ap-nanjing' } })).toBeNull();
    expect(localOpenVinoPpOcrDescriptor.model).toBe(localOnnxPpOcrDescriptor.model);
  });
});
