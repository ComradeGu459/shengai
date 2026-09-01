import type { DeliverySource } from '@qimao-terms-cloud/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { DeliveryApiError, getDelivery, recoverDelivery, updateDeliveryMetadata } from './api.js';
import { commandKey, fileGroups, formatDateTime, sourceId } from './model.js';
import { downloadAllFiles, errorDetails, RequestNotice, StatusPill } from './shared.js';
import styles from './Deliveries.module.css';

const sourceEntries = (source: DeliverySource) => [
  ['验收会话', source.acceptanceSessionRevision ? `修订 ${source.acceptanceSessionRevision}` : '—', source.acceptanceSessionId],
  ['S3 台词 Release', source.preEditReleaseVersion ? `V${source.preEditReleaseVersion}` : '—', source.preEditReleaseId],
  ['S4 画面字 Release', source.screenTextReleaseVersion ? `V${source.screenTextReleaseVersion}` : '未绑定', source.screenTextReleaseId],
  ['术语版本', `V${source.termVersion}`, source.termVersionId],
  ['导出模板', `V${source.templateVersion}`, source.templateVersionId],
] as const;

const deliveryEventLabels: Record<string, string> = {
  'delivery.created': '已创建交付产品',
  generation_scheduled: '已提交交付生成',
  generation_recovery_scheduled: '已提交生成恢复',
  generated: '交付文件生成完成',
  generation_failed: '交付文件生成失败',
  metadata_updated: '产品信息已更新',
};

const employeeEventLabel = (kind: string) => deliveryEventLabels[kind] ?? '交付状态已更新';

