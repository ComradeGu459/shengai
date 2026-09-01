import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type {
  SystemControlEngineCapability,
  SystemControlSecretDiscoveryCandidate,
  SystemControlSecretReference,
  SystemControlSecretReferenceStatus,
  SystemControlSecretReferenceVersion,
  SystemControlSecretRevokePreflight,
} from '@qimao-terms-cloud/contracts';
import { Badge, EmptyBlock, ErrorBlock, Field, LoadingBlock, Modal, formatDate, useAsyncRead } from './controlPrimitives.js';
import { ControlApiError, createStableId, isUnknownResult } from './systemApi.js';
import {
  createSecretReference,
  createSecretValidation,
  getSecretCommand,
  getSecretReference,
  getSecretRevokePreflight,
  getSecretValidation,
  getSecurityOverview,
  listSecretAudit,
  listSecretDiscovery,
  listSecretReferences,
  listSecretUsage,
  listSecretValidations,
  listSecretVersions,
  revokeSecretReference,
  rotateSecretReference,
} from './secretApi.js';

const PAGE_SIZE = 20;
const RECOVERY_KEY = 'system-control-secret-recovery';
type Recovery = { kind: 'command' | 'validation'; id: string; label: string };
type Workflow = { kind: 'register'; candidate: SystemControlSecretDiscoveryCandidate } | { kind: 'rotate'; candidate: SystemControlSecretDiscoveryCandidate } | { kind: 'revoke'; preflight: SystemControlSecretRevokePreflight };

const STATUS_LABELS: Record<SystemControlSecretReferenceStatus, string> = {
  available: '可用于新版本', validation_failed: '验证失败', unknown: '结果未知', rotation_due: '待轮换', revoked: '已撤销',
};
const VALIDATION_LABELS: Record<string, string> = { queued: '排队中', running: '验证中', succeeded: '通过', failed: '失败', unknown: '结果未知' };
const capabilityLabel = (value: SystemControlEngineCapability) => value === 'asr' ? '中文语音识别' : '画面字识别';
const safeRecovery = (): Recovery | null => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) ?? 'null') as Recovery | null;
    return parsed
      && (parsed.kind === 'command' || parsed.kind === 'validation')
      && typeof parsed.id === 'string'
      && typeof parsed.label === 'string'
      && parsed.id.length <= 120
      && parsed.label.length <= 20
      ? parsed
      : null;
  } catch { return null; }
};
const saveRecovery = (value: Recovery | null) => { if (value) sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(value)); else sessionStorage.removeItem(RECOVERY_KEY); };

