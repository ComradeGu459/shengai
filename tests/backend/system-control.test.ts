import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { createPool, type DatabasePoolBackgroundError } from '../../backend/src/database/pool.js';

const backgroundErrors: DatabasePoolBackgroundError[] = [];
const pool = createPool(undefined, { onBackgroundError: (event) => backgroundErrors.push(event) });
const adminPool = createPool();
const app = createApp({
  database: pool,
  systemControlPrincipalResolver: (request) => {
    const identity = request.headers['x-system-control-test-identity'];
    if (identity === 'owner') return { subject: 'owner', audience: 'system-control', capabilities: ['system-control:read'] };
    if (identity === 'employee') return { subject: 'employee', audience: 'employee', capabilities: ['system-control:read'] };
    if (identity === 'no-capability') return { subject: 'owner-without-capability', audience: 'system-control', capabilities: [] };
    return null;
  },
});

const request = (identity: 'owner' | 'employee' | 'no-capability' | null, url: string) => app.inject({
  method: 'GET', url, ...(identity ? { headers: { 'x-system-control-test-identity': identity } } : {}),
});

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const waitFor = async (predicate: () => Promise<boolean> | boolean, timeoutMs = 5_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(25);
  }
  throw new Error('等待 PostgreSQL 断连事实超时。');
};

const overviewUrl = '/api/system-control/overview?environment=development&window=24h';

const uuid = () => randomUUID();
const digest = () => 'a'.repeat(64);

type Base = { projectId: string; manifestId: string; termVersionId: string; assetId: string };

const seedBase = async (name: string): Promise<Base> => {
  const projectId = uuid(); const manifestId = uuid(); const draftId = uuid(); const termVersionId = uuid(); const assetId = uuid();
  await pool.query(`INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by)
    VALUES($1,$2,'ready','active',1,'system-test','system-test')`, [projectId, name]);
  await pool.query(`INSERT INTO material_manifests(id,project_id,version,root_name,created_by)
    VALUES($1,$2,1,'system-test','system-test')`, [manifestId, projectId]);
  await pool.query(`INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status)
    VALUES($1,$2,$3,'system-test','confirmed')`, [draftId, projectId, digest()]);
  await pool.query(`INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version)
    VALUES($1,$2,1,$3,$4,'system-test')`, [termVersionId, projectId, draftId, digest()]);
  await pool.query(`INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at)
    VALUES($1,$2,$3,'system-test.mp4','video',1234,'sha256',$4,CURRENT_TIMESTAMP)`, [assetId, projectId, `system-test/${assetId}`, digest()]);
  return { projectId, manifestId, termVersionId, assetId };
};

const seedAsr = async (base: Base) => {
  const batchId = uuid(); const completedJobId = uuid(); const pendingJobId = uuid(); const completedAttemptId = uuid(); const pendingAttemptId = uuid();
  await pool.query(`INSERT INTO asr_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,
      provider,adapter,model,language,config_digest,hotword_digest,hotword_term_count,hotword_alias_count,hotword_filtered_count,hotword_truncated_count,status)
    VALUES($1,$2,'all',ARRAY[1,2],$3,$4,1,'fake','deterministic_fake','deterministic-v1','zh-CN',$5,$5,0,0,0,0,'partial')`, [batchId, base.projectId, base.termVersionId, base.manifestId, digest()]);
  await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status)
    VALUES($1,$3, $2,1,$4,$5,'system-test.mp4','sha256',$6,$7,$8,$8,'completed')`, [completedJobId, base.projectId, batchId, base.manifestId, base.assetId, digest(), base.termVersionId, digest()]);
  await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,provider_request_id,completed_at,error_code,error_detail)
    VALUES($1,$2,1,'completed','asr-completed',CURRENT_TIMESTAMP,NULL,NULL)`, [completedAttemptId, completedJobId]);
  await pool.query('UPDATE asr_jobs SET current_attempt_id = $1 WHERE id = $2', [completedAttemptId, completedJobId]);
  await pool.query(`INSERT INTO asr_usage(attempt_id,provider,media_duration_ms,billing_unit,billing_quantity,currency,estimated_amount,final_amount,reconciliation_status,provider_request_id)
    VALUES($1,'fake',1000,'fake_call',1,'CNY',0.08,0.08,'final','asr-completed')`, [completedAttemptId]);
  await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status)
    VALUES($1,$3,$2,2,$4,$5,'system-test.mp4','sha256',$6,$7,$8,$8,'reconciliation_required')`, [pendingJobId, base.projectId, batchId, base.manifestId, base.assetId, digest(), base.termVersionId, digest()]);
  await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,provider_request_id,error_code,error_detail,external_side_effect_possible,completed_at)
    VALUES($1,$2,1,'reconciliation_required','asr-pending','ASR_UNKNOWN_RESULT','objectKey=private/path secret=do-not-return 热词=敏感词',TRUE,CURRENT_TIMESTAMP)`, [pendingAttemptId, pendingJobId]);
  await pool.query('UPDATE asr_jobs SET current_attempt_id = $1 WHERE id = $2', [pendingAttemptId, pendingJobId]);
  await pool.query(`INSERT INTO asr_usage(attempt_id,provider,media_duration_ms,billing_unit,billing_quantity,currency,estimated_amount,final_amount,reconciliation_status,provider_request_id)
    VALUES($1,'fake',1000,'fake_call',1,'USD',1.2,0,'pending','asr-pending')`, [pendingAttemptId]);
};

