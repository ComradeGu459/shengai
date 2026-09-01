import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';

const requireBackendDependency = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackendDependency('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackendDependency('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');

let temporaryDatabaseName: string | null = null;
let adminPool: any = null;
let pool: any = null;
let app: any = null;

const uuid = () => randomUUID();
const digest = () => 'a'.repeat(64);
const owner = { subject: 'operations-owner', audience: 'system-control', capabilities: ['system-control:logs:read'] } as const;
const headers = (identity: 'owner' | 'employee' | 'runtime' | 'missing') => ({ 'x-system-control-test-identity': identity });

beforeAll(async () => {
  const sourceUrl = new URL(getDatabaseUrl());
  const adminUrl = new URL(sourceUrl);
  adminUrl.pathname = '/postgres';
  temporaryDatabaseName = `qimao_operations_${process.pid}_${uuid().replaceAll('-', '').slice(0, 10)}`;
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
    systemControlPrincipalResolver: (request) => {
      const identity = request.headers['x-system-control-test-identity'];
      if (identity === 'owner') return owner;
      if (identity === 'runtime') return { subject: 'runtime-only', audience: 'system-control', capabilities: ['system-control:runtime:read'] };
      if (identity === 'employee') return { subject: 'employee', audience: 'employee', capabilities: ['system-control:logs:read'] };
      return null;
    },
  });
  await app.ready();
});

