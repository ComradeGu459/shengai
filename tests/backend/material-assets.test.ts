import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import type { UploadProtocolConfig } from '../../backend/src/config.js';
import { createPool } from '../../backend/src/database/pool.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';

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
const app = createApp({ database: pool, uploadStorage: storage, uploadConfig });

beforeAll(async () => app.ready());
beforeEach(async () => pool.query('TRUNCATE project_commands, projects CASCADE'));
afterAll(async () => app.close());

const checksum = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

const createProject = async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { 'idempotency-key': randomUUID() },
    payload: { name: '匿名资产绑定测试' },
  });
  expect(response.statusCode).toBe(201);
  return response.json().id as string;
};

const manifestBinding = (
  episodeNumber: number,
  role: 'company_srt' | 'asr_video' | 'screen_video',
  relativePath: string,
  sizeBytes: number,
  lastModifiedMs: number,
) => ({
  episodeNumber,
  role,
  relativePath,
  fileName: relativePath.split('/').at(-1)!,
  sizeBytes,
  lastModifiedMs,
  fingerprint: `${relativePath}|${sizeBytes}|${lastModifiedMs}`,
  mediaType: role === 'company_srt' ? 'srt' as const : 'video' as const,
});

const companyBytes = new TextEncoder().encode('srt!');
const videoBytes = new TextEncoder().encode('video123');
const companyBinding = manifestBinding(1, 'company_srt', '匿名测试剧/公司字幕/EP01.srt', 4, 1001);
const sharedAsrBinding = manifestBinding(1, 'asr_video', '匿名测试剧/视频/EP01.mp4', 8, 1002);
const sharedScreenBinding = { ...sharedAsrBinding, role: 'screen_video' as const };

const confirmManifest = async (projectId: string, expectedVersion = 0, bindings = [
  companyBinding,
  sharedAsrBinding,
  sharedScreenBinding,
]) => app.inject({
  method: 'POST',
  url: `/api/projects/${projectId}/material-manifests/confirm`,
  headers: { 'idempotency-key': randomUUID() },
  payload: { expectedVersion, rootName: '匿名测试剧', bindings },
});

const createBoundUpload = async (
  projectId: string,
  manifestId: string,
  bytes: Uint8Array,
  binding: typeof companyBinding,
  targets: Array<{ episodeNumber: number; role: 'company_srt' | 'asr_video' | 'screen_video' }>,
) => app.inject({
  method: 'POST',
  url: `/api/projects/${projectId}/uploads`,
  headers: { 'idempotency-key': randomUUID() },
  payload: {
    originalFileName: binding.fileName,
    mediaKind: binding.mediaType,
    sizeBytes: bytes.byteLength,
    fileFingerprint: binding.fingerprint,
    checksumAlgorithm: 'sha256',
    checksumValue: checksum(bytes),
    materialBinding: { manifestId, targets },
  },
});

