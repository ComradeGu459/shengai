/*
THESIS: 上传页是一张行动优先的物理文件队列，员工先看失败与待处理，再安全恢复单文件上传。
STORY: 选择项目批次 → 双入口匹配本地文件 → 后端会话独立推进 → 整批只读汇总 → 原行恢复与技术详情。
FIRST VIEWPORT: 桌面首屏同时呈现批次身份、唯一总体进度、待处理/失败摘要、双入口和行动优先队列。
FORM: Operate 模式延续冷灰/白/靛青 AppShell；结构忠实采用 UI-M2-03 Rev 15 合并方向。
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
*/
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MaterialBinding, MaterialRole, Project, UploadSession } from '@qimao-terms-cloud/contracts';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link } from 'react-router';

import { createUuid } from '../../platform/randomUuid.js';
import { confirmMaterialManifest, MaterialApiError } from '../materials/api.js';
import {
  autoPairMaterials,
  buildBindings,
  compatibleWithRole,
  findPairingBlockers,
  scanMaterialFiles,
  withRelativePathFingerprint,
  type MaterialSelections,
  type ScannedMaterialFile,
} from '../materials/scan.js';
import { listProjects, projectsQueryKey } from '../projects/api.js';
import { abortUpload, createUpload, getUpload, getUploadContext, getUploadCreateCommand, UploadApiError } from './api.js';
import {
  directoryFileHandoffKey,
  directoryPickerSupported,
  folderSelectionSupported,
  getPendingMaterialFileHandoffProjectId,
  matchSelectedFiles,
  persistDirectoryHandle,
  pickDirectoryHandle,
  readDirectoryHandleFiles,
  restoreDirectoryFiles,
  takeMaterialFileHandoff,
  type FileSelectionResult,
} from './file-selection.js';
import {
  actionRank,
  buildPhysicalMaterials,
  roleLabel,
  sessionsForMaterial,
  statusLabel,
  type LocalUploadState,
  type PhysicalMaterial,
} from './model.js';
import {
  MAX_ACTIVE_UPLOAD_FILES,
  uploadFileWithMultipart,
  UploadCompletionUnknownError,
  UploadTransportUnknownError,
  type MultipartTransportController,
} from './upload-engine.js';
import styles from './UploadQueue.module.css';

type SortKey = 'file' | 'episode' | 'status' | 'size' | 'updated';
type SortDirection = 'asc' | 'desc';

const materialRoles = ['company_srt', 'asr_video', 'screen_video'] as const;
const materialRoleLabels: Record<MaterialRole, string> = {
  company_srt: '公司字幕',
  asr_video: '中文识别视频',
  screen_video: '画面字视频',
};

const statusTone = (status: string) => {
  if (status === '已完成') return styles.success;
  if (status === '失败' || status === '会话已过期' || status === '项目不可用' || status === '创建结果待确认' || status === '放弃结果待确认') return styles.danger;
  if (status === '上传中' || status === '校验中' || status === '正在创建上传任务' || status === '正在放弃旧上传') return styles.progress;
  if (status === '本机已暂停' || status === '正在暂停' || status === '断网等待' || status === '旧上传待处理') return styles.warning;
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

const staleSessionMessage = '旧上传会话已失效，请为当前批次重新选择/重新开始。';
const isActiveLegacySession = (session: UploadSession | undefined) => Boolean(session
  && !['completed', 'aborted', 'expired'].includes(session.status));

const createKey = (scope: string) => `${scope}-${createUuid()}`;

const scanChunkSize = 20;
const createIntentStorageKey = 'qimao.upload.create-intents.v1';

const createIntentIdentity = (projectId: string, manifestId: string, materialKey: string) =>
  JSON.stringify([projectId, manifestId, materialKey]);

const batchIdentity = (projectId: string, manifestId: string | undefined, manifestVersion: number | undefined) =>
  JSON.stringify([projectId, manifestId ?? '', manifestVersion ?? 0]);

type SessionBatchIdentity = {
  projectId: string;
  manifestId: string;
  manifestVersion: number;
  fingerprint: string;
};

const readCreateIntents = () => {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(createIntentStorageKey) ?? '{}') as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch {
    return {} as Record<string, string>;
  }
};

const writeCreateIntent = (identity: string, commandId: string | undefined) => {
  try {
    const intents = readCreateIntents();
    if (commandId) intents[identity] = commandId;
    else delete intents[identity];
    window.sessionStorage.setItem(createIntentStorageKey, JSON.stringify(intents));
  } catch {
    // sessionStorage 被禁用时仍保留当前页内存意图，不降级重发写请求。
  }
};

type SelectionSource = 'folder' | 'multiple' | 'single' | 'role-folder';
type SelectionState =
  | { phase: 'idle' }
  | { phase: 'waiting'; source: SelectionSource }
  | { phase: 'scanning'; source: SelectionSource; scanned: number; total: number; projectId: string; manifestId: string; generation: number }
  | { phase: 'summary'; source: SelectionSource; result: FileSelectionResult; missing: number; projectId: string; manifestId: string; generation: number };

type PairingState =
  | { phase: 'idle' }
  | { phase: 'scanning'; source: SelectionSource; role?: MaterialRole | undefined; scanned: number; total: number; projectId: string; manifestId?: string | undefined; generation: number }
  | { phase: 'ready'; source: SelectionSource; role?: MaterialRole | undefined; rootName: string; files: ScannedMaterialFile[]; sourcePaths: string[]; sourceRolePaths: Partial<Record<MaterialRole, string[]>>; sourceSlotPaths: Record<string, string>; episodes: number[]; selections: MaterialSelections; blockers: string[]; projectId: string; manifestId?: string | undefined; generation: number; confirming?: boolean | undefined; error?: string | undefined }
  | { phase: 'empty'; source: SelectionSource; role?: MaterialRole | undefined; projectId: string; generation: number }
  | { phase: 'failed'; source: SelectionSource; role?: MaterialRole | undefined; projectId: string; generation: number; error: string };

type CancelDialogKind = 'cancel' | 'legacy';
type CancelDialogItem = { material: PhysicalMaterial; session: UploadSession };
type CancelDialogError = { message: string; requestId?: string | undefined; unknownUploadIds?: string[] | undefined };
type CancelDialogState = {
  kind: CancelDialogKind;
  items: CancelDialogItem[];
  returnKey: string;
  pending: boolean;
  error?: CancelDialogError | undefined;
};

const sourceLabel: Record<SelectionSource, string> = {
  folder: '系列文件夹',
  multiple: '多个文件',
  single: '单个原文件',
  'role-folder': '角色文件夹',
};

const selectionsFromBindings = (bindings: MaterialBinding[]): MaterialSelections => {
  const selections: MaterialSelections = {};
  for (const binding of bindings) {
    selections[binding.episodeNumber] = {
      ...selections[binding.episodeNumber],
      [binding.role]: binding.relativePath,
    };
  }
  return selections;
};

const scannedFromBindings = (bindings: MaterialBinding[]): ScannedMaterialFile[] => bindings.map((binding) => ({
  relativePath: binding.relativePath,
  fileName: binding.fileName,
  sizeBytes: binding.sizeBytes,
  lastModifiedMs: binding.lastModifiedMs,
  fingerprint: binding.fingerprint,
  mediaType: binding.mediaType,
  episodeNumber: binding.episodeNumber,
  suggestedRole: binding.role,
  fingerprintValid: true,
}));

const mergeScannedFiles = (...groups: ScannedMaterialFile[][]) => {
  const byPath = new Map<string, ScannedMaterialFile>();
  groups.flat().forEach((file) => byPath.set(file.relativePath, file));
  return [...byPath.values()];
};

const sameBindings = (left: MaterialBinding[], right: MaterialBinding[]) => {
  if (left.length !== right.length) return false;
  const normalize = (binding: MaterialBinding) => JSON.stringify([
    binding.episodeNumber,
    binding.role,
    binding.relativePath,
    binding.fileName,
    binding.sizeBytes,
    binding.lastModifiedMs,
    binding.fingerprint,
    binding.mediaType,
  ]);
  const expected = new Set(left.map(normalize));
  return right.every((binding) => expected.has(normalize(binding)));
};

