import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createApp } from '../../backend/src/app.js';
import { createPool, type DatabasePool } from '../../backend/src/database/pool.js';
import {
  createAsrAdapterDescriptor,
  type AsrAdapter,
  type AsrAdapterInput,
} from '../../backend/src/modules/asr/asr-adapter.js';
import {
  AsrAdapterRegistry,
  createDefaultAsrAdapterRegistry,
} from '../../backend/src/modules/asr/asr-adapter-registry.js';
import { buildHotwordProjection } from '../../backend/src/modules/asr/asr-hotwords.js';
import { AsrWorkerRepository } from '../../backend/src/modules/asr/asr-worker.repository.js';
import { developmentAsrSchedulingPolicy } from '../../backend/src/modules/asr/asr-scheduling-policy.js';
import { AsrWorker } from '../../backend/src/workers/asr.worker.js';
import { runAsrWorker } from '../../backend/src/workers/asr.worker.entry.js';

const pool = createPool();
const app = createApp({ database: pool });

beforeAll(async () => app.ready());
beforeEach(async () => {
  await pool.query('DELETE FROM asr_dispatch_groups');
  await pool.query('DELETE FROM projects');
});

describe('BACK-M3-02D 多项目派发与公平调度', () => {
  it('由服务端给出资格投影，整组阻断与仅派发合格项目都显式且可恢复', async () => {
    const eligible = await seedProject([{ episodeNumber: 1 }, { episodeNumber: 2 }]);
    const missingVideo = await seedProject([
      { episodeNumber: 1 },
      { episodeNumber: 2, ready: false },
    ]);
    const missingTerms = await seedProject([{ episodeNumber: 1 }]);
    await pool.query('DELETE FROM term_versions WHERE project_id = $1', [missingTerms.projectId]);

    const projected = await app.inject({
      method: 'POST',
      url: '/api/asr/eligibility',
      payload: {
        projectIds: [missingVideo.projectId, eligible.projectId, missingTerms.projectId, eligible.projectId],
      },
    });
    expect(projected.statusCode, projected.body).toBe(200);
    expect(projected.json()).toMatchObject({
      counts: {
        selectedProjects: 3,
        eligibleProjects: 1,
        blockedProjects: 2,
        totalEpisodes: 5,
        newJobs: 4,
      },
    });
    expect(projected.json().items.find((item: any) => item.projectId === missingVideo.projectId))
      .toMatchObject({
        eligible: false,
        totalEpisodeCount: 2,
        readyEpisodeCount: 1,
        blockers: [{ code: 'ASR_VIDEO_NOT_READY', action: 'prepare_asr_videos' }],
      });
    expect(projected.json().items.find((item: any) => item.projectId === missingTerms.projectId))
      .toMatchObject({
        eligible: false,
        blockers: [{ code: 'ASR_TERM_VERSION_NOT_FOUND', action: 'confirm_terms' }],
      });

    const selected = [eligible.projectId, missingVideo.projectId, missingTerms.projectId];
    const allOrNothing = await app.inject({
      method: 'POST',
      url: '/api/asr/dispatch-groups',
      headers: { 'idempotency-key': randomUUID() },
      payload: { dispatchGroupId: randomUUID(), projectIds: selected },
    });
    expect(allOrNothing.statusCode, allOrNothing.body).toBe(201);
    expect(allOrNothing.json()).toMatchObject({
      acceptanceStatus: 'blocked',
      executionStatus: null,
      counts: {
        acceptedProjects: 0,
        blockedProjects: 3,
        totalEpisodes: 0,
        newJobs: 0,
        reusableResults: 0,
      },
      results: expect.arrayContaining([
        expect.objectContaining({ projectId: eligible.projectId, acceptanceStatus: 'blocked', batchId: null }),
        expect.objectContaining({ projectId: missingVideo.projectId, acceptanceStatus: 'blocked', batchId: null }),
      ]),
    });

    const key = randomUUID();
    const partialGroupId = randomUUID();
    const partial = await app.inject({
      method: 'POST',
      url: '/api/asr/dispatch-groups',
      headers: { 'idempotency-key': key },
      payload: { dispatchGroupId: partialGroupId, projectIds: selected, allowPartial: true },
    });
    expect(partial.statusCode, partial.body).toBe(201);
    expect(partial.json()).toMatchObject({
      acceptanceStatus: 'partial',
      executionStatus: 'queued',
      counts: {
        acceptedProjects: 1,
        blockedProjects: 2,
        totalEpisodes: 2,
        newJobs: 2,
        reusableResults: 0,
      },
      results: expect.arrayContaining([
        expect.objectContaining({ projectId: eligible.projectId, acceptanceStatus: 'accepted' }),
        expect.objectContaining({ projectId: missingVideo.projectId, acceptanceStatus: 'blocked' }),
      ]),
    });
    const accepted = partial.json().results.find((item: any) => item.projectId === eligible.projectId);
    expect(accepted.batch).toMatchObject({ status: 'queued', episodeNumbers: [1, 2] });

    const replay = await app.inject({
      method: 'POST',
      url: '/api/asr/dispatch-groups',
      headers: { 'idempotency-key': key },
      payload: {
        dispatchGroupId: partialGroupId,
        projectIds: [...selected].reverse(),
        allowPartial: true,
      },
    });
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json()).toEqual(partial.json());

    const conflict = await app.inject({
      method: 'POST',
      url: '/api/asr/dispatch-groups',
      headers: { 'idempotency-key': key },
      payload: {
        dispatchGroupId: partialGroupId,
        projectIds: [eligible.projectId],
        allowPartial: true,
      },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('ASR_DISPATCH_IDEMPOTENCY_KEY_REUSED');

    const restored = await app.inject({
      method: 'GET',
      url: `/api/asr/dispatch-groups/${partial.json().id}`,
    });
    expect(restored.statusCode, restored.body).toBe(200);
    expect(restored.json()).toEqual(partial.json());
    const listed = await app.inject({
      method: 'GET',
      url: '/api/asr/dispatch-groups?acceptanceStatus=partial',
    });
    expect(listed.statusCode, listed.body).toBe(200);
    expect(listed.json()).toMatchObject({ total: 1, items: [{ id: partial.json().id }] });

    const racing = await app.inject({
      method: 'POST',
      url: '/api/asr/dispatch-groups',
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        dispatchGroupId: randomUUID(),
        projectIds: [eligible.projectId],
        allowPartial: true,
      },
    });
    expect(racing.statusCode, racing.body).toBe(201);
    expect(racing.json()).toMatchObject({
      acceptanceStatus: 'blocked',
      executionStatus: null,
      results: [{
        acceptanceStatus: 'blocked',
        eligibility: { activeBatchCount: 1 },
        dispatchError: { code: 'ASR_BATCH_ALREADY_ACTIVE' },
      }],
    });
    const batchCount = await pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM asr_batches WHERE project_id = $1',
      [eligible.projectId],
    );
    expect(Number(batchCount.rows[0]!.count)).toBe(1);
  });

  it('默认策略按项目轮转且同一项目内按集数递增', async () => {
    const sources = [];
    for (let index = 0; index < 3; index += 1) {
      const source = await seedProject([{ episodeNumber: 1 }, { episodeNumber: 2 }]);
      sources.push(source);
      const created = await createBatch({ ...source, scope: { kind: 'all' } });
      expect(created.statusCode, created.body).toBe(201);
    }
    const outcomes = await runJobs(6, 'asr-fair-worker');
    expect(outcomes.every((outcome) => outcome.processed)).toBe(true);
    const claimed = outcomes.map((outcome: any) => [outcome.projectId, outcome.episodeNumber]);
    expect(claimed.slice(0, 3).map(([projectId]) => projectId)).toEqual(
      sources.map((source) => source.projectId),
    );
    expect(claimed.slice(0, 3).map(([, episodeNumber]) => episodeNumber)).toEqual([1, 1, 1]);
    expect(claimed.slice(3).map(([projectId]) => projectId)).toEqual(
      sources.map((source) => source.projectId),
    );
    expect(claimed.slice(3).map(([, episodeNumber]) => episodeNumber)).toEqual([2, 2, 2]);
  });

  it('默认 4/1 策略最多租出四个不同项目，第五个等待', async () => {
    for (let index = 0; index < 5; index += 1) {
      const source = await seedProject([{ episodeNumber: 1 }, { episodeNumber: 2 }]);
      const created = await createBatch({ ...source, scope: { kind: 'all' } });
      expect(created.statusCode, created.body).toBe(201);
    }
    const repository = new AsrWorkerRepository(pool);
    const now = new Date();
    const claims = [];
    for (let index = 0; index < 5; index += 1) {
      claims.push(await repository.claim({
        workerId: `capacity-worker-${index + 1}`,
        now,
        leaseExpiresAt: new Date(now.getTime() + 60_000),
        policy: developmentAsrSchedulingPolicy,
      }));
    }
    expect(claims.slice(0, 4).every(Boolean)).toBe(true);
    expect(new Set(claims.slice(0, 4).map((claim) => claim!.projectId)).size).toBe(4);
    expect(claims[4]).toBeNull();
  });
});
afterAll(async () => {
  await pool.query('DELETE FROM asr_dispatch_groups');
  await pool.query('DELETE FROM projects');
  await app.close();
});

