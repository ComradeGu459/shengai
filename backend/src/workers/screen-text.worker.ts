import { randomUUID } from 'node:crypto';

import type { DatabasePool } from '../database/pool.js';
import type { UploadStorage } from '../modules/uploads/upload-storage.js';
import type { ScreenTextAdapterOutcome } from '../modules/screen-text/screen-text.adapter.js';
import type { ScreenTextAdapterRegistry } from '../modules/screen-text/screen-text.adapter-registry.js';
import type { ScreenTextLocalOcrFrameExtractor, ScreenTextLocalOcrMedia } from '../modules/screen-text/screen-text.local-ocr-sidecar.js';
import { ScreenTextMediaError, type ScreenTextRemoteMediaSource } from '../modules/screen-text/screen-text-media.js';
import type { ScreenTextEvidenceStorage } from '../modules/screen-text/screen-text.evidence-storage.js';
import { ScreenTextWorkerRepository, type ScreenTextWorkerClaim } from '../modules/screen-text/screen-text.worker.repository.js';
import { SystemControlBudgetError } from '../modules/system-control/system-control.budget.errors.js';
import { SystemControlBudgetService, billingSnapshotMatches, createBudgetQuote } from '../modules/system-control/system-control.budget.service.js';
import {
  SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS,
  SCREEN_TEXT_MAX_FRAMES_DEFAULT,
} from '../modules/screen-text/screen-text-runtime-config.js';

export interface ScreenTextWorkerConfig { leaseMs: number; pollIntervalMs: number }
export const screenTextWorkerConfig: ScreenTextWorkerConfig = { leaseMs: 5 * 60_000, pollIntervalMs: 1_000 };

const waitForPoll = (delayMs: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) return resolve();
  const onAbort = () => { clearTimeout(timer); resolve(); };
  const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, delayMs);
  signal.addEventListener('abort', onAbort, { once: true });
});

const validateOutcome = (provider: string, outcome: ScreenTextAdapterOutcome) => {
  if (outcome.usage.provider !== provider
    || outcome.usage.providerRequestId !== outcome.providerRequestId
    || outcome.stats.probedFrameCount !== outcome.stats.ocrFrameCount + outcome.stats.deduplicatedFrameCount
    || (outcome.kind === 'completed' && outcome.stats.candidateCount !== outcome.candidates.length)
    || outcome.usage.reconciliationStatus !== (outcome.kind === 'reconciliation_required' ? 'pending' : 'final')) {
    throw new Error('画面字适配器返回的身份、Usage 或抽帧/去重统计不一致。');
  }
};

export class ScreenTextWorker {
  private readonly repository: ScreenTextWorkerRepository;
  private readonly budget: SystemControlBudgetService;

  constructor(
    database: DatabasePool,
    private readonly registry: ScreenTextAdapterRegistry,
    evidenceStorage: ScreenTextEvidenceStorage,
    private readonly config: ScreenTextWorkerConfig = screenTextWorkerConfig,
    private readonly options: { workerId?: string; clock?: () => Date; mediaStorage?: UploadStorage; mediaFrameExtractor?: ScreenTextLocalOcrFrameExtractor; remoteMediaSource?: ScreenTextRemoteMediaSource } = {},
  ) { this.repository = new ScreenTextWorkerRepository(database, evidenceStorage); this.budget = new SystemControlBudgetService(database); }

  private now() { return this.options.clock?.() ?? new Date(); }

