import { randomBytes, randomUUID, scryptSync } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import {
  createEmployeeAuthConfigFromEnv,
  EmployeeAuthService,
  EMPLOYEE_LOGIN_FAILURE_LIMIT,
  EMPLOYEE_LOGIN_RATE_ENTRY_LIMIT,
  EMPLOYEE_LOGIN_RATE_WINDOW_MS,
  EMPLOYEE_SESSION_MAX_AGE_SECONDS,
} from '../../backend/src/modules/employee-auth/employee-auth.js';
import { startServer } from '../../backend/src/server.js';

const origin = 'https://work.example.invalid';
const password = 'test-only-password';

const createService = (
  now: () => number = () => Date.now(),
  material: { salt: Buffer; sessionSecret: Buffer } = { salt: randomBytes(16), sessionSecret: randomBytes(32) },
) => {
  const { salt, sessionSecret } = material;
  const digest = scryptSync(password, salt, 32, { N: 16_384, r: 8, p: 1 });
  const config = createEmployeeAuthConfigFromEnv({
    QIMAO_EMPLOYEE_SESSION_REQUIRED: 'true',
    QIMAO_EMPLOYEE_AUTH_USERNAME: 'test-user',
    QIMAO_EMPLOYEE_PASSWORD_VERIFIER: `scrypt-v1$N=16384$r=8$p=1$${salt.toString('base64url')}$${digest.toString('base64url')}`,
    QIMAO_EMPLOYEE_SESSION_SECRET: sessionSecret.toString('base64url'),
    QIMAO_EMPLOYEE_ORIGIN: origin,
  } as NodeJS.ProcessEnv);
  return new EmployeeAuthService(config!, now);
};

