import { createHash } from 'node:crypto';

import { termInvalid } from './term-errors.js';

export interface ParsedTermCue {
  id: string;
  assetId: string;
  episodeNumber: number;
  cueIndex: number;
  startMs: number;
  endMs: number;
  text: string;
}

const parseTimestamp = (value: string) => {
  const match = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/.exec(value);
  if (!match) return null;
  const [, hours, minutes, seconds, milliseconds] = match;
  const hour = Number(hours);
  const minute = Number(minutes);
  const second = Number(seconds);
  if (minute > 59 || second > 59) return null;
  return (((hour * 60) + minute) * 60 + second) * 1_000 + Number(milliseconds);
};

const cueError = (fileName: string, cueLabel: string, message: string) =>
  termInvalid('TERM_SRT_INVALID', `${fileName} 的第 ${cueLabel} 轴无效：${message}`, 'replace_source_srt');

export const parseSrt = (input: {
  bytes: Uint8Array;
  assetId: string;
  episodeNumber: number;
  fileName: string;
}): ParsedTermCue[] => {
  let decoded: string;
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(input.bytes);
  } catch {
    throw termInvalid(
      'TERM_SRT_INVALID',
      `${input.fileName} 不是有效的 UTF-8 SRT 文件。`,
      'replace_source_srt',
    );
  }
  const normalized = decoded.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) throw cueError(input.fileName, '1', '字幕文件为空');
  const blocks = normalized.split(/\n{2,}/);
  const seen = new Set<number>();
  return blocks.map((block, blockIndex) => {
    const lines = block.split('\n');
    const cueIndex = Number(lines[0]);
    const label = Number.isInteger(cueIndex) && cueIndex > 0 ? String(cueIndex) : String(blockIndex + 1);
    if (!Number.isInteger(cueIndex) || cueIndex < 1) throw cueError(input.fileName, label, '轴号必须是正整数');
    if (seen.has(cueIndex)) throw cueError(input.fileName, label, '轴号重复');
    seen.add(cueIndex);
    const timing = /^(\S+)\s+-->\s+(\S+)$/.exec(lines[1] ?? '');
    if (!timing) throw cueError(input.fileName, label, '缺少合法的时间范围');
    const startMs = parseTimestamp(timing[1]!);
    const endMs = parseTimestamp(timing[2]!);
    if (startMs === null || endMs === null || endMs <= startMs) {
      throw cueError(input.fileName, label, '起止时间格式错误或结束时间不晚于开始时间');
    }
    const text = lines.slice(2).join('\n').trim();
    if (!text) throw cueError(input.fileName, label, '字幕原文为空');
    const id = createHash('sha256').update([
      input.assetId,
      input.episodeNumber,
      cueIndex,
      startMs,
      endMs,
      text,
    ].join('\n')).digest('hex');
    return {
      id,
      assetId: input.assetId,
      episodeNumber: input.episodeNumber,
      cueIndex,
      startMs,
      endMs,
      text,
    };
  });
};
