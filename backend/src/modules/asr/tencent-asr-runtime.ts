import { createRequire } from 'node:module';
import type { AsrAdapterDescriptor, AsrBillingCapability } from './asr-adapter.js';
import { DeterministicFakeAsrAdapter } from './asr-adapter.js';
import { AsrAdapterRegistry, createDefaultAsrAdapterRegistry } from './asr-adapter-registry.js';
import {
  TencentAsrAdapter,
  TencentAsrTransportError,
  type TencentAsrTransport,
  type TencentCreateRecTaskRequest,
  type TencentCreateRecTaskResponse,
  type TencentDescribeTaskStatusRequest,
  type TencentDescribeTaskStatusResponse,
  type TencentPrivateObjectUrlSigner,
  createTencentAsrHourlyBilling,
  createTencentAsrDescriptor,
} from './tencent-asr-adapter.js';
export const TENCENT_ASR_ENV = Object.freeze({
  enabled: 'QIMAO_TENCENT_ASR_ENABLED',
  region: 'QIMAO_TENCENT_ASR_REGION',
  secretId: 'QIMAO_TENCENT_ASR_SECRET_ID',
  secretKey: 'QIMAO_TENCENT_ASR_SECRET_KEY',
  objectUrlTtlSeconds: 'QIMAO_TENCENT_ASR_OBJECT_URL_TTL_SECONDS',
  priceCnyPerHour: 'QIMAO_TENCENT_ASR_PRICE_CNY_PER_HOUR',
});

export interface TencentAsrSecretReference {
  readonly secretId: string;
  readonly secretKey: string;
}

export interface TencentAsrRuntimeConfig {
  readonly enabled: boolean;
  readonly production: boolean;
  readonly region: string | null;
  readonly secretReference: TencentAsrSecretReference | null;
  readonly objectUrlTtlSeconds: number;
  /** 普通录音每小时 CNY 单价；未显式启用时为空。 */
  readonly priceCnyPerHour: number | null;
}

export type TencentAsrConfigurationErrorCode =
  | 'CONFIG_INVALID'
  | 'CONFIG_INCOMPLETE'
  | 'DISABLED_IN_PRODUCTION'
  | 'SDK_UNAVAILABLE';

/** 错误只携带稳定 code，永不把 Secret 或环境原值带入启动日志。 */
export class TencentAsrConfigurationError extends Error {
  constructor(readonly code: TencentAsrConfigurationErrorCode) {
    super(`TENCENT_ASR_${code}`);
    this.name = 'TencentAsrConfigurationError';
  }
}

const trimmed = (env: NodeJS.ProcessEnv, key: string) => env[key]?.trim() || null;

export const createTencentAsrRuntimeConfigFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): TencentAsrRuntimeConfig => {
  const production = env.NODE_ENV === 'production';
  const enabledValue = trimmed(env, TENCENT_ASR_ENV.enabled);
  if (enabledValue && enabledValue !== 'true' && enabledValue !== 'false') {
    throw new TencentAsrConfigurationError('CONFIG_INVALID');
  }
  const enabled = enabledValue === 'true';
  const region = trimmed(env, TENCENT_ASR_ENV.region);
  const secretId = trimmed(env, TENCENT_ASR_ENV.secretId);
  const secretKey = trimmed(env, TENCENT_ASR_ENV.secretKey);
  const configuredSecretFields = [region, secretId, secretKey].filter((value) => value !== null).length;
  if (configuredSecretFields !== 0 && configuredSecretFields !== 3) {
    throw new TencentAsrConfigurationError('CONFIG_INCOMPLETE');
  }
  if (enabled && (!region || !secretId || !secretKey)) {
    throw new TencentAsrConfigurationError('CONFIG_INCOMPLETE');
  }
  if (region && !/^[a-z0-9-]{1,64}$/.test(region)) {
    throw new TencentAsrConfigurationError('CONFIG_INVALID');
  }
  const rawTtl = trimmed(env, TENCENT_ASR_ENV.objectUrlTtlSeconds) ?? '600';
  const objectUrlTtlSeconds = Number(rawTtl);
  if (!Number.isInteger(objectUrlTtlSeconds) || objectUrlTtlSeconds < 60 || objectUrlTtlSeconds > 600) {
    throw new TencentAsrConfigurationError('CONFIG_INVALID');
  }
  const rawPrice = trimmed(env, TENCENT_ASR_ENV.priceCnyPerHour);
  let priceCnyPerHour: number | null = null;
  if (enabled) {
    if (!rawPrice || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(rawPrice)) {
      throw new TencentAsrConfigurationError('CONFIG_INCOMPLETE');
    }
    const parsedPrice = Number(rawPrice);
    const normalizedPrice = Number.isFinite(parsedPrice) ? Number(parsedPrice.toFixed(6)) : Number.NaN;
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0 || !Number.isFinite(normalizedPrice * 5)) {
      throw new TencentAsrConfigurationError('CONFIG_INVALID');
    }
    priceCnyPerHour = normalizedPrice;
  }
  return {
    enabled,
    production,
    region: region ?? null,
    secretReference: region && secretId && secretKey ? Object.freeze({ secretId, secretKey }) : null,
    objectUrlTtlSeconds,
    priceCnyPerHour,
  };
};

