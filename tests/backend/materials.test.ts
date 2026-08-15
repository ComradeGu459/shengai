import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { createPool } from '../../backend/src/database/pool.js';

const pool = createPool();
const app = createApp({ database: pool });

beforeAll(async () => app.ready());
beforeEach(async () => pool.query('TRUNCATE project_commands, projects CASCADE'));
afterAll(async () => app.close());

const createProject = async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { 'idempotency-key': randomUUID() },
    payload: { name: '匿名整剧素材测试' },
  });
  return response.json().id as string;
};

const file = (
  episodeNumber: number,
  role: 'company_srt' | 'asr_video' | 'screen_video',
  relativePath: string,
) => {
  const fileName = relativePath.split('/').at(-1)!;
  const sizeBytes = role === 'company_srt' ? 1024 : 5_000_000;
  const lastModifiedMs = 1_754_976_000_000 + episodeNumber;
  return {
    episodeNumber,
    role,
    relativePath,
    fileName,
    sizeBytes,
    lastModifiedMs,
    fingerprint: `${relativePath}|${sizeBytes}|${lastModifiedMs}`,
    mediaType: role === 'company_srt' ? 'srt' : 'video',
  } as const;
};

const manifestBody = {
  expectedVersion: 0,
  rootName: '匿名测试剧',
  bindings: [
    file(1, 'company_srt', '匿名测试剧/公司字幕/EP01.srt'),
    file(1, 'asr_video', '匿名测试剧/中文视频/EP01.mp4'),
    file(1, 'screen_video', '匿名测试剧/画面字/EP01.mp4'),
    file(2, 'company_srt', '匿名测试剧/公司字幕/EP02.srt'),
    file(2, 'asr_video', '匿名测试剧/中文视频/EP02.mp4'),
  ],
};

describe('整剧素材清单 API', () => {
  it('确认清单后可从项目详情刷新恢复', async () => {
    const projectId = await createProject();
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/material-manifests/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: manifestBody,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      projectId,
      version: 1,
      episodeCount: 2,
      bindingCount: 5,
      rootName: '匿名测试剧',
    });

    const refreshed = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/material-manifest`,
    });
    expect(refreshed.statusCode).toBe(200);
    const refreshedBody = refreshed.json();
    expect(refreshedBody).toMatchObject({
      project: { id: projectId, name: '匿名整剧素材测试' },
      manifest: { version: 1 },
    });
    expect(refreshedBody.manifest.bindings).toHaveLength(5);
    expect(refreshedBody.manifest.bindings[0]).toMatchObject({ episodeNumber: 1 });
  });

  it('同一确认命令可重放，同键不同清单稳定冲突', async () => {
    const projectId = await createProject();
    const key = randomUUID();
    const request = {
      method: 'POST' as const,
      url: `/api/projects/${projectId}/material-manifests/confirm`,
      headers: { 'idempotency-key': key },
      payload: manifestBody,
    };
    const first = await app.inject(request);
    const replay = await app.inject(request);
    const conflict = await app.inject({
      ...request,
      payload: { ...manifestBody, bindings: manifestBody.bindings.filter((item) => item.role !== 'screen_video') },
    });
    const count = await pool.query<{ count: string }>('SELECT COUNT(*) FROM material_manifests');

    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(first.json().id);
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(count.rows[0]?.count).toBe('1');
  });

  it('同一幂等键接受属性顺序不同但语义等价的清单', async () => {
    const projectId = await createProject();
    const key = randomUUID();
    const first = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/material-manifests/confirm`,
      headers: { 'idempotency-key': key },
      payload: manifestBody,
    });
    const reorderedBindings = manifestBody.bindings.map((binding) => ({
      mediaType: binding.mediaType,
      fingerprint: binding.fingerprint,
      lastModifiedMs: binding.lastModifiedMs,
      sizeBytes: binding.sizeBytes,
      fileName: binding.fileName,
      relativePath: binding.relativePath,
      role: binding.role,
      episodeNumber: binding.episodeNumber,
    }));
    const replay = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/material-manifests/confirm`,
      headers: { 'idempotency-key': key },
      payload: { bindings: reorderedBindings, rootName: manifestBody.rootName, expectedVersion: 0 },
    });

    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(first.json().id);
  });

  it('旧版本确认返回清单版本冲突', async () => {
    const projectId = await createProject();
    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/material-manifests/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: manifestBody,
    });
    const conflict = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/material-manifests/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { ...manifestBody, bindings: manifestBody.bindings.filter((item) => item.role !== 'screen_video') },
    });

    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({
      error: {
        code: 'MATERIAL_MANIFEST_VERSION_CONFLICT',
        action: 'reload_latest_manifest',
      },
    });
  });

  it('拒绝缺少必需角色或重复相对路径的清单', async () => {
    const projectId = await createProject();
    const missing = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/material-manifests/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { ...manifestBody, bindings: manifestBody.bindings.filter((item) => item.role !== 'asr_video') },
    });
    const duplicate = manifestBody.bindings.map((item, index) =>
      index === 1 ? { ...item, relativePath: manifestBody.bindings[0]!.relativePath } : item,
    );
    const duplicated = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/material-manifests/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { ...manifestBody, bindings: duplicate },
    });

    expect(missing.statusCode).toBe(400);
    expect(missing.json().error.code).toBe('MATERIAL_MANIFEST_INVALID');
    expect(duplicated.statusCode).toBe(400);
    expect(duplicated.json().error.code).toBe('MATERIAL_MANIFEST_INVALID');
  });

  it.each([
    ['绝对路径', 'C:/匿名测试剧/公司字幕/EP01.srt', 'EP01.srt'],
    ['越界路径', '匿名测试剧/../EP01.srt', 'EP01.srt'],
    ['其他根目录', '另一部剧/公司字幕/EP01.srt', 'EP01.srt'],
    ['文件名不一致', '匿名测试剧/公司字幕/EP01.srt', 'wrong.srt'],
  ])('拒绝%s并返回稳定素材清单错误', async (_label, relativePath, fileName) => {
    const projectId = await createProject();
    const invalidBinding = {
      ...manifestBody.bindings[0]!,
      relativePath,
      fileName,
      fingerprint: `${relativePath}|${manifestBody.bindings[0]!.sizeBytes}|${manifestBody.bindings[0]!.lastModifiedMs}`,
    };
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/material-manifests/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { ...manifestBody, bindings: [invalidBinding, ...manifestBody.bindings.slice(1)] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('MATERIAL_MANIFEST_INVALID');
    const count = await pool.query<{ count: string }>('SELECT COUNT(*) FROM material_manifests');
    expect(count.rows[0]?.count).toBe('0');
  });
});
