import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import type {
  CreateScreenTextDecisionBody,
  ScreenTextCandidate,
  ScreenTextCategory,
  ScreenTextPosition,
} from '@qimao-terms-cloud/contracts';

import { ScreenTextApiError } from './api.js';
import styles from './ScreenTextWorkspace.module.css';

const focusables = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
)).filter((node) => !node.hidden && node.getAttribute('aria-hidden') !== 'true');

export const Modal = ({
  title,
  lead,
  pending = false,
  onClose,
  triggerRef,
  children,
  footer,
  wide = false,
}: {
  title: string;
  lead?: string;
  pending?: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    (pending ? dialogRef.current : closeRef.current)?.focus();
  }, [pending]);

  const close = () => {
    if (pending) return;
    onClose();
    queueMicrotask(() => triggerRef?.current?.focus());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = focusables(event.currentTarget);
    if (pending || nodes.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <div className={styles.modalLayer} onMouseDown={(event) => {
    if (event.target === event.currentTarget) close();
  }}>
    <div
      className={`${styles.modal} ${wide ? styles.modalWide : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      ref={dialogRef}
      onKeyDown={onKeyDown}
    >
      <header className={styles.modalHeader}>
        <div><h2>{title}</h2>{lead && <p>{lead}</p>}</div>
        <button ref={closeRef} type="button" onClick={close} disabled={pending} aria-label={`关闭${title}`}>关闭</button>
      </header>
      <div className={styles.modalBody}>{children}</div>
      {footer && <footer className={styles.modalActions}>{footer}</footer>}
    </div>
  </div>;
};

export const ErrorBlock = ({
  title,
  error,
  action,
  onAction,
  pending = false,
  disabled = false,
  actionRef,
}: {
  title: string;
  error: unknown;
  action: string;
  onAction: () => void;
  pending?: boolean;
  disabled?: boolean;
  actionRef?: RefObject<HTMLButtonElement | null>;
}) => {
  const detail = error instanceof Error ? error.message : '请求失败，请重新读取。';
  const requestId = error instanceof ScreenTextApiError ? error.requestId : null;
  return <div className={styles.errorBlock} role="alert">
    <strong>{title}</strong>
    <span>{detail}</span>
    {requestId && <small>请求标识：{requestId}</small>}
    <button ref={actionRef} type="button" onClick={onAction} disabled={pending || disabled}>{pending ? '正在读取…' : action}</button>
  </div>;
};

export const formatTime = (milliseconds: number) => {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const ms = milliseconds % 1_000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

const parseTime = (value: string) => {
  const match = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 3_600_000 + Number(match[2]) * 60_000 + Number(match[3]) * 1_000 + Number(match[4]);
};

export const categoryLabels: Record<ScreenTextCategory, string> = {
  nameplate: '人名条', place: '地点', time: '时间', chapter: '章节', title: '标题',
  message: '消息', interface: '界面', other: '其他',
};

export const positionLabels: Record<ScreenTextPosition, string> = {
  left: '左', center: '中', right: '右', full: '全屏',
};

export const isUnsplitDualParent = (candidate: ScreenTextCandidate) =>
  candidate.source === 'ocr' && candidate.pairGroupId !== null && candidate.position === 'full';

export const CandidateEvidence = ({
  candidate,
  readOnly,
  writeLocked,
  evidenceData,
  evidencePending,
  evidenceError,
  onEvidenceRetry,
  pending,
  onDecision,
  onPlayback,
}: {
  candidate: ScreenTextCandidate | null;
  readOnly: boolean;
  writeLocked: boolean;
  evidenceData: Blob | undefined;
  evidencePending: boolean;
  evidenceError: unknown;
  onEvidenceRetry: () => Promise<unknown>;
  pending: boolean;
  onDecision: (body: CreateScreenTextDecisionBody) => void;
  onPlayback: (candidate: ScreenTextCandidate) => Promise<string>;
}) => {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<ScreenTextCategory>('other');
  const [position, setPosition] = useState<ScreenTextPosition>('center');
  const [start, setStart] = useState('00:00:00.000');
  const [end, setEnd] = useState('00:00:01.000');
  const [formError, setFormError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [evidenceRecovery, setEvidenceRecovery] = useState(false);
  const [evidenceRetrying, setEvidenceRetrying] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [enlarged, setEnlarged] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const enlargeRef = useRef<HTMLButtonElement>(null);
  const splitRef = useRef<HTMLButtonElement>(null);
  const paneRef = useRef<HTMLElement>(null);
  const evidenceRetryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!candidate) return;
    setText(candidate.text);
    setCategory(candidate.category);
    setPosition(candidate.position);
    setStart(formatTime(candidate.startMs));
    setEnd(formatTime(candidate.endMs));
    setFormError('');
    setPlaybackError('');
    setPlaybackUrl('');
    setSplitOpen(false);
    setLeftText(candidate.text);
    setRightText('');
  }, [candidate?.id, candidate?.revision]);

  useEffect(() => {
    if (!candidate || !evidenceData) {
      setPreviewUrl('');
      return;
    }
    if (typeof URL.createObjectURL !== 'function') {
      setPreviewUrl(candidate.evidence.previewPath);
      return;
    }
    const url = URL.createObjectURL(evidenceData);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [candidate?.id, evidenceData]);

  useLayoutEffect(() => {
    if (!evidenceRecovery || evidencePending || evidenceRetrying) return;
    if (evidenceError) evidenceRetryRef.current?.focus();
    else paneRef.current?.focus();
    setEvidenceRecovery(false);
  }, [evidenceError, evidencePending, evidenceRecovery, evidenceRetrying]);

  if (!candidate) return <aside className={styles.evidencePane} aria-label="候选证据与编辑">
    <div className={styles.emptyEvidence}><strong>选择一条候选</strong><span>在此查看同源截图、术语命中并作出人工决定。</span></div>
  </aside>;

  const save = () => {
    const startMs = parseTime(start);
    const endMs = parseTime(end);
    if (!text.trim()) return setFormError('文字不能为空。');
    if (startMs === null || endMs === null || startMs >= endMs) return setFormError('时间格式应为 00:00:00.000，且开始时间必须早于结束时间。');
    setFormError('');
    onDecision({ action: 'edit', expectedRevision: candidate.revision, text: text.trim(), startMs, endMs, category, position });
  };

  const play = async () => {
    try {
      setPlaybackError('');
      setPlaybackUrl(await onPlayback(candidate));
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : '视频授权读取失败。');
    }
  };

  const dualParent = isUnsplitDualParent(candidate);
  const controlsDisabled = writeLocked || pending;

  return <aside className={styles.evidencePane} aria-label="候选证据与编辑" tabIndex={-1} ref={paneRef}>
    <div className={styles.evidenceTitle}>
      <div><strong>截图与视频证据</strong><small>第 {String(candidate.episodeNumber).padStart(2, '0')} 集 · {formatTime(candidate.evidence.capturedAtMs)}</small></div>
      <button ref={enlargeRef} className={styles.textButton} type="button" onClick={() => setEnlarged(true)}>放大</button>
    </div>
    <div className={styles.mediaFrame}>
      {previewUrl && <img src={previewUrl} alt={`第 ${candidate.episodeNumber} 集画面字代表截图`} />}
      {!previewUrl && <div className={styles.mediaPlaceholder}>{evidencePending ? '正在读取代表截图' : '代表截图暂不可用'}</div>}
      <div className={styles.ocrBox}><span>{candidate.rawText}</span><small>OCR 原始候选</small></div>
    </div>
    {playbackUrl && <video className={styles.video} src={playbackUrl} controls autoPlay onLoadedMetadata={(event) => { event.currentTarget.currentTime = candidate.startMs / 1_000; }} onError={() => setPlaybackError('当前编码不受浏览器支持，需要后续兼容代理。')} aria-label={`第 ${candidate.episodeNumber} 集同源视频证据`} />}
    <div className={styles.mediaControls}><button className={styles.primaryCompact} type="button" onClick={() => void play()}>播放同源视频</button><span>定位 {formatTime(candidate.startMs)}</span></div>
    {Boolean(evidenceError) && <ErrorBlock title="候选证据读取失败" error={evidenceError} action="重新读取候选证据" actionRef={evidenceRetryRef} pending={evidencePending || evidenceRetrying} onAction={() => {
      if (evidenceRetrying) return;
      setEvidenceRecovery(true);
      setEvidenceRetrying(true);
      void onEvidenceRetry().finally(() => setEvidenceRetrying(false));
    }} />}
    {playbackError && <div className={styles.inlineError} role="alert">{playbackError}</div>}
    <div className={styles.evidenceFacts}>
      <span>代表截图 <strong>{candidate.evidence.width} × {candidate.evidence.height}</strong></span>
      <span>置信度 <strong>{candidate.confidence === null ? '未提供' : candidate.confidence.toFixed(2)}</strong></span>
      <span>候选来源 <strong>{candidate.source === 'manual' ? '人工新增' : candidate.source === 'split' ? '左右拆分' : '连续帧识别'}</strong></span>
    </div>
    <form onSubmit={(event) => { event.preventDefault(); save(); }}>
      <label>文字<input value={text} onChange={(event) => setText(event.target.value)} disabled={controlsDisabled || dualParent} /></label>
      <div className={styles.formGrid}>
        <label>分类<select value={category} onChange={(event) => setCategory(event.target.value as ScreenTextCategory)} disabled={controlsDisabled || dualParent}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>位置<select value={position} onChange={(event) => setPosition(event.target.value as ScreenTextPosition)} disabled={controlsDisabled || dualParent}>{Object.entries(positionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className={styles.formGrid}>
        <label>开始时间<input value={start} onChange={(event) => setStart(event.target.value)} disabled={controlsDisabled || dualParent} /></label>
        <label>结束时间<input value={end} onChange={(event) => setEnd(event.target.value)} disabled={controlsDisabled || dualParent} /></label>
      </div>
      <div className={styles.termReceipt}>
        <span className={`${styles.statusTag} ${candidate.termHits.length ? styles.success : styles.neutral}`}>{candidate.termHits.length ? '术语命中' : '未命中术语'}</span>
        <strong>{candidate.termHits.length ? candidate.termHits.map((hit) => hit.canonicalName).join('、') : '保留原始画面证据'}</strong>
        <small>身份信息只来自已确认术语或画面证据，不作臆测。</small>
      </div>
      {readOnly && <div className={styles.readOnlyNote} role="status"><strong>旧草稿只读</strong><span>候选、证据、术语命中和历史决定仍可查看；不能在旧来源上新增或修改。</span></div>}
      {formError && <div className={styles.inlineError} role="alert">{formError}</div>}
      {!readOnly && <>
        <div className={styles.decisionRow}>
          {candidate.status === 'rejected'
            ? <button type="button" disabled={controlsDisabled} onClick={() => onDecision({ action: 'restore', expectedRevision: candidate.revision })}>恢复为待确认</button>
            : candidate.status === 'pending' || dualParent ? <>
              <button type="button" disabled={controlsDisabled} onClick={() => onDecision({ action: 'reject', expectedRevision: candidate.revision })}>忽略</button>
              {dualParent && <button ref={splitRef} type="button" disabled={controlsDisabled} onClick={() => setSplitOpen(true)}>拆分左右</button>}
              {!dualParent && <button className={styles.primary} type="button" disabled={controlsDisabled} onClick={() => onDecision({ action: 'approve', expectedRevision: candidate.revision })}>保留</button>}
              <span className={styles.editHint}>本条不纳入画面字字幕，可从已忽略恢复</span>
            </> : <span className={styles.editHint}>既有人工决定保持不变；如需修订，请保存编辑。</span>}
        </div>
        {candidate.status !== 'rejected' && !dualParent && <button className={styles.wideButton} type="submit" disabled={controlsDisabled}>保存修改</button>}
      </>}
    </form>
    {enlarged && <Modal title={`放大视频证据 · 第 ${String(candidate.episodeNumber).padStart(2, '0')} 集`} onClose={() => setEnlarged(false)} triggerRef={enlargeRef} wide>
      <div className={styles.viewerMedia}>{previewUrl ? <img src={previewUrl} alt={`放大的第 ${candidate.episodeNumber} 集画面字代表截图`} /> : <div className={styles.mediaPlaceholder}>代表截图暂不可用</div>}</div>
    </Modal>}
    {splitOpen && <Modal title="拆分左右画面字" lead={`共同来源时间 ${formatTime(candidate.startMs)} 至 ${formatTime(candidate.endMs)}；提交后生成两个独立 Cue。`} pending={pending} onClose={() => setSplitOpen(false)} triggerRef={splitRef} footer={<><button type="button" disabled={pending} onClick={() => setSplitOpen(false)}>取消</button><button className={styles.primary} type="button" disabled={controlsDisabled || !leftText.trim() || !rightText.trim()} onClick={() => onDecision({ action: 'split_left_right', expectedRevision: candidate.revision, leftText: leftText.trim(), rightText: rightText.trim() })}>确认拆分</button></>}>
      <div className={styles.manualForm}><label>左侧文字<input value={leftText} disabled={controlsDisabled} onChange={(event) => setLeftText(event.target.value)} /></label><label>右侧文字<input value={rightText} disabled={controlsDisabled} onChange={(event) => setRightText(event.target.value)} /></label></div>
    </Modal>}
  </aside>;
};
