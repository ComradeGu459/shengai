import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { FilesystemUploadStorage } from '../../backend/src/modules/storage/filesystem-storage.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');
const tusHeaders = { 'Tus-Resumable': '1.0.0' };
const scope = { ids: [] as string[], all: true };
let databaseName = '';
let admin: any;
let pool: any;
let app: any;
let storage: FilesystemUploadStorage;
let root = '';
let tusRoot = '';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const metadata = (name: string) => `filename ${Buffer.from(name).toString('base64')}`;

const startApp = async () => {
  if (app) await app.close();
  app = createApp({
    database: { query: (...args: any[]) => pool.query(...args), connect: (...args: any[]) => pool.connect(...args), end: async () => undefined },
    uploadStorage: storage,
    employeeSessionRequired: true,
    employeePrincipalResolver: () => ({
      subject: 'tus-finalize-employee', audience: 'employee', capabilities: ['tasks:read'],
      projectAccess: scope.all ? 'all' : 'listed', projectIds: scope.ids,
    }),
    tusDirectory: tusRoot,
  });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Fastify 未分配 TCP 端口。');
  return `http://127.0.0.1:${address.port}`;
};

const createProject = async (base: string) => {
  const response = await fetch(`${base}/api/projects`, {
    method: 'POST', headers: { 'idempotency-key': randomUUID(), 'content-type': 'application/json' },
    body: JSON.stringify({ name: `tus finalize ${randomUUID()}` }),
  });
  expect(response.status).toBe(201);
  return (await response.json() as { id: string }).id;
};

const createSession = async (base: string, projectId: string, bytes: Uint8Array, input: {
  mediaKind?: 'srt' | 'video';
  fileName?: string;
  fingerprint?: string;
  checksumValue?: string;
  materialBinding?: { manifestId: string; targets: Array<{ episodeNumber: number; role: 'company_srt' | 'asr_video' | 'screen_video' }> };
} = {}) => {
  const fileName = input.fileName ?? (input.mediaKind === 'video' ? 'EP01.mp4' : 'EP01.srt');
  const response = await fetch(`${base}/api/projects/${projectId}/uploads`, {
    method: 'POST',
    headers: { ...tusHeaders, 'Idempotency-Key': randomUUID(), 'content-type': 'application/json' },
    body: JSON.stringify({
      originalFileName: fileName,
      mediaKind: input.mediaKind ?? 'srt',
      sizeBytes: bytes.byteLength,
      fileFingerprint: input.fingerprint ?? `${fileName}|${bytes.byteLength}|${randomUUID()}`,
      checksumAlgorithm: 'sha256',
      ...(input.checksumValue ? { checksumValue: input.checksumValue } : {}),
      transportKind: 'tus',
      ...(input.materialBinding ? { materialBinding: input.materialBinding } : {}),
    }),
  });
  expect(response.status).toBe(201);
  const session = await response.json() as { id: string; storageUploadId: string; tusEndpoint: string; version: number; originalFileName: string; fileFingerprint: string };
  const created = await fetch(`${base}${session.tusEndpoint}`, {
    method: 'POST', headers: { ...tusHeaders, 'X-Upload-Session-Id': session.id, 'Upload-Length': String(bytes.byteLength), 'Upload-Metadata': metadata(session.originalFileName) },
  });
  expect(created.status).toBe(201);
  return session;
};

const patchAll = async (base: string, session: { storageUploadId: string }, bytes: Uint8Array) => {
  const split = Math.max(1, Math.ceil(bytes.byteLength / 3));
  let offset = 0;
  while (offset < bytes.byteLength) {
    const chunk = bytes.subarray(offset, Math.min(bytes.byteLength, offset + split));
    const response = await fetch(`${base}/api/uploads/tus/${session.storageUploadId}`, {
      method: 'PATCH', headers: { ...tusHeaders, 'Content-Type': 'application/offset+octet-stream', 'Upload-Offset': String(offset), 'Content-Length': String(chunk.byteLength) }, body: chunk,
    });
    expect(response.status).toBe(204);
    offset += chunk.byteLength;
  }
};

const complete = async (base: string, session: { id: string; version: number }, key = randomUUID()) => fetch(`${base}/api/uploads/${session.id}/complete`, {
  method: 'POST', headers: { ...tusHeaders, 'Idempotency-Key': key, 'content-type': 'application/json' }, body: JSON.stringify({ expectedVersion: session.version }),
});

