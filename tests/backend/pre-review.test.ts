import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { createPool } from '../../backend/src/database/pool.js';
import { PreReviewWorkerRepository } from '../../backend/src/modules/pre-review/pre-review.worker.repository.js';
import { parseSrt } from '../../backend/src/modules/terms/srt-parser.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';
import { PreReviewWorker } from '../../backend/src/workers/pre-review.worker.js';
import { runPreReviewWorker } from '../../backend/src/workers/pre-review.worker.entry.js';

const pool = createPool();
const storage = new InMemoryStorageFake();
const app = createApp({ database: pool, uploadStorage: storage });
const worker = new PreReviewWorker(new PreReviewWorkerRepository(pool), {
  workerId: 'anonymous-pre-edit-worker',
  leaseMs: 30_000,
});

beforeAll(async () => app.ready());
beforeEach(async () => {
  await pool.query('TRUNCATE project_commands, projects CASCADE');
});
afterAll(async () => {
  await pool.query('TRUNCATE project_commands, projects CASCADE');
  await app.close();
});

const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const encode = (value: string) => new TextEncoder().encode(value);

const companyCueSeed = [
  { index: 1, start: 1_000, end: 1_800, text: '你好' },
  { index: 2, start: 3_000, end: 3_400, text: '甲句' },
  { index: 3, start: 3_400, end: 3_800, text: '乙句' },
  { index: 4, start: 5_000, end: 6_000, text: '组合台词' },
  { index: 5, start: 7_000, end: 7_600, text: '仅公司甲' },
  { index: 6, start: 9_000, end: 9_600, text: '你好，世界。' },
  { index: 7, start: 11_000, end: 11_600, text: '歧义甲' },
  { index: 8, start: 11_500, end: 12_100, text: '歧义乙' },
  { index: 9, start: 14_000, end: 15_000, text: '这是一个去掉空白以后明确超过二十八个汉字并且需要人工填写保留理由的匿名长句台词' },
  { index: 10, start: 16_000, end: 16_600, text: '仅公司乙' },
];

const asrCueSeed = [
  { index: 1, start: 1_000, end: 1_800, text: '你好' },
  { index: 2, start: 3_000, end: 3_800, text: '甲句 乙句' },
  { index: 3, start: 5_000, end: 5_400, text: '组合' },
  { index: 4, start: 5_400, end: 6_000, text: '台词' },
  { index: 5, start: 8_000, end: 8_500, text: '仅识别甲' },
  { index: 6, start: 9_000, end: 9_600, text: '你好 世界' },
  { index: 7, start: 11_000, end: 11_700, text: '歧义识别甲' },
  { index: 8, start: 11_600, end: 12_200, text: '歧义识别乙' },
  { index: 9, start: 14_000, end: 15_000, text: companyCueSeed[8]!.text },
  { index: 10, start: 17_000, end: 17_600, text: '仅识别乙' },
];

