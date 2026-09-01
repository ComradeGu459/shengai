import type { TaskDetail, TaskList, TaskListQuery, TaskStatus, TaskSummary, TaskType } from '@qimao-terms-cloud/contracts';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { createUuid } from '../../platform/randomUuid.js';
import { cancelAsrBatch } from '../asr/api.js';
import { cancelAsrDispatchGroup } from '../asr-dispatch/api.js';
import { recoverDelivery } from '../deliveries/api.js';
import { cancelScreenTextBatch, getScreenTextBatch } from '../screen-text/api.js';
import { listProjects } from '../projects/api.js';
import { getTask, listTasks, TaskApiError } from './api.js';
import { actionLabels, formatDate, formatProgress, statusTone, taskStatusLabels, taskTypeLabels } from './model.js';
import styles from './Tasks.module.css';

type Query = { search: string; taskType: TaskType | ''; status: TaskStatus | ''; projectId: string; sortBy: 'updatedAt' | 'createdAt' | 'attentionPriority'; sortDirection: 'asc' | 'desc'; limit: number; offset: number };
type TaskIdentity = { taskType: TaskType; resourceId: string };
type ActionIntent = { action: 'cancel' | 'recover'; task: TaskSummary; key: string };
type Recovery = { action: ActionIntent['action']; task: TaskSummary; key: string; requestId: string | null; message: string };
type ListFocusRecovery = { queryKey: string; token: number };
const taskTypes = Object.keys(taskTypeLabels) as TaskType[];
const taskStatuses = Object.keys(taskStatusLabels) as TaskStatus[];
const focusable = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const toListQuery = (source: Query, patch: Partial<Query> = {}): TaskListQuery => {
  const next = { ...source, ...patch };
  const result: TaskListQuery = { limit: next.limit, offset: next.offset, sortBy: next.sortBy, sortDirection: next.sortDirection };
  if (next.search) result.search = next.search;
  if (next.taskType) result.taskType = next.taskType;
  if (next.status) result.status = next.status;
  if (next.projectId) result.projectId = next.projectId;
  return result;
};

const idempotencyKey = () => {
  return createUuid();
};
const canonicalIdentity = (task: Pick<TaskSummary, 'taskType' | 'resourceId'> | TaskIdentity) => `${task.taskType}:${task.resourceId}`;
class TaskActionError extends Error { constructor(message: string) { super(message); this.name = 'TaskActionError'; } }
const isRetryable = (error: unknown) => {
  if (error instanceof TaskApiError) return error.retryable || error.status >= 500;
  if (error instanceof TaskActionError) return false;
  const candidate = error as { retryable?: boolean; status?: number } | null;
  if (typeof candidate?.retryable === 'boolean') return candidate.retryable;
  if (typeof candidate?.status === 'number') return candidate.status >= 500;
  return error instanceof TypeError || error instanceof Error;
};
const requestIdOf = (error: unknown) => error instanceof TaskApiError ? error.requestId : (error as { requestId?: string | null } | null)?.requestId ?? null;
const messageOf = (error: unknown) => error instanceof Error ? error.message : '请求失败，请稍后重读。';
const trap = (event: KeyboardEvent<HTMLElement>, container: HTMLElement | null) => {
  if (event.key !== 'Tab' || !container) return;
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(focusable));
  if (!nodes.length) { event.preventDefault(); container.focus(); return; }
  const first = nodes[0]; const last = nodes[nodes.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
};

const trapDrawer = (event: KeyboardEvent<HTMLElement>, container: HTMLElement | null, title: HTMLElement | null) => {
  if (event.key !== 'Tab' || !container) return;
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(focusable));
  if (!nodes.length) { event.preventDefault(); container.focus(); return; }
  const first = nodes[0]; const last = nodes[nodes.length - 1];
  if (!first || !last) return;
  if (document.activeElement === title) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
};

const ErrorBlock = ({ title, error, onRetry, stale = false, errorRef }: { title: string; error: unknown; onRetry?: () => void; stale?: boolean; errorRef?: RefObject<HTMLDivElement | null> }) => (
  <div className={stale ? styles.stale : styles.error} role="alert" tabIndex={-1} ref={errorRef}>
    <strong>{title}</strong><span>{messageOf(error)}</span>{requestIdOf(error) && <span>请求标识：{requestIdOf(error)}</span>}
    {onRetry && <button className={styles.secondaryButton} type="button" onClick={onRetry}>重新读取任务中心</button>}
  </div>
);

