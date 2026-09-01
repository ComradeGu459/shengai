import { pathToFileURL } from 'node:url';

import { createPool, type DatabasePool } from '../database/pool.js';
import { createProductionS3ConfigFromEnv, ProductionS3CompatibleUploadStorage } from '../modules/storage/s3-compatible-storage.js';
import {
  createDefaultScreenTextAdapterRegistry,
  type ScreenTextAdapterRegistry,
} from '../modules/screen-text/screen-text.adapter-registry.js';
import {
  createLocalOcrAdapterRegistryFromEnv,
  localOcrEnabled,
  LocalOcrConfigurationError,
} from '../modules/screen-text/local-ocr-runtime.js';
import {
  PersistentScreenTextEvidenceStorage,
  getDefaultScreenTextEvidenceStorage,
  type ScreenTextEvidenceStorage,
} from '../modules/screen-text/screen-text.evidence-storage.js';
import { ScreenTextWorker } from './screen-text.worker.js';
import type { UploadStorage } from '../modules/uploads/upload-storage.js';
import type { ScreenTextLocalOcrFrameExtractor } from '../modules/screen-text/screen-text.local-ocr-sidecar.js';
import type { ScreenTextRemoteMediaSource } from '../modules/screen-text/screen-text-media.js';
import {
  createConfiguredScreenTextFrameExtractorFromEnv,
  createScreenTextRemoteMediaSource,
  ScreenTextMediaError,
  type ScreenTextFrameExtractor,
  type ScreenTextObjectUrlSigner,
} from '../modules/screen-text/screen-text-media.js';

type ScreenTextWorkerInput = {
  database: DatabasePool;
  registry: ScreenTextAdapterRegistry;
  evidenceStorage: ScreenTextEvidenceStorage;
  uploadStorage?: UploadStorage;
  mediaFrameExtractor?: ScreenTextLocalOcrFrameExtractor;
  remoteMediaSource?: ScreenTextRemoteMediaSource;
  signal: AbortSignal;
};

type ScreenTextWorkerRunResult = Awaited<ReturnType<ScreenTextWorker['runOnce']>>;

const createScreenTextWorker = (input: ScreenTextWorkerInput) => new ScreenTextWorker(
  input.database, input.registry, input.evidenceStorage, undefined, {
    workerId: 'screen-text-development',
    ...(input.uploadStorage ? { mediaStorage: input.uploadStorage } : {}),
    ...(input.mediaFrameExtractor ? { mediaFrameExtractor: input.mediaFrameExtractor } : {}),
    ...(input.remoteMediaSource ? { remoteMediaSource: input.remoteMediaSource } : {}),
  },
);

export const runScreenTextWorker = async (input: ScreenTextWorkerInput) => createScreenTextWorker(input).runUntilStopped(input.signal);

export const runScreenTextWorkerOnce = async (input: ScreenTextWorkerInput): Promise<ScreenTextWorkerRunResult> => createScreenTextWorker(input).runOnce({ signal: input.signal });

export type ScreenTextWorkerEntryMode = 'continuous' | 'once';

export const parseScreenTextWorkerMode = (args: readonly string[]): ScreenTextWorkerEntryMode => {
  if (!args.length) return 'continuous';
  if (args.length === 1 && args[0] === '--once') return 'once';
  throw new Error('screen-text worker 仅支持无参数常驻模式或单一 --once 参数。');
};

const safeOnceResult = (result: ScreenTextWorkerRunResult) => result.processed ? {
  processed: true as const,
  projectId: result.projectId,
  batchId: result.batchId,
  jobId: result.jobId,
  episodeNumber: result.episodeNumber,
  outcome: result.outcome,
} : { processed: false as const };

