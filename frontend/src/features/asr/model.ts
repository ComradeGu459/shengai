import type {
  AsrBatchStatus,
  AsrHotwordOmissionReason,
  AsrHotwordReceiptReason,
  AsrHotwordReceiptStatus,
  AsrJobStatus,
  AsrQualityStatus,
  AsrScope,
  AsrUsage,
} from '@qimao-terms-cloud/contracts';

import { AsrApiError } from './api.js';
import { createUuid } from '../../platform/randomUuid.js';

export const batchStatusLabels: Record<AsrBatchStatus, string> = {
  blocked: '已阻断',
  queued: '排队中',
  running: '识别中',
  cancel_requested: '取消请求中',
  partial: '部分完成',
  completed: '已完成',
  reconciliation_required: '需对账',
  failed: '失败',
  cancelled: '已取消',
};

export const jobStatusLabels: Record<AsrJobStatus, string> = {
  queued: '排队中',
  leased: '准备中',
  running: '识别中',
  completed: '已完成',
  failed: '失败',
  cancel_requested: '取消请求中',
  cancelled: '已取消',
  reconciliation_required: '需对账',
};

export const qualityStatusLabels: Record<AsrQualityStatus, string> = {
  pass: '质量通过',
  warning: '质量警告',
  rejected: '结果不可用',
};

export const receiptLabels: Record<AsrHotwordReceiptStatus, string> = {
  simulated: '模拟已应用',
  submitted: '已提交',
  partially_submitted: '部分提交',
  unused: '未使用',
  unsupported: '不支持热词',
  unknown: '回执未知',
};

export const hotwordOmissionReasonLabels: Record<AsrHotwordOmissionReason, string> = {
  rule_filtered: '规则过滤',
  duplicate_removed: '重复项去除',
  adapter_unsupported: '适配器不支持热词',
  adapter_max_entries: '达到适配器条数上限',
  adapter_max_characters: '达到适配器字符上限',
};

export const hotwordReceiptReasonLabels: Record<AsrHotwordReceiptReason, string> = {
  partial_submission: '适配器仅接受部分热词',
  no_confirmed_term_version: '没有已确认术语版本',
  unsupported: '适配器不支持热词',
  unknown: '提交结果未知',
};

export const formatDateTime = (value: string) => new Date(value).toLocaleString('zh-CN', {
  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});

export const formatDuration = (milliseconds: number) => {
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} 分 ${seconds % 60} 秒`;
};

export const formatScope = (scope: Pick<AsrScope, 'kind'> & Partial<{
  episodeNumbers: number[];
  episodeNumber: number;
}>) => {
  if (scope.kind === 'all') return '整剧';
  const episodes = scope.kind === 'single' ? [scope.episodeNumber!] : scope.episodeNumbers ?? [];
  if (episodes.length <= 4) return episodes.map((item) => `第 ${item} 集`).join('、');
  return `${episodes[0]}–${episodes.at(-1)} 集（${episodes.length} 集）`;
};

export const formatUsage = (usages: Array<AsrUsage | null | undefined>) => {
  const present = usages.filter((usage): usage is AsrUsage => Boolean(usage));
  if (!present.length) return '尚未记录';
  if (present.some((usage) => usage.reconciliationStatus === 'pending')) return '处理用量待对账';
  const duration = present.reduce((sum, usage) => sum + usage.mediaDurationMs, 0);
  return `${formatDuration(duration)} · ${present.length} 项已记录`;
};

export const isUnknownAsrResult = (error: unknown) =>
  error instanceof TypeError || (error instanceof AsrApiError && error.retryable);

export const stableIntent = <T extends { signature: string; key: string }>(
  current: T | null,
  signature: string,
) => current?.signature === signature ? current : ({ signature, key: createUuid() } as T);

export interface AsrRuntimeSnapshot {
  provider: string;
  adapter: string;
  model: string;
  language: string;
  configDigest: string;
}

export const formatRuntimeSnapshot = ({ provider, adapter, model }: AsrRuntimeSnapshot) =>
  `${provider} · ${adapter} · ${model}`;
