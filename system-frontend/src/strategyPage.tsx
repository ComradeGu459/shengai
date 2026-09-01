import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import type {
  SystemControlStrategyArtifact,
  SystemControlStrategyArtifactList,
  SystemControlStrategyArtifactKind,
  SystemControlStrategyCreateArtifactBody,
  SystemControlStrategyEvent,
  SystemControlStrategyEventList,
  SystemControlStrategyModule,
  SystemControlStrategyPayload,
} from '@qimao-terms-cloud/contracts';

import { CommandRecovery, EmptyBlock, ErrorBlock, Field, LoadingBlock, Modal, formatDate, useAsyncRead } from './controlPrimitives.js';
import { ControlApiError, createStableId, isDeterministicConflict, isUnknownResult } from './systemApi.js';
import {
  createStrategyArtifact,
  createStrategyVersion,
  getStrategyArtifact,
  getStrategyEvent,
  getStrategyVersion,
  listStrategyArtifacts,
  listStrategyEvents,
  listStrategyVersions,
} from './strategyApi.js';
import { StrategyWaveB } from './strategyWaveB.js';
import { StrategyWaveC } from './strategyWaveC.js';
import './strategy.css';

const KINDS: Array<{ id: SystemControlStrategyArtifactKind; label: string; short: string }> = [
  { id: 'local_rule_pack', label: '本地规则', short: '规则' },
  { id: 'ai_filter_policy', label: 'AI 筛选', short: '筛选' },
  { id: 'prompt_template', label: '提示词模板', short: '模板' },
  { id: 'hotword_projection', label: '热词投影', short: '热词' },
  { id: 'risk_lexicon', label: '风险词库', short: '风险词' },
];
const MODULES: Array<{ id: SystemControlStrategyModule; label: string }> = [
  { id: 'terms', label: '术语' }, { id: 'pre_review', label: '前置审改' },
  { id: 'screen_text', label: '画面字' }, { id: 'subtitle_acceptance', label: '字幕验收' },
];
const TABS = [
  ['overview', '总览'], ['local_rule_pack', '本地规则'], ['ai_filter_policy', 'AI 筛选'],
  ['prompt_template', '提示词模板'], ['lexicons', '热词与风险词'], ['events', '操作日志'],
  ['runs', '优化运行'], ['candidates', '学习候选'], ['evaluations', '离线评测'], ['release', '批准与发布'],
] as const;
type TabId = typeof TABS[number][0];
type Workflow = {
  mode: 'artifact' | 'version'; kind: SystemControlStrategyArtifactKind; artifactId: string;
  versionId: string; idempotencyKey: string; artifact?: SystemControlStrategyArtifact;
  sourceVersion?: number; sourcePayload?: SystemControlStrategyPayload;
};
type Recovery = { mode: 'artifact' | 'version'; artifactId: string; versionId: string; error: unknown };
type OverviewData = { counts: Array<{ kind: SystemControlStrategyArtifactKind; total: number }>; recent: SystemControlStrategyArtifactList; events: SystemControlStrategyEventList };

