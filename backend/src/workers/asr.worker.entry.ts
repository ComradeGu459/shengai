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
import { createProductionS3ConfigFromEnv, ProductionS3CompatibleUploadStorage } from '../modules/storage/s3-compatible-storage.js';
import {
  createTencentAsrRegistryFromEnv,
  createTencentAsrSdkFactory,
  createTencentAsrRuntimeConfigFromEnv,
  TencentAsrConfigurationError,
} from '../modules/asr/tencent-asr-runtime.js';
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

/** 生产 Worker 的唯一真实 ASR 装配入口；未显式启用时生产 fail-closed。 */
export const createAsrWorkerRegistryFromEnv = (input: {
  env?: NodeJS.ProcessEnv;
  sdkFactory?: Parameters<typeof createTencentAsrRegistryFromEnv>[0]['sdkFactory'];
  objectUrlSigner?: Parameters<typeof createTencentAsrRegistryFromEnv>[0]['objectUrlSigner'];
} = {}) => {
  const env = input.env ?? process.env;
  const config = createTencentAsrRuntimeConfigFromEnv(env);
  if (!config.enabled) {
    if (config.production) throw new TencentAsrConfigurationError('DISABLED_IN_PRODUCTION');
    return createDefaultAsrAdapterRegistry();
  }
  let objectUrlSigner = input.objectUrlSigner;
  if (!objectUrlSigner) {
    if (env.QIMAO_UPLOAD_STORAGE_KIND?.trim().toLowerCase() !== 's3') {
      throw new TencentAsrConfigurationError('CONFIG_INVALID');
    }
    const storageConfig = createProductionS3ConfigFromEnv(env);
    if (storageConfig.provider !== 'tencent-cos') {
      throw new TencentAsrConfigurationError('CONFIG_INVALID');
    }
    objectUrlSigner = new ProductionS3CompatibleUploadStorage(storageConfig);
  }
  return createTencentAsrRegistryFromEnv({
    env,
    sdkFactory: input.sdkFactory ?? createTencentAsrSdkFactory(),
    objectUrlSigner,
  });
};

const runStandalone = async () => {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const database = createPool();
  try {
    await runAsrWorker({
      database,
      registry: createAsrWorkerRegistryFromEnv(),
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
