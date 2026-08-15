import { createHash } from 'node:crypto';

import type {
  ScreenTextAdapterCapabilities,
  ScreenTextCategory,
  ScreenTextExecutionKind,
  ScreenTextPosition,
  ScreenTextProcessingStats,
  ScreenTextUsage,
} from '@qimao-terms-cloud/contracts';

export interface ScreenTextAdapterDescriptorInput {
  kind: ScreenTextExecutionKind;
  adapter: string;
  provider: string;
  model: string;
  language: string;
  deployment: string;
  inputVersion: string;
  outputVersion: string;
  configVersion: string;
  capabilities: ScreenTextAdapterCapabilities;
}

export interface ScreenTextAdapterDescriptor extends Omit<ScreenTextAdapterDescriptorInput, 'configVersion'> {
  configDigest: string;
}

export const createScreenTextAdapterDescriptor = (
  input: ScreenTextAdapterDescriptorInput,
): Readonly<ScreenTextAdapterDescriptor> => Object.freeze({
  kind: input.kind,
  adapter: input.adapter,
  provider: input.provider,
  model: input.model,
  language: input.language,
  deployment: input.deployment,
  inputVersion: input.inputVersion,
  outputVersion: input.outputVersion,
  capabilities: Object.freeze({ ...input.capabilities }),
  configDigest: createHash('sha256').update(JSON.stringify({
    kind: input.kind,
    adapter: input.adapter,
    provider: input.provider,
    model: input.model,
    language: input.language,
    deployment: input.deployment,
    inputVersion: input.inputVersion,
    outputVersion: input.outputVersion,
    configVersion: input.configVersion,
    capabilities: input.capabilities,
  })).digest('hex'),
});

export interface ScreenTextAdapterAsset {
  assetId: string;
  objectKey: string;
  originalFilename: string;
  sizeBytes: number;
  checksumAlgorithm: string;
  checksumValue: string;
}

export interface ScreenTextAdapterTermEntry {
  itemId: string;
  type: string;
  canonicalName: string;
  aliases: string[];
  identityEvidence: string[];
}

export interface ScreenTextAdapterInput {
  batchId: string;
  jobId: string;
  episodeNumber: number;
  attemptNumber: number;
  asset: ScreenTextAdapterAsset;
  termProjectionDigest: string;
  termEntries: ScreenTextAdapterTermEntry[];
  frameStrategyVersion: string;
  dedupeStrategyVersion: string;
}

export interface ScreenTextAdapterCandidate {
  rawText: string;
  startMs: number;
  endMs: number;
  category: ScreenTextCategory;
  position: ScreenTextPosition;
  confidence: number | null;
  systemSuggestion: 'approve' | 'ignore' | null;
  suggestionReason: string | null;
  pairGroupKey: string | null;
  evidence: {
    objectKey: string;
    checksum: string;
    contentType: string;
    sizeBytes: number;
    width: number;
    height: number;
    capturedAtMs: number;
    bytes: Uint8Array;
  };
}

interface ScreenTextOutcomeBase {
  providerRequestId: string | null;
  receipt: 'simulated' | 'submitted' | 'unsupported' | 'unknown';
  stats: ScreenTextProcessingStats;
  usage: ScreenTextUsage;
}

export type ScreenTextAdapterOutcome =
  | ScreenTextOutcomeBase & {
    kind: 'completed';
    videoDurationMs: number;
    candidates: ScreenTextAdapterCandidate[];
  }
  | ScreenTextOutcomeBase & {
    kind: 'failed';
    errorCode: string;
    errorDetail: string;
    retryable: boolean;
    externalSideEffectPossible: boolean;
  }
  | ScreenTextOutcomeBase & {
    kind: 'reconciliation_required';
    providerRequestId: string;
    errorCode: string;
    errorDetail: string;
  };

export interface ScreenTextAdapter {
  readonly descriptor: Readonly<ScreenTextAdapterDescriptor>;
  execute(input: ScreenTextAdapterInput): Promise<ScreenTextAdapterOutcome>;
}

const capabilities: ScreenTextAdapterCapabilities = {
  supportsRegions: true,
  supportsConfidence: true,
  supportsLanguageHints: true,
  maxFramesPerEpisode: 600,
};

export const deterministicScreenTextDescriptor = createScreenTextAdapterDescriptor({
  kind: 'deterministic_fake',
  adapter: 'screen_text_deterministic_fake',
  provider: 'fake',
  model: 'deterministic-v1',
  language: 'zh-CN',
  deployment: 'in_process',
  inputVersion: 'screen-text-input-v1',
  outputVersion: 'screen-text-output-v1',
  configVersion: 'screen-text-fake-config-v1',
  capabilities,
});

const simulatedUsage = (
  descriptor: ScreenTextAdapterDescriptor,
  providerRequestId: string | null,
  reconciliationStatus: 'final' | 'pending',
): ScreenTextUsage => descriptor.kind === 'cloud_api' ? {
  provider: descriptor.provider,
  billingUnit: 'image',
  billingQuantity: 8,
  currency: 'USD',
  estimatedAmount: '0.08',
  finalAmount: reconciliationStatus === 'final' ? '0.08' : '0',
  reconciliationStatus,
  providerRequestId,
} : descriptor.kind === 'self_hosted_worker' ? {
  provider: descriptor.provider,
  billingUnit: 'compute_millisecond',
  billingQuantity: 40,
  currency: 'CNY',
  estimatedAmount: '0',
  finalAmount: '0',
  reconciliationStatus,
  providerRequestId,
} : {
  provider: descriptor.provider,
  billingUnit: 'zero_network_call',
  billingQuantity: 0,
  currency: 'CNY',
  estimatedAmount: '0',
  finalAmount: '0',
  reconciliationStatus,
  providerRequestId,
};

