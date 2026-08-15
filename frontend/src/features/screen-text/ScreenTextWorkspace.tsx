import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';
import { Link, useParams } from 'react-router';
import type {
  ConfirmEmptyScreenTextEpisodeBody,
  CreateManualScreenTextCandidateBody,
  CreateScreenTextDecisionBody,
  CreateScreenTextReleaseBody,
  RetryScreenTextBatchBody,
  ScreenTextBatch,
  ScreenTextBatchStatus,
  ScreenTextCandidate,
  ScreenTextCandidateStatus,
  ScreenTextCategory,
  ScreenTextEpisodeJob,
  ScreenTextEpisodeStatus,
  ScreenTextScope,
} from '@qimao-terms-cloud/contracts';

import { projectModules } from '../../modules.js';
import { getProjectMaterialState } from '../materials/api.js';
import { getTermWorkspace } from '../terms/api.js';
import {
  cancelScreenTextBatch,
  confirmEmptyScreenTextEpisode,
  createManualScreenTextCandidate,
  createScreenTextBatch,
  createScreenTextPlaybackGrant,
  createScreenTextRelease,
  decideScreenTextCandidate,
  getScreenTextCandidateEvidence,
  getScreenTextBatch,
  listScreenTextBatches,
  listScreenTextCandidates,
  listScreenTextReleases,
  retryScreenTextBatch,
  screenTextExportDownloadUrl,
  ScreenTextApiError,
  type ScreenTextCandidateList,
} from './api.js';
import {
  CandidateEvidence,
  categoryLabels,
  ErrorBlock,
  formatTime,
  isUnsplitDualParent,
  Modal,
  positionLabels,
} from './ScreenTextPanels.js';
import styles from './ScreenTextWorkspace.module.css';

const batchLabels: Record<ScreenTextBatchStatus, string> = {
  queued: '排队中', running: '识别中', review_pending: '待审核', partial: '部分完成', completed: '已完成',
  failed: '失败', cancel_requested: '取消请求中', cancelled: '已取消', reconciliation_required: '需对账', stale: '来源已变化',
};

const episodeLabels: Record<ScreenTextEpisodeStatus, string> = {
  not_started: '未开始', queued: '排队中', running: '识别中', review_pending: '待确认', completed: '已完成',
  confirmed_empty: '明确空集', failed: '失败', cancel_requested: '取消中', cancelled: '已取消',
  reconciliation_required: '需对账', stale: '来源已变化',
};

const candidateLabels: Record<ScreenTextCandidateStatus, string> = {
  pending: '待确认', approved: '已保留', edited: '已修改', rejected: '已忽略',
};

const activeBatchStatuses = new Set<ScreenTextBatchStatus>(['queued', 'running', 'cancel_requested']);
const cancellableStatuses = new Set<ScreenTextBatchStatus>(['queued', 'running', 'review_pending', 'partial']);
const randomKey = () => globalThis.crypto?.randomUUID?.() ?? `screen-text-${Date.now()}-${Math.random()}`;
const statusTone = (status: string) => status.includes('failed') || status.includes('reconciliation') || status === 'stale' || status === 'rejected'
  ? styles.danger
  : status.includes('running') || status.includes('queued') || status.includes('pending') || status === 'cancel_requested'
    ? styles.warning
    : status === 'completed' || status === 'approved' || status === 'edited' || status === 'confirmed_empty'
      ? styles.success
      : styles.neutral;

interface Intent<T> { key: string; body: T }
interface RowFailure { message: string; candidate: ScreenTextCandidate; intent: Intent<CreateScreenTextDecisionBody> }
type CommandInput =
  | { kind: 'cancel'; batchId: string; body: Record<string, never> }
  | { kind: 'retry'; batchId: string; body: RetryScreenTextBatchBody }
  | { kind: 'empty'; batchId: string; episodeNumber: number; body: ConfirmEmptyScreenTextEpisodeBody }
  | { kind: 'manual'; batchId: string; episodeNumber: number; body: CreateManualScreenTextCandidateBody }
  | { kind: 'release'; body: CreateScreenTextReleaseBody };
type DialogState =
  | { kind: 'create' }
  | { kind: 'cancel' }
  | { kind: 'retry'; episodes: number[] }
  | { kind: 'empty'; episode: number }
  | { kind: 'manual'; episode: number }
  | { kind: 'release' }
  | { kind: 'history' }
  | null;

const recoveryLabel = (error: unknown, normal: string) => {
  if (error instanceof ScreenTextApiError && !error.retryable) return '重新读取权威事实';
  return normal;
};

const isReplayable = (error: unknown) => !(error instanceof ScreenTextApiError) || error.retryable;

const usageLabel = (batch: ScreenTextBatch) => {
  const quantity = batch.usage.items.reduce((sum, item) => sum + item.billingQuantity, 0);
  const unit = batch.usage.items[0]?.billingUnit;
  return unit === 'zero_network_call' ? `零网络调用 ${quantity} 次` : `用量 ${quantity} ${unit ?? '单位'}`;
};

const queryAllPending = async (
  projectId: string,
  batchId: string,
  input: { episodeNumber?: number; category?: ScreenTextCategory; search?: string },
) => {
  const items: ScreenTextCandidate[] = [];
  let offset = 0;
  do {
    const page = await listScreenTextCandidates(projectId, batchId, {
      ...input, status: 'pending', sort: 'identity_first', limit: 100, offset,
    });
    items.push(...page.items);
    offset += page.items.length;
    if (offset >= page.total || page.items.length === 0) break;
  } while (true);
  return items;
};