interface EpisodeSeed {
  episodeNumber: number;
  fileName?: string;
  ready?: boolean;
}

const seedProject = async (episodes: EpisodeSeed[], database: DatabasePool = pool) => {
  const project = await database.query<{ id: string }>(
    `INSERT INTO projects (name, created_by, updated_by)
     VALUES ('匿名 ASR 测试剧','test','test') RETURNING id`,
  );
  const projectId = project.rows[0]!.id;
  const manifest = await database.query<{ id: string }>(
    `INSERT INTO material_manifests (project_id, version, root_name, created_by)
     VALUES ($1,1,'匿名 ASR 测试剧','test') RETURNING id`,
    [projectId],
  );
  const manifestId = manifest.rows[0]!.id;
  for (const episode of episodes) {
    const fileName = episode.fileName ?? `EP${String(episode.episodeNumber).padStart(2, '0')}.mp4`;
    const fingerprint = `anonymous/${episode.episodeNumber}/${fileName}`;
    await database.query(
      `INSERT INTO material_manifest_bindings
         (manifest_id, episode_number, role, relative_path, file_name, size_bytes,
          last_modified_ms, fingerprint, media_type)
       VALUES ($1,$2,'asr_video',$3,$4,16,1000,$5,'video')`,
      [manifestId, episode.episodeNumber, `匿名 ASR 测试剧/${fileName}`, fileName, fingerprint],
    );
    if (episode.ready === false) continue;
    const checksum = createHash('sha256').update(`video-${episode.episodeNumber}-${fileName}`).digest('hex');
    const asset = await database.query<{ id: string }>(
      `INSERT INTO assets
         (project_id, object_key, original_filename, media_kind, size_bytes,
          checksum_algorithm, checksum_value, verified_at)
       VALUES ($1,$2,$3,'video',16,'sha256',$4,CURRENT_TIMESTAMP) RETURNING id`,
      [projectId, `projects/${projectId}/videos/${episode.episodeNumber}-${randomUUID()}`, fileName, checksum],
    );
    await database.query(
      `INSERT INTO material_asset_bindings
         (manifest_id, episode_number, role, asset_id, source_fingerprint)
       VALUES ($1,$2,'asr_video',$3,$4)`,
      [manifestId, episode.episodeNumber, asset.rows[0]!.id, fingerprint],
    );
  }

  const draft = await database.query<{ id: string }>(
    `INSERT INTO term_drafts
       (project_id, source_srt_set_digest, prompt_version, status)
     VALUES ($1,$2,'term-prompt-v1','confirmed') RETURNING id`,
    [projectId, 'a'.repeat(64)],
  );
  const person = await database.query<{ id: string }>(
    `INSERT INTO term_candidates
       (draft_id, type, name, aliases, gender, note, origin, status)
     VALUES ($1,'人名','林川',$2,'male','','manual','approved') RETURNING id`,
    [draft.rows[0]!.id, JSON.stringify(['小川', '林总', '先生'])],
  );
  const place = await database.query<{ id: string }>(
    `INSERT INTO term_candidates
       (draft_id, type, name, aliases, gender, note, origin, status)
     VALUES ($1,'地名','雾城','[]','unknown','','manual','approved') RETURNING id`,
    [draft.rows[0]!.id],
  );
  const termVersion = await database.query<{ id: string }>(
    `INSERT INTO term_versions
       (project_id, version, draft_id, source_srt_set_digest, prompt_version)
     VALUES ($1,1,$2,$3,'term-prompt-v1') RETURNING id`,
    [projectId, draft.rows[0]!.id, 'a'.repeat(64)],
  );
  await database.query(
    `INSERT INTO term_version_items
       (term_version_id, source_candidate_id, sort_order, type, name, aliases,
        gender, note, first_episode_number, first_cue_index)
     VALUES
       ($1,$2,1,'人名','林川',$3,'male','',1,1),
       ($1,$4,2,'地名','雾城','[]','unknown','',1,2)`,
    [termVersion.rows[0]!.id, person.rows[0]!.id,
      JSON.stringify(['小川', '林总', '先生']), place.rows[0]!.id],
  );
  return { projectId, manifestId, termVersionId: termVersion.rows[0]!.id };
};

