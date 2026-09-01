import { createSign, generateKeyPairSync } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import {
  CloudflareAccessVerifier,
  createCloudflareAccessConfigFromEnv,
  createCloudflareAccessPrincipalResolver,
  type CloudflareAccessConfig,
} from '../../backend/src/modules/access/cloudflare-access.js';
import { startServer } from '../../backend/src/server.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;
const config: CloudflareAccessConfig = {
  required: true,
  issuer: 'https://team.example.cloudflareaccess.com',
  controlAudience: 'control-aud',
  controlEmails: ['owner@example.invalid'],
  jwksUrl: 'https://team.example.cloudflareaccess.com/cdn-cgi/access/certs',
};

const base64Url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

const token = (claims: Record<string, unknown> = {}, overrides: { key?: typeof privateKey; kid?: string } = {}) => {
  const header = { alg: 'RS256', typ: 'JWT', kid: overrides.kid ?? 'test-key' };
  const payload = {
    iss: config.issuer,
    aud: config.controlAudience,
    sub: `subject-${randomUUID()}`,
    email: 'owner@example.invalid',
    exp: Math.floor(Date.now() / 1000) + 300,
    ...claims,
  };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const input = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign('RSA-SHA256').update(input).end().sign(overrides.key ?? privateKey);
  return `${input}.${base64Url(signature)}`;
};

const fetchKeys = async () => ({
  ok: true,
  json: async () => ({ keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }] }),
} as Response);

const verifier = (overrides: { fetcher?: (input: string, init?: RequestInit) => Promise<Response>; now?: () => number; cacheTtlMs?: number } = {}) =>
  new CloudflareAccessVerifier(config, { fetcher: overrides.fetcher ?? fetchKeys, ...overrides });

const fakeDatabase = {
  query: async () => ({ rows: [], rowCount: 0 }),
  connect: async () => ({
    query: async (sql: string) => sql.includes('INSERT INTO projects') ? {
      rows: [{
        id: '00000000-0000-4000-8000-000000000001', name: '公开测试项目', workflow_status: 'draft', lifecycle_status: 'active',
        recycle_expires_at: null, version: 1, created_at: new Date('2026-01-01T00:00:00.000Z'), updated_at: new Date('2026-01-01T00:00:00.000Z'),
        created_by: 'local-user', updated_by: 'local-user',
      }], rowCount: 1,
    } : { rows: [], rowCount: 0 },
    release: () => undefined,
  }),
  end: async () => undefined,
} as any;

afterEach(() => {
  delete process.env.QIMAO_ACCESS_REQUIRED;
  delete process.env.QIMAO_ACCESS_ISSUER;
  delete process.env.QIMAO_ACCESS_CONTROL_AUDIENCE;
  delete process.env.QIMAO_ACCESS_CONTROL_EMAIL_ALLOWLIST;
  delete process.env.QIMAO_ACCESS_JWKS_URL;
});

