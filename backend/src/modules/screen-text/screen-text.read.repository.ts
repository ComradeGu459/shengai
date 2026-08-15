import type {
  ScreenTextBatch,
  ScreenTextBatchListQuery,
  ScreenTextBatchSummary,
  ScreenTextCandidate,
  ScreenTextCandidateQuery,
  ScreenTextEpisodeJob,
  ScreenTextRelease,
  ScreenTextReleaseListQuery,
} from '@qimao-terms-cloud/contracts';

import type { DatabasePool } from '../../database/pool.js';

const number = (value: string | number) => Number(value);
const date = (value: Date | string) => new Date(value).toISOString();

export class ScreenTextReadRepository {
  constructor(private readonly database: DatabasePool) {}

  private async refreshProjectStale(projectId: string) {
    await this.database.query(`
      WITH latest AS (
        SELECT p.id AS project_id,
          (SELECT mm.id FROM material_manifests mm
           WHERE mm.project_id = p.id ORDER BY mm.version DESC LIMIT 1) AS manifest_id,
          (SELECT tv.id FROM term_versions tv
           WHERE tv.project_id = p.id ORDER BY tv.version DESC LIMIT 1) AS term_version_id
        FROM projects p WHERE p.id = $1
      )
      UPDATE screen_text_batches b
      SET status = 'stale', revision = revision + 1, updated_at = CURRENT_TIMESTAMP
      FROM latest
      WHERE b.project_id = latest.project_id AND b.status <> 'stale'
        AND (b.manifest_id IS DISTINCT FROM latest.manifest_id
          OR b.term_version_id IS DISTINCT FROM latest.term_version_id)
    `, [projectId]);
    await this.database.query(`
      UPDATE screen_text_jobs j SET status = 'stale', updated_at = CURRENT_TIMESTAMP
      FROM screen_text_batches b
      WHERE b.project_id = $1 AND b.status = 'stale'
        AND j.batch_id = b.id AND j.status NOT IN ('completed', 'confirmed_empty', 'cancelled')
    `, [projectId]);
  }

  async refreshStale(projectId: string, batchId: string) {
    await this.database.query(`
      WITH target AS (
        SELECT b.id,
          (SELECT mm.id FROM material_manifests mm
           WHERE mm.project_id = b.project_id ORDER BY mm.version DESC LIMIT 1) AS latest_manifest_id,
          (SELECT tv.id FROM term_versions tv
           WHERE tv.project_id = b.project_id ORDER BY tv.version DESC LIMIT 1) AS latest_term_version_id,
          b.manifest_id, b.term_version_id
        FROM screen_text_batches b
        WHERE b.id = $2 AND b.project_id = $1
      ), changed AS (
        SELECT t.id FROM target t
        WHERE t.latest_manifest_id IS DISTINCT FROM t.manifest_id
          OR t.latest_term_version_id IS DISTINCT FROM t.term_version_id
      )
      UPDATE screen_text_batches b
      SET status = 'stale', revision = revision + 1, updated_at = CURRENT_TIMESTAMP
      WHERE b.id IN (SELECT id FROM changed) AND b.status <> 'stale'
    `, [projectId, batchId]);
    await this.database.query(`
      UPDATE screen_text_jobs j SET status = 'stale', updated_at = CURRENT_TIMESTAMP
      FROM screen_text_batches b
      WHERE b.id = $2 AND b.project_id = $1 AND b.status = 'stale'
        AND j.batch_id = b.id AND j.status NOT IN ('completed', 'confirmed_empty', 'cancelled')
    `, [projectId, batchId]);
  }