const kindLabel = (kind: string) => KINDS.find((item) => item.id === kind)?.label ?? '未知类型';
const moduleLabel = (module: string) => MODULES.find((item) => item.id === module)?.label ?? '未知模块';
const domainLabel = (domain: string) => moduleLabel(domain);
const shortId = (value: string | null) => value ? `${value.slice(0, 8)}…${value.slice(-4)}` : '—';
const pageQuery = (input: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return query.toString();
};
const tabFromLocation = (): TabId => {
  const value = new URLSearchParams(window.location.search).get('tab');
  return TABS.some(([id]) => id === value) ? value as TabId : 'overview';
};
const tabKind = (tab: TabId, lexicon: 'hotword_projection' | 'risk_lexicon') => {
  if (tab === 'local_rule_pack' || tab === 'ai_filter_policy' || tab === 'prompt_template') return tab;
  if (tab === 'lexicons') return lexicon;
  return undefined;
};
const formPayload = (kind: SystemControlStrategyArtifactKind, data: FormData): SystemControlStrategyPayload => {
  if (kind === 'local_rule_pack') {
    const ids = data.getAll('ruleId').map(String); const patterns = data.getAll('rulePattern').map(String);
    const replacements = data.getAll('ruleReplacement').map(String); const actions = data.getAll('ruleAction').map(String);
    return { rules: patterns.map((pattern, index) => ({
      id: ids[index] || createStableId(), pattern: pattern.trim(), replacement: replacements[index] ?? '',
      action: (actions[index] ?? 'review') as 'accept' | 'reject' | 'review',
    })).filter((rule) => rule.pattern) };
  }
  if (kind === 'ai_filter_policy') return {
    mode: String(data.get('mode') ?? 'local_only') as 'local_only' | 'local_then_ai' | 'ai_review_sample',
    sampleRate: Number(data.get('sampleRate') ?? 0), riskThreshold: Number(data.get('riskThreshold') ?? 0.8),
    maxCandidates: Number(data.get('maxCandidates') ?? 100),
  };
  if (kind === 'prompt_template') {
    const template = String(data.get('template') ?? '').trim();
    const variables = String(data.get('variables') ?? '').split(/[，,\n]/).map((item) => item.trim()).filter(Boolean);
    return { template, variables };
  }
  const terms = String(data.get('terms') ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (kind === 'hotword_projection') return { terms, caseSensitive: data.get('caseSensitive') === 'on' };
  return { terms, severity: String(data.get('severity') ?? 'medium') as 'low' | 'medium' | 'high' };
};

const Drawer = ({ title, onClose, returnFocus, children }: { title: string; onClose: () => void; returnFocus: RefObject<HTMLElement | null>; children: ReactNode }) => {
  const root = useRef<HTMLElement>(null); const heading = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    heading.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); } };
    root.current?.addEventListener('keydown', onKey); return () => { root.current?.removeEventListener('keydown', onKey); returnFocus.current?.focus(); };
  }, [returnFocus]);
  return <aside className="strategy-drawer" role="dialog" aria-modal="false" aria-labelledby="strategy-drawer-title" ref={root}>
    <header><h2 id="strategy-drawer-title" tabIndex={-1} ref={heading}>{title}</h2><button className="cp-icon-button" type="button" aria-label="关闭详情" onClick={onClose}>×</button></header>{children}
  </aside>;
};

type LocalRule = { id: string; pattern: string; replacement: string; action: 'accept' | 'reject' | 'review' };
const LocalRuleFields = ({ initial }: { initial: LocalRule[] }) => {
  const [rules, setRules] = useState<LocalRule[]>(initial.length ? initial : [{ id: createStableId(), pattern: '', replacement: '', action: 'review' }]);
  return <div className="strategy-rule-editor"><div className="strategy-rule-editor-head"><div><strong>规则明细</strong><span>新版本默认完整继承所选版本；可逐条修改、添加或移除。</span></div><button className="cp-secondary" type="button" disabled={rules.length >= 500} onClick={() => setRules((current) => [...current, { id: createStableId(), pattern: '', replacement: '', action: 'review' }])}>添加规则</button></div>{rules.length ? rules.map((rule, index) => <fieldset className="strategy-rule-row" key={rule.id}><legend>规则 {index + 1}</legend><input name="ruleId" type="hidden" value={rule.id} /><Field label={`匹配规则 ${index + 1}`}><input name="rulePattern" value={rule.pattern} onChange={(event) => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, pattern: event.target.value } : item))} placeholder="例如：重复空格或风险表达式" /></Field><Field label={`替换内容 ${index + 1}`}><input name="ruleReplacement" value={rule.replacement} onChange={(event) => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, replacement: event.target.value } : item))} placeholder="可留空；空格会原样保存" /></Field><Field label={`处理动作 ${index + 1}`}><select name="ruleAction" value={rule.action} onChange={(event) => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, action: event.target.value as LocalRule['action'] } : item))}><option value="review">转人工复核</option><option value="accept">允许</option><option value="reject">拒绝</option></select></Field><button className="strategy-rule-remove" type="button" onClick={() => setRules((current) => current.filter((item) => item.id !== rule.id))}>移除规则 {index + 1}</button></fieldset>) : <p className="strategy-safe-copy">当前版本没有规则。可添加第一条规则，或保存空规则包草稿。</p>}</div>;
};

