import type { MaterialBinding, MaterialMediaType, MaterialRole } from '@qimao-terms-cloud/contracts';

export interface ScannedMaterialFile {
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  lastModifiedMs: number;
  fingerprint: string;
  mediaType: MaterialMediaType | null;
  episodeNumber: number | null;
  suggestedRole: MaterialRole | null;
  fingerprintValid: boolean;
}

export type MaterialSelections = Record<number, Partial<Record<MaterialRole, string>>>;

const episodePatterns = [
  /第\s*0*(\d{1,3})\s*[集话]/i,
  /(?:episode|ep|e)[\s_-]*0*(\d{1,3})(?:\D|$)/i,
  /^0*(\d{1,3})(?:\D|$)/i,
  /(?:^|\D)0*(\d{1,3})(?:\D*)$/i,
];

const detectEpisode = (fileName: string) => {
  const stem = fileName.replace(/\.[^.]+$/, '');
  for (const pattern of episodePatterns) {
    const match = stem.match(pattern);
    const episode = Number(match?.[1]);
    if (episode >= 1 && episode <= 100) return episode;
  }
  return null;
};

const detectMediaType = (fileName: string): MaterialMediaType | null => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.srt')) return 'srt';
  if (lower.endsWith('.mp4')) return 'video';
  return null;
};

const detectRole = (relativePath: string, mediaType: MaterialMediaType | null): MaterialRole | null => {
  if (mediaType === 'srt') return 'company_srt';
  if (mediaType !== 'video') return null;
  return /(画面字|人名条|有字|screen|onscreen|ocr)/i.test(relativePath)
    ? 'screen_video'
    : 'asr_video';
};

export const scanMaterialFiles = (files: File[]) => {
  const scanned = files.map<ScannedMaterialFile>((file) => {
    const relativePath = (file.webkitRelativePath || file.name).replaceAll('\\', '/');
    const mediaType = detectMediaType(file.name);
    return {
      relativePath,
      fileName: file.name,
      sizeBytes: file.size,
      lastModifiedMs: file.lastModified,
      fingerprint: `${relativePath}|${file.size}|${file.lastModified}`,
      mediaType,
      episodeNumber: detectEpisode(file.name),
      suggestedRole: detectRole(relativePath, mediaType),
      fingerprintValid: file.size > 0 && file.lastModified > 0,
    };
  });
  const rootName = scanned[0]?.relativePath.split('/')[0] ?? '';
  return { rootName, files: scanned };
};

export const autoPairMaterials = (files: ScannedMaterialFile[]) => {
  const episodes = [...new Set(
    files.filter((file) => file.mediaType && file.episodeNumber).map((file) => file.episodeNumber!),
  )].sort((left, right) => left - right);
  const selections: MaterialSelections = {};
  for (const episode of episodes) {
    selections[episode] = {};
    for (const role of ['company_srt', 'asr_video', 'screen_video'] as const) {
      const candidates = files.filter(
        (file) => file.episodeNumber === episode && file.suggestedRole === role && file.fingerprintValid,
      );
      if (candidates.length === 1) selections[episode]![role] = candidates[0]!.relativePath;
    }
  }
  return { episodes, selections };
};

export const compatibleWithRole = (file: ScannedMaterialFile, role: MaterialRole) =>
  file.fingerprintValid && (role === 'company_srt' ? file.mediaType === 'srt' : file.mediaType === 'video');

export const buildBindings = (
  files: ScannedMaterialFile[],
  episodes: number[],
  selections: MaterialSelections,
) => episodes.flatMap((episodeNumber) =>
  (['company_srt', 'asr_video', 'screen_video'] as const).flatMap<MaterialBinding>((role) => {
    const path = selections[episodeNumber]?.[role];
    const file = files.find((candidate) => candidate.relativePath === path);
    return file && file.mediaType
      ? [{
          episodeNumber,
          role,
          relativePath: file.relativePath,
          fileName: file.fileName,
          sizeBytes: file.sizeBytes,
          lastModifiedMs: file.lastModifiedMs,
          fingerprint: file.fingerprint,
          mediaType: file.mediaType,
        }]
      : [];
  }),
);

export const findPairingBlockers = (
  files: ScannedMaterialFile[],
  episodes: number[],
  selections: MaterialSelections,
) => {
  const blockers: string[] = [];
  const used = new Map<string, { episodeNumber: number; role: MaterialRole }>();
  for (const episode of episodes) {
    for (const role of ['company_srt', 'asr_video'] as const) {
      if (!selections[episode]?.[role]) {
        const label = role === 'company_srt' ? '公司字幕 SRT' : '中文识别视频';
        const candidates = files.filter(
          (file) => file.episodeNumber === episode && file.suggestedRole === role && file.fingerprintValid,
        );
        blockers.push(candidates.length > 1
          ? `第 ${episode} 集的${label}存在 ${candidates.length} 个候选，请在对应单元格人工选择。`
          : `第 ${episode} 集缺少${label}。`);
      }
    }
    if (!selections[episode]?.screen_video) {
      const screenCandidates = files.filter(
        (file) => file.episodeNumber === episode && file.suggestedRole === 'screen_video' && file.fingerprintValid,
      );
      if (screenCandidates.length > 1) {
        blockers.push(`第 ${episode} 集的画面字视频存在 ${screenCandidates.length} 个候选，请在对应单元格人工选择或明确留空。`);
      }
    }
    for (const role of ['company_srt', 'asr_video', 'screen_video'] as const) {
      const path = selections[episode]?.[role];
      if (!path) continue;
      const file = files.find((candidate) => candidate.relativePath === path);
      const prior = used.get(path);
      if (prior) {
        const sharedRoles = new Set([prior.role, role]);
        const canShareVideo = prior.episodeNumber === episode
          && sharedRoles.size === 2
          && sharedRoles.has('asr_video')
          && sharedRoles.has('screen_video')
          && file?.mediaType === 'video';
        if (!canShareVideo) blockers.push(`${path} 已用于第 ${prior.episodeNumber} 集，不能重复占用。`);
      } else {
        used.set(path, { episodeNumber: episode, role });
      }
      if (!file || !compatibleWithRole(file, role)) blockers.push(`第 ${episode} 集的素材类型或指纹无效。`);
    }
  }
  return blockers;
};
