import type {
  AsrAdapter,
  AsrAdapterDescriptor,
  AsrAdapterInput,
  AsrAdapterOutcome,
  AsrBillingCapability,
} from './asr-adapter.js';
import { createAsrAdapterDescriptor } from './asr-adapter.js';
import type {
  AsrHotwordReceiptFacts,
  AsrHotwordReceiptStatus,
  AsrQualityStatus,
  AsrUsage,
} from '@qimao-terms-cloud/contracts';

/**
 * 这是腾讯云官方 Node SDK 的方法边界：SDK 客户端本身通过依赖注入提供
 * CreateRecTask/DescribeTaskStatus，业务层不手写签名或 HTTP 协议。
 * 请求字段保持官方 Recorded ASR API 的命名，以便生产适配器直接包裹 SDK。
 */
export interface TencentCreateRecTaskRequest {
  EngineModelType: string;
  ChannelNum: number;
  ResTextFormat: number;
  SourceType: 0;
  Url: string;
  HotwordId?: string;
  /** 腾讯官方临时热词表，格式为“词|权重”逗号串。 */
  HotwordList?: string;
}

export interface TencentDescribeTaskStatusRequest {
  TaskId: string | number;
}

export interface TencentApiError {
  Code?: string;
  Message?: string;
}

export interface TencentRecTaskData {
  TaskId?: string | number;
  Status?: string | number;
  StatusStr?: string;
  Result?: string;
  ResultDetail?: unknown;
  /** 腾讯 Create/DescribeTaskStatus 的官方单位为秒；领域 Usage 统一换算为毫秒。 */
  AudioDuration?: number;
  ErrorCode?: string | number;
  ErrorMsg?: string;
  QualityStatus?: string;
}

export interface TencentCreateRecTaskResponse {
  Response?: {
    Data?: Pick<TencentRecTaskData, 'TaskId'>;
    Error?: TencentApiError;
    RequestId?: string;
  };
}

export interface TencentDescribeTaskStatusResponse {
  Response?: {
    Data?: TencentRecTaskData;
    Error?: TencentApiError;
    RequestId?: string;
  };
}

export interface TencentAsrTransport {
  CreateRecTask(request: TencentCreateRecTaskRequest): Promise<TencentCreateRecTaskResponse>;
  DescribeTaskStatus(request: TencentDescribeTaskStatusRequest): Promise<TencentDescribeTaskStatusResponse>;
}

export interface TencentPrivateObjectUrlSigner {
  createGetUrl(input: {
    assetId: string;
    objectKey: string;
    expiresInSeconds: number;
  }): Promise<string>;
}

export type TencentAsrTransportFailureCode =
  | 'unauthorized'
  | 'rejected'
  | 'source_unavailable'
  | 'timeout'
  | 'unknown';

/** 只允许调用方用稳定分类构造错误，禁止把供应商原文带入领域结果。 */
export class TencentAsrTransportError extends Error {
  constructor(readonly code: TencentAsrTransportFailureCode) {
    super(code);
    this.name = 'TencentAsrTransportError';
  }
}

export interface TencentBillingFacts {
  billingUnit: string;
  billingQuantity: number;
  currency: string;
  estimatedAmount: string;
  finalAmount: string;
}

export interface TencentAsrAdapterOptions {
  transport: TencentAsrTransport;
  signer: TencentPrivateObjectUrlSigner;
  descriptor?: Readonly<AsrAdapterDescriptor>;
  /** 供应商热词资源 ID；words 本身不会被拼入供应商请求。 */
  hotwordId?: string | null;
  resolveHotwordId?: (input: AsrAdapterInput) => string | null | Promise<string | null>;
  objectUrlTtlSeconds?: number;
  maxPolls?: number;
  pollIntervalMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  billing?: (input: {
    durationMs: number;
    providerRequestId: string | null;
    reconciliationStatus: 'final' | 'pending';
  }) => TencentBillingFacts;
}

const defaultBilling: AsrBillingCapability = {
  billingClass: 'metered',
  currency: 'CNY',
  maximumAmount: '0',
  billingUnit: 'minute',
  maximumQuantity: '0',
};