const seedPrecision = async (base: Base) => {
  const batchId = uuid();
  await pool.query(`INSERT INTO asr_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,
      provider,adapter,model,language,config_digest,hotword_digest,hotword_term_count,hotword_alias_count,hotword_filtered_count,hotword_truncated_count,status)
    VALUES($1,$2,'selected',ARRAY[1,2],$3,$4,1,'precise','precise_adapter','precise-v1','zh-CN',$5,$5,0,0,0,0,'partial')`, [batchId, base.projectId, base.termVersionId, base.manifestId, digest()]);
  for (const [episodeNumber, amount] of [[1, '0.1'], [2, '0.2']] as const) {
    const jobId = uuid(); const attemptId = uuid();
    await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status)
      VALUES($1,$3,$2,$4,$5,$6,'system-test.mp4','sha256',$7,$8,$9,$9,'completed')`, [jobId, base.projectId, batchId, episodeNumber, base.manifestId, base.assetId, digest(), base.termVersionId, digest()]);
    await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,provider_request_id,completed_at)
      VALUES($1,$2,1,'completed',$3,CURRENT_TIMESTAMP)`, [attemptId, jobId, `precise-${episodeNumber}`]);
    await pool.query('UPDATE asr_jobs SET current_attempt_id = $1 WHERE id = $2', [attemptId, jobId]);
    await pool.query(`INSERT INTO asr_usage(attempt_id,provider,media_duration_ms,billing_unit,billing_quantity,currency,estimated_amount,final_amount,reconciliation_status,provider_request_id)
      VALUES($1,'precise',1000,'precise_call',1,'CNY',$2,$2,'final',$3)`, [attemptId, amount, `precise-${episodeNumber}`]);
  }
  const oldJobId = uuid(); const oldAttemptId = uuid();
  await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status)
    VALUES($1,$3,$2,3,$4,$5,'system-test.mp4','sha256',$6,$7,$8,$8,'failed')`, [oldJobId, base.projectId, batchId, base.manifestId, base.assetId, digest(), base.termVersionId, digest()]);
  await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,provider_request_id,error_code,completed_at,created_at)
    VALUES($1,$2,1,'failed','old-failure','OLD_FAILURE',CURRENT_TIMESTAMP - interval '48 hours',CURRENT_TIMESTAMP - interval '48 hours')`, [oldAttemptId, oldJobId]);
  await pool.query('UPDATE asr_jobs SET current_attempt_id = $1, updated_at = CURRENT_TIMESTAMP - interval \'48 hours\', created_at = CURRENT_TIMESTAMP - interval \'48 hours\' WHERE id = $2', [oldAttemptId, oldJobId]);
};

