import { pathToFileURL } from 'node:url';
import { createPool } from '../database/pool.js';
import { createDefaultAsrAdapterRegistry } from '../modules/asr/asr-adapter-registry.js';
import { createDefaultScreenTextAdapterRegistry } from '../modules/screen-text/screen-text.adapter-registry.js';
import {
  createLocalOcrAdapterRegistryFromEnv,
  LocalOcrConfigurationError,
  type LocalOcrTransportFactory,
} from '../modules/screen-text/local-ocr-runtime.js';
import { SystemControlConnectionTestWorker, type SystemControlConnectionTestWorkerConfig, type SystemControlProbe } from '../modules/system-control/system-control.connection-test.worker.js';
import { runRegisteredProbe } from '../modules/system-control/system-control.engine-registry.js';

export const createSystemControlConnectionTestRegistriesFromEnv = (input: {
  env?: NodeJS.ProcessEnv;
  transportFactory?: LocalOcrTransportFactory;
} = {}) => {
  const env = input.env ?? process.env;
  const configured = createLocalOcrAdapterRegistryFromEnv({
    env,
    ...(input.transportFactory ? { transportFactory: input.transportFactory } : {}),
  });
  if (configured) return { asr: createDefaultAsrAdapterRegistry(), screenText: configured };
  if (env.NODE_ENV === 'production') throw new LocalOcrConfigurationError('DISABLED_IN_PRODUCTION');
  return { asr: createDefaultAsrAdapterRegistry(), screenText: createDefaultScreenTextAdapterRegistry() };
};

export const runSystemControlConnectionTestWorker = async (input: {
  database: ReturnType<typeof createPool>;
  signal: AbortSignal;
  config?: SystemControlConnectionTestWorkerConfig;
  workerId?: string;
  env?: NodeJS.ProcessEnv;
  transportFactory?: LocalOcrTransportFactory;
  probe?: SystemControlProbe;
}) => new SystemControlConnectionTestWorker(
  input.database,
  createSystemControlConnectionTestRegistriesFromEnv({
    ...(input.env ? { env: input.env } : {}),
    ...(input.transportFactory ? { transportFactory: input.transportFactory } : {}),
  }),
  input.config,
  {
    ...(input.workerId ? { workerId: input.workerId } : {}),
    probe: input.probe ?? (async ({ engine, claim }) => runRegisteredProbe(engine, { testRunId: claim.testRunId })),
  },
).runUntilStopped(input.signal);

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  const database = createPool();
  try { await runSystemControlConnectionTestWorker({ database, signal: controller.signal }); }
  finally { controller.abort(); process.off('SIGINT', stop); process.off('SIGTERM', stop); await database.end(); }
}
