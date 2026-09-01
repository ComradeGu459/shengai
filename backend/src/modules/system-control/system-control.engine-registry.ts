import { createHash } from 'node:crypto';
import type { AsrAdapterDescriptor } from '../asr/asr-adapter.js';
import type { AsrAdapterRegistry } from '../asr/asr-adapter-registry.js';
import type { AsrAdapter } from '../asr/asr-adapter.js';
import type { ScreenTextAdapter, ScreenTextAdapterDescriptor } from '../screen-text/screen-text.adapter.js';
import type { ScreenTextAdapterRegistry } from '../screen-text/screen-text.adapter-registry.js';
import type { TermExtractionAdapter } from '../terms/term-extraction.js';
import {
  DEFAULT_TERM_CATEGORY_ORDER,
  DEFAULT_TERM_PROMPT,
  DEEPSEEK_V4_FLASH_ENDPOINT,
} from '../terms/term-openai-compatible-adapter.js';
import type {
  SystemControlCapabilitiesSnapshot,
  SystemControlEngineCapability,
  SystemControlEngineExecutionKind,
  SystemControlRuntimeConfig,
  SystemControlRuntimeConfigInput,
  SystemControlTermRuntimeConfig,
  SystemControlTermRuntimeConfigInput,
} from '@qimao-terms-cloud/contracts';
import { resolveScreenTextRuntimeConfig } from '../screen-text/screen-text-runtime-config.js';

export class SystemControlEngineRegistryError extends Error {
  constructor(readonly code: 'ADAPTER_NOT_REGISTERED' | 'ADAPTER_CAPABILITY_MISMATCH' | 'EXECUTION_KIND_MISMATCH', message: string) {
    super(message);
    this.name = 'SystemControlEngineRegistryError';
  }
}

type RegistryInput = {
  asr: AsrAdapterRegistry;
  screenText: ScreenTextAdapterRegistry;
  terms?: TermExtractionAdapter;
};

export type TermControlPlaneDescriptor = {
  provider: string;
  adapter: string;
  model: string;
  language: string;
  configDigest: string;
  runtimeConfig: SystemControlTermRuntimeConfig;
};

const CONTROL_PLANE_PROBE_KEYS = new Set([
  'deterministic_fake',
  'screen_text_deterministic_fake',
  'screen_text_cloud_stub',
  'screen_text_worker_stub',
  'screen_text_local_ocr_sidecar_fake',
  'screen_text_openvino_ppocrv6_small',
  'screen_text_onnxruntime_ppocrv6_small',
]);
const ASR_CONTROL_PLANE_PROBE_KEYS = new Set([
  ...CONTROL_PLANE_PROBE_KEYS,
  'tencent_cloud_recorded_v1',
]);
const REAL_LOCAL_OCR_PROBE_KEYS = new Set([
  'screen_text_openvino_ppocrv6_small',
  'screen_text_onnxruntime_ppocrv6_small',
]);
// 320x128 RGBA 黑色 PNG：连接测试只把它作为有界、可解码的帧样本，不读取真实素材。
const SYNTHETIC_PNG_BYTES = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAUAAAACACAYAAAB6D7CqAAAAtklEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgBcDgJ4AASqlUfEAAAAASUVORK5CYII=',
  'base64',
));

export type RegisteredEngine = {
  capability: SystemControlEngineCapability;
  executionKind: SystemControlEngineExecutionKind;
  provider: string;
  adapterKey: string;
  model: string;
  language: string;
  descriptorDigest: string;
  capabilities: Record<string, unknown>;
  descriptor: AsrAdapterDescriptor | ScreenTextAdapterDescriptor | TermControlPlaneDescriptor;
  /** 仅由 system-control 解析的不可变运行配置；Worker 不读取管理员实时值。 */
  runtimeConfig?: SystemControlRuntimeConfig;
  adapter?: AsrAdapter | ScreenTextAdapter | TermExtractionAdapter;
};

const TERM_CONTROL_PLANE_ADAPTER_KEYS = new Set([
  'terms_api',
  'deepseek-v4-flash',
  'openai-compatible',
  'openai-compatible-custom',
]);
const termCategorySet = new Set<string>(DEFAULT_TERM_CATEGORY_ORDER);
const normalizeTermEndpoint = (value: string) => {
  let endpoint: URL;
  try { endpoint = new URL(value); } catch { throw new SystemControlEngineRegistryError('ADAPTER_CAPABILITY_MISMATCH', '术语 endpoint 必须是有效 HTTPS URL。'); }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new SystemControlEngineRegistryError('ADAPTER_CAPABILITY_MISMATCH', '术语 endpoint 必须是无凭据、无查询和片段的 HTTPS URL。');
  }
  return endpoint.toString();
};

