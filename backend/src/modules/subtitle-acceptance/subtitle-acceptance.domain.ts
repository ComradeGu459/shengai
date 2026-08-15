import { createHash } from 'node:crypto';

import type { AcceptanceCue, AcceptanceIssueCode, AcceptanceTrack } from '@qimao-terms-cloud/contracts';

export const ACCEPTANCE_RULE_VERSION = 'subtitle-acceptance-v1';
export const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
export const stableDigest = (value: unknown) => sha256(JSON.stringify(value));

export interface QualityIssueSeed {
  code: AcceptanceIssueCode;
  severity: 'error' | 'warning';
  track: AcceptanceTrack | null;
  cueId: string | null;
  timeMs: number | null;
  note: string;
}

export const scanAcceptanceQuality = (input: {
  cues: AcceptanceCue[];
  selectedVideoAssetId: string | null;
  durationMs: number | null;
  pairByCueId?: Map<string, { groupId: string; position: string }>;
}): QualityIssueSeed[] => {
  const issues: QualityIssueSeed[] = [];
  const add = (seed: QualityIssueSeed) => issues.push(seed);
  if (!input.selectedVideoAssetId) {
    add({ code: 'video_missing', severity: 'error', track: null, cueId: null, timeMs: null,
      note: '本集没有可用于验收的已校验视频。' });
  } else if (input.durationMs === null) {
    add({ code: 'video_duration_unknown', severity: 'error', track: null, cueId: null, timeMs: null,
      note: '本集视频时长未知，只允许查看，不能通过或发布。' });
  }
  const active = input.cues.filter((cue) => !cue.deleted);
  for (const cue of active) {
    if (cue.startMs < 0 || cue.endMs <= cue.startMs) add({ code: 'invalid_time', severity: 'error', track: cue.track, cueId: cue.id, timeMs: cue.startMs, note: '字幕时间范围无效。' });
    if (input.durationMs !== null && cue.endMs > input.durationMs) add({ code: 'after_video_end', severity: 'error', track: cue.track, cueId: cue.id, timeMs: cue.endMs, note: '字幕晚于视频终点。' });
    if (!cue.text.trim()) add({ code: 'empty_text', severity: 'error', track: cue.track, cueId: cue.id, timeMs: cue.startMs, note: '字幕文本为空。' });
    if (/<[^>]+>|\{\\[^}]+\}/u.test(cue.text)) add({ code: 'forbidden_markup', severity: 'error', track: cue.track, cueId: cue.id, timeMs: cue.startMs, note: '字幕包含禁止的 HTML/ASS 标记。' });
    if (/[，。！？,.?!]/u.test(cue.text)) add({ code: 'hard_punctuation', severity: 'error', track: cue.track, cueId: cue.id, timeMs: cue.startMs, note: '普通字幕包含硬标点。' });
    const duration = cue.endMs - cue.startMs;
    if (duration < 80) add({ code: 'duration_too_short', severity: 'warning', track: cue.track, cueId: cue.id, timeMs: cue.startMs, note: '字幕持续时间短于 80ms。' });
    if (duration > 12_000) add({ code: 'duration_too_long', severity: 'warning', track: cue.track, cueId: cue.id, timeMs: cue.startMs, note: '字幕持续时间超过 12 秒。' });
  }
  for (const track of ['dialogue', 'screen_text'] as const) {
    const cues = active.filter((cue) => cue.track === track).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs || a.id.localeCompare(b.id));
    for (let index = 1; index < cues.length; index += 1) {
      const previous = cues[index - 1]!;
      const current = cues[index]!;
      if (previous.endMs > current.startMs) add({ code: 'track_overlap', severity: 'error', track, cueId: current.id, timeMs: current.startMs, note: '同轨字幕发生重叠。' });
      else if (previous.endMs === current.startMs) add({ code: 'shared_endpoint', severity: 'warning', track, cueId: current.id, timeMs: current.startMs, note: '相邻字幕共用端点。' });
      else if (current.startMs - previous.endMs < 80) add({ code: 'gap_too_short', severity: 'warning', track, cueId: current.id, timeMs: current.startMs, note: '相邻字幕间隔短于 80ms。' });
    }
  }
  const pairs = new Map<string, Set<string>>();
  for (const cue of active) {
    const pair = input.pairByCueId?.get(cue.id);
    if (!pair) continue;
    const positions = pairs.get(pair.groupId) ?? new Set<string>();
    positions.add(pair.position);
    pairs.set(pair.groupId, positions);
  }
  for (const positions of pairs.values()) {
    if (positions.size !== 2 || !positions.has('left') || !positions.has('right')) {
      add({ code: 'screen_text_pair_incomplete', severity: 'error', track: 'screen_text', cueId: null, timeMs: null, note: '左右同屏画面字必须成对保留。' });
    }
  }
  return issues;
};

export const acceptanceSignature = (episode: { selectedVideoAssetId: string | null; authoritativeDurationMs: number | null }, cues: AcceptanceCue[]) => stableDigest({
  video: episode.selectedVideoAssetId,
  duration: episode.authoritativeDurationMs,
  cues: cues.filter((cue) => !cue.deleted).map(({ id, track, ordinal, startMs, endMs, text, revision }) => ({ id, track, ordinal, startMs, endMs, text, revision })),
});
