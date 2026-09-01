import { describe, expect, it, vi } from 'vitest';

import type { AsrAdapterInput } from '../../backend/src/modules/asr/asr-adapter.js';
import {
  TencentAsrAdapter,
  TencentAsrTransportError,
  createTencentAsrHourlyBilling,
  createTencentAsrDescriptor,
  buildTencentHotwordList,
  type TencentAsrTransport,
  type TencentCreateRecTaskRequest,
  type TencentDescribeTaskStatusRequest,
} from '../../backend/src/modules/asr/tencent-asr-adapter.js';

const input = (overrides: Partial<AsrAdapterInput> = {}): AsrAdapterInput => ({
  jobId: 'job-1',
  episodeNumber: 1,
  asset: {
    assetId: 'asset-1',
    objectKey: 'projects/p1/assets/a1.mp4',
    originalFilename: 'episode-1.mp4',
    mediaKind: 'video',
    sizeBytes: 16_777_216,
    checksum: { algorithm: 'sha256', value: 'b'.repeat(64) },
  },
  attemptNumber: 1,
  providerRequestId: null,
  retryOfBatchId: null,
  hasPreviousResult: false,
  hotwords: {
    words: ['七猫', '字幕'],
    summary: {
      projectionVersion: 'hotwords-v1',
      digest: 'a'.repeat(64),
      termCount: 2,
      aliasCount: 0,
      filteredCount: 0,
      truncatedCount: 0,
    },
  },
  ...overrides,
});

const transport = (overrides: Partial<TencentAsrTransport> = {}): TencentAsrTransport => ({
  CreateRecTask: vi.fn(async (_request: TencentCreateRecTaskRequest) => ({
    Response: { Data: { TaskId: '1' } },
  })),
  DescribeTaskStatus: vi.fn(async (_request: TencentDescribeTaskStatusRequest) => ({
    Response: { Data: { Status: 2, Result: '识别结果', AudioDuration: 60 } },
  })),
  ...overrides,
});

const signer = (url = 'https://cos.example.invalid/private/object?signature=redacted') => ({
  createGetUrl: vi.fn(async () => url),
});

