import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import type { RuntimeTelemetryProvider } from '../../backend/src/modules/system-control/system-control.runtime.service.js';

const requireBackendDependency = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackendDependency('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackendDependency('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');

let temporaryDatabaseName: string | null = null;
let adminPool: any = null;
let pool: any = null;
let app: any = null;
let providerMode: 'normal' | 'partial' | 'failure' = 'partial';
const controlledDirectory = [
  { runtimeResourceId: 'runtime:asr-api', environment: 'development' as const, kind: 'application' as const, displayName: '受控 ASR API', identity: { capability: 'asr' as const, executionKind: null, provider: 'fake', adapterKey: 'fake-asr', model: 'runtime-v1' }, routingScope: { workflowStage: 'asr' as const, poolId: 'asr_api' } },
  { runtimeResourceId: 'runtime:ocr-api', environment: 'development' as const, kind: 'application' as const, displayName: '受控 OCR API', identity: { capability: 'screen_text' as const, executionKind: 'cloud_api', provider: 'fake', adapterKey: 'fake-ocr', model: 'runtime-v1' }, routingScope: { workflowStage: 'screen_text' as const, poolId: 'ocr_api' } },
  { runtimeResourceId: 'runtime:ocr-worker', environment: 'development' as const, kind: 'worker' as const, displayName: '受控 OCR Worker', identity: { capability: 'screen_text' as const, executionKind: 'self_hosted_worker', provider: 'fake', adapterKey: 'fake-ocr-worker', model: 'runtime-v1' }, routingScope: { workflowStage: 'screen_text' as const, poolId: 'ocr_self_hosted_worker' } },
  { runtimeResourceId: 'runtime:delivery', environment: 'development' as const, kind: 'worker' as const, displayName: '受控 Delivery Worker', identity: { capability: 'delivery' as const, executionKind: 'self_hosted_worker', provider: null, adapterKey: null, model: null }, routingScope: null },
] satisfies Awaited<ReturnType<RuntimeTelemetryProvider['listResources']>>;
let providerDirectory = controlledDirectory;

const owner = { subject: 'owner', audience: 'system-control', capabilities: ['system-control:runtime:read'] } as const;
const provider: RuntimeTelemetryProvider = {
  async listResources() {
    return providerDirectory;
  },
  async collect(input) {
    if (providerMode === 'failure') throw new Error('provider failure must not escape HTTP');
    return input.resourceIds.filter((id) => providerMode === 'normal' || id === 'runtime:asr-api').map((runtimeResourceId) => ({
      runtimeResourceId,
      status: providerMode === 'normal' ? 'fresh' as const : 'partial' as const,
      observedAt: input.observedAt,
      cpuPercent: 12.5,
      memoryBytes: 1024,
      reasonCode: 'GPU_NOT_CONFIGURED',
    }));
  },
};

const headers = (identity: 'owner' | 'employee' | 'missing') => ({
  'x-system-control-test-identity': identity,
});

const uuid = () => randomUUID();
const digest = () => 'a'.repeat(64);

beforeAll(async () => {
  const sourceUrl = new URL(getDatabaseUrl());
  const adminUrl = new URL(sourceUrl);
  adminUrl.pathname = '/postgres';
  temporaryDatabaseName = `qimao_runtime_${process.pid}_${uuid().replaceAll('-', '').slice(0, 10)}`;
  adminPool = new pg.Pool({ connectionString: adminUrl.toString(), max: 1, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
  await adminPool.query(`CREATE DATABASE "${temporaryDatabaseName}"`);
  const databaseUrl = new URL(sourceUrl);
  databaseUrl.pathname = `/${temporaryDatabaseName}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 2, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
  const appDatabase = {
    query: (...args: any[]) => pool.query(...args),
    connect: (...args: any[]) => pool.connect(...args),
    end: async () => undefined,
  };
  app = createApp({
    database: appDatabase,
    systemControlRuntimeTelemetryProvider: provider,
    systemControlPrincipalResolver: (request) => request.headers['x-system-control-test-identity'] === 'owner'
      ? owner
      : request.headers['x-system-control-test-identity'] === 'employee'
        ? { subject: 'employee', audience: 'employee', capabilities: ['system-control:runtime:read'] }
        : null,
  });
  await app.ready();
});

beforeEach(async () => {
  providerMode = 'partial';
  providerDirectory = controlledDirectory;
  await pool.query('TRUNCATE active_control_plane_pointers, routing_advance_events, routing_policy_targets, routing_policy_status_events, routing_policy_pools, routing_policy_versions, engine_deployment_versions, engine_deployments CASCADE');
  await pool.query('TRUNCATE project_commands, projects CASCADE');
});

afterAll(async () => {
  if (app) await app.close();
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (adminPool && temporaryDatabaseName) {
    await adminPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()', [temporaryDatabaseName]);
    await adminPool.query(`DROP DATABASE IF EXISTS "${temporaryDatabaseName}"`);
    const remaining = await adminPool.query('SELECT 1 FROM pg_database WHERE datname=$1', [temporaryDatabaseName]);
    expect(remaining.rowCount).toBe(0);
  }
  if (adminPool) await adminPool.end();
});

const seedAsrRuntimeFacts = async () => {
  const projectId = uuid(); const manifestId = uuid(); const draftId = uuid(); const termVersionId = uuid(); const assetId = uuid();
  const batchId = uuid(); const jobId = uuid(); const attemptId = uuid();
  await pool.query(`INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,'runtime-fixture','ready','active',1,'test','test')`, [projectId]);
  await pool.query(`INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'runtime','test')`, [manifestId, projectId]);
  await pool.query(`INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'runtime','confirmed')`, [draftId, projectId, digest()]);
  await pool.query(`INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version) VALUES($1,$2,1,$3,$4,'runtime')`, [termVersionId, projectId, draftId, digest()]);
  await pool.query(`INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'runtime.mp4','video',1,'sha256',$4,CURRENT_TIMESTAMP)`, [assetId, projectId, `runtime/${assetId}`, digest()]);
  await pool.query(`INSERT INTO asr_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,provider,adapter,model,language,config_digest,hotword_digest,hotword_term_count,hotword_alias_count,hotword_filtered_count,hotword_truncated_count,status) VALUES($1,$2,'single',ARRAY[1],$3,$4,1,'runtime','runtime_adapter','runtime-v1','zh-CN',$5,$5,0,0,0,0,'running')`, [batchId, projectId, termVersionId, manifestId, digest()]);
  await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status) VALUES($1,$2,$3,1,$4,$5,'runtime.mp4','sha256',$6,$7,$8,$8,'running')`, [jobId, batchId, projectId, manifestId, assetId, digest(), termVersionId, digest()]);
  await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,lease_owner,lease_expires_at,started_at) VALUES($1,$2,1,'running','runtime-worker',CURRENT_TIMESTAMP + interval '5 minutes',CURRENT_TIMESTAMP)`, [attemptId, jobId]);
  await pool.query('UPDATE asr_jobs SET current_attempt_id=$2 WHERE id=$1', [jobId, attemptId]);
  return { projectId, jobId, attemptId };
};

const seedActiveAsrRouting = async () => {
  const deploymentId = uuid(); const deploymentVersionId = uuid(); const routingVersionId = uuid();
  await pool.query(`INSERT INTO engine_deployments(id,capability,execution_kind,display_name,provider,adapter_key,status) VALUES($1,'asr','cloud_api','Runtime ASR','fake','fake-asr','enabled')`, [deploymentId]);
  await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,secret_reference_summary,config_digest) VALUES($1,$2,1,'runtime-v1','zh-CN',$3,$4,$5)`, [deploymentVersionId, deploymentId, JSON.stringify({ capability: 'asr', executionKind: 'cloud_api', provider: 'fake', adapterKey: 'fake-asr', model: 'runtime-v1' }), JSON.stringify({ present: false }), digest()]);
  await pool.query(`INSERT INTO routing_policy_versions(id,environment,workflow_stage,version) VALUES($1,'development','asr',1)`, [routingVersionId]);
  await pool.query(`INSERT INTO routing_policy_pools(routing_version_id,pool_id) VALUES($1,'asr_api')`, [routingVersionId]);
  await pool.query(`INSERT INTO routing_policy_targets(routing_version_id,pool_id,routing_target_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit) VALUES($1,'asr_api',$2,$3,1,'preferred',10,2,100)`, [routingVersionId, randomUUID(), deploymentVersionId]);
  await pool.query(`INSERT INTO routing_policy_status_events(routing_version_id,status,request_id,actor_subject) VALUES($1,'active','runtime-fixture','runtime-test')`, [routingVersionId]);
  await pool.query(`INSERT INTO active_control_plane_pointers(environment,workflow_stage,routing_version_id) VALUES('development','asr',$1)`, [routingVersionId]);
  return { deploymentId, deploymentVersionId, routingVersionId };
};

