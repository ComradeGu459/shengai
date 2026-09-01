import type {
  AcceptanceCue,
  AcceptanceEpisode,
  AcceptanceEpisodeStatus,
  AcceptanceIssue,
  AcceptanceSessionStatus,
  AcceptanceTrack,
} from '@qimao-terms-cloud/contracts';

import { SubtitleAcceptanceApiError } from './api.js';
import { createUuid } from '../../platform/randomUuid.js';

export const trackLabels: Record<AcceptanceTrack, string> = {
  dialogue: '台词',
  screen_text: '画面字',
};

export const trackTone: Record<AcceptanceTrack, string> = {
  dialogue: 'dialogue',
  screen_text: 'screen',
};

export const sessionStatusLabels: Record<AcceptanceSessionStatus, string> = {
  draft: '审校中',
  preflighting: '预检中（只读）',
  ready_to_release: '可发布',
  released: '已发布（只读）',
  stale: '来源已失效（只读）',
  blocked: '已阻塞（只读）',
};

export const episodeStatusLabels: Record<AcceptanceEpisodeStatus, string> = {
  not_started: '未开始',
  in_review: '审校中',
  changes_pending: '有修改',
  blocked: '阻塞',
  rework_required: '需返工',
  passed: '已通过',
};

export const issueCodeLabels: Record<string, string> = {
  invalid_time: '时间非法',
  after_video_end: '超出视频',
  empty_text: '空文本',
  track_overlap: '同轨重叠',
  shared_endpoint: '端点贴合',
  duration_too_short: '时长过短',
  duration_too_long: '时长过长',
  gap_too_short: '间隔过短',
  forbidden_markup: '禁用标记',
  hard_punctuation: '硬标点',
  source_missing: '来源缺失',
  video_missing: '视频缺失',
  video_duration_unknown: '视频时长未知',
  screen_text_pair_incomplete: '画面字配对不完整',
  manual: '人工问题',
};

export const formatMs = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const safe = Math.max(0, Math.round(value));
  const milliseconds = safe % 1000;
  const totalSeconds = Math.floor(safe / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const prefix = hours > 0 ? `${String(hours).padStart(2, '0')}:` : '';
  return `${prefix}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

export const parseTimeInput = (value: string) => {
  const text = value.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text);
  const parts = text.split(':');
  const secondText = parts.pop();
  if (!secondText) return null;
  const seconds = Number(secondText);
  if (!Number.isFinite(seconds)) return null;
  const minutes = Number(parts.pop() ?? '0');
  const hours = Number(parts.pop() ?? '0');
  if (![minutes, hours].every(Number.isFinite)) return null;
  return Math.max(0, Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000));
};

export const sortCues = (cues: AcceptanceCue[]) =>
  [...cues].filter((cue) => !cue.deleted).sort((first, second) =>
    first.startMs - second.startMs
    || first.endMs - second.endMs
    || first.ordinal - second.ordinal
    || first.id.localeCompare(second.id),
  );

export const openIssues = (issues: AcceptanceIssue[]) =>
  issues.filter((issue) => issue.status === 'open');

export const hasOpenBlockingIssue = (issues: AcceptanceIssue[]) =>
  openIssues(issues).length > 0;

export const isReadOnlySession = (status: AcceptanceSessionStatus | undefined) =>
  status === 'stale' || status === 'released' || status === 'blocked' || status === 'preflighting';

export const canEpisodePass = (episode: AcceptanceEpisode | undefined, issues: AcceptanceIssue[]) => {
  if (!episode) return false;
  return episode.status !== 'passed'
    && !hasOpenBlockingIssue(issues)
    && episode.openErrorCount === 0
    && episode.openWarningCount === 0
    && Boolean(episode.selectedVideoAssetId)
    && Boolean(episode.authoritativeDurationMs);
};

export const describeVideoRole = (role: 'asr_video' | 'screen_video') =>
  role === 'screen_video' ? '画面字视频' : '中文识别视频';

export const commandKey = (kind: string) => {
  const random = createUuid();
  const slug = kind.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'command';
  return `subtitle-acceptance-${slug}-${random}`;
};

export const stableStringify = (value: unknown) => JSON.stringify(value, Object.keys(flattenKeys(value)).sort(), 2);

const flattenKeys = (value: unknown, keys: Record<string, true> = {}) => {
  if (value && typeof value === 'object') {
    Object.keys(value as Record<string, unknown>).forEach((key) => {
      keys[key] = true;
      flattenKeys((value as Record<string, unknown>)[key], keys);
    });
  }
  return keys;
};

export interface NormalizedCommandError {
  message: string;
  code: string;
  requestId: string | null;
  retryable: boolean;
  deterministic: boolean;
}

export const normalizeCommandError = (error: unknown): NormalizedCommandError => {
  if (error instanceof SubtitleAcceptanceApiError) {
    return {
      message: error.message,
      code: error.code,
      requestId: error.requestId,
      retryable: error.retryable,
      deterministic: !error.retryable && error.status < 500,
    };
  }
  return {
    message: error instanceof Error ? error.message : '请求结果未知，请用同一意图恢复。',
    code: 'NETWORK_UNKNOWN',
    requestId: null,
    retryable: true,
    deterministic: false,
  };
};

export const clampMs = (value: number, durationMs: number | null | undefined) => {
  if (!durationMs) return Math.max(0, value);
  return Math.min(durationMs, Math.max(0, value));
};

export const cuePercent = (value: number, durationMs: number) =>
  `${Math.min(100, Math.max(0, (value / Math.max(1, durationMs)) * 100))}%`;

export const issueLabel = (issue: AcceptanceIssue) =>
  `${issue.severity === 'error' ? '硬错误' : '警告'} · ${issueCodeLabels[issue.code] ?? issue.code}`;

export const statusIsPassed = (episode: AcceptanceEpisode) => episode.status === 'passed';
