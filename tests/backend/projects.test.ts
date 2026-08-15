import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { createPool } from '../../backend/src/database/pool.js';

const pool = createPool();
const app = createApp({ database: pool });

beforeAll(async () => {
  await app.ready();
});

beforeEach(async () => {
  await pool.query('TRUNCATE project_commands, projects CASCADE');
});

afterAll(async () => {
  await app.close();
});

describe('项目 API 与 PostgreSQL', () => {
  it('健康检查确认数据库连接', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      milestone: 'm2-projects',
      database: 'connected',
    });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('创建项目后可从正常项目列表查询', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { 'idempotency-key': randomUUID() },
      payload: { name: '  匿名测试项目 A  ' },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      name: '匿名测试项目 A',
      workflowStatus: 'draft',
      lifecycleStatus: 'active',
      version: 1,
      createdBy: 'local-user',
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/projects?lifecycleStatus=active&search=%E6%B5%8B%E8%AF%95',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      total: 1,
      items: [{ name: '匿名测试项目 A' }],
    });
  });

  it('相同幂等键不会创建重复项目', async () => {
    const idempotencyKey = randomUUID();
    const request = {
      method: 'POST' as const,
      url: '/api/projects',
      headers: { 'idempotency-key': idempotencyKey },
      payload: { name: '  幂等测试项目  ' },
    };

    const first = await app.inject(request);
    const second = await app.inject({ ...request, payload: { name: '幂等测试项目' } });
    const count = await pool.query<{ count: string }>('SELECT COUNT(*) FROM projects');

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json().id).toBe(first.json().id);
    expect(count.rows[0]?.count).toBe('1');
  });

  it('相同幂等键用于不同规范化名称时稳定返回冲突', async () => {
    const idempotencyKey = randomUUID();
    const first = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { 'idempotency-key': idempotencyKey },
      payload: { name: '幂等验收-A' },
    });
    const conflictRequest = {
      method: 'POST' as const,
      url: '/api/projects',
      headers: { 'idempotency-key': idempotencyKey },
      payload: { name: '幂等验收-B' },
    };
    const second = await app.inject(conflictRequest);
    const third = await app.inject(conflictRequest);
    const count = await pool.query<{ count: string }>('SELECT COUNT(*) FROM projects');

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(third.statusCode).toBe(409);
    expect(second.json()).toMatchObject({
      error: {
        code: 'IDEMPOTENCY_KEY_REUSED',
        retryable: false,
        action: 'retry_with_new_idempotency_key',
      },
    });
    expect(third.json().error.code).toBe(second.json().error.code);
    expect(count.rows[0]?.count).toBe('1');
  });

  it('拒绝只有空白的项目名称', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { 'idempotency-key': randomUUID() },
      payload: { name: '   ' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'PROJECT_NAME_REQUIRED',
        action: 'edit_project_name',
      },
    });
  });
});