export const runScreenTextWorkerEntry = async (input: ScreenTextWorkerInput & {
  mode: ScreenTextWorkerEntryMode;
  writeOutput?: (value: unknown) => void;
}) => {
  try {
    if (input.mode === 'once') {
      const result = await runScreenTextWorkerOnce(input);
      (input.writeOutput ?? ((value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`)))(safeOnceResult(result));
      return result;
    }
    await runScreenTextWorker(input);
    return undefined;
  } finally {
    await input.database.end();
  }
};

/** 生产 Worker 只装配显式启用的本地 PP-OCR；未配置时生产 fail-closed，测试保留零网络默认注册表。 */
export const createScreenTextWorkerRegistryFromEnv = (env: NodeJS.ProcessEnv = process.env): ScreenTextAdapterRegistry => {
  const configured = createLocalOcrAdapterRegistryFromEnv({ env });
  if (configured) return configured;
  if (env.NODE_ENV === 'production') throw new LocalOcrConfigurationError('DISABLED_IN_PRODUCTION');
  return createDefaultScreenTextAdapterRegistry();
};

/**
 * 生产媒体装配：腾讯 OCR 启用时必须同时使用 S3 私有对象签名和显式抽帧可执行文件。
 * 未启用返回 null；缺少任一真实能力稳定 fail-closed，不回退到 fake 或整对象 readObject。
 */
export const createScreenTextWorkerMediaSourceFromEnv = (input: {
  env?: NodeJS.ProcessEnv;
  storage?: ScreenTextObjectUrlSigner;
  extractor?: ScreenTextFrameExtractor;
} = {}): ScreenTextRemoteMediaSource | null => {
  const env = input.env ?? process.env;
  // Tencent OCR 环境仅为历史差量兼容识别，不会进入当前 Worker registry。
  const mediaEnabled = localOcrEnabled(env) || env.QIMAO_TENCENT_OCR_ENABLED?.trim().toLowerCase() === 'true';
  if (!mediaEnabled) return null;
  if (env.QIMAO_UPLOAD_STORAGE_KIND?.trim().toLowerCase() !== 's3') {
    throw new ScreenTextMediaError('SOURCE_STORAGE_UNAVAILABLE');
  }
  const storage = input.storage ?? new ProductionS3CompatibleUploadStorage(createProductionS3ConfigFromEnv(env));
  const extractor = input.extractor ?? createConfiguredScreenTextFrameExtractorFromEnv(env);
  return createScreenTextRemoteMediaSource({ signer: storage, extractor, expiresInSeconds: 600 });
};

/** Worker 的证据存储与媒体 signer 必须接收同一 Production S3 实例。 */
export const createScreenTextWorkerEvidenceStorageFromEnv = (input: {
  env?: NodeJS.ProcessEnv;
  storage?: ProductionS3CompatibleUploadStorage;
} = {}): ScreenTextEvidenceStorage => {
  const env = input.env ?? process.env;
  const mediaEnabled = localOcrEnabled(env)
    || env.QIMAO_TENCENT_OCR_ENABLED?.trim().toLowerCase() === 'true';
  if (!mediaEnabled) return getDefaultScreenTextEvidenceStorage();
  if (env.QIMAO_UPLOAD_STORAGE_KIND?.trim().toLowerCase() !== 's3') {
    throw new ScreenTextMediaError('SOURCE_STORAGE_UNAVAILABLE');
  }
  const storage = input.storage ?? new ProductionS3CompatibleUploadStorage(createProductionS3ConfigFromEnv(env));
  return new PersistentScreenTextEvidenceStorage(storage);
};

const runStandalone = async () => {
  const mode = parseScreenTextWorkerMode(process.argv.slice(2));
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  // 在建立数据库连接前完成生产 OCR 配置/SDK 门，缺失或禁用直接 fail-closed。
  const registry = createScreenTextWorkerRegistryFromEnv();
  const mediaEnabled = localOcrEnabled(process.env)
    || process.env.QIMAO_TENCENT_OCR_ENABLED?.trim().toLowerCase() === 'true';
  const sharedStorage = mediaEnabled
    ? new ProductionS3CompatibleUploadStorage(createProductionS3ConfigFromEnv())
    : undefined;
  const remoteMediaSource = createScreenTextWorkerMediaSourceFromEnv({
    ...(sharedStorage ? { storage: sharedStorage } : {}),
  });
  const database = createPool();
  try {
    await runScreenTextWorkerEntry({
      database, registry, signal: controller.signal, mode,
      evidenceStorage: createScreenTextWorkerEvidenceStorageFromEnv({
        ...(sharedStorage ? { storage: sharedStorage } : {}),
      }),
      ...(sharedStorage ? { uploadStorage: sharedStorage } : {}),
      ...(remoteMediaSource ? { remoteMediaSource } : {}),
    });
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) await runStandalone();
