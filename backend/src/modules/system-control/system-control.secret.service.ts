import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  SystemControlCreateSecretReferenceBody,
  SystemControlCreateSecretValidationBody,
  SystemControlSecretCommand,
  SystemControlSecretDiscoveryList,
  SystemControlSecretDiscoveryQuery,
  SystemControlSecretReference,
  SystemControlSecretReferenceList,
  SystemControlSecretReferenceListQuery,
  SystemControlSecretReferenceVersion,
  SystemControlSecretReferenceVersionList,
  SystemControlSecretValidation,
  SystemControlSecretValidationList,
  SystemControlSecretValidationListQuery,
  SystemControlSecretUsage,
  SystemControlSecretUsageList,
  SystemControlSecretUsageListQuery,
  SystemControlSecretAuditEvent,
  SystemControlSecretAuditList,
  SystemControlSecretAuditListQuery,
  SystemControlSecretRevokePreflight,
  SystemControlSecretReferenceSummary,
  SystemControlEngineCapability,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';
import type { SystemControlPrincipal } from './system-control.auth.js';
import {
  engineConflict,
  engineInvalid,
  engineNotFound,
  versionNotFound,
  connectionTestNotFound,
  secretCommandNotFound,
} from './system-control.engine.errors.js';
import {
  defaultAccessReadiness,
  rejectUnconfiguredSecretProvider,
  type SystemControlAccessReadinessProvider,
  type SystemControlSecretProvider,
  type SystemControlSecretResolvedReference,
  type SystemControlSecretDiscoveryQuery as ProviderDiscoveryQuery,
} from './system-control.secret-provider.js';
const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]));
  return value;
};
const stableSystemControlDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');

type AuditInput = {
  principal: SystemControlPrincipal;
  requestId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  idempotencyKey?: string;
  result: string;
  afterSnapshot?: unknown;
};

type ReferenceRow = {
  id: string; environment: 'development'; capability: SystemControlEngineCapability; provider: string;
  display_name: string; created_at: Date; updated_at: Date;
};
type VersionRow = {
  id: string; secret_reference_id: string; version: number; environment: 'development'; capability: SystemControlEngineCapability;
  provider: string; candidate_id: string; redacted_label: string; reference_digest: string; created_at: Date;
  status: 'available' | 'validation_failed' | 'unknown' | 'rotation_due' | 'revoked'; validated_at: Date | null; revoked_at: Date | null; rotation_due_at: Date | null; rotation_due: boolean;
};

type ReferenceProjectionRow = ReferenceRow & {
  latest_version_id: string | null;
  latest_status: VersionRow['status'] | null;
  latest_validation_at: Date | null;
  rotation_due_at: Date | null;
  rotation_due: boolean;
  bound_deployment_count: string;
  total: string;
};

const parsePage = (query: { limit?: string; offset?: string }) => ({
  limit: Math.min(100, Math.max(1, Number(query.limit ?? 50))),
  offset: Math.max(0, Number(query.offset ?? 0)),
});

const validIdempotencyKey = (value: string | undefined) => {
  const key = value?.trim() ?? '';
  if (!key || key.length > 200 || /[\r\n]/.test(key)) throw engineInvalid('SYSTEM_CONTROL_ENGINE_INVALID_REFERENCE', 'Idempotency-Key 必须是稳定且不含控制字符的值。');
  return key;
};

const safeLabel = (value: string | undefined) => {
  const label = value?.trim() || '已绑定 Secret 引用';
  if (label.length > 80 || /[\r\n]/.test(label)) throw engineInvalid('SYSTEM_CONTROL_ENGINE_INVALID_REFERENCE', 'Secret 脱敏标签格式不正确。');
  return label;
};

const safeProviderResult = (value: SystemControlSecretResolvedReference) => {
  if (!/^[0-9a-f]{64}$/.test(value.referenceDigest) || !value.provider.trim() || !value.redactedLabel.trim()) {
    throw engineInvalid('SYSTEM_CONTROL_SECRET_PROVIDER_UNAVAILABLE', 'Secret provider 返回的安全描述不可用。', 'retry_secret_provider');
  }
  return {
    candidateId: value.candidateId,
    environment: value.environment,
    capability: value.capability,
    provider: value.provider.trim(),
    redactedLabel: safeLabel(value.redactedLabel),
    referenceDigest: value.referenceDigest,
  } satisfies SystemControlSecretResolvedReference;
};

const toSummary = (row: VersionRow): SystemControlSecretReferenceSummary => ({
  present: true,
  secretReferenceId: row.secret_reference_id,
  secretReferenceVersionId: row.id,
  referenceDigest: row.reference_digest,
  redactedLabel: row.redacted_label,
  status: row.status,
  rotationDueAt: row.rotation_due_at?.toISOString() ?? null,
  rotationDue: row.rotation_due,
});

const toVersion = (row: VersionRow): SystemControlSecretReferenceVersion => ({
  secretReferenceVersionId: row.id,
  secretReferenceId: row.secret_reference_id,
  version: row.version,
  environment: row.environment,
  capability: row.capability,
  provider: row.provider,
  redactedLabel: row.redacted_label,
  referenceDigest: row.reference_digest,
  status: row.status,
  createdAt: row.created_at.toISOString(),
  validatedAt: row.validated_at?.toISOString() ?? null,
  revokedAt: row.revoked_at?.toISOString() ?? null,
  rotationDueAt: row.rotation_due_at?.toISOString() ?? null,
  rotationDue: row.rotation_due,
});

const commandKey = (kind: string, key: string) => `${kind}:${key}`;
const revokeReason = (reason: string) => {
  const normalized = reason.trim();
  if (normalized.length < 8) throw engineInvalid('SYSTEM_CONTROL_SECRET_REVOKE_REASON_INVALID', '撤销原因至少需要 8 个字符。', 'provide_revoke_reason');
  return normalized;
};

export class SystemControlSecretService {
  constructor(
    private readonly pool: DatabasePool,
    private readonly provider: SystemControlSecretProvider = rejectUnconfiguredSecretProvider,
    private readonly accessReadiness: SystemControlAccessReadinessProvider = defaultAccessReadiness,
  ) {}

