import { scryptSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  createEmployeeAuthConfigFromEnv,
  EmployeeAuthService,
} from '../../backend/src/modules/employee-auth/employee-auth.js';
import { normalizeDirectUploadOrigin } from '../../backend/src/config.js';
import {
  UPLOAD_DIRECT_CORS_ALLOWED_HEADERS,
  UPLOAD_DIRECT_CORS_EXPOSED_HEADERS,
  UPLOAD_DIRECT_CORS_ORIGIN,
} from '@qimao-terms-cloud/contracts';

const createService = (now = Date.now()) => {
  const salt = Buffer.from('direct-capability-unit-salt');
  const digest = scryptSync('direct-capability-password', salt, 32, { N: 16_384, r: 8, p: 1 });
  const config = createEmployeeAuthConfigFromEnv({
    QIMAO_EMPLOYEE_SESSION_REQUIRED: 'true',
    QIMAO_EMPLOYEE_AUTH_USERNAME: 'direct-capability-unit',
    QIMAO_EMPLOYEE_PASSWORD_VERIFIER: `scrypt-v1$N=16384$r=8$p=1$${salt.toString('base64url')}$${digest.toString('base64url')}`,
    QIMAO_EMPLOYEE_SESSION_SECRET: Buffer.from('direct-capability-unit-secret-32-bytes!').toString('base64url'),
    QIMAO_EMPLOYEE_ORIGIN: 'https://milaidi.online',
  });
  return { service: new EmployeeAuthService(config!, () => now), now };
};

describe('员工会话 Secret 签发 TUS 直连能力', () => {
  it('只接受服务端配置的绝对 HTTPS origin', () => {
    expect(normalizeDirectUploadOrigin('https://upload.milaidi.online')).toBe('https://upload.milaidi.online');
    expect(() => normalizeDirectUploadOrigin('http://upload.milaidi.online')).toThrow();
    expect(() => normalizeDirectUploadOrigin('https://upload.milaidi.online/path')).toThrow();
    expect(() => normalizeDirectUploadOrigin('https://user:pass@upload.milaidi.online')).toThrow();
    expect(normalizeDirectUploadOrigin(undefined)).toBeNull();
  });

  it('冻结无 Cookie 直连 CORS 合同', () => {
    expect(UPLOAD_DIRECT_CORS_ORIGIN).toBe('https://milaidi.online');
    expect(UPLOAD_DIRECT_CORS_ALLOWED_HEADERS).toEqual([
      'Tus-Resumable', 'Upload-Length', 'Upload-Metadata', 'Upload-Offset', 'Content-Type', 'x-qimao-upload-capability',
    ]);
    expect(UPLOAD_DIRECT_CORS_EXPOSED_HEADERS).toEqual([
      'Location', 'Tus-Resumable', 'Upload-Offset', 'Upload-Length', 'Upload-Metadata',
    ]);
  });

  it('严格绑定项目、会话、资源、大小和方法，篡改签名不可验证', () => {
    const { service, now } = createService();
    const issued = service.issueUploadDirectCapability({
      subject: 'direct-capability-unit',
      projectId: 'project-1',
      uploadSessionId: 'session-1',
      storageUploadId: 'storage_1',
      sizeBytes: 1024,
      expiresAt: now + 60_000,
    });
    const claims = service.verifyUploadDirectCapability(issued.token);
    expect(claims).toMatchObject({
      sub: 'direct-capability-unit', projectId: 'project-1', uploadSessionId: 'session-1',
      storageUploadId: 'storage_1', sizeBytes: 1024, methods: ['POST', 'HEAD', 'PATCH'],
    });
    expect(service.verifyUploadDirectCapability(`${issued.token.slice(0, -1)}x`)).toBeNull();
  });

  it('过期后失效，且签发上限不超过短时窗口', () => {
    let now = Date.now();
    const { service } = createService(now);
    const issued = service.issueUploadDirectCapability({
      subject: 'direct-capability-unit', projectId: 'project-1', uploadSessionId: 'session-1',
      storageUploadId: 'storage_1', sizeBytes: 1, expiresAt: now + 60_000,
    });
    expect(Date.parse(issued.expiresAt) - now).toBeLessThanOrEqual(60_000);
    now += 61_000;
    const expiredService = createService(now).service;
    expect(expiredService.verifyUploadDirectCapability(issued.token)).toBeNull();
  });
});
