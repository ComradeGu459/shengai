import type { AsrUsage } from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import type { AsrAdapterDescriptor, AsrAdapterOutcome } from './asr-adapter.js';
import type { BudgetUsageFacts } from '../system-control/system-control.budget.service.js';
import { refreshAsrBatchStatus } from './asr-command.repository.js';
import {
  applyAsrHotwordCapabilities,
  buildHotwordProjection,
  type HotwordProjection,
} from './asr-hotwords.js';
import type { AsrSchedulingPolicy } from './asr-scheduling-policy.js';

interface ClaimRow extends QueryResultRow {
  id: string;
  batch_id: string;
  project_id: string;
  episode_number: number;
  asset_id: string;
  asset_original_filename: string;
  asset_checksum_algorithm: string;
  asset_checksum_value: string;
  asset_object_key: string;
  asset_source_original_filename: string;
  asset_media_kind: string;
  asset_size_bytes: string;
  source_asset_checksum_algorithm: string;
  source_asset_checksum_value: string;
  term_version_id: string | null;
  config_digest: string;
  hotword_digest: string;
  current_attempt_id: string | null;
  current_result_id: string | null;
  lifecycle_status: string;
  retry_of_batch_id: string | null;
  batch_provider: string;
  batch_adapter: string;
  batch_model: string;
  batch_language: string;
  hotword_term_count: number;
  hotword_alias_count: number;
  hotword_filtered_count: number;
  hotword_truncated_count: number;
  hotword_projection_version: string;
  hotword_max_entries: number | null;
  hotword_max_characters: number | null;
  hotword_supported: boolean;
  status: string;
  routing_version_id: string | null;
  route_digest: string | null;
  routing_target_id: string;
  routing_target_priority: number;
  target_deployment_version_id: string;
  target_provider: string;
  target_adapter: string;
  target_model: string;
  target_language: string;
  target_config_digest: string;
  target_capabilities_snapshot: any;
  deployment_version_id: string | null;
  attempt_provider_request_id: string | null;
  attempt_external_side_effect_possible: boolean | null;
  billing_snapshot: AsrAdapterDescriptor['billing'] | null;
}

export const resolveAsrAdapterDescriptorDigest = (capabilitiesSnapshot: unknown): string => {
  const digest = (capabilitiesSnapshot as { descriptorDigest?: unknown } | null)?.descriptorDigest;
  if (typeof digest !== 'string' || !/^[0-9a-f]{64}$/u.test(digest)) {
    throw new Error('ASR_ROUTING_TARGET_DESCRIPTOR_DIGEST_MISSING');
  }
  return digest;
};

export interface AsrWorkerClaim {
  jobId: string;
  batchId: string;
  projectId: string;
  episodeNumber: number;
  assetId: string;
  asset: {
    assetId: string;
    objectKey: string;
    originalFilename: string;
    mediaKind: 'video';
    sizeBytes: number;
    checksum: { algorithm: string; value: string };
  };
  adapterDescriptor: AsrAdapterDescriptor;
  termVersionId: string | null;
  configDigest: string;
  hotwordDigest: string;
  attemptId: string;
  attemptNumber: number;
  providerRequestId: string | null;
  deploymentVersionId: string;
  routingTargetId: string;
  routingTargetPriority: number;
  billingSnapshot: AsrAdapterDescriptor['billing'];
  retryOfBatchId: string | null;
  hasPreviousResult: boolean;
  hotwords: HotwordProjection;
  leaseOwner: string;
}

const recordUsage = async (
  client: PoolClient,
  attemptId: string,
  usage: AsrUsage,
  budgetFacts?: BudgetUsageFacts,
) => {
  const cnyNative = budgetFacts && !budgetFacts.conversionSnapshotId && budgetFacts.sourceCurrency === 'CNY';
  await client.query(
    `INSERT INTO asr_usage
       (attempt_id, provider, media_duration_ms, billing_unit, billing_quantity,
        currency, estimated_amount, final_amount, reconciliation_status, provider_request_id,
        conversion_snapshot_id, rate_digest, conversion_effective_at, original_currency,
        original_estimated_amount, original_final_amount, estimated_amount_cny, final_amount_cny)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::numeric,$16::numeric,$17::numeric,$18::numeric)
     ON CONFLICT (attempt_id) DO NOTHING`,
    [attemptId, usage.provider, usage.mediaDurationMs, usage.billingUnit,
      usage.billingQuantity, usage.currency, usage.estimatedAmount, usage.finalAmount,
      usage.reconciliationStatus, usage.providerRequestId,
      budgetFacts?.conversionSnapshotId ?? null, budgetFacts?.rateDigest ?? null,
      budgetFacts?.conversionEffectiveAt ?? null, budgetFacts?.sourceCurrency ?? usage.currency,
      usage.estimatedAmount, usage.finalAmount,
      cnyNative ? usage.estimatedAmount : null, cnyNative ? usage.finalAmount : null],
  );
};