  private async readLocalOcrMedia(claim: ScreenTextWorkerClaim, signal: AbortSignal, streamed = false): Promise<ScreenTextLocalOcrMedia> {
    const frameIntervalMs = claim.runtimeConfig?.preset === 'screen_text_openvino_ppocrv6_small'
      ? claim.runtimeConfig.frameIntervalMs : SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS;
    const maxFrames = claim.runtimeConfig?.preset === 'screen_text_openvino_ppocrv6_small'
      ? claim.runtimeConfig.maxFramesPerEpisode : SCREEN_TEXT_MAX_FRAMES_DEFAULT;
    const contentType = (() => {
      const lower = claim.asset.originalFilename.toLowerCase();
      if (lower.endsWith('.mp4')) return 'video/mp4';
      if (lower.endsWith('.webm')) return 'video/webm';
      if (lower.endsWith('.mov')) return 'video/quicktime';
      return null;
    })();
    if (streamed) {
      const source = this.options.remoteMediaSource;
      if (!source) throw new ScreenTextMediaError('SOURCE_STORAGE_UNAVAILABLE');
      if (!contentType) throw new ScreenTextMediaError('EXTRACTOR_UNAVAILABLE');
      try {
        const media = await source.read({
          assetId: claim.asset.assetId, objectKey: claim.asset.objectKey, contentType,
          sizeBytes: claim.asset.sizeBytes, checksumValue: claim.asset.checksumValue,
          frameIntervalMs, maxFrames, signal,
        });
        if (media.frameCount > maxFrames || media.maxFrameCount > maxFrames) throw new ScreenTextMediaError('FRAME_LIMIT_EXCEEDED');
        return {
          inputKind: 'server_extracted_frames', contentType: media.contentType,
          sizeBytes: media.sizeBytes, checksumAlgorithm: 'sha256', checksumValue: media.checksumValue,
          videoDurationMs: media.videoDurationMs, frameCount: media.frameCount, pixelCount: media.pixelCount,
          maxFrameCount: media.maxFrameCount, maxPixels: media.maxPixels, frames: media.frames,
        };
      } catch (error) {
        throw error instanceof ScreenTextMediaError ? error : new ScreenTextMediaError('UNKNOWN');
      }
    }
    const storage = this.options.mediaStorage;
    const extractor = this.options.mediaFrameExtractor;
    if (!storage) throw new ScreenTextMediaError('SOURCE_STORAGE_UNAVAILABLE');
    if (!extractor) throw new ScreenTextMediaError('EXTRACTOR_UNAVAILABLE');
    if (!contentType) throw new ScreenTextMediaError('EXTRACTOR_UNAVAILABLE');
    try {
      const head = await storage.headObject(claim.asset.objectKey);
      if (!head || head.sizeBytes !== claim.asset.sizeBytes || head.checksumValue !== claim.asset.checksumValue) {
        throw new ScreenTextMediaError('SOURCE_STORAGE_UNAVAILABLE');
      }
      const bytes = await storage.readObject(claim.asset.objectKey);
      if (!bytes || bytes.byteLength !== claim.asset.sizeBytes) throw new ScreenTextMediaError('SOURCE_STORAGE_UNAVAILABLE');
      const extracted = await extractor.extract({
        sourceBytes: Uint8Array.from(bytes), contentType, checksumValue: claim.asset.checksumValue,
        maxFrames, maxPixels: 120_000_000, frameIntervalMs, signal,
      });
      const { frames, videoDurationMs } = extracted;
      const pixelCount = frames.reduce((sum, frame) => sum + (
        frame && typeof frame === 'object' && Number.isInteger(frame.width) && Number.isInteger(frame.height)
          ? frame.width * frame.height : 0
      ), 0);
      const frameIds = new Set<number>();
      if (!Number.isInteger(videoDurationMs) || videoDurationMs < 1 || videoDurationMs > 86_400_000
        || !frames.length || frames.length > maxFrames || pixelCount < 1 || pixelCount > 120_000_000
        || frames.some((frame) => !frame || typeof frame !== 'object'
          || frameIds.has(frame.frameIndex)
          || (frameIds.add(frame.frameIndex), frame.frameIndex < 0 || frame.frameIndex >= frames.length)
          || frame.contentType !== 'image/png' && frame.contentType !== 'image/jpeg' && frame.contentType !== 'image/webp'
          || !(frame.bytes instanceof Uint8Array) || frame.bytes.byteLength < 1
          || !Number.isInteger(frame.width) || frame.width < 1 || frame.width > 7_680
          || !Number.isInteger(frame.height) || frame.height < 1 || frame.height > 4_320
          || !Number.isInteger(frame.capturedAtMs) || frame.capturedAtMs < 0 || frame.capturedAtMs > videoDurationMs)) {
        throw new ScreenTextMediaError('FRAME_OUTPUT_INVALID');
      }
      return {
        inputKind: 'server_extracted_frames',
        contentType,
        sizeBytes: bytes.byteLength,
        checksumAlgorithm: 'sha256',
        checksumValue: claim.asset.checksumValue,
        videoDurationMs,
        frameCount: frames.length,
        pixelCount,
        maxFrameCount: maxFrames,
        maxPixels: 120_000_000,
        sourceBytes: Uint8Array.from(bytes),
        frames,
      };
    } catch (error) {
      throw error instanceof ScreenTextMediaError ? error : new ScreenTextMediaError('UNKNOWN');
    }
  }