const seedScreenText = async (base: Base) => {
  const apiBatchId = uuid(); const apiJobId = uuid(); const apiAttemptId = uuid();
  const workerBatchId = uuid(); const workerJobId = uuid();
  const batchValues = (batchId: string, executionKind: string, provider: string, status: string, requestId: string) => pool.query(`INSERT INTO screen_text_batches(
      id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,frame_strategy_version,dedupe_strategy_version,term_projection,term_projection_entries,status,request_id)
    VALUES($1,$2,'single',ARRAY[1],$3,$4,1,$5,$6,$7,'system-test','zh-CN',$8,'input-v1','output-v1','{}',$9,'frames-v1','dedupe-v1','{}','[]',$10,$11)`, [batchId, base.projectId, base.termVersionId, base.manifestId, executionKind, provider, `adapter-${provider}`, executionKind === 'cloud_api' ? 'external_api' : 'worker_pool', digest(), status, requestId]);
  await batchValues(apiBatchId, 'cloud_api', 'cloud_stub', 'completed', 'ocr-api-request');
  await pool.query(`INSERT INTO screen_text_jobs(id,batch_id,project_id,episode_number,asset_id,status)
    VALUES($1,$2,$3,1,$4,'completed')`, [apiJobId, apiBatchId, base.projectId, base.assetId]);
  await pool.query(`INSERT INTO screen_text_attempts(id,job_id,attempt_number,status,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,input_digest,provider_request_id,usage,completed_at)
    VALUES($1,$2,1,'completed','cloud_api','cloud_stub','screen_text_cloud_stub','system-test','zh-CN','external_api','input-v1','output-v1','{}',$3,$3,'ocr-api-request',$4,CURRENT_TIMESTAMP)`, [apiAttemptId, apiJobId, digest(), JSON.stringify({ provider: 'cloud_stub', billingUnit: 'image', billingQuantity: 8, currency: 'USD', estimatedAmount: '0.08', finalAmount: '0.08', reconciliationStatus: 'final', providerRequestId: 'ocr-api-request' })]);
  await pool.query('UPDATE screen_text_jobs SET current_attempt_id = $1 WHERE id = $2', [apiAttemptId, apiJobId]);
  await batchValues(workerBatchId, 'self_hosted_worker', 'self_hosted_stub', 'queued', 'ocr-worker-request');
  await pool.query(`INSERT INTO screen_text_jobs(id,batch_id,project_id,episode_number,asset_id,status)
    VALUES($1,$2,$3,1,$4,'queued')`, [workerJobId, workerBatchId, base.projectId, base.assetId]);
};

