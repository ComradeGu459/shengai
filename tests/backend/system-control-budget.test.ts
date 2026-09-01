import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { SystemControlBudgetService, createBudgetQuote } from '../../backend/src/modules/system-control/system-control.budget.service.js';
import { ZeroNetworkCostConversionProvider } from '../../backend/src/modules/system-control/system-control.cost.service.js';

const requireBackendDependency = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackendDependency('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackendDependency('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');
let temporaryDatabaseName: string | null = null;
let adminPool: any = null;
let pool: any = null;
let app: any = null;
const headers = (identity: string, key?: string) => ({ 'x-system-control-test-identity': identity, ...(key ? { 'idempotency-key': key } : {}) });

beforeAll(async () => {
  const sourceUrl = new URL(getDatabaseUrl());
  const adminUrl = new URL(sourceUrl);
  adminUrl.pathname = '/postgres';
  temporaryDatabaseName = `qimao_budget_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  adminPool = new pg.Pool({ connectionString: adminUrl.toString(), max: 1, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
  await adminPool.query(`CREATE DATABASE "${temporaryDatabaseName}"`);
  const databaseUrl = new URL(sourceUrl);
  databaseUrl.pathname = `/${temporaryDatabaseName}`;
  await runner({
    databaseUrl: databaseUrl.toString(),
    dir: resolve(backendRoot, 'migrations'),
    direction: 'up',
    migrationsTable: 'schema_migrations',
    checkOrder: true,
    singleTransaction: true,
  });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 1, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
  app = createApp({
    database: pool,
    systemControlCostConversionProvider: new ZeroNetworkCostConversionProvider({ CNY: '1', USD: '7.1234567' }),
    systemControlPrincipalResolver: (request) => request.headers['x-system-control-test-identity'] === 'owner'
      ? { subject: 'owner', audience: 'system-control', capabilities: ['budget:read', 'budget:write', 'budget:publish'] }
      : request.headers['x-system-control-test-identity'] === 'read'
        ? { subject: 'reader', audience: 'system-control', capabilities: ['budget:read'] }
        : null,
  });
  await app.ready();
});
beforeEach(async () => {
  await pool.query(`TRUNCATE budget_reservations, active_budget_policy_pointers, budget_test_runs,
    budget_policy_impact_snapshots, budget_policy_status_events, budget_policy_rules, budget_policy_versions CASCADE`);
  await pool.query(`UPDATE engine_deployments SET status='disabled' WHERE display_name IN ('fifo188 budget worker','budget worker')`);
  await pool.query(`DELETE FROM system_control_commands WHERE command_kind LIKE 'budget_%'`);
});
afterAll(async () => {
  if (app) await app.close();
  if (adminPool && temporaryDatabaseName) {
    await adminPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()', [temporaryDatabaseName]);
    await adminPool.query(`DROP DATABASE IF EXISTS "${temporaryDatabaseName}"`);
    const remaining = await adminPool.query('SELECT 1 FROM pg_database WHERE datname=$1', [temporaryDatabaseName]);
    expect(remaining.rowCount).toBe(0);
  }
  if (adminPool) await adminPool.end();
});

const createApprovedPolicy = async (hardLimit = '10', _currency = 'CNY', _extraCurrency?: string) => {
  const policyId = randomUUID();
  const currencies = ['CNY'];
  const body = { budgetPolicyVersionId: policyId, environment: 'development', enforcementEnabled: true, rules: [{ resourcePool: 'ocr_api' as const, currency: 'CNY', period: 'day' as const, warningLimit: hardLimit === '0.3' ? '0.1' : '1', hardLimit }] };
  const created = await app.inject({ method: 'POST', url: '/api/system-control/budget-policies', headers: headers('owner', `create-${randomUUID()}`), payload: body });
  expect(created.statusCode).toBe(201);
  expect(created.json()).toMatchObject({ enforcementEnabled: true });
  for (const [operation, key] of [['test', 'test'], ['impact-check', 'impact'], ['approve', 'approve']] as const) {
    const response = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${policyId}/${operation === 'test' ? 'tests' : operation}`, headers: headers('owner', `${key}-${randomUUID()}`), payload: { commandId: randomUUID(), ...(operation === 'test' ? { budgetTestRunId: randomUUID() } : {}) } });
    expect(response.statusCode, response.body).toBe(200);
  }
  return policyId;
};

