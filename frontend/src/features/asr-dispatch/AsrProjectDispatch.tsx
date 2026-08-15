import { useMutation, useQuery } from '@tanstack/react-query';
import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Link } from 'react-router';
import type {
  AsrDispatchGroupDetail,
  AsrProjectEligibilitySearchItem,
  AsrProjectEligibilityStatus,
  Project,
} from '@qimao-terms-cloud/contracts';

import { RetryIcon, SearchIcon } from '../../components/Icons.js';
import {
  checkAsrEligibility,
  createAsrDispatchGroup,
  DispatchApiError,
  getAsrDispatchGroup,
  searchAsrEligibility,
} from './api.js';
import { eligibilityLabels, formatDateTime } from './labels.js';
import styles from './AsrDispatch.module.css';

interface Props {
  projectVersions: Map<string, Project>;
  onRecycle: (project: Project, trigger: HTMLButtonElement) => void;
}

interface CreateIntent {
  body: { dispatchGroupId: string; projectIds: string[]; allowPartial: boolean };
  idempotencyKey: string;
}

interface CreateRecoveryHandle {
  dispatchGroupId: string;
}

export const dispatchCreateRecoveryStorageKey = 'qimao.asr.dispatch-create-recovery.v1';

const readCreateRecoveryHandle = (): CreateRecoveryHandle | null => {
  try {
    const raw = sessionStorage.getItem(dispatchCreateRecoveryStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreateRecoveryHandle>;
    return typeof parsed.dispatchGroupId === 'string' && parsed.dispatchGroupId.length > 0
      ? { dispatchGroupId: parsed.dispatchGroupId }
      : null;
  } catch {
    return null;
  }
};

const writeCreateRecoveryHandle = (handle: CreateRecoveryHandle | null) => {
  try {
    if (handle) sessionStorage.setItem(dispatchCreateRecoveryStorageKey, JSON.stringify(handle));
    else sessionStorage.removeItem(dispatchCreateRecoveryStorageKey);
  } catch {
    // 会话存储不可用时仍保留当前挂载期内的恢复句柄。
  }
};

type WorkflowStatus = Project['workflowStatus'];

const workflowLabels: Record<WorkflowStatus, string> = {
  draft: '待上传',
  uploading: '上传中',
  verifying: '校验中',
  ready: '可处理',
  blocked: '需处理',
};

const isUnknownResult = (error: unknown) => error instanceof TypeError;

const trapPanelFocus = (event: KeyboardEvent<HTMLElement>, container: HTMLElement | null, pending: boolean) => {
  if (pending) {
    if (event.key === 'Tab' || event.key === 'Escape') event.preventDefault();
    return;
  }
  if (event.key !== 'Tab') return;
  const controls = [...(container?.querySelectorAll<HTMLElement>(
    'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)',
  ) ?? [])];
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

export const AsrProjectDispatch = ({ projectVersions, onRecycle }: Props) => {
  const [search, setSearch] = useState('');
  const [eligibilityStatus, setEligibilityStatus] = useState<AsrProjectEligibilityStatus | ''>('');
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | ''>('');
  const [sortBy, setSortBy] = useState<'actionPriority' | 'updatedAt' | 'name'>('actionPriority');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [allSelected, setAllSelected] = useState(false);
  const [selectionNotice, setSelectionNotice] = useState('');
  const [selectAllRetrying, setSelectAllRetrying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [result, setResult] = useState<AsrDispatchGroupDetail | null>(null);
  const [createRecoveryHandle, setCreateRecoveryHandle] = useState<CreateRecoveryHandle | null>(() => readCreateRecoveryHandle());
  const [unknownResult, setUnknownResult] = useState(() => Boolean(readCreateRecoveryHandle()));
  const [recoveryError, setRecoveryError] = useState<DispatchApiError | null>(null);
  const deferredSearch = useDeferredValue(search);
  const bulkTrigger = useRef<HTMLButtonElement | null>(null);
  const noticeRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const createIntent = useRef<CreateIntent | null>(null);
  const queryRecoveryRequested = useRef(false);
  const queryRetryRef = useRef<HTMLButtonElement | null>(null);
  const eligibilityRecoveryRequested = useRef(false);
  const eligibilityRetryRef = useRef<HTMLButtonElement | null>(null);
  const selectAllRecoveryRequested = useRef(false);
  const selectAllRetryRef = useRef<HTMLButtonElement | null>(null);
  const restoreTrigger = useRef(false);
  const limit = 10;

  const query = useQuery({
    queryKey: ['asr-eligibility-search', deferredSearch, eligibilityStatus, workflowStatus, sortBy, page],
    queryFn: () => searchAsrEligibility({
      ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
      ...(eligibilityStatus ? { eligibilityStatus } : {}),
      ...(workflowStatus ? { workflowStatus } : {}),
      lifecycleStatus: 'active',
      sortBy,
      sortDirection: sortBy === 'name' ? 'asc' : 'desc',
      limit,
      offset: page * limit,
    }),
  });

  const selectedIds = useMemo(() => [...selected.keys()].sort(), [selected]);
  const eligibility = useQuery({
    queryKey: ['asr-eligibility-selection', selectedIds],
    queryFn: () => checkAsrEligibility(selectedIds),
    enabled: panelOpen && selectedIds.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: ({ intent }: { intent: CreateIntent }) =>
      createAsrDispatchGroup(intent.body, intent.idempotencyKey),
    onSuccess: (data) => {
      writeCreateRecoveryHandle(null);
      setCreateRecoveryHandle(null);
      setUnknownResult(false);
      setRecoveryError(null);
      setResult(data);
    },
    onError: (error) => {
      if (isUnknownResult(error)) {
        setUnknownResult(true);
        setRecoveryError(null);
      } else {
        writeCreateRecoveryHandle(null);
        setCreateRecoveryHandle(null);
      }
    },
  });

  const recoveryMutation = useMutation({
    mutationFn: (groupId: string) => getAsrDispatchGroup(groupId),
    onSuccess: (data) => {
      writeCreateRecoveryHandle(null);
      setCreateRecoveryHandle(null);
      setRecoveryError(null);
      setUnknownResult(false);
      setResult(data);
    },
    onError: (error) => {
      const apiError = error instanceof DispatchApiError ? error : null;
      setRecoveryError(apiError);
    },
  });

  const selectionSignature = JSON.stringify([deferredSearch.trim(), eligibilityStatus, workflowStatus]);
  const selectionSignatureRef = useRef(selectionSignature);
  selectionSignatureRef.current = selectionSignature;
  const selectAllMutation = useMutation({
    mutationFn: ({ signature }: { signature: string }) => searchAsrEligibility({
      ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
      ...(eligibilityStatus ? { eligibilityStatus } : {}),
      ...(workflowStatus ? { workflowStatus } : {}),
      lifecycleStatus: 'active',
      sortBy,
      sortDirection: sortBy === 'name' ? 'asc' : 'desc',
      limit: 20,
      offset: 0,
    }).then((data) => ({ data, signature })),
    onSuccess: ({ data, signature }) => {
      selectAllRecoveryRequested.current = false;
      setSelectAllRetrying(false);
      if (signature !== selectionSignatureRef.current) return;
      const members = new Map(data.items.map((item) => [item.projectId, item.projectName]));
      if (data.total > 20 || data.items.length !== data.total || members.size !== data.total) {
        setAllSelected(false);
        setSelectionNotice(data.total > 20
          ? `服务端结果现为 ${data.total} 部，超过单次 20 部上限，未形成全部选择。`
          : '服务端返回的全部项目集合不完整，未形成全部选择。');
        return;
      }
      setSelected(members);
      setAllSelected(true);
      setSelectionNotice(`已选择全部 ${data.total} 部符合当前条件的项目。`);
    },
    onError: () => setSelectAllRetrying(true),
  });

  const queryRecoveryPending = queryRecoveryRequested.current && query.isFetching;
  const eligibilityRecoveryPending = eligibilityRecoveryRequested.current && eligibility.isFetching;
  const pending = createMutation.isPending || recoveryMutation.isPending || eligibilityRecoveryPending;
  const stableError = createMutation.error instanceof DispatchApiError ? createMutation.error : null;

  useLayoutEffect(() => {
    if (!panelOpen) return;
    if (pending) panelRef.current?.focus();
    else if (result) resultRef.current?.focus();
    else if (stableError || unknownResult || recoveryError) closeRef.current?.focus();
    else closeRef.current?.focus();
  }, [panelOpen, pending, recoveryError, result, stableError, unknownResult]);

  useEffect(() => {
    if (!panelOpen && restoreTrigger.current) {
      restoreTrigger.current = false;
      bulkTrigger.current?.focus();
    }
  }, [panelOpen]);

  useEffect(() => {
    if (selectionNotice) noticeRef.current?.focus();
  }, [selectionNotice]);

  useLayoutEffect(() => {
    if (!queryRecoveryRequested.current || query.isFetching) return;
    if (query.isError) queryRetryRef.current?.focus();
    else if (query.isSuccess) {
      queryRecoveryRequested.current = false;
      setSelectionNotice('项目资格列表已重新读取。');
    }
  }, [query.dataUpdatedAt, query.errorUpdatedAt, query.isError, query.isFetching, query.isSuccess]);

  useLayoutEffect(() => {
    if (!eligibilityRecoveryRequested.current || eligibility.isFetching) return;
    if (eligibility.isError) eligibilityRetryRef.current?.focus();
    else if (eligibility.isSuccess) {
      eligibilityRecoveryRequested.current = false;
      closeRef.current?.focus();
    }
  }, [eligibility.dataUpdatedAt, eligibility.errorUpdatedAt, eligibility.isError, eligibility.isFetching, eligibility.isSuccess]);

  useLayoutEffect(() => {
    if (selectAllMutation.isError && !selectAllMutation.isPending) selectAllRetryRef.current?.focus();
  }, [selectAllMutation.error, selectAllMutation.isError, selectAllMutation.isPending]);

  const clearForMembershipChange = (source: string) => {
    setPage(0);
    selectAllRecoveryRequested.current = false;
    setSelectAllRetrying(false);
    selectAllMutation.reset();
    if (selected.size > 0 || allSelected) {
      setSelected(new Map());
      setAllSelected(false);
      setSelectionNotice(`筛选条件“${source}”已改变，原项目选择已清除。`);
    }
  };

  const retryProjectQuery = () => {
    if (query.isFetching) return;
    queryRecoveryRequested.current = true;
    void query.refetch();
  };

  const retryEligibility = () => {
    if (eligibility.isFetching) return;
    eligibilityRecoveryRequested.current = true;
    void eligibility.refetch();
  };

  const toggleRow = (item: AsrProjectEligibilitySearchItem) => {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(item.projectId)) next.delete(item.projectId);
      else if (next.size < 20) next.set(item.projectId, item.projectName);
      return next;
    });
    setAllSelected(false);
  };

  const pageItems = query.data?.items ?? [];
  const pageSelected = pageItems.length > 0 && pageItems.every((item) => selected.has(item.projectId));

  const togglePage = () => {
    setSelected((current) => {
      const next = new Map(current);
      if (pageSelected) pageItems.forEach((item) => next.delete(item.projectId));
      else pageItems.forEach((item) => {
        if (next.size < 20) next.set(item.projectId, item.projectName);
      });
      return next;
    });
    setAllSelected(false);
  };

  const selectAllQuery = () => {
    if (selectAllMutation.isPending) return;
    const total = query.data?.total ?? 0;
    if (total > 20) {
      setSelectionNotice('当前条件超过 20 部，请先收窄筛选后再选择全部。');
      return;
    }
    selectAllRecoveryRequested.current = true;
    setSelectAllRetrying(selectAllRetrying || selectAllMutation.isError);
    selectAllMutation.mutate({ signature: selectionSignature });
  };

  const openPanel = (event: MouseEvent<HTMLButtonElement>) => {
    bulkTrigger.current = event.currentTarget;
    createMutation.reset();
    recoveryMutation.reset();
    setResult(null);
    setRecoveryError(null);
    if (createRecoveryHandle) setUnknownResult(true);
    else {
      createIntent.current = null;
      setUnknownResult(false);
    }
    setPanelOpen(true);
  };

  const reopenRecovery = (event: MouseEvent<HTMLButtonElement>) => {
    bulkTrigger.current = event.currentTarget;
    createMutation.reset();
    recoveryMutation.reset();
    setResult(null);
    setRecoveryError(null);
    setUnknownResult(true);
    setPanelOpen(true);
  };

  const closePanel = () => {
    if (pending) return;
    restoreTrigger.current = true;
    setPanelOpen(false);
  };

  const submit = () => {
    if (createRecoveryHandle) {
      recoveryMutation.mutate(createRecoveryHandle.dispatchGroupId);
      return;
    }
    const ids = [...selectedIds];
    const current = createIntent.current;
    const intent = current && current.body.projectIds.join(',') === ids.join(',')
      ? current
      : {
          body: { dispatchGroupId: crypto.randomUUID(), projectIds: ids, allowPartial: true },
          idempotencyKey: crypto.randomUUID(),
        };
    createIntent.current = intent;
    const handle = { dispatchGroupId: intent.body.dispatchGroupId };
    writeCreateRecoveryHandle(handle);
    setCreateRecoveryHandle(handle);
    setUnknownResult(false);
    setRecoveryError(null);
    createMutation.mutate({ intent });
  };

  const recoverUnknown = () => {
    const groupId = createRecoveryHandle?.dispatchGroupId ?? createIntent.current?.body.dispatchGroupId;
    if (groupId && !recoveryMutation.isPending) recoveryMutation.mutate(groupId);
  };

  const eligibleCount = eligibility.data?.counts.eligibleProjects ?? 0;
  const blockedCount = eligibility.data?.counts.blockedProjects ?? 0;

  return (
    <>
      {selectionNotice && <div className={styles.notice} role="status" tabIndex={-1} ref={noticeRef}>{selectionNotice}</div>}
      {createRecoveryHandle && !panelOpen && <div className={styles.errorBlock} role="status"><strong>有一项派发创建结果待确认</strong><span>只能继续读取原派发，不能再次发送创建请求。</span><button type="button" onClick={reopenRecovery}><RetryIcon />继续确认派发</button></div>}
      {selected.size > 0 && (
        <div className={styles.bulkBar}>
          <div><strong>已选择 {selected.size} 部</strong><span>{allSelected ? '跨页全部选择' : '当前选择'}</span></div>
          <button type="button" className={styles.secondaryButton} onClick={() => { setSelected(new Map()); setAllSelected(false); }}>清除选择</button>
          <button type="button" className={styles.primaryButton} onClick={openPanel}>批量中文识别</button>
        </div>
      )}
      <div className={styles.filters}>
          <label className={styles.searchField}><SearchIcon /><span className="sr-only">搜索项目</span>
            <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); clearForMembershipChange('项目搜索'); }} placeholder="搜索项目名称" />
          </label>
          <label>中文识别资格<select value={eligibilityStatus} onChange={(event) => { setEligibilityStatus(event.target.value as AsrProjectEligibilityStatus | ''); clearForMembershipChange('中文识别资格'); }}>
            <option value="">全部</option>{Object.entries(eligibilityLabels).filter(([key]) => key !== 'blocked').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>项目状态<select value={workflowStatus} onChange={(event) => { setWorkflowStatus(event.target.value as WorkflowStatus | ''); clearForMembershipChange('项目状态'); }}>
            <option value="">全部</option>{Object.entries(workflowLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>排序<select value={sortBy} onChange={(event) => { setSortBy(event.target.value as typeof sortBy); setPage(0); if (allSelected) setSelectionNotice(`排序已改变，仍选择全部 ${selected.size} 部。`); }}>
            <option value="actionPriority">行动优先</option><option value="updatedAt">更新时间</option><option value="name">项目名称</option>
          </select></label>
      </div>

      <div className={styles.tableFrame} aria-busy={query.isLoading || queryRecoveryPending}>
        {query.isLoading && !queryRecoveryPending && <TableSkeleton label="正在加载项目资格" />}
        {queryRecoveryPending && <QueryError title="项目资格暂时无法加载" error={query.error} onRetry={retryProjectQuery} pending buttonRef={queryRetryRef} />}
        {query.isError && !queryRecoveryPending && <QueryError title="项目资格暂时无法加载" error={query.error} onRetry={retryProjectQuery} buttonRef={queryRetryRef} />}
        {query.isSuccess && pageItems.length === 0 && <div className={styles.emptyState} role="status"><strong>没有符合条件的项目</strong><p>请调整服务端搜索或筛选条件。</p></div>}
        {query.isSuccess && pageItems.length > 0 && <div className={styles.tableScroll}><table className={styles.projectTable}>
          <thead><tr><th><input type="checkbox" aria-label="选择当前页项目" checked={pageSelected} onChange={togglePage} /></th><th>项目</th><th>素材</th><th>术语版本</th><th>中文识别资格</th><th>最近任务</th><th>更新时间</th><th>操作</th></tr></thead>
          <tbody>{pageItems.map((item) => {
            const capped = selected.size >= 20 && !selected.has(item.projectId);
            const project = projectVersions.get(item.projectId);
            return <tr key={item.projectId}>
              <td><input type="checkbox" aria-label={`选择项目 ${item.projectName}`} checked={selected.has(item.projectId)} disabled={capped} onChange={() => toggleRow(item)} /></td>
              <td><strong><Link to={`/projects/${item.projectId}/materials`}>{item.projectName}</Link></strong><span className={styles.subtle}>ID {item.projectId.slice(0, 8)}</span></td>
              <td>{item.eligibility.readyEpisodeCount}/{item.eligibility.totalEpisodeCount} 集就绪</td>
              <td>{item.eligibility.termVersionId ? `V${item.eligibility.termVersionId.slice(0, 6)}` : '未确认'}</td>
              <td><StatusMarker tone={item.eligibilityStatus}>{eligibilityLabels[item.eligibilityStatus]}</StatusMarker>{item.eligibility.blockers[0] && <span className={styles.subtle}>{item.eligibility.blockers[0].message}</span>}</td>
              <td>{item.latestBatch ? `${item.latestBatch.resultEpisodes}/${item.latestBatch.totalEpisodes} 集` : '暂无任务'}</td>
              <td>{formatDateTime(item.updatedAt)}</td>
              <td>{project ? <button type="button" className={styles.textButton} onClick={(event) => onRecycle(project, event.currentTarget)}>移入回收站</button> : <Link to={`/projects/${item.projectId}/materials`}>打开项目</Link>}</td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>

      {selectAllMutation.isError && !selectAllMutation.isPending && <ErrorBlock title="全部项目暂时无法读取" error={selectAllMutation.error} action={<button ref={selectAllRetryRef} type="button" onClick={selectAllQuery}><RetryIcon />重新读取全部项目</button>} />}
      {query.isSuccess && query.data.total > 0 && <div className={styles.pagination}>
        <span>共 {query.data.total} 部{selected.size >= 20 && ' · 已达单次 20 部上限'}</span>
        {!allSelected && query.data.total > pageItems.length && !selectAllMutation.isError && <button type="button" disabled={selectAllMutation.isPending} onClick={selectAllQuery}>{selectAllMutation.isPending ? (selectAllRetrying ? '正在重新读取全部项目' : '正在读取全部项目…') : `选择全部 ${query.data.total} 部符合当前条件的项目`}</button>}
        <button type="button" disabled={page === 0} onClick={() => { setPage((value) => value - 1); if (allSelected) setSelectionNotice(`已翻页，仍选择全部 ${selected.size} 部。`); }}>上一页</button>
        <span>第 {page + 1} 页</span>
        <button type="button" disabled={(page + 1) * limit >= query.data.total} onClick={() => { setPage((value) => value + 1); if (allSelected) setSelectionNotice(`已翻页，仍选择全部 ${selected.size} 部。`); }}>下一页</button>
      </div>}

      {panelOpen && <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
        <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="bulk-title" tabIndex={-1} ref={panelRef} onKeyDown={(event) => {
          trapPanelFocus(event, panelRef.current, pending);
          if (event.key === 'Escape' && !pending) { event.preventDefault(); closePanel(); }
        }}>
          <header><div><span className={styles.eyebrow}>多剧派发</span><h2 id="bulk-title">批量中文识别</h2></div><button ref={closeRef} type="button" onClick={closePanel} disabled={pending}>关闭批量确认</button></header>
          {eligibility.isLoading && !eligibilityRecoveryPending && <TableSkeleton label="正在核对项目资格" />}
          {eligibilityRecoveryPending && <QueryError title="项目资格核对失败" error={eligibility.error} onRetry={retryEligibility} pending buttonRef={eligibilityRetryRef} />}
          {eligibility.isError && !eligibilityRecoveryPending && <QueryError title="项目资格核对失败" error={eligibility.error} onRetry={retryEligibility} buttonRef={eligibilityRetryRef} />}
          {eligibility.data && <>
            <div className={styles.metrics}><Metric label="已选" value={eligibility.data.counts.selectedProjects} /><Metric label="可创建" value={eligibleCount} /><Metric label="阻断" value={blockedCount} /><Metric label="总集数" value={eligibility.data.counts.totalEpisodes} /><Metric label="预计新任务" value={eligibility.data.counts.newJobs} /><Metric label="可复用结果" value={eligibility.data.counts.reusableResults} /></div>
            <div className={styles.panelTable}><table><thead><tr><th>项目</th><th>术语/热词</th><th>视频覆盖</th><th>新建/复用</th><th>资格或结果</th></tr></thead><tbody>{eligibility.data.items.map((item) => {
              const returned = result?.results.find((entry) => entry.projectId === item.projectId);
              return <tr key={item.projectId}><td>{item.projectName ?? selected.get(item.projectId) ?? item.projectId.slice(0, 8)}</td><td>{item.termVersionId ? '已绑定' : '缺术语'}</td><td>{item.readyEpisodeCount}/{item.totalEpisodeCount} 集</td><td>{item.newJobCount}/{item.reusableResultCount}</td><td>{returned ? (returned.acceptanceStatus === 'accepted' ? '已接受' : returned.dispatchError?.message ?? '已阻断') : item.eligible ? '可创建' : item.blockers[0]?.message ?? '已阻断'}</td></tr>;
            })}</tbody></table></div>
          </>}
          {pending && <div className={styles.pendingState} role="status">{recoveryMutation.isPending ? '正在重新读取同一派发；创建请求仍为 1 次。' : '正在创建派发；创建请求已发送 1 次。'}</div>}
          {stableError && <ErrorBlock title="派发创建失败" error={stableError} />}
          {unknownResult && <div className={styles.errorBlock} role="alert"><strong>{recoveryError?.status === 404 ? '派发尚未确认' : '创建结果未知'}</strong><span>{recoveryError?.message ?? '网络中断后无法确认创建结果。'}</span>{recoveryError?.requestId && <span>本次读取请求标识 {recoveryError.requestId}</span>}<span>创建请求仍为 1 次，只能重新读取同一派发。</span><button type="button" onClick={recoverUnknown} disabled={pending}><RetryIcon />重新读取派发</button></div>}
          {result && <div className={styles.resultBlock} role="status" tabIndex={-1} ref={resultRef}><strong>{result.acceptanceStatus === 'partial' ? '派发已部分接受' : '派发已创建'}</strong><span>已选 {result.counts.selectedProjects} / 接受 {result.counts.acceptedProjects} / 阻断 {result.counts.blockedProjects}</span><span>创建请求标识 {result.requestId}</span><Link to="/asr-dispatches">查看中文识别任务</Link></div>}
          <footer>{!result && !unknownResult && !createRecoveryHandle && <button type="button" className={styles.primaryButton} disabled={pending || !eligibility.data || eligibleCount === 0} onClick={submit}>{stableError ? '再次提交同一意图' : blockedCount > 0 ? `只为 ${eligibleCount} 部可执行项目创建` : `为 ${eligibleCount} 部项目创建`}</button>}</footer>
        </aside>
      </div>}
    </>
  );
};

const Metric = ({ label, value }: { label: string; value: number }) => <div><span>{label}</span><strong>{value}</strong></div>;
const StatusMarker = ({ tone, children }: { tone: string; children: string }) => <span className={`${styles.marker} ${styles[tone]}`}><i aria-hidden="true" />{children}</span>;
const TableSkeleton = ({ label }: { label: string }) => <div className={styles.skeleton} aria-label={label}>{[0, 1, 2, 3].map((row) => <span key={row} />)}</div>;
const ErrorBlock = ({ title, error, action }: { title: string; error: unknown; action?: ReactNode }) => {
  const apiError = error instanceof DispatchApiError ? error : null;
  return <div className={styles.errorBlock} role="alert"><strong>{title}</strong><span>{error instanceof Error ? error.message : '未知错误'}</span>{apiError?.requestId && <span>请求标识 {apiError.requestId}</span>}{action}</div>;
};
const QueryError = ({ title, error, onRetry, pending = false, buttonRef }: { title: string; error: unknown; onRetry: () => void; pending?: boolean; buttonRef?: RefObject<HTMLButtonElement | null> }) => <div className={styles.emptyState} aria-busy={pending}>{pending
  ? <><div className={styles.pendingState} role="status">正在重新读取，请稍候。</div><button ref={buttonRef} type="button" disabled><RetryIcon />正在重新读取</button></>
  : <ErrorBlock title={title} error={error} action={<button ref={buttonRef} type="button" onClick={onRetry}><RetryIcon />重新读取</button>} />}</div>;