export const resolveTermRuntimeConfig = (
  input: SystemControlTermRuntimeConfigInput | Partial<SystemControlTermRuntimeConfig> | null | undefined,
): SystemControlTermRuntimeConfig => {
  const requested = input ?? {};
  const preset = requested.preset ?? 'deepseek-v4-flash';
  if (preset === 'deepseek-v4-flash' && requested.endpoint !== undefined
    && requested.endpoint.trim() !== DEEPSEEK_V4_FLASH_ENDPOINT) {
    throw new SystemControlEngineRegistryError('ADAPTER_CAPABILITY_MISMATCH', 'deepseek-v4-flash preset 只能使用其固定 HTTPS endpoint。');
  }
  const endpoint = preset === 'deepseek-v4-flash'
    ? DEEPSEEK_V4_FLASH_ENDPOINT
    : normalizeTermEndpoint(typeof requested.endpoint === 'string' ? requested.endpoint.trim() : '');
  const prompt = typeof requested.prompt === 'string' && requested.prompt.trim() ? requested.prompt.trim() : DEFAULT_TERM_PROMPT;
  const categoryOrder = requested.categoryOrder ?? DEFAULT_TERM_CATEGORY_ORDER;
  if (prompt.length > 20_000 || !Array.isArray(categoryOrder) || categoryOrder.length !== 8
    || new Set(categoryOrder).size !== 8 || !categoryOrder.every((value) => typeof value === 'string' && termCategorySet.has(value))) {
    throw new SystemControlEngineRegistryError('ADAPTER_CAPABILITY_MISMATCH', '术语 runtimeConfig 必须包含八类完整且唯一的分类顺序。');
  }
  return Object.freeze({
    preset,
    endpoint,
    prompt,
    categoryOrder: Object.freeze([...categoryOrder]) as unknown as SystemControlTermRuntimeConfig['categoryOrder'],
  });
};

const resolveTerms = (
  registries: RegistryInput,
  executionKind: SystemControlEngineExecutionKind,
  adapterKey: string,
  runtimeConfig: SystemControlTermRuntimeConfig | SystemControlTermRuntimeConfigInput | undefined,
  model: string | undefined,
): RegisteredEngine => {
  if (executionKind !== 'cloud_api') throw new SystemControlEngineRegistryError('EXECUTION_KIND_MISMATCH', '术语 API 只允许使用 cloud_api。');
  if (!TERM_CONTROL_PLANE_ADAPTER_KEYS.has(adapterKey)) throw new SystemControlEngineRegistryError('ADAPTER_NOT_REGISTERED', `术语适配器未登记：${adapterKey}`);
  const config = resolveTermRuntimeConfig(runtimeConfig);
  const requestedModel = typeof model === 'string' ? model.trim() : '';
  if (config.preset === 'deepseek-v4-flash' && requestedModel && requestedModel !== 'deepseek-v4-flash') {
    throw new SystemControlEngineRegistryError('ADAPTER_CAPABILITY_MISMATCH', 'deepseek-v4-flash preset 只能使用固定 model。');
  }
  const resolvedModel = config.preset === 'deepseek-v4-flash' ? 'deepseek-v4-flash' : requestedModel;
  if (!resolvedModel || resolvedModel.length > 120) throw new SystemControlEngineRegistryError('ADAPTER_CAPABILITY_MISMATCH', '术语部署必须保存非空 model。');
  const descriptor: TermControlPlaneDescriptor = {
    provider: config.preset === 'deepseek-v4-flash' ? 'deepseek' : 'custom',
    adapter: adapterKey,
    model: resolvedModel,
    language: 'zh-CN',
    configDigest: createHash('sha256').update(JSON.stringify({ capability: 'terms', executionKind, adapterKey, model: resolvedModel, runtimeConfig: config })).digest('hex'),
    runtimeConfig: config,
  };
  return {
    capability: 'terms', executionKind, provider: descriptor.provider, adapterKey,
    model: descriptor.model, language: descriptor.language, descriptorDigest: descriptor.configDigest,
    capabilities: { preset: config.preset, categoryOrder: [...config.categoryOrder] },
    descriptor, ...(registries.terms ? { adapter: registries.terms } : {}),
  };
};

