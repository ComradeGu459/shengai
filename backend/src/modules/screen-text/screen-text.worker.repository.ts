import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import type {
  ScreenTextAdapterDescriptor,
  ScreenTextAdapterOutcome,
  ScreenTextAdapterTermEntry,
} from './screen-text.adapter.js';
import { stableHash } from './screen-text.domain.js';
import { resolveScreenTextRuntimeConfig } from './screen-text-runtime-config.js';
import type { SystemControlRuntimeConfig } from '@qimao-terms-cloud/contracts';
import type { ScreenTextEvidenceStorage } from './screen-text.evidence-storage.js';
import type { BudgetUsageFacts } from '../system-control/system-control.budget.service.js';

export interface ScreenTextWorkerClaim {
  projectId: string;
  batchId: string;
  jobId: string;
  episodeNumber: number;
  attemptId: string;
  attemptNumber: number;
  deploymentVersionId: string;
  routingTargetId: string;
  routingTargetPriority: number;
  billingSnapshot: ScreenTextAdapterDescriptor['billing'];
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
  runtimeConfig?: SystemControlRuntimeConfig;
  runtimeConfigDigest?: string;
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
          j.current_attempt_id, current_attempt.provider_request_id AS attempt_provider_request_id,
          current_attempt.external_side_effect_possible AS attempt_external_side_effect_possible,
          b.execution_kind, b.provider, b.adapter, b.model, b.language,
          b.deployment, b.input_version, b.output_version, b.capabilities, b.config_digest,
          b.term_projection, b.term_projection_entries, b.frame_strategy_version, b.dedupe_strategy_version,
          b.runtime_config, b.runtime_config_digest,
          j.routing_version_id, j.route_digest, route.routing_target_id, route.priority AS routing_target_priority,
          route.deployment_version_id AS target_deployment_version_id,
          route.max_concurrent_jobs, route.per_project_max, route.queue_limit,
          route.target_execution_kind, route.target_adapter_kind, route.target_provider, route.target_adapter, route.target_model, route.target_language, route.target_deployment,
          route.target_config_digest, route.target_capabilities_snapshot,
          ba.asset_id, ba.object_key, ba.original_filename, ba.size_bytes,
          ba.checksum_algorithm, ba.checksum_value
        FROM screen_text_jobs j
        JOIN screen_text_batches b ON b.id=j.batch_id
        JOIN screen_text_batch_assets ba ON ba.batch_id=j.batch_id AND ba.episode_number=j.episode_number
        LEFT JOIN screen_text_attempts current_attempt ON current_attempt.id=j.current_attempt_id
        JOIN LATERAL (SELECT t.routing_target_id,t.priority,t.deployment_version_id,t.max_concurrent_jobs,t.per_project_max,t.queue_limit,d.execution_kind AS target_execution_kind,v.capabilities_snapshot->>'adapterKind' AS target_adapter_kind,d.provider AS target_provider,d.adapter_key AS target_adapter,v.model AS target_model,v.language AS target_language,v.capabilities_snapshot->>'deployment' AS target_deployment,v.config_digest AS target_config_digest,v.capabilities_snapshot AS target_capabilities_snapshot FROM routing_policy_targets t JOIN engine_deployment_versions v ON v.id=t.deployment_version_id JOIN engine_deployments d ON d.id=v.deployment_id WHERE t.routing_version_id=j.routing_version_id AND t.pool_id IN ('ocr_self_hosted_worker','ocr_api') AND t.priority = CASE WHEN j.current_attempt_id IS NOT NULL THEN (SELECT routing_target_priority FROM screen_text_attempts WHERE id=j.current_attempt_id) ELSE COALESCE((SELECT MAX(routing_target_priority) FROM screen_text_attempts WHERE job_id=j.id),0)+1 END ORDER BY t.priority LIMIT 1) route ON TRUE
        JOIN projects p ON p.id=j.project_id
        WHERE p.lifecycle_status='active' AND b.status <> 'stale' AND j.cancel_requested=false
          AND (j.status='queued' OR (j.status='running' AND current_attempt.lease_expires_at <= $1))
          AND (j.status <> 'queued' OR (
            (SELECT COUNT(*) FROM screen_text_attempts active_attempt
             WHERE active_attempt.routing_target_id=route.routing_target_id
               AND active_attempt.status IN ('running','leased')) < route.max_concurrent_jobs
            AND (SELECT COUNT(*) FROM screen_text_jobs queued_job
                 JOIN LATERAL (
                   SELECT target.routing_target_id
                     FROM routing_policy_targets target
                    WHERE target.routing_version_id=queued_job.routing_version_id
                      AND target.pool_id IN ('ocr_self_hosted_worker','ocr_api')
                      AND target.priority = CASE
                        WHEN queued_job.current_attempt_id IS NOT NULL THEN
                          (SELECT routing_target_priority FROM screen_text_attempts WHERE id=queued_job.current_attempt_id)
                        ELSE COALESCE((SELECT MAX(routing_target_priority) FROM screen_text_attempts WHERE job_id=queued_job.id),0)+1
                      END
                    ORDER BY target.priority
                    LIMIT 1
                 ) queued_target ON TRUE
                 WHERE queued_job.routing_version_id=j.routing_version_id
                   AND queued_job.status='queued'
                   AND queued_target.routing_target_id=route.routing_target_id
                   AND (queued_job.updated_at, queued_job.episode_number, queued_job.id)
                     < (j.updated_at, j.episode_number, j.id)) <= route.queue_limit
            AND (SELECT COUNT(*) FROM screen_text_attempts active_project_attempt
                 JOIN screen_text_jobs active_project_job ON active_project_job.id=active_project_attempt.job_id
                 WHERE active_project_job.project_id=j.project_id
                   AND active_project_attempt.routing_target_id=route.routing_target_id
                   AND active_project_attempt.status IN ('running','leased')) < route.per_project_max
          ))
        ORDER BY j.updated_at,j.episode_number,j.id
        FOR UPDATE OF j SKIP LOCKED LIMIT 1
      `, [input.now]);
      if (!selected.rowCount) return null;
      const row = selected.rows[0];
      if (!row.target_deployment || !row.target_adapter_kind) throw new Error('SCREEN_TEXT_ROUTING_DESCRIPTOR_IDENTITY_MISSING');
      if (!row.routing_version_id || !row.routing_target_id || !row.target_deployment_version_id || !row.route_digest) {
        throw new Error(`ScreenText Job 缺少不可变路由版本身份：${row.job_id}`);
      }
      const billingResult = await client.query<{ billing_snapshot: ScreenTextAdapterDescriptor['billing'] | null }>(
        'SELECT billing_snapshot FROM engine_deployment_versions WHERE id=$1 FOR SHARE', [row.target_deployment_version_id],
      );
      const billingSnapshot = billingResult.rows[0]?.billing_snapshot;
      if (!billingSnapshot) throw new Error('SYSTEM_CONTROL_BUDGET_BILLING_SNAPSHOT_MISSING');
      if (row.current_attempt_id && row.status === 'running') {
        const requiresReconciliation = Boolean(row.attempt_provider_request_id || row.attempt_external_side_effect_possible);
        await client.query(`UPDATE budget_reservations br SET status='released',reconciliation_status='final',settled_at=$2,updated_at=$2
          FROM screen_text_attempts a WHERE a.id=$1 AND br.id=a.budget_reservation_id AND br.status='reserved'
            AND a.provider_request_id IS NULL AND a.external_side_effect_possible=FALSE`, [row.current_attempt_id, input.now]);
        await client.query(`
        UPDATE screen_text_attempts SET status=$3::screen_text_attempt_status,effect_class=$4::varchar,error_code=$5,
          error_detail=$6,retryable=$7,completed_at=$2
        WHERE id=$1 AND status IN ('leased','running')
      `, [row.current_attempt_id, input.now,
        requiresReconciliation ? 'reconciliation_required' : 'failed',
        requiresReconciliation ? 'external_unknown' : 'external_not_accepted',
        requiresReconciliation ? 'SCREEN_TEXT_LEASE_EXPIRED_UNKNOWN_RESULT' : 'LEASE_EXPIRED',
        requiresReconciliation ? '运行中租约过期且外部结果未知，必须先对账。' : '租约过期，由新 Worker 接管。',
        !requiresReconciliation]);
        if (requiresReconciliation) {
          await client.query(`UPDATE screen_text_jobs SET status='reconciliation_required',updated_at=$2 WHERE id=$1`, [row.job_id, input.now]);
          await this.recomputeBatch(client, row.batch_id);
          await client.query('COMMIT');
          return null;
        }
      }
      const next = await client.query<{ attempt_number: number }>(`
        SELECT COALESCE(max(attempt_number),0)+1 AS attempt_number FROM screen_text_attempts WHERE job_id=$1
      `, [row.job_id]);
      const attemptNumber = next.rows[0]?.attempt_number;
      if (attemptNumber === undefined) throw new Error('SCREEN_TEXT_ATTEMPT_SEQUENCE_MISSING');
      const targetCapabilities = row.target_capabilities_snapshot?.capabilities;
      if (!targetCapabilities) throw new Error('SCREEN_TEXT_ROUTING_CAPABILITIES_MISSING');
      const targetDescriptorDigest = row.target_capabilities_snapshot?.descriptorDigest;
      if (typeof targetDescriptorDigest !== 'string' || !/^[0-9a-f]{64}$/.test(targetDescriptorDigest)) {
        throw new Error('SCREEN_TEXT_ROUTING_DESCRIPTOR_DIGEST_INVALID');
      }
      let runtimeConfig: SystemControlRuntimeConfig | undefined;
      if (row.runtime_config !== null && row.runtime_config !== undefined) {
        if (typeof row.runtime_config_digest !== 'string' || row.runtime_config_digest !== stableHash(row.runtime_config)) {
          throw new Error('SCREEN_TEXT_RUNTIME_CONFIG_DIGEST_INVALID');
        }
        const parsed = resolveScreenTextRuntimeConfig(row.adapter, row.runtime_config);
        if (!parsed) throw new Error('SCREEN_TEXT_RUNTIME_CONFIG_UNSUPPORTED');
        runtimeConfig = parsed as SystemControlRuntimeConfig;
      } else {
        const parsed = resolveScreenTextRuntimeConfig(row.adapter, undefined);
        if (parsed) runtimeConfig = parsed as SystemControlRuntimeConfig;
      }
      const runtimeConfigDigest = runtimeConfig ? stableHash(runtimeConfig) : undefined;
      const attempt = await client.query<{ id: string }>(`
        INSERT INTO screen_text_attempts (
          job_id,attempt_number,status,lease_owner,lease_expires_at,execution_kind,provider,adapter,
          model,language,deployment,input_version,output_version,capabilities,config_digest,runtime_config,runtime_config_digest,input_digest,
          routing_version_id,routing_target_id,routing_target_priority,deployment_version_id
        ) VALUES ($1,$2,'running',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING id
      `, [row.job_id, attemptNumber, input.workerId, input.leaseExpiresAt,
        row.target_adapter_kind, row.target_provider, row.target_adapter, row.target_model, row.target_language, row.target_deployment,
        row.input_version, row.output_version, targetCapabilities, targetDescriptorDigest, runtimeConfig, runtimeConfigDigest, stableHash({
          assetId: row.asset_id, checksumAlgorithm: row.checksum_algorithm,
          checksumValue: row.checksum_value, termProjectionDigest: row.term_projection.digest,
          frameStrategyVersion: row.frame_strategy_version, dedupeStrategyVersion: row.dedupe_strategy_version,
          configDigest: row.config_digest, runtimeConfigDigest,
        }), row.routing_version_id, row.routing_target_id, row.routing_target_priority, row.target_deployment_version_id]);
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
        deploymentVersionId: row.target_deployment_version_id,
        routingTargetId: row.routing_target_id,
        routingTargetPriority: Number(row.routing_target_priority),
        billingSnapshot,
        descriptor: {
          kind: row.target_adapter_kind, provider: row.target_provider, adapter: row.target_adapter, model: row.target_model,
          language: row.target_language, deployment: row.target_deployment, inputVersion: row.input_version,
          outputVersion: row.output_version, capabilities: targetCapabilities, configDigest: targetDescriptorDigest,
          billing: billingSnapshot,
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
        ...(runtimeConfig && runtimeConfigDigest ? { runtimeConfig, runtimeConfigDigest } : {}),
      };
    });
  }

  async finish(claim: ScreenTextWorkerClaim, outcome: ScreenTextAdapterOutcome, now: Date, budgetFacts?: BudgetUsageFacts) {
    const nativeCny = budgetFacts && !budgetFacts.conversionSnapshotId && budgetFacts.sourceCurrency === 'CNY';
    const persistedUsage = budgetFacts ? {
      ...outcome.usage,
      conversionSnapshotId: budgetFacts.conversionSnapshotId,
      rateDigest: budgetFacts.rateDigest,
      conversionEffectiveAt: budgetFacts.conversionEffectiveAt?.toISOString() ?? null,
      originalCurrency: budgetFacts.sourceCurrency,
      originalEstimatedAmount: outcome.usage.estimatedAmount,
      originalFinalAmount: outcome.usage.finalAmount,
      estimatedAmountCny: nativeCny ? outcome.usage.estimatedAmount : null,
      finalAmountCny: nativeCny ? outcome.usage.finalAmount : null,
    } : outcome.usage;
    await this.transaction(async (client) => {
      const owned = await client.query<any>(`
        SELECT j.cancel_requested,j.current_attempt_id,a.lease_owner,a.status
        FROM screen_text_jobs j JOIN screen_text_attempts a ON a.id=$2
        WHERE j.id=$1 FOR UPDATE OF j,a
      `, [claim.jobId, claim.attemptId]);
      if (!owned.rowCount || owned.rows[0].current_attempt_id !== claim.attemptId
        || owned.rows[0].lease_owner !== claim.leaseOwner || owned.rows[0].status !== 'running') return;
      if (owned.rows[0].cancel_requested) {
        const requiresReconciliation = outcome.effectClass === 'external_unknown'
          || (outcome.kind === 'failed' && outcome.externalSideEffectPossible);
        await client.query(`
          UPDATE screen_text_attempts SET status=$2::screen_text_attempt_status,effect_class=CASE WHEN $2::text='reconciliation_required' THEN 'external_unknown' ELSE 'cancelled' END,provider_request_id=$3,receipt=$4,
            stats=$5,usage=$6,error_code=$7,error_detail=$8,retryable=false,
            external_side_effect_possible=$9,completed_at=$10 WHERE id=$1
        `, [claim.attemptId, requiresReconciliation ? 'reconciliation_required' : 'cancelled',
          outcome.providerRequestId, outcome.receipt, outcome.stats, persistedUsage,
          outcome.kind === 'completed' ? null : outcome.errorCode,
          outcome.kind === 'completed' ? null : outcome.errorDetail,
          requiresReconciliation, now]);
        await client.query(`UPDATE screen_text_jobs SET status=$2::screen_text_job_status,stats=$3,updated_at=$4 WHERE id=$1`, [
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
          UPDATE screen_text_attempts SET status='completed',effect_class=$7,provider_request_id=$2,receipt=$3,
            stats=$4,usage=$5,completed_at=$6 WHERE id=$1
        `, [claim.attemptId, outcome.providerRequestId, outcome.receipt, outcome.stats, persistedUsage, now, outcome.effectClass]);
        await client.query(`
          UPDATE screen_text_jobs SET status='review_pending',video_duration_ms=$2,stats=$3,updated_at=$4
          WHERE id=$1
        `, [claim.jobId, outcome.videoDurationMs, outcome.stats, now]);
      } else if (outcome.kind === 'failed') {
        const canAdvance = outcome.effectClass === 'external_not_accepted' && !outcome.externalSideEffectPossible;
        await client.query(`
          UPDATE screen_text_attempts SET status='failed',effect_class=$10,provider_request_id=$2,receipt=$3,stats=$4,
            usage=$5,error_code=$6,error_detail=$7,retryable=$8,external_side_effect_possible=$9,
            completed_at=$11 WHERE id=$1
        `, [claim.attemptId, outcome.providerRequestId, outcome.receipt, outcome.stats, persistedUsage,
          outcome.errorCode, outcome.errorDetail, outcome.retryable, outcome.externalSideEffectPossible, outcome.effectClass, now]);
        const nextTarget = canAdvance
          ? await client.query<{ routing_target_id: string }>(`SELECT routing_target_id FROM routing_policy_targets WHERE routing_version_id=(SELECT routing_version_id FROM screen_text_jobs WHERE id=$1) AND pool_id IN ('ocr_self_hosted_worker','ocr_api') AND priority>$2 ORDER BY priority LIMIT 1`, [claim.jobId, claim.routingTargetPriority])
          : null;
        const advance = nextTarget?.rows[0]?.routing_target_id ?? null;
        if (advance) await client.query(`INSERT INTO routing_advance_events(job_id,attempt_id,from_target_id,to_target_id,classification,provider_request_id,request_id) VALUES($1,$2,$3,$4,'external_not_accepted',$5,$6)`, [claim.jobId, claim.attemptId, claim.routingTargetId, advance, outcome.providerRequestId, claim.jobId]);
        await client.query(`UPDATE screen_text_jobs SET status=$2,current_attempt_id=CASE WHEN $4 THEN NULL ELSE current_attempt_id END,stats=$3,updated_at=$5 WHERE id=$1`, [claim.jobId, advance ? 'queued' : 'failed', outcome.stats, Boolean(advance), now]);
      } else {
        await client.query(`
          UPDATE screen_text_attempts SET status='reconciliation_required',effect_class='external_unknown',provider_request_id=$2,
            receipt=$3,stats=$4,usage=$5,error_code=$6,error_detail=$7,retryable=false,
            external_side_effect_possible=true,completed_at=$8 WHERE id=$1
        `, [claim.attemptId, outcome.providerRequestId, outcome.receipt, outcome.stats, persistedUsage,
          outcome.errorCode, outcome.errorDetail, now]);
        await client.query(`UPDATE screen_text_jobs SET status='reconciliation_required',stats=$2,updated_at=$3 WHERE id=$1`, [claim.jobId, outcome.stats, now]);
      }
      await this.recomputeBatch(client, claim.batchId);
    });
  }

  async rejectBeforeExecution(claim: ScreenTextWorkerClaim, errorCode: string, errorDetail: string, now: Date) {
    await this.transaction(async (client) => {
      const owned = await client.query<any>(`SELECT j.current_attempt_id,a.lease_owner,a.status FROM screen_text_jobs j JOIN screen_text_attempts a ON a.id=$2 WHERE j.id=$1 FOR UPDATE OF j,a`, [claim.jobId, claim.attemptId]);
      if (!owned.rowCount || owned.rows[0].current_attempt_id !== claim.attemptId || owned.rows[0].lease_owner !== claim.leaseOwner || owned.rows[0].status !== 'running') return;
      await client.query(`UPDATE screen_text_attempts SET status='failed',effect_class='external_not_accepted',provider_request_id=NULL,error_code=$2,error_detail=$3,retryable=false,external_side_effect_possible=false,completed_at=$4 WHERE id=$1`, [claim.attemptId, errorCode, errorDetail, now]);
      await client.query(`UPDATE screen_text_jobs SET status='failed',updated_at=$2 WHERE id=$1`, [claim.jobId, now]);
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
