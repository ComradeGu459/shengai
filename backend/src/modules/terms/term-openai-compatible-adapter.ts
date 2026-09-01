import type { TermGender, TermType } from '@qimao-terms-cloud/contracts';

import type { ParsedTermCue } from './srt-parser.js';
import type {
  ExtractedTermSeed,
  TermExtractionAdapter,
  TermExtractionOutput,
  TermExtractionRunConfigSnapshot,
} from './term-extraction.js';

export const DEEPSEEK_V4_FLASH_ENDPOINT = 'https://api.deepseek.com/chat/completions';
export const DEEPSEEK_V4_FLASH_MODEL = 'deepseek-v4-flash';
export const DEFAULT_TERM_PROMPT_VERSION = 'term-prompt-v1';
export const DEFAULT_TERM_CATEGORY_ORDER: readonly TermType[] = [
  '人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件',
];
export const DEFAULT_TERM_PROMPT = `
你是影视字幕术语抽取器。只返回 JSON 对象，不要 Markdown、解释或代码围栏。
JSON 顶层只能有 candidates 和可选 diagnostics；candidates 必须是数组。
每个 candidate 必须包含 type、name、aliases、gender、note、confidence、evidenceCueIds。
没有可靠证据的候选不要输出。evidenceCueIds 必须引用输入中真实存在的 cue id。
`.trim();
const TERM_TARGET_JSON_STRUCTURE_EXAMPLE = `
目标 JSON 结构示例（结构不可变，不要增加字段；evidenceCueIds 必须替换为输入中真实存在的 cue id）：
{
  "candidates": [
    {
      "type": "人名",
      "name": "示例名称",
      "aliases": ["示例别名"],
      "gender": "unknown",
      "note": "仅在有可靠证据时填写",
      "confidence": 0.95,
      "evidenceCueIds": ["<真实 cue id>"]
    }
  ],
  "diagnostics": []
}
`.trim();

export type TermExtractionProviderPreset = 'deepseek-v4-flash' | 'custom';

/** endpoint/model/prompt 是一次运行的解析结果；Bearer key 永远不进入快照。 */
export interface TermProviderRunConfigSnapshot extends TermExtractionRunConfigSnapshot {
  readonly preset: TermExtractionProviderPreset;
  readonly endpoint: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly prompt: string;
  readonly categoryOrder: readonly TermType[];
}

export type TermOpenAICompatibleConfig =
  | { preset: 'deepseek-v4-flash'; bearerKey: string; snapshot?: Partial<TermProviderRunConfigSnapshot> }
  | { preset: 'custom'; endpoint: string; model: string; bearerKey: string; snapshot?: Partial<TermProviderRunConfigSnapshot> };

export type TermProviderErrorCode =
  | 'TERM_PROVIDER_REQUEST_FAILED'
  | 'TERM_PROVIDER_HTTP_ERROR'
  | 'TERM_PROVIDER_PROTOCOL_INVALID';

export type TermProviderFailureDisposition = 'external_not_accepted' | 'unknown' | 'stop';

export class TermProviderError extends Error {
  constructor(
    readonly code: TermProviderErrorCode,
    message: string,
    readonly disposition: TermProviderFailureDisposition = 'stop',
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'TermProviderError';
  }
}

const allowedTypes = new Set<TermType>(DEFAULT_TERM_CATEGORY_ORDER);
const allowedGenders = new Set<TermGender>(['male', 'female', 'unknown']);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
};
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const normalizeEndpoint = (value: string) => {
  let endpoint: URL;
  try { endpoint = new URL(value); } catch { throw new Error('术语 Provider endpoint 必须是有效 URL。'); }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password
    || endpoint.search || endpoint.hash) {
    throw new Error('术语 Provider endpoint 必须是无凭据、无查询和片段的 HTTPS URL。');
  }
  return endpoint.toString();
};

