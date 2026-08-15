import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { createPool } from '../../backend/src/database/pool.js';

const pool = createPool();
const app = createApp({ database: pool });
const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

beforeAll(async () => app.ready());
beforeEach(async () => { await pool.query('TRUNCATE project_commands, projects CASCADE'); });
afterAll(async () => { await pool.query('TRUNCATE project_commands, projects CASCADE'); await app.close(); });

const srt = new TextEncoder().encode('\uFEFF1\n00:00:00,000 --> 00:00:01,000\n你好\n');

const seed = async () => {
  const projectId = randomUUID(); const manifestId = randomUUID(); const termDraftId = randomUUID(); const termVersionId = randomUUID();
  const assetId = randomUUID(); const preSessionId = randomUUID(); const preReleaseId = randomUUID(); const sourceDigest = digest('anonymous-source');
  await pool.query("INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,'匿名验收','ready','active',1,'test','test')", [projectId]);
  await pool.query("INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'anonymous','test')", [manifestId, projectId]);
  await pool.query("INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'EP01.mp4','video',10,'sha256',$4,CURRENT_TIMESTAMP)", [assetId, projectId, `anonymous/${assetId}`, digest('video')]);
  await pool.query("INSERT INTO material_manifest_bindings(manifest_id,episode_number,role,relative_path,file_name,size_bytes,last_modified_ms,fingerprint,media_type) VALUES($1,1,'asr_video','EP01.mp4','EP01.mp4',10,1,'video-1','video')", [manifestId]);
  await pool.query("INSERT INTO material_asset_bindings(manifest_id,episode_number,role,asset_id,source_fingerprint) VALUES($1,1,'asr_video',$2,'video-1')", [manifestId, assetId]);
  await pool.query("INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'anonymous','confirmed')", [termDraftId, projectId, sourceDigest]);
  await pool.query("INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version) VALUES($1,$2,1,$3,$4,'anonymous')", [termVersionId, projectId, termDraftId, sourceDigest]);
  await pool.query(`INSERT INTO pre_edit_sessions(id,project_id,project_version,source_srt_set_digest,term_version_id,manifest_id,manifest_version,source_digest,source_snapshot,algorithm_version,format_policy_version,status)
    VALUES($1,$2,1,$3,$4,$5,1,$6,'{}','anonymous','anonymous','completed')`, [preSessionId, projectId, sourceDigest, termVersionId, manifestId, digest('pre')]);
  await pool.query("INSERT INTO pre_edit_episodes(id,session_id,episode_number,company_asset_id,video_asset_id,video_checksum_value,status,video_duration_ms) VALUES($1,$2,1,$3,$3,$4,'completed',5000)", [randomUUID(), preSessionId, assetId, digest('video')]);
  await pool.query("INSERT INTO pre_edit_releases(id,project_id,session_id,version,source_digest,decision_digest,release_digest) VALUES($1,$2,$3,1,$4,$5,$6)", [preReleaseId, projectId, preSessionId, digest('source'), digest('decision'), digest('release')]);
  await pool.query("INSERT INTO pre_edit_release_files(release_id,episode_number,file_name,cue_count,content_digest,bytes) VALUES($1,1,'EP01.srt',1,$2,$3)", [preReleaseId, digest(srt), Buffer.from(srt)]);
  return { projectId, manifestId, assetId, preReleaseId };
};

describe('BACK-M3-05A 字幕验收权威状态', () => {
  it('冻结来源、保存逐集工作副本，并以幂等且并发安全的发布链完成刷新恢复', async () => {
    const fixture = await seed(); const key = randomUUID();
    const create = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': key }, payload: { expectedProjectVersion: 1 } });
    expect(create.statusCode, create.body).toBe(201); const session = create.json().session;
    expect(session.source).toMatchObject({ preEditReleaseId: fixture.preReleaseId, manifestId: fixture.manifestId });
    expect(session.episodes[0]).toMatchObject({ dialogueCueCount: 1, selectedVideoAssetId: fixture.assetId, authoritativeDurationMs: 5000 });
    const replay = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': key }, payload: { expectedProjectVersion: 1 } });
    expect(replay.statusCode).toBe(200); expect(replay.json().session.id).toBe(session.id);

    const pass = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/pass`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 1, expectedEpisodeRevision: 1 } });
    expect(pass.statusCode, pass.body).toBe(201); expect(pass.json().passedEpisodeNumbers).toEqual([1]);
    const release = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/releases`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 2 } });
    expect(release.statusCode, release.body).toBe(201); expect(release.json().release.cueCount).toBe(1);
    const releases = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/releases` });
    expect(releases.json().items).toHaveLength(1);
  });

  it('编辑会解除通过、保留不可变事件并在来源变化后阻断写入', async () => {
    const fixture = await seed();
    const created = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
    const session = created.json().session; const episode = session.episodes[0];
    const detail = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1` }); const cue = detail.json().cues[0];
    const edit = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: session.revision, expectedEpisodeRevision: episode.revision, operations: [{ kind: 'update', cueId: cue.id, text: '您好' }] } });
    expect(edit.statusCode, edit.body).toBe(201); expect(edit.json().episode.episode.status).toBe('changes_pending');
    const events = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/events` }); expect(events.json().items).toHaveLength(1);
    await pool.query("INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,2,'anonymous-2','test')", [randomUUID(), fixture.projectId]);
    const stale = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}` }); expect(stale.statusCode).toBe(200); expect(stale.json().status).toBe('stale');
    const blocked = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: stale.json().revision, expectedEpisodeRevision: edit.json().episode.episode.revision, operations: [{ kind: 'update', cueId: cue.id, text: '再见' }] } });
    expect(blocked.statusCode).toBe(409);
  });
});
