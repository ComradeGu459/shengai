import { createHash } from 'node:crypto';
import type {
  SystemControlCreateRoutingPolicyBody,
  SystemControlRoutingCommand,
  SystemControlRoutingImpact,
  SystemControlRoutingList,
  SystemControlRoutingListQuery,
  SystemControlRoutingPolicyVersion,
  SystemControlRoutingPool,
  SystemControlRoutingStatus,
  SystemControlRoutingWorkflowStage,
  SystemControlRoutingAuditList,
  SystemControlRoutingAuditListQuery,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient } from 'pg';
import type { DatabasePool } from '../../database/pool.js';
import type { AsrAdapterRegistry } from '../asr/asr-adapter-registry.js';
import type { ScreenTextAdapterRegistry } from '../screen-text/screen-text.adapter-registry.js';
import type { TermExtractionAdapter } from '../terms/term-extraction.js';
import { resolveRegisteredEngine } from './system-control.engine-registry.js';
import { routingConflict, routingInvalid, routingNotFound } from './system-control.routing.errors.js';

type Registries = { asr: AsrAdapterRegistry; screenText: ScreenTextAdapterRegistry; terms?: TermExtractionAdapter };

/** 术语 Worker 消费的控制面快照；只包含 Secret 引用，不包含 Secret 值。 */
export type TermsRouteTargetSnapshot = Readonly<{
  routingVersionId: string;
  routingTargetId: string;
  deploymentVersionId: string;
  priority: number;
  role: 'preferred' | 'standard' | 'emergency';
  adapterKey: string;
  executionKind: 'cloud_api';
  provider: string;
  model: string;
  runtimeConfig: Readonly<Record<string, unknown>>;
  adapterConfig: Readonly<Record<string, unknown>>;
  configDigest: string;
  secretReferenceVersionId: string | null;
  secretReferenceSummary: Readonly<Record<string, unknown>>;
}>;

export type TermsRouteSnapshot = Readonly<{
  routingVersionId: string;
  routeDigest: string;
  configDigest: string;
  targets: readonly TermsRouteTargetSnapshot[];
}>;
type RoutingRow = {
  id: string;
  environment: 'development';
  workflow_stage: SystemControlRoutingWorkflowStage;
  version: number;
  created_at: Date;
  updated_at: Date;
  status: SystemControlRoutingStatus;
  impact: SystemControlRoutingImpact | null;
};
type PoolRow = {
  pool_id: SystemControlRoutingPool['poolId'];
  routing_target_id: string | null;
  deployment_version_id: string | null;
  priority: number | null;
  role: 'preferred' | 'standard' | 'emergency' | null;
  max_concurrent_jobs: number | null;
  per_project_max: number | null;
  queue_limit: number | null;
};
type StoredCommand = {
  command_kind: RoutingCommandKind;
  request_hash: string;
  idempotency_key: string;
  stable_command_key: string;
  resource_id: string | null;
  response_snapshot: SystemControlRoutingCommandSnapshot | null;
};
type RoutingAuditRow = {
  id: string;
  action: SystemControlRoutingAuditList['items'][number]['action'];
  resource_id: string;
  actor_subject: string;
  request_id: string;
  result: string;
  created_at: Date;
};
type SystemControlRoutingCommandSnapshot = {
  policy: SystemControlRoutingPolicyVersion;
  releaseCommandId?: string | null;
};
type RoutingCommandKind =
  | 'routing_create'
  | 'routing_test'
  | 'routing_impact_check'
  | 'routing_approve'
  | 'routing_publish'
  | 'routing_rollback';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const int = (value: unknown, fallback: number) => Number.parseInt(String(value ?? fallback), 10) || fallback;
const keyOf = (value: string | undefined) => {
  const key = value?.trim() ?? '';
  if (!key || key.length > 200 || /[\r\n]/.test(key)) {
    throw routingInvalid('SYSTEM_CONTROL_ROUTING_IDEMPOTENCY_KEY_REUSED', '命令身份必须是非空且不含控制字符的稳定值。', 'use_stable_command_identity');
  }
  return key;
};

const allowedPools = new Set(['asr_api', 'ocr_api', 'ocr_self_hosted_worker', 'terms_api']);

const commandSnapshot = (value: unknown): SystemControlRoutingCommandSnapshot | null => {
  if (!value || typeof value !== 'object' || !('policy' in value)) return null;
  return value as SystemControlRoutingCommandSnapshot;
};

export class SystemControlRoutingService {
  constructor(private readonly pool: DatabasePool, private readonly registries: Registries) {}

  private async loadPools(client: PoolClient | DatabasePool, routingVersionId: string): Promise<SystemControlRoutingPool[]> {
    const result = await client.query<PoolRow>(`SELECT p.pool_id, t.routing_target_id, t.deployment_version_id, t.priority, t.role, t.max_concurrent_jobs, t.per_project_max, t.queue_limit FROM routing_policy_pools p LEFT JOIN routing_policy_targets t ON t.routing_version_id=p.routing_version_id AND t.pool_id=p.pool_id WHERE p.routing_version_id = $1 ORDER BY t.priority NULLS LAST, p.pool_id`, [routingVersionId]);
    const groups = new Map<string, SystemControlRoutingPool['targets']>();
    for (const row of result.rows) {
      const targets = groups.get(row.pool_id) ?? [];
      if (row.routing_target_id && row.deployment_version_id && row.priority !== null && row.role && row.max_concurrent_jobs !== null && row.per_project_max !== null && row.queue_limit !== null) targets.push({
        routingTargetId: row.routing_target_id,
        deploymentVersionId: row.deployment_version_id,
        priority: Number(row.priority),
        role: row.role,
        maxConcurrentJobs: Number(row.max_concurrent_jobs),
        perProjectMax: Number(row.per_project_max),
        queueLimit: Number(row.queue_limit),
      });
      groups.set(row.pool_id, targets);
    }
    return [...groups.entries()].map(([poolId, targets]) => ({ poolId: poolId as SystemControlRoutingPool['poolId'], targets }));
  }