describe('BACK-SYSTEM-06A 运行资源与受控遥测只读链', () => {
  it('逐请求 runtime:read 隔离，空库返回 not_configured/empty 且读取零写副作用', async () => {
    const before = (await pool.query(`SELECT (SELECT COUNT(*) FROM projects)::int AS projects, (SELECT COUNT(*) FROM asr_jobs)::int AS jobs, (SELECT COUNT(*) FROM asr_attempts)::int AS attempts`)).rows[0];
    expect((await app.inject({ method: 'GET', url: '/api/system-control/runtime/overview', headers: headers('missing') })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/system-control/runtime/overview', headers: headers('employee') })).statusCode).toBe(403);
    providerDirectory = [];
    const response = await app.inject({ method: 'GET', url: '/api/system-control/runtime/overview?environment=development', headers: headers('owner') });
    expect(response.statusCode, response.body).toBe(200);
    const overview = response.json();
    expect(overview.resources).toEqual([]);
    const after = (await pool.query(`SELECT (SELECT COUNT(*) FROM projects)::int AS projects, (SELECT COUNT(*) FROM asr_jobs)::int AS jobs, (SELECT COUNT(*) FROM asr_attempts)::int AS attempts`)).rows[0];
    expect(after).toEqual(before);

    const readOnlyDatabase = { query: pool.query.bind(pool), connect: pool.connect.bind(pool), end: async () => undefined } as any;
    const noProviderApp = createApp({ database: readOnlyDatabase, systemControlPrincipalResolver: () => owner });
    await noProviderApp.ready();
    const noProviderResponse = await noProviderApp.inject({ method: 'GET', url: '/api/system-control/runtime/overview', headers: headers('owner') });
    expect(noProviderResponse.statusCode).toBe(200);
    expect(noProviderResponse.json().resources).toEqual([]);
    await noProviderApp.close();
  });

  it('PostgreSQL 运行池与 lease 事实、Provider 部分未知及安全详情可读', async () => {
    await seedAsrRuntimeFacts();
    providerMode = 'normal';
    const response = await app.inject({ method: 'GET', url: '/api/system-control/runtime/overview', headers: headers('owner') });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().resources.map((item: any) => item.runtimeResourceId)).toEqual(controlledDirectory.map((item) => item.runtimeResourceId));
    const asr = response.json().resources.find((item: any) => item.runtimeResourceId === 'runtime:asr-api');
    expect(asr).toMatchObject({ health: 'healthy', queueDepth: 0, runningCount: 1, failedCount: 0, reconciliationRequiredCount: 0, lease: { activeCount: 1, ownerPresentCount: 1 }, telemetry: { status: 'fresh', cpuPercent: 12.5, memoryBytes: 1024 } });
    const detail = await app.inject({ method: 'GET', url: '/api/system-control/runtime/resources/runtime:asr-api', headers: headers('owner') });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).not.toMatchObject({ objectKey: expect.anything(), secret: expect.anything(), sql: expect.anything(), leaseOwner: expect.anything() });
  });

  it('Provider 失败只投影 unknown，领域事实仍 200；资源筛选/排序/空页 total 由服务端返回', async () => {
    await seedAsrRuntimeFacts();
    providerMode = 'failure';
    const overview = await app.inject({ method: 'GET', url: '/api/system-control/runtime/overview', headers: headers('owner') });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().resources.every((item: any) => item.telemetry.status === 'unknown')).toBe(true);
    const page = await app.inject({ method: 'GET', url: '/api/system-control/runtime/resources?kind=worker&sort=display_desc&limit=1&offset=0', headers: headers('owner') });
    expect(page.statusCode).toBe(200);
    expect(page.json()).toMatchObject({ total: 2, limit: 1, offset: 0 });
    expect(page.json().items).toHaveLength(1);
    const empty = await app.inject({ method: 'GET', url: '/api/system-control/runtime/resources?kind=worker&limit=1&offset=99', headers: headers('owner') });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toMatchObject({ total: 2, items: [] });
    expect((await app.inject({ method: 'GET', url: '/api/system-control/runtime/resources/not-a-real-resource', headers: headers('owner') })).statusCode).toBe(404);
  });

  it('受控目录配置只读复用 active routing，禁用/无 active 不伪造，吞吐只计 24h 窗口', async () => {
    await seedActiveAsrRouting();
    const facts = await seedAsrRuntimeFacts();
    await pool.query(`UPDATE asr_jobs SET status='completed', updated_at=CURRENT_TIMESTAMP - interval '48 hours' WHERE id=$1`, [facts.jobId]);
    await pool.query(`UPDATE asr_attempts SET created_at=CURRENT_TIMESTAMP - interval '48 hours', started_at=CURRENT_TIMESTAMP - interval '48 hours' WHERE id=$1`, [facts.attemptId]);
    providerMode = 'normal';
    const old = await app.inject({ method: 'GET', url: '/api/system-control/runtime/overview', headers: headers('owner') });
    expect(old.statusCode).toBe(200);
    const oldAsr = old.json().resources.find((item: any) => item.runtimeResourceId === 'runtime:asr-api');
    expect(oldAsr).toMatchObject({ configuration: { status: 'configured', acceptingNewTasks: true }, throughput: { completedCount: 0 } });
    expect(oldAsr.configuration.routingVersionId).toBeTruthy();
    expect(oldAsr.configuration.deploymentVersionId).toBeTruthy();
    await pool.query(`UPDATE asr_jobs SET updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [facts.jobId]);
    const recent = await app.inject({ method: 'GET', url: '/api/system-control/runtime/overview', headers: headers('owner') });
    expect(recent.json().resources.find((item: any) => item.runtimeResourceId === 'runtime:asr-api').throughput.completedCount).toBe(1);
    await pool.query(`UPDATE engine_deployments SET status='disabled' WHERE id=(SELECT deployment_id FROM engine_deployment_versions LIMIT 1)`);
    const disabled = await app.inject({ method: 'GET', url: '/api/system-control/runtime/overview', headers: headers('owner') });
    expect(disabled.json().resources.find((item: any) => item.runtimeResourceId === 'runtime:asr-api').configuration).toMatchObject({ status: 'unknown', acceptingNewTasks: false });
    await pool.query("DELETE FROM active_control_plane_pointers WHERE environment='development' AND workflow_stage='asr'");
    const noActive = await app.inject({ method: 'GET', url: '/api/system-control/runtime/overview', headers: headers('owner') });
    expect(noActive.json().resources.find((item: any) => item.runtimeResourceId === 'runtime:asr-api').configuration).toMatchObject({ status: 'not_configured', acceptingNewTasks: false });
  });

  it('非法分页参数在唯一 HTTP 查询边界稳定 400', async () => {
    for (const query of ['limit=0', 'limit=101', 'limit=abc', 'offset=-1', 'offset=1.5']) {
      const response = await app.inject({ method: 'GET', url: `/api/system-control/runtime/resources?${query}`, headers: headers('owner') });
      expect(response.statusCode, `${query}: ${response.body}`).toBe(400);
    }
  });
});
