import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import type { UploadProtocolConfig } from '../../backend/src/config.js';
import { createPool } from '../../backend/src/database/pool.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';
import { StorageAuthorizationExpiredError } from '../../backend/src/modules/uploads/upload-storage.js';
import { FilesystemDeliveryStorage, FilesystemUploadStorage } from '../../backend/src/modules/storage/filesystem-storage.js';
import { UploadCompletionWorker } from '../../backend/src/workers/upload-completion.worker.js';

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
  checksumValue?: string;
  includeChecksum?: boolean;
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
      ...(options.includeChecksum === false
        ? {}
        : { checksumValue: options.checksumValue ?? checksum(bytes) }),
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

const runCompletionWorker = async () => new UploadCompletionWorker(
  pool,
  storage,
  { leaseMs: 60_000, retryDelayMs: 0, maxAttempts: 3 },
  { workerId: randomUUID() },
).runOnce();

const runCompletionToTerminal = async (uploadId: string) => {
  let result = await runCompletionWorker();
  for (let attempt = 1; attempt < 3 && result.status === 'retryable'; attempt += 1) {
    await pool.query(
      `UPDATE upload_completion_jobs SET next_attempt_at=CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE upload_session_id=$1`,
      [uploadId],
    );
    result = await runCompletionWorker();
  }
  return result;
};

