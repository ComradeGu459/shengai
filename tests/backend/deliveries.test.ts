import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { createPool } from '../../backend/src/database/pool.js';
import { DeliveryRepository } from '../../backend/src/modules/deliveries/deliveries.repository.js';
import { InMemoryDeliveryStorageFake } from '../../backend/src/modules/deliveries/in-memory-delivery-storage.fake.js';
import { startServer } from '../../backend/src/server.js';
import { runDevelopmentDeliveryWorker } from '../../backend/src/development.js';
import { DeliveryWorker } from '../../backend/src/workers/delivery.worker.js';
import { InMemoryStorageFake } from '../../backend/src/modules/uploads/in-memory-storage.fake.js';

const pool = createPool();
const deliveryStorage = new InMemoryDeliveryStorageFake();
const app = createApp({ database: pool, uploadStorage: new InMemoryStorageFake(), deliveryStorage });
const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const srt = Buffer.from('\uFEFF1\n00:00:00,000 --> 00:00:01,000\n你好\n', 'utf8');

beforeAll(async () => app.ready());
beforeEach(async () => {
  deliveryStorage.clear();
  await pool.query('TRUNCATE project_commands, projects CASCADE');
  await pool.query("UPDATE term_export_template_settings SET active_template_version_id = (SELECT id FROM term_export_template_versions WHERE version = 1)");
});
afterAll(async () => { await pool.query('TRUNCATE project_commands, projects CASCADE'); await app.close(); });

const seed = async () => {
  const projectId = randomUUID(); const manifestId = randomUUID(); const termDraftId = randomUUID(); const termVersionId = randomUUID(); const assetId = randomUUID(); const preSessionId = randomUUID(); const preReleaseId = randomUUID();
  await pool.query("INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,'交付验收剧','ready','active',1,'test','test')", [projectId]);
  await pool.query("INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,1,'anonymous','test')", [manifestId, projectId]);
  await pool.query("INSERT INTO assets(id,project_id,object_key,original_filename,media_kind,size_bytes,checksum_algorithm,checksum_value,verified_at) VALUES($1,$2,$3,'EP01.mp4','video',10,'sha256',$4,CURRENT_TIMESTAMP)", [assetId, projectId, `anonymous/${assetId}`, digest('video')]);
  for (const episode of [1, 2]) {
    await pool.query("INSERT INTO material_manifest_bindings(manifest_id,episode_number,role,relative_path,file_name,size_bytes,last_modified_ms,fingerprint,media_type) VALUES($1,$2,'asr_video',$3,$3,10,1,$4,'video')", [manifestId, episode, `EP0${episode}.mp4`, `video-${episode}`]);
    await pool.query("INSERT INTO material_asset_bindings(manifest_id,episode_number,role,asset_id,source_fingerprint) VALUES($1,$2,'asr_video',$3,$4)", [manifestId, episode, assetId, `video-${episode}`]);
  }
  const sourceDigest = digest('anonymous-source');
  await pool.query("INSERT INTO term_drafts(id,project_id,source_srt_set_digest,prompt_version,status) VALUES($1,$2,$3,'anonymous','confirmed')", [termDraftId, projectId, sourceDigest]);
  await pool.query("INSERT INTO term_versions(id,project_id,version,draft_id,source_srt_set_digest,prompt_version) VALUES($1,$2,1,$3,$4,'anonymous')", [termVersionId, projectId, termDraftId, sourceDigest]);
  await pool.query(`INSERT INTO pre_edit_sessions(id,project_id,project_version,source_srt_set_digest,term_version_id,manifest_id,manifest_version,source_digest,source_snapshot,algorithm_version,format_policy_version,status)
    VALUES($1,$2,1,$3,$4,$5,1,$6,'{}','anonymous','anonymous','completed')`, [preSessionId, projectId, sourceDigest, termVersionId, manifestId, digest('pre')]);
  await pool.query("INSERT INTO pre_edit_releases(id,project_id,session_id,version,source_digest,decision_digest,release_digest) VALUES($1,$2,$3,1,$4,$5,$6)", [preReleaseId, projectId, preSessionId, digest('source'), digest('decision'), digest('release')]);
  for (const episode of [1, 2]) {
    await pool.query("INSERT INTO pre_edit_episodes(id,session_id,episode_number,company_asset_id,video_asset_id,video_checksum_value,status,video_duration_ms) VALUES($1,$2,$3,$4,$4,$5,'completed',5000)", [randomUUID(), preSessionId, episode, assetId, digest('video')]);
    await pool.query("INSERT INTO pre_edit_release_files(release_id,episode_number,file_name,cue_count,content_digest,bytes) VALUES($1,$2,$3,1,$4,$5)", [preReleaseId, episode, `EP0${episode}.srt`, digest(srt), srt]);
  }
  return { projectId, assetId, preReleaseId, termVersionId };
};