/**
 * 腾讯官方 SDK 客户端的最小调用面。真实 SDK 可用回调或 Promise，
 * 由下面的 transport 统一成 Promise，业务适配器不接触 SDK 原始错误载荷。
 */
export interface TencentOfficialSdkClient {
  CreateRecTask(
    request: TencentCreateRecTaskRequest,
    callback?: (error: unknown, response?: unknown) => void,
  ): unknown;
  DescribeTaskStatus(
    request: TencentDescribeTaskStatusRequest,
    callback?: (error: unknown, response?: unknown) => void,
  ): unknown;
}

type TencentSdkModule = {
  asr?: {
    v20190614?: {
      Client?: new (options: {
        credential: { secretId: string; secretKey: string };
        region: string;
        profile: { httpProfile: { endpoint: string } };
      }) => TencentOfficialSdkClient;
    };
  };
  default?: TencentSdkModule;
};

/**
 * 延迟加载官方按产品拆分的 Node SDK。模块只在显式启用且 Worker 启动时解析，
 * 因而不会进入浏览器 bundle；缺包/导出不匹配均以稳定 code fail-closed。
 */
export const createTencentAsrSdkFactory = (
  moduleName = 'tencentcloud-sdk-nodejs-asr',
): TencentAsrSdkFactory => {
  const require = createRequire(import.meta.url);
  return {
    create(input) {
      let loaded: TencentSdkModule;
      try {
        loaded = require(moduleName) as TencentSdkModule;
      } catch {
        throw new TencentAsrConfigurationError('SDK_UNAVAILABLE');
      }
      const root = loaded.default ?? loaded;
      const Client = root.asr?.v20190614?.Client;
      if (!Client) throw new TencentAsrConfigurationError('SDK_UNAVAILABLE');
      try {
        return new TencentOfficialAsrTransport(new Client({
          credential: input.secretReference,
          region: input.region,
          profile: { httpProfile: { endpoint: 'asr.tencentcloudapi.com' } },
        }));
      } catch {
        throw new TencentAsrConfigurationError('SDK_UNAVAILABLE');
      }
    },
  };
};

const asCreateResponse = (value: unknown) => value as TencentCreateRecTaskResponse;
const asDescribeResponse = (value: unknown) => value as TencentDescribeTaskStatusResponse;

const providerFailureCode = (error: unknown): 'unauthorized' | 'rejected' | 'timeout' | 'unknown' => {
  if (typeof error === 'string') {
    const name = error.toLowerCase();
    if (/auth|secret|signature|accessdenied/.test(name)) return 'unauthorized';
    if (/timeout|requesttimeout|etimedout|abort/.test(name)) return 'timeout';
    if (/reject|invalid|parameter|badrequest/.test(name)) return 'rejected';
    return 'unknown';
  }
  if (!error || typeof error !== 'object') return 'unknown';
  const record = error as { name?: unknown; code?: unknown; Code?: unknown; statusCode?: unknown; $metadata?: { httpStatusCode?: unknown } };
  const name = String(record.name ?? record.code ?? record.Code ?? '').toLowerCase();
  const status = record.$metadata?.httpStatusCode ?? record.statusCode;
  if (status === 401 || status === 403 || /auth|secret|signature|accessdenied/.test(name)) return 'unauthorized';
  if (/timeout|requesttimeout|etimedout|abort/.test(name)) return 'timeout';
  if (typeof status === 'number' && status >= 400 && status < 500) return 'rejected';
  return 'unknown';
};

const normalizeResponse = (value: unknown): { Response: Record<string, unknown> } => {
  if (!value || typeof value !== 'object') return { Response: {} };
  const record = value as Record<string, unknown>;
  if (record.Response && typeof record.Response === 'object') return { Response: record.Response as Record<string, unknown> };
  return {
    Response: {
      ...(record.Data !== undefined ? { Data: record.Data } : {}),
      ...(record.Error !== undefined ? { Error: record.Error } : {}),
      ...(typeof record.RequestId === 'string' ? { RequestId: record.RequestId } : {}),
    },
  };
};

/** 官方 DescribeTaskStatusRequest.TaskId 为 number；领域/数据库可保存 string，
 * 仅把无损的 safe-integer 十进制字符串转回 number，其他值不触达供应商。 */
