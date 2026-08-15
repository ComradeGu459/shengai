import { useQuery } from '@tanstack/react-query';
import type {
  AsrBatchDetail,
  AsrBatchPreparation,
  AsrJob,
  CreateAsrBatchBody,
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

import { AsrApiError, getAsrBatchHotwords } from './api.js';
import {
  formatDateTime,
  formatUsage,
  hotwordOmissionReasonLabels,
  hotwordReceiptReasonLabels,
  jobStatusLabels,
  qualityStatusLabels,
  receiptLabels,
} from './model.js';
import styles from './AsrWorkspace.module.css';

const focusableSelector = [
  'button:not(:disabled)', 'input:not(:disabled)', 'select:not(:disabled)',
  'textarea:not(:disabled)', 'a[href]', '[tabindex]:not([tabindex="-1"])',
].join(',');

export const trapFocus = (event: KeyboardEvent<HTMLElement>, container: HTMLElement | null) => {
  if (event.key !== 'Tab') return;
  const focusable = [...(container?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])]
    .filter((element) => element.offsetParent !== null || element === document.activeElement);
  if (!focusable.length) {
    event.preventDefault();
    container?.focus();
    return;
  }
  const first = focusable[0]!;
  const last = focusable.at(-1)!;
  if (document.activeElement === container) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

interface NewBatchPanelProps {
  preparation: AsrBatchPreparation | null;
  preparationLoading: boolean;
  preparationError: Error | null;
  termVersionId: string | null;
  termVersion: number | null;
  sourceReady: boolean;
  forceNewRecognition: boolean;
  returnFocus: RefObject<HTMLElement | null>;
  onForceNewRecognitionChange: (value: boolean) => void;
  onRetryPreparation: () => void;
  onContinue: (body: CreateAsrBatchBody, reusableCount: number) => void;
  onClose: () => void;
}

export const NewBatchPanel = ({
  preparation,
  preparationLoading,
  preparationError,
  termVersionId,
  termVersion,
  sourceReady,
  forceNewRecognition,
  returnFocus,
  onForceNewRecognitionChange,
  onRetryPreparation,
  onContinue,
  onClose,
}: NewBatchPanelProps) => {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const focusAfterPreparationRecoveryRef = useRef(false);
  const [scope, setScope] = useState<'all' | 'selected' | 'single'>('all');
  const [selected, setSelected] = useState<number[]>([]);
  const episodes = preparation?.episodes ?? [];
  const [single, setSingle] = useState(episodes[0]?.episodeNumber ?? 1);

  useEffect(() => {
    closeRef.current?.focus();
    return () => returnFocus.current?.focus();
  }, [returnFocus]);

  useLayoutEffect(() => {
    if (!focusAfterPreparationRecoveryRef.current || preparationLoading || preparationError || !preparation) return;
    focusAfterPreparationRecoveryRef.current = false;
    closeRef.current?.focus();
  }, [preparation, preparationError, preparationLoading]);

  useEffect(() => {
    if (episodes.some((item) => item.episodeNumber === single)) return;
    setSingle(episodes[0]?.episodeNumber ?? 1);
  }, [episodes, single]);

  const requested = scope === 'all'
    ? episodes.map((item) => item.episodeNumber)
    : scope === 'single' ? [single] : selected;
  const requestedSet = new Set(requested);
  const requestedRows = episodes.filter((item) => requestedSet.has(item.episodeNumber));
  const blocked = requestedRows.filter((item) => item.status === 'blocked');
  const reusableCount = requestedRows.filter((item) => item.status === 'reusable').length;
  const preparationRequestId = preparationError instanceof AsrApiError ? preparationError.requestId : null;
  const valid = Boolean(termVersionId) && sourceReady && preparation && !preparationLoading
    && !preparationError && requested.length > 0 && blocked.length === 0;

  const continueToConfirm = () => {
    if (!valid || !termVersionId) return;
    const body: CreateAsrBatchBody = scope === 'all'
      ? { scope: { kind: 'all' }, termVersionId, ...(forceNewRecognition ? { forceNewRecognition: true } : {}) }
      : scope === 'single'
        ? { scope: { kind: 'single', episodeNumber: single }, termVersionId, ...(forceNewRecognition ? { forceNewRecognition: true } : {}) }
        : { scope: { kind: 'selected', episodeNumbers: [...selected].sort((a, b) => a - b) }, termVersionId, ...(forceNewRecognition ? { forceNewRecognition: true } : {}) };
    onContinue(body, reusableCount);
  };

  const close = () => onClose();
  return (
    <div className={styles.panelBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <aside
        ref={panelRef}
        className={styles.sidePanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-asr-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); close(); }
          trapFocus(event, panelRef.current);
        }}
      >
        <header className={styles.panelHeader}>
          <div><span>项目工作台 · 中文识别</span><h2 id="new-asr-title">新建模拟识别批次</h2></div>
          <button ref={closeRef} type="button" onClick={close} aria-label="关闭新建批次">×</button>
        </header>

        <div className={styles.identitySummary}>
          <div><span>固定术语版本</span><strong>{termVersion ? `V${termVersion}` : '尚未确认'}</strong></div>
          <div><span>可选视频</span><strong>{episodes.filter((item) => item.status !== 'blocked').length} / {episodes.length} 集已校验</strong></div>
          <div><span>识别模式</span><strong>模拟识别</strong></div>
        </div>

        <fieldset className={styles.scopeSelector}>
          <legend>识别范围</legend>
          <label><input type="radio" name="asr-scope" checked={scope === 'all'} onChange={() => setScope('all')} />整剧</label>
          <label><input type="radio" name="asr-scope" checked={scope === 'selected'} onChange={() => setScope('selected')} />选中集</label>
          <label><input type="radio" name="asr-scope" checked={scope === 'single'} onChange={() => setScope('single')} />单集</label>
        </fieldset>

        {scope === 'single' && (
          <label className={styles.singleSelect}>选择集数
            <select value={single} onChange={(event) => setSingle(Number(event.target.value))}>
              {episodes.map((item) => <option key={item.episodeNumber} value={item.episodeNumber}>第 {item.episodeNumber} 集</option>)}
            </select>
          </label>
        )}

        <section className={styles.episodePreview} aria-label="逐集门禁预览">
          <header><strong>逐集门禁预览</strong><span>已选择 {requested.length} 集</span></header>
          {preparationLoading && <p aria-busy="true">正在读取服务端逐集准备事实…</p>}
          {!preparationLoading && !preparationError && episodes.length === 0 && <p>最新素材清单中没有中文识别视频槽位。</p>}
          {episodes.map((item) => {
            const chosen = requestedSet.has(item.episodeNumber);
            const ready = item.status !== 'blocked';
            return (
              <label key={item.episodeNumber} className={chosen ? styles.chosenEpisode : undefined}>
                {scope === 'selected'
                  ? <input type="checkbox" checked={chosen} onChange={(event) => setSelected((current) => event.target.checked
                    ? [...new Set([...current, item.episodeNumber])].sort((a, b) => a - b)
                    : current.filter((episode) => episode !== item.episodeNumber))} />
                  : <span className={styles.episodeMarker} aria-hidden="true">{chosen ? '●' : '○'}</span>}
                <span><strong>第 {item.episodeNumber} 集</strong><small>{item.blockers[0]?.message ?? item.assetOriginalFilename ?? '尚未绑定来源视频'}</small></span>
                <span className={`${styles.gateResult} ${ready ? styles.gateReady : styles.gateBlocked}`}>
                  {item.status === 'reusable' ? '可复用' : item.status === 'executable' ? '可执行' : '视频未校验'}
                </span>
              </label>
            );
          })}
        </section>

        <label className={styles.forceOption}>
          <input type="checkbox" checked={forceNewRecognition} onChange={(event) => onForceNewRecognitionChange(event.target.checked)} />
          <span><strong>创建新的结果修订</strong><small>即使存在完全同源结果也重新运行；历史结果不会被覆盖。</small></span>
        </label>

        {!termVersionId && <div className={styles.inlineError} role="alert">术语版本尚未确认。请先返回术语页完成确认。</div>}
        {!sourceReady && <div className={styles.inlineError} role="alert">当前素材或项目状态不允许创建识别批次。</div>}
        {preparationError && <div className={styles.inlineError} role="alert"><strong>逐集准备读取失败</strong><span>{preparationError.message}</span>{preparationRequestId && <span>请求标识：{preparationRequestId}</span>}<button type="button" onClick={() => { focusAfterPreparationRecoveryRef.current = true; onRetryPreparation(); }}>重新读取准备事实</button></div>}
        {blocked.length > 0 && <div className={styles.inlineError} role="alert">所选范围含 {blocked.length} 集未校验视频；系统不会静默排除。</div>}

        <footer className={styles.panelActions}>
          <button type="button" onClick={close}>取消</button>
          <button className={styles.primaryButton} type="button" disabled={!valid} onClick={continueToConfirm}>确认批次信息</button>
        </footer>
      </aside>
    </div>
  );
};

