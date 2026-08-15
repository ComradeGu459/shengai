import { createHash } from 'node:crypto';

import type {
  AsrBatchStatus,
  AsrDispatchAcceptanceStatus,
  AsrDispatchExecutionStatus,
  AsrDispatchGroupDetail,
  AsrDispatchGroupListQuery,
  AsrDispatchGroupSummary,
  AsrDispatchProjectResult,
  AsrProjectEligibility,
  CreateAsrDispatchGroupBody,
} from '@qimao-terms-cloud/contracts';
import type { QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import { AsrCommandRepository } from './asr-command.repository.js';
import { AsrEligibilityRepository, normalizeDispatchProjectIds } from './asr-eligibility.repository.js';
import { AsrDomainError, asrConflict, asrNotFound } from './asr-errors.js';
import { loadAsrBatchSummary } from './asr-read.repository.js';

interface GroupRow extends QueryResultRow {
  id: string;
  request_id: string;
  project_ids: string[];
  allow_partial: boolean;
  status: 'processing' | AsrDispatchAcceptanceStatus;
  created_at: Date;
  updated_at: Date;
  list_total?: string;
}

interface ResultRow extends QueryResultRow {
  project_id: string;
  selection_order: number;
  status: 'pending' | 'ready' | 'accepted' | 'blocked';
  eligibility_snapshot: AsrProjectEligibility | null;
  dispatch_error: AsrDispatchProjectResult['dispatchError'];
  batch_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DispatchListRow extends QueryResultRow {
  id: string | null;
  list_total: string;
}

const requestHash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const emptyBatchCounts = () => ({
  blocked: 0,
  queued: 0,
  running: 0,
  cancelRequested: 0,
  partial: 0,
  completed: 0,
  reconciliationRequired: 0,
  failed: 0,
  cancelled: 0,
});

const deriveExecutionStatus = (
  counts: ReturnType<typeof emptyBatchCounts>,
  acceptedProjects: number,
): AsrDispatchExecutionStatus | null => {
  if (acceptedProjects === 0) return null;
  if (counts.cancelRequested > 0) return 'cancel_requested';
  if (counts.running > 0) return 'running';
  if (counts.queued > 0) return 'queued';
  const usableProjects = counts.completed + counts.partial;
  const adverseProjects = counts.failed + counts.blocked
    + counts.cancelled + counts.reconciliationRequired;
  if (counts.partial > 0 || (usableProjects > 0 && adverseProjects > 0)) return 'partial';
  if (counts.reconciliationRequired > 0) return 'reconciliation_required';
  if (counts.failed + counts.blocked > 0) return 'failed';
  if (counts.completed === acceptedProjects) return 'completed';
  if (counts.cancelled === acceptedProjects) return 'cancelled';
  return 'partial';
};

export class AsrDispatchRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly eligibility: AsrEligibilityRepository,
    private readonly batchCommands: AsrCommandRepository,
  ) {}

  private async load(groupId: string): Promise<AsrDispatchGroupDetail | null> {
    const client = await this.pool.connect();
    try {
      const groupResult = await client.query<GroupRow>(
        'SELECT * FROM asr_dispatch_groups WHERE id = $1',
        [groupId],
      );
      const group = groupResult.rows[0];
      if (!group) return null;
      const resultRows = await client.query<ResultRow>(
        `SELECT project_id, selection_order, status, eligibility_snapshot,
                dispatch_error, batch_id, created_at, updated_at
           FROM asr_dispatch_project_results
          WHERE dispatch_group_id = $1
          ORDER BY selection_order, project_id`,
        [groupId],
      );
      const results: AsrDispatchProjectResult[] = [];
      const batches = emptyBatchCounts();
      let effectiveUpdatedAt = group.updated_at;
      for (const row of resultRows.rows) {
        const batch = row.batch_id ? await loadAsrBatchSummary(client, row.batch_id) : null;
        if (batch) {
          const key = batch.status === 'cancel_requested'
            ? 'cancelRequested'
            : batch.status === 'reconciliation_required' ? 'reconciliationRequired' : batch.status;
          batches[key as keyof typeof batches] += 1;
          const batchUpdatedAt = new Date(batch.updatedAt);
          if (batchUpdatedAt > effectiveUpdatedAt) effectiveUpdatedAt = batchUpdatedAt;
        }
        if (row.updated_at > effectiveUpdatedAt) effectiveUpdatedAt = row.updated_at;
        if (row.status !== 'accepted' && row.status !== 'blocked') {
          throw new Error(`Dispatch 项目结果尚未完成：${groupId}/${row.project_id}`);
        }
        results.push({
          projectId: row.project_id,
          selectionOrder: row.selection_order,
          acceptanceStatus: row.status,
          eligibility: row.eligibility_snapshot,
          dispatchError: row.dispatch_error,
          batchId: row.batch_id,
          batch,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        });
      }
      if (group.status === 'processing') throw new Error(`Dispatch 接受结果尚未完成：${groupId}`);
      const acceptedResults = results.filter(
        (result) => result.acceptanceStatus === 'accepted',
      );
      const acceptedProjects = acceptedResults.length;
      const executionStatus = deriveExecutionStatus(batches, acceptedProjects);
      const qualityResult = await client.query<{
        passed: string; warning: string; rejected: string;
      }>(
        `SELECT COUNT(*) FILTER (WHERE result.quality_status = 'pass')::text AS passed,
                COUNT(*) FILTER (WHERE result.quality_status = 'warning')::text AS warning,
                COUNT(*) FILTER (WHERE result.quality_status = 'rejected')::text AS rejected
           FROM asr_dispatch_project_results dispatch_result
           JOIN asr_jobs job ON job.batch_id = dispatch_result.batch_id
           LEFT JOIN asr_results result ON result.id = job.current_result_id
          WHERE dispatch_result.dispatch_group_id = $1
            AND dispatch_result.status = 'accepted'`,
        [groupId],
      );
      const usageResult = await client.query<{
        recorded: string; media_duration_ms: string; pending: string;
      }>(
        `SELECT COUNT(usage.id)::text AS recorded,
                COALESCE(SUM(usage.media_duration_ms), 0)::text AS media_duration_ms,
                COUNT(*) FILTER (WHERE usage.reconciliation_status = 'pending')::text AS pending
           FROM asr_dispatch_project_results dispatch_result
           JOIN asr_jobs job ON job.batch_id = dispatch_result.batch_id
           JOIN asr_attempts attempt ON attempt.job_id = job.id
           LEFT JOIN asr_usage usage ON usage.attempt_id = attempt.id
          WHERE dispatch_result.dispatch_group_id = $1
            AND dispatch_result.status = 'accepted'`,
        [groupId],
      );
      const quality = qualityResult.rows[0]!;
      const usage = usageResult.rows[0]!;
      const recordedAttempts = Number(usage.recorded);
      const pendingUsage = Number(usage.pending) > 0 || batches.reconciliationRequired > 0;
      return {
        id: group.id,
        requestId: group.request_id,
        acceptanceStatus: group.status,
        executionStatus,
        projectIds: group.project_ids,
        allowPartial: group.allow_partial,
        counts: {
          selectedProjects: results.length,
          acceptedProjects,
          blockedProjects: results.filter(
            (result) => result.acceptanceStatus === 'blocked',
          ).length,
          completedProjects: batches.completed,
          totalEpisodes: acceptedResults.reduce(
            (total, result) => total + (result.eligibility?.totalEpisodeCount ?? 0),
            0,
          ),
          newJobs: acceptedResults.reduce(
            (total, result) => total + (result.eligibility?.newJobCount ?? 0),
            0,
          ),
          reusableResults: acceptedResults.reduce(
            (total, result) => total + (result.eligibility?.reusableResultCount ?? 0),
            0,
          ),
          batches,
        },
        quality: {
          passedEpisodes: Number(quality.passed),
          warningEpisodes: Number(quality.warning),
          rejectedEpisodes: Number(quality.rejected),
        },
        processingUsage: {
          recordedAttempts,
          mediaDurationMs: Number(usage.media_duration_ms),
          reconciliationStatus: pendingUsage
            ? 'pending'
            : recordedAttempts > 0 ? 'recorded' : 'not_recorded',
        },
        results,
        createdAt: group.created_at.toISOString(),
        updatedAt: effectiveUpdatedAt.toISOString(),
      };
    } finally {
      client.release();
    }
  }

  private async resume(groupId: string) {
    const group = await this.pool.query<GroupRow>(
      'SELECT * FROM asr_dispatch_groups WHERE id = $1',
      [groupId],
    );
    if (!group.rows[0] || group.rows[0].status !== 'processing') return;

    const pending = await this.pool.query<ResultRow>(
      `SELECT project_id, selection_order, status, eligibility_snapshot,
              dispatch_error, batch_id, created_at, updated_at
         FROM asr_dispatch_project_results
        WHERE dispatch_group_id = $1 AND status = 'pending'
        ORDER BY selection_order`,
      [groupId],
    );
    for (const row of pending.rows) {
      const eligibility = await this.eligibility.evaluateProject(row.project_id);
      await this.pool.query(
        `UPDATE asr_dispatch_project_results
            SET status = $3, eligibility_snapshot = $4, dispatch_error = $5,
                updated_at = CURRENT_TIMESTAMP
          WHERE dispatch_group_id = $1 AND project_id = $2 AND status = 'pending'`,
        [groupId, row.project_id, eligibility.eligible ? 'ready' : 'blocked',
          JSON.stringify(eligibility),
          eligibility.eligible ? null : JSON.stringify(eligibility.blockers[0]!)],
      );
    }

    const afterEligibility = await this.pool.query<{ status: string }>(
      'SELECT status FROM asr_dispatch_project_results WHERE dispatch_group_id = $1',
      [groupId],
    );
    const hasBlocked = afterEligibility.rows.some((row) => row.status === 'blocked');
    if (hasBlocked && !group.rows[0].allow_partial) {
      const error = {
        code: 'ASR_DISPATCH_PARTIAL_CONFIRMATION_REQUIRED',
        message: '所选项目存在阻断项，未创建任何项目批次。',
        action: 'confirm_eligible_projects_only',
      };
      await this.pool.query(
        `UPDATE asr_dispatch_project_results
            SET status = 'blocked', dispatch_error = $2, updated_at = CURRENT_TIMESTAMP
          WHERE dispatch_group_id = $1 AND status = 'ready'`,
        [groupId, JSON.stringify(error)],
      );
      await this.pool.query(
        `UPDATE asr_dispatch_groups
            SET status = 'blocked', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [groupId],
      );
      return;
    }

    const ready = await this.pool.query<ResultRow>(
      `SELECT project_id, selection_order, status, eligibility_snapshot,
              dispatch_error, batch_id, created_at, updated_at
         FROM asr_dispatch_project_results
        WHERE dispatch_group_id = $1 AND status = 'ready'
        ORDER BY selection_order`,
      [groupId],
    );
    for (const row of ready.rows) {
      const termVersionId = row.eligibility_snapshot?.termVersionId;
      if (!termVersionId) throw new Error(`Dispatch ready 项目缺少术语版本：${row.project_id}`);
      try {
        const created = await this.batchCommands.create({
          projectId: row.project_id,
          body: { scope: { kind: 'all' }, termVersionId },
          idempotencyKey: `dispatch:${groupId}:${row.project_id}`,
          rejectIfActiveBatch: true,
        });
        await this.pool.query(
          `UPDATE asr_dispatch_project_results
              SET status = 'accepted', batch_id = $3, dispatch_error = NULL,
                  updated_at = CURRENT_TIMESTAMP
            WHERE dispatch_group_id = $1 AND project_id = $2 AND status = 'ready'`,
          [groupId, row.project_id, created.batch.id],
        );
      } catch (error) {
        if (!(error instanceof AsrDomainError)) throw error;
        await this.pool.query(
          `UPDATE asr_dispatch_project_results
              SET status = 'blocked', dispatch_error = $3, updated_at = CURRENT_TIMESTAMP
            WHERE dispatch_group_id = $1 AND project_id = $2 AND status = 'ready'`,
          [groupId, row.project_id, JSON.stringify({
            code: error.code,
            message: error.message,
            action: error.action,
          })],
        );
      }
    }

    const final = await this.pool.query<{ accepted: string; blocked: string }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'accepted')::text AS accepted,
              COUNT(*) FILTER (WHERE status = 'blocked')::text AS blocked
         FROM asr_dispatch_project_results WHERE dispatch_group_id = $1`,
      [groupId],
    );
    const accepted = Number(final.rows[0]!.accepted);
    const blocked = Number(final.rows[0]!.blocked);
    const status: AsrDispatchAcceptanceStatus = accepted > 0 && blocked > 0
      ? 'partial'
      : accepted > 0 ? 'accepted' : 'blocked';
    await this.pool.query(
      `UPDATE asr_dispatch_groups SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [groupId, status],
    );
  }

  async create(input: {
    body: CreateAsrDispatchGroupBody;
    idempotencyKey: string;
    requestId: string;
  }) {
    const groupId = input.body.dispatchGroupId.toLowerCase();
    const projectIds = normalizeDispatchProjectIds(input.body.projectIds);
    const allowPartial = input.body.allowPartial ?? false;
    const hash = requestHash({ dispatchGroupId: groupId, projectIds, allowPartial });
    const client = await this.pool.connect();
    let replay = false;
    try {
      await client.query('BEGIN');
      const lockKeys = [
        `asr-dispatch:${input.idempotencyKey}`,
        `asr-dispatch-group:${groupId}`,
      ].sort();
      for (const lockKey of lockKeys) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);
      }
      const existing = await client.query<{ request_hash: string; dispatch_group_id: string }>(
        'SELECT request_hash, dispatch_group_id FROM asr_dispatch_commands WHERE idempotency_key = $1',
        [input.idempotencyKey],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== hash) {
          throw asrConflict(
            'ASR_DISPATCH_IDEMPOTENCY_KEY_REUSED',
            '该幂等键已用于另一多项目识别请求。',
            'retry_with_new_idempotency_key',
          );
        }
        if (existing.rows[0].dispatch_group_id !== groupId) {
          throw new Error('Dispatch 幂等命令的资源 ID 与请求摘要不一致。');
        }
        replay = true;
      } else {
        const occupied = await client.query<{ id: string }>(
          'SELECT id FROM asr_dispatch_groups WHERE id = $1',
          [groupId],
        );
        if (occupied.rows[0]) {
          throw asrConflict(
            'ASR_DISPATCH_GROUP_ID_REUSED',
            '该多项目识别资源标识已用于另一创建请求。',
            'retry_with_new_dispatch_group_id',
          );
        }
        await client.query(
          `INSERT INTO asr_dispatch_groups
             (id, request_id, project_ids, allow_partial)
           VALUES ($1,$2,$3,$4)`,
          [groupId, input.requestId, projectIds, allowPartial],
        );
        for (let index = 0; index < projectIds.length; index += 1) {
          await client.query(
            `INSERT INTO asr_dispatch_project_results
               (dispatch_group_id, project_id, selection_order)
             VALUES ($1,$2,$3)`,
            [groupId, projectIds[index], index + 1],
          );
        }
        await client.query(
          `INSERT INTO asr_dispatch_commands (idempotency_key, request_hash, dispatch_group_id)
           VALUES ($1,$2,$3)`,
          [input.idempotencyKey, hash, groupId],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    await this.resume(groupId);
    return { group: (await this.load(groupId))!, replay };
  }

  async get(groupId: string) {
    await this.resume(groupId);
    const group = await this.load(groupId);
    if (!group) throw asrNotFound('ASR_DISPATCH_NOT_FOUND', '多项目识别任务不存在。');
    return group;
  }

  async list(query: AsrDispatchGroupListQuery) {
    const unfinished = await this.pool.query<{ id: string }>(
      "SELECT id FROM asr_dispatch_groups WHERE status = 'processing' ORDER BY created_at, id",
    );
    for (const group of unfinished.rows) await this.resume(group.id);
    const values: unknown[] = [];
    const predicates: string[] = [];
    const search = query.search?.trim();
    if (search) {
      values.push(`%${search}%`);
      predicates.push(`(id::text ILIKE $${values.length} OR project_names ILIKE $${values.length})`);
    }
    if (query.acceptanceStatus) {
      values.push(query.acceptanceStatus);
      predicates.push(`acceptance_status = $${values.length}`);
    }
    if (query.executionStatus) {
      values.push(query.executionStatus);
      predicates.push(`execution_status = $${values.length}`);
    }
    const sortBy = query.sortBy ?? 'actionPriority';
    const direction = (query.sortDirection ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
    const sortExpression = sortBy === 'updatedAt'
      ? 'effective_updated_at'
      : sortBy === 'createdAt'
        ? 'created_at'
        : `CASE execution_status
            WHEN 'reconciliation_required' THEN 8
            WHEN 'failed' THEN 7
            WHEN 'cancel_requested' THEN 6
            WHEN 'running' THEN 5
            WHEN 'queued' THEN 4
            WHEN 'partial' THEN 3
            WHEN 'completed' THEN 2
            WHEN 'cancelled' THEN 1
            ELSE 0 END`;
    values.push(Number(query.limit ?? 20), Number(query.offset ?? 0));
    const rows = await this.pool.query<DispatchListRow>(
      `WITH projected AS (
         SELECT dispatch.id, dispatch.status AS acceptance_status, dispatch.created_at,
                GREATEST(dispatch.updated_at, COALESCE(MAX(batch.updated_at), dispatch.updated_at))
                  AS effective_updated_at,
                STRING_AGG(COALESCE(project.name, result.eligibility_snapshot->>'projectName', ''), ' ')
                  AS project_names,
                COUNT(*) FILTER (WHERE result.status = 'accepted')::integer AS accepted_projects,
                COUNT(*) FILTER (WHERE result.status = 'accepted' AND batch.status = 'queued')::integer AS queued,
                COUNT(*) FILTER (WHERE result.status = 'accepted' AND batch.status = 'running')::integer AS running,
                COUNT(*) FILTER (WHERE result.status = 'accepted' AND batch.status = 'cancel_requested')::integer AS cancel_requested,
                COUNT(*) FILTER (WHERE result.status = 'accepted' AND batch.status = 'partial')::integer AS partial,
                COUNT(*) FILTER (WHERE result.status = 'accepted' AND batch.status = 'completed')::integer AS completed,
                COUNT(*) FILTER (WHERE result.status = 'accepted' AND batch.status = 'reconciliation_required')::integer AS reconciliation_required,
                COUNT(*) FILTER (WHERE result.status = 'accepted' AND batch.status IN ('failed','blocked'))::integer AS failed,
                COUNT(*) FILTER (WHERE result.status = 'accepted' AND batch.status = 'cancelled')::integer AS cancelled
           FROM asr_dispatch_groups dispatch
           JOIN asr_dispatch_project_results result ON result.dispatch_group_id = dispatch.id
           LEFT JOIN asr_batches batch ON batch.id = result.batch_id
           LEFT JOIN projects project ON project.id = result.project_id
          WHERE dispatch.status <> 'processing'
          GROUP BY dispatch.id
       ), derived AS (
         SELECT *, CASE
           WHEN accepted_projects = 0 THEN NULL
           WHEN cancel_requested > 0 THEN 'cancel_requested'
           WHEN running > 0 THEN 'running'
           WHEN queued > 0 THEN 'queued'
           WHEN partial > 0 OR ((completed + partial) > 0 AND (failed + cancelled + reconciliation_required) > 0)
             THEN 'partial'
           WHEN reconciliation_required > 0 THEN 'reconciliation_required'
           WHEN failed > 0 THEN 'failed'
           WHEN completed = accepted_projects THEN 'completed'
           WHEN cancelled = accepted_projects THEN 'cancelled'
           ELSE 'partial' END AS execution_status
           FROM projected
       ), filtered AS (
         SELECT * FROM derived
          ${predicates.length ? `WHERE ${predicates.join(' AND ')}` : ''}
       ), page AS (
         SELECT * FROM filtered
          ORDER BY ${sortExpression} ${direction}, effective_updated_at DESC, id DESC
          LIMIT $${values.length - 1} OFFSET $${values.length}
       )
       SELECT page.id, totals.list_total
         FROM (SELECT COUNT(*)::text AS list_total FROM filtered) totals
         LEFT JOIN page ON TRUE
        ORDER BY ${sortExpression} ${direction}, effective_updated_at DESC, id DESC`,
      values,
    );
    const items: AsrDispatchGroupSummary[] = [];
    for (const row of rows.rows) {
      if (!row.id) continue;
      const detail = await this.load(row.id);
      const { results: _results, ...summary } = detail!;
      items.push(summary);
    }
    return { items, total: Number(rows.rows[0]?.list_total ?? 0) };
  }

  async cancel(input: { groupId: string; idempotencyKey: string }) {
    await this.resume(input.groupId);
    const hash = requestHash({ groupId: input.groupId });
    const client = await this.pool.connect();
    let replay = false;
    let completed = false;
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `asr-dispatch-cancel:${input.idempotencyKey}`,
      ]);
      const existing = await client.query<{
        request_hash: string; dispatch_group_id: string; status: string;
      }>(
        `SELECT request_hash, dispatch_group_id, status
           FROM asr_dispatch_cancel_commands WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== hash) {
          throw asrConflict(
            'ASR_DISPATCH_CANCEL_IDEMPOTENCY_KEY_REUSED',
            '该幂等键已用于另一多项目取消请求。',
            'retry_with_new_idempotency_key',
          );
        }
        replay = true;
        completed = existing.rows[0].status === 'completed';
      } else {
        const group = await client.query<{ id: string }>(
          'SELECT id FROM asr_dispatch_groups WHERE id = $1',
          [input.groupId],
        );
        if (!group.rows[0]) throw asrNotFound('ASR_DISPATCH_NOT_FOUND', '多项目识别任务不存在。');
        await client.query(
          `INSERT INTO asr_dispatch_cancel_commands
             (idempotency_key, request_hash, dispatch_group_id)
           VALUES ($1,$2,$3)`,
          [input.idempotencyKey, hash, input.groupId],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    if (!completed) {
      const cancellable = await this.pool.query<{
        project_id: string; batch_id: string;
      }>(
        `SELECT result.project_id, result.batch_id
           FROM asr_dispatch_project_results result
           JOIN asr_batches batch ON batch.id = result.batch_id
          WHERE result.dispatch_group_id = $1 AND result.status = 'accepted'
            AND batch.status IN ('queued','running','cancel_requested')
          ORDER BY result.selection_order, result.project_id`,
        [input.groupId],
      );
      for (const item of cancellable.rows) {
        await this.batchCommands.cancel({
          projectId: item.project_id,
          batchId: item.batch_id,
          idempotencyKey: `dispatch-cancel:${input.groupId}:${item.batch_id}`,
        });
      }
      await this.pool.query(
        `UPDATE asr_dispatch_cancel_commands
            SET status = 'completed', cancelled_batch_count = $2,
                completed_at = CURRENT_TIMESTAMP
          WHERE idempotency_key = $1 AND status = 'processing'`,
        [input.idempotencyKey, cancellable.rowCount ?? 0],
      );
      await this.pool.query(
        `UPDATE asr_dispatch_groups SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [input.groupId],
      );
    }
    return { group: await this.get(input.groupId), replay };
  }
}
