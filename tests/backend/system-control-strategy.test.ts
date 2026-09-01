import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';
import { PreReviewWriteRepository } from '../../backend/src/modules/pre-review/pre-review.write.repository.js';
import { ScreenTextWriteRepository } from '../../backend/src/modules/screen-text/screen-text.write.repository.js';
import { createDefaultAsrAdapterRegistry } from '../../backend/src/modules/asr/asr-adapter-registry.js';
import { createDefaultScreenTextAdapterRegistry } from '../../backend/src/modules/screen-text/screen-text.adapter-registry.js';
import { SystemControlRoutingService } from '../../backend/src/modules/system-control/system-control.routing.service.js';
import { TermCandidateRepository } from '../../backend/src/modules/terms/term-candidate.repository.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');
let name: string; let admin: any; let pool: any; let app: any;
const owner = { subject: 'strategy-owner', audience: 'system-control', capabilities: ['system-control:strategy:read', 'system-control:strategy:write'] };
const readOnly = { subject: 'strategy-reader', audience: 'system-control', capabilities: ['system-control:strategy:read'] };
const headers = (identity: 'owner' | 'reader' | 'employee' | 'none', key?: string) => ({ 'x-system-control-test-identity': identity, ...(key ? { 'idempotency-key': key } : {}) });
const digest = 'a'.repeat(64);
const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const kinds = [
  ['local_rule_pack', { rules: [{ id: 'r1', pattern: 'foo', replacement: 'bar', action: 'review' }] }],
  ['ai_filter_policy', { mode: 'local_only', sampleRate: 0.1, riskThreshold: 0.8, maxCandidates: 10 }],
  ['prompt_template', { template: 'review {{text}}', variables: ['text'] }],
  ['hotword_projection', { terms: ['foo'], caseSensitive: false }],
  ['risk_lexicon', { terms: ['bar'], severity: 'medium' }],
] as const;