interface CommandDialogProps {
  title: string;
  description: string;
  detail: string;
  confirmLabel: string;
  pending: boolean;
  error: Error | null;
  returnFocus: RefObject<HTMLElement | null>;
  onConfirm: () => void;
  onClose: () => void;
}

export const CommandDialog = ({
  title, description, detail, confirmLabel, pending, error, returnFocus, onConfirm, onClose,
}: CommandDialogProps) => {
  const dialogRef = useRef<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    (pending ? dialogRef.current : cancelRef.current)?.focus();
  }, [pending]);
  useEffect(() => () => returnFocus.current?.focus(), [returnFocus]);
  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !pending) onClose();
    }}>
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asr-confirm-title"
        aria-busy={pending}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !pending) { event.preventDefault(); onClose(); }
          trapFocus(event, dialogRef.current);
        }}
      >
        <h2 id="asr-confirm-title">{title}</h2>
        <p>{description}</p>
        <div className={styles.confirmDetail}>{detail}</div>
        {error && <div className={styles.inlineError} role="alert"><strong>{error.name === 'AsrApiError' ? '请求未完成' : '网络结果未知'}</strong><span>{error.message}</span></div>}
        <footer className={styles.dialogActions}>
          <button ref={cancelRef} type="button" onClick={onClose} disabled={pending}>取消</button>
          <button className={styles.primaryButton} type="button" onClick={onConfirm} disabled={pending}>{pending ? '处理中…' : confirmLabel}</button>
        </footer>
      </section>
    </div>
  );
};

