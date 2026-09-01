import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { createPool } from '../../backend/src/database/pool.js';
import { createDefaultAsrAdapterRegistry } from '../../backend/src/modules/asr/asr-adapter-registry.js';
import { createDefaultScreenTextAdapterRegistry } from '../../backend/src/modules/screen-text/screen-text.adapter-registry.js';
import { createLocalOcrAdapterRegistryFromEnv } from '../../backend/src/modules/screen-text/local-ocr-runtime.js';
import { SystemControlConnectionTestWorker } from '../../backend/src/modules/system-control/system-control.connection-test.worker.js';

const pool = createPool();
const app = createApp({
  database: pool,
  systemControlPrincipalResolver: (request) => {
    const identity = request.headers['x-system-control-test-identity'];
    if (identity === 'owner') return { subject: 'owner', audience: 'system-control', capabilities: ['system-control:read', 'system-control:engines:read', 'system-control:engines:write', 'system-control:engines:test', 'system-control:secrets:read', 'system-control:secrets:write', 'system-control:secrets:test'] };
    if (identity === 'engine-read') return { subject: 'reader', audience: 'system-control', capabilities: ['system-control:engines:read'] };
    if (identity === 'engine-write') return { subject: 'writer', audience: 'system-control', capabilities: ['system-control:engines:write'] };
    if (identity === 'engine-test') return { subject: 'tester', audience: 'system-control', capabilities: ['system-control:engines:test'] };
    if (identity === 'employee') return { subject: 'employee', audience: 'employee', capabilities: ['system-control:engines:read', 'system-control:engines:write', 'system-control:engines:test'] };
    return null;
  },
});

const headers = (identity: string, idempotencyKey?: string) => ({
  'x-system-control-test-identity': identity,
  ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
});

beforeAll(async () => { await app.ready(); });
beforeEach(async () => {
  await pool.query('TRUNCATE system_control_audit_events, connection_test_attempts, connection_test_runs, system_control_commands, engine_deployment_versions, engine_deployments CASCADE');
});
afterAll(async () => {
  await pool.query('TRUNCATE active_control_plane_pointers, routing_advance_events, routing_policy_targets, routing_policy_status_events, routing_policy_pools, routing_policy_versions, system_control_audit_events, connection_test_attempts, connection_test_runs, system_control_commands, engine_deployment_versions, engine_deployments CASCADE');
  await app.close();
});

