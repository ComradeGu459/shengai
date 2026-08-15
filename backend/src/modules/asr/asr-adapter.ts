import { createHash } from 'node:crypto';

import type {
  AsrCue,
  AsrHotwordReceiptFacts,
  AsrHotwordSummary,
  AsrHotwordReceiptStatus,
  AsrQualityStatus,
  AsrQualitySummary,
  AsrUsage,
} from '@qimao-terms-cloud/contracts';

export interface AsrAdapterDescriptorInput {
  provider: string;
  adapter: string;
  model: string;
  language: string;
  configVersion: string;
  hotwordCapabilities?: {
    supported?: boolean;
    maxEntries?: number | null;
    maxCharacters?: number | null;
  };
}

export interface AsrAdapterDescriptor extends Omit<AsrAdapterDescriptorInput, 'configVersion' | 'hotwordCapabilities'> {
  configDigest: string;
  hotwordCapabilities: {
    supported: boolean;
    maxEntries: number | null;
    maxCharacters: number | null;
  };
}

export const createAsrAdapterDescriptor = (
  input: AsrAdapterDescriptorInput,
): Readonly<AsrAdapterDescriptor> => {
  const hotwordCapabilities = Object.freeze({
    supported: input.hotwordCapabilities?.supported ?? true,
    maxEntries: input.hotwordCapabilities?.maxEntries ?? null,
    maxCharacters: input.hotwordCapabilities?.maxCharacters ?? null,
  });
  const digestInput = {
    provider: input.provider,
    adapter: input.adapter,
    model: input.model,
    language: input.language,
    configVersion: input.configVersion,
  };
  return Object.freeze({
    provider: input.provider,
    adapter: input.adapter,
    model: input.model,
    language: input.language,
    hotwordCapabilities,
    configDigest: createHash('sha256').update(JSON.stringify(digestInput)).digest('hex'),
  });
};

export interface AsrAdapterAsset {
  assetId: string;
  objectKey: string;
  originalFilename: string;
  mediaKind: 'video';
  sizeBytes: number;
  checksum: {
    algorithm: string;
    value: string;
  };
}

export interface AsrAdapterHotwords {
  words: string[];
  summary: AsrHotwordSummary;
}

export interface AsrAdapterInput {
  jobId: string;
  episodeNumber: number;
  asset: AsrAdapterAsset;
  attemptNumber: number;
  retryOfBatchId: string | null;
  hasPreviousResult: boolean;
  hotwords: AsrAdapterHotwords;
}

interface AsrAdapterOutcomeBase {
  usage: AsrUsage;
  hotwordReceipt: AsrHotwordReceiptStatus;
  hotwordReceiptFacts: AsrHotwordReceiptFacts;
}

export type AsrAdapterOutcome =
  | AsrAdapterOutcomeBase & {
    kind: 'completed';
    providerRequestId: string;
    cues: Array<Omit<AsrCue, 'id'>>;
    qualityStatus: AsrQualityStatus;
    qualitySummary: AsrQualitySummary;
  }
  | AsrAdapterOutcomeBase & {
    kind: 'failed';
    providerRequestId: string | null;
    errorCode: string;
    errorDetail: string;
    retryable: boolean;
    externalSideEffectPossible: boolean;
  }
  | AsrAdapterOutcomeBase & {
    kind: 'reconciliation_required';
    providerRequestId: string;
    errorCode: string;
    errorDetail: string;
  };

export interface AsrAdapter {
  readonly descriptor: Readonly<AsrAdapterDescriptor>;
  execute(input: AsrAdapterInput): Promise<AsrAdapterOutcome>;
}

const qualitySummary = (
  cueCount: number,
  status: AsrQualityStatus,
  termHitCount: number,
): AsrQualitySummary => ({
  audioCoverageRatio: status === 'rejected' ? 0.2 : 1,
  emptyResult: cueCount === 0,
  cueCount,
  longSegmentCount: status === 'warning' ? 1 : 0,
  timelineIssueCount: status === 'rejected' ? 1 : 0,
  termHitCount,
  lowConfidenceCount: status === 'warning' ? 1 : 0,
  hallucinationSignalCount: status === 'rejected' ? 1 : 0,
});