type DetailPanel =
  | { kind: 'hotwords'; batch: AsrBatchDetail }
  | { kind: 'quality'; batch: AsrBatchDetail; job: AsrJob }
  | { kind: 'reconciliation'; batch: AsrBatchDetail; job?: AsrJob };

interface EvidencePanelProps {
  projectId: string;
  panel: DetailPanel;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
}

export const EvidencePanel = ({ projectId, panel, returnFocus, onClose }: EvidencePanelProps) => {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const focusAfterHotwordRecoveryRef = useRef(false);
  const hotwords = useQuery({
    queryKey: ['asr-batch-hotwords', projectId, panel.batch.id],
    queryFn: () => getAsrBatchHotwords(projectId, panel.batch.id),
    enabled: panel.kind === 'hotwords',
  });
  useEffect(() => {
    closeRef.current?.focus();
    return () => returnFocus.current?.focus();
  }, [returnFocus]);

  useLayoutEffect(() => {
    if (panel.kind !== 'hotwords' || !focusAfterHotwordRecoveryRef.current || !hotwords.isSuccess || hotwords.isFetching) return;
    focusAfterHotwordRecoveryRef.current = false;
    closeRef.current?.focus();
  }, [hotwords.isFetching, hotwords.isSuccess, panel.kind]);

  const attempts = panel.kind === 'quality'
    ? panel.job.attempts
    : panel.kind === 'reconciliation' && panel.job
      ? panel.job.attempts
      : panel.batch.jobs.flatMap((job) => job.attempts);
  const receipts = useMemo(() => attempts.filter((attempt) => attempt.hotwordReceipt), [attempts]);
  const hotwordRequestId = hotwords.error instanceof AsrApiError ? hotwords.error.requestId : null;
  const title = panel.kind === 'hotwords' ? '本批次热词证据'
    : panel.kind === 'quality' ? `第 ${panel.job.episodeNumber} 集质量与尝试`
      : '需对账说明';

  return (
    <div className={styles.panelBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside
        ref={panelRef}
        className={styles.sidePanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asr-evidence-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); onClose(); }
          trapFocus(event, panelRef.current);
        }}
      >
        <header className={styles.panelHeader}>
          <div><span>项目工作台 · 中文识别</span><h2 id="asr-evidence-title">{title}</h2></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={`关闭${title}`}>×</button>
        </header>

        {panel.kind === 'hotwords' && (
          <>
            {hotwords.isLoading && <p>正在读取批次绑定热词证据…</p>}
            {hotwords.error && <div className={styles.inlineError} role="alert"><strong>热词证据读取失败</strong><span>{hotwords.error.message}</span>{hotwordRequestId && <span>请求标识：{hotwordRequestId}</span>}<button type="button" onClick={() => { focusAfterHotwordRecoveryRef.current = true; void hotwords.refetch(); }}>重新读取热词证据</button></div>}
            {hotwords.data && (
              <div className={styles.evidenceContent}>
                <dl>
                  <div><dt>术语版本</dt><dd>{panel.batch.termVersionIsLatest ? '当前最新版本' : '术语版本已过期'} · {panel.batch.termVersionId.slice(0, 8)}</dd></div>
                  <div><dt>投影版本</dt><dd>{hotwords.data.summary.projectionVersion}</dd></div>
                  <div><dt>稳定摘要</dt><dd><code>{hotwords.data.summary.digest.slice(0, 16)}…</code></dd></div>
                  <div><dt>实际纳入</dt><dd>{hotwords.data.summary.termCount + hotwords.data.summary.aliasCount} 项</dd></div>
                  <div><dt>规则过滤</dt><dd>{hotwords.data.summary.filteredCount} 项</dd></div>
                  <div><dt>适配器截断</dt><dd>{hotwords.data.summary.truncatedCount} 项</dd></div>
                </dl>
                <p className={styles.accuracyNotice}>热词链路已接通，准确率未验证。已发送不等于准确率已提升。</p>
                <details><summary>已纳入热词示例</summary><ul>{hotwords.data.entries.slice(0, 20).map((entry, index) => <li key={`${entry.text}-${index}`}>{entry.text} · {entry.source === 'term' ? '术语' : '人名别称'}</li>)}</ul></details>
                <details><summary>过滤与截断证据</summary>{hotwords.data.omittedEntries.length
                  ? <ul>{hotwords.data.omittedEntries.map((entry) => <li key={`${entry.order}-${entry.text}-${entry.reasonCode}`}>#{entry.order} · {entry.text || '空值'} · {entry.source === 'term' ? '术语' : '人名别称'} · {hotwordOmissionReasonLabels[entry.reasonCode]}（{entry.reasonCode}）</li>)}</ul>
                  : <p>本批次没有被过滤或截断的热词。</p>}</details>
                <h3>实际应用回执</h3>
                {receipts.length ? receipts.map((attempt) => (
                  <div key={attempt.id} className={styles.receiptRow}>
                    <span className={`${styles.statusTag} ${styles[attempt.hotwordReceipt!]}`}><span aria-hidden="true" />{receiptLabels[attempt.hotwordReceipt!]}</span>
                    <code>{attempt.hotwordReceipt}</code>
                    <small>{formatHotwordReceiptFacts(attempt)}</small>
                  </div>
                )) : <p>任务尚未形成热词应用回执。</p>}
              </div>
            )}
          </>
        )}

        {panel.kind === 'quality' && (
          <div className={styles.evidenceContent}>
            <dl>
              <div><dt>运行状态</dt><dd>{jobStatusLabels[panel.job.status]}</dd></div>
              <div><dt>质量结论</dt><dd>{panel.job.currentResult ? qualityStatusLabels[panel.job.currentResult.qualityStatus] : '尚未形成'}</dd></div>
              <div><dt>来源视频</dt><dd>{panel.job.assetOriginalFilename}</dd></div>
              <div><dt>结果修订</dt><dd>{panel.job.currentResult ? `R${panel.job.currentResult.revision}` : '—'}</dd></div>
            </dl>
            {panel.job.currentResult && <QualityFacts job={panel.job} />}
            <AttemptHistory attempts={panel.job.attempts} />
          </div>
        )}

        {panel.kind === 'reconciliation' && (
          <div className={styles.evidenceContent}>
            <div className={styles.reconciliationNotice} role="alert">
              <strong>结果或处理用量未知</strong>
              <p>自动重试已暂停。当前没有可执行的对账命令，请保留请求标识并等待后端形成权威事实。</p>
            </div>
            <AttemptHistory attempts={attempts} />
          </div>
        )}

        <footer className={styles.panelActions}><button type="button" onClick={onClose}>关闭</button></footer>
      </aside>
    </div>
  );
};

