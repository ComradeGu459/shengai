import type {
  MaterialBinding,
  MaterialManifest,
  MaterialRole,
  UploadMaterialTarget,
  UploadSession,
} from '@qimao-terms-cloud/contracts';

export interface PhysicalMaterial {
  key: string;
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
  queued?: boolean | undefined;
  hashing?: boolean | undefined;
  networkWaiting?: boolean | undefined;
  clientError?: string | undefined;
  requestId?: string | undefined;
}

const materialKey = (binding: MaterialBinding) =>
  `${binding.episodeNumber}:${binding.relativePath}:${binding.sizeBytes}:${binding.lastModifiedMs}`;

export const buildPhysicalMaterials = (manifest: MaterialManifest): PhysicalMaterial[] => {
  const grouped = new Map<string, PhysicalMaterial>();
  const boundTargets = new Set(manifest.assetBindings.map((binding) => `${binding.episodeNumber}:${binding.role}`));
  for (const binding of manifest.bindings) {
    const key = materialKey(binding);
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

export const sessionForMaterial = (material: PhysicalMaterial, sessions: UploadSession[]) =>
  sessions.find((session) => session.fileFingerprint === material.fingerprint)
  ?? sessions.find((session) => session.materialBinding?.targets.some((target) =>
    material.targets.some((candidate) => candidate.episodeNumber === target.episodeNumber && candidate.role === target.role)));

export const statusLabel = (session: UploadSession | undefined, local: LocalUploadState | undefined, bound: boolean) => {
  if (bound || session?.status === 'completed') return '已完成';
  if (local?.hashing) return '正在准备';
  if (local?.queued) return '排队中';
  if (local?.paused) return '本机已暂停';
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
  if (status === '失败' || status === '会话已过期') return 0;
  if (status === '待上传' || status === '等待重新选择' || status === '等待本地文件') return 1;
  if (status === '上传中' || status === '排队中' || status === '正在准备' || status === '断网等待') return 2;
  return 3;
};

export const roleLabel: Record<MaterialRole, string> = {
  company_srt: '公司字幕',
  asr_video: '中文识别视频',
  screen_video: '画面字视频',
};
