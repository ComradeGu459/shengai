import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

export const PAGE_SIZE = 20;

export const Pagination = ({ offset, total, onChange }: { offset: number; total: number; onChange: (offset: number) => void }) => {
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + PAGE_SIZE, total);
  return <div className="cp-pagination"><span>{start}–{end} / {total}</span><button className="cp-secondary" type="button" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))}>上一页</button><button className="cp-secondary" type="button" disabled={offset + PAGE_SIZE >= total} onClick={() => onChange(offset + PAGE_SIZE)}>下一页</button></div>;
};

export const ReadOnlyDrawer = ({ title, kicker, children, onClose, actions, focusRequest = 0 }: { title: string; kicker: string; children: ReactNode; onClose: () => void; actions?: ReactNode; focusRequest?: number }) => {
  const drawer = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    if (focusRequest > 0) titleRef.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    trigger.current = document.activeElement as HTMLElement;
    titleRef.current?.focus();
    const root = drawer.current;
    const focusable = () => [titleRef.current, ...Array.from(root?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])') ?? [])].filter((item): item is HTMLElement => item !== null);
    const isTopmostModal = () => {
      const modals = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]'));
      return modals.at(-1) === root;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopmostModal()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); root?.focus(); return; }
      const first = items[0]!;
      const last = items.at(-1)!;
      if (!root?.contains(document.activeElement)) { event.preventDefault(); event.stopPropagation(); (event.shiftKey ? last : first).focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => { document.removeEventListener('keydown', onKeyDown, true); trigger.current?.focus(); };
  }, []);

  return <div className="runtime-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { event.preventDefault(); event.stopPropagation(); closeRef.current(); } }}><aside ref={drawer} className="cp-drawer runtime-drawer" role="dialog" aria-modal="true" aria-labelledby="runtime-drawer-title" tabIndex={-1}><header className="cp-drawer-head"><div><span className="runtime-kicker">{kicker}</span><h2 ref={titleRef} id="runtime-drawer-title" tabIndex={-1}>{title}</h2></div><button className="cp-icon-button" type="button" aria-label="关闭详情" onClick={() => closeRef.current()}>×</button></header><div className="runtime-drawer-body">{children}</div>{actions ? <footer className="runtime-drawer-actions"><button className="cp-secondary" type="button" onClick={() => closeRef.current()}>返回列表</button>{actions}</footer> : null}</aside></div>;
};

export const ShortId = ({ value }: { value: string | null }) => <span className="runtime-mono" title={value ?? undefined}>{value ? `${value.slice(0, 12)}…${value.slice(-6)}` : '暂无事实'}</span>;

export const formatRuntimeTime = (value: string | null) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无事实';
export const formatDuration = (value: number | null) => value === null ? '暂无事实' : value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)} 秒`;
export const formatCny = (value: string | null, reconciliation: string | null) => reconciliation === 'reconciliation_required' || reconciliation === 'pending' || reconciliation === 'unknown' ? '待对账' : value === null ? '暂无人民币金额' : `${value} CNY`;
