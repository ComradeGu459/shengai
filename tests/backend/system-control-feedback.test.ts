import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { InMemoryFeedbackScreenshotStorageFake } from '../../backend/src/modules/feedback/in-memory-feedback-screenshot-storage.fake.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');

let databaseName = '';
let admin: any;
let pool: any;
let app: any;
let storage: InMemoryFeedbackScreenshotStorageFake;
let projectA = '';
let projectB = '';

const principals = {
  employeeA: { subject: 'employee-a', audience: 'employee', capabilities: ['feedback:create'], projectIds: [] as string[] },
  employeeB: { subject: 'employee-b', audience: 'employee', capabilities: ['feedback:create'], projectIds: [] as string[] },
  manager: { subject: 'feedback-manager', audience: 'system-control', capabilities: ['feedback:create', 'system-control:feedback:read', 'system-control:feedback:write'] },
  employeeWithoutCreate: { subject: 'employee-without-create', audience: 'employee', capabilities: [] },
  employeeWithoutProjects: { subject: 'employee-without-projects', audience: 'employee', capabilities: ['feedback:create'] },
  employeeAWithoutProjects: { subject: 'employee-a', audience: 'employee', capabilities: ['feedback:create'] },
};

const headers = (identity: keyof typeof principals | 'none', idempotencyKey?: string) => ({
  'x-feedback-test-identity': identity === 'employeeA' ? 'employee-a' : identity === 'employeeB' ? 'employee-b' : identity === 'employeeWithoutCreate' ? 'employee-without-create' : identity === 'employeeWithoutProjects' ? 'employee-without-projects' : identity === 'employeeAWithoutProjects' ? 'employee-a-without-projects' : identity,
  ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
});

const body = (feedbackId = randomUUID(), projectId = projectA) => ({
  feedbackId,
  kind: 'unclear_next_step',
  description: '下一步按钮说明不清晰',
  projectId,
  routeTemplate: '/projects/:projectId/pre-review',
  buildVersion: 'test-1',
  requestIds: ['request-feedback-1'],
  browserSummary: { family: 'Chromium', version: '128', platform: 'Windows' },
  viewport: { width: 1440, height: 900 },
  timezone: 'Asia/Shanghai',
  performanceSummary: { pageLoadMs: 120, interactionMs: 30 },
});

const createFeedback = async (feedbackId = randomUUID(), projectId = projectA, identity: 'employeeA' | 'employeeB' = 'employeeA', extra: Record<string, unknown> = {}) =>
  app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers(identity, `create-${randomUUID()}`), payload: { ...body(feedbackId, projectId), ...extra } });

const addManagerEvent = async (feedbackId: string, action: string, eventId = randomUUID(), key = randomUUID()) =>
  app.inject({ method: 'POST', url: `/api/system-control/feedback-reports/${feedbackId}/events`, headers: headers('manager', `event-${key}`), payload: { feedbackEventId: eventId, action, note: `记录${action}` } });

const createProject = async (name: string) => {
  const id = randomUUID();
  await pool.query(`INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,$2,'ready','active',1,'feedback-test','feedback-test')`, [id, name]);
  return id;
};

const countFacts = async () => (await pool.query(`SELECT
  (SELECT count(*)::int FROM feedback_reports) AS reports,
  (SELECT count(*)::int FROM feedback_events) AS events,
  (SELECT count(*)::int FROM feedback_screenshot_attachments) AS attachments`)).rows[0];

beforeAll(async () => {
  const source = new URL(getDatabaseUrl());
  const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  databaseName = `qimao_feedback_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const databaseUrl = new URL(source); databaseUrl.pathname = `/${databaseName}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: `${backendRoot}/migrations`, direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 6 });
  const empty = await pool.query(`SELECT (SELECT count(*)::int FROM feedback_reports) AS reports, (SELECT count(*)::int FROM feedback_events) AS events, (SELECT count(*)::int FROM feedback_screenshot_attachments) AS attachments`);
  expect(empty.rows[0]).toEqual({ reports: 0, events: 0, attachments: 0 });
  storage = new InMemoryFeedbackScreenshotStorageFake();
  app = createApp({
    database: pool,
    feedbackScreenshotStorage: storage,
    systemControlPrincipalResolver: (request) => {
      const identity = request.headers['x-feedback-test-identity'];
      const key = Array.isArray(identity) ? identity[0] : identity;
      if (key === 'employee-a') return principals.employeeA;
      if (key === 'employee-b') return principals.employeeB;
      if (key === 'manager') return principals.manager;
      if (key === 'employee-without-create') return principals.employeeWithoutCreate;
      if (key === 'employee-without-projects') return principals.employeeWithoutProjects;
      if (key === 'employee-a-without-projects') return principals.employeeAWithoutProjects;
      return null;
    },
  });
  await app.ready();
  projectA = await createProject('反馈项目 A');
  projectB = await createProject('反馈项目 B');
  principals.employeeA.projectIds = [projectA];
  principals.employeeB.projectIds = [projectB];
});

