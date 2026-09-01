import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';
import { getTusFileStore } from '../../backend/src/modules/uploads/tus/tus-business.routes.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');

let databaseName = '';
let admin: any;
let pool: any;
let app: any;
let tusRoot = '';

beforeAll(async () => {
  const source = new URL(getDatabaseUrl());
  const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  databaseName = `qimao_upload_transport_replace_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
  admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const databaseUrl = new URL(source); databaseUrl.pathname = `/${databaseName}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  tusRoot = await mkdtemp(join(tmpdir(), 'qimao-test-upload-transport-replacement-'));
  app = createApp({
    database: { query: (...args: any[]) => pool.query(...args), connect: (...args: any[]) => pool.connect(...args), end: async () => undefined },
    uploadStorage: new InMemoryStorageFake(),
    tusDirectory: tusRoot,
  });
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  if (pool) await pool.end();
  if (admin && databaseName) {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [databaseName]);
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [databaseName])).rowCount).toBe(0);
  }
  if (admin) await admin.end();
  if (tusRoot) await rm(tusRoot, { recursive: true, force: true });
});

const createFixture = async () => {
  const project = await app.inject({
    method: 'POST', url: '/api/projects', headers: { 'idempotency-key': randomUUID() }, payload: { name: `匿名传输替换-${randomUUID()}` },
  });
  expect(project.statusCode).toBe(201);
  const projectId = project.json().id as string;
  const timestamp = 1_785_468_061_000;
  const srt = { episodeNumber: 1, role: 'company_srt', relativePath: '匿名系列/SRT/1.srt', fileName: '1.srt', sizeBytes: 8, lastModifiedMs: timestamp, fingerprint: `匿名系列/SRT/1.srt|8|${timestamp}`, mediaType: 'srt' };
  const video = { episodeNumber: 1, role: 'asr_video', relativePath: '匿名系列/视频/1.mp4', fileName: '1.mp4', sizeBytes: 156_739_874, lastModifiedMs: timestamp, fingerprint: `匿名系列/视频/1.mp4|156739874|${timestamp}`, mediaType: 'video' };
  const confirmed = await app.inject({
    method: 'POST', url: `/api/projects/${projectId}/material-manifests/confirm`, headers: { 'idempotency-key': randomUUID() },
    payload: { expectedVersion: 0, rootName: '匿名系列', bindings: [srt, video] },
  });
  expect(confirmed.statusCode).toBe(201);
  return { projectId, manifestId: confirmed.json().id as string, srt };
};

const createUpload = (
  fixture: Awaited<ReturnType<typeof createFixture>>,
  transportKind: 'tus' | 'multipart',
  key: string,
  replaceUploadId?: string,
) => app.inject({
  method: 'POST',
  url: `/api/projects/${fixture.projectId}/uploads`,
  headers: { 'idempotency-key': key },
  payload: {
    originalFileName: fixture.srt.fileName,
    mediaKind: 'srt',
    sizeBytes: fixture.srt.sizeBytes,
    fileFingerprint: fixture.srt.fingerprint,
    checksumAlgorithm: 'sha256',
    transportKind,
    ...(replaceUploadId ? { replaceUploadId } : {}),
    materialBinding: { manifestId: fixture.manifestId, targets: [{ episodeNumber: 1, role: 'company_srt' }] },
  },
});

