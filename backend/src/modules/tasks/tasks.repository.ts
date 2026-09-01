import type {
  TaskDetail,
  TaskDispatchResult,
  TaskError,
  TaskHistoryEntry,
  TaskList,
  TaskListQuery,
  TaskStatus,
  TaskSummary,
  TaskType,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';
import { TaskNotFoundError } from './tasks.errors.js';

type TaskRow = {
  task_type: TaskType;
  resource_id: string;
  short_id: string;
  name: string;
  project_id: string | null;
  project_name: string | null;
  project_ids: string[];
  project_names: string[];
  status: TaskStatus;
  native_status: string;
  progress_completed: number | null;
  progress_total: number | null;
  progress_phase: string | null;
  error_code: string | null;
  error_reason: string | null;
  error_retryable: boolean;
  error_reconciliation: boolean;
  error_request_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  available_actions: string[];
  return_path: string;
  episode_numbers: number[];
};

type DispatchResultRow = {
  project_id: string;
  project_name: string | null;
  selection_order: number;
  acceptance_status: 'pending' | 'ready' | 'accepted' | 'blocked';
  batch_id: string | null;
  execution_status: string | null;
  execution_updated_at: Date | string | null;
  error_code: string | null;
  error_request_id: string | null;
};

const TASK_ROWS = `
WITH scope AS (SELECT $1::uuid[] AS project_ids),
dispatch_projection AS (
  SELECT d.id AS dispatch_id,
    COUNT(*) FILTER (WHERE r.status = 'accepted')::int AS accepted_projects,
    COUNT(*) FILTER (WHERE r.status = 'accepted' AND b.id IS NOT NULL)::int AS accepted_batches,
    COUNT(*) FILTER (WHERE r.status = 'accepted' AND b.status::text = 'queued')::int AS queued,
    COUNT(*) FILTER (WHERE r.status = 'accepted' AND b.status::text = 'running')::int AS running,
    COUNT(*) FILTER (WHERE r.status = 'accepted' AND b.status::text = 'cancel_requested')::int AS cancel_requested,
    COUNT(*) FILTER (WHERE r.status = 'accepted' AND b.status::text = 'partial')::int AS partial,
    COUNT(*) FILTER (WHERE r.status = 'accepted' AND b.status::text = 'completed')::int AS completed,
    COUNT(*) FILTER (WHERE r.status = 'accepted' AND b.status::text = 'reconciliation_required')::int AS reconciliation_required,
    COUNT(*) FILTER (WHERE r.status = 'accepted' AND b.status::text IN ('failed','blocked'))::int AS failed,
    COUNT(*) FILTER (WHERE r.status = 'accepted' AND b.status::text = 'cancelled')::int AS cancelled
  FROM asr_dispatch_groups d
  CROSS JOIN scope
  LEFT JOIN asr_dispatch_project_results r ON r.dispatch_group_id = d.id
    AND (scope.project_ids IS NULL OR r.project_id = ANY(scope.project_ids))
  LEFT JOIN asr_batches b ON b.id = r.batch_id
  WHERE scope.project_ids IS NULL OR d.project_ids && scope.project_ids
  GROUP BY d.id
), dispatch_derived AS (
  SELECT *, CASE
    WHEN accepted_projects = 0 OR accepted_batches = 0 THEN 'unknown'
    WHEN cancel_requested > 0 THEN 'cancel_requested'
    WHEN running > 0 THEN 'running'
    WHEN queued > 0 THEN 'queued'
    WHEN partial > 0 OR ((completed + partial) > 0 AND (failed + cancelled + reconciliation_required) > 0) THEN 'waiting_review'
    WHEN reconciliation_required > 0 THEN 'reconciliation_required'
    WHEN failed > 0 THEN 'failed'
    WHEN completed = accepted_projects THEN 'completed'
    WHEN cancelled = accepted_projects THEN 'cancelled'
    ELSE 'unknown'
  END::text AS execution_status
  , CASE
    WHEN accepted_batches = 0 THEN NULL
    WHEN cancel_requested > 0 THEN 'cancel_requested'
    WHEN running > 0 THEN 'running'
    WHEN queued > 0 THEN 'queued'
    WHEN partial > 0 OR ((completed + partial) > 0 AND (failed + cancelled + reconciliation_required) > 0) THEN 'partial'
    WHEN reconciliation_required > 0 THEN 'reconciliation_required'
    WHEN failed > 0 THEN 'failed'
    WHEN completed = accepted_projects THEN 'completed'
    WHEN cancelled = accepted_projects THEN 'cancelled'
    ELSE NULL
  END::text AS execution_native_status
  FROM dispatch_projection
), task_rows AS (
  SELECT
    'asr_dispatch'::text AS task_type, d.id AS resource_id,
    ('dispatch-' || left(d.id::text, 8)) AS short_id,
    'ASR 多项目识别'::text AS name,
    NULL::uuid AS project_id, NULL::text AS project_name,
    COALESCE(array_agg(DISTINCT p.id ORDER BY p.id) FILTER (WHERE p.id IS NOT NULL), ARRAY[]::uuid[]) AS project_ids,
    COALESCE(array_agg(DISTINCT p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[]) AS project_names,
    dd.execution_status AS status,
    CASE WHEN dd.accepted_batches > 0 THEN COALESCE(dd.execution_native_status, 'unknown') ELSE d.status::text END AS native_status,
    dd.completed::int AS progress_completed,
    dd.accepted_projects::int AS progress_total,
    NULL::text AS progress_phase,
    CASE WHEN d.status = 'blocked' THEN 'ASR_DISPATCH_BLOCKED'
      WHEN dd.execution_status = 'failed' THEN 'ASR_DISPATCH_EXECUTION_FAILED'
      WHEN dd.execution_status = 'reconciliation_required' THEN 'ASR_DISPATCH_RECONCILIATION_REQUIRED' ELSE NULL END AS error_code,
    CASE WHEN d.status = 'blocked' THEN 'ASR 任务被阻断，详情已脱敏。'
      WHEN dd.execution_status = 'reconciliation_required' THEN 'ASR 任务需要对账，详情已脱敏。'
      WHEN dd.execution_status = 'failed' THEN 'ASR 任务执行失败，详情已脱敏。' ELSE NULL END AS error_reason,
    false AS error_retryable, dd.reconciliation_required > 0 AS error_reconciliation, d.request_id AS error_request_id,
    d.created_at, d.updated_at,
    CASE WHEN dd.execution_status IN ('queued','running') THEN ARRAY['cancel']::text[]
      WHEN dd.execution_status IN ('waiting_review','failed','reconciliation_required') THEN ARRAY['open_workspace']::text[]
      ELSE ARRAY[]::text[] END AS available_actions,
    '/tasks?taskType=asr_dispatch&resourceId=' || d.id::text AS return_path,
    ARRAY[]::integer[] AS episode_numbers
  FROM asr_dispatch_groups d
  CROSS JOIN scope
  JOIN dispatch_derived dd ON dd.dispatch_id = d.id
  LEFT JOIN asr_dispatch_project_results dpr ON dpr.dispatch_group_id = d.id
    AND (scope.project_ids IS NULL OR dpr.project_id = ANY(scope.project_ids))
  LEFT JOIN projects p ON (p.id = dpr.project_id OR (dpr.id IS NULL AND p.id = ANY(d.project_ids)))
    AND (scope.project_ids IS NULL OR p.id = ANY(scope.project_ids))
  WHERE scope.project_ids IS NULL OR d.project_ids && scope.project_ids
  GROUP BY d.id, d.status, d.request_id, d.created_at, d.updated_at,
    dd.execution_status, dd.execution_native_status, dd.accepted_batches,
    dd.completed, dd.accepted_projects, dd.reconciliation_required

  UNION ALL

  SELECT
    'asr_batch'::text, b.id, ('asr-' || left(b.id::text, 8)), 'ASR 识别批次',
    b.project_id, p.name, ARRAY[b.project_id]::uuid[], ARRAY[p.name]::text[],
    CASE b.status::text WHEN 'blocked' THEN 'failed' WHEN 'queued' THEN 'queued'
      WHEN 'running' THEN 'running' WHEN 'partial' THEN 'waiting_review'
      WHEN 'completed' THEN 'completed' WHEN 'failed' THEN 'failed'
      WHEN 'cancel_requested' THEN 'cancel_requested' WHEN 'reconciliation_required' THEN 'reconciliation_required'
      WHEN 'cancelled' THEN 'cancelled' ELSE 'unknown' END::text,
    b.status::text,
    COUNT(j.id) FILTER (WHERE j.status = 'completed')::int,
    cardinality(b.episode_numbers), NULL::text,
    CASE WHEN b.status::text = 'failed' THEN 'ASR_BATCH_FAILED'
      WHEN b.status::text = 'reconciliation_required' THEN 'ASR_BATCH_RECONCILIATION_REQUIRED' ELSE NULL END,
    CASE WHEN b.status::text = 'failed' THEN 'ASR 批次执行失败，详情已脱敏。'
      WHEN b.status::text = 'reconciliation_required' THEN 'ASR 批次需要对账，详情已脱敏。' ELSE NULL END,
    false, b.status::text = 'reconciliation_required', NULL::text,
    b.created_at, b.updated_at,
    CASE WHEN b.status::text IN ('failed','blocked','reconciliation_required') THEN ARRAY['open_workspace']::text[]
      WHEN b.status::text IN ('queued','running') THEN ARRAY['cancel']::text[] ELSE ARRAY[]::text[] END,
    '/projects/' || b.project_id::text || '/asr?batchId=' || b.id::text,
    b.episode_numbers
  FROM asr_batches b JOIN projects p ON p.id = b.project_id CROSS JOIN scope
  LEFT JOIN asr_jobs j ON j.batch_id = b.id
  WHERE (scope.project_ids IS NULL OR b.project_id = ANY(scope.project_ids))
    AND NOT EXISTS (SELECT 1 FROM asr_dispatch_project_results dpr WHERE dpr.batch_id = b.id)
  GROUP BY b.id, p.name, b.project_id, b.status, b.episode_numbers, b.created_at, b.updated_at

  UNION ALL

  SELECT
    'screen_text_batch'::text, b.id, ('ocr-' || left(b.id::text, 8)), '画面字识别批次',
    b.project_id, p.name, ARRAY[b.project_id]::uuid[], ARRAY[p.name]::text[],
    CASE b.status::text WHEN 'queued' THEN 'queued' WHEN 'running' THEN 'running'
      WHEN 'review_pending' THEN 'waiting_review' WHEN 'partial' THEN 'waiting_review'
      WHEN 'completed' THEN 'completed' WHEN 'failed' THEN 'failed'
      WHEN 'cancel_requested' THEN 'cancel_requested' WHEN 'cancelled' THEN 'cancelled'
      WHEN 'reconciliation_required' THEN 'reconciliation_required' WHEN 'stale' THEN 'stale' ELSE 'unknown' END::text,
    b.status::text,
    COUNT(j.id) FILTER (WHERE j.status IN ('completed','confirmed_empty'))::int,
    cardinality(b.episode_numbers), NULL::text,
    CASE WHEN b.status::text = 'failed' THEN 'SCREEN_TEXT_BATCH_FAILED'
      WHEN b.status::text = 'reconciliation_required' THEN 'SCREEN_TEXT_BATCH_RECONCILIATION_REQUIRED' ELSE NULL END,
    CASE WHEN b.status::text = 'failed' THEN '画面字批次执行失败，详情已脱敏。'
      WHEN b.status::text = 'reconciliation_required' THEN '画面字批次需要对账，详情已脱敏。' ELSE NULL END,
    false, b.status::text = 'reconciliation_required', b.request_id,
    b.created_at, b.updated_at,
    CASE WHEN b.status::text IN ('failed','reconciliation_required','review_pending','partial') THEN ARRAY['open_workspace']::text[]
      WHEN b.status::text IN ('queued','running') THEN ARRAY['cancel']::text[] ELSE ARRAY[]::text[] END,
    '/projects/' || b.project_id::text || '/screen-text?batchId=' || b.id::text,
    b.episode_numbers
  FROM screen_text_batches b JOIN projects p ON p.id = b.project_id CROSS JOIN scope
  LEFT JOIN screen_text_jobs j ON j.batch_id = b.id
  WHERE scope.project_ids IS NULL OR b.project_id = ANY(scope.project_ids)
  GROUP BY b.id, p.name, b.project_id, b.status, b.request_id, b.episode_numbers, b.created_at, b.updated_at

  UNION ALL

  SELECT
    'term_extraction'::text, r.id, ('terms-' || left(r.id::text, 8)), '术语提取',
    r.project_id, p.name, ARRAY[r.project_id]::uuid[], ARRAY[p.name]::text[],
    CASE r.status::text WHEN 'running' THEN 'running' WHEN 'completed' THEN 'completed'
      WHEN 'failed' THEN 'failed' ELSE 'unknown' END::text,
    r.status::text, r.candidate_count, r.cue_count, NULL::text,
    CASE WHEN r.status::text = 'failed' THEN COALESCE(NULLIF(r.error_code, ''), 'TERM_EXTRACTION_FAILED') ELSE NULL END,
    CASE WHEN r.status::text = 'failed' THEN '术语提取失败，详情已脱敏。' ELSE NULL END,
    false, false, r.request_id,
    r.created_at, COALESCE(r.completed_at, r.created_at),
    CASE WHEN r.status::text = 'failed' THEN ARRAY['open_workspace']::text[] ELSE ARRAY[]::text[] END,
    '/projects/' || r.project_id::text || '/terms', ARRAY[]::integer[]
  FROM term_extraction_runs r JOIN projects p ON p.id = r.project_id CROSS JOIN scope
  WHERE scope.project_ids IS NULL OR r.project_id = ANY(scope.project_ids)

  UNION ALL

  SELECT
    'pre_review_preparation'::text, j.id, ('pre-review-' || left(j.id::text, 8)), '前置审改准备',
    s.project_id, p.name, ARRAY[s.project_id]::uuid[], ARRAY[p.name]::text[],
    CASE j.status::text WHEN 'queued' THEN 'queued' WHEN 'leased' THEN 'running'
      WHEN 'completed' THEN 'completed' WHEN 'failed' THEN 'failed' ELSE 'unknown' END::text,
    j.status::text, NULL::int, NULL::int, NULL::text,
    CASE WHEN j.status::text = 'failed' THEN COALESCE(NULLIF(j.error_code, ''), 'PRE_REVIEW_PREPARATION_FAILED') ELSE NULL END,
    CASE WHEN j.status::text = 'failed' THEN '前置审改准备失败，详情已脱敏。' ELSE NULL END,
    false, false, NULL::text,
    j.created_at, j.updated_at,
    CASE WHEN j.status::text = 'failed' THEN ARRAY['open_workspace']::text[] ELSE ARRAY[]::text[] END,
    '/projects/' || s.project_id::text || '/pre-review?sessionId=' || s.id::text,
    ARRAY[]::integer[]
  FROM pre_edit_prepare_jobs j JOIN pre_edit_sessions s ON s.id = j.session_id
    JOIN projects p ON p.id = s.project_id CROSS JOIN scope
  WHERE scope.project_ids IS NULL OR s.project_id = ANY(scope.project_ids)

  UNION ALL

  SELECT
    'delivery_generation'::text, p.id, ('delivery-' || left(p.id::text, 8)), p.name,
    p.project_id, pr.name, ARRAY[p.project_id]::uuid[], ARRAY[pr.name]::text[],
    CASE p.status::text WHEN 'preparing' THEN 'running' WHEN 'ready' THEN 'completed'
      WHEN 'generation_failed' THEN 'failed' WHEN 'recycled' THEN 'stale' ELSE 'unknown' END::text,
    p.status::text, NULL::int, NULL::int, NULL::text,
    CASE WHEN p.status::text = 'generation_failed' THEN 'DELIVERY_GENERATION_FAILED' ELSE NULL END,
    CASE WHEN p.status::text = 'generation_failed' THEN '交付生成失败，详情已脱敏。' ELSE NULL END,
    false, false, p.request_id,
    p.created_at, p.updated_at,
    CASE WHEN p.status::text = 'generation_failed' THEN ARRAY['recover']::text[] ELSE ARRAY[]::text[] END,
    '/deliveries/' || p.id::text,
    ARRAY[]::integer[]
  FROM delivery_products p JOIN projects pr ON pr.id = p.project_id
    JOIN delivery_jobs j ON j.delivery_id = p.id CROSS JOIN scope
  WHERE scope.project_ids IS NULL OR p.project_id = ANY(scope.project_ids)
)
`;

const asIso = (value: Date | string) => (value instanceof Date ? value : new Date(value)).toISOString();

const safeCode = (value: string | null) => value && /^[A-Z0-9_.:-]{1,120}$/.test(value) ? value : 'TASK_FAILED';

const mapError = (row: Pick<TaskRow, 'error_code' | 'error_reason' | 'error_retryable' | 'error_reconciliation' | 'error_request_id'>): TaskError | null => {
  if (!row.error_code) return null;
  return {
    code: safeCode(row.error_code),
    reason: row.error_reason ?? '任务执行失败，详情已脱敏。',
    retryable: row.error_retryable,
    reconciliationRequired: row.error_reconciliation,
    requestId: row.error_request_id,
  };
};

const mapSummary = (row: TaskRow): TaskSummary => ({
  taskType: row.task_type,
  resourceId: row.resource_id,
  shortId: row.short_id,
  name: row.name,
  projectId: row.project_id,
  projectName: row.project_name,
  projectIds: row.project_ids ?? [],
  projectNames: row.project_names ?? [],
  status: row.status,
  nativeStatus: row.native_status,
  progress: { completedCount: row.progress_completed, totalCount: row.progress_total, phase: row.progress_phase },
  error: mapError(row),
  createdAt: asIso(row.created_at),
  updatedAt: asIso(row.updated_at),
  availableActions: row.available_actions ?? [],
  returnPath: row.return_path,
});

const mapStatus = (taskType: TaskType, native: string): TaskStatus => {
  if (taskType === 'asr_dispatch') return native === 'processing' ? 'running' : native === 'accepted' ? 'completed' : native === 'partial' ? 'waiting_review' : native === 'blocked' ? 'failed' : 'unknown';
  if (taskType === 'asr_batch') return native === 'blocked' || native === 'failed' ? 'failed' : native === 'queued' ? 'queued' : native === 'running' || native === 'leased' ? 'running' : native === 'partial' ? 'waiting_review' : native === 'completed' ? 'completed' : native === 'cancel_requested' ? 'cancel_requested' : native === 'cancelled' ? 'cancelled' : native === 'reconciliation_required' ? 'reconciliation_required' : 'unknown';
  if (taskType === 'screen_text_batch') return native === 'not_started' || native === 'queued' ? 'queued' : native === 'running' || native === 'leased' ? 'running' : native === 'review_pending' || native === 'partial' ? 'waiting_review' : native === 'completed' || native === 'confirmed_empty' ? 'completed' : native === 'failed' ? 'failed' : native === 'cancel_requested' ? 'cancel_requested' : native === 'cancelled' ? 'cancelled' : native === 'reconciliation_required' ? 'reconciliation_required' : native === 'stale' ? 'stale' : 'unknown';
  if (taskType === 'term_extraction') return native === 'running' ? 'running' : native === 'completed' ? 'completed' : native === 'failed' ? 'failed' : 'unknown';
  if (taskType === 'pre_review_preparation') return native === 'queued' ? 'queued' : native === 'leased' ? 'running' : native === 'completed' ? 'completed' : native === 'failed' ? 'failed' : 'unknown';
  return native === 'preparing' ? 'running' : native === 'ready' ? 'completed' : native === 'generation_failed' ? 'failed' : native === 'recycled' ? 'stale' : 'unknown';
};

const historyError = (code: string | null, requestId: string | null, retryable = false, reconciliationRequired = false): TaskError | null => code ? { code: safeCode(code), reason: '任务执行失败，详情已脱敏。', retryable, reconciliationRequired, requestId } : null;

type HistoryRow = { resource_id: string; kind: TaskHistoryEntry['kind']; native_status: string; request_id: string | null; error_code: string | null; retryable: boolean; reconciliation_required: boolean; created_at: Date | string; updated_at: Date | string };

const mapHistory = (taskType: TaskType, row: HistoryRow): TaskHistoryEntry => ({
  resourceId: row.resource_id,
  kind: row.kind,
  status: mapStatus(taskType, row.native_status),
  nativeStatus: row.native_status,
  requestId: row.request_id,
  error: historyError(row.error_code, row.request_id, row.retryable, row.reconciliation_required),
  createdAt: asIso(row.created_at),
  updatedAt: asIso(row.updated_at),
});

const pageNumber = (value: number | string | undefined, fallback: number) => Number(value ?? fallback);

export class TasksRepository {
  constructor(private readonly database: DatabasePool) {}

  async list(query: TaskListQuery, projectIds: readonly string[] | null): Promise<TaskList> {
    const params: unknown[] = [projectIds];
    const add = (value: unknown) => { params.push(value); return `$${params.length}`; };
    const conditions = ['TRUE'];
    if (query.taskType) conditions.push(`task_type = ${add(query.taskType)}`);
    if (query.status) conditions.push(`status = ${add(query.status)}`);
    if (query.projectId) conditions.push(`(${add(query.projectId)}::uuid = ANY(project_ids))`);
    if (query.search?.trim()) {
      const token = add(query.search.trim());
      conditions.push(`(short_id ILIKE '%' || ${token} || '%' OR name ILIKE '%' || ${token} || '%' OR COALESCE(project_name, '') ILIKE '%' || ${token} || '%' OR EXISTS (SELECT 1 FROM unnest(project_names) n WHERE n ILIKE '%' || ${token} || '%'))`);
    }
    const direction = query.sortDirection === 'asc' ? 'ASC' : 'DESC';
    const sort = query.sortBy === 'createdAt'
      ? `created_at ${direction}, task_type ASC, resource_id ASC`
      : query.sortBy === 'updatedAt'
        ? `updated_at ${direction}, task_type ASC, resource_id ASC`
        : `CASE status WHEN 'failed' THEN 0 WHEN 'reconciliation_required' THEN 1 WHEN 'waiting_review' THEN 2 WHEN 'running' THEN 3 WHEN 'queued' THEN 4 ELSE 5 END ASC, updated_at DESC, task_type ASC, resource_id ASC`;
    const limit = add(pageNumber(query.limit, 50));
    const offset = add(pageNumber(query.offset, 0));
    const result = await this.database.query<{ total: string; items: TaskRow[] | string }>(`${TASK_ROWS}
      , filtered AS (SELECT * FROM task_rows WHERE ${conditions.join(' AND ')})
      SELECT (SELECT COUNT(*)::text FROM filtered) AS total,
        COALESCE((SELECT json_agg(page ORDER BY ${sort}) FROM (SELECT * FROM filtered ORDER BY ${sort} LIMIT ${limit} OFFSET ${offset}) page), '[]'::json) AS items`, params);
    const row = result.rows[0];
    const items = Array.isArray(row?.items) ? row.items : JSON.parse(row?.items ?? '[]') as TaskRow[];
    return { items: items.map(mapSummary), total: Number(row?.total ?? 0), limit: Number(query.limit ?? 50), offset: Number(query.offset ?? 0) };
  }

  async get(taskType: string, resourceId: string, projectIds: readonly string[] | null): Promise<TaskDetail> {
    if (!['asr_dispatch', 'asr_batch', 'screen_text_batch', 'term_extraction', 'pre_review_preparation', 'delivery_generation'].includes(taskType)) throw new TaskNotFoundError();
    const params: unknown[] = [projectIds, taskType, resourceId];
    const result = await this.database.query<TaskRow>(`${TASK_ROWS} SELECT * FROM task_rows WHERE task_type = $2 AND resource_id = $3::uuid LIMIT 1`, params);
    const row = result.rows[0];
    if (!row) throw new TaskNotFoundError();
    const history = await this.history(taskType as TaskType, resourceId, projectIds);
    const dispatchResults = taskType === 'asr_dispatch' ? await this.dispatchResults(resourceId, projectIds) : [];
    let childResourceIds: string[] = [];
    if (taskType === 'asr_dispatch') {
      childResourceIds = dispatchResults.flatMap((child) => child.batchId ? [child.batchId] : []);
    }
    return { summary: mapSummary(row), scope: { episodeNumbers: row.episode_numbers ?? [], childCount: dispatchResults.length, childResourceIds }, history, dispatchResults };
  }

  private async dispatchResults(resourceId: string, projectIds: readonly string[] | null): Promise<TaskDispatchResult[]> {
    const result = await this.database.query<DispatchResultRow>(`SELECT
        r.project_id, p.name AS project_name, r.selection_order,
        r.status AS acceptance_status, r.batch_id,
        CASE WHEN r.status <> 'accepted' OR b.id IS NULL THEN NULL
          WHEN b.status::text = 'queued' THEN 'queued'
          WHEN b.status::text = 'running' THEN 'running'
          WHEN b.status::text IN ('partial') THEN 'waiting_review'
          WHEN b.status::text = 'completed' THEN 'completed'
          WHEN b.status::text = 'failed' OR b.status::text = 'blocked' THEN 'failed'
          WHEN b.status::text = 'cancel_requested' THEN 'cancel_requested'
          WHEN b.status::text = 'cancelled' THEN 'cancelled'
          WHEN b.status::text = 'reconciliation_required' THEN 'reconciliation_required'
          ELSE 'unknown' END AS execution_status,
        COALESCE(b.updated_at, r.updated_at) AS execution_updated_at,
        CASE WHEN r.status = 'blocked' THEN 'ASR_DISPATCH_CHILD_BLOCKED'
          WHEN b.status::text IN ('failed','blocked') THEN 'ASR_BATCH_FAILED'
          WHEN b.status::text = 'reconciliation_required' THEN 'ASR_BATCH_RECONCILIATION_REQUIRED'
          ELSE NULL END AS error_code,
        NULL::text AS error_request_id
      FROM asr_dispatch_project_results r
      LEFT JOIN asr_batches b ON b.id = r.batch_id
      LEFT JOIN projects p ON p.id = r.project_id
      WHERE r.dispatch_group_id = $1
        AND ($2::uuid[] IS NULL OR r.project_id = ANY($2::uuid[]))
      ORDER BY r.selection_order ASC, r.project_id ASC
      LIMIT 20`, [resourceId, projectIds]);
    return result.rows.map((row) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      selectionOrder: row.selection_order,
      acceptanceStatus: row.acceptance_status,
      batchId: row.batch_id,
      executionStatus: row.execution_status as TaskStatus | null,
      executionUpdatedAt: row.execution_updated_at == null ? null : asIso(row.execution_updated_at),
      error: row.error_code ? {
        code: safeCode(row.error_code),
        reason: '任务执行失败，详情已脱敏。',
        retryable: false,
        reconciliationRequired: row.error_code.includes('RECONCILIATION'),
        requestId: row.error_request_id,
      } : null,
    }));
  }

  private async history(taskType: TaskType, resourceId: string, projectIds: readonly string[] | null): Promise<TaskHistoryEntry[]> {
    let sql: string;
    let params: unknown[] = [resourceId];
    if (taskType === 'asr_dispatch') {
      params = [resourceId, projectIds];
      sql = `SELECT COALESCE(batch_id, id) AS resource_id, 'child' AS kind, status AS native_status, NULL::text AS request_id, CASE WHEN status='blocked' THEN 'ASR_DISPATCH_CHILD_BLOCKED' ELSE NULL END AS error_code, false AS retryable, false AS reconciliation_required, created_at AS created_at, updated_at AS updated_at FROM asr_dispatch_project_results WHERE dispatch_group_id=$1 AND ($2::uuid[] IS NULL OR project_id = ANY($2::uuid[])) ORDER BY updated_at DESC, id DESC LIMIT 5`;
    } else if (taskType === 'asr_batch') {
      sql = `SELECT j.id AS resource_id, 'job' AS kind, j.status::text AS native_status, NULL::text AS request_id, NULL::text AS error_code, false AS retryable, false AS reconciliation_required, j.created_at AS created_at, j.updated_at AS updated_at FROM asr_jobs j WHERE j.batch_id=$1 UNION ALL SELECT a.id AS resource_id, 'attempt' AS kind, a.status::text AS native_status, NULL::text AS request_id, a.error_code AS error_code, a.retryable AS retryable, a.status::text='reconciliation_required' AS reconciliation_required, a.created_at AS created_at, COALESCE(a.completed_at,a.started_at,a.created_at) AS updated_at FROM asr_attempts a JOIN asr_jobs j ON j.id=a.job_id WHERE j.batch_id=$1 ORDER BY updated_at DESC, resource_id DESC LIMIT 5`;
    } else if (taskType === 'screen_text_batch') {
      sql = `SELECT j.id AS resource_id, 'job' AS kind, j.status::text AS native_status, NULL::text AS request_id, NULL::text AS error_code, false AS retryable, j.status::text='reconciliation_required' AS reconciliation_required, j.created_at AS created_at, j.updated_at AS updated_at FROM screen_text_jobs j WHERE j.batch_id=$1 UNION ALL SELECT a.id AS resource_id, 'attempt' AS kind, a.status::text AS native_status, NULL::text AS request_id, a.error_code AS error_code, a.retryable AS retryable, a.status::text='reconciliation_required' AS reconciliation_required, a.created_at AS created_at, COALESCE(a.completed_at,a.created_at) AS updated_at FROM screen_text_attempts a JOIN screen_text_jobs j ON j.id=a.job_id WHERE j.batch_id=$1 ORDER BY updated_at DESC, resource_id DESC LIMIT 5`;
    } else if (taskType === 'term_extraction') {
      sql = `SELECT id AS resource_id, 'run' AS kind, status::text AS native_status, request_id AS request_id, error_code AS error_code, false AS retryable, false AS reconciliation_required, created_at AS created_at, COALESCE(completed_at,created_at) AS updated_at FROM term_extraction_runs WHERE id=$1 LIMIT 1`;
    } else if (taskType === 'pre_review_preparation') {
      sql = `SELECT j.id AS resource_id, 'job' AS kind, j.status::text AS native_status, NULL::text AS request_id, j.error_code AS error_code, false AS retryable, false AS reconciliation_required, j.created_at AS created_at, j.updated_at AS updated_at FROM pre_edit_prepare_jobs j WHERE j.id=$1 LIMIT 1`;
    } else {
      params = [resourceId];
      sql = `SELECT a.id AS resource_id, 'attempt' AS kind, a.status::text AS native_status, a.request_id AS request_id, a.error_code AS error_code, false AS retryable, false AS reconciliation_required, a.created_at AS created_at, COALESCE(a.completed_at,a.started_at,a.created_at) AS updated_at FROM delivery_attempts a WHERE a.delivery_id=$1 ORDER BY a.created_at DESC, a.id DESC LIMIT 5`;
    }
    const result = await this.database.query<HistoryRow>(sql, params);
    return result.rows.map((historyRow) => mapHistory(taskType, historyRow));
  }
}
