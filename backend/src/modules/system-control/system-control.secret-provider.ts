import { createHash } from 'node:crypto';
import type { SystemControlEngineCapability } from '@qimao-terms-cloud/contracts';

export type SystemControlSecretProviderStatus = 'ready' | 'not_configured' | 'unknown';

export type SystemControlSecretDiscoveryQuery = {
  environment: 'development';
  capability?: SystemControlEngineCapability;
  provider?: string;
  search?: string;
  limit: number;
  offset: number;
};

export type SystemControlSecretDiscoveryCandidate = {
  candidateId: string;
  displayName: string;
  environment: 'development';
  capability: SystemControlEngineCapability;
  provider: string;
  redactedLabel: string;
  status: 'available' | 'unknown';
  discoveredAt: Date;
};

/** Provider 只返回可公开的发现描述；任何 Secret 值或内部句柄只能留在 provider 进程内。 */
export type SystemControlSecretResolvedReference = {
  candidateId: string;
  environment: 'development';
  capability: SystemControlEngineCapability;
  provider: string;
  redactedLabel: string;
  referenceDigest: string;
};

export type SystemControlSecretValidationResult = {
  status: 'succeeded' | 'failed' | 'unknown';
  latencyMs: number | null;
  reasonCode: string | null;
  reasonMessage: string | null;
};

export interface SystemControlSecretProvider {
  status(): SystemControlSecretProviderStatus | Promise<SystemControlSecretProviderStatus>;
  discover(input: SystemControlSecretDiscoveryQuery): Promise<{
    items: SystemControlSecretDiscoveryCandidate[];
    total: number;
    observedAt: Date | null;
  }>;
  resolve(candidateId: string): Promise<SystemControlSecretResolvedReference | null>;
  /** 仅供后端 Worker 在进程内绑定运行时请求；不会进入 API、数据库或日志。 */
  resolveValue?(candidateId: string): Promise<string | null>;
  validate(input: SystemControlSecretResolvedReference): Promise<SystemControlSecretValidationResult>;
}

export type SystemControlAccessReadinessProvider = () => {
  status: 'ready' | 'not_configured' | 'unknown';
  employeeAudienceConfigured: boolean;
  controlAudienceConfigured: boolean;
  issuerConfigured: boolean;
  observedAt: Date | null;
} | Promise<{
  status: 'ready' | 'not_configured' | 'unknown';
  employeeAudienceConfigured: boolean;
  controlAudienceConfigured: boolean;
  issuerConfigured: boolean;
  observedAt: Date | null;
}>;

export const rejectUnconfiguredSecretProvider: SystemControlSecretProvider = {
  status: () => 'not_configured',
  discover: async () => ({ items: [], total: 0, observedAt: null }),
  resolve: async () => null,
  validate: async () => ({ status: 'unknown', latencyMs: null, reasonCode: 'SECRET_PROVIDER_NOT_CONFIGURED', reasonMessage: 'Secret provider 尚未配置。' }),
};

export const SYSTEM_CONTROL_SECRET_PROVIDER_ENV = 'QIMAO_TERM_PROVIDER_SECRETS_B64' as const;
const MAX_CANDIDATES = 8;
const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_VALUE_LENGTH = 16_384;
const CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type SystemControlSecretProviderConfigurationCode =
  | 'INVALID_BASE64'
  | 'INVALID_UTF8'
  | 'INVALID_JSON'
  | 'INVALID_SCHEMA';

/** 配置错误只携带稳定 code，绝不把 Base64、JSON 或 Secret 值带入异常。 */
export class SystemControlSecretProviderConfigurationError extends Error {
  constructor(readonly code: SystemControlSecretProviderConfigurationCode) {
    super(`SYSTEM_CONTROL_SECRET_PROVIDER_${code}`);
    this.name = 'SystemControlSecretProviderConfigurationError';
  }
}

type EnvSecretCandidate = Readonly<{
  candidateId: string;
  provider: 'deepseek' | 'custom';
  displayName: string;
  value: string;
  referenceDigest: string;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const hasOnlyCandidateKeys = (value: Record<string, unknown>) => {
  const keys = Object.keys(value).sort();
  return keys.length === 4 && keys.join('\u0000') === 'candidateId\u0000displayName\u0000provider\u0000value';
};

const hasControlCharacter = (value: string) => /[\u0000-\u001f\u007f]/.test(value);

const decodeProviderConfig = (encoded: string): unknown => {
  if (!encoded || encoded.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new SystemControlSecretProviderConfigurationError('INVALID_BASE64');
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.toString('base64') !== encoded) {
    throw new SystemControlSecretProviderConfigurationError('INVALID_BASE64');
  }
  let json: string;
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new SystemControlSecretProviderConfigurationError('INVALID_UTF8');
  }
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new SystemControlSecretProviderConfigurationError('INVALID_JSON');
  }
};