const roundedCny = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) throw new Error('invalid_cny_amount');
  return (Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000).toFixed(6);
};

/**
 * 腾讯普通录音按分钟计量；控制面报价按最长五小时封顶，实际完成金额按
 * AudioDuration（秒）换算后的小时数乘服务器配置单价计算。该函数不访问网络，
 * 由 runtime 在显式启用时注入 descriptor 与 usage 计算，确保两者使用同一费率。
 */
export const createTencentAsrHourlyBilling = (rateCnyPerHour: number): {
  capability: AsrBillingCapability;
  calculate: (input: {
    durationMs: number;
    providerRequestId: string | null;
    reconciliationStatus: 'final' | 'pending';
  }) => TencentBillingFacts;
} => {
  if (!Number.isFinite(rateCnyPerHour) || rateCnyPerHour <= 0) throw new Error('invalid_cny_rate');
  if (!Number.isFinite(rateCnyPerHour * 5)) throw new Error('invalid_cny_rate');
  const maximumAmount = roundedCny(rateCnyPerHour * 5);
  return {
    capability: {
      billingClass: 'metered',
      currency: 'CNY',
      maximumAmount,
      billingUnit: 'minute',
      maximumQuantity: '300',
    },
    calculate: ({ durationMs, providerRequestId, reconciliationStatus }) => {
      const safeDurationMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
      const billingQuantity = safeDurationMs / 60_000;
      const finalAmount = roundedCny((safeDurationMs / 3_600_000) * rateCnyPerHour);
      return {
        billingUnit: 'minute',
        billingQuantity,
        currency: 'CNY',
        estimatedAmount: reconciliationStatus === 'pending' ? maximumAmount : finalAmount,
        finalAmount: reconciliationStatus === 'pending' ? '0.000000' : finalAmount,
      };
    },
  };
};

export const createTencentAsrDescriptor = (billing: AsrBillingCapability = defaultBilling) =>
  createAsrAdapterDescriptor({
    provider: 'tencent_cloud',
    adapter: 'tencent_cloud_recorded_v1',
    model: '16k_zh',
    language: 'zh-CN',
    configVersion: 'tencent-recorded-asr-v1',
    hotwordCapabilities: { supported: true, maxEntries: 100, maxCharacters: 2_000 },
    billing,
  });

export const tencentAsrDescriptor = createTencentAsrDescriptor();

const stableDetail = (code: string) => {
  if (code === 'unauthorized') return '腾讯云 ASR 鉴权未通过。';
  if (code === 'rejected') return '腾讯云 ASR 未受理识别任务。';
  if (code === 'source_unavailable') return '腾讯云 ASR 源文件授权暂不可用，任务尚未提交。';
  if (code === 'timeout') return '腾讯云 ASR 查询超时，结果需要对账。';
  return '腾讯云 ASR 响应未知，结果需要对账。';
};

const stableCode = (code: string) => {
  if (code === 'unauthorized') return 'ASR_TENCENT_UNAUTHORIZED';
  if (code === 'rejected') return 'ASR_TENCENT_NOT_ACCEPTED';
  if (code === 'source_unavailable') return 'ASR_TENCENT_SOURCE_URL_UNAVAILABLE';
  if (code === 'timeout') return 'ASR_TENCENT_STATUS_TIMEOUT';
  return 'ASR_TENCENT_UNKNOWN_RESULT';
};

const providerErrorClass = (error?: TencentApiError): TencentAsrTransportFailureCode => {
  const code = (error?.Code ?? '').toUpperCase();
  if (code.includes('AUTH') || code.includes('SECRET') || code.includes('SIGN')) return 'unauthorized';
  return 'rejected';
};

const taskIdFrom = (value: string | number | undefined): string | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed > 0) return String(parsed);
  }
  return null;
};

