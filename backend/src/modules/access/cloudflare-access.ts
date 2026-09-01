import { createPublicKey, createVerify } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

import {
  SYSTEM_CONTROL_BUDGET_PUBLISH,
  SYSTEM_CONTROL_BUDGET_READ,
  SYSTEM_CONTROL_BUDGET_WRITE,
  SYSTEM_CONTROL_ENGINES_READ,
  SYSTEM_CONTROL_ENGINES_TEST,
  SYSTEM_CONTROL_ENGINES_WRITE,
  SYSTEM_CONTROL_LOGS_READ,
  SYSTEM_CONTROL_READ,
  SYSTEM_CONTROL_ROUTING_PUBLISH,
  SYSTEM_CONTROL_ROUTING_READ,
  SYSTEM_CONTROL_ROUTING_ROLLBACK,
  SYSTEM_CONTROL_ROUTING_WRITE,
  SYSTEM_CONTROL_RUNTIME_READ,
  SYSTEM_CONTROL_SECRETS_READ,
  SYSTEM_CONTROL_SECRETS_TEST,
  SYSTEM_CONTROL_SECRETS_WRITE,
  SYSTEM_CONTROL_STRATEGY_APPROVE,
  SYSTEM_CONTROL_STRATEGY_EVALUATE,
  SYSTEM_CONTROL_STRATEGY_READ,
  SYSTEM_CONTROL_STRATEGY_RELEASE,
  SYSTEM_CONTROL_STRATEGY_WRITE,
  type SystemControlPrincipal,
} from '../system-control/system-control.auth.js';
import type { SystemControlAccessReadinessProvider } from '../system-control/system-control.secret-provider.js';

export type CloudflareAccessAudience = 'system-control';

export type CloudflareAccessConfig = Readonly<{
  required: boolean;
  issuer: string;
  controlAudience: string;
  controlEmails: readonly string[];
  jwksUrl: string;
}>;

export type CloudflareAccessPrincipalResolver = (
  request: FastifyRequest,
  expectedAudience: CloudflareAccessAudience,
) => Promise<SystemControlPrincipal | null>;

type JsonObject = Record<string, unknown>;
type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

const CONTROL_CAPABILITIES = Object.freeze([
  SYSTEM_CONTROL_READ,
  SYSTEM_CONTROL_ENGINES_READ,
  SYSTEM_CONTROL_ENGINES_WRITE,
  SYSTEM_CONTROL_ENGINES_TEST,
  SYSTEM_CONTROL_SECRETS_READ,
  SYSTEM_CONTROL_SECRETS_WRITE,
  SYSTEM_CONTROL_SECRETS_TEST,
  SYSTEM_CONTROL_ROUTING_READ,
  SYSTEM_CONTROL_ROUTING_WRITE,
  SYSTEM_CONTROL_ROUTING_PUBLISH,
  SYSTEM_CONTROL_ROUTING_ROLLBACK,
  SYSTEM_CONTROL_BUDGET_READ,
  SYSTEM_CONTROL_BUDGET_WRITE,
  SYSTEM_CONTROL_BUDGET_PUBLISH,
  SYSTEM_CONTROL_RUNTIME_READ,
  SYSTEM_CONTROL_LOGS_READ,
  SYSTEM_CONTROL_STRATEGY_READ,
  SYSTEM_CONTROL_STRATEGY_WRITE,
  SYSTEM_CONTROL_STRATEGY_EVALUATE,
  SYSTEM_CONTROL_STRATEGY_APPROVE,
  SYSTEM_CONTROL_STRATEGY_RELEASE,
  'system-control:feedback:read',
  'system-control:feedback:write',
  'feedback:create',
] as const);

const normalizeIssuer = (value: string) => value.trim().replace(/\/+$/, '');

const decodeBase64Url = (value: string) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid base64url');
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4), 'base64');
};

const decodeJson = (value: string): JsonObject => {
  const parsed: unknown = JSON.parse(decodeBase64Url(value).toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid jwt object');
  return parsed as JsonObject;
};

const nonEmptyString = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

const audienceIncludes = (value: unknown, expected: string) =>
  typeof value === 'string' ? value === expected : Array.isArray(value) && value.every((entry) => typeof entry === 'string') && value.includes(expected);

const parseNumberClaim = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;

const parseEmailList = (value: string | undefined) => {
  if (!value) return [] as string[];
  return [...new Set(value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))];
};

