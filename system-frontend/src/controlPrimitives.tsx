import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { ControlApiError } from './systemApi.js';

export const STATUS_TEXT: Record<string, string> = {
  enabled: '可用于草稿', disabled: '已停用', queued: '排队中', running: '测试中', succeeded: '成功', failed: '失败', unknown: '未知',
  draft: '草稿', testing: '测试中', impact_checked: '影响已检查', approved: '已批准', active: '生效中', retired: '已退役',
  available: '可用于新版本', validation_failed: '验证失败', rotation_due: '待轮换', revoked: '已撤销', ready: '就绪', not_configured: '未配置',
};

export const Badge = ({ value }: { value: string }) => <span className={`cp-badge cp-${value.replaceAll('_', '-')}`}><i />{STATUS_TEXT[value] ?? '未知状态'}</span>;

const asControlError = (error: unknown) => {
  if (error instanceof ControlApiError) return error;
  const candidate = error as { requestId?: string | null; retryable?: boolean } | null;
  return new ControlApiError(error instanceof Error ? error.message : '读取失败', {
    ...(candidate?.requestId !== undefined ? { requestId: candidate.requestId } : {}),
    ...(candidate?.retryable !== undefined ? { retryable: candidate.retryable } : {}),
  });
};

export const ErrorBlock = ({ error, onRetry, busy = false, stale = false, showRetry = true, focusOnMount = false, focusWhenBusy = false, title }: { error: unknown; onRetry?: () => void; busy?: boolean; stale?: boolean; showRetry?: boolean; focusOnMount?: boolean; focusWhenBusy?: boolean; title?: string }) => {
  const parsed = asControlError(error);
  const root = useRef<HTMLDivElement>(null);
  const previousBusy = useRef(busy);
  useLayoutEffect(() => { if (focusOnMount) root.current?.focus(); }, [focusOnMount, error]);
  useLayoutEffect(() => {
    if (focusWhenBusy && busy && !previousBusy.current) root.current?.focus();
    previousBusy.current = busy;
  }, [busy, focusWhenBusy]);
  return <div ref={root} tabIndex={focusOnMount || focusWhenBusy ? -1 : undefined} className="cp-state cp-error" role="alert"><strong>{title ?? (stale ? '上一次服务端事实已保留，当前读取失败' : '无法读取服务端事实')}</strong><span>{parsed.message}{parsed.requestId ? ` · requestId: ${parsed.requestId}` : ''}</span>{showRetry && onRetry ? <button className="cp-primary" type="button" disabled={busy} onClick={onRetry}>{busy ? '读取中…' : '重新读取'}</button> : null}</div>;
};

export const LoadingBlock = ({ label = '读取服务端事实…' }: { label?: string }) => <div className="cp-state cp-loading" role="status"><span className="cp-spinner" />{label}</div>;
export const EmptyBlock = ({ title, detail }: { title: string; detail: string }) => <div className="cp-empty"><strong>{title}</strong><span>{detail}</span></div>;

export const useAsyncRead = <T,>(reader: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[] = [], options: { identity?: string } = {}) => {
  const identity = options.identity ?? '__static__';
  const [state, setState] = useState<{ identity: string; data: T | null; error: unknown; loading: boolean; refreshing: boolean; stale: boolean }>({ identity, data: null, error: null, loading: true, refreshing: false, stale: false });
  const sequence = useRef(0);
  const run = (afterSuccess?: () => void) => {
    const current = ++sequence.current;
    const controller = new AbortController();
    setState((previous) => { const sameIdentity = previous.identity === identity; return { identity, data: sameIdentity ? previous.data : null, loading: !sameIdentity || previous.data === null, refreshing: sameIdentity && previous.data !== null, error: null, stale: false }; });
    void reader(controller.signal).then((data) => { if (current === sequence.current) { setState({ identity, data, error: null, loading: false, refreshing: false, stale: false }); afterSuccess?.(); } }).catch((error) => { if (current === sequence.current && (error as Error)?.name !== 'AbortError') setState((previous) => { const sameIdentity = previous.identity === identity; return { identity, data: sameIdentity ? previous.data : null, loading: false, refreshing: false, stale: sameIdentity && previous.data !== null, error }; }); });
    return () => controller.abort();
  };
  useEffect(() => { const cancel = run(); return cancel; }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = state.identity === identity ? state : { identity, data: null, error: null, loading: true, refreshing: false, stale: false };
  return { ...visible, reload: run };
};

export const Modal = ({ title, children, onClose, busy = false, locked = busy, initialFocus = 'first', onSubmit, submitLabel = '确认', onUnmountFocus }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; locked?: boolean; initialFocus?: 'first' | 'last'; onSubmit?: (event: FormEvent<HTMLFormElement>) => void; submitLabel?: string; onUnmountFocus?: (trigger: HTMLElement | null) => void }) => {
  const layer = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const unmountFocusRef = useRef(onUnmountFocus);
  const busyRef = useRef(locked);
  closeRef.current = onClose;
  unmountFocusRef.current = onUnmountFocus;
  busyRef.current = locked;
  useEffect(() => {
    trigger.current = document.activeElement as HTMLElement;
    const root = layer.current;
    const focusables = () => Array.from(root?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])') ?? []);
    const items = focusables();
    (initialFocus === 'last' ? items.at(-1) : items[0])?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!busyRef.current) closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const current = focusables(); if (!current.length) { event.preventDefault(); root?.focus(); return; }
      const first = current[0]!; const last = current.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    root?.addEventListener('keydown', onKey);
    return () => { root?.removeEventListener('keydown', onKey); if (unmountFocusRef.current) unmountFocusRef.current(trigger.current); else trigger.current?.focus(); };
  }, [initialFocus]);
  const wasLocked = useRef(false);
  useEffect(() => {
    const root = layer.current;
    if (locked && !wasLocked.current) root?.focus();
    wasLocked.current = locked;
  }, [locked]);
  return <div className="cp-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyRef.current) { event.preventDefault(); event.stopPropagation(); closeRef.current(); } }}><section className="cp-modal" role="dialog" aria-modal="true" aria-labelledby="cp-modal-title" aria-busy={busy} data-locked={locked} data-testid="modal-dialog" ref={layer} tabIndex={-1}><header><h2 id="cp-modal-title" tabIndex={-1}>{title}</h2><button className="cp-icon-button" type="button" aria-label="关闭" onClick={() => closeRef.current()} disabled={locked}>×</button></header><form onSubmit={onSubmit}>{children}<footer><button className="cp-secondary" type="button" onClick={() => closeRef.current()} disabled={locked}>取消</button>{onSubmit ? <button className="cp-primary" type="submit" disabled={locked}>{busy ? '提交中…' : submitLabel}</button> : null}</footer></form></section></div>;
};