const internalUsage = (
  provider: string,
  providerRequestId: string | null,
  reconciliationStatus: 'final' | 'pending',
): AsrUsage => ({
  provider,
  mediaDurationMs: 0,
  billingUnit: 'not_executed',
  billingQuantity: 0,
  currency: 'CNY',
  estimatedAmount: '0',
  finalAmount: '0',
  reconciliationStatus,
  providerRequestId,
});

const assertHotwordReceiptFacts = (claim: AsrWorkerClaim, outcome: AsrAdapterOutcome) => {
  const facts = outcome.hotwordReceiptFacts;
  const payloadCount = claim.hotwords.words.length;
  if (outcome.hotwordReceipt === 'unknown') {
    if (facts.submittedCount !== null || facts.omittedCount !== null || facts.reasonCode !== 'unknown') {
      throw new Error('ASR 适配器 unknown 热词回执不得推断提交数量。');
    }
    return;
  }
  if (outcome.hotwordReceipt === 'unused') {
    if (facts.submittedCount !== 0 || facts.omittedCount !== 0 || facts.reasonCode !== 'no_confirmed_term_version' || payloadCount !== 0) {
      throw new Error('ASR 适配器 unused 热词回执必须明确无 confirmed TermVersion 且没有提交。');
    }
    return;
  }
  if (facts.submittedCount === null || facts.omittedCount === null
    || facts.submittedCount + facts.omittedCount !== payloadCount) {
    throw new Error('ASR 适配器热词回执数量与实际 payload 不一致。');
  }
  if (outcome.hotwordReceipt === 'partially_submitted') {
    if (facts.omittedCount === 0 || facts.reasonCode !== 'partial_submission') {
      throw new Error('ASR 适配器部分提交必须返回省略数量和稳定原因。');
    }
  } else if (outcome.hotwordReceipt === 'unsupported') {
    if (facts.submittedCount !== 0 || facts.reasonCode !== 'unsupported') {
      throw new Error('ASR 适配器不支持热词时必须明确本次没有应用热词。');
    }
  } else if (facts.omittedCount !== 0 || facts.reasonCode !== null) {
    throw new Error('ASR 适配器完整热词回执不能包含省略事实。');
  }
};

export class AsrWorkerRepository {
  constructor(private readonly pool: DatabasePool) {}

