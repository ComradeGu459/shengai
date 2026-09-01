import type {
  SystemControlAnomaly,
  SystemControlCost,
  SystemControlCurrencyUsage,
  SystemControlExecutionIdentity,
  SystemControlOverview,
  SystemControlResourcePool,
  SystemControlResourcePoolId,
  SystemControlTrendPoint,
  SystemControlCostTrendPoint,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';

type SummaryRow = {
  queue_depth: string;
  running_count: string;
  completed_count: string;
  failed_count: string;
  current_failed_count: string;
  reconciliation_count: string;
  throughput: string;
  error_count: string;
  lease_expired_count: string;
  has_fact: boolean;
  last_observed_at: Date | null;
};

type IdentityRow = {
  execution_kind: string | null;
  provider: string | null;
  adapter: string | null;
  model: string | null;
  deployment: string | null;
  job_count: string;
};

type TrendRow = {
  bucket_start: Date;
  bucket_end: Date;
  throughput: string;
  queue_depth: string | null;
  observed_count: string;
};

type CostRow = {
  execution_kind?: string | null;
  currency: string | null;
  estimated_amount: string | null;
  final_amount: string | null;
  pending_count: string;
  unknown_count: string;
  fact_count: string;
};

type CostTotalRow = {
  execution_kind?: string | null;
  pending_count: string;
  unknown_count: string;
  fact_count: string;
};

type CostTrendRow = CostRow & { bucket_start: Date; bucket_end: Date };

type PoolSnapshot = {
  id: SystemControlResourcePoolId;
  status: SystemControlResourcePool['status'];
  queueDepth: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
  reconciliationRequiredCount: number;
  throughput: number;
  errorCount: number;
  identities: SystemControlExecutionIdentity[];
  cost: SystemControlCost;
  telemetry: SystemControlResourcePool['telemetry'];
  configuration: SystemControlResourcePool['configuration'];
  lastObservedAt: string | null;
};

type DomainFacts = {
  pools: PoolSnapshot[];
  trends: TrendRow[];
  costTrends: CostTrendRow[];
  anomalies: SystemControlAnomaly[];
};

const ACTIVE_ASR = "'queued','leased','running','cancel_requested','reconciliation_required'";
const ACTIVE_SCREEN = "'not_started','queued','running','review_pending','cancel_requested','reconciliation_required'";

const asDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const asCount = (value: unknown) => Math.max(0, Number.parseInt(String(value ?? '0'), 10) || 0);

const asNullableString = (value: unknown) => value === null || value === undefined ? null : String(value);

const formatMoney = (value: string | null): string | null => {
  if (value === null) return null;
  const raw = value.trim();
  const negative = raw.startsWith('-');
  const unsigned = negative || raw.startsWith('+') ? raw.slice(1) : raw;
  const [integerPart, fractionPart = ''] = unsigned.split('.');
  const integer = ((integerPart ?? '').replace(/^0+(?=\d)/, '') || '0');
  const fraction = `${fractionPart}000000`.slice(0, 6);
  return `${negative ? '-' : ''}${integer}.${fraction}`;
};

const moneyUnits = (value: string): bigint => {
  const formatted = formatMoney(value) ?? '0.000000';
  return BigInt(formatted.replace('.', ''));
};

const addMoney = (left: string | null, right: string | null): string | null => {
  if (left === null) return formatMoney(right);
  if (right === null) return formatMoney(left);
  const sum = moneyUnits(left) + moneyUnits(right);
  const unsigned = sum.toString().padStart(7, '0');
  return `${unsigned.slice(0, -6)}.${unsigned.slice(-6)}`;
};

const emptyCost = (): SystemControlCost => ({ byCurrency: [], pendingCount: 0, unknownCount: 0 });

const costFromRows = (rows: CostRow[], total?: CostTotalRow, executionKind?: string): SystemControlCost => {
  const selectedRows = executionKind === undefined ? rows : rows.filter((row) => row.execution_kind === executionKind);
  const byCurrency: SystemControlCurrencyUsage[] = selectedRows
    .filter((row) => row.currency !== null)
    .sort((a, b) => String(a.currency).localeCompare(String(b.currency)))
    .map((row) => ({
      currency: String(row.currency),
      estimatedAmount: formatMoney(row.estimated_amount),
      finalAmount: formatMoney(row.final_amount),
      pendingCount: asCount(row.pending_count),
      unknownCount: asCount(row.unknown_count),
    }));
  return {
    byCurrency,
    pendingCount: asCount(total?.pending_count ?? selectedRows.reduce((sum, row) => sum + asCount(row.pending_count), 0)),
    unknownCount: asCount(total?.unknown_count ?? selectedRows.reduce((sum, row) => sum + asCount(row.unknown_count), 0)),
  };
};

const mergeCosts = (costs: SystemControlCost[]): SystemControlCost => {
  const grouped = new Map<string, SystemControlCurrencyUsage>();
  let pendingCount = 0;
  let unknownCount = 0;
  for (const cost of costs) {
    pendingCount += cost.pendingCount;
    unknownCount += cost.unknownCount;
    for (const currency of cost.byCurrency) {
      const prior = grouped.get(currency.currency);
      if (!prior) {
        grouped.set(currency.currency, { ...currency });
        continue;
      }
      prior.estimatedAmount = addMoney(prior.estimatedAmount, currency.estimatedAmount);
      prior.finalAmount = prior.pendingCount + prior.unknownCount + currency.pendingCount + currency.unknownCount === 0
        ? addMoney(prior.finalAmount, currency.finalAmount)
        : null;
      prior.pendingCount += currency.pendingCount;
      prior.unknownCount += currency.unknownCount;
    }
  }
  return { byCurrency: [...grouped.values()].sort((a, b) => a.currency.localeCompare(b.currency)), pendingCount, unknownCount };
};

const identityFromRows = (rows: IdentityRow[]): SystemControlExecutionIdentity[] => rows.map((row) => ({
  executionKind: asNullableString(row.execution_kind),
  provider: asNullableString(row.provider),
  adapter: asNullableString(row.adapter),
  model: asNullableString(row.model),
  deployment: asNullableString(row.deployment),
  jobCount: asCount(row.job_count),
}));

const statusFor = (row: SummaryRow): PoolSnapshot['status'] => {
  if (!row.has_fact) return 'empty';
  if (asCount(row.current_failed_count) > 0) return 'failed';
  if (asCount(row.reconciliation_count) > 0 || asCount(row.lease_expired_count) > 0) return 'degraded';
  return 'healthy';
};

const snapshotFromRows = (
  id: SystemControlResourcePoolId,
  summary: SummaryRow,
  identities: IdentityRow[],
  cost: SystemControlCost,
): PoolSnapshot => ({
  id,
  status: statusFor(summary),
  queueDepth: asCount(summary.queue_depth),
  runningCount: asCount(summary.running_count),
  completedCount: asCount(summary.completed_count),
  failedCount: asCount(summary.failed_count),
  reconciliationRequiredCount: asCount(summary.reconciliation_count),
  throughput: asCount(summary.throughput),
  errorCount: asCount(summary.error_count),
  identities: identityFromRows(identities),
  cost,
  telemetry: { status: 'unknown', cpuPercent: null, gpuPercent: null, memoryBytes: null, storageBytes: null },
  configuration: { status: 'not_configured', version: null, acceptingNewTasks: null },
  lastObservedAt: asDate(summary.last_observed_at)?.toISOString() ?? null,
});

const trendPoint = (row: TrendRow): SystemControlTrendPoint => ({
  bucketStart: row.bucket_start.toISOString(),
  bucketEnd: row.bucket_end.toISOString(),
  hasFact: asCount(row.throughput) > 0,
  value: asCount(row.throughput) > 0 ? asCount(row.throughput) : null,
});

const queueTrendPoint = (row: TrendRow): SystemControlTrendPoint => ({
  bucketStart: row.bucket_start.toISOString(),
  bucketEnd: row.bucket_end.toISOString(),
  hasFact: asCount(row.observed_count) > 0,
  value: asCount(row.observed_count) > 0 ? asCount(row.queue_depth) : null,
});

const costTrendPoint = (row: CostTrendRow, cost: SystemControlCost): SystemControlCostTrendPoint => ({
  bucketStart: row.bucket_start.toISOString(),
  bucketEnd: row.bucket_end.toISOString(),
  hasFact: asCount(row.fact_count) > 0,
  cost,
});

const safeReason = (code: string | null) => code && /^[A-Za-z0-9_.:-]{1,120}$/.test(code) ? code : 'REDACTED_FAILURE';

const anomalyFromRow = (row: {
  pool_id: SystemControlResourcePoolId;
  project_id: string;
  job_id: string;
  attempt_id: string | null;
  occurred_at: Date;
  kind: 'failed' | 'reconciliation_required' | 'lease_expired';
  error_code: string | null;
  request_id: string | null;
}): SystemControlAnomaly => ({
  id: `${row.pool_id}:${row.job_id}:${row.attempt_id ?? 'job'}:${row.kind}`,
  resourcePool: row.pool_id,
  severity: row.kind === 'failed' ? 'error' : 'warning',
  kind: row.kind,
  projectId: row.project_id,
  jobId: row.job_id,
  attemptId: row.attempt_id,
  occurredAt: row.occurred_at.toISOString(),
  reasonCode: row.kind === 'lease_expired' ? 'LEASE_EXPIRED' : safeReason(row.error_code),
  message: row.kind === 'lease_expired' ? '任务租约已过期，等待接管或恢复。' : '运行异常，详情已脱敏。',
  requestId: row.request_id,
});

const mergeTrendRows = (rows: TrendRow[]): TrendRow[] => {
  const grouped = new Map<string, TrendRow>();
  for (const row of rows) {
    const key = row.bucket_start.toISOString();
    const prior = grouped.get(key);
    if (!prior) {
      grouped.set(key, { ...row });
      continue;
    }
    prior.throughput = String(asCount(prior.throughput) + asCount(row.throughput));
    prior.observed_count = String(asCount(prior.observed_count) + asCount(row.observed_count));
    prior.queue_depth = String(asCount(prior.queue_depth) + asCount(row.queue_depth));
  }
  return [...grouped.values()].sort((a, b) => a.bucket_start.getTime() - b.bucket_start.getTime());
};

const costTrendKey = (row: CostTrendRow) => row.bucket_start.toISOString();

const mergeCostTrends = (rows: CostTrendRow[]): CostTrendRow[] => {
  const grouped = new Map<string, CostTrendRow>();
  for (const row of rows) {
    const key = costTrendKey(row);
    const prior = grouped.get(key);
    if (!prior) {
      grouped.set(key, {
        bucket_start: row.bucket_start,
        bucket_end: row.bucket_end,
        currency: null,
        estimated_amount: null,
        final_amount: null,
        pending_count: '0',
        unknown_count: '0',
        fact_count: row.fact_count,
      });
      continue;
    }
    prior.fact_count = String(asCount(prior.fact_count) + asCount(row.fact_count));
  }
  return [...grouped.values()].map((bucket) => ({
    bucket_start: bucket.bucket_start,
    bucket_end: bucket.bucket_end,
    currency: null,
    estimated_amount: null,
    final_amount: null,
    pending_count: '0',
    unknown_count: '0',
    fact_count: bucket.fact_count,
  })).sort((a, b) => a.bucket_start.getTime() - b.bucket_start.getTime());
};

const COST_CTE_ASR = `
  WITH usage_facts AS (
    SELECT a.id AS attempt_id,
      COALESCE(u.created_at, a.completed_at, a.created_at) AS occurred_at,
      NULL::text AS execution_kind,
      u.currency, u.estimated_amount, u.final_amount, u.reconciliation_status,
      (u.attempt_id IS NOT NULL) AS has_usage
    FROM asr_attempts a
    LEFT JOIN asr_usage u ON u.attempt_id = a.id
    WHERE COALESCE(u.created_at, a.completed_at, a.created_at) >= $1
      AND COALESCE(u.created_at, a.completed_at, a.created_at) < $2
  )`;

const COST_CTE_SCREEN = `
  WITH usage_facts AS (
    SELECT a.id AS attempt_id,
      COALESCE(a.completed_at, a.created_at) AS occurred_at,
      a.execution_kind,
      a.usage->>'currency' AS currency,
      CASE WHEN a.usage->>'estimatedAmount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (a.usage->>'estimatedAmount')::numeric END AS estimated_amount,
      CASE WHEN a.usage->>'finalAmount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (a.usage->>'finalAmount')::numeric END AS final_amount,
      a.usage->>'reconciliationStatus' AS reconciliation_status,
      (a.usage IS NOT NULL) AS has_usage
    FROM screen_text_attempts a
    WHERE COALESCE(a.completed_at, a.created_at) >= $1
      AND COALESCE(a.completed_at, a.created_at) < $2
  )`;

const totalsSql = `
  SELECT execution_kind, COUNT(*) FILTER (WHERE reconciliation_status = 'pending')::text AS pending_count,
    COUNT(*) FILTER (WHERE NOT has_usage OR currency IS NULL OR reconciliation_status IS NULL
      OR reconciliation_status NOT IN ('pending','final'))::text AS unknown_count,
    COUNT(*)::text AS fact_count
  FROM usage_facts GROUP BY execution_kind`;

const byCurrencySql = `
  SELECT execution_kind, currency,
    round(SUM(estimated_amount), 6)::text AS estimated_amount,
    CASE WHEN COUNT(*) FILTER (WHERE reconciliation_status IS DISTINCT FROM 'final' OR final_amount IS NULL) = 0
      THEN round(SUM(final_amount), 6)::text ELSE NULL END AS final_amount,
    COUNT(*) FILTER (WHERE reconciliation_status = 'pending')::text AS pending_count,
    COUNT(*) FILTER (WHERE reconciliation_status IS NULL OR reconciliation_status NOT IN ('pending','final'))::text AS unknown_count,
    COUNT(*)::text AS fact_count
  FROM usage_facts
  WHERE currency IS NOT NULL
  GROUP BY execution_kind, currency
  ORDER BY execution_kind, currency`;

const trendsSql = (jobsCte: string, successStatuses: string) => `
  WITH buckets AS (
    SELECT bucket_start, bucket_start + interval '1 hour' AS bucket_end
    FROM generate_series(
      date_trunc('hour', $2::timestamptz) - interval '23 hours',
      date_trunc('hour', $2::timestamptz), interval '1 hour'
    ) AS bucket_start
  ), job_facts AS (${jobsCte})
  SELECT b.bucket_start, b.bucket_end,
    COUNT(*) FILTER (WHERE f.status IN (${successStatuses})
      AND f.terminal_at >= b.bucket_start AND f.terminal_at < b.bucket_end)::text AS throughput,
    COUNT(*) FILTER (WHERE f.created_at < b.bucket_end
      AND (f.terminal_at IS NULL OR f.terminal_at >= b.bucket_end))::text AS queue_depth,
    COUNT(*) FILTER (WHERE f.created_at < b.bucket_end)::text AS observed_count
  FROM buckets b
  LEFT JOIN job_facts f ON (f.current_flag OR f.created_at >= $1 OR f.terminal_at >= $1)
  GROUP BY b.bucket_start, b.bucket_end
  ORDER BY b.bucket_start`;

export class SystemControlReadRepository {
  constructor(private readonly database: DatabasePool) {}

  async getOverview(): Promise<SystemControlOverview> {
    const generatedAt = new Date();
    const windowEnd = generatedAt;
    const windowStart = new Date(generatedAt.getTime() - 24 * 60 * 60 * 1000);
    const [asr, screen, delivery, storage, processedProjectCount] = await Promise.all([
      this.loadAsr(windowStart, windowEnd),
      this.loadScreenText(windowStart, windowEnd),
      this.loadDeliveries(windowStart, windowEnd),
      this.loadAssetBytes(),
      this.loadProcessedProjectCount(windowStart, windowEnd),
    ]);
    const facts = [asr, screen, delivery];
    const pools = facts.flatMap((fact) => fact.pools);
    const trends = mergeTrendRows(facts.flatMap((fact) => fact.trends));
    const costTrends = mergeCostTrends(facts.flatMap((fact) => fact.costTrends));
    const cost = mergeCosts(pools.map((pool) => pool.cost));
    const hasFacts = pools.some((pool) => pool.status !== 'empty');
    const anomalies = facts.flatMap((fact) => fact.anomalies).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 50);
    const overallStatus: SystemControlOverview['overallStatus'] = pools.some((pool) => pool.status === 'failed')
      ? 'failed'
      : pools.some((pool) => pool.status === 'degraded') ? 'degraded' : hasFacts ? 'healthy' : 'empty';
    const throughput = trends.map(trendPoint);
    const queueDepth = trends.map(queueTrendPoint);
    const costTrend = costTrends.map((row) => costTrendPoint(row, mergeCosts(facts.flatMap((fact) => {
      const matching = fact.costTrends.filter((costRow) => costTrendKey(costRow) === costTrendKey(row));
      return matching.length ? [costFromRows(matching)] : [];
    }))));
    return {
      environment: 'development', window: '24h', generatedAt: generatedAt.toISOString(),
      freshness: {
        status: hasFacts ? 'fresh' : 'empty', observedAt: hasFacts ? generatedAt.toISOString() : null,
        windowStart: windowStart.toISOString(), windowEnd: windowEnd.toISOString(), timezone: 'UTC',
      },
      overallStatus,
      resourcePools: pools,
      metrics: {
        processedProjectCount,
        processedEpisodeCount: pools.filter((pool) => pool.id !== 'delivery_generation').reduce((sum, pool) => sum + pool.throughput, 0),
        runningCount: pools.reduce((sum, pool) => sum + pool.runningCount, 0),
        queuedCount: pools.reduce((sum, pool) => sum + pool.queueDepth, 0),
        failedCount: pools.reduce((sum, pool) => sum + pool.failedCount, 0),
        reconciliationRequiredCount: pools.reduce((sum, pool) => sum + pool.reconciliationRequiredCount, 0),
        cost,
        storage: { status: 'unknown', assetBytes: storage, objectStorageBytes: null, capacityBytes: null },
        budget: { status: 'not_configured', byCurrency: [] },
      },
      trends: { bucket: 'hour', throughput, queueDepth, cost: costTrend },
      anomalies,
      pendingConfiguration: { status: 'not_configured', items: [] },
      recentAudit: { status: 'not_configured', items: [] },
    };
  }

  private async loadAsr(start: Date, end: Date): Promise<DomainFacts> {
    const jobsCte = `
      SELECT j.project_id,j.id AS job_id,j.episode_number,j.status,j.reused_result,j.created_at,j.updated_at,
        b.provider,b.adapter,b.model,a.id AS attempt_id,a.status AS attempt_status,
        a.completed_at AS attempt_completed_at,a.lease_owner,a.lease_expires_at,a.provider_request_id,
        a.error_code,a.error_detail,CASE WHEN j.status IN (${ACTIVE_ASR}) THEN NULL ELSE COALESCE(a.completed_at,j.updated_at) END AS terminal_at,
        (j.status IN (${ACTIVE_ASR})) AS current_flag
      FROM asr_jobs j JOIN asr_batches b ON b.id=j.batch_id
      LEFT JOIN asr_attempts a ON a.id=j.current_attempt_id
      WHERE j.status IN (${ACTIVE_ASR}) OR j.updated_at >= $1 OR COALESCE(a.completed_at,j.updated_at) >= $1`;
    const [summaryResult, identityResult, trendResult, anomalyResult, costResult, costTotalsResult, costTrendResult] = await Promise.all([
      this.database.query<SummaryRow>(`WITH job_facts AS (${jobsCte})
        SELECT COUNT(*) FILTER (WHERE current_flag AND status='queued')::text AS queue_depth,
          COUNT(*) FILTER (WHERE current_flag AND status IN ('leased','running','cancel_requested'))::text AS running_count,
          COUNT(*) FILTER (WHERE status='completed' AND terminal_at >= $1 AND terminal_at < $2)::text AS completed_count,
          COUNT(*) FILTER (WHERE status='failed' AND terminal_at >= $1 AND terminal_at < $2)::text AS failed_count,
          COUNT(*) FILTER (WHERE current_flag AND (status='failed' OR attempt_status='failed'))::text AS current_failed_count,
          COUNT(*) FILTER (WHERE current_flag AND (status='reconciliation_required' OR attempt_status='reconciliation_required'))::text AS reconciliation_count,
          COUNT(*) FILTER (WHERE status='completed' AND terminal_at >= $1 AND terminal_at < $2 AND NOT reused_result)::text AS throughput,
          COUNT(*) FILTER (WHERE (status IN ('failed','reconciliation_required') OR attempt_status IN ('failed','reconciliation_required'))
            AND terminal_at >= $1 AND terminal_at < $2)::text AS error_count,
          COUNT(*) FILTER (WHERE current_flag AND attempt_status IN ('leased','running') AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP)::text AS lease_expired_count,
          COUNT(*) FILTER (WHERE current_flag OR created_at >= $1 OR terminal_at >= $1) > 0 AS has_fact,
          MAX(updated_at) FILTER (WHERE current_flag OR created_at >= $1 OR terminal_at >= $1) AS last_observed_at
        FROM job_facts`, [start, end]),
      this.database.query<IdentityRow>(`WITH job_facts AS (${jobsCte})
        SELECT NULL::text AS execution_kind, provider, adapter, model, NULL::text AS deployment, COUNT(*)::text AS job_count
        FROM job_facts WHERE current_flag OR created_at >= $1 OR terminal_at >= $1
        GROUP BY provider, adapter, model ORDER BY provider, adapter, model`, [start]),
      this.database.query<TrendRow>(trendsSql(jobsCte, "'completed'"), [start, end]),
      this.database.query<any>(`WITH job_facts AS (${jobsCte})
        SELECT 'asr_api'::text AS pool_id,project_id,job_id,attempt_id,
          CASE WHEN current_flag AND attempt_status IN ('leased','running') AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP THEN 'lease_expired'
            WHEN current_flag AND (status='reconciliation_required' OR attempt_status='reconciliation_required') THEN 'reconciliation_required' ELSE 'failed' END AS kind,
          CASE WHEN current_flag AND attempt_status IN ('leased','running') AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP THEN lease_expires_at ELSE COALESCE(attempt_completed_at, updated_at) END AS occurred_at,
          error_code,provider_request_id AS request_id
        FROM job_facts
        WHERE (current_flag AND attempt_status IN ('leased','running') AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP)
          OR (current_flag AND attempt_status='failed')
          OR (current_flag AND (status='reconciliation_required' OR attempt_status='reconciliation_required'))
        ORDER BY occurred_at DESC LIMIT 50`, [start]),
      this.database.query<CostRow>(`${COST_CTE_ASR} ${byCurrencySql}`, [start, end]),
      this.database.query<CostTotalRow>(`${COST_CTE_ASR} ${totalsSql}`, [start, end]),
      this.database.query<CostTrendRow>(`${COST_CTE_ASR}, buckets AS (
        SELECT bucket_start, bucket_start + interval '1 hour' AS bucket_end
        FROM generate_series(date_trunc('hour',$2::timestamptz)-interval '23 hours', date_trunc('hour',$2::timestamptz), interval '1 hour') AS bucket_start
      )
      SELECT b.bucket_start,b.bucket_end,u.execution_kind,u.currency,
        round(SUM(u.estimated_amount),6)::text AS estimated_amount,
        CASE WHEN COUNT(*) FILTER (WHERE u.reconciliation_status IS DISTINCT FROM 'final' OR u.final_amount IS NULL)=0 THEN round(SUM(u.final_amount),6)::text ELSE NULL END AS final_amount,
        COUNT(*) FILTER (WHERE u.reconciliation_status='pending')::text AS pending_count,
        COUNT(*) FILTER (WHERE NOT u.has_usage OR u.currency IS NULL OR u.reconciliation_status IS NULL OR u.reconciliation_status NOT IN ('pending','final'))::text AS unknown_count,
        COUNT(u.attempt_id)::text AS fact_count
      FROM buckets b LEFT JOIN usage_facts u ON u.occurred_at >= b.bucket_start AND u.occurred_at < b.bucket_end
      GROUP BY b.bucket_start,b.bucket_end,u.execution_kind,u.currency ORDER BY b.bucket_start,u.execution_kind,u.currency`, [start, end]),
    ]);
    const summary = summaryResult.rows[0] ?? {
      queue_depth: '0', running_count: '0', completed_count: '0', failed_count: '0', current_failed_count: '0', reconciliation_count: '0', throughput: '0', error_count: '0', lease_expired_count: '0', has_fact: false, last_observed_at: null,
    };
    const cost = costFromRows(costResult.rows, costTotalsResult.rows[0]);
    return {
      pools: [snapshotFromRows('asr_api', summary, identityResult.rows, cost)],
      trends: trendResult.rows,
      costTrends: costTrendResult.rows,
      anomalies: anomalyResult.rows.map((row) => anomalyFromRow({ ...row, occurred_at: asDate(row.occurred_at)! })),
    };
  }

  private async loadScreenText(start: Date, end: Date): Promise<DomainFacts> {
    const jobsCte = `
      SELECT j.project_id,j.id AS job_id,j.episode_number,j.status,j.created_at,j.updated_at,
        COALESCE(a.execution_kind,b.execution_kind) AS execution_kind,
        COALESCE(a.provider,b.provider) AS provider,COALESCE(a.adapter,b.adapter) AS adapter,
        COALESCE(a.model,b.model) AS model,COALESCE(a.deployment,b.deployment) AS deployment,
        a.id AS attempt_id,a.status AS attempt_status,a.completed_at AS attempt_completed_at,
        a.lease_owner,a.lease_expires_at,a.provider_request_id,a.error_code,a.error_detail,
        CASE WHEN j.status IN (${ACTIVE_SCREEN}) THEN NULL ELSE COALESCE(a.completed_at,j.updated_at) END AS terminal_at,
        (j.status IN (${ACTIVE_SCREEN})) AS current_flag
      FROM screen_text_jobs j JOIN screen_text_batches b ON b.id=j.batch_id
      LEFT JOIN screen_text_attempts a ON a.id=j.current_attempt_id
      WHERE j.status IN (${ACTIVE_SCREEN}) OR j.updated_at >= $1 OR COALESCE(a.completed_at,j.updated_at) >= $1`;
    const [summaryResult, identityResult, trendResult, anomalyResult, costResult, costTotalsResult, costTrendResult] = await Promise.all([
      this.database.query<any>(`WITH job_facts AS (${jobsCte})
        SELECT execution_kind,
          COUNT(*) FILTER (WHERE current_flag AND status IN ('not_started','queued'))::text AS queue_depth,
          COUNT(*) FILTER (WHERE current_flag AND status IN ('running','cancel_requested'))::text AS running_count,
          COUNT(*) FILTER (WHERE status IN ('completed','confirmed_empty') AND terminal_at >= $1 AND terminal_at < $2)::text AS completed_count,
          COUNT(*) FILTER (WHERE status='failed' AND terminal_at >= $1 AND terminal_at < $2)::text AS failed_count,
          COUNT(*) FILTER (WHERE current_flag AND status <> 'review_pending' AND (status='failed' OR attempt_status='failed'))::text AS current_failed_count,
          COUNT(*) FILTER (WHERE current_flag AND (status='reconciliation_required' OR attempt_status='reconciliation_required'))::text AS reconciliation_count,
          COUNT(*) FILTER (WHERE status IN ('completed','confirmed_empty') AND terminal_at >= $1 AND terminal_at < $2)::text AS throughput,
          COUNT(*) FILTER (WHERE (status IN ('failed','reconciliation_required') OR attempt_status IN ('failed','reconciliation_required')) AND terminal_at >= $1 AND terminal_at < $2)::text AS error_count,
          COUNT(*) FILTER (WHERE current_flag AND attempt_status IN ('leased','running') AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP)::text AS lease_expired_count,
          COUNT(*) FILTER (WHERE current_flag OR created_at >= $1 OR terminal_at >= $1) > 0 AS has_fact,
          MAX(updated_at) FILTER (WHERE current_flag OR created_at >= $1 OR terminal_at >= $1) AS last_observed_at
        FROM job_facts GROUP BY execution_kind`, [start, end]),
      this.database.query<IdentityRow & { pool_id: string }>(`WITH job_facts AS (${jobsCte})
        SELECT CASE WHEN execution_kind='self_hosted_worker' THEN 'ocr_self_hosted_worker' ELSE 'ocr_api' END AS pool_id,
          execution_kind,provider,adapter,model,deployment,COUNT(*)::text AS job_count
        FROM job_facts WHERE current_flag OR created_at >= $1 OR terminal_at >= $1
        GROUP BY execution_kind,provider,adapter,model,deployment ORDER BY pool_id,provider,adapter,model`, [start]),
      this.database.query<TrendRow & { execution_kind: string }>(`WITH job_facts AS (${jobsCte}), buckets AS (
        SELECT bucket_start, bucket_start + interval '1 hour' AS bucket_end
        FROM generate_series(date_trunc('hour',$2::timestamptz)-interval '23 hours', date_trunc('hour',$2::timestamptz), interval '1 hour') AS bucket_start
      )
      SELECT f.execution_kind,b.bucket_start,b.bucket_end,
        COUNT(*) FILTER (WHERE f.status IN ('completed','confirmed_empty') AND f.terminal_at >= b.bucket_start AND f.terminal_at < b.bucket_end)::text AS throughput,
        COUNT(*) FILTER (WHERE f.status <> 'review_pending' AND f.created_at < b.bucket_end AND (f.terminal_at IS NULL OR f.terminal_at >= b.bucket_end))::text AS queue_depth,
        COUNT(*) FILTER (WHERE f.created_at < b.bucket_end)::text AS observed_count
      FROM buckets b LEFT JOIN job_facts f ON (f.current_flag OR f.created_at >= $1 OR f.terminal_at >= $1)
      GROUP BY f.execution_kind,b.bucket_start,b.bucket_end ORDER BY b.bucket_start,f.execution_kind`, [start, end]),
      this.database.query<any>(`WITH job_facts AS (${jobsCte})
        SELECT CASE WHEN execution_kind='self_hosted_worker' THEN 'ocr_self_hosted_worker' ELSE 'ocr_api' END AS pool_id,
          project_id,job_id,attempt_id,
          CASE WHEN current_flag AND attempt_status IN ('leased','running') AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP THEN 'lease_expired'
            WHEN current_flag AND (status='reconciliation_required' OR attempt_status='reconciliation_required') THEN 'reconciliation_required' ELSE 'failed' END AS kind,
          CASE WHEN current_flag AND attempt_status IN ('leased','running') AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP THEN lease_expires_at ELSE COALESCE(attempt_completed_at, updated_at) END AS occurred_at,
          error_code,provider_request_id AS request_id
        FROM job_facts
        WHERE (current_flag AND attempt_status IN ('leased','running') AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP)
          OR (current_flag AND status <> 'review_pending' AND attempt_status='failed')
          OR (current_flag AND (status='reconciliation_required' OR attempt_status='reconciliation_required'))
        ORDER BY occurred_at DESC LIMIT 50`, [start]),
      this.database.query<CostRow>(`${COST_CTE_SCREEN} ${byCurrencySql}`, [start, end]),
      this.database.query<CostTotalRow>(`${COST_CTE_SCREEN} ${totalsSql}`, [start, end]),
      this.database.query<CostTrendRow>(`${COST_CTE_SCREEN}, buckets AS (
        SELECT bucket_start, bucket_start + interval '1 hour' AS bucket_end
        FROM generate_series(date_trunc('hour',$2::timestamptz)-interval '23 hours', date_trunc('hour',$2::timestamptz), interval '1 hour') AS bucket_start
      )
      SELECT b.bucket_start,b.bucket_end,u.execution_kind,u.currency,
        round(SUM(u.estimated_amount),6)::text AS estimated_amount,
        CASE WHEN COUNT(*) FILTER (WHERE u.reconciliation_status IS DISTINCT FROM 'final' OR u.final_amount IS NULL)=0 THEN round(SUM(u.final_amount),6)::text ELSE NULL END AS final_amount,
        COUNT(*) FILTER (WHERE u.reconciliation_status='pending')::text AS pending_count,
        COUNT(*) FILTER (WHERE NOT u.has_usage OR u.currency IS NULL OR u.reconciliation_status IS NULL OR u.reconciliation_status NOT IN ('pending','final'))::text AS unknown_count,
        COUNT(u.attempt_id)::text AS fact_count
      FROM buckets b LEFT JOIN usage_facts u ON u.occurred_at >= b.bucket_start AND u.occurred_at < b.bucket_end
      GROUP BY b.bucket_start,b.bucket_end,u.execution_kind,u.currency ORDER BY b.bucket_start,u.execution_kind,u.currency`, [start, end]),
    ]);
    const cost = costFromRows(costResult.rows, costTotalsResult.rows[0]);
    const pools: PoolSnapshot[] = [];
    for (const id of ['ocr_api', 'ocr_self_hosted_worker'] as const) {
      const executionKind = id === 'ocr_self_hosted_worker' ? 'self_hosted_worker' : 'cloud_api';
      const summary = summaryResult.rows.find((row) => row.execution_kind === executionKind) ?? {
        execution_kind: executionKind, queue_depth: '0', running_count: '0', completed_count: '0', failed_count: '0', current_failed_count: '0', reconciliation_count: '0', throughput: '0', error_count: '0', lease_expired_count: '0', has_fact: false, last_observed_at: null,
      };
      const identities = identityResult.rows.filter((row) => row.pool_id === id);
      pools.push(snapshotFromRows(id, summary, identities, costFromRows(
        costResult.rows,
        costTotalsResult.rows.find((row) => row.execution_kind === executionKind),
        executionKind,
      )));
    }
    return {
      pools,
      trends: trendResult.rows.map((row) => row as TrendRow),
      costTrends: costTrendResult.rows,
      anomalies: anomalyResult.rows.map((row) => anomalyFromRow({ ...row, occurred_at: asDate(row.occurred_at)! })),
    };
  }

  private async loadDeliveries(start: Date, end: Date): Promise<DomainFacts> {
    const jobsCte = `
      SELECT product.project_id,product.id AS job_id,product.status,product.created_at,product.updated_at,
        job.lease_owner,job.lease_expires_at,attempt.id AS attempt_id,attempt.status AS attempt_status,
        attempt.completed_at AS attempt_completed_at,attempt.request_id,attempt.error_code,attempt.error_detail,
        CASE WHEN product.status='preparing' THEN NULL ELSE COALESCE(attempt.completed_at,product.updated_at) END AS terminal_at,
        (product.status='preparing') AS current_flag
      FROM delivery_products product JOIN delivery_jobs job ON job.delivery_id=product.id
      LEFT JOIN LATERAL (SELECT * FROM delivery_attempts WHERE delivery_id=product.id ORDER BY attempt_number DESC LIMIT 1) attempt ON true
      WHERE product.status='preparing' OR product.updated_at >= $1 OR COALESCE(attempt.completed_at,product.updated_at) >= $1`;
    const [summaryResult, trendResult, anomalyResult, costTrendResult] = await Promise.all([
      this.database.query<SummaryRow>(`WITH job_facts AS (${jobsCte})
        SELECT COUNT(*) FILTER (WHERE current_flag AND lease_owner IS NULL)::text AS queue_depth,
          COUNT(*) FILTER (WHERE current_flag AND lease_owner IS NOT NULL)::text AS running_count,
          COUNT(*) FILTER (WHERE status='ready' AND terminal_at >= $1 AND terminal_at < $2)::text AS completed_count,
          COUNT(*) FILTER (WHERE status='generation_failed' AND terminal_at >= $1 AND terminal_at < $2)::text AS failed_count,
          COUNT(*) FILTER (WHERE current_flag AND attempt_status='generation_failed')::text AS current_failed_count,
          '0'::text AS reconciliation_count,
          COUNT(*) FILTER (WHERE status='ready' AND terminal_at >= $1 AND terminal_at < $2)::text AS throughput,
          COUNT(*) FILTER (WHERE status='generation_failed' AND terminal_at >= $1 AND terminal_at < $2)::text AS error_count,
          COUNT(*) FILTER (WHERE current_flag AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP)::text AS lease_expired_count,
          COUNT(*) FILTER (WHERE current_flag OR created_at >= $1 OR terminal_at >= $1) > 0 AS has_fact,
          MAX(updated_at) FILTER (WHERE current_flag OR created_at >= $1 OR terminal_at >= $1) AS last_observed_at
        FROM job_facts`, [start, end]),
      this.database.query<TrendRow>(trendsSql(jobsCte, "'ready'"), [start, end]),
      this.database.query<any>(`WITH job_facts AS (${jobsCte})
        SELECT 'delivery_generation'::text AS pool_id,project_id,job_id,attempt_id,
          CASE WHEN current_flag AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP THEN 'lease_expired' ELSE 'failed' END AS kind,
          CASE WHEN current_flag AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP THEN lease_expires_at ELSE COALESCE(attempt_completed_at, updated_at) END AS occurred_at,
          error_code,request_id
        FROM job_facts
        WHERE (current_flag AND lease_expires_at IS NOT NULL AND lease_expires_at < CURRENT_TIMESTAMP)
          OR (current_flag AND attempt_status='generation_failed')
        ORDER BY occurred_at DESC LIMIT 50`, [start]),
      this.database.query<CostTrendRow>(`WITH buckets AS (
        SELECT bucket_start, bucket_start + interval '1 hour' AS bucket_end
        FROM generate_series(date_trunc('hour',$1::timestamptz)-interval '23 hours', date_trunc('hour',$1::timestamptz), interval '1 hour') AS bucket_start
      ) SELECT b.bucket_start,b.bucket_end,NULL::text AS currency,NULL::text AS estimated_amount,NULL::text AS final_amount,
        '0'::text AS pending_count,'0'::text AS unknown_count,'0'::text AS fact_count FROM buckets b ORDER BY b.bucket_start`, [end]),
    ]);
    return {
      pools: [snapshotFromRows('delivery_generation', summaryResult.rows[0] ?? {
        queue_depth: '0', running_count: '0', completed_count: '0', failed_count: '0', current_failed_count: '0', reconciliation_count: '0', throughput: '0', error_count: '0', lease_expired_count: '0', has_fact: false, last_observed_at: null,
      }, [], emptyCost())],
      trends: trendResult.rows,
      costTrends: costTrendResult.rows,
      anomalies: anomalyResult.rows.map((row) => anomalyFromRow({ ...row, occurred_at: asDate(row.occurred_at)! })),
    };
  }

  private async loadAssetBytes() {
    const result = await this.database.query<{ bytes: string }>("SELECT COALESCE(SUM(size_bytes), 0)::text AS bytes FROM assets asset JOIN projects project ON project.id=asset.project_id WHERE project.lifecycle_status <> 'purged'");
    return Math.max(0, Number.parseInt(result.rows[0]?.bytes ?? '0', 10) || 0);
  }

  private async loadProcessedProjectCount(start: Date, end: Date) {
    const result = await this.database.query<{ count: string }>(`SELECT COUNT(DISTINCT project_id)::text AS count FROM (
      SELECT j.project_id
      FROM asr_jobs j LEFT JOIN asr_attempts a ON a.id=j.current_attempt_id
      WHERE j.status='completed' AND COALESCE(a.completed_at,j.updated_at) >= $1 AND COALESCE(a.completed_at,j.updated_at) < $2 AND NOT j.reused_result
      UNION
      SELECT j.project_id
      FROM screen_text_jobs j LEFT JOIN screen_text_attempts a ON a.id=j.current_attempt_id
      WHERE j.status IN ('completed','confirmed_empty') AND COALESCE(a.completed_at,j.updated_at) >= $1 AND COALESCE(a.completed_at,j.updated_at) < $2
      UNION
      SELECT product.project_id
      FROM delivery_products product JOIN delivery_jobs job ON job.delivery_id=product.id
      LEFT JOIN LATERAL (SELECT completed_at FROM delivery_attempts WHERE delivery_id=product.id ORDER BY attempt_number DESC LIMIT 1) attempt ON true
      WHERE job.status='ready' AND COALESCE(attempt.completed_at,product.updated_at) >= $1 AND COALESCE(attempt.completed_at,product.updated_at) < $2
    ) processed`, [start, end]);
    return asCount(result.rows[0]?.count);
  }
}
