import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import type {
  SystemControlPreReviewRulePack,
  SystemControlStrategyApproval,
  SystemControlStrategyImpactRun,
  SystemControlStrategyRuntimeTarget,
  SystemControlStrategyRuntimeVersion,
} from '@qimao-terms-cloud/contracts';

import { CommandRecovery, EmptyBlock, ErrorBlock, Field, LoadingBlock, Modal, formatDate, useAsyncRead } from './controlPrimitives.js';
import { ControlApiError, createStableId, isDeterministicConflict, isUnknownResult } from './systemApi.js';
import { createStrategyArtifact, getStrategyVersion } from './strategyApi.js';
import {
  createApproval,
  createImpactRun,
  createReleaseCommand,
  getApproval,
  getBaselineImport,
  getBaselinePreview,
  getImpactRun,
  getReleaseCommand,
  getRuntimeVersion,
  getRuntimeTarget,
  importBaseline,
  listRuntimeHistory,
} from './strategyRuntimeApi.js';

type Stage = 'versions' | 'impact' | 'approval' | 'history';
type Recovery =
  | { kind: 'baseline'; commandId: string; versionId: string; error?: unknown }
  | { kind: 'draft'; commandId: string; artifactId: string; versionId: string; error?: unknown }
  | { kind: 'impact'; commandId: string; versionId: string; error?: unknown }
  | { kind: 'approval'; commandId: string; versionId: string; error?: unknown }
  | { kind: 'release'; commandId: string; versionId: string; action: 'publish' | 'rollback'; error?: unknown };
type DraftIntent = { artifactId: string; versionId: string; key: string; baseVersionId: string };
type CommandIntent = { id: string; key: string; versionId: string };
type ReleaseIntent = CommandIntent & { action: 'publish' | 'rollback'; expectedPreviousStrategyVersionId: string | null; impactRunId: string; approvalId: string; contentDigest: string };

const FIELD_DEFINITIONS: Array<{ key: keyof SystemControlPreReviewRulePack; label: string; kind: 'number' | 'decimal' | 'toggle'; hint?: string }> = [
  { key: 'alignmentNearbyGapMs', label: '邻近时间差', kind: 'number', hint: '毫秒，服务端范围 0–5000' },
  { key: 'alignmentSimilarityThreshold', label: '相似度阈值', kind: 'decimal', hint: '固定六位小数，范围 0–1' },
  { key: 'maxCharacters', label: '字幕最大字数', kind: 'number', hint: '服务端范围 1–200' },
  { key: 'forbidSentencePunctuation', label: '句末标点', kind: 'toggle' },
  { key: 'forbidMarkup', label: '格式标记', kind: 'toggle' },
  { key: 'forbidBrackets', label: '括号', kind: 'toggle' },
  { key: 'requireSpeakerDashForMultipleLines', label: '多人半角短横线', kind: 'toggle' },
];
const INVARIANT_LABELS: Record<string, string> = { oneToOne: '一对一', asrQuality: 'ASR 质量', blockingFormat: '阻断格式', termConflicts: '术语冲突' };
const STATUS_LABELS: Record<string, string> = { draft: '草稿', testing: '验证中', impact_checked: '影响已检查', approved: '已批准', active: '当前生效', retired: '历史退役', queued: '排队中', running: '运行中', succeeded: '已完成', failed: '失败', unknown: '结果未知' };
const originLabel = (origin: string) => origin === 'system_baseline' ? '系统初始基线' : '人工草稿';
const shortId = (value: string | null | undefined) => value ? `${value.slice(0, 8)}…${value.slice(-4)}` : '暂无事实';
const digestLabel = (value: string | null | undefined) => value ? `${value.slice(0, 12)}…` : '暂无摘要';
const rulePackDefaults: SystemControlPreReviewRulePack = {
  payloadType: 'pre_review_local_rule_pack_v1', alignmentNearbyGapMs: 350, alignmentSimilarityThreshold: 0.75,
  maxCharacters: 28, forbidSentencePunctuation: true, forbidMarkup: true, forbidBrackets: true, requireSpeakerDashForMultipleLines: true,
};

const hasPassingImpact = (impact: SystemControlStrategyImpactRun | null) => Boolean(impact && impact.status === 'succeeded' && impact.blockers.length === 0 && Object.values(impact.invariantResults).every((value) => value === 'pass'));

const FocusDrawer = ({ title, onClose, returnFocus, children }: { title: string; onClose: () => void; returnFocus: RefObject<HTMLElement | null>; children: ReactNode }) => {
  const root = useRef<HTMLElement>(null); const heading = useRef<HTMLHeadingElement>(null); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const layer = root.current; heading.current?.focus();
    const focusables = () => Array.from(layer?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? []);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables(); if (!items.length) { event.preventDefault(); layer?.focus(); return; }
      const first = items[0]!; const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    layer?.addEventListener('keydown', onKey);
    return () => { layer?.removeEventListener('keydown', onKey); returnFocus.current?.focus(); };
  }, [returnFocus]);
  return <aside className="strategy-drawer strategy-runtime-drawer" role="dialog" aria-modal="false" aria-labelledby="strategy-runtime-drawer-title" ref={root} tabIndex={-1}>
    <header><h2 id="strategy-runtime-drawer-title" tabIndex={-1} ref={heading}>{title}</h2><button className="cp-icon-button" type="button" aria-label="关闭详情" onClick={onClose}>×</button></header>
    <div className="strategy-drawer-body">{children}</div>
  </aside>;
};

