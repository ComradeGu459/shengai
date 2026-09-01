import { createHash, randomUUID } from 'node:crypto';
import { inflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import {
  ScreenTextLocalOcrSidecarAdapter,
  ZeroNetworkLocalOcrSidecarTransport,
} from '../../backend/src/modules/screen-text/screen-text.local-ocr-sidecar.js';
import type {
  ScreenTextLocalOcrFrame,
  ScreenTextLocalOcrMedia,
  ScreenTextLocalOcrSidecarTransport,
} from '../../backend/src/modules/screen-text/screen-text.local-ocr-sidecar.js';
import { createDefaultScreenTextAdapterRegistry } from '../../backend/src/modules/screen-text/screen-text.adapter-registry.js';
import { createLocalOcrAdapterRegistryFromEnv } from '../../backend/src/modules/screen-text/local-ocr-runtime.js';
import { resolveRegisteredEngine, runRegisteredProbe } from '../../backend/src/modules/system-control/system-control.engine-registry.js';
import { createSystemControlConnectionTestRegistriesFromEnv } from '../../backend/src/workers/system-control.connection-test.worker.entry.js';
import type { ScreenTextAdapterInput } from '../../backend/src/modules/screen-text/screen-text.adapter.js';
import { ScreenTextWorker } from '../../backend/src/workers/screen-text.worker.js';
import { InMemoryScreenTextEvidenceStorage } from '../../backend/src/modules/screen-text/screen-text.evidence-storage.js';
import { createScreenTextRemoteMediaSource, ScreenTextMediaError } from '../../backend/src/modules/screen-text/screen-text-media.js';
import type { ScreenTextWorkerClaim } from '../../backend/src/modules/screen-text/screen-text.worker.repository.js';

const mediaBytes = new TextEncoder().encode('anonymous-local-ocr-video-bytes');
const frameBytes = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
));
const checksum = createHash('sha256').update(mediaBytes).digest('hex');

const frame = (overrides: Partial<ScreenTextLocalOcrFrame> = {}): ScreenTextLocalOcrFrame => ({
  frameIndex: 0, capturedAtMs: 1200, width: 640, height: 360, contentType: 'image/png', bytes: frameBytes,
  ...overrides,
});

const input = (overrides: Partial<ScreenTextAdapterInput> = {}): ScreenTextAdapterInput => ({
  batchId: randomUUID(), jobId: randomUUID(), episodeNumber: 1, attemptNumber: 1, attemptId: randomUUID(),
  asset: {
    assetId: randomUUID(), objectKey: 'projects/private/assets/private.mp4', originalFilename: 'episode-1.mp4',
    sizeBytes: mediaBytes.byteLength, checksumAlgorithm: 'sha256', checksumValue: checksum,
  },
  media: {
    inputKind: 'server_extracted_frames',
    contentType: 'video/mp4', sizeBytes: mediaBytes.byteLength, checksumAlgorithm: 'sha256', checksumValue: checksum,
    videoDurationMs: 8_000, frameCount: 1, pixelCount: 640 * 360, maxFrameCount: 600, maxPixels: 120_000_000, sourceBytes: mediaBytes,
    frames: [frame()],
  },
  termProjectionDigest: 'a'.repeat(64), termEntries: [],
  frameStrategyVersion: 'frame-v1', dedupeStrategyVersion: 'dedupe-v1',
  ...overrides,
});

const responseFor = (request: any, boxes: any[] = []) => ({
  protocolVersion: 'screen_text_local_ocr_v1', attemptId: request.attemptId, requestId: request.requestId,
  modelVersion: request.modelVersion, language: request.language, frameCount: request.frames.length, boxes,
});

const inputLimits = () => ({ maxInputBytes: 20_000_000, maxFrames: 600, maxPixels: 120_000_000 });