const statusKind = (value: string | number | undefined, statusStr?: string) => {
  if (value === 2 || value === '2') return 'completed' as const;
  if (value === 3 || value === '3') return 'failed' as const;
  if (value === 0 || value === 1 || value === '0' || value === '1') return 'pending' as const;
  const text = `${value ?? ''} ${statusStr ?? ''}`.toLowerCase();
  if (/(success|completed|complete|finish)/.test(text)) return 'completed' as const;
  if (/(fail|error|reject)/.test(text)) return 'failed' as const;
  if (/(wait|doing|running|process|queue)/.test(text)) return 'pending' as const;
  return 'unknown' as const;
};

const numberOr = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const durationMsFrom = (data?: TencentRecTaskData) =>
  Math.max(0, Math.round(numberOr(data?.AudioDuration, 0) * 1_000));

interface CueLike {
  startMs: number;
  endMs: number;
  text: string;
  confidence: number | null;
}

const parseCues = (data: TencentRecTaskData): CueLike[] => {
  const details = Array.isArray(data.ResultDetail) ? data.ResultDetail : [];
  const cues = details.map((entry): CueLike | null => {
    if (!entry || typeof entry !== 'object') return null;
    const item = entry as Record<string, unknown>;
    const text = typeof item.FinalSentence === 'string' ? item.FinalSentence
      : typeof item.Text === 'string' ? item.Text
        : typeof item.text === 'string' ? item.text : '';
    const startMs = Math.max(0, Math.round(numberOr(item.StartMs ?? item.startMs, 0)));
    const endMs = Math.max(startMs + 1, Math.round(numberOr(item.EndMs ?? item.endMs, startMs + 1)));
    const rawConfidence = item.Confidence ?? item.confidence;
    const confidence = typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)
      ? Math.min(1, Math.max(0, rawConfidence)) : null;
    return text ? { startMs, endMs, text, confidence } : null;
  }).filter((cue): cue is CueLike => cue !== null);
  if (cues.length > 0) return cues;
  if (typeof data.Result !== 'string' || data.Result.length === 0) return [];
  const endMs = Math.max(1, durationMsFrom(data));
  return [{ startMs: 0, endMs, text: data.Result, confidence: null }];
};

const qualityFrom = (data: TencentRecTaskData, cues: CueLike[]): AsrQualityStatus => {
  const status = (data.QualityStatus ?? '').toLowerCase();
  if (status === 'rejected' || status === 'reject') return 'rejected';
  if (status === 'warning' || status === 'warn') return 'warning';
  return cues.length === 0 ? 'warning' : 'pass';
};

export interface TencentHotwordList {
  value: string | null;
  submittedCount: number;
  omittedCount: number;
}

/**
 * 按腾讯 CreateRecTask HotwordList 约束生成请求级热词：最多 128 项，
 * 每项最多 30 个 Unicode 字符且最多 10 个汉字，权重固定为 5。
 * 截断后再去重，保持术语版本投影的稳定顺序。
 */
export const buildTencentHotwordList = (words: readonly string[]): TencentHotwordList => {
  const source = words
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
  const seen = new Set<string>();
  const accepted: string[] = [];
  for (const raw of source) {
    const chars: string[] = [];
    let hanCount = 0;
    for (const char of Array.from(raw)) {
      if (chars.length >= 30) break;
      const isHan = /\p{Script=Han}/u.test(char);
      if (isHan && hanCount >= 10) break;
      chars.push(char);
      if (isHan) hanCount += 1;
    }
    const truncated = chars.join('');
    if (!truncated || seen.has(truncated)) continue;
    seen.add(truncated);
    if (accepted.length >= 128) break;
    accepted.push(truncated);
  }
  return {
    value: accepted.length > 0 ? accepted.map((word) => `${word}|5`).join(',') : null,
    submittedCount: accepted.length,
    omittedCount: Math.max(0, source.length - accepted.length),
  };
};