const normalizeCategoryOrder = (value: unknown) => {
  if (!Array.isArray(value) || value.length !== DEFAULT_TERM_CATEGORY_ORDER.length
    || new Set(value).size !== DEFAULT_TERM_CATEGORY_ORDER.length
    || !value.every((item) => typeof item === 'string' && allowedTypes.has(item as TermType))) {
    throw new Error('术语 Provider categoryOrder 必须覆盖八类且不重复。');
  }
  return Object.freeze([...value] as TermType[]);
};

const resolveSnapshot = (input: {
  preset: TermExtractionProviderPreset;
  endpoint?: string;
  model?: string;
  snapshot?: Partial<TermProviderRunConfigSnapshot>;
}) => {
  const snapshot = input.snapshot;
  const endpoint = input.preset === 'deepseek-v4-flash'
    ? DEEPSEEK_V4_FLASH_ENDPOINT
    : normalizeEndpoint(typeof snapshot?.endpoint === 'string' ? snapshot.endpoint : input.endpoint ?? '');
  const model = input.preset === 'deepseek-v4-flash'
    ? DEEPSEEK_V4_FLASH_MODEL
    : (typeof snapshot?.model === 'string' ? snapshot.model.trim() : input.model?.trim() ?? '');
  const promptVersion = typeof snapshot?.promptVersion === 'string' && snapshot.promptVersion.trim()
    ? snapshot.promptVersion.trim() : DEFAULT_TERM_PROMPT_VERSION;
  const prompt = typeof snapshot?.prompt === 'string' && snapshot.prompt.trim()
    ? snapshot.prompt.trim() : DEFAULT_TERM_PROMPT;
  if (!model) throw new Error('custom 术语 Provider 必须配置 model。');
  return Object.freeze({
    preset: input.preset,
    endpoint,
    model,
    promptVersion,
    prompt,
    categoryOrder: normalizeCategoryOrder(snapshot?.categoryOrder ?? DEFAULT_TERM_CATEGORY_ORDER),
  }) satisfies TermProviderRunConfigSnapshot;
};

const resolveConfig = (input: TermOpenAICompatibleConfig) => {
  if (!input.bearerKey.trim()) throw new Error('术语 Provider 必须配置 Bearer key。');
  const snapshot = resolveSnapshot(input);
  return Object.freeze({ ...snapshot, bearerKey: input.bearerKey });
};

const promptForRun = (snapshot: TermProviderRunConfigSnapshot, promptVersion: string) => [
  snapshot.prompt,
  `当前提示版本：${promptVersion}。固定分类顺序：${snapshot.categoryOrder.join('、')}。`,
  'type 只能使用上述八类；gender 只能是 male、female、unknown；confidence 必须是 0 到 1 的数字。',
  TERM_TARGET_JSON_STRUCTURE_EXAMPLE,
].join('\n');

const parseCandidate = (value: unknown, cueIds: Set<string>): ExtractedTermSeed => {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'type', 'name', 'aliases', 'gender', 'note', 'confidence', 'evidenceCueIds',
  ])) throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语 Provider 返回的候选字段不符合协议。');
  const { type, name, aliases, gender, note, confidence, evidenceCueIds } = value;
  if (typeof type !== 'string' || !allowedTypes.has(type as TermType)
    || typeof name !== 'string' || !name.trim() || name.length > 120
    || !Array.isArray(aliases) || aliases.length > 30
    || !aliases.every((item) => typeof item === 'string' && item.trim() && item.length <= 120)
    || typeof gender !== 'string' || !allowedGenders.has(gender as TermGender)
    || typeof note !== 'string' || note.length > 500
    || !isFiniteNumber(confidence) || confidence < 0 || confidence > 1
    || !Array.isArray(evidenceCueIds) || evidenceCueIds.length === 0
    || !evidenceCueIds.every((cueId) => typeof cueId === 'string' && cueIds.has(cueId))) {
    throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语 Provider 返回的候选值或 Cue 证据无效。');
  }
  return {
    type: type as TermType,
    name: name.trim(),
    aliases: [...new Set((aliases as string[]).map((item) => item.trim()))],
    gender: gender as TermGender,
    note: note.trim(),
    confidence,
    evidenceCueIds: [...new Set(evidenceCueIds as string[])],
  };
};

