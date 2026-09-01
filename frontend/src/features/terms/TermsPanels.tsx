import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  TermCandidateDecisionBody,
  TermExportField,
  TermExportTemplateColumn,
  TermExportTemplateVersion,
  TermGender,
  TermType,
} from '@qimao-terms-cloud/contracts';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import { createUuid } from '../../platform/randomUuid.js';
import {
  activateTermTemplate,
  createManualTermCandidate,
  createTermTemplate,
  decideTermCandidate,
  getTermCandidate,
  listTermCues,
  TermApiError,
  type TermTemplateList,
} from './api.js';
import styles from './TermsWorkspace.module.css';

export const termTypes: TermType[] = [
  '人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件',
];

const genderLabels: Record<TermGender, string> = {
  male: '男', female: '女', unknown: '未知',
};
const CUE_PAGE_SIZE = 30;

const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const trapFocus = (event: KeyboardEvent<HTMLElement>, container: HTMLElement | null) => {
  if (event.key !== 'Tab') return;
  const focusable = [...(container?.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
  ) ?? [])].filter((element) => element.offsetParent !== null || element === document.activeElement);
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

const ErrorMessage = ({ error }: { error: Error | null }) => error ? (
  <div className={styles.inlineError} role="alert">
    <strong>{error instanceof TermApiError ? error.code : 'REQUEST_FAILED'}</strong>
    <span>{error.message}</span>
    {error instanceof TermApiError && error.requestId && <small>请求标识：{error.requestId}</small>}
  </div>
) : null;

interface CandidatePanelProps {
  projectId: string;
  draftId: string;
  draftRevision: number;
  mode: 'evidence' | 'edit' | 'manual';
  candidateId?: string;
  writable: boolean;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
  onChanged: () => void;
}

