import { createHash, randomUUID } from 'node:crypto';

import { ScreenTextExecutionSchema } from '@qimao-terms-cloud/contracts';
import { Value } from '@sinclair/typebox/value';
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { createPool, type DatabasePool } from '../../backend/src/database/pool.js';
import { localDatabaseUrl } from '../../backend/src/config.js';
import { createLocalOcrAdapterRegistryFromEnv } from '../../backend/src/modules/screen-text/local-ocr-runtime.js';
import {
  DeterministicFakeScreenTextAdapter,
  ZeroNetworkCloudApiStub,
  ZeroNetworkSelfHostedWorkerStub,
} from '../../backend/src/modules/screen-text/screen-text.adapter.js';
import { ZeroNetworkLocalOcrSidecarTransport } from '../../backend/src/modules/screen-text/screen-text.local-ocr-sidecar.js';
import { ScreenTextAdapterRegistry } from '../../backend/src/modules/screen-text/screen-text.adapter-registry.js';
import { InMemoryScreenTextEvidenceStorage } from '../../backend/src/modules/screen-text/screen-text.evidence-storage.js';
import { ScreenTextWorkerRepository } from '../../backend/src/modules/screen-text/screen-text.worker.repository.js';
import type { ScreenTextRemoteMediaSource } from '../../backend/src/modules/screen-text/screen-text-media.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';
import { InMemoryDeliveryStorageFake } from '../../backend/src/modules/deliveries/in-memory-delivery-storage.fake.js';
import { ScreenTextWorker } from '../../backend/src/workers/screen-text.worker.js';

const adapters = () => [
  new DeterministicFakeScreenTextAdapter(),
  new ZeroNetworkCloudApiStub(),
  new ZeroNetworkSelfHostedWorkerStub(),
];

type Harness = ReturnType<typeof createHarness> extends Promise<infer T> ? T : never;
let activeHarness: Harness | null = null;

