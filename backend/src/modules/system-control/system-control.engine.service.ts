import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  SystemControlConnectionTest,
  SystemControlCreateConnectionTestBody,
  SystemControlCreateEngineDeploymentBody,
  SystemControlCreateEngineVersionBody,
  SystemControlEngineDeployment,
  SystemControlEngineDeploymentVersion,
  SystemControlEngineDetail,
  SystemControlEngineList,
  SystemControlEngineListQuery,
  SystemControlEngineVersionList,
  SystemControlEngineVersionListQuery,
  SystemControlSecretReferenceSummary,
  SystemControlConnectionTestList,
  SystemControlConnectionTestListQuery,
  SystemControlSecretVersionAction,
  SystemControlEngineStatusCommand,
  SystemControlEngineStatusCommandBody,
  SystemControlEngineCapability,
  SystemControlEngineExecutionKind,
  SystemControlRuntimeConfig,
  SystemControlRuntimeConfigInput,
  SystemControlScreenTextRuntimeConfig,
  SystemControlScreenTextRuntimeConfigInput,
  SystemControlTermRuntimeConfigInput,
  SystemControlTermRuntimeConfig,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';
import type { SystemControlPrincipal } from './system-control.auth.js';
import { SystemControlSecretService } from './system-control.secret.service.js';
import { engineConflict, engineInvalid, engineNotFound, versionNotFound, connectionTestNotFound, statusCommandNotFound } from './system-control.engine.errors.js';
import { resolveRegisteredEngine, resolveTermRuntimeConfig, toCapabilitiesSnapshot, type RegisteredEngine } from './system-control.engine-registry.js';
import { resolveScreenTextRuntimeConfig } from '../screen-text/screen-text-runtime-config.js';
import type { AsrAdapterRegistry } from '../asr/asr-adapter-registry.js';
import type { ScreenTextAdapterRegistry } from '../screen-text/screen-text.adapter-registry.js';

type Registries = { asr: AsrAdapterRegistry; screenText: ScreenTextAdapterRegistry; terms?: import('../terms/term-extraction.js').TermExtractionAdapter };
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

type DeploymentRow = {
  id: string; capability: SystemControlEngineDeployment['capability']; execution_kind: SystemControlEngineDeployment['executionKind'];
  display_name: string; provider: string; adapter_key: string; status: SystemControlEngineDeployment['status'];
  created_at: Date; updated_at: Date;
};

type VersionRow = {
  id: string; deployment_id: string; version: number; model: string; language: string;
  endpoint_reference: string | null; region_hint: string | null; capabilities_snapshot: any;
  secret_reference_version_id: string | null; secret_reference_summary: any; runtime_config: SystemControlRuntimeConfig | null;
  config_digest: string; billing_snapshot: any; created_at: Date;
};

type TestRow = {
  id: string; deployment_version_id: string; capability: SystemControlConnectionTest['capability'];
  execution_kind: SystemControlConnectionTest['executionKind']; adapter_key: string;
  status: SystemControlConnectionTest['status']; request_id: string; attempt_count: number;
  latency_ms: number | null; capabilities_snapshot: any; reason_code: string | null; reason_message: string | null;
  queued_at: Date; started_at: Date | null; completed_at: Date | null;
};


const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, stableValue(entry)]),
  );
  return value;
};

export const stableSystemControlDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');

const toDeployment = (row: DeploymentRow, latestVersion: number | null): SystemControlEngineDeployment => ({
  deploymentId: row.id, capability: row.capability, executionKind: row.execution_kind, displayName: row.display_name,
  provider: row.provider, adapterKey: row.adapter_key, status: row.status, latestVersion,
  createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
});

const toSecretSummary = (value: unknown, versionId?: string | null): SystemControlSecretReferenceSummary => {
  const parsed = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const summary: SystemControlSecretReferenceSummary = {
    present: parsed.present === true,
    referenceDigest: typeof parsed.referenceDigest === 'string' ? parsed.referenceDigest : null,
    redactedLabel: typeof parsed.redactedLabel === 'string' ? parsed.redactedLabel : null,
  };
  if (typeof parsed.secretReferenceId === 'string') summary.secretReferenceId = parsed.secretReferenceId;
  if (versionId || typeof parsed.secretReferenceVersionId === 'string') summary.secretReferenceVersionId = typeof parsed.secretReferenceVersionId === 'string' ? parsed.secretReferenceVersionId : versionId ?? null;
  if (typeof parsed.status === 'string') summary.status = parsed.status as NonNullable<SystemControlSecretReferenceSummary['status']>;
  return summary;
};

