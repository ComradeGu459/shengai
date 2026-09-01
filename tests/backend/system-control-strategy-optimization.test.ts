import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { TermCandidateRepository } from '../../backend/src/modules/terms/term-candidate.repository.js';
import { SystemControlStrategyWorker } from '../../backend/src/workers/system-control.strategy.worker.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');
let name: string; let admin: any; let pool: any; let app: any;
const owner = { subject: 'optimization-owner', audience: 'system-control', capabilities: ['system-control:strategy:read', 'system-control:strategy:write', 'system-control:strategy:evaluate'] };
const reader = { subject: 'optimization-reader', audience: 'system-control', capabilities: ['system-control:strategy:read'] };
const headers = (identity: 'owner' | 'reader' | 'none', key?: string) => ({ 'x-system-control-test-identity': identity, ...(key ? { 'idempotency-key': key } : {}) });
const sha = (value: string) => createHash('sha256').update(value).digest('hex');

beforeAll(async () => {
  const source = new URL(getDatabaseUrl()); const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  name = `qimao_strategy_opt_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 }); await admin.query(`CREATE DATABASE "${name}"`);
  const databaseUrl = new URL(source); databaseUrl.pathname = `/${name}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: backendRoot + '/migrations', direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  app = createApp({ database: pool, systemControlPrincipalResolver: (request) => request.headers['x-system-control-test-identity'] === 'owner' ? owner : request.headers['x-system-control-test-identity'] === 'reader' ? reader : null });
  await app.ready();
});

beforeEach(async () => { await pool.query('TRUNCATE strategy_candidate_decision_events, strategy_evaluation_runs, strategy_optimization_candidates, strategy_optimization_runs, strategy_artifact_versions, strategy_artifacts, system_control_audit_events, system_control_commands, projects CASCADE'); });
afterAll(async () => { if (app) await app.close(); if (admin && name) { await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [name]); await admin.query(`DROP DATABASE IF EXISTS "${name}"`); } if (admin) await admin.end(); });

const createArtifact = async (module: 'terms' | 'pre_review' | 'screen_text' | 'subtitle_acceptance') => {
  const artifactId = randomUUID(); const versionId = randomUUID();
  const response = await app.inject({ method: 'POST', url: '/api/system-control/strategy/artifacts', headers: headers('owner', `artifact-${artifactId}`), payload: { artifactId, versionId, kind: 'local_rule_pack', displayName: 'Optimization fixture', purpose: 'zero network fixture', applicableModules: [module], schemaVersion: 1, payload: { rules: [{ id: 'safe', pattern: 'safe', replacement: 'review', action: 'review' }] } } });
  expect(response.statusCode, response.body).toBe(201); return { artifactId, versionId };
};

const seedFormalTermEvent = async () => {
  const projectId = randomUUID(); const draftId = randomUUID(); const candidateId = randomUUID(); const manifestId = randomUUID(); const assetId = randomUUID(); const checksum = sha(`source-${projectId}`); const sourceDigest = sha(`1:${assetId}:sha256:${checksum}`); const cueId = `opt-cue-${randomUUID().replaceAll('-', '')}`.slice(0, 64);
  await pool.query("INSERT INTO projects(id,name,workflow_status,lifecycle_status,created_by,updated_by) VALUES($1,'optimization fixture','ready','active','test','test')", [projectId]);
  await pool.query("INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'source.srt','srt',1,'sha256',$4,CURRENT_TIMESTAMP)", [assetId, projectId, `opt/${assetId}`, checksum]);
  await pool.query("INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'opt','test')", [manifestId, projectId]);
  await pool.query("INSERT INTO material_manifest_bindings(manifest_id,episode_number,role,relative_path,file_name,size_bytes,last_modified_ms,fingerprint,media_type) VALUES($1,1,'company_srt','source.srt','source.srt',1,1,'opt-fingerprint','srt')", [manifestId]);
  await pool.query("INSERT INTO material_asset_bindings(manifest_id,episode_number,role,asset_id,source_fingerprint) VALUES($1,1,'company_srt',$2,'opt-fingerprint')", [manifestId, assetId]);
  await pool.query("INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'optimization','active')", [draftId, projectId, sourceDigest]);
  await pool.query("INSERT INTO term_cues(id,project_id,source_srt_set_digest,asset_id,episode_number,cue_index,start_ms,end_ms,text) VALUES($1,$2,$3,$4,1,1,0,1000,'safe cue')", [cueId, projectId, sourceDigest, assetId]);
  const type = (await pool.query('SELECT (enum_range(NULL::term_candidate_type))[1] AS type')).rows[0].type;
  await pool.query("INSERT INTO term_candidates(id,draft_id,type,name,origin,status) VALUES($1,$2,$3,'safe','manual','approved')", [candidateId, draftId, type]);
  await pool.query('INSERT INTO term_evidence(candidate_id,cue_id) VALUES($1,$2)', [candidateId, cueId]);
  await new TermCandidateRepository(pool).decide(projectId, candidateId, { expectedVersion: 1, action: 'edit', name: 'safe revised' }, null);
  return { projectId };
};

