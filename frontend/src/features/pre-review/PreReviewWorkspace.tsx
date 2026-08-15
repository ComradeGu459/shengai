import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApplyPreEditPolicyBody,
  CreatePreEditDecisionBody,
  PreEditDecisionAction,
  PreEditItem,
} from '@qimao-terms-cloud/contracts';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { projectModules } from '../../modules.js';
import { getProjectMaterialState } from '../materials/api.js';
import { getTermWorkspace } from '../terms/api.js';
import {
  applyPreEditPolicy,
  completePreEditEpisode,
  createPreEditDecision,
  createPreEditRelease,
  createPreEditSession,
  getPreEditSession,
  listPreEditItems,
  listPreEditReleases,
  listPreEditSessions,
  PreReviewApiError,
  retryPreEditPreparation,
  undoPreEditDecision,
} from './api.js';
import {
  BaselineDialog,
  ConfirmDecisionDialog,
  FullAxisDrawer,
  trapFocus,
  VideoEvidence,
} from './PreReviewPanels.js';
import {
  alignmentLabels,
  decisionLabels,
  episodeStatusLabels,
  itemState,
  itemTimeRange,
  formatMs,
  normalizedTextLength,
  sessionStatusLabels,
  statusLabels,
} from './model.js';
import styles from './PreReviewWorkspace.module.css';

type ListStatus = keyof typeof statusLabels;
type QueueView = 'episodes' | 'issues';
type Intent<T> = { signature: string; key: string; payload: T };
type DecisionPayload = { itemId: string; body: CreatePreEditDecisionBody };

const intentFor = <T,>(current: Intent<T> | null, signature: string, payload: T) =>
  current?.signature === signature ? current : { signature, key: crypto.randomUUID(), payload };

const apiRequestId = (error: unknown) => error instanceof PreReviewApiError ? error.requestId : null;
const canReplayIntent = (error: unknown) =>
  error instanceof TypeError || (error instanceof PreReviewApiError && error.retryable);
const recoveryAction = (error: unknown, replay: string) =>
  canReplayIntent(error) ? replay : '重新读取权威事实';

const ErrorBlock = ({ title, error, action, onAction, actionRef, pending = false }: {
  title: string;
  error: unknown;
  action: string;
  onAction: () => void;
  actionRef?: RefObject<HTMLButtonElement | null>;
  pending?: boolean;
}) => <div className={styles.errorState} role="alert"><strong>{title}</strong><span>{error instanceof Error ? error.message : '未知错误'}</span>{apiRequestId(error) && <small>请求标识 {apiRequestId(error)}</small>}<button type="button" ref={actionRef} disabled={pending} onClick={onAction}>{pending ? '正在处理' : action}</button></div>;

const SourceText = ({ label, source, cues, unavailable = false }: {
  label: string;
  source: string;
  cues: PreEditItem['companyCues'];
  unavailable?: boolean;
}) => <section className={`${styles.sourceBlock} ${source === 'A' ? styles.companySource : styles.asrSource}`}>
  <header><div><span>来源 {source}</span><h3>{label}</h3></div><em>{unavailable ? '不可用' : '只读证据'}</em></header>
  {unavailable ? <p className={styles.unavailableText}>本集缺少可用 ASR，只能进行公司稿有限审改。</p> : cues.length ? cues.map((cue) => <div className={styles.cueText} key={cue.cueId}><span>{source}{cue.cueIndex} · {formatMs(cue.startMs)}–{formatMs(cue.endMs)}</span><p>{cue.text}</p></div>) : <p className={styles.unavailableText}>此对齐组没有该来源轴。</p>}
</section>;

