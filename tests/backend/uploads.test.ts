import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import type { UploadProtocolConfig } from '../../backend/src/config.js';
import { createPool } from '../../backend/src/database/pool.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';
import { StorageAuthorizationExpiredError } from '../../backend/src/modules/uploads/upload-storage.js';

const pool = createPool();
const storage = new InMemoryStorageFake();
const uploadConfig: UploadProtocolConfig = {
  partSizeBytes: 4,
  maxFileSizeBytes: 100,
  sessionTtlMs: 60_000,
  authorizationTtlMs: 1_000,
  perFileConcurrency: 3,
  browserConcurrency: 12,
};
const app = createApp({ database: pool, uploadStorage: storage, uploadConfig });

beforeAll(async () => app.ready());
beforeEach(async () => {
  storage.setClock(() => new Date());
  await pool.query('TRUNCATE project_commands, projects CASCADE');
});
afterAll(async () => app.close());

const checksum = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

const createProject = async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { 'idempotency-key': randomUUID() },
    payload: { name: '匿名分片协议测试' },
  });
  return response.json().id as string;
};

const createUpload = async (projectId: string, bytes: Uint8Array, options: {
  idempotencyKey?: string;
  fileFingerprint?: string;
  originalFileName?: string;
  mediaKind?: 'srt' | 'video';
} = {}) => {
  const request = {
    method: 'POST' as const,
    url: `/api/projects/${projectId}/uploads`,
    headers: { 'idempotency-key': options.idempotencyKey ?? randomUUID() },
    payload: {
      originalFileName: options.originalFileName ?? 'EP01.srt',
      mediaKind: options.mediaKind ?? 'srt',
      sizeBytes: bytes.byteLength,
      fileFingerprint: options.fileFingerprint ?? `EP01.srt|${bytes.byteLength}|1754976000000`,
      checksumAlgorithm: 'sha256' as const,
      checksumValue: checksum(bytes),
    },
  };
  return { request, response: await app.inject(request) };
};

const authorize = async (uploadId: string, partNumber: number, fileFingerprint: string) =>
  app.inject({
    method: 'POST',
    url: `/api/uploads/${uploadId}/parts/authorize`,
    headers: { 'idempotency-key': randomUUID() },
    payload: { partNumber, fileFingerprint },
  });

const uploadAndConfirmPart = async (session: Record<string, any>, partNumber: number, bytes: Uint8Array) => {
  const authorization = await authorize(session.id, partNumber, session.fileFingerprint);
  expect(authorization.statusCode).toBe(200);
  const info = await storage.uploadAuthorizedPart(authorization.json().authorizationToken, bytes);
  const confirmation = await app.inject({
    method: 'POST',
    url: `/api/uploads/${session.id}/parts/confirm`,
    headers: { 'idempotency-key': randomUUID() },
    payload: info,
  });
  expect(confirmation.statusCode).toBe(200);
  return { info, session: confirmation.json() };
};

const uploadAllParts = async (session: Record<string, any>, bytes: Uint8Array) => {
  let current = session;
  for (let partNumber = 1; partNumber <= session.totalParts; partNumber += 1) {
    const start = (partNumber - 1) * session.partSizeBytes;
    const result = await uploadAndConfirmPart(current, partNumber, bytes.slice(start, start + session.partSizeBytes));
    current = result.session;
  }
  return current;
};

