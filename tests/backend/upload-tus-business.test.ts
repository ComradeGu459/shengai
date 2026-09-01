import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import http from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');

const allowedProjects = { ids: [] as string[] };
const tusHeaders = { 'Tus-Resumable': '1.0.0' };
let databaseName = '';
let admin: any;
let pool: any;
let root = '';
let app: any;

const startApp = async () => {
  app = createApp({
    database: { query: (...args: any[]) => pool.query(...args), connect: (...args: any[]) => pool.connect(...args), end: async () => undefined },
    employeeSessionRequired: true,
    employeePrincipalResolver: () => ({ subject: 'tus-test-employee', audience: 'employee', capabilities: ['tasks:read'], projectAccess: 'listed', projectIds: allowedProjects.ids }),
    tusDirectory: root,
  });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Fastify 未分配 TCP 端口。');
  return `http://127.0.0.1:${address.port}`;
};

const createProject = async (base: string) => {
  const response = await fetch(`${base}/api/projects`, {
    method: 'POST', headers: { 'idempotency-key': randomUUID(), 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'tus 业务接线隔离测试' }),
  });
  expect(response.status).toBe(201);
  return (await response.json() as { id: string }).id;
};

const metadata = (name: string, type = 'application/x-subrip') => {
  const encodedName = Buffer.from(name).toString('base64');
  const encodedType = Buffer.from(type).toString('base64');
  // 这是 allowedMetaFields 包含 name/type 时 @uppy/tus 发出的真实四键形状。
  return `name ${encodedName},type ${encodedType},filename ${encodedName},filetype ${encodedType}`;
};

beforeAll(async () => {
  const source = new URL(getDatabaseUrl());
  const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  databaseName = `qimao_upload_tus_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const databaseUrl = new URL(source); databaseUrl.pathname = `/${databaseName}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  root = await mkdtemp(join(tmpdir(), 'qimao-upload-tus-business-'));
});

afterAll(async () => {
  if (app) await app.close();
  if (pool) await pool.end();
  if (admin && databaseName) {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [databaseName]);
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    const remaining = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [databaseName]);
    expect(remaining.rowCount).toBe(0);
  }
  if (admin) await admin.end();
  if (root) await rm(root, { recursive: true, force: true });
});

