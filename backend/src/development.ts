import { pathToFileURL } from 'node:url';

import { createPool } from './database/pool.js';
import { createDefaultAsrAdapterRegistry } from './modules/asr/asr-adapter-registry.js';
import { InMemoryDeliveryStorageFake } from './modules/deliveries/in-memory-delivery-storage.fake.js';
import { startServer } from './server.js';
import { runAsrWorker } from './workers/asr.worker.entry.js';
import { runDeliveryWorker } from './workers/delivery.worker.entry.js';
import type { DeliveryWorkerConfig } from './workers/delivery.worker.js';
import { runPreReviewWorker } from './workers/pre-review.worker.entry.js';
import { createDefaultScreenTextAdapterRegistry } from './modules/screen-text/screen-text.adapter-registry.js';
import { runScreenTextWorker } from './workers/screen-text.worker.entry.js';
import { runSystemControlConnectionTestWorker } from './workers/system-control.connection-test.worker.entry.js';
import { runSystemControlStrategyRuntimeWorker } from './workers/system-control.strategy-runtime.worker.entry.js';
import { runTermExtractionWorker } from './workers/term-extraction.worker.entry.js';

export const runDevelopmentDeliveryWorker = async (input: {
  database: ReturnType<typeof createPool>;
  app: Awaited<ReturnType<typeof startServer>>;
  signal: AbortSignal;
  config?: DeliveryWorkerConfig;
}) => runDeliveryWorker({
  database: input.database,
  storage: input.app.deliveryStorage,
  signal: input.signal,
  ...(input.config ? { config: input.config } : {}),
  workerId: 'delivery-development',
});

const runDevelopment = async () => {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  const workerDatabase = createPool();
  let app: Awaited<ReturnType<typeof startServer>> | null = null;
  const workerTasks: Promise<unknown>[] = [];
  try {
    app = await startServer({ deliveryStorage: new InMemoryDeliveryStorageFake() });
    workerTasks.push(
      runAsrWorker({
        database: workerDatabase,
        registry: createDefaultAsrAdapterRegistry(),
        signal: controller.signal,
      }),
      runPreReviewWorker({ database: workerDatabase, signal: controller.signal }),
      runScreenTextWorker({
        database: workerDatabase,
        registry: createDefaultScreenTextAdapterRegistry(),
        evidenceStorage: app.screenTextEvidenceStorage,
        uploadStorage: app.uploadStorage,
        signal: controller.signal,
      }),
      runDevelopmentDeliveryWorker({ database: workerDatabase, app, signal: controller.signal }),
      runSystemControlConnectionTestWorker({ database: workerDatabase, signal: controller.signal }),
      runSystemControlStrategyRuntimeWorker({ database: workerDatabase, signal: controller.signal, workerId: 'strategy-runtime-development' }),
      runTermExtractionWorker({
        database: workerDatabase,
        storage: app.uploadStorage,
        adapter: app.termExtractionAdapter,
        secretProvider: app.systemControlSecretProvider,
        signal: controller.signal,
        workerId: 'term-extraction-development',
      }),
    );
    await Promise.all(workerTasks);
  } finally {
    controller.abort();
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await Promise.allSettled(workerTasks);
    await Promise.all([app?.close(), workerDatabase.end()]);
  }
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) await runDevelopment();