const seedAcceptanceFixture = async () => {
  const projectId = randomUUID(); const manifestId = randomUUID(); const draftId = randomUUID(); const termVersionId = randomUUID();
  const assetId = randomUUID(); const preSessionId = randomUUID(); const preReleaseId = randomUUID(); const sourceDigest = sha256('acceptance-source');
  const strategyVersionId = '22222222-2222-4222-8222-222222222222'; const strategyDigest = sha256('strategy-runtime-test');
  const strategyArtifactId = randomUUID();
  await pool.query(`INSERT INTO strategy_artifacts(id,artifact_kind,display_name,purpose,applicable_modules,status,created_by,origin,protected,runtime_module)
    VALUES($1,'local_rule_pack','strategy-test','strategy-test',ARRAY['pre_review'],'draft','strategy-test','custom_draft',false,'pre_review') ON CONFLICT (id) DO NOTHING`, [strategyArtifactId]);
  await pool.query(`INSERT INTO strategy_artifact_versions(id,artifact_id,version,schema_version,payload,content_digest,created_by,source,runtime_status)
    VALUES($1,$2,1,1,$3,$4,'strategy-test','manual','active') ON CONFLICT (id) DO NOTHING`, [strategyVersionId, strategyArtifactId, {
    payloadType: 'pre_review_local_rule_pack_v1', alignmentNearbyGapMs: 350, alignmentSimilarityThreshold: 0.75, maxCharacters: 28,
    forbidSentencePunctuation: true, forbidMarkup: true, forbidBrackets: true, requireSpeakerDashForMultipleLines: true,
  }, strategyDigest]);
  await pool.query(`INSERT INTO strategy_runtime_active_pointers(module,strategy_version_id) VALUES('pre_review',$1)
    ON CONFLICT (module) DO UPDATE SET strategy_version_id=EXCLUDED.strategy_version_id,updated_at=CURRENT_TIMESTAMP`, [strategyVersionId]);
  const srt = Buffer.from('1\n00:00:00,000 --> 00:00:01,000\nhello\n');
  await pool.query("INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,'strategy acceptance','ready','active',1,'test','test')", [projectId]);
  await pool.query("INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'acceptance','test')", [manifestId, projectId]);
  await pool.query("INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'EP01.mp4','video',10,'sha256',$4,CURRENT_TIMESTAMP)", [assetId, projectId, `strategy/${assetId}`, digest]);
  await pool.query("INSERT INTO material_manifest_bindings(manifest_id,episode_number,role,relative_path,file_name,size_bytes,last_modified_ms,fingerprint,media_type) VALUES($1,1,'asr_video','EP01.mp4','EP01.mp4',10,1,'acceptance-video','video')", [manifestId]);
  await pool.query("INSERT INTO material_asset_bindings(manifest_id,episode_number,role,asset_id,source_fingerprint) VALUES($1,1,'asr_video',$2,'acceptance-video')", [manifestId, assetId]);
  await pool.query("INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'acceptance','confirmed')", [draftId, projectId, sourceDigest]);
  await pool.query("INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version) VALUES($1,$2,1,$3,$4,'acceptance')", [termVersionId, projectId, draftId, sourceDigest]);
  await pool.query(`INSERT INTO pre_edit_sessions(id,project_id,project_version,source_srt_set_digest,term_version_id,manifest_id,manifest_version,source_digest,source_snapshot,strategy_version_id,strategy_content_digest,algorithm_version,format_policy_version,status)
    VALUES($1,$2,1,$3,$4,$5,1,$6,'{}',$7,$8,'strategy-bound','strategy-bound','completed')`, [preSessionId, projectId, sourceDigest, termVersionId, manifestId, sha256('pre'), strategyVersionId, strategyDigest]);
  await pool.query("INSERT INTO pre_edit_episodes(id,session_id,episode_number,company_asset_id,video_asset_id,video_checksum_value,status,video_duration_ms) VALUES($1,$2,1,$3,$3,$4,'completed',5000)", [randomUUID(), preSessionId, assetId, sha256('video')]);
  await pool.query("INSERT INTO pre_edit_releases(id,project_id,session_id,version,source_digest,decision_digest,release_digest) VALUES($1,$2,$3,1,$4,$5,$6)", [preReleaseId, projectId, preSessionId, sha256('source'), sha256('decision'), sha256('release')]);
  await pool.query("INSERT INTO pre_edit_release_files(release_id,episode_number,file_name,cue_count,content_digest,bytes) VALUES($1,1,'EP01.srt',1,$2,$3)", [preReleaseId, sha256(srt), srt]);
  const created = await app.inject({ method: 'POST', url: `/api/projects/${projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
  expect(created.statusCode, created.body).toBe(201);
  const session = created.json().session;
  const cue = (await app.inject({ method: 'GET', url: `/api/projects/${projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1` })).json().cues.find((item: any) => item.track === 'dialogue');
  const screenCueId = randomUUID();
  await pool.query("INSERT INTO acceptance_cues(id,session_id,episode_id,episode_number,track,ordinal,start_ms,end_ms,text,source_metadata) VALUES($1,$2,$3,1,'screen_text',1,0,1000,'screen label','{}')", [screenCueId, session.id, session.episodes[0].id]);
  return { projectId, session, cue, screenCueId };
};

beforeAll(async () => {
  const source = new URL(getDatabaseUrl()); const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  name = `qimao_strategy_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 }); await admin.query(`CREATE DATABASE "${name}"`);
  const databaseUrl = new URL(source); databaseUrl.pathname = `/${name}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
  app = createApp({ database: pool, systemControlPrincipalResolver: (request) => {
    const identity = request.headers['x-system-control-test-identity']; if (identity === 'owner') return owner; if (identity === 'reader') return readOnly;
    if (identity === 'employee') return { subject: 'employee', audience: 'employee', capabilities: ['system-control:strategy:read', 'system-control:strategy:write'] }; return null;
  } }); await app.ready();
  const bootstrap = await pool.query('SELECT (SELECT count(*) FROM strategy_artifacts) artifacts, (SELECT count(*) FROM strategy_artifact_versions) versions, (SELECT count(*) FROM system_control_commands) commands');
  expect(bootstrap.rows[0]).toMatchObject({ artifacts: '0', versions: '0', commands: '0' });
});
beforeEach(async () => { await pool.query('TRUNCATE strategy_artifact_versions, strategy_artifacts, system_control_audit_events, system_control_commands, term_decision_events, term_candidates, term_drafts, projects CASCADE'); });
afterAll(async () => { if (app) await app.close(); if (admin && name) { await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [name]); await admin.query(`DROP DATABASE IF EXISTS "${name}"`); } if (admin) await admin.end(); });

describe('BACK-SYSTEM-07A strategy Wave A', () => {
  it('五类严格草稿、幂等身份、版本分页与逐请求权限', async () => {
    const created: string[] = [];
    for (const [kind, payload] of kinds) {
      const artifactId = randomUUID(); const versionId = randomUUID(); created.push(artifactId);
      const result = await app.inject({ method: 'POST', url: '/api/system-control/strategy/artifacts', headers: headers('owner', `create-${artifactId}`), payload: { artifactId, versionId, kind, displayName: `Draft ${kind}`, purpose: '安全审核草稿', applicableModules: ['terms'], schemaVersion: 1, payload } });
      expect(result.statusCode, result.body).toBe(201); expect(result.json()).toMatchObject({ artifactId, purpose: '安全审核草稿', applicableModules: ['terms'], latestVersionSummary: expect.any(String) });
      const replay = await app.inject({ method: 'POST', url: '/api/system-control/strategy/artifacts', headers: headers('owner', `create-${artifactId}`), payload: { artifactId, versionId, kind, displayName: `Draft ${kind}`, purpose: '安全审核草稿', applicableModules: ['terms'], schemaVersion: 1, payload } }); expect(replay.statusCode).toBe(200);
      const conflict = await app.inject({ method: 'POST', url: '/api/system-control/strategy/artifacts', headers: headers('owner', `create-${artifactId}`), payload: { artifactId, versionId, kind, displayName: 'changed', purpose: '安全审核草稿', applicableModules: ['terms'], schemaVersion: 1, payload } }); expect(conflict.statusCode).toBe(409);
      const extra = await app.inject({ method: 'POST', url: '/api/system-control/strategy/artifacts', headers: headers('owner', `extra-${artifactId}`), payload: { artifactId: randomUUID(), versionId: randomUUID(), kind, displayName: 'extra', purpose: '安全审核草稿', applicableModules: ['terms'], schemaVersion: 1, payload, unexpected: true } }); expect(extra.statusCode).toBe(400);
    }
    const list = await app.inject({ method: 'GET', url: '/api/system-control/strategy/artifacts?applicableModule=terms&limit=2&offset=0&sort=kind_asc', headers: headers('reader') }); expect(list.statusCode).toBe(200); expect(list.json()).toMatchObject({ total: 5, limit: 2, offset: 0 }); expect(list.json().items[0]).not.toHaveProperty('payload');
    const empty = await app.inject({ method: 'GET', url: '/api/system-control/strategy/artifacts?limit=2&offset=10', headers: headers('reader') }); expect(empty.statusCode).toBe(200); expect(empty.json()).toMatchObject({ total: 5, items: [] });
    const versions = await app.inject({ method: 'GET', url: `/api/system-control/strategy/artifacts/${created[0]}/versions?limit=1&offset=1`, headers: headers('reader') }); expect(versions.statusCode).toBe(200); expect(versions.json()).toMatchObject({ total: 1, items: [] });
    expect((await app.inject({ method: 'GET', url: '/api/system-control/strategy/artifacts', headers: headers('employee') })).statusCode).toBe(403);
  });

  it('版本追加只读不可变并按稳定身份恢复', async () => {
    const artifactId = randomUUID(); const firstVersionId = randomUUID(); const key = `create-${randomUUID()}`;
    await app.inject({ method: 'POST', url: '/api/system-control/strategy/artifacts', headers: headers('owner', key), payload: { artifactId, versionId: firstVersionId, kind: 'prompt_template', displayName: 'Prompt', purpose: '模板审核', applicableModules: ['pre_review', 'screen_text'], schemaVersion: 1, payload: kinds[2][1] } });
    const versionId = randomUUID(); const body = { versionId, schemaVersion: 1, payload: { template: 'new {{text}}', variables: ['text'] } };
    const created = await app.inject({ method: 'POST', url: `/api/system-control/strategy/artifacts/${artifactId}/versions`, headers: headers('owner', `version-${versionId}`), payload: body }); expect(created.statusCode).toBe(201); expect(created.json().version).toBe(2);
    expect((await app.inject({ method: 'POST', url: `/api/system-control/strategy/artifacts/${artifactId}/versions`, headers: headers('owner', `version-${versionId}`), payload: body })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/system-control/strategy/artifacts/${artifactId}/versions`, headers: headers('owner', `other-${versionId}`), payload: { ...body, schemaVersion: 2 } })).statusCode).toBe(409);
    const list = await app.inject({ method: 'GET', url: `/api/system-control/strategy/artifacts/${artifactId}/versions?limit=10&offset=0`, headers: headers('reader') }); expect(list.statusCode).toBe(200); expect(list.json().items[0]).toMatchObject({ versionSummary: expect.stringContaining('模板') }); expect(list.json().items[0]).not.toHaveProperty('payload');
    const read = await app.inject({ method: 'GET', url: `/api/system-control/strategy/artifacts/${artifactId}/versions/${versionId}`, headers: headers('reader') }); expect(read.statusCode).toBe(200); expect(read.json().contentDigest).toHaveLength(64); expect(read.json().payload.template).toBe('new {{text}}');
    expect((await app.inject({ method: 'GET', url: `/api/system-control/strategy/artifacts/${artifactId}/versions/${randomUUID()}`, headers: headers('reader') })).statusCode).toBe(404);
  });

  it('四领域事件安全投影、撤销链、空页真实 total 与读取零写副作用', async () => {
    const projectId = randomUUID(); const draftId = randomUUID(); const candidateId = randomUUID(); const manifestId = randomUUID(); const assetId = randomUUID();
    await pool.query(`INSERT INTO projects(id,name,workflow_status,lifecycle_status,created_by,updated_by) VALUES($1,'strategy events','ready','active','test','test')`, [projectId]);
    await pool.query(`INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'source.srt','srt',1,'sha256',$4,CURRENT_TIMESTAMP)`, [assetId, projectId, `strategy/${assetId}`, digest]);
    await pool.query(`INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'strategy','test')`, [manifestId, projectId]);
    await pool.query(`INSERT INTO material_manifest_bindings(manifest_id,episode_number,role,relative_path,file_name,size_bytes,last_modified_ms,fingerprint,media_type) VALUES($1,1,'company_srt','source.srt','source.srt',1,1,'strategy-fingerprint','srt')`, [manifestId]);
    await pool.query(`INSERT INTO material_asset_bindings(manifest_id,episode_number,role,asset_id,source_fingerprint) VALUES($1,1,'company_srt',$2,'strategy-fingerprint')`, [manifestId, assetId]);
    const sourceDigest = createHash('sha256').update(`1:${assetId}:sha256:${digest}`).digest('hex');
    const cueId = 'strategy-cue-' + 'a'.repeat(51);
    await pool.query(`INSERT INTO term_cues(id,project_id,source_srt_set_digest,asset_id,episode_number,cue_index,start_ms,end_ms,text) VALUES($1,$2,$3,$4,1,1,0,1000,'safe cue')`, [cueId, projectId, sourceDigest, assetId]);
    await pool.query(`INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'test','active')`, [draftId, projectId, sourceDigest]);
    const candidateType = (await pool.query(`SELECT (enum_range(NULL::term_candidate_type))[1] AS type`)).rows[0].type as string;
    await pool.query(`INSERT INTO term_candidates(id,draft_id,type,name,origin,status) VALUES($1,$2,$3,'safe', 'manual','approved')`, [candidateId, draftId, candidateType]);
    await pool.query('INSERT INTO term_evidence(candidate_id,cue_id) VALUES($1,$2)', [candidateId, cueId]);
    const write = await new TermCandidateRepository(pool).decide(projectId, candidateId, { expectedVersion: 1, action: 'edit', name: 'safe-new' }, null);
    expect(write.version).toBe(2);
    const before = await pool.query('SELECT count(*) n FROM term_decision_events');
    const list = await app.inject({ method: 'GET', url: '/api/system-control/strategy/events?domain=terms&limit=1&offset=0', headers: headers('reader') }); expect(list.statusCode, list.body).toBe(200); expect(list.json()).toMatchObject({ total: 1, items: [{ domain: 'terms', projectId, action: 'edited', beforeDigest: expect.any(String), afterDigest: expect.any(String) }] });
    const eventRef = list.json().items[0].eventRefId; const detail = await app.inject({ method: 'GET', url: `/api/system-control/strategy/events/${eventRef}`, headers: headers('reader') }); expect(detail.statusCode).toBe(200);
    const empty = await app.inject({ method: 'GET', url: '/api/system-control/strategy/events?domain=terms&limit=1&offset=3', headers: headers('reader') }); expect(empty.statusCode).toBe(200); expect(empty.json()).toMatchObject({ total: 1, items: [] });
    const after = await pool.query('SELECT count(*) n FROM term_decision_events'); expect(after.rows[0].n).toBe(before.rows[0].n); expect(JSON.stringify(detail.json())).not.toMatch(/old|new|secret|object|prompt/i);
  });

  it('subtitle acceptance edit/undo/redo uses cue-id diffs for track and evidence', async () => {
    const fixture = await seedAcceptanceFixture();
    const revisions = async () => (await pool.query('SELECT s.revision AS session_revision,e.revision AS episode_revision FROM acceptance_sessions s JOIN acceptance_episodes e ON e.session_id=s.id WHERE s.id=$1', [fixture.session.id])).rows[0];
    const firstRevision = await revisions();
    const edit = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${fixture.session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: Number(firstRevision.session_revision), expectedEpisodeRevision: Number(firstRevision.episode_revision), operations: [{ kind: 'update', cueId: fixture.cue.id, text: 'dialogue changed' }] } });
    expect(edit.statusCode, edit.body).toBe(201);
    const editEventId = (await pool.query("SELECT id FROM acceptance_edit_events WHERE session_id=$1 AND event_kind='edit' ORDER BY created_at DESC,id DESC LIMIT 1", [fixture.session.id])).rows[0].id;
    const afterEdit = await app.inject({ method: 'GET', url: '/api/system-control/strategy/events?domain=subtitle_acceptance&limit=10&offset=0', headers: headers('reader') });
    expect(afterEdit.statusCode).toBe(200);
    const firstProjected = afterEdit.json().items.find((item: any) => item.eventRefId === `subtitle_acceptance:${editEventId}`);
    expect(firstProjected).toMatchObject({ track: 'dialogue', evidenceCount: 1, changedFields: ['text'] });

    const undoRevision = await revisions();
    const undo = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${fixture.session.id}/episodes/1/undo`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: Number(undoRevision.session_revision), expectedEpisodeRevision: Number(undoRevision.episode_revision), eventId: editEventId } });
    expect(undo.statusCode, undo.body).toBe(201);
    const redoRevision = await revisions();
    const redo = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${fixture.session.id}/episodes/1/redo`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: Number(redoRevision.session_revision), expectedEpisodeRevision: Number(redoRevision.episode_revision), eventId: editEventId } });
    expect(redo.statusCode, redo.body).toBe(201);

    const dualRevision = await revisions();
    const dual = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${fixture.session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: Number(dualRevision.session_revision), expectedEpisodeRevision: Number(dualRevision.episode_revision), operations: [{ kind: 'update', cueId: fixture.cue.id, text: 'dialogue dual' }, { kind: 'update', cueId: fixture.screenCueId, text: 'screen dual' }] } });
    expect(dual.statusCode, dual.body).toBe(201);
    const dualEventId = (await pool.query("SELECT id FROM acceptance_edit_events WHERE session_id=$1 AND event_kind='edit' ORDER BY created_at DESC,id DESC LIMIT 1", [fixture.session.id])).rows[0].id;
    const projected = (await app.inject({ method: 'GET', url: '/api/system-control/strategy/events?domain=subtitle_acceptance&limit=10&offset=0', headers: headers('reader') })).json().items;
    expect(projected.find((item: any) => item.eventRefId === `subtitle_acceptance:${dualEventId}`)).toMatchObject({ track: null, evidenceCount: 2, changedFields: ['text'] });
    expect(projected.some((item: any) => item.restoresEventRefId === `subtitle_acceptance:${editEventId}`)).toBe(true);
  });

  it('pre_review 与 screen_text 通过正式 repository 写命令进入安全事件投影', async () => {
    const projectId = randomUUID(); const manifestId = randomUUID(); const draftId = randomUUID(); const termVersionId = randomUUID(); const assetId = randomUUID();
    const sourceDigest = sha256('formal-domain-source'); const cueId = `pre-cue-${randomUUID().replaceAll('-', '')}`; const preSessionId = randomUUID(); const preEpisodeId = randomUUID(); const groupId = randomUUID(); const itemId = randomUUID();
    await pool.query("INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,'formal domains','ready','active',1,'test','test')", [projectId]);
    await pool.query("INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'formal','test')", [manifestId, projectId]);
    await pool.query("INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'EP01.mp4','video',10,'sha256',$4,CURRENT_TIMESTAMP)", [assetId, projectId, `formal/${assetId}`, digest]);
    await pool.query("INSERT INTO material_manifest_bindings(manifest_id,episode_number,role,relative_path,file_name,size_bytes,last_modified_ms,fingerprint,media_type) VALUES($1,1,'screen_video','EP01.mp4','EP01.mp4',10,1,'formal-video','video')", [manifestId]);
    await pool.query("INSERT INTO material_asset_bindings(manifest_id,episode_number,role,asset_id,source_fingerprint) VALUES($1,1,'screen_video',$2,'formal-video')", [manifestId, assetId]);
    await pool.query("INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'formal','confirmed')", [draftId, projectId, sourceDigest]);
    await pool.query("INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version) VALUES($1,$2,1,$3,$4,'formal')", [termVersionId, projectId, draftId, sourceDigest]);
    await pool.query("INSERT INTO term_cues(id,project_id,source_srt_set_digest,asset_id,episode_number,cue_index,start_ms,end_ms,text) VALUES($1,$2,$3,$4,1,1,0,1000,'company')", [cueId, projectId, sourceDigest, assetId]);
    const runtimeVersionId = '33333333-3333-4333-8333-333333333333'; const runtimeDigest = sha256('strategy-runtime-formal');
    const runtimeArtifactId = randomUUID();
    await pool.query(`INSERT INTO strategy_artifacts(id,artifact_kind,display_name,purpose,applicable_modules,status,created_by,origin,protected,runtime_module)
      VALUES($1,'local_rule_pack','strategy-formal','strategy-formal',ARRAY['pre_review'],'draft','strategy-test','custom_draft',false,'pre_review') ON CONFLICT (id) DO NOTHING`, [runtimeArtifactId]);
    await pool.query(`INSERT INTO strategy_artifact_versions(id,artifact_id,version,schema_version,payload,content_digest,created_by,source,runtime_status)
      VALUES($1,$2,1,1,$3,$4,'strategy-test','manual','active') ON CONFLICT (id) DO NOTHING`, [runtimeVersionId, runtimeArtifactId, {
      payloadType: 'pre_review_local_rule_pack_v1', alignmentNearbyGapMs: 350, alignmentSimilarityThreshold: 0.75, maxCharacters: 28,
      forbidSentencePunctuation: true, forbidMarkup: true, forbidBrackets: true, requireSpeakerDashForMultipleLines: true,
    }, runtimeDigest]);
    await pool.query(`INSERT INTO strategy_runtime_active_pointers(module,strategy_version_id) VALUES('pre_review',$1)
      ON CONFLICT (module) DO UPDATE SET strategy_version_id=EXCLUDED.strategy_version_id,updated_at=CURRENT_TIMESTAMP`, [runtimeVersionId]);
    await pool.query(`INSERT INTO pre_edit_sessions(id,project_id,project_version,source_srt_set_digest,term_version_id,manifest_id,manifest_version,source_digest,source_snapshot,strategy_version_id,strategy_content_digest,algorithm_version,format_policy_version,status)
      VALUES($1,$2,1,$3,$4,$5,1,$6,'{}',$7,$8,'strategy-bound','strategy-bound','completed')`, [preSessionId, projectId, sourceDigest, termVersionId, manifestId, sha256('pre-formal'), runtimeVersionId, runtimeDigest]);
    await pool.query("INSERT INTO pre_edit_episodes(id,session_id,episode_number,company_asset_id,video_asset_id,video_checksum_value,status,video_duration_ms) VALUES($1,$2,1,$3,$3,$4,'completed',5000)", [preEpisodeId, preSessionId, assetId, sha256('video-formal')]);
    await pool.query("INSERT INTO pre_edit_alignment_groups(id,session_id,episode_id,kind,company_cue_ids,asr_cue_ids,time_overlap_ms,text_similarity,algorithm_version,digest) VALUES($1,$2,$3,'one_to_one',$4::varchar(64)[],'{}',1000,1,'formal',$5)", [groupId, preSessionId, preEpisodeId, `{${cueId}}`, sha256('group-formal')]);
    await pool.query(`INSERT INTO pre_edit_items(id,session_id,episode_id,group_id,target_company_cue_id,system_action,system_text,current_action,current_text,term_evidence)
      VALUES($1,$2,$3,$4,$5,'keep_company','company','keep_company','company',$6)`, [itemId, preSessionId, preEpisodeId, groupId, cueId, JSON.stringify([{ termItemId: randomUUID(), type: 'name', name: 'formal', matchedForms: ['formal'], companyMatched: true, asrMatched: false, conflict: false }])]);
    const preWrite = await new PreReviewWriteRepository(pool, new InMemoryStorageFake() as any).decide({ projectId, sessionId: preSessionId, itemId, body: { expectedVersion: 1, action: 'custom_text', text: 'company changed' }, key: randomUUID() });
    const preProjected = (await app.inject({ method: 'GET', url: '/api/system-control/strategy/events?domain=pre_review&limit=10&offset=0', headers: headers('reader') })).json();
    expect(preWrite.replay).toBe(false); expect(preProjected.total).toBe(1); expect(preProjected.items[0]).toMatchObject({ domain: 'pre_review', evidenceCount: 1, changedFields: ['action', 'text'] });

    const batchId = randomUUID(); const jobId = randomUUID(); const candidateId = randomUUID(); const screenRegistry = createDefaultScreenTextAdapterRegistry();
    await pool.query(`INSERT INTO screen_text_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,frame_strategy_version,dedupe_strategy_version,term_projection,term_projection_entries,status,revision,request_id)
      VALUES($1,$2,'single','{1}',$3,$4,1,'cloud_api','deterministic','screen_text_deterministic_fake','fake-model','zh-CN','test','v1','v1','{}','${digest}','frame-v1','dedupe-v1','{}','[]','review_pending',1,$5)`, [batchId, projectId, termVersionId, manifestId, `screen-request-${randomUUID()}`]);
    await pool.query("INSERT INTO screen_text_batch_assets(batch_id,episode_number,asset_id,object_key,original_filename,size_bytes,checksum_algorithm,checksum_value) VALUES($1,1,$2,$3,'EP01.mp4',10,'sha256',$4)", [batchId, assetId, `formal/${assetId}`, digest]);
    await pool.query("INSERT INTO screen_text_jobs(id,batch_id,project_id,episode_number,asset_id,status,video_duration_ms) VALUES($1,$2,$3,1,$4,'review_pending',1000)", [jobId, batchId, projectId, assetId]);
    await pool.query("INSERT INTO screen_text_candidates(id,batch_id,job_id,episode_number,source,raw_text,text,start_ms,end_ms,category,position,confidence,status,evidence,term_hits) VALUES($1,$2,$3,1,'ocr','ocr raw','old screen',0,100,'other','center',0.9,'pending',$4,'[]')", [candidateId, batchId, jobId, { objectKey: `evidence/${candidateId}`, checksum: digest }]);
    const screenWrite = new ScreenTextWriteRepository(pool, new SystemControlRoutingService(pool, { asr: createDefaultAsrAdapterRegistry(), screenText: screenRegistry }), screenRegistry);
    const screenResult = await screenWrite.decide(projectId, candidateId, { action: 'edit', expectedRevision: 1, text: 'new screen' }, randomUUID());
    const screenProjected = (await app.inject({ method: 'GET', url: '/api/system-control/strategy/events?domain=screen_text&limit=10&offset=0', headers: headers('reader') })).json();
    expect(screenResult.replay).toBe(false); expect(screenProjected.total).toBe(1); expect(screenProjected.items[0]).toMatchObject({ domain: 'screen_text', evidenceCount: 1, changedFields: ['status', 'text'] });
    expect(JSON.stringify({ preProjected, screenProjected })).not.toMatch(/formal raw|ocr raw|objectKey|secret|prompt/i);
  });
});