describe('分片上传协议', () => {
  it('无需客户端整文件摘要即可立即创建并上传，完成后以服务端摘要落账', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('server-authoritative-checksum');
    const created = await createUpload(projectId, bytes, { includeChecksum: false });

    expect(created.response.statusCode).toBe(201);
    expect(created.response.json().checksumValue).toBeNull();

    const uploaded = await uploadAllParts(created.response.json(), bytes);
    const completed = await app.inject({
      method: 'POST',
      url: `/api/uploads/${uploaded.id}/complete`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: uploaded.version },
    });
    const expectedChecksum = checksum(bytes);

    expect(completed.statusCode).toBe(202);
    expect(completed.json()).toMatchObject({ status: 'verifying', checksumValue: null });
    expect(await runCompletionWorker()).toMatchObject({ processed: true, status: 'completed' });
    const refreshed = await app.inject({ method: 'GET', url: `/api/uploads/${uploaded.id}` });
    expect(refreshed.json()).toMatchObject({
      status: 'completed',
      checksumValue: expectedChecksum,
      asset: { checksumValue: expectedChecksum },
    });
  });

  it('客户端期望摘要不匹配时稳定失败且不创建素材或绑定', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('expected-checksum-mismatch');
    const wrongChecksum = '0'.repeat(64);
    const created = await createUpload(projectId, bytes, { checksumValue: wrongChecksum });
    const uploaded = await uploadAllParts(created.response.json(), bytes);
    const response = await app.inject({
      method: 'POST',
      url: `/api/uploads/${uploaded.id}/complete`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: uploaded.version },
    });
    const assets = await pool.query<{ count: string }>('SELECT COUNT(*) FROM assets WHERE project_id = $1', [projectId]);
    const bindings = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM material_asset_bindings WHERE asset_id IN (SELECT id FROM assets WHERE project_id = $1)`,
      [projectId],
    );

    expect(response.statusCode).toBe(202);
    expect(await runCompletionWorker()).toMatchObject({ processed: true, status: 'failed' });
    const refreshed = await app.inject({ method: 'GET', url: `/api/uploads/${uploaded.id}` });
    expect(refreshed.json()).toMatchObject({ status: 'failed', errorCode: 'UPLOAD_CHECKSUM_MISMATCH', asset: null });
    expect(assets.rows[0]?.count).toBe('0');
    expect(bindings.rows[0]?.count).toBe('0');
  });

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

  it('create_upload 响应未知时按同一 commandId 只读恢复并隔离项目', async () => {
    const projectId = await createProject();
    const otherProjectId = await createProject();
    const bytes = new TextEncoder().encode('command-read');
    const commandId = randomUUID();
    const created = await createUpload(projectId, bytes, { idempotencyKey: commandId });
    expect(created.response.statusCode).toBe(201);

    const before = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM upload_commands WHERE idempotency_key = $1`, [commandId]);
    const recovered = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/uploads/commands/${commandId}`,
    });
    const after = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM upload_commands WHERE idempotency_key = $1`, [commandId]);
    const crossProject = await app.inject({
      method: 'GET',
      url: `/api/projects/${otherProjectId}/uploads/commands/${commandId}`,
    });
    const unknown = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/uploads/commands/${randomUUID()}`,
    });

    expect(recovered.statusCode).toBe(200);
    expect(recovered.json()).toMatchObject({
      commandId,
      projectId,
      status: 'succeeded',
      session: { id: created.response.json().id },
    });
    expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
    expect(crossProject.statusCode).toBe(404);
    expect(crossProject.json().error.code).toBe('UPLOAD_CREATE_COMMAND_NOT_FOUND');
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json().error.code).toBe('UPLOAD_CREATE_COMMAND_NOT_FOUND');
  });

  it('客户端暂停后可用同一 uploadId 补缺失分片，已确认分片与创建命令不变', async () => {
    const projectId = await createProject();
    const bytes = new TextEncoder().encode('abcdefgh');
    const commandId = randomUUID();
    const created = await createUpload(projectId, bytes, { idempotencyKey: commandId });
    const initial = created.response.json();
    const firstPart = await uploadAndConfirmPart(initial, 1, bytes.slice(0, 4));
    const beforeResume = await app.inject({ method: 'GET', url: `/api/uploads/${initial.id}` });
    const resumedAuthorization = await authorize(initial.id, 2, initial.fileFingerprint);

    expect(beforeResume.statusCode).toBe(200);
    expect(beforeResume.json().confirmedParts.map((part: any) => part.partNumber)).toEqual([1]);
    expect(beforeResume.json().missingPartNumbers).toEqual([2]);
    expect(resumedAuthorization.statusCode).toBe(200);
    expect(firstPart.session.id).toBe(initial.id);
    const createdCommands = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM upload_commands WHERE upload_session_id = $1 AND command_kind = 'create_upload'`,
      [initial.id],
    );
    expect(createdCommands.rows[0]?.count).toBe('1');
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

    expect(completed.statusCode).toBe(202);
    expect(completed.json()).toMatchObject({ status: 'verifying' });
    expect(await runCompletionWorker()).toMatchObject({ processed: true, status: 'completed' });
    const replay = await app.inject(completeRequest);
    const refreshed = await app.inject({ method: 'GET', url: `/api/uploads/${initial.id}` });
    const assets = await pool.query<{ count: string }>('SELECT COUNT(*) FROM assets WHERE project_id = $1', [projectId]);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().asset.id).toBe(refreshed.json().asset.id);
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
    expect(response.statusCode).toBe(202);
    expect(await runCompletionToTerminal(uploaded.id)).toMatchObject({ processed: true, status: 'failed' });
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

    expect(completed.statusCode).toBe(202);
    expect(await runCompletionWorker()).toMatchObject({ processed: true, status: 'completed' });
    const delayedReplay = await app.inject(confirmationRequest);
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
    const verifying = await app.inject({ method: 'GET', url: `/api/uploads/${uploaded.id}` });
    const firstWorker = await runCompletionWorker();
    const retrying = await app.inject({ method: 'GET', url: `/api/uploads/${uploaded.id}` });
    await pool.query(`UPDATE upload_completion_jobs SET next_attempt_at=CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE upload_session_id=$1`, [uploaded.id]);
    const secondWorker = await runCompletionWorker();
    const recovered = await app.inject(request);
    const assets = await pool.query<{ count: string }>('SELECT COUNT(*) FROM assets WHERE project_id = $1', [projectId]);

    expect(interrupted.statusCode).toBe(202);
    expect(verifying.json()).toMatchObject({ status: 'verifying', asset: null });
    expect(firstWorker).toMatchObject({ processed: true, status: 'retryable' });
    expect(retrying.json()).toMatchObject({ status: 'verifying', asset: null });
    expect(secondWorker).toMatchObject({ processed: true, status: 'completed' });
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
    const completingKey = randomUUID();
    const abortingKey = randomUUID();
    const [completing, losingAbort] = await Promise.all([
      app.inject({
      method: 'POST', url: `/api/uploads/${uploaded.id}/complete`,
      headers: { 'idempotency-key': completingKey }, payload: { expectedVersion: uploaded.version },
      }),
      app.inject({
        method: 'POST', url: `/api/uploads/${uploaded.id}/abort`,
        headers: { 'idempotency-key': abortingKey }, payload: { expectedVersion: uploaded.version },
      }),
    ]);
    if (completing.statusCode === 202) await runCompletionWorker();
    const refreshed = await app.inject({ method: 'GET', url: `/api/uploads/${uploaded.id}` });

    expect([200, 409]).toContain(losingAbort.statusCode);
    expect([202, 409]).toContain(completing.statusCode);
    expect(refreshed.json().status).toBe(completing.statusCode === 202 ? 'completed' : 'aborted');
    expect((await pool.query('SELECT COUNT(*)::int AS count FROM upload_commands WHERE upload_session_id=$1 AND command_kind IN (\'complete_upload\',\'abort_upload\')', [uploaded.id])).rows[0].count).toBe(1);
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