const PayloadFields = ({ kind, initial }: { kind: SystemControlStrategyArtifactKind; initial?: SystemControlStrategyPayload | undefined }) => {
  if (kind === 'local_rule_pack') return <LocalRuleFields initial={initial && 'rules' in initial ? initial.rules : []} />;
  if (kind === 'ai_filter_policy') { const value = initial && 'mode' in initial ? initial : null; return <div className="strategy-form-grid"><Field label="运行模式"><select name="mode" defaultValue={value?.mode ?? 'local_only'}><option value="local_only">仅本地规则</option><option value="local_then_ai">本地后 AI 复核</option><option value="ai_review_sample">AI 抽样复核</option></select></Field><Field label="抽样比例"><input name="sampleRate" type="number" min="0" max="1" step="0.01" defaultValue={value?.sampleRate ?? 0} /></Field><Field label="风险阈值"><input name="riskThreshold" type="number" min="0" max="1" step="0.01" defaultValue={value?.riskThreshold ?? 0.8} /></Field><Field label="候选上限"><input name="maxCandidates" type="number" min="0" max="100000" defaultValue={value?.maxCandidates ?? 100} /></Field></div>; }
  if (kind === 'prompt_template') { const value = initial && 'template' in initial ? initial : null; return <div className="strategy-form-stack"><Field label="提示词模板" hint="仅保存草稿；不会调用模型或自动上线。"><textarea name="template" required defaultValue={value?.template ?? '请基于明确证据复核：{{text}}'} /></Field><Field label="变量（逗号分隔）"><input name="variables" defaultValue={value?.variables.join('，') ?? 'text'} /></Field></div>; }
  if (kind === 'hotword_projection') { const value = initial && 'caseSensitive' in initial ? initial : null; return <div className="strategy-form-stack"><Field label="热词（每行一项）"><textarea name="terms" defaultValue={value?.terms.join('\n') ?? ''} /></Field><label className="strategy-check"><input name="caseSensitive" type="checkbox" defaultChecked={value?.caseSensitive ?? false} />区分大小写</label></div>; }
  const value = initial && 'severity' in initial ? initial : null;
  return <div className="strategy-form-stack"><Field label="风险词（每行一项）"><textarea name="terms" defaultValue={value?.terms.join('\n') ?? ''} /></Field><Field label="提示级别"><select name="severity" defaultValue={value?.severity ?? 'medium'}><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></Field><p className="strategy-safe-copy">风险词只形成提示和人工复核，不会自动删除内容或阻断交付。</p></div>;
};

