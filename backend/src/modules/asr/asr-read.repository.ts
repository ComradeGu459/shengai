import type {
  AsrAttempt,
  AsrBatchDetail,
  AsrBatchHotwordEvidence,
  AsrBatchListQuery,
  AsrBatchSummary,
  AsrCue,
  AsrHotwordPreview,
  AsrJob,
  AsrResult,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import type { AsrAdapterDescriptor } from './asr-adapter.js';
import { asrInvalid } from './asr-errors.js';
import { applyAsrHotwordCapabilities, buildHotwordProjection } from './asr-hotwords.js';

interface BatchRow extends QueryResultRow {
  id: string;
  project_id: string;
  retry_of_batch_id: string | null;
  scope_kind: AsrBatchSummary['scopeKind'];
  episode_numbers: number[];
  term_version_id: string;
  term_version_is_latest: boolean;
  manifest_id: string;
  manifest_version: number;
  provider: string;
  adapter: string;
  model: string;
  language: string;
  config_digest: string;
  hotword_digest: string;
  hotword_term_count: number;
  hotword_alias_count: number;
  hotword_filtered_count: number;
  hotword_truncated_count: number;
  hotword_projection_version: string;
  status: AsrBatchSummary['status'];
  force_new_recognition: boolean;
  total_count_value: string;
  queued_count: string;
  running_count: string;
  cancel_requested_count: string;
  completed_count: string;
  failed_count: string;
  cancelled_count: string;
  reconciliation_count: string;
  reused_count: string;
  created_at: Date;
  updated_at: Date;
  list_total?: string;
}

interface JobRow extends QueryResultRow {
  id: string;
  episode_number: number;
  asset_id: string;
  asset_original_filename: string;
  asset_checksum_value: string;
  status: AsrJob['status'];
  current_attempt_id: string | null;
  current_result_id: string | null;
  reused_result: boolean;
  cancel_requested: boolean;
  created_at: Date;
  updated_at: Date;
}

interface AttemptRow extends QueryResultRow {
  id: string;
  attempt_number: number;
  status: AsrAttempt['status'];
  lease_owner: string | null;
  lease_expires_at: Date | null;
  provider_request_id: string | null;
  error_code: string | null;
  error_detail: string | null;
  retryable: boolean;
  external_side_effect_possible: boolean;
  started_at: Date | null;
  completed_at: Date | null;
  hotword_projection_version: string | null;
  hotword_payload_digest: string | null;
  hotword_payload_count: number | null;
  hotword_payload_character_count: number | null;
  hotword_receipt_status: AsrAttempt['hotwordReceipt'];
  hotword_submitted_count: number | null;
  hotword_omitted_count: number | null;
  hotword_receipt_reason_code: NonNullable<AsrAttempt['hotwordReceiptFacts']>['reasonCode'];
  created_at: Date;
  usage_provider: string | null;
  media_duration_ms: string | null;
  billing_unit: string | null;
  billing_quantity: string | null;
  currency: string | null;
  estimated_amount: string | null;
  final_amount: string | null;
  reconciliation_status: 'final' | 'pending' | null;
  usage_provider_request_id: string | null;
  result_id: string | null;
}

interface ResultRow extends QueryResultRow {
  id: string;
  revision: number;
  project_id: string;
  episode_number: number;
  asset_id: string;
  term_version_id: string;
  config_digest: string;
  hotword_digest: string;
  quality_status: AsrResult['qualityStatus'];
  quality_summary: AsrResult['qualitySummary'];
  created_at: Date;
}

interface BatchHotwordRow extends QueryResultRow {
  project_id: string;
  term_version_id: string;
  provider: string;
  adapter: string;
  model: string;
  language: string;
  config_digest: string;
  hotword_digest: string;
  hotword_term_count: number;
  hotword_alias_count: number;
  hotword_filtered_count: number;
  hotword_truncated_count: number;
  hotword_projection_version: string;
  hotword_supported: boolean;
  hotword_max_entries: number | null;
  hotword_max_characters: number | null;
}

const batchColumns = `
  batch.id, batch.project_id, batch.retry_of_batch_id, batch.scope_kind,
  batch.episode_numbers, batch.term_version_id, batch.manifest_id, batch.manifest_version,
  (batch.term_version_id = (
    SELECT version.id FROM term_versions version
     WHERE version.project_id = batch.project_id ORDER BY version.version DESC LIMIT 1
  )) AS term_version_is_latest,
  batch.provider, batch.adapter, batch.model, batch.language, batch.config_digest,
  batch.hotword_digest, batch.hotword_term_count, batch.hotword_alias_count,
  batch.hotword_filtered_count, batch.hotword_truncated_count,
  batch.hotword_projection_version, batch.status,
  batch.force_new_recognition, batch.created_at, batch.updated_at,
  cardinality(batch.episode_numbers)::text AS total_count_value,
  COUNT(job.id) FILTER (WHERE job.status = 'queued')::text AS queued_count,
  COUNT(job.id) FILTER (WHERE job.status IN ('leased','running'))::text AS running_count,
  COUNT(job.id) FILTER (WHERE job.status = 'cancel_requested')::text AS cancel_requested_count,
  COUNT(job.id) FILTER (WHERE job.status = 'completed')::text AS completed_count,
  COUNT(job.id) FILTER (WHERE job.status = 'failed')::text AS failed_count,
  COUNT(job.id) FILTER (WHERE job.status = 'cancelled')::text AS cancelled_count,
  COUNT(job.id) FILTER (WHERE job.status = 'reconciliation_required')::text AS reconciliation_count,
  COUNT(job.id) FILTER (WHERE job.reused_result)::text AS reused_count
`;

const toSummary = (row: BatchRow): AsrBatchSummary => ({
  id: row.id,
  projectId: row.project_id,
  retryOfBatchId: row.retry_of_batch_id,
  scopeKind: row.scope_kind,
  episodeNumbers: row.episode_numbers,
  termVersionId: row.term_version_id,
  termVersionIsLatest: row.term_version_is_latest,
  manifestId: row.manifest_id,
  manifestVersion: row.manifest_version,
  provider: row.provider,
  adapter: row.adapter,
  model: row.model,
  language: row.language,
  configDigest: row.config_digest,
  hotwords: {
    projectionVersion: row.hotword_projection_version,
    digest: row.hotword_digest,
    termCount: row.hotword_term_count,
    aliasCount: row.hotword_alias_count,
    filteredCount: row.hotword_filtered_count,
    truncatedCount: row.hotword_truncated_count,
  },
  status: row.status,
  forceNewRecognition: row.force_new_recognition,
  counts: {
    total: Number(row.total_count_value),
    queued: Number(row.queued_count),
    running: Number(row.running_count),
    cancelRequested: Number(row.cancel_requested_count),
    completed: Number(row.completed_count),
    failed: Number(row.failed_count),
    cancelled: Number(row.cancelled_count),
    reconciliationRequired: Number(row.reconciliation_count),
    reused: Number(row.reused_count),
  },
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const loadResult = async (client: PoolClient, resultId: string): Promise<AsrResult | null> => {
  const result = await client.query<ResultRow>('SELECT * FROM asr_results WHERE id = $1', [resultId]);
  const row = result.rows[0];
  if (!row) return null;
  const cues = await client.query<{
    id: string; cue_index: number; start_ms: number; end_ms: number; text: string; confidence: string | null;
  }>('SELECT * FROM asr_cues WHERE result_id = $1 ORDER BY cue_index, id', [resultId]);
  return {
    id: row.id,
    revision: row.revision,
    projectId: row.project_id,
    episodeNumber: row.episode_number,
    assetId: row.asset_id,
    termVersionId: row.term_version_id,
    configDigest: row.config_digest,
    hotwordDigest: row.hotword_digest,
    qualityStatus: row.quality_status,
    qualitySummary: row.quality_summary,
    cues: cues.rows.map((cue): AsrCue => ({
      id: cue.id,
      cueIndex: cue.cue_index,
      startMs: cue.start_ms,
      endMs: cue.end_ms,
      text: cue.text,
      confidence: cue.confidence === null ? null : Number(cue.confidence),
    })),
    createdAt: row.created_at.toISOString(),
  };
};

const loadAttempts = async (client: PoolClient, jobId: string): Promise<AsrAttempt[]> => {
  const result = await client.query<AttemptRow>(
    `SELECT attempt.*,
            usage.provider AS usage_provider, usage.media_duration_ms, usage.billing_unit,
            usage.billing_quantity, usage.currency, usage.estimated_amount, usage.final_amount,
            usage.reconciliation_status, usage.provider_request_id AS usage_provider_request_id,
            attempt_result.id AS result_id
       FROM asr_attempts attempt
       LEFT JOIN asr_usage usage ON usage.attempt_id = attempt.id
       LEFT JOIN asr_results attempt_result ON attempt_result.attempt_id = attempt.id
      WHERE attempt.job_id = $1
      ORDER BY attempt.attempt_number, attempt.id`,
    [jobId],
  );
  const attempts: AsrAttempt[] = [];
  for (const row of result.rows) {
    attempts.push({
      id: row.id,
      attemptNumber: row.attempt_number,
      status: row.status,
      leaseOwner: row.lease_owner,
      leaseExpiresAt: row.lease_expires_at?.toISOString() ?? null,
      providerRequestId: row.provider_request_id,
      errorCode: row.error_code,
      errorDetail: row.error_detail,
      retryable: row.retryable,
      externalSideEffectPossible: row.external_side_effect_possible,
      startedAt: row.started_at?.toISOString() ?? null,
      completedAt: row.completed_at?.toISOString() ?? null,
      hotwordPayload: row.hotword_payload_digest ? {
        projectionVersion: row.hotword_projection_version!,
        digest: row.hotword_payload_digest,
        itemCount: row.hotword_payload_count!,
        characterCount: row.hotword_payload_character_count!,
      } : null,
      hotwordReceipt: row.hotword_receipt_status,
      hotwordReceiptFacts: row.hotword_submitted_count !== null
        || row.hotword_omitted_count !== null
        || row.hotword_receipt_reason_code !== null ? {
          submittedCount: row.hotword_submitted_count,
          omittedCount: row.hotword_omitted_count,
          reasonCode: row.hotword_receipt_reason_code,
        } : null,
      usage: row.usage_provider ? {
        provider: row.usage_provider,
        mediaDurationMs: Number(row.media_duration_ms),
        billingUnit: row.billing_unit!,
        billingQuantity: Number(row.billing_quantity),
        currency: row.currency!,
        estimatedAmount: row.estimated_amount!,
        finalAmount: row.final_amount!,
        reconciliationStatus: row.reconciliation_status!,
        providerRequestId: row.usage_provider_request_id,
      } : null,
      result: row.result_id ? await loadResult(client, row.result_id) : null,
      createdAt: row.created_at.toISOString(),
    });
  }
  return attempts;
};

export const loadAsrBatchSummary = async (client: PoolClient, batchId: string) => {
  const result = await client.query<BatchRow>(
    `SELECT ${batchColumns}
       FROM asr_batches batch
       LEFT JOIN asr_jobs job ON job.batch_id = batch.id
      WHERE batch.id = $1
      GROUP BY batch.id`,
    [batchId],
  );
  return result.rows[0] ? toSummary(result.rows[0]) : null;
};

export const loadAsrBatchDetail = async (client: PoolClient, batchId: string): Promise<AsrBatchDetail | null> => {
  const summary = await loadAsrBatchSummary(client, batchId);
  if (!summary) return null;
  const blockers = await client.query<{ episode_number: number; code: string; message: string }>(
    `SELECT episode_number, code, message
       FROM asr_batch_blockers WHERE batch_id = $1 ORDER BY episode_number, id`,
    [batchId],
  );
  const jobRows = await client.query<JobRow>(
    `SELECT id, episode_number, asset_id, asset_original_filename, asset_checksum_value,
            status, current_attempt_id, current_result_id, reused_result, cancel_requested,
            created_at, updated_at
       FROM asr_jobs WHERE batch_id = $1 ORDER BY episode_number, id`,
    [batchId],
  );
  const jobs: AsrJob[] = [];
  for (const row of jobRows.rows) {
    jobs.push({
      id: row.id,
      episodeNumber: row.episode_number,
      assetId: row.asset_id,
      assetOriginalFilename: row.asset_original_filename,
      assetChecksum: row.asset_checksum_value,
      status: row.status,
      currentAttemptId: row.current_attempt_id,
      currentResultId: row.current_result_id,
      reusedResult: row.reused_result,
      cancelRequested: row.cancel_requested,
      attempts: await loadAttempts(client, row.id),
      currentResult: row.current_result_id ? await loadResult(client, row.current_result_id) : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    });
  }
  return {
    ...summary,
    blockers: blockers.rows.map((row) => ({
      episodeNumber: row.episode_number,
      code: row.code,
      message: row.message,
    })),
    jobs,
  };
};

export class AsrReadRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly adapterDescriptor: Readonly<AsrAdapterDescriptor>,
  ) {}

  async previewHotwords(projectId: string, termVersionId: string): Promise<AsrHotwordPreview> {
    const client = await this.pool.connect();
    try {
      const version = await client.query(
        'SELECT id FROM term_versions WHERE id = $1 AND project_id = $2',
        [termVersionId, projectId],
      );
      if (!version.rows[0]) {
        throw asrInvalid(
          'ASR_TERM_VERSION_NOT_FOUND',
          '必须选择属于当前项目的已确认术语版本。',
          'select_term_version',
        );
      }
      const projection = applyAsrHotwordCapabilities(
        await buildHotwordProjection(client, termVersionId),
        this.adapterDescriptor,
      );
      return {
        projectId,
        termVersionId,
        provider: this.adapterDescriptor.provider,
        adapter: this.adapterDescriptor.adapter,
        model: this.adapterDescriptor.model,
        language: this.adapterDescriptor.language,
        configDigest: this.adapterDescriptor.configDigest,
        capabilities: this.adapterDescriptor.hotwordCapabilities,
        entries: projection.entries.map((entry) => ({
          text: entry.word,
          source: entry.source,
        })),
        omittedEntries: projection.omittedEntries.map((entry) => ({
          order: entry.order,
          text: entry.word,
          source: entry.source,
          reasonCode: entry.reasonCode,
        })),
        summary: projection.summary,
      };
    } finally {
      client.release();
    }
  }

  async batchHotwords(projectId: string, batchId: string): Promise<AsrBatchHotwordEvidence | null> {
    const client = await this.pool.connect();
    try {
      const batch = await client.query<BatchHotwordRow>(
        `SELECT project_id, term_version_id, provider, adapter, model, language, config_digest,
                hotword_digest, hotword_term_count, hotword_alias_count,
                hotword_filtered_count, hotword_truncated_count, hotword_projection_version,
                hotword_supported, hotword_max_entries, hotword_max_characters
           FROM asr_batches WHERE id = $1`,
        [batchId],
      );
      const row = batch.rows[0];
      if (!row || row.project_id !== projectId) return null;
      const capabilities = {
        supported: row.hotword_supported,
        maxEntries: row.hotword_max_entries,
        maxCharacters: row.hotword_max_characters,
      };
      const projection = applyAsrHotwordCapabilities(
        await buildHotwordProjection(client, row.term_version_id),
        { hotwordCapabilities: capabilities },
        row.hotword_projection_version,
      );
      const summaryMatches = projection.summary.digest === row.hotword_digest
        && projection.summary.termCount === row.hotword_term_count
        && projection.summary.aliasCount === row.hotword_alias_count
        && projection.summary.filteredCount === row.hotword_filtered_count
        && projection.summary.truncatedCount === row.hotword_truncated_count;
      if (!summaryMatches) {
        throw asrInvalid(
          'ASR_HOTWORD_EVIDENCE_MISMATCH',
          '批次热词证据与保存摘要不一致，已停止展示。',
          'reload_asr_batch',
        );
      }
      return {
        projectId,
        batchId,
        termVersionId: row.term_version_id,
        provider: row.provider,
        adapter: row.adapter,
        model: row.model,
        language: row.language,
        configDigest: row.config_digest,
        capabilities,
        entries: projection.entries.map((entry) => ({
          text: entry.word,
          source: entry.source,
        })),
        omittedEntries: projection.omittedEntries.map((entry) => ({
          order: entry.order,
          text: entry.word,
          source: entry.source,
          reasonCode: entry.reasonCode,
        })),
        summary: projection.summary,
      };
    } finally {
      client.release();
    }
  }

  async get(projectId: string, batchId: string) {
    const client = await this.pool.connect();
    try {
      const batch = await loadAsrBatchDetail(client, batchId);
      return batch?.projectId === projectId ? batch : null;
    } finally {
      client.release();
    }
  }

  async list(projectId: string, query: AsrBatchListQuery) {
    const values: unknown[] = [projectId];
    const predicates = ['batch.project_id = $1'];
    const search = query.search?.trim();
    if (search) {
      values.push(`%${search}%`);
      predicates.push(`batch.id::text ILIKE $${values.length}`);
    }
    if (query.status) {
      values.push(query.status);
      predicates.push(`batch.status = $${values.length}`);
    }
    const sortColumn = query.sortBy === 'actionPriority'
      ? `CASE status
              WHEN 'reconciliation_required' THEN 9
              WHEN 'failed' THEN 8
              WHEN 'cancel_requested' THEN 7
              WHEN 'running' THEN 6
              WHEN 'queued' THEN 5
              WHEN 'partial' THEN 4
              WHEN 'blocked' THEN 3
              WHEN 'completed' THEN 2
              WHEN 'cancelled' THEN 1
              ELSE 0 END`
      : query.sortBy === 'updatedAt'
        ? 'updated_at'
        : query.sortBy === 'status'
          ? 'status'
          : 'created_at';
    const sortDirection = query.sortDirection === 'asc' ? 'ASC' : 'DESC';
    values.push(Number(query.limit ?? 20), Number(query.offset ?? 0));
    const result = await this.pool.query<BatchRow>(
      `WITH projected AS (
         SELECT ${batchColumns}
           FROM asr_batches batch
           LEFT JOIN asr_jobs job ON job.batch_id = batch.id
          WHERE ${predicates.join(' AND ')}
          GROUP BY batch.id
       ), page AS (
         SELECT * FROM projected
          ORDER BY ${sortColumn} ${sortDirection}, updated_at DESC, id DESC
          LIMIT $${values.length - 1} OFFSET $${values.length}
       )
       SELECT page.*, totals.list_total
         FROM (SELECT COUNT(*)::text AS list_total FROM projected) totals
         LEFT JOIN page ON TRUE
        ORDER BY ${sortColumn} ${sortDirection}, updated_at DESC, id DESC`,
      values,
    );
    return {
      items: result.rows.filter((row) => row.id).map(toSummary),
      total: Number(result.rows[0]?.list_total ?? 0),
    };
  }
}
