import { randomUUID } from 'node:crypto';

import { PreReviewWorkerRepository } from '../modules/pre-review/pre-review.worker.repository.js';

export class PreReviewWorker {
  private readonly workerId: string;

  constructor(
    private readonly repository: PreReviewWorkerRepository,
    options: { workerId?: string; leaseMs?: number; pollIntervalMs?: number } = {},
  ) {
    this.workerId = options.workerId ?? `pre-edit-worker-${randomUUID()}`;
    this.leaseMs = options.leaseMs ?? 60_000;
    this.pollIntervalMs = Math.min(Math.max(options.pollIntervalMs ?? 1_000, 50), 60_000);
  }

  private readonly leaseMs: number;
  private readonly pollIntervalMs: number;

  async runOnce() {
    const job = await this.repository.claim(this.workerId, this.leaseMs);
    if (!job) return false;
    await this.repository.prepare(job.id, this.workerId);
    return true;
  }

  async runUntilStopped(signal: AbortSignal) {
    while (!signal.aborted) {
      const processed = await this.runOnce();
      if (processed) continue;
      await new Promise<void>((resolve) => {
        if (signal.aborted) return resolve();
        const onAbort = () => {
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        }, this.pollIntervalMs);
        signal.addEventListener('abort', onAbort, { once: true });
      });
    }
  }
}