describe('TencentAsrAdapter', () => {
  it('按官方 HotwordList 约束清洗、截断、去重并限制 128 项', () => {
    const mixed = '甲乙丙丁戊己庚辛壬癸十一ABC';
    const result = buildTencentHotwordList([
      '  七猫  ', '七猫', '', mixed, 'A'.repeat(40), ...Array.from({ length: 130 }, (_, i) => `词${i}`),
    ]);
    expect(result.value?.split(',').slice(0, 3)).toEqual([
      '七猫|5', '甲乙丙丁戊己庚辛壬癸|5', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA|5',
    ]);
    expect(result.value?.split(',')).toHaveLength(128);
    expect(result.value?.split(',').every((item) => item.endsWith('|5'))).toBe(true);
    expect(result.omittedCount).toBeGreaterThan(0);
  });

  it('把确认版本投影的热词实际放入 CreateRecTask.HotwordList；无热词不发送字段', async () => {
    const create = vi.fn(async () => ({ Response: { Data: { TaskId: '7' } } }));
    await new TencentAsrAdapter({
      transport: transport({ CreateRecTask: create }), signer: signer(), pollIntervalMs: 0,
    }).execute(input({ hotwords: { ...input().hotwords, words: [' 术语 ', '术语', '字幕'] } }));
    expect(create.mock.calls[0]?.[0]).toMatchObject({ HotwordList: '术语|5,字幕|5' });

    const noHotwordCreate = vi.fn(async () => ({ Response: { Data: { TaskId: '8' } } }));
    await new TencentAsrAdapter({
      transport: transport({ CreateRecTask: noHotwordCreate }), signer: signer(), pollIntervalMs: 0,
    }).execute(input({ hotwords: { ...input().hotwords, words: [] } }));
    expect(noHotwordCreate.mock.calls[0]?.[0]).not.toHaveProperty('HotwordList');
  });

  it('无 confirmed TermVersion 时 receipt 明确为 unused 且不阻断识别', async () => {
    const create = vi.fn(async () => ({ Response: { Data: { TaskId: '9' } } }));
    const outcome = await new TencentAsrAdapter({
      transport: transport({ CreateRecTask: create }), signer: signer(), pollIntervalMs: 0,
    }).execute(input({ termVersionId: null, hotwords: { words: [], summary: input().hotwords.summary } }));
    expect(outcome).toMatchObject({
      kind: 'completed', hotwordReceipt: 'unused',
      hotwordReceiptFacts: { submittedCount: 0, omittedCount: 0, reasonCode: 'no_confirmed_term_version' },
    });
  });

  it('confirmed TermVersion 即使投影为零词也明确为已使用链路而非 no-confirmed', async () => {
    const outcome = await new TencentAsrAdapter({
      transport: transport(), signer: signer(), pollIntervalMs: 0,
    }).execute(input({ termVersionId: 'term-version-1', hotwords: { words: [], summary: input().hotwords.summary } }));
    expect(outcome).toMatchObject({
      kind: 'completed', hotwordReceipt: 'submitted',
      hotwordReceiptFacts: { submittedCount: 0, omittedCount: 0, reasonCode: null },
    });
  });
  it('以私有 COS 短时 URL 创建一次任务并轮询完成，返回统一 Cue/Usage/热词回执', async () => {
    const signed = signer();
    const create = vi.fn(async (request: TencentCreateRecTaskRequest) => ({
      Response: { Data: { TaskId: '42' }, RequestId: 'request-hidden' },
    }));
    let statusPoll = 0;
    const describe = vi.fn(async ({ TaskId }: TencentDescribeTaskStatusRequest) => {
      statusPoll += 1;
      return { Response: { Data: TaskId === '42' && statusPoll === 1
        ? { Status: 1, StatusStr: 'Doing' }
        : { Status: 2, ResultDetail: [{ StartMs: 10, EndMs: 1_010, FinalSentence: '你好', Confidence: 0.91 }], AudioDuration: 1.01 } } };
    });
    const adapter = new TencentAsrAdapter({
      transport: transport({ CreateRecTask: create, DescribeTaskStatus: describe }),
      signer: signed,
      hotwordId: 'hw-1',
      pollIntervalMs: 0,
      sleep: async () => undefined,
      billing: ({ durationMs, providerRequestId, reconciliationStatus }) => ({
        billingUnit: 'minute',
        billingQuantity: durationMs / 60_000,
        currency: 'CNY',
        estimatedAmount: reconciliationStatus === 'pending' ? 'pending' : '0.12',
        finalAmount: reconciliationStatus === 'pending' ? 'pending' : '0.12',
      }),
    });

    const outcome = await adapter.execute(input());

    expect(signed.createGetUrl).toHaveBeenCalledWith({
      assetId: 'asset-1',
      objectKey: 'projects/p1/assets/a1.mp4',
      expiresInSeconds: 600,
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      EngineModelType: '16k_zh',
      ChannelNum: 1,
      ResTextFormat: 2,
      SourceType: 0,
      Url: 'https://cos.example.invalid/private/object?signature=redacted',
      HotwordId: 'hw-1',
    });
    expect(describe).toHaveBeenCalledTimes(2);
    expect(describe).toHaveBeenNthCalledWith(1, { TaskId: '42' });
    expect(outcome).toMatchObject({
      kind: 'completed',
      effectClass: 'completed',
      providerRequestId: '42',
      qualityStatus: 'pass',
      hotwordReceipt: 'submitted',
      hotwordReceiptFacts: { submittedCount: 2, omittedCount: 0, reasonCode: null },
      usage: {
        provider: 'tencent_cloud',
        mediaDurationMs: 1_010,
        billingQuantity: 1_010 / 60_000,
        reconciliationStatus: 'final',
        finalAmount: '0.12',
      },
    });
    expect(outcome.kind === 'completed' ? outcome.cues[0] : null).toMatchObject({
      cueIndex: 1, startMs: 10, endMs: 1_010, text: '你好', confidence: 0.91,
    });
  });

  it('未受理和鉴权拒绝均不轮询、不伪造 provider task', async () => {
    const rejectedTransport = transport({
      CreateRecTask: vi.fn(async () => ({ Response: { Error: { Code: 'InvalidParameter', Message: 'provider secret text' } } })),
    });
    const rejected = await new TencentAsrAdapter({ transport: rejectedTransport, signer: signer() }).execute(input());
    expect(rejected).toMatchObject({
      kind: 'failed', effectClass: 'external_not_accepted', providerRequestId: null,
      errorCode: 'ASR_TENCENT_NOT_ACCEPTED', retryable: true,
    });
    expect(rejected.errorDetail).not.toContain('provider secret text');
    expect(rejectedTransport.DescribeTaskStatus).not.toHaveBeenCalled();

    const unauthorizedTransport = transport({
      CreateRecTask: vi.fn(async () => { throw new TencentAsrTransportError('unauthorized'); }),
    });
    const unauthorized = await new TencentAsrAdapter({ transport: unauthorizedTransport, signer: signer() }).execute(input());
    expect(unauthorized).toMatchObject({
      kind: 'failed', effectClass: 'unauthorized', providerRequestId: null,
      errorCode: 'ASR_TENCENT_UNAUTHORIZED', retryable: false,
    });
  });

  it('私有 COS URL 签发失败属于可重试的未受理，不调用腾讯 API', async () => {
    const create = vi.fn(async () => ({ Response: { Data: { TaskId: '99' } } }));
    const outcome = await new TencentAsrAdapter({
      transport: transport({ CreateRecTask: create }),
      signer: { createGetUrl: vi.fn(async () => { throw new Error('secret text'); }) },
    }).execute(input());
    expect(outcome).toMatchObject({
      kind: 'failed', effectClass: 'external_not_accepted', providerRequestId: null,
      errorCode: 'ASR_TENCENT_SOURCE_URL_UNAVAILABLE', retryable: true,
    });
    expect(create).not.toHaveBeenCalled();
    expect(outcome.errorDetail).not.toContain('secret text');
  });

  it('已受理查询未知时进入对账；重放只查询同一 TaskId，不再次 Create', async () => {
    const create = vi.fn(async () => ({ Response: { Data: { TaskId: '123456' } } }));
    const describe = vi.fn(async () => { throw new TencentAsrTransportError('timeout'); });
    const adapter = new TencentAsrAdapter({
      transport: transport({ CreateRecTask: create, DescribeTaskStatus: describe }),
      signer: signer(),
      maxPolls: 2,
      pollIntervalMs: 0,
      sleep: async () => undefined,
    });
    const first = await adapter.execute(input());
    expect(first).toMatchObject({
      kind: 'reconciliation_required',
      effectClass: 'external_unknown',
      providerRequestId: '123456',
      errorCode: 'ASR_TENCENT_STATUS_UNKNOWN',
      usage: { reconciliationStatus: 'pending', providerRequestId: '123456' },
      hotwordReceipt: 'submitted',
      hotwordReceiptFacts: { submittedCount: 2, omittedCount: 0, reasonCode: null },
    });
    expect(create).toHaveBeenCalledTimes(1);

    const resumedDescribe = vi.fn(async ({ TaskId }: TencentDescribeTaskStatusRequest) => ({
      Response: { Data: { TaskId, Status: 2, Result: '恢复结果', AudioDuration: 0.5 } },
    }));
    const resumed = new TencentAsrAdapter({
      transport: transport({ CreateRecTask: create, DescribeTaskStatus: resumedDescribe }),
      signer: signer(),
      maxPolls: 1,
      pollIntervalMs: 0,
    });
    const second = await resumed.execute(input({ providerRequestId: '123456' }));
    expect(second.kind).toBe('completed');
    expect(create).toHaveBeenCalledTimes(1);
    expect(resumedDescribe).toHaveBeenCalledWith({ TaskId: '123456' });
  });

  it('Create 超时即使没有 TaskId 也进入持久对账身份，重放不再次 Create', async () => {
    const create = vi.fn(async () => { throw new TencentAsrTransportError('timeout'); });
    const describe = vi.fn(async () => ({ Response: { Data: { Status: 2, Result: '不应查询' } } }));
    const adapter = new TencentAsrAdapter({ transport: transport({ CreateRecTask: create, DescribeTaskStatus: describe }), signer: signer() });
    const first = await adapter.execute(input());
    expect(first).toMatchObject({
      kind: 'reconciliation_required',
      providerRequestId: 'tencent:create-unknown:job-1:1',
      errorCode: 'ASR_TENCENT_CREATE_UNKNOWN',
      usage: { reconciliationStatus: 'pending' },
    });
    const replay = await adapter.execute(input({ providerRequestId: 'tencent:create-unknown:job-1:1' }));
    expect(replay).toMatchObject({ kind: 'reconciliation_required', providerRequestId: 'tencent:create-unknown:job-1:1' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(describe).not.toHaveBeenCalled();
  });

  it('Create 无 Error 但 TaskId 缺失、非十进制或超 safe-integer 时进入同一未知身份且不重建', async () => {
    const invalidValues: Array<string | number | undefined> = [undefined, 'task-abc', '9007199254740992'];
    for (const value of invalidValues) {
      const create = vi.fn(async () => ({ Response: { Data: value === undefined ? {} : { TaskId: value } } }));
      const describe = vi.fn(async () => ({ Response: { Data: { Status: 2 } } }));
      const adapter = new TencentAsrAdapter({
        transport: transport({ CreateRecTask: create, DescribeTaskStatus: describe }),
        signer: signer(),
      });
      const first = await adapter.execute(input({ jobId: 'job-invalid-task', attemptNumber: 2 }));
      expect(first).toMatchObject({
        kind: 'reconciliation_required',
        effectClass: 'external_unknown',
        providerRequestId: 'tencent:create-unknown:job-invalid-task:2',
        errorCode: 'ASR_TENCENT_CREATE_UNKNOWN',
      });
      const replay = await adapter.execute(input({
        jobId: 'job-invalid-task', attemptNumber: 2,
        providerRequestId: 'tencent:create-unknown:job-invalid-task:2',
      }));
      expect(replay).toMatchObject({ kind: 'reconciliation_required', effectClass: 'external_unknown' });
      expect(create).toHaveBeenCalledTimes(1);
      expect(describe).not.toHaveBeenCalled();
    }
  });

  it('默认轮询上限覆盖超过5次的分钟级任务，并按官方 AudioDuration 秒换算毫秒', async () => {
    let polls = 0;
    const describe = vi.fn(async () => {
      polls += 1;
      return { Response: { Data: polls < 7 ? { Status: 1, AudioDuration: 12.5 } : { Status: 2, Result: '完成', AudioDuration: 12.5 } } };
    });
    const outcome = await new TencentAsrAdapter({
      transport: transport({ DescribeTaskStatus: describe }),
      signer: signer(),
      pollIntervalMs: 0,
      sleep: async () => undefined,
    }).execute(input());
    expect(outcome).toMatchObject({ kind: 'completed', usage: { mediaDurationMs: 12_500 } });
    expect(describe).toHaveBeenCalledTimes(7);
  });

  it('保存可核对的描述元数据，但不把腾讯适配器加入默认 fake registry', () => {
    const descriptor = createTencentAsrDescriptor({
      billingClass: 'metered', currency: 'CNY', maximumAmount: '10', billingUnit: 'minute', maximumQuantity: '100',
    });
    expect(descriptor.provider).toBe('tencent_cloud');
    expect(descriptor.adapter).toBe('tencent_cloud_recorded_v1');
    expect(descriptor.model).toBe('16k_zh');
    expect(descriptor.hotwordCapabilities.supported).toBe(true);
  });

  it('按配置小时单价将官方秒数换算为分钟数量和六位小数金额', () => {
    const billing = createTencentAsrHourlyBilling(1.75);
    expect(billing.capability).toMatchObject({
      billingClass: 'metered', currency: 'CNY', billingUnit: 'minute',
      maximumQuantity: '300', maximumAmount: '8.750000',
    });
    expect(billing.calculate({ durationMs: 2 * 3_600_000, providerRequestId: '42', reconciliationStatus: 'final' }))
      .toMatchObject({ billingQuantity: 120, estimatedAmount: '3.500000', finalAmount: '3.500000' });
    expect(billing.calculate({ durationMs: 0, providerRequestId: '42', reconciliationStatus: 'pending' }))
      .toMatchObject({ estimatedAmount: '8.750000', finalAmount: '0.000000' });
    expect(() => createTencentAsrHourlyBilling(0)).toThrow();
    expect(() => createTencentAsrHourlyBilling(-1)).toThrow();
  });
});
