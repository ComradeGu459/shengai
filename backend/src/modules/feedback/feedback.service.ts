import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  FeedbackCreateBody,
  FeedbackEvent,
  FeedbackEventBody,
  FeedbackEventAction,
  FeedbackEventList,
  FeedbackEventListQuery,
  FeedbackLatestEventSummary,
  FeedbackListItem,
  FeedbackList,
  FeedbackListQuery,
  FeedbackReport,
  FeedbackReportDetail,
  FeedbackScreenshotAttachment,
  FeedbackScreenshotAuthorizationBody,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';
import type { FeedbackPrincipal } from './feedback.auth.js';
import type { FeedbackScreenshotStorage } from './feedback-storage.js';
import { FeedbackError, feedbackConflict, feedbackInvalid, feedbackNotFound } from './feedback.errors.js';
import { principalSurface } from './feedback.auth.js';

type ReportRow = {
  id: string; kind: FeedbackReport['kind']; status: FeedbackReport['status']; description: string; surface: FeedbackReport['surface'];
  created_by: string; project_id: string | null; task_type: FeedbackReport['taskType']; resource_id: string | null;
  route_template: string; build_version: string; request_ids: string[]; browser_summary: FeedbackReport['browserSummary'];
  viewport: FeedbackReport['viewport']; timezone: string; performance_summary: FeedbackReport['performanceSummary'];
  screenshot_attachment_id: string | null; revision: number; request_id: string; created_at: Date | string; updated_at: Date | string;
};
type EventRow = { id: string; feedback_id: string; action: FeedbackEvent['action']; from_status: FeedbackEvent['fromStatus']; to_status: FeedbackEvent['toStatus']; note: string | null; actor_subject: string; request_id: string; created_at: Date | string };
type AttachmentRow = { id: string; feedback_id: string; status: FeedbackScreenshotAttachment['status']; content_type: FeedbackScreenshotAttachment['contentType']; size_bytes: number; content_digest: string; privacy_confirmed_at: Date | string; created_at: Date | string; updated_at: Date | string };
type ListRow = {
  id: string; description: string; surface: FeedbackReport['surface']; route_template: string; kind: FeedbackReport['kind']; project_id: string | null;
  status: FeedbackReport['status']; updated_at: Date | string; latest_event_id: string | null; latest_event_action: FeedbackEvent['action'] | null;
  latest_event_to_status: FeedbackReport['status'] | null; latest_event_actor_subject: string | null; latest_event_request_id: string | null; latest_event_created_at: Date | string | null;
};

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
};
const digest = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
const iso = (value: Date | string) => (value instanceof Date ? value : new Date(value)).toISOString();
const keyOf = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const toReport = (row: ReportRow): FeedbackReport => ({
  feedbackId: row.id, kind: row.kind, status: row.status, description: row.description, surface: row.surface,
  subject: row.created_by, projectId: row.project_id, taskType: row.task_type, resourceId: row.resource_id,
  routeTemplate: row.route_template, buildVersion: row.build_version, requestIds: row.request_ids ?? [],
  browserSummary: row.browser_summary, viewport: row.viewport, timezone: row.timezone,
  performanceSummary: row.performance_summary, screenshotAttachmentId: row.screenshot_attachment_id,
  revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
});
const toEvent = (row: EventRow): FeedbackEvent => ({
  feedbackEventId: row.id, feedbackId: row.feedback_id, action: row.action, fromStatus: row.from_status,
  toStatus: row.to_status, note: row.note, actorSubject: row.actor_subject, requestId: row.request_id, createdAt: iso(row.created_at),
});

const canAccessProject = (principal: FeedbackPrincipal, projectId: string) =>
  principal.projectAccess === 'all' || Boolean(principal.projectIds?.includes(projectId));
const toAttachment = (row: AttachmentRow): FeedbackScreenshotAttachment => ({
  attachmentId: row.id, feedbackId: row.feedback_id, status: row.status, contentType: row.content_type as FeedbackScreenshotAttachment['contentType'],
  sizeBytes: row.size_bytes, contentDigest: row.content_digest, privacyConfirmedAt: iso(row.privacy_confirmed_at), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
});

const reportColumns = `id, kind, status, description, surface, created_by, project_id, task_type, resource_id,
  route_template, build_version, request_ids, browser_summary, viewport, timezone, performance_summary,
  screenshot_attachment_id, revision, request_id, created_at, updated_at`;