const createBatch = async (input: {
  projectId: string;
  termVersionId: string;
  scope: object;
  forceNewRecognition?: boolean;
  key?: string;
}, targetApp: FastifyInstance = app) => targetApp.inject({
  method: 'POST',
  url: `/api/projects/${input.projectId}/asr/batches`,
  headers: { 'idempotency-key': input.key ?? randomUUID() },
  payload: {
    scope: input.scope,
    termVersionId: input.termVersionId,
    ...(input.forceNewRecognition ? { forceNewRecognition: true } : {}),
  },
});

const getBatch = async (projectId: string, batchId: string, targetApp: FastifyInstance = app) => {
  const response = await targetApp.inject({
    method: 'GET',
    url: `/api/projects/${projectId}/asr/batches/${batchId}`,
  });
  expect(response.statusCode, response.body).toBe(200);
  return response.json();
};

const runJobs = async (
  count: number,
  workerId = 'asr-test-worker',
  registry = createDefaultAsrAdapterRegistry(),
) => {
  const worker = new AsrWorker(
    pool,
    registry,
    { leaseMs: 60_000, pollIntervalMs: 50 },
    { workerId },
  );
  const outcomes = [];
  for (let index = 0; index < count; index += 1) outcomes.push(await worker.runOnce());
  return outcomes;
};