  async getBatch(projectId: string, batchId: string): Promise<ScreenTextBatch | null> {
    await this.refreshStale(projectId, batchId);
    const batch = await this.database.query<any>(`
      SELECT b.*, tv.version AS term_version
      FROM screen_text_batches b
      JOIN term_versions tv ON tv.id = b.term_version_id
      WHERE b.project_id = $1 AND b.id = $2
    `, [projectId, batchId]);
    if (!batch.rowCount) return null;
    const jobs = await this.database.query<any>(`
      SELECT j.*,
        COALESCE(c.total, 0)::int AS candidate_total,
        COALESCE(c.pending, 0)::int AS candidate_pending,
        COALESCE(c.approved, 0)::int AS candidate_approved,
        COALESCE(c.edited, 0)::int AS candidate_edited,
        COALESCE(c.rejected, 0)::int AS candidate_rejected,
        a.id AS attempt_id, a.attempt_number, a.status AS attempt_status,
        a.execution_kind, a.provider, a.adapter, a.model, a.language, a.deployment,
        a.input_version, a.output_version, a.config_digest, a.capabilities, a.input_digest,
        a.receipt, a.stats AS attempt_stats, a.usage, a.error_code, a.error_detail,
        a.retryable, a.created_at AS attempt_created_at
      FROM screen_text_jobs j
      LEFT JOIN LATERAL (
        SELECT count(*) AS total,
          count(*) FILTER (WHERE status = 'pending') AS pending,
          count(*) FILTER (WHERE status = 'approved') AS approved,
          count(*) FILTER (WHERE status = 'edited') AS edited,
          count(*) FILTER (WHERE status = 'rejected') AS rejected
        FROM screen_text_candidates WHERE job_id = j.id
      ) c ON true
      LEFT JOIN screen_text_attempts a ON a.id = j.current_attempt_id
      WHERE j.batch_id = $1 ORDER BY j.episode_number, j.id
    `, [batchId]);
    const usage = await this.database.query<any>(`
      SELECT usage->>'provider' AS provider, usage->>'billingUnit' AS billing_unit,
        usage->>'currency' AS currency,
        sum((usage->>'billingQuantity')::numeric) AS billing_quantity,
        sum((usage->>'estimatedAmount')::numeric) AS estimated_amount,
        sum((usage->>'finalAmount')::numeric) AS final_amount,
        bool_or(usage->>'reconciliationStatus'='pending') AS pending
      FROM screen_text_attempts attempt
      JOIN screen_text_jobs job ON job.id=attempt.job_id
      WHERE job.batch_id=$1 AND attempt.usage IS NOT NULL
      GROUP BY usage->>'provider', usage->>'billingUnit', usage->>'currency'
      ORDER BY usage->>'provider', usage->>'billingUnit', usage->>'currency'
    `, [batchId]);
    return this.mapBatch(batch.rows[0], jobs.rows, usage.rows);
  }

  async listBatches(projectId: string, query: ScreenTextBatchListQuery) {
    await this.refreshProjectStale(projectId);
    const limit = Number(query.limit ?? 50);
    const offset = Number(query.offset ?? 0);
    const values: unknown[] = [projectId, query.status ?? null, query.search?.trim() || null];
    const where = `b.project_id = $1
      AND ($2::text IS NULL OR b.status::text = $2)
      AND ($3::text IS NULL OR b.id::text ILIKE '%' || $3 || '%'
        OR b.request_id ILIKE '%' || $3 || '%')`;
    const count = await this.database.query<{ total: string }>(`
      SELECT count(*) AS total FROM screen_text_batches b WHERE ${where}
    `, values);
    const orderBy = query.sort === 'created_desc'
      ? 'b.created_at DESC, b.id DESC'
      : 'b.updated_at DESC, b.id DESC';
    const rows = await this.database.query<any>(`
      SELECT b.*, tv.version AS term_version,
        COALESCE(j.total, 0)::int AS job_total,
        COALESCE(j.queued, 0)::int AS job_queued,
        COALESCE(j.running, 0)::int AS job_running,
        COALESCE(j.review_pending, 0)::int AS job_review_pending,
        COALESCE(j.completed, 0)::int AS job_completed,
        COALESCE(j.failed, 0)::int AS job_failed,
        COALESCE(j.cancelled, 0)::int AS job_cancelled,
        COALESCE(j.reconciliation_required, 0)::int AS job_reconciliation_required
      FROM screen_text_batches b
      JOIN term_versions tv ON tv.id = b.term_version_id
      LEFT JOIN LATERAL (
        SELECT count(*) AS total,
          count(*) FILTER (WHERE status IN ('not_started', 'queued')) AS queued,
          count(*) FILTER (WHERE status IN ('running', 'cancel_requested')) AS running,
          count(*) FILTER (WHERE status = 'review_pending') AS review_pending,
          count(*) FILTER (WHERE status IN ('completed', 'confirmed_empty')) AS completed,
          count(*) FILTER (WHERE status = 'failed') AS failed,
          count(*) FILTER (WHERE status = 'cancelled') AS cancelled,
          count(*) FILTER (WHERE status = 'reconciliation_required') AS reconciliation_required
        FROM screen_text_jobs WHERE batch_id = b.id
      ) j ON true
      WHERE ${where} ORDER BY ${orderBy} LIMIT $4 OFFSET $5
    `, [...values, limit, offset]);
    return {
      items: rows.rows.map((row) => this.mapBatchSummary(row)),
      total: Number(count.rows[0]?.total ?? 0), limit, offset,
    };
  }

