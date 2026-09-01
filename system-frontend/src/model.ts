import type {
  SystemControlCost,
  SystemControlOverview,
  SystemControlResourcePool,
  SystemControlResourcePoolId,
  SystemControlStatus,
  SystemControlTrendPoint,
} from '@qimao-terms-cloud/contracts';

export const NAV_ITEMS = [
  ['overview', '系统总览', 'grid'],
  ['engines', '引擎与 API', 'cpu'],
  ['routing', '路由与调度', 'route'],
  ['servers', '服务器与运行环境', 'server'],
  ['strategy', '策略与学习', 'learn'],
  ['budgets', '预算与限额', 'budget'],
  ['logs', '日志与质量', 'log'],
  ['secrets', '密钥与安全', 'lock'],
  ['changes', '变更与审计', 'audit'],
  ['feedback', '反馈问题', 'audit'],
] as const;

export type NavId = typeof NAV_ITEMS[number][0];

export const POOL_LABELS: Record<SystemControlResourcePoolId, { name: string; icon: string }> = {
  asr_api: { name: 'ASR API', icon: 'cpu' },
  ocr_api: { name: 'OCR API', icon: 'cpu' },
  ocr_self_hosted_worker: { name: 'OCR 自建 Worker', icon: 'server' },
  delivery_generation: { name: '交付生成', icon: 'route' },
};

export const STATUS_LABELS: Record<SystemControlStatus, string> = {
  healthy: '正常',
  degraded: '需关注',
  failed: '失败',
  empty: '暂无事实',
  unknown: '未知',
  not_configured: '未配置',
};

export const statusTone = (status: SystemControlStatus) => {
  if (status === 'healthy') return 'healthy';
  if (status === 'failed') return 'danger';
  if (status === 'degraded') return 'warning';
  return 'neutral';
};

export const formatCount = (value: number) => new Intl.NumberFormat('zh-CN').format(value);

export const formatBytes = (value: number) => {
  if (value < 1024) return `${formatCount(value)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let amount = value;
  let unit = units[0];
  for (const next of units) {
    amount /= 1024;
    unit = next;
    if (amount < 1024 || next === units.at(-1)) break;
  }
  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${unit}`;
};

export const formatMoney = (cost: SystemControlCost) => {
  if (cost.pendingCount > 0) return '待对账';
  if (cost.unknownCount > 0) return '未知';
  const final = cost.byCurrency.find((item) => item.finalAmount !== null);
  const estimated = cost.byCurrency.find((item) => item.estimatedAmount !== null);
  const amount = final?.finalAmount ?? estimated?.estimatedAmount;
  if (amount === undefined) return '暂无事实';
  return `${final?.currency ?? estimated?.currency ?? ''} ${amount}`.trim();
};

export const formatTime = (iso: string | null) => {
  if (!iso) return '暂无观测';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleTimeString('zh-CN', { hour12: false });
};

export const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false });
};

export const poolMetricLabel = (pool: SystemControlResourcePool) => pool.id === 'ocr_self_hosted_worker' ? '运行环境' : '吞吐';

export const poolMetricValue = (pool: SystemControlResourcePool) => {
  if (pool.id === 'ocr_self_hosted_worker') {
    return pool.telemetry.status === 'unknown' ? '未知' : `${pool.telemetry.gpuPercent ?? '未知'}%`;
  }
  return pool.status === 'empty' ? '暂无事实' : `${formatCount(pool.throughput)} / 小时`;
};

export const pointValues = (points: SystemControlTrendPoint[]) => points.map((point) => point.hasFact ? point.value : null);

export const overallLabel = (overview: SystemControlOverview) => STATUS_LABELS[overview.overallStatus];
