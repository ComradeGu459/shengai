import { createHash } from 'node:crypto';

import type {
  ScreenTextLocalOcrSidecarBox,
  ScreenTextLocalOcrSidecarRequest,
  ScreenTextLocalOcrSidecarResponse,
} from '@qimao-terms-cloud/contracts';
import {
  ScreenTextLocalOcrSidecarRequestSchema,
  ScreenTextLocalOcrSidecarResponseSchema,
} from '@qimao-terms-cloud/contracts';
import { FormatRegistry } from '@sinclair/typebox/type';
import { Value } from '@sinclair/typebox/value';

import type {
  ScreenTextAdapter,
  ScreenTextAdapterCandidate,
  ScreenTextAdapterDescriptor,
  ScreenTextAdapterInput,
  ScreenTextAdapterOutcome,
} from './screen-text.adapter.js';
import { createScreenTextAdapterDescriptor } from './screen-text.adapter.js';

const SIDE_CAR_PROTOCOL = 'screen_text_local_ocr_v1' as const;
const SHA256 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const exactKeys = (value: object, keys: string[]) => {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys.slice().sort()[index]);
};

if (!FormatRegistry.Has('uuid')) FormatRegistry.Set('uuid', (value) => UUID.test(value));

export interface ScreenTextLocalOcrFrame {
  frameIndex: number;
  capturedAtMs: number;
  width: number;
  height: number;
  contentType: string;
  bytes: Uint8Array;
}

export interface ScreenTextLocalOcrMedia {
  inputKind: 'server_extracted_frames';
  contentType: string;
  sizeBytes: number;
  checksumAlgorithm: 'sha256';
  checksumValue: string;
  videoDurationMs: number;
  frameCount: number;
  pixelCount: number;
  maxFrameCount: number;
  maxPixels: number;
  sourceBytes?: Uint8Array;
  frames: ScreenTextLocalOcrFrame[];
}

export type ScreenTextLocalOcrWireRequest = ScreenTextLocalOcrSidecarRequest & {
  /** 服务端抽取的帧字节只存在于进程内受控 transport，不进入日志、数据库或浏览器响应。 */
  frames: ScreenTextLocalOcrFrame[];
};

export interface ScreenTextLocalOcrFrameExtractor {
  extract(input: {
    sourceBytes: Uint8Array;
    contentType: string;
    checksumValue: string;
    maxFrames: number;
    maxPixels: number;
    frameIntervalMs: number;
    signal: AbortSignal;
  }): Promise<{ frames: ScreenTextLocalOcrFrame[]; videoDurationMs: number }>;
}

export interface ScreenTextLocalOcrSidecarTransport {
  invoke(request: ScreenTextLocalOcrWireRequest, options: {
    signal: AbortSignal;
    deadlineAt: number;
  }): Promise<ScreenTextLocalOcrSidecarResponse>;
}

export interface ScreenTextLocalOcrLimits {
  maxInputBytes: number;
  maxFrames: number;
  maxPixels: number;
  /** 单帧与全请求字节上限，避免 Base64 请求体无界增长。 */
  maxFrameBytes?: number;
  maxTotalFrameBytes?: number;
  maxConcurrent: number;
  deadlineMs: number;
}

export const defaultScreenTextLocalOcrLimits: Readonly<ScreenTextLocalOcrLimits> = Object.freeze({
  maxInputBytes: 20_000_000,
  maxFrames: 600,
  maxPixels: 120_000_000,
  maxFrameBytes: 7_500_000,
  maxTotalFrameBytes: 32_000_000,
  maxConcurrent: 1,
  deadlineMs: 5_000,
});

export type ScreenTextLocalOcrTransportFailureKind =
  | 'external_not_accepted'
  | 'external_unknown'
  | 'unauthorized'
  | 'cancelled';

export class ScreenTextLocalOcrTransportError extends Error {
  constructor(
    readonly kind: ScreenTextLocalOcrTransportFailureKind,
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly externalSideEffectPossible: boolean,
    readonly providerRequestId: string | null = null,
  ) {
    super(message);
    this.name = 'ScreenTextLocalOcrTransportError';
  }
}

const sidecarCapabilities = {
  supportsRegions: true,
  supportsConfidence: true,
  supportsLanguageHints: true,
  maxFramesPerEpisode: 600,
};

