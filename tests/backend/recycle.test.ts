import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import type { ProjectLifecycleConfig, UploadProtocolConfig } from '../../backend/src/config.js';
import { createPool } from '../../backend/src/database/pool.js';
import { ProjectLifecycleRepository } from '../../backend/src/modules/projects/project-lifecycle.repository.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';
import { ProjectCleanupWorker } from '../../backend/src/workers/project-cleanup.worker.js';

const pool = createPool();
const storage = new InMemoryStorageFake();
const uploadConfig: UploadProtocolConfig = {
  partSizeBytes: 4,
  maxFileSizeBytes: 100,
  sessionTtlMs: 60_000,
  authorizationTtlMs: 10_000,
  perFileConcurrency: 3,
  browserConcurrency: 12,
};
const lifecycleConfig: ProjectLifecycleConfig = {
  recycleRetentionMs: 48 * 60 * 60 * 1000,
  cleanupLeaseMs: 60_000,
  cleanupRetryDelayMs: 1_000,
  cleanupMaxAttempts: 3,
};
const app = createApp({ database: pool, uploadStorage: storage, uploadConfig, lifecycleConfig });

beforeAll(async () => app.ready());
beforeEach(async () => pool.query('TRUNCATE project_commands, projects CASCADE'));
afterAll(async () => {
  await pool.query('TRUNCATE project_commands, projects CASCADE');
  await app.close();
});

const checksum = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

const createProject = async (name = '匿名回收项目') => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { 'idempotency-key': randomUUID() },
    payload: { name },
  });
  expect(response.statusCode).toBe(201);
  return response.json();
};

const createUpload = async (projectId: string, bytes: Uint8Array, fileName = 'EP01.srt') => {
  const response = await app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/uploads`,
    headers: { 'idempotency-key': randomUUID() },
    payload: {
      originalFileName: fileName,
      mediaKind: fileName.endsWith('.mp4') ? 'video' : 'srt',
      sizeBytes: bytes.byteLength,
      fileFingerprint: `${fileName}|${bytes.byteLength}|1754976000000`,
      checksumAlgorithm: 'sha256',
      checksumValue: checksum(bytes),
    },
  });
  expect(response.statusCode).toBe(201);
  const internal = await pool.query<{ storage_upload_id: string }>(
    'SELECT storage_upload_id FROM upload_sessions WHERE id = $1',
    [response.json().id],
  );
  return { ...response.json(), storageUploadId: internal.rows[0]!.storage_upload_id };
};

const uploadAllParts = async (session: Record<string, any>, bytes: Uint8Array) => {
  let current = session;
  for (let partNumber = 1; partNumber <= session.totalParts; partNumber += 1) {
    const authorization = await app.inject({
      method: 'POST',
      url: `/api/uploads/${session.id}/parts/authorize`,
      payload: { partNumber, fileFingerprint: session.fileFingerprint },
    });
    expect(authorization.statusCode).toBe(200);
    const start = (partNumber - 1) * session.partSizeBytes;
    const receipt = await storage.uploadAuthorizedPart(
      authorization.json().authorizationToken,
      bytes.slice(start, start + session.partSizeBytes),
    );
    const confirmation = await app.inject({
      method: 'POST',
      url: `/api/uploads/${session.id}/parts/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: receipt,
    });
    expect(confirmation.statusCode).toBe(200);
    current = confirmation.json();
  }
  return current;
};

const completeUpload = async (session: Record<string, any>, bytes: Uint8Array) => {
  const current = await uploadAllParts(session, bytes);
  const completed = await app.inject({
    method: 'POST',
    url: `/api/uploads/${session.id}/complete`,
    headers: { 'idempotency-key': randomUUID() },
    payload: { expectedVersion: current.version },
  });
  expect(completed.statusCode).toBe(200);
  return completed.json();
};

