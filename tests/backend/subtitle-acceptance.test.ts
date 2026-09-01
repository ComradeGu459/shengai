import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { createPool } from '../../backend/src/database/pool.js';
import { InMemoryDeliveryStorageFake } from '../../backend/src/modules/deliveries/in-memory-delivery-storage.fake.js';
import { DeliveryWorker } from '../../backend/src/workers/delivery.worker.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';

const pool = createPool();
const storage = new InMemoryStorageFake();
const deliveryStorage = new InMemoryDeliveryStorageFake();
const app = createApp({ database: pool, uploadStorage: storage, deliveryStorage });
const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

beforeAll(async () => app.ready());
beforeEach(async () => { deliveryStorage.clear(); await pool.query('TRUNCATE project_commands, projects CASCADE'); });
afterAll(async () => { await pool.query('TRUNCATE project_commands, projects CASCADE'); await app.close(); });

const srt = new TextEncoder().encode('\uFEFF1\n00:00:00,000 --> 00:00:01,000\n你好\n');

const storeObject = async (objectKey: string, bytes = new TextEncoder().encode('anonymous-video')) => {
  const storageUploadId = await storage.createMultipart(objectKey);
  const authorization = await storage.authorizePart({ storageUploadId, objectKey, partNumber: 1, expiresAt: new Date(Date.now() + 60_000) });
  const part = await storage.uploadAuthorizedPart(authorization.authorizationToken, bytes);
  await storage.completeMultipart({ storageUploadId, objectKey, parts: [part] });
  return bytes;
};

const seed = async (options: {
  screenTextExcludedEpisodes?: Array<{
    episodeNumber: number; jobId: string; status: 'failed' | 'reconciliation_required' | 'cancelled';
    attemptId: string | null; errorCode: string | null; effectClass: string | null;
    providerRequestId: string | null;
  }>;
} = {}) => {
  const projectId = randomUUID(); const manifestId = randomUUID(); const termDraftId = randomUUID(); const termVersionId = randomUUID();
  const assetId = randomUUID(); const objectKey = `anonymous/${assetId}`; const preSessionId = randomUUID(); const preReleaseId = randomUUID(); const sourceDigest = digest('anonymous-source');
  const screenTextBatchId = randomUUID(); const screenTextReleaseId = randomUUID();
  const screenTextReleaseDigest = digest('screen-release');
  const screenTextExcludedEpisodes = options.screenTextExcludedEpisodes ?? [];
  const partialScreenTextRelease = screenTextExcludedEpisodes.length > 0;
  await pool.query("INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,'匿名验收','ready','active',1,'test','test')", [projectId]);
  await pool.query("INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'anonymous','test')", [manifestId, projectId]);
  await pool.query("INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'EP01.mp4','video',10,'sha256',$4,CURRENT_TIMESTAMP)", [assetId, projectId, objectKey, digest('video')]);
  await pool.query("INSERT INTO material_manifest_bindings(manifest_id,episode_number,role,relative_path,file_name,size_bytes,last_modified_ms,fingerprint,media_type) VALUES($1,1,'asr_video','EP01.mp4','EP01.mp4',10,1,'video-1','video')", [manifestId]);
  await pool.query("INSERT INTO material_asset_bindings(manifest_id,episode_number,role,asset_id,source_fingerprint) VALUES($1,1,'asr_video',$2,'video-1')", [manifestId, assetId]);
  await pool.query("INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'anonymous','confirmed')", [termDraftId, projectId, sourceDigest]);
  await pool.query("INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version) VALUES($1,$2,1,$3,$4,'anonymous')", [termVersionId, projectId, termDraftId, sourceDigest]);
  await pool.query(`INSERT INTO screen_text_batches(
    id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,
    execution_kind,provider,adapter,model,language,deployment,input_version,output_version,
    capabilities,config_digest,frame_strategy_version,dedupe_strategy_version,term_projection,term_projection_entries,request_id,status
  ) VALUES($1,$2,'single',ARRAY[1],$3,$4,1,'local','test','screen_text_test','screen-text-test-v1','zh-CN','test','input-v1','output-v1','{}',$5,'frames-v1','dedupe-v1','{}','[]',$6,'completed')`, [
    screenTextBatchId, projectId, termVersionId, manifestId, 'a'.repeat(64), randomUUID(),
  ]);
  await pool.query(`INSERT INTO screen_text_releases(
    id,project_id,version,batch_id,term_version_id,manifest_id,draft_revision,release_digest,cue_count,partial,excluded_episodes
  ) VALUES($1,$2,1,$3,$4,$5,1,$6,0,$7,$8::jsonb)`, [
    screenTextReleaseId, projectId, screenTextBatchId, termVersionId, manifestId,
    screenTextReleaseDigest, partialScreenTextRelease, JSON.stringify(screenTextExcludedEpisodes),
  ]);
  await pool.query(`INSERT INTO pre_edit_sessions(id,project_id,project_version,source_srt_set_digest,term_version_id,manifest_id,manifest_version,source_digest,source_snapshot,algorithm_version,format_policy_version,status,screen_text_release_id)
    VALUES($1,$2,1,$3,$4,$5,1,$6,$7,'anonymous','anonymous','completed',$8)`, [
    preSessionId, projectId, sourceDigest, termVersionId, manifestId, digest('pre'),
    JSON.stringify({
      screenTextRelease: {
        id: screenTextReleaseId, version: 1, releaseDigest: screenTextReleaseDigest,
        partial: partialScreenTextRelease, excludedEpisodes: screenTextExcludedEpisodes,
      },
    }),
    screenTextReleaseId,
  ]);
  await pool.query("INSERT INTO pre_edit_episodes(id,session_id,episode_number,company_asset_id,video_asset_id,video_checksum_value,status,video_duration_ms) VALUES($1,$2,1,$3,$3,$4,'completed',5000)", [randomUUID(), preSessionId, assetId, digest('video')]);
  await pool.query("INSERT INTO pre_edit_releases(id,project_id,session_id,version,source_digest,decision_digest,release_digest) VALUES($1,$2,$3,1,$4,$5,$6)", [preReleaseId, projectId, preSessionId, digest('source'), digest('decision'), digest('release')]);
  await pool.query("INSERT INTO pre_edit_release_files(release_id,episode_number,file_name,cue_count,content_digest,bytes) VALUES($1,1,'EP01.srt',1,$2,$3)", [preReleaseId, digest(srt), Buffer.from(srt)]);
  return {
    projectId, manifestId, assetId, objectKey, preSessionId, preReleaseId, termVersionId,
    screenTextBatchId, screenTextReleaseId, screenTextReleaseDigest, screenTextExcludedEpisodes,
  };
};

