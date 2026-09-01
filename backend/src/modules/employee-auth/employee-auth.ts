import { createHash, createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

import type { SystemControlPrincipal } from '../system-control/system-control.auth.js';

export const EMPLOYEE_SESSION_COOKIE = '__Host-qimao_employee_session';
export const EMPLOYEE_SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;
export const EMPLOYEE_LOGIN_FAILURE_LIMIT = 5;
export const EMPLOYEE_LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
export const EMPLOYEE_LOGIN_RATE_ENTRY_LIMIT = 1024;
export const UPLOAD_DIRECT_CAPABILITY_TTL_SECONDS = 5 * 60;

export type EmployeeAuthConfig = Readonly<{
  required: true;
  username: string;
  passwordVerifier: PasswordVerifier;
  sessionSecret: Buffer;
  origin: string;
}>;

export type EmployeePrincipalResolver = (request: FastifyRequest) => SystemControlPrincipal | null;

export const UPLOAD_DIRECT_CAPABILITY_METHODS = ['POST', 'HEAD', 'PATCH'] as const;
export type UploadDirectCapabilityMethod = typeof UPLOAD_DIRECT_CAPABILITY_METHODS[number];
export type UploadDirectCapabilityClaims = Readonly<{
  v: 1;
  sub: string;
  projectId: string;
  uploadSessionId: string;
  storageUploadId: string;
  sizeBytes: number;
  methods: readonly UploadDirectCapabilityMethod[];
  iat: number;
  exp: number;
}>;

export class EmployeeAuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmployeeAuthConfigError';
  }
}

export class EmployeeAuthUnauthorizedError extends Error {
  constructor() {
    super('员工身份验证失败。');
    this.name = 'EmployeeAuthUnauthorizedError';
  }
}

type PasswordVerifier = Readonly<{
  version: 'scrypt-v1';
  cost: number;
  blockSize: number;
  parallelization: number;
  salt: Buffer;
  digest: Buffer;
}>;

type SessionPayload = Readonly<{
  v: 1;
  sub: string;
  iat: number;
  exp: number;
}>;

const MAX_PASSWORD_VERIFIER_LENGTH = 2048;
const MAX_SESSION_TOKEN_LENGTH = 2048;
const MAX_UPLOAD_DIRECT_CAPABILITY_LENGTH = 4096;
const SESSION_SECRET_BYTES = 32;

type LoginRateEntry = {
  failures: number;
  windowStartedAt: number;
  lastSeenAt: number;
  blockedUntil: number;
};

const parseBoolean = (value: string | undefined) => value?.trim().toLowerCase() === 'true';

const decodeBase64Url = (value: string, label: string, maxBytes: number) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > Math.ceil(maxBytes * 4 / 3) + 4) {
    throw new EmployeeAuthConfigError(`员工认证${label}格式无效。`);
  }
  const decoded = Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4), 'base64');
  if (decoded.length === 0 || decoded.length > maxBytes) throw new EmployeeAuthConfigError(`员工认证${label}格式无效。`);
  return decoded;
};

const parseInteger = (value: string, label: string, minimum: number, maximum: number) => {
  if (!/^[0-9]+$/.test(value)) throw new EmployeeAuthConfigError(`员工认证${label}参数无效。`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new EmployeeAuthConfigError(`员工认证${label}参数无效。`);
  }
  return parsed;
};

const parsePasswordVerifier = (value: string): PasswordVerifier => {
  if (!value || value.length > MAX_PASSWORD_VERIFIER_LENGTH) throw new EmployeeAuthConfigError('员工密码 verifier 未配置或过长。');
  const parts = value.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt-v1' || !parts[1]?.startsWith('N=') || !parts[2]?.startsWith('r=') || !parts[3]?.startsWith('p=')) {
    throw new EmployeeAuthConfigError('员工密码 verifier 格式无效。');
  }
  const cost = parseInteger(parts[1].slice(2), 'scrypt N', 16_384, 1_048_576);
  if ((cost & (cost - 1)) !== 0) throw new EmployeeAuthConfigError('员工密码 verifier scrypt N 参数无效。');
  const blockSize = parseInteger(parts[2].slice(2), 'scrypt r', 1, 32);
  const parallelization = parseInteger(parts[3].slice(2), 'scrypt p', 1, 16);
  const salt = decodeBase64Url(parts[4] ?? '', 'salt', 64);
  const digest = decodeBase64Url(parts[5] ?? '', 'hash', 64);
  if (digest.length !== 32) throw new EmployeeAuthConfigError('员工密码 verifier hash 长度无效。');
  return { version: 'scrypt-v1', cost, blockSize, parallelization, salt, digest };
};