const Status = ({ status }: { status: TaskStatus }) => <span className={`${styles.status} ${styles[statusTone(status)]}`}>{taskStatusLabels[status]}</span>;

export const TasksPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo<Query>(() => {
    const type = searchParams.get('taskType');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy');
    const direction = searchParams.get('sortDirection');
    const parsedLimit = Number(searchParams.get('limit') ?? 20);
    const parsedOffset = Number(searchParams.get('offset') ?? 0);
    return {
      search: searchParams.get('search') ?? '',
      taskType: taskTypes.includes(type as TaskType) ? type as TaskType : '',
      status: taskStatuses.includes(status as TaskStatus) ? status as TaskStatus : '',
      projectId: searchParams.get('projectId') ?? '',
      sortBy: sortBy === 'createdAt' || sortBy === 'attentionPriority' ? sortBy : 'updatedAt',
      sortDirection: direction === 'asc' ? 'asc' : 'desc',
      limit: parsedLimit === 50 ? 50 : 20,
      offset: Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0,
    };
  }, [searchParams]);
  const resourceIdentity = useMemo<TaskIdentity | null>(() => {
    const taskType = searchParams.get('taskType');
    const resourceId = searchParams.get('resourceId');
    return taskType && resourceId && taskTypes.includes(taskType as TaskType) ? { taskType: taskType as TaskType, resourceId } : null;
  }, [searchParams]);
  const resourceQuery = resourceIdentity ? canonicalIdentity(resourceIdentity) : '';
  const listQueryKey = JSON.stringify(toListQuery(query));
  const [refreshIdentity, setRefreshIdentity] = useState(0);
  const [searchDraft, setSearchDraft] = useState(query.search);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [list, setList] = useState<TaskList | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [listError, setListError] = useState<unknown>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listStale, setListStale] = useState(false);
  const [listFocusRecovery, setListFocusRecovery] = useState<ListFocusRecovery | null>(null);
  const [selected, setSelected] = useState<TaskSummary | null>(null);
  const [requestedIdentity, setRequestedIdentity] = useState<TaskIdentity | null>(null);
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<unknown>(null);
  const [detailStale, setDetailStale] = useState(false);
  const [modal, setModal] = useState<ActionIntent | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [recoveryError, setRecoveryError] = useState<unknown>(null);
  const [detailRefreshIdentity, setDetailRefreshIdentity] = useState(0);
  const listSequence = useRef(0); const listFocusToken = useRef(0); const detailSequence = useRef(0); const recoverySequence = useRef(0);
  const requestedIdentityRef = useRef<string | null>(null); const selectedIdentityRef = useRef<string | null>(null);
  const drawerRef = useRef<HTMLElement>(null); const drawerCloseRef = useRef<HTMLButtonElement>(null); const drawerTitleRef = useRef<HTMLHeadingElement>(null);
  const modalRef = useRef<HTMLDivElement>(null); const modalCloseRef = useRef<HTMLButtonElement>(null); const errorRef = useRef<HTMLDivElement>(null); const detailErrorRef = useRef<HTMLDivElement>(null); const listErrorRef = useRef<HTMLDivElement>(null); const pageTitleRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  requestedIdentityRef.current = requestedIdentity ? canonicalIdentity(requestedIdentity) : null;
  selectedIdentityRef.current = selected ? canonicalIdentity(selected) : null;

  const updateQuery = (patch: Partial<Query>) => {
    const next = { ...query, ...patch };
    const values: Record<string, string> = {};
    if (next.search) values.search = next.search;
    if (next.taskType) values.taskType = next.taskType;
    if (next.status) values.status = next.status;
    if (next.projectId) values.projectId = next.projectId;
    if (next.sortBy !== 'updatedAt') values.sortBy = next.sortBy;
    if (next.sortDirection !== 'desc') values.sortDirection = next.sortDirection;
    if (next.limit !== 20) values.limit = String(next.limit);
    if (next.offset) values.offset = String(next.offset);
    const resourceId = searchParams.get('resourceId');
    if (resourceId && patch.offset === undefined && patch.search === undefined && patch.status === undefined && patch.taskType === undefined && patch.projectId === undefined) values.resourceId = resourceId;
    setSearchParams(values);
  };

  useEffect(() => { setSearchDraft(query.search); }, [query.search]);
  useEffect(() => {
    let disposed = false;
    listProjects('').then((result) => { if (!disposed) setProjects(result.items.map((item) => ({ id: item.id, name: item.name }))); }).catch(() => undefined);
    return () => { disposed = true; };
  }, []);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController(); const sequence = ++listSequence.current;
    setListLoading(true); setListError(null); setListStale(Boolean(list));
    const summaryRequests = [
      listTasks(toListQuery(query, { status: 'waiting_review', limit: 1, offset: 0 }), controller.signal),
      listTasks(toListQuery(query, { status: 'stale', limit: 1, offset: 0 }), controller.signal),
      listTasks(toListQuery(query, { status: 'running', limit: 1, offset: 0 }), controller.signal),
      listTasks(toListQuery(query, { status: 'queued', limit: 1, offset: 0 }), controller.signal),
      listTasks(toListQuery(query, { status: 'failed', limit: 1, offset: 0 }), controller.signal),
      listTasks(toListQuery(query, { status: 'reconciliation_required', limit: 1, offset: 0 }), controller.signal),
    ];
    Promise.all([listTasks(toListQuery(query), controller.signal), ...summaryRequests])
      .then(([current, waiting, stale, running, queued, failed, reconciliation]) => {
        if (disposed || sequence !== listSequence.current || !current || !waiting || !stale || !running || !queued || !failed || !reconciliation) return;
        setList(current); setSummary({ attention: waiting.total + stale.total, running: running.total, queued: queued.total, failed: failed.total + reconciliation.total }); setListStale(false);
      })
      .catch((error) => { if (!disposed && sequence === listSequence.current && error?.name !== 'AbortError') { setListError(error); setListStale(Boolean(list)); } })
      .finally(() => { if (!disposed && sequence === listSequence.current) setListLoading(false); });
    return () => { disposed = true; controller.abort(); };
  // list is intentionally a snapshot here; the effect must not rerun for stale writes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.search, query.taskType, query.status, query.projectId, query.sortBy, query.sortDirection, query.limit, query.offset, refreshIdentity]);

  useEffect(() => {
    setSelected(null); setRequestedIdentity(null); setDetail(null); setDetailError(null); setDetailStale(false); setRecovery(null); setRecoveryError(null); setModal(null); setActionError(null); setListFocusRecovery(null);
  }, [query.search, query.taskType, query.status, query.projectId, query.sortBy, query.sortDirection, query.limit, query.offset, resourceQuery]);

  useEffect(() => {
    if (!resourceIdentity) return;
    setSelected(null); setRequestedIdentity(resourceIdentity); setDetail(null); setDetailError(null); setDetailStale(false); setRecovery(null); setRecoveryError(null); setModal(null); setActionError(null);
  }, [resourceQuery]);

  useEffect(() => {
    if (!requestedIdentity) return;
    const controller = new AbortController(); const sequence = ++detailSequence.current; const identity = canonicalIdentity(requestedIdentity);
    setDetailLoading(true); setDetailError(null); setDetailStale(Boolean(detail));
    getTask(requestedIdentity.taskType, requestedIdentity.resourceId, controller.signal).then((value) => {
      if (controller.signal.aborted || sequence !== detailSequence.current || requestedIdentityRef.current !== identity) return;
      setDetail(value); setDetailStale(false); setSelected(value.summary);
    }).catch((error) => { if (!controller.signal.aborted && sequence === detailSequence.current && requestedIdentityRef.current === identity) { setDetailError(error); setDetailStale(Boolean(detail)); } }).finally(() => { if (!controller.signal.aborted && sequence === detailSequence.current && requestedIdentityRef.current === identity) setDetailLoading(false); });
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedIdentity?.taskType, requestedIdentity?.resourceId, detailRefreshIdentity]);

  useLayoutEffect(() => { if (actionError !== null) return; if (selected && detail && !detailLoading && !detailError) drawerTitleRef.current?.focus(); }, [selected, detail, detailLoading, detailError, actionError]);
  useLayoutEffect(() => { if (modal) (actionPending ? modalRef.current : modalCloseRef.current)?.focus(); }, [modal, actionPending]);
  useLayoutEffect(() => { if (actionError !== null) errorRef.current?.focus(); }, [actionError, modal]);
  useLayoutEffect(() => { if (detailError !== null) detailErrorRef.current?.focus(); }, [detailError]);
  useLayoutEffect(() => {
    const intent = listFocusRecovery;
    if (!intent) return;
    if (intent.queryKey !== listQueryKey) { setListFocusRecovery(null); return; }
    if (listLoading) return;
    if (listError !== null) { listErrorRef.current?.focus(); return; }
    if (!list) return;
    setListFocusRecovery(null);
    pageTitleRef.current?.focus();
  }, [list, listError, listFocusRecovery, listLoading, listQueryKey]);

  const openDetail = (task: TaskSummary, action?: 'cancel' | 'recover') => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(task); setRequestedIdentity({ taskType: task.taskType, resourceId: task.resourceId }); setDetail(null); setDetailError(null); setDetailStale(false); setRecovery(null); setRecoveryError(null); setActionError(null);
    if (action) setModal({ action, task, key: idempotencyKey() });
  };
  const clearResourceQuery = () => {
    if (!searchParams.get('resourceId')) return;
    const values = Object.fromEntries(searchParams.entries());
    delete values.resourceId;
    setSearchParams(values);
  };
  const closeDrawer = () => { if (actionPending || recoveryPending) return; setSelected(null); setRequestedIdentity(null); setDetail(null); setDetailError(null); setRecovery(null); setRecoveryError(null); setModal(null); clearResourceQuery(); triggerRef.current?.focus(); };
  const openWorkspace = (task: TaskSummary) => { if (task.returnPath) navigate(task.returnPath); };
  const runDomainAction = async (intent: ActionIntent) => {
    if (intent.task.taskType === 'asr_dispatch') return cancelAsrDispatchGroup(intent.task.resourceId, intent.key);
    if (!intent.task.projectId) throw new TaskActionError('当前任务缺少项目范围，无法执行该动作。');
    if (intent.task.taskType === 'asr_batch') return cancelAsrBatch(intent.task.projectId, intent.task.resourceId, intent.key);
    if (intent.task.taskType === 'screen_text_batch') return cancelScreenTextBatch(intent.task.projectId, intent.task.resourceId, intent.key);
    if (intent.task.taskType === 'delivery_generation') return recoverDelivery(intent.task.projectId, intent.task.resourceId, {}, intent.key);
    throw new TaskActionError('该任务只能回到所属工作台继续处理。');
  };
  const refreshFacts = async (task: TaskSummary) => {
    const identity = canonicalIdentity(task);
    const [freshList, freshDetail] = await Promise.all([
      listTasks(toListQuery(query)),
      getTask(task.taskType, task.resourceId),
    ]);
    if (selectedIdentityRef.current !== identity || requestedIdentityRef.current !== identity) return;
    setList(freshList); setDetail(freshDetail); setSelected(freshDetail.summary); setListStale(false); setDetailStale(false);
  };
  const submitAction = async () => {
    if (!modal || actionPending) return;
    const intent = modal; setActionPending(true); setActionError(null);
    const identity = canonicalIdentity(intent.task);
    try { await runDomainAction(intent); setModal(null); await refreshFacts(intent.task); }
    catch (error) {
      if (selectedIdentityRef.current !== identity || requestedIdentityRef.current !== identity) return;
      if (isRetryable(error)) { setModal(null); setRecovery({ action: intent.action, task: intent.task, key: intent.key, requestId: requestIdOf(error), message: messageOf(error) }); setRecoveryError(null); }
      else { setModal(null); setActionError(error); try { await refreshFacts(intent.task); } catch { /* 保留确定性冲突本身，避免叠加第二错误块。 */ } }
    } finally { setActionPending(false); }
  };
  const recoverAction = async () => {
    if (!recovery || recoveryPending || !selected) return;
    const current = recovery; const sequence = ++recoverySequence.current; setRecoveryPending(true); setRecoveryError(null);
    const identity = canonicalIdentity(current.task);
    try {
      const fresh = await getTask(current.task.taskType, current.task.resourceId);
      if (sequence !== recoverySequence.current || selectedIdentityRef.current !== identity || requestedIdentityRef.current !== identity) return;
      setDetail(fresh); setSelected(fresh.summary); setRecovery(null); await refreshFacts(fresh.summary);
    } catch (error) { if (sequence === recoverySequence.current && selectedIdentityRef.current === identity && requestedIdentityRef.current === identity) { setRecovery({ ...current, requestId: requestIdOf(error), message: messageOf(error) }); setRecoveryError(error); } }
    finally { if (sequence === recoverySequence.current) setRecoveryPending(false); }
  };

  const refreshCurrentQuery = () => setRefreshIdentity((value) => value + 1);
  const retryListFromError = () => { setListFocusRecovery({ queryKey: listQueryKey, token: ++listFocusToken.current }); refreshCurrentQuery(); };
  const total = list?.total ?? 0; const page = Math.floor((query.offset) / query.limit) + 1; const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const listBusy = listLoading && !list;
  const drawerIdentity = requestedIdentity ?? (selected ? { taskType: selected.taskType, resourceId: selected.resourceId } : null);
  const drawerTitle = selected?.name ?? (drawerIdentity ? `${taskTypeLabels[drawerIdentity.taskType]}任务详情` : '任务详情');
  return <div className={styles.page}>
    <header className={styles.header}><div><h1 ref={pageTitleRef} tabIndex={-1}>统一任务中心</h1><p>汇总员工可见的识别、审改与交付任务，状态与进度均来自服务端。</p></div><button className={styles.refreshButton} type="button" onClick={refreshCurrentQuery} disabled={listLoading}>重新读取</button></header>
    <section className={styles.summaryGrid} aria-label="任务摘要">
      <SummaryCard label="需处理" value={summary?.attention} hint="待处理与已过期" />
      <SummaryCard label="运行中" value={summary?.running} hint="服务端执行中" />
      <SummaryCard label="排队" value={summary?.queued} hint="等待执行" />
      <SummaryCard label="失败/待对账" value={summary?.failed} hint="需要回到工作台" />
    </section>
    <form className={styles.toolbar} onSubmit={(event) => { event.preventDefault(); updateQuery({ search: searchDraft.trim(), offset: 0 }); }}>
      <div className={`${styles.field} ${styles.searchField}`}><label htmlFor="task-search">搜索任务、项目或短标识</label><input id="task-search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="输入关键词" /></div>
      <div className={styles.field}><label htmlFor="task-type">任务类型</label><select id="task-type" value={query.taskType} onChange={(event) => updateQuery({ taskType: event.target.value as TaskType | '', offset: 0 })}><option value="">全部类型</option>{taskTypes.map((type) => <option key={type} value={type}>{taskTypeLabels[type]}</option>)}</select></div>
      <div className={styles.field}><label htmlFor="task-status">状态</label><select id="task-status" value={query.status} onChange={(event) => updateQuery({ status: event.target.value as TaskStatus | '', offset: 0 })}><option value="">全部状态</option>{taskStatuses.map((status) => <option key={status} value={status}>{taskStatusLabels[status]}</option>)}</select></div>
      <div className={styles.field}><label htmlFor="task-project">项目</label><select id="task-project" value={query.projectId} onChange={(event) => updateQuery({ projectId: event.target.value, offset: 0 })}><option value="">全部项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
      <div className={styles.field}><label htmlFor="task-sort">排序</label><select id="task-sort" value={`${query.sortBy}:${query.sortDirection}`} onChange={(event) => { const [sortBy, sortDirection] = event.target.value.split(':') as [Query['sortBy'], Query['sortDirection']]; updateQuery({ sortBy, sortDirection, offset: 0 }); }}><option value="attentionPriority:asc">需处理优先</option><option value="updatedAt:desc">最近更新</option><option value="createdAt:desc">最近创建</option></select></div>
    </form>
    <section className={styles.tableCard} aria-label="任务列表">
      {listError !== null && <ErrorBlock title={listStale ? '任务中心读取失败，已保留上次结果' : '任务中心读取失败'} error={listError} stale={listStale} errorRef={listErrorRef} onRetry={retryListFromError} />}
      {listBusy && <div className={styles.loading}><strong>正在读取任务中心</strong><span>正在核对服务端摘要与当前范围。</span></div>}
      {!listBusy && !listError && list && list.items.length === 0 && <div className={styles.empty}><strong>当前范围没有任务</strong><span>调整筛选条件后重新读取。</span></div>}
      {list && list.items.length > 0 && <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>任务</th><th>项目</th><th>状态</th><th>进度</th><th>问题</th><th>最近更新</th><th>操作</th></tr></thead><tbody>{list.items.map((task) => <TaskRow key={`${task.taskType}:${task.resourceId}`} task={task} locked={listStale || listLoading} onOpen={() => openDetail(task)} onAction={(action) => openDetail(task, action)} onWorkspace={() => openWorkspace(task)} />)}</tbody></table></div>}
      {list && <footer className={styles.pagination}><span>共 {total} 项 · 第 {page}/{pageCount} 页</span><button className={styles.secondaryButton} type="button" disabled={query.offset === 0 || listLoading} onClick={() => updateQuery({ offset: Math.max(0, query.offset - query.limit) })}>上一页</button><button className={styles.secondaryButton} type="button" disabled={page >= pageCount || listLoading} onClick={() => updateQuery({ offset: query.offset + query.limit })}>下一页</button></footer>}
    </section>
    {drawerIdentity && <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) { event.preventDefault(); event.stopPropagation(); closeDrawer(); } }}><aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="task-detail-title" tabIndex={-1} ref={drawerRef} onKeyDown={(event) => { trapDrawer(event, drawerRef.current, drawerTitleRef.current); if (event.key === 'Escape' && !actionPending && !recoveryPending) { event.preventDefault(); closeDrawer(); } }}>
      <header className={styles.drawerHeader}><div><span className={styles.eyebrow}>任务详情</span><h2 id="task-detail-title" ref={drawerTitleRef} tabIndex={-1}>{drawerTitle}</h2><span className={styles.nameCell}>{selected?.shortId ?? drawerIdentity.resourceId}</span></div><button ref={drawerCloseRef} className={styles.closeButton} type="button" onClick={closeDrawer} disabled={actionPending || recoveryPending}>关闭详情</button></header>
      {actionError !== null && <ErrorBlock title="操作未完成，权威事实已刷新" error={actionError} errorRef={errorRef} />}
      {recovery && <div className={styles.recovery} role="alert"><strong>{recovery.action === 'recover' ? '交付恢复结果待确认' : '取消结果待确认'}</strong><span>{recovery.message} 创建/命令请求只发送了 1 次，请查询同一任务。</span>{recovery.requestId && <span>请求标识：{recovery.requestId}</span>}<button className={styles.secondaryButton} type="button" onClick={recoverAction} disabled={recoveryPending}>{recoveryPending ? '正在查询本次结果…' : recovery.action === 'recover' ? '查询本次交付恢复结果' : '查询本次取消结果'}</button></div>}
      {detailError !== null && <ErrorBlock title={detailStale ? '详情读取失败，已保留上次结果' : '详情读取失败'} error={detailError} stale={detailStale} errorRef={detailErrorRef} onRetry={() => { setDetailError(null); setDetailRefreshIdentity((value) => value + 1); }} />}
      {detailLoading && !detail && <div className={styles.loading}><strong>正在读取详情</strong><span>正在核对同一任务身份。</span></div>}
      {detail && <><div className={styles.detailSummary}><Metric label="类型" value={taskTypeLabels[detail.summary.taskType]} /><Metric label="状态" value={<Status status={detail.summary.status} />} /><Metric label="项目" value={detail.summary.projectName ?? (detail.summary.projectNames.length ? detail.summary.projectNames.join('、') : '多项目范围')} /><Metric label="进度" value={formatProgress(detail.summary.progress.completedCount, detail.summary.progress.totalCount, detail.summary.progress.phase)} /></div><div className={styles.actionGroup}>{detail.summary.availableActions.map((action) => action === 'open_workspace' ? <button key={action} className={styles.secondaryButton} type="button" onClick={() => openWorkspace(detail.summary)}>{actionLabels[action]}</button> : action === 'cancel' || action === 'recover' ? <button key={action} className={action === 'recover' ? styles.dangerButton : styles.secondaryButton} type="button" disabled={detailStale || detailLoading} onClick={() => { setModal({ action, task: detail.summary, key: idempotencyKey() }); setActionError(null); }}>{actionLabels[action]}</button> : null)}</div>{detail.summary.error && <div className={styles.modalError} role="alert"><strong>任务提示</strong><span>{detail.summary.error.reason}</span>{detail.summary.error.requestId && <span>请求标识：{detail.summary.error.requestId}</span>}</div>}<DetailSections detail={detail} /></>}
    </aside></div>}
    {modal && <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !actionPending) { setModal(null); setActionError(null); } }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="task-action-title" tabIndex={-1} ref={modalRef} onKeyDown={(event) => { trap(event, modalRef.current); if (event.key === 'Escape' && !actionPending) { event.preventDefault(); setModal(null); setActionError(null); } }}><button ref={modalCloseRef} className={styles.closeButton} type="button" onClick={() => { setModal(null); setActionError(null); }} disabled={actionPending}>安全返回</button><h2 id="task-action-title">确认{actionLabels[modal.action]}</h2><p>将对“{modal.task.name}”执行{actionLabels[modal.action]}。请求身份会固定，网络未知时只查询同一任务，不会重复提交。</p>{actionError !== null && <div className={styles.modalError} role="alert" tabIndex={-1} ref={errorRef}><strong>操作未完成</strong><span>{messageOf(actionError)}</span>{requestIdOf(actionError) && <span>请求标识：{requestIdOf(actionError)}</span>}</div>}<div className={styles.modalActions}><button className={styles.secondaryButton} type="button" onClick={() => { setModal(null); setActionError(null); }} disabled={actionPending}>取消</button><button className={modal.action === 'recover' ? styles.dangerButton : styles.primaryButton} type="button" onClick={submitAction} disabled={actionPending}>{actionPending ? '提交中…' : `确认${actionLabels[modal.action]}`}</button></div></section></div>}
  </div>;
};