describe('BACK-SYSTEM-07B strategy optimization', () => {
  it('以正式事件建立零网络 OptimizationRun、候选决定和 EvaluationRun，并支持幂等恢复', async () => {
    const artifact = await createArtifact('terms'); const fixture = await seedFormalTermEvent();
    expect((await app.inject({ method: 'POST', url: '/api/system-control/strategy/optimization-runs', headers: headers('none', 'anonymous-key'), payload: { runId: randomUUID(), artifactId: artifact.artifactId, baseVersionId: artifact.versionId, module: 'terms', projectId: fixture.projectId, from: null, to: null, minEvidenceCount: 1, maxEvents: 10, budgetCny: '0.000000' } })).statusCode).toBe(403);
    const runId = randomUUID(); const body = { runId, artifactId: artifact.artifactId, baseVersionId: artifact.versionId, module: 'terms' as const, projectId: fixture.projectId, from: null, to: null, minEvidenceCount: 1, maxEvents: 10, budgetCny: '0.000000' as const };
    const created = await app.inject({ method: 'POST', url: '/api/system-control/strategy/optimization-runs', headers: headers('owner', 'opt-key-001'), payload: body }); expect(created.statusCode).toBe(202); expect(created.json()).toMatchObject({ runId, status: 'queued', candidateCount: 0 });
    expect((await app.inject({ method: 'POST', url: '/api/system-control/strategy/optimization-runs', headers: headers('owner', 'opt-key-001'), payload: body })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/system-control/strategy/optimization-runs', headers: headers('owner', 'opt-key-002'), payload: body })).statusCode).toBe(409);
    expect((await app.inject({ method: 'POST', url: '/api/system-control/strategy/optimization-runs', headers: headers('owner', 'opt-key-001'), payload: { ...body, maxEvents: 9 } })).statusCode).toBe(409);
    const worker = new SystemControlStrategyWorker(pool, { workerId: 'opt-worker', pollIntervalMs: 50 }); expect((await worker.runOnce()).processed).toBe(true);
    const run = await app.inject({ method: 'GET', url: `/api/system-control/strategy/optimization-runs/${runId}`, headers: headers('reader') }); expect(run.statusCode).toBe(200); expect(run.json()).toMatchObject({ status: 'succeeded', eventCount: 1, candidateCount: 1, actualCostCny: '0.000000' });
    const candidates = await app.inject({ method: 'GET', url: `/api/system-control/strategy/candidates?runId=${runId}&limit=10&offset=0`, headers: headers('reader') }); expect(candidates.statusCode).toBe(200); expect(candidates.json()).toMatchObject({ total: 1 }); expect(candidates.json().items[0]).toMatchObject({ sourceEventRefId: expect.stringContaining('terms:'), status: 'proposed' });
    const candidate = candidates.json().items[0]; const decisionBody = { decisionId: randomUUID(), expectedRevision: 1, action: 'send_to_evaluation' as const };
    const decided = await app.inject({ method: 'POST', url: `/api/system-control/strategy/candidates/${candidate.candidateId}/decisions`, headers: headers('owner', 'decision-key-001'), payload: decisionBody }); expect(decided.statusCode).toBe(200); expect(decided.json().status).toBe('evaluation_ready');
    const decisionBeforeRead = await pool.query('SELECT count(*) AS events,(SELECT count(*) FROM system_control_commands) AS commands FROM strategy_candidate_decision_events');
    const decisionRead = await app.inject({ method: 'GET', url: `/api/system-control/strategy/candidate-decisions/${decisionBody.decisionId}`, headers: headers('reader') });
    expect(decisionRead.statusCode).toBe(200); expect(decisionRead.json()).toMatchObject({ decisionId: decisionBody.decisionId, candidateId: candidate.candidateId, action: 'send_to_evaluation', requestId: expect.any(String), afterSnapshot: { status: 'evaluation_ready', revision: 2 } });
    const laterDecision = { decisionId: randomUUID(), expectedRevision: 2, action: 'edit' as const, title: '后续安全摘要', rationale: '后续人工复核摘要', proposal: { operation: 'review_when_changed' as const, target: 'status', value: 'edited', notes: '仅安全字段' } };
    expect((await app.inject({ method: 'POST', url: `/api/system-control/strategy/candidates/${candidate.candidateId}/decisions`, headers: headers('owner', 'decision-key-002'), payload: laterDecision })).statusCode).toBe(200);
    const oldDecisionAgain = await app.inject({ method: 'GET', url: `/api/system-control/strategy/candidate-decisions/${decisionBody.decisionId}`, headers: headers('reader') }); expect(oldDecisionAgain.json().afterSnapshot).toMatchObject({ status: 'evaluation_ready', revision: 2 });
    const decisionAfterRead = await pool.query('SELECT count(*) AS events,(SELECT count(*) FROM system_control_commands) AS commands FROM strategy_candidate_decision_events'); expect(Number(decisionAfterRead.rows[0].events)).toBe(Number(decisionBeforeRead.rows[0].events) + 1); expect(Number(decisionAfterRead.rows[0].commands)).toBe(Number(decisionBeforeRead.rows[0].commands) + 1);
    expect((await app.inject({ method: 'POST', url: `/api/system-control/strategy/candidates/${candidate.candidateId}/decisions`, headers: headers('owner', 'decision-key-001'), payload: decisionBody })).statusCode).toBe(200);
    const evaluationRunId = randomUUID(); const evaluation = await app.inject({ method: 'POST', url: '/api/system-control/strategy/evaluations', headers: headers('owner', 'evaluation-key-001'), payload: { evaluationRunId, candidateIds: [candidate.candidateId], budgetCny: '0.000000' } }); expect(evaluation.statusCode).toBe(202);
    expect((await app.inject({ method: 'POST', url: '/api/system-control/strategy/evaluations', headers: headers('reader', 'evaluation-key-002'), payload: { evaluationRunId: randomUUID(), candidateIds: [candidate.candidateId], budgetCny: '0.000000' } })).statusCode).toBe(403);
    expect((await worker.runOnce()).processed).toBe(true); const evaluationRead = await app.inject({ method: 'GET', url: `/api/system-control/strategy/evaluations/${evaluationRunId}`, headers: headers('reader') }); expect(evaluationRead.statusCode).toBe(200); expect(evaluationRead.json()).toMatchObject({ status: 'succeeded', actualCostCny: '0.000000', metrics: { metricKind: 'deterministic_proxy_v1' } });
    const unknownRunId = randomUUID(); await app.inject({ method: 'POST', url: '/api/system-control/strategy/optimization-runs', headers: headers('owner', 'unknown-key-001'), payload: { ...body, runId: unknownRunId } }); await pool.query("UPDATE strategy_optimization_runs SET status='running',lease_expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE id=$1", [unknownRunId]); await worker.runOnce(); expect((await app.inject({ method: 'GET', url: `/api/system-control/strategy/optimization-runs/${unknownRunId}`, headers: headers('reader') })).json().status).toBe('unknown');
  });

  it('四项权限与未知身份读取均为稳定拒绝，空库没有业务 bootstrap', async () => {
    const counts = await pool.query('SELECT (SELECT count(*) FROM strategy_optimization_runs) runs,(SELECT count(*) FROM strategy_optimization_candidates) candidates,(SELECT count(*) FROM strategy_evaluation_runs) evaluations'); expect(counts.rows[0]).toEqual({ runs: '0', candidates: '0', evaluations: '0' });
    expect((await app.inject({ method: 'GET', url: '/api/system-control/strategy/optimization-runs', headers: headers('none') })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/strategy/optimization-runs/${randomUUID()}`, headers: headers('reader') })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/strategy/candidates/${randomUUID()}`, headers: headers('reader') })).statusCode).toBe(404);
  });
});