export const UploadQueue = () => {
  const queryClient = useQueryClient();
  const folderInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const roleFolderInputs = useRef<Partial<Record<MaterialRole, HTMLInputElement | null>>>({});
  const selectionPanel = useRef<HTMLDivElement>(null);
  const lastPickerTrigger = useRef<HTMLButtonElement | null>(null);
  const lastPickerSource = useRef<SelectionSource | undefined>(undefined);
  const replacementKey = useRef<string | undefined>(undefined);
  const selectionGeneration = useRef(0);
  const selectionIdentity = useRef('');
  const createKeys = useRef(new Map<string, string>());
  const runControllers = useRef(new Map<string, AbortController>());
  const transportControllers = useRef(new Map<string, MultipartTransportController>());
  const sessionFlights = useRef(new Map<string, { promise: Promise<UploadSession>; controller: AbortController; batchIdentity: string }>());
  const sessionBatchIdentities = useRef(new Map<string, SessionBatchIdentity>());
  const abortIntents = useRef(new Map<string, { key: string; expectedVersion: number }>());
  const running = useRef(new Set<string>());
  const runningBatchIdentities = useRef(new Map<string, string>());
  const rerunKeys = useRef(new Set<string>());
  const pendingQueue = useRef<string[]>([]);
  const pendingKeys = useRef(new Set<string>());
  const activeFiles = useRef(0);
  const pumpQueue = useRef<() => void>(() => undefined);
  const localRef = useRef<Record<string, LocalUploadState>>({});
  const sessionsRef = useRef<UploadSession[]>([]);
  const materialsRef = useRef<PhysicalMaterial[]>([]);
  const projectIdRef = useRef('');
  const manifestIdRef = useRef<string | undefined>(undefined);
  const manifestVersionRef = useRef<number | undefined>(undefined);
  const batchIdentityRef = useRef('');
  const hydratedContextIdentityRef = useRef('');
  const preserveBatchIdentityRef = useRef<string | undefined>(undefined);
  const batchPausedRef = useRef(false);
  const scanFilesRef = useRef(new Map<string, File>());
  const directoryRestoreAttemptedRef = useRef(new Set<string>());
  const replacementTargetRef = useRef<{ episodeNumber: number; role: MaterialRole } | undefined>(undefined);
  const pickerRoleRef = useRef<MaterialRole | undefined>(undefined);
  const pairingIntentRef = useRef<{ signature: string; idempotencyKey: string } | null>(null);
  const pairingConfirmFlightRef = useRef<{ identity: string; signature: string } | null>(null);
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
  const [selection, setSelection] = useState<SelectionState>({ phase: 'idle' });
  const [pairing, setPairing] = useState<PairingState>({ phase: 'idle' });
  const [batchPaused, setBatchPaused] = useState(false);
  const [pickerFocusRequest, setPickerFocusRequest] = useState(0);
  const [cancelDialog, setCancelDialog] = useState<CancelDialogState | null>(null);
  const [directoryRestoreState, setDirectoryRestoreState] = useState<'idle' | 'restoring' | 'needs-permission' | 'failed'>('idle');
  const cancelBusy = Boolean(cancelDialog?.pending);
  const supportsFolderSelection = useMemo(folderSelectionSupported, []);
  const maxConcurrentFiles = MAX_ACTIVE_UPLOAD_FILES;

  const uploadActivity = useMemo(() => {
    const localActivity = Object.values(local).some((state) => state.queued || state.creating || state.networkWaiting);
    const serverActivity = sessions.some((session) => ['created', 'uploading', 'completing', 'verifying'].includes(session.status));
    return localActivity || serverActivity;
  }, [local, sessions]);
  useEffect(() => {
    if (!uploadActivity || typeof window === 'undefined') return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '上传正在进行；刷新后需要重新授权本地文件。';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [uploadActivity]);
  const projectsQuery = useQuery({ queryKey: projectsQueryKey, queryFn: () => listProjects('') });
  const projects = projectsQuery.data?.items ?? [];
  const handoffProjectId = getPendingMaterialFileHandoffProjectId();
  useEffect(() => {
    if (!projectId && handoffProjectId) setProjectId(handoffProjectId);
    else if (!projectId && projects[0]) setProjectId(projects[0].id);
  }, [handoffProjectId, projectId, projects]);

  const contextQuery = useQuery({
    queryKey: ['upload-context', projectId],
    queryFn: () => getUploadContext(projectId),
    enabled: Boolean(projectId),
    refetchInterval: uploadActivity ? 1_500 : false,
  });

  useEffect(() => {
    if (contextQuery.data) {
      const contextManifest = contextQuery.data.materialState.manifest;
      if (contextQuery.data.materialState.project.id !== projectId) return;
      if (!contextManifest) return;
      const identity: SessionBatchIdentity = {
        projectId,
        manifestId: contextManifest.id,
        manifestVersion: contextManifest.version,
        fingerprint: '',
      };
      sessionBatchIdentities.current = new Map(contextQuery.data.uploads.map((session) => [session.id, {
        ...identity,
        fingerprint: session.fileFingerprint,
      }]));
      hydratedContextIdentityRef.current = batchIdentity(projectId, contextManifest.id, contextManifest.version);
      sessionsRef.current = contextQuery.data.uploads;
      setSessions(contextQuery.data.uploads);
    }
  }, [contextQuery.data, projectId]);

  const contextMatchesProject = contextQuery.data?.materialState.project.id === projectId;
  const project = contextMatchesProject
    ? contextQuery.data?.materialState.project
    : projects.find((candidate) => candidate.id === projectId);
  const manifest = contextMatchesProject ? contextQuery.data?.materialState.manifest : undefined;
  const materials = useMemo(() => manifest ? buildPhysicalMaterials(manifest) : [], [manifest]);
  const currentBatchIdentity = batchIdentity(projectId, manifest?.id, manifest?.version);
  if (batchIdentityRef.current !== currentBatchIdentity) {
    const previousBatchIdentity = batchIdentityRef.current;
    const preserveBatchFiles = preserveBatchIdentityRef.current === currentBatchIdentity;
    if (preserveBatchFiles) preserveBatchIdentityRef.current = undefined;
    batchIdentityRef.current = currentBatchIdentity;
    selectionIdentity.current = currentBatchIdentity;
    selectionGeneration.current += 1;
    replacementKey.current = undefined;
    if (previousBatchIdentity) {
      runControllers.current.forEach((controller) => controller.abort());
      runControllers.current.clear();
      transportControllers.current.forEach((transport) => transport.cancel());
      transportControllers.current.clear();
      running.current.clear();
      runningBatchIdentities.current.clear();
      activeFiles.current = 0;
      createKeys.current.forEach((_commandId, identity) => writeCreateIntent(identity, undefined));
      createKeys.current.clear();
      sessionBatchIdentities.current.clear();
      hydratedContextIdentityRef.current = '';
      abortIntents.current.clear();
      rerunKeys.current.clear();
      sessionsRef.current = [];
      if (!preserveBatchFiles) {
        pendingQueue.current = [];
        pendingKeys.current.clear();
        localRef.current = {};
        scanFilesRef.current.clear();
      }
      replacementTargetRef.current = undefined;
      pairingIntentRef.current = null;
      pairingConfirmFlightRef.current = null;
      batchPausedRef.current = false;
    }
  }
  materialsRef.current = materials;
  projectIdRef.current = projectId;
  manifestIdRef.current = manifest?.id;
  manifestVersionRef.current = manifest?.version;

  const sessionCandidatesForCurrentMaterial = (
    material: PhysicalMaterial,
    source = sessionsRef.current,
    transportKind: 'multipart' | 'tus' = 'multipart',
  ) => sessionsForMaterial(material, source.filter((session) => {
      const knownIdentity = sessionBatchIdentities.current.get(session.id);
      return knownIdentity?.projectId === material.projectId
        && knownIdentity.manifestId === material.manifestId
        && knownIdentity.manifestVersion === material.manifestVersion
        && knownIdentity.fingerprint === material.fingerprint
        || (!knownIdentity
          && hydratedContextIdentityRef.current === currentBatchIdentity
          && session.projectId === material.projectId
          && session.materialBinding?.manifestId === material.manifestId
          && session.fileFingerprint === material.fingerprint);
    }), transportKind);
  const sessionForCurrentMaterial = (
    material: PhysicalMaterial,
    source = sessionsRef.current,
    transportKind: 'multipart' | 'tus' = 'multipart',
  ) => sessionCandidatesForCurrentMaterial(material, source, transportKind)[0];

  useEffect(() => {
    setSessions(sessionsRef.current);
    setLocal(localRef.current);
    setSelected(new Set());
    setExpanded(undefined);
    setSelection({ phase: 'idle' });
    setPairing({ phase: 'idle' });
    setBatchPaused(batchPausedRef.current);
  }, [currentBatchIdentity]);

  const updateLocal = (key: string, patch: Partial<LocalUploadState>) => {
    const next = { ...localRef.current, [key]: { ...localRef.current[key], ...patch } };
    localRef.current = next;
    setLocal(next);
  };
  const updateSessionForBatch = (session: UploadSession, identity: string) => {
    if (batchIdentityRef.current !== identity) return false;
    const [identityProjectId, identityManifestId, identityManifestVersion] = JSON.parse(identity) as [string, string, number];
    sessionBatchIdentities.current.set(session.id, {
      projectId: identityProjectId,
      manifestId: identityManifestId,
      manifestVersion: identityManifestVersion,
      fingerprint: session.fileFingerprint,
    });
    const next = [...sessionsRef.current.filter((candidate) => candidate.id !== session.id), session];
    sessionsRef.current = next;
    setSessions(next);
    return true;
  };
  const updateSession = (session: UploadSession) => updateSessionForBatch(session, currentBatchIdentity);
  const clearSessionBinding = (session: UploadSession) => {
    sessionBatchIdentities.current.delete(session.id);
    const next = sessionsRef.current.filter((candidate) => candidate.id !== session.id);
    sessionsRef.current = next;
    setSessions(next);
  };

  const runMaterial = async (material: PhysicalMaterial) => {
    const runProjectId = projectIdRef.current;
    const runManifestId = manifestIdRef.current;
    const runManifestVersion = manifestVersionRef.current;
    const runBatchIdentity = batchIdentity(runProjectId, runManifestId, runManifestVersion);
    const isCurrentIdentity = () => batchIdentityRef.current === runBatchIdentity
      && projectIdRef.current === runProjectId
      && manifestIdRef.current === runManifestId
      && manifestVersionRef.current === runManifestVersion;
    const file = localRef.current[material.key]?.file;
    if (!file) return;
    const allowTransportReplacement = Boolean(localRef.current[material.key]?.allowTransportReplacement);
    const controller = new AbortController();
    runControllers.current.set(material.key, controller);
    const paused = () => !isCurrentIdentity() || batchPausedRef.current || Boolean(localRef.current[material.key]?.paused);
    updateLocal(material.key, {
      queued: false,
      creating: true,
      clientError: undefined,
      networkWaiting: false,
    });
    let creating = false;
    let executionSession: UploadSession | undefined;
    let replacedLegacySession: UploadSession | undefined;
    let sessionFlightId: string | undefined;
    let sessionFlightPromise: Promise<UploadSession> | undefined;
    try {
      let session = sessionForCurrentMaterial(material);
      if (paused()) {
        updateLocal(material.key, { creating: false, queued: false });
        return;
      }
      const hadExistingSession = Boolean(session);
      const sessionWasExpired = session?.status === 'expired';
      if (session && (session.status === 'aborted' || session.status === 'expired' || session.errorCode === 'PROJECT_RECYCLED')) {
        clearSessionBinding(session);
        session = undefined;
      }
      const incompatibleSessions = sessionCandidatesForCurrentMaterial(material, sessionsRef.current, 'tus')
        .filter((candidate) => !['completed', 'aborted', 'expired'].includes(candidate.status));
      if (!session && incompatibleSessions.length > 0) {
        if (!allowTransportReplacement) {
          throw new Error('检测到旧传输会话；未自动替换，请重新确认当前文件后再开始上传。');
        }
        replacedLegacySession = incompatibleSessions.length === 1
          && incompatibleSessions[0]!.status === 'created'
          && incompatibleSessions[0]!.confirmedParts.length === 0
          && !incompatibleSessions[0]!.asset
          ? incompatibleSessions[0]
          : undefined;
        if (!replacedLegacySession) {
          throw new Error('旧传输会话已有进度或状态不明确，已保留原事实且未创建新上传任务。');
        }
      }
      if (!session) {
        const intentIdentity = createIntentIdentity(runProjectId, runManifestId!, material.key);
        if (sessionWasExpired) {
          createKeys.current.delete(intentIdentity);
          writeCreateIntent(intentIdentity, undefined);
        }
        const key = createKeys.current.get(intentIdentity) ?? readCreateIntents()[intentIdentity] ?? createKey('create-upload');
        createKeys.current.set(intentIdentity, key);
        writeCreateIntent(intentIdentity, key);
        updateLocal(material.key, { allowTransportReplacement: false });
        creating = true;
        session = await createUpload(runProjectId, key, {
          originalFileName: material.fileName,
          mediaKind: material.mediaKind,
          sizeBytes: material.sizeBytes,
          fileFingerprint: material.fingerprint,
          checksumAlgorithm: 'sha256',
          transportKind: 'multipart',
          materialBinding: { manifestId: runManifestId!, targets: material.targets },
          ...(replacedLegacySession ? { replaceUploadId: replacedLegacySession.id } : {}),
        }, controller.signal);
        creating = false;
        if (!isCurrentIdentity()) return;
        createKeys.current.delete(intentIdentity);
        writeCreateIntent(intentIdentity, undefined);
        if (replacedLegacySession) clearSessionBinding(replacedLegacySession);
        updateSessionForBatch(session, runBatchIdentity);
      } else if (allowTransportReplacement) {
        updateLocal(material.key, { allowTransportReplacement: false });
      }
      const currentSession = session;
      if (!currentSession) throw new Error('上传会话未建立。');
      executionSession = currentSession;
      updateLocal(material.key, { creating: false, uploading: true, clientError: undefined });
      const existingFlight = sessionFlights.current.get(currentSession.id);
      let result: UploadSession;
      if (existingFlight) {
        // 同一业务会话只允许一个 multipart 执行链；等待原 promise，不能让
        // React 重渲染、共享角色或恢复队列再次启动第二个 transport。
        result = await existingFlight.promise;
      } else {
        const uploadPromise = uploadFileWithMultipart(file, currentSession, {
          paused,
          signal: controller.signal,
          resumeFromExisting: hadExistingSession,
          onTransport: (transport) => {
            if (transport) transportControllers.current.set(material.key, transport);
            else transportControllers.current.delete(material.key);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            if (isCurrentIdentity()) updateLocal(material.key, { progressBytes: bytesUploaded, progressTotalBytes: bytesTotal });
          },
          onSession: (nextSession: UploadSession) => {
            if (isCurrentIdentity()) updateSessionForBatch(nextSession, runBatchIdentity);
          },
        });
        sessionFlightId = currentSession.id;
        sessionFlightPromise = uploadPromise;
        sessionFlights.current.set(currentSession.id, { promise: uploadPromise, controller, batchIdentity: runBatchIdentity });
        result = await uploadPromise;
      }
      if (!isCurrentIdentity()) return;
      updateSessionForBatch(result, runBatchIdentity);
      if (result.status === 'completed') {
        updateLocal(material.key, {
          file: undefined,
          queued: false,
          creating: false,
          uploading: false,
          progressBytes: undefined,
          progressTotalBytes: undefined,
          clientError: undefined,
        });
      } else {
        updateLocal(material.key, { queued: false, uploading: false });
      }
    } catch (error) {
      if (!isCurrentIdentity()) return;
      if (error instanceof UploadApiError && ['PROJECT_NOT_ACTIVE', 'PROJECT_RECYCLED', 'UPLOAD_SESSION_EXPIRED', 'UPLOAD_STATE_INVALID'].includes(error.code)) {
        const staleSession = executionSession ?? sessionForCurrentMaterial(material);
        if (staleSession) clearSessionBinding(staleSession);
        updateLocal(material.key, { creating: false, uploading: false, queued: false, clientError: staleSessionMessage });
        setNotice(staleSessionMessage);
        return;
      }
      if (error instanceof UploadCompletionUnknownError || error instanceof UploadTransportUnknownError) {
        updateLocal(material.key, {
          creating: false,
          uploading: false,
          queued: false,
          checkingCreate: false,
          clientError: error.message,
        });
        setNotice(error.message);
        return;
      }
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      const createUnknown = creating && (!(error instanceof UploadApiError) || error.retryable);
      if (creating && !createUnknown && runManifestId) {
        const intentIdentity = createIntentIdentity(runProjectId, runManifestId, material.key);
        createKeys.current.delete(intentIdentity);
        writeCreateIntent(intentIdentity, undefined);
      }
      updateLocal(material.key, {
        creating: false,
        uploading: false,
        queued: false,
        createUnknown,
        checkingCreate: false,
        networkWaiting: offline,
        clientError: createUnknown
          ? '上传任务创建结果未知，已停止重复提交；请手动检查同一创建命令。'
          : offline ? '网络连接已断开，恢复后可继续缺失分片。' : errorCopy(error),
        requestId: error instanceof UploadApiError && error.requestId !== 'unknown' ? error.requestId : undefined,
      });
    } finally {
      if (isCurrentIdentity() && localRef.current[material.key]?.creating) {
        updateLocal(material.key, { creating: false, uploading: false, queued: false });
      }
      if (runControllers.current.get(material.key) === controller) runControllers.current.delete(material.key);
      if (sessionFlightId && sessionFlightPromise
        && sessionFlights.current.get(sessionFlightId)?.promise === sessionFlightPromise
        && sessionFlights.current.get(sessionFlightId)?.controller === controller) {
        sessionFlights.current.delete(sessionFlightId);
      }
    }
  };

  pumpQueue.current = () => {
    if (batchPausedRef.current) return;
    while (activeFiles.current < maxConcurrentFiles && pendingQueue.current.length > 0) {
      const key = pendingQueue.current.shift()!;
      pendingKeys.current.delete(key);
      const material = materialsRef.current.find((candidate) => candidate.key === key);
      const localState = localRef.current[key];
      if (!material || material.assetBound || !localState?.file || localState.paused || localState.createUnknown) continue;
      activeFiles.current += 1;
      running.current.add(key);
      const runBatchIdentity = batchIdentityRef.current;
      runningBatchIdentities.current.set(key, runBatchIdentity);
      void runMaterial(material).finally(() => {
        if (runningBatchIdentities.current.get(key) !== runBatchIdentity) return;
        runningBatchIdentities.current.delete(key);
        running.current.delete(key);
        activeFiles.current = Math.max(0, activeFiles.current - 1);
        const state = localRef.current[key];
        if (rerunKeys.current.delete(key) && state?.file && !state.paused && !state.createUnknown && !batchPausedRef.current) {
          pendingKeys.current.add(key);
          pendingQueue.current.push(key);
          updateLocal(key, { queued: true });
        }
        pumpQueue.current();
      });
    }
  };

  const enqueueMaterial = (material: PhysicalMaterial) => {
    if (material.assetBound) return;
    if (running.current.has(material.key)) {
      rerunKeys.current.add(material.key);
      return;
    }
    if (pendingKeys.current.has(material.key)) {
      queueMicrotask(() => pumpQueue.current());
      return;
    }
    pendingKeys.current.add(material.key);
    pendingQueue.current.push(material.key);
    updateLocal(material.key, { queued: !batchPausedRef.current });
    queueMicrotask(() => pumpQueue.current());
  };

  const focusSelectionPanel = () => setTimeout(() => selectionPanel.current?.focus(), 0);

  const scanSelectedFiles = async (
    files: File[],
    source: SelectionSource,
    role?: MaterialRole,
  ) => {
    const scanProjectId = projectIdRef.current;
    const scanManifest = contextQuery.data?.materialState.manifest;
    const scanGeneration = selectionGeneration.current;
    const priorPairing = pairing.phase === 'ready'
      && pairing.projectId === scanProjectId
      && pairing.generation === scanGeneration
      ? pairing
      : undefined;
    if (!scanProjectId) return;
    setSelection({ phase: 'idle' });
    setPairing({
      phase: 'scanning',
      source,
      role,
      scanned: 0,
      total: files.length,
      projectId: scanProjectId,
      manifestId: scanManifest?.id,
      generation: scanGeneration,
    });
    focusSelectionPanel();

    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const scannedResult = scanMaterialFiles(files);
      let scannedFiles = scannedResult.files.map((file) => role && compatibleWithRole(file, role)
        ? { ...file, suggestedRole: role }
        : file);
      if (scanManifest && source !== 'folder' && scanManifest.rootName) {
        scannedFiles = scannedFiles.map((file) => {
          const parts = file.relativePath.split('/').filter(Boolean);
          return parts.length > 1 && parts[0] !== scanManifest.rootName
            ? withRelativePathFingerprint(file, [scanManifest.rootName, ...parts.slice(1)].join('/'))
            : file;
        });
      }
      files.forEach((file, index) => {
        const scanned = scannedFiles[index];
        if (scanned) scanFilesRef.current.set(scanned.relativePath, file);
      });
      for (let scanned = 0; scanned < files.length; scanned += scanChunkSize) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (projectIdRef.current !== scanProjectId || selectionGeneration.current !== scanGeneration) return;
        setPairing({
          phase: 'scanning',
          source,
          role,
          scanned: Math.min(scanned + scanChunkSize, files.length),
          total: files.length,
          projectId: scanProjectId,
          manifestId: scanManifest?.id,
          generation: scanGeneration,
        });
      }

      const mediaFiles = scannedFiles.filter((file) => file.mediaType);
      if (mediaFiles.length === 0) {
        setPairing({ phase: 'empty', source, role, projectId: scanProjectId, generation: scanGeneration });
        setNotice('没有识别到可配对的 SRT 或 MP4 文件；未改变服务端素材清单。');
        return;
      }

      const manifestFiles = scanManifest ? scannedFromBindings(scanManifest.bindings) : [];
      const baseFiles = priorPairing?.files ?? manifestFiles;
      const baseSelections = priorPairing?.selections
        ?? (scanManifest ? selectionsFromBindings(scanManifest.bindings) : {});
      const paired = autoPairMaterials(scannedFiles);
      const currentEpisodes = Object.keys(baseSelections).map(Number);
      const episodes = [...new Set([...currentEpisodes, ...paired.episodes])].sort((left, right) => left - right);
      const nextSelections: MaterialSelections = source === 'role-folder' || source === 'single'
        ? Object.fromEntries(Object.entries(baseSelections).map(([episode, values]) => [Number(episode), { ...values }]))
        : paired.selections;

      const sourceRolePaths: Partial<Record<MaterialRole, string[]>> = {
        ...(priorPairing?.sourceRolePaths ?? {}),
      };
      const sourceSlotPaths = { ...(priorPairing?.sourceSlotPaths ?? {}) };
      let sourcePaths = [...(priorPairing?.sourcePaths ?? [])];
      let retainedFiles = [...baseFiles];

      if (source === 'role-folder' && role) {
        const replacedPaths = new Set([
          ...(sourceRolePaths[role] ?? []),
          ...Object.entries(sourceSlotPaths)
            .filter(([key]) => key.endsWith(`:${role}`))
            .map(([, path]) => path),
        ]);
        sourcePaths = sourcePaths.filter((path) => !replacedPaths.has(path));
        retainedFiles = retainedFiles.filter((file) => !replacedPaths.has(file.relativePath));
        Object.keys(sourceSlotPaths).forEach((key) => {
          if (key.endsWith(`:${role}`)) delete sourceSlotPaths[key];
        });
        sourceRolePaths[role] = scannedFiles.map((file) => file.relativePath);
        sourcePaths.push(...sourceRolePaths[role]);
        for (const episode of episodes) {
          const value = paired.selections[episode]?.[role];
          nextSelections[episode] = { ...nextSelections[episode], [role]: value };
        }
      }
      if (source === 'single') {
        const target = replacementTargetRef.current;
        const candidate = files.length === 1 ? scannedFiles[0] : undefined;
        if (target && candidate && compatibleWithRole(candidate, target.role)) {
          const original = scanManifest?.bindings.find((binding) =>
            binding.episodeNumber === target.episodeNumber && binding.role === target.role);
          const pathParts = (candidate.relativePath || candidate.fileName).replaceAll('\\', '/').split('/').filter(Boolean);
          const fileName = candidate.fileName;
          const relativePath = original
            ? `${original.relativePath.slice(0, original.relativePath.lastIndexOf('/') + 1)}${fileName}`
            : pathParts.length > 1 ? pathParts.slice(0, -1).concat(fileName).join('/') : fileName;
          const rebased = withRelativePathFingerprint(candidate, relativePath);
          const originalFile = files[0] ?? scanFilesRef.current.get(candidate.relativePath);
          if (originalFile) scanFilesRef.current.set(relativePath, originalFile);
          scannedFiles = [rebased];
          const slotKey = `${target.episodeNumber}:${target.role}`;
          const replacedPath = sourceSlotPaths[slotKey];
          if (replacedPath) sourcePaths = sourcePaths.filter((path) => path !== replacedPath);
          sourceSlotPaths[slotKey] = relativePath;
          sourcePaths.push(relativePath);
          nextSelections[target.episodeNumber] = {
            ...nextSelections[target.episodeNumber],
            [target.role]: relativePath,
          };
          if (!episodes.includes(target.episodeNumber)) episodes.push(target.episodeNumber);
          episodes.sort((left, right) => left - right);
        }
      }

      if (source !== 'role-folder' && source !== 'single') {
        sourcePaths = scannedFiles.map((file) => file.relativePath);
      }

      const validationFiles = mergeScannedFiles(retainedFiles, scannedFiles);
      const bindings = buildBindings(validationFiles, episodes, nextSelections);
      const selectedPaths = new Set(bindings.map((binding) => binding.relativePath));
      const blockers = findPairingBlockers(validationFiles, episodes, nextSelections);
      const unassigned = mediaFiles.filter((file) => !selectedPaths.has(file.relativePath));
      blockers.push(...unassigned.slice(0, 12).map((file) =>
        `${file.fileName} 未能安全归类${file.episodeNumber ? `到第 ${file.episodeNumber} 集` : ''}，请在对应角色槽人工选择。`));
      blockers.push(...scannedFiles.filter((file) => !file.mediaType || !file.episodeNumber || !file.fingerprintValid).map((file) =>
        `${file.fileName} 未识别或元数据指纹异常，不能确认。`));

      const readyFiles = mergeScannedFiles(retainedFiles, scannedFiles);
      const readyBindings = buildBindings(readyFiles, episodes, nextSelections);
      const readyBlockers = findPairingBlockers(readyFiles, episodes, nextSelections);
      const readySelectedPaths = new Set(readyBindings.map((binding) => binding.relativePath));
      readyBlockers.push(...sourcePaths
        .filter((path) => !readySelectedPaths.has(path))
        .map((path) => readyFiles.find((file) => file.relativePath === path))
        .filter((file): file is ScannedMaterialFile => Boolean(file))
        .slice(0, 12)
        .map((file) => `${file.fileName} 未能安全归类${file.episodeNumber ? `到第 ${file.episodeNumber} 集` : ''}，请在对应角色槽人工选择。`));
      readyBlockers.push(...scannedFiles.filter((file) => !file.mediaType || !file.episodeNumber || !file.fingerprintValid).map((file) =>
        `${file.fileName} 未识别或元数据指纹异常，不能确认。`));
      setPairing({
        phase: 'ready',
        source,
        role,
        rootName: scanManifest && source !== 'folder' ? scanManifest.rootName : scannedResult.rootName,
        files: readyFiles,
        sourcePaths: [...new Set(sourcePaths)],
        sourceRolePaths,
        sourceSlotPaths,
        episodes,
        selections: nextSelections,
        blockers: [...new Set(readyBlockers)],
        projectId: scanProjectId,
        manifestId: scanManifest?.id,
        generation: scanGeneration,
      });
      setNotice(`已读取 ${files.length} 个文件；请检查按集分类结果，确认前不会上传。`);
      focusSelectionPanel();
    } catch (error) {
      setPairing({
        phase: 'failed',
        source,
        role,
        projectId: scanProjectId,
        generation: scanGeneration,
        error: error instanceof Error ? error.message : '无法读取文件元数据。',
      });
      setNotice('文件夹扫描失败；服务端素材清单和已有上传进度未改变。');
    }
  };

  const readSelectedFiles = async (files: File[], source: SelectionSource, onlyKey?: string, onlyRole?: MaterialRole) => {
    if (files.length === 0) {
      setSelection({ phase: 'idle' });
      setNotice('已取消选择，本地队列和服务端素材清单均未改变。');
      lastPickerTrigger.current?.focus();
      return;
    }

    const selectionProjectId = projectIdRef.current;
    const selectionManifestId = manifestIdRef.current;
    const generation = selectionGeneration.current;
    if (!selectionProjectId) return;
    const shouldScan = !selectionManifestId || source === 'role-folder' || source === 'single';
    if (shouldScan) {
      await scanSelectedFiles(files, source, onlyRole);
      return;
    }
    if (!selectionManifestId) return;
    const isCurrentSelection = () => selectionGeneration.current === generation
      && projectIdRef.current === selectionProjectId
      && manifestIdRef.current === selectionManifestId;
    const availableMaterials = onlyKey
      ? materialsRef.current.filter((candidate) => candidate.key === onlyKey)
      : [...materialsRef.current];
    const selectionSessions = [...sessionsRef.current];

    setSelection({ phase: 'scanning', source, scanned: 0, total: files.length, projectId: selectionProjectId, manifestId: selectionManifestId, generation });
    focusSelectionPanel();
    for (let scanned = 0; scanned < files.length; scanned += scanChunkSize) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (!isCurrentSelection()) return;
      setSelection({
        phase: 'scanning',
        source,
        scanned: Math.min(scanned + scanChunkSize, files.length),
        total: files.length,
        projectId: selectionProjectId,
        manifestId: selectionManifestId,
        generation,
      });
    }

    if (!isCurrentSelection()) return;
    const result = matchSelectedFiles(files, availableMaterials);
    const matchedKeys = new Set(result.matches.map(({ material }) => material.key));
    const required = availableMaterials.filter((material) =>
      !material.assetBound && sessionForCurrentMaterial(material, selectionSessions)?.status !== 'completed');
    const missing = required.filter((material) => !matchedKeys.has(material.key)).length;
    if (!isCurrentSelection()) return;
    setSelection({ phase: 'summary', source, result, missing, projectId: selectionProjectId, manifestId: selectionManifestId, generation });
    setNotice(result.matches.length > 0
      ? `已读取 ${files.length} 个文件；确认后才会将 ${result.matches.length} 个匹配文件加入有界上传队列。`
      : `已读取 ${files.length} 个文件，但没有安全匹配项；请核对相对路径、大小和修改时间。`);
    focusSelectionPanel();
  };

  const queueMatchedFiles = (
    matches: FileSelectionResult['matches'],
    identity: { projectId: string; manifestId: string },
  ) => {
    const eligible = matches.filter(({ material }) => !material.assetBound);
    const next = { ...localRef.current };
    for (const { file, material } of eligible) {
      const intentIdentity = createIntentIdentity(identity.projectId, identity.manifestId, material.key);
      const persistedCommandId = readCreateIntents()[intentIdentity];
      if (persistedCommandId) createKeys.current.set(intentIdentity, persistedCommandId);
      next[material.key] = {
        ...next[material.key],
        file,
        paused: batchPausedRef.current,
        queued: !batchPausedRef.current && !persistedCommandId,
        creating: false,
        createUnknown: Boolean(persistedCommandId),
        checkingCreate: false,
        networkWaiting: false,
        clientError: undefined,
        requestId: undefined,
        allowTransportReplacement: true,
      };
      if (persistedCommandId) {
        pendingKeys.current.delete(material.key);
      } else if (running.current.has(material.key)) {
        rerunKeys.current.add(material.key);
      } else if (!pendingKeys.current.has(material.key)) {
        pendingKeys.current.add(material.key);
        pendingQueue.current.push(material.key);
      }
    }
    localRef.current = next;
    setLocal(next);
    return eligible.length;
  };

  const restoreDirectoryForBatch = async (requestPermission: boolean) => {
    const restoreManifest = contextQuery.data?.materialState.manifest;
    if (!contextMatchesProject || !restoreManifest) return;
    const key = directoryFileHandoffKey(projectId, restoreManifest.id, restoreManifest.version);
    setDirectoryRestoreState('restoring');
    const restored = await restoreDirectoryFiles(key, requestPermission);
    if (restored.status === 'needs-permission') {
      setDirectoryRestoreState('needs-permission');
      setNotice('本地素材目录仍需授权；服务端上传会话和已确认分片未改变。');
      return;
    }
    if (restored.status !== 'granted' || restored.files.length === 0) {
      setDirectoryRestoreState(restored.status === 'missing' ? 'idle' : 'failed');
      if (restored.status !== 'missing') setNotice('本地素材目录无法读取；请重新选择同一文件夹后继续。');
      return;
    }
    if (projectIdRef.current !== projectId
      || manifestIdRef.current !== restoreManifest.id
      || manifestVersionRef.current !== restoreManifest.version) return;
    const result = matchSelectedFiles(restored.files, materialsRef.current);
    const queuedCount = queueMatchedFiles(result.matches, { projectId, manifestId: restoreManifest.id });
    setDirectoryRestoreState('idle');
    if (queuedCount > 0) {
      setNotice(result.matches.length === restored.files.length
        ? `已从授权目录恢复 ${queuedCount} 个本地文件，将继续原上传会话。`
        : `已恢复 ${queuedCount} 个可安全匹配文件；其余文件需重新选择。`);
      queueMicrotask(() => pumpQueue.current());
    } else {
      setNotice('授权目录已读取，但没有匹配当前清单的文件；请重新选择同一文件夹。');
    }
  };

  useEffect(() => {
    const restoreManifest = contextQuery.data?.materialState.manifest;
    if (!contextMatchesProject || !restoreManifest) return;
    const key = directoryFileHandoffKey(projectId, restoreManifest.id, restoreManifest.version);
    if (directoryRestoreAttemptedRef.current.has(key)) return;
    if (Object.values(localRef.current).some((state) => state.file)) return;
    directoryRestoreAttemptedRef.current.add(key);
    void restoreDirectoryForBatch(false);
  }, [contextMatchesProject, contextQuery.data?.materialState.manifest, projectId]);

  useEffect(() => {
    const handoffManifest = contextQuery.data?.materialState.manifest;
    if (!contextMatchesProject || !handoffManifest) return;
    const handoff = takeMaterialFileHandoff(projectId, handoffManifest.id, handoffManifest.version);
    if (!handoff || handoff.projectId !== projectId) return;
    const result = matchSelectedFiles(handoff.files, materialsRef.current);
    const queuedCount = queueMatchedFiles(result.matches, {
      projectId,
      manifestId: handoffManifest.id,
    });
    if (queuedCount > 0) {
      setSelection({ phase: 'idle' });
      setNotice(result.matches.length === handoff.files.length
        ? `已从已确认清单接收 ${queuedCount} 个本地文件，现已进入有界上传队列。`
        : `已接收 ${queuedCount} 个可安全匹配文件；其余文件需重新选择后才能上传。`);
      queueMicrotask(() => pumpQueue.current());
    } else {
      setNotice('已确认素材清单，但本地文件匹配失败；请重新选择同一文件夹后再上传。');
    }
  }, [contextMatchesProject, contextQuery.data?.materialState.manifest, projectId]);

  const confirmSelection = () => {
    if (selection.phase !== 'summary') return;
    if (selection.generation !== selectionGeneration.current
      || selection.projectId !== projectIdRef.current
      || selection.manifestId !== manifestIdRef.current) {
      setSelection({ phase: 'idle' });
      setNotice('项目或素材清单已变更，本次本地分配已失效，请重新选择。');
      return;
    }
    const eligibleCount = queueMatchedFiles(selection.result.matches, {
      projectId: selection.projectId,
      manifestId: selection.manifestId,
    });
    setSelection({ phase: 'idle' });
    setNotice(`已确认 ${eligibleCount} 个物理文件；同时最多处理 ${maxConcurrentFiles} 个，其余保持排队。`);
    queueMicrotask(() => pumpQueue.current());
  };

  const pairingBlockers = (draft: Extract<PairingState, { phase: 'ready' }>) => {
    const bindings = buildBindings(draft.files, draft.episodes, draft.selections);
    const selectedPaths = new Set(bindings.map((binding) => binding.relativePath));
    const blockers = findPairingBlockers(draft.files, draft.episodes, draft.selections);
    blockers.push(...draft.sourcePaths
      .filter((path) => !selectedPaths.has(path))
      .map((path) => `${draft.files.find((file) => file.relativePath === path)?.fileName ?? path} 未能安全归类，请在对应角色槽人工选择。`));
    blockers.push(...draft.sourcePaths
      .map((path) => draft.files.find((file) => file.relativePath === path))
      .filter((file): file is ScannedMaterialFile => Boolean(file && (!file.mediaType || !file.episodeNumber || !file.fingerprintValid)))
      .map((file) => `${file.fileName} 未识别或元数据指纹异常，不能确认。`));
    return [...new Set(blockers)];
  };

  const updatePairingSelection = (episodeNumber: number, role: MaterialRole, relativePath: string) => {
    setPairing((current) => {
      if (current.phase !== 'ready') return current;
      const selections: MaterialSelections = {
        ...current.selections,
        [episodeNumber]: { ...current.selections[episodeNumber], [role]: relativePath || undefined },
      };
      const next = { ...current, selections };
      return { ...next, blockers: pairingBlockers(next) };
    });
    pairingIntentRef.current = null;
  };

  const applyConfirmedManifest = async (manifestResult: Parameters<typeof buildPhysicalMaterials>[0], draft: Extract<PairingState, { phase: 'ready' }>) => {
    if (projectIdRef.current !== draft.projectId
      || manifestIdRef.current !== draft.manifestId
      || selectionGeneration.current !== draft.generation) return;
    preserveBatchIdentityRef.current = batchIdentity(draft.projectId, manifestResult.id, manifestResult.version);
    const currentContext = queryClient.getQueryData<{ materialState: { project: Project; manifest: typeof manifestResult | null }; uploads: UploadSession[] }>(['upload-context', draft.projectId]);
    if (currentContext) {
      queryClient.setQueryData(['upload-context', draft.projectId], {
        ...currentContext,
        materialState: { ...currentContext.materialState, manifest: manifestResult },
      });
    }
    const nextMaterials = buildPhysicalMaterials(manifestResult);
    materialsRef.current = nextMaterials;
    const nextLocal: Record<string, LocalUploadState> = {};
    pendingQueue.current = [];
    pendingKeys.current.clear();
    const fileByPath = scanFilesRef.current;
    for (const material of nextMaterials) {
      const file = fileByPath.get(material.relativePath);
      const prior = localRef.current[material.key];
      if (!file && !prior?.file) continue;
      nextLocal[material.key] = {
        ...prior,
        file: file ?? prior?.file,
        paused: batchPausedRef.current,
        queued: !batchPausedRef.current && !material.assetBound,
        creating: false,
        createUnknown: false,
        checkingCreate: false,
        clientError: undefined,
        networkWaiting: false,
        requestId: undefined,
        allowTransportReplacement: true,
      };
      if (!batchPausedRef.current && !material.assetBound) {
        pendingKeys.current.add(material.key);
        pendingQueue.current.push(material.key);
      }
    }
    localRef.current = nextLocal;
    setLocal(nextLocal);
    setPairing({ phase: 'idle' });
    setSelection({ phase: 'idle' });
    setNotice(`素材清单已确认；已保留本轮文件对象，开始处理 ${pendingQueue.current.length} 个物理文件。`);
    queueMicrotask(() => pumpQueue.current());
  };

  const confirmPairing = async () => {
    if (pairing.phase !== 'ready' || pairing.confirming || pairingConfirmFlightRef.current) return;
    // React 状态尚未来得及回写时，第二个同步 click 仍会进入旧闭包；
    // 先用 ref 建立单飞门，再生成幂等键，保证同一草稿最多一个 POST。
    const pairingIdentity = JSON.stringify([pairing.projectId, pairing.manifestId ?? '', pairing.generation]);
    if (projectIdRef.current !== pairing.projectId
      || manifestIdRef.current !== pairing.manifestId
      || selectionGeneration.current !== pairing.generation) {
      setPairing({ phase: 'idle' });
      setNotice('项目或素材清单已变更，本次本地分配已失效，请重新选择。');
      return;
    }
    const blockers = pairingBlockers(pairing);
    if (blockers.length > 0) {
      setPairing({ ...pairing, blockers });
      setNotice('仍有分类阻断，处理完缺失、重复和未识别项后才能确认。');
      return;
    }
    const bindings = buildBindings(pairing.files, pairing.episodes, pairing.selections);
    if (bindings.length === 0) return;
    const contextManifest = contextQuery.data?.materialState.manifest;
    const currentManifest = contextMatchesProject
      && contextManifest?.id === manifestIdRef.current
      ? contextManifest
      : undefined;
    const body = {
      expectedVersion: currentManifest?.version ?? 0,
      rootName: pairing.rootName,
      bindings,
    };
    const signature = JSON.stringify(body);
    const intent = pairingIntentRef.current?.signature === signature
      ? pairingIntentRef.current
      : { signature, idempotencyKey: createUuid() };
    const flight = { identity: pairingIdentity, signature };
    pairingConfirmFlightRef.current = flight;
    pairingIntentRef.current = intent;
    setPairing({ ...pairing, confirming: true, error: undefined });

    try {
      if (currentManifest && currentManifest.rootName === body.rootName && sameBindings(currentManifest.bindings, bindings)) {
        await applyConfirmedManifest(currentManifest, pairing);
        return;
      }
      const confirmed = await confirmMaterialManifest({
          projectId: pairing.projectId,
          idempotencyKey: intent.idempotencyKey,
          body,
        });
      if (pairingConfirmFlightRef.current !== flight
        || projectIdRef.current !== pairing.projectId
        || manifestIdRef.current !== pairing.manifestId
        || selectionGeneration.current !== pairing.generation) return;
      pairingIntentRef.current = null;
      await applyConfirmedManifest(confirmed, pairing);
    } catch (error) {
      if (pairingConfirmFlightRef.current !== flight
        || projectIdRef.current !== pairing.projectId
        || manifestIdRef.current !== pairing.manifestId
        || selectionGeneration.current !== pairing.generation) return;
      setPairing({
        ...pairing,
        confirming: false,
        error: error instanceof MaterialApiError
          ? error.message
          : '确认结果未知；未开始上传，也未重发确认请求，请读取最新清单后再决定下一步。',
      });
      setNotice('素材清单确认未完成；本地分类草稿仍保留，服务端事实未被覆盖。');
    } finally {
      if (pairingConfirmFlightRef.current === flight) pairingConfirmFlightRef.current = null;
    }
  };

  const openSingleSlot = (episodeNumber: number, role: MaterialRole) => {
    replacementTargetRef.current = { episodeNumber, role };
    lastPickerSource.current = 'single';
    lastPickerTrigger.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    setNotice(`正在等待选择第 ${episodeNumber} 集${materialRoleLabels[role]}原文件；只重算当前槽位。`);
    if (replaceInput.current) replaceInput.current.value = '';
    replaceInput.current?.click();
  };

  const cancelSelection = () => {
    setSelection({ phase: 'idle' });
    setNotice('已取消本次分配，本地队列和服务端素材清单均未改变。');
    lastPickerTrigger.current?.focus();
  };

  const openNativeDirectoryPicker = async () => {
    try {
      const handle = await pickDirectoryHandle();
      if (!handle) {
        handlePickerCancel();
        return;
      }
      const currentManifest = contextQuery.data?.materialState.manifest;
      if (currentManifest && contextMatchesProject) {
        await persistDirectoryHandle(
          directoryFileHandoffKey(projectId, currentManifest.id, currentManifest.version),
          handle,
        );
      }
      const files = await readDirectoryHandleFiles(handle);
      if (files.length === 0) {
        handlePickerCancel();
        return;
      }
      setNotice(`已读取到${files.length}个文件，正在匹配；确认前不会上传。`);
      await readSelectedFiles(files, 'folder');
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') {
        handlePickerCancel();
        return;
      }
      setNotice('本地目录读取失败；服务端上传会话未改变，请重新选择。');
    }
  };

  const openPicker = (source: SelectionSource, input: HTMLInputElement | null, trigger: HTMLButtonElement, role?: MaterialRole) => {
    lastPickerTrigger.current = trigger;
    lastPickerSource.current = source;
    pickerRoleRef.current = role;
    if ((source === 'folder' || source === 'role-folder') && !supportsFolderSelection) {
      setNotice('当前浏览器不支持选择文件夹，请使用“选择多个文件”；不会改动素材清单。');
      return;
    }
    setSelection({ phase: 'waiting', source });
    setNotice(`正在等待选择${sourceLabel[source]}；确认前只读取名称、路径、大小和修改时间，不会上传。`);
    if (source === 'folder' && directoryPickerSupported()) {
      void openNativeDirectoryPicker();
      return;
    }
    if (input) input.value = '';
    input?.click();
  };

  const snapshotAndReadSelectedFiles = (input: HTMLInputElement, source: SelectionSource, onlyKey?: string, onlyRole?: MaterialRole) => {
    const files = [...(input.files ?? [])];
    if (files.length === 0) {
      handlePickerCancel();
      return;
    }
    setNotice(`已读取到${files.length}个文件，正在匹配；确认前不会上传。`);
    void readSelectedFiles(files, source, onlyKey, onlyRole);
  };

  const handlePickerCancel = () => {
    setSelection({ phase: 'idle' });
    setNotice('已取消选择，本地队列和服务端素材清单均未改变。');
    setPickerFocusRequest((request) => request + 1);
  };

  useEffect(() => {
    if (pickerFocusRequest === 0) return;
    const source = lastPickerSource.current;
    const trigger = lastPickerTrigger.current?.isConnected
      ? lastPickerTrigger.current
      : source ? document.querySelector<HTMLButtonElement>(`[data-picker-trigger="${source}"]`) : null;
    trigger?.focus();
  }, [pickerFocusRequest]);

  useEffect(() => {
    const inputs = [
      folderInput.current,
      filesInput.current,
      replaceInput.current,
      ...Object.values(roleFolderInputs.current),
    ].filter((input): input is HTMLInputElement => Boolean(input));
    inputs.forEach((input) => input.addEventListener('cancel', handlePickerCancel));
    return () => inputs.forEach((input) => input.removeEventListener('cancel', handlePickerCancel));
  });

  const pause = (material: PhysicalMaterial) => {
    transportControllers.current.get(material.key)?.pause();
    updateLocal(material.key, { paused: true, queued: false });
  };
  const recoverCreate = async (material: PhysicalMaterial) => {
    const recoveryProjectId = projectIdRef.current;
    const recoveryManifestId = manifestIdRef.current;
    const recoveryManifestVersion = manifestVersionRef.current;
    const recoveryBatchIdentity = batchIdentity(recoveryProjectId, recoveryManifestId, recoveryManifestVersion);
    if (!recoveryManifestId) return;
    const intentIdentity = createIntentIdentity(recoveryProjectId, recoveryManifestId, material.key);
    const commandId = createKeys.current.get(intentIdentity) ?? readCreateIntents()[intentIdentity];
    if (!commandId || localRef.current[material.key]?.checkingCreate) return;
    updateLocal(material.key, { checkingCreate: true, clientError: undefined, requestId: undefined });
    try {
      const result = await getUploadCreateCommand(recoveryProjectId, commandId);
      if (batchIdentityRef.current !== recoveryBatchIdentity
        || projectIdRef.current !== recoveryProjectId
        || manifestIdRef.current !== recoveryManifestId
        || manifestVersionRef.current !== recoveryManifestVersion) return;
      updateSessionForBatch(result.session, recoveryBatchIdentity);
      createKeys.current.delete(intentIdentity);
      writeCreateIntent(intentIdentity, undefined);
      const terminal = ['completed', 'expired', 'aborted'].includes(result.session.status);
      updateLocal(material.key, {
        file: terminal ? undefined : localRef.current[material.key]?.file,
        createUnknown: false,
        checkingCreate: false,
        queued: false,
        creating: false,
        clientError: undefined,
        requestId: undefined,
      });
      if (!terminal) enqueueMaterial(material);
    } catch (error) {
      if (batchIdentityRef.current !== recoveryBatchIdentity
        || projectIdRef.current !== recoveryProjectId
        || manifestIdRef.current !== recoveryManifestId
        || manifestVersionRef.current !== recoveryManifestVersion) return;
      updateLocal(material.key, {
        createUnknown: true,
        checkingCreate: false,
        clientError: error instanceof UploadApiError && error.code === 'UPLOAD_CREATE_COMMAND_NOT_FOUND'
          ? '同一创建命令暂未查到已提交结果；未重发创建请求，请稍后再次检查。'
          : errorCopy(error),
        requestId: error instanceof UploadApiError && error.requestId !== 'unknown' ? error.requestId : undefined,
      });
    }
  };
  const resume = (material: PhysicalMaterial, allowTransportReplacement = false) => {
    if (localRef.current[material.key]?.createUnknown) return;
    const transport = transportControllers.current.get(material.key);
    if (transport && running.current.has(material.key)) {
      transport.resume();
      updateLocal(material.key, { paused: false, networkWaiting: false, clientError: undefined, queued: false, uploading: true });
      return;
    }
    updateLocal(material.key, {
      paused: false,
      networkWaiting: false,
      clientError: undefined,
      queued: true,
      allowTransportReplacement,
    });
    enqueueMaterial(material);
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
    const target = material.targets[0];
    if (target) replacementTargetRef.current = { episodeNumber: target.episodeNumber, role: target.role };
    const trigger = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    if (trigger) openPicker('single', replaceInput.current, trigger);
    else replaceInput.current?.click();
  };

  const pauseBatch = () => {
    batchPausedRef.current = true;
    setBatchPaused(true);
    const next = { ...localRef.current };
    for (const material of materialsRef.current) {
      if (next[material.key]?.file && !material.assetBound) {
        transportControllers.current.get(material.key)?.pause();
        next[material.key] = { ...next[material.key], paused: true, queued: false };
      }
    }
    localRef.current = next;
    setLocal(next);
    setNotice('整批已暂停：不会启动新文件或新分片；当前在途分片确认后停止，服务端会话与已确认进度保留。');
  };

  const resumeBatch = () => {
    batchPausedRef.current = false;
    setBatchPaused(false);
    const next = { ...localRef.current };
    for (const material of materialsRef.current) {
      const state = next[material.key];
      if (!state?.file || state.createUnknown || material.assetBound) continue;
      const transport = transportControllers.current.get(material.key);
      next[material.key] = {
        ...state,
        paused: false,
        queued: !transport,
        clientError: undefined,
        networkWaiting: false,
        uploading: Boolean(transport) || state.uploading,
        allowTransportReplacement: true,
      };
      if (transport && running.current.has(material.key)) {
        transport.resume();
      } else if (!pendingKeys.current.has(material.key) && !running.current.has(material.key)) {
        pendingKeys.current.add(material.key);
        pendingQueue.current.push(material.key);
      }
    }
    localRef.current = next;
    setLocal(next);
    setNotice('整批继续：复用原文件与既有上传会话，只处理未确认分片。');
    queueMicrotask(() => pumpQueue.current());
  };

  const finishLegacyAbort = async (material: PhysicalMaterial, result: UploadSession) => {
    updateSession(result);
    abortIntents.current.delete(result.id);
    const refreshed = await contextQuery.refetch();
    const authoritative = refreshed.data?.uploads.find((session) => session.id === result.id);
    if (authoritative) updateSessionForBatch(authoritative, currentBatchIdentity);
    updateLocal(material.key, {
      file: undefined,
      paused: false,
      queued: false,
      creating: false,
      uploading: false,
      legacyAbortPending: false,
      legacyAbortUnknown: false,
      allowTransportReplacement: false,
      clientError: undefined,
      requestId: undefined,
    });
  };

  const focusCancelReturn = (key: string) => {
    setTimeout(() => {
      setTimeout(() => {
        const row = [...document.querySelectorAll<HTMLTableRowElement>('[data-upload-material-key]')]
          .find((candidate) => candidate.dataset.uploadMaterialKey === key);
        row?.querySelector<HTMLElement>('[data-upload-row-action]')?.focus();
      }, 0);
    }, 0);
  };

  const closeCancelDialog = (key?: string) => {
    const returnKey = key ?? cancelDialog?.returnKey;
    setCancelDialog(null);
    setSelected(new Set());
    if (returnKey) focusCancelReturn(returnKey);
  };

  const openCancelDialog = (kind: CancelDialogKind, items: CancelDialogItem[]) => {
    if (items.length === 0 || cancelBusy) return;
    setCancelDialog({ kind, items, returnKey: items[0]!.material.key, pending: false });
  };

  const clearCancelledSession = (material: PhysicalMaterial, result: UploadSession) => {
    updateSession(result);
    abortIntents.current.delete(result.id);
    updateLocal(material.key, {
      paused: false,
      queued: false,
      uploading: false,
      file: undefined,
      clientError: undefined,
      requestId: undefined,
    });
  };

  const executeCancelDialog = async () => {
    const dialog = cancelDialog;
    if (!dialog || dialog.pending) return;
    setCancelDialog((current) => current ? { ...current, pending: true, error: undefined } : current);
    const unknownUploadIds: string[] = [];
    let firstError: CancelDialogError | undefined;
    for (const { material, session } of dialog.items) {
      try {
        updateLocal(material.key, {
          clientError: undefined,
          requestId: undefined,
          ...(dialog.kind === 'legacy' ? { legacyAbortPending: true, legacyAbortUnknown: false } : {}),
        });
        transportControllers.current.get(material.key)?.cancel();
        const intent = abortIntents.current.get(session.id) ?? {
          key: `browser-${session.id}-abort`,
          expectedVersion: session.version,
        };
        abortIntents.current.set(session.id, intent);
        const result = await abortUpload(session.id, intent.key, { expectedVersion: intent.expectedVersion });
        if (result.status !== 'aborted') {
          unknownUploadIds.push(session.id);
          updateLocal(material.key, {
            clientError: '取消结果待确认；未重发请求。',
            requestId: undefined,
            ...(dialog.kind === 'legacy' ? { legacyAbortPending: false, legacyAbortUnknown: true } : {}),
          });
          continue;
        }
        if (dialog.kind === 'legacy') await finishLegacyAbort(material, result);
        else clearCancelledSession(material, result);
      } catch (error) {
        const requestId = error instanceof UploadApiError && error.requestId !== 'unknown' ? error.requestId : undefined;
        if (error instanceof UploadApiError) {
          firstError ??= { message: errorCopy(error), requestId };
          updateLocal(material.key, {
            clientError: errorCopy(error),
            requestId,
            ...(dialog.kind === 'legacy' ? { legacyAbortPending: false, legacyAbortUnknown: false } : {}),
          });
        } else {
          unknownUploadIds.push(session.id);
          updateLocal(material.key, {
            clientError: '取消请求结果未知；未重发请求。',
            requestId,
            ...(dialog.kind === 'legacy' ? { legacyAbortPending: false, legacyAbortUnknown: true } : {}),
          });
        }
      }
    }
    if (firstError || unknownUploadIds.length > 0) {
      setCancelDialog((current) => current ? {
        ...current,
        pending: false,
        error: {
          message: firstError?.message ?? '取消请求结果未知；未重发请求。',
          requestId: firstError?.requestId,
          unknownUploadIds: unknownUploadIds.length > 0 ? unknownUploadIds : undefined,
        },
      } : current);
      return;
    }
    await contextQuery.refetch();
    closeCancelDialog(dialog.returnKey);
  };

  const recoverCancelDialog = async () => {
    const dialog = cancelDialog;
    const unknownIds = dialog?.error?.unknownUploadIds ?? [];
    if (!dialog || dialog.pending || unknownIds.length === 0) return;
    setCancelDialog((current) => current ? { ...current, pending: true, error: undefined } : current);
    const remaining: string[] = [];
    let firstError: CancelDialogError | undefined;
    for (const uploadId of unknownIds) {
      const item = dialog.items.find(({ session }) => session.id === uploadId);
      if (!item) continue;
      try {
        const result = await getUpload(uploadId);
        if (result.status === 'aborted') {
          if (dialog.kind === 'legacy') await finishLegacyAbort(item.material, result);
          else clearCancelledSession(item.material, result);
        } else {
          remaining.push(uploadId);
        }
      } catch (error) {
        remaining.push(uploadId);
        firstError ??= {
          message: errorCopy(error),
          requestId: error instanceof UploadApiError && error.requestId !== 'unknown' ? error.requestId : undefined,
        };
      }
    }
    if (remaining.length > 0 || firstError) {
      setCancelDialog((current) => current ? {
        ...current,
        pending: false,
        error: {
          message: firstError?.message ?? '服务端尚未确认取消；未重发请求。',
          requestId: firstError?.requestId,
          unknownUploadIds: remaining,
        },
      } : current);
      return;
    }
    await contextQuery.refetch();
    closeCancelDialog(dialog.returnKey);
  };

  const abandonLegacyUpload = (material: PhysicalMaterial, expectedSession: UploadSession) => {
    const current = sessionForCurrentMaterial(material, sessionsRef.current, 'tus');
    if (!current || current.id !== expectedSession.id || ['completed', 'aborted', 'expired'].includes(current.status)) return;
    openCancelDialog('legacy', [{ material, session: current }]);
  };

  const recoverLegacyAbort = async (material: PhysicalMaterial, expectedSession: UploadSession) => {
    const intent = abortIntents.current.get(expectedSession.id);
    if (!intent) return;
    updateLocal(material.key, { legacyAbortPending: true, clientError: undefined, requestId: undefined });
    try {
      const result = await getUpload(expectedSession.id);
      updateSession(result);
      if (result.status === 'aborted') {
        await finishLegacyAbort(material, result);
        return;
      }
      updateLocal(material.key, {
        legacyAbortPending: false,
        legacyAbortUnknown: false,
        clientError: '服务端确认旧上传尚未放弃；如需继续，请再次显式放弃旧上传。',
      });
    } catch (error) {
      updateLocal(material.key, {
        legacyAbortPending: false,
        legacyAbortUnknown: true,
        clientError: errorCopy(error),
        requestId: error instanceof UploadApiError && error.requestId !== 'unknown' ? error.requestId : undefined,
      });
    }
  };

  const cancelMaterials = (items: PhysicalMaterial[]) => {
    const bySession = new Map<string, CancelDialogItem>();
    for (const material of items) {
      const session = sessionForCurrentMaterial(material, sessionsRef.current);
      if (session && !['completed', 'aborted'].includes(session.status)) bySession.set(session.id, { material, session });
    }
    openCancelDialog('cancel', [...bySession.values()]);
  };

  const rows = useMemo(() => materials.map((material) => {
    const session = sessionForCurrentMaterial(material, sessions);
    const legacySession = session ? undefined : sessionForCurrentMaterial(material, sessions, 'tus');
    const localState = local[material.key];
    const cancelPending = Boolean(cancelDialog?.pending && cancelDialog.items.some(({ material: item }) => item.key === material.key));
    const state = project?.lifecycleStatus !== 'active'
      ? '项目不可用'
      : localState?.legacyAbortPending
        ? '正在放弃旧上传'
        : localState?.legacyAbortUnknown
          ? '放弃结果待确认'
          : isActiveLegacySession(legacySession)
            ? '旧上传待处理'
            : statusLabel(session, localState, material.assetBound);
    return { material, session, legacySession, localState, state, cancelPending };
  }), [cancelDialog, local, materials, project?.lifecycleStatus, sessions]);

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
  const bulkSelectableRows = visibleRows.filter(({ legacySession }) => !isActiveLegacySession(legacySession));
  const selectedRows = rows.filter(({ material, legacySession }) => selected.has(material.key) && !isActiveLegacySession(legacySession));
  const totalBytes = rows.reduce((sum, { material }) => sum + material.sizeBytes, 0);
  const confirmedBytes = rows.reduce((sum, { material, session }) => {
    if (material.assetBound || session?.status === 'completed') return sum + material.sizeBytes;
    const serverBytes = session?.confirmedParts.reduce((partSum, part) => partSum + part.sizeBytes, 0) ?? 0;
    const localBytes = local[material.key]?.progressBytes ?? 0;
    return sum + Math.min(material.sizeBytes, Math.max(serverBytes, localBytes));
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
  if (!projectId || (contextQuery.isLoading && !contextQuery.data)) return <div className={styles.statePanel}>正在加载素材清单…</div>;
  if (contextQuery.isError) return <div className={styles.statePanel}>素材清单读取失败，请刷新重试。</div>;

  return (
    <section className={styles.page}>
      <div className={styles.batchHeader}>
        <div className={styles.batchIdentity}>
          <label>
            <span>整剧批次</span>
            <select value={projectId} onChange={(event) => {
              selectionGeneration.current += 1;
              replacementKey.current = undefined;
              lastPickerSource.current = undefined;
              setProjectId(event.target.value);
              setSelected(new Set());
              localRef.current = {};
              setLocal({});
              pendingQueue.current = [];
              pendingKeys.current.clear();
              rerunKeys.current.clear();
              batchPausedRef.current = false;
              setBatchPaused(false);
              setSelection({ phase: 'idle' });
              setNotice('');
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
          <button data-picker-trigger="multiple" className={styles.secondaryButton} type="button" onClick={(event) => openPicker('multiple', filesInput.current, event.currentTarget)}>选择多个文件</button>
          <button data-picker-trigger="folder" className={styles.primaryButton} type="button" onClick={(event) => openPicker('folder', folderInput.current, event.currentTarget)} aria-describedby="folder-selection-support">选择系列文件夹</button>
          {materialRoles.map((role) => (
            <span className={styles.rolePicker} key={role}>
              <button data-picker-trigger={`role-${role}`} className={styles.secondaryButton} type="button" onClick={(event) => openPicker('role-folder', roleFolderInputs.current[role] ?? null, event.currentTarget, role)}>
                选择{materialRoleLabels[role]}文件夹
              </button>
              <button className={styles.roleFileButton} type="button" onClick={(event) => openPicker('multiple', filesInput.current, event.currentTarget, role)}>
                选择文件
              </button>
            </span>
          ))}
        </div>
      </div>

      <input ref={folderInput} className="sr-only" id="upload-folder" type="file" multiple
        // @ts-expect-error Chromium 文件夹选择属性
        webkitdirectory="" onChange={(event) => {
          const input = event.currentTarget;
          snapshotAndReadSelectedFiles(input, 'folder');
        }} />
      {materialRoles.map((role) => (
        <input key={role} ref={(input) => { roleFolderInputs.current[role] = input; }} className="sr-only" id={`upload-role-folder-${role}`} type="file" multiple
          // @ts-expect-error Chromium 文件夹选择属性
          webkitdirectory="" onChange={(event) => {
            const input = event.currentTarget;
            snapshotAndReadSelectedFiles(input, 'role-folder', undefined, role);
          }} />
      ))}
      <input ref={filesInput} className="sr-only" id="upload-files" type="file" multiple accept=".srt,.mp4"
        onChange={(event) => {
          const input = event.currentTarget;
          const role = pickerRoleRef.current;
          pickerRoleRef.current = undefined;
          snapshotAndReadSelectedFiles(input, role ? 'role-folder' : 'multiple', undefined, role);
        }} />
      <input ref={replaceInput} className="sr-only" id="upload-replace" type="file" accept=".srt,.mp4"
        onChange={(event) => {
          const input = event.currentTarget;
          snapshotAndReadSelectedFiles(input, 'single', replacementKey.current);
        }} />

        {!manifest && (
          <div className={styles.notice} role="status">
            尚无已确认素材清单；选择总系列文件夹后先读取、分类并确认 manifest，确认前不会上传。
            <Link to={`/projects/${projectId}/materials`}>前往素材工作台</Link>
          </div>
        )}
           <div className={styles.selectionPanel} ref={selectionPanel} tabIndex={-1} aria-live="polite" aria-busy={selection.phase === 'scanning' || pairing.phase === 'scanning'}>
            <div className={styles.selectionHeading}>
              <div>
                <strong>本地素材分配</strong>
                <span id="folder-selection-support">{supportsFolderSelection
                  ? '支持选择系列文件夹；确认前只读取文件元数据，不上传内容。'
                  : '当前浏览器不支持文件夹选择，请使用“选择多个文件”。'}</span>
              </div>
              {selection.phase === 'idle' && pairing.phase === 'idle' && <span className={styles.selectionState}>尚未选择</span>}
              {selection.phase === 'waiting' && <span className={styles.selectionState}>等待选择{sourceLabel[selection.source]}</span>}
              {selection.phase === 'scanning' && <span className={styles.selectionState}>正在读取 {selection.scanned} / {selection.total}</span>}
              {pairing.phase === 'scanning' && <span className={styles.selectionState}>正在读取 {pairing.scanned} / {pairing.total}</span>}
            </div>
            {selection.phase === 'scanning' && (
              <progress className={styles.scanProgress} max={selection.total} value={selection.scanned} aria-label={`正在读取 ${selection.scanned} / ${selection.total}`} />
            )}
            {pairing.phase === 'scanning' && (
              <progress className={styles.scanProgress} max={pairing.total} value={pairing.scanned} aria-label={`正在读取 ${pairing.scanned} / ${pairing.total}`} />
            )}
            {selection.phase === 'summary' && (
              <div className={styles.selectionSummary}>
                <div className={styles.selectionMetrics}>
                  <span>安全匹配 <strong>{selection.result.matches.length}</strong></span>
                  <span>清单缺失 <strong>{selection.missing}</strong></span>
                  <span>重复冲突 <strong>{selection.result.duplicateMaterialKeys.length}</strong></span>
                  <span>待人工 <strong>{selection.result.ambiguous.length}</strong></span>
                  <span>未识别 <strong>{selection.result.unmatched.length}</strong></span>
                </div>
                {(selection.result.unmatched.length > 0 || selection.result.ambiguous.length > 0) && (
                  <p className={styles.selectionIssues}>
                    {selection.result.mixedRoots
                      ? '检测到多个选中根目录，已停止自动分配。请一次只选择一个系列根目录。'
                      : <>未自动分配：{[...selection.result.ambiguous, ...selection.result.unmatched].slice(0, 3).map((file) => file.name).join('、')}
                        {[...selection.result.ambiguous, ...selection.result.unmatched].length > 3 ? ` 等 ${[...selection.result.ambiguous, ...selection.result.unmatched].length} 个` : ''}。
                        请核对相对路径、大小和修改时间；歧义文件可在对应行重新选择原文件。</>}
                  </p>
                )}
                <div className={styles.selectionActions}>
                  <button className={styles.primaryButton} type="button" onClick={confirmSelection} disabled={selection.result.matches.length === 0}>确认并开始上传</button>
                  <button className={styles.secondaryButton} type="button" onClick={cancelSelection}>取消本次分配</button>
                </div>
              </div>
            )}
           </div>
          {uploadActivity && <p className={styles.notice} role="status">上传正在进行；刷新会暂时丢失本地 File。请先暂停，或确保已授权的本地素材目录可恢复。</p>}
          {directoryRestoreState === 'restoring' && <p className={styles.notice} role="status">正在从已授权的本地素材目录恢复文件…</p>}
          {directoryRestoreState === 'needs-permission' && (
            <div className={styles.notice} role="alert">
              <span>已找到本地素材目录，但浏览器需要重新授权；服务端会话和已确认分片保持不变。</span>
              <button type="button" onClick={() => void restoreDirectoryForBatch(true)}>重新授权本地素材目录</button>
            </div>
          )}

          {pairing.phase === 'ready' ? (
            <PairingOperationBar pairing={pairing} onConfirm={confirmPairing} onCancel={() => {
              setPairing({ phase: 'idle' });
              setNotice('已取消本次分类，本地文件和服务端清单均未改变。');
            }} />
          ) : (
            <UploadOperationBar
              overallProgress={overallProgress}
              confirmedBytes={confirmedBytes}
              totalBytes={totalBytes}
              pendingCount={pendingCount}
              failedCount={failedCount}
              physicalCount={rows.length}
              batchPaused={batchPaused}
              canPause={rows.some(({ localState }) => localState?.file)}
              onPause={pauseBatch}
              onResume={resumeBatch}
            />
          )}

          {pairing.phase === 'ready' && (
            <PairingPreview
              pairing={pairing}
              onChange={updatePairingSelection}
              onSingleSlot={openSingleSlot}
            />
          )}
          {pairing.phase === 'empty' && <div className={styles.statePanel}><strong>没有可配对素材</strong><span>请重新选择包含 SRT 或 MP4 的系列文件夹。</span></div>}
          {pairing.phase === 'failed' && <div className={styles.statePanel}><strong>文件夹扫描失败</strong><span>{pairing.error}</span></div>}

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
                <button type="button" onClick={() => selectedRows.forEach(({ material }) => resume(material, true))}>继续上传</button>
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
                <th><input type="checkbox" aria-label="选择当前页" disabled={bulkSelectableRows.length === 0} checked={bulkSelectableRows.length > 0 && bulkSelectableRows.every(({ material }) => selected.has(material.key))}
                  onChange={(event) => setSelected((current) => {
                    const next = new Set(current); bulkSelectableRows.forEach(({ material }) => event.target.checked ? next.add(material.key) : next.delete(material.key)); return next;
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
                  onPause={() => pause(row.material)} onResume={() => resume(row.material, true)} onRecoverCreate={() => recoverCreate(row.material)} onReselect={() => reselect(row.material)}
                  onAbandonLegacy={() => row.legacySession && abandonLegacyUpload(row.material, row.legacySession)}
                  onRecoverLegacyAbort={() => row.legacySession && recoverLegacyAbort(row.material, row.legacySession)}
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
          {cancelDialog && <UploadCancelDialog dialog={cancelDialog} onClose={() => { if (!cancelDialog.pending) closeCancelDialog(); }} onConfirm={executeCancelDialog} onRecover={recoverCancelDialog} />}
        </section>
  );
};

const UploadOperationBar = ({
  overallProgress,
  confirmedBytes,
  totalBytes,
  pendingCount,
  failedCount,
  physicalCount,
  batchPaused,
  canPause,
  onPause,
  onResume,
}: {
  overallProgress: number;
  confirmedBytes: number;
  totalBytes: number;
  pendingCount: number;
  failedCount: number;
  physicalCount: number;
  batchPaused: boolean;
  canPause: boolean;
  onPause: () => void;
  onResume: () => void;
}) => (
  <section className={styles.operationBar} aria-label={`整批总体进度 ${overallProgress}%`}>
    <div className={styles.operationHeading}>
      <div><strong>整批总体进度</strong><span>{confirmedBytes ? `${formatSize(confirmedBytes)} / ${formatSize(totalBytes)}` : `共 ${formatSize(totalBytes)}`}</span></div>
      <strong>{overallProgress}%</strong>
    </div>
    <div className={styles.progressTrack}><span style={{ transform: `scaleX(${overallProgress / 100})` }} /></div>
    <div className={styles.operationMetrics}>
      <span>待处理 <strong>{pendingCount}</strong></span>
      <span className={failedCount ? styles.failedSummary : ''}>失败 <strong>{failedCount}</strong></span>
      <span>物理文件 <strong>{physicalCount}</strong></span>
      <div className={styles.operationActions}>
        <button type="button" onClick={onPause} disabled={batchPaused || !canPause}>暂停整批</button>
        <button type="button" onClick={onResume} disabled={!batchPaused}>继续整批</button>
      </div>
    </div>
  </section>
);

const PairingOperationBar = ({
  pairing,
  onConfirm,
  onCancel,
}: {
  pairing: Extract<PairingState, { phase: 'ready' }>;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const bindings = buildBindings(pairing.files, pairing.episodes, pairing.selections);
  const missingCount = pairing.blockers.filter((blocker) => /缺少|未能安全归类|类型或指纹无效/.test(blocker)).length;
  const duplicateCount = pairing.blockers.filter((blocker) => /候选|重复占用/.test(blocker)).length;
  const pendingCount = Math.max(0, pairing.blockers.length - missingCount - duplicateCount);
  const focusFirstIssue = () => {
    const issue = document.getElementById('upload-pairing-issues');
    if (!issue) return;
    issue.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    issue.focus();
  };
  return (
    <section className={styles.operationBar} aria-label="分配操作">
      <div className={styles.operationHeading}>
        <div><strong>分配结果</strong><span>确认前不会上传；同一 MP4 的多个角色引用仍只产生一次物理上传。</span></div>
        <strong>{pairing.confirming ? '确认中…' : pairing.blockers.length ? '需处理' : '可确认'}</strong>
      </div>
      <div className={styles.operationMetrics}>
        <span>已匹配 <strong>{bindings.length}</strong></span>
        <span>缺失 <strong>{missingCount}</strong></span>
        <span>重复 <strong>{duplicateCount}</strong></span>
        <span>待处理 <strong>{pendingCount}</strong></span>
      </div>
      <div className={styles.operationActions}>
        <button className={styles.primaryButton} type="button" aria-label="确认分配并开始上传" onClick={onConfirm} disabled={Boolean(pairing.blockers.length) || pairing.confirming}>
          {pairing.confirming ? '确认中…' : '确认并开始上传'}
        </button>
        {pairing.blockers.length > 0 && (
          <button className={styles.secondaryButton} type="button" onClick={focusFirstIssue} disabled={pairing.confirming}>查看第一个问题</button>
        )}
        <button className={styles.secondaryButton} type="button" onClick={onCancel} disabled={pairing.confirming}>取消本次分配</button>
      </div>
    </section>
  );
};

const PairingPreview = ({
  pairing,
  onChange,
  onSingleSlot,
}: {
  pairing: Extract<PairingState, { phase: 'ready' }>;
  onChange: (episodeNumber: number, role: MaterialRole, relativePath: string) => void;
  onSingleSlot: (episodeNumber: number, role: MaterialRole) => void;
}) => {
  const bindings = buildBindings(pairing.files, pairing.episodes, pairing.selections);
  const physicalCount = new Set(pairing.sourcePaths).size;
  const selectedByPath = new Map<string, MaterialRole[]>();
  bindings.forEach((binding) => selectedByPath.set(binding.relativePath, [...(selectedByPath.get(binding.relativePath) ?? []), binding.role]));
  return (
    <section className={styles.pairingPreview} aria-labelledby="upload-pairing-title" aria-busy={pairing.confirming}>
      <div className={styles.pairingHeading}>
        <div>
          <h2 id="upload-pairing-title">分配预览</h2>
          <p>{pairing.rootName} · 物理文件 {physicalCount} 个 / 角色槽 {bindings.length} 个 · 确认前不会上传</p>
        </div>
        <div className={pairing.blockers.length ? styles.pairingBlocked : styles.pairingReady} role="status">
          <strong>{pairing.blockers.length}</strong>
          <span>{pairing.blockers.length ? '个确认阻断' : '可以确认'}</span>
        </div>
      </div>
      <p className={styles.pairingSummary}>确认后会将 {physicalCount} 个匹配文件加入上传队列（{bindings.length} 个角色绑定）；同一 MP4 可在同集两个视频角色中共享且只上传一次。</p>
      <div className={styles.pairingTableWrap}>
        <table className={styles.pairingTable}>
          <thead><tr><th>集数</th>{materialRoles.map((role) => <th key={role}>{materialRoleLabels[role]}</th>)}</tr></thead>
          <tbody>
            {pairing.episodes.map((episode) => (
              <tr key={episode}>
                <th scope="row">第 {episode} 集</th>
                {materialRoles.map((role) => {
                  const value = pairing.selections[episode]?.[role] ?? '';
                  const shared = value && (selectedByPath.get(value)?.includes('asr_video') && selectedByPath.get(value)?.includes('screen_video'));
                  const candidates = pairing.files.filter((file) => file.episodeNumber === episode && compatibleWithRole(file, role));
                  return (
                    <td key={role}>
                      <select aria-label={`第 ${episode} 集${materialRoleLabels[role]}`} value={value} onChange={(event) => onChange(episode, role, event.target.value)}>
                        <option value="">{role === 'screen_video' ? '明确留空' : '请选择文件'}</option>
                        {candidates.map((file) => (
                          <option key={`${role}:${file.relativePath}`} value={file.relativePath}>{file.fileName} · {file.relativePath}</option>
                        ))}
                      </select>
                      <button className={styles.slotButton} type="button" onClick={() => onSingleSlot(episode, role)}>选择单个文件</button>
                      {value && <small>{shared ? '共享同一文件 · 物理上传一次' : value}</small>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pairing.blockers.length > 0 && (
        <div className={styles.pairingIssues} id="upload-pairing-issues" role="alert" tabIndex={-1}>
          <strong>需要人工处理</strong>
          <ul>{pairing.blockers.slice(0, 24).map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
        </div>
      )}
      {pairing.error && <p className={styles.selectionIssues} role="alert">{pairing.error}</p>}
    </section>
  );
};

interface RowProps {
  material: PhysicalMaterial;
  session: UploadSession | undefined;
  legacySession: UploadSession | undefined;
  localState: LocalUploadState | undefined;
  state: string;
  selected: boolean;
  expanded: boolean;
  project: Project | undefined;
  onSelect: (checked: boolean) => void;
  onExpand: () => void;
  onPause: () => void;
  onResume: () => void;
  onRecoverCreate: () => void;
  onReselect: () => void;
  onAbandonLegacy: () => void;
  onRecoverLegacyAbort: () => void;
  onCancel: () => void;
  cancelPending: boolean;
}

const UploadRow = ({ material, session, legacySession, localState, state, selected, expanded, project, onSelect, onExpand, onPause, onResume, onRecoverCreate, onReselect, onAbandonLegacy, onRecoverLegacyAbort, onCancel, cancelPending }: RowProps) => {
  const activeLegacy = isActiveLegacySession(legacySession);
  const canPause = Boolean(localState?.file) && ['上传中', '排队中', '正在创建上传任务'].includes(state);
  const needsFile = ['等待重新选择', '等待本地文件', '会话已过期', '失败', '已取消'].includes(state) && !localState?.file;
  const canResume = Boolean(localState?.file) && ['本机已暂停', '正在暂停', '断网等待', '失败', '待上传'].includes(state);
  const action = cancelPending
    ? { label: '正在取消…', run: onCancel, link: false, disabled: true }
    : project?.lifecycleStatus !== 'active'
    ? { label: '返回项目', run: undefined, link: true }
    : localState?.legacyAbortPending
      ? { label: '正在放弃旧上传…', run: onAbandonLegacy, link: false, disabled: true }
    : localState?.legacyAbortUnknown
      ? { label: '检查放弃结果', run: onRecoverLegacyAbort, link: false }
    : activeLegacy
      ? { label: '放弃旧上传', run: onAbandonLegacy, link: false }
    : localState?.createUnknown
      ? { label: localState.checkingCreate ? '正在检查创建结果…' : '检查创建结果', run: onRecoverCreate, link: false }
    : needsFile
      ? { label: state === '会话已过期' ? '重建任务并重新选择' : '重新选择原文件', run: onReselect, link: false }
      : canResume
        ? { label: state === '失败' ? '重试' : '继续上传', run: onResume, link: false }
        : canPause
          ? { label: '暂停上传', run: onPause, link: false }
          : undefined;
  const displayedSession = session ?? legacySession;
  const confirmedBytes = session?.confirmedParts.reduce((sum, part) => sum + part.sizeBytes, 0) ?? 0;
  const authoritativeBytes = Math.max(confirmedBytes, localState?.progressBytes ?? 0);
  const serverProgress = material.sizeBytes > 0 ? Math.min(100, Math.round((authoritativeBytes / material.sizeBytes) * 100)) : 0;
  const progressCopy = localState?.creating
    ? '正在创建上传任务'
    : activeLegacy ? '历史 TUS 会话 · 不使用 multipart 分片计数'
    : session ? `服务端已确认 ${serverProgress}%` : localState?.queued ? '等待有界队列' : undefined;
  return (
    <>
      <tr className={state === '已完成' ? styles.completedRow : ''} data-upload-material-key={material.key}>
        <td><input type="checkbox" aria-label={`选择 ${material.fileName}`} checked={selected && !activeLegacy} disabled={activeLegacy} onChange={(event) => onSelect(event.target.checked)} /></td>
        <td><button className={styles.fileButton} type="button" onClick={onExpand} aria-expanded={expanded}><strong>{material.fileName}</strong><span>{material.roles.map((role) => roleLabel[role]).join(' · ')}</span></button></td>
        <td>第 {material.episodeNumber} 集</td>
        <td>
          <span className={`${styles.status} ${statusTone(state)}`}>{state}</span>
          {material.roles.length > 1 && <small className={styles.shared}>共享文件 · 上传一次</small>}
          {progressCopy && <small className={styles.rowProgress}>{progressCopy}</small>}
        </td>
        <td className={styles.numeric}>{formatSize(material.sizeBytes)}</td>
        <td className={styles.numeric}>{formatDate(material.lastModifiedMs)}</td>
        <td>{action?.run
          ? <button className={styles.rowAction} data-upload-row-action="true" type="button" onClick={action.run} disabled={localState?.checkingCreate || ('disabled' in action && action.disabled)}>{action.label}</button>
          : action?.link
            ? <Link className={styles.rowAction} data-upload-row-action="true" to="/projects">{action.label}</Link>
            : action
              ? <span className={styles.doneText}>{action.label}</span>
              : <span className={styles.doneText}>无需操作</span>}</td>
        <td><details className={styles.menu}><summary aria-label={`${material.fileName} 更多操作`}>•••</summary><div><button type="button" onClick={onExpand}>查看详情</button>{state !== '已完成' && !activeLegacy && <button type="button" onClick={onCancel} disabled={cancelPending}>取消未完成上传</button>}</div></details></td>
      </tr>
      {expanded && <tr className={styles.detailRow}><td colSpan={8}><div>
        <dl>
          <div><dt>相对路径</dt><dd>{material.relativePath}</dd></div>
          <div><dt>传输方式</dt><dd>{legacySession ? '历史 TUS' : session ? 'multipart' : '尚未创建'}</dd></div>
          <div><dt>已确认分片</dt><dd>{legacySession ? '旧 TUS 会话不使用 multipart 分片计数' : `${session?.confirmedParts.length ?? 0} / ${session?.totalParts ?? '—'}`}</dd></div>
          <div><dt>缺失分片</dt><dd>{legacySession ? '由旧 TUS 协议维护' : session?.missingPartNumbers.join('、') || '无'}</dd></div>
          <div><dt>会话有效期</dt><dd>{displayedSession ? formatDate(displayedSession.expiresAt) : '尚未创建'}</dd></div>
          <div><dt>文件指纹核对</dt><dd>{localState?.file ? '已匹配本地原文件' : '等待重新选择时核对'}</dd></div>
          <div><dt>最近错误</dt><dd>{localState?.clientError ?? displayedSession?.errorDetail ?? '无'}</dd></div>
          <div><dt>请求标识</dt><dd>{localState?.requestId ?? '—'}</dd></div>
          {localState?.paused && <div><dt>暂停说明</dt><dd>本机已暂停；服务端仍为 {displayedSession?.status ?? 'created'}，会话仍会到期。</dd></div>}
        </dl>
      </div></td></tr>}
    </>
  );
};

const UploadCancelDialog = ({
  dialog,
  onClose,
  onConfirm,
  onRecover,
}: {
  dialog: CancelDialogState;
  onClose: () => void;
  onConfirm: () => void;
  onRecover: () => void;
}) => {
  const dialogRef = useRef<HTMLElement>(null);
  const returnRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (dialog.pending) dialogRef.current?.focus();
    else returnRef.current?.focus();
  }, [dialog.pending]);
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      if (!dialog.pending) {
        event.preventDefault();
        onClose();
      }
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [])];
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const isLegacy = dialog.kind === 'legacy';
  const title = isLegacy ? '确认放弃旧上传' : '确认取消未完成上传';
  const actionLabel = isLegacy ? '放弃旧上传' : '取消未完成上传';
  const error = dialog.error;
  return (
    <div className={styles.cancelModalBackdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !dialog.pending) onClose();
    }}>
      <section
        ref={dialogRef}
        className={styles.cancelModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-cancel-title"
        aria-describedby="upload-cancel-summary"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.cancelModalHeader}>
          <div>
            <span className={styles.cancelModalEyebrow}>高风险操作</span>
            <h2 id="upload-cancel-title">{title}</h2>
          </div>
        </div>
        <p id="upload-cancel-summary">
          {isLegacy ? `仅放弃 ${dialog.items[0]?.material.fileName ?? '该文件'} 的旧上传，不影响其他素材。` : `将取消 ${dialog.items.length} 个未完成上传；已完成 Asset 不受影响。`}
        </p>
        <ul className={styles.cancelFileList}>
          {dialog.items.map(({ material }) => <li key={material.key}>{material.fileName}</li>)}
        </ul>
        {error && (
          <div className={styles.cancelError} role="alert">
            <strong>{error.unknownUploadIds?.length ? '取消结果待确认' : '取消未完成'}</strong>
            <span>{error.message}</span>
            {error.requestId && <span>请求标识：{error.requestId}</span>}
            {error.unknownUploadIds?.length ? (
              <button className={styles.secondaryButton} type="button" onClick={onRecover} disabled={dialog.pending}>
                {dialog.pending ? '正在查询本次取消结果…' : '查询本次取消结果'}
              </button>
            ) : null}
          </div>
        )}
        <div className={styles.cancelModalActions}>
          <button ref={returnRef} className={styles.secondaryButton} type="button" onClick={onClose} disabled={dialog.pending}>返回检查</button>
          <button ref={confirmRef} className={styles.dangerButton} type="button" onClick={onConfirm} disabled={dialog.pending}>
            {dialog.pending ? (isLegacy ? '正在放弃旧上传…' : '正在取消…') : `确认${actionLabel}`}
          </button>
        </div>
      </section>
    </div>
  );
};
