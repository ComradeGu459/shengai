import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { SystemControlStrategyRuntimeService } from '../../backend/src/modules/system-control/system-control.strategy-runtime.service.js';
import { SystemControlStrategyRuntimeWorker } from '../../backend/src/workers/system-control.strategy-runtime.worker.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');
let databaseName: string; let admin: any; let pool: any; let app: any; let runtime: SystemControlStrategyRuntimeService;
let baselineVersionId = ''; let baselineImpactRunId = ''; let baselineApprovalId = ''; let baselineContentDigest = '';
const owner = { subject: 'runtime-owner', audience: 'system-control', capabilities: [
  'system-control:strategy:read', 'system-control:strategy:write', 'system-control:strategy:evaluate',
  'system-control:strategy:approve', 'system-control:strategy:release',
] };
const headers = (identity: 'owner' | 'none', key?: string) => ({ 'x-system-control-test-identity': identity, ...(key ? { 'idempotency-key': key } : {}) });
const rulePack = (overrides: Record<string, unknown> = {}) => ({ payloadType: 'pre_review_local_rule_pack_v1', alignmentNearbyGapMs: 350, alignmentSimilarityThreshold: 0.75, maxCharacters: 28, forbidSentencePunctuation: true, forbidMarkup: true, forbidBrackets: true, requireSpeakerDashForMultipleLines: true, ...overrides });

beforeAll(async () => {
  const source = new URL(getDatabaseUrl()); const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  databaseName = `qimao_runtime_strategy_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 }); await admin.query(`CREATE DATABASE "${databaseName}"`);
  const databaseUrl = new URL(source); databaseUrl.pathname = `/${databaseName}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: `${backendRoot}/migrations`, direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  app = createApp({ database: pool, systemControlPrincipalResolver: (request) => request.headers['x-system-control-test-identity'] === 'owner' ? owner : null });
  runtime = new SystemControlStrategyRuntimeService(pool); await app.ready();
  const empty = await pool.query(`SELECT (SELECT count(*) FROM strategy_artifact_versions WHERE source='system_baseline') AS versions, (SELECT count(*) FROM strategy_runtime_active_pointers) AS pointers, (SELECT count(*) FROM strategy_runtime_impact_runs) AS impacts, (SELECT count(*) FROM strategy_runtime_release_commands) AS releases`);
  expect(empty.rows[0]).toMatchObject({ versions: '0', pointers: '0', impacts: '0', releases: '0' });
});

