import { useQuery } from '@tanstack/react-query';
import type {
  ApplyPreEditPolicyBody,
  PreEditEpisode,
  PreEditItem,
  PreEditSessionDetail,
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

import {
  createPreEditPlaybackGrant,
  listPreEditItems,
  PreReviewApiError,
  previewPreEditPolicy,
  type PlaybackGrant,
} from './api.js';
import { alignmentLabels, decisionLabels, formatMs, itemState, itemTimeRange } from './model.js';
import styles from './PreReviewWorkspace.module.css';

const focusables = (root: HTMLElement | null) => root
  ? Array.from(root.querySelectorAll<HTMLElement>(
    'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )).filter((entry) => !entry.hasAttribute('hidden'))
  : [];

export const trapFocus = (
  event: KeyboardEvent<HTMLElement>,
  root: HTMLElement | null,
  locked = false,
) => {
  if (event.key !== 'Tab') return;
  if (locked) {
    event.preventDefault();
    root?.focus();
    return;
  }
  const items = focusables(root);
  if (!items.length) {
    event.preventDefault();
    root?.focus();
    return;
  }
  const first = items[0]!;
  const last = items.at(-1)!;
  if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const RequestError = ({
  title,
  error,
  action,
  onAction,
  actionRef,
  pending = false,
}: {
  title: string;
  error: unknown;
  action: string;
  onAction: () => void;
  actionRef?: RefObject<HTMLButtonElement | null>;
  pending?: boolean;
}) => {
  const apiError = error instanceof PreReviewApiError ? error : null;
  return <div className={styles.errorState} role="alert">
    <strong>{title}</strong>
    <span>{error instanceof Error ? error.message : '未知错误'}</span>
    {apiError?.requestId && <small>请求标识 {apiError.requestId}</small>}
    <button type="button" ref={actionRef} disabled={pending} onClick={onAction}>
      {pending ? '正在重新读取' : action}
    </button>
  </div>;
};

export const BaselineDialog = ({
  session,
  currentEpisode,
  currentItem,
  pending,
  commandError,
  recoveryLabel,
  onApply,
  onRetryApply,
  onClose,
}: {
  session: PreEditSessionDetail;
  currentEpisode: PreEditEpisode;
  currentItem: PreEditItem;
  pending: boolean;
  commandError: unknown;
  recoveryLabel: string;
  onApply: (body: ApplyPreEditPolicyBody) => void;
  onRetryApply: () => void;
  onClose: () => void;
}) => {
  const [scope, setScope] = useState<ApplyPreEditPolicyBody['scope']>('series');
  const [policy, setPolicy] = useState<ApplyPreEditPolicyBody['policy']>(session.defaultPolicy);
  const [episodes, setEpisodes] = useState<number[]>([currentEpisode.episodeNumber]);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const retryRef = useRef<HTMLButtonElement | null>(null);
  const previewRetryRef = useRef<HTMLButtonElement | null>(null);
  const previewRecovery = useRef(false);
  const body = useMemo<ApplyPreEditPolicyBody>(() => ({
    expectedSessionRevision: session.revision,
    scope,
    policy,
    ...(scope === 'episodes' ? { episodeNumbers: episodes } : {}),
    ...(scope === 'item' ? { itemId: currentItem.id } : {}),
  }), [currentItem.id, episodes, policy, scope, session.revision]);
  const preview = useQuery({
    queryKey: ['pre-review-policy-preview', session.id, body],
    queryFn: () => previewPreEditPolicy(session.projectId, session.id, body),
    retry: false,
  });

  useLayoutEffect(() => {
    if (pending) dialogRef.current?.focus();
    else if (commandError) retryRef.current?.focus();
    else cancelRef.current?.focus();
  }, [commandError, pending]);
  useLayoutEffect(() => {
    if (!previewRecovery.current) return;
    if (preview.isFetching) dialogRef.current?.focus();
    else if (preview.isError) previewRetryRef.current?.focus();
    else if (preview.isSuccess) { previewRecovery.current = false; cancelRef.current?.focus(); }
  }, [preview.dataUpdatedAt, preview.errorUpdatedAt, preview.isError, preview.isFetching, preview.isSuccess]);

  const close = () => { if (!pending) onClose(); };
  return <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div
      className={styles.dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="baseline-title"
      aria-busy={pending}
      tabIndex={-1}
      ref={dialogRef}
      onKeyDown={(event) => {
        trapFocus(event, dialogRef.current, pending);
        if (event.key === 'Escape') { event.preventDefault(); close(); }
      }}
    >
      <header><h2 id="baseline-title">调整文本基准</h2><button type="button" onClick={close} disabled={pending}>关闭</button></header>
      <fieldset>
        <legend>作用范围</legend>
        {([['series', '整剧'], ['episodes', '选中集'], ['item', '当前单条']] as const).map(([value, label]) =>
          <label key={value}><input type="radio" name="scope" value={value} checked={scope === value} onChange={() => setScope(value)} />{label}</label>)}
      </fieldset>
      {scope === 'episodes' && <div className={styles.episodeChecks} aria-label="选择集数">
        {session.episodes.map((episode) => <label key={episode.id}>
          <input
            type="checkbox"
            checked={episodes.includes(episode.episodeNumber)}
            onChange={() => setEpisodes((current) => current.includes(episode.episodeNumber)
              ? current.filter((value) => value !== episode.episodeNumber)
              : [...current, episode.episodeNumber].sort((a, b) => a - b))}
          />第 {episode.episodeNumber} 集
        </label>)}
      </div>}
      <fieldset>
        <legend>文本基准</legend>
        <label><input type="radio" name="policy" checked={policy === 'company_primary'} onChange={() => setPolicy('company_primary')} />公司稿优先</label>
        <label><input type="radio" name="policy" checked={policy === 'asr_text_primary'} onChange={() => setPolicy('asr_text_primary')} />ASR 优先</label>
      </fieldset>
      {preview.isPending && <div className={styles.inlineLoading} role="status">正在计算影响范围…</div>}
      {preview.isError && <RequestError title="基准影响读取失败" error={preview.error} action="重新读取影响" actionRef={previewRetryRef} onAction={() => { if (!preview.isFetching) { previewRecovery.current = true; void preview.refetch(); } }} pending={preview.isFetching} />}
      {preview.data && <dl className={styles.previewFacts}>
        <div><dt>可安全更新</dt><dd>{preview.data.safeUpdateCount}</dd></div>
        <div><dt>保留人工决定</dt><dd>{preview.data.protectedHumanDecisionCount}</dd></div>
        <div><dt>仍需人工</dt><dd>{preview.data.requiresHumanDecisionCount}</dd></div>
      </dl>}
      {Boolean(commandError) && <RequestError title="文本基准保存失败" error={commandError} action={recoveryLabel} onAction={onRetryApply} actionRef={retryRef} pending={pending} />}
      <footer><button type="button" ref={cancelRef} onClick={close} disabled={pending}>取消</button><button type="button" className={styles.primaryButton} onClick={() => onApply(body)} disabled={pending || !preview.data || (scope === 'episodes' && !episodes.length)}>{pending ? '正在保存' : '确认调整'}</button></footer>
    </div>
  </div>;
};

export const ConfirmDecisionDialog = ({
  title,
  detail,
  pending,
  error,
  recoveryLabel,
  onConfirm,
  onRetry,
  onClose,
}: {
  title: string;
  detail: string;
  pending: boolean;
  error: unknown;
  recoveryLabel: string;
  onConfirm: () => void;
  onRetry: () => void;
  onClose: () => void;
}) => {
  const root = useRef<HTMLDivElement | null>(null);
  const cancel = useRef<HTMLButtonElement | null>(null);
  const retry = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    if (pending) root.current?.focus();
    else if (error) retry.current?.focus();
    else cancel.current?.focus();
  }, [error, pending]);
  const close = () => { if (!pending) onClose(); };
  return <div className={styles.overlayTop} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="decision-confirm-title" tabIndex={-1} ref={root} aria-busy={pending} onKeyDown={(event) => { trapFocus(event, root.current, pending); if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
      <h2 id="decision-confirm-title">{title}</h2><p>{detail}</p>
      {Boolean(error) && <RequestError title="决定保存失败" error={error} action={recoveryLabel} onAction={onRetry} actionRef={retry} pending={pending} />}
      <footer><button type="button" ref={cancel} disabled={pending} onClick={close}>取消</button><button type="button" className={styles.dangerButton} disabled={pending} onClick={onConfirm}>{pending ? '正在保存' : '确认'}</button></footer>
    </div>
  </div>;
};

export const FullAxisDrawer = ({
  projectId,
  sessionId,
  episodeNumber,
  onLocate,
  onClose,
}: {
  projectId: string;
  sessionId: string;
  episodeNumber: number;
  onLocate: (item: PreEditItem) => void;
  onClose: () => void;
}) => {
  const [page, setPage] = useState(0);
  const root = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const retryRef = useRef<HTMLButtonElement | null>(null);
  const recovery = useRef(false);
  const list = useQuery({
    queryKey: ['pre-review-full-axis', projectId, sessionId, episodeNumber, page],
    queryFn: () => listPreEditItems(projectId, sessionId, { episodeNumber, status: 'all', limit: 20, offset: page * 20 }),
    retry: false,
  });
  const listReady = list.isSuccess && !list.isFetching;
  useLayoutEffect(() => {
    if (list.isFetching) root.current?.focus();
    else if (list.isError) retryRef.current?.focus();
    else closeRef.current?.focus();
  }, [list.isError, list.isFetching]);
  useLayoutEffect(() => {
    if (!recovery.current) return;
    if (list.isFetching) root.current?.focus();
    else if (list.isError) retryRef.current?.focus();
    else if (list.isSuccess) { recovery.current = false; closeRef.current?.focus(); }
  }, [list.dataUpdatedAt, list.errorUpdatedAt, list.isError, list.isFetching, list.isSuccess]);
  const retry = () => { if (!list.isFetching) { recovery.current = true; void list.refetch(); } };
  const close = () => { if (!list.isFetching) onClose(); };
  return <div className={styles.drawerBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <aside className={styles.axisDrawer} role="dialog" aria-modal="true" aria-labelledby="axis-title" aria-busy={list.isFetching} tabIndex={-1} ref={root} onKeyDown={(event) => { trapFocus(event, root.current, list.isFetching); if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
      <header><div><h2 id="axis-title">第 {episodeNumber} 集 · 本集全轴</h2><p>只读浏览并定位主工作区；本页不编辑时间轴。</p></div><button type="button" ref={closeRef} disabled={list.isFetching} onClick={close}>关闭本集全轴</button></header>
      {list.isFetching && <div className={styles.drawerState} role="status">正在读取本集全部轴…</div>}
      {list.isError && <RequestError title="本集全轴读取失败" error={list.error} action="重新读取全轴" onAction={retry} actionRef={retryRef} pending={list.isFetching} />}
      {listReady && list.data.items.length === 0 && <div className={styles.drawerState} role="status">本集暂无可浏览的对齐轴。</div>}
      {listReady && list.data.items.length > 0 && <div className={styles.axisTableWrap}><table><thead><tr><th>公司/识别轴</th><th>时间</th><th>关系</th><th>文本差异</th><th>当前决定</th><th>格式</th><th>风险</th><th>定位</th></tr></thead><tbody>{list.data.items.map((item) => <tr key={item.id}><td>{item.companyCues.map((cue) => `C${cue.cueIndex}`).join('、') || '—'} / {item.asrCues.map((cue) => `A${cue.cueIndex}`).join('、') || '—'}</td><td>{itemTimeRange(item)}</td><td>{alignmentLabels[item.groupKind]}</td><td>{item.companyCues.map((cue) => cue.text).join(' / ') || '—'}<span>识别：{item.asrCues.map((cue) => cue.text).join(' / ') || '—'}</span></td><td>{decisionLabels[item.currentAction]}</td><td>{item.formatIssues.length ? item.formatIssues.map((issue) => issue.message).join('；') : '通过'}</td><td>未启用</td><td><button type="button" onClick={() => onLocate(item)}>定位</button></td></tr>)}</tbody></table></div>}
      {listReady && <footer className={styles.drawerPager}><span>共 {list.data.total} 条</span><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>上一页</button><span>第 {page + 1} 页</span><button type="button" disabled={(page + 1) * 20 >= list.data.total} onClick={() => setPage((value) => value + 1)}>下一页</button></footer>}
    </aside>
  </div>;
};

const VideoControls = ({
  videoRef,
  grant,
  onPlaybackError,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  grant: PlaybackGrant;
  onPlaybackError: () => void;
}) => {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(grant.seek.startMs);
  useEffect(() => {
    const video = videoRef.current;
    setPlaying(false);
    setTime(grant.seek.startMs);
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setTime(Math.round(video.currentTime * 1000));
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    setPlaying(!video.paused);
    setTime(Math.round(video.currentTime * 1000));
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [grant.assetId, grant.seek.startMs, videoRef]);
  const move = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime + delta);
  };
  const toggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) await video.play(); else video.pause();
    } catch {
      setPlaying(false);
      onPlaybackError();
    }
  };
  return <><div className={styles.videoControls}><button type="button" onClick={() => void toggle()}>{playing ? '暂停' : '播放'}</button><button type="button" onClick={() => move(-2)}>后退 2 秒</button><button type="button" onClick={() => move(2)}>前进 2 秒</button><button type="button" onClick={() => { if (videoRef.current) videoRef.current.currentTime = grant.seek.startMs / 1000; }}>跳回当前轴</button></div><span className={styles.videoTime}>{formatMs(time)} · 证据窗口至 {formatMs(grant.seek.contextEndMs)}</span></>;
};

export const VideoEvidence = ({ projectId, session, item }: { projectId: string; session: PreEditSessionDetail; item: PreEditItem }) => {
  const panelRef = useRef<HTMLElement | null>(null);
  const retryRef = useRef<HTMLButtonElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const enlargeVideoRef = useRef<HTMLVideoElement | null>(null);
  const enlargeTrigger = useRef<HTMLButtonElement | null>(null);
  const enlargeRoot = useRef<HTMLDivElement | null>(null);
  const enlargeClose = useRef<HTMLButtonElement | null>(null);
  const mediaErrorRef = useRef<HTMLDivElement | null>(null);
  const recovery = useRef(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [enlarged, setEnlarged] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const grant = useQuery({
    queryKey: ['pre-review-playback', projectId, session.id, item.id, session.revision],
    queryFn: () => createPreEditPlaybackGrant(projectId, session.id, item.id, session.revision),
    retry: false,
  });
  useEffect(() => {
    if (grant.data && videoRef.current) videoRef.current.currentTime = grant.data.seek.startMs / 1000;
  }, [grant.data]);
  useEffect(() => {
    setDimensions(null);
    setEnlarged(false);
    setMediaError(false);
  }, [grant.data?.url, item.id]);
  useLayoutEffect(() => {
    if (!recovery.current) return;
    if (grant.isFetching) panelRef.current?.focus();
    else if (grant.isError) retryRef.current?.focus();
    else if (grant.isSuccess) { recovery.current = false; videoRef.current?.focus(); }
  }, [grant.dataUpdatedAt, grant.errorUpdatedAt, grant.isError, grant.isFetching, grant.isSuccess]);
  useLayoutEffect(() => { if (enlarged) enlargeClose.current?.focus(); }, [enlarged]);
  useLayoutEffect(() => {
    if (!mediaError) return;
    const modals = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]'));
    const focusedModal = modals.find((modal) => modal.contains(document.activeElement));
    const activeModal = focusedModal ?? modals[modals.length - 1];
    if (activeModal) {
      if (!activeModal.contains(document.activeElement)) activeModal.focus();
      return;
    }
    mediaErrorRef.current?.focus();
  }, [mediaError]);
  const retry = () => { if (!grant.isFetching) { recovery.current = true; void grant.refetch(); } };
  const closeEnlarged = () => { setEnlarged(false); requestAnimationFrame(() => enlargeTrigger.current?.focus()); };
  const failMedia = () => { setEnlarged(false); setMediaError(true); };
  const aspect = dimensions ? dimensions.width > dimensions.height ? '横屏' : dimensions.width < dimensions.height ? '竖屏' : '方形' : '读取中';

  return <section className={styles.evidencePanel} ref={panelRef} tabIndex={-1} aria-label="视频证据">
    <header><div><h2>视频证据</h2><span>{dimensions ? `${dimensions.width}×${dimensions.height} · ${aspect}` : mediaError ? '媒体不可播放' : '正在读取画幅元数据'}</span></div><button type="button" ref={enlargeTrigger} disabled={!grant.data || mediaError} onClick={() => setEnlarged(true)}>放大</button></header>
    {grant.isPending && <div className={styles.videoState} role="status">正在签发只读播放地址…</div>}
    {grant.isError && <RequestError title="视频证据读取失败" error={grant.error} action="重新读取视频证据" onAction={retry} actionRef={retryRef} pending={grant.isFetching} />}
    {mediaError && <div className={styles.mediaError} role="alert" tabIndex={-1} ref={mediaErrorRef}><strong>当前编码不受浏览器支持</strong><span>需要后续兼容代理；当前视频证据已停止播放，不能据此继续看片判断。</span></div>}
    {grant.data && !mediaError && <><div className={styles.videoFrame}><video
      ref={videoRef}
      src={grant.data.url}
      tabIndex={0}
      aria-label={`第 ${grant.data.episodeNumber} 集视频证据`}
      onError={failMedia}
      onLoadedMetadata={(event) => {
        setDimensions({ width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight });
        event.currentTarget.currentTime = grant.data.seek.startMs / 1000;
      }}
    /></div><VideoControls videoRef={videoRef} grant={grant.data} onPlaybackError={failMedia} /></>}
    {grant.data && <dl className={styles.evidenceFacts}>
      <div><dt>证据窗口</dt><dd>{itemTimeRange(item)}</dd></div>
      <div><dt>只读授权</dt><dd>有效至 {new Date(grant.data.expiresAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</dd></div>
      <div><dt>视频来源</dt><dd>第 {grant.data.episodeNumber} 集 · Asset {grant.data.assetId.slice(0, 8)}</dd></div>
      <div><dt>编辑边界</dt><dd>本页只定位证据，不修改时间轴</dd></div>
    </dl>}
    {enlarged && grant.data && !mediaError && <div className={styles.overlayTop} onMouseDown={(event) => { if (event.target === event.currentTarget) closeEnlarged(); }}><div className={styles.videoDialog} role="dialog" aria-modal="true" aria-labelledby="video-dialog-title" tabIndex={-1} ref={enlargeRoot} onKeyDown={(event) => { trapFocus(event, enlargeRoot.current); if (event.key === 'Escape') { event.preventDefault(); closeEnlarged(); } }}><header><div><h2 id="video-dialog-title">放大视频证据</h2><span>{dimensions ? `${dimensions.width}×${dimensions.height} · ${aspect} · 完整显示` : '完整显示'}</span></div><button type="button" ref={enlargeClose} onClick={closeEnlarged}>关闭放大视频</button></header><div className={styles.enlargedFrame}><video ref={enlargeVideoRef} src={grant.data.url} tabIndex={0} aria-label={`第 ${grant.data.episodeNumber} 集放大视频证据`} onError={failMedia} onLoadedMetadata={(event) => { event.currentTarget.currentTime = grant.data.seek.startMs / 1000; }} /></div><VideoControls videoRef={enlargeVideoRef} grant={grant.data} onPlaybackError={failMedia} /></div></div>}
  </section>;
};
