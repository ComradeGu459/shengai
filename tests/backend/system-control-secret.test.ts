import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { createPool } from '../../backend/src/database/pool.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { SystemControlSecretValidationWorker } from '../../backend/src/modules/system-control/system-control.secret-validation.worker.js';
import { SystemControlSecretService } from '../../backend/src/modules/system-control/system-control.secret.service.js';
import type { SystemControlSecretProvider, SystemControlSecretValidationResult } from '../../backend/src/modules/system-control/system-control.secret-provider.js';

const candidateId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const candidateB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let validationOutcome: SystemControlSecretValidationResult = { status: 'succeeded', latencyMs: 2, reasonCode: null, reasonMessage: null };
const requireBackendDependency = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackendDependency('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackendDependency('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');
const fakeProvider: SystemControlSecretProvider = {
  status: () => 'ready',
  discover: async ({ limit, offset, capability }) => {
    const items = [
      { candidateId, displayName: '测试 Secret A', environment: 'development' as const, capability: capability ?? 'asr' as const, provider: 'fake', redactedLabel: 'primary', status: 'available' as const, discoveredAt: new Date() },
      { candidateId: candidateB, displayName: '测试 Secret B', environment: 'development' as const, capability: capability ?? 'asr' as const, provider: 'fake', redactedLabel: 'secondary', status: 'available' as const, discoveredAt: new Date() },
    ];
    return { items: items.slice(offset, offset + limit), total: items.length, observedAt: new Date() };
  },
  resolve: async (id) => id === candidateId ? { candidateId: id, environment: 'development', capability: 'asr', provider: 'fake', redactedLabel: 'primary', referenceDigest: 'a'.repeat(64) } : id === candidateB ? { candidateId: id, environment: 'development', capability: 'asr', provider: 'fake', redactedLabel: 'secondary', referenceDigest: 'b'.repeat(64) } : null,
  validate: async () => validationOutcome,
};

const pool = createPool();
const app = createApp({
  database: pool,
  systemControlSecretProvider: fakeProvider,
  systemControlPrincipalResolver: (request) => {
    const identity = request.headers['x-system-control-test-identity'];
    if (identity === 'owner') return { subject: 'owner', audience: 'system-control', capabilities: ['system-control:read', 'system-control:secrets:read', 'system-control:secrets:write', 'system-control:secrets:test', 'system-control:engines:read', 'system-control:engines:write'] };
    if (identity === 'secret-read') return { subject: 'reader', audience: 'system-control', capabilities: ['system-control:secrets:read'] };
    if (identity === 'employee') return { subject: 'employee', audience: 'employee', capabilities: ['system-control:secrets:read', 'system-control:secrets:write'] };
    return null;
  },
});

const headers = (identity: string, key?: string) => ({ 'x-system-control-test-identity': identity, ...(key ? { 'idempotency-key': key } : {}) });

beforeAll(async () => { await app.ready(); });
beforeEach(async () => {
  validationOutcome = { status: 'succeeded', latencyMs: 2, reasonCode: null, reasonMessage: null };
  await pool.query('TRUNCATE system_control_audit_events, system_control_commands, system_secret_validation_attempts, system_secret_validation_runs, system_secret_reference_status_events, system_secret_reference_versions, system_secret_references, engine_deployment_versions, engine_deployments CASCADE');
});
afterAll(async () => { await app.close(); });

describe('BACK-SYSTEM-05A SecretReference 安全闭环', () => {
  it('服务端有界发现、稳定注册/恢复、不可变轮换与撤销不泄露内部值', async () => {
    const discovery = await app.inject({ method: 'GET', url: '/api/system-control/secrets/discovery?limit=1&offset=0', headers: headers('secret-read') });
    expect(discovery.statusCode).toBe(200);
    expect(discovery.json()).toMatchObject({ total: 2, limit: 1, offset: 0, providerStatus: 'ready', items: [{ candidateId, redactedLabel: 'primary' }] });

    const commandId = randomUUID();
    const secretReferenceId = randomUUID();
    const secretReferenceVersionId = randomUUID();
    const body = { commandId, secretReferenceId, secretReferenceVersionId, candidateId };
    const createKey = `secret-create-${randomUUID()}`;
    const created = await app.inject({ method: 'POST', url: '/api/system-control/secrets', headers: headers('owner', createKey), payload: body });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json()).toMatchObject({ commandId, secretReferenceId, secretReferenceVersionId, action: 'created' });
    expect(created.body).not.toContain('raw-secret');
    const sameReplay = await app.inject({ method: 'POST', url: '/api/system-control/secrets', headers: headers('owner', createKey), payload: body });
    expect(sameReplay.statusCode).toBe(200);
    expect(sameReplay.json()).toMatchObject({ commandId, secretReferenceId, secretReferenceVersionId, action: 'created' });
    const replay = await app.inject({ method: 'POST', url: '/api/system-control/secrets', headers: headers('owner', `secret-create-replay-${randomUUID()}`), payload: body });
    expect(replay.statusCode).toBe(409);
    const recovered = await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}`, headers: headers('secret-read') });
    expect(recovered.statusCode).toBe(200);
    expect(recovered.json()).toMatchObject({ secretReferenceId, latestVersionId: secretReferenceVersionId, latestStatus: 'unknown', boundDeploymentCount: 0 });
    const versions = await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/versions`, headers: headers('secret-read') });
    expect(versions.statusCode).toBe(200);
    expect(versions.json()).toMatchObject({ total: 1, items: [{ secretReferenceVersionId, status: 'unknown', referenceDigest: 'a'.repeat(64) }] });
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/commands/${commandId}`, headers: headers('secret-read') })).json()).toMatchObject({ commandId, action: 'created' });

    const beforeValidation = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `engine-${randomUUID()}`), payload: { deploymentId: randomUUID(), versionId: randomUUID(), capability: 'asr', executionKind: 'cloud_api', displayName: 'Secret bound engine', adapterKey: 'deterministic_fake', secretReferenceVersionId } });
    expect(beforeValidation.statusCode).toBe(422);
    expect(beforeValidation.body).not.toContain(candidateId);
    const emptyPreflight = await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/versions/${secretReferenceVersionId}/revoke-preflight`, headers: headers('secret-read') });
    expect(emptyPreflight.statusCode).toBe(200);
    expect(emptyPreflight.json()).toMatchObject({ affectedEngineDeploymentVersionCount: 0, activeRouteReferenceCount: 0, nonTerminalAttemptCount: 0, canRevoke: true });

    const validationRunId = randomUUID();
    const validationBody = { validationRunId, secretReferenceVersionId };
    const queued = await app.inject({ method: 'POST', url: '/api/system-control/secrets/validations', headers: headers('owner', `validation-${randomUUID()}`), payload: validationBody });
    expect(queued.statusCode).toBe(202);
    const worker = new SystemControlSecretValidationWorker(pool, fakeProvider, { leaseMs: 30_000, pollIntervalMs: 50 }, { workerId: 'secret-test-worker' });
    expect((await worker.runOnce()).status).toBe('succeeded');
    const validation = await app.inject({ method: 'GET', url: `/api/system-control/secrets/validations/${validationRunId}`, headers: headers('secret-read') });
    expect(validation.statusCode).toBe(200);
    expect(validation.json()).toMatchObject({ status: 'succeeded', attemptCount: 1, attempts: [{ status: 'succeeded' }] });

    const deployment = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `engine-${randomUUID()}`), payload: { deploymentId: randomUUID(), versionId: randomUUID(), capability: 'asr', executionKind: 'cloud_api', displayName: 'Secret bound engine', adapterKey: 'deterministic_fake', secretReferenceVersionId } });
    expect(deployment.statusCode, deployment.body).toBe(201);
    expect(deployment.json().latestVersion.secretReference).toMatchObject({ present: true, secretReferenceVersionId, referenceDigest: 'a'.repeat(64) });
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/usage`, headers: headers('secret-read') })).json()).toMatchObject({ total: 1 });
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/versions/${secretReferenceVersionId}/validations`, headers: headers('secret-read') })).json()).toMatchObject({ total: 1 });
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/audit-events`, headers: headers('secret-read') })).json().items.length).toBeGreaterThan(0);
    const preflight = await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/versions/${secretReferenceVersionId}/revoke-preflight`, headers: headers('secret-read') });
    expect(preflight.statusCode).toBe(200);
    expect(preflight.json()).toMatchObject({ affectedEngineDeploymentVersionCount: 1, activeRouteReferenceCount: 0, nonTerminalAttemptCount: 0, canRevoke: true });
    for (const body of [recovered.body, versions.body, deployment.body, validation.body, preflight.body]) {
      expect(body).not.toMatch(/candidateId|internal|raw-secret|https?:\/\/|idempotency-key|secretValue/i);
    }
    const invalidReason = await app.inject({ method: 'POST', url: `/api/system-control/secrets/${secretReferenceId}/versions/${secretReferenceVersionId}/revoke`, headers: headers('owner', `revoke-invalid-${randomUUID()}`), payload: { revokeCommandId: randomUUID(), reason: '        ' } });
    expect(invalidReason.statusCode).toBe(422);

    const rotatedVersionId = randomUUID();
    const rotated = await app.inject({ method: 'POST', url: `/api/system-control/secrets/${secretReferenceId}/rotate`, headers: headers('owner', `rotate-${randomUUID()}`), payload: { rotationCommandId: randomUUID(), secretReferenceVersionId: rotatedVersionId, candidateId: candidateB } });
    expect(rotated.statusCode).toBe(201);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/commands/${rotated.json().commandId}`, headers: headers('secret-read') })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/versions`, headers: headers('secret-read') })).json().items.find((item: { secretReferenceVersionId: string }) => item.secretReferenceVersionId === rotatedVersionId).status).toBe('unknown');
    validationOutcome = { status: 'failed', latencyMs: 3, reasonCode: 'TEST_FAILED', reasonMessage: 'controlled failure' };
    const failedRunId = randomUUID();
    expect((await app.inject({ method: 'POST', url: '/api/system-control/secrets/validations', headers: headers('owner', `validation-failed-${randomUUID()}`), payload: { validationRunId: failedRunId, secretReferenceVersionId: rotatedVersionId } })).statusCode).toBe(202);
    expect((await worker.runOnce()).status).toBe('failed');
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/validations/${failedRunId}`, headers: headers('secret-read') })).json()).toMatchObject({ status: 'failed', reasonCode: 'TEST_FAILED' });
    validationOutcome = { status: 'unknown', latencyMs: null, reasonCode: 'TEST_UNKNOWN', reasonMessage: 'controlled unknown' };
    const unknownVersionId = randomUUID();
    const unknownRotate = await app.inject({ method: 'POST', url: `/api/system-control/secrets/${secretReferenceId}/rotate`, headers: headers('owner', `rotate-unknown-${randomUUID()}`), payload: { rotationCommandId: randomUUID(), secretReferenceVersionId: unknownVersionId, candidateId: candidateB } });
    expect(unknownRotate.statusCode).toBe(201);
    const unknownRunId = randomUUID();
    expect((await app.inject({ method: 'POST', url: '/api/system-control/secrets/validations', headers: headers('owner', `validation-unknown-${randomUUID()}`), payload: { validationRunId: unknownRunId, secretReferenceVersionId: unknownVersionId } })).statusCode).toBe(202);
    expect((await worker.runOnce()).status).toBe('unknown');
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/validations/${unknownRunId}`, headers: headers('secret-read') })).json()).toMatchObject({ status: 'unknown', reasonCode: 'TEST_UNKNOWN' });
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/versions`, headers: headers('secret-read') })).json()).toMatchObject({ total: 3, items: [{ secretReferenceVersionId: unknownVersionId }, { secretReferenceVersionId: rotatedVersionId }, { secretReferenceVersionId }] });

    const revoked = await app.inject({ method: 'POST', url: `/api/system-control/secrets/${secretReferenceId}/versions/${secretReferenceVersionId}/revoke`, headers: headers('owner', `revoke-${randomUUID()}`), payload: { revokeCommandId: randomUUID(), reason: '测试撤销旧版本理由' } });
    expect(revoked.statusCode).toBe(201);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/commands/${revoked.json().commandId}`, headers: headers('secret-read') })).statusCode).toBe(200);
    const revokedVersion = await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/versions`, headers: headers('secret-read') });
    expect(revokedVersion.json().items.find((item: { secretReferenceVersionId: string }) => item.secretReferenceVersionId === secretReferenceVersionId).status).toBe('revoked');
    const invalidBind = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `revoked-engine-${randomUUID()}`), payload: { deploymentId: randomUUID(), versionId: randomUUID(), capability: 'asr', executionKind: 'cloud_api', displayName: 'Revoked bind', adapterKey: 'deterministic_fake', secretReferenceVersionId } });
    expect(invalidBind.statusCode).toBe(422);
    expect((await pool.query('SELECT count(*)::int AS count FROM system_secret_reference_versions')).rows[0]?.count).toBe(3);
  });

  it('默认 provider 拒绝未知候选，员工身份与伪造旧字段稳定拒绝', async () => {
    const denied = await app.inject({ method: 'GET', url: '/api/system-control/secrets/discovery', headers: headers('employee') });
    expect(denied.statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/commands/${randomUUID()}`, headers: headers('secret-read') })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/${randomUUID()}/versions?limit=abc`, headers: headers('secret-read') })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/${randomUUID()}/usage`, headers: headers('secret-read') })).statusCode).toBe(404);
    const spoofed = await app.inject({ method: 'POST', url: '/api/system-control/secrets', headers: headers('owner', `spoof-${randomUUID()}`), payload: { commandId: randomUUID(), secretReferenceId: randomUUID(), secretReferenceVersionId: randomUUID(), candidateId: randomUUID(), referenceId: 'internal/forged' } });
    expect(spoofed.statusCode).toBe(400);
    expect((await pool.query('SELECT count(*)::int AS count FROM system_secret_references')).rows[0]?.count).toBe(0);
  });

  it('服务端 Secret 列表筛选、排序和空页保留真实 total', async () => {
    const make = async (displayName: string) => {
      const secretReferenceId = randomUUID();
      const secretReferenceVersionId = randomUUID();
      const commandId = randomUUID();
      const response = await app.inject({ method: 'POST', url: '/api/system-control/secrets', headers: headers('owner', `list-${randomUUID()}`), payload: { commandId, secretReferenceId, secretReferenceVersionId, candidateId, displayName } });
      expect(response.statusCode).toBe(201);
      return secretReferenceId;
    };
    await make('Alpha secret');
    await make('Beta secret');
    const page = await app.inject({ method: 'GET', url: '/api/system-control/secrets?provider=fake&capability=asr&status=unknown&sort=display_name_asc&limit=1&offset=1', headers: headers('secret-read') });
    expect(page.statusCode).toBe(200);
    expect(page.json()).toMatchObject({ total: 2, limit: 1, offset: 1, items: [{ displayName: 'Beta secret' }] });
    const empty = await app.inject({ method: 'GET', url: '/api/system-control/secrets?provider=fake&capability=asr&status=unknown&limit=1&offset=2', headers: headers('secret-read') });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toMatchObject({ total: 2, items: [] });
    expect((await app.inject({ method: 'GET', url: '/api/system-control/secrets?limit=101', headers: headers('secret-read') })).statusCode).toBe(400);
  });

  it('versions/validation/usage/audit 空页保留 total 且重建 service 可恢复命令', async () => {
    const secretReferenceId = randomUUID();
    const secretReferenceVersionId = randomUUID();
    const commandId = randomUUID();
    const created = await app.inject({ method: 'POST', url: '/api/system-control/secrets', headers: headers('owner', `read-${randomUUID()}`), payload: { commandId, secretReferenceId, secretReferenceVersionId, candidateId, displayName: 'Read projection' } });
    expect(created.statusCode).toBe(201);
    const rebuilt = new SystemControlSecretService(pool, fakeProvider);
    expect((await rebuilt.getCommand(commandId)).commandId).toBe(commandId);
    const validationRunId = randomUUID();
    expect((await app.inject({ method: 'POST', url: '/api/system-control/secrets/validations', headers: headers('owner', `read-validation-${randomUUID()}`), payload: { validationRunId, secretReferenceVersionId } })).statusCode).toBe(202);
    const worker = new SystemControlSecretValidationWorker(pool, fakeProvider, { leaseMs: 30_000, pollIntervalMs: 50 }, { workerId: `read-worker-${randomUUID()}` });
    expect((await worker.runOnce()).status).toBe('succeeded');
    const deployment = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `read-engine-${randomUUID()}`), payload: { deploymentId: randomUUID(), versionId: randomUUID(), capability: 'asr', executionKind: 'cloud_api', displayName: 'Read deployment', adapterKey: 'deterministic_fake', secretReferenceVersionId } });
    expect(deployment.statusCode).toBe(201);
    const otherReferenceId = randomUUID();
    const otherVersionId = randomUUID();
    expect((await app.inject({ method: 'POST', url: '/api/system-control/secrets', headers: headers('owner', `other-read-${randomUUID()}`), payload: { commandId: randomUUID(), secretReferenceId: otherReferenceId, secretReferenceVersionId: otherVersionId, candidateId, displayName: 'Other reference' } })).statusCode).toBe(201);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/${otherReferenceId}/versions/${otherVersionId}/revoke-preflight`, headers: headers('secret-read') })).json()).toMatchObject({ affectedEngineDeploymentVersionCount: 0, activeRouteReferenceCount: 0, nonTerminalAttemptCount: 0, canRevoke: true });
    const versions = await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/versions?limit=1&offset=10`, headers: headers('secret-read') });
    expect(versions.json()).toMatchObject({ total: 1, items: [] });
    const globalValidations = await app.inject({ method: 'GET', url: '/api/system-control/secrets/validations?limit=1&offset=10', headers: headers('secret-read') });
    expect(globalValidations.json()).toMatchObject({ total: 1, items: [] });
    const scopedValidations = await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/versions/${secretReferenceVersionId}/validations?limit=1&offset=10`, headers: headers('secret-read') });
    expect(scopedValidations.json()).toMatchObject({ total: 1, items: [] });
    const usage = await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/usage?limit=1&offset=10`, headers: headers('secret-read') });
    expect(usage.json()).toMatchObject({ total: 1, items: [] });
    const audit = await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/audit-events?limit=1&offset=100`, headers: headers('secret-read') });
    expect(audit.statusCode).toBe(200);
    expect(audit.json().total).toBeGreaterThan(0);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/usage?limit=101`, headers: headers('secret-read') })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/secrets/${secretReferenceId}/audit-events?offset=-1`, headers: headers('secret-read') })).statusCode).toBe(400);
  });

  it('数据库时间边界计算 rotation_due，且 due 版本仍可绑定', async () => {
    const referenceId = randomUUID();
    const baseVersionId = randomUUID();
    const created = await app.inject({ method: 'POST', url: '/api/system-control/secrets', headers: headers('owner', `boundary-${randomUUID()}`), payload: { commandId: randomUUID(), secretReferenceId: referenceId, secretReferenceVersionId: baseVersionId, candidateId } });
    expect(created.statusCode).toBe(201);
    const beforeId = randomUUID();
    const dueId = randomUUID();
    await pool.query("INSERT INTO system_secret_reference_versions(id,secret_reference_id,version,environment,capability,provider,candidate_id,redacted_label,reference_digest,created_at) VALUES($1,$2,2,'development','asr','fake',$3,'before',$4,CURRENT_TIMESTAMP - interval '89 days'),($5,$2,3,'development','asr','fake',$3,'due',$6,CURRENT_TIMESTAMP - interval '91 days')", [beforeId, referenceId, candidateId, 'd'.repeat(64), dueId, 'e'.repeat(64)]);
    await pool.query("INSERT INTO system_secret_reference_status_events(secret_reference_version_id,status,request_id,actor_subject,created_at) VALUES($1,'available',$2,'test',CURRENT_TIMESTAMP - interval '89 days'),($3,'available',$4,'test',CURRENT_TIMESTAMP - interval '91 days')", [beforeId, randomUUID(), dueId, randomUUID()]);
    const versions = (await app.inject({ method: 'GET', url: `/api/system-control/secrets/${referenceId}/versions?limit=100&offset=0`, headers: headers('secret-read') })).json();
    expect(versions.items.find((item: { secretReferenceVersionId: string }) => item.secretReferenceVersionId === beforeId)).toMatchObject({ status: 'available', rotationDue: false });
    expect(versions.items.find((item: { secretReferenceVersionId: string }) => item.secretReferenceVersionId === dueId)).toMatchObject({ status: 'rotation_due', rotationDue: true });
    expect(versions.items.find((item: { secretReferenceVersionId: string }) => item.secretReferenceVersionId === baseVersionId)).toMatchObject({ status: 'unknown', validatedAt: null });
    const bound = await app.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `boundary-engine-${randomUUID()}`), payload: { deploymentId: randomUUID(), versionId: randomUUID(), capability: 'asr', executionKind: 'cloud_api', displayName: 'Due bound', adapterKey: 'deterministic_fake', secretReferenceVersionId: dueId } });
    expect(bound.statusCode, bound.body).toBe(201);
  });

  it('隔离库撤销预检在 active 路由变化后事务内重新阻断且零副作用', async () => {
    const sourceUrl = new URL(getDatabaseUrl());
    const adminUrl = new URL(sourceUrl);
    adminUrl.pathname = '/postgres';
    const databaseName = `qimao_secret_race_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
    const admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
    let isolatedPool: any = null;
    let isolatedApp: any = null;
    try {
      await admin.query(`CREATE DATABASE "${databaseName}"`);
      const databaseUrl = new URL(sourceUrl);
      databaseUrl.pathname = `/${databaseName}`;
      await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
      isolatedPool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
      isolatedApp = createApp({ database: isolatedPool, systemControlSecretProvider: fakeProvider, systemControlPrincipalResolver: (request) => request.headers['x-system-control-test-identity'] === 'owner' ? { subject: 'owner', audience: 'system-control', capabilities: ['system-control:secrets:read', 'system-control:secrets:write', 'system-control:secrets:test', 'system-control:engines:write', 'system-control:engines:read'] } : request.headers['x-system-control-test-identity'] === 'secret-read' ? { subject: 'reader', audience: 'system-control', capabilities: ['system-control:secrets:read'] } : null });
      await isolatedApp.ready();
      const referenceId = randomUUID();
      const versionId = randomUUID();
      expect((await isolatedApp.inject({ method: 'POST', url: '/api/system-control/secrets', headers: headers('owner', `race-create-${randomUUID()}`), payload: { commandId: randomUUID(), secretReferenceId: referenceId, secretReferenceVersionId: versionId, candidateId } })).statusCode).toBe(201);
      await isolatedPool.query("INSERT INTO system_secret_reference_status_events(secret_reference_version_id,status,request_id,actor_subject) VALUES($1,'available',$2,'test')", [versionId, randomUUID()]);
      const deployment = await isolatedApp.inject({ method: 'POST', url: '/api/system-control/engines', headers: headers('owner', `race-engine-${randomUUID()}`), payload: { deploymentId: randomUUID(), versionId: randomUUID(), capability: 'asr', executionKind: 'cloud_api', displayName: 'Race deployment', adapterKey: 'deterministic_fake', secretReferenceVersionId: versionId } });
      expect(deployment.statusCode).toBe(201);
      const deploymentVersionId = deployment.json().latestVersion.versionId as string;
      const preflight = await isolatedApp.inject({ method: 'GET', url: `/api/system-control/secrets/${referenceId}/versions/${versionId}/revoke-preflight`, headers: headers('secret-read') });
      expect(preflight.json()).toMatchObject({ activeRouteReferenceCount: 0, nonTerminalAttemptCount: 0, canRevoke: true });
      const otherReferenceId = randomUUID();
      const otherVersionId = randomUUID();
      expect((await isolatedApp.inject({ method: 'POST', url: '/api/system-control/secrets', headers: headers('owner', `race-other-${randomUUID()}`), payload: { commandId: randomUUID(), secretReferenceId: otherReferenceId, secretReferenceVersionId: otherVersionId, candidateId } })).statusCode).toBe(201);
      expect((await isolatedApp.inject({ method: 'GET', url: `/api/system-control/secrets/${otherReferenceId}/versions/${otherVersionId}/revoke-preflight`, headers: headers('secret-read') })).json()).toMatchObject({ affectedEngineDeploymentVersionCount: 0, activeRouteReferenceCount: 0, nonTerminalAttemptCount: 0, canRevoke: true });
      const routeId = randomUUID();
      await isolatedPool.query("INSERT INTO routing_policy_versions(id,environment,workflow_stage,version) VALUES($1,'development','asr',1)", [routeId]);
      await isolatedPool.query("INSERT INTO routing_policy_pools(routing_version_id,pool_id) VALUES($1,'asr_api'),($1,'ocr_api'),($1,'ocr_self_hosted_worker')", [routeId]);
      await isolatedPool.query("INSERT INTO routing_policy_targets(routing_version_id,pool_id,routing_target_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit) VALUES($1,'asr_api',$2,$3,1,'preferred',1,1,1)", [routeId, randomUUID(), deploymentVersionId]);
      await isolatedPool.query("INSERT INTO routing_policy_status_events(routing_version_id,status,request_id,actor_subject) VALUES($1,'active',$2,'test')", [routeId, randomUUID()]);
      await isolatedPool.query("INSERT INTO active_control_plane_pointers(environment,workflow_stage,routing_version_id) VALUES('development','asr',$1)", [routeId]);
      const blocked = await isolatedApp.inject({ method: 'GET', url: `/api/system-control/secrets/${referenceId}/versions/${versionId}/revoke-preflight`, headers: headers('secret-read') });
      expect(blocked.json()).toMatchObject({ activeRouteReferenceCount: 1, canRevoke: false });
      const before = await isolatedPool.query<{ commands: string; events: string; audits: string }>("SELECT (SELECT COUNT(*) FROM system_control_commands WHERE command_kind='secret_reference_revoke')::text AS commands,(SELECT COUNT(*) FROM system_secret_reference_status_events WHERE secret_reference_version_id=$1)::text AS events,(SELECT COUNT(*) FROM system_control_audit_events WHERE resource_id=$1)::text AS audits", [versionId]);
      const revoke = await isolatedApp.inject({ method: 'POST', url: `/api/system-control/secrets/${referenceId}/versions/${versionId}/revoke`, headers: headers('owner', `race-revoke-${randomUUID()}`), payload: { revokeCommandId: randomUUID(), reason: 'active route blocks revoke' } });
      expect(revoke.statusCode).toBe(409);
      const after = await isolatedPool.query<{ commands: string; events: string; audits: string }>("SELECT (SELECT COUNT(*) FROM system_control_commands WHERE command_kind='secret_reference_revoke')::text AS commands,(SELECT COUNT(*) FROM system_secret_reference_status_events WHERE secret_reference_version_id=$1)::text AS events,(SELECT COUNT(*) FROM system_control_audit_events WHERE resource_id=$1)::text AS audits", [versionId]);
      expect(after.rows[0]).toEqual(before.rows[0]);
    } finally {
      if (isolatedApp) await isolatedApp.close();
      await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()', [databaseName]);
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      const remaining = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [databaseName]);
      expect(remaining.rowCount).toBe(0);
      await admin.end();
    }
  }, 30_000);
});
