import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import type {
  ScreenTextAdapterDescriptor,
  ScreenTextAdapterOutcome,
  ScreenTextAdapterTermEntry,
} from './screen-text.adapter.js';
import { stableHash } from './screen-text.domain.js';
import type { ScreenTextEvidenceStorage } from './screen-text.evidence-storage.js';

export interface ScreenTextWorkerClaim {
  projectId: string;
  batchId: string;
  jobId: string;
  episodeNumber: number;
  attemptId: string;
  attemptNumber: number;
  leaseOwner: string;
  descriptor: ScreenTextAdapterDescriptor;
  asset: {
    assetId: string;
    objectKey: string;
    originalFilename: string;
    sizeBytes: number;
    checksumAlgorithm: string;
    checksumValue: string;
  };
  termProjectionDigest: string;
  termEntries: ScreenTextAdapterTermEntry[];
  frameStrategyVersion: string;
  dedupeStrategyVersion: string;
}

export class ScreenTextWorkerRepository {
  constructor(
    private readonly database: DatabasePool,
    private readonly evidenceStorage: ScreenTextEvidenceStorage,
  ) {}

  async claim(input: { workerId: string; now: Date; leaseExpiresAt: Date }): Promise<ScreenTextWorkerClaim | null> {
    return this.transaction(async (client) => {
      const selected = await client.query<any>(`
        SELECT j.id AS job_id, j.project_id, j.batch_id, j.episode_number, j.status,
          j.current_attempt_id, b.execution_kind, b.provider, b.adapter, b.model, b.language,
          b.deployment, b.input_version, b.output_version, b.capabilities, b.config_digest,
          b.term_projection, b.term_projection_entries, b.frame_strategy_version, b.dedupe_strategy_version,
          ba.asset_id, ba.object_key, ba.original_filename, ba.size_bytes,
          ba.checksum_algorithm, ba.checksum_value
        FROM screen_text_jobs j
        JOIN screen_text_batches b ON b.id=j.batch_id
        JOIN screen_text_batch_assets ba ON ba.batch_id=j.batch_id AND ba.episode_number=j.episode_number
        LEFT JOIN screen_text_attempts current_attempt ON current_attempt.id=j.current_attempt_id
        JOIN projects p ON p.id=j.project_id
        WHERE p.lifecycle_status='active' AND b.status <> 'stale' AND j.cancel_requested=false
          AND (j.status='queued' OR (j.status='running' AND current_attempt.lease_expires_at <= $1))
        ORDER BY j.updated_at,j.episode_number,j.id
        FOR UPDATE OF j SKIP LOCKED LIMIT 1
      `, [input.now]);
      if (!selected.rowCount) return null;
      const row = selected.rows[0];
      if (row.current_attempt_id) await client.query(`
        UPDATE screen_text_attempts SET status='failed',error_code='LEASE_EXPIRED',
          error_detail='租约过期，由新 Worker 接管。',retryable=true,completed_at=$2
        WHERE id=$1 AND status IN ('leased','running')
      `, [row.current_attempt_id, input.now]);
      const next = await client.query<{ attempt_number: number }>(`
        SELECT COALESCE(max(attempt_number),0)+1 AS attempt_number FROM screen_text_attempts WHERE job_id=$1
      `, [row.job_id]);
      const attemptNumber = next.rows[0]?.attempt_number;
      if (attemptNumber === undefined) throw new Error('SCREEN_TEXT_ATTEMPT_SEQUENCE_MISSING');
      const attempt = await client.query<{ id: string }>(`
        INSERT INTO screen_text_attempts (
          job_id,attempt_number,status,lease_owner,lease_expires_at,execution_kind,provider,adapter,
          model,language,deployment,input_version,output_version,capabilities,config_digest,input_digest
        ) VALUES ($1,$2,'running',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id
      `, [row.job_id, attemptNumber, input.workerId, input.leaseExpiresAt,
        row.execution_kind, row.provider, row.adapter, row.model, row.language, row.deployment,
        row.input_version, row.output_version, row.capabilities, row.config_digest, stableHash({
          assetId: row.asset_id, checksumAlgorithm: row.checksum_algorithm,
          checksumValue: row.checksum_value, termProjectionDigest: row.term_projection.digest,
          frameStrategyVersion: row.frame_strategy_version, dedupeStrategyVersion: row.dedupe_strategy_version,
          configDigest: row.config_digest,
        })]);
      const attemptId = attempt.rows[0]?.id;
      if (!attemptId) throw new Error('SCREEN_TEXT_ATTEMPT_CREATE_FAILED');
      await client.query(`
        UPDATE screen_text_jobs SET status='running',current_attempt_id=$2,updated_at=$3 WHERE id=$1
      `, [row.job_id, attemptId, input.now]);
      await this.recomputeBatch(client, row.batch_id);
      return {
        projectId: row.project_id, batchId: row.batch_id, jobId: row.job_id,
        episodeNumber: row.episode_number, attemptId,
        attemptNumber, leaseOwner: input.workerId,
        descriptor: {
          kind: row.execution_kind, provider: row.provider, adapter: row.adapter, model: row.model,
          language: row.language, deployment: row.deployment, inputVersion: row.input_version,
          outputVersion: row.output_version, capabilities: row.capabilities, configDigest: row.config_digest,
        },
        asset: {
          assetId: row.asset_id, objectKey: row.object_key, originalFilename: row.original_filename,
          sizeBytes: Number(row.size_bytes), checksumAlgorithm: row.checksum_algorithm,
          checksumValue: row.checksum_value,
        },
        termProjectionDigest: row.term_projection.digest,
        termEntries: row.term_projection_entries,
        frameStrategyVersion: row.frame_strategy_version,
        dedupeStrategyVersion: row.dedupe_strategy_version,
      };
    });
  }

