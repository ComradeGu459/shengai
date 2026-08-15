import type {
  CleanupJobStatus,
  Project,
  RecycleBinItem,
  RecycleBinList,
  RecycleBinQuery,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';

interface ProjectRow extends QueryResultRow {
  id: string;
  name: string;
  workflow_status: Project['workflowStatus'];
  lifecycle_status: Project['lifecycleStatus'];
  recycle_expires_at: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
}

interface LifecycleCommandRow extends QueryResultRow {
  command_kind: string;
  project_id: string;
  request_hash: string;
  result_project: Project;
  terminated_upload_count: number;
}

interface MultipartCleanupRow extends QueryResultRow {
  upload_session_id: string;
  storage_upload_id: string;
  object_key: string;
}

interface CleanupJobRow extends QueryResultRow {
  id: string;
  project_id: string;
  status: CleanupJobStatus;
  attempt_count: number;
  lease_expires_at: Date | null;
  next_attempt_at: Date | null;
  last_error: string | null;
  completed_at: Date | null;
  created_at: Date;
}

interface RecycleBinRow extends QueryResultRow {
  project_id: string;
  project_name: string;
  workflow_status: Project['workflowStatus'];
  lifecycle_status: 'recycled' | 'purging';
  recycle_expires_at: Date;
  recycled_at: Date;
  project_version: number;
  project_updated_at: Date;
  job_id: string;
  status: CleanupJobStatus;
  attempt_count: number;
  lease_expires_at: Date | null;
  next_attempt_at: Date | null;
  last_error: string | null;
  completed_at: Date | null;
  total_count: string;
}

export interface MultipartCleanupTarget {
  uploadSessionId: string;
  storageUploadId: string;
  objectKey: string;
}

export interface ClaimedCleanupJob {
  id: string;
  projectId: string;
  attemptCount: number;
  createdAt: Date;
}

export class ProjectLifecycleIdempotencyConflictError extends Error {
  constructor() {
    super('该幂等键已用于另一个项目生命周期命令。');
    this.name = 'ProjectLifecycleIdempotencyConflictError';
  }
}

export class ProjectLifecycleNotFoundError extends Error {
  constructor() {
    super('项目不存在或已被清理。');
    this.name = 'ProjectLifecycleNotFoundError';
  }
}

export class ProjectLifecycleVersionConflictError extends Error {
  constructor(readonly currentVersion: number) {
    super('项目版本已变化，请刷新后重试。');
    this.name = 'ProjectLifecycleVersionConflictError';
  }
}

export class ProjectLifecycleStateError extends Error {
  constructor(readonly code: 'PROJECT_NOT_ACTIVE' | 'PROJECT_NOT_RECYCLED' | 'PROJECT_RECYCLE_EXPIRED' | 'PROJECT_PURGING') {
    const messages = {
      PROJECT_NOT_ACTIVE: '项目当前不能移入回收站。',
      PROJECT_NOT_RECYCLED: '项目当前不在可恢复的回收状态。',
      PROJECT_RECYCLE_EXPIRED: '项目恢复期限已过，不能恢复。',
      PROJECT_PURGING: '项目已经进入清理流程，不能恢复。',
    } as const;
    super(messages[code]);
    this.name = 'ProjectLifecycleStateError';
  }
}

const projectColumns = `
  id, name, workflow_status, lifecycle_status, recycle_expires_at,
  version, created_at, updated_at, created_by, updated_by
`;

const toProject = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  workflowStatus: row.workflow_status,
  lifecycleStatus: row.lifecycle_status,
  recycleExpiresAt: row.recycle_expires_at?.toISOString() ?? null,
  version: row.version,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  createdBy: row.created_by,
  updatedBy: row.updated_by,
});

const findLifecycleCommand = async (client: PoolClient, idempotencyKey: string) => {
  const result = await client.query<LifecycleCommandRow>(
    `SELECT command_kind, project_id, request_hash, result_project, terminated_upload_count
       FROM project_lifecycle_commands
      WHERE idempotency_key = $1`,
    [idempotencyKey],
  );
  return result.rows[0] ?? null;
};

const assertCommandMatches = (
  command: LifecycleCommandRow,
  input: { commandKind: string; projectId: string; requestHash: string },
) => {
  if (command.command_kind !== input.commandKind
    || command.project_id !== input.projectId
    || command.request_hash !== input.requestHash) {
    throw new ProjectLifecycleIdempotencyConflictError();
  }
};

