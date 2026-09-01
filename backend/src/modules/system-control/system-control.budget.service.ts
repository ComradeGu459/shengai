import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  SystemControlBudgetAuditList,
  SystemControlBudgetAuditListQuery,
  SystemControlBudgetCommand,
  SystemControlBudgetImpact,
  SystemControlBudgetPolicy,
  SystemControlBudgetPolicyList,
  SystemControlBudgetPolicyListQuery,
  SystemControlBudgetPolicyStatus,
  SystemControlBudgetQuote,
  SystemControlBudgetReservation,
  SystemControlBudgetUsageList,
  SystemControlBudgetUsageListQuery,
  SystemControlCreateBudgetPolicyBody,
  SystemControlBudgetCommandBody,
  SystemControlBudgetReleaseBody,
  SystemControlBudgetRollbackBody,
  SystemControlBudgetOverview,
  SystemControlBudgetTestRun,
  SystemControlBudgetTestRunList,
  SystemControlBudgetTestRunListQuery,
  SystemControlBudgetTestCommandBody,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';
import type { SystemControlPrincipal } from './system-control.auth.js';
import { SystemControlCostConversionService, type CostConversionRateProvider } from './system-control.cost.service.js';
import {
  budgetCommandNotFound, budgetConflict, budgetInvalid, budgetNotFound,
} from './system-control.budget.errors.js';

type PolicyRow = { id: string; environment: 'development'; version: number; enforcement_enabled: boolean; created_at: Date };
type RuleRow = { resource_pool: 'asr_api' | 'ocr_api'; currency: string; period: 'day' | 'month'; warning_limit: string; hard_limit: string };
type EventRow = { status: SystemControlBudgetPolicyStatus; created_at: Date };
type AuditInput = { principal: SystemControlPrincipal; requestId: string; action: string; resourceId: string; result: string; idempotencyKey?: string; afterSnapshot?: unknown; resourceType?: string };

const toTestRun = (row: any): SystemControlBudgetTestRun => ({
  budgetTestRunId: row.id, budgetPolicyVersionId: row.budget_policy_version_id, status: row.status,
  inputDigest: row.input_digest, requestId: row.request_id, result: row.result ?? null,
  reasonCode: row.reason_code ?? null, reasonMessage: row.reason_message ?? null,
  createdAt: row.created_at.toISOString(), startedAt: row.started_at?.toISOString() ?? null,
  completedAt: row.completed_at?.toISOString() ?? null,
});

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, stableValue(nested)]));
  return value;
};

export const stableBudgetDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
export const billingSnapshotMatches = (left: unknown, right: unknown) => stableBudgetDigest(left) === stableBudgetDigest(right);

const validKey = (key: string) => {
  const trimmed = key.trim();
  if (trimmed.length < 8 || trimmed.length > 200) throw budgetInvalid('SYSTEM_CONTROL_BUDGET_IDEMPOTENCY_KEY_REUSED', '预算命令必须提供稳定 Idempotency-Key。');
  return trimmed;
};

const parsePage = (query: { limit?: string; offset?: string }) => ({
  limit: query.limit ? Number(query.limit) : 50,
  offset: query.offset ? Number(query.offset) : 0,
});

const decimal = (value: unknown, field: string) => {
  const text = String(value);
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,12})?$/.test(text)) throw budgetInvalid('SYSTEM_CONTROL_BUDGET_QUOTE_INVALID', `${field} 必须是十进制字符串。`);
  return text;
};
const canonicalDecimal = (value: unknown) => {
  const text = String(value);
  const [rawWhole, fraction = ''] = text.split('.');
  const whole = rawWhole ?? '0';
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0';
  const normalizedFraction = fraction.replace(/0+$/, '');
  return normalizedFraction ? `${normalizedWhole}.${normalizedFraction}` : normalizedWhole;
};

const toRule = (row: RuleRow) => ({
  resourcePool: row.resource_pool, currency: row.currency, period: row.period,
  warningLimit: String(row.warning_limit), hardLimit: String(row.hard_limit),
});

export type BudgetAdmissionInput = {
  attemptId: string;
  attemptKind: 'asr' | 'screen_text';
  projectId: string;
  resourcePool: 'asr_api' | 'ocr_api';
  deploymentVersionId: string;
  requestId: string;
  quote: SystemControlBudgetQuote;
  conversionSnapshotId?: string;
};

export type BudgetUsageFacts = {
  sourceCurrency: string;
  conversionSnapshotId: string | null;
  rateDigest: string | null;
  conversionEffectiveAt: Date | null;
  maximumAmountCny: string;
};

export type BudgetSettlementInput = {
  reservationId: string | null;
  providerRequestId: string | null;
  finalQuantity: string;
  finalAmount: string;
  reconciliationStatus: 'final' | 'pending' | 'unknown';
  externalSideEffectPossible: boolean;
  requestId: string;
};

const policyStatus = async (client: PoolClient, id: string) => {
  const result = await client.query<EventRow>(`SELECT status,created_at FROM budget_policy_status_events WHERE budget_policy_version_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1`, [id]);
  return result.rows[0]?.status ?? 'draft';
};

export const createBudgetQuote = (input: {
  billingClass: 'metered' | 'unmetered_local';
  currency: string;
  maximumAmount: string;
  billingUnit: string;
  maximumQuantity: string;
}): SystemControlBudgetQuote => {
  const base = {
    billingClass: input.billingClass, currency: input.currency,
    maximumAmount: decimal(input.maximumAmount, 'maximumAmount'), billingUnit: input.billingUnit,
    maximumQuantity: decimal(input.maximumQuantity, 'maximumQuantity'),
  };
  return { ...base, quoteDigest: stableBudgetDigest(base) };
};

export class SystemControlBudgetService {
  private readonly costConversion: SystemControlCostConversionService;

  constructor(private readonly pool: DatabasePool, conversionProvider?: CostConversionRateProvider) {
    this.costConversion = new SystemControlCostConversionService(pool, conversionProvider);
  }