describe('ScreenText local OCR sidecar boundary', () => {
  it('uses stable attempt/request identity and never sends objectKey, URL, headers or Secret to the fake transport', async () => {
    const transport = new ZeroNetworkLocalOcrSidecarTransport();
    const value = input();
    const result = await new ScreenTextLocalOcrSidecarAdapter(transport).execute(value);

    expect(result.kind).toBe('completed');
    expect(result.providerRequestId).toBe(`local-ocr-sidecar:${value.attemptId}`);
    expect(result.candidates).toHaveLength(1);
    expect(transport.calls).toBe(1);
    expect(transport.networkCalls).toBe(0);
    expect(transport.lastRequest).toMatchObject({ attemptId: value.attemptId, requestId: result.providerRequestId });
    expect(transport.lastRequest).not.toHaveProperty('objectKey');
    expect(transport.lastRequest).not.toHaveProperty('url');
    expect(transport.lastRequest).not.toHaveProperty('headers');
    expect(JSON.stringify(transport.lastRequest)).not.toContain('private.mp4');
  });

  it('在服务端媒体缺失、摘要/大小/类型或帧/像素上限不满足时阻断且不调用 transport', async () => {
    const cases: Array<Partial<ScreenTextAdapterInput>> = [
      { media: undefined },
      { media: { ...input().media!, checksumValue: '0'.repeat(64) } },
      { media: { ...input().media!, sizeBytes: mediaBytes.byteLength + 1 } },
      { media: { ...input().media!, contentType: 'application/octet-stream' } },
      { media: { ...input().media!, maxFrameCount: 601 } },
      { media: { ...input().media!, maxPixels: 120_000_001 } },
    ];
    for (const item of cases) {
      const transport = new ZeroNetworkLocalOcrSidecarTransport();
      const result = await new ScreenTextLocalOcrSidecarAdapter(transport).execute(input(item));
      expect(result.kind).toBe('failed');
      expect(result.effectClass).toBe('external_not_accepted');
      expect(transport.calls).toBe(0);
    }
  });

  it('映射确定未受理、401/403、进程退出与 timeout/unknown，只有前者允许 09A 安全前进', async () => {
    for (const [mode, expectedKind, expectedEffect, canAdvance] of [
      ['external_not_accepted', 'failed', 'external_not_accepted', true],
      ['process_exit', 'failed', 'external_not_accepted', true],
      ['unauthorized', 'failed', 'unauthorized', false],
      ['timeout', 'reconciliation_required', 'external_unknown', false],
      ['unknown', 'reconciliation_required', 'external_unknown', false],
    ] as const) {
      const transport = new ZeroNetworkLocalOcrSidecarTransport(mode);
      const result = await new ScreenTextLocalOcrSidecarAdapter(transport).execute(input());
      expect(result.kind).toBe(expectedKind);
      expect(result.effectClass).toBe(expectedEffect);
      expect(result.effectClass === 'external_not_accepted' && result.kind === 'failed'
        ? !result.externalSideEffectPossible : false).toBe(canAdvance);
    }
  });

  it('AbortSignal、并发上限和无 Attempt 身份不会生成可重试的第二副作用', async () => {
    const transport = new ZeroNetworkLocalOcrSidecarTransport();
    const controller = new AbortController(); controller.abort();
    const aborted = await new ScreenTextLocalOcrSidecarAdapter(transport).execute(input({ signal: controller.signal }));
    expect(aborted).toMatchObject({ kind: 'failed', effectClass: 'cancelled' });
    expect(transport.calls).toBe(0);

    const missingAttempt = await new ScreenTextLocalOcrSidecarAdapter(transport).execute(input({ attemptId: undefined }));
    expect(missingAttempt).toMatchObject({ kind: 'failed', effectClass: 'external_not_accepted' });
    expect(transport.calls).toBe(0);

    const limited = new ZeroNetworkLocalOcrSidecarTransport('timeout', 1);
    const adapter = new ScreenTextLocalOcrSidecarAdapter(limited, { maxInputBytes: 20_000_000, maxFrames: 600, maxPixels: 120_000_000, maxConcurrent: 1, deadlineMs: 25 });
    const first = adapter.execute(input());
    await new Promise((resolve) => setTimeout(resolve, 1));
    const second = await adapter.execute(input());
    expect(second).toMatchObject({ kind: 'failed', effectClass: 'external_not_accepted' });
    expect((await first).kind).toBe('reconciliation_required');
    expect(limited.calls).toBe(1);
  });

  it('在 transport 前后执行严格嵌套 schema 与几何/时间校验，非法响应只进入 reconciliation', async () => {
    const malformed = (mutate: (response: Record<string, unknown>, request: any) => void): ScreenTextLocalOcrSidecarTransport => ({
      invoke: async (request) => {
        const response: Record<string, unknown> = {
          protocolVersion: 'screen_text_local_ocr_v1', attemptId: request.attemptId, requestId: request.requestId,
          modelVersion: request.modelVersion, language: request.language, frameCount: request.frames.length,
          boxes: [{ frameIndex: 0, text: 'ok', confidence: 0.9, language: request.language, x: 10, y: 10, width: 20, height: 20, startMs: 100, endMs: 200 }],
        };
        mutate(response, request);
        return response as never;
      },
    });
    for (const transport of [
      malformed((response) => (response.boxes as Array<Record<string, unknown>>)[0]!.confidence = 1.1),
      malformed((response) => (response.boxes as Array<Record<string, unknown>>)[0]!.extra = 'forbidden'),
      malformed((response) => (response.boxes as Array<Record<string, unknown>>)[0]!.x = 630),
      malformed((response) => (response.boxes as Array<Record<string, unknown>>)[0]!.endMs = 50),
    ]) {
      const result = await new ScreenTextLocalOcrSidecarAdapter(transport).execute(input());
      expect(result).toMatchObject({ kind: 'reconciliation_required', effectClass: 'external_unknown' });
      expect(result).not.toHaveProperty('candidates');
    }
    const invalidRequest = await new ScreenTextLocalOcrSidecarAdapter(new ZeroNetworkLocalOcrSidecarTransport()).execute(input({
      media: { ...input().media!, frames: [{ ...frame(), width: 0 }] },
    }));
    expect(invalidRequest).toMatchObject({ kind: 'failed', effectClass: 'external_not_accepted' });
  });

  it('Adapter 自有 timeout/Abort 不依赖 transport，never-resolve 与迟到 resolve 不挂死或改写终态', async () => {
    let calls = 0;
    const stubborn: ScreenTextLocalOcrSidecarTransport = {
      invoke: async (request) => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 40));
        return {
          protocolVersion: 'screen_text_local_ocr_v1', attemptId: request.attemptId, requestId: request.requestId,
          modelVersion: request.modelVersion, language: request.language, frameCount: request.frames.length,
          boxes: [],
        };
      },
    };
    const adapter = new ScreenTextLocalOcrSidecarAdapter(stubborn, { maxInputBytes: 20_000_000, maxFrames: 600, maxPixels: 120_000_000, maxConcurrent: 1, deadlineMs: 8 });
    const first = await adapter.execute(input());
    expect(first).toMatchObject({ kind: 'reconciliation_required', effectClass: 'external_unknown' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(first).toMatchObject({ kind: 'reconciliation_required', effectClass: 'external_unknown' });
    expect(calls).toBe(1);
    const never: ScreenTextLocalOcrSidecarTransport = { invoke: async () => new Promise<never>(() => undefined) };
    const neverResult = await new ScreenTextLocalOcrSidecarAdapter(never, { maxInputBytes: 20_000_000, maxFrames: 600, maxPixels: 120_000_000, maxConcurrent: 1, deadlineMs: 8 }).execute(input());
    expect(neverResult).toMatchObject({ kind: 'reconciliation_required', effectClass: 'external_unknown' });
  });

  it('底层 invoke 未 settle 时持续占用 Adapter 槽位，迟到 resolve/reject 后才释放，且不改写首个 outcome', async () => {
    let calls = 0;
    let settleFirst: (() => void) | undefined;
    let rejectFirst: (() => void) | undefined;
    const transport: ScreenTextLocalOcrSidecarTransport = {
      invoke: async (request) => {
        calls += 1;
        if (calls === 1) {
          await new Promise<void>((resolve, reject) => { settleFirst = resolve; rejectFirst = reject; });
          return responseFor(request);
        }
        if (calls === 3) {
          await new Promise<void>((resolve, reject) => { settleFirst = resolve; rejectFirst = reject; });
          throw new Error('late transport rejection');
        }
        return responseFor(request);
      },
    };
    const adapter = new ScreenTextLocalOcrSidecarAdapter(transport, { ...inputLimits(), maxConcurrent: 1, deadlineMs: 8 });
    const first = await adapter.execute(input());
    expect(first).toMatchObject({ kind: 'reconciliation_required', effectClass: 'external_unknown' });
    expect(await adapter.execute(input())).toMatchObject({ kind: 'failed', effectClass: 'external_not_accepted' });
    expect(calls).toBe(1);
    settleFirst?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = await adapter.execute(input());
    expect(second.kind).toBe('completed');
    expect(calls).toBe(2);

    const rejected = await adapter.execute(input());
    expect(rejected).toMatchObject({ kind: 'reconciliation_required', effectClass: 'external_unknown' });
    expect(calls).toBe(3);
    rejectFirst?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await adapter.execute(input())).kind).toBe('completed');
    expect(calls).toBe(4);
  });

  it('外部 Abort 只让等待者结束，仍运行的底层 invoke 不释放槽位，迟到结果不覆盖取消终态', async () => {
    let calls = 0;
    let settle: (() => void) | undefined;
    const transport: ScreenTextLocalOcrSidecarTransport = {
      invoke: async (request) => {
        calls += 1;
        if (calls === 1) {
          await new Promise<void>((resolve) => { settle = resolve; });
        }
        return responseFor(request);
      },
    };
    const adapter = new ScreenTextLocalOcrSidecarAdapter(transport, { ...inputLimits(), maxConcurrent: 1, deadlineMs: 100 });
    const controller = new AbortController();
    const firstPromise = adapter.execute(input({ signal: controller.signal }));
    await new Promise((resolve) => setTimeout(resolve, 1));
    controller.abort();
    expect(await firstPromise).toMatchObject({ kind: 'failed', effectClass: 'cancelled' });
    expect(await adapter.execute(input())).toMatchObject({ kind: 'failed', effectClass: 'external_not_accepted' });
    expect(calls).toBe(1);
    settle?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await adapter.execute(input())).kind).toBe('completed');
    expect(calls).toBe(2);
  });

  it('按各帧真实宽度计算位置，且完成结果保留 extractor 的权威视频时长', async () => {
    const frames = [
      frame({ frameIndex: 0, capturedAtMs: 1_000, width: 640, height: 360 }),
      frame({ frameIndex: 1, capturedAtMs: 2_000, width: 640, height: 360 }),
      frame({ frameIndex: 2, capturedAtMs: 3_000, width: 1_920, height: 1_080 }),
      frame({ frameIndex: 3, capturedAtMs: 4_000, width: 3_840, height: 2_160 }),
    ];
    const boxes = [
      { frameIndex: 0, text: '左', confidence: 0.9, language: 'zh-CN', x: 32, y: 10, width: 96, height: 40, startMs: 900, endMs: 1_100 },
      { frameIndex: 1, text: '中', confidence: 0.9, language: 'zh-CN', x: 256, y: 10, width: 128, height: 40, startMs: 1_900, endMs: 2_100 },
      { frameIndex: 2, text: '右', confidence: 0.9, language: 'zh-CN', x: 1_536, y: 10, width: 192, height: 40, startMs: 2_900, endMs: 3_100 },
      { frameIndex: 3, text: '全', confidence: 0.9, language: 'zh-CN', x: 0, y: 0, width: 3_840, height: 2_160, startMs: 3_900, endMs: 4_100 },
    ];
    const transport: ScreenTextLocalOcrSidecarTransport = { invoke: async (request) => responseFor(request, boxes) };
    const result = await new ScreenTextLocalOcrSidecarAdapter(transport).execute(input({
      media: { ...input().media!, videoDurationMs: 9_000, frames, frameCount: frames.length, pixelCount: frames.reduce((sum, item) => sum + item.width * item.height, 0) },
    }));
    expect(result.kind).toBe('completed');
    if (result.kind === 'completed') {
      expect(result.candidates.map((candidate) => candidate.position)).toEqual(['left', 'center', 'right', 'full']);
      expect(result.videoDurationMs).toBe(9_000);
      expect(result.candidates.map((candidate) => candidate.evidence.capturedAtMs)).toEqual([1_000, 2_000, 3_000, 4_000]);
    }
  });

  it('Worker 只经 UploadStorage + 注入 frame extractor 形成真实帧，A/B objectKey 与媒体事实隔离', async () => {
    const sourceA = Uint8Array.from([1, 2, 3, 4]);
    const sourceB = Uint8Array.from([5, 6, 7, 8]);
    const makeClaim = (objectKey: string, source: Uint8Array): ScreenTextWorkerClaim => ({
      projectId: randomUUID(), batchId: randomUUID(), jobId: randomUUID(), episodeNumber: 1, attemptId: randomUUID(), attemptNumber: 1,
      deploymentVersionId: randomUUID(), routingTargetId: randomUUID(), routingTargetPriority: 1, leaseOwner: 'test-worker',
      billingSnapshot: { billingClass: 'unmetered_local', currency: 'CNY', maximumAmount: '0.000000', billingUnit: 'zero_network_call', maximumQuantity: '0' },
      descriptor: createDefaultScreenTextAdapterRegistry().get('screen_text_local_ocr_sidecar_fake')!.descriptor,
      asset: { assetId: randomUUID(), objectKey, originalFilename: 'episode.mp4', sizeBytes: source.byteLength, checksumAlgorithm: 'sha256', checksumValue: createHash('sha256').update(source).digest('hex') },
      termProjectionDigest: 'a'.repeat(64), termEntries: [], frameStrategyVersion: 'frame-v1', dedupeStrategyVersion: 'dedupe-v1',
    });
    const calls: string[] = [];
    const makeStorage = (source: Uint8Array) => ({
      headObject: async (objectKey: string) => { calls.push(objectKey); return { sizeBytes: source.byteLength, checksumValue: createHash('sha256').update(source).digest('hex') }; },
      readObject: async () => Uint8Array.from(source),
    });
    const extractor = { extract: async () => ({ frames: [{ ...frame(), bytes: Uint8Array.from(frameBytes) }], videoDurationMs: 4_321 }) };
    const worker = new ScreenTextWorker({} as never, createDefaultScreenTextAdapterRegistry(), new InMemoryScreenTextEvidenceStorage(), undefined, {
      mediaStorage: makeStorage(sourceA) as never, mediaFrameExtractor: extractor,
    });
    const reader = worker as unknown as { readLocalOcrMedia(claim: ScreenTextWorkerClaim, signal: AbortSignal): Promise<unknown> };
    const mediaA = await reader.readLocalOcrMedia(makeClaim('projects/a/episode.mp4', sourceA), new AbortController().signal) as any;
    expect(mediaA).toMatchObject({ inputKind: 'server_extracted_frames', videoDurationMs: 4_321, frameCount: 1, frames: [{ width: 640, height: 360 }] });
    expect(mediaA.frames[0].bytes).toEqual(frameBytes);
    const workerB = new ScreenTextWorker({} as never, createDefaultScreenTextAdapterRegistry(), new InMemoryScreenTextEvidenceStorage(), undefined, {
      mediaStorage: makeStorage(sourceB) as never, mediaFrameExtractor: extractor,
    });
    const mediaB = await (workerB as unknown as { readLocalOcrMedia(claim: ScreenTextWorkerClaim, signal: AbortSignal): Promise<any> }).readLocalOcrMedia(makeClaim('projects/b/episode.mp4', sourceB), new AbortController().signal);
    expect(mediaB.videoDurationMs).toBe(4_321);
    expect(mediaB.sourceBytes).toEqual(sourceB);
    expect(calls).toEqual(['projects/a/episode.mp4', 'projects/b/episode.mp4']);

    const invalidDurationWorker = new ScreenTextWorker({} as never, createDefaultScreenTextAdapterRegistry(), new InMemoryScreenTextEvidenceStorage(), undefined, {
      mediaStorage: makeStorage(sourceA) as never,
      mediaFrameExtractor: { extract: async () => ({ frames: [frame()], videoDurationMs: 1_000 }) },
    });
    await expect((invalidDurationWorker as unknown as { readLocalOcrMedia(claim: ScreenTextWorkerClaim, signal: AbortSignal): Promise<any> }).readLocalOcrMedia(
      makeClaim('projects/a/invalid-duration.mp4', sourceA), new AbortController().signal,
    )).rejects.toMatchObject({ name: 'ScreenTextMediaError', code: 'FRAME_OUTPUT_INVALID', message: 'SCREEN_TEXT_MEDIA_FRAME_OUTPUT_INVALID' });
  });

  it('Worker 媒体链保留 typed 阶段码，未知异常归一为单一安全码且不泄露原异常', async () => {
    const makeClaim = (objectKey = 'projects/a/episode.mp4'): ScreenTextWorkerClaim => ({
      projectId: randomUUID(), batchId: randomUUID(), jobId: randomUUID(), episodeNumber: 1, attemptId: randomUUID(), attemptNumber: 1,
      deploymentVersionId: randomUUID(), routingTargetId: randomUUID(), routingTargetPriority: 1, leaseOwner: 'test-worker',
      billingSnapshot: { billingClass: 'unmetered_local', currency: 'CNY', maximumAmount: '0.000000', billingUnit: 'zero_network_call', maximumQuantity: '0' },
      descriptor: createDefaultScreenTextAdapterRegistry().get('screen_text_local_ocr_sidecar_fake')!.descriptor,
      asset: { assetId: randomUUID(), objectKey, originalFilename: 'episode.mp4', sizeBytes: mediaBytes.byteLength, checksumAlgorithm: 'sha256', checksumValue: checksum },
      termProjectionDigest: 'a'.repeat(64), termEntries: [], frameStrategyVersion: 'frame-v1', dedupeStrategyVersion: 'dedupe-v1',
    });
    const reader = (worker: ScreenTextWorker) => (worker as unknown as { readLocalOcrMedia(claim: ScreenTextWorkerClaim, signal: AbortSignal, streamed?: boolean): Promise<any> }).readLocalOcrMedia;
    const local = (extract: () => Promise<never>) => new ScreenTextWorker({} as never, createDefaultScreenTextAdapterRegistry(), new InMemoryScreenTextEvidenceStorage(), undefined, {
      mediaStorage: { headObject: async () => ({ sizeBytes: mediaBytes.byteLength, checksumValue: checksum }), readObject: async () => mediaBytes } as never,
      mediaFrameExtractor: { extract },
    });
    const typed = local(async () => { throw new ScreenTextMediaError('EXTRACTOR_TIMEOUT'); });
    await expect(reader(typed).call(typed, makeClaim(), new AbortController().signal)).rejects.toMatchObject({ code: 'EXTRACTOR_TIMEOUT', message: 'SCREEN_TEXT_MEDIA_EXTRACTOR_TIMEOUT' });
    const unknown = local(async () => { throw new Error('secret-provider-payload'); });
    await expect(reader(unknown).call(unknown, makeClaim(), new AbortController().signal)).rejects.toMatchObject({ code: 'UNKNOWN', message: 'SCREEN_TEXT_MEDIA_UNKNOWN' });
    await expect(reader(unknown).call(unknown, makeClaim(), new AbortController().signal)).rejects.not.toThrow('secret-provider-payload');

    const streamedTyped = new ScreenTextWorker({} as never, {} as never, new InMemoryScreenTextEvidenceStorage(), undefined, {
      remoteMediaSource: { read: async () => { throw new ScreenTextMediaError('SOURCE_URL_INVALID'); } },
    });
    await expect(reader(streamedTyped).call(streamedTyped, makeClaim(), new AbortController().signal, true)).rejects.toMatchObject({ code: 'SOURCE_URL_INVALID', message: 'SCREEN_TEXT_MEDIA_SOURCE_URL_INVALID' });
    const streamedUnknown = new ScreenTextWorker({} as never, {} as never, new InMemoryScreenTextEvidenceStorage(), undefined, {
      remoteMediaSource: createScreenTextRemoteMediaSource({
        signer: { createGetUrl: async () => { throw new Error('signed-url-secret'); } },
        extractor: { extract: async () => ({ frames: [frame()], videoDurationMs: 1_000 }) },
      }),
    });
    await expect(reader(streamedUnknown).call(streamedUnknown, makeClaim(), new AbortController().signal, true)).rejects.toMatchObject({ code: 'UNKNOWN', message: 'SCREEN_TEXT_MEDIA_UNKNOWN' });
  });

  it('Worker 只消费 claim 中的不可变抽帧快照，并把间隔/最大帧数传给 extractor', async () => {
    const source = Uint8Array.from([1, 2, 3, 4]);
    const checksumValue = createHash('sha256').update(source).digest('hex');
    const claim: ScreenTextWorkerClaim = {
      projectId: randomUUID(), batchId: randomUUID(), jobId: randomUUID(), episodeNumber: 1,
      attemptId: randomUUID(), attemptNumber: 1, deploymentVersionId: randomUUID(), routingTargetId: randomUUID(),
      routingTargetPriority: 1, leaseOwner: 'worker',
      billingSnapshot: { billingClass: 'unmetered_local', currency: 'CNY', maximumAmount: '0', billingUnit: 'local_frame', maximumQuantity: '0' },
      descriptor: createDefaultScreenTextAdapterRegistry().get('screen_text_local_ocr_sidecar_fake')!.descriptor,
      asset: { assetId: randomUUID(), objectKey: 'episode.mp4', originalFilename: 'episode.mp4', sizeBytes: source.byteLength, checksumAlgorithm: 'sha256', checksumValue },
      termProjectionDigest: 'a'.repeat(64), termEntries: [], frameStrategyVersion: 'frame-v1', dedupeStrategyVersion: 'dedupe-v1',
      runtimeConfig: { preset: 'screen_text_openvino_ppocrv6_small', frameIntervalMs: 2000, maxFramesPerEpisode: 1 },
      runtimeConfigDigest: 'b'.repeat(64),
    };
    let received: { frameIntervalMs: number; maxFrames: number } | undefined;
    const worker = new ScreenTextWorker({} as never, createDefaultScreenTextAdapterRegistry(), new InMemoryScreenTextEvidenceStorage(), undefined, {
      mediaStorage: { headObject: async () => ({ sizeBytes: source.byteLength, checksumValue }), readObject: async () => source } as never,
      mediaFrameExtractor: { extract: async (input) => { received = { frameIntervalMs: input.frameIntervalMs, maxFrames: input.maxFrames }; return { frames: [frame()], videoDurationMs: 2000 }; } },
    });
    const reader = worker as unknown as { readLocalOcrMedia(claim: ScreenTextWorkerClaim, signal: AbortSignal): Promise<ScreenTextLocalOcrMedia> };
    const media = await reader.readLocalOcrMedia(claim, new AbortController().signal);
    expect(received).toEqual({ frameIntervalMs: 2000, maxFrames: 1 });
    expect(media.maxFrameCount).toBe(1);
  });

  it('Registry/connection probe 只确认零网络协议描述，不把 PaddleOCR 模型伪装为 ready', async () => {
    const registry = createDefaultScreenTextAdapterRegistry();
    const engine = resolveRegisteredEngine(
      { asr: { get: () => undefined } as never, screenText: registry },
      'screen_text', 'self_hosted_worker', 'screen_text_local_ocr_sidecar_fake',
    );
    expect(engine.descriptor.model).toBe('sidecar-protocol-only-v1');
    expect(engine.descriptor.provider).toBe('local_ocr_sidecar_zero_network');
    expect((await runRegisteredProbe(engine)).capabilitiesSnapshot.adapterKey).toBe('screen_text_local_ocr_sidecar_fake');
  });

  it('控制面识别真实 OpenVINO/ONNX key，并对 loopback 协议成功/超时/401/unknown 各只调用一次', async () => {
    const envFor = (provider: 'openvino' | 'onnxruntime') => ({
      QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: 'a'.repeat(64),
      ...(provider === 'openvino' ? {
        QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true',
        QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT: 'http://127.0.0.1:3100',
        QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS: '5000',
      } : {
        QIMAO_LOCAL_OCR_ONNX_ENABLED: 'true',
        QIMAO_LOCAL_OCR_ONNX_ENDPOINT: 'http://127.0.0.1:3101',
        QIMAO_LOCAL_OCR_ONNX_TIMEOUT_MS: '5000',
      }),
    });
    for (const provider of ['openvino', 'onnxruntime'] as const) {
      for (const [mode, expected] of [
        ['success', 'succeeded'], ['timeout', 'unknown'], ['unauthorized', 'failed'], ['unknown', 'unknown'],
      ] as const) {
        let transport: ZeroNetworkLocalOcrSidecarTransport | undefined;
        const registry = createLocalOcrAdapterRegistryFromEnv({
          env: envFor(provider),
          transportFactory: () => { transport = new ZeroNetworkLocalOcrSidecarTransport(mode); return transport; },
        });
        const adapterKey = provider === 'openvino' ? 'screen_text_openvino_ppocrv6_small' : 'screen_text_onnxruntime_ppocrv6_small';
        const engine = resolveRegisteredEngine({ asr: { get: () => undefined } as never, screenText: registry! }, 'screen_text', 'self_hosted_worker', adapterKey);
        const result = await runRegisteredProbe(engine, { testRunId: randomUUID() });
        expect(result.status).toBe(expected);
        expect(transport?.calls).toBe(1);
        const wireFrame = transport?.lastRequest?.frames[0];
        expect(wireFrame).toMatchObject({ contentType: 'image/png', width: 320, height: 128 });
        const png = Buffer.from(wireFrame!.bytes);
        expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        let offset = 8;
        let width = 0;
        let height = 0;
        let idat = Buffer.alloc(0);
        let sawIhdr = false;
        let sawIend = false;
        while (offset + 12 <= png.length) {
          const length = png.readUInt32BE(offset);
          const type = png.toString('ascii', offset + 4, offset + 8);
          const dataStart = offset + 8;
          const dataEnd = dataStart + length;
          expect(dataEnd + 4).toBeLessThanOrEqual(png.length);
          if (type === 'IHDR') {
            expect(length).toBe(13);
            width = png.readUInt32BE(dataStart);
            height = png.readUInt32BE(dataStart + 4);
            sawIhdr = true;
          } else if (type === 'IDAT') {
            idat = Buffer.concat([idat, png.subarray(dataStart, dataEnd)]);
          } else if (type === 'IEND') {
            expect(length).toBe(0);
            sawIend = true;
            break;
          }
          offset = dataEnd + 4;
        }
        expect(sawIhdr).toBe(true);
        expect(sawIend).toBe(true);
        expect({ width, height }).toEqual({ width: 320, height: 128 });
        expect(inflateSync(idat).byteLength).toBe((1 + (320 * 4)) * 128);
      }
    }
    expect(() => resolveRegisteredEngine(
      { asr: { get: () => undefined } as never, screenText: createDefaultScreenTextAdapterRegistry(),
    }, 'screen_text', 'self_hosted_worker', 'screen_text_openvino_ppocrv6_small')).toThrow(/适配器未登记/);
  });

  it('连接测试 Worker entry 生产使用 env registry，缺配置 fail-closed，开发才保留 fake', () => {
    expect(() => createSystemControlConnectionTestRegistriesFromEnv({ env: { NODE_ENV: 'production' } }))
      .toThrow('LOCAL_OCR_DISABLED_IN_PRODUCTION');
    const configured = createSystemControlConnectionTestRegistriesFromEnv({
      env: {
        NODE_ENV: 'production',
        QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: 'b'.repeat(64),
        QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true',
        QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT: 'http://127.0.0.1:3100',
        QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS: '5000',
      },
      transportFactory: () => new ZeroNetworkLocalOcrSidecarTransport(),
    });
    expect(configured.screenText.get('screen_text_openvino_ppocrv6_small')).toBeDefined();
    expect(configured.screenText.get('screen_text_deterministic_fake')).toBeUndefined();
    expect(createSystemControlConnectionTestRegistriesFromEnv({ env: { NODE_ENV: 'test' } }).screenText.get('screen_text_deterministic_fake')).toBeDefined();
  });
});
