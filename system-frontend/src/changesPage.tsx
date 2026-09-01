import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  SystemControlRoutingAuditAction,
  SystemControlRoutingAuditEvent,
  SystemControlRoutingPolicyVersion,
  SystemControlRoutingWorkflowStage,
} from '@qimao-terms-cloud/contracts';
import {
  Badge,
  CommandRecovery,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  Modal,
  formatDate,
  useAsyncRead,
} from './controlPrimitives.js';
import {
  createStableId,
  getRouting,
  getRoutingCommand,
  isUnknownResult,
  listAudit,
  listRouting,
  publishRouting,
  rollbackRouting,
  transitionRouting,
} from './systemApi.js';

const PAGE_SIZE = 20;
const statusDescription: Record<string, string> = {
  draft: '编辑中的服务端草稿',
  testing: '已请求服务端测试',
  impact_checked: '影响已计算',
  approved: '等待发布动作',
  active: '当前唯一生效版本',
  retired: '历史冻结版本',
};
const auditText: Record<string, string> = {
  routing_policy_created: '创建路由草稿',
  routing_testing: '执行连接测试',
  routing_impact_checked: '完成影响检查',
  routing_approved: '批准路由变更',
  routing_published: '发布路由变更',
  routing_rollback: '回滚路由版本',
};
const stageName = (stage: SystemControlRoutingWorkflowStage) => stage === 'asr' ? '语音识别' : stage === 'screen_text' ? '画面字' : '术语提取';
const poolName = (poolId: string) => poolId === 'asr_api' ? 'ASR API' : poolId === 'terms_api' ? '术语 API' : poolId === 'ocr_self_hosted_worker' ? 'OCR 本地 Worker' : 'OCR 云服务';

const PolicyLine = ({
  policy,
  onSelect,
  selected,
}: {
  policy: SystemControlRoutingPolicyVersion;
  onSelect: () => void;
  selected: boolean;
}) => (
  <button className={`cp-policy-card ${selected ? 'selected' : ''}`} type="button" onClick={onSelect}>
    <div className="cp-row-between">
      <strong>v{policy.version} · {stageName(policy.workflowStage)}</strong>
      <Badge value={policy.status} />
    </div>
    <span>{policy.routingVersionId}</span>
    <small>{formatDate(policy.updatedAt)}</small>
  </button>
);