  private async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await callback(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  private async lockCommand(client: PoolClient, kind: string, key: string) {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [commandKey(kind, key)]);
  }

  private async audit(client: PoolClient, input: AuditInput) {
    const audience = Array.isArray(input.principal.audience) ? input.principal.audience.join(',') : input.principal.audience;
    await client.query(`INSERT INTO system_control_audit_events
      (actor_subject,actor_audience,action,resource_type,resource_id,idempotency_key,request_id,result,after_snapshot)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
      input.principal.subject.slice(0, 255), audience.slice(0, 255), input.action, input.resourceType, input.resourceId,
      input.idempotencyKey ?? null, input.requestId, input.result, input.afterSnapshot ?? null,
    ]);
  }

  private async resolveCandidate(candidateId: string) {
    let resolved: SystemControlSecretResolvedReference | null;
    try { resolved = await this.provider.resolve(candidateId); }
    catch { throw engineInvalid('SYSTEM_CONTROL_SECRET_PROVIDER_UNAVAILABLE', 'Secret provider 暂不可用，请稍后重试。', 'retry_secret_provider'); }
    if (!resolved) throw engineInvalid('SYSTEM_CONTROL_SECRET_CANDIDATE_UNKNOWN', 'Secret 发现候选不存在或已失效。', 'reload_secret_discovery');
    return safeProviderResult(resolved);
  }

  async listDiscovery(query: SystemControlSecretDiscoveryQuery): Promise<SystemControlSecretDiscoveryList> {
    const page = parsePage(query);
    let status: 'ready' | 'not_configured' | 'unknown';
    try { status = await this.provider.status(); } catch { status = 'unknown'; }
    if (status !== 'ready') return { items: [], total: 0, ...page, providerStatus: status, observedAt: null };
    try {
      const providerQuery: ProviderDiscoveryQuery = {
        environment: query.environment ?? 'development', limit: page.limit, offset: page.offset,
        ...(query.capability ? { capability: query.capability } : {}),
        ...(query.provider ? { provider: query.provider } : {}),
        ...(query.search ? { search: query.search } : {}),
      };
      const result = await this.provider.discover(providerQuery);
      return { items: result.items.slice(0, page.limit).map((item) => ({ ...item, discoveredAt: item.discoveredAt.toISOString() })), total: Math.max(0, result.total), ...page, providerStatus: status, observedAt: result.observedAt?.toISOString() ?? null };
    } catch { return { items: [], total: 0, ...page, providerStatus: 'unknown', observedAt: null }; }
  }

  async securityOverview() {
    let providerStatus: 'ready' | 'not_configured' | 'unknown';
    try { providerStatus = await this.provider.status(); } catch { providerStatus = 'unknown'; }
    const access = await this.accessReadiness();
    return {
      generatedAt: new Date().toISOString(),
      access: { ...access, observedAt: access.observedAt?.toISOString() ?? null },
      provider: { status: providerStatus, observedAt: new Date().toISOString() },
    };
  }

  private async referenceVersion(client: PoolClient, versionId: string, forUpdate = false): Promise<VersionRow | null> {
    const lock = forUpdate ? ' FOR UPDATE OF v' : '';
    const result = await client.query<VersionRow>(`SELECT v.id,v.secret_reference_id,v.version,v.environment,v.capability,v.provider,v.candidate_id,v.redacted_label,v.reference_digest,v.created_at,
      CASE WHEN latest.status='available' AND success.created_at + interval '90 days' <= CURRENT_TIMESTAMP THEN 'rotation_due' ELSE COALESCE(latest.status,'unknown') END AS status,
      success.created_at AS validated_at,
      success.created_at + interval '90 days' AS rotation_due_at,
      (latest.status='available' AND success.created_at + interval '90 days' <= CURRENT_TIMESTAMP) AS rotation_due,
      (SELECT e.created_at FROM system_secret_reference_status_events e WHERE e.secret_reference_version_id=v.id AND e.status='revoked' ORDER BY e.created_at DESC,e.id DESC LIMIT 1) AS revoked_at
      FROM system_secret_reference_versions v
      LEFT JOIN LATERAL (SELECT e.status,e.created_at FROM system_secret_reference_status_events e WHERE e.secret_reference_version_id=v.id ORDER BY e.created_at DESC,e.id DESC LIMIT 1) latest ON true
      LEFT JOIN LATERAL (SELECT e.created_at FROM system_secret_reference_status_events e WHERE e.secret_reference_version_id=v.id AND e.status='available' ORDER BY e.created_at DESC,e.id DESC LIMIT 1) success ON true
      WHERE v.id=$1${lock}`, [versionId]);
    return result.rows[0] ?? null;
  }

  async getBindableVersion(client: PoolClient, versionId: string, expected?: { capability: SystemControlEngineCapability; provider: string }): Promise<{ versionId: string; referenceId: string; summary: SystemControlSecretReferenceSummary }> {
    const row = await this.referenceVersion(client, versionId);
    if (row?.status === 'rotation_due') {
      if (expected && (row.capability !== expected.capability || row.provider !== expected.provider)) {
        throw engineInvalid('SYSTEM_CONTROL_SECRET_REFERENCE_VERSION_NOT_FOUND', 'Secret 引用版本与 provider 不匹配。', 'choose_matching_secret_reference');
      }
      return { versionId: row.id, referenceId: row.secret_reference_id, summary: toSummary(row) };
    }
    if (!row) throw versionNotFound('Secret 引用版本不存在。');
    if (row.status !== 'available') throw engineInvalid('SYSTEM_CONTROL_SECRET_REFERENCE_VERSION_NOT_FOUND', 'Secret 引用版本当前不可绑定。', 'reload_secret_reference_version');
    if (expected && (row.capability !== expected.capability || row.provider !== expected.provider)) {
      throw engineInvalid('SYSTEM_CONTROL_SECRET_REFERENCE_VERSION_NOT_FOUND', 'Secret 引用版本与引擎能力或 provider 不匹配。', 'choose_matching_secret_reference');
    }
    return { versionId: row.id, referenceId: row.secret_reference_id, summary: toSummary(row) };
  }

  /**
   * 为受控 Worker 解析一次运行时 Secret。原始值只在调用栈中短暂存在，
   * 不写入数据库、不返回 API，也不参与任何快照或日志。
   */
  async resolveRuntimeKey(versionId: string): Promise<string | null> {
    const client = await this.pool.connect();
    try {
      const row = await this.referenceVersion(client, versionId);
      if (!row || !['available', 'rotation_due'].includes(row.status) || row.capability !== 'terms') return null;
      if (typeof this.provider.resolveValue !== 'function') return null;
      try {
        const value = await this.provider.resolveValue(row.candidate_id);
        return typeof value === 'string' && value.trim() ? value : null;
      } catch {
        throw engineInvalid('SYSTEM_CONTROL_SECRET_PROVIDER_UNAVAILABLE', 'Secret provider 暂不可用，请稍后重试。', 'retry_secret_provider');
      }
    } finally {
      client.release();
    }
  }

  async createReference(input: { body: SystemControlCreateSecretReferenceBody; idempotencyKey: string; requestId: string; principal: SystemControlPrincipal }): Promise<{ command: SystemControlSecretCommand; replay: boolean }> {
    const key = validIdempotencyKey(input.idempotencyKey);
    const hash = stableSystemControlDigest(input.body);
    const body = input.body;
    return this.transaction(async (client) => {
      await this.lockCommand(client, 'secret_reference_create', body.commandId);
      await this.lockCommand(client, 'secret_reference_create_key', key);
      const existing = await client.query<{ request_hash: string; idempotency_key: string; response_snapshot: SystemControlSecretCommand }>('SELECT request_hash,idempotency_key,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 OR (command_kind=$2 AND idempotency_key=$3) FOR UPDATE', [body.commandId, 'secret_reference_create', key]);
      if (existing.rows[0]) {
        if (existing.rows[0].idempotency_key !== key) throw engineConflict('SYSTEM_CONTROL_SECRET_COMMAND_ID_REUSED', 'SecretReference commandId 已绑定另一幂等请求。');
        if (existing.rows[0].request_hash !== hash) throw engineConflict('SYSTEM_CONTROL_ENGINE_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同 SecretReference 请求。');
        return { command: existing.rows[0].response_snapshot, replay: true };
      }
      const resolved = await this.resolveCandidate(body.candidateId);
      const duplicate = await client.query('SELECT 1 FROM system_secret_references WHERE id=$1 OR EXISTS (SELECT 1 FROM system_secret_reference_versions WHERE id=$2)', [body.secretReferenceId, body.secretReferenceVersionId]);
      if (duplicate.rows[0]) throw engineConflict('SYSTEM_CONTROL_SECRET_REFERENCE_ID_REUSED', 'SecretReference 稳定身份已被占用。');
      const now = new Date();
      await client.query('INSERT INTO system_secret_references(id,environment,capability,provider,display_name,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$6)', [body.secretReferenceId, resolved.environment, resolved.capability, resolved.provider, body.displayName?.trim() || resolved.redactedLabel, now]);
      await client.query('INSERT INTO system_secret_reference_versions(id,secret_reference_id,version,environment,capability,provider,candidate_id,redacted_label,reference_digest,created_at) VALUES($1,$2,1,$3,$4,$5,$6,$7,$8,$9)', [body.secretReferenceVersionId, body.secretReferenceId, resolved.environment, resolved.capability, resolved.provider, resolved.candidateId, resolved.redactedLabel, resolved.referenceDigest, now]);
      await client.query("INSERT INTO system_secret_reference_status_events(secret_reference_version_id,status,request_id,actor_subject,created_at) VALUES($1,'unknown',$2,$3,$4)", [body.secretReferenceVersionId, input.requestId, input.principal.subject, now]);
      const command: SystemControlSecretCommand = { commandId: body.commandId, action: 'created', secretReferenceId: body.secretReferenceId, secretReferenceVersionId: body.secretReferenceVersionId, status: 'succeeded', requestId: input.requestId, createdAt: now.toISOString() };
      await client.query('INSERT INTO system_control_commands(command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES($1,$2,$3,$4,$5,$6)', ['secret_reference_create', key, body.commandId, hash, body.secretReferenceId, command]);
      await this.audit(client, { principal: input.principal, requestId: input.requestId, action: 'secret_reference_created', resourceType: 'secret_reference', resourceId: body.secretReferenceId, idempotencyKey: key, result: 'succeeded', afterSnapshot: { secretReferenceId: body.secretReferenceId, secretReferenceVersionId: body.secretReferenceVersionId, status: 'unknown' } });
      return { command, replay: false };
    });
  }

  async rotateReference(input: { referenceId: string; body: { rotationCommandId: string; secretReferenceVersionId: string; candidateId: string }; idempotencyKey: string; requestId: string; principal: SystemControlPrincipal }): Promise<{ command: SystemControlSecretCommand; replay: boolean }> {
    const key = validIdempotencyKey(input.idempotencyKey);
    const hash = stableSystemControlDigest({ referenceId: input.referenceId, body: input.body });
    return this.transaction(async (client) => {
      await this.lockCommand(client, 'secret_reference_rotate', input.body.rotationCommandId);
      await this.lockCommand(client, 'secret_reference_rotate_key', key);
      const existing = await client.query<{ request_hash: string; idempotency_key: string; response_snapshot: SystemControlSecretCommand }>('SELECT request_hash,idempotency_key,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 OR (command_kind=$2 AND idempotency_key=$3) FOR UPDATE', [input.body.rotationCommandId, 'secret_reference_rotate', key]);
      if (existing.rows[0]) {
        if (existing.rows[0].idempotency_key !== key) throw engineConflict('SYSTEM_CONTROL_SECRET_COMMAND_ID_REUSED', 'rotationCommandId 已绑定另一幂等请求。');
        if (existing.rows[0].request_hash !== hash) throw engineConflict('SYSTEM_CONTROL_ENGINE_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同轮换请求。');
        return { command: existing.rows[0].response_snapshot, replay: true };
      }
      const reference = await client.query<ReferenceRow>('SELECT id,environment,capability,provider,display_name,created_at,updated_at FROM system_secret_references WHERE id=$1 FOR UPDATE', [input.referenceId]);
      const parent = reference.rows[0];
      if (!parent) throw engineNotFound('SecretReference 不存在。');
      const resolved = await this.resolveCandidate(input.body.candidateId);
      if (resolved.environment !== parent.environment || resolved.capability !== parent.capability || resolved.provider !== parent.provider) throw engineInvalid('SYSTEM_CONTROL_SECRET_CANDIDATE_UNKNOWN', '候选与 SecretReference 所属能力不匹配。');
      const duplicate = await client.query('SELECT 1 FROM system_secret_reference_versions WHERE id=$1', [input.body.secretReferenceVersionId]);
      if (duplicate.rows[0]) throw engineConflict('SYSTEM_CONTROL_SECRET_REFERENCE_VERSION_ID_REUSED', 'SecretReferenceVersionId 已被占用。');
      const next = await client.query<{ next_version: number }>('SELECT COALESCE(MAX(version),0)+1 AS next_version FROM system_secret_reference_versions WHERE secret_reference_id=$1', [input.referenceId]);
      const now = new Date();
      await client.query('INSERT INTO system_secret_reference_versions(id,secret_reference_id,version,environment,capability,provider,candidate_id,redacted_label,reference_digest,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [input.body.secretReferenceVersionId, input.referenceId, next.rows[0]!.next_version, parent.environment, parent.capability, parent.provider, resolved.candidateId, resolved.redactedLabel, resolved.referenceDigest, now]);
      await client.query("INSERT INTO system_secret_reference_status_events(secret_reference_version_id,status,request_id,actor_subject,created_at) VALUES($1,'unknown',$2,$3,$4)", [input.body.secretReferenceVersionId, input.requestId, input.principal.subject, now]);
      const command: SystemControlSecretCommand = { commandId: input.body.rotationCommandId, action: 'rotated', secretReferenceId: input.referenceId, secretReferenceVersionId: input.body.secretReferenceVersionId, status: 'succeeded', requestId: input.requestId, createdAt: now.toISOString() };
      await client.query('INSERT INTO system_control_commands(command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES($1,$2,$3,$4,$5,$6)', ['secret_reference_rotate', key, input.body.rotationCommandId, hash, input.referenceId, command]);
      await this.audit(client, { principal: input.principal, requestId: input.requestId, action: 'secret_reference_rotated', resourceType: 'secret_reference', resourceId: input.referenceId, idempotencyKey: key, result: 'succeeded', afterSnapshot: { secretReferenceId: input.referenceId, secretReferenceVersionId: input.body.secretReferenceVersionId, status: 'unknown' } });
      return { command, replay: false };
    });
  }

  private async assertNotInUse(client: PoolClient, versionId: string) {
    const activeRoute = await client.query(`SELECT 1 FROM active_control_plane_pointers p JOIN routing_policy_targets target ON target.routing_version_id=p.routing_version_id JOIN engine_deployment_versions v ON v.id=target.deployment_version_id WHERE v.secret_reference_version_id=$1 LIMIT 1`, [versionId]);
    if (activeRoute.rows[0]) throw engineConflict('SYSTEM_CONTROL_SECRET_REVOKE_ACTIVE', 'Secret 仍被 active 路由使用，请先切换路由。', 'switch_active_routing');
    const activeAttempt = await client.query(`SELECT 1 FROM asr_attempts WHERE deployment_version_id IN (SELECT id FROM engine_deployment_versions WHERE secret_reference_version_id=$1) AND status NOT IN ('completed','failed','cancelled') UNION ALL SELECT 1 FROM screen_text_attempts WHERE deployment_version_id IN (SELECT id FROM engine_deployment_versions WHERE secret_reference_version_id=$1) AND status NOT IN ('completed','failed','cancelled') LIMIT 1`, [versionId]);
    if (activeAttempt.rows[0]) throw engineConflict('SYSTEM_CONTROL_SECRET_REVOKE_NON_TERMINAL', 'Secret 仍绑定非终态任务，暂不能撤销。', 'wait_for_task_terminal');
  }

  async revokeReference(input: { referenceId: string; versionId: string; body: { revokeCommandId: string; reason: string }; idempotencyKey: string; requestId: string; principal: SystemControlPrincipal }): Promise<{ command: SystemControlSecretCommand; replay: boolean }> {
    const key = validIdempotencyKey(input.idempotencyKey);
    const body = { ...input.body, reason: revokeReason(input.body.reason) };
    const hash = stableSystemControlDigest({ referenceId: input.referenceId, versionId: input.versionId, body });
    return this.transaction(async (client) => {
      await this.lockCommand(client, 'secret_reference_revoke', body.revokeCommandId);
      await this.lockCommand(client, 'secret_reference_revoke_key', key);
      const existing = await client.query<{ request_hash: string; idempotency_key: string; response_snapshot: SystemControlSecretCommand }>('SELECT request_hash,idempotency_key,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 OR (command_kind=$2 AND idempotency_key=$3) FOR UPDATE', [body.revokeCommandId, 'secret_reference_revoke', key]);
      if (existing.rows[0]) {
        if (existing.rows[0].idempotency_key !== key) throw engineConflict('SYSTEM_CONTROL_SECRET_COMMAND_ID_REUSED', 'revokeCommandId 已绑定另一幂等请求。');
        if (existing.rows[0].request_hash !== hash) throw engineConflict('SYSTEM_CONTROL_ENGINE_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同撤销请求。');
        return { command: existing.rows[0].response_snapshot, replay: true };
      }
      const row = await this.referenceVersion(client, input.versionId, true);
      if (!row || row.secret_reference_id !== input.referenceId) throw versionNotFound('Secret 引用版本不存在。');
      if (row.status === 'revoked') throw engineConflict('SYSTEM_CONTROL_SECRET_REVOKE_ACTIVE', 'Secret 引用版本已经撤销。', 'reload_secret_reference_version');
      await this.assertNotInUse(client, input.versionId);
      const now = new Date();
      await client.query("INSERT INTO system_secret_reference_status_events(secret_reference_version_id,status,request_id,actor_subject,created_at) VALUES($1,'revoked',$2,$3,$4)", [input.versionId, input.requestId, input.principal.subject, now]);
      const command: SystemControlSecretCommand = { commandId: body.revokeCommandId, action: 'revoked', secretReferenceId: input.referenceId, secretReferenceVersionId: input.versionId, status: 'succeeded', requestId: input.requestId, createdAt: now.toISOString() };
      await client.query('INSERT INTO system_control_commands(command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES($1,$2,$3,$4,$5,$6)', ['secret_reference_revoke', key, body.revokeCommandId, hash, input.versionId, command]);
      await this.audit(client, { principal: input.principal, requestId: input.requestId, action: 'secret_reference_revoked', resourceType: 'secret_reference_version', resourceId: input.versionId, idempotencyKey: key, result: 'succeeded', afterSnapshot: { secretReferenceId: input.referenceId, secretReferenceVersionId: input.versionId, status: 'revoked' } });
      return { command, replay: false };
    });
  }

  async listReferences(query: SystemControlSecretReferenceListQuery): Promise<SystemControlSecretReferenceList> {
    const page = parsePage(query);
    const sort = ({ created_desc: 'r.created_at DESC,r.id DESC', created_asc: 'r.created_at ASC,r.id ASC', updated_desc: 'r.updated_at DESC,r.id DESC', updated_asc: 'r.updated_at ASC,r.id ASC', display_name_asc: 'r.display_name ASC,r.id ASC', display_name_desc: 'r.display_name DESC,r.id DESC', validation_desc: 's.created_at DESC NULLS LAST,r.id DESC' } as const)[query.sort ?? 'created_desc'];
    const result = await this.pool.query<ReferenceProjectionRow>(`WITH latest AS (
      SELECT DISTINCT ON (v.secret_reference_id) v.secret_reference_id,v.id AS latest_version_id,e.status AS raw_status
      FROM system_secret_reference_versions v LEFT JOIN LATERAL (SELECT e.status,e.created_at FROM system_secret_reference_status_events e WHERE e.secret_reference_version_id=v.id ORDER BY e.created_at DESC,e.id DESC LIMIT 1) e ON true ORDER BY v.secret_reference_id,v.version DESC,v.id DESC),
      success AS (SELECT DISTINCT ON (v.secret_reference_id) v.secret_reference_id,e.created_at FROM system_secret_reference_versions v JOIN system_secret_reference_status_events e ON e.secret_reference_version_id=v.id AND e.status='available' ORDER BY v.secret_reference_id,e.created_at DESC,e.id DESC),
      bound AS (SELECT sv.secret_reference_id,COUNT(DISTINCT ev.deployment_id)::text AS bound_count FROM engine_deployment_versions ev JOIN system_secret_reference_versions sv ON sv.id=ev.secret_reference_version_id GROUP BY sv.secret_reference_id)
      SELECT r.*,l.latest_version_id,CASE WHEN l.raw_status='available' AND s.created_at + interval '90 days' <= CURRENT_TIMESTAMP THEN 'rotation_due' ELSE COALESCE(l.raw_status,'unknown') END AS latest_status,s.created_at AS latest_validation_at,s.created_at + interval '90 days' AS rotation_due_at,(l.raw_status='available' AND s.created_at + interval '90 days' <= CURRENT_TIMESTAMP) AS rotation_due,COALESCE(b.bound_count,'0') AS bound_deployment_count,COUNT(*) OVER()::text AS total
      FROM system_secret_references r LEFT JOIN latest l ON l.secret_reference_id=r.id LEFT JOIN success s ON s.secret_reference_id=r.id LEFT JOIN bound b ON b.secret_reference_id=r.id
      WHERE ($1::system_engine_capability IS NULL OR r.capability=$1::system_engine_capability) AND ($2::text IS NULL OR r.provider=$2) AND ($3::text IS NULL OR r.display_name ILIKE '%'||$3||'%' OR r.id::text ILIKE '%'||$3||'%') AND ($4::text IS NULL OR (CASE WHEN l.raw_status='available' AND s.created_at + interval '90 days' <= CURRENT_TIMESTAMP THEN 'rotation_due' ELSE COALESCE(l.raw_status,'unknown') END)=$4)
      ORDER BY ${sort} LIMIT $5 OFFSET $6`, [query.capability ?? null, query.provider ?? null, query.search?.trim() || null, query.status ?? null, page.limit, page.offset]);
    const totalResult = await this.pool.query<{ total: string }>(`WITH latest AS (SELECT DISTINCT ON (v.secret_reference_id) v.secret_reference_id,e.status AS raw_status FROM system_secret_reference_versions v LEFT JOIN LATERAL (SELECT e.status,e.created_at FROM system_secret_reference_status_events e WHERE e.secret_reference_version_id=v.id ORDER BY e.created_at DESC,e.id DESC LIMIT 1) e ON true ORDER BY v.secret_reference_id,v.version DESC,v.id DESC), success AS (SELECT DISTINCT ON (v.secret_reference_id) v.secret_reference_id,e.created_at FROM system_secret_reference_versions v JOIN system_secret_reference_status_events e ON e.secret_reference_version_id=v.id AND e.status='available' ORDER BY v.secret_reference_id,e.created_at DESC,e.id DESC) SELECT COUNT(*)::text AS total FROM system_secret_references r LEFT JOIN latest l ON l.secret_reference_id=r.id LEFT JOIN success s ON s.secret_reference_id=r.id WHERE ($1::system_engine_capability IS NULL OR r.capability=$1::system_engine_capability) AND ($2::text IS NULL OR r.provider=$2) AND ($3::text IS NULL OR r.display_name ILIKE '%'||$3||'%' OR r.id::text ILIKE '%'||$3||'%') AND ($4::text IS NULL OR (CASE WHEN l.raw_status='available' AND s.created_at + interval '90 days' <= CURRENT_TIMESTAMP THEN 'rotation_due' ELSE COALESCE(l.raw_status,'unknown') END)=$4)`, [query.capability ?? null, query.provider ?? null, query.search?.trim() || null, query.status ?? null]);
    return { items: result.rows.map((row) => ({ secretReferenceId: row.id, environment: row.environment, capability: row.capability, provider: row.provider, displayName: row.display_name, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(), latestVersionId: row.latest_version_id, latestStatus: row.latest_status, boundDeploymentCount: Number(row.bound_deployment_count), latestValidationAt: row.latest_validation_at?.toISOString() ?? null, rotationDueAt: row.rotation_due_at?.toISOString() ?? null, rotationDue: row.rotation_due })), total: Number(totalResult.rows[0]?.total ?? 0), ...page };
  }

  async getReference(referenceId: string): Promise<SystemControlSecretReference> {
    const projected = await this.listReferences({ search: referenceId, limit: '1', offset: '0' });
    const projectedRow = projected.items.find((item) => item.secretReferenceId === referenceId);
    if (projectedRow) return projectedRow;
    throw engineNotFound('SecretReference 不存在。');
  }

  async listVersions(referenceId: string, query: { limit?: string; offset?: string }): Promise<SystemControlSecretReferenceVersionList> {
    const reference = await this.pool.query('SELECT 1 FROM system_secret_references WHERE id=$1', [referenceId]);
    if (!reference.rows[0]) throw engineNotFound('SecretReference 不存在。');
    const page = parsePage(query);
    const result = await this.pool.query<VersionRow & { total: string }>(`SELECT v.*,CASE WHEN latest.status='available' AND success.created_at + interval '90 days' <= CURRENT_TIMESTAMP THEN 'rotation_due' ELSE COALESCE(latest.status,'unknown') END AS status,success.created_at AS validated_at,success.created_at + interval '90 days' AS rotation_due_at,(latest.status='available' AND success.created_at + interval '90 days' <= CURRENT_TIMESTAMP) AS rotation_due,(SELECT e.created_at FROM system_secret_reference_status_events e WHERE e.secret_reference_version_id=v.id AND e.status='revoked' ORDER BY e.created_at DESC,e.id DESC LIMIT 1) AS revoked_at,COUNT(*) OVER()::text AS total FROM system_secret_reference_versions v LEFT JOIN LATERAL (SELECT e.status,e.created_at FROM system_secret_reference_status_events e WHERE e.secret_reference_version_id=v.id ORDER BY e.created_at DESC,e.id DESC LIMIT 1) latest ON true LEFT JOIN LATERAL (SELECT e.created_at FROM system_secret_reference_status_events e WHERE e.secret_reference_version_id=v.id AND e.status='available' ORDER BY e.created_at DESC,e.id DESC LIMIT 1) success ON true WHERE v.secret_reference_id=$1 ORDER BY v.version DESC,v.id DESC LIMIT $2 OFFSET $3`, [referenceId, page.limit, page.offset]);
    const totalResult = await this.pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM system_secret_reference_versions WHERE secret_reference_id=$1', [referenceId]);
    return { items: result.rows.map(toVersion), total: Number(totalResult.rows[0]?.total ?? 0), ...page };
  }

  private async getValidationRow(validationRunId: string): Promise<SystemControlSecretValidation> {
    const run = await this.pool.query<any>('SELECT * FROM system_secret_validation_runs WHERE id=$1', [validationRunId]);
    const row = run.rows[0];
    if (!row) throw connectionTestNotFound('Secret 校验运行不存在。');
    const attempts = await this.pool.query<any>('SELECT attempt_number,status,latency_ms,reason_code,reason_message,started_at,completed_at FROM system_secret_validation_attempts WHERE validation_run_id=$1 ORDER BY attempt_number ASC', [validationRunId]);
    return { validationRunId: row.id, secretReferenceVersionId: row.secret_reference_version_id, status: row.status, requestId: row.request_id, attemptCount: row.attempt_count, latencyMs: row.latency_ms, reasonCode: row.reason_code, reasonMessage: row.reason_message, queuedAt: row.queued_at.toISOString(), startedAt: row.started_at?.toISOString() ?? null, completedAt: row.completed_at?.toISOString() ?? null, attempts: attempts.rows.map((a) => ({ attemptNumber: a.attempt_number, status: a.status, latencyMs: a.latency_ms, reasonCode: a.reason_code, reasonMessage: a.reason_message, startedAt: a.started_at?.toISOString() ?? null, completedAt: a.completed_at?.toISOString() ?? null })) };
  }

  async createValidation(input: { body: SystemControlCreateSecretValidationBody; idempotencyKey: string; requestId: string; principal: SystemControlPrincipal }): Promise<{ validation: SystemControlSecretValidation; replay: boolean }> {
    const key = validIdempotencyKey(input.idempotencyKey);
    const hash = stableSystemControlDigest(input.body);
    return this.transaction(async (client) => {
      await this.lockCommand(client, 'secret_validation', input.body.validationRunId);
      await this.lockCommand(client, 'secret_validation_key', key);
      const existing = await client.query<{ request_hash: string; idempotency_key: string; resource_id: string; response_snapshot: SystemControlSecretValidation }>('SELECT request_hash,idempotency_key,resource_id,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 OR (command_kind=$2 AND idempotency_key=$3) FOR UPDATE', [input.body.validationRunId, 'secret_validation', key]);
      if (existing.rows[0]) {
        if (existing.rows[0].idempotency_key !== key) throw engineConflict('SYSTEM_CONTROL_SECRET_VALIDATION_ID_REUSED', 'validationRunId 已绑定另一幂等请求。');
        if (existing.rows[0].request_hash !== hash) throw engineConflict('SYSTEM_CONTROL_ENGINE_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同校验请求。');
        return { validation: existing.rows[0].response_snapshot, replay: true };
      }
      const version = await this.referenceVersion(client, input.body.secretReferenceVersionId);
      if (!version) throw versionNotFound('Secret 引用版本不存在。');
      if (version.status === 'revoked') throw engineInvalid('SYSTEM_CONTROL_SECRET_REFERENCE_VERSION_NOT_FOUND', '已撤销的 Secret 引用版本不能校验。');
      const duplicate = await client.query('SELECT 1 FROM system_secret_validation_runs WHERE id=$1', [input.body.validationRunId]);
      if (duplicate.rows[0]) throw engineConflict('SYSTEM_CONTROL_SECRET_VALIDATION_ID_REUSED', 'validationRunId 已被占用。');
      const now = new Date();
      await client.query('INSERT INTO system_secret_validation_runs(id,secret_reference_version_id,status,request_id,queued_at,updated_at) VALUES($1,$2,\'queued\',$3,$4,$4)', [input.body.validationRunId, input.body.secretReferenceVersionId, input.requestId, now]);
      const validation: SystemControlSecretValidation = { validationRunId: input.body.validationRunId, secretReferenceVersionId: input.body.secretReferenceVersionId, status: 'queued', requestId: input.requestId, attemptCount: 0, latencyMs: null, reasonCode: null, reasonMessage: null, queuedAt: now.toISOString(), startedAt: null, completedAt: null, attempts: [] };
      await client.query('INSERT INTO system_control_commands(command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES($1,$2,$3,$4,$5,$6)', ['secret_validation', key, input.body.validationRunId, hash, input.body.secretReferenceVersionId, validation]);
      await this.audit(client, { principal: input.principal, requestId: input.requestId, action: 'secret_validation_created', resourceType: 'secret_validation', resourceId: input.body.validationRunId, idempotencyKey: key, result: 'succeeded', afterSnapshot: { secretReferenceVersionId: input.body.secretReferenceVersionId, status: 'queued' } });
      return { validation, replay: false };
    });
  }

  async getValidation(validationRunId: string) { return this.getValidationRow(validationRunId); }

  async listValidations(query: SystemControlSecretValidationListQuery): Promise<SystemControlSecretValidationList> {
    const page = parsePage(query);
    const result = await this.pool.query<any>('SELECT r.*,COUNT(*) OVER()::text AS total FROM system_secret_validation_runs r WHERE ($1::text IS NULL OR r.status=$1) ORDER BY r.queued_at DESC,r.id DESC LIMIT $2 OFFSET $3', [query.status ?? null, page.limit, page.offset]);
    const items = await Promise.all(result.rows.map((row) => this.getValidationRow(row.id)));
    const totalResult = await this.pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM system_secret_validation_runs WHERE ($1::text IS NULL OR status=$1)', [query.status ?? null]);
    return { items, total: Number(totalResult.rows[0]?.total ?? 0), ...page };
  }

  async listVersionValidations(referenceId: string, versionId: string, query: { limit?: string; offset?: string }) {
    const version = await this.pool.query('SELECT 1 FROM system_secret_reference_versions WHERE id=$1 AND secret_reference_id=$2', [versionId, referenceId]);
    if (!version.rows[0]) throw versionNotFound('Secret 引用版本不存在。');
    const page = parsePage(query);
    const result = await this.pool.query<any>('SELECT r.id,COUNT(*) OVER()::text AS total FROM system_secret_validation_runs r WHERE r.secret_reference_version_id=$1 ORDER BY r.queued_at DESC,r.id DESC LIMIT $2 OFFSET $3', [versionId, page.limit, page.offset]);
    const totalResult = await this.pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM system_secret_validation_runs WHERE secret_reference_version_id=$1', [versionId]);
    return { items: await Promise.all(result.rows.map((row) => this.getValidationRow(row.id))), total: Number(totalResult.rows[0]?.total ?? 0), ...page };
  }

  async listUsage(referenceId: string, query: SystemControlSecretUsageListQuery) : Promise<SystemControlSecretUsageList> {
    const page = parsePage(query);
    const reference = await this.pool.query('SELECT 1 FROM system_secret_references WHERE id=$1', [referenceId]);
    if (!reference.rows[0]) throw engineNotFound('SecretReference 不存在。');
    if (query.versionId) {
      const owned = await this.pool.query('SELECT 1 FROM system_secret_reference_versions WHERE id=$1 AND secret_reference_id=$2', [query.versionId, referenceId]);
      if (!owned.rows[0]) throw versionNotFound('Secret 引用版本不存在。');
    }
    const result = await this.pool.query<any>(`SELECT d.id AS deployment_id,v.id AS deployment_version_id,v.version AS deployment_version,d.display_name AS deployment_display_name,d.status AS deployment_status,d.capability,d.provider,v.secret_reference_version_id,v.created_at AS updated_at,COUNT(*) OVER()::text AS total
      FROM engine_deployment_versions v JOIN engine_deployments d ON d.id=v.deployment_id
      WHERE v.secret_reference_version_id IN (SELECT id FROM system_secret_reference_versions WHERE secret_reference_id=$1) AND ($2::uuid IS NULL OR v.secret_reference_version_id=$2)
      ORDER BY v.created_at DESC,v.id DESC LIMIT $3 OFFSET $4`, [referenceId, query.versionId ?? null, page.limit, page.offset]);
    const totalResult = await this.pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM engine_deployment_versions WHERE secret_reference_version_id IN (SELECT id FROM system_secret_reference_versions WHERE secret_reference_id=$1) AND ($2::uuid IS NULL OR secret_reference_version_id=$2)', [referenceId, query.versionId ?? null]);
    return { items: result.rows.map((row) => ({ deploymentId: row.deployment_id, deploymentVersionId: row.deployment_version_id, deploymentVersion: row.deployment_version, deploymentDisplayName: row.deployment_display_name, deploymentStatus: row.deployment_status, capability: row.capability, provider: row.provider, secretReferenceVersionId: row.secret_reference_version_id, updatedAt: row.updated_at.toISOString() })), total: Number(totalResult.rows[0]?.total ?? 0), ...page };
  }

  async listAudit(referenceId: string, query: SystemControlSecretAuditListQuery): Promise<SystemControlSecretAuditList> {
    const page = parsePage(query);
    const reference = await this.pool.query('SELECT 1 FROM system_secret_references WHERE id=$1', [referenceId]);
    if (!reference.rows[0]) throw engineNotFound('SecretReference 不存在。');
    const result = await this.pool.query<any>(`SELECT a.id AS event_id,a.action,a.resource_type,a.resource_id,a.actor_subject,a.request_id,a.result,a.created_at,COUNT(*) OVER()::text AS total
      FROM system_control_audit_events a
      WHERE ((a.resource_type='secret_reference' AND a.resource_id=$1) OR (a.resource_type='secret_reference_version' AND a.resource_id IN (SELECT id FROM system_secret_reference_versions WHERE secret_reference_id=$1)) OR (a.resource_type='secret_validation' AND a.resource_id IN (SELECT id FROM system_secret_validation_runs WHERE secret_reference_version_id IN (SELECT id FROM system_secret_reference_versions WHERE secret_reference_id=$1))))
        AND ($2::uuid IS NULL OR a.resource_id=$2 OR a.resource_id IN (SELECT id FROM system_secret_validation_runs WHERE secret_reference_version_id=$2))
      ORDER BY a.created_at DESC,a.id DESC LIMIT $3 OFFSET $4`, [referenceId, query.versionId ?? null, page.limit, page.offset]);
    const totalResult = await this.pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM system_control_audit_events a WHERE ((a.resource_type='secret_reference' AND a.resource_id=$1) OR (a.resource_type='secret_reference_version' AND a.resource_id IN (SELECT id FROM system_secret_reference_versions WHERE secret_reference_id=$1)) OR (a.resource_type='secret_validation' AND a.resource_id IN (SELECT id FROM system_secret_validation_runs WHERE secret_reference_version_id IN (SELECT id FROM system_secret_reference_versions WHERE secret_reference_id=$1)))) AND ($2::uuid IS NULL OR a.resource_id=$2 OR a.resource_id IN (SELECT id FROM system_secret_validation_runs WHERE secret_reference_version_id=$2))`, [referenceId, query.versionId ?? null]);
    return { items: result.rows.map((row) => ({ eventId: row.event_id, action: row.action, resourceType: row.resource_type, resourceId: row.resource_id, actorSubject: row.actor_subject, requestId: row.request_id, result: row.result, createdAt: row.created_at.toISOString() })), total: Number(totalResult.rows[0]?.total ?? 0), ...page };
  }