export const StrategyPage = () => {
  const [tab, setTabState] = useState<TabId>(tabFromLocation);
  const [lexiconKind, setLexiconKind] = useState<'hotword_projection' | 'risk_lexicon'>('hotword_projection');
  const [search, setSearch] = useState(''); const [moduleFilter, setModuleFilter] = useState(''); const [sort, setSort] = useState('updated_desc'); const [page, setPage] = useState(0);
  const [eventDomain, setEventDomain] = useState(''); const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null); const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null); const [versionPage, setVersionPage] = useState(0); const [selectedEventRef, setSelectedEventRef] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null); const [workflowBusy, setWorkflowBusy] = useState(false); const [workflowError, setWorkflowError] = useState<unknown>(null); const [recovery, setRecovery] = useState<Recovery | null>(null); const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState(''); const titleRef = useRef<HTMLHeadingElement>(null); const versionHeadingRef = useRef<HTMLHeadingElement>(null); const pendingVersionFocus = useRef<string | null>(null); const drawerTrigger = useRef<HTMLElement | null>(null); const submitSuccessFocus = useRef(false);
  const kind = tabKind(tab, lexiconKind); const limit = 20; const offset = page * limit;
  const assetQuery = useMemo(() => pageQuery({ kind, applicableModule: moduleFilter || undefined, search: search || undefined, sort, limit, offset }), [kind, moduleFilter, search, sort, limit, offset]);
  const eventQuery = useMemo(() => pageQuery({ domain: eventDomain || undefined, search: search || undefined, sort: 'created_desc', limit, offset }), [eventDomain, search, limit, offset]);
  const overview = useAsyncRead(async (signal) => {
    if (tab !== 'overview') return { counts: [], recent: { items: [], total: 0, limit: 5, offset: 0 }, events: { items: [], total: 0, limit: 5, offset: 0 } } satisfies OverviewData;
    const [counts, recent, events] = await Promise.all([
      Promise.all(KINDS.map(async (entry) => ({ kind: entry.id, total: (await listStrategyArtifacts(pageQuery({ kind: entry.id, limit: 1, offset: 0 }), signal)).total }))),
      listStrategyArtifacts('sort=updated_desc&limit=5&offset=0', signal), listStrategyEvents('sort=created_desc&limit=5&offset=0', signal),
    ]); return { counts, recent, events };
  }, [tab], { identity: `overview:${tab}` });
  const assets = useAsyncRead((signal) => kind ? listStrategyArtifacts(assetQuery, signal) : Promise.resolve({ items: [], total: 0, limit, offset }), [kind, assetQuery], { identity: `assets:${kind ?? 'off'}:${assetQuery}` });
  const events = useAsyncRead((signal) => tab === 'events' ? listStrategyEvents(eventQuery, signal) : Promise.resolve({ items: [], total: 0, limit, offset }), [tab, eventQuery], { identity: `events:${tab}:${eventQuery}` });
  const artifactDetail = useAsyncRead((signal) => selectedArtifactId ? getStrategyArtifact(selectedArtifactId, signal) : Promise.resolve(null), [selectedArtifactId], { identity: `artifact:${selectedArtifactId ?? 'none'}` });
  const versions = useAsyncRead((signal) => selectedArtifactId ? listStrategyVersions(selectedArtifactId, pageQuery({ limit: 10, offset: versionPage * 10 }), signal) : Promise.resolve(null), [selectedArtifactId, versionPage], { identity: `versions:${selectedArtifactId ?? 'none'}:${versionPage}` });
  const versionDetail = useAsyncRead((signal) => selectedArtifactId && selectedVersionId ? getStrategyVersion(selectedArtifactId, selectedVersionId, signal) : Promise.resolve(null), [selectedArtifactId, selectedVersionId], { identity: `version:${selectedArtifactId ?? 'none'}:${selectedVersionId ?? 'none'}` });
  const eventDetail = useAsyncRead((signal) => selectedEventRef ? getStrategyEvent(selectedEventRef, signal) : Promise.resolve(null), [selectedEventRef], { identity: `event:${selectedEventRef ?? 'none'}` });

  useEffect(() => { setPage(0); setSelectedArtifactId(null); setSelectedVersionId(null); setSelectedEventRef(null); }, [tab, kind, moduleFilter, search, sort, eventDomain]);
  useEffect(() => { if (versionDetail.data?.versionId === pendingVersionFocus.current) { pendingVersionFocus.current = null; versionHeadingRef.current?.focus(); } }, [versionDetail.data]);
  const setTab = (next: TabId) => { const url = new URL(window.location.href); url.searchParams.set('tab', next); window.history.replaceState({}, '', url); setTabState(next); setSearch(''); setPage(0); };
  const focusSuccess = (message: string, fromModal = false) => { submitSuccessFocus.current = fromModal; setStatusMessage(message); if (!fromModal) queueMicrotask(() => titleRef.current?.focus()); };
  const openArtifact = (artifact: SystemControlStrategyArtifact, trigger: HTMLElement) => { drawerTrigger.current = trigger; setSelectedVersionId(null); setVersionPage(0); setSelectedArtifactId(artifact.artifactId); };
  const openEvent = (event: SystemControlStrategyEvent, trigger: HTMLElement) => { drawerTrigger.current = trigger; setSelectedEventRef(event.eventRefId); };
  const openCreate = (targetKind = kind ?? 'local_rule_pack') => setWorkflow({ mode: 'artifact', kind: targetKind, artifactId: createStableId(), versionId: createStableId(), idempotencyKey: createStableId() });
  const openVersion = (artifact: SystemControlStrategyArtifact, sourceVersion: number, sourcePayload: SystemControlStrategyPayload) => setWorkflow({ mode: 'version', kind: artifact.kind, artifactId: artifact.artifactId, versionId: createStableId(), idempotencyKey: createStableId(), artifact, sourceVersion, sourcePayload });

  const submitWorkflow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!workflow) return; setWorkflowBusy(true); setWorkflowError(null);
    const data = new FormData(event.currentTarget); const payload = formPayload(workflow.kind, data);
    try {
      if (workflow.mode === 'artifact') {
        const modules = data.getAll('modules').map(String) as SystemControlStrategyModule[];
        if (!modules.length) throw new ControlApiError('请至少选择一个适用模块。', { status: 422, retryable: false });
        const body: SystemControlStrategyCreateArtifactBody = { artifactId: workflow.artifactId, versionId: workflow.versionId, kind: workflow.kind, displayName: String(data.get('displayName') ?? '').trim(), purpose: String(data.get('purpose') ?? '').trim(), applicableModules: modules, schemaVersion: 1, payload };
        await createStrategyArtifact(body, workflow.idempotencyKey); focusSuccess('策略资产草稿已登记；生产规则没有改变。', true); setWorkflow(null); assets.reload(); overview.reload();
      } else {
        const createdVersionId = workflow.versionId;
        await createStrategyVersion(workflow.artifactId, { versionId: createdVersionId, schemaVersion: 1, payload }, workflow.idempotencyKey);
        setStatusMessage('新的不可变草稿版本已创建；生产规则没有改变。'); pendingVersionFocus.current = createdVersionId; setSelectedVersionId(createdVersionId); setWorkflow(null); versions.reload(); artifactDetail.reload();
      }
    } catch (error) {
      if (isUnknownResult(error)) { setRecovery({ mode: workflow.mode, artifactId: workflow.artifactId, versionId: workflow.versionId, error }); setWorkflow(null); }
      else { setWorkflowError(error); if (isDeterministicConflict(error)) { assets.reload(); artifactDetail.reload(); setWorkflow((current) => current ? { ...current, versionId: createStableId(), artifactId: current.mode === 'artifact' ? createStableId() : current.artifactId, idempotencyKey: createStableId() } : null); } }
    } finally { setWorkflowBusy(false); }
  };
  const recover = async () => {
    if (!recovery) return; setRecoveryBusy(true);
    try {
      if (recovery.mode === 'artifact') await getStrategyArtifact(recovery.artifactId);
      else await getStrategyVersion(recovery.artifactId, recovery.versionId);
      setRecovery(null); assets.reload(); overview.reload(); versions.reload(); focusSuccess('已从服务端恢复同一草稿身份。');
    } catch (error) { setRecovery((current) => current ? { ...current, error } : current); }
    finally { setRecoveryBusy(false); }
  };

  const activeRead = tab === 'overview' ? overview : tab === 'events' ? events : assets;
  const waveB = tab === 'runs' || tab === 'candidates' || tab === 'evaluations' || tab === 'release';
  const waveC = tab === 'local_rule_pack';
  const staleError = activeRead.error && activeRead.data !== null;
  return <div className="strategy-page">
    <header className="cp-page-head"><div><h1 tabIndex={-1} ref={titleRef}>策略与学习</h1><p>本地规则优先，人工事件只作为安全证据；Wave C 只开放前置审改本地规则的受控生效链。</p></div><div className="cp-actions"><button className="cp-secondary" type="button" onClick={() => activeRead.reload()} disabled={waveB || waveC}>重新读取</button>{!waveB && tab !== 'events' ? <button className="cp-primary" type="button" onClick={() => openCreate()} disabled={Boolean(staleError)}>登记策略资产</button> : null}</div></header>
    <div className="strategy-tabs" role="tablist" aria-label="策略与学习模块">{TABS.map(([id, label]) => <button key={id} type="button" role="tab" disabled={id === 'release'} aria-disabled={id === 'release' || undefined} aria-selected={tab === id} onClick={() => { if (id !== 'release') setTab(id); }}>{label}</button>)}</div>
    <div className="strategy-wave-note"><strong>{waveB ? '当前为 Wave B' : waveC ? '当前为 Wave C' : '当前为 Wave A'}</strong><span>AI、训练、付费调用和自动化操作均未启用；员工规则切换仍关闭，所有结果以服务端事实为准。</span></div>
    <div aria-live="polite" role="status" className="strategy-status">{statusMessage}</div>
    {recovery ? <CommandRecovery kind={recovery.mode === 'artifact' ? 'strategy-artifact' : 'strategy-version'} identity={recovery.mode === 'artifact' ? recovery.artifactId : recovery.versionId} onRecover={() => void recover()} busy={recoveryBusy} error={recovery.error} /> : null}
    {!waveB && activeRead.error ? <ErrorBlock error={activeRead.error} stale={activeRead.data !== null} busy={activeRead.refreshing} onRetry={() => activeRead.reload(() => titleRef.current?.focus())} focusOnMount={activeRead.data === null} /> : null}
    {tab === 'overview' && activeRead.loading && activeRead.data === null ? <LoadingBlock label="读取策略与学习服务端事实…" /> : null}
    {tab === 'overview' && overview.data ? <Overview data={overview.data} onOpen={openArtifact} onEvent={openEvent} onCreate={openCreate} /> : null}
    {waveC ? <StrategyWaveC /> : null}
    {tab !== 'overview' && tab !== 'events' && !waveB ? <AssetSection data={assets.data ?? { items: [], total: 0, limit, offset }} loading={assets.loading} tab={tab} lexiconKind={lexiconKind} onLexiconKind={setLexiconKind} search={search} onSearch={setSearch} moduleFilter={moduleFilter} onModuleFilter={setModuleFilter} sort={sort} onSort={setSort} page={page} onPage={setPage} onOpen={openArtifact} /> : null}
    {tab === 'events' ? <EventSection data={events.data ?? { items: [], total: 0, limit, offset }} loading={events.loading} search={search} onSearch={setSearch} domain={eventDomain} onDomain={setEventDomain} page={page} onPage={setPage} onOpen={openEvent} /> : null}
      {waveB ? <StrategyWaveB tab={tab} titleRef={titleRef} onTab={(next) => setTab(next)} /> : null}
    {selectedArtifactId ? <Drawer title="策略资产详情" onClose={() => { setSelectedArtifactId(null); setSelectedVersionId(null); setVersionPage(0); }} returnFocus={drawerTrigger}>
      <div className="strategy-drawer-body">{artifactDetail.loading ? <LoadingBlock /> : artifactDetail.error ? <ErrorBlock error={artifactDetail.error} onRetry={() => artifactDetail.reload()} /> : artifactDetail.data ? <><section className="strategy-detail-hero"><span className="strategy-kind">{kindLabel(artifactDetail.data.kind)}</span><h3>{artifactDetail.data.displayName}</h3><p>{artifactDetail.data.purpose}</p><div>{artifactDetail.data.applicableModules.map((item) => <span className="strategy-chip" key={item}>{moduleLabel(item)}</span>)}</div><p className="strategy-safe-copy">先在版本时间线中选择作为基线的版本，再创建下一不可变草稿，避免遗漏既有配置。</p></section><h3>版本时间线</h3>{versions.data?.items.length ? <ul className="strategy-version-list">{versions.data.items.map((item) => <li key={item.versionId}><button type="button" onClick={() => setSelectedVersionId(item.versionId)} aria-pressed={selectedVersionId === item.versionId}><strong>v{item.version}</strong><span>{item.versionSummary}</span><small>{formatDate(item.createdAt)}</small></button></li>)}</ul> : <EmptyBlock title="暂无版本事实" detail="资产必须至少包含一个不可变草稿版本。" />}{versions.data ? <Pagination page={versionPage} total={versions.data.total} limit={versions.data.limit} onPage={(next) => { setSelectedVersionId(null); setVersionPage(next); }} /> : null}{selectedVersionId ? <div className="strategy-version-detail">{versionDetail.loading ? <LoadingBlock /> : versionDetail.error ? <ErrorBlock error={versionDetail.error} onRetry={() => versionDetail.reload()} /> : versionDetail.data ? <><h3 tabIndex={-1} ref={versionHeadingRef}>已选择 v{versionDetail.data.version}</h3><p>{versionDetail.data.versionSummary}</p><dl><div><dt>内容摘要</dt><dd><code>{versionDetail.data.contentDigest}</code></dd></div><div><dt>Schema</dt><dd>v{versionDetail.data.schemaVersion}</dd></div></dl><p className="strategy-safe-copy">只有明确进入创建流程时才加载当前版本内容；普通列表和详情不展示完整提示词或词库正文。</p><button className="cp-primary" type="button" onClick={() => openVersion(artifactDetail.data!, versionDetail.data!.version, versionDetail.data!.payload)}>基于 v{versionDetail.data.version} 创建下一版本</button></> : null}</div> : null}</> : null}</div>
    </Drawer> : null}
    {selectedEventRef ? <Drawer title="人工事件安全证据" onClose={() => setSelectedEventRef(null)} returnFocus={drawerTrigger}><div className="strategy-drawer-body">{eventDetail.loading ? <LoadingBlock /> : eventDetail.error ? <ErrorBlock error={eventDetail.error} onRetry={() => eventDetail.reload()} /> : eventDetail.data ? <EventDetail event={eventDetail.data} /> : null}</div></Drawer> : null}
    {workflow ? <Modal title={workflow.mode === 'artifact' ? '登记策略资产草稿' : '创建下一不可变版本'} onClose={() => { if (!workflowBusy) { setWorkflow(null); setWorkflowError(null); } }} onUnmountFocus={(trigger) => { if (submitSuccessFocus.current) { submitSuccessFocus.current = false; titleRef.current?.focus(); } else trigger?.focus(); }} onSubmit={submitWorkflow} busy={workflowBusy} locked={workflowBusy} submitLabel={workflow.mode === 'artifact' ? '登记草稿' : '创建版本'}>
      {workflowError ? <ErrorBlock error={workflowError} title="本次草稿未保存" showRetry={false} focusOnMount /> : null}
      {workflow.mode === 'artifact' ? <div className="strategy-form-stack"><Field label="策略类型"><select value={workflow.kind} onChange={(event) => setWorkflow((current) => current ? { ...current, kind: event.target.value as SystemControlStrategyArtifactKind } : current)}>{KINDS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></Field><Field label="资产名称"><input name="displayName" required maxLength={200} /></Field><Field label="用途"><textarea name="purpose" required maxLength={500} /></Field><fieldset className="strategy-module-field"><legend>适用模块</legend>{MODULES.map((item) => <label key={item.id}><input type="checkbox" name="modules" value={item.id} defaultChecked={item.id === 'terms'} />{item.label}</label>)}</fieldset></div> : <div className="strategy-locked-fact">{workflow.artifact?.displayName} · {kindLabel(workflow.kind)}<span>基于 v{workflow.sourceVersion} 完整继承后修改；新版本只追加，不覆盖历史。</span></div>}
      <PayloadFields key={`${workflow.mode}:${workflow.kind}:${workflow.versionId}`} kind={workflow.kind} initial={workflow.sourcePayload} />
    </Modal> : null}
  </div>;
};

