import type { ScreenTextAdapterDescriptor } from './screen-text.adapter.js';
import type { ScreenTextAdapterRegistry } from './screen-text.adapter-registry.js';
import type { ScreenTextLocalOcrSidecarResponse } from '@qimao-terms-cloud/contracts';
import { createScreenTextAdapterDescriptor } from './screen-text.adapter.js';
import { ScreenTextAdapterRegistry as Registry } from './screen-text.adapter-registry.js';
import {
  ScreenTextLocalOcrSidecarAdapter,
  ScreenTextLocalOcrTransportError,
  defaultScreenTextLocalOcrLimits,
  type ScreenTextLocalOcrWireRequest,
  type ScreenTextLocalOcrSidecarTransport,
} from './screen-text.local-ocr-sidecar.js';

export type LocalOcrProvider = 'openvino' | 'onnxruntime';

/**
 * 三层本地 OCR 等待预算之间的固定缓冲：sidecar engine=T，HTTP=T+grace，adapter=T+2*grace。
 * T 本身仍受环境配置的 120 秒上限约束，派生等待也保持有界。
 */
export const LOCAL_OCR_TIMEOUT_GRACE_MS = 1_000;

export const localOcrTimeoutsFor = (engineTimeoutMs: number) => Object.freeze({
  engineTimeoutMs,
  httpTimeoutMs: engineTimeoutMs + LOCAL_OCR_TIMEOUT_GRACE_MS,
  adapterTimeoutMs: engineTimeoutMs + 2 * LOCAL_OCR_TIMEOUT_GRACE_MS,
});

export const LOCAL_OCR_ENV = Object.freeze({
  modelDigest: 'QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST',
  openvinoEnabled: 'QIMAO_LOCAL_OCR_OPENVINO_ENABLED',
  openvinoEndpoint: 'QIMAO_LOCAL_OCR_OPENVINO_ENDPOINT',
  openvinoTimeoutMs: 'QIMAO_LOCAL_OCR_OPENVINO_TIMEOUT_MS',
  onnxEnabled: 'QIMAO_LOCAL_OCR_ONNX_ENABLED',
  onnxEndpoint: 'QIMAO_LOCAL_OCR_ONNX_ENDPOINT',
  onnxTimeoutMs: 'QIMAO_LOCAL_OCR_ONNX_TIMEOUT_MS',
});

export interface LocalOcrRuntimeConfig {
  provider: LocalOcrProvider;
  endpoint: string;
  timeoutMs: number;
  modelDigest: string;
}

export type LocalOcrConfigurationCode = 'CONFIG_INCOMPLETE' | 'CONFIG_INVALID' | 'DISABLED_IN_PRODUCTION';

export class LocalOcrConfigurationError extends Error {
  constructor(readonly code: LocalOcrConfigurationCode) {
    super(`LOCAL_OCR_${code}`);
    this.name = 'LocalOcrConfigurationError';
  }
}

const sharedCapabilities = Object.freeze({
  supportsRegions: true,
  supportsConfidence: true,
  supportsLanguageHints: true,
  maxFramesPerEpisode: 600,
});
const sharedBilling = Object.freeze({
  billingClass: 'unmetered_local' as const,
  currency: 'CNY',
  maximumAmount: '0.000000',
  billingUnit: 'local_frame',
  maximumQuantity: '0',
});

const descriptorFor = (provider: LocalOcrProvider, modelDigest: string): Readonly<ScreenTextAdapterDescriptor> => createScreenTextAdapterDescriptor({
  kind: 'self_hosted_worker',
  adapter: provider === 'openvino' ? 'screen_text_openvino_ppocrv6_small' : 'screen_text_onnxruntime_ppocrv6_small',
  provider,
  model: `PP-OCRv6-Small@sha256:${modelDigest}`,
  language: 'zh-CN',
  deployment: 'loopback_http',
  inputVersion: 'screen-text-local-ocr-input-v1',
  outputVersion: 'screen-text-local-ocr-output-v1',
  configVersion: `screen-text-${provider}-ppocrv6-small-v1`,
  capabilities: sharedCapabilities,
  billing: sharedBilling,
});

export const localOpenVinoPpOcrDescriptor = descriptorFor('openvino', '0'.repeat(64));

export const localOnnxPpOcrDescriptor = descriptorFor('onnxruntime', '0'.repeat(64));

