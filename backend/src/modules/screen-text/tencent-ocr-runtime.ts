import { createRequire } from 'node:module';

import {
  TencentGeneralBasicOcrAdapter,
  TencentOcrTransportError,
  createTencentGeneralBasicOcrDescriptor,
  type TencentGeneralBasicOcrRequest,
  type TencentGeneralBasicOcrResponse,
  type TencentGeneralBasicOcrTextDetection,
  type TencentOcrTransport,
} from './tencent-ocr-adapter.js';
import { ScreenTextAdapterRegistry, createDefaultScreenTextAdapterRegistry } from './screen-text.adapter-registry.js';

export const TENCENT_OCR_ENV = Object.freeze({
  enabled: 'QIMAO_TENCENT_OCR_ENABLED',
  region: 'QIMAO_TENCENT_OCR_REGION',
  secretId: 'QIMAO_TENCENT_OCR_SECRET_ID',
  secretKey: 'QIMAO_TENCENT_OCR_SECRET_KEY',
  timeoutMs: 'QIMAO_TENCENT_OCR_TIMEOUT_MS',
  maximumAmountCny: 'QIMAO_TENCENT_OCR_MAX_AMOUNT_CNY',
});

export interface TencentOcrSecretReference {
  readonly secretId: string;
  readonly secretKey: string;
}

export interface TencentOcrRuntimeConfig {
  readonly enabled: boolean;
  readonly production: boolean;
  readonly region: string | null;
  readonly secretReference: TencentOcrSecretReference | null;
  readonly timeoutMs: number;
  readonly maximumAmountCny: string | null;
}

export type TencentOcrConfigurationErrorCode =
  | 'CONFIG_INVALID'
  | 'CONFIG_INCOMPLETE'
  | 'DISABLED_IN_PRODUCTION'
  | 'SDK_UNAVAILABLE';

/** 配置错误只携带稳定 code，不回显任何环境值。 */
export class TencentOcrConfigurationError extends Error {
  constructor(readonly code: TencentOcrConfigurationErrorCode) {
    super(`TENCENT_OCR_${code}`);
    this.name = 'TencentOcrConfigurationError';
  }
}

const trimmed = (env: NodeJS.ProcessEnv, key: string) => env[key]?.trim() || null;

export const createTencentOcrRuntimeConfigFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): TencentOcrRuntimeConfig => {
  const production = env.NODE_ENV === 'production';
  const enabledValue = trimmed(env, TENCENT_OCR_ENV.enabled);
  if (enabledValue && enabledValue !== 'true' && enabledValue !== 'false') {
    throw new TencentOcrConfigurationError('CONFIG_INVALID');
  }
  const enabled = enabledValue === 'true';
  const region = trimmed(env, TENCENT_OCR_ENV.region);
  const secretId = trimmed(env, TENCENT_OCR_ENV.secretId);
  const secretKey = trimmed(env, TENCENT_OCR_ENV.secretKey);
  const maximumAmountCny = trimmed(env, TENCENT_OCR_ENV.maximumAmountCny);
  const configured = [region, secretId, secretKey].filter((value) => value !== null).length;
  if (configured !== 0 && configured !== 3) throw new TencentOcrConfigurationError('CONFIG_INCOMPLETE');
  if (enabled && (!region || !secretId || !secretKey)) throw new TencentOcrConfigurationError('CONFIG_INCOMPLETE');
  if (maximumAmountCny && (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,12})?$/.test(maximumAmountCny) || !Number.isFinite(Number(maximumAmountCny)))) throw new TencentOcrConfigurationError('CONFIG_INVALID');
  if (enabled && (!maximumAmountCny || Number(maximumAmountCny) <= 0)) throw new TencentOcrConfigurationError(maximumAmountCny ? 'CONFIG_INVALID' : 'CONFIG_INCOMPLETE');
  if (region && !/^[a-z0-9-]{1,64}$/.test(region)) throw new TencentOcrConfigurationError('CONFIG_INVALID');
  const timeoutMs = Number(trimmed(env, TENCENT_OCR_ENV.timeoutMs) ?? '30000');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) {
    throw new TencentOcrConfigurationError('CONFIG_INVALID');
  }
  return {
    enabled,
    production,
    region: region ?? null,
    secretReference: region && secretId && secretKey ? Object.freeze({ secretId, secretKey }) : null,
    timeoutMs,
    maximumAmountCny: maximumAmountCny ?? null,
  };
};

