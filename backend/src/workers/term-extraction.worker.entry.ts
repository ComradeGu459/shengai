import { pathToFileURL } from 'node:url';

import { createPool, type DatabasePool } from '../database/pool.js';
import { FilesystemUploadStorage } from '../modules/storage/filesystem-storage.js';
import { createProductionS3ConfigFromEnv, ProductionS3CompatibleUploadStorage } from '../modules/storage/s3-compatible-storage.js';
import { DeterministicFakeTermExtractionAdapter, type TermExtractionAdapter } from '../modules/terms/term-extraction.js';
import { SystemControlSecretService } from '../modules/system-control/system-control.secret.service.js';
import { createSystemControlSecretProviderFromEnv, type SystemControlSecretProvider } from '../modules/system-control/system-control.secret-provider.js';
import type { UploadStorage } from '../modules/uploads/upload-storage.js';
import { TermExtractionWorker } from './term-extraction.worker.js';

export const runTermExtractionWorker = async (input: {
  database: DatabasePool;
  storage: UploadStorage;
  adapter?: TermExtractionAdapter;
  secretProvider?: SystemControlSecretProvider;
  signal: AbortSignal;
  workerId?: string;
  leaseMs?: number;
  pollIntervalMs?: number;
}) => {
  const secretService = new SystemControlSecretService(input.database, input.secretProvider ?? createSystemControlSecretProviderFromEnv());
  const worker = new TermExtractionWorker(input.database, input.storage, input.adapter ?? new DeterministicFakeTermExtractionAdapter(), {
    ...(input.workerId ? { workerId: input.workerId } : {}),
    ...(input.leaseMs === undefined ? {} : { leaseMs: input.leaseMs }),
    ...(input.pollIntervalMs === undefined ? {} : { pollIntervalMs: input.pollIntervalMs }),
    secretKeyResolver: (versionId: string) => secretService.resolveRuntimeKey(versionId),
  });
  await worker.runUntilStopped(input.signal);
};

const createStandaloneStorage = async (): Promise<UploadStorage> => {
  const kind = process.env.QIMAO_UPLOAD_STORAGE_KIND?.trim().toLowerCase() || 'filesystem';
  if (kind === 's3') return new ProductionS3CompatibleUploadStorage(createProductionS3ConfigFromEnv());
  if (kind === 'filesystem') return FilesystemUploadStorage.create(process.env.QIMAO_STORAGE_ROOT);
  throw new Error('QIMAO_UPLOAD_STORAGE_KIND 只能是 filesystem 或 s3。');
};

const runStandalone = async () => {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const database = createPool();
  try {
    await runTermExtractionWorker({
      database,
      storage: await createStandaloneStorage(),
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