export const localOcrSidecarDescriptor: Readonly<ScreenTextAdapterDescriptor> =
  createScreenTextAdapterDescriptor({
    kind: 'self_hosted_worker',
    adapter: 'screen_text_local_ocr_sidecar_fake',
    provider: 'local_ocr_sidecar_zero_network',
    model: 'sidecar-protocol-only-v1',
    language: 'zh-CN',
    deployment: 'controlled_sidecar',
    inputVersion: 'screen-text-local-ocr-input-v1',
    outputVersion: 'screen-text-local-ocr-output-v1',
    configVersion: 'screen-text-local-ocr-sidecar-fake-v1',
    capabilities: sidecarCapabilities,
    billing: {
      billingClass: 'unmetered_local',
      currency: 'CNY',
      maximumAmount: '0.000000',
      billingUnit: 'zero_network_call',
      maximumQuantity: '0',
    },
  });

const effectToOutcome = (
  descriptor: ScreenTextAdapterDescriptor,
  input: ScreenTextAdapterInput,
  error: ScreenTextLocalOcrTransportError,
): ScreenTextAdapterOutcome => {
  const base = {
    provider: descriptor.provider,
    billingUnit: descriptor.billing.billingUnit,
    billingQuantity: 0,
    currency: descriptor.billing.currency,
    estimatedAmount: descriptor.billing.maximumAmount,
    finalAmount: '0.000000',
    reconciliationStatus: error.kind === 'external_unknown' ? 'pending' as const : 'final' as const,
    providerRequestId: error.providerRequestId,
  };
  const stats = { probedFrameCount: 0, ocrFrameCount: 0, deduplicatedFrameCount: 0, candidateCount: 0, processingDurationMs: 0 };
  if (error.kind === 'external_unknown') return {
    kind: 'reconciliation_required',
    effectClass: 'external_unknown',
    providerRequestId: error.providerRequestId ?? `${descriptor.adapter}:${input.attemptId ?? input.jobId}`,
    receipt: 'unknown',
    stats,
    usage: base,
    errorCode: error.code,
    errorDetail: error.message,
  };
  return {
    kind: 'failed',
    effectClass: error.kind,
    providerRequestId: error.providerRequestId,
    receipt: 'unsupported',
    stats,
    usage: base,
    errorCode: error.code,
    errorDetail: error.message,
    retryable: error.retryable,
    externalSideEffectPossible: error.externalSideEffectPossible,
  };
};

const positionFor = (box: ScreenTextLocalOcrSidecarBox, frame: ScreenTextLocalOcrFrame): 'left' | 'center' | 'right' | 'full' => {
  const relativeLeft = box.x / frame.width;
  const relativeRight = (box.x + box.width) / frame.width;
  if (relativeLeft <= 0 && relativeRight >= 1) return 'full';
  const relativeCenter = (relativeLeft + relativeRight) / 2;
  if (relativeCenter < 1 / 3) return 'left';
  if (relativeCenter > 2 / 3) return 'right';
  return 'center';
};

const evidenceFor = (input: ScreenTextAdapterInput, frame: ScreenTextLocalOcrFrame) => {
  const bytes = Uint8Array.from(frame.bytes);
  return {
    objectKey: `derived/screen-text/${input.batchId}/${input.episodeNumber}/sidecar-${frame.frameIndex}.bin`,
    checksum: createHash('sha256').update(bytes).digest('hex'),
    contentType: frame.contentType,
    sizeBytes: bytes.byteLength,
    width: frame.width,
    height: frame.height,
    capturedAtMs: frame.capturedAtMs,
    bytes,
  };
};

