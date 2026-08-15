/*
THESIS: 上传页是一张行动优先的物理文件队列，员工先看失败与待处理，再安全恢复单文件上传。
STORY: 选择项目批次 → 双入口匹配本地文件 → 后端会话独立推进 → 整批只读汇总 → 原行恢复与技术详情。
FIRST VIEWPORT: 桌面首屏同时呈现批次身份、唯一总体进度、待处理/失败摘要、双入口和行动优先队列。
FORM: Operate 模式延续冷灰/白/靛青 AppShell；结构忠实采用 UI-M2-03 Rev 15 合并方向。
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
*/
import { useQuery } from '@tanstack/react-query';
import type { Project, UploadSession } from '@qimao-terms-cloud/contracts';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router';

import { listProjects } from '../projects/api.js';
import { abortUpload, createUpload, getUploadContext, UploadApiError } from './api.js';
import {
  actionRank,
  buildPhysicalMaterials,
  roleLabel,
  sessionForMaterial,
  statusLabel,
  type LocalUploadState,
  type PhysicalMaterial,
} from './model.js';
import { sha256Blob } from './sha256.js';
import { uploadMissingParts } from './upload-engine.js';
import styles from './UploadQueue.module.css';

type SortKey = 'file' | 'episode' | 'status' | 'size' | 'updated';
type SortDirection = 'asc' | 'desc';

const statusTone = (status: string) => {
  if (status === '已完成') return styles.success;
  if (status === '失败' || status === '会话已过期' || status === '项目不可用') return styles.danger;
  if (status === '上传中' || status === '校验中' || status === '正在准备') return styles.progress;
  if (status === '本机已暂停' || status === '断网等待') return styles.warning;
  return styles.neutral;
};

const formatSize = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
};

const formatDate = (value: number | string) => new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(value));

const filePath = (file: File) => (file.webkitRelativePath || file.name).replaceAll('\\', '/');

const matchFile = (file: File, materials: PhysicalMaterial[]) => {
  const path = filePath(file);
  const exact = materials.find((material) => material.relativePath === path
    && material.sizeBytes === file.size && material.lastModifiedMs === file.lastModified);
  if (exact) return exact;
  const candidates = materials.filter((material) => material.fileName === file.name
    && material.sizeBytes === file.size && material.lastModifiedMs === file.lastModified);
  return candidates.length === 1 ? candidates[0] : undefined;
};

const errorCopy = (error: unknown) => {
  if (error instanceof UploadApiError) {
    if (error.code === 'FILE_FINGERPRINT_MISMATCH') return '文件指纹不符，请重新选择原文件。';
    if (error.code === 'UPLOAD_SESSION_EXPIRED') return '上传会话已过期，请重建任务并重新选择。';
    if (error.code === 'PROJECT_NOT_ACTIVE') return '项目当前不可用，上传已停止。';
    if (error.code === 'UPLOAD_PARTS_MISSING') return '仍有缺失分片，请继续上传。';
    if (error.code === 'STORAGE_TEMPORARY_FAILURE') return '临时存储故障，请稍后重试。';
    return error.message;
  }
  return error instanceof Error ? error.message : '上传失败，请重试。';
};

const createKey = (scope: string) => `${scope}-${crypto.randomUUID()}`;