const parseProviderCandidates = (value: unknown): EnvSecretCandidate[] => {
  if (!Array.isArray(value) || value.length > MAX_CANDIDATES) {
    throw new SystemControlSecretProviderConfigurationError('INVALID_SCHEMA');
  }
  const identities = new Set<string>();
  return value.map((raw) => {
    if (!isRecord(raw) || !hasOnlyCandidateKeys(raw)
      || typeof raw.candidateId !== 'string' || typeof raw.provider !== 'string'
      || typeof raw.displayName !== 'string' || typeof raw.value !== 'string') {
      throw new SystemControlSecretProviderConfigurationError('INVALID_SCHEMA');
    }
    const candidateId = raw.candidateId;
    const provider = raw.provider;
    const displayName = raw.displayName.trim();
    const secretValue = raw.value;
    if (!CANONICAL_UUID.test(candidateId) || identities.has(candidateId)
      || !['deepseek', 'custom'].includes(provider)
      || !displayName || displayName.length > MAX_DISPLAY_NAME_LENGTH || hasControlCharacter(displayName)
      || !secretValue || secretValue.length > MAX_VALUE_LENGTH || hasControlCharacter(secretValue)) {
      throw new SystemControlSecretProviderConfigurationError('INVALID_SCHEMA');
    }
    identities.add(candidateId);
    return Object.freeze({
      candidateId,
      provider: provider as EnvSecretCandidate['provider'],
      displayName,
      value: secretValue,
      referenceDigest: createHash('sha256').update(secretValue).digest('hex'),
    });
  });
};

/**
 * 从 root-only provider.env 注入的单一 Base64 JSON 建立 Secret provider。
 * 原值只保存在不可枚举的私有字段中；discover/resolve/validate 只返回公开描述。
 */
export class EnvBackedSystemControlSecretProvider implements SystemControlSecretProvider {
  #candidates: ReadonlyMap<string, EnvSecretCandidate>;

  constructor(candidates: readonly EnvSecretCandidate[]) {
    this.#candidates = new Map(candidates.map((candidate) => [candidate.candidateId, candidate]));
  }

  status(): SystemControlSecretProviderStatus { return 'ready'; }

  async discover(input: SystemControlSecretDiscoveryQuery) {
    if (input.capability && input.capability !== 'terms') return { items: [], total: 0, observedAt: new Date() };
    const provider = input.provider?.trim();
    const search = input.search?.trim().toLocaleLowerCase();
    const filtered = [...this.#candidates.values()].filter((candidate) =>
      (!provider || candidate.provider === provider)
      && (!search || `${candidate.candidateId} ${candidate.displayName}`.toLocaleLowerCase().includes(search)));
    const limit = Number.isFinite(input.limit) ? Math.min(100, Math.max(1, Math.trunc(input.limit))) : 50;
    const offset = Number.isFinite(input.offset) ? Math.max(0, Math.trunc(input.offset)) : 0;
    const observedAt = new Date();
    return {
      items: filtered.slice(offset, offset + limit).map((candidate) => ({
        candidateId: candidate.candidateId,
        displayName: candidate.displayName,
        environment: 'development' as const,
        capability: 'terms' as const,
        provider: candidate.provider,
        redactedLabel: candidate.displayName,
        status: 'available' as const,
        discoveredAt: observedAt,
      })),
      total: filtered.length,
      observedAt,
    };
  }

  async resolve(candidateId: string): Promise<SystemControlSecretResolvedReference | null> {
    const candidate = this.#candidates.get(candidateId);
    if (!candidate) return null;
    return {
      candidateId: candidate.candidateId,
      environment: 'development',
      capability: 'terms',
      provider: candidate.provider,
      redactedLabel: candidate.displayName,
      referenceDigest: candidate.referenceDigest,
    };
  }

  async resolveValue(candidateId: string): Promise<string | null> {
    return this.#candidates.get(candidateId)?.value ?? null;
  }

  async validate(input: SystemControlSecretResolvedReference): Promise<SystemControlSecretValidationResult> {
    const candidate = this.#candidates.get(input.candidateId);
    if (!candidate) return { status: 'failed', latencyMs: 0, reasonCode: 'SECRET_CANDIDATE_NOT_FOUND', reasonMessage: 'Secret 候选当前不存在。' };
    if (input.environment !== 'development' || input.capability !== 'terms'
      || input.provider !== candidate.provider || input.redactedLabel !== candidate.displayName
      || input.referenceDigest !== candidate.referenceDigest) {
      return { status: 'failed', latencyMs: 0, reasonCode: 'SECRET_CANDIDATE_CHANGED', reasonMessage: 'Secret 候选描述已变化。' };
    }
    return { status: 'succeeded', latencyMs: 0, reasonCode: null, reasonMessage: null };
  }
}

export const createSystemControlSecretProviderFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): SystemControlSecretProvider => {
  const encoded = env[SYSTEM_CONTROL_SECRET_PROVIDER_ENV];
  if (encoded === undefined) return rejectUnconfiguredSecretProvider;
  return new EnvBackedSystemControlSecretProvider(parseProviderCandidates(decodeProviderConfig(encoded)));
};

export const defaultAccessReadiness: SystemControlAccessReadinessProvider = () => ({
  status: 'not_configured',
  employeeAudienceConfigured: false,
  controlAudienceConfigured: false,
  issuerConfigured: false,
  observedAt: null,
});