const seedManifest = async (projectId: string, version: number, slots: Array<{ role: string; fileName: string; size: number; fingerprint: string }>) => {
  const manifestId = randomUUID();
  await pool.query('INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,$3,$4,$5)', [manifestId, projectId, version, 'root', 'tus-finalize-test']);
  for (const slot of slots) {
    await pool.query(
      `INSERT INTO material_manifest_bindings(manifest_id,episode_number,role,relative_path,file_name,size_bytes,last_modified_ms,fingerprint,media_type)
       VALUES($1,1,$2,$3,$4,$5,1,$6,$7)`,
      [manifestId, slot.role, `root/${slot.fileName}`, slot.fileName, slot.size, slot.fingerprint, slot.role === 'company_srt' ? 'srt' : 'video'],
    );
  }
  return manifestId;
};

beforeAll(async () => {
  const source = new URL(getDatabaseUrl());
  const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  databaseName = `qimao_upload_tus_finalize_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const databaseUrl = new URL(source); databaseUrl.pathname = `/${databaseName}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  root = await mkdtemp(join(tmpdir(), 'qimao-upload-tus-finalize-'));
  tusRoot = join(root, 'tus');
  await mkdir(join(root, 'final'), { recursive: true });
  storage = await FilesystemUploadStorage.create(join(root, 'final'));
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

describe('tus transport → Asset 完成事务', () => {
  it('传输完成后才创建唯一 Asset，complete 同命令重放不重复写入', async () => {
    const base = await startApp();
    const projectId = await createProject(base);
    const bytes = Buffer.from('tus-finalize-authoritative-sha');
    const session = await createSession(base, projectId, bytes);
    const partial = await fetch(`${base}/api/uploads/tus/${session.storageUploadId}`, { method: 'HEAD', headers: tusHeaders });
    expect(partial.headers.get('upload-offset')).toBe('0');
    const incomplete = await complete(base, session, randomUUID());
    expect(incomplete.status).toBe(409);
    expect((await incomplete.json() as { error: { code: string } }).error.code).toBe('UPLOAD_TUS_NOT_COMPLETE');
    expect((await pool.query('SELECT status FROM upload_sessions WHERE id=$1', [session.id])).rows[0].status).toBe('created');
    await patchAll(base, session, bytes);
    const key = randomUUID();
    const first = await complete(base, session, key);
    expect(first.status).toBe(200);
    const firstBody = await first.json() as { status: string; checksumValue: string; asset: { id: string } };
    expect(firstBody).toMatchObject({ status: 'completed', checksumValue: sha256(bytes) });
    const replay = await complete(base, session, key);
    expect(replay.status).toBe(200);
    expect((await replay.json() as { asset: { id: string } }).asset.id).toBe(firstBody.asset.id);
    expect((await pool.query('SELECT COUNT(*) FROM assets WHERE project_id=$1', [projectId])).rows[0].count).toBe('1');
    expect((await storage.headObject(firstBody.asset ? (await pool.query('SELECT object_key FROM assets WHERE id=$1', [firstBody.asset.id])).rows[0].object_key : ''))?.checksumValue).toBe(sha256(bytes));
    expect(await readdir(tusRoot)).toHaveLength(0);

    const otherProject = await createProject(base);
    scope.all = false; scope.ids = [otherProject];
    const crossProjectCompleted = await complete(base, session, randomUUID());
    expect(crossProjectCompleted.status).toBe(404);
    scope.all = true; scope.ids = [];
  });

  it('期望摘要错误不创建 Asset，跨项目主体不能读取 tus 资源', async () => {
    const base = await startApp();
    const projectId = await createProject(base);
    const bytes = Buffer.from('tus-finalize-checksum-error');
    const session = await createSession(base, projectId, bytes, { checksumValue: '0'.repeat(64) });
    await patchAll(base, session, bytes);
    const failed = await complete(base, session);
    expect(failed.status).toBe(409);
    expect((await failed.json() as { error: { code: string } }).error.code).toBe('UPLOAD_CHECKSUM_MISMATCH');
    expect((await pool.query('SELECT COUNT(*) FROM assets WHERE project_id=$1', [projectId])).rows[0].count).toBe('0');
    const otherProject = await createProject(base);
    scope.all = false; scope.ids = [otherProject];
    const forbidden = await fetch(`${base}/api/uploads/tus/${session.storageUploadId}`, { method: 'HEAD', headers: tusHeaders });
    expect(forbidden.status).toBe(404);
    const forbiddenComplete = await complete(base, session);
    expect(forbiddenComplete.status).toBe(404);
    scope.all = true; scope.ids = [];

    const terminalBytes = Buffer.from('terminal-state-no-asset');
    const aborted = await createSession(base, projectId, terminalBytes);
    await patchAll(base, aborted, terminalBytes);
    await pool.query("UPDATE upload_sessions SET status='aborted' WHERE id=$1", [aborted.id]);
    expect((await complete(base, aborted)).status).toBe(409);
    const expired = await createSession(base, projectId, terminalBytes);
    await patchAll(base, expired, terminalBytes);
    await pool.query("UPDATE upload_sessions SET status='expired' WHERE id=$1", [expired.id]);
    expect((await complete(base, expired)).status).toBe(409);
    expect((await pool.query('SELECT COUNT(*) FROM assets WHERE project_id=$1', [projectId])).rows[0].count).toBe('0');
  });

  it('同一物理视频明确绑定 asr/screen 共享一个 Asset，专用 screen 使用独立 Asset', async () => {
    const base = await startApp();
    const projectId = await createProject(base);
    const shared = Buffer.from('shared-video-bytes');
    const sharedFingerprint = `root/shared.mp4|${shared.length}|1`;
    const sharedManifest = await seedManifest(projectId, 1, [
      { role: 'asr_video', fileName: 'shared.mp4', size: shared.length, fingerprint: sharedFingerprint },
      { role: 'screen_video', fileName: 'shared.mp4', size: shared.length, fingerprint: sharedFingerprint },
    ]);
    const sharedSession = await createSession(base, projectId, shared, { mediaKind: 'video', fileName: 'shared.mp4', fingerprint: sharedFingerprint, materialBinding: { manifestId: sharedManifest, targets: [{ episodeNumber: 1, role: 'asr_video' }, { episodeNumber: 1, role: 'screen_video' }] } });
    await patchAll(base, sharedSession, shared);
    expect((await complete(base, sharedSession)).status).toBe(200);
    const sharedBindings = await pool.query('SELECT asset_id FROM material_asset_bindings WHERE manifest_id=$1 ORDER BY role', [sharedManifest]);
    expect(sharedBindings.rows).toHaveLength(2);
    expect(sharedBindings.rows[0].asset_id).toBe(sharedBindings.rows[1].asset_id);

    const asr = Buffer.from('ordinary-asr-video');
    const screen = Buffer.from('special-screen-video');
    const asrFingerprint = `root/asr.mp4|${asr.length}|1`;
    const screenFingerprint = `root/screen.mp4|${screen.length}|1`;
    const specializedManifest = await seedManifest(projectId, 2, [
      { role: 'asr_video', fileName: 'asr.mp4', size: asr.length, fingerprint: asrFingerprint },
      { role: 'screen_video', fileName: 'screen.mp4', size: screen.length, fingerprint: screenFingerprint },
    ]);
    const asrSession = await createSession(base, projectId, asr, { mediaKind: 'video', fileName: 'asr.mp4', fingerprint: asrFingerprint, materialBinding: { manifestId: specializedManifest, targets: [{ episodeNumber: 1, role: 'asr_video' }] } });
    await patchAll(base, asrSession, asr);
    expect((await complete(base, asrSession)).status).toBe(200);
    const screenSession = await createSession(base, projectId, screen, { mediaKind: 'video', fileName: 'screen.mp4', fingerprint: screenFingerprint, materialBinding: { manifestId: specializedManifest, targets: [{ episodeNumber: 1, role: 'screen_video' }] } });
    await patchAll(base, screenSession, screen);
    expect((await complete(base, screenSession)).status).toBe(200);
    const specializedBindings = await pool.query('SELECT role,asset_id FROM material_asset_bindings WHERE manifest_id=$1 ORDER BY role', [specializedManifest]);
    expect(specializedBindings.rows).toHaveLength(2);
    expect(specializedBindings.rows[0].asset_id).not.toBe(specializedBindings.rows[1].asset_id);

    const replacement = Buffer.from('replacement-screen-video');
    const replacementFingerprint = `root/screen-v3.mp4|${replacement.length}|1`;
    const replacementManifest = await seedManifest(projectId, 3, [
      { role: 'asr_video', fileName: 'asr.mp4', size: asr.length, fingerprint: asrFingerprint },
      { role: 'screen_video', fileName: 'screen-v3.mp4', size: replacement.length, fingerprint: replacementFingerprint },
    ]);
    const replacementSession = await createSession(base, projectId, replacement, { mediaKind: 'video', fileName: 'screen-v3.mp4', fingerprint: replacementFingerprint, materialBinding: { manifestId: replacementManifest, targets: [{ episodeNumber: 1, role: 'screen_video' }] } });
    await patchAll(base, replacementSession, replacement);
    expect((await complete(base, replacementSession)).status).toBe(200);
    const oldAsr = await pool.query('SELECT asset_id FROM material_asset_bindings WHERE manifest_id=$1 AND role=\'asr_video\'', [specializedManifest]);
    const newScreen = await pool.query('SELECT asset_id FROM material_asset_bindings WHERE manifest_id=$1 AND role=\'screen_video\'', [replacementManifest]);
    expect(oldAsr.rows[0]?.asset_id).toBe(specializedBindings.rows.find((row: { role: string }) => row.role === 'asr_video')?.asset_id);
    expect(newScreen.rows[0]?.asset_id).not.toBe(specializedBindings.rows.find((row: { role: string }) => row.role === 'screen_video')?.asset_id);
  });
});
