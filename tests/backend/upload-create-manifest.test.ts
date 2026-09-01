import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
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
let disabledTusApp: any;
let tusRoot = '';

beforeAll(async () => {
  const source = new URL(getDatabaseUrl());
  const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  databaseName = `qimao_upload_create_manifest_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const databaseUrl = new URL(source); databaseUrl.pathname = `/${databaseName}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  tusRoot = await mkdtemp(join(tmpdir(), 'qimao-upload-replacement-'));
  app = createApp({
    database: { query: (...args: any[]) => pool.query(...args), connect: (...args: any[]) => pool.connect(...args), end: async () => undefined },
    uploadStorage: new InMemoryStorageFake(),
    tusDirectory: tusRoot,
  });
  await app.ready();
  disabledTusApp = createApp({
    database: { query: (...args: any[]) => pool.query(...args), connect: (...args: any[]) => pool.connect(...args), end: async () => undefined },
    uploadStorage: new InMemoryStorageFake(),
  });
  await disabledTusApp.ready();
});

afterAll(async () => {
  if (disabledTusApp) await disabledTusApp.close();
  if (app) await app.close();
  if (pool) await pool.end();
  if (admin && databaseName) {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [databaseName]);
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    const remaining = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [databaseName]);
    expect(remaining.rowCount).toBe(0);
  }
  if (admin) await admin.end();
  if (tusRoot) await rm(tusRoot, { recursive: true, force: true });
});

const createProject = async () => {
  const response = await app.inject({
    method: 'POST', url: '/api/projects', headers: { 'idempotency-key': randomUUID() },
    payload: { name: 'manifest-derived upload create' },
  });
  expect(response.statusCode).toBe(201);
  return response.json().id as string;
};