const digest = (input: string | Uint8Array) => createHash('sha256').update(input).digest('hex');

class ZeroNetworkAdapterBase implements ScreenTextAdapter {
  constructor(readonly descriptor: Readonly<ScreenTextAdapterDescriptor>) {}

  async execute(input: ScreenTextAdapterInput): Promise<ScreenTextAdapterOutcome> {
    const lower = input.asset.originalFilename.toLowerCase();
    const requestId = `${this.descriptor.adapter}:${input.jobId}:${input.attemptNumber}`;
    const baseStats = {
      probedFrameCount: 24,
      ocrFrameCount: 8,
      deduplicatedFrameCount: 16,
      candidateCount: 0,
      processingDurationMs: 40,
    };
    if (lower.includes('screen-reconcile')) return {
      kind: 'reconciliation_required',
      providerRequestId: requestId,
      receipt: 'unknown',
      stats: baseStats,
      usage: simulatedUsage(this.descriptor, requestId, 'pending'),
      errorCode: 'SCREEN_TEXT_UNKNOWN_RESULT',
      errorDetail: '零网络桩模拟结果未知，必须先对账。',
    };
    if (lower.includes('screen-always-fail')
      || (lower.includes('screen-fail-once') && input.attemptNumber === 1)) return {
      kind: 'failed',
      providerRequestId: null,
      receipt: 'simulated',
      stats: baseStats,
      usage: simulatedUsage(this.descriptor, null, 'final'),
      errorCode: 'SCREEN_TEXT_RETRYABLE_FAILURE',
      errorDetail: '零网络桩模拟可重试失败。',
      retryable: true,
      externalSideEffectPossible: false,
    };
    const candidates: ScreenTextAdapterCandidate[] = lower.includes('screen-empty') ? [] : [
      {
        rawText: `第${input.episodeNumber}集标题`, startMs: 1_000, endMs: 2_500,
        category: 'title', position: 'center', confidence: 0.98,
        systemSuggestion: 'approve', suggestionReason: null, pairGroupKey: null,
        evidence: this.evidence(input, 1_000, 'title'),
      },
      {
        rawText: `匿名识别第${input.episodeNumber}集第一句`, startMs: 3_000, endMs: 4_200,
        category: 'other', position: 'center', confidence: 0.9,
        systemSuggestion: 'ignore', suggestionReason: 'dialogue_duplicate', pairGroupKey: null,
        evidence: this.evidence(input, 3_000, 'dialogue'),
      },
      ...(lower.includes('screen-dual') ? [{
        rawText: '左侧文字\n右侧文字', startMs: 5_000, endMs: 7_000,
        category: 'interface' as const, position: 'full' as const, confidence: 0.94,
        systemSuggestion: null, suggestionReason: null, pairGroupKey: 'dual-1',
        evidence: this.evidence(input, 5_000, 'dual'),
      }] : []),
      ...(lower.includes('screen-nameplate') ? [{
        rawText: input.termEntries[0]?.canonicalName ?? '匿名人物', startMs: 8_000, endMs: 10_000,
        category: 'nameplate' as const, position: 'left' as const, confidence: 0.95,
        systemSuggestion: 'approve' as const, suggestionReason: null, pairGroupKey: null,
        evidence: this.evidence(input, 8_000, 'nameplate'),
      }] : []),
    ];
    return {
      kind: 'completed',
      providerRequestId: requestId,
      receipt: 'simulated',
      stats: { ...baseStats, candidateCount: candidates.length },
      usage: simulatedUsage(this.descriptor, requestId, 'final'),
      videoDurationMs: 60_000,
      candidates,
    };
  }

  private evidence(input: ScreenTextAdapterInput, capturedAtMs: number, suffix: string) {
    const objectKey = `derived/screen-text/${input.batchId}/${input.episodeNumber}/${suffix}.svg`;
    const content = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#151a23"/><text x="24" y="42" fill="#fff" font-size="20">screen-text-evidence</text><text x="24" y="76" fill="#9ca3af" font-size="16">episode-${input.episodeNumber} · ${capturedAtMs}ms · ${suffix}</text></svg>`;
    const bytes = new TextEncoder().encode(content);
    return {
      objectKey,
      checksum: digest(bytes),
      contentType: 'image/svg+xml',
      sizeBytes: bytes.byteLength,
      width: 640,
      height: 360,
      capturedAtMs,
      bytes,
    };
  }
}

export class DeterministicFakeScreenTextAdapter extends ZeroNetworkAdapterBase {
  constructor() { super(deterministicScreenTextDescriptor); }
}

export class ZeroNetworkCloudApiStub extends ZeroNetworkAdapterBase {
  constructor() {
    super(createScreenTextAdapterDescriptor({
      kind: 'cloud_api', adapter: 'screen_text_cloud_stub', provider: 'cloud_stub',
      model: 'zero-network-cloud-v1', language: 'zh-CN', deployment: 'external_api',
      inputVersion: 'screen-text-input-v1', outputVersion: 'screen-text-output-v1',
      configVersion: 'cloud-stub-config-v1', capabilities,
    }));
  }
}

export class ZeroNetworkSelfHostedWorkerStub extends ZeroNetworkAdapterBase {
  constructor() {
    super(createScreenTextAdapterDescriptor({
      kind: 'self_hosted_worker', adapter: 'screen_text_worker_stub', provider: 'self_hosted_stub',
      model: 'zero-network-worker-v1', language: 'zh-CN', deployment: 'worker_pool',
      inputVersion: 'screen-text-input-v1', outputVersion: 'screen-text-output-v1',
      configVersion: 'worker-stub-config-v1', capabilities,
    }));
  }
}
