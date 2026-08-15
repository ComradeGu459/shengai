import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  ConfirmEmptyScreenTextEpisodeBody,
  CreateManualScreenTextCandidateBody,
  CreateScreenTextBatchBody,
  CreateScreenTextDecisionBody,
  CreateScreenTextReleaseBody,
  RetryScreenTextBatchBody,
  ScreenTextDecisionResult,
} from '@qimao-terms-cloud/contracts';

import type { DatabasePool } from '../../database/pool.js';
import type { ScreenTextAdapterDescriptor } from './screen-text.adapter.js';
import { buildTermProjection, descriptorSnapshot, normalizeEpisodeNumbers, renderScreenTextSrt, stableHash } from './screen-text.domain.js';
import { screenTextConflict, screenTextInvalid, screenTextNotFound } from './screen-text.errors.js';
import { ScreenTextReadRepository } from './screen-text.read.repository.js';

const activeBatchStatuses = [
  'queued', 'running', 'review_pending', 'partial', 'cancel_requested', 'reconciliation_required',
];

export class ScreenTextWriteRepository {
  private readonly reads: ScreenTextReadRepository;

  constructor(
    private readonly database: DatabasePool,
    private readonly descriptor: Readonly<ScreenTextAdapterDescriptor>,
  ) {
    this.reads = new ScreenTextReadRepository(database);
  }

