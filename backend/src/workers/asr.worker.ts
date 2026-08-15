import { randomUUID } from 'node:crypto';

import type { DatabasePool } from '../database/pool.js';
import type { AsrAdapterOutcome } from '../modules/asr/asr-adapter.js';
import type { AsrAdapterRegistry } from '../modules/asr/asr-adapter-registry.js';
import {
  DevelopmentAsrSchedulingPolicyReader,
  type AsrSchedulingPolicyReader,
} from '../modules/asr/asr-scheduling-policy.js';
import { AsrWorkerRepository } from '../modules/asr/asr-worker.repository.js';

export interface AsrWorkerConfig {
  leaseMs: number;
  pollIntervalMs: number;
}

export const asrWorkerConfig: AsrWorkerConfig = {
  leaseMs: 5 * 60 * 1_000,
  pollIntervalMs: 1_000,
};

const validateOutcome = (
  provider: string,
  outcome: AsrAdapterOutcome,
) => {
  const expectedReconciliationStatus = outcome.kind === 'reconciliation_required' ? 'pending' : 'final';
  if (outcome.usage.provider !== provider
    || outcome.usage.providerRequestId !== outcome.providerRequestId
    || outcome.usage.reconciliationStatus !== expectedReconciliationStatus) {
    throw new Error('ASR 适配器返回的 Usage 与登记元数据或执行结果不一致。');
  }
};

const waitForPoll = (delayMs: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) {
    resolve();
    return;
  }
  const onAbort = () => {
    clearTimeout(timer);
    resolve();
  };
  const timer = setTimeout(() => {
    signal.removeEventListener('abort', onAbort);
    resolve();
  }, delayMs);
  signal.addEventListener('abort', onAbort, { once: true });
});

export class AsrWorker {
  private readonly repository: AsrWorkerRepository;

  constructor(
    database: DatabasePool,
    private readonly registry: AsrAdapterRegistry,
    private readonly config: AsrWorkerConfig = asrWorkerConfig,
    private readonly options: { workerId?: string; clock?: () => Date } = {},
    private readonly policyReader: AsrSchedulingPolicyReader = new DevelopmentAsrSchedulingPolicyReader(),
  ) {
    this.repository = new AsrWorkerRepository(database);
  }

  private now() {
    return this.options.clock?.() ?? new Date();
  }

  async runOnce(): Promise<
    { processed: false }
    | { processed: true; projectId: string; episodeNumber: number; batchId: string; jobId: string; outcome: 'completed' | 'failed' | 'reconciliation_required' | 'cancelled' }
  > {
    const workerId = this.options.workerId ?? `asr-${randomUUID()}`;
    const claimedAt = this.now();
    const claim = await this.repository.claim({
      workerId,
      now: claimedAt,
      leaseExpiresAt: new Date(claimedAt.getTime() + this.config.leaseMs),
      policy: await this.policyReader.read(),
    });
    if (!claim) return { processed: false };
    const started = await this.repository.start(claim, this.now());
    if (!started) return {
      processed: true,
      projectId: claim.projectId,
      episodeNumber: claim.episodeNumber,
      batchId: claim.batchId,
      jobId: claim.jobId,
      outcome: 'cancelled',
    };
    const payloadRecorded = await this.repository.recordHotwordPayload(claim);
    if (!payloadRecorded) {
      return {
        processed: true,
        projectId: claim.projectId,
        episodeNumber: claim.episodeNumber,
        batchId: claim.batchId,
        jobId: claim.jobId,
        outcome: 'cancelled',
      };
    }
    const adapter = this.registry.resolve(claim.adapterDescriptor);
    const outcome = await adapter.execute({
      jobId: claim.jobId,
      episodeNumber: claim.episodeNumber,
      asset: claim.asset,
      attemptNumber: claim.attemptNumber,
      retryOfBatchId: claim.retryOfBatchId,
      hasPreviousResult: claim.hasPreviousResult,
      hotwords: claim.hotwords,
    });
    validateOutcome(adapter.descriptor.provider, outcome);
    await this.repository.finish(claim, outcome, this.now());
    return {
      processed: true,
      projectId: claim.projectId,
      episodeNumber: claim.episodeNumber,
      batchId: claim.batchId,
      jobId: claim.jobId,
      outcome: outcome.kind === 'completed'
        ? outcome.qualityStatus === 'rejected' ? 'failed' : 'completed'
        : outcome.kind,
    };
  }

  async runUntilStopped(signal: AbortSignal): Promise<void> {
    const pollIntervalMs = Math.min(Math.max(this.config.pollIntervalMs, 50), 60_000);
    while (!signal.aborted) {
      const result = await this.runOnce();
      if (!result.processed) await waitForPoll(pollIntervalMs, signal);
    }
  }
}