  async getCommand(commandId: string): Promise<SystemControlSecretCommand> {
    const result = await this.pool.query<{ response_snapshot: SystemControlSecretCommand }>(`SELECT response_snapshot FROM system_control_commands WHERE stable_command_key=$1 AND command_kind IN ('secret_reference_create','secret_reference_rotate','secret_reference_revoke')`, [commandId]);
    if (!result.rows[0]) throw secretCommandNotFound('Secret 命令不存在。');
    return result.rows[0].response_snapshot;
  }

  async getRevokePreflight(referenceId: string, versionId: string): Promise<SystemControlSecretRevokePreflight> {
    const checked = await this.pool.query<{ now: Date }>('SELECT CURRENT_TIMESTAMP AS now');
    const owned = await this.pool.query<{ status: VersionRow['status'] }>(`SELECT CASE WHEN latest.status='available' AND success.created_at + interval '90 days' <= CURRENT_TIMESTAMP THEN 'rotation_due' ELSE COALESCE(latest.status,'unknown') END AS status FROM system_secret_reference_versions v LEFT JOIN LATERAL (SELECT e.status,e.created_at FROM system_secret_reference_status_events e WHERE e.secret_reference_version_id=v.id ORDER BY e.created_at DESC,e.id DESC LIMIT 1) latest ON true LEFT JOIN LATERAL (SELECT e.created_at FROM system_secret_reference_status_events e WHERE e.secret_reference_version_id=v.id AND e.status='available' ORDER BY e.created_at DESC,e.id DESC LIMIT 1) success ON true WHERE v.id=$1 AND v.secret_reference_id=$2`, [versionId, referenceId]);
    if (!owned.rows[0]) throw versionNotFound('Secret 引用版本不存在。');
    const affectedCountResult = await this.pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM engine_deployment_versions WHERE secret_reference_version_id=$1', [versionId]);
    const affected = await this.pool.query<any>(`SELECT d.id AS deployment_id,v.id AS deployment_version_id,v.version AS deployment_version,d.display_name AS deployment_display_name,d.status AS deployment_status,d.capability,d.provider,v.secret_reference_version_id,v.created_at AS updated_at FROM engine_deployment_versions v JOIN engine_deployments d ON d.id=v.deployment_id WHERE v.secret_reference_version_id=$1 ORDER BY v.created_at DESC,v.id DESC LIMIT 101`, [versionId]);
    const active = await this.pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM active_control_plane_pointers p JOIN routing_policy_targets target ON target.routing_version_id=p.routing_version_id JOIN engine_deployment_versions v ON v.id=target.deployment_version_id WHERE v.secret_reference_version_id=$1`, [versionId]);
    const attempts = await this.pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM asr_attempts WHERE deployment_version_id IN (SELECT id FROM engine_deployment_versions WHERE secret_reference_version_id=$1) AND status NOT IN ('completed','failed','cancelled')`, [versionId]);
    const screen = await this.pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM screen_text_attempts WHERE deployment_version_id IN (SELECT id FROM engine_deployment_versions WHERE secret_reference_version_id=$1) AND status NOT IN ('completed','failed','cancelled')`, [versionId]);
    const affectedCount = Number(affectedCountResult.rows[0]?.count ?? 0);
    const activeRouteReferenceCount = Number(active.rows[0]?.count ?? 0);
    const nonTerminalAttemptCount = Number(attempts.rows[0]?.count ?? 0) + Number(screen.rows[0]?.count ?? 0);
    return { secretReferenceId: referenceId, secretReferenceVersionId: versionId, currentStatus: owned.rows[0].status, activeRouteReferenceCount, nonTerminalAttemptCount, affectedEngineDeploymentVersionCount: affectedCount, affectedEngineVersions: affected.rows.slice(0, 100).map((row) => ({ deploymentId: row.deployment_id, deploymentVersionId: row.deployment_version_id, deploymentVersion: row.deployment_version, deploymentDisplayName: row.deployment_display_name, deploymentStatus: row.deployment_status, capability: row.capability, provider: row.provider, secretReferenceVersionId: row.secret_reference_version_id, updatedAt: row.updated_at.toISOString() })), truncated: affectedCount > 100, canRevoke: owned.rows[0].status !== 'revoked' && activeRouteReferenceCount === 0 && nonTerminalAttemptCount === 0, checkedAt: checked.rows[0]!.now.toISOString() };
  }
}