const normalizeOrigin = (value: string) => {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new EmployeeAuthConfigError('员工会话 origin 无效。'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new EmployeeAuthConfigError('员工会话 origin 必须是无路径、无凭据的 HTTPS 源。');
  }
  return parsed.origin;
};

const decodeJson = (value: string): SessionPayload | null => {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4), 'base64').toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const payload = parsed as Record<string, unknown>;
    if (payload.v !== 1 || typeof payload.sub !== 'string' || !payload.sub || typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return null;
    if (!Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)) return null;
    return { v: 1, sub: payload.sub, iat: payload.iat, exp: payload.exp };
  } catch {
    return null;
  }
};

const decodeUploadCapabilityJson = (value: string): UploadDirectCapabilityClaims | null => {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4), 'base64').toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const payload = parsed as Record<string, unknown>;
    const methods = payload.methods;
    if (payload.v !== 1 || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128
      || typeof payload.projectId !== 'string' || !payload.projectId || payload.projectId.length > 128
      || typeof payload.uploadSessionId !== 'string' || !payload.uploadSessionId || payload.uploadSessionId.length > 128
      || typeof payload.storageUploadId !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(payload.storageUploadId)
      || typeof payload.sizeBytes !== 'number' || !Number.isSafeInteger(payload.sizeBytes) || payload.sizeBytes < 1
      || !Array.isArray(methods) || methods.length !== UPLOAD_DIRECT_CAPABILITY_METHODS.length
      || methods.some((method) => !UPLOAD_DIRECT_CAPABILITY_METHODS.includes(method as UploadDirectCapabilityMethod))
      || new Set(methods).size !== methods.length
      || typeof payload.iat !== 'number' || typeof payload.exp !== 'number'
      || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)) return null;
    return {
      v: 1,
      sub: payload.sub,
      projectId: payload.projectId,
      uploadSessionId: payload.uploadSessionId,
      storageUploadId: payload.storageUploadId,
      sizeBytes: payload.sizeBytes,
      methods: methods as UploadDirectCapabilityMethod[],
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
};

const encode = (value: string | Buffer) => Buffer.from(value).toString('base64url');

export const createEmployeeAuthConfigFromEnv = (env: NodeJS.ProcessEnv = process.env): EmployeeAuthConfig | null => {
  const required = parseBoolean(env.QIMAO_EMPLOYEE_SESSION_REQUIRED);
  const inputs = [env.QIMAO_EMPLOYEE_AUTH_USERNAME, env.QIMAO_EMPLOYEE_PASSWORD_VERIFIER, env.QIMAO_EMPLOYEE_SESSION_SECRET, env.QIMAO_EMPLOYEE_ORIGIN];
  if (!required && inputs.every((item) => !item?.trim())) return null;
  const username = env.QIMAO_EMPLOYEE_AUTH_USERNAME?.trim() ?? '';
  const verifierValue = env.QIMAO_EMPLOYEE_PASSWORD_VERIFIER?.trim() ?? '';
  const secretValue = env.QIMAO_EMPLOYEE_SESSION_SECRET?.trim() ?? '';
  const originValue = env.QIMAO_EMPLOYEE_ORIGIN?.trim() ?? '';
  if (!required || !username || username.length > 128 || /[\r\n]/.test(username) || !verifierValue || !secretValue || !originValue) {
    throw new EmployeeAuthConfigError('QIMAO_EMPLOYEE_SESSION_REQUIRED=true 时必须配置员工用户名、scrypt verifier、会话 Secret 和 origin。');
  }
  const sessionSecret = decodeBase64Url(secretValue, 'session Secret', 128);
  if (sessionSecret.length < SESSION_SECRET_BYTES) throw new EmployeeAuthConfigError('员工会话 Secret 至少需要32字节。');
  return { required: true, username, passwordVerifier: parsePasswordVerifier(verifierValue), sessionSecret, origin: normalizeOrigin(originValue) };
};

export const employeePrincipal = (subject: string): SystemControlPrincipal => ({
  subject,
  audience: 'employee',
  capabilities: ['tasks:read', 'feedback:create'],
  projectAccess: 'all',
});

