import pg from 'pg';

import { getDatabaseUrl } from '../config.js';

export type DatabasePoolBackgroundError = Readonly<{
  kind: 'idle_client_error';
  code: string | null;
}>;

export type DatabasePoolOptions = Readonly<{
  onBackgroundError?: (event: DatabasePoolBackgroundError) => void;
}>;

const safeErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('code' in error) || typeof error.code !== 'string') return null;
  return /^[A-Z0-9_]+$/.test(error.code) ? error.code : null;
};

const attachPoolErrorHandler = (pool: pg.Pool, onBackgroundError?: DatabasePoolOptions['onBackgroundError']) => {
  pool.on('error', (error) => {
    const event: DatabasePoolBackgroundError = { kind: 'idle_client_error', code: safeErrorCode(error) };
    try {
      onBackgroundError?.(event);
    } catch {
      // 观察者只用于测试或宿主接线；其异常不能重新制造未处理的连接池错误。
    }
    if (!onBackgroundError) {
      console.error('[database-pool] idle client error', event);
    }
  });
  return pool;
};

export const createPool = (connectionString = getDatabaseUrl(), options: DatabasePoolOptions = {}) => attachPoolErrorHandler(new pg.Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  }), options.onBackgroundError);

export type DatabasePool = ReturnType<typeof createPool>;
