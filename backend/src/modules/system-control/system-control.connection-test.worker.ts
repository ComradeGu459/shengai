import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { DatabasePool } from '../../database/pool.js';
import type { AsrAdapterRegistry } from '../asr/asr-adapter-registry.js';
import type { ScreenTextAdapterRegistry } from '../screen-text/screen-text.adapter-registry.js';
import type { SystemControlEngineCapability, SystemControlTermRuntimeConfig } from '@qimao-terms-cloud/contracts';
import { resolveRegisteredEngine, runRegisteredProbe, toCapabilitiesSnapshot, type RegisteredEngine } from './system-control.engine-registry.js';

export interface SystemControlConnectionTestWorkerConfig { leaseMs: number; pollIntervalMs: number }
export const systemControlConnectionTestWorkerConfig: SystemControlConnectionTestWorkerConfig = { leaseMs: 30_000, pollIntervalMs: 500 };
const MAX_EXPIRED_SWEEP = 100;

export type SystemControlConnectionTestClaim = {
  testRunId: string; deploymentVersionId: string; capability: SystemControlEngineCapability;
  executionKind: 'cloud_api' | 'self_hosted_worker'; adapterKey: string; workerId: string; attemptNumber: number;
};

export type SystemControlProbeResult =
  | { status: 'succeeded'; latencyMs?: number; capabilitiesSnapshot?: ReturnType<typeof toCapabilitiesSnapshot> }
  | { status: 'failed' | 'unknown'; reasonCode: string; reasonMessage: string; latencyMs?: number };

export type SystemControlProbe = (input: { engine: RegisteredEngine; claim: SystemControlConnectionTestClaim }) => Promise<SystemControlProbeResult>;

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

export class SystemControlConnectionTestWorker {
  constructor(
    private readonly pool: DatabasePool,
    private readonly registries: { asr: AsrAdapterRegistry; screenText: ScreenTextAdapterRegistry },
    private readonly config: SystemControlConnectionTestWorkerConfig = systemControlConnectionTestWorkerConfig,
    private readonly options: { workerId?: string; clock?: () => Date; probe?: SystemControlProbe } = {},
  ) {}

  private now() { return this.options.clock?.() ?? new Date(); }
  private workerId() { return this.options.workerId ?? `system-control-test-${randomUUID()}`; }

