import { pathToFileURL } from 'node:url';

import { createPool } from '../database/pool.js';
import type { DeliveryStorage } from '../modules/deliveries/delivery-storage.js';
import { DeliveryWorker, type DeliveryWorkerConfig } from './delivery.worker.js';

export const runDeliveryWorker = async (input: {
  database: ReturnType<typeof createPool>;
  storage: DeliveryStorage;
  signal: AbortSignal;
  config?: DeliveryWorkerConfig;
  workerId?: string;
}) => new DeliveryWorker(
  input.database,
  input.storage,
  input.config,
  input.workerId ? { workerId: input.workerId } : undefined,
).runUntilStopped(input.signal);

const runStandalone = async () => {
  throw new Error('DeliveryWorker 必须由 development.ts 注入与 API 共享的 DeliveryStorage；不支持独立内存进程。');
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) await runStandalone();
