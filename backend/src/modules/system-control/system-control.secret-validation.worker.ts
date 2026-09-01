import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { DatabasePool } from '../../database/pool.js';
import type { SystemControlSecretProvider, SystemControlSecretValidationResult } from './system-control.secret-provider.js';

export interface SystemControlSecretValidationWorkerConfig { leaseMs: number; pollIntervalMs: number }
export const systemControlSecretValidationWorkerConfig: SystemControlSecretValidationWorkerConfig = { leaseMs: 30_000, pollIntervalMs: 500 };
const MAX_EXPIRED_SWEEP = 100;

type Claim = { validationRunId: string; versionId: string; candidateId: string; referenceDigest: string; workerId: string; attemptNumber: number };

const waitForPoll = (delayMs: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) return resolve();
  const onAbort = () => { clearTimeout(timer); resolve(); };
  const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, delayMs);
  signal.addEventListener('abort', onAbort, { once: true });
});

const redactedReason = (error: unknown) => {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/(?:secret|token|password|authorization|connectionstring|objectkey|url)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]').slice(0, 240);
};

export class SystemControlSecretValidationWorker {
  constructor(
    private readonly pool: DatabasePool,
    private readonly provider: SystemControlSecretProvider,
    private readonly config: SystemControlSecretValidationWorkerConfig = systemControlSecretValidationWorkerConfig,
    private readonly options: { workerId?: string; clock?: () => Date } = {},
  ) {}

  private now() { return this.options.clock?.() ?? new Date(); }
  private workerId() { return this.options.workerId ?? `system-control-secret-${randomUUID()}`; }