const RulePackView = ({ pack, title = '七项严格字段' }: { pack: SystemControlPreReviewRulePack; title?: string }) => (
  <section className="strategy-runtime-card" aria-label={title}><div className="cp-section-head"><div><h3>{title}</h3><p>仅显示服务端严格载荷，不提供任意配置编辑。</p></div><span className="strategy-chip">不可变摘要</span></div><dl className="strategy-runtime-fields">
    <div><dt>邻近时间差</dt><dd className="strategy-runtime-value-token">{pack.alignmentNearbyGapMs} ms</dd></div><div><dt>相似度阈值</dt><dd className="strategy-runtime-value-token">{pack.alignmentSimilarityThreshold.toFixed(6)}</dd></div><div><dt>字幕最大字数</dt><dd className="strategy-runtime-value-token">{pack.maxCharacters}</dd></div>
    <div><dt>句末标点</dt><dd>{pack.forbidSentencePunctuation ? '开' : '关'}</dd></div><div><dt>格式标记</dt><dd>{pack.forbidMarkup ? '开' : '关'}</dd></div><div><dt>括号</dt><dd>{pack.forbidBrackets ? '开' : '关'}</dd></div><div><dt>多人半角短横线</dt><dd>{pack.requireSpeakerDashForMultipleLines ? '开' : '关'}</dd></div>
  </dl></section>
);

const InvariantView = ({ results }: { results: Record<string, string> | null }) => <section className="strategy-runtime-card"><h3>只读安全不变量</h3><div className="strategy-runtime-invariants">{Object.entries(INVARIANT_LABELS).map(([key, label]) => <div key={key}><span>{label}</span><strong className={`runtime-invariant-${results?.[key] ?? 'unknown'}`}>{results?.[key] === 'pass' ? '通过' : results?.[key] === 'fail' ? '阻断' : '未知'}</strong></div>)}</div><p className="strategy-safe-copy">一对一、ASR 质量、阻断格式和术语冲突只读；不会通过浏览器解锁或推算。</p></section>;

const RuntimeReadError = ({ error, stale, onRetry, busy }: { error: unknown; stale: boolean; onRetry: () => void; busy: boolean }) => <ErrorBlock error={error} stale={stale} onRetry={onRetry} busy={busy} focusOnMount />;

const StrictRuleForm = ({ initial = rulePackDefaults }: { initial?: SystemControlPreReviewRulePack }) => <div className="strategy-runtime-form-grid">
  {FIELD_DEFINITIONS.map((field) => field.kind === 'toggle' ? <label className="strategy-runtime-toggle" key={field.key}><input name={field.key} type="checkbox" defaultChecked={Boolean(initial[field.key])} /><span>{field.label}</span><small>{initial[field.key] ? '开' : '关'}</small></label> : <Field key={field.key} label={field.label} {...(field.hint ? { hint: field.hint } : {})}><input name={field.key} type="number" min={field.key === 'maxCharacters' ? 1 : 0} max={field.key === 'alignmentNearbyGapMs' ? 5000 : field.key === 'maxCharacters' ? 200 : 1} step={field.kind === 'decimal' ? '0.000001' : '1'} defaultValue={field.kind === 'decimal' ? Number(initial[field.key]).toFixed(6) : String(initial[field.key])} required /></Field>)}
</div>;

const readRulePack = (data: FormData): SystemControlPreReviewRulePack => {
  const number = (key: string, fallback: number) => Number(data.get(key) ?? fallback);
  const decimal = Number(number('alignmentSimilarityThreshold', rulePackDefaults.alignmentSimilarityThreshold).toFixed(6));
  return { payloadType: 'pre_review_local_rule_pack_v1', alignmentNearbyGapMs: number('alignmentNearbyGapMs', 350), alignmentSimilarityThreshold: decimal, maxCharacters: number('maxCharacters', 28), forbidSentencePunctuation: data.get('forbidSentencePunctuation') === 'on', forbidMarkup: data.get('forbidMarkup') === 'on', forbidBrackets: data.get('forbidBrackets') === 'on', requireSpeakerDashForMultipleLines: data.get('requireSpeakerDashForMultipleLines') === 'on' };
};

const VersionSummary = ({ version, active }: { version: SystemControlStrategyRuntimeVersion; active: boolean }) => <div className="strategy-runtime-version-summary"><div><span className="strategy-kind">{originLabel(version.origin)}</span>{version.origin === 'system_baseline' ? <><span className="strategy-chip">受保护</span><span className="strategy-chip">不可删除</span></> : null}</div><h3>{active ? '当前生效版本' : '策略版本'}</h3><p>{STATUS_LABELS[version.status] ?? '未知状态'} · 内容摘要 {digestLabel(version.contentDigest)}</p><p className="strategy-safe-copy">{active ? '新会话将按服务端绑定事实使用；历史会话不被改写。' : '不可变版本；后续动作必须由管理员显式发起。'}</p></div>;

