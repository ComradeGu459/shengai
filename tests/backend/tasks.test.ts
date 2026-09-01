import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';
import { getDatabaseUrl } from '../../backend/src/config.js';

const requireBackendDependency = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackendDependency('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackendDependency('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');

let temporaryDatabaseName: string | null = null;
let adminPool: any = null;
let pool: any = null;
let app: any = null;
let projectA: string;
let projectB: string;

const uuid = () => randomUUID();
const digest = () => 'b'.repeat(64);
const employee = { subject: 'task-center-employee', audience: 'employee', capabilities: ['tasks:read'] };
const headers = (identity: 'employee' | 'project-a' | 'missing' | 'system') => ({ 'x-task-test-identity': identity });

beforeAll(async () => {
  const sourceUrl = new URL(getDatabaseUrl());
  const adminUrl = new URL(sourceUrl);
  adminUrl.pathname = '/postgres';
  temporaryDatabaseName = `qimao_tasks_${process.pid}_${uuid().replaceAll('-', '').slice(0, 10)}`;
  adminPool = new pg.Pool({ connectionString: adminUrl.toString(), max: 1, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
  await adminPool.query(`CREATE DATABASE "${temporaryDatabaseName}"`);
  const databaseUrl = new URL(sourceUrl);
  databaseUrl.pathname = `/${temporaryDatabaseName}`;
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 3, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
  const appDatabase = {
    query: (...args: any[]) => pool.query(...args),
    connect: (...args: any[]) => pool.connect(...args),
    end: async () => undefined,
  };
  app = createApp({
    database: appDatabase,
    systemControlPrincipalResolver: (request) => {
      const identity = request.headers['x-task-test-identity'];
      if (identity === 'employee') return employee;
      if (identity === 'project-a') return { ...employee, subject: 'project-a-employee', projectIds: [projectA] };
      if (identity === 'system') return { subject: 'system', audience: 'system-control', capabilities: ['tasks:read'] };
      return null;
    },
  });
  await app.ready();
});

beforeEach(async () => {
  await pool.query(`TRUNCATE asr_dispatch_groups, projects CASCADE`);
  projectA = '';
  projectB = '';
});

afterAll(async () => {
  if (app) await app.close();
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (adminPool && temporaryDatabaseName) {
    await adminPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()', [temporaryDatabaseName]);
    await adminPool.query(`DROP DATABASE IF EXISTS "${temporaryDatabaseName}"`);
    const remaining = await adminPool.query('SELECT 1 FROM pg_database WHERE datname=$1', [temporaryDatabaseName]);
    expect(remaining.rowCount).toBe(0);
  }
  if (adminPool) await adminPool.end();
});

const seedProject = async (name: string) => {
  const projectId = uuid();
  const manifestId = uuid();
  const draftId = uuid();
  const termVersionId = uuid();
  const assetId = uuid();
  await pool.query(`INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,$2,'ready','active',1,'tasks-test','tasks-test')`, [projectId, name]);
  await pool.query(`INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'tasks','tasks-test')`, [manifestId, projectId]);
  await pool.query(`INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'tasks','confirmed')`, [draftId, projectId, digest()]);
  await pool.query(`INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version) VALUES($1,$2,1,$3,$4,'tasks')`, [termVersionId, projectId, draftId, digest()]);
  await pool.query(`INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'tasks.mp4','video',1,'sha256',$4,CURRENT_TIMESTAMP)`, [assetId, projectId, `tasks/${assetId}`, digest()]);
  return { projectId, manifestId, termVersionId, assetId };
};

const seedFacts = async () => {
  const first = await seedProject('tasks-alpha');
  const second = await seedProject('tasks-beta');
  projectA = first.projectId;
  projectB = second.projectId;

  const dispatchId = uuid();
  const dispatchBatch = uuid();
  const standaloneBatch = uuid();
  const dispatchJob = uuid();
  const dispatchResult = uuid();
  await pool.query(`INSERT INTO asr_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,provider,adapter,model,language,config_digest,hotword_digest,hotword_term_count,hotword_alias_count,hotword_filtered_count,hotword_truncated_count,status) VALUES($1,$2,'single',ARRAY[1],$3,$4,1,'fake','fake-asr','v1','zh-CN',$5,$5,0,0,0,0,'completed')`, [dispatchBatch, first.projectId, first.termVersionId, first.manifestId, digest()]);
  await pool.query(`INSERT INTO asr_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,provider,adapter,model,language,config_digest,hotword_digest,hotword_term_count,hotword_alias_count,hotword_filtered_count,hotword_truncated_count,status) VALUES($1,$2,'single',ARRAY[1,2],$3,$4,1,'fake','fake-asr','v1','zh-CN',$5,$5,0,0,0,0,'failed')`, [standaloneBatch, first.projectId, first.termVersionId, first.manifestId, digest()]);
  await pool.query(`INSERT INTO asr_jobs(id,batch_id,project_id,episode_number,manifest_id,asset_id,asset_original_filename,asset_checksum_algorithm,asset_checksum_value,term_version_id,config_digest,hotword_digest,status) VALUES($1,$2,$3,1,$4,$5,'tasks.mp4','sha256',$6,$7,$8,$8,'completed')`, [dispatchJob, dispatchBatch, first.projectId, first.manifestId, first.assetId, digest(), first.termVersionId, digest()]);
  await pool.query(`INSERT INTO asr_dispatch_groups(id,project_ids,status,request_id) VALUES($1,$2,'accepted','dispatch-request')`, [dispatchId, [first.projectId, second.projectId]]);
  await pool.query(`INSERT INTO asr_dispatch_project_results(id,dispatch_group_id,project_id,selection_order,status,batch_id) VALUES($1,$2,$3,1,'accepted',$4),($5,$2,$6,2,'pending',NULL)`, [dispatchResult, dispatchId, first.projectId, dispatchBatch, uuid(), second.projectId]);

  const screenBatch = uuid();
  await pool.query(`INSERT INTO screen_text_batches(id,project_id,scope_kind,episode_numbers,term_version_id,manifest_id,manifest_version,execution_kind,provider,adapter,model,language,deployment,input_version,output_version,capabilities,config_digest,frame_strategy_version,dedupe_strategy_version,term_projection,term_projection_entries,status,revision,request_id) VALUES($1,$2,'single',ARRAY[1],$3,$4,1,'cloud_api','fake','fake-ocr','v1','zh-CN','tasks','in','out','{}',$5,'frame','dedupe','{}','[]','review_pending',1,'screen-request')`, [screenBatch, second.projectId, second.termVersionId, second.manifestId, digest()]);

  const termRun = uuid();
  await pool.query(`INSERT INTO term_extraction_runs(id,project_id,source_srt_set_digest,prompt_version,adapter,status,request_id,cue_count,candidate_count) VALUES($1,$2,$3,'tasks','fake','completed','terms-request',2,1)`, [termRun, first.projectId, digest()]);

  const preSession = uuid();
  const preJob = uuid();
  await pool.query(`INSERT INTO pre_edit_sessions(id,project_id,project_version,source_srt_set_digest,term_version_id,manifest_id,manifest_version,source_digest,source_snapshot,algorithm_version,format_policy_version,status) VALUES($1,$2,1,$3,$4,$5,1,$3,'{}','tasks','tasks','ready')`, [preSession, first.projectId, digest(), first.termVersionId, first.manifestId]);
  await pool.query(`INSERT INTO pre_edit_prepare_jobs(id,session_id,status) VALUES($1,$2,'queued')`, [preJob, preSession]);

  const preRelease = uuid();
  const acceptanceSession = uuid();
  const acceptanceRelease = uuid();
  const delivery = uuid();
  const deliveryJob = uuid();
  await pool.query(`INSERT INTO pre_edit_releases(id,project_id,session_id,version,source_digest,decision_digest,release_digest) VALUES($1,$2,$3,1,$4,$4,$4)`, [preRelease, first.projectId, preSession, digest()]);
  await pool.query(`INSERT INTO acceptance_sessions(id,project_id,project_version,pre_edit_release_id,pre_edit_head_release_id,manifest_id,manifest_version,term_version_id,rule_version,source_digest,source_snapshot,status) VALUES($1,$2,1,$3,$3,$4,1,$5,'tasks',$6,'{}','released')`, [acceptanceSession, first.projectId, preRelease, first.manifestId, first.termVersionId, digest()]);
  await pool.query(`INSERT INTO acceptance_releases(id,project_id,session_id,version,source_digest,acceptance_digest,cue_count) VALUES($1,$2,$3,1,$4,$4,0)`, [acceptanceRelease, first.projectId, acceptanceSession, digest()]);
  await pool.query(`INSERT INTO delivery_products(id,project_id,acceptance_session_id,acceptance_release_id,version,name,status,request_id,source_snapshot) VALUES($1,$2,$3,$4,1,'tasks delivery','preparing','delivery-request','{}')`, [delivery, first.projectId, acceptanceSession, acceptanceRelease]);
  await pool.query(`INSERT INTO delivery_jobs(id,delivery_id,status) VALUES($1,$2,'preparing')`, [deliveryJob, delivery]);
  return { first, second, dispatchId, dispatchBatch, standaloneBatch, screenBatch, termRun, preJob, delivery };
};

const seedDispatchPortfolio = async () => {
  const projectIds = Array.from({ length: 20 }, () => uuid());
  for (const [index, projectId] of projectIds.entries()) {
    await pool.query(`INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,$2,'ready','active',1,'tasks-test','tasks-test')`, [projectId, `dispatch-project-${String(index + 1).padStart(2, '0')}`]);
  }
  const dispatchId = uuid();
  await pool.query(`INSERT INTO asr_dispatch_groups(id,project_ids,status,request_id) VALUES($1,$2,'accepted','dispatch-portfolio-request')`, [dispatchId, projectIds]);
  for (const [index, projectId] of projectIds.entries()) {
    const status = index === 0 ? 'accepted' : index === 1 ? 'ready' : index === 2 ? 'blocked' : 'pending';
    await pool.query(`INSERT INTO asr_dispatch_project_results(id,dispatch_group_id,project_id,selection_order,status,batch_id) VALUES($1,$2,$3,$4,$5,NULL)`, [uuid(), dispatchId, projectId, index + 1, status]);
  }
  projectA = projectIds[0];
  return { dispatchId, projectIds };
};

describe('BACK-M3-08A 统一任务中心只读投影', () => {
  it('发现六类任务、去重 Dispatch 子批次并保持读取零写副作用', async () => {
    const seeded = await seedFacts();
    const before = (await pool.query(`SELECT (SELECT COUNT(*)::int FROM projects) projects, (SELECT COUNT(*)::int FROM asr_jobs) asr_jobs, (SELECT COUNT(*)::int FROM asr_attempts) asr_attempts, (SELECT COUNT(*)::int FROM screen_text_jobs) screen_jobs, (SELECT COUNT(*)::int FROM term_extraction_runs) terms, (SELECT COUNT(*)::int FROM pre_edit_prepare_jobs) pre_jobs, (SELECT COUNT(*)::int FROM delivery_jobs) delivery_jobs`)).rows[0];
    const response = await app.inject({ method: 'GET', url: '/api/tasks?limit=100&sortBy=createdAt&sortDirection=asc', headers: headers('employee') });
    expect(response.statusCode, response.body).toBe(200);
    const body = response.json();
    expect(body.total).toBe(6);
    expect(new Set(body.items.map((item: any) => item.taskType)).size).toBe(6);
    expect(body.items.some((item: any) => item.taskType === 'asr_batch' && item.resourceId === seeded.dispatchBatch)).toBe(false);
    expect(body.items.some((item: any) => item.taskType === 'asr_batch' && item.resourceId === seeded.standaloneBatch)).toBe(true);
    expect(body.items.every((item: any) => !JSON.stringify(item).includes('objectKey'))).toBe(true);
    const dispatch = body.items.find((item: any) => item.taskType === 'asr_dispatch');
    expect(dispatch.nativeStatus).toBe('completed');
    expect(dispatch.returnPath).toBe(`/tasks?taskType=asr_dispatch&resourceId=${seeded.dispatchId}`);
    expect(body.items.find((item: any) => item.taskType === 'asr_batch')).toMatchObject({ nativeStatus: 'failed', returnPath: `/projects/${projectA}/asr?batchId=${seeded.standaloneBatch}` });
    expect(body.items.find((item: any) => item.taskType === 'screen_text_batch')).toMatchObject({ nativeStatus: 'review_pending', returnPath: `/projects/${projectB}/screen-text?batchId=${seeded.screenBatch}` });
    expect(body.items.find((item: any) => item.taskType === 'term_extraction')).toMatchObject({ nativeStatus: 'completed', returnPath: `/projects/${projectA}/terms` });
    expect(body.items.find((item: any) => item.taskType === 'pre_review_preparation')).toMatchObject({ nativeStatus: 'queued', returnPath: `/projects/${projectA}/pre-review?sessionId=${(await pool.query<{ session_id: string }>('SELECT session_id FROM pre_edit_prepare_jobs WHERE id=$1', [seeded.preJob])).rows[0].session_id}` });
    expect(body.items.find((item: any) => item.taskType === 'delivery_generation')).toMatchObject({ nativeStatus: 'preparing', returnPath: `/deliveries/${seeded.delivery}` });
    const detail = await app.inject({ method: 'GET', url: `/api/tasks/asr_dispatch/${dispatch.resourceId}`, headers: headers('employee') });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json().scope.childResourceIds).toEqual([seeded.dispatchBatch]);
    const after = (await pool.query(`SELECT (SELECT COUNT(*)::int FROM projects) projects, (SELECT COUNT(*)::int FROM asr_jobs) asr_jobs, (SELECT COUNT(*)::int FROM asr_attempts) asr_attempts, (SELECT COUNT(*)::int FROM screen_text_jobs) screen_jobs, (SELECT COUNT(*)::int FROM term_extraction_runs) terms, (SELECT COUNT(*)::int FROM pre_edit_prepare_jobs) pre_jobs, (SELECT COUNT(*)::int FROM delivery_jobs) delivery_jobs`)).rows[0];
    expect(after).toEqual(before);
  });

  it('按项目、类型、状态、搜索和分页筛选，空页保留真实 total 且稳定 400/404', async () => {
    await seedFacts();
    const project = await app.inject({ method: 'GET', url: `/api/tasks?projectId=${projectA}&taskType=asr_batch&status=failed`, headers: headers('employee') });
    expect(project.statusCode).toBe(200);
    expect(project.json()).toMatchObject({ total: 1, items: [{ projectId: projectA, taskType: 'asr_batch', status: 'failed' }] });
    const search = await app.inject({ method: 'GET', url: '/api/tasks?search=beta&limit=10', headers: headers('employee') });
    expect(search.statusCode).toBe(200);
    expect(search.json().items.every((item: any) => item.projectIds.includes(projectB))).toBe(true);
    const empty = await app.inject({ method: 'GET', url: '/api/tasks?offset=100&limit=2', headers: headers('employee') });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toMatchObject({ total: 6, items: [] });
    for (const query of ['limit=0', 'limit=101', 'limit=abc', 'offset=-1', 'offset=1.5']) {
      expect((await app.inject({ method: 'GET', url: `/api/tasks?${query}`, headers: headers('employee') })).statusCode).toBe(400);
    }
    expect((await app.inject({ method: 'GET', url: `/api/tasks/unknown/${uuid()}`, headers: headers('employee') })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/tasks/asr_batch/${uuid()}`, headers: headers('employee') })).statusCode).toBe(404);
  });

  it('逐请求员工权限与项目边界稳定隔离，详情历史有界且安全', async () => {
    const seeded = await seedFacts();
    expect((await app.inject({ method: 'GET', url: '/api/tasks', headers: headers('missing') })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/tasks', headers: headers('system') })).statusCode).toBe(403);
    const scoped = await app.inject({ method: 'GET', url: '/api/tasks?limit=100', headers: headers('project-a') });
    expect(scoped.statusCode).toBe(200);
    expect(scoped.json().items.every((item: any) => item.projectIds.includes(projectA) || item.taskType === 'asr_dispatch')).toBe(true);
    expect(scoped.json().items.some((item: any) => item.projectIds.includes(projectB) && item.taskType !== 'asr_dispatch')).toBe(false);
    const dispatchDetail = await app.inject({ method: 'GET', url: `/api/tasks/asr_dispatch/${seeded.dispatchId}`, headers: headers('project-a') });
    expect(dispatchDetail.statusCode, dispatchDetail.body).toBe(200);
    expect(dispatchDetail.json().scope).toMatchObject({ childCount: 1, childResourceIds: [seeded.dispatchBatch] });
    const detail = await app.inject({ method: 'GET', url: `/api/tasks/term_extraction/${seeded.termRun}`, headers: headers('project-a') });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json().summary.status).toBe('completed');
    expect(detail.body).not.toMatch(/provider|secret|objectKey|prompt|原始载荷/i);
    expect((await app.inject({ method: 'GET', url: `/api/tasks/term_extraction/${seeded.termRun}`, headers: headers('system') })).statusCode).toBe(403);
  });

  it('Dispatch 执行状态只由 accepted batch 派生，覆盖无批次、运行中和需对账', async () => {
    const seeded = await seedFacts();
    await pool.query(`UPDATE asr_batches SET status='running' WHERE id=$1`, [seeded.dispatchBatch]);
    let response = await app.inject({ method: 'GET', url: '/api/tasks?taskType=asr_dispatch', headers: headers('employee') });
    expect(response.statusCode).toBe(200);
    expect(response.json().items[0]).toMatchObject({ status: 'running', nativeStatus: 'running' });
    expect(response.json().items[0].status).not.toBe('completed');

    await pool.query(`UPDATE asr_batches SET status='reconciliation_required' WHERE id=$1`, [seeded.dispatchBatch]);
    response = await app.inject({ method: 'GET', url: '/api/tasks?taskType=asr_dispatch', headers: headers('employee') });
    expect(response.json().items[0]).toMatchObject({ status: 'reconciliation_required' });

    await pool.query(`UPDATE asr_dispatch_project_results SET status='pending', batch_id=NULL WHERE dispatch_group_id=$1`, [seeded.dispatchId]);
    response = await app.inject({ method: 'GET', url: '/api/tasks?taskType=asr_dispatch', headers: headers('employee') });
    expect(response.json().items[0].status).toBe('unknown');
  });

  it('ASR 独立批次完整映射 cancel_requested/reconciliation_required，失败动作只回工作台', async () => {
    const seeded = await seedFacts();
    await pool.query(`UPDATE asr_batches SET status='cancel_requested' WHERE id=$1`, [seeded.standaloneBatch]);
    let response = await app.inject({ method: 'GET', url: '/api/tasks?taskType=asr_batch&status=cancel_requested', headers: headers('employee') });
    expect(response.json().items).toMatchObject([{ status: 'cancel_requested', availableActions: [] }]);
    await pool.query(`UPDATE asr_batches SET status='reconciliation_required' WHERE id=$1`, [seeded.standaloneBatch]);
    response = await app.inject({ method: 'GET', url: `/api/tasks/asr_batch/${seeded.standaloneBatch}`, headers: headers('employee') });
    expect(response.json().summary).toMatchObject({ status: 'reconciliation_required', availableActions: ['open_workspace'] });
    expect(response.json().summary.availableActions).not.toContain('retry');
    await pool.query(`UPDATE screen_text_batches SET status='cancel_requested'`);
    response = await app.inject({ method: 'GET', url: `/api/tasks/screen_text_batch/${seeded.screenBatch}`, headers: headers('employee') });
    expect(response.json().summary.availableActions).toEqual([]);
    await pool.query(`UPDATE screen_text_batches SET status='reconciliation_required'`);
    response = await app.inject({ method: 'GET', url: `/api/tasks/screen_text_batch/${seeded.screenBatch}`, headers: headers('employee') });
    expect(response.json().summary.availableActions).toEqual(['open_workspace']);

    await pool.query(`UPDATE pre_edit_prepare_jobs SET status='failed' WHERE id=$1`, [seeded.preJob]);
    response = await app.inject({ method: 'GET', url: `/api/tasks/pre_review_preparation/${seeded.preJob}`, headers: headers('employee') });
    expect(response.json().summary.availableActions).toEqual(['open_workspace']);
  });

  it('默认排序按需处理优先且分页稳定无重复', async () => {
    await seedFacts();
    const first = await app.inject({ method: 'GET', url: '/api/tasks?limit=2', headers: headers('employee') });
    const second = await app.inject({ method: 'GET', url: '/api/tasks?limit=2&offset=2', headers: headers('employee') });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json().items[0].status).toBe('failed');
    expect(new Set(first.json().items.map((item: any) => item.resourceId)).size).toBe(2);
    expect(new Set(second.json().items.map((item: any) => item.resourceId)).size).toBe(2);
    expect(first.json().items.map((item: any) => item.resourceId).some((id: string) => second.json().items.some((item: any) => item.resourceId === id))).toBe(false);
  });

  it('Dispatch 详情返回全部可见项目子结果并按项目隔离', async () => {
    const seeded = await seedDispatchPortfolio();
    let response = await app.inject({ method: 'GET', url: `/api/tasks/asr_dispatch/${seeded.dispatchId}`, headers: headers('employee') });
    expect(response.statusCode).toBe(200);
    const all = response.json();
    expect(all.dispatchResults).toHaveLength(20);
    expect(all.dispatchResults.map((item: any) => item.selectionOrder)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(all.dispatchResults.some((item: any) => item.acceptanceStatus === 'pending' && item.batchId === null)).toBe(true);
    expect(all.dispatchResults.some((item: any) => item.acceptanceStatus === 'blocked' && item.batchId === null)).toBe(true);
    expect(all.summary.returnPath).toBe(`/tasks?taskType=asr_dispatch&resourceId=${seeded.dispatchId}`);
    expect(JSON.stringify(all)).not.toMatch(/objectKey|secret|provider|prompt/i);

    response = await app.inject({ method: 'GET', url: `/api/tasks/asr_dispatch/${seeded.dispatchId}`, headers: headers('project-a') });
    expect(response.statusCode).toBe(200);
    expect(response.json().dispatchResults).toHaveLength(1);
    expect(response.json().dispatchResults[0].projectId).toBe(projectA);
    expect(response.json().scope.childCount).toBe(1);
  });
});