const SummaryCard = ({ label, value, hint }: { label: string; value: number | undefined; hint: string }) => <article className={styles.summaryCard}><span>{label}</span><strong>{value === undefined ? '—' : value}</strong><small>{hint}</small></article>;
const Metric = ({ label, value }: { label: string; value: ReactNode }) => <div className={styles.detailMetric}><span>{label}</span><strong>{value}</strong></div>;
const TaskRow = ({ task, locked, onOpen, onAction, onWorkspace }: { task: TaskSummary; locked: boolean; onOpen: () => void; onAction: (action: 'cancel' | 'recover') => void; onWorkspace: () => void }) => <tr onClick={onOpen}><td className={styles.nameCell}><strong>{task.name}</strong><span>{task.shortId}</span></td><td className={styles.projectCell}>{task.projectName ?? (task.projectNames.length ? task.projectNames.join('、') : '多项目')}</td><td><Status status={task.status} /></td><td>{formatProgress(task.progress.completedCount, task.progress.totalCount, task.progress.phase)}</td><td>{task.error ? <span>{task.error.reason}</span> : '—'}</td><td className={styles.timeCell}>{formatDate(task.updatedAt)}</td><td><div className={styles.actionGroup} onClick={(event) => event.stopPropagation()}>{task.availableActions.map((action) => action === 'open_workspace' ? <button className={styles.linkButton} key={action} type="button" onClick={onWorkspace}>{actionLabels[action]}</button> : action === 'cancel' || action === 'recover' ? <button className={styles.linkButton} key={action} type="button" disabled={locked} onClick={() => onAction(action)}>{actionLabels[action]}</button> : null)}<button className={styles.linkButton} type="button" onClick={onOpen}>查看详情</button></div></td></tr>;
const DetailSections = ({ detail }: { detail: TaskDetail }) => <><section className={styles.section}><h3>执行历史</h3>{detail.history.length ? detail.history.map((entry) => <article className={styles.historyItem} key={`${entry.kind}:${entry.resourceId}:${entry.updatedAt}`}><div className={styles.historyMeta}><span>{entry.kind === 'attempt' ? '执行尝试' : entry.kind === 'job' ? '任务作业' : entry.kind === 'run' ? '运行记录' : '子任务'}</span><span>{formatDate(entry.updatedAt)}</span></div><p><Status status={entry.status} /> {entry.error?.reason ?? '服务端已记录该状态。'}{entry.requestId && ` 请求标识：${entry.requestId}`}</p></article>) : <p>暂无历史记录。</p>}</section>{detail.dispatchResults.length > 0 && <section className={styles.section}><h3>多项目子结果</h3>{detail.dispatchResults.map((result) => <article className={styles.dispatchItem} key={`${result.projectId}:${result.selectionOrder}`}><div className={styles.historyMeta}><span>{result.projectName ?? '项目'}</span><span>{result.acceptanceStatus === 'accepted' ? '已接受' : result.acceptanceStatus === 'blocked' ? '已阻断' : result.acceptanceStatus === 'ready' ? '可执行' : '待处理'}</span></div><p>{result.executionStatus ? <Status status={result.executionStatus} /> : '尚未生成批次'}{result.error?.reason ? ` ${result.error.reason}` : ''}</p></article>)}</section>}</>;
