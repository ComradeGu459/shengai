import { randomUUID } from 'node:crypto';

import type { DatabasePool } from '../database/pool.js';
import type { AsrAdapterOutcome } from '../modules/asr/asr-adapter.js';
import type { AsrAdapterRegistry } from '../modules/asr/asr-adapter-registry.js';
import {
  DevelopmentAsrSchedulingPolicyReader,
  type AsrSchedulingPolicyReader,
} from '../modules/asr/asr-scheduling-policy.js';
import { AsrWorkerRepository } from '../modules/asr/asr-worker.repository.js';
import { SystemControlBudgetError } from '../modules/system-control/system-control.budget.errors.js';
import { SystemControlBudgetService, billingSnapshotMatches, createBudgetQuote } from '../modules/system-control/system-control.budget.service.js';

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

/** 预算合同最多接受 12 位小数；数量来自毫秒换算，必须在 Worker 边界确定性收敛。 */
export const toBudgetDecimal = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) throw new Error('ASR 用量数量无效。');
  const parts = value.toFixed(12).split('.');
  const whole = parts[0] ?? '0';
  const fraction = parts[1] ?? '';
  const normalized = fraction.replace(/0+$/u, '');
  const result = normalized ? `${whole}.${normalized}` : whole;
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,12})?$/u.test(result)) throw new Error('ASR 用量数量超出预算十进制合同。');
  return result;
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
  private readonly budget: SystemControlBudgetService;

  constructor(
    database: DatabasePool,
    private readonly registry: AsrAdapterRegistry,
    private readonly config: AsrWorkerConfig = asrWorkerConfig,
    private readonly options: { workerId?: string; clock?: () => Date } = {},
    private readonly policyReader: AsrSchedulingPolicyReader = new DevelopmentAsrSchedulingPolicyReader(),
  ) {
    this.repository = new AsrWorkerRepository(database);
    this.budget = new SystemControlBudgetService(database);
  }

  private now() {
    return this.options.clock?.() ?? new Date();
  }

  async runOnce(): Promise<
    { processed: false }
    | { processed: true; projectId: string; episodeNumber: number; batchId: string; jobId: string; outcome: 'completed' | 'failed' | 'reconciliation_required' | 'cancelled' }
  > {
    await this.budget.recoverReservations(20);
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
    let adapter;
    try {
      adapter = this.registry.resolve(claim.adapterDescriptor);
    } catch (error) {
      await this.repository.rejectBeforeExecution(claim, 'SYSTEM_CONTROL_BUDGET_QUOTE_INVALID', '保存的计费快照与已登记 Adapter 不一致。', this.now());
      return { processed: true, projectId: claim.projectId, episodeNumber: claim.episodeNumber, batchId: claim.batchId, jobId: claim.jobId, outcome: 'failed' };
    }
    if (!billingSnapshotMatches(claim.billingSnapshot, adapter.descriptor.billing)) {
      await this.repository.rejectBeforeExecution(claim, 'SYSTEM_CONTROL_BUDGET_QUOTE_INVALID', '保存的计费快照与已登记 Adapter 不一致。', this.now());
      return { processed: true, projectId: claim.projectId, episodeNumber: claim.episodeNumber, batchId: claim.batchId, jobId: claim.jobId, outcome: 'failed' };
    }
    const quote = createBudgetQuote(claim.billingSnapshot);
    let reservationId: string | null = null;
    let budgetFacts: { sourceCurrency: string; conversionSnapshotId: string | null; rateDigest: string | null; conversionEffectiveAt: Date | null; maximumAmountCny: string | null } | null = null;
    try {
      const admission = await this.budget.admit({
        attemptId: claim.attemptId, attemptKind: 'asr', projectId: claim.projectId,
        resourcePool: 'asr_api', deploymentVersionId: claim.deploymentVersionId,
        requestId: claim.jobId, quote,
      });
      reservationId = admission.reservationId;
      budgetFacts = admission;
    } catch (error) {
      if (!(error instanceof SystemControlBudgetError)) throw error;
      await this.repository.rejectBeforeExecution(claim, error.code, error.message, this.now());
      return { processed: true, projectId: claim.projectId, episodeNumber: claim.episodeNumber, batchId: claim.batchId, jobId: claim.jobId, outcome: 'failed' };
    }
    const outcome = await adapter.execute({
      jobId: claim.jobId,
      episodeNumber: claim.episodeNumber,
      asset: claim.asset,
      attemptNumber: claim.attemptNumber,
      providerRequestId: claim.providerRequestId,
      retryOfBatchId: claim.retryOfBatchId,
      hasPreviousResult: claim.hasPreviousResult,
      termVersionId: claim.termVersionId,
      hotwords: claim.hotwords,
    });
    validateOutcome(adapter.descriptor.provider, outcome);
    await this.repository.finish(claim, outcome, this.now(), {
      sourceCurrency: budgetFacts!.sourceCurrency,
      conversionSnapshotId: budgetFacts!.conversionSnapshotId,
      rateDigest: budgetFacts!.rateDigest,
      conversionEffectiveAt: budgetFacts!.conversionEffectiveAt,
      maximumAmountCny: budgetFacts!.maximumAmountCny ?? '0',
    });
    try {
      await this.budget.settle({
        reservationId, providerRequestId: outcome.providerRequestId,
        finalQuantity: toBudgetDecimal(outcome.usage.billingQuantity), finalAmount: outcome.usage.finalAmount,
        reconciliationStatus: outcome.usage.reconciliationStatus === 'final' ? 'final' : 'pending',
        externalSideEffectPossible: outcome.effectClass === 'external_unknown'
          || (outcome.kind === 'failed' && outcome.externalSideEffectPossible),
        requestId: claim.jobId,
      });
    } catch {
      // finish 已经持久化结果；下一轮 recoverReservations 只按已存 Attempt/Usage 做 DB 收敛，绝不再次调用 Adapter。
    }
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
