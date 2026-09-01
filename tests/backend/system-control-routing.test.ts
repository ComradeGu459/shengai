import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SystemControlCreateRoutingPolicyBody } from '@qimao-terms-cloud/contracts';
import { createApp } from '../../backend/src/app.js';
import { createPool } from '../../backend/src/database/pool.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { DeterministicFakeTermExtractionAdapter } from '../../backend/src/modules/terms/term-extraction.js';
import { createDefaultAsrAdapterRegistry } from '../../backend/src/modules/asr/asr-adapter-registry.js';
import { createDefaultScreenTextAdapterRegistry } from '../../backend/src/modules/screen-text/screen-text.adapter-registry.js';
import { SystemControlRoutingService } from '../../backend/src/modules/system-control/system-control.routing.service.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');
let temporaryDatabaseName: string | null = null;
let adminPool: any = null;
let pool: ReturnType<typeof createPool>;
const principal = (request: any) => {
  const identity = request.headers['x-system-control-test-identity'];
  if (identity === 'owner') return {
    subject: 'owner', audience: 'system-control', capabilities: [
      'system-control:routing:read', 'system-control:routing:write',
      'system-control:routing:publish', 'system-control:routing:rollback',
    ],
  };
  if (identity === 'read') return { subject: 'reader', audience: 'system-control', capabilities: ['system-control:routing:read'] };
  if (identity === 'employee') return { subject: 'employee', audience: 'employee', capabilities: ['system-control:routing:read', 'system-control:routing:write'] };
  return null;
};
let app: ReturnType<typeof createApp>;
const headers = (identity: string, key?: string) => ({
  'x-system-control-test-identity': identity,
  ...(key ? { 'idempotency-key': key } : {}),
});
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

const seedAsrDeployment = async () => {
  const deploymentId = randomUUID();
  const deploymentVersionId = randomUUID();
  const configDigest = digest(deploymentVersionId);
  await pool.query(`INSERT INTO engine_deployments (id,capability,execution_kind,display_name,provider,adapter_key,status) VALUES ($1,'asr','cloud_api','Routing test ASR','fake','deterministic_fake','enabled')`, [deploymentId]);
  await pool.query(`INSERT INTO engine_deployment_versions (id,deployment_id,version,model,language,capabilities_snapshot,secret_reference_summary,config_digest) VALUES ($1,$2,1,'deterministic-v1','zh-CN',$3,$4,$5)`, [deploymentVersionId, deploymentId, JSON.stringify({ capability: 'asr', executionKind: 'cloud_api', provider: 'fake', adapterKey: 'deterministic_fake', model: 'deterministic-v1', language: 'zh-CN', descriptorDigest: configDigest, capabilities: { supportsHotwords: true } }), JSON.stringify({ present: false, referenceDigest: null, redactedLabel: null }), configDigest]);
  return deploymentVersionId;
};