beforeEach(async () => {
  await pool.query('TRUNCATE feedback_events, feedback_screenshot_attachments, feedback_reports RESTART IDENTITY CASCADE');
  await pool.query('DELETE FROM projects');
  projectA = await createProject('反馈项目 A');
  projectB = await createProject('反馈项目 B');
  principals.employeeA.projectIds = [projectA];
  principals.employeeB.projectIds = [projectB];
  storage.clear();
});

afterAll(async () => {
  if (app) await app.close();
  if (admin && databaseName) {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [databaseName]);
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  }
  if (admin) await admin.end();
});

describe('BACK-SYSTEM-08A 测试反馈与错误观测', () => {
  it('逐请求创建者来源、项目隔离与稳定创建幂等', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('none', 'none-1'), payload: body() })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeWithoutCreate', 'deny-1'), payload: body() })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeWithoutProjects', 'scope-1'), payload: body() })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeA', 'strict-1'), payload: { ...body(), surface: 'system_control' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeA', 'strict-2'), payload: { ...body(), description: '   ' } })).statusCode).toBe(422);
    const feedbackId = randomUUID(); const firstBody = body(feedbackId); const key = `create-${randomUUID()}`;
    const first = await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeA', key), payload: firstBody });
    expect(first.statusCode).toBe(201); expect(first.json()).toMatchObject({ feedbackId, surface: 'employee', subject: 'employee-a', projectId: projectA, status: 'new', revision: 1 });
    const replay = await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeA', key), payload: firstBody });
    expect(replay.statusCode).toBe(200); expect(replay.json()).toEqual(first.json());
    const changed = await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeA', key), payload: { ...firstBody, description: '不同描述' } });
    expect(changed.statusCode).toBe(409);
    const sameIdOtherKey = await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeA', `create-other-${randomUUID()}`), payload: firstBody });
    expect(sameIdOtherKey.statusCode).toBe(409);
    const crossProject = await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeA', `cross-project-${randomUUID()}`), payload: body(randomUUID(), projectB) });
    expect(crossProject.statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/feedback-reports/${feedbackId}`, headers: headers('employeeB') })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/feedback-reports/${feedbackId}`, headers: headers('employeeAWithoutProjects') })).statusCode).toBe(404);
    const visible = await app.inject({ method: 'GET', url: `/api/feedback-reports/${feedbackId}`, headers: headers('employeeA') });
    expect(visible.statusCode).toBe(200); expect(visible.json().report).toEqual(first.json());
    expect(JSON.stringify(visible.json())).not.toMatch(/objectKey|secret|cookie|authorization|https?:\/\//i);
    expect((await countFacts()).reports).toBe(1);
  });

  it('管理员事件只允许合法状态链，关闭后重开且事件历史只追加', async () => {
    const feedbackId = randomUUID();
    expect((await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeA', `create-${randomUUID()}`), payload: body(feedbackId) })).statusCode).toBe(201);
    const transition = async (action: string, eventId = randomUUID(), key = randomUUID()) => app.inject({ method: 'POST', url: `/api/system-control/feedback-reports/${feedbackId}/events`, headers: headers('manager', `event-${key}`), payload: { feedbackEventId: eventId, action, note: `记录${action}` } });
    expect((await transition('confirmed')).statusCode).toBe(201);
    const fixingId = randomUUID(); const fixing = await transition('fixing_started', fixingId); expect(fixing.statusCode).toBe(201);
    const replay = await transition('fixing_started', fixingId, 'event-replay'); expect(replay.statusCode).toBe(409);
    expect((await transition('closed')).statusCode).toBe(409);
    expect((await transition('retest_requested')).statusCode).toBe(201);
    expect((await transition('closed')).statusCode).toBe(201);
    expect((await transition('reopened')).statusCode).toBe(201);
    const detail = await app.inject({ method: 'GET', url: `/api/system-control/feedback-reports/${feedbackId}`, headers: headers('manager') });
    expect(detail.statusCode).toBe(200); expect(detail.json().report.status).toBe('new'); expect(detail.json().events).toHaveLength(6);
    expect((await pool.query('SELECT count(*)::int AS count FROM feedback_events WHERE feedback_id=$1', [feedbackId])).rows[0].count).toBe(6);
    const eventId = detail.json().events[0].feedbackEventId;
    const eventRead = await app.inject({ method: 'GET', url: `/api/system-control/feedback-events/${eventId}`, headers: headers('manager') });
    expect(eventRead.statusCode).toBe(200); expect(eventRead.json().feedbackEventId).toBe(eventId);
    expect((await app.inject({ method: 'GET', url: `/api/system-control/feedback-events/${randomUUID()}`, headers: headers('manager') })).statusCode).toBe(404);
  });

  it('截图只能经过授权→完成链，重放与同身份异键稳定冲突且不泄露对象身份', async () => {
    const feedbackId = randomUUID();
    await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeA', `create-${randomUUID()}`), payload: body(feedbackId) });
    const attachmentId = randomUUID();
    const bytes = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000200000500010d0a2db40000000049454e44ae426082', 'hex');
    const digest = createHash('sha256').update(bytes).digest('hex');
    const authBody = { attachmentId, contentType: 'image/png', sizeBytes: bytes.length, contentDigest: digest, privacyConfirmed: true as const };
    expect((await app.inject({ method: 'POST', url: `/api/feedback-reports/${feedbackId}/screenshot-authorizations`, headers: headers('employeeA', `privacy-${randomUUID()}`), payload: { ...authBody, privacyConfirmed: false } })).statusCode).toBe(400);
    expect((await countFacts()).attachments).toBe(0);
    const authorized = await app.inject({ method: 'POST', url: `/api/feedback-reports/${feedbackId}/screenshot-authorizations`, headers: headers('employeeA', `attachment-${randomUUID()}`), payload: authBody });
    expect(authorized.statusCode).toBe(201); expect(authorized.json().attachment).toMatchObject({ attachmentId, status: 'authorized', sizeBytes: bytes.length, privacyConfirmedAt: expect.any(String) }); expect(JSON.stringify(authorized.json())).not.toMatch(/objectKey|feedback\/|secret/i);
    const replay = await app.inject({ method: 'POST', url: `/api/feedback-reports/${feedbackId}/screenshot-authorizations`, headers: headers('employeeA', `attachment-replay-${randomUUID()}`), payload: authBody }); expect(replay.statusCode).toBe(409);
    const uploaded = await app.inject({ method: 'POST', url: `/api/feedback-reports/${feedbackId}/screenshot-authorizations/${attachmentId}/content`, headers: { ...headers('employeeA', `upload-${randomUUID()}`), 'content-type': 'image/png' }, payload: bytes });
    expect(uploaded.statusCode).toBe(201); expect(uploaded.json().attachment.status).toBe('authorized');
    const completeKey = `complete-${randomUUID()}`;
    const completed = await app.inject({ method: 'POST', url: `/api/feedback-reports/${feedbackId}/screenshot-authorizations/${attachmentId}/complete`, headers: headers('employeeA', completeKey), payload: {} });
    expect(completed.statusCode).toBe(201); expect(completed.json().attachment.status).toBe('uploaded');
    const attachmentRead = await app.inject({ method: 'GET', url: `/api/feedback-reports/${feedbackId}/screenshot-authorizations/${attachmentId}`, headers: headers('employeeA') });
    expect(attachmentRead.statusCode).toBe(200); expect(attachmentRead.json()).toMatchObject({ attachmentId, status: 'uploaded' });
    const contentRead = await app.inject({ method: 'GET', url: `/api/system-control/feedback-reports/${feedbackId}/screenshot-authorizations/${attachmentId}/content`, headers: headers('manager') });
    expect(contentRead.statusCode).toBe(200); expect(contentRead.headers['content-type']).toContain('image/png'); expect(Buffer.from(contentRead.rawPayload).equals(bytes)).toBe(true);
    const completeReplay = await app.inject({ method: 'POST', url: `/api/feedback-reports/${feedbackId}/screenshot-authorizations/${attachmentId}/complete`, headers: headers('employeeA', completeKey), payload: {} }); expect(completeReplay.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/feedback-reports/${feedbackId}/screenshot-authorizations/${attachmentId}/complete`, headers: headers('employeeB', 'complete-other'), payload: {} })).statusCode).toBe(404);
  });

  it('反馈事件、附件授权与完成命令共享全局幂等键并发所有权', async () => {
    const feedbackOne = randomUUID(); const feedbackTwo = randomUUID();
    expect((await createFeedback(feedbackOne)).statusCode).toBe(201);
    expect((await createFeedback(feedbackTwo)).statusCode).toBe(201);
    const sharedEventKey = `shared-event-${randomUUID()}`;
    const eventResults = await Promise.all([
      addManagerEvent(feedbackOne, 'confirmed', randomUUID(), sharedEventKey),
      addManagerEvent(feedbackTwo, 'confirmed', randomUUID(), sharedEventKey),
    ]);
    expect(eventResults.map((result) => result.statusCode).sort()).toEqual([201, 409]);
    expect(eventResults.every((result) => result.statusCode !== 500)).toBe(true);

    const attachmentOne = randomUUID(); const attachmentTwo = randomUUID(); const oneByte = Buffer.from([0x89]); const attachmentDigest = createHash('sha256').update(oneByte).digest('hex');
    const commonAuthorizationKey = `shared-attachment-${randomUUID()}`;
    const authorizationResults = await Promise.all([
      app.inject({ method: 'POST', url: `/api/feedback-reports/${feedbackOne}/screenshot-authorizations`, headers: headers('employeeA', commonAuthorizationKey), payload: { attachmentId: attachmentOne, contentType: 'image/png', sizeBytes: 1, contentDigest: attachmentDigest, privacyConfirmed: true } }),
      app.inject({ method: 'POST', url: `/api/feedback-reports/${feedbackTwo}/screenshot-authorizations`, headers: headers('employeeA', commonAuthorizationKey), payload: { attachmentId: attachmentTwo, contentType: 'image/png', sizeBytes: 1, contentDigest: attachmentDigest, privacyConfirmed: true } }),
    ]);
    expect(authorizationResults.map((result) => result.statusCode).sort()).toEqual([201, 409]);
    const winningFeedbackId = authorizationResults[0].statusCode === 201 ? feedbackOne : feedbackTwo;
    const winningAttachmentId = authorizationResults[0].statusCode === 201 ? attachmentOne : attachmentTwo;
    const winnerUpload = await app.inject({ method: 'POST', url: `/api/feedback-reports/${winningFeedbackId}/screenshot-authorizations/${winningAttachmentId}/content`, headers: { ...headers('employeeA', `upload-${randomUUID()}`), 'content-type': 'image/png' }, payload: oneByte });
    expect(winnerUpload.statusCode).toBe(201);
    const completionFeedbackOne = randomUUID(); const completionFeedbackTwo = randomUUID();
    await createFeedback(completionFeedbackOne); await createFeedback(completionFeedbackTwo);
    const completionAttachmentOne = randomUUID(); const completionAttachmentTwo = randomUUID();
    for (const [completionFeedback, completionAttachment] of [[completionFeedbackOne, completionAttachmentOne], [completionFeedbackTwo, completionAttachmentTwo]] as const) {
      expect((await app.inject({ method: 'POST', url: `/api/feedback-reports/${completionFeedback}/screenshot-authorizations`, headers: headers('employeeA', `auth-${randomUUID()}`), payload: { attachmentId: completionAttachment, contentType: 'image/png', sizeBytes: 1, contentDigest: attachmentDigest, privacyConfirmed: true } })).statusCode).toBe(201);
      expect((await app.inject({ method: 'POST', url: `/api/feedback-reports/${completionFeedback}/screenshot-authorizations/${completionAttachment}/content`, headers: { ...headers('employeeA', `upload-${randomUUID()}`), 'content-type': 'image/png' }, payload: oneByte })).statusCode).toBe(201);
    }
    const sharedCompletionKey = `shared-complete-${randomUUID()}`;
    const completionResults = await Promise.all([
      app.inject({ method: 'POST', url: `/api/feedback-reports/${completionFeedbackOne}/screenshot-authorizations/${completionAttachmentOne}/complete`, headers: headers('employeeA', sharedCompletionKey), payload: {} }),
      app.inject({ method: 'POST', url: `/api/feedback-reports/${completionFeedbackTwo}/screenshot-authorizations/${completionAttachmentTwo}/complete`, headers: headers('employeeA', sharedCompletionKey), payload: {} }),
    ]);
    expect(completionResults.map((result) => result.statusCode).sort()).toEqual([201, 409]);
    expect((await countFacts()).events).toBe(5);
  });

  it('管理员列表服务端筛选排序分页，空页保留真实 total 且读取零写副作用', async () => {
    const firstId = randomUUID(); const secondId = randomUUID();
    await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeA', `a-${randomUUID()}`), payload: body(firstId, projectA) });
    await app.inject({ method: 'POST', url: '/api/feedback-reports', headers: headers('employeeB', `b-${randomUUID()}`), payload: { ...body(secondId, projectB), kind: 'slow', description: '项目 B 响应较慢' } });
    const before = await countFacts();
    const page = await app.inject({ method: 'GET', url: `/api/system-control/feedback-reports?projectId=${projectA}&sort=createdAt&sortDirection=asc&limit=1&offset=0`, headers: headers('manager') });
    expect(page.statusCode).toBe(200); expect(page.json().total).toBe(1); expect(page.json().items).toHaveLength(1); expect(page.json().items[0].projectId).toBe(projectA);
    expect(page.json().items[0].latestEvent).toMatchObject({ action: 'created', toStatus: 'new' });
    expect(page.json().items[0]).not.toHaveProperty('browserSummary'); expect(page.json().items[0]).not.toHaveProperty('performanceSummary'); expect(page.json().items[0]).not.toHaveProperty('requestIds');
    const search = await app.inject({ method: 'GET', url: '/api/system-control/feedback-reports?search=request-feedback-1&limit=10&offset=0', headers: headers('manager') });
    expect(search.statusCode).toBe(200); expect(search.json().total).toBe(2);
    const empty = await app.inject({ method: 'GET', url: '/api/system-control/feedback-reports?status=new&limit=1&offset=20', headers: headers('manager') });
    expect(empty.statusCode).toBe(200); expect(empty.json().items).toEqual([]); expect(empty.json().total).toBe(2);
    const after = await countFacts(); expect(after).toEqual(before);
    expect((await app.inject({ method: 'GET', url: '/api/system-control/feedback-reports?limit=1&offset=0', headers: headers('employeeA') })).statusCode).toBe(403);
  });

  it('管理员事件历史服务端分页覆盖超过首屏且空页保留真实 total', async () => {
    const feedbackId = randomUUID();
    expect((await createFeedback(feedbackId)).statusCode).toBe(201);
    for (let index = 0; index < 21; index += 1) {
      expect((await addManagerEvent(feedbackId, 'confirmed')).statusCode).toBe(201);
      expect((await addManagerEvent(feedbackId, 'fixing_started')).statusCode).toBe(201);
      expect((await addManagerEvent(feedbackId, 'retest_requested')).statusCode).toBe(201);
      expect((await addManagerEvent(feedbackId, 'closed')).statusCode).toBe(201);
      expect((await addManagerEvent(feedbackId, 'reopened')).statusCode).toBe(201);
    }
    const before = await countFacts();
    const first = await app.inject({ method: 'GET', url: `/api/system-control/feedback-reports/${feedbackId}/events?limit=100&offset=0`, headers: headers('manager') });
    const second = await app.inject({ method: 'GET', url: `/api/system-control/feedback-reports/${feedbackId}/events?limit=100&offset=100`, headers: headers('manager') });
    const empty = await app.inject({ method: 'GET', url: `/api/system-control/feedback-reports/${feedbackId}/events?limit=100&offset=1000`, headers: headers('manager') });
    const invalidPage = await app.inject({ method: 'GET', url: `/api/system-control/feedback-reports/${feedbackId}/events?limit=0&offset=-1`, headers: headers('manager') });
    expect(first.statusCode).toBe(200); expect(second.statusCode).toBe(200); expect(empty.statusCode).toBe(200);
    expect(invalidPage.statusCode).toBe(400);
    expect(first.json().total).toBe(106); expect(first.json().items).toHaveLength(100); expect(second.json().items).toHaveLength(6); expect(empty.json().items).toEqual([]); expect(empty.json().total).toBe(106);
    expect(new Set([...first.json().items, ...second.json().items].map((item: { feedbackEventId: string }) => item.feedbackEventId)).size).toBe(106);
    expect(await countFacts()).toEqual(before);
  });
});
