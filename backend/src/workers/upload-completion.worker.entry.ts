import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { uploadCompletionConfig } from '../config.js';
import { createPool, type DatabasePool } from '../database/pool.js';
import { FilesystemUploadStorage } from '../modules/storage/filesystem-storage.js';
import { createProductionS3ConfigFromEnv, ProductionS3CompatibleUploadStorage } from '../modules/storage/s3-compatible-storage.js';
import type { UploadStorage } from '../modules/uploads/upload-storage.js';
import { UploadCompletionWorker } from './upload-completion.worker.js';

const waitForNextPoll = async (signal: AbortSignal, milliseconds: number) => {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      resolve();
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
};

export const runUploadCompletionWorker = async (input: {
  database: DatabasePool;
  storage: UploadStorage;
  signal: AbortSignal;
  pollIntervalMs?: number;
  workerId?: string;
}) => {
  const worker = new UploadCompletionWorker(
    input.database,
    input.storage,
    uploadCompletionConfig,
    { workerId: input.workerId ?? `upload-completion-${randomUUID()}` },
  );
  const pollIntervalMs = Math.max(100, input.pollIntervalMs ?? 1_000);
  while (!input.signal.aborted) {
    const result = await worker.runOnce();
    if (!result.processed) await waitForNextPoll(input.signal, pollIntervalMs);
  }
};

const createProductionStorage = async (): Promise<UploadStorage> => {
  const kind = process.env.QIMAO_UPLOAD_STORAGE_KIND?.trim().toLowerCase() || 'filesystem';
  if (kind === 's3') return new ProductionS3CompatibleUploadStorage(createProductionS3ConfigFromEnv());
  if (kind !== 'filesystem') throw new Error('QIMAO_UPLOAD_STORAGE_KIND 只能是 filesystem 或 s3。');
  return FilesystemUploadStorage.create(process.env.QIMAO_STORAGE_ROOT);
};

const runStandalone = async () => {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('UploadCompletionWorker 独立入口仅允许 production 环境。');
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const database = createPool();
  try {
    const storage = await createProductionStorage();
    await runUploadCompletionWorker({ database, storage, signal: controller.signal });
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await database.end();
  }
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) await runStandalone();