describe('业务 upload_session 接线 tus', () => {
  it('同一 create 命令稳定返回 tus 身份，POST/HEAD/PATCH 可重启恢复且跨项目拒绝', async () => {
    const bytes = Buffer.from('tus-business-resume-abcdefghijklmnopqrstuvwxyz');
    const firstBase = await startApp();
    const projectId = await createProject(firstBase);
    allowedProjects.ids = [projectId];
    const key = randomUUID();
    const payload = {
      originalFileName: 'EP01.srt', mediaKind: 'srt', sizeBytes: bytes.length,
      fileFingerprint: `EP01.srt|${bytes.length}|tus-business`, checksumAlgorithm: 'sha256',
      transportKind: 'tus',
    };
    const createdResponse = await fetch(`${firstBase}/api/projects/${projectId}/uploads`, {
      method: 'POST', headers: { ...tusHeaders, 'Idempotency-Key': key, 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json() as { id: string; storageUploadId?: string; tusEndpoint: string; transportKind: string; sizeBytes: number; originalFileName: string };
    expect(created.transportKind).toBe('tus');
    expect(created.tusEndpoint).toBe('/api/uploads/tus');
    expect(created.storageUploadId).toMatch(/^[A-Za-z0-9_-]{1,255}$/);
    const command = await fetch(`${firstBase}/api/projects/${projectId}/uploads/commands/${key}`);
    expect(command.status).toBe(200);
    const recovered = (await command.json() as { session: typeof created }).session;
    expect(recovered.storageUploadId).toBe(created.storageUploadId);
    const storageUploadId = (await pool.query('SELECT storage_upload_id FROM upload_sessions WHERE id=$1', [created.id])).rows[0].storage_upload_id as string;
    expect(created.storageUploadId).toBe(storageUploadId);
    const legacyAuthorize = await fetch(`${firstBase}/api/uploads/${created.id}/parts/authorize`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ partNumber: 1, fileFingerprint: payload.fileFingerprint }),
    });
    expect(legacyAuthorize.status).toBe(409);
    expect((await legacyAuthorize.json() as { error: { code: string } }).error.code).toBe('UPLOAD_TRANSPORT_MISMATCH');

    const createTus = await fetch(`${firstBase}${created.tusEndpoint}`, {
      method: 'POST', headers: { ...tusHeaders, [SESSION_HEADER]: created.id, 'Upload-Length': String(bytes.length), 'Upload-Metadata': metadata(created.originalFileName) },
    });
    expect(createTus.status).toBe(201);
    const firstLocation = createTus.headers.get('location');
    expect(firstLocation).toContain(storageUploadId);
    const firstHead = await fetch(`${firstBase}${created.tusEndpoint}/${storageUploadId}`, { method: 'HEAD', headers: tusHeaders });
    expect(firstHead.status).toBe(200);
    await patch(firstBase, storageUploadId, 0, bytes.subarray(0, 10));

    await app.close();
    const secondBase = await startApp();
    const resumedHead = await fetch(`${secondBase}${created.tusEndpoint}/${storageUploadId}`, { method: 'HEAD', headers: tusHeaders });
    expect(resumedHead.status).toBe(200);
    expect(resumedHead.headers.get('upload-offset')).toBe('10');
    await patch(secondBase, storageUploadId, 10, bytes.subarray(10));
    const duplicate = await fetch(`${secondBase}${created.tusEndpoint}`, {
      method: 'POST', headers: { ...tusHeaders, [SESSION_HEADER]: recovered.id, 'Upload-Length': String(bytes.length), 'Upload-Metadata': metadata(created.originalFileName) },
    });
    expect(duplicate.status).toBe(201);
    expect(duplicate.headers.get('location')).toBe(firstLocation);
    const files = await readdir(root);
    expect(files.filter((name) => !name.endsWith('.json'))).toHaveLength(1);
    const stored = await readFile(join(root, storageUploadId));
    expect(stored.equals(bytes)).toBe(true);

    const otherProjectId = await createProject(secondBase);
    allowedProjects.ids = [otherProjectId];
    const forbidden = await fetch(`${secondBase}${created.tusEndpoint}/${storageUploadId}`, { method: 'HEAD', headers: tusHeaders });
    expect(forbidden.status).toBe(404);
  });

  it('业务 Tus 路由连续写入三个 16MiB PATCH，每片沿用服务端 offset', async () => {
    const base = await startApp();
    const projectId = await createProject(base);
    allowedProjects.ids = [projectId];
    const bytes = Buffer.alloc(48 * 1024 * 1024, 0x5a);
    const response = await fetch(`${base}/api/projects/${projectId}/uploads`, {
      method: 'POST',
      headers: { ...tusHeaders, 'Idempotency-Key': randomUUID(), 'content-type': 'application/json' },
      body: JSON.stringify({
        originalFileName: 'EP02.mp4', mediaKind: 'video', sizeBytes: bytes.length,
        fileFingerprint: `EP02.mp4|${bytes.length}|two-patch`, checksumAlgorithm: 'sha256', transportKind: 'tus',
      }),
    });
    expect(response.status).toBe(201);
    const session = await response.json() as { id: string; storageUploadId: string; tusEndpoint: string; originalFileName: string };
    const created = await fetch(`${base}${session.tusEndpoint}`, {
      method: 'POST',
      headers: { ...tusHeaders, [SESSION_HEADER]: session.id, 'Upload-Length': String(bytes.length), 'Upload-Metadata': metadata(session.originalFileName, 'video/mp4') },
    });
    expect(created.status).toBe(201);

    const chunkSize = 16 * 1024 * 1024;
    const firstChunk = bytes.subarray(0, chunkSize);
    const secondChunk = bytes.subarray(chunkSize, chunkSize * 2);
    const thirdChunk = bytes.subarray(chunkSize * 2);
    await patch(base, session.storageUploadId, 0, firstChunk);
    const head = await fetch(`${base}${session.tusEndpoint}/${session.storageUploadId}`, { method: 'HEAD', headers: tusHeaders });
    expect(head.status).toBe(200);
    expect(head.headers.get('upload-offset')).toBe(String(firstChunk.length));
    await patch(base, session.storageUploadId, firstChunk.length, secondChunk);
    await patch(base, session.storageUploadId, firstChunk.length + secondChunk.length, thirdChunk);
  });

  it('声明 2MiB 但断流只送部分字节时不返回 204，offset 回滚后可恢复', async () => {
    const base = await startApp();
    const projectId = await createProject(base);
    allowedProjects.ids = [projectId];
    const bytes = Buffer.alloc(2 * 1024 * 1024, 0x33);
    const response = await fetch(`${base}/api/projects/${projectId}/uploads`, {
      method: 'POST',
      headers: { ...tusHeaders, 'Idempotency-Key': randomUUID(), 'content-type': 'application/json' },
      body: JSON.stringify({
        originalFileName: 'EP03.srt', mediaKind: 'srt', sizeBytes: bytes.length,
        fileFingerprint: `EP03.srt|${bytes.length}|truncated`, checksumAlgorithm: 'sha256', transportKind: 'tus',
      }),
    });
    expect(response.status).toBe(201);
    const session = await response.json() as { id: string; storageUploadId: string; tusEndpoint: string; originalFileName: string };
    const created = await fetch(`${base}${session.tusEndpoint}`, {
      method: 'POST',
      headers: { ...tusHeaders, [SESSION_HEADER]: session.id, 'Upload-Length': String(bytes.length), 'Upload-Metadata': metadata(session.originalFileName) },
    });
    expect(created.status).toBe(201);

    const partialStatus = await truncatedPatch(base, session.storageUploadId, 0, bytes.length, Buffer.alloc(128 * 1024, 0x33));
    expect(partialStatus).not.toBe(204);
    const head = await fetch(`${base}${session.tusEndpoint}/${session.storageUploadId}`, { method: 'HEAD', headers: tusHeaders });
    expect(head.status).toBe(200);
    expect(head.headers.get('upload-offset')).toBe('0');
    await patch(base, session.storageUploadId, 0, bytes);
  });
});

const SESSION_HEADER = 'X-Upload-Session-Id';
const patch = async (base: string, storageUploadId: string, offset: number, body: Uint8Array) => {
  const response = await fetch(`${base}/api/uploads/tus/${storageUploadId}`, {
    method: 'PATCH', headers: { ...tusHeaders, 'Content-Type': 'application/offset+octet-stream', 'Upload-Offset': String(offset), 'Content-Length': String(body.byteLength) }, body,
  });
  expect(response.status).toBe(204);
  expect(response.headers.get('upload-offset')).toBe(String(offset + body.byteLength));
};

const truncatedPatch = async (base: string, storageUploadId: string, offset: number, declaredLength: number, body: Uint8Array) => {
  const url = new URL(`${base}/api/uploads/tus/${storageUploadId}`);
  return await new Promise<number | undefined>((resolve) => {
    const request = http.request({
      hostname: url.hostname,
      port: Number(url.port),
      path: url.pathname,
      method: 'PATCH',
      headers: {
        ...tusHeaders,
        'Content-Type': 'application/offset+octet-stream',
        'Upload-Offset': String(offset),
        'Content-Length': String(declaredLength),
      },
    }, (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('error', () => resolve(undefined));
    request.write(body, () => request.destroy());
  });
};