const addSecondEpisode = async (fixture: Awaited<ReturnType<typeof seed>>) => {
  await pool.query("INSERT INTO material_manifest_bindings(manifest_id,episode_number,role,relative_path,file_name,size_bytes,last_modified_ms,fingerprint,media_type) VALUES($1,2,'asr_video','EP02.mp4','EP02.mp4',10,1,'video-2','video')", [fixture.manifestId]);
  await pool.query("INSERT INTO material_asset_bindings(manifest_id,episode_number,role,asset_id,source_fingerprint) VALUES($1,2,'asr_video',$2,'video-2')", [fixture.manifestId, fixture.assetId]);
  await pool.query("INSERT INTO pre_edit_episodes(id,session_id,episode_number,company_asset_id,video_asset_id,video_checksum_value,status,video_duration_ms) VALUES($1,$2,2,$3,$3,$4,'completed',5000)", [randomUUID(), fixture.preSessionId, fixture.assetId, digest('video')]);
  await pool.query("INSERT INTO pre_edit_release_files(release_id,episode_number,file_name,cue_count,content_digest,bytes) VALUES($1,2,'EP02.srt',1,$2,$3)", [fixture.preReleaseId, digest(srt), Buffer.from(srt)]);
};

const createAcceptanceSession = async (projectId: string) => {
  const response = await app.inject({ method: 'POST', url: `/api/projects/${projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
  expect(response.statusCode, response.body).toBe(201);
  return response.json().session;
};

const getAcceptanceSession = async (projectId: string, sessionId: string) => {
  const response = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/subtitle-acceptance/sessions/${sessionId}` });
  expect(response.statusCode, response.body).toBe(200);
  return response.json();
};

const getAcceptanceEpisode = async (projectId: string, sessionId: string, episodeNumber = 1) => {
  const response = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/subtitle-acceptance/sessions/${sessionId}/episodes/${episodeNumber}` });
  expect(response.statusCode, response.body).toBe(200);
  return response.json();
};

const activeCues = (detail: any) => detail.cues.filter((cue: any) => !cue.deleted);

const latestEditEventId = async (sessionId: string, predicate: (before: any[], after: any[]) => boolean) => {
  const events = await pool.query("SELECT id, before_snapshot, after_snapshot FROM acceptance_edit_events WHERE session_id = $1 AND event_kind = 'edit'", [sessionId]);
  const event = events.rows.find((row: any) => predicate(row.before_snapshot, row.after_snapshot));
  expect(event).toBeTruthy();
  return event.id as string;
};

const generateDelivery = async (projectId: string, sessionId: string, expectedSessionRevision: number) => {
  const confirmation = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/deliveries/confirm?sessionId=${sessionId}` });
  expect(confirmation.statusCode, confirmation.body).toBe(200);
  const source = confirmation.json().source;
  const deliveryId = randomUUID();
  const created = await app.inject({ method: 'POST', url: `/api/projects/${projectId}/deliveries`, headers: { 'idempotency-key': randomUUID() }, payload: { sessionId, expectedSessionRevision, deliveryId, sourceDigest: source.sourceDigest, templateVersionId: source.templateVersionId } });
  expect(created.statusCode, created.body).toBe(202);
  const worker = await new DeliveryWorker(pool, deliveryStorage, { leaseMs: 5_000, pollIntervalMs: 50 }, { workerId: randomUUID() }).runOnce();
  expect(worker.status).toBe('ready');
  return deliveryId;
};