const parseBoolean = (value: string | undefined) => value?.trim().toLowerCase() === 'true';

export class CloudflareAccessConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudflareAccessConfigError';
  }
}

export class CloudflareAccessVerificationError extends Error {
  constructor() {
    super('Cloudflare Access 身份验证失败。');
    this.name = 'CloudflareAccessVerificationError';
  }
}

export const createCloudflareAccessConfigFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): CloudflareAccessConfig | null => {
  const required = parseBoolean(env.QIMAO_ACCESS_REQUIRED);
  const issuer = normalizeIssuer(env.QIMAO_ACCESS_ISSUER ?? '');
  const controlAudience = env.QIMAO_ACCESS_CONTROL_AUDIENCE?.trim() ?? '';
  const controlEmails = parseEmailList(env.QIMAO_ACCESS_CONTROL_EMAIL_ALLOWLIST);
  const anyAccessInput = Boolean(issuer || controlAudience || controlEmails.length);
  const complete = Boolean(issuer && controlAudience && controlEmails.length > 0);
  if (required && !complete) throw new CloudflareAccessConfigError('QIMAO_ACCESS_REQUIRED=true 时必须配置完整的 Cloudflare Access issuer、audience 和邮箱白名单。');
  if (!anyAccessInput) return null;
  if (!complete) return null;
  let parsedIssuer: URL;
  try { parsedIssuer = new URL(issuer); } catch { throw new CloudflareAccessConfigError('Cloudflare Access issuer 无效。'); }
  if (parsedIssuer.protocol !== 'https:') throw new CloudflareAccessConfigError('Cloudflare Access issuer 必须使用 HTTPS。');
  const jwksUrl = `${issuer}/cdn-cgi/access/certs`;
  let parsedJwksUrl: URL;
  try {
    parsedJwksUrl = new URL(jwksUrl);
  } catch {
    throw new CloudflareAccessConfigError('Cloudflare Access JWKS 地址无效。');
  }
  if (parsedJwksUrl.protocol !== 'https:') throw new CloudflareAccessConfigError('Cloudflare Access JWKS 必须使用 HTTPS。');
  return {
    required,
    issuer,
    controlAudience,
    controlEmails,
    jwksUrl: parsedJwksUrl.toString(),
  };
};

type CachedKeys = Readonly<{ expiresAt: number; keys: ReadonlyMap<string, JsonObject> }>;

export class CloudflareAccessVerifier {
  private cachedKeys: CachedKeys | null = null;
  private readonly fetcher: Fetcher;
  private readonly now: () => number;
  private readonly cacheTtlMs: number;

  constructor(
    private readonly config: CloudflareAccessConfig,
    options: Readonly<{ fetcher?: Fetcher; now?: () => number; cacheTtlMs?: number }> = {},
  ) {
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.now = options.now ?? (() => Date.now());
    this.cacheTtlMs = Math.min(Math.max(options.cacheTtlMs ?? 300_000, 1_000), 600_000);
  }

  async verifyRequest(request: FastifyRequest, expectedAudience: CloudflareAccessAudience = 'system-control'): Promise<SystemControlPrincipal | null> {
    const header = request.headers['cf-access-jwt-assertion'];
    if (typeof header !== 'string' || !header.trim()) return null;
    try {
      return await this.verifyToken(header.trim(), expectedAudience);
    } catch {
      return null;
    }
  }

