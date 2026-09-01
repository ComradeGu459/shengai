import { randomUUID, scryptSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import {
  createEmployeeAuthConfigFromEnv,
  EmployeeAuthService,
  EMPLOYEE_SESSION_COOKIE,
} from '../../backend/src/modules/employee-auth/employee-auth.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { UPLOAD_DIRECT_CAPABILITY_HEADER } from '../../backend/src/modules/uploads/tus/tus-business.routes.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');

const origin = 'https://milaidi.online';
const directUploadOrigin = 'https://upload.milaidi.online';
const tusHeaders = { 'Tus-Resumable': '1.0.0' };
let databaseName = '';
let databaseCreated = false;
let setupCompleted = false;
let admin: any;
let pool: any;
let root = '';
let app: any;
let base = '';
let service: EmployeeAuthService;

const sessionCookie = () => `${EMPLOYEE_SESSION_COOKIE}=${service.issueSession().token}`;

const mainHeaders = () => ({ Cookie: sessionCookie(), Origin: origin });

const metadata = (name: string) => {
  const encoded = Buffer.from(name).toString('base64');
  return `name ${encoded},filename ${encoded}`;
};

const localTusEndpoint = (endpoint: string) => {
  const parsed = new URL(endpoint);
  expect(parsed.origin).toBe(directUploadOrigin);
  return `${base}${parsed.pathname}`;
};

const createProject = async () => {
  const response = await fetch(`${base}/api/projects`, {
    method: 'POST',
    headers: { ...mainHeaders(), 'idempotency-key': randomUUID(), 'content-type': 'application/json' },
    body: JSON.stringify({ name: `direct ingress ${randomUUID()}` }),
  });
  expect(response.status).toBe(201);
  return (await response.json() as { id: string }).id;
};

const createSession = async (projectId: string, sizeBytes: number) => {
  const response = await fetch(`${base}/api/projects/${projectId}/uploads`, {
    method: 'POST',
    headers: { ...mainHeaders(), 'idempotency-key': randomUUID(), 'content-type': 'application/json' },
    body: JSON.stringify({
      originalFileName: 'DIRECT.srt', mediaKind: 'srt', sizeBytes,
      fileFingerprint: `DIRECT.srt|${sizeBytes}|direct-ingress`, checksumAlgorithm: 'sha256', transportKind: 'tus',
    }),
  });
  expect(response.status).toBe(201);
  return await response.json() as { id: string; projectId: string; storageUploadId: string; sizeBytes: number; tusEndpoint: string; originalFileName: string };
};

const issueCapability = async (uploadId: string) => {
  const response = await fetch(`${base}/api/uploads/${uploadId}/direct-capability`, {
    method: 'POST', headers: { ...mainHeaders() },
  });
  expect(response.status).toBe(200);
  return await response.json() as {
    token: string; tusEndpoint: string; uploadSessionId: string; projectId: string; storageUploadId: string;
    expectedSizeBytes: number; allowedMethods: string[]; expiresAt: string;
  };
};

beforeAll(async () => {
  const salt = Buffer.from('direct-ingress-salt');
  const digest = scryptSync('direct-ingress-password', salt, 32, { N: 16_384, r: 8, p: 1 });
  const config = createEmployeeAuthConfigFromEnv({
    QIMAO_EMPLOYEE_SESSION_REQUIRED: 'true',
    QIMAO_EMPLOYEE_AUTH_USERNAME: 'direct-ingress-employee',
    QIMAO_EMPLOYEE_PASSWORD_VERIFIER: `scrypt-v1$N=16384$r=8$p=1$${salt.toString('base64url')}$${digest.toString('base64url')}`,
    QIMAO_EMPLOYEE_SESSION_SECRET: Buffer.from('direct-ingress-session-secret-32-bytes!').toString('base64url'),
    QIMAO_EMPLOYEE_ORIGIN: origin,
  });
  service = new EmployeeAuthService(config!);

  const source = new URL(getDatabaseUrl());
  const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  databaseName = `qimao_upload_direct_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;
  const databaseUrl = new URL(source); databaseUrl.pathname = `/${databaseName}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  root = await mkdtemp(join(tmpdir(), 'qimao-upload-direct-ingress-'));
  app = createApp({
    database: { query: (...args: any[]) => pool.query(...args), connect: (...args: any[]) => pool.connect(...args), end: async () => undefined },
    employeeAuthService: service,
    employeeSessionRequired: true,
    directUploadOrigin,
    tusDirectory: root,
  });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Fastify 未分配 TCP 端口。');
  base = `http://127.0.0.1:${address.port}`;
  setupCompleted = true;
}, 30_000);

afterAll(async () => {
  if (!setupCompleted) {
    if (root) await rm(root, { recursive: true, force: true });
    void admin?.end();
    return;
  }
  if (app) await app.close();
  if (pool) await pool.end();
  if (admin && databaseName && databaseCreated && setupCompleted) {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [databaseName]);
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    const remaining = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [databaseName]);
    expect(remaining.rowCount).toBe(0);
  }
  if (admin) await admin.end();
  if (root) await rm(root, { recursive: true, force: true });
});