describe('BACK-SYSTEM-03A Wave A 引擎控制平面', () => {
  it('逐请求权限、Registry 能力快照和部署/版本幂等', async () => {
    const missingStableIds = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `missing-${randomUUID()}`), payload: { capability: 'asr', executionKind: 'cloud_api', displayName: 'Missing IDs', adapterKey: 'deterministic_fake' } });
    expect(missingStableIds.statusCode).toBe(400);
    const denied = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('employee', 'deny-1'), payload: { deploymentId: randomUUID(), versionId: randomUUID(), capability: 'asr', executionKind: 'cloud_api', displayName: 'Denied', adapterKey: 'deterministic_fake' } });
    expect(denied.statusCode).toBe(403);
    const key = `engine-${randomUUID()}`;
    const payload = { deploymentId: randomUUID(), versionId: randomUUID(), capability: 'asr', executionKind: 'cloud_api', displayName: 'ASR 控制部署', adapterKey: 'deterministic_fake' };
    const spoofed = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `spoof-${randomUUID()}`), payload: { ...payload, provider: 'attacker-provider', model: 'attacker-model', capabilities: { supportsEverything: true } } });
    expect(spoofed.statusCode).toBe(400);
    const created = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', key), payload });
    expect(created.statusCode, created.body).toBe(201);
    const detail = created.json();
    const deploymentId = detail.deployment.deploymentId as string;
    const versionId = detail.latestVersion.versionId as string;
    expect(detail.deployment.provider).toBe('fake');
    expect(detail.deployment.adapterKey).toBe('deterministic_fake');
    expect(detail.latestVersion.model).toBe('deterministic-v1');
    expect(detail.latestVersion.capabilitiesSnapshot.capabilities).not.toEqual(payload.capabilities);
    expect(detail.latestVersion.secretReference).toMatchObject({ present: false });
    expect(JSON.stringify(detail)).not.toContain('internal/');
    const storedAudit = await pool.query<{ after_snapshot: unknown }>('SELECT after_snapshot FROM system_control_audit_events WHERE resource_id = $1', [detail.deployment.deploymentId]);
    const storedCommand = await pool.query<{ response_snapshot: unknown }>('SELECT response_snapshot FROM system_control_commands WHERE resource_id = $1', [detail.deployment.deploymentId]);
    expect(JSON.stringify(storedAudit.rows)).not.toMatch(/development-asr-ref|internal\/development-asr-ref/);
    expect(JSON.stringify(storedCommand.rows)).not.toMatch(/development-asr-ref|internal\/development-asr-ref/);
    const replay = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', key), payload });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().deployment.deploymentId).toBe(detail.deployment.deploymentId);
    const recoveredVersion = await app.inject({ method: 'GET', url: `/api/system-control/engines/${deploymentId}/versions/${versionId}`, headers: headers('engine-read') });
    expect(recoveredVersion.statusCode).toBe(200);
    expect(recoveredVersion.json().versionId).toBe(versionId);
    const conflict = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', key), payload: { ...payload, displayName: 'changed' } });
    expect(conflict.statusCode).toBe(409);
    const versionKey = `version-${randomUUID()}`;
    const missingSecret = await app.inject({ method: 'POST', url: `/api/system-control/engines/${detail.deployment.deploymentId}/versions`, headers: headers('owner', `missing-secret-${randomUUID()}`), payload: { versionId: randomUUID() } });
    expect(missingSecret.statusCode).toBe(400);
    const version = await app.inject({ method: 'POST', url: `/api/system-control/engines/${detail.deployment.deploymentId}/versions`, headers: headers('owner', versionKey), payload: { versionId: randomUUID(), endpointReference: 'cloud-default', regionHint: 'cn', secret: { action: 'inherit' } } });
    expect(version.statusCode).toBe(201);
    expect(version.json().version).toBe(2);
    const versions = await app.inject({ method: 'GET', url: `/api/system-control/engines/${detail.deployment.deploymentId}/versions`, headers: headers('engine-read') });
    expect(versions.statusCode).toBe(200);
    expect(versions.json()).toMatchObject({ total: 2, limit: 50, offset: 0 });
    expect(versions.json().items).toHaveLength(2);
    const versionPage = await app.inject({ method: 'GET', url: `/api/system-control/engines/${detail.deployment.deploymentId}/versions?limit=1&offset=1`, headers: headers('engine-read') });
    expect(versionPage.statusCode).toBe(200);
    expect(versionPage.json()).toMatchObject({ total: 2, limit: 1, offset: 1, items: [{ version: 1 }] });
    const versionEmptyPage = await app.inject({ method: 'GET', url: `/api/system-control/engines/${detail.deployment.deploymentId}/versions?limit=1&offset=2`, headers: headers('engine-read') });
    expect(versionEmptyPage.statusCode).toBe(200);
    expect(versionEmptyPage.json()).toMatchObject({ total: 2, items: [] });
    await expect(pool.query('UPDATE engine_deployment_versions SET model = \'mutated\'')).rejects.toThrow();
  });

  it('terms preset/custom 保存不可变完整运行快照，版本历史与启停不泄露 key', async () => {
    const categoryOrder = ['地名', '人名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件'];
    const deploymentId = randomUUID();
    const firstVersionId = randomUUID();
    const deepseek = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `terms-deepseek-${randomUUID()}`), payload: {
      deploymentId,
      versionId: firstVersionId,
      capability: 'terms',
      executionKind: 'cloud_api',
      displayName: 'Terms DeepSeek V4 Flash',
      adapterKey: 'terms_api',
      runtimeConfig: { preset: 'deepseek-v4-flash', prompt: '提取术语并返回严格 JSON。', categoryOrder },
    } });
    expect(deepseek.statusCode, deepseek.body).toBe(201);
    const first = deepseek.json();
    expect(first.deployment).toMatchObject({ capability: 'terms', provider: 'deepseek', adapterKey: 'terms_api', status: 'enabled' });
    expect(first.latestVersion).toMatchObject({ model: 'deepseek-v4-flash', endpointReference: null, regionHint: null, runtimeConfig: {
      preset: 'deepseek-v4-flash', endpoint: 'https://api.deepseek.com/chat/completions', prompt: '提取术语并返回严格 JSON。', categoryOrder,
    } });
    expect(JSON.stringify(first)).not.toMatch(/bearerKey|Bearer|api[-_]?key/i);
    const storedFirst = await pool.query<{ runtime_config: unknown; endpoint_reference: string | null; model: string }>('SELECT runtime_config,endpoint_reference,model FROM engine_deployment_versions WHERE id=$1', [firstVersionId]);
    expect(storedFirst.rows[0]).toMatchObject({ endpoint_reference: null, model: 'deepseek-v4-flash', runtime_config: expect.objectContaining({ preset: 'deepseek-v4-flash', categoryOrder }) });

    const invalidEndpoint = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `terms-invalid-endpoint-${randomUUID()}`), payload: {
      deploymentId: randomUUID(), versionId: randomUUID(), capability: 'terms', executionKind: 'cloud_api', displayName: 'Invalid terms endpoint', adapterKey: 'terms_api',
      model: 'custom-model', runtimeConfig: { preset: 'custom', endpoint: 'http://custom.example/chat', prompt: 'invalid', categoryOrder },
    } });
    expect(invalidEndpoint.statusCode).toBe(400);
    const invalidOrder = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `terms-invalid-order-${randomUUID()}`), payload: {
      deploymentId: randomUUID(), versionId: randomUUID(), capability: 'terms', executionKind: 'cloud_api', displayName: 'Invalid terms order', adapterKey: 'terms_api',
      model: 'custom-model', runtimeConfig: { preset: 'custom', endpoint: 'https://custom.example/chat', prompt: 'invalid', categoryOrder: [...categoryOrder.slice(0, 7), '人名'] },
    } });
    expect(invalidOrder.statusCode).toBe(422);

    const customVersionId = randomUUID();
    const custom = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/versions`, headers: headers('owner', `terms-custom-${randomUUID()}`), payload: {
      versionId: customVersionId,
      model: 'custom-terms-model',
      runtimeConfig: { preset: 'custom', endpoint: 'https://custom.example/v1/chat/completions', prompt: '自定义术语提示词。', categoryOrder: [...categoryOrder].reverse() },
      secret: { action: 'clear' },
    } });
    expect(custom.statusCode, custom.body).toBe(201);
    expect(custom.json()).toMatchObject({ version: 2, model: 'custom-terms-model', runtimeConfig: { preset: 'custom', endpoint: 'https://custom.example/v1/chat/completions', prompt: '自定义术语提示词。', categoryOrder: [...categoryOrder].reverse() } });
    const history = await app.inject({ method: 'GET', url: `/api/system-control/engines/${deploymentId}/versions`, headers: headers('engine-read') });
    expect(history.statusCode).toBe(200);
    expect(history.json().items).toEqual(expect.arrayContaining([
      expect.objectContaining({ version: 1, model: 'deepseek-v4-flash', runtimeConfig: expect.objectContaining({ preset: 'deepseek-v4-flash', categoryOrder }) }),
      expect.objectContaining({ version: 2, model: 'custom-terms-model', runtimeConfig: expect.objectContaining({ preset: 'custom' }) }),
    ]));

    const disabled = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/status`, headers: headers('owner', `terms-disable-${randomUUID()}`), payload: { statusCommandId: randomUUID(), status: 'disabled' } });
    expect(disabled.statusCode).toBe(201);
    const enabled = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/status`, headers: headers('owner', `terms-enable-${randomUUID()}`), payload: { statusCommandId: randomUUID(), status: 'enabled' } });
    expect(enabled.statusCode).toBe(201);
    expect(enabled.json()).toMatchObject({ targetStatus: 'enabled', resultingStatus: 'enabled' });
  });

  it('OpenVINO OCR 保存有界抽帧 runtimeConfig，默认兼容且越界返回 422', async () => {
    const localPool = createPool();
    const localRegistry = createLocalOcrAdapterRegistryFromEnv({ env: {
      QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true',
      QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT: 'http://127.0.0.1:3100',
      QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: 'a'.repeat(64),
    } });
    const localApp = createApp({
      database: localPool, screenTextAdapterRegistry: localRegistry!,
      systemControlPrincipalResolver: (request) => request.headers['x-system-control-test-identity'] === 'owner'
        ? { subject: 'owner', audience: 'system-control', capabilities: ['system-control:read', 'system-control:engines:read', 'system-control:engines:write'] }
        : null,
    });
    await localApp.ready();
    try {
      const deploymentId = randomUUID();
      const created = await localApp.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `ocr-runtime-${randomUUID()}`), payload: {
        deploymentId, versionId: randomUUID(), capability: 'screen_text', executionKind: 'self_hosted_worker',
        displayName: 'OpenVINO OCR runtime config', adapterKey: 'screen_text_openvino_ppocrv6_small',
      } });
      expect(created.statusCode, created.body).toBe(201);
      expect(created.json().latestVersion.runtimeConfig).toEqual({ preset: 'screen_text_openvino_ppocrv6_small', frameIntervalMs: 1000, maxFramesPerEpisode: 600 });
      for (const runtimeConfig of [
        { frameIntervalMs: 249, maxFramesPerEpisode: 600 },
        { frameIntervalMs: 10_001, maxFramesPerEpisode: 600 },
        { frameIntervalMs: 1000, maxFramesPerEpisode: 0 },
        { frameIntervalMs: 1000, maxFramesPerEpisode: 601 },
      ]) {
        const invalid = await localApp.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/versions`, headers: headers('owner', `ocr-runtime-invalid-${randomUUID()}`), payload: {
          versionId: randomUUID(), runtimeConfig, secret: { action: 'clear' },
        } });
        expect(invalid.statusCode, invalid.body).toBe(422);
      }
      for (const runtimeConfig of [
        { frameIntervalMs: 250, maxFramesPerEpisode: 1 },
        { frameIntervalMs: 10_000, maxFramesPerEpisode: 600 },
        { frameIntervalMs: 2000, maxFramesPerEpisode: 120 },
      ]) {
        const next = await localApp.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/versions`, headers: headers('owner', `ocr-runtime-next-${randomUUID()}`), payload: {
          versionId: randomUUID(), runtimeConfig, secret: { action: 'clear' },
        } });
        expect(next.statusCode, next.body).toBe(201);
        expect(next.json().runtimeConfig).toEqual({ preset: 'screen_text_openvino_ppocrv6_small', ...runtimeConfig });
      }
    } finally {
      await localApp.close();
    }
  });

  it('连接测试使用预生成 testRunId、幂等恢复和可停止租约 Worker', async () => {
    const created = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `engine-${randomUUID()}`), payload: { deploymentId: randomUUID(), versionId: randomUUID(), capability: 'screen_text', executionKind: 'self_hosted_worker', displayName: 'OCR Worker', adapterKey: 'screen_text_worker_stub' } });
    expect(created.statusCode).toBe(201);
    const versionId = created.json().latestVersion.versionId as string;
    const testRunId = randomUUID(); const testKey = `test-${randomUUID()}`;
    const body = { testRunId, deploymentVersionId: versionId };
    const queued = await app.inject({ method: 'POST', url: '/api/system-control/engine-connection-tests', headers: headers('engine-test', testKey), payload: body });
    expect(queued.statusCode).toBe(202);
    expect(queued.json().status).toBe('queued');
    const aliasRejected = await app.inject({ method: 'POST', url: '/api/system-control/engine-connection-tests', headers: headers('engine-test', `alias-${randomUUID()}`), payload: { testRunId: randomUUID(), versionId } });
    expect(aliasRejected.statusCode).toBe(400);
    const replay = await app.inject({ method: 'POST', url: '/api/system-control/engine-connection-tests', headers: headers('engine-test', testKey), payload: body });
    expect(replay.statusCode).toBe(200);
    const worker = new SystemControlConnectionTestWorker(pool, { asr: createDefaultAsrAdapterRegistry(), screenText: createDefaultScreenTextAdapterRegistry() }, { leaseMs: 30_000, pollIntervalMs: 50 }, { workerId: 'test-worker' });
    expect((await worker.runOnce()).status).toBe('succeeded');
    const succeeded = await app.inject({ method: 'GET', url: `/api/system-control/engine-connection-tests/${testRunId}`, headers: headers('engine-read') });
    expect(succeeded.statusCode).toBe(200);
    expect(succeeded.json()).toMatchObject({ status: 'succeeded', attemptCount: 1, capabilitiesSnapshot: { adapterKey: 'screen_text_worker_stub' } });
    const idConflict = await app.inject({ method: 'POST', url: '/api/system-control/engine-connection-tests', headers: headers('engine-test', `other-${randomUUID()}`), payload: body });
    expect(idConflict.statusCode).toBe(409);
    const employeeRead = await app.inject({ method: 'GET', url: `/api/system-control/engine-connection-tests/${testRunId}`, headers: headers('employee') });
    expect(employeeRead.statusCode).toBe(403);
    const listed = await app.inject({ method: 'GET', url: `/api/system-control/engine-connection-tests?deploymentVersionId=${versionId}&limit=1&offset=0`, headers: headers('engine-read') });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toMatchObject({ total: 1, limit: 1, offset: 0, items: [{ testRunId, status: 'succeeded', requestId: expect.any(String) }] });
    const emptyPage = await app.inject({ method: 'GET', url: `/api/system-control/engine-connection-tests?deploymentVersionId=${versionId}&limit=1&offset=1`, headers: headers('engine-read') });
    expect(emptyPage.statusCode).toBe(200);
    expect(emptyPage.json()).toMatchObject({ total: 1, items: [] });

    const failedDeployment = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `engine-${randomUUID()}`), payload: { deploymentId: randomUUID(), versionId: randomUUID(), capability: 'screen_text', executionKind: 'self_hosted_worker', displayName: 'OCR Worker Failure Probe', adapterKey: 'screen_text_worker_stub' } });
    const failedVersionId = failedDeployment.json().latestVersion.versionId as string;
    const failedRunId = randomUUID();
    await app.inject({ method: 'POST', url: '/api/system-control/engine-connection-tests', headers: headers('engine-test', `test-${randomUUID()}`), payload: { testRunId: failedRunId, deploymentVersionId: failedVersionId } });
    const failedWorker = new SystemControlConnectionTestWorker(pool, { asr: createDefaultAsrAdapterRegistry(), screenText: createDefaultScreenTextAdapterRegistry() }, undefined, {
      workerId: 'failed-probe-worker',
      probe: async () => ({ status: 'failed', reasonCode: 'PROBE_FAILED', reasonMessage: '受控 probe 明确失败。' }),
    });
    expect((await failedWorker.runOnce()).status).toBe('failed');
    const failedRead = await app.inject({ method: 'GET', url: `/api/system-control/engine-connection-tests/${failedRunId}`, headers: headers('engine-read') });
    expect(failedRead.json().status).toBe('failed');

    const unknownRunId = randomUUID();
    await app.inject({ method: 'POST', url: '/api/system-control/engine-connection-tests', headers: headers('engine-test', `test-${randomUUID()}`), payload: { testRunId: unknownRunId, deploymentVersionId: versionId } });
    let probeCalls = 0;
    const unknownWorker = new SystemControlConnectionTestWorker(pool, { asr: createDefaultAsrAdapterRegistry(), screenText: createDefaultScreenTextAdapterRegistry() }, { leaseMs: 30_000, pollIntervalMs: 50 }, {
      workerId: 'unknown-worker', probe: async () => { probeCalls += 1; return { status: 'succeeded' }; },
    });
    const claim = await unknownWorker.claimOne();
    expect(claim?.testRunId).toBe(unknownRunId);
    await pool.query("UPDATE connection_test_runs SET lease_expires_at = CURRENT_TIMESTAMP - interval '1 second' WHERE id = $1", [unknownRunId]);
    expect(await unknownWorker.markExpiredUnknown(unknownRunId)).toBe(true);
    expect(probeCalls).toBe(0);
    const attemptRows = await pool.query('SELECT status FROM connection_test_attempts WHERE test_run_id = $1', [unknownRunId]);
    expect(attemptRows.rows).toEqual([{ status: 'unknown' }]);
    const unknownRead = await app.inject({ method: 'GET', url: `/api/system-control/engine-connection-tests/${unknownRunId}`, headers: headers('engine-read') });
    expect(unknownRead.json()).toMatchObject({ status: 'unknown', reasonCode: 'TEST_LEASE_EXPIRED' });
  });

  it('terms connection test 从持久化 runtime_config+model 重建 custom 精确 descriptor，仍零网络', async () => {
    const categoryOrder = ['地名', '人名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件'];
    const deployment = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `terms-connection-${randomUUID()}`), payload: {
      deploymentId: randomUUID(), versionId: randomUUID(), capability: 'terms', executionKind: 'cloud_api',
      displayName: 'Custom terms connection test', adapterKey: 'terms_api', model: 'custom-model-v120',
      runtimeConfig: { preset: 'custom', endpoint: 'https://custom-provider.example/v1/chat/completions', prompt: '只按自定义提示词做零网络连接测试。', categoryOrder },
    } });
    expect(deployment.statusCode, deployment.body).toBe(201);
    const versionId = deployment.json().latestVersion.versionId as string;
    const testRunId = randomUUID();
    const queued = await app.inject({ method: 'POST', url: '/api/system-control/engine-connection-tests', headers: headers('engine-test', `terms-connection-${randomUUID()}`), payload: { testRunId, deploymentVersionId: versionId } });
    expect(queued.statusCode, queued.body).toBe(202);
    const worker = new SystemControlConnectionTestWorker(pool, { asr: createDefaultAsrAdapterRegistry(), screenText: createDefaultScreenTextAdapterRegistry() }, undefined, { workerId: `terms-connection-worker-${randomUUID()}` });
    expect(await worker.runOnce()).toMatchObject({ processed: true, status: 'succeeded' });
    const result = await app.inject({ method: 'GET', url: `/api/system-control/engine-connection-tests/${testRunId}`, headers: headers('engine-read') });
    expect(result.statusCode).toBe(200);
    expect(result.json()).toMatchObject({
      status: 'succeeded',
      capabilitiesSnapshot: {
        capability: 'terms', provider: 'custom', adapterKey: 'terms_api', model: 'custom-model-v120',
        capabilities: { preset: 'custom', categoryOrder },
      },
    });
    const persisted = await pool.query<{ model: string; runtime_config: Record<string, unknown> }>('SELECT model,runtime_config FROM engine_deployment_versions WHERE id=$1', [versionId]);
    expect(persisted.rows[0]).toMatchObject({
      model: 'custom-model-v120',
      runtime_config: { endpoint: 'https://custom-provider.example/v1/chat/completions', prompt: '只按自定义提示词做零网络连接测试。', categoryOrder },
    });
  });

  it('无 Secret 的不可变版本只允许显式 inherit/clear，部署状态使用 enabled/disabled', async () => {
    const deploymentId = randomUUID();
    const firstVersionId = randomUUID();
    const created = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `secret-create-${randomUUID()}`), payload: {
      deploymentId, versionId: firstVersionId, capability: 'asr', executionKind: 'cloud_api', displayName: 'Secret lifecycle', adapterKey: 'deterministic_fake',
    } });
    expect(created.statusCode).toBe(201);
    expect(created.json().latestVersion.secretReference).toMatchObject({ present: false });
    const firstStored = await pool.query<{ secret_reference_version_id: string | null }>('SELECT secret_reference_version_id FROM engine_deployment_versions WHERE id = $1', [firstVersionId]);
    expect(firstStored.rows[0]?.secret_reference_version_id).toBeNull();

    const inheritedVersionId = randomUUID();
    const inherited = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/versions`, headers: headers('owner', `secret-inherit-${randomUUID()}`), payload: { versionId: inheritedVersionId, secret: { action: 'inherit' } } });
    expect(inherited.statusCode).toBe(201);
    expect(inherited.json().secretReference).toMatchObject({ present: false });

    const clearedVersionId = randomUUID();
    const cleared = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/versions`, headers: headers('owner', `secret-clear-${randomUUID()}`), payload: { versionId: clearedVersionId, secret: { action: 'clear' } } });
    expect(cleared.statusCode).toBe(201);
    expect(cleared.json().secretReference).toMatchObject({ present: false });
    const clearedStored = await pool.query<{ secret_reference_version_id: string | null }>('SELECT secret_reference_version_id FROM engine_deployment_versions WHERE id = $1', [clearedVersionId]);
    expect(clearedStored.rows[0]?.secret_reference_version_id).toBeNull();

    await pool.query("UPDATE engine_deployments SET status = 'disabled' WHERE id = $1", [deploymentId]);
    const disabled = await app.inject({ method: 'GET', url: '/api/system-control/engines?status=disabled', headers: headers('engine-read') });
    expect(disabled.statusCode).toBe(200);
    expect(disabled.json().items.map((item: { deploymentId: string }) => item.deploymentId)).toContain(deploymentId);
    const enabled = await app.inject({ method: 'GET', url: '/api/system-control/engines?status=enabled', headers: headers('engine-read') });
    expect(enabled.statusCode).toBe(200);
    expect(enabled.json().items.map((item: { deploymentId: string }) => item.deploymentId)).not.toContain(deploymentId);
  });

  it('部署启停命令使用稳定身份恢复，并在 active 路由引用时事务前阻断停用', async () => {
    await pool.query('TRUNCATE active_control_plane_pointers, routing_advance_events, routing_policy_targets, routing_policy_status_events, routing_policy_pools, routing_policy_versions CASCADE');
    const deploymentId = randomUUID();
    const versionId = randomUUID();
    const created = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `status-create-${randomUUID()}`), payload: {
      deploymentId, versionId, capability: 'asr', executionKind: 'cloud_api', displayName: 'Status command deployment', adapterKey: 'deterministic_fake',
    } });
    expect(created.statusCode).toBe(201);

    const statusCommandId = randomUUID();
    const key = `status-${randomUUID()}`;
    const disable = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/status`, headers: headers('owner', key), payload: { statusCommandId, status: 'disabled' } });
    expect(disable.statusCode, disable.body).toBe(201);
    expect(disable.json()).toMatchObject({ statusCommandId, deploymentId, targetStatus: 'disabled', resultingStatus: 'disabled', status: 'succeeded' });
    const replay = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/status`, headers: headers('owner', key), payload: { statusCommandId, status: 'disabled' } });
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual(disable.json());
    const recovered = await app.inject({ method: 'GET', url: `/api/system-control/engine-status-commands/${statusCommandId}`, headers: headers('engine-read') });
    expect(recovered.statusCode).toBe(200);
    expect(recovered.json()).toEqual(disable.json());
    const sameKeyConflict = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/status`, headers: headers('owner', key), payload: { statusCommandId, status: 'enabled' } });
    expect(sameKeyConflict.statusCode).toBe(409);

    const routingVersionId = randomUUID();
    await pool.query(`INSERT INTO routing_policy_versions (id,environment,workflow_stage,version) VALUES ($1,'development','asr',1)`, [routingVersionId]);
    await pool.query(`INSERT INTO routing_policy_pools (routing_version_id,pool_id) VALUES ($1,'asr_api'),($1,'ocr_api'),($1,'ocr_self_hosted_worker')`, [routingVersionId]);
    await pool.query(`INSERT INTO routing_policy_targets (routing_version_id,pool_id,routing_target_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit) VALUES ($1,'asr_api',$2,$3,1,'preferred',10,2,100)`, [routingVersionId, randomUUID(), versionId]);
    await pool.query(`INSERT INTO routing_policy_status_events (routing_version_id,status,request_id,actor_subject) VALUES ($1,'active','status-route','owner')`, [routingVersionId]);
    await pool.query(`INSERT INTO active_control_plane_pointers (environment,workflow_stage,routing_version_id) VALUES ('development','asr',$1)`, [routingVersionId]);
    await pool.query(`UPDATE engine_deployments SET status='enabled' WHERE id=$1`, [deploymentId]);
    const blockedId = randomUUID();
    const blocked = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/status`, headers: headers('owner', `blocked-${randomUUID()}`), payload: { statusCommandId: blockedId, status: 'disabled' } });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error).toMatchObject({ code: 'SYSTEM_CONTROL_ENGINE_DISABLED_ACTIVE_ROUTE', action: 'switch_active_routing' });
    expect((await pool.query('SELECT status FROM engine_deployments WHERE id=$1', [deploymentId])).rows[0]?.status).toBe('enabled');
    expect((await pool.query("SELECT count(*)::int AS count FROM system_control_commands WHERE command_kind='engine_deployment_status' AND resource_id=$1", [deploymentId])).rows[0]?.count).toBe(1);
    expect((await pool.query("SELECT count(*)::int AS count FROM system_control_audit_events WHERE action='engine_deployment_status_changed' AND resource_id=$1", [deploymentId])).rows[0]?.count).toBe(1);
  });

  it('同一 statusCommandId 的异幂等键并发请求稳定一成功一业务冲突', async () => {
    const deploymentId = randomUUID();
    const versionId = randomUUID();
    const created = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `concurrent-create-${randomUUID()}`), payload: {
      deploymentId, versionId, capability: 'asr', executionKind: 'cloud_api', displayName: 'Concurrent status deployment', adapterKey: 'deterministic_fake',
    } });
    expect(created.statusCode).toBe(201);

    const statusCommandId = randomUUID();
    const [first, second] = await Promise.all([
      app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/status`, headers: headers('owner', `concurrent-a-${randomUUID()}`), payload: { statusCommandId, status: 'disabled' } }),
      app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentId}/status`, headers: headers('owner', `concurrent-b-${randomUUID()}`), payload: { statusCommandId, status: 'disabled' } }),
    ]);
    const responses = [first, second];
    const successes = responses.filter((response) => response.statusCode === 201);
    const conflicts = responses.filter((response) => response.statusCode === 409);
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.json().error).toMatchObject({ code: 'SYSTEM_CONTROL_ENGINE_STATUS_COMMAND_ID_REUSED' });
    expect(responses.every((response) => response.statusCode !== 500)).toBe(true);

    const commandCount = await pool.query<{ count: number }>("SELECT count(*)::int AS count FROM system_control_commands WHERE command_kind='engine_deployment_status' AND resource_id=$1", [deploymentId]);
    const auditCount = await pool.query<{ count: number }>("SELECT count(*)::int AS count FROM system_control_audit_events WHERE action='engine_deployment_status_changed' AND resource_id=$1", [deploymentId]);
    expect(commandCount.rows[0]?.count).toBe(1);
    expect(auditCount.rows[0]?.count).toBe(1);
    const finalState = await pool.query<{ status: string }>('SELECT status FROM engine_deployments WHERE id=$1', [deploymentId]);
    expect(finalState.rows[0]?.status).toBe(successes[0]!.json().resultingStatus);
  });

  it('版本幂等摘要包含路径 deploymentId，跨部署复用同键稳定冲突且不写第二版本', async () => {
    const create = async (displayName: string) => {
      const deploymentId = randomUUID();
      const response = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `deployment-${randomUUID()}`), payload: {
        deploymentId, versionId: randomUUID(), capability: 'asr', executionKind: 'cloud_api', displayName, adapterKey: 'deterministic_fake',
      } });
      expect(response.statusCode).toBe(201);
      return deploymentId;
    };
    const deploymentA = await create('Hash A');
    const deploymentB = await create('Hash B');
    const versionId = randomUUID();
    const body = { versionId, secret: { action: 'clear' } };
    const key = `cross-deployment-${randomUUID()}`;
    const first = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentA}/versions`, headers: headers('owner', key), payload: body });
    expect(first.statusCode).toBe(201);
    const conflict = await app.inject({ method: 'POST', url: `/api/system-control/engines/${deploymentB}/versions`, headers: headers('owner', key), payload: body });
    expect(conflict.statusCode).toBe(409);
    const versions = await app.inject({ method: 'GET', url: `/api/system-control/engines/${deploymentB}/versions`, headers: headers('engine-read') });
    expect(versions.statusCode).toBe(200);
    expect(versions.json().items).toHaveLength(1);
  });
});
