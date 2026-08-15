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

export interface TermExtractionAdapter {
  readonly name: string;
  readonly configSummary: Record<string, unknown>;
  extract(input: { cues: ParsedTermCue[]; promptVersion: string }): Promise<TermExtractionOutput>;
}

const types = new Set<TermType>([
  '人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件',
]);

const marker = /【([^:：】]+)[:：]([^】]+)】/g;

export class DeterministicFakeTermExtractionAdapter implements TermExtractionAdapter {
  readonly name = 'deterministic-marker-fake';
  readonly configSummary = { paid: false, markerFormat: '【类型:名称;别称=a/b;性别=男/女;备注=...】' };

  async extract(input: { cues: ParsedTermCue[] }): Promise<TermExtractionOutput> {
    const collected = new Map<string, ExtractedTermSeed>();
    for (const cue of input.cues) {
      for (const match of cue.text.matchAll(marker)) {
        const type = match[1]?.trim() as TermType;
        if (!types.has(type)) continue;
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