describe('正式本地磁盘存储', () => {
  it('production Fastify 使用同源 PUT，重建存储实例后仍可完成上传与交付读写', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qimao-filesystem-'));
    const uploadStorage = await FilesystemUploadStorage.create(root);
    const deliveryStorage = await FilesystemDeliveryStorage.create(root);
    const productionPool = createPool();
    const previousNodeEnv = process.env.NODE_ENV;
    let productionApp: Awaited<ReturnType<typeof createApp>> | null = null;
    try {
      process.env.NODE_ENV = 'production';
      productionApp = createApp({ database: productionPool, uploadStorage, deliveryStorage, uploadConfig });
      await productionApp.ready();
      await productionPool.query('TRUNCATE project_commands, projects CASCADE');
      const project = await productionApp.inject({
        method: 'POST', url: '/api/projects', headers: { 'idempotency-key': randomUUID() }, payload: { name: '磁盘存储链测试' },
      });
      const projectId = project.json().id as string;
      const bytes = Buffer.from('abcd');
      const created = await productionApp.inject({
        method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { 'idempotency-key': randomUUID() },
        payload: { originalFileName: 'EP01.srt', mediaKind: 'srt', sizeBytes: bytes.length, fileFingerprint: 'disk-fingerprint', checksumAlgorithm: 'sha256', checksumValue: checksum(bytes) },
      });
      expect(created.statusCode).toBe(201);
      const session = created.json();
      const authorization = await productionApp.inject({
        method: 'POST', url: `/api/uploads/${session.id}/parts/authorize`, headers: { 'idempotency-key': randomUUID() },
        payload: { partNumber: 1, fileFingerprint: session.fileFingerprint },
      });
      expect(authorization.statusCode).toBe(200);
      expect(authorization.json().uploadRequest).toMatchObject({ method: 'PUT', url: `/api/local/uploads/${session.id}/parts/1` });
      const uploaded = await productionApp.inject({
        method: 'PUT', url: `/api/local/uploads/${session.id}/parts/1`,
        headers: { authorization: `Bearer ${authorization.json().authorizationToken}`, 'content-type': 'application/octet-stream' }, payload: bytes,
      });
      expect(uploaded.statusCode).toBe(200);
      const confirmed = await productionApp.inject({
        method: 'POST', url: `/api/uploads/${session.id}/parts/confirm`, headers: { 'idempotency-key': randomUUID() }, payload: uploaded.json(),
      });
      expect(confirmed.statusCode).toBe(200);
      const completed = await productionApp.inject({
        method: 'POST', url: `/api/uploads/${session.id}/complete`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedVersion: confirmed.json().version },
      });
      expect(completed.statusCode).toBe(202);
      const completionWorker = new UploadCompletionWorker(
        productionPool,
        uploadStorage,
        { leaseMs: 60_000, retryDelayMs: 0, maxAttempts: 3 },
        { workerId: randomUUID() },
      );
      expect(await completionWorker.runOnce()).toMatchObject({ processed: true, status: 'completed' });
      const restoredUpload = await FilesystemUploadStorage.create(root);
      await expect(restoredUpload.headObject(session.objectKey)).resolves.toMatchObject({ sizeBytes: bytes.length, checksumValue: checksum(bytes) });
      const restoredUploadBytes = await restoredUpload.readObject(session.objectKey);
      expect(restoredUploadBytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(restoredUploadBytes!)).toEqual(Array.from(bytes));

      const deliveryKey = 'projects/isolated/deliveries/file.bin';
      await deliveryStorage.putObject({ objectKey: deliveryKey, bytes, contentType: 'application/octet-stream', metadata: { purpose: 'test' } });
      const restoredDelivery = await FilesystemDeliveryStorage.create(root);
      await expect(restoredDelivery.headObject(deliveryKey)).resolves.toMatchObject({ objectKey: deliveryKey, sizeBytes: bytes.length, checksumValue: checksum(bytes) });
      const restoredDeliveryBytes = await restoredDelivery.readObject(deliveryKey);
      expect(restoredDeliveryBytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(restoredDeliveryBytes!)).toEqual(Array.from(bytes));
      await expect(restoredDelivery.deleteObject!(deliveryKey)).resolves.toBe('deleted');
      await expect(restoredDelivery.headObject(deliveryKey)).resolves.toBeNull();
    } finally {
      await productionApp?.close().catch(() => undefined);
      if (!productionApp) await productionPool.end().catch(() => undefined);
      process.env.NODE_ENV = previousNodeEnv;
      await rm(root, { recursive: true, force: true });
    }
  });

  it('拒绝相对或不存在的存储根，不把路径直接拼接到对象键', async () => {
    await expect(FilesystemUploadStorage.create('relative-storage-root')).rejects.toThrow('绝对路径');
    const root = join(tmpdir(), `qimao-missing-${randomUUID()}`);
    await expect(FilesystemUploadStorage.create(root)).rejects.toThrow();
  });
});
