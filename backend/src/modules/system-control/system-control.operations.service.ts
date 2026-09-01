import type {
  SystemControlOperationDetail,
  SystemControlOperationError,
  SystemControlOperationListItem,
  SystemControlOperationsList,
  SystemControlOperationsListQuery,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';

type OperationRow = {
  operation_id: string;
  environment: 'development';
  domain: 'asr' | 'screen_text' | 'delivery' | 'system_control' | 'upload' | 'terms';
  project_id: string | null;
  task_id: string | null;
  job_id: string | null;
  attempt_id: string | null;
  request_id: string | null;
  status: string;
  effective_updated_at: Date | string;
  amount_cny: string | null;
  reconciliation_status: 'pending' | 'final' | 'unknown' | 'reconciliation_required' | null;
  provider_request_id: string | null;
  engine_deployment_version_id: string | null;
  routing_version_id: string | null;
  budget_policy_version_id: string | null;
  conversion_snapshot_id: string | null;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  quality_summary: {
    status: string | null;
    cueCount: number | null;
    candidateCount: number | null;
    processingDurationMs: number | null;
  } | null;
  original_currency: string | null;
  original_amount: string | null;
  error_code: string | null;
  error_reason: string | null;
  retryable: boolean;
  reconciliation_required: boolean;
  route_digest: string | null;
  routing_target_id: string | null;
  target_priority: number | null;
  deployment_version_id: string | null;
  effect_class: 'completed' | 'external_not_accepted' | 'unauthorized' | 'external_unknown' | 'quality_rejected' | 'cancelled' | null;
  database_now: Date | string;
};

type OperationAttemptRow = {
  attempt_id: string;
  attempt_number: number;
  status: string;
  request_id: string | null;
  route_digest: string | null;
  routing_target_id: string | null;
  target_priority: number | null;
  deployment_version_id: string | null;
  effect_class: OperationRow['effect_class'];
  provider_request_id: string | null;
  external_not_accepted: boolean;
  external_side_effect_possible: boolean;
  error_code: string | null;
  created_at: Date | string;
  started_at: Date | string | null;
  completed_at: Date | string | null;
};

type RoutingAdvanceEventRow = {
  event_id: string;
  job_id: string;
  from_attempt_id: string;
  to_attempt_id: string | null;
  from_target_id: string;
  to_target_id: string;
  from_target_priority: number | null;
  to_target_priority: number | null;
  reason_code: string;
  provider_request_id: string | null;
  request_id: string;
  external_not_accepted: boolean;
  external_side_effect_possible: boolean;
  created_at: Date | string;
};

export class SystemControlOperationsError extends Error {
  constructor(
    readonly code: 'SYSTEM_CONTROL_OPERATIONS_INVALID_RANGE' | 'SYSTEM_CONTROL_OPERATION_NOT_FOUND',
    message: string,
    readonly statusCode: 400 | 404 = 400,
  ) {
    super(message);
    this.name = 'SystemControlOperationsError';
  }
}

const OPERATIONS_CTE = `
WITH database_clock AS (
  SELECT CURRENT_TIMESTAMP AS database_now
), operations AS (
  SELECT
    ('asr:' || a.id::text) AS operation_id,
    'development'::text AS environment,
    'asr'::text AS domain,
    j.project_id,
    j.id AS task_id,
    j.id AS job_id,
    a.id AS attempt_id,
    dispatch.request_id,
    a.status::text AS status,
    GREATEST(j.updated_at, j.created_at, COALESCE(a.completed_at, a.started_at, a.created_at)) AS effective_updated_at,
    COALESCE(u.final_amount_cny, u.estimated_amount_cny, a.budget_final_amount_cny, a.budget_maximum_amount_cny, br.final_amount_cny, br.maximum_amount_cny)::text AS amount_cny,
    CASE WHEN a.status::text = 'reconciliation_required' THEN 'reconciliation_required'::text
      ELSE COALESCE(u.reconciliation_status, br.reconciliation_status)::text END AS reconciliation_status,
    COALESCE(a.provider_request_id, u.provider_request_id) AS provider_request_id,
    a.deployment_version_id AS engine_deployment_version_id,
    COALESCE(a.routing_version_id, j.routing_version_id) AS routing_version_id,
    a.budget_policy_version_id,
    a.budget_conversion_snapshot_id AS conversion_snapshot_id,
    a.started_at,
    a.completed_at,
    jsonb_build_object(
      'status', r.quality_status::text,
      'cueCount', CASE WHEN r.id IS NULL THEN NULL ELSE (SELECT COUNT(*)::int FROM asr_cues c WHERE c.result_id = r.id) END,
      'candidateCount', NULL,
      'processingDurationMs', NULL
    ) AS quality_summary,
    COALESCE(u.original_currency, br.source_currency) AS original_currency,
    COALESCE(u.original_final_amount, u.original_estimated_amount, br.original_final_amount, br.original_maximum_amount)::text AS original_amount,
    CASE WHEN a.error_code IS NULL THEN NULL WHEN a.error_code ~ '^[A-Za-z0-9_.:-]{1,100}$' THEN a.error_code ELSE 'ASR_EXECUTION_FAILED' END AS error_code,
    CASE WHEN a.error_code IS NULL THEN NULL ELSE 'ASR 执行失败，详情已脱敏。' END AS error_reason,
    COALESCE(a.retryable, false) AS retryable,
     (a.status::text = 'reconciliation_required' OR COALESCE(u.reconciliation_status, br.reconciliation_status) IN ('unknown','reconciliation_required')) AS reconciliation_required,
     j.route_digest AS route_digest, a.routing_target_id AS routing_target_id,
     a.routing_target_priority AS target_priority, a.deployment_version_id AS deployment_version_id,
     a.effect_class AS effect_class
  FROM asr_attempts a
  JOIN asr_jobs j ON j.id = a.job_id
  LEFT JOIN asr_usage u ON u.attempt_id = a.id
  LEFT JOIN budget_reservations br ON br.id = a.budget_reservation_id
  LEFT JOIN asr_results r ON r.attempt_id = a.id
  LEFT JOIN LATERAL (
    SELECT dg.request_id
    FROM asr_dispatch_project_results dpr
    JOIN asr_dispatch_groups dg ON dg.id = dpr.dispatch_group_id
    WHERE dpr.batch_id = j.batch_id
    ORDER BY dpr.created_at DESC, dpr.id DESC
    LIMIT 1
  ) dispatch ON true

  UNION ALL

  SELECT
    ('asr:' || j.id::text), 'development'::text, 'asr'::text,
    j.project_id, j.id, j.id, NULL::uuid, dispatch.request_id, j.status::text,
    GREATEST(j.updated_at, j.created_at), NULL::text, NULL::text, NULL::text,
    route.deployment_version_id, j.routing_version_id, NULL::uuid, NULL::uuid,
    NULL::timestamptz, NULL::timestamptz, NULL::jsonb, NULL::text, NULL::text,
    NULL::text, NULL::text, false,
     (j.status::text = 'reconciliation_required'),
     j.route_digest, NULL::uuid, NULL::integer, j.deployment_version_id, NULL::varchar
  FROM asr_jobs j
  LEFT JOIN LATERAL (SELECT deployment_version_id FROM routing_policy_targets WHERE routing_version_id=j.routing_version_id AND pool_id='asr_api' ORDER BY priority LIMIT 1) route ON true
  LEFT JOIN LATERAL (
    SELECT dg.request_id
    FROM asr_dispatch_project_results dpr
    JOIN asr_dispatch_groups dg ON dg.id = dpr.dispatch_group_id
    WHERE dpr.batch_id = j.batch_id
    ORDER BY dpr.created_at DESC, dpr.id DESC
    LIMIT 1
  ) dispatch ON true
  WHERE NOT EXISTS (SELECT 1 FROM asr_attempts a0 WHERE a0.job_id = j.id)

  UNION ALL

  SELECT
    ('screen_text:' || a.id::text),
    'development'::text,
    'screen_text'::text,
    j.project_id,
    j.id,
    j.id,
    a.id,
    b.request_id,
    a.status::text,
    GREATEST(j.updated_at, j.created_at, COALESCE(a.completed_at, a.created_at)),
    COALESCE(br.final_amount_cny, br.maximum_amount_cny,
      CASE WHEN COALESCE(a.usage->>'finalAmountCny', a.usage->>'estimatedAmountCny', '') ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN COALESCE(a.usage->>'finalAmountCny', a.usage->>'estimatedAmountCny')::numeric END,
      a.budget_final_amount_cny, a.budget_maximum_amount_cny)::text,
    CASE WHEN a.status::text = 'reconciliation_required' THEN 'reconciliation_required'::text
      ELSE COALESCE(br.reconciliation_status::text, NULLIF(a.usage->>'reconciliationStatus', '')) END,
    a.provider_request_id,
    a.deployment_version_id,
    COALESCE(a.routing_version_id, j.routing_version_id),
    a.budget_policy_version_id,
    a.budget_conversion_snapshot_id,
    a.created_at,
    a.completed_at,
    jsonb_build_object(
      'status', CASE WHEN a.id IS NULL THEN NULL ELSE a.status::text END,
      'cueCount', NULL,
      'candidateCount', CASE WHEN COALESCE(a.stats->>'candidateCount', '') ~ '^[0-9]+$' THEN (a.stats->>'candidateCount')::int ELSE NULL END,
      'processingDurationMs', CASE WHEN COALESCE(a.stats->>'processingDurationMs', '') ~ '^[0-9]+$' THEN (a.stats->>'processingDurationMs')::int ELSE NULL END
    ),
    COALESCE(br.source_currency, NULLIF(a.usage->>'originalCurrency', '')),
    COALESCE(br.original_final_amount::text,
      CASE WHEN COALESCE(a.usage->>'originalFinalAmount', a.usage->>'originalEstimatedAmount', '') ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN COALESCE(a.usage->>'originalFinalAmount', a.usage->>'originalEstimatedAmount') END),
    CASE WHEN a.error_code IS NULL THEN NULL WHEN a.error_code ~ '^[A-Za-z0-9_.:-]{1,100}$' THEN a.error_code ELSE 'SCREEN_TEXT_EXECUTION_FAILED' END,
    CASE WHEN a.error_code IS NULL THEN NULL ELSE 'Screen text 执行失败，详情已脱敏。' END,
    COALESCE(a.retryable, false),
     (a.status::text = 'reconciliation_required' OR br.reconciliation_status IN ('unknown','reconciliation_required') OR a.usage->>'reconciliationStatus' IN ('unknown','reconciliation_required')),
     j.route_digest, a.routing_target_id, a.routing_target_priority, a.deployment_version_id, a.effect_class
  FROM screen_text_jobs j
  JOIN screen_text_batches b ON b.id = j.batch_id
  JOIN screen_text_attempts a ON a.job_id = j.id
  LEFT JOIN budget_reservations br ON br.id = a.budget_reservation_id

  UNION ALL

  SELECT
    ('screen_text:' || j.id::text), 'development'::text, 'screen_text'::text,
    j.project_id, j.id, j.id, NULL::uuid, b.request_id, j.status::text,
    GREATEST(j.updated_at, j.created_at), NULL::text, NULL::text, NULL::text,
    j.deployment_version_id, j.routing_version_id, NULL::uuid, NULL::uuid,
    NULL::timestamptz, NULL::timestamptz, NULL::jsonb, NULL::text, NULL::text,
    NULL::text, NULL::text, false,
     (j.status::text = 'reconciliation_required'),
     j.route_digest, NULL::uuid, NULL::integer, j.deployment_version_id, NULL::varchar
  FROM screen_text_jobs j
  JOIN screen_text_batches b ON b.id = j.batch_id
  WHERE NOT EXISTS (SELECT 1 FROM screen_text_attempts a0 WHERE a0.job_id = j.id)

  UNION ALL

  SELECT
    ('delivery:' || a.id::text),
    'development'::text,
    'delivery'::text,
    p.project_id,
    j.id,
    j.id,
    a.id,
    a.request_id,
    a.status::text,
    GREATEST(j.updated_at, j.created_at, p.updated_at, p.created_at, COALESCE(a.completed_at, a.started_at, a.created_at)),
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::uuid,
    NULL::uuid,
    NULL::uuid,
    NULL::uuid,
    a.started_at,
    a.completed_at,
    NULL::jsonb,
    NULL::text,
    NULL::text,
    CASE WHEN a.error_code IS NULL THEN NULL ELSE a.error_code END,
    CASE WHEN a.error_code IS NULL THEN NULL ELSE 'Delivery generation failed; details redacted.' END,
    false,
     (a.status::text = 'generation_failed'),
     NULL::varchar, NULL::uuid, NULL::integer, NULL::uuid, NULL::varchar
  FROM delivery_jobs j
  JOIN delivery_products p ON p.id = j.delivery_id
  JOIN delivery_attempts a ON a.delivery_id = j.delivery_id

  UNION ALL

  SELECT
    ('delivery:' || j.id::text), 'development'::text, 'delivery'::text,
    p.project_id, j.id, j.id, NULL::uuid, p.request_id, j.status::text,
    GREATEST(j.updated_at, j.created_at, p.updated_at, p.created_at), NULL::text, NULL::text, NULL::text,
    NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
    NULL::timestamptz, NULL::timestamptz, NULL::jsonb, NULL::text, NULL::text,
    CASE WHEN p.status::text = 'generation_failed' THEN 'DELIVERY_GENERATION_FAILED' ELSE NULL END,
    CASE WHEN p.status::text = 'generation_failed' THEN '交付生成失败，详情已脱敏。' ELSE NULL END,
     false, (j.status::text = 'generation_failed'),
     NULL::varchar, NULL::uuid, NULL::integer, NULL::uuid, NULL::varchar
  FROM delivery_jobs j
  JOIN delivery_products p ON p.id = j.delivery_id
  WHERE NOT EXISTS (SELECT 1 FROM delivery_attempts a0 WHERE a0.delivery_id = j.delivery_id)

  UNION ALL

  SELECT
    ('system_control:' || ta.id::text),
    'development'::text,
    'system_control'::text,
    NULL::uuid,
    t.id,
    NULL::uuid,
    ta.id,
    t.request_id,
    ta.status::text,
    GREATEST(t.updated_at, t.queued_at, COALESCE(ta.completed_at, ta.started_at, ta.created_at)),
    NULL::text,
    CASE WHEN t.status::text = 'unknown' THEN 'unknown' ELSE NULL END,
    NULL::text,
    t.deployment_version_id,
    NULL::uuid,
    NULL::uuid,
    NULL::uuid,
    ta.started_at,
    ta.completed_at,
    NULL::jsonb,
    NULL::text,
    NULL::text,
    CASE WHEN ta.reason_code IS NULL THEN NULL WHEN ta.reason_code ~ '^[A-Za-z0-9_.:-]{1,80}$' THEN ta.reason_code ELSE 'CONNECTION_TEST_FAILED' END,
    CASE WHEN ta.reason_code IS NULL THEN NULL ELSE '连接测试结果已脱敏。' END,
    false,
     (ta.status::text = 'unknown'),
     NULL::varchar, NULL::uuid, NULL::integer, NULL::uuid, NULL::varchar
  FROM connection_test_runs t
  JOIN connection_test_attempts ta ON ta.test_run_id = t.id

  UNION ALL

  SELECT
    ('system_control:' || t.id::text), 'development'::text, 'system_control'::text,
    NULL::uuid, t.id, NULL::uuid, NULL::uuid, t.request_id, t.status::text,
    GREATEST(t.updated_at, t.queued_at, COALESCE(t.completed_at, t.started_at, t.queued_at)),
    NULL::text, CASE WHEN t.status::text = 'unknown' THEN 'unknown' ELSE NULL END, NULL::text,
    t.deployment_version_id, NULL::uuid, NULL::uuid, NULL::uuid,
    t.started_at, t.completed_at, NULL::jsonb, NULL::text, NULL::text,
    CASE WHEN t.reason_code IS NULL THEN NULL WHEN t.reason_code ~ '^[A-Za-z0-9_.:-]{1,80}$' THEN t.reason_code ELSE 'CONNECTION_TEST_FAILED' END,
    CASE WHEN t.reason_code IS NULL THEN NULL ELSE '连接测试结果已脱敏。' END,
     false, (t.status::text = 'unknown'),
     NULL::varchar, NULL::uuid, NULL::integer, NULL::uuid, NULL::varchar
  FROM connection_test_runs t
  WHERE NOT EXISTS (SELECT 1 FROM connection_test_attempts ta0 WHERE ta0.test_run_id = t.id)

  UNION ALL

  SELECT
    ('upload:' || session.id::text),
    'development'::text,
    'upload'::text,
    session.project_id,
    session.id,
    job.id,
    NULL::uuid,
    command.request_id,
    CASE
      WHEN job.stage::text = 'reconciliation_required' THEN 'reconciliation_required'
      WHEN session.status::text = 'completed' OR job.status::text = 'completed' THEN 'completed'
      WHEN job.status::text = 'failed' THEN 'failed'
      WHEN job.status::text = 'retryable' THEN 'retryable'
      WHEN job.status::text = 'leased' THEN 'running'
      ELSE session.status::text
    END,
    GREATEST(session.updated_at, session.created_at, COALESCE(job.updated_at, job.created_at, session.created_at)),
    NULL::text,
    CASE WHEN job.stage::text = 'reconciliation_required' THEN 'reconciliation_required' ELSE NULL END,
    NULL::text,
    NULL::uuid,
    NULL::uuid,
    NULL::uuid,
    NULL::uuid,
    session.created_at,
    CASE WHEN session.status::text IN ('completed','failed','aborted','expired') THEN COALESCE(job.completed_at, session.updated_at) ELSE NULL END,
    NULL::jsonb,
    NULL::text,
    NULL::text,
    CASE
      WHEN COALESCE(job.last_error_code, session.error_code) IS NULL THEN NULL
      WHEN COALESCE(job.last_error_code, session.error_code) ~ '^[A-Za-z0-9_.:-]{1,100}$' THEN COALESCE(job.last_error_code, session.error_code)
      ELSE 'UPLOAD_EXECUTION_FAILED'
    END,
    CASE WHEN COALESCE(job.last_error_code, session.error_code) IS NULL THEN NULL ELSE '上传运行结果已脱敏。' END,
    COALESCE(job.status::text = 'retryable', false),
    COALESCE(job.stage::text = 'reconciliation_required', false),
    NULL::varchar,
    NULL::uuid,
    NULL::integer,
    NULL::uuid,
    CASE
      WHEN job.stage::text = 'reconciliation_required' THEN 'external_unknown'
      WHEN session.status::text = 'completed' THEN 'completed'
      WHEN session.status::text IN ('aborted','expired') OR job.status::text = 'cancelled' THEN 'cancelled'
      ELSE NULL
    END
  FROM upload_sessions session
  LEFT JOIN upload_completion_jobs job ON job.upload_session_id = session.id
  LEFT JOIN LATERAL (
    SELECT c.idempotency_key AS request_id
    FROM upload_commands c
    WHERE c.upload_session_id = session.id
      AND c.command_kind IN ('complete_upload', 'create_upload')
    ORDER BY CASE WHEN c.command_kind = 'complete_upload' THEN 0 ELSE 1 END, c.created_at DESC, c.idempotency_key
    LIMIT 1
  ) command ON TRUE

  UNION ALL

  SELECT
    ('terms:' || run.id::text),
    'development'::text,
    'terms'::text,
    run.project_id,
    run.id,
    NULL::uuid,
    NULL::uuid,
    run.request_id,
    run.status::text,
    COALESCE(run.completed_at, run.created_at),
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::uuid,
    NULL::uuid,
    NULL::uuid,
    NULL::uuid,
    run.created_at,
    run.completed_at,
    jsonb_build_object('status', run.status::text, 'cueCount', run.cue_count, 'candidateCount', run.candidate_count, 'processingDurationMs', NULL),
    NULL::text,
    NULL::text,
    CASE
      WHEN run.error_code IS NULL THEN NULL
      WHEN run.error_code ~ '^[A-Za-z0-9_.:-]{1,100}$' THEN run.error_code
      ELSE 'TERM_EXTRACTION_FAILED'
    END,
    CASE WHEN run.error_code IS NULL THEN NULL ELSE '术语提取结果已脱敏。' END,
    false,
    false,
    NULL::varchar,
    NULL::uuid,
    NULL::integer,
    NULL::uuid,
    CASE WHEN run.status::text = 'completed' THEN 'completed' ELSE NULL END
  FROM term_extraction_runs run
)
`;

const asDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const asIso = (value: Date | string | null | undefined) => asDate(value)?.toISOString() ?? null;

const asDuration = (startedAt: Date | string | null, completedAt: Date | string | null) => {
  const started = asDate(startedAt);
  const completed = asDate(completedAt);
  if (!started || !completed) return null;
  const duration = completed.getTime() - started.getTime();
  return duration >= 0 ? duration : null;
};

const parsePage = (query: SystemControlOperationsListQuery) => ({
  limit: query.limit ? Number(query.limit) : 20,
  offset: query.offset ? Number(query.offset) : 0,
});

const mapListItem = (row: OperationRow): SystemControlOperationListItem => ({
  operationId: row.operation_id,
  environment: row.environment,
  domain: row.domain,
  projectId: row.project_id,
  taskId: row.task_id,
  jobId: row.job_id,
  attemptId: row.attempt_id,
  requestId: row.request_id,
  status: row.status,
  effectiveUpdatedAt: asIso(row.effective_updated_at)!,
  amountCny: row.amount_cny,
  reconciliationStatus: row.reconciliation_status,
  routeDigest: row.route_digest,
  routingTargetId: row.routing_target_id,
  targetPriority: row.target_priority,
  deploymentVersionId: row.deployment_version_id,
  effectClass: row.effect_class,
});

const mapAttempt = (row: OperationAttemptRow) => ({
  attemptId: row.attempt_id,
  attemptNumber: row.attempt_number,
  status: row.status,
  requestId: row.request_id,
  routeDigest: row.route_digest,
  routingTargetId: row.routing_target_id,
  targetPriority: row.target_priority,
  deploymentVersionId: row.deployment_version_id,
  effectClass: row.effect_class,
  providerRequestId: row.provider_request_id,
  externalNotAccepted: row.external_not_accepted,
  externalSideEffectPossible: row.external_side_effect_possible,
  errorCode: row.error_code,
  createdAt: asIso(row.created_at)!,
  startedAt: asIso(row.started_at),
  completedAt: asIso(row.completed_at),
});

const mapAdvanceEvent = (row: RoutingAdvanceEventRow) => ({
  eventId: row.event_id,
  jobId: row.job_id,
  fromAttemptId: row.from_attempt_id,
  toAttemptId: row.to_attempt_id,
  fromTargetId: row.from_target_id,
  toTargetId: row.to_target_id,
  fromTargetPriority: row.from_target_priority,
  toTargetPriority: row.to_target_priority,
  reasonCode: row.reason_code,
  providerRequestId: row.provider_request_id,
  requestId: row.request_id,
  externalNotAccepted: row.external_not_accepted,
  externalSideEffectPossible: row.external_side_effect_possible,
  createdAt: asIso(row.created_at)!,
});

const mapDetail = (
  row: OperationRow,
  attemptChain: OperationAttemptRow[] = [],
  routingAdvanceEvents: RoutingAdvanceEventRow[] = [],
): SystemControlOperationDetail => {
  const error: SystemControlOperationError | null = row.error_code ? {
    code: row.error_code,
    reason: row.error_reason,
    retryable: row.retryable,
    reconciliationRequired: row.reconciliation_required,
  } : null;
  return {
    ...mapListItem(row),
    providerRequestId: row.provider_request_id,
    engineDeploymentVersionId: row.engine_deployment_version_id,
    routingVersionId: row.routing_version_id,
    budgetPolicyVersionId: row.budget_policy_version_id,
    conversionSnapshotId: row.conversion_snapshot_id,
    startedAt: asIso(row.started_at),
    completedAt: asIso(row.completed_at),
    durationMs: asDuration(row.started_at, row.completed_at),
    qualitySummary: row.quality_summary,
    originalCurrency: row.original_currency,
    originalAmount: row.original_amount,
    error,
    attemptChain: attemptChain.map(mapAttempt),
    routingAdvanceEvents: routingAdvanceEvents.map(mapAdvanceEvent),
  };
};

export class SystemControlOperationsService {
  constructor(private readonly database: DatabasePool) {}

  private validateRange(query: SystemControlOperationsListQuery) {
    if (query.from && query.to && new Date(query.from).getTime() > new Date(query.to).getTime()) {
      throw new SystemControlOperationsError('SYSTEM_CONTROL_OPERATIONS_INVALID_RANGE', '开始时间不能晚于结束时间。');
    }
  }

  async list(query: SystemControlOperationsListQuery): Promise<SystemControlOperationsList> {
    this.validateRange(query);
    const page = parsePage(query);
    const params: unknown[] = [];
    const add = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const conditions: string[] = ['environment = \'development\''];
    if (query.environment) conditions.push(`environment = ${add(query.environment)}`);
    if (query.domain) conditions.push(`domain = ${add(query.domain)}`);
    if (query.projectId) conditions.push(`project_id = ${add(query.projectId)}::uuid`);
    if (query.status) conditions.push(`status = ${add(query.status)}`);
    if (query.search) {
      const search = add(query.search);
      conditions.push(`(operation_id ILIKE '%' || ${search} || '%' OR COALESCE(project_id::text,'') ILIKE '%' || ${search} || '%' OR COALESCE(job_id::text,'') ILIKE '%' || ${search} || '%' OR COALESCE(attempt_id::text,'') ILIKE '%' || ${search} || '%' OR COALESCE(request_id,'') ILIKE '%' || ${search} || '%' OR status ILIKE '%' || ${search} || '%')`);
    }
    if (query.from) conditions.push(`effective_updated_at >= ${add(query.from)}::timestamptz`);
    if (query.to) conditions.push(`effective_updated_at <= ${add(query.to)}::timestamptz`);
    const limitParam = add(page.limit);
    const offsetParam = add(page.offset);
    const orderBy = query.sort === 'updated_asc'
      ? 'effective_updated_at ASC, operation_id ASC'
      : query.sort === 'status_asc'
        ? 'status ASC, effective_updated_at DESC, operation_id DESC'
        : query.sort === 'domain_asc'
          ? 'domain ASC, effective_updated_at DESC, operation_id DESC'
          : 'effective_updated_at DESC, operation_id DESC';
    const result = await this.database.query<{ database_now: Date; total: string; items: OperationRow[] | string }>(`${OPERATIONS_CTE}
      , filtered AS (SELECT * FROM operations WHERE ${conditions.join(' AND ')})
      SELECT clock.database_now,
        (SELECT COUNT(*)::text FROM filtered) AS total,
        COALESCE((SELECT json_agg(page ORDER BY ${orderBy}) FROM (SELECT * FROM filtered ORDER BY ${orderBy} LIMIT ${limitParam} OFFSET ${offsetParam}) page), '[]'::json) AS items
      FROM database_clock clock`, params);
    const row = result.rows[0];
    if (!row) throw new Error('SYSTEM_CONTROL_OPERATIONS_EMPTY_SNAPSHOT');
    const items = Array.isArray(row.items) ? row.items : JSON.parse(row.items ?? '[]') as OperationRow[];
    const databaseNow = asIso(row.database_now)!;
    return {
      items: items.map(mapListItem),
      total: Number(row.total),
      limit: page.limit,
      offset: page.offset,
      databaseNow,
      dataFreshness: databaseNow,
    };
  }

  async get(operationId: string): Promise<SystemControlOperationDetail> {
    const result = await this.database.query<OperationRow>(`${OPERATIONS_CTE}
      SELECT operations.*, clock.database_now
      FROM operations CROSS JOIN database_clock clock
      WHERE operations.operation_id = $1`, [operationId]);
    const row = result.rows[0];
    if (!row) throw new SystemControlOperationsError('SYSTEM_CONTROL_OPERATION_NOT_FOUND', '运行记录不存在。', 404);
    const history = await this.loadHistory(row);
    return mapDetail(row, history.attemptChain, history.routingAdvanceEvents);
  }

  private async loadHistory(row: OperationRow): Promise<{
    attemptChain: OperationAttemptRow[];
    routingAdvanceEvents: RoutingAdvanceEventRow[];
  }> {
    const historyId = row.job_id ?? (row.domain === 'system_control' ? row.task_id : null);
    if (!historyId) return { attemptChain: [], routingAdvanceEvents: [] };

    let attemptResult: { rows: OperationAttemptRow[] };
    if (row.domain === 'asr') {
      attemptResult = await this.database.query<OperationAttemptRow>(`
        SELECT a.id AS attempt_id, a.attempt_number, a.status::text AS status,
          dispatch.request_id, j.route_digest, a.routing_target_id,
          a.routing_target_priority AS target_priority, a.deployment_version_id, a.effect_class,
          a.provider_request_id, (a.effect_class = 'external_not_accepted') AS external_not_accepted,
          a.external_side_effect_possible,
          CASE WHEN a.error_code IS NULL THEN NULL WHEN a.error_code ~ '^[A-Za-z0-9_.:-]{1,100}$' THEN a.error_code ELSE 'ASR_EXECUTION_FAILED' END AS error_code,
          a.created_at, a.started_at, a.completed_at
        FROM asr_attempts a
        JOIN asr_jobs j ON j.id = a.job_id
        LEFT JOIN LATERAL (
          SELECT dg.request_id
          FROM asr_dispatch_project_results dpr
          JOIN asr_dispatch_groups dg ON dg.id = dpr.dispatch_group_id
          WHERE dpr.batch_id = j.batch_id
          ORDER BY dpr.created_at DESC, dpr.id DESC
          LIMIT 1
        ) dispatch ON true
        WHERE a.job_id = $1
        ORDER BY a.attempt_number ASC, a.created_at ASC, a.id ASC
        LIMIT 100`, [historyId]);
    } else if (row.domain === 'screen_text') {
      attemptResult = await this.database.query<OperationAttemptRow>(`
        SELECT a.id AS attempt_id, a.attempt_number, a.status::text AS status,
          b.request_id, j.route_digest, a.routing_target_id,
          a.routing_target_priority AS target_priority, a.deployment_version_id, a.effect_class,
          a.provider_request_id, (a.effect_class = 'external_not_accepted') AS external_not_accepted,
          a.external_side_effect_possible,
          CASE WHEN a.error_code IS NULL THEN NULL WHEN a.error_code ~ '^[A-Za-z0-9_.:-]{1,100}$' THEN a.error_code ELSE 'SCREEN_TEXT_EXECUTION_FAILED' END AS error_code,
          a.created_at, a.created_at AS started_at, a.completed_at
        FROM screen_text_attempts a
        JOIN screen_text_jobs j ON j.id = a.job_id
        JOIN screen_text_batches b ON b.id = j.batch_id
        WHERE a.job_id = $1
        ORDER BY a.attempt_number ASC, a.created_at ASC, a.id ASC
        LIMIT 100`, [historyId]);
    } else if (row.domain === 'delivery') {
      attemptResult = await this.database.query<OperationAttemptRow>(`
        SELECT a.id AS attempt_id, a.attempt_number, a.status::text AS status,
          a.request_id, NULL::varchar AS route_digest, NULL::uuid AS routing_target_id,
          NULL::integer AS target_priority, NULL::uuid AS deployment_version_id, NULL::varchar AS effect_class,
          NULL::varchar AS provider_request_id, false AS external_not_accepted,
          false AS external_side_effect_possible,
          CASE WHEN a.error_code IS NULL THEN NULL WHEN a.error_code ~ '^[A-Za-z0-9_.:-]{1,100}$' THEN a.error_code ELSE 'DELIVERY_GENERATION_FAILED' END AS error_code,
          a.created_at, a.started_at, a.completed_at
        FROM delivery_attempts a
        JOIN delivery_jobs j ON j.delivery_id = a.delivery_id
        WHERE j.id = $1
        ORDER BY a.attempt_number ASC, a.created_at ASC, a.id ASC
        LIMIT 100`, [historyId]);
    } else if (row.domain === 'system_control') {
      attemptResult = await this.database.query<OperationAttemptRow>(`
        SELECT a.id AS attempt_id, a.attempt_number, a.status::text AS status,
          t.request_id, NULL::varchar AS route_digest, NULL::uuid AS routing_target_id,
          NULL::integer AS target_priority, t.deployment_version_id, NULL::varchar AS effect_class,
          NULL::varchar AS provider_request_id, false AS external_not_accepted,
          (a.status::text <> 'queued') AS external_side_effect_possible,
          CASE WHEN a.reason_code IS NULL THEN NULL WHEN a.reason_code ~ '^[A-Za-z0-9_.:-]{1,100}$' THEN a.reason_code ELSE 'CONNECTION_TEST_FAILED' END AS error_code,
          a.created_at, a.started_at, a.completed_at
        FROM connection_test_attempts a
        JOIN connection_test_runs t ON t.id = a.test_run_id
        WHERE a.test_run_id = $1
        ORDER BY a.attempt_number ASC, a.created_at ASC, a.id ASC
        LIMIT 100`, [historyId]);
    } else {
      return { attemptChain: [], routingAdvanceEvents: [] };
    }

    if (row.domain !== 'asr' && row.domain !== 'screen_text') {
      return { attemptChain: attemptResult.rows, routingAdvanceEvents: [] };
    }

    const eventResult = await this.database.query<RoutingAdvanceEventRow>(`
      SELECT e.id AS event_id, e.job_id, e.attempt_id AS from_attempt_id,
        next_attempt.to_attempt_id,
        e.from_target_id, e.to_target_id,
        from_target.priority AS from_target_priority,
        to_target.priority AS to_target_priority,
        CASE WHEN e.classification ~ '^[A-Za-z0-9_.:-]{1,80}$' THEN e.classification ELSE 'ROUTING_ADVANCE' END AS reason_code,
        e.provider_request_id, e.request_id,
        (e.classification = 'external_not_accepted') AS external_not_accepted,
        (e.classification <> 'external_not_accepted') AS external_side_effect_possible,
        e.created_at
      FROM routing_advance_events e
      LEFT JOIN routing_policy_targets from_target ON from_target.routing_target_id = e.from_target_id
      LEFT JOIN routing_policy_targets to_target ON to_target.routing_target_id = e.to_target_id
      LEFT JOIN LATERAL (
        SELECT a.id AS to_attempt_id, a.created_at
        FROM asr_attempts a
        WHERE a.job_id = e.job_id AND a.routing_target_id = e.to_target_id AND a.created_at >= e.created_at
        UNION ALL
        SELECT s.id AS to_attempt_id, s.created_at
        FROM screen_text_attempts s
        WHERE s.job_id = e.job_id AND s.routing_target_id = e.to_target_id AND s.created_at >= e.created_at
        ORDER BY created_at ASC, to_attempt_id ASC
        LIMIT 1
      ) next_attempt ON true
      WHERE e.job_id = $1
      ORDER BY e.created_at ASC, e.id ASC
      LIMIT 100`, [historyId]);

    return { attemptChain: attemptResult.rows, routingAdvanceEvents: eventResult.rows };
  }
}
