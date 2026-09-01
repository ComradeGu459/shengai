import { randomUUID } from 'node:crypto';
import type { DatabasePool } from '../database/pool.js';
import { SystemControlStrategyOptimizationService } from '../modules/system-control/system-control.strategy-optimization.service.js';

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) return resolve();
  const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
  const onAbort = () => { clearTimeout(timer); resolve(); };
  signal.addEventListener('abort', onAbort, { once: true });
});

export type StrategyWorkerConfig = Readonly<{ pollIntervalMs: number; workerId?: string }>;

export class SystemControlStrategyWorker {
  private readonly service: SystemControlStrategyOptimizationService;
  private readonly workerId: string;

  constructor(database: DatabasePool, config: StrategyWorkerConfig = { pollIntervalMs: 250 }) {
    this.service = new SystemControlStrategyOptimizationService(database);
    this.workerId = config.workerId ?? `strategy-${randomUUID()}`;
    this.pollIntervalMs = Math.min(Math.max(config.pollIntervalMs, 50), 60_000);
  }

  private readonly pollIntervalMs: number;

  async runOnce() {
    const optimization = await this.service.processOptimization(this.workerId);
    if (optimization.processed) return optimization;
    return this.service.processEvaluation(this.workerId);
  }

  async runUntilStopped(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      const result = await this.runOnce();
      if (!result.processed) await wait(this.pollIntervalMs, signal);
    }
  }
}
