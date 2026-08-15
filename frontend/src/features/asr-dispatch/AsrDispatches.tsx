import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import { Link } from 'react-router';
import type {
  AsrDispatchAcceptanceStatus,
  AsrDispatchExecutionStatus,
  AsrDispatchGroupDetail,
} from '@qimao-terms-cloud/contracts';

import { RetryIcon, SearchIcon } from '../../components/Icons.js';
import {
  cancelAsrDispatchGroup,
  DispatchApiError,
  getAsrDispatchGroup,
  listAsrDispatchGroups,
} from './api.js';
import { acceptanceLabels, executionLabels, formatDateTime } from './labels.js';
import styles from './AsrDispatch.module.css';

interface CancelIntent {
  groupId: string;
  idempotencyKey: string;
}

const cancelableStatuses = new Set<AsrDispatchExecutionStatus>(['queued', 'running', 'partial', 'reconciliation_required']);
const cancelAppliedStatuses = new Set<AsrDispatchExecutionStatus>(['cancel_requested', 'cancelled']);

const trapFocus = (event: KeyboardEvent<HTMLElement>, container: HTMLElement | null, pending: boolean) => {
  if (pending) {
    if (event.key === 'Tab' || event.key === 'Escape') event.preventDefault();
    return;
  }
  if (event.key !== 'Tab') return;
  const controls = [...(container?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)') ?? [])];
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
};

export const AsrDispatches = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [acceptanceStatus, setAcceptanceStatus] = useState<AsrDispatchAcceptanceStatus | ''>('');
  const [executionStatus, setExecutionStatus] = useState<AsrDispatchExecutionStatus | ''>('');
  const [sortBy, setSortBy] = useState<'actionPriority' | 'updatedAt' | 'createdAt'>('actionPriority');
  const [page, setPage] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [knownDetail, setKnownDetail] = useState<AsrDispatchGroupDetail | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelUnknown, setCancelUnknown] = useState(false);
  const [notice, setNotice] = useState('');
  const deferredSearch = useDeferredValue(search);
  const detailPanel = useRef<HTMLElement | null>(null);
  const detailClose = useRef<HTMLButtonElement | null>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const cancelDialog = useRef<HTMLDivElement | null>(null);
  const cancelSafe = useRef<HTMLButtonElement | null>(null);
  const cancelRecoveryRef = useRef<HTMLButtonElement | null>(null);
  const noticeRef = useRef<HTMLDivElement | null>(null);
  const restoreDetailTrigger = useRef(false);
  const restoreCancelTrigger = useRef(false);
  const detailRecoveryRequested = useRef(false);
  const detailRetryRef = useRef<HTMLButtonElement | null>(null);
  const listRecoveryRequested = useRef(false);
  const listRetryRef = useRef<HTMLButtonElement | null>(null);
  const cancelIntent = useRef<CancelIntent | null>(null);
  const limit = 10;

  const list = useQuery({
    queryKey: ['asr-dispatch-groups', deferredSearch, acceptanceStatus, executionStatus, sortBy, page],
    queryFn: () => listAsrDispatchGroups({
      ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
      ...(acceptanceStatus ? { acceptanceStatus } : {}),
      ...(executionStatus ? { executionStatus } : {}),
      sortBy,
      sortDirection: 'desc',
      limit,
      offset: page * limit,
    }),
  });

  const detail = useQuery({
    queryKey: ['asr-dispatch-group', detailId],
    queryFn: () => getAsrDispatchGroup(detailId!),
    enabled: Boolean(detailId),
  });

  useEffect(() => {
    if (detail.data) setKnownDetail(detail.data);
  }, [detail.data]);

  const cancelMutation = useMutation({
    mutationFn: ({ intent }: { intent: CancelIntent }) => cancelAsrDispatchGroup(intent.groupId, intent.idempotencyKey),
    onSuccess: async (data) => {
      cancelIntent.current = null;
      setCancelUnknown(false);
      setKnownDetail(data);
      setCancelOpen(false);
      setDetailId(null);
      setNotice('取消意图已保存，未终结的项目批次将进入取消请求中。');
      await queryClient.invalidateQueries({ queryKey: ['asr-dispatch-groups'] });
    },
    onError: (error) => {
      if (error instanceof TypeError) setCancelUnknown(true);
    },
  });

  const cancelRecovery = useMutation({
    mutationFn: (groupId: string) => getAsrDispatchGroup(groupId),
    onSuccess: async (data) => {
      setKnownDetail(data);
      if (data.executionStatus && cancelAppliedStatuses.has(data.executionStatus)) {
        cancelIntent.current = null;
        setCancelUnknown(false);
        setCancelOpen(false);
        setDetailId(null);
        setNotice('已确认取消意图保存成功。');
        await queryClient.invalidateQueries({ queryKey: ['asr-dispatch-groups'] });
      }
    },
  });

  const cancelPending = cancelMutation.isPending || cancelRecovery.isPending;
  const cancelStableError = cancelMutation.error instanceof DispatchApiError ? cancelMutation.error : null;
  const cancelReadError = cancelRecovery.error instanceof DispatchApiError ? cancelRecovery.error : null;
  const listRecoveryPending = listRecoveryRequested.current && list.isFetching;
  const detailRecoveryPending = detailRecoveryRequested.current && detail.isFetching;

  useLayoutEffect(() => {
    if (detailId && !cancelOpen) detailClose.current?.focus();
  }, [detailId, cancelOpen]);

  useLayoutEffect(() => {
    if (!cancelOpen) return;
    if (cancelPending) cancelDialog.current?.focus();
    else if (cancelUnknown) cancelRecoveryRef.current?.focus();
    else cancelSafe.current?.focus();
  }, [cancelOpen, cancelPending, cancelReadError, cancelStableError, cancelUnknown]);

  useLayoutEffect(() => {
    if (!detailRecoveryRequested.current) return;
    if (detail.isFetching) {
      detailPanel.current?.focus();
      return;
    }
    if (detail.isError) detailRetryRef.current?.focus();
    else if (detail.isSuccess) {
      detailRecoveryRequested.current = false;
      detailClose.current?.focus();
    }
  }, [detail.dataUpdatedAt, detail.errorUpdatedAt, detail.isError, detail.isFetching, detail.isSuccess]);

  useEffect(() => {
    if (!detailId && restoreDetailTrigger.current) {
      restoreDetailTrigger.current = false;
      detailTrigger.current?.focus();
    }
  }, [detailId]);

  useEffect(() => {
    if (!cancelOpen && restoreCancelTrigger.current) {
      restoreCancelTrigger.current = false;
      detailClose.current?.focus();
    }
  }, [cancelOpen]);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  useLayoutEffect(() => {
    if (!listRecoveryRequested.current || list.isFetching) return;
    if (list.isError) listRetryRef.current?.focus();
    else if (list.isSuccess) {
      listRecoveryRequested.current = false;
      setNotice('中文识别任务列表已重新读取。');
    }
  }, [list.dataUpdatedAt, list.errorUpdatedAt, list.isError, list.isFetching, list.isSuccess]);

  const openDetail = (id: string, trigger: HTMLButtonElement) => {
    detailTrigger.current = trigger;
    setKnownDetail(null);
    setDetailId(id);
  };

  const closeDetail = () => {
    if (cancelOpen || detail.isFetching) return;
    restoreDetailTrigger.current = true;
    setDetailId(null);
    setKnownDetail(null);
  };

  const retryDetail = () => {
    if (detail.isFetching) return;
    detailRecoveryRequested.current = true;
    void detail.refetch();
  };

  const retryList = () => {
    if (list.isFetching) return;
    listRecoveryRequested.current = true;
    void list.refetch();
  };

  const openCancel = () => {
    cancelMutation.reset();
    cancelRecovery.reset();
    cancelIntent.current = null;
    setCancelUnknown(false);
    setCancelOpen(true);
  };

  const closeCancel = () => {
    if (cancelPending || cancelUnknown) return;
    cancelIntent.current = null;
    setCancelUnknown(false);
    restoreCancelTrigger.current = true;
    setCancelOpen(false);
  };

  const submitCancel = () => {
    if (!detailId || cancelUnknown || cancelPending) return;
    const current = cancelIntent.current;
    const intent = current?.groupId === detailId ? current : { groupId: detailId, idempotencyKey: crypto.randomUUID() };
    cancelIntent.current = intent;
    setCancelUnknown(false);
    cancelMutation.mutate({ intent });
  };

  const currentDetail = detail.data ?? knownDetail;

  return <section className={styles.page} aria-label="中文识别任务">
    {notice && <div className={styles.notice} role="status" tabIndex={-1} ref={noticeRef}>{notice}</div>}
    <div className={styles.filters}>
      <label className={styles.searchField}><SearchIcon /><span className="sr-only">搜索派发</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="搜索派发或项目" /></label>
      <label>接受结果<select value={acceptanceStatus} onChange={(event) => { setAcceptanceStatus(event.target.value as AsrDispatchAcceptanceStatus | ''); setPage(0); }}><option value="">全部</option>{Object.entries(acceptanceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>运行状态<select value={executionStatus} onChange={(event) => { setExecutionStatus(event.target.value as AsrDispatchExecutionStatus | ''); setPage(0); }}><option value="">全部</option>{Object.entries(executionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>排序<select value={sortBy} onChange={(event) => { setSortBy(event.target.value as typeof sortBy); setPage(0); }}><option value="actionPriority">行动优先</option><option value="updatedAt">更新时间</option><option value="createdAt">创建时间</option></select></label>
    </div>
    <div className={styles.tableFrame} aria-busy={list.isLoading || listRecoveryPending}>
      {list.isLoading && !listRecoveryPending && <Skeleton label="正在加载中文识别任务" />}
      {listRecoveryPending && <ReadError title="任务列表暂时无法加载" error={list.error} onRetry={retryList} pending buttonRef={listRetryRef} />}
      {list.isError && !listRecoveryPending && <ReadError title="任务列表暂时无法加载" error={list.error} onRetry={retryList} buttonRef={listRetryRef} />}
      {list.isSuccess && list.data.items.length === 0 && <div className={styles.emptyState} role="status"><strong>还没有中文识别任务</strong><p>请先到项目中心选择一部或多部剧发起中文识别。</p><Link to="/projects">返回项目中心</Link></div>}
      {list.isSuccess && list.data.items.length > 0 && <div className={styles.tableScroll}><table className={styles.dispatchTable}><thead><tr><th>派发</th><th>项目</th><th>接受结果</th><th>状态</th><th>项目进度</th><th>质量与用量</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{list.data.items.map((item) => <tr key={item.id}>
        <td><strong>DSP-{item.id.slice(0, 8)}</strong><span className={styles.subtle}>创建请求标识 {item.requestId}</span></td>
        <td>{item.counts.selectedProjects} 部</td><td>已选 {item.counts.selectedProjects} / 接受 {item.counts.acceptedProjects} / 阻断 {item.counts.blockedProjects}</td>
        <td><span className={`${styles.marker} ${styles[item.executionStatus ?? item.acceptanceStatus]}`}><i aria-hidden="true" />{item.executionStatus ? executionLabels[item.executionStatus] : acceptanceLabels[item.acceptanceStatus]}</span></td>
        <td>{item.counts.completedProjects} / {item.counts.acceptedProjects} 部已完成</td>
        <td>{item.processingUsage.reconciliationStatus === 'pending' ? '用量待对账' : `通过 ${item.quality.passedEpisodes} 集、警告 ${item.quality.warningEpisodes} 集、用量${item.processingUsage.reconciliationStatus === 'recorded' ? '已记录' : '未记录'}`}</td>
        <td>{formatDateTime(item.updatedAt)}</td><td><button type="button" className={styles.textButton} onClick={(event: MouseEvent<HTMLButtonElement>) => openDetail(item.id, event.currentTarget)}>查看任务</button></td>
      </tr>)}</tbody></table></div>}
    </div>
    {list.isSuccess && list.data.total > 0 && <div className={styles.pagination}><span>共 {list.data.total} 个派发</span><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>上一页</button><span>第 {page + 1} 页</span><button type="button" disabled={(page + 1) * limit >= list.data.total} onClick={() => setPage((value) => value + 1)}>下一页</button></div>}

    {detailId && <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}><aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="detail-title" tabIndex={-1} ref={detailPanel} onKeyDown={(event) => { trapFocus(event, detailPanel.current, detail.isFetching); if (event.key === 'Escape' && !detail.isFetching && !cancelOpen) { event.preventDefault(); closeDetail(); } }}>
      <header><div><span className={styles.eyebrow}>派发详情</span><h2 id="detail-title">DSP-{detailId.slice(0, 8)}</h2></div><button type="button" ref={detailClose} onClick={closeDetail} disabled={detail.isFetching || cancelOpen}>关闭任务详情</button></header>
      {detail.isLoading && !detailRecoveryPending && <Skeleton label="正在读取派发详情" />}
      {detailRecoveryPending && <ReadError title="派发详情读取失败" error={detail.error} onRetry={retryDetail} pending buttonRef={detailRetryRef} />}
      {detail.isError && !detailRecoveryPending && <ReadError title="派发详情读取失败" error={detail.error} onRetry={retryDetail} buttonRef={detailRetryRef} />}
      {currentDetail && <>
        <div className={styles.detailMeta}><span>创建于 {formatDateTime(currentDetail.createdAt)}</span><span>最后刷新 {formatDateTime(currentDetail.updatedAt)}</span><span>创建请求标识 {currentDetail.requestId}</span></div>
        <div className={styles.metrics}><Metric label="已选" value={currentDetail.counts.selectedProjects} /><Metric label="接受" value={currentDetail.counts.acceptedProjects} /><Metric label="阻断" value={currentDetail.counts.blockedProjects} /><Metric label="已完成" value={currentDetail.counts.completedProjects} /></div>
        <div className={styles.panelTable}><table><thead><tr><th>项目</th><th>集数</th><th>新建/复用</th><th>子批次状态</th><th>质量与用量</th><th>唯一动作</th></tr></thead><tbody>{currentDetail.results.map((result) => <tr key={result.projectId}><td>{result.eligibility?.projectName ?? result.projectId.slice(0, 8)}</td><td>{result.eligibility?.totalEpisodeCount ?? 0}</td><td>{result.eligibility?.newJobCount ?? 0}/{result.eligibility?.reusableResultCount ?? 0}</td><td>{result.acceptanceStatus === 'blocked' ? '已阻断' : result.batch ? result.batch.status : '已接受'}</td><td>{result.batch ? `${result.batch.counts.completed + result.batch.counts.reused}/${result.batch.counts.total} 集结果` : result.dispatchError?.message ?? '等待批次'}</td><td>{result.acceptanceStatus === 'blocked' && result.dispatchError?.action === 'confirm_terms' ? <Link to={`/projects/${result.projectId}/terms`}>前往术语</Link> : result.acceptanceStatus === 'blocked' ? <Link to={`/projects/${result.projectId}/materials`}>概览与素材</Link> : result.batchId ? <Link to={`/projects/${result.projectId}/asr`}>打开项目批次</Link> : '等待调度'}</td></tr>)}</tbody></table></div>
        {currentDetail.executionStatus && cancelableStatuses.has(currentDetail.executionStatus) && <button type="button" className={styles.dangerButton} onClick={openCancel}>取消未终结项目</button>}
      </>}
    </aside></div>}

    {cancelOpen && currentDetail && <div className={styles.backdropTop} onMouseDown={(event) => { if (event.target === event.currentTarget) closeCancel(); }}><div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="cancel-title" tabIndex={-1} ref={cancelDialog} onKeyDown={(event) => { trapFocus(event, cancelDialog.current, cancelPending); if (event.key === 'Escape') { event.preventDefault(); if (!cancelPending && !cancelUnknown) closeCancel(); } }}>
      <h2 id="cancel-title">取消未终结的项目批次？</h2><p>已完成结果、需对账事实和历史处理用量都会保留；只保存对仍未终结子批次的取消意图。</p>
      {cancelPending && <div className={styles.pendingState} role="status">{cancelRecovery.isPending ? '正在重新读取取消结果；取消请求仍为 1 次。' : '正在保存取消意图；取消请求已发送 1 次。'}</div>}
      {cancelStableError && <ErrorMessage title="取消意图保存失败" error={cancelStableError} />}
      {cancelUnknown && <div className={styles.errorBlock} role="alert"><strong>取消结果未知</strong><span>{cancelReadError?.message ?? '网络中断后无法确认取消意图是否已保存。'}</span>{cancelReadError?.requestId && <span>本次读取请求标识 {cancelReadError.requestId}</span>}<span>结果确认前不能关闭或再次发送取消请求。</span><button ref={cancelRecoveryRef} type="button" disabled={cancelPending} onClick={() => { if (!cancelPending) cancelRecovery.mutate(currentDetail.id); }}><RetryIcon />重新读取取消结果</button></div>}
      <div className={styles.dialogActions}><button type="button" ref={cancelSafe} onClick={closeCancel} disabled={cancelPending || cancelUnknown}>暂不取消</button><button type="button" className={styles.dangerButton} onClick={submitCancel} disabled={cancelPending || cancelUnknown}>{cancelStableError ? '再次保存同一取消意图' : '确认取消未终结项目'}</button></div>
    </div></div>}
  </section>;
};

const Metric = ({ label, value }: { label: string; value: number }) => <div><span>{label}</span><strong>{value}</strong></div>;
const Skeleton = ({ label }: { label: string }) => <div className={styles.skeleton} aria-label={label}>{[0, 1, 2, 3].map((row) => <span key={row} />)}</div>;
const ErrorMessage = ({ title, error }: { title: string; error: unknown }) => { const apiError = error instanceof DispatchApiError ? error : null; return <div className={styles.errorBlock} role="alert"><strong>{title}</strong><span>{error instanceof Error ? error.message : '未知错误'}</span>{apiError?.requestId && <span>请求标识 {apiError.requestId}</span>}</div>; };
const ReadError = ({ title, error, onRetry, pending = false, buttonRef }: { title: string; error: unknown; onRetry: () => void; pending?: boolean; buttonRef?: RefObject<HTMLButtonElement | null> }) => <div className={styles.emptyState} aria-busy={pending}>{pending
  ? <><div className={styles.pendingState} role="status">正在重新读取，请稍候。</div><button ref={buttonRef} type="button" disabled><RetryIcon />正在重新读取</button></>
  : <><ErrorMessage title={title} error={error} /><button ref={buttonRef} type="button" onClick={onRetry}><RetryIcon />重新读取</button></>}</div>;