  async finish(claim: ScreenTextWorkerClaim, outcome: ScreenTextAdapterOutcome, now: Date) {
    await this.transaction(async (client) => {
      const owned = await client.query<any>(`
        SELECT j.cancel_requested,j.current_attempt_id,a.lease_owner,a.status
        FROM screen_text_jobs j JOIN screen_text_attempts a ON a.id=$2
        WHERE j.id=$1 FOR UPDATE OF j,a
      `, [claim.jobId, claim.attemptId]);
      if (!owned.rowCount || owned.rows[0].current_attempt_id !== claim.attemptId
        || owned.rows[0].lease_owner !== claim.leaseOwner || owned.rows[0].status !== 'running') return;
      if (owned.rows[0].cancel_requested) {
        const requiresReconciliation = outcome.kind === 'reconciliation_required'
          || (outcome.kind === 'failed' && outcome.externalSideEffectPossible);
        await client.query(`
          UPDATE screen_text_attempts SET status=$2,provider_request_id=$3,receipt=$4,
            stats=$5,usage=$6,error_code=$7,error_detail=$8,retryable=false,
            external_side_effect_possible=$9,completed_at=$10 WHERE id=$1
        `, [claim.attemptId, requiresReconciliation ? 'reconciliation_required' : 'cancelled',
          outcome.providerRequestId, outcome.receipt, outcome.stats, outcome.usage,
          outcome.kind === 'completed' ? null : outcome.errorCode,
          outcome.kind === 'completed' ? null : outcome.errorDetail,
          requiresReconciliation, now]);
        await client.query(`UPDATE screen_text_jobs SET status=$2,stats=$3,updated_at=$4 WHERE id=$1`, [
          claim.jobId, requiresReconciliation ? 'reconciliation_required' : 'cancelled', outcome.stats, now,
        ]);
        await this.recomputeBatch(client, claim.batchId);
        return;
      }
      if (outcome.kind === 'completed') {
        const pairGroups = new Map<string, string>();
        for (const candidate of outcome.candidates) {
          const stored = await this.evidenceStorage.putObject(
            candidate.evidence.objectKey, candidate.evidence.bytes, candidate.evidence.contentType,
          );
          if (stored.checksum !== candidate.evidence.checksum
            || stored.sizeBytes !== candidate.evidence.sizeBytes) {
            throw new Error('SCREEN_TEXT_EVIDENCE_STORE_MISMATCH');
          }
          const pairGroupId = candidate.pairGroupKey
            ? pairGroups.get(candidate.pairGroupKey) ?? randomUUID() : null;
          if (candidate.pairGroupKey && pairGroupId) pairGroups.set(candidate.pairGroupKey, pairGroupId);
          const termHits = claim.termEntries.flatMap((entry) => {
            const matched = [entry.canonicalName, ...entry.aliases]
              .find((text) => candidate.rawText.includes(text));
            return matched ? [{
              termVersionItemId: entry.itemId, type: entry.type, canonicalName: entry.canonicalName,
              matchedText: matched, identityEvidence: entry.identityEvidence,
            }] : [];
          });
          const { bytes: _bytes, ...evidence } = candidate.evidence;
          await client.query(`
            INSERT INTO screen_text_candidates (
              batch_id,job_id,episode_number,source,raw_text,text,start_ms,end_ms,category,position,
              confidence,status,system_suggestion,suggestion_reason,pair_group_id,evidence,term_hits
            ) VALUES ($1,$2,$3,'ocr',$4,$4,$5,$6,$7,$8,$9,'pending',$10,$11,$12,$13,$14)
          `, [claim.batchId, claim.jobId, claim.episodeNumber, candidate.rawText,
            candidate.startMs, candidate.endMs, candidate.category, candidate.position,
            candidate.confidence, candidate.systemSuggestion, candidate.suggestionReason,
            pairGroupId, evidence, JSON.stringify(termHits)]);
        }
        await client.query(`
          UPDATE screen_text_attempts SET status='completed',provider_request_id=$2,receipt=$3,
            stats=$4,usage=$5,completed_at=$6 WHERE id=$1
        `, [claim.attemptId, outcome.providerRequestId, outcome.receipt, outcome.stats, outcome.usage, now]);
        await client.query(`
          UPDATE screen_text_jobs SET status='review_pending',video_duration_ms=$2,stats=$3,updated_at=$4
          WHERE id=$1
        `, [claim.jobId, outcome.videoDurationMs, outcome.stats, now]);
      } else if (outcome.kind === 'failed') {
        await client.query(`
          UPDATE screen_text_attempts SET status='failed',provider_request_id=$2,receipt=$3,stats=$4,
            usage=$5,error_code=$6,error_detail=$7,retryable=$8,external_side_effect_possible=$9,
            completed_at=$10 WHERE id=$1
        `, [claim.attemptId, outcome.providerRequestId, outcome.receipt, outcome.stats, outcome.usage,
          outcome.errorCode, outcome.errorDetail, outcome.retryable, outcome.externalSideEffectPossible, now]);
        await client.query(`UPDATE screen_text_jobs SET status='failed',stats=$2,updated_at=$3 WHERE id=$1`, [claim.jobId, outcome.stats, now]);
      } else {
        await client.query(`
          UPDATE screen_text_attempts SET status='reconciliation_required',provider_request_id=$2,
            receipt=$3,stats=$4,usage=$5,error_code=$6,error_detail=$7,retryable=false,
            external_side_effect_possible=true,completed_at=$8 WHERE id=$1
        `, [claim.attemptId, outcome.providerRequestId, outcome.receipt, outcome.stats, outcome.usage,
          outcome.errorCode, outcome.errorDetail, now]);
        await client.query(`UPDATE screen_text_jobs SET status='reconciliation_required',stats=$2,updated_at=$3 WHERE id=$1`, [claim.jobId, outcome.stats, now]);
      }
      await this.recomputeBatch(client, claim.batchId);
    });
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

  private recomputeBatch(client: PoolClient, batchId: string) {
    return client.query(`
      UPDATE screen_text_batches b SET status=summary.status,updated_at=CURRENT_TIMESTAMP
      FROM (SELECT batch_id,CASE
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
      FROM screen_text_jobs WHERE batch_id=$1 GROUP BY batch_id) summary WHERE b.id=summary.batch_id
    `, [batchId]);
  }
}