describe('BACK-M3-05A 字幕验收权威状态', () => {
  it('冻结来源、保存逐集工作副本，且 S5 通过只到 ready_to_release', async () => {
    const fixture = await seed(); const key = randomUUID();
    const create = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': key }, payload: { expectedProjectVersion: 1 } });
    expect(create.statusCode, create.body).toBe(201); const session = create.json().session;
    expect(session.source).toMatchObject({ preEditReleaseId: fixture.preReleaseId, manifestId: fixture.manifestId, screenTextReleaseId: fixture.screenTextReleaseId, screenTextExcludedEpisodes: [] });
    expect(session.episodes[0]).toMatchObject({ dialogueCueCount: 1, selectedVideoAssetId: fixture.assetId, authoritativeDurationMs: 5000 });
    await expect(pool.query(
      'UPDATE acceptance_sessions SET source_digest = $2 WHERE id = $1',
      [session.id, digest('rewritten-source')],
    )).rejects.toThrow(/source identity is immutable/);
    const replay = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': key }, payload: { expectedProjectVersion: 1 } });
    expect(replay.statusCode).toBe(200); expect(replay.json().session.id).toBe(session.id);

    const pass = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/pass`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 1, expectedEpisodeRevision: 1 } });
    expect(pass.statusCode, pass.body).toBe(201); expect(pass.json().passedEpisodeNumbers).toEqual([1]);
    expect(pass.json().session.status).toBe('ready_to_release');
    const preflight = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/preflight` });
    expect(preflight.statusCode).toBe(200); expect(preflight.json().canRelease).toBe(true);
    expect((await getAcceptanceSession(fixture.projectId, session.id)).status).toBe('ready_to_release');
    const removedWritePath = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/releases`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 2 } });
    expect(removedWritePath.statusCode).toBe(404);
    const releases = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/releases` });
    expect(releases.statusCode).toBe(200);
    expect(releases.json().items).toHaveLength(0);
  });

  it('验收会话冻结 partial screen-text 排除摘要并沿用同一 Release 身份', async () => {
    const excludedJobId = randomUUID();
    const fixture = await seed({
      screenTextExcludedEpisodes: [{
        episodeNumber: 1, jobId: excludedJobId, status: 'failed', attemptId: null,
        errorCode: 'SCREEN_TEXT_TEST_FAILED', effectClass: 'external_not_accepted', providerRequestId: null,
      }],
    });
    const session = await createAcceptanceSession(fixture.projectId);
    expect(session.source.screenTextReleaseId).toBe(fixture.screenTextReleaseId);
    expect(session.source.screenTextReleaseVersion).toBe(1);
    expect(session.source.screenTextExcludedEpisodes).toEqual([expect.objectContaining({
      episodeNumber: 1, jobId: excludedJobId, status: 'failed',
      effectClass: 'external_not_accepted', providerRequestId: null,
    })]);
    const pass = await app.inject({
      method: 'POST',
      url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/pass`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedSessionRevision: 1, expectedEpisodeRevision: 1 },
    });
    expect(pass.statusCode, pass.body).toBe(201);
    await generateDelivery(fixture.projectId, session.id, pass.json().session.revision);
    const release = await pool.query<{
      source_digest: string; source_snapshot: { screenTextExcludedEpisodes: unknown[] };
    }>(
      `SELECT release.source_digest, session.source_snapshot
         FROM acceptance_releases release
         JOIN acceptance_sessions session ON session.id = release.session_id
        WHERE release.session_id = $1`,
      [session.id],
    );
    expect(release.rows[0]!.source_digest).toBe(session.source.sourceDigest);
    expect(release.rows[0]!.source_snapshot.screenTextExcludedEpisodes).toEqual(
      session.source.screenTextExcludedEpisodes,
    );
  });

  it('没有前置审改 Release 时返回明确来源错误且不创建会话或命令', async () => {
    const fixture = await seed();
    await pool.query('DELETE FROM pre_edit_release_files WHERE release_id = $1', [fixture.preReleaseId]);
    await pool.query('DELETE FROM pre_edit_releases WHERE id = $1', [fixture.preReleaseId]);
    const key = randomUUID();
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions`,
      headers: { 'idempotency-key': key },
      payload: { expectedProjectVersion: 1 },
    });
    expect(response.statusCode, response.body).toBe(422);
    expect(response.json().error).toMatchObject({
      code: 'ACCEPTANCE_SOURCE_NOT_READY',
      action: 'prepare_sources',
    });
    expect(Number((await pool.query(
      'SELECT count(*) FROM acceptance_sessions WHERE project_id = $1',
      [fixture.projectId],
    )).rows[0].count)).toBe(0);
    expect(Number((await pool.query(
      'SELECT count(*) FROM acceptance_commands WHERE project_id = $1 AND idempotency_key = $2',
      [fixture.projectId, key],
    )).rows[0].count)).toBe(0);
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

  it('撤销恢复保留来源元数据，且未通过会话不能越过服务端发布资格', async () => {
    const fixture = await seed();
    const created = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
    const session = created.json().session; const episode = session.episodes[0];
    const detail = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1` }); const cue = detail.json().cues[0];
    await pool.query("UPDATE acceptance_cues SET source_metadata = '{\"pairGroupId\":\"pair-1\",\"position\":\"left\"}'::jsonb WHERE id = $1", [cue.id]);
    const edit = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: session.revision, expectedEpisodeRevision: episode.revision, operations: [{ kind: 'update', cueId: cue.id, text: '您好' }] } });
    const eventId = (await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/events` })).json().items[0].id;
    const undo = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/undo`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: session.revision + 1, expectedEpisodeRevision: edit.json().episode.episode.revision, eventId } });
    expect(undo.statusCode, undo.body).toBe(201);
    const metadata = await pool.query('SELECT source_metadata FROM acceptance_cues WHERE id = $1', [cue.id]);
    expect(metadata.rows[0].source_metadata).toEqual({ pairGroupId: 'pair-1', position: 'left' });

    const confirmation = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/deliveries/confirm?sessionId=${session.id}` });
    expect(confirmation.statusCode).toBe(200);
    expect(confirmation.json().blockers).toContain('acceptance_session_not_ready');
  });

  it('局部返工拒绝不属于当前会话的集数且保持零副作用', async () => {
    const fixture = await seed();
    const created = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
    const session = created.json().session;
    const rework = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/rework`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: session.revision, episodeNumbers: [2], tracks: ['dialogue'], reason: '仅返工不存在的第二集' } });
    expect(rework.statusCode).toBe(422);
    const [requests, episode] = await Promise.all([
      pool.query('SELECT count(*)::integer AS count FROM acceptance_rework_requests WHERE session_id = $1', [session.id]),
      pool.query('SELECT status, revision FROM acceptance_episodes WHERE session_id = $1 AND episode_number = 1', [session.id]),
    ]);
    expect(requests.rows[0].count).toBe(0);
    expect(episode.rows[0]).toMatchObject({ status: 'in_review', revision: 1 });
  });

  it('局部返工理由去除空白后不足八字时返回可分类错误且无副作用', async () => {
    const fixture = await seed();
    const session = await createAcceptanceSession(fixture.projectId);
    const response = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/rework`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: session.revision, episodeNumbers: [1], tracks: ['dialogue'], reason: '        ' } });
    expect(response.statusCode, response.body).toBe(422);
    expect(response.json().error.code).toBe('ACCEPTANCE_REWORK_REASON_INVALID');
    expect(Number((await pool.query('SELECT count(*) FROM acceptance_rework_requests WHERE session_id = $1', [session.id])).rows[0].count)).toBe(0);
  });

  it('局部返工覆盖双轨、幂等重放与冲突边界且不污染未选集', async () => {
    const fixture = await seed(); await addSecondEpisode(fixture);
    const session = await createAcceptanceSession(fixture.projectId);
    const key = randomUUID();
    const body = { expectedSessionRevision: session.revision, episodeNumbers: [1], tracks: ['dialogue', 'screen_text'], reason: '  FIFO139 合法返工理由  ' };
    const rework = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/rework`, headers: { 'idempotency-key': key }, payload: body });
    expect(rework.statusCode, rework.body).toBe(201);
    expect(rework.json().rework).toMatchObject({ sessionId: session.id, episodeNumbers: [1], tracks: ['dialogue', 'screen_text'], reason: 'FIFO139 合法返工理由' });
    const replay = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/rework`, headers: { 'idempotency-key': key }, payload: body });
    expect(replay.statusCode, replay.body).toBe(200); expect(replay.json()).toMatchObject({ replay: true, rework: { id: rework.json().rework.id } });
    const differentBody = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/rework`, headers: { 'idempotency-key': key }, payload: { ...body, reason: '同键异参的合法理由' } });
    expect(differentBody.statusCode).toBe(409); expect(differentBody.json().error.code).toBe('ACCEPTANCE_IDEMPOTENCY_KEY_REUSED');
    const versionConflict = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/rework`, headers: { 'idempotency-key': randomUUID() }, payload: { ...body, expectedSessionRevision: session.revision } });
    expect(versionConflict.statusCode).toBe(409); expect(versionConflict.json().error.code).toBe('ACCEPTANCE_SESSION_VERSION_CONFLICT');
    const detail = await getAcceptanceSession(fixture.projectId, session.id);
    expect(detail).toMatchObject({ status: 'draft', revision: 2, episodeCounts: { total: 2, reworkRequired: 1 } });
    expect(detail.episodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ episodeNumber: 1, status: 'rework_required', revision: 2 }),
      expect.objectContaining({ episodeNumber: 2, status: 'in_review', revision: 1 }),
    ]));
    const requests = await pool.query('SELECT count(*)::integer AS count FROM acceptance_rework_requests WHERE session_id = $1', [session.id]);
    expect(requests.rows[0].count).toBe(1);
  });

  it('只通过 eligible 子集不会提前放开整剧发布资格', async () => {
    const fixture = await seed(); await addSecondEpisode(fixture);
    const created = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
    const session = created.json().session;
    const first = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/pass-eligible`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 1, episodeNumbers: [1] } });
    expect(first.statusCode, first.body).toBe(201);
    expect(first.json().session.status).toBe('draft');
    expect(first.json().session.episodes.map((episode: any) => episode.status)).toEqual(['passed', 'in_review']);
    const second = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/pass-eligible`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 2, episodeNumbers: [2] } });
    expect(second.statusCode, second.body).toBe(201);
    expect(second.json().session.status).toBe('ready_to_release');
  });

  it('open automatic warning 同时阻断预检和事务通过，记录理由后保持关闭', async () => {
    const fixture = await seed();
    const created = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
    const session = created.json().session; const cue = (await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1` })).json().cues[0];
    const edit = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 1, expectedEpisodeRevision: 1, operations: [{ kind: 'update', cueId: cue.id, endMs: 50 }] } });
    expect(edit.statusCode, edit.body).toBe(201);
    const preflight = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/preflight` });
    expect(preflight.json().episodes[0]).toMatchObject({ eligible: false, warningCodes: ['duration_too_short'] });
    const blocked = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/pass`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 2, expectedEpisodeRevision: 2 } });
    expect(blocked.statusCode, blocked.body).toBe(201);
    expect(blocked.json()).toMatchObject({ passedEpisodeNumbers: [], blockedEpisodeNumbers: [1] });
    const detail = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1` });
    const warning = detail.json().issues.find((issue: any) => issue.code === 'duration_too_short');
    const resolved = await app.inject({ method: 'PATCH', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/issues/${warning.id}`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 3, expectedEpisodeRevision: 2, status: 'waived', reason: '确认该短时长字幕可以保留' } });
    expect(resolved.statusCode, resolved.body).toBe(200);
    const passed = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/pass`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 4, expectedEpisodeRevision: 3 } });
    expect(passed.statusCode, passed.body).toBe(201);
    expect(passed.json().session.status).toBe('ready_to_release');
    const after = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1` });
    expect(after.json().issues.find((issue: any) => issue.code === 'duration_too_short')).toMatchObject({ status: 'waived', resolutionReason: '确认该短时长字幕可以保留' });
  });

  it('stale 与 released 历史会话保留只读播放，但项目、冻结成员和对象边界继续拒绝', async () => {
    const staleFixture = await seed(); const bytes = await storeObject(staleFixture.objectKey);
    const staleCreated = await app.inject({ method: 'POST', url: `/api/projects/${staleFixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
    const staleSession = staleCreated.json().session;
    await pool.query("INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,2,'anonymous-new','test')", [randomUUID(), staleFixture.projectId]);
    const stale = await app.inject({ method: 'GET', url: `/api/projects/${staleFixture.projectId}/subtitle-acceptance/sessions/${staleSession.id}` });
    const staleGrant = await app.inject({ method: 'POST', url: `/api/projects/${staleFixture.projectId}/subtitle-acceptance/sessions/${staleSession.id}/episodes/1/playback`, payload: { expectedSessionRevision: stale.json().revision } });
    expect(staleGrant.statusCode, staleGrant.body).toBe(201);
    const stalePlayback = await app.inject({ method: 'GET', url: staleGrant.json().url });
    expect(stalePlayback.rawPayload).toEqual(Buffer.from(bytes));

    const releasedFixture = await seed(); await storeObject(releasedFixture.objectKey);
    const releasedCreated = await app.inject({ method: 'POST', url: `/api/projects/${releasedFixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
    const releasedSession = releasedCreated.json().session;
    await app.inject({ method: 'POST', url: `/api/projects/${releasedFixture.projectId}/subtitle-acceptance/sessions/${releasedSession.id}/episodes/1/pass`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 1, expectedEpisodeRevision: 1 } });
    await generateDelivery(releasedFixture.projectId, releasedSession.id, 2);
    const releaseCount = await pool.query('SELECT count(*)::integer AS count FROM acceptance_releases WHERE project_id = $1', [releasedFixture.projectId]);
    expect(releaseCount.rows[0].count).toBe(1);
    expect((await getAcceptanceSession(releasedFixture.projectId, releasedSession.id)).status).toBe('released');
    const releasedGrant = await app.inject({ method: 'POST', url: `/api/projects/${releasedFixture.projectId}/subtitle-acceptance/sessions/${releasedSession.id}/episodes/1/playback`, payload: { expectedSessionRevision: 3 } });
    expect(releasedGrant.statusCode, releasedGrant.body).toBe(201);
    const releasedDetail = await app.inject({ method: 'GET', url: `/api/projects/${releasedFixture.projectId}/subtitle-acceptance/sessions/${releasedSession.id}/episodes/1` });
    const releasedWriteKey = randomUUID();
    const releasedWrite = await app.inject({ method: 'POST', url: `/api/projects/${releasedFixture.projectId}/subtitle-acceptance/sessions/${releasedSession.id}/episodes/1/cues`, headers: { 'idempotency-key': releasedWriteKey }, payload: { expectedSessionRevision: 3, expectedEpisodeRevision: 2, operations: [{ kind: 'update', cueId: releasedDetail.json().cues[0].id, text: '历史版本不可写' }] } });
    expect(releasedWrite.statusCode).toBe(409);
    expect(Number((await pool.query('SELECT count(*) FROM acceptance_commands WHERE project_id = $1 AND idempotency_key = $2', [releasedFixture.projectId, releasedWriteKey])).rows[0].count)).toBe(0);

    await pool.query("UPDATE acceptance_episodes SET available_videos = '[]'::jsonb WHERE session_id = $1", [releasedSession.id]);
    const mismatched = await app.inject({ method: 'POST', url: `/api/projects/${releasedFixture.projectId}/subtitle-acceptance/sessions/${releasedSession.id}/episodes/1/playback`, payload: { expectedSessionRevision: 3 } });
    expect(mismatched.statusCode).toBe(422);
    await pool.query("UPDATE projects SET lifecycle_status = 'recycled' WHERE id = $1", [releasedFixture.projectId]);
    const inactive = await app.inject({ method: 'POST', url: `/api/projects/${releasedFixture.projectId}/subtitle-acceptance/sessions/${releasedSession.id}/episodes/1/playback`, payload: { expectedSessionRevision: 3 } });
    expect(inactive.statusCode).toBe(409);

    const missingFixture = await seed();
    const missingCreated = await app.inject({ method: 'POST', url: `/api/projects/${missingFixture.projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
    const missingSession = missingCreated.json().session;
    const missing = await app.inject({ method: 'POST', url: `/api/projects/${missingFixture.projectId}/subtitle-acceptance/sessions/${missingSession.id}/episodes/1/playback`, payload: { expectedSessionRevision: 1 } });
    expect(missing.statusCode).toBe(422);
  });
});