  async listCandidates(projectId: string, batchId: string, query: ScreenTextCandidateQuery) {
    await this.refreshStale(projectId, batchId);
    const limit = Number(query.limit ?? 50);
    const offset = Number(query.offset ?? 0);
    const episodeNumber = query.episodeNumber === undefined ? null : Number(query.episodeNumber);
    const values: unknown[] = [projectId, batchId, episodeNumber, query.status ?? null, query.category ?? null, query.search?.trim() || null];
    const where = `b.project_id = $1 AND c.batch_id = $2
      AND ($3::integer IS NULL OR c.episode_number = $3)
      AND ($4::text IS NULL OR c.status::text = $4)
      AND ($5::text IS NULL OR c.category::text = $5)
      AND ($6::text IS NULL OR c.text ILIKE '%' || $6 || '%' OR c.raw_text ILIKE '%' || $6 || '%')`;
    const count = await this.database.query<{ total: string }>(`
      SELECT count(*) AS total FROM screen_text_candidates c
      JOIN screen_text_batches b ON b.id = c.batch_id WHERE ${where}
    `, values);
    const orderBy = query.sort === 'time_asc'
      ? 'c.episode_number, c.start_ms, c.end_ms, c.id'
      : query.sort === 'confidence_desc'
        ? 'c.confidence DESC NULLS LAST, c.episode_number, c.start_ms, c.end_ms, c.id'
        : query.sort === 'pending_first'
          ? "CASE WHEN c.status = 'pending' THEN 0 ELSE 1 END, c.episode_number, c.start_ms, c.end_ms, c.id"
          : "CASE WHEN c.category = 'nameplate' THEN 0 ELSE 1 END, c.episode_number, c.start_ms, c.end_ms, c.id";
    const rows = await this.database.query<any>(`
      SELECT c.*, b.project_id FROM screen_text_candidates c
      JOIN screen_text_batches b ON b.id = c.batch_id WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT $7 OFFSET $8
    `, [...values, limit, offset]);
    return {
      items: rows.rows.map((row) => this.mapCandidate(row)),
      total: Number(count.rows[0]?.total ?? 0), limit, offset,
    };
  }

  async getCandidate(projectId: string, candidateId: string): Promise<ScreenTextCandidate | null> {
    const result = await this.database.query<any>(`
      SELECT c.*, b.project_id FROM screen_text_candidates c
      JOIN screen_text_batches b ON b.id = c.batch_id
      WHERE b.project_id = $1 AND c.id = $2
    `, [projectId, candidateId]);
    return result.rowCount ? this.mapCandidate(result.rows[0]) : null;
  }

  async getRelease(projectId: string, releaseId: string): Promise<ScreenTextRelease | null> {
    const release = await this.database.query<any>(`
      SELECT * FROM screen_text_releases WHERE project_id = $1 AND id = $2
    `, [projectId, releaseId]);
    if (!release.rowCount) return null;
    const exports = await this.database.query<any>(`
      SELECT id, episode_number, filename, sha256, size_bytes
      FROM screen_text_exports WHERE release_id = $1 ORDER BY episode_number, id
    `, [releaseId]);
    return this.mapRelease(release.rows[0], exports.rows);
  }