describe('TUS 直连短时能力', () => {
  it('主站签发能力后，直连 POST/HEAD/PATCH 只使用签名资源身份并可恢复', async () => {
    const projectId = await createProject();
    const bytes = Buffer.from('direct-ingress-tus-bytes');
    const session = await createSession(projectId, bytes.length);
    const capability = await issueCapability(session.id);
    expect(capability.uploadSessionId).toBe(session.id);
    expect(capability.projectId).toBe(projectId);
    expect(capability.expectedSizeBytes).toBe(bytes.length);
    expect(capability.tusEndpoint).toBe(`${directUploadOrigin}/api/uploads/tus`);

    const unconfigured = createApp({
      database: { query: (...args: any[]) => pool.query(...args), connect: (...args: any[]) => pool.connect(...args), end: async () => undefined },
      employeeAuthService: service,
      employeeSessionRequired: true,
    });
    const unavailable = await unconfigured.inject({
      method: 'POST',
      url: `/api/uploads/${session.id}/direct-capability`,
      headers: mainHeaders(),
    });
    expect(unavailable.statusCode).toBe(409);
    expect(await unavailable.json()).toMatchObject({ error: { code: 'UPLOAD_TRANSPORT_DISABLED' } });
    await unconfigured.close();
    expect(capability.allowedMethods).toEqual(['POST', 'HEAD', 'PATCH']);
    expect(Date.parse(capability.expiresAt)).toBeGreaterThan(Date.now());

    const directHeaders = {
      ...tusHeaders,
      [UPLOAD_DIRECT_CAPABILITY_HEADER]: capability.token,
      'Upload-Length': String(bytes.length),
      'Upload-Metadata': metadata(session.originalFileName),
    };
    const localEndpoint = localTusEndpoint(capability.tusEndpoint);
    const created = await fetch(localEndpoint, { method: 'POST', headers: directHeaders });
    expect(created.status).toBe(201);
    const location = created.headers.get('location');
    expect(location).toContain(capability.storageUploadId);
    const repeated = await fetch(localEndpoint, { method: 'POST', headers: directHeaders });
    expect(repeated.status).toBe(201);
    expect(repeated.headers.get('location')).toBe(location);

    const resourceUrl = `${localEndpoint}/${capability.storageUploadId}`;
    const head = await fetch(resourceUrl, { method: 'HEAD', headers: { ...tusHeaders, [UPLOAD_DIRECT_CAPABILITY_HEADER]: capability.token } });
    expect(head.status).toBe(200);
    expect(head.headers.get('upload-offset')).toBe('0');
    const patch = await fetch(resourceUrl, {
      method: 'PATCH',
      headers: { ...tusHeaders, [UPLOAD_DIRECT_CAPABILITY_HEADER]: capability.token, 'Content-Type': 'application/offset+octet-stream', 'Upload-Offset': '0', 'Content-Length': String(bytes.length) },
      body: bytes,
    });
    expect(patch.status).toBe(204);
    expect(patch.headers.get('upload-offset')).toBe(String(bytes.length));
    expect((await readFile(join(root, capability.storageUploadId))).equals(bytes)).toBe(true);
    expect((await readdir(root)).filter((name) => !name.endsWith('.json'))).toHaveLength(1);
  });

  it('伪造资源身份、跨项目资源和缺少能力均拒绝，不接受客户端员工头', async () => {
    const firstProject = await createProject();
    const secondProject = await createProject();
    const first = await createSession(firstProject, 4);
    const second = await createSession(secondProject, 4);
    const capability = await issueCapability(first.id);

    const forged = await fetch(`${base}/api/uploads/tus/${second.storageUploadId}`, {
      method: 'HEAD', headers: { ...tusHeaders, [UPLOAD_DIRECT_CAPABILITY_HEADER]: capability.token, 'x-qimao-employee-user': 'attacker' },
    });
    expect(forged.status).toBe(404);
    const tamperedToken = `${capability.token.slice(0, -1)}${capability.token.endsWith('x') ? 'y' : 'x'}`;
    const tampered = await fetch(`${base}/api/uploads/tus/${first.storageUploadId}`, {
      method: 'HEAD', headers: { ...tusHeaders, [UPLOAD_DIRECT_CAPABILITY_HEADER]: tamperedToken },
    });
    expect(tampered.status).toBe(401);
    const expired = service.issueUploadDirectCapability({
      subject: service.subject,
      projectId: first.projectId,
      uploadSessionId: first.id,
      storageUploadId: first.storageUploadId,
      sizeBytes: first.sizeBytes,
      now: Date.now() - 600_000,
      expiresAt: Date.now() - 300_000,
    });
    const expiredResponse = await fetch(`${base}/api/uploads/tus/${first.storageUploadId}`, {
      method: 'HEAD', headers: { ...tusHeaders, [UPLOAD_DIRECT_CAPABILITY_HEADER]: expired.token },
    });
    expect(expiredResponse.status).toBe(401);
    const anonymous = await fetch(`${base}/api/uploads/tus/${first.storageUploadId}`, { method: 'HEAD', headers: tusHeaders });
    expect(anonymous.status).toBe(401);
  });
});