const timestamp = (milliseconds: number) => {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

const companySrt = encode(companyCueSeed.map((cue) => [
  cue.index,
  `${timestamp(cue.start)} --> ${timestamp(cue.end)}`,
  cue.text,
].join('\n')).join('\n\n'));

const putObject = async (objectKey: string, bytes: Uint8Array) => {
  const uploadId = await storage.createMultipart(objectKey);
  const authorization = await storage.authorizePart({
    storageUploadId: uploadId,
    objectKey,
    partNumber: 1,
    expiresAt: new Date(Date.now() + 60_000),
  });
  const part = await storage.uploadAuthorizedPart(authorization.authorizationToken, bytes);
  await storage.completeMultipart({ storageUploadId: uploadId, objectKey, parts: [part] });
};

const seedProject = async (options: { videoDurationMs?: number } = {}) => {
  const projectId = randomUUID();
  const manifestId = randomUUID();
  const companyAssetId = randomUUID();
  const videoAssetId = randomUUID();
  const termDraftId = randomUUID();
  const termVersionId = randomUUID();
  const termCandidateId = randomUUID();
  const batchId = randomUUID();
  const jobId = randomUUID();
  const attemptId = randomUUID();
  const resultId = randomUUID();
  const companyObjectKey = `anonymous/${projectId}/company.srt`;
  const videoObjectKey = `anonymous/${projectId}/episode.mp4`;
  const videoBytes = encode('anonymous-mp4-evidence');
  await putObject(companyObjectKey, companySrt);
  await putObject(videoObjectKey, videoBytes);
  await pool.query(
    `INSERT INTO projects (
       id, name, workflow_status, lifecycle_status, version, created_by, updated_by
     ) VALUES ($1, '匿名前置审改剧', 'ready', 'active', 1, 'test', 'test')`,
    [projectId],
  );
  await pool.query(
    `INSERT INTO material_manifests (id, project_id, version, root_name, created_by)
     VALUES ($1, $2, 1, 'anonymous', 'test')`,
    [manifestId, projectId],
  );
  await pool.query(
    `INSERT INTO assets (
       id, project_id, object_key, original_filename, media_kind, size_bytes,
       checksum_algorithm, checksum_value, verified_at
     ) VALUES
       ($1, $3, $4, 'EP01.srt', 'srt', $5, 'sha256', $6, CURRENT_TIMESTAMP),
       ($2, $3, $7, 'EP01.mp4', 'video', $8, 'sha256', $9, CURRENT_TIMESTAMP)`,
    [
      companyAssetId, videoAssetId, projectId, companyObjectKey, companySrt.byteLength,
      sha256(companySrt), videoObjectKey, videoBytes.byteLength, sha256(videoBytes),
    ],
  );
  for (const binding of [
    { role: 'company_srt', fileName: 'EP01.srt', mediaType: 'srt', assetId: companyAssetId },
    { role: 'asr_video', fileName: 'EP01.mp4', mediaType: 'video', assetId: videoAssetId },
  ]) {
    await pool.query(
      `INSERT INTO material_manifest_bindings (
         manifest_id, episode_number, role, relative_path, file_name,
         size_bytes, last_modified_ms, fingerprint, media_type
       ) VALUES ($1, 1, $2, $3, $4, $5, 1, $6, $7)`,
      [
        manifestId, binding.role, `anonymous/${binding.fileName}`, binding.fileName,
        binding.role === 'company_srt' ? companySrt.byteLength : videoBytes.byteLength,
        `anonymous-${binding.role}`, binding.mediaType,
      ],
    );
    await pool.query(
      `INSERT INTO material_asset_bindings (
         manifest_id, episode_number, role, asset_id, source_fingerprint
       ) VALUES ($1, 1, $2, $3, $4)`,
      [manifestId, binding.role, binding.assetId, `anonymous-${binding.role}`],
    );
  }
  const sourceSrtSetDigest = sha256([
    1,
    companyAssetId,
    'sha256',
    sha256(companySrt),
  ].join(':'));
  await pool.query(
    `INSERT INTO term_drafts (
       id, project_id, source_srt_set_digest, prompt_version, status
     ) VALUES ($1, $2, $3, 'term-prompt-v1', 'confirmed')`,
    [termDraftId, projectId, sourceSrtSetDigest],
  );
  await pool.query(
    `INSERT INTO term_versions (
       id, project_id, version, draft_id, source_srt_set_digest, prompt_version
     ) VALUES ($1, $2, 1, $3, $4, 'term-prompt-v1')`,
    [termVersionId, projectId, termDraftId, sourceSrtSetDigest],
  );
  await pool.query(
    `INSERT INTO term_candidates (
       id, draft_id, type, name, aliases, gender, note, origin, status
     ) VALUES ($1, $2, '人名', '仅公司甲', '["匿名别称"]'::jsonb, 'unknown', '', 'manual', 'approved')`,
    [termCandidateId, termDraftId],
  );
  await pool.query(
    `INSERT INTO term_version_items (
       term_version_id, source_candidate_id, sort_order, type, name, aliases,
       gender, note, first_episode_number, first_cue_index
     ) VALUES ($1, $2, 1, '人名', '仅公司甲', '["匿名别称"]'::jsonb,
       'unknown', '', 1, 5)`,
    [termVersionId, termCandidateId],
  );
  const parsedCompany = parseSrt({
    bytes: companySrt,
    assetId: companyAssetId,
    episodeNumber: 1,
    fileName: 'EP01.srt',
  });
  for (const cue of parsedCompany) {
    await pool.query(
      `INSERT INTO term_cues (
         id, project_id, source_srt_set_digest, asset_id, episode_number,
         cue_index, start_ms, end_ms, text
       ) VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8)`,
      [cue.id, projectId, sourceSrtSetDigest, companyAssetId, cue.cueIndex, cue.startMs, cue.endMs, cue.text],
    );
  }
  const digestA = 'a'.repeat(64);
  const digestB = 'b'.repeat(64);
  await pool.query(
    `INSERT INTO asr_batches (
       id, project_id, scope_kind, episode_numbers, term_version_id, manifest_id, manifest_version,
       provider, adapter, model, language, config_digest, hotword_digest,
       hotword_term_count, hotword_alias_count, hotword_filtered_count, hotword_truncated_count,
       force_new_recognition, status
     ) VALUES ($1, $2, 'single', ARRAY[1], $3, $4, 1,
       'fake', 'deterministic_fake', 'anonymous-v1', 'zh-CN', $5, $6,
       0, 0, 0, 0, FALSE, 'completed')`,
    [batchId, projectId, termVersionId, manifestId, digestA, digestB],
  );
  await pool.query(
    `INSERT INTO asr_jobs (
       id, batch_id, project_id, episode_number, manifest_id, asset_id,
       asset_original_filename, asset_checksum_algorithm, asset_checksum_value,
       term_version_id, config_digest, hotword_digest, status
     ) VALUES ($1, $2, $3, 1, $4, $5, 'EP01.mp4', 'sha256', $6, $7, $8, $9, 'completed')`,
    [jobId, batchId, projectId, manifestId, videoAssetId, sha256(videoBytes), termVersionId, digestA, digestB],
  );
  await pool.query(
    `INSERT INTO asr_attempts (
       id, job_id, attempt_number, status, started_at, completed_at
     ) VALUES ($1, $2, 1, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [attemptId, jobId],
  );
  await pool.query(
    `INSERT INTO asr_results (
       id, source_job_id, attempt_id, project_id, episode_number, revision,
       asset_id, term_version_id, config_digest, hotword_digest, quality_status, quality_summary
     ) VALUES ($1, $2, $3, $4, 1, 1, $5, $6, $7, $8, 'pass', '{}')`,
    [resultId, jobId, attemptId, projectId, videoAssetId, termVersionId, digestA, digestB],
  );
  for (const cue of asrCueSeed) {
    await pool.query(
      `INSERT INTO asr_cues (result_id, cue_index, start_ms, end_ms, text, confidence)
       VALUES ($1, $2, $3, $4, $5, 0.95)`,
      [resultId, cue.index, cue.start, cue.end, cue.text],
    );
  }
  await pool.query(
    'UPDATE asr_jobs SET current_attempt_id = $2, current_result_id = $3 WHERE id = $1',
    [jobId, attemptId, resultId],
  );
  await pool.query(
    `INSERT INTO asr_usage (
       attempt_id, provider, media_duration_ms, billing_unit, billing_quantity,
       currency, estimated_amount, final_amount, reconciliation_status
     ) VALUES ($1, 'fake', $2, 'second', 0, 'CNY', 0, 0, 'final')`,
    [attemptId, options.videoDurationMs ?? 18_000],
  );
  return {
    projectId,
    manifestId,
    companyAssetId,
    videoAssetId,
    termVersionId,
    sourceSrtSetDigest,
    videoBytes,
  };
};

const createPreparedSession = async (options: { videoDurationMs?: number } = {}) => {
  const seeded = await seedProject(options);
  const key = randomUUID();
  const created = await app.inject({
    method: 'POST',
    url: `/api/projects/${seeded.projectId}/pre-review/sessions`,
    headers: { 'idempotency-key': key },
    payload: { termVersionId: seeded.termVersionId, expectedProjectVersion: 1 },
  });
  expect(created.statusCode, created.body).toBe(201);
  const replay = await app.inject({
    method: 'POST',
    url: `/api/projects/${seeded.projectId}/pre-review/sessions`,
    headers: { 'idempotency-key': key },
    payload: { termVersionId: seeded.termVersionId, expectedProjectVersion: 1 },
  });
  expect(replay.statusCode, replay.body).toBe(200);
  expect(replay.json().session.id).toBe(created.json().session.id);
  expect(await worker.runOnce()).toBe(true);
  const detail = await app.inject({
    method: 'GET',
    url: `/api/projects/${seeded.projectId}/pre-review/sessions/${created.json().session.id}`,
  });
  expect(detail.statusCode, detail.body).toBe(200);
  expect(detail.json().status).toBe('ready');
  return { ...seeded, sessionId: created.json().session.id, detail: detail.json() };
};

const listItems = async (projectId: string, sessionId: string) => {
  const response = await app.inject({
    method: 'GET',
    url: `/api/projects/${projectId}/pre-review/sessions/${sessionId}/items?episodeNumber=1&limit=100`,
  });
  expect(response.statusCode, response.body).toBe(200);
  return response.json().items as any[];
};

const decide = async (
  projectId: string,
  sessionId: string,
  item: any,
  action: string,
  options: { text?: string; formatOverrideReason?: string; key?: string } = {},
) => app.inject({
  method: 'POST',
  url: `/api/projects/${projectId}/pre-review/sessions/${sessionId}/items/${item.id}/decisions`,
  headers: { 'idempotency-key': options.key ?? randomUUID() },
  payload: {
    expectedVersion: item.version,
    action,
    ...(options.text !== undefined ? { text: options.text } : {}),
    ...(options.formatOverrideReason ? { formatOverrideReason: options.formatOverrideReason } : {}),
  },
});

describe('BACK-M3-03A 前置审改权威后端', () => {
  it('固定完整来源身份并由租约 Worker 生成六类对齐、唯一目标和可重复读取的短时视频证据', async () => {
    const prepared = await createPreparedSession();
    const items = await listItems(prepared.projectId, prepared.sessionId);
    expect(new Set(items.map((item) => item.groupKind))).toEqual(new Set([
      'one_to_one', 'one_company_many_asr', 'many_company_one_asr',
      'company_only', 'asr_only', 'uncertain',
    ]));
    const targets = items.map((item) => item.targetCompanyCueId).filter(Boolean);
    expect(new Set(targets).size).toBe(targets.length);
    expect(prepared.detail).toMatchObject({
      sourceSrtSetDigest: prepared.sourceSrtSetDigest,
      termVersionId: prepared.termVersionId,
      manifestId: prepared.manifestId,
      algorithmVersion: 'pre-edit-align-v1',
      formatPolicyVersion: 'pre-edit-format-v1',
      episodes: [{
        asr: { provider: 'fake', adapter: 'deterministic_fake' },
        videoAssetId: prepared.videoAssetId,
        videoDurationMs: 18_000,
        videoDurationStatus: 'known',
      }],
    });
    expect(items.find((item) => item.currentText === '仅公司甲')?.termEvidence).toEqual([
      expect.objectContaining({ name: '仅公司甲', companyMatched: true, asrMatched: false, conflict: true }),
    ]);
    const target = items.find((item) => item.targetCompanyCueId)!;
    const grant = await app.inject({
      method: 'POST',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}/items/${target.id}/playback`,
      payload: { expectedSessionRevision: prepared.detail.revision },
    });
    expect(grant.statusCode, grant.body).toBe(201);
    expect(grant.json()).toMatchObject({
      assetId: prepared.videoAssetId,
      seek: { startMs: 0 },
    });
    const first = await app.inject({ method: 'GET', url: grant.json().url });
    const second = await app.inject({ method: 'GET', url: grant.json().url });
    expect(first.statusCode, first.body).toBe(200);
    expect(second.statusCode, second.body).toBe(200);
    expect(first.rawPayload).toEqual(Buffer.from(prepared.videoBytes));
    expect(second.rawPayload).toEqual(first.rawPayload);
  });

  it('独立轮询 Worker 可停止并推进正式 queued，会话缺少部分 ASR 时进入 limited', async () => {
    const seeded = await seedProject();
    const created = await app.inject({
      method: 'POST',
      url: `/api/projects/${seeded.projectId}/pre-review/sessions`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { termVersionId: seeded.termVersionId, expectedProjectVersion: 1 },
    });
    expect(created.statusCode, created.body).toBe(201);
    const sessionId = created.json().session.id;
    const secondCueId = sha256(`${seeded.sourceSrtSetDigest}:episode-2:cue-11`);
    await pool.query(
      `INSERT INTO term_cues (
         id, project_id, source_srt_set_digest, asset_id, episode_number,
         cue_index, start_ms, end_ms, text
       ) VALUES ($1, $2, $3, $4, 2, 11, 1000, 1800, '第二集公司稿')`,
      [secondCueId, seeded.projectId, seeded.sourceSrtSetDigest, seeded.companyAssetId],
    );
    await pool.query(
      `INSERT INTO pre_edit_episodes (
         session_id, episode_number, company_asset_id, video_asset_id, video_checksum_value
       ) VALUES ($1, 2, $2, $3, $4)`,
      [sessionId, seeded.companyAssetId, seeded.videoAssetId, sha256(seeded.videoBytes)],
    );
    const controller = new AbortController();
    const running = runPreReviewWorker({ database: pool, signal: controller.signal, pollIntervalMs: 50 });
    let detail: any = null;
    for (let index = 0; index < 40; index += 1) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${seeded.projectId}/pre-review/sessions/${sessionId}`,
      });
      detail = response.json();
      if (detail.status !== 'preparing') break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    controller.abort();
    await running;
    expect(detail.status).toBe('limited');
    expect(detail.episodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ episodeNumber: 2, status: 'limited', asr: null }),
    ]));
    const limitedEpisode = detail.episodes.find((episode: any) => episode.episodeNumber === 2)!;
    const beforeSession = await pool.query<{
      status: string; revision: number;
    }>('SELECT status, revision FROM pre_edit_sessions WHERE id = $1', [sessionId]);
    const beforeEpisode = await pool.query<{
      status: string; revision: number; completion_signature: string | null; limited_reason: string | null;
    }>(
      `SELECT status, revision, completion_signature, limited_reason
         FROM pre_edit_episodes WHERE id = $1`,
      [limitedEpisode.id],
    );
    const commandCountBefore = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pre_edit_commands
        WHERE project_id = $1 AND command_kind = 'complete_episode'`,
      [seeded.projectId],
    );
    const blockedKey = randomUUID();
    const blocked = await app.inject({
      method: 'POST',
      url: `/api/projects/${seeded.projectId}/pre-review/sessions/${sessionId}/episodes/2/complete`,
      headers: { 'idempotency-key': blockedKey },
      payload: { expectedEpisodeRevision: limitedEpisode.revision },
    });
    expect(blocked.statusCode, blocked.body).toBe(409);
    expect(blocked.json().error).toMatchObject({
      code: 'PRE_EDIT_COMPLETION_BLOCKED',
      retryable: false,
      action: 'run_asr',
    });
    const afterSession = await pool.query<{
      status: string; revision: number;
    }>('SELECT status, revision FROM pre_edit_sessions WHERE id = $1', [sessionId]);
    const afterEpisode = await pool.query<{
      status: string; revision: number; completion_signature: string | null; limited_reason: string | null;
    }>(
      `SELECT status, revision, completion_signature, limited_reason
         FROM pre_edit_episodes WHERE id = $1`,
      [limitedEpisode.id],
    );
    const commandCountAfter = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pre_edit_commands
        WHERE project_id = $1 AND command_kind = 'complete_episode'`,
      [seeded.projectId],
    );
    expect(afterEpisode.rows[0]).toEqual(beforeEpisode.rows[0]);
    expect(afterSession.rows[0]).toEqual(beforeSession.rows[0]);
    expect(commandCountAfter.rows[0]!.count).toBe(commandCountBefore.rows[0]!.count);
    expect(await pool.query(
      'SELECT 1 FROM pre_edit_commands WHERE project_id = $1 AND idempotency_key = $2',
      [seeded.projectId, blockedKey],
    )).toMatchObject({ rowCount: 0 });
  });

  it('旧 Worker 失败回写不能覆盖新租约，并发同键稳定单次创建或冲突', async () => {
    const seeded = await seedProject();
    const key = randomUUID();
    const request = (expectedProjectVersion: number) => app.inject({
      method: 'POST',
      url: `/api/projects/${seeded.projectId}/pre-review/sessions`,
      headers: { 'idempotency-key': key },
      payload: { termVersionId: seeded.termVersionId, expectedProjectVersion },
    });
    const concurrent = await Promise.all([request(1), request(1)]);
    expect(concurrent.map((response) => response.statusCode).sort()).toEqual([200, 201]);
    expect(new Set(concurrent.map((response) => response.json().session.id)).size).toBe(1);
    const counts = await pool.query<{ sessions: string; commands: string }>(
      `SELECT
         (SELECT count(*) FROM pre_edit_sessions WHERE project_id = $1)::text AS sessions,
         (SELECT count(*) FROM pre_edit_commands WHERE project_id = $1)::text AS commands`,
      [seeded.projectId],
    );
    expect(counts.rows[0]).toEqual({ sessions: '1', commands: '1' });
    const conflicting = await request(2);
    expect(conflicting.statusCode).toBe(409);
    expect(conflicting.json().error.code).toBe('PRE_EDIT_IDEMPOTENCY_KEY_REUSED');

    const repository = new PreReviewWorkerRepository(pool);
    const claimed = await repository.claim('old-owner', 30_000);
    expect(claimed).not.toBeNull();
    await pool.query(
      `UPDATE pre_edit_prepare_jobs
          SET lease_owner = 'new-owner', lease_expires_at = CURRENT_TIMESTAMP + interval '30 seconds'
        WHERE id = $1`,
      [claimed!.id],
    );
    expect(await repository.failOwnedLease(claimed!.id, 'old-owner', '迟到失败')).toBe(false);
    const job = await pool.query<{ status: string; lease_owner: string; error_code: string | null }>(
      'SELECT status, lease_owner, error_code FROM pre_edit_prepare_jobs WHERE id = $1',
      [claimed!.id],
    );
    expect(job.rows[0]).toEqual({ status: 'leased', lease_owner: 'new-owner', error_code: null });
  });

  it('权威视频时长触发 after_video_end，零时长明确投影为 unknown', async () => {
    const known = await createPreparedSession({ videoDurationMs: 10_000 });
    const knownItems = await listItems(known.projectId, known.sessionId);
    expect(known.detail.episodes[0]).toMatchObject({ videoDurationMs: 10_000, videoDurationStatus: 'known' });
    expect(knownItems.some((item) => item.formatIssues.some((issue: any) => issue.code === 'after_video_end')))
      .toBe(true);

    const unknown = await createPreparedSession({ videoDurationMs: 0 });
    expect(unknown.detail.episodes[0]).toMatchObject({ videoDurationMs: null, videoDurationStatus: 'unknown' });
  });

  it('策略覆盖不覆盖人工决定，决定与撤销追加事件且条件版本和幂等冲突稳定', async () => {
    const prepared = await createPreparedSession();
    let items = await listItems(prepared.projectId, prepared.sessionId);
    const exact = items.find((item) => item.groupKind === 'one_to_one' && item.currentText === '你好')!;
    const decisionKey = randomUUID();
    const decisionRequest = () => decide(prepared.projectId, prepared.sessionId, exact, 'custom_text', {
      text: '人工你好', key: decisionKey,
    });
    const concurrentDecisions = await Promise.all([decisionRequest(), decisionRequest()]);
    expect(concurrentDecisions.map((response) => response.statusCode).sort()).toEqual([200, 201]);
    const changed = concurrentDecisions.find((response) => response.statusCode === 201)!;
    expect(changed.statusCode, changed.body).toBe(201);
    const replay = concurrentDecisions.find((response) => response.statusCode === 200)!;
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json().item.currentDecisionEventId).toBe(changed.json().item.currentDecisionEventId);
    const conflict = await app.inject({
      method: 'POST',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}/items/${exact.id}/decisions`,
      headers: { 'idempotency-key': decisionKey },
      payload: { expectedVersion: exact.version, action: 'custom_text', text: '另一文本' },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('PRE_EDIT_IDEMPOTENCY_KEY_REUSED');

    const afterDecision = await app.inject({
      method: 'GET',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}`,
    });
    const preview = await app.inject({
      method: 'POST',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}/policy/preview`,
      payload: {
        expectedSessionRevision: afterDecision.json().revision,
        scope: 'series',
        policy: 'asr_text_primary',
      },
    });
    expect(preview.statusCode, preview.body).toBe(200);
    expect(preview.json()).toMatchObject({
      protectedHumanDecisionCount: 1,
      affectedItemCount: items.length,
    });
    const eventCountBeforeApply = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM pre_edit_decision_events WHERE session_id = $1',
      [prepared.sessionId],
    );
    const policy = await app.inject({
      method: 'POST',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}/policy`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        expectedSessionRevision: afterDecision.json().revision,
        scope: 'series',
        policy: 'asr_text_primary',
      },
    });
    expect(policy.statusCode, policy.body).toBe(200);
    expect(policy.json().protectedHumanDecisionCount).toBeGreaterThanOrEqual(1);
    expect(policy.json().safeUpdateCount).toBe(preview.json().safeUpdateCount);
    expect(policy.json().requiresHumanDecisionCount).toBe(preview.json().requiresHumanDecisionCount);
    expect(Number(eventCountBeforeApply.rows[0]!.count)).toBe(items.length + 1);
    items = await listItems(prepared.projectId, prepared.sessionId);
    expect(items.find((item) => item.id === exact.id)).toMatchObject({
      currentText: '人工你好',
      decisionOrigin: 'human',
    });
    expect(items.find((item) => item.groupKind === 'one_company_many_asr')).toMatchObject({
      systemAction: 'keep_company',
      requiresReview: true,
    });
    const current = items.find((item) => item.id === exact.id)!;
    const undoKey = randomUUID();
    const undone = await app.inject({
      method: 'POST',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}/items/${exact.id}/undo`,
      headers: { 'idempotency-key': undoKey },
      payload: {
        expectedVersion: current.version,
        decisionEventId: current.currentDecisionEventId,
      },
    });
    expect(undone.statusCode, undone.body).toBe(201);
    expect(undone.json().item).toMatchObject({ decisionOrigin: 'system', currentText: '你好' });
    const staleVersion = await decide(prepared.projectId, prepared.sessionId, exact, 'keep_company');
    expect(staleVersion.statusCode).toBe(409);
    expect(staleVersion.json().error.code).toBe('PRE_EDIT_ITEM_VERSION_CONFLICT');
    const events = await app.inject({
      method: 'GET',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}/items/${exact.id}/events`,
    });
    expect(events.statusCode, events.body).toBe(200);
    expect(events.json().items.map((event: any) => event.eventKind)).toEqual([
      'baseline', 'decision', 'undo',
    ]);
  });

  it('六类人工动作、格式门禁、本集签名和单事务不可变 release 生成确定性 BOM SRT', async () => {
    const prepared = await createPreparedSession();
    let items = await listItems(prepared.projectId, prepared.sessionId);
    const longItem = items.find((item) => item.formatIssues.some((issue: any) => issue.code === 'long_line'))!;
    const eventCountBeforeShortReason = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM pre_edit_decision_events WHERE item_id = $1',
      [longItem.id],
    );
    const shortReason = await decide(prepared.projectId, prepared.sessionId, longItem, 'keep_company', {
      formatOverrideReason: '一二三四五六七 ',
    });
    expect(shortReason.statusCode).toBe(422);
    expect(shortReason.json().error.code).toBe('PRE_EDIT_ACTION_INVALID');
    const unchangedLong = (await listItems(prepared.projectId, prepared.sessionId))
      .find((item) => item.id === longItem.id)!;
    expect(unchangedLong.version).toBe(longItem.version);
    expect(unchangedLong.formatOverrideReason).toBeNull();
    const eventCountAfterShortReason = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM pre_edit_decision_events WHERE item_id = $1',
      [longItem.id],
    );
    expect(eventCountAfterShortReason.rows[0]!.count).toBe(eventCountBeforeShortReason.rows[0]!.count);
    const manyToOne = items.find((item) => item.groupKind === 'many_company_one_asr')!;
    const invalid = await decide(prepared.projectId, prepared.sessionId, manyToOne, 'use_asr_text');
    expect(invalid.statusCode).toBe(422);
    expect(invalid.json().error.code).toBe('PRE_EDIT_ACTION_INVALID');

    let companyOnlyCount = 0;
    let asrOnlyCount = 0;
    for (const snapshot of items) {
      const isLong = snapshot.formatIssues.some((issue: any) => issue.code === 'long_line');
      const hasPunctuation = snapshot.formatIssues.some((issue: any) => issue.code === 'hard_punctuation');
      let action: string | null = null;
      let text: string | undefined;
      let formatOverrideReason: string | undefined;
      if (snapshot.groupKind === 'one_company_many_asr') action = 'use_asr_text';
      else if (snapshot.groupKind === 'many_company_one_asr' || snapshot.groupKind === 'uncertain') {
        action = 'custom_text';
        text = snapshot.companyCues.find((cue: any) => cue.cueId === snapshot.targetCompanyCueId)?.text ?? '人工组合';
      } else if (snapshot.groupKind === 'company_only') {
        companyOnlyCount += 1;
        action = companyOnlyCount === 1 ? 'remove_company' : 'keep_company';
      } else if (snapshot.groupKind === 'asr_only') {
        asrOnlyCount += 1;
        action = asrOnlyCount === 1 ? 'add_asr' : 'ignore_asr';
      } else if (hasPunctuation) {
        action = 'custom_text';
        text = '你好 世界';
      } else if (isLong) {
        action = 'keep_company';
        formatOverrideReason = '已人工核听，本轴时间证据完整，首版明确保留。';
      } else if (snapshot.requiresReview) action = 'keep_company';
      if (!action) continue;
      const response = await decide(prepared.projectId, prepared.sessionId, snapshot, action, {
        ...(text !== undefined ? { text } : {}),
        ...(formatOverrideReason ? { formatOverrideReason } : {}),
      });
      expect(response.statusCode, response.body).toBe(201);
    }
    const savedLong = (await listItems(prepared.projectId, prepared.sessionId))
      .find((item) => item.id === longItem.id)!;
    expect(savedLong.formatOverrideReason).toBe('已人工核听，本轴时间证据完整，首版明确保留。');
    expect(savedLong.formatIssues.map((issue: any) => issue.code)).toEqual(['long_line']);
    const beforeComplete = await app.inject({
      method: 'GET',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}`,
    });
    expect(beforeComplete.json().episodes[0].counts).toMatchObject({ pending: 0, blocking: 0 });
    const completed = await app.inject({
      method: 'POST',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}/episodes/1/complete`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { expectedEpisodeRevision: beforeComplete.json().episodes[0].revision },
    });
    expect(completed.statusCode, completed.body).toBe(201);
    expect(completed.json().episode.completionSignature).toMatch(/^[0-9a-f]{64}$/);
    const afterComplete = await app.inject({
      method: 'GET',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}`,
    });
    expect(afterComplete.json().status).toBe('completed');
    const releaseKey = randomUUID();
    const published = await app.inject({
      method: 'POST',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}/releases`,
      headers: { 'idempotency-key': releaseKey },
      payload: { expectedSessionRevision: afterComplete.json().revision },
    });
    expect(published.statusCode, published.body).toBe(201);
    const replay = await app.inject({
      method: 'POST',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}/releases`,
      headers: { 'idempotency-key': releaseKey },
      payload: { expectedSessionRevision: afterComplete.json().revision },
    });
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.json().release.id).toBe(published.json().release.id);
    expect(replay.json().release.releaseDigest).toBe(published.json().release.releaseDigest);
    const fileUrl = published.json().release.files[0].downloadUrl;
    const first = await app.inject({ method: 'GET', url: fileUrl });
    const second = await app.inject({ method: 'GET', url: fileUrl });
    expect(first.statusCode, first.body).toBe(200);
    expect(second.rawPayload).toEqual(first.rawPayload);
    expect([...first.rawPayload.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(first.body).toContain('你好 世界');
    expect(first.body).not.toContain('你好，世界。');
    const immutableEvent = await pool.query<{ id: string }>(
      `SELECT id FROM pre_edit_decision_events WHERE origin = 'human' LIMIT 1`,
    );
    await expect(pool.query(
      `UPDATE pre_edit_decision_events SET action = 'keep_company' WHERE id = $1`,
      [immutableEvent.rows[0]!.id],
    )).rejects.toThrow(/immutable/);
  });

  it('素材或视频身份变化后旧会话转只读 stale，历史对齐仍可读但新决定被后端阻断', async () => {
    const prepared = await createPreparedSession();
    const newManifestId = randomUUID();
    const newVideoAssetId = randomUUID();
    const newVideoBytes = encode('anonymous-new-video');
    const newObjectKey = `anonymous/${prepared.projectId}/episode-v2.mp4`;
    await putObject(newObjectKey, newVideoBytes);
    await pool.query(
      `INSERT INTO assets (
         id, project_id, object_key, original_filename, media_kind, size_bytes,
         checksum_algorithm, checksum_value, verified_at
       ) VALUES ($1, $2, $3, 'EP01-v2.mp4', 'video', $4, 'sha256', $5, CURRENT_TIMESTAMP)`,
      [newVideoAssetId, prepared.projectId, newObjectKey, newVideoBytes.byteLength, sha256(newVideoBytes)],
    );
    await pool.query(
      `INSERT INTO material_manifests (id, project_id, version, root_name, created_by)
       VALUES ($1, $2, 2, 'anonymous-v2', 'test')`,
      [newManifestId, prepared.projectId],
    );
    for (const binding of [
      { role: 'company_srt', fileName: 'EP01.srt', mediaType: 'srt', assetId: prepared.companyAssetId, size: companySrt.byteLength },
      { role: 'asr_video', fileName: 'EP01-v2.mp4', mediaType: 'video', assetId: newVideoAssetId, size: newVideoBytes.byteLength },
    ]) {
      await pool.query(
        `INSERT INTO material_manifest_bindings (
           manifest_id, episode_number, role, relative_path, file_name,
           size_bytes, last_modified_ms, fingerprint, media_type
         ) VALUES ($1, 1, $2, $3, $4, $5, 2, $6, $7)`,
        [newManifestId, binding.role, `anonymous/${binding.fileName}`, binding.fileName,
          binding.size, `anonymous-v2-${binding.role}`, binding.mediaType],
      );
      await pool.query(
        `INSERT INTO material_asset_bindings (
           manifest_id, episode_number, role, asset_id, source_fingerprint
         ) VALUES ($1, 1, $2, $3, $4)`,
        [newManifestId, binding.role, binding.assetId, `anonymous-v2-${binding.role}`],
      );
    }
    const refreshed = await app.inject({
      method: 'GET',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions/${prepared.sessionId}`,
    });
    expect(refreshed.statusCode, refreshed.body).toBe(200);
    expect(refreshed.json().status).toBe('stale');
    const items = await listItems(prepared.projectId, prepared.sessionId);
    expect(items.length).toBeGreaterThan(0);
    const blocked = await decide(prepared.projectId, prepared.sessionId, items[0], 'keep_company');
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error.code).toBe('PRE_EDIT_SOURCE_CHANGED');
    const cannotBindOldAsr = await app.inject({
      method: 'POST',
      url: `/api/projects/${prepared.projectId}/pre-review/sessions`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { termVersionId: prepared.termVersionId, expectedProjectVersion: 1 },
    });
    expect(cannotBindOldAsr.statusCode).toBe(422);
    expect(cannotBindOldAsr.json().error.code).toBe('PRE_EDIT_SOURCE_NOT_READY');
  });
});