  async listReleases(projectId: string, query: ScreenTextReleaseListQuery) {
    const limit = Number(query.limit ?? 50);
    const offset = Number(query.offset ?? 0);
    const values: unknown[] = [projectId, query.search?.trim() || null];
    const where = `r.project_id = $1 AND ($2::text IS NULL
      OR r.version::text ILIKE '%' || $2 || '%'
      OR r.batch_id::text ILIKE '%' || $2 || '%'
      OR EXISTS (SELECT 1 FROM screen_text_exports e
        WHERE e.release_id = r.id AND e.filename ILIKE '%' || $2 || '%'))`;
    const count = await this.database.query<{ total: string }>(`
      SELECT count(*) AS total FROM screen_text_releases r WHERE ${where}
    `, values);
    const orderBy = query.sort === 'created_desc'
      ? 'r.created_at DESC, r.id DESC'
      : 'r.version DESC, r.id DESC';
    const releases = await this.database.query<any>(`
      SELECT r.* FROM screen_text_releases r WHERE ${where}
      ORDER BY ${orderBy} LIMIT $3 OFFSET $4
    `, [...values, limit, offset]);
    const releaseIds = releases.rows.map((row) => row.id);
    const exports = releaseIds.length ? await this.database.query<any>(`
      SELECT id, release_id, episode_number, filename, sha256, size_bytes
      FROM screen_text_exports WHERE release_id = ANY($1::uuid[])
      ORDER BY episode_number, id
    `, [releaseIds]) : { rows: [] as any[] };
    return {
      items: releases.rows.map((row) => this.mapRelease(
        row, exports.rows.filter((item) => item.release_id === row.id),
      )),
      total: Number(count.rows[0]?.total ?? 0), limit, offset,
    };
  }

  async listEvents(projectId: string, batchId: string) {
    const result = await this.database.query<any>(`
      SELECT e.id,e.candidate_id,e.episode_number,e.action,e.before_state,e.after_state,e.created_at
      FROM screen_text_decision_events e
      JOIN screen_text_batches b ON b.id=e.batch_id
      WHERE b.project_id=$1 AND b.id=$2 ORDER BY e.id
    `, [projectId, batchId]);
    return { items: result.rows.map((row) => ({
      id: Number(row.id), candidateId: row.candidate_id, episodeNumber: row.episode_number,
      action: row.action, beforeState: row.before_state, afterState: row.after_state,
      createdAt: date(row.created_at),
    })) };
  }

  async getExport(projectId: string, exportId: string) {
    const result = await this.database.query<any>(`
      SELECT e.filename, e.content, e.sha256 FROM screen_text_exports e
      JOIN screen_text_releases r ON r.id = e.release_id
      WHERE r.project_id = $1 AND e.id = $2
    `, [projectId, exportId]);
    return result.rows[0] ?? null;
  }

  async getEvidence(projectId: string, candidateId: string) {
    const result = await this.database.query<any>(`
      SELECT c.batch_id, c.episode_number, c.evidence FROM screen_text_candidates c
      JOIN screen_text_batches b ON b.id = c.batch_id
      WHERE b.project_id = $1 AND c.id = $2
    `, [projectId, candidateId]);
    return result.rows[0] ?? null;
  }

  private mapBatch(row: any, jobRows: any[], usageRows: any[]): ScreenTextBatch {
    const counts = {
      total: jobRows.length,
      queued: jobRows.filter((job) => ['not_started', 'queued'].includes(job.status)).length,
      running: jobRows.filter((job) => ['running', 'cancel_requested'].includes(job.status)).length,
      reviewPending: jobRows.filter((job) => job.status === 'review_pending').length,
      completed: jobRows.filter((job) => ['completed', 'confirmed_empty'].includes(job.status)).length,
      failed: jobRows.filter((job) => job.status === 'failed').length,
      cancelled: jobRows.filter((job) => job.status === 'cancelled').length,
      reconciliationRequired: jobRows.filter((job) => job.status === 'reconciliation_required').length,
    };
    return {
      id: row.id, projectId: row.project_id, requestId: row.request_id,
      scope: row.scope_kind === 'all' ? { kind: 'all' }
        : row.scope_kind === 'single' ? { kind: 'single', episodeNumber: row.episode_numbers[0] }
          : { kind: 'selected', episodeNumbers: row.episode_numbers },
      episodeNumbers: row.episode_numbers, termVersionId: row.term_version_id,
      termVersion: row.term_version, manifestId: row.manifest_id, manifestVersion: row.manifest_version,
      execution: {
        kind: row.execution_kind, adapter: row.adapter, provider: row.provider, model: row.model,
        language: row.language, deployment: row.deployment, inputVersion: row.input_version,
        outputVersion: row.output_version, configDigest: row.config_digest, capabilities: row.capabilities,
      },
      frameStrategyVersion: row.frame_strategy_version,
      dedupeStrategyVersion: row.dedupe_strategy_version,
      termProjection: row.term_projection,
      usage: {
        aggregation: usageRows.length > 1 ? 'split' : 'single',
        reconciliationStatus: usageRows.some((item) => item.pending) ? 'pending' : 'final',
        items: usageRows.map((item) => ({
          provider: item.provider, billingUnit: item.billing_unit,
          billingQuantity: Number(item.billing_quantity), currency: item.currency,
          estimatedAmount: String(item.estimated_amount), finalAmount: String(item.final_amount),
          reconciliationStatus: item.pending ? 'pending' : 'final', providerRequestId: null,
        })),
      },
      status: row.status, revision: row.revision,
      counts, jobs: jobRows.map((job) => this.mapJob(job)),
      createdAt: date(row.created_at), updatedAt: date(row.updated_at),
    };
  }

