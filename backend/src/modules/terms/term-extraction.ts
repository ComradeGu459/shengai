import type { TermGender, TermType } from '@qimao-terms-cloud/contracts';

import type { ParsedTermCue } from './srt-parser.js';

export interface ExtractedTermSeed {
  type: TermType;
  name: string;
  aliases: string[];
  gender: TermGender;
  note: string;
  confidence: number;
  evidenceCueIds: string[];
}

export interface TermExtractionOutput {
  candidates: ExtractedTermSeed[];
  diagnostics: string[];
  usageSummary: Record<string, number>;
}

/**
 * 运行时已经解析并随 run 固化的配置摘要。它不能包含 Secret；Provider key
 * 只存在于进程内适配器实例中。控制面未来可以直接提供同形状快照。
 */
export type TermExtractionRunConfigSnapshot = Readonly<Record<string, unknown>>;

export interface TermExtractionAdapter {
  readonly name: string;
  readonly configSummary: Record<string, unknown>;
  extract(input: {
    cues: ParsedTermCue[];
    promptVersion: string;
    config?: TermExtractionRunConfigSnapshot;
  }): Promise<TermExtractionOutput>;
}

const termTypes = new Set<TermType>([
  '人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件',
]);

/**
 * Provider 输出在进入候选/版本流程前的唯一收口校验。
 * 这里故意保留“丢弃坏候选”的历史行为，网络适配器本身对协议错误会直接失败；
 * 这样 deterministic fake 和真实 Provider 共用同一候选边界。
 */
export const validateExtractedTermSeeds = (seeds: unknown, cueIds: Set<string>) => {
  const candidates: ExtractedTermSeed[] = [];
  const diagnostics: string[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(seeds)) {
    return { candidates, diagnostics: ['Provider 返回的 candidates 不是数组。'] };
  }
  for (const value of seeds) {
    if (!value || typeof value !== 'object') {
      diagnostics.push('候选因不是对象而未进入人工草稿。');
      continue;
    }
    const seed = value as Partial<ExtractedTermSeed>;
    const name = typeof seed.name === 'string' ? seed.name.trim() : '';
    const aliases = Array.isArray(seed.aliases) && seed.aliases.every((item) => typeof item === 'string')
      ? seed.aliases as string[]
      : [];
    const evidenceCueIds = Array.isArray(seed.evidenceCueIds)
      && seed.evidenceCueIds.every((item) => typeof item === 'string')
      ? seed.evidenceCueIds as string[]
      : [];
    const evidence = [...new Set(evidenceCueIds)].filter((cueId) => cueIds.has(cueId));
    const type = seed.type;
    const confidence = seed.confidence;
    const gender = seed.gender;
    const note = seed.note;
    const key = name;
    if (typeof type !== 'string' || !termTypes.has(type as TermType) || !name || !evidence.length
      || seen.has(key) || typeof confidence !== 'number' || !Number.isFinite(confidence)
      || confidence < 0 || confidence > 1 || !['male', 'female', 'unknown'].includes(gender ?? '')
      || typeof note !== 'string') {
      diagnostics.push(`候选“${name || '未命名'}”因缺少真实证据、名称无效或重复而未进入人工草稿。`);
      continue;
    }
    seen.add(key);
    candidates.push({
      type: type as TermType,
      name,
      aliases: [...new Set(aliases.map((item) => item.trim()).filter(Boolean))],
      gender: type === '人名' ? gender as TermGender : 'unknown',
      note: note.trim(),
      confidence,
      evidenceCueIds: evidence,
    });
  }
  return { candidates, diagnostics };
};

const marker = /【([^:：】]+)[:：]([^】]+)】/g;

export class DeterministicFakeTermExtractionAdapter implements TermExtractionAdapter {
  readonly name = 'deterministic-marker-fake';
  readonly configSummary = { paid: false, markerFormat: '【类型:名称;别称=a/b;性别=男/女;备注=...】' };

  async extract(input: { cues: ParsedTermCue[] }): Promise<TermExtractionOutput> {
    const collected = new Map<string, ExtractedTermSeed>();
    for (const cue of input.cues) {
      for (const match of cue.text.matchAll(marker)) {
        const type = match[1]?.trim() as TermType;
        if (!termTypes.has(type)) continue;
        const segments = (match[2] ?? '').split(';').map((item) => item.trim());
        const name = segments.shift()?.trim() ?? '';
        if (!name) continue;
        const properties = new Map(segments.map((item) => {
          const splitAt = item.indexOf('=');
          return splitAt < 0 ? [item, ''] : [item.slice(0, splitAt).trim(), item.slice(splitAt + 1).trim()];
        }));
        const aliases = (properties.get('别称') ?? '').split('/').map((item) => item.trim()).filter(Boolean);
        const gender: TermGender = properties.get('性别') === '男'
          ? 'male'
          : properties.get('性别') === '女' ? 'female' : 'unknown';
        const key = `${type}\u0000${name}`;
        const existing = collected.get(key);
        if (existing) {
          existing.aliases = [...new Set([...existing.aliases, ...aliases])];
          existing.evidenceCueIds.push(cue.id);
        } else {
          collected.set(key, {
            type,
            name,
            aliases,
            gender,
            note: properties.get('备注') ?? '',
            confidence: 1,
            evidenceCueIds: [cue.id],
          });
        }
      }
    }
    const candidates = [...collected.values()].map((candidate) => ({
      ...candidate,
      evidenceCueIds: [...new Set(candidate.evidenceCueIds)],
    }));
    return {
      candidates,
      diagnostics: candidates.length ? [] : ['确定性 fake 未发现带正式类型标记的匿名候选。'],
      usageSummary: { inputCues: input.cues.length, paidCalls: 0 },
    };
  }
}