const fakeDatabase = {
  query: async (sql: string) => {
    if (sql.includes("COALESCE((SELECT json_agg(page")) return { rows: [{ total: '0', items: [] }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  },
  connect: async () => ({
    query: async (sql: string, values: unknown[] = []) => {
      if (sql.includes('INSERT INTO projects')) {
        return { rows: [{
          id: '00000000-0000-4000-8000-000000000001', name: values[0], workflow_status: 'draft', lifecycle_status: 'active',
          recycle_expires_at: null, version: 1, created_at: new Date('2026-01-01T00:00:00.000Z'), updated_at: new Date('2026-01-01T00:00:00.000Z'),
          created_by: values[1], updated_by: values[1],
        }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => undefined,
  }),
  end: async () => undefined,
} as any;

const cookieFrom = (response: { headers: Record<string, string | string[] | undefined> }) => {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  return value?.split(';', 1)[0] ?? '';
};

afterEach(() => {
  for (const key of [
    'QIMAO_EMPLOYEE_SESSION_REQUIRED', 'QIMAO_EMPLOYEE_AUTH_USERNAME', 'QIMAO_EMPLOYEE_PASSWORD_VERIFIER',
    'QIMAO_EMPLOYEE_SESSION_SECRET', 'QIMAO_EMPLOYEE_ORIGIN', 'QIMAO_ACCESS_REQUIRED',
  ]) delete process.env[key];
});

describe('员工 14 天 Cookie 会话', () => {
  it('登录成功签发安全 Cookie，切页读取真实项目/任务，登出后失效', async () => {
    const service = createService();
    const app = createApp({ database: fakeDatabase, employeeAuthService: service, employeeSessionRequired: true });
    await app.ready();

    const anonymous = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(anonymous.statusCode).toBe(401);
    expect(anonymous.headers['content-type']).toContain('application/json');
    const anonymousBody = anonymous.json() as { error?: { code?: string; requestId?: string } };
    expect(anonymousBody).not.toBeInstanceOf(Array);
    expect(anonymousBody.error).toMatchObject({ code: 'EMPLOYEE_AUTH_REQUIRED', requestId: expect.any(String) });
    const wrong = await app.inject({ method: 'POST', url: '/api/employee-auth/login', headers: { origin }, payload: { username: 'test-user', password: 'wrong' } });
    expect(wrong.statusCode).toBe(401);
    const login = await app.inject({ method: 'POST', url: '/api/employee-auth/login', headers: { origin }, payload: { username: 'test-user', password } });
    expect(login.statusCode).toBe(200);
    expect(login.headers['set-cookie']).toContain('Max-Age=1209600');
    expect(login.headers['set-cookie']).toContain('HttpOnly');
    expect(login.headers['set-cookie']).toContain('Secure');
    expect(login.headers['set-cookie']).toContain('SameSite=Lax');
    expect(login.headers['cache-control']).toBe('no-store');
    const cookie = cookieFrom(login);
    expect(cookie).toMatch(/^__Host-qimao_employee_session=v1\./);

    const session = await app.inject({ method: 'GET', url: '/api/employee-auth/session', headers: { cookie } });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({ subject: 'test-user' });
    const projects = await app.inject({ method: 'GET', url: '/api/projects', headers: { cookie } });
    expect(projects.statusCode).toBe(200);
    const tasks = await app.inject({ method: 'GET', url: '/api/tasks?limit=20&offset=0', headers: { cookie } });
    expect(tasks.statusCode).toBe(200);
    const feedback = await app.inject({ method: 'GET', url: `/api/feedback-reports/${randomUUID()}`, headers: { cookie } });
    expect(feedback.statusCode).toBe(404);

    const created = await app.inject({
      method: 'POST', url: '/api/projects', headers: { cookie, origin, 'idempotency-key': randomUUID() }, payload: { name: '会话项目' },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().createdBy).toBe('test-user');
    const logout = await app.inject({ method: 'POST', url: '/api/employee-auth/logout', headers: { cookie, origin } });
    expect(logout.statusCode).toBe(200);
    expect(logout.headers['set-cookie']).toContain('Max-Age=0');
    await app.close();
  });

  it('拒绝篡改、过期、超长 Cookie，并且管理员与员工身份不能互换', async () => {
    let now = Date.now();
    const service = createService(() => now);
    const app = createApp({ database: fakeDatabase, employeeAuthService: service, employeeSessionRequired: true, accessRequired: true });
    await app.ready();
    const issued = service.issueSession();
    const cookie = `__Host-qimao_employee_session=${issued.token}`;
    expect((await app.inject({ method: 'GET', url: '/api/projects', headers: { cookie: `${cookie}x` } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/projects', headers: { cookie: `x=${'a'.repeat(5000)}` } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/system-control/security', headers: { cookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/tasks', headers: { 'cf-access-jwt-assertion': 'not-an-employee-session' } })).statusCode).toBe(401);
    now += (EMPLOYEE_SESSION_MAX_AGE_SECONDS + 1) * 1000;
    expect((await app.inject({ method: 'GET', url: '/api/projects', headers: { cookie } })).statusCode).toBe(401);
    await app.close();
  });

  it('所有带 Cookie 的写请求与登录都要求精确 Origin，读取不误伤', async () => {
    const service = createService();
    const app = createApp({ database: fakeDatabase, employeeAuthService: service, employeeSessionRequired: true });
    await app.ready();
    expect((await app.inject({ method: 'POST', url: '/api/employee-auth/login', payload: { username: 'test-user', password } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/employee-auth/login', headers: { origin: 'https://evil.example.invalid' }, payload: { username: 'test-user', password } })).statusCode).toBe(403);
    const issued = service.issueSession();
    const cookie = `__Host-qimao_employee_session=${issued.token}`;
    expect((await app.inject({ method: 'GET', url: '/api/projects', headers: { cookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/projects', headers: { cookie, 'idempotency-key': randomUUID() }, payload: { name: '缺少来源' } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/projects', headers: { cookie, origin: 'https://evil.example.invalid', 'idempotency-key': randomUUID() }, payload: { name: '错误来源' } })).statusCode).toBe(403);
    await app.close();
  });

  it('production 启用员工会话但配置不完整时在 listen 前 fail-closed', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.QIMAO_EMPLOYEE_SESSION_REQUIRED = 'true';
    await expect(startServer({ port: 0 })).rejects.toThrow(/员工用户名、scrypt verifier、会话 Secret 和 origin/);
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });

  it('production 未显式启用员工会话时也在 listen 前 fail-closed', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    await expect(startServer({ port: 0 })).rejects.toThrow(/必须启用并完整配置员工 Cookie 会话/);
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });

  it('错误用户名与错误密码走同一校验边界，并在有界来源表内限速', async () => {
    let now = Date.now();
    const service = createService(() => now);
    const app = createApp({ database: fakeDatabase, employeeAuthService: service, employeeSessionRequired: true });
    await app.ready();

    const failure = (username: string, spoofedAddress: string) => app.inject({
      method: 'POST',
      url: '/api/employee-auth/login',
      headers: { origin, 'cf-connecting-ip': spoofedAddress },
      payload: { username, password: 'wrong' },
    });
    expect((await failure('unknown-user', '198.51.100.1')).statusCode).toBe(401);
    for (let index = 1; index < EMPLOYEE_LOGIN_FAILURE_LIMIT; index += 1) {
      const response = await failure('test-user', `203.0.113.${index}`);
      if (index < EMPLOYEE_LOGIN_FAILURE_LIMIT - 1) expect(response.statusCode).toBe(401);
      else {
        expect(response.statusCode).toBe(429);
        expect(response.headers['retry-after']).toBe(String(EMPLOYEE_LOGIN_RATE_WINDOW_MS / 1000));
        expect(response.json().error).toMatchObject({ code: 'EMPLOYEE_LOGIN_RATE_LIMITED', requestId: expect.any(String) });
      }
    }
    const stillBlocked = await app.inject({
      method: 'POST', url: '/api/employee-auth/login', headers: { origin, 'cf-connecting-ip': '192.0.2.250' },
      payload: { username: 'test-user', password },
    });
    expect(stillBlocked.statusCode).toBe(429);

    for (let index = 0; index < EMPLOYEE_LOGIN_RATE_ENTRY_LIMIT + 5; index += 1) {
      service.recordLoginFailure(`bounded:${index}`);
    }
    expect(service.loginRateEntryCount).toBeLessThanOrEqual(EMPLOYEE_LOGIN_RATE_ENTRY_LIMIT);
    now += EMPLOYEE_LOGIN_RATE_WINDOW_MS + 1;
    expect(service.loginRetryAfterSeconds('employee-shared-account')).toBeNull();
    expect(service.loginRateEntryCount).toBe(0);

    const recovered = await app.inject({
      method: 'POST', url: '/api/employee-auth/login', headers: { origin, 'cf-connecting-ip': '192.0.2.251' },
      payload: { username: 'test-user', password },
    });
    expect(recovered.statusCode).toBe(200);
    await app.close();
  });

  it('会话主体固定为服务端配置，重启后复用同一 Secret 可继续验证', async () => {
    const material = { salt: randomBytes(16), sessionSecret: randomBytes(32) };
    const service = createService(() => Date.now(), material);
    const issued = service.issueSession();
    const cookie = `__Host-qimao_employee_session=${issued.token}`;
    const app = createApp({ database: fakeDatabase, employeeAuthService: service, employeeSessionRequired: true });
    await app.ready();
    const first = await app.inject({ method: 'GET', url: '/api/employee-auth/session', headers: { cookie } });
    expect(first.json()).toMatchObject({ subject: 'test-user' });
    await app.close();

    const restartedService = createService(() => Date.now(), material);
    const restarted = createApp({ database: fakeDatabase, employeeAuthService: restartedService, employeeSessionRequired: true });
    await restarted.ready();
    expect((await restarted.inject({ method: 'GET', url: '/api/employee-auth/session', headers: { cookie } })).statusCode).toBe(200);
    await restarted.close();
  });
});