const formatHotwordReceiptFacts = (attempt: AsrJob['attempts'][number]) => {
  const receipt = attempt.hotwordReceipt;
  const facts = attempt.hotwordReceiptFacts;
  if (receipt === 'unknown') return '没有可确认提交回执；不得推断热词已经提交。';
  const submitted = facts?.submittedCount === null || facts?.submittedCount === undefined ? '数量未记录' : `${facts.submittedCount} 项`;
  const omitted = facts?.omittedCount === null || facts?.omittedCount === undefined ? '数量未记录' : `${facts.omittedCount} 项`;
  if (receipt === 'unsupported') return `本次未应用热词，识别可能继续；省略 ${omitted}${facts?.reasonCode ? `，原因：${hotwordReceiptReasonLabels[facts.reasonCode]}` : ''}。`;
  if (receipt === 'partially_submitted') return `已发送 ${submitted}，省略 ${omitted}${facts?.reasonCode ? `；原因：${hotwordReceiptReasonLabels[facts.reasonCode]}` : ''}。`;
  if (receipt === 'submitted') return `服务已接受 ${submitted}热词，省略 ${omitted}；已发送不等于准确率已提升。`;
  if (receipt === 'simulated') return `模拟管线已读取 ${submitted}本批次热词；只证明链路，不代表真实准确率。`;
  return attempt.hotwordPayload ? `${attempt.hotwordPayload.itemCount} 项 · ${attempt.hotwordPayload.characterCount} 字` : '尚无可确认回执事实。';
};