  async create(input: {
    projectId: string;
    body: CreateScreenTextBatchBody;
    idempotencyKey: string;
    requestId: string;
  }) {
    const requestHash = stableHash({
      termVersionId: input.body.termVersionId,
      scope: input.body.scope.kind === 'selected'
        ? { kind: 'selected', episodeNumbers: normalizeEpisodeNumbers(input.body.scope.episodeNumbers) }
        : input.body.scope,
    });
    const result = await this.transaction(async (client) => {
      await this.lockCommand(client, input.projectId, 'create_batch', input.idempotencyKey);
      const replay = await this.command(client, input.projectId, 'create_batch', input.idempotencyKey);
      if (replay) {
        this.assertSameHash(replay.request_hash, requestHash);
        return { batchId: replay.resource_id, replay: true };
      }
      await this.assertProjectActive(client, input.projectId);
      const manifest = await client.query<any>(`
        SELECT id, version FROM material_manifests WHERE project_id = $1 ORDER BY version DESC LIMIT 1
      `, [input.projectId]);
      if (!manifest.rowCount) throw screenTextInvalid('SCREEN_TEXT_MANIFEST_NOT_FOUND', '项目尚未确认素材清单。', 'confirm_materials');
      const suppliedTermVersion = await client.query<any>(`
        SELECT id, version FROM term_versions WHERE id = $1 AND project_id = $2
      `, [input.body.termVersionId, input.projectId]);
      if (!suppliedTermVersion.rowCount) {
        throw screenTextInvalid('SCREEN_TEXT_TERM_VERSION_NOT_FOUND', '术语版本不存在或不属于当前项目。', 'confirm_terms');
      }
      const termVersion = await client.query<any>(`
        SELECT id, version FROM term_versions WHERE project_id = $1 ORDER BY version DESC LIMIT 1
      `, [input.projectId]);
      if (termVersion.rows[0].id !== input.body.termVersionId) {
        throw screenTextInvalid('SCREEN_TEXT_TERM_VERSION_NOT_LATEST', '必须使用项目最新已确认术语版本。', 'confirm_terms');
      }
      const manifestEpisodes = await client.query<{ episode_number: number }>(`
        SELECT DISTINCT episode_number FROM material_manifest_bindings
        WHERE manifest_id = $1 ORDER BY episode_number
      `, [manifest.rows[0].id]);
      const assets = await client.query<any>(`
        SELECT mb.episode_number, a.id AS asset_id, a.object_key, a.original_filename,
          a.size_bytes, a.checksum_algorithm, a.checksum_value
        FROM material_manifest_bindings mb
        JOIN material_asset_bindings mab ON mab.manifest_id = mb.manifest_id
          AND mab.episode_number = mb.episode_number AND mab.role = mb.role
        JOIN assets a ON a.id = mab.asset_id
        WHERE mb.manifest_id = $1 AND mb.role = 'screen_video' AND a.verified_at IS NOT NULL
        ORDER BY mb.episode_number
      `, [manifest.rows[0].id]);
      const available = assets.rows.map((row) => row.episode_number);
      const requested = input.body.scope.kind === 'all'
        ? manifestEpisodes.rows.map((row) => row.episode_number)
        : input.body.scope.kind === 'single' ? [input.body.scope.episodeNumber]
          : normalizeEpisodeNumbers(input.body.scope.episodeNumbers);
      const episodeNumbers = normalizeEpisodeNumbers(requested);
      if (!episodeNumbers.length || episodeNumbers.some((episode) => !available.includes(episode))) {
        throw screenTextInvalid('SCREEN_TEXT_VIDEO_NOT_READY', '所选集数没有已校验的画面字视频。', 'prepare_screen_videos');
      }
      const active = await client.query(`
        SELECT id FROM screen_text_batches
        WHERE project_id = $1 AND manifest_id = $2 AND status = ANY($3::screen_text_batch_status[])
          AND episode_numbers && $4::integer[] LIMIT 1
      `, [input.projectId, manifest.rows[0].id, activeBatchStatuses, episodeNumbers]);
      if (active.rowCount) throw screenTextConflict('SCREEN_TEXT_BATCH_ACTIVE', '同一来源和范围已有活动画面字批次。');
      const termRows = await client.query<any>(`
        SELECT id, type::text, name, aliases, note FROM term_version_items
        WHERE term_version_id = $1 ORDER BY sort_order, id
      `, [input.body.termVersionId]);
      const projection = buildTermProjection(termRows.rows);
      const descriptor = descriptorSnapshot(this.descriptor);
      const batch = await client.query<{ id: string }>(`
        INSERT INTO screen_text_batches (
          project_id, scope_kind, episode_numbers, term_version_id, manifest_id, manifest_version,
          execution_kind, provider, adapter, model, language, deployment, input_version, output_version,
          capabilities, config_digest, frame_strategy_version, dedupe_strategy_version,
          term_projection, term_projection_entries, request_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        RETURNING id
      `, [
        input.projectId, input.body.scope.kind, episodeNumbers, input.body.termVersionId,
        manifest.rows[0].id, manifest.rows[0].version,
        descriptor.kind, descriptor.provider, descriptor.adapter, descriptor.model, descriptor.language,
        descriptor.deployment, descriptor.inputVersion, descriptor.outputVersion, descriptor.capabilities,
        descriptor.configDigest, 'adaptive-frame-v1', 'perceptual-dedupe-v1',
        projection.summary, JSON.stringify(projection.entries), input.requestId,
      ]);
      const batchId = batch.rows[0]?.id;
      if (!batchId) throw new Error('SCREEN_TEXT_BATCH_CREATE_FAILED');
      for (const episodeNumber of episodeNumbers) {
        const asset = assets.rows.find((row) => row.episode_number === episodeNumber);
        await client.query(`
          INSERT INTO screen_text_batch_assets (
            batch_id, episode_number, asset_id, object_key, original_filename, size_bytes,
            checksum_algorithm, checksum_value
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [batchId, episodeNumber, asset.asset_id, asset.object_key, asset.original_filename,
          asset.size_bytes, asset.checksum_algorithm, asset.checksum_value]);
        await client.query(`
          INSERT INTO screen_text_jobs (batch_id, project_id, episode_number, asset_id, status)
          VALUES ($1,$2,$3,$4,'queued')
        `, [batchId, input.projectId, episodeNumber, asset.asset_id]);
      }
      await this.saveCommand(client, input.projectId, 'create_batch', input.idempotencyKey, requestHash, batchId);
      return { batchId, replay: false };
    });
    return { replay: result.replay, batch: (await this.reads.getBatch(input.projectId, result.batchId))! };
  }

  async cancel(projectId: string, batchId: string, idempotencyKey: string) {
    const requestHash = stableHash({ batchId });
    const replay = await this.transaction(async (client) => {
      await this.lockCommand(client, projectId, 'cancel_batch', idempotencyKey);
      const existing = await this.command(client, projectId, 'cancel_batch', idempotencyKey);
      if (existing) {
        this.assertSameHash(existing.request_hash, requestHash);
        return true;
      }
      await this.requireBatch(client, projectId, batchId, true);
      await client.query(`
        UPDATE screen_text_jobs SET
          status = CASE WHEN status IN ('not_started','queued') THEN 'cancelled'::screen_text_job_status
            WHEN status = 'running' THEN 'cancel_requested'::screen_text_job_status ELSE status END,
          cancel_requested = CASE WHEN status = 'running' THEN true ELSE cancel_requested END,
          updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = $1 AND status IN ('not_started','queued','running')
      `, [batchId]);
      await this.recomputeBatch(client, batchId);
      await this.saveCommand(client, projectId, 'cancel_batch', idempotencyKey, requestHash, batchId);
      return false;
    });
    return { replay, batch: (await this.reads.getBatch(projectId, batchId))! };
  }

  async retry(projectId: string, batchId: string, body: RetryScreenTextBatchBody, idempotencyKey: string) {
    const episodes = body.episodeNumbers ? normalizeEpisodeNumbers(body.episodeNumbers) : null;
    const requestHash = stableHash({ batchId, episodeNumbers: episodes });
    const replay = await this.transaction(async (client) => {
      await this.lockCommand(client, projectId, 'retry_batch', idempotencyKey);
      const existing = await this.command(client, projectId, 'retry_batch', idempotencyKey);
      if (existing) {
        this.assertSameHash(existing.request_hash, requestHash);
        return true;
      }
      await this.requireBatch(client, projectId, batchId, true);
      const updated = await client.query(`
        UPDATE screen_text_jobs SET status = 'queued', cancel_requested = false, updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = $1
          AND ((status='failed' AND EXISTS (
              SELECT 1 FROM screen_text_attempts attempt
              WHERE attempt.id=screen_text_jobs.current_attempt_id
                AND attempt.status='failed' AND attempt.retryable=true
                AND attempt.external_side_effect_possible=false
            ))
            OR (status='cancelled' AND (
              current_attempt_id IS NULL OR EXISTS (
                SELECT 1 FROM screen_text_attempts attempt
                WHERE attempt.id=screen_text_jobs.current_attempt_id
                  AND attempt.status='cancelled'
                  AND attempt.external_side_effect_possible=false
              )
            ))
            OR (status='review_pending' AND NOT EXISTS (
              SELECT 1 FROM screen_text_candidates candidate WHERE candidate.job_id=screen_text_jobs.id
            )))
          AND ($2::integer[] IS NULL OR episode_number = ANY($2))
        RETURNING id
      `, [batchId, episodes]);
      if (!updated.rowCount) throw screenTextInvalid('SCREEN_TEXT_RETRY_INVALID', '没有可安全重试的失败、取消或明确零候选集数。');
      await client.query(`UPDATE screen_text_batches SET revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [batchId]);
      await this.recomputeBatch(client, batchId);
      await this.saveCommand(client, projectId, 'retry_batch', idempotencyKey, requestHash, batchId);
      return false;
    });
    return { replay, batch: (await this.reads.getBatch(projectId, batchId))! };
  }

  async decide(projectId: string, candidateId: string, body: CreateScreenTextDecisionBody, idempotencyKey: string): Promise<{ replay: boolean; result: ScreenTextDecisionResult }> {
    const requestHash = stableHash({ candidateId, ...body });
    const transactionResult = await this.transaction(async (client) => {
      await this.lockCommand(client, projectId, 'candidate_decision', idempotencyKey);
      const existing = await this.command(client, projectId, 'candidate_decision', idempotencyKey);
      if (existing) {
        this.assertSameHash(existing.request_hash, requestHash);
        const createdIds = Array.isArray(existing.response_snapshot?.createdIds)
          ? existing.response_snapshot.createdIds.filter((id: unknown): id is string => typeof id === 'string')
          : [];
        return { candidateId: existing.resource_id, createdIds, replay: true };
      }
      const candidate = await client.query<any>(`
        SELECT c.*, b.project_id, b.status AS batch_status, j.video_duration_ms
        FROM screen_text_candidates c
        JOIN screen_text_batches b ON b.id = c.batch_id
        JOIN screen_text_jobs j ON j.id = c.job_id
        WHERE b.project_id = $1 AND c.id = $2 FOR UPDATE OF c, b, j
      `, [projectId, candidateId]);
      if (!candidate.rowCount) throw screenTextNotFound('SCREEN_TEXT_CANDIDATE_NOT_FOUND', '画面字候选不存在。');
      const row = candidate.rows[0];
      await this.assertBatchWritable(client, row);
      if (row.revision !== body.expectedRevision) throw screenTextConflict('SCREEN_TEXT_CANDIDATE_VERSION_CONFLICT', '候选已被其他操作更新。');
      const unsplitDualParent = this.isUnsplitDualParent(row);
      if (unsplitDualParent && (body.action === 'approve' || body.action === 'edit')) {
        throw screenTextInvalid(
          'SCREEN_TEXT_DECISION_INVALID', '未拆分的左右同屏候选只能忽略或先拆分。',
        );
      }
      const before = this.candidateState(row);
      const createdIds: string[] = [];
      if (body.action === 'approve') {
        if (row.status !== 'pending') throw screenTextInvalid('SCREEN_TEXT_DECISION_INVALID', '只有待确认候选可以保留。');
        await client.query(`UPDATE screen_text_candidates SET status='approved', revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [candidateId]);
      } else if (body.action === 'reject') {
        if (row.status !== 'pending') throw screenTextInvalid('SCREEN_TEXT_DECISION_INVALID', '只有待确认候选可以忽略。');
        await client.query(`UPDATE screen_text_candidates SET status='rejected', revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [candidateId]);
      } else if (body.action === 'restore') {
        if (row.status !== 'rejected') throw screenTextInvalid('SCREEN_TEXT_DECISION_INVALID', '只有已忽略候选可以恢复为待确认。');
        await client.query(`UPDATE screen_text_candidates SET status='pending', revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [candidateId]);
      } else if (body.action === 'edit') {
        const text = body.text?.trim() ?? row.text;
        const startMs = body.startMs ?? row.start_ms;
        const endMs = body.endMs ?? row.end_ms;
        const category = body.category ?? row.category;
        this.validateEditable({ ...row, text, start_ms: startMs, end_ms: endMs, category });
        await client.query(`
          UPDATE screen_text_candidates SET text=$2, start_ms=$3, end_ms=$4, category=$5, position=$6,
            status='edited', revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1
        `, [candidateId, text, startMs, endMs, category, body.position ?? row.position]);
      } else {
        if (row.status !== 'pending' || !unsplitDualParent
          || !body.leftText?.trim() || !body.rightText?.trim()) {
          throw screenTextInvalid('SCREEN_TEXT_DECISION_INVALID', '左右拆分必须提供同一证据中的左右两段文字。');
        }
        const pairGroupId = randomUUID();
        await client.query(`UPDATE screen_text_candidates SET status='rejected', revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [candidateId]);
        for (const [text, position] of [[body.leftText.trim(), 'left'], [body.rightText.trim(), 'right']] as const) {
          const created = await client.query<{ id: string }>(`
            INSERT INTO screen_text_candidates (
              batch_id, job_id, episode_number, source, raw_text, text, start_ms, end_ms,
              category, position, confidence, status, pair_group_id, evidence, term_hits
            ) VALUES ($1,$2,$3,'split',$4,$5,$6,$7,$8,$9,$10,'edited',$11,$12,$13) RETURNING id
          `, [row.batch_id, row.job_id, row.episode_number, row.raw_text, text, row.start_ms, row.end_ms,
            row.category, position, row.confidence, pairGroupId, row.evidence, JSON.stringify(row.term_hits)]);
          const createdId = created.rows[0]?.id;
          if (!createdId) throw new Error('SCREEN_TEXT_SPLIT_CREATE_FAILED');
          createdIds.push(createdId);
        }
      }
      const after = await client.query<any>(`SELECT * FROM screen_text_candidates WHERE id=$1`, [candidateId]);
      await client.query(`
        INSERT INTO screen_text_decision_events (
          batch_id, job_id, candidate_id, episode_number, action, before_state, after_state,
          idempotency_key, request_hash
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [row.batch_id, row.job_id, candidateId, row.episode_number, body.action, before,
        { candidate: this.candidateState(after.rows[0]), createdIds }, idempotencyKey, requestHash]);
      await this.recomputeJobAndBatch(client, row.job_id, row.batch_id);
      await this.saveCommand(client, projectId, 'candidate_decision', idempotencyKey, requestHash, candidateId, { createdIds });
      return { candidateId, createdIds, replay: false };
    });
    const candidate = await this.reads.getCandidate(projectId, transactionResult.candidateId);
    if (!candidate) throw screenTextNotFound('SCREEN_TEXT_CANDIDATE_NOT_FOUND', '画面字候选不存在。');
    const createdCandidates = (await Promise.all(transactionResult.createdIds.map((id: string) => this.reads.getCandidate(projectId, id))))
      .filter((item): item is NonNullable<typeof item> => item !== null);
    return { replay: transactionResult.replay, result: { candidate, createdCandidates } };
  }

  async createManual(projectId: string, batchId: string, episodeNumber: number, body: CreateManualScreenTextCandidateBody, idempotencyKey: string) {
    const requestHash = stableHash({ batchId, episodeNumber, ...body });
    const result = await this.transaction(async (client) => {
      await this.lockCommand(client, projectId, 'manual_candidate', idempotencyKey);
      const existing = await this.command(client, projectId, 'manual_candidate', idempotencyKey);
      if (existing) {
        this.assertSameHash(existing.request_hash, requestHash);
        return { candidateId: existing.resource_id, replay: true };
      }
      const job = await client.query<any>(`
        SELECT j.*, b.project_id, b.status AS batch_status FROM screen_text_jobs j
        JOIN screen_text_batches b ON b.id=j.batch_id
        WHERE b.project_id=$1 AND b.id=$2 AND j.episode_number=$3 FOR UPDATE OF j,b
      `, [projectId, batchId, episodeNumber]);
      if (!job.rowCount) throw screenTextNotFound('SCREEN_TEXT_JOB_NOT_FOUND', '画面字集数任务不存在。');
      await this.assertBatchWritable(client, job.rows[0]);
      const row = job.rows[0];
      this.validateEditable({ ...row, ...body, start_ms: body.startMs, end_ms: body.endMs, term_hits: [] });
      const evidenceObjectKey = `derived/screen-text/${batchId}/${episodeNumber}/manual-${stableHash(body).slice(0, 16)}.png`;
      const candidate = await client.query<{ id: string }>(`
        INSERT INTO screen_text_candidates (
          batch_id, job_id, episode_number, source, raw_text, text, start_ms, end_ms,
          category, position, confidence, status, evidence, term_hits
        ) VALUES ($1,$2,$3,'manual',$4,$4,$5,$6,$7,$8,NULL,'edited',$9,'[]') RETURNING id
      `, [batchId, row.id, episodeNumber, body.text.trim(), body.startMs, body.endMs,
        body.category, body.position, {
          objectKey: evidenceObjectKey,
          checksum: stableHash(evidenceObjectKey), width: 640, height: 360,
          capturedAtMs: body.evidenceCapturedAtMs,
        }]);
      const candidateId = candidate.rows[0]?.id;
      if (!candidateId) throw new Error('SCREEN_TEXT_MANUAL_CREATE_FAILED');
      await client.query(`
        INSERT INTO screen_text_decision_events (
          batch_id,job_id,candidate_id,episode_number,action,after_state,idempotency_key,request_hash
        ) VALUES ($1,$2,$3,$4,'manual_add',$5,$6,$7)
      `, [batchId, row.id, candidateId, episodeNumber, body, idempotencyKey, requestHash]);
      await this.recomputeJobAndBatch(client, row.id, batchId);
      await this.saveCommand(client, projectId, 'manual_candidate', idempotencyKey, requestHash, candidateId);
      return { candidateId, replay: false };
    });
    return { replay: result.replay, candidate: (await this.reads.getCandidate(projectId, result.candidateId))! };
  }

  async confirmEmpty(projectId: string, batchId: string, episodeNumber: number, body: ConfirmEmptyScreenTextEpisodeBody, idempotencyKey: string) {
    const requestHash = stableHash({ batchId, episodeNumber, ...body });
    const replay = await this.transaction(async (client) => {
      await this.lockCommand(client, projectId, 'confirm_empty', idempotencyKey);
      const existing = await this.command(client, projectId, 'confirm_empty', idempotencyKey);
      if (existing) {
        this.assertSameHash(existing.request_hash, requestHash);
        return true;
      }
      const batch = await this.requireBatch(client, projectId, batchId, true);
      if (batch.revision !== body.expectedBatchRevision) throw screenTextConflict('SCREEN_TEXT_CANDIDATE_VERSION_CONFLICT', '画面字批次修订已变化。');
      const job = await client.query<any>(`
        SELECT j.*, (SELECT count(*) FROM screen_text_candidates WHERE job_id=j.id) AS candidate_count
        FROM screen_text_jobs j WHERE j.batch_id=$1 AND j.episode_number=$2 FOR UPDATE
      `, [batchId, episodeNumber]);
      if (!job.rowCount) throw screenTextNotFound('SCREEN_TEXT_JOB_NOT_FOUND', '画面字集数任务不存在。');
      if (job.rows[0].status !== 'review_pending' || Number(job.rows[0].candidate_count) !== 0) {
        throw screenTextInvalid('SCREEN_TEXT_EPISODE_NOT_EMPTY', '只有零候选且待人工确认的集数可以确认无画面字。');
      }
      await client.query(`UPDATE screen_text_jobs SET status='confirmed_empty',updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [job.rows[0].id]);
      await client.query(`
        INSERT INTO screen_text_decision_events (
          batch_id,job_id,episode_number,action,after_state,idempotency_key,request_hash
        ) VALUES ($1,$2,$3,'confirm_empty',$4,$5,$6)
      `, [batchId, job.rows[0].id, episodeNumber, { status: 'confirmed_empty' }, idempotencyKey, requestHash]);
      await client.query(`UPDATE screen_text_batches SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [batchId]);
      await this.recomputeBatch(client, batchId);
      await this.saveCommand(client, projectId, 'confirm_empty', idempotencyKey, requestHash, job.rows[0].id);
      return false;
    });
    return { replay, batch: (await this.reads.getBatch(projectId, batchId))! };
  }

  async release(projectId: string, body: CreateScreenTextReleaseBody, idempotencyKey: string) {
    const requestHash = stableHash(body);
    const result = await this.transaction(async (client) => {
      await this.lockCommand(client, projectId, 'release', idempotencyKey);
      const existing = await this.command(client, projectId, 'release', idempotencyKey);
      if (existing) {
        this.assertSameHash(existing.request_hash, requestHash);
        return { releaseId: existing.resource_id, replay: true };
      }
      const batch = await this.requireBatch(client, projectId, body.batchId, true);
      if (batch.revision !== body.expectedBatchRevision) throw screenTextConflict('SCREEN_TEXT_CANDIDATE_VERSION_CONFLICT', '画面字批次修订已变化。');
      await this.recomputeBatch(client, body.batchId);
      const current = await client.query<any>(`SELECT * FROM screen_text_batches WHERE id=$1 FOR UPDATE`, [body.batchId]);
      if (current.rows[0].status !== 'completed') throw screenTextConflict('SCREEN_TEXT_RELEASE_BLOCKED', '仍有待确认、失败、取消或需对账集数，不能发布。', 'complete_screen_text_review');
      const candidates = await client.query<any>(`
        SELECT c.*, j.video_duration_ms FROM screen_text_candidates c
        JOIN screen_text_jobs j ON j.id=c.job_id
        WHERE c.batch_id=$1 AND c.status IN ('approved','edited')
        ORDER BY c.episode_number,c.start_ms,c.end_ms,c.id
      `, [body.batchId]);
      for (const candidate of candidates.rows) this.validateEditable(candidate);
      const pairCounts = new Map<string, { count: number; positions: Set<string> }>();
      for (const candidate of candidates.rows) if (candidate.pair_group_id) {
        const pair = pairCounts.get(candidate.pair_group_id) ?? { count: 0, positions: new Set<string>() };
        pair.count += 1;
        pair.positions.add(candidate.position);
        pairCounts.set(candidate.pair_group_id, pair);
      }
      for (const pair of pairCounts.values()) {
        if (pair.count !== 2 || pair.positions.size !== 2
          || !pair.positions.has('left') || !pair.positions.has('right')) {
          throw screenTextConflict(
            'SCREEN_TEXT_PAIR_INVALID', '左右配对必须恰好保留一条左轴和一条右轴。', 'review_screen_text_pair',
          );
        }
      }
      const releaseVersion = await client.query<{ version: number }>(`
        SELECT COALESCE(max(version),0)+1 AS version FROM screen_text_releases WHERE project_id=$1
      `, [projectId]);
      const version = releaseVersion.rows[0]?.version;
      if (version === undefined) throw new Error('SCREEN_TEXT_RELEASE_VERSION_MISSING');
      const cueSnapshot = candidates.rows.map((candidate) => ({
        candidateId: candidate.id, episodeNumber: candidate.episode_number,
        startMs: candidate.start_ms, endMs: candidate.end_ms,
        text: candidate.pair_group_id
          ? `（${candidate.position === 'left' ? '左' : '右'}）${candidate.text}` : candidate.text,
        position: candidate.position,
      }));
      const releaseDigest = stableHash({ batchId: body.batchId, revision: batch.revision, cues: cueSnapshot });
      const release = await client.query<{ id: string }>(`
        INSERT INTO screen_text_releases (
          project_id,version,batch_id,term_version_id,manifest_id,draft_revision,release_digest,cue_count
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
      `, [projectId, version, body.batchId, batch.term_version_id,
        batch.manifest_id, batch.revision, releaseDigest, cueSnapshot.length]);
      const releaseId = release.rows[0]?.id;
      if (!releaseId) throw new Error('SCREEN_TEXT_RELEASE_CREATE_FAILED');
      const grouped = new Map<number, typeof cueSnapshot>();
      for (const cue of cueSnapshot) grouped.set(cue.episodeNumber, [...(grouped.get(cue.episodeNumber) ?? []), cue]);
      for (const episodeNumber of batch.episode_numbers as number[]) {
        const cues = grouped.get(episodeNumber) ?? [];
        for (const [index, cue] of cues.entries()) await client.query(`
          INSERT INTO screen_text_release_cues (
            release_id,episode_number,cue_index,source_candidate_id,start_ms,end_ms,text,position
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [releaseId, episodeNumber, index + 1, cue.candidateId, cue.startMs, cue.endMs, cue.text, cue.position]);
        const content = renderScreenTextSrt(cues);
        const sha256 = createHash('sha256').update(content).digest('hex');
        await client.query(`
          INSERT INTO screen_text_exports (release_id,episode_number,filename,sha256,content,size_bytes)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [releaseId, episodeNumber, `第${episodeNumber}集_画面字_V${version}.srt`, sha256, content, content.length]);
      }
      await this.saveCommand(client, projectId, 'release', idempotencyKey, requestHash, releaseId);
      return { releaseId, replay: false };
    });
    return { replay: result.replay, release: (await this.reads.getRelease(projectId, result.releaseId))! };
  }

  private async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private lockCommand(client: PoolClient, projectId: string, kind: string, key: string) {
    return client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`screen-text:${projectId}:${kind}:${key}`]);
  }

  private async command(client: PoolClient, projectId: string, kind: string, key: string) {
    const result = await client.query<any>(`
      SELECT * FROM screen_text_commands WHERE project_id=$1 AND command_kind=$2 AND idempotency_key=$3
    `, [projectId, kind, key]);
    return result.rows[0] ?? null;
  }

  private saveCommand(client: PoolClient, projectId: string, kind: string, key: string, requestHash: string, resourceId: string, responseSnapshot: unknown = null) {
    return client.query(`
      INSERT INTO screen_text_commands (project_id,command_kind,idempotency_key,request_hash,resource_id,response_snapshot)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [projectId, kind, key, requestHash, resourceId, responseSnapshot]);
  }

  private assertSameHash(saved: string, actual: string) {
    if (saved !== actual) throw screenTextConflict('SCREEN_TEXT_IDEMPOTENCY_KEY_REUSED', '同一幂等键不能用于不同请求。');
  }

  private async assertProjectActive(client: PoolClient, projectId: string) {
    const project = await client.query<{ lifecycle_status: string }>(`SELECT lifecycle_status FROM projects WHERE id=$1 FOR UPDATE`, [projectId]);
    if (!project.rowCount) throw screenTextNotFound('SCREEN_TEXT_PROJECT_NOT_FOUND', '项目不存在。');
    const row = project.rows[0];
    if (!row) throw screenTextNotFound('SCREEN_TEXT_PROJECT_NOT_FOUND', '项目不存在。');
    if (row.lifecycle_status !== 'active') throw screenTextConflict('SCREEN_TEXT_PROJECT_NOT_ACTIVE', '项目当前不可执行画面字识别。', 'restore_project');
  }

  private async requireBatch(client: PoolClient, projectId: string, batchId: string, writable: boolean) {
    const batch = await client.query<any>(`
      SELECT b.* FROM screen_text_batches b WHERE b.project_id=$1 AND b.id=$2 FOR UPDATE
    `, [projectId, batchId]);
    if (!batch.rowCount) throw screenTextNotFound('SCREEN_TEXT_BATCH_NOT_FOUND', '画面字批次不存在。');
    if (writable) await this.assertBatchWritable(client, { ...batch.rows[0], batch_status: batch.rows[0].status });
    return batch.rows[0];
  }

  private async assertBatchWritable(client: PoolClient, row: any) {
    await this.assertProjectActive(client, row.project_id);
    const latest = await client.query<{ manifest_id: string | null; term_version_id: string | null }>(`
      SELECT
        (SELECT id FROM material_manifests WHERE project_id=$1 ORDER BY version DESC LIMIT 1) AS manifest_id,
        (SELECT id FROM term_versions WHERE project_id=$1 ORDER BY version DESC LIMIT 1) AS term_version_id
    `, [row.project_id]);
    const manifestId = row.manifest_id ?? (await client.query<{ manifest_id: string }>(`SELECT manifest_id FROM screen_text_batches WHERE id=$1`, [row.batch_id])).rows[0]?.manifest_id;
    const termVersionId = row.term_version_id ?? (await client.query<{ term_version_id: string }>(`SELECT term_version_id FROM screen_text_batches WHERE id=$1`, [row.batch_id])).rows[0]?.term_version_id;
    if (!latest.rowCount || latest.rows[0]?.manifest_id !== manifestId
      || latest.rows[0]?.term_version_id !== termVersionId || row.batch_status === 'stale') {
      throw screenTextConflict('SCREEN_TEXT_BATCH_STALE', '素材或术语来源已经变化，旧画面字工作区只能只读。', 'create_screen_text_batch');
    }
  }

  private validateEditable(row: any) {
    const text = String(row.text ?? '').trim();
    const startMs = Number(row.start_ms);
    const endMs = Number(row.end_ms);
    if (!text || !Number.isInteger(startMs) || !Number.isInteger(endMs) || startMs < 0 || endMs <= startMs
      || !row.video_duration_ms || endMs > Number(row.video_duration_ms)) {
      throw screenTextInvalid('SCREEN_TEXT_DECISION_INVALID', '文字不能为空，时间必须合法且不能超过权威视频时长。');
    }
    if (row.category === 'nameplate' && text.includes('\n')) {
      const identity = text.split('\n').slice(1).map((item) => item.trim()).filter(Boolean);
      const evidence = Array.isArray(row.term_hits)
        ? row.term_hits.flatMap((hit: any) => Array.isArray(hit.identityEvidence) ? hit.identityEvidence : []) : [];
      if (identity.some((item) => !String(row.raw_text ?? '').includes(item) && !evidence.some((proof: string) => proof.includes(item)))) {
        throw screenTextInvalid('SCREEN_TEXT_DECISION_INVALID', '人名条身份缺少术语或画面证据，不能臆造。');
      }
    }
  }

  private isUnsplitDualParent(row: any) {
    return row.source === 'ocr' && row.pair_group_id !== null && row.position === 'full';
  }

  private candidateState(row: any) {
    return {
      id: row.id, text: row.text, startMs: row.start_ms, endMs: row.end_ms,
      category: row.category, position: row.position, status: row.status, revision: row.revision,
    };
  }

  private async recomputeJobAndBatch(client: PoolClient, jobId: string, batchId: string) {
    await client.query(`
      UPDATE screen_text_jobs j SET status = CASE
        WHEN EXISTS (SELECT 1 FROM screen_text_candidates c WHERE c.job_id=j.id AND c.status='pending')
          THEN 'review_pending'::screen_text_job_status
        ELSE 'completed'::screen_text_job_status END,
        updated_at=CURRENT_TIMESTAMP WHERE j.id=$1
    `, [jobId]);
    await client.query(`UPDATE screen_text_batches SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [batchId]);
    await this.recomputeBatch(client, batchId);
  }

  async recomputeBatch(client: PoolClient, batchId: string) {
    await client.query(`
      UPDATE screen_text_batches b SET status = summary.status, updated_at=CURRENT_TIMESTAMP
      FROM (
        SELECT batch_id, CASE
          WHEN bool_or(status='stale') THEN 'stale'::screen_text_batch_status
          WHEN bool_or(status='reconciliation_required') THEN 'reconciliation_required'::screen_text_batch_status
          WHEN bool_or(status='cancel_requested') THEN 'cancel_requested'::screen_text_batch_status
          WHEN bool_or(status='running') THEN 'running'::screen_text_batch_status
          WHEN bool_or(status='failed') AND bool_or(status IN ('review_pending','completed','confirmed_empty')) THEN 'partial'::screen_text_batch_status
          WHEN bool_or(status='failed') THEN 'failed'::screen_text_batch_status
          WHEN bool_or(status IN ('not_started','queued')) AND bool_or(status IN ('review_pending','completed','confirmed_empty','cancelled')) THEN 'partial'::screen_text_batch_status
          WHEN bool_or(status IN ('not_started','queued')) THEN 'queued'::screen_text_batch_status
          WHEN bool_or(status='review_pending') THEN 'review_pending'::screen_text_batch_status
          WHEN bool_and(status IN ('completed','confirmed_empty')) THEN 'completed'::screen_text_batch_status
          WHEN bool_and(status='cancelled') THEN 'cancelled'::screen_text_batch_status
          ELSE 'partial'::screen_text_batch_status END AS status
        FROM screen_text_jobs WHERE batch_id=$1 GROUP BY batch_id
      ) summary WHERE b.id=summary.batch_id
    `, [batchId]);
  }
}
