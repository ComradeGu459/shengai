import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { SystemControlRuntimeSnapshot } from '@qimao-terms-cloud/contracts';
import {
  createRuntimeTelemetryProviderFromEnv,
  FileRuntimeTelemetryProvider,
  SYSTEM_CONTROL_RUNTIME_SNAPSHOT_PATH_ENV,
} from '../../backend/src/modules/system-control/system-control.runtime.snapshot-provider.js';

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const makeSnapshot = (overrides: Partial<SystemControlRuntimeSnapshot> = {}): SystemControlRuntimeSnapshot => ({
  schemaVersion: 1,
  environment: 'development',
  observedAt: new Date(Date.now() - 1_000).toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  resources: [{
    runtimeResourceId: 'runtime:api',
    environment: 'development',
    kind: 'application',
    displayName: '受控 API',
    identity: { capability: 'asr', executionKind: null, provider: 'self_hosted', adapterKey: 'api', model: 'v1' },
    routingScope: { workflowStage: 'asr', poolId: 'asr_api' },
    telemetry: {
      status: 'fresh', observedAt: null, reasonCode: null, cpuPercent: 12.5, gpuPercent: null,
      memoryBytes: 1024, storageBytes: null, databaseConnections: 2, processCount: 1,
    },
  }],
  ...overrides,
});

const writeSnapshot = async (snapshot: unknown) => {
  const directory = await mkdtemp(join(tmpdir(), 'qimao-runtime-snapshot-'));
  tempDirectories.push(directory);
  const path = join(directory, 'runtime.json');
  await writeFile(path, JSON.stringify(snapshot), 'utf8');
  return path;
};

describe('schemaVersion=1 文件 RuntimeTelemetryProvider', () => {
  it('未配置、相对路径和目录路径均保持空目录，不伪造资源', async () => {
    expect(createRuntimeTelemetryProviderFromEnv({})).toBeUndefined();
    const relative = createRuntimeTelemetryProviderFromEnv({ [SYSTEM_CONTROL_RUNTIME_SNAPSHOT_PATH_ENV]: 'runtime.json' });
    expect(relative).toBeDefined();
    expect(await relative!.listResources({ environment: 'development' })).toEqual([]);
    const directory = await mkdtemp(join(tmpdir(), 'qimao-runtime-directory-'));
    tempDirectories.push(directory);
    const directoryProvider = new FileRuntimeTelemetryProvider(directory);
    expect(await directoryProvider.listResources({ environment: 'development' })).toEqual([]);
  });

  it('目录和观测都来自同一合法快照，并保留部分指标的显式 null', async () => {
    const path = await writeSnapshot(makeSnapshot({
      resources: [makeSnapshot().resources[0]!, {
        ...makeSnapshot().resources[0]!,
        runtimeResourceId: 'runtime:worker',
        telemetry: { ...makeSnapshot().resources[0]!.telemetry, status: 'partial', cpuPercent: null, reasonCode: 'GPU_NOT_CONFIGURED' },
      }],
    }));
    const provider = createRuntimeTelemetryProviderFromEnv({ [SYSTEM_CONTROL_RUNTIME_SNAPSHOT_PATH_ENV]: path })!;
    const resources = await provider.listResources({ environment: 'development' });
    expect(resources.map((item) => item.runtimeResourceId)).toEqual(['runtime:api', 'runtime:worker']);
    const observations = await provider.collect({ environment: 'development', resourceIds: ['runtime:worker'], observedAt: new Date() });
    expect(observations).toMatchObject([{ runtimeResourceId: 'runtime:worker', status: 'partial', cpuPercent: null, reasonCode: 'GPU_NOT_CONFIGURED', memoryBytes: 1024 }]);
  });

  it('过期快照保留受控目录但所有观测降级 unknown；缺失/非法只返回空目录', async () => {
    const expiredPath = await writeSnapshot(makeSnapshot({ expiresAt: new Date(Date.now() - 1).toISOString() }));
    const expired = new FileRuntimeTelemetryProvider(expiredPath);
    expect(await expired.listResources({ environment: 'development' })).toHaveLength(1);
    expect(await expired.collect({ environment: 'development', resourceIds: ['runtime:api'], observedAt: new Date() })).toMatchObject([{ status: 'unknown', reasonCode: 'SNAPSHOT_EXPIRED' }]);

    const missing = new FileRuntimeTelemetryProvider(join(tempDirectories[0]!, 'missing.json'));
    expect(await missing.listResources({ environment: 'development' })).toEqual([]);
    const invalidPath = await writeSnapshot({ ...makeSnapshot(), schemaVersion: 2 });
    const invalid = new FileRuntimeTelemetryProvider(invalidPath);
    expect(await invalid.listResources({ environment: 'development' })).toEqual([]);
    expect(await invalid.collect({ environment: 'development', resourceIds: ['runtime:api'], observedAt: new Date() })).toMatchObject([{ status: 'unknown', reasonCode: 'SNAPSHOT_INVALID' }]);
  });

  it('非法额外字段或快照路径重解析不进入正常状态', async () => {
    const path = await writeSnapshot({ ...makeSnapshot(), unexpected: true });
    const provider = new FileRuntimeTelemetryProvider(path);
    expect(await provider.listResources({ environment: 'development' })).toEqual([]);
    const persisted = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
    expect(persisted.unexpected).toBe(true);
  });
});
