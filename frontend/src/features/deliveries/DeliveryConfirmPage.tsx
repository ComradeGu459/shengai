import type { CreateDeliveryBody, DeliveryConfirmation } from '@qimao-terms-cloud/contracts';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { createUuid } from '../../platform/randomUuid.js';
import { createDelivery, DeliveryApiError, getDeliveryConfirmation, getDelivery } from './api.js';
import { commandKey, stableIntentStorageKey, sourceId } from './model.js';
import { RequestNotice, useFocusTrap } from './shared.js';
import styles from './Deliveries.module.css';

interface DeliveryIntent {
  deliveryId: string;
  key: string;
  body: CreateDeliveryBody;
}

const readIntent = (key: string): DeliveryIntent | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as DeliveryIntent : null;
  } catch {
    return null;
  }
};

const storeIntent = (key: string, intent: DeliveryIntent) => {
  try { sessionStorage.setItem(key, JSON.stringify(intent)); } catch { /* 浏览器存储不可用时仍保留内存意图。 */ }
};

const clearIntent = (key: string) => {
  try { sessionStorage.removeItem(key); } catch { /* no-op */ }
};

const sourceItems = (confirmation: DeliveryConfirmation): Array<[string, string, string | null]> => [
  ['验收会话', `修订 ${confirmation.sessionRevision}`, confirmation.source.acceptanceSessionId],
  ['S3 台词 Release', `V${confirmation.source.preEditReleaseVersion}`, confirmation.source.preEditReleaseId],
  ['S4 画面字 Release', confirmation.source.screenTextReleaseId ? `V${confirmation.source.screenTextReleaseVersion}` : '未绑定', confirmation.source.screenTextReleaseId],
  ['素材清单', `V${confirmation.source.manifestVersion}`, confirmation.source.manifestId],
  ['术语版本', `V${confirmation.source.termVersion}`, confirmation.source.termVersionId],
  ['导出模板', `V${confirmation.summaries.templateVersion}`, confirmation.templateVersionId],
] as const;