const toVersion = (row: VersionRow): SystemControlEngineDeploymentVersion => ({
  versionId: row.id, deploymentId: row.deployment_id, version: row.version, model: row.model, language: row.language,
  endpointReference: row.endpoint_reference, regionHint: row.region_hint,
  capabilitiesSnapshot: row.capabilities_snapshot, secretReference: toSecretSummary(row.secret_reference_summary, row.secret_reference_version_id),
  ...(row.runtime_config ? { runtimeConfig: row.runtime_config } : {}),
  configDigest: row.config_digest, billingSnapshot: row.billing_snapshot, createdAt: row.created_at.toISOString(),
});

const toTest = (row: TestRow, attempts: SystemControlConnectionTest['attempts']): SystemControlConnectionTest => ({
  testRunId: row.id, deploymentVersionId: row.deployment_version_id, capability: row.capability,
  executionKind: row.execution_kind, adapterKey: row.adapter_key, status: row.status, requestId: row.request_id,
  attemptCount: row.attempt_count, latencyMs: row.latency_ms, capabilitiesSnapshot: row.capabilities_snapshot,
  reasonCode: row.reason_code, reasonMessage: row.reason_message, queuedAt: row.queued_at.toISOString(),
  startedAt: row.started_at?.toISOString() ?? null, completedAt: row.completed_at?.toISOString() ?? null, attempts,
});

const commandKey = (kind: string, key: string) => `${kind}:${key}`;

const validKey = (value: string | undefined) => {
  const key = value?.trim() ?? '';
  if (!key || key.length > 200 || /[\r\n]/.test(key)) throw engineInvalid('SYSTEM_CONTROL_ENGINE_INVALID_REFERENCE', 'Idempotency-Key 必须是非空且不含控制字符的稳定值。', 'use_stable_idempotency_key');
  return key;
};

const safeReference = (value: string | undefined, field: string): string | null => {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 255 || /:\/\/|[?&#<>\s\r\n]/.test(trimmed)) {
    throw engineInvalid('SYSTEM_CONTROL_ENGINE_INVALID_REFERENCE', `${field} 只能是受控引用，不得包含 URL、请求参数或脚本字符。`);
  }
  return trimmed;
};

type SecretState = { referenceVersionId: string | null; summary: SystemControlSecretReferenceSummary };

const makeConfigDigest = (engine: RegisteredEngine, endpointReference: string | null, regionHint: string | null, runtimeConfig: SystemControlRuntimeConfig | null, secret: SecretState) => stableSystemControlDigest({
  capability: engine.capability, executionKind: engine.executionKind, provider: engine.provider, adapterKey: engine.adapterKey,
  model: engine.model, language: engine.language, descriptorDigest: engine.descriptorDigest, endpointReference, regionHint,
  runtimeConfig,
  secretReferenceVersionId: secret.referenceVersionId, secretReferenceDigest: secret.summary.referenceDigest,
  billing: 'billing' in engine.descriptor ? engine.descriptor.billing : null,
});

const billingSnapshot = (engine: RegisteredEngine) => 'billing' in engine.descriptor ? engine.descriptor.billing : null;

const noSecret = (): SecretState => ({ referenceVersionId: null, summary: { present: false, secretReferenceVersionId: null, referenceDigest: null, redactedLabel: null } });

export class SystemControlEngineService {
  constructor(
    private readonly pool: DatabasePool,
    private readonly registries: Registries,
    private readonly secretService?: SystemControlSecretService,
  ) {}

  private get secrets() { return this.secretService ?? new SystemControlSecretService(this.pool); }

  private resolveTermConfig(input: unknown) {
    try { return resolveTermRuntimeConfig(input as SystemControlTermRuntimeConfigInput | SystemControlTermRuntimeConfig | null | undefined); }
    catch (error) { throw engineInvalid('SYSTEM_CONTROL_ENGINE_CAPABILITY_MISMATCH', error instanceof Error ? error.message : '术语 runtimeConfig 不符合要求。'); }
  }

  private resolveScreenConfig(adapterKey: string, input: SystemControlScreenTextRuntimeConfigInput | SystemControlScreenTextRuntimeConfig | Record<string, unknown> | null | undefined) {
    try { return resolveScreenTextRuntimeConfig(adapterKey, input); }
    catch (error) { throw engineInvalid('SYSTEM_CONTROL_ENGINE_CAPABILITY_MISMATCH', error instanceof Error ? error.message : 'screen-text 抽帧 runtimeConfig 不符合要求。'); }
  }

  private async resolveCreateSecret(client: PoolClient, versionId: string | undefined, engine: RegisteredEngine): Promise<SecretState> {
    if (!versionId) return noSecret();
    const binding = await this.secrets.getBindableVersion(client, versionId, { capability: engine.capability, provider: engine.provider });
    return { referenceVersionId: binding.versionId, summary: binding.summary };
  }

