import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { createPool, type DatabasePool } from '../database/pool.js';
import { PreReviewWorkerRepository } from '../modules/pre-review/pre-review.worker.repository.js';
import { PreReviewWorker } from './pre-review.worker.js';

export const runPreReviewWorker = async (input: {
  database: DatabasePool;
  signal: AbortSignal;
  pollIntervalMs?: number;
}) => {
  const worker = new PreReviewWorker(
    new PreReviewWorkerRepository(input.database),
    {
      workerId: `pre-edit-${randomUUID()}`,
      ...(input.pollIntervalMs === undefined ? {} : { pollIntervalMs: input.pollIntervalMs }),
    },
  );
  await worker.runUntilStopped(input.signal);
};

const runStandalone = async () => {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const database = createPool();
  try {
    await runPreReviewWorker({ database, signal: controller.signal });
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await database.end();
  }
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) await runStandalone();