const validateMedia = (media: ScreenTextLocalOcrMedia, limits: ScreenTextLocalOcrLimits, streamed = false) => {
  if (media.inputKind !== 'server_extracted_frames') {
    throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_INPUT_KIND_UNSUPPORTED', '本地 OCR 只接受服务端真实帧提取输入。', false, false);
  }
  if (media.contentType !== 'video/mp4' && media.contentType !== 'video/webm' && media.contentType !== 'video/quicktime') {
    throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_CONTENT_TYPE_UNSUPPORTED', '本地 OCR sidecar 只接受受控视频类型。', false, false);
  }
  if ((!streamed && !media.sourceBytes) || media.sizeBytes < 1 || (!streamed && media.sizeBytes > limits.maxInputBytes)
    || (media.sourceBytes && media.sizeBytes !== media.sourceBytes.byteLength)) {
    throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_INPUT_TOO_LARGE', '本地 OCR 输入大小超过受控上限。', false, false);
  }
  if (!SHA256.test(media.checksumValue) || (!streamed && media.sourceBytes && createHash('sha256').update(media.sourceBytes).digest('hex') !== media.checksumValue)) {
    throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_CHECKSUM_MISMATCH', '本地 OCR 输入摘要与服务器读取字节不一致。', false, false);
  }
  if (!Number.isInteger(media.videoDurationMs) || media.videoDurationMs < 1 || media.videoDurationMs > 86_400_000) {
    throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_DURATION_INVALID', '服务端帧提取未提供有效媒体时长。', false, false);
  }
  if (media.maxFrameCount < 1 || media.maxFrameCount > limits.maxFrames || media.frameCount < 1 || media.frameCount > media.maxFrameCount || media.frames.length !== media.frameCount) {
    throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_FRAME_LIMIT', '本地 OCR 帧数超过受控上限。', false, false);
  }
  const pixels = media.frames.reduce((sum, frame) => sum + frame.width * frame.height, 0);
  if (media.maxPixels < 1 || media.maxPixels > limits.maxPixels || media.pixelCount !== pixels || pixels > media.maxPixels) {
    throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_PIXEL_LIMIT', '本地 OCR 像素总量超过受控上限。', false, false);
  }
  const frameIds = new Set<number>();
  let totalFrameBytes = 0;
  const maxFrameBytes = limits.maxFrameBytes ?? 7_500_000;
  const maxTotalFrameBytes = limits.maxTotalFrameBytes ?? 32_000_000;
  for (const frame of media.frames) {
    if (!Number.isInteger(frame.frameIndex) || frameIds.has(frame.frameIndex) || frame.frameIndex < 0 || frame.frameIndex >= media.frameCount
      || !Number.isInteger(frame.capturedAtMs) || frame.capturedAtMs < 0 || frame.capturedAtMs > media.videoDurationMs
      || !Number.isInteger(frame.width) || frame.width < 1 || frame.width > 7_680
      || !Number.isInteger(frame.height) || frame.height < 1 || frame.height > 4_320
      || !(frame.bytes instanceof Uint8Array) || frame.bytes.byteLength < 1 || frame.bytes.byteLength > maxFrameBytes
      || frame.contentType !== 'image/png' && frame.contentType !== 'image/jpeg' && frame.contentType !== 'image/webp') {
      throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_FRAME_INVALID', '服务端帧提取结果不完整。', false, false);
    }
    totalFrameBytes += frame.bytes.byteLength;
    if (totalFrameBytes > maxTotalFrameBytes) {
      throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_FRAME_BYTES_LIMIT', '本地 OCR 帧请求体超过受控上限。', false, false);
    }
    frameIds.add(frame.frameIndex);
  }
};

function validateResponse(value: unknown, input: ScreenTextAdapterInput, media: ScreenTextLocalOcrMedia, providerRequestId: string, descriptor: ScreenTextAdapterDescriptor): asserts value is ScreenTextLocalOcrSidecarResponse {
  if (!Value.Check(ScreenTextLocalOcrSidecarResponseSchema, value)) {
    throw new ScreenTextLocalOcrTransportError('external_unknown', 'SCREEN_TEXT_LOCAL_OCR_RESPONSE_INVALID', '本地 OCR sidecar 返回内容不符合严格协议，必须对账。', false, true, providerRequestId);
  }
  const response = value;
  if (!exactKeys(response, ['protocolVersion', 'attemptId', 'requestId', 'modelVersion', 'language', 'frameCount', 'boxes'])
    || response.protocolVersion !== SIDE_CAR_PROTOCOL || response.attemptId !== input.attemptId
    || response.requestId !== providerRequestId || response.modelVersion !== descriptor.model
    || response.language !== descriptor.language || response.frameCount !== media.frameCount) {
    throw new ScreenTextLocalOcrTransportError('external_unknown', 'SCREEN_TEXT_LOCAL_OCR_RESPONSE_IDENTITY_MISMATCH', '本地 OCR sidecar 返回身份或帧范围不一致，必须对账。', false, true, providerRequestId);
  }
  const frames = new Map(media.frames.map((frame) => [frame.frameIndex, frame]));
  for (const box of response.boxes) {
    const frame = frames.get(box.frameIndex);
    if (!exactKeys(box, ['frameIndex', 'text', 'confidence', 'language', 'x', 'y', 'width', 'height', 'startMs', 'endMs'])
      || !box.text.trim() || box.language !== response.language || box.frameIndex >= response.frameCount
      || !frame || box.x + box.width > frame.width || box.y + box.height > frame.height
      || box.endMs <= box.startMs || box.startMs > frame.capturedAtMs || box.endMs < frame.capturedAtMs
      || box.endMs > media.videoDurationMs) {
      throw new ScreenTextLocalOcrTransportError('external_unknown', 'SCREEN_TEXT_LOCAL_OCR_RESPONSE_GEOMETRY_INVALID', '本地 OCR sidecar 返回框、时间或语言不符合严格协议，必须对账。', false, true, providerRequestId);
    }
  }
}

