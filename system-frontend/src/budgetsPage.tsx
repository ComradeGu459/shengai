import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type {
  SystemControlBudgetAuditEvent,
  SystemControlBudgetOverview,
  SystemControlBudgetPolicy,
  SystemControlBudgetPolicyList,
  SystemControlBudgetReservation,
  SystemControlBudgetRule,
  SystemControlBudgetTestRun,
  SystemControlBudgetUsage,
  SystemControlBudgetResourcePool,
  SystemControlBudgetPeriod,
  SystemControlCreateBudgetPolicyBody,
} from '@qimao-terms-cloud/contracts';
import {
  approveBudget,
  createBudgetPolicy,
  createBudgetTest,
  getBudgetOverview,
  getBudgetPolicy,
  getBudgetReleaseCommand,
  getBudgetReservation,
  getBudgetTest,
  impactCheckBudget,
  listBudgetAudit,
  listBudgetPolicies,
  listBudgetTests,
  listBudgetUsage,
  publishBudget,
  rollbackBudget,
} from './budgetApi.js';
import { ControlApiError, createStableId, isUnknownResult } from './systemApi.js';
import { Badge, CommandRecovery, EmptyBlock, ErrorBlock, Field, LoadingBlock, Modal, formatDate, useAsyncRead } from './controlPrimitives.js';

const PAGE_SIZE = 20;
const POLICY_STATUS: Record<string, string> = { draft: '草稿', testing: '测试中', impact_checked: '影响已检查', approved: '已批准', active: '生效中', retired: '已退役' };
const SCOPE_STATUS: Record<string, string> = { ok: '正常', warning: '提醒', blocked: '硬阻断', unblocked: '只统计和提醒，不阻断', missing_rule: '缺少规则' };
const TEST_STATUS: Record<string, string> = { queued: '排队中', running: '回放中', succeeded: '成功', failed: '失败', unknown: '未知' };
const RESERVATION_STATUS: Record<string, string> = { reserved: '已预留', settled: '已结算', released: '已释放', unknown: '未知', reconciliation_required: '待对账', overrun: '超出' };
const ACTION_LABEL: Record<string, string> = { budget_policy_created: '创建预算草稿', budget_testing: '预算回放', budget_impact_checked: '预算影响检查', budget_approved: '批准预算策略', budget_published: '发布预算策略', budget_rollback: '回滚预算策略' };
const poolLabel: Record<SystemControlBudgetResourcePool, string> = { asr_api: 'ASR API', ocr_api: 'OCR API' };
const periodLabel: Record<SystemControlBudgetPeriod, string> = { day: '日', month: '月' };
const makeRuleForm = () => (['asr_api', 'ocr_api'] as const).flatMap((resourcePool) => (['day', 'month'] as const).map((period) => ({ resourcePool, currency: 'CNY' as const, period, warningLimit: '', hardLimit: '' })));

type RuleForm = ReturnType<typeof makeRuleForm>[number];
type PendingRecovery = { kind: 'policy' | 'test' | 'release'; policyId?: string; testRunId?: string; releaseCommandId?: string; identity: string; source?: 'command' | 'history'; expectedStatus?: 'impact_checked' | 'approved'; releaseAction?: 'publish' | 'rollback' };