export interface TencentOfficialOcrSdkClient {
  GeneralBasicOCR(
    request: TencentGeneralBasicOcrRequest,
    callback?: (error: unknown, response?: unknown) => void,
  ): unknown;
}

type TencentGeneralBasicOcrResponseBody = NonNullable<TencentGeneralBasicOcrResponse['Response']>;

type TencentSdkModule = {
  ocr?: {
    v20181119?: {
      Client?: new (options: {
        credential: { secretId: string; secretKey: string };
        region: string;
        profile: { httpProfile: { endpoint: string } };
      }) => TencentOfficialOcrSdkClient;
    };
  };
  default?: TencentSdkModule;
};

const providerFailureCode = (error: unknown): 'unauthorized' | 'rejected' | 'timeout' | 'unknown' => {
  if (typeof error === 'string') {
    const value = error.toLowerCase();
    if (/auth|secret|signature|accessdenied/.test(value)) return 'unauthorized';
    if (/timeout|requesttimeout|etimedout|abort|network|internalerror/.test(value)) return 'timeout';
    if (/reject|invalid|parameter|badrequest/.test(value)) return 'rejected';
    return 'unknown';
  }
  if (!error || typeof error !== 'object') return 'unknown';
  const record = error as { name?: unknown; code?: unknown; Code?: unknown; statusCode?: unknown; $metadata?: { httpStatusCode?: unknown } };
  const value = String(record.name ?? record.code ?? record.Code ?? '').toLowerCase();
  const status = record.$metadata?.httpStatusCode ?? record.statusCode;
  if (status === 401 || status === 403 || /auth|secret|signature|accessdenied/.test(value)) return 'unauthorized';
  if (/timeout|requesttimeout|etimedout|abort|network|internalerror/.test(value)) return 'timeout';
  if (typeof status === 'number' && status >= 400 && status < 500) return 'rejected';
  return 'unknown';
};

const normalizeResponse = (value: unknown): TencentGeneralBasicOcrResponse => {
  if (!value || typeof value !== 'object') return { Response: {} };
  const record = value as Record<string, unknown>;
  if (record.Response && typeof record.Response === 'object') {
    return { Response: record.Response as TencentGeneralBasicOcrResponseBody };
  }
  const body: TencentGeneralBasicOcrResponseBody = {};
  if (Array.isArray(record.TextDetections)) body.TextDetections = record.TextDetections as TencentGeneralBasicOcrTextDetection[];
  if (typeof record.RequestId === 'string') body.RequestId = record.RequestId;
  if (record.Error && typeof record.Error === 'object') body.Error = record.Error as NonNullable<TencentGeneralBasicOcrResponseBody['Error']>;
  return { Response: body };
};

/** 将官方扁平 Promise/回调响应归一化，并把 SDK 错误映射为稳定分类。 */
export class TencentOfficialOcrTransport implements TencentOcrTransport {
  constructor(private readonly client: TencentOfficialOcrSdkClient, private readonly timeoutMs = 30_000) {}

  private invoke(request: TencentGeneralBasicOcrRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;
      const finish = (error: unknown, response?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error instanceof TencentOcrTransportError) reject(error);
        else if (error) reject(new TencentOcrTransportError(providerFailureCode(error)));
        else resolve(response);
      };
      timer = setTimeout(() => finish(new TencentOcrTransportError('timeout')), this.timeoutMs);
      try {
        const result = this.client.GeneralBasicOCR(request, finish);
        if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
          void Promise.resolve(result).then((response) => finish(null, response), finish);
        } else if (result && typeof result === 'object' && ('Response' in result || 'TextDetections' in result || 'Error' in result)) {
          finish(null, result);
        }
      } catch (error) {
        finish(error);
      }
    });
  }

  async GeneralBasicOCR(request: TencentGeneralBasicOcrRequest): Promise<TencentGeneralBasicOcrResponse> {
    const response = normalizeResponse(await this.invoke(request));
    const error = response.Response?.Error;
    if (error) throw new TencentOcrTransportError(providerFailureCode(error.Code), response.Response?.RequestId ?? null);
    return response;
  }
}

