import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AsrBatchDetail,
  AsrBatchStatus,
  AsrBatchSummary,
  AsrJob,
  CreateAsrBatchBody,
} from '@qimao-terms-cloud/contracts';
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from 'react';
import { Link, useParams } from 'react-router';

import { projectModules } from '../../modules.js';
import { getProjectMaterialState } from '../materials/api.js';
import { getTermWorkspace } from '../terms/api.js';
import {
  activeAsrBatchStatuses,
  AsrApiError,
  cancelAsrBatch,
  createAsrBatch,
  getAsrBatch,
  listAsrBatches,
  prepareAsrBatch,
  retryAsrBatch,
} from './api.js';
import {
  CommandDialog,
  EvidencePanel,
  NewBatchPanel,
} from './AsrPanels.js';
import {
  batchStatusLabels,
  formatDateTime,
  formatScope,
  formatUsage,
  isUnknownAsrResult,
  jobStatusLabels,
  qualityStatusLabels,
  receiptLabels,
  stableIntent,
} from './model.js';
import styles from './AsrWorkspace.module.css';

type ConfirmState =
  | { kind: 'create'; body: CreateAsrBatchBody; reusableCount: number }
  | { kind: 'cancel'; batch: AsrBatchDetail }
  | { kind: 'retry'; batch: AsrBatchDetail; episodeNumbers: number[] };

type EvidenceState =
  | { kind: 'hotwords'; batch: AsrBatchDetail }
  | { kind: 'quality'; batch: AsrBatchDetail; job: AsrJob }
  | { kind: 'reconciliation'; batch: AsrBatchDetail; job?: AsrJob };

interface Intent {
  signature: string;
  key: string;
}

const lifecycleLabels = {
  active: '使用中', recycled: '已回收', purging: '清理中', purged: '已清理',
} as const;

const batchStatuses = Object.keys(batchStatusLabels) as AsrBatchStatus[];
const batchPageSize = 20;

