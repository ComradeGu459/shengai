import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  SystemControlOperationAttempt,
  SystemControlOperationDetail,
  SystemControlOperationListItem,
  SystemControlOperationsDomain,
  SystemControlOperationsSort,
  SystemControlRoutingAdvanceEvent,
} from '@qimao-terms-cloud/contracts';

import { EmptyBlock, ErrorBlock, LoadingBlock, useAsyncRead } from './controlPrimitives.js';
import { getOperation, listOperations } from './runtimeApi.js';
import { PAGE_SIZE, Pagination, ReadOnlyDrawer, ShortId, formatCny, formatDuration, formatRuntimeTime } from './runtimeCommon.js';
import type { NavId } from './model.js';
import { useControlRefresh } from './controlRefresh.js';

const DOMAIN_LABELS: Record<SystemControlOperationsDomain, string> = { asr: '中文语音识别', screen_text: '画面字识别', delivery: '交付生成', system_control: '系统控制', upload: '文件上传', terms: '术语提取' };
const DOMAIN_IDENTITY_LABELS: Record<SystemControlOperationsDomain, string> = { asr: '任务身份', screen_text: '任务身份', delivery: '任务身份', system_control: '控制任务', upload: '上传会话', terms: '提取运行' };
const STATUS_LABELS: Record<string, string> = { queued: '排队中', leased: '已租用', running: '执行中', created: '待上传', uploading: '上传中', completing: '提交中', verifying: '服务端校验中', retryable: '等待继续', succeeded: '已成功', completed: '已完成', ready: '已生成', failed: '失败', generation_failed: '生成失败', unknown: '结果未知', reconciliation_required: '需对账', cancel_requested: '取消请求中', cancelled: '已取消', aborted: '已中止', expired: '已过期', partially_completed: '部分完成' };
const DOMAIN_STATUS_LABELS: Partial<Record<SystemControlOperationsDomain, Record<string, string>>> = {
  upload: { created: '待上传', uploading: '上传中', completing: '服务端确认中', verifying: '服务端校验中', retryable: '等待继续', aborted: '已取消', expired: '已过期' },
};
const STATUS_FILTER_VALUES = ['queued', 'leased', 'created', 'uploading', 'completing', 'verifying', 'running', 'retryable', 'succeeded', 'completed', 'ready', 'failed', 'generation_failed', 'reconciliation_required', 'unknown', 'cancel_requested', 'cancelled', 'aborted', 'expired', 'partially_completed'] as const;
const RECONCILIATION_LABELS: Record<string, string> = { pending: '待结算', final: '已结算', unknown: '金额未知', reconciliation_required: '需对账' };
const EFFECT_LABELS: Record<Exclude<SystemControlOperationListItem['effectClass'], null>, string> = { completed: '执行完成', external_not_accepted: '已证明未受理', unauthorized: '未授权', external_unknown: '结果未知', quality_rejected: '质量未达标', cancelled: '已取消' };
const statusText = (value: string, domain?: SystemControlOperationsDomain) => (domain ? DOMAIN_STATUS_LABELS[domain]?.[value] : undefined) ?? STATUS_LABELS[value] ?? '状态待确认';
const statusTone = (value: string) => value.includes('failed') || value === 'reconciliation_required' || value === 'unknown' ? 'danger' : value === 'succeeded' || value === 'completed' || value === 'ready' ? 'healthy' : value === 'running' || value === 'leased' || value === 'uploading' || value === 'completing' || value === 'verifying' ? 'info' : 'neutral';
const effectText = (value: SystemControlOperationListItem['effectClass']) => value ? EFFECT_LABELS[value] ?? '结果待确认' : '历史记录未保存此信息';
const factText = (value: string | null) => value ? <ShortId value={value} /> : <>历史记录未保存此信息</>;
const safeAttemptReason = (value: SystemControlOperationAttempt['effectClass']) => value === 'external_unknown' ? '结果未知，需查询同一记录或对账' : value === 'external_not_accepted' ? '服务端已确认未受理' : value === 'unauthorized' ? '未授权，未显示内部原因' : value === 'quality_rejected' ? '质量未达标，未显示内部原因' : value === 'cancelled' ? '已取消' : value === 'completed' ? '无公开错误' : '历史记录未保存此信息';
const hasRoutingFacts = (domain: SystemControlOperationsDomain) => domain === 'asr' || domain === 'screen_text';
const hasAttemptFacts = (domain: SystemControlOperationsDomain) => domain === 'asr' || domain === 'screen_text' || domain === 'delivery' || domain === 'system_control';
const hasCostFacts = (domain: SystemControlOperationsDomain) => domain === 'asr' || domain === 'screen_text';
const OperationBadge = ({ value, domain }: { value: string; domain?: SystemControlOperationsDomain }) => <span className={`runtime-badge runtime-${statusTone(value)}`}><i />{statusText(value, domain)}</span>;
const OperationIdentity = ({ item }: { item: SystemControlOperationListItem }) => <div><strong>{DOMAIN_LABELS[item.domain]}</strong><small>{DOMAIN_IDENTITY_LABELS[item.domain]} · {factText(item.taskId ?? item.jobId ?? item.operationId)}</small></div>;

