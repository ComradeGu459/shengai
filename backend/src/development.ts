import { createPool } from './database/pool.js';
import { createDefaultAsrAdapterRegistry } from './modules/asr/asr-adapter-registry.js';
import { startServer } from './server.js';
import { runAsrWorker } from './workers/asr.worker.entry.js';
import { runPreReviewWorker } from './workers/pre-review.worker.entry.js';
import { createDefaultScreenTextAdapterRegistry } from './modules/screen-text/screen-text.adapter-registry.js';
import { runScreenTextWorker } from './workers/screen-text.worker.entry.js';

const controller = new AbortController();
const stop = () => controller.abort();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

const workerDatabase = createPool();
let app: Awaited<ReturnType<typeof startServer>> | null = null;
try {
  app = await startServer();
  await Promise.all([
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
      signal: controller.signal,
    }),
  ]);
} finally {
  process.off('SIGINT', stop);
  process.off('SIGTERM', stop);
  await Promise.all([app?.close(), workerDatabase.end()]);
}
