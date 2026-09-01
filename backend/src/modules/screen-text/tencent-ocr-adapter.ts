import { createHash } from 'node:crypto';

import type {
  ScreenTextAdapter,
  ScreenTextAdapterCandidate,
  ScreenTextAdapterDescriptor,
  ScreenTextAdapterInput,
  ScreenTextAdapterOutcome,
  ScreenTextBillingCapability,
} from './screen-text.adapter.js';
import { createScreenTextAdapterDescriptor } from './screen-text.adapter.js';

/**
 * GeneralBasicOCR 的请求/响应边界。腾讯 Node SDK 返回扁平响应，runtime
 * 会在这里之前归一化为 Response 包裹，业务层不依赖供应商原始对象。
 */
export interface TencentGeneralBasicOcrRequest {
  ImageBase64: string;
  LanguageType?: string;
}

export interface TencentGeneralBasicOcrTextDetection {
  DetectedText?: string;
  Confidence?: number;
  ItemPolygon?: { X: number; Y: number; Width: number; Height: number };
  Polygon?: Array<{ X?: number; Y?: number }>;
}

export interface TencentGeneralBasicOcrResponse {
  Response?: {
    TextDetections?: TencentGeneralBasicOcrTextDetection[];
    RequestId?: string;
    Error?: { Code?: string; Message?: string };
  };
}

export interface TencentOcrTransport {
  GeneralBasicOCR(request: TencentGeneralBasicOcrRequest): Promise<TencentGeneralBasicOcrResponse>;
}

export type TencentOcrTransportFailureCode = 'unauthorized' | 'rejected' | 'timeout' | 'unknown';

/** 适配器只接收稳定分类，绝不把供应商原始错误带入结果。 */
export class TencentOcrTransportError extends Error {
  constructor(
    readonly code: TencentOcrTransportFailureCode,
    readonly providerRequestId: string | null = null,
  ) {
    super(code);
    this.name = 'TencentOcrTransportError';
  }
}

export interface TencentOcrAdapterOptions {
  transport: TencentOcrTransport;
  descriptor?: Readonly<ScreenTextAdapterDescriptor>;
  maxFrameBytes?: number;
}

const defaultBilling: ScreenTextBillingCapability = {
  billingClass: 'metered',
  currency: 'CNY',
  maximumAmount: '0',
  billingUnit: 'image',
  maximumQuantity: '600',
};

export const createTencentGeneralBasicOcrDescriptor = (
  billing: ScreenTextBillingCapability = defaultBilling,
) => createScreenTextAdapterDescriptor({
  kind: 'cloud_api',
  adapter: 'screen_text_tencent_general_basic_ocr_v1',
  provider: 'tencent_cloud',
  model: 'GeneralBasicOCR',
  language: 'zh-CN',
  deployment: 'external_api',
  inputVersion: 'screen-text-input-v1',
  outputVersion: 'screen-text-output-v1',
  configVersion: 'tencent-general-basic-ocr-v1',
  capabilities: {
    supportsRegions: true,
    supportsConfidence: true,
    supportsLanguageHints: true,
    maxFramesPerEpisode: 600,
  },
  billing,
});

export const tencentGeneralBasicOcrDescriptor = createTencentGeneralBasicOcrDescriptor();

const stableError = (code: TencentOcrTransportFailureCode) => {
  if (code === 'unauthorized') return {
    errorCode: 'SCREEN_TEXT_TENCENT_UNAUTHORIZED',
    errorDetail: '腾讯云 OCR 鉴权未通过。',
  };
  if (code === 'rejected') return {
    errorCode: 'SCREEN_TEXT_TENCENT_NOT_ACCEPTED',
    errorDetail: '腾讯云 OCR 未受理识别请求。',
  };
  if (code === 'timeout') return {
    errorCode: 'SCREEN_TEXT_TENCENT_TIMEOUT',
    errorDetail: '腾讯云 OCR 请求超时，结果需要对账。',
  };
  return {
    errorCode: 'SCREEN_TEXT_TENCENT_UNKNOWN_RESULT',
    errorDetail: '腾讯云 OCR 响应未知，结果需要对账。',
  };
};

const stableProviderErrorCode = (code?: string): TencentOcrTransportFailureCode => {
  const value = (code ?? '').toUpperCase();
  if (value.includes('AUTH') || value.includes('SECRET') || value.includes('SIGN') || value.includes('ACCESSDENIED')) return 'unauthorized';
  if (value.includes('TIMEOUT') || value.includes('NETWORK') || value.includes('INTERNALERROR')) return 'timeout';
  return 'rejected';
};

const baseStats = (frameCount: number, processed: number, candidateCount: number, processingDurationMs: number) => ({
  probedFrameCount: frameCount,
  ocrFrameCount: processed,
  deduplicatedFrameCount: frameCount - processed,
  candidateCount,
  processingDurationMs,
});