const AdvanceNotice = ({ event, next }: { event: SystemControlRoutingAdvanceEvent | undefined; next: SystemControlOperationAttempt }) => {
  if (!event || !event.externalNotAccepted || event.externalSideEffectPossible || event.toAttemptId !== next.attemptId) return null;
  return <div className="runtime-advance-notice" role="status">本次执行明确未受理，已进入下一目标（目标序号 {event.toTargetPriority ?? '历史记录未保存此信息'}）。</div>;
};

const AttemptCard = ({ attempt, detail, advance, nextAttempt }: { attempt: SystemControlOperationAttempt; detail: SystemControlOperationDetail; advance: SystemControlRoutingAdvanceEvent | undefined; nextAttempt: SystemControlOperationAttempt | undefined }) => <>
  <article className="runtime-attempt-card" data-testid={`attempt-${attempt.attemptNumber}`}>
    <div className="runtime-section-head"><div><h4>执行记录 {attempt.attemptNumber}</h4><p>服务端记录的固定目标与结果，不使用浏览器推算。</p></div><OperationBadge value={attempt.status} /></div>
    <dl className="runtime-definition"><div><dt>目标序号</dt><dd>{attempt.targetPriority ?? '历史记录未保存此信息'}</dd></div><div><dt>部署版本</dt><dd>{factText(attempt.deploymentVersionId)}</dd></div><div><dt>路由摘要</dt><dd>{factText(attempt.routeDigest)}</dd></div><div><dt>安全效果</dt><dd>{attempt.effectClass ? EFFECT_LABELS[attempt.effectClass] : '历史记录未保存此信息'}</dd></div><div><dt>安全错误</dt><dd>{safeAttemptReason(attempt.effectClass)}</dd></div><div><dt>外部请求身份</dt><dd>{factText(attempt.providerRequestId)}</dd></div><div><dt>requestId</dt><dd>{factText(attempt.requestId)}</dd></div><div><dt>费用</dt><dd>{formatCny(detail.amountCny, detail.reconciliationStatus)}</dd></div></dl>
  </article>
  {nextAttempt ? <AdvanceNotice event={advance} next={nextAttempt} /> : null}
</>;

