import type {
  AsrDispatchAcceptanceStatus,
  AsrDispatchExecutionStatus,
  AsrProjectEligibilityStatus,
} from '@qimao-terms-cloud/contracts';

export const eligibilityLabels: Record<AsrProjectEligibilityStatus, string> = {
  eligible: '可识别',
  missing_terms: '缺术语',
  missing_videos: '缺视频',
  active: '识别中',
  failed: '失败',
  blocked: '已阻断',
};

export const acceptanceLabels: Record<AsrDispatchAcceptanceStatus, string> = {
  accepted: '全部接受',
  partial: '部分接受',
  blocked: '全部阻断',
};

export const executionLabels: Record<AsrDispatchExecutionStatus, string> = {
  queued: '排队中',
  running: '识别中',
  partial: '部分完成',
  completed: '已完成',
  failed: '失败',
  cancel_requested: '取消请求中',
  reconciliation_required: '需对账',
  cancelled: '已取消',
};

export const formatDateTime = (value: string) => new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date(value));