const parseProviderPayload = (payload: unknown, cueIds: Set<string>) => {
  if (!isRecord(payload) || !hasOnlyKeys(payload, ['candidates', 'diagnostics'])
    || !Array.isArray(payload.candidates)) {
    throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语 Provider 返回的 JSON 顶层结构无效。');
  }
  const diagnostics = payload.diagnostics ?? [];
  if (!Array.isArray(diagnostics) || !diagnostics.every((item) => typeof item === 'string')) {
    throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语 Provider 返回的 diagnostics 无效。');
  }
  return {
    candidates: payload.candidates.map((candidate) => parseCandidate(candidate, cueIds)),
    diagnostics: diagnostics as string[],
  };
};

const readUsage = (value: unknown) => {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语 Provider 返回的 usage 无效。');
  const entries: Array<[string, number]> = [];
  const flattenedKeys = new Set<string>();
  const flatten = (record: Record<string, unknown>, prefix: string) => {
    for (const [key, item] of Object.entries(record).sort(([left], [right]) => left.localeCompare(right))) {
      const flattenedKey = prefix ? `${prefix}.${key}` : key;
      if (isRecord(item)) {
        flatten(item, flattenedKey);
        continue;
      }
      if (!isFiniteNumber(item) || item < 0 || flattenedKeys.has(flattenedKey)) {
        throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语 Provider 返回的 usage 数值无效。');
      }
      flattenedKeys.add(flattenedKey);
      entries.push([flattenedKey, item]);
    }
  };
  flatten(value, '');
  return Object.fromEntries(entries) as Record<string, number>;
};

export class OpenAICompatibleTermExtractionAdapter implements TermExtractionAdapter {
  private readonly resolved: ReturnType<typeof resolveConfig>;

  constructor(
    config: TermOpenAICompatibleConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.resolved = resolveConfig(config);
  }

  get name() { return this.resolved.preset === 'deepseek-v4-flash' ? 'deepseek-v4-flash' : 'openai-compatible-custom'; }

  get configSummary(): Record<string, unknown> {
    return Object.freeze({
      preset: this.resolved.preset,
      endpoint: this.resolved.endpoint,
      model: this.resolved.model,
      promptVersion: this.resolved.promptVersion,
      prompt: this.resolved.prompt,
      categoryOrder: this.resolved.categoryOrder,
    });
  }

  private snapshotForRun(config?: TermExtractionRunConfigSnapshot) {
    if (!config) return this.resolved;
    if (typeof config.preset === 'string' && config.preset !== this.resolved.preset) {
      throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语运行配置与当前适配器不匹配。');
    }
    const snapshot = resolveSnapshot({
      preset: this.resolved.preset,
      endpoint: this.resolved.endpoint,
      model: this.resolved.model,
      snapshot: config as Partial<TermProviderRunConfigSnapshot>,
    });
    if (snapshot.preset !== this.resolved.preset) {
      throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语运行配置与当前适配器不匹配。');
    }
    return snapshot;
  }

