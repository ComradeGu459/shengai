import type {
  SystemControlRuntimeHealth,
  SystemControlRuntimeOverview,
  SystemControlRuntimeResource,
  SystemControlRuntimeResourceDescriptor,
  SystemControlRuntimeResourceList,
  SystemControlRuntimeResourcesQuery,
  SystemControlRuntimeTelemetry,
  SystemControlRuntimeThroughput,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';

export type RuntimeTelemetryProviderInput = Readonly<{
  environment: 'development';
  resourceIds: readonly string[];
  observedAt: Date;
}>;

export type RuntimeTelemetryObservation = Readonly<{
  runtimeResourceId: string;
  status: 'fresh' | 'partial' | 'unknown';
  observedAt?: Date | string | null;
  reasonCode?: string | null;
  cpuPercent?: number | null;
  gpuPercent?: number | null;
  memoryBytes?: number | null;
  storageBytes?: number | null;
  databaseConnections?: number | null;
  processCount?: number | null;
}>;

export interface RuntimeTelemetryProvider {
  listResources(input: Readonly<{ environment: 'development' }>): Promise<readonly SystemControlRuntimeResourceDescriptor[]>;
  collect(input: RuntimeTelemetryProviderInput): Promise<readonly RuntimeTelemetryObservation[]>;
}

type RuntimeFact = {
  capability: 'asr' | 'screen_text' | 'delivery' | null;
  execution_kind: string | null;
  queue_depth: string;
  running_count: string;
  completed_count: string;
  failed_count: string;
  reconciliation_required_count: string;
  throughput_completed_count: string;
  throughput_failed_count: string;
  throughput_reconciliation_required_count: string;
  lease_active_count: string;
  lease_owner_present_count: string;
  earliest_lease_expires_at: Date | null;
  updated_at: Date | null;
};

type RuntimeConfigurationFact = {
  workflow_stage: 'asr' | 'screen_text';
  pool_id: string;
  routing_version_id: string;
  deployment_version_id: string | null;
  deployment_status: 'enabled' | 'disabled' | null;
};

type RuntimeSnapshotRow = {
  database_now: Date;
  fact_rows: RuntimeFact[] | string;
  configuration_rows: RuntimeConfigurationFact[] | string;
};



const asCount = (value: unknown) => Math.max(0, Number.parseInt(String(value ?? '0'), 10) || 0);
const asJsonArray = <T>(value: T[] | string | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
};
const asDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};
const safeReason = (value: unknown) => {
  const code = String(value ?? '').trim();
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(code) ? code : 'TELEMETRY_UNAVAILABLE';
};
const boundedNumber = (value: unknown, min: number, max: number) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};
const boundedInteger = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
};

const emptyTelemetry = (status: SystemControlRuntimeTelemetry['status'], observedAt: Date | null, reasonCode: string | null): SystemControlRuntimeTelemetry => ({
  status, observedAt: observedAt?.toISOString() ?? null, reasonCode,
  cpuPercent: null, gpuPercent: null, memoryBytes: null, storageBytes: null,
  databaseConnections: null, processCount: null,
});

const healthFor = (fact: RuntimeFact | null): SystemControlRuntimeHealth => {
  if (!fact) return 'empty';
  if (asCount(fact.failed_count) > 0) return 'failed';
  if (asCount(fact.reconciliation_required_count) > 0) return 'degraded';
  return 'healthy';
};

const configurationFor = (
  descriptor: SystemControlRuntimeResourceDescriptor,
  facts: readonly RuntimeConfigurationFact[],
): SystemControlRuntimeResource['configuration'] => {
  if (!descriptor.routingScope) return { status: 'not_configured', version: null, routingVersionId: null, deploymentVersionId: null, acceptingNewTasks: false };
  const config = facts.find((item) => item.workflow_stage === descriptor.routingScope?.workflowStage && item.pool_id === descriptor.routingScope?.poolId);
  if (!config) return { status: 'not_configured', version: null, routingVersionId: null, deploymentVersionId: null, acceptingNewTasks: false };
  if (!config.deployment_version_id || config.deployment_status !== 'enabled') {
    return { status: 'unknown', version: config.routing_version_id, routingVersionId: config.routing_version_id, deploymentVersionId: config.deployment_version_id, acceptingNewTasks: false };
  }
  return { status: 'configured', version: config.routing_version_id, routingVersionId: config.routing_version_id, deploymentVersionId: config.deployment_version_id, acceptingNewTasks: true };
};