export const UploadQueue = () => {
  const folderInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replacementKey = useRef<string | undefined>(undefined);
  const createKeys = useRef(new Map<string, string>());
  const abortIntents = useRef(new Map<string, { key: string; expectedVersion: number }>());
  const running = useRef(new Set<string>());
  const localRef = useRef<Record<string, LocalUploadState>>({});
  const [projectId, setProjectId] = useState('');
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [local, setLocal] = useState<Record<string, LocalUploadState>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string>();
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [episodeFilter, setEpisodeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'status', direction: 'asc' });
  const [completedOpen, setCompletedOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const projectsQuery = useQuery({ queryKey: ['upload-projects'], queryFn: () => listProjects('') });
  const projects = projectsQuery.data?.items ?? [];
  useEffect(() => {
    if (!projectId && projects[0]) setProjectId(projects[0].id);
  }, [projectId, projects]);

  const contextQuery = useQuery({
    queryKey: ['upload-context', projectId],
    queryFn: () => getUploadContext(projectId),
    enabled: Boolean(projectId),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (contextQuery.data) setSessions(contextQuery.data.uploads);
  }, [contextQuery.data]);
  useEffect(() => {
    localRef.current = local;
  }, [local]);

  const project = contextQuery.data?.materialState.project
    ?? projects.find((candidate) => candidate.id === projectId);
  const manifest = contextQuery.data?.materialState.manifest;
  const materials = useMemo(() => manifest ? buildPhysicalMaterials(manifest) : [], [manifest]);

  const updateLocal = (key: string, patch: Partial<LocalUploadState>) => {
    setLocal((current) => {
      const next = { ...current, [key]: { ...current[key], ...patch } };
      localRef.current = next;
      return next;
    });
  };
  const updateSession = (session: UploadSession) => {
    setSessions((current) => [...current.filter((candidate) => candidate.id !== session.id), session]);
  };

  const runMaterial = async (material: PhysicalMaterial) => {
    const file = localRef.current[material.key]?.file;
    if (!file || running.current.has(material.key)) return;
    running.current.add(material.key);
    updateLocal(material.key, { queued: false, hashing: true, clientError: undefined, networkWaiting: false });
    try {
      let session = sessionForMaterial(material, sessions);
      if (!session || ['aborted', 'expired'].includes(session.status)) {
        if (session && ['aborted', 'expired'].includes(session.status)) createKeys.current.delete(material.key);
        const checksumValue = await sha256Blob(file);
        const key = createKeys.current.get(material.key) ?? createKey('create-upload');
        createKeys.current.set(material.key, key);
        session = await createUpload(projectId, key, {
          originalFileName: material.fileName,
          mediaKind: material.mediaKind,
          sizeBytes: material.sizeBytes,
          fileFingerprint: material.fingerprint,
          checksumAlgorithm: 'sha256',
          checksumValue,
          materialBinding: { manifestId: manifest!.id, targets: material.targets },
        });
        updateSession(session);
      }
      updateLocal(material.key, { hashing: false });
      const result = await uploadMissingParts(file, session, {
        paused: () => Boolean(localRef.current[material.key]?.paused),
        onSession: updateSession,
      });
      updateSession(result);
      if (result.status === 'completed') updateLocal(material.key, { file: undefined, clientError: undefined });
    } catch (error) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      updateLocal(material.key, {
        hashing: false,
        networkWaiting: offline,
        clientError: offline ? '网络连接已断开，恢复后可继续缺失分片。' : errorCopy(error),
        requestId: error instanceof UploadApiError ? error.requestId : undefined,
      });
    } finally {
      running.current.delete(material.key);
    }
  };

  const acceptFiles = (input: FileList | null, onlyKey?: string) => {
    if (!input) return;
    const next: Record<string, LocalUploadState> = {};
    let matched = 0;
    for (const file of [...input]) {
      const material = onlyKey ? materials.find((candidate) => candidate.key === onlyKey) : matchFile(file, materials);
      if (!material) continue;
      if (onlyKey && matchFile(file, [material])?.key !== onlyKey) {
        updateLocal(material.key, {
          file: undefined,
          queued: false,
          clientError: `文件指纹不符：预期 ${material.relativePath}（${formatSize(material.sizeBytes)}），本次选择 ${file.name}（${formatSize(file.size)}）。`,
        });
        continue;
      }
      next[material.key] = { file, queued: true };
      matched += 1;
    }
    setLocal((current) => {
      const merged = { ...current, ...next };
      localRef.current = merged;
      return merged;
    });
    setNotice(matched > 0 ? `已匹配 ${matched} 个物理文件，正在加入上传队列。` : '没有匹配最新素材清单的文件，请检查路径、大小和修改时间。');
    for (const key of Object.keys(next)) {
      const material = materials.find((candidate) => candidate.key === key);
      if (material && !material.assetBound) queueMicrotask(() => runMaterial(material));
    }
  };

  const pause = (material: PhysicalMaterial) => updateLocal(material.key, { paused: true, queued: false });
  const resume = (material: PhysicalMaterial) => {
    updateLocal(material.key, { paused: false, networkWaiting: false, clientError: undefined, queued: true });
    queueMicrotask(() => runMaterial(material));
  };
  useEffect(() => {
    const continueAfterReconnect = () => {
      for (const material of materials) {
        const state = localRef.current[material.key];
        if (state?.networkWaiting && state.file && !state.paused) resume(material);
      }
    };
    window.addEventListener('online', continueAfterReconnect);
    return () => window.removeEventListener('online', continueAfterReconnect);
  }, [materials]);
  const reselect = (material: PhysicalMaterial) => {
    replacementKey.current = material.key;
    replaceInput.current?.click();
  };

  const cancelMaterials = async (items: PhysicalMaterial[]) => {
    const cancellable = items.flatMap((material) => {
      const session = sessionForMaterial(material, sessions);
      return session && !['completed', 'aborted'].includes(session.status) ? [{ material, session }] : [];
    });
    if (cancellable.length === 0) return;
    if (!window.confirm(`确认取消 ${cancellable.length} 个未完成上传？已完成 Asset 不受影响。`)) return;
    for (const { material, session } of cancellable) {
      try {
        const intent = abortIntents.current.get(session.id) ?? {
          key: `browser-${session.id}-abort`,
          expectedVersion: session.version,
        };
        abortIntents.current.set(session.id, intent);
        const result = await abortUpload(session.id, intent.key, { expectedVersion: intent.expectedVersion });
        updateSession(result);
        abortIntents.current.delete(session.id);
        updateLocal(material.key, { paused: false, queued: false, file: undefined, clientError: undefined });
      } catch (error) {
        updateLocal(material.key, { clientError: errorCopy(error) });
      }
    }
    setSelected(new Set());
  };

  const rows = useMemo(() => materials.map((material) => {
    const session = sessionForMaterial(material, sessions);
    const localState = local[material.key];
    const state = project?.lifecycleStatus !== 'active'
      ? '项目不可用'
      : statusLabel(session, localState, material.assetBound);
    return { material, session, localState, state };
  }), [local, materials, project?.lifecycleStatus, sessions]);

  const filtered = useMemo(() => rows.filter(({ material, state }) => {
    if (roleFilter !== 'all' && !material.roles.includes(roleFilter as never)) return false;
    if (statusFilter !== 'all' && state !== statusFilter) return false;
    if (episodeFilter !== 'all' && material.episodeNumber !== Number(episodeFilter)) return false;
    return !search.trim() || `${material.fileName} ${material.relativePath}`.toLowerCase().includes(search.trim().toLowerCase());
  }).sort((left, right) => {
    const values: Record<SortKey, [string | number, string | number]> = {
      file: [left.material.fileName, right.material.fileName],
      episode: [left.material.episodeNumber, right.material.episodeNumber],
      status: [actionRank(left.state), actionRank(right.state)],
      size: [left.material.sizeBytes, right.material.sizeBytes],
      updated: [left.material.lastModifiedMs, right.material.lastModifiedMs],
    };
    const [a, b] = values[sort.key];
    const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'zh-CN');
    const tied = result || left.material.episodeNumber - right.material.episodeNumber;
    return sort.direction === 'asc' ? tied : -tied;
  }), [episodeFilter, roleFilter, rows, search, sort, statusFilter]);

  const activeRows = filtered.filter((row) => row.state !== '已完成');
  const completedRows = filtered.filter((row) => row.state === '已完成');
  const visibleRows = completedOpen || statusFilter === '已完成' ? filtered : activeRows;
  const selectedRows = rows.filter(({ material }) => selected.has(material.key));
  const totalBytes = rows.reduce((sum, { material }) => sum + material.sizeBytes, 0);
  const confirmedBytes = rows.reduce((sum, { material, session }) => {
    if (material.assetBound || session?.status === 'completed') return sum + material.sizeBytes;
    return sum + (session?.confirmedParts.reduce((partSum, part) => partSum + part.sizeBytes, 0) ?? 0);
  }, 0);
  const overallProgress = totalBytes > 0 ? Math.round((confirmedBytes / totalBytes) * 100) : 0;
  const failedCount = rows.filter(({ state }) => state === '失败' || state === '会话已过期').length;
  const pendingCount = rows.filter(({ state }) => !['已完成', '上传中', '校验中'].includes(state)).length;
  const episodes = [...new Set(materials.map((material) => material.episodeNumber))].sort((a, b) => a - b);

  const changeSort = (key: SortKey) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  }));
  const sortMark = (key: SortKey) => sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕';

  if (projectsQuery.isLoading) return <div className={styles.statePanel}>正在加载项目…</div>;
  if (projectsQuery.isError) return <div className={styles.statePanel}>项目读取失败，请刷新重试。</div>;
  if (projects.length === 0) return <div className={styles.statePanel}>暂无可上传项目，请先在项目中心创建并确认素材。</div>;

  return (
    <section className={styles.page}>
      <div className={styles.batchHeader}>
        <div className={styles.batchIdentity}>
          <label>
            <span>整剧批次</span>
            <select value={projectId} onChange={(event) => {
              setProjectId(event.target.value); setSelected(new Set()); setLocal({}); setNotice('');
            }}>
              {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className={styles.meta}>
            <span>清单 v{manifest?.version ?? '—'}</span>
            <span>创建于 {project ? formatDate(project.createdAt) : '—'}</span>
            <span className={styles.workflow}>项目状态：{project?.workflowStatus ?? '—'}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => filesInput.current?.click()} disabled={!manifest}>选择多个文件</button>
          <button className={styles.primaryButton} type="button" onClick={() => folderInput.current?.click()} disabled={!manifest}>选择素材文件夹</button>
        </div>
      </div>

      <input ref={folderInput} className="sr-only" id="upload-folder" type="file" multiple
        // @ts-expect-error Chromium 文件夹选择属性
        webkitdirectory="" onChange={(event) => { acceptFiles(event.target.files); event.target.value = ''; }} />
      <input ref={filesInput} className="sr-only" id="upload-files" type="file" multiple accept=".srt,.mp4"
        onChange={(event) => { acceptFiles(event.target.files); event.target.value = ''; }} />
      <input ref={replaceInput} className="sr-only" id="upload-replace" type="file" accept=".srt,.mp4"
        onChange={(event) => { acceptFiles(event.target.files, replacementKey.current); event.target.value = ''; }} />

      {!manifest && !contextQuery.isLoading ? (
        <div className={styles.statePanel}>
          <strong>尚无已确认素材清单</strong>
          <span>先在项目工作台确认每集素材，再建立上传队列。</span>
          <Link to={`/projects/${projectId}/materials`}>前往概览与素材</Link>
        </div>
      ) : (
        <>
          <div className={styles.progressPanel} aria-label={`整批总体进度 ${overallProgress}%`}>
            <div className={styles.progressCopy}>
              <div><strong>整批总体进度</strong><span>{confirmedBytes ? `${formatSize(confirmedBytes)} / ${formatSize(totalBytes)}` : `共 ${formatSize(totalBytes)}`}</span></div>
              <strong>{overallProgress}%</strong>
            </div>
            <div className={styles.progressTrack}><span style={{ transform: `scaleX(${overallProgress / 100})` }} /></div>
            <div className={styles.summary}><span>待处理 <strong>{pendingCount}</strong></span><span className={failedCount ? styles.failedSummary : ''}>失败 <strong>{failedCount}</strong></span><span>物理文件 {rows.length}</span></div>
          </div>

          {notice && <p className={styles.notice} role="status">{notice}</p>}

          <div className={styles.categoryTabs} aria-label="素材分类">
            {[['all', '全部素材'], ['company_srt', '公司字幕'], ['asr_video', '中文识别视频'], ['screen_video', '画面字视频']].map(([value, label]) => (
              <button key={value} type="button" className={roleFilter === value ? styles.tabActive : ''} onClick={() => setRoleFilter(value!)}>{label}</button>
            ))}
          </div>

          {selected.size > 0 ? (
            <div className={styles.bulkBar}>
              <strong>已选择 {selected.size} 项</strong><span>已完成 Asset 不受影响</span>
              <div>
                <button type="button" onClick={() => selectedRows.forEach(({ material }) => pause(material))}>暂停上传</button>
                <button type="button" onClick={() => selectedRows.forEach(({ material }) => resume(material))}>继续上传</button>
                <button className={styles.dangerButton} type="button" onClick={() => cancelMaterials(selectedRows.map(({ material }) => material))}>取消未完成上传</button>
              </div>
            </div>
          ) : (
            <div className={styles.toolbar}>
              <select aria-label="状态筛选" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">全部状态</option>
                {[...new Set(rows.map(({ state }) => state))].map((state) => <option key={state}>{state}</option>)}
              </select>
              <select aria-label="集数筛选" value={episodeFilter} onChange={(event) => setEpisodeFilter(event.target.value)}>
                <option value="all">全部集数</option>
                {episodes.map((episode) => <option key={episode} value={episode}>第 {episode} 集</option>)}
              </select>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索文件或路径" aria-label="搜索文件或路径" />
              <span className={styles.sortSummary}>行动优先 · 集数升序</span>
            </div>
          )}

          <div className={styles.tableWrap}>
            <table>
              <thead><tr>
                <th><input type="checkbox" aria-label="选择当前页" checked={visibleRows.length > 0 && visibleRows.every(({ material }) => selected.has(material.key))}
                  onChange={(event) => setSelected((current) => {
                    const next = new Set(current); visibleRows.forEach(({ material }) => event.target.checked ? next.add(material.key) : next.delete(material.key)); return next;
                  })} /></th>
                {([['file', '文件 / 标题'], ['episode', '集数'], ['status', '状态'], ['size', '大小'], ['updated', '更新时间']] as const).map(([key, label]) => (
                  <th key={key}><button type="button" onClick={() => changeSort(key)} aria-label={`${label}排序`}>{label} <span>{sortMark(key)}</span></button></th>
                ))}
                <th>当前操作</th><th><span className="sr-only">更多操作</span></th>
              </tr></thead>
              <tbody>
                {visibleRows.map((row) => <UploadRow key={row.material.key} {...row}
                  selected={selected.has(row.material.key)} expanded={expanded === row.material.key}
                  onSelect={(checked) => setSelected((current) => { const next = new Set(current); checked ? next.add(row.material.key) : next.delete(row.material.key); return next; })}
                  onExpand={() => setExpanded((current) => current === row.material.key ? undefined : row.material.key)}
                  onPause={() => pause(row.material)} onResume={() => resume(row.material)} onReselect={() => reselect(row.material)}
                  onCancel={() => cancelMaterials([row.material])} project={project} />)}
              </tbody>
            </table>
            {visibleRows.length === 0 && <div className={styles.empty}>当前筛选下没有待处理文件。</div>}
          </div>

          {completedRows.length > 0 && (
            <button className={styles.completedToggle} type="button" onClick={() => setCompletedOpen((value) => !value)} aria-expanded={completedOpen}>
              {completedOpen ? '收起' : '展开'}已完成项（{completedRows.length}）
            </button>
          )}
        </>
      )}
    </section>
  );
};

