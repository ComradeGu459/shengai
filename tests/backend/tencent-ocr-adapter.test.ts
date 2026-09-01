import { describe, expect, it } from 'vitest';

import type { ScreenTextAdapterInput } from '../../backend/src/modules/screen-text/screen-text.adapter.js';
import {
  TencentGeneralBasicOcrAdapter,
  TencentOcrTransportError,
  type TencentGeneralBasicOcrResponse,
  type TencentGeneralBasicOcrRequest,
  type TencentOcrTransport,
} from '../../backend/src/modules/screen-text/tencent-ocr-adapter.js';

const makeInput = (contentType: string = 'image/png', bytes = Uint8Array.from([1, 2, 3])): ScreenTextAdapterInput => ({
  batchId: '00000000-0000-4000-8000-000000000001',
  jobId: '00000000-0000-4000-8000-000000000002',
  attemptId: '00000000-0000-4000-8000-000000000003',
  episodeNumber: 1,
  attemptNumber: 1,
  asset: {
    assetId: '00000000-0000-4000-8000-000000000004', objectKey: 'private/video.mp4',
    originalFilename: 'episode-1.mp4', sizeBytes: 3, checksumAlgorithm: 'sha256',
    checksumValue: '0'.repeat(64),
  },
  media: {
    inputKind: 'server_extracted_frames', contentType: 'video/mp4', sizeBytes: 3,
    checksumAlgorithm: 'sha256', checksumValue: '0'.repeat(64), videoDurationMs: 4_000,
    frameCount: 2, pixelCount: 200, maxFrameCount: 600, maxPixels: 120_000_000,
    sourceBytes: Uint8Array.from([9, 8, 7]),
    frames: [
      { frameIndex: 0, capturedAtMs: 500, width: 100, height: 100, contentType, bytes },
      { frameIndex: 1, capturedAtMs: 1_500, width: 100, height: 100, contentType, bytes: Uint8Array.from([4, 5]) },
    ],
  },
  termProjectionDigest: '1'.repeat(64), termEntries: [],
  frameStrategyVersion: 'frames-v1', dedupeStrategyVersion: 'dedupe-v1',
});

class FakeTransport implements TencentOcrTransport {
  readonly requests: TencentGeneralBasicOcrRequest[] = [];
  constructor(private readonly responses: Array<TencentGeneralBasicOcrResponse | Error>) {}

  async GeneralBasicOCR(request: TencentGeneralBasicOcrRequest) {
    this.requests.push(request);
    const next = this.responses[this.requests.length - 1];
    if (next instanceof Error) throw next;
    return next ?? { Response: { TextDetections: [] } };
  }
}

describe('Tencent GeneralBasicOCR adapter', () => {
  it('按服务端帧顺序发送 Base64，映射官方文本/置信度/框并保留 RequestId', async () => {
    const transport = new FakeTransport([
      { Response: { RequestId: 'req-1', TextDetections: [{ DetectedText: '标题', Confidence: 92, ItemPolygon: { X: 0, Y: 2, Width: 40, Height: 20 } }] } },
      { Response: { RequestId: 'req-2', TextDetections: [{ DetectedText: '正文', Confidence: 0.7, ItemPolygon: { X: 80, Y: 2, Width: 20, Height: 20 } }] } },
    ]);
    const outcome = await new TencentGeneralBasicOcrAdapter({ transport }).execute(makeInput());
    expect(outcome.kind).toBe('completed');
    if (outcome.kind !== 'completed') return;
    expect(outcome.providerRequestId).toBe('req-2');
    expect(outcome.usage.billingQuantity).toBe(2);
    expect(outcome.candidates.map((candidate) => candidate.rawText)).toEqual(['标题', '正文']);
    expect(outcome.candidates[0]?.confidence).toBeCloseTo(0.92);
    expect(outcome.candidates[0]?.position).toBe('left');
    expect(outcome.candidates[1]?.position).toBe('right');
    expect(transport.requests[0]?.ImageBase64).toBe(Buffer.from([1, 2, 3]).toString('base64'));
    expect(outcome.candidates[0]?.evidence.bytes).toEqual(Uint8Array.from([1, 2, 3]));
  });

  it('在 transport 前拒绝 GeneralBasicOCR 不支持的 WebP 和超大帧', async () => {
    const webp = new FakeTransport([]);
    const webpOutcome = await new TencentGeneralBasicOcrAdapter({ transport: webp }).execute(makeInput('image/webp'));
    expect(webpOutcome.kind).toBe('failed');
    expect(webpOutcome.errorCode).toBe('SCREEN_TEXT_TENCENT_FRAME_INVALID');
    expect(webp.requests).toHaveLength(0);

    const large = new FakeTransport([]);
    const largeOutcome = await new TencentGeneralBasicOcrAdapter({ transport: large, maxFrameBytes: 2 }).execute(makeInput('image/png', Uint8Array.from([1, 2, 3])));
    expect(largeOutcome.kind).toBe('failed');
    expect(largeOutcome.errorCode).toBe('SCREEN_TEXT_TENCENT_FRAME_INVALID');
    expect(large.requests).toHaveLength(0);
  });

  it('timeout/unknown 进入 reconciliation，记录已发出的逐帧调用且不盲重发', async () => {
    const transport = new FakeTransport([new TencentOcrTransportError('timeout')]);
    const outcome = await new TencentGeneralBasicOcrAdapter({ transport }).execute(makeInput());
    expect(outcome.kind).toBe('reconciliation_required');
    expect(outcome.providerRequestId).toContain('tencent-ocr:');
    expect(outcome.usage.reconciliationStatus).toBe('pending');
    expect(outcome.usage.billingQuantity).toBe(1);
    expect(transport.requests).toHaveLength(1);
  });

  it('成功响应缺少 RequestId 时进入 reconciliation，不重发当前帧', async () => {
    const transport = new FakeTransport([{ Response: { TextDetections: [{ DetectedText: '不可审计' }] } }]);
    const outcome = await new TencentGeneralBasicOcrAdapter({ transport }).execute(makeInput());
    expect(outcome.kind).toBe('reconciliation_required');
    expect(outcome.errorCode).toBe('SCREEN_TEXT_TENCENT_UNKNOWN_RESULT');
    expect(outcome.usage.billingQuantity).toBe(1);
    expect(transport.requests).toHaveLength(1);
  });

  it('供应商鉴权错误只返回稳定脱敏分类', async () => {
    const transport = new FakeTransport([{ Response: { RequestId: 'req-auth', Error: { Code: 'AuthFailure.SecretId不存在', Message: 'SECRET_VALUE' } } }]);
    const outcome = await new TencentGeneralBasicOcrAdapter({ transport }).execute(makeInput());
    expect(outcome.kind).toBe('failed');
    expect(outcome.effectClass).toBe('unauthorized');
    expect(outcome.errorCode).toBe('SCREEN_TEXT_TENCENT_UNAUTHORIZED');
    expect(outcome.errorDetail).not.toContain('SECRET_VALUE');
  });
});