const Overview = ({ data, onOpen, onEvent, onCreate }: { data: OverviewData; onOpen: (item: SystemControlStrategyArtifact, trigger: HTMLElement) => void; onEvent: (item: SystemControlStrategyEvent, trigger: HTMLElement) => void; onCreate: (kind: SystemControlStrategyArtifactKind) => void }) => <>
  <section className="strategy-summary" aria-label="五类策略资产摘要">{KINDS.map((entry) => { const count = data.counts.find((item) => item.kind === entry.id)?.total ?? 0; return <article key={entry.id}><span>{entry.label}</span><strong>{count}</strong><small>{count ? '不可变草稿资产' : '尚未纳管'}</small><button type="button" onClick={() => onCreate(entry.id)}>登记{entry.short}</button></article>; })}</section>
  <div className="strategy-overview-grid"><section className="cp-panel"><div className="cp-section-head"><div><h2>最近策略草稿</h2><p>只显示服务端摘要，不加载完整载荷。</p></div><span>{data.recent.total} 项</span></div>{data.recent.items.length ? <ul className="strategy-compact-list">{data.recent.items.map((item: SystemControlStrategyArtifact) => <li key={item.artifactId}><div><strong>{item.displayName}</strong><span>{kindLabel(item.kind)} · {item.latestVersionSummary ?? '暂无摘要'}</span></div><button type="button" onClick={(event) => onOpen(item, event.currentTarget)}>查看详情</button></li>)}</ul> : <EmptyBlock title="尚未纳管策略资产" detail="可先登记本地规则或词库草稿；生产规则不会改变。" />}</section><section className="cp-panel"><div className="cp-section-head"><div><h2>最近人工操作事件</h2><p>安全投影只包含身份、差量和证据数量。</p></div><span>{data.events.total} 条</span></div>{data.events.items.length ? <ul className="strategy-compact-list">{data.events.items.map((item: SystemControlStrategyEvent) => <li key={item.eventRefId}><div><strong>{domainLabel(item.domain)} · {item.action}</strong><span>{item.changedFields.join(' / ') || '无业务字段变化'} · 证据 {item.evidenceCount}</span></div><button type="button" onClick={(event) => onEvent(item, event.currentTarget)}>查看证据</button></li>)}</ul> : <EmptyBlock title="暂无人工事件" detail="术语、审改、画面字和字幕验收的正式人工决定会进入安全目录。" />}</section></div>