const OperationDetailBody = ({ detail, onNavigate }: { detail: SystemControlOperationDetail; onNavigate: (id: NavId) => void }) => {
  const attempts = detail.attemptChain ?? [];
  const events = detail.routingAdvanceEvents ?? [];
  const connectionUnknown = detail.domain === 'system_control' && (detail.status === 'unknown' || detail.effectClass === 'external_unknown' || detail.reconciliationStatus === 'unknown');
  const showCost = hasCostFacts(detail.domain);
  const showTechnicalIdentity = hasAttemptFacts(detail.domain);
  return <>
    {connectionUnknown ? <div className="cp-state runtime-unknown-notice" role="status"><strong>连接测试结果未知</strong><span>可能已产生外部副作用；仅查询同一记录，不会重新发起连接检查。</span></div> : null}
    <dl className="runtime-detail-grid"><div><dt>当前状态</dt><dd><OperationBadge value={detail.status} domain={detail.domain} /></dd></div><div><dt>领域</dt><dd>{DOMAIN_LABELS[detail.domain]}</dd></div><div><dt>安全效果</dt><dd>{effectText(detail.effectClass)}</dd></div><div><dt>requestId</dt><dd>{factText(detail.requestId)}</dd></div><div><dt>外部请求身份</dt><dd>{factText(detail.providerRequestId)}</dd></div><div><dt>开始 / 完成</dt><dd>{formatRuntimeTime(detail.startedAt)}<br />{formatRuntimeTime(detail.completedAt)}</dd></div><div><dt>耗时</dt><dd>{formatDuration(detail.durationMs)}</dd></div>{showCost ? <><div><dt>人民币金额</dt><dd>{formatCny(detail.amountCny, detail.reconciliationStatus)}</dd></div><div><dt>结算状态</dt><dd>{detail.reconciliationStatus ? (RECONCILIATION_LABELS[detail.reconciliationStatus] ?? '待确认') : '暂无费用事实'}</dd></div></> : null}</dl>
    {attempts.length && showTechnicalIdentity ? <section className="runtime-detail-section"><div className="runtime-section-head"><div><h3>有序执行链</h3><p>仅在服务端明确未受理且无外部副作用时，提示进入下一目标。</p></div></div><div className="runtime-attempt-chain">{attempts.map((attempt, index) => <AttemptCard key={attempt.attemptId} attempt={attempt} detail={detail} nextAttempt={attempts[index + 1]} advance={events.find((event) => event.fromAttemptId === attempt.attemptId && event.toAttemptId === attempts[index + 1]?.attemptId)} />)}</div></section> : null}
    {detail.domain === 'asr' || detail.domain === 'screen_text' ? <section className="runtime-detail-section runtime-manual-terminal"><h3>人工处理出口</h3><p>仅当服务端记录的目标均未完成时进入领域工作台；人工处理不占目标序号，也不伪造部署或容量事实。</p></section> : null}
    <section className="runtime-detail-section"><div className="runtime-section-head"><div><h3>不可变执行身份</h3><p>历史记录保留创建时版本，不使用当前配置覆盖。</p></div></div><dl className="runtime-definition">{detail.domain === 'upload' ? <><div><dt>上传会话</dt><dd>{factText(detail.taskId)}</dd></div><div><dt>完成任务</dt><dd>{factText(detail.jobId)}</dd></div></> : detail.domain === 'terms' ? <div><dt>术语提取运行</dt><dd>{factText(detail.taskId)}</dd></div> : <><div><dt>任务 / Job / Attempt</dt><dd>{factText(detail.taskId)} · {factText(detail.jobId)} · {factText(detail.attemptId)}</dd></div><div><dt>引擎部署版本</dt><dd>{factText(detail.engineDeploymentVersionId)}</dd></div><div><dt>路由版本</dt><dd>{factText(detail.routingVersionId)}</dd></div><div><dt>预算策略 / 换算快照</dt><dd>{factText(detail.budgetPolicyVersionId)} · {factText(detail.conversionSnapshotId)}</dd></div></>}</dl></section>
    {detail.qualitySummary ? <section className="runtime-detail-section"><div className="runtime-section-head"><div><h3>质量摘要</h3><p>仅展示计数和处理耗时，不返回字幕正文或供应商载荷。</p></div></div><div className="runtime-metric-grid"><div><span>质量状态</span><strong>{detail.qualitySummary.status ?? '暂无事实'}</strong></div><div><span>Cue</span><strong>{detail.qualitySummary.cueCount ?? '暂无事实'}</strong></div><div><span>候选</span><strong>{detail.qualitySummary.candidateCount ?? '暂无事实'}</strong></div><div><span>处理耗时</span><strong>{formatDuration(detail.qualitySummary.processingDurationMs)}</strong></div></div></section> : null}
    {detail.error ? <section className="runtime-detail-section runtime-error-section"><h3>脱敏诊断</h3><p>{detail.error.reason ?? '服务端未提供可公开原因。'}</p><dl className="runtime-definition"><div><dt>恢复提示</dt><dd>{detail.error.retryable ? '可按领域规则重试' : '请依据当前状态处理'} · {detail.error.reconciliationRequired ? '需人工对账' : '无需对账'}</dd></div><div><dt>requestId</dt><dd>{factText(detail.requestId)}</dd></div></dl></section> : null}
    {detail.originalCurrency && detail.originalAmount ? <section className="runtime-detail-section"><h3>原币审计</h3><p>{detail.originalAmount} {detail.originalCurrency}。运行总览和预算门禁仍以服务端人民币事实为准。</p></section> : null}
    <div className="cp-row-actions">{detail.engineDeploymentVersionId ? <button className="cp-secondary" type="button" onClick={() => onNavigate('engines')}>查看引擎版本</button> : null}{detail.routingVersionId ? <button className="cp-secondary" type="button" onClick={() => onNavigate('routing')}>查看路由版本</button> : null}{detail.budgetPolicyVersionId ? <button className="cp-secondary" type="button" onClick={() => onNavigate('budgets')}>查看预算策略</button> : null}</div>
  </>;
};