const sdkTaskIdFrom = (value: string | number): number | null => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export class TencentOfficialAsrTransport implements TencentAsrTransport {
  constructor(private readonly client: TencentOfficialSdkClient) {}

  private invoke(
    method: 'CreateRecTask' | 'DescribeTaskStatus',
    request: TencentCreateRecTaskRequest | TencentDescribeTaskStatusRequest,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error: unknown, response?: unknown) => {
        if (settled) return;
        settled = true;
        if (error) reject(new TencentAsrTransportError(providerFailureCode(error)));
        else resolve(response);
      };
      try {
        const result = method === 'CreateRecTask'
          ? this.client.CreateRecTask(request as TencentCreateRecTaskRequest, finish)
          : this.client.DescribeTaskStatus(request as TencentDescribeTaskStatusRequest, finish);
        if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
          void Promise.resolve(result).then((response) => finish(null, response), finish);
        } else if (result && typeof result === 'object' && ('Response' in result || 'Data' in result)) {
          finish(null, result);
        }
      } catch (error) {
        finish(error);
      }
    });
  }

  async CreateRecTask(request: TencentCreateRecTaskRequest): Promise<TencentCreateRecTaskResponse> {
    return asCreateResponse(normalizeResponse(await this.invoke('CreateRecTask', request)));
  }

  async DescribeTaskStatus(request: TencentDescribeTaskStatusRequest): Promise<TencentDescribeTaskStatusResponse> {
    const taskId = sdkTaskIdFrom(request.TaskId);
    if (taskId === null) throw new TencentAsrTransportError('unknown');
    return asDescribeResponse(normalizeResponse(await this.invoke('DescribeTaskStatus', { TaskId: taskId })));
  }
}

export interface TencentAsrSdkFactory {
  create(input: {
    region: string;
    secretReference: TencentAsrSecretReference;
  }): TencentAsrTransport;
}

export interface TencentAsrRegistryFactoryOptions {
  env?: NodeJS.ProcessEnv;
  sdkFactory: TencentAsrSdkFactory;
  objectUrlSigner: TencentPrivateObjectUrlSigner;
  billing?: AsrBillingCapability;
  descriptor?: Readonly<AsrAdapterDescriptor>;
  resolveHotwordId?: (input: Parameters<NonNullable<ConstructorParameters<typeof TencentAsrAdapter>[0]['resolveHotwordId']>>[0]) => string | null | Promise<string | null>;
}

/**
 * 控制面可选装配：未显式开启时返回 null，由现有应用保持原有可启动行为；
 * 一旦出现半配置仍由统一 env 解析器 fail-closed。
 */
export const createTencentAsrRegistryIfEnabled = (
  options: TencentAsrRegistryFactoryOptions,
): AsrAdapterRegistry | null => {
  const config = createTencentAsrRuntimeConfigFromEnv(options.env);
  if (!config.enabled) return null;
  return createTencentAsrRegistryFromEnv(options);
};

/**
 * 显式装配候选：开发/测试未开启时保留 fake；生产未开启或配置不完整直接 fail-closed，
 * 不把 fake 当作真实 Provider fallback。开启生产时 Registry 只含腾讯适配器。
 */
export const createTencentAsrRegistryFromEnv = (
  options: TencentAsrRegistryFactoryOptions,
): AsrAdapterRegistry => {
  const config = createTencentAsrRuntimeConfigFromEnv(options.env);
  if (!config.enabled) {
    if (config.production) throw new TencentAsrConfigurationError('DISABLED_IN_PRODUCTION');
    return createDefaultAsrAdapterRegistry();
  }
  if (!config.region || !config.secretReference) throw new TencentAsrConfigurationError('CONFIG_INCOMPLETE');
  if (config.priceCnyPerHour === null) throw new TencentAsrConfigurationError('CONFIG_INCOMPLETE');
  let transport: TencentAsrTransport;
  try {
    transport = options.sdkFactory.create({ region: config.region, secretReference: config.secretReference });
  } catch {
    throw new TencentAsrConfigurationError('SDK_UNAVAILABLE');
  }
  const hourlyBilling = createTencentAsrHourlyBilling(config.priceCnyPerHour);
  const billing = options.billing ?? hourlyBilling.capability;
  const adapter = new TencentAsrAdapter({
    transport,
    signer: options.objectUrlSigner,
    descriptor: options.descriptor ?? createTencentAsrDescriptor(billing),
    objectUrlTtlSeconds: config.objectUrlTtlSeconds,
    billing: hourlyBilling.calculate,
    ...(options.resolveHotwordId ? { resolveHotwordId: options.resolveHotwordId } : {}),
  });
  if (config.production) return new AsrAdapterRegistry([adapter], adapter.descriptor.adapter);
  return new AsrAdapterRegistry([new DeterministicFakeAsrAdapter(), adapter], 'deterministic_fake');
};
