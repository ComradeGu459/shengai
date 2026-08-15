import pg from 'pg';

import { getDatabaseUrl } from '../config.js';

export const createPool = (connectionString = getDatabaseUrl()) =>
  new pg.Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

export type DatabasePool = ReturnType<typeof createPool>;
