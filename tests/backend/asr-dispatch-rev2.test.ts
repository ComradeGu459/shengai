import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { createPool, type DatabasePool } from '../../backend/src/database/pool.js';
import { createDefaultAsrAdapterRegistry } from '../../backend/src/modules/asr/asr-adapter-registry.js';
import { AsrEligibilityRepository } from '../../backend/src/modules/asr/asr-eligibility.repository.js';
import { developmentAsrSchedulingPolicy } from '../../backend/src/modules/asr/asr-scheduling-policy.js';
import { AsrWorkerRepository } from '../../backend/src/modules/asr/asr-worker.repository.js';
import { AsrWorker } from '../../backend/src/workers/asr.worker.js';

const pool = createPool();
const app = createApp({ database: pool });

type AsrRoutingFixture = Readonly<{
  deploymentId: string;
  deploymentVersionId: string;
  routingVersionId: string;
}>;

let routingFixture: AsrRoutingFixture | null = null;

const activateAsrRouting = async (
  routingPool: DatabasePool,
  descriptor: {
    provider: string;
    adapter: string;
    model: string;
    language: string;
    configDigest: string;
    hotwordCapabilities: {
      supported: boolean;
      maxEntries: number | null;
      maxCharacters: number | null;
    };
  },
): Promise<AsrRoutingFixture> => {
  const deploymentId = randomUUID();
  const deploymentVersionId = randomUUID();
  const routingVersionId = randomUUID();
  await routingPool.query(
    `INSERT INTO engine_deployments
       (id,capability,execution_kind,display_name,provider,adapter_key,status)
     VALUES ($1,'asr','cloud_api',$2,$3,$4,'enabled')`,
    [deploymentId, `test-${descriptor.adapter}`, descriptor.provider, descriptor.adapter],
  );
  await routingPool.query(
    `INSERT INTO engine_deployment_versions
       (id,deployment_id,version,model,language,capabilities_snapshot,secret_reference_summary,config_digest,billing_snapshot)
     VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8)`,
    [
      deploymentVersionId,
      deploymentId,
      descriptor.model,
      descriptor.language,
      JSON.stringify({
        capability: 'asr',
        executionKind: 'cloud_api',
        provider: descriptor.provider,
        adapterKey: descriptor.adapter,
        model: descriptor.model,
        language: descriptor.language,
        descriptorDigest: descriptor.configDigest,
        capabilities: { hotword: descriptor.hotwordCapabilities },
      }),
      JSON.stringify({ present: false, referenceDigest: null, redactedLabel: null }),
      descriptor.configDigest,
      JSON.stringify(descriptor.billing),
    ],
  );
  await routingPool.query(
    `INSERT INTO routing_policy_versions
       (id,environment,workflow_stage,version)
     VALUES ($1,'development','asr',(
       SELECT COALESCE(MAX(version),0)+1
       FROM routing_policy_versions
       WHERE environment='development' AND workflow_stage='asr'
     ))`,
    [routingVersionId],
  );
  await routingPool.query(
    `INSERT INTO routing_policy_pools (routing_version_id,pool_id)
     VALUES ($1,'asr_api'),($1,'ocr_api'),($1,'ocr_self_hosted_worker')`,
    [routingVersionId],
  );
  await routingPool.query(`INSERT INTO routing_policy_targets (routing_version_id,pool_id,routing_target_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit) VALUES ($1,'asr_api',$2,$3,1,'preferred',10,2,100)`, [routingVersionId, randomUUID(), deploymentVersionId]);
  await routingPool.query(
    `INSERT INTO routing_policy_status_events
       (routing_version_id,status,request_id,actor_subject)
     VALUES ($1,'active','asr-dispatch-fixture','test')`,
    [routingVersionId],
  );
  await routingPool.query(
    `INSERT INTO active_control_plane_pointers
       (environment,workflow_stage,routing_version_id)
     VALUES ('development','asr',$1)
     ON CONFLICT (environment,workflow_stage)
     DO UPDATE SET routing_version_id=EXCLUDED.routing_version_id,updated_at=CURRENT_TIMESTAMP`,
    [routingVersionId],
  );
  return { deploymentId, deploymentVersionId, routingVersionId };
};