beforeEach(async () => {
  await pool.query(`TRUNCATE connection_test_runs, delivery_jobs, delivery_products, screen_text_jobs, screen_text_batches, asr_jobs, asr_batches, routing_advance_events, routing_policy_targets, routing_policy_status_events, routing_policy_pools, active_control_plane_pointers, routing_policy_versions, projects CASCADE`);
  await pool.query(`TRUNCATE engine_deployments, engine_deployment_versions CASCADE`);
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

const seedProject = async (name: string) => {
  const projectId = uuid();
  const manifestId = uuid();
  const draftId = uuid();
  const termVersionId = uuid();
  const assetId = uuid();
  await pool.query(`INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,$2,'ready','active',1,'operations-test','operations-test')`, [projectId, name]);
  await pool.query(`INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'operations','operations-test')`, [manifestId, projectId]);
  await pool.query(`INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'operations','confirmed')`, [draftId, projectId, digest()]);
  await pool.query(`INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version) VALUES($1,$2,1,$3,$4,'operations')`, [termVersionId, projectId, draftId, digest()]);
  await pool.query(`INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'operations.mp4','video',1,'sha256',$4,CURRENT_TIMESTAMP)`, [assetId, projectId, `operations/${assetId}`, digest()]);
  return { projectId, manifestId, termVersionId, assetId };
};

const seedFacts = async () => {
  const first = await seedProject('operations-one');
  const second = await seedProject('operations-two');

  const asrBatch = uuid(); const asrJob = uuid(); const asrAttempt = uuid();
  await pool.query(`INSERT INTO asr_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,provider,adapter,model,language,config_digest,hotword_digest,hotword_term_count,hotword_alias_count,hotword_filtered_count,hotword_truncated_count,status,created_at,updated_at) VALUES($1,$2,'single',ARRAY[1],$3,$4,1,'fake','fake-asr','v1','zh-CN',$5,$5,0,0,0,0,'completed',CURRENT_TIMESTAMP - interval '2 minutes',CURRENT_TIMESTAMP - interval '2 minutes')`, [asrBatch, first.projectId, first.termVersionId, first.manifestId, digest()]);
  await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status,created_at,updated_at) VALUES($1,$2,$3,1,$4,$5,'operations.mp4','sha256',$6,$7,$8,$8,'completed',CURRENT_TIMESTAMP - interval '2 minutes',CURRENT_TIMESTAMP - interval '1 minute')`, [asrJob, asrBatch, first.projectId, first.manifestId, first.assetId, digest(), first.termVersionId, digest()]);
  await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,provider_request_id,started_at,completed_at,created_at) VALUES($1,$2,1,'completed','provider-asr-1',CURRENT_TIMESTAMP - interval '2 minutes',CURRENT_TIMESTAMP - interval '1 minute',CURRENT_TIMESTAMP - interval '2 minutes')`, [asrAttempt, asrJob]);
  await pool.query(`UPDATE asr_jobs SET current_attempt_id=$2 WHERE id=$1`, [asrJob, asrAttempt]);
  await pool.query(`INSERT INTO asr_usage(attempt_id,provider,media_duration_ms,billing_unit,billing_quantity,currency,estimated_amount,final_amount,reconciliation_status,provider_request_id,original_currency,original_estimated_amount,original_final_amount,estimated_amount_cny,final_amount_cny) VALUES($1,'fake',1000,'minute',1,'USD',0.1,0.1,'final','provider-asr-1','USD',0.1,0.1,0.7,0.7)`, [asrAttempt]);
  const asrDeployment = uuid(); const asrDeploymentVersion = uuid(); const asrRouting = uuid();
  await pool.query(`INSERT INTO engine_deployments(id,capability,execution_kind,display_name,provider,adapter_key,status) VALUES($1,'asr','cloud_api','operations ASR','fake','fake-asr','enabled')`, [asrDeployment]);
  await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,config_digest) VALUES($1,$2,1,'v1','zh-CN','{}',$3)`, [asrDeploymentVersion, asrDeployment, digest()]);
  await pool.query(`INSERT INTO routing_policy_versions(id,environment,workflow_stage,version) VALUES($1,'development','asr',1)`, [asrRouting]);
  await pool.query(`UPDATE asr_batches SET routing_version_id=$2,deployment_version_id=$3 WHERE id=$1`, [asrBatch, asrRouting, asrDeploymentVersion]);
  await pool.query(`UPDATE asr_jobs SET routing_version_id=$2,deployment_version_id=$3 WHERE id=$1`, [asrJob, asrRouting, asrDeploymentVersion]);
  await pool.query(`UPDATE asr_attempts SET routing_version_id=$2,deployment_version_id=$3 WHERE id=$1`, [asrAttempt, asrRouting, asrDeploymentVersion]);
  const dispatchGroup = uuid(); const dispatchResult = uuid();
  await pool.query(`INSERT INTO asr_dispatch_groups(id,project_ids,status,request_id) VALUES($1,$2,'accepted','dispatch-asr-1')`, [dispatchGroup, [first.projectId]]);
  await pool.query(`INSERT INTO asr_dispatch_project_results(id,dispatch_group_id,project_id,selection_order,status,batch_id) VALUES($1,$2,$3,1,'accepted',$4)`, [dispatchResult, dispatchGroup, first.projectId, asrBatch]);

  const screenBatch = uuid(); const screenJob = uuid(); const screenAttempt = uuid();
  await pool.query(`INSERT INTO screen_text_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,frame_strategy_version,dedupe_strategy_version,term_projection,term_projection_entries,status,revision,request_id,created_at,updated_at) VALUES($1,$2,'single',ARRAY[1],$3,$4,1,'cloud_api','fake','fake-ocr','v1','zh-CN','operations','in','out','{}',$5,'frame-v1','dedupe-v1','{}','[]','completed',1,'request-screen-1',CURRENT_TIMESTAMP - interval '3 minutes',CURRENT_TIMESTAMP - interval '2 minutes')`, [screenBatch, second.projectId, second.termVersionId, second.manifestId, digest()]);
  await pool.query(`INSERT INTO screen_text_jobs(id,batch_id,project_id,episode_number,asset_id,status,stats,created_at,updated_at) VALUES($1,$2,$3,1,$4,'failed','{"candidateCount":2,"processingDurationMs":120}',CURRENT_TIMESTAMP - interval '3 minutes',CURRENT_TIMESTAMP - interval '2 minutes')`, [screenJob, screenBatch, second.projectId, second.assetId]);
  await pool.query(`INSERT INTO screen_text_attempts(id,job_id,attempt_number,status,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,input_digest,provider_request_id,error_code,error_detail,retryable,external_side_effect_possible,created_at,completed_at) VALUES($1,$2,1,'failed','cloud_api','fake','fake-ocr','v1','zh-CN','operations','in','out','{}',$3,$3,'provider-ocr-1','OCR_TIMEOUT','sensitive body must not escape',true,false,CURRENT_TIMESTAMP - interval '3 minutes',CURRENT_TIMESTAMP - interval '2 minutes')`, [screenAttempt, screenJob, digest()]);
  await pool.query(`UPDATE screen_text_jobs SET current_attempt_id=$2 WHERE id=$1`, [screenJob, screenAttempt]);

  const preEditSession = uuid(); const preEditRelease = uuid(); const acceptanceSession = uuid(); const acceptanceRelease = uuid();
  await pool.query(`INSERT INTO pre_edit_sessions(id,project_id,project_version,source_srt_set_digest,term_version_id,manifest_id,manifest_version,source_digest,source_snapshot,algorithm_version,format_policy_version,status) VALUES($1,$2,1,$3,$4,$5,1,$3,'{}','operations','operations','ready')`, [preEditSession, first.projectId, digest(), first.termVersionId, first.manifestId]);
  await pool.query(`INSERT INTO pre_edit_releases(id,project_id,session_id,version,source_digest,decision_digest,release_digest) VALUES($1,$2,$3,1,$4,$4,$4)`, [preEditRelease, first.projectId, preEditSession, digest()]);
  await pool.query(`INSERT INTO acceptance_sessions(id,project_id,project_version,pre_edit_release_id,pre_edit_head_release_id,manifest_id,manifest_version,term_version_id,rule_version,source_digest,source_snapshot,status) VALUES($1,$2,1,$3,$3,$4,1,$5,'operations',$6,'{}','released')`, [acceptanceSession, first.projectId, preEditRelease, first.manifestId, first.termVersionId, digest()]);
  await pool.query(`INSERT INTO acceptance_releases(id,project_id,session_id,version,source_digest,acceptance_digest,cue_count) VALUES($1,$2,$3,1,$4,$4,0)`, [acceptanceRelease, first.projectId, acceptanceSession, digest()]);
  const deliveryProduct = uuid(); const deliveryJob = uuid(); const deliveryAttempt = uuid();
  await pool.query(`INSERT INTO delivery_products(id,project_id,acceptance_session_id,acceptance_release_id,version,name,status,request_id,source_snapshot,created_at,updated_at) VALUES($1,$2,$3,$4,1,'operations delivery','ready','request-delivery-1','{}',CURRENT_TIMESTAMP - interval '4 minutes',CURRENT_TIMESTAMP - interval '3 minutes')`, [deliveryProduct, first.projectId, acceptanceSession, acceptanceRelease]);
  await pool.query(`INSERT INTO delivery_jobs(id,delivery_id,status,created_at,updated_at) VALUES($1,$2,'ready',CURRENT_TIMESTAMP - interval '4 minutes',CURRENT_TIMESTAMP - interval '3 minutes')`, [deliveryJob, deliveryProduct]);
  await pool.query(`INSERT INTO delivery_attempts(id,delivery_id,status,stage,request_id,attempt_number,started_at,completed_at,created_at) VALUES($1,$2,'ready','generation','request-delivery-1',1,CURRENT_TIMESTAMP - interval '4 minutes',CURRENT_TIMESTAMP - interval '3 minutes',CURRENT_TIMESTAMP - interval '4 minutes')`, [deliveryAttempt, deliveryProduct]);

  const testRun = uuid();
  const engine = uuid(); const engineVersion = uuid();
  await pool.query(`INSERT INTO engine_deployments(id,capability,execution_kind,display_name,provider,adapter_key,status) VALUES($1,'asr','cloud_api','operations engine','fake','fake-asr','enabled')`, [engine]);
  await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,config_digest) VALUES($1,$2,1,'v1','zh-CN','{}',$3)`, [engineVersion, engine, digest()]);
  await pool.query(`INSERT INTO connection_test_runs(id,deployment_version_id,capability,execution_kind,adapter_key,status,request_id,attempt_count,reason_code,queued_at,updated_at,completed_at) VALUES($1,$2,'asr','cloud_api','fake-asr','unknown','request-test-1',1,'PROVIDER_UNKNOWN',CURRENT_TIMESTAMP - interval '5 minutes',CURRENT_TIMESTAMP - interval '4 minutes',CURRENT_TIMESTAMP - interval '4 minutes')`, [testRun, engineVersion]);
  return { first, second, asrJob, asrAttempt, asrDeployment, asrDeploymentVersion, asrRouting, screenJob, screenAttempt, deliveryProduct, deliveryJob, deliveryAttempt, testRun };
};