  async runOnce(input: { signal?: AbortSignal } = {}) {
    await this.budget.recoverReservations(20);
    const now = this.now();
    const claim = await this.repository.claim({
      workerId: this.options.workerId ?? `screen-text-${randomUUID()}`,
      now,
      leaseExpiresAt: new Date(now.getTime() + this.config.leaseMs),
    });
    if (!claim) return { processed: false as const };
    let adapter;
    try {
      adapter = this.registry.resolve(claim.descriptor);
    } catch (error) {
      await this.repository.rejectBeforeExecution(claim, 'SYSTEM_CONTROL_BUDGET_QUOTE_INVALID', '保存的计费快照与已登记 Adapter 不一致。', this.now());
      return { processed: true as const, projectId: claim.projectId, batchId: claim.batchId, jobId: claim.jobId, episodeNumber: claim.episodeNumber, outcome: 'failed' as const };
    }
    if (!billingSnapshotMatches(claim.billingSnapshot, adapter.descriptor.billing)) {
      await this.repository.rejectBeforeExecution(claim, 'SYSTEM_CONTROL_BUDGET_QUOTE_INVALID', '保存的计费快照与已登记 Adapter 不一致。', this.now());
      return { processed: true as const, projectId: claim.projectId, batchId: claim.batchId, jobId: claim.jobId, episodeNumber: claim.episodeNumber, outcome: 'failed' as const };
    }
    let media: ScreenTextLocalOcrMedia | undefined;
    try {
      media = adapter.requiresMedia
        ? await this.readLocalOcrMedia(claim, input.signal ?? new AbortController().signal, adapter.requiresStreamedMedia === true)
        : undefined;
    } catch (error) {
      const mediaError = error instanceof ScreenTextMediaError ? error : new ScreenTextMediaError('UNKNOWN');
      await this.repository.rejectBeforeExecution(claim, mediaError.message, '媒体准备阶段失败，未调用 OCR Adapter。', this.now());
      return { processed: true as const, projectId: claim.projectId, batchId: claim.batchId, jobId: claim.jobId, episodeNumber: claim.episodeNumber, outcome: 'failed' as const };
    }
    const quote = createBudgetQuote(claim.billingSnapshot);
    let reservationId: string | null = null;
    let budgetFacts: { sourceCurrency: string; conversionSnapshotId: string | null; rateDigest: string | null; conversionEffectiveAt: Date | null; maximumAmountCny: string | null } | null = null;
    try {
      const admission = await this.budget.admit({
        attemptId: claim.attemptId, attemptKind: 'screen_text', projectId: claim.projectId,
        resourcePool: 'ocr_api', deploymentVersionId: claim.deploymentVersionId,
        requestId: claim.jobId, quote,
      });
      reservationId = admission.reservationId;
      budgetFacts = admission;
    } catch (error) {
      if (!(error instanceof SystemControlBudgetError)) throw error;
      await this.repository.rejectBeforeExecution(claim, error.code, error.message, this.now());
      return { processed: true as const, projectId: claim.projectId, batchId: claim.batchId, jobId: claim.jobId, episodeNumber: claim.episodeNumber, outcome: 'failed' as const };
    }
    const adapterInput = {
      batchId: claim.batchId, jobId: claim.jobId, episodeNumber: claim.episodeNumber,
      attemptNumber: claim.attemptNumber, attemptId: claim.attemptId, asset: claim.asset,
      ...(media ? { media } : {}),
      termProjectionDigest: claim.termProjectionDigest, termEntries: claim.termEntries,
      frameStrategyVersion: claim.frameStrategyVersion, dedupeStrategyVersion: claim.dedupeStrategyVersion,
      ...(input.signal ? { signal: input.signal } : {}),
    };
    const outcome = await adapter.execute(adapterInput);
    validateOutcome(adapter.descriptor.provider, outcome);
    await this.repository.finish(claim, outcome, this.now(), {
      sourceCurrency: budgetFacts!.sourceCurrency,
      conversionSnapshotId: budgetFacts!.conversionSnapshotId,
      rateDigest: budgetFacts!.rateDigest,
      conversionEffectiveAt: budgetFacts!.conversionEffectiveAt,
      maximumAmountCny: budgetFacts!.maximumAmountCny ?? '0',
    });
    await this.budget.settle({
      reservationId, providerRequestId: outcome.providerRequestId,
      finalQuantity: String(outcome.usage.billingQuantity), finalAmount: outcome.usage.finalAmount,
      reconciliationStatus: outcome.usage.reconciliationStatus === 'final' ? 'final' : 'pending',
      externalSideEffectPossible: outcome.effectClass === 'external_unknown'
        || (outcome.kind === 'failed' && outcome.externalSideEffectPossible),
      requestId: claim.jobId,
    });
    return {
      processed: true as const, projectId: claim.projectId, batchId: claim.batchId,
      jobId: claim.jobId, episodeNumber: claim.episodeNumber, outcome: outcome.kind,
    };
  }

  async runUntilStopped(signal: AbortSignal) {
    const pollIntervalMs = Math.min(Math.max(this.config.pollIntervalMs, 50), 60_000);
    while (!signal.aborted) {
      const result = await this.runOnce({ signal });
      if (!result.processed) await waitForPoll(pollIntervalMs, signal);
    }
  }
}