  private async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await operation(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  private async lockCommand(client: PoolClient, kind: string, key: string) {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`budget-command-key:${kind}:${key}`]);
  }

  private async lockStable(client: PoolClient, stableKey: string) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`budget-command:${stableKey}`]);
  }

  private async audit(client: PoolClient, input: AuditInput) {
    await client.query(`INSERT INTO system_control_audit_events
      (actor_subject,actor_audience,action,resource_type,resource_id,idempotency_key,request_id,result,after_snapshot)
      VALUES ($1,'system-control',$2,$3,$4,$5,$6,$7,$8)`, [
      input.principal.subject, input.action, input.resourceType ?? 'budget_policy_version', input.resourceId, input.idempotencyKey ?? null,
      input.requestId, input.result, input.afterSnapshot ? JSON.stringify(input.afterSnapshot) : null,
    ]);
  }

  private async loadPolicy(client: PoolClient, id: string): Promise<SystemControlBudgetPolicy> {
    const policy = await client.query<PolicyRow>('SELECT id,environment,version,enforcement_enabled,created_at FROM budget_policy_versions WHERE id=$1', [id]);
    const row = policy.rows[0]; if (!row) throw budgetNotFound('预算策略版本不存在。');
    const rules = await client.query<RuleRow>("SELECT resource_pool,currency,period,warning_limit::text,hard_limit::text FROM budget_policy_rules WHERE budget_policy_version_id=$1 AND currency='CNY' ORDER BY resource_pool,period", [id]);
    const event = await client.query<EventRow>('SELECT status,created_at FROM budget_policy_status_events WHERE budget_policy_version_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [id]);
    const impact = await client.query<{ snapshot: SystemControlBudgetImpact }>('SELECT snapshot FROM budget_policy_impact_snapshots WHERE budget_policy_version_id=$1', [id]);
    const latest = event.rows[0];
    return {
      budgetPolicyVersionId: row.id, environment: row.environment, version: row.version,
      enforcementEnabled: row.enforcement_enabled,
      status: latest?.status ?? 'draft', rules: rules.rows.map(toRule),
      impact: impact.rows[0]?.snapshot ?? null,
      createdAt: row.created_at.toISOString(), updatedAt: (latest?.created_at ?? row.created_at).toISOString(),
    };
  }

  async create(input: { body: SystemControlCreateBudgetPolicyBody; idempotencyKey: string; requestId: string; principal: SystemControlPrincipal }): Promise<{ policy: SystemControlBudgetPolicy; replay: boolean }> {
    const key = validKey(input.idempotencyKey);
    const stableKey = input.body.budgetPolicyVersionId;
    const requestHash = stableBudgetDigest(input.body);
    return this.transaction(async (client) => {
      await this.lockCommand(client, 'budget_policy_create', key); await this.lockStable(client, stableKey);
      const byStable = await client.query<any>('SELECT command_kind,idempotency_key,request_hash,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 FOR UPDATE', [stableKey]);
      if (byStable.rows[0]) {
        const row = byStable.rows[0];
        if (row.command_kind !== 'budget_policy_create' || row.idempotency_key !== key || row.request_hash !== requestHash) throw budgetConflict('SYSTEM_CONTROL_BUDGET_POLICY_ID_REUSED', 'budgetPolicyVersionId 已绑定另一预算策略。');
        return { policy: row.response_snapshot.policy as SystemControlBudgetPolicy, replay: true };
      }
      const byKey = await client.query<any>('SELECT stable_command_key,request_hash,response_snapshot FROM system_control_commands WHERE command_kind=$1 AND idempotency_key=$2 FOR UPDATE', ['budget_policy_create', key]);
      if (byKey.rows[0]) {
        if (byKey.rows[0].request_hash !== requestHash || byKey.rows[0].stable_command_key !== stableKey) throw budgetConflict('SYSTEM_CONTROL_BUDGET_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同预算策略请求。');
        return { policy: byKey.rows[0].response_snapshot.policy as SystemControlBudgetPolicy, replay: true };
      }
      const existing = await client.query('SELECT 1 FROM budget_policy_versions WHERE id=$1', [stableKey]);
      if (existing.rows[0]) throw budgetConflict('SYSTEM_CONTROL_BUDGET_POLICY_ID_REUSED', 'budgetPolicyVersionId 已存在。');
      const seen = new Set<string>();
      for (const rule of input.body.rules) {
        if (String(rule.currency) !== 'CNY') throw budgetInvalid('SYSTEM_CONTROL_BUDGET_QUOTE_INVALID', '新预算规则只允许使用人民币 CNY。');
        const warning = decimal(rule.warningLimit, 'warningLimit'); const hard = decimal(rule.hardLimit, 'hardLimit');
        const keyRule = `${rule.resourcePool}:${rule.currency}:${rule.period}`;
        if (seen.has(keyRule)) throw budgetInvalid('SYSTEM_CONTROL_BUDGET_QUOTE_INVALID', '预算规则不能重复。'); seen.add(keyRule);
        const compare = await client.query<{ invalid: boolean }>('SELECT $1::numeric >= $2::numeric AS invalid', [warning, hard]);
        if (compare.rows[0]?.invalid) throw budgetInvalid('SYSTEM_CONTROL_BUDGET_QUOTE_INVALID', 'warningLimit 必须严格低于 hardLimit。');
      }
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['budget-policy-version:development']);
      const latest = await client.query<{ version: number }>(`SELECT COALESCE(MAX(version),0)::int AS version FROM budget_policy_versions WHERE environment='development'`);
      await client.query('INSERT INTO budget_policy_versions(id,environment,version,enforcement_enabled) VALUES($1,\'development\',$2,$3)', [stableKey, (latest.rows[0]?.version ?? 0) + 1, input.body.enforcementEnabled ?? false]);
      for (const rule of input.body.rules) await client.query(`INSERT INTO budget_policy_rules (budget_policy_version_id,resource_pool,currency,period,warning_limit,hard_limit) VALUES($1,$2,$3,$4,$5::numeric,$6::numeric)`, [stableKey, rule.resourcePool, rule.currency, rule.period, rule.warningLimit, rule.hardLimit]);
      await client.query(`INSERT INTO budget_policy_status_events (budget_policy_version_id,status,request_id,actor_subject) VALUES($1,'draft',$2,$3)`, [stableKey, input.requestId, input.principal.subject]);
      const policy = await this.loadPolicy(client, stableKey);
      await client.query(`INSERT INTO system_control_commands(command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES('budget_policy_create',$1,$2,$3,$5,$4)`, [key, stableKey, requestHash, JSON.stringify({ policy }), stableKey]);
      await this.audit(client, { principal: input.principal, requestId: input.requestId, action: 'budget_policy_created', resourceId: stableKey, idempotencyKey: key, result: 'succeeded', afterSnapshot: { budgetPolicyVersionId: stableKey, status: 'draft', enforcementEnabled: input.body.enforcementEnabled ?? false } });
      return { policy, replay: false };
    });
  }

  async get(id: string) { return this.loadPolicyFromPool(id); }

  async list(query: SystemControlBudgetPolicyListQuery): Promise<SystemControlBudgetPolicyList> {
    const { limit, offset } = parsePage(query); const values: unknown[] = []; const where: string[] = [];
    if (query.environment) { values.push(query.environment); where.push(`p.environment=$${values.length}`); }
    if (query.status) { values.push(query.status); where.push(`COALESCE((SELECT e.status FROM budget_policy_status_events e WHERE e.budget_policy_version_id=p.id ORDER BY e.created_at DESC,e.id DESC LIMIT 1),'draft')=$${values.length}`); }
    const base = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await this.pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM budget_policy_versions p ${base}`, values);
    values.push(limit, offset);
    const rows = await this.pool.query<PolicyRow>(`SELECT p.id,p.environment,p.version,p.enforcement_enabled,p.created_at FROM budget_policy_versions p ${base} ORDER BY p.created_at DESC,p.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const items = await Promise.all(rows.rows.map((row) => this.loadPolicyFromPool(row.id)));
    return { items, total: Number(total.rows[0]?.count ?? 0), limit, offset };
  }

  private async loadPolicyFromPool(id: string) {
    const client = await this.pool.connect(); try { return await this.loadPolicy(client, id); } finally { client.release(); }
  }

  private async impact(client: PoolClient, id: string): Promise<SystemControlBudgetImpact> {
    const policyState = await client.query<{ enforcement_enabled: boolean }>('SELECT enforcement_enabled FROM budget_policy_versions WHERE id=$1 FOR SHARE', [id]);
    const enforcementEnabled = policyState.rows[0]?.enforcement_enabled ?? false;
    const rules = await client.query<RuleRow>('SELECT resource_pool,currency,period,warning_limit::text,hard_limit::text FROM budget_policy_rules WHERE budget_policy_version_id=$1 ORDER BY resource_pool,currency,period', [id]);
    const reconciliation = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM budget_reservations WHERE status IN ('unknown','reconciliation_required')`, []);
    const active = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM budget_reservations WHERE status IN ('reserved','unknown','reconciliation_required')`, []);
    const hardBlocks: string[] = [];
    const configurationHardBlocks: string[] = [];
    const runtimeBlockedScopes: string[] = [];
    const runtimeWarningScopes: string[] = [];
    const scopes: Array<Record<string, unknown>> = [];
    let warningCount = 0;
    for (const rule of rules.rows) {
      const periodStart = rule.period === 'day' ? "date_trunc('day', CURRENT_TIMESTAMP)" : "date_trunc('month', CURRENT_TIMESTAMP)";
      const usage = await client.query<{ settled: string; reserved: string; unknown: string }>(`SELECT
        COALESCE(SUM(CASE WHEN status IN ('settled','overrun') THEN COALESCE(final_amount_cny,final_amount,0) ELSE 0 END),0)::text AS settled,
        COALESCE(SUM(CASE WHEN status='reserved' THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0)::text AS reserved,
        COALESCE(SUM(CASE WHEN status IN ('unknown','reconciliation_required') THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0)::text AS unknown
        FROM budget_reservations WHERE resource_pool=$1 AND currency='CNY' AND created_at >= ${periodStart}
          AND status IN ('reserved','unknown','reconciliation_required','settled','overrun')`, [rule.resource_pool]);
      const row = usage.rows[0]!;
      const totals = await client.query<{ total: string; warning: boolean; blocked: boolean }>(`SELECT
        ($1::numeric+$2::numeric+$3::numeric)::text AS total,
        ($1::numeric+$2::numeric+$3::numeric >= $4::numeric) AS warning,
        ($1::numeric+$2::numeric+$3::numeric > $5::numeric) AS blocked`, [row.settled, row.reserved, row.unknown, rule.warning_limit, rule.hard_limit]);
      const summary = totals.rows[0]!;
      const status = enforcementEnabled
        ? summary.blocked ? 'blocked' : summary.warning ? 'warning' : 'ok'
        : summary.blocked ? 'unblocked' : summary.warning ? 'warning' : 'ok';
      if (enforcementEnabled && summary.blocked) runtimeBlockedScopes.push(`${rule.resource_pool}:${rule.currency}:${rule.period}`);
      if (summary.warning) { warningCount += 1; runtimeWarningScopes.push(`${rule.resource_pool}:${rule.currency}:${rule.period}`); }
      scopes.push({ resourcePool: rule.resource_pool, currency: rule.currency, period: rule.period, settledAmount: row.settled, reservedAmount: row.reserved, unknownAmount: row.unknown, totalAmount: summary.total, warningLimit: rule.warning_limit, hardLimit: rule.hard_limit, status });
    }
    const coverageRows = await client.query<{ deployment_version_id: string; resource_pool: 'asr_api' | 'ocr_api'; currency: string | null; conversion_available: boolean }>(`SELECT v.id AS deployment_version_id,
      CASE WHEN d.capability='asr' THEN 'asr_api' ELSE 'ocr_api' END AS resource_pool,
      v.billing_snapshot->>'currency' AS currency,
      CASE WHEN v.billing_snapshot->>'currency'='CNY' THEN TRUE ELSE EXISTS (
        SELECT 1 FROM cost_conversion_snapshots c WHERE c.source_currency=v.billing_snapshot->>'currency'
          AND c.target_currency='CNY' AND c.status='available' AND c.effective_at<=CURRENT_TIMESTAMP AND c.expires_at>CURRENT_TIMESTAMP
      ) END AS conversion_available
      FROM engine_deployment_versions v JOIN engine_deployments d ON d.id=v.deployment_id
      WHERE d.status='enabled' AND d.capability IN ('asr','screen_text') AND (v.billing_snapshot IS NULL OR v.billing_snapshot->>'billingClass'='metered')`);
    const meteredDeploymentCoverage = coverageRows.rows.map((row) => {
      const hasCnyRule = rules.rows.some((rule) => rule.resource_pool === row.resource_pool);
      const covered = Boolean(row.currency && row.conversion_available && hasCnyRule);
      if (!hasCnyRule) {
        configurationHardBlocks.push(`missing_currency_rule:${row.resource_pool}:CNY`);
        if (enforcementEnabled) hardBlocks.push(`missing_currency_rule:${row.resource_pool}:CNY`);
      }
      if (!row.currency || !row.conversion_available) {
        const conversionBlock = `missing_conversion_snapshot:${row.resource_pool}:${row.currency ?? 'unknown'}`;
        configurationHardBlocks.push(conversionBlock);
        hardBlocks.push(conversionBlock);
      }
      return { deploymentVersionId: row.deployment_version_id, resourcePool: row.resource_pool, currency: row.currency, covered };
    });
    if (rules.rows.length === 0) {
      configurationHardBlocks.push('missing_currency_rule');
      if (enforcementEnabled) hardBlocks.push('missing_currency_rule');
    }
    return { hardBlocks: [...new Set(hardBlocks)], configurationHardBlocks: [...new Set(configurationHardBlocks)], runtimeBlockedScopes, runtimeWarningScopes, warningCount, activeReservationCount: Number(active.rows[0]?.count ?? 0), reconciliationRequiredCount: Number(reconciliation.rows[0]?.count ?? 0), scopes, meteredDeploymentCoverage } as SystemControlBudgetImpact;
  }

  private async transition(input: { id: string; commandId: string; testRunId?: string; action: 'test' | 'impact-check' | 'approve'; target: SystemControlBudgetPolicyStatus; key: string; requestId: string; principal: SystemControlPrincipal }): Promise<{ policy: SystemControlBudgetPolicy; replay: boolean }> {
    const key = validKey(input.key); const kind = `budget_${input.action}`; const testRunId = input.testRunId; const hash = stableBudgetDigest({ budgetPolicyVersionId: input.id, commandId: input.commandId, testRunId, action: input.action });
    return this.transaction(async (client) => {
      await this.lockCommand(client, kind, key); await this.lockStable(client, input.commandId); await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`budget-policy:${input.id}`]);
      const byStable = await client.query<any>('SELECT command_kind,idempotency_key,request_hash,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 FOR UPDATE', [input.commandId]);
      if (byStable.rows[0]) { const row = byStable.rows[0]; if (row.command_kind !== kind || row.idempotency_key !== key || row.request_hash !== hash) throw budgetConflict('SYSTEM_CONTROL_BUDGET_COMMAND_ID_REUSED', '预算命令身份已绑定另一请求。'); return { policy: row.response_snapshot.policy, replay: true }; }
      const byKey = await client.query<any>('SELECT stable_command_key,request_hash,response_snapshot FROM system_control_commands WHERE command_kind=$1 AND idempotency_key=$2 FOR UPDATE', [kind, key]);
      if (byKey.rows[0]) { if (byKey.rows[0].stable_command_key !== input.commandId || byKey.rows[0].request_hash !== hash) throw budgetConflict('SYSTEM_CONTROL_BUDGET_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同预算命令。'); return { policy: byKey.rows[0].response_snapshot.policy, replay: true }; }
      const policy = await this.loadPolicy(client, input.id); const expected: Record<string, SystemControlBudgetPolicyStatus> = { test: 'draft', 'impact-check': 'testing', approve: 'impact_checked' };
      if (policy.status !== expected[input.action]) throw budgetConflict('SYSTEM_CONTROL_BUDGET_INVALID_TRANSITION', `预算策略当前状态不能执行 ${input.action}。`);
      let impact = policy.impact;
      if (input.action === 'impact-check' || input.action === 'approve') impact = await this.impact(client, input.id);
      if (input.action === 'approve' && impact && impact.hardBlocks.length) throw budgetConflict('SYSTEM_CONTROL_BUDGET_IMPACT_BLOCKED', '预算策略存在硬阻断，不能批准。');
      if (input.action === 'test' && testRunId) {
        const inputSnapshot = { budgetPolicyVersionId: input.id, commandId: input.commandId, rules: policy.rules };
        const inputDigest = stableBudgetDigest(inputSnapshot);
        const existingRun = await client.query<any>('SELECT * FROM budget_test_runs WHERE id=$1 FOR UPDATE', [testRunId]);
        if (existingRun.rows[0] && existingRun.rows[0].input_digest !== inputDigest) throw budgetConflict('SYSTEM_CONTROL_BUDGET_COMMAND_ID_REUSED', 'budgetTestRunId 已绑定另一测试输入。');
        if (!existingRun.rows[0]) {
          await client.query(`INSERT INTO budget_test_runs(id,budget_policy_version_id,input_digest,input_snapshot,status,request_id,started_at) VALUES($1,$2,$3,$4,'running',$5,CURRENT_TIMESTAMP)`, [testRunId, input.id, inputDigest, JSON.stringify(inputSnapshot), input.requestId]);
          await client.query(`UPDATE budget_test_runs SET status='succeeded',result=$2,completed_at=CURRENT_TIMESTAMP WHERE id=$1`, [testRunId, JSON.stringify({ ruleCount: policy.rules.length, externalSideEffect: false })]);
        }
      }
      await client.query(`INSERT INTO budget_policy_status_events (budget_policy_version_id,status,request_id,actor_subject) VALUES($1,$2,$3,$4)`, [input.id, input.target, input.requestId, input.principal.subject]);
      if (input.action === 'impact-check') await client.query(`INSERT INTO budget_policy_impact_snapshots(budget_policy_version_id,snapshot) VALUES($1,$2) ON CONFLICT (budget_policy_version_id) DO NOTHING`, [input.id, JSON.stringify(impact)]);
      const next = await this.loadPolicy(client, input.id); const response = { policy: next };
      await client.query(`INSERT INTO system_control_commands(command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES($1,$2,$3,$4,$5,$6)`, [kind, key, input.commandId, hash, input.id, JSON.stringify(response)]);
      await this.audit(client, { principal: input.principal, requestId: input.requestId, action: `budget_${input.action === 'impact-check' ? 'impact_checked' : input.action === 'test' ? 'testing' : 'approved'}`, resourceId: input.id, idempotencyKey: key, result: 'succeeded', afterSnapshot: { budgetPolicyVersionId: input.id, status: input.target } });
      return { policy: next, replay: false };
    });
  }

  test(id: string, body: SystemControlBudgetTestCommandBody, input: { key: string; requestId: string; principal: SystemControlPrincipal }) { return this.transition({ id, commandId: body.commandId, testRunId: body.budgetTestRunId, action: 'test', target: 'testing', ...input }); }
  impactCheck(id: string, body: SystemControlBudgetCommandBody, input: { key: string; requestId: string; principal: SystemControlPrincipal }) { return this.transition({ id, commandId: body.commandId, action: 'impact-check', target: 'impact_checked', ...input }); }
  approve(id: string, body: SystemControlBudgetCommandBody, input: { key: string; requestId: string; principal: SystemControlPrincipal }) { return this.transition({ id, commandId: body.commandId, action: 'approve', target: 'approved', ...input }); }

  private async release(input: { id: string; targetId?: string; releaseId: string; key: string; requestId: string; principal: SystemControlPrincipal; rollback: boolean }): Promise<{ command: SystemControlBudgetCommand; replay: boolean }> {
    const key = validKey(input.key); const kind = input.rollback ? 'budget_rollback' : 'budget_publish'; const hash = stableBudgetDigest({ id: input.id, targetId: input.targetId ?? null, releaseId: input.releaseId, kind });
    return this.transaction(async (client) => {
      await this.lockCommand(client, kind, key); await this.lockStable(client, input.releaseId); await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['budget-pointer:development']);
      const byStable = await client.query<any>('SELECT command_kind,idempotency_key,request_hash,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 FOR UPDATE', [input.releaseId]);
      if (byStable.rows[0]) { const row = byStable.rows[0]; if (row.command_kind !== kind || row.idempotency_key !== key || row.request_hash !== hash) throw budgetConflict('SYSTEM_CONTROL_BUDGET_COMMAND_ID_REUSED', 'budgetReleaseCommandId 已绑定另一发布请求。'); return { command: row.response_snapshot as SystemControlBudgetCommand, replay: true }; }
      const byKey = await client.query<any>('SELECT stable_command_key,request_hash,response_snapshot FROM system_control_commands WHERE command_kind=$1 AND idempotency_key=$2 FOR UPDATE', [kind, key]);
      if (byKey.rows[0]) { if (byKey.rows[0].stable_command_key !== input.releaseId || byKey.rows[0].request_hash !== hash) throw budgetConflict('SYSTEM_CONTROL_BUDGET_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同发布命令。'); return { command: byKey.rows[0].response_snapshot, replay: true }; }
      const targetId = input.rollback ? input.targetId! : input.id;
      const target = await this.loadPolicy(client, targetId);
      const allowedTargetStatuses = input.rollback ? ['approved', 'retired'] : ['approved'];
      if (!allowedTargetStatuses.includes(target.status)) throw budgetConflict('SYSTEM_CONTROL_BUDGET_INVALID_TRANSITION', input.rollback ? '只有已批准或已退役预算策略可以回滚。' : '只有已批准预算策略可以发布。');
      const impact = await this.impact(client, targetId); if (impact.hardBlocks.length) throw budgetConflict('SYSTEM_CONTROL_BUDGET_IMPACT_BLOCKED', '预算策略存在硬阻断，不能发布。');
      const current = await client.query<{ budget_policy_version_id: string }>(`SELECT budget_policy_version_id FROM active_budget_policy_pointers WHERE environment='development' FOR UPDATE`);
      if (current.rows[0]?.budget_policy_version_id && current.rows[0].budget_policy_version_id !== targetId) await client.query(`INSERT INTO budget_policy_status_events (budget_policy_version_id,status,request_id,actor_subject) VALUES($1,'retired',$2,$3)`, [current.rows[0].budget_policy_version_id, input.requestId, input.principal.subject]);
      await client.query(`INSERT INTO budget_policy_status_events (budget_policy_version_id,status,request_id,actor_subject) VALUES($1,'active',$2,$3)`, [targetId, input.requestId, input.principal.subject]);
      await client.query(`INSERT INTO active_budget_policy_pointers(environment,budget_policy_version_id) VALUES('development',$1) ON CONFLICT (environment) DO UPDATE SET budget_policy_version_id=EXCLUDED.budget_policy_version_id,updated_at=CURRENT_TIMESTAMP`, [targetId]);
      const policy = await this.loadPolicy(client, targetId); const command: SystemControlBudgetCommand = { commandId: input.releaseId, commandKind: input.rollback ? 'rollback' : 'publish', budgetReleaseCommandId: input.releaseId, status: 'succeeded', requestId: input.requestId, policy, createdAt: new Date().toISOString() };
      await client.query(`INSERT INTO system_control_commands(command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES($1,$2,$3,$4,$5,$6)`, [kind, key, input.releaseId, hash, targetId, JSON.stringify(command)]);
      await this.audit(client, { principal: input.principal, requestId: input.requestId, action: input.rollback ? 'budget_rollback' : 'budget_published', resourceId: targetId, idempotencyKey: key, result: 'succeeded', afterSnapshot: { budgetPolicyVersionId: targetId, status: 'active', enforcementEnabled: target.enforcementEnabled } });
      return { command, replay: false };
    });
  }

  publish(id: string, body: SystemControlBudgetReleaseBody, input: { key: string; requestId: string; principal: SystemControlPrincipal }) { return this.release({ id, releaseId: body.budgetReleaseCommandId, rollback: false, ...input }); }
  rollback(body: SystemControlBudgetRollbackBody, input: { key: string; requestId: string; principal: SystemControlPrincipal }) { return this.release({ id: body.targetBudgetPolicyVersionId, targetId: body.targetBudgetPolicyVersionId, releaseId: body.budgetReleaseCommandId, rollback: true, ...input }); }

  async getCommand(commandId: string) {
    const result = await this.pool.query<{ response_snapshot: SystemControlBudgetCommand | null }>(`SELECT response_snapshot FROM system_control_commands WHERE stable_command_key=$1 AND command_kind IN ('budget_publish','budget_rollback')`, [commandId]);
    const snapshot = result.rows[0]?.response_snapshot; if (!snapshot) throw budgetCommandNotFound('预算发布命令不存在。'); return snapshot;
  }

  async getTestRun(testRunId: string): Promise<SystemControlBudgetTestRun> {
    const result = await this.pool.query<any>('SELECT * FROM budget_test_runs WHERE id=$1', [testRunId]);
    if (!result.rows[0]) throw budgetCommandNotFound('预算测试运行不存在。');
    return toTestRun(result.rows[0]);
  }

  async listTestRuns(policyId: string, query: SystemControlBudgetTestRunListQuery): Promise<SystemControlBudgetTestRunList> {
    const { limit, offset } = parsePage(query);
    const total = await this.pool.query<{ count: string }>('SELECT count(*)::text AS count FROM budget_test_runs WHERE budget_policy_version_id=$1', [policyId]);
    const rows = await this.pool.query<any>('SELECT * FROM budget_test_runs WHERE budget_policy_version_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3', [policyId, limit, offset]);
    return { items: rows.rows.map(toTestRun), total: Number(total.rows[0]?.count ?? 0), limit, offset };
  }

  async listUsage(query: SystemControlBudgetUsageListQuery): Promise<SystemControlBudgetUsageList> {
    const { limit, offset } = parsePage(query); const values: unknown[] = []; const where: string[] = ["currency='CNY'"];
    if (query.resourcePool) { values.push(query.resourcePool); where.push(`resource_pool=$${values.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const grouped = `SELECT resource_pool,'CNY' AS currency,COALESCE(SUM(CASE WHEN status IN ('settled','overrun') THEN COALESCE(final_amount_cny,final_amount,0) ELSE 0 END),0)::text AS settled_amount,COALESCE(SUM(CASE WHEN status IN ('reserved','unknown','reconciliation_required') THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0)::text AS reserved_amount,COUNT(*) FILTER (WHERE status IN ('reserved','unknown','reconciliation_required'))::int AS pending_count,COUNT(*) FILTER (WHERE status IN ('unknown','reconciliation_required'))::int AS unknown_count FROM budget_reservations ${whereSql} GROUP BY resource_pool`;
    const total = await this.pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM (${grouped}) q`, values); values.push(limit, offset);
    const rows = await this.pool.query<any>(`${grouped} ORDER BY resource_pool,currency LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { items: rows.rows.map((row) => ({ resourcePool: row.resource_pool, currency: row.currency, estimatedAmount: null, settledAmount: row.settled_amount, reservedAmount: row.reserved_amount, pendingCount: row.pending_count, unknownCount: row.unknown_count })), total: Number(total.rows[0]?.count ?? 0), limit, offset };
  }

  async overview(): Promise<SystemControlBudgetOverview> {
    const nowResult = await this.pool.query<{ now: Date }>('SELECT CURRENT_TIMESTAMP AS now');
    const databaseNow = nowResult.rows[0]!.now;
    const pointer = await this.pool.query<{ budget_policy_version_id: string; version: number; enforcement_enabled: boolean }>(`SELECT p.id AS budget_policy_version_id,p.version,p.enforcement_enabled
      FROM active_budget_policy_pointers a JOIN budget_policy_versions p ON p.id=a.budget_policy_version_id WHERE a.environment='development'`);
    const activePolicy = pointer.rows[0] ? { budgetPolicyVersionId: pointer.rows[0].budget_policy_version_id, version: pointer.rows[0].version, enforcementEnabled: pointer.rows[0].enforcement_enabled } : null;
    const rules = activePolicy ? await this.pool.query<RuleRow>("SELECT resource_pool,currency,period,warning_limit::text,hard_limit::text FROM budget_policy_rules WHERE budget_policy_version_id=$1 AND currency='CNY' ORDER BY resource_pool,period", [activePolicy.budgetPolicyVersionId]) : { rows: [] as RuleRow[] };
    const coverageRows = await this.pool.query<{ deployment_version_id: string; resource_pool: 'asr_api' | 'ocr_api'; currency: string | null; conversion_available: boolean }>(`SELECT v.id AS deployment_version_id,
      CASE WHEN d.capability='asr' THEN 'asr_api' ELSE 'ocr_api' END AS resource_pool,
      v.billing_snapshot->>'currency' AS currency,
      CASE WHEN v.billing_snapshot->>'currency'='CNY' THEN TRUE ELSE EXISTS (
        SELECT 1 FROM cost_conversion_snapshots c WHERE c.source_currency=v.billing_snapshot->>'currency'
          AND c.target_currency='CNY' AND c.status='available' AND c.effective_at<=CURRENT_TIMESTAMP AND c.expires_at>CURRENT_TIMESTAMP
      ) END AS conversion_available
      FROM engine_deployment_versions v JOIN engine_deployments d ON d.id=v.deployment_id
      WHERE d.status='enabled' AND d.capability IN ('asr','screen_text') AND (v.billing_snapshot IS NULL OR v.billing_snapshot->>'billingClass'='metered')`);
    const reservationScopes = await this.pool.query<{ resource_pool: 'asr_api' | 'ocr_api'; currency: 'CNY' }>(`SELECT DISTINCT resource_pool,'CNY' AS currency FROM budget_reservations WHERE currency='CNY' AND status IN ('reserved','unknown','reconciliation_required','settled','overrun')`);
    const meteredDeploymentCoverage = coverageRows.rows.map((row) => {
      const hasCnyRule = Boolean(activePolicy && rules.rows.some((rule) => rule.resource_pool === row.resource_pool));
      return { deploymentVersionId: row.deployment_version_id, resourcePool: row.resource_pool, currency: row.currency, covered: Boolean(row.currency && row.conversion_available && hasCnyRule) };
    });
    const hardBlocks: string[] = [];
    const runtimeBlockedScopes: string[] = [];
    const runtimeWarningScopes: string[] = [];
    if (activePolicy?.enforcementEnabled && rules.rows.length === 0) hardBlocks.push('missing_currency_rule');
    const scopes: Array<Record<string, unknown>> = [];
    for (const [index, coverage] of meteredDeploymentCoverage.entries()) if (!coverage.covered) {
      const source = coverageRows.rows[index]!;
      const hasCnyRule = Boolean(activePolicy && rules.rows.some((rule) => rule.resource_pool === coverage.resourcePool));
      if (activePolicy?.enforcementEnabled && !hasCnyRule) hardBlocks.push(`missing_currency_rule:${coverage.resourcePool}:CNY`);
      if (!source.currency || !source.conversion_available) hardBlocks.push(`missing_conversion_snapshot:${coverage.resourcePool}:${source.currency ?? 'unknown'}`);
    }
    for (const rule of rules.rows) {
      const usage = await this.pool.query<{ settled: string; reserved: string; unknown: string; total: string; remaining: string; period_start: Date; next_reset: Date; blocked: boolean; warning: boolean }>(`SELECT
        COALESCE(SUM(CASE WHEN status IN ('settled','overrun') THEN COALESCE(final_amount_cny,final_amount,0) ELSE 0 END),0)::text AS settled,
        COALESCE(SUM(CASE WHEN status='reserved' THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0)::text AS reserved,
        COALESCE(SUM(CASE WHEN status IN ('unknown','reconciliation_required') THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0)::text AS unknown,
        (COALESCE(SUM(CASE WHEN status IN ('settled','overrun') THEN COALESCE(final_amount_cny,final_amount,0) ELSE 0 END),0)+COALESCE(SUM(CASE WHEN status IN ('reserved','unknown','reconciliation_required') THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0))::text AS total,
        GREATEST($4::numeric-(COALESCE(SUM(CASE WHEN status IN ('settled','overrun') THEN COALESCE(final_amount_cny,final_amount,0) ELSE 0 END),0)+COALESCE(SUM(CASE WHEN status IN ('reserved','unknown','reconciliation_required') THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0)),0)::text AS remaining,
        CASE WHEN $6='day' THEN date_trunc('day',$3::timestamptz) ELSE date_trunc('month',$3::timestamptz) END AS period_start,
        CASE WHEN $6='day' THEN date_trunc('day',$3::timestamptz)+interval '1 day' ELSE date_trunc('month',$3::timestamptz)+interval '1 month' END AS next_reset,
        ((COALESCE(SUM(CASE WHEN status IN ('settled','overrun') THEN COALESCE(final_amount_cny,final_amount,0) ELSE 0 END),0)+COALESCE(SUM(CASE WHEN status IN ('reserved','unknown','reconciliation_required') THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0)) > $4::numeric) AS blocked,
        ((COALESCE(SUM(CASE WHEN status IN ('settled','overrun') THEN COALESCE(final_amount_cny,final_amount,0) ELSE 0 END),0)+COALESCE(SUM(CASE WHEN status IN ('reserved','unknown','reconciliation_required') THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0)) >= $5::numeric) AS warning
        FROM budget_reservations WHERE resource_pool=$1 AND currency=$2 AND created_at >= CASE WHEN $6='day' THEN date_trunc('day',$3::timestamptz) ELSE date_trunc('month',$3::timestamptz) END
          AND status IN ('reserved','unknown','reconciliation_required','settled','overrun')`, [rule.resource_pool, rule.currency, databaseNow, rule.hard_limit, rule.warning_limit, rule.period]);
      const row = usage.rows[0]!;
      const status = activePolicy?.enforcementEnabled
        ? row.blocked ? 'blocked' : row.warning ? 'warning' : 'ok'
        : row.blocked ? 'unblocked' : row.warning ? 'warning' : 'ok';
      if (activePolicy?.enforcementEnabled && row.blocked) runtimeBlockedScopes.push(`${rule.resource_pool}:${rule.currency}:${rule.period}`);
      if (row.warning) runtimeWarningScopes.push(`${rule.resource_pool}:${rule.currency}:${rule.period}`);
      scopes.push({ resourcePool: rule.resource_pool, currency: rule.currency, period: rule.period, settledAmount: row.settled, reservedAmount: row.reserved, unknownAmount: row.unknown, totalAmount: row.total, warningLimit: rule.warning_limit, hardLimit: rule.hard_limit, remaining: row.remaining, status, periodStart: row.period_start.toISOString(), nextResetAt: row.next_reset.toISOString() });
    }
    const scopeKeys = new Set(scopes.map((scope) => `${scope.resourcePool}:${scope.currency}:${scope.period}`));
    const missingSources = new Map<string, { resourcePool: 'asr_api' | 'ocr_api'; currency: string }>();
    for (const coverage of meteredDeploymentCoverage) if (!coverage.covered && !rules.rows.some((rule) => rule.resource_pool === coverage.resourcePool)) missingSources.set(`${coverage.resourcePool}:CNY`, { resourcePool: coverage.resourcePool, currency: 'CNY' });
    for (const reservation of reservationScopes.rows) {
      const covered = Boolean(activePolicy && rules.rows.some((rule) => rule.resource_pool === reservation.resource_pool && rule.currency === reservation.currency));
      if (!covered) missingSources.set(`${reservation.resource_pool}:${reservation.currency}`, { resourcePool: reservation.resource_pool, currency: reservation.currency });
    }
    for (const source of missingSources.values()) for (const period of ['day', 'month'] as const) {
      const key = `${source.resourcePool}:${source.currency}:${period}`;
      if (scopeKeys.has(key)) continue;
      scopeKeys.add(key);
      const currency = source.currency;
      const usage = await this.pool.query<{ settled: string; reserved: string; unknown: string; total: string; period_start: Date; next_reset: Date }>(`SELECT
        COALESCE(SUM(CASE WHEN status IN ('settled','overrun') THEN COALESCE(final_amount_cny,final_amount,0) ELSE 0 END),0)::text AS settled,
        COALESCE(SUM(CASE WHEN status='reserved' THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0)::text AS reserved,
        COALESCE(SUM(CASE WHEN status IN ('unknown','reconciliation_required') THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0)::text AS unknown,
        (COALESCE(SUM(CASE WHEN status IN ('settled','overrun') THEN COALESCE(final_amount_cny,final_amount,0) ELSE 0 END),0)+COALESCE(SUM(CASE WHEN status IN ('reserved','unknown','reconciliation_required') THEN COALESCE(maximum_amount_cny,maximum_amount) ELSE 0 END),0))::text AS total,
        CASE WHEN $3='day' THEN date_trunc('day',$4::timestamptz) ELSE date_trunc('month',$4::timestamptz) END AS period_start,
        CASE WHEN $3='day' THEN date_trunc('day',$4::timestamptz)+interval '1 day' ELSE date_trunc('month',$4::timestamptz)+interval '1 month' END AS next_reset
        FROM budget_reservations WHERE resource_pool=$1 AND currency=$2 AND created_at >= CASE WHEN $3='day' THEN date_trunc('day',$4::timestamptz) ELSE date_trunc('month',$4::timestamptz) END
          AND status IN ('reserved','unknown','reconciliation_required','settled','overrun')`, [source.resourcePool, currency, period, databaseNow]);
      const row = usage.rows[0]!;
      scopes.push({ resourcePool: source.resourcePool, currency, period, settledAmount: row.settled, reservedAmount: row.reserved, unknownAmount: row.unknown, totalAmount: row.total, warningLimit: null, hardLimit: null, remaining: null, status: 'missing_rule', periodStart: row.period_start.toISOString(), nextResetAt: row.next_reset.toISOString() });
    }
    return { databaseNow: databaseNow.toISOString(), dataFreshness: databaseNow.toISOString(), activePolicy, noActivePolicy: !activePolicy, hardBlocks: [...new Set(hardBlocks)], runtimeBlockedScopes, runtimeWarningScopes, scopes, meteredDeploymentCoverage } as SystemControlBudgetOverview;
  }

  async listAudit(query: SystemControlBudgetAuditListQuery): Promise<SystemControlBudgetAuditList> {
    const { limit, offset } = parsePage(query); const values: unknown[] = []; const where = [`resource_type='budget_policy_version'`];
    if (query.budgetPolicyVersionId) { values.push(query.budgetPolicyVersionId); where.push(`resource_id=$${values.length}`); }
    if (query.action) { values.push(query.action); where.push(`action=$${values.length}`); }
    const sql = `FROM system_control_audit_events WHERE ${where.join(' AND ')}`; const total = await this.pool.query<{ count: string }>(`SELECT count(*)::text AS count ${sql}`, values); values.push(limit, offset);
    const rows = await this.pool.query<any>(`SELECT id,action,resource_id,actor_subject,request_id,result,created_at ${sql} ORDER BY created_at DESC,id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { items: rows.rows.map((row) => ({ eventId: row.id, action: row.action, budgetPolicyVersionId: row.resource_id, actorSubject: row.actor_subject, requestId: row.request_id, result: row.result, createdAt: row.created_at.toISOString() })), total: Number(total.rows[0]?.count ?? 0), limit, offset };
  }

  async admit(input: BudgetAdmissionInput): Promise<{ reservationId: string | null; budgetPolicyVersionId: string | null; quoteDigest: string; conversionSnapshotId: string | null; rateDigest: string | null; conversionEffectiveAt: Date | null; sourceCurrency: string; maximumAmountCny: string | null }> {
    const digest = stableBudgetDigest({ billingClass: input.quote.billingClass, currency: input.quote.currency, maximumAmount: input.quote.maximumAmount, billingUnit: input.quote.billingUnit, maximumQuantity: input.quote.maximumQuantity });
    if (digest !== input.quote.quoteDigest) throw budgetInvalid('SYSTEM_CONTROL_BUDGET_QUOTE_INVALID', '报价摘要不匹配。');
    return this.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['budget-admission:development']);
      const attemptTable = input.attemptKind === 'asr' ? 'asr_attempts' : 'screen_text_attempts';
      const attempt = await client.query<any>(input.attemptKind === 'asr'
        ? `SELECT a.id,j.project_id,a.deployment_version_id,a.status,a.budget_reservation_id,a.budget_quote_digest,a.budget_conversion_snapshot_id FROM asr_attempts a JOIN asr_jobs j ON j.id=a.job_id WHERE a.id=$1 FOR UPDATE OF a,j`
        : `SELECT a.id,j.project_id,a.deployment_version_id,a.status,a.budget_reservation_id,a.budget_quote_digest,a.budget_conversion_snapshot_id FROM screen_text_attempts a JOIN screen_text_jobs j ON j.id=a.job_id WHERE a.id=$1 FOR UPDATE OF a,j`, [input.attemptId]);
      const attemptRow = attempt.rows[0];
      if (!attemptRow || attemptRow.project_id !== input.projectId || attemptRow.deployment_version_id !== input.deploymentVersionId || !['leased', 'running'].includes(attemptRow.status)) throw budgetInvalid('SYSTEM_CONTROL_BUDGET_RESERVATION_NOT_FOUND', '预算 admission 必须绑定当前运行中的真实 Attempt。');
      const version = await client.query<{ billing_snapshot: Record<string, string> | null }>('SELECT billing_snapshot FROM engine_deployment_versions WHERE id=$1 FOR SHARE', [input.deploymentVersionId]);
      const billingSnapshot = version.rows[0]?.billing_snapshot;
      if (!billingSnapshot || !billingSnapshotMatches(billingSnapshot, {
        billingClass: input.quote.billingClass, currency: input.quote.currency,
        maximumAmount: input.quote.maximumAmount, billingUnit: input.quote.billingUnit,
        maximumQuantity: input.quote.maximumQuantity,
      })) throw budgetInvalid('SYSTEM_CONTROL_BUDGET_QUOTE_INVALID', '部署版本没有可验证且一致的计费快照。');
      if (attemptRow.budget_reservation_id) {
        const existing = await client.query<any>('SELECT id,budget_policy_version_id,quote_digest,deployment_version_id,resource_pool,source_currency AS currency,source_currency,conversion_snapshot_id,rate_digest,conversion_effective_at,maximum_amount_cny::text,original_maximum_amount::text,original_maximum_amount::text AS maximum_amount,maximum_quantity::text FROM budget_reservations WHERE id=$1 FOR UPDATE', [attemptRow.budget_reservation_id]);
        if (!existing.rows[0] || existing.rows[0].quote_digest !== input.quote.quoteDigest || existing.rows[0].deployment_version_id !== input.deploymentVersionId || existing.rows[0].resource_pool !== input.resourcePool || existing.rows[0].currency !== input.quote.currency || canonicalDecimal(existing.rows[0].maximum_amount) !== canonicalDecimal(input.quote.maximumAmount) || canonicalDecimal(existing.rows[0].maximum_quantity) !== canonicalDecimal(input.quote.maximumQuantity)) throw budgetConflict('SYSTEM_CONTROL_BUDGET_COMMAND_ID_REUSED', '同一 Attempt 已绑定另一报价，不能创建第二条预留。');
        const row = existing.rows[0];
        if (!row || (input.conversionSnapshotId ?? input.quote.conversionSnapshotId ?? row.conversion_snapshot_id) !== row.conversion_snapshot_id) throw budgetConflict('SYSTEM_CONTROL_BUDGET_COMMAND_ID_REUSED', '同一 Attempt 已固定不同换算快照，不能创建第二条预留。');
        return { reservationId: row.id, budgetPolicyVersionId: row.budget_policy_version_id, quoteDigest: row.quote_digest, conversionSnapshotId: row.conversion_snapshot_id, rateDigest: row.rate_digest, conversionEffectiveAt: row.conversion_effective_at, sourceCurrency: row.currency, maximumAmountCny: row.maximum_amount_cny };
      }
      if (attemptRow.budget_quote_digest && attemptRow.budget_quote_digest !== input.quote.quoteDigest) throw budgetConflict('SYSTEM_CONTROL_BUDGET_COMMAND_ID_REUSED', '同一 Attempt 已绑定另一报价，不能重放不同报价。');
      if (input.quote.billingClass === 'unmetered_local') {
        const updated = await client.query(`UPDATE ${attemptTable} SET budget_policy_version_id=NULL,budget_reservation_id=NULL,budget_quote_digest=$2,budget_conversion_snapshot_id=NULL,budget_rate_digest=NULL,budget_conversion_effective_at=NULL,budget_maximum_amount_cny=0 WHERE id=$1 AND budget_reservation_id IS NULL`, [input.attemptId, input.quote.quoteDigest]);
        if (updated.rowCount !== 1) throw budgetConflict('SYSTEM_CONTROL_BUDGET_COMMAND_ID_REUSED', 'Attempt 已被另一 admission 占用，当前事务已回滚。');
        return { reservationId: null, budgetPolicyVersionId: null, quoteDigest: input.quote.quoteDigest, conversionSnapshotId: null, rateDigest: null, conversionEffectiveAt: null, sourceCurrency: input.quote.currency, maximumAmountCny: '0' };
      }
      let amount = decimal(input.quote.maximumAmount, 'maximumAmount'); const originalAmount = amount; const quantity = decimal(input.quote.maximumQuantity, 'maximumQuantity');
      const preflightPointer = await client.query<{ budget_policy_version_id: string; enforcement_enabled: boolean }>(`SELECT p.id AS budget_policy_version_id,p.enforcement_enabled
        FROM active_budget_policy_pointers a JOIN budget_policy_versions p ON p.id=a.budget_policy_version_id
        WHERE a.environment='development' FOR UPDATE OF a`);
      const conversion = await this.costConversion.resolveForAdmission(client, input.quote.currency, input.conversionSnapshotId ?? input.quote.conversionSnapshotId);
      const amountCny = await this.costConversion.convert(client, conversion, amount);
      amount = amountCny;
      const policyId = preflightPointer.rows[0]?.budget_policy_version_id ?? null;
      const enforcementEnabled = preflightPointer.rows[0]?.enforcement_enabled ?? false;
      const rules = policyId
        ? await client.query<RuleRow>(`SELECT resource_pool,'CNY' AS currency,period,warning_limit::text,hard_limit::text FROM budget_policy_rules WHERE budget_policy_version_id=$1 AND resource_pool=$2 AND currency='CNY'`, [policyId, input.resourcePool])
        : { rows: [] as RuleRow[] };
      if (enforcementEnabled && !rules.rows.length) throw budgetInvalid('SYSTEM_CONTROL_BUDGET_RULE_MISSING', '已启用预算强制，但当前资源池没有预算规则。', 'configure_currency_rule');
      let warning = false;
      for (const rule of rules.rows) {
        const periodStart = rule.period === 'day' ? "date_trunc('day', CURRENT_TIMESTAMP)" : "date_trunc('month', CURRENT_TIMESTAMP)";
        const used = await client.query<{ used: string }>(`SELECT (COALESCE(SUM(CASE WHEN status IN ('settled','overrun') THEN COALESCE(final_amount_cny,0) ELSE 0 END),0)::numeric + COALESCE(SUM(CASE WHEN status IN ('reserved','unknown','reconciliation_required') THEN maximum_amount_cny ELSE 0 END),0)::numeric)::text AS used FROM budget_reservations WHERE resource_pool=$1 AND currency='CNY' AND created_at >= ${periodStart} AND status IN ('reserved','unknown','reconciliation_required','settled','overrun')`, [input.resourcePool]);
        const blocked = await client.query<{ blocked: boolean }>('SELECT ($1::numeric + $2::numeric) > $3::numeric AS blocked', [used.rows[0]?.used ?? '0', amount, rule.hard_limit]); if (enforcementEnabled && blocked.rows[0]?.blocked) throw budgetInvalid('SYSTEM_CONTROL_BUDGET_HARD_LIMIT', '预算 hard limit 阻止新的预留。', 'wait_for_budget_or_change_policy');
        const warningResult = await client.query<{ warning: boolean }>('SELECT ($1::numeric + $2::numeric) >= $3::numeric AS warning', [used.rows[0]?.used ?? '0', amountCny, rule.warning_limit]);
        warning ||= Boolean(warningResult.rows[0]?.warning);
      }
      const reservationId = randomUUID();
      await client.query(`INSERT INTO budget_reservations(id,attempt_id,attempt_kind,project_id,deployment_version_id,resource_pool,currency,source_currency,conversion_snapshot_id,rate_digest,conversion_effective_at,billing_unit,maximum_quantity,maximum_amount,original_maximum_amount,maximum_amount_cny,budget_policy_version_id,quote_digest,status,warning,reconciliation_status,request_id) VALUES($1,$2,$3,$4,$5,$6,'CNY',$7,$8,$9,$10,$11,$12::numeric,$13::numeric,$14::numeric,$13::numeric,$15,$16,'reserved',$17,'pending',$18)`, [reservationId, input.attemptId, input.attemptKind, input.projectId, input.deploymentVersionId, input.resourcePool, input.quote.currency, conversion.conversionSnapshotId, conversion.rateDigest, conversion.effectiveAt, input.quote.billingUnit, quantity, amount, originalAmount, policyId, input.quote.quoteDigest, warning, input.requestId]);
      const updated = await client.query(`UPDATE ${attemptTable} SET budget_policy_version_id=$2,budget_reservation_id=$3,budget_quote_digest=$4,budget_conversion_snapshot_id=$5,budget_rate_digest=$6,budget_conversion_effective_at=$7,budget_maximum_amount_cny=$8::numeric WHERE id=$1 AND budget_reservation_id IS NULL`, [input.attemptId, policyId, reservationId, input.quote.quoteDigest, conversion.conversionSnapshotId, conversion.rateDigest, conversion.effectiveAt, amount]);
      if (updated.rowCount !== 1) throw budgetConflict('SYSTEM_CONTROL_BUDGET_COMMAND_ID_REUSED', 'Attempt 已被另一 admission 占用，当前事务已回滚。');
      return { reservationId, budgetPolicyVersionId: policyId, quoteDigest: input.quote.quoteDigest, conversionSnapshotId: conversion.conversionSnapshotId, rateDigest: conversion.rateDigest, conversionEffectiveAt: conversion.effectiveAt, sourceCurrency: conversion.sourceCurrency, maximumAmountCny: amount };
    });
  }

  async settle(input: BudgetSettlementInput) {
    if (!input.reservationId) return;
    const finalQuantity = decimal(input.finalQuantity, 'finalQuantity'); const finalAmount = decimal(input.finalAmount, 'finalAmount');
    await this.transaction(async (client) => {
      const row = await client.query<any>('SELECT id,attempt_id,attempt_kind,maximum_amount_cny::text,source_currency,conversion_snapshot_id,rate_digest,status FROM budget_reservations WHERE id=$1 FOR UPDATE', [input.reservationId]); if (!row.rows[0] || ['released','settled','overrun'].includes(row.rows[0].status)) return;
      const reservation = row.rows[0];
      const conversion = await this.costConversion.resolveForSettlement(client, reservation.source_currency, reservation.conversion_snapshot_id, reservation.rate_digest);
      const finalAmountCny = await this.costConversion.convert(client, conversion, finalAmount);
      const usage = reservation.attempt_kind === 'asr'
        ? await client.query<{ estimated_amount: string | null }>('SELECT estimated_amount::text FROM asr_usage WHERE attempt_id=$1 FOR UPDATE', [reservation.attempt_id])
        : await client.query<{ estimated_amount: string | null }>(`SELECT usage->>'estimatedAmount' AS estimated_amount FROM screen_text_attempts WHERE id=$1 FOR UPDATE`, [reservation.attempt_id]);
      const originalEstimatedAmount = usage.rows[0]?.estimated_amount ?? null;
      const estimatedAmountCny = originalEstimatedAmount === null ? null : await this.costConversion.convert(client, conversion, originalEstimatedAmount);
      const isUnknown = input.reconciliationStatus !== 'final' || input.externalSideEffectPossible;
      const over = await client.query<{ overrun: boolean }>('SELECT $1::numeric > maximum_amount_cny AS overrun FROM budget_reservations WHERE id=$2', [finalAmountCny, input.reservationId]);
      const status = isUnknown ? (input.reconciliationStatus === 'unknown' ? 'unknown' : 'reconciliation_required') : (over.rows[0]?.overrun ? 'overrun' : 'settled');
      await client.query(`UPDATE budget_reservations SET provider_request_id=$2,final_quantity=$3::numeric,final_amount=$4::numeric,original_final_amount=$5::numeric,final_amount_cny=$4::numeric,reconciliation_status=$6::varchar,status=$7::varchar,updated_at=CURRENT_TIMESTAMP,settled_at=CASE WHEN $7::varchar IN ('unknown','reconciliation_required') THEN NULL ELSE CURRENT_TIMESTAMP END WHERE id=$1`, [input.reservationId, input.providerRequestId, finalQuantity, finalAmountCny, finalAmount, input.reconciliationStatus, status]);
      await client.query(`UPDATE ${reservation.attempt_kind === 'asr' ? 'asr_attempts' : 'screen_text_attempts'} SET budget_final_amount_cny=$2::numeric WHERE id=$1`, [reservation.attempt_id, finalAmountCny]);
      if (reservation.attempt_kind !== 'asr') {
        await client.query(`UPDATE screen_text_attempts SET usage = COALESCE(usage,'{}'::jsonb) || jsonb_build_object(
          'conversionSnapshotId',$2::text,'rateDigest',$3::text,'conversionEffectiveAt',$4::text,
          'originalCurrency',$5::text,'originalEstimatedAmount',$6::text,'originalFinalAmount',$7::text,
          'estimatedAmountCny',$8::text,'finalAmountCny',$9::text), budget_final_amount_cny=$10::numeric WHERE id=$1`,
        [reservation.attempt_id, conversion.conversionSnapshotId, conversion.rateDigest, conversion.effectiveAt?.toISOString() ?? null,
          conversion.sourceCurrency, originalEstimatedAmount, finalAmount, estimatedAmountCny, finalAmountCny, finalAmountCny]);
      }
    });
  }

  async releaseUnexecuted(reservationId: string, requestId: string) {
    await this.pool.query(`UPDATE budget_reservations br SET status='released',reconciliation_status='final',updated_at=CURRENT_TIMESTAMP,settled_at=CURRENT_TIMESTAMP,request_id=$2
      FROM (SELECT attempt_id,attempt_kind FROM budget_reservations WHERE id=$1 FOR UPDATE) r
      WHERE br.id=$1 AND br.status='reserved' AND br.provider_request_id IS NULL
        AND ((r.attempt_kind='asr' AND EXISTS (SELECT 1 FROM asr_attempts a WHERE a.id=r.attempt_id AND a.provider_request_id IS NULL AND a.external_side_effect_possible=FALSE))
          OR (r.attempt_kind='screen_text' AND EXISTS (SELECT 1 FROM screen_text_attempts a WHERE a.id=r.attempt_id AND a.provider_request_id IS NULL AND a.external_side_effect_possible=FALSE)))`, [reservationId, requestId]);
  }

  /** 有界、幂等地收口 finish 与 settle 之间的崩溃窗口。只释放明确未发生外部调用的终态。 */
  async recoverReservations(limit = 100) {
    const bounded = Math.min(Math.max(Math.trunc(limit), 1), 100);
    return this.transaction(async (client) => {
      const rows = await client.query<any>(`SELECT id,attempt_id,attempt_kind,status,maximum_amount_cny::text AS maximum_amount_cny,
          source_currency,conversion_snapshot_id,rate_digest
        FROM budget_reservations WHERE status IN ('reserved','reconciliation_required') ORDER BY created_at,id LIMIT $1 FOR UPDATE SKIP LOCKED`, [bounded]);
      let recovered = 0;
      for (const reservation of rows.rows) {
        const attempt = reservation.attempt_kind === 'asr'
          ? await client.query<any>(`SELECT a.status,a.provider_request_id,a.external_side_effect_possible,u.provider_request_id AS usage_provider_request_id,
              u.billing_quantity::text AS final_quantity,u.final_amount::text AS final_amount,u.reconciliation_status
              FROM asr_attempts a LEFT JOIN asr_usage u ON u.attempt_id=a.id WHERE a.id=$1 FOR UPDATE OF a`, [reservation.attempt_id])
          : await client.query<any>(`SELECT a.status,a.provider_request_id,a.external_side_effect_possible,
              a.usage->>'providerRequestId' AS usage_provider_request_id,a.usage->>'billingQuantity' AS final_quantity,
              a.usage->>'finalAmount' AS final_amount,a.usage->>'reconciliationStatus' AS reconciliation_status
              FROM screen_text_attempts a WHERE a.id=$1 FOR UPDATE`, [reservation.attempt_id]);
        const state = attempt.rows[0]; if (!state || ['leased','running'].includes(state.status)) continue;
        const providerRequestId = state.provider_request_id ?? state.usage_provider_request_id ?? null;
        const hasExternal = Boolean(providerRequestId || state.external_side_effect_possible);
        if (!hasExternal) {
          if (reservation.status !== 'reserved') continue;
          const released = await client.query(`UPDATE budget_reservations SET status='released',reconciliation_status='final',settled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status='reserved'`, [reservation.id]);
          recovered += released.rowCount === 1 ? 1 : 0;
          continue;
        }
        const finalAmount = state.final_amount;
        const finalQuantity = state.final_quantity;
        const reconciliation = state.reconciliation_status === 'final' && finalAmount !== null && finalQuantity !== null ? 'final' : 'unknown';
        if (reconciliation === 'final') {
          const conversion = await this.costConversion.resolveForSettlement(client, reservation.source_currency, reservation.conversion_snapshot_id, reservation.rate_digest);
          const finalAmountCny = await this.costConversion.convert(client, conversion, finalAmount);
          const settled = await client.query(`UPDATE budget_reservations SET provider_request_id=$2,final_quantity=$3::numeric,final_amount=$4::numeric,
            original_final_amount=$5::numeric,final_amount_cny=$4::numeric,
            reconciliation_status='final',status=CASE WHEN $4::numeric > maximum_amount_cny THEN 'overrun' ELSE 'settled' END,
            settled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status IN ('reserved','reconciliation_required')`, [reservation.id, providerRequestId, finalQuantity, finalAmountCny, finalAmount]);
          if (settled.rowCount === 1) {
            if (reservation.attempt_kind !== 'asr') {
              await client.query(`UPDATE screen_text_attempts SET usage = COALESCE(usage,'{}'::jsonb) || jsonb_build_object(
                'conversionSnapshotId',$2::text,'rateDigest',$3::text,'conversionEffectiveAt',$4::text,'originalCurrency',$5::text,
                'originalFinalAmount',$6::text,'finalAmountCny',$7::text) WHERE id=$1`, [reservation.attempt_id,
                conversion.conversionSnapshotId, conversion.rateDigest, conversion.effectiveAt?.toISOString() ?? null, conversion.sourceCurrency,
                finalAmount, finalAmountCny]);
            }
          }
          recovered += settled.rowCount === 1 ? 1 : 0;
        } else {
          const pending = await client.query(`UPDATE budget_reservations SET provider_request_id=COALESCE($2,provider_request_id),reconciliation_status='unknown',status='reconciliation_required',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status='reserved'`, [reservation.id, providerRequestId]);
          recovered += pending.rowCount === 1 ? 1 : 0;
        }
      }
      return recovered;
    });
  }

  async getReservation(id: string): Promise<SystemControlBudgetReservation> {
    const result = await this.pool.query<any>(`SELECT id,attempt_id,attempt_kind,project_id,deployment_version_id,resource_pool,currency,source_currency,conversion_snapshot_id,rate_digest,budget_policy_version_id,quote_digest,maximum_amount::text,maximum_quantity::text,maximum_amount_cny::text,original_maximum_amount::text,original_final_amount::text,status,warning,created_at,settled_at FROM budget_reservations WHERE id=$1`, [id]);
    const row = result.rows[0]; if (!row) throw budgetNotFound('预算预留不存在。');
    return {
      reservationId: row.id, attemptId: row.attempt_id, attemptKind: row.attempt_kind,
      projectId: row.project_id, deploymentVersionId: row.deployment_version_id,
      resourcePool: row.resource_pool, currency: row.currency,
      budgetPolicyVersionId: row.budget_policy_version_id, quoteDigest: row.quote_digest,
      maximumAmount: canonicalDecimal(row.maximum_amount), maximumQuantity: canonicalDecimal(row.maximum_quantity),
      status: row.status, warning: row.warning, createdAt: row.created_at.toISOString(),
      settledAt: row.settled_at?.toISOString() ?? null,
      ...(row.source_currency ? { sourceCurrency: row.source_currency } : {}),
      ...(row.conversion_snapshot_id ? { conversionSnapshotId: row.conversion_snapshot_id } : {}),
      ...(row.rate_digest ? { rateDigest: row.rate_digest } : {}),
      ...(row.maximum_amount_cny ? { maximumAmountCny: canonicalDecimal(row.maximum_amount_cny) } : {}),
      ...(row.original_maximum_amount ? { originalMaximumAmount: canonicalDecimal(row.original_maximum_amount) } : {}),
      ...(row.original_final_amount ? { originalFinalAmount: canonicalDecimal(row.original_final_amount) } : {}),
    };
  }
}