describe('manifest-derived upload create', () => {
  it('未启用历史兼容面时拒绝新 TUS 会话，且不注册 TUS 数据面', async () => {
    const project = await disabledTusApp.inject({
      method: 'POST', url: '/api/projects', headers: { 'idempotency-key': randomUUID() },
      payload: { name: 'COS-only transport gate' },
    });
    expect(project.statusCode).toBe(201);
    const projectId = project.json().id as string;
    const rejected = await disabledTusApp.inject({
      method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { 'idempotency-key': randomUUID() },
      payload: {
        originalFileName: 'EP01.srt', mediaKind: 'srt', sizeBytes: 8,
        fileFingerprint: 'EP01.srt|8|gate', checksumAlgorithm: 'sha256', transportKind: 'tus',
      },
    });
    expect(rejected.statusCode).toBe(409);
    expect(rejected.json()).toMatchObject({ error: { code: 'UPLOAD_TRANSPORT_DISABLED' } });
    const tusDataPlane = await disabledTusApp.inject({ method: 'POST', url: '/api/uploads/tus', payload: {} });
    expect(tusDataPlane.statusCode).toBe(404);
  });

  it('reproduces SRT and shared MP4 create bodies after manifest confirm', async () => {
    const projectId = await createProject();
    const srt = { relativePath: '剧集/SRT/EP01.srt', fileName: 'EP01.srt', sizeBytes: 128, lastModifiedMs: 1754976000000, fingerprint: '剧集/SRT/EP01.srt|128|1754976000000', mediaType: 'srt', episodeNumber: 1, role: 'company_srt' };
    const video = { relativePath: '剧集/视频/EP01.mp4', fileName: 'EP01.mp4', sizeBytes: 4096, lastModifiedMs: 1754976000000, fingerprint: '剧集/视频/EP01.mp4|4096|1754976000000', mediaType: 'video', episodeNumber: 1 };
    const manifestResponse = await app.inject({
      method: 'POST', url: `/api/projects/${projectId}/material-manifests/confirm`, headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: 0, rootName: '剧集', bindings: [srt, { ...video, role: 'asr_video' }, { ...video, role: 'screen_video' }] },
    });
    expect(manifestResponse.statusCode).toBe(201);
    const manifest = manifestResponse.json() as { id: string };
    const inputs = [
      { originalFileName: srt.fileName, mediaKind: 'srt', sizeBytes: srt.sizeBytes, fileFingerprint: srt.fingerprint, checksumValue: null, materialBinding: { manifestId: manifest.id, targets: [{ episodeNumber: 1, role: 'company_srt' }] } },
      { originalFileName: video.fileName, mediaKind: 'video', sizeBytes: video.sizeBytes, fileFingerprint: video.fingerprint, materialBinding: { manifestId: manifest.id, targets: [{ episodeNumber: 1, role: 'asr_video' }, { episodeNumber: 1, role: 'screen_video' }] } },
    ];
    for (const input of inputs) {
      const response = await app.inject({
        method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { 'idempotency-key': randomUUID() },
        payload: { ...input, checksumAlgorithm: 'sha256', transportKind: 'tus' },
      });
      // Both the legacy null form and the new omitted form must create one authoritative fact.
      expect({ status: response.statusCode, body: response.json() }).toMatchObject({ status: 201 });
    }
    const counts = await pool.query('SELECT COUNT(*)::int AS sessions FROM upload_sessions WHERE project_id=$1', [projectId]);
    const commands = await pool.query('SELECT COUNT(*)::int AS commands FROM upload_commands WHERE upload_session_id IN (SELECT id FROM upload_sessions WHERE project_id=$1)', [projectId]);
    const facts = await pool.query('SELECT status, transport_kind FROM upload_sessions WHERE project_id=$1 ORDER BY original_filename', [projectId]);
    expect(counts.rows[0].sessions).toBe(2);
    expect(commands.rows[0].commands).toBe(2);
    expect(facts.rows).toEqual([
      { status: 'created', transport_kind: 'tus' },
      { status: 'created', transport_kind: 'tus' },
    ]);
  });

  it('显式 multipart 意图只替换同槽位零进度 tus created 会话，并沿用原命令恢复语义', async () => {
    const projectId = await createProject();
    const srt = { relativePath: '剧集/SRT/EP01.srt', fileName: 'EP01.srt', sizeBytes: 128, lastModifiedMs: 1754976000000, fingerprint: '剧集/SRT/EP01.srt|128|1754976000000', mediaType: 'srt', episodeNumber: 1, role: 'company_srt' };
    const video = { relativePath: '剧集/视频/EP01.mp4', fileName: 'EP01.mp4', sizeBytes: 4096, lastModifiedMs: 1754976000000, fingerprint: '剧集/视频/EP01.mp4|4096|1754976000000', mediaType: 'video', episodeNumber: 1 };
    const manifestResponse = await app.inject({
      method: 'POST', url: `/api/projects/${projectId}/material-manifests/confirm`, headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: 0, rootName: '剧集', bindings: [srt, { ...video, role: 'asr_video' }, { ...video, role: 'screen_video' }] },
    });
    expect(manifestResponse.statusCode).toBe(201);
    const manifestId = manifestResponse.json().id as string;
    const materialBinding = { manifestId, targets: [{ episodeNumber: 1, role: 'asr_video' }, { episodeNumber: 1, role: 'screen_video' }] };
    const legacy = await app.inject({
      method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { 'idempotency-key': randomUUID() },
      payload: { originalFileName: video.fileName, mediaKind: 'video', sizeBytes: video.sizeBytes,
        fileFingerprint: video.fingerprint, checksumAlgorithm: 'sha256', transportKind: 'tus', materialBinding },
    });
    expect(legacy.statusCode).toBe(201);
    const legacySession = legacy.json() as { id: string };

    const commandId = randomUUID();
    const replacementBody = { originalFileName: video.fileName, mediaKind: 'video', sizeBytes: video.sizeBytes,
      fileFingerprint: video.fingerprint, checksumAlgorithm: 'sha256', transportKind: 'multipart',
      replaceUploadId: legacySession.id, materialBinding };
    const replaced = await app.inject({
      method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { 'idempotency-key': commandId },
      payload: replacementBody,
    });
    const replay = await app.inject({
      method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { 'idempotency-key': commandId },
      payload: replacementBody,
    });
    const recovered = await app.inject({
      method: 'GET', url: `/api/projects/${projectId}/uploads/commands/${commandId}`,
    });
    expect(replaced.statusCode).toBe(201);
    expect(replaced.json()).toMatchObject({ transportKind: 'multipart', status: 'created' });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(replaced.json().id);
    expect(recovered.statusCode).toBe(200);
    expect(recovered.json().session.id).toBe(replaced.json().id);
    const oldFact = await pool.query('SELECT status,error_code FROM upload_sessions WHERE id=$1', [legacySession.id]);
    expect(oldFact.rows[0]).toEqual({ status: 'aborted', error_code: 'UPLOAD_TRANSPORT_SUPERSEDED' });
    const active = await pool.query("SELECT COUNT(*)::int AS count FROM upload_sessions WHERE project_id=$1 AND status IN ('created','uploading','completing','verifying')", [projectId]);
    expect(active.rows[0].count).toBe(1);
  });

  it('TUS 临时对象已经接收字节时拒绝替换，即使数据库尚无 confirmedParts', async () => {
    const projectId = await createProject();
    const srt = { relativePath: '剧集/SRT/EP01.srt', fileName: 'EP01.srt', sizeBytes: 128, lastModifiedMs: 1754976000000, fingerprint: '剧集/SRT/EP01.srt|128|1754976000000', mediaType: 'srt', episodeNumber: 1, role: 'company_srt' };
    const video = { relativePath: '剧集/视频/EP01.mp4', fileName: 'EP01.mp4', sizeBytes: 4096, lastModifiedMs: 1754976000000, fingerprint: '剧集/视频/EP01.mp4|4096|1754976000000', mediaType: 'video', episodeNumber: 1 };
    const manifestResponse = await app.inject({
      method: 'POST', url: `/api/projects/${projectId}/material-manifests/confirm`, headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: 0, rootName: '剧集', bindings: [srt, { ...video, role: 'asr_video' }, { ...video, role: 'screen_video' }] },
    });
    const manifestId = manifestResponse.json().id as string;
    const materialBinding = { manifestId, targets: [{ episodeNumber: 1, role: 'asr_video' }, { episodeNumber: 1, role: 'screen_video' }] };
    const legacy = await app.inject({
      method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { 'idempotency-key': randomUUID() },
      payload: { originalFileName: video.fileName, mediaKind: 'video', sizeBytes: video.sizeBytes,
        fileFingerprint: video.fingerprint, checksumAlgorithm: 'sha256', transportKind: 'tus', materialBinding },
    });
    expect(legacy.statusCode).toBe(201);
    const legacySession = legacy.json() as { id: string; storageUploadId: string };
    const store = getTusFileStore(app) as any;
    const upload = {
      id: legacySession.storageUploadId,
      size: video.sizeBytes,
      offset: 0,
      metadata: {},
      creation_date: new Date().toISOString(),
    };
    await store.create(upload);
    await store.write(Readable.from(Buffer.from([0x01])), upload.id, 0);
    await store.configstore.set(upload.id, { ...upload, offset: 1 });

    const replacement = await app.inject({
      method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { 'idempotency-key': randomUUID() },
      payload: { originalFileName: video.fileName, mediaKind: 'video', sizeBytes: video.sizeBytes,
        fileFingerprint: video.fingerprint, checksumAlgorithm: 'sha256', transportKind: 'multipart',
        replaceUploadId: legacySession.id, materialBinding },
    });
    expect(replacement.statusCode).toBe(409);
    expect(replacement.json()).toMatchObject({ error: { code: 'UPLOAD_REPLACEMENT_UNSAFE' } });
    const oldFact = await pool.query('SELECT status,error_code FROM upload_sessions WHERE id=$1', [legacySession.id]);
    expect(oldFact.rows[0]).toEqual({ status: 'created', error_code: null });
    const replacementCount = await pool.query("SELECT COUNT(*)::int AS count FROM upload_sessions WHERE project_id=$1 AND transport_kind='multipart'", [projectId]);
    expect(replacementCount.rows[0].count).toBe(0);
  });
});
