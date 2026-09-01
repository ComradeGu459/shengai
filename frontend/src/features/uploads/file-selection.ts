import type { PhysicalMaterial } from './model.js';

export interface MaterialFileHandoff {
  projectId: string;
  manifestId: string;
  manifestVersion: number;
  files: File[];
}

const materialFileHandoffs = new Map<string, MaterialFileHandoff>();

const handoffKey = (projectId: string, manifestId: string, manifestVersion: number) =>
  `${projectId}:${manifestId}:${manifestVersion}`;

/**
 * 同一 SPA 会话内把已确认清单对应的 File 引用交接给上传页。
 * 只存内存，不写入 storage；页面刷新后自然丢失并要求重新授权。
 */
export const storeMaterialFileHandoff = (handoff: MaterialFileHandoff) => {
  materialFileHandoffs.set(
    handoffKey(handoff.projectId, handoff.manifestId, handoff.manifestVersion),
    { ...handoff, files: [...handoff.files] },
  );
};

export const getPendingMaterialFileHandoffProjectId = () =>
  [...materialFileHandoffs.values()].at(-1)?.projectId;

export const takeMaterialFileHandoff = (
  projectId: string,
  manifestId: string,
  manifestVersion: number,
) => {
  const key = handoffKey(projectId, manifestId, manifestVersion);
  const handoff = materialFileHandoffs.get(key);
  if (handoff) materialFileHandoffs.delete(key);
  return handoff;
};

interface DirectoryFileHandleLike {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
}

export interface DirectoryHandleLike {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<DirectoryHandleLike | DirectoryFileHandleLike>;
  queryPermission?: (descriptor?: { mode: 'read' }) => Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?: (descriptor?: { mode: 'read' }) => Promise<'granted' | 'denied' | 'prompt'>;
}

const directoryHandleMemory = new Map<string, DirectoryHandleLike>();
const directoryHandleDbName = 'qimao-upload-handles-v1';
const directoryHandleStoreName = 'directories';

