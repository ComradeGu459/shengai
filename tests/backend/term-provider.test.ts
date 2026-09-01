import { describe, expect, it } from 'vitest';

import type { ParsedTermCue } from '../../backend/src/modules/terms/srt-parser.js';
import {
  createCustomTermExtractionAdapter,
  createDeepSeekV4FlashTermExtractionAdapter,
  DEEPSEEK_V4_FLASH_ENDPOINT,
  DEEPSEEK_V4_FLASH_MODEL,
  TermProviderError,
} from '../../backend/src/modules/terms/term-openai-compatible-adapter.js';

const cue: ParsedTermCue = {
  id: 'a'.repeat(64),
  assetId: '00000000-0000-0000-0000-000000000001',
  episodeNumber: 1,
  cueIndex: 1,
  startMs: 1_000,
  endMs: 2_000,
  text: '林川来到雾城。',
};

const providerPayload = (name = '林川', cueId = cue.id) => ({
  candidates: [{
    type: '人名', name, aliases: ['小川'], gender: 'male', note: '主角', confidence: 0.98,
    evidenceCueIds: [cueId],
  }],
});

const stubFetch = (payload: unknown, seen: Array<{ url: string; init?: RequestInit }>) =>
  async (url: string | URL, init?: RequestInit) => {
    seen.push({ url: String(url), ...(init ? { init } : {}) });
    return new Response(JSON.stringify({
      id: 'stub-response',
      choices: [{ message: { content: JSON.stringify(payload) } }],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 8,
        total_tokens: 20,
        completion_tokens_details: { reasoning_tokens: 3 },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

describe('OpenAI-compatible term extraction adapter', () => {
  it('DeepSeek V4 Flash 使用固定 preset、Bearer header 和严格 JSON 输出', async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = [];
    const adapter = createDeepSeekV4FlashTermExtractionAdapter('deepseek-test-key', stubFetch(providerPayload(), seen));
    const output = await adapter.extract({ cues: [cue], promptVersion: 'term-prompt-v1' });

    expect(adapter.name).toBe('deepseek-v4-flash');
    expect(adapter.configSummary).toMatchObject({
      preset: 'deepseek-v4-flash', endpoint: DEEPSEEK_V4_FLASH_ENDPOINT, model: DEEPSEEK_V4_FLASH_MODEL,
    });
    expect(adapter.configSummary).not.toHaveProperty('bearerKey');
    expect(seen[0]?.url).toBe(DEEPSEEK_V4_FLASH_ENDPOINT);
    expect(seen[0]?.init?.headers).toMatchObject({ authorization: 'Bearer deepseek-test-key' });
    expect(JSON.parse(String(seen[0]?.init?.body))).toMatchObject({
      model: DEEPSEEK_V4_FLASH_MODEL,
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      max_tokens: 16_384,
    });
    expect(JSON.parse(String(seen[0]?.init?.body)).messages[0].content).toContain('"evidenceCueIds": ["<真实 cue id>"]');
    expect(output).toMatchObject({
      candidates: [{ name: '林川', evidenceCueIds: [cue.id] }],
      usageSummary: { paidCalls: 1, 'completion_tokens_details.reasoning_tokens': 3 },
    });
  });

  it('custom preset 只使用解析快照中的 endpoint/model，提示词和分类顺序可由控制面注入', async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = [];
    const adapter = createCustomTermExtractionAdapter({
      endpoint: 'https://custom.example.test/v1/chat/completions',
      model: 'custom-term-model',
      bearerKey: 'custom-test-key',
      snapshot: {
        promptVersion: 'console-prompt-v2',
        prompt: '控制面解析后的术语提示词',
        categoryOrder: ['特殊概念/事件', '人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名'],
      },
    }, stubFetch(providerPayload('雾城'), seen));
    await adapter.extract({ cues: [cue], promptVersion: 'console-prompt-v2' });

    expect(adapter.name).toBe('openai-compatible-custom');
    expect(seen[0]?.url).toBe('https://custom.example.test/v1/chat/completions');
    const body = JSON.parse(String(seen[0]?.init?.body));
    expect(body.model).toBe('custom-term-model');
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.max_tokens).toBe(16_384);
    expect(body.messages[0].content).toContain('控制面解析后的术语提示词');
    expect(body.messages[0].content).toContain('特殊概念/事件、人名、地名');
    expect(body.messages[0].content).toContain('"candidates": [');
    expect(body.messages[0].content).toContain('"evidenceCueIds": ["<真实 cue id>"]');
  });

  it('协议 JSON、八类和真实 cueId 任一失败都不落候选', async () => {
    const invalidOutputs = [
      JSON.stringify({ candidates: [] }),
      JSON.stringify({ candidates: [{ ...providerPayload().candidates[0], type: '未知类' }] }),
      JSON.stringify({ candidates: [{ ...providerPayload().candidates[0], evidenceCueIds: ['b'.repeat(64)] }] }),
    ];
    for (const content of invalidOutputs) {
      const fetchImpl = async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
      const adapter = createDeepSeekV4FlashTermExtractionAdapter('test-key', fetchImpl);
      if (content === invalidOutputs[0]) {
        await expect(adapter.extract({ cues: [cue], promptVersion: 'term-prompt-v1' })).resolves.toMatchObject({ candidates: [] });
      } else {
        await expect(adapter.extract({ cues: [cue], promptVersion: 'term-prompt-v1' })).rejects.toMatchObject({
          code: 'TERM_PROVIDER_PROTOCOL_INVALID',
        } satisfies Partial<TermProviderError>);
      }
    }
    const nonJson = createDeepSeekV4FlashTermExtractionAdapter('test-key', async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{bad' } }] }), { status: 200 }));
    await expect(nonJson.extract({ cues: [cue], promptVersion: 'term-prompt-v1' })).rejects.toMatchObject({
      code: 'TERM_PROVIDER_PROTOCOL_INVALID',
    });
  });

  it('usage 支持官方嵌套 details 与既有扁平字段，并拒绝负数、NaN 和字符串叶子', async () => {
    const envelope = (usage: unknown) => ({
      choices: [{ message: { content: JSON.stringify(providerPayload()) } }],
      usage,
    });
    const responseFor = (body: unknown) => async () => ({
      ok: true,
      json: async () => body,
    } as Response);

    const flat = createDeepSeekV4FlashTermExtractionAdapter('test-key', responseFor(envelope({ prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 })));
    await expect(flat.extract({ cues: [cue], promptVersion: 'term-prompt-v1' })).resolves.toMatchObject({
      usageSummary: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
    });

    for (const usage of [
      { prompt_tokens: -1 },
      { prompt_tokens: Number.NaN },
      { prompt_tokens: '12' },
    ]) {
      const adapter = createDeepSeekV4FlashTermExtractionAdapter('test-key', responseFor(envelope(usage)));
      await expect(adapter.extract({ cues: [cue], promptVersion: 'term-prompt-v1' })).rejects.toMatchObject({
        code: 'TERM_PROVIDER_PROTOCOL_INVALID',
      });
    }
  });

  it('只有明确 external_not_accepted 才标记可切 standby，401/402/422 与协议错误均停止当前 attempt', async () => {
    const response = (status: number, body: unknown = {}) => async () => new Response(JSON.stringify(body), { status });
    const rejected = createDeepSeekV4FlashTermExtractionAdapter('test-key', response(409, { code: 'external_not_accepted' }));
    await expect(rejected.extract({ cues: [cue], promptVersion: 'term-prompt-v1' })).rejects.toMatchObject({ disposition: 'external_not_accepted', httpStatus: 409 });
    for (const status of [401, 402, 422]) {
      const adapter = createDeepSeekV4FlashTermExtractionAdapter('test-key', response(status, { code: 'external_not_accepted' }));
      await expect(adapter.extract({ cues: [cue], promptVersion: 'term-prompt-v1' })).rejects.toMatchObject({ disposition: 'stop', httpStatus: status });
    }
    const unknown = createDeepSeekV4FlashTermExtractionAdapter('test-key', async () => { throw new Error('network disconnected'); });
    await expect(unknown.extract({ cues: [cue], promptVersion: 'term-prompt-v1' })).rejects.toMatchObject({ code: 'TERM_PROVIDER_REQUEST_FAILED', disposition: 'unknown' });
  });
});