const asrExecutionKind = (executionKind: SystemControlEngineExecutionKind) => {
  if (executionKind !== 'cloud_api') {
    throw new SystemControlEngineRegistryError('EXECUTION_KIND_MISMATCH', '当前 ASR Registry 只登记 cloud_api 零网络 probe。');
  }
};

export const resolveRegisteredEngine = (
  registries: RegistryInput,
  capability: SystemControlEngineCapability,
  executionKind: SystemControlEngineExecutionKind,
  adapterKey: string,
  runtimeConfig?: SystemControlRuntimeConfig | SystemControlRuntimeConfigInput,
  model?: string,
): RegisteredEngine => {
  if (capability === 'terms') return resolveTerms(registries, executionKind, adapterKey, runtimeConfig as SystemControlTermRuntimeConfig | SystemControlTermRuntimeConfigInput | undefined, model);
  if (capability === 'asr') {
    asrExecutionKind(executionKind);
    if (!ASR_CONTROL_PLANE_PROBE_KEYS.has(adapterKey)) throw new SystemControlEngineRegistryError('ADAPTER_NOT_REGISTERED', `ASR 适配器不是 Wave A 允许的零网络 probe：${adapterKey}`);
    const adapter = registries.asr.get(adapterKey);
    if (!adapter) throw new SystemControlEngineRegistryError('ADAPTER_NOT_REGISTERED', `ASR 适配器未登记：${adapterKey}`);
    const descriptor = adapter.descriptor;
    return {
      capability, executionKind, provider: descriptor.provider, adapterKey: descriptor.adapter,
      model: descriptor.model, language: descriptor.language, descriptorDigest: descriptor.configDigest,
      capabilities: { hotword: { ...descriptor.hotwordCapabilities } }, descriptor, adapter,
    };
  }

  if (!CONTROL_PLANE_PROBE_KEYS.has(adapterKey)) throw new SystemControlEngineRegistryError('ADAPTER_NOT_REGISTERED', `画面字适配器不是 Wave A 允许的零网络 probe：${adapterKey}`);
  const adapter = registries.screenText.get(adapterKey);
  if (!adapter) throw new SystemControlEngineRegistryError('ADAPTER_NOT_REGISTERED', `画面字适配器未登记：${adapterKey}`);
  const descriptor = adapter.descriptor;
  const expectedKind: SystemControlEngineExecutionKind = descriptor.kind === 'self_hosted_worker'
    ? 'self_hosted_worker'
    : 'cloud_api';
  if (expectedKind !== executionKind) {
    throw new SystemControlEngineRegistryError('EXECUTION_KIND_MISMATCH', '适配器执行类型与控制台部署类型不一致。');
  }
  let screenRuntimeConfig: SystemControlRuntimeConfig | undefined;
  try {
    const resolvedRuntimeConfig = resolveScreenTextRuntimeConfig(adapterKey, runtimeConfig as Record<string, unknown> | undefined);
    if (resolvedRuntimeConfig) screenRuntimeConfig = resolvedRuntimeConfig;
  } catch (error) {
    throw new SystemControlEngineRegistryError('ADAPTER_CAPABILITY_MISMATCH', error instanceof Error ? error.message : 'screen-text runtimeConfig 无效。');
  }
  return {
    capability, executionKind, provider: descriptor.provider, adapterKey: descriptor.adapter,
    model: descriptor.model, language: descriptor.language, descriptorDigest: descriptor.configDigest,
    capabilities: { ...descriptor.capabilities }, descriptor, adapter,
    ...(screenRuntimeConfig ? { runtimeConfig: screenRuntimeConfig } : {}),
  };
};

export const toCapabilitiesSnapshot = (engine: RegisteredEngine): SystemControlCapabilitiesSnapshot => ({
  capability: engine.capability,
  executionKind: engine.executionKind,
  provider: engine.provider,
  adapterKey: engine.adapterKey,
  model: engine.model,
  language: engine.language,
  ...(engine.capability === 'screen_text' && 'deployment' in engine.descriptor ? { deployment: engine.descriptor.deployment, adapterKind: engine.descriptor.kind } : {}),
  descriptorDigest: engine.descriptorDigest,
  capabilities: engine.capabilities,
});