  private async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await callback(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  /** 只领取 queued；过期 running 由 sweep 原子终结，不会重新创建 Attempt。 */
  async claimOne(): Promise<SystemControlConnectionTestClaim | null> {
    const now = this.now(); const workerId = this.workerId(); const expires = new Date(now.getTime() + Math.max(1, this.config.leaseMs));
    return this.transaction(async (client) => {
      const rows = await client.query<{ id: string; deployment_version_id: string; capability: SystemControlConnectionTestClaim['capability']; execution_kind: SystemControlConnectionTestClaim['executionKind']; adapter_key: string; attempt_count: number }>(`SELECT id,deployment_version_id,capability,execution_kind,adapter_key,attempt_count
        FROM connection_test_runs WHERE status = 'queued' ORDER BY queued_at, id LIMIT 1 FOR UPDATE SKIP LOCKED`, []);
      const row = rows.rows[0]; if (!row) return null;
      const attemptNumber = row.attempt_count + 1;
      await client.query(`UPDATE connection_test_runs SET status = 'running', lease_owner = $2, lease_expires_at = $3,
        attempt_count = $4, started_at = COALESCE(started_at, $1), updated_at = $1 WHERE id = $5 AND status = 'queued'`, [now, workerId, expires, attemptNumber, row.id]);
      await client.query(`INSERT INTO connection_test_attempts(test_run_id,attempt_number,status,started_at) VALUES($1,$2,'running',$3)`, [row.id, attemptNumber, now]);
      return { testRunId: row.id, deploymentVersionId: row.deployment_version_id, capability: row.capability, executionKind: row.execution_kind, adapterKey: row.adapter_key, workerId, attemptNumber };
    });
  }

  /** 将过期运行一次性结算为 unknown，并同步终结当前 Attempt。 */
  async sweepExpired(): Promise<string[]> {
    return this.transaction(async (client) => {
      const now = this.now();
      const rows = await client.query<{ id: string }>(`UPDATE connection_test_runs SET status = 'unknown', lease_owner = NULL, lease_expires_at = NULL,
        reason_code = 'TEST_LEASE_EXPIRED', reason_message = '连接测试租约已过期，结果未知。', completed_at = $1, updated_at = $1
        WHERE id IN (SELECT id FROM connection_test_runs WHERE status = 'running' AND lease_expires_at <= $1
          ORDER BY lease_expires_at ASC, id ASC LIMIT ${MAX_EXPIRED_SWEEP} FOR UPDATE SKIP LOCKED) RETURNING id`, [now]);
      for (const row of rows.rows) {
        const attempt = await client.query(`UPDATE connection_test_attempts SET status = 'unknown', reason_code = 'TEST_LEASE_EXPIRED', reason_message = '连接测试租约已过期，结果未知。', completed_at = $2
          WHERE test_run_id = $1 AND status = 'running'`, [row.id, now]);
        if (attempt.rowCount !== 1) throw new Error('连接测试 Attempt 过期结算不一致。');
      }
      return rows.rows.map((row) => row.id);
    });
  }

  private async finalize(claim: SystemControlConnectionTestClaim, result: SystemControlProbeResult) {
    return this.transaction(async (client) => {
      const completed = this.now();
      const update = await client.query(`UPDATE connection_test_runs SET status = $1, lease_owner = NULL, lease_expires_at = NULL,
        latency_ms = $2, capabilities_snapshot = $3, reason_code = $4, reason_message = $5, completed_at = $6, updated_at = $6
        WHERE id = $7 AND status = 'running' AND lease_owner = $8 AND lease_expires_at > $6`, [result.status, result.latencyMs ?? null,
        result.status === 'succeeded' ? (result.capabilitiesSnapshot ?? null) : null,
        result.status === 'succeeded' ? null : result.reasonCode, result.status === 'succeeded' ? null : result.reasonMessage,
        completed, claim.testRunId, claim.workerId]);
      if (update.rowCount !== 1) return false;
      const attempt = await client.query(`UPDATE connection_test_attempts SET status = $1, latency_ms = $2, reason_code = $3, reason_message = $4, completed_at = $5
        WHERE test_run_id = $6 AND attempt_number = $7 AND status = 'running'`, [result.status, result.latencyMs ?? null,
        result.status === 'succeeded' ? null : result.reasonCode, result.status === 'succeeded' ? null : result.reasonMessage,
        completed, claim.testRunId, claim.attemptNumber]);
      if (attempt.rowCount !== 1) throw new Error('连接测试 Attempt 终结不一致。');
      return true;
    });
  }

  async runOnce() {
    await this.sweepExpired();
    const claim = await this.claimOne(); if (!claim) return { processed: false as const };
    const startedAt = this.now();
    try {
      const version = await this.pool.query<{ capabilities_snapshot: any; config_digest: string; model: string; runtime_config: SystemControlTermRuntimeConfig | null }>('SELECT capabilities_snapshot,config_digest,model,runtime_config FROM engine_deployment_versions WHERE id = $1', [claim.deploymentVersionId]);
      const persisted = version.rows[0]; if (!persisted) throw new Error('连接测试版本不存在。');
      const engine = resolveRegisteredEngine(this.registries, claim.capability, claim.executionKind, claim.adapterKey, persisted.runtime_config ?? undefined, persisted.model);
      const snapshot = toCapabilitiesSnapshot(engine);
      if (persisted.capabilities_snapshot?.descriptorDigest !== snapshot.descriptorDigest
        || persisted.capabilities_snapshot?.provider !== snapshot.provider
        || persisted.capabilities_snapshot?.adapterKey !== snapshot.adapterKey
        || persisted.capabilities_snapshot?.capability !== snapshot.capability
        || persisted.capabilities_snapshot?.executionKind !== snapshot.executionKind
        || persisted.capabilities_snapshot?.model !== snapshot.model
        || persisted.capabilities_snapshot?.language !== snapshot.language
        || !/^[0-9a-f]{64}$/.test(persisted.config_digest)) throw new Error('注册适配器描述与已保存能力快照不一致。');
      const probe = this.options.probe ?? (async ({ engine: registered }) => runRegisteredProbe(registered));
      const result = await probe({ engine, claim });
      const completedResult = result.status === 'succeeded' ? { ...result, capabilitiesSnapshot: result.capabilitiesSnapshot ?? snapshot, latencyMs: result.latencyMs ?? Math.max(0, this.now().getTime() - startedAt.getTime()) } : { ...result, latencyMs: result.latencyMs ?? Math.max(0, this.now().getTime() - startedAt.getTime()) };
      const finalized = await this.finalize(claim, completedResult);
      return finalized ? { processed: true as const, testRunId: claim.testRunId, status: completedResult.status } : { processed: true as const, testRunId: claim.testRunId, status: 'lease_lost' as const };
    } catch (error) {
      const failed = await this.finalize(claim, { status: 'failed', reasonCode: 'CONNECTION_TEST_FAILED', reasonMessage: redactedReason(error), latencyMs: Math.max(0, this.now().getTime() - startedAt.getTime()) });
      return failed ? { processed: true as const, testRunId: claim.testRunId, status: 'failed' as const } : { processed: true as const, testRunId: claim.testRunId, status: 'lease_lost' as const };
    }
  }

  async markExpiredUnknown(testRunId: string) {
    const ids = await this.sweepExpired();
    return ids.includes(testRunId);
  }

  async runUntilStopped(signal: AbortSignal) {
    const pollIntervalMs = Math.min(Math.max(this.config.pollIntervalMs, 50), 60_000);
    while (!signal.aborted) { const result = await this.runOnce(); if (!result.processed) await waitForPoll(pollIntervalMs, signal); }
  }
}