const transition: Record<FeedbackEventAction, { from: FeedbackReport['status']; to: FeedbackReport['status'] }> = {
  confirmed: { from: 'new', to: 'confirmed' },
  fixing_started: { from: 'confirmed', to: 'fixing' },
  retest_requested: { from: 'fixing', to: 'retest' },
  closed: { from: 'retest', to: 'closed' },
  reopened: { from: 'closed', to: 'new' },
};

export class FeedbackService {
  constructor(private readonly database: DatabasePool, private readonly screenshotStorage: FeedbackScreenshotStorage) {}

  private async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.database.connect();
    try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  private async lockCommandKey(client: PoolClient, key: string) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`feedback-command:${key}`]);
  }

  private async findGlobalCommandKey(client: PoolClient, key: string) {
    const result = await client.query<{ kind: string; id: string; request_hash: string }>(`
      SELECT 'report' AS kind,id,request_hash FROM feedback_reports WHERE idempotency_key=$1
      UNION ALL SELECT 'event',id,request_hash FROM feedback_events WHERE idempotency_key=$1
      UNION ALL SELECT 'attachment',id,request_hash FROM feedback_screenshot_attachments WHERE idempotency_key=$1
      UNION ALL SELECT 'upload',id,upload_request_hash FROM feedback_screenshot_attachments WHERE upload_idempotency_key=$1
      UNION ALL SELECT 'complete',id,complete_request_hash FROM feedback_screenshot_attachments WHERE complete_idempotency_key=$1
      LIMIT 1`, [key]);
    return result.rows[0] ?? null;
  }

  private async loadDetail(client: PoolClient, feedbackId: string): Promise<FeedbackReportDetail> {
    const report = await client.query<ReportRow>(`SELECT ${reportColumns} FROM feedback_reports WHERE id=$1`, [feedbackId]);
    if (!report.rows[0]) throw feedbackNotFound();
    const events = await client.query<EventRow>(`SELECT id,feedback_id,action,from_status,to_status,note,actor_subject,request_id,created_at FROM feedback_events WHERE feedback_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`, [feedbackId]);
    const attachment = await client.query<AttachmentRow>(`SELECT id,feedback_id,status,content_type,size_bytes,content_digest,privacy_confirmed_at,created_at,updated_at FROM feedback_screenshot_attachments WHERE feedback_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1`, [feedbackId]);
    return { report: toReport(report.rows[0]), attachment: attachment.rows[0] ? toAttachment(attachment.rows[0]) : null, events: events.rows.map(toEvent) };
  }

  private async assertContext(client: PoolClient, body: FeedbackCreateBody) {
    if (!body.projectId) {
      if (body.taskType || body.resourceId) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '任务身份必须绑定项目。');
      return;
    }
    const project = await client.query('SELECT 1 FROM projects WHERE id=$1', [body.projectId]);
    if (!project.rowCount) throw feedbackInvalid('FEEDBACK_PROJECT_NOT_FOUND', '项目不存在或不可用。');
    if (!body.taskType && !body.resourceId) return;
    if (!body.taskType || !body.resourceId) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '任务类型与任务身份必须同时提供。');
    const sql: Record<FeedbackCreateBody['taskType'] & string, string> = {
      asr_dispatch: 'SELECT 1 FROM asr_dispatch_groups WHERE id=$1 AND project_ids @> ARRAY[$2]::uuid[]',
      asr_batch: 'SELECT 1 FROM asr_batches WHERE id=$1 AND project_id=$2',
      screen_text_batch: 'SELECT 1 FROM screen_text_batches WHERE id=$1 AND project_id=$2',
      term_extraction: 'SELECT 1 FROM term_extraction_runs WHERE id=$1 AND project_id=$2',
      pre_review_preparation: 'SELECT 1 FROM pre_edit_sessions WHERE id=$1 AND project_id=$2',
      delivery_generation: 'SELECT 1 FROM delivery_products WHERE id=$1 AND project_id=$2',
    };
    const task = await client.query(sql[body.taskType], [body.resourceId, body.projectId]);
    if (!task.rowCount) throw feedbackInvalid('FEEDBACK_TASK_NOT_FOUND', '关联任务不存在或不属于该项目。');
  }

  private async loadForPrincipal(feedbackId: string, principal: FeedbackPrincipal, manager: boolean) {
    const detail = await this.database.query<ReportRow>(`SELECT ${reportColumns} FROM feedback_reports WHERE id=$1`, [feedbackId]);
    const row = detail.rows[0];
    if (!row) throw feedbackNotFound();
    if (!manager && row.created_by !== principal.subject) throw feedbackNotFound();
    return row;
  }

  async create(input: { body: FeedbackCreateBody; idempotencyKey: string | undefined; requestId: string; principal: FeedbackPrincipal }): Promise<{ detail: FeedbackReportDetail; replay: boolean }> {
    const { body, principal } = input;
    const idempotencyKey = input.idempotencyKey?.trim();
    if (!idempotencyKey) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '缺少 Idempotency-Key。');
    if (body.description.trim().length === 0) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '反馈描述不能为空。');
    const surface = principalSurface(principal);
    if (surface === 'employee' && body.projectId && !canAccessProject(principal, body.projectId)) {
      throw feedbackNotFound();
    }
    const requestHash = digest({ body, surface, subject: principal.subject });
    return this.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`feedback:${body.feedbackId}`]);
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`feedback-key:${idempotencyKey}`]);
      await this.lockCommandKey(client, idempotencyKey);
      const keyRow = await client.query<{ id: string; request_hash: string }>('SELECT id,request_hash FROM feedback_reports WHERE idempotency_key=$1 FOR UPDATE', [idempotencyKey]);
      if (keyRow.rows[0]) {
        if (keyRow.rows[0].request_hash !== requestHash || keyRow.rows[0].id !== body.feedbackId) throw feedbackConflict('FEEDBACK_IDEMPOTENCY_KEY_REUSED', '幂等键已用于另一反馈请求。', 'use_new_idempotency_key');
        return { detail: await this.loadDetail(client, body.feedbackId), replay: true };
      }
      const globalKey = await this.findGlobalCommandKey(client, idempotencyKey);
      if (globalKey) throw feedbackConflict('FEEDBACK_IDEMPOTENCY_KEY_REUSED', '幂等键已用于另一反馈命令。', 'use_new_idempotency_key');
      const idRow = await client.query<{ idempotency_key: string; request_hash: string }>('SELECT idempotency_key,request_hash FROM feedback_reports WHERE id=$1 FOR UPDATE', [body.feedbackId]);
      if (idRow.rows[0]) {
        if (idRow.rows[0].request_hash === requestHash && idRow.rows[0].idempotency_key === idempotencyKey) return { detail: await this.loadDetail(client, body.feedbackId), replay: true };
        throw feedbackConflict('FEEDBACK_ID_REUSED', '反馈身份已被其他请求使用。', 'use_new_feedback_id');
      }
      await this.assertContext(client, body);
      const eventId = randomUUID();
      await client.query(`INSERT INTO feedback_reports(
        id,kind,status,description,surface,created_by,project_id,task_type,resource_id,
        route_template,build_version,request_ids,browser_summary,viewport,timezone,performance_summary,
        screenshot_attachment_id,revision,request_id,idempotency_key,request_hash
      ) VALUES($1,$2,'new',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NULL,1,$16,$17,$18)`, [
        body.feedbackId, body.kind, body.description, surface, principal.subject, body.projectId ?? null, body.taskType ?? null, body.resourceId ?? null,
        body.routeTemplate, body.buildVersion, body.requestIds, body.browserSummary, body.viewport, body.timezone,
        body.performanceSummary ?? null, input.requestId, idempotencyKey, requestHash,
      ]);
      await client.query(`INSERT INTO feedback_events(id,feedback_id,action,from_status,to_status,note,actor_subject,request_id,idempotency_key,request_hash) VALUES($1,$2,'created',NULL,'new',NULL,$3,$4,$5,$6)`, [eventId, body.feedbackId, principal.subject, input.requestId, `created:${idempotencyKey}`, digest({ feedbackId: body.feedbackId, action: 'created', requestHash })]);
      return { detail: await this.loadDetail(client, body.feedbackId), replay: false };
    });
  }

  async get(feedbackId: string, principal: FeedbackPrincipal, manager: boolean) {
    const row = await this.loadForPrincipal(feedbackId, principal, manager);
    if (!manager && row.project_id && !canAccessProject(principal, row.project_id)) throw feedbackNotFound();
    return this.transaction((client) => this.loadDetail(client, feedbackId));
  }

  async getEvent(eventId: string, principal: FeedbackPrincipal, manager: boolean): Promise<FeedbackEvent> {
    const result = await this.database.query<EventRow & { created_by: string; project_id: string | null }>(`SELECT e.id,e.feedback_id,e.action,e.from_status,e.to_status,e.note,e.actor_subject,e.request_id,e.created_at,r.created_by,r.project_id FROM feedback_events e JOIN feedback_reports r ON r.id=e.feedback_id WHERE e.id=$1`, [eventId]);
    const row = result.rows[0];
    if (!row || (!manager && row.created_by !== principal.subject) || (!manager && row.project_id && !canAccessProject(principal, row.project_id))) throw feedbackNotFound();
    return toEvent(row);
  }

  async getAttachment(feedbackId: string, attachmentId: string, principal: FeedbackPrincipal, manager: boolean): Promise<FeedbackScreenshotAttachment> {
    await this.assertAttachmentAccess(feedbackId, principal, manager);
    const result = await this.database.query<AttachmentRow>('SELECT id,feedback_id,status,content_type,size_bytes,content_digest,privacy_confirmed_at,created_at,updated_at FROM feedback_screenshot_attachments WHERE id=$1 AND feedback_id=$2', [attachmentId, feedbackId]);
    if (!result.rows[0]) throw feedbackNotFound();
    return toAttachment(result.rows[0]);
  }

  async list(query: FeedbackListQuery): Promise<FeedbackList> {
    const params: unknown[] = [];
    const add = (value: unknown) => { params.push(value); return `$${params.length}`; };
    const where = ['TRUE'];
    if (query.search) { const p = add(`%${query.search.trim()}%`); where.push(`(r.id::text ILIKE ${p} OR r.description ILIKE ${p} OR r.created_by ILIKE ${p} OR r.route_template ILIKE ${p} OR COALESCE(r.resource_id::text,'') ILIKE ${p} OR COALESCE(array_to_string(r.request_ids, ','),'') ILIKE ${p})`); }
    if (query.surface) where.push(`r.surface=${add(query.surface)}`);
    if (query.kind) where.push(`r.kind=${add(query.kind)}`);
    if (query.status) where.push(`r.status=${add(query.status)}`);
    if (query.projectId) where.push(`r.project_id=${add(query.projectId)}`);
    if (query.from) where.push(`r.created_at>=${add(query.from)}`);
    if (query.to) where.push(`r.created_at<=${add(query.to)}`);
    const direction = query.sortDirection === 'asc' ? 'ASC' : 'DESC';
    const sort = query.sort === 'createdAt' ? `r.created_at ${direction}, r.id ASC` : query.sort === 'updatedAt' ? `r.updated_at ${direction}, r.id ASC` : `CASE r.status WHEN 'new' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'fixing' THEN 2 WHEN 'retest' THEN 3 ELSE 4 END ASC, r.updated_at DESC, r.id ASC`;
    const limit = Number(query.limit ?? 50); const offset = Number(query.offset ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 999999) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '分页参数超出允许范围。');
    if (query.from && query.to && new Date(query.from).getTime() > new Date(query.to).getTime()) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '时间范围无效。');
    const count = await this.database.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM feedback_reports r WHERE ${where.join(' AND ')}`, params);
    const rows = await this.database.query<ListRow>(`SELECT r.id,r.description,r.surface,r.route_template,r.kind,r.project_id,r.status,r.updated_at,
      latest.id AS latest_event_id,latest.action AS latest_event_action,latest.to_status AS latest_event_to_status,
      latest.actor_subject AS latest_event_actor_subject,latest.request_id AS latest_event_request_id,latest.created_at AS latest_event_created_at
      FROM feedback_reports r LEFT JOIN LATERAL (
        SELECT id,action,to_status,actor_subject,request_id,created_at FROM feedback_events e WHERE e.feedback_id=r.id ORDER BY e.created_at DESC,e.id DESC LIMIT 1
      ) latest ON TRUE WHERE ${where.join(' AND ')} ORDER BY ${sort} LIMIT ${add(limit)} OFFSET ${add(offset)}`, params);
    const items: FeedbackListItem[] = rows.rows.map((row) => ({
      feedbackId: row.id, description: row.description, surface: row.surface, routeTemplate: row.route_template, kind: row.kind,
      projectId: row.project_id, status: row.status, updatedAt: iso(row.updated_at), latestEvent: row.latest_event_id ? {
        feedbackEventId: row.latest_event_id, action: row.latest_event_action!, toStatus: row.latest_event_to_status!, actorSubject: row.latest_event_actor_subject!, requestId: row.latest_event_request_id!, createdAt: iso(row.latest_event_created_at!),
      } satisfies FeedbackLatestEventSummary : null,
    }));
    return { items, total: Number(count.rows[0]?.total ?? 0), limit, offset };
  }

  async listEvents(feedbackId: string, query: FeedbackEventListQuery, principal: FeedbackPrincipal, manager: boolean): Promise<FeedbackEventList> {
    const row = await this.loadForPrincipal(feedbackId, principal, manager);
    if (!manager && row.project_id && !canAccessProject(principal, row.project_id)) throw feedbackNotFound();
    const limit = Number(query.limit ?? 100); const offset = Number(query.offset ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 999999) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '分页参数超出允许范围。');
    const count = await this.database.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM feedback_events WHERE feedback_id=$1', [feedbackId]);
    const page = await this.database.query<EventRow>('SELECT id,feedback_id,action,from_status,to_status,note,actor_subject,request_id,created_at FROM feedback_events WHERE feedback_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3', [feedbackId, limit, offset]);
    return { items: page.rows.map(toEvent), total: Number(count.rows[0]?.total ?? 0), limit, offset };
  }

  async addEvent(input: { feedbackId: string; body: FeedbackEventBody; idempotencyKey: string | undefined; requestId: string; principal: FeedbackPrincipal }): Promise<{ detail: FeedbackReportDetail; replay: boolean }> {
    const idempotencyKey = input.idempotencyKey?.trim();
    if (!idempotencyKey) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '缺少 Idempotency-Key。');
    const requestHash = digest({ feedbackId: input.feedbackId, ...input.body });
    return this.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`feedback:${input.feedbackId}`]);
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`feedback-event:${input.body.feedbackEventId}`]);
      await this.lockCommandKey(client, idempotencyKey);
      const idRow = await client.query<{ request_hash: string; idempotency_key: string }>('SELECT request_hash,idempotency_key FROM feedback_events WHERE id=$1 FOR UPDATE', [input.body.feedbackEventId]);
      if (idRow.rows[0]) {
        if (idRow.rows[0].request_hash !== requestHash || idRow.rows[0].idempotency_key !== idempotencyKey) throw feedbackConflict('FEEDBACK_EVENT_ID_REUSED', '反馈事件身份已被其他请求使用。', 'use_new_event_id');
        return { detail: await this.loadDetail(client, input.feedbackId), replay: true };
      }
      const keyRow = await client.query<{ request_hash: string; feedback_id: string }>('SELECT request_hash,feedback_id FROM feedback_events WHERE idempotency_key=$1 FOR UPDATE', [idempotencyKey]);
      if (keyRow.rows[0]) {
        if (keyRow.rows[0].request_hash !== requestHash || keyRow.rows[0].feedback_id !== input.feedbackId) throw feedbackConflict('FEEDBACK_IDEMPOTENCY_KEY_REUSED', '幂等键已用于另一反馈事件。', 'use_new_idempotency_key');
        return { detail: await this.loadDetail(client, input.feedbackId), replay: true };
      }
      const globalKey = await this.findGlobalCommandKey(client, idempotencyKey);
      if (globalKey) throw feedbackConflict('FEEDBACK_IDEMPOTENCY_KEY_REUSED', '幂等键已用于另一反馈命令。', 'use_new_idempotency_key');
      const report = await client.query<ReportRow>(`SELECT ${reportColumns} FROM feedback_reports WHERE id=$1 FOR UPDATE`, [input.feedbackId]);
      const current = report.rows[0]; if (!current) throw feedbackNotFound();
      const next = transition[input.body.action];
      if (!next || current.status !== next.from) throw feedbackConflict('FEEDBACK_EVENT_NOT_ALLOWED', '当前反馈状态不允许该操作。', 'refresh_feedback');
      await client.query(`INSERT INTO feedback_events(id,feedback_id,action,from_status,to_status,note,actor_subject,request_id,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [input.body.feedbackEventId, input.feedbackId, input.body.action, current.status, next.to, input.body.note?.trim() || null, input.principal.subject, input.requestId, idempotencyKey, requestHash]);
      await client.query('UPDATE feedback_reports SET status=$2,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1', [input.feedbackId, next.to]);
      return { detail: await this.loadDetail(client, input.feedbackId), replay: false };
    });
  }

  private async assertAttachmentAccess(feedbackId: string, principal: FeedbackPrincipal, manager: boolean) {
    const row = await this.loadForPrincipal(feedbackId, principal, manager);
    if (!manager && row.project_id && !canAccessProject(principal, row.project_id)) throw feedbackNotFound();
    return row;
  }

  async authorizeScreenshot(input: { feedbackId: string; body: FeedbackScreenshotAuthorizationBody; idempotencyKey: string | undefined; requestId: string; principal: FeedbackPrincipal; manager: boolean }): Promise<{ detail: FeedbackReportDetail; replay: boolean }> {
    const idempotencyKey = input.idempotencyKey?.trim(); if (!idempotencyKey) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '缺少 Idempotency-Key。');
    await this.assertAttachmentAccess(input.feedbackId, input.principal, input.manager);
    const requestHash = digest({ feedbackId: input.feedbackId, ...input.body });
    return this.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`feedback-attachment:${input.body.attachmentId}`]);
      await this.lockCommandKey(client, idempotencyKey);
      const idRow = await client.query<{ request_hash: string; feedback_id: string; idempotency_key: string }>('SELECT request_hash,feedback_id,idempotency_key FROM feedback_screenshot_attachments WHERE id=$1 FOR UPDATE', [input.body.attachmentId]);
      if (idRow.rows[0]) {
        if (idRow.rows[0].request_hash !== requestHash || idRow.rows[0].feedback_id !== input.feedbackId || idRow.rows[0].idempotency_key !== idempotencyKey) throw feedbackConflict('FEEDBACK_ATTACHMENT_ID_REUSED', '附件身份已被其他请求使用。', 'use_new_attachment_id');
        return { detail: await this.loadDetail(client, input.feedbackId), replay: true };
      }
      const keyRow = await client.query<{ request_hash: string; feedback_id: string }>('SELECT request_hash,feedback_id FROM feedback_screenshot_attachments WHERE idempotency_key=$1 FOR UPDATE', [idempotencyKey]);
      if (keyRow.rows[0]) {
        if (keyRow.rows[0].request_hash !== requestHash || keyRow.rows[0].feedback_id !== input.feedbackId) throw feedbackConflict('FEEDBACK_IDEMPOTENCY_KEY_REUSED', '幂等键已用于另一附件。', 'use_new_idempotency_key');
        return { detail: await this.loadDetail(client, input.feedbackId), replay: true };
      }
      const globalKey = await this.findGlobalCommandKey(client, idempotencyKey);
      if (globalKey) throw feedbackConflict('FEEDBACK_IDEMPOTENCY_KEY_REUSED', '幂等键已用于另一反馈命令。', 'use_new_idempotency_key');
      const report = await client.query<{ status: FeedbackReport['status']; screenshot_attachment_id: string | null }>('SELECT status,screenshot_attachment_id FROM feedback_reports WHERE id=$1 FOR UPDATE', [input.feedbackId]);
      if (!report.rows[0]) throw feedbackNotFound();
      if (report.rows[0].status !== 'new') throw feedbackConflict('FEEDBACK_ATTACHMENT_NOT_ALLOWED', '关闭或处理中反馈不能新增截图。', 'use_open_feedback');
      if (report.rows[0].screenshot_attachment_id) throw feedbackConflict('FEEDBACK_ATTACHMENT_NOT_ALLOWED', '每条反馈只能确认一张截图。', 'use_existing_attachment');
      const objectKey = `feedback/${input.feedbackId}/${input.body.attachmentId}`;
      try { await this.screenshotStorage.authorize({ objectKey, contentType: input.body.contentType, sizeBytes: input.body.sizeBytes, contentDigest: input.body.contentDigest }); }
      catch { throw feedbackInvalid('FEEDBACK_ATTACHMENT_STORAGE_FAILED', '截图存储暂时不可用。', 'retry_screenshot_authorization'); }
      await client.query(`INSERT INTO feedback_screenshot_attachments(id,feedback_id,status,content_type,size_bytes,content_digest,request_id,idempotency_key,request_hash,privacy_confirmed_at,privacy_confirmed_by) VALUES($1,$2,'authorized',$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,$9)`, [input.body.attachmentId, input.feedbackId, input.body.contentType, input.body.sizeBytes, input.body.contentDigest, input.requestId, idempotencyKey, requestHash, input.principal.subject]);
      await client.query('UPDATE feedback_reports SET screenshot_attachment_id=$2,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1', [input.feedbackId, input.body.attachmentId]);
      return { detail: await this.loadDetail(client, input.feedbackId), replay: false };
    });
  }

  async uploadScreenshot(input: { feedbackId: string; attachmentId: string; bytes: Uint8Array; contentType: string; idempotencyKey: string | undefined; requestId: string; principal: FeedbackPrincipal; manager: boolean }): Promise<{ detail: FeedbackReportDetail; replay: boolean }> {
    const idempotencyKey = input.idempotencyKey?.trim(); if (!idempotencyKey) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '缺少 Idempotency-Key。');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(input.contentType) || input.bytes.byteLength < 1 || input.bytes.byteLength > 5_000_000) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '截图类型或大小无效。');
    await this.assertAttachmentAccess(input.feedbackId, input.principal, input.manager);
    const contentDigest = createHash('sha256').update(input.bytes).digest('hex');
    const requestHash = digest({ feedbackId: input.feedbackId, attachmentId: input.attachmentId, contentType: input.contentType, sizeBytes: input.bytes.byteLength, contentDigest });
    return this.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`feedback-attachment:${input.attachmentId}`]);
      await this.lockCommandKey(client, idempotencyKey);
      const row = await client.query<AttachmentRow & { upload_idempotency_key: string | null; upload_request_hash: string | null }>('SELECT id,feedback_id,status,content_type,size_bytes,content_digest,privacy_confirmed_at,created_at,updated_at,upload_idempotency_key,upload_request_hash FROM feedback_screenshot_attachments WHERE id=$1 AND feedback_id=$2 FOR UPDATE', [input.attachmentId, input.feedbackId]);
      const attachment = row.rows[0]; if (!attachment) throw feedbackNotFound();
      if (attachment.upload_idempotency_key) {
        if (attachment.upload_idempotency_key !== idempotencyKey || attachment.upload_request_hash !== requestHash) throw feedbackConflict('FEEDBACK_IDEMPOTENCY_KEY_REUSED', '幂等键已用于另一截图上传请求。', 'use_new_idempotency_key');
        return { detail: await this.loadDetail(client, input.feedbackId), replay: true };
      }
      const globalKey = await this.findGlobalCommandKey(client, idempotencyKey);
      if (globalKey) throw feedbackConflict('FEEDBACK_IDEMPOTENCY_KEY_REUSED', '幂等键已用于另一反馈命令。', 'use_new_idempotency_key');
      if (attachment.status !== 'authorized' || attachment.content_type !== input.contentType || attachment.size_bytes !== input.bytes.byteLength || attachment.content_digest !== contentDigest) throw feedbackConflict('FEEDBACK_ATTACHMENT_MISMATCH', '截图上传内容与授权不一致。', 're-authorize_screenshot');
      try { await this.screenshotStorage.upload({ objectKey: `feedback/${input.feedbackId}/${input.attachmentId}`, contentType: input.contentType, bytes: input.bytes }); }
      catch { throw feedbackInvalid('FEEDBACK_ATTACHMENT_STORAGE_FAILED', '截图存储暂时不可用。', 'retry_screenshot_upload'); }
      await client.query('UPDATE feedback_screenshot_attachments SET upload_idempotency_key=$2,upload_request_hash=$3,upload_request_id=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$1', [input.attachmentId, idempotencyKey, requestHash, input.requestId]);
      return { detail: await this.loadDetail(client, input.feedbackId), replay: false };
    });
  }

  async readScreenshot(feedbackId: string, attachmentId: string, principal: FeedbackPrincipal, manager: boolean) {
    await this.assertAttachmentAccess(feedbackId, principal, manager);
    const result = await this.database.query<AttachmentRow>('SELECT id,feedback_id,status,content_type,size_bytes,content_digest,privacy_confirmed_at,created_at,updated_at FROM feedback_screenshot_attachments WHERE id=$1 AND feedback_id=$2', [attachmentId, feedbackId]);
    const attachment = result.rows[0]; if (!attachment || attachment.status !== 'uploaded') throw feedbackNotFound();
    try {
      const stored = await this.screenshotStorage.read({ objectKey: `feedback/${feedbackId}/${attachmentId}` });
      if (stored.contentType !== attachment.content_type || stored.sizeBytes !== attachment.size_bytes || stored.contentDigest !== attachment.content_digest) throw new Error('截图对象不一致。');
      return { contentType: stored.contentType, bytes: stored.bytes };
    } catch { throw feedbackInvalid('FEEDBACK_ATTACHMENT_STORAGE_FAILED', '截图对象暂时不可读取。', 'retry_screenshot_read'); }
  }

  async completeScreenshot(input: { feedbackId: string; attachmentId: string; idempotencyKey: string | undefined; requestId: string; principal: FeedbackPrincipal; manager: boolean }) {
    const idempotencyKey = input.idempotencyKey?.trim(); if (!idempotencyKey) throw feedbackInvalid('FEEDBACK_INVALID_CONTEXT', '缺少 Idempotency-Key。');
    await this.assertAttachmentAccess(input.feedbackId, input.principal, input.manager);
    const requestHash = digest({ feedbackId: input.feedbackId, attachmentId: input.attachmentId, action: 'complete' });
    return this.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`feedback-attachment:${input.attachmentId}`]);
      await this.lockCommandKey(client, idempotencyKey);
      const row = await client.query<AttachmentRow & { complete_idempotency_key: string | null; complete_request_hash: string | null }>('SELECT id,feedback_id,status,content_type,size_bytes,content_digest,privacy_confirmed_at,created_at,updated_at,complete_idempotency_key,complete_request_hash FROM feedback_screenshot_attachments WHERE id=$1 AND feedback_id=$2 FOR UPDATE', [input.attachmentId, input.feedbackId]);
      const attachment = row.rows[0]; if (!attachment) throw new FeedbackError('FEEDBACK_ATTACHMENT_NOT_FOUND', '截图附件不存在或不属于该反馈。', 404, 'refresh_feedback');
      if (attachment.complete_idempotency_key) {
        if (attachment.complete_idempotency_key !== idempotencyKey || attachment.complete_request_hash !== requestHash) throw feedbackConflict('FEEDBACK_IDEMPOTENCY_KEY_REUSED', '幂等键已用于另一截图完成请求。', 'use_new_idempotency_key');
        return { detail: await this.loadDetail(client, input.feedbackId), replay: true };
      }
      const globalKey = await this.findGlobalCommandKey(client, idempotencyKey);
      if (globalKey) throw feedbackConflict('FEEDBACK_IDEMPOTENCY_KEY_REUSED', '幂等键已用于另一反馈命令。', 'use_new_idempotency_key');
      if (attachment.status !== 'authorized') throw feedbackConflict('FEEDBACK_ATTACHMENT_MISMATCH', '截图当前状态不能完成确认。', 'refresh_feedback');
      try {
        const stored = await this.screenshotStorage.complete({ objectKey: `feedback/${input.feedbackId}/${input.attachmentId}`, contentType: attachment.content_type, sizeBytes: attachment.size_bytes, contentDigest: attachment.content_digest });
        if (stored.sizeBytes !== attachment.size_bytes || stored.contentDigest !== attachment.content_digest) throw new Error('digest mismatch');
      } catch { throw feedbackInvalid('FEEDBACK_ATTACHMENT_STORAGE_FAILED', '截图对象校验失败。', 'upload_screenshot_again'); }
      await client.query(`UPDATE feedback_screenshot_attachments SET status='uploaded',complete_idempotency_key=$2,complete_request_hash=$3,complete_request_id=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [input.attachmentId, idempotencyKey, requestHash, input.requestId]);
      await client.query('UPDATE feedback_reports SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1', [input.feedbackId]);
      return { detail: await this.loadDetail(client, input.feedbackId), replay: false };
    });
  }
}