export class ScreenTextLocalOcrSidecarAdapter implements ScreenTextAdapter {
  readonly descriptor: Readonly<ScreenTextAdapterDescriptor>;
  readonly requiresMedia = true as const;
  readonly requiresStreamedMedia: boolean;
  private readonly successReceipt: 'simulated' | 'submitted';
  private active = 0;

  constructor(
    private readonly transport: ScreenTextLocalOcrSidecarTransport,
    private readonly limits: ScreenTextLocalOcrLimits = defaultScreenTextLocalOcrLimits,
    options: { descriptor?: ScreenTextAdapterDescriptor; streamedMedia?: boolean; receipt?: 'simulated' | 'submitted' } = {},
  ) {
    this.descriptor = options.descriptor ?? localOcrSidecarDescriptor;
    this.requiresStreamedMedia = options.streamedMedia ?? false;
    this.successReceipt = options.receipt ?? 'simulated';
  }

  private async invokeWithControls(
    request: ScreenTextLocalOcrWireRequest,
    signal: AbortSignal,
    providerRequestId: string,
  ): Promise<ScreenTextLocalOcrSidecarResponse> {
    if (this.active >= this.limits.maxConcurrent) {
      throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_CONCURRENCY_LIMIT', '本地 OCR sidecar 并发已达上限。', true, false, providerRequestId);
    }
    if (signal.aborted) {
      throw new ScreenTextLocalOcrTransportError('cancelled', 'SCREEN_TEXT_LOCAL_OCR_ABORTED', '本地 OCR sidecar 已被停止。', false, false, providerRequestId);
    }
    this.active += 1;
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal.addEventListener('abort', onAbort, { once: true });
    const deadlineAt = Date.now() + Math.max(1, this.limits.deadlineMs);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let transportSettled = false;
    const releaseSlot = () => {
      if (transportSettled) return;
      transportSettled = true;
      this.active -= 1;
    };
    const transportPromise = Promise.resolve()
      .then(() => this.transport.invoke(request, { signal: controller.signal, deadlineAt }));
    const observedTransport = transportPromise.then(
      (value) => { releaseSlot(); return { type: 'response' as const, value }; },
      (error) => { releaseSlot(); return { type: 'error' as const, error }; },
    );
    const timeoutResult = new Promise<{ type: 'timeout' }>((resolve) => {
      timer = setTimeout(() => { controller.abort(); resolve({ type: 'timeout' }); }, Math.max(1, this.limits.deadlineMs));
    });
    let abortListener: (() => void) | undefined;
    const abortResult = new Promise<{ type: 'aborted' }>((resolve) => {
      if (signal.aborted) resolve({ type: 'aborted' });
      else {
        abortListener = () => resolve({ type: 'aborted' });
        signal.addEventListener('abort', abortListener, { once: true });
      }
    });
    try {
      const result = await Promise.race([observedTransport, timeoutResult, abortResult]);
      if (result.type === 'timeout') {
        throw new ScreenTextLocalOcrTransportError('external_unknown', 'SCREEN_TEXT_LOCAL_OCR_TIMEOUT', '本地 OCR sidecar 超时，结果未知。', false, true, providerRequestId);
      }
      if (result.type === 'aborted') {
        throw new ScreenTextLocalOcrTransportError('cancelled', 'SCREEN_TEXT_LOCAL_OCR_ABORTED', '本地 OCR sidecar 已被停止。', false, false, providerRequestId);
      }
      if (result.type === 'error') throw result.error;
      return result.value;
    } finally {
      if (timer) clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      if (abortListener) signal.removeEventListener('abort', abortListener);
      // 失控 transport 的迟到结果永远不再进入 Adapter 状态；同时吸收其迟到 rejection。
      void observedTransport.catch(() => undefined);
    }
  }

