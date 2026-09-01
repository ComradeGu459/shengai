import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { FeedbackEventAction, FeedbackListItem, FeedbackListQuery, FeedbackReportDetail, FeedbackStatus } from '@qimao-terms-cloud/contracts';
import { addFeedbackEvent, FeedbackApiError, getFeedback, getFeedbackEvent, listFeedback, listFeedbackEvents, readFeedbackScreenshot } from './feedbackApi.js';
import { EmptyBlock, ErrorBlock, Field, LoadingBlock, Modal, formatDate, useAsyncRead } from './controlPrimitives.js';
import { ReadOnlyDrawer } from './runtimeCommon.js';

const KIND_LABELS: Record<string, string> = { no_response: '没有反应', display_incorrect: '显示不正确', state_incorrect: '状态不正确', slow: '操作缓慢', unclear_next_step: '不清楚下一步', suggestion: '改进建议' };
const STATUS_LABELS: Record<FeedbackStatus, string> = { new: '待确认', confirmed: '已确认', fixing: '处理中', retest: '待复测', closed: '已关闭' };
const SURFACE_LABELS: Record<string, string> = { employee: '员工站', system_control: '管理控制台' };
const ACTION_LABELS: Record<string, string> = { created: '创建反馈', confirmed: '确认反馈', fixing_started: '开始处理', retest_requested: '请求复测', closed: '关闭反馈', reopened: '重新打开' };
const nextActions: Record<FeedbackStatus, Array<{ action: FeedbackEventAction; label: string }>> = {
  new: [{ action: 'confirmed', label: '确认反馈' }],
  confirmed: [{ action: 'fixing_started', label: '开始处理' }],
  fixing: [{ action: 'retest_requested', label: '请求复测' }],
  retest: [{ action: 'closed', label: '关闭反馈' }],
  closed: [{ action: 'reopened', label: '重新打开' }],
};
const makeId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const errText = (error: unknown) => error instanceof FeedbackApiError ? `${error.message}${error.requestId ? ` · requestId: ${error.requestId}` : ''}` : '网络请求结果未知';
const retryable = (error: unknown) => error instanceof FeedbackApiError ? error.retryable || error.status === 0 || error.status >= 500 : true;
const FeedbackStatusBadge = ({ value }: { value: FeedbackStatus }) => <span className={`cp-badge cp-${value}`}><i />{STATUS_LABELS[value]}</span>;

type Combined = { list: Awaited<ReturnType<typeof listFeedback>>; summary: Record<string, number | null>; processingTotal: number | null };

