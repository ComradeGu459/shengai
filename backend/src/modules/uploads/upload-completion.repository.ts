import type { QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';

export type UploadCompletionJobStage =
  | 'queued'
  | 'write_in_flight'
  | 'verifying'
  | 'reconciliation_required'
  | 'binding';

export type UploadCompletionJobStatus =
  | 'scheduled'
  | 'leased'
  | 'retryable'
  | 'failed'
  | 'completed'
  | 'cancelled';

export interface UploadCompletionJob {
  id: string;
  uploadSessionId: string;
  idempotencyKey: string;
  requestHash: string;
  status: UploadCompletionJobStatus;
  stage: UploadCompletionJobStage;
  attemptCount: number;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  nextAttemptAt: Date;
  lastErrorCode: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

interface JobRow extends QueryResultRow {
  id: string;
  upload_session_id: string;
  idempotency_key: string;
  request_hash: string;
  status: UploadCompletionJobStatus;
  stage: UploadCompletionJobStage;
  attempt_count: number;
  lease_owner: string | null;
  lease_expires_at: Date | null;
  next_attempt_at: Date;
  last_error_code: string | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  project_id?: string;
  session_status?: string;
  lifecycle_status?: string;
}

export interface ClaimedUploadCompletion {
  job: UploadCompletionJob;
  projectId: string;
  uploadSessionId: string;
  objectKey: string;
  sessionStatus: string;
  lifecycleStatus: string;
}

export interface UploadCompletionJobTransition {
  applied: boolean;
  status: UploadCompletionJobStatus | null;
}

const toJob = (row: JobRow): UploadCompletionJob => ({
  id: row.id,
  uploadSessionId: row.upload_session_id,
  idempotencyKey: row.idempotency_key,
  requestHash: row.request_hash,
  status: row.status,
  stage: row.stage,
  attemptCount: row.attempt_count,
  leaseOwner: row.lease_owner,
  leaseExpiresAt: row.lease_expires_at,
  nextAttemptAt: row.next_attempt_at,
  lastErrorCode: row.last_error_code,
  lastError: row.last_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
});

export class UploadCompletionRepository {
  constructor(private readonly pool: DatabasePool) {}

  async claim(input: {
    workerId: string;
    now: Date;
    leaseExpiresAt: Date;
  }): Promise<ClaimedUploadCompletion | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<JobRow>(
        `SELECT job.*, session.project_id, session.status AS session_status,
                session.object_key,
                project.lifecycle_status
           FROM upload_completion_jobs job
           JOIN upload_sessions session ON session.id = job.upload_session_id
           JOIN projects project ON project.id = session.project_id
          WHERE (
              (job.status IN ('scheduled', 'retryable') AND job.next_attempt_at <= $1)
              OR (job.status = 'leased' AND job.lease_expires_at <= $1)
            )
          ORDER BY job.next_attempt_at ASC, job.id ASC
          LIMIT 1
          FOR UPDATE OF job, session, project SKIP LOCKED`,
        [input.now],
      );
      const row = result.rows[0];
      if (!row) {
        await client.query('COMMIT');
        return null;
      }
      const claimed = await client.query<JobRow>(
        `UPDATE upload_completion_jobs
            SET status = 'leased', attempt_count = attempt_count + 1,
                lease_owner = $2, lease_expires_at = $3,
                last_error_code = NULL, last_error = NULL, updated_at = $4
          WHERE id = $1
        RETURNING *`,
        [row.id, input.workerId, input.leaseExpiresAt, input.now],
      );
      await client.query('COMMIT');
      const updated = claimed.rows[0];
      if (!updated) throw new Error('完成任务领取后未返回记录。');
      return {
        job: toJob(updated),
        projectId: row.project_id!,
        uploadSessionId: row.upload_session_id,
        objectKey: String((row as JobRow & { object_key: string }).object_key),
        sessionStatus: row.session_status!,
        lifecycleStatus: row.lifecycle_status!,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async prepareExternalStep(input: { jobId: string; workerId: string; now: Date }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<JobRow>(
        `SELECT job.*, session.project_id, session.status AS session_status,
                session.storage_upload_id, session.object_key,
                project.lifecycle_status
           FROM upload_completion_jobs job
           JOIN upload_sessions session ON session.id = job.upload_session_id
           JOIN projects project ON project.id = session.project_id
          WHERE job.id = $1
          FOR UPDATE OF job, session, project`,
        [input.jobId],
      );
      const row = result.rows[0];
      if (!row || row.status !== 'leased' || row.lease_owner !== input.workerId
        || !row.lease_expires_at || row.lease_expires_at <= input.now) {
        await client.query('COMMIT');
        return { active: false as const, reason: 'lease_lost' as const };
      }
      if (row.session_status === 'completed') {
        await client.query('COMMIT');
        return { active: false as const, reason: 'already_completed' as const };
      }
      if (row.lifecycle_status !== 'active' || row.session_status !== 'verifying') {
        await client.query(
          `UPDATE upload_completion_jobs
              SET status = 'cancelled', lease_owner = NULL, lease_expires_at = NULL,
                  last_error_code = 'UPLOAD_COMPLETION_CANCELLED',
                  last_error = '项目或上传会话已进入终态。', completed_at = $2, updated_at = $2
            WHERE id = $1`,
          [input.jobId, input.now],
        );
        await client.query('COMMIT');
        return { active: false as const, reason: 'not_active' as const };
      }
      if (row.stage === 'queued') {
        await client.query(
          `UPDATE upload_completion_jobs SET stage = 'write_in_flight', updated_at = $2 WHERE id = $1`,
          [input.jobId, input.now],
        );
      }
      await client.query('COMMIT');
      return {
        active: true as const,
        stage: row.stage === 'queued' ? 'write_in_flight' as const : row.stage,
        shouldComplete: row.stage === 'queued',
        uploadSessionId: row.upload_session_id,
        storageUploadId: String((row as JobRow & { storage_upload_id: string }).storage_upload_id),
        objectKey: String((row as JobRow & { object_key: string }).object_key),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async setStage(input: { jobId: string; workerId: string; stage: UploadCompletionJobStage; now: Date }) {
    const result = await this.pool.query(
      `UPDATE upload_completion_jobs
          SET stage = $3, updated_at = $4
        WHERE id = $1 AND status = 'leased' AND lease_owner = $2`,
      [input.jobId, input.workerId, input.stage, input.now],
    );
    if (result.rowCount !== 1) throw new Error('完成任务租约已经失效。');
  }

  async markRetryable(input: {
    job: UploadCompletionJob;
    workerId: string;
    stage: UploadCompletionJobStage;
    code: string;
    error: string;
    now: Date;
    nextAttemptAt: Date;
    maxAttempts: number;
  }): Promise<UploadCompletionJobTransition & { terminal: boolean }> {
    const terminal = input.job.attemptCount >= input.maxAttempts;
    const result = await this.pool.query<{ status: UploadCompletionJobStatus }>(
      `UPDATE upload_completion_jobs
          SET status = $3::upload_completion_job_status, stage = $4::upload_completion_stage,
              lease_owner = NULL, lease_expires_at = NULL,
              last_error_code = $5, last_error = $6,
              next_attempt_at = $7,
              completed_at = CASE WHEN $3::upload_completion_job_status = 'failed'::upload_completion_job_status THEN $8 ELSE completed_at END,
              updated_at = $8
        WHERE id = $1 AND status = 'leased' AND lease_owner = $2
        RETURNING status`,
      [input.job.id, input.workerId, terminal ? 'failed' : 'retryable', input.stage,
        input.code, input.error, input.nextAttemptAt, input.now],
    );
    const status = result.rows[0]?.status ?? null;
    return { applied: result.rowCount === 1, status, terminal: status === 'failed' };
  }

  async markFailed(input: { jobId: string; workerId: string; stage: UploadCompletionJobStage; code: string; error: string; now: Date }): Promise<UploadCompletionJobTransition> {
    const result = await this.pool.query<{ status: UploadCompletionJobStatus }>(
      `UPDATE upload_completion_jobs
          SET status = 'failed', stage = $3, lease_owner = NULL, lease_expires_at = NULL,
              last_error_code = $4, last_error = $5, completed_at = $6, updated_at = $6
        WHERE id = $1 AND status = 'leased' AND lease_owner = $2
        RETURNING status`,
      [input.jobId, input.workerId, input.stage, input.code, input.error, input.now],
    );
    return { applied: result.rowCount === 1, status: result.rows[0]?.status ?? null };
  }

  async markCompleted(input: { jobId: string; workerId: string; now: Date }): Promise<UploadCompletionJobTransition> {
    const result = await this.pool.query<{ status: UploadCompletionJobStatus }>(
      `UPDATE upload_completion_jobs
          SET status = 'completed', stage = 'binding', lease_owner = NULL,
              lease_expires_at = NULL, completed_at = $3, updated_at = $3
        WHERE id = $1 AND status = 'leased' AND lease_owner = $2
        RETURNING status`,
      [input.jobId, input.workerId, input.now],
    );
    return { applied: result.rowCount === 1, status: result.rows[0]?.status ?? null };
  }

  async markCancelled(input: { jobId: string; workerId: string; now: Date; code: string; error: string }): Promise<UploadCompletionJobTransition> {
    const result = await this.pool.query<{ status: UploadCompletionJobStatus }>(
      `UPDATE upload_completion_jobs
          SET status = 'cancelled', lease_owner = NULL, lease_expires_at = NULL,
              last_error_code = $3, last_error = $4, completed_at = $5, updated_at = $5
        WHERE id = $1 AND status = 'leased' AND lease_owner = $2
        RETURNING status`,
      [input.jobId, input.workerId, input.code, input.error, input.now],
    );
    return { applied: result.rowCount === 1, status: result.rows[0]?.status ?? null };
  }
}
