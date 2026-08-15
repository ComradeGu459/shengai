import { createHash } from 'node:crypto';

import type {
  AsrHotwordOmissionReason,
  AsrHotwordSummary,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient } from 'pg';

import type { AsrAdapterDescriptor } from './asr-adapter.js';

const genericAlias = /^(?:.{0,8})?(?:先生|小姐|总|董事长|老师|老板|妈妈|爸爸|母亲|父亲|哥哥|姐姐|弟弟|妹妹)$/u;
export const asrHotwordProjectionVersion = 'term-version-hotwords-v2';

export interface HotwordProjectionEntry {
  order: number;
  word: string;
  source: 'term' | 'person_alias';
}

export interface HotwordOmittedEntry extends HotwordProjectionEntry {
  reasonCode: AsrHotwordOmissionReason;
}

export interface HotwordProjection {
  entries: HotwordProjectionEntry[];
  omittedEntries: HotwordOmittedEntry[];
  words: string[];
  summary: AsrHotwordSummary;
}

const summarize = (
  entries: HotwordProjectionEntry[],
  filteredCount: number,
  truncatedCount: number,
  projectionVersion = asrHotwordProjectionVersion,
): AsrHotwordSummary => ({
  projectionVersion,
  digest: createHash('sha256').update(entries.map((entry) => entry.word).join('\n')).digest('hex'),
  termCount: entries.filter((entry) => entry.source === 'term').length,
  aliasCount: entries.filter((entry) => entry.source === 'person_alias').length,
  filteredCount,
  truncatedCount,
});

export const applyAsrHotwordCapabilities = (
  projection: HotwordProjection,
  descriptor: Pick<AsrAdapterDescriptor, 'hotwordCapabilities'>,
  projectionVersion = asrHotwordProjectionVersion,
): HotwordProjection => {
  const capabilities = descriptor.hotwordCapabilities;
  const included: HotwordProjectionEntry[] = [];
  const capabilityOmitted: HotwordOmittedEntry[] = [];
  let characters = 0;
  let limitReason: AsrHotwordOmissionReason | null = capabilities.supported
    ? null
    : 'adapter_unsupported';
  for (const entry of projection.entries) {
    if (!limitReason && capabilities.maxEntries !== null
      && included.length >= capabilities.maxEntries) {
      limitReason = 'adapter_max_entries';
    }
    if (!limitReason && capabilities.maxCharacters !== null
      && characters + entry.word.length > capabilities.maxCharacters) {
      limitReason = 'adapter_max_characters';
    }
    if (limitReason) {
      capabilityOmitted.push({ ...entry, reasonCode: limitReason });
    } else {
      included.push(entry);
      characters += entry.word.length;
    }
  }
  return {
    entries: included,
    omittedEntries: [...projection.omittedEntries, ...capabilityOmitted]
      .sort((left, right) => left.order - right.order),
    words: included.map((entry) => entry.word),
    summary: summarize(
      included,
      projection.summary.filteredCount,
      capabilityOmitted.length,
      projectionVersion,
    ),
  };
};

export const buildHotwordProjection = async (
  client: PoolClient,
  termVersionId: string,
): Promise<HotwordProjection> => {
  const result = await client.query<{ type: string; name: string; aliases: string[] }>(
    `SELECT type, name, aliases
       FROM term_version_items
      WHERE term_version_id = $1
      ORDER BY sort_order`,
    [termVersionId],
  );
  const seen = new Set<string>();
  const candidates: HotwordProjectionEntry[] = [];
  const omittedEntries: HotwordOmittedEntry[] = [];
  let order = 0;
  const add = (raw: string, source: HotwordProjectionEntry['source'], filtered: boolean) => {
    order += 1;
    const word = raw.trim();
    if (filtered || !word) {
      omittedEntries.push({ order, word: raw, source, reasonCode: 'rule_filtered' });
      return;
    }
    if (seen.has(word)) {
      omittedEntries.push({ order, word: raw, source, reasonCode: 'duplicate_removed' });
      return;
    }
    seen.add(word);
    candidates.push({ order, word, source });
  };
  for (const item of result.rows) {
    add(item.name, 'term', false);
    if (item.type !== '人名') continue;
    for (const rawAlias of item.aliases) {
      const alias = rawAlias.trim();
      add(rawAlias, 'person_alias', !alias || genericAlias.test(alias));
    }
  }
  return {
    entries: candidates,
    omittedEntries,
    words: candidates.map((item) => item.word),
    summary: summarize(candidates, omittedEntries.length, 0),
  };
};