export const DeliveryDetailPage = () => {
  const { deliveryId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const transition = searchParams.get('transition') === 'success';
  const titleRef = useRef<HTMLHeadingElement>(null);
  const successTitleRef = useRef<HTMLHeadingElement>(null);
  const query = useQuery({
    queryKey: ['delivery-detail', deliveryId],
    queryFn: () => getDelivery(deliveryId),
    enabled: Boolean(deliveryId),
    retry: false,
    refetchInterval: (current) => current.state.data?.product.status === 'preparing' ? 1500 : false,
  });
  const [countdown, setCountdown] = useState(5);
  const [owner, setOwner] = useState('');
  const [note, setNote] = useState('');
  const [metadataPending, setMetadataPending] = useState(false);
  const [metadataError, setMetadataError] = useState<unknown>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [recoveryError, setRecoveryError] = useState<unknown>(null);
  const [recoveryUnknown, setRecoveryUnknown] = useState(false);
  const recoveryButtonRef = useRef<HTMLButtonElement>(null);
  const product = query.data?.product;
  const manifest = query.data?.manifest;
  const successMode = transition && product?.status === 'ready';

  useEffect(() => {
    if (!product) return;
    setOwner(product.owner);
    setNote(product.note);
  }, [product?.id, product?.owner, product?.note]);

  useEffect(() => {
    if (!successMode) return;
    successTitleRef.current?.focus();
    setCountdown(5);
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [successMode]);

  useEffect(() => {
    if (!successMode || countdown !== 0) return;
    navigate(`/deliveries/${deliveryId}`, { replace: true });
  }, [countdown, deliveryId, navigate, successMode]);

  useEffect(() => {
    if (product?.status !== 'generation_failed' || recoveryPending) return;
    recoveryButtonRef.current?.focus();
  }, [product?.status, recoveryPending, recoveryUnknown]);

  const cancelTransition = () => navigate(`/deliveries/${deliveryId}`, { replace: true });

  const saveMetadata = async () => {
    if (!product || metadataPending || product.status === 'recycled') return;
    setMetadataPending(true);
    setMetadataError(null);
    try {
      await updateDeliveryMetadata(deliveryId, { owner, note }, commandKey('metadata'));
      await query.refetch();
    } catch (error) {
      setMetadataError(error);
    } finally {
      setMetadataPending(false);
    }
  };

  const recover = useCallback(async () => {
    if (recoveryPending || !product || product.status !== 'generation_failed') return;
    setRecoveryPending(true);
    setRecoveryError(null);
    setRecoveryUnknown(false);
    try {
      const result = await recoverDelivery(product.projectId, product.deliveryId, {}, commandKey('recover'));
      queryClient.setQueryData(['delivery-detail', product.deliveryId], result.product);
      navigate(`/deliveries/${product.deliveryId}?transition=success`, { replace: true });
    } catch (error) {
      if (error instanceof DeliveryApiError && error.retryable) setRecoveryUnknown(true);
      else setRecoveryError(error);
    } finally {
      setRecoveryPending(false);
    }
  }, [navigate, product, queryClient, recoveryPending]);

  const queryRecovery = async () => {
    setRecoveryPending(true);
    setRecoveryError(null);
    try {
      const result = await query.refetch();
      const status = result.data?.product.status;
      if (status === 'generation_failed') setRecoveryUnknown(false);
      if (status === 'ready') navigate(`/deliveries/${deliveryId}?transition=success`, { replace: true });
    } catch (error) {
      setRecoveryError(error);
    } finally {
      setRecoveryPending(false);
    }
  };

  if (!deliveryId) return <main className={`${styles.page} ${styles.detailPage}`}><RequestNotice error={new Error('缺少 deliveryId，无法读取交付产品。')} />;</main>;
  if (query.isPending) return <main className={`${styles.page} ${styles.detailPage}`}><div className={styles.loadingNotice} role="status"><div><strong>正在读取交付产品</strong><p>从 PostgreSQL 读取产品状态、来源和文件清单。</p></div></div></main>;
  if (query.error || !product) return <main className={`${styles.page} ${styles.detailPage}`}><RequestNotice error={query.error ?? new Error('未找到交付产品。')} retry={() => void query.refetch()} retryLabel="重新读取产品" /></main>;

  return (
    <main className={`${styles.page} ${styles.detailPage}`}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>Delivery detail</p><h1 ref={titleRef} tabIndex={-1}>{product.name}</h1><p>{product.projectName} · V{product.version} · <StatusPill status={product.status} /></p></div>
        <Link className={styles.backLink} to="/deliveries">返回交付产品库</Link>
      </header>

      {successMode && <section className={styles.successCard} aria-labelledby="delivery-success-title"><h1 ref={successTitleRef} id="delivery-success-title" tabIndex={-1}>交付产品生成成功</h1><p>{product.name} 的台词 SRT、画面字 SRT 和术语 XLSX 已由服务端固定。文件内容不可修改。</p><div className={styles.successActions}><button className={styles.primaryButton} type="button" onClick={cancelTransition}>立即进入产品详情</button><button className={styles.button} type="button" onClick={cancelTransition}>取消自动进入</button><span className={styles.muted} aria-live="polite">{countdown > 0 ? `${countdown} 秒后自动进入详情` : '正在进入详情'}</span></div></section>}

      {product.status === 'preparing' && <section className={styles.notice} role="status"><div><strong>正在生成交付产品</strong><p>服务端已接受本次生成，页面只显示真实阶段，不展示百分比或预计时间。</p><small>deliveryId：{product.deliveryId}</small></div><ol className={styles.stageList}><li>确认验收内容与来源版本</li><li>生成每集台词与画面字 SRT</li><li>生成绑定术语 XLSX 并校验清单</li></ol></section>}
      {product.status === 'generation_failed' && <section className={styles.errorNotice} role="alert"><div><strong>交付产品生成失败</strong><p>{product.failureReason ?? '服务端未提供具体失败原因。'}</p>{product.failureRequestId && <small>请求标识：{product.failureRequestId}</small>}<small>同一 deliveryId：{product.deliveryId}</small></div><div>{recoveryUnknown ? <button ref={recoveryButtonRef} className={styles.primaryButton} type="button" onClick={() => void queryRecovery()} disabled={recoveryPending}>{recoveryPending ? '查询中…' : '查询本次生成结果'}</button> : <button ref={recoveryButtonRef} className={styles.primaryButton} type="button" onClick={() => void recover()} disabled={recoveryPending}>{recoveryPending ? '恢复中…' : '恢复本次生成'}</button>}{recoveryError !== null && <p>{errorDetails(recoveryError).message}</p>}</div></section>}
      {product.status === 'recycled' && <div className={styles.notice} role="status"><div><strong>交付产品已回收</strong><p>当前产品保留历史元数据，但不可下载；恢复生命周期另立命令。</p></div></div>}

      <div className={styles.detailGrid}>
        <section className={styles.panel} aria-labelledby="detail-files-heading"><div className={styles.panelHeader}><div><h2 id="detail-files-heading">不可变文件与历史事件</h2><p className={styles.sectionLead}>文件内容只读；下载字节由服务端对象存储摘要校验。</p></div>{manifest && product.status === 'ready' && <button className={styles.button} type="button" onClick={() => downloadAllFiles(manifest.files.map((file) => file.downloadUrl))}>下载全部文件</button>}</div>{manifest ? <div className={styles.fileTree}>{fileGroups(manifest.files).map((group) => <section className={styles.fileGroup} key={group.kind}><div className={styles.fileGroupHeader}><strong>{group.label}</strong><small>{group.files.length} 个文件</small></div><ul className={styles.fileList}>{group.files.map((file) => <li key={file.id}><div className={styles.fileMeta}><strong>{file.fileName}{file.emptyTrack ? ' · 空轨 / 0 条' : ''}</strong><small>{file.episodeNumber ? `第 ${file.episodeNumber} 集` : '整剧'} · {file.cueCount} 条 · {file.sizeBytes} bytes</small></div>{product.status === 'ready' ? <a className={styles.button} href={file.downloadUrl} download>下载</a> : <span className={styles.muted}>未就绪</span>}</li>)}</ul></section>)}</div> : <div className={styles.emptyNotice}><strong>文件清单尚未就绪</strong><p>产品状态变为已就绪后，服务端会提供三类文件。</p></div>}<div className={styles.panelHeader} style={{ marginTop: 22 }}><div><h3>历史事件</h3><p className={styles.sectionLead}>每次确认、生成和恢复均保留 requestId。</p></div></div><ul className={styles.eventList}>{query.data.events.map((event) => <li key={event.id}><strong>{employeeEventLabel(event.kind)}</strong><small>{formatDateTime(event.createdAt)} · {event.requestId}</small></li>)}</ul></section>

        <aside className={styles.stack}>
          <section className={styles.panel} aria-labelledby="detail-meta-heading"><div className={styles.panelHeader}><div><h2 id="detail-meta-heading">产品信息</h2><p className={styles.sectionLead}>负责人和备注是可更新元数据，文件内容与来源不可更新。</p></div></div><div className={styles.metaForm}><label>负责人<input value={owner} onChange={(event) => setOwner(event.target.value)} disabled={metadataPending || product.status === 'recycled'} /></label><label>备注<textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={metadataPending || product.status === 'recycled'} /></label><div className={styles.metaFormActions}><button className={styles.primaryButton} type="button" onClick={() => void saveMetadata()} disabled={metadataPending || product.status === 'recycled'}>{metadataPending ? '保存中…' : '保存信息'}</button></div>{metadataError !== null && <RequestNotice error={metadataError} retry={() => void saveMetadata()} />}</div></section>
          <section className={styles.panel} aria-labelledby="detail-source-heading"><div className={styles.panelHeader}><div><h2 id="detail-source-heading">来源与版本</h2><p className={styles.sectionLead}>创建时冻结，后续来源变化不会覆盖本产品。</p></div></div><div className={styles.stack}>{sourceEntries(product.source).map(([label, version, id]) => <div className={styles.metaItem} key={label}><span>{label}</span><strong>{version}</strong><small>{sourceId(id)}</small></div>)}<div className={styles.metaItem}><span>生成请求</span><strong>{sourceId(product.requestId)}</strong><small>deliveryId：{product.deliveryId}</small></div><div className={styles.metaItem}><span>时间</span><strong>{formatDateTime(product.createdAt)}</strong><small>更新于 {formatDateTime(product.updatedAt)}</small></div></div></section>
          <section className={styles.panel}><h3>需要修改内容？</h3><p className={styles.sectionLead}>返回验收流程创建新的工作副本；当前产品与文件保持不可变。</p><Link className={styles.button} to={`/projects/${product.projectId}/subtitle-acceptance?sessionId=${encodeURIComponent(product.acceptanceSessionId)}`}>返回验收创建修订</Link></section>
        </aside>
      </div>
    </main>
  );
};