const seedDelivery = async (base: Base) => {
  const preSessionId = uuid(); const preReleaseId = uuid(); const sessionId = uuid(); const episodeId = uuid(); const acceptanceReleaseId = uuid(); const deliveryId = uuid(); const deliveryJobId = uuid(); const deliveryAttemptId = uuid();
  const fixtureTime = (await pool.query<{ fixture_time: Date }>('SELECT CURRENT_TIMESTAMP AS fixture_time')).rows[0]!.fixture_time;
  await pool.query(`INSERT INTO pre_edit_sessions(id,project_id,project_version,source_srt_set_digest,term_version_id,manifest_id,manifest_version,source_digest,source_snapshot,algorithm_version,format_policy_version,status)
    VALUES($1,$2,1,$3,$4,$5,1,$6,'{}','system-test','system-test','completed')`, [preSessionId, base.projectId, digest(), base.termVersionId, base.manifestId, digest()]);
  await pool.query(`INSERT INTO pre_edit_releases(id,project_id,session_id,version,source_digest,decision_digest,release_digest)
    VALUES($1,$2,$3,1,$4,$5,$6)`, [preReleaseId, base.projectId, preSessionId, digest(), digest(), digest()]);
  await pool.query(`INSERT INTO acceptance_sessions(id,project_id,project_version,pre_edit_release_id,pre_edit_head_release_id,manifest_id,manifest_version,term_version_id,rule_version,source_digest,source_snapshot,status,revision)
    VALUES($1,$2,1,$3,$3,$4,1,$5,'system-test',$6,'{}','released',2)`, [sessionId, base.projectId, preReleaseId, base.manifestId, base.termVersionId, digest()]);
  await pool.query(`INSERT INTO acceptance_episodes(id,session_id,episode_number,available_videos,selected_video_asset_id,authoritative_duration_ms,status,pass_signature,passed_at)
    VALUES($1,$2,1,'[]',$3,1000,'passed',$4,CURRENT_TIMESTAMP)`, [episodeId, sessionId, base.assetId, digest()]);
  await pool.query(`INSERT INTO acceptance_releases(id,project_id,session_id,version,source_digest,acceptance_digest,cue_count)
    VALUES($1,$2,$3,1,$4,$5,0)`, [acceptanceReleaseId, base.projectId, sessionId, digest(), digest()]);
  await pool.query(`INSERT INTO delivery_products(id,project_id,acceptance_session_id,acceptance_release_id,version,name,status,owner,note,request_id,source_snapshot,file_summary,created_at,updated_at)
    VALUES($1,$2,$3,$4,1,'System Test Delivery','ready','owner','note','delivery-request','{}','{}',$5,$5)`, [deliveryId, base.projectId, sessionId, acceptanceReleaseId, fixtureTime]);
  await pool.query(`INSERT INTO delivery_jobs(id,delivery_id,status,created_at,updated_at) VALUES($1,$2,'ready',$3,$3)`, [deliveryJobId, deliveryId, fixtureTime]);
  await pool.query(`INSERT INTO delivery_attempts(id,delivery_id,status,stage,request_id,attempt_number,created_at,completed_at) VALUES($1,$2,'ready','completed','delivery-request',1,$3,$3)`, [deliveryAttemptId, deliveryId, fixtureTime]);
};