export const DeliveryConfirmPage = () => {
  const { projectId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') ?? '';
  const navigate = useNavigate();
  const intentKey = stableIntentStorageKey(projectId, sessionId);
  const confirmationQuery = useQuery({
    queryKey: ['delivery-confirmation', projectId, sessionId],
    queryFn: () => getDeliveryConfirmation(projectId, sessionId),
    enabled: Boolean(projectId && sessionId),
    retry: false,
  });
  const [owner, setOwner] = useState('');
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [commandPending, setCommandPending] = useState(false);
  const [commandError, setCommandError] = useState<unknown>(null);
  const [unknownIntent, setUnknownIntent] = useState<DeliveryIntent | null>(() => readIntent(intentKey));
  const [lookupPending, setLookupPending] = useState(false);
  const [lookupError, setLookupError] = useState<unknown>(null);
  const confirmPanelRef = useRef<HTMLDivElement>(null);
  const safeReturnRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmation = confirmationQuery.data;

  useEffect(() => {
    if (!confirmation) return;
    setOwner((value) => value || confirmation.owner);
  }, [confirmation]);

  const closeConfirm = useCallback(() => {
    if (commandPending) return;
    setConfirmOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, [commandPending]);

  useFocusTrap({ open: confirmOpen, containerRef: confirmPanelRef, initialFocusRef: safeReturnRef, onClose: closeConfirm, locked: commandPending });

  const navigateBackToAcceptance = useCallback(() => {
    if (projectId && sessionId) navigate(`/projects/${projectId}/subtitle-acceptance?sessionId=${encodeURIComponent(sessionId)}`);
  }, [navigate, projectId, sessionId]);

  const lookupResult = useCallback(async () => {
    if (!unknownIntent || lookupPending) return;
    setLookupPending(true);
    setLookupError(null);
    try {
      await getDelivery(unknownIntent.deliveryId);
      clearIntent(intentKey);
      navigate(`/deliveries/${unknownIntent.deliveryId}?transition=success`);
    } catch (error) {
      setLookupError(error);
    } finally {
      setLookupPending(false);
    }
  }, [intentKey, lookupPending, navigate, unknownIntent]);

  const createBody = useMemo(() => confirmation
    ? ({
      sessionId,
      expectedSessionRevision: confirmation.sessionRevision,
      deliveryId: '',
      sourceDigest: confirmation.sourceDigest,
      templateVersionId: confirmation.templateVersionId,
      ...(owner.trim() ? { owner: owner.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    } satisfies Omit<CreateDeliveryBody, 'deliveryId'> & { deliveryId: string })
    : null, [confirmation, note, owner, sessionId]);

  const submitCreate = useCallback(async () => {
    if (!confirmation?.canGenerate || !createBody || commandPending || unknownIntent) return;
    const existing = readIntent(intentKey);
    const intent: DeliveryIntent = existing ?? {
      deliveryId: createUuid(),
      key: commandKey('create'),
      body: { ...createBody, deliveryId: createUuid() },
    };
    if (!existing) intent.body.deliveryId = intent.deliveryId;
    storeIntent(intentKey, intent);
    setCommandPending(true);
    setCommandError(null);
    try {
      await createDelivery(projectId, intent.body, intent.key);
      clearIntent(intentKey);
      navigate(`/deliveries/${intent.deliveryId}?transition=success`);
    } catch (error) {
      if (error instanceof DeliveryApiError && !error.retryable && error.code !== 'DELIVERY_GENERATION_FAILED') {
        clearIntent(intentKey);
        setCommandError(error);
        setUnknownIntent(null);
      } else {
        setUnknownIntent(intent);
        setCommandError(null);
      }
    } finally {
      setCommandPending(false);
      setConfirmOpen(false);
    }
  }, [confirmation?.canGenerate, createBody, commandPending, intentKey, navigate, projectId, unknownIntent]);

  if (!sessionId) return <main className={`${styles.page} ${styles.confirmPage}`}><RequestNotice error={new Error('缺少 sessionId，请从字幕验收工作台进入交付确认。')} />;</main>;
  if (confirmationQuery.isPending) return <main className={`${styles.page} ${styles.confirmPage}`}><div className={styles.loadingNotice} role="status"><div><strong>正在读取交付确认</strong><p>正在读取验收来源、文件摘要和服务端资格。</p></div></div></main>;
  if (confirmationQuery.error || !confirmation) return <main className={`${styles.page} ${styles.confirmPage}`}><RequestNotice error={confirmationQuery.error ?? new Error('未读取到交付确认事实。')} retry={() => void confirmationQuery.refetch()} retryLabel="重新读取确认" /></main>;

  return (
    <main className={`${styles.page} ${styles.confirmPage}`}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Delivery product</p>
          <h1>核对并生成交付产品</h1>
          <p>确认来源版本和文件清单。交付文件生成后不可修改；如需修改请返回验收并创建修订。</p>
        </div>
        <Link className={styles.backLink} to={`/projects/${projectId}/subtitle-acceptance?sessionId=${encodeURIComponent(sessionId)}`}>返回继续修改</Link>
      </header>

      <section className={styles.contextBar} aria-label="交付确认项目上下文">
        <div className={styles.contextMain}><strong>{confirmation.projectName}</strong><span className={styles.muted}>确认来源与产品文件</span></div>
        <div className={styles.contextStats}><span>验收修订 {confirmation.sessionRevision}</span><span>通过 {confirmation.episodes.filter((episode) => episode.status === 'passed').length} 集</span><span>阻断 {confirmation.episodes.filter((episode) => episode.status !== 'passed').length} 集</span></div>
      </section>

      {commandError !== null && <RequestNotice error={commandError} retry={() => { void confirmationQuery.refetch(); }} retryLabel="重新读取确认" />}
      {unknownIntent !== null && (
        <div className={styles.notice} role="status">
          <div><strong>生成结果未知</strong><p>创建请求可能已经被服务端接受。请只查询本次生成结果，不会再次创建产品。</p><small>deliveryId：{unknownIntent.deliveryId}</small>{lookupError !== null && <small>{errorDetailsText(lookupError)}</small>}</div>
          <button className={styles.primaryButton} type="button" onClick={() => void lookupResult()} disabled={lookupPending}>{lookupPending ? '查询中…' : '查询本次生成结果'}</button>
        </div>
      )}

      <div className={styles.stack}>
        <section className={styles.panel} aria-labelledby="delivery-identity-heading">
          <div className={styles.panelHeader}><div><h2 id="delivery-identity-heading">产品身份与负责人</h2><p className={styles.sectionLead}>产品名与版本由服务端预览，浏览器不自行推算版本。</p></div></div>
          <div className={styles.identityGrid}>
            <div className={styles.field}><span>产品名预览</span><strong className={styles.value}>{confirmation.productNamePreview}</strong></div>
            <div className={styles.field}><label htmlFor="delivery-owner">负责人</label><input id="delivery-owner" value={owner} onChange={(event) => setOwner(event.target.value)} disabled={commandPending || Boolean(unknownIntent)} /></div>
            <div className={styles.field}><span>通过集数</span><strong className={styles.value}>{confirmation.episodes.filter((episode) => episode.status === 'passed').length} / {confirmation.episodes.length}</strong></div>
            <div className={styles.field}><label htmlFor="delivery-note">备注</label><textarea id="delivery-note" value={note} onChange={(event) => setNote(event.target.value)} disabled={commandPending || Boolean(unknownIntent)} placeholder="可选，记录交付说明" /></div>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="delivery-source-heading">
          <div className={styles.panelHeader}><div><h2 id="delivery-source-heading">当前已确认来源</h2><p className={styles.sectionLead}>来源 ID、版本和摘要由 S5/S7 服务端事实冻结。</p></div><span className={styles.muted}>摘要 {sourceId(confirmation.sourceDigest)}</span></div>
          <div className={styles.sourceGrid}>{sourceItems(confirmation).map(([label, version, id]) => <div className={styles.sourceItem} key={label}><span>{label}</span><div className={styles.sourceValue}><strong>{version}</strong><small>{sourceId(id)}</small></div></div>)}</div>
        </section>

        <section className={styles.panel} aria-labelledby="delivery-summary-heading">
          <div className={styles.panelHeader}><div><h2 id="delivery-summary-heading">三类文件摘要</h2><p className={styles.sectionLead}>每集同时生成台词和画面字 SRT；无画面字集也保留合法空轨文件。</p></div></div>
          <div className={styles.summaryGrid}>
            <div className={`${styles.summaryCard} ${styles.accent}`}><span>台词 SRT</span><strong>{confirmation.summaries.dialogueCueCount}</strong><p>{confirmation.summaries.dialogueEpisodes} 集 · UTF-8 SRT</p></div>
            <div className={styles.summaryCard}><span>画面字 SRT</span><strong>{confirmation.summaries.screenTextCueCount}</strong><p>{confirmation.summaries.screenTextNonEmptyEpisodes}/{confirmation.summaries.screenTextEpisodes} 集非空</p></div>
            <div className={styles.summaryCard}><span>术语 XLSX</span><strong>{confirmation.summaries.termCount}</strong><p>{confirmation.summaries.templateName} · V{confirmation.summaries.templateVersion}</p></div>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="delivery-episodes-heading">
          <div className={styles.panelHeader}><div><h2 id="delivery-episodes-heading">逐集文件清单</h2><p className={styles.sectionLead}>配对清单只读展示，不在确认页编辑字幕或术语正文。</p></div></div>
          <div className={styles.tableWrap}><table className={styles.episodeTable}><thead><tr><th>集数</th><th>台词字幕</th><th>画面字字幕</th><th>验收事实</th></tr></thead><tbody>{confirmation.episodes.map((episode) => <tr key={episode.episodeNumber}><td><strong>第 {episode.episodeNumber} 集</strong></td><td><div className={styles.fileCell}><strong>{episode.dialogueFileName}</strong><small>{episode.dialogueCueCount} 条</small></div></td><td><div className={styles.fileCell}><strong>{episode.screenTextFileName}</strong>{episode.screenTextEmpty ? <span className={styles.emptyTrack}>空轨文件 / 0 条 · UTF-8 BOM</span> : <small>{episode.screenTextCueCount} 条</small>}</div></td><td><span className={`${styles.tableStatus} ${episode.status === 'passed' ? styles.success : styles.danger}`}>{episode.status === 'passed' ? '已通过' : '待处理'}</span></td></tr>)}</tbody></table></div>
        </section>
      </div>

      {confirmation.blockers.length > 0 && <div className={styles.notice} role="status"><div><strong>当前不能生成</strong><p>服务端仍有阻断事实，完成上游验收后返回本页重新读取。</p></div><ul className={styles.blockerList}>{confirmation.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}

      <div className={styles.stickyActions}><Link className={styles.backLink} to={`/projects/${projectId}/subtitle-acceptance?sessionId=${encodeURIComponent(sessionId)}`}>返回继续修改</Link><button ref={triggerRef} className={styles.primaryButton} type="button" onClick={() => setConfirmOpen(true)} disabled={!confirmation.canGenerate || commandPending || Boolean(unknownIntent)}>生成交付产品</button></div>

      {confirmOpen && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !commandPending) closeConfirm(); }}><div ref={confirmPanelRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="delivery-confirm-dialog-title"><h2 id="delivery-confirm-dialog-title">确认生成不可变交付产品</h2><p>将按当前会话修订、来源摘要和服务端文件清单创建 {confirmation.productNamePreview}。生成后文件不可修改。</p><ul className={styles.blockerList}><li>会话修订：{confirmation.sessionRevision}</li><li>来源摘要：{sourceId(confirmation.sourceDigest)}</li><li>通过集数：{confirmation.episodes.filter((episode) => episode.status === 'passed').length}</li><li>三类文件：台词 SRT / 画面字 SRT / 术语 XLSX</li></ul><div className={styles.modalActions}><button ref={safeReturnRef} className={styles.button} type="button" onClick={closeConfirm} disabled={commandPending}>安全返回</button><button ref={confirmButtonRef} className={styles.primaryButton} type="button" onClick={() => void submitCreate()} disabled={commandPending}>{commandPending ? '确认中…' : '确认生成'}</button></div></div></div>}
    </main>
  );
};

const errorDetailsText = (error: unknown) => {
  if (error instanceof DeliveryApiError && error.requestId) return `${error.message}（${error.requestId}）`;
  return error instanceof Error ? error.message : '查询失败，请稍后重试。';
};