describe('BACK-M3-02A S2 ASR 权威批次', () => {
  it('双门禁与整剧/选中集/单集范围由后端规范化，创建幂等且热词只保存摘要', async () => {
    const source = await seedProject([
      { episodeNumber: 1 }, { episodeNumber: 2 }, { episodeNumber: 3 },
    ]);
    const key = randomUUID();
    const selected = await createBatch({
      ...source,
      key,
      scope: { kind: 'selected', episodeNumbers: [3, 1, 3] },
    });
    const replay = await createBatch({
      ...source,
      key,
      scope: { kind: 'selected', episodeNumbers: [1, 3] },
    });
    expect(selected.statusCode, selected.body).toBe(201);
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json()).toEqual(selected.json());
    expect(selected.json()).toMatchObject({
      scopeKind: 'selected',
      episodeNumbers: [1, 3],
      provider: 'fake',
      adapter: 'deterministic_fake',
      status: 'queued',
      hotwords: { termCount: 2, aliasCount: 1, filteredCount: 2, truncatedCount: 0 },
      counts: { total: 2, queued: 2 },
    });
    expect(selected.body).not.toContain('小川');
    expect(selected.body).not.toContain('林总');

    const conflict = await createBatch({
      ...source,
      key,
      scope: { kind: 'single', episodeNumber: 1 },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('ASR_IDEMPOTENCY_KEY_REUSED');
    const all = await createBatch({ ...source, scope: { kind: 'all' } });
    const single = await createBatch({ ...source, scope: { kind: 'single', episodeNumber: 2 } });
    expect(all.json().episodeNumbers).toEqual([1, 2, 3]);
    expect(single.json().episodeNumbers).toEqual([2]);

    const missing = await seedProject([
      { episodeNumber: 1 }, { episodeNumber: 2, ready: false },
    ]);
    const blocked = await createBatch({ ...missing, scope: { kind: 'all' } });
    expect(blocked.statusCode, blocked.body).toBe(201);
    expect(blocked.json()).toMatchObject({
      status: 'blocked',
      episodeNumbers: [1, 2],
      blockers: [{ episodeNumber: 2, code: 'ASR_VIDEO_NOT_READY' }],
      jobs: [],
    });
    const wrongTerm = await createBatch({
      projectId: source.projectId,
      termVersionId: randomUUID(),
      scope: { kind: 'all' },
    });
    expect(wrongTerm.statusCode).toBe(422);
    expect(wrongTerm.json().error).toMatchObject({
      code: 'ASR_TERM_VERSION_NOT_FOUND',
      action: 'select_term_version',
    });
    await pool.query("UPDATE projects SET lifecycle_status = 'recycled' WHERE id = $1", [source.projectId]);
    const recycled = await createBatch({ ...source, scope: { kind: 'all' } });
    expect(recycled.statusCode).toBe(409);
    expect(recycled.json().error.code).toBe('ASR_PROJECT_NOT_ACTIVE');
  });

  it('Worker 生成不可变 Cue、警告和需对账结果，并为 fake 写入零费用用量', async () => {
    const source = await seedProject([
      { episodeNumber: 1 },
      { episodeNumber: 2, fileName: 'EP02.fake-warning.mp4' },
      { episodeNumber: 3, fileName: 'EP03.fake-reconcile.mp4' },
      { episodeNumber: 4, fileName: 'EP04.fake-rejected.mp4' },
    ]);
    const created = await createBatch({ ...source, scope: { kind: 'all' } });
    const outcomes = await runJobs(4);
    expect(outcomes.map((item: any) => item.outcome)).toEqual([
      'completed', 'completed', 'reconciliation_required', 'failed',
    ]);
    const batch = await getBatch(source.projectId, created.json().id);
    expect(batch.status).toBe('partial');
    expect(batch.jobs.map((job: any) => job.status)).toEqual([
      'completed', 'completed', 'reconciliation_required', 'failed',
    ]);
    expect(batch.jobs[0].currentResult).toMatchObject({
      revision: 1,
      qualityStatus: 'pass',
      qualitySummary: { cueCount: 2, termHitCount: 1 },
      cues: [{ cueIndex: 1, startMs: 0 }, { cueIndex: 2 }],
    });
    expect(batch.jobs[1].currentResult.qualityStatus).toBe('warning');
    for (const job of batch.jobs) {
      expect(job.attempts[0].usage).toMatchObject({
        provider: 'fake',
        mediaDurationMs: 0,
        billingQuantity: 0,
        currency: 'CNY',
        estimatedAmount: '0.000000',
        finalAmount: '0.000000',
      });
    }
    expect(batch.jobs[2].attempts[0]).toMatchObject({
      status: 'reconciliation_required',
      hotwordPayload: { itemCount: 3, digest: batch.hotwords.digest },
      hotwordReceipt: 'simulated',
      hotwordReceiptFacts: { submittedCount: 3, omittedCount: 0, reasonCode: null },
      retryable: false,
      externalSideEffectPossible: true,
      usage: { reconciliationStatus: 'pending' },
    });
    expect(batch.jobs[3]).toMatchObject({
      status: 'failed',
      currentResult: null,
      attempts: [{
        status: 'completed',
        errorCode: 'ASR_QUALITY_REJECTED',
        retryable: true,
        result: { qualityStatus: 'rejected', qualitySummary: { hallucinationSignalCount: 1 } },
      }],
    });
    const cueId = batch.jobs[0].currentResult.cues[0].id;
    await expect(pool.query('UPDATE asr_cues SET text = \'tampered\' WHERE id = $1', [cueId]))
      .rejects.toThrow('ASR results, cues and usage are immutable');
    await expect(pool.query('UPDATE asr_results SET quality_status = \'warning\' WHERE id = $1', [
      batch.jobs[0].currentResult.id,
    ])).rejects.toThrow('ASR results, cues and usage are immutable');
  });

  it('取消命令幂等终止未开始任务，同键不能取消另一批次', async () => {
    const source = await seedProject([{ episodeNumber: 1 }, { episodeNumber: 2 }]);
    const first = await createBatch({ ...source, scope: { kind: 'all' } });
    const key = randomUUID();
    const cancel = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.projectId}/asr/batches/${first.json().id}/cancel`,
      headers: { 'idempotency-key': key },
      payload: {},
    });
    const replay = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.projectId}/asr/batches/${first.json().id}/cancel`,
      headers: { 'idempotency-key': key },
      payload: {},
    });
    expect(cancel.statusCode, cancel.body).toBe(200);
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json()).toEqual(cancel.json());
    expect(cancel.json()).toMatchObject({
      status: 'cancelled',
      jobs: [{ status: 'cancelled' }, { status: 'cancelled' }],
    });
    const second = await createBatch({ ...source, scope: { kind: 'single', episodeNumber: 1 } });
    const conflict = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.projectId}/asr/batches/${second.json().id}/cancel`,
      headers: { 'idempotency-key': key },
      payload: {},
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('ASR_IDEMPOTENCY_KEY_REUSED');
  });

  it('批次汇总显式区分取消请求与无可用结果的需对账状态', async () => {
    const cancellingSource = await seedProject([{ episodeNumber: 1 }]);
    const cancelling = await createBatch({
      ...cancellingSource,
      scope: { kind: 'single', episodeNumber: 1 },
    });
    const jobId = cancelling.json().jobs[0].id;
    const attempt = await pool.query<{ id: string }>(
      `INSERT INTO asr_attempts
         (job_id, attempt_number, status, lease_owner, lease_expires_at,
          hotword_projection_version, hotword_payload_digest, hotword_payload_count,
          hotword_payload_character_count, hotword_receipt_status)
       VALUES ($1,1,'running','active-worker',CURRENT_TIMESTAMP + INTERVAL '5 minutes',
               $2,$3,3,6,'unknown') RETURNING id`,
      [jobId, cancelling.json().hotwords.projectionVersion, cancelling.json().hotwords.digest],
    );
    await pool.query(
      `UPDATE asr_jobs SET status = 'running', current_attempt_id = $2 WHERE id = $1`,
      [jobId, attempt.rows[0]!.id],
    );
    const cancelResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${cancellingSource.projectId}/asr/batches/${cancelling.json().id}/cancel`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {},
    });
    expect(cancelResponse.statusCode, cancelResponse.body).toBe(200);
    expect(cancelResponse.json()).toMatchObject({
      status: 'cancel_requested',
      counts: { running: 0, cancelRequested: 1 },
      jobs: [{ status: 'cancel_requested' }],
    });

    const reconciliationSource = await seedProject([
      { episodeNumber: 1, fileName: 'EP01.fake-reconcile.mp4' },
    ]);
    const reconciliation = await createBatch({
      ...reconciliationSource,
      scope: { kind: 'all' },
    });
    await runJobs(1, 'reconciliation-only-worker');
    expect(await getBatch(reconciliationSource.projectId, reconciliation.json().id)).toMatchObject({
      status: 'reconciliation_required',
      counts: { reconciliationRequired: 1, completed: 0 },
    });
  });

  it('权威热词预览隔离项目，通用投影不再固定截断且 Worker 拒绝摘要错配', async () => {
    const source = await seedProject([{ episodeNumber: 1 }]);
    const other = await seedProject([{ episodeNumber: 1 }]);
    const preview = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/hotwords/preview?termVersionId=${source.termVersionId}`,
    });
    expect(preview.statusCode, preview.body).toBe(200);
    expect(preview.json()).toMatchObject({
      projectId: source.projectId,
      termVersionId: source.termVersionId,
      provider: 'fake',
      adapter: 'deterministic_fake',
      capabilities: { supported: true, maxEntries: 100, maxCharacters: 2_000 },
      entries: [
        { text: '林川', source: 'term' },
        { text: '小川', source: 'person_alias' },
        { text: '雾城', source: 'term' },
      ],
      omittedEntries: [
        { order: 3, text: '林总', source: 'person_alias', reasonCode: 'rule_filtered' },
        { order: 4, text: '先生', source: 'person_alias', reasonCode: 'rule_filtered' },
      ],
      summary: { termCount: 2, aliasCount: 1, filteredCount: 2, truncatedCount: 0 },
    });
    const crossProject = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/hotwords/preview?termVersionId=${other.termVersionId}`,
    });
    expect(crossProject.statusCode).toBe(422);
    expect(crossProject.json().error).toMatchObject({
      code: 'ASR_TERM_VERSION_NOT_FOUND',
      action: 'select_term_version',
    });

    const version = await pool.query<{ draft_id: string }>(
      'SELECT draft_id FROM term_versions WHERE id = $1',
      [source.termVersionId],
    );
    const aliases = Array.from({ length: 105 }, (_, index) => `匿名别称${String(index + 1).padStart(3, '0')}`);
    const candidate = await pool.query<{ id: string }>(
      `INSERT INTO term_candidates
         (draft_id, type, name, aliases, gender, note, origin, status)
       VALUES ($1,'人名','周宁',$2,'unknown','','manual','approved') RETURNING id`,
      [version.rows[0]!.draft_id, JSON.stringify(aliases)],
    );
    await pool.query(
      `INSERT INTO term_version_items
         (term_version_id, source_candidate_id, sort_order, type, name, aliases,
          gender, note, first_episode_number, first_cue_index)
       VALUES ($1,$2,3,'人名','周宁',$3,'unknown','',1,3)`,
      [source.termVersionId, candidate.rows[0]!.id, JSON.stringify(aliases)],
    );
    const client = await pool.connect();
    try {
      const generic = await buildHotwordProjection(client, source.termVersionId);
      expect(generic.words.length).toBe(109);
      expect(generic.summary.truncatedCount).toBe(0);
    } finally {
      client.release();
    }

    const created = await createBatch({ ...source, scope: { kind: 'all' } });
    await pool.query("UPDATE asr_jobs SET hotword_digest = $2 WHERE batch_id = $1", [
      created.json().id,
      'f'.repeat(64),
    ]);
    await expect(runJobs(1, 'digest-mismatch-worker')).rejects.toThrow('热词投影摘要不匹配');
    const attempts = await pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM asr_attempts WHERE job_id = $1',
      [created.json().jobs[0].id],
    );
    expect(Number(attempts.rows[0]!.count)).toBe(0);
  });

  it('失败子集重试不重复成功/需对账集，重放稳定且整剧历史仍可恢复', async () => {
    const source = await seedProject([
      { episodeNumber: 1 },
      { episodeNumber: 2, fileName: 'EP02.fake-fail-once.mp4' },
      { episodeNumber: 3, fileName: 'EP03.fake-reconcile.mp4' },
    ]);
    const original = await createBatch({ ...source, scope: { kind: 'all' } });
    await runJobs(3);
    const parent = await getBatch(source.projectId, original.json().id);
    expect(parent.jobs.map((job: any) => job.status)).toEqual([
      'completed', 'failed', 'reconciliation_required',
    ]);

    const key = randomUUID();
    const retried = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.projectId}/asr/batches/${parent.id}/retries`,
      headers: { 'idempotency-key': key },
      payload: {},
    });
    const replay = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.projectId}/asr/batches/${parent.id}/retries`,
      headers: { 'idempotency-key': key },
      payload: {},
    });
    expect(retried.statusCode, retried.body).toBe(201);
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json()).toEqual(retried.json());
    expect(retried.json()).toMatchObject({
      retryOfBatchId: parent.id,
      episodeNumbers: [2],
      jobs: [{ episodeNumber: 2, status: 'queued' }],
    });
    const sameKeyDifferentScope = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.projectId}/asr/batches/${parent.id}/retries`,
      headers: { 'idempotency-key': key },
      payload: { episodeNumbers: [1] },
    });
    expect(sameKeyDifferentScope.statusCode).toBe(409);
    expect(sameKeyDifferentScope.json().error.code).toBe('ASR_IDEMPOTENCY_KEY_REUSED');
    expect((await runJobs(1, 'asr-retry-worker'))[0]).toMatchObject({ outcome: 'completed' });
    expect((await getBatch(source.projectId, retried.json().id)).status).toBe('completed');
    const invalidSubset = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.projectId}/asr/batches/${parent.id}/retries`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { episodeNumbers: [1] },
    });
    expect(invalidSubset.statusCode).toBe(409);
    expect(invalidSubset.json().error.code).toBe('ASR_RETRY_SCOPE_INVALID');
    const history = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/batches?limit=10&offset=0`,
    });
    expect(history.statusCode, history.body).toBe(200);
    expect(history.json().total).toBe(2);
    expect(history.json().items.map((item: any) => item.id)).toEqual([retried.json().id, parent.id]);
    const parentAfterRetry = await getBatch(source.projectId, parent.id);
    expect(parentAfterRetry.jobs[0].currentResult.id).toBe(parent.jobs[0].currentResult.id);
    expect(parentAfterRetry.jobs[2].status).toBe('reconciliation_required');
  });

  it('租约过期由新 Worker 接管为新尝试，旧尝试保留失败与零费用事实', async () => {
    const source = await seedProject([{ episodeNumber: 1 }]);
    const created = await createBatch({ ...source, scope: { kind: 'single', episodeNumber: 1 } });
    const jobId = created.json().jobs[0].id;
    const expired = new Date('2026-08-14T00:00:00.000Z');
    const oldAttempt = await pool.query<{ id: string }>(
      `INSERT INTO asr_attempts
         (job_id, attempt_number, status, lease_owner, lease_expires_at)
       VALUES ($1,1,'leased','dead-worker',$2) RETURNING id`,
      [jobId, expired],
    );
    await pool.query(
      `UPDATE asr_jobs SET status = 'leased', current_attempt_id = $2 WHERE id = $1`,
      [jobId, oldAttempt.rows[0]!.id],
    );
    const now = new Date('2026-08-14T00:10:00.000Z');
    const worker = new AsrWorker(
      pool,
      createDefaultAsrAdapterRegistry(),
      { leaseMs: 60_000, pollIntervalMs: 50 },
      { workerId: 'takeover-worker', clock: () => now },
    );
    expect(await worker.runOnce()).toMatchObject({ processed: true, outcome: 'completed' });
    const batch = await getBatch(source.projectId, created.json().id);
    expect(batch.jobs[0].attempts).toMatchObject([
      {
        attemptNumber: 1,
        status: 'failed',
        errorCode: 'ASR_LEASE_EXPIRED',
        retryable: true,
        usage: { finalAmount: '0.000000' },
      },
      { attemptNumber: 2, status: 'completed', usage: { finalAmount: '0.000000' } },
    ]);
    expect(batch.jobs[0].currentResult.qualityStatus).toBe('pass');
  });

  it('强制新识别失败不会覆盖同源的历史成功结果', async () => {
    const source = await seedProject([{ episodeNumber: 1, fileName: 'EP01.fake-pass-then-fail.mp4' }]);
    const first = await createBatch({ ...source, scope: { kind: 'all' } });
    await runJobs(1, 'first-success-worker');
    const firstResult = (await getBatch(source.projectId, first.json().id)).jobs[0].currentResult;

    const reused = await createBatch({ ...source, scope: { kind: 'all' } });
    expect(reused.json()).toMatchObject({
      status: 'completed',
      counts: { completed: 1, reused: 1 },
      jobs: [{
        status: 'completed',
        currentResultId: firstResult.id,
        reusedResult: true,
        attempts: [],
      }],
    });

    const forced = await createBatch({
      ...source,
      scope: { kind: 'all' },
      forceNewRecognition: true,
    });
    expect(forced.json().jobs[0]).toMatchObject({
      status: 'queued',
      currentResultId: firstResult.id,
      reusedResult: false,
    });
    expect(await runJobs(1, 'forced-failure-worker')).toMatchObject([{ outcome: 'failed' }]);
    const failed = await getBatch(source.projectId, forced.json().id);
    expect(failed.status).toBe('partial');
    expect(failed.jobs[0]).toMatchObject({
      status: 'failed',
      currentResultId: firstResult.id,
      currentResult: { id: firstResult.id, qualityStatus: 'pass' },
    });
    expect(failed.jobs[0].attempts[0]).toMatchObject({
      errorCode: 'FAKE_RETRYABLE_FAILURE', retryable: true,
    });
  });

  it('第二个零网络 stub 通过同一 API、registry、Worker 和读取链路保存登记元数据与同构用量', async () => {
    const descriptor = createAsrAdapterDescriptor({
      provider: 'anonymous_stub',
      adapter: 'anonymous_stub_v1',
      model: 'anonymous-zero-network-v1',
      language: 'zh-CN',
      configVersion: 'anonymous-stub-config-v1',
      hotwordCapabilities: { maxEntries: 2, maxCharacters: 20 },
    });
    class AnonymousZeroNetworkStub implements AsrAdapter {
      readonly descriptor = descriptor;
      lastInput: AsrAdapterInput | null = null;

      async execute(input: AsrAdapterInput) {
        this.lastInput = input;
        const providerRequestId = `anonymous:${input.jobId}:${input.attemptNumber}`;
        return {
          kind: 'completed' as const,
          providerRequestId,
          cues: [{
            cueIndex: 1,
            startMs: 0,
            endMs: 1_234,
            text: '匿名零网络识别结果',
            confidence: 0.91,
          }],
          qualityStatus: 'pass' as const,
          qualitySummary: {
            audioCoverageRatio: 1,
            emptyResult: false,
            cueCount: 1,
            longSegmentCount: 0,
            timelineIssueCount: 0,
            termHitCount: input.hotwords.words.length > 0 ? 1 : 0,
            lowConfidenceCount: 0,
            hallucinationSignalCount: 0,
          },
          hotwordReceipt: 'partially_submitted' as const,
          hotwordReceiptFacts: {
            submittedCount: 1,
            omittedCount: Math.max(0, input.hotwords.words.length - 1),
            reasonCode: 'partial_submission' as const,
          },
          usage: {
            provider: descriptor.provider,
            mediaDurationMs: 1_234,
            billingUnit: 'anonymous_unit',
            billingQuantity: 1.234,
            currency: 'TEST',
            estimatedAmount: '0.123000',
            finalAmount: '0.123000',
            reconciliationStatus: 'final' as const,
            providerRequestId,
          },
        };
      }
    }

    const adapter = new AnonymousZeroNetworkStub();
    const registry = new AsrAdapterRegistry([adapter], descriptor.adapter);
    const stubPool = createPool();
    const stubApp = createApp({ database: stubPool, asrAdapterRegistry: registry });
    await stubApp.ready();
    try {
      const source = await seedProject([{ episodeNumber: 1 }], stubPool);
      const preview = await stubApp.inject({
        method: 'GET',
        url: `/api/projects/${source.projectId}/asr/hotwords/preview?termVersionId=${source.termVersionId}`,
      });
      expect(preview.statusCode, preview.body).toBe(200);
      expect(preview.json()).toMatchObject({
        capabilities: { supported: true, maxEntries: 2, maxCharacters: 20 },
        entries: [{ text: '林川' }, { text: '小川' }],
        omittedEntries: [
          { order: 3, text: '林总', reasonCode: 'rule_filtered' },
          { order: 4, text: '先生', reasonCode: 'rule_filtered' },
          { order: 5, text: '雾城', reasonCode: 'adapter_max_entries' },
        ],
        summary: { termCount: 1, aliasCount: 1, filteredCount: 2, truncatedCount: 1 },
      });
      const created = await createBatch({ ...source, scope: { kind: 'all' } }, stubApp);
      expect(created.statusCode, created.body).toBe(201);
      expect(created.json()).toMatchObject({
        provider: descriptor.provider,
        adapter: descriptor.adapter,
        model: descriptor.model,
        language: descriptor.language,
        configDigest: descriptor.configDigest,
        hotwords: { termCount: 1, aliasCount: 1, truncatedCount: 1 },
      });
      expect(created.body).not.toContain('objectKey');
      expect(created.body).not.toContain('小川');

      const batchEvidence = await app.inject({
        method: 'GET',
        url: `/api/projects/${source.projectId}/asr/batches/${created.json().id}/hotwords`,
      });
      expect(batchEvidence.statusCode, batchEvidence.body).toBe(200);
      expect(batchEvidence.json()).toMatchObject({
        batchId: created.json().id,
        termVersionId: source.termVersionId,
        provider: descriptor.provider,
        adapter: descriptor.adapter,
        model: descriptor.model,
        language: descriptor.language,
        configDigest: descriptor.configDigest,
        capabilities: { supported: true, maxEntries: 2, maxCharacters: 20 },
        entries: [{ text: '林川' }, { text: '小川' }],
        omittedEntries: [
          { order: 3, text: '林总', reasonCode: 'rule_filtered' },
          { order: 4, text: '先生', reasonCode: 'rule_filtered' },
          { order: 5, text: '雾城', reasonCode: 'adapter_max_entries' },
        ],
        summary: { termCount: 1, aliasCount: 1, filteredCount: 2, truncatedCount: 1 },
      });
      expect(batchEvidence.body).not.toContain('objectKey');
      const otherProject = await seedProject([{ episodeNumber: 1 }], stubPool);
      const crossProjectEvidence = await stubApp.inject({
        method: 'GET',
        url: `/api/projects/${otherProject.projectId}/asr/batches/${created.json().id}/hotwords`,
      });
      expect(crossProjectEvidence.statusCode, crossProjectEvidence.body).toBe(404);

      const rejectedSelection = await stubApp.inject({
        method: 'POST',
        url: `/api/projects/${source.projectId}/asr/batches`,
        headers: { 'idempotency-key': randomUUID() },
        payload: {
          scope: { kind: 'all' },
          termVersionId: source.termVersionId,
          provider: 'employee-selected-provider',
        },
      });
      expect(rejectedSelection.statusCode).toBe(400);

      const controller = new AbortController();
      const loop = runAsrWorker({ database: stubPool, registry, signal: controller.signal });
      let batch = await getBatch(source.projectId, created.json().id, stubApp);
      for (let poll = 0; poll < 50 && batch.status !== 'completed'; poll += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        batch = await getBatch(source.projectId, created.json().id, stubApp);
      }
      controller.abort();
      await loop;

      expect(batch).toMatchObject({
        status: 'completed',
        jobs: [{
          status: 'completed',
          attempts: [{
            hotwordPayload: {
              digest: batch.hotwords.digest,
              itemCount: 2,
              characterCount: 4,
            },
            hotwordReceipt: 'partially_submitted',
            hotwordReceiptFacts: {
              submittedCount: 1,
              omittedCount: 1,
              reasonCode: 'partial_submission',
            },
            usage: {
              provider: descriptor.provider,
              mediaDurationMs: 1_234,
              billingUnit: 'anonymous_unit',
              billingQuantity: 1.234,
              currency: 'TEST',
              estimatedAmount: '0.123000',
              finalAmount: '0.123000',
            },
          }],
          currentResult: { qualityStatus: 'pass', cues: [{ text: '匿名零网络识别结果' }] },
        }],
      });
      expect(adapter.lastInput).toMatchObject({
        asset: {
          assetId: batch.jobs[0].assetId,
          originalFilename: 'EP01.mp4',
          mediaKind: 'video',
          sizeBytes: 16,
          checksum: { algorithm: 'sha256' },
        },
        hotwords: {
          words: ['林川', '小川'],
          summary: {
            digest: batch.hotwords.digest,
            termCount: 1,
            aliasCount: 1,
            truncatedCount: 1,
          },
        },
      });
      expect(adapter.lastInput!.asset.objectKey).toContain(`/videos/1-`);
    } finally {
      await stubPool.query('TRUNCATE project_commands, projects CASCADE');
      await stubApp.close();
    }
  });
});