  private async resolveVersionSecret(
    action: SystemControlSecretVersionAction,
    client: PoolClient,
    previous: { secret_reference_version_id: string | null; secret_reference_summary: unknown } | undefined,
    engine: RegisteredEngine,
  ): Promise<SecretState> {
    if (action.action === 'inherit') {
      if (!previous?.secret_reference_version_id) return noSecret();
      const binding = await this.secrets.getBindableVersion(client, previous.secret_reference_version_id, { capability: engine.capability, provider: engine.provider });
      return { referenceVersionId: binding.versionId, summary: binding.summary };
    }
    if (action.action === 'clear') return noSecret();
    const binding = await this.secrets.getBindableVersion(client, action.secretReferenceVersionId, { capability: engine.capability, provider: engine.provider });
    return { referenceVersionId: binding.versionId, summary: binding.summary };
  }

  private async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await callback(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  private async lockCommand(client: PoolClient, kind: string, idempotencyKey: string) {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [commandKey(kind, idempotencyKey)]);
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

  private async resolveForBody(body: {
    capability: SystemControlEngineCapability;
    executionKind: SystemControlEngineExecutionKind;
    adapterKey: string;
    model?: string;
    runtimeConfig?: SystemControlRuntimeConfigInput | SystemControlRuntimeConfig;
  }) {
    const screenRuntimeConfigAllowed = body.capability === 'screen_text' && body.adapterKey === 'screen_text_openvino_ppocrv6_small';
    if (body.model !== undefined && body.capability !== 'terms') {
      throw engineInvalid('SYSTEM_CONTROL_ENGINE_CAPABILITY_MISMATCH', '只有 terms 部署可以提供 model。');
    }
    if (body.runtimeConfig !== undefined && body.capability !== 'terms' && !screenRuntimeConfigAllowed) {
      throw engineInvalid('SYSTEM_CONTROL_ENGINE_CAPABILITY_MISMATCH', '只有 screen_text_openvino_ppocrv6_small 可以提供抽帧 runtimeConfig。');
    }
    try { return resolveRegisteredEngine(this.registries, body.capability, body.executionKind, body.adapterKey, body.runtimeConfig, body.model); }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        const code = error.code === 'ADAPTER_NOT_REGISTERED' ? 'SYSTEM_CONTROL_ENGINE_ADAPTER_NOT_REGISTERED'
          : error.code === 'EXECUTION_KIND_MISMATCH' ? 'SYSTEM_CONTROL_ENGINE_EXECUTION_KIND_MISMATCH'
            : 'SYSTEM_CONTROL_ENGINE_CAPABILITY_MISMATCH';
        throw engineInvalid(code, error instanceof Error ? error.message : 'Registry 描述不匹配。');
      }
      throw error;
    }
  }

  async createDeployment(input: {
    body: SystemControlCreateEngineDeploymentBody;
    idempotencyKey: string;
    requestId: string;
    principal: SystemControlPrincipal;
  }): Promise<{ detail: SystemControlEngineDetail; replay: boolean }> {
    const key = validKey(input.idempotencyKey);
    const requestHash = stableSystemControlDigest(input.body);
    const requestedId = input.body.deploymentId;
    return this.transaction(async (client) => {
      await this.lockCommand(client, 'engine_deployment_create', key);
      const existing = await client.query<{ request_hash: string; resource_id: string; response_snapshot: SystemControlEngineDetail }>(
        'SELECT request_hash, resource_id, response_snapshot FROM system_control_commands WHERE command_kind = $1 AND idempotency_key = $2', ['engine_deployment_create', key],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== requestHash) throw engineConflict('SYSTEM_CONTROL_ENGINE_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同的引擎部署请求。');
        return { detail: existing.rows[0].response_snapshot, replay: true };
      }
      if (!input.body.displayName.trim()) throw engineInvalid('SYSTEM_CONTROL_ENGINE_INVALID_REFERENCE', '部署显示名称不能为空。');
      const isTerms = input.body.capability === 'terms';
      const isScreenText = input.body.capability === 'screen_text';
      if (input.body.model !== undefined && !isTerms) {
        throw engineInvalid('SYSTEM_CONTROL_ENGINE_CAPABILITY_MISMATCH', '只有 terms 部署可以提供 model。');
      }
      if (input.body.runtimeConfig !== undefined && !isTerms && !(isScreenText && input.body.adapterKey === 'screen_text_openvino_ppocrv6_small')) {
        throw engineInvalid('SYSTEM_CONTROL_ENGINE_CAPABILITY_MISMATCH', '只有 screen_text_openvino_ppocrv6_small 可以提供抽帧 runtimeConfig。');
      }
      if (isTerms && (input.body.endpointReference !== undefined || input.body.regionHint !== undefined)) {
        throw engineInvalid('SYSTEM_CONTROL_ENGINE_INVALID_REFERENCE', 'terms 部署必须把 endpoint 保存在 runtimeConfig 中。');
      }
      const runtimeConfig = isTerms
        ? this.resolveTermConfig(input.body.runtimeConfig)
        : isScreenText ? this.resolveScreenConfig(input.body.adapterKey, input.body.runtimeConfig as never) : null;
      const engine = await this.resolveForBody({ ...input.body, ...(runtimeConfig ? { runtimeConfig } : {}) });
      const endpointReference = isTerms ? null : safeReference(input.body.endpointReference, 'endpointReference');
      const regionHint = isTerms ? null : safeReference(input.body.regionHint, 'regionHint');
      const secret = await this.resolveCreateSecret(client, input.body.secretReferenceVersionId, engine);
      const deploymentId = requestedId;
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`engine-deployment:${deploymentId}`]);
      const duplicate = await client.query('SELECT 1 FROM engine_deployments WHERE id = $1', [deploymentId]);
      if (duplicate.rows[0]) throw engineConflict('SYSTEM_CONTROL_ENGINE_ID_REUSED', 'deploymentId 已经绑定到另一部署。', 'use_new_deployment_id');
      const deploymentResult = await client.query<DeploymentRow>(`INSERT INTO engine_deployments(id,capability,execution_kind,display_name,provider,adapter_key)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [deploymentId, input.body.capability, input.body.executionKind, input.body.displayName.trim(), engine.provider, engine.adapterKey]);
      const configDigest = makeConfigDigest(engine, endpointReference, regionHint, runtimeConfig, secret);
      const duplicateVersion = await client.query<{ deployment_id: string }>('SELECT deployment_id FROM engine_deployment_versions WHERE id = $1 FOR UPDATE', [input.body.versionId]);
      if (duplicateVersion.rows[0]) throw engineConflict('SYSTEM_CONTROL_ENGINE_VERSION_ID_REUSED', 'versionId 已经绑定到另一不可变版本。', 'use_new_version_id');
      const versionResult = await client.query<VersionRow>(`INSERT INTO engine_deployment_versions
        (id,deployment_id,version,model,language,endpoint_reference,region_hint,capabilities_snapshot,secret_reference_version_id,secret_reference_summary,runtime_config,config_digest,billing_snapshot)
        VALUES($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [input.body.versionId, deploymentId, engine.model, engine.language, endpointReference, regionHint, toCapabilitiesSnapshot(engine), secret.referenceVersionId, secret.summary, runtimeConfig, configDigest, billingSnapshot(engine)]);
      const deployment = toDeployment(deploymentResult.rows[0]!, 1);
      const version = toVersion(versionResult.rows[0]!);
      const detail = { deployment, latestVersion: version };
      await client.query(`INSERT INTO system_control_commands(command_kind,idempotency_key,request_hash,resource_id,response_snapshot)
        VALUES($1,$2,$3,$4,$5)`, ['engine_deployment_create', key, requestHash, deploymentId, detail]);
      await this.audit(client, { principal: input.principal, requestId: input.requestId, action: 'engine_deployment_created', resourceType: 'engine_deployment', resourceId: deploymentId, idempotencyKey: key, result: 'succeeded', afterSnapshot: detail });
      return { detail, replay: false };
    });
  }

  private async assertDeploymentNotActiveInRouting(client: PoolClient, deploymentId: string) {
    // 与发布事务使用同一组指针锁，确保停用检查和 active 指针变更不会交错。
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['routing-pointer:development:asr']);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['routing-pointer:development:screen_text']);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['routing-pointer:development:terms']);
    const active = await client.query(`
      SELECT 1
      FROM active_control_plane_pointers p
      JOIN routing_policy_targets target ON target.routing_version_id = p.routing_version_id
      JOIN engine_deployment_versions v ON v.id = target.deployment_version_id
      JOIN LATERAL (
        SELECT status
        FROM routing_policy_status_events
        WHERE routing_version_id = p.routing_version_id
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ) current_status ON current_status.status = 'active'
      WHERE v.deployment_id = $1
      LIMIT 1`, [deploymentId]);
    if (active.rows[0]) {
      throw engineConflict('SYSTEM_CONTROL_ENGINE_DISABLED_ACTIVE_ROUTE', '该部署仍被当前生效路由使用，请先切换 active 路由。', 'switch_active_routing');
    }
  }

  async setDeploymentStatus(input: {
    deploymentId: string;
    body: SystemControlEngineStatusCommandBody;
    idempotencyKey: string;
    requestId: string;
    principal: SystemControlPrincipal;
  }): Promise<{ command: SystemControlEngineStatusCommand; replay: boolean }> {
    const key = validKey(input.idempotencyKey);
    const stableKey = input.body.statusCommandId;
    const requestHash = stableSystemControlDigest({ deploymentId: input.deploymentId, body: input.body });
    return this.transaction(async (client) => {
      await this.lockCommand(client, 'engine_deployment_status', key);
      // stable_command_key 跨 command kind 全局唯一，必须与 routing command 共用同一事务锁。
      // 这样同一 statusCommandId 的异键并发请求会先后读取命令事实，再稳定返回业务冲突。
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`routing-command:${stableKey}`]);
      const byStable = await client.query<{ command_kind: string; idempotency_key: string; request_hash: string; response_snapshot: SystemControlEngineStatusCommand | null }>(
        'SELECT command_kind,idempotency_key,request_hash,response_snapshot FROM system_control_commands WHERE stable_command_key = $1 FOR UPDATE', [stableKey],
      );
      if (byStable.rows[0]) {
        const existing = byStable.rows[0];
        if (existing.command_kind !== 'engine_deployment_status' || existing.idempotency_key !== key || existing.request_hash !== requestHash || !existing.response_snapshot) {
          throw engineConflict('SYSTEM_CONTROL_ENGINE_STATUS_COMMAND_ID_REUSED', 'statusCommandId 已绑定另一条部署状态命令。', 'reload_engine_status_command');
        }
        return { command: existing.response_snapshot, replay: true };
      }
      const byKey = await client.query<{ stable_command_key: string; request_hash: string; response_snapshot: SystemControlEngineStatusCommand | null }>(
        'SELECT stable_command_key,request_hash,response_snapshot FROM system_control_commands WHERE command_kind = $1 AND idempotency_key = $2 FOR UPDATE', ['engine_deployment_status', key],
      );
      if (byKey.rows[0]) {
        if (byKey.rows[0].stable_command_key !== stableKey || byKey.rows[0].request_hash !== requestHash || !byKey.rows[0].response_snapshot) {
          throw engineConflict('SYSTEM_CONTROL_ENGINE_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同的部署状态请求。');
        }
        return { command: byKey.rows[0].response_snapshot, replay: true };
      }

      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`engine-deployment:${input.deploymentId}`]);
      const deploymentResult = await client.query<DeploymentRow>('SELECT * FROM engine_deployments WHERE id = $1 FOR UPDATE', [input.deploymentId]);
      const deployment = deploymentResult.rows[0];
      if (!deployment) throw engineNotFound('引擎部署不存在。');
      if (input.body.status === 'disabled') await this.assertDeploymentNotActiveInRouting(client, input.deploymentId);

      if (deployment.status !== input.body.status) {
        await client.query('UPDATE engine_deployments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [input.body.status, input.deploymentId]);
      }
      const now = await client.query<{ now: Date }>('SELECT CURRENT_TIMESTAMP AS now');
      const command: SystemControlEngineStatusCommand = {
        statusCommandId: stableKey,
        deploymentId: input.deploymentId,
        targetStatus: input.body.status,
        resultingStatus: input.body.status,
        status: 'succeeded',
        requestId: input.requestId,
        createdAt: now.rows[0]!.now.toISOString(),
      };
      await client.query(`INSERT INTO system_control_commands(command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot)
        VALUES($1,$2,$3,$4,$5,$6)`, ['engine_deployment_status', key, stableKey, requestHash, input.deploymentId, command]);
      await this.audit(client, {
        principal: input.principal,
        requestId: input.requestId,
        action: 'engine_deployment_status_changed',
        resourceType: 'engine_deployment',
        resourceId: input.deploymentId,
        idempotencyKey: key,
        result: 'succeeded',
        afterSnapshot: { deploymentId: input.deploymentId, status: input.body.status },
      });
      return { command, replay: false };
    });
  }

  async getStatusCommand(statusCommandId: string): Promise<SystemControlEngineStatusCommand> {
    const result = await this.pool.query<{ response_snapshot: SystemControlEngineStatusCommand | null }>(
      `SELECT response_snapshot FROM system_control_commands WHERE command_kind = 'engine_deployment_status' AND stable_command_key = $1`, [statusCommandId],
    );
    const snapshot = result.rows[0]?.response_snapshot;
    if (!snapshot) throw statusCommandNotFound('部署状态命令不存在。');
    return snapshot;
  }

  async createVersion(input: {
    deploymentId: string; body: SystemControlCreateEngineVersionBody; idempotencyKey: string; requestId: string; principal: SystemControlPrincipal;
  }): Promise<{ version: SystemControlEngineDeploymentVersion; replay: boolean }> {
    const key = validKey(input.idempotencyKey); const requestHash = stableSystemControlDigest({ deploymentId: input.deploymentId, body: input.body });
    return this.transaction(async (client) => {
      await this.lockCommand(client, 'engine_version_create', key);
      const existing = await client.query<{ request_hash: string; response_snapshot: { version: SystemControlEngineDeploymentVersion } }>(
        'SELECT request_hash, response_snapshot FROM system_control_commands WHERE command_kind = $1 AND idempotency_key = $2', ['engine_version_create', key],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== requestHash) throw engineConflict('SYSTEM_CONTROL_ENGINE_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同的引擎版本请求。');
        return { version: existing.rows[0].response_snapshot.version, replay: true };
      }
      const deploymentResult = await client.query<DeploymentRow>('SELECT * FROM engine_deployments WHERE id = $1 FOR UPDATE', [input.deploymentId]);
      const deployment = deploymentResult.rows[0]; if (!deployment) throw engineNotFound('引擎部署不存在。');
      const isTerms = deployment.capability === 'terms';
      const isScreenText = deployment.capability === 'screen_text';
      if (input.body.model !== undefined && !isTerms) {
        throw engineInvalid('SYSTEM_CONTROL_ENGINE_CAPABILITY_MISMATCH', '只有 terms 部署可以提供 model。');
      }
      if (input.body.runtimeConfig !== undefined && !isTerms && !(isScreenText && deployment.adapter_key === 'screen_text_openvino_ppocrv6_small')) {
        throw engineInvalid('SYSTEM_CONTROL_ENGINE_CAPABILITY_MISMATCH', '只有 screen_text_openvino_ppocrv6_small 可以提供抽帧 runtimeConfig。');
      }
      if (isTerms && (input.body.endpointReference !== undefined || input.body.regionHint !== undefined)) {
        throw engineInvalid('SYSTEM_CONTROL_ENGINE_INVALID_REFERENCE', 'terms 部署必须把 endpoint 保存在 runtimeConfig 中。');
      }
      const previousResult = await client.query<Pick<VersionRow, 'model' | 'runtime_config' | 'secret_reference_version_id' | 'secret_reference_summary'>>('SELECT model,runtime_config,secret_reference_version_id,secret_reference_summary FROM engine_deployment_versions WHERE deployment_id = $1 ORDER BY version DESC LIMIT 1 FOR UPDATE', [input.deploymentId]);
      const previous = previousResult.rows[0];
      const runtimeConfig = isTerms
        ? this.resolveTermConfig(input.body.runtimeConfig ?? previous?.runtime_config)
        : isScreenText ? this.resolveScreenConfig(deployment.adapter_key, (input.body.runtimeConfig ?? previous?.runtime_config) as never) : null;
      const engine = isTerms
        ? await this.resolveForBody({ capability: deployment.capability, executionKind: deployment.execution_kind, adapterKey: deployment.adapter_key, runtimeConfig: runtimeConfig!, ...(input.body.model !== undefined ? { model: input.body.model } : previous?.model !== undefined ? { model: previous.model } : {}) })
        : await this.resolveForBody({ capability: deployment.capability, executionKind: deployment.execution_kind, adapterKey: deployment.adapter_key, ...(runtimeConfig ? { runtimeConfig } : {}) });
      const endpointReference = isTerms ? null : safeReference(input.body.endpointReference, 'endpointReference');
      const regionHint = isTerms ? null : safeReference(input.body.regionHint, 'regionHint');
      const secret = await this.resolveVersionSecret(input.body.secret, client, previous, engine);
      const latest = await client.query<{ version: number }>('SELECT COALESCE(MAX(version), 0)::integer AS version FROM engine_deployment_versions WHERE deployment_id = $1', [input.deploymentId]);
      const versionNumber = (latest.rows[0]?.version ?? 0) + 1;
      const duplicateVersion = await client.query<{ deployment_id: string }>('SELECT deployment_id FROM engine_deployment_versions WHERE id = $1 FOR UPDATE', [input.body.versionId]);
      if (duplicateVersion.rows[0]) throw engineConflict('SYSTEM_CONTROL_ENGINE_VERSION_ID_REUSED', 'versionId 已经绑定到另一不可变版本。', 'use_new_version_id');
      const configDigest = makeConfigDigest(engine, endpointReference, regionHint, runtimeConfig, secret);
      const versionResult = await client.query<VersionRow>(`INSERT INTO engine_deployment_versions
        (id,deployment_id,version,model,language,endpoint_reference,region_hint,capabilities_snapshot,secret_reference_version_id,secret_reference_summary,runtime_config,config_digest,billing_snapshot)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [input.body.versionId, input.deploymentId, versionNumber, engine.model, engine.language, endpointReference, regionHint, toCapabilitiesSnapshot(engine), secret.referenceVersionId, secret.summary, runtimeConfig, configDigest, billingSnapshot(engine)]);
      const version = toVersion(versionResult.rows[0]!);
      await client.query(`INSERT INTO system_control_commands(command_kind,idempotency_key,request_hash,resource_id,response_snapshot)
        VALUES($1,$2,$3,$4,$5)`, ['engine_version_create', key, requestHash, version.versionId, { version }]);
      await client.query('UPDATE engine_deployments SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [input.deploymentId]);
      await this.audit(client, { principal: input.principal, requestId: input.requestId, action: 'engine_deployment_version_created', resourceType: 'engine_deployment_version', resourceId: version.versionId, idempotencyKey: key, result: 'succeeded', afterSnapshot: version });
      return { version, replay: false };
    });
  }

  async listDeployments(query: SystemControlEngineListQuery): Promise<SystemControlEngineList> {
    const limit = query.limit ? Number(query.limit) : 50; const offset = query.offset ? Number(query.offset) : 0;
    const params: unknown[] = []; const filters: string[] = [];
    if (query.capability) { params.push(query.capability); filters.push(`d.capability = $${params.length}`); }
    if (query.status) { params.push(query.status); filters.push(`d.status = $${params.length}`); }
    if (query.search?.trim()) { params.push(`%${query.search.trim()}%`); filters.push(`(d.display_name ILIKE $${params.length} OR d.provider ILIKE $${params.length} OR d.adapter_key ILIKE $${params.length})`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const total = await this.pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM engine_deployments d ${where}`, params);
    params.push(limit, offset);
    const rows = await this.pool.query<DeploymentRow & { latest_version: number | null }>(`SELECT d.*, latest.version AS latest_version
      FROM engine_deployments d LEFT JOIN LATERAL (SELECT version FROM engine_deployment_versions v WHERE v.deployment_id = d.id ORDER BY version DESC LIMIT 1) latest ON TRUE
      ${where} ORDER BY d.created_at DESC, d.id ASC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { items: rows.rows.map((row) => toDeployment(row, row.latest_version)), total: Number(total.rows[0]?.count ?? 0), limit, offset };
  }

  async getDetail(deploymentId: string): Promise<SystemControlEngineDetail> {
    const deploymentResult = await this.pool.query<DeploymentRow>('SELECT * FROM engine_deployments WHERE id = $1', [deploymentId]);
    const deployment = deploymentResult.rows[0]; if (!deployment) throw engineNotFound('引擎部署不存在。');
    const versionResult = await this.pool.query<VersionRow>('SELECT * FROM engine_deployment_versions WHERE deployment_id = $1 ORDER BY version DESC LIMIT 1', [deploymentId]);
    return { deployment: toDeployment(deployment, versionResult.rows[0]?.version ?? null), latestVersion: versionResult.rows[0] ? toVersion(versionResult.rows[0]) : null };
  }

  async listVersions(deploymentId: string, query: SystemControlEngineVersionListQuery): Promise<SystemControlEngineVersionList> {
    const limit = query.limit ? Number(query.limit) : 50;
    const offset = query.offset ? Number(query.offset) : 0;
    const exists = await this.pool.query('SELECT 1 FROM engine_deployments WHERE id = $1', [deploymentId]); if (!exists.rows[0]) throw engineNotFound('引擎部署不存在。');
    const total = await this.pool.query<{ count: string }>('SELECT count(*)::text AS count FROM engine_deployment_versions WHERE deployment_id = $1', [deploymentId]);
    const result = await this.pool.query<VersionRow>(`SELECT * FROM engine_deployment_versions WHERE deployment_id = $1
      ORDER BY version DESC, id ASC LIMIT $2 OFFSET $3`, [deploymentId, limit, offset]);
    return { items: result.rows.map(toVersion), total: Number(total.rows[0]?.count ?? 0), limit, offset };
  }

  async getVersion(deploymentId: string, versionId: string): Promise<SystemControlEngineDeploymentVersion> {
    const result = await this.pool.query<VersionRow>('SELECT * FROM engine_deployment_versions WHERE deployment_id = $1 AND id = $2', [deploymentId, versionId]);
    if (!result.rows[0]) throw versionNotFound('引擎部署版本不存在。');
    return toVersion(result.rows[0]);
  }

  async createConnectionTest(input: {
    body: SystemControlCreateConnectionTestBody; idempotencyKey: string; requestId: string; principal: SystemControlPrincipal;
  }): Promise<{ test: SystemControlConnectionTest; replay: boolean }> {
    const key = validKey(input.idempotencyKey); const requestHash = stableSystemControlDigest(input.body);
    return this.transaction(async (client) => {
      await this.lockCommand(client, 'connection_test_create', key);
      const existing = await client.query<{ request_hash: string; response_snapshot: { test: SystemControlConnectionTest } }>(
        'SELECT request_hash, response_snapshot FROM system_control_commands WHERE command_kind = $1 AND idempotency_key = $2', ['connection_test_create', key],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== requestHash) throw engineConflict('SYSTEM_CONTROL_ENGINE_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同的连接测试请求。');
        return { test: existing.rows[0].response_snapshot.test, replay: true };
      }
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`connection-test:${input.body.testRunId}`]);
      const existingRun = await client.query('SELECT 1 FROM connection_test_runs WHERE id = $1', [input.body.testRunId]);
      if (existingRun.rows[0]) throw engineConflict('SYSTEM_CONTROL_CONNECTION_TEST_ID_REUSED', 'testRunId 已经绑定到另一连接测试。', 'use_new_test_run_id');
      const versionResult = await client.query<VersionRow & { capability: SystemControlConnectionTest['capability']; execution_kind: 'cloud_api' | 'self_hosted_worker'; adapter_key: string }>(`SELECT v.*, d.capability, d.execution_kind, d.adapter_key
        FROM engine_deployment_versions v JOIN engine_deployments d ON d.id = v.deployment_id WHERE v.id = $1 FOR UPDATE`, [input.body.deploymentVersionId]);
      const version = versionResult.rows[0]; if (!version) throw versionNotFound('引擎部署版本不存在。');
      const testRow = await client.query<TestRow>(`INSERT INTO connection_test_runs
        (id,deployment_version_id,capability,execution_kind,adapter_key,status,request_id)
        VALUES($1,$2,$3,$4,$5,'queued',$6) RETURNING *`, [input.body.testRunId, version.id, version.capability, version.execution_kind, version.adapter_key, input.requestId]);
      const test = toTest(testRow.rows[0]!, []);
      await client.query(`INSERT INTO system_control_commands(command_kind,idempotency_key,request_hash,resource_id,response_snapshot)
        VALUES($1,$2,$3,$4,$5)`, ['connection_test_create', key, requestHash, input.body.testRunId, { test }]);
      await this.audit(client, { principal: input.principal, requestId: input.requestId, action: 'engine_connection_test_created', resourceType: 'connection_test_run', resourceId: input.body.testRunId, idempotencyKey: key, result: 'queued', afterSnapshot: test });
      return { test, replay: false };
    });
  }

  async listConnectionTests(query: SystemControlConnectionTestListQuery): Promise<SystemControlConnectionTestList> {
    const limit = query.limit ? Number(query.limit) : 50;
    const offset = query.offset ? Number(query.offset) : 0;
    const params: unknown[] = [];
    const filters: string[] = [];
    if (query.deploymentId) { params.push(query.deploymentId); filters.push(`v.deployment_id = $${params.length}`); }
    if (query.deploymentVersionId) { params.push(query.deploymentVersionId); filters.push(`r.deployment_version_id = $${params.length}`); }
    if (query.status) { params.push(query.status); filters.push(`r.status = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const total = await this.pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM connection_test_runs r JOIN engine_deployment_versions v ON v.id = r.deployment_version_id ${where}`, params);
    params.push(limit, offset);
    const rows = await this.pool.query<TestRow>(`SELECT r.* FROM connection_test_runs r JOIN engine_deployment_versions v ON v.id = r.deployment_version_id
      ${where} ORDER BY r.queued_at DESC, r.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { items: rows.rows.map((row) => toTest(row, [])), total: Number(total.rows[0]?.count ?? 0), limit, offset };
  }

  async getConnectionTest(testRunId: string): Promise<SystemControlConnectionTest> {
    const result = await this.pool.query<TestRow>('SELECT * FROM connection_test_runs WHERE id = $1', [testRunId]);
    const row = result.rows[0]; if (!row) throw connectionTestNotFound('连接测试不存在。');
    const attempts = await this.pool.query<{ attempt_number: number; status: SystemControlConnectionTest['status']; latency_ms: number | null; reason_code: string | null; reason_message: string | null; started_at: Date | null; completed_at: Date | null }>(`SELECT attempt_number,status,latency_ms,reason_code,reason_message,started_at,completed_at FROM connection_test_attempts WHERE test_run_id = $1 ORDER BY attempt_number ASC`, [testRunId]);
    return toTest(row, attempts.rows.map((attempt) => ({ attemptNumber: attempt.attempt_number, status: attempt.status, latencyMs: attempt.latency_ms, reasonCode: attempt.reason_code, reasonMessage: attempt.reason_message, startedAt: attempt.started_at?.toISOString() ?? null, completedAt: attempt.completed_at?.toISOString() ?? null })));
  }
}
