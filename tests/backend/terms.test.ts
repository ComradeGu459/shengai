import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import type { ProjectLifecycleConfig, UploadProtocolConfig } from '../../backend/src/config.js';
import { createPool } from '../../backend/src/database/pool.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';
import { ProjectCleanupWorker } from '../../backend/src/workers/project-cleanup.worker.js';

const pool = createPool();
const storage = new InMemoryStorageFake();
const uploadConfig: UploadProtocolConfig = {
  partSizeBytes: 64,
  maxFileSizeBytes: 100_000,
  sessionTtlMs: 60_000,
  authorizationTtlMs: 10_000,
  perFileConcurrency: 3,
  browserConcurrency: 12,
};
const lifecycleConfig: ProjectLifecycleConfig = {
  recycleRetentionMs: 48 * 60 * 60 * 1_000,
  cleanupLeaseMs: 60_000,
  cleanupRetryDelayMs: 1_000,
  cleanupMaxAttempts: 3,
};
const app = createApp({ database: pool, uploadStorage: storage, uploadConfig, lifecycleConfig });

beforeAll(async () => app.ready());
const resetExportTemplates = async () => {
  const defaultTemplate = await pool.query<{ id: string }>(
    'SELECT id FROM term_export_template_versions WHERE version = 1',
  );
  await pool.query(
    `UPDATE term_export_template_settings
        SET active_template_version_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE singleton = TRUE`,
    [defaultTemplate.rows[0]!.id],
  );
  await pool.query(
    `DELETE FROM term_export_template_commands
      WHERE template_version_id IN (SELECT id FROM term_export_template_versions WHERE version > 1)`,
  );
  await pool.query('DELETE FROM term_export_template_versions WHERE version > 1');
};
beforeEach(async () => {
  await pool.query('TRUNCATE project_commands, projects CASCADE');
  await resetExportTemplates();
});
afterAll(async () => {
  await pool.query('TRUNCATE project_commands, projects CASCADE');
  await resetExportTemplates();
  await app.close();
});

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

const createProject = async (name = '匿名术语测试剧') => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { 'idempotency-key': randomUUID() },
    payload: { name },
  });
  expect(response.statusCode, response.body).toBe(201);
  return response.json();
};

const binding = (input: {
  episodeNumber: number;
  role: 'company_srt' | 'asr_video';
  fileName: string;
  bytes: Uint8Array;
  modified: number;
}) => ({
  episodeNumber: input.episodeNumber,
  role: input.role,
  relativePath: `匿名术语测试剧/${input.fileName}`,
  fileName: input.fileName,
  sizeBytes: input.bytes.byteLength,
  lastModifiedMs: input.modified,
  fingerprint: `匿名术语测试剧/${input.fileName}|${input.bytes.byteLength}|${input.modified}`,
  mediaType: input.role === 'company_srt' ? 'srt' as const : 'video' as const,
});

const confirmManifest = async (projectId: string, expectedVersion: number, bindings: ReturnType<typeof binding>[]) => {
  const response = await app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/material-manifests/confirm`,
    headers: { 'idempotency-key': randomUUID() },
    payload: { expectedVersion, rootName: '匿名术语测试剧', bindings },
  });
  expect(response.statusCode, response.body).toBe(201);
  return response.json();
};

const uploadBinding = async (
  projectId: string,
  manifestId: string,
  source: ReturnType<typeof binding>,
  bytes: Uint8Array,
) => {
  const created = await app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/uploads`,
    headers: { 'idempotency-key': randomUUID() },
    payload: {
      originalFileName: source.fileName,
      mediaKind: source.mediaType,
      sizeBytes: bytes.byteLength,
      fileFingerprint: source.fingerprint,
      checksumAlgorithm: 'sha256',
      checksumValue: sha256(bytes),
      materialBinding: {
        manifestId,
        targets: [{ episodeNumber: source.episodeNumber, role: source.role }],
      },
    },
  });
  expect(created.statusCode, created.body).toBe(201);
  let session = created.json();
  for (let partNumber = 1; partNumber <= session.totalParts; partNumber += 1) {
    const authorization = await app.inject({
      method: 'POST',
      url: `/api/uploads/${session.id}/parts/authorize`,
      payload: { partNumber, fileFingerprint: session.fileFingerprint },
    });
    expect(authorization.statusCode, authorization.body).toBe(200);
    const start = (partNumber - 1) * session.partSizeBytes;
    const receipt = await storage.uploadAuthorizedPart(
      authorization.json().authorizationToken,
      bytes.slice(start, start + session.partSizeBytes),
    );
    const confirmed = await app.inject({
      method: 'POST',
      url: `/api/uploads/${session.id}/parts/confirm`,
      headers: { 'idempotency-key': randomUUID() },
      payload: receipt,
    });
    expect(confirmed.statusCode, confirmed.body).toBe(200);
    session = confirmed.json();
  }
  const completed = await app.inject({
    method: 'POST',
    url: `/api/uploads/${session.id}/complete`,
    headers: { 'idempotency-key': randomUUID() },
    payload: { expectedVersion: session.version },
  });
  expect(completed.statusCode, completed.body).toBe(200);
  return completed.json().asset;
};

const encode = (text: string) => new TextEncoder().encode(text);

const eightTypeSrt = encode([
  '1', '00:00:01,000 --> 00:00:02,000', '【地名:雾城;备注=匿名地点】', '',
  '2', '00:00:02,000 --> 00:00:03,000', '【人名:林川;别称=小川/林队;性别=男;备注=匿名主角】', '',
  '3', '00:00:03,000 --> 00:00:04,000', '【特定物品:星钥;备注=匿名道具】', '',
  '4', '00:00:04,000 --> 00:00:05,000', '【朝代:云朝】', '',
  '5', '00:00:05,000 --> 00:00:06,000', '【组织名:风塔局】', '',
  '6', '00:00:06,000 --> 00:00:07,000', '【等级:七阶】', '',
  '7', '00:00:07,000 --> 00:00:08,000', '【物种/种族名:星羽族】', '',
  '8', '00:00:08,000 --> 00:00:09,000', '【特殊概念/事件:归潮事件】',
].join('\n'));

