import { pathToFileURL } from 'node:url';
import { createPool } from '../database/pool.js';
import { createSystemControlStrategyRuntimeWorker } from './system-control.strategy-runtime.worker.js';

export const runSystemControlStrategyRuntimeWorker = async (input: { database: ReturnType<typeof createPool>; signal: AbortSignal; workerId?: string }) => createSystemControlStrategyRuntimeWorker(input.database, input.workerId ? { workerId: input.workerId } : undefined).runUntilStopped(input.signal);
const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) { const controller = new AbortController(); const stop = () => controller.abort(); process.once('SIGINT', stop); process.once('SIGTERM', stop); const database = createPool(); try { await runSystemControlStrategyRuntimeWorker({ database, signal: controller.signal }); } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); await database.end(); } }