describe('Cloudflare Access JWT resolver', () => {
  it('验证管理员 control audience、签名、issuer、时间和邮箱白名单，并映射最小能力', async () => {
    const instance = verifier();
    const control = await instance.verifyToken(token());
    expect(control).toMatchObject({ audience: 'system-control', projectAccess: 'all' });
    expect(control.capabilities).toContain('system-control:strategy:release');
    await expect(instance.verifyToken(token({ aud: 'employee-aud', email: 'employee@example.invalid' }))).rejects.toThrow();
  });

  it('拒绝伪造 header、错误 issuer、过期/未生效、邮箱越权和错误签名', async () => {
    const instance = verifier();
    await expect(instance.verifyRequest({ headers: { 'x-access-email': 'employee@example.invalid' } } as any)).resolves.toBeNull();
    await expect(instance.verifyToken(token({ iss: 'https://other.example.invalid' }))).rejects.toThrow();
    await expect(instance.verifyToken(token({ exp: Math.floor(Date.now() / 1000) - 1 }))).rejects.toThrow();
    await expect(instance.verifyToken(token({ nbf: Math.floor(Date.now() / 1000) + 60 }))).rejects.toThrow();
    await expect(instance.verifyToken(token({ email: 'not-allowed@example.invalid' }))).rejects.toThrow();
    const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
    await expect(instance.verifyToken(token({}, { key: otherKey.privateKey }))).rejects.toThrow();
  });

  it('JWKS 网络失败拒绝，成功缓存有界且过期后不使用旧 key 猜测', async () => {
    let now = Date.now();
    let calls = 0;
    let fail = false;
    const instance = verifier({ now: () => now, cacheTtlMs: 1_000, fetcher: async () => { calls += 1; if (fail) throw new Error('network'); return fetchKeys(); } });
    await instance.verifyToken(token());
    await instance.verifyToken(token());
    expect(calls).toBe(1);
    now += 1_001;
    fail = true;
    await expect(instance.verifyToken(token())).rejects.toThrow();
    expect(calls).toBe(2);
  });

  it('QIMAO_ACCESS_REQUIRED 缺少配置时 production startServer 在 listen 前 fail-closed', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.QIMAO_ACCESS_REQUIRED = 'true';
    await expect(startServer({ port: 0 })).rejects.toThrow(/QIMAO_ACCESS_REQUIRED/);
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('管理员 Access 只保护 system-control，公开项目与健康检查不被误拦截', async () => {
    const instance = verifier();
    const app = createApp({
      database: fakeDatabase,
      accessRequired: true,
      accessPrincipalResolver: createCloudflareAccessPrincipalResolver(instance),
    });
    await app.ready();
    const publicProjects = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(publicProjects.statusCode).toBe(200);
    const createdProject = await app.inject({ method: 'POST', url: '/api/projects', headers: { 'idempotency-key': 'public-project-create-1' }, payload: { name: '公开测试项目' } });
    expect(createdProject.statusCode).toBe(201);
    const missingAdmin = await app.inject({ method: 'GET', url: '/api/system-control/security' });
    expect(missingAdmin.statusCode).toBe(403);
    const wrongAdminAudience = await app.inject({ method: 'GET', url: '/api/system-control/security', headers: { 'cf-access-jwt-assertion': token({ aud: 'employee-aud' }) } });
    expect(wrongAdminAudience.statusCode).toBe(403);
    const wrongAdminEmail = await app.inject({ method: 'GET', url: '/api/system-control/security', headers: { 'cf-access-jwt-assertion': token({ aud: config.controlAudience, email: 'not-allowed@example.invalid' }) } });
    expect(wrongAdminEmail.statusCode).toBe(403);
    const adminOnControl = await app.inject({ method: 'GET', url: '/api/system-control/security', headers: { 'cf-access-jwt-assertion': token({ aud: config.controlAudience, email: 'owner@example.invalid' }) } });
    expect(adminOnControl.statusCode).toBe(200);
    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    await app.close();
  });

  it('环境解析只接受管理员 control 占位配置', () => {
    process.env.QIMAO_ACCESS_REQUIRED = 'true';
    process.env.QIMAO_ACCESS_ISSUER = config.issuer;
    process.env.QIMAO_ACCESS_CONTROL_AUDIENCE = config.controlAudience;
    process.env.QIMAO_ACCESS_CONTROL_EMAIL_ALLOWLIST = 'owner@example.invalid';
    const parsed = createCloudflareAccessConfigFromEnv();
    expect(parsed).toMatchObject({ required: true, controlAudience: config.controlAudience });
  });

  it('管理员 Access 配置不要求员工 Cloudflare audience', () => {
    const parsed = createCloudflareAccessConfigFromEnv({
      QIMAO_ACCESS_REQUIRED: 'true',
      QIMAO_ACCESS_ISSUER: config.issuer,
      QIMAO_ACCESS_CONTROL_AUDIENCE: config.controlAudience,
      QIMAO_ACCESS_CONTROL_EMAIL_ALLOWLIST: 'owner@example.invalid',
    });
    expect(parsed).toMatchObject({ required: true, controlAudience: config.controlAudience });
  });
});