</>;

type AssetSectionProps = { data: SystemControlStrategyArtifactList; loading: boolean; tab: TabId; lexiconKind: 'hotword_projection' | 'risk_lexicon'; onLexiconKind: (value: 'hotword_projection' | 'risk_lexicon') => void; search: string; onSearch: (value: string) => void; moduleFilter: string; onModuleFilter: (value: string) => void; sort: string; onSort: (value: string) => void; page: number; onPage: (value: number) => void; onOpen: (item: SystemControlStrategyArtifact, trigger: HTMLElement) => void };
const AssetSection = ({ data, loading, tab, lexiconKind, onLexiconKind, search, onSearch, moduleFilter, onModuleFilter, sort, onSort, page, onPage, onOpen }: AssetSectionProps) => <section className="cp-panel strategy-list-panel"><div className="cp-section-head"><div><h2>{tab === 'lexicons' ? '热词与风险词草稿' : `${kindLabel(tab)}草稿`}</h2><p>服务端检索、筛选、排序和稳定分页。</p></div><span>{data.total} 项</span></div><div className="strategy-filters">{tab === 'lexicons' ? <label>词库类型<select aria-label="词库类型" value={lexiconKind} onChange={(event) => onLexiconKind(event.target.value as 'hotword_projection' | 'risk_lexicon')}><option value="hotword_projection">热词投影</option><option value="risk_lexicon">风险词库</option></select></label> : null}<label>搜索<input aria-label="策略搜索" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="名称或用途" /></label><label>适用模块<select aria-label="适用模块" value={moduleFilter} onChange={(event) => onModuleFilter(event.target.value)}><option value="">全部模块</option>{MODULES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>排序<select aria-label="策略排序" value={sort} onChange={(event) => onSort(event.target.value)}><option value="updated_desc">最近更新</option><option value="updated_asc">最早更新</option><option value="name_asc">名称</option><option value="kind_asc">类型</option></select></label></div>{loading ? <LoadingBlock label="读取当前策略列表…" /> : data.items.length ? <div className="strategy-table-wrap"><table><thead><tr><th>策略资产</th><th>类型</th><th>用途</th><th>适用模块</th><th>最新版本摘要</th><th>版本</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.artifactId}><td><strong>{item.displayName}</strong><small>{shortId(item.artifactId)}</small></td><td>{kindLabel(item.kind)}</td><td>{item.purpose}</td><td>{item.applicableModules.map(moduleLabel).join('、')}</td><td>{item.latestVersionSummary ?? '暂无摘要'}</td><td>{item.versionCount}</td><td>{formatDate(item.updatedAt)}</td><td><button type="button" onClick={(event) => onOpen(item, event.currentTarget)}>查看详情</button></td></tr>)}</tbody></table></div> : <EmptyBlock title="当前条件没有策略资产" detail="调整服务端筛选，或登记第一个不可变草稿。" />}<Pagination page={page} total={data.total} limit={data.limit} onPage={onPage} /></section>;

