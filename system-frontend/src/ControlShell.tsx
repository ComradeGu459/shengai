import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  SystemControlCostTrendPoint,
  SystemControlOverview,
  SystemControlResourcePool,
  SystemControlTrendPoint,
} from '@qimao-terms-cloud/contracts';

import { fetchSystemControlOverview, type SystemControlReadError } from './api.js';
import {
  NAV_ITEMS,
  POOL_LABELS,
  STATUS_LABELS,
  formatBytes,
  formatCount,
  formatDateTime,
  formatMoney,
  formatTime,
  pointValues,
  poolMetricLabel,
  poolMetricValue,
  statusTone,
  type NavId,
} from './model.js';
import { ControlRefreshProvider } from './controlRefresh.js';

type IconName = 'grid' | 'cpu' | 'route' | 'server' | 'learn' | 'budget' | 'log' | 'lock' | 'audit' | 'search' | 'bell' | 'refresh' | 'chevron' | 'menu' | 'alert' | 'pause';

const iconPaths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m12 0h4M2 15h4m12 0h4" /></>,
  route: <><circle cx="5" cy="5" r="2" /><circle cx="19" cy="7" r="2" /><circle cx="19" cy="19" r="2" /><path d="M7 5h4a4 4 0 0 1 4 4v6a4 4 0 0 0 4 4M15 11a4 4 0 0 1 4-4" /></>,
  server: <><rect x="3" y="3" width="18" height="7" rx="2" /><rect x="3" y="14" width="18" height="7" rx="2" /><path d="M7 6.5h.01M7 17.5h.01M11 6.5h7M11 17.5h7" /></>,
  learn: <><path d="M12 3a7 7 0 0 0-4 12.7V20l4-2 4 2v-4.3A7 7 0 0 0 12 3Z" /><path d="m9 10 2 2 4-4" /></>,
  budget: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M16 9h5v6h-5a3 3 0 0 1 0-6ZM7 9h4" /></>,
  log: <><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  audit: <><path d="M4 4h12v16H4zM8 8h5M8 12h5M8 16h3" /><circle cx="18" cy="17" r="3" /><path d="m20 19 2 2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  alert: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  pause: <><path d="M8 5v14M16 5v14" /></>,
};

const Icon = ({ name, className = '' }: { name: IconName; className?: string }) => (
  <svg className={className} aria-hidden="true" viewBox="0 0 24 24"><>{iconPaths[name]}</></svg>
);

type ReadState = {
  data: SystemControlOverview | null;
  error: SystemControlReadError | null;
  loading: boolean;
  refreshing: boolean;
  lastSuccessAt: string | null;
};

const initialState: ReadState = { data: null, error: null, loading: true, refreshing: false, lastSuccessAt: null };