  async claim(input: {
    workerId: string;
    now: Date;
    leaseExpiresAt: Date;
    policy: Readonly<AsrSchedulingPolicy>;
  }): Promise<AsrWorkerClaim | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['asr-scheduler']);
      const expired = await client.query<ClaimRow>(
        `SELECT job.*, project.lifecycle_status, batch.retry_of_batch_id,
                batch.provider AS batch_provider, batch.adapter AS batch_adapter,
                batch.model AS batch_model, batch.language AS batch_language,
                batch.hotword_term_count, batch.hotword_alias_count,
                batch.hotword_filtered_count, batch.hotword_truncated_count,
                batch.hotword_projection_version, batch.hotword_max_entries,
                batch.hotword_max_characters, batch.hotword_supported,
                asset.object_key AS asset_object_key,
                asset.original_filename AS asset_source_original_filename,
                asset.media_kind AS asset_media_kind, asset.size_bytes AS asset_size_bytes,
                asset.checksum_algorithm AS source_asset_checksum_algorithm,
                asset.checksum_value AS source_asset_checksum_value,
                attempt.provider_request_id AS attempt_provider_request_id,
                attempt.external_side_effect_possible AS attempt_external_side_effect_possible,
                route.routing_target_id, route.priority AS routing_target_priority,
                route.max_concurrent_jobs, route.per_project_max, route.queue_limit,
                route.deployment_version_id AS target_deployment_version_id,
                route.target_provider, route.target_adapter, route.target_model, route.target_language,
                route.target_config_digest, route.target_capabilities_snapshot
           FROM asr_jobs job
           JOIN asr_batches batch ON batch.id = job.batch_id
           JOIN projects project ON project.id = job.project_id
           JOIN assets asset ON asset.id = job.asset_id
          LEFT JOIN asr_attempts attempt ON attempt.id = job.current_attempt_id
          JOIN LATERAL (SELECT t.routing_target_id,t.priority,t.deployment_version_id,t.max_concurrent_jobs,t.per_project_max,t.queue_limit,d.provider AS target_provider,d.adapter_key AS target_adapter,v.model AS target_model,v.language AS target_language,v.config_digest AS target_config_digest,v.capabilities_snapshot AS target_capabilities_snapshot FROM routing_policy_targets t JOIN engine_deployment_versions v ON v.id=t.deployment_version_id JOIN engine_deployments d ON d.id=v.deployment_id WHERE t.routing_version_id=job.routing_version_id AND t.pool_id='asr_api' AND t.priority = CASE WHEN job.current_attempt_id IS NOT NULL THEN (SELECT routing_target_priority FROM asr_attempts WHERE id=job.current_attempt_id) ELSE COALESCE((SELECT MAX(routing_target_priority) FROM asr_attempts WHERE job_id=job.id),0)+1 END ORDER BY t.priority LIMIT 1) route ON TRUE
          WHERE job.status IN ('leased','running','cancel_requested')
            AND attempt.lease_expires_at <= $1
          ORDER BY attempt.lease_expires_at, batch.created_at, job.episode_number, job.id
          LIMIT 1
          FOR UPDATE OF job SKIP LOCKED`,
        [input.now],
      );
      let job = expired.rows[0];
      if (!job) {
        const queued = await client.query<ClaimRow>(
          `SELECT job.*, project.lifecycle_status, batch.retry_of_batch_id,
                  batch.provider AS batch_provider, batch.adapter AS batch_adapter,
                  batch.model AS batch_model, batch.language AS batch_language,
                  batch.hotword_term_count, batch.hotword_alias_count,
                  batch.hotword_filtered_count, batch.hotword_truncated_count,
                  batch.hotword_projection_version, batch.hotword_max_entries,
                  batch.hotword_max_characters, batch.hotword_supported,
                  asset.object_key AS asset_object_key,
                  asset.original_filename AS asset_source_original_filename,
                  asset.media_kind AS asset_media_kind, asset.size_bytes AS asset_size_bytes,
                  asset.checksum_algorithm AS source_asset_checksum_algorithm,
                  asset.checksum_value AS source_asset_checksum_value,
                  NULL::varchar AS attempt_provider_request_id,
                  NULL::boolean AS attempt_external_side_effect_possible,
                  route.routing_target_id, route.priority AS routing_target_priority,
                  route.max_concurrent_jobs, route.per_project_max, route.queue_limit,
                  route.deployment_version_id AS target_deployment_version_id,
                  route.target_provider, route.target_adapter, route.target_model, route.target_language,
                  route.target_config_digest, route.target_capabilities_snapshot
             FROM asr_jobs job
             JOIN asr_batches batch ON batch.id = job.batch_id
             JOIN projects project ON project.id = job.project_id
             JOIN assets asset ON asset.id = job.asset_id
             LEFT JOIN asr_project_scheduling scheduling ON scheduling.project_id = job.project_id
             JOIN LATERAL (SELECT t.routing_target_id,t.priority,t.deployment_version_id,t.max_concurrent_jobs,t.per_project_max,t.queue_limit,d.provider AS target_provider,d.adapter_key AS target_adapter,v.model AS target_model,v.language AS target_language,v.config_digest AS target_config_digest,v.capabilities_snapshot AS target_capabilities_snapshot FROM routing_policy_targets t JOIN engine_deployment_versions v ON v.id=t.deployment_version_id JOIN engine_deployments d ON d.id=v.deployment_id WHERE t.routing_version_id=job.routing_version_id AND t.pool_id='asr_api' AND t.priority = COALESCE((SELECT MAX(routing_target_priority) FROM asr_attempts WHERE job_id=job.id),0)+1 ORDER BY t.priority LIMIT 1) route ON TRUE
            WHERE job.status = 'queued'
              AND (SELECT COUNT(*) FROM asr_attempts active_attempt
                   WHERE active_attempt.routing_target_id=route.routing_target_id
                     AND active_attempt.status IN ('leased','running')) < route.max_concurrent_jobs
              AND (SELECT COUNT(*) FROM asr_jobs queued_job
                   JOIN asr_batches queued_batch ON queued_batch.id = queued_job.batch_id
                   LEFT JOIN asr_project_scheduling queued_scheduling ON queued_scheduling.project_id = queued_job.project_id
                   JOIN LATERAL (
                     SELECT target.routing_target_id
                       FROM routing_policy_targets target
                      WHERE target.routing_version_id=queued_job.routing_version_id
                        AND target.pool_id='asr_api'
                        AND target.priority = CASE
                          WHEN queued_job.current_attempt_id IS NOT NULL THEN
                            (SELECT routing_target_priority FROM asr_attempts WHERE id=queued_job.current_attempt_id)
                          ELSE COALESCE((SELECT MAX(routing_target_priority) FROM asr_attempts WHERE job_id=queued_job.id),0)+1
                        END
                      ORDER BY target.priority
                      LIMIT 1
                   ) queued_target ON TRUE
                   WHERE queued_job.routing_version_id=job.routing_version_id
                     AND queued_job.status='queued'
                     AND queued_target.routing_target_id=route.routing_target_id
                     AND (
                       (CASE WHEN queued_scheduling.last_claim_sequence IS NULL THEN 0 ELSE 1 END,
                        COALESCE(queued_scheduling.last_claim_sequence, 0), queued_batch.created_at,
                        queued_job.episode_number, queued_job.id)
                       <
                       (CASE WHEN scheduling.last_claim_sequence IS NULL THEN 0 ELSE 1 END,
                        COALESCE(scheduling.last_claim_sequence, 0), batch.created_at,
                        job.episode_number, job.id)
                     )) <= route.queue_limit
              AND (SELECT COUNT(*) FROM asr_attempts active_project_attempt
                   JOIN asr_jobs active_project_job ON active_project_job.id=active_project_attempt.job_id
                   WHERE active_project_job.project_id=job.project_id
                     AND active_project_attempt.routing_target_id=route.routing_target_id
                     AND active_project_attempt.status IN ('leased','running')) < route.per_project_max
            ORDER BY scheduling.last_claim_sequence ASC NULLS FIRST,
                     batch.created_at, job.episode_number, job.id
            LIMIT 1
            FOR UPDATE OF job SKIP LOCKED`,
          [],
        );
        job = queued.rows[0];
      }
      if (!job) {
        await client.query('COMMIT');
        return null;
      }
      if (job.status === 'cancel_requested') {
        const needsReconciliation = Boolean(
          job.attempt_provider_request_id || job.attempt_external_side_effect_possible,
        );
        await client.query(
          `UPDATE asr_attempts SET status = $2, effect_class = CASE WHEN $2='reconciliation_required' THEN 'external_unknown' ELSE 'cancelled' END, completed_at = $3,
                  error_code = $4, error_detail = $5, retryable = FALSE
            WHERE id = $1`,
          [job.current_attempt_id, needsReconciliation ? 'reconciliation_required' : 'cancelled', input.now,
            needsReconciliation ? 'ASR_CANCEL_REQUIRES_RECONCILIATION' : 'ASR_CANCELLED',
            needsReconciliation ? '取消时外部结果仍未知，必须先对账。' : '用户取消且未产生外部副作用。'],
        );
        await recordUsage(
          client,
          job.current_attempt_id!,
          internalUsage(
            job.batch_provider,
            job.attempt_provider_request_id,
            needsReconciliation ? 'pending' : 'final',
          ),
        );
        await client.query(
          `UPDATE asr_jobs SET status = $2, cancel_requested = FALSE, updated_at = $3 WHERE id = $1`,
          [job.id, needsReconciliation ? 'reconciliation_required' : 'cancelled', input.now],
        );
        await refreshAsrBatchStatus(client, job.batch_id);
        await client.query('COMMIT');
        return null;
      }
      if (job.status === 'running'
        && (job.attempt_provider_request_id || job.attempt_external_side_effect_possible)) {
        await client.query(
          `UPDATE asr_attempts SET status = 'reconciliation_required', effect_class = 'external_unknown', completed_at = $2,
                  error_code = 'ASR_LEASE_EXPIRED_UNKNOWN_RESULT',
                  error_detail = '运行中租约过期且外部结果未知，必须先对账。', retryable = FALSE
            WHERE id = $1`,
          [job.current_attempt_id, input.now],
        );
        await recordUsage(
          client,
          job.current_attempt_id!,
          internalUsage(job.batch_provider, job.attempt_provider_request_id, 'pending'),
        );
        await client.query(
          `UPDATE asr_jobs SET status = 'reconciliation_required', updated_at = $2 WHERE id = $1`,
          [job.id, input.now],
        );
        await refreshAsrBatchStatus(client, job.batch_id);
        await client.query('COMMIT');
        return null;
      }
      if (job.lifecycle_status !== 'active') {
        if (job.current_attempt_id) {
          await client.query(`UPDATE budget_reservations br SET status='released',reconciliation_status='final',settled_at=$2,updated_at=$2
            FROM asr_attempts a WHERE a.id=$1 AND br.id=a.budget_reservation_id AND br.status='reserved'
              AND a.provider_request_id IS NULL AND a.external_side_effect_possible=FALSE`, [job.current_attempt_id, input.now]);
          await client.query(
            `UPDATE asr_attempts SET status = 'cancelled', effect_class = 'cancelled', completed_at = $2,
                    error_code = 'ASR_PROJECT_NOT_ACTIVE', error_detail = '项目已进入回收流程。', retryable = FALSE
              WHERE id = $1`,
            [job.current_attempt_id, input.now],
          );
          await recordUsage(client, job.current_attempt_id, internalUsage(job.batch_provider, null, 'final'));
        }
        await client.query(
          `UPDATE asr_jobs SET status = 'cancelled', cancel_requested = TRUE, updated_at = $2 WHERE id = $1`,
          [job.id, input.now],
        );
        await refreshAsrBatchStatus(client, job.batch_id);
        await client.query('COMMIT');
        return null;
      }
      if (job.current_attempt_id) {
        await client.query(`UPDATE budget_reservations br SET status='released',reconciliation_status='final',settled_at=$2,updated_at=$2
          FROM asr_attempts a WHERE a.id=$1 AND br.id=a.budget_reservation_id AND br.status='reserved'
            AND a.provider_request_id IS NULL AND a.external_side_effect_possible=FALSE`, [job.current_attempt_id, input.now]);
        await client.query(
          `UPDATE asr_attempts SET status = 'failed', effect_class = 'external_not_accepted', completed_at = $2,
                  error_code = 'ASR_LEASE_EXPIRED', error_detail = 'Worker 租约过期，任务由新 Worker 接管。',
                  retryable = TRUE, external_side_effect_possible = FALSE
            WHERE id = $1 AND status IN ('leased','running')`,
          [job.current_attempt_id, input.now],
        );
        await recordUsage(client, job.current_attempt_id, internalUsage(job.batch_provider, null, 'final'));
      }
      if (job.asset_media_kind !== 'video'
        || job.asset_source_original_filename !== job.asset_original_filename
        || job.source_asset_checksum_algorithm !== job.asset_checksum_algorithm
        || job.source_asset_checksum_value !== job.asset_checksum_value) {
        throw new Error(`ASR Job 的不可变 Asset 快照不匹配：${job.id}`);
      }
      if (!job.routing_version_id || !job.route_digest || !job.routing_target_id || !job.target_deployment_version_id) {
        throw new Error(`ASR Job 缺少不可变路由版本身份：${job.id}`);
      }
      const billingResult = await client.query<{ billing_snapshot: AsrAdapterDescriptor['billing'] | null }>(
        'SELECT billing_snapshot FROM engine_deployment_versions WHERE id=$1 FOR SHARE', [job.target_deployment_version_id],
      );
      const billingSnapshot = billingResult.rows[0]?.billing_snapshot;
      if (!billingSnapshot) throw new Error('SYSTEM_CONTROL_BUDGET_BILLING_SNAPSHOT_MISSING');
      const descriptorDigest = resolveAsrAdapterDescriptorDigest(job.target_capabilities_snapshot);
      const adapterDescriptor: AsrAdapterDescriptor = {
        provider: job.target_provider,
        adapter: job.target_adapter,
        model: job.target_model,
        language: job.target_language,
        configDigest: descriptorDigest,
        hotwordCapabilities: job.target_capabilities_snapshot?.capabilities?.hotword,
        billing: billingSnapshot,
      };
      if (!adapterDescriptor.hotwordCapabilities || typeof adapterDescriptor.hotwordCapabilities.supported !== 'boolean') throw new Error('ASR_ROUTING_TARGET_CAPABILITIES_MISSING');
      const hotwords = applyAsrHotwordCapabilities(
        await buildHotwordProjection(client, job.term_version_id),
        adapterDescriptor,
        job.hotword_projection_version,
      );
      if (hotwords.summary.digest !== job.hotword_digest
        || hotwords.summary.projectionVersion !== job.hotword_projection_version) {
        throw new Error(`ASR Job 的热词投影摘要不匹配：${job.id}`);
      }
      const next = await client.query<{ attempt_number: number }>(
        `SELECT COALESCE(MAX(attempt_number), 0)::integer + 1 AS attempt_number
           FROM asr_attempts WHERE job_id = $1`,
        [job.id],
      );
      const attempt = await client.query<{ id: string }>(
        `INSERT INTO asr_attempts
           (job_id, attempt_number, status, lease_owner, lease_expires_at, routing_version_id, routing_target_id, routing_target_priority, deployment_version_id)
         VALUES ($1,$2,'leased',$3,$4,$5,$6,$7,$8) RETURNING id`,
        [job.id, next.rows[0]!.attempt_number, input.workerId, input.leaseExpiresAt, job.routing_version_id, job.routing_target_id, job.routing_target_priority, job.target_deployment_version_id],
      );
      if (job.status === 'queued') {
        await client.query(
          `INSERT INTO asr_project_scheduling (project_id, last_claim_sequence, updated_at)
           VALUES ($1,nextval('asr_project_claim_sequence'),$2)
           ON CONFLICT (project_id) DO UPDATE
             SET last_claim_sequence = EXCLUDED.last_claim_sequence,
                 updated_at = EXCLUDED.updated_at`,
          [job.project_id, input.now],
        );
      }
      await client.query(
        `UPDATE asr_jobs SET status = 'leased', current_attempt_id = $2, updated_at = $3 WHERE id = $1`,
        [job.id, attempt.rows[0]!.id, input.now],
      );
      await refreshAsrBatchStatus(client, job.batch_id);
      await client.query('COMMIT');
      return {
        jobId: job.id,
        batchId: job.batch_id,
        projectId: job.project_id,
        episodeNumber: job.episode_number,
        assetId: job.asset_id,
        asset: {
          assetId: job.asset_id,
          objectKey: job.asset_object_key,
          originalFilename: job.asset_source_original_filename,
          mediaKind: 'video',
          sizeBytes: Number(job.asset_size_bytes),
          checksum: {
            algorithm: job.source_asset_checksum_algorithm,
            value: job.source_asset_checksum_value,
          },
        },
        adapterDescriptor,
        termVersionId: job.term_version_id,
        configDigest: job.target_config_digest,
        hotwordDigest: job.hotword_digest,
        attemptId: attempt.rows[0]!.id,
        attemptNumber: next.rows[0]!.attempt_number,
        providerRequestId: job.attempt_provider_request_id,
        deploymentVersionId: job.target_deployment_version_id,
        routingTargetId: job.routing_target_id,
        routingTargetPriority: Number(job.routing_target_priority),
        billingSnapshot,
        retryOfBatchId: job.retry_of_batch_id,
        hasPreviousResult: job.current_result_id !== null,
        hotwords,
        leaseOwner: input.workerId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async start(claim: AsrWorkerClaim, now: Date) {
    const result = await this.pool.query(
      `UPDATE asr_attempts attempt
          SET status = 'running', started_at = $3
         FROM asr_jobs job
        WHERE attempt.id = $1 AND attempt.lease_owner = $2 AND attempt.status = 'leased'
          AND job.id = attempt.job_id AND job.current_attempt_id = attempt.id AND job.status = 'leased'`,
      [claim.attemptId, claim.leaseOwner, now],
    );
    if (result.rowCount !== 1) return false;
    await this.pool.query(
      `UPDATE asr_jobs SET status = 'running', updated_at = $2
        WHERE id = $1 AND current_attempt_id = $3 AND status = 'leased'`,
      [claim.jobId, now, claim.attemptId],
    );
    return true;
  }

  async recordHotwordPayload(claim: AsrWorkerClaim) {
    const characterCount = claim.hotwords.words.reduce((total, word) => total + word.length, 0);
    const result = await this.pool.query(
      `UPDATE asr_attempts
          SET hotword_projection_version = $3, hotword_payload_digest = $4,
              hotword_payload_count = $5, hotword_payload_character_count = $6,
              hotword_receipt_status = 'unknown', hotword_submitted_count = NULL,
              hotword_omitted_count = NULL, hotword_receipt_reason_code = 'unknown'
        WHERE id = $1 AND lease_owner = $2 AND status = 'running'`,
      [claim.attemptId, claim.leaseOwner, claim.hotwords.summary.projectionVersion,
        claim.hotwords.summary.digest, claim.hotwords.words.length, characterCount],
    );
    return result.rowCount === 1;
  }

  async rejectBeforeExecution(claim: AsrWorkerClaim, errorCode: string, errorDetail: string, now: Date) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const owned = await client.query(`SELECT 1 FROM asr_jobs WHERE id=$1 AND current_attempt_id=$2 FOR UPDATE`, [claim.jobId, claim.attemptId]);
      if (!owned.rows[0]) { await client.query('ROLLBACK'); return false; }
      await client.query(`UPDATE asr_attempts SET status='failed',effect_class='external_not_accepted',provider_request_id=NULL,error_code=$3,error_detail=$4,retryable=false,external_side_effect_possible=false,completed_at=$5 WHERE id=$1 AND lease_owner=$2 AND status='running'`, [claim.attemptId, claim.leaseOwner, errorCode, errorDetail, now]);
      await client.query(`UPDATE asr_jobs SET status='failed',cancel_requested=false,updated_at=$2 WHERE id=$1 AND current_attempt_id=$3`, [claim.jobId, now, claim.attemptId]);
      await refreshAsrBatchStatus(client, claim.batchId);
      await client.query('COMMIT');
      return true;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async finish(claim: AsrWorkerClaim, outcome: AsrAdapterOutcome, now: Date, budgetFacts?: BudgetUsageFacts) {
    assertHotwordReceiptFacts(claim, outcome);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query<{ status: string; current_result_id: string | null; cancel_requested: boolean }>(
        `SELECT status, current_result_id, cancel_requested FROM asr_jobs
          WHERE id = $1 AND current_attempt_id = $2 FOR UPDATE`,
        [claim.jobId, claim.attemptId],
      );
      if (!locked.rows[0]) {
        await client.query('ROLLBACK');
        return false;
      }
      const attempt = await client.query(
        `SELECT id FROM asr_attempts
          WHERE id = $1 AND lease_owner = $2 AND status = 'running' FOR UPDATE`,
        [claim.attemptId, claim.leaseOwner],
      );
      if (!attempt.rows[0]) {
        await client.query('ROLLBACK');
        return false;
      }
      if (outcome.kind === 'completed') {
        const next = await client.query<{ revision: number }>(
          `SELECT COALESCE(MAX(revision), 0)::integer + 1 AS revision
             FROM asr_results WHERE project_id = $1 AND episode_number = $2`,
          [claim.projectId, claim.episodeNumber],
        );
        const result = await client.query<{ id: string }>(
          `INSERT INTO asr_results
             (source_job_id, attempt_id, project_id, episode_number, revision, asset_id,
              term_version_id, config_digest, hotword_digest, quality_status, quality_summary)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [claim.jobId, claim.attemptId, claim.projectId, claim.episodeNumber,
            next.rows[0]!.revision, claim.assetId, claim.termVersionId, claim.configDigest,
            claim.hotwordDigest, outcome.qualityStatus, JSON.stringify(outcome.qualitySummary)],
        );
        for (const cue of outcome.cues) {
          await client.query(
            `INSERT INTO asr_cues (result_id, cue_index, start_ms, end_ms, text, confidence)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [result.rows[0]!.id, cue.cueIndex, cue.startMs, cue.endMs, cue.text, cue.confidence],
          );
        }
        await client.query(
          `UPDATE asr_attempts SET status = 'completed', provider_request_id = $2,
                  completed_at = $3, retryable = $4,
                  error_code = $5, error_detail = $6, hotword_receipt_status = $7,
                  hotword_submitted_count = $8, hotword_omitted_count = $9,
                  hotword_receipt_reason_code = $10, effect_class = $11
            WHERE id = $1`,
          [claim.attemptId, outcome.providerRequestId, now, outcome.qualityStatus === 'rejected',
            outcome.qualityStatus === 'rejected' ? 'ASR_QUALITY_REJECTED' : null,
            outcome.qualityStatus === 'rejected' ? '质量门拒绝该结果，历史更好结果保持可用。' : null,
            outcome.hotwordReceipt, outcome.hotwordReceiptFacts.submittedCount,
            outcome.hotwordReceiptFacts.omittedCount, outcome.hotwordReceiptFacts.reasonCode, outcome.effectClass],
        );
        await recordUsage(client, claim.attemptId, outcome.usage, budgetFacts);
        await client.query(
          `UPDATE asr_jobs
              SET status = $2, current_result_id = CASE WHEN $3 THEN current_result_id ELSE $4 END,
                  cancel_requested = FALSE, updated_at = $5
            WHERE id = $1`,
          [claim.jobId, outcome.qualityStatus === 'rejected' ? 'failed' : 'completed',
            outcome.qualityStatus === 'rejected', result.rows[0]!.id, now],
        );
      } else if (outcome.kind === 'failed') {
        const canAdvance = outcome.effectClass === 'external_not_accepted' && !outcome.externalSideEffectPossible;
        const cancelled = locked.rows[0].cancel_requested && canAdvance;
        await client.query(
          `UPDATE asr_attempts SET status = $2, provider_request_id = $3,
                  error_code = $4, error_detail = $5, retryable = $6,
                  external_side_effect_possible = $7, completed_at = $8,
                  hotword_receipt_status = $9, hotword_submitted_count = $10,
                  hotword_omitted_count = $11, hotword_receipt_reason_code = $12,
                  effect_class = $13
            WHERE id = $1`,
          [claim.attemptId, cancelled ? 'cancelled' : 'failed', outcome.providerRequestId,
            cancelled ? 'ASR_CANCELLED' : outcome.errorCode,
            cancelled ? '用户取消且本次执行未产生外部副作用。' : outcome.errorDetail,
            cancelled ? false : outcome.retryable, outcome.externalSideEffectPossible, now,
            outcome.hotwordReceipt, outcome.hotwordReceiptFacts.submittedCount,
            outcome.hotwordReceiptFacts.omittedCount, outcome.hotwordReceiptFacts.reasonCode,
            cancelled ? 'cancelled' : outcome.effectClass],
        );
        await recordUsage(client, claim.attemptId, outcome.usage, budgetFacts);
        const nextTarget = !cancelled && canAdvance
          ? await client.query<{ routing_target_id: string }>(`SELECT routing_target_id FROM routing_policy_targets WHERE routing_version_id=(SELECT routing_version_id FROM asr_jobs WHERE id=$1) AND pool_id='asr_api' AND priority>$2 ORDER BY priority LIMIT 1`, [claim.jobId, claim.routingTargetPriority])
          : { rows: [] as Array<{ routing_target_id: string }> };
        const advance = nextTarget.rows[0]?.routing_target_id ?? null;
        if (advance) {
          await client.query(`INSERT INTO routing_advance_events(job_id,attempt_id,from_target_id,to_target_id,classification,provider_request_id,request_id) VALUES($1,$2,$3,$4,'external_not_accepted', $5,$6)`, [claim.jobId, claim.attemptId, claim.routingTargetId, advance, outcome.providerRequestId, claim.jobId]);
        }
        await client.query(
          `UPDATE asr_jobs SET status = $2, current_attempt_id = CASE WHEN $4 THEN NULL ELSE current_attempt_id END, cancel_requested = FALSE, updated_at = $3 WHERE id = $1`,
          [claim.jobId, cancelled ? 'cancelled' : advance ? 'queued' : 'failed', now, Boolean(advance)],
        );
      } else {
        await client.query(
          `UPDATE asr_attempts SET status = 'reconciliation_required', provider_request_id = $2,
                  error_code = $3, error_detail = $4, retryable = FALSE,
                  external_side_effect_possible = TRUE, completed_at = $5,
                  hotword_receipt_status = $6, hotword_submitted_count = $7,
                  hotword_omitted_count = $8, hotword_receipt_reason_code = $9, effect_class = 'external_unknown'
            WHERE id = $1`,
          [claim.attemptId, outcome.providerRequestId, outcome.errorCode, outcome.errorDetail, now,
            outcome.hotwordReceipt, outcome.hotwordReceiptFacts.submittedCount,
            outcome.hotwordReceiptFacts.omittedCount, outcome.hotwordReceiptFacts.reasonCode],
        );
        await recordUsage(client, claim.attemptId, outcome.usage, budgetFacts);
        await client.query(
          `UPDATE asr_jobs SET status = 'reconciliation_required', cancel_requested = FALSE,
                  updated_at = $2 WHERE id = $1`,
          [claim.jobId, now],
        );
      }
      await refreshAsrBatchStatus(client, claim.batchId);
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
