import { createPool } from '../database/pool.js';
import { createSystemControlSecretProviderFromEnv, type SystemControlSecretProvider } from '../modules/system-control/system-control.secret-provider.js';
import { SystemControlSecretValidationWorker, type SystemControlSecretValidationWorkerConfig } from '../modules/system-control/system-control.secret-validation.worker.js';

export const runSystemControlSecretValidationWorker = async (input: {
  database?: ReturnType<typeof createPool>;
  provider?: SystemControlSecretProvider;
  signal: AbortSignal;
  config?: SystemControlSecretValidationWorkerConfig;
}) => new SystemControlSecretValidationWorker(input.database ?? createPool(), input.provider ?? createSystemControlSecretProviderFromEnv(), input.config).runUntilStopped(input.signal);

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  await runSystemControlSecretValidationWorker({ signal: controller.signal });
}