const createAndPublish = async (hardLimit = '10', currency = 'USD', extraCurrency?: string) => {
  const policyId = await createApprovedPolicy(hardLimit, currency, extraCurrency);
  const published = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${policyId}/publish`, headers: headers('owner', `publish-${randomUUID()}`), payload: { budgetReleaseCommandId: randomUUID() } });
  expect(published.statusCode, published.body).toBe(200);
  return policyId;
};

const seedRealAttempt = async (billing: ({ billingClass: 'metered' | 'unmetered_local'; currency: string; maximumAmount: string; billingUnit: string; maximumQuantity: string; conversionRate?: string; conversionStatus?: 'available' | 'unknown'; skipConversion?: boolean } | null)) => {
  const projectId = randomUUID(); const manifestId = randomUUID(); const draftId = randomUUID(); const termVersionId = randomUUID(); const assetId = randomUUID();
  const deploymentId = randomUUID(); const deploymentVersionId = randomUUID(); const routingVersionId = randomUUID(); const batchId = randomUUID(); const jobId = randomUUID(); const attemptId = randomUUID();
  const digest = 'a'.repeat(64);
  await pool.query(`INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,'fifo188-budget-worker','ready','active',1,'test','test')`, [projectId]);
  await pool.query(`INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'budget','test')`, [manifestId, projectId]);
  await pool.query(`INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'budget-prompt','confirmed')`, [draftId, projectId, digest]);
  await pool.query(`INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version) VALUES($1,$2,1,$3,$4,'budget-prompt')`, [termVersionId, projectId, draftId, digest]);
  await pool.query(`INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'budget.mp4','video',1,'sha256',$4,CURRENT_TIMESTAMP)`, [assetId, projectId, `budget/${assetId}`, digest]);
  await pool.query(`INSERT INTO engine_deployments(id,capability,execution_kind,display_name,provider,adapter_key,status) VALUES($1,'screen_text','cloud_api','fifo188 budget worker','fake','screen_text_cloud_stub','enabled')`, [deploymentId]);
  const billingSnapshot = billing ? { billingClass: billing.billingClass, currency: billing.currency, maximumAmount: billing.maximumAmount, billingUnit: billing.billingUnit, maximumQuantity: billing.maximumQuantity } : null;
  await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,secret_reference_summary,config_digest,billing_snapshot) VALUES($1,$2,1,'cloud-v1','zh-CN',$3,$4,$5,$6)`, [deploymentVersionId, deploymentId, JSON.stringify({ capability: 'screen_text', executionKind: 'cloud_api', provider: 'fake', adapterKey: 'screen_text_cloud_stub', model: 'cloud-v1', language: 'zh-CN', descriptorDigest: digest, capabilities: {} }), JSON.stringify({ present: false, referenceDigest: null, redactedLabel: null }), digest, JSON.stringify(billingSnapshot)]);
  let conversionSnapshotId: string | null = null;
  if (billing?.billingClass === 'metered' && !billing.skipConversion) {
    conversionSnapshotId = randomUUID();
    await pool.query(`INSERT INTO cost_conversion_snapshots(id,source_currency,target_currency,rate,rate_digest,effective_at,expires_at,status) VALUES($1,$2,'CNY',$3::numeric,$4,CURRENT_TIMESTAMP - interval '1 minute',CASE WHEN $5='unknown' THEN CURRENT_TIMESTAMP + interval '1 day' ELSE CURRENT_TIMESTAMP + interval '1 day' END,$5)`, [conversionSnapshotId, billing.currency, billing.conversionRate ?? '1', 'd'.repeat(64), billing.conversionStatus ?? 'available']);
  }
  await pool.query(`INSERT INTO routing_policy_versions(id,environment,workflow_stage,version) VALUES($1,'development','screen_text',(SELECT COALESCE(MAX(version),0)+1 FROM routing_policy_versions WHERE environment='development' AND workflow_stage='screen_text'))`, [routingVersionId]);
  await pool.query(`INSERT INTO routing_policy_pools(routing_version_id,pool_id) VALUES($1,'asr_api'),($1,'ocr_api'),($1,'ocr_self_hosted_worker')`, [routingVersionId]);
  await pool.query(`INSERT INTO screen_text_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,frame_strategy_version,dedupe_strategy_version,term_projection,term_projection_entries,status,revision,request_id) VALUES($1,$2,'single',ARRAY[1],$3,$4,1,'cloud_api','fake','screen_text_cloud_stub','cloud-v1','zh-CN','budget','input-v1','output-v1','{}',$5,'frame-v1','dedupe-v1',$6,'[]','running',1,'budget-test')`, [batchId, projectId, termVersionId, manifestId, digest, JSON.stringify({ digest })]);
  await pool.query(`INSERT INTO screen_text_batch_assets(batch_id,episode_number,asset_id,object_key,original_filename,size_bytes,checksum_algorithm,checksum_value) VALUES($1,1,$2,$3,'budget.mp4',1,'sha256',$4)`, [batchId, assetId, `budget/${assetId}`, digest]);
  await pool.query(`INSERT INTO screen_text_jobs(id,batch_id,project_id,episode_number,asset_id,status,routing_version_id,route_digest) VALUES($1,$2,$3,1,$4,'running',$5,$6)`, [jobId, batchId, projectId, assetId, routingVersionId, digest]);
  const targetId = randomUUID(); await pool.query(`INSERT INTO routing_policy_targets(routing_version_id,pool_id,routing_target_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit) VALUES($1,'ocr_api',$2,$3,1,'preferred',1,1,1) ON CONFLICT DO NOTHING`, [routingVersionId, targetId, deploymentVersionId]);
  await pool.query(`INSERT INTO screen_text_attempts(id,job_id,attempt_number,status,lease_owner,lease_expires_at,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,input_digest,routing_version_id,routing_target_id,routing_target_priority,deployment_version_id) VALUES($1,$2,1,'running','budget-worker',CURRENT_TIMESTAMP + interval '5 minutes','cloud_api','fake','screen_text_cloud_stub','cloud-v1','zh-CN','budget','input-v1','output-v1','{}',$3,$3,$4,$5,1,$6)`, [attemptId, jobId, digest, routingVersionId, targetId, deploymentVersionId]);
  await pool.query('UPDATE screen_text_jobs SET current_attempt_id=$2 WHERE id=$1', [jobId, attemptId]);
  return { projectId, deploymentId, deploymentVersionId, batchId, attemptId, jobId, conversionSnapshotId };
};