type EventSectionProps = { data: SystemControlStrategyEventList; loading: boolean; search: string; onSearch: (value: string) => void; domain: string; onDomain: (value: string) => void; page: number; onPage: (value: number) => void; onOpen: (item: SystemControlStrategyEvent, trigger: HTMLElement) => void };
const EventSection = ({ data, loading, search, onSearch, domain, onDomain, page, onPage, onOpen }: EventSectionProps) => <section className="cp-panel strategy-list-panel"><div className="cp-section-head"><div><h2>人工操作日志</h2><p>四个员工模块的权威事件安全投影；读取不会修改领域数据。</p></div><span>{data.total} 条</span></div><div className="strategy-filters"><label>搜索<input aria-label="事件搜索" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="项目、动作或事件身份" /></label><label>业务模块<select aria-label="事件模块" value={domain} onChange={(event) => onDomain(event.target.value)}><option value="">全部模块</option>{MODULES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>{loading ? <LoadingBlock label="读取人工事件安全投影…" /> : data.items.length ? <div className="strategy-table-wrap"><table><thead><tr><th>模块 / 动作</th><th>项目</th><th>集 / 轨</th><th>变化字段</th><th>证据</th><th>来源版本</th><th>时间</th><th>操作</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.eventRefId}><td><strong>{domainLabel(item.domain)}</strong><small>{item.action}</small></td><td>{shortId(item.projectId)}</td><td>{item.episodeNumber ? `第 ${item.episodeNumber} 集` : '全局'} / {item.track ?? '综合'}</td><td>{item.changedFields.join('、') || '无业务字段变化'}</td><td>{item.evidenceCount}</td><td>{shortId(item.sourceVersionId)}</td><td>{formatDate(item.createdAt)}</td><td><button type="button" onClick={(event) => onOpen(item, event.currentTarget)}>查看证据</button></td></tr>)}</tbody></table></div> : <EmptyBlock title="当前条件没有人工事件" detail="不会用匿名日志或浏览器操作补造服务端事实。" />}<Pagination page={page} total={data.total} limit={data.limit} onPage={onPage} /></section>;