export const AsrWorkspace = () => {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AsrBatchStatus | ''>('');
  const [sort, setSort] = useState<'priority' | 'updated-desc' | 'updated-asc'>('priority');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [prepareForceNew, setPrepareForceNew] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [evidence, setEvidence] = useState<EvidenceState | null>(null);
  const [feedback, setFeedback] = useState('');
  const createTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);
  const evidenceReturnFocus = useRef<HTMLElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const createIntent = useRef<Intent | null>(null);
  const cancelIntent = useRef<Intent | null>(null);
  const retryIntent = useRef<Intent | null>(null);

  const materials = useQuery({
    queryKey: ['project-material-state', projectId],
    queryFn: () => getProjectMaterialState(projectId),
    enabled: Boolean(projectId),
  });
  const terms = useQuery({
    queryKey: ['term-workspace', projectId],
    queryFn: () => getTermWorkspace(projectId),
    enabled: Boolean(projectId),
  });
  const batches = useQuery({
    queryKey: ['asr-batches', projectId, 'list', search, status, sort, page],
    queryFn: () => listAsrBatches(projectId, {
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status ? { status } : {}),
      sortBy: sort === 'priority' ? 'actionPriority' : 'updatedAt',
      sortDirection: sort === 'updated-asc' ? 'asc' : 'desc',
      limit: batchPageSize,
      offset: page * batchPageSize,
    }),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => query.state.data?.items.some((batch) => activeAsrBatchStatuses.has(batch.status)) ? 2_500 : false,
  });
  const activeBatchCount = useQuery({
    queryKey: ['asr-batches', projectId, 'active-count'],
    queryFn: async () => {
      const lists = await Promise.all([...activeAsrBatchStatuses].map((activeStatus) => listAsrBatches(projectId, {
        status: activeStatus,
        sortBy: 'actionPriority',
        sortDirection: 'desc',
        limit: 1,
        offset: 0,
      })));
      return lists.reduce((total, list) => total + list.total, 0);
    },
    enabled: Boolean(projectId),
    refetchInterval: (query) => query.state.data ? 2_500 : false,
  });
  const detail = useQuery({
    queryKey: ['asr-batch', projectId, expandedId],
    queryFn: () => getAsrBatch(projectId, expandedId!),
    enabled: Boolean(projectId && expandedId),
    refetchInterval: (query) => query.state.data && activeAsrBatchStatuses.has(query.state.data.status) ? 2_500 : false,
  });

  const manifest = materials.data?.manifest;
  const project = materials.data?.project;
  const latestTermVersion = terms.data?.latestVersion ?? null;
  const termReady = Boolean(latestTermVersion && terms.data?.sourceIsCurrent);
  const episodeRows = useMemo(() => {
    if (!manifest) return [];
    const assetByEpisode = new Map(manifest.assetBindings
      .filter((binding) => binding.role === 'asr_video')
      .map((binding) => [binding.episodeNumber, binding.assetId]));
    return manifest.bindings
      .filter((binding) => binding.role === 'asr_video')
      .sort((a, b) => a.episodeNumber - b.episodeNumber)
      .map((binding) => ({
        episodeNumber: binding.episodeNumber,
        fileName: binding.fileName,
        assetId: assetByEpisode.get(binding.episodeNumber) ?? null,
        ready: assetByEpisode.has(binding.episodeNumber),
      }));
  }, [manifest]);
  const sourceReady = Boolean(project?.lifecycleStatus === 'active'
    && manifest && episodeRows.some((item) => item.ready));
  const preparation = useQuery({
    queryKey: ['asr-batch-preparation', projectId, latestTermVersion?.id, prepareForceNew],
    queryFn: () => prepareAsrBatch(projectId, latestTermVersion!.id, prepareForceNew),
    enabled: Boolean(createOpen && termReady && latestTermVersion),
  });
  const visibleBatches = batches.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((batches.data?.total ?? 0) / batchPageSize));

  useEffect(() => {
    if (!batches.data || page === 0 || page * batchPageSize < batches.data.total) return;
    setPage(Math.max(0, Math.ceil(batches.data.total / batchPageSize) - 1));
  }, [batches.data, page]);

  const invalidateAsr = async (batchId?: string) => {
    const work = [
      queryClient.invalidateQueries({ queryKey: ['asr-batches', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['asr-batch-preparation', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project-material-state', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['term-workspace', projectId] }),
    ];
    if (batchId) work.push(queryClient.invalidateQueries({ queryKey: ['asr-batch', projectId, batchId] }));
    await Promise.all(work);
  };

  const announce = (message: string) => {
    setFeedback(message);
  };

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  const createMutation = useMutation({
    mutationFn: async (body: CreateAsrBatchBody) => {
      const signature = JSON.stringify(body);
      const intent = stableIntent(createIntent.current, signature);
      createIntent.current = intent;
      try {
        return await createAsrBatch(projectId, body, intent.key);
      } catch (error) {
        if (!isUnknownAsrResult(error)) createIntent.current = null;
        throw error;
      }
    },
    onSuccess: async (created) => {
      createIntent.current = null;
      setCreateOpen(false);
      setConfirm(null);
      setExpandedId(created.id);
      queryClient.setQueryData(['asr-batch', projectId, created.id], created);
      await invalidateAsr(created.id);
      announce(`模拟识别批次 ${created.id.slice(0, 8)} 已创建，状态为${batchStatusLabels[created.status]}。`);
    },
    onError: async (error) => {
      if (!isUnknownAsrResult(error)) await invalidateAsr();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (batch: AsrBatchDetail) => {
      const signature = batch.id;
      const intent = stableIntent(cancelIntent.current, signature);
      cancelIntent.current = intent;
      try {
        return await cancelAsrBatch(projectId, batch.id, intent.key);
      } catch (error) {
        if (!isUnknownAsrResult(error)) cancelIntent.current = null;
        throw error;
      }
    },
    onSuccess: async (updated) => {
      cancelIntent.current = null;
      setConfirm(null);
      queryClient.setQueryData(['asr-batch', projectId, updated.id], updated);
      await invalidateAsr(updated.id);
      announce(`批次 ${updated.id.slice(0, 8)} 的取消意图已保存；页面将继续读取逐集权威状态。`);
    },
    onError: async (error) => { if (!isUnknownAsrResult(error)) await invalidateAsr(expandedId ?? undefined); },
  });

  const retryMutation = useMutation({
    mutationFn: async ({ batch, episodeNumbers }: Extract<ConfirmState, { kind: 'retry' }>) => {
      const body = { episodeNumbers };
      const signature = JSON.stringify({ batchId: batch.id, body });
      const intent = stableIntent(retryIntent.current, signature);
      retryIntent.current = intent;
      try {
        return await retryAsrBatch(projectId, batch.id, body, intent.key);
      } catch (error) {
        if (!isUnknownAsrResult(error)) retryIntent.current = null;
        throw error;
      }
    },
    onSuccess: async (created) => {
      retryIntent.current = null;
      setConfirm(null);
      setExpandedId(created.id);
      queryClient.setQueryData(['asr-batch', projectId, created.id], created);
      await invalidateAsr(created.id);
      announce(`失败集重试批次 ${created.id.slice(0, 8)} 已创建；既有成功结果保持不变。`);
    },
    onError: async (error) => { if (!isUnknownAsrResult(error)) await invalidateAsr(expandedId ?? undefined); },
  });

  const commandPending = createMutation.isPending || cancelMutation.isPending || retryMutation.isPending;
  const commandError = createMutation.error ?? cancelMutation.error ?? retryMutation.error;
  const loading = materials.isLoading || terms.isLoading || batches.isLoading;
  const contextError = materials.error ?? terms.error;

  if (loading) return <div className={styles.pageState} aria-busy="true"><span className={styles.spinner} aria-hidden="true" /><strong>正在读取中文识别工作台…</strong><p>正在核对项目、素材、术语版本和历史批次。</p></div>;
  if (contextError || !project) return (
    <div className={styles.pageState} role="alert">
      <strong>项目工作台读取失败</strong><p>{contextError?.message ?? '项目不存在或已不可访问。'}</p>
      <button type="button" onClick={() => void Promise.all([materials.refetch(), terms.refetch(), batches.refetch()])}>重新读取</button>
    </div>
  );

  const openConfirm = (state: ConfirmState, trigger?: HTMLElement | null) => {
    dialogReturnFocus.current = trigger ?? document.activeElement as HTMLElement | null;
    createMutation.reset();
    cancelMutation.reset();
    retryMutation.reset();
    setConfirm(state);
  };
  const closeConfirm = () => { if (!commandPending) setConfirm(null); };
  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === 'create') createMutation.mutate(confirm.body);
    else if (confirm.kind === 'cancel') cancelMutation.mutate(confirm.batch);
    else retryMutation.mutate(confirm);
  };
  const openCreate = () => {
    setPrepareForceNew(false);
    setCreateOpen(true);
  };
  const updateListQuery = (change: () => void) => {
    change();
    setPage(0);
    setExpandedId(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.projectContext}>
        <div><Link to="/projects">← 返回项目中心</Link><strong title={project.name}>{project.name}</strong><span className={styles.projectStatus}>{lifecycleLabels[project.lifecycleStatus]}</span></div>
        <nav aria-label="项目工作台">
          {projectModules.filter((module) => module.status === 'active').map((module) => (
            <Link key={module.id} to={module.route.replace(':projectId', projectId)} aria-current={module.id === 'project-asr' ? 'page' : undefined}>{module.title}</Link>
          ))}
        </nav>
      </div>

      <section className={styles.gateSummary} aria-label="中文识别门禁摘要">
        <div><span>术语门禁</span><strong>{termReady ? `已确认 V${latestTermVersion!.version}` : '尚未满足'}</strong><small>{terms.data?.sourceIsCurrent ? '当前来源一致' : '来源变化，需重新确认'}</small></div>
        <div><span>素材门禁</span><strong>{episodeRows.filter((item) => item.ready).length} / {episodeRows.length} 集</strong><small>已校验中文识别视频</small></div>
        <div><span>识别模式</span><strong>模拟识别</strong><small>零外部网络</small></div>
        <div><span>运行中批次</span><strong>{activeBatchCount.isLoading ? '—' : activeBatchCount.data ?? 0}</strong><small>来自后端权威状态</small></div>
        <button ref={createTriggerRef} className={styles.primaryButton} type="button" disabled={!termReady || !sourceReady} onClick={openCreate}>新建模拟识别批次</button>
      </section>

      <div className={styles.simulationNotice}>
        <strong>模拟识别</strong><span>不连接外部供应商，只用于验证创建、运行、取消和恢复链路；不代表真实识别准确率。</span>
      </div>

      {!termReady && <div className={styles.pageNotice} role="alert"><div><strong>术语门禁尚未满足</strong><p>需要当前公司 SRT 来源对应的不可变术语版本。</p></div><Link to={`/projects/${projectId}/terms`}>返回术语确认</Link></div>}
      {(!manifest || episodeRows.length === 0 || !episodeRows.some((item) => item.ready)) && <div className={styles.pageNotice} role="alert"><div><strong>素材门禁尚未满足</strong><p>请先确认并上传至少一集中文识别视频，等待服务端校验完成。</p></div><Link to={`/projects/${projectId}/materials`}>返回概览与素材</Link></div>}
      {project.lifecycleStatus !== 'active' && <div className={styles.pageNotice} role="alert"><div><strong>项目不可编辑</strong><p>当前项目已进入生命周期处理，只能浏览历史识别事实。</p></div><Link to="/recycle-bin">查看项目回收站</Link></div>}

      {feedback && <div ref={feedbackRef} className={styles.feedback} role="status" tabIndex={-1}>{feedback}</div>}

      <div className={styles.toolbar}>
        <label className={styles.searchField}>搜索批次编号<input value={search} onChange={(event) => updateListQuery(() => setSearch(event.target.value))} placeholder="输入批次编号片段" /></label>
        <label>状态<select value={status} onChange={(event) => updateListQuery(() => setStatus(event.target.value as AsrBatchStatus | ''))}><option value="">全部状态</option>{batchStatuses.map((item) => <option key={item} value={item}>{batchStatusLabels[item]}</option>)}</select></label>
        <label>排序<select value={sort} onChange={(event) => updateListQuery(() => setSort(event.target.value as typeof sort))}><option value="priority">行动优先</option><option value="updated-desc">更新时间：新到旧</option><option value="updated-asc">更新时间：旧到新</option></select></label>
        <button type="button" onClick={() => void Promise.all([batches.refetch(), detail.refetch()])}>刷新状态</button>
      </div>

      {batches.isError && <div className={styles.listError} role="alert"><strong>批次读取失败</strong><p>{batches.error.message}</p>{batches.error instanceof AsrApiError && batches.error.requestId && <small>请求标识：{batches.error.requestId}</small>}<span>已经形成的成功结果不会因读取失败被删除。</span><button type="button" onClick={() => void batches.refetch()}>重新读取</button></div>}
      {batches.isSuccess && batches.data.total === 0 && <div className={styles.emptyState} role="status"><strong>{search || status ? '当前查询没有匹配批次' : '尚无中文识别批次'}</strong><p>{search || status ? '请调整批次编号或状态条件后重新查看。' : '双门禁满足后，可以从整剧、选中集或单集创建第一个模拟识别批次。'}</p>{!search && !status && <button type="button" disabled={!termReady || !sourceReady} onClick={openCreate}>新建模拟识别批次</button>}</div>}

      {batches.isSuccess && batches.data.total > 0 && (
        <div className={styles.tableFrame}>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>批次</th><th>范围</th><th>模式</th><th>状态</th><th>集数进度</th><th>质量</th><th>处理用量</th><th>更新时间</th><th>操作</th></tr></thead>
              <tbody>
                {visibleBatches.map((batch) => (
                  <Fragment key={batch.id}>
                    <BatchRow batch={batch} expanded={expandedId === batch.id} onToggle={() => setExpandedId((current) => current === batch.id ? null : batch.id)} />
                    {expandedId === batch.id && (
                      <tr className={styles.detailRow}><td colSpan={9}>
                        {detail.isLoading && <div className={styles.inlineLoading} aria-busy="true">正在读取批次逐集事实…</div>}
                        {detail.error && <div className={styles.commandError} role="alert"><strong>批次详情读取失败</strong><span>{detail.error.message}</span><button type="button" onClick={() => void detail.refetch()}>重新读取</button></div>}
                        {detail.data && <BatchDetail
                          batch={detail.data}
                          onCancel={(event) => openConfirm({ kind: 'cancel', batch: detail.data }, event.currentTarget)}
                          onRetry={(episodes, event) => openConfirm({ kind: 'retry', batch: detail.data!, episodeNumbers: episodes }, event.currentTarget)}
                          onEvidence={(next, event) => { evidenceReturnFocus.current = event.currentTarget; setEvidence(next); }}
                        />}
                      </td></tr>
                    )}
                  </Fragment>
                ))}
                {visibleBatches.length === 0 && <tr><td className={styles.noMatch} colSpan={9}>当前筛选没有匹配批次。</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className={styles.tableFooter}>
            <span>第 {page + 1} / {pageCount} 页 · 共 {batches.data.total} 个后端批次</span>
            <span>批次状态、搜索、排序与总数均来自后端投影</span>
            <span className={styles.paginationControls}>
              <button type="button" disabled={page === 0} onClick={() => { setExpandedId(null); setPage((current) => Math.max(0, current - 1)); }}>上一页</button>
              <button type="button" disabled={page + 1 >= pageCount} onClick={() => { setExpandedId(null); setPage((current) => current + 1); }}>下一页</button>
            </span>
          </footer>
        </div>
      )}

      {createOpen && <NewBatchPanel
        preparation={preparation.data ?? null}
        preparationLoading={preparation.isLoading}
        preparationError={preparation.error}
        termVersionId={termReady ? latestTermVersion?.id ?? null : null}
        termVersion={termReady ? latestTermVersion?.version ?? null : null}
        sourceReady={sourceReady}
        forceNewRecognition={prepareForceNew}
        returnFocus={createTriggerRef}
        onForceNewRecognitionChange={setPrepareForceNew}
        onRetryPreparation={() => void preparation.refetch()}
        onContinue={(body, reusableCount) => openConfirm({ kind: 'create', body, reusableCount })}
        onClose={() => setCreateOpen(false)}
      />}

      {confirm && <CommandDialog
        {...confirmDialogCopy(confirm)}
        pending={commandPending}
        error={commandError}
        returnFocus={dialogReturnFocus}
        onConfirm={runConfirm}
        onClose={closeConfirm}
      />}
      {evidence && <EvidencePanel projectId={projectId} panel={evidence} returnFocus={evidenceReturnFocus} onClose={() => setEvidence(null)} />}
    </div>
  );
};

const BatchRow = ({ batch, expanded, onToggle }: { batch: AsrBatchSummary; expanded: boolean; onToggle: () => void }) => {
  const completed = batch.counts.completed;
  const quality = batch.status === 'completed' ? '结果已形成'
    : batch.status === 'partial' ? '含可用结果'
      : batch.status === 'reconciliation_required' ? '结果或用量未知' : '尚未完成';
  return (
    <tr aria-current={expanded || undefined}>
      <td><button className={styles.batchId} type="button" onClick={onToggle} aria-expanded={expanded}>#{batch.id.slice(0, 8)}</button><small>{batch.retryOfBatchId ? `重试自 #${batch.retryOfBatchId.slice(0, 8)}` : `请求 ${batch.id.slice(0, 12)}`}</small></td>
      <td>{formatScope(batch.scopeKind === 'single'
        ? { kind: 'single', episodeNumber: batch.episodeNumbers[0] ?? 1 }
        : batch.scopeKind === 'selected'
          ? { kind: 'selected', episodeNumbers: batch.episodeNumbers }
          : { kind: 'all' })}<small>{batch.episodeNumbers.length} 集</small></td>
      <td><span className={styles.modeTag}>模拟识别</span><small>{batch.forceNewRecognition ? '新结果修订' : '允许同源复用'}</small></td>
      <td><StatusTag status={batch.status} label={batchStatusLabels[batch.status]} /></td>
      <td>{completed} / {batch.counts.total}<small>{batch.counts.failed ? `${batch.counts.failed} 集失败` : batch.counts.reconciliationRequired ? `${batch.counts.reconciliationRequired} 集需对账` : '后端权威进度'}</small></td>
      <td>{quality}<small>{batch.termVersionIsLatest ? '术语版本当前' : '术语版本已过期'}</small></td>
      <td>{batch.status === 'reconciliation_required' ? '待对账' : `${batch.counts.total} 个任务`}<small>详情内查看时长</small></td>
      <td>{formatDateTime(batch.updatedAt)}</td>
      <td><button className={styles.rowAction} type="button" onClick={onToggle}>{expanded ? '收起批次' : '查看批次'}</button></td>
    </tr>
  );
};

interface BatchDetailProps {
  batch: AsrBatchDetail;
  onCancel: (event: MouseEvent<HTMLButtonElement>) => void;
  onRetry: (episodes: number[], event: MouseEvent<HTMLButtonElement>) => void;
  onEvidence: (state: EvidenceState, event: MouseEvent<HTMLButtonElement>) => void;
}

const BatchDetail = ({ batch, onCancel, onRetry, onEvidence }: BatchDetailProps) => {
  const failedEpisodes = batch.jobs.filter((job) => job.status === 'failed').map((job) => job.episodeNumber);
  const usages = batch.jobs.flatMap((job) => job.attempts.map((attempt) => attempt.usage));
  const canCancel = batch.status === 'queued' || batch.status === 'running';
  const canRetry = (batch.status === 'partial' || batch.status === 'failed') && failedEpisodes.length > 0;
  return (
    <section className={styles.batchDetail} aria-label={`批次 ${batch.id.slice(0, 8)} 详情`}>
      <header>
        <div><strong>批次 #{batch.id.slice(0, 8)}</strong><span>固定术语 {batch.termVersionId.slice(0, 8)} · 素材清单 V{batch.manifestVersion} · 结果修订不可变</span></div>
        <div>
          <button type="button" onClick={(event) => onEvidence({ kind: 'hotwords', batch }, event)}>本批次热词</button>
          {batch.status === 'reconciliation_required' && <button type="button" onClick={(event) => onEvidence({ kind: 'reconciliation', batch }, event)}>查看对账说明</button>}
          {canCancel && <button type="button" onClick={onCancel}>取消批次</button>}
          {canRetry && <button className={styles.primaryButton} type="button" onClick={(event) => onRetry(failedEpisodes, event)}>仅重试失败集</button>}
        </div>
      </header>
      {!batch.termVersionIsLatest && <div className={styles.staleNotice}>术语版本已过期。历史结果保持原版本；如需更新，请显式创建新批次。</div>}
      {batch.blockers.length > 0 && <div className={styles.blockerList} role="alert"><strong>批次未执行：{batch.blockers.length} 集被阻断</strong>{batch.blockers.map((blocker) => <span key={`${blocker.episodeNumber}-${blocker.code}`}>第 {blocker.episodeNumber} 集 · {blocker.message}</span>)}</div>}
      <div className={styles.detailFacts}>
        <div><span>请求标识</span><strong>{batch.id}</strong></div>
        <div><span>处理用量</span><strong>{formatUsage(usages)}</strong></div>
        <div><span>质量/结果</span><strong>{batch.counts.completed} 集可用（其中复用 {batch.counts.reused}）· {batch.counts.failed} 集失败</strong></div>
        <div><span>热词摘要</span><strong>{batch.hotwords.digest.slice(0, 12)}… · {batch.hotwords.termCount + batch.hotwords.aliasCount} 项</strong></div>
      </div>
      <div className={`${styles.tableWrap} ${styles.jobTableWrap}`}>
        <table>
          <thead><tr><th>集数</th><th>来源视频</th><th>运行状态</th><th>质量</th><th>Cue 与时长</th><th>处理用量</th><th>尝试</th><th>操作</th></tr></thead>
          <tbody>{batch.jobs.map((job) => <JobRow key={job.id} batch={batch} job={job} onEvidence={onEvidence} />)}</tbody>
        </table>
      </div>
    </section>
  );
};

const JobRow = ({ batch, job, onEvidence }: { batch: AsrBatchDetail; job: AsrJob; onEvidence: BatchDetailProps['onEvidence'] }) => {
  const result = job.currentResult;
  const attempts = job.attempts;
  const latestAttempt = attempts.at(-1);
  return (
    <tr>
      <td><strong>第 {job.episodeNumber} 集</strong>{job.reusedResult && <small>明确复用同源结果</small>}</td>
      <td>{job.assetOriginalFilename}<small>{job.assetChecksum.slice(0, 12)}…</small></td>
      <td><StatusTag status={job.status} label={jobStatusLabels[job.status]} /></td>
      <td>{result ? <span className={`${styles.qualityTag} ${styles[result.qualityStatus]}`}>{qualityStatusLabels[result.qualityStatus]}</span> : '尚未形成'}</td>
      <td>{result ? `${result.qualitySummary.cueCount} Cue` : '—'}<small>{result ? `结果 R${result.revision}` : '等待结果'}</small></td>
      <td>{formatUsage(attempts.map((attempt) => attempt.usage))}</td>
      <td>{attempts.length} 次<small>{latestAttempt?.hotwordReceipt ? receiptLabels[latestAttempt.hotwordReceipt] : '尚无回执'}</small></td>
      <td>{job.status === 'reconciliation_required'
        ? <button className={styles.rowAction} type="button" onClick={(event) => onEvidence({ kind: 'reconciliation', batch, job }, event)}>查看对账说明</button>
        : <button className={styles.rowAction} type="button" onClick={(event) => onEvidence({ kind: 'quality', batch, job }, event)}>查看质量</button>}</td>
    </tr>
  );
};

const StatusTag = ({ status, label }: { status: string; label: string }) => (
  <span className={`${styles.statusTag} ${styles[status]}`}><span aria-hidden="true" />{label}</span>
);

const confirmDialogCopy = (confirm: ConfirmState) => {
  if (confirm.kind === 'create') {
    const episodes = confirm.body.scope.kind === 'all' ? '整剧已确认视频'
      : confirm.body.scope.kind === 'single' ? `第 ${confirm.body.scope.episodeNumber} 集`
        : `${confirm.body.scope.episodeNumbers.length} 个选中集`;
    return {
      title: '确认创建模拟识别批次',
      description: '本次只运行零网络模拟识别。批次将固定当前素材清单、术语版本和热词投影。',
      detail: `${episodes} · 术语 ${confirm.body.termVersionId.slice(0, 8)} · 预计 ${confirm.body.scope.kind === 'selected' ? confirm.body.scope.episodeNumbers.length : confirm.body.scope.kind === 'single' ? 1 : '整剧'} 个任务 · 当前历史中 ${confirm.reusableCount} 集可复用。服务端创建时会最终核对同源结果。`,
      confirmLabel: '创建模拟识别批次',
    };
  }
  if (confirm.kind === 'cancel') return {
    title: '确认取消批次',
    description: '未开始集将停止；已经进入执行的集可能先变为取消请求中或需对账。',
    detail: `批次 #${confirm.batch.id.slice(0, 8)} · 已完成结果和历史处理用量不会删除。`,
    confirmLabel: '保存取消意图',
  };
  return {
    title: '确认仅重试失败集',
    description: '只为明确失败的集创建新尝试；成功、警告、复用、取消和需对账集不会重复。',
    detail: `批次 #${confirm.batch.id.slice(0, 8)} · 重试第 ${confirm.episodeNumbers.join('、')} 集 · 历史尝试和既有结果保持不变。`,
    confirmLabel: '仅重试失败集',
  };
};