const openDirectoryHandleDb = () => new Promise<IDBDatabase | undefined>((resolve) => {
  if (typeof indexedDB === 'undefined') {
    resolve(undefined);
    return;
  }
  try {
    const request = indexedDB.open(directoryHandleDbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(directoryHandleStoreName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  } catch {
    resolve(undefined);
  }
});

export const directoryFileHandoffKey = (
  projectId: string,
  manifestId: string,
  manifestVersion: number,
) => `${projectId}:${manifestId}:${manifestVersion}`;

export const pickDirectoryHandle = async () => {
  const picker = (globalThis as typeof globalThis & {
    showDirectoryPicker?: () => Promise<DirectoryHandleLike>;
  }).showDirectoryPicker;
  return picker ? picker() : undefined;
};

export const directoryPickerSupported = () => Boolean((globalThis as typeof globalThis & {
  showDirectoryPicker?: unknown;
}).showDirectoryPicker);

export const persistDirectoryHandle = async (key: string, handle: DirectoryHandleLike) => {
  directoryHandleMemory.set(key, handle);
  const db = await openDirectoryHandleDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(directoryHandleStoreName, 'readwrite');
      transaction.objectStore(directoryHandleStoreName).put(handle, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

const loadDirectoryHandle = async (key: string) => {
  const memory = directoryHandleMemory.get(key);
  if (memory) return memory;
  const db = await openDirectoryHandleDb();
  if (!db) return undefined;
  return new Promise<DirectoryHandleLike | undefined>((resolve) => {
    try {
      const request = db.transaction(directoryHandleStoreName, 'readonly')
        .objectStore(directoryHandleStoreName).get(key);
      request.onsuccess = () => {
        const handle = request.result as DirectoryHandleLike | undefined;
        if (handle) directoryHandleMemory.set(key, handle);
        resolve(handle);
      };
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
};

const withRelativePath = (file: File, relativePath: string) => {
  try {
    Object.defineProperty(file, 'webkitRelativePath', { configurable: true, value: relativePath });
  } catch {
    // 非 Chromium 实现可能不允许定义该只读属性；调用方仍保留文件名/元数据匹配。
  }
  return file;
};

const readDirectoryEntries = async (directory: DirectoryHandleLike, prefix = directory.name): Promise<File[]> => {
  const files: File[] = [];
  for await (const entry of directory.values()) {
    if (entry.kind === 'directory') {
      files.push(...await readDirectoryEntries(entry, `${prefix}/${entry.name}`));
      continue;
    }
    if (!/\.(?:srt|mp4)$/i.test(entry.name)) continue;
    files.push(withRelativePath(await entry.getFile(), `${prefix}/${entry.name}`));
  }
  return files;
};

export const readDirectoryHandleFiles = (handle: DirectoryHandleLike) => readDirectoryEntries(handle);

export const restoreDirectoryFiles = async (key: string, requestPermission = false) => {
  const handle = await loadDirectoryHandle(key);
  if (!handle) return { status: 'missing' as const, files: [] as File[] };
  let permission = await handle.queryPermission?.({ mode: 'read' }) ?? 'granted';
  if (permission !== 'granted' && requestPermission && handle.requestPermission) {
    permission = await handle.requestPermission({ mode: 'read' });
  }
  if (permission !== 'granted') return { status: 'needs-permission' as const, files: [] as File[], handle };
  try {
    return { status: 'granted' as const, files: await readDirectoryEntries(handle) };
  } catch {
    return { status: 'failed' as const, files: [] as File[], handle };
  }
};

export const clearDirectoryHandle = async (key: string) => {
  directoryHandleMemory.delete(key);
  const db = await openDirectoryHandleDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(directoryHandleStoreName, 'readwrite');
      transaction.objectStore(directoryHandleStoreName).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

export interface SelectedFileMatch {
  file: File;
  material: PhysicalMaterial;
}

export interface FileSelectionResult {
  matches: SelectedFileMatch[];
  unmatched: File[];
  ambiguous: File[];
  duplicateMaterialKeys: string[];
  mixedRoots: boolean;
}

const normalizePath = (value: string | undefined) => (value ?? '')
  .replaceAll('\\', '/')
  .split('/')
  .filter(Boolean)
  .join('/');

const pathWithoutSelectedRoot = (value: string) => {
  const parts = normalizePath(value).split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : parts[0] ?? '';
};

export const selectedFilePath = (file: File) => normalizePath(file.webkitRelativePath || file.name);

const sameFingerprintMetadata = (file: File, material: PhysicalMaterial) =>
  file.size === material.sizeBytes && file.lastModified === material.lastModifiedMs;

const rankedCandidates = (file: File, materials: PhysicalMaterial[]) => {
  const selectedPath = selectedFilePath(file);
  const metadataMatches = materials.filter((material) => sameFingerprintMetadata(file, material));
  const exact = metadataMatches.filter((material) => normalizePath(material.relativePath) === selectedPath);
  if (exact.length > 0) return exact;

  const rootIndependent = metadataMatches.filter((material) =>
    pathWithoutSelectedRoot(material.relativePath) === pathWithoutSelectedRoot(selectedPath));
  if (rootIndependent.length > 0) return rootIndependent;

  return metadataMatches.filter((material) => material.fileName === file.name);
};

export const matchSelectedFiles = (files: File[], materials: PhysicalMaterial[]): FileSelectionResult => {
  const selectedRoots = new Set(files.flatMap((file) => {
    const parts = normalizePath(file.webkitRelativePath).split('/');
    return parts.length > 1 && parts[0] ? [parts[0]] : [];
  }));
  if (selectedRoots.size > 1) {
    return {
      matches: [],
      unmatched: [],
      ambiguous: files,
      duplicateMaterialKeys: [],
      mixedRoots: true,
    };
  }

  const provisional: SelectedFileMatch[] = [];
  const unmatched: File[] = [];
  const ambiguous: File[] = [];

  for (const file of files) {
    const candidates = rankedCandidates(file, materials);
    if (candidates.length === 0) {
      unmatched.push(file);
      continue;
    }
    if (candidates.length !== 1) {
      ambiguous.push(file);
      continue;
    }
    provisional.push({ file, material: candidates[0]! });
  }

  const counts = new Map<string, number>();
  provisional.forEach(({ material }) => counts.set(material.key, (counts.get(material.key) ?? 0) + 1));
  const duplicateMaterialKeys = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
  const duplicateSet = new Set(duplicateMaterialKeys);

  return {
    matches: provisional.filter(({ material }) => !duplicateSet.has(material.key)),
    unmatched,
    ambiguous: [...ambiguous, ...provisional.filter(({ material }) => duplicateSet.has(material.key)).map(({ file }) => file)],
    duplicateMaterialKeys,
    mixedRoots: false,
  };
};

export const folderSelectionSupported = () => {
  if (typeof document === 'undefined') return false;
  const input = document.createElement('input');
  return 'webkitdirectory' in input || 'directory' in input;
};
