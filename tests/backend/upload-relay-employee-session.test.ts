import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { S3Client } from '@aws-sdk/client-s3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import {
  createEmployeeAuthConfigFromEnv,
  EmployeeAuthService,
} from '../../backend/src/modules/employee-auth/employee-auth.js';
import { ProductionS3CompatibleUploadStorage } from '../../backend/src/modules/storage/s3-compatible-storage.js';
import { UploadCompletionWorker } from '../../backend/src/workers/upload-completion.worker.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as {
  runner: (options: Record<string, unknown>) => Promise<unknown>;
};
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');

type MockCommand = { input: Record<string, unknown>; constructor: { name: string } };

const origin = 'https://milaidi.online';
const username = 'relay-employee';
const password = 'relay-test-password';
const bytes = Buffer.from('relay-employee-session');
const checksum = createHash('sha256').update(bytes).digest('hex');

let databaseName = '';
let admin: any;
let pool: any;
let app: any;
let uploadedPart: { PartNumber: number; Size: number; ETag: string } | null = null;
const providerCalls: string[] = [];
let storage: ProductionS3CompatibleUploadStorage;

const cookieFrom = (response: { headers: Record<string, string | string[] | undefined> }) => {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  return value?.split(';', 1)[0] ?? '';
};

beforeAll(async () => {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 32, { N: 16_384, r: 8, p: 1 });
  const authConfig = createEmployeeAuthConfigFromEnv({
    QIMAO_EMPLOYEE_SESSION_REQUIRED: 'true',
    QIMAO_EMPLOYEE_AUTH_USERNAME: username,
    QIMAO_EMPLOYEE_PASSWORD_VERIFIER: `scrypt-v1$N=16384$r=8$p=1$${salt.toString('base64url')}$${digest.toString('base64url')}`,
    QIMAO_EMPLOYEE_SESSION_SECRET: randomBytes(32).toString('base64url'),
    QIMAO_EMPLOYEE_ORIGIN: origin,
  });
  const employeeAuthService = new EmployeeAuthService(authConfig!);

  const client = {
    send: async (raw: unknown) => {
      const command = raw as MockCommand;
      providerCalls.push(command.constructor.name);
      switch (command.constructor.name) {
        case 'CreateMultipartUploadCommand': return { UploadId: 'employee-relay-upload-1' };
        case 'UploadPartCommand':
          uploadedPart = {
            PartNumber: Number(command.input.PartNumber),
            Size: Number(command.input.ContentLength),
            ETag: 'employee-relay-etag-1',
          };
          return { ETag: '"employee-relay-etag-1"' };
        case 'ListPartsCommand': return { Parts: uploadedPart ? [uploadedPart] : [] };
        case 'CompleteMultipartUploadCommand': return {};
        case 'HeadObjectCommand': return { ContentLength: bytes.byteLength, Metadata: { sha256: checksum } };
        default: throw new Error(`unexpected relay command ${command.constructor.name}`);
      }
    },
  } as unknown as S3Client;
  storage = new ProductionS3CompatibleUploadStorage({
    endpoint: 'https://cn-sy1.rains3.com',
    bucket: 'milaidi',
    region: 'cn-sy1',
    forcePathStyle: true,
    uploadMode: 'server_relay',
    accessKeyId: 'server-only-access-key',
    secretAccessKey: 'server-only-secret',
    presignTtlSeconds: 900,
  }, { client });

  const source = new URL(getDatabaseUrl());
  const adminUrl = new URL(source);
  adminUrl.pathname = '/postgres';
  databaseName = `qimao_upload_relay_employee_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
  admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const databaseUrl = new URL(source);
  databaseUrl.pathname = `/${databaseName}`;
  await runner({
    databaseUrl: databaseUrl.toString(),
    dir: resolve(backendRoot, 'migrations'),
    direction: 'up',
    migrationsTable: 'schema_migrations',
    checkOrder: true,
    singleTransaction: true,
  });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  app = createApp({
    database: {
      query: (...args: any[]) => pool.query(...args),
      connect: (...args: any[]) => pool.connect(...args),
      end: async () => undefined,
    },
    uploadStorage: storage,
    employeeAuthService,
    employeeSessionRequired: true,
    directUploadOrigin: 'https://upload.milaidi.online',
    uploadConfig: {
      partSizeBytes: 64,
      maxFileSizeBytes: 128,
      sessionTtlMs: 60_000,
      authorizationTtlMs: 30_000,
      perFileConcurrency: 1,
      browserConcurrency: 1,
    },
  });
  await app.ready();
}, 30_000);

afterAll(async () => {
  if (app) await app.close();
  if (pool) await pool.end();
  if (admin && databaseName) {
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
      [databaseName],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [databaseName])).rowCount).toBe(0);
  }
  if (admin) await admin.end();
});

describe('员工会话与外部直连 S3 relay', () => {
  it('返回绝对 relay URL，无 Cookie 的有效 capability 可 PUT，错误来源/缺 token/非 local API 均拒绝', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/employee-auth/login',
      headers: { origin },
      payload: { username, password },
    });
    expect(login.statusCode).toBe(200);
    const cookie = cookieFrom(login);
    expect(cookie).toMatch(/^__Host-qimao_employee_session=/);
    const employeeHeaders = { cookie, origin };

    const project = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...employeeHeaders, 'idempotency-key': randomUUID() },
      payload: { name: '员工 relay 专项' },
    });
    expect(project.statusCode).toBe(201);
    const projectId = project.json().id as string;

    const create = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/uploads`,
      headers: { ...employeeHeaders, 'idempotency-key': randomUUID() },
      payload: {
        originalFileName: 'EP01.srt',
        mediaKind: 'srt',
        sizeBytes: bytes.byteLength,
        fileFingerprint: `EP01.srt|${bytes.byteLength}|relay-employee`,
        checksumAlgorithm: 'sha256',
        checksumValue: checksum,
        transportKind: 'multipart',
      },
    });
    expect(create.statusCode).toBe(201);
    const session = create.json();

    const authorization = await app.inject({
      method: 'POST',
      url: `/api/uploads/${session.id}/parts/authorize`,
      headers: employeeHeaders,
      payload: { partNumber: 1, fileFingerprint: session.fileFingerprint },
    });
    expect(authorization.statusCode).toBe(200);
    const auth = authorization.json();
    expect(auth.uploadRequest.url).toBe(`https://upload.milaidi.online/api/local/uploads/${session.id}/parts/1`);
    expect(auth.uploadRequest).toMatchObject({
      method: 'PUT',
      headers: { authorization: `Bearer ${auth.authorizationToken}` },
    });
    const relayPath = new URL(auth.uploadRequest.url).pathname;

    const preflight = await app.inject({
      method: 'OPTIONS',
      url: relayPath,
      headers: {
        origin,
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(origin);
    expect(preflight.headers['access-control-allow-methods']).toBe('PUT, OPTIONS');
    expect(preflight.headers['access-control-allow-headers']).toBe('Authorization, Content-Type');
    expect(preflight.headers['access-control-expose-headers']).toBe('ETag');
    expect(preflight.headers['access-control-allow-credentials']).toBeUndefined();

    const withoutCookie = await app.inject({
      method: 'PUT',
      url: relayPath,
      headers: {
        origin,
        authorization: `Bearer ${auth.authorizationToken}`,
        'content-type': 'application/octet-stream',
      },
      payload: bytes,
    });
    expect(withoutCookie.statusCode).toBe(200);
    expect(withoutCookie.headers.etag).toBe('employee-relay-etag-1');
    expect(withoutCookie.headers['access-control-allow-origin']).toBe(origin);
    expect(providerCalls.filter((name) => name === 'UploadPartCommand')).toHaveLength(1);

    const wrongOrigin = await app.inject({
      method: 'PUT',
      url: relayPath,
      headers: {
        origin: 'https://evil.example',
        authorization: `Bearer ${auth.authorizationToken}`,
        'content-type': 'application/octet-stream',
      },
      payload: bytes,
    });
    expect(wrongOrigin.statusCode).toBe(403);
    expect(wrongOrigin.json()).toMatchObject({ error: { code: 'UPLOAD_CORS_ORIGIN_INVALID' } });
    expect(providerCalls.filter((name) => name === 'UploadPartCommand')).toHaveLength(1);

    const withoutToken = await app.inject({
      method: 'PUT',
      url: relayPath,
      headers: { origin, 'content-type': 'application/octet-stream' },
      payload: bytes,
    });
    expect(withoutToken.statusCode).toBe(401);
    expect(withoutToken.json()).toMatchObject({ error: { code: 'EMPLOYEE_AUTH_REQUIRED' } });
    expect(providerCalls.filter((name) => name === 'UploadPartCommand')).toHaveLength(1);

    const nonLocal = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/uploads`,
      headers: { origin },
    });
    expect(nonLocal.statusCode).toBe(401);
    expect(nonLocal.json()).toMatchObject({ error: { code: 'EMPLOYEE_AUTH_REQUIRED' } });

    const put = await app.inject({
      method: 'PUT',
      url: relayPath,
      headers: {
        ...employeeHeaders,
        authorization: `Bearer ${auth.authorizationToken}`,
        'content-type': 'application/octet-stream',
      },
      payload: bytes,
    });
    expect(put.statusCode).toBe(200);
    expect(providerCalls.filter((name) => name === 'UploadPartCommand')).toHaveLength(1);

    const confirm = await app.inject({
      method: 'POST',
      url: `/api/uploads/${session.id}/parts/confirm`,
      headers: { ...employeeHeaders, 'idempotency-key': randomUUID() },
      payload: put.json(),
    });
    expect(confirm.statusCode).toBe(200);

    const complete = await app.inject({
      method: 'POST',
      url: `/api/uploads/${session.id}/complete`,
      headers: { ...employeeHeaders, 'idempotency-key': randomUUID() },
      payload: { expectedVersion: confirm.json().version },
    });
    expect(complete.statusCode).toBe(202);
    expect(complete.json()).toMatchObject({ id: session.id, status: 'verifying' });
    const worker = new UploadCompletionWorker(
      pool,
      storage,
      { leaseMs: 60_000, retryDelayMs: 0, maxAttempts: 3 },
      { workerId: randomUUID() },
    );
    expect(await worker.runOnce()).toMatchObject({ processed: true, status: 'completed' });
    const completedSession = await app.inject({ method: 'GET', url: `/api/uploads/${session.id}`, headers: employeeHeaders });
    expect(completedSession.json()).toMatchObject({ id: session.id, status: 'completed' });
    expect(providerCalls.filter((name) => name === 'UploadPartCommand')).toHaveLength(1);
  });
});