export const FeedbackPage = () => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const projectErrorRef = useRef<HTMLDivElement>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [surface, setSurface] = useState<FeedbackListQuery['surface']>();
  const [kind, setKind] = useState<FeedbackListQuery['kind']>();
  const [status, setStatus] = useState<FeedbackListQuery['status']>();
  const [projectDraft, setProjectDraft] = useState(''); const [projectId, setProjectId] = useState(''); const [projectError, setProjectError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<NonNullable<FeedbackListQuery['sort']>>('attention');
  const [sortDirection, setSortDirection] = useState<NonNullable<FeedbackListQuery['sortDirection']>>('desc');
  const [offset, setOffset] = useState(0);
  const [eventsOffset, setEventsOffset] = useState(0);
  const [reportsRefreshVersion, setReportsRefreshVersion] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listReadFocus, setListReadFocus] = useState<{ identity: string; intent: 'error-retry' } | null>(null);
  const [eventModal, setEventModal] = useState<{ action: FeedbackEventAction; label: string } | null>(null);
  const [eventNote, setEventNote] = useState('');
  const [eventPending, setEventPending] = useState(false);
  const [eventError, setEventError] = useState<unknown>(null);
  const [eventRecovery, setEventRecovery] = useState<{ eventId: string; feedbackId: string; requestId?: string | null } | null>(null);
  const [drawerFocusRequest, setDrawerFocusRequest] = useState(0);
  const selectedIdRef = useRef<string | null>(selectedId);
  selectedIdRef.current = selectedId;
  const eventRecoveryRef = useRef<typeof eventRecovery>(eventRecovery);
  eventRecoveryRef.current = eventRecovery;
  const eventRecoveryButtonRef = useRef<HTMLButtonElement>(null);
  const eventErrorOwnsFocusRef = useRef(false);
  const eventRecoveryOwnsFocusRef = useRef(false);
  const query = useMemo<FeedbackListQuery>(() => ({ ...(search ? { search } : {}), ...(surface ? { surface } : {}), ...(kind ? { kind } : {}), ...(status ? { status } : {}), ...(projectId ? { projectId } : {}), ...(fromDate ? { from: new Date(`${fromDate}T00:00:00`).toISOString() } : {}), ...(toDate ? { to: new Date(`${toDate}T23:59:59`).toISOString() } : {}), sort, sortDirection, limit: '20', offset: String(offset) }), [search, surface, kind, status, projectId, fromDate, toDate, sort, sortDirection, offset]);
  const queryKey = JSON.stringify(query);
  const queryIdentity = JSON.stringify({ ...query, offset: '0' });
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;
  const listReadFocusRef = useRef(listReadFocus);
  listReadFocusRef.current = listReadFocus;
  const reports = useAsyncRead<Combined>(async (signal) => {
    const list = await listFeedback(query, signal);
    const statuses: FeedbackStatus[] = ['new', 'confirmed', 'fixing', 'retest', 'closed'];
    const summary: Record<string, number | null> = Object.fromEntries(statuses.map((item) => [item, null]));
    if (status) {
      statuses.forEach((item) => { summary[item] = 0; });
      const total = list.total;
      if (status === 'confirmed' || status === 'fixing') return { list, summary, processingTotal: total };
      summary[status] = total;
      return { list, summary, processingTotal: 0 };
    }
    const cards = await Promise.all(statuses.map((item) => listFeedback({ ...query, status: item, limit: '1', offset: '0' }, signal).then((value) => value.total).catch(() => null)));
    statuses.forEach((item, index) => { summary[item] = cards[index] as number | null; });
    const processingTotal = summary.confirmed === null || summary.fixing === null ? null : (summary.confirmed ?? 0) + (summary.fixing ?? 0);
    return { list, summary, processingTotal };
  }, [queryKey, reportsRefreshVersion], { identity: queryKey });
  const detail = useAsyncRead<FeedbackReportDetail | null>((signal) => selectedId ? getFeedback(selectedId, signal) : Promise.resolve(null), [selectedId, refreshVersion], { identity: selectedId ?? '__none__' });
  const events = useAsyncRead<Awaited<ReturnType<typeof listFeedbackEvents>> | null>((signal) => selectedId ? listFeedbackEvents(selectedId, eventsOffset, signal) : Promise.resolve(null), [selectedId, refreshVersion, eventsOffset], { identity: `${selectedId ?? '__none__'}:${eventsOffset}` });
  useLayoutEffect(() => { if (projectError) projectErrorRef.current?.focus(); }, [projectError]);
  useEffect(() => { setSelectedId(null); setOffset(0); setEventsOffset(0); setEventRecovery(null); setEventModal(null); setListReadFocus(null); }, [queryIdentity]);
  useEffect(() => { setListReadFocus(null); }, [queryKey]);
  useEffect(() => { setEventsOffset(0); setEventRecovery(null); setEventError(null); setDrawerFocusRequest(0); }, [selectedId]);
  const refreshAll = () => { setReportsRefreshVersion((value) => value + 1); setRefreshVersion((value) => value + 1); };
  const refreshReports = () => { setListReadFocus(null); refreshAll(); };
  const retryReports = () => {
    const identity = queryKey;
    setListReadFocus({ identity, intent: 'error-retry' });
    reports.reload(() => {
      if (queryKeyRef.current !== identity || listReadFocusRef.current?.identity !== identity) return;
      titleRef.current?.focus();
      setListReadFocus(null);
    });
  };
  const changeEventsPage = (nextOffset: number) => { setDrawerFocusRequest((value) => value + 1); setEventsOffset(nextOffset); };
  const submitQuery = (event: FormEvent) => {
    event.preventDefault(); const candidate = projectDraft.trim();
    if (candidate && !uuidPattern.test(candidate)) { setProjectError('项目编号格式不正确，请输入合法项目编号或留空。'); return; }
    setProjectError(null); setOffset(0); setSearch(searchDraft.trim()); setProjectId(candidate);
  };
  const openEvent = (action: FeedbackEventAction, label: string) => { eventErrorOwnsFocusRef.current = false; eventRecoveryOwnsFocusRef.current = false; setEventError(null); setEventRecovery(null); setEventNote(''); setEventModal({ action, label }); };
  const submitEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || !eventModal || eventPending) return;
    const eventId = makeId(); setEventPending(true); setEventError(null); setEventRecovery(null);
    const feedbackId = selectedId;
    try { await addFeedbackEvent(feedbackId, { feedbackEventId: eventId, action: eventModal.action, ...(eventNote.trim() ? { note: eventNote.trim() } : {}) }, makeId()); if (selectedIdRef.current !== feedbackId) return; setEventModal(null); refreshAll(); setDrawerFocusRequest((value) => value + 1); }
    catch (caught) { if (retryable(caught)) { eventRecoveryOwnsFocusRef.current = true; setEventRecovery({ eventId, feedbackId: selectedId, requestId: caught instanceof FeedbackApiError ? caught.requestId : null }); setEventModal(null); } else { eventErrorOwnsFocusRef.current = true; setEventError(caught); setEventModal(null); refreshAll(); } }
    finally { setEventPending(false); }
  };
  const recoverEvent = async () => {
    if (!eventRecovery || eventPending) return;
    setEventPending(true); setEventError(null);
    const intent = eventRecovery;
    try { await getFeedbackEvent(intent.eventId); if (selectedIdRef.current !== intent.feedbackId || eventRecoveryRef.current?.eventId !== intent.eventId) return; setEventRecovery(null); refreshAll(); setDrawerFocusRequest((value) => value + 1); }
    catch (caught) { setEventRecovery((current) => { if (!current) return current; const requestId = caught instanceof FeedbackApiError ? caught.requestId : current.requestId; return requestId === undefined ? current : { ...current, requestId }; }); }
    finally { setEventPending(false); }
  };
  const report = detail.data?.report;
  const writesLocked = Boolean(reports.error || detail.error || detail.refreshing || events.error || eventPending || eventRecovery);
  const summaryValue = (value: number | null | undefined) => reports.data ? value === null ? '未知' : String(value ?? 0) : '—';
  const processingSummary = reports.data ? reports.data.processingTotal === null ? '未知' : String(reports.data.processingTotal) : '—';
  return <div className="cp-page feedback-page" data-testid="feedback-page"><header className="cp-page-head"><div><h1 ref={titleRef} tabIndex={-1}>反馈问题</h1><p>查询员工与控制台反馈，按服务端事实推进确认、处理、复测与关闭。</p></div><button className="cp-primary" type="button" onClick={refreshReports} disabled={reports.refreshing}>重新读取</button></header>
    <section className="cp-summary feedback-summary" aria-label="反馈摘要"><div><span>待确认</span><strong>{summaryValue(reports.data?.summary.new)}</strong></div><div><span>处理中</span><strong>{processingSummary}</strong></div><div><span>待复测</span><strong>{summaryValue(reports.data?.summary.retest)}</strong></div><div><span>最近关闭</span><strong>{summaryValue(reports.data?.summary.closed)}</strong></div></section>
    {reports.error ? <ErrorBlock error={reports.error} stale={Boolean(reports.data)} onRetry={retryReports} busy={reports.refreshing} focusOnMount={Boolean(listReadFocus?.intent === 'error-retry' && listReadFocus.identity === queryKey) || !reports.data} title="无法读取反馈列表" /> : null}
    <section className="cp-panel"><form className="cp-toolbar" onSubmit={submitQuery}><input aria-label="搜索反馈" placeholder="反馈编号、描述或页面" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} /><input aria-label="项目编号" placeholder="项目编号（可选）" value={projectDraft} onChange={(event) => { setProjectDraft(event.target.value); if (projectError) setProjectError(null); }} /><select aria-label="反馈来源" value={surface ?? ''} onChange={(event) => { setSurface((event.target.value || undefined) as FeedbackListQuery['surface']); setOffset(0); }}><option value="">全部来源</option><option value="employee">员工站</option><option value="system_control">管理控制台</option></select><select aria-label="反馈类型" value={kind ?? ''} onChange={(event) => { setKind((event.target.value || undefined) as FeedbackListQuery['kind']); setOffset(0); }}><option value="">全部类型</option>{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="反馈状态" value={status ?? ''} onChange={(event) => { setStatus((event.target.value || undefined) as FeedbackListQuery['status']); setOffset(0); }}><option value="">全部状态</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><label className="cp-inline-field"><span>从</span><input aria-label="开始日期" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label className="cp-inline-field"><span>至</span><input aria-label="结束日期" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><select aria-label="反馈排序" value={sort} onChange={(event) => setSort(event.target.value as NonNullable<FeedbackListQuery['sort']>)}><option value="attention">关注度</option><option value="updatedAt">最近更新</option><option value="createdAt">创建时间</option></select><select aria-label="排序方向" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as NonNullable<FeedbackListQuery['sortDirection']>)}><option value="desc">从新到旧</option><option value="asc">从旧到新</option></select><button className="cp-secondary" type="submit">查询</button></form>{projectError ? <div ref={projectErrorRef} className="cp-state cp-error" role="alert" aria-label="项目筛选无法提交" tabIndex={-1}><strong>项目筛选无法提交</strong><span>{projectError}</span></div> : null}
      {reports.loading && !reports.data ? <LoadingBlock label="正在读取反馈列表…" /> : reports.data?.list.items.length ? <><div className="cp-table-wrap feedback-table-wrap"><table className="cp-table"><thead><tr><th>反馈</th><th>页面区域</th><th>类型</th><th>项目</th><th>状态</th><th>最近事件</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{reports.data!.list.items.map((item: FeedbackListItem) => <tr key={item.feedbackId}><td><strong>{item.feedbackId.slice(0, 8)}…</strong><span className="feedback-description">{item.description}</span></td><td>{item.routeTemplate}</td><td>{KIND_LABELS[item.kind] ?? '其他问题'}</td><td>{item.projectId ? `${item.projectId.slice(0, 8)}…` : '未关联项目'}</td><td><FeedbackStatusBadge value={item.status} /></td><td>{item.latestEvent ? `${ACTION_LABELS[item.latestEvent.action] ?? '状态更新'} · ${formatDate(item.latestEvent.createdAt)}` : '暂无事件'}</td><td>{formatDate(item.updatedAt)}</td><td><button className="cp-link" type="button" onClick={(event) => { event.currentTarget.focus(); setSelectedId(item.feedbackId); }}>查看详情</button></td></tr>)}</tbody></table></div><div className="cp-pagination"><span>服务端共 {reports.data!.list.total} 条</span><button className="cp-secondary" type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>上一页</button><button className="cp-secondary" type="button" disabled={offset + reports.data!.list.limit >= reports.data!.list.total} onClick={() => setOffset(offset + reports.data!.list.limit)}>下一页</button></div></> : reports.data ? <EmptyBlock title="当前筛选条件下暂无反馈" detail={`服务端 total=${reports.data.list.total}，没有匿名样例。`} /> : null}
    </section>
    {selectedId ? <ReadOnlyDrawer focusRequest={drawerFocusRequest} title={report ? `反馈详情 · ${KIND_LABELS[report.kind] ?? '问题'}` : '反馈详情'} kicker="反馈问题 · 服务端历史" onClose={() => setSelectedId(null)}>{eventError && !eventModal ? <ErrorBlock error={eventError} showRetry={false} focusOnMount title="状态操作未完成" /> : null}{eventRecovery ? <div className="cp-state cp-warning" role="alert"><strong>状态操作结果未知</strong><span>{eventRecovery.requestId ? `requestId: ${eventRecovery.requestId} · ` : ''}未重发原操作，请查询同一反馈事件。</span><button ref={(node) => { eventRecoveryButtonRef.current = node; if (node && !eventPending) node.focus(); }} className="cp-primary" type="button" onClick={recoverEvent} disabled={eventPending}>{eventPending ? '查询中…' : '查询本次状态操作'}</button></div> : null}{detail.error ? <ErrorBlock error={detail.error} stale={Boolean(detail.data)} onRetry={() => detail.reload()} busy={detail.refreshing} focusOnMount title="无法读取反馈详情" /> : detail.loading && !detail.data ? <LoadingBlock label="正在读取反馈详情…" /> : report ? <><section className="runtime-detail-section"><h3>问题描述</h3><p className="feedback-detail-description">{report.description}</p></section><dl className="runtime-detail-grid"><div><dt>当前状态</dt><dd><FeedbackStatusBadge value={report.status} /></dd></div><div><dt>来源</dt><dd>{SURFACE_LABELS[report.surface] ?? '未知来源'}</dd></div><div><dt>路由</dt><dd>{report.routeTemplate}</dd></div><div><dt>项目</dt><dd>{report.projectId ? `${report.projectId.slice(0, 8)}…` : '未关联项目'}</dd></div><div><dt>创建时间</dt><dd>{formatDate(report.createdAt)}</dd></div><div><dt>反馈请求</dt><dd>{report.requestIds.length ? report.requestIds.join('、') : '暂无安全 requestId'}</dd></div></dl><section className="runtime-detail-section"><h3>安全上下文</h3><dl className="runtime-definition"><div><dt>浏览器</dt><dd>{report.browserSummary.family} {report.browserSummary.version}</dd></div><div><dt>窗口 / 时区</dt><dd>{report.viewport.width} × {report.viewport.height} · {report.timezone}</dd></div><div><dt>任务身份</dt><dd>{report.taskType && report.resourceId ? `${report.taskType} · ${report.resourceId.slice(0, 8)}…` : '未关联任务'}</dd></div></dl></section>{detail.data!.attachment ? <Screenshot feedbackId={report.feedbackId} attachment={detail.data!.attachment} /> : null}<section className="runtime-detail-section"><div className="runtime-section-head"><div><h3>状态流转</h3><p>历史事件只追加，不覆盖既有记录。</p></div><div className="cp-row-actions">{nextActions[report.status].map((item) => <button key={item.action} className="cp-primary" type="button" disabled={writesLocked} onClick={() => openEvent(item.action, item.label)}>{item.label}</button>)}</div></div>{events.error ? <ErrorBlock error={events.error} onRetry={() => events.reload()} busy={events.refreshing} focusOnMount title="无法读取事件历史" /> : events.loading && !events.data ? <LoadingBlock label="正在读取事件历史…" /> : events.data?.items.length ? <><ul className="feedback-events">{events.data.items.map((item) => <li key={item.feedbackEventId}><strong>{ACTION_LABELS[item.action] ?? '状态更新'}</strong><span>{STATUS_LABELS[item.toStatus]} · {formatDate(item.createdAt)} · {item.actorSubject}</span><small>requestId: {item.requestId}</small></li>)}</ul><div className="cp-pagination"><button className="cp-secondary" type="button" disabled={eventsOffset === 0} onClick={() => changeEventsPage(Math.max(0, eventsOffset - 20))}>上一页</button><button className="cp-secondary" type="button" disabled={eventsOffset + events.data.limit >= events.data.total} onClick={() => changeEventsPage(eventsOffset + events.data!.limit)}>下一页</button></div></> : <EmptyBlock title="暂无状态事件" detail="服务端尚未返回可见事件。" />}</section></> : null}</ReadOnlyDrawer> : null}
    {eventModal ? <Modal title={eventModal.label} onClose={() => { if (!eventPending) { setEventModal(null); setEventError(null); } }} busy={eventPending} onSubmit={submitEvent} submitLabel="确认操作" onUnmountFocus={(trigger) => { if (eventErrorOwnsFocusRef.current || eventRecoveryOwnsFocusRef.current) { eventErrorOwnsFocusRef.current = false; eventRecoveryOwnsFocusRef.current = false; return; } trigger?.focus(); }}><p>该状态变化会写入不可变历史，提交后仅按服务端事实刷新。</p><Field label="备注（可选）"><textarea value={eventNote} onChange={(event) => setEventNote(event.target.value)} maxLength={1000} disabled={eventPending} /></Field>{eventError ? <ErrorBlock error={eventError} showRetry={false} focusOnMount title="状态操作未完成" /> : null}</Modal> : null}
  </div>;
};