const useOverview = (autoRefresh: boolean) => {
  const [state, setState] = useState<ReadState>(initialState);
  const requestNumber = useRef(0);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const request = requestNumber.current + 1;
    requestNumber.current = request;
    setState((previous) => ({ ...previous, loading: previous.data === null, refreshing: previous.data !== null, error: null }));
    try {
      const data = await fetchSystemControlOverview();
      if (!mounted.current || request !== requestNumber.current) return;
      const now = new Date().toISOString();
      setState({ data, error: null, loading: false, refreshing: false, lastSuccessAt: now });
    } catch (caught) {
      if (!mounted.current || request !== requestNumber.current) return;
      const error = caught as SystemControlReadError;
      setState((previous) => ({ ...previous, loading: false, refreshing: false, error }));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; };
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => { void load(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  return { ...state, reload: load };
};

const StatusPill = ({ status, label }: { status: SystemControlResourcePool['status']; label?: string }) => (
  <span className={`status-pill ${statusTone(status)}`}><i className="status-dot" />{label ?? STATUS_LABELS[status]}</span>
);

const ErrorBanner = ({ error, stale, onRetry, refreshing }: { error: SystemControlReadError; stale: boolean; onRetry: () => void; refreshing: boolean }) => (
  <div className={`state-banner ${stale ? 'warning' : 'error'}`} role="alert">
    <Icon name={stale ? 'refresh' : 'alert'} />
    <div className="banner-copy">
      <strong>{stale ? '数据已过期' : '状态暂时无法确认'}</strong>
      <span>{error.message}</span>
    </div>
    {stale ? null : <button className="primary-button" type="button" onClick={onRetry} disabled={refreshing}>{refreshing ? '读取中…' : '重新读取'}</button>}
  </div>
);

const PoolCard = ({ pool }: { pool: SystemControlResourcePool }) => {
  const identity = pool.identities[0];
  const config = pool.configuration.status === 'not_configured' ? '未配置' : pool.configuration.version ?? '未知';
  const accepting = pool.configuration.acceptingNewTasks === null ? '未验证' : pool.configuration.acceptingNewTasks ? '是' : '否';
  return (
    <article className={`resource-pool ${pool.status === 'failed' ? 'failed' : ''}`} data-testid={`pool-${pool.id}`}>
      <div className="pool-head"><Icon name={POOL_LABELS[pool.id].icon as IconName} /><strong>{POOL_LABELS[pool.id].name}</strong><StatusPill status={pool.status} /></div>
      <div className="pool-metrics">
        <Metric label="排队" value={pool.status === 'empty' ? '暂无事实' : formatCount(pool.queueDepth)} />
        <Metric label="运行" value={pool.status === 'empty' ? '暂无事实' : formatCount(pool.runningCount)} />
        <Metric label={poolMetricLabel(pool)} value={poolMetricValue(pool)} />
        <Metric label="今日错误" value={pool.status === 'empty' ? '暂无事实' : formatCount(pool.errorCount)} />
        <Metric label="费用 / 用量" value={formatMoney(pool.cost)} />
        <Metric label="配置版本" value={config} />
      </div>
      <div className="pool-foot"><span>接收新任务：<b>{accepting}</b></span><span>{identity ? `${identity.jobCount} 条身份事实` : '暂无身份事实'}</span></div>
    </article>
  );
};

const Metric = ({ label, value, tone = '' }: { label: string; value: string; tone?: string }) => (
  <div className="pool-metric"><span>{label}</span><strong className={tone}>{value}</strong></div>
);

const metricValue = (value: number, suffix = '') => `${formatCount(value)}${suffix}`;

type TrendMetric = 'throughput' | 'queueDepth' | 'cost';

const TREND_OPTIONS: Array<{ id: TrendMetric; label: string; fullLabel: string; color: string }> = [
  { id: 'throughput', label: '吞吐', fullLabel: '任务吞吐 · 集 / 小时', color: '#446ef0' },
  { id: 'queueDepth', label: '积压', fullLabel: '队列积压 · 集', color: '#0fa6b8' },
  { id: 'cost', label: '费用', fullLabel: '调用费用 · 服务端金额', color: '#e99123' },
];

const useCompactViewport = () => {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1180px)').matches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(max-width: 1180px)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return compact;
};

const LineChart = ({ points, color, label, cost = false, testId }: { points: SystemControlTrendPoint[] | SystemControlCostTrendPoint[]; color: string; label: string; cost?: boolean; testId?: string }) => {
  const values = points.map((point) => {
    if (!point.hasFact) return null;
    if (cost) {
      const amount = (point as SystemControlCostTrendPoint).cost.byCurrency[0]?.finalAmount ?? (point as SystemControlCostTrendPoint).cost.byCurrency[0]?.estimatedAmount;
      return amount === undefined ? null : Number(amount);
    }
    return (point as SystemControlTrendPoint).value;
  });
  const finite = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const max = finite.length ? Math.max(...finite) : 1;
  const min = finite.length ? Math.min(...finite) : 0;
  const range = max - min || 1;
  const segments: string[] = [];
  let current: string[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (current.length) segments.push(current.join(' '));
      current = [];
      return;
    }
    const x = 8 + (index / Math.max(values.length - 1, 1)) * 264;
    const y = 126 - ((value - min) / range) * 94;
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (current.length) segments.push(current.join(' '));
  return (
    <div className="chart-panel" data-testid={testId}>
      <div className="chart-heading"><strong>{label}</strong><span>最近 24 小时</span></div>
      <div className="chart-legend"><span style={{ color }}><i className="legend-line" />服务端事实</span></div>
      {segments.length ? <svg className="chart-canvas" viewBox="0 0 280 150" role="img" aria-label={`${label}趋势`}><path className="chart-grid" d="M8 30H272M8 62H272M8 94H272M8 126H272M8 30V126M74 30V126M140 30V126M206 30V126M272 30V126" />{segments.map((segment, index) => <polyline key={index} points={segment} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />)}<text className="chart-axis" x="8" y="145">00:00</text><text className="chart-axis" x="128" y="145">12:00</text><text className="chart-axis" x="246" y="145">24:00</text></svg> : <div className="chart-empty">暂无可绘制事实</div>}
    </div>
  );
};

const trendPoints = (overview: SystemControlOverview, metric: TrendMetric) => {
  if (metric === 'throughput') return { points: overview.trends.throughput, cost: false };
  if (metric === 'queueDepth') return { points: overview.trends.queueDepth, cost: false };
  return { points: overview.trends.cost, cost: true };
};

const TrendPanel = ({ overview, compact }: { overview: SystemControlOverview; compact: boolean }) => {
  const [activeMetric, setActiveMetric] = useState<TrendMetric>('throughput');
  const selected = TREND_OPTIONS.find((option) => option.id === activeMetric) ?? TREND_OPTIONS[0]!;
  const selectedTrend = trendPoints(overview, selected.id);
  return (
    <section className="panel trend-panel" data-testid="trend-panel" data-layout={compact ? 'compact' : 'desktop'}>
      <div className="panel-head"><div><h2>趋势分析</h2><p>最近 24 小时 · 缺失数据保留断点，不前端补零</p></div></div>
      {compact ? <div className="trend-compact" data-testid="trend-compact">
        <div className="trend-switcher" role="tablist" aria-label="趋势指标">
          {TREND_OPTIONS.map((option) => <button className="trend-switch" type="button" role="tab" key={option.id} aria-selected={activeMetric === option.id} aria-pressed={activeMetric === option.id} onClick={() => setActiveMetric(option.id)} data-testid={`trend-switch-${option.id}`}>{option.label}</button>)}
        </div>
        <LineChart points={selectedTrend.points} color={selected.color} label={selected.fullLabel} cost={selectedTrend.cost} testId="trend-chart" />
      </div> : <div className="trend-grid" data-testid="trend-desktop">
        <LineChart points={overview.trends.throughput} color="#446ef0" label="任务吞吐 · 集 / 小时" testId="trend-chart-throughput" />
        <LineChart points={overview.trends.queueDepth} color="#0fa6b8" label="队列积压 · 集" testId="trend-chart-queueDepth" />
        <LineChart points={overview.trends.cost} color="#e99123" label="调用费用 · 服务端金额" cost testId="trend-chart-cost" />
      </div>}
    </section>
  );
};

const AnomalyQueue = ({ overview }: { overview: SystemControlOverview }) => (
  <section className="panel anomaly-panel">
    <div className="panel-head"><div><h2>异常处理队列</h2><p>按严重度、发生时间与影响范围排序</p></div><span className="panel-count">{formatCount(overview.anomalies.length)} 条</span></div>
    {overview.anomalies.length === 0 ? <EmptyState title="当前没有待处理异常" detail="新异常会按服务端事实进入此处。" /> : <ul className="anomaly-list">{overview.anomalies.map((anomaly) => <li className="anomaly-row" key={anomaly.id}><span className={`severity ${anomaly.severity === 'error' ? 'high' : 'warning'}`}>{anomaly.severity === 'error' ? '高' : '预警'}</span><div className="anomaly-copy"><strong>{anomaly.message}</strong><div className="anomaly-meta"><span>{formatDateTime(anomaly.occurredAt)}</span><span>{POOL_LABELS[anomaly.resourcePool].name}</span><code>{anomaly.requestId ?? '无 requestId'}</code></div></div><button className="compact-action" type="button" disabled>查看详情</button></li>)}</ul>}
  </section>
);

const PendingConfiguration = ({ overview }: { overview: SystemControlOverview }) => (
  <section className="panel">
    <div className="panel-head"><div><h2>待发布配置</h2><p>服务端当前未提供可发布配置事实</p></div><span className="panel-count">{formatCount(overview.pendingConfiguration.items.length)} 项</span></div>
    {overview.pendingConfiguration.items.length === 0 ? <EmptyState title="暂无待发布变化" detail={overview.pendingConfiguration.status === 'not_configured' ? '配置发布读取尚未纳管。' : '当前没有待处理配置。'} /> : <ul className="config-list">{overview.pendingConfiguration.items.map((item) => <li className="config-row" key={item.name}><div><strong>{item.name}</strong><div className="row-meta">{STATUS_LABELS[item.status]}</div></div><button className="compact-action" type="button" disabled>只读</button></li>)}</ul>}
  </section>
);

const RecentAudit = ({ overview }: { overview: SystemControlOverview }) => (
  <section className="panel">
    <div className="panel-head"><div><h2>最近变更审计</h2><p>不可覆盖的审计事实</p></div></div>
    {overview.recentAudit.items.length === 0 ? <EmptyState title="暂无审计记录" detail={overview.recentAudit.status === 'not_configured' ? '审计读取尚未纳管。' : '当前窗口没有审计事实。'} /> : <ul className="audit-list">{overview.recentAudit.items.map((item) => <li className="audit-row" key={item.id}><div><span className="audit-type">记录</span><strong>{item.result}</strong><div className="row-meta">{formatDateTime(item.occurredAt)}</div></div></li>)}</ul>}
  </section>
);

const EmptyState = ({ title, detail }: { title: string; detail: string }) => <div className="empty-state"><strong>{title}</strong><span>{detail}</span></div>;

const StateBanner = ({ overview, autoRefresh, onEnable }: { overview: SystemControlOverview; autoRefresh: boolean; onEnable: () => void }) => {
  const unknownTelemetry = overview.resourcePools.some((pool) => pool.telemetry.status === 'unknown');
  if (!autoRefresh) return <div className="state-banner info" role="status"><Icon name="pause" /><div className="banner-copy"><strong>自动刷新已关闭</strong><span>页面保留最后一次服务端摘要；执行动作前需要重新读取权威事实。</span></div><button className="secondary-button" type="button" onClick={onEnable}>开启自动刷新</button></div>;
  if (unknownTelemetry) return <div className="state-banner warning" role="status"><Icon name="alert" /><div className="banner-copy"><strong>部分运行指标暂时未知</strong><span>任务执行事实可用；运行环境监控摘要缺失，未知项不会按 0 计算。</span></div></div>;
  return null;
};

const LoadingOverview = () => (
  <>
    <div className="page-head"><div><div className="skeleton title-skeleton" /><div className="skeleton copy-skeleton" /></div></div>
    <section className="runtime-band"><div className="runtime-heading"><h2>系统运行带</h2><span>读取服务端事实…</span></div><div className="pool-grid">{[1, 2, 3, 4].map((item) => <article className="resource-pool loading-pool" key={item}><div className="pool-head"><div className="skeleton icon-skeleton" /><div className="skeleton text-skeleton" /></div><div className="pool-metrics">{[1, 2, 3, 4, 5, 6].map((metric) => <div className="pool-metric" key={metric}><div className="skeleton text-skeleton" /><div className="skeleton value-skeleton" /></div>)}</div></article>)}</div></section>
    <div className="metric-strip">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div className="metric-cell" key={item}><div className="skeleton text-skeleton" /><div className="skeleton value-skeleton" /></div>)}</div>
  </>
);

