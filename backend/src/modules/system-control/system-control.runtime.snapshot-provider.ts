import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, normalize, resolve } from 'node:path';

import type {
  SystemControlRuntimeResourceDescriptor,
  SystemControlRuntimeSnapshot,
  SystemControlRuntimeSnapshotObservation,
  SystemControlRuntimeSnapshotResource,
} from '@qimao-terms-cloud/contracts';

import type {
  RuntimeTelemetryObservation,
  RuntimeTelemetryProvider,
} from './system-control.runtime.service.js';

export const SYSTEM_CONTROL_RUNTIME_SNAPSHOT_PATH_ENV = 'QIMAO_SYSTEM_CONTROL_RUNTIME_SNAPSHOT_PATH';
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const RESOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,119}$/;
const SAFE_CODE_PATTERN = /^[A-Za-z0-9_.:-]{1,80}$/;

type SnapshotRead = Readonly<{
  snapshot: SystemControlRuntimeSnapshot | null;
  reason: 'ok' | 'expired' | 'unavailable' | 'invalid';
}>;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key)) && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};
const isDateString = (value: unknown): value is string => typeof value === 'string'
  && value.length <= 64 && value.includes('T') && !Number.isNaN(Date.parse(value));
const isNullableString = (value: unknown, maxLength: number) => value === null || (typeof value === 'string' && value.length >= 1 && value.length <= maxLength);
const isNullableNumber = (value: unknown, min: number, max: number) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max);
const isNullableInteger = (value: unknown) => value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);

const parseIdentity = (value: unknown): value is SystemControlRuntimeResourceDescriptor['identity'] => {
  if (!isRecord(value) || !hasOnlyKeys(value, ['capability', 'executionKind', 'provider', 'adapterKey', 'model'])) return false;
  const capability = value.capability;
  if (capability !== null && capability !== 'asr' && capability !== 'screen_text' && capability !== 'delivery') return false;
  return isNullableString(value.executionKind, 40)
    && isNullableString(value.provider, 80)
    && isNullableString(value.adapterKey, 120)
    && isNullableString(value.model, 120);
};

const parseRoutingScope = (value: unknown): value is NonNullable<SystemControlRuntimeResourceDescriptor['routingScope']> => {
  if (!isRecord(value) || !hasOnlyKeys(value, ['workflowStage', 'poolId'])) return false;
  return (value.workflowStage === 'asr' || value.workflowStage === 'screen_text')
    && typeof value.poolId === 'string' && value.poolId.length >= 1 && value.poolId.length <= 80;
};

const parseObservation = (value: unknown): value is SystemControlRuntimeSnapshotObservation => {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'status', 'observedAt', 'reasonCode', 'cpuPercent', 'gpuPercent', 'memoryBytes', 'storageBytes',
    'databaseConnections', 'processCount',
  ])) return false;
  if (value.status !== 'fresh' && value.status !== 'partial' && value.status !== 'unknown') return false;
  if (value.observedAt !== null && !isDateString(value.observedAt)) return false;
  if (!isNullableString(value.reasonCode, 80) || (typeof value.reasonCode === 'string' && !SAFE_CODE_PATTERN.test(value.reasonCode))) return false;
  return isNullableNumber(value.cpuPercent, 0, 100)
    && isNullableNumber(value.gpuPercent, 0, 100)
    && isNullableInteger(value.memoryBytes)
    && isNullableInteger(value.storageBytes)
    && isNullableInteger(value.databaseConnections)
    && isNullableInteger(value.processCount);
};

const parseResource = (value: unknown): value is SystemControlRuntimeSnapshotResource => {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'runtimeResourceId', 'environment', 'kind', 'displayName', 'identity', 'routingScope', 'telemetry',
  ])) return false;
  if (typeof value.runtimeResourceId !== 'string' || !RESOURCE_ID_PATTERN.test(value.runtimeResourceId)) return false;
  if (value.environment !== 'development') return false;
  if (value.kind !== 'application' && value.kind !== 'worker' && value.kind !== 'database' && value.kind !== 'storage') return false;
  if (typeof value.displayName !== 'string' || value.displayName.length < 1 || value.displayName.length > 120) return false;
  if (!parseIdentity(value.identity)) return false;
  if (value.routingScope !== null && !parseRoutingScope(value.routingScope)) return false;
  return parseObservation(value.telemetry);
};

const parseSnapshot = (value: unknown): SystemControlRuntimeSnapshot | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ['schemaVersion', 'environment', 'observedAt', 'expiresAt', 'resources'])) return null;
  if (value.schemaVersion !== 1 || value.environment !== 'development') return null;
  if (!isDateString(value.observedAt) || !isDateString(value.expiresAt)) return null;
  const observedAt = Date.parse(value.observedAt);
  const expiresAt = Date.parse(value.expiresAt);
  if (expiresAt <= observedAt || !Array.isArray(value.resources) || value.resources.length > 200 || !value.resources.every(parseResource)) return null;
  const resources = value.resources as SystemControlRuntimeSnapshotResource[];
  const ids = new Set<string>();
  if (resources.some((resource) => ids.has(resource.runtimeResourceId) || (ids.add(resource.runtimeResourceId), false))) return null;
  return {
    schemaVersion: 1,
    environment: 'development',
    observedAt: value.observedAt,
    expiresAt: value.expiresAt,
    resources,
  };
};