const BudgetBadge = ({ value }: { value: string }) => <span className={`budget-badge budget-${value.replaceAll('_', '-')}`}><i />{POLICY_STATUS[value] ?? SCOPE_STATUS[value] ?? TEST_STATUS[value] ?? RESERVATION_STATUS[value] ?? value}</span>;
const PageButtons = ({ offset, total, onChange, label = '条' }: { offset: number; total: number; onChange: (next: number) => void; label?: string }) => <div className="cp-pagination"><span>{total === 0 ? `0 ${label}` : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} / ${total}`}</span><button className="cp-secondary" type="button" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))}>上一页</button><button className="cp-secondary" type="button" disabled={offset + PAGE_SIZE >= total} onClick={() => onChange(offset + PAGE_SIZE)}>下一页</button></div>;

const amount = (value: string | null | undefined) => value === null || value === undefined ? '—' : value;
const scopeName = (resourcePool: SystemControlBudgetResourcePool, currency: string, period: SystemControlBudgetPeriod) => `${poolLabel[resourcePool]} · ${currency} · ${periodLabel[period]}`;
const businessFact = (value: string) => value
  .replace(/no_active_policy/gi, '当前没有生效策略')
  .replace(/^missing_currency_rule(?=[:：]|$)/i, '缺少币种规则')
  .replace(/^missing_conversion_snapshot(?=[:：]|$)/i, '缺少有效汇率快照')
  .replace(/postgresql/gi, '服务端账本')
  .replace(/billing/gi, '计费')
  .replace(/\bactive\b/gi, '当前生效')
  .replace(/\bactor\b/gi, '执行身份');

const OverviewPanel = ({ overview }: { overview: SystemControlBudgetOverview }) => {
  const enforcementEnabled = overview.activePolicy?.enforcementEnabled === true;
  const asrScopes = (['day', 'month'] as const).map((period) => ({
    period,
    scope: overview.scopes.find((item) => item.resourcePool === 'asr_api' && item.currency === 'CNY' && item.period === period),
  }));
  const gateDescription = enforcementEnabled
    ? '达到任一 ASR 日/月硬限额时，新的识别请求将被本地策略阻断。'
    : '预算仍记录用量并产生提醒；超过阈值也不会阻断新的识别请求。';
  return (
    <section className="budget-overview-grid">
      <article className="cp-panel budget-summary" aria-label="ASR 预算主状态">
        <div className="cp-section-head"><div><h2>预算账本总览</h2><span className="cp-muted">服务端时间 {formatDate(overview.databaseNow)} · 数据新鲜度 {formatDate(overview.dataFreshness)}</span></div><BudgetBadge value={overview.noActivePolicy ? 'missing_rule' : 'active'} /></div>
        <div className="budget-active-fact">
          <span>ASR 预算硬门</span>
          <strong>{enforcementEnabled ? '已开启，达到限额将阻断' : '只统计和提醒，不阻断'}</strong>
          <small>{gateDescription}</small>
          <small>下一步：{enforcementEnabled ? '如需恢复预算阻断任务，请先核对日/月额度与用量，再调整或关闭硬门。' : '继续关注日/月用量与提醒；无需恢复或重发识别任务。'}</small>
        </div>
        <ul className="budget-fact-list" aria-label="ASR 日月限额与用量">
          {asrScopes.map(({ period, scope }) => <li key={period}><strong>ASR {periodLabel[period]}限额</strong><span>{scope ? `占用 ${scope.totalAmount} CNY · 提醒 ${amount(scope.warningLimit)} · 硬限额 ${amount(scope.hardLimit)}` : '当前服务端未返回该账期规则；开启硬门前请补齐。'}</span><BudgetBadge value={scope?.status ?? 'missing_rule'} /></li>)}
        </ul>
        {overview.hardBlocks.length ? <div className="cp-impact blocked"><strong>服务端硬阻断</strong>{overview.hardBlocks.map((item) => <p key={item}>{businessFact(item)}</p>)}</div> : null}
        {overview.runtimeBlockedScopes?.length ? <div className="cp-impact blocked"><strong>将阻断的新请求范围</strong>{overview.runtimeBlockedScopes.map((item) => <p key={item}>{businessFact(item)}</p>)}</div> : null}
        {overview.runtimeWarningScopes?.length ? <div className="cp-impact"><strong>运行提醒</strong>{overview.runtimeWarningScopes.map((item) => <p key={item}>{businessFact(item)}</p>)}</div> : null}
      </article>
      <article className="cp-panel"><div className="cp-section-head"><div><h2>技术详情</h2><span className="cp-muted">策略身份与部署计费快照由服务端派生</span></div></div><details className="budget-technical-details"><summary>查看策略与计量覆盖</summary>{overview.activePolicy ? <dl className="budget-confirm"><div><dt>生效策略</dt><dd>v{overview.activePolicy.version} · <code>{overview.activePolicy.budgetPolicyVersionId}</code></dd></div></dl> : <p className="cp-muted">当前没有生效策略身份。</p>}{overview.meteredDeploymentCoverage.length ? <ul className="budget-fact-list">{overview.meteredDeploymentCoverage.map((item) => <li key={item.deploymentVersionId}><strong>{poolLabel[item.resourcePool]}</strong><span>{item.deploymentVersionId}</span><BudgetBadge value={item.covered ? 'ok' : 'missing_rule'} /></li>)}</ul> : <EmptyBlock title="暂无计量覆盖事实" detail="服务端尚未登记可纳管的计量部署版本。" />}</details></article>
    </section>
  );
};

const LedgerTable = ({ scopes }: { scopes: SystemControlBudgetOverview['scopes'] }) => scopes.length ? <div className="budget-table-wrap"><table className="cp-table budget-table"><thead><tr><th>资源池 / 币种 / 账期</th><th>已结算</th><th>预留</th><th>待对账</th><th>占用合计</th><th>提醒阈值</th><th>硬阻断阈值</th><th>剩余</th><th>状态</th></tr></thead><tbody>{scopes.map((scope) => <tr key={`${scope.resourcePool}-${scope.currency}-${scope.period}`}><td><strong>{scopeName(scope.resourcePool, scope.currency, scope.period)}</strong><small>{formatDate(scope.periodStart)} → {formatDate(scope.nextResetAt)}</small></td><td>{scope.settledAmount}</td><td>{scope.reservedAmount}</td><td>{scope.unknownAmount}</td><td>{scope.totalAmount}</td><td>{amount(scope.warningLimit)}</td><td>{amount(scope.hardLimit)}</td><td>{amount(scope.remaining)}</td><td><BudgetBadge value={scope.status} /></td></tr>)}</tbody></table></div> : <EmptyBlock title="暂无预算账本事实" detail="账本为空不等同于没有当前生效策略；请以服务端总览为准。" />;

const UsageTable = ({ items }: { items: SystemControlBudgetUsage[] }) => items.length ? <div className="budget-table-wrap"><table className="cp-table budget-table"><thead><tr><th>资源池 / 币种</th><th>估算</th><th>已结算</th><th>预留</th><th>待对账数</th><th>未知数</th></tr></thead><tbody>{items.map((item) => <tr key={`${item.resourcePool}-${item.currency}`}><td>{poolLabel[item.resourcePool]} · {item.currency}</td><td>{amount(item.estimatedAmount)}</td><td>{amount(item.settledAmount)}</td><td>{amount(item.reservedAmount)}</td><td>{item.pendingCount}</td><td>{item.unknownCount}</td></tr>)}</tbody></table></div> : <EmptyBlock title="暂无用量事实" detail="服务端尚未返回用量或预留摘要。" />;

const RuleTable = ({ rules }: { rules: SystemControlBudgetRule[] }) => rules.length ? <div className="budget-table-wrap"><table className="cp-table budget-table"><thead><tr><th>范围</th><th>提醒阈值</th><th>硬阻断阈值</th></tr></thead><tbody>{rules.map((rule) => <tr key={`${rule.resourcePool}-${rule.currency}-${rule.period}`}><td>{scopeName(rule.resourcePool, rule.currency, rule.period)}</td><td>{rule.warningLimit}</td><td>{rule.hardLimit}</td></tr>)}</tbody></table></div> : <EmptyBlock title="暂无策略规则" detail="策略规则由服务端保存；浏览器不补默认阈值。" />;

const ImpactPanel = ({ policy }: { policy: SystemControlBudgetPolicy }) => policy.impact ? <div className={`cp-impact ${policy.impact.hardBlocks.length || policy.impact.configurationHardBlocks?.length || policy.impact.runtimeBlockedScopes?.length ? 'blocked' : ''}`}><strong>{policy.impact.hardBlocks.length || policy.impact.configurationHardBlocks?.length ? '影响检查存在硬阻断' : policy.impact.runtimeBlockedScopes?.length ? '影响检查存在运行阻断范围' : '影响检查已返回'}</strong><span>提醒 {policy.impact.warningCount} · 在途预留 {policy.impact.activeReservationCount} · 待对账 {policy.impact.reconciliationRequiredCount}</span>{policy.impact.hardBlocks.map((item) => <p key={`hard-${item}`}>阻断：{businessFact(item)}</p>)}{policy.impact.configurationHardBlocks?.map((item) => <p key={`config-${item}`}>配置阻断：{businessFact(item)}</p>)}{policy.impact.runtimeBlockedScopes?.map((item) => <p key={`runtime-${item}`}>将阻断的新请求范围：{businessFact(item)}</p>)}{policy.impact.runtimeWarningScopes?.map((item) => <p key={`warning-${item}`}>运行提醒：{businessFact(item)}</p>)}</div> : <div className="cp-notice">尚未运行服务端影响检查；批准与发布仍受后端状态门禁。</div>;
const hasImpactHardBlock = (impact: SystemControlBudgetPolicy['impact']) => Boolean(impact?.hardBlocks.length);

type PolicyScope = SystemControlBudgetPolicy['rules'][number];
const scopeKey = (rule: PolicyScope) => `${rule.resourcePool}-${rule.currency}-${rule.period}`;
const RuleDiffTable = ({ active, target }: { active: SystemControlBudgetPolicy | null; target: SystemControlBudgetPolicy }) => {
  const rules = new Map<string, { active?: PolicyScope; target?: PolicyScope }>();
  active?.rules.forEach((rule) => rules.set(scopeKey(rule), { active: rule }));
  target.rules.forEach((rule) => rules.set(scopeKey(rule), { ...rules.get(scopeKey(rule)), target: rule }));
  return <div className="budget-table-wrap"><table className="cp-table budget-table"><thead><tr><th>阻断范围</th><th>旧提醒阈值</th><th>新提醒阈值</th><th>旧硬阻断阈值</th><th>新硬阻断阈值</th></tr></thead><tbody>{Array.from(rules.values()).map((pair, index) => <tr key={`${pair.active ? scopeKey(pair.active) : pair.target ? scopeKey(pair.target) : index}`}><td>{scopeName((pair.target ?? pair.active)!.resourcePool, (pair.target ?? pair.active)!.currency, (pair.target ?? pair.active)!.period)}</td><td>{amount(pair.active?.warningLimit)}</td><td>{amount(pair.target?.warningLimit)}</td><td>{amount(pair.active?.hardLimit)}</td><td>{amount(pair.target?.hardLimit)}</td></tr>)}</tbody></table></div>;
};

const ImpactFacts = ({ impact }: { impact: NonNullable<SystemControlBudgetPolicy['impact']> }) => <div className="cp-impact"><strong>服务端影响事实</strong><span>在途预留 {impact.activeReservationCount} · 待对账 {impact.reconciliationRequiredCount} · 提醒 {impact.warningCount}</span>{impact.hardBlocks.map((item) => <p key={`impact-${item}`}>服务端阻断：{businessFact(item)}</p>)}{impact.configurationHardBlocks?.map((item) => <p key={`configuration-${item}`}>配置阻断范围：{businessFact(item)}</p>)}{impact.runtimeBlockedScopes?.map((item) => <p key={`runtime-${item}`}>将阻断的新请求范围：{businessFact(item)}</p>)}{impact.runtimeWarningScopes?.map((item) => <p key={`runtime-warning-${item}`}>运行提醒范围：{businessFact(item)}</p>)}{!impact.hardBlocks.length && !impact.configurationHardBlocks?.length && !impact.runtimeBlockedScopes?.length ? <p>服务端未返回需要阻断的新请求范围。</p> : null}</div>;

const ReleaseRecovery = ({ action, identity, onRecover, busy }: { action: 'publish' | 'rollback'; identity: string; onRecover: () => void; busy: boolean }) => {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!busy) button.current?.focus(); }, [identity, busy]);
  const isRollback = action === 'rollback';
  return <div className="cp-state cp-warning" role="alert"><strong>预算{isRollback ? '回滚' : '发布'}结果未知</strong><span>未重发原命令；请只读取同一稳定身份：{identity}。</span><button ref={button} className="cp-primary" type="button" onClick={onRecover} disabled={busy}>{busy ? '查询中…' : `查询本次预算${isRollback ? '回滚' : '发布'}结果`}</button></div>;
};

const TestRows = ({ items, pending, busy, onQuery }: { items: SystemControlBudgetTestRun[]; pending: string | null; busy: boolean; onQuery: (id: string) => void }) => items.length ? <div className="budget-table-wrap"><table className="cp-table budget-table"><thead><tr><th>创建时间</th><th>状态</th><th>结果</th><th>requestId</th><th>动作</th></tr></thead><tbody>{items.map((item) => <tr key={item.budgetTestRunId}><td>{formatDate(item.createdAt)}</td><td><BudgetBadge value={item.status} /></td><td>{item.reasonMessage ?? (item.result ? '服务端已返回结果' : '—')}</td><td>{item.requestId}</td><td>{item.status === 'unknown' ? pending === item.budgetTestRunId ? <CommandRecovery kind="budget-test" identity={item.budgetTestRunId} onRecover={() => onQuery(item.budgetTestRunId)} busy={busy} /> : <button className="cp-primary" type="button" onClick={() => onQuery(item.budgetTestRunId)}>查询本次预算回放结果</button> : null}</td></tr>)}</tbody></table></div> : <EmptyBlock title="暂无预算回放历史" detail="服务端尚未登记该策略的测试运行。" />;

const RuleEditor = ({ rules, onChange }: { rules: RuleForm[]; onChange: (next: RuleForm[]) => void }) => <div className="budget-table-wrap"><table className="cp-table budget-table budget-editor"><thead><tr><th>范围</th><th>提醒阈值（精确十进制）</th><th>硬阻断阈值（精确十进制）</th></tr></thead><tbody>{rules.map((rule, index) => <tr key={`${rule.resourcePool}-${rule.currency}-${rule.period}`}><td>{scopeName(rule.resourcePool, rule.currency, rule.period)}</td><td><input aria-label={`${scopeName(rule.resourcePool, rule.currency, rule.period)}提醒阈值`} value={rule.warningLimit} onChange={(event) => onChange(rules.map((item, itemIndex) => itemIndex === index ? { ...item, warningLimit: event.target.value } : item))} inputMode="decimal" /></td><td><input aria-label={`${scopeName(rule.resourcePool, rule.currency, rule.period)}硬阻断阈值`} value={rule.hardLimit} onChange={(event) => onChange(rules.map((item, itemIndex) => itemIndex === index ? { ...item, hardLimit: event.target.value } : item))} inputMode="decimal" /></td></tr>)}</tbody></table></div>;

type PolicySectionProps = {
  data: SystemControlBudgetPolicyList | null;
  error: unknown;
  loading: boolean;
  refreshing: boolean;
  status: string;
  onStatus: (status: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPage: (offset: number) => void;
  onRetry: () => void;
};

const PolicySection = ({ data, error, loading, refreshing, status, onStatus, selectedId, onSelect, onPage, onRetry }: PolicySectionProps) => {
  const body = loading && !data ? <LoadingBlock /> : error && !data ? <ErrorBlock error={error} onRetry={onRetry} busy={refreshing} /> : data ? <>{error ? <ErrorBlock error={error} stale onRetry={onRetry} busy={refreshing} /> : null}{data.items.length ? <><div className="budget-policy-list">{data.items.map((policy) => <button className={`budget-policy-card ${selectedId === policy.budgetPolicyVersionId ? 'selected' : ''}`} type="button" key={policy.budgetPolicyVersionId} onClick={() => onSelect(policy.budgetPolicyVersionId)}><div className="cp-row-between"><strong>v{policy.version} · {policy.budgetPolicyVersionId}</strong><BudgetBadge value={policy.status} /></div><span>{policy.enforcementEnabled ? '硬门已开启，达到限额将阻断' : '只统计和提醒，不阻断'} · {policy.rules.length} 条服务端规则 · 更新于 {formatDate(policy.updatedAt)}</span></button>)}</div><PageButtons offset={data.offset} total={data.total} onChange={onPage} label="个策略" /></> : <EmptyBlock title="暂无预算策略" detail="空库不创建匿名生效策略或默认阈值；请显式新建草稿。" />}</> : null;
  return <section className="cp-panel"><div className="cp-section-head"><div><h2>预算策略版本</h2><span className="cp-muted">不可变版本链；生效指针只由服务端决定</span></div><select aria-label="预算策略状态筛选" value={status} onChange={(event) => onStatus(event.target.value)}><option value="">全部状态</option>{Object.entries(POLICY_STATUS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>{body}</section>;
};

export const BudgetsPage = ({ onNavigate }: { onNavigate: (path: string) => void }) => {
  const [policyStatus, setPolicyStatus] = useState('');
  const [policyOffset, setPolicyOffset] = useState(0);
  const [usageOffset, setUsageOffset] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [testOffset, setTestOffset] = useState(0);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [showDraft, setShowDraft] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showRollback, setShowRollback] = useState(false);
  const [draftRules, setDraftRules] = useState<RuleForm[]>(makeRuleForm());
  const [draftEnforcementEnabled, setDraftEnforcementEnabled] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<PendingRecovery | null>(null);
  const [reservationId, setReservationId] = useState('');
  const [reservationQueryId, setReservationQueryId] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const policyQuery = useMemo(() => new URLSearchParams({ environment: 'development', limit: String(PAGE_SIZE), offset: String(policyOffset), ...(policyStatus ? { status: policyStatus } : {}) }).toString(), [policyOffset, policyStatus]);
  const policies = useAsyncRead((signal) => listBudgetPolicies(policyQuery, signal), [policyQuery]);
  const overview = useAsyncRead(getBudgetOverview, []);
  const usage = useAsyncRead((signal) => listBudgetUsage(new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(usageOffset) }).toString(), signal), [usageOffset]);
  const audit = useAsyncRead((signal) => listBudgetAudit(new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(auditOffset) }).toString(), signal), [auditOffset]);
  const detail = useAsyncRead<SystemControlBudgetPolicy | null>((signal) => selectedPolicyId ? getBudgetPolicy(selectedPolicyId, signal) : Promise.resolve(null), [selectedPolicyId]);
  const tests = useAsyncRead((signal) => selectedPolicyId ? listBudgetTests(selectedPolicyId, new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(testOffset) }).toString(), signal) : Promise.resolve({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 }), [selectedPolicyId, testOffset]);
  const reservation = useAsyncRead<SystemControlBudgetReservation | null>((signal) => reservationQueryId ? getBudgetReservation(reservationQueryId, signal) : Promise.resolve(null), [reservationQueryId]);
  const modalOpen = showDraft || showPublish || showRollback;
  const selected = detail.data ?? policies.data?.items.find((item) => item.budgetPolicyVersionId === selectedPolicyId) ?? null;
  const activePolicyId = overview.data?.activePolicy?.budgetPolicyVersionId ?? null;
  const activePolicy = useAsyncRead<SystemControlBudgetPolicy | null>((signal) => showPublish && activePolicyId ? getBudgetPolicy(activePolicyId, signal) : Promise.resolve(null), [activePolicyId, showPublish]);
  const activePolicyData = activePolicy.data && Array.isArray(activePolicy.data.rules) ? activePolicy.data : null;

  const refreshFacts = (focus = false) => { overview.reload(focus ? () => titleRef.current?.focus() : undefined); policies.reload(); usage.reload(); audit.reload(); if (selectedPolicyId) { detail.reload(); tests.reload(); } };
  const clearModal = () => { if (!busy) { setActionError(null); setShowDraft(false); setShowPublish(false); setShowRollback(false); } };
  const onDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setActionError(null);
    const budgetPolicyVersionId = createStableId();
    const rules = draftRules.filter((item) => item.warningLimit || item.hardLimit).map(({ resourcePool, currency, period, warningLimit, hardLimit }) => ({ resourcePool, currency, period, warningLimit, hardLimit }));
    const body: SystemControlCreateBudgetPolicyBody = { budgetPolicyVersionId, environment: 'development', enforcementEnabled: draftEnforcementEnabled, rules };
    try { const created = await createBudgetPolicy(body, createStableId()); setShowDraft(false); setSelectedPolicyId(created.budgetPolicyVersionId); refreshFacts(true); } catch (error) { setActionError(error); if (isUnknownResult(error)) { setShowDraft(false); setPendingRecovery({ kind: 'policy', policyId: budgetPolicyVersionId, identity: budgetPolicyVersionId }); } else refreshFacts(); } finally { setBusy(false); }
  };
  const onPolicyCommand = async (kind: 'impact' | 'approve') => {
    if (!selected) return; setBusy(true); setActionError(null); const commandId = createStableId();
    try { const body = { commandId }; const updated = kind === 'impact' ? await impactCheckBudget(selected.budgetPolicyVersionId, body, createStableId()) : await approveBudget(selected.budgetPolicyVersionId, body, createStableId()); setSelectedPolicyId(updated.budgetPolicyVersionId); refreshFacts(true); } catch (error) { setActionError(error); if (isUnknownResult(error)) setPendingRecovery({ kind: 'policy', policyId: selected.budgetPolicyVersionId, identity: selected.budgetPolicyVersionId, expectedStatus: kind === 'impact' ? 'impact_checked' : 'approved' }); else refreshFacts(); } finally { setBusy(false); }
  };
  const onRunTest = async () => {
    if (!selected) return; setBusy(true); setNotice(''); setActionError(null); let budgetTestRunId: string | null = null;
    try { const current = await listBudgetTests(selected.budgetPolicyVersionId, new URLSearchParams({ limit: String(PAGE_SIZE), offset: '0' }).toString()); const active = current.items.find((item) => item.status === 'queued' || item.status === 'running' || item.status === 'unknown'); if (active) { setNotice(`服务端已有该策略回放：${TEST_STATUS[active.status] ?? active.status}；未提交新的回放命令。`); return; } budgetTestRunId = createStableId(); await createBudgetTest(selected.budgetPolicyVersionId, { commandId: createStableId(), budgetTestRunId }, createStableId()); refreshFacts(true); } catch (error) { setActionError(error); if (budgetTestRunId) setPendingRecovery({ kind: 'test', policyId: selected.budgetPolicyVersionId, testRunId: budgetTestRunId, identity: budgetTestRunId }); else refreshFacts(); } finally { setBusy(false); }
  };
  const queryTest = (testRunId: string) => { if (!selected) return; const pending: PendingRecovery = { kind: 'test', source: 'history', policyId: selected.budgetPolicyVersionId, testRunId, identity: testRunId }; setActionError(null); setPendingRecovery(pending); void recover(pending); };
  const onPublish = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!selected) return; if (overview.data?.activePolicy && !activePolicyData) { setActionError(new ControlApiError('当前生效策略规则尚未读取，不能确认发布。')); return; } setBusy(true); setActionError(null); const releaseCommandId = createStableId(); try { await publishBudget(selected.budgetPolicyVersionId, { budgetReleaseCommandId: releaseCommandId }, createStableId()); setShowPublish(false); setPendingRecovery(null); refreshFacts(true); } catch (error) { setActionError(error); if (isUnknownResult(error)) { setShowPublish(false); setPendingRecovery({ kind: 'release', policyId: selected.budgetPolicyVersionId, releaseCommandId, identity: releaseCommandId, releaseAction: 'publish' }); } else refreshFacts(); } finally { setBusy(false); } };
  const onRollback = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!selected) return; setBusy(true); setActionError(null); const releaseCommandId = createStableId(); try { await rollbackBudget(selected.budgetPolicyVersionId, { budgetReleaseCommandId: releaseCommandId, targetBudgetPolicyVersionId: selected.budgetPolicyVersionId }, createStableId()); setShowRollback(false); setPendingRecovery(null); refreshFacts(true); } catch (error) { setActionError(error); if (isUnknownResult(error)) { setShowRollback(false); setPendingRecovery({ kind: 'release', policyId: selected.budgetPolicyVersionId, releaseCommandId, identity: releaseCommandId, releaseAction: 'rollback' }); } else refreshFacts(); } finally { setBusy(false); } };
  async function recover(recovery: PendingRecovery) { if (busy) return; setBusy(true); setActionError(null); try { if (recovery.kind === 'policy' && recovery.policyId) { const policy = await getBudgetPolicy(recovery.policyId); if (recovery.expectedStatus && policy.status !== recovery.expectedStatus) { setPendingRecovery(recovery); setNotice(`命令尚未形成，当前策略仍为${POLICY_STATUS[policy.status] ?? policy.status}；请继续查询。`); return; } } else if (recovery.kind === 'test' && recovery.policyId && recovery.testRunId) await getBudgetTest(recovery.policyId, recovery.testRunId); else if (recovery.kind === 'release' && recovery.releaseCommandId) await getBudgetReleaseCommand(recovery.releaseCommandId); setPendingRecovery(null); setNotice(''); refreshFacts(true); if (recovery.kind === 'test') tests.reload(() => feedbackRef.current?.focus()); } catch (error) { setActionError(error); } finally { setBusy(false); } }
  const rollbackAllowed = selected && selected.budgetPolicyVersionId !== activePolicyId && (selected.status === 'approved' || selected.status === 'retired');
  const hasReadError = Boolean(overview.error || policies.error || usage.error || audit.error || detail.error || tests.error || reservation.error);

  return <div className="cp-page budget-page" data-testid="budgets-page">
    <header className="cp-page-head"><div><h1 ref={titleRef} tabIndex={-1}>预算与限额</h1><p>目标环境 development · 所有预算、阈值和运行合计统一按人民币（CNY）管理；外币原始报价仅作为换算审计事实保留。</p></div><div className="cp-row-actions">{!hasReadError && !pendingRecovery ? <button className="cp-secondary" type="button" onClick={() => refreshFacts(true)} disabled={busy}>重新读取</button> : null}<button className="cp-primary" type="button" onClick={() => { setDraftRules(makeRuleForm()); setDraftEnforcementEnabled(false); setActionError(null); setShowDraft(true); }}>新建预算草稿</button></div></header>
    <div ref={feedbackRef} className="cp-feedback" role="status" tabIndex={-1} aria-live="polite">{notice || (pendingRecovery ? '存在未确定的预算命令，请只查询同一稳定身份。' : '')}</div>
    {actionError && !modalOpen ? <ErrorBlock error={actionError} showRetry={false} focusOnMount={!pendingRecovery} title="操作失败，服务端预算事实未被伪造。" /> : null}
    {pendingRecovery && pendingRecovery.source !== 'history' ? pendingRecovery.kind === 'release' ? <ReleaseRecovery action={pendingRecovery.releaseAction ?? 'publish'} identity={pendingRecovery.identity} onRecover={() => void recover(pendingRecovery)} busy={busy} /> : <CommandRecovery kind={pendingRecovery.kind === 'test' ? 'budget-test' : 'budget'} identity={pendingRecovery.identity} onRecover={() => void recover(pendingRecovery)} busy={busy} /> : null}
    {overview.loading && !overview.data ? <LoadingBlock label="读取预算总览…" /> : overview.error && !overview.data ? <ErrorBlock error={overview.error} onRetry={() => overview.reload(() => titleRef.current?.focus())} busy={overview.refreshing} focusOnMount /> : overview.data ? <>{overview.error ? <ErrorBlock error={overview.error} stale focusOnMount onRetry={() => overview.reload(() => titleRef.current?.focus())} busy={overview.refreshing} /> : null}<OverviewPanel overview={overview.data} /><section className="cp-panel"><div className="cp-section-head"><div><h2>人民币日/月账本</h2><span className="cp-muted">每个资源池按 CNY 分日、月账期独立核算；不在运行合计中混入外币。</span></div></div><LedgerTable scopes={overview.data.scopes} /></section></> : null}
    <PolicySection data={policies.data} error={policies.error} loading={policies.loading} refreshing={policies.refreshing} status={policyStatus} onStatus={(next) => { setPolicyOffset(0); setSelectedPolicyId(null); setPolicyStatus(next); }} selectedId={selectedPolicyId} onSelect={(id) => { setSelectedPolicyId(id); setTestOffset(0); }} onPage={(next) => { setPolicyOffset(next); setSelectedPolicyId(null); }} onRetry={() => policies.reload(() => titleRef.current?.focus())} />
    {selectedPolicyId ? <section className="cp-panel budget-detail">{detail.error && !detail.data ? <ErrorBlock error={detail.error} onRetry={() => detail.reload(() => titleRef.current?.focus())} busy={detail.refreshing} /> : detail.loading && !detail.data ? <LoadingBlock /> : selected ? <>{detail.error ? <ErrorBlock error={detail.error} stale onRetry={() => detail.reload(() => titleRef.current?.focus())} busy={detail.refreshing} /> : null}<div className="cp-section-head"><div><h2>策略 v{selected.version}</h2><span className="cp-muted">{selected.budgetPolicyVersionId} · {selected.environment} · {formatDate(selected.updatedAt)}</span></div><BudgetBadge value={selected.status} /></div><RuleTable rules={selected.rules} />{selected.impact ? <ImpactPanel policy={selected} /> : null}<div className="cp-row-actions">{selected.status === 'testing' ? <button className="cp-secondary" type="button" disabled={busy} onClick={() => void onPolicyCommand('impact')}>运行影响检查</button> : null}{selected.status === 'impact_checked' ? <button className="cp-secondary" type="button" disabled={busy || hasImpactHardBlock(selected.impact)} onClick={() => void onPolicyCommand('approve')}>批准策略</button> : null}{selected.status === 'approved' ? <button className="cp-primary" type="button" disabled={busy} onClick={() => { setActionError(null); setShowPublish(true); }}>确认发布</button> : null}{rollbackAllowed ? <button className="cp-secondary" type="button" disabled={busy} onClick={() => { setActionError(null); setShowRollback(true); }}>回滚至此版本</button> : null}<button className="cp-secondary" type="button" onClick={() => onNavigate('/changes')}>前往变更与审计</button><button className="cp-secondary" type="button" onClick={() => onNavigate('/routing')}>查看路由容量</button></div><div className="cp-section-head budget-subhead"><h3>历史回放</h3><button className="cp-secondary" type="button" disabled={busy || selected.status !== 'draft' || Boolean(tests.data?.items.some((item) => item.status === 'queued' || item.status === 'running' || item.status === 'unknown'))} onClick={() => void onRunTest()}>运行零网络回放</button></div>{tests.error && !tests.data ? <ErrorBlock error={tests.error} onRetry={() => tests.reload()} busy={tests.refreshing} /> : tests.loading && !tests.data ? <LoadingBlock /> : tests.data ? <>{tests.error ? <ErrorBlock error={tests.error} stale onRetry={() => tests.reload()} busy={tests.refreshing} /> : null}<TestRows items={tests.data.items} pending={pendingRecovery?.kind === 'test' ? pendingRecovery.testRunId ?? null : null} busy={busy} onQuery={queryTest} /><PageButtons offset={tests.data.offset} total={tests.data.total} onChange={setTestOffset} label="次回放" /></> : null}</> : null}</section> : null}
    <section className="budget-columns"><section className="cp-panel"><div className="cp-section-head"><div><h2>用量 / 预留</h2><span className="cp-muted">待对账和未知占用由服务端保留</span></div></div>{usage.error && !usage.data ? <ErrorBlock error={usage.error} onRetry={() => usage.reload()} busy={usage.refreshing} /> : usage.loading && !usage.data ? <LoadingBlock /> : usage.data ? <>{usage.error ? <ErrorBlock error={usage.error} stale onRetry={() => usage.reload()} busy={usage.refreshing} /> : null}<UsageTable items={usage.data.items} /><PageButtons offset={usage.data.offset} total={usage.data.total} onChange={setUsageOffset} /></> : null}</section><section className="cp-panel"><div className="cp-section-head"><div><h2>预算审计</h2><span className="cp-muted">只读、追加、含执行身份与 requestId</span></div></div>{audit.error && !audit.data ? <ErrorBlock error={audit.error} onRetry={() => audit.reload()} busy={audit.refreshing} /> : audit.loading && !audit.data ? <LoadingBlock /> : audit.data ? <>{audit.error ? <ErrorBlock error={audit.error} stale onRetry={() => audit.reload()} busy={audit.refreshing} /> : null}{audit.data.items.length ? <><ul className="audit-list">{audit.data.items.map((event: SystemControlBudgetAuditEvent) => <li className="audit-event" key={event.eventId}><strong>{ACTION_LABEL[event.action] ?? '预算事件'}</strong><p>{event.result} · {event.actorSubject}</p><small>{event.requestId} · {formatDate(event.createdAt)}</small></li>)}</ul><PageButtons offset={audit.data.offset} total={audit.data.total} onChange={setAuditOffset} /></> : <EmptyBlock title="暂无预算审计" detail="服务端尚未返回该环境的预算事件。" />}</> : null}</section></section>
    <section className="cp-panel"><div className="cp-section-head"><div><h2>预留详情</h2><span className="cp-muted">按服务端 reservationId 读取，不在浏览器复制预留状态</span></div></div><div className="cp-row-actions"><input aria-label="预留 ID" placeholder="输入服务端 reservationId" value={reservationId} onChange={(event) => setReservationId(event.target.value)} /><button className="cp-secondary" type="button" disabled={!reservationId.trim()} onClick={() => setReservationQueryId(reservationId.trim())}>读取预留详情</button></div>{reservationQueryId ? reservation.loading && !reservation.data ? <LoadingBlock /> : reservation.error ? <ErrorBlock error={reservation.error} onRetry={() => reservation.reload()} busy={reservation.refreshing} /> : reservation.data ? <dl className="budget-reservation"><div><dt>reservationId</dt><dd>{reservation.data.reservationId}</dd></div><div><dt>Attempt</dt><dd>{reservation.data.attemptId} · {reservation.data.attemptKind}</dd></div><div><dt>项目 / 部署版本</dt><dd>{reservation.data.projectId} · {reservation.data.deploymentVersionId}</dd></div><div><dt>预留上限</dt><dd>{reservation.data.currency} {reservation.data.maximumAmount} · 数量 {reservation.data.maximumQuantity}</dd></div><div><dt>状态</dt><dd><BudgetBadge value={reservation.data.status} />{reservation.data.warning ? ' · 服务端提醒' : ''}</dd></div></dl> : null : <EmptyBlock title="未选择预留" detail="输入真实 reservationId 后读取服务端事实。" />}</section>
    {showDraft ? <Modal title="新建预算策略草稿" onClose={clearModal} onSubmit={onDraft} busy={busy} submitLabel="保存不可变草稿"><p className="cp-notice">全部阈值固定使用人民币（CNY）精确十进制字符串。默认只统计和提醒，不阻断；显式开启硬门并发布后，服务端才会按日/月硬限额阻断新请求。</p><label className="cp-checkbox"><input type="checkbox" checked={draftEnforcementEnabled} onChange={(event) => setDraftEnforcementEnabled(event.target.checked)} />开启预算硬门（ASR / OCR）</label>{actionError ? <ErrorBlock error={actionError} showRetry={false} focusOnMount={!busy} title="草稿保存失败，当前生效策略未改变。" /> : null}<RuleEditor rules={draftRules} onChange={setDraftRules} /></Modal> : null}
    {showPublish && selected ? <Modal title="确认发布预算策略" onClose={clearModal} onSubmit={onPublish} busy={busy} submitLabel="确认发布"><p className="cp-notice">发布成功前旧生效策略持续生效；提交中锁定重复操作，未知结果只查询同一预算发布命令。</p>{actionError ? <ErrorBlock error={actionError} showRetry={false} focusOnMount={!busy} title="发布失败，旧生效策略仍保持。" /> : null}<dl className="budget-confirm"><div><dt>旧生效策略</dt><dd>{overview.data?.activePolicy ? `v${overview.data.activePolicy.version} · ${overview.data.activePolicy.budgetPolicyVersionId}` : '暂无当前生效策略'}</dd></div><div><dt>待发布版本</dt><dd>v{selected.version} · {selected.budgetPolicyVersionId}</dd></div></dl>{overview.data?.activePolicy ? activePolicy.loading && !activePolicy.data ? <LoadingBlock label="读取当前生效策略规则…" /> : activePolicy.error && !activePolicy.data ? <ErrorBlock error={activePolicy.error} onRetry={() => activePolicy.reload()} busy={activePolicy.refreshing} /> : activePolicyData ? <RuleDiffTable active={activePolicyData} target={selected} /> : <div className="cp-notice">当前生效策略规则尚未读取，确认前不会提交发布。</div> : <div className="cp-notice">当前没有生效策略；发布成功前保持默认关闭，只统计用量和提醒，不阻断新请求。</div>}{selected.impact ? <ImpactFacts impact={selected.impact} /> : <div className="cp-notice">尚未返回服务端影响检查，不能确认将阻断的请求范围。</div>}</Modal> : null}
    {showRollback && selected ? <Modal title="确认回滚预算策略" onClose={clearModal} onSubmit={onRollback} busy={busy} submitLabel="确认回滚"><p className="cp-notice">回滚只追加一条指向历史已批准版本的新命令，不改写旧版本或历史用量；成功前当前生效策略不变。</p>{actionError ? <ErrorBlock error={actionError} showRetry={false} focusOnMount={!busy} title="回滚失败，当前生效策略仍保持。" /> : null}<dl className="budget-confirm"><div><dt>回滚目标</dt><dd>v{selected.version} · {selected.budgetPolicyVersionId}</dd></div><div><dt>当前生效策略</dt><dd>{overview.data?.activePolicy?.budgetPolicyVersionId ?? '暂无当前生效策略'}</dd></div></dl></Modal> : null}
  </div>;
};