const QualityFacts = ({ job }: { job: AsrJob }) => {
  const summary = job.currentResult!.qualitySummary;
  return (
    <dl>
      <div><dt>音频覆盖</dt><dd>{Math.round(summary.audioCoverageRatio * 100)}%</dd></div>
      <div><dt>空结果</dt><dd>{summary.emptyResult ? '是' : '否'}</dd></div>
      <div><dt>Cue 数量</dt><dd>{summary.cueCount}</dd></div>
      <div><dt>异常长段</dt><dd>{summary.longSegmentCount}</dd></div>
      <div><dt>时间轴异常</dt><dd>{summary.timelineIssueCount}</dd></div>
      <div><dt>术语命中</dt><dd>{summary.termHitCount}</dd></div>
      <div><dt>低置信片段</dt><dd>{summary.lowConfidenceCount}</dd></div>
      <div><dt>已知幻觉信号</dt><dd>{summary.hallucinationSignalCount}</dd></div>
    </dl>
  );
};

const AttemptHistory = ({ attempts }: { attempts: AsrJob['attempts'] }) => (
  <section className={styles.attemptHistory}>
    <h3>尝试历史</h3>
    {attempts.length === 0 && <p>尚未进入执行尝试。</p>}
    {attempts.map((attempt) => (
      <div key={attempt.id}>
        <span><strong>第 {attempt.attemptNumber} 次 · {attempt.status}</strong><small>{formatDateTime(attempt.createdAt)}</small></span>
        <span><small>请求标识：{attempt.providerRequestId ?? attempt.id}</small><small>{formatUsage([attempt.usage])}</small></span>
        {attempt.errorDetail && <p>{attempt.errorCode ?? '执行失败'}：{attempt.errorDetail}</p>}
      </div>
    ))}
  </section>
);