const toDescriptor = (resource: SystemControlRuntimeSnapshotResource): SystemControlRuntimeResourceDescriptor => ({
  runtimeResourceId: resource.runtimeResourceId,
  environment: resource.environment,
  kind: resource.kind,
  displayName: resource.displayName,
  identity: resource.identity,
  routingScope: resource.routingScope,
});

const toObservation = (
  resource: SystemControlRuntimeSnapshotResource,
  snapshot: SystemControlRuntimeSnapshot,
): RuntimeTelemetryObservation => {
  const telemetry = resource.telemetry;
  return {
    runtimeResourceId: resource.runtimeResourceId,
    status: telemetry.status,
    observedAt: telemetry.observedAt ?? snapshot.observedAt,
    reasonCode: telemetry.reasonCode,
    cpuPercent: telemetry.cpuPercent,
    gpuPercent: telemetry.gpuPercent,
    memoryBytes: telemetry.memoryBytes,
    storageBytes: telemetry.storageBytes,
    databaseConnections: telemetry.databaseConnections,
    processCount: telemetry.processCount,
  };
};

const samePath = (left: string, right: string) => {
  const normalizedLeft = normalize(resolve(left));
  const normalizedRight = normalize(resolve(right));
  return process.platform === 'win32'
    ? normalizedLeft.toLocaleLowerCase() === normalizedRight.toLocaleLowerCase()
    : normalizedLeft === normalizedRight;
};

/**
 * 从受保护的 schemaVersion=1 文件读取运行资源目录与遥测。
 * 文件不可读、路径不安全或快照非法时只返回空目录/unknown，不抛出原始错误。
 */
export class FileRuntimeTelemetryProvider implements RuntimeTelemetryProvider {
  constructor(private readonly snapshotPath: string) {}

  private async readSnapshot(): Promise<SnapshotRead> {
    if (!isAbsolute(this.snapshotPath) || this.snapshotPath.includes('\0')) return { snapshot: null, reason: 'unavailable' };
    try {
      const file = await lstat(this.snapshotPath);
      if (!file.isFile() || file.size > MAX_SNAPSHOT_BYTES) return { snapshot: null, reason: 'unavailable' };
      const actualPath = await realpath(this.snapshotPath);
      if (!samePath(actualPath, this.snapshotPath)) return { snapshot: null, reason: 'unavailable' };
      const parsed = parseSnapshot(JSON.parse(await readFile(this.snapshotPath, 'utf8')));
      if (!parsed) return { snapshot: null, reason: 'invalid' };
      return { snapshot: parsed, reason: Date.parse(parsed.expiresAt) <= Date.now() ? 'expired' : 'ok' };
    } catch {
      return { snapshot: null, reason: 'unavailable' };
    }
  }

  async listResources(input: Readonly<{ environment: 'development' }>): Promise<readonly SystemControlRuntimeResourceDescriptor[]> {
    if (input.environment !== 'development') return [];
    const result = await this.readSnapshot();
    return result.snapshot?.resources.map(toDescriptor) ?? [];
  }

  async collect(input: Readonly<{ environment: 'development'; resourceIds: readonly string[]; observedAt: Date }>): Promise<readonly RuntimeTelemetryObservation[]> {
    if (input.environment !== 'development') return [];
    const result = await this.readSnapshot();
    if (!result.snapshot) {
      return input.resourceIds.map((runtimeResourceId) => ({
        runtimeResourceId,
        status: 'unknown' as const,
        observedAt: input.observedAt,
        reasonCode: result.reason === 'invalid' ? 'SNAPSHOT_INVALID' : 'SNAPSHOT_UNAVAILABLE',
      }));
    }
    const byId = new Map(result.snapshot.resources.map((resource) => [resource.runtimeResourceId, resource]));
    if (result.reason === 'expired') {
      return input.resourceIds.map((runtimeResourceId) => ({
        runtimeResourceId,
        status: 'unknown' as const,
        observedAt: result.snapshot!.observedAt,
        reasonCode: 'SNAPSHOT_EXPIRED',
      }));
    }
    return input.resourceIds.flatMap((runtimeResourceId) => {
      const resource = byId.get(runtimeResourceId);
      return resource ? [toObservation(resource, result.snapshot!)] : [];
    });
  }
}

export const createRuntimeTelemetryProviderFromEnv = (env: NodeJS.ProcessEnv = process.env): RuntimeTelemetryProvider | undefined => {
  const snapshotPath = env[SYSTEM_CONTROL_RUNTIME_SNAPSHOT_PATH_ENV]?.trim();
  return snapshotPath ? new FileRuntimeTelemetryProvider(snapshotPath) : undefined;
};