const usageFor = (
  descriptor: ScreenTextAdapterDescriptor,
  providerRequestId: string | null,
  pending: boolean,
  billingQuantity: number,
) => ({
  provider: descriptor.provider,
  billingUnit: descriptor.billing.billingUnit,
  billingQuantity: Math.max(0, billingQuantity),
  currency: descriptor.billing.currency,
  estimatedAmount: descriptor.billing.maximumAmount,
  finalAmount: pending ? '0' : descriptor.billing.maximumAmount,
  reconciliationStatus: pending ? 'pending' as const : 'final' as const,
  providerRequestId,
});

const positionFrom = (
  detection: TencentGeneralBasicOcrTextDetection,
  frame: { width: number; height: number },
): 'left' | 'center' | 'right' | 'full' => {
  const item = detection.ItemPolygon;
  let x = item?.X;
  let width = item?.Width;
  if (typeof x !== 'number' || typeof width !== 'number') {
    const points = (detection.Polygon ?? [])
      .filter((point) => typeof point.X === 'number')
      .map((point) => point.X as number);
    if (points.length > 0) {
      x = Math.min(...points);
      width = Math.max(...points) - x;
    }
  }
  if (typeof x !== 'number' || typeof width !== 'number' || frame.width < 1) return 'center';
  const left = Math.max(0, x) / frame.width;
  const right = Math.min(frame.width, x + Math.max(0, width)) / frame.width;
  if (left <= 0 && right >= 1) return 'full';
  const center = (left + right) / 2;
  if (center < 1 / 3) return 'left';
  if (center > 2 / 3) return 'right';
  return 'center';
};

const evidenceFor = (input: ScreenTextAdapterInput, frame: ScreenTextAdapterInput['media'] extends infer T
  ? T extends { frames: infer F } ? F extends Array<infer E> ? E : never : never : never) => {
  const bytes = Uint8Array.from(frame.bytes);
  const extension = frame.contentType === 'image/png' ? 'png' : 'jpg';
  return {
    objectKey: `derived/screen-text/${input.batchId}/${input.episodeNumber}/tencent-ocr-frame-${frame.frameIndex}.${extension}`,
    checksum: createHash('sha256').update(bytes).digest('hex'),
    contentType: frame.contentType,
    sizeBytes: bytes.byteLength,
    width: frame.width,
    height: frame.height,
    capturedAtMs: frame.capturedAtMs,
    bytes,
  };
};

const makeCandidate = (
  input: ScreenTextAdapterInput,
  frame: NonNullable<ScreenTextAdapterInput['media']>['frames'][number],
  detection: TencentGeneralBasicOcrTextDetection,
): ScreenTextAdapterCandidate | null => {
  const rawText = typeof detection.DetectedText === 'string' ? detection.DetectedText.trim() : '';
  if (!rawText) return null;
  const duration = input.media?.videoDurationMs ?? Math.max(frame.capturedAtMs + 1, 1);
  const startMs = Math.min(frame.capturedAtMs, Math.max(0, duration - 1));
  const endMs = Math.max(startMs + 1, Math.min(duration, startMs + 1_000));
  const rawConfidence = detection.Confidence;
  const confidence = typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)
    ? Math.min(1, Math.max(0, rawConfidence > 1 ? rawConfidence / 100 : rawConfidence))
    : null;
  return {
    rawText,
    startMs,
    endMs,
    category: 'other',
    position: positionFrom(detection, frame),
    confidence,
    systemSuggestion: null,
    suggestionReason: null,
    pairGroupKey: null,
    evidence: evidenceFor(input, frame),
  };
};

const validateMedia = (input: ScreenTextAdapterInput, maxFrameBytes: number): string | null => {
  const media = input.media;
  if (!media || media.inputKind !== 'server_extracted_frames') return 'SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE';
  if (!Number.isInteger(media.videoDurationMs) || media.videoDurationMs < 1) return 'SCREEN_TEXT_TENCENT_DURATION_INVALID';
  if (!Number.isInteger(media.frameCount) || media.frameCount < 1 || media.frames.length !== media.frameCount) return 'SCREEN_TEXT_TENCENT_FRAME_LIMIT';
  const seen = new Set<number>();
  for (const frame of media.frames) {
    if (!Number.isInteger(frame.frameIndex) || seen.has(frame.frameIndex) || frame.frameIndex < 0
      || frame.frameIndex >= media.frameCount || !Number.isInteger(frame.capturedAtMs)
      || frame.capturedAtMs < 0 || frame.capturedAtMs > media.videoDurationMs
      || frame.contentType !== 'image/png' && frame.contentType !== 'image/jpeg'
      || !(frame.bytes instanceof Uint8Array) || frame.bytes.byteLength < 1 || frame.bytes.byteLength > maxFrameBytes
      || !Number.isInteger(frame.width) || frame.width < 1 || !Number.isInteger(frame.height) || frame.height < 1) {
      return 'SCREEN_TEXT_TENCENT_FRAME_INVALID';
    }
    if (Buffer.byteLength(Buffer.from(frame.bytes).toString('base64'), 'utf8') > 10_000_000) return 'SCREEN_TEXT_TENCENT_FRAME_TOO_LARGE';
    seen.add(frame.frameIndex);
  }
  return null;
};

