import { randomUUID } from 'node:crypto';

import type { DatabasePool } from '../database/pool.js';
import type { ScreenTextAdapterOutcome } from '../modules/screen-text/screen-text.adapter.js';
import type { ScreenTextAdapterRegistry } from '../modules/screen-text/screen-text.adapter-registry.js';
import type { ScreenTextEvidenceStorage } from '../modules/screen-text/screen-text.evidence-storage.js';
import { ScreenTextWorkerRepository } from '../modules/screen-text/screen-text.worker.repository.js';

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

  constructor(
    database: DatabasePool,
    private readonly registry: ScreenTextAdapterRegistry,
    evidenceStorage: ScreenTextEvidenceStorage,
    private readonly config: ScreenTextWorkerConfig = screenTextWorkerConfig,
    private readonly options: { workerId?: string; clock?: () => Date } = {},
  ) { this.repository = new ScreenTextWorkerRepository(database, evidenceStorage); }

  private now() { return this.options.clock?.() ?? new Date(); }

  async runOnce() {
    const now = this.now();
    const claim = await this.repository.claim({
      workerId: this.options.workerId ?? `screen-text-${randomUUID()}`,
      now,
      leaseExpiresAt: new Date(now.getTime() + this.config.leaseMs),
    });
    if (!claim) return { processed: false as const };
    const adapter = this.registry.resolve(claim.descriptor);
    const outcome = await adapter.execute({
      batchId: claim.batchId, jobId: claim.jobId, episodeNumber: claim.episodeNumber,
      attemptNumber: claim.attemptNumber, asset: claim.asset,
      termProjectionDigest: claim.termProjectionDigest, termEntries: claim.termEntries,
      frameStrategyVersion: claim.frameStrategyVersion, dedupeStrategyVersion: claim.dedupeStrategyVersion,
    });
    validateOutcome(adapter.descriptor.provider, outcome);
    await this.repository.finish(claim, outcome, this.now());
    return {
      processed: true as const, projectId: claim.projectId, batchId: claim.batchId,
      jobId: claim.jobId, episodeNumber: claim.episodeNumber, outcome: outcome.kind,
    };
  }

  async runUntilStopped(signal: AbortSignal) {
    const pollIntervalMs = Math.min(Math.max(this.config.pollIntervalMs, 50), 60_000);
    while (!signal.aborted) {
      const result = await this.runOnce();
      if (!result.processed) await waitForPoll(pollIntervalMs, signal);
    }
  }
}