export const PreReviewWorkspace = () => {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null);
  const [status, setStatus] = useState<ListStatus>('pending');
  const [queueView, setQueueView] = useState<QueueView>('episodes');
  const [screeningExpanded, setScreeningExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [locatedItem, setLocatedItem] = useState<PreEditItem | null>(null);
  const [baselineOpen, setBaselineOpen] = useState(false);
  const [fullAxisOpen, setFullAxisOpen] = useState(false);
  const [dangerAction, setDangerAction] = useState<PreEditDecisionAction | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorText, setEditorText] = useState('');
  const [reasonMode, setReasonMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [dirtyGuard, setDirtyGuard] = useState(false);
  const [feedback, setFeedback] = useState('');
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const sourceHeaderRef = useRef<HTMLElement | null>(null);
  const gateStateRef = useRef<HTMLDivElement | null>(null);
  const gateRetryRef = useRef<HTMLButtonElement | null>(null);
  const decisionPaneRef = useRef<HTMLElement | null>(null);
  const decisionRetryRef = useRef<HTMLButtonElement | null>(null);
  const undoRetryRef = useRef<HTMLButtonElement | null>(null);
  const listRetryRef = useRef<HTMLButtonElement | null>(null);
  const sessionRetryRef = useRef<HTMLButtonElement | null>(null);
  const createRetryRef = useRef<HTMLButtonElement | null>(null);
  const prepareStateRef = useRef<HTMLDivElement | null>(null);
  const prepareRetryRef = useRef<HTMLButtonElement | null>(null);
  const baselineTrigger = useRef<HTMLButtonElement | null>(null);
  const fullAxisTrigger = useRef<HTMLButtonElement | null>(null);
  const dangerTrigger = useRef<HTMLButtonElement | null>(null);
  const guardSaveRef = useRef<HTMLButtonElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const footerRetryRef = useRef<HTMLButtonElement | null>(null);
  const listRecovery = useRef(false);
  const sessionRecovery = useRef(false);
  const gateRecovery = useRef(false);
  const createIntent = useRef<Intent<{ termVersionId: string; expectedProjectVersion: number }> | null>(null);
  const preparationIntent = useRef<Intent<{ expectedSessionRevision: number }> | null>(null);
  const decisionIntent = useRef<Intent<DecisionPayload> | null>(null);
  const undoIntent = useRef<Intent<{ itemId: string; expectedVersion: number; decisionEventId: string }> | null>(null);
  const policyIntent = useRef<Intent<ApplyPreEditPolicyBody> | null>(null);
  const completeIntent = useRef<Intent<{ episodeNumber: number; expectedEpisodeRevision: number }> | null>(null);
  const releaseIntent = useRef<Intent<{ expectedSessionRevision: number }> | null>(null);
  const pendingTransition = useRef<(() => void) | null>(null);
  const pageSize = 30;

  const materials = useQuery({ queryKey: ['project-material-state', projectId], queryFn: () => getProjectMaterialState(projectId), enabled: Boolean(projectId), retry: false });
  const terms = useQuery({ queryKey: ['term-workspace', projectId], queryFn: () => getTermWorkspace(projectId), enabled: Boolean(projectId), retry: false });
  const sessions = useQuery({ queryKey: ['pre-review-sessions', projectId], queryFn: () => listPreEditSessions(projectId), enabled: Boolean(projectId), retry: false });
  const session = useQuery({
    queryKey: ['pre-review-session', projectId, sessionId],
    queryFn: () => getPreEditSession(projectId, sessionId!),
    enabled: Boolean(projectId && sessionId),
    retry: false,
  });
  const currentEpisode = session.data?.episodes.find((entry) => entry.episodeNumber === episodeNumber) ?? null;
  const items = useQuery({
    queryKey: ['pre-review-items', projectId, sessionId, episodeNumber, status, search, page],
    queryFn: () => listPreEditItems(projectId, sessionId!, {
      episodeNumber: episodeNumber!, status, ...(search.trim() ? { search: search.trim() } : {}),
      limit: pageSize, offset: page * pageSize,
    }),
    enabled: Boolean(sessionId && episodeNumber && session.data && !['preparing', 'failed'].includes(session.data.status)),
    retry: false,
  });
  const releases = useQuery({ queryKey: ['pre-review-releases', projectId], queryFn: () => listPreEditReleases(projectId), enabled: Boolean(projectId), retry: false });

  useEffect(() => {
    if (!sessionId && sessions.data?.items.length) setSessionId(sessions.data.items[0]!.id);
  }, [sessionId, sessions.data]);
  useEffect(() => {
    if (session.data && (!episodeNumber || !session.data.episodes.some((entry) => entry.episodeNumber === episodeNumber))) {
      setEpisodeNumber((session.data.episodes.find((entry) => entry.status !== 'completed') ?? session.data.episodes[0])?.episodeNumber ?? null);
    }
  }, [episodeNumber, session.data]);
  useEffect(() => {
    if (!items.data || items.isFetching) return;
    const exists = items.data.items.some((entry) => entry.id === selectedItemId);
    if (!exists && !locatedItem) setSelectedItemId(items.data.items[0]?.id ?? null);
  }, [items.data, items.isFetching, locatedItem, selectedItemId]);

  const itemDataReady = items.isSuccess && !items.isFetching;
  const selectedItem = itemDataReady
    ? locatedItem?.id === selectedItemId
      ? locatedItem
      : items.data.items.find((entry) => entry.id === selectedItemId) ?? null
    : null;
  const dirty = editorOpen && (editorText !== (selectedItem?.currentText ?? '') || overrideReason.trim().length > 0);

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const guardSpaNavigation = (event: globalThis.MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!target) return;
      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      pendingTransition.current = () => navigate(`${url.pathname}${url.search}${url.hash}`);
      setDirtyGuard(true);
    };
    document.addEventListener('click', guardSpaNavigation, true);
    return () => document.removeEventListener('click', guardSpaNavigation, true);
  }, [dirty, navigate]);

  const refreshWorkspace = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pre-review-session', projectId, sessionId] }),
      queryClient.invalidateQueries({ queryKey: ['pre-review-items', projectId, sessionId] }),
      queryClient.invalidateQueries({ queryKey: ['pre-review-sessions', projectId] }),
    ]);
  };

  const handleCommandError = <T,>(error: unknown, intent: { current: Intent<T> | null }) => {
    if (canReplayIntent(error)) return;
    intent.current = null;
    setLocatedItem(null);
    void refreshWorkspace();
  };

  const finishPendingTransition = () => {
    const transition = pendingTransition.current;
    pendingTransition.current = null;
    if (transition) requestAnimationFrame(transition);
  };

  const createMutation = useMutation({
    mutationFn: (intent: Intent<{ termVersionId: string; expectedProjectVersion: number }>) => createPreEditSession(projectId, intent.payload, intent.key),
    onSuccess: async (result) => {
      createIntent.current = null;
      setSessionId(result.session.id);
      setFeedback(result.replay ? '已恢复同一前置审改会话。' : '前置审改会话已创建，正在准备对齐事实。');
      await queryClient.invalidateQueries({ queryKey: ['pre-review-sessions', projectId] });
    },
    onError: (error) => handleCommandError(error, createIntent),
  });
  const prepareMutation = useMutation({
    mutationFn: (intent: Intent<{ expectedSessionRevision: number }>) => retryPreEditPreparation(projectId, sessionId!, intent.payload, intent.key),
    onSuccess: async () => { preparationIntent.current = null; setFeedback('已重新提交同一准备意图。'); await refreshWorkspace(); },
    onError: (error) => handleCommandError(error, preparationIntent),
  });
  const decisionMutation = useMutation({
    mutationFn: (intent: Intent<DecisionPayload>) => createPreEditDecision(projectId, sessionId!, intent.payload.itemId, intent.payload.body, intent.key),
    onSuccess: async (result) => {
      decisionIntent.current = null;
      setDangerAction(null); setEditorOpen(false); setReasonMode(false); setOverrideReason(''); setDirtyGuard(false);
      setFeedback(`已保存“${decisionLabels[result.item.currentAction]}”，正在定位下一条待处理。`);
      const next = items.data?.items.find((entry) => entry.id !== result.item.id && entry.requiresReview);
      setLocatedItem(null); setSelectedItemId(next?.id ?? result.item.id);
      await refreshWorkspace();
      finishPendingTransition();
    },
    onError: (error) => {
      handleCommandError(error, decisionIntent);
      if (!canReplayIntent(error)) {
        setEditorOpen(false);
        setReasonMode(false);
        setOverrideReason('');
        setDirtyGuard(false);
        pendingTransition.current = null;
      }
    },
  });
  const undoMutation = useMutation({
    mutationFn: (intent: Intent<{ itemId: string; expectedVersion: number; decisionEventId: string }>) => undoPreEditDecision(projectId, sessionId!, intent.payload.itemId, { expectedVersion: intent.payload.expectedVersion, decisionEventId: intent.payload.decisionEventId }, intent.key),
    onSuccess: async () => { undoIntent.current = null; setFeedback('上一项人工决定已撤销，历史事件仍完整保留。'); await refreshWorkspace(); },
    onError: (error) => handleCommandError(error, undoIntent),
  });
  const policyMutation = useMutation({
    mutationFn: (intent: Intent<ApplyPreEditPolicyBody>) => applyPreEditPolicy(projectId, sessionId!, intent.payload, intent.key),
    onSuccess: async (result) => { policyIntent.current = null; setBaselineOpen(false); setFeedback(`文本基准已更新：安全更新 ${result.safeUpdateCount} 条，保留人工决定 ${result.protectedHumanDecisionCount} 条。`); await refreshWorkspace(); requestAnimationFrame(() => feedbackRef.current?.focus()); },
    onError: (error) => handleCommandError(error, policyIntent),
  });
  const completeMutation = useMutation({
    mutationFn: (intent: Intent<{ episodeNumber: number; expectedEpisodeRevision: number }>) => completePreEditEpisode(projectId, sessionId!, intent.payload.episodeNumber, { expectedEpisodeRevision: intent.payload.expectedEpisodeRevision }, intent.key),
    onSuccess: async (result) => {
      completeIntent.current = null; setFeedback(`第 ${result.episode.episodeNumber} 集已完成。`); await refreshWorkspace();
      const next = session.data?.episodes.find((entry) => entry.episodeNumber !== result.episode.episodeNumber && entry.status !== 'completed');
      if (next) { setEpisodeNumber(next.episodeNumber); setSelectedItemId(null); }
    },
    onError: (error) => handleCommandError(error, completeIntent),
  });
  const releaseMutation = useMutation({
    mutationFn: (intent: Intent<{ expectedSessionRevision: number }>) => createPreEditRelease(projectId, sessionId!, intent.payload, intent.key),
    onSuccess: async (result) => { releaseIntent.current = null; setFeedback(`不可变待验收修订 V${result.release.version} 已生成。`); await queryClient.invalidateQueries({ queryKey: ['pre-review-releases', projectId] }); },
    onError: (error) => handleCommandError(error, releaseIntent),
  });

  useLayoutEffect(() => {
    if (decisionMutation.isPending || undoMutation.isPending) decisionPaneRef.current?.focus();
    else if (decisionMutation.isError) decisionRetryRef.current?.focus();
    else if (undoMutation.isError) undoRetryRef.current?.focus();
  }, [decisionMutation.isError, decisionMutation.isPending, undoMutation.isError, undoMutation.isPending]);
  useLayoutEffect(() => {
    if (completeMutation.isPending || releaseMutation.isPending) footerRef.current?.focus();
    else if (completeMutation.isError || releaseMutation.isError) footerRetryRef.current?.focus();
  }, [completeMutation.isError, completeMutation.isPending, releaseMutation.isError, releaseMutation.isPending]);
  useLayoutEffect(() => { if (feedback) feedbackRef.current?.focus(); }, [feedback]);
  useLayoutEffect(() => { if (dirtyGuard) guardSaveRef.current?.focus(); }, [dirtyGuard]);
  useLayoutEffect(() => {
    if (!listRecovery.current) return;
    if (items.isFetching) decisionPaneRef.current?.focus();
    else if (items.isError) listRetryRef.current?.focus();
    else if (items.isSuccess && !items.isFetching) { listRecovery.current = false; decisionPaneRef.current?.focus(); }
  }, [items.dataUpdatedAt, items.errorUpdatedAt, items.isError, items.isFetching, items.isSuccess]);
  useLayoutEffect(() => {
    if (!sessionRecovery.current) return;
    if (session.isFetching) gateStateRef.current?.focus();
    else if (session.isError) sessionRetryRef.current?.focus();
    else if (session.isSuccess && !session.isFetching) { sessionRecovery.current = false; decisionPaneRef.current?.focus(); }
  }, [session.dataUpdatedAt, session.errorUpdatedAt, session.isError, session.isFetching, session.isSuccess]);
  const gateFetching = materials.isFetching || terms.isFetching || sessions.isFetching;
  const gateError = materials.error ?? terms.error ?? sessions.error;
  useLayoutEffect(() => {
    if (!gateRecovery.current) return;
    if (gateFetching) gateStateRef.current?.focus();
    else if (gateError) gateRetryRef.current?.focus();
    else { gateRecovery.current = false; sourceHeaderRef.current?.focus(); }
  }, [gateError, gateFetching]);
  useLayoutEffect(() => {
    if (createMutation.isPending) sourceHeaderRef.current?.focus();
    else if (createMutation.isError) createRetryRef.current?.focus();
  }, [createMutation.isError, createMutation.isPending]);
  useLayoutEffect(() => {
    if (prepareMutation.isPending) prepareStateRef.current?.focus();
    else if (prepareMutation.isError) prepareRetryRef.current?.focus();
  }, [prepareMutation.isError, prepareMutation.isPending]);

  const canCreate = materials.data?.project.lifecycleStatus === 'active' && Boolean(terms.data?.latestVersion && terms.data.sourceIsCurrent);
  const beginCreate = () => {
    if (!materials.data || !terms.data?.latestVersion || !terms.data.sourceIsCurrent) return;
    const payload = { termVersionId: terms.data.latestVersion.id, expectedProjectVersion: materials.data.project.version };
    const signature = JSON.stringify(payload);
    createIntent.current = intentFor(createIntent.current, signature, payload);
    createMutation.mutate(createIntent.current);
  };
  const retryPreparation = () => {
    if (!session.data) return;
    const payload = { expectedSessionRevision: session.data.revision };
    preparationIntent.current = intentFor(preparationIntent.current, JSON.stringify(payload), payload);
    prepareMutation.mutate(preparationIntent.current);
  };
  const runDecision = (action: PreEditDecisionAction, text?: string, formatOverrideReason?: string) => {
    if (!selectedItem) return;
    const body: CreatePreEditDecisionBody = {
      expectedVersion: selectedItem.version,
      action,
      ...(text !== undefined ? { text } : {}),
      ...(formatOverrideReason ? { formatOverrideReason } : {}),
    };
    const payload = { itemId: selectedItem.id, body };
    const signature = JSON.stringify(payload);
    decisionIntent.current = intentFor(decisionIntent.current, signature, payload);
    decisionMutation.mutate(decisionIntent.current);
  };
  const runUndo = () => {
    if (!selectedItem?.currentDecisionEventId) return;
    const payload = { itemId: selectedItem.id, expectedVersion: selectedItem.version, decisionEventId: selectedItem.currentDecisionEventId };
    undoIntent.current = intentFor(undoIntent.current, JSON.stringify(payload), payload);
    undoMutation.mutate(undoIntent.current);
  };
  const applyPolicy = (body: ApplyPreEditPolicyBody) => {
    policyIntent.current = intentFor(policyIntent.current, JSON.stringify(body), body);
    policyMutation.mutate(policyIntent.current);
  };
  const completeEpisode = () => {
    if (!currentEpisode) return;
    const payload = { episodeNumber: currentEpisode.episodeNumber, expectedEpisodeRevision: currentEpisode.revision };
    completeIntent.current = intentFor(completeIntent.current, JSON.stringify(payload), payload);
    completeMutation.mutate(completeIntent.current);
  };
  const createRelease = () => {
    if (!session.data) return;
    const payload = { expectedSessionRevision: session.data.revision };
    releaseIntent.current = intentFor(releaseIntent.current, JSON.stringify(payload), payload);
    releaseMutation.mutate(releaseIntent.current);
  };
  const queueTransition = (transition: () => void) => {
    pendingTransition.current = transition;
    setDirtyGuard(true);
  };
  const chooseItem = (item: PreEditItem) => {
    const transition = () => { setLocatedItem(null); setSelectedItemId(item.id); setFeedback(''); };
    if (dirty) { queueTransition(transition); return; }
    transition();
  };
  const chooseEpisode = (value: number) => {
    const transition = () => { setEpisodeNumber(value); setSelectedItemId(null); setLocatedItem(null); setPage(0); setFeedback(''); };
    if (dirty) { queueTransition(transition); return; }
    transition();
  };
  const openEditor = (reason = false) => {
    if (!selectedItem) return;
    setEditorOpen(true); setEditorText(selectedItem.currentText); setReasonMode(reason); setOverrideReason(selectedItem.formatOverrideReason ?? '');
  };
  const sessionReadOnly = session.data?.status === 'stale' || session.data?.status === 'completed';
  const limitedEpisode = currentEpisode?.status === 'limited';
  const commandPending = decisionMutation.isPending || undoMutation.isPending || completeMutation.isPending || releaseMutation.isPending;
  const allEpisodesCompleted = Boolean(session.data?.episodes.length && session.data.episodes.every((entry) => entry.status === 'completed'));
  const asrComparableCount = session.data?.episodes.filter((entry) => entry.status !== 'limited').length ?? 0;
  const selectedItemIndex = itemDataReady && selectedItem
    ? items.data.items.findIndex((entry) => entry.id === selectedItem.id)
    : -1;
  const resetEditor = () => { setEditorOpen(false); setReasonMode(false); setOverrideReason(''); };
  const discardDirtyChange = () => {
    resetEditor();
    setDirtyGuard(false);
    finishPendingTransition();
  };
  const saveEditor = () => {
    if (!selectedItem) return;
    runDecision(
      reasonMode ? selectedItem.currentAction : 'custom_text',
      reasonMode ? undefined : editorText,
      reasonMode ? overrideReason.trim() : undefined,
    );
  };
  const changeStatus = (value: ListStatus) => {
    setStatus(value); setPage(0); setSelectedItemId(null); setLocatedItem(null);
  };
  const changeSearch = (value: string) => {
    setSearch(value); setPage(0); setSelectedItemId(null); setLocatedItem(null);
  };
  const changePage = (value: number) => {
    setPage(value); setSelectedItemId(null); setLocatedItem(null);
  };
  const navigateAdjacentItem = (offset: -1 | 1) => {
    if (!itemDataReady || selectedItemIndex < 0) return;
    const next = items.data.items[selectedItemIndex + offset];
    if (next) chooseItem(next);
  };
  const holdDecisionContext = (event: KeyboardEvent<HTMLElement>) => {
    if (!commandPending) return;
    trapFocus(event, decisionPaneRef.current, true);
    if (event.key === 'Escape') event.preventDefault();
  };

  if (materials.isPending || terms.isPending || sessions.isPending) return <section className={styles.page}><div className={styles.pageState} role="status" tabIndex={-1} ref={gateStateRef}><span className={styles.spinner} aria-hidden="true" /><strong>正在核对前置审改来源</strong><p>读取项目、已确认术语版本和历史会话。</p></div></section>;
  if (materials.isError || terms.isError || sessions.isError) {
    const error = materials.error ?? terms.error ?? sessions.error;
    return <section className={styles.page}><div className={styles.pageState} tabIndex={-1} ref={gateStateRef}><ErrorBlock title="前置审改门禁读取失败" error={error} action="重新读取门禁" actionRef={gateRetryRef} pending={gateFetching} onAction={() => { if (!gateFetching) { gateRecovery.current = true; void materials.refetch(); void terms.refetch(); void sessions.refetch(); } }} /></div></section>;
  }

  const project = materials.data!.project;
  return <section className={styles.page}>
    <div className={styles.projectContext}><div><Link to="/projects">项目中心</Link><span>/</span><strong>{project.name}</strong><span className={styles.projectStatus}>{project.lifecycleStatus === 'active' ? '使用中' : '只读'}</span></div><nav aria-label="项目工作台模块">{projectModules.map((module) => module.status === 'active' ? <Link key={module.id} to={module.route.replace(':projectId', projectId)} aria-current={module.id === 'project-pre-review' ? 'page' : undefined}>{module.title}</Link> : <span key={module.id} aria-disabled="true">{module.title}</span>)}</nav></div>
    <header className={styles.sourceHeader} tabIndex={-1} ref={sourceHeaderRef}>
      <div><span>公司稿来源</span><strong>{terms.data?.source.episodeCount ?? 0} 集 · {terms.data?.source.sourceSrtSetDigest?.slice(0, 8) ?? '未确认'}</strong></div>
      <div><span>中文识别</span><strong>{session.data ? `${asrComparableCount} / ${session.data.episodeCounts.total} 集可对照` : '暂无会话事实'}</strong><small>{session.data ? `${session.data.episodeCounts.total - asrComparableCount} 集有限审改` : '创建会话后读取'}</small></div>
      <div><span>术语版本</span><strong>{terms.data?.latestVersion ? `V${terms.data.latestVersion.version}` : '未确认'}</strong></div>
      <div><span>会话状态</span><strong>{session.data ? sessionStatusLabels[session.data.status] : '尚未创建'}</strong></div>
      {!session.data && <button type="button" className={styles.primaryButton} disabled={!canCreate || createMutation.isPending} onClick={beginCreate}>{createMutation.isPending ? '正在创建会话' : '创建前置审改会话'}</button>}
      {session.data && <button type="button" ref={baselineTrigger} disabled={sessionReadOnly || commandPending || !selectedItem} onClick={() => { policyMutation.reset(); setBaselineOpen(true); }}>调整文本基准</button>}
    </header>
    {!canCreate && !session.data && <div className={styles.blockNotice} role="status"><strong>来源门禁尚未满足</strong><span>{project.lifecycleStatus !== 'active' ? '项目不是使用中状态。' : !terms.data?.latestVersion ? '请先确认术语版本。' : '公司稿来源已经变化，请重新确认术语。'}</span><Link to={`/projects/${projectId}/terms`}>前往术语</Link></div>}
    {createMutation.isError && <ErrorBlock title="前置审改会话创建失败" error={createMutation.error} action={recoveryAction(createMutation.error, '重试同一创建意图')} actionRef={createRetryRef} onAction={() => { if (canReplayIntent(createMutation.error)) beginCreate(); else void refreshWorkspace(); }} pending={createMutation.isPending} />}
    {feedback && <div className={styles.feedback} role="status" tabIndex={-1} ref={feedbackRef}>{feedback}</div>}
    {!sessionId && sessions.data?.items.length === 0 && <div className={styles.emptyWorkspace}><strong>还没有前置审改会话</strong><p>门禁满足后创建会话；系统会固定公司稿、术语、ASR、素材与格式策略身份。</p></div>}
    {sessionId && session.isPending && <div className={styles.pageState} role="status" tabIndex={-1} ref={gateStateRef}><span className={styles.spinner} aria-hidden="true" /><strong>正在读取审改会话</strong></div>}
    {sessionId && session.isError && <div className={styles.pageState} tabIndex={-1} ref={gateStateRef}><ErrorBlock title="审改会话读取失败" error={session.error} action="重新读取会话" actionRef={sessionRetryRef} pending={session.isFetching} onAction={() => { if (!session.isFetching) { sessionRecovery.current = true; void session.refetch(); } }} /></div>}
    {session.data?.status === 'preparing' && <div className={styles.pageState} role="status"><span className={styles.spinner} aria-hidden="true" /><strong>正在准备对齐与格式事实</strong><p>固定来源已经保存；完成后可刷新进入工作台。</p><button type="button" onClick={() => void session.refetch()}>重新读取准备事实</button></div>}
    {session.data?.status === 'failed' && <div className={styles.pageState} tabIndex={-1} ref={prepareStateRef}><strong>会话准备失败</strong><p>{session.data.errorDetail ?? '准备任务没有完成。'}</p>{prepareMutation.isError && <ErrorBlock title="重新准备失败" error={prepareMutation.error} action={recoveryAction(prepareMutation.error, '重试同一准备意图')} actionRef={prepareRetryRef} onAction={() => { if (canReplayIntent(prepareMutation.error)) retryPreparation(); else void refreshWorkspace(); }} pending={prepareMutation.isPending} />}<button type="button" className={styles.primaryButton} disabled={prepareMutation.isPending} onClick={retryPreparation}>{prepareMutation.isPending ? '正在重新准备' : '重新准备会话'}</button></div>}
    {session.data && !['preparing', 'failed'].includes(session.data.status) && currentEpisode && <>
      {session.data.status === 'stale' && <div className={styles.staleNotice} role="alert"><strong>来源已经变化，历史会话只读</strong><span>旧决定和导出继续可追溯；唯一下一步是从当前来源创建新会话。</span><button type="button" disabled={!canCreate || createMutation.isPending} onClick={beginCreate}>从新来源创建会话</button></div>}
      {limitedEpisode && <div className={styles.limitedNotice} role="status"><strong>第 {currentEpisode.episodeNumber} 集仅公司稿有限审改</strong><span>{currentEpisode.limitedReason ?? '缺少可用 ASR 结果。'} 不得冒充完成双源对照。</span></div>}
      <section className={styles.screeningBar} aria-label="自动筛选摘要">
        <div><span className={styles.screeningMark} aria-hidden="true">筛</span><strong>自动筛选已完成</strong><span>{currentEpisode.counts.pending} 条待人工</span><span>{currentEpisode.counts.blocking} 条格式阻断</span><em>本地确定性规则优先</em><span>AI 复核未启用 · 不影响人工审改</span></div>
        <div><button type="button" disabled aria-disabled="true">AI 快速筛选</button><span className={styles.aiDisabled}>未启用</span><button type="button" aria-expanded={screeningExpanded} aria-controls="screening-evidence" onClick={() => setScreeningExpanded((value) => !value)}>{screeningExpanded ? '收起判断依据' : '查看判断依据'}</button></div>
      </section>
      {screeningExpanded && <div className={styles.screeningEvidence} id="screening-evidence"><span>确定性对齐与格式规则：已启用</span><span>AI 快速筛选：未启用，暂无权威运行数据</span><span>当前条决定：仍由人工确认，不受 AI 状态影响</span></div>}
      <div className={styles.workbench}>
        <aside className={styles.queuePane} aria-label="集与问题队列">
          <div className={styles.queueTabs} role="tablist" aria-label="队列视图"><button type="button" role="tab" aria-selected={queueView === 'episodes'} onClick={() => setQueueView('episodes')}>集列表</button><button type="button" role="tab" aria-selected={queueView === 'issues'} onClick={() => setQueueView('issues')}>问题列表</button></div>
          <div className={styles.queueSummary}><span>待处理 {currentEpisode.counts.pending}</span><span>阻断 {currentEpisode.counts.blocking}</span><span>全部</span></div>
          {queueView === 'episodes' ? <div className={styles.episodeList}>{session.data.episodes.map((episode) => <button type="button" key={episode.id} disabled={commandPending} className={episode.episodeNumber === currentEpisode.episodeNumber ? styles.selectedEpisode : ''} onClick={() => chooseEpisode(episode.episodeNumber)}><span>第 {episode.episodeNumber} 集</span><em className={styles[episode.status]}>{episodeStatusLabels[episode.status]}</em><small>待处理 {episode.counts.pending} · 阻断 {episode.counts.blocking}</small></button>)}</div> : <>
            <div className={styles.queueFilters}><select aria-label="问题状态" value={status} disabled={commandPending} onChange={(event) => changeStatus(event.target.value as ListStatus)}><option value="pending">待处理</option><option value="blocking">格式阻断</option><option value="decided">已决定</option><option value="all">全部</option></select><input aria-label="搜索问题" value={search} disabled={commandPending} onChange={(event) => changeSearch(event.target.value)} placeholder="搜索公司稿或识别文本" /></div>
            {items.isFetching && <div className={styles.queueState} role="status">正在读取问题队列…</div>}
            {items.isError && <ErrorBlock title="问题队列读取失败" error={items.error} action="重新读取问题队列" actionRef={listRetryRef} pending={items.isFetching} onAction={() => { listRecovery.current = true; void items.refetch(); }} />}
            {itemDataReady && items.data.items.length === 0 && <div className={styles.queueState} role="status"><strong>当前筛选没有问题</strong><span>{currentEpisode.counts.blocking ? `仍有 ${currentEpisode.counts.blocking} 项格式门禁。` : '可以检查本集完成门禁。'}</span></div>}
            <div className={styles.issueList}>{itemDataReady && items.data.items.map((item) => <button type="button" key={item.id} disabled={commandPending} className={selectedItem?.id === item.id ? styles.selectedIssue : ''} onClick={() => chooseItem(item)}><span>{alignmentLabels[item.groupKind]}</span><p>{item.currentText || '（不进入最终稿）'}</p><small>{itemTimeRange(item)} · {statusLabels[itemState(item)]}</small></button>)}</div>
            {itemDataReady && <div className={styles.queuePager}><button type="button" disabled={commandPending || page === 0} onClick={() => changePage(page - 1)}>上一页</button><span>{page + 1} / {Math.max(1, Math.ceil(items.data.total / pageSize))}</span><button type="button" disabled={commandPending || (page + 1) * pageSize >= items.data.total} onClick={() => changePage(page + 1)}>下一页</button></div>}
          </>}
        </aside>
        <main className={styles.decisionPane} ref={decisionPaneRef} tabIndex={-1} aria-busy={commandPending} onKeyDown={holdDecisionContext}>
          <header className={styles.problemHeader}><div><span>第 {currentEpisode.episodeNumber} 集 · 当前问题</span><h2>{selectedItem ? '确认这一轴进入最终稿的文本' : '请选择问题'}</h2>{selectedItem && <p>{alignmentLabels[selectedItem.groupKind]} · {itemTimeRange(selectedItem)} · 交叠 {selectedItem.timeOverlapMs}ms · 相似度 {Math.round(selectedItem.textSimilarity * 100)}%</p>}</div><div><button type="button" ref={fullAxisTrigger} disabled={commandPending} onClick={() => setFullAxisOpen(true)}>本集全轴</button></div></header>
          {!selectedItem && <div className={styles.decisionEmpty} role="status">当前筛选没有可显示的问题；格式门禁与完成状态仍以集投影为准。</div>}
          {selectedItem && <>
            <div className={styles.relationshipBand}><strong>当前问题关系</strong><span>{alignmentLabels[selectedItem.groupKind]} · 两侧来源保持只读，完整关系可在“本集全轴”查看。</span></div>
            <div className={styles.sources}><SourceText label="公司稿" source="A" cues={selectedItem.companyCues} /><div className={styles.sourceBlend} aria-hidden="true" /><SourceText label="中文识别" source="B" cues={selectedItem.asrCues} unavailable={limitedEpisode} /></div>
            <details className={styles.contextDetails}><summary>查看组合轴与术语证据</summary><div><p>关系：{alignmentLabels[selectedItem.groupKind]}；公司轴 {selectedItem.companyCues.map((cue) => cue.cueIndex).join('、') || '无'}；识别轴 {selectedItem.asrCues.map((cue) => cue.cueIndex).join('、') || '无'}。</p><p>{selectedItem.termEvidence.length ? selectedItem.termEvidence.map((entry) => `${entry.name}${entry.conflict ? '（冲突）' : ''}`).join('、') : '本条没有术语命中。'}</p></div></details>
            <section className={styles.finalDraft}><header><div><span>下游第三层 · 唯一最终稿</span><strong>唯一最终采纳稿 <small>唯一进入待验收修订的文本</small></strong></div><em>{decisionLabels[selectedItem.currentAction]} · {normalizedTextLength(selectedItem.currentText)} 字</em></header><p>{selectedItem.currentText || '（本轴不进入最终稿）'}</p>{selectedItem.formatIssues.length ? <ul>{selectedItem.formatIssues.map((issue) => <li key={issue.code} className={issue.blocking ? styles.blockingIssue : ''}>{issue.message}{issue.blocking ? ' · 阻断' : ''}</li>)}</ul> : <span className={styles.formatPass}>格式检查通过</span>}{selectedItem.formatOverrideReason && <small>长句保留理由：{selectedItem.formatOverrideReason}</small>}</section>
            {!sessionReadOnly && <section className={styles.decisionActions} aria-label="当前决定">
              {(limitedEpisode ? ['keep_company', 'custom_text'] : selectedItem.groupKind === 'company_only' ? ['keep_company', 'custom_text', 'remove_company'] : selectedItem.groupKind === 'asr_only' ? ['add_asr', 'custom_text', 'ignore_asr'] : ['keep_company', 'use_asr_text', 'custom_text']).map((action) => <button type="button" key={action} ref={['remove_company', 'ignore_asr'].includes(action) ? dangerTrigger : undefined} disabled={commandPending} className={['remove_company', 'ignore_asr'].includes(action) ? styles.dangerText : ''} onClick={() => { if (action === 'custom_text') openEditor(); else if (['remove_company', 'ignore_asr'].includes(action)) { decisionMutation.reset(); setDangerAction(action as PreEditDecisionAction); } else runDecision(action as PreEditDecisionAction); }}>{limitedEpisode && action === 'custom_text' ? '手动处理公司稿格式' : decisionLabels[action as PreEditDecisionAction]}</button>)}
              {selectedItem.formatIssues.some((issue) => issue.code === 'long_line' && issue.overridable) && <button type="button" disabled={commandPending} onClick={() => openEditor(true)}>明确保留并记录理由</button>}
              {selectedItem.decisionOrigin === 'human' && selectedItem.currentDecisionEventId && <button type="button" disabled={commandPending || undoMutation.isPending} onClick={runUndo}>{undoMutation.isPending ? '正在撤销' : '撤销当前人工决定'}</button>}
            </section>}
            {editorOpen && <section className={styles.editorPanel}><label>最终文本<textarea autoFocus value={editorText} onChange={(event) => setEditorText(event.target.value)} maxLength={2000} /></label>{reasonMode && <label>保留理由（至少 8 字）<textarea value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} maxLength={500} /></label>}<div><span>{normalizedTextLength(editorText)} 字{reasonMode ? ` · 理由 ${overrideReason.trim().length}/8` : ''}</span><button type="button" onClick={resetEditor}>放弃修改</button><button type="button" className={styles.primaryButton} disabled={commandPending || !editorText.trim() || (reasonMode && overrideReason.trim().length < 8)} onClick={saveEditor}>保存修改</button></div></section>}
            {dirtyGuard && <div className={styles.dirtyGuard} role="alert"><strong>修改尚未保存</strong><span>请先保存或放弃，再执行原切换或离开动作。</span><button type="button" onClick={discardDirtyChange}>放弃修改</button><button type="button" ref={guardSaveRef} className={styles.primaryButton} disabled={!editorText.trim() || (reasonMode && overrideReason.trim().length < 8)} onClick={saveEditor}>保存修改</button></div>}
            {commandPending && <div className={styles.pendingState} role="status">正在保存同一决定；上下文切换与重复提交已锁定。</div>}
            {decisionMutation.isError && <ErrorBlock title="决定保存失败" error={decisionMutation.error} action={recoveryAction(decisionMutation.error, '重试同一决定')} actionRef={decisionRetryRef} pending={decisionMutation.isPending} onAction={() => { if (canReplayIntent(decisionMutation.error) && decisionIntent.current) decisionMutation.mutate(decisionIntent.current); else void refreshWorkspace(); }} />}
            {undoMutation.isError && <ErrorBlock title="撤销失败" error={undoMutation.error} action={recoveryAction(undoMutation.error, '重试同一撤销')} actionRef={undoRetryRef} pending={undoMutation.isPending} onAction={() => { if (canReplayIntent(undoMutation.error) && undoIntent.current) undoMutation.mutate(undoIntent.current); else void refreshWorkspace(); }} />}
          </>}
        </main>
        {selectedItem && <VideoEvidence key={selectedItem.id} projectId={projectId} session={session.data} item={selectedItem} />}
      </div>
      <footer className={styles.stickyFooter} ref={footerRef} tabIndex={-1} aria-busy={completeMutation.isPending || releaseMutation.isPending} onKeyDown={(event) => { if (completeMutation.isPending || releaseMutation.isPending) { trapFocus(event, footerRef.current, true); if (event.key === 'Escape') event.preventDefault(); } }}><div className={styles.itemNavigation}><button type="button" disabled={commandPending || selectedItemIndex <= 0} onClick={() => navigateAdjacentItem(-1)}>上一条</button><button type="button" disabled={commandPending || selectedItemIndex < 0 || selectedItemIndex >= (items.data?.items.length ?? 0) - 1} onClick={() => navigateAdjacentItem(1)}>下一条</button></div><div className={styles.footerGate}><strong>第 {currentEpisode.episodeNumber} 集还剩 {currentEpisode.counts.pending} 条待处理</strong><span>格式阻断 {currentEpisode.counts.blocking}{limitedEpisode ? ' · 有限审改不可完成双源对照' : ' · 处理完成后自动定位下一条'}</span></div><div className={styles.footerAction}>{completeMutation.isError && <span className={styles.footerError}>{completeMutation.error.message}{apiRequestId(completeMutation.error) ? ` · ${apiRequestId(completeMutation.error)}` : ''}</span>}{allEpisodesCompleted ? <button type="button" className={styles.primaryButton} disabled={releaseMutation.isPending || session.data.status === 'stale'} onClick={createRelease}>{releaseMutation.isPending ? '正在生成修订' : '生成待验收修订 SRT'}</button> : <button type="button" className={styles.primaryButton} disabled={sessionReadOnly || limitedEpisode || currentEpisode.counts.pending > 0 || currentEpisode.counts.blocking > 0 || completeMutation.isPending} onClick={completeEpisode}>{completeMutation.isPending ? '正在完成本集' : '完成本集并进入下一未完成集'}</button>}</div></footer>
      {(completeMutation.isError || releaseMutation.isError) && <div className={styles.footerRecovery}><ErrorBlock title={completeMutation.isError ? '本集完成失败' : '待验收修订生成失败'} error={completeMutation.error ?? releaseMutation.error} action={completeMutation.isError ? recoveryAction(completeMutation.error, '重试同一本集完成') : recoveryAction(releaseMutation.error, '重试同一发布意图')} actionRef={footerRetryRef} onAction={() => { if (completeMutation.isError && canReplayIntent(completeMutation.error) && completeIntent.current) completeMutation.mutate(completeIntent.current); else if (releaseMutation.isError && canReplayIntent(releaseMutation.error) && releaseIntent.current) releaseMutation.mutate(releaseIntent.current); else void refreshWorkspace(); }} /></div>}
      {releases.data?.items.length ? <section className={styles.releaseHistory}><h2>不可变待验收修订</h2>{releases.data.items.map((release) => <div key={release.id}><strong>V{release.version}</strong><span>{new Date(release.createdAt).toLocaleString('zh-CN')}</span>{release.files.map((file) => <a key={file.episodeNumber} href={file.downloadUrl}>下载第 {file.episodeNumber} 集 SRT</a>)}</div>)}</section> : null}
      {baselineOpen && selectedItem && <BaselineDialog session={session.data} currentEpisode={currentEpisode} currentItem={selectedItem} pending={policyMutation.isPending} commandError={policyMutation.error} recoveryLabel={recoveryAction(policyMutation.error, '重试同一基准')} onApply={applyPolicy} onRetryApply={() => { if (canReplayIntent(policyMutation.error) && policyIntent.current) policyMutation.mutate(policyIntent.current); else void refreshWorkspace(); }} onClose={() => { policyMutation.reset(); setBaselineOpen(false); requestAnimationFrame(() => baselineTrigger.current?.focus()); }} />}
      {dangerAction && selectedItem && <ConfirmDecisionDialog title={dangerAction === 'remove_company' ? '删除这个公司轴？' : '忽略这个识别轴？'} detail={dangerAction === 'remove_company' ? '该公司轴不会进入唯一最终稿；原公司字幕和历史决定仍保持只读可追溯。' : '该识别轴不会补入唯一最终稿；原识别结果仍保持只读可追溯。'} pending={decisionMutation.isPending} error={decisionMutation.error} recoveryLabel={recoveryAction(decisionMutation.error, '重试同一决定')} onConfirm={() => runDecision(dangerAction)} onRetry={() => { if (canReplayIntent(decisionMutation.error) && decisionIntent.current) decisionMutation.mutate(decisionIntent.current); else void refreshWorkspace(); }} onClose={() => { decisionMutation.reset(); setDangerAction(null); requestAnimationFrame(() => dangerTrigger.current?.focus()); }} />}
      {fullAxisOpen && <FullAxisDrawer projectId={projectId} sessionId={session.data.id} episodeNumber={currentEpisode.episodeNumber} onLocate={(item) => { setLocatedItem(item); setSelectedItemId(item.id); setFeedback(`已定位${alignmentLabels[item.groupKind]}，视频将同步到当前轴。`); }} onClose={() => { setFullAxisOpen(false); requestAnimationFrame(() => fullAxisTrigger.current?.focus()); }} />}
    </>}
  </section>;
};
