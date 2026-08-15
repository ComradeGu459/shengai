import { pathToFileURL } from 'node:url';

import { createPool, type DatabasePool } from '../database/pool.js';
import {
  createDefaultScreenTextAdapterRegistry,
  type ScreenTextAdapterRegistry,
} from '../modules/screen-text/screen-text.adapter-registry.js';
import {
  getDefaultScreenTextEvidenceStorage,
  type ScreenTextEvidenceStorage,
} from '../modules/screen-text/screen-text.evidence-storage.js';
import { ScreenTextWorker } from './screen-text.worker.js';

export const runScreenTextWorker = async (input: {
  database: DatabasePool;
  registry: ScreenTextAdapterRegistry;
  evidenceStorage: ScreenTextEvidenceStorage;
  signal: AbortSignal;
}) => new ScreenTextWorker(
  input.database, input.registry, input.evidenceStorage, undefined, { workerId: 'screen-text-development' },
)
  .runUntilStopped(input.signal);

const runStandalone = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('生产环境尚未登记获授权的真实画面字适配器。');
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const database = createPool();
  try {
    await runScreenTextWorker({
      database, registry: createDefaultScreenTextAdapterRegistry(), signal: controller.signal,
      evidenceStorage: getDefaultScreenTextEvidenceStorage(),
    });
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await database.end();
  }
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) await runStandalone();