export const ScreenTextWorkspace = () => {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatus, setBatchStatus] = useState<ScreenTextBatchStatus | ''>('');
  const [batchSort, setBatchSort] = useState<'updated_desc' | 'created_desc'>('updated_desc');
  const [batchPage, setBatchPage] = useState(0);
  const [batchId, setBatchId] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ScreenTextCandidateStatus | ''>('');
  const [category, setCategory] = useState<ScreenTextCategory | ''>('');
  const [sort, setSort] = useState<'identity_first' | 'time_asc' | 'confidence_desc' | 'pending_first'>('identity_first');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [allPendingSelected, setAllPendingSelected] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [feedback, setFeedback] = useState('');
  const [rowFailures, setRowFailures] = useState<Map<string, RowFailure>>(new Map());
  const [releaseSearch, setReleaseSearch] = useState('');
  const [releaseSort, setReleaseSort] = useState<'version_desc' | 'created_desc'>('version_desc');
  const [releasePage, setReleasePage] = useState(0);
  const [gateRecovery, setGateRecovery] = useState(false);
  const [batchRecovery, setBatchRecovery] = useState(false);
  const [detailRecovery, setDetailRecovery] = useState(false);
  const [candidateRecovery, setCandidateRecovery] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const gateRetryRef = useRef<HTMLButtonElement>(null);
  const batchRetryRef = useRef<HTMLButtonElement>(null);
  const detailRetryRef = useRef<HTMLButtonElement>(null);
  const candidateRetryRef = useRef<HTMLButtonElement>(null);
  const createIntent = useRef<Intent<{ scope: ScreenTextScope; termVersionId: string }> | null>(null);
  const commandIntent = useRef<Intent<CommandInput> | null>(null);
  const decisionIntent = useRef<Intent<CreateScreenTextDecisionBody> | null>(null);
  const decisionTarget = useRef<ScreenTextCandidate | null>(null);

  const materials = useQuery({ queryKey: ['screen-text-materials', projectId], queryFn: () => getProjectMaterialState(projectId), enabled: Boolean(projectId) });
  const terms = useQuery({ queryKey: ['screen-text-terms', projectId], queryFn: () => getTermWorkspace(projectId), enabled: Boolean(projectId) });
  const batches = useQuery({
    queryKey: ['screen-text-batches', projectId, batchSearch, batchStatus, batchSort, batchPage],
    queryFn: () => listScreenTextBatches(projectId, { search: batchSearch, ...(batchStatus ? { status: batchStatus } : {}), sort: batchSort, limit: 20, offset: batchPage * 20 }),
    enabled: Boolean(projectId),
  });
  const detail = useQuery({
    queryKey: ['screen-text-batch', projectId, batchId],
    queryFn: () => getScreenTextBatch(projectId, batchId),
    enabled: Boolean(projectId && batchId),
    refetchInterval: (query) => query.state.data && activeBatchStatuses.has(query.state.data.status) ? 2_500 : false,
  });
  const candidates = useQuery({
    queryKey: ['screen-text-candidates', projectId, batchId, episodeNumber, search, status, category, sort, page],
    queryFn: () => listScreenTextCandidates(projectId, batchId, {
      ...(episodeNumber ? { episodeNumber } : {}), search, ...(status ? { status } : {}), ...(category ? { category } : {}), sort, limit: 30, offset: page * 30,
    }),
    enabled: Boolean(projectId && batchId && episodeNumber),
  });
  const pendingCount = useQuery({
    queryKey: ['screen-text-pending-count', projectId, batchId, episodeNumber, search, category],
    queryFn: () => listScreenTextCandidates(projectId, batchId, {
      ...(episodeNumber ? { episodeNumber } : {}), search, ...(category ? { category } : {}), status: 'pending', sort: 'identity_first', limit: 1, offset: 0,
    }),
    enabled: Boolean(projectId && batchId && episodeNumber && (!status || status === 'pending')),
  });
  const releases = useQuery({
    queryKey: ['screen-text-releases', projectId, releaseSearch, releaseSort, releasePage],
    queryFn: () => listScreenTextReleases(projectId, { search: releaseSearch, sort: releaseSort, limit: 20, offset: releasePage * 20 }),
    enabled: Boolean(projectId),
  });
  const project = materials.data?.project;
  const manifest = materials.data?.manifest;
  const latestTerm = terms.data?.latestVersion;
  const screenEpisodes = useMemo(() => Array.from(new Set(manifest?.assetBindings.filter((item) => item.role === 'screen_video').map((item) => item.episodeNumber) ?? [])).sort((a, b) => a - b), [manifest]);
  const gatesReady = project?.lifecycleStatus === 'active' && Boolean(manifest && screenEpisodes.length && latestTerm && terms.data?.sourceIsCurrent);
  const batch = detail.data;
  const readOnly = !batch || batch.status === 'stale' || project?.lifecycleStatus !== 'active';
  const selectedCandidate = candidates.data?.items.find((item) => item.id === selectedId) ?? null;
  const evidence = useQuery({
    queryKey: ['screen-text-candidate-evidence', projectId, selectedCandidate?.id, selectedCandidate?.evidence.evidenceDigest],
    queryFn: () => getScreenTextCandidateEvidence(projectId, selectedCandidate!.id),
    enabled: Boolean(projectId && selectedCandidate),
    retry: false,
  });
  const evidenceBlocked = Boolean(
    candidates.data?.items.length
    && (!selectedCandidate || evidence.isPending || evidence.isFetching || evidence.isError || !evidence.data),
  );
  const writeLocked = readOnly || !gatesReady || evidenceBlocked;
  const writeLockRef = useRef(writeLocked);
  writeLockRef.current = writeLocked;
  const selectedCandidates = candidates.data?.items.filter((item) => selectedPageIds.has(item.id) && item.status === 'pending') ?? [];
  const failedEpisodes = batch?.jobs.filter((job) => job.status === 'failed').map((job) => job.episodeNumber) ?? [];
  const batchPendingCount = batch?.jobs.reduce((sum, job) => sum + job.candidateCounts.pending, 0) ?? 0;
  const releaseReady = Boolean(batch && !readOnly && gatesReady && batch.jobs.every((job) => job.status === 'completed' || job.status === 'confirmed_empty') && batch.counts.failed === 0 && batch.counts.reconciliationRequired === 0 && batchPendingCount === 0);

  useEffect(() => {
    if (!batchId && batches.data?.items[0]) setBatchId(batches.data.items[0].id);
    if (batchId && batches.data && !batches.data.items.some((item) => item.id === batchId) && batches.data.items[0]) setBatchId(batches.data.items[0].id);
  }, [batchId, batches.data]);
  useEffect(() => {
    if (!detail.data) return;
    const exists = detail.data.jobs.some((job) => job.episodeNumber === episodeNumber);
    if (!exists) setEpisodeNumber(detail.data.jobs[0]?.episodeNumber);
  }, [detail.data, episodeNumber]);
  useEffect(() => {
    if (!detail.data) return;
    void queryClient.invalidateQueries({ queryKey: ['screen-text-batches', projectId] });
    void queryClient.invalidateQueries({ queryKey: ['screen-text-candidates', projectId, detail.data.id] });
    void queryClient.invalidateQueries({ queryKey: ['screen-text-pending-count', projectId, detail.data.id] });
  }, [detail.data?.revision, projectId, queryClient]);
  useEffect(() => {
    setSelectedId('');
    setSelectedPageIds(new Set());
  }, [batchId, episodeNumber, search, status, category, sort, page]);
  useEffect(() => {
    setAllPendingSelected(false);
  }, [batchId, episodeNumber, search, status, category]);
  useEffect(() => {
    if (!selectedId && candidates.data?.items[0]) setSelectedId(candidates.data.items[0].id);
  }, [candidates.data, selectedId]);
  useEffect(() => {
    if (!writeLocked) return;
    setSelectedPageIds(new Set());
    setAllPendingSelected(false);
  }, [writeLocked]);

  useLayoutEffect(() => {
    if (gateRecovery && !materials.isFetching && !terms.isFetching) {
      if (materials.isError || terms.isError) gateRetryRef.current?.focus();
      setGateRecovery(false);
    }
  }, [gateRecovery, materials.isError, materials.isFetching, terms.isError, terms.isFetching]);
  useLayoutEffect(() => {
    if (batchRecovery && !batches.isFetching) {
      if (batches.isError) batchRetryRef.current?.focus(); else feedbackRef.current?.focus();
      setBatchRecovery(false);
    }
  }, [batchRecovery, batches.isError, batches.isFetching]);
  useLayoutEffect(() => {
    if (detailRecovery && !detail.isFetching) {
      if (detail.isError) detailRetryRef.current?.focus(); else feedbackRef.current?.focus();
      setDetailRecovery(false);
    }
  }, [detailRecovery, detail.isError, detail.isFetching]);
  useLayoutEffect(() => {
    if (candidateRecovery && !candidates.isFetching) {
      if (candidates.isError) candidateRetryRef.current?.focus(); else feedbackRef.current?.focus();
      setCandidateRecovery(false);
    }
  }, [candidateRecovery, candidates.isError, candidates.isFetching]);
  useLayoutEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['screen-text-batches', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['screen-text-batch', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['screen-text-candidates', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['screen-text-pending-count', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['screen-text-releases', projectId] }),
    ]);
  };
  const announce = (message: string) => {
    setFeedback(message);
  };

  const createMutation = useMutation({
    mutationFn: (intent: Intent<{ scope: ScreenTextScope; termVersionId: string }>) => createScreenTextBatch(projectId, intent.body, intent.key),
    onSuccess: async (batch) => {
      createIntent.current = null;
      setDialog(null);
      setBatchId(batch.id);
      await refresh();
      announce(`识别批次 ${batch.id.slice(0, 8)} 已创建，当前状态：${batchLabels[batch.status]}。`);
    },
    onError: async (error) => {
      if (!isReplayable(error)) {
        createIntent.current = null;
        await Promise.all([materials.refetch(), terms.refetch(), batches.refetch()]);
      }
    },
  });

  const decisionMutation = useMutation({
    mutationFn: ({ candidate, intent }: { candidate: ScreenTextCandidate; intent: Intent<CreateScreenTextDecisionBody> }) =>
      decideScreenTextCandidate(projectId, candidate.id, intent.body, intent.key),
    onSuccess: async (result, variables) => {
      decisionIntent.current = null;
      decisionTarget.current = null;
      setRowFailures((current) => { const next = new Map(current); next.delete(result.candidate.id); return next; });
      if (variables.intent.body.action === 'approve') {
        const currentIndex = candidates.data?.items.findIndex((item) => item.id === variables.candidate.id) ?? -1;
        const next = candidates.data?.items.slice(currentIndex + 1).find((item) => item.status === 'pending');
        if (next) setSelectedId(next.id);
      }
      await refresh();
      announce(result.createdCandidates.length ? '已拆分为左右两条独立画面字。' : `候选已更新为${candidateLabels[result.candidate.status]}。`);
    },
    onError: async (error) => {
      if (!isReplayable(error)) {
        decisionIntent.current = null;
        decisionTarget.current = null;
        await refresh();
      }
    },
  });

  const batchDecisionMutation = useMutation({
    mutationFn: async ({ entries, blockedParentCount }: { entries: Array<{ candidate: ScreenTextCandidate; intent: Intent<CreateScreenTextDecisionBody> }>; blockedParentCount: number }) => {
      const results = await Promise.allSettled(entries.map(({ candidate, intent }) => decideScreenTextCandidate(
        projectId,
        candidate.id,
        intent.body,
        intent.key,
      )));
      return { entries, results, blockedParentCount };
    },
    onSuccess: async ({ entries, results, blockedParentCount }) => {
      const failures = new Map<string, RowFailure>();
      results.forEach((result, index) => {
        const entry = entries[index]!;
        if (result.status === 'rejected') failures.set(entry.candidate.id, { message: result.reason instanceof Error ? result.reason.message : '提交失败', ...entry });
      });
      setRowFailures(failures);
      setSelectedPageIds(new Set(failures.keys()));
      if (failures.size === 0) setAllPendingSelected(false);
      await refresh();
      const blockedNote = blockedParentCount ? `${blockedParentCount} 项左右同屏候选必须先拆分，已保持待确认。` : '';
      announce(failures.size
        ? `${entries.length - failures.size} 项已完成，${failures.size} 项失败；请在原行恢复。${blockedNote}`
        : `${entries.length} 项已完成。${blockedNote}`);
    },
  });

  const commandMutation = useMutation({
    mutationFn: async (intent: Intent<CommandInput>) => {
      const { body: input, key } = intent;
      if (input.kind === 'cancel') return cancelScreenTextBatch(projectId, input.batchId, key);
      if (input.kind === 'retry') return retryScreenTextBatch(projectId, input.batchId, input.body, key);
      if (input.kind === 'empty') return confirmEmptyScreenTextEpisode(projectId, input.batchId, input.episodeNumber, input.body, key);
      if (input.kind === 'manual') return createManualScreenTextCandidate(projectId, input.batchId, input.episodeNumber, input.body, key);
      return createScreenTextRelease(projectId, input.body, key);
    },
    onSuccess: async (_, intent) => {
      const input = intent.body;
      commandIntent.current = null;
      setDialog(null);
      await refresh();
      announce(input.kind === 'release' ? '不可变画面字版本已发布，可在历史版本下载原文件。' : input.kind === 'manual' ? '人工候选已新增。' : input.kind === 'empty' ? '本集已明确确认为无画面字。' : input.kind === 'retry' ? '失败集重试已提交。' : '取消意图已保存，页面将继续读取权威状态。');
    },
    onError: async (error) => {
      if (!isReplayable(error)) {
        commandIntent.current = null;
        await refresh();
      }
    },
  });

  const openDialog = (next: NonNullable<DialogState>, trigger?: HTMLElement | null) => {
    dialogTriggerRef.current = trigger ?? primaryRef.current;
    commandMutation.reset();
    createMutation.reset();
    setDialog(next);
  };

  const submitCreate = (scope: ScreenTextScope) => {
    if (!latestTerm || !gatesReady) return;
    const body = { scope, termVersionId: latestTerm.id };
    createIntent.current ??= { key: randomKey(), body };
    createMutation.mutate(createIntent.current);
  };

  const decide = (body: CreateScreenTextDecisionBody) => {
    if (!selectedCandidate || writeLocked) return;
    if (isUnsplitDualParent(selectedCandidate) && (body.action === 'approve' || body.action === 'edit')) {
      announce('左右同屏候选必须先拆分，当前候选继续保持待确认。');
      return;
    }
    const intent = decisionIntent.current;
    const next = intent && JSON.stringify(intent.body) === JSON.stringify(body) ? intent : { key: randomKey(), body };
    decisionIntent.current = next;
    decisionTarget.current = selectedCandidate;
    decisionMutation.mutate({ candidate: selectedCandidate, intent: next });
  };

  const submitBulk = async (action: 'approve' | 'reject') => {
    if (!batch || writeLocked) return;
    const items = allPendingSelected
      ? await queryAllPending(projectId, batch.id, { ...(episodeNumber ? { episodeNumber } : {}), ...(category ? { category } : {}), search })
      : selectedCandidates;
    if (writeLockRef.current) return;
    const blockedParentCount = action === 'approve' ? items.filter(isUnsplitDualParent).length : 0;
    const eligible = action === 'approve' ? items.filter((candidate) => !isUnsplitDualParent(candidate)) : items;
    if (!eligible.length && blockedParentCount) {
      announce(`${blockedParentCount} 项左右同屏候选必须先拆分，已保持待确认。`);
      return;
    }
    if (eligible.length) batchDecisionMutation.mutate({
      blockedParentCount,
      entries: eligible.map((candidate) => ({ candidate, intent: { key: randomKey(), body: { action, expectedRevision: candidate.revision } } })),
    });
  };

  if (materials.isPending || terms.isPending) return <section className={styles.page}><div className={styles.pageState} role="status"><span className={styles.spinner} /><strong>正在核对画面字来源门禁</strong><p>读取项目、最新素材清单和已确认术语版本。</p></div></section>;
  if (materials.isError || terms.isError) return <section className={styles.page}><ErrorBlock title="画面字门禁读取失败" error={materials.error ?? terms.error} action="重新读取门禁" actionRef={gateRetryRef} pending={materials.isFetching || terms.isFetching} onAction={() => { setGateRecovery(true); void materials.refetch(); void terms.refetch(); }} /></section>;
  if (!project) return null;

  return <section className={styles.page} data-readonly={readOnly ? (batch?.status === 'stale' ? 'stale' : 'project') : 'false'}>
    <div className={styles.projectBar}>
      <div className={styles.projectIdentity}><Link to="/projects">返回项目中心</Link><strong>{project.name}</strong><span className={`${styles.statusTag} ${project.lifecycleStatus === 'active' ? styles.success : styles.warning}`}>{project.lifecycleStatus === 'active' ? '使用中' : '只读'}</span></div>
      <nav aria-label="项目模块">{projectModules.map((module) => module.status === 'active' ? <Link key={module.id} to={module.route.replace(':projectId', projectId)} aria-current={module.id === 'project-screen-text' ? 'page' : undefined}>{module.title}</Link> : <span key={module.id} aria-disabled="true">{module.title}</span>)}</nav>
    </div>

    <div className={styles.gateStrip} aria-label="识别门禁与发布状态">
      <div><span>术语版本</span><strong>{latestTerm ? `V${latestTerm.version} · 已固定` : '尚未确认'}</strong><small>{terms.data?.sourceIsCurrent ? '来源与最新公司稿一致' : '公司稿来源已变化'}</small></div>
      <div><span>画面字视频</span><strong>{screenEpisodes.length} / {manifest?.episodeCount ?? 0} 集就绪</strong><small>{manifest ? `素材清单 V${manifest.version}` : '尚无已确认素材清单'}</small></div>
      <div><span>当前批次</span><strong>{batch ? `${batch.id.slice(0, 8)} · ${batchLabels[batch.status]}` : '尚未创建'}</strong><small>{batch ? `${batch.counts.completed} / ${batch.counts.total} 集完成` : '门禁满足后可创建'}</small></div>
      <div><span>发布门禁</span><strong>{releaseReady ? '可以发布' : `${batchPendingCount} 项待确认`}</strong><small>{batch?.counts.failed ? `${batch.counts.failed} 集失败` : batch?.counts.reconciliationRequired ? `${batch.counts.reconciliationRequired} 集需对账` : '以服务端批次事实为准'}</small></div>
      <div className={styles.gateActions}>
        <button ref={primaryRef} className={styles.primary} type="button" disabled={!gatesReady} onClick={(event) => openDialog({ kind: 'create' }, event.currentTarget)}>{batch?.status === 'stale' ? '从新来源新建批次' : '新建识别批次'}</button>
        <button type="button" onClick={(event) => openDialog({ kind: 'history' }, event.currentTarget)}>历史版本</button>
      </div>
    </div>
    {!gatesReady && <div className={styles.blockNotice} role="status"><strong>来源门禁尚未满足</strong><span>{project.lifecycleStatus !== 'active' ? '项目当前不可编辑。' : !manifest ? '请先确认素材清单。' : !screenEpisodes.length ? '素材清单中没有已完成的画面字视频。' : !latestTerm ? '请先确认术语版本。' : '公司稿来源已经变化，请重新确认术语。'}</span><Link to={!manifest || !screenEpisodes.length ? `/projects/${projectId}/materials` : `/projects/${projectId}/terms`}>处理上游门禁</Link></div>}
    {batch?.status === 'stale' && <div className={styles.staleNotice} role="status"><div><strong>来源已变化 · 旧草稿只读</strong><span>候选、截图证据、术语命中和历史决定仍可查看；唯一写入动作是从最新来源新建批次。</span></div></div>}
    {feedback && <div className={styles.feedback} role="status" tabIndex={-1} ref={feedbackRef}>{feedback}</div>}

    {batches.isError && <ErrorBlock title="批次队列读取失败" error={batches.error} action="重新读取批次队列" actionRef={batchRetryRef} pending={batches.isFetching} onAction={() => { setBatchRecovery(true); void batches.refetch(); }} />}
    {!batches.isError && batches.data?.items.length === 0 && <div className={styles.emptyWorkspace}><strong>还没有画面字识别批次</strong><p>确认术语与画面字视频后，从页面唯一主入口创建整剧、选中集或单集批次。</p></div>}

    {batch && <>
      <div className={styles.batchNotice}>
        <div><span className={`${styles.statusTag} ${statusTone(batch.status)}`}>{batchLabels[batch.status]}</span><strong>{batch.scope.kind === 'all' ? '整剧范围' : batch.scope.kind === 'selected' ? `选中 ${batch.scope.episodeNumbers.length} 集` : `第 ${batch.scope.episodeNumber} 集`} · 已完成 {batch.counts.completed} / {batch.counts.total} 集</strong><span>术语 V{batch.termVersion} · 已发送 {batch.termProjection.includedCount} 条 · {usageLabel(batch)} · 素材清单 V{batch.manifestVersion} · 请求标识 {batch.requestId}</span></div>
        <div className={styles.noticeActions}>
          {cancellableStatuses.has(batch.status) && !readOnly && <button type="button" onClick={(event) => openDialog({ kind: 'cancel' }, event.currentTarget)}>取消未终结集</button>}
          {failedEpisodes.length > 0 && !readOnly && <button type="button" onClick={(event) => openDialog({ kind: 'retry', episodes: failedEpisodes }, event.currentTarget)}>重新识别失败集</button>}
          {batch.status === 'reconciliation_required' && <span>结果或用量未知，普通重试已暂停。</span>}
          <button type="button" disabled={!releaseReady} onClick={(event) => openDialog({ kind: 'release' }, event.currentTarget)}>发布画面字版本</button>
        </div>
      </div>

      <div className={styles.workbench}>
        <aside className={styles.episodePane} aria-label="集与批次队列">
          <div className={styles.paneTitle}><strong>集 / 批次队列</strong><span>{batches.data?.total ?? 0} 个批次</span></div>
          <label className={styles.compactField}>搜索批次<input aria-label="搜索批次" value={batchSearch} onChange={(event) => { setBatchSearch(event.target.value); setBatchPage(0); }} /></label>
          <div className={styles.compactGrid}>
            <select aria-label="批次状态" value={batchStatus} onChange={(event) => { setBatchStatus(event.target.value as ScreenTextBatchStatus | ''); setBatchPage(0); }}><option value="">全部状态</option>{Object.entries(batchLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select aria-label="批次排序" value={batchSort} onChange={(event) => setBatchSort(event.target.value as typeof batchSort)}><option value="updated_desc">最近更新</option><option value="created_desc">最近创建</option></select>
          </div>
          <div className={styles.batchList}>{batches.data?.items.map((item) => <button key={item.id} type="button" className={item.id === batch.id ? styles.activeRow : ''} onClick={() => { setBatchId(item.id); setEpisodeNumber(undefined); }}><span><strong>#{item.id.slice(0, 8)}</strong><small>{batchLabels[item.status]} · V{item.termVersion}</small></span><span>{item.counts.completed}/{item.counts.total}</span></button>)}</div>
          {(batches.data?.total ?? 0) > 20 && <div className={styles.miniPager}><button type="button" disabled={batchPage === 0} onClick={() => setBatchPage((value) => value - 1)}>上一页</button><button type="button" disabled={(batchPage + 1) * 20 >= (batches.data?.total ?? 0)} onClick={() => setBatchPage((value) => value + 1)}>下一页</button></div>}
          <div className={styles.episodeList}>{batch.jobs.map((job) => <EpisodeRow key={job.id} job={job} active={job.episodeNumber === episodeNumber} onClick={(trigger) => {
            setEpisodeNumber(job.episodeNumber);
            if (readOnly) announce(`旧草稿只读 · 已定位第 ${String(job.episodeNumber).padStart(2, '0')} 集。`);
            else if (job.status === 'failed') openDialog({ kind: 'retry', episodes: [job.episodeNumber] }, trigger);
            else if (job.candidateCounts.total === 0 && job.status === 'review_pending') openDialog({ kind: 'empty', episode: job.episodeNumber }, trigger);
          }} />)}</div>
        </aside>

        <section className={styles.candidatePane} aria-label="画面字候选">
          <div className={styles.candidateHeading}><div><strong>第 {String(episodeNumber ?? 0).padStart(2, '0')} 集候选</strong><span>{candidates.data?.total ?? 0} 条 · 服务端稳定排序</span></div>{!readOnly && episodeNumber && <button type="button" disabled={writeLocked} onClick={(event) => openDialog({ kind: 'manual', episode: episodeNumber }, event.currentTarget)}>人工新增</button>}</div>
          <div className={styles.toolbar}>
            <label className={styles.search}><span className={styles.srOnly}>搜索候选</span><input aria-label="搜索候选" placeholder="搜索文字或分类" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} /></label>
            <select aria-label="候选状态" value={status} onChange={(event) => { setStatus(event.target.value as ScreenTextCandidateStatus | ''); setPage(0); }}><option value="">全部状态</option>{Object.entries(candidateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select aria-label="候选分类" value={category} onChange={(event) => { setCategory(event.target.value as ScreenTextCategory | ''); setPage(0); }}><option value="">全部分类</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select aria-label="候选排序" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="identity_first">人名条优先</option><option value="time_asc">时间升序</option><option value="confidence_desc">置信度高到低</option><option value="pending_first">待确认优先</option></select>
          </div>
          {(selectedPageIds.size > 0 || allPendingSelected) && <div className={styles.batchBar} role="status"><div><strong>{allPendingSelected ? `已选择全部 ${pendingCount.data?.total ?? 0} 项待确认` : `已选择 ${selectedPageIds.size} 项`}</strong><span>{allPendingSelected ? '成员来自当前服务端筛选范围' : '普通选择仅作用当前页'}</span></div>{!allPendingSelected && (pendingCount.data?.total ?? 0) > selectedPageIds.size && <button type="button" disabled={writeLocked} onClick={() => setAllPendingSelected(true)}>选择全部 {pendingCount.data?.total} 项待确认候选</button>}<button type="button" disabled={writeLocked || batchDecisionMutation.isPending} onClick={() => void submitBulk('reject')}>批量忽略</button><button className={styles.primary} type="button" disabled={writeLocked || batchDecisionMutation.isPending} onClick={() => void submitBulk('approve')}>批量保留</button></div>}
          {candidates.isPending && <div className={styles.regionState} role="status">正在读取第 {episodeNumber} 集候选…</div>}
          {candidates.isError && <ErrorBlock title="候选读取失败" error={candidates.error} action="重新读取候选" actionRef={candidateRetryRef} pending={candidates.isFetching} onAction={() => { setCandidateRecovery(true); void candidates.refetch(); }} />}
          {detail.isError && <ErrorBlock title="批次详情读取失败" error={detail.error} action="重新读取批次详情" actionRef={detailRetryRef} pending={detail.isFetching} onAction={() => { setDetailRecovery(true); void detail.refetch(); }} />}
          {decisionMutation.isError && <ErrorBlock title="候选决定提交失败" error={decisionMutation.error} action={recoveryLabel(decisionMutation.error, '重试同一决定')} pending={decisionMutation.isPending} disabled={writeLocked} onAction={() => {
            const target = decisionTarget.current;
            const intent = decisionIntent.current;
            if (target && intent && isReplayable(decisionMutation.error)) decisionMutation.mutate({ candidate: target, intent });
            else { decisionIntent.current = null; decisionTarget.current = null; void refresh(); }
          }} />}
          {candidates.data && <div className={styles.tableWrap} tabIndex={0} aria-label="候选表格，可横向滚动"><table><thead><tr><th><input type="checkbox" aria-label="选择当前页" disabled={writeLocked || !candidates.data.items.some((item) => item.status === 'pending')} checked={selectedPageIds.size > 0 && candidates.data.items.filter((item) => item.status === 'pending').every((item) => selectedPageIds.has(item.id))} onChange={(event) => setSelectedPageIds(event.target.checked ? new Set(candidates.data.items.filter((item) => item.status === 'pending').map((item) => item.id)) : new Set())} /></th><th>文字 / 分类</th><th>时间</th><th>位置</th><th>术语证据</th><th>状态</th><th>操作</th></tr></thead><tbody>{candidates.data.items.map((candidate) => { const failure = rowFailures.get(candidate.id); return <tr key={candidate.id} className={candidate.id === selectedId ? styles.selectedRow : ''}><td><input type="checkbox" aria-label={`选择候选 ${candidate.text}`} disabled={writeLocked || candidate.status !== 'pending'} checked={selectedPageIds.has(candidate.id)} onChange={(event) => setSelectedPageIds((current) => { const next = new Set(current); if (event.target.checked) next.add(candidate.id); else next.delete(candidate.id); return next; })} /></td><td><strong>{candidate.text || '（空文字）'}</strong><small>{categoryLabels[candidate.category]} · {candidate.source === 'manual' ? '人工' : candidate.source === 'split' ? '拆分' : 'OCR'}{candidate.systemSuggestion ? ` · 建议${candidate.systemSuggestion === 'approve' ? '保留' : '忽略'}` : ''}</small>{failure && <span className={styles.rowError}>{failure.message}<button type="button" disabled={writeLocked} onClick={() => decisionMutation.mutate({ candidate: failure.candidate, intent: failure.intent })}>重试本项</button></span>}</td><td>{formatTime(candidate.startMs)}<small>至 {formatTime(candidate.endMs)}</small></td><td>{positionLabels[candidate.position]}</td><td>{candidate.termHits.length ? `${candidate.termHits.length} 项命中` : '无命中'}</td><td><span className={`${styles.statusTag} ${statusTone(candidate.status)}`}>{candidateLabels[candidate.status]}</span></td><td><button type="button" disabled={writeLocked} onClick={() => setSelectedId(candidate.id)}>{readOnly ? '查看' : '处理'}</button></td></tr>; })}</tbody></table></div>}
          {candidates.data?.items.length === 0 && <div className={styles.regionState}><strong>当前筛选没有候选</strong><span>零候选不会自动完成本集；请由集列表明确确认空集。</span></div>}
          {candidates.data && <div className={styles.pagination}><span>第 {page + 1} 页 · 共 {candidates.data.total} 条</span><div><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>上一页</button><button type="button" disabled={(page + 1) * 30 >= candidates.data.total} onClick={() => setPage((value) => value + 1)}>下一页</button></div></div>}
        </section>

        <CandidateEvidence candidate={selectedCandidate} readOnly={readOnly} writeLocked={writeLocked} evidenceData={evidence.data} evidencePending={evidence.isPending || evidence.isFetching} evidenceError={evidence.error} onEvidenceRetry={() => evidence.refetch()} pending={decisionMutation.isPending} onDecision={decide} onPlayback={async (candidate) => (await createScreenTextPlaybackGrant(projectId, candidate.id, batch.revision)).url} />
      </div>
    </>}

    {dialog?.kind === 'create' && <CreateBatchDialog episodes={screenEpisodes} stale={batch?.status === 'stale'} pending={createMutation.isPending} error={createMutation.error} triggerRef={dialogTriggerRef} onClose={() => { if (!createMutation.isPending) { setDialog(null); createIntent.current = null; } }} onSubmit={submitCreate} onRecover={() => { setDialog(null); setBatchRecovery(true); void batches.refetch(); }} />}
    {dialog?.kind === 'history' && <ReleaseHistoryDialog projectId={projectId} releases={releases.data} error={releases.error} pending={releases.isFetching} search={releaseSearch} sort={releaseSort} page={releasePage} triggerRef={dialogTriggerRef} onClose={() => setDialog(null)} onRetry={() => void releases.refetch()} onSearch={(value) => { setReleaseSearch(value); setReleasePage(0); }} onSort={(value) => { setReleaseSort(value); setReleasePage(0); }} onPage={setReleasePage} />}
    {dialog && dialog.kind !== 'create' && dialog.kind !== 'history' && <CommandDialog dialog={dialog} batch={batch!} pending={commandMutation.isPending} writeLocked={dialog.kind === 'manual' && writeLocked} error={commandMutation.error} triggerRef={dialogTriggerRef} onClose={() => { if (!commandMutation.isPending) { setDialog(null); commandIntent.current = null; } }} onSubmit={(body) => {
      if (dialog.kind === 'manual' && writeLocked) return;
      const current = commandIntent.current;
      if (current) {
        commandMutation.mutate(current);
        return;
      }
      const input: CommandInput = dialog.kind === 'cancel'
        ? { kind: 'cancel', batchId: batch!.id, body: {} }
        : dialog.kind === 'retry'
          ? { kind: 'retry', batchId: batch!.id, body: { episodeNumbers: [...dialog.episodes] } }
          : dialog.kind === 'empty'
            ? { kind: 'empty', batchId: batch!.id, episodeNumber: dialog.episode, body: { expectedBatchRevision: batch!.revision } }
            : dialog.kind === 'manual'
              ? { kind: 'manual', batchId: batch!.id, episodeNumber: dialog.episode, body: body! }
              : { kind: 'release', body: { batchId: batch!.id, expectedBatchRevision: batch!.revision } };
      const intent = { key: randomKey(), body: input };
      commandIntent.current = intent;
      commandMutation.mutate(intent);
    }} onRetry={() => { if (commandIntent.current) commandMutation.mutate(commandIntent.current); }} onRefresh={() => { setDialog(null); commandIntent.current = null; void refresh(); }} />}
  </section>;
};

const EpisodeRow = ({ job, active, onClick }: { job: ScreenTextEpisodeJob; active: boolean; onClick: (trigger: HTMLButtonElement) => void }) => <button type="button" className={active ? styles.activeRow : ''} onClick={(event) => onClick(event.currentTarget)}><span><strong>第 {String(job.episodeNumber).padStart(2, '0')} 集</strong><small>{job.status === 'review_pending' ? `待确认 ${job.candidateCounts.pending} · 已修改 ${job.candidateCounts.edited}` : episodeLabels[job.status]}</small></span><span className={`${styles.statusTag} ${statusTone(job.status)}`}>{episodeLabels[job.status]}</span></button>;

const CreateBatchDialog = ({ episodes, stale, pending, error, triggerRef, onClose, onSubmit, onRecover }: { episodes: number[]; stale: boolean; pending: boolean; error: unknown; triggerRef: RefObject<HTMLElement | null>; onClose: () => void; onSubmit: (scope: ScreenTextScope) => void; onRecover: () => void }) => {
  const [kind, setKind] = useState<'all' | 'selected' | 'single'>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [single, setSingle] = useState(episodes[0] ?? 1);
  const scope: ScreenTextScope = kind === 'all' ? { kind: 'all' } : kind === 'single' ? { kind: 'single', episodeNumber: single } : { kind: 'selected', episodeNumbers: Array.from(selected).sort((a, b) => a - b) };
  const valid = kind !== 'selected' || selected.size > 0;
  return <Modal title={stale ? '从新来源新建批次' : '新建识别批次'} lead="选择处理范围；供应商、密钥、并发和费用由系统控制台管理，不在员工页面显示。" pending={pending} onClose={onClose} triggerRef={triggerRef} footer={<><button type="button" disabled={pending} onClick={onClose}>取消</button><button className={styles.primary} type="button" disabled={pending || !valid} onClick={() => onSubmit(scope)}>{pending ? '正在创建…' : stale ? '从新来源新建批次' : '创建识别批次'}</button></>}>
    {stale && <div className={styles.readOnlyNote}><strong>旧草稿继续只读</strong><span>历史候选和人工事件不会被新批次覆盖。</span></div>}
    <fieldset className={styles.scopeChoices}><legend>处理范围</legend><label><input type="radio" checked={kind === 'all'} onChange={() => setKind('all')} disabled={pending} />整剧（{episodes.length} 集）</label><label><input type="radio" checked={kind === 'selected'} onChange={() => setKind('selected')} disabled={pending} />选中集</label><label><input type="radio" checked={kind === 'single'} onChange={() => setKind('single')} disabled={pending} />单集</label></fieldset>
    {kind === 'selected' && <div className={styles.episodeChoices}>{episodes.map((episode) => <label key={episode}><input type="checkbox" checked={selected.has(episode)} disabled={pending} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(episode); else next.delete(episode); return next; })} />第 {String(episode).padStart(2, '0')} 集</label>)}</div>}
    {kind === 'single' && <label className={styles.field}>选择集数<select aria-label="选择集数" value={single} disabled={pending} onChange={(event) => setSingle(Number(event.target.value))}>{episodes.map((episode) => <option key={episode} value={episode}>第 {String(episode).padStart(2, '0')} 集</option>)}</select></label>}
    {Boolean(error) && <ErrorBlock title="批次创建结果未确认" error={error} action={isReplayable(error) ? '重新读取批次列表' : '重新读取权威事实'} onAction={onRecover} pending={pending} />}
  </Modal>;
};

const CommandDialog = ({ dialog, batch, pending, writeLocked, error, triggerRef, onClose, onSubmit, onRetry, onRefresh }: { dialog: Exclude<DialogState, null | { kind: 'create' } | { kind: 'history' }>; batch: ScreenTextBatch; pending: boolean; writeLocked: boolean; error: unknown; triggerRef: RefObject<HTMLElement | null>; onClose: () => void; onSubmit: (body?: CreateManualScreenTextCandidateBody) => void; onRetry: () => void; onRefresh: () => void }) => {
  const [text, setText] = useState('');
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(1_000);
  const [evidenceCapturedAtMs, setEvidenceCapturedAtMs] = useState(0);
  const [category, setCategory] = useState<ScreenTextCategory>('other');
  const [position, setPosition] = useState<'left' | 'center' | 'right' | 'full'>('center');
  const title = dialog.kind === 'cancel' ? '确认取消未终结集' : dialog.kind === 'retry' ? '确认重新识别失败集' : dialog.kind === 'empty' ? '确认本集无画面字' : dialog.kind === 'release' ? '发布不可变画面字版本' : '人工新增画面字';
  const valid = dialog.kind !== 'manual' || Boolean(text.trim() && startMs < endMs);
  return <Modal title={title} pending={pending} onClose={onClose} triggerRef={triggerRef} footer={<><button type="button" disabled={pending} onClick={onClose}>取消</button><button className={styles.primary} type="button" disabled={pending || writeLocked || !valid} onClick={() => onSubmit(dialog.kind === 'manual' ? { text: text.trim(), startMs, endMs, evidenceCapturedAtMs, category, position } : undefined)}>{pending ? '正在提交…' : dialog.kind === 'cancel' ? '保存取消意图' : dialog.kind === 'retry' ? '重新识别失败集' : dialog.kind === 'empty' ? '确认本集无画面字' : dialog.kind === 'release' ? '发布版本' : '新增候选'}</button></>}>
    {dialog.kind === 'cancel' && <p>取消只影响未终结集；已经完成的候选、人工决定与用量不会删除，结果可能先进入取消请求中或需对账。</p>}
    {dialog.kind === 'retry' && <p>只重试第 {dialog.episodes.map((episode) => String(episode).padStart(2, '0')).join('、')} 集；其他成功结果与人工决定保持不变。</p>}
    {dialog.kind === 'empty' && <p>第 {String(dialog.episode).padStart(2, '0')} 集将记录可审计的“明确无画面字”决定；以后仍可从新批次重新识别。</p>}
    {dialog.kind === 'release' && <p>将以批次修订 {batch.revision} 创建不可变版本和逐集 SRT；历史版本与原下载身份保持不变。</p>}
    {dialog.kind === 'manual' && <div className={styles.manualForm}><label>文字<input value={text} disabled={pending || writeLocked} onChange={(event) => setText(event.target.value)} /></label><div className={styles.formGrid}><label>分类<select value={category} disabled={pending || writeLocked} onChange={(event) => setCategory(event.target.value as ScreenTextCategory)}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>位置<select value={position} disabled={pending || writeLocked} onChange={(event) => setPosition(event.target.value as typeof position)}>{Object.entries(positionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className={styles.formGrid}><label>开始毫秒<input type="number" min={0} value={startMs} disabled={pending || writeLocked} onChange={(event) => setStartMs(Number(event.target.value))} /></label><label>结束毫秒<input type="number" min={1} value={endMs} disabled={pending || writeLocked} onChange={(event) => setEndMs(Number(event.target.value))} /></label></div><label>证据时间（毫秒）<input type="number" min={0} value={evidenceCapturedAtMs} disabled={pending || writeLocked} onChange={(event) => setEvidenceCapturedAtMs(Number(event.target.value))} /></label></div>}
    {Boolean(error) && <ErrorBlock title="提交失败" error={error} action={recoveryLabel(error, '重试同一意图')} pending={pending} onAction={() => { if (isReplayable(error)) onRetry(); else onRefresh(); }} />}
  </Modal>;
};

const ReleaseHistoryDialog = ({ projectId, releases, error, pending, search, sort, page, triggerRef, onClose, onRetry, onSearch, onSort, onPage }: { projectId: string; releases: { items: Array<{ id: string; version: number; batchId: string; cueCount: number; createdAt: string; exports: Array<{ id: string; filename: string; episodeNumber: number }> }>; total: number } | undefined; error: unknown; pending: boolean; search: string; sort: 'version_desc' | 'created_desc'; page: number; triggerRef: RefObject<HTMLElement | null>; onClose: () => void; onRetry: () => void; onSearch: (value: string) => void; onSort: (value: 'version_desc' | 'created_desc') => void; onPage: (value: number) => void }) => <Modal title="画面字历史版本" lead="历史版本与导出身份来自服务端，刷新后仍可下载原文件。" pending={false} onClose={onClose} triggerRef={triggerRef} wide>
  <div className={styles.historyToolbar}><input aria-label="搜索历史版本" placeholder="搜索版本、文件名或批次编号" value={search} onChange={(event) => onSearch(event.target.value)} /><select aria-label="历史版本排序" value={sort} onChange={(event) => onSort(event.target.value as typeof sort)}><option value="version_desc">版本从新到旧</option><option value="created_desc">最近创建</option></select></div>
  {pending && <div className={styles.regionState} role="status">正在读取历史版本…</div>}
  {Boolean(error) && <ErrorBlock title="历史版本读取失败" error={error} action="重新读取历史版本" onAction={onRetry} pending={pending} />}
  {!pending && !error && releases?.items.length === 0 && <div className={styles.regionState}>尚无发布版本。</div>}
  <div className={styles.releaseList}>{releases?.items.map((release) => <section key={release.id}><header><strong>画面字 V{release.version}</strong><span>{release.cueCount} 条 · 批次 #{release.batchId.slice(0, 8)} · {new Date(release.createdAt).toLocaleString('zh-CN')}</span></header><div>{release.exports.map((item) => <a key={item.id} href={screenTextExportDownloadUrl(projectId, item.id)} download>{item.filename} · 第 {String(item.episodeNumber).padStart(2, '0')} 集</a>)}</div></section>)}</div>
  {(releases?.total ?? 0) > 20 && <div className={styles.pagination}><span>第 {page + 1} 页 · 共 {releases?.total ?? 0} 个版本</span><div><button type="button" disabled={page === 0 || pending} onClick={() => onPage(page - 1)}>上一页</button><button type="button" disabled={(page + 1) * 20 >= (releases?.total ?? 0) || pending} onClick={() => onPage(page + 1)}>下一页</button></div></div>}
  <div className={styles.modalActions}><button type="button" onClick={onClose}>关闭</button></div>
</Modal>;