describe('分片上传协议', () => {
  it('创建会话幂等重放，拒绝同键异请求与非活动项目', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('anonymous');
    const key = randomUUID();
    const first = await createUpload(projectId, bytes, { idempotencyKey: key });
    const replay = await app.inject(first.request);
    const conflict = await createUpload(projectId, bytes, {
      idempotencyKey: key,
      fileFingerprint: 'different-file-fingerprint',
    });

    expect(first.response.statusCode).toBe(201);
    expect(first.response.json()).not.toHaveProperty('storageUploadId');
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(first.response.json().id);
    expect(conflict.response.statusCode).toBe(409);
    expect(conflict.response.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED');

    await pool.query(`UPDATE projects SET lifecycle_status = 'recycled' WHERE id = $1`, [projectId]);
    const inactive = await createUpload(projectId, bytes);
    expect(inactive.response.statusCode).toBe(409);
    expect(inactive.response.json().error.code).toBe('PROJECT_NOT_ACTIVE');
  });

  it('拒绝不匹配的扩展名和集中配置之外的大小', async () => {
    const projectId = await createProject();
    const invalidType = await createUpload(projectId, new Uint8Array(8), {
      originalFileName: 'EP01.zip',
      mediaKind: 'video',
    });
    const tooLarge = await createUpload(projectId, new Uint8Array(101));
    expect(invalidType.response.statusCode).toBe(400);
    expect(invalidType.response.json().error.code).toBe('UPLOAD_FILE_TYPE_INVALID');
    expect(tooLarge.response.statusCode).toBe(400);
    expect(tooLarge.response.json().error.code).toBe('UPLOAD_FILE_SIZE_INVALID');
  });

  it('缺失分片阻断完成并只为缺失分片重新授权', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcdefgh');
    const created = await createUpload(projectId, bytes);
    const initial = created.response.json();
    const firstPart = await uploadAndConfirmPart(initial, 1, bytes.slice(0, 4));
    const complete = await app.inject({
      method: 'POST',
      url: `/api/uploads/${initial.id}/complete`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: firstPart.session.version },
    });
    const confirmedAuthorization = await authorize(initial.id, 1, initial.fileFingerprint);
    const missingAuthorization = await authorize(initial.id, 2, initial.fileFingerprint);

    expect(complete.statusCode).toBe(409);
    expect(complete.json().error).toMatchObject({
      code: 'UPLOAD_PARTS_MISSING',
      missingPartNumbers: [2],
    });
    expect(confirmedAuthorization.statusCode).toBe(409);
    expect(confirmedAuthorization.json().error.code).toBe('UPLOAD_PART_ALREADY_CONFIRMED');
    expect(missingAuthorization.statusCode).toBe(200);
  });

  it('重复确认与完成安全，最终只创建一个素材记录', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcdefgh');
    const created = await createUpload(projectId, bytes);
    const initial = created.response.json();
    const authorization = await authorize(initial.id, 1, initial.fileFingerprint);
    const partOne = await storage.uploadAuthorizedPart(authorization.json().authorizationToken, bytes.slice(0, 4));
    const confirmRequest = {
      method: 'POST' as const,
      url: `/api/uploads/${initial.id}/parts/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: partOne,
    };
    const firstConfirm = await app.inject(confirmRequest);
    const replayConfirm = await app.inject(confirmRequest);
    expect(replayConfirm.json().version).toBe(firstConfirm.json().version);
    const current = await uploadAndConfirmPart(replayConfirm.json(), 2, bytes.slice(4));
    const completionKey = randomUUID();
    const completeRequest = {
      method: 'POST' as const,
      url: `/api/uploads/${initial.id}/complete`,
      headers: { 'idempotency-key': completionKey },
      payload: { expectedVersion: current.session.version },
    };
    const completed = await app.inject(completeRequest);
    const replay = await app.inject(completeRequest);
    const assets = await pool.query<{ count: string }>('SELECT COUNT(*) FROM assets WHERE project_id = $1', [projectId]);

    expect(completed.statusCode).toBe(200);
    expect(completed.json()).toMatchObject({ status: 'completed', asset: { sizeBytes: 8 } });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().asset.id).toBe(completed.json().asset.id);
    expect(assets.rows[0]?.count).toBe('1');
  });

  it('授权过期可重新授权，文件指纹不符必须重选原文件', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcd');
    const created = await createUpload(projectId, bytes);
    const session = created.response.json();
    const mismatch = await authorize(session.id, 1, 'wrong-fingerprint');
    const first = await authorize(session.id, 1, session.fileFingerprint);
    storage.setClock(() => new Date(new Date(first.json().expiresAt).getTime() + 1));
    await expect(storage.uploadAuthorizedPart(first.json().authorizationToken, bytes))
      .rejects.toBeInstanceOf(StorageAuthorizationExpiredError);
    storage.setClock(() => new Date());
    const renewed = await authorize(session.id, 1, session.fileFingerprint);
    const info = await storage.uploadAuthorizedPart(renewed.json().authorizationToken, bytes);

    expect(mismatch.statusCode).toBe(409);
    expect(mismatch.json().error.code).toBe('FILE_FINGERPRINT_MISMATCH');
    expect(renewed.statusCode).toBe(200);
    expect(info.sizeBytes).toBe(4);
  });

  it('会话过期要求重建，临时存储故障保持可重试', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcd');
    const created = await createUpload(projectId, bytes, { fileFingerprint: 'expired-fingerprint' });
    await pool.query(`UPDATE upload_sessions SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE id = $1`,
      [created.response.json().id]);
    const authorization = await app.inject({
      method: 'POST', url: `/api/uploads/${created.response.json().id}/parts/authorize`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { partNumber: 1, fileFingerprint: 'expired-fingerprint' },
    });
    expect(authorization.statusCode).toBe(410);
    expect(authorization.json().error.code).toBe('UPLOAD_SESSION_EXPIRED');
    const activeProjectId = await createProject();
    const active = await createUpload(activeProjectId, bytes);
    storage.failNextOperation();
    const temporary = await authorize(active.response.json().id, 1, active.response.json().fileFingerprint);
    expect(temporary.statusCode).toBe(503);
    expect(temporary.json().error).toMatchObject({ code: 'STORAGE_TEMPORARY_FAILURE', retryable: true });
    const recovered = await authorize(active.response.json().id, 1, active.response.json().fileFingerprint);
    expect(recovered.statusCode).toBe(200);
  });

  it.each([
    ['missing', 'STORAGE_OBJECT_NOT_FOUND'],
    ['size', 'UPLOAD_SIZE_MISMATCH'],
    ['checksum', 'UPLOAD_CHECKSUM_MISMATCH'],
  ] as const)('区分完成后的对象%s故障', async (fault, expectedCode) => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcdefgh');
    const created = await createUpload(projectId, bytes);
    const uploaded = await uploadAllParts(created.response.json(), bytes);
    storage.faultNextCompletedObject(fault);
    const response = await app.inject({
      method: 'POST', url: `/api/uploads/${uploaded.id}/complete`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: uploaded.version },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe(expectedCode);
    const refreshed = await app.inject({ method: 'GET', url: `/api/uploads/${uploaded.id}` });
    expect(refreshed.json()).toMatchObject({ status: 'failed', errorCode: expectedCode });
  });

  it('取消会话幂等且拒绝旧版本', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcd');
    const created = await createUpload(projectId, bytes);
    const session = created.response.json();
    const stale = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/abort`,
      headers: { 'idempotency-key': randomUUID() }, payload: { expectedVersion: session.version + 1 },
    });
    const key = randomUUID();
    const request = { method: 'POST' as const, url: `/api/uploads/${session.id}/abort`,
      headers: { 'idempotency-key': key }, payload: { expectedVersion: session.version } };
    const aborted = await app.inject(request);
    const replay = await app.inject(request);
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe('UPLOAD_VERSION_CONFLICT');
    expect(aborted.json().status).toBe('aborted');
    expect(replay.json().version).toBe(aborted.json().version);
  });

  it('取消命令先校验幂等键，不因同键异命令破坏存储上传', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcd');
    const createKey = randomUUID();
    const created = await createUpload(projectId, bytes, { idempotencyKey: createKey });
    const session = created.response.json();
    const conflict = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/abort`,
      headers: { 'idempotency-key': createKey }, payload: { expectedVersion: session.version },
    });
    const stillUsable = await authorize(session.id, 1, session.fileFingerprint);
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(stillUsable.statusCode).toBe(200);
  });

  it('确认分片同键同请求稳定重放，同键异请求明确冲突', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcdefgh');
    const created = await createUpload(projectId, bytes);
    const session = created.response.json();
    const firstAuthorization = await authorize(session.id, 1, session.fileFingerprint);
    const secondAuthorization = await authorize(session.id, 2, session.fileFingerprint);
    const firstInfo = await storage.uploadAuthorizedPart(firstAuthorization.json().authorizationToken, bytes.slice(0, 4));
    const secondInfo = await storage.uploadAuthorizedPart(secondAuthorization.json().authorizationToken, bytes.slice(4));
    const key = randomUUID();
    const firstRequest = {
      method: 'POST' as const,
      url: `/api/uploads/${session.id}/parts/confirm`,
      headers: { 'idempotency-key': key },
      payload: firstInfo,
    };
    const first = await app.inject(firstRequest);
    const replay = await app.inject(firstRequest);
    const conflict = await app.inject({ ...firstRequest, payload: secondInfo });

    expect(first.statusCode).toBe(200);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().version).toBe(first.json().version);
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('会话完成后仍稳定重放此前成功的分片确认', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcdefgh');
    const created = await createUpload(projectId, bytes);
    const session = created.response.json();
    const authorization = await authorize(session.id, 1, session.fileFingerprint);
    const firstInfo = await storage.uploadAuthorizedPart(authorization.json().authorizationToken, bytes.slice(0, 4));
    const confirmationRequest = {
      method: 'POST' as const,
      url: `/api/uploads/${session.id}/parts/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: firstInfo,
    };
    const firstConfirmation = await app.inject(confirmationRequest);
    const uploaded = await uploadAndConfirmPart(firstConfirmation.json(), 2, bytes.slice(4));
    const completed = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/complete`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: uploaded.session.version },
    });
    const delayedReplay = await app.inject(confirmationRequest);

    expect(completed.statusCode).toBe(200);
    expect(completed.json().status).toBe('completed');
    expect(delayedReplay.statusCode).toBe(200);
    expect(delayedReplay.json()).toMatchObject({ status: 'completed', asset: { sizeBytes: 8 } });
  });

  it('对象已合并但数据库落账前中断时，同一完成意图恢复为唯一素材', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcdefgh');
    const created = await createUpload(projectId, bytes);
    const uploaded = await uploadAllParts(created.response.json(), bytes);
    const request = {
      method: 'POST' as const,
      url: `/api/uploads/${uploaded.id}/complete`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: uploaded.version },
    };
    storage.failAfterNextComplete();
    const interrupted = await app.inject(request);
    const failed = await app.inject({ method: 'GET', url: `/api/uploads/${uploaded.id}` });
    const recovered = await app.inject(request);
    const assets = await pool.query<{ count: string }>('SELECT COUNT(*) FROM assets WHERE project_id = $1', [projectId]);

    expect(interrupted.statusCode).toBe(503);
    expect(failed.json()).toMatchObject({ status: 'failed', asset: null });
    expect(storage.hasObject(uploaded.objectKey)).toBe(true);
    expect(recovered.statusCode).toBe(200);
    expect(recovered.json()).toMatchObject({ status: 'completed', asset: { sizeBytes: 8 } });
    expect(assets.rows[0]?.count).toBe('1');
  });

  it('取消落库后，即使分片已通过存储核对，迟到确认也不能复活终态', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcd');
    const created = await createUpload(projectId, bytes);
    const session = created.response.json();
    const authorization = await authorize(session.id, 1, session.fileFingerprint);
    const info = await storage.uploadAuthorizedPart(authorization.json().authorizationToken, bytes);
    const gate = storage.pauseNextPartLookup();
    const pendingConfirmation = app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/parts/confirm`,
      headers: { 'idempotency-key': randomUUID() }, payload: info,
    });
    await gate.entered;
    const aborted = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/abort`,
      headers: { 'idempotency-key': randomUUID() }, payload: { expectedVersion: session.version },
    });
    gate.release();
    const confirmation = await pendingConfirmation;
    const refreshed = await app.inject({ method: 'GET', url: `/api/uploads/${session.id}` });

    expect(aborted.statusCode).toBe(200);
    expect(aborted.json().status).toBe('aborted');
    expect(confirmation.statusCode).toBe(409);
    expect(confirmation.json().error.code).toBe('UPLOAD_STATE_INVALID');
    expect(refreshed.json()).toMatchObject({ status: 'aborted', confirmedParts: [] });
  });

  it('完成与取消并发由锁内先行命令唯一决定，不留下中间态', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcdefgh');
    const created = await createUpload(projectId, bytes);
    const uploaded = await uploadAllParts(created.response.json(), bytes);
    const gate = storage.pauseNextComplete();
    const completing = app.inject({
      method: 'POST', url: `/api/uploads/${uploaded.id}/complete`,
      headers: { 'idempotency-key': randomUUID() }, payload: { expectedVersion: uploaded.version },
    });
    await gate.entered;
    const losingAbort = await app.inject({
      method: 'POST', url: `/api/uploads/${uploaded.id}/abort`,
      headers: { 'idempotency-key': randomUUID() }, payload: { expectedVersion: uploaded.version },
    });
    gate.release();
    const completed = await completing;
    const refreshed = await app.inject({ method: 'GET', url: `/api/uploads/${uploaded.id}` });

    expect(losingAbort.statusCode).toBe(409);
    expect(completed.statusCode).toBe(200);
    expect(completed.json().status).toBe('completed');
    expect(refreshed.json().status).toBe('completed');
  });

  it('项目回收后拒绝授权、确认和完成且不产生副作用，但仍允许取消清理', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcdefgh');
    const pendingCreated = await createUpload(projectId, bytes.slice(0, 4));
    const pending = pendingCreated.response.json();
    const pendingAuthorization = await authorize(pending.id, 1, pending.fileFingerprint);
    const pendingInfo = await storage.uploadAuthorizedPart(pendingAuthorization.json().authorizationToken, bytes.slice(0, 4));
    const completableCreated = await createUpload(projectId, bytes);
    const completable = await uploadAllParts(completableCreated.response.json(), bytes);
    await pool.query(`UPDATE projects SET lifecycle_status = 'recycled' WHERE id = $1`, [projectId]);

    const authorization = await app.inject({
      method: 'POST', url: `/api/uploads/${pending.id}/parts/authorize`,
      payload: { partNumber: 1, fileFingerprint: pending.fileFingerprint },
    });
    const confirmation = await app.inject({
      method: 'POST', url: `/api/uploads/${pending.id}/parts/confirm`,
      headers: { 'idempotency-key': randomUUID() }, payload: pendingInfo,
    });
    const completion = await app.inject({
      method: 'POST', url: `/api/uploads/${completable.id}/complete`,
      headers: { 'idempotency-key': randomUUID() }, payload: { expectedVersion: completable.version },
    });
    const aborted = await app.inject({
      method: 'POST', url: `/api/uploads/${pending.id}/abort`,
      headers: { 'idempotency-key': randomUUID() }, payload: { expectedVersion: pending.version },
    });
    const unchanged = await app.inject({ method: 'GET', url: `/api/uploads/${completable.id}` });
    const assets = await pool.query<{ count: string }>('SELECT COUNT(*) FROM assets WHERE project_id = $1', [projectId]);

    expect(authorization.statusCode).toBe(409);
    expect(authorization.json().error.code).toBe('PROJECT_NOT_ACTIVE');
    expect(confirmation.statusCode).toBe(409);
    expect(confirmation.json().error.code).toBe('PROJECT_NOT_ACTIVE');
    expect(completion.statusCode).toBe(409);
    expect(completion.json().error.code).toBe('PROJECT_NOT_ACTIVE');
    expect(aborted.statusCode).toBe(200);
    expect(aborted.json().status).toBe('aborted');
    expect(unchanged.json()).toMatchObject({ status: 'uploading', asset: null });
    expect(storage.hasObject(completable.objectKey)).toBe(false);
    expect(assets.rows[0]?.count).toBe('0');
  });
});
