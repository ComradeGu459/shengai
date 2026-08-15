import { createHash } from 'node:crypto';

import type { CreateAsrBatchBody, RetryAsrBatchBody } from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import type { AsrAdapterDescriptor } from './asr-adapter.js';
import { asrConflict, asrInvalid, asrNotFound } from './asr-errors.js';
import { applyAsrHotwordCapabilities, buildHotwordProjection } from './asr-hotwords.js';
import { loadAsrBatchDetail } from './asr-read.repository.js';

interface CommandRow extends QueryResultRow {
  request_hash: string;
  batch_id: string;
}

interface SourceRow extends QueryResultRow {
  episode_number: number;
  slot_exists: boolean;
  asset_id: string | null;
  original_filename: string | null;
  media_kind: string | null;
  checksum_algorithm: string | null;
  checksum_value: string | null;
  verified_at: Date | null;
}

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalizeEpisodes = (items: number[]) => [...new Set(items)].sort((left, right) => left - right);

const normalizedScope = (scope: CreateAsrBatchBody['scope']) => {
  if (scope.kind === 'all') return { kind: 'all' as const };
  if (scope.kind === 'single') return { kind: 'single' as const, episodeNumber: scope.episodeNumber };
  return { kind: 'selected' as const, episodeNumbers: normalizeEpisodes(scope.episodeNumbers) };
};

const loadSources = async (client: PoolClient, manifestId: string, episodes: number[]) => {
  const result = await client.query<SourceRow>(
    `SELECT requested.episode_number,
            (slot.episode_number IS NOT NULL) AS slot_exists,
            asset.id AS asset_id, asset.original_filename, asset.media_kind,
            asset.checksum_algorithm, asset.checksum_value, asset.verified_at
       FROM unnest($2::integer[]) AS requested(episode_number)
       LEFT JOIN material_manifest_bindings slot
         ON slot.manifest_id = $1 AND slot.episode_number = requested.episode_number
        AND slot.role = 'asr_video'
       LEFT JOIN material_asset_bindings binding
         ON binding.manifest_id = slot.manifest_id
        AND binding.episode_number = slot.episode_number AND binding.role = slot.role
       LEFT JOIN assets asset ON asset.id = binding.asset_id
      ORDER BY requested.episode_number`,
    [manifestId, episodes],
  );
  return result.rows;
};

export const refreshAsrBatchStatus = async (client: PoolClient, batchId: string) => {
  const batch = await client.query<{ status: string }>('SELECT status FROM asr_batches WHERE id = $1 FOR UPDATE', [batchId]);
  if (!batch.rows[0] || batch.rows[0].status === 'blocked') return batch.rows[0]?.status ?? null;
  const result = await client.query<{
    total: string; queued: string; running: string; cancel_requested: string;
    completed: string; failed: string; cancelled: string; reconciliation: string; usable: string;
  }>(
    `SELECT COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE status = 'queued')::text AS queued,
            COUNT(*) FILTER (WHERE status IN ('leased','running'))::text AS running,
            COUNT(*) FILTER (WHERE status = 'cancel_requested')::text AS cancel_requested,
            COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
            COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
            COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled,
            COUNT(*) FILTER (WHERE status = 'reconciliation_required')::text AS reconciliation,
            COUNT(*) FILTER (WHERE current_result_id IS NOT NULL)::text AS usable
       FROM asr_jobs WHERE batch_id = $1`,
    [batchId],
  );
  const row = result.rows[0]!;
  const counts = {
    total: Number(row.total),
    queued: Number(row.queued),
    running: Number(row.running),
    cancelRequested: Number(row.cancel_requested),
    completed: Number(row.completed),
    cancelled: Number(row.cancelled),
    reconciliation: Number(row.reconciliation),
    usable: Number(row.usable),
  };
  let status: 'queued' | 'running' | 'cancel_requested' | 'partial' | 'completed'
    | 'reconciliation_required' | 'failed' | 'cancelled';
  if (counts.cancelRequested > 0) status = 'cancel_requested';
  else if (counts.running > 0) status = 'running';
  else if (counts.queued > 0) status = 'queued';
  else if (counts.completed === counts.total) status = 'completed';
  else if (counts.cancelled === counts.total) status = 'cancelled';
  else if (counts.usable > 0) status = 'partial';
  else if (counts.reconciliation > 0) status = 'reconciliation_required';
  else status = 'failed';
  await client.query(
    'UPDATE asr_batches SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [batchId, status],
  );
  return status;
};