const Pagination = ({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (page: number) => void }) => <div className="strategy-pagination"><span>第 {total ? page + 1 : 0} / {Math.ceil(total / limit) || 0} 页</span><div><button className="cp-secondary" type="button" disabled={page === 0} onClick={() => onPage(page - 1)}>上一页</button><button className="cp-secondary" type="button" disabled={(page + 1) * limit >= total} onClick={() => onPage(page + 1)}>下一页</button></div></div>;

const EventDetail = ({ event }: { event: SystemControlStrategyEvent }) => <div className="strategy-event-detail"><div className="strategy-event-warning"><strong>只作为证据，不会自动成为规则</strong><span>撤销或恢复也是新的不可变事件；学习候选必须在后续波次重新评测。</span></div><dl><div><dt>事件身份</dt><dd><code>{event.eventRefId}</code></dd></div><div><dt>模块 / 动作</dt><dd>{domainLabel(event.domain)} / {event.action}</dd></div><div><dt>项目 / 集 / 轨</dt><dd>{shortId(event.projectId)} / {event.episodeNumber ?? '全局'} / {event.track ?? '综合'}</dd></div><div><dt>变化字段</dt><dd>{event.changedFields.join('、') || '无业务字段变化'}</dd></div><div><dt>证据数量</dt><dd>{event.evidenceCount}</dd></div><div><dt>前后摘要</dt><dd><code>{event.beforeDigest ?? '无'} → {event.afterDigest ?? '无'}</code></dd></div><div><dt>撤销 / 恢复关系</dt><dd>{event.reversesEventRefId ?? '无'} / {event.restoresEventRefId ?? '无'}</dd></div><div><dt>时间</dt><dd>{formatDate(event.createdAt)}</dd></div></dl></div>;