export const employeeOriginAllowed = (request: FastifyRequest, origin: string) => {
  const requestOrigin = request.headers.origin;
  return typeof requestOrigin === 'string' && requestOrigin.trim() === origin;
};

export class EmployeeAuthService {
  private readonly loginRateEntries = new Map<string, LoginRateEntry>();

  constructor(private readonly config: EmployeeAuthConfig, private readonly now: () => number = () => Date.now()) {}

  get origin() { return this.config.origin; }
  get subject() { return this.config.username; }
  get loginRateEntryCount() { return this.loginRateEntries.size; }

  private cleanupLoginRateEntries(now: number) {
    for (const [key, entry] of this.loginRateEntries) {
      if (entry.blockedUntil <= now && now - entry.lastSeenAt >= EMPLOYEE_LOGIN_RATE_WINDOW_MS) {
        this.loginRateEntries.delete(key);
      }
    }
  }

  private makeLoginRateCapacity(key: string, now: number) {
    this.cleanupLoginRateEntries(now);
    if (this.loginRateEntries.has(key) || this.loginRateEntries.size < EMPLOYEE_LOGIN_RATE_ENTRY_LIMIT) return;
    let oldestKey: string | null = null;
    let oldestSeenAt = Number.POSITIVE_INFINITY;
    for (const [candidateKey, entry] of this.loginRateEntries) {
      if (entry.lastSeenAt < oldestSeenAt) {
        oldestKey = candidateKey;
        oldestSeenAt = entry.lastSeenAt;
      }
    }
    if (oldestKey) this.loginRateEntries.delete(oldestKey);
  }

