import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runner } from 'node-pg-migrate';

import { getDatabaseUrl } from '../config.js';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

await runner({
  databaseUrl: getDatabaseUrl(),
  dir: resolve(backendRoot, 'migrations'),
  direction: 'up',
  migrationsTable: 'schema_migrations',
  checkOrder: true,
  singleTransaction: true,
});