type RecoveryKind = 'deployment' | 'version' | 'test' | 'status' | 'routing' | 'release' | 'budget' | 'budget-test' | 'budget-release' | 'strategy-artifact' | 'strategy-version' | 'strategy-run' | 'strategy-decision' | 'strategy-evaluation' | 'strategy-runtime-baseline' | 'strategy-runtime-draft' | 'strategy-runtime-impact' | 'strategy-runtime-approval' | 'strategy-runtime-release';
const recoveryCopy: Record<RecoveryKind, { title: string; action: string }> = {
  deployment: { title: '部署命令结果未知', action: '查询本次部署结果' },
  version: { title: '版本命令结果未知', action: '查询本次版本结果' },
  test: { title: '连接测试结果未知', action: '查询本次测试结果' },
  status: { title: '状态命令结果未知', action: '查询本次状态命令' },
  routing: { title: '路由创建结果未知', action: '查询本次路由结果' },
  release: { title: '发布结果未知', action: '查询本次命令结果' },
  budget: { title: '预算策略命令结果未知', action: '查询本次预算结果' },
  'budget-test': { title: '预算回放结果未知', action: '查询本次预算回放结果' },
  'budget-release': { title: '预算发布结果未知', action: '查询本次预算发布结果' },
  'strategy-artifact': { title: '策略资产登记结果未知', action: '查询本次策略资产结果' },
  'strategy-version': { title: '策略版本创建结果未知', action: '查询本次策略版本结果' },
  'strategy-run': { title: '优化运行结果未知', action: '查询本次优化运行' },
  'strategy-decision': { title: '候选决定结果未知', action: '查询本次候选决定' },
  'strategy-evaluation': { title: '离线评测结果未知', action: '查询本次离线评测' },
  'strategy-runtime-baseline': { title: '系统初始基线导入结果未知', action: '查询本次基线导入' },
  'strategy-runtime-draft': { title: '严格字段草稿结果未知', action: '查询本次草稿结果' },
  'strategy-runtime-impact': { title: '影子影响验证结果未知', action: '查询本次影子影响验证' },
  'strategy-runtime-approval': { title: '人工批准结果未知', action: '查询本次批准结果' },
  'strategy-runtime-release': { title: '发布/恢复命令结果未知', action: '查询本次发布/恢复命令' },
};

export const CommandRecovery = ({ kind, identity, onRecover, busy = false, error, showIdentity = true, actionLabel }: { kind: RecoveryKind; identity: string; onRecover: () => void; busy?: boolean; error?: unknown; showIdentity?: boolean; actionLabel?: string }) => {
  const button = useRef<HTMLButtonElement>(null);
  const copy = recoveryCopy[kind];
  const parsed = error ? asControlError(error) : null;
  useEffect(() => { if (!busy) button.current?.focus(); }, [identity, busy]);
  return <div className="cp-state cp-warning" role="alert"><strong>{copy.title}</strong><span>{parsed ? `${parsed.message}${parsed.requestId ? ` · requestId: ${parsed.requestId}` : ''}；` : ''}未重发原命令；请只读取同一稳定身份{showIdentity ? `：${identity}` : '。'}。</span><button ref={button} className="cp-primary" type="button" onClick={onRecover} disabled={busy}>{busy ? '查询中…' : actionLabel ?? copy.action}</button></div>;
};

export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => <label className="cp-field"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
export const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无事实';
export const stopSubmit = (event: FormEvent) => event.preventDefault();