const seedEnabledTermsDeployments = async () => {
  for (const [displayName, billingSnapshot] of [
    ['terms null billing', null],
    ['DeepSeek terms runtime', { billingClass: 'metered', currency: 'CNY', billingUnit: 'request', maximumAmount: '0', maximumQuantity: '1' }],
  ] as const) {
    const deploymentId = randomUUID();
    const deploymentVersionId = randomUUID();
    const digest = 'b'.repeat(64);
    await pool.query(`INSERT INTO engine_deployments(id,capability,execution_kind,display_name,provider,adapter_key,status) VALUES($1,'terms','cloud_api',$2,'deepseek','term_openai_compatible','enabled')`, [deploymentId, displayName]);
    await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,secret_reference_summary,config_digest,billing_snapshot) VALUES($1,$2,1,'deepseek-v4-flash','zh-CN',$3,$4,$5,$6)`, [deploymentVersionId, deploymentId, JSON.stringify({ capability: 'terms', executionKind: 'cloud_api', provider: 'deepseek', adapterKey: 'term_openai_compatible', model: 'deepseek-v4-flash' }), JSON.stringify({ present: false, referenceDigest: null, redactedLabel: null }), digest, billingSnapshot ? JSON.stringify(billingSnapshot) : null]);
  }
};

describe('BACK-SYSTEM-04A 预算安全门', () => {
  it('terms enabled deployment 不投影为 ocr_api，impact 与 overview 均不制造缺规则硬阻断', async () => {
    await seedEnabledTermsDeployments();
    const policyId = randomUUID();
    const created = await app.inject({ method: 'POST', url: '/api/system-control/budget-policies', headers: headers('owner', `terms-create-${randomUUID()}`), payload: { budgetPolicyVersionId: policyId, environment: 'development', rules: [{ resourcePool: 'asr_api', currency: 'CNY', period: 'day', warningLimit: '1', hardLimit: '10' }] } });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json()).toMatchObject({ enforcementEnabled: false });
    const test = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${policyId}/tests`, headers: headers('owner', `terms-test-${randomUUID()}`), payload: { commandId: randomUUID(), budgetTestRunId: randomUUID() } });
    expect(test.statusCode, test.body).toBe(200);
    const impactCheck = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${policyId}/impact-check`, headers: headers('owner', `terms-impact-${randomUUID()}`), payload: { commandId: randomUUID() } });
    expect(impactCheck.statusCode, impactCheck.body).toBe(200);
    expect(impactCheck.json().impact).toMatchObject({ hardBlocks: [], meteredDeploymentCoverage: [] });
    const approved = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${policyId}/approve`, headers: headers('owner', `terms-approve-${randomUUID()}`), payload: { commandId: randomUUID() } });
    expect(approved.statusCode, approved.body).toBe(200);
    const published = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${policyId}/publish`, headers: headers('owner', `terms-publish-${randomUUID()}`), payload: { budgetReleaseCommandId: randomUUID() } });
    expect(published.statusCode, published.body).toBe(200);
    const overview = await app.inject({ method: 'GET', url: '/api/system-control/budget-overview', headers: headers('read') });
    expect(overview.statusCode, overview.body).toBe(200);
    expect(overview.json()).toMatchObject({ hardBlocks: [], meteredDeploymentCoverage: [], activePolicy: { budgetPolicyVersionId: policyId, enforcementEnabled: false } });
  });

  it('空库无业务 bootstrap、逐请求权限、策略状态链和发布只产生一个 active', async () => {
    const counts = await pool.query(`SELECT (SELECT count(*) FROM budget_policy_versions)::int AS policies, (SELECT count(*) FROM active_budget_policy_pointers)::int AS pointers, (SELECT count(*) FROM budget_reservations)::int AS reservations`);
    expect(counts.rows[0]).toEqual({ policies: 0, pointers: 0, reservations: 0 });
    expect((await app.inject({ method: 'GET', url: '/api/system-control/budget-policies', headers: headers('read') })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/system-control/budget-policies', headers: headers('anonymous') })).statusCode).toBe(403);
    const policyId = await createAndPublish();
    const replay = await app.inject({ method: 'GET', url: `/api/system-control/budget-policies/${policyId}`, headers: headers('read') });
    expect(replay.statusCode).toBe(200); expect(replay.json().status).toBe('active');
    expect((await pool.query('SELECT count(*)::int AS count FROM active_budget_policy_pointers')).rows[0].count).toBe(1);
  });

  it('CostConversionSnapshot ���� API �ȶ� ID/�ȼ���ȡ��ʵ���������', async () => {
    const conversionSnapshotId = randomUUID();
    const payload = {
      conversionSnapshotId, sourceCurrency: 'USD',
      effectiveAt: new Date(Date.now() - 60_000).toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    };
    const key = `conversion-${randomUUID()}`;
    const first = await app.inject({ method: 'POST', url: '/api/system-control/cost-conversion-snapshots', headers: headers('owner', key), payload });
    expect(first.statusCode, first.body).toBe(201);
    expect(first.json()).toMatchObject({ conversionSnapshotId, sourceCurrency: 'USD', targetCurrency: 'CNY', rate: '7.1234567', status: 'available' });
    const replay = await app.inject({ method: 'POST', url: '/api/system-control/cost-conversion-snapshots', headers: headers('owner', key), payload });
    expect(replay.statusCode).toBe(200); expect(replay.headers['x-idempotent-replay']).toBe('true');
    const detail = await app.inject({ method: 'GET', url: `/api/system-control/cost-conversion-snapshots/${conversionSnapshotId}`, headers: headers('read') });
    expect(detail.statusCode).toBe(200);
    const list = await app.inject({ method: 'GET', url: '/api/system-control/cost-conversion-snapshots?sourceCurrency=USD&status=available&limit=1&offset=0', headers: headers('read') });
    expect(list.statusCode).toBe(200); expect(list.json().total).toBe(1); expect(list.json().items).toHaveLength(1);
  });

  it('新预算规则只接受人民币，历史读取契约仍可保留原币种', async () => {
    const budgetPolicyVersionId = randomUUID();
    const response = await app.inject({
      method: 'POST',
      url: '/api/system-control/budget-policies',
      headers: headers('owner', `currency-${randomUUID()}`),
      payload: {
        budgetPolicyVersionId,
        environment: 'development',
        rules: [{ resourcePool: 'ocr_api', currency: 'USD', period: 'day', warningLimit: '1', hardLimit: '10' }],
      },
    });
    expect(response.statusCode).toBe(400);
    expect((await pool.query('SELECT count(*)::int AS count FROM budget_policy_versions WHERE id=$1', [budgetPolicyVersionId])).rows[0].count).toBe(0);
  });

  it('报价摘要保持十进制字符串，admission 拒绝不存在 Attempt 且不留下孤儿预留', async () => {
    await createAndPublish('0.3');
    const projectId = randomUUID(); await pool.query(`INSERT INTO projects(id,name,created_by,updated_by) VALUES($1,'budget test','test','test')`, [projectId]);
    const service = new SystemControlBudgetService(pool);
    const quote = createBudgetQuote({ billingClass: 'metered', currency: 'USD', maximumAmount: '0.1', billingUnit: 'image', maximumQuantity: '1' });
    expect(quote.quoteDigest).toMatch(/^[0-9a-f]{64}$/);
    await expect(service.admit({ attemptId: randomUUID(), attemptKind: 'screen_text', projectId, resourcePool: 'ocr_api', deploymentVersionId: randomUUID(), requestId: 'r1', quote })).rejects.toMatchObject({ code: 'SYSTEM_CONTROL_BUDGET_RESERVATION_NOT_FOUND' });
    expect((await pool.query('SELECT count(*)::int AS count FROM budget_reservations')).rows[0].count).toBe(0);
    const local = createBudgetQuote({ billingClass: 'unmetered_local', currency: 'CNY', maximumAmount: '0', billingUnit: 'zero_network_call', maximumQuantity: '0' });
    await expect(service.admit({ attemptId: randomUUID(), attemptKind: 'asr', projectId, resourcePool: 'asr_api', deploymentVersionId: randomUUID(), requestId: 'local', quote: local })).rejects.toMatchObject({ code: 'SYSTEM_CONTROL_BUDGET_RESERVATION_NOT_FOUND' });
  });

  it('预算测试运行持久化并可按 ID/分页恢复，总览由服务端返回 active 身份', async () => {
    const policyId = randomUUID();
    const created = await app.inject({ method: 'POST', url: '/api/system-control/budget-policies', headers: headers('owner', `history-create-${randomUUID()}`), payload: { budgetPolicyVersionId: policyId, environment: 'development', rules: [{ resourcePool: 'ocr_api', currency: 'CNY', period: 'day', warningLimit: '1', hardLimit: '10' }] } });
    expect(created.statusCode).toBe(201);
    const testRunId = randomUUID();
    const test = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${policyId}/tests`, headers: headers('owner', `test-history-${randomUUID()}`), payload: { commandId: randomUUID(), budgetTestRunId: testRunId } });
    expect(test.statusCode, test.body).toBe(200); expect(test.json().budgetTestRunId).toBe(testRunId); expect(test.json().status).toBe('succeeded');
    const recovered = await app.inject({ method: 'GET', url: `/api/system-control/budget-policies/${policyId}/tests/${testRunId}`, headers: headers('read') });
    expect(recovered.statusCode).toBe(200); expect(recovered.json().inputDigest).toMatch(/^[0-9a-f]{64}$/);
    const history = await app.inject({ method: 'GET', url: `/api/system-control/budget-policies/${policyId}/tests?limit=1&offset=0`, headers: headers('read') });
    expect(history.statusCode).toBe(200); expect(history.json().total).toBe(1);
    const activePolicyId = await createAndPublish();
    const overview = await app.inject({ method: 'GET', url: '/api/system-control/budget-overview', headers: headers('read') });
    expect(overview.statusCode).toBe(200); expect(overview.json().activePolicy.budgetPolicyVersionId).toBe(activePolicyId); expect(overview.json().databaseNow).toBeTruthy();
  });

  it('warningLimit 等于 hardLimit 在创建时稳定拒绝且零业务副作用', async () => {
    const policyId = randomUUID();
    const response = await app.inject({ method: 'POST', url: '/api/system-control/budget-policies', headers: headers('owner', `equal-${randomUUID()}`), payload: { budgetPolicyVersionId: policyId, environment: 'development', rules: [{ resourcePool: 'ocr_api', currency: 'CNY', period: 'day', warningLimit: '1', hardLimit: '1' }] } });
    expect(response.statusCode).toBe(422);
    expect((await pool.query('SELECT count(*)::int AS count FROM budget_policy_versions WHERE id=$1', [policyId])).rows[0].count).toBe(0);
  });

  it('真实 Attempt 的精确 numeric admission 允许等于 hard、超出时零预留且同 Attempt 重放不重复', async () => {
    await createAndPublish('0.3');
    const quote01 = createBudgetQuote({ billingClass: 'metered', currency: 'USD', maximumAmount: '0.1', billingUnit: 'image', maximumQuantity: '1' });
    const quote02 = createBudgetQuote({ billingClass: 'metered', currency: 'USD', maximumAmount: '0.2', billingUnit: 'image', maximumQuantity: '1' });
    const first = await seedRealAttempt(quote01); const second = await seedRealAttempt(quote02); const third = await seedRealAttempt(quote01);
    const service = new SystemControlBudgetService(pool);
    const one = await service.admit({ attemptId: first.attemptId, attemptKind: 'screen_text', projectId: first.projectId, resourcePool: 'ocr_api', deploymentVersionId: first.deploymentVersionId, requestId: 'budget-1', quote: quote01 });
    await service.settle({ reservationId: one.reservationId, providerRequestId: 'fake-1', finalQuantity: '1', finalAmount: '0.1', reconciliationStatus: 'final', externalSideEffectPossible: false, requestId: 'budget-1' });
    const two = await service.admit({ attemptId: second.attemptId, attemptKind: 'screen_text', projectId: second.projectId, resourcePool: 'ocr_api', deploymentVersionId: second.deploymentVersionId, requestId: 'budget-2', quote: quote02 });
    expect(two.reservationId).toBeTruthy();
    const replay = await service.admit({ attemptId: second.attemptId, attemptKind: 'screen_text', projectId: second.projectId, resourcePool: 'ocr_api', deploymentVersionId: second.deploymentVersionId, requestId: 'budget-2-replay', quote: quote02 });
    expect(replay.reservationId).toBe(two.reservationId);
    await expect(service.admit({ attemptId: third.attemptId, attemptKind: 'screen_text', projectId: third.projectId, resourcePool: 'ocr_api', deploymentVersionId: third.deploymentVersionId, requestId: 'budget-3', quote: quote01 })).rejects.toMatchObject({ code: 'SYSTEM_CONTROL_BUDGET_HARD_LIMIT' });
    expect((await pool.query('SELECT count(*)::int AS count FROM budget_reservations')).rows[0].count).toBe(2);
    expect((await pool.query('SELECT usage FROM screen_text_attempts WHERE id=$1', [third.attemptId])).rows[0].usage).toBeNull();
  });

  it('默认关闭的策略保留日/月预警与统计，超过 hard 或缺资源池规则均不阻断', async () => {
    const policyId = randomUUID();
    const created = await app.inject({
      method: 'POST', url: '/api/system-control/budget-policies',
      headers: headers('owner', `default-off-${randomUUID()}`),
      payload: {
        budgetPolicyVersionId: policyId,
        environment: 'development',
        rules: [
          { resourcePool: 'ocr_api', currency: 'CNY', period: 'day', warningLimit: '0.1', hardLimit: '0.3' },
          { resourcePool: 'ocr_api', currency: 'CNY', period: 'month', warningLimit: '0.1', hardLimit: '0.3' },
        ],
      },
    });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json()).toMatchObject({ enforcementEnabled: false });
    for (const operation of ['tests', 'impact-check', 'approve'] as const) {
      const response = await app.inject({
        method: 'POST', url: `/api/system-control/budget-policies/${policyId}/${operation}`,
        headers: headers('owner', `${operation}-${randomUUID()}`),
        payload: { commandId: randomUUID(), ...(operation === 'tests' ? { budgetTestRunId: randomUUID() } : {}) },
      });
      expect(response.statusCode, response.body).toBe(200);
    }
    const published = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${policyId}/publish`, headers: headers('owner', `publish-${randomUUID()}`), payload: { budgetReleaseCommandId: randomUUID() } });
    expect(published.statusCode, published.body).toBe(200);

    const quote = createBudgetQuote({ billingClass: 'metered', currency: 'CNY', maximumAmount: '0.2', billingUnit: 'image', maximumQuantity: '1' });
    const first = await seedRealAttempt({ ...quote, skipConversion: true });
    const second = await seedRealAttempt({ ...quote, skipConversion: true });
    const missingRule = await seedRealAttempt({ ...quote, skipConversion: true });
    const service = new SystemControlBudgetService(pool);
    const one = await service.admit({ attemptId: first.attemptId, attemptKind: 'screen_text', projectId: first.projectId, resourcePool: 'ocr_api', deploymentVersionId: first.deploymentVersionId, requestId: 'default-off-1', quote });
    const two = await service.admit({ attemptId: second.attemptId, attemptKind: 'screen_text', projectId: second.projectId, resourcePool: 'ocr_api', deploymentVersionId: second.deploymentVersionId, requestId: 'default-off-2', quote });
    const missing = await service.admit({ attemptId: missingRule.attemptId, attemptKind: 'screen_text', projectId: missingRule.projectId, resourcePool: 'asr_api', deploymentVersionId: missingRule.deploymentVersionId, requestId: 'default-off-missing-rule', quote });
    expect([one, two, missing]).toEqual(expect.arrayContaining([
      expect.objectContaining({ budgetPolicyVersionId: policyId, reservationId: expect.any(String) }),
    ]));
    expect((await pool.query<{ warning: boolean }>('SELECT warning FROM budget_reservations WHERE id=$1', [two.reservationId])).rows[0]?.warning).toBe(true);
    const overview = await service.overview();
    expect(overview.hardBlocks).toEqual([]);
    expect(overview.runtimeBlockedScopes).toEqual([]);
    expect(overview.runtimeWarningScopes).toEqual(expect.arrayContaining(['ocr_api:CNY:day', 'ocr_api:CNY:month']));
    expect(overview.scopes).toEqual(expect.arrayContaining([
      expect.objectContaining({ resourcePool: 'ocr_api', period: 'day', status: 'unblocked' }),
      expect.objectContaining({ resourcePool: 'ocr_api', period: 'month', status: 'unblocked' }),
      expect.objectContaining({ resourcePool: 'asr_api', period: 'day', status: 'missing_rule' }),
    ]));
  });

  it('管理员显式启用后，月 hardLimit 与日 hardLimit 一样阻止新增预留', async () => {
    const policyId = randomUUID();
    const created = await app.inject({
      method: 'POST', url: '/api/system-control/budget-policies',
      headers: headers('owner', `month-on-${randomUUID()}`),
      payload: {
        budgetPolicyVersionId: policyId,
        environment: 'development',
        enforcementEnabled: true,
        rules: [
          { resourcePool: 'ocr_api', currency: 'CNY', period: 'day', warningLimit: '1', hardLimit: '10' },
          { resourcePool: 'ocr_api', currency: 'CNY', period: 'month', warningLimit: '0.1', hardLimit: '0.3' },
        ],
      },
    });
    expect(created.statusCode, created.body).toBe(201);
    for (const operation of ['tests', 'impact-check', 'approve'] as const) {
      const response = await app.inject({
        method: 'POST', url: `/api/system-control/budget-policies/${policyId}/${operation}`,
        headers: headers('owner', `${operation}-${randomUUID()}`),
        payload: { commandId: randomUUID(), ...(operation === 'tests' ? { budgetTestRunId: randomUUID() } : {}) },
      });
      expect(response.statusCode, response.body).toBe(200);
    }
    expect((await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${policyId}/publish`, headers: headers('owner', `publish-${randomUUID()}`), payload: { budgetReleaseCommandId: randomUUID() } })).statusCode).toBe(200);

    const quote = createBudgetQuote({ billingClass: 'metered', currency: 'CNY', maximumAmount: '0.2', billingUnit: 'image', maximumQuantity: '1' });
    const first = await seedRealAttempt({ ...quote, skipConversion: true });
    const second = await seedRealAttempt({ ...quote, skipConversion: true });
    const service = new SystemControlBudgetService(pool);
    await service.admit({ attemptId: first.attemptId, attemptKind: 'screen_text', projectId: first.projectId, resourcePool: 'ocr_api', deploymentVersionId: first.deploymentVersionId, requestId: 'month-on-1', quote });
    await expect(service.admit({ attemptId: second.attemptId, attemptKind: 'screen_text', projectId: second.projectId, resourcePool: 'ocr_api', deploymentVersionId: second.deploymentVersionId, requestId: 'month-on-2', quote })).rejects.toMatchObject({ code: 'SYSTEM_CONTROL_BUDGET_HARD_LIMIT' });
    expect((await pool.query('SELECT count(*)::int AS count FROM budget_reservations')).rows[0].count).toBe(1);
  });

  it('billing snapshot 绑定不可变 EngineVersion：V1 旧 Attempt 保持原报价，V2 仅影响新 Attempt', async () => {
    await createAndPublish('10');
    const v1Quote = createBudgetQuote({ billingClass: 'metered', currency: 'USD', maximumAmount: '0.1', billingUnit: 'image', maximumQuantity: '1' });
    const v2Quote = createBudgetQuote({ billingClass: 'metered', currency: 'USD', maximumAmount: '0.2', billingUnit: 'image', maximumQuantity: '1' });
    const oldAttempt = await seedRealAttempt(v1Quote); const newAttempt = await seedRealAttempt(v1Quote);
    const v2Id = randomUUID();
    await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,secret_reference_summary,config_digest,billing_snapshot)
      SELECT $1,deployment_id,2,model,language,capabilities_snapshot,secret_reference_summary,$2,$3 FROM engine_deployment_versions WHERE id=$4`, [v2Id, 'b'.repeat(64), JSON.stringify({ billingClass: v2Quote.billingClass, currency: v2Quote.currency, maximumAmount: v2Quote.maximumAmount, billingUnit: v2Quote.billingUnit, maximumQuantity: v2Quote.maximumQuantity }), oldAttempt.deploymentVersionId]);
    await pool.query('UPDATE screen_text_batches SET deployment_version_id=$2 WHERE id=$1', [newAttempt.batchId, v2Id]);
    await pool.query('UPDATE screen_text_jobs SET deployment_version_id=$2 WHERE id=$1', [newAttempt.jobId, v2Id]);
    await pool.query('UPDATE screen_text_attempts SET deployment_version_id=$2 WHERE id=$1', [newAttempt.attemptId, v2Id]);
    const service = new SystemControlBudgetService(pool);
    const oldReservation = await service.admit({ attemptId: oldAttempt.attemptId, attemptKind: 'screen_text', projectId: oldAttempt.projectId, resourcePool: 'ocr_api', deploymentVersionId: oldAttempt.deploymentVersionId, requestId: 'v1', quote: v1Quote });
    const newReservation = await service.admit({ attemptId: newAttempt.attemptId, attemptKind: 'screen_text', projectId: newAttempt.projectId, resourcePool: 'ocr_api', deploymentVersionId: v2Id, requestId: 'v2', quote: v2Quote });
    expect((await service.getReservation(oldReservation.reservationId!)).deploymentVersionId).toBe(oldAttempt.deploymentVersionId);
    expect((await service.getReservation(newReservation.reservationId!)).deploymentVersionId).toBe(v2Id);
  });

  it('CNY ԭ���ͷ����� snapshot ����ת���� CNY ���������ԭ���뿴��', async () => {
    await createAndPublish('10');
    const quote = createBudgetQuote({ billingClass: 'metered', currency: 'USD', maximumAmount: '0.1', billingUnit: 'image', maximumQuantity: '1' });
    const attempt = await seedRealAttempt({ ...quote, conversionRate: '7.1234567' });
    const service = new SystemControlBudgetService(pool);
    const admitted = await service.admit({ attemptId: attempt.attemptId, attemptKind: 'screen_text', projectId: attempt.projectId, resourcePool: 'ocr_api', deploymentVersionId: attempt.deploymentVersionId, requestId: 'usd-fixed', quote });
    expect(admitted.conversionSnapshotId).toBe(attempt.conversionSnapshotId);
    expect(admitted.maximumAmountCny).toBe('0.712346');
    const reservation = await service.getReservation(admitted.reservationId!);
    expect(reservation).toMatchObject({ currency: 'CNY', sourceCurrency: 'USD', maximumAmountCny: '0.712346', originalMaximumAmount: '0.1', conversionSnapshotId: attempt.conversionSnapshotId });
    await service.settle({ reservationId: admitted.reservationId, providerRequestId: 'usd-fixed-provider', finalQuantity: '1', finalAmount: '0.1', reconciliationStatus: 'final', externalSideEffectPossible: false, requestId: 'usd-fixed' });
    const usage = (await pool.query<{ usage: Record<string, unknown> }>('SELECT usage FROM screen_text_attempts WHERE id=$1', [attempt.attemptId])).rows[0]!.usage;
    expect(usage).toMatchObject({ originalCurrency: 'USD', originalFinalAmount: '0.1', finalAmountCny: '0.712346', conversionSnapshotId: attempt.conversionSnapshotId });
    const overview = await service.overview();
    expect(overview.meteredDeploymentCoverage).toEqual(expect.arrayContaining([
      expect.objectContaining({ deploymentVersionId: attempt.deploymentVersionId, currency: 'USD', covered: true }),
    ]));
    expect(overview.scopes.every((scope) => scope.currency === 'CNY')).toBe(true);
    const usageSummary = await service.listUsage({ limit: '20', offset: '0' });
    expect(usageSummary.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ resourcePool: 'ocr_api', currency: 'CNY', settledAmount: '0.712346' }),
    ]));
  });

  it('人民币原生报价不依赖换算快照并按原值进入预算与用量', async () => {
    await createAndPublish('10');
    const quote = createBudgetQuote({ billingClass: 'metered', currency: 'CNY', maximumAmount: '0.1', billingUnit: 'image', maximumQuantity: '1' });
    const attempt = await seedRealAttempt({ ...quote, skipConversion: true });
    const service = new SystemControlBudgetService(pool);
    const admitted = await service.admit({ attemptId: attempt.attemptId, attemptKind: 'screen_text', projectId: attempt.projectId, resourcePool: 'ocr_api', deploymentVersionId: attempt.deploymentVersionId, requestId: 'cny-native', quote });
    expect(admitted).toMatchObject({ conversionSnapshotId: null, rateDigest: null, conversionEffectiveAt: null, sourceCurrency: 'CNY', maximumAmountCny: '0.1' });
    const reservation = await service.getReservation(admitted.reservationId!);
    expect(reservation).toMatchObject({ currency: 'CNY', sourceCurrency: 'CNY', maximumAmountCny: '0.1', originalMaximumAmount: '0.1' });
    expect(reservation).not.toHaveProperty('conversionSnapshotId');
    await service.settle({ reservationId: admitted.reservationId, providerRequestId: 'cny-native-provider', finalQuantity: '1', finalAmount: '0.1', reconciliationStatus: 'final', externalSideEffectPossible: false, requestId: 'cny-native' });
    const usage = (await pool.query<{ usage: Record<string, unknown> }>('SELECT usage FROM screen_text_attempts WHERE id=$1', [attempt.attemptId])).rows[0]!.usage;
    expect(usage).toMatchObject({ conversionSnapshotId: null, rateDigest: null, conversionEffectiveAt: null, originalCurrency: 'CNY', originalFinalAmount: '0.1', finalAmountCny: '0.1' });
    const overview = await service.overview();
    expect(overview.meteredDeploymentCoverage).toEqual(expect.arrayContaining([
      expect.objectContaining({ deploymentVersionId: attempt.deploymentVersionId, currency: 'CNY', covered: true }),
    ]));
  });

  it('�������ڡ�unknown ����ת������ admission ǰ�ȶ�������零Ԥ��', async () => {
    await createAndPublish('10');
    const service = new SystemControlBudgetService(pool);
    const quote = createBudgetQuote({ billingClass: 'metered', currency: 'EUR', maximumAmount: '0.1', billingUnit: 'image', maximumQuantity: '1' });
    const missing = await seedRealAttempt({ ...quote, skipConversion: true });
    await expect(service.admit({ attemptId: missing.attemptId, attemptKind: 'screen_text', projectId: missing.projectId, resourcePool: 'ocr_api', deploymentVersionId: missing.deploymentVersionId, requestId: 'missing-conversion', quote })).rejects.toMatchObject({ code: 'SYSTEM_CONTROL_BUDGET_CONVERSION_MISSING' });
    const unknown = await seedRealAttempt({ ...quote, conversionStatus: 'unknown' });
    await expect(service.admit({ attemptId: unknown.attemptId, attemptKind: 'screen_text', projectId: unknown.projectId, resourcePool: 'ocr_api', deploymentVersionId: unknown.deploymentVersionId, conversionSnapshotId: unknown.conversionSnapshotId!, requestId: 'unknown-conversion', quote })).rejects.toMatchObject({ code: 'SYSTEM_CONTROL_BUDGET_CONVERSION_UNKNOWN' });
    expect((await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM budget_reservations')).rows[0]!.count).toBe('0');
    expect((await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM system_control_audit_events WHERE resource_type='budget_reservation'")).rows[0]!.count).toBe('0');
  });

  it('真实 Attempt 的 unmetered_local 只写 quoteDigest，不创建 reservation；billing snapshot 缺失稳定阻断', async () => {
    const local = createBudgetQuote({ billingClass: 'unmetered_local', currency: 'CNY', maximumAmount: '0', billingUnit: 'zero_network_call', maximumQuantity: '0' });
    const attempt = await seedRealAttempt(local); const service = new SystemControlBudgetService(pool);
    const admitted = await service.admit({ attemptId: attempt.attemptId, attemptKind: 'screen_text', projectId: attempt.projectId, resourcePool: 'ocr_api', deploymentVersionId: attempt.deploymentVersionId, requestId: 'local', quote: local });
    expect(admitted.reservationId).toBeNull();
    expect((await pool.query('SELECT budget_quote_digest,budget_reservation_id FROM screen_text_attempts WHERE id=$1', [attempt.attemptId])).rows[0]).toEqual({ budget_quote_digest: local.quoteDigest, budget_reservation_id: null });
    const broken = await seedRealAttempt(null);
    await expect(service.admit({ attemptId: broken.attemptId, attemptKind: 'screen_text', projectId: broken.projectId, resourcePool: 'ocr_api', deploymentVersionId: broken.deploymentVersionId, requestId: 'broken', quote: local })).rejects.toMatchObject({ code: 'SYSTEM_CONTROL_BUDGET_QUOTE_INVALID' });
  });

  it('无 active 仍记录预算事实，显式启用后缺规则稳定阻断，overview 保留真实历史用量', async () => {
    const quote = createBudgetQuote({ billingClass: 'metered', currency: 'USD', maximumAmount: '0.1', billingUnit: 'image', maximumQuantity: '1' });
    const noActive = await seedRealAttempt(quote); const service = new SystemControlBudgetService(pool);
    const noActiveAdmission = await service.admit({ attemptId: noActive.attemptId, attemptKind: 'screen_text', projectId: noActive.projectId, resourcePool: 'ocr_api', deploymentVersionId: noActive.deploymentVersionId, requestId: 'no-active', quote });
    expect(noActiveAdmission).toMatchObject({ budgetPolicyVersionId: null, reservationId: expect.any(String), maximumAmountCny: '0.1' });
    expect((await service.getReservation(noActiveAdmission.reservationId!)).budgetPolicyVersionId).toBeNull();
    await service.settle({ reservationId: noActiveAdmission.reservationId, providerRequestId: 'no-active-provider', finalQuantity: '1', finalAmount: '0.1', reconciliationStatus: 'final', externalSideEffectPossible: false, requestId: 'no-active' });
    await pool.query(`UPDATE engine_deployments SET status='disabled' WHERE id=$1`, [noActive.deploymentId]);
    const known = createBudgetQuote({ billingClass: 'metered', currency: 'USD', maximumAmount: '0.2', billingUnit: 'image', maximumQuantity: '1' });
    await createAndPublish('10');
    const missingRule = await seedRealAttempt(known);
    await expect(service.admit({ attemptId: missingRule.attemptId, attemptKind: 'screen_text', projectId: missingRule.projectId, resourcePool: 'asr_api', deploymentVersionId: missingRule.deploymentVersionId, requestId: 'missing-rule', quote: known })).rejects.toMatchObject({ code: 'SYSTEM_CONTROL_BUDGET_RULE_MISSING' });
    await pool.query(`UPDATE engine_deployments SET status='disabled' WHERE id=$1`, [missingRule.deploymentId]);
    await createAndPublish('10', 'CNY', 'USD');
    const historicalQuote = createBudgetQuote({ billingClass: 'metered', currency: 'CNY', maximumAmount: '0.2', billingUnit: 'image', maximumQuantity: '1' });
    const historical = await seedRealAttempt(historicalQuote);
    const admitted = await service.admit({ attemptId: historical.attemptId, attemptKind: 'screen_text', projectId: historical.projectId, resourcePool: 'ocr_api', deploymentVersionId: historical.deploymentVersionId, requestId: 'historical', quote: historicalQuote });
    await service.settle({ reservationId: admitted.reservationId, providerRequestId: 'history-provider', finalQuantity: '1', finalAmount: '0.2', reconciliationStatus: 'final', externalSideEffectPossible: false, requestId: 'historical' });
    await pool.query(`UPDATE engine_deployments SET status='disabled' WHERE id=$1`, [historical.deploymentId]);
    await pool.query('DELETE FROM active_budget_policy_pointers');
    const overview = await service.overview();
    expect(overview.noActivePolicy).toBe(true);
    expect(overview.hardBlocks).toEqual([]);
    expect(overview.scopes).toEqual(expect.arrayContaining([
      expect.objectContaining({ resourcePool: 'ocr_api', currency: 'CNY', period: 'day', settledAmount: expect.stringMatching(/^0\.3(?:0+)?$/), totalAmount: expect.stringMatching(/^0\.3(?:0+)?$/), status: 'missing_rule' }),
      expect.objectContaining({ resourcePool: 'ocr_api', currency: 'CNY', period: 'month', settledAmount: expect.stringMatching(/^0\.3(?:0+)?$/), totalAmount: expect.stringMatching(/^0\.3(?:0+)?$/), status: 'missing_rule' }),
    ]));
    const nullSnapshot = await seedRealAttempt(null);
    await expect(service.admit({ attemptId: nullSnapshot.attemptId, attemptKind: 'screen_text', projectId: nullSnapshot.projectId, resourcePool: 'ocr_api', deploymentVersionId: nullSnapshot.deploymentVersionId, requestId: 'null-snapshot', quote: quote })).rejects.toMatchObject({ code: 'SYSTEM_CONTROL_BUDGET_QUOTE_INVALID' });
    await pool.query(`UPDATE engine_deployments SET status='disabled' WHERE id=$1`, [nullSnapshot.deploymentId]);
  });

  it('V2 active 可回滚至 retired V1，命令幂等/冲突零副作用且 retired 不能再次 publish', async () => {
    const v1 = await createApprovedPolicy('10');
    const publishV1 = randomUUID();
    const publishV1Response = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${v1}/publish`, headers: headers('owner', `publish-v1-${randomUUID()}`), payload: { budgetReleaseCommandId: publishV1 } });
    expect(publishV1Response.statusCode, publishV1Response.body).toBe(200);

    const v2 = await createApprovedPolicy('20');
    const publishV2 = randomUUID();
    const publishV2Response = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${v2}/publish`, headers: headers('owner', `publish-v2-${randomUUID()}`), payload: { budgetReleaseCommandId: publishV2 } });
    expect(publishV2Response.statusCode, publishV2Response.body).toBe(200);
    expect((await pool.query<{ status: string }>('SELECT status FROM budget_policy_status_events WHERE budget_policy_version_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [v1])).rows[0]?.status).toBe('retired');

    const rollbackCommandId = randomUUID();
    const rollbackKey = `rollback-${randomUUID()}`;
    const rollbackBody = { budgetReleaseCommandId: rollbackCommandId, targetBudgetPolicyVersionId: v1 };
    const rollback = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${v1}/rollback`, headers: headers('owner', rollbackKey), payload: rollbackBody });
    expect(rollback.statusCode, rollback.body).toBe(200);
    expect(rollback.json().commandKind).toBe('rollback');
    expect(rollback.json().policy.budgetPolicyVersionId).toBe(v1);
    const replay = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${v1}/rollback`, headers: headers('owner', rollbackKey), payload: rollbackBody });
    expect(replay.statusCode, replay.body).toBe(200);
    expect(replay.headers['x-idempotent-replay']).toBe('true');
    expect(replay.json()).toEqual(rollback.json());

    expect((await pool.query<{ budget_policy_version_id: string }>('SELECT budget_policy_version_id FROM active_budget_policy_pointers WHERE environment=$1', ['development'])).rows).toEqual([{ budget_policy_version_id: v1 }]);
    expect((await pool.query<{ status: string }>('SELECT status FROM budget_policy_status_events WHERE budget_policy_version_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [v1])).rows[0]?.status).toBe('active');
    expect((await pool.query<{ status: string }>('SELECT status FROM budget_policy_status_events WHERE budget_policy_version_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [v2])).rows[0]?.status).toBe('retired');

    const sameKeyDifferentBody = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${v1}/rollback`, headers: headers('owner', rollbackKey), payload: { budgetReleaseCommandId: randomUUID(), targetBudgetPolicyVersionId: v2 } });
    expect(sameKeyDifferentBody.statusCode).toBe(409);
    expect(sameKeyDifferentBody.json().error.code).toBe('SYSTEM_CONTROL_BUDGET_IDEMPOTENCY_KEY_REUSED');
    const sameCommandDifferentKey = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${v1}/rollback`, headers: headers('owner', `rollback-conflict-${randomUUID()}`), payload: rollbackBody });
    expect(sameCommandDifferentKey.statusCode).toBe(409);
    expect(sameCommandDifferentKey.json().error.code).toBe('SYSTEM_CONTROL_BUDGET_COMMAND_ID_REUSED');

    const activeRollbackId = randomUUID();
    const activeRollback = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${v1}/rollback`, headers: headers('owner', `rollback-active-${randomUUID()}`), payload: { budgetReleaseCommandId: activeRollbackId, targetBudgetPolicyVersionId: v1 } });
    expect(activeRollback.statusCode).toBe(409);
    expect(activeRollback.json().error.code).toBe('SYSTEM_CONTROL_BUDGET_INVALID_TRANSITION');
    expect((await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM system_control_commands WHERE command_kind=$1 AND stable_command_key=$2', ['budget_rollback', activeRollbackId])).rows[0]?.count).toBe('0');

    const publishRetiredId = randomUUID();
    const publishRetired = await app.inject({ method: 'POST', url: `/api/system-control/budget-policies/${v2}/publish`, headers: headers('owner', `publish-retired-${randomUUID()}`), payload: { budgetReleaseCommandId: publishRetiredId } });
    expect(publishRetired.statusCode).toBe(409);
    expect(publishRetired.json().error.code).toBe('SYSTEM_CONTROL_BUDGET_INVALID_TRANSITION');
    expect((await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM system_control_commands WHERE command_kind=$1 AND stable_command_key=$2', ['budget_rollback', rollbackCommandId])).rows[0]?.count).toBe('1');
    expect((await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM system_control_audit_events WHERE action=$1 AND resource_id=$2', ['budget_rollback', v1])).rows[0]?.count).toBe('1');
    expect((await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM system_control_commands WHERE command_kind=$1 AND stable_command_key=$2', ['budget_publish', publishRetiredId])).rows[0]?.count).toBe('0');
  });

  it('recoverReservations 只释放确认未调用的终态，unknown 保留最大预留且 overrun 如实终结', async () => {
    await createAndPublish('10');
    const quote = createBudgetQuote({ billingClass: 'metered', currency: 'USD', maximumAmount: '0.2', billingUnit: 'image', maximumQuantity: '1' });
    const service = new SystemControlBudgetService(pool);
    const cancelled = await seedRealAttempt(quote);
    const cancelledReservation = await service.admit({ attemptId: cancelled.attemptId, attemptKind: 'screen_text', projectId: cancelled.projectId, resourcePool: 'ocr_api', deploymentVersionId: cancelled.deploymentVersionId, requestId: 'cancelled', quote });
    await pool.query(`UPDATE screen_text_attempts SET status='cancelled',completed_at=CURRENT_TIMESTAMP,external_side_effect_possible=FALSE WHERE id=$1`, [cancelled.attemptId]);
    expect(await service.recoverReservations()).toBe(1);
    expect((await service.getReservation(cancelledReservation.reservationId!)).status).toBe('released');
    const unknown = await seedRealAttempt(quote);
    const unknownReservation = await service.admit({ attemptId: unknown.attemptId, attemptKind: 'screen_text', projectId: unknown.projectId, resourcePool: 'ocr_api', deploymentVersionId: unknown.deploymentVersionId, requestId: 'unknown', quote });
    await pool.query(`UPDATE screen_text_attempts SET status='completed',provider_request_id='provider-unknown',external_side_effect_possible=TRUE,usage=$2::jsonb,completed_at=CURRENT_TIMESTAMP WHERE id=$1`, [unknown.attemptId, JSON.stringify({ providerRequestId: 'provider-unknown', billingQuantity: '1', finalAmount: '0.2', reconciliationStatus: 'pending' })]);
    expect(await service.recoverReservations()).toBe(1);
    expect((await service.getReservation(unknownReservation.reservationId!)).status).toBe('reconciliation_required');
    expect(await service.recoverReservations()).toBe(0);
    const reconciled = await seedRealAttempt(quote);
    const reconciledReservation = await service.admit({ attemptId: reconciled.attemptId, attemptKind: 'screen_text', projectId: reconciled.projectId, resourcePool: 'ocr_api', deploymentVersionId: reconciled.deploymentVersionId, requestId: 'reconciled', quote });
    await pool.query(`UPDATE budget_reservations SET status='reconciliation_required',provider_request_id='provider-reconciled',reconciliation_status='unknown' WHERE id=$1`, [reconciledReservation.reservationId]);
    await pool.query(`UPDATE screen_text_attempts SET status='completed',provider_request_id='provider-reconciled',external_side_effect_possible=TRUE,usage=$2::jsonb,completed_at=CURRENT_TIMESTAMP WHERE id=$1`, [reconciled.attemptId, JSON.stringify({ providerRequestId: 'provider-reconciled', billingQuantity: '1', finalAmount: '0.1', reconciliationStatus: 'final' })]);
    expect(await service.recoverReservations()).toBe(1);
    expect((await service.getReservation(reconciledReservation.reservationId!)).status).toBe('settled');
    expect(await service.recoverReservations()).toBe(0);
    const overrun = await seedRealAttempt(quote);
    const overrunReservation = await service.admit({ attemptId: overrun.attemptId, attemptKind: 'screen_text', projectId: overrun.projectId, resourcePool: 'ocr_api', deploymentVersionId: overrun.deploymentVersionId, requestId: 'overrun', quote });
    await service.settle({ reservationId: overrunReservation.reservationId, providerRequestId: 'provider-overrun', finalQuantity: '1', finalAmount: '0.3', reconciliationStatus: 'final', externalSideEffectPossible: false, requestId: 'overrun' });
    expect((await service.getReservation(overrunReservation.reservationId!)).status).toBe('overrun');
  });
});