const PageButtons = ({ offset, total, onChange }: { offset: number; total: number; onChange: (value: number) => void }) => <div className="cp-pagination"><span>{total ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} / ${total}` : '0 条'}</span><button className="cp-secondary" type="button" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))}>上一页</button><button className="cp-secondary" type="button" disabled={offset + PAGE_SIZE >= total} onClick={() => onChange(offset + PAGE_SIZE)}>下一页</button></div>;

const SecurityError = ({ error, title, action, onAction, busy }: { error: unknown; title: string; action: string; onAction: () => void; busy: boolean }) => {
  const actionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!busy) actionRef.current?.focus(); }, [error, busy]);
  const parsed = error instanceof ControlApiError ? error : new ControlApiError(error instanceof Error ? error.message : '操作失败');
  return <div className="cp-state cp-error" role="alert"><div><strong>{title}</strong><span>{parsed.message}{parsed.requestId ? ` · requestId: ${parsed.requestId}` : ''}</span></div><button ref={actionRef} className="cp-primary" type="button" onClick={onAction} disabled={busy}>{busy ? '读取中…' : action}</button></div>;
};

const ReadinessBand = ({ data }: { data: Awaited<ReturnType<typeof getSecurityOverview>> }) => {
  const access = data.access;
  const facts = [
    ['安全存储发现', data.provider.status === 'ready' ? '可读取候选' : data.provider.status === 'not_configured' ? '未配置' : '状态未知'],
    ['员工站 Access', access.employeeAudienceConfigured && access.issuerConfigured ? '本地边界已就绪' : '未配置'],
    ['控制台 Access', access.controlAudienceConfigured && access.issuerConfigured ? '本地边界已就绪' : '未配置'],
    ['真实供应商连接', '尚未接入'],
  ];
  return <section className="security-readiness"><div className="cp-section-head"><div><h2>安全接入就绪状态</h2><span>服务端只读摘要 · {formatDate(data.generatedAt)}</span></div><Badge value={data.provider.status === 'ready' ? 'succeeded' : 'unknown'} /></div><div className="security-readiness-grid">{facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>;
};

const RecoveryBlock = ({ value, busy, error, onRecover }: { value: Recovery; busy: boolean; error: unknown; onRecover: () => void }) => {
  const action = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!busy) action.current?.focus(); }, [value.id, busy, error]);
  return <div className="security-recovery">{error ? <ErrorBlock error={error} showRetry={false} title="本次查询仍未返回确定结果" /> : null}<div className="cp-state cp-warning" role="status"><div><strong>{value.label}结果暂时未知</strong><span>没有重发原命令；只查询同一稳定身份：{value.id}</span></div><button ref={action} className="cp-primary" type="button" onClick={onRecover} disabled={busy}>{busy ? '查询中…' : `查询本次${value.label}结果`}</button></div></div>;
};

export const SecurityPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [capability, setCapability] = useState('');
  const [sort, setSort] = useState('updated_desc');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<SystemControlSecretReference | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<SystemControlSecretReferenceVersion | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [workflowError, setWorkflowError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [revokeBlocked, setRevokeBlocked] = useState<SystemControlSecretRevokePreflight | null>(null);
  const [recovery, setRecoveryState] = useState<Recovery | null>(() => safeRecovery());
  const [busy, setBusy] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const candidateHeading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const referencesQuery = useMemo(() => { const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), sort }); if (search.trim()) params.set('search', search.trim()); if (status) params.set('status', status); if (capability) params.set('capability', capability); return params.toString(); }, [search, status, capability, sort, offset]);
  const overview = useAsyncRead((signal) => getSecurityOverview(signal), []);
  const references = useAsyncRead((signal) => listSecretReferences(referencesQuery, signal), [referencesQuery]);
  const discovery = useAsyncRead((signal) => listSecretDiscovery('limit=100&offset=0', signal), []);
  const detail = useAsyncRead((signal) => selected ? getSecretReference(selected.secretReferenceId, signal) : Promise.resolve<SystemControlSecretReference | null>(null), [selected?.secretReferenceId]);
  const versions = useAsyncRead((signal) => selected ? listSecretVersions(selected.secretReferenceId, 'limit=20&offset=0', signal) : Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 }), [selected?.secretReferenceId]);
  const usage = useAsyncRead((signal) => selected ? listSecretUsage(selected.secretReferenceId, 'limit=20&offset=0', signal) : Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 }), [selected?.secretReferenceId]);
  const audit = useAsyncRead((signal) => selected ? listSecretAudit(selected.secretReferenceId, 'limit=20&offset=0', signal) : Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 }), [selected?.secretReferenceId]);
  const validations = useAsyncRead((signal) => selected && selectedVersion ? listSecretValidations(selected.secretReferenceId, selectedVersion.secretReferenceVersionId, 'limit=20&offset=0', signal) : Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 }), [selected?.secretReferenceId, selectedVersion?.secretReferenceVersionId]);
  useEffect(() => { setOffset(0); setSelected(null); setSelectedVersion(null); }, [search, status, capability, sort]);
  useEffect(() => { setSelectedVersion(null); setRevokeBlocked(null); }, [selected?.secretReferenceId]);
  useEffect(() => { if (versions.data?.items.length && !selectedVersion) setSelectedVersion(versions.data.items[0]!); }, [versions.data, selectedVersion]);
  const setRecovery = (value: Recovery | null) => { saveRecovery(value); setRecoveryState(value); };
  const refreshAll = async () => { await Promise.all([overview.reload(), references.reload(), discovery.reload(), detail.reload(), versions.reload(), usage.reload(), audit.reload(), validations.reload()]); };
  const recover = async () => {
    if (!recovery) return;
    setBusy(true); setActionError(null);
    try {
      if (recovery.kind === 'command') await getSecretCommand(recovery.id); else await getSecretValidation(recovery.id);
      setRecovery(null); await refreshAll(); title.current?.focus();
    } catch (error) { setActionError(error); }
    finally { setBusy(false); }
  };
  const failWrite = async (error: unknown, next: Recovery) => {
    if (isUnknownResult(error)) { setWorkflow(null); setRecovery(next); setActionError(error); return; }
    setWorkflowError(error); setRecovery(null); await Promise.all([references.reload(), discovery.reload(), detail.reload(), versions.reload()]);
  };
  const submitWorkflow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!workflow || busy) return;
    setBusy(true); setWorkflowError(null); setActionError(null);
    const form = new FormData(event.currentTarget);
    const commandId = createStableId();
    const idempotencyKey = createStableId();
    try {
      if (workflow.kind === 'register') {
        await createSecretReference({ commandId, secretReferenceId: createStableId(), secretReferenceVersionId: createStableId(), candidateId: workflow.candidate.candidateId, displayName: String(form.get('displayName') ?? workflow.candidate.displayName) }, idempotencyKey);
      } else if (workflow.kind === 'rotate' && selected) {
        await rotateSecretReference(selected.secretReferenceId, { rotationCommandId: commandId, secretReferenceVersionId: createStableId(), candidateId: workflow.candidate.candidateId }, idempotencyKey);
      } else if (workflow.kind === 'revoke' && selected && selectedVersion) {
        await revokeSecretReference(selected.secretReferenceId, selectedVersion.secretReferenceVersionId, { revokeCommandId: commandId, reason: String(form.get('reason') ?? '').trim() }, idempotencyKey);
      }
      setWorkflow(null); setRecovery(null); await refreshAll(); feedback.current?.focus();
    } catch (error) {
      const label = workflow.kind === 'register' ? '登记' : workflow.kind === 'rotate' ? '轮换' : '撤销';
      await failWrite(error, { kind: 'command', id: commandId, label });
    } finally { setBusy(false); }
  };
  const openRegister = (candidate?: SystemControlSecretDiscoveryCandidate) => {
    const target = candidate ?? discovery.data?.items.find((item) => item.status === 'available');
    if (target) { setWorkflowError(null); setWorkflow({ kind: 'register', candidate: target }); }
    else { candidateHeading.current?.scrollIntoView({ block: 'start' }); candidateHeading.current?.focus(); }
  };
  const openRotate = () => {
    const target = discovery.data?.items.find((item) => item.status === 'available'
      && (!selected || (item.capability === selected.capability && item.provider === selected.provider)));
    if (target) { setWorkflowError(null); setWorkflow({ kind: 'rotate', candidate: target }); }
    else { candidateHeading.current?.scrollIntoView({ block: 'start' }); candidateHeading.current?.focus(); }
  };
  const openRevoke = async () => {
    if (!selected || !selectedVersion) return;
    setBusy(true); setActionError(null); setRevokeBlocked(null);
    try { const preflight = await getSecretRevokePreflight(selected.secretReferenceId, selectedVersion.secretReferenceVersionId); if (preflight.canRevoke) setWorkflow({ kind: 'revoke', preflight }); else setRevokeBlocked(preflight); }
    catch (error) { setActionError(error); }
    finally { setBusy(false); }
  };
  const runValidation = async () => {
    if (!selectedVersion || busy) return;
    setBusy(true); setActionError(null); const validationRunId = createStableId();
    try { await createSecretValidation({ validationRunId, secretReferenceVersionId: selectedVersion.secretReferenceVersionId }, createStableId()); await validations.reload(); }
    catch (error) { if (isUnknownResult(error)) { setRecovery({ kind: 'validation', id: validationRunId, label: '验证' }); setActionError(error); } else { setActionError(error); await validations.reload(); } }
    finally { setBusy(false); }
  };
  const refreshCandidates = async () => { setBusy(true); try { await discovery.reload(); setWorkflowError(null); } finally { setBusy(false); } };
  const refreshWorkflowFacts = async () => {
    setBusy(true);
    try { await refreshAll(); setWorkflowError(null); }
    finally { setBusy(false); }
  };
  const unavailable = Boolean(overview.loading || overview.error || references.error || overview.data?.provider.status !== 'ready');
  return <div className="cp-page security-page" data-testid="security-page">
    <header className="cp-page-head"><div><h1 ref={title} tabIndex={-1}>密钥与安全</h1><p>管理服务器发现候选、稳定安全引用、不可变版本、零网络验证、轮换与撤销保护；页面始终不接触 Secret 值。</p></div><div className="cp-row-actions"><button className="cp-secondary" type="button" onClick={() => { candidateHeading.current?.scrollIntoView({ block: 'start' }); candidateHeading.current?.focus(); }}>发现服务器候选</button><button className="cp-primary" type="button" onClick={() => openRegister()} disabled={unavailable || !discovery.data?.items.some((item) => item.status === 'available')}>登记引用</button></div></header>
    <div ref={feedback} className="cp-feedback" role="status" aria-live="polite" tabIndex={-1}>{recovery ? '存在结果未知的安全命令，请只查询同一稳定身份。' : actionError ? '操作未完成，服务端旧事实保持不变。' : ''}</div>
    {overview.error ? <ErrorBlock error={overview.error} stale={Boolean(overview.data)} onRetry={() => overview.reload(() => title.current?.focus())} busy={overview.refreshing} focusOnMount /> : null}
    {overview.loading && !overview.data ? <LoadingBlock label="读取安全接入就绪状态…" /> : overview.data ? <ReadinessBand data={overview.data} /> : null}
    {recovery ? <RecoveryBlock value={recovery} busy={busy} error={actionError} onRecover={() => void recover()} /> : actionError ? <ErrorBlock error={actionError} showRetry={false} focusOnMount title="操作失败，安全引用事实未被改写" /> : null}
    <section className="cp-panel"><div className="cp-section-head"><div><h2>安全引用</h2><span className="cp-muted">服务端搜索、筛选、排序与稳定分页</span></div></div><div className="cp-toolbar"><input aria-label="搜索安全引用" placeholder="业务别名或用途" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="安全引用状态筛选" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="安全引用能力筛选" value={capability} onChange={(event) => setCapability(event.target.value)}><option value="">全部能力</option><option value="asr">中文语音识别</option><option value="screen_text">画面字识别</option></select><select aria-label="安全引用排序" value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated_desc">最近更新</option><option value="updated_asc">最早更新</option><option value="display_name_asc">名称升序</option><option value="validation_desc">最近验证</option></select></div>
      {references.error ? <ErrorBlock error={references.error} stale={Boolean(references.data)} onRetry={() => references.reload(() => title.current?.focus())} busy={references.refreshing} focusOnMount /> : null}{references.loading && !references.data ? <LoadingBlock /> : references.data?.items.length ? <><div className="cp-table-wrap security-table-wrap"><table className="cp-table security-reference-table"><thead><tr><th>业务别名 / ID</th><th>用途</th><th>来源</th><th>状态</th><th>当前版本</th><th>绑定部署</th><th>最后验证</th><th>轮换提示</th><th>操作</th></tr></thead><tbody>{references.data.items.map((item) => <tr key={item.secretReferenceId}><td><button className="cp-link" type="button" onClick={() => setSelected(item)}>{item.displayName}</button><small>{item.secretReferenceId}</small></td><td>{capabilityLabel(item.capability)}</td><td>{item.provider}</td><td><Badge value={item.latestStatus ?? 'unknown'} /></td><td>{item.latestVersionId ? '已建立' : '—'}</td><td>{item.boundDeploymentCount}</td><td>{formatDate(item.latestValidationAt)}</td><td>{item.rotationDue ? formatDate(item.rotationDueAt) : '未到期'}</td><td><button className="cp-secondary" type="button" onClick={() => setSelected(item)}>查看详情</button></td></tr>)}</tbody></table></div><PageButtons offset={references.data.offset} total={references.data.total} onChange={setOffset} /></> : <EmptyBlock title="暂无安全引用" detail="服务器候选不会自动登记；请通过明确的登记动作创建稳定引用。" />}
    </section>
    <section className="cp-panel"><div className="cp-section-head"><div><h2 ref={candidateHeading} tabIndex={-1}>服务器发现候选</h2><span className="cp-muted">只显示业务别名、适用范围和脱敏摘要</span></div><button className="cp-secondary" type="button" onClick={() => void discovery.reload()} disabled={discovery.refreshing}>重新发现</button></div>{discovery.error ? <ErrorBlock error={discovery.error} stale={Boolean(discovery.data)} onRetry={() => discovery.reload(() => candidateHeading.current?.focus())} busy={discovery.refreshing} /> : null}{discovery.loading && !discovery.data ? <LoadingBlock /> : discovery.data?.items.length ? <div className="cp-table-wrap security-table-wrap"><table className="cp-table security-candidate-table"><thead><tr><th>候选别名</th><th>能力</th><th>来源</th><th>脱敏摘要</th><th>最近发现</th><th>状态</th><th>操作</th></tr></thead><tbody>{discovery.data.items.map((item) => <tr key={item.candidateId}><td>{item.displayName}</td><td>{capabilityLabel(item.capability)}</td><td>{item.provider}</td><td>{item.redactedLabel}</td><td>{formatDate(item.discoveredAt)}</td><td><Badge value={item.status === 'available' ? 'succeeded' : 'unknown'} /></td><td><button className="cp-secondary" type="button" disabled={item.status !== 'available' || unavailable} onClick={() => openRegister(item)}>登记为安全引用</button></td></tr>)}</tbody></table></div> : <EmptyBlock title="服务器尚未发现候选" detail="请先在服务器安全存储配置；此页面不提供 Secret 输入。" />}</section>
    {selected ? <aside className="cp-drawer security-detail" aria-label="安全引用详情"><div className="cp-drawer-head"><div><h2>{detail.data?.displayName ?? selected.displayName}</h2><span>{selected.secretReferenceId}</span></div><button className="cp-icon-button" type="button" aria-label="关闭安全引用详情" onClick={() => setSelected(null)}>×</button></div>{detail.error ? <ErrorBlock error={detail.error} stale={Boolean(detail.data)} onRetry={() => detail.reload()} busy={detail.refreshing} /> : null}<div className="cp-detail-grid"><div><span>用途</span><strong>{capabilityLabel(selected.capability)}</strong></div><div><span>来源</span><strong>{selected.provider}</strong></div><div><span>状态</span><Badge value={selected.latestStatus ?? 'unknown'} /></div><div><span>绑定部署</span><strong>{selected.boundDeploymentCount}</strong></div></div><div className="cp-section-head"><h3>不可变版本</h3><button className="cp-secondary" type="button" onClick={openRotate} disabled={unavailable}>创建轮换版本</button></div>{versions.loading && !versions.data ? <LoadingBlock /> : versions.data?.items.length ? <div className="security-version-list">{versions.data.items.map((item) => <button type="button" className={`security-version ${selectedVersion?.secretReferenceVersionId === item.secretReferenceVersionId ? 'selected' : ''}`} key={item.secretReferenceVersionId} onClick={() => { setSelectedVersion(item); setRevokeBlocked(null); }}><span>v{item.version} · {item.redactedLabel}</span><Badge value={item.status} /></button>)}</div> : <EmptyBlock title="暂无引用版本" detail="版本只由明确登记或轮换命令创建。" />}{selectedVersion ? <><div className="cp-section-head security-subhead"><div><h3>零网络验证</h3><span className="cp-muted">{selectedVersion.secretReferenceVersionId}</span></div><button className="cp-secondary" type="button" onClick={() => void runValidation()} disabled={busy || selectedVersion.status === 'revoked'}>新建验证</button></div>{validations.error ? <ErrorBlock error={validations.error} stale={Boolean(validations.data)} onRetry={() => validations.reload()} busy={validations.refreshing} /> : validations.data?.items.length ? <div className="security-validation-list">{validations.data.items.map((item) => <div className="cp-subcard" key={item.validationRunId}><div className="cp-row-between"><strong>{VALIDATION_LABELS[item.status] ?? item.status}</strong><span>{formatDate(item.queuedAt)}</span></div><span className="cp-muted">{item.reasonMessage ?? `${item.attemptCount} 次尝试 · ${item.latencyMs ?? '—'} ms`} · requestId: {item.requestId}</span>{item.status === 'unknown' ? <button className="cp-primary" type="button" onClick={() => setRecovery({ kind: 'validation', id: item.validationRunId, label: '验证' })}>查询本次验证结果</button> : null}</div>)}</div> : <EmptyBlock title="暂无验证记录" detail="新版本必须先通过零网络验证，才能供引擎版本选择。" />}<div className="cp-row-actions security-danger-actions"><button className="cp-secondary" type="button" onClick={() => void openRevoke()} disabled={busy || selectedVersion.status === 'revoked'}>撤销此版本</button></div>{revokeBlocked ? <div className="cp-impact blocked" role="alert" tabIndex={-1}><strong>当前版本不能撤销</strong><span>当前路由 {revokeBlocked.activeRouteReferenceCount} · 非终态任务 {revokeBlocked.nonTerminalAttemptCount} · 绑定引擎版本 {revokeBlocked.affectedEngineDeploymentVersionCount}</span></div> : null}</> : null}<div className="cp-section-head security-subhead"><h3>使用位置</h3></div>{usage.data?.items.length ? <ul className="security-fact-list">{usage.data.items.map((item) => <li key={item.deploymentVersionId}><strong>{item.deploymentDisplayName} · v{item.deploymentVersion}</strong><span>{capabilityLabel(item.capability)} · {item.provider} · {formatDate(item.updatedAt)}</span></li>)}</ul> : <p className="cp-muted">当前没有绑定部署。</p>}<div className="cp-section-head security-subhead"><h3>最近审计</h3></div>{audit.data?.items.length ? <ul className="security-fact-list">{audit.data.items.map((item) => <li key={item.eventId}><strong>{item.action}</strong><span>{item.result} · {formatDate(item.createdAt)} · requestId: {item.requestId}</span></li>)}</ul> : <p className="cp-muted">暂无审计事实。</p>}</aside> : null}
    {workflow ? <Modal title={workflow.kind === 'register' ? '登记安全引用' : workflow.kind === 'rotate' ? '创建轮换版本' : '撤销安全引用版本'} onClose={() => { if (!busy) { setWorkflow(null); setWorkflowError(null); } }} onSubmit={submitWorkflow} busy={busy} submitLabel={workflow.kind === 'register' ? '登记安全引用' : workflow.kind === 'rotate' ? '创建轮换版本' : '确认撤销'}>{workflowError ? <SecurityError error={workflowError} title={workflow.kind === 'revoke' ? '本次撤销未生效' : workflow.kind === 'rotate' ? '未能创建轮换版本' : '未能登记安全引用'} action={workflow.kind === 'revoke' ? '重新读取安全引用' : '刷新候选'} onAction={() => workflow.kind === 'revoke' ? void refreshWorkflowFacts() : void refreshCandidates()} busy={busy} /> : null}{workflow.kind === 'register' ? <div className="cp-form-grid"><Field label="服务器发现候选"><input value={`${workflow.candidate.displayName} · ${capabilityLabel(workflow.candidate.capability)}`} readOnly /></Field><Field label="业务别名"><input name="displayName" defaultValue={workflow.candidate.displayName} required maxLength={120} /></Field><Field label="脱敏摘要"><input value={workflow.candidate.redactedLabel} readOnly /></Field><Field label="生效边界"><input value="验证通过后方可供新版本使用" readOnly /></Field></div> : workflow.kind === 'rotate' ? <div className="cp-form-grid"><Field label="当前引用"><input value={selected?.displayName ?? ''} readOnly /></Field><Field label="服务器候选"><input value={workflow.candidate.displayName} readOnly /></Field><Field label="脱敏摘要"><input value={workflow.candidate.redactedLabel} readOnly /></Field><Field label="轮换后动作"><input value="另行创建引擎版本并发布" readOnly /></Field></div> : <><dl className="security-preflight"><div><dt>当前路由引用</dt><dd>{workflow.preflight.activeRouteReferenceCount}</dd></div><div><dt>非终态任务</dt><dd>{workflow.preflight.nonTerminalAttemptCount}</dd></div><div><dt>绑定引擎版本</dt><dd>{workflow.preflight.affectedEngineDeploymentVersionCount}</dd></div></dl><Field label="撤销原因" hint="至少 8 个字符；撤销不删除历史、使用关系或审计。"><textarea name="reason" required minLength={8} maxLength={240} /></Field></>}</Modal> : null}
  </div>;
};