afterAll(async () => { if (app) await app.close(); if (admin && databaseName) { await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [databaseName]); await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`); } if (admin) await admin.end(); });

// 只构造已有前置审改的持久事实；运行控制的 artifact/version/impact/approval 全部走正式 HTTP/Worker。
const seedImpactSample = async (strategyVersionId: string, contentDigest: string) => {
  const projectId = randomUUID(); const manifestId = randomUUID(); const companyAssetId = randomUUID(); const videoAssetId = randomUUID(); const draftId = randomUUID(); const termVersionId = randomUUID(); const batchId = randomUUID(); const jobId = randomUUID(); const attemptId = randomUUID(); const resultId = randomUUID(); const sessionId = randomUUID(); const episodeId = randomUUID(); const groupId = randomUUID(); const itemId = randomUUID(); const asrCueId = randomUUID(); const companyCueId = `runtime-${randomUUID()}`; const sourceDigest = 'a'.repeat(64); const configDigest = 'b'.repeat(64); const hotwordDigest = 'c'.repeat(64);
  await pool.query(`INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,'runtime sample','ready','active',1,'test','test')`, [projectId]);
  await pool.query(`INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'runtime','test')`, [manifestId, projectId]);
  await pool.query(`INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$3,$6,'company.srt','srt',1,'sha256',$4,CURRENT_TIMESTAMP),($2,$3,$7,'video.mp4','video',1,'sha256',$5,CURRENT_TIMESTAMP)`, [companyAssetId, videoAssetId, projectId, sourceDigest, hotwordDigest, `runtime/${projectId}/company.srt`, `runtime/${projectId}/video.mp4`]);
  await pool.query(`INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'runtime','confirmed')`, [draftId, projectId, sourceDigest]);
  await pool.query(`INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version) VALUES($1,$2,1,$3,$4,'runtime')`, [termVersionId, projectId, draftId, sourceDigest]);
  await pool.query(`INSERT INTO term_cues(id,project_id,source_srt_set_digest,asset_id,episode_number,cue_index,start_ms,end_ms,text) VALUES($1,$2,$3,$4,1,1,1000,1800,'你好')`, [companyCueId, projectId, sourceDigest, companyAssetId]);
  await pool.query(`INSERT INTO asr_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,provider,adapter,model,language,config_digest,hotword_digest,hotword_term_count,hotword_alias_count,hotword_filtered_count,hotword_truncated_count,force_new_recognition,status) VALUES($1,$2,'single',ARRAY[1],$3,$4,1,'fake','deterministic_fake','runtime','zh-CN',$5,$6,0,0,0,0,false,'completed')`, [batchId, projectId, termVersionId, manifestId, configDigest, hotwordDigest]);
  await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status) VALUES($1,$2,$3,1,$4,$5,'video.mp4','sha256',$6,$7,$8,$9,'completed')`, [jobId, batchId, projectId, manifestId, videoAssetId, hotwordDigest, termVersionId, configDigest, hotwordDigest]);
  await pool.query(`INSERT INTO asr_attempts(id,job_id,attempt_number,status,started_at,completed_at) VALUES($1,$2,1,'completed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [attemptId, jobId]);
  await pool.query(`INSERT INTO asr_results(id,source_job_id,attempt_id,project_id,episode_number,revision,asset_id,term_version_id,config_digest,hotword_digest,quality_status,quality_summary) VALUES($1,$2,$3,$4,1,1,$5,$6,$7,$8,'pass','{}')`, [resultId, jobId, attemptId, projectId, videoAssetId, termVersionId, configDigest, hotwordDigest]);
  await pool.query(`INSERT INTO asr_cues(id,result_id,cue_index,start_ms,end_ms,text,confidence) VALUES($1,$2,1,1000,1800,'你好',0.99)`, [asrCueId, resultId]);
  await pool.query(`UPDATE asr_jobs SET current_attempt_id=$2,current_result_id=$3 WHERE id=$1`, [jobId, attemptId, resultId]);
  await pool.query(`INSERT INTO pre_edit_sessions(id,project_id,project_version,source_srt_set_digest,term_version_id,manifest_id,manifest_version,source_digest,source_snapshot,algorithm_version,format_policy_version,status,strategy_version_id,strategy_content_digest) VALUES($1,$2,1,$3,$4,$5,1,$3,'{}','runtime','runtime','ready',$6,$7)`, [sessionId, projectId, sourceDigest, termVersionId, manifestId, strategyVersionId, contentDigest]);
  await pool.query(`INSERT INTO pre_edit_episodes(id,session_id,episode_number,company_asset_id,asr_result_id,asr_result_digest,asr_asset_id,asr_term_version_id,asr_provider,asr_adapter,asr_model,asr_language,asr_config_digest,asr_hotword_digest,asr_quality_status,video_asset_id,video_checksum_value,status) VALUES($1,$2,1,$3,$4,$5,$6,$7,'fake','deterministic_fake','runtime','zh-CN',$8,$9,'pass',$6,$10,'ready')`, [episodeId, sessionId, companyAssetId, resultId, sourceDigest, videoAssetId, termVersionId, configDigest, hotwordDigest, hotwordDigest]);
  await pool.query(`INSERT INTO pre_edit_alignment_groups(id,session_id,episode_id,kind,company_cue_ids,asr_cue_ids,time_overlap_ms,text_similarity,algorithm_version,digest) VALUES($1,$2,$3,'one_to_one',$4::varchar[],$5::uuid[],800,1,'runtime',$6)`, [groupId, sessionId, episodeId, [companyCueId], [asrCueId], 'd'.repeat(64)]);
  await pool.query(`INSERT INTO pre_edit_items(id,session_id,episode_id,group_id,target_company_cue_id,system_action,system_text,current_action,current_text,decision_origin,requires_review,format_issues,term_evidence) VALUES($1,$2,$3,$4,$5,'keep_company','你好','keep_company','你好','system',false,'[]','[]')`, [itemId, sessionId, episodeId, groupId, companyCueId]);
  return { projectId, sessionId, itemId, asrCueId, companyCueId };
};

describe('BACK-SYSTEM-07C Wave C runtime control', () => {
  it('基线预览→导入→排队快照→Worker实际执行→批准→首次发布，结果可按稳定身份恢复', async () => {
    const preview = await app.inject({ method: 'GET', url: '/api/system-control/strategy/runtime-targets/pre_review/baseline-preview', headers: headers('owner') }); expect(preview.statusCode).toBe(200);
    const baselineImportId = randomUUID(); const artifactId = randomUUID(); const versionId = randomUUID();
    const imported = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/baseline-imports', headers: headers('owner', `baseline-${randomUUID()}`), payload: { baselineImportId, artifactId, versionId } }); expect(imported.statusCode).toBe(201); const version = imported.json(); baselineVersionId = versionId; baselineContentDigest = version.contentDigest;
    await seedImpactSample(versionId, version.contentDigest);
    const impactRunId = randomUUID(); baselineImpactRunId = impactRunId; const impact = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/impact-runs', headers: headers('owner', `impact-${randomUUID()}`), payload: { impactRunId, strategyVersionId: versionId } }); if (impact.statusCode !== 201) throw new Error(impact.body); expect(impact.json()).toMatchObject({ impactRunId, status: 'queued', invariantResults: { oneToOne: 'unknown' } });
    const processed = await runtime.processImpact(impactRunId, 'runtime-test-worker'); expect(processed).toMatchObject({ processed: true, status: 'succeeded', invariants: { oneToOne: 'pass', asrQuality: 'pass', blockingFormat: 'pass', termConflicts: 'pass' } });
    const completed = (await app.inject({ method: 'GET', url: `/api/system-control/strategy/runtime-targets/pre_review/impact-runs/${impactRunId}`, headers: headers('owner') })).json(); expect(completed.status).toBe('succeeded'); expect(completed.sampleCount).toBe(1); expect(completed.invariantResults).toEqual({ oneToOne: 'pass', asrQuality: 'pass', blockingFormat: 'pass', termConflicts: 'pass' });
    const approvalId = randomUUID(); baselineApprovalId = approvalId; const approval = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/approvals', headers: headers('owner', `approval-${randomUUID()}`), payload: { approvalId, impactRunId, strategyVersionId: versionId } }); if (approval.statusCode !== 201) throw new Error(approval.body);
    const releaseCommandId = randomUUID(); const release = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/releases', headers: headers('owner', `release-${randomUUID()}`), payload: { releaseCommandId, action: 'publish', strategyVersionId: versionId, expectedPreviousStrategyVersionId: null, impactRunId, approvalId, contentDigest: version.contentDigest } }); expect(release.statusCode).toBe(201); expect(release.json()).toMatchObject({ status: 'succeeded', previousStrategyVersionId: null });
    expect((await app.inject({ method: 'GET', url: '/api/system-control/strategy/runtime-targets/pre_review', headers: headers('owner') })).json().active).toMatchObject({ strategyVersionId: versionId, status: 'active' });
    expect((await app.inject({ method: 'GET', url: `/api/system-control/strategy/runtime-targets/pre_review/release-commands/${releaseCommandId}`, headers: headers('owner') })).json()).toMatchObject({ releaseCommandId, status: 'succeeded' });
  });

  it('严格自定义版本必须正式 HTTP 基于基线，数值变化进入新快照且旧正文不可变', async () => {
    const baseline = (await pool.query<{ id: string; digest: string }>(`SELECT v.id,v.content_digest AS digest FROM strategy_artifact_versions v JOIN strategy_artifacts a ON a.id=v.artifact_id WHERE a.origin='system_baseline' LIMIT 1`)).rows[0]!;
    const artifactId = randomUUID(); const versionId = randomUUID(); const body = { artifactId, versionId, kind: 'local_rule_pack', displayName: '自定义审改规则', purpose: '运行时回归', applicableModules: ['pre_review'], schemaVersion: 1, baseVersionId: baseline.id, source: 'manual', payload: rulePack({ alignmentNearbyGapMs: 420, alignmentSimilarityThreshold: 0.8, maxCharacters: 32 }) };
    const created = await app.inject({ method: 'POST', url: '/api/system-control/strategy/artifacts', headers: headers('owner', `custom-${randomUUID()}`), payload: body }); expect(created.statusCode).toBe(201);
    const invalid = await app.inject({ method: 'POST', url: `/api/system-control/strategy/artifacts/${artifactId}/versions`, headers: headers('owner', `invalid-${randomUUID()}`), payload: { versionId: randomUUID(), schemaVersion: 1, payload: rulePack({ alignmentNearbyGapMs: 99_999 }) } }); expect([400, 422]).toContain(invalid.statusCode);
    const persisted = await pool.query<{ content_digest: string }>('SELECT content_digest FROM strategy_artifact_versions WHERE id=$1', [versionId]); const customDigest = persisted.rows[0].content_digest; const seeded = await seedImpactSample(versionId, customDigest); expect(seeded.itemId).toBeTruthy();
    const impactRunId = randomUUID(); const impact = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/impact-runs', headers: headers('owner', `custom-impact-${randomUUID()}`), payload: { impactRunId, strategyVersionId: versionId } }); expect(impact.statusCode).toBe(201); expect((await runtime.processImpact(impactRunId, 'runtime-custom-worker')).status).toBe('succeeded');
    const approvalId = randomUUID(); const approval = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/approvals', headers: headers('owner', `custom-approval-${randomUUID()}`), payload: { approvalId, impactRunId, strategyVersionId: versionId } }); expect(approval.statusCode).toBe(201);
    const publishId = randomUUID(); const published = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/releases', headers: headers('owner', `custom-publish-${randomUUID()}`), payload: { releaseCommandId: publishId, action: 'publish', strategyVersionId: versionId, expectedPreviousStrategyVersionId: baselineVersionId, impactRunId, approvalId, contentDigest: customDigest } }); expect(published.statusCode).toBe(201);
    const targetAfterSecondPublish = await app.inject({ method: 'GET', url: '/api/system-control/strategy/runtime-targets/pre_review', headers: headers('owner') }); expect(targetAfterSecondPublish.statusCode).toBe(200); expect(targetAfterSecondPublish.json()).toMatchObject({ module: 'pre_review', active: { strategyVersionId: versionId, status: 'active', contentDigest: customDigest, rulePack: body.payload } });
    const rollbackId = randomUUID(); const rolledBack = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/releases', headers: headers('owner', `baseline-rollback-${randomUUID()}`), payload: { releaseCommandId: rollbackId, action: 'rollback', strategyVersionId: baselineVersionId, expectedPreviousStrategyVersionId: versionId, impactRunId: baselineImpactRunId, approvalId: baselineApprovalId, contentDigest: baselineContentDigest } }); expect(rolledBack.statusCode).toBe(201); expect(rolledBack.json()).toMatchObject({ action: 'rollback', strategyVersionId: baselineVersionId, previousStrategyVersionId: versionId });
    const targetAfterRollback = await app.inject({ method: 'GET', url: '/api/system-control/strategy/runtime-targets/pre_review', headers: headers('owner') }); expect(targetAfterRollback.statusCode).toBe(200); expect(targetAfterRollback.json()).toMatchObject({ active: { strategyVersionId: baselineVersionId, status: 'active', contentDigest: baselineContentDigest } });
    const historyRows = await pool.query<{ id: string; runtime_status: string; content_digest: string }>('SELECT id,runtime_status,content_digest FROM strategy_artifact_versions WHERE id = ANY($1::uuid[]) ORDER BY id', [[baselineVersionId, versionId]]); expect(historyRows.rows).toHaveLength(2); expect(historyRows.rows.find((row) => row.id === baselineVersionId)).toMatchObject({ runtime_status: 'active', content_digest: baselineContentDigest }); expect(historyRows.rows.find((row) => row.id === versionId)).toMatchObject({ runtime_status: 'retired', content_digest: customDigest });
    const publishRetired = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/releases', headers: headers('owner', `retired-publish-${randomUUID()}`), payload: { releaseCommandId: randomUUID(), action: 'publish', strategyVersionId: versionId, expectedPreviousStrategyVersionId: baselineVersionId, impactRunId, approvalId, contentDigest: customDigest } }); expect(publishRetired.statusCode).toBe(409);
  });

  it('同一 app 逐请求权限隔离，读取不产生写副作用；发布字段缺失稳定拒绝', async () => {
    const before = await pool.query(`SELECT count(*)::int AS commands FROM system_control_commands`);
    expect((await app.inject({ method: 'GET', url: '/api/system-control/strategy/runtime-targets/pre_review', headers: headers('none') })).statusCode).toBe(403);
    const response = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/releases', headers: headers('owner', `missing-${randomUUID()}`), payload: { releaseCommandId: randomUUID(), action: 'publish', strategyVersionId: randomUUID() } }); expect(response.statusCode).toBe(400);
    const after = await pool.query(`SELECT count(*)::int AS commands FROM system_control_commands`); expect(after.rows[0].commands).toBe(before.rows[0].commands);
  });

  it('历史分页包含逐版本 provenance 与 impact/approval/release 事件链，空页保留真实 total', async () => {
    const history = await app.inject({ method: 'GET', url: '/api/system-control/strategy/runtime-targets/pre_review/history?limit=1&offset=999', headers: headers('owner') }); expect(history.statusCode).toBe(200); expect(history.json().total).toBeGreaterThan(0); expect(history.json().items).toEqual([]);
    const page = await app.inject({ method: 'GET', url: '/api/system-control/strategy/runtime-targets/pre_review/history?limit=100&offset=0', headers: headers('owner') }); expect(page.statusCode).toBe(200); expect(page.json().items[0]).toEqual(expect.objectContaining({ baseVersionId: expect.any(String), source: expect.any(String), impacts: expect.any(Array), approvals: expect.any(Array), releaseEvents: expect.any(Array) }));
  });

  it('同一全局 stable ID 跨 baseline-import/impact kind 并发只产生一条命令且无 23505/500', async () => {
    const stableId = randomUUID(); const [imported, impacted] = await Promise.all([
      app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/baseline-imports', headers: headers('owner', `cross-import-${randomUUID()}`), payload: { baselineImportId: stableId, artifactId: randomUUID(), versionId: randomUUID() } }),
      app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/impact-runs', headers: headers('owner', `cross-impact-${randomUUID()}`), payload: { impactRunId: stableId, strategyVersionId: baselineVersionId } }),
    ]);
    expect(new Set([imported.statusCode, impacted.statusCode])).toEqual(new Set([201, 409]));
    expect([imported.statusCode, impacted.statusCode]).not.toContain(500);
    const count = await pool.query('SELECT count(*)::int AS count FROM system_control_commands WHERE stable_command_key=$1', [stableId]); expect(count.rows[0].count).toBe(1);
  });

  it('POST 后实时审改事实变化不影响已冻结快照，下一次 POST 才观察新事实', async () => {
    const seeded = await seedImpactSample(baselineVersionId, baselineContentDigest);
    const frozenRunId = randomUUID();
    const queued = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/impact-runs', headers: headers('owner', `snapshot-${randomUUID()}`), payload: { impactRunId: frozenRunId, strategyVersionId: baselineVersionId } });
    expect(queued.statusCode).toBe(201); const before = queued.json(); expect(before.status).toBe('queued');
    await pool.query(`UPDATE pre_edit_items SET current_text='实时撤销后的内容',term_evidence='[{"conflict":true}]'::jsonb WHERE id=$1`, [seeded.itemId]);
    const worker = new SystemControlStrategyRuntimeWorker(runtime, { workerId: 'snapshot-worker' }); const processed = await worker.runOnce(); expect(processed).toMatchObject({ processed: true, status: 'succeeded', invariants: { oneToOne: 'pass', asrQuality: 'pass', termConflicts: 'pass' } });
    const after = (await app.inject({ method: 'GET', url: `/api/system-control/strategy/runtime-targets/pre_review/impact-runs/${frozenRunId}`, headers: headers('owner') })).json(); expect(after.snapshotDigest).toBe(before.snapshotDigest); expect(after.invariantResults).toEqual({ oneToOne: 'pass', asrQuality: 'pass', blockingFormat: 'pass', termConflicts: 'pass' });
    const changedRunId = randomUUID(); const changed = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/impact-runs', headers: headers('owner', `snapshot-changed-${randomUUID()}`), payload: { impactRunId: changedRunId, strategyVersionId: baselineVersionId } }); expect(changed.statusCode).toBe(201); expect((await runtime.processImpact(changedRunId, 'changed-worker')).invariants).toMatchObject({ oneToOne: 'pass', termConflicts: 'fail' });
  });

  it('租约过期由新 Worker 接管，旧 Attempt 持久 unknown 且迟到 finalize 不覆盖成功', async () => {
    const seeded = await seedImpactSample(baselineVersionId, baselineContentDigest); expect(seeded.itemId).toBeTruthy();
    const impactRunId = randomUUID(); const queued = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/impact-runs', headers: headers('owner', `lease-${randomUUID()}`), payload: { impactRunId, strategyVersionId: baselineVersionId } }); expect(queued.statusCode).toBe(201);
    const first = await runtime.claimImpact(impactRunId, 'old-lease-owner'); expect(first).not.toBeNull();
    await pool.query(`UPDATE strategy_runtime_impact_runs SET lease_expires_at=CURRENT_TIMESTAMP - interval '1 second' WHERE id=$1`, [impactRunId]);
    const second = await runtime.processImpact(impactRunId, 'new-lease-owner'); expect(second).toMatchObject({ processed: true, status: 'succeeded' });
    const attempts = await pool.query(`SELECT status,lease_owner FROM strategy_runtime_impact_attempts WHERE impact_run_id=$1 ORDER BY created_at ASC,id ASC`, [impactRunId]); expect(attempts.rows).toHaveLength(2); expect(attempts.rows.map((row: any) => row.status)).toEqual(['unknown', 'succeeded']);
    const stale = await runtime.finalizeImpact(impactRunId, first!.attemptId, 'old-lease-owner', { status: 'succeeded', blockers: [], invariants: { oneToOne: 'fail', asrQuality: 'fail', blockingFormat: 'fail', termConflicts: 'fail' }, affectedSessionCount: 0, sampleCount: 0 }); expect(stale).toEqual({ processed: false, status: 'stale' }); expect((await runtime.getImpact(impactRunId)).status).toBe('succeeded');
  });

  it('评测器受控异常持久化 Run/Attempt unknown，GET 可恢复且不伪装 succeeded', async () => {
    const seeded = await seedImpactSample(baselineVersionId, baselineContentDigest); expect(seeded.itemId).toBeTruthy();
    const impactRunId = randomUUID(); const queued = await app.inject({ method: 'POST', url: '/api/system-control/strategy/runtime-targets/pre_review/impact-runs', headers: headers('owner', `fault-${randomUUID()}`), payload: { impactRunId, strategyVersionId: baselineVersionId } }); expect(queued.statusCode).toBe(201);
    const faulty = new SystemControlStrategyRuntimeService(pool, { evaluator: () => { throw new Error('controlled evaluator failure'); } }); const result = await faulty.processImpact(impactRunId, 'fault-worker'); expect(result).toMatchObject({ processed: true, status: 'unknown' });
    const visible = (await app.inject({ method: 'GET', url: `/api/system-control/strategy/runtime-targets/pre_review/impact-runs/${impactRunId}`, headers: headers('owner') })).json(); expect(visible.status).toBe('unknown'); expect(visible.invariantResults).toEqual({ oneToOne: 'unknown', asrQuality: 'unknown', blockingFormat: 'unknown', termConflicts: 'unknown' });
    const attempt = await pool.query(`SELECT status FROM strategy_runtime_impact_attempts WHERE impact_run_id=$1`, [impactRunId]); expect(attempt.rows).toEqual([{ status: 'unknown' }]);
  });

  it('分页窗口之外的 runtime version 可按稳定 strategyVersionId 直接读取，错误读取零副作用', async () => {
    const artifactId = randomUUID(); const firstVersionId = randomUUID();
    const created = await app.inject({ method: 'POST', url: '/api/system-control/strategy/artifacts', headers: headers('owner', `detail-artifact-${randomUUID()}`), payload: {
      artifactId, versionId: firstVersionId, kind: 'local_rule_pack', displayName: '分页外运行规则', purpose: '稳定详情读取', applicableModules: ['pre_review'], schemaVersion: 1,
      baseVersionId: baselineVersionId, source: 'manual', payload: rulePack({ maxCharacters: 29 }),
    } });
    expect(created.statusCode).toBe(201);
    const payload = JSON.stringify(rulePack({ maxCharacters: 29 })); const digest = (await pool.query<{ content_digest: string }>('SELECT content_digest FROM strategy_artifact_versions WHERE id=$1', [firstVersionId])).rows[0].content_digest;
    const extraVersionIds: string[] = [];
    for (let version = 2; version <= 101; version += 1) {
      const versionId = randomUUID(); extraVersionIds.push(versionId);
      await pool.query(`INSERT INTO strategy_artifact_versions(id,artifact_id,version,schema_version,payload,content_digest,created_by,base_version_id,source,runtime_status)
        VALUES($1,$2,$3,1,$4::jsonb,$5,'runtime-detail-fixture',$6,'manual','draft')`, [versionId, artifactId, version, payload, digest, baselineVersionId]);
    }
    const targetVersionId = firstVersionId;
    const wrongModuleArtifactId = randomUUID(); const wrongModuleVersionId = randomUUID();
    const wrong = await app.inject({ method: 'POST', url: '/api/system-control/strategy/artifacts', headers: headers('owner', `detail-wrong-module-${randomUUID()}`), payload: {
      artifactId: wrongModuleArtifactId, versionId: wrongModuleVersionId, kind: 'prompt_template', displayName: '非前置审改版本', purpose: '错误模块回归', applicableModules: ['terms'], schemaVersion: 1,
      payload: { template: 'safe', variables: [] },
    } });
    expect(wrong.statusCode).toBe(201);
    const before = await pool.query(`SELECT
      (SELECT count(*) FROM system_control_commands)::int AS commands,
      (SELECT count(*) FROM system_control_audit_events)::int AS audits,
      (SELECT count(*) FROM strategy_runtime_impact_runs)::int AS impacts,
      (SELECT count(*) FROM strategy_runtime_approvals)::int AS approvals,
      (SELECT count(*) FROM strategy_runtime_release_commands)::int AS releases`);
    const page = await app.inject({ method: 'GET', url: `/api/system-control/strategy/artifacts/${artifactId}/versions?limit=100&offset=0`, headers: headers('owner') });
    expect(page.statusCode).toBe(200); expect(page.json().total).toBe(101); expect(page.json().items).toHaveLength(100); expect(page.json().items.find((item: any) => item.versionId === targetVersionId)).toBeUndefined();
    const direct = await app.inject({ method: 'GET', url: `/api/system-control/strategy/runtime-targets/pre_review/versions/${targetVersionId}`, headers: headers('owner') });
    expect(direct.statusCode).toBe(200); expect(direct.json()).toMatchObject({ strategyVersionId: targetVersionId, module: 'pre_review', status: 'draft', rulePack: rulePack({ maxCharacters: 29 }), baseVersionId: baselineVersionId, source: 'manual' });
    expect(direct.json()).not.toHaveProperty('payload');
    expect((await app.inject({ method: 'GET', url: `/api/system-control/strategy/runtime-targets/pre_review/versions/${targetVersionId}`, headers: headers('none') })).statusCode).toBe(403);
    const missingId = randomUUID(); expect((await app.inject({ method: 'GET', url: `/api/system-control/strategy/runtime-targets/pre_review/versions/${missingId}`, headers: headers('owner') })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/strategy/runtime-targets/pre_review/versions/${wrongModuleVersionId}`, headers: headers('owner') })).statusCode).toBe(404);
    const after = await pool.query(`SELECT
      (SELECT count(*) FROM system_control_commands)::int AS commands,
      (SELECT count(*) FROM system_control_audit_events)::int AS audits,
      (SELECT count(*) FROM strategy_runtime_impact_runs)::int AS impacts,
      (SELECT count(*) FROM strategy_runtime_approvals)::int AS approvals,
      (SELECT count(*) FROM strategy_runtime_release_commands)::int AS releases`);
    expect(after.rows[0]).toEqual(before.rows[0]);
    expect(extraVersionIds).toHaveLength(100);
  });
});