const syntheticLocalOcrInput = (testRunId: string, descriptor: ScreenTextAdapterDescriptor) => {
  const mediaBytes = Uint8Array.from([0]);
  const checksumValue = createHash('sha256').update(mediaBytes).digest('hex');
  return {
    batchId: testRunId,
    jobId: testRunId,
    episodeNumber: 1,
    attemptNumber: 1,
    attemptId: testRunId,
    asset: {
      assetId: testRunId,
      objectKey: 'system-control/connection-test/synthetic.mp4',
      originalFilename: 'connection-test.mp4',
      sizeBytes: mediaBytes.byteLength,
      checksumAlgorithm: 'sha256',
      checksumValue,
    },
    media: {
      inputKind: 'server_extracted_frames' as const,
      contentType: 'video/mp4',
      sizeBytes: mediaBytes.byteLength,
      checksumAlgorithm: 'sha256' as const,
      checksumValue,
      videoDurationMs: 2_000,
      frameCount: 1,
      pixelCount: 320 * 128,
      maxFrameCount: 1,
      maxPixels: 320 * 128,
      frames: [{
        frameIndex: 0,
        capturedAtMs: 500,
        width: 320,
        height: 128,
        contentType: 'image/png',
        bytes: SYNTHETIC_PNG_BYTES,
      }],
    },
    termProjectionDigest: '0'.repeat(64),
    termEntries: [],
    frameStrategyVersion: 'system-control-connection-test-v1',
    dedupeStrategyVersion: 'system-control-connection-test-v1',
    signal: new AbortController().signal,
    descriptor,
  };
};

/** 连接测试只对真实本地 OCR 适配器发一次合成 loopback 协议请求；fake 仍只校验描述。 */
export const runRegisteredProbe = async (engine: RegisteredEngine, input: { testRunId?: string } = {}): Promise<{
  status: 'succeeded';
  latencyMs: number;
  capabilitiesSnapshot: SystemControlCapabilitiesSnapshot;
} | { status: 'failed' | 'unknown'; reasonCode: string; reasonMessage: string; latencyMs: number }> => {
  const allowedKeys = engine.capability === 'asr' ? ASR_CONTROL_PLANE_PROBE_KEYS
    : engine.capability === 'screen_text' ? CONTROL_PLANE_PROBE_KEYS : TERM_CONTROL_PLANE_ADAPTER_KEYS;
  if (!allowedKeys.has(engine.adapterKey)) {
    throw new SystemControlEngineRegistryError('ADAPTER_NOT_REGISTERED', '适配器不是 Wave A 允许的零网络 probe。');
  }
  const started = Date.now();
  if (engine.capability === 'terms') {
    // 术语连接测试只验证不可变配置快照与登记身份，不触发 Provider 网络请求。
    return { status: 'succeeded', latencyMs: Math.max(0, Date.now() - started), capabilitiesSnapshot: toCapabilitiesSnapshot(engine) };
  }
  if (engine.capability === 'screen_text' && REAL_LOCAL_OCR_PROBE_KEYS.has(engine.adapterKey)) {
    if (!input.testRunId) throw new SystemControlEngineRegistryError('ADAPTER_CAPABILITY_MISMATCH', '真实本地 OCR 连接测试缺少 testRunId。');
    const outcome = await (engine.adapter as ScreenTextAdapter).execute(syntheticLocalOcrInput(input.testRunId, engine.descriptor as ScreenTextAdapterDescriptor));
    const latencyMs = Math.max(0, Date.now() - started);
    if (outcome.kind === 'completed') return { status: 'succeeded', latencyMs, capabilitiesSnapshot: toCapabilitiesSnapshot(engine) };
    if (outcome.kind === 'reconciliation_required') return { status: 'unknown', reasonCode: outcome.errorCode, reasonMessage: outcome.errorDetail, latencyMs };
    return {
      status: outcome.effectClass === 'external_unknown' ? 'unknown' : 'failed',
      reasonCode: outcome.errorCode,
      reasonMessage: outcome.errorDetail,
      latencyMs,
    };
  }
  // 对注册描述做一次确定性读取，确保 probe 不是仅仅跳过执行。
  const snapshot = toCapabilitiesSnapshot(engine);
  if (!snapshot.descriptorDigest || snapshot.adapterKey !== engine.adapterKey) {
    throw new Error('注册适配器描述无效。');
  }
  return { status: 'succeeded', latencyMs: Math.max(0, Date.now() - started), capabilitiesSnapshot: snapshot };
};
