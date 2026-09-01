import type { DeliveryFile, DeliveryProduct, DeliveryProductStatus } from '@qimao-terms-cloud/contracts';
import { createUuid } from '../../platform/randomUuid.js';

export const deliveryStatusLabels: Record<DeliveryProductStatus, string> = {
  preparing: '生成中',
  ready: '已就绪',
  generation_failed: '生成失败',
  recycled: '已回收',
};

export const deliveryStatusTone: Record<DeliveryProductStatus, string> = {
  preparing: 'processing',
  ready: 'success',
  generation_failed: 'danger',
  recycled: 'muted',
};

export const fileKindLabels = {
  dialogue_srt: '台词字幕',
  screen_text_srt: '画面字字幕',
  terms_xlsx: '术语表',
} as const;

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false });
};

export const shortId = (value: string) => value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;

export const sourceId = (value: string | null | undefined) => value ? shortId(value) : '未绑定';

export const fileGroups = (files: DeliveryFile[]) => [
  { kind: 'dialogue_srt' as const, label: fileKindLabels.dialogue_srt, files: files.filter((file) => file.kind === 'dialogue_srt') },
  { kind: 'screen_text_srt' as const, label: fileKindLabels.screen_text_srt, files: files.filter((file) => file.kind === 'screen_text_srt') },
  { kind: 'terms_xlsx' as const, label: fileKindLabels.terms_xlsx, files: files.filter((file) => file.kind === 'terms_xlsx') },
];

export const fileSummary = (product: DeliveryProduct) => {
  const summary = product.fileSummary;
  return `${summary.dialogueEpisodes} 集台词 · ${summary.screenTextNonEmptyEpisodes}/${summary.screenTextEpisodes} 集画面字 · ${summary.termCount} 条术语`;
};

export const commandKey = (kind: string) => {
  const random = createUuid();
  return `delivery-${kind}-${random}`;
};

export const stableIntentStorageKey = (projectId: string, sessionId: string) =>
  `qimao-delivery-intent:${projectId}:${sessionId}`;

export const isDeliveryStatus = (value: string | null): value is DeliveryProductStatus =>
  value === 'preparing' || value === 'ready' || value === 'generation_failed' || value === 'recycled';
