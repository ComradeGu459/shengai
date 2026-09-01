import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { FeedbackCreateBody, FeedbackKind, FeedbackScreenshotAuthorizationBody, FeedbackTaskType } from '@qimao-terms-cloud/contracts';
import { createUuid } from '../../platform/randomUuid.js';
import { authorizeScreenshot, completeScreenshot, createFeedback, FeedbackApiError, getFeedback, getFeedbackAttachment, uploadScreenshot } from './api.js';
import styles from './Feedback.module.css';

const kinds: Array<{ value: FeedbackKind; label: string }> = [
  { value: 'no_response', label: '没有反应' }, { value: 'display_incorrect', label: '显示不正确' }, { value: 'state_incorrect', label: '状态不正确' },
  { value: 'slow', label: '操作缓慢' }, { value: 'unclear_next_step', label: '不清楚下一步' }, { value: 'suggestion', label: '改进建议' },
];
const taskTypes = new Set<FeedbackTaskType>(['asr_dispatch', 'asr_batch', 'screen_text_batch', 'term_extraction', 'pre_review_preparation', 'delivery_generation']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const makeId = createUuid;
const fileBytes = (file: File): Promise<ArrayBuffer> => {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('无法读取截图'));
    reader.readAsArrayBuffer(file);
  });
};
const digestHex = async (bytes: ArrayBuffer) => { const digest = await crypto.subtle.digest('SHA-256', bytes); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''); };
const routeTemplate = (path: string) => path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id').replace(/\/\d+(?=\/|$)/g, '/:id') || '/';
const isRetryable = (error: unknown) => error instanceof FeedbackApiError ? error.retryable || error.status === 0 || error.status >= 500 : true;
const errorText = (error: unknown) => error instanceof FeedbackApiError ? `${error.message}${error.requestId ? ` · requestId: ${error.requestId}` : ''}` : '网络请求结果未知，请查询本次反馈结果。';
const shortId = (value: string | null | undefined) => value ? `${value.slice(0, 8)}…` : '暂无';
const browserSummary = () => {
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const match = userAgent.match(/Edg\/([\d.]+)/i) ?? userAgent.match(/OPR\/([\d.]+)/i) ?? userAgent.match(/Chrome\/([\d.]+)/i) ?? userAgent.match(/Firefox\/([\d.]+)/i) ?? userAgent.match(/Version\/([\d.]+)/i);
  const family = match ? (userAgent.match(/Edg\//i) ? 'Edge' : userAgent.match(/OPR\//i) ? 'Opera' : userAgent.match(/Firefox\//i) ? 'Firefox' : userAgent.match(/Chrome\//i) ? 'Chrome' : 'Safari') : 'Browser';
  const version = match?.[1] ?? 'unknown';
  return { family, version, ...(navigator.platform ? { platform: navigator.platform.slice(0, 60) } : {}) };
};

type Stage = 'create' | 'authorize' | 'upload' | 'complete';
type FrozenIntent = { feedbackId: string; createBody: FeedbackCreateBody; createKey: string; attachmentId?: string; authBody?: FeedbackScreenshotAuthorizationBody; authKey?: string; uploadKey?: string; completeKey?: string; fileBytes?: ArrayBuffer; fileContentType?: string; stage: Stage };
type Verification = { complete: boolean; nextStage?: Exclude<Stage, 'create'> };
export type FeedbackNotice = { kind: 'create_error' | 'report_created_without_screenshot'; message: string };
type Props = { open: boolean; onClose: () => void; routePath: string; onNotice?: (notice: FeedbackNotice) => void };

export const FeedbackButton = ({ onClick }: { onClick: () => void }) => <button type="button" className={styles.feedbackButton} onClick={(event) => { event.currentTarget.focus(); onClick(); }}>反馈问题</button>;

export const FeedbackModal = ({ open, onClose, routePath, onNotice }: Props) => {
  const [kind, setKind] = useState<FeedbackKind>('no_response'); const [description, setDescription] = useState(''); const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(null); const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState(false); const [partial, setPartial] = useState(false);
  const [recovery, setRecovery] = useState<{ feedbackId: string; attachmentId?: string; stage: Stage; requestId?: string | null } | null>(null); const [continuationStage, setContinuationStage] = useState<Exclude<Stage, 'create'> | null>(null);
  const layerRef = useRef<HTMLDivElement>(null); const triggerRef = useRef<HTMLElement | null>(null); const intentRef = useRef<FrozenIntent | null>(null); const recoveryBusy = useRef(false); const noticeOwnsFocusRef = useRef(false);
  const successRef = useRef<HTMLDivElement>(null); const errorRef = useRef<HTMLDivElement>(null); const recoveryRef = useRef<HTMLDivElement>(null); const previewUrlRef = useRef<string | null>(null);

  useLayoutEffect(() => { if (!open) return; triggerRef.current = document.activeElement as HTMLElement; layerRef.current?.querySelector<HTMLElement>('button:not([disabled]),textarea,input:not([disabled])')?.focus(); }, [open]);
  useEffect(() => {
    if (open) return;
    if (noticeOwnsFocusRef.current) {
      noticeOwnsFocusRef.current = false;
      triggerRef.current = null;
      return;
    }
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => { const root = layerRef.current; if (!root) return; if (event.key === 'Escape') { if (!pending) { event.preventDefault(); close(); } return; } if (event.key !== 'Tab') return; const nodes = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),textarea,input:not([disabled]),[tabindex]:not([tabindex="-1"])')); if (!nodes.length) { event.preventDefault(); root.focus(); return; } const first = nodes[0]!; const last = nodes.at(-1)!; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } };
    layerRef.current?.addEventListener('keydown', onKey); return () => layerRef.current?.removeEventListener('keydown', onKey);
  }, [open, pending]);
  useLayoutEffect(() => { if (success) successRef.current?.focus(); else if (error) errorRef.current?.focus(); else if (recovery && !pending) recoveryRef.current?.focus(); }, [success, error, recovery, pending]);
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);

  if (!open) return null;
  const params = new URLSearchParams(window.location.search); const rawTaskType = params.get('taskType'); const taskType = rawTaskType && taskTypes.has(rawTaskType as FeedbackTaskType) ? rawTaskType as FeedbackTaskType : null;
  const rawResourceId = params.get('resourceId'); const resourceId = rawResourceId && uuidPattern.test(rawResourceId) ? rawResourceId : null; const projectId = window.location.pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const context = { routeTemplate: routeTemplate(routePath), buildVersion: import.meta.env.VITE_BUILD_VERSION ?? 'dev', requestIds: [] as string[], browserSummary: browserSummary(), viewport: { width: window.innerWidth, height: window.innerHeight }, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown', ...(projectId && uuidPattern.test(projectId) ? { projectId } : {}), ...(taskType && resourceId ? { taskType, resourceId } : {}) };
  const close = (notice?: FeedbackNotice) => { if (pending) return; const finalNotice = notice ?? (partial && !success && intentRef.current ? { kind: 'report_created_without_screenshot' as const, message: '反馈已创建，截图未附上；管理员仍可看到这条反馈。' } : undefined); noticeOwnsFocusRef.current = Boolean(finalNotice); if (finalNotice) onNotice?.(finalNotice); if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; setFile(null); setPreview(null); setPrivacyConfirmed(false); setError(null); setRecovery(null); setContinuationStage(null); setPartial(false); setSuccess(false); intentRef.current = null; onClose(); };
  const onFile = (event: ChangeEvent<HTMLInputElement>) => { if (intentRef.current) return; if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; setFile(null); setPreview(null); setPrivacyConfirmed(false); const next = event.target.files?.[0] ?? null; if (!next) return; if (!['image/png', 'image/jpeg', 'image/webp'].includes(next.type) || next.size > 5_000_000) { setError('截图必须是 PNG、JPEG 或 WebP，且不超过 5MB。'); event.target.value = ''; return; } const url = URL.createObjectURL(next); previewUrlRef.current = url; setFile(next); setError(null); const image = new Image(); image.onload = () => { if (previewUrlRef.current === url) setPreview({ url, width: image.naturalWidth, height: image.naturalHeight }); }; image.src = url; };
  const verifyResult = async (intent: FrozenIntent): Promise<Verification> => {
    const detail = await getFeedback(intent.feedbackId); if (!intent.attachmentId) return { complete: true };
    let attachment = detail.attachment && detail.attachment.attachmentId === intent.attachmentId ? detail.attachment : null;
    try { attachment = await getFeedbackAttachment(intent.feedbackId, intent.attachmentId); }
    catch (caught) { if (!(caught instanceof FeedbackApiError) || caught.status !== 404) throw caught; }
    if (attachment?.status === 'uploaded') return { complete: true };
    const nextStage: Exclude<Stage, 'create'> = intent.stage === 'create' ? (attachment?.status === 'authorized' ? 'upload' : 'authorize') : intent.stage === 'authorize' ? (attachment?.status === 'authorized' ? 'upload' : 'authorize') : intent.stage === 'upload' ? 'upload' : 'complete';
    return { complete: false, nextStage };
  };
  const executeStage = async (intent: FrozenIntent, stage: Stage) => { intent.stage = stage; if (stage === 'create') { await createFeedback(intent.createBody, intent.createKey); return; } if (stage === 'authorize' && intent.attachmentId && intent.authBody && intent.authKey) { await authorizeScreenshot(intent.feedbackId, intent.authBody, intent.authKey); return; } if (stage === 'upload' && intent.attachmentId && intent.fileBytes && intent.fileContentType && intent.uploadKey) { await uploadScreenshot(intent.feedbackId, intent.attachmentId, intent.fileBytes, intent.fileContentType, intent.uploadKey); return; } if (stage === 'complete' && intent.attachmentId && intent.completeKey) await completeScreenshot(intent.feedbackId, intent.attachmentId, intent.completeKey); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!description.trim()) { setError('请描述遇到的问题。'); return; } if (file && !privacyConfirmed) { setError('选择截图后，请先确认截图不含敏感信息。'); return; }
    setPending(true); setError(null); setRecovery(null); setContinuationStage(null); setPartial(false); const feedbackId = makeId(); const intent: FrozenIntent = { feedbackId, createBody: { feedbackId, kind, description: description.trim(), ...context }, createKey: makeId(), stage: 'create' };
    if (file) { const attachmentId = makeId(); const bytes = await fileBytes(file); intent.attachmentId = attachmentId; intent.fileBytes = bytes; intent.fileContentType = file.type; intent.authKey = makeId(); intent.uploadKey = makeId(); intent.completeKey = makeId(); intent.authBody = { attachmentId, contentType: file.type as 'image/png' | 'image/jpeg' | 'image/webp', sizeBytes: file.size, contentDigest: await digestHex(bytes), privacyConfirmed: true }; }
    intentRef.current = intent;
    try { await executeStage(intent, 'create'); if (file) { await executeStage(intent, 'authorize'); await executeStage(intent, 'upload'); await executeStage(intent, 'complete'); } const verification = await verifyResult(intent); setPartial(!verification.complete); setContinuationStage(verification.nextStage ?? null); setSuccess(verification.complete); }
    catch (caught) { if (isRetryable(caught)) setRecovery({ feedbackId, stage: intent.stage, ...(intent.attachmentId ? { attachmentId: intent.attachmentId } : {}), requestId: caught instanceof FeedbackApiError ? caught.requestId : null }); else { const message = errorText(caught); setPending(false); close({ kind: 'create_error', message }); } }
    finally { setPending(false); }
  };
  const recover = async () => { const current = recovery; if (!current || recoveryBusy.current) return; recoveryBusy.current = true; setPending(true); setError(null); try { const intent = intentRef.current; if (!intent || intent.feedbackId !== current.feedbackId || (current.attachmentId && intent.attachmentId !== current.attachmentId)) return; const verification = await verifyResult(intent); setPartial(!verification.complete); setContinuationStage(verification.nextStage ?? null); setSuccess(verification.complete); if (verification.complete) setRecovery(null); } catch (caught) { setRecovery((previous) => { if (!previous) return previous; const requestId = caught instanceof FeedbackApiError ? caught.requestId : previous.requestId; return requestId === undefined ? previous : { ...previous, requestId }; }); } finally { recoveryBusy.current = false; setPending(false); } };
  const continueUpload = async () => {
    const intent = intentRef.current; const stage = continuationStage; if (!intent || !stage || !intent.attachmentId || recoveryBusy.current || pending) return;
    recoveryBusy.current = true; setPending(true); setError(null); setRecovery(null); setContinuationStage(null);
    try {
      if (stage === 'authorize') { await executeStage(intent, 'authorize'); await executeStage(intent, 'upload'); await executeStage(intent, 'complete'); }
      else if (stage === 'upload') { await executeStage(intent, 'upload'); await executeStage(intent, 'complete'); }
      else await executeStage(intent, 'complete');
      const verification = await verifyResult(intent); setPartial(!verification.complete); setContinuationStage(verification.nextStage ?? null); setSuccess(verification.complete); if (verification.complete) setRecovery(null);
    } catch (caught) {
      if (isRetryable(caught)) { setPartial(true); setContinuationStage(null); setRecovery({ feedbackId: intent.feedbackId, attachmentId: intent.attachmentId, stage: intent.stage, requestId: caught instanceof FeedbackApiError ? caught.requestId : null }); }
      else { const message = errorText(caught); setPending(false); close({ kind: 'report_created_without_screenshot', message: `反馈已创建，但截图未附上。${message}` }); }
    } finally { recoveryBusy.current = false; setPending(false); }
  };
  const successLabel = file ? '反馈和截图已提交' : '反馈已提交';
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) { event.preventDefault(); event.stopPropagation(); close(); } }}><section ref={layerRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="feedback-title" aria-busy={pending} data-locked={pending} tabIndex={-1}>
    <header className={styles.header}><div><span className={styles.eyebrow}>反馈与改进</span><h2 id="feedback-title" tabIndex={-1}>反馈当前页面的问题</h2></div><button type="button" className={styles.close} aria-label="安全返回" onClick={() => close()} disabled={pending}>×</button></header>
    {success ? <div ref={successRef} className={styles.success} role="status" tabIndex={-1}><strong>{successLabel}</strong><span>感谢你的反馈，管理员会根据真实上下文处理。</span><button type="button" className={styles.primary} onClick={() => close()}>返回当前页面</button></div> : <form onSubmit={submit}><fieldset disabled={pending || Boolean(intentRef.current)} className={styles.fieldset}><legend>问题类型</legend><div className={styles.kinds}>{kinds.map((item) => <label key={item.value} className={styles.kind}><input type="radio" name="feedback-kind" checked={kind === item.value} onChange={() => setKind(item.value)} />{item.label}</label>)}</div><label className={styles.label}><span>问题描述</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder="请描述你看到的现象和期望结果" rows={5} required /></label><label className={styles.label}><span>截图（可选，默认不上传）</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} />{file ? <small>已选择图片（{Math.ceil(file.size / 1024)} KB），不发送文件名</small> : <small>支持 PNG、JPEG、WebP，最大 5MB</small>}</label>{preview ? <div className={styles.preview}><img src={preview.url} alt="已选择的本地截图预览" /><span>{preview.width} × {preview.height}px · {Math.ceil((file?.size ?? 0) / 1024)} KB</span></div> : null}{file ? <label className={styles.privacy}><input type="checkbox" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} />我确认截图不含密码、密钥、个人隐私或其他敏感信息</label> : null}</fieldset>
      <section className={styles.context} aria-label="安全信息"><strong>随反馈发送的安全信息</strong><dl><div><dt>页面模板</dt><dd>{context.routeTemplate}</dd></div><div><dt>应用版本</dt><dd>{context.buildVersion}</dd></div><div><dt>浏览器</dt><dd>{context.browserSummary.family} / {context.browserSummary.version}</dd></div><div><dt>窗口 / 时区</dt><dd>{context.viewport.width} × {context.viewport.height} · {context.timezone}</dd></div><div><dt>项目 / 任务</dt><dd>{context.projectId ? shortId(context.projectId) : '暂无'} · {context.taskType && context.resourceId ? `${context.taskType} / ${shortId(context.resourceId)}` : '未采集'}</dd></div><div><dt>requestId / 性能</dt><dd>{context.requestIds.length ? context.requestIds.join('、') : '暂无'} · 未采集</dd></div></dl><small>仅发送安全摘要，不包含正文、文件名、对象键或敏感信息。</small></section>
      {partial ? <div className={styles.partial} role="status" tabIndex={-1}><strong>反馈已创建，截图尚未确认完成</strong><span>服务端尚未确认附件上传完成，未将其显示为完整成功。</span>{continuationStage ? <button type="button" className={styles.primary} onClick={continueUpload} disabled={pending}>{pending ? '继续中…' : '继续上传已确认截图'}</button> : null}</div> : null}{error ? <div ref={errorRef} className={styles.error} role="alert" tabIndex={-1}>{error}</div> : null}{recovery ? <div ref={recoveryRef} className={styles.recovery} role="alert" tabIndex={-1}><strong>反馈提交结果未知</strong><span>{recovery.requestId ? `requestId: ${recovery.requestId}；` : ''}未重发原命令，请查询同一反馈。</span><button type="button" className={styles.primary} onClick={recover} disabled={pending}>{pending ? '查询中…' : '查询本次反馈结果'}</button></div> : null}<footer className={styles.footer}><button type="button" className={styles.secondary} onClick={() => close()} disabled={pending}>取消</button><button type="submit" className={styles.primary} disabled={pending || Boolean(intentRef.current)}>{pending ? '提交中…' : '提交反馈'}</button></footer></form>}
  </section></div>;
};