const createSession = async (projectId: string, client: typeof app = app) => {
  const response = await client.inject({ method: 'POST', url: `/api/projects/${projectId}/subtitle-acceptance/sessions`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedProjectVersion: 1 } });
  expect(response.statusCode, response.body).toBe(201); return response.json().session;
};
const passAll = async (projectId: string, session: any, client: typeof app = app) => {
  let revision = session.revision;
  for (const episode of session.episodes) {
    const response = await client.inject({ method: 'POST', url: `/api/projects/${projectId}/subtitle-acceptance/sessions/${session.id}/episodes/${episode.episodeNumber}/pass`, headers: { 'idempotency-key': randomUUID() }, payload: { expectedSessionRevision: revision, expectedEpisodeRevision: episode.revision } });
    expect(response.statusCode, response.body).toBe(201); revision = response.json().session.revision;
  }
  return revision;
};
const confirmation = async (projectId: string, sessionId: string, client: typeof app = app) => {
  const response = await client.inject({ method: 'GET', url: `/api/projects/${projectId}/deliveries/confirm?sessionId=${sessionId}` });
  expect(response.statusCode, response.body).toBe(200); return response.json();
};
const createPlan = async (projectId: string, session: any, revision: number, deliveryId = randomUUID(), key = randomUUID(), client: typeof app = app) => {
  const confirm = await confirmation(projectId, session.id, client);
  const body = { sessionId: session.id, expectedSessionRevision: revision, deliveryId, sourceDigest: confirm.source.sourceDigest, templateVersionId: confirm.source.templateVersionId, note: '首版交付' };
  const response = await client.inject({ method: 'POST', url: `/api/projects/${projectId}/deliveries`, headers: { 'idempotency-key': key }, payload: body });
  return { response, body, confirm, deliveryId, key };
};
const runWorker = async (workerId = randomUUID()) => new DeliveryWorker(pool, deliveryStorage, { leaseMs: 5_000, pollIntervalMs: 50 }, { workerId }).runOnce();