const ATTACHMENT_STATUS_LABELS: Record<NonNullable<FeedbackReportDetail['attachment']>['status'], string> = { authorized: '已授权，等待上传确认', uploaded: '已上传', failed: '上传失败' };
const Screenshot = ({ feedbackId, attachment }: { feedbackId: string; attachment: NonNullable<FeedbackReportDetail['attachment']> }) => {
  const [url, setUrl] = useState<string | null>(null); const [error, setError] = useState<unknown>(null); const [loading, setLoading] = useState(false); const [open, setOpen] = useState(false);
  const load = async () => { setLoading(true); setError(null); try { const blob = await readFeedbackScreenshot(feedbackId, attachment.attachmentId); const next = URL.createObjectURL(blob); setUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return next; }); setOpen(true); } catch (caught) { setError(caught); } finally { setLoading(false); } };
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return <section className="runtime-detail-section"><h3>{attachment.status === 'uploaded' ? '已确认截图' : '截图附件'}</h3><div className="feedback-screenshot-placeholder">当前附件状态：{ATTACHMENT_STATUS_LABELS[attachment.status]}；内容仅在显式查看时读取。</div><p className="feedback-screenshot-meta">{attachment.contentType} · {Math.ceil(attachment.sizeBytes / 1024)} KB · 隐私确认于 {formatDate(attachment.privacyConfirmedAt)}</p>{attachment.status === 'uploaded' ? <button className="cp-secondary" type="button" onClick={load} disabled={loading}>{loading ? '读取附件…' : '查看大图'}</button> : null}{error ? <ErrorBlock error={error} onRetry={load} busy={loading} focusOnMount title="无法读取截图" /> : null}{open && url ? <Modal title="反馈截图" onClose={() => setOpen(false)}><img className="feedback-screenshot" src={url} alt="用户确认上传的反馈截图" /></Modal> : null}</section>;
};
