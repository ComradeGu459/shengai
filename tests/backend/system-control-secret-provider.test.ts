import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import { createPool } from '../../backend/src/database/pool.js';
import { startServer } from '../../backend/src/server.js';
import {
  createSystemControlSecretProviderFromEnv,
  SYSTEM_CONTROL_SECRET_PROVIDER_ENV,
  SystemControlSecretProviderConfigurationError,
} from '../../backend/src/modules/system-control/system-control.secret-provider.js';
import { runSystemControlSecretValidationWorker } from '../../backend/src/workers/system-control.secret-validation.worker.entry.js';
import { runTermExtractionWorker } from '../../backend/src/workers/term-extraction.worker.entry.js';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
const candidate = (overrides: Record<string, unknown> = {}) => ({
  candidateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  provider: 'deepseek',
  displayName: 'DeepSeek 主用',
  value: 'runtime-secret-primary',
  ...overrides,
});

const query = (overrides: Record<string, unknown> = {}) => ({
  environment: 'development' as const,
  limit: 50,
  offset: 0,
  ...overrides,
});

describe('TERM-SECRET-BACK-120 env-backed provider', () => {
  it('缺失配置为 not_configured，且不伪造候选', async () => {
    const provider = createSystemControlSecretProviderFromEnv({});
    expect(await provider.status()).toBe('not_configured');
    expect(await provider.discover(query())).toMatchObject({ items: [], total: 0 });
    expect(await provider.resolve('deepseek-primary')).toBeNull();
  });

  it('坏 Base64、坏 JSON、重复身份和超过八项均 fail-closed 且不带原值', () => {
    const cases: Array<[string, string]> = [
      ['INVALID_BASE64', 'not-base64!'],
      ['INVALID_JSON', Buffer.from('{not-json', 'utf8').toString('base64')],
      ['INVALID_SCHEMA', encode([candidate(), candidate()])],
      ['INVALID_SCHEMA', encode(Array.from({ length: 9 }, (_, index) => candidate({ candidateId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` })))],
    ];
    for (const [code, encoded] of cases) {
      expect(() => createSystemControlSecretProviderFromEnv({ [SYSTEM_CONTROL_SECRET_PROVIDER_ENV]: encoded }))
        .toThrowError(new SystemControlSecretProviderConfigurationError(code as 'INVALID_BASE64'));
    }
  });

  it('支持 provider/search 过滤和分页；公开投影不含原值，只有 resolveValue 返回原值', async () => {
    const rawValues = ['runtime-secret-primary', 'runtime-secret-custom-a', 'runtime-secret-custom-b'];
    const provider = createSystemControlSecretProviderFromEnv({
      [SYSTEM_CONTROL_SECRET_PROVIDER_ENV]: encode([
        candidate(),
        candidate({ candidateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', provider: 'custom', displayName: 'Custom Alpha', value: rawValues[1] }),
        candidate({ candidateId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', provider: 'custom', displayName: 'Custom Beta', value: rawValues[2] }),
      ]),
    });
    expect(await provider.status()).toBe('ready');
    const page = await provider.discover(query({ provider: 'custom', search: 'custom', limit: 1, offset: 0 }));
    expect(page).toMatchObject({ total: 2, items: [{ candidateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', provider: 'custom', displayName: 'Custom Alpha', status: 'available' }] });
    const secondPage = await provider.discover(query({ provider: 'custom', limit: 1, offset: 1 }));
    expect(secondPage.items.map((item) => item.candidateId)).toEqual(['cccccccc-cccc-4ccc-8ccc-cccccccccccc']);
    expect((await provider.discover(query({ capability: 'asr' }))).items).toEqual([]);

    const resolved = await provider.resolve('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    expect(resolved).toMatchObject({ candidateId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', provider: 'custom', capability: 'terms', redactedLabel: 'Custom Beta' });
    expect(JSON.stringify(resolved)).not.toContain(rawValues[2]);
    expect(JSON.stringify(page)).not.toContain(rawValues[1]);
    expect(JSON.stringify(provider)).not.toMatch(/runtime-secret/i);
    expect(await provider.resolveValue('cccccccc-cccc-4ccc-8ccc-cccccccccccc')).toBe(rawValues[2]);
    expect(await provider.validate(resolved!)).toMatchObject({ status: 'succeeded', latencyMs: 0 });
    expect(await provider.validate({ ...resolved!, referenceDigest: '0'.repeat(64) })).toMatchObject({ status: 'failed', reasonCode: 'SECRET_CANDIDATE_CHANGED' });
  });

  it('server、Secret validation Worker、term Worker standalone 默认共享同一 env factory，显式缺失/非法均 fail-closed', async () => {
    const previous = process.env[SYSTEM_CONTROL_SECRET_PROVIDER_ENV];
    process.env[SYSTEM_CONTROL_SECRET_PROVIDER_ENV] = encode([candidate({ candidateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })]);
    let server: Awaited<ReturnType<typeof startServer>> | null = null;
    try {
      server = await startServer({ port: 0 });
      expect(await server.systemControlSecretProvider.status()).toBe('ready');
      expect(await server.systemControlSecretProvider.resolve('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).toMatchObject({ provider: 'deepseek', capability: 'terms' });
    } finally {
      if (server) {
        await server.close();
      }
      if (previous === undefined) delete process.env[SYSTEM_CONTROL_SECRET_PROVIDER_ENV];
      else process.env[SYSTEM_CONTROL_SECRET_PROVIDER_ENV] = previous;
    }

    process.env[SYSTEM_CONTROL_SECRET_PROVIDER_ENV] = 'invalid-base64';
    const aborted = new AbortController();
    aborted.abort();
    try {
      await expect(runSystemControlSecretValidationWorker({ database: {} as never, signal: aborted.signal })).rejects.toThrow('SYSTEM_CONTROL_SECRET_PROVIDER_INVALID_BASE64');
      await expect(runTermExtractionWorker({ database: {} as never, storage: {} as never, signal: aborted.signal })).rejects.toThrow('SYSTEM_CONTROL_SECRET_PROVIDER_INVALID_BASE64');
    } finally {
      if (previous === undefined) delete process.env[SYSTEM_CONTROL_SECRET_PROVIDER_ENV];
      else process.env[SYSTEM_CONTROL_SECRET_PROVIDER_ENV] = previous;
    }
  });

  it('拒绝非 UUID candidateId，并让 UUID discovery 原样通过 create/rotate 写入 UUID 列', async () => {
    expect(() => createSystemControlSecretProviderFromEnv({
      [SYSTEM_CONTROL_SECRET_PROVIDER_ENV]: encode([candidate({ candidateId: 'deepseek-primary' })]),
    })).toThrowError(new SystemControlSecretProviderConfigurationError('INVALID_SCHEMA'));

    const primaryId = '11111111-1111-4111-8111-111111111111';
    const standbyId = '22222222-2222-4222-8222-222222222222';
    const provider = createSystemControlSecretProviderFromEnv({
      [SYSTEM_CONTROL_SECRET_PROVIDER_ENV]: encode([
        candidate({ candidateId: primaryId }),
        candidate({ candidateId: standbyId, displayName: 'DeepSeek Standby', value: 'runtime-secret-standby' }),
      ]),
    });
    const discovered = await provider.discover(query({ limit: 10 }));
    expect(discovered.items.map((item) => item.candidateId)).toEqual([primaryId, standbyId]);

    const pool = createPool();
    const app = createApp({
      database: pool,
      systemControlSecretProvider: provider,
      systemControlPrincipalResolver: (request) => ({
        subject: request.headers['x-system-control-test-identity'] === 'owner' ? 'owner' : 'reader',
        audience: 'system-control',
        capabilities: request.headers['x-system-control-test-identity'] === 'owner'
          ? ['system-control:secrets:read', 'system-control:secrets:write']
          : ['system-control:secrets:read'],
      }),
    });
    const authHeaders = { 'x-system-control-test-identity': 'owner' };
    const referenceId = randomUUID();
    const firstVersionId = randomUUID();
    const secondVersionId = randomUUID();
    try {
      await app.ready();
      const discoveryResponse = await app.inject({ method: 'GET', url: '/api/system-control/secrets/discovery?limit=10', headers: { 'x-system-control-test-identity': 'reader' } });
      expect(discoveryResponse.statusCode).toBe(200);
      expect(discoveryResponse.json().items.map((item: { candidateId: string }) => item.candidateId)).toEqual([primaryId, standbyId]);

      const created = await app.inject({
        method: 'POST',
        url: '/api/system-control/secrets',
        headers: { ...authHeaders, 'idempotency-key': `create-${randomUUID()}` },
        payload: { commandId: randomUUID(), secretReferenceId: referenceId, secretReferenceVersionId: firstVersionId, candidateId: primaryId },
      });
      expect(created.statusCode, created.body).toBe(201);
      expect((await pool.query('SELECT candidate_id FROM system_secret_reference_versions WHERE id=$1', [firstVersionId])).rows[0].candidate_id).toBe(primaryId);

      const rotated = await app.inject({
        method: 'POST',
        url: `/api/system-control/secrets/${referenceId}/rotate`,
        headers: { ...authHeaders, 'idempotency-key': `rotate-${randomUUID()}` },
        payload: { rotationCommandId: randomUUID(), secretReferenceVersionId: secondVersionId, candidateId: standbyId },
      });
      expect(rotated.statusCode, rotated.body).toBe(201);
      expect((await pool.query('SELECT candidate_id FROM system_secret_reference_versions WHERE id=$1', [secondVersionId])).rows[0].candidate_id).toBe(standbyId);
    } finally {
      await app.close();
    }
  });
});