const OverviewPage = ({ overview, compactViewport, autoRefresh, onEnableAutoRefresh }: { overview: SystemControlOverview; compactViewport: boolean; autoRefresh: boolean; onEnableAutoRefresh: () => void }) => {
  const storage = overview.metrics.storage;
  const metrics = [
    ['处理项目', metricValue(overview.metrics.processedProjectCount)],
    ['处理集', metricValue(overview.metrics.processedEpisodeCount)],
    ['当前运行', metricValue(overview.metrics.runningCount)],
    ['失败', metricValue(overview.metrics.failedCount)],
    ['需对账', metricValue(overview.metrics.reconciliationRequiredCount)],
    ['今日调用费用', formatMoney(overview.metrics.cost)],
    ['本月预算', overview.metrics.budget.status === 'not_configured' ? '未配置' : formatMoney({ byCurrency: overview.metrics.budget.byCurrency, pendingCount: 0, unknownCount: 0 })],
    ['存储使用', storage.status === 'unknown' ? `${formatBytes(storage.assetBytes)} · 容量未知` : formatBytes(storage.assetBytes)],
  ];
  return <>
    <header className="page-head"><div><h1 tabIndex={-1}>系统总览</h1><p>跨引擎、任务、费用和运行环境的统一事实面；所有管理动作仍由所属模块负责。</p></div><div className="page-actions"><button className="secondary-button" type="button" onClick={onEnableAutoRefresh}>立即刷新</button><button className="secondary-button" type="button" disabled>待发布变化</button></div></header>
    <StateBanner overview={overview} autoRefresh={autoRefresh} onEnable={onEnableAutoRefresh} />
    <section className="runtime-band"><div className="runtime-heading"><h2>系统运行带</h2><span>四个资源池独立汇总 · 服务端窗口 {overview.window}</span></div><div className="pool-grid">{overview.resourcePools.map((pool) => <PoolCard key={pool.id} pool={pool} />)}</div></section>
    <section className="metric-strip" aria-label="运行指标">{metrics.map(([label, value]) => <div className="metric-cell" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    <div className="overview-lower"><TrendPanel overview={overview} compact={compactViewport} /><div className="ops-grid"><AnomalyQueue overview={overview} /><div className="right-stack"><PendingConfiguration overview={overview} /><RecentAudit overview={overview} /></div></div></div>
  </>;
};

type SummaryStatus = SystemControlOverview['overallStatus'];

const SUMMARY_COPY: Record<SummaryStatus, { title: string; explanation: string; action: string }> = {
  healthy: { title: '系统运行正常', explanation: '当前处理链路可用，没有需要管理员介入的系统问题。', action: '无需处理' },
  degraded: { title: '有事项需要处理', explanation: '当前工作仍可继续，但存在服务端确认的待处理事项。', action: '处理当前问题' },
  failed: { title: '当前处理受阻', explanation: '当前处理链路存在已确认故障，至少一项工作无法继续。', action: '处理当前问题' },
  empty: { title: '当前没有处理任务', explanation: '当前没有正在执行或等待系统处理的任务。', action: '等待新任务' },
  unknown: { title: '状态暂时无法确认', explanation: '服务端缺少判断整体状态所需的当前事实。', action: '重新读取' },
  not_configured: { title: '关键能力尚未接入', explanation: '当前工作所必需的处理能力尚未完成配置。', action: '查看接入详情' },
};

const summaryStatus = (overview: SystemControlOverview, stale: boolean): SummaryStatus => {
  if (stale || !overview.freshness || !overview.overallStatus || overview.freshness.status === 'unknown') return 'unknown';
  return overview.overallStatus;
};

const summaryAnomalyLabel = (kind: SystemControlOverview['anomalies'][number]['kind']) => kind === 'failed' ? '当前任务处理失败' : kind === 'reconciliation_required' ? '处理结果需要确认' : '当前任务等待恢复';

const SummaryOverview = ({ overview, stale, onRetry, onNavigate }: { overview: SystemControlOverview; stale: boolean; onRetry: () => void; onNavigate?: ((id: NavId) => void) | undefined }) => {
  const status = summaryStatus(overview, stale);
  const copy = SUMMARY_COPY[status];
  const knownCounts = !stale && (overview.freshness.status === 'fresh' || overview.freshness.status === 'empty');
  const count = (value: number) => knownCounts ? formatCount(value) : '未知';
  const causes = [...overview.anomalies].sort((left, right) => (left.severity === right.severity ? right.occurredAt.localeCompare(left.occurredAt) : left.severity === 'error' ? -1 : 1)).slice(0, 3);
  const goNext = () => {
    if (status === 'unknown') onRetry();
    else if (status === 'not_configured') onNavigate?.('engines');
    else if (status === 'failed' || status === 'degraded') onNavigate?.('logs');
  };
  return <>
    <header className="page-head"><div><h1 tabIndex={-1}>系统总览</h1><p>最近读取：{formatDateTime(overview.generatedAt)}</p></div></header>
    <section className={`state-banner summary-status ${statusTone(status)}`} role="status" aria-label="系统状态"><Icon name={status === 'healthy' || status === 'empty' ? 'grid' : status === 'unknown' ? 'refresh' : 'alert'} /><div className="banner-copy"><strong>{copy.title}</strong><span>{copy.explanation}</span></div>{status === 'healthy' || status === 'empty' ? <strong>{copy.action}</strong> : <button className="primary-button" type="button" onClick={goNext}>{copy.action}</button>}</section>
    <section className="panel" aria-label="最近 24 小时处理量"><div className="panel-head"><div><h2>最近 24 小时处理量</h2></div><span className="panel-count">窗口 {overview.window}</span></div><p className="summary-throughput">最近 24 小时处理 {count(overview.metrics.processedProjectCount)} 个项目 / {count(overview.metrics.processedEpisodeCount)} 集 · 正在处理 {count(overview.metrics.runningCount)} · 等待系统处理 {count(overview.metrics.queuedCount)}</p></section>
    <section className="panel anomaly-panel" aria-label="当前需要管理员处理的原因"><div className="panel-head"><div><h2>当前需要处理的原因</h2></div><span className="panel-count">{causes.length} 条</span></div>{causes.length ? <ul className="anomaly-list">{causes.map((anomaly) => <li className="anomaly-row" key={anomaly.id}><span className={`severity ${anomaly.severity === 'error' ? 'high' : 'warning'}`} aria-hidden="true">!</span><div className="anomaly-copy"><strong>{summaryAnomalyLabel(anomaly.kind)}</strong></div></li>)}</ul> : <div className="empty-state"><strong>当前没有需要管理员处理的问题</strong></div>}</section>
  </>;
};

const LoadingSummary = () => <><header className="page-head"><div><div className="skeleton title-skeleton" /><div className="skeleton copy-skeleton" /></div></header><section className="state-banner summary-status" role="status" aria-label="系统状态"><div className="skeleton icon-skeleton" /><div className="banner-copy"><strong>读取服务端摘要…</strong><div className="skeleton copy-skeleton" /></div></section><section className="panel"><div className="panel-head"><div><h2>最近 24 小时处理量</h2></div></div><div className="skeleton copy-skeleton" /></section><section className="panel"><div className="panel-head"><div><h2>当前需要处理的原因</h2></div></div><div className="skeleton copy-skeleton" /></section></>;

export const ControlShell = ({ activeNav = 'overview', onNavigate, children }: { activeNav?: NavId; onNavigate?: (id: NavId) => void; children?: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const { data, error, loading, refreshing, lastSuccessAt, reload } = useOverview(autoRefresh);
  const pageRef = useRef<HTMLElement>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const previousError = useRef(false);
  const compactViewport = useCompactViewport();
  const shellClass = `${collapsed || (compactViewport && !mobileExpanded) ? 'collapsed' : ''} ${mobileExpanded ? 'mobile-expanded' : ''}`;
  const closeMobileOverlay = useCallback(() => { setMobileExpanded(false); sidebarToggleRef.current?.focus(); }, []);
  const toggleSidebar = () => { if (window.matchMedia('(max-width: 1180px)').matches) { if (mobileExpanded) closeMobileOverlay(); else setMobileExpanded(true); } else setCollapsed((value) => !value); };
  const sidebarExpanded = compactViewport ? mobileExpanded : !collapsed;
  const currentStatus = data ? summaryStatus(data, Boolean(error)) : 'unknown';
  const overall = data ? SUMMARY_COPY[currentStatus].title : loading ? '读取中' : '状态暂时无法确认';
  const overallTone = data ? statusTone(currentStatus) : 'neutral';
  const alertCount = data?.anomalies.slice(0, 3).length ?? 0;
  const refreshed = lastSuccessAt ? formatTime(lastSuccessAt) : '尚未成功';
  const navGroups = useMemo(() => [NAV_ITEMS.slice(0, 1), NAV_ITEMS.slice(1, 4), NAV_ITEMS.slice(4, 6), NAV_ITEMS.slice(6)], []);
  const requestRefresh = useCallback(() => { setRefreshSignal((value) => value + 1); void reload(); }, [reload]);
  const enableAutoRefresh = useCallback(() => { setAutoRefresh(true); requestRefresh(); }, [requestRefresh]);

  useEffect(() => {
    if (!autoRefresh || !children) return undefined;
    const timer = window.setInterval(() => setRefreshSignal((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, children]);

  useEffect(() => {
    if (!compactViewport || !mobileExpanded) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Modal/Drawer 是更高层的焦点所有者，覆盖侧栏不得抢走它们的 Escape。
      if (document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      event.stopPropagation();
      closeMobileOverlay();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [compactViewport, mobileExpanded, closeMobileOverlay]);

  useEffect(() => {
    if (error) {
      previousError.current = true;
      return;
    }
    if (previousError.current && data) {
      pageRef.current?.querySelector('h1')?.focus();
      previousError.current = false;
    }
  }, [data, error]);

  return <div className={`control-shell ${shellClass}`}>
    <aside className="sidebar" aria-label="系统控制台导航">
      <div className="brand-block"><div className="brand-mark">控</div><div className="brand-copy"><strong>系统控制台</strong><span>生产系统控制平面</span></div></div>
      <nav>{navGroups.map((group, groupIndex) => <div className="nav-group" key={groupIndex}><div className="nav-group-title">{['系统', '资源与执行', '策略与成本', '追踪与安全'][groupIndex]}</div>{group.map(([id, label, icon]) => { const enabled = id === 'overview' || id === 'engines' || id === 'routing' || id === 'servers' || id === 'strategy' || id === 'budgets' || id === 'logs' || id === 'secrets' || id === 'changes' || id === 'feedback'; return <button className={`nav-item ${id === activeNav ? 'active' : ''}`} type="button" key={id} disabled={!enabled} aria-current={id === activeNav ? 'page' : undefined} title={enabled ? label : `${label} · 未启用`} onClick={() => enabled && onNavigate?.(id)}><Icon name={icon as IconName} /><span>{label}{!enabled ? ' · 未启用' : ''}</span></button>; })}</div>)}</nav>
      <button ref={sidebarToggleRef} className="sidebar-toggle" type="button" aria-label={sidebarExpanded ? '收起侧栏' : '展开侧栏'} aria-expanded={sidebarExpanded} onClick={toggleSidebar}><Icon name="chevron" /><span>{sidebarExpanded ? '收起导航' : '展开导航'}</span></button>
    </aside>
    {compactViewport && mobileExpanded ? <div className="sidebar-overlay" data-testid="sidebar-overlay" role="presentation" aria-hidden="true" onMouseDown={(event) => { if (event.target === event.currentTarget) { event.preventDefault(); event.stopPropagation(); closeMobileOverlay(); } }} /> : null}
    <section className="shell-stage" data-testid="main-content" data-layout-region="main-content" data-grid-column="2">
      <header className="topbar"><div className="topbar-cluster environment-cluster"><button className="environment-button" type="button" disabled><span className="environment-dot" />内部测试<Icon name="chevron" /></button><div className="overall-status"><i className={`status-dot ${overallTone}`} />系统整体状态 <strong className={overallTone}>{overall}</strong></div></div><div className="topbar-cluster refresh-cluster"><button className="icon-button" type="button" aria-label="立即刷新" onClick={requestRefresh} disabled={loading || refreshing}><Icon name="refresh" /></button><span className="refresh-time">最近刷新 <strong>{refreshed}</strong></span><button className="toggle-control" type="button" role="switch" aria-checked={autoRefresh} onClick={() => { if (autoRefresh) setAutoRefresh(false); else enableAutoRefresh(); }}><span>自动刷新</span><i /></button></div><div className="topbar-cluster topbar-actions"><span className="pending-button"><i className="status-dot neutral" /><strong>{data?.pendingConfiguration.items.length ?? '—'}</strong><span>项待发布变化</span></span><label className="global-search"><Icon name="search" /><input aria-label="全局搜索" placeholder="搜索资源、任务、告警" /></label><button className="icon-button alert-button" type="button" aria-label={`${alertCount} 条告警`} disabled><Icon name="bell" />{alertCount > 0 ? <span>{alertCount}</span> : null}</button><button className="owner-button" type="button" disabled><span className="owner-avatar">管</span><span>控制台身份</span><Icon name="chevron" /></button></div></header>
      <ControlRefreshProvider value={{ autoRefresh, refreshSignal, requestRefresh, enableAutoRefresh }}><main ref={pageRef} className="page-stage" tabIndex={-1}>{children ?? (loading && !data ? <LoadingSummary /> : error && !data ? <div className="error-page"><ErrorBanner error={error} stale={false} onRetry={() => void reload()} refreshing={refreshing} /></div> : data ? <>{error ? <ErrorBanner error={error} stale onRetry={() => void reload()} refreshing={refreshing} /> : null}<SummaryOverview overview={data} stale={Boolean(error)} onRetry={() => void reload()} onNavigate={onNavigate} /></> : null)}</main></ControlRefreshProvider>
    </section>
  </div>;
};