export const StrategyWaveC = () => {
  const [stage, setStage] = useState<Stage>('versions'); const [historyPage, setHistoryPage] = useState(0); const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false); const [importModal, setImportModal] = useState<{ commandId: string; artifactId: string; versionId: string; key: string } | null>(null); const [draftModal, setDraftModal] = useState<DraftIntent | null>(null); const [impactModal, setImpactModal] = useState<CommandIntent | null>(null); const [approvalModal, setApprovalModal] = useState<CommandIntent | null>(null); const [releaseModal, setReleaseModal] = useState<ReleaseIntent | null>(null);
  const [impact, setImpact] = useState<SystemControlStrategyImpactRun | null>(null); const [approval, setApproval] = useState<SystemControlStrategyApproval | null>(null); const [recovery, setRecovery] = useState<Recovery | null>(null); const [actionError, setActionError] = useState<unknown>(null); const [actionBusy, setActionBusy] = useState(false); const [recoveryBusy, setRecoveryBusy] = useState(false); const [statusMessage, setStatusMessage] = useState('');
  const sectionHeading = useRef<HTMLHeadingElement>(null); const previewTrigger = useRef<HTMLElement | null>(null); const historyTrigger = useRef<HTMLElement | null>(null); const historyDrawerSuppressed = useRef(false); const pendingFocus = useRef<string | null>(null); const selectedVersionRef = useRef<string | null>(null); const recoveryRef = useRef<Recovery | null>(null); const initializedSelection = useRef(false); const historyPageInitialized = useRef(false); const readRecoveryFocus = useRef(false);
  selectedVersionRef.current = selectedVersionId; recoveryRef.current = recovery;
  const target = useAsyncRead<SystemControlStrategyRuntimeTarget>((signal) => getRuntimeTarget(signal), [], { identity: 'runtime-target:pre_review' });
  const baseline = useAsyncRead(getBaselinePreview, [], { identity: 'baseline-preview:pre_review' });
  const history = useAsyncRead((signal) => listRuntimeHistory({ limit: '20', offset: String(historyPage * 20) }, signal), [historyPage], { identity: `runtime-history:${historyPage}` });
  const versionDetail = useAsyncRead(async (signal) => {
    if (!selectedVersionId) return null;
    if (target.data?.active?.strategyVersionId === selectedVersionId) return target.data.active;
    return getRuntimeVersion(selectedVersionId, signal);
  }, [selectedVersionId, target.data?.active?.strategyVersionId], { identity: `runtime-version:${selectedVersionId ?? 'none'}` });
  const selectedHistory = useMemo(() => history.data?.items.find((item) => item.strategyVersionId === selectedVersionId) ?? null, [history.data, selectedVersionId]);
  const selectedHistoryImpactId = selectedHistory?.impacts.at(-1)?.impactRunId ?? null;
  const selectedHistoryApprovalId = selectedHistory?.approvals.at(-1)?.approvalId ?? null;
  const historyImpact = useAsyncRead((signal) => selectedHistoryImpactId ? getImpactRun(selectedHistoryImpactId, signal) : Promise.resolve(null), [selectedHistoryImpactId], { identity: `runtime-impact:${selectedHistoryImpactId ?? 'none'}` });
  const historyApproval = useAsyncRead((signal) => selectedHistoryApprovalId ? getApproval(selectedHistoryApprovalId, signal) : Promise.resolve(null), [selectedHistoryApprovalId], { identity: `runtime-approval:${selectedHistoryApprovalId ?? 'none'}` });
  const selectedVersion = versionDetail.data;
  const selectedImpact = impact ?? historyImpact.data;
  const selectedApproval = approval ?? historyApproval.data;
  const readBusy = target.loading || target.refreshing || baseline.loading || baseline.refreshing || history.loading || history.refreshing || versionDetail.loading || historyImpact.loading || historyApproval.loading;
  const readFailure = target.error ? { error: target.error, stale: target.data !== null, retry: target.reload, busy: target.refreshing } : baseline.error ? { error: baseline.error, stale: baseline.data !== null, retry: baseline.reload, busy: baseline.refreshing } : history.error ? { error: history.error, stale: history.data !== null, retry: history.reload, busy: history.refreshing } : versionDetail.error ? { error: versionDetail.error, stale: versionDetail.data !== null, retry: versionDetail.reload, busy: versionDetail.refreshing } : historyImpact.error ? { error: historyImpact.error, stale: historyImpact.data !== null, retry: historyImpact.reload, busy: historyImpact.refreshing } : historyApproval.error ? { error: historyApproval.error, stale: historyApproval.data !== null, retry: historyApproval.reload, busy: historyApproval.refreshing } : null;
  const readBlocked = readBusy || Boolean(readFailure);
  const active = target.data?.active ?? null;
  const noActive = target.data !== null && !active;
  const selectedIsActive = Boolean(active && selectedVersionId === active.strategyVersionId);
  const impactPending = selectedImpact?.status === 'queued' || selectedImpact?.status === 'running' || selectedImpact?.status === 'unknown';
  const impactRecovery = recovery?.kind === 'impact' && recovery.versionId === selectedVersionId;
  const canImpact = Boolean(selectedVersion && !readBlocked && !impactPending && !impactRecovery && !selectedIsActive && ['draft', 'testing', 'impact_checked', 'approved', 'retired'].includes(selectedVersion.status));
  const canApprove = Boolean(selectedVersion && !readBlocked && hasPassingImpact(selectedImpact));
  const canRelease = Boolean(selectedVersion && !readBlocked && ['approved', 'retired'].includes(selectedVersion.status) && selectedApproval && hasPassingImpact(selectedImpact) && selectedImpact?.strategyVersionId === selectedVersion.strategyVersionId && selectedApproval.strategyVersionId === selectedVersion.strategyVersionId);
  const releaseAction = selectedVersion?.status === 'retired' ? 'rollback' : 'publish';
  const refreshAll = () => { target.reload(); baseline.reload(); history.reload(); if (selectedVersionId) versionDetail.reload(); historyImpact.reload(); historyApproval.reload(); };
  const selectVersion = (id: string, trigger?: HTMLElement) => { historyDrawerSuppressed.current = false; setSelectedVersionId(id); setImpact(null); setApproval(null); setRecovery(null); setActionError(null); if (trigger) historyTrigger.current = trigger; };
  const clearHistoryIdentity = () => {
    setSelectedVersionId(null); setImpact(null); setApproval(null); setRecovery(null); setActionError(null);
    setPreviewOpen(false); setImportModal(null); setDraftModal(null); setImpactModal(null); setApprovalModal(null); setReleaseModal(null);
    pendingFocus.current = null; historyTrigger.current = null; historyDrawerSuppressed.current = false;
  };
  const changeStage = (next: Stage) => {
    if (next === 'history' || stage === 'history') clearHistoryIdentity();
    setStage(next);
  };
  const closeHistoryDrawer = () => { setSelectedVersionId(null); setImpact(null); setApproval(null); setRecovery(null); setActionError(null); };
  const closeHistoryForRecovery = () => { setSelectedVersionId(null); setImpact(null); setApproval(null); setActionError(null); pendingFocus.current = null; historyTrigger.current = null; historyDrawerSuppressed.current = true; };
  const clearConflict = (error: unknown, close: () => void) => { close(); setRecovery(null); setActionError(error); refreshAll(); readRecoveryFocus.current = false; };
  useEffect(() => { if (stage !== 'history' && !initializedSelection.current && !selectedVersionId && baseline.data?.strategyVersionId) { initializedSelection.current = true; setSelectedVersionId(baseline.data.strategyVersionId); } }, [baseline.data?.strategyVersionId, selectedVersionId, stage]);
  useEffect(() => { if (historyPageInitialized.current) clearHistoryIdentity(); else historyPageInitialized.current = true; }, [historyPage]);
  useEffect(() => { if (selectedVersion?.strategyVersionId === pendingFocus.current) { pendingFocus.current = null; sectionHeading.current?.focus(); } }, [selectedVersion]);
  useEffect(() => { if (readRecoveryFocus.current && !readBusy && !readFailure) { readRecoveryFocus.current = false; sectionHeading.current?.focus(); } }, [readBusy, readFailure]);

  const submitImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!importModal) return; setActionBusy(true); setActionError(null);
    try { const version = await importBaseline({ baselineImportId: importModal.commandId, artifactId: importModal.artifactId, versionId: importModal.versionId }, importModal.key); setImportModal(null); setSelectedVersionId(version.strategyVersionId); pendingFocus.current = version.strategyVersionId; setStatusMessage('系统初始基线已导入；当前生效指针未移动。'); refreshAll(); }
    catch (error) { if (isUnknownResult(error)) { setRecovery({ kind: 'baseline', commandId: importModal.commandId, versionId: importModal.versionId, error }); setImportModal(null); } else if (isDeterministicConflict(error)) clearConflict(error, () => setImportModal(null)); else { setImportModal(null); setActionError(error); refreshAll(); } }
    finally { setActionBusy(false); }
  };
  const submitDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!draftModal || !selectedVersion) return; setActionBusy(true); setActionError(null);
    try { const payload = readRulePack(new FormData(event.currentTarget)); await createStrategyArtifact({ artifactId: draftModal.artifactId, versionId: draftModal.versionId, kind: 'local_rule_pack', displayName: '前置审改本地规则', purpose: '严格字段规则草稿', applicableModules: ['pre_review'], schemaVersion: 1, payload, baseVersionId: draftModal.baseVersionId, source: 'manual' }, draftModal.key); setDraftModal(null); setStatusMessage('严格字段草稿已创建；生产规则没有改变。'); refreshAll(); }
    catch (error) { if (isUnknownResult(error)) { setRecovery({ kind: 'draft', commandId: draftModal.versionId, artifactId: draftModal.artifactId, versionId: draftModal.versionId, error }); setDraftModal(null); } else if (isDeterministicConflict(error)) clearConflict(error, () => setDraftModal(null)); else setActionError(error); }
    finally { setActionBusy(false); }
  };
  const submitImpact = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!impactModal) return; setActionBusy(true); setActionError(null); try { const run = await createImpactRun({ impactRunId: impactModal.id, strategyVersionId: impactModal.versionId }, impactModal.key); setImpact(run); setImpactModal(null); setStage('impact'); setStatusMessage('影子影响验证已创建；结果由服务端固定快照形成。'); if (run.status === 'queued' || run.status === 'running' || run.status === 'unknown') setRecovery({ kind: 'impact', commandId: run.impactRunId, versionId: run.strategyVersionId, error: new ControlApiError('结果尚未形成，请查询本次影子影响验证。', { retryable: true }) }); refreshAll(); } catch (error) { if (isUnknownResult(error)) { setRecovery({ kind: 'impact', commandId: impactModal.id, versionId: impactModal.versionId, error }); setImpactModal(null); } else if (isDeterministicConflict(error)) clearConflict(error, () => setImpactModal(null)); else setActionError(error); } finally { setActionBusy(false); } };
  const submitApproval = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!approvalModal || !selectedImpact) return; setActionBusy(true); setActionError(null); try { const result = await createApproval({ approvalId: approvalModal.id, impactRunId: selectedImpact.impactRunId, strategyVersionId: approvalModal.versionId }, approvalModal.key); setApproval(result); setApprovalModal(null); setStage('approval'); setStatusMessage('人工批准已记录；当前生效指针未移动。'); refreshAll(); } catch (error) { if (isUnknownResult(error)) { setRecovery({ kind: 'approval', commandId: approvalModal.id, versionId: approvalModal.versionId, error }); setApprovalModal(null); } else if (isDeterministicConflict(error)) clearConflict(error, () => setApprovalModal(null)); else setActionError(error); } finally { setActionBusy(false); } };
  const submitRelease = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!releaseModal) return; setActionBusy(true); setActionError(null); const intent = releaseModal; try { const command = await createReleaseCommand({ releaseCommandId: intent.id, action: intent.action, strategyVersionId: intent.versionId, expectedPreviousStrategyVersionId: intent.expectedPreviousStrategyVersionId, impactRunId: intent.impactRunId, approvalId: intent.approvalId, contentDigest: intent.contentDigest }, intent.key); setReleaseModal(null); setStatusMessage(command.action === 'publish' ? '发布已完成；新的当前生效版本已聚焦。' : '恢复已完成；新的当前生效版本已聚焦。'); setSelectedVersionId(command.strategyVersionId); refreshAll(); pendingFocus.current = command.strategyVersionId; } catch (error) { if (isUnknownResult(error)) { if (intent.action === 'rollback' && stage === 'history') closeHistoryForRecovery(); setRecovery({ kind: 'release', commandId: intent.id, versionId: intent.versionId, action: intent.action, error }); setReleaseModal(null); } else if (isDeterministicConflict(error)) clearConflict(error, () => setReleaseModal(null)); else setActionError(error); } finally { setActionBusy(false); } };

  const recover = async () => {
    if (!recovery || recoveryBusy) return; const intent = recovery; setRecoveryBusy(true);
    const recoveryIdentityIsCurrent = () => {
      const current = recoveryRef.current;
      if (!current || current.kind !== intent.kind || current.commandId !== intent.commandId) return false;
      return intent.kind !== 'release' || (current.kind === 'release' && current.versionId === intent.versionId && current.action === intent.action);
    };
    try {
      if (recovery.kind === 'baseline') { const version = await getBaselineImport(recovery.commandId); if (recoveryRef.current?.commandId !== intent.commandId) return; setSelectedVersionId(version.strategyVersionId); setRecovery(null); pendingFocus.current = version.strategyVersionId; setStatusMessage('已恢复系统初始基线导入事实。'); refreshAll(); }
      else if (recovery.kind === 'draft') { await getStrategyVersion(recovery.artifactId, recovery.versionId); if (selectedVersionRef.current !== intent.versionId || recoveryRef.current?.commandId !== intent.commandId) return; setSelectedVersionId(recovery.versionId); setRecovery(null); setStatusMessage('已恢复严格字段草稿事实。'); refreshAll(); queueMicrotask(() => sectionHeading.current?.focus()); }
      else if (intent.kind === 'impact') { const result = await getImpactRun(intent.commandId); if (selectedVersionRef.current !== intent.versionId || recoveryRef.current?.commandId !== intent.commandId) return; if (result.status === 'succeeded' || result.status === 'failed') { setImpact(result); setRecovery(null); setStatusMessage(result.status === 'succeeded' ? '影子影响验证结果已恢复。' : '影子影响验证已形成失败事实。'); refreshAll(); queueMicrotask(() => sectionHeading.current?.focus()); } else setRecovery((current) => current ? { ...current, error: new ControlApiError('结果尚未形成，请继续查询同一验证。', { retryable: true }) } : current); }
      else if (intent.kind === 'approval') { const result = await getApproval(intent.commandId); if (selectedVersionRef.current !== intent.versionId || recoveryRef.current?.commandId !== intent.commandId) return; setApproval(result); setRecovery(null); setStatusMessage('人工批准结果已恢复。'); refreshAll(); queueMicrotask(() => sectionHeading.current?.focus()); }
      else if (intent.kind === 'release') { const result = await getReleaseCommand(intent.commandId); if (!recoveryIdentityIsCurrent()) return; if (result.status === 'succeeded' || result.status === 'failed') { setRecovery(null); if (intent.action === 'rollback') setStage('versions'); setSelectedVersionId(result.strategyVersionId); setStatusMessage(result.action === 'publish' ? '发布结果已恢复。' : '恢复结果已恢复。'); refreshAll(); pendingFocus.current = result.strategyVersionId; } else setRecovery((current) => current ? { ...current, error: new ControlApiError('命令结果尚未形成，请继续查询同一命令。', { retryable: true }) } : current); }
    } catch (error) {
      if (!recoveryIdentityIsCurrent() || (intent.kind !== 'baseline' && intent.kind !== 'release' && selectedVersionRef.current !== intent.versionId)) return;
      setRecovery((current) => current ? { ...current, error } : current);
    }
    finally { setRecoveryBusy(false); }
  };

  const openImpact = () => { if (selectedVersion) { setActionError(null); setRecovery(null); setImpactModal({ id: createStableId(), key: createStableId(), versionId: selectedVersion.strategyVersionId }); } };
  const openApproval = () => { if (selectedVersion) { setActionError(null); setRecovery(null); setApprovalModal({ id: createStableId(), key: createStableId(), versionId: selectedVersion.strategyVersionId }); } };
  const openRelease = (action: 'publish' | 'rollback') => { if (!selectedVersion || !selectedImpact || !selectedApproval) return; setActionError(null); setRecovery(null); setReleaseModal({ id: createStableId(), key: createStableId(), versionId: selectedVersion.strategyVersionId, action, expectedPreviousStrategyVersionId: active?.strategyVersionId ?? null, impactRunId: selectedImpact.impactRunId, approvalId: selectedApproval.approvalId, contentDigest: selectedVersion.contentDigest }); };
  const openDraft = () => { if (selectedVersion) { setRecovery(null); setActionError(null); setDraftModal({ artifactId: createStableId(), versionId: createStableId(), key: createStableId(), baseVersionId: selectedVersion.strategyVersionId }); } };
  const currentRulePack = selectedVersion?.rulePack ?? active?.rulePack ?? null;
  const oldSessionCount = selectedImpact?.oldUnboundSessionCount ?? 0;
  const modalOpen = Boolean(previewOpen || importModal || draftModal || impactModal || approvalModal || releaseModal);
  const readFailureShownInStage = Boolean(history.error && (stage === 'versions' || stage === 'history'));

  return <section className="strategy-wave-c" data-testid="strategy-wave-c">
    <header className="strategy-runtime-header"><div><h2 ref={sectionHeading} tabIndex={-1}>前置审改本地规则</h2><p>Wave C：基线、固定快照影子验证、人工批准、发布与历史恢复。</p></div><div className="cp-actions"><button className="cp-secondary" type="button" onClick={refreshAll} disabled={readBusy}>重新读取</button></div></header>
    {readFailure && !readFailureShownInStage ? <RuntimeReadError error={readFailure.error} stale={readFailure.stale} onRetry={() => { readRecoveryFocus.current = true; readFailure.retry(); }} busy={readFailure.busy} /> : null}
    {actionError && !modalOpen ? <ErrorBlock error={actionError} title="操作未完成" showRetry={false} focusOnMount /> : null}
     {recovery ? <CommandRecovery kind={recovery.kind === 'baseline' ? 'strategy-runtime-baseline' : recovery.kind === 'draft' ? 'strategy-runtime-draft' : recovery.kind === 'impact' ? 'strategy-runtime-impact' : recovery.kind === 'approval' ? 'strategy-runtime-approval' : 'strategy-runtime-release'} identity={recovery.commandId} onRecover={() => void recover()} busy={recoveryBusy} error={recovery.error} showIdentity={false} {...(recovery.kind === 'release' && recovery.action === 'rollback' ? { actionLabel: '查询本次策略恢复结果' } : {})} /> : null}
    <div className="strategy-runtime-status-strip"><div><span>当前生效</span><strong>{active ? `${originLabel(active.origin)} · ${shortId(active.strategyVersionId)}` : '尚无可执行版本'}</strong></div><div><span>旧会话门禁</span><strong>{oldSessionCount ? `${oldSessionCount} 个未完成旧会话` : '等待服务端验证'}</strong></div><div><span>下一步</span><strong>{noActive ? '预览并导入系统初始基线' : selectedVersion ? STATUS_LABELS[selectedVersion.status] : '选择历史版本核对'}</strong></div></div>
    {noActive ? <div className="strategy-runtime-blocker" role="status"><strong>尚无可执行版本，新会话已阻断</strong><span>请先预览系统初始基线；导入不会移动当前生效指针。</span><button className="cp-primary" type="button" disabled={readBlocked} onClick={(event) => { previewTrigger.current = event.currentTarget; setPreviewOpen(true); }}>预览系统初始基线</button></div> : null}
    {readBusy && !target.data ? <LoadingBlock label="读取前置审改运行时事实…" /> : null}
    <nav className="strategy-runtime-steps" aria-label="本地规则步骤">{([['versions', '基线与版本'], ['impact', '影子验证'], ['approval', '批准与发布'], ['history', '历史与恢复']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={stage === id} onClick={() => changeStage(id)}>{label}</button>)}</nav>
    {stage === 'versions' ? <section className="strategy-runtime-grid"><div className="strategy-runtime-main"><div className="cp-section-head"><div><h3>版本与当前生效</h3><p>系统初始基线永久保留；浏览器不创建默认生效版本。</p></div><span>{history.data?.total ?? '—'} 个历史版本</span></div>{active ? <><VersionSummary version={active} active /><div className="cp-actions"><button className="cp-primary" type="button" disabled={readBlocked} onClick={() => selectVersion(active.strategyVersionId)}>核对当前版本</button></div></> : <EmptyBlock title="当前没有生效版本" detail="基线导入、验证、批准和发布必须逐步显式完成。" />}{history.error ? <RuntimeReadError error={history.error} stale={history.data !== null} onRetry={() => { readRecoveryFocus.current = true; history.reload(); }} busy={history.refreshing} /> : history.loading && !history.data ? <LoadingBlock label="读取版本历史…" /> : history.data?.items.length ? <div className="strategy-runtime-history-list">{history.data.items.map((item) => <button key={item.strategyVersionId} type="button" aria-pressed={selectedVersionId === item.strategyVersionId} onClick={(event) => selectVersion(item.strategyVersionId, event.currentTarget)}><span>{originLabel(item.origin)}{item.origin === 'system_baseline' ? ' · 受保护 · 不可删除' : ''}</span><strong>{STATUS_LABELS[item.status] ?? '未知状态'}</strong><small>{digestLabel(item.contentDigest)} · {formatDate(item.createdAt)}</small></button>)}</div> : <EmptyBlock title="暂无历史版本事实" detail="服务端尚未登记前置审改本地规则版本。" />}{history.data ? <div className="strategy-pagination"><span>第 {history.data.total ? historyPage + 1 : 0} / {Math.ceil(history.data.total / history.data.limit) || 0} 页</span><div><button className="cp-secondary" disabled={historyPage === 0} type="button" onClick={() => { setHistoryPage((value) => value - 1); setSelectedVersionId(null); setRecovery(null); }}>上一页</button><button className="cp-secondary" disabled={(historyPage + 1) * history.data.limit >= history.data.total} type="button" onClick={() => { setHistoryPage((value) => value + 1); setSelectedVersionId(null); setRecovery(null); }}>下一页</button></div></div> : null}</div><aside className="strategy-runtime-side">{selectedVersion ? <><VersionSummary version={selectedVersion} active={selectedIsActive} /><RulePackView pack={selectedVersion.rulePack} /><InvariantView results={selectedImpact?.invariantResults ?? null} /><div className="cp-actions"><button className="cp-primary" type="button" disabled={!canImpact} onClick={openImpact}>创建固定快照影子验证</button>{selectedVersion.origin === 'system_baseline' ? <button className="cp-secondary" type="button" disabled={readBlocked} onClick={openDraft}>基于基线创建自定义草稿</button> : null}</div></> : <EmptyBlock title="请选择一个版本" detail="历史列表只展示服务端摘要；选择后才读取完整严格字段。" />}</aside></section> : null}
    {stage === 'impact' ? <section className="strategy-runtime-grid"><div className="strategy-runtime-main"><div className="cp-section-head"><div><h3>固定快照影子影响验证</h3><p>零网络、零 AI、零付费；覆盖和指标全部来自服务端不可变快照。</p></div></div>{selectedVersion ? <VersionSummary version={selectedVersion} active={selectedIsActive} /> : <EmptyBlock title="尚未选择版本" detail="先从基线与版本中选择不可变版本。" />}{selectedImpact ? <ImpactResult impact={selectedImpact} /> : <EmptyBlock title="尚未创建影子验证" detail="创建后只读取同一 impact 身份，不自动创建第二次。" />}<div className="cp-actions"><button className="cp-primary" type="button" disabled={!canImpact} onClick={openImpact}>创建影子影响验证</button><button className="cp-secondary" type="button" onClick={() => changeStage('versions')}>返回版本核对</button></div></div><aside className="strategy-runtime-side"><InvariantView results={selectedImpact?.invariantResults ?? null} /><p className="strategy-safe-copy">影子验证完成后仍需人工批准；不会自动移动当前生效指针。</p></aside></section> : null}
    {stage === 'approval' ? <section className="strategy-runtime-grid"><div className="strategy-runtime-main"><div className="cp-section-head"><div><h3>人工批准与独立发布</h3><p>批准只改变版本状态；发布/恢复是另一条受保护命令。</p></div></div>{selectedVersion ? <VersionSummary version={selectedVersion} active={selectedIsActive} /> : <EmptyBlock title="尚未选择版本" detail="请选择已完成影子验证的版本。" />}{selectedImpact ? <ImpactResult impact={selectedImpact} /> : null}{selectedApproval ? <div className="strategy-runtime-success" role="status"><strong>人工批准已记录</strong><span>版本已批准，当前生效指针仍保持不变。</span></div> : null}<div className="cp-actions"><button className="cp-primary" type="button" disabled={!canApprove} onClick={openApproval}>人工批准</button><button className="cp-secondary" type="button" disabled={!canRelease} onClick={() => openRelease(releaseAction)}>{releaseAction === 'rollback' ? '创建恢复命令' : active ? '确认发布' : '确认首次发布'}</button><button className="cp-secondary" type="button" onClick={() => changeStage('impact')}>返回影子验证</button></div></div><aside className="strategy-runtime-side"><InvariantView results={selectedImpact?.invariantResults ?? null} />{oldSessionCount ? <div className="strategy-runtime-warning"><strong>未完成旧会话</strong><span>{oldSessionCount} 个会话尚未绑定策略版本；发布前必须按现有工作流完成后重新读取。</span></div> : null}</aside></section> : null}
    {stage === 'history' ? <section className="strategy-runtime-history-stage"><div className="cp-section-head"><div><h3>历史与逐字段比较</h3><p>历史不可改写；恢复只允许已通过同一影子验证和人工批准门的目标。</p></div></div>{history.error ? <RuntimeReadError error={history.error} stale={history.data !== null} onRetry={() => { readRecoveryFocus.current = true; history.reload(); }} busy={history.refreshing} /> : history.loading && !history.data ? <LoadingBlock label="读取历史与发布事件…" /> : history.data?.items.length ? <div className="strategy-table-wrap"><table><thead><tr><th>版本 / 来源</th><th>状态</th><th>结构化摘要</th><th>内容摘要</th><th>影响 / 批准</th><th>发布 / 恢复事件</th><th>操作</th></tr></thead><tbody>{history.data.items.map((item) => <tr key={item.strategyVersionId}><td><strong>{originLabel(item.origin)}</strong><small>{item.origin === 'system_baseline' ? '受保护 · 不可删除' : shortId(item.strategyVersionId)}</small></td><td>{STATUS_LABELS[item.status] ?? '未知状态'}</td><td>{item.origin === 'system_baseline' ? '七项严格字段' : '不可变版本'}</td><td><code>{digestLabel(item.contentDigest)}</code></td><td>{item.impacts.length} / {item.approvals.length}</td><td>{item.releaseEvents.length}</td><td><button type="button" className="cp-secondary" onClick={(event) => selectVersion(item.strategyVersionId, event.currentTarget)}>比较</button></td></tr>)}</tbody></table></div> : <EmptyBlock title="暂无历史版本" detail="系统初始基线和后续不可变版本会在服务端登记后出现。" />}{history.data ? <div className="strategy-pagination"><span>服务端分页共 {history.data.total} 项</span><div><button className="cp-secondary" disabled={historyPage === 0} type="button" onClick={() => setHistoryPage((value) => value - 1)}>上一页</button><button className="cp-secondary" disabled={(historyPage + 1) * history.data.limit >= history.data.total} type="button" onClick={() => setHistoryPage((value) => value + 1)}>下一页</button></div></div> : null}{selectedVersion && !historyDrawerSuppressed.current ? <FocusDrawer title="逐字段比较与恢复" onClose={closeHistoryDrawer} returnFocus={historyTrigger}><VersionComparison active={active} target={selectedVersion} impact={selectedImpact} approval={selectedApproval} canRelease={canRelease} onRelease={() => openRelease('rollback')} /></FocusDrawer> : null}</section> : null}
    {previewOpen ? <FocusDrawer title="系统初始基线预览" onClose={() => setPreviewOpen(false)} returnFocus={previewTrigger}><div className="strategy-runtime-preview"><p>来源：系统初始基线。导入不等于发布；只会创建受保护、不可更新、不可删除的不可变数据库版本。</p>{baseline.data ? <><RulePackView pack={baseline.data.rulePack} /><InvariantView results={null} /><div className="cp-actions"><button className="cp-secondary" type="button" onClick={() => setPreviewOpen(false)}>返回预览</button><button className="cp-primary" type="button" disabled={readBlocked || baseline.data.imported} onClick={() => { setPreviewOpen(false); setActionError(null); setImportModal({ commandId: createStableId(), artifactId: createStableId(), versionId: createStableId(), key: createStableId() }); }}>{baseline.data.imported ? '已导入系统初始基线' : '确认导入系统初始基线'}</button></div></> : baseline.loading ? <LoadingBlock /> : <EmptyBlock title="暂无基线预览事实" detail="服务端未提供可导入的系统初始基线。" />}</div></FocusDrawer> : null}
    {importModal ? <Modal title="导入系统初始基线" onClose={() => { if (!actionBusy) { setImportModal(null); setActionError(null); } }} busy={actionBusy} locked={actionBusy} onSubmit={submitImport} submitLabel="确认导入">{actionError ? <ErrorBlock error={actionError} title="基线未导入" showRetry={false} focusOnMount={!actionBusy} /> : null}<p>将创建“来源：系统初始基线”的不可变数据库版本。该版本受保护、不可更新、不可删除，并长期保留供查询、比较和人工恢复。</p><p className="strategy-safe-copy">导入不会发布，不会移动当前生效指针，也不会自动触发影子验证。</p></Modal> : null}
    {draftModal ? <Modal title="基于基线创建严格字段草稿" onClose={() => { if (!actionBusy) { setDraftModal(null); setActionError(null); } }} busy={actionBusy} locked={actionBusy} onSubmit={submitDraft} submitLabel="创建不可变草稿">{actionError ? <ErrorBlock error={actionError} title="草稿未保存" showRetry={false} focusOnMount={!actionBusy} /> : null}<p className="strategy-safe-copy">基于 {shortId(draftModal.baseVersionId)} 创建下一不可变版本；只能编辑七个严格字段，不覆盖基线。</p><StrictRuleForm initial={currentRulePack ?? rulePackDefaults} /></Modal> : null}
    {impactModal ? <Modal title="创建固定快照影子影响验证" onClose={() => { if (!actionBusy) { setImpactModal(null); setActionError(null); } }} busy={actionBusy} locked={actionBusy} onSubmit={submitImpact} submitLabel="创建影子验证">{actionError ? <ErrorBlock error={actionError} title="影子验证未创建" showRetry={false} focusOnMount={!actionBusy} /> : null}<p>版本 {shortId(impactModal.versionId)} 将使用服务端固定输入快照；零网络、零 AI、零付费，不会移动当前生效指针。</p></Modal> : null}
    {approvalModal ? <Modal title="人工批准策略版本" onClose={() => { if (!actionBusy) { setApprovalModal(null); setActionError(null); } }} busy={actionBusy} locked={actionBusy} onSubmit={submitApproval} submitLabel="确认人工批准">{actionError ? <ErrorBlock error={actionError} title="批准未保存" showRetry={false} focusOnMount={!actionBusy} /> : null}<p>请核对当前版本、影子验证结果和四项只读安全不变量。批准不会移动当前生效指针。</p>{selectedImpact ? <ImpactResult impact={selectedImpact} /> : null}</Modal> : null}
    {releaseModal ? <Modal title={releaseModal.action === 'publish' ? (active ? '确认发布策略版本' : '确认首次发布') : '确认恢复策略版本'} onClose={() => { if (!actionBusy) { setReleaseModal(null); setActionError(null); } }} busy={actionBusy} locked={actionBusy} onSubmit={submitRelease} submitLabel={releaseModal.action === 'publish' ? '创建发布命令' : '创建恢复命令'}>{actionError ? <ErrorBlock error={actionError} title="发布/恢复未保存" showRetry={false} focusOnMount={!actionBusy} /> : null}<div className="strategy-runtime-confirm"><strong>{active ? '当前生效版本 → 目标版本' : '无当前生效版本 → 首次发布版本'}</strong><span>目标内容摘要：{digestLabel(releaseModal.contentDigest)}</span><span>只影响新建会话；历史不改写。发布/恢复结果未知时只查询同一命令。</span>{oldSessionCount ? <b>未完成旧会话：{oldSessionCount} 个；服务端门禁可能阻断本次命令。</b> : null}</div></Modal> : null}
    <div aria-live="polite" role="status" className="strategy-status">{statusMessage}</div>
  </section>;
};

