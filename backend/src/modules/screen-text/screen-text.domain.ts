import { createHash } from 'node:crypto';

import type {
  ScreenTextAdapterDescriptor,
  ScreenTextAdapterTermEntry,
} from './screen-text.adapter.js';

export const stableHash = (value: unknown) => createHash('sha256')
  .update(JSON.stringify(value, (_key, item) => {
    if (Array.isArray(item)) return item;
    if (item && typeof item === 'object') return Object.fromEntries(
      Object.entries(item).sort(([left], [right]) => left.localeCompare(right)),
    );
    return item;
  }))
  .digest('hex');

export const normalizeEpisodeNumbers = (numbers: number[]) => [...new Set(numbers)].sort((a, b) => a - b);

export const descriptorSnapshot = (descriptor: ScreenTextAdapterDescriptor) => ({
  kind: descriptor.kind,
  adapter: descriptor.adapter,
  provider: descriptor.provider,
  model: descriptor.model,
  language: descriptor.language,
  deployment: descriptor.deployment,
  inputVersion: descriptor.inputVersion,
  outputVersion: descriptor.outputVersion,
  configDigest: descriptor.configDigest,
  capabilities: descriptor.capabilities,
});

export const buildTermProjection = (rows: Array<{
  id: string;
  type: string;
  name: string;
  aliases: unknown;
  note: string;
}>) => {
  const entries: ScreenTextAdapterTermEntry[] = [];
  const seen = new Set<string>();
  let normalizedCount = 0;
  let duplicateCount = 0;
  for (const row of rows) {
    const aliases = Array.isArray(row.aliases)
      ? row.aliases.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
      : [];
    const canonicalName = row.name.trim();
    normalizedCount += 1 + aliases.length;
    const key = canonicalName.toLocaleLowerCase('zh-CN');
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    const uniqueAliases = aliases.filter((alias) => {
      const aliasKey = alias.toLocaleLowerCase('zh-CN');
      if (seen.has(aliasKey)) {
        duplicateCount += 1;
        return false;
      }
      seen.add(aliasKey);
      return true;
    });
    entries.push({
      itemId: row.id,
      type: row.type,
      canonicalName,
      aliases: uniqueAliases,
      identityEvidence: row.note.trim() ? [row.note.trim()] : [],
    });
  }
  const digest = stableHash(entries);
  return {
    entries,
    summary: {
      version: 'screen-text-terms-v1',
      digest,
      includedCount: entries.length,
      normalizedCount,
      deduplicatedCount: duplicateCount,
      omittedCount: 0,
      omissionReasons: [],
    },
  };
};

const pad = (value: number, length: number) => String(value).padStart(length, '0');

export const formatSrtTime = (milliseconds: number) => {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds % 1_000, 3)}`;
};

export const renderScreenTextSrt = (cues: Array<{ startMs: number; endMs: number; text: string }>) => {
  const body = cues.map((cue, index) => [
    String(index + 1),
    `${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}`,
    cue.text,
  ].join('\r\n')).join('\r\n\r\n');
  return Buffer.from(`\uFEFF${body}${body ? '\r\n' : ''}`, 'utf8');
};