  async extract(input: {
    cues: ParsedTermCue[];
    promptVersion: string;
    config?: TermExtractionRunConfigSnapshot;
  }): Promise<TermExtractionOutput> {
    const snapshot = this.snapshotForRun(input.config);
    const cueIds = new Set(input.cues.map((cue) => cue.id));
    const requestBody = {
      model: snapshot.model,
      messages: [
        { role: 'system', content: promptForRun(snapshot, input.promptVersion) },
        { role: 'user', content: JSON.stringify({ cues: input.cues }) },
      ],
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      max_tokens: 16_384,
    };
    let response: Response;
    try {
      response = await this.fetchImpl(snapshot.endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.resolved.bearerKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch {
      throw new TermProviderError('TERM_PROVIDER_REQUEST_FAILED', '术语 Provider 请求失败。', 'unknown');
    }
    if (!response.ok) {
      let externalNotAccepted = false;
      try {
        const body = await response.clone().json() as unknown;
        const code = isRecord(body) && typeof body.code === 'string'
          ? body.code
          : isRecord(body) && isRecord(body.error) && typeof body.error.code === 'string'
            ? body.error.code
            : null;
        // 认证、计费和请求校验错误即使正文出现相同字样也不能切备用。
        externalNotAccepted = ![401, 402, 422].includes(response.status) && code === 'external_not_accepted';
      } catch { /* HTTP 错误正文不是协议输入，不影响稳定失败分类。 */ }
      throw new TermProviderError(
        'TERM_PROVIDER_HTTP_ERROR',
        `术语 Provider 返回 HTTP ${response.status}。`,
        externalNotAccepted ? 'external_not_accepted' : 'stop',
        response.status,
      );
    }
    let envelope: unknown;
    try { envelope = await response.json(); } catch {
      throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语 Provider 响应不是有效 JSON。');
    }
    if (!isRecord(envelope) || !Array.isArray(envelope.choices) || !envelope.choices[0]
      || !isRecord(envelope.choices[0]) || !isRecord(envelope.choices[0].message)
      || typeof envelope.choices[0].message.content !== 'string') {
      throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语 Provider 响应缺少 Chat Completions 内容。');
    }
    let content: unknown;
    try { content = JSON.parse(envelope.choices[0].message.content); } catch {
      throw new TermProviderError('TERM_PROVIDER_PROTOCOL_INVALID', '术语 Provider message.content 不是有效 JSON。');
    }
    const parsed = parseProviderPayload(content, cueIds);
    return {
      candidates: parsed.candidates,
      diagnostics: parsed.diagnostics,
      usageSummary: {
        inputCues: input.cues.length,
        paidCalls: 1,
        ...readUsage(envelope.usage),
      },
    };
  }
}

export const createDeepSeekV4FlashTermExtractionAdapter = (
  bearerKey: string,
  fetchImpl: typeof fetch = fetch,
  snapshot?: Partial<TermProviderRunConfigSnapshot>,
) => new OpenAICompatibleTermExtractionAdapter({ preset: 'deepseek-v4-flash', bearerKey, ...(snapshot ? { snapshot } : {}) }, fetchImpl);

export const createCustomTermExtractionAdapter = (
  input: { endpoint: string; model: string; bearerKey: string; snapshot?: Partial<TermProviderRunConfigSnapshot> },
  fetchImpl: typeof fetch = fetch,
) => new OpenAICompatibleTermExtractionAdapter({ preset: 'custom', ...input }, fetchImpl);

export const createTermExtractionAdapterFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
) => {
  const preset = (env.QIMAO_TERM_EXTRACTION_PRESET?.trim() || 'deepseek-v4-flash') as TermExtractionProviderPreset;
  if (preset === 'deepseek-v4-flash') {
    return createDeepSeekV4FlashTermExtractionAdapter(env.DEEPSEEK_API_KEY ?? '', fetchImpl);
  }
  if (preset === 'custom') {
    return createCustomTermExtractionAdapter({
      endpoint: env.QIMAO_TERM_EXTRACTION_ENDPOINT ?? '',
      model: env.QIMAO_TERM_EXTRACTION_MODEL ?? '',
      bearerKey: env.QIMAO_TERM_EXTRACTION_API_KEY ?? '',
    }, fetchImpl);
  }
  throw new Error('QIMAO_TERM_EXTRACTION_PRESET 只能是 deepseek-v4-flash 或 custom。');
};