  private async loadOne(client: PoolClient | DatabasePool, routingVersionId: string): Promise<SystemControlRoutingPolicyVersion> {
    const row = await client.query<RoutingRow>(`SELECT v.id, v.environment, v.workflow_stage, v.version, v.created_at, v.created_at AS updated_at, COALESCE(s.status, 'draft') AS status, i.snapshot AS impact FROM routing_policy_versions v LEFT JOIN LATERAL (SELECT status FROM routing_policy_status_events WHERE routing_version_id = v.id ORDER BY created_at DESC, id DESC LIMIT 1) s ON TRUE LEFT JOIN routing_policy_impact_snapshots i ON i.routing_version_id = v.id WHERE v.id = $1`, [routingVersionId]);
    if (!row.rows[0]) throw routingNotFound('路由策略版本不存在。');
    const item = row.rows[0];
    return {
      routingVersionId: item.id,
      environment: item.environment,
      workflowStage: item.workflow_stage,
      version: Number(item.version),
      status: item.status,
      pools: await this.loadPools(client, item.id),
      impact: item.impact ?? null,
      createdAt: new Date(item.created_at).toISOString(),
      updatedAt: new Date(item.updated_at).toISOString(),
    };
  }

  private async policyMeta(client: PoolClient, routingVersionId: string) {
    const result = await client.query<{ environment: 'development'; workflow_stage: SystemControlRoutingWorkflowStage }>(
      'SELECT environment, workflow_stage FROM routing_policy_versions WHERE id = $1', [routingVersionId],
    );
    if (!result.rows[0]) throw routingNotFound('路由策略版本不存在。');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`routing-policy:${routingVersionId}`]);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`routing-pointer:${result.rows[0].environment}:${result.rows[0].workflow_stage}`]);
    return result.rows[0];
  }

  private async lockCommand(client: PoolClient, kind: RoutingCommandKind, stableKey: string, idempotencyKey: string, requestHash: string) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`routing-command:${stableKey}`]);
    const byStable = await client.query<StoredCommand>(`SELECT command_kind,request_hash,idempotency_key,stable_command_key,resource_id,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 FOR UPDATE`, [stableKey]);
    if (byStable.rows[0] && (byStable.rows[0].command_kind !== kind || byStable.rows[0].idempotency_key !== idempotencyKey)) {
      throw routingConflict('SYSTEM_CONTROL_ROUTING_COMMAND_ID_REUSED', '稳定命令身份已经绑定另一幂等键。', 'reload_routing_command');
    }
    const byKey = await client.query<StoredCommand>(`SELECT command_kind,request_hash,idempotency_key,stable_command_key,resource_id,response_snapshot FROM system_control_commands WHERE command_kind=$1 AND idempotency_key=$2 FOR UPDATE`, [kind, idempotencyKey]);
    if (!byKey.rows[0]) return { replay: false as const, stored: null };
    if (byKey.rows[0].request_hash !== requestHash || byKey.rows[0].stable_command_key !== stableKey) {
      throw routingConflict('SYSTEM_CONTROL_ROUTING_IDEMPOTENCY_KEY_REUSED', '同一幂等键不能用于另一条路由命令。', 'retry_with_new_idempotency_key');
    }
    return { replay: true as const, stored: byKey.rows[0] };
  }

  private replaySnapshot(stored: StoredCommand, fallback: SystemControlRoutingPolicyVersion): SystemControlRoutingPolicyVersion {
    return commandSnapshot(stored.response_snapshot)?.policy ?? fallback;
  }

  private async saveCommand(client: PoolClient, kind: RoutingCommandKind, stableKey: string, idempotencyKey: string, requestHash: string, resourceId: string, snapshot: SystemControlRoutingCommandSnapshot) {
    await client.query(`INSERT INTO system_control_commands (command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES ($1,$2,$3,$4,$5,$6)`, [kind, idempotencyKey, stableKey, requestHash, resourceId, JSON.stringify(snapshot)]);
  }

  private async audit(client: PoolClient, input: { actor: string; action: string; resourceId: string; key: string; requestId: string; snapshot: unknown }) {
    await client.query(`INSERT INTO system_control_audit_events (actor_subject,actor_audience,action,resource_type,resource_id,idempotency_key,request_id,result,after_snapshot) VALUES ($1,'system-control',$2,'routing_policy_version',$3,$4,$5,'succeeded',$6)`, [input.actor, input.action, input.resourceId, input.key, input.requestId, JSON.stringify(input.snapshot)]);
  }

  private async assertDeployment(client: PoolClient, id: string, expectedCapability: SystemControlRoutingWorkflowStage) {
    const result = await client.query<{ capability: SystemControlRoutingWorkflowStage; execution_kind: 'cloud_api' | 'self_hosted_worker'; adapter_key: string; status: 'enabled' | 'disabled'; model: string; runtime_config: unknown }>(`SELECT d.capability, d.execution_kind, d.adapter_key, d.status, v.model, v.runtime_config FROM engine_deployment_versions v JOIN engine_deployments d ON d.id = v.deployment_id WHERE v.id = $1`, [id]);
    const row = result.rows[0];
    if (!row || row.capability !== expectedCapability || row.status !== 'enabled') throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', '路由策略引用的部署版本不存在、能力不匹配或已停用。');
    try {
      resolveRegisteredEngine(this.registries, row.capability, row.execution_kind, row.adapter_key, row.runtime_config ?? undefined, row.model);
    } catch {
      throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', '路由策略只能引用启动时已登记的零网络适配器。');
    }
  }

  private async validatePools(client: PoolClient, pools: SystemControlRoutingPool[], workflowStage: SystemControlRoutingWorkflowStage) {
    const expectedPoolIds = workflowStage === 'terms' ? new Set<SystemControlRoutingPool['poolId']>(['terms_api']) : new Set<SystemControlRoutingPool['poolId']>(['asr_api', 'ocr_api', 'ocr_self_hosted_worker']);
    if (pools.length !== expectedPoolIds.size || new Set(pools.map((pool) => pool.poolId)).size !== pools.length || pools.some((pool) => !allowedPools.has(pool.poolId) || !expectedPoolIds.has(pool.poolId))) {
      throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', workflowStage === 'terms' ? 'terms 路由只能表达 terms_api 资源池。' : 'ASR/OCR 路由必须完整表达既有三个资源池且每个池只能出现一次。');
    }
    const allowedTargetPools = workflowStage === 'asr'
      ? new Set<SystemControlRoutingPool['poolId']>(['asr_api'])
      : workflowStage === 'screen_text'
        ? new Set<SystemControlRoutingPool['poolId']>(['ocr_self_hosted_worker', 'ocr_api'])
        : new Set<SystemControlRoutingPool['poolId']>(['terms_api']);
    const allTargets = pools.flatMap((pool) => pool.targets.map((target) => ({ ...target, poolId: pool.poolId })));
    const priorities = allTargets.map((target) => target.priority).sort((a, b) => a - b);
    if (new Set(priorities).size !== priorities.length || priorities.some((value, index) => value !== index + 1)) {
      throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', '同一工作流版本内 priority 必须全局唯一且从1连续递增。');
    }
    const deploymentIds = new Set<string>();
    for (const target of allTargets) {
      if (!allowedTargetPools.has(target.poolId)) {
        if (target.poolId === 'asr_api' && workflowStage === 'screen_text') throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', 'screen_text 只能引用 OCR 目标。');
        if (target.poolId === 'terms_api') throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', 'terms 只能引用 terms_api 目标。');
        throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', '当前工作流只能引用其允许的目标池。');
      }
      if (deploymentIds.has(target.deploymentVersionId)) throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', '同一工作流版本不能重复引用部署版本。');
      deploymentIds.add(target.deploymentVersionId);
      await this.assertDeployment(client, target.deploymentVersionId, workflowStage);
    }
    const count = priorities.length;
    for (const target of allTargets) {
      if (count === 1 && target.role !== 'preferred') throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', '单目标路由只能使用 preferred。');
      if (count === 1) continue;
      if (target.priority === 1 && target.role !== 'preferred') throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', 'priority=1 只能是 preferred。');
      if (target.priority > 1 && target.priority < count && target.role !== 'standard') throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', '中间目标只能是 standard。');
      if (target.priority === count && target.role !== 'standard' && target.role !== 'emergency') throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', '最后一个目标只能是 standard 或 emergency。');
    }
  }

  async create(input: { body: SystemControlCreateRoutingPolicyBody; idempotencyKey: string; requestId: string; actor: string }) {
    const key = keyOf(input.idempotencyKey); const stableKey = input.body.routingVersionId; const requestHash = hash(input.body); const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`routing-stage:${input.body.environment}:${input.body.workflowStage}`]);
      const command = await this.lockCommand(client, 'routing_create', stableKey, key, requestHash);
      if (command.replay) {
        const policy = await this.loadOne(client, command.stored!.resource_id ?? stableKey);
        await client.query('COMMIT');
        return { policy: this.replaySnapshot(command.stored!, policy), replay: true };
      }
      const idReuse = await client.query('SELECT id FROM routing_policy_versions WHERE id = $1', [stableKey]);
      if (idReuse.rows[0]) throw routingConflict('SYSTEM_CONTROL_ROUTING_ID_REUSED', 'routingVersionId 已被使用。', 'use_new_routing_version_id');
      await this.validatePools(client, input.body.pools, input.body.workflowStage);
      const version = await client.query<{ version: number }>('SELECT COALESCE(MAX(version), 0)::int + 1 AS version FROM routing_policy_versions WHERE environment = $1 AND workflow_stage = $2', [input.body.environment, input.body.workflowStage]);
      await client.query('INSERT INTO routing_policy_versions (id,environment,workflow_stage,version) VALUES ($1,$2,$3,$4)', [stableKey, input.body.environment, input.body.workflowStage, version.rows[0]!.version]);
      for (const pool of input.body.pools) {
        await client.query('INSERT INTO routing_policy_pools (routing_version_id,pool_id) VALUES ($1,$2)', [stableKey, pool.poolId]);
        for (const target of pool.targets) await client.query('INSERT INTO routing_policy_targets (routing_version_id,pool_id,routing_target_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [stableKey, pool.poolId, target.routingTargetId, target.deploymentVersionId, target.priority, target.role, target.maxConcurrentJobs, target.perProjectMax, target.queueLimit]);
      }
      await client.query("INSERT INTO routing_policy_status_events (routing_version_id,status,request_id,actor_subject) VALUES ($1,'draft',$2,$3)", [stableKey, input.requestId, input.actor]);
      const policy = await this.loadOne(client, stableKey);
      await this.saveCommand(client, 'routing_create', stableKey, key, requestHash, stableKey, { policy });
      await this.audit(client, { actor: input.actor, action: 'routing_policy_created', resourceId: stableKey, key, requestId: input.requestId, snapshot: input.body });
      await client.query('COMMIT');
      return { policy, replay: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async get(id: string) { return this.loadOne(this.pool, id); }

  async listAuditEvents(query: SystemControlRoutingAuditListQuery): Promise<SystemControlRoutingAuditList> {
    const limit = query.limit ? Number(query.limit) : 50;
    const offset = query.offset ? Number(query.offset) : 0;
    const values: unknown[] = [];
    const filters = [`resource_type = 'routing_policy_version'`, 'resource_id IS NOT NULL'];
    if (query.routingVersionId) { values.push(query.routingVersionId); filters.push(`resource_id = $${values.length}`); }
    if (query.action) { values.push(query.action); filters.push(`action = $${values.length}`); }
    const where = `WHERE ${filters.join(' AND ')}`;
    const total = await this.pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM system_control_audit_events ${where}`, values);
    values.push(limit, offset);
    const rows = await this.pool.query<RoutingAuditRow>(`SELECT id,action,resource_id,actor_subject,request_id,result,created_at
      FROM system_control_audit_events ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return {
      items: rows.rows.map((row) => ({
        eventId: row.id,
        action: row.action,
        routingVersionId: row.resource_id,
        actorSubject: row.actor_subject,
        requestId: row.request_id,
        result: row.result,
        createdAt: row.created_at.toISOString(),
      })),
      total: Number(total.rows[0]?.count ?? 0),
      limit,
      offset,
    };
  }

  async getCommand(commandId: string): Promise<SystemControlRoutingCommand> {
    const result = await this.pool.query<{ command_kind: 'routing_publish' | 'routing_rollback'; stable_command_key: string; resource_id: string; response_snapshot: SystemControlRoutingCommandSnapshot | null }>(`SELECT command_kind,stable_command_key,resource_id,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 AND command_kind IN ('routing_publish','routing_rollback') ORDER BY created_at DESC,id DESC LIMIT 1`, [commandId]);
    const row = result.rows[0];
    if (!row || !row.resource_id) throw routingNotFound('发布或回滚命令不存在。');
    const stored = commandSnapshot(row.response_snapshot);
    const policy = stored?.policy ?? await this.get(row.resource_id);
    return { commandId: row.stable_command_key, commandKind: row.command_kind === 'routing_publish' ? 'publish' : 'rollback', routingVersionId: row.resource_id, releaseCommandId: stored?.releaseCommandId ?? row.stable_command_key, status: 'succeeded', policy };
  }

  async list(query: SystemControlRoutingListQuery): Promise<SystemControlRoutingList> {
    const limit = Math.min(100, Math.max(1, int(query.limit, 50))); const offset = Math.max(0, int(query.offset, 0));
    const values: unknown[] = []; const filters: string[] = [];
    if (query.environment) { values.push(query.environment); filters.push(`v.environment = $${values.length}`); }
    if (query.workflowStage) { values.push(query.workflowStage); filters.push(`v.workflow_stage = $${values.length}`); }
    if (query.status) { values.push(query.status); filters.push(`COALESCE(s.status,'draft') = $${values.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const total = await this.pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM routing_policy_versions v LEFT JOIN LATERAL (SELECT status FROM routing_policy_status_events WHERE routing_version_id=v.id ORDER BY created_at DESC,id DESC LIMIT 1) s ON TRUE ${where}`, values);
    values.push(limit, offset);
    const rows = await this.pool.query<{ id: string }>(`SELECT v.id FROM routing_policy_versions v LEFT JOIN LATERAL (SELECT status FROM routing_policy_status_events WHERE routing_version_id=v.id ORDER BY created_at DESC,id DESC LIMIT 1) s ON TRUE ${where} ORDER BY v.created_at DESC, v.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { items: await Promise.all(rows.rows.map((row) => this.get(row.id))), total: Number(total.rows[0]?.count ?? 0), limit, offset };
  }

  private async transition(id: string, to: SystemControlRoutingStatus, input: { key: string; requestId: string; actor: string }, options: { kind: 'routing_test' | 'routing_approve'; assert?: (policy: SystemControlRoutingPolicyVersion) => void }) {
    const key = keyOf(input.key); const requestHash = hash({ routingVersionId: id, operation: options.kind }); const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.policyMeta(client, id);
      const command = await this.lockCommand(client, options.kind, key, key, requestHash);
      const policy = await this.loadOne(client, id);
      if (command.replay) { await client.query('COMMIT'); return { policy: this.replaySnapshot(command.stored!, policy), replay: true }; }
      const allowed: Record<SystemControlRoutingStatus, SystemControlRoutingStatus[]> = { draft: ['testing'], testing: ['impact_checked'], impact_checked: ['approved'], approved: ['active'], active: ['retired'], retired: [] };
      if (!allowed[policy.status].includes(to)) throw routingConflict('SYSTEM_CONTROL_ROUTING_INVALID_TRANSITION', `路由策略不能从 ${policy.status} 转为 ${to}。`, 'reload_routing');
      options.assert?.(policy);
      await client.query('INSERT INTO routing_policy_status_events (routing_version_id,status,request_id,actor_subject) VALUES ($1,$2,$3,$4)', [id, to, input.requestId, input.actor]);
      const result = await this.loadOne(client, id);
      await this.saveCommand(client, options.kind, key, key, requestHash, id, { policy: result });
      await this.audit(client, { actor: input.actor, action: `routing_${to}`, resourceId: id, key, requestId: input.requestId, snapshot: { status: to } });
      await client.query('COMMIT');
      return { policy: result, replay: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async test(id: string, input: { key: string; requestId: string; actor: string }) { return this.transition(id, 'testing', input, { kind: 'routing_test' }); }

  async impactCheck(id: string, input: { key: string; requestId: string; actor: string }) {
    const key = keyOf(input.key); const requestHash = hash({ routingVersionId: id, operation: 'routing_impact_check' }); const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const meta = await this.policyMeta(client, id);
      const command = await this.lockCommand(client, 'routing_impact_check', key, key, requestHash);
      const policy = await this.loadOne(client, id);
      if (command.replay) { await client.query('COMMIT'); return { policy: this.replaySnapshot(command.stored!, policy), replay: true }; }
      if (policy.status !== 'testing') throw routingConflict('SYSTEM_CONTROL_ROUTING_INVALID_TRANSITION', '只有 testing 策略可以执行影响检查。', 'reload_routing');
      const stage = policy.workflowStage;
      const active = await client.query<{ count: string }>(stage === 'asr'
        ? `SELECT COUNT(*)::text AS count FROM asr_jobs WHERE status IN ('queued','leased','running','cancel_requested')`
        : stage === 'screen_text'
          ? `SELECT COUNT(*)::text AS count FROM screen_text_jobs WHERE status IN ('not_started','queued','running','review_pending','cancel_requested')`
          : `SELECT 0::text AS count`);
      const reconciliation = await client.query<{ count: string }>(stage === 'asr'
        ? `SELECT COUNT(*)::text AS count FROM asr_jobs WHERE status='reconciliation_required'`
        : stage === 'screen_text'
          ? `SELECT COUNT(*)::text AS count FROM screen_text_jobs WHERE status='reconciliation_required'`
          : `SELECT 0::text AS count`);
      const ids = policy.pools.flatMap((pool) => pool.targets.map((target) => target.deploymentVersionId));
      const failing = stage === 'terms' || !ids.length
        ? { rows: [{ count: '0' }] }
        : await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM unnest($1::uuid[]) expected(deployment_version_id) LEFT JOIN LATERAL (SELECT status FROM connection_test_runs WHERE deployment_version_id=expected.deployment_version_id ORDER BY queued_at DESC,id DESC LIMIT 1) latest ON TRUE WHERE latest.status IS DISTINCT FROM 'succeeded'`, [ids]);
      const current = await client.query<{ max_concurrent_jobs: number; pool_id: string }>('SELECT t.pool_id,t.max_concurrent_jobs FROM active_control_plane_pointers a JOIN routing_policy_targets t ON t.routing_version_id=a.routing_version_id WHERE a.environment=$1 AND a.workflow_stage=$2', [meta.environment, stage]);
      const currentMap = new Map(current.rows.map((row) => [row.pool_id, Number(row.max_concurrent_jobs)]));
      const capacityDifferences = policy.pools.flatMap((pool) => pool.targets.filter((target) => currentMap.has(pool.poolId) && currentMap.get(pool.poolId) !== target.maxConcurrentJobs).map((target) => ({ poolId: pool.poolId, currentMaxConcurrentJobs: currentMap.get(pool.poolId) ?? null, nextMaxConcurrentJobs: target.maxConcurrentJobs })));
      const activeTaskCount = Number(active.rows[0]?.count ?? 0);
      const capacityBlocked = policy.pools.some((pool) => pool.targets.some((target) => target.maxConcurrentJobs < activeTaskCount));
      const selectedPools = stage === 'asr'
        ? policy.pools.filter((pool) => pool.poolId === 'asr_api')
        : stage === 'screen_text'
          ? policy.pools.filter((pool) => pool.poolId === 'ocr_api' || pool.poolId === 'ocr_self_hosted_worker')
          : policy.pools.filter((pool) => pool.poolId === 'terms_api');
      const noPrimary = selectedPools.every((pool) => pool.targets.length === 0);
      const hardBlocks = [...(noPrimary ? ['no_deployment_target'] : []), ...(Number(reconciliation.rows[0]?.count ?? 0) > 0 ? ['reconciliation_required'] : []), ...(Number(failing.rows[0]?.count ?? 0) > 0 ? ['connection_test_not_succeeded'] : []), ...(capacityBlocked ? ['capacity_below_active_tasks'] : [])];
      const impact: SystemControlRoutingImpact = { affectedWorkflowStages: [stage], activeTaskCount, reconciliationRequiredTaskCount: Number(reconciliation.rows[0]?.count ?? 0), failingConnectionTestCount: Number(failing.rows[0]?.count ?? 0), capacityDifferences, hardBlocks };
      await client.query('INSERT INTO routing_policy_impact_snapshots (routing_version_id,snapshot) VALUES ($1,$2) ON CONFLICT (routing_version_id) DO NOTHING', [id, JSON.stringify(impact)]);
      await client.query("INSERT INTO routing_policy_status_events (routing_version_id,status,request_id,actor_subject) VALUES ($1,'impact_checked',$2,$3)", [id, input.requestId, input.actor]);
      const result = await this.loadOne(client, id);
      await this.saveCommand(client, 'routing_impact_check', key, key, requestHash, id, { policy: result });
      await this.audit(client, { actor: input.actor, action: 'routing_impact_checked', resourceId: id, key, requestId: input.requestId, snapshot: impact });
      await client.query('COMMIT');
      return { policy: result, replay: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async approve(id: string, input: { key: string; requestId: string; actor: string }) {
    return this.transition(id, 'approved', input, { kind: 'routing_approve', assert: (policy) => {
      if (policy.status !== 'impact_checked') throw routingConflict('SYSTEM_CONTROL_ROUTING_INVALID_TRANSITION', '只有 impact_checked 策略可以批准。');
      if (policy.impact?.hardBlocks.length) throw routingConflict('SYSTEM_CONTROL_ROUTING_IMPACT_BLOCKED', '影响检查存在硬阻断，不能批准。', 'resolve_routing_impact');
    } });
  }

  async publish(id: string, input: { releaseCommandId: string; key: string; requestId: string; actor: string }) {
    const key = keyOf(input.key); const releaseCommandId = keyOf(input.releaseCommandId); const requestHash = hash({ routingVersionId: id, releaseCommandId }); const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const meta = await this.policyMeta(client, id);
      const command = await this.lockCommand(client, 'routing_publish', releaseCommandId, key, requestHash);
      const policy = await this.loadOne(client, id);
      if (command.replay) { await client.query('COMMIT'); return { policy: this.replaySnapshot(command.stored!, policy), replay: true }; }
      if (policy.status !== 'approved') throw routingConflict('SYSTEM_CONTROL_ROUTING_INVALID_TRANSITION', '只有 approved 策略可以发布。');
      if (policy.impact?.hardBlocks.length) throw routingConflict('SYSTEM_CONTROL_ROUTING_IMPACT_BLOCKED', '影响检查存在硬阻断，不能发布。', 'resolve_routing_impact');
      const old = await client.query<{ routing_version_id: string }>('SELECT routing_version_id FROM active_control_plane_pointers WHERE environment=$1 AND workflow_stage=$2 FOR UPDATE', [meta.environment, meta.workflow_stage]);
      if (old.rows[0] && old.rows[0].routing_version_id !== id) await client.query("INSERT INTO routing_policy_status_events (routing_version_id,status,request_id,actor_subject) VALUES ($1,'retired',$2,$3)", [old.rows[0].routing_version_id, input.requestId, input.actor]);
      await client.query("INSERT INTO routing_policy_status_events (routing_version_id,status,request_id,actor_subject) VALUES ($1,'active',$2,$3)", [id, input.requestId, input.actor]);
      await client.query('INSERT INTO active_control_plane_pointers (environment,workflow_stage,routing_version_id) VALUES ($1,$2,$3) ON CONFLICT (environment,workflow_stage) DO UPDATE SET routing_version_id=EXCLUDED.routing_version_id,updated_at=CURRENT_TIMESTAMP', [meta.environment, meta.workflow_stage, id]);
      const result = await this.loadOne(client, id);
      await this.saveCommand(client, 'routing_publish', releaseCommandId, key, requestHash, id, { policy: result, releaseCommandId });
      await this.audit(client, { actor: input.actor, action: 'routing_published', resourceId: id, key, requestId: input.requestId, snapshot: { releaseCommandId } });
      await client.query('COMMIT');
      return { policy: result, replay: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async rollback(input: { targetRoutingVersionId: string; releaseCommandId: string; key: string; requestId: string; actor: string }) {
    const key = keyOf(input.key); const releaseCommandId = keyOf(input.releaseCommandId); const requestHash = hash({ targetRoutingVersionId: input.targetRoutingVersionId, releaseCommandId }); const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const meta = await this.policyMeta(client, input.targetRoutingVersionId);
      const command = await this.lockCommand(client, 'routing_rollback', releaseCommandId, key, requestHash);
      const target = await this.loadOne(client, input.targetRoutingVersionId);
      if (command.replay) { await client.query('COMMIT'); return { policy: this.replaySnapshot(command.stored!, target), replay: true }; }
      if (!['approved', 'active', 'retired'].includes(target.status)) throw routingConflict('SYSTEM_CONTROL_ROUTING_INVALID_TRANSITION', '只能回滚到历史已批准版本。');
      const old = await client.query<{ routing_version_id: string }>('SELECT routing_version_id FROM active_control_plane_pointers WHERE environment=$1 AND workflow_stage=$2 FOR UPDATE', [meta.environment, meta.workflow_stage]);
      if (old.rows[0] && old.rows[0].routing_version_id !== target.routingVersionId) await client.query("INSERT INTO routing_policy_status_events (routing_version_id,status,request_id,actor_subject) VALUES ($1,'retired',$2,$3)", [old.rows[0].routing_version_id, input.requestId, input.actor]);
      await client.query("INSERT INTO routing_policy_status_events (routing_version_id,status,request_id,actor_subject) VALUES ($1,'active',$2,$3)", [target.routingVersionId, input.requestId, input.actor]);
      await client.query('INSERT INTO active_control_plane_pointers (environment,workflow_stage,routing_version_id) VALUES ($1,$2,$3) ON CONFLICT (environment,workflow_stage) DO UPDATE SET routing_version_id=EXCLUDED.routing_version_id,updated_at=CURRENT_TIMESTAMP', [meta.environment, meta.workflow_stage, target.routingVersionId]);
      const result = await this.loadOne(client, target.routingVersionId);
      await this.saveCommand(client, 'routing_rollback', releaseCommandId, key, requestHash, target.routingVersionId, { policy: result, releaseCommandId });
      await this.audit(client, { actor: input.actor, action: 'routing_rollback', resourceId: target.routingVersionId, key, requestId: input.requestId, snapshot: { releaseCommandId, targetRoutingVersionId: target.routingVersionId } });
      await client.query('COMMIT');
      return { policy: result, replay: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  /**
   * 在 run 创建事务内读取 terms active 策略，只投影创建时仍 enabled 的有序目标。
   * 调用方应把返回值原样固化；Worker 不再重新读取 active 指针。
   */
  async resolveActiveTermsTargets(executor: PoolClient | DatabasePool): Promise<TermsRouteSnapshot> {
    const result = await executor.query<{
      routing_version_id: string;
      routing_target_id: string;
      deployment_version_id: string;
      priority: number;
      role: 'preferred' | 'standard' | 'emergency';
      adapter_key: string;
      execution_kind: 'cloud_api';
      provider: string;
      capability: 'terms';
      model: string;
      runtime_config: Record<string, unknown>;
      config_digest: string;
      secret_reference_version_id: string | null;
      secret_reference_summary: Record<string, unknown>;
    }>(`SELECT a.routing_version_id, t.routing_target_id, t.deployment_version_id, t.priority, t.role,
              d.adapter_key, d.execution_kind, d.provider, d.capability,
              v.model, v.runtime_config, v.config_digest,
              v.secret_reference_version_id, v.secret_reference_summary
         FROM active_control_plane_pointers a
         JOIN routing_policy_targets t
           ON t.routing_version_id = a.routing_version_id AND t.pool_id = 'terms_api'
         JOIN engine_deployment_versions v ON v.id = t.deployment_version_id
         JOIN engine_deployments d ON d.id = v.deployment_id
         JOIN LATERAL (
           SELECT status FROM routing_policy_status_events
            WHERE routing_version_id = a.routing_version_id
            ORDER BY created_at DESC, id DESC
            LIMIT 1
         ) s ON TRUE
        WHERE a.environment = 'development'
          AND a.workflow_stage = 'terms'
          AND d.status = 'enabled'
          AND s.status = 'active'
        ORDER BY t.priority, t.routing_target_id`, []);
    if (!result.rows.length) {
      throw routingConflict('SYSTEM_CONTROL_ROUTING_NO_ACTIVE', '当前工作流没有可用的 active 术语路由策略。', 'publish_routing_policy');
    }

    const targets = result.rows.map((row): TermsRouteTargetSnapshot => {
      let resolved: ReturnType<typeof resolveRegisteredEngine>;
      try {
        resolved = resolveRegisteredEngine(
          this.registries,
          'terms',
          row.execution_kind,
          row.adapter_key,
          row.runtime_config,
          row.model,
        );
      } catch {
        throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', 'active 术语路由引用的不可变部署版本当前无效。', 'repair_routing_policy');
      }
      if (!('runtimeConfig' in resolved.descriptor)) {
        throw routingInvalid('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', 'active 术语路由缺少不可变 runtimeConfig。', 'repair_routing_policy');
      }
      const runtimeConfig = resolved.descriptor.runtimeConfig as Readonly<Record<string, unknown>>;
      return Object.freeze({
        routingVersionId: row.routing_version_id,
        routingTargetId: row.routing_target_id,
        deploymentVersionId: row.deployment_version_id,
        priority: Number(row.priority),
        role: row.role,
        adapterKey: row.adapter_key,
        executionKind: row.execution_kind,
        provider: row.provider,
        model: resolved.model,
        runtimeConfig,
        adapterConfig: Object.freeze({
          provider: row.provider,
          ...runtimeConfig,
          model: resolved.model,
          promptVersion: 'term-prompt-v1',
        }),
        configDigest: row.config_digest,
        secretReferenceVersionId: row.secret_reference_version_id,
        secretReferenceSummary: Object.freeze({ ...(row.secret_reference_summary ?? {}) }),
      });
    });
    const routeFacts = targets.map((target) => ({
      routingTargetId: target.routingTargetId,
      deploymentVersionId: target.deploymentVersionId,
      priority: target.priority,
      role: target.role,
      adapterKey: target.adapterKey,
      provider: target.provider,
      model: target.model,
      configDigest: target.configDigest,
      secretReferenceVersionId: target.secretReferenceVersionId,
    }));
    const configFacts = targets.map((target) => ({
      deploymentVersionId: target.deploymentVersionId,
      configDigest: target.configDigest,
      adapterConfig: target.adapterConfig,
      secretReferenceVersionId: target.secretReferenceVersionId,
    }));
    return Object.freeze({
      routingVersionId: targets[0]!.routingVersionId,
      routeDigest: hash({ routingVersionId: targets[0]!.routingVersionId, targets: routeFacts }),
      configDigest: hash(configFacts),
      targets: Object.freeze(targets),
    });
  }

  async resolveActiveTarget(stage: SystemControlRoutingWorkflowStage, poolId: SystemControlRoutingPool['poolId'], registry: AsrAdapterRegistry | ScreenTextAdapterRegistry | TermExtractionAdapter, executor: PoolClient | DatabasePool) {
    const poolIds = stage === 'screen_text' ? ['ocr_self_hosted_worker', 'ocr_api'] : stage === 'terms' ? ['terms_api'] : [poolId];
    const result = await executor.query<{ routing_version_id: string; routing_target_id: string; priority: number; deployment_version_id: string; adapter_key: string; execution_kind: 'cloud_api' | 'self_hosted_worker'; capability: SystemControlRoutingWorkflowStage; model: string; runtime_config: unknown; max_concurrent_jobs: number; per_project_max: number; queue_limit: number }>(`SELECT a.routing_version_id, t.routing_target_id, t.priority, t.deployment_version_id, t.max_concurrent_jobs, t.per_project_max, t.queue_limit, d.adapter_key, d.execution_kind, d.capability, v.model, v.runtime_config FROM active_control_plane_pointers a JOIN routing_policy_targets t ON t.routing_version_id=a.routing_version_id AND t.pool_id = ANY($3::text[]) JOIN engine_deployment_versions v ON v.id=t.deployment_version_id JOIN engine_deployments d ON d.id=v.deployment_id JOIN LATERAL (SELECT status FROM routing_policy_status_events WHERE routing_version_id=a.routing_version_id ORDER BY created_at DESC,id DESC LIMIT 1) s ON TRUE WHERE a.environment=$2 AND a.workflow_stage=$1 AND d.status='enabled' AND s.status='active' ORDER BY t.priority LIMIT 1`, [stage, 'development', poolIds]);
    const row = result.rows[0];
    if (!row) throw routingConflict('SYSTEM_CONTROL_ROUTING_NO_ACTIVE', '当前工作流没有可用的 active 路由策略。', 'publish_routing_policy');
    const route = await executor.query<{ pool_id: string; routing_target_id: string; deployment_version_id: string; priority: number; role: string; max_concurrent_jobs: number; per_project_max: number; queue_limit: number }>('SELECT pool_id,routing_target_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit FROM routing_policy_targets WHERE routing_version_id=$1 ORDER BY priority', [row.routing_version_id]);
    if (row.capability === 'terms') {
      const resolved = resolveRegisteredEngine(this.registries, row.capability, row.execution_kind, row.adapter_key, row.runtime_config ?? undefined, row.model);
      if (!('runtimeConfig' in resolved.descriptor)) throw routingConflict('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', 'terms active 路由缺少不可变 runtimeConfig。', 'repair_routing_policy');
      return { routingVersionId: row.routing_version_id, routingTargetId: row.routing_target_id, priority: Number(row.priority), deploymentVersionId: row.deployment_version_id, maxConcurrentJobs: Number(row.max_concurrent_jobs), perProjectMax: Number(row.per_project_max), queueLimit: Number(row.queue_limit), routeDigest: hash(route.rows), descriptor: resolved.descriptor, adapter: resolved.adapter, runtimeConfig: resolved.descriptor.runtimeConfig };
    }
    let resolved: ReturnType<typeof resolveRegisteredEngine>;
    try {
      resolved = resolveRegisteredEngine(
        this.registries,
        row.capability,
        row.execution_kind,
        row.adapter_key,
        row.runtime_config ?? undefined,
        row.model,
      );
    } catch {
      throw routingConflict('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', 'active 路由引用的适配器或不可变 runtimeConfig 当前无效。', 'repair_routing_policy');
    }
    if (!resolved.adapter) throw routingConflict('SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID', 'active 路由引用的适配器未在当前进程登记。', 'repair_routing_policy');
    return { routingVersionId: row.routing_version_id, routingTargetId: row.routing_target_id, priority: Number(row.priority), deploymentVersionId: row.deployment_version_id, maxConcurrentJobs: Number(row.max_concurrent_jobs), perProjectMax: Number(row.per_project_max), queueLimit: Number(row.queue_limit), routeDigest: hash(route.rows), descriptor: resolved.descriptor, adapter: resolved.adapter, ...(resolved.runtimeConfig ? { runtimeConfig: resolved.runtimeConfig } : {}) };
  }
}
