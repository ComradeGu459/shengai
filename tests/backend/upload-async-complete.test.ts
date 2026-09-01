import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl, projectLifecycleConfig, type UploadProtocolConfig } from '../../backend/src/config.js';
import { ProjectCleanupWorker } from '../../backend/src/workers/project-cleanup.worker.js';
import { UploadCompletionWorker } from '../../backend/src/workers/upload-completion.worker.js';
import { UploadCompletionRepository } from '../../backend/src/modules/uploads/upload-completion.repository.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');

class TrackingStorage extends InMemoryStorageFake {
  completeCalls = 0;
  headCalls = 0;
  readCalls = 0;
  private completeBarrier: { entered: () => void; released: Promise<void> } | null = null;
  lateCompleteAfterAbort = false;

  pauseComplete() {
    let markEntered!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => { markEntered = resolve; });
    const released = new Promise<void>((resolve) => { release = resolve; });
    this.completeBarrier = { entered: markEntered, released };
    return { entered, release };
  }

  override async abortMultipart(input: Parameters<InMemoryStorageFake['abortMultipart']>[0]) {
    if (this.lateCompleteAfterAbort) return;
    return super.abortMultipart(input);
  }

  override async completeMultipart(input: Parameters<InMemoryStorageFake['completeMultipart']>[0]) {
    this.completeCalls += 1;
    const barrier = this.completeBarrier;
    if (barrier) {
      this.completeBarrier = null;
      barrier.entered();
      await barrier.released;
    }
    return super.completeMultipart(input);
  }

  override async headObject(objectKey: string) {
    this.headCalls += 1;
    return super.headObject(objectKey);
  }

  override async readObject(objectKey: string) {
    this.readCalls += 1;
    return super.readObject(objectKey);
  }
}