const factFor = (descriptor: SystemControlRuntimeResourceDescriptor, facts: readonly RuntimeFact[]) => {
  const matching = facts.filter((fact) => fact.capability === descriptor.identity.capability);
  if (descriptor.identity.executionKind) return matching.find((fact) => fact.execution_kind === descriptor.identity.executionKind) ?? null;
  return matching.length === 1 ? matching[0] ?? null : null;
};

const resourceFromDescriptor = (
  descriptor: SystemControlRuntimeResourceDescriptor,
  fact: RuntimeFact | null,
  configurations: readonly RuntimeConfigurationFact[],
  databaseNow: Date,
): SystemControlRuntimeResource => {
  const updatedAt = asDate(fact?.updated_at);
  return {
    runtimeResourceId: descriptor.runtimeResourceId,
    environment: descriptor.environment,
    kind: descriptor.kind,
    displayName: descriptor.displayName,
    health: healthFor(fact),
    source: 'postgresql',
    observedAt: updatedAt?.toISOString() ?? null,
    updatedAt: updatedAt?.toISOString() ?? null,
    identity: descriptor.identity,
    queueDepth: asCount(fact?.queue_depth),
    runningCount: asCount(fact?.running_count),
    completedCount: asCount(fact?.completed_count),
    failedCount: asCount(fact?.failed_count),
    reconciliationRequiredCount: asCount(fact?.reconciliation_required_count),
    throughput: {
      window: '24h',
      windowStartAt: new Date(databaseNow.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      completedCount: asCount(fact?.throughput_completed_count),
      failedCount: asCount(fact?.throughput_failed_count),
      reconciliationRequiredCount: asCount(fact?.throughput_reconciliation_required_count),
    },
    lease: {
      activeCount: asCount(fact?.lease_active_count),
      ownerPresentCount: asCount(fact?.lease_owner_present_count),
      earliestExpiryAt: asDate(fact?.earliest_lease_expires_at)?.toISOString() ?? null,
    },
    telemetry: emptyTelemetry('not_configured', null, null),
    configuration: configurationFor(descriptor, configurations),
  };
};

const parsePage = (query: SystemControlRuntimeResourcesQuery) => ({
  limit: Math.max(1, Math.min(100, Number.parseInt(query.limit ?? '20', 10) || 20)),
  offset: Math.max(0, Number.parseInt(query.offset ?? '0', 10) || 0),
});

const healthRank: Record<SystemControlRuntimeHealth, number> = {
  failed: 0, degraded: 1, unknown: 2, not_configured: 3, empty: 4, healthy: 5,
};

export class SystemControlRuntimeService {
  constructor(
    private readonly database: DatabasePool,
    private readonly provider?: RuntimeTelemetryProvider,
  ) {}

  private async loadResources(): Promise<{ resources: SystemControlRuntimeResource[]; databaseNow: Date }> {
    const result = await this.database.query<RuntimeSnapshotRow>(`
      WITH database_clock AS (SELECT CURRENT_TIMESTAMP AS database_now),
      job_facts AS (
        SELECT 'asr'::text AS capability, ed.execution_kind::text AS execution_kind, j.status::text,
          GREATEST(j.updated_at, COALESCE(a.completed_at, a.created_at)) AS observed_at,
          a.status::text AS attempt_status, a.lease_owner, a.lease_expires_at
        FROM asr_jobs j LEFT JOIN asr_attempts a ON a.id = j.current_attempt_id
          LEFT JOIN LATERAL (SELECT deployment_version_id FROM routing_policy_targets WHERE routing_version_id=j.routing_version_id AND pool_id='asr_api' ORDER BY priority LIMIT 1) route ON true
          LEFT JOIN engine_deployment_versions ev ON ev.id = COALESCE(a.deployment_version_id, route.deployment_version_id)
          LEFT JOIN engine_deployments ed ON ed.id = ev.deployment_id
        UNION ALL
        SELECT 'screen_text'::text, b.execution_kind, j.status::text,
          GREATEST(j.updated_at, COALESCE(a.completed_at, a.created_at)),
          a.status::text, a.lease_owner, a.lease_expires_at
        FROM screen_text_jobs j JOIN screen_text_batches b ON b.id = j.batch_id
          LEFT JOIN screen_text_attempts a ON a.id = j.current_attempt_id
        UNION ALL
        SELECT 'delivery'::text, 'self_hosted_worker'::text, j.status::text,
          GREATEST(j.updated_at, COALESCE(a.completed_at, a.created_at)),
          NULL::text, j.lease_owner, j.lease_expires_at
        FROM delivery_jobs j JOIN delivery_products p ON p.id = j.delivery_id
          LEFT JOIN LATERAL (SELECT completed_at, created_at FROM delivery_attempts WHERE delivery_id = j.delivery_id ORDER BY attempt_number DESC, id DESC LIMIT 1) a ON TRUE
      ),
      fact_rows AS (
        SELECT capability, execution_kind,
          COUNT(*) FILTER (WHERE status IN ('queued','not_started','preparing') AND (attempt_status IS NULL OR attempt_status NOT IN ('leased','running')))::text AS queue_depth,
          COUNT(*) FILTER (WHERE status IN ('leased','running','review_pending') OR attempt_status IN ('leased','running'))::text AS running_count,
          COUNT(*) FILTER (WHERE status IN ('completed','confirmed_empty','ready'))::text AS completed_count,
          COUNT(*) FILTER (WHERE status IN ('failed','generation_failed'))::text AS failed_count,
          COUNT(*) FILTER (WHERE status = 'reconciliation_required')::text AS reconciliation_required_count,
          COUNT(*) FILTER (WHERE status IN ('completed','confirmed_empty','ready') AND observed_at >= database_clock.database_now - interval '24 hours')::text AS throughput_completed_count,
          COUNT(*) FILTER (WHERE status IN ('failed','generation_failed') AND observed_at >= database_clock.database_now - interval '24 hours')::text AS throughput_failed_count,
          COUNT(*) FILTER (WHERE status = 'reconciliation_required' AND observed_at >= database_clock.database_now - interval '24 hours')::text AS throughput_reconciliation_required_count,
          COUNT(*) FILTER (WHERE attempt_status IN ('leased','running') AND lease_expires_at IS NOT NULL)::text AS lease_active_count,
          COUNT(*) FILTER (WHERE attempt_status IN ('leased','running') AND lease_owner IS NOT NULL)::text AS lease_owner_present_count,
          MIN(lease_expires_at) FILTER (WHERE attempt_status IN ('leased','running') AND lease_expires_at IS NOT NULL) AS earliest_lease_expires_at,
          MAX(observed_at) AS updated_at
        FROM job_facts CROSS JOIN database_clock GROUP BY capability, execution_kind, database_clock.database_now
      ),
      configuration_rows AS (
        SELECT r.workflow_stage, t.pool_id, a.routing_version_id,
          t.deployment_version_id,
          d.status AS deployment_status
        FROM active_control_plane_pointers a
        JOIN routing_policy_versions r ON r.id = a.routing_version_id
        JOIN routing_policy_targets t ON t.routing_version_id = r.id AND t.priority = 1
        LEFT JOIN engine_deployment_versions v ON v.id = t.deployment_version_id
        LEFT JOIN engine_deployments d ON d.id = v.deployment_id
        JOIN LATERAL (
          SELECT status FROM routing_policy_status_events e
          WHERE e.routing_version_id = r.id ORDER BY e.created_at DESC, e.id DESC LIMIT 1
        ) status_event ON status_event.status = 'active'
        WHERE a.environment = 'development'
      )
      SELECT clock.database_now,
        COALESCE((SELECT json_agg(f ORDER BY capability, execution_kind NULLS FIRST) FROM fact_rows f), '[]') AS fact_rows,
        COALESCE((SELECT json_agg(c ORDER BY workflow_stage, pool_id) FROM configuration_rows c), '[]') AS configuration_rows
      FROM database_clock clock
    `);
    const row = result.rows[0];
    if (!row) throw new Error('RUNTIME_SNAPSHOT_EMPTY');
    const databaseNow = asDate(row.database_now) ?? new Date();
    const facts = asJsonArray<RuntimeFact>(row.fact_rows);
    const configurations = asJsonArray<RuntimeConfigurationFact>(row.configuration_rows);
    const resources = (await this.loadDirectory()).map((descriptor) => resourceFromDescriptor(descriptor, factFor(descriptor, facts), configurations, databaseNow));
    return { resources, databaseNow };
  }

  private async loadDirectory(): Promise<SystemControlRuntimeResourceDescriptor[]> {
    if (!this.provider) return [];
    try {
      const descriptors = await this.provider.listResources({ environment: 'development' });
      const byId = new Map<string, SystemControlRuntimeResourceDescriptor>();
      for (const descriptor of descriptors) {
        if (!byId.has(descriptor.runtimeResourceId)) byId.set(descriptor.runtimeResourceId, descriptor);
      }
      return [...byId.values()];
    } catch {
      return [];
    }
  }

  private async attachTelemetry(resources: SystemControlRuntimeResource[], observedAt: Date) {
    if (!this.provider) return resources;
    let observations: readonly RuntimeTelemetryObservation[] = [];
    try {
      observations = await this.provider.collect({ environment: 'development', resourceIds: resources.map((resource) => resource.runtimeResourceId), observedAt });
    } catch {
      observations = resources.map((resource) => ({ runtimeResourceId: resource.runtimeResourceId, status: 'unknown' as const, reasonCode: 'PROVIDER_UNAVAILABLE' }));
    }
    const byId = new Map(observations.map((item) => [item.runtimeResourceId, item]));
    return resources.map((resource) => {
      const item = byId.get(resource.runtimeResourceId);
      if (!item) return { ...resource, telemetry: emptyTelemetry('unknown', null, 'TELEMETRY_MISSING') };
      const observed = asDate(item.observedAt) ?? observedAt;
      return {
        ...resource,
        telemetry: {
          status: item.status,
          observedAt: observed.toISOString(),
          reasonCode: item.reasonCode ? safeReason(item.reasonCode) : null,
          cpuPercent: boundedNumber(item.cpuPercent, 0, 100), gpuPercent: boundedNumber(item.gpuPercent, 0, 100),
          memoryBytes: boundedInteger(item.memoryBytes), storageBytes: boundedInteger(item.storageBytes),
          databaseConnections: boundedInteger(item.databaseConnections), processCount: boundedInteger(item.processCount),
        },
      };
    });
  }

  async getOverview(): Promise<SystemControlRuntimeOverview> {
    const loaded = await this.loadResources();
    const resources = await this.attachTelemetry(loaded.resources, loaded.databaseNow);
    const dataFreshness = loaded.databaseNow.toISOString();
    const totals = resources.reduce((summary, resource) => ({
      queueDepth: summary.queueDepth + resource.queueDepth,
      runningCount: summary.runningCount + resource.runningCount,
      completedCount: summary.completedCount + resource.completedCount,
      failedCount: summary.failedCount + resource.failedCount,
      reconciliationRequiredCount: summary.reconciliationRequiredCount + resource.reconciliationRequiredCount,
      activeLeaseCount: summary.activeLeaseCount + resource.lease.activeCount,
    }), { queueDepth: 0, runningCount: 0, completedCount: 0, failedCount: 0, reconciliationRequiredCount: 0, activeLeaseCount: 0 });
    const overallHealth: SystemControlRuntimeHealth = resources.some((resource) => resource.health === 'failed') ? 'failed'
      : resources.some((resource) => resource.health === 'degraded') ? 'degraded'
        : resources.some((resource) => resource.health === 'healthy') ? 'healthy'
          : resources.some((resource) => resource.health === 'unknown') ? 'unknown' : 'not_configured';
    return { environment: 'development', databaseNow: dataFreshness, dataFreshness, overallHealth, resources, totals };
  }

  async listResources(query: SystemControlRuntimeResourcesQuery): Promise<SystemControlRuntimeResourceList> {
    const loaded = await this.loadResources();
    let resources = await this.attachTelemetry(loaded.resources, loaded.databaseNow);
    if (query.kind) resources = resources.filter((resource) => resource.kind === query.kind);
    if (query.health) resources = resources.filter((resource) => resource.health === query.health);
    if (query.search?.trim()) {
      const needle = query.search.trim().toLocaleLowerCase();
      resources = resources.filter((resource) => `${resource.runtimeResourceId} ${resource.displayName}`.toLocaleLowerCase().includes(needle));
    }
    const sort = query.sort ?? 'display_asc';
    resources.sort((left, right) => {
      if (sort === 'health_asc') return healthRank[left.health] - healthRank[right.health] || left.runtimeResourceId.localeCompare(right.runtimeResourceId);
      if (sort === 'updated_desc') return (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '') || left.runtimeResourceId.localeCompare(right.runtimeResourceId);
      const result = left.displayName.localeCompare(right.displayName) || left.runtimeResourceId.localeCompare(right.runtimeResourceId);
      return sort === 'display_desc' ? -result : result;
    });
    const { limit, offset } = parsePage(query);
    return { items: resources.slice(offset, offset + limit), total: resources.length, limit, offset, databaseNow: loaded.databaseNow.toISOString(), dataFreshness: loaded.databaseNow.toISOString() };
  }

  async getResource(id: string): Promise<SystemControlRuntimeResource | null> {
    const loaded = await this.loadResources();
    const resources = await this.attachTelemetry(loaded.resources, loaded.databaseNow);
    return resources.find((resource) => resource.runtimeResourceId === id) ?? null;
  }
}