  async verifyToken(token: string, expectedAudience: CloudflareAccessAudience = 'system-control'): Promise<SystemControlPrincipal> {
    const segments = token.split('.');
    if (segments.length !== 3) throw new CloudflareAccessVerificationError();
    const [encodedHeader, encodedPayload, encodedSignature] = segments;
    if (!encodedHeader || !encodedPayload || !encodedSignature) throw new CloudflareAccessVerificationError();
    let header: JsonObject;
    let payload: JsonObject;
    try {
      header = decodeJson(encodedHeader);
      payload = decodeJson(encodedPayload);
    } catch {
      throw new CloudflareAccessVerificationError();
    }
    if (header.alg !== 'RS256' || !nonEmptyString(header.kid)) throw new CloudflareAccessVerificationError();
    const expectedConfiguredAudience = this.config.controlAudience;
    if (!expectedConfiguredAudience || payload.iss !== this.config.issuer || !audienceIncludes(payload.aud, expectedConfiguredAudience)) throw new CloudflareAccessVerificationError();
    if (!nonEmptyString(payload.sub) || !nonEmptyString(payload.email)) throw new CloudflareAccessVerificationError();
    const exp = parseNumberClaim(payload.exp);
    const nbf = payload.nbf === undefined ? null : parseNumberClaim(payload.nbf);
    const nowSeconds = this.now() / 1000;
    if (exp === null || exp <= nowSeconds || (payload.nbf !== undefined && (nbf === null || nbf > nowSeconds))) throw new CloudflareAccessVerificationError();
    const email = String(payload.email).trim().toLowerCase();
    const allowlist = this.config.controlEmails;
    if (!allowlist.includes(email)) throw new CloudflareAccessVerificationError();
    const key = await this.findKey(String(header.kid));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    let valid = false;
    try {
      const verifier = createVerify('RSA-SHA256');
      verifier.update(signingInput);
      verifier.end();
      valid = verifier.verify(createPublicKey({ key: key as any, format: 'jwk' }), decodeBase64Url(encodedSignature));
    } catch {
      valid = false;
    }
    if (!valid) throw new CloudflareAccessVerificationError();
    return { subject: String(payload.sub).trim(), audience: 'system-control', capabilities: CONTROL_CAPABILITIES, projectAccess: 'all' };
  }

  private async findKey(kid: string) {
    const cached = this.cachedKeys;
    const now = this.now();
    if (cached && cached.expiresAt > now && cached.keys.has(kid)) return cached.keys.get(kid)!;
    const fetched = await this.fetchKeys();
    const key = fetched.keys.get(kid);
    if (!key) throw new CloudflareAccessVerificationError();
    return key;
  }

  private async fetchKeys(): Promise<CachedKeys> {
    let response: Response;
    try {
      response = await this.fetcher(this.config.jwksUrl, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(3_000) });
    } catch {
      throw new CloudflareAccessVerificationError();
    }
    if (!response.ok) throw new CloudflareAccessVerificationError();
    let body: unknown;
    try { body = await response.json(); } catch { throw new CloudflareAccessVerificationError(); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray((body as JsonObject).keys)) throw new CloudflareAccessVerificationError();
    const entries = new Map<string, JsonObject>();
    for (const entry of (body as { keys: unknown[] }).keys) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const key = entry as JsonObject;
      if (key.kty === 'RSA' && nonEmptyString(key.kid) && nonEmptyString(key.n) && nonEmptyString(key.e)) entries.set(String(key.kid), key);
    }
    if (entries.size === 0) throw new CloudflareAccessVerificationError();
    const result = { keys: entries as ReadonlyMap<string, JsonObject>, expiresAt: this.now() + this.cacheTtlMs };
    this.cachedKeys = result;
    return result;
  }
}

export const createCloudflareAccessPrincipalResolver = (
  verifier: CloudflareAccessVerifier,
): CloudflareAccessPrincipalResolver => (request, expectedAudience) => verifier.verifyRequest(request, expectedAudience);

export const createCloudflareAccessReadinessProvider = (
  config: CloudflareAccessConfig | null,
): SystemControlAccessReadinessProvider => () => ({
  status: config ? 'ready' : 'not_configured',
  // 员工站不由 Cloudflare Access 保护；保留共享 schema 字段但不把它作为管理员就绪条件。
  employeeAudienceConfigured: false,
  controlAudienceConfigured: Boolean(config?.controlAudience),
  issuerConfigured: Boolean(config?.issuer),
  observedAt: new Date(),
});

export const createCloudflareAccessBindingFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
  options: Readonly<{ fetcher?: Fetcher; now?: () => number; cacheTtlMs?: number }> = {},
) => {
  const config = createCloudflareAccessConfigFromEnv(env);
  if (!config) return { config: null, verifier: null, resolver: null, readinessProvider: createCloudflareAccessReadinessProvider(null) } as const;
  const verifier = new CloudflareAccessVerifier(config, options);
  return { config, verifier, resolver: createCloudflareAccessPrincipalResolver(verifier), readinessProvider: createCloudflareAccessReadinessProvider(config) } as const;
};