  private async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await callback(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  async claimOne(): Promise<Claim | null> {
    const now = this.now(); const workerId = this.workerId(); const expires = new Date(now.getTime() + Math.max(1, this.config.leaseMs));
    return this.transaction(async (client) => {
      const result = await client.query<{ id: string; secret_reference_version_id: string; attempt_count: number; candidate_id: string; reference_digest: string }>(`SELECT r.id,r.secret_reference_version_id,r.attempt_count,v.candidate_id,v.reference_digest FROM system_secret_validation_runs r JOIN system_secret_reference_versions v ON v.id=r.secret_reference_version_id WHERE r.status='queued' ORDER BY r.queued_at,r.id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      const row = result.rows[0]; if (!row) return null;
      const attemptNumber = row.attempt_count + 1;
      const update = await client.query(`UPDATE system_secret_validation_runs SET status='running',lease_owner=$2,lease_expires_at=$3,attempt_count=$4,started_at=COALESCE(started_at,$1),updated_at=$1 WHERE id=$5 AND status='queued'`, [now, workerId, expires, attemptNumber, row.id]);
      if (update.rowCount !== 1) return null;
      await client.query(`INSERT INTO system_secret_validation_attempts(validation_run_id,attempt_number,status,started_at) VALUES($1,$2,'running',$3)`, [row.id, attemptNumber, now]);
      return { validationRunId: row.id, versionId: row.secret_reference_version_id, candidateId: row.candidate_id, referenceDigest: row.reference_digest, workerId, attemptNumber };
    });
  }

  async sweepExpired(): Promise<string[]> {
    return this.transaction(async (client) => {
      const now = this.now();
      const rows = await client.query<{ id: string; secret_reference_version_id: string }>(`UPDATE system_secret_validation_runs SET status='unknown',lease_owner=NULL,lease_expires_at=NULL,reason_code='SECRET_VALIDATION_LEASE_EXPIRED',reason_message='Secret 校验租约已过期，结果未知。',completed_at=$1,updated_at=$1 WHERE id IN (SELECT id FROM system_secret_validation_runs WHERE status='running' AND lease_expires_at <= $1 ORDER BY lease_expires_at,id LIMIT ${MAX_EXPIRED_SWEEP} FOR UPDATE SKIP LOCKED) RETURNING id,secret_reference_version_id`, [now]);
      for (const row of rows.rows) {
        const attempt = await client.query(`UPDATE system_secret_validation_attempts SET status='unknown',reason_code='SECRET_VALIDATION_LEASE_EXPIRED',reason_message='Secret 校验租约已过期，结果未知。',completed_at=$2 WHERE validation_run_id=$1 AND status='running'`, [row.id, now]);
        if (attempt.rowCount !== 1) throw new Error('Secret 校验 Attempt 过期结算不一致。');
        await client.query("INSERT INTO system_secret_reference_status_events(secret_reference_version_id,status,request_id,actor_subject,created_at) VALUES($1,'unknown',$2,'system-control-secret-worker',$3)", [row.secret_reference_version_id, row.id, now]);
      }
      return rows.rows.map((row) => row.id);
    });
  }

  private async finalize(claim: Claim, result: SystemControlSecretValidationResult) {
    return this.transaction(async (client) => {
      const completed = this.now();
      const update = await client.query(`UPDATE system_secret_validation_runs SET status=$1,lease_owner=NULL,lease_expires_at=NULL,latency_ms=$2,reason_code=$3,reason_message=$4,completed_at=$5,updated_at=$5 WHERE id=$6 AND status='running' AND lease_owner=$7 AND lease_expires_at>$5`, [result.status, result.latencyMs, result.status === 'succeeded' ? null : result.reasonCode, result.status === 'succeeded' ? null : result.reasonMessage, completed, claim.validationRunId, claim.workerId]);
      if (update.rowCount !== 1) return false;
      const attempt = await client.query(`UPDATE system_secret_validation_attempts SET status=$1,latency_ms=$2,reason_code=$3,reason_message=$4,completed_at=$5 WHERE validation_run_id=$6 AND attempt_number=$7 AND status='running'`, [result.status, result.latencyMs, result.status === 'succeeded' ? null : result.reasonCode, result.status === 'succeeded' ? null : result.reasonMessage, completed, claim.validationRunId, claim.attemptNumber]);
      if (attempt.rowCount !== 1) throw new Error('Secret 校验 Attempt 终结不一致。');
      const referenceStatus = result.status === 'succeeded' ? 'available' : result.status === 'failed' ? 'validation_failed' : 'unknown';
      await client.query('INSERT INTO system_secret_reference_status_events(secret_reference_version_id,status,request_id,actor_subject,created_at) VALUES($1,$2,$3,$4,$5)', [claim.versionId, referenceStatus, claim.validationRunId, 'system-control-secret-worker', completed]);
      return true;
    });
  }

  async runOnce() {
    await this.sweepExpired();
    const claim = await this.claimOne(); if (!claim) return { processed: false as const };
    const started = this.now();
    try {
      const resolved = await this.provider.resolve(claim.candidateId);
      if (!resolved || resolved.referenceDigest !== claim.referenceDigest) throw new Error('Secret provider 描述与已保存版本不一致。');
      const result = await this.provider.validate(resolved);
      const normalized = { ...result, latencyMs: result.latencyMs ?? Math.max(0, this.now().getTime() - started.getTime()) };
      const finalized = await this.finalize(claim, normalized);
      return finalized ? { processed: true as const, validationRunId: claim.validationRunId, status: normalized.status } : { processed: true as const, validationRunId: claim.validationRunId, status: 'lease_lost' as const };
    } catch (error) {
      const failed = await this.finalize(claim, { status: 'failed', latencyMs: Math.max(0, this.now().getTime() - started.getTime()), reasonCode: 'SECRET_VALIDATION_FAILED', reasonMessage: redactedReason(error) });
      return failed ? { processed: true as const, validationRunId: claim.validationRunId, status: 'failed' as const } : { processed: true as const, validationRunId: claim.validationRunId, status: 'lease_lost' as const };
    }
  }

  async runUntilStopped(signal: AbortSignal) {
    const pollIntervalMs = Math.min(Math.max(this.config.pollIntervalMs, 50), 60_000);
    while (!signal.aborted) { const result = await this.runOnce(); if (!result.processed) await waitForPoll(pollIntervalMs, signal); }
  }
}