describe('旧 tus 会话到 multipart 的显式安全替换', () => {
  it('created 且零确认事实时终结旧 tus，只创建一个新 multipart，重放不增加事实', async () => {
    const fixture = await createFixture();
    const oldResult = await createUpload(fixture, 'tus', randomUUID());
    expect(oldResult.statusCode).toBe(201);
    expect(oldResult.json()).toMatchObject({ transportKind: 'tus', status: 'created', confirmedParts: [] });

    const replacementKey = randomUUID();
    const replacement = await createUpload(fixture, 'multipart', replacementKey, oldResult.json().id);
    expect(replacement.statusCode, JSON.stringify(replacement.json())).toBe(201);
    expect(replacement.json()).toMatchObject({ transportKind: 'multipart', status: 'created', confirmedParts: [] });
    expect(replacement.json().id).not.toBe(oldResult.json().id);

    const replay = await createUpload(fixture, 'multipart', replacementKey, oldResult.json().id);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(replacement.json().id);

    const sessions = await pool.query(
      `SELECT id, transport_kind, status FROM upload_sessions WHERE project_id=$1 ORDER BY created_at, id`,
      [fixture.projectId],
    );
    expect(sessions.rows).toEqual([
      { id: oldResult.json().id, transport_kind: 'tus', status: 'aborted' },
      { id: replacement.json().id, transport_kind: 'multipart', status: 'created' },
    ]);
    expect((await pool.query(
      `SELECT COUNT(*)::int AS count FROM upload_commands WHERE command_kind='create_upload' AND upload_session_id IN (SELECT id FROM upload_sessions WHERE project_id=$1)`,
      [fixture.projectId],
    )).rows[0].count).toBe(2);
  });

  it('旧 tus 已进入 uploading 时不静默替换，也不创建第二会话', async () => {
    const fixture = await createFixture();
    const oldResult = await createUpload(fixture, 'tus', randomUUID());
    expect(oldResult.statusCode).toBe(201);
    await pool.query(`UPDATE upload_sessions SET status='uploading', version=version+1 WHERE id=$1`, [oldResult.json().id]);

    const replacement = await createUpload(fixture, 'multipart', randomUUID(), oldResult.json().id);
    expect(replacement.statusCode).toBe(409);
    const sessions = await pool.query(`SELECT transport_kind, status FROM upload_sessions WHERE project_id=$1`, [fixture.projectId]);
    expect(sessions.rows).toEqual([{ transport_kind: 'tus', status: 'uploading' }]);
  });

  it('显式中止删除非零 tus 字节，清理失败可用同键重放，随后普通创建 multipart', async () => {
    const fixture = await createFixture();
    const oldResult = await createUpload(fixture, 'tus', randomUUID());
    expect(oldResult.statusCode).toBe(201);
    const oldSession = oldResult.json() as { id: string; storageUploadId: string; version: number };
    const store = getTusFileStore(app) as any;
    const upload = {
      id: oldSession.storageUploadId,
      size: fixture.srt.sizeBytes,
      offset: 0,
      metadata: {},
      creation_date: new Date().toISOString(),
    };
    await store.create(upload);
    await store.write(Readable.from(Buffer.from('abcd')), upload.id, 0);
    await store.configstore.set(upload.id, { ...upload, offset: 4 });
    expect((await store.getUpload(upload.id)).offset).toBe(4);

    const abortKey = randomUUID();
    const abortRequest = {
      method: 'POST' as const,
      url: `/api/uploads/${oldSession.id}/abort`,
      headers: { 'idempotency-key': abortKey },
      payload: { expectedVersion: oldSession.version },
    };
    const originalRemove = store.remove.bind(store);
    store.remove = async () => { throw new Error('isolated cleanup failure'); };
    const failedCleanup = await app.inject(abortRequest);
    expect(failedCleanup.statusCode).toBe(503);
    expect(failedCleanup.json()).toMatchObject({ error: { code: 'STORAGE_TEMPORARY_FAILURE', action: 'retry_abort' } });
    expect((await pool.query('SELECT status FROM upload_sessions WHERE id=$1', [oldSession.id])).rows[0].status).toBe('aborted');
    expect((await store.getUpload(upload.id)).offset).toBe(4);

    store.remove = originalRemove;
    const replay = await app.inject(abortRequest);
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toMatchObject({ id: oldSession.id, status: 'aborted' });
    expect(await store.getUpload(upload.id).catch(() => null)).toBeNull();
    expect((await readdir(tusRoot)).filter((name) => name === upload.id || name === `${upload.id}.json`)).toEqual([]);
    expect((await pool.query(
      "SELECT COUNT(*)::int AS count FROM upload_commands WHERE upload_session_id=$1 AND command_kind='abort_upload'",
      [oldSession.id],
    )).rows[0].count).toBe(1);

    const multipart = await createUpload(fixture, 'multipart', randomUUID());
    expect(multipart.statusCode, JSON.stringify(multipart.json())).toBe(201);
    expect(multipart.json()).toMatchObject({ transportKind: 'multipart', status: 'created' });
  });
});
