import { useEffect, useMemo, useRef, useState } from 'react';
import type { SystemControlRuntimeHealth, SystemControlRuntimeResource, SystemControlRuntimeResourceKind } from '@qimao-terms-cloud/contracts';

import { EmptyBlock, ErrorBlock, LoadingBlock, useAsyncRead } from './controlPrimitives.js';
import { getRuntimeOverview, getRuntimeResource, listRuntimeResources } from './runtimeApi.js';
import { PAGE_SIZE, Pagination, ReadOnlyDrawer, ShortId, formatRuntimeTime } from './runtimeCommon.js';
import type { NavId } from './model.js';
import { useControlRefresh } from './controlRefresh.js';

const KIND_LABELS: Record<SystemControlRuntimeResourceKind, string> = { application: '应用服务', worker: '后台 Worker', database: '数据库', storage: '对象存储' };
const HEALTH_LABELS: Record<SystemControlRuntimeHealth, string> = { healthy: '正常', degraded: '需关注', failed: '失败', empty: '暂无运行事实', unknown: '未知', not_configured: '未配置' };
const TELEMETRY_LABELS: Record<string, string> = { fresh: '已接入', partial: '部分可用', unknown: '未知', not_configured: '未配置' };
const CONFIG_LABELS: Record<string, string> = { configured: '已固定配置', unknown: '配置未知', not_configured: '未配置' };

const RuntimeBadge = ({ value }: { value: SystemControlRuntimeHealth }) => <span className={`runtime-badge runtime-${value}`}><i />{HEALTH_LABELS[value]}</span>;
const metric = (value: number | null, suffix = '') => value === null ? '未知' : `${value}${suffix}`;

const Summary = ({ data }: { data: ReturnType<typeof getRuntimeOverview> extends Promise<infer T> ? T : never }) => {
  const values = [
    ['运行资源', data.resources.length], ['排队', data.totals.queueDepth], ['运行中', data.totals.runningCount],
    ['已完成', data.totals.completedCount], ['失败', data.totals.failedCount], ['需对账', data.totals.reconciliationRequiredCount],
    ['活跃租约', data.totals.activeLeaseCount],
  ];
  return <section className="runtime-summary" aria-label="运行摘要">{values.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}<div><span>数据时间</span><strong>{new Date(data.dataFreshness).toLocaleTimeString('zh-CN', { hour12: false })}</strong></div></section>;
};

const ResourceDetail = ({ resource, onNavigate }: { resource: SystemControlRuntimeResource; onNavigate: (id: NavId) => void }) => <>
  <dl className="runtime-detail-grid">
    <div><dt>健康结论</dt><dd><RuntimeBadge value={resource.health} /></dd></div><div><dt>权威来源</dt><dd>{resource.source === 'postgresql' ? '领域运行事实' : resource.source === 'provider' ? '受控遥测摘要' : '暂无权威来源'}</dd></div>
    <div><dt>运行 / 排队</dt><dd>{resource.runningCount} / {resource.queueDepth}</dd></div><div><dt>失败 / 需对账</dt><dd>{resource.failedCount} / {resource.reconciliationRequiredCount}</dd></div>
    <div><dt>最近事实</dt><dd>{formatRuntimeTime(resource.updatedAt ?? resource.observedAt)}</dd></div><div><dt>租约</dt><dd>{resource.lease.activeCount} 个活跃 · {resource.lease.ownerPresentCount} 个有 owner</dd></div>
  </dl>
  <section className="runtime-detail-section"><div className="runtime-section-head"><div><h3>受控观测指标</h3><p>Provider 未配置或字段缺失时保持未知，不按 0 展示。</p></div><span>{TELEMETRY_LABELS[resource.telemetry.status] ?? '未知'}</span></div><div className="runtime-metric-grid"><div><span>CPU</span><strong>{metric(resource.telemetry.cpuPercent, '%')}</strong></div><div><span>GPU</span><strong>{metric(resource.telemetry.gpuPercent, '%')}</strong></div><div><span>内存</span><strong>{resource.telemetry.memoryBytes === null ? '未知' : `${(resource.telemetry.memoryBytes / 1024 / 1024).toFixed(0)} MB`}</strong></div><div><span>存储</span><strong>{resource.telemetry.storageBytes === null ? '未知' : `${(resource.telemetry.storageBytes / 1024 / 1024).toFixed(0)} MB`}</strong></div><div><span>数据库连接</span><strong>{metric(resource.telemetry.databaseConnections)}</strong></div><div><span>进程</span><strong>{metric(resource.telemetry.processCount)}</strong></div></div></section>
  <section className="runtime-detail-section"><div className="runtime-section-head"><div><h3>任务固定配置</h3><p>只读复用当前路由和部署版本；本页不提供第二个暂停开关。</p></div><span>{CONFIG_LABELS[resource.configuration.status] ?? '未知'}</span></div><dl className="runtime-definition"><div><dt>配置版本</dt><dd>{resource.configuration.version ?? '暂无事实'}</dd></div><div><dt>路由版本</dt><dd><ShortId value={resource.configuration.routingVersionId} /></dd></div><div><dt>部署版本</dt><dd><ShortId value={resource.configuration.deploymentVersionId} /></dd></div><div><dt>接收新任务</dt><dd>{resource.configuration.acceptingNewTasks === null ? '未验证' : resource.configuration.acceptingNewTasks ? '是' : '否'}</dd></div></dl></section>
  <section className="runtime-detail-section"><h3>运行身份</h3><dl className="runtime-definition"><div><dt>能力 / 执行方式</dt><dd>{resource.identity.capability ?? '暂无'} · {resource.identity.executionKind ?? '暂无'}</dd></div><div><dt>提供方 / 模型</dt><dd>{resource.identity.provider ?? '暂无'} · {resource.identity.model ?? '暂无'}</dd></div></dl></section>
  <div className="cp-row-actions"><button className="cp-primary" type="button" onClick={() => onNavigate('logs')}>查看关联执行记录</button>{resource.configuration.deploymentVersionId ? <button className="cp-secondary" type="button" onClick={() => onNavigate('engines')}>查看引擎版本</button> : null}{resource.configuration.routingVersionId ? <button className="cp-secondary" type="button" onClick={() => onNavigate('routing')}>查看路由版本</button> : null}</div>