  async execute(input: ScreenTextAdapterInput): Promise<ScreenTextAdapterOutcome> {
    const providerRequestId = `local-ocr-sidecar:${input.attemptId ?? ''}`;
    if (!input.attemptId) {
      return effectToOutcome(this.descriptor, input, new ScreenTextLocalOcrTransportError(
        'external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_ATTEMPT_ID_REQUIRED', '本地 OCR sidecar 缺少稳定 Attempt 身份。', false, false,
      ));
    }
    if (input.signal?.aborted) {
      return effectToOutcome(this.descriptor, input, new ScreenTextLocalOcrTransportError(
        'cancelled', 'SCREEN_TEXT_LOCAL_OCR_ABORTED', '本地 OCR sidecar 已被停止。', false, false, providerRequestId,
      ));
    }
    const media = input.media;
    if (!media) {
      return effectToOutcome(this.descriptor, input, new ScreenTextLocalOcrTransportError(
        'external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_MEDIA_UNAVAILABLE', '服务端未读取到可验证的媒体字节。', false, false, providerRequestId,
      ));
    }
    try {
      validateMedia(media, this.limits, this.requiresStreamedMedia);
      const request: ScreenTextLocalOcrWireRequest = {
        protocolVersion: SIDE_CAR_PROTOCOL,
        attemptId: input.attemptId,
        requestId: providerRequestId,
        media: {
          inputKind: media.inputKind,
          contentType: media.contentType,
          sizeBytes: media.sizeBytes,
          checksumAlgorithm: media.checksumAlgorithm,
          checksumValue: media.checksumValue,
          videoDurationMs: media.videoDurationMs,
          maxFrameCount: media.maxFrameCount,
          maxPixels: media.maxPixels,
        },
        language: this.descriptor.language,
        modelVersion: this.descriptor.model,
        frames: media.frames.map((frame) => ({ ...frame, bytes: Uint8Array.from(frame.bytes) })),
      };
      const publicRequest = {
        protocolVersion: request.protocolVersion,
        attemptId: request.attemptId,
        requestId: request.requestId,
        media: request.media,
        frames: request.frames.map(({ frameIndex, capturedAtMs, width, height }) => ({ frameIndex, capturedAtMs, width, height })),
        language: request.language,
        modelVersion: request.modelVersion,
      };
      if (!UUID.test(publicRequest.attemptId) || !exactKeys(publicRequest, ['protocolVersion', 'attemptId', 'requestId', 'media', 'frames', 'language', 'modelVersion'])
        || !exactKeys(publicRequest.media, ['inputKind', 'contentType', 'sizeBytes', 'checksumAlgorithm', 'checksumValue', 'videoDurationMs', 'maxFrameCount', 'maxPixels'])
        || !Value.Check(ScreenTextLocalOcrSidecarRequestSchema, publicRequest)) {
        throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_REQUEST_INVALID', '本地 OCR sidecar 请求协议校验失败。', false, false, providerRequestId);
      }
      const response = await this.invokeWithControls(request, input.signal ?? new AbortController().signal, providerRequestId);
      validateResponse(response, input, media, providerRequestId, this.descriptor);
      const frames = new Map(media.frames.map((frame) => [frame.frameIndex, frame]));
      const candidates: ScreenTextAdapterCandidate[] = response.boxes.map((box) => ({
        rawText: box.text,
        startMs: box.startMs,
        endMs: box.endMs,
        category: 'other',
        position: positionFor(box, frames.get(box.frameIndex)!),
        confidence: box.confidence,
        systemSuggestion: null,
        suggestionReason: null,
        pairGroupKey: null,
        evidence: evidenceFor(input, frames.get(box.frameIndex)!),
      }));
      return {
        kind: 'completed',
        effectClass: 'completed',
        providerRequestId,
        receipt: this.successReceipt,
        stats: {
          probedFrameCount: media.frameCount,
          ocrFrameCount: media.frameCount,
          deduplicatedFrameCount: 0,
          candidateCount: candidates.length,
          processingDurationMs: 0,
        },
        usage: {
          provider: this.descriptor.provider,
          billingUnit: this.descriptor.billing.billingUnit,
          billingQuantity: 0,
          currency: 'CNY',
          estimatedAmount: '0.000000',
          finalAmount: '0.000000',
          reconciliationStatus: 'final',
          providerRequestId,
        },
        videoDurationMs: media.videoDurationMs,
        candidates,
      };
    } catch (error) {
      if (error instanceof ScreenTextLocalOcrTransportError) return effectToOutcome(this.descriptor, input, error);
      return effectToOutcome(this.descriptor, input, new ScreenTextLocalOcrTransportError(
        'external_unknown', 'SCREEN_TEXT_LOCAL_OCR_TRANSPORT_UNKNOWN', '本地 OCR sidecar 返回未知结果，必须对账。', false, true, providerRequestId,
      ));
    }
  }
}