const ImpactResult = ({ impact }: { impact: SystemControlStrategyImpactRun }) => <section className="strategy-runtime-card"><div className="cp-section-head"><div><h3>影子影响验证结果</h3><p>{STATUS_LABELS[impact.status] ?? '未知状态'} · 服务端固定快照已保留。</p></div><span className="strategy-chip">内容摘要 {digestLabel(impact.snapshotDigest)}</span></div><div className="strategy-runtime-impact-metrics"><div><span>影响会话</span><strong>{impact.affectedSessionCount}</strong></div><div><span>样本</span><strong>{impact.sampleCount}</strong></div><div><span>未绑定旧会话</span><strong>{impact.oldUnboundSessionCount}</strong></div><div><span>阻断项</span><strong>{impact.blockers.length}</strong></div></div>{impact.blockers.length ? <ul className="strategy-runtime-blocker-list">{impact.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : null}<InvariantView results={impact.invariantResults} /></section>;

const VersionComparison = ({ active, target, impact, approval, canRelease, onRelease }: { active: SystemControlStrategyRuntimeVersion | null; target: SystemControlStrategyRuntimeVersion; impact: SystemControlStrategyImpactRun | null; approval: SystemControlStrategyApproval | null; canRelease: boolean; onRelease: () => void }) => <div className="strategy-runtime-comparison"><div className="strategy-runtime-compare-grid"><div><span>当前生效</span>{active ? <RulePackView pack={active.rulePack} title={originLabel(active.origin)} /> : <EmptyBlock title="无当前生效版本" detail="这是首次发布目标。" />}</div><div><span>目标版本</span><RulePackView pack={target.rulePack} title={`${originLabel(target.origin)} · ${STATUS_LABELS[target.status]}`} /></div></div><div className="strategy-runtime-card"><h3>恢复安全门</h3><p>恢复只允许已通过同一影子验证和人工批准门的系统基线或历史版本；历史不改写，只影响新建会话。</p><dl className="strategy-runtime-fields"><div><dt>影子验证</dt><dd>{impact && hasPassingImpact(impact) ? '已通过' : '未通过安全门'}</dd></div><div><dt>人工批准</dt><dd>{approval ? '已记录' : '未记录'}</dd></div><div><dt>内容摘要</dt><dd>{digestLabel(target.contentDigest)}</dd></div></dl><button className="cp-primary" type="button" disabled={!canRelease} onClick={onRelease}>创建恢复命令</button></div></div>;