export const CandidatePanel = ({
  projectId,
  draftId,
  draftRevision,
  mode,
  candidateId,
  writable,
  returnFocus,
  onClose,
  onChanged,
}: CandidatePanelProps) => {
  const panelRef = useRef<HTMLElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [type, setType] = useState<TermType>('人名');
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [gender, setGender] = useState<TermGender>('unknown');
  const [note, setNote] = useState('');
  const [cueSearch, setCueSearch] = useState('');
  const [episode, setEpisode] = useState('');
  const [cuePage, setCuePage] = useState(0);
  const [selectedCues, setSelectedCues] = useState<string[]>([]);

  const detail = useQuery({
    queryKey: ['term-candidate-detail', projectId, candidateId],
    queryFn: () => getTermCandidate(projectId, candidateId!),
    enabled: Boolean(candidateId),
  });
  const cues = useQuery({
    queryKey: ['term-cues', projectId, draftId, cueSearch, episode, cuePage],
    queryFn: () => listTermCues(projectId, {
      draftId,
      ...(cueSearch.trim() ? { search: cueSearch.trim() } : {}),
      ...(episode ? { episodeNumber: Number(episode) } : {}),
      limit: CUE_PAGE_SIZE,
      offset: cuePage * CUE_PAGE_SIZE,
    }),
    enabled: mode === 'manual',
  });

  useEffect(() => {
    if (!detail.data || mode === 'manual') return;
    setType(detail.data.type);
    setName(detail.data.name);
    setAliases(detail.data.aliases.join('、'));
    setGender(detail.data.gender);
    setNote(detail.data.note);
  }, [detail.data, mode]);

  useEffect(() => {
    setCuePage(0);
  }, [cueSearch, episode]);

  useEffect(() => {
    (mode === 'manual' || mode === 'edit' ? firstFieldRef.current : closeRef.current)?.focus();
    return () => returnFocus.current?.focus();
  }, [mode, returnFocus]);

  const mutation = useMutation({
    mutationFn: async (action: TermCandidateDecisionBody['action'] | 'manual') => {
      if (!writable) throw new Error('当前术语草稿为只读状态。');
      if (action === 'manual') {
        return createManualTermCandidate({
          projectId,
          body: {
            draftId,
            expectedDraftRevision: draftRevision,
            type,
            name: name.trim(),
            aliases: aliases.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
            gender,
            note: note.trim(),
            evidenceCueIds: selectedCues,
          },
        });
      }
      if (!detail.data) throw new Error('尚未读取候选详情。');
      if (action !== 'restore' && detail.data.status !== 'pending') {
        throw new Error('仅待确认候选可编辑或裁决；已驳回候选请先恢复。');
      }
      return decideTermCandidate({
        projectId,
        candidateId: detail.data.id,
        body: action === 'edit' ? {
          expectedVersion: detail.data.version,
          action,
          type,
          name: name.trim(),
          aliases: aliases.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
          gender,
          note: note.trim(),
        } : { expectedVersion: detail.data.version, action },
      });
    },
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  useEffect(() => {
    if (mutation.isPending) panelRef.current?.focus();
    else if (mutation.error) closeRef.current?.focus();
  }, [mutation.error, mutation.isPending]);

  const title = mode === 'manual' ? '人工新增术语' : mode === 'edit' ? '编辑术语' : '术语证据';
  const canEdit = writable && detail.data?.status === 'pending';
  const canSave = writable && Boolean(name.trim()) && (mode !== 'manual' || selectedCues.length > 0);
  const cueTotalPages = Math.max(1, Math.ceil((cues.data?.total ?? 0) / CUE_PAGE_SIZE));
  const close = () => { if (!mutation.isPending) onClose(); };

  return (
    <div className={styles.panelBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <aside
        ref={panelRef}
        className={styles.sidePanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="term-panel-title"
        aria-busy={mutation.isPending}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); close(); }
          trapFocus(event, panelRef.current);
        }}
      >
        <header className={styles.panelHeader}>
          <div><span>项目工作台 · 术语</span><h2 id="term-panel-title">{title}</h2></div>
          <button ref={closeRef} type="button" onClick={close} disabled={mutation.isPending} aria-label={`关闭${title}`}>×</button>
        </header>

        {detail.isLoading && mode !== 'manual' && <p className={styles.panelState}>正在读取候选证据…</p>}
        {detail.error && <ErrorMessage error={detail.error} />}

        {(mode === 'manual' || (mode === 'edit' && canEdit)) && (
          <div className={styles.formGrid}>
            <label>规范名<input ref={firstFieldRef} value={name} maxLength={120} onChange={(event) => setName(event.target.value)} /></label>
            <label>类型<select value={type} onChange={(event) => setType(event.target.value as TermType)}>{termTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>别称<input value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="使用顿号分隔" /></label>
            <label>性别<select value={gender} onChange={(event) => setGender(event.target.value as TermGender)}>{Object.entries(genderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className={styles.fullField}>备注<textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} /></label>
          </div>
        )}

        {mode === 'manual' && (
          <section className={styles.cuePicker}>
            <h3>关联真实公司 SRT 证据</h3>
            <div className={styles.cueFilters}>
              <label>搜索原文<input value={cueSearch} onChange={(event) => setCueSearch(event.target.value)} /></label>
              <label>集数<input type="number" min="1" max="100" value={episode} onChange={(event) => setEpisode(event.target.value)} /></label>
            </div>
            {cues.isLoading && <p>正在读取当前来源 Cue…</p>}
            {cues.error && <ErrorMessage error={cues.error} />}
            <div className={styles.cueList}>
              {cues.data?.items.map((cue) => (
                <label key={cue.cueId}>
                  <input
                    type="checkbox"
                    checked={selectedCues.includes(cue.cueId)}
                    onChange={(event) => setSelectedCues((current) => event.target.checked
                      ? [...current, cue.cueId]
                      : current.filter((id) => id !== cue.cueId))}
                  />
                  <span><strong>第 {cue.episodeNumber} 集 · 第 {cue.cueIndex} 轴 · {formatTime(cue.startMs)}–{formatTime(cue.endMs)}</strong>{cue.text}</span>
                </label>
              ))}
              {cues.data && cues.data.items.length === 0 && <p>当前来源中没有匹配的字幕证据。</p>}
            </div>
            <div className={styles.cuePagination}>
              <small>已选择 {selectedCues.length} 条；没有真实 Cue 时不能保存。</small>
              <div>
                <button type="button" disabled={cuePage === 0} onClick={() => setCuePage((current) => current - 1)}>上一页</button>
                <span>{cuePage + 1} / {cueTotalPages}</span>
                <button type="button" disabled={cuePage + 1 >= cueTotalPages} onClick={() => setCuePage((current) => current + 1)}>下一页</button>
              </div>
            </div>
          </section>
        )}

        {mode === 'evidence' && detail.data && (
          <div className={styles.evidenceContent}>
            <dl>
              <div><dt>规范名</dt><dd>{detail.data.name}</dd></div>
              <div><dt>类型</dt><dd>{detail.data.type}</dd></div>
              <div><dt>别称</dt><dd>{detail.data.aliases.join('、') || '—'}</dd></div>
              <div><dt>性别</dt><dd>{genderLabels[detail.data.gender]}</dd></div>
              <div><dt>备注</dt><dd>{detail.data.note || '—'}</dd></div>
            </dl>
            <h3>字幕证据（{detail.data.evidence.length}）</h3>
            {detail.data.evidence.map((item) => (
              <blockquote key={item.cueId}>
                <strong>第 {item.episodeNumber} 集 · 第 {item.cueIndex} 轴 · {formatTime(item.startMs)}–{formatTime(item.endMs)}</strong>
                <p>{item.text}</p>
              </blockquote>
            ))}
            <h3>人工裁决记录</h3>
            {detail.data.decisionEvents.length
              ? <ol>{detail.data.decisionEvents.map((event) => <li key={event.id}>{event.action} · {new Date(event.createdAt).toLocaleString('zh-CN')}</li>)}</ol>
              : <p>尚无人工裁决。</p>}
          </div>
        )}

        <ErrorMessage error={mutation.error} />
        <footer className={styles.panelActions}>
          {writable && mode === 'evidence' && detail.data?.status === 'pending' && <button type="button" onClick={() => mutation.mutate('reject')} disabled={mutation.isPending}>驳回</button>}
          {writable && mode === 'evidence' && detail.data?.status === 'rejected' && <button type="button" onClick={() => mutation.mutate('restore')} disabled={mutation.isPending}>恢复待确认</button>}
          {writable && mode === 'evidence' && detail.data?.status === 'pending' && <button className={styles.primaryButton} type="button" onClick={() => mutation.mutate('approve')} disabled={mutation.isPending}>确认采用</button>}
          {mode === 'edit' && canEdit && <button className={styles.primaryButton} type="button" disabled={!canSave || mutation.isPending} onClick={() => mutation.mutate('edit')}>保存修改</button>}
          {mode === 'manual' && writable && <button className={styles.primaryButton} type="button" disabled={!canSave || mutation.isPending} onClick={() => mutation.mutate('manual')}>保存人工术语</button>}
        </footer>
      </aside>
    </div>
  );
};

interface TemplateDialogProps {
  data: TermTemplateList;
  writable: boolean;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
  onChanged: () => void;
}

export const TemplateDialog = ({ data, writable, returnFocus, onClose, onChanged }: TemplateDialogProps) => {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const intentRef = useRef<{ signature: string; key: string } | null>(null);
  const active = data.items.find((item) => item.id === data.activeTemplateVersionId) ?? data.items[0]!;
  const [name, setName] = useState(active.name);
  const [columns, setColumns] = useState<TermExportTemplateColumn[]>(active.columns);
  const queryClient = useQueryClient();

  useEffect(() => {
    closeRef.current?.focus();
    return () => returnFocus.current?.focus();
  }, [returnFocus]);

  const saveMutation = useMutation({
    mutationFn: async (activate: boolean) => {
      if (!writable) throw new Error('当前术语草稿为只读状态。');
      const body = { name: name.trim(), columns };
      const signature = JSON.stringify(body);
      const intent = intentRef.current?.signature === signature
        ? intentRef.current
        : { signature, key: createUuid() };
      intentRef.current = intent;
      const created = await createTermTemplate(body, intent.key);
      if (activate) await activateTermTemplate(created.id, { expectedActiveTemplateVersionId: data.activeTemplateVersionId });
      return created;
    },
    onSuccess: async () => {
      intentRef.current = null;
      await queryClient.invalidateQueries({ queryKey: ['term-templates'] });
      onChanged();
      onClose();
    },
  });
  const activateMutation = useMutation({
    mutationFn: (template: TermExportTemplateVersion) => activateTermTemplate(template.id, {
      expectedActiveTemplateVersionId: data.activeTemplateVersionId,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['term-templates'] });
      onChanged();
      onClose();
    },
  });
  const pending = saveMutation.isPending || activateMutation.isPending;
  const templateError = saveMutation.error ?? activateMutation.error;
  const valid = Boolean(name.trim()) && columns.length === 5 && columns.every((column) => column.header.trim());

  useEffect(() => {
    if (pending) dialogRef.current?.focus();
    else if (templateError) closeRef.current?.focus();
  }, [pending, templateError]);
  const move = (index: number, direction: -1 | 1) => setColumns((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next;
  });

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <section
        ref={dialogRef}
        className={`${styles.dialog} ${styles.templateDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-title"
        aria-busy={pending}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !pending) { event.preventDefault(); onClose(); }
          trapFocus(event, dialogRef.current);
        }}
      >
        <header className={styles.panelHeader}>
          <div><span>公司级设置</span><h2 id="template-title">术语导出模板</h2></div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={pending} aria-label="关闭模板管理">×</button>
        </header>
        <label className={styles.templateName}>模板名称<input value={name} maxLength={120} disabled={!writable} onChange={(event) => setName(event.target.value)} /></label>
        <div className={styles.columnEditor}>
          {columns.map((column, index) => (
            <div key={column.field}>
              <code>{column.field}</code>
              <input aria-label={`${column.field} 表头`} value={column.header} maxLength={120} disabled={!writable} onChange={(event) => setColumns((current) => current.map((item) => item.field === column.field ? { ...item, header: event.target.value } : item))} />
              <button type="button" onClick={() => move(index, -1)} disabled={!writable || index === 0 || pending} aria-label={`${column.field} 上移`}>↑</button>
              <button type="button" onClick={() => move(index, 1)} disabled={!writable || index === columns.length - 1 || pending} aria-label={`${column.field} 下移`}>↓</button>
            </div>
          ))}
        </div>
        <p className={styles.templateHint}>固定字段不可删除或新增；保存只创建不可变新版本。</p>
        <section className={styles.templateHistory}>
          <h3>历史版本</h3>
          {data.items.map((item) => (
            <div key={item.id}>
              <span><strong>{item.name} · V{item.version}</strong><small>{item.isActive ? '已启用' : '只读'} · {item.columns.map((column) => column.header).join(' / ')}</small></span>
              {writable && !item.isActive && <button type="button" disabled={pending} onClick={() => activateMutation.mutate(item)}>启用此版本</button>}
            </div>
          ))}
        </section>
        <ErrorMessage error={templateError} />
        {writable && <footer className={styles.dialogActions}>
          <button type="button" onClick={() => saveMutation.mutate(false)} disabled={!valid || pending}>保存新版本</button>
          <button className={styles.primaryButton} type="button" onClick={() => saveMutation.mutate(true)} disabled={!valid || pending}>保存并启用</button>
        </footer>}
      </section>
    </div>
  );
};

interface ConfirmDialogProps {
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

export const ConfirmDialog = ({ title, description, detail, confirmLabel, pending, error, returnFocus, onConfirm, onClose }: ConfirmDialogProps) => {
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
        aria-labelledby="confirm-terms-title"
        aria-busy={pending}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !pending) { event.preventDefault(); onClose(); }
          trapFocus(event, dialogRef.current);
        }}
      >
        <h2 id="confirm-terms-title">{title}</h2>
        <p>{description}</p>
        <div className={styles.confirmDetail}>{detail}</div>
        <ErrorMessage error={error} />
        <footer className={styles.dialogActions}>
          <button ref={cancelRef} type="button" onClick={onClose} disabled={pending}>取消</button>
          <button className={styles.primaryButton} type="button" onClick={onConfirm} disabled={pending}>{pending ? '处理中…' : confirmLabel}</button>
        </footer>
      </section>
    </div>
  );
};

export const fieldLabels: Record<TermExportField, string> = {
  type: '类型', name: '名称', aliases: '别称', gender: '性别', note: '备注',
};