export interface TencentOcrSdkFactory {
  create(input: { region: string; secretReference: TencentOcrSecretReference; timeoutMs?: number }): TencentOcrTransport;
}

/** 延迟解析官方 OCR Node SDK，永不进入浏览器 bundle。 */
export const createTencentOcrSdkFactory = (
  moduleName = 'tencentcloud-sdk-nodejs-ocr',
): TencentOcrSdkFactory => {
  const require = createRequire(import.meta.url);
  return {
    create(input) {
      let loaded: TencentSdkModule;
      try {
        loaded = require(moduleName) as TencentSdkModule;
      } catch {
        throw new TencentOcrConfigurationError('SDK_UNAVAILABLE');
      }
      const root = loaded.default ?? loaded;
      const Client = root.ocr?.v20181119?.Client;
      if (!Client) throw new TencentOcrConfigurationError('SDK_UNAVAILABLE');
      try {
        return new TencentOfficialOcrTransport(new Client({
          credential: input.secretReference,
          region: input.region,
          profile: { httpProfile: { endpoint: 'ocr.tencentcloudapi.com' } },
        }), input.timeoutMs ?? 30_000);
      } catch {
        throw new TencentOcrConfigurationError('SDK_UNAVAILABLE');
      }
    },
  };
};

export interface TencentOcrRegistryFactoryOptions {
  env?: NodeJS.ProcessEnv;
  sdkFactory: TencentOcrSdkFactory;
}

export const createTencentOcrRegistryIfEnabled = (
  options: TencentOcrRegistryFactoryOptions,
): ScreenTextAdapterRegistry | null => {
  const config = createTencentOcrRuntimeConfigFromEnv(options.env);
  if (!config.enabled) return null;
  return createTencentOcrRegistryFromEnv(options);
};

/** 生产启用时 Registry 只含腾讯 OCR；未启用的生产 Worker 直接 fail-closed。 */
export const createTencentOcrRegistryFromEnv = (
  options: TencentOcrRegistryFactoryOptions,
): ScreenTextAdapterRegistry => {
  const config = createTencentOcrRuntimeConfigFromEnv(options.env);
  if (!config.enabled) {
    if (config.production) throw new TencentOcrConfigurationError('DISABLED_IN_PRODUCTION');
    return createDefaultScreenTextAdapterRegistry();
  }
  if (!config.region || !config.secretReference) throw new TencentOcrConfigurationError('CONFIG_INCOMPLETE');
  let transport: TencentOcrTransport;
  try {
    transport = options.sdkFactory.create({ region: config.region, secretReference: config.secretReference, timeoutMs: config.timeoutMs });
  } catch (error) {
    if (error instanceof TencentOcrConfigurationError) throw error;
    throw new TencentOcrConfigurationError('SDK_UNAVAILABLE');
  }
  const descriptor = createTencentGeneralBasicOcrDescriptor({
    billingClass: 'metered', currency: 'CNY', maximumAmount: config.maximumAmountCny!,
    billingUnit: 'image', maximumQuantity: '600',
  });
  const configuredAdapter = new TencentGeneralBasicOcrAdapter({ transport, descriptor });
  // 显式开启时只登记真实 Tencent OCR，避免把 fake 当作静默 fallback；
  // 未开启的非生产环境才沿用 createDefaultScreenTextAdapterRegistry。
  return new ScreenTextAdapterRegistry([configuredAdapter], configuredAdapter.descriptor.adapter);
};