const sourceUrl = new URL(getDatabaseUrl());
const databaseName = `qimao_upload_async_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
const adminUrl = new URL(sourceUrl);
adminUrl.pathname = '/postgres';
const admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
const databaseUrl = new URL(sourceUrl);
databaseUrl.pathname = `/${databaseName}`;
let pool: any;
let app: any;
let storage: TrackingStorage;
let databaseReady = false;

const uploadConfig: UploadProtocolConfig = {
  partSizeBytes: 4,
  maxFileSizeBytes: 100,
  sessionTtlMs: 60_000,
  authorizationTtlMs: 60_000,
  perFileConcurrency: 3,
  browserConcurrency: 12,
};

beforeAll(async () => {
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  databaseReady = true;
  storage = new TrackingStorage();
  app = createApp({
    database: { query: (...args: any[]) => pool.query(...args), connect: (...args: any[]) => pool.connect(...args), end: async () => undefined },
    uploadStorage: storage,
    uploadConfig,
  });
  await app.ready();
}, 30_000);

afterAll(async () => {
  if (!databaseReady) {
    await admin.end();
    return;
  }
  if (app) await app.close();
  if (pool) await pool.end();
  await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [databaseName]);
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [databaseName])).rowCount).toBe(0);
  await admin.end();
});

beforeEach(async () => {
  if (databaseReady) await pool.query('TRUNCATE project_commands, projects CASCADE');
  storage.completeCalls = 0;
  storage.headCalls = 0;
  storage.readCalls = 0;
});

const createProject = async () => {
  const response = await app.inject({ method: 'POST', url: '/api/projects', headers: { 'idempotency-key': randomUUID() }, payload: { name: `异步完成-${randomUUID()}` } });
  expect(response.statusCode).toBe(201);
  return response.json().id as string;
};

const createUploadedSession = async () => {
  const projectId = await createProject();
  const created = await app.inject({
    method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { 'idempotency-key': randomUUID() },
    payload: {
      originalFileName: 'episode.srt', mediaKind: 'srt', sizeBytes: 8,
      fileFingerprint: 'episode.srt|8|1785468061000', checksumAlgorithm: 'sha256',
      transportKind: 'multipart',
    },
  });
  expect(created.statusCode).toBe(201);
  let session = created.json();
  for (const [partNumber, bytes] of [[1, new TextEncoder().encode('abcd')], [2, new TextEncoder().encode('efgh')]] as const) {
    const authorization = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/parts/authorize`, headers: { 'idempotency-key': randomUUID() },
      payload: { partNumber, fileFingerprint: session.fileFingerprint },
    });
    expect(authorization.statusCode).toBe(200);
    const receipt = await storage.uploadAuthorizedPart(authorization.json().authorizationToken, bytes);
    const confirmed = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/parts/confirm`, headers: { 'idempotency-key': randomUUID() }, payload: receipt,
    });
    expect(confirmed.statusCode).toBe(200);
    session = confirmed.json();
  }
  return { projectId, session };
};

const completeRequest = (session: any, key = randomUUID()) => app.inject({
  method: 'POST', url: `/api/uploads/${session.id}/complete`, headers: { 'idempotency-key': key }, payload: { expectedVersion: session.version },
});

describe('上传异步完成 Worker', () => {
  it('HTTP complete 只创建唯一持久任务并立即返回 verifying，不触碰对象存储', async () => {
    const { session } = await createUploadedSession();
    const key = randomUUID();
    const response = await completeRequest(session, key);
    const replay = await completeRequest(session, key);
    const jobs = await pool.query('SELECT id, status, stage, attempt_count FROM upload_completion_jobs WHERE upload_session_id=$1', [session.id]);

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({ id: session.id, status: 'verifying' });
    expect(replay.statusCode).toBe(202);
    expect(replay.json().id).toBe(session.id);
    expect(jobs.rows).toHaveLength(1);
    expect(jobs.rows[0]).toMatchObject({ status: 'scheduled', stage: 'queued', attempt_count: 0 });
    expect(storage.completeCalls).toBe(0);
    expect(storage.headCalls).toBe(0);
    expect(storage.readCalls).toBe(0);
  });

  it('Worker 成功只 Complete 一次并唯一创建 Asset，重跑不重复落账', async () => {
    const { session } = await createUploadedSession();
    const completion = await completeRequest(session);
    expect(completion.statusCode).toBe(202);
    const worker = new UploadCompletionWorker(pool, storage, { leaseMs: 60_000, retryDelayMs: 0, maxAttempts: 3 }, { workerId: randomUUID() });
    const first = await worker.runOnce();
    const second = await worker.runOnce();
    const refreshed = await app.inject({ method: 'GET', url: `/api/uploads/${session.id}` });
    const assets = await pool.query('SELECT COUNT(*)::int AS count FROM assets WHERE project_id=$1', [session.projectId]);

    expect(first).toMatchObject({ processed: true, status: 'completed' });
    expect(second).toEqual({ processed: false });
    expect(refreshed.json()).toMatchObject({ status: 'completed', asset: { sizeBytes: 8 } });
    expect(assets.rows[0].count).toBe(1);
    expect(storage.completeCalls).toBe(1);
    expect(storage.headCalls).toBe(1);
  });

  it('Complete 结果 unknown 后恢复只 Head 同一对象，不第二次 Complete', async () => {
    const { session } = await createUploadedSession();
    expect((await completeRequest(session)).statusCode).toBe(202);
    storage.failAfterNextComplete();
    const worker = new UploadCompletionWorker(pool, storage, { leaseMs: 60_000, retryDelayMs: 0, maxAttempts: 3 }, { workerId: randomUUID() });
    const first = await worker.runOnce();
    await pool.query(`UPDATE upload_completion_jobs SET next_attempt_at=CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE upload_session_id=$1`, [session.id]);
    const second = await worker.runOnce();

    expect(first).toMatchObject({ processed: true, status: 'retryable' });
    expect(second).toMatchObject({ processed: true, status: 'completed' });
    expect(storage.completeCalls).toBe(1);
    expect(storage.headCalls).toBe(1);
    expect((await app.inject({ method: 'GET', url: `/api/uploads/${session.id}` })).json().status).toBe('completed');
  });

  it('旧 Worker 租约失效后不能覆盖新 owner 或让会话失败', async () => {
    const { session } = await createUploadedSession();
    expect((await completeRequest(session)).statusCode).toBe(202);
    const oldJobs = new UploadCompletionRepository(pool);
    const oldClaim = await oldJobs.claim({
      workerId: 'old-owner', now: new Date(), leaseExpiresAt: new Date(Date.now() + 60_000),
    });
    expect(oldClaim).not.toBeNull();
    await pool.query(
      `UPDATE upload_completion_jobs SET lease_expires_at=CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE id=$1`,
      [oldClaim!.job.id],
    );
    const newJobs = new UploadCompletionRepository(pool);
    const newClaim = await newJobs.claim({
      workerId: 'new-owner', now: new Date(), leaseExpiresAt: new Date(Date.now() + 60_000),
    });
    expect(newClaim?.job.leaseOwner).toBe('new-owner');

    const staleRetry = await oldJobs.markRetryable({
      job: oldClaim!.job, workerId: 'old-owner', stage: 'reconciliation_required',
      code: 'UPLOAD_COMPLETE_UNKNOWN', error: 'stale owner', now: new Date(),
      nextAttemptAt: new Date(Date.now() + 1_000), maxAttempts: 3,
    });
    const staleFailed = await oldJobs.markFailed({
      jobId: oldClaim!.job.id, workerId: 'old-owner', stage: 'binding',
      code: 'UPLOAD_COMPLETION_FAILED', error: 'stale owner', now: new Date(),
    });
    const job = (await pool.query(
      'SELECT status, lease_owner FROM upload_completion_jobs WHERE id=$1', [oldClaim!.job.id],
    )).rows[0];
    const refreshed = (await pool.query(
      'SELECT status FROM upload_sessions WHERE id=$1', [session.id],
    )).rows[0];

    expect(staleRetry).toMatchObject({ applied: false, status: null, terminal: false });
    expect(staleFailed).toEqual({ applied: false, status: null });
    expect(job).toMatchObject({ status: 'leased', lease_owner: 'new-owner' });
    expect(refreshed.status).toBe('verifying');
    expect(storage.completeCalls).toBe(0);
  });

  it('项目回收竞态只取消持久任务，不复活会话或调用对象存储', async () => {
    const { projectId, session } = await createUploadedSession();
    expect((await completeRequest(session)).statusCode).toBe(202);
    await pool.query(`UPDATE projects SET lifecycle_status='recycled' WHERE id=$1`, [projectId]);
    const worker = new UploadCompletionWorker(pool, storage, { leaseMs: 60_000, retryDelayMs: 0, maxAttempts: 3 }, { workerId: randomUUID() });
    const result = await worker.runOnce();
    const refreshed = await app.inject({ method: 'GET', url: `/api/uploads/${session.id}` });

    expect(result).toMatchObject({ processed: true, status: 'cancelled' });
    expect(refreshed.json().status).toBe('verifying');
    expect(storage.completeCalls).toBe(0);
    expect(storage.headCalls).toBe(0);
  });

  it('write_in_flight 后回收清理先完成，晚到 Complete 仍删除同一对象且不建 Asset', async () => {
    const { projectId, session } = await createUploadedSession();
    expect((await completeRequest(session)).statusCode).toBe(202);
    storage.lateCompleteAfterAbort = true;
    const barrier = storage.pauseComplete();
    const completionWorker = new UploadCompletionWorker(pool, storage,
      { leaseMs: 60_000, retryDelayMs: 0, maxAttempts: 3 }, { workerId: randomUUID() });
    const completionPromise = completionWorker.runOnce();
    await barrier.entered;
    const storageIdentity = (await pool.query(
      'SELECT storage_upload_id FROM upload_sessions WHERE id=$1', [session.id],
    )).rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE upload_sessions SET status='aborted', error_code='PROJECT_RECYCLED', version=version+1 WHERE id=$1`,
        [session.id],
      );
      await client.query(`UPDATE projects SET lifecycle_status='purging', version=version+1 WHERE id=$1`, [projectId]);
      await client.query(
        `INSERT INTO project_upload_cleanups(upload_session_id, project_id, storage_upload_id, object_key, status)
         VALUES($1,$2,$3,$4,'pending')`,
        [session.id, projectId, storageIdentity.storage_upload_id, session.objectKey],
      );
      await client.query(
        `INSERT INTO cleanup_jobs(project_id, status, attempt_count, next_attempt_at, created_at, updated_at)
         VALUES($1,'scheduled',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         ON CONFLICT (project_id) DO UPDATE SET status='scheduled', next_attempt_at=CURRENT_TIMESTAMP,
           lease_owner=NULL, lease_expires_at=NULL, completed_at=NULL`,
        [projectId],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    const cleanupWorker = new ProjectCleanupWorker(pool, storage, projectLifecycleConfig, { workerId: randomUUID() });
    const cleanup = await cleanupWorker.runOnce();
    expect(cleanup).toMatchObject({ processed: true, status: 'completed' });

    barrier.release();
    const completion = await completionPromise;
    expect(completion).toMatchObject({ processed: true, status: 'cancelled' });
    expect(storage.hasObject(session.objectKey)).toBe(false);
    expect((await pool.query('SELECT COUNT(*)::int AS count FROM assets WHERE project_id=$1', [projectId])).rows[0].count).toBe(0);
    expect((await pool.query('SELECT lifecycle_status FROM projects WHERE id=$1', [projectId])).rows[0].lifecycle_status).toBe('purged');
    storage.lateCompleteAfterAbort = false;
  });
});
