import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { createPool, type DatabasePool } from '../database/pool.js';
import {
  type AsrAdapterRegistry,
  createDefaultAsrAdapterRegistry,
} from '../modules/asr/asr-adapter-registry.js';
import {
  DevelopmentAsrSchedulingPolicyReader,
  type AsrSchedulingPolicyReader,
} from '../modules/asr/asr-scheduling-policy.js';
import { AsrWorker } from './asr.worker.js';

export const runAsrWorker = async (input: {
  database: DatabasePool;
  registry: AsrAdapterRegistry;
  signal: AbortSignal;
  policyReader?: AsrSchedulingPolicyReader;
}) => {
  const policyReader = input.policyReader ?? new DevelopmentAsrSchedulingPolicyReader();
  const policy = await policyReader.read();
  const laneCount = Math.max(1, policy.maxGlobalInFlight);
  const entryId = randomUUID();
  await Promise.all(Array.from({ length: laneCount }, (_, index) => {
    const worker = new AsrWorker(
      input.database,
      input.registry,
      undefined,
      { workerId: `asr-${entryId}-${index + 1}` },
      policyReader,
    );
    return worker.runUntilStopped(input.signal);
  }));
};

const runStandalone = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境尚未登记获授权的真实 ASR 适配器。');
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const database = createPool();
  try {
    await runAsrWorker({
      database,
      registry: createDefaultAsrAdapterRegistry(),
      signal: controller.signal,
    });
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await database.end();
  }
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) await runStandalone();