const prepareSource = async (bytes = eightTypeSrt, name = 'EP01.srt') => {
  const project = await createProject();
  const company = binding({ episodeNumber: 1, role: 'company_srt', fileName: name, bytes, modified: 1_001 });
  const placeholderVideoBytes = encode('video123');
  const placeholderVideo = binding({
    episodeNumber: 1, role: 'asr_video', fileName: 'EP01.mp4', bytes: placeholderVideoBytes, modified: 1_002,
  });
  const manifest = await confirmManifest(project.id, 0, [company, placeholderVideo]);
  const asset = await uploadBinding(project.id, manifest.id, company, bytes);
  return { project, company, placeholderVideo, manifest, asset, bytes };
};

const workspace = async (projectId: string) => {
  const response = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/terms` });
  expect(response.statusCode, response.body).toBe(200);
  return response.json();
};

const extract = async (projectId: string, expectedDigest?: string, key = randomUUID()) => app.inject({
  method: 'POST',
  url: `/api/projects/${projectId}/terms/extractions`,
  headers: { 'idempotency-key': key },
  payload: expectedDigest ? { expectedSourceSrtSetDigest: expectedDigest } : {},
});

const listCandidates = async (projectId: string, draftId: string, suffix = '') => {
  const response = await app.inject({
    method: 'GET',
    url: `/api/projects/${projectId}/terms/candidates?draftId=${draftId}${suffix}`,
  });
  expect(response.statusCode, response.body).toBe(200);
  return response.json();
};

const approveAll = async (projectId: string, draftId: string) => {
  const list = await listCandidates(projectId, draftId);
  const response = await app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/terms/candidates/batch-decisions`,
    payload: {
      items: list.items.map((item: any) => ({
        candidateId: item.id,
        expectedVersion: item.version,
        action: 'approve',
      })),
    },
  });
  expect(response.statusCode, response.body).toBe(200);
  expect(response.json().items.every((item: any) => item.ok)).toBe(true);
};

const getActiveTemplate = async () => {
  const response = await app.inject({ method: 'GET', url: '/api/terms/export-templates' });
  expect(response.statusCode, response.body).toBe(200);
  return response.json().items.find((item: any) => item.id === response.json().activeTemplateVersionId);
};

const publishTerms = async (input: {
  projectId: string;
  draftId: string;
  expectedDraftRevision: number;
  expectedSourceSrtSetDigest: string;
  templateVersionId?: string;
  idempotencyKey?: string;
}) => app.inject({
  method: 'POST',
  url: `/api/projects/${input.projectId}/terms/releases`,
  headers: { 'idempotency-key': input.idempotencyKey ?? randomUUID() },
  payload: {
    draftId: input.draftId,
    expectedDraftRevision: input.expectedDraftRevision,
    expectedSourceSrtSetDigest: input.expectedSourceSrtSetDigest,
    templateVersionId: input.templateVersionId ?? (await getActiveTemplate()).id,
  },
});

const unzipStoredXml = (archive: Buffer, fileName: string) => {
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    const size = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = archive.subarray(nameStart, nameStart + nameLength).toString('utf8');
    const contentStart = nameStart + nameLength + extraLength;
    if (name === fileName) return archive.subarray(contentStart, contentStart + size).toString('utf8');
    offset = contentStart + size;
  }
  throw new Error(`ZIP 中没有 ${fileName}`);
};