const hotwordFacts = (input: AsrAdapterInput, hotwordId: string | null): {
  receipt: AsrHotwordReceiptStatus;
  facts: AsrHotwordReceiptFacts;
} => {
  const count = input.hotwords.words.length;
  if (input.termVersionId === null) return { receipt: 'unused', facts: { submittedCount: 0, omittedCount: 0, reasonCode: 'no_confirmed_term_version' } };
  if (count === 0) return { receipt: 'submitted', facts: { submittedCount: 0, omittedCount: 0, reasonCode: null } };
  const list = buildTencentHotwordList(input.hotwords.words);
  if (list.submittedCount > 0) {
    return {
      receipt: list.omittedCount > 0 ? 'partially_submitted' : 'submitted',
      facts: { submittedCount: list.submittedCount, omittedCount: list.omittedCount, reasonCode: list.omittedCount > 0 ? 'partial_submission' : null },
    };
  }
  if (hotwordId) return { receipt: 'submitted', facts: { submittedCount: count, omittedCount: 0, reasonCode: null } };
  return { receipt: 'unsupported', facts: { submittedCount: 0, omittedCount: count, reasonCode: 'unsupported' } };
};

export class TencentAsrAdapter implements AsrAdapter {
  readonly descriptor: Readonly<AsrAdapterDescriptor>;
  private readonly ttlSeconds: number;
  private readonly maxPolls: number;
  private readonly pollIntervalMs: number;
  private readonly sleep: (delayMs: number) => Promise<void>;

  constructor(private readonly options: TencentAsrAdapterOptions) {
    this.descriptor = options.descriptor ?? tencentAsrDescriptor;
    this.ttlSeconds = Math.min(Math.max(options.objectUrlTtlSeconds ?? 600, 1), 600);
    // 1 秒轮询默认覆盖约 4 分钟，给现有 5 分钟 Worker lease 留出收尾余量。
    this.maxPolls = Math.min(Math.max(Math.trunc(options.maxPolls ?? 240), 1), 600);
    this.pollIntervalMs = Math.min(Math.max(options.pollIntervalMs ?? 1_000, 0), 60_000);
    this.sleep = options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  }

  private usage(providerRequestId: string | null, reconciliationStatus: 'final' | 'pending', durationMs: number): AsrUsage {
    const facts = this.options.billing?.({ durationMs, providerRequestId, reconciliationStatus }) ?? {
      billingUnit: 'minute',
      billingQuantity: durationMs / 60_000,
      currency: 'CNY',
      estimatedAmount: '0',
      finalAmount: '0',
    };
    return {
      provider: this.descriptor.provider,
      mediaDurationMs: Math.max(0, Math.round(durationMs)),
      billingUnit: facts.billingUnit,
      billingQuantity: Math.max(0, facts.billingQuantity),
      currency: facts.currency,
      estimatedAmount: facts.estimatedAmount,
      finalAmount: facts.finalAmount,
      reconciliationStatus,
      providerRequestId,
    };
  }

  private async resolveHotwordId(input: AsrAdapterInput) {
    if (this.options.resolveHotwordId) {
      try {
        return await this.options.resolveHotwordId(input);
      } catch {
        return null;
      }
    }
    return this.options.hotwordId ?? null;
  }

  private failed(
    input: AsrAdapterInput,
    code: TencentAsrTransportFailureCode,
    providerRequestId: string | null,
    externalSideEffectPossible: boolean,
  ): AsrAdapterOutcome {
    const id = providerRequestId;
    const hotwords = hotwordFacts(input, null);
    return {
      kind: 'failed',
      effectClass: code === 'unauthorized' ? 'unauthorized' : (code === 'unknown' || code === 'timeout') ? 'external_unknown' : 'external_not_accepted',
      providerRequestId: id,
      errorCode: stableCode(code),
      errorDetail: stableDetail(code),
      retryable: code === 'rejected' || code === 'source_unavailable',
      externalSideEffectPossible,
      hotwordReceipt: hotwords.receipt,
      hotwordReceiptFacts: hotwords.facts,
      usage: this.usage(id, 'final', 0),
    };
  }

