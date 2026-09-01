import type {
  MaterialBinding,
  MaterialManifest,
  MaterialRole,
  UploadMaterialTarget,
  UploadSession,
  UploadTransportKind,
} from '@qimao-terms-cloud/contracts';

export interface PhysicalMaterial {
  key: string;
  projectId: string;
  manifestId: string;
  manifestVersion: number;
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  lastModifiedMs: number;
  fingerprint: string;
  mediaKind: 'srt' | 'video';
  episodeNumber: number;
  roles: MaterialRole[];
  targets: UploadMaterialTarget[];
  assetBound: boolean;
}

export interface LocalUploadState {
  file?: File | undefined;
  paused?: boolean | undefined;
  pausing?: boolean | undefined;
  queued?: boolean | undefined;
  creating?: boolean | undefined;
  uploading?: boolean | undefined;
  progressBytes?: number | undefined;
  progressTotalBytes?: number | undefined;
  createUnknown?: boolean | undefined;
  checkingCreate?: boolean | undefined;
  networkWaiting?: boolean | undefined;
  clientError?: string | undefined;
  requestId?: string | undefined;
  allowTransportReplacement?: boolean | undefined;
  legacyAbortPending?: boolean | undefined;
  legacyAbortUnknown?: boolean | undefined;
}

const materialKey = (manifest: MaterialManifest, binding: MaterialBinding) =>
  `${manifest.projectId}:${manifest.id}:${manifest.version}:${binding.episodeNumber}:${binding.relativePath}:${binding.sizeBytes}:${binding.lastModifiedMs}:${binding.fingerprint}`;

export const buildPhysicalMaterials = (manifest: MaterialManifest): PhysicalMaterial[] => {
  const grouped = new Map<string, PhysicalMaterial>();
  const boundTargets = new Set(manifest.assetBindings.map((binding) => `${binding.episodeNumber}:${binding.role}`));
  for (const binding of manifest.bindings) {
    const key = materialKey(manifest, binding);
    const current = grouped.get(key);
    const target = { episodeNumber: binding.episodeNumber, role: binding.role };
    if (current) {
      current.roles.push(binding.role);
      current.targets.push(target);
      current.assetBound = current.assetBound && boundTargets.has(`${binding.episodeNumber}:${binding.role}`);
      continue;
    }
    grouped.set(key, {
      key,
      projectId: manifest.projectId,
      manifestId: manifest.id,
      manifestVersion: manifest.version,
      relativePath: binding.relativePath,
      fileName: binding.fileName,
      sizeBytes: binding.sizeBytes,
      lastModifiedMs: binding.lastModifiedMs,
      fingerprint: binding.fingerprint,
      mediaKind: binding.mediaType,
      episodeNumber: binding.episodeNumber,
      roles: [binding.role],
      targets: [target],
      assetBound: boundTargets.has(`${binding.episodeNumber}:${binding.role}`),
    });
  }
  return [...grouped.values()];
};

const sameTargets = (left: UploadMaterialTarget[], right: UploadMaterialTarget[]) =>
  left.length === right.length && left.every((target) => right.some((candidate) =>
    candidate.episodeNumber === target.episodeNumber && candidate.role === target.role));

export const sessionsForMaterial = (
  material: PhysicalMaterial,
  sessions: UploadSession[],
  transportKind: UploadTransportKind = 'multipart',
) => sessions.filter((session) =>
    session.projectId === material.projectId
    && session.materialBinding?.manifestId === material.manifestId
    && session.transportKind === transportKind
    && session.fileFingerprint === material.fingerprint
    && session.originalFileName === material.fileName
    && session.mediaKind === material.mediaKind
    && session.sizeBytes === material.sizeBytes
    && sameTargets(session.materialBinding.targets, material.targets));

export const sessionForMaterial = (
  material: PhysicalMaterial,
  sessions: UploadSession[],
  transportKind: UploadTransportKind = 'multipart',
) => sessionsForMaterial(material, sessions, transportKind)[0];

export const statusLabel = (session: UploadSession | undefined, local: LocalUploadState | undefined, bound: boolean) => {
  if (bound || session?.status === 'completed') return '已完成';
  if (local?.createUnknown) return '创建结果待确认';
  if (local?.pausing || (local?.paused && local?.creating)) return '正在暂停';
  if (local?.creating) return '正在创建上传任务';
  if (local?.queued) return '排队中';
  if (local?.paused) return '本机已暂停';
  if (local?.uploading) return '上传中';
  if (local?.networkWaiting) return '断网等待';
  if (local?.clientError || session?.status === 'failed') return '失败';
  if (!local?.file && session && ['created', 'uploading'].includes(session.status)) return '等待重新选择';
  if (!session) return local?.file ? '待上传' : '等待本地文件';
  if (session.status === 'created') return '待上传';
  if (session.status === 'uploading') return '上传中';
  if (session.status === 'completing' || session.status === 'verifying') return '校验中';
  if (session.status === 'expired') return '会话已过期';
  if (session.status === 'aborted') return '已取消';
  return '待处理';
};

export const actionRank = (status: string) => {
  if (status === '失败' || status === '会话已过期' || status === '创建结果待确认') return 0;
  if (status === '待上传' || status === '等待重新选择' || status === '等待本地文件') return 1;
  if (status === '上传中' || status === '排队中' || status === '正在创建上传任务' || status === '正在暂停' || status === '断网等待') return 2;
  return 3;
};

export const roleLabel: Record<MaterialRole, string> = {
  company_srt: '公司字幕',
  asr_video: '中文识别视频',
  screen_video: '画面字视频',
};