describe('BACK-M3-05C 字幕验收编辑命令闭环', () => {
  it('在权威播放头新增 dialogue 与 screen_text，保持轨道、2 秒时长和计数正确', async () => {
    const fixture = await seed();
    const session = await createAcceptanceSession(fixture.projectId);
    const playheadMs = 2400;
    const edit = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: session.revision, expectedEpisodeRevision: session.episodes[0].revision, operations: [
      { kind: 'add', cue: { track: 'dialogue', startMs: playheadMs, endMs: playheadMs + 2000, text: '新增台词' } },
      { kind: 'add', cue: { track: 'screen_text', startMs: playheadMs, endMs: playheadMs + 2000, text: '新增画面字' } },
    ] } });
    expect(edit.statusCode, edit.body).toBe(201);
    expect(edit.json().episode.episode).toMatchObject({ dialogueCueCount: 2, screenTextCueCount: 1, openErrorCount: 0, openWarningCount: 0 });
    const created = activeCues(edit.json().episode).filter((cue: any) => cue.sourceCueId === null);
    expect(created.map((cue: any) => ({ track: cue.track, startMs: cue.startMs, durationMs: cue.endMs - cue.startMs, text: cue.text })).sort((left: any, right: any) => left.track.localeCompare(right.track))).toEqual([
      { track: 'dialogue', startMs: 2400, durationMs: 2000, text: '新增台词' },
      { track: 'screen_text', startMs: 2400, durationMs: 2000, text: '新增画面字' },
    ]);
  });

  it('单条与批量删除只改工作副本，并同步问题、计数和通过签名', async () => {
    const fixture = await seed();
    const session = await createAcceptanceSession(fixture.projectId);
    const sourceBefore = (await pool.query('SELECT cue_count, bytes FROM pre_edit_release_files WHERE release_id = $1 AND episode_number = 1', [fixture.preReleaseId])).rows[0];
    const overlap = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 1, expectedEpisodeRevision: 1, operations: [{ kind: 'add', cue: { track: 'dialogue', startMs: 500, endMs: 1200, text: '重叠台词' } }] } });
    expect(overlap.statusCode, overlap.body).toBe(201);
    expect(overlap.json().episode.episode.openErrorCount).toBe(1);
    const overlapCue = activeCues(overlap.json().episode).find((cue: any) => cue.text === '重叠台词');
    const removeOverlap = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 2, expectedEpisodeRevision: 2, operations: [{ kind: 'delete', cueIds: [overlapCue.id] }] } });
    expect(removeOverlap.statusCode, removeOverlap.body).toBe(201);
    expect(removeOverlap.json().episode.episode.openErrorCount).toBe(0);
    const addValid = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 3, expectedEpisodeRevision: 3, operations: [
      { kind: 'add', cue: { track: 'dialogue', startMs: 2000, endMs: 3000, text: '可删台词' } },
      { kind: 'add', cue: { track: 'screen_text', startMs: 3200, endMs: 4200, text: '可删画面字' } },
    ] } });
    expect(addValid.statusCode, addValid.body).toBe(201);
    const pass = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/pass`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: addValid.json().episode.episode.revision, expectedEpisodeRevision: addValid.json().episode.episode.revision } });
    expect(pass.statusCode, pass.body).toBe(201);
    expect(pass.json().session.episodes[0].passSignature).toBeTruthy();
    const passedDetail = await getAcceptanceEpisode(fixture.projectId, session.id);
    const singleTarget = activeCues(passedDetail).find((cue: any) => cue.text === '可删台词');
    const singleDelete = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: pass.json().session.revision, expectedEpisodeRevision: pass.json().session.episodes[0].revision, operations: [{ kind: 'delete', cueIds: [singleTarget.id] }] } });
    expect(singleDelete.statusCode, singleDelete.body).toBe(201);
    expect(singleDelete.json().episode.episode).toMatchObject({ status: 'changes_pending', dialogueCueCount: 1, screenTextCueCount: 1, passSignature: null, openErrorCount: 0 });
    const remainingCueIds = activeCues(singleDelete.json().episode).map((cue: any) => cue.id);
    const batchDelete = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: singleDelete.json().episode.episode.revision, expectedEpisodeRevision: singleDelete.json().episode.episode.revision, operations: [{ kind: 'delete', cueIds: remainingCueIds }] } });
    expect(batchDelete.statusCode, batchDelete.body).toBe(201);
    expect(batchDelete.json().episode.episode).toMatchObject({ dialogueCueCount: 0, screenTextCueCount: 0, openErrorCount: 0, passSignature: null });
    const sourceAfter = (await pool.query('SELECT cue_count, bytes FROM pre_edit_release_files WHERE release_id = $1 AND episode_number = 1', [fixture.preReleaseId])).rows[0];
    expect(sourceAfter.cue_count).toBe(sourceBefore.cue_count);
    expect(Buffer.from(sourceAfter.bytes).equals(Buffer.from(sourceBefore.bytes))).toBe(true);
  });

  it('复制由前端持有，后端 cut/paste 验证相对时间、原轨和明确跨轨目标', async () => {
    const fixture = await seed();
    const session = await createAcceptanceSession(fixture.projectId);
    const addScreen = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 1, expectedEpisodeRevision: 1, operations: [{ kind: 'add', cue: { track: 'screen_text', startMs: 1200, endMs: 2200, text: '原画面字' } }] } });
    expect(addScreen.statusCode, addScreen.body).toBe(201);
    const selected = activeCues(addScreen.json().episode).sort((left: any, right: any) => left.startMs - right.startMs);
    const anchorMs = selected[0].startMs;
    const clipboard = selected.map((cue: any) => ({ track: cue.track, startOffsetMs: cue.startMs - anchorMs, endOffsetMs: cue.endMs - anchorMs, text: cue.text }));
    const cut = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 2, expectedEpisodeRevision: 2, operations: [{ kind: 'cut', cueIds: selected.map((cue: any) => cue.id) }] } });
    expect(cut.statusCode, cut.body).toBe(201);
    expect(cut.json().episode.episode).toMatchObject({ dialogueCueCount: 0, screenTextCueCount: 0 });
    const pasteOriginalTrack = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 3, expectedEpisodeRevision: 3, operations: [{ kind: 'paste', cues: clipboard.map((cue: any) => ({ track: cue.track, startMs: 2400 + cue.startOffsetMs, endMs: 2400 + cue.endOffsetMs, text: cue.text })) }] } });
    expect(pasteOriginalTrack.statusCode, pasteOriginalTrack.body).toBe(201);
    expect(activeCues(pasteOriginalTrack.json().episode).map((cue: any) => ({ track: cue.track, startMs: cue.startMs, endMs: cue.endMs, text: cue.text })).sort((left: any, right: any) => left.startMs - right.startMs)).toEqual([
      { track: 'dialogue', startMs: 2400, endMs: 3400, text: '你好' },
      { track: 'screen_text', startMs: 3600, endMs: 4600, text: '原画面字' },
    ]);
    const pasteCrossTrack = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 4, expectedEpisodeRevision: 4, operations: [{ kind: 'paste', cues: clipboard.map((cue: any) => ({ track: 'screen_text', startMs: cue.startOffsetMs, endMs: cue.endOffsetMs, text: `跨轨-${cue.text}` })) }] } });
    expect(pasteCrossTrack.statusCode, pasteCrossTrack.body).toBe(201);
    expect(pasteCrossTrack.json().episode.episode).toMatchObject({ dialogueCueCount: 1, screenTextCueCount: 3, openErrorCount: 0 });
    const crossTrack = activeCues(pasteCrossTrack.json().episode).filter((cue: any) => cue.text.startsWith('跨轨-'));
    expect(crossTrack.every((cue: any) => cue.track === 'screen_text')).toBe(true);
    expect(crossTrack.map((cue: any) => [cue.startMs, cue.endMs])).toEqual([[0, 1000], [1200, 2200]]);
  });

  it('新增、删除、剪贴后均可撤销和恢复', async () => {
    const fixture = await seed();
    const session = await createAcceptanceSession(fixture.projectId);
    const add = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 1, expectedEpisodeRevision: 1, operations: [{ kind: 'add', cue: { track: 'dialogue', startMs: 2000, endMs: 3000, text: '撤销新增台词' } }] } });
    expect(add.statusCode, add.body).toBe(201);
    const addEventId = await latestEditEventId(session.id, (before, after) => !before.some((cue) => cue.text === '撤销新增台词') && after.some((cue) => cue.text === '撤销新增台词'));
    const undoAdd = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/undo`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 2, expectedEpisodeRevision: 2, eventId: addEventId } });
    expect(undoAdd.statusCode, undoAdd.body).toBe(201);
    expect(activeCues(undoAdd.json().episode).some((cue: any) => cue.text === '撤销新增台词')).toBe(false);
    const redoAdd = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/redo`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 3, expectedEpisodeRevision: 3, eventId: addEventId } });
    expect(redoAdd.statusCode, redoAdd.body).toBe(201);
    const addedCue = activeCues(redoAdd.json().episode).find((cue: any) => cue.text === '撤销新增台词');
    const remove = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 4, expectedEpisodeRevision: 4, operations: [{ kind: 'delete', cueIds: [addedCue.id] }] } });
    expect(remove.statusCode, remove.body).toBe(201);
    const removeEventId = await latestEditEventId(session.id, (before, after) => before.some((cue) => cue.text === '撤销新增台词' && !cue.deleted) && after.some((cue) => cue.text === '撤销新增台词' && cue.deleted));
    const undoRemove = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/undo`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 5, expectedEpisodeRevision: 5, eventId: removeEventId } });
    expect(undoRemove.statusCode, undoRemove.body).toBe(201);
    expect(activeCues(undoRemove.json().episode).some((cue: any) => cue.text === '撤销新增台词')).toBe(true);
    const redoRemove = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/redo`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 6, expectedEpisodeRevision: 6, eventId: removeEventId } });
    expect(redoRemove.statusCode, redoRemove.body).toBe(201);
    expect(activeCues(redoRemove.json().episode).some((cue: any) => cue.text === '撤销新增台词')).toBe(false);
    const originalCue = activeCues(redoRemove.json().episode).find((cue: any) => cue.text === '你好');
    const cutPaste = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 7, expectedEpisodeRevision: 7, operations: [
      { kind: 'cut', cueIds: [originalCue.id] },
      { kind: 'paste', cues: [{ track: 'dialogue', startMs: 3000, endMs: 4000, text: '剪贴后台词' }] },
    ] } });
    expect(cutPaste.statusCode, cutPaste.body).toBe(201);
    const cutPasteEventId = await latestEditEventId(session.id, (before, after) => before.some((cue) => cue.text === '你好' && !cue.deleted) && after.some((cue) => cue.text === '剪贴后台词' && !cue.deleted));
    const undoCutPaste = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/undo`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 8, expectedEpisodeRevision: 8, eventId: cutPasteEventId } });
    expect(undoCutPaste.statusCode, undoCutPaste.body).toBe(201);
    expect(activeCues(undoCutPaste.json().episode).map((cue: any) => cue.text)).toEqual(['你好']);
    const redoCutPaste = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/redo`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 9, expectedEpisodeRevision: 9, eventId: cutPasteEventId } });
    expect(redoCutPaste.statusCode, redoCutPaste.body).toBe(201);
    expect(activeCues(redoCutPaste.json().episode).map((cue: any) => cue.text)).toEqual(['剪贴后台词']);
  });

  it('同键同请求重放、同键异参冲突和版本冲突均保持零副作用', async () => {
    const fixture = await seed();
    const session = await createAcceptanceSession(fixture.projectId);
    const key = randomUUID();
    const payload = { expectedSessionRevision: 1, expectedEpisodeRevision: 1, operations: [{ kind: 'add', cue: { track: 'dialogue', startMs: 2000, endMs: 3000, text: '幂等新增台词' } }] };
    const first = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': key }, payload });
    expect(first.statusCode, first.body).toBe(201);
    const replay = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': key }, payload });
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json().replay).toBe(true);
    const beforeConflict = await getAcceptanceEpisode(fixture.projectId, session.id);
    const eventCount = Number((await pool.query("SELECT count(*) FROM acceptance_edit_events WHERE session_id = $1 AND event_kind = 'edit'", [session.id])).rows[0].count);
    const reused = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': key }, payload: { expectedSessionRevision: 2, expectedEpisodeRevision: 2, operations: [{ kind: 'add', cue: { track: 'dialogue', startMs: 3200, endMs: 4200, text: '异参台词' } }] } });
    expect(reused.statusCode).toBe(409);
    expect(reused.json().error.code).toBe('ACCEPTANCE_IDEMPOTENCY_KEY_REUSED');
    const staleKey = randomUUID();
    const stale = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': staleKey }, payload: { expectedSessionRevision: 1, expectedEpisodeRevision: 1, operations: [{ kind: 'add', cue: { track: 'screen_text', startMs: 3200, endMs: 4200, text: '旧版本画面字' } }] } });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe('ACCEPTANCE_SESSION_VERSION_CONFLICT');
    const afterConflict = await getAcceptanceEpisode(fixture.projectId, session.id);
    expect(activeCues(afterConflict).map((cue: any) => cue.text)).toEqual(activeCues(beforeConflict).map((cue: any) => cue.text));
    expect(Number((await pool.query("SELECT count(*) FROM acceptance_edit_events WHERE session_id = $1 AND event_kind = 'edit'", [session.id])).rows[0].count)).toBe(eventCount);
    expect(Number((await pool.query('SELECT count(*) FROM acceptance_commands WHERE project_id = $1 AND idempotency_key = $2', [fixture.projectId, staleKey])).rows[0].count)).toBe(0);
  });

  it('非法编辑只形成质量问题，并阻断通过和发布', async () => {
    const fixture = await seed();
    const session = await createAcceptanceSession(fixture.projectId);
    const invalid = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/cues`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: 1, expectedEpisodeRevision: 1, operations: [{ kind: 'add', cue: { track: 'dialogue', startMs: 4800, endMs: 5200, text: '' } }] } });
    expect(invalid.statusCode, invalid.body).toBe(201);
    expect(invalid.json().episode.episode.openErrorCount).toBeGreaterThanOrEqual(2);
    expect(invalid.json().episode.issues.filter((issue: any) => issue.status === 'open').map((issue: any) => issue.code).sort()).toEqual(expect.arrayContaining(['after_video_end', 'empty_text']));
    const current = await getAcceptanceSession(fixture.projectId, session.id);
    const pass = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/subtitle-acceptance/sessions/${session.id}/episodes/1/pass`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: current.revision, expectedEpisodeRevision: invalid.json().episode.episode.revision } });
    expect(pass.statusCode, pass.body).toBe(201);
    expect(pass.json()).toMatchObject({ passedEpisodeNumbers: [], blockedEpisodeNumbers: [1] });
    const confirmation = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/deliveries/confirm?sessionId=${session.id}` });
    expect(confirmation.statusCode).toBe(200);
    expect(confirmation.json().blockers).toContain('acceptance_session_not_ready');
  });
});