  private reconciliation(input: AsrAdapterInput, providerRequestId: string, errorCode: string, errorDetail: string, durationMs = 0): AsrAdapterOutcome {
    const hotwords = hotwordFacts(input, null);
    return {
      kind: 'reconciliation_required',
      effectClass: 'external_unknown',
      providerRequestId,
      errorCode,
      errorDetail,
      hotwordReceipt: hotwords.receipt,
      hotwordReceiptFacts: hotwords.facts,
      usage: this.usage(providerRequestId, 'pending', durationMs),
    };
  }

  async execute(input: AsrAdapterInput): Promise<AsrAdapterOutcome> {
    const hotwordId = await this.resolveHotwordId(input);
    const hotwordList = buildTencentHotwordList(input.hotwords.words);
    let providerRequestId = input.providerRequestId ?? null;
    if (providerRequestId?.startsWith('tencent:create-unknown:')) {
      return this.reconciliation(input, providerRequestId, 'ASR_TENCENT_CREATE_UNKNOWN', '腾讯云 ASR 创建响应未知，必须按同一创建身份人工对账。');
    }
    if (providerRequestId && !taskIdFrom(providerRequestId)) {
      return this.reconciliation(input, providerRequestId, 'ASR_TENCENT_TASK_ID_INVALID', '腾讯云 ASR 任务标识无效，必须按同一创建身份人工对账。');
    }
    if (!providerRequestId) {
      let url: string;
      try {
        url = await this.options.signer.createGetUrl({
          assetId: input.asset.assetId,
          objectKey: input.asset.objectKey,
          expiresInSeconds: this.ttlSeconds,
        });
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('invalid_private_object_url');
      } catch {
        return this.failed(input, 'source_unavailable', null, false);
      }
      let created: TencentCreateRecTaskResponse;
      try {
        created = await this.options.transport.CreateRecTask({
          EngineModelType: '16k_zh',
          ChannelNum: 1,
          ResTextFormat: 2,
          SourceType: 0,
          Url: url,
          ...(hotwordId ? { HotwordId: hotwordId } : {}),
          ...(hotwordList.value ? { HotwordList: hotwordList.value } : {}),
        });
      } catch (error) {
        if (error instanceof TencentAsrTransportError && (error.code === 'unknown' || error.code === 'timeout')) {
          return this.reconciliation(input, `tencent:create-unknown:${input.jobId}:${input.attemptNumber}`, 'ASR_TENCENT_CREATE_UNKNOWN', '腾讯云 ASR 创建响应未知，必须按同一创建身份人工对账。');
        }
        if (error instanceof TencentAsrTransportError) return this.failed(input, error.code, null, false);
        return this.reconciliation(input, `tencent:create-unknown:${input.jobId}:${input.attemptNumber}`, 'ASR_TENCENT_CREATE_UNKNOWN', '腾讯云 ASR 创建响应未知，必须按同一创建身份人工对账。');
      }
      if (created.Response?.Error) return this.failed(input, providerErrorClass(created.Response.Error), null, false);
      providerRequestId = taskIdFrom(created.Response?.Data?.TaskId);
      if (!providerRequestId) {
        return this.reconciliation(
          input,
          `tencent:create-unknown:${input.jobId}:${input.attemptNumber}`,
          'ASR_TENCENT_CREATE_UNKNOWN',
          '腾讯云 ASR 创建响应缺少可核对任务标识，必须按同一创建身份人工对账。',
        );
      }
    }

    const hotwords = hotwordFacts(input, hotwordId);
    let lastData: TencentRecTaskData | undefined;
    for (let poll = 0; poll < this.maxPolls; poll += 1) {
      let response: TencentDescribeTaskStatusResponse;
      try {
        response = await this.options.transport.DescribeTaskStatus({ TaskId: providerRequestId });
      } catch {
        return {
          kind: 'reconciliation_required',
          effectClass: 'external_unknown',
          providerRequestId,
          errorCode: 'ASR_TENCENT_STATUS_UNKNOWN',
          errorDetail: '腾讯云 ASR 查询结果未知，必须按同一任务标识对账。',
          hotwordReceipt: hotwords.receipt,
          hotwordReceiptFacts: hotwords.facts,
          usage: this.usage(providerRequestId, 'pending', durationMsFrom(lastData)),
        };
      }
      if (response.Response?.Error) {
        return {
          kind: 'reconciliation_required',
          effectClass: 'external_unknown',
          providerRequestId,
          errorCode: 'ASR_TENCENT_STATUS_UNKNOWN',
          errorDetail: '腾讯云 ASR 查询结果未知，必须按同一任务标识对账。',
          hotwordReceipt: hotwords.receipt,
          hotwordReceiptFacts: hotwords.facts,
          usage: this.usage(providerRequestId, 'pending', durationMsFrom(lastData)),
        };
      }
      const data = response.Response?.Data;
      if (!data) {
        return {
          kind: 'reconciliation_required',
          effectClass: 'external_unknown',
          providerRequestId,
          errorCode: 'ASR_TENCENT_STATUS_UNKNOWN',
          errorDetail: '腾讯云 ASR 查询结果未知，必须按同一任务标识对账。',
          hotwordReceipt: hotwords.receipt,
          hotwordReceiptFacts: hotwords.facts,
          usage: this.usage(providerRequestId, 'pending', 0),
        };
      }
      lastData = data;
      const kind = statusKind(data.Status, data.StatusStr);
      if (kind === 'pending') {
        if (poll + 1 < this.maxPolls) await this.sleep(this.pollIntervalMs);
        continue;
      }
      if (kind === 'unknown') {
        return {
          kind: 'reconciliation_required',
          effectClass: 'external_unknown',
          providerRequestId,
          errorCode: 'ASR_TENCENT_STATUS_UNKNOWN',
          errorDetail: '腾讯云 ASR 返回未识别状态，必须按同一任务标识对账。',
          hotwordReceipt: hotwords.receipt,
          hotwordReceiptFacts: hotwords.facts,
          usage: this.usage(providerRequestId, 'pending', durationMsFrom(data)),
        };
      }
      if (kind === 'failed') {
        return {
          kind: 'failed',
          effectClass: 'external_unknown',
          providerRequestId,
          errorCode: 'ASR_TENCENT_PROVIDER_FAILED',
          errorDetail: '腾讯云 ASR 已受理但返回失败。',
          retryable: false,
          externalSideEffectPossible: true,
          hotwordReceipt: hotwords.receipt,
          hotwordReceiptFacts: hotwords.facts,
          usage: this.usage(providerRequestId, 'final', durationMsFrom(data)),
        };
      }
      const cues = parseCues(data);
      const qualityStatus = qualityFrom(data, cues);
      return {
        kind: 'completed',
        effectClass: qualityStatus === 'rejected' ? 'quality_rejected' : 'completed',
        providerRequestId,
        cues: cues.map((cue, index) => ({ ...cue, cueIndex: index + 1 })),
        qualityStatus,
        qualitySummary: {
          audioCoverageRatio: qualityStatus === 'rejected' ? 0.2 : 1,
          emptyResult: cues.length === 0,
          cueCount: cues.length,
          longSegmentCount: cues.some((cue) => cue.endMs - cue.startMs > 30_000) ? 1 : 0,
          timelineIssueCount: qualityStatus === 'rejected' ? 1 : 0,
          termHitCount: 0,
          lowConfidenceCount: cues.filter((cue) => cue.confidence !== null && cue.confidence < 0.6).length,
          hallucinationSignalCount: qualityStatus === 'rejected' ? 1 : 0,
        },
        hotwordReceipt: hotwords.receipt,
        hotwordReceiptFacts: hotwords.facts,
        usage: this.usage(providerRequestId, 'final', durationMsFrom(data)),
      };
    }
    return {
      kind: 'reconciliation_required',
      effectClass: 'external_unknown',
      providerRequestId,
      errorCode: 'ASR_TENCENT_STATUS_TIMEOUT',
      errorDetail: '腾讯云 ASR 查询超出本次轮询上限，必须按同一任务标识对账。',
      hotwordReceipt: hotwords.receipt,
      hotwordReceiptFacts: hotwords.facts,
      usage: this.usage(providerRequestId, 'pending', durationMsFrom(lastData)),
    };
  }
}