  loginRetryAfterSeconds(sourceKey: string) {
    const now = this.now();
    this.cleanupLoginRateEntries(now);
    const entry = this.loginRateEntries.get(sourceKey);
    if (!entry || entry.blockedUntil <= now) return null;
    return Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000));
  }

  recordLoginFailure(sourceKey: string) {
    const now = this.now();
    this.makeLoginRateCapacity(sourceKey, now);
    const existing = this.loginRateEntries.get(sourceKey);
    const withinWindow = existing && now - existing.windowStartedAt < EMPLOYEE_LOGIN_RATE_WINDOW_MS;
    const failures = withinWindow ? existing.failures + 1 : 1;
    const blockedUntil = failures >= EMPLOYEE_LOGIN_FAILURE_LIMIT ? now + EMPLOYEE_LOGIN_RATE_WINDOW_MS : 0;
    this.loginRateEntries.set(sourceKey, {
      failures,
      windowStartedAt: withinWindow ? existing.windowStartedAt : now,
      lastSeenAt: now,
      blockedUntil,
    });
    return blockedUntil > now ? Math.max(1, Math.ceil((blockedUntil - now) / 1000)) : null;
  }

  clearLoginFailures(sourceKey: string) {
    this.loginRateEntries.delete(sourceKey);
  }

  resolvePrincipal(request: FastifyRequest): SystemControlPrincipal | null {
    return this.readSession(request)?.principal ?? null;
  }

  readSession(request: FastifyRequest): { principal: SystemControlPrincipal; expiresAt: string } | null {
    const header = request.headers.cookie;
    if (typeof header !== 'string' || header.length > 4096) return null;
    const value = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${EMPLOYEE_SESSION_COOKIE}=`))?.slice(EMPLOYEE_SESSION_COOKIE.length + 1);
    if (!value || value.length > MAX_SESSION_TOKEN_LENGTH) return null;
    const pieces = value.split('.');
    if (pieces.length !== 3 || pieces[0] !== 'v1' || !pieces[1] || !pieces[2]) return null;
    const expected = createHmac('sha256', this.config.sessionSecret).update(`${pieces[0]}.${pieces[1]}`).digest();
    let provided: Buffer;
    try { provided = decodeBase64Url(pieces[2], 'session signature', 64); } catch { return null; }
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
    const payload = decodeJson(pieces[1]);
    const nowSeconds = Math.floor(this.now() / 1000);
    if (!payload || payload.sub !== this.config.username || payload.exp <= nowSeconds || payload.iat > nowSeconds + 60 || payload.exp - payload.iat !== EMPLOYEE_SESSION_MAX_AGE_SECONDS) return null;
    return { principal: employeePrincipal(payload.sub), expiresAt: new Date(payload.exp * 1000).toISOString() };
  }

  verifyPassword(username: string, password: string) {
    let actual: Buffer;
    try {
      actual = scryptSync(password, this.config.passwordVerifier.salt, this.config.passwordVerifier.digest.length, {
        N: this.config.passwordVerifier.cost,
        r: this.config.passwordVerifier.blockSize,
        p: this.config.passwordVerifier.parallelization,
        maxmem: Math.max(32 * 1024 * 1024, 128 * this.config.passwordVerifier.cost * this.config.passwordVerifier.blockSize + 1024),
      });
    } catch { return false; }
    const actualUsername = createHash('sha256').update(username, 'utf8').digest();
    const expectedUsername = createHash('sha256').update(this.config.username, 'utf8').digest();
    const usernameMatches = timingSafeEqual(actualUsername, expectedUsername);
    const passwordMatches = actual.length === this.config.passwordVerifier.digest.length && timingSafeEqual(actual, this.config.passwordVerifier.digest);
    return usernameMatches && passwordMatches;
  }

  issueSession(now = this.now()) {
    const iat = Math.floor(now / 1000);
    const exp = iat + EMPLOYEE_SESSION_MAX_AGE_SECONDS;
    const payload = encode(JSON.stringify({ v: 1, sub: this.config.username, iat, exp }));
    const signature = encode(createHmac('sha256', this.config.sessionSecret).update(`v1.${payload}`).digest());
    return { token: `v1.${payload}.${signature}`, expiresAt: new Date(exp * 1000).toISOString() };
  }

  issueUploadDirectCapability(input: {
    subject: string;
    projectId: string;
    uploadSessionId: string;
    storageUploadId: string;
    sizeBytes: number;
    expiresAt: number;
    now?: number;
  }) {
    const nowSeconds = Math.floor((input.now ?? this.now()) / 1000);
    const exp = Math.floor(input.expiresAt / 1000);
    if (!input.subject || input.subject.length > 128 || !input.projectId || input.projectId.length > 128
      || !input.uploadSessionId || input.uploadSessionId.length > 128 || !/^[A-Za-z0-9_-]{1,255}$/.test(input.storageUploadId)
      || !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 1
      || !Number.isSafeInteger(exp) || exp <= nowSeconds || exp - nowSeconds > UPLOAD_DIRECT_CAPABILITY_TTL_SECONDS) {
      throw new EmployeeAuthConfigError('直连上传能力参数无效。');
    }
    const payload = encode(JSON.stringify({
      v: 1,
      sub: input.subject,
      projectId: input.projectId,
      uploadSessionId: input.uploadSessionId,
      storageUploadId: input.storageUploadId,
      sizeBytes: input.sizeBytes,
      methods: [...UPLOAD_DIRECT_CAPABILITY_METHODS],
      iat: nowSeconds,
      exp,
    }));
    const signature = encode(createHmac('sha256', this.config.sessionSecret).update(`u1.${payload}`).digest());
    return { token: `u1.${payload}.${signature}`, expiresAt: new Date(exp * 1000).toISOString() };
  }

  verifyUploadDirectCapability(token: string): UploadDirectCapabilityClaims | null {
    if (!token || token.length > MAX_UPLOAD_DIRECT_CAPABILITY_LENGTH) return null;
    const pieces = token.split('.');
    if (pieces.length !== 3 || pieces[0] !== 'u1' || !pieces[1] || !pieces[2]) return null;
    let provided: Buffer;
    try { provided = decodeBase64Url(pieces[2], '直连上传能力签名', 64); } catch { return null; }
    const expected = createHmac('sha256', this.config.sessionSecret).update(`${pieces[0]}.${pieces[1]}`).digest();
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
    const payload = decodeUploadCapabilityJson(pieces[1]);
    const nowSeconds = Math.floor(this.now() / 1000);
    if (!payload || payload.exp <= nowSeconds || payload.iat > nowSeconds + 60
      || payload.exp <= payload.iat || payload.exp - payload.iat > UPLOAD_DIRECT_CAPABILITY_TTL_SECONDS) return null;
    return payload;
  }

  cookie(token: string, maxAge = EMPLOYEE_SESSION_MAX_AGE_SECONDS) {
    return `${EMPLOYEE_SESSION_COOKIE}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  }
}

export const createEmployeeAuthServiceFromEnv = (env: NodeJS.ProcessEnv = process.env) => {
  const config = createEmployeeAuthConfigFromEnv(env);
  return config ? new EmployeeAuthService(config) : null;
};