describe('BACK-M3-01A 术语后端权威流程', () => {
  it('最新清单中的全部 company_srt 都绑定已校验 Asset 后才开放术语来源', async () => {
    const project = await createProject('匿名双集门禁剧');
    const ep1Bytes = encode('1\n00:00:01,000 --> 00:00:02,000\n【人名:甲角色】');
    const ep2Bytes = encode('1\n00:00:01,000 --> 00:00:02,000\n【人名:乙角色】');
    const ep1 = binding({ episodeNumber: 1, role: 'company_srt', fileName: 'EP01.srt', bytes: ep1Bytes, modified: 10_001 });
    const ep2 = binding({ episodeNumber: 2, role: 'company_srt', fileName: 'EP02.srt', bytes: ep2Bytes, modified: 10_002 });
    const videoBytes = encode('video123');
    const video1 = binding({ episodeNumber: 1, role: 'asr_video', fileName: 'EP01.mp4', bytes: videoBytes, modified: 10_003 });
    const video2 = binding({ episodeNumber: 2, role: 'asr_video', fileName: 'EP02.mp4', bytes: videoBytes, modified: 10_004 });
    const manifest = await confirmManifest(project.id, 0, [ep1, video1, ep2, video2]);
    await uploadBinding(project.id, manifest.id, ep1, ep1Bytes);
    expect((await workspace(project.id)).source).toMatchObject({
      status: 'blocked', issueCode: 'TERM_SOURCE_NOT_READY', episodeCount: 2, assetCount: 1,
    });
    await uploadBinding(project.id, manifest.id, ep2, ep2Bytes);
    expect((await workspace(project.id)).source).toMatchObject({
      status: 'ready', episodeCount: 2, assetCount: 2, sourceSrtSetDigest: expect.any(String),
    });
  });

  it('只由最新公司 SRT Asset 生成来源摘要，视频变化不失效而 SRT 变化明确失效', async () => {
    const source = await prepareSource();
    const first = await workspace(source.project.id);
    expect(first.source).toMatchObject({ status: 'ready', assetCount: 1, episodeCount: 1 });
    const digest = first.source.sourceSrtSetDigest;
    expect((await extract(source.project.id, digest)).statusCode).toBe(201);
    expect((await workspace(source.project.id)).sourceIsCurrent).toBe(true);

    const videoBytes = encode('video123');
    const video = binding({ episodeNumber: 1, role: 'asr_video', fileName: 'EP01-v2.mp4', bytes: videoBytes, modified: 2_001 });
    const videoOnlyManifest = await confirmManifest(source.project.id, 1, [source.company, video]);
    expect(videoOnlyManifest.assetBindings).toHaveLength(1);
    expect((await workspace(source.project.id)).source.sourceSrtSetDigest).toBe(digest);
    expect((await workspace(source.project.id)).sourceIsCurrent).toBe(true);

    const changedBytes = encode('1\n00:00:01,000 --> 00:00:02,000\n【人名:新角色】');
    const changedCompany = binding({
      episodeNumber: 1, role: 'company_srt', fileName: 'EP01-v2.srt', bytes: changedBytes, modified: 3_001,
    });
    const changedManifest = await confirmManifest(source.project.id, 2, [changedCompany, video]);
    await uploadBinding(source.project.id, changedManifest.id, changedCompany, changedBytes);
    const changed = await workspace(source.project.id);
    expect(changed.source.sourceSrtSetDigest).not.toBe(digest);
    expect(changed.sourceIsCurrent).toBe(false);
    const stale = await extract(source.project.id, digest);
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error).toMatchObject({ code: 'TERM_SOURCE_CHANGED', requestId: expect.any(String) });
  });

  it('坏 SRT 精确失败并保存失败运行，不能跳过坏轴伪装完整', async () => {
    const bad = encode('1\n00:00:03,000 --> 00:00:02,000\n匿名坏轴');
    const source = await prepareSource(bad, 'EP01-bad.srt');
    const state = await workspace(source.project.id);
    expect(state.source.status).toBe('invalid');
    expect(state.source.issueDetail).toContain('EP01-bad.srt 的第 1 轴');
    const response = await extract(source.project.id);
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('TERM_SRT_INVALID');
    const failed = await workspace(source.project.id);
    expect(failed.latestRun).toMatchObject({ status: 'failed', errorCode: 'TERM_SRT_INVALID', draftId: null });
    expect(failed.activeDraft).toBeNull();
  });

  it('确定性 adapter 生成八类候选且每项具有真实 Cue，查询支持服务端分页筛选排序', async () => {
    const source = await prepareSource();
    const state = await workspace(source.project.id);
    const key = randomUUID();
    const first = await extract(source.project.id, state.source.sourceSrtSetDigest, key);
    const replay = await extract(source.project.id, state.source.sourceSrtSetDigest, key);
    expect(first.statusCode, first.body).toBe(201);
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json()).toEqual(first.json());
    expect(first.json().run).toMatchObject({
      status: 'completed', adapter: 'deterministic-marker-fake',
      adapterConfig: { paid: false }, usageSummary: { inputCues: 8, paidCalls: 0 },
      cueCount: 8, candidateCount: 8,
    });
    const draftId = first.json().draft.id;
    const page1 = await listCandidates(source.project.id, draftId, '&limit=3&offset=0&sortBy=type');
    const page2 = await listCandidates(source.project.id, draftId, '&limit=3&offset=3&sortBy=type');
    expect(page1.total).toBe(8);
    expect(page2.total).toBe(8);
    expect(page1.items[0].type).toBe('人名');
    const filtered = await listCandidates(source.project.id, draftId, `&type=${encodeURIComponent('地名')}`);
    expect(filtered).toMatchObject({ total: 1, items: [{ name: '雾城', evidenceCount: 1 }] });
    const detail = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/candidates/${filtered.items[0].id}`,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().evidence[0]).toMatchObject({ episodeNumber: 1, cueIndex: 1, text: expect.stringContaining('雾城') });
  });

  it('Cue 查询限定活动草稿与来源，并支持原文搜索、集数、分页及人工新增', async () => {
    const source = await prepareSource();
    const started = await extract(source.project.id);
    const draftId = started.json().draft.id;
    await pool.query(
      `INSERT INTO term_cues
         (id, project_id, source_srt_set_digest, asset_id, episode_number, cue_index, start_ms, end_ms, text)
       VALUES ($1,$2,$3,$4,1,99,9000,10000,'来源隔离词')`,
      ['f'.repeat(64), source.project.id, '0'.repeat(64), source.asset.id],
    );

    const page1 = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/cues?draftId=${draftId}&limit=3&offset=0`,
    });
    const page2 = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/cues?draftId=${draftId}&limit=3&offset=3`,
    });
    expect(page1.statusCode, page1.body).toBe(200);
    expect(page2.statusCode, page2.body).toBe(200);
    expect(page1.json()).toMatchObject({ total: 8 });
    expect(page2.json()).toMatchObject({ total: 8 });
    expect(page1.json().items.map((cue: any) => cue.cueIndex)).toEqual([1, 2, 3]);
    expect(page2.json().items.map((cue: any) => cue.cueIndex)).toEqual([4, 5, 6]);

    const searched = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/cues?draftId=${draftId}&search=${encodeURIComponent('林川')}&episodeNumber=1`,
    });
    expect(searched.statusCode, searched.body).toBe(200);
    expect(searched.json()).toMatchObject({
      total: 1,
      items: [{
        cueId: expect.any(String), assetId: source.asset.id, episodeNumber: 1,
        cueIndex: 2, startMs: 2000, endMs: 3000, text: expect.stringContaining('林川'),
      }],
    });
    const emptyEpisode = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/cues?draftId=${draftId}&episodeNumber=2`,
    });
    expect(emptyEpisode.json()).toEqual({ items: [], total: 0 });
    const isolatedSource = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/cues?draftId=${draftId}&search=${encodeURIComponent('来源隔离词')}`,
    });
    expect(isolatedSource.json()).toEqual({ items: [], total: 0 });

    const otherProject = await createProject('匿名 Cue 隔离项目');
    const crossProject = await app.inject({
      method: 'GET',
      url: `/api/projects/${otherProject.id}/terms/cues?draftId=${draftId}`,
    });
    expect(crossProject.statusCode, crossProject.body).toBe(404);
    expect(crossProject.json().error.code).toBe('TERM_DRAFT_NOT_FOUND');

    const current = await workspace(source.project.id);
    const manual = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/candidates`,
      payload: {
        draftId,
        expectedDraftRevision: current.activeDraft.revision,
        type: '人名',
        name: 'Cue 人工新增名',
        aliases: [],
        gender: 'unknown',
        note: '',
        evidenceCueIds: [searched.json().items[0].cueId],
      },
    });
    expect(manual.statusCode, manual.body).toBe(201);
    expect(manual.json()).toMatchObject({ origin: 'manual', evidenceCount: 1 });

    await pool.query("UPDATE term_drafts SET status = 'superseded' WHERE id = $1", [draftId]);
    const inactive = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/cues?draftId=${draftId}`,
    });
    expect(inactive.statusCode, inactive.body).toBe(409);
    expect(inactive.json().error.code).toBe('TERM_DRAFT_NOT_ACTIVE');
  });

  it('人工裁决使用条件版本、不可变事件，批量操作逐项返回局部结果并允许带证据新增', async () => {
    const source = await prepareSource();
    const started = await extract(source.project.id);
    const draftId = started.json().draft.id;
    const list = await listCandidates(source.project.id, draftId);
    const first = list.items[0];
    const approved = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${source.project.id}/terms/candidates/${first.id}`,
      payload: { expectedVersion: first.version, action: 'approve' },
    });
    expect(approved.statusCode).toBe(200);
    const approveAgain = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${source.project.id}/terms/candidates/${first.id}`,
      payload: { expectedVersion: approved.json().version, action: 'approve' },
    });
    expect(approveAgain.statusCode).toBe(409);
    expect(approveAgain.json().error.code).toBe('TERM_CANDIDATE_STATE_INVALID');
    const restorePending = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${source.project.id}/terms/candidates/${list.items[2].id}`,
      payload: { expectedVersion: list.items[2].version, action: 'restore' },
    });
    expect(restorePending.statusCode).toBe(409);
    expect(restorePending.json().error.code).toBe('TERM_CANDIDATE_STATE_INVALID');
    const batch = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/candidates/batch-decisions`,
      payload: {
        items: [
          { candidateId: first.id, expectedVersion: approved.json().version, action: 'reject' },
          { candidateId: list.items[1].id, expectedVersion: list.items[1].version, action: 'reject' },
        ],
      },
    });
    expect(batch.statusCode).toBe(200);
    expect(batch.json().items).toMatchObject([
      { candidateId: first.id, ok: false, error: { code: 'TERM_CANDIDATE_STATE_INVALID' } },
      { candidateId: list.items[1].id, ok: true, candidate: { status: 'rejected' } },
    ]);
    let rejectedDetail = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/candidates/${list.items[1].id}`,
    });
    expect(rejectedDetail.json().decisionEvents).toHaveLength(1);
    const editRejected = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${source.project.id}/terms/candidates/${list.items[1].id}`,
      payload: { expectedVersion: rejectedDetail.json().version, action: 'edit', name: '不应直接编辑' },
    });
    expect(editRejected.statusCode).toBe(409);
    expect(editRejected.json().error.code).toBe('TERM_CANDIDATE_STATE_INVALID');
    const restored = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${source.project.id}/terms/candidates/${list.items[1].id}`,
      payload: { expectedVersion: rejectedDetail.json().version, action: 'restore' },
    });
    expect(restored.statusCode).toBe(200);
    expect(restored.json().status).toBe('pending');
    const restoredAgain = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${source.project.id}/terms/candidates/${list.items[1].id}`,
      payload: { expectedVersion: restored.json().version, action: 'restore' },
    });
    expect(restoredAgain.statusCode).toBe(409);
    expect(restoredAgain.json().error.code).toBe('TERM_CANDIDATE_STATE_INVALID');
    rejectedDetail = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/candidates/${list.items[1].id}`,
    });
    expect(rejectedDetail.json().decisionEvents.map((event: any) => event.action)).toEqual(['rejected', 'restored']);
    const eventId = rejectedDetail.json().decisionEvents[0].id;
    await expect(pool.query('UPDATE term_decision_events SET actor = \'tampered\' WHERE id = $1', [eventId])).rejects.toThrow(
      'term decision events are immutable',
    );

    const current = await workspace(source.project.id);
    const cueId = rejectedDetail.json().evidence[0].cueId;
    const blankName = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/candidates`,
      payload: {
        draftId,
        expectedDraftRevision: current.activeDraft.revision,
        type: '人名',
        name: '   ',
        aliases: [],
        gender: 'unknown',
        note: '',
        evidenceCueIds: [cueId],
      },
    });
    expect(blankName.statusCode, blankName.body).toBe(422);
    expect(blankName.json()).toMatchObject({
      error: {
        code: 'TERM_CANDIDATE_INVALID',
        message: '中文术语不能为空。',
        retryable: false,
        action: 'edit_candidate',
      },
    });
    const manual = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/candidates`,
      payload: {
        draftId,
        expectedDraftRevision: current.activeDraft.revision,
        type: '人名',
        name: '人工补充名',
        aliases: ['补充称呼'],
        gender: 'unknown',
        note: '待人工补充',
        evidenceCueIds: [cueId],
      },
    });
    expect(manual.statusCode, manual.body).toBe(201);
    expect(manual.json()).toMatchObject({ origin: 'manual', status: 'edited', evidenceCount: 1 });
    const afterManual = await workspace(source.project.id);
    const duplicateAcrossTypes = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/candidates`,
      payload: {
        draftId,
        expectedDraftRevision: afterManual.activeDraft.revision,
        type: '地名',
        name: '人工补充名',
        aliases: [],
        gender: 'unknown',
        note: '',
        evidenceCueIds: [cueId],
      },
    });
    expect(duplicateAcrossTypes.statusCode, duplicateAcrossTypes.body).toBe(409);
    expect(duplicateAcrossTypes.json()).toMatchObject({
      error: {
        code: 'TERM_CANDIDATE_INVALID',
        message: '同一草稿中已存在相同中文术语的候选。',
        retryable: false,
        action: 'edit_candidate',
      },
    });
    const staleManual = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/candidates`,
      payload: {
        draftId,
        expectedDraftRevision: current.activeDraft.revision,
        type: '地名', name: '过期新增', aliases: [], gender: 'unknown', note: '', evidenceCueIds: [cueId],
      },
    });
    expect(staleManual.statusCode).toBe(409);
    expect(staleManual.json().error.code).toBe('TERM_DRAFT_VERSION_CONFLICT');
  });

  it('候选写入在事务内阻断回收态、来源变化和运行中提取', async () => {
    const runningSource = await prepareSource();
    const runningStarted = await extract(runningSource.project.id);
    const runningList = await listCandidates(runningSource.project.id, runningStarted.json().draft.id);
    await pool.query(
      `INSERT INTO term_extraction_runs
         (project_id, source_srt_set_digest, prompt_version, adapter, adapter_config, status, request_id)
       VALUES ($1,$2,'term-prompt-v1','deterministic-marker-fake','{}','running',$3)`,
      [runningSource.project.id, runningStarted.json().draft.sourceSrtSetDigest, randomUUID()],
    );
    const blockedByRun = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${runningSource.project.id}/terms/candidates/${runningList.items[0].id}`,
      payload: { expectedVersion: runningList.items[0].version, action: 'approve' },
    });
    expect(blockedByRun.statusCode, blockedByRun.body).toBe(409);
    expect(blockedByRun.json().error).toMatchObject({
      code: 'TERM_EXTRACTION_RUNNING', action: 'wait_for_extraction', retryable: false,
    });
    await pool.query("DELETE FROM term_extraction_runs WHERE project_id = $1 AND status = 'running'", [runningSource.project.id]);

    const changedBytes = encode('1\n00:00:01,000 --> 00:00:02,000\n【人名:来源变化名】');
    const changedCompany = binding({
      episodeNumber: 1,
      role: 'company_srt',
      fileName: 'EP01-changed.srt',
      bytes: changedBytes,
      modified: 4_001,
    });
    const changedManifest = await confirmManifest(
      runningSource.project.id,
      1,
      [changedCompany, runningSource.placeholderVideo],
    );
    await uploadBinding(runningSource.project.id, changedManifest.id, changedCompany, changedBytes);
    const blockedBySource = await app.inject({
      method: 'POST',
      url: `/api/projects/${runningSource.project.id}/terms/candidates`,
      payload: {
        draftId: runningStarted.json().draft.id,
        expectedDraftRevision: runningStarted.json().draft.revision,
        type: '人名',
        name: '来源变化后新增',
        aliases: [],
        gender: 'unknown',
        note: '',
        evidenceCueIds: [(await app.inject({
          method: 'GET',
          url: `/api/projects/${runningSource.project.id}/terms/candidates/${runningList.items[0].id}`,
        })).json().evidence[0].cueId],
      },
    });
    expect(blockedBySource.statusCode, blockedBySource.body).toBe(409);
    expect(blockedBySource.json().error).toMatchObject({ code: 'TERM_SOURCE_CHANGED', action: 'start_extraction' });

    for (const lifecycle of ['recycled', 'purging'] as const) {
      const source = await prepareSource();
      const started = await extract(source.project.id);
      const list = await listCandidates(source.project.id, started.json().draft.id);
      await pool.query('UPDATE projects SET lifecycle_status = $2 WHERE id = $1', [source.project.id, lifecycle]);
      const blocked = await app.inject({
        method: 'PATCH',
        url: `/api/projects/${source.project.id}/terms/candidates/${list.items[0].id}`,
        payload: { expectedVersion: list.items[0].version, action: 'approve' },
      });
      expect(blocked.statusCode, blocked.body).toBe(409);
      expect(blocked.json().error).toMatchObject({ code: 'TERM_PROJECT_NOT_ACTIVE', action: 'restore_project' });
      const publishBlocked = await publishTerms({
        projectId: source.project.id,
        draftId: started.json().draft.id,
        expectedDraftRevision: started.json().draft.revision,
        expectedSourceSrtSetDigest: started.json().draft.sourceSrtSetDigest,
      });
      expect(publishBlocked.statusCode, publishBlocked.body).toBe(409);
      expect(publishBlocked.json().error.code).toBe('TERM_PROJECT_NOT_ACTIVE');
    }
  });

  it('全部离开 pending 后幂等确认 V1，后续新草稿生成 V2 且不覆盖 V1', async () => {
    const source = await prepareSource();
    const started = await extract(source.project.id);
    const draftId = started.json().draft.id;
    const template = await getActiveTemplate();
    const initial = await workspace(source.project.id);
    const blocked = await publishTerms({
      projectId: source.project.id,
      draftId,
      expectedDraftRevision: initial.activeDraft.revision,
      expectedSourceSrtSetDigest: initial.source.sourceSrtSetDigest,
      templateVersionId: template.id,
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error.code).toBe('TERM_VERSION_PENDING_CANDIDATES');
    await approveAll(source.project.id, draftId);
    const ready = await workspace(source.project.id);
    const key = randomUUID();
    const payload = {
      draftId,
      expectedDraftRevision: ready.activeDraft.revision,
      expectedSourceSrtSetDigest: ready.source.sourceSrtSetDigest,
      templateVersionId: template.id,
    };
    const v1 = await app.inject({
      method: 'POST', url: `/api/projects/${source.project.id}/terms/releases`,
      headers: { 'idempotency-key': key }, payload,
    });
    const v1Replay = await app.inject({
      method: 'POST', url: `/api/projects/${source.project.id}/terms/releases`,
      headers: { 'idempotency-key': key }, payload,
    });
    expect(v1.statusCode, v1.body).toBe(201);
    expect(v1Replay.statusCode).toBe(200);
    expect(v1Replay.json()).toEqual(v1.json());
    expect(v1.json().version).toMatchObject({ version: 1, itemCount: 8 });
    expect(v1.json().export).toMatchObject({
      termVersionId: v1.json().version.id,
      templateVersionId: template.id,
    });
    const confirmOnly = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/versions`,
      headers: { 'idempotency-key': randomUUID() },
      payload,
    });
    expect(confirmOnly.statusCode).toBe(404);
    const originalName = v1.json().version.items[0].name;

    const draftKey = randomUUID();
    const cloned = await app.inject({
      method: 'POST', url: `/api/projects/${source.project.id}/terms/drafts`,
      headers: { 'idempotency-key': draftKey },
      payload: {
        baseTermVersionId: v1.json().version.id,
        expectedSourceSrtSetDigest: ready.source.sourceSrtSetDigest,
      },
    });
    expect(cloned.statusCode, cloned.body).toBe(201);
    const clonedItems = await listCandidates(source.project.id, cloned.json().id);
    const clonedTarget = clonedItems.items.find((item: any) => item.name === originalName);
    const edited = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${source.project.id}/terms/candidates/${clonedTarget.id}`,
      payload: { expectedVersion: clonedTarget.version, action: 'edit', name: `${originalName}-修订` },
    });
    expect(edited.statusCode, edited.body).toBe(200);
    const v2Ready = await workspace(source.project.id);
    const v2 = await publishTerms({
      projectId: source.project.id,
      draftId: cloned.json().id,
      expectedDraftRevision: v2Ready.activeDraft.revision,
      expectedSourceSrtSetDigest: v2Ready.source.sourceSrtSetDigest,
      templateVersionId: template.id,
    });
    expect(v2.statusCode, v2.body).toBe(201);
    expect(v2.json().version.version).toBe(2);
    expect(v2.json().version.items[0].name).toBe(`${originalName}-修订`);
    const readV1 = await app.inject({
      method: 'GET', url: `/api/projects/${source.project.id}/terms/versions/${v1.json().version.id}`,
    });
    expect(readV1.json().items[0].name).toBe(originalName);
    await expect(pool.query('UPDATE term_version_items SET name = \'tampered\' WHERE term_version_id = $1', [
      v1.json().version.id,
    ])).rejects.toThrow('confirmed term snapshots are immutable');
  });

  it('单一发布事务不留半成品，幂等重放稳定且显式模板不受启用项变化影响', async () => {
    const source = await prepareSource();
    const started = await extract(source.project.id);
    await approveAll(source.project.id, started.json().draft.id);
    const ready = await workspace(source.project.id);
    const defaultTemplate = await getActiveTemplate();
    const base = {
      draftId: started.json().draft.id,
      expectedDraftRevision: ready.activeDraft.revision,
      expectedSourceSrtSetDigest: ready.source.sourceSrtSetDigest,
      templateVersionId: defaultTemplate.id,
    };

    const missingTemplate = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { ...base, templateVersionId: randomUUID() },
    });
    expect(missingTemplate.statusCode, missingTemplate.body).toBe(404);
    expect(missingTemplate.json().error.code).toBe('TERM_EXPORT_TEMPLATE_NOT_FOUND');
    let counts = await pool.query<{ versions: string; exports: string }>(
      `SELECT (SELECT COUNT(*) FROM term_versions WHERE project_id = $1) AS versions,
              (SELECT COUNT(*) FROM term_exports WHERE project_id = $1) AS exports`,
      [source.project.id],
    );
    expect(counts.rows[0]).toEqual({ versions: '0', exports: '0' });

    await pool.query('DROP TRIGGER IF EXISTS term_export_test_failure ON term_exports');
    await pool.query('DROP FUNCTION IF EXISTS fail_term_export_test_insert()');
    await pool.query(`CREATE FUNCTION fail_term_export_test_insert() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'test export failure'; END; $$ LANGUAGE plpgsql`);
    await pool.query(`CREATE TRIGGER term_export_test_failure BEFORE INSERT ON term_exports
      FOR EACH ROW EXECUTE FUNCTION fail_term_export_test_insert()`);
    const key = randomUUID();
    try {
      const failed = await app.inject({
        method: 'POST',
        url: `/api/projects/${source.project.id}/terms/releases`,
        headers: { 'idempotency-key': key },
        payload: base,
      });
      expect(failed.statusCode).toBe(500);
      counts = await pool.query<{ versions: string; exports: string }>(
        `SELECT (SELECT COUNT(*) FROM term_versions WHERE project_id = $1) AS versions,
                (SELECT COUNT(*) FROM term_exports WHERE project_id = $1) AS exports`,
        [source.project.id],
      );
      expect(counts.rows[0]).toEqual({ versions: '0', exports: '0' });
      expect((await workspace(source.project.id)).activeDraft.status).toBe('active');
    } finally {
      await pool.query('DROP TRIGGER IF EXISTS term_export_test_failure ON term_exports');
      await pool.query('DROP FUNCTION IF EXISTS fail_term_export_test_insert()');
    }

    const customTemplate = await app.inject({
      method: 'POST',
      url: '/api/terms/export-templates',
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        name: '发布并发模板',
        columns: [
          { field: 'name', header: '术语' },
          { field: 'type', header: '类别' },
          { field: 'aliases', header: '别名' },
          { field: 'gender', header: '性别' },
          { field: 'note', header: '说明' },
        ],
      },
    });
    expect(customTemplate.statusCode, customTemplate.body).toBe(201);
    const activated = await app.inject({
      method: 'POST',
      url: `/api/terms/export-templates/${customTemplate.json().id}/activate`,
      payload: { expectedActiveTemplateVersionId: defaultTemplate.id },
    });
    expect(activated.statusCode, activated.body).toBe(200);

    const published = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/releases`,
      headers: { 'idempotency-key': key },
      payload: base,
    });
    const replay = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/releases`,
      headers: { 'idempotency-key': key },
      payload: base,
    });
    expect(published.statusCode, published.body).toBe(201);
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json()).toEqual(published.json());
    expect(published.json().export).toMatchObject({
      termVersionId: published.json().version.id,
      templateVersionId: defaultTemplate.id,
    });
    const keyConflict = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/releases`,
      headers: { 'idempotency-key': key },
      payload: { ...base, templateVersionId: customTemplate.json().id },
    });
    expect(keyConflict.statusCode, keyConflict.body).toBe(409);
    expect(keyConflict.json().error.code).toBe('TERM_IDEMPOTENCY_KEY_REUSED');
    counts = await pool.query<{ versions: string; exports: string }>(
      `SELECT (SELECT COUNT(*) FROM term_versions WHERE project_id = $1) AS versions,
              (SELECT COUNT(*) FROM term_exports WHERE project_id = $1) AS exports`,
      [source.project.id],
    );
    expect(counts.rows[0]).toEqual({ versions: '1', exports: '1' });
  });

  it('公司模板版本保持五字段唯一，明确绑定已确认版本并确定性生成历史 XLSX', async () => {
    const source = await prepareSource();
    const started = await extract(source.project.id);
    await approveAll(source.project.id, started.json().draft.id);
    const ready = await workspace(source.project.id);
    const templateList = await app.inject({ method: 'GET', url: '/api/terms/export-templates' });
    expect(templateList.statusCode, templateList.body).toBe(200);
    const defaultTemplate = templateList.json().items[0];
    expect(defaultTemplate).toMatchObject({
      version: 1,
      name: '默认五字段模板',
      isActive: true,
      columns: [
        { field: 'type', header: '类型' },
        { field: 'name', header: '中文内容' },
        { field: 'aliases', header: '别称' },
        { field: 'gender', header: '性别' },
        { field: 'note', header: '备注' },
      ],
    });
    const confirmed = await publishTerms({
      projectId: source.project.id,
      draftId: started.json().draft.id,
      expectedDraftRevision: ready.activeDraft.revision,
      expectedSourceSrtSetDigest: ready.source.sourceSrtSetDigest,
      templateVersionId: defaultTemplate.id,
    });
    expect(confirmed.statusCode, confirmed.body).toBe(201);

    for (const undeclaredColumnConfig of [
      { formula: '=UPPER(B2)' },
      { style: { bold: true } },
      { arbitraryConfig: { mode: 'unsupported' } },
    ]) {
      const rejected = await app.inject({
        method: 'POST',
        url: '/api/terms/export-templates',
        headers: { 'idempotency-key': randomUUID() },
        payload: {
          name: '含未声明配置的模板',
          columns: [
            { field: 'type', header: '类别', ...undeclaredColumnConfig },
            { field: 'name', header: '术语' },
            { field: 'aliases', header: '别名' },
            { field: 'gender', header: '人物性别' },
            { field: 'note', header: '说明' },
          ],
        },
      });
      expect(rejected.statusCode, rejected.body).toBe(400);
    }
    const templatesAfterRejectedConfig = await app.inject({ method: 'GET', url: '/api/terms/export-templates' });
    expect(templatesAfterRejectedConfig.json().items).toHaveLength(1);

    const invalidTemplate = await app.inject({
      method: 'POST',
      url: '/api/terms/export-templates',
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        name: '重复字段模板',
        columns: [
          { field: 'type', header: '类别' },
          { field: 'type', header: '重复类别' },
          { field: 'name', header: '术语' },
          { field: 'aliases', header: '别名' },
          { field: 'gender', header: '人物性别' },
        ],
      },
    });
    expect(invalidTemplate.statusCode, invalidTemplate.body).toBe(422);
    expect(invalidTemplate.json().error).toMatchObject({
      code: 'TERM_EXPORT_TEMPLATE_INVALID', action: 'edit_export_template', retryable: false,
    });

    const templateKey = randomUUID();
    const customPayload = {
      name: '匿名交付模板',
      columns: [
        { field: 'name', header: '术语文本' },
        { field: 'type', header: '类别' },
        { field: 'note', header: '说明' },
        { field: 'aliases', header: '可用别名' },
        { field: 'gender', header: '人物性别' },
      ],
    };
    const customTemplate = await app.inject({
      method: 'POST', url: '/api/terms/export-templates',
      headers: { 'idempotency-key': templateKey }, payload: customPayload,
    });
    const customReplay = await app.inject({
      method: 'POST', url: '/api/terms/export-templates',
      headers: { 'idempotency-key': templateKey }, payload: customPayload,
    });
    expect(customTemplate.statusCode, customTemplate.body).toBe(201);
    expect(customReplay.statusCode, customReplay.body).toBe(200);
    expect(customReplay.json()).toEqual(customTemplate.json());
    expect(customTemplate.json()).toMatchObject({ version: 2, name: '匿名交付模板', isActive: false });
    await expect(pool.query(
      'UPDATE term_export_template_versions SET name = \'篡改\' WHERE id = $1',
      [customTemplate.json().id],
    )).rejects.toThrow('term export template versions are immutable');

    const factsBeforeTemplateActivation = await pool.query<{
      candidate_snapshot: string;
      draft_snapshot: string;
      version_snapshot: string;
      version_item_snapshot: string;
    }>(
      `SELECT
        (SELECT jsonb_agg(to_jsonb(candidate) ORDER BY candidate.id)::text
           FROM term_candidates candidate WHERE candidate.draft_id = $1) AS candidate_snapshot,
        (SELECT to_jsonb(draft)::text FROM term_drafts draft WHERE draft.id = $1) AS draft_snapshot,
        (SELECT to_jsonb(version)::text FROM term_versions version WHERE version.id = $2) AS version_snapshot,
        (SELECT jsonb_agg(to_jsonb(item) ORDER BY item.sort_order)::text
           FROM term_version_items item WHERE item.term_version_id = $2) AS version_item_snapshot`,
      [started.json().draft.id, confirmed.json().version.id],
    );
    const defaultExport = confirmed.json().export;
    expect(defaultExport).toMatchObject({
      termVersionId: confirmed.json().version.id,
      templateVersionId: defaultTemplate.id,
      templateVersion: 1,
    });
    const recoveredDefaultExports = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/versions/${confirmed.json().version.id}/exports`,
    });
    expect(recoveredDefaultExports.statusCode, recoveredDefaultExports.body).toBe(200);
    expect(recoveredDefaultExports.json()).toEqual({ items: [defaultExport] });
    const defaultHistoryDownload = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/exports/${defaultExport.id}/export.xlsx`,
    });
    const defaultHistoryDownloadAgain = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/exports/${defaultExport.id}/export.xlsx`,
    });
    expect(defaultHistoryDownload.statusCode, defaultHistoryDownload.body).toBe(200);
    expect(defaultHistoryDownload.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(defaultHistoryDownload.rawPayload.equals(defaultHistoryDownloadAgain.rawPayload)).toBe(true);
    const sheet = unzipStoredXml(defaultHistoryDownload.rawPayload, 'xl/worksheets/sheet1.xml');
    expect(sheet).toContain('类型');
    expect(sheet).toContain('中文内容');
    expect(sheet).toContain('别称');
    expect(sheet).toContain('性别');
    expect(sheet).toContain('备注');
    expect(sheet.indexOf('林川')).toBeLessThan(sheet.indexOf('雾城'));
    expect(sheet).toContain('小川 / 林队');
    expect(sheet).not.toContain('示例');
    expect((sheet.match(/<row /g) ?? [])).toHaveLength(9);

    const activated = await app.inject({
      method: 'POST',
      url: `/api/terms/export-templates/${customTemplate.json().id}/activate`,
      payload: { expectedActiveTemplateVersionId: defaultTemplate.id },
    });
    expect(activated.statusCode, activated.body).toBe(200);
    expect(activated.json()).toMatchObject({ id: customTemplate.json().id, isActive: true });
    const templatesAfterActivation = await app.inject({ method: 'GET', url: '/api/terms/export-templates' });
    expect(templatesAfterActivation.json()).toMatchObject({
      activeTemplateVersionId: customTemplate.json().id,
      items: [
        { id: customTemplate.json().id, version: 2, isActive: true },
        { id: defaultTemplate.id, version: 1, isActive: false },
      ],
    });
    const historicalMetadata = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/exports/${defaultExport.id}`,
    });
    expect(historicalMetadata.statusCode, historicalMetadata.body).toBe(200);
    expect(historicalMetadata.json()).toMatchObject({
      templateVersionId: defaultTemplate.id,
      templateVersion: 1,
      columns: defaultTemplate.columns,
    });

    const customExport = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.project.id}/terms/versions/${confirmed.json().version.id}/exports`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { templateVersionId: customTemplate.json().id },
    });
    expect(customExport.statusCode, customExport.body).toBe(201);
    const recoveredExports = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/versions/${confirmed.json().version.id}/exports`,
    });
    expect(recoveredExports.statusCode, recoveredExports.body).toBe(200);
    expect(recoveredExports.json().items).toEqual([customExport.json(), defaultExport]);
    const exportCountAfterRead = await pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM term_exports WHERE term_version_id = $1',
      [confirmed.json().version.id],
    );
    expect(exportCountAfterRead.rows[0]!.count).toBe('2');
    const customDownload = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/exports/${customExport.json().id}/export.xlsx`,
    });
    expect(customDownload.statusCode, customDownload.body).toBe(200);
    const customSheet = unzipStoredXml(customDownload.rawPayload, 'xl/worksheets/sheet1.xml');
    expect(customSheet.indexOf('术语文本')).toBeLessThan(customSheet.indexOf('类别'));
    expect(customSheet.indexOf('类别')).toBeLessThan(customSheet.indexOf('说明'));
    expect(customSheet).not.toContain('中文内容');

    const defaultAfterActivation = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.project.id}/terms/exports/${defaultExport.id}/export.xlsx`,
    });
    expect(defaultAfterActivation.rawPayload.equals(defaultHistoryDownload.rawPayload)).toBe(true);
    const factsAfterTemplateActivation = await pool.query<{
      candidate_snapshot: string;
      draft_snapshot: string;
      version_snapshot: string;
      version_item_snapshot: string;
    }>(
      `SELECT
        (SELECT jsonb_agg(to_jsonb(candidate) ORDER BY candidate.id)::text
           FROM term_candidates candidate WHERE candidate.draft_id = $1) AS candidate_snapshot,
        (SELECT to_jsonb(draft)::text FROM term_drafts draft WHERE draft.id = $1) AS draft_snapshot,
        (SELECT to_jsonb(version)::text FROM term_versions version WHERE version.id = $2) AS version_snapshot,
        (SELECT jsonb_agg(to_jsonb(item) ORDER BY item.sort_order)::text
           FROM term_version_items item WHERE item.term_version_id = $2) AS version_item_snapshot`,
      [started.json().draft.id, confirmed.json().version.id],
    );
    expect(factsAfterTemplateActivation.rows[0]).toEqual(factsBeforeTemplateActivation.rows[0]);
  });

  it('项目到期清理会按既有 Worker 生命周期移除术语状态且不阻塞 Asset 清理', async () => {
    const source = await prepareSource();
    const started = await extract(source.project.id);
    await approveAll(source.project.id, started.json().draft.id);
    const ready = await workspace(source.project.id);
    const confirmed = await publishTerms({
      projectId: source.project.id,
      draftId: started.json().draft.id,
      expectedDraftRevision: ready.activeDraft.revision,
      expectedSourceSrtSetDigest: ready.source.sourceSrtSetDigest,
    });
    expect(confirmed.statusCode).toBe(201);
    const project = await app.inject({ method: 'GET', url: `/api/projects/${source.project.id}` });
    const recycled = await app.inject({
      method: 'POST', url: `/api/projects/${source.project.id}/recycle`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedVersion: project.json().version },
    });
    expect(recycled.statusCode, recycled.body).toBe(201);
    const due = new Date(Date.now() - 1_000);
    await pool.query('UPDATE projects SET recycle_expires_at = $2 WHERE id = $1', [source.project.id, due]);
    await pool.query('UPDATE cleanup_jobs SET next_attempt_at = $2 WHERE project_id = $1', [source.project.id, due]);
    const worker = new ProjectCleanupWorker(pool, storage, lifecycleConfig, { workerId: 'term-purge-worker' });
    const cleanup = await worker.runOnce();
    const cleanupError = await pool.query<{ last_error: string | null }>(
      'SELECT last_error FROM cleanup_jobs WHERE project_id = $1', [source.project.id],
    );
    expect(cleanup, cleanupError.rows[0]?.last_error ?? undefined).toMatchObject({
      processed: true, projectId: source.project.id, status: 'completed',
    });
    const remaining = await pool.query<{ count: string }>(
      `SELECT
         (SELECT COUNT(*) FROM term_drafts WHERE project_id = $1)
         + (SELECT COUNT(*) FROM term_versions WHERE project_id = $1)
         + (SELECT COUNT(*) FROM term_cues WHERE project_id = $1) AS count`,
      [source.project.id],
    );
    expect(remaining.rows[0]?.count).toBe('0');
  });
});