const loadMultipartTargets = async (client: PoolClient, projectId: string) => {
  const result = await client.query<MultipartCleanupRow>(
    `SELECT upload_session_id, storage_upload_id, object_key
       FROM project_upload_cleanups
      WHERE project_id = $1 AND status IN ('pending', 'retryable')
      ORDER BY upload_session_id`,
    [projectId],
  );
  return result.rows.map((row) => ({
    uploadSessionId: row.upload_session_id,
    storageUploadId: row.storage_upload_id,
    objectKey: row.object_key,
  }));
};

export class ProjectLifecycleRepository {
  constructor(private readonly pool: DatabasePool) {}

  async recycle(input: {
    projectId: string;
    expectedVersion: number;
    idempotencyKey: string;
    requestHash: string;
    actor: string;
    now: Date;
    expiresAt: Date;
  }): Promise<{
    project: Project;
    terminatedUploadCount: number;
    replay: boolean;
    cleanupTargets: MultipartCleanupTarget[];
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `project-lifecycle:${input.idempotencyKey}`,
      ]);
      const existing = await findLifecycleCommand(client, input.idempotencyKey);
      if (existing) {
        assertCommandMatches(existing, { commandKind: 'recycle_project', ...input });
        const cleanupTargets = await loadMultipartTargets(client, input.projectId);
        await client.query('COMMIT');
        return {
          project: existing.result_project,
          terminatedUploadCount: existing.terminated_upload_count,
          replay: true,
          cleanupTargets,
        };
      }

      const projectResult = await client.query<ProjectRow>(
        `SELECT ${projectColumns} FROM projects WHERE id = $1 FOR UPDATE`,
        [input.projectId],
      );
      const current = projectResult.rows[0];
      if (!current || current.lifecycle_status === 'purged') throw new ProjectLifecycleNotFoundError();
      if (current.lifecycle_status !== 'active') throw new ProjectLifecycleStateError('PROJECT_NOT_ACTIVE');
      if (current.version !== input.expectedVersion) {
        throw new ProjectLifecycleVersionConflictError(current.version);
      }

      const unfinished = await client.query<MultipartCleanupRow>(
        `SELECT id AS upload_session_id, storage_upload_id, object_key
           FROM upload_sessions
          WHERE project_id = $1 AND status NOT IN ('completed', 'aborted')
          ORDER BY id
          FOR UPDATE`,
        [input.projectId],
      );
      for (const upload of unfinished.rows) {
        await client.query(
          `INSERT INTO project_upload_cleanups
             (upload_session_id, project_id, storage_upload_id, object_key, status)
           VALUES ($1, $2, $3, $4, 'pending')
           ON CONFLICT (upload_session_id) DO UPDATE
             SET status = CASE WHEN project_upload_cleanups.status = 'completed'
                               THEN 'completed'::multipart_cleanup_status ELSE 'pending'::multipart_cleanup_status END,
                 object_key = EXCLUDED.object_key, last_error = NULL, updated_at = $5`,
          [upload.upload_session_id, input.projectId, upload.storage_upload_id, upload.object_key, input.now],
        );
      }
      await client.query(
        `UPDATE upload_sessions
            SET status = 'aborted', version = version + 1,
                error_code = 'PROJECT_RECYCLED',
                error_detail = '项目已移入回收站，未完成上传不会恢复。',
                updated_at = $2
          WHERE project_id = $1 AND status NOT IN ('completed', 'aborted')`,
        [input.projectId, input.now],
      );
      const updatedResult = await client.query<ProjectRow>(
        `UPDATE projects
            SET lifecycle_status = 'recycled', recycle_expires_at = $2,
                version = version + 1, updated_at = $3, updated_by = $4
          WHERE id = $1
        RETURNING ${projectColumns}`,
        [input.projectId, input.expiresAt, input.now, input.actor],
      );
      const project = toProject(updatedResult.rows[0]!);
      await client.query(
        `INSERT INTO cleanup_jobs
           (project_id, status, attempt_count, lease_owner, lease_expires_at,
            next_attempt_at, last_error, completed_at, created_at, updated_at)
         VALUES ($1, 'scheduled', 0, NULL, NULL, $2, NULL, NULL, $3, $3)
         ON CONFLICT (project_id) DO UPDATE
           SET status = 'scheduled', attempt_count = 0, lease_owner = NULL,
               lease_expires_at = NULL, next_attempt_at = EXCLUDED.next_attempt_at,
               last_error = NULL, completed_at = NULL,
               created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at`,
        [input.projectId, input.expiresAt, input.now],
      );
      await client.query(
        `INSERT INTO project_lifecycle_audit_events (project_id, event_kind, details, created_at)
         VALUES ($1, 'project_recycled', $2, $3)`,
        [input.projectId, JSON.stringify({
          expiresAt: input.expiresAt.toISOString(),
          terminatedUploadCount: unfinished.rowCount ?? 0,
        }), input.now],
      );
      await client.query(
        `INSERT INTO project_lifecycle_commands
           (idempotency_key, command_kind, project_id, request_hash, result_project,
            terminated_upload_count, created_at)
         VALUES ($1, 'recycle_project', $2, $3, $4, $5, $6)`,
        [input.idempotencyKey, input.projectId, input.requestHash, JSON.stringify(project),
          unfinished.rowCount ?? 0, input.now],
      );
      const cleanupTargets = await loadMultipartTargets(client, input.projectId);
      await client.query('COMMIT');
      return {
        project,
        terminatedUploadCount: unfinished.rowCount ?? 0,
        replay: false,
        cleanupTargets,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async restore(input: {
    projectId: string;
    expectedVersion: number;
    idempotencyKey: string;
    requestHash: string;
    actor: string;
    now: Date;
  }): Promise<{ project: Project; replay: boolean; cleanupTargets: MultipartCleanupTarget[] }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `project-lifecycle:${input.idempotencyKey}`,
      ]);
      const existing = await findLifecycleCommand(client, input.idempotencyKey);
      if (existing) {
        assertCommandMatches(existing, { commandKind: 'restore_project', ...input });
        const cleanupTargets = await loadMultipartTargets(client, input.projectId);
        await client.query('COMMIT');
        return { project: existing.result_project, replay: true, cleanupTargets };
      }

      const projectResult = await client.query<ProjectRow>(
        `SELECT ${projectColumns} FROM projects WHERE id = $1 FOR UPDATE`,
        [input.projectId],
      );
      const current = projectResult.rows[0];
      if (!current || current.lifecycle_status === 'purged') throw new ProjectLifecycleNotFoundError();
      if (current.lifecycle_status === 'purging') throw new ProjectLifecycleStateError('PROJECT_PURGING');
      if (current.lifecycle_status !== 'recycled') throw new ProjectLifecycleStateError('PROJECT_NOT_RECYCLED');
      if (!current.recycle_expires_at || current.recycle_expires_at.getTime() <= input.now.getTime()) {
        throw new ProjectLifecycleStateError('PROJECT_RECYCLE_EXPIRED');
      }
      if (current.version !== input.expectedVersion) {
        throw new ProjectLifecycleVersionConflictError(current.version);
      }
      const updatedResult = await client.query<ProjectRow>(
        `UPDATE projects
            SET lifecycle_status = 'active', recycle_expires_at = NULL,
                version = version + 1, updated_at = $2, updated_by = $3
          WHERE id = $1
        RETURNING ${projectColumns}`,
        [input.projectId, input.now, input.actor],
      );
      const project = toProject(updatedResult.rows[0]!);
      await client.query(
        `UPDATE cleanup_jobs
            SET status = 'cancelled', lease_owner = NULL, lease_expires_at = NULL,
                next_attempt_at = NULL, last_error = NULL, updated_at = $2
          WHERE project_id = $1 AND status IN ('scheduled', 'retryable')`,
        [input.projectId, input.now],
      );
      await client.query(
        `INSERT INTO project_lifecycle_audit_events (project_id, event_kind, details, created_at)
         VALUES ($1, 'project_restored', '{}', $2)`,
        [input.projectId, input.now],
      );
      await client.query(
        `INSERT INTO project_lifecycle_commands
           (idempotency_key, command_kind, project_id, request_hash, result_project, created_at)
         VALUES ($1, 'restore_project', $2, $3, $4, $5)`,
        [input.idempotencyKey, input.projectId, input.requestHash, JSON.stringify(project), input.now],
      );
      const cleanupTargets = await loadMultipartTargets(client, input.projectId);
      await client.query('COMMIT');
      return { project, replay: false, cleanupTargets };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listRecycleBin(input: RecycleBinQuery): Promise<RecycleBinList> {
    const values: unknown[] = [];
    const predicates = [`project.lifecycle_status IN ('recycled', 'purging')`];
    if (input.lifecycleStatus) {
      values.push(input.lifecycleStatus);
      predicates.push(`project.lifecycle_status = $${values.length}`);
    }
    if (input.cleanupJobStatus) {
      values.push(input.cleanupJobStatus);
      predicates.push(`job.status = $${values.length}`);
    }
    if (input.search) {
      values.push(`%${input.search}%`);
      predicates.push(`project.name ILIKE $${values.length}`);
    }
    const sortColumn = {
      recycleExpiresAt: 'project.recycle_expires_at',
      name: 'project.name',
      recycledAt: 'job.created_at',
    }[input.sortBy ?? 'recycleExpiresAt'];
    const sortDirection = input.sortDirection === 'desc' ? 'DESC' : 'ASC';
    values.push(Number(input.limit ?? 50), Number(input.offset ?? 0));
    const result = await this.pool.query<RecycleBinRow>(
      `SELECT project.id AS project_id, project.name AS project_name,
              project.workflow_status, project.lifecycle_status, project.recycle_expires_at,
              job.created_at AS recycled_at,
              project.version AS project_version, project.updated_at AS project_updated_at,
              job.id AS job_id, job.status, job.attempt_count, job.lease_expires_at,
              job.next_attempt_at, job.last_error, job.completed_at,
              COUNT(*) OVER() AS total_count
         FROM projects project
         JOIN cleanup_jobs job ON job.project_id = project.id
        WHERE ${predicates.join(' AND ')}
        ORDER BY ${sortColumn} ${sortDirection}, project.id ASC
        LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    const items: RecycleBinItem[] = result.rows.map((row) => ({
      id: row.project_id,
      name: row.project_name,
      workflowStatus: row.workflow_status,
      lifecycleStatus: row.lifecycle_status,
      recycledAt: row.recycled_at.toISOString(),
      recycleExpiresAt: row.recycle_expires_at.toISOString(),
      version: row.project_version,
      updatedAt: row.project_updated_at.toISOString(),
      cleanupJob: {
        id: row.job_id,
        status: row.status,
        attemptCount: row.attempt_count,
        leaseExpiresAt: row.lease_expires_at?.toISOString() ?? null,
        nextAttemptAt: row.next_attempt_at?.toISOString() ?? null,
        lastError: row.last_error,
        completedAt: row.completed_at?.toISOString() ?? null,
      },
    }));
    return { items, total: Number(result.rows[0]?.total_count ?? 0) };
  }

  async recordMultipartCleanup(
    target: MultipartCleanupTarget,
    outcome: { ok: true } | { ok: false; error: string },
    now: Date,
  ) {
    await this.pool.query(
      `UPDATE project_upload_cleanups
          SET status = $2, attempt_count = attempt_count + 1,
              last_error = $3, completed_at = $4, updated_at = $5
        WHERE upload_session_id = $1`,
      [target.uploadSessionId, outcome.ok ? 'completed' : 'retryable', outcome.ok ? null : outcome.error,
        outcome.ok ? now : null, now],
    );
  }

  async claimCleanupJob(input: { workerId: string; now: Date; leaseExpiresAt: Date }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<CleanupJobRow>(
        `SELECT job.*
           FROM cleanup_jobs job
           JOIN projects project ON project.id = job.project_id
          WHERE (
              (job.status IN ('scheduled', 'retryable') AND job.next_attempt_at <= $1)
              OR (job.status = 'leased' AND job.lease_expires_at <= $1)
            )
            AND (
              (project.lifecycle_status = 'recycled' AND project.recycle_expires_at <= $1)
              OR project.lifecycle_status = 'purging'
            )
          ORDER BY job.next_attempt_at ASC, job.id ASC
          LIMIT 1
          FOR UPDATE OF job, project SKIP LOCKED`,
        [input.now],
      );
      const job = result.rows[0];
      if (!job) {
        await client.query('COMMIT');
        return null;
      }
      await client.query(
        `UPDATE projects
            SET lifecycle_status = 'purging', version = version + 1,
                updated_at = $2, updated_by = 'cleanup-worker'
          WHERE id = $1 AND lifecycle_status = 'recycled'`,
        [job.project_id, input.now],
      );
      const claimed = await client.query<CleanupJobRow>(
        `UPDATE cleanup_jobs
            SET status = 'leased', attempt_count = attempt_count + 1,
                lease_owner = $2, lease_expires_at = $3, last_error = NULL, updated_at = $4
          WHERE id = $1
        RETURNING *`,
        [job.id, input.workerId, input.leaseExpiresAt, input.now],
      );
      await client.query(
        `INSERT INTO project_lifecycle_audit_events (project_id, event_kind, details, created_at)
         VALUES ($1, 'cleanup_leased', $2, $3)`,
        [job.project_id, JSON.stringify({ workerId: input.workerId, attemptCount: claimed.rows[0]!.attempt_count }), input.now],
      );
      await client.query('COMMIT');
      const row = claimed.rows[0]!;
      return { id: row.id, projectId: row.project_id, attemptCount: row.attempt_count, createdAt: row.created_at };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listCleanupAssets(projectId: string) {
    const result = await this.pool.query<{ id: string; object_key: string }>(
      `SELECT id, object_key FROM assets WHERE project_id = $1 ORDER BY id`,
      [projectId],
    );
    return result.rows.map((row) => ({ id: row.id, objectKey: row.object_key }));
  }

  async listMultipartCleanups(projectId: string) {
    const client = await this.pool.connect();
    try {
      return await loadMultipartTargets(client, projectId);
    } finally {
      client.release();
    }
  }

  async recordAudit(projectId: string, eventKind: string, details: object, now: Date) {
    await this.pool.query(
      `INSERT INTO project_lifecycle_audit_events (project_id, event_kind, details, created_at)
       VALUES ($1, $2, $3, $4)`,
      [projectId, eventKind, JSON.stringify(details), now],
    );
  }

  async finalizePurge(input: {
    job: ClaimedCleanupJob;
    workerId: string;
    now: Date;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const jobResult = await client.query<CleanupJobRow>(
        `SELECT * FROM cleanup_jobs WHERE id = $1 FOR UPDATE`,
        [input.job.id],
      );
      const job = jobResult.rows[0];
      if (!job || job.status !== 'leased' || job.project_id !== input.job.projectId) {
        throw new Error('清理任务租约已经失效。');
      }
      const owner = await client.query<{ lease_owner: string | null }>(
        `SELECT lease_owner FROM cleanup_jobs WHERE id = $1`, [input.job.id],
      );
      if (owner.rows[0]?.lease_owner !== input.workerId) throw new Error('清理任务租约所有者不匹配。');
      const projectResult = await client.query<ProjectRow>(
        `SELECT ${projectColumns} FROM projects WHERE id = $1 FOR UPDATE`,
        [input.job.projectId],
      );
      if (projectResult.rows[0]?.lifecycle_status !== 'purging') throw new Error('项目不在清理状态。');
      const counts = await client.query<{
        asset_count: string;
        terminated_count: string;
        object_deleted_count: string;
        object_missing_count: string;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM assets WHERE project_id = $1) AS asset_count,
           (SELECT COUNT(*) FROM project_upload_cleanups WHERE project_id = $1) AS terminated_count,
           (SELECT COUNT(DISTINCT details->>'assetId')
              FROM project_lifecycle_audit_events
             WHERE project_id = $1 AND event_kind = 'object_deleted') AS object_deleted_count,
           (SELECT COUNT(DISTINCT missing.details->>'assetId')
              FROM project_lifecycle_audit_events missing
             WHERE missing.project_id = $1 AND missing.event_kind = 'object_missing'
               AND NOT EXISTS (
                 SELECT 1 FROM project_lifecycle_audit_events deleted
                  WHERE deleted.project_id = $1 AND deleted.event_kind = 'object_deleted'
                    AND deleted.details->>'assetId' = missing.details->>'assetId'
               )) AS object_missing_count`,
        [input.job.projectId],
      );
      await client.query('DELETE FROM term_version_commands WHERE project_id = $1', [input.job.projectId]);
      await client.query('DELETE FROM term_draft_commands WHERE project_id = $1', [input.job.projectId]);
      await client.query('DELETE FROM term_extraction_commands WHERE project_id = $1', [input.job.projectId]);
      await client.query('UPDATE term_drafts SET base_term_version_id = NULL WHERE project_id = $1', [input.job.projectId]);
      await client.query(
        `DELETE FROM term_version_items
          WHERE term_version_id IN (SELECT id FROM term_versions WHERE project_id = $1)`,
        [input.job.projectId],
      );
      await client.query('DELETE FROM term_versions WHERE project_id = $1', [input.job.projectId]);
      await client.query(
        `DELETE FROM term_decision_events
          WHERE draft_id IN (SELECT id FROM term_drafts WHERE project_id = $1)`,
        [input.job.projectId],
      );
      await client.query(
        `DELETE FROM term_evidence
          WHERE candidate_id IN (
            SELECT candidate.id FROM term_candidates candidate
            JOIN term_drafts draft ON draft.id = candidate.draft_id
            WHERE draft.project_id = $1
          )`,
        [input.job.projectId],
      );
      await client.query(
        `DELETE FROM term_candidates
          WHERE draft_id IN (SELECT id FROM term_drafts WHERE project_id = $1)`,
        [input.job.projectId],
      );
      await client.query('DELETE FROM term_extraction_runs WHERE project_id = $1', [input.job.projectId]);
      await client.query('DELETE FROM term_drafts WHERE project_id = $1', [input.job.projectId]);
      await client.query('DELETE FROM term_cues WHERE project_id = $1', [input.job.projectId]);
      await client.query('DELETE FROM material_manifests WHERE project_id = $1', [input.job.projectId]);
      await client.query('DELETE FROM upload_sessions WHERE project_id = $1', [input.job.projectId]);
      await client.query('DELETE FROM assets WHERE project_id = $1', [input.job.projectId]);
      await client.query('DELETE FROM project_commands WHERE project_id = $1', [input.job.projectId]);
      await client.query('DELETE FROM project_lifecycle_commands WHERE project_id = $1', [input.job.projectId]);
      await client.query('DELETE FROM project_lifecycle_audit_events WHERE project_id = $1', [input.job.projectId]);
      await client.query(
        `INSERT INTO project_purge_tombstones
           (project_id, cleanup_job_id, recycled_at, purged_at, asset_count,
            object_deleted_count, object_missing_count, terminated_upload_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [input.job.projectId, input.job.id, input.job.createdAt, input.now,
          Number(counts.rows[0]?.asset_count ?? 0), Number(counts.rows[0]?.object_deleted_count ?? 0),
          Number(counts.rows[0]?.object_missing_count ?? 0), Number(counts.rows[0]?.terminated_count ?? 0)],
      );
      await client.query(
        `UPDATE projects
            SET name = '[已清理项目]', workflow_status = 'draft', lifecycle_status = 'purged',
                recycle_expires_at = NULL, version = version + 1,
                updated_at = $2, created_by = 'system', updated_by = 'cleanup-worker'
          WHERE id = $1`,
        [input.job.projectId, input.now],
      );
      await client.query(
        `UPDATE cleanup_jobs
            SET status = 'completed', lease_owner = NULL, lease_expires_at = NULL,
                next_attempt_at = NULL, last_error = NULL,
                completed_at = $3, updated_at = $3
          WHERE id = $1 AND lease_owner = $2`,
        [input.job.id, input.workerId, input.now],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async failCleanupJob(input: {
    job: ClaimedCleanupJob;
    workerId: string;
    now: Date;
    nextAttemptAt: Date;
    maxAttempts: number;
    error: string;
  }) {
    const terminal = input.job.attemptCount >= input.maxAttempts;
    const result = await this.pool.query(
      `UPDATE cleanup_jobs
          SET status = $3, lease_owner = NULL, lease_expires_at = NULL,
              next_attempt_at = $4, last_error = $5, updated_at = $6
        WHERE id = $1 AND lease_owner = $2 AND status = 'leased'`,
      [input.job.id, input.workerId, terminal ? 'failed' : 'retryable',
        terminal ? null : input.nextAttemptAt, input.error, input.now],
    );
    if (result.rowCount) {
      await this.recordAudit(input.job.projectId, 'cleanup_failed', {
        attemptCount: input.job.attemptCount,
        terminal,
        error: input.error,
      }, input.now);
    }
  }
}