</>;

export const ServersPage = ({ onNavigate }: { onNavigate: (id: NavId) => void }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [kind, setKind] = useState<SystemControlRuntimeResourceKind | ''>('');
  const [health, setHealth] = useState<SystemControlRuntimeHealth | ''>('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('health_asc');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const controlRefresh = useControlRefresh();
  const observedRefresh = useRef(controlRefresh?.refreshSignal ?? 0);
  const focusAfterRefresh = useRef(false);
  const overview = useAsyncRead(getRuntimeOverview, []);
  const query = useMemo(() => { const params = new URLSearchParams({ environment: 'development', sort, limit: String(PAGE_SIZE), offset: String(offset) }); if (kind) params.set('kind', kind); if (health) params.set('health', health); if (search) params.set('search', search); return params.toString(); }, [kind, health, search, sort, offset]);
  const resources = useAsyncRead((signal) => listRuntimeResources(query, signal), [query]);
  const detail = useAsyncRead<SystemControlRuntimeResource | null>((signal) => selectedId ? getRuntimeResource(selectedId, signal) : Promise.resolve(null), [selectedId]);
  useEffect(() => { setOffset(0); setSelectedId(null); }, [kind, health, search, sort]);
  const reloadAll = () => {
    overview.reload();
    resources.reload();
  };
  useEffect(() => { if (!controlRefresh || observedRefresh.current === controlRefresh.refreshSignal) return; observedRefresh.current = controlRefresh.refreshSignal; reloadAll(); }, [controlRefresh?.refreshSignal]); // eslint-disable-line react-hooks/exhaustive-deps
  const requestRefresh = () => { focusAfterRefresh.current = true; if (controlRefresh) controlRefresh.requestRefresh(); else reloadAll(); };
  const retryPageRead = () => { focusAfterRefresh.current = true; reloadAll(); };
  const pageError = resources.error ?? overview.error;
  useEffect(() => {
    if (!focusAfterRefresh.current || pageError || overview.loading || overview.refreshing || resources.loading || resources.refreshing || !overview.data || !resources.data) return;
    focusAfterRefresh.current = false;
    titleRef.current?.focus();
  }, [pageError, overview.data, overview.loading, overview.refreshing, resources.data, resources.loading, resources.refreshing]);
  return <div className="cp-page runtime-page" data-testid="servers-page"><header className="cp-page-head"><div><h1 ref={titleRef} tabIndex={-1}>服务器与运行环境</h1><p>只读观察应用、Worker、数据库和对象存储；调度、引擎与预算继续由各自权威页面控制。</p></div><div className="cp-row-actions"><button className="cp-secondary" type="button" onClick={() => onNavigate('logs')}>查看执行记录</button><button className="cp-primary" type="button" disabled={overview.refreshing || resources.refreshing} onClick={requestRefresh}>立即刷新</button></div></header>
    {controlRefresh && !controlRefresh.autoRefresh ? <div className="cp-state runtime-refresh-off" role="status"><div><strong>自动刷新已关闭</strong><span>页面保留最后一次服务端事实，不会产生后台运行资源请求。</span></div><button className="cp-secondary" type="button" onClick={controlRefresh.enableAutoRefresh}>开启自动刷新</button></div> : null}
    {pageError ? <ErrorBlock error={pageError} stale={Boolean(overview.data || resources.data)} onRetry={retryPageRead} busy={overview.refreshing || resources.refreshing} focusOnMount={focusAfterRefresh.current || !overview.data || !resources.data} title="无法读取运行资源" /> : null}
    {overview.loading && !overview.data ? <LoadingBlock label="正在读取运行摘要…" /> : overview.data ? <Summary data={overview.data} /> : null}
    <section className="runtime-layout"><div className="cp-panel runtime-resource-panel"><div className="cp-section-head"><div><h2>运行资源</h2><span className="cp-muted">服务端筛选、稳定分页；资源身份仅来自受控目录</span></div></div><form className="cp-toolbar runtime-toolbar" onSubmit={(event) => { event.preventDefault(); setSearch(searchDraft.trim()); }}><input aria-label="搜索运行资源" placeholder="资源名称或稳定资源 ID" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} /><select aria-label="资源类型" value={kind} onChange={(event) => setKind(event.target.value as SystemControlRuntimeResourceKind | '')}><option value="">全部类型</option>{Object.entries(KIND_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select aria-label="健康状态" value={health} onChange={(event) => setHealth(event.target.value as SystemControlRuntimeHealth | '')}><option value="">全部状态</option>{Object.entries(HEALTH_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select aria-label="资源排序" value={sort} onChange={(event) => setSort(event.target.value)}><option value="health_asc">健康优先</option><option value="updated_desc">最近更新</option><option value="display_asc">名称升序</option><option value="display_desc">名称降序</option></select><button className="cp-secondary" type="submit">查询</button></form>
      {resources.loading && !resources.data ? <LoadingBlock label="正在读取运行资源…" /> : resources.data?.items.length ? <><div className="cp-table-wrap runtime-table-wrap"><table className="cp-table runtime-table"><thead><tr><th>资源</th><th>类型</th><th>健康结论</th><th>运行 / 排队</th><th>24 小时完成 / 失败</th><th>最近事实</th><th>配置</th><th>操作</th></tr></thead><tbody>{resources.data.items.map((resource) => <tr key={resource.runtimeResourceId}><td><strong>{resource.displayName}</strong><small>{resource.runtimeResourceId}</small></td><td>{KIND_LABELS[resource.kind]}</td><td><RuntimeBadge value={resource.health} /><small>遥测：{TELEMETRY_LABELS[resource.telemetry.status] ?? '未知'}</small></td><td>{resource.runningCount} / {resource.queueDepth}<small>租约 {resource.lease.activeCount}</small></td><td>{resource.throughput.completedCount} / {resource.throughput.failedCount}<small>需对账 {resource.throughput.reconciliationRequiredCount}</small></td><td>{formatRuntimeTime(resource.updatedAt ?? resource.observedAt)}</td><td>{CONFIG_LABELS[resource.configuration.status] ?? '未知'}<small>{resource.configuration.version ?? '无版本事实'}</small></td><td><button className="cp-link" type="button" onClick={() => setSelectedId(resource.runtimeResourceId)}>查看详情</button></td></tr>)}</tbody></table></div><Pagination offset={resources.data.offset} total={resources.data.total} onChange={setOffset} /></> : resources.data ? <EmptyBlock title="尚未发现运行资源" detail={`当前筛选 total=${resources.data.total}；Provider 未配置时保持空状态，不创建默认服务器。`} /> : null}</div><aside className="runtime-guide"><section className="cp-panel"><span>01</span><h3>先看健康结论</h3><p>业务任务、租约与需对账优先；基础设施指标缺失只标未知。</p></section><section className="cp-panel"><span>02</span><h3>再看执行记录</h3><p>使用稳定任务身份和 requestId 定位，不依赖浏览器缓存。</p></section><section className="cp-panel"><span>03</span><h3>最后进入控制所有者</h3><p>路由、引擎和预算继续在所属页面管理，避免第二状态源。</p></section></aside></section>
    {selectedId ? <ReadOnlyDrawer title={detail.data?.displayName ?? '运行资源详情'} kicker="运行资源 · 只读权威事实" onClose={() => setSelectedId(null)}>{detail.error ? <ErrorBlock error={detail.error} onRetry={() => detail.reload()} busy={detail.refreshing} focusOnMount title="无法读取资源详情" /> : detail.loading && !detail.data ? <LoadingBlock label="读取资源详情…" /> : detail.data ? <ResourceDetail resource={detail.data} onNavigate={onNavigate} /> : null}</ReadOnlyDrawer> : null}
  </div>;
};