const seedUploadTermsFacts = async () => {
  const uploadProject = await seedProject('operations-upload');
  const termsProject = await seedProject('operations-terms');
  const makeUpload = async (status: string, errorCode: string | null = null) => {
    const id = uuid();
    await pool.query(`INSERT INTO upload_sessions
      (id,project_id,object_key,original_filename,media_kind,size_bytes,part_size_bytes,total_parts,storage_upload_id,file_fingerprint,transport_kind,checksum_algorithm,checksum_value,status,expires_at,error_code)
      VALUES($1,$2,$3,'operations-upload.mp4','video',10,5,2,$4,$5,'multipart','sha256',$6,$7,CURRENT_TIMESTAMP + interval '1 hour',$8)`,
      [id, uploadProject.projectId, `operations/${id}`, `storage-${id}`, digest(), status === 'completed' ? digest() : null, status, errorCode]);
    return id;
  };
  const completedUpload = await makeUpload('completed');
  const failedUpload = await makeUpload('failed', 'UPLOAD_PART_INVALID');
  const runningUpload = await makeUpload('uploading');
  const reconciliationUpload = await makeUpload('verifying');
  const completedCommand = `upload-complete-${completedUpload}`;
  const reconciliationCommand = `upload-complete-${reconciliationUpload}`;
  await pool.query(`INSERT INTO upload_commands(idempotency_key,command_kind,request_hash,upload_session_id) VALUES
    ($1,'complete_upload',$3,$2),($4,'complete_upload',$3,$5)`, [completedCommand, completedUpload, digest(), reconciliationCommand, reconciliationUpload]);
  await pool.query(`INSERT INTO upload_completion_jobs(upload_session_id,idempotency_key,request_hash,status,stage,next_attempt_at,completed_at)
    VALUES($1,$2,$3,'completed','binding',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [completedUpload, `completion-${completedUpload}`, digest()]);
  await pool.query(`INSERT INTO upload_completion_jobs(upload_session_id,idempotency_key,request_hash,status,stage,next_attempt_at,last_error_code,last_error)
    VALUES($1,$2,$3,'retryable','reconciliation_required',CURRENT_TIMESTAMP,'STORAGE_UNKNOWN','objectKey=private should not escape')`, [reconciliationUpload, `completion-${reconciliationUpload}`, digest()]);

  const makeRun = async (status: 'running' | 'completed' | 'failed', errorCode: string | null = null) => {
    const id = uuid();
    await pool.query(`INSERT INTO term_extraction_runs
      (id,project_id,source_srt_set_digest,prompt_version,adapter,request_id,status,error_code,error_detail,completed_at)
      VALUES($1,$2,$3,'operations','fake',$6,$4,$5,'term body must not escape',$7)`,
      [id, termsProject.projectId, digest(), status, errorCode, `terms-request-${id}`, status === 'running' ? null : new Date()]);
    return id;
  };
  const completedRun = await makeRun('completed');
  const runningRun = await makeRun('running');
  const failedRun = await makeRun('failed', 'TERM_EXTRACTION_FAILED');
  return { completedUpload, failedUpload, runningUpload, reconciliationUpload, completedRun, runningRun, failedRun, uploadProject, termsProject };
};

describe('BACK-SYSTEM-06B 跨领域运行记录只读 API', () => {
  it('逐请求权限隔离，owner 可读四领域且读取零写副作用', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/system-control/operations', headers: headers('missing') })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/system-control/operations', headers: headers('employee') })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/system-control/operations', headers: headers('runtime') })).statusCode).toBe(403);
    const seeded = await seedFacts();
    const before = (await pool.query(`SELECT (SELECT COUNT(*) FROM projects)::int AS projects, (SELECT COUNT(*) FROM asr_jobs)::int AS asr_jobs, (SELECT COUNT(*) FROM asr_attempts)::int AS asr_attempts, (SELECT COUNT(*) FROM asr_usage)::int AS asr_usage, (SELECT COUNT(*) FROM screen_text_jobs)::int AS screen_jobs, (SELECT COUNT(*) FROM screen_text_attempts)::int AS screen_attempts, (SELECT COUNT(*) FROM delivery_jobs)::int AS delivery_jobs, (SELECT COUNT(*) FROM delivery_attempts)::int AS delivery_attempts, (SELECT COUNT(*) FROM connection_test_runs)::int AS tests, (SELECT COUNT(*) FROM connection_test_attempts)::int AS test_attempts, (SELECT COUNT(*) FROM system_control_commands)::int AS commands, (SELECT COUNT(*) FROM system_control_audit_events)::int AS audit`)).rows[0];
    const response = await app.inject({ method: 'GET', url: '/api/system-control/operations?limit=10&sort=domain_asc', headers: headers('owner') });
    expect(response.statusCode, response.body).toBe(200);
    const body = response.json();
    expect(body.total).toBe(4);
    expect(body.items.map((item: any) => item.domain)).toEqual(['asr', 'delivery', 'screen_text', 'system_control']);
    expect(body.items.find((item: any) => item.jobId === seeded.asrJob).amountCny).toBe('0.700000');
    expect(body.items.find((item: any) => item.domain === 'system_control').reconciliationStatus).toBe('unknown');
    const after = (await pool.query(`SELECT (SELECT COUNT(*) FROM projects)::int AS projects, (SELECT COUNT(*) FROM asr_jobs)::int AS asr_jobs, (SELECT COUNT(*) FROM asr_attempts)::int AS asr_attempts, (SELECT COUNT(*) FROM asr_usage)::int AS asr_usage, (SELECT COUNT(*) FROM screen_text_jobs)::int AS screen_jobs, (SELECT COUNT(*) FROM screen_text_attempts)::int AS screen_attempts, (SELECT COUNT(*) FROM delivery_jobs)::int AS delivery_jobs, (SELECT COUNT(*) FROM delivery_attempts)::int AS delivery_attempts, (SELECT COUNT(*) FROM connection_test_runs)::int AS tests, (SELECT COUNT(*) FROM connection_test_attempts)::int AS test_attempts, (SELECT COUNT(*) FROM system_control_commands)::int AS commands, (SELECT COUNT(*) FROM system_control_audit_events)::int AS audit`)).rows[0];
    expect(after).toEqual(before);
  });

  it('connection test unknown 在详情 Attempt 链中保守表示未知副作用且读取零写副作用', async () => {
    const seeded = await seedFacts();
    const connectionAttempt = uuid();
    await pool.query(`INSERT INTO connection_test_attempts(id,test_run_id,attempt_number,status,reason_code,started_at,completed_at,created_at) VALUES($1,$2,1,'unknown','PROVIDER_UNKNOWN',CURRENT_TIMESTAMP - interval '2 minutes',CURRENT_TIMESTAMP - interval '1 minute',CURRENT_TIMESTAMP - interval '2 minutes')`, [connectionAttempt, seeded.testRun]);
    const before = (await pool.query(`SELECT (SELECT COUNT(*) FROM connection_test_runs)::int AS test_runs, (SELECT COUNT(*) FROM connection_test_attempts)::int AS attempts, (SELECT COUNT(*) FROM system_control_commands)::int AS commands, (SELECT COUNT(*) FROM system_control_audit_events)::int AS audit`)).rows[0];
    const list = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=system_control', headers: headers('owner') });
    expect(list.statusCode, list.body).toBe(200);
    const item = list.json().items.find((entry: any) => entry.attemptId === connectionAttempt);
    expect(item).toBeDefined();
    const detail = await app.inject({ method: 'GET', url: `/api/system-control/operations/${item.operationId}`, headers: headers('owner') });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json().attemptChain).toMatchObject([{ attemptId: connectionAttempt, status: 'unknown', externalNotAccepted: false, externalSideEffectPossible: true }]);
    const after = (await pool.query(`SELECT (SELECT COUNT(*) FROM connection_test_runs)::int AS test_runs, (SELECT COUNT(*) FROM connection_test_attempts)::int AS attempts, (SELECT COUNT(*) FROM system_control_commands)::int AS commands, (SELECT COUNT(*) FROM system_control_audit_events)::int AS audit`)).rows[0];
    expect(after).toEqual(before);
  });

  it('组合筛选、三种排序、跨页与空页保留真实 total，非法范围和页码稳定 400', async () => {
    const seeded = await seedFacts();
    const byProject = await app.inject({ method: 'GET', url: `/api/system-control/operations?projectId=${seeded.first.projectId}&domain=asr&status=completed`, headers: headers('owner') });
    expect(byProject.statusCode).toBe(200);
    expect(byProject.json()).toMatchObject({ total: 1, items: [{ domain: 'asr', projectId: seeded.first.projectId }] });
    for (const sort of ['updated_desc', 'updated_asc', 'status_asc']) {
      const result = await app.inject({ method: 'GET', url: `/api/system-control/operations?sort=${sort}&limit=2&offset=2`, headers: headers('owner') });
      expect(result.statusCode, result.body).toBe(200);
      expect(result.json().total).toBe(4);
    }
    const empty = await app.inject({ method: 'GET', url: '/api/system-control/operations?limit=2&offset=99', headers: headers('owner') });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toMatchObject({ total: 4, items: [] });
    for (const query of ['limit=0', 'limit=101', 'limit=abc', 'offset=-1', 'offset=1.5', 'from=2026-08-19T00:00:00.000Z&to=2026-08-18T00:00:00.000Z']) {
      const result = await app.inject({ method: 'GET', url: `/api/system-control/operations?${query}`, headers: headers('owner') });
      expect(result.statusCode, `${query}: ${result.body}`).toBe(400);
    }
  });

  it('详情与列表一致、未知 ID 404，响应不泄露敏感字段', async () => {
    const seeded = await seedFacts();
    const list = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=screen_text', headers: headers('owner') });
    const item = list.json().items[0];
    const detail = await app.inject({ method: 'GET', url: `/api/system-control/operations/${item.operationId}`, headers: headers('owner') });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json()).toMatchObject({ operationId: item.operationId, domain: 'screen_text', requestId: 'request-screen-1', providerRequestId: 'provider-ocr-1', error: { code: 'OCR_TIMEOUT', retryable: true } });
    for (const forbidden of ['sensitive body', 'objectKey', 'secret', 'internal handle', 'SELECT', 'http://', 'https://']) {
      expect(detail.body.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
    const asrList = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=asr', headers: headers('owner') });
    const asr = await app.inject({ method: 'GET', url: `/api/system-control/operations/${asrList.json().items.find((entry: any) => entry.jobId === seeded.asrJob).operationId}`, headers: headers('owner') });
    expect(asr.statusCode).toBe(200);
    expect(asr.json().originalCurrency).toBe('USD');
    const missing = await app.inject({ method: 'GET', url: `/api/system-control/operations/asr:${uuid()}`, headers: headers('owner') });
    expect(missing.statusCode).toBe(404);
  });

  it('每个历史 Attempt 独立可发现，旧版本/费用/错误不被新 Attempt 覆盖，queued 无 Attempt 保留稳定 job 记录', async () => {
    const seeded = await seedFacts();
    const oldAttempt = uuid();
    await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,provider_request_id,error_code,error_detail,retryable,started_at,completed_at,created_at) VALUES($1,$2,2,'failed','provider-asr-old','ASR_OLD_FAILURE','old sensitive detail',true,CURRENT_TIMESTAMP - interval '10 minutes',CURRENT_TIMESTAMP - interval '9 minutes',CURRENT_TIMESTAMP - interval '10 minutes')`, [oldAttempt, seeded.asrJob]);
    await pool.query(`INSERT INTO asr_usage(attempt_id,provider,media_duration_ms,billing_unit,billing_quantity,currency,estimated_amount,final_amount,reconciliation_status,provider_request_id,original_currency,original_estimated_amount,original_final_amount,estimated_amount_cny,final_amount_cny) VALUES($1,'fake',1000,'minute',1,'USD',0.2,0.2,'unknown','provider-asr-old','USD',0.2,NULL,1.4,NULL)`, [oldAttempt]);
    const oldDeploymentVersion = uuid(); const oldRouting = uuid();
    await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,config_digest) VALUES($1,$2,2,'v0','zh-CN','{}',$3)`, [oldDeploymentVersion, seeded.asrDeployment, digest()]);
    await pool.query(`INSERT INTO routing_policy_versions(id,environment,workflow_stage,version) VALUES($1,'development','asr',2)`, [oldRouting]);
    await pool.query(`UPDATE asr_attempts SET deployment_version_id=$2,routing_version_id=$3 WHERE id=$1`, [oldAttempt, oldDeploymentVersion, oldRouting]);
    const queuedBatch = uuid(); const queuedJob = uuid();
    const project = await seedProject('operations-queued');
    await pool.query(`INSERT INTO asr_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,provider,adapter,model,language,config_digest,hotword_digest,hotword_term_count,hotword_alias_count,hotword_filtered_count,hotword_truncated_count,status) VALUES($1,$2,'single',ARRAY[1],$3,$4,1,'fake','fake-asr','v1','zh-CN',$5,$5,0,0,0,0,'queued')`, [queuedBatch, project.projectId, project.termVersionId, project.manifestId, digest()]);
    await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status) VALUES($1,$2,$3,1,$4,$5,'queued.mp4','sha256',$6,$7,$8,$8,'queued')`, [queuedJob, queuedBatch, project.projectId, project.manifestId, project.assetId, digest(), project.termVersionId, digest()]);
    const list = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=asr&sort=updated_desc&limit=1&offset=0', headers: headers('owner') });
    expect(list.statusCode).toBe(200);
    const all = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=asr&limit=20&sort=updated_desc', headers: headers('owner') });
    expect(all.json().total).toBe(3);
    expect(new Set(all.json().items.map((entry: any) => entry.operationId)).size).toBe(3);
    const old = all.json().items.find((entry: any) => entry.attemptId === oldAttempt);
    const current = all.json().items.find((entry: any) => entry.attemptId === seeded.asrAttempt);
    expect(old).toMatchObject({ requestId: 'dispatch-asr-1', amountCny: '1.400000', reconciliationStatus: 'unknown', routeDigest: null, routingTargetId: null, targetPriority: null, effectClass: null });
    expect(current).toBeDefined();
    expect(all.json().items.find((entry: any) => entry.jobId === queuedJob)).toMatchObject({ attemptId: null, status: 'queued' });
    expect(list.json().items).toHaveLength(1);
    const oldDetail = await app.inject({ method: 'GET', url: `/api/system-control/operations/${old.operationId}`, headers: headers('owner') });
    const currentDetail = await app.inject({ method: 'GET', url: `/api/system-control/operations/${all.json().items.find((entry: any) => entry.attemptId === seeded.asrAttempt).operationId}`, headers: headers('owner') });
    expect(oldDetail.json()).toMatchObject({ providerRequestId: 'provider-asr-old', requestId: 'dispatch-asr-1', engineDeploymentVersionId: oldDeploymentVersion, routingVersionId: oldRouting, error: { code: 'ASR_OLD_FAILURE', retryable: true } });
    expect(currentDetail.json()).toMatchObject({ providerRequestId: 'provider-asr-1', requestId: 'dispatch-asr-1', engineDeploymentVersionId: seeded.asrDeploymentVersion, routingVersionId: seeded.asrRouting });
  });

  it('Delivery 失败后恢复的每个 Attempt 保留自身 request/status/error', async () => {
    const seeded = await seedFacts();
    await pool.query(`UPDATE delivery_attempts SET status='generation_failed', request_id='delivery-failed-request', error_code='DELIVERY_GENERATION_FAILED', error_detail='old sensitive detail', completed_at=CURRENT_TIMESTAMP WHERE id=$1`, [seeded.deliveryAttempt]);
    const recoveryAttempt = uuid();
    await pool.query(`INSERT INTO delivery_attempts(id,delivery_id,status,stage,request_id,attempt_number,created_at,completed_at) VALUES($1,$2,'ready','generation','delivery-recovery-request',2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [recoveryAttempt, seeded.deliveryProduct]);
    await pool.query(`UPDATE delivery_products SET status='ready', request_id='product-current-request' WHERE id=$1`, [seeded.deliveryProduct]);

    const response = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=delivery&sort=updated_asc&limit=20', headers: headers('owner') });
    expect(response.statusCode, response.body).toBe(200);
    const items = response.json().items;
    expect(response.json().total).toBe(2);
    const failed = items.find((item: any) => item.attemptId === seeded.deliveryAttempt);
    const recovered = items.find((item: any) => item.attemptId === recoveryAttempt);
    expect(failed).toMatchObject({ requestId: 'delivery-failed-request', status: 'generation_failed' });
    expect(recovered).toMatchObject({ requestId: 'delivery-recovery-request', status: 'ready' });
    const failedDetail = await app.inject({ method: 'GET', url: `/api/system-control/operations/${failed.operationId}`, headers: headers('owner') });
    const recoveredDetail = await app.inject({ method: 'GET', url: `/api/system-control/operations/${recovered.operationId}`, headers: headers('owner') });
    expect(failedDetail.json()).toMatchObject({ requestId: 'delivery-failed-request', status: 'generation_failed', error: { code: 'DELIVERY_GENERATION_FAILED' } });
    expect(recoveredDetail.json()).toMatchObject({ requestId: 'delivery-recovery-request', status: 'ready', error: null });
    expect(failedDetail.json().attemptChain).toMatchObject([{ attemptId: seeded.deliveryAttempt, requestId: 'delivery-failed-request', status: 'generation_failed' }, { attemptId: recoveryAttempt, requestId: 'delivery-recovery-request', status: 'ready' }]);
    expect(recoveredDetail.json().attemptChain).toHaveLength(2);
    expect(failedDetail.body).not.toContain('old sensitive detail');
  });

  it('ASR/ScreenText 需对账优先于 final/pending 且列表详情一致', async () => {
    const seeded = await seedFacts();
    await pool.query(`UPDATE screen_text_attempts SET usage=jsonb_set(COALESCE(usage,'{}'::jsonb), '{reconciliationStatus}', '"pending"'::jsonb) WHERE id=$1`, [seeded.screenAttempt]);
    const initialAsr = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=asr', headers: headers('owner') });
    const initialScreen = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=screen_text', headers: headers('owner') });
    expect(initialAsr.json().items.find((item: any) => item.attemptId === seeded.asrAttempt).reconciliationStatus).toBe('final');
    expect(initialScreen.json().items.find((item: any) => item.attemptId === seeded.screenAttempt).reconciliationStatus).toBe('pending');

    await pool.query(`UPDATE asr_attempts SET status='reconciliation_required' WHERE id=$1`, [seeded.asrAttempt]);
    await pool.query(`UPDATE screen_text_attempts SET status='reconciliation_required' WHERE id=$1`, [seeded.screenAttempt]);
    const asrList = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=asr', headers: headers('owner') });
    const screenList = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=screen_text', headers: headers('owner') });
    const asrItem = asrList.json().items.find((item: any) => item.attemptId === seeded.asrAttempt);
    const screenItem = screenList.json().items.find((item: any) => item.attemptId === seeded.screenAttempt);
    expect(asrItem.reconciliationStatus).toBe('reconciliation_required');
    expect(screenItem.reconciliationStatus).toBe('reconciliation_required');
    const asrDetail = await app.inject({ method: 'GET', url: `/api/system-control/operations/${asrItem.operationId}`, headers: headers('owner') });
    const screenDetail = await app.inject({ method: 'GET', url: `/api/system-control/operations/${screenItem.operationId}`, headers: headers('owner') });
    expect(asrDetail.json().reconciliationStatus).toBe(asrItem.reconciliationStatus);
    expect(screenDetail.json().reconciliationStatus).toBe(screenItem.reconciliationStatus);
  });

  it('ASR 与 ScreenText 的有序本地→云前进链从持久 Attempt/Event 投影且读取零副作用', async () => {
    const seeded = await seedFacts();
    const asrTargetOne = uuid(); const asrTargetTwo = uuid(); const asrCloudVersion = uuid();
    await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,config_digest) VALUES($1,$2,2,'v2','zh-CN','{}',$3)`, [asrCloudVersion, seeded.asrDeployment, digest()]);
    await pool.query(`INSERT INTO routing_policy_targets(routing_target_id,routing_version_id,pool_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit) VALUES
      ($1,$3,'asr_api',$4,1,'preferred',2,1,10),($2,$3,'asr_api',$5,2,'standard',2,1,10)`, [asrTargetOne, asrTargetTwo, seeded.asrRouting, seeded.asrDeploymentVersion, asrCloudVersion]);
    await pool.query(`UPDATE asr_batches SET route_digest=$2 WHERE id=(SELECT batch_id FROM asr_jobs WHERE id=$1)`, [seeded.asrJob, digest()]);
    await pool.query(`UPDATE asr_jobs SET route_digest=$2 WHERE id=$1`, [seeded.asrJob, digest()]);
    await pool.query(`UPDATE asr_attempts SET status='failed',routing_target_id=$2,routing_target_priority=1,effect_class='external_not_accepted',external_side_effect_possible=false WHERE id=$1`, [seeded.asrAttempt, asrTargetOne]);
    const asrNextAttempt = uuid();
    await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,provider_request_id,routing_version_id,deployment_version_id,routing_target_id,routing_target_priority,effect_class,external_side_effect_possible,started_at,completed_at,created_at) VALUES($1,$2,2,'completed','provider-asr-cloud',$3,$4,$5,2,'completed',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [asrNextAttempt, seeded.asrJob, seeded.asrRouting, asrCloudVersion, asrTargetTwo]);
    const asrEvent = uuid();
    await pool.query(`INSERT INTO routing_advance_events(id,job_id,attempt_id,from_target_id,to_target_id,classification,provider_request_id,request_id,created_at) VALUES($1,$2,$3,$4,$5,'external_not_accepted','provider-asr-1','advance-asr-1',CURRENT_TIMESTAMP - interval '1 second')`, [asrEvent, seeded.asrJob, seeded.asrAttempt, asrTargetOne, asrTargetTwo]);

    const screenDeployment = uuid(); const screenVersionOne = uuid(); const screenVersionTwo = uuid(); const screenRouting = uuid();
    const screenTargetOne = uuid(); const screenTargetTwo = uuid();
    await pool.query(`INSERT INTO engine_deployments(id,capability,execution_kind,display_name,provider,adapter_key,status) VALUES($1,'screen_text','self_hosted_worker','operations OCR local','fake','fake-ocr-local','enabled')`, [screenDeployment]);
    await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,config_digest) VALUES($1,$2,1,'local-v1','zh-CN','{}',$3),($4,$2,2,'cloud-v2','zh-CN','{}',$5)`, [screenVersionOne, screenDeployment, digest(), screenVersionTwo, digest()]);
    await pool.query(`INSERT INTO routing_policy_versions(id,environment,workflow_stage,version) VALUES($1,'development','screen_text',1)`, [screenRouting]);
    await pool.query(`INSERT INTO routing_policy_targets(routing_target_id,routing_version_id,pool_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit) VALUES
      ($1,$3,'ocr_self_hosted_worker',$4,1,'preferred',2,1,10),($2,$3,'ocr_api',$5,2,'standard',2,1,10)`, [screenTargetOne, screenTargetTwo, screenRouting, screenVersionOne, screenVersionTwo]);
    await pool.query(`UPDATE screen_text_batches SET route_digest=$2 WHERE id=(SELECT batch_id FROM screen_text_jobs WHERE id=$1)`, [seeded.screenJob, digest()]);
    await pool.query(`UPDATE screen_text_jobs SET route_digest=$2,routing_version_id=$3,deployment_version_id=$4 WHERE id=$1`, [seeded.screenJob, digest(), screenRouting, screenVersionOne]);
    await pool.query(`UPDATE screen_text_attempts SET routing_version_id=$2,deployment_version_id=$3,routing_target_id=$4,routing_target_priority=1,effect_class='external_not_accepted',external_side_effect_possible=false WHERE id=$1`, [seeded.screenAttempt, screenRouting, screenVersionOne, screenTargetOne]);
    const screenNextAttempt = uuid();
    await pool.query(`INSERT INTO screen_text_attempts(id,job_id,attempt_number,status,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,input_digest,provider_request_id,receipt,stats,retryable,external_side_effect_possible,routing_version_id,deployment_version_id,routing_target_id,routing_target_priority,effect_class,created_at,completed_at) VALUES($1,$2,2,'completed','cloud_api','fake','fake-ocr','cloud-v2','zh-CN','operations','in','out','{}',$3,$3,'provider-ocr-cloud','simulated','{"candidateCount":1,"processingDurationMs":80}',false,false,$4,$5,$6,2,'completed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [screenNextAttempt, seeded.screenJob, digest(), screenRouting, screenVersionTwo, screenTargetTwo]);
    const screenEvent = uuid();
    await pool.query(`INSERT INTO routing_advance_events(id,job_id,attempt_id,from_target_id,to_target_id,classification,provider_request_id,request_id,created_at) VALUES($1,$2,$3,$4,$5,'external_not_accepted','provider-ocr-1','advance-screen-1',CURRENT_TIMESTAMP - interval '1 second')`, [screenEvent, seeded.screenJob, seeded.screenAttempt, screenTargetOne, screenTargetTwo]);

    const before = (await pool.query(`SELECT (SELECT COUNT(*) FROM asr_attempts)::int AS asr_attempts, (SELECT COUNT(*) FROM screen_text_attempts)::int AS screen_attempts, (SELECT COUNT(*) FROM routing_advance_events)::int AS advances`)).rows[0];
    const asrList = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=asr&limit=20&sort=updated_asc', headers: headers('owner') });
    const screenList = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=screen_text&limit=20&sort=updated_asc', headers: headers('owner') });
    expect(asrList.statusCode, asrList.body).toBe(200);
    expect(screenList.statusCode, screenList.body).toBe(200);
    const asrItems = asrList.json().items;
    const screenItems = screenList.json().items;
    expect(asrItems).toHaveLength(2);
    expect(screenItems).toHaveLength(2);
    expect(asrItems.find((item: any) => item.attemptId === seeded.asrAttempt)).toMatchObject({ routeDigest: expect.any(String), routingTargetId: asrTargetOne, targetPriority: 1, deploymentVersionId: seeded.asrDeploymentVersion, effectClass: 'external_not_accepted' });
    expect(screenItems.find((item: any) => item.attemptId === screenNextAttempt)).toMatchObject({ routingTargetId: screenTargetTwo, targetPriority: 2, deploymentVersionId: screenVersionTwo, effectClass: 'completed' });
    const asrDetail = await app.inject({ method: 'GET', url: `/api/system-control/operations/${asrItems[0].operationId}`, headers: headers('owner') });
    const screenDetail = await app.inject({ method: 'GET', url: `/api/system-control/operations/${screenItems[0].operationId}`, headers: headers('owner') });
    expect(asrDetail.statusCode, asrDetail.body).toBe(200);
    expect(screenDetail.statusCode, screenDetail.body).toBe(200);
    expect(asrDetail.json().attemptChain.map((attempt: any) => attempt.targetPriority)).toEqual([1, 2]);
    expect(screenDetail.json().attemptChain.map((attempt: any) => attempt.targetPriority)).toEqual([1, 2]);
    expect(asrDetail.json().routingAdvanceEvents).toMatchObject([{ fromAttemptId: seeded.asrAttempt, toAttemptId: asrNextAttempt, reasonCode: 'external_not_accepted', externalNotAccepted: true, externalSideEffectPossible: false }]);
    expect(screenDetail.json().routingAdvanceEvents).toMatchObject([{ fromAttemptId: seeded.screenAttempt, toAttemptId: screenNextAttempt, reasonCode: 'external_not_accepted', externalNotAccepted: true, externalSideEffectPossible: false }]);
    const after = (await pool.query(`SELECT (SELECT COUNT(*) FROM asr_attempts)::int AS asr_attempts, (SELECT COUNT(*) FROM screen_text_attempts)::int AS screen_attempts, (SELECT COUNT(*) FROM routing_advance_events)::int AS advances`)).rows[0];
    expect(after).toEqual(before);
  });

  it('UploadSession/CompletionJob 与 TermExtractionRun 纳入同一只读投影并保持脱敏', async () => {
    const seeded = await seedUploadTermsFacts();
    const before = (await pool.query(`SELECT
      (SELECT COUNT(*) FROM upload_sessions)::int AS uploads,
      (SELECT COUNT(*) FROM upload_completion_jobs)::int AS completion_jobs,
      (SELECT COUNT(*) FROM term_extraction_runs)::int AS term_runs`)).rows[0];

    const uploads = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=upload&sort=status_asc&limit=20', headers: headers('owner') });
    expect(uploads.statusCode, uploads.body).toBe(200);
    expect(uploads.json().total).toBe(4);
    expect(uploads.json().items.map((item: any) => item.domain)).toEqual(['upload', 'upload', 'upload', 'upload']);
    const uploadItems = uploads.json().items;
    expect(uploadItems.find((item: any) => item.taskId === seeded.completedUpload)).toMatchObject({ status: 'completed', reconciliationStatus: null, requestId: `upload-complete-${seeded.completedUpload}` });
    expect(uploadItems.find((item: any) => item.taskId === seeded.failedUpload)).toMatchObject({ status: 'failed', reconciliationStatus: null });
    expect(uploadItems.find((item: any) => item.taskId === seeded.runningUpload)).toMatchObject({ status: 'uploading', reconciliationStatus: null });
    const reconciliationItem = uploadItems.find((item: any) => item.taskId === seeded.reconciliationUpload);
    expect(reconciliationItem).toMatchObject({ status: 'reconciliation_required', reconciliationStatus: 'reconciliation_required' });

    const terms = await app.inject({ method: 'GET', url: '/api/system-control/operations?domain=terms&sort=updated_asc&limit=20', headers: headers('owner') });
    expect(terms.statusCode, terms.body).toBe(200);
    expect(terms.json().total).toBe(3);
    expect(terms.json().items.find((item: any) => item.taskId === seeded.completedRun)).toMatchObject({ domain: 'terms', status: 'completed', reconciliationStatus: null, requestId: `terms-request-${seeded.completedRun}` });
    expect(terms.json().items.find((item: any) => item.taskId === seeded.runningRun)).toMatchObject({ status: 'running', reconciliationStatus: null });
    expect(terms.json().items.find((item: any) => item.taskId === seeded.failedRun)).toMatchObject({ status: 'failed', reconciliationStatus: null });

    const filtered = await app.inject({ method: 'GET', url: `/api/system-control/operations?domain=upload&projectId=${seeded.uploadProject.projectId}&status=reconciliation_required&limit=1&offset=0`, headers: headers('owner') });
    expect(filtered.statusCode).toBe(200);
    expect(filtered.json()).toMatchObject({ total: 1, items: [{ operationId: `upload:${seeded.reconciliationUpload}`, projectId: seeded.uploadProject.projectId }] });
    const detail = await app.inject({ method: 'GET', url: `/api/system-control/operations/upload:${seeded.reconciliationUpload}`, headers: headers('owner') });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json()).toMatchObject({ operationId: `upload:${seeded.reconciliationUpload}`, domain: 'upload', status: 'reconciliation_required', error: { code: 'STORAGE_UNKNOWN', retryable: true, reconciliationRequired: true }, attemptChain: [] });
    const failedUploadDetail = await app.inject({ method: 'GET', url: `/api/system-control/operations/upload:${seeded.failedUpload}`, headers: headers('owner') });
    expect(failedUploadDetail.statusCode, failedUploadDetail.body).toBe(200);
    expect(failedUploadDetail.json()).toMatchObject({ domain: 'upload', status: 'failed', error: { code: 'UPLOAD_PART_INVALID', retryable: false, reconciliationRequired: false }, attemptChain: [] });
    const termsDetail = await app.inject({ method: 'GET', url: `/api/system-control/operations/terms:${seeded.failedRun}`, headers: headers('owner') });
    expect(termsDetail.statusCode, termsDetail.body).toBe(200);
    expect(termsDetail.json()).toMatchObject({ domain: 'terms', error: { code: 'TERM_EXTRACTION_FAILED', retryable: false, reconciliationRequired: false }, qualitySummary: { cueCount: 0, candidateCount: 0 } });
    for (const response of [uploads, terms, detail, failedUploadDetail, termsDetail]) {
      expect(response.body).not.toContain('objectKey');
      expect(response.body).not.toContain('private');
      expect(response.body).not.toContain('term body must not escape');
    }

    const after = (await pool.query(`SELECT
      (SELECT COUNT(*) FROM upload_sessions)::int AS uploads,
      (SELECT COUNT(*) FROM upload_completion_jobs)::int AS completion_jobs,
      (SELECT COUNT(*) FROM term_extraction_runs)::int AS term_runs`)).rows[0];
    expect(after).toEqual(before);
  });
});