beforeAll(async () => {
  await app.ready();
  routingFixture = await activateAsrRouting(pool, createDefaultAsrAdapterRegistry().defaultDescriptor);
});
beforeEach(async () => {
  await pool.query('DELETE FROM asr_dispatch_groups');
  await pool.query('DELETE FROM projects');
  if (routingFixture) {
    await pool.query(
      `INSERT INTO active_control_plane_pointers
         (environment,workflow_stage,routing_version_id)
       VALUES ('development','asr',$1)
       ON CONFLICT (environment,workflow_stage)
       DO UPDATE SET routing_version_id=EXCLUDED.routing_version_id,updated_at=CURRENT_TIMESTAMP`,
      [routingFixture.routingVersionId],
    );
  }
});
afterAll(async () => {
  await pool.query('DELETE FROM asr_dispatch_groups');
  await pool.query('DELETE FROM projects');
  await pool.query(
    `TRUNCATE active_control_plane_pointers, routing_policy_status_events,
      routing_advance_events, routing_policy_targets, routing_policy_pools, routing_policy_versions, system_control_audit_events,
      connection_test_attempts, connection_test_runs, system_control_commands,
      engine_deployment_versions, engine_deployments CASCADE`,
  );
  await app.close();
});

interface EpisodeSeed {
  episodeNumber: number;
  fileName?: string;
  ready?: boolean;
}

const seedProject = async (
  name: string,
  episodes: EpisodeSeed[],
  database: DatabasePool = pool,
) => {
  const project = await database.query<{ id: string }>(
    `INSERT INTO projects (name, created_by, updated_by)
     VALUES ($1,'test','test') RETURNING id`,
    [name],
  );
  const projectId = project.rows[0]!.id;
  const manifest = await database.query<{ id: string }>(
    `INSERT INTO material_manifests (project_id, version, root_name, created_by)
     VALUES ($1,1,$2,'test') RETURNING id`,
    [projectId, name],
  );
  for (const episode of episodes) {
    const fileName = episode.fileName ?? `EP${String(episode.episodeNumber).padStart(2, '0')}.mp4`;
    const fingerprint = `anonymous/${projectId}/${episode.episodeNumber}`;
    await database.query(
      `INSERT INTO material_manifest_bindings
         (manifest_id, episode_number, role, relative_path, file_name, size_bytes,
          last_modified_ms, fingerprint, media_type)
       VALUES ($1,$2,'asr_video',$3,$4,16,1000,$5,'video')`,
      [manifest.rows[0]!.id, episode.episodeNumber, `${name}/${fileName}`, fileName, fingerprint],
    );
    if (episode.ready === false) continue;
    const checksum = createHash('sha256').update(`${projectId}/${fileName}`).digest('hex');
    const asset = await database.query<{ id: string }>(
      `INSERT INTO assets
         (project_id, object_key, original_filename, media_kind, size_bytes,
          checksum_algorithm, checksum_value, verified_at)
       VALUES ($1,$2,$3,'video',16,'sha256',$4,CURRENT_TIMESTAMP) RETURNING id`,
      [projectId, `projects/${projectId}/videos/${randomUUID()}`, fileName, checksum],
    );
    await database.query(
      `INSERT INTO material_asset_bindings
         (manifest_id, episode_number, role, asset_id, source_fingerprint)
       VALUES ($1,$2,'asr_video',$3,$4)`,
      [manifest.rows[0]!.id, episode.episodeNumber, asset.rows[0]!.id, fingerprint],
    );
  }
  const draft = await database.query<{ id: string }>(
    `INSERT INTO term_drafts
       (project_id, source_srt_set_digest, prompt_version, status)
     VALUES ($1,$2,'term-prompt-v1','confirmed') RETURNING id`,
    [projectId, 'b'.repeat(64)],
  );
  const version = await database.query<{ id: string }>(
    `INSERT INTO term_versions
       (project_id, version, draft_id, source_srt_set_digest, prompt_version)
     VALUES ($1,1,$2,$3,'term-prompt-v1') RETURNING id`,
    [projectId, draft.rows[0]!.id, 'b'.repeat(64)],
  );
  return { projectId, termVersionId: version.rows[0]!.id };
};

const createBatch = (source: { projectId: string; termVersionId: string }) => app.inject({
  method: 'POST',
  url: `/api/projects/${source.projectId}/asr/batches`,
  headers: { 'idempotency-key': randomUUID() },
  payload: { scope: { kind: 'all' }, termVersionId: source.termVersionId },
});

const createDispatch = (
  projectIds: string[],
  key = randomUUID(),
  dispatchGroupId = randomUUID(),
) => app.inject({
  method: 'POST',
  url: '/api/asr/dispatch-groups',
  headers: { 'idempotency-key': key },
  payload: { dispatchGroupId, projectIds, allowPartial: true },
});

const runOne = async (workerId: string) => {
  const worker = new AsrWorker(
    pool,
    createDefaultAsrAdapterRegistry(),
    { leaseMs: 60_000, pollIntervalMs: 50 },
    { workerId },
  );
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const result = await worker.runOnce();
    if (result.processed) return result;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return { processed: false } as const;
};

