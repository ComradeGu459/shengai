import { randomUUID } from 'node:crypto';
import type { DatabasePool } from '../database/pool.js';
import { SystemControlStrategyRuntimeService } from '../modules/system-control/system-control.strategy-runtime.service.js';

export class SystemControlStrategyRuntimeWorker {
  private readonly workerId: string;
  constructor(private readonly service: SystemControlStrategyRuntimeService, options: { workerId?: string } = {}) { this.workerId = options.workerId ?? `strategy-runtime-${randomUUID()}`; }
  async runOnce() {
    const rows = await this.service.listQueuedImpactIds();
    for (const id of rows) return this.service.processImpact(id, this.workerId);
    return { processed: false };
  }
  async runUntilStopped(signal: AbortSignal) { while (!signal.aborted) { const result = await this.runOnce(); if (!(result as any).processed) await new Promise<void>((resolve) => { const timer = setTimeout(resolve, 250); signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true }); }); } }
}

export const createSystemControlStrategyRuntimeWorker = (database: DatabasePool, options?: { workerId?: string }) => new SystemControlStrategyRuntimeWorker(new SystemControlStrategyRuntimeService(database), options);