const endpointFor = (value: string): URL => {
  try {
    const endpoint = new URL(value);
    const host = endpoint.hostname.toLowerCase();
    if ((endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:')
      || endpoint.username || endpoint.password || endpoint.search || endpoint.hash
      || !['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error();
    return endpoint;
  } catch {
    throw new LocalOcrConfigurationError('CONFIG_INVALID');
  }
};

const bool = (value: string | undefined) => value?.trim().toLowerCase() === 'true';

const configFor = (env: NodeJS.ProcessEnv, provider: LocalOcrProvider): LocalOcrRuntimeConfig | null => {
  const enabledKey = provider === 'openvino' ? LOCAL_OCR_ENV.openvinoEnabled : LOCAL_OCR_ENV.onnxEnabled;
  const endpointKey = provider === 'openvino' ? LOCAL_OCR_ENV.openvinoEndpoint : LOCAL_OCR_ENV.onnxEndpoint;
  const timeoutKey = provider === 'openvino' ? LOCAL_OCR_ENV.openvinoTimeoutMs : LOCAL_OCR_ENV.onnxTimeoutMs;
  const enabledValue = env[enabledKey];
  const endpointValue = env[endpointKey]?.trim();
  const timeoutValue = env[timeoutKey]?.trim();
  const hasAny = enabledValue !== undefined || endpointValue !== undefined || timeoutValue !== undefined;
  const enabled = bool(enabledValue);
  const modelDigest = env[LOCAL_OCR_ENV.modelDigest]?.trim().toLowerCase();
  if (!enabled) {
    if (hasAny && (endpointValue || timeoutValue || (enabledValue !== undefined && enabledValue.trim() !== '' && enabledValue.trim().toLowerCase() !== 'false'))) {
      throw new LocalOcrConfigurationError('CONFIG_INCOMPLETE');
    }
    return null;
  }
  if (!endpointValue || !modelDigest) throw new LocalOcrConfigurationError('CONFIG_INCOMPLETE');
  if (!/^[a-f0-9]{64}$/.test(modelDigest)) throw new LocalOcrConfigurationError('CONFIG_INVALID');
  endpointFor(endpointValue);
  const timeoutMs = Number(timeoutValue ?? '60000');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) {
    throw new LocalOcrConfigurationError('CONFIG_INVALID');
  }
  return { provider, endpoint: endpointValue, timeoutMs, modelDigest };
};

export const createLocalOcrRuntimeConfigFromEnv = (env: NodeJS.ProcessEnv = process.env) => ({
  openvino: configFor(env, 'openvino'),
  onnxruntime: configFor(env, 'onnxruntime'),
});

export interface LocalOcrLoopbackTransportOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const encodeFrame = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const LOCAL_OCR_MAX_REQUEST_BYTES = 48_000_000;

const isStrictEngineTimeoutBody = (body: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).sort().join(',') !== 'error') return false;
    const error = (parsed as { error?: unknown }).error;
    return !!error && typeof error === 'object' && !Array.isArray(error)
      && Object.keys(error).sort().join(',') === 'code,message'
      && (error as { code?: unknown }).code === 'LOCAL_OCR_ENGINE_TIMEOUT'
      && typeof (error as { message?: unknown }).message === 'string';
  } catch {
    return false;
  }
};