interface RowProps {
  material: PhysicalMaterial;
  session: UploadSession | undefined;
  localState: LocalUploadState | undefined;
  state: string;
  selected: boolean;
  expanded: boolean;
  project: Project | undefined;
  onSelect: (checked: boolean) => void;
  onExpand: () => void;
  onPause: () => void;
  onResume: () => void;
  onReselect: () => void;
  onCancel: () => void;
}

const UploadRow = ({ material, session, localState, state, selected, expanded, project, onSelect, onExpand, onPause, onResume, onReselect, onCancel }: RowProps) => {
  const canPause = Boolean(localState?.file) && ['上传中', '排队中', '正在准备'].includes(state);
  const needsFile = ['等待重新选择', '等待本地文件', '会话已过期', '失败', '已取消'].includes(state) && !localState?.file;
  const canResume = Boolean(localState?.file) && ['本机已暂停', '断网等待', '失败', '待上传'].includes(state);
  const action = project?.lifecycleStatus !== 'active'
    ? { label: '返回项目', run: undefined }
    : needsFile
      ? { label: state === '会话已过期' ? '重建任务并重新选择' : '重新选择原文件', run: onReselect }
      : canResume
        ? { label: state === '失败' ? '重试' : '继续上传', run: onResume }
        : canPause
          ? { label: '暂停上传', run: onPause }
          : undefined;
  return (
    <>
      <tr className={state === '已完成' ? styles.completedRow : ''}>
        <td><input type="checkbox" aria-label={`选择 ${material.fileName}`} checked={selected} onChange={(event) => onSelect(event.target.checked)} /></td>
        <td><button className={styles.fileButton} type="button" onClick={onExpand} aria-expanded={expanded}><strong>{material.fileName}</strong><span>{material.roles.map((role) => roleLabel[role]).join(' · ')}</span></button></td>
        <td>第 {material.episodeNumber} 集</td>
        <td><span className={`${styles.status} ${statusTone(state)}`}>{state}</span>{material.roles.length > 1 && <small className={styles.shared}>共享文件 · 上传一次</small>}</td>
        <td className={styles.numeric}>{formatSize(material.sizeBytes)}</td>
        <td className={styles.numeric}>{formatDate(material.lastModifiedMs)}</td>
        <td>{action?.run ? <button className={styles.rowAction} type="button" onClick={action.run}>{action.label}</button> : action ? <Link className={styles.rowAction} to="/projects">{action.label}</Link> : <span className={styles.doneText}>无需操作</span>}</td>
        <td><details className={styles.menu}><summary aria-label={`${material.fileName} 更多操作`}>•••</summary><div><button type="button" onClick={onExpand}>查看详情</button>{state !== '已完成' && <button type="button" onClick={onCancel}>取消未完成上传</button>}</div></details></td>
      </tr>
      {expanded && <tr className={styles.detailRow}><td colSpan={8}><div>
        <dl>
          <div><dt>相对路径</dt><dd>{material.relativePath}</dd></div>
          <div><dt>已确认分片</dt><dd>{session?.confirmedParts.length ?? 0} / {session?.totalParts ?? '—'}</dd></div>
          <div><dt>缺失分片</dt><dd>{session?.missingPartNumbers.join('、') || '无'}</dd></div>
          <div><dt>会话有效期</dt><dd>{session ? formatDate(session.expiresAt) : '尚未创建'}</dd></div>
          <div><dt>文件指纹核对</dt><dd>{localState?.file ? '已匹配本地原文件' : '等待重新选择时核对'}</dd></div>
          <div><dt>最近错误</dt><dd>{localState?.clientError ?? session?.errorDetail ?? '无'}</dd></div>
          <div><dt>请求标识</dt><dd>{localState?.requestId ?? '—'}</dd></div>
          {localState?.paused && <div><dt>暂停说明</dt><dd>本机已暂停；服务端仍为 {session?.status ?? 'created'}，会话仍会到期。</dd></div>}
        </dl>
      </div></td></tr>}
    </>
  );
};