export class AsrCommandRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly adapterDescriptor: Readonly<AsrAdapterDescriptor>,
  ) {}

  async create(input: {
    projectId: string;
    body: CreateAsrBatchBody;
    idempotencyKey: string;
    rejectIfActiveBatch?: boolean;
  }) {
    const scope = normalizedScope(input.body.scope);
    const requestHash = hash({
      scope,
      termVersionId: input.body.termVersionId,
      forceNewRecognition: input.body.forceNewRecognition ?? false,
    });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`asr-batch:${input.projectId}`]);
      const existing = await client.query<CommandRow>(
        `SELECT request_hash, batch_id FROM asr_batch_commands
          WHERE project_id = $1 AND idempotency_key = $2`,
        [input.projectId, input.idempotencyKey],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== requestHash) {
          throw asrConflict('ASR_IDEMPOTENCY_KEY_REUSED', '该幂等键已用于另一 ASR 批次请求。', 'retry_with_new_idempotency_key');
        }
        const replay = await loadAsrBatchDetail(client, existing.rows[0].batch_id);
        await client.query('COMMIT');
        return { batch: replay!, replay: true };
      }
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`material_manifest:${input.projectId}`]);
      const project = await client.query<{ lifecycle_status: string }>(
        'SELECT lifecycle_status FROM projects WHERE id = $1 FOR UPDATE',
        [input.projectId],
      );
      if (!project.rows[0]) throw asrNotFound('ASR_PROJECT_NOT_FOUND', '项目不存在。');
      if (project.rows[0].lifecycle_status !== 'active') {
        throw asrConflict('ASR_PROJECT_NOT_ACTIVE', '项目已进入回收流程，不能创建识别批次。', 'restore_project');
      }
      if (input.rejectIfActiveBatch) {
        const active = await client.query(
          `SELECT id FROM asr_batches
            WHERE project_id = $1 AND status IN ('queued','running','cancel_requested')
            ORDER BY created_at DESC LIMIT 1`,
          [input.projectId],
        );
        if (active.rows[0]) {
          throw asrConflict(
            'ASR_BATCH_ALREADY_ACTIVE',
            '项目已有排队中或执行中的中文识别批次。',
            'view_asr_batches',
          );
        }
      }
      const manifest = await client.query<{ id: string; version: number }>(
        `SELECT id, version FROM material_manifests
          WHERE project_id = $1 ORDER BY version DESC LIMIT 1`,
        [input.projectId],
      );
      if (!manifest.rows[0]) {
        throw asrInvalid('ASR_SOURCE_NOT_READY', '项目还没有已确认素材清单。', 'confirm_materials');
      }
      let episodes: number[];
      if (scope.kind === 'all') {
        const all = await client.query<{ episode_number: number }>(
          `SELECT DISTINCT episode_number FROM material_manifest_bindings
            WHERE manifest_id = $1
            ORDER BY episode_number`,
          [manifest.rows[0].id],
        );
        episodes = all.rows.map((row) => row.episode_number);
      } else if (scope.kind === 'single') episodes = [scope.episodeNumber];
      else episodes = scope.episodeNumbers;
      if (!episodes.length) throw asrInvalid('ASR_BATCH_SCOPE_EMPTY', '所选范围没有中文识别视频槽位。');

      const termVersion = await client.query(
        'SELECT id FROM term_versions WHERE id = $1 AND project_id = $2',
        [input.body.termVersionId, input.projectId],
      );
      if (!termVersion.rows[0]) {
        throw asrInvalid(
          'ASR_TERM_VERSION_NOT_FOUND',
          '必须选择属于当前项目的已确认术语版本。',
          'select_term_version',
        );
      }
      const adapter = this.adapterDescriptor;
      const hotwords = applyAsrHotwordCapabilities(
        await buildHotwordProjection(client, input.body.termVersionId),
        adapter,
      );
      const sources = await loadSources(client, manifest.rows[0].id, episodes);
      const blockers = sources.flatMap((source) => {
        if (!source.slot_exists) return [{
          episodeNumber: source.episode_number,
          code: 'ASR_VIDEO_SLOT_MISSING',
          message: `第 ${source.episode_number} 集没有中文识别视频槽位。`,
        }];
        if (!source.asset_id || !source.verified_at || source.media_kind !== 'video'
          || !source.checksum_algorithm || !source.checksum_value || !source.original_filename) return [{
          episodeNumber: source.episode_number,
          code: 'ASR_VIDEO_NOT_READY',
          message: `第 ${source.episode_number} 集中文识别视频尚未完成服务端校验。`,
        }];
        return [];
      });
      const created = await client.query<{ id: string }>(
        `INSERT INTO asr_batches
           (project_id, scope_kind, episode_numbers, term_version_id, manifest_id, manifest_version,
            provider, adapter, model, language, config_digest, hotword_digest,
            hotword_term_count, hotword_alias_count, hotword_filtered_count, hotword_truncated_count,
            hotword_projection_version, hotword_max_entries, hotword_max_characters,
            hotword_supported, force_new_recognition, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         RETURNING id`,
        [input.projectId, scope.kind, episodes, input.body.termVersionId,
          manifest.rows[0].id, manifest.rows[0].version,
          adapter.provider, adapter.adapter, adapter.model, adapter.language, adapter.configDigest,
          hotwords.summary.digest,
          hotwords.summary.termCount, hotwords.summary.aliasCount, hotwords.summary.filteredCount,
          hotwords.summary.truncatedCount, hotwords.summary.projectionVersion,
          adapter.hotwordCapabilities.maxEntries, adapter.hotwordCapabilities.maxCharacters,
          adapter.hotwordCapabilities.supported, input.body.forceNewRecognition ?? false,
          blockers.length ? 'blocked' : 'queued'],
      );
      const batchId = created.rows[0]!.id;
      if (blockers.length) {
        for (const blocker of blockers) {
          await client.query(
            `INSERT INTO asr_batch_blockers (batch_id, episode_number, code, message)
             VALUES ($1,$2,$3,$4)`,
            [batchId, blocker.episodeNumber, blocker.code, blocker.message],
          );
        }
      } else {
        for (const source of sources) {
          const reusable = await client.query<{ id: string }>(
            `SELECT id FROM asr_results
              WHERE project_id = $1 AND episode_number = $2 AND asset_id = $3
                AND term_version_id = $4 AND config_digest = $5 AND hotword_digest = $6
                AND quality_status IN ('pass','warning')
              ORDER BY revision DESC LIMIT 1`,
            [input.projectId, source.episode_number, source.asset_id,
              input.body.termVersionId, adapter.configDigest, hotwords.summary.digest],
          );
          const reusableResultId = reusable.rows[0]?.id ?? null;
          const reuseWithoutExecution = Boolean(reusableResultId) && !(input.body.forceNewRecognition ?? false);
          await client.query(
            `INSERT INTO asr_jobs
               (batch_id, project_id, episode_number, manifest_id, asset_id, asset_original_filename,
                asset_checksum_algorithm, asset_checksum_value, term_version_id, config_digest,
                hotword_digest, status, current_result_id, reused_result)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
            [batchId, input.projectId, source.episode_number, manifest.rows[0].id, source.asset_id,
              source.original_filename, source.checksum_algorithm, source.checksum_value,
              input.body.termVersionId, adapter.configDigest, hotwords.summary.digest,
              reuseWithoutExecution ? 'completed' : 'queued', reusableResultId, reuseWithoutExecution],
          );
        }
        await refreshAsrBatchStatus(client, batchId);
      }
      await client.query(
        `INSERT INTO asr_batch_commands (project_id, idempotency_key, request_hash, batch_id)
         VALUES ($1,$2,$3,$4)`,
        [input.projectId, input.idempotencyKey, requestHash, batchId],
      );
      const batch = await loadAsrBatchDetail(client, batchId);
      await client.query('COMMIT');
      return { batch: batch!, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancel(input: { projectId: string; batchId: string; idempotencyKey: string }) {
    const requestHash = hash({ batchId: input.batchId });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`asr-batch:${input.projectId}`]);
      const existing = await client.query<CommandRow>(
        `SELECT request_hash, batch_id FROM asr_cancel_commands
          WHERE project_id = $1 AND idempotency_key = $2`,
        [input.projectId, input.idempotencyKey],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== requestHash) {
          throw asrConflict('ASR_IDEMPOTENCY_KEY_REUSED', '该幂等键已用于另一取消命令。', 'retry_with_new_idempotency_key');
        }
        const replay = await loadAsrBatchDetail(client, existing.rows[0].batch_id);
        await client.query('COMMIT');
        return { batch: replay!, replay: true };
      }
      const batch = await client.query<{ id: string; provider: string }>(
        'SELECT id, provider FROM asr_batches WHERE id = $1 AND project_id = $2 FOR UPDATE', [
        input.batchId, input.projectId,
        ],
      );
      if (!batch.rows[0]) throw asrNotFound('ASR_BATCH_NOT_FOUND', 'ASR 批次不存在。');
      await client.query(
        `UPDATE asr_attempts attempt
            SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP,
                error_code = 'ASR_CANCELLED', error_detail = '用户在执行前取消。', retryable = FALSE
           FROM asr_jobs job
          WHERE attempt.job_id = job.id AND job.batch_id = $1
            AND job.status = 'leased' AND attempt.id = job.current_attempt_id`,
        [input.batchId],
      );
      await client.query(
        `INSERT INTO asr_usage
           (attempt_id, provider, media_duration_ms, billing_unit, billing_quantity,
            currency, estimated_amount, final_amount, reconciliation_status)
         SELECT attempt.id, batch.provider, 0, 'cancelled_before_execution', 0, 'CNY', 0, 0, 'final'
           FROM asr_attempts attempt
           JOIN asr_jobs job ON job.id = attempt.job_id
           JOIN asr_batches batch ON batch.id = job.batch_id
          WHERE job.batch_id = $1 AND attempt.status = 'cancelled'
         ON CONFLICT (attempt_id) DO NOTHING`,
        [input.batchId],
      );
      await client.query(
        `UPDATE asr_jobs
            SET status = CASE
                  WHEN status IN ('queued','leased') THEN 'cancelled'::asr_job_status
                  WHEN status = 'running' THEN 'cancel_requested'::asr_job_status
                  ELSE status END,
                cancel_requested = status IN ('queued','leased','running'),
                updated_at = CURRENT_TIMESTAMP
          WHERE batch_id = $1`,
        [input.batchId],
      );
      await refreshAsrBatchStatus(client, input.batchId);
      await client.query(
        `INSERT INTO asr_cancel_commands (project_id, idempotency_key, request_hash, batch_id)
         VALUES ($1,$2,$3,$4)`,
        [input.projectId, input.idempotencyKey, requestHash, input.batchId],
      );
      const saved = await loadAsrBatchDetail(client, input.batchId);
      await client.query('COMMIT');
      return { batch: saved!, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async retry(input: {
    projectId: string;
    batchId: string;
    body: RetryAsrBatchBody;
    idempotencyKey: string;
  }) {
    const requestedEpisodes = input.body.episodeNumbers
      ? normalizeEpisodes(input.body.episodeNumbers)
      : null;
    const requestHash = hash({ batchId: input.batchId, episodeNumbers: requestedEpisodes });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`asr-batch:${input.projectId}`]);
      const existing = await client.query<{ request_hash: string; retry_batch_id: string }>(
        `SELECT request_hash, retry_batch_id FROM asr_retry_commands
          WHERE project_id = $1 AND idempotency_key = $2`,
        [input.projectId, input.idempotencyKey],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== requestHash) {
          throw asrConflict('ASR_IDEMPOTENCY_KEY_REUSED', '该幂等键已用于另一重试命令。', 'retry_with_new_idempotency_key');
        }
        const replay = await loadAsrBatchDetail(client, existing.rows[0].retry_batch_id);
        await client.query('COMMIT');
        return { batch: replay!, replay: true };
      }
      const project = await client.query<{ lifecycle_status: string }>(
        'SELECT lifecycle_status FROM projects WHERE id = $1 FOR UPDATE', [input.projectId],
      );
      if (!project.rows[0]) throw asrNotFound('ASR_PROJECT_NOT_FOUND', '项目不存在。');
      if (project.rows[0].lifecycle_status !== 'active') {
        throw asrConflict('ASR_PROJECT_NOT_ACTIVE', '项目已进入回收流程，不能重试识别。', 'restore_project');
      }
      const sourceBatch = await client.query<{
        id: string; term_version_id: string; manifest_id: string; manifest_version: number;
        provider: string; adapter: string; model: string; language: string;
        config_digest: string; hotword_digest: string; hotword_term_count: number;
        hotword_alias_count: number; hotword_filtered_count: number; hotword_truncated_count: number;
        hotword_projection_version: string; hotword_max_entries: number | null;
        hotword_max_characters: number | null; hotword_supported: boolean;
      }>('SELECT * FROM asr_batches WHERE id = $1 AND project_id = $2 FOR UPDATE', [input.batchId, input.projectId]);
      if (!sourceBatch.rows[0]) throw asrNotFound('ASR_BATCH_NOT_FOUND', 'ASR 批次不存在。');
      const eligible = await client.query<{
        id: string; episode_number: number; manifest_id: string; asset_id: string;
        asset_original_filename: string; asset_checksum_algorithm: string; asset_checksum_value: string;
        term_version_id: string; config_digest: string; hotword_digest: string; current_result_id: string | null;
      }>(
        `SELECT job.id, job.episode_number, job.manifest_id, job.asset_id,
                job.asset_original_filename, job.asset_checksum_algorithm, job.asset_checksum_value,
                job.term_version_id, job.config_digest, job.hotword_digest, job.current_result_id
           FROM asr_jobs job
           JOIN asr_attempts attempt ON attempt.id = job.current_attempt_id
          WHERE job.batch_id = $1 AND job.status = 'failed' AND attempt.retryable
          ORDER BY job.episode_number`,
        [input.batchId],
      );
      const eligibleByEpisode = new Map(eligible.rows.map((job) => [job.episode_number, job]));
      const episodes = requestedEpisodes ?? [...eligibleByEpisode.keys()];
      if (!episodes.length || episodes.some((episode) => !eligibleByEpisode.has(episode))) {
        throw asrConflict('ASR_RETRY_SCOPE_INVALID', '重试范围只能包含已确认可重试的失败集。', 'select_failed_episodes');
      }
      const latestManifest = await client.query<{ id: string }>(
        `SELECT id FROM material_manifests WHERE project_id = $1 ORDER BY version DESC LIMIT 1`,
        [input.projectId],
      );
      const latestSources = latestManifest.rows[0]
        ? await loadSources(client, latestManifest.rows[0].id, episodes)
        : [];
      if (latestSources.length !== episodes.length || latestSources.some((source) => {
        const original = eligibleByEpisode.get(source.episode_number)!;
        return source.asset_id !== original.asset_id || source.checksum_value !== original.asset_checksum_value;
      })) {
        throw asrConflict('ASR_SOURCE_CHANGED', '失败集的视频绑定已经变化，请创建新批次。', 'create_asr_batch');
      }
      const source = sourceBatch.rows[0];
      const created = await client.query<{ id: string }>(
        `INSERT INTO asr_batches
           (project_id, retry_of_batch_id, scope_kind, episode_numbers, term_version_id,
            manifest_id, manifest_version, provider, adapter, model, language, config_digest,
            hotword_digest, hotword_term_count, hotword_alias_count, hotword_filtered_count,
            hotword_truncated_count, hotword_projection_version, hotword_max_entries,
            hotword_max_characters, hotword_supported, force_new_recognition, status)
         VALUES ($1,$2,'selected',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,TRUE,'queued')
         RETURNING id`,
        [input.projectId, input.batchId, episodes, source.term_version_id,
          source.manifest_id, source.manifest_version,
          source.provider, source.adapter, source.model, source.language,
          source.config_digest, source.hotword_digest,
          source.hotword_term_count, source.hotword_alias_count, source.hotword_filtered_count,
          source.hotword_truncated_count, source.hotword_projection_version,
          source.hotword_max_entries, source.hotword_max_characters, source.hotword_supported],
      );
      const retryBatchId = created.rows[0]!.id;
      for (const episode of episodes) {
        const job = eligibleByEpisode.get(episode)!;
        await client.query(
          `INSERT INTO asr_jobs
             (batch_id, project_id, episode_number, manifest_id, asset_id, asset_original_filename,
              asset_checksum_algorithm, asset_checksum_value, term_version_id, config_digest,
              hotword_digest, status, current_result_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'queued',$12)`,
          [retryBatchId, input.projectId, episode, job.manifest_id, job.asset_id,
            job.asset_original_filename, job.asset_checksum_algorithm, job.asset_checksum_value,
            job.term_version_id, job.config_digest, job.hotword_digest, job.current_result_id],
        );
      }
      await client.query(
        `INSERT INTO asr_retry_commands
           (project_id, idempotency_key, request_hash, source_batch_id, retry_batch_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [input.projectId, input.idempotencyKey, requestHash, input.batchId, retryBatchId],
      );
      const saved = await loadAsrBatchDetail(client, retryBatchId);
      await client.query('COMMIT');
      return { batch: saved!, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