const TargetRows = ({ policy }: { policy: SystemControlRoutingPolicyVersion }) => {
  const rows = policy.pools
    .flatMap((pool) => pool.targets.map((target) => ({ pool, target })))
    .sort((a, b) => a.target.priority - b.target.priority);

  return (
    <div className="cp-table-wrap routing-target-table">
      <table className="cp-table">
        <thead>
          <tr><th>目标顺序</th><th>部署版本</th><th>角色</th><th>执行位置</th><th>容量</th><th>连接检查</th></tr>
        </thead>
        <tbody>
          {rows.map(({ pool, target }) => (
            <tr key={target.routingTargetId}>
              <td><strong>{target.priority}</strong></td>
              <td><code>{target.deploymentVersionId}</code></td>
              <td>{target.role === 'preferred' ? '首选' : target.role === 'emergency' ? '应急' : '标准'}</td>
              <td>{poolName(pool.poolId)}</td>
              <td>并发 {target.maxConcurrentJobs} · 单项目 {target.perProjectMax} · 队列 {target.queueLimit}</td>
              <td>服务端影响检查</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cp-subcard">
        <strong>目标耗尽后的处理</strong>
        <p className="cp-muted">人工工作台是全部真实目标均确定失败后的领域出口，不占目标序号、连接检查或引擎容量。</p>
      </div>
    </div>
  );
};

const AuditRow = ({ event }: { event: SystemControlRoutingAuditEvent }) => (
  <li className="audit-event">
    <div className="cp-row-between">
      <strong>{auditText[event.action] ?? '路由变更'}</strong>
      <Badge value={event.result === 'succeeded' ? 'succeeded' : 'unknown'} />
    </div>
    <p>{event.actorSubject} · {formatDate(event.createdAt)}</p>
    <small>requestId: {event.requestId} · {event.routingVersionId}</small>
  </li>
);

const AuditAction = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <select aria-label="审计动作筛选" value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">全部动作</option>
    {(['routing_policy_created', 'routing_testing', 'routing_impact_checked', 'routing_approved', 'routing_published', 'routing_rollback'] as SystemControlRoutingAuditAction[]).map((item) => (
      <option key={item} value={item}>{auditText[item]}</option>
    ))}
  </select>
);

export const ChangesPage = () => {
  const [stage, setStage] = useState<SystemControlRoutingWorkflowStage | ''>('');
  const [status, setStatus] = useState('');
  const [routeOffset, setRouteOffset] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditAction, setAuditAction] = useState('');
  const [selected, setSelected] = useState<SystemControlRoutingPolicyVersion | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [confirm, setConfirm] = useState<'publish' | 'rollback' | null>(null);
  const [pending, setPending] = useState<{ id: string; kind: 'publish' | 'rollback' } | null>(null);
  const focusFeedback = useRef<HTMLHeadingElement>(null);
  const routeQuery = useMemo(() => {
    const params = new URLSearchParams({ environment: 'development', limit: String(PAGE_SIZE), offset: String(routeOffset) });
    if (stage) params.set('workflowStage', stage);
    if (status) params.set('status', status);
    return params.toString();
  }, [stage, status, routeOffset]);
  const routes = useAsyncRead((signal) => listRouting(routeQuery, signal), [routeQuery]);
  const auditQuery = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(auditOffset) });
    if (selected?.routingVersionId) params.set('routingVersionId', selected.routingVersionId);
    if (auditAction) params.set('action', auditAction);
    return params.toString();
  }, [selected?.routingVersionId, auditAction, auditOffset]);
  const audit = useAsyncRead((signal) => listAudit(auditQuery, signal), [auditQuery]);
  const items = routes.data?.items ?? [];

  useEffect(() => {
    setRouteOffset(0);
    setSelected(null);
    setPending(null);
    setActionError(null);
  }, [stage, status]);
  useEffect(() => { setAuditOffset(0); }, [selected?.routingVersionId, auditAction]);

  const refreshRoutes = async () => { await routes.reload(); await audit.reload(); };
  const executeTransition = async (action: 'test' | 'impact-check' | 'approve') => {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await transitionRouting(selected.routingVersionId, action, createStableId());
      setSelected(result);
      await refreshRoutes();
      focusFeedback.current?.focus();
    } catch (error) {
      setActionError(error);
      setPending(null);
      try { setSelected(await getRouting(selected.routingVersionId)); } catch { /* 主错误已保留 */ }
      finally { await refreshRoutes(); }
    } finally { setBusy(false); }
  };
  const executeRelease = async (kind: 'publish' | 'rollback') => {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    const releaseCommandId = createStableId();
    const targetRoutingVersionId = selected.routingVersionId;
    try {
      const result = kind === 'publish'
        ? await publishRouting(selected.routingVersionId, releaseCommandId, createStableId())
        : await rollbackRouting(selected.routingVersionId, releaseCommandId, targetRoutingVersionId, createStableId());
      setSelected(result);
      setConfirm(null);
      setPending(null);
      await refreshRoutes();
      focusFeedback.current?.focus();
    } catch (error) {
      if (isUnknownResult(error)) {
        setPending({ id: releaseCommandId, kind });
        setConfirm(null);
      } else {
        setPending(null);
        setConfirm(null);
        await refreshRoutes();
      }
      setActionError(error);
    } finally { setBusy(false); }
  };
  const recover = async () => {
    if (!pending) return;
    setBusy(true);
    setActionError(null);
    try {
      const command = await getRoutingCommand(pending.id);
      setSelected(command.policy);
      setPending(null);
      await refreshRoutes();
      setConfirm(null);
      focusFeedback.current?.focus();
    } catch (error) { setActionError(error); }
    finally { setBusy(false); }
  };

  const activeSelected = selected?.status === 'active';
  const routeData = routes.data;
  const auditData = audit.data;

  return (
    <div className="cp-page" data-testid="changes-page">
      <header className="cp-page-head">
        <div><h1 ref={focusFeedback} tabIndex={-1}>变更与审计</h1><p>服务端状态链：草稿 → 测试 → 影响检查 → 批准 → 生效/退役；发布与回滚使用稳定 releaseCommandId。</p></div>
        {!routes.error ? <button className="cp-secondary" type="button" onClick={() => void refreshRoutes()} disabled={routes.refreshing}>重新读取</button> : null}
      </header>
      <section className="cp-toolbar">
        <select aria-label="工作流阶段筛选" value={stage} onChange={(event) => setStage(event.target.value as SystemControlRoutingWorkflowStage | '')}><option value="">全部工作流</option><option value="asr">语音识别</option><option value="screen_text">画面字</option><option value="terms">术语提取</option></select>
        <select aria-label="路由状态筛选" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option>{['draft', 'testing', 'impact_checked', 'approved', 'active', 'retired'].map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </section>
      {actionError ? <ErrorBlock error={actionError} showRetry={false} focusOnMount={!pending} title="操作失败，服务端事实未被伪造。" /> : null}
      {pending ? <CommandRecovery kind="release" identity={pending.id} onRecover={() => void recover()} busy={busy} /> : null}
      {routes.error ? <ErrorBlock error={routes.error} stale={Boolean(routeData)} onRetry={() => routes.reload(() => focusFeedback.current?.focus())} busy={routes.refreshing} /> : null}
      {routes.loading && !routeData ? <LoadingBlock /> : routeData && items.length === 0 ? <EmptyBlock title="暂无路由变更" detail={`当前筛选页为空，服务端 total=${routeData.total}；不会显示匿名样例。`} /> : routeData ? (
        <>
          <div className="cp-changes-grid">
            <section className="cp-panel">
              <div className="cp-section-head"><h2>版本状态链</h2><span className="cp-muted">服务端 total {routeData.total}</span></div>
              {items.map((item) => <PolicyLine key={item.routingVersionId} policy={item} selected={selected?.routingVersionId === item.routingVersionId} onSelect={() => setSelected(item)} />)}
              <div className="cp-pagination"><span>{routeData.offset + 1}–{Math.min(routeData.offset + PAGE_SIZE, routeData.total)} / {routeData.total}</span><button className="cp-secondary" type="button" disabled={routeData.offset === 0} onClick={() => setRouteOffset(Math.max(0, routeData.offset - PAGE_SIZE))}>上一页</button><button className="cp-secondary" type="button" disabled={routeData.offset + PAGE_SIZE >= routeData.total} onClick={() => setRouteOffset(routeData.offset + PAGE_SIZE)}>下一页</button></div>
            </section>
            <section className="cp-panel cp-detail-panel">
              {selected ? <>
                <div className="cp-section-head"><div><h2>v{selected.version} · {stageName(selected.workflowStage)}</h2><span className="cp-muted">{selected.routingVersionId}</span></div><Badge value={selected.status} /></div>
                <p className="cp-notice">{statusDescription[selected.status]}</p>
                <TargetRows policy={selected} />
                {selected.impact ? <div className={`cp-impact ${selected.impact.hardBlocks.length ? 'blocked' : ''}`}><strong>{selected.impact.hardBlocks.length ? '硬阻断：不可批准/发布' : '影响检查已通过读取'}</strong><span>真实目标 {selected.pools.flatMap((pool) => pool.targets).length} · 受影响工作流 {selected.impact.affectedWorkflowStages.join('、') || '暂无'} · 活动任务 {selected.impact.activeTaskCount} · 失败连接检查 {selected.impact.failingConnectionTestCount} · 待对账 {selected.impact.reconciliationRequiredTaskCount}</span>{selected.impact.hardBlocks.map((block) => <p key={block}>{block}</p>)}</div> : null}
                <div className="cp-row-actions">{selected.status === 'draft' ? <button className="cp-secondary" type="button" onClick={() => void executeTransition('test')} disabled={busy}>开始测试</button> : null}{selected.status === 'testing' ? <button className="cp-secondary" type="button" onClick={() => void executeTransition('impact-check')} disabled={busy}>检查影响</button> : null}{selected.status === 'impact_checked' ? <button className="cp-primary" type="button" onClick={() => void executeTransition('approve')} disabled={busy || Boolean(selected.impact?.hardBlocks.length)}>批准</button> : null}{selected.status === 'approved' ? <button className="cp-primary" type="button" onClick={() => setConfirm('publish')} disabled={busy}>发布到 active</button> : null}{(selected.status === 'approved' || selected.status === 'retired') && !activeSelected ? <button className="cp-secondary" type="button" onClick={() => setConfirm('rollback')} disabled={busy}>回滚到此版本</button> : null}</div>
              </> : <EmptyBlock title="选择一份变更" detail="左侧只展示服务端返回的路由版本；active 当前版本不提供回滚自身。" />}
            </section>
          </div>
          <section className="cp-panel">
            <div className="cp-section-head"><div><h2>服务端审计</h2><span className="cp-muted">真实 total {auditData?.total ?? '—'}</span></div><AuditAction value={auditAction} onChange={setAuditAction} /></div>
            {audit.error ? <ErrorBlock error={audit.error} stale={Boolean(auditData)} onRetry={() => audit.reload(() => focusFeedback.current?.focus())} busy={audit.refreshing} /> : null}
            {audit.loading && !auditData ? <LoadingBlock /> : auditData?.items.length ? <><ul className="audit-list">{auditData.items.map((event) => <AuditRow key={event.eventId} event={event} />)}</ul><div className="cp-pagination"><span>{auditData.offset + 1}–{Math.min(auditData.offset + PAGE_SIZE, auditData.total)} / {auditData.total}</span><button className="cp-secondary" type="button" disabled={auditData.offset === 0} onClick={() => setAuditOffset(Math.max(0, auditData.offset - PAGE_SIZE))}>上一页</button><button className="cp-secondary" type="button" disabled={auditData.offset + PAGE_SIZE >= auditData.total} onClick={() => setAuditOffset(auditData.offset + PAGE_SIZE)}>下一页</button></div></> : <EmptyBlock title="暂无审计事实" detail={`当前筛选页为空，服务端 total=${auditData?.total ?? 0}。`} />}
          </section>
        </>
      ) : null}
      {confirm ? <Modal title={confirm === 'publish' ? '保护确认发布' : '保护确认回滚'} onClose={() => setConfirm(null)} onSubmit={(event) => { event.preventDefault(); void executeRelease(confirm); }} busy={busy} submitLabel={confirm === 'publish' ? '确认发布' : '确认回滚'}><p className="cp-notice">{confirm === 'publish' ? '仅已批准版本可发布；未知结果只能查询同一 releaseCommandId。' : '仅 approved/retired 历史版本可作为回滚目标；不会回滚 active 当前版本。'}</p><dl className="cp-definition"><div><dt>路由版本</dt><dd>{selected?.routingVersionId}</dd></div><div><dt>当前状态</dt><dd>{selected ? (statusDescription[selected.status] ?? selected.status) : '—'}</dd></div></dl></Modal> : null}
    </div>
  );
};