const createHarness = async (defaultAdapter = 'screen_text_deterministic_fake', routingAdapters: string[] = [defaultAdapter], capacity: { maxConcurrentJobs: number; perProjectMax: number; queueLimit: number } | Array<{ maxConcurrentJobs: number; perProjectMax: number; queueLimit: number }> = { maxConcurrentJobs: 10, perProjectMax: 2, queueLimit: 100 }, registryInput?: ScreenTextAdapterRegistry, workerInput?: { remoteMediaSource?: ScreenTextRemoteMediaSource }, routingFacts?: { deploymentConfigDigest?: string; omitDescriptorDigest?: boolean }) => {
  const pool = createPool();
  const storage = new InMemoryStorageFake();
  const evidenceStorage = new InMemoryScreenTextEvidenceStorage();
  const registry = registryInput ?? new ScreenTextAdapterRegistry(adapters(), defaultAdapter);
  const app = createApp({
    database: pool, uploadStorage: storage, screenTextAdapterRegistry: registry,
    screenTextEvidenceStorage: evidenceStorage,
    deliveryStorage: new InMemoryDeliveryStorageFake(),
  });
  await app.ready();
  const worker = new ScreenTextWorker(pool, registry, evidenceStorage, { leaseMs: 30_000, pollIntervalMs: 50 }, {
    workerId: `anonymous-${defaultAdapter}`,
    ...workerInput,
  });
  activeHarness = { pool, storage, evidenceStorage, registry, app, worker };
  await pool.query('TRUNCATE project_commands, projects CASCADE');
  const descriptor = registry.get(defaultAdapter)!.descriptor;
  const budgetPolicyId = randomUUID();
  await pool.query(`INSERT INTO budget_policy_versions(id,environment,version) VALUES ($1,'development',(SELECT COALESCE(MAX(version),0)+1 FROM budget_policy_versions WHERE environment='development'))`, [budgetPolicyId]);
  await pool.query(`INSERT INTO budget_policy_rules(budget_policy_version_id,resource_pool,currency,period,warning_limit,hard_limit) VALUES ($1,'ocr_api','CNY','day',1,100)`, [budgetPolicyId]);
  await pool.query(`INSERT INTO budget_policy_status_events(budget_policy_version_id,status,request_id,actor_subject) VALUES ($1,'active','screen-test-budget','screen-test')`, [budgetPolicyId]);
  await pool.query(`INSERT INTO active_budget_policy_pointers(environment,budget_policy_version_id) VALUES ('development',$1) ON CONFLICT (environment) DO UPDATE SET budget_policy_version_id=EXCLUDED.budget_policy_version_id,updated_at=CURRENT_TIMESTAMP`, [budgetPolicyId]);
  const routingVersionId = randomUUID();
  const targetRows: Array<{ poolId: string; deploymentVersionId: string; priority: number; adapterKey: string }> = [];
  for (const [index, adapterId] of routingAdapters.entries()) {
    const targetDescriptor = registry.get(adapterId)!.descriptor;
    const deploymentId = randomUUID(); const deploymentVersionId = randomUUID();
    const executionKind = targetDescriptor.kind === 'self_hosted_worker' ? 'self_hosted_worker' : 'cloud_api';
    const capabilitiesSnapshot = {
      capability: 'screen_text', executionKind, provider: targetDescriptor.provider, adapterKey: targetDescriptor.adapter,
      model: targetDescriptor.model, language: targetDescriptor.language, deployment: targetDescriptor.deployment,
      adapterKind: targetDescriptor.kind, ...(routingFacts?.omitDescriptorDigest ? {} : { descriptorDigest: targetDescriptor.configDigest }),
      capabilities: targetDescriptor.capabilities,
    };
    await pool.query(`INSERT INTO engine_deployments (id,capability,execution_kind,display_name,provider,adapter_key,status) VALUES ($1,'screen_text',$2,$3,$4,$5,'enabled')`, [deploymentId, executionKind, `test-${adapterId}`, targetDescriptor.provider, targetDescriptor.adapter]);
    await pool.query(`INSERT INTO engine_deployment_versions (id,deployment_id,version,model,language,capabilities_snapshot,secret_reference_summary,config_digest,billing_snapshot) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8)`, [deploymentVersionId, deploymentId, targetDescriptor.model, targetDescriptor.language, JSON.stringify(capabilitiesSnapshot), JSON.stringify({ present: false, referenceDigest: null, redactedLabel: null }), routingFacts?.deploymentConfigDigest ?? targetDescriptor.configDigest, JSON.stringify(targetDescriptor.billing)]);
    if (targetDescriptor.billing.billingClass === 'metered') {
      await pool.query(`INSERT INTO cost_conversion_snapshots(id,source_currency,target_currency,rate,rate_digest,effective_at,expires_at,status) VALUES($1,$2,'CNY','1'::numeric,$3,CURRENT_TIMESTAMP - interval '1 minute',CURRENT_TIMESTAMP + interval '1 day','available')`, [randomUUID(), targetDescriptor.billing.currency, 'e'.repeat(64)]);
    }
    targetRows.push({
      poolId: executionKind === 'self_hosted_worker' ? 'ocr_self_hosted_worker' : 'ocr_api',
      deploymentVersionId, priority: index + 1, adapterKey: targetDescriptor.adapter,
    });
  }
  await pool.query(`INSERT INTO routing_policy_versions (id,environment,workflow_stage,version) VALUES ($1,'development','screen_text',(SELECT COALESCE(MAX(version),0)+1 FROM routing_policy_versions WHERE environment='development' AND workflow_stage='screen_text'))`, [routingVersionId]);
  await pool.query(`INSERT INTO routing_policy_pools (routing_version_id,pool_id) VALUES ($1,'asr_api'),($1,'ocr_api'),($1,'ocr_self_hosted_worker')`, [routingVersionId]);
  for (const [index, target] of targetRows.entries()) {
    const targetCapacity = Array.isArray(capacity) ? capacity[index] ?? capacity[capacity.length - 1]! : capacity;
    await pool.query(`INSERT INTO routing_policy_targets (routing_version_id,pool_id,routing_target_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [routingVersionId, target.poolId, randomUUID(), target.deploymentVersionId, target.priority, target.priority === 1 ? 'preferred' : 'standard', targetCapacity.maxConcurrentJobs, targetCapacity.perProjectMax, targetCapacity.queueLimit]);
  }
  await pool.query(`INSERT INTO routing_policy_status_events (routing_version_id,status,request_id,actor_subject) VALUES ($1,'active','test-routing','test')`, [routingVersionId]);
  await pool.query(`INSERT INTO active_control_plane_pointers (environment,workflow_stage,routing_version_id) VALUES ('development','screen_text',$1) ON CONFLICT (environment,workflow_stage) DO UPDATE SET routing_version_id=EXCLUDED.routing_version_id,updated_at=CURRENT_TIMESTAMP`, [routingVersionId]);
  return activeHarness;
};

afterEach(async () => {
  if (!activeHarness) return;
  await activeHarness.pool.query('TRUNCATE project_commands, projects CASCADE');
  await activeHarness.app.close();
  activeHarness = null;
});

const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const bytes = (value: string) => new TextEncoder().encode(value);

const putObject = async (storage: InMemoryStorageFake, objectKey: string, content: Uint8Array) => {
  const uploadId = await storage.createMultipart(objectKey);
  const authorization = await storage.authorizePart({
    storageUploadId: uploadId, objectKey, partNumber: 1,
    expiresAt: new Date(Date.now() + 60_000),
  });
  const part = await storage.uploadAuthorizedPart(authorization.authorizationToken, content);
  await storage.completeMultipart({ storageUploadId: uploadId, objectKey, parts: [part] });
};

const seedProject = async (
  harness: Harness,
  filenames: string[] = ['screen-normal.mp4'],
  lifecycleStatus = 'active',
) => {
  const projectId = randomUUID();
  const manifestId = randomUUID();
  const termDraftId = randomUUID();
  const termVersionId = randomUUID();
  const termCandidateId = randomUUID();
  const sourceDigest = digest(`anonymous-srt:${projectId}`);
  await harness.pool.query(`
    INSERT INTO projects (id,name,workflow_status,lifecycle_status,version,created_by,updated_by)
    VALUES ($1,'匿名画面字剧','ready',$2,1,'test','test')
  `, [projectId, lifecycleStatus]);
  await harness.pool.query(`
    INSERT INTO material_manifests (id,project_id,version,root_name,created_by)
    VALUES ($1,$2,1,'anonymous','test')
  `, [manifestId, projectId]);
  const assetIds: string[] = [];
  for (const [index, filename] of filenames.entries()) {
    const episodeNumber = index + 1;
    const assetId = randomUUID();
    const objectKey = `anonymous/${projectId}/${filename}`;
    const content = bytes(`anonymous-video-${episodeNumber}`);
    assetIds.push(assetId);
    await putObject(harness.storage, objectKey, content);
    await harness.pool.query(`
      INSERT INTO assets (
        id,project_id,object_key,original_filename,media_kind,size_bytes,
        checksum_algorithm,checksum_value,verified_at
      ) VALUES ($1,$2,$3,$4,'video',$5,'sha256',$6,CURRENT_TIMESTAMP)
    `, [assetId, projectId, objectKey, filename, content.byteLength, digest(content)]);
    await harness.pool.query(`
      INSERT INTO material_manifest_bindings (
        manifest_id,episode_number,role,relative_path,file_name,size_bytes,
        last_modified_ms,fingerprint,media_type
      ) VALUES ($1,$2,'screen_video',$3,$4,$5,1,$6,'video')
    `, [manifestId, episodeNumber, objectKey, filename, content.byteLength, `screen-${episodeNumber}`]);
    await harness.pool.query(`
      INSERT INTO material_asset_bindings (
        manifest_id,episode_number,role,asset_id,source_fingerprint
      ) VALUES ($1,$2,'screen_video',$3,$4)
    `, [manifestId, episodeNumber, assetId, `screen-${episodeNumber}`]);
  }
  await harness.pool.query(`
    INSERT INTO term_drafts (id,project_id,source_srt_set_digest,prompt_version,status)
    VALUES ($1,$2,$3,'term-prompt-v1','confirmed')
  `, [termDraftId, projectId, sourceDigest]);
  await harness.pool.query(`
    INSERT INTO term_versions (id,project_id,version,draft_id,source_srt_set_digest,prompt_version)
    VALUES ($1,$2,1,$3,$4,'term-prompt-v1')
  `, [termVersionId, projectId, termDraftId, sourceDigest]);
  await harness.pool.query(`
    INSERT INTO term_candidates (id,draft_id,type,name,aliases,gender,note,origin,status)
    VALUES ($1,$2,'人名','匿名人物','["匿名别称"]'::jsonb,'unknown','匿名负责人','manual','approved')
  `, [termCandidateId, termDraftId]);
  await harness.pool.query(`
    INSERT INTO term_version_items (
      term_version_id,source_candidate_id,sort_order,type,name,aliases,gender,note,
      first_episode_number,first_cue_index
    ) VALUES ($1,$2,1,'人名','匿名人物','["匿名别称"]'::jsonb,'unknown','匿名负责人',1,1)
  `, [termVersionId, termCandidateId]);
  return { projectId, manifestId, termVersionId, assetIds };
};

const addTermVersion = async (harness: Harness, projectId: string, version = 2) => {
  const draftId = randomUUID();
  const termVersionId = randomUUID();
  const sourceDigest = digest(`anonymous-srt:${projectId}:v${version}`);
  await harness.pool.query(`
    INSERT INTO term_drafts (id,project_id,source_srt_set_digest,prompt_version,status)
    VALUES ($1,$2,$3,'term-prompt-v1','confirmed')
  `, [draftId, projectId, sourceDigest]);
  await harness.pool.query(`
    INSERT INTO term_versions (id,project_id,version,draft_id,source_srt_set_digest,prompt_version)
    VALUES ($1,$2,$3,$4,$5,'term-prompt-v1')
  `, [termVersionId, projectId, version, draftId, sourceDigest]);
  return termVersionId;
};

const createBatch = async (
  harness: Harness,
  seeded: Awaited<ReturnType<typeof seedProject>>,
  scope: unknown = { kind: 'all' },
  key = randomUUID(),
) => harness.app.inject({
  method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches`,
  headers: { 'idempotency-key': key }, payload: { scope, termVersionId: seeded.termVersionId },
});

const withNodeEnv = async <T>(value: string, operation: () => Promise<T>) => {
  const previous = process.env.NODE_ENV;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.NODE_ENV = value;
  if (value === 'production' && !previousDatabaseUrl) process.env.DATABASE_URL = localDatabaseUrl;
  try {
    return await operation();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
};

const decide = (harness: Harness, projectId: string, candidate: any, action: string, extra = {}) =>
  harness.app.inject({
    method: 'POST', url: `/api/projects/${projectId}/screen-text/candidates/${candidate.id}/decisions`,
    headers: { 'idempotency-key': randomUUID() },
    payload: { action, expectedRevision: candidate.revision, ...extra },
  });

const adapterCases = [
  ['screen_text_deterministic_fake', 'deterministic_fake', 'in_process', 'zero_network_call', 0, 'CNY', '0'],
  ['screen_text_cloud_stub', 'cloud_api', 'external_api', 'image', 8, 'USD', '0.08'],
  ['screen_text_worker_stub', 'self_hosted_worker', 'worker_pool', 'compute_millisecond', 40, 'CNY', '0'],
] as const;

describe('BACK-M3-04A 画面字权威后端', () => {
  it('OpenVINO 批次锁定抽帧快照与 digest，数据库拒绝改写且不复制 route 并发字段', async () => {
    const registry = createLocalOcrAdapterRegistryFromEnv({ env: {
      QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true',
      QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT: 'http://127.0.0.1:3100',
      QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: 'a'.repeat(64),
    } })!;
    const harness = await createHarness('screen_text_openvino_ppocrv6_small', ['screen_text_openvino_ppocrv6_small'], { maxConcurrentJobs: 3, perProjectMax: 2, queueLimit: 9 }, registry);
    const seeded = await seedProject(harness);
    const created = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 1 });
    expect(created.statusCode, created.body).toBe(201);
    const persisted = await harness.pool.query<{ runtime_config: unknown; runtime_config_digest: string | null }>('SELECT runtime_config,runtime_config_digest FROM screen_text_batches WHERE id=$1', [created.json().id]);
    expect(persisted.rows[0]).toEqual({ runtime_config: { preset: 'screen_text_openvino_ppocrv6_small', frameIntervalMs: 1000, maxFramesPerEpisode: 600 }, runtime_config_digest: expect.stringMatching(/^[0-9a-f]{64}$/) });
    await expect(harness.pool.query(`UPDATE screen_text_batches SET runtime_config='{"preset":"screen_text_openvino_ppocrv6_small","frameIntervalMs":2000,"maxFramesPerEpisode":120}'::jsonb WHERE id=$1`, [created.json().id])).rejects.toThrow();
    await harness.pool.query(`UPDATE screen_text_jobs SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE batch_id=$1`, [created.json().id]);
    const retried = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}/retries`,
      headers: { 'idempotency-key': randomUUID() }, payload: { episodeNumbers: [1] },
    });
    expect(retried.statusCode, retried.body).toBe(200);
    const afterRetry = await harness.pool.query<{ runtime_config: unknown; runtime_config_digest: string | null }>('SELECT runtime_config,runtime_config_digest FROM screen_text_batches WHERE id=$1', [created.json().id]);
    expect(afterRetry.rows[0]).toEqual(persisted.rows[0]);
    const claim = await new ScreenTextWorkerRepository(harness.pool, harness.evidenceStorage).claim({
      workerId: 'runtime-config-test-worker', now: new Date(), leaseExpiresAt: new Date(Date.now() + 60_000),
    });
    expect(claim?.runtimeConfig).toEqual(persisted.rows[0].runtime_config);
    expect(claim?.runtimeConfigDigest).toBe(persisted.rows[0].runtime_config_digest);
    const attempt = await harness.pool.query<{ runtime_config: unknown; runtime_config_digest: string | null }>('SELECT runtime_config,runtime_config_digest FROM screen_text_attempts WHERE id=$1', [claim!.attemptId]);
    expect(attempt.rows[0]).toEqual(persisted.rows[0]);
    await expect(harness.pool.query(`UPDATE screen_text_attempts SET runtime_config='{"preset":"screen_text_openvino_ppocrv6_small","frameIntervalMs":3000,"maxFramesPerEpisode":120}'::jsonb WHERE id=$1`, [claim!.attemptId])).rejects.toThrow();
    const routeColumns = await harness.pool.query<{ max_concurrent_jobs: number; per_project_max: number; queue_limit: number }>('SELECT max_concurrent_jobs,per_project_max,queue_limit FROM routing_policy_targets WHERE routing_version_id=(SELECT routing_version_id FROM screen_text_batches WHERE id=$1) ORDER BY priority LIMIT 1', [created.json().id]);
    expect(routeColumns.rows[0]).toEqual({ max_concurrent_jobs: 3, per_project_max: 2, queue_limit: 9 });
  });

  it('production NODE_ENV 下 active OpenVINO route 可创建 queued batch/jobs', async () => withNodeEnv('production', async () => {
    const adapterKey = 'screen_text_openvino_ppocrv6_small';
    const localRegistry = createLocalOcrAdapterRegistryFromEnv({
      env: {
        QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: 'a'.repeat(64),
        QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true',
        QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT: 'http://127.0.0.1:3100',
        QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS: '5000',
      },
      transportFactory: () => new ZeroNetworkLocalOcrSidecarTransport(),
    });
    const realAdapter = localRegistry?.get(adapterKey);
    expect(realAdapter).toBeDefined();
    const registry = new ScreenTextAdapterRegistry([...adapters(), realAdapter!], adapterKey);
    const harness = await createHarness(adapterKey, [adapterKey], undefined, registry);
    const seeded = await seedProject(harness, ['screen-production-route.mp4']);
    const created = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 1 });

    expect(created.statusCode, created.body).toBe(201);
    expect(created.json().status).toBe('queued');
    const jobs = await harness.pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM screen_text_jobs WHERE batch_id=$1',
      [created.json().id],
    );
    expect(jobs.rows[0]?.count).toBe('1');
  }));

  it('OpenVINO PP-OCRv6 Small 86 字符 model 可写入 batch/job，合同仍拒绝超过 160', async () => {
    const adapterKey = 'screen_text_openvino_ppocrv6_small';
    const localRegistry = createLocalOcrAdapterRegistryFromEnv({
      env: {
        QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: 'a'.repeat(64),
        QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true',
        QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT: 'http://127.0.0.1:3100',
        QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS: '5000',
      },
      transportFactory: () => new ZeroNetworkLocalOcrSidecarTransport(),
    });
    const realAdapter = localRegistry?.get(adapterKey);
    expect(realAdapter).toBeDefined();
    expect(realAdapter!.descriptor.model).toHaveLength(86);
    const registry = new ScreenTextAdapterRegistry([...adapters(), realAdapter!], adapterKey);
    const remoteMediaSource: ScreenTextRemoteMediaSource = {
      read: async (input) => ({
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        checksumValue: input.checksumValue,
        videoDurationMs: 1_000,
        frameCount: 1,
        pixelCount: 320 * 128,
        maxFrameCount: 600,
        maxPixels: 120_000_000,
        frames: [{
          frameIndex: 0,
          capturedAtMs: 0,
          width: 320,
          height: 128,
          contentType: 'image/png',
          bytes: bytes('screen-frame'),
        }],
      }),
    };
    const controlDigest = 'b'.repeat(64);
    const harness = await createHarness(adapterKey, [adapterKey], undefined, registry, { remoteMediaSource }, { deploymentConfigDigest: controlDigest });
    const digestFacts = await harness.pool.query<{ control_digest: string; descriptor_digest: string }>(`
      SELECT v.config_digest AS control_digest, v.capabilities_snapshot->>'descriptorDigest' AS descriptor_digest
      FROM active_control_plane_pointers p
      JOIN routing_policy_targets t ON t.routing_version_id=p.routing_version_id
      JOIN engine_deployment_versions v ON v.id=t.deployment_version_id
      JOIN engine_deployments d ON d.id=v.deployment_id
      WHERE p.environment='development' AND p.workflow_stage='screen_text' AND d.adapter_key=$1
      ORDER BY t.priority LIMIT 1
    `, [adapterKey]);
    expect(digestFacts.rows[0]).toEqual({ control_digest: controlDigest, descriptor_digest: realAdapter!.descriptor.configDigest });
    expect(digestFacts.rows[0]?.control_digest).not.toBe(digestFacts.rows[0]?.descriptor_digest);
    const seeded = await seedProject(harness, ['screen-local-ocr-model.mp4']);
    const created = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 1 });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json().execution.model).toHaveLength(86);
    const persisted = await harness.pool.query<{ model: string; model_length: number; jobs: string }>(`
      SELECT b.model, char_length(b.model)::int AS model_length, count(j.id)::text AS jobs
      FROM screen_text_batches b
      JOIN screen_text_jobs j ON j.batch_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `, [created.json().id]);
    expect(persisted.rows[0]).toMatchObject({ model: realAdapter!.descriptor.model, model_length: 86, jobs: '1' });

    const workerResult = await harness.worker.runOnce();
    expect(workerResult).toMatchObject({ processed: true, outcome: 'completed' });
    const attempt = await harness.pool.query<{ id: string; model: string; model_length: number; status: string; job_status: string }>(`
      SELECT a.id, a.model, char_length(a.model)::int AS model_length, a.status, j.status AS job_status
      FROM screen_text_attempts a
      JOIN screen_text_jobs j ON j.current_attempt_id = a.id
      WHERE j.batch_id = $1
    `, [created.json().id]);
    expect(attempt.rows[0]).toMatchObject({
      model: realAdapter!.descriptor.model,
      model_length: 86,
      status: 'completed',
      job_status: 'review_pending',
    });
    expect((await harness.pool.query<{ config_digest: string }>(
      'SELECT config_digest FROM screen_text_attempts WHERE id=$1', [attempt.rows[0]!.id],
    )).rows[0]?.config_digest).toBe(realAdapter!.descriptor.configDigest);

    const batchId = created.json().id;
    const listed = await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches`,
    });
    expect(listed.statusCode, listed.body).toBe(200);
    const detail = await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}`,
    });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json().execution.configDigest).toBe(realAdapter!.descriptor.configDigest);
    const candidates = await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates`,
    });
    expect(candidates.statusCode, candidates.body).toBe(200);
    expect(candidates.json().total).toBeGreaterThan(0);
    const evidencePath = candidates.json().items[0].evidence.previewPath;
    const evidence = await harness.app.inject({ method: 'GET', url: evidencePath });
    expect(evidence.statusCode, evidence.body).toBe(200);
    expect(evidence.headers['x-content-sha256']).toMatch(/^[0-9a-f]{64}$/);

    const execution = created.json().execution;
    expect(Value.Check(ScreenTextExecutionSchema, { ...execution, model: 'm'.repeat(160) })).toBe(true);
    expect(Value.Check(ScreenTextExecutionSchema, { ...execution, model: 'm'.repeat(161) })).toBe(false);
  });

  it('缺失 route descriptorDigest 时 Worker 在 attempt/外部执行前 fail-closed', async () => {
    const adapterKey = 'screen_text_openvino_ppocrv6_small';
    const transport = new ZeroNetworkLocalOcrSidecarTransport();
    const localRegistry = createLocalOcrAdapterRegistryFromEnv({
      env: {
        QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: 'c'.repeat(64),
        QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true',
        QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT: 'http://127.0.0.1:3100',
        QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS: '5000',
      },
      transportFactory: () => transport,
    });
    const realAdapter = localRegistry?.get(adapterKey);
    expect(realAdapter).toBeDefined();
    const registry = new ScreenTextAdapterRegistry([...adapters(), realAdapter!], adapterKey);
    const harness = await createHarness(adapterKey, [adapterKey], undefined, registry, undefined, { omitDescriptorDigest: true });
    const seeded = await seedProject(harness, ['screen-local-ocr-missing-digest.mp4']);
    const created = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 1 });
    expect(created.statusCode, created.body).toBe(201);
    await expect(harness.worker.runOnce()).rejects.toThrow('SCREEN_TEXT_ROUTING_DESCRIPTOR_DIGEST_INVALID');
    expect(transport.calls).toBe(0);
    const attempts = await harness.pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM screen_text_attempts WHERE job_id=(SELECT id FROM screen_text_jobs WHERE batch_id=$1)',
      [created.json().id],
    );
    expect(attempts.rows[0]?.count).toBe('0');
  });

  it('零网络 screen_text 按全局 priority 从 self-hosted 失败安全前进到 cloud，结构化 unauthorized/unknown 停止', async () => {
    const harness = await createHarness('screen_text_worker_stub', ['screen_text_worker_stub', 'screen_text_cloud_stub']);
    const safe = await seedProject(harness, ['screen-fail-once.mp4']);
    const created = await createBatch(harness, safe);
    expect(created.statusCode, created.body).toBe(201);
    expect((await harness.worker.runOnce()).processed).toBe(true);
    const advanced = (await harness.pool.query(`SELECT a.attempt_number,a.effect_class,a.routing_target_priority,j.status FROM screen_text_attempts a JOIN screen_text_jobs j ON j.id=a.job_id WHERE j.batch_id=$1 ORDER BY a.attempt_number`, [created.json().id])).rows;
    expect(advanced).toMatchObject([{ attempt_number: 1, effect_class: 'external_not_accepted', routing_target_priority: 1, status: 'queued' }]);
    expect((await harness.pool.query('SELECT count(*)::int AS total FROM routing_advance_events WHERE job_id=(SELECT id FROM screen_text_jobs WHERE batch_id=$1)', [created.json().id])).rows[0].total).toBe(1);
    expect((await harness.worker.runOnce()).processed).toBe(true);
    const completed = (await harness.pool.query(`SELECT attempt_number,effect_class,routing_target_priority,adapter FROM screen_text_attempts WHERE job_id=(SELECT id FROM screen_text_jobs WHERE batch_id=$1) ORDER BY attempt_number`, [created.json().id])).rows;
    expect(completed).toMatchObject([
      { attempt_number: 1, effect_class: 'external_not_accepted', routing_target_priority: 1, adapter: 'screen_text_worker_stub' },
      { attempt_number: 2, effect_class: 'completed', routing_target_priority: 2, adapter: 'screen_text_cloud_stub' },
    ]);

    const unauthorized = await seedProject(harness, ['screen-unauthorized.mp4']);
    const denied = await createBatch(harness, unauthorized);
    expect(denied.statusCode, denied.body).toBe(201);
    expect((await harness.worker.runOnce()).processed).toBe(true);
    const deniedAttempts = (await harness.pool.query(`SELECT attempt_number,effect_class FROM screen_text_attempts WHERE job_id=(SELECT id FROM screen_text_jobs WHERE batch_id=$1) ORDER BY attempt_number`, [denied.json().id])).rows;
    expect(deniedAttempts).toEqual([{ attempt_number: 1, effect_class: 'unauthorized' }]);
    expect((await harness.pool.query('SELECT count(*)::int AS total FROM routing_advance_events WHERE job_id=(SELECT id FROM screen_text_jobs WHERE batch_id=$1)', [denied.json().id])).rows[0].total).toBe(0);
  });

  it('screen_text 每个 RoutingTarget 的全局/项目/队列容量在 claim 时生效，不跳过目标', async () => {
    const harness = await createHarness('screen_text_worker_stub', ['screen_text_worker_stub'], { maxConcurrentJobs: 1, perProjectMax: 1, queueLimit: 1 });
    const seeded = await seedProject(harness, ['screen-capacity-1.mp4', 'screen-capacity-2.mp4']);
    const first = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 1 });
    expect(first.statusCode, first.body).toBe(201);
    const route = await harness.pool.query<{ routing_target_id: string }>(`SELECT t.routing_target_id FROM routing_policy_targets t JOIN active_control_plane_pointers p ON p.routing_version_id=t.routing_version_id WHERE p.environment='development' AND p.workflow_stage='screen_text' LIMIT 1`);
    const repository = new ScreenTextWorkerRepository(harness.pool, harness.evidenceStorage);
    const claimed = await repository.claim({ workerId: 'capacity-holder', now: new Date(), leaseExpiresAt: new Date(Date.now() + 60_000) });
    expect(claimed?.routingTargetId).toBe(route.rows[0]!.routing_target_id);
    const second = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 2 });
    expect(second.statusCode, second.body).toBe(201);
    expect(await harness.worker.runOnce()).toMatchObject({ processed: false });
    const secondAttempts = await harness.pool.query<{ count: string }>('SELECT count(*)::text AS count FROM screen_text_attempts WHERE job_id=(SELECT id FROM screen_text_jobs WHERE batch_id=$1)', [second.json().id]);
    expect(secondAttempts.rows[0]!.count).toBe('0');
  });

  it('队列超过 queueLimit 时仍按最早顺位持续排空', async () => {
    const harness = await createHarness('screen_text_worker_stub', ['screen_text_worker_stub'], { maxConcurrentJobs: 1, perProjectMax: 1, queueLimit: 2 });
    const seeded = await seedProject(harness, Array.from({ length: 11 }, (_, index) => `screen-queue-${index + 1}.mp4`));
    const created = await createBatch(harness, seeded, { kind: 'all' });
    expect(created.statusCode, created.body).toBe(201);

    const outcomes = [];
    for (let index = 0; index < 11; index += 1) outcomes.push(await harness.worker.runOnce());
    expect(outcomes.every((outcome) => outcome.processed)).toBe(true);
    const attempts = await harness.pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM screen_text_attempts WHERE job_id IN (SELECT id FROM screen_text_jobs WHERE batch_id=$1)',
      [created.json().id],
    );
    expect(attempts.rows[0]?.count).toBe('11');
  });

  it('screen_text 逐目标 queue/per-project 容量隔离：云目标在途不占本地初始目标额度', async () => {
    const harness = await createHarness('screen_text_worker_stub', ['screen_text_worker_stub', 'screen_text_cloud_stub'], [
      { maxConcurrentJobs: 1, perProjectMax: 1, queueLimit: 1 },
      { maxConcurrentJobs: 1, perProjectMax: 1, queueLimit: 0 },
    ]);
    const advancedSource = await seedProject(harness, ['screen-fail-once-capacity.mp4']);
    const advanced = await createBatch(harness, advancedSource, { kind: 'single', episodeNumber: 1 });
    expect(advanced.statusCode, advanced.body).toBe(201);
    expect((await harness.worker.runOnce()).processed).toBe(true);
    const targetIds = (await harness.pool.query<{ routing_target_id: string; priority: number }>(`SELECT routing_target_id,priority FROM routing_policy_targets WHERE routing_version_id=(SELECT routing_version_id FROM screen_text_jobs WHERE batch_id=$1) ORDER BY priority`, [advanced.json().id])).rows;
    expect(targetIds).toHaveLength(2);

    const repository = new ScreenTextWorkerRepository(harness.pool, harness.evidenceStorage);
    const now = new Date();
    const standbyClaim = await repository.claim({ workerId: 'screen-capacity-standby', now, leaseExpiresAt: new Date(now.getTime() + 60_000) });
    expect(standbyClaim?.routingTargetId).toBe(targetIds[1]!.routing_target_id);
    const localA = await seedProject(harness, ['screen-local-a.mp4']);
    const batchA = await createBatch(harness, localA, { kind: 'single', episodeNumber: 1 });
    expect(batchA.statusCode).toBe(201);
    const claimA = await repository.claim({ workerId: 'screen-capacity-a', now, leaseExpiresAt: new Date(now.getTime() + 60_000) });
    expect(claimA?.routingTargetId).toBe(targetIds[0]!.routing_target_id);
    const localB = await seedProject(harness, ['screen-local-b.mp4']);
    const batchB = await createBatch(harness, localB, { kind: 'single', episodeNumber: 1 });
    expect(batchB.statusCode).toBe(201);
    const claimB = await repository.claim({ workerId: 'screen-capacity-b', now, leaseExpiresAt: new Date(now.getTime() + 60_000) });
    expect(claimB).toBeNull();
    const cloudInFlight = await harness.pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM screen_text_attempts a WHERE a.routing_target_priority=2 AND a.status='running'`);
    expect(cloudInFlight.rows[0]!.count).toBe('1');
  });

  it.each(adapterCases)('%s 走同一正式 API、Registry、Worker、PostgreSQL 与读取链路', async (
    adapterId, kind, deployment, billingUnit, billingQuantity, currency, finalAmount,
  ) => {
    const harness = await createHarness(adapterId);
    const seeded = await seedProject(harness, ['screen-nameplate.mp4']);
    const key = randomUUID();
    const created = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 1 }, key);
    expect(created.statusCode, created.body).toBe(201);
    const replay = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 1 }, key);
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json().id).toBe(created.json().id);
    expect(replay.json().requestId).toBe(created.json().requestId);
    expect(created.json().execution).toMatchObject({ kind, adapter: adapterId, deployment });
    expect(created.json().termProjection).toMatchObject({ includedCount: 1, omittedCount: 0 });
    expect((await harness.worker.runOnce()).processed).toBe(true);
    const read = await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}`,
    });
    expect(read.statusCode, read.body).toBe(200);
    expect(read.json().execution).toMatchObject({ kind, adapter: adapterId, deployment });
    expect(read.json().jobs[0].latestAttempt.execution).toMatchObject({ kind, adapter: adapterId, deployment });
    expect(read.json().jobs[0].latestAttempt.inputDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(read.json().jobs[0].latestAttempt.usage).toMatchObject({
      billingUnit, billingQuantity, currency, finalAmount, reconciliationStatus: 'final',
    });
    expect(read.json().usage).toMatchObject({
      aggregation: 'single', reconciliationStatus: 'final',
      items: [{ provider: read.json().execution.provider, billingUnit, billingQuantity, currency, finalAmount }],
    });
    const serialized = JSON.stringify(read.json());
    expect(serialized).not.toContain('objectKey');
    expect(serialized).not.toContain('secret');
    await harness.pool.query('TRUNCATE project_commands, projects CASCADE');
    await harness.app.close();
    activeHarness = null;
  });

  it('执行 active、最新清单、已校验 screen_video、不可变术语版本与范围冲突门禁', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, ['screen-1.mp4', 'screen-2.mp4', 'screen-3.mp4']);
    await harness.pool.query(`
      INSERT INTO material_manifest_bindings (
        manifest_id,episode_number,role,relative_path,file_name,size_bytes,
        last_modified_ms,fingerprint,media_type
      ) VALUES ($1,4,'company_srt','anonymous/episode-4.srt','episode-4.srt',16,1,'company-4','srt')
    `, [seeded.manifestId]);
    const incompleteAll = await createBatch(harness, seeded, { kind: 'all' });
    expect(incompleteAll.statusCode).toBe(422);
    expect(incompleteAll.json().error.code).toBe('SCREEN_TEXT_VIDEO_NOT_READY');
    expect(Number((await harness.pool.query(
      `SELECT count(*) AS total FROM screen_text_batches WHERE project_id=$1`, [seeded.projectId],
    )).rows[0].total)).toBe(0);
    const selected = await createBatch(harness, seeded, { kind: 'selected', episodeNumbers: [2, 1] });
    expect(selected.statusCode, selected.body).toBe(201);
    expect(selected.json().episodeNumbers).toEqual([1, 2]);
    const overlap = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 2 });
    expect(overlap.statusCode).toBe(409);
    expect(overlap.json().error.code).toBe('SCREEN_TEXT_BATCH_ACTIVE');
    const independent = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 3 });
    expect(independent.statusCode, independent.body).toBe(201);
    const missing = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 4 });
    expect(missing.statusCode).toBe(422);
    expect(missing.json().error.code).toBe('SCREEN_TEXT_VIDEO_NOT_READY');
    await harness.pool.query(`UPDATE projects SET lifecycle_status='recycled' WHERE id=$1`, [seeded.projectId]);
    const recycled = await createBatch(harness, seeded, { kind: 'all' });
    expect(recycled.statusCode).toBe(409);
    expect(recycled.json().error.code).toBe('SCREEN_TEXT_PROJECT_NOT_ACTIVE');
  });

  it('三集矩阵覆盖双轴、人名条、明确空集、失败子集重试、人工事件与不可变发布', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, [
      'screen-dual-screen-nameplate.mp4', 'screen-empty.mp4', 'screen-fail-once.mp4',
    ]);
    const created = await createBatch(harness, seeded);
    expect(created.statusCode, created.body).toBe(201);
    const batchId = created.json().id;
    expect((await harness.worker.runOnce()).processed).toBe(true);
    expect((await harness.worker.runOnce()).processed).toBe(true);
    expect((await harness.worker.runOnce()).processed).toBe(true);
    let detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}`,
    })).json();
    expect(detail.status).toBe('partial');
    expect(detail.jobs.map((job: any) => job.status)).toEqual(['review_pending', 'review_pending', 'failed']);
    expect(detail.jobs[0].stats).toMatchObject({ probedFrameCount: 24, ocrFrameCount: 8, deduplicatedFrameCount: 16 });
    const listed = await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?episodeNumber=1&limit=2&offset=0`,
    });
    expect(listed.statusCode, listed.body).toBe(200);
    expect(listed.json()).toMatchObject({ total: 4, limit: 2, offset: 0 });
    const allCandidates = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?episodeNumber=1`,
    })).json().items;
    const nameplate = allCandidates.find((item: any) => item.category === 'nameplate');
    expect(nameplate.termHits[0]).toMatchObject({ canonicalName: '匿名人物', identityEvidence: ['匿名负责人'] });
    const title = allCandidates.find((item: any) => item.category === 'title');
    const dialogue = allCandidates.find((item: any) => item.suggestionReason === 'dialogue_duplicate');
    const dual = allCandidates.find((item: any) => item.rawText.includes('\n'));
    expect((await decide(harness, seeded.projectId, title, 'approve')).statusCode).toBe(200);
    expect((await decide(harness, seeded.projectId, dialogue, 'reject')).statusCode).toBe(200);
    expect((await decide(harness, seeded.projectId, nameplate, 'approve')).statusCode).toBe(200);
    const split = await decide(harness, seeded.projectId, dual, 'split_left_right', {
      leftText: '左侧文字', rightText: '右侧文字',
    });
    expect(split.statusCode, split.body).toBe(200);
    expect(split.json().createdCandidates).toHaveLength(2);
    expect(split.json().createdCandidates.map((item: any) => item.position)).toEqual(['left', 'right']);
    const invalidPairEdit = await decide(
      harness, seeded.projectId, split.json().createdCandidates[0], 'edit', { position: 'center' },
    );
    expect(invalidPairEdit.statusCode, invalidPairEdit.body).toBe(200);
    detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}`,
    })).json();
    const confirmEmpty = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/episodes/2/confirm-empty`,
      headers: { 'idempotency-key': randomUUID() }, payload: { expectedBatchRevision: detail.revision },
    });
    expect(confirmEmpty.statusCode, confirmEmpty.body).toBe(200);
    const retry = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/retries`,
      headers: { 'idempotency-key': randomUUID() }, payload: { episodeNumbers: [3] },
    });
    expect(retry.statusCode, retry.body).toBe(200);
    expect((await harness.worker.runOnce()).processed).toBe(true);
    const episode3 = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?episodeNumber=3`,
    })).json().items;
    expect((await decide(harness, seeded.projectId, episode3[0], 'approve')).statusCode).toBe(200);
    expect((await decide(harness, seeded.projectId, episode3[1], 'reject')).statusCode).toBe(200);
    detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}`,
    })).json();
    expect(detail.status).toBe('completed');
    expect(detail.jobs[0].candidateCounts.approved).toBe(2);
    expect(detail.jobs[2].latestAttempt.attemptNumber).toBe(2);
    const events = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/events`,
    })).json().items;
    expect(events.map((event: any) => event.action)).toEqual(expect.arrayContaining([
      'approve', 'reject', 'split_left_right', 'confirm_empty',
    ]));
    const invalidPairRelease = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { batchId, expectedBatchRevision: detail.revision },
    });
    expect(invalidPairRelease.statusCode, invalidPairRelease.body).toBe(409);
    expect(invalidPairRelease.json().error.code).toBe('SCREEN_TEXT_PAIR_INVALID');
    const releaseCounts = await harness.pool.query(`
      SELECT (SELECT count(*) FROM screen_text_releases WHERE project_id=$1)::int AS releases,
        (SELECT count(*) FROM screen_text_release_cues cue
          JOIN screen_text_releases release ON release.id=cue.release_id WHERE release.project_id=$1)::int AS cues,
        (SELECT count(*) FROM screen_text_exports export
          JOIN screen_text_releases release ON release.id=export.release_id WHERE release.project_id=$1)::int AS exports
    `, [seeded.projectId]);
    expect(releaseCounts.rows[0]).toEqual({ releases: 0, cues: 0, exports: 0 });
    const repairedPair = await decide(
      harness, seeded.projectId, invalidPairEdit.json().candidate, 'edit', { position: 'left' },
    );
    expect(repairedPair.statusCode, repairedPair.body).toBe(200);
    detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}`,
    })).json();
    const releaseKey = randomUUID();
    const release = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': releaseKey },
      payload: { batchId, expectedBatchRevision: detail.revision },
    });
    expect(release.statusCode, release.body).toBe(201);
    expect(release.json()).toMatchObject({ partial: false, excludedEpisodes: [] });
    const replay = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': releaseKey },
      payload: { batchId, expectedBatchRevision: detail.revision },
    });
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json().id).toBe(release.json().id);
    const episode1Export = release.json().exports.find((item: any) => item.episodeNumber === 1);
    const downloaded = await harness.app.inject({ method: 'GET', url: episode1Export.downloadPath });
    expect(downloaded.statusCode, downloaded.body).toBe(200);
    expect(downloaded.rawPayload.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(downloaded.body).toContain('（左）左侧文字');
    expect(downloaded.body).toContain('（右）右侧文字');
    const immutable = await harness.pool.query(`
      SELECT count(DISTINCT release.id)::int AS releases,count(cue.id)::int AS cues
      FROM screen_text_releases release
      LEFT JOIN screen_text_release_cues cue ON cue.release_id=release.id
      WHERE release.project_id=$1 GROUP BY release.project_id
    `, [seeded.projectId]);
    expect(immutable.rows[0]).toMatchObject({ releases: 1 });
  });

  it('显式部分发布只冻结终态异常集并排除其导出，默认模式仍拒绝且幂等不触发 Worker', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, [
      'screen-normal.mp4', 'screen-nameplate.mp4', 'screen-empty.mp4',
    ]);
    const created = await createBatch(harness, seeded, { kind: 'all' });
    expect(created.statusCode, created.body).toBe(201);
    const batchId = created.json().id;
    for (let index = 0; index < 3; index += 1) expect((await harness.worker.runOnce()).processed).toBe(true);
    const candidates = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?limit=100`,
    })).json().items;
    for (const candidate of candidates) expect((await decide(harness, seeded.projectId, candidate, 'approve')).statusCode).toBe(200);
    let detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}`,
    })).json();
    const empty = detail.jobs.find((job: any) => job.episodeNumber === 3);
    expect(empty.candidateCounts.total).toBe(0);
    const confirmed = await harness.app.inject({
      method: 'POST',
      url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/episodes/3/confirm-empty`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedBatchRevision: detail.revision },
    });
    expect(confirmed.statusCode, confirmed.body).toBe(200);
    detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}`,
    })).json();
    expect(detail.status).toBe('completed');

    const jobs = (await harness.pool.query<{ id: string; episode_number: number; current_attempt_id: string }>(
      'SELECT id,episode_number,current_attempt_id FROM screen_text_jobs WHERE batch_id=$1 ORDER BY episode_number',
      [batchId],
    )).rows;
    const failed = jobs.find((job) => job.episode_number === 2)!;
    const unknown = jobs.find((job) => job.episode_number === 3)!;
    await harness.pool.query(`
      UPDATE screen_text_attempts
      SET status='failed', effect_class='external_not_accepted', error_code='SCREEN_TEXT_TEST_FAILED',
          provider_request_id=NULL, retryable=false, external_side_effect_possible=false,
          completed_at=CURRENT_TIMESTAMP
      WHERE id=$1
    `, [failed.current_attempt_id]);
    await harness.pool.query(`
      UPDATE screen_text_jobs SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=$1
    `, [failed.id]);
    await harness.pool.query(`
      UPDATE screen_text_attempts
      SET status='reconciliation_required', effect_class='external_unknown', error_code='SCREEN_TEXT_TEST_UNKNOWN',
          provider_request_id='screen-text-test-unknown', retryable=false, external_side_effect_possible=true,
          completed_at=CURRENT_TIMESTAMP
      WHERE id=$1
    `, [unknown.current_attempt_id]);
    await harness.pool.query(`
      UPDATE screen_text_jobs SET status='reconciliation_required',updated_at=CURRENT_TIMESTAMP WHERE id=$1
    `, [unknown.id]);

    const defaultRelease = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { batchId, expectedBatchRevision: detail.revision, allowPartial: false },
    });
    expect(defaultRelease.statusCode, defaultRelease.body).toBe(409);
    expect(defaultRelease.json().error.code).toBe('SCREEN_TEXT_RELEASE_BLOCKED');
    expect((await harness.pool.query('SELECT count(*)::int AS count FROM screen_text_releases')).rows[0].count).toBe(0);

    const attemptsBefore = Number((await harness.pool.query(
      'SELECT count(*)::int AS count FROM screen_text_attempts WHERE job_id IN (SELECT id FROM screen_text_jobs WHERE batch_id=$1)',
      [batchId],
    )).rows[0].count);
    const partialKey = randomUUID();
    const partial = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': partialKey },
      payload: { batchId, expectedBatchRevision: detail.revision, allowPartial: true },
    });
    expect(partial.statusCode, partial.body).toBe(201);
    expect(partial.json()).toMatchObject({
      partial: true,
      excludedEpisodes: [
        {
          episodeNumber: 2, jobId: failed.id, status: 'failed', attemptId: failed.current_attempt_id,
          errorCode: 'SCREEN_TEXT_TEST_FAILED', effectClass: 'external_not_accepted', providerRequestId: null,
        },
        {
          episodeNumber: 3, jobId: unknown.id, status: 'reconciliation_required', attemptId: unknown.current_attempt_id,
          errorCode: 'SCREEN_TEXT_TEST_UNKNOWN', effectClass: 'external_unknown', providerRequestId: 'screen-text-test-unknown',
        },
      ],
    });
    expect(partial.json().exports).toHaveLength(1);
    expect(partial.json().exports[0].episodeNumber).toBe(1);
    expect(partial.json().cueCount).toBeGreaterThan(0);

    const replay = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': partialKey },
      payload: { batchId, expectedBatchRevision: detail.revision, allowPartial: true },
    });
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json()).toEqual(partial.json());
    const mismatched = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': partialKey },
      payload: { batchId, expectedBatchRevision: detail.revision, allowPartial: false },
    });
    expect(mismatched.statusCode, mismatched.body).toBe(409);
    expect(mismatched.json().error.code).toBe('SCREEN_TEXT_IDEMPOTENCY_KEY_REUSED');
    expect(Number((await harness.pool.query(
      'SELECT count(*)::int AS count FROM screen_text_attempts WHERE job_id IN (SELECT id FROM screen_text_jobs WHERE batch_id=$1)',
      [batchId],
    )).rows[0].count)).toBe(attemptsBefore);

    await expect(harness.pool.query(
      `UPDATE screen_text_releases SET excluded_episodes='[]'::jsonb WHERE id=$1`, [partial.json().id],
    )).rejects.toThrow();
    const readBack = await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/releases/${partial.json().id}`,
    });
    expect(readBack.statusCode, readBack.body).toBe(200);
    expect(readBack.json().excludedEpisodes).toEqual(partial.json().excludedEpisodes);
  });

  it('完整批次即使请求 allowPartial 也产出完整 Release 标记', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, ['screen-normal.mp4']);
    const created = await createBatch(harness, seeded);
    expect((await harness.worker.runOnce()).processed).toBe(true);
    const candidates = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}/candidates`,
    })).json().items;
    for (const candidate of candidates) expect((await decide(harness, seeded.projectId, candidate, 'approve')).statusCode).toBe(200);
    const detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}`,
    })).json();
    expect(detail.status).toBe('completed');
    const release = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { batchId: created.json().id, expectedBatchRevision: detail.revision, allowPartial: true },
    });
    expect(release.statusCode, release.body).toBe(201);
    expect(release.json()).toMatchObject({ partial: false, excludedEpisodes: [] });
  });

  it('部分发布拒绝全部为终态异常的批次，避免创建空 Release', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, ['screen-normal.mp4']);
    const created = await createBatch(harness, seeded);
    expect((await harness.worker.runOnce()).processed).toBe(true);
    const job = (await harness.pool.query<{ id: string; current_attempt_id: string }>(
      'SELECT id,current_attempt_id FROM screen_text_jobs WHERE batch_id=$1', [created.json().id],
    )).rows[0]!;
    await harness.pool.query(`
      UPDATE screen_text_attempts
      SET status='failed', effect_class='external_not_accepted', error_code='SCREEN_TEXT_TEST_ALL_FAILED',
          retryable=false, external_side_effect_possible=false, completed_at=CURRENT_TIMESTAMP
      WHERE id=$1
    `, [job.current_attempt_id]);
    await harness.pool.query(
      `UPDATE screen_text_jobs SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [job.id],
    );
    const detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}`,
    })).json();
    const release = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { batchId: created.json().id, expectedBatchRevision: detail.revision, allowPartial: true },
    });
    expect(release.statusCode, release.body).toBe(409);
    expect(release.json().error.code).toBe('SCREEN_TEXT_PARTIAL_RELEASE_BLOCKED');
    expect((await harness.pool.query('SELECT count(*)::int AS count FROM screen_text_releases')).rows[0].count).toBe(0);
  });

  it('部分发布拒绝待处理、运行中与 stale 集数', async () => {
    const harness = await createHarness();
    const activeSeed = await seedProject(harness, ['screen-normal.mp4']);
    const active = await createBatch(harness, activeSeed);
    const repository = new ScreenTextWorkerRepository(harness.pool, harness.evidenceStorage);
    expect(await repository.claim({
      workerId: 'partial-release-active-test',
      now: new Date(), leaseExpiresAt: new Date(Date.now() + 30_000),
    })).not.toBeNull();
    const activeRelease = await harness.app.inject({
      method: 'POST', url: `/api/projects/${activeSeed.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { batchId: active.json().id, expectedBatchRevision: active.json().revision, allowPartial: true },
    });
    expect(activeRelease.statusCode).toBe(409);
    expect(activeRelease.json().error.code).toBe('SCREEN_TEXT_PARTIAL_RELEASE_BLOCKED');

    const pendingSeed = await seedProject(harness, ['screen-normal.mp4']);
    const pending = await createBatch(harness, pendingSeed);
    const pendingRelease = await harness.app.inject({
      method: 'POST', url: `/api/projects/${pendingSeed.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { batchId: pending.json().id, expectedBatchRevision: pending.json().revision, allowPartial: true },
    });
    expect(pendingRelease.statusCode).toBe(409);
    expect(pendingRelease.json().error.code).toBe('SCREEN_TEXT_PARTIAL_RELEASE_BLOCKED');

    const staleSeed = await seedProject(harness, ['screen-normal.mp4']);
    const stale = await createBatch(harness, staleSeed);
    await harness.pool.query("UPDATE screen_text_batches SET status='stale' WHERE id=$1", [stale.json().id]);
    const staleRelease = await harness.app.inject({
      method: 'POST', url: `/api/projects/${staleSeed.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { batchId: stale.json().id, expectedBatchRevision: stale.json().revision, allowPartial: true },
    });
    expect(staleRelease.statusCode).toBe(409);
    expect(staleRelease.json().error.code).toBe('SCREEN_TEXT_BATCH_STALE');
  });

  it('截图与短时视频授权可读且不泄露对象键，条件版本冲突稳定', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, ['screen-normal.mp4']);
    const created = await createBatch(harness, seeded);
    await harness.worker.runOnce();
    const candidates = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}/candidates`,
    })).json().items;
    const evidence = await harness.app.inject({ method: 'GET', url: candidates[0].evidence.previewPath });
    expect(evidence.statusCode, evidence.body).toBe(200);
    expect(evidence.headers['content-type']).toContain('image/svg+xml');
    expect(evidence.headers['x-content-sha256']).toBe(candidates[0].evidence.evidenceDigest);
    expect(digest(evidence.rawPayload)).toBe(candidates[0].evidence.evidenceDigest);
    expect(evidence.body).toContain('screen-text-evidence');
    expect(evidence.body).not.toContain('zero-network');
    const otherProject = await seedProject(harness, ['screen-other.mp4']);
    const crossProjectEvidence = await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${otherProject.projectId}/screen-text/candidates/${candidates[0].id}/evidence`,
    });
    expect(crossProjectEvidence.statusCode).toBe(404);
    expect(crossProjectEvidence.body).not.toContain('objectKey');
    const internalEvidence = await harness.pool.query<any>(
      `SELECT evidence FROM screen_text_candidates WHERE id=$1`, [candidates[0].id],
    );
    await harness.evidenceStorage.deleteObject(internalEvidence.rows[0].evidence.objectKey);
    const missingEvidence = await harness.app.inject({ method: 'GET', url: candidates[0].evidence.previewPath });
    expect(missingEvidence.statusCode).toBe(409);
    expect(missingEvidence.json().error.code).toBe('SCREEN_TEXT_EVIDENCE_NOT_AVAILABLE');
    expect(missingEvidence.body).not.toContain(internalEvidence.rows[0].evidence.objectKey);
    const conflict = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/candidates/${candidates[0].id}/playback`,
      payload: { expectedBatchRevision: created.json().revision + 1 },
    });
    expect(conflict.statusCode).toBe(409);
    const grant = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/candidates/${candidates[0].id}/playback`,
      payload: { expectedBatchRevision: created.json().revision },
    });
    expect(grant.statusCode, grant.body).toBe(201);
    expect(JSON.stringify(grant.json())).not.toContain('object_key');
    const playback = await harness.app.inject({ method: 'GET', url: grant.json().url });
    expect(playback.statusCode, playback.body).toBe(200);
    expect(playback.rawPayload).toEqual(Buffer.from('anonymous-video-1'));
  });

  it('租约接管、取消结果落账、未知结果和来源 stale 均由 PostgreSQL 恢复', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, ['screen-reconcile.mp4']);
    const created = await createBatch(harness, seeded);
    expect((await harness.worker.runOnce()).outcome).toBe('reconciliation_required');
    let detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}`,
    })).json();
    expect(detail.status).toBe('reconciliation_required');
    expect(detail.usage.reconciliationStatus).toBe('pending');
    expect(detail.jobs[0].latestAttempt).toMatchObject({ receipt: 'unknown', retryable: false });
    const reconciliationCounts = await harness.pool.query(`
      SELECT (SELECT count(*) FROM screen_text_attempts)::int AS attempts,
        (SELECT count(*) FROM screen_text_commands WHERE command_kind='retry_batch')::int AS commands
    `);
    const unsafeRetry = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}/retries`,
      headers: { 'idempotency-key': randomUUID() }, payload: { episodeNumbers: [1] },
    });
    expect(unsafeRetry.statusCode).toBe(422);
    expect(unsafeRetry.json().error.code).toBe('SCREEN_TEXT_RETRY_INVALID');
    expect((await harness.pool.query(`
      SELECT (SELECT count(*) FROM screen_text_attempts)::int AS attempts,
        (SELECT count(*) FROM screen_text_commands WHERE command_kind='retry_batch')::int AS commands
    `)).rows[0]).toEqual(reconciliationCounts.rows[0]);

    await harness.pool.query('TRUNCATE project_commands, projects CASCADE');
    const takeoverSeed = await seedProject(harness, ['screen-normal.mp4']);
    const takeoverBatch = await createBatch(harness, takeoverSeed);
    const repository = new ScreenTextWorkerRepository(harness.pool, harness.evidenceStorage);
    const start = new Date('2026-08-15T00:00:00.000Z');
    const first = await repository.claim({ workerId: 'worker-a', now: start, leaseExpiresAt: new Date(start.getTime() + 1_000) });
    expect(first).not.toBeNull();
    const second = await repository.claim({
      workerId: 'worker-b', now: new Date(start.getTime() + 2_000),
      leaseExpiresAt: new Date(start.getTime() + 32_000),
    });
    expect(second?.attemptNumber).toBe(2);
    const expired = await harness.pool.query(`SELECT status,error_code FROM screen_text_attempts WHERE id=$1`, [first!.attemptId]);
    expect(expired.rows[0]).toMatchObject({ status: 'failed', error_code: 'LEASE_EXPIRED' });
    const adapter = harness.registry.resolve(second!.descriptor);
    const outcome = await adapter.execute({
      batchId: second!.batchId, jobId: second!.jobId, episodeNumber: second!.episodeNumber,
      attemptNumber: second!.attemptNumber, asset: second!.asset,
      termProjectionDigest: second!.termProjectionDigest, termEntries: second!.termEntries,
      frameStrategyVersion: second!.frameStrategyVersion, dedupeStrategyVersion: second!.dedupeStrategyVersion,
    });
    const cancelled = await harness.app.inject({
      method: 'POST', url: `/api/projects/${takeoverSeed.projectId}/screen-text/batches/${takeoverBatch.json().id}/cancel`,
      headers: { 'idempotency-key': randomUUID() }, payload: {},
    });
    expect(cancelled.statusCode, cancelled.body).toBe(200);
    await repository.finish(second!, outcome, new Date(start.getTime() + 3_000));
    detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${takeoverSeed.projectId}/screen-text/batches/${takeoverBatch.json().id}`,
    })).json();
    expect(detail.status).toBe('cancelled');
    expect(detail.jobs[0].latestAttempt).toMatchObject({ status: 'cancelled', receipt: 'simulated' });
    expect(detail.jobs[0].latestAttempt.usage).not.toBeNull();

    await harness.pool.query('TRUNCATE project_commands, projects CASCADE');
    const cancelUnknownSeed = await seedProject(harness, ['screen-reconcile.mp4']);
    const cancelUnknownBatch = await createBatch(harness, cancelUnknownSeed);
    const unknownRepository = new ScreenTextWorkerRepository(harness.pool, harness.evidenceStorage);
    const unknownClaim = await unknownRepository.claim({
      workerId: 'worker-unknown', now: start, leaseExpiresAt: new Date(start.getTime() + 30_000),
    });
    const unknownAdapter = harness.registry.resolve(unknownClaim!.descriptor);
    const unknownOutcome = await unknownAdapter.execute({
      batchId: unknownClaim!.batchId, jobId: unknownClaim!.jobId,
      episodeNumber: unknownClaim!.episodeNumber, attemptNumber: unknownClaim!.attemptNumber,
      asset: unknownClaim!.asset, termProjectionDigest: unknownClaim!.termProjectionDigest,
      termEntries: unknownClaim!.termEntries, frameStrategyVersion: unknownClaim!.frameStrategyVersion,
      dedupeStrategyVersion: unknownClaim!.dedupeStrategyVersion,
    });
    const cancelUnknown = await harness.app.inject({
      method: 'POST',
      url: `/api/projects/${cancelUnknownSeed.projectId}/screen-text/batches/${cancelUnknownBatch.json().id}/cancel`,
      headers: { 'idempotency-key': randomUUID() }, payload: {},
    });
    expect(cancelUnknown.statusCode, cancelUnknown.body).toBe(200);
    await unknownRepository.finish(unknownClaim!, unknownOutcome, new Date(start.getTime() + 1_000));
    detail = (await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${cancelUnknownSeed.projectId}/screen-text/batches/${cancelUnknownBatch.json().id}`,
    })).json();
    expect(detail.status).toBe('reconciliation_required');
    expect(detail.jobs[0].latestAttempt).toMatchObject({ status: 'reconciliation_required', receipt: 'unknown' });
    expect((await harness.worker.runOnce()).processed).toBe(false);
    expect(Number((await harness.pool.query(`SELECT count(*) AS total FROM screen_text_attempts`)).rows[0].total)).toBe(1);

    const newManifestId = randomUUID();
    await harness.pool.query(`
      INSERT INTO material_manifests (id,project_id,version,root_name,created_by)
      VALUES ($1,$2,2,'changed','test')
    `, [newManifestId, cancelUnknownSeed.projectId]);
    detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${cancelUnknownSeed.projectId}/screen-text/batches/${cancelUnknownBatch.json().id}`,
    })).json();
    expect(detail.status).toBe('stale');
  });

  it('最新术语版本变化使旧批次只读，普通写入与发布保持零副作用', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, ['screen-normal.mp4']);
    const created = await createBatch(harness, seeded);
    await harness.worker.runOnce();
    const candidates = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}/candidates`,
    })).json().items;
    const latestTermVersionId = await addTermVersion(harness, seeded.projectId);
    const stale = await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}`,
    });
    expect(stale.statusCode, stale.body).toBe(200);
    expect(stale.json().status).toBe('stale');
    const before = (await harness.pool.query(`
      SELECT (SELECT count(*) FROM screen_text_decision_events)::int AS events,
        (SELECT count(*) FROM screen_text_commands)::int AS commands,
        (SELECT count(*) FROM screen_text_releases)::int AS releases
    `)).rows[0];
    const write = await decide(harness, seeded.projectId, candidates[0], 'approve');
    expect(write.statusCode).toBe(409);
    expect(write.json().error.code).toBe('SCREEN_TEXT_BATCH_STALE');
    const release = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { batchId: created.json().id, expectedBatchRevision: stale.json().revision },
    });
    expect(release.statusCode).toBe(409);
    expect((await harness.pool.query(`
      SELECT (SELECT count(*) FROM screen_text_decision_events)::int AS events,
        (SELECT count(*) FROM screen_text_commands)::int AS commands,
        (SELECT count(*) FROM screen_text_releases)::int AS releases
    `)).rows[0]).toEqual(before);
    const obsoleteCreate = await createBatch(
      harness, { ...seeded, termVersionId: seeded.termVersionId }, { kind: 'single', episodeNumber: 1 },
    );
    expect(obsoleteCreate.statusCode).toBe(422);
    expect(obsoleteCreate.json().error.code).toBe('SCREEN_TEXT_TERM_VERSION_NOT_LATEST');
    const latestCreate = await createBatch(
      harness, { ...seeded, termVersionId: latestTermVersionId }, { kind: 'single', episodeNumber: 1 },
    );
    expect(latestCreate.statusCode, latestCreate.body).toBe(201);
  });

  it('仅放行 external=false 的腾讯媒体历史失败码，并保持重试幂等与原 job attempt 链', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, [
      'screen-always-fail-history.mp4',
      'screen-always-fail-external.mp4',
      'screen-always-fail-nonretryable.mp4',
      'screen-normal-completed.mp4',
    ]);
    const created = await createBatch(harness, seeded);
    for (let index = 0; index < 4; index += 1) expect((await harness.worker.runOnce()).processed).toBe(true);
    await harness.pool.query(`
      UPDATE screen_text_attempts attempt SET
        error_code = CASE job.episode_number
          WHEN 1 THEN 'SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE'
          WHEN 2 THEN 'SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE'
          WHEN 3 THEN 'SCREEN_TEXT_PROVIDER_UNAUTHORIZED'
          ELSE attempt.error_code
        END,
        retryable = false,
        external_side_effect_possible = (job.episode_number = 2)
      FROM screen_text_jobs job
      WHERE attempt.id=job.current_attempt_id AND job.batch_id=$1 AND job.episode_number <= 3
    `, [created.json().id]);
    await harness.pool.query(`
      UPDATE screen_text_jobs SET status='completed',updated_at=CURRENT_TIMESTAMP
      WHERE batch_id=$1 AND episode_number=4
    `, [created.json().id]);
    const originalJob = (await harness.pool.query(`
      SELECT id,current_attempt_id FROM screen_text_jobs WHERE batch_id=$1 AND episode_number=1
    `, [created.json().id])).rows[0];
    const retryKey = randomUUID();
    const retry = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}/retries`,
      headers: { 'idempotency-key': retryKey }, payload: { episodeNumbers: [1] },
    });
    expect(retry.statusCode, retry.body).toBe(200);
    const replay = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}/retries`,
      headers: { 'idempotency-key': retryKey }, payload: { episodeNumbers: [1] },
    });
    expect(replay.statusCode, replay.body).toBe(200);
    expect((await harness.pool.query(`
      SELECT count(*)::int AS total FROM screen_text_commands
      WHERE command_kind='retry_batch' AND idempotency_key=$1
    `, [retryKey])).rows[0].total).toBe(1);

    for (const episodeNumber of [2, 3, 4]) {
      const blocked = await harness.app.inject({
        method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}/retries`,
        headers: { 'idempotency-key': randomUUID() }, payload: { episodeNumbers: [episodeNumber] },
      });
      expect(blocked.statusCode, blocked.body).toBe(422);
      expect(blocked.json().error.code).toBe('SCREEN_TEXT_RETRY_INVALID');
    }
    expect((await harness.pool.query(`
      SELECT count(*)::int AS total FROM screen_text_commands WHERE command_kind='retry_batch'
    `)).rows[0].total).toBe(1);

    expect((await harness.worker.runOnce()).processed).toBe(true);
    const retried = (await harness.pool.query(`
      SELECT job.id,job.current_attempt_id,count(attempt.id)::int AS attempts,max(attempt.attempt_number)::int AS latest_attempt
      FROM screen_text_jobs job
      JOIN screen_text_attempts attempt ON attempt.job_id=job.id
      WHERE job.batch_id=$1 AND job.episode_number=1
      GROUP BY job.id,job.current_attempt_id
    `, [created.json().id])).rows[0];
    expect(retried).toMatchObject({ id: originalJob.id, attempts: 2, latest_attempt: 2 });
    expect(retried.current_attempt_id).not.toBe(originalJob.current_attempt_id);
  });

  it('异构 Attempt Usage 按单位与币种拆分，不做无意义跨单位求和', async () => {
    const harness = await createHarness('screen_text_cloud_stub');
    const seeded = await seedProject(harness, ['screen-fail-once.mp4']);
    const created = await createBatch(harness, seeded);
    await harness.worker.runOnce();
    const retry = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}/retries`,
      headers: { 'idempotency-key': randomUUID() }, payload: { episodeNumbers: [1] },
    });
    expect(retry.statusCode, retry.body).toBe(200);
    await harness.worker.runOnce();
    await harness.pool.query(`
      UPDATE screen_text_attempts SET usage=jsonb_build_object(
        'provider','historical_stub','billingUnit','compute_millisecond','billingQuantity',40,
        'currency','CNY','estimatedAmount','0.01','finalAmount','0.01',
        'reconciliationStatus','final','providerRequestId',NULL
      ) WHERE job_id=(SELECT id FROM screen_text_jobs WHERE batch_id=$1)
        AND attempt_number=1
    `, [created.json().id]);
    const detail = await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}`,
    });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json().usage).toMatchObject({ aggregation: 'split', reconciliationStatus: 'final' });
    expect(detail.json().usage.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        provider: 'cloud_stub', billingUnit: 'image', billingQuantity: 8,
        currency: 'USD', finalAmount: '0.08',
      }),
      expect.objectContaining({
        provider: 'historical_stub', billingUnit: 'compute_millisecond', billingQuantity: 40,
        currency: 'CNY', finalAmount: '0.01',
      }),
    ]));
    expect(detail.json().usage).not.toHaveProperty('billingQuantity');
  });

  it('空结果可只重试、候选支持条件版本与幂等驳回恢复编辑，stale 后写入零副作用', async () => {
    const harness = await createHarness();
    const emptySeed = await seedProject(harness, ['screen-empty.mp4']);
    const emptyBatch = await createBatch(harness, emptySeed);
    await harness.worker.runOnce();
    const blockedRelease = await harness.app.inject({
      method: 'POST', url: `/api/projects/${emptySeed.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { batchId: emptyBatch.json().id, expectedBatchRevision: emptyBatch.json().revision },
    });
    expect(blockedRelease.statusCode).toBe(409);
    expect((await harness.pool.query(`SELECT count(*)::int AS total FROM screen_text_releases`)).rows[0].total).toBe(0);
    const retryEmpty = await harness.app.inject({
      method: 'POST', url: `/api/projects/${emptySeed.projectId}/screen-text/batches/${emptyBatch.json().id}/retries`,
      headers: { 'idempotency-key': randomUUID() }, payload: { episodeNumbers: [1] },
    });
    expect(retryEmpty.statusCode, retryEmpty.body).toBe(200);
    await harness.worker.runOnce();
    let emptyDetail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${emptySeed.projectId}/screen-text/batches/${emptyBatch.json().id}`,
    })).json();
    expect(emptyDetail.jobs[0].latestAttempt.attemptNumber).toBe(2);
    const confirmed = await harness.app.inject({
      method: 'POST', url: `/api/projects/${emptySeed.projectId}/screen-text/batches/${emptyBatch.json().id}/episodes/1/confirm-empty`,
      headers: { 'idempotency-key': randomUUID() }, payload: { expectedBatchRevision: emptyDetail.revision },
    });
    expect(confirmed.statusCode, confirmed.body).toBe(200);

    await harness.pool.query('TRUNCATE project_commands, projects CASCADE');
    const seeded = await seedProject(harness, ['screen-nameplate.mp4']);
    const created = await createBatch(harness, seeded);
    await harness.worker.runOnce();
    const batchId = created.json().id;
    let candidates = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates`,
    })).json().items;
    const title = candidates.find((item: any) => item.category === 'title');
    const decisionKey = randomUUID();
    const reject = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/candidates/${title.id}/decisions`,
      headers: { 'idempotency-key': decisionKey }, payload: { action: 'reject', expectedRevision: title.revision },
    });
    expect(reject.statusCode, reject.body).toBe(200);
    const replay = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/candidates/${title.id}/decisions`,
      headers: { 'idempotency-key': decisionKey }, payload: { action: 'reject', expectedRevision: title.revision },
    });
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json().candidate).toEqual(reject.json().candidate);
    const rejectedEdit = await decide(harness, seeded.projectId, reject.json().candidate, 'edit', {
      text: '不得直接改写已忽略候选', startMs: 1_200, endMs: 2_800,
    });
    expect(rejectedEdit.statusCode, rejectedEdit.body).toBe(422);
    expect(rejectedEdit.json().error.code).toBe('SCREEN_TEXT_DECISION_INVALID');
    const staleRevision = await decide(harness, seeded.projectId, title, 'restore');
    expect(staleRevision.statusCode).toBe(409);
    const restored = await decide(harness, seeded.projectId, reject.json().candidate, 'restore');
    expect(restored.statusCode, restored.body).toBe(200);
    const edited = await decide(harness, seeded.projectId, restored.json().candidate, 'edit', {
      text: '匿名修订标题', startMs: 1_200, endMs: 2_800,
    });
    expect(edited.statusCode, edited.body).toBe(200);
    expect(edited.json().candidate).toMatchObject({ status: 'edited', text: '匿名修订标题' });
    const editEvent = (await harness.pool.query<any>(`
      SELECT before_state, after_state FROM screen_text_decision_events
      WHERE candidate_id=$1 AND action='edit' ORDER BY id DESC LIMIT 1
    `, [title.id])).rows[0];
    expect(editEvent.before_state).toMatchObject({
      id: title.id, status: 'pending', revision: restored.json().candidate.revision,
      evidence: expect.objectContaining({ objectKey: expect.any(String), checksum: expect.any(String), capturedAtMs: expect.any(Number) }),
      systemSuggestion: 'approve', suggestionReason: null,
    });
    expect(editEvent.after_state.candidate).toMatchObject({
      id: title.id, status: 'edited', revision: edited.json().candidate.revision,
      evidence: expect.objectContaining({ objectKey: expect.any(String), checksum: expect.any(String), capturedAtMs: expect.any(Number) }),
    });
    candidates = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates`,
    })).json().items;
    const nameplate = candidates.find((item: any) => item.category === 'nameplate');
    const inventedIdentity = await decide(harness, seeded.projectId, nameplate, 'edit', {
      text: '匿名人物\n臆造身份',
    });
    expect(inventedIdentity.statusCode).toBe(422);
    expect(inventedIdentity.json().error.code).toBe('SCREEN_TEXT_DECISION_INVALID');
    const provenIdentity = await decide(harness, seeded.projectId, nameplate, 'edit', {
      text: '匿名人物\n匿名负责人',
    });
    expect(provenIdentity.statusCode, provenIdentity.body).toBe(200);
    expect(provenIdentity.json().candidate.text).toBe('匿名人物\n匿名负责人');
    const detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}`,
    })).json();
    const manual = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/episodes/1/candidates`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { text: '人工画面字', startMs: 20_000, endMs: 22_000, category: 'message', position: 'right', evidenceCapturedAtMs: 20_000 },
    });
    expect(manual.statusCode, manual.body).toBe(201);
    const manualEvent = (await harness.pool.query<any>(`
      SELECT after_state FROM screen_text_decision_events
      WHERE candidate_id=$1 AND action='manual_add' ORDER BY id DESC LIMIT 1
    `, [manual.json().id])).rows[0];
    expect(manualEvent.after_state.candidate).toMatchObject({
      id: manual.json().id, source: 'manual', status: 'edited', revision: 1,
      evidence: expect.objectContaining({ objectKey: expect.any(String), checksum: expect.any(String), capturedAtMs: 20_000 }),
    });
    const invalidManual = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/episodes/1/candidates`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { text: '越界', startMs: 59_000, endMs: 61_000, category: 'other', position: 'center', evidenceCapturedAtMs: 59_000 },
    });
    expect(invalidManual.statusCode).toBe(422);
    const eventCount = Number((await harness.pool.query(
      `SELECT count(*) AS total FROM screen_text_decision_events WHERE batch_id=$1`, [batchId],
    )).rows[0].total);
    const nextManifestId = randomUUID();
    await harness.pool.query(`
      INSERT INTO material_manifests (id,project_id,version,root_name,created_by)
      VALUES ($1,$2,2,'changed','test')
    `, [nextManifestId, seeded.projectId]);
    candidates = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates`,
    })).json().items;
    const staleWrite = await decide(harness, seeded.projectId, candidates.find((item: any) => item.status === 'pending'), 'approve');
    expect(staleWrite.statusCode).toBe(409);
    expect(staleWrite.json().error.code).toBe('SCREEN_TEXT_BATCH_STALE');
    expect(Number((await harness.pool.query(
      `SELECT count(*) AS total FROM screen_text_decision_events WHERE batch_id=$1`, [batchId],
    )).rows[0].total)).toBe(eventCount);
    expect(detail.execution.kind).toBe('deterministic_fake');
  });

  it('批次列表支持服务端筛选、标识搜索、稳定排序分页与空页真实总数', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, ['screen-normal.mp4', 'screen-nameplate.mp4']);
    const first = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 1 });
    expect(first.statusCode, first.body).toBe(201);
    await harness.worker.runOnce();
    const second = await createBatch(harness, seeded, { kind: 'single', episodeNumber: 2 });
    expect(second.statusCode, second.body).toBe(201);
    await harness.pool.query(`
      UPDATE screen_text_batches SET created_at='2026-01-01T00:00:00Z', updated_at='2026-01-02T00:00:00Z'
      WHERE id = ANY($1::uuid[])
    `, [[first.json().id, second.json().id]]);

    const listed = await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/batches?sort=updated_desc&limit=1&offset=0`,
    });
    expect(listed.statusCode, listed.body).toBe(200);
    expect(listed.json()).toMatchObject({ total: 2, limit: 1, offset: 0 });
    expect(listed.json().items[0]).not.toHaveProperty('jobs');
    expect(listed.json().items[0]).toMatchObject({
      termVersionId: seeded.termVersionId, termVersion: 1,
      manifestId: seeded.manifestId, manifestVersion: 1,
    });
    const nextPage = await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/batches?sort=updated_desc&limit=1&offset=1`,
    });
    const expectedIds = [first.json().id, second.json().id].sort().reverse();
    expect([listed.json().items[0].id, nextPage.json().items[0].id]).toEqual(expectedIds);

    const reviewPending = await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/batches?status=review_pending`,
    });
    expect(reviewPending.json()).toMatchObject({ total: 1 });
    expect(reviewPending.json().items[0].id).toBe(first.json().id);
    const byId = await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/batches?search=${first.json().id.slice(0, 12)}`,
    });
    expect(byId.json().items.map((item: any) => item.id)).toEqual([first.json().id]);
    const byRequest = await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/batches?search=${encodeURIComponent(second.json().requestId)}`,
    });
    expect(byRequest.json().items.map((item: any) => item.id)).toEqual([second.json().id]);
    const emptyPage = await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches?limit=1&offset=99`,
    });
    expect(emptyPage.json()).toMatchObject({ items: [], total: 2, limit: 1, offset: 99 });
  });

  it('候选四种排序在并列值和跨页场景保持确定性，未知查询字段与排序被拒绝', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, ['screen-dual-screen-nameplate.mp4']);
    const created = await createBatch(harness, seeded);
    await harness.worker.runOnce();
    const batchId = created.json().id;
    await harness.pool.query(
      `UPDATE screen_text_candidates SET confidence=0.8 WHERE batch_id=$1`, [batchId],
    );
    const initial = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?limit=100`,
    })).json().items;
    const rejectedSource = initial.find((item: any) => item.category !== 'nameplate');
    expect((await decide(harness, seeded.projectId, rejectedSource, 'reject')).statusCode).toBe(200);

    const timeThenId = (left: any, right: any) => left.episodeNumber - right.episodeNumber
      || left.startMs - right.startMs || left.endMs - right.endMs || left.id.localeCompare(right.id);
    const expected = (items: any[], sort: string) => [...items].sort((left, right) => {
      if (sort === 'identity_first') {
        const category = Number(left.category !== 'nameplate') - Number(right.category !== 'nameplate');
        return category || timeThenId(left, right);
      }
      if (sort === 'confidence_desc') {
        return (right.confidence ?? -1) - (left.confidence ?? -1) || timeThenId(left, right);
      }
      if (sort === 'pending_first') {
        const status = Number(left.status !== 'pending') - Number(right.status !== 'pending');
        return status || timeThenId(left, right);
      }
      return timeThenId(left, right);
    });
    for (const sort of ['identity_first', 'time_asc', 'confidence_desc', 'pending_first']) {
      const full = await harness.app.inject({
        method: 'GET',
        url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?sort=${sort}&limit=100`,
      });
      expect(full.statusCode, full.body).toBe(200);
      expect(full.json().items.map((item: any) => item.id)).toEqual(
        expected(full.json().items, sort).map((item) => item.id),
      );
      const pagedIds: string[] = [];
      for (let offset = 0; offset < full.json().total; offset += 2) {
        const page = await harness.app.inject({
          method: 'GET',
          url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?sort=${sort}&limit=2&offset=${offset}`,
        });
        pagedIds.push(...page.json().items.map((item: any) => item.id));
      }
      expect(pagedIds).toEqual(full.json().items.map((item: any) => item.id));
      expect(new Set(pagedIds).size).toBe(full.json().total);
    }
    expect((await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?sort=unknown`,
    })).statusCode).toBe(400);
    expect((await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?unexpected=true`,
    })).statusCode).toBe(400);
  });

  it('Release 列表只恢复既有不可变版本与 Export，搜索分页读取不产生业务事实', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, ['screen-normal.mp4', 'screen-nameplate.mp4']);
    const releases: any[] = [];
    for (const episodeNumber of [1, 2]) {
      const created = await createBatch(harness, seeded, { kind: 'single', episodeNumber });
      expect(created.statusCode, created.body).toBe(201);
      await harness.worker.runOnce();
      const candidates = (await harness.app.inject({
        method: 'GET',
        url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}/candidates?limit=100`,
      })).json().items;
      for (const candidate of candidates) {
        expect((await decide(harness, seeded.projectId, candidate, 'approve')).statusCode).toBe(200);
      }
      const detail = (await harness.app.inject({
        method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${created.json().id}`,
      })).json();
      expect(detail.status).toBe('completed');
      const released = await harness.app.inject({
        method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
        headers: { 'idempotency-key': randomUUID() },
        payload: { batchId: detail.id, expectedBatchRevision: detail.revision },
      });
      expect(released.statusCode, released.body).toBe(201);
      releases.push(released.json());
    }
    const exportBytes = new Map<string, Buffer>();
    for (const release of releases) {
      for (const item of release.exports) {
        const download = await harness.app.inject({ method: 'GET', url: item.downloadPath });
        expect(download.statusCode).toBe(200);
        exportBytes.set(item.id, download.rawPayload);
      }
    }
    const countFacts = async () => (await harness.pool.query(`
      SELECT (SELECT count(*) FROM screen_text_releases WHERE project_id=$1)::int AS releases,
        (SELECT count(*) FROM screen_text_release_cues cue JOIN screen_text_releases release
          ON release.id=cue.release_id WHERE release.project_id=$1)::int AS cues,
        (SELECT count(*) FROM screen_text_exports export JOIN screen_text_releases release
          ON release.id=export.release_id WHERE release.project_id=$1)::int AS exports,
        (SELECT count(*) FROM screen_text_commands command WHERE command.project_id=$1)::int AS commands
    `, [seeded.projectId])).rows[0];
    const before = await countFacts();
    await addTermVersion(harness, seeded.projectId);
    const list = await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/releases?sort=version_desc&limit=1&offset=0`,
    });
    expect(list.statusCode, list.body).toBe(200);
    expect(list.json()).toMatchObject({ total: 2, limit: 1, offset: 0 });
    expect(list.json().items[0].version).toBe(2);
    const next = await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/releases?sort=version_desc&limit=1&offset=1`,
    });
    expect(next.json().items[0].version).toBe(1);
    const emptyPage = await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/releases?limit=1&offset=99`,
    });
    expect(emptyPage.json()).toMatchObject({ items: [], total: 2, limit: 1, offset: 99 });
    for (const search of [String(releases[0].version), releases[0].batchId, releases[0].exports[0].filename]) {
      const found = await harness.app.inject({
        method: 'GET',
        url: `/api/projects/${seeded.projectId}/screen-text/releases?search=${encodeURIComponent(search)}&sort=created_desc`,
      });
      expect(found.statusCode, found.body).toBe(200);
      expect(found.json().items.some((item: any) => item.id === releases[0].id)).toBe(true);
    }
    const refreshed = await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/releases?limit=100`,
    });
    for (const release of refreshed.json().items) {
      for (const item of release.exports) {
        expect(exportBytes.has(item.id)).toBe(true);
        const download = await harness.app.inject({ method: 'GET', url: item.downloadPath });
        expect(download.rawPayload).toEqual(exportBytes.get(item.id));
      }
    }
    expect(await countFacts()).toEqual(before);
  });

  it('未拆分左右父候选只允许忽略或拆分，非法决定零副作用且子候选可正常发布', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness, ['screen-dual-1.mp4', 'screen-dual-2.mp4']);
    const created = await createBatch(harness, seeded);
    expect(created.statusCode, created.body).toBe(201);
    await harness.worker.runOnce();
    await harness.worker.runOnce();
    const batchId = created.json().id;
    let candidates = (await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?limit=100`,
    })).json().items;
    const parents = candidates.filter((item: any) =>
      item.source === 'ocr' && item.pairGroupId !== null && item.position === 'full');
    expect(parents).toHaveLength(2);
    const [ignoredParent, splitParent] = parents;
    await harness.pool.query(
      `UPDATE screen_text_candidates SET raw_text='匿名同屏父候选' WHERE id=$1`, [splitParent.id],
    );

    const approveKey = randomUUID();
    const editKey = randomUUID();
    const facts = async () => {
      const candidate = (await harness.pool.query(
        `SELECT status,revision,text FROM screen_text_candidates WHERE id=$1`, [ignoredParent.id],
      )).rows[0];
      const batch = (await harness.app.inject({
        method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}`,
      })).json();
      const sideEffects = (await harness.pool.query(`
        SELECT
          (SELECT count(*) FROM screen_text_decision_events WHERE candidate_id=$1)::int AS events,
          (SELECT count(*) FROM screen_text_commands
            WHERE project_id=$2 AND command_kind='candidate_decision'
              AND idempotency_key = ANY($3::text[]))::int AS commands
      `, [ignoredParent.id, seeded.projectId, [approveKey, editKey]])).rows[0];
      return {
        candidate,
        batch: { status: batch.status, revision: batch.revision, counts: batch.counts },
        sideEffects,
      };
    };
    const before = await facts();
    const invalidApprove = await harness.app.inject({
      method: 'POST',
      url: `/api/projects/${seeded.projectId}/screen-text/candidates/${ignoredParent.id}/decisions`,
      headers: { 'idempotency-key': approveKey },
      payload: { action: 'approve', expectedRevision: ignoredParent.revision },
    });
    expect(invalidApprove.statusCode, invalidApprove.body).toBe(422);
    expect(invalidApprove.json().error).toMatchObject({
      code: 'SCREEN_TEXT_DECISION_INVALID', retryable: false,
      message: '未拆分的左右同屏候选只能忽略或先拆分。',
    });
    const invalidEdit = await harness.app.inject({
      method: 'POST',
      url: `/api/projects/${seeded.projectId}/screen-text/candidates/${ignoredParent.id}/decisions`,
      headers: { 'idempotency-key': editKey },
      payload: { action: 'edit', expectedRevision: ignoredParent.revision, text: '不应保存' },
    });
    expect(invalidEdit.statusCode, invalidEdit.body).toBe(422);
    expect(invalidEdit.json().error).toMatchObject({
      code: 'SCREEN_TEXT_DECISION_INVALID', retryable: false,
      message: '未拆分的左右同屏候选只能忽略或先拆分。',
    });
    expect(await facts()).toEqual(before);

    const ordinary = candidates.find((item: any) => item.pairGroupId === null && item.status === 'pending');
    expect((await decide(harness, seeded.projectId, ordinary, 'approve')).statusCode).toBe(200);
    expect((await decide(harness, seeded.projectId, ignoredParent, 'reject')).statusCode).toBe(200);
    const split = await decide(harness, seeded.projectId, splitParent, 'split_left_right', {
      leftText: '匿名左侧', rightText: '匿名右侧',
    });
    expect(split.statusCode, split.body).toBe(200);
    expect(split.json().createdCandidates).toMatchObject([
      { source: 'split', position: 'left', status: 'edited' },
      { source: 'split', position: 'right', status: 'edited' },
    ]);
    expect(new Set(split.json().createdCandidates.map((item: any) => item.pairGroupId)).size).toBe(1);

    candidates = (await harness.app.inject({
      method: 'GET',
      url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}/candidates?limit=100`,
    })).json().items;
    for (const candidate of candidates.filter((item: any) => item.status === 'pending')) {
      expect((await decide(harness, seeded.projectId, candidate, 'approve')).statusCode).toBe(200);
    }
    const detail = (await harness.app.inject({
      method: 'GET', url: `/api/projects/${seeded.projectId}/screen-text/batches/${batchId}`,
    })).json();
    expect(detail.status).toBe('completed');
    const release = await harness.app.inject({
      method: 'POST', url: `/api/projects/${seeded.projectId}/screen-text/releases`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { batchId, expectedBatchRevision: detail.revision },
    });
    expect(release.statusCode, release.body).toBe(201);
    const episode2 = release.json().exports.find((item: any) => item.episodeNumber === 2);
    const downloaded = await harness.app.inject({ method: 'GET', url: episode2.downloadPath });
    expect(downloaded.body).toContain('（左）匿名左侧');
    expect(downloaded.body).toContain('（右）匿名右侧');
  });

  it('没有 active 路由时 ScreenText 创建稳定阻断且不写入批次', async () => {
    const harness = await createHarness();
    const seeded = await seedProject(harness);
    await harness.pool.query("DELETE FROM active_control_plane_pointers WHERE environment='development' AND workflow_stage='screen_text'");
    const before = await harness.pool.query<{ count: string }>('SELECT count(*)::text AS count FROM screen_text_batches');
    const response = await createBatch(harness, seeded);
    expect(response.statusCode, response.body).toBe(409);
    expect(response.json().error).toMatchObject({ code: 'SCREEN_TEXT_ROUTING_NOT_ACTIVE', action: 'publish_routing_policy' });
    const after = await harness.pool.query<{ count: string }>('SELECT count(*)::text AS count FROM screen_text_batches');
    expect(after.rows[0]!.count).toBe(before.rows[0]!.count);
  });
});
