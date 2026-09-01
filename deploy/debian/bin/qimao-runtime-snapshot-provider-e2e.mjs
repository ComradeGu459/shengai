#!/usr/bin/env node
/**
 * 用 collector fixture 驱动已编译的真实 FileRuntimeTelemetryProvider。
 * 仅使用本机临时文件，不连接服务器、COS 或数据库。
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const collector = join(repoRoot, 'deploy', 'debian', 'bin', 'qimao-runtime-snapshot-collector.py');
const providerModule = join(repoRoot, 'backend', 'dist', 'modules', 'system-control', 'system-control.runtime.snapshot-provider.js');
const expectedIds = [
  'runtime:backend-api',
  'runtime:upload-completion-worker',
  'runtime:postgresql:15-main',
  'runtime:tencent-cos:milaidi-upload-1310313248',
];

const workDir = mkdtempSync(join(tmpdir(), 'qimao-runtime-provider-'));
const fixture = join(workDir, 'telemetry.json');

try {
  const python = process.platform === 'win32' ? 'python' : 'python3';
  const generated = spawnSync(python, [collector, '--fixture-out', fixture], { encoding: 'utf8', timeout: 15000 });
  if (generated.status !== 0 || generated.stdout.trim() !== 'fixture=written') throw new Error('COLLECTOR_FIXTURE_FAILED');

  const snapshot = JSON.parse(readFileSync(fixture, 'utf8'));
  if (JSON.stringify(Object.keys(snapshot).sort()) !== JSON.stringify(['environment', 'expiresAt', 'observedAt', 'resources', 'schemaVersion'])) {
    throw new Error('SNAPSHOT_TOP_LEVEL_MISMATCH');
  }
  if (snapshot.resources.length !== expectedIds.length) throw new Error('SNAPSHOT_RESOURCE_COUNT');

  const { createRuntimeTelemetryProviderFromEnv } = await import(pathToFileURL(providerModule).href);
  process.env.QIMAO_SYSTEM_CONTROL_RUNTIME_SNAPSHOT_PATH = fixture;
  const provider = createRuntimeTelemetryProviderFromEnv();
  if (!provider) throw new Error('PROVIDER_NOT_CREATED');

  const descriptors = await provider.listResources({ environment: 'development' });
  const ids = descriptors.map((item) => item.runtimeResourceId);
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) throw new Error('DESCRIPTOR_IDS_MISMATCH');
  if (descriptors.some((item) => !item.identity || item.routingScope !== null)) throw new Error('DESCRIPTOR_CONTRACT_MISMATCH');

  const observations = await provider.collect({
    environment: 'development',
    resourceIds: expectedIds,
    observedAt: new Date(),
  });
  if (observations.length !== expectedIds.length) throw new Error('TELEMETRY_COUNT_MISMATCH');
  if (observations.some((item) => item.status !== 'unknown' || item.reasonCode !== 'FIXTURE_UNKNOWN' || item.processCount !== null)) {
    throw new Error('TELEMETRY_MAPPING_MISMATCH');
  }
  console.log('provider_e2e=passed resources=4 descriptors=4 telemetry=4');
} catch (error) {
  const code = error instanceof Error ? error.message : 'PROVIDER_E2E_FAILED';
  console.error(`provider_e2e=blocked code=${code}`);
  process.exitCode = 1;
} finally {
  delete process.env.QIMAO_SYSTEM_CONTROL_RUNTIME_SNAPSHOT_PATH;
  rmSync(workDir, { recursive: true, force: true });
}