const seedTermsDeployment = async () => {
  const deploymentId = randomUUID();
  const deploymentVersionId = randomUUID();
  const configDigest = digest(deploymentVersionId);
  const runtimeConfig = {
    preset: 'deepseek-v4-flash',
    endpoint: 'https://api.deepseek.com/chat/completions',
    prompt: 'routing terms prompt',
    categoryOrder: ['人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件'],
  };
  await pool.query(`INSERT INTO engine_deployments (id,capability,execution_kind,display_name,provider,adapter_key,status) VALUES ($1,'terms','cloud_api','Routing terms','deepseek','terms_api','enabled')`, [deploymentId]);
  await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,secret_reference_summary,runtime_config,config_digest) VALUES ($1,$2,1,'deepseek-v4-flash','zh-CN',$3,$4,$5,$6)`, [deploymentVersionId, deploymentId, JSON.stringify({ capability: 'terms', executionKind: 'cloud_api', provider: 'deepseek', adapterKey: 'terms_api', model: 'deepseek-v4-flash', language: 'zh-CN', descriptorDigest: configDigest, capabilities: { preset: 'deepseek-v4-flash' } }), JSON.stringify({ present: false, referenceDigest: null, redactedLabel: null }), JSON.stringify(runtimeConfig), configDigest]);
  return { deploymentId, deploymentVersionId, runtimeConfig };
};

const policyBody = (routingVersionId: string, deploymentVersionId: string | null) => ({
  routingVersionId, environment: 'development' as const, workflowStage: 'asr' as const,
  pools: [
    { poolId: 'asr_api' as const, targets: deploymentVersionId ? [{ routingTargetId: randomUUID(), deploymentVersionId, priority: 1, role: 'preferred' as const, maxConcurrentJobs: 10, perProjectMax: 2, queueLimit: 100 }] : [] },
    { poolId: 'ocr_api' as const, targets: [] },
    { poolId: 'ocr_self_hosted_worker' as const, targets: [] },
  ],
});

const createPolicy = async (body: SystemControlCreateRoutingPolicyBody, key = randomUUID()) => {
  const response = await app.inject({ method: 'POST', url: '/api/system-control/routing', headers: headers('owner', key), payload: body });
  expect(response.statusCode, response.body).toBe(201);
  return response.json();
};

const transition = async (id: string, operation: 'test' | 'impact-check' | 'approve', key = randomUUID()) => {
  const response = await app.inject({ method: 'POST', url: `/api/system-control/routing/${id}/${operation}`, headers: headers('owner', key), payload: {} });
  expect(response.statusCode, response.body).toBe(200);
  return response.json();
};

const publish = async (id: string, releaseCommandId: string, key = randomUUID()) => app.inject({
  method: 'POST', url: `/api/system-control/routing/${id}/publish`, headers: headers('owner', key), payload: { releaseCommandId },
});

beforeAll(async () => {
  const sourceUrl = new URL(getDatabaseUrl());
  const adminUrl = new URL(sourceUrl); adminUrl.pathname = '/postgres';
  temporaryDatabaseName = `qimao_routing_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  adminPool = new pg.Pool({ connectionString: adminUrl.toString(), max: 1, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
  await adminPool.query(`CREATE DATABASE "${temporaryDatabaseName}"`);
  const databaseUrl = new URL(sourceUrl); databaseUrl.pathname = `/${temporaryDatabaseName}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = createPool(databaseUrl.toString());
  app = createApp({ database: pool, systemControlPrincipalResolver: principal });
  await app.ready();
  const counts = await pool.query<{ deployments: string; policies: string; pointers: string }>(`SELECT (SELECT count(*) FROM engine_deployments)::text AS deployments, (SELECT count(*) FROM routing_policy_versions)::text AS policies, (SELECT count(*) FROM active_control_plane_pointers)::text AS pointers`);
  expect(counts.rows[0]).toMatchObject({ deployments: '0', policies: '0', pointers: '0' });
});

afterAll(async () => {
  if (app) await app.close();
  if (adminPool && temporaryDatabaseName) {
    await adminPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()', [temporaryDatabaseName]);
    await adminPool.query(`DROP DATABASE IF EXISTS "${temporaryDatabaseName}"`);
    const remaining = await adminPool.query('SELECT 1 FROM pg_database WHERE datname=$1', [temporaryDatabaseName]);
    expect(remaining.rowCount).toBe(0);
    await adminPool.end();
  }
});

describe('BACK-SYSTEM-03B Rev 2 路由命令与 active 架构', () => {
  it('ASR 与 ScreenText 新创建路径不保留旧 descriptor 或可选路由 fallback', async () => {
    const asr = await readFile(new URL('../../backend/src/modules/asr/asr-command.repository.ts', import.meta.url), 'utf8');
    const screenText = await readFile(new URL('../../backend/src/modules/screen-text/screen-text.write.repository.ts', import.meta.url), 'utf8');
    for (const source of [asr, screenText]) {
      expect(source).not.toMatch(/adapterDescriptor|routingService\?|active\?\.routingVersionId|active\?\.deploymentVersionId/);
    }
  });

  it('terms 只接受 terms_api 单池，按不可变版本排序并可由 active 指针解析运行快照', async () => {
    const term = await seedTermsDeployment();
    const invalid = await app.inject({ method: 'POST', url: '/api/system-control/routing', headers: headers('owner', `terms-invalid-${randomUUID()}`), payload: {
      routingVersionId: randomUUID(), environment: 'development', workflowStage: 'terms', pools: [
        { poolId: 'terms_api', targets: [] }, { poolId: 'asr_api', targets: [] },
      ],
    } });
    expect(invalid.statusCode).toBe(422);

    const body = {
      routingVersionId: randomUUID(), environment: 'development' as const, workflowStage: 'terms' as const,
      pools: [{ poolId: 'terms_api' as const, targets: [{ routingTargetId: randomUUID(), deploymentVersionId: term.deploymentVersionId, priority: 1, role: 'preferred' as const, maxConcurrentJobs: 6, perProjectMax: 2, queueLimit: 20 }] }],
    };
    const created = await createPolicy(body);
    expect(created).toMatchObject({ workflowStage: 'terms', status: 'draft', pools: [{ poolId: 'terms_api', targets: [{ priority: 1, role: 'preferred' }] }] });
    await transition(body.routingVersionId, 'test');
    const impacted = await transition(body.routingVersionId, 'impact-check');
    expect(impacted.impact).toMatchObject({ affectedWorkflowStages: ['terms'], failingConnectionTestCount: 0, hardBlocks: [] });
    await transition(body.routingVersionId, 'approve');
    const published = await publish(body.routingVersionId, randomUUID());
    expect(published.statusCode, published.body).toBe(200);
    expect(published.json().status).toBe('active');
    const pointer = await pool.query<{ routing_version_id: string }>(`SELECT routing_version_id FROM active_control_plane_pointers WHERE environment='development' AND workflow_stage='terms'`);
    expect(pointer.rows[0]?.routing_version_id).toBe(body.routingVersionId);

    const service = new SystemControlRoutingService(pool, { asr: createDefaultAsrAdapterRegistry(), screenText: createDefaultScreenTextAdapterRegistry(), terms: new DeterministicFakeTermExtractionAdapter() });
    const active = await service.resolveActiveTarget('terms', 'terms_api', new DeterministicFakeTermExtractionAdapter(), pool);
    expect(active).toMatchObject({ deploymentVersionId: term.deploymentVersionId, runtimeConfig: term.runtimeConfig });
    const locked = await service.resolveActiveTermsTargets(pool);
    expect(locked.targets).toHaveLength(1);
    expect(locked.targets[0]).toMatchObject({
      routingVersionId: body.routingVersionId,
      routingTargetId: body.pools[0]!.targets[0]!.routingTargetId,
      deploymentVersionId: term.deploymentVersionId,
      adapterConfig: { endpoint: term.runtimeConfig.endpoint, prompt: term.runtimeConfig.prompt, model: 'deepseek-v4-flash' },
    });
    expect(JSON.stringify(locked)).not.toMatch(/bearerKey|secretKey/i);
    await pool.query('UPDATE engine_deployments SET status = \'disabled\' WHERE id = $1', [term.deploymentId]);
    await expect(service.resolveActiveTermsTargets(pool)).rejects.toMatchObject({ code: 'SYSTEM_CONTROL_ROUTING_NO_ACTIVE' });
  });

  it('空库无 active 时保留零业务状态，策略影响检查明确阻断', async () => {
    const denied = await app.inject({ method: 'GET', url: '/api/system-control/routing', headers: headers('employee') });
    expect(denied.statusCode).toBe(403);
    const body = policyBody(randomUUID(), null);
    const created = await createPolicy(body, `empty-${randomUUID()}`);
    const testing = await transition(body.routingVersionId, 'test', `empty-test-${randomUUID()}`);
    expect(testing.status).toBe('testing');
    const impacted = await transition(body.routingVersionId, 'impact-check', `empty-impact-${randomUUID()}`);
    expect(impacted.impact.hardBlocks).toContain('no_deployment_target');
    const approve = await app.inject({ method: 'POST', url: `/api/system-control/routing/${body.routingVersionId}/approve`, headers: headers('owner', `empty-approve-${randomUUID()}`), payload: {} });
    expect(approve.statusCode).toBe(409);
    const counts = await pool.query<{ batches: string; jobs: string; commands: string }>(`SELECT (SELECT count(*) FROM asr_batches)::text AS batches, (SELECT count(*) FROM asr_jobs)::text AS jobs, (SELECT count(*) FROM system_control_commands WHERE command_kind LIKE 'routing_%')::text AS commands`);
    expect(counts.rows[0]).toMatchObject({ batches: '0', jobs: '0' });
    expect(created.status).toBe('draft');
  });

  it('routing audit 只读 API 支持逐请求权限、筛选分页和稳定脱敏投影', async () => {
    const body = policyBody(randomUUID(), null);
    await createPolicy(body, `audit-create-${randomUUID()}`);
    await transition(body.routingVersionId, 'test', `audit-test-${randomUUID()}`);
    await transition(body.routingVersionId, 'impact-check', `audit-impact-${randomUUID()}`);

    const denied = await app.inject({ method: 'GET', url: '/api/system-control/routing-audit-events', headers: headers('employee') });
    expect(denied.statusCode).toBe(403);
    const filtered = await app.inject({ method: 'GET', url: `/api/system-control/routing-audit-events?routingVersionId=${body.routingVersionId}&limit=2&offset=0`, headers: headers('read') });
    expect(filtered.statusCode, filtered.body).toBe(200);
    expect(filtered.json()).toMatchObject({ total: 3, limit: 2, offset: 0, items: [
      { action: 'routing_impact_checked', routingVersionId: body.routingVersionId },
      { action: 'routing_testing', routingVersionId: body.routingVersionId },
    ] });
    expect(filtered.json().items[0]).toEqual(expect.objectContaining({ eventId: expect.any(String), actorSubject: 'owner', requestId: expect.any(String), result: 'succeeded', createdAt: expect.any(String) }));
    expect(JSON.stringify(filtered.json())).not.toMatch(/after_snapshot|before_snapshot|idempotencyKey|snapshot/);

    const actionPage = await app.inject({ method: 'GET', url: `/api/system-control/routing-audit-events?routingVersionId=${body.routingVersionId}&action=routing_policy_created&limit=1&offset=0`, headers: headers('read') });
    expect(actionPage.statusCode).toBe(200);
    expect(actionPage.json()).toMatchObject({ total: 1, items: [{ action: 'routing_policy_created' }] });
    const empty = await app.inject({ method: 'GET', url: `/api/system-control/routing-audit-events?routingVersionId=${randomUUID()}&limit=1&offset=0`, headers: headers('read') });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toMatchObject({ total: 0, items: [] });
  });

  it('显式建策略、幂等/冲突、失败连接测试与硬阻断均在事务内持久', async () => {
    const deploymentVersionId = await seedAsrDeployment();
    const body = policyBody(randomUUID(), deploymentVersionId);
    const key = `create-${randomUUID()}`;
    const created = await createPolicy(body, key);
    const replay = await app.inject({ method: 'POST', url: '/api/system-control/routing', headers: headers('owner', key), payload: body });
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual(created);
    const sameKeyConflict = await app.inject({ method: 'POST', url: '/api/system-control/routing', headers: headers('owner', key), payload: { ...body, workflowStage: 'screen_text' } });
    expect(sameKeyConflict.statusCode).toBe(409);
    const differentKeyConflict = await app.inject({ method: 'POST', url: '/api/system-control/routing', headers: headers('owner', `other-${randomUUID()}`), payload: body });
    expect(differentKeyConflict.statusCode).toBe(409);
    await transition(body.routingVersionId, 'test', `test-${randomUUID()}`);
    const impacted = await transition(body.routingVersionId, 'impact-check', `impact-${randomUUID()}`);
    expect(impacted.impact).toMatchObject({ failingConnectionTestCount: 1, hardBlocks: ['connection_test_not_succeeded'] });
    const approve = await app.inject({ method: 'POST', url: `/api/system-control/routing/${body.routingVersionId}/approve`, headers: headers('owner', `approve-${randomUUID()}`), payload: {} });
    expect(approve.statusCode).toBe(409);
  });

  it('发布成功、命令身份只读恢复、重建 app 恢复与回滚追加历史事件', async () => {
    const deploymentVersionId = await seedAsrDeployment();
    const successful = async () => {
      const body = policyBody(randomUUID(), deploymentVersionId);
      await createPolicy(body);
      await transition(body.routingVersionId, 'test');
      await pool.query(`INSERT INTO connection_test_runs (id,deployment_version_id,capability,execution_kind,adapter_key,status,request_id,attempt_count,completed_at) VALUES ($1,$2,'asr','cloud_api','deterministic_fake','succeeded','routing-test',1,CURRENT_TIMESTAMP)`, [randomUUID(), deploymentVersionId]);
      const impact = await transition(body.routingVersionId, 'impact-check');
      expect(impact.impact.hardBlocks).toEqual([]);
      await transition(body.routingVersionId, 'approve');
      return body;
    };
    const v1 = await successful();
    const release1 = randomUUID();
    const release1Key = `publish-${randomUUID()}`;
    const published1 = await publish(v1.routingVersionId, release1, release1Key);
    expect(published1.statusCode, published1.body).toBe(200);
    expect(published1.json().status).toBe('active');
    const publishReplay = await publish(v1.routingVersionId, release1, release1Key);
    expect(publishReplay.statusCode, publishReplay.body).toBe(200);
    expect(publishReplay.json()).toEqual(published1.json());
    const command = await app.inject({ method: 'GET', url: `/api/system-control/routing-commands/${release1}`, headers: headers('read') });
    expect(command.statusCode, command.body).toBe(200);
    expect(command.json()).toMatchObject({ commandId: release1, commandKind: 'publish', releaseCommandId: release1, status: 'succeeded', policy: { routingVersionId: v1.routingVersionId } });
    const v2 = await successful();
    const release2 = randomUUID();
    expect((await publish(v2.routingVersionId, release2)).statusCode).toBe(200);
    const pointerBeforeConflict = await pool.query<{ routing_version_id: string }>(`SELECT routing_version_id FROM active_control_plane_pointers WHERE environment='development' AND workflow_stage='asr'`);
    const commandIdConflict = await publish(v2.routingVersionId, release2, `different-${randomUUID()}`);
    expect(commandIdConflict.statusCode).toBe(409);
    const pointerAfterConflict = await pool.query<{ routing_version_id: string }>(`SELECT routing_version_id FROM active_control_plane_pointers WHERE environment='development' AND workflow_stage='asr'`);
    expect(pointerAfterConflict.rows[0]).toEqual(pointerBeforeConflict.rows[0]);
    const rollbackId = randomUUID();
    const rolledBack = await app.inject({ method: 'POST', url: `/api/system-control/routing/${v2.routingVersionId}/rollback`, headers: headers('owner', `rollback-${randomUUID()}`), payload: { releaseCommandId: rollbackId, targetRoutingVersionId: v1.routingVersionId } });
    expect(rolledBack.statusCode, rolledBack.body).toBe(200);
    expect(rolledBack.json()).toMatchObject({ status: 'active', routingVersionId: v1.routingVersionId });
    const rollbackRecovery = await app.inject({ method: 'GET', url: `/api/system-control/routing-commands/${rollbackId}`, headers: headers('read') });
    expect(rollbackRecovery.statusCode).toBe(200);
    expect(rollbackRecovery.json()).toMatchObject({ commandKind: 'rollback', policy: { routingVersionId: v1.routingVersionId } });
    const events = await pool.query<{ status: string }>(`SELECT status FROM routing_policy_status_events WHERE routing_version_id=$1 ORDER BY created_at,id`, [v1.routingVersionId]);
    expect(events.rows.filter((row) => row.status === 'active')).toHaveLength(2);
    expect(events.rows.filter((row) => row.status === 'retired')).toHaveLength(1);
    const rebuilt = createApp({ database: pool, systemControlPrincipalResolver: principal });
    await rebuilt.ready();
    const afterRestart = await rebuilt.inject({ method: 'GET', url: `/api/system-control/routing-commands/${release1}`, headers: headers('read') });
    expect(afterRestart.statusCode).toBe(200);
  });

  it('RoutingTarget 只能引用已登记真实部署，emergency 仅作为最后一个真实目标', async () => {
    const before = await pool.query<{ policies: string; targets: string }>(`SELECT (SELECT count(*) FROM routing_policy_versions)::text AS policies, (SELECT count(*) FROM routing_policy_targets)::text AS targets`);
    const unregistered = await app.inject({
      method: 'POST', url: '/api/system-control/routing', headers: headers('owner', `unregistered-${randomUUID()}`),
      payload: policyBody(randomUUID(), randomUUID()),
    });
    expect(unregistered.statusCode).toBe(422);
    const after = await pool.query<{ policies: string; targets: string }>(`SELECT (SELECT count(*) FROM routing_policy_versions)::text AS policies, (SELECT count(*) FROM routing_policy_targets)::text AS targets`);
    expect(after.rows[0]).toEqual(before.rows[0]);

    const primary = await seedAsrDeployment();
    const emergency = await seedAsrDeployment();
    const valid: any = policyBody(randomUUID(), primary);
    valid.pools[0]!.targets.push({
      routingTargetId: randomUUID(), deploymentVersionId: emergency, priority: 2, role: 'emergency',
      maxConcurrentJobs: 8, perProjectMax: 2, queueLimit: 50,
    });
    const created = await app.inject({ method: 'POST', url: '/api/system-control/routing', headers: headers('owner', `emergency-${randomUUID()}`), payload: valid });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json().pools[0].targets.map((target: any) => target.role)).toEqual(['preferred', 'emergency']);

    const invalidFirst: any = policyBody(randomUUID(), primary);
    invalidFirst.pools[0]!.targets[0]!.role = 'emergency';
    const rejected = await app.inject({ method: 'POST', url: '/api/system-control/routing', headers: headers('owner', `emergency-first-${randomUUID()}`), payload: invalidFirst });
    expect(rejected.statusCode).toBe(422);
  });

  it('同一 workflowStage 使用全局连续 priority，跨池重复与1/3/8断档稳定拒绝', async () => {
    const first = await seedAsrDeployment();
    const second = await seedAsrDeployment();
    const third = await seedAsrDeployment();
    const valid: any = policyBody(randomUUID(), first);
    valid.pools[0]!.targets.push(
      { routingTargetId: randomUUID(), deploymentVersionId: second, priority: 2, role: 'standard', maxConcurrentJobs: 4, perProjectMax: 2, queueLimit: 20 },
      { routingTargetId: randomUUID(), deploymentVersionId: third, priority: 3, role: 'emergency', maxConcurrentJobs: 2, perProjectMax: 1, queueLimit: 10 },
    );
    const created = await app.inject({ method: 'POST', url: '/api/system-control/routing', headers: headers('owner', `global-sequence-${randomUUID()}`), payload: valid });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json().pools[0].targets.map((target: any) => target.priority)).toEqual([1, 2, 3]);

    const gap: any = policyBody(randomUUID(), first);
    gap.pools[0]!.targets.push(
      { routingTargetId: randomUUID(), deploymentVersionId: second, priority: 3, role: 'standard', maxConcurrentJobs: 4, perProjectMax: 2, queueLimit: 20 },
      { routingTargetId: randomUUID(), deploymentVersionId: third, priority: 8, role: 'emergency', maxConcurrentJobs: 2, perProjectMax: 1, queueLimit: 10 },
    );
    const beforeGap = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM routing_policy_versions');
    const rejectedGap = await app.inject({ method: 'POST', url: '/api/system-control/routing', headers: headers('owner', `global-gap-${randomUUID()}`), payload: gap });
    expect(rejectedGap.statusCode).toBe(422);
    expect((await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM routing_policy_versions')).rows[0]!.count).toBe(beforeGap.rows[0]!.count);

    const crossPool: any = policyBody(randomUUID(), first);
    crossPool.pools[1]!.targets.push({ routingTargetId: randomUUID(), deploymentVersionId: first, priority: 1, role: 'preferred', maxConcurrentJobs: 4, perProjectMax: 2, queueLimit: 20 });
    const rejectedCrossPool = await app.inject({ method: 'POST', url: '/api/system-control/routing', headers: headers('owner', `global-cross-pool-${randomUUID()}`), payload: crossPool });
    expect(rejectedCrossPool.statusCode).toBe(422);
  });
});