export type ZeroNetworkLocalOcrSidecarMode = 'success' | 'external_not_accepted' | 'timeout' | 'process_exit' | 'unknown' | 'unauthorized';

/** 仅测试使用：不创建 socket、不调用 fetch、不读取环境凭据。 */
export class ZeroNetworkLocalOcrSidecarTransport implements ScreenTextLocalOcrSidecarTransport {
  private active = 0;
  calls = 0;
  networkCalls = 0;
  lastRequest: ScreenTextLocalOcrWireRequest | null = null;

  constructor(private mode: ZeroNetworkLocalOcrSidecarMode = 'success', private readonly maxConcurrent = 1) {}

  setMode(mode: ZeroNetworkLocalOcrSidecarMode) { this.mode = mode; }

  async invoke(request: ScreenTextLocalOcrWireRequest, options: { signal: AbortSignal; deadlineAt: number }) {
    this.calls += 1;
    this.lastRequest = request;
    if (this.active >= this.maxConcurrent) {
      throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_CONCURRENCY_LIMIT', '本地 OCR sidecar 并发已达上限。', true, false, request.requestId);
    }
    this.active += 1;
    try {
      if (options.signal.aborted) throw new ScreenTextLocalOcrTransportError('cancelled', 'SCREEN_TEXT_LOCAL_OCR_ABORTED', '本地 OCR sidecar 已被停止。', false, false, request.requestId);
      if (Date.now() >= options.deadlineAt) throw new ScreenTextLocalOcrTransportError('external_unknown', 'SCREEN_TEXT_LOCAL_OCR_TIMEOUT', '本地 OCR sidecar 超时，结果未知。', false, true, request.requestId);
      if (this.mode === 'external_not_accepted') throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_PROCESS_REJECTED', '本地 OCR sidecar 进程未受理请求。', true, false, request.requestId);
      if (this.mode === 'unauthorized') throw new ScreenTextLocalOcrTransportError('unauthorized', 'SCREEN_TEXT_LOCAL_OCR_UNAUTHORIZED', '本地 OCR sidecar 配置拒绝。', false, false, request.requestId);
      if (this.mode === 'process_exit') throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'SCREEN_TEXT_LOCAL_OCR_PROCESS_EXITED', '本地 OCR sidecar 进程在受理前退出。', true, false, request.requestId);
      if (this.mode === 'unknown' || this.mode === 'timeout') {
        const waitMs = Math.max(1, Math.min(25, options.deadlineAt - Date.now()));
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, waitMs);
          const abort = () => { clearTimeout(timer); reject(new ScreenTextLocalOcrTransportError('cancelled', 'SCREEN_TEXT_LOCAL_OCR_ABORTED', '本地 OCR sidecar 已被停止。', false, false, request.requestId)); };
          options.signal.addEventListener('abort', abort, { once: true });
        });
        throw new ScreenTextLocalOcrTransportError('external_unknown', 'SCREEN_TEXT_LOCAL_OCR_TIMEOUT', '本地 OCR sidecar 超时，结果未知。', false, true, request.requestId);
      }
      return {
        protocolVersion: SIDE_CAR_PROTOCOL,
        attemptId: request.attemptId,
        requestId: request.requestId,
        modelVersion: request.modelVersion,
        language: request.language,
        frameCount: request.frames.length,
        boxes: request.frames.slice(0, 1).map((frame) => ({
          frameIndex: frame.frameIndex, text: '零网络本地 OCR 结果', confidence: 0.91, language: request.language,
          x: 32, y: 24, width: 240, height: 48, startMs: frame.capturedAtMs, endMs: frame.capturedAtMs + 1_000,
        })),
      };
    } finally {
      this.active -= 1;
    }
  }
}