describe('BACK-M3-07A Rev 3 交付产品异步权威后端', () => {
  it('正常开发接线共享 API Storage，创建后 Worker 生成 ready 并可下载', async () => {
    const fixture = await seed();
    const storage = new InMemoryDeliveryStorageFake();
    const developmentApp = await startServer({ port: 0, deliveryStorage: storage });
    const controller = new AbortController();
    const workerPromise = runDevelopmentDeliveryWorker({
      database: pool,
      app: developmentApp,
      signal: controller.signal,
      config: { leaseMs: 5_000, pollIntervalMs: 50 },
    });
    try {
      expect(developmentApp.deliveryStorage).toBe(storage);
      const session = await createSession(fixture.projectId, developmentApp);
      const revision = await passAll(fixture.projectId, session, developmentApp);
      const plan = await createPlan(fixture.projectId, session, revision, randomUUID(), randomUUID(), developmentApp);
      expect(plan.response.statusCode, plan.response.body).toBe(202);

      let ready: any = null;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const detail = await developmentApp.inject({ method: 'GET', url: `/api/deliveries/${plan.deliveryId}` });
        if (detail.json().product.status === 'ready') { ready = detail.json(); break; }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(ready?.product.status).toBe('ready');
      const dialogueFile = ready.manifest.files.find((file: any) => file.kind === 'dialogue_srt');
      const downloaded = await developmentApp.inject({ method: 'GET', url: `/api/deliveries/${plan.deliveryId}/files/${dialogueFile.id}` });
      expect(downloaded.statusCode, downloaded.body).toBe(200);
      expect(Buffer.from(downloaded.rawPayload).byteLength).toBeGreaterThan(0);
    } finally {
      controller.abort();
      await workerPromise;
      await developmentApp.close();
    }
  });

  it('创建只固定 preparing 计划，Worker 成功后 ready，响应丢失可按 deliveryId 恢复', async () => {
    const fixture = await seed(); const session = await createSession(fixture.projectId);
    const blocked = await confirmation(fixture.projectId, session.id); expect(blocked.canGenerate).toBe(false); expect(blocked.blockers).toContain('acceptance_session_not_ready');
    const revision = await passAll(fixture.projectId, session); const plan = await createPlan(fixture.projectId, session, revision);
    expect(plan.response.statusCode, plan.response.body).toBe(202); expect(plan.response.json().product.product).toMatchObject({ id: plan.deliveryId, status: 'preparing' }); expect(plan.response.json().product.manifest.files).toHaveLength(5);
    expect(JSON.stringify(plan.response.json())).not.toContain('objectKey');
    const recoveredBeforeWorker = await app.inject({ method: 'GET', url: `/api/deliveries/${plan.deliveryId}` }); expect(recoveredBeforeWorker.statusCode).toBe(200); expect(recoveredBeforeWorker.json().product.status).toBe('preparing');
    const workerResult = await runWorker(); expect(workerResult.status).toBe('ready');
    const ready = await app.inject({ method: 'GET', url: `/api/deliveries/${plan.deliveryId}` }); expect(ready.json().product.status).toBe('ready');
    const releaseState = await pool.query<{ session_status: string; release_count: string; product_count: string }>(`SELECT session.status AS session_status,
      (SELECT count(*)::text FROM acceptance_releases WHERE project_id = $1) AS release_count,
      (SELECT count(*)::text FROM delivery_products WHERE project_id = $1) AS product_count
      FROM acceptance_sessions session WHERE session.id = $2`, [fixture.projectId, session.id]);
    expect(releaseState.rows[0]).toMatchObject({ session_status: 'released', release_count: '1', product_count: '1' });
    expect(ready.json().manifest.files.filter((file: any) => file.kind === 'screen_text_srt')).toHaveLength(2); expect(ready.json().manifest.files.filter((file: any) => file.kind === 'screen_text_srt').every((file: any) => file.emptyTrack)).toBe(true);
    const screenFile = ready.json().manifest.files.find((file: any) => file.kind === 'screen_text_srt'); const downloaded = await app.inject({ method: 'GET', url: `/api/deliveries/${plan.deliveryId}/files/${screenFile.id}` }); expect(downloaded.statusCode).toBe(200); expect(Buffer.from(downloaded.rawPayload).equals(Buffer.from('\uFEFF', 'utf8'))).toBe(true);
  });

  it('同键重放、同键异参、同 ID 异键均零第二产品，Worker 租约可接管', async () => {
    const fixture = await seed(); const session = await createSession(fixture.projectId); const revision = await passAll(fixture.projectId, session); const plan = await createPlan(fixture.projectId, session, revision);
    const replay = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/deliveries`, headers: { 'idempotency-key': plan.key }, payload: plan.body }); expect(replay.statusCode).toBe(200); expect(replay.json().replay).toBe(true);
    const differentId = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/deliveries`, headers: { 'idempotency-key': plan.key }, payload: { ...plan.body, deliveryId: randomUUID() } }); expect(differentId.statusCode).toBe(409);
    const sameIdOtherKey = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/deliveries`, headers: { 'idempotency-key': randomUUID() }, payload: plan.body }); expect(sameIdOtherKey.statusCode).toBe(409);
    const repository = new DeliveryRepository(pool, deliveryStorage); const now = new Date('2026-08-15T12:00:00.000Z'); const firstClaim = await repository.claimGeneration('worker-a', now, 1_000); expect(firstClaim?.deliveryId).toBe(plan.deliveryId); const takeover = await repository.claimGeneration('worker-b', new Date(now.getTime() + 2_000), 1_000); expect(takeover?.workerId).toBe('worker-b');
    const files = await repository.loadGenerationFiles(plan.deliveryId); for (const file of files) await deliveryStorage.putObject({ objectKey: file.object_key, bytes: file.bytes, contentType: file.content_type, metadata: file.metadata }); expect(await repository.completeGeneration(takeover!, new Date(now.getTime() + 2_001), files.length)).toBe(true);
    const products = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM delivery_products WHERE project_id = $1', [fixture.projectId]); expect(products.rows[0]!.count).toBe('1');
  });

  it('生成失败持久化原因并可用显式恢复命令继续同一产品，重复恢复不创建新 Attempt', async () => {
    const fixture = await seed(); const session = await createSession(fixture.projectId); const revision = await passAll(fixture.projectId, session); const plan = await createPlan(fixture.projectId, session, revision);
    deliveryStorage.failNextOperation('模拟对象写入失败'); const failedWorker = await runWorker(); expect(failedWorker.status).toBe('generation_failed'); const failed = await app.inject({ method: 'GET', url: `/api/deliveries/${plan.deliveryId}` }); expect(failed.json().product).toMatchObject({ status: 'generation_failed', failureRequestId: expect.any(String) }); expect(failed.json().product.failureReason).toContain('模拟对象写入失败');
    const recoveryKey = randomUUID(); const recovered = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/deliveries/${plan.deliveryId}/recover`, headers: { 'idempotency-key': recoveryKey }, payload: {} }); expect(recovered.statusCode).toBe(202); const duplicate = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/deliveries/${plan.deliveryId}/recover`, headers: { 'idempotency-key': recoveryKey }, payload: {} }); expect(duplicate.statusCode).toBe(200); expect(duplicate.json().replay).toBe(true);
    expect((await runWorker()).status).toBe('ready'); const attempts = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM delivery_attempts WHERE delivery_id = $1', [plan.deliveryId]); expect(attempts.rows[0]!.count).toBe('2');
  });

  it('项目级下载校验 projectId，Storage 缺对象或摘要不符稳定拒绝且不泄露 objectKey', async () => {
    const fixture = await seed(); const session = await createSession(fixture.projectId); const revision = await passAll(fixture.projectId, session); const plan = await createPlan(fixture.projectId, session, revision); await runWorker(); const detail = await app.inject({ method: 'GET', url: `/api/deliveries/${plan.deliveryId}` }); const file = detail.json().manifest.files[0];
    const otherProject = randomUUID(); await pool.query("INSERT INTO projects(id,name,workflow_status,lifecycle_status,version,created_by,updated_by) VALUES($1,'其他项目','ready','active',1,'test','test')", [otherProject]); const cross = await app.inject({ method: 'GET', url: `/api/projects/${otherProject}/deliveries/${plan.deliveryId}/files/${file.id}` }); expect(cross.statusCode).toBe(404);
    deliveryStorage.faultNextObject('missing'); const missing = await app.inject({ method: 'GET', url: `/api/deliveries/${plan.deliveryId}/files/${file.id}` }); expect(missing.statusCode).toBe(409); expect(missing.json().error.code).toBe('DELIVERY_STORAGE_OBJECT_INVALID');
    deliveryStorage.faultNextObject('checksum'); const mismatch = await app.inject({ method: 'GET', url: `/api/deliveries/${plan.deliveryId}/files/${file.id}` }); expect(mismatch.statusCode).toBe(409); expect(mismatch.json().error.code).toBe('DELIVERY_STORAGE_OBJECT_INVALID');
    deliveryStorage.faultNextObject('size'); const sizeMismatch = await app.inject({ method: 'GET', url: `/api/deliveries/${plan.deliveryId}/files/${file.id}` }); expect(sizeMismatch.statusCode).toBe(409); expect(sizeMismatch.json().error.code).toBe('DELIVERY_STORAGE_OBJECT_INVALID');
  });

  it('确认来源摘要和模板版本冻结，模板切换后稳定冲突且零产品', async () => {
    const fixture = await seed(); const session = await createSession(fixture.projectId); const revision = await passAll(fixture.projectId, session); const confirm = await confirmation(fixture.projectId, session.id); const newTemplate = randomUUID(); const nextTemplateVersion = Number((await pool.query<{ value: number }>('SELECT COALESCE(MAX(version), 1) + 1 AS value FROM term_export_template_versions')).rows[0]!.value); await pool.query("INSERT INTO term_export_template_versions(id,version,name,field_order,type_header,name_header,aliases_header,gender_header,note_header) VALUES($1,$2,'切换模板',ARRAY['type','name','aliases','gender','note']::term_export_field[],'类型','名称','别名','性别','备注')", [newTemplate, nextTemplateVersion]); await pool.query('UPDATE term_export_template_settings SET active_template_version_id = $1', [newTemplate]);
    const response = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/deliveries`, headers: { 'idempotency-key': randomUUID() }, payload: { sessionId: session.id, expectedSessionRevision: revision, deliveryId: randomUUID(), sourceDigest: confirm.source.sourceDigest, templateVersionId: confirm.source.templateVersionId } }); expect(response.statusCode).toBe(409); expect(response.json().error.code).toBe('DELIVERY_TEMPLATE_VERSION_CONFLICT'); const products = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM delivery_products WHERE project_id = $1', [fixture.projectId]); expect(products.rows[0]!.count).toBe('0');
  });

  it('全局/项目列表搜索、状态筛选、稳定分页空页及 V1→V2 不改变 V1 文件字节', async () => {
    const fixture = await seed(); const session1 = await createSession(fixture.projectId); const revision1 = await passAll(fixture.projectId, session1); const plan1 = await createPlan(fixture.projectId, session1, revision1); await runWorker(); const detail1 = await app.inject({ method: 'GET', url: `/api/deliveries/${plan1.deliveryId}` }); const file1 = detail1.json().manifest.files.find((file: any) => file.kind === 'dialogue_srt'); const before = await app.inject({ method: 'GET', url: `/api/deliveries/${plan1.deliveryId}/files/${file1.id}` });
    const session2 = await createSession(fixture.projectId); const revision2 = await passAll(fixture.projectId, session2); const plan2 = await createPlan(fixture.projectId, session2, revision2); await runWorker();
    const projectList = await app.inject({ method: 'GET', url: `/api/projects/${fixture.projectId}/deliveries?status=ready&search=交付验收剧&sortBy=createdAt&sortDirection=asc&limit=1&offset=0` }); expect(projectList.statusCode).toBe(200); expect(projectList.json().total).toBe(2); expect(projectList.json().items).toHaveLength(1); const globalList = await app.inject({ method: 'GET', url: '/api/deliveries?status=ready&limit=10&offset=100' }); expect(globalList.statusCode).toBe(200); expect(globalList.json().items).toHaveLength(0); expect(globalList.json().total).toBe(2);
    const after = await app.inject({ method: 'GET', url: `/api/deliveries/${plan1.deliveryId}/files/${file1.id}` }); expect(Buffer.from(after.rawPayload).equals(Buffer.from(before.rawPayload))).toBe(true); expect(plan2.deliveryId).not.toBe(plan1.deliveryId);
  });

  it('来源版本变化仍在计划事务前稳定标 stale，零产品副作用', async () => {
    const fixture = await seed(); const session = await createSession(fixture.projectId); const revision = await passAll(fixture.projectId, session); const confirm = await confirmation(fixture.projectId, session.id); await pool.query("INSERT INTO material_manifests(id,project_id,version,root_name,created_by) VALUES($1,$2,2,'new-source','test')", [randomUUID(), fixture.projectId]);
    const response = await app.inject({ method: 'POST', url: `/api/projects/${fixture.projectId}/deliveries`, headers: { 'idempotency-key': randomUUID() }, payload: { sessionId: session.id, expectedSessionRevision: revision, deliveryId: randomUUID(), sourceDigest: confirm.source.sourceDigest, templateVersionId: confirm.source.templateVersionId } }); expect(response.statusCode).toBe(409); expect(response.json().error.code).toBe('DELIVERY_SOURCE_STALE'); const state = await pool.query<{ status: string }>('SELECT status FROM acceptance_sessions WHERE id = $1', [session.id]); expect(state.rows[0]!.status).toBe('stale'); const products = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM delivery_products WHERE project_id = $1', [fixture.projectId]); expect(products.rows[0]!.count).toBe('0');
  });
});