describe('BACK-M3-02D Rev 2 项目资格与 Dispatch 正式投影', () => {
  it('预生成资源 ID 在唯一一次创建 POST 响应未知后可由详情 GET 恢复且 404 无副作用', async () => {
    const source = await seedProject('已知 ID 恢复项目', [{ episodeNumber: 1 }]);
    const dispatchGroupId = randomUUID();
    const idempotencyKey = randomUUID();
    const before = await app.inject({
      method: 'GET',
      url: `/api/asr/dispatch-groups/${dispatchGroupId}`,
    });
    expect(before.statusCode, before.body).toBe(404);
    expect(before.json().error.code).toBe('ASR_DISPATCH_NOT_FOUND');
    const beforeFacts = await pool.query<{
      groups: string; commands: string; results: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM asr_dispatch_groups) AS groups,
         (SELECT COUNT(*)::text FROM asr_dispatch_commands) AS commands,
         (SELECT COUNT(*)::text FROM asr_dispatch_project_results) AS results`,
    );
    expect(beforeFacts.rows[0]).toEqual({ groups: '0', commands: '0', results: '0' });

    let createPostCount = 0;
    createPostCount += 1;
    const lostResponse = await app.inject({
      method: 'POST',
      url: '/api/asr/dispatch-groups',
      headers: { 'idempotency-key': idempotencyKey },
      payload: {
        dispatchGroupId,
        projectIds: [source.projectId],
        allowPartial: true,
      },
    });
    expect(lostResponse.statusCode, lostResponse.body).toBe(201);
    const initialRequestId = String(lostResponse.headers['x-request-id']);

    const recovered = await app.inject({
      method: 'GET',
      url: `/api/asr/dispatch-groups/${dispatchGroupId}`,
    });
    expect(createPostCount).toBe(1);
    expect(recovered.statusCode, recovered.body).toBe(200);
    expect(recovered.json()).toMatchObject({
      id: dispatchGroupId,
      requestId: initialRequestId,
      results: [{ projectId: source.projectId, acceptanceStatus: 'accepted' }],
    });
    expect(lostResponse.json()).toEqual(recovered.json());
    expect(recovered.headers['x-request-id']).not.toBe(initialRequestId);

    const listed = await app.inject({ method: 'GET', url: '/api/asr/dispatch-groups' });
    expect(listed.statusCode, listed.body).toBe(200);
    expect(listed.json()).toMatchObject({
      total: 1,
      items: [{ id: dispatchGroupId, requestId: initialRequestId }],
    });
    expect(lostResponse.body).not.toContain(idempotencyKey);
    expect(recovered.body).not.toContain(idempotencyKey);
    expect(listed.body).not.toContain(idempotencyKey);

    const facts = await pool.query<{
      groups: string; commands: string; results: string; request_id: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM asr_dispatch_groups) AS groups,
         (SELECT COUNT(*)::text FROM asr_dispatch_commands) AS commands,
         (SELECT COUNT(*)::text FROM asr_dispatch_project_results) AS results,
         (SELECT request_id FROM asr_dispatch_groups WHERE id = $1) AS request_id`,
      [dispatchGroupId],
    );
    expect(facts.rows[0]).toEqual({
      groups: '1', commands: '1', results: '1', request_id: initialRequestId,
    });
  });

  it('创建重放保留首次 requestId，并稳定拒绝同键异资源、同资源异键和缺少资源 ID', async () => {
    const source = await seedProject('资源 ID 冲突项目', [{ episodeNumber: 1 }]);
    const dispatchGroupId = randomUUID();
    const idempotencyKey = randomUUID();
    const created = await createDispatch([source.projectId], idempotencyKey, dispatchGroupId);
    expect(created.statusCode, created.body).toBe(201);
    const firstRequestId = created.json().requestId;
    expect(firstRequestId).toBe(created.headers['x-request-id']);

    const replay = await createDispatch([source.projectId], idempotencyKey, dispatchGroupId);
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json()).toEqual(created.json());
    expect(replay.json().requestId).toBe(firstRequestId);
    expect(replay.headers['x-request-id']).not.toBe(firstRequestId);

    const sameKeyDifferentId = await createDispatch(
      [source.projectId],
      idempotencyKey,
      randomUUID(),
    );
    expect(sameKeyDifferentId.statusCode, sameKeyDifferentId.body).toBe(409);
    expect(sameKeyDifferentId.json().error).toMatchObject({
      code: 'ASR_DISPATCH_IDEMPOTENCY_KEY_REUSED',
      action: 'retry_with_new_idempotency_key',
    });

    const sameIdDifferentKey = await createDispatch(
      [source.projectId],
      randomUUID(),
      dispatchGroupId,
    );
    expect(sameIdDifferentKey.statusCode, sameIdDifferentKey.body).toBe(409);
    expect(sameIdDifferentKey.json().error).toMatchObject({
      code: 'ASR_DISPATCH_GROUP_ID_REUSED',
      action: 'retry_with_new_dispatch_group_id',
    });

    const missingId = await app.inject({
      method: 'POST',
      url: '/api/asr/dispatch-groups',
      headers: { 'idempotency-key': randomUUID() },
      payload: { projectIds: [source.projectId], allowPartial: true },
    });
    expect(missingId.statusCode, missingId.body).toBe(400);
    expect(missingId.json().error.code).toBe('REQUEST_VALIDATION_FAILED');

    const facts = await pool.query<{
      groups: string; commands: string; results: string; request_id: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM asr_dispatch_groups) AS groups,
         (SELECT COUNT(*)::text FROM asr_dispatch_commands) AS commands,
         (SELECT COUNT(*)::text FROM asr_dispatch_project_results) AS results,
         (SELECT request_id FROM asr_dispatch_groups WHERE id = $1) AS request_id`,
      [dispatchGroupId],
    );
    expect(facts.rows[0]).toEqual({
      groups: '1', commands: '1', results: '1', request_id: firstRequestId,
    });
    expect(created.body).not.toContain(idempotencyKey);
    expect(replay.body).not.toContain(idempotencyKey);
  });

  it('项目中心资格查询在服务端完成搜索、筛选、行动排序、分页和最近批次投影', async () => {
    const failed = await seedProject('A-失败项目', [
      { episodeNumber: 1, fileName: 'EP01.fake-rejected.mp4' },
    ]);
    const eligible = await seedProject('B-可执行项目', [{ episodeNumber: 1 }]);
    const active = await seedProject('C-识别中项目', [{ episodeNumber: 1 }]);
    const missingTerms = await seedProject('D-缺术语项目', [{ episodeNumber: 1 }]);
    const missingVideos = await seedProject('E-缺视频项目', [
      { episodeNumber: 1, ready: false },
    ]);
    const recycled = await seedProject('F-回收项目', [{ episodeNumber: 1 }]);

    expect((await createBatch(failed)).statusCode).toBe(201);
    expect(await runOne('rev2-failed-worker')).toMatchObject({ processed: true, outcome: 'failed' });
    const activeBatch = await createBatch(active);
    expect(activeBatch.statusCode, activeBatch.body).toBe(201);
    expect(activeBatch.json().status).toBe('queued');
    await pool.query('DELETE FROM term_versions WHERE project_id = $1', [missingTerms.projectId]);
    await pool.query("UPDATE projects SET lifecycle_status = 'recycled' WHERE id = $1", [recycled.projectId]);
    await pool.query("UPDATE projects SET workflow_status = 'ready' WHERE id = $1", [eligible.projectId]);

    const failedOnly = await app.inject({
      method: 'GET',
      url: '/api/asr/eligibility?eligibilityStatus=failed',
    });
    expect(failedOnly.statusCode, failedOnly.body).toBe(200);
    expect(failedOnly.json()).toMatchObject({
      total: 1,
      items: [{
        projectId: failed.projectId,
        projectName: 'A-失败项目',
        eligibilityStatus: 'failed',
        eligibility: { eligible: true },
        latestBatch: { status: 'failed', totalEpisodes: 1, resultEpisodes: 0 },
      }],
    });

    const search = await app.inject({ method: 'GET', url: '/api/asr/eligibility?search=缺' });
    expect(search.statusCode, search.body).toBe(200);
    expect(search.json().total).toBe(2);
    expect(search.json().items.map((item: any) => item.eligibilityStatus).sort()).toEqual([
      'eligible', 'missing_videos',
    ]);

    const activeOnly = await app.inject({
      method: 'GET',
      url: '/api/asr/eligibility?eligibilityStatus=active',
    });
    expect(activeOnly.json()).toMatchObject({
      total: 1,
      items: [{ projectId: active.projectId, latestBatch: { status: 'queued' } }],
    });
    const recycledOnly = await app.inject({
      method: 'GET',
      url: '/api/asr/eligibility?lifecycleStatus=recycled',
    });
    expect(recycledOnly.json()).toMatchObject({
      total: 1,
      items: [{ projectId: recycled.projectId, eligibilityStatus: 'blocked' }],
    });
    const workflowReady = await app.inject({
      method: 'GET',
      url: '/api/asr/eligibility?workflowStatus=ready',
    });
    expect(workflowReady.json()).toMatchObject({
      total: 1,
      items: [{ projectId: eligible.projectId, workflowStatus: 'ready' }],
    });

    const firstPage = await app.inject({
      method: 'GET',
      url: '/api/asr/eligibility?sortBy=name&sortDirection=asc&limit=2&offset=0',
    });
    const secondPage = await app.inject({
      method: 'GET',
      url: '/api/asr/eligibility?sortBy=name&sortDirection=asc&limit=2&offset=2',
    });
    expect(firstPage.json().total).toBe(6);
    expect(firstPage.json().items.map((item: any) => item.projectName)).toEqual([
      'A-失败项目', 'B-可执行项目',
    ]);
    expect(secondPage.json().items.map((item: any) => item.projectName)).toEqual([
      'C-识别中项目', 'D-缺术语项目',
    ]);
    const emptyPage = await app.inject({
      method: 'GET',
      url: '/api/asr/eligibility?sortBy=name&sortDirection=asc&limit=2&offset=100',
    });
    expect(emptyPage.json()).toMatchObject({ total: 6, items: [] });
    expect(firstPage.json().items[1]).toMatchObject({
      projectId: eligible.projectId,
      eligibilityStatus: 'eligible',
      latestBatch: null,
    });
    expect(missingVideos.projectId).not.toBe(missingTerms.projectId);
  });

  it('接受结果保持不变，执行状态随子批次迁移并汇总质量、用量和待对账', async () => {
    const completed = await seedProject('完成项目', [{ episodeNumber: 1 }]);
    const created = await createDispatch([completed.projectId]);
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json()).toMatchObject({
      acceptanceStatus: 'accepted',
      executionStatus: 'queued',
      counts: { completedProjects: 0 },
      quality: { passedEpisodes: 0, warningEpisodes: 0 },
      processingUsage: { reconciliationStatus: 'not_recorded' },
    });
    expect(await runOne('rev2-complete-worker')).toMatchObject({ processed: true, outcome: 'completed' });
    const completedRead = await app.inject({
      method: 'GET',
      url: `/api/asr/dispatch-groups/${created.json().id}`,
    });
    expect(completedRead.json()).toMatchObject({
      acceptanceStatus: 'accepted',
      executionStatus: 'completed',
      counts: { completedProjects: 1 },
      quality: { passedEpisodes: 1, warningEpisodes: 0, rejectedEpisodes: 0 },
      processingUsage: { recordedAttempts: 1, reconciliationStatus: 'recorded' },
    });

    const unknown = await seedProject('需对账项目', [
      { episodeNumber: 1, fileName: 'EP01.fake-reconcile.mp4' },
    ]);
    const unknownDispatch = await createDispatch([unknown.projectId]);
    expect(await runOne('rev2-reconcile-worker')).toMatchObject({
      processed: true,
      outcome: 'reconciliation_required',
    });
    const unknownRead = await app.inject({
      method: 'GET',
      url: `/api/asr/dispatch-groups/${unknownDispatch.json().id}`,
    });
    expect(unknownRead.json()).toMatchObject({
      acceptanceStatus: 'accepted',
      executionStatus: 'reconciliation_required',
      processingUsage: { recordedAttempts: 1, reconciliationStatus: 'pending' },
    });

    const mixedComplete = await seedProject('混合完成项目', [{ episodeNumber: 1 }]);
    const mixedUnknown = await seedProject('混合需对账项目', [
      { episodeNumber: 1, fileName: 'EP01.fake-reconcile.mp4' },
    ]);
    const mixed = await createDispatch([mixedComplete.projectId, mixedUnknown.projectId]);
    await runOne('rev2-mixed-worker-1');
    await runOne('rev2-mixed-worker-2');
    const mixedRead = await app.inject({
      method: 'GET',
      url: `/api/asr/dispatch-groups/${mixed.json().id}`,
    });
    expect(mixedRead.json()).toMatchObject({
      acceptanceStatus: 'accepted',
      executionStatus: 'partial',
      counts: { completedProjects: 1 },
      quality: { passedEpisodes: 1 },
      processingUsage: { recordedAttempts: 2, reconciliationStatus: 'pending' },
    });

    const filtered = await app.inject({
      method: 'GET',
      url: '/api/asr/dispatch-groups?executionStatus=reconciliation_required',
    });
    expect(filtered.statusCode, filtered.body).toBe(200);
    expect(filtered.json()).toMatchObject({
      total: 1,
      items: [{ id: unknownDispatch.json().id, acceptanceStatus: 'accepted' }],
    });
    const acceptedOnly = await app.inject({
      method: 'GET',
      url: '/api/asr/dispatch-groups?acceptanceStatus=accepted',
    });
    expect(acceptedOnly.json().total).toBe(3);
    const searched = await app.inject({
      method: 'GET',
      url: '/api/asr/dispatch-groups?search=混合需对账',
    });
    expect(searched.json()).toMatchObject({ total: 1, items: [{ id: mixed.json().id }] });
    const actionSorted = await app.inject({
      method: 'GET',
      url: '/api/asr/dispatch-groups?sortBy=actionPriority',
    });
    expect(actionSorted.json().items.map((item: any) => item.executionStatus)).toEqual([
      'reconciliation_required', 'partial', 'completed',
    ]);
    const updatedAscending = await app.inject({
      method: 'GET',
      url: '/api/asr/dispatch-groups?sortBy=updatedAt&sortDirection=asc',
    });
    const updatedTimes = updatedAscending.json().items.map(
      (item: any) => new Date(item.updatedAt).getTime(),
    );
    expect(updatedTimes).toEqual([...updatedTimes].sort((left, right) => left - right));
    const emptyPage = await app.inject({
      method: 'GET',
      url: '/api/asr/dispatch-groups?acceptanceStatus=accepted&limit=1&offset=100',
    });
    expect(emptyPage.json()).toMatchObject({ total: 3, items: [] });
  });

  it('100 集资格与批次准备都只用一次集合查询核对可复用结果', async () => {
    const source = await seedProject(
      '百集集合查询项目',
      Array.from({ length: 100 }, (_, index) => ({ episodeNumber: index + 1 })),
    );
    const client = await pool.connect();
    let reusableQueryCount = 0;
    const instrumentedClient = new Proxy(client, {
      get(target, property, receiver) {
        if (property !== 'query') return Reflect.get(target, property, receiver);
        return (...args: Parameters<typeof client.query>) => {
          if (typeof args[0] === 'string' && args[0].includes('FROM asr_results')) {
            reusableQueryCount += 1;
          }
          return client.query(...args);
        };
      },
    });
    try {
      const repository = new AsrEligibilityRepository(
        pool,
        createDefaultAsrAdapterRegistry().defaultDescriptor,
      );
      const eligibility = await repository.evaluateWithClient(instrumentedClient, source.projectId);
      expect(eligibility).toMatchObject({
        eligible: true,
        totalEpisodeCount: 100,
        readyEpisodeCount: 100,
        newJobCount: 100,
        reusableResultCount: 0,
      });
      expect(reusableQueryCount).toBe(1);

      reusableQueryCount = 0;
      const preparation = await repository.prepareBatchWithClient(instrumentedClient, source.projectId, {
        termVersionId: source.termVersionId,
      });
      expect(preparation).toMatchObject({
        projectId: source.projectId,
        termVersionId: source.termVersionId,
        counts: { total: 100, executable: 100, reusable: 0, blocked: 0, newJobs: 100 },
      });
      expect(preparation.episodes).toHaveLength(100);
      expect(preparation.episodes[0]).toMatchObject({ episodeNumber: 1, status: 'executable' });
      expect(preparation.episodes[99]).toMatchObject({ episodeNumber: 100, status: 'executable' });
      expect(reusableQueryCount).toBe(1);
    } finally {
      client.release();
    }
  });

  it('单剧准备 API 一次返回可复用、可执行与阻断集，并隔离跨项目术语版本', async () => {
    const source = await seedProject('单剧准备投影', [
      { episodeNumber: 1 },
      { episodeNumber: 2 },
      { episodeNumber: 3, ready: false },
    ]);
    const other = await seedProject('其他项目术语', [{ episodeNumber: 1 }]);
    const first = await app.inject({
      method: 'POST',
      url: `/api/projects/${source.projectId}/asr/batches`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        scope: { kind: 'single', episodeNumber: 1 },
        termVersionId: source.termVersionId,
      },
    });
    expect(first.statusCode, first.body).toBe(201);
    expect(await runOne('preparation-reusable-worker')).toMatchObject({
      processed: true,
      outcome: 'completed',
    });

    const prepared = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/batch-preparation?termVersionId=${source.termVersionId}`,
    });
    expect(prepared.statusCode, prepared.body).toBe(200);
    expect(prepared.json()).toMatchObject({
      projectId: source.projectId,
      termVersionId: source.termVersionId,
      forceNewRecognition: false,
      counts: { total: 3, executable: 1, reusable: 1, blocked: 1, newJobs: 1 },
      episodes: [
        { episodeNumber: 1, status: 'reusable', blockers: [] },
        { episodeNumber: 2, status: 'executable', reusableResultId: null, blockers: [] },
        {
          episodeNumber: 3,
          status: 'blocked',
          reusableResultId: null,
          blockers: [{ code: 'ASR_VIDEO_NOT_READY', action: 'prepare_asr_videos' }],
        },
      ],
    });
    expect(prepared.json().episodes[0].reusableResultId).toMatch(/^[0-9a-f-]{36}$/);

    const forced = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/batch-preparation?termVersionId=${source.termVersionId}&forceNewRecognition=true`,
    });
    expect(forced.statusCode, forced.body).toBe(200);
    expect(forced.json()).toMatchObject({
      forceNewRecognition: true,
      counts: { total: 3, executable: 2, reusable: 0, blocked: 1, newJobs: 2 },
      episodes: [
        { episodeNumber: 1, status: 'executable' },
        { episodeNumber: 2, status: 'executable' },
        { episodeNumber: 3, status: 'blocked' },
      ],
    });

    const crossProject = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/batch-preparation?termVersionId=${other.termVersionId}`,
    });
    expect(crossProject.statusCode, crossProject.body).toBe(422);
    expect(crossProject.json().error).toMatchObject({
      code: 'ASR_TERM_VERSION_NOT_FOUND',
      action: 'select_term_version',
    });
  });

  it('单剧批次全集查询在服务端完成编号搜索、行动排序、状态筛选与空页总数', async () => {
    const source = await seedProject('单剧批次全集', [
      { episodeNumber: 1 },
      { episodeNumber: 2, fileName: 'EP02.fake-rejected.mp4' },
      { episodeNumber: 3 },
    ]);
    const createSingle = (episodeNumber: number) => app.inject({
      method: 'POST',
      url: `/api/projects/${source.projectId}/asr/batches`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        scope: { kind: 'single', episodeNumber },
        termVersionId: source.termVersionId,
      },
    });
    const completed = await createSingle(1);
    expect(completed.statusCode, completed.body).toBe(201);
    expect(await runOne('single-list-completed')).toMatchObject({ outcome: 'completed' });
    const failed = await createSingle(2);
    expect(failed.statusCode, failed.body).toBe(201);
    expect(await runOne('single-list-failed')).toMatchObject({ outcome: 'failed' });
    const queued = await createSingle(3);
    expect(queued.statusCode, queued.body).toBe(201);

    const actionSorted = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/batches?sortBy=actionPriority`,
    });
    expect(actionSorted.statusCode, actionSorted.body).toBe(200);
    expect(actionSorted.json()).toMatchObject({ total: 3 });
    expect(actionSorted.json().items.map((item: any) => item.status)).toEqual([
      'failed', 'queued', 'completed',
    ]);

    const searched = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/batches?search=${failed.json().id.slice(0, 12)}`,
    });
    expect(searched.statusCode, searched.body).toBe(200);
    expect(searched.json()).toMatchObject({ total: 1, items: [{ id: failed.json().id }] });

    const failedOnly = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/batches?status=failed`,
    });
    expect(failedOnly.statusCode, failedOnly.body).toBe(200);
    expect(failedOnly.json()).toMatchObject({ total: 1, items: [{ id: failed.json().id }] });

    await pool.query(
      `UPDATE asr_batches
          SET updated_at = CASE id
            WHEN $1 THEN '2026-08-14T01:00:00Z'::timestamptz
            WHEN $2 THEN '2026-08-14T02:00:00Z'::timestamptz
            WHEN $3 THEN '2026-08-14T03:00:00Z'::timestamptz
          END
        WHERE id IN ($1,$2,$3)`,
      [completed.json().id, failed.json().id, queued.json().id],
    );
    const updatedAscending = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/batches?sortBy=updatedAt&sortDirection=asc`,
    });
    expect(updatedAscending.statusCode, updatedAscending.body).toBe(200);
    expect(updatedAscending.json().items.map((item: any) => item.id)).toEqual([
      completed.json().id, failed.json().id, queued.json().id,
    ]);

    const emptyPage = await app.inject({
      method: 'GET',
      url: `/api/projects/${source.projectId}/asr/batches?limit=1&offset=100`,
    });
    expect(emptyPage.statusCode, emptyPage.body).toBe(200);
    expect(emptyPage.json()).toEqual({ total: 3, items: [] });
  });

  it('派发取消幂等保存未终结子批次意图，刷新保留已完成结果和用量', async () => {
    const first = await seedProject('取消保留完成甲', [{ episodeNumber: 1 }]);
    const second = await seedProject('取消未开始乙', [{ episodeNumber: 1 }]);
    const blocked = await seedProject('取消阻断丙', [{ episodeNumber: 1, ready: false }]);
    const dispatch = await createDispatch([first.projectId, second.projectId, blocked.projectId]);
    expect(await runOne('rev2-cancel-complete-one')).toMatchObject({
      processed: true,
      outcome: 'completed',
    });
    const key = randomUUID();
    const cancelled = await app.inject({
      method: 'POST',
      url: `/api/asr/dispatch-groups/${dispatch.json().id}/cancel`,
      headers: { 'idempotency-key': key },
      payload: {},
    });
    expect(cancelled.statusCode, cancelled.body).toBe(200);
    expect(cancelled.json()).toMatchObject({
      acceptanceStatus: 'partial',
      executionStatus: 'partial',
      counts: {
        acceptedProjects: 2,
        blockedProjects: 1,
        completedProjects: 1,
        batches: { completed: 1, cancelled: 1 },
      },
      quality: { passedEpisodes: 1 },
      processingUsage: { recordedAttempts: 1, reconciliationStatus: 'recorded' },
    });
    const replay = await app.inject({
      method: 'POST',
      url: `/api/asr/dispatch-groups/${dispatch.json().id}/cancel`,
      headers: { 'idempotency-key': key },
      payload: {},
    });
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json()).toEqual(cancelled.json());
    const persisted = await app.inject({
      method: 'GET',
      url: `/api/asr/dispatch-groups/${dispatch.json().id}`,
    });
    expect(persisted.json()).toEqual(cancelled.json());
    const facts = await pool.query<{
      cancel_commands: string; results: string; usages: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM asr_dispatch_cancel_commands WHERE dispatch_group_id = $1)
           AS cancel_commands,
         (SELECT COUNT(*)::text FROM asr_results result
           JOIN asr_jobs job ON job.id = result.source_job_id
           JOIN asr_dispatch_project_results dispatch_result ON dispatch_result.batch_id = job.batch_id
          WHERE dispatch_result.dispatch_group_id = $1) AS results,
         (SELECT COUNT(*)::text FROM asr_usage usage
           JOIN asr_attempts attempt ON attempt.id = usage.attempt_id
           JOIN asr_jobs job ON job.id = attempt.job_id
           JOIN asr_dispatch_project_results dispatch_result ON dispatch_result.batch_id = job.batch_id
          WHERE dispatch_result.dispatch_group_id = $1) AS usages`,
      [dispatch.json().id],
    );
    expect(facts.rows[0]).toEqual({ cancel_commands: '1', results: '1', usages: '1' });

    const another = await seedProject('取消键冲突项目', [{ episodeNumber: 1 }]);
    const anotherDispatch = await createDispatch([another.projectId]);
    const conflict = await app.inject({
      method: 'POST',
      url: `/api/asr/dispatch-groups/${anotherDispatch.json().id}/cancel`,
      headers: { 'idempotency-key': key },
      payload: {},
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('ASR_DISPATCH_CANCEL_IDEMPOTENCY_KEY_REUSED');
    const closeAnother = await app.inject({
      method: 'POST',
      url: `/api/asr/dispatch-groups/${anotherDispatch.json().id}/cancel`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {},
    });
    expect(closeAnother.statusCode, closeAnother.body).toBe(200);

    const runningProject = await seedProject('运行取消项目', [{ episodeNumber: 1 }]);
    const runningDispatch = await createDispatch([runningProject.projectId]);
    const repository = new AsrWorkerRepository(pool);
    const now = new Date();
    const claim = await repository.claim({
      workerId: 'rev2-running-cancel-worker',
      now,
      leaseExpiresAt: new Date(now.getTime() + 60_000),
      policy: developmentAsrSchedulingPolicy,
    });
    expect(claim?.projectId).toBe(runningProject.projectId);
    expect(await repository.start(claim!, now)).toBe(true);
    const runningRead = await app.inject({
      method: 'GET',
      url: `/api/asr/dispatch-groups/${runningDispatch.json().id}`,
    });
    expect(runningRead.json()).toMatchObject({
      acceptanceStatus: 'accepted',
      executionStatus: 'running',
    });
    const runningCancel = await app.inject({
      method: 'POST',
      url: `/api/asr/dispatch-groups/${runningDispatch.json().id}/cancel`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {},
    });
    expect(runningCancel.statusCode, runningCancel.body).toBe(200);
    expect(runningCancel.json()).toMatchObject({
      acceptanceStatus: 'accepted',
      executionStatus: 'cancel_requested',
      counts: { batches: { cancelRequested: 1 } },
    });
  });
});