export const deterministicFakeDescriptor = createAsrAdapterDescriptor({
  provider: 'fake',
  adapter: 'deterministic_fake',
  model: 'deterministic-v1',
  language: 'zh-CN',
  configVersion: 'deterministic-fake-config-v1',
  hotwordCapabilities: { maxEntries: 100, maxCharacters: 2_000 },
});

const fakeUsage = (
  providerRequestId: string | null,
  reconciliationStatus: 'final' | 'pending',
): AsrUsage => ({
  provider: deterministicFakeDescriptor.provider,
  mediaDurationMs: 0,
  billingUnit: 'fake_call',
  billingQuantity: 0,
  currency: 'CNY',
  estimatedAmount: '0',
  finalAmount: '0',
  reconciliationStatus,
  providerRequestId,
});

export class DeterministicFakeAsrAdapter implements AsrAdapter {
  readonly descriptor = deterministicFakeDescriptor;

  async execute(input: AsrAdapterInput): Promise<AsrAdapterOutcome> {
    const filename = input.asset.originalFilename.toLowerCase();
    const providerRequestId = `fake:${input.jobId}:${input.attemptNumber}`;
    const hotwordReceiptFacts: AsrHotwordReceiptFacts = {
      submittedCount: input.hotwords.words.length,
      omittedCount: 0,
      reasonCode: null,
    };
    if (filename.includes('fake-reconcile')) {
      return {
        kind: 'reconciliation_required',
        providerRequestId,
        errorCode: 'FAKE_UNKNOWN_RESULT',
        errorDetail: '模拟供应商已受理但结果未知，必须先对账。',
        hotwordReceipt: 'simulated',
        hotwordReceiptFacts,
        usage: fakeUsage(providerRequestId, 'pending'),
      };
    }
    if (filename.includes('fake-always-fail')
      || (filename.includes('fake-fail-once') && !input.retryOfBatchId)
      || (filename.includes('fake-pass-then-fail') && input.hasPreviousResult)) {
      return {
        kind: 'failed',
        providerRequestId: null,
        errorCode: 'FAKE_RETRYABLE_FAILURE',
        errorDetail: '模拟本地执行失败，未产生外部付费副作用。',
        retryable: true,
        externalSideEffectPossible: false,
        hotwordReceipt: 'simulated',
        hotwordReceiptFacts,
        usage: fakeUsage(null, 'final'),
      };
    }
    const qualityStatus: AsrQualityStatus = filename.includes('fake-rejected')
      ? 'rejected'
      : filename.includes('fake-warning') ? 'warning' : 'pass';
    const cues: Array<Omit<AsrCue, 'id'>> = [
      {
        cueIndex: 1,
        startMs: 0,
        endMs: qualityStatus === 'warning' ? 35_000 : 1_800,
        text: `匿名识别第${input.episodeNumber}集第一句`,
        confidence: qualityStatus === 'warning' ? 0.62 : 0.96,
      },
      {
        cueIndex: 2,
        startMs: qualityStatus === 'warning' ? 35_000 : 1_900,
        endMs: qualityStatus === 'warning' ? 37_000 : 3_600,
        text: `匿名识别第${input.episodeNumber}集第二句`,
        confidence: qualityStatus === 'rejected' ? 0.2 : 0.94,
      },
    ];
    return {
      kind: 'completed',
      providerRequestId,
      cues,
      qualityStatus,
      qualitySummary: qualitySummary(
        cues.length,
        qualityStatus,
        input.hotwords.words.length > 0 ? 1 : 0,
      ),
      hotwordReceipt: 'simulated',
      hotwordReceiptFacts,
      usage: fakeUsage(providerRequestId, 'final'),
    };
  }
}