  private mapBatchSummary(row: any): ScreenTextBatchSummary {
    return {
      id: row.id, requestId: row.request_id,
      scope: row.scope_kind === 'all' ? { kind: 'all' }
        : row.scope_kind === 'single' ? { kind: 'single', episodeNumber: row.episode_numbers[0] }
          : { kind: 'selected', episodeNumbers: row.episode_numbers },
      episodeNumbers: row.episode_numbers, termVersionId: row.term_version_id,
      termVersion: row.term_version, manifestId: row.manifest_id, manifestVersion: row.manifest_version,
      status: row.status, revision: row.revision,
      counts: {
        total: number(row.job_total), queued: number(row.job_queued), running: number(row.job_running),
        reviewPending: number(row.job_review_pending), completed: number(row.job_completed),
        failed: number(row.job_failed), cancelled: number(row.job_cancelled),
        reconciliationRequired: number(row.job_reconciliation_required),
      },
      createdAt: date(row.created_at), updatedAt: date(row.updated_at),
    };
  }

  private mapRelease(row: any, exportRows: any[]): ScreenTextRelease {
    return {
      id: row.id, projectId: row.project_id, version: row.version, batchId: row.batch_id,
      termVersionId: row.term_version_id, manifestId: row.manifest_id,
      draftRevision: row.draft_revision, releaseDigest: row.release_digest,
      cueCount: row.cue_count,
      exports: exportRows.map((item) => ({
        id: item.id, episodeNumber: item.episode_number, filename: item.filename,
        sha256: item.sha256, sizeBytes: item.size_bytes,
        downloadPath: `/api/projects/${row.project_id}/screen-text/exports/${item.id}/download`,
      })),
      createdAt: date(row.created_at),
    };
  }

  private mapJob(row: any): ScreenTextEpisodeJob {
    return {
      id: row.id, episodeNumber: row.episode_number, assetId: row.asset_id,
      status: row.status, cancelRequested: row.cancel_requested,
      candidateCounts: {
        total: number(row.candidate_total), pending: number(row.candidate_pending),
        approved: number(row.candidate_approved), edited: number(row.candidate_edited),
        rejected: number(row.candidate_rejected),
      },
      stats: row.stats,
      latestAttempt: row.attempt_id ? {
        id: row.attempt_id, attemptNumber: row.attempt_number, status: row.attempt_status,
        execution: {
          kind: row.execution_kind, provider: row.provider, adapter: row.adapter, model: row.model,
          language: row.language, deployment: row.deployment, inputVersion: row.input_version,
          outputVersion: row.output_version, capabilities: row.capabilities, configDigest: row.config_digest,
        },
        inputDigest: row.input_digest, receipt: row.receipt, stats: row.attempt_stats,
        usage: row.usage, errorCode: row.error_code, errorDetail: row.error_detail,
        retryable: row.retryable, createdAt: date(row.attempt_created_at),
      } : null,
      updatedAt: date(row.updated_at),
    };
  }

  mapCandidate(row: any): ScreenTextCandidate {
    return {
      id: row.id, batchId: row.batch_id, jobId: row.job_id, episodeNumber: row.episode_number,
      source: row.source, rawText: row.raw_text, text: row.text,
      startMs: row.start_ms, endMs: row.end_ms, category: row.category, position: row.position,
      confidence: row.confidence === null ? null : Number(row.confidence), status: row.status,
      systemSuggestion: row.system_suggestion, suggestionReason: row.suggestion_reason,
      pairGroupId: row.pair_group_id,
      evidence: {
        evidenceDigest: row.evidence.checksum,
        width: row.evidence.width, height: row.evidence.height,
        capturedAtMs: row.evidence.capturedAtMs,
        previewPath: `/api/projects/${row.project_id}/screen-text/candidates/${row.id}/evidence`,
      },
      termHits: row.term_hits, revision: row.revision, updatedAt: date(row.updated_at),
    };
  }
}
