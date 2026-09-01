import type { TaskStatus, TaskType } from '@qimao-terms-cloud/contracts';

export const taskTypeLabels: Record<TaskType, string> = {
  asr_dispatch: '多项目中文识别',
  asr_batch: '中文识别批次',
  screen_text_batch: '画面字识别批次',
  term_extraction: '术语提取',
  pre_review_preparation: '前置审改准备',
  delivery_generation: '交付产品生成',
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  queued: '排队中',
  running: '运行中',
  waiting_review: '待处理',
  completed: '已完成',
  failed: '失败',
  cancel_requested: '取消中',
  cancelled: '已取消',
  reconciliation_required: '待对账',
  stale: '已过期',
  unknown: '状态待确认',
};

export const actionLabels: Record<string, string> = {
  cancel: '取消任务',
  recover: '恢复本次交付',
  open_workspace: '打开工作台',
};

export const statusTone = (status: TaskStatus) => {
  if (status === 'completed') return 'success';
  if (status === 'failed' || status === 'reconciliation_required' || status === 'stale') return 'danger';
  if (status === 'running' || status === 'queued' || status === 'cancel_requested') return 'info';
  if (status === 'waiting_review') return 'warning';
  return 'neutral';
};

export const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间待确认' : date.toLocaleString('zh-CN', { hour12: false });
};

export const formatProgress = (completed: number | null, total: number | null, phase: string | null) => {
  if (completed !== null && total !== null && total > 0) return `${completed}/${total} 项`;
  return phase ? '执行中' : '进度未知';
};