/** 仅访问已校验 loopback endpoint；一次 invoke 只发送一次，不对 unknown 自动重发。 */
export class LocalOcrLoopbackTransport implements ScreenTextLocalOcrSidecarTransport {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: LocalOcrRuntimeConfig, options: LocalOcrLoopbackTransportOptions = {}) {
    this.endpoint = endpointFor(config.endpoint).toString();
    this.timeoutMs = options.timeoutMs ?? localOcrTimeoutsFor(config.timeoutMs).httpTimeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async invoke(request: ScreenTextLocalOcrWireRequest, options: Parameters<ScreenTextLocalOcrSidecarTransport['invoke']>[1]): Promise<ScreenTextLocalOcrSidecarResponse> {
    if (options.signal.aborted) {
      throw new ScreenTextLocalOcrTransportError('cancelled', 'LOCAL_OCR_CANCELLED', '本地 OCR 请求已取消。', false, false, request.requestId);
    }
    const controller = new AbortController();
    let timedOut = false;
    const relayAbort = () => controller.abort();
    options.signal.addEventListener('abort', relayAbort, { once: true });
    const remaining = Math.max(1, Math.min(this.timeoutMs, options.deadlineAt - Date.now()));
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, remaining);
    try {
      const requestBody = JSON.stringify({
        protocolVersion: request.protocolVersion,
        attemptId: request.attemptId,
        requestId: request.requestId,
        media: request.media,
        frames: (request.frames as Array<{ frameIndex: number; capturedAtMs: number; width: number; height: number; contentType: string; bytes: Uint8Array }>).map((frame) => ({
          frameIndex: frame.frameIndex,
          capturedAtMs: frame.capturedAtMs,
          width: frame.width,
          height: frame.height,
          contentType: frame.contentType,
          bytesBase64: encodeFrame(frame.bytes),
        })),
        language: request.language,
        modelVersion: request.modelVersion,
      });
      if (Buffer.byteLength(requestBody, 'utf8') > LOCAL_OCR_MAX_REQUEST_BYTES) {
        throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'LOCAL_OCR_REQUEST_TOO_LARGE', '本地 OCR 请求体超过受控上限。', false, false, request.requestId);
      }
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) throw new ScreenTextLocalOcrTransportError('unauthorized', 'LOCAL_OCR_UNAUTHORIZED', '本地 OCR endpoint 拒绝鉴权。', false, false, request.requestId);
      if (response.status === 429) throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'LOCAL_OCR_RATE_LIMITED', '本地 OCR endpoint 暂时拒绝请求。', true, false, request.requestId);
      if (response.status >= 400 && response.status < 500) throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'LOCAL_OCR_REJECTED', '本地 OCR endpoint 拒绝请求。', false, false, request.requestId);
      const body = await response.text();
      if (body.length > 4_000_000) throw new ScreenTextLocalOcrTransportError('external_unknown', 'LOCAL_OCR_RESPONSE_TOO_LARGE', '本地 OCR 返回超过受控上限，必须对账。', false, true, request.requestId);
      if (response.status === 504 && isStrictEngineTimeoutBody(body)) {
        throw new ScreenTextLocalOcrTransportError('external_not_accepted', 'LOCAL_OCR_ENGINE_TIMEOUT', '本地 OCR engine 已确定超时，未产生外部副作用。', true, false, request.requestId);
      }
      if (!response.ok || response.status >= 500) throw new ScreenTextLocalOcrTransportError('external_unknown', 'LOCAL_OCR_UNKNOWN', '本地 OCR endpoint 返回未知结果，必须对账。', false, true, request.requestId);
      try { return JSON.parse(body) as ScreenTextLocalOcrSidecarResponse; } catch { throw new ScreenTextLocalOcrTransportError('external_unknown', 'LOCAL_OCR_RESPONSE_INVALID', '本地 OCR 返回内容无效，必须对账。', false, true, request.requestId); }
    } catch (error) {
      if (error instanceof ScreenTextLocalOcrTransportError) throw error;
      if (options.signal.aborted) throw new ScreenTextLocalOcrTransportError('cancelled', 'LOCAL_OCR_CANCELLED', '本地 OCR 请求已取消。', false, false, request.requestId);
      if (timedOut) throw new ScreenTextLocalOcrTransportError('external_unknown', 'LOCAL_OCR_TIMEOUT', '本地 OCR 请求超时，必须对账。', false, true, request.requestId);
      throw new ScreenTextLocalOcrTransportError('external_unknown', 'LOCAL_OCR_UNKNOWN', '本地 OCR 返回未知结果，必须对账。', false, true, request.requestId);
    } finally {
      clearTimeout(timer);
      options.signal.removeEventListener('abort', relayAbort);
    }
  }
}

export type LocalOcrTransportFactory = (config: LocalOcrRuntimeConfig) => ScreenTextLocalOcrSidecarTransport;

export const createLocalOcrAdapterRegistryFromEnv = (input: {
  env?: NodeJS.ProcessEnv;
  transportFactory?: LocalOcrTransportFactory;
} = {}): ScreenTextAdapterRegistry | null => {
  const env = input.env ?? process.env;
  const configs = createLocalOcrRuntimeConfigFromEnv(env);
  const adapters = [
    configs.openvino ? new ScreenTextLocalOcrSidecarAdapter(
      (input.transportFactory ?? ((config) => new LocalOcrLoopbackTransport(config)))(configs.openvino),
      { ...defaultScreenTextLocalOcrLimits, deadlineMs: localOcrTimeoutsFor(configs.openvino.timeoutMs).adapterTimeoutMs },
      { descriptor: descriptorFor('openvino', configs.openvino.modelDigest), streamedMedia: true, receipt: 'submitted' },
    ) : null,
    configs.onnxruntime ? new ScreenTextLocalOcrSidecarAdapter(
      (input.transportFactory ?? ((config) => new LocalOcrLoopbackTransport(config)))(configs.onnxruntime),
      { ...defaultScreenTextLocalOcrLimits, deadlineMs: localOcrTimeoutsFor(configs.onnxruntime.timeoutMs).adapterTimeoutMs },
      { descriptor: descriptorFor('onnxruntime', configs.onnxruntime.modelDigest), streamedMedia: true, receipt: 'submitted' },
    ) : null,
  ].filter((adapter): adapter is ScreenTextLocalOcrSidecarAdapter => adapter !== null);
  if (!adapters.length) return null;
  const defaultAdapter = configs.openvino ? 'screen_text_openvino_ppocrv6_small' : 'screen_text_onnxruntime_ppocrv6_small';
  return new Registry(adapters, defaultAdapter);
};

export const localOcrEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  bool(env.QIMAO_LOCAL_OCR_OPENVINO_ENABLED) || bool(env.QIMAO_LOCAL_OCR_ONNX_ENABLED);