const seedReviewPending = async (base: Base) => {
  const batchId = uuid();
  const episodes = Array.from({ length: 45 }, (_, index) => index + 1);
  await pool.query(`INSERT INTO screen_text_batches(
      id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,frame_strategy_version,dedupe_strategy_version,term_projection,term_projection_entries,status,request_id)
    VALUES($1,$2,'selected',$3,$4,$5,1,'self_hosted_worker','local','local_adapter','local-v1','zh-CN','worker_pool','input-v1','output-v1','{}',$6,'frames-v1','dedupe-v1','{}','[]','review_pending','review-pending')`, [batchId, base.projectId, episodes, base.termVersionId, base.manifestId, digest()]);
  for (const episodeNumber of episodes) {
    await pool.query(`INSERT INTO screen_text_jobs(id,batch_id,project_id,episode_number,asset_id,status,created_at,updated_at)
      VALUES($1,$2,$3,$4,$5,'review_pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [uuid(), batchId, base.projectId, episodeNumber, base.assetId]);
  }
};

const seedHistoricalAsrFacts = async (base: Base) => {
  const batchId = uuid();
  const episodes = Array.from({ length: 72 }, (_, index) => index + 1);
  await pool.query(`INSERT INTO asr_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,
      provider,adapter,model,language,config_digest,hotword_digest,hotword_term_count,hotword_alias_count,hotword_filtered_count,hotword_truncated_count,status)
    VALUES($1,$2,'selected',$3,$4,$5,1,'history','history_adapter','history-v1','zh-CN',$6,$6,0,0,0,0,'partial')`, [batchId, base.projectId, episodes, base.termVersionId, base.manifestId, digest()]);
  for (let index = 0; index < episodes.length; index += 1) {
    const episodeNumber = episodes[index]!;
    const status = index < 22 ? 'failed' : 'completed';
    const jobId = uuid(); const attemptId = uuid();
    await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status,created_at,updated_at)
      VALUES($1,$3,$2,$4,$5,$6,'system-test.mp4','sha256',$7,$8,$9,$9,$10,CURRENT_TIMESTAMP - interval '2 hours',CURRENT_TIMESTAMP - interval '2 hours')`, [jobId, base.projectId, batchId, episodeNumber, base.manifestId, base.assetId, digest(), base.termVersionId, digest(), status]);
    await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,provider_request_id,error_code,lease_owner,lease_expires_at,completed_at,created_at)
      VALUES($1,$2,1,$3,$4,$5,'historical-worker',CURRENT_TIMESTAMP - interval '3 hours',CURRENT_TIMESTAMP - interval '2 hours',CURRENT_TIMESTAMP - interval '2 hours')`, [attemptId, jobId, status, `history-${episodeNumber}`, index < 22 ? 'localPolicyBlocked' : null]);
    await pool.query('UPDATE asr_jobs SET current_attempt_id = $1 WHERE id = $2', [attemptId, jobId]);
  }
};

const seedCurrentFailures = async (asrBase: Base, screenBase: Base) => {
  const asrBatchId = uuid(); const asrJobId = uuid(); const asrAttemptId = uuid();
  await pool.query(`INSERT INTO asr_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,
      provider,adapter,model,language,config_digest,hotword_digest,hotword_term_count,hotword_alias_count,hotword_filtered_count,hotword_truncated_count,status)
    VALUES($1,$2,'single',ARRAY[1],$3,$4,1,'current','current_adapter','current-v1','zh-CN',$5,$5,0,0,0,0,'running')`, [asrBatchId, asrBase.projectId, asrBase.termVersionId, asrBase.manifestId, digest()]);
  await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status)
    VALUES($1,$3,$2,1,$4,$5,'system-test.mp4','sha256',$6,$7,$8,$8,'running')`, [asrJobId, asrBase.projectId, asrBatchId, asrBase.manifestId, asrBase.assetId, digest(), asrBase.termVersionId, digest()]);
  await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,provider_request_id,error_code,error_detail,completed_at)
    VALUES($1,$2,1,'failed','current-failure','CURRENT_FAILURE','current failure',CURRENT_TIMESTAMP)`, [asrAttemptId, asrJobId]);
  await pool.query('UPDATE asr_jobs SET current_attempt_id = $1 WHERE id = $2', [asrAttemptId, asrJobId]);

  const batchId = uuid(); const expiredJobId = uuid(); const expiredAttemptId = uuid(); const reconciliationJobId = uuid(); const reconciliationAttemptId = uuid();
  await pool.query(`INSERT INTO screen_text_batches(
      id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,frame_strategy_version,dedupe_strategy_version,term_projection,term_projection_entries,status,request_id)
    VALUES($1,$2,'selected',ARRAY[1,2],$3,$4,1,'self_hosted_worker','current','current_adapter','current-v1','zh-CN','worker_pool','input-v1','output-v1','{}',$5,'frames-v1','dedupe-v1','{}','[]','running','current-screen')`, [batchId, screenBase.projectId, screenBase.termVersionId, screenBase.manifestId, digest()]);
  await pool.query(`INSERT INTO screen_text_jobs(id,batch_id,project_id,episode_number,asset_id,status)
    VALUES($1,$2,$3,1,$4,'running')`, [expiredJobId, batchId, screenBase.projectId, screenBase.assetId]);
  await pool.query(`INSERT INTO screen_text_attempts(id,job_id,attempt_number,status,lease_owner,lease_expires_at,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,input_digest,provider_request_id)
    VALUES($1,$2,1,'running','current-worker',CURRENT_TIMESTAMP - interval '1 minute','self_hosted_worker','current','current_adapter','current-v1','zh-CN','worker_pool','input-v1','output-v1','{}',$3,$3,'current-expired')`, [expiredAttemptId, expiredJobId, digest()]);
  await pool.query('UPDATE screen_text_jobs SET current_attempt_id = $1 WHERE id = $2', [expiredAttemptId, expiredJobId]);
  await pool.query(`INSERT INTO screen_text_jobs(id,batch_id,project_id,episode_number,asset_id,status)
    VALUES($1,$2,$3,2,$4,'reconciliation_required')`, [reconciliationJobId, batchId, screenBase.projectId, screenBase.assetId]);
  await pool.query(`INSERT INTO screen_text_attempts(id,job_id,attempt_number,status,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,input_digest,provider_request_id,error_code)
    VALUES($1,$2,1,'reconciliation_required','self_hosted_worker','current','current_adapter','current-v1','zh-CN','worker_pool','input-v1','output-v1','{}',$3,$3,'current-reconciliation','RECONCILIATION_REQUIRED')`, [reconciliationAttemptId, reconciliationJobId, digest()]);
  await pool.query('UPDATE screen_text_jobs SET current_attempt_id = $1 WHERE id = $2', [reconciliationAttemptId, reconciliationJobId]);
};

beforeAll(async () => { await app.ready(); });
beforeEach(async () => {
  backgroundErrors.length = 0;
  await pool.query('TRUNCATE project_commands, projects CASCADE');
});
afterAll(async () => {
  await app.close();
  await adminPool.end();
});

describe('BACK-SYSTEM-02A 系统控制台真实运行总览', () => {
  it('默认拒绝、员工 audience 拒绝，控制台 read 主体可读且四池隔离', async () => {
    expect((await request(null, '/api/system-control/overview?environment=development&window=24h')).statusCode).toBe(403);
    expect((await request('employee', '/api/system-control/overview?environment=development&window=24h')).statusCode).toBe(403);
    expect((await request('no-capability', '/api/system-control/overview?environment=development&window=24h')).statusCode).toBe(403);
    const asr = await seedBase('ASR'); const screen = await seedBase('OCR'); const delivery = await seedBase('Delivery');
    await seedAsr(asr); await seedScreenText(screen); await seedDelivery(delivery);
    const response = await request('owner', '/api/system-control/overview?environment=development&window=24h');
    expect(response.statusCode, response.body).toBe(200);
    const overview = response.json();
    expect((await request('employee', '/api/system-control/overview?environment=development&window=24h')).statusCode).toBe(403);
    expect((await request('owner', '/api/system-control/overview?environment=development&window=24h')).statusCode).toBe(200);
    expect((await request('owner', '/api/system-control/overview')).statusCode).toBe(200);
    expect(overview.resourcePools.map((pool: any) => pool.id)).toEqual(['asr_api', 'ocr_api', 'ocr_self_hosted_worker', 'delivery_generation']);
    expect(overview.resourcePools.find((pool: any) => pool.id === 'asr_api')).toMatchObject({ completedCount: 1, reconciliationRequiredCount: 1 });
    expect(overview.resourcePools.find((pool: any) => pool.id === 'ocr_api')).toMatchObject({ completedCount: 1, queueDepth: 0 });
    expect(overview.resourcePools.find((pool: any) => pool.id === 'ocr_self_hosted_worker')).toMatchObject({ queueDepth: 1, completedCount: 0 });
    expect(overview.resourcePools.find((pool: any) => pool.id === 'delivery_generation')).toMatchObject({ completedCount: 1, queueDepth: 0 });
    expect(overview.resourcePools.find((pool: any) => pool.id === 'asr_api').identities).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: 'fake', adapter: 'deterministic_fake', model: 'deterministic-v1', jobCount: 2 }),
    ]));
    expect(overview.resourcePools.find((pool: any) => pool.id === 'ocr_api').identities).toEqual(expect.arrayContaining([
      expect.objectContaining({ executionKind: 'cloud_api', provider: 'cloud_stub', adapter: 'screen_text_cloud_stub' }),
    ]));
    expect(overview.resourcePools.find((pool: any) => pool.id === 'ocr_self_hosted_worker').identities).toEqual(expect.arrayContaining([
      expect.objectContaining({ executionKind: 'self_hosted_worker', provider: 'self_hosted_stub' }),
    ]));
    expect(overview.resourcePools.find((pool: any) => pool.id === 'ocr_api').cost.byCurrency).toEqual([
      expect.objectContaining({ currency: 'USD', finalAmount: '0.080000' }),
    ]);
    expect(overview.resourcePools.find((pool: any) => pool.id === 'ocr_self_hosted_worker').cost).toEqual({ byCurrency: [], pendingCount: 0, unknownCount: 0 });
    expect(overview.metrics.cost.byCurrency).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: 'CNY', finalAmount: '0.080000' }),
      expect.objectContaining({ currency: 'USD', pendingCount: 1, finalAmount: null }),
    ]));
    expect(overview.metrics.storage).toMatchObject({ status: 'unknown', objectStorageBytes: null, capacityBytes: null });
    expect(overview.pendingConfiguration).toEqual({ status: 'not_configured', items: [] });
    expect(overview.recentAudit).toEqual({ status: 'not_configured', items: [] });
    expect(JSON.stringify(overview)).not.toMatch(/objectKey|secret|热词|提示词|do-not-return|private\/path/i);
  });

  it('无数据返回 empty/unknown、固定 UTC 24 个小时桶，读取不写入领域表', async () => {
    const before = await pool.query<{ batches: string; screenBatches: string; products: string }>(`SELECT
      (SELECT count(*)::text FROM asr_batches) AS batches,
      (SELECT count(*)::text FROM screen_text_batches) AS "screenBatches",
      (SELECT count(*)::text FROM delivery_products) AS products`);
    const response = await request('owner', '/api/system-control/overview?environment=development&window=24h');
    expect(response.statusCode, response.body).toBe(200);
    const overview = response.json();
    expect(overview.overallStatus).toBe('empty');
    expect(overview.resourcePools.every((pool: any) => pool.status === 'empty')).toBe(true);
    expect(overview.trends.throughput).toHaveLength(24);
    expect(overview.trends.throughput.every((point: any) => point.hasFact === false && point.value === null)).toBe(true);
    expect(overview.freshness.timezone).toBe('UTC');
    for (let index = 1; index < overview.trends.throughput.length; index += 1) {
      expect(new Date(overview.trends.throughput[index].bucketStart).getTime() - new Date(overview.trends.throughput[index - 1].bucketStart).getTime()).toBe(3_600_000);
    }
    const after = await pool.query<{ batches: string; screenBatches: string; products: string }>(`SELECT
      (SELECT count(*)::text FROM asr_batches) AS batches,
      (SELECT count(*)::text FROM screen_text_batches) AS "screenBatches",
      (SELECT count(*)::text FROM delivery_products) AS products`);
    expect(after.rows[0]).toEqual(before.rows[0]);
  });

  it('真实 PostgreSQL idle client 57P01 由池接管，查询错误返回 500 后同一 app 可恢复', async () => {
    const first = await request('owner', overviewUrl);
    expect(first.statusCode, first.body).toBe(200);

    const idleClient = await pool.connect();
    const idlePid = (await idleClient.query<{ pid: string }>('SELECT pg_backend_pid()::text AS pid')).rows[0]!.pid;
    idleClient.release();
    await adminPool.query('SELECT pg_terminate_backend($1)', [idlePid]);
    await waitFor(() => backgroundErrors.some((event) => event.kind === 'idle_client_error' && event.code === '57P01'));
    expect(backgroundErrors.every((event) => Object.keys(event).every((key) => ['kind', 'code'].includes(key)))).toBe(true);

    const blocker = await adminPool.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query('LOCK TABLE asr_jobs IN ACCESS EXCLUSIVE MODE');
      const failedRequest = request('owner', overviewUrl);
      await waitFor(async () => {
        const result = await adminPool.query<{ pid: string }>(`SELECT pid::text AS pid
          FROM pg_stat_activity
          WHERE datname = current_database()
            AND wait_event_type = 'Lock'
            AND pid <> pg_backend_pid()
            AND query LIKE '%asr_jobs%'`);
        return result.rows.length > 0;
      });
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const result = await adminPool.query<{ pid: string }>(`SELECT pid::text AS pid
          FROM pg_stat_activity
          WHERE datname = current_database()
            AND wait_event_type = 'Lock'
            AND pid <> pg_backend_pid()
            AND query LIKE '%asr_jobs%'`);
        const pids = [...new Set(result.rows.map((row) => row.pid))];
        if (pids.length === 0) break;
        await Promise.all(pids.map((pid) => adminPool.query('SELECT pg_terminate_backend($1)', [pid])));
        await delay(25);
      }
      const failed = await Promise.race([
        failedRequest,
        delay(5_000).then(() => { throw new Error('等待断连期间的 overview 失败响应超时。'); }),
      ]);
      expect(failed.statusCode, failed.body).toBe(500);
      expect(failed.json().error).toMatchObject({ code: 'INTERNAL_ERROR', retryable: true });
      expect(failed.json().error.requestId).toEqual(expect.any(String));
    } finally {
      await blocker.query('ROLLBACK').catch(() => undefined);
      blocker.release();
    }

    const recovered = await request('owner', overviewUrl);
    expect(recovered.statusCode, recovered.body).toBe(200);
  });

  it('PostgreSQL numeric 汇总保持 0.1 + 0.2 精度，旧窗口外失败不污染当前健康', async () => {
    const base = await seedBase('Precision');
    await seedPrecision(base);
    const response = await request('owner', '/api/system-control/overview?environment=development&window=24h');
    expect(response.statusCode, response.body).toBe(200);
    const overview = response.json();
    expect(overview.resourcePools.find((pool: any) => pool.id === 'asr_api')).toMatchObject({ status: 'healthy', completedCount: 2, failedCount: 0 });
    expect(overview.metrics.cost.byCurrency).toEqual([
      expect.objectContaining({ currency: 'CNY', estimatedAmount: '0.300000', finalAmount: '0.300000', pendingCount: 0, unknownCount: 0 }),
    ]);
  });

  it('历史失败/过期租约与 review_pending 不污染当前状态或异常', async () => {
    const reviewBase = await seedBase('Review pending');
    const historyBase = await seedBase('Historical facts');
    await seedReviewPending(reviewBase);
    await seedHistoricalAsrFacts(historyBase);

    const response = await request('owner', overviewUrl);
    expect(response.statusCode, response.body).toBe(200);
    const overview = response.json();
    const asr = overview.resourcePools.find((pool: any) => pool.id === 'asr_api');
    const worker = overview.resourcePools.find((pool: any) => pool.id === 'ocr_self_hosted_worker');
    expect(overview.overallStatus).toBe('healthy');
    expect(asr).toMatchObject({ status: 'healthy', failedCount: 22, reconciliationRequiredCount: 0 });
    expect(worker).toMatchObject({ status: 'healthy', queueDepth: 0, runningCount: 0, failedCount: 0 });
    expect(overview.anomalies).toEqual([]);
  });

  it('当前失败、过期执行租约与对账事实继续驱动状态和异常契约', async () => {
    const asrBase = await seedBase('Current ASR failure');
    const screenBase = await seedBase('Current OCR issues');
    await seedCurrentFailures(asrBase, screenBase);

    const response = await request('owner', overviewUrl);
    expect(response.statusCode, response.body).toBe(200);
    const overview = response.json();
    const asr = overview.resourcePools.find((pool: any) => pool.id === 'asr_api');
    const worker = overview.resourcePools.find((pool: any) => pool.id === 'ocr_self_hosted_worker');
    expect(overview.overallStatus).toBe('failed');
    expect(asr).toMatchObject({ status: 'failed', failedCount: 0, runningCount: 1 });
    expect(worker).toMatchObject({ status: 'degraded', runningCount: 1, reconciliationRequiredCount: 1 });
    expect(overview.anomalies).toEqual(expect.arrayContaining([
      expect.objectContaining({ resourcePool: 'asr_api', kind: 'failed', reasonCode: 'CURRENT_FAILURE' }),
      expect.objectContaining({ resourcePool: 'ocr_self_hosted_worker', kind: 'lease_expired' }),
      expect.objectContaining({ resourcePool: 'ocr_self_hosted_worker', kind: 'reconciliation_required', reasonCode: 'RECONCILIATION_REQUIRED' }),
    ]));
  });

  it('HTTP 环境与窗口只接受本切片固定边界', async () => {
    const production = await request('owner', '/api/system-control/overview?environment=production&window=24h');
    const oneHour = await request('owner', '/api/system-control/overview?environment=development&window=1h');
    expect(production.statusCode).toBe(400);
    expect(oneHour.statusCode).toBe(400);
    expect(production.json().error.code).toBe('REQUEST_VALIDATION_FAILED');
  });
});