export const LogsPage = ({ onNavigate }: { onNavigate: (id: NavId) => void }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [projectDraft, setProjectDraft] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectError, setProjectError] = useState('');
  const [domain, setDomain] = useState<SystemControlOperationsDomain | ''>('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<SystemControlOperationsSort>('updated_desc');
  const [range, setRange] = useState<'' | '24h' | '7d'>('24h');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const controlRefresh = useControlRefresh();
  const observedRefresh = useRef(controlRefresh?.refreshSignal ?? 0);
  const recoveryQueryRef = useRef<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<unknown>(null);
  const [recoverySuccessNonce, setRecoverySuccessNonce] = useState(0);
  const query = useMemo(() => {
    const params = new URLSearchParams({ environment: 'development', sort, limit: String(PAGE_SIZE), offset: String(offset) });
    if (domain) params.set('domain', domain);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (projectId) params.set('projectId', projectId);
    if (range) { const now = Date.now(); params.set('from', new Date(now - (range === '24h' ? 24 : 168) * 60 * 60 * 1000).toISOString()); params.set('to', new Date(now).toISOString()); }
    return params.toString();
  }, [domain, status, search, projectId, sort, range, offset]);
  const operations = useAsyncRead((signal) => listOperations(query, signal), [query]);
  const detail = useAsyncRead<SystemControlOperationDetail | null>((signal) => selectedId ? getOperation(selectedId, signal) : Promise.resolve(null), [selectedId]);
  useEffect(() => { setOffset(0); setSelectedId(null); }, [domain, status, search, projectId, sort, range]);
  useEffect(() => { setSelectedId(null); }, [query]);
  useLayoutEffect(() => {
    if (recoveryQueryRef.current && recoveryQueryRef.current !== query) {
      recoveryQueryRef.current = null;
      setRecoveryError(null);
    }
  }, [query]);
  useEffect(() => {
    if (recoveryQueryRef.current === query && operations.error) setRecoveryError(operations.error);
  }, [operations.error, query]);
  useLayoutEffect(() => {
    if (!recoverySuccessNonce || recoveryQueryRef.current !== query || !operations.data || operations.error) return;
    recoveryQueryRef.current = null;
    setRecoveryError(null);
    titleRef.current?.focus();
  }, [recoverySuccessNonce, query, operations.data, operations.error]);
  useEffect(() => {
    if (!controlRefresh || observedRefresh.current === controlRefresh.refreshSignal) return;
    observedRefresh.current = controlRefresh.refreshSignal;
    recoveryQueryRef.current = null;
    setRecoveryError(null);
    operations.reload();
  }, [controlRefresh?.refreshSignal]); // eslint-disable-line react-hooks/exhaustive-deps
  const requestRefresh = () => { recoveryQueryRef.current = null; setRecoveryError(null); if (controlRefresh) controlRefresh.requestRefresh(); else operations.reload(); };
  const retryOperations = () => {
    const recoveryQuery = query;
    recoveryQueryRef.current = recoveryQuery;
    setRecoverySuccessNonce(0);
    setRecoveryError(operations.error ?? recoveryError);
    operations.reload(() => {
      if (recoveryQueryRef.current === recoveryQuery) setRecoverySuccessNonce((value) => value + 1);
    });
  };
  const submitQuery = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const value = projectDraft.trim(); if (value && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) { setProjectError('项目身份格式不正确，未发起查询。'); return; } setProjectError(''); setSearch(searchDraft.trim()); setProjectId(value); };
  const totals = useMemo(() => { const items = operations.data?.items ?? []; return { failed: items.filter((item) => item.status.includes('failed')).length, reconciliation: items.filter((item) => item.reconciliationStatus === 'reconciliation_required').length, settledCount: items.filter((item) => item.amountCny !== null && item.reconciliationStatus === 'final').length }; }, [operations.data]);
  return <div className="cp-page runtime-page logs-page" data-testid="logs-page"><header className="cp-page-head"><div><h1 ref={titleRef} tabIndex={-1}>日志与质量</h1><p>从领域 PostgreSQL 事实检索每一次 Job / Attempt；不复制日志库，不保存正文、Secret 或供应商原始载荷。</p></div><button className="cp-primary" type="button" disabled={operations.refreshing} onClick={requestRefresh}>立即刷新</button></header>
    {controlRefresh && !controlRefresh.autoRefresh ? <div className="cp-state runtime-refresh-off" role="status"><div><strong>自动刷新已关闭</strong><span>页面保留最后一次执行事实，不会产生后台日志请求。</span></div><button className="cp-secondary" type="button" onClick={controlRefresh.enableAutoRefresh}>开启自动刷新</button></div> : null}
    {(() => { const recoveryPending = recoveryQueryRef.current === query; const visibleError = recoveryPending ? recoveryError ?? operations.error : operations.error; return visibleError ? <ErrorBlock error={visibleError} stale={Boolean(operations.data)} onRetry={retryOperations} busy={operations.refreshing || operations.loading} focusWhenBusy={recoveryPending} focusOnMount={recoveryPending || !operations.data} title="无法读取执行记录" /> : null; })()}
    {operations.data ? <section className="runtime-summary ops-summary" aria-label="当前页执行摘要"><div><span>服务端总记录</span><strong>{operations.data.total}</strong></div><div><span>当前页失败</span><strong>{totals.failed}</strong></div><div><span>当前页需对账</span><strong>{totals.reconciliation}</strong></div><div><span>当前页已结算记录</span><strong>{totals.settledCount} 条</strong></div><div><span>数据时间</span><strong>{new Date(operations.data.dataFreshness).toLocaleTimeString('zh-CN', { hour12: false })}</strong></div></section> : null}
    <section className="cp-panel operations-panel"><form className="cp-toolbar runtime-toolbar" onSubmit={submitQuery}><input aria-label="搜索执行记录" placeholder="项目、任务、Job、Attempt 或 requestId" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} /><input aria-label="项目 ID" placeholder="项目 UUID（可选）" value={projectDraft} onChange={(event) => { setProjectDraft(event.target.value); setProjectError(''); }} /><select aria-label="执行领域" value={domain} onChange={(event) => setDomain(event.target.value as SystemControlOperationsDomain | '')}><option value="">全部领域</option>{Object.entries(DOMAIN_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select aria-label="执行状态" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option>{STATUS_FILTER_VALUES.map((value) => <option value={value} key={value}>{STATUS_LABELS[value]}</option>)}</select><select aria-label="时间范围" value={range} onChange={(event) => setRange(event.target.value as '' | '24h' | '7d')}><option value="24h">最近 24 小时</option><option value="7d">最近 7 天</option><option value="">全部时间</option></select><select aria-label="执行排序" value={sort} onChange={(event) => setSort(event.target.value as SystemControlOperationsSort)}><option value="updated_desc">最近更新</option><option value="updated_asc">最早更新</option><option value="status_asc">状态升序</option><option value="domain_asc">领域升序</option></select><button className="cp-secondary" type="submit">查询</button></form>{projectError ? <div className="cp-state runtime-input-error" role="alert">{projectError}</div> : null}
      {operations.loading && !operations.data ? <LoadingBlock label="正在读取服务端执行记录…" /> : operations.data?.items.length ? <><div className="cp-table-wrap operations-table-wrap"><table className="cp-table operations-table"><thead><tr><th>有效时间</th><th>领域 / 对象</th><th>路由摘要</th><th>目标序号</th><th>部署版本</th><th>安全效果</th><th>状态</th><th>人民币金额</th><th>结算</th><th>requestId</th><th>Attempt</th><th>操作</th></tr></thead><tbody>{operations.data.items.map((item) => <tr key={item.operationId}><td>{formatRuntimeTime(item.effectiveUpdatedAt)}</td><td><OperationIdentity item={item} /></td><td>{hasRoutingFacts(item.domain) ? factText(item.routeDigest) : '该领域无路由事实'}</td><td>{hasRoutingFacts(item.domain) ? (item.targetPriority ?? '历史记录未保存此信息') : '该领域无目标序号'}</td><td>{factText(item.deploymentVersionId)}</td><td>{effectText(item.effectClass)}</td><td><OperationBadge value={item.status} domain={item.domain} /></td><td>{hasCostFacts(item.domain) ? formatCny(item.amountCny, item.reconciliationStatus) : '该领域无费用事实'}</td><td>{hasCostFacts(item.domain) ? (item.reconciliationStatus ? (RECONCILIATION_LABELS[item.reconciliationStatus] ?? '待确认') : '暂无费用事实') : '该领域无结算事实'}</td><td>{factText(item.requestId)}</td><td>{hasAttemptFacts(item.domain) ? factText(item.attemptId) : '该领域无 Attempt'}</td><td><button className="cp-link" type="button" onClick={() => setSelectedId(item.operationId)}>查看详情</button></td></tr>)}</tbody></table></div><Pagination offset={operations.data.offset} total={operations.data.total} onChange={setOffset} /></> : operations.data ? <EmptyBlock title="当前筛选条件下没有执行记录" detail={`服务端 total=${operations.data.total}；调整筛选后重新查询，页面不显示匿名样例。`} /> : null}</section>
    {selectedId ? <ReadOnlyDrawer title={detail.data ? `${DOMAIN_LABELS[detail.data.domain]}执行详情` : '执行记录详情'} kicker="执行记录 · 只读历史事实" onClose={() => setSelectedId(null)}>{detail.error ? <ErrorBlock error={detail.error} onRetry={() => detail.reload()} busy={detail.refreshing} focusOnMount title="无法读取执行详情" /> : detail.loading && !detail.data ? <LoadingBlock label="读取执行详情…" /> : detail.data ? <OperationDetailBody detail={detail.data} onNavigate={onNavigate} /> : null}</ReadOnlyDrawer> : null}
  </div>;
};
