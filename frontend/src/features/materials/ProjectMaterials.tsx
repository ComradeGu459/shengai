/*
THESIS: 整剧素材确认是一张可审计的按集配对台账，用户先消除阻断，再显式形成后端版本。
STORY: 项目上下文 → 本地元数据扫描 → 横向配对台账 → 阻断与待分配 → 版本确认；浏览器草稿不冒充已确认状态。
FIRST VIEWPORT: 桌面首屏同时呈现项目身份、隐私边界、选择文件夹主操作、最新清单版本和配对工作区入口。
FORM: Operate 模式下延续既有冷灰/白/靛青工作台；已确认结构来自 UI-M2-02，seed key m2-material-pairing-confirmed。
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
*/
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MaterialRole, ProjectMaterialState } from '@qimao-terms-cloud/contracts';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { projectModules } from '../../modules.js';
import { createUuid } from '../../platform/randomUuid.js';
import { confirmMaterialManifest, getProjectMaterialState, MaterialApiError } from './api.js';
import {
  autoPairMaterials,
  buildBindings,
  compatibleWithRole,
  findPairingBlockers,
  scanMaterialFiles,
  type MaterialSelections,
  type ScannedMaterialFile,
} from './scan.js';
import { storeMaterialFileHandoff } from '../uploads/file-selection.js';
import styles from './ProjectMaterials.module.css';

const roles = ['company_srt', 'asr_video', 'screen_video'] as const;
const roleLabels: Record<MaterialRole, string> = {
  company_srt: '公司字幕 SRT',
  asr_video: '中文识别视频',
  screen_video: '画面字视频',
};

const formatFileSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Number((sizeBytes / 1024).toFixed(1))} KB`;
  return `${Number((sizeBytes / 1024 / 1024).toFixed(1))} MB`;
};

const validEpisodeDraft = (value: string) => {
  const episode = Number(value);
  return Number.isInteger(episode) && episode >= 1 && episode <= 100;
};

type ScanState = 'idle' | 'scanning' | 'ready' | 'empty' | 'failed';

export const ProjectMaterials = () => {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanError, setScanError] = useState('');
  const [rootName, setRootName] = useState('');
  const [files, setFiles] = useState<ScannedMaterialFile[]>([]);
  const [episodes, setEpisodes] = useState<number[]>([]);
  const [selections, setSelections] = useState<MaterialSelections>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, { episode: string; role: MaterialRole }>
  >({});
  const confirmIntent = useRef<{ signature: string; idempotencyKey: string } | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const confirmTriggerRef = useRef<HTMLButtonElement | null>(null);
  const confirmDialogRef = useRef<HTMLElement | null>(null);
  const cancelConfirmRef = useRef<HTMLButtonElement | null>(null);
  const selectedFilesRef = useRef<File[]>([]);

  const state = useQuery({
    queryKey: ['project-material-state', projectId],
    queryFn: () => getProjectMaterialState(projectId),
    enabled: Boolean(projectId),
  });
  const bindings = useMemo(
    () => buildBindings(files, episodes, selections),
    [episodes, files, selections],
  );
  const blockers = useMemo(
    () => findPairingBlockers(files, episodes, selections),
    [episodes, files, selections],
  );
  const selectedPaths = useMemo(
    () => new Set(bindings.map((binding) => binding.relativePath)),
    [bindings],
  );
  const unassigned = files.filter((file) => !selectedPaths.has(file.relativePath));

  const confirmMutation = useMutation({
    mutationFn: confirmMaterialManifest,
    onSuccess: (manifest) => {
      storeMaterialFileHandoff({
        projectId,
        manifestId: manifest.id,
        manifestVersion: manifest.version,
        files: selectedFilesRef.current,
      });
      queryClient.setQueryData<ProjectMaterialState>(['project-material-state', projectId], (current) =>
        current ? { ...current, manifest } : current,
      );
      confirmIntent.current = null;
      setConfirmOpen(false);
      setScanState('idle');
      setFiles([]);
      setEpisodes([]);
      setSelections({});
    },
  });

  useEffect(() => {
    if (!confirmOpen) return;
    cancelConfirmRef.current?.focus();
    return () => confirmTriggerRef.current?.focus();
  }, [confirmOpen]);

  const scanFolder = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = [...(event.target.files ?? [])];
    selectedFilesRef.current = selectedFiles;
    setScanState('scanning');
    setScanError('');
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const scanned = scanMaterialFiles(selectedFiles);
      const relevant = scanned.files.filter((file) => file.mediaType);
      if (!relevant.length) {
        selectedFilesRef.current = [];
        setRootName(scanned.rootName);
        setFiles([]);
        setEpisodes([]);
        setSelections({});
        setScanState('empty');
        return;
      }
      const paired = autoPairMaterials(scanned.files);
      setRootName(scanned.rootName);
      setFiles(scanned.files);
      setEpisodes(paired.episodes);
      setSelections(paired.selections);
      setAssignmentDrafts({});
      setScanState('ready');
    } catch (error) {
      selectedFilesRef.current = [];
      setScanError(error instanceof Error ? error.message : '无法读取文件元数据。');
      setScanState('failed');
    } finally {
      event.target.value = '';
    }
  };

  const updateSelection = (episode: number, role: MaterialRole, relativePath: string) => {
    setSelections((current) => ({
      ...current,
      [episode]: { ...current[episode], [role]: relativePath || undefined },
    }));
    confirmIntent.current = null;
  };

  const assignFile = (file: ScannedMaterialFile, draft = assignmentDrafts[file.relativePath]) => {
    const episode = Number(draft?.episode);
    if (!draft || !validEpisodeDraft(draft.episode) || !compatibleWithRole(file, draft.role)) return;
    if (!episodes.includes(episode)) setEpisodes((current) => [...current, episode].sort((a, b) => a - b));
    updateSelection(episode, draft.role, file.relativePath);
  };

  const submitConfirmation = () => {
    const body = {
      expectedVersion: state.data?.manifest?.version ?? 0,
      rootName,
      bindings,
    };
    const signature = JSON.stringify(body);
    const intent = confirmIntent.current?.signature === signature
      ? confirmIntent.current
      : { signature, idempotencyKey: createUuid() };
    confirmIntent.current = intent;
    confirmMutation.mutate({ projectId, idempotencyKey: intent.idempotencyKey, body });
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && !confirmMutation.isPending) {
      event.preventDefault();
      setConfirmOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(confirmDialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    if (!focusable.length) {
      event.preventDefault();
      confirmDialogRef.current?.focus();
      return;
    }
    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (state.isLoading) return <PageState title="正在读取项目素材清单" detail="正在连接本地 PostgreSQL。" />;
  if (state.isError) {
    return (
      <PageState
        title="项目素材清单暂时无法加载"
        detail={state.error.message}
        action={<button type="button" onClick={() => state.refetch()}>重新加载</button>}
      />
    );
  }
  if (!state.data) return null;

  const manifest = state.data.manifest;
  const confirmedEpisodes = manifest
    ? new Set(manifest.bindings.map((binding) => binding.episodeNumber)).size
    : 0;

  return (
    <section className={styles.page} aria-label="整剧素材配对确认">
      <div className={styles.projectContext}>
        <div>
          <Link to="/projects">项目中心</Link>
          <span aria-hidden="true">/</span>
          <strong>{state.data.project.name}</strong>
          <span className={styles.projectStatus}>
            {scanState === 'ready' ? '本地调整未确认' : manifest ? '清单已确认' : '素材待确认'}
          </span>
        </div>
        <nav aria-label="项目流程">
          {projectModules.map((module) => module.status === 'active' ? (
            <Link
              key={module.id}
              to={module.route.replace(':projectId', projectId)}
              aria-current={module.id === 'project-materials' ? 'page' : undefined}
            >
              {module.title}
            </Link>
          ) : (
            <span key={module.id} aria-disabled="true">{module.title}</span>
          ))}
        </nav>
      </div>

      <div className={styles.intakeBar}>
        <div>
          <strong>选择一部剧的素材文件夹</strong>
          <p>只扫描相对路径、文件名、大小和修改时间；本步骤不读取或上传文件内容。</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={() => folderInputRef.current?.click()}>
          选择文件夹
        </button>
        <input
          ref={(node) => {
            folderInputRef.current = node;
            node?.setAttribute('webkitdirectory', '');
            node?.setAttribute('directory', '');
          }}
          id="material-folder"
          className="sr-only"
          type="file"
          accept=".srt,.mp4"
          multiple
          onChange={scanFolder}
        />
      </div>

      {manifest && (
        <section className={styles.confirmedStrip} aria-label="最新已确认清单">
          <div>
            <span className={styles.successMark} aria-hidden="true">✓</span>
            <div>
              <strong>已确认素材清单 v{manifest.version}</strong>
              <p>{manifest.rootName} · {confirmedEpisodes} 集 · {manifest.bindingCount} 项绑定</p>
            </div>
          </div>
          <time dateTime={manifest.confirmedAt}>
            {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(manifest.confirmedAt))}
          </time>
        </section>
      )}

      {scanState === 'idle' && !manifest && (
        <PageState title="尚未建立素材清单" detail="选择整剧文件夹后，系统会按集数并集自动配对三类素材。" />
      )}
      {scanState === 'idle' && manifest && (
        <ManifestDetails manifest={manifest} />
      )}
      {scanState === 'scanning' && (
        <PageState title="正在扫描文件元数据" detail="不会读取文件内容，也不会开始上传。" loading />
      )}
      {scanState === 'empty' && (
        <PageState title="文件夹中没有可配对素材" detail="首期只识别公司 SRT 与 MP4 视频，请重新选择文件夹。" />
      )}
      {scanState === 'failed' && (
        <PageState title="文件夹扫描失败" detail={scanError} />
      )}

      {scanState === 'ready' && (
        <>
          <div className={styles.workbenchHeader}>
            <div>
              <strong>{rootName}</strong>
              <span>{files.length} 个文件 · {episodes.length} 集</span>
            </div>
            <div className={blockers.length ? styles.blockedSummary : styles.readySummary} role="status">
              <strong>{blockers.length}</strong>
              <span>{blockers.length ? '个确认阻断' : '可以确认'}</span>
            </div>
          </div>

          <div className={styles.ledgerFrame}>
            <div className={styles.ledgerScroll}>
              <table>
                <thead>
                  <tr>
                    <th>集数</th>
                    {roles.map((role) => <th key={role}>{roleLabels[role]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {episodes.map((episode) => (
                    <tr key={episode}>
                      <th scope="row">第 {episode} 集</th>
                      {roles.map((role) => (
                        <td key={role}>
                          <MaterialSelect
                            episode={episode}
                            role={role}
                            value={selections[episode]?.[role] ?? ''}
                            files={files}
                            onChange={(value) => updateSelection(episode, role, value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.lowerGrid}>
            <section className={styles.blockerPanel}>
              <div className={styles.sectionHeading}>
                <strong>确认阻断</strong>
                <span>{blockers.length}</span>
              </div>
              {blockers.length ? (
                <ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
              ) : (
                <p className={styles.successCopy}>必需素材已经逐集配齐，未发现重复占用或指纹异常。</p>
              )}
            </section>

            <section className={styles.unassignedPanel}>
              <div className={styles.sectionHeading}>
                <strong>待分配文件</strong>
                <span>{unassigned.length}</span>
              </div>
              {unassigned.length ? unassigned.map((file) => {
                const draft = assignmentDrafts[file.relativePath] ?? {
                  episode: file.episodeNumber?.toString() ?? '',
                  role: file.suggestedRole ?? (file.mediaType === 'srt' ? 'company_srt' : 'asr_video'),
                };
                return (
                  <div className={styles.unassignedRow} key={file.relativePath}>
                    <div>
                      <strong>{file.fileName}</strong>
                      <span>{file.relativePath}</span>
                      <span>{formatFileSize(file.sizeBytes)}</span>
                      {!file.fingerprintValid && <em>指纹异常，不能分配</em>}
                      {!file.mediaType && <em>文件类型不在本切片范围</em>}
                      {draft.episode && !validEpisodeDraft(draft.episode) && <em>目标集数必须是 1–100 的整数</em>}
                    </div>
                    <input
                      aria-label={`${file.fileName} 目标集数`}
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      aria-invalid={draft.episode ? !validEpisodeDraft(draft.episode) : undefined}
                      value={draft.episode}
                      onChange={(event) => setAssignmentDrafts((current) => ({
                        ...current,
                        [file.relativePath]: { ...draft, episode: event.target.value },
                      }))}
                    />
                    <select
                      aria-label={`${file.fileName} 素材角色`}
                      value={draft.role}
                      onChange={(event) => setAssignmentDrafts((current) => ({
                        ...current,
                        [file.relativePath]: { ...draft, role: event.target.value as MaterialRole },
                      }))}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role} disabled={!compatibleWithRole(file, role)}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!validEpisodeDraft(draft.episode) || !compatibleWithRole(file, draft.role)}
                      onClick={() => {
                        setAssignmentDrafts((current) => ({ ...current, [file.relativePath]: draft }));
                        assignFile(file, draft);
                      }}
                    >
                      分配
                    </button>
                  </div>
                );
              }) : <p>所有可识别素材都已进入配对台账。</p>}
            </section>
          </div>

          <div className={styles.confirmBar}>
            <div>
              <strong>确认后保存为清单 v{(manifest?.version ?? 0) + 1}</strong>
              <span>只保存 {bindings.length} 项元数据与指纹；旧版本继续保留。</span>
            </div>
            <button
              ref={confirmTriggerRef}
              className={styles.primaryButton}
              type="button"
              disabled={Boolean(blockers.length) || !episodes.length}
              onClick={() => setConfirmOpen(true)}
            >
              确认整剧素材
            </button>
          </div>
        </>
      )}

      {confirmOpen && (
        <div className={styles.dialogBackdrop} role="presentation">
          <section
            ref={confirmDialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-busy={confirmMutation.isPending}
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
          >
            <h2 id="confirm-title">确认保存整剧素材清单？</h2>
            <p>将保存 {episodes.length} 集、{bindings.length} 项角色绑定和文件元数据，不会上传文件内容。</p>
            {confirmMutation.error && (
              <div className={styles.confirmError} role="alert">
                <strong>{confirmMutation.error instanceof MaterialApiError ? confirmMutation.error.code : 'CONFIRM_FAILED'}</strong>
                <span>{confirmMutation.error.message}</span>
                {confirmMutation.error instanceof MaterialApiError && confirmMutation.error.action === 'reload_latest_manifest' && (
                  <button type="button" onClick={() => state.refetch()}>读取最新清单</button>
                )}
              </div>
            )}
            <div className={styles.dialogActions}>
              <button ref={cancelConfirmRef} type="button" disabled={confirmMutation.isPending} onClick={() => setConfirmOpen(false)}>返回调整</button>
              <button className={styles.primaryButton} type="button" disabled={confirmMutation.isPending} onClick={submitConfirmation}>
                {confirmMutation.isPending ? '确认中…' : '保存清单'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

const MaterialSelect = ({
  episode,
  role,
  value,
  files,
  onChange,
}: {
  episode: number;
  role: MaterialRole;
  value: string;
  files: ScannedMaterialFile[];
  onChange: (value: string) => void;
}) => {
  const selected = files.find((file) => file.relativePath === value);
  return (
    <label className={styles.materialCell}>
      <span className="sr-only">第 {episode} 集 {roleLabels[role]}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{role === 'screen_video' ? '明确留空' : '请选择文件'}</option>
        {files.filter((file) => compatibleWithRole(file, role)).map((file) => (
          <option key={file.relativePath} value={file.relativePath}>
            {file.fileName} · {file.relativePath} · {formatFileSize(file.sizeBytes)}
          </option>
        ))}
      </select>
      {selected && <span title={selected.relativePath}>{selected.relativePath}</span>}
      {selected && <span>{formatFileSize(selected.sizeBytes)}</span>}
    </label>
  );
};

const ManifestDetails = ({ manifest }: { manifest: NonNullable<ProjectMaterialState['manifest']> }) => {
  const episodes = [...new Set(manifest.bindings.map((binding) => binding.episodeNumber))]
    .sort((left, right) => left - right);
  return (
    <section className={styles.manifestDetails}>
      <div className={styles.sectionHeading}>
        <strong>已确认详情</strong>
        <span>v{manifest.version}</span>
      </div>
      <div className={styles.ledgerScroll}>
        <table>
          <thead><tr><th>集数</th><th>素材角色</th><th>文件</th><th>相对路径</th></tr></thead>
          <tbody>
            {episodes.flatMap((episode) => roles.map((role) => {
              const binding = manifest.bindings.find(
                (candidate) => candidate.episodeNumber === episode && candidate.role === role,
              );
              return (
                <tr key={`${episode}:${role}`}>
                  <td>第 {episode} 集</td>
                  <td>{roleLabels[role]}</td>
                  <td>{binding?.fileName ?? (role === 'screen_video' ? '明确留空' : '未绑定')}</td>
                  <td>{binding?.relativePath ?? '—'}</td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const PageState = ({
  title,
  detail,
  action,
  loading = false,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
  loading?: boolean;
}) => (
  <div className={styles.pageState} role={title.includes('失败') ? 'alert' : 'status'}>
    {loading && <span className={styles.spinner} aria-hidden="true" />}
    <strong>{title}</strong>
    <p>{detail}</p>
    {action}
  </div>
);