const recycle = async (projectId: string, expectedVersion: number, key = randomUUID()) => ({
  key,
  response: await app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/recycle`,
    headers: { 'idempotency-key': key },
    payload: { expectedVersion },
  }),
});

const makeCleanupDue = async (projectId: string, at: Date) => {
  await pool.query('UPDATE projects SET recycle_expires_at = $2 WHERE id = $1', [projectId, at]);
  await pool.query('UPDATE cleanup_jobs SET next_attempt_at = $2 WHERE project_id = $1', [projectId, at]);
};

describe('BACK-M2-06 项目回收生命周期', () => {
  it('幂等回收终止未完成上传，48 小时内恢复且不复活会话', async () => {
    const project = await createProject();
    const manifest = await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/material-manifests/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        expectedVersion: 0,
        rootName: '匿名回收项目',
        bindings: [
          { episodeNumber: 1, role: 'company_srt', relativePath: '匿名回收项目/EP01.srt', fileName: 'EP01.srt',
            sizeBytes: 4, lastModifiedMs: 1, fingerprint: '匿名回收项目/EP01.srt|4|1', mediaType: 'srt' },
          { episodeNumber: 1, role: 'asr_video', relativePath: '匿名回收项目/EP01.mp4', fileName: 'EP01.mp4',
            sizeBytes: 4, lastModifiedMs: 2, fingerprint: '匿名回收项目/EP01.mp4|4|2', mediaType: 'video' },
        ],
      },
    });
    expect(manifest.statusCode).toBe(201);
    const completed = await completeUpload(
      await createUpload(project.id, new TextEncoder().encode('done')),
      new TextEncoder().encode('done'),
    );
    const unfinished = await createUpload(project.id, new TextEncoder().encode('pending!'), 'EP02.mp4');

    const latestProject = await app.inject({ method: 'GET', url: `/api/projects/${project.id}` });
    const key = randomUUID();
    const first = await recycle(project.id, latestProject.json().version, key);
    const replay = await app.inject({
      method: 'POST', url: `/api/projects/${project.id}/recycle`,
      headers: { 'idempotency-key': key }, payload: { expectedVersion: latestProject.json().version },
    });
    expect(first.response.statusCode).toBe(201);
    expect(replay.statusCode).toBe(200);
    expect(first.response.json().terminatedUploadCount).toBe(1);
    expect(replay.json()).toEqual(first.response.json());
    const expiresAt = new Date(first.response.json().project.recycleExpiresAt).getTime();
    expect(expiresAt - new Date(first.response.json().project.updatedAt).getTime()).toBe(lifecycleConfig.recycleRetentionMs);
    expect(storage.hasMultipart(unfinished.storageUploadId)).toBe(false);

    const sessions = await pool.query<{ id: string; status: string }>(
      'SELECT id, status FROM upload_sessions WHERE project_id = $1 ORDER BY id', [project.id],
    );
    expect(sessions.rows.find((row) => row.id === completed.id)?.status).toBe('completed');
    expect(sessions.rows.find((row) => row.id === unfinished.id)?.status).toBe('aborted');
    const bin = await app.inject({ method: 'GET', url: '/api/recycle-bin?search=%E5%8C%BF%E5%90%8D' });
    expect(bin.statusCode).toBe(200);
    expect(bin.json()).toMatchObject({ total: 1, items: [{ id: project.id, lifecycleStatus: 'recycled' }] });
    const inactiveUpload = await app.inject({
      method: 'POST', url: `/api/projects/${project.id}/uploads`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        originalFileName: 'new.srt', mediaKind: 'srt', sizeBytes: 4,
        fileFingerprint: 'new.srt|4|1754976000000', checksumAlgorithm: 'sha256',
        checksumValue: checksum(new TextEncoder().encode('new!')),
      },
    });
    expect(inactiveUpload.statusCode).toBe(409);
    expect(inactiveUpload.json().error.code).toBe('PROJECT_NOT_ACTIVE');

    const restoreKey = randomUUID();
    const restoreRequest = {
      method: 'POST', url: `/api/projects/${project.id}/restore`,
      headers: { 'idempotency-key': restoreKey },
      payload: { expectedVersion: first.response.json().project.version },
    } as const;
    const restored = await app.inject(restoreRequest);
    const restoreReplay = await app.inject(restoreRequest);
    expect(restored.statusCode).toBe(200);
    expect(restoreReplay.statusCode).toBe(200);
    expect(restoreReplay.json()).toEqual(restored.json());
    expect(restored.json().project.lifecycleStatus).toBe('active');
    const restoreConflict = await app.inject({
      ...restoreRequest,
      payload: { expectedVersion: first.response.json().project.version + 1 },
    });
    expect(restoreConflict.statusCode).toBe(409);
    expect(restoreConflict.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    const retained = await pool.query<{ assets: string; manifests: string; aborted: string }>(
      `SELECT (SELECT COUNT(*) FROM assets WHERE project_id = $1) AS assets,
              (SELECT COUNT(*) FROM material_manifests WHERE project_id = $1) AS manifests,
              (SELECT COUNT(*) FROM upload_sessions WHERE project_id = $1 AND status = 'aborted') AS aborted`,
      [project.id],
    );
    expect(retained.rows[0]).toMatchObject({ assets: '1', manifests: '1', aborted: '1' });

  });

  it('回收站在数据库分页前稳定投影回收时间并执行确定性排序', async () => {
    const projectC = await createProject('匿名-C');
    const projectA = await createProject('匿名-A');
    const projectB = await createProject('匿名-B');
    await recycle(projectC.id, projectC.version);
    await recycle(projectA.id, projectA.version);
    await recycle(projectB.id, projectB.version);

    const recycledAt = {
      [projectC.id]: new Date('2026-08-10T00:00:00.000Z'),
      [projectA.id]: new Date('2026-08-12T00:00:00.000Z'),
      [projectB.id]: new Date('2026-08-11T00:00:00.000Z'),
    };
    const expiresAt = {
      [projectC.id]: new Date('2026-08-15T00:00:00.000Z'),
      [projectA.id]: new Date('2026-08-14T00:00:00.000Z'),
      [projectB.id]: new Date('2026-08-13T00:00:00.000Z'),
    };
    for (const project of [projectC, projectA, projectB]) {
      await pool.query('UPDATE cleanup_jobs SET created_at = $2 WHERE project_id = $1', [
        project.id, recycledAt[project.id],
      ]);
      await pool.query('UPDATE projects SET recycle_expires_at = $2 WHERE id = $1', [
        project.id, expiresAt[project.id],
      ]);
    }

    const listAcrossPages = async (query = '') => {
      const firstPage = await app.inject({ method: 'GET', url: `/api/recycle-bin?limit=2&offset=0${query}` });
      const secondPage = await app.inject({ method: 'GET', url: `/api/recycle-bin?limit=2&offset=2${query}` });
      expect(firstPage.statusCode, firstPage.body).toBe(200);
      expect(secondPage.statusCode, secondPage.body).toBe(200);
      expect(firstPage.json().total).toBe(3);
      expect(secondPage.json().total).toBe(3);
      return [...firstPage.json().items, ...secondPage.json().items];
    };

    expect((await listAcrossPages()).map((item) => item.id)).toEqual([
      projectB.id, projectA.id, projectC.id,
    ]);
    expect((await listAcrossPages('&sortBy=name&sortDirection=asc')).map((item) => item.id)).toEqual([
      projectA.id, projectB.id, projectC.id,
    ]);
    const recycledItems = await listAcrossPages('&sortBy=recycledAt&sortDirection=asc');
    expect(recycledItems.map((item) => item.id)).toEqual([projectC.id, projectB.id, projectA.id]);
    expect(recycledItems.map((item) => item.recycledAt)).toEqual([
      recycledAt[projectC.id].toISOString(),
      recycledAt[projectB.id].toISOString(),
      recycledAt[projectA.id].toISOString(),
    ]);

    await pool.query(
      'UPDATE cleanup_jobs SET updated_at = updated_at + INTERVAL \'1 hour\' WHERE project_id = $1',
      [projectC.id],
    );
    const afterWorkerMetadataChange = await app.inject({
      method: 'GET', url: '/api/recycle-bin?sortBy=recycledAt&sortDirection=asc',
    });
    expect(afterWorkerMetadataChange.json().items[0].recycledAt).toBe(recycledAt[projectC.id].toISOString());
  });

  it('分片清理失败不回滚回收，恢复时重试且上传仍保持 aborted', async () => {
    const project = await createProject('匿名分片失败项目');
    const upload = await createUpload(project.id, new TextEncoder().encode('pending!'), 'EP02.mp4');
    storage.failNextOperation();
    const recycled = await recycle(project.id, project.version);
    expect(recycled.response.statusCode).toBe(201);
    const pendingAfterFailure = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM project_upload_cleanups
        WHERE project_id = $1 AND status = 'retryable'`, [project.id],
    );
    expect(pendingAfterFailure.rows[0]?.count).toBe('1');
    expect(storage.hasMultipart(upload.storageUploadId)).toBe(true);

    const restored = await app.inject({
      method: 'POST', url: `/api/projects/${project.id}/restore`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: recycled.response.json().project.version },
    });
    expect(restored.statusCode).toBe(200);
    const pendingAfterRestore = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM project_upload_cleanups
        WHERE project_id = $1 AND status IN ('pending', 'retryable')`, [project.id],
    );
    expect(pendingAfterRestore.rows[0]?.count).toBe('0');
    expect(storage.hasMultipart(upload.storageUploadId)).toBe(false);
    const session = await app.inject({ method: 'GET', url: `/api/uploads/${upload.id}` });
    expect(session.json().status).toBe('aborted');
  });

  it('过期后不可恢复，Worker 幂等删除对象并保留最小墓碑', async () => {
    const project = await createProject('匿名墓碑项目');
    const firstAsset = await completeUpload(
      await createUpload(project.id, new TextEncoder().encode('one!')),
      new TextEncoder().encode('one!'),
    );
    const secondAsset = await completeUpload(
      await createUpload(project.id, new TextEncoder().encode('two!'), 'EP02.srt'),
      new TextEncoder().encode('two!'),
    );
    await storage.deleteObject(firstAsset.asset.objectKey);
    const latest = await app.inject({ method: 'GET', url: `/api/projects/${project.id}` });
    const recycled = await recycle(project.id, latest.json().version);
    const due = new Date(Date.now() - 1_000);
    await makeCleanupDue(project.id, due);

    const expiredRestore = await app.inject({
      method: 'POST', url: `/api/projects/${project.id}/restore`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: recycled.response.json().project.version },
    });
    expect(expiredRestore.statusCode).toBe(409);
    expect(expiredRestore.json().error.code).toBe('PROJECT_RECYCLE_EXPIRED');

    const worker = new ProjectCleanupWorker(pool, storage, lifecycleConfig, { workerId: 'worker-tombstone' });
    const result = await worker.runOnce();
    expect(result).toMatchObject({ processed: true, projectId: project.id, status: 'completed' });
    expect(storage.hasObject(secondAsset.asset.objectKey)).toBe(false);
    const tombstone = await pool.query<{
      asset_count: number; object_deleted_count: number; object_missing_count: number;
    }>('SELECT asset_count, object_deleted_count, object_missing_count FROM project_purge_tombstones WHERE project_id = $1', [project.id]);
    expect(tombstone.rows[0]).toMatchObject({ asset_count: 2, object_deleted_count: 1, object_missing_count: 1 });
    const projectState = await pool.query<{ lifecycle_status: string; name: string }>(
      'SELECT lifecycle_status, name FROM projects WHERE id = $1', [project.id],
    );
    expect(projectState.rows[0]).toEqual({ lifecycle_status: 'purged', name: '[已清理项目]' });
    expect((await app.inject({ method: 'GET', url: `/api/projects/${project.id}` })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/recycle-bin' })).json().total).toBe(0);
    expect(await worker.runOnce()).toEqual({ processed: false });
  });

  it('对象删除失败保持 purging 和失败原因，租约重试后完成', async () => {
    const project = await createProject('匿名重试项目');
    const completed = await completeUpload(
      await createUpload(project.id, new TextEncoder().encode('data')),
      new TextEncoder().encode('data'),
    );
    const latest = await app.inject({ method: 'GET', url: `/api/projects/${project.id}` });
    await recycle(project.id, latest.json().version);
    let now = new Date();
    await makeCleanupDue(project.id, new Date(now.getTime() - 1_000));
    storage.failNextDeleteObject();
    const worker = new ProjectCleanupWorker(pool, storage, lifecycleConfig, {
      workerId: 'worker-retry', clock: () => now,
    });
    expect(await worker.runOnce()).toMatchObject({ processed: true, status: 'retryable' });
    const failed = await pool.query<{ lifecycle_status: string; status: string; last_error: string | null }>(
      `SELECT project.lifecycle_status, job.status, job.last_error
         FROM projects project JOIN cleanup_jobs job ON job.project_id = project.id
        WHERE project.id = $1`, [project.id],
    );
    expect(failed.rows[0]?.lifecycle_status).toBe('purging');
    expect(failed.rows[0]?.status).toBe('retryable');
    expect(failed.rows[0]?.last_error).toContain('删除暂时失败');

    const otherProject = await createProject('匿名清理中项目');
    await recycle(otherProject.id, otherProject.version);
    await makeCleanupDue(otherProject.id, new Date(now.getTime() - 1_000));
    const repository = new ProjectLifecycleRepository(pool);
    const otherClaim = await repository.claimCleanupJob({
      workerId: 'worker-filter', now, leaseExpiresAt: new Date(now.getTime() + 60_000),
    });
    expect(otherClaim?.projectId).toBe(otherProject.id);
    const allPurging = await app.inject({ method: 'GET', url: '/api/recycle-bin?lifecycleStatus=purging' });
    const retrying = await app.inject({
      method: 'GET', url: '/api/recycle-bin?lifecycleStatus=purging&cleanupJobStatus=retryable',
    });
    expect(allPurging.json().total).toBe(2);
    expect(retrying.json()).toMatchObject({
      total: 1,
      items: [{ id: project.id, lifecycleStatus: 'purging', cleanupJob: { status: 'retryable' } }],
    });
    const restore = await app.inject({
      method: 'POST', url: `/api/projects/${project.id}/restore`,
      headers: { 'idempotency-key': randomUUID() }, payload: { expectedVersion: latest.json().version + 2 },
    });
    expect(restore.statusCode).toBe(409);
    expect(restore.json().error.code).toBe('PROJECT_PURGING');

    now = new Date(now.getTime() + lifecycleConfig.cleanupRetryDelayMs + 1);
    expect(await worker.runOnce()).toMatchObject({ processed: true, status: 'completed' });
    expect(storage.hasObject(completed.asset.objectKey)).toBe(false);
  });

  it('有效租约阻止其他 Worker 重复领取，租约过期后可恢复', async () => {
    const project = await createProject('匿名租约项目');
    await recycle(project.id, project.version);
    const now = new Date();
    await makeCleanupDue(project.id, new Date(now.getTime() - 1_000));
    const repository = new ProjectLifecycleRepository(pool);
    const claimed = await repository.claimCleanupJob({
      workerId: 'stalled-worker', now, leaseExpiresAt: new Date(now.getTime() + 10_000),
    });
    expect(claimed?.projectId).toBe(project.id);
    const waiting = new ProjectCleanupWorker(pool, storage, lifecycleConfig, {
      workerId: 'second-worker', clock: () => new Date(now.getTime() + 5_000),
    });
    expect(await waiting.runOnce()).toEqual({ processed: false });
    const recovered = new ProjectCleanupWorker(pool, storage, lifecycleConfig, {
      workerId: 'recovery-worker', clock: () => new Date(now.getTime() + 10_001),
    });
    expect(await recovered.runOnce()).toMatchObject({ processed: true, status: 'completed' });
  });

  it('回收与完成竞态由项目锁唯一决定，迟到完成不能复活会话', async () => {
    const project = await createProject('匿名竞态项目');
    const bytes = new TextEncoder().encode('race');
    const session = await createUpload(project.id, bytes);
    const uploaded = await uploadAllParts(session, bytes);
    const gate = storage.pauseNextComplete();
    const pendingCompletion = app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/complete`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: uploaded.version },
    });
    await gate.entered;
    const latest = await app.inject({ method: 'GET', url: `/api/projects/${project.id}` });
    const recycled = await recycle(project.id, latest.json().version);
    expect(recycled.response.statusCode).toBe(201);
    gate.release();
    const completion = await pendingCompletion;
    expect(completion.statusCode).toBe(409);
    expect(completion.json().error.code).toBe('PROJECT_NOT_ACTIVE');
    const state = await pool.query<{ status: string; asset_id: string | null }>(
      'SELECT status, asset_id FROM upload_sessions WHERE id = $1', [session.id],
    );
    expect(state.rows[0]).toEqual({ status: 'aborted', asset_id: null });
    const assets = await pool.query<{ count: string }>('SELECT COUNT(*) FROM assets WHERE project_id = $1', [project.id]);
    expect(assets.rows[0]?.count).toBe('0');
  });
});