export class TencentGeneralBasicOcrAdapter implements ScreenTextAdapter {
  readonly descriptor: Readonly<ScreenTextAdapterDescriptor>;
  readonly requiresMedia = true as const;
  readonly requiresStreamedMedia = true as const;

  constructor(private readonly options: TencentOcrAdapterOptions) {
    this.descriptor = options.descriptor ?? tencentGeneralBasicOcrDescriptor;
  }

  async execute(input: ScreenTextAdapterInput): Promise<ScreenTextAdapterOutcome> {
    const startedAt = Date.now();
    const media = input.media;
    const providerRequestId = `tencent-ocr:${input.jobId}:${input.attemptId ?? input.attemptNumber}`;
    const maxFrameBytes = this.options.maxFrameBytes ?? 7_500_000;
    const invalid = validateMedia(input, maxFrameBytes);
    if (invalid || !media) {
      return {
        kind: 'failed', effectClass: 'external_not_accepted', providerRequestId: null,
        receipt: 'unsupported', stats: baseStats(media?.frameCount ?? 0, 0, 0, 0),
        usage: usageFor(this.descriptor, null, false, 0), errorCode: invalid ?? 'SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE',
        errorDetail: '服务端帧输入不符合腾讯云 OCR 的格式或大小限制。', retryable: false, externalSideEffectPossible: false,
      };
    }
    const candidates: ScreenTextAdapterCandidate[] = [];
    let processed = 0;
    let attempted = 0;
    let lastProviderRequestId: string | null = null;
    let currentFrameRequestId = providerRequestId;
    try {
      // 每帧按稳定 frameIndex 顺序单独请求；未知结果立即停，不在适配器内盲重发。
      for (const frame of [...media.frames].sort((left, right) => left.frameIndex - right.frameIndex)) {
        currentFrameRequestId = `${providerRequestId}:frame-${frame.frameIndex}`;
        attempted += 1;
        const response = await this.options.transport.GeneralBasicOCR({
          ImageBase64: Buffer.from(frame.bytes).toString('base64'),
          LanguageType: 'zh',
        });
        const body = response?.Response;
        if (!body) throw new TencentOcrTransportError('unknown', currentFrameRequestId);
        if (body.Error) throw new TencentOcrTransportError(stableProviderErrorCode(body.Error.Code), body.RequestId ?? currentFrameRequestId);
        // 腾讯成功响应应始终带 RequestId；缺失时结果不可审计，进入对账且不重发当前帧。
        if (typeof body.RequestId !== 'string' || body.RequestId.trim().length === 0) {
          throw new TencentOcrTransportError('unknown', currentFrameRequestId);
        }
        lastProviderRequestId = body.RequestId.trim();
        for (const detection of body.TextDetections ?? []) {
          const candidate = makeCandidate(input, frame, detection);
          if (candidate) candidates.push(candidate);
        }
        processed += 1;
      }
      return {
        kind: 'completed', effectClass: 'completed', providerRequestId: lastProviderRequestId, receipt: 'submitted',
        stats: baseStats(media.frameCount, processed, candidates.length, Math.max(0, Date.now() - startedAt)),
        usage: usageFor(this.descriptor, lastProviderRequestId, false, attempted), videoDurationMs: media.videoDurationMs, candidates,
      };
    } catch (error) {
      const classified = error instanceof TencentOcrTransportError ? error : new TencentOcrTransportError('unknown', providerRequestId);
      const detail = stableError(classified.code);
      const stats = baseStats(media.frameCount, processed, candidates.length, Math.max(0, Date.now() - startedAt));
      if (classified.code === 'timeout' || classified.code === 'unknown') {
        return {
          kind: 'reconciliation_required', effectClass: 'external_unknown',
          providerRequestId: classified.providerRequestId ?? currentFrameRequestId, receipt: 'unknown', stats,
          usage: usageFor(this.descriptor, classified.providerRequestId ?? currentFrameRequestId, true, attempted), ...detail,
        };
      }
      return {
        kind: 'failed', effectClass: classified.code === 'unauthorized' ? 'unauthorized' : 'external_not_accepted',
        providerRequestId: classified.providerRequestId, receipt: 'unsupported', stats,
        usage: usageFor(this.descriptor, classified.providerRequestId, false, attempted), ...detail,
        retryable: classified.code === 'rejected', externalSideEffectPossible: false,
      };
    }
  }
}