const uploadAllPartsOverHttp = async (session: Record<string, any>, bytes: Uint8Array) => {
  let current = session;
  for (let partNumber = 1; partNumber <= session.totalParts; partNumber += 1) {
    const authorization = await app.inject({
      method: 'POST',
      url: `/api/uploads/${session.id}/parts/authorize`,
      payload: { partNumber, fileFingerprint: session.fileFingerprint },
    });
    expect(authorization.statusCode).toBe(200);
    const uploadRequest = authorization.json().uploadRequest;
    expect(uploadRequest).toMatchObject({ method: 'PUT' });
    const start = (partNumber - 1) * session.partSizeBytes;
    const receipt = await app.inject({
      method: uploadRequest.method,
      url: uploadRequest.url,
      headers: uploadRequest.headers,
      payload: Buffer.from(bytes.slice(start, start + session.partSizeBytes)),
    });
    expect(receipt.statusCode, receipt.body).toBe(200);
    const confirmation = await app.inject({
      method: 'POST',
      url: `/api/uploads/${session.id}/parts/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: receipt.json(),
    });
    expect(confirmation.statusCode).toBe(200);
    current = confirmation.json();
  }
  return current;
};

const completeUpload = async (session: Record<string, any>) => app.inject({
  method: 'POST',
  url: `/api/uploads/${session.id}/complete`,
  headers: { 'idempotency-key': randomUUID() },
  payload: { expectedVersion: session.version },
});

describe('M2.1 素材资产绑定与项目状态', () => {
  it('通过本地 fake HTTP 上传并让同集双视频角色共享唯一 Asset', async () => {
    const projectId = await createProject();
    const manifestResponse = await confirmManifest(projectId);
    expect(manifestResponse.statusCode).toBe(201);
    const manifest = manifestResponse.json();
    expect(manifest.assetBindings).toEqual([]);

    const initialProject = await app.inject({ method: 'GET', url: `/api/projects/${projectId}` });
    expect(initialProject.json().workflowStatus).toBe('draft');

    const companyCreated = await createBoundUpload(projectId, manifest.id, companyBytes, companyBinding, [
      { episodeNumber: 1, role: 'company_srt' },
    ]);
    expect(companyCreated.statusCode).toBe(201);
    expect(companyCreated.json().materialBinding.targets).toHaveLength(1);
    const companyUploaded = await uploadAllPartsOverHttp(companyCreated.json(), companyBytes);
    const companyCompleted = await completeUpload(companyUploaded);
    expect(companyCompleted.statusCode).toBe(200);

    const videoCreated = await createBoundUpload(projectId, manifest.id, videoBytes, sharedAsrBinding, [
      { episodeNumber: 1, role: 'screen_video' },
      { episodeNumber: 1, role: 'asr_video' },
    ]);
    expect(videoCreated.statusCode).toBe(201);
    expect(videoCreated.json().materialBinding.targets).toEqual([
      { episodeNumber: 1, role: 'asr_video' },
      { episodeNumber: 1, role: 'screen_video' },
    ]);
    const uploadingProject = await app.inject({ method: 'GET', url: `/api/projects/${projectId}` });
    expect(uploadingProject.json().workflowStatus).toBe('uploading');
    const videoUploaded = await uploadAllPartsOverHttp(videoCreated.json(), videoBytes);

    const gate = storage.pauseNextComplete();
    const pendingCompletion = completeUpload(videoUploaded);
    await gate.entered;
    const verifyingProject = await app.inject({ method: 'GET', url: `/api/projects/${projectId}` });
    expect(verifyingProject.json().workflowStatus).toBe('verifying');
    gate.release();
    const videoCompleted = await pendingCompletion;
    expect(videoCompleted.statusCode).toBe(200);

    const state = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/material-manifest` });
    expect(state.statusCode).toBe(200);
    expect(state.json().project.workflowStatus).toBe('ready');
    expect(state.json().manifest.assetBindings).toHaveLength(3);
    const asr = state.json().manifest.assetBindings.find((item: any) => item.role === 'asr_video');
    const screen = state.json().manifest.assetBindings.find((item: any) => item.role === 'screen_video');
    expect(asr.assetId).toBe(screen.assetId);

    const assets = await pool.query<{ count: string }>('SELECT COUNT(*) FROM assets WHERE project_id = $1', [projectId]);
    expect(assets.rows[0]?.count).toBe('2');
    const uploadList = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/uploads` });
    expect(uploadList.statusCode).toBe(200);
    expect(uploadList.json().items).toHaveLength(2);
  });

  it('新清单复用身份一致的 Asset，并让变更槽位进入 blocked', async () => {
    const projectId = await createProject();
    const firstManifest = (await confirmManifest(projectId)).json();
    const company = await createBoundUpload(projectId, firstManifest.id, companyBytes, companyBinding, [
      { episodeNumber: 1, role: 'company_srt' },
    ]);
    await completeUpload(await uploadAllPartsOverHttp(company.json(), companyBytes));
    const video = await createBoundUpload(projectId, firstManifest.id, videoBytes, sharedAsrBinding, [
      { episodeNumber: 1, role: 'asr_video' },
      { episodeNumber: 1, role: 'screen_video' },
    ]);
    await completeUpload(await uploadAllPartsOverHttp(video.json(), videoBytes));

    const identical = await confirmManifest(projectId, 1);
    expect(identical.statusCode).toBe(201);
    expect(identical.json().assetBindings).toHaveLength(3);
    const ready = await app.inject({ method: 'GET', url: `/api/projects/${projectId}` });
    expect(ready.json().workflowStatus).toBe('ready');

    const changedCompany = manifestBinding(1, 'company_srt', '匿名测试剧/公司字幕/EP01-new.srt', 4, 2001);
    const changed = await confirmManifest(projectId, 2, [changedCompany, sharedAsrBinding, sharedScreenBinding]);
    expect(changed.statusCode).toBe(201);
    expect(changed.json().assetBindings).toHaveLength(2);
    expect(changed.json().assetBindings.every((item: any) => item.role !== 'company_srt')).toBe(true);
    const blocked = await app.inject({ method: 'GET', url: `/api/projects/${projectId}` });
    expect(blocked.json().workflowStatus).toBe('blocked');

    const retry = await createBoundUpload(projectId, changed.json().id, companyBytes, changedCompany, [
      { episodeNumber: 1, role: 'company_srt' },
    ]);
    expect(retry.statusCode).toBe(201);
    const uploading = await app.inject({ method: 'GET', url: `/api/projects/${projectId}` });
    expect(uploading.json().workflowStatus).toBe('uploading');
  });

  it('共享 MP4 必须一次覆盖两个角色，并拒绝错误指纹', async () => {
    const projectId = await createProject();
    const manifest = (await confirmManifest(projectId)).json();
    const partial = await createBoundUpload(projectId, manifest.id, videoBytes, sharedAsrBinding, [
      { episodeNumber: 1, role: 'asr_video' },
    ]);
    expect(partial.statusCode).toBe(409);
    expect(partial.json().error.code).toBe('MATERIAL_UPLOAD_BINDING_INVALID');

    const mismatch = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/uploads`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        originalFileName: sharedAsrBinding.fileName,
        mediaKind: 'video',
        sizeBytes: videoBytes.byteLength,
        fileFingerprint: 'wrong-fingerprint',
        checksumAlgorithm: 'sha256',
        checksumValue: checksum(videoBytes),
        materialBinding: {
          manifestId: manifest.id,
          targets: [
            { episodeNumber: 1, role: 'asr_video' },
            { episodeNumber: 1, role: 'screen_video' },
          ],
        },
      },
    });
    expect(mismatch.statusCode).toBe(409);
    expect(mismatch.json().error.code).toBe('FILE_FINGERPRINT_MISMATCH');
  });

  it('未选择屏幕视频时不阻塞项目进入 ready', async () => {
    const projectId = await createProject();
    const manifestResponse = await confirmManifest(projectId, 0, [companyBinding, sharedAsrBinding]);
    expect(manifestResponse.statusCode).toBe(201);
    const manifest = manifestResponse.json();

    const company = await createBoundUpload(projectId, manifest.id, companyBytes, companyBinding, [
      { episodeNumber: 1, role: 'company_srt' },
    ]);
    await completeUpload(await uploadAllPartsOverHttp(company.json(), companyBytes));
    const video = await createBoundUpload(projectId, manifest.id, videoBytes, sharedAsrBinding, [
      { episodeNumber: 1, role: 'asr_video' },
    ]);
    await completeUpload(await uploadAllPartsOverHttp(video.json(), videoBytes));

    const state = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/material-manifest` });
    expect(state.statusCode).toBe(200);
    expect(state.json().project.workflowStatus).toBe('ready');
    expect(state.json().manifest.assetBindings).toHaveLength(2);
  });

  it('上传期间产生同一身份的新清单时，将完成资产绑定到最新清单', async () => {
    const projectId = await createProject();
    const firstManifest = (await confirmManifest(projectId, 0, [companyBinding, sharedAsrBinding])).json();
    const upload = await createBoundUpload(projectId, firstManifest.id, companyBytes, companyBinding, [
      { episodeNumber: 1, role: 'company_srt' },
    ]);
    const uploaded = await uploadAllPartsOverHttp(upload.json(), companyBytes);

    const secondManifest = await confirmManifest(projectId, 1, [companyBinding, sharedAsrBinding]);
    expect(secondManifest.statusCode, secondManifest.body).toBe(201);
    expect(secondManifest.json().assetBindings).toEqual([]);

    const completed = await completeUpload(uploaded);
    expect(completed.statusCode).toBe(200);
    const state = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/material-manifest` });
    expect(state.json().manifest.id).toBe(secondManifest.json().id);
    expect(state.json().manifest.assetBindings).toHaveLength(1);
    expect(state.json().project.workflowStatus).toBe('blocked');
  });
});
