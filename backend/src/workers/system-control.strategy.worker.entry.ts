import { pathToFileURL } from 'node:url';
import { createPool, type DatabasePool } from '../database/pool.js';
import { SystemControlStrategyWorker } from './system-control.strategy.worker.js';

export const runStrategyWorker = async (input: { database: DatabasePool; signal: AbortSignal; workerId?: string }) => {
  const worker = new SystemControlStrategyWorker(input.database, input.workerId ? { workerId: input.workerId, pollIntervalMs: 250 } : { pollIntervalMs: 250 });
  await worker.runUntilStopped(input.signal);
};

const runStandalone = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('生产环境未配置策略学习 Worker');
  const controller = new AbortController(); const stop = () => controller.abort();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  const database = createPool();
  try { await runStrategyWorker({ database, signal: controller.signal }); }
  finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); await database.end(); }
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) await runStandalone();
