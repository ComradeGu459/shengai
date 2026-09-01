// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import type { UploadSession } from '@qimao-terms-cloud/contracts';

vi.mock('../../frontend/src/features/uploads/upload-engine.js', () => ({
  MAX_ACTIVE_UPLOAD_FILES: 2,
  uploadFileWithMultipart: vi.fn(),
  UploadCompletionUnknownError: class UploadCompletionUnknownError extends Error {},
  UploadTransportUnknownError: class UploadTransportUnknownError extends Error {},
}));

import { UploadQueue } from '../../frontend/src/features/uploads/UploadQueue.js';
import { matchSelectedFiles } from '../../frontend/src/features/uploads/file-selection.js';
import { buildPhysicalMaterials, sessionForMaterial, statusLabel } from '../../frontend/src/features/uploads/model.js';
import { uploadFileWithMultipart } from '../../frontend/src/features/uploads/upload-engine.js';

const uploadFileWithMultipartMock = vi.mocked(uploadFileWithMultipart);
const projectId = 'ca65378e-8935-4c4a-9e8b-13efca3d314a';
const manifestId = 'ca65378e-8935-4c4a-9e8b-13efca3d314b';
const uploadId = 'ca65378e-8935-4c4a-9e8b-13efca3d314c';
const timestamp = 1_755_000_000_000;
const project = {
  id: projectId,
  name: '匿名上传项目',
  workflowStatus: 'uploading' as const,
  lifecycleStatus: 'active' as const,
  recycleExpiresAt: null,
  version: 2,
  createdAt: '2026-08-13T08:00:00.000Z',
  updatedAt: '2026-08-13T08:00:00.000Z',
  createdBy: 'local-user',
  updatedBy: 'local-user',
};
const bindings = [
  { episodeNumber: 1, role: 'company_srt' as const, relativePath: '匿名剧/SRT/EP01.srt', fileName: 'EP01.srt', sizeBytes: 1, lastModifiedMs: timestamp, fingerprint: 'fp-srt', mediaType: 'srt' as const },
  { episodeNumber: 1, role: 'asr_video' as const, relativePath: '匿名剧/视频/EP01.mp4', fileName: 'EP01.mp4', sizeBytes: 8, lastModifiedMs: timestamp, fingerprint: 'fp-video', mediaType: 'video' as const },
  { episodeNumber: 1, role: 'screen_video' as const, relativePath: '匿名剧/视频/EP01.mp4', fileName: 'EP01.mp4', sizeBytes: 8, lastModifiedMs: timestamp, fingerprint: 'fp-video', mediaType: 'video' as const },
];
const manifest = {
  id: manifestId,
  projectId,
  version: 3,
  rootName: '匿名剧',
  episodeCount: 1,
  bindingCount: 3,
  confirmedAt: '2026-08-13T08:00:00.000Z',
  createdBy: 'local-user',
  bindings,
  assetBindings: [],
};
const session = (overrides: Record<string, unknown> = {}) => ({
  id: uploadId,
  projectId,
  objectKey: 'anonymous/object',
  originalFileName: 'EP01.srt',
  mediaKind: 'srt',
  sizeBytes: 1,
  partSizeBytes: 64,
  totalParts: 1,
  storageUploadId: 'storage-upload-1',
  transportKind: 'multipart' as const,
  tusEndpoint: null,
  fileFingerprint: 'fp-srt',
  checksumAlgorithm: 'sha256' as const,
  checksumValue: null,
  status: 'created' as const,
  expiresAt: '2026-08-14T08:00:00.000Z',
  version: 1,
  errorCode: null,
  errorDetail: null,
  confirmedParts: [],
  missingPartNumbers: [1],
  asset: null,
  materialBinding: { manifestId, targets: [{ episodeNumber: 1, role: 'company_srt' as const }] },
  ...overrides,
});

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><UploadQueue /></MemoryRouter></QueryClientProvider>);
};
const localFile = (name: string, relativePath: string, contents = 'x') => {
  const file = new File([contents], name, { lastModified: timestamp });
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
  return file;
};
const baseFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
  if (url.endsWith('/material-manifest')) return json({ project, manifest });
  if (url.endsWith('/uploads') && !init?.method) return json({ items: [] });
  if (url.endsWith('/uploads') && init?.method === 'POST') return json(session(), 201);
  throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  uploadFileWithMultipartMock.mockReset();
  uploadFileWithMultipartMock.mockImplementation(async (file, initial, control) => {
    const transport = { pause: vi.fn(), resume: vi.fn(), cancel: vi.fn() };
    control.onTransport?.(transport);
    control.onProgress?.(file.size, file.size);
    const completed = { ...initial, status: 'completed' as const, version: initial.version + 1, missingPartNumbers: [], confirmedParts: [{ partNumber: 1, sizeBytes: file.size, etag: 'etag', checksumValue: 'a'.repeat(64), confirmedAt: new Date().toISOString() }] } as UploadSession;
    control.onSession?.(completed);
    control.onTransport?.(undefined);
    return completed;
  });
});

describe('正式多文件上传队列（对象存储 multipart 传输）', () => {
  it('把后端会话事实和浏览器暂停投影为可读状态', () => {
    expect(statusLabel(undefined, undefined, false)).toBe('等待本地文件');
    expect(statusLabel(undefined, { file: new File(['x'], 'x.srt') }, false)).toBe('待上传');
    expect(statusLabel(session() as never, { queued: true }, false)).toBe('排队中');
    expect(statusLabel(session({ status: 'uploading' }) as never, { paused: true }, false)).toBe('本机已暂停');
    expect(statusLabel(session({ status: 'uploading' }) as never, undefined, false)).toBe('等待重新选择');
    expect(statusLabel(session({ status: 'verifying' }) as never, undefined, false)).toBe('校验中');
    expect(statusLabel(session({ status: 'completed' }) as never, undefined, false)).toBe('已完成');
  });

  it('按唯一物理文件合并共享视频角色', () => {
    const rows = buildPhysicalMaterials(manifest);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.fileName === 'EP01.mp4')?.roles).toEqual(['asr_video', 'screen_video']);
  });

  it('multipart 执行链不会复用同素材的历史 tus 会话', () => {
    const material = buildPhysicalMaterials(manifest)[0]!;
    const legacy = session({ transportKind: 'tus', tusEndpoint: '/api/uploads/tus' }) as UploadSession;
    expect(sessionForMaterial(material, [legacy])).toBeUndefined();
    expect(sessionForMaterial(material, [legacy], 'tus')).toBe(legacy);
  });

  it('选择后创建 multipart 会话并把确认交给 uploadFileWithMultipart，旧传输接口为零', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      calls.push({ url: String(input), init });
      return baseFetch(input, init);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, { target: { files: [localFile('EP01.srt', '匿名剧/SRT/EP01.srt')] } });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));
    await waitFor(() => expect(uploadFileWithMultipartMock).toHaveBeenCalledTimes(1));
    const create = calls.find(({ url, init }) => url.endsWith('/uploads') && init?.method === 'POST');
    expect(JSON.parse(String(create?.init?.body))).toMatchObject({ transportKind: 'multipart' });
    expect(JSON.parse(String(create?.init?.body))).not.toHaveProperty('checksumValue');
    expect(calls.some(({ url }) => url.includes('/parts/authorize') || url.includes('/parts/confirm') || url.includes('/api/local/uploads/'))).toBe(false);
    expect(await screen.findByText('已完成')).toBeInTheDocument();
  });

  it('单文件替换到既有清单路径时同步更新 fingerprint，确认请求不再被服务端拒绝', async () => {
    const confirmBodies: Array<{ bindings: typeof bindings }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [] });
      if (url.endsWith('/material-manifests/confirm') && init?.method === 'POST') {
        confirmBodies.push(JSON.parse(String(init.body)) as { bindings: typeof bindings });
        return json({ error: { code: 'TEST_STOP', message: '已截获确认请求', action: 'stop' } }, 409);
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });

    const view = renderPage();
    const videoRow = (await screen.findByText('EP01.mp4')).closest('tr');
    expect(videoRow).not.toBeNull();
    fireEvent.click(within(videoRow!).getByRole('button', { name: '重新选择原文件' }));
    fireEvent.change(view.container.querySelector('#upload-replace')!, {
      target: { files: [new File([new Uint8Array(8)], 'EP01.mp4', { lastModified: timestamp })] },
    });
    fireEvent.click(await screen.findByRole('button', { name: '确认分配并开始上传' }));

    await waitFor(() => expect(confirmBodies).toHaveLength(1));
    const videoBindings = confirmBodies[0]!.bindings.filter((binding) => binding.mediaType === 'video');
    expect(videoBindings).toHaveLength(2);
    expect(videoBindings.every((binding) => binding.relativePath === '匿名剧/视频/EP01.mp4')).toBe(true);
    expect(videoBindings.every((binding) =>
      binding.fingerprint === `匿名剧/视频/EP01.mp4|8|${timestamp}`)).toBe(true);
  });

  it('项目切换后旧 pairing 草稿立即失效，确认不发送 manifest POST', async () => {
    const projectB = { ...project, id: 'ca65378e-8935-4c4a-9e8b-13efca3d3199', name: '项目 B' };
    const manifestB = { ...manifest, projectId: projectB.id };
    let confirmCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project, projectB], total: 2 });
      if (url === `/api/projects/${projectId}/material-manifest`) return json({ project, manifest });
      if (url === `/api/projects/${projectB.id}/material-manifest`) return json({ project: projectB, manifest: manifestB });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [] });
      if (url.endsWith('/material-manifests/confirm') && init?.method === 'POST') {
        confirmCount += 1;
        return json(manifest, 201);
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-role-folder-asr_video')!, { target: { files: [
      localFile('EP01.mp4', '新根/视频/EP01.mp4', '12345678'),
    ] } });
    await screen.findByRole('heading', { name: '分配预览' });
    const staleConfirm = screen.getByRole('button', { name: '确认分配并开始上传' });
    fireEvent.change(screen.getByLabelText('整剧批次'), { target: { value: projectB.id } });
    fireEvent.click(staleConfirm);
    expect(confirmCount).toBe(0);
    await waitFor(() => expect(screen.getByLabelText('整剧批次')).toHaveValue(projectB.id));
  });

  it('同一 pairing 快速双击只创建一个 manifest confirm POST', async () => {
    let confirmCount = 0;
    let resolveConfirm!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [] });
      if (url.endsWith('/material-manifests/confirm') && init?.method === 'POST') {
        confirmCount += 1;
        return new Promise<Response>((resolve) => { resolveConfirm = resolve; });
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-role-folder-asr_video')!, { target: { files: [
      localFile('EP01.mp4', '新根/视频/EP01.mp4', '12345678'),
    ] } });
    await screen.findByRole('heading', { name: '分配预览' });
    const confirm = screen.getByRole('button', { name: '确认分配并开始上传' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(confirmCount).toBe(1));
    expect(confirmCount).toBe(1);
    resolveConfirm(json({ ...manifest, version: manifest.version + 1, rootName: '新根' }, 201));
  });

  it('manifest confirm 延迟返回时切换项目，迟到结果不污染新项目或启动上传', async () => {
    const projectB = { ...project, id: 'ca65378e-8935-4c4a-9e8b-13efca3d3199', name: '项目 B' };
    const manifestB = { ...manifest, projectId: projectB.id };
    let resolveConfirm!: (response: Response) => void;
    let confirmCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project, projectB], total: 2 });
      if (url === `/api/projects/${projectId}/material-manifest`) return json({ project, manifest });
      if (url === `/api/projects/${projectB.id}/material-manifest`) return json({ project: projectB, manifest: manifestB });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [] });
      if (url.endsWith('/material-manifests/confirm') && init?.method === 'POST') {
        confirmCount += 1;
        return new Promise<Response>((resolve) => { resolveConfirm = resolve; });
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-role-folder-asr_video')!, { target: { files: [
      localFile('EP01.mp4', '新根/视频/EP01.mp4', '12345678'),
    ] } });
    await screen.findByRole('heading', { name: '分配预览' });
    fireEvent.click(screen.getByRole('button', { name: '确认分配并开始上传' }));
    await waitFor(() => expect(confirmCount).toBe(1));
    fireEvent.change(screen.getByLabelText('整剧批次'), { target: { value: projectB.id } });
    await waitFor(() => expect(screen.getByLabelText('整剧批次')).toHaveValue(projectB.id));
    resolveConfirm(json({ error: { code: 'MATERIAL_MANIFEST_VERSION_CONFLICT', message: '旧草稿已过期', action: 'reload_latest_manifest' } }, 409));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(uploadFileWithMultipartMock).not.toHaveBeenCalled();
    expect(screen.queryByText('旧草稿已过期')).not.toBeInTheDocument();
  });

  it('一集两物理文件三角色确认体准确，普通 MP4 共享两个视频角色', async () => {
    let confirmBody: { projectId?: string; body?: { expectedVersion: number; bindings: typeof bindings } } | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [] });
      if (url.endsWith('/material-manifests/confirm') && init?.method === 'POST') {
        confirmBody = { projectId: url.split('/api/projects/')[1]?.split('/')[0], body: JSON.parse(String(init.body)) };
        return json({ ...manifest, version: manifest.version + 1, rootName: '新根', bindings: confirmBody.body!.bindings, bindingCount: confirmBody.body!.bindings.length }, 201);
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-role-folder-asr_video')!, { target: { files: [
      localFile('EP01.mp4', '新根/视频/EP01.mp4', '12345678'),
    ] } });
    await screen.findByRole('heading', { name: '分配预览' });
    fireEvent.click(screen.getByRole('button', { name: '确认分配并开始上传' }));
    await waitFor(() => expect(confirmBody).toBeDefined());
    expect(confirmBody?.projectId).toBe(projectId);
    expect(confirmBody?.body?.expectedVersion).toBe(manifest.version);
    expect(confirmBody?.body?.bindings).toHaveLength(3);
    expect(new Set(confirmBody!.body!.bindings.map((binding) => binding.relativePath))).toEqual(new Set(['匿名剧/SRT/EP01.srt', '匿名剧/视频/EP01.mp4']));
    expect(confirmBody!.body!.bindings.filter((binding) => binding.mediaType === 'video')).toHaveLength(2);
    expect(confirmBody!.body!.bindings.filter((binding) => binding.mediaType === 'video').map((binding) => binding.role).sort()).toEqual(['asr_video', 'screen_video']);
  });

  it('显式确认时只把零进度 created tus 会话替换为一个新 multipart 会话', async () => {
    const legacy = session({ transportKind: 'tus', tusEndpoint: '/api/uploads/tus' }) as UploadSession;
    const replacement = session({
      id: 'ca65378e-8935-4c4a-9e8b-13efca3d3198',
      transportKind: 'multipart',
      tusEndpoint: null,
    }) as UploadSession;
    const createBodies: Record<string, unknown>[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [legacy] });
      if (url.endsWith('/uploads') && init?.method === 'POST') {
        createBodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return json(replacement, 201);
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });

    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, {
      target: { files: [localFile('EP01.srt', '匿名剧/SRT/EP01.srt')] },
    });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));

    await waitFor(() => expect(uploadFileWithMultipartMock).toHaveBeenCalledTimes(1));
    expect(createBodies).toEqual([expect.objectContaining({
      transportKind: 'multipart',
      replaceUploadId: legacy.id,
    })]);
    expect(uploadFileWithMultipartMock.mock.calls[0]?.[1]).toMatchObject({
      id: replacement.id,
      transportKind: 'multipart',
    });
  });

  it('单行显式放弃旧 tus 后重新选择同一文件创建 multipart，不影响其他素材', async () => {
    const exactFingerprint = `匿名剧/SRT/EP01.srt|1|${timestamp}`;
    const exactManifest = {
      ...manifest,
      bindings: [{ ...bindings[0]!, fingerprint: exactFingerprint }, bindings[1]!, bindings[2]!],
    };
    let currentLegacy = session({
      transportKind: 'tus',
      tusEndpoint: '/api/uploads/tus',
      status: 'uploading',
      fileFingerprint: exactFingerprint,
    }) as UploadSession;
    const replacement = session({
      id: 'ca65378e-8935-4c4a-9e8b-13efca3d3199',
      transportKind: 'multipart',
      tusEndpoint: null,
      fileFingerprint: exactFingerprint,
    }) as UploadSession;
    let abortCount = 0;
    const createBodies: Record<string, unknown>[] = [];
    let resolveAbort!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest: exactManifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [currentLegacy] });
      if (url === `/api/uploads/${uploadId}/abort` && init?.method === 'POST') {
        abortCount += 1;
        expect(init.headers).toMatchObject({ 'idempotency-key': `browser-${uploadId}-abort` });
        expect(JSON.parse(String(init.body))).toEqual({ expectedVersion: 1 });
        return new Promise<Response>((resolve) => { resolveAbort = resolve; });
      }
      if (url.endsWith('/uploads') && init?.method === 'POST') {
        createBodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return json(replacement, 201);
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });

    const view = renderPage();
    await screen.findByText('EP01.srt');
    expect(screen.getAllByRole('button', { name: '放弃旧上传' })).toHaveLength(1);
    expect(screen.getByLabelText('选择 EP01.srt')).toBeDisabled();
    expect(screen.getByLabelText('选择 EP01.mp4')).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '放弃旧上传' }));
    expect(await screen.findByRole('dialog', { name: '确认放弃旧上传' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认放弃旧上传' }));
    const pending = await screen.findByRole('button', { name: '正在放弃旧上传…' });
    expect(pending).toBeDisabled();
    fireEvent.click(pending);
    expect(abortCount).toBe(1);

    currentLegacy = { ...currentLegacy, status: 'aborted', version: 2 };
    resolveAbort(json(currentLegacy));
    await screen.findByRole('button', { name: '重新选择原文件' });
    const srtRow = screen.getByLabelText('选择 EP01.srt').closest('tr');
    expect(srtRow).not.toBeNull();
    const reselect = within(srtRow!).getByRole('button', { name: '重新选择原文件' });
    fireEvent.click(reselect);
    fireEvent.change(view.container.querySelector('#upload-replace')!, {
      target: { files: [new File(['x'], 'EP01.srt', { lastModified: timestamp })] },
    });
    fireEvent.click(await screen.findByRole('button', { name: '确认分配并开始上传' }));

    await waitFor(() => expect(uploadFileWithMultipartMock).toHaveBeenCalledTimes(1));
    expect(abortCount).toBe(1);
    expect(createBodies).toEqual([expect.objectContaining({
      transportKind: 'multipart',
      fileFingerprint: exactFingerprint,
    })]);
    expect(createBodies[0]).not.toHaveProperty('replaceUploadId');
  });

  it('放弃旧 tus 结果未知时只 GET 同一 uploadId，确认 aborted 前不创建新会话', async () => {
    let currentLegacy = session({ transportKind: 'tus', tusEndpoint: '/api/uploads/tus', status: 'uploading' }) as UploadSession;
    let abortCount = 0;
    let readCount = 0;
    let createCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [currentLegacy] });
      if (url === `/api/uploads/${uploadId}/abort` && init?.method === 'POST') {
        abortCount += 1;
        throw new TypeError('response lost');
      }
      if (url === `/api/uploads/${uploadId}` && !init?.method) {
        readCount += 1;
        currentLegacy = { ...currentLegacy, status: 'aborted', version: 2 };
        return json(currentLegacy);
      }
      if (url.endsWith('/uploads') && init?.method === 'POST') {
        createCount += 1;
        return json(session(), 201);
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '放弃旧上传' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认放弃旧上传' }));
    fireEvent.click(await screen.findByRole('button', { name: '查询本次取消结果' }));

    expect(await screen.findByRole('button', { name: '重新选择原文件' })).toBeInTheDocument();
    expect(abortCount).toBe(1);
    expect(readCount).toBe(1);
    expect(createCount).toBe(0);
  });

  it('放弃旧 tus 的确定失败保留同一行和稳定意图，不误操作其他素材', async () => {
    const legacy = session({ transportKind: 'tus', tusEndpoint: '/api/uploads/tus', status: 'uploading' }) as UploadSession;
    let abortCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [legacy] });
      if (url === `/api/uploads/${uploadId}/abort` && init?.method === 'POST') {
        abortCount += 1;
        return json({ error: { code: 'STORAGE_TEMPORARY_FAILURE', message: '临时上传数据清理失败。', retryable: true, action: 'retry_abort', requestId: 'req-abort-failed' } }, 503);
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '放弃旧上传' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认放弃旧上传' }));

    expect(abortCount).toBe(1);
    expect(await screen.findByRole('alert')).toHaveTextContent('临时存储故障，请稍后重试。');
    expect(screen.getByRole('alert')).toHaveTextContent('请求标识：req-abort-failed');
    fireEvent.click(screen.getByRole('button', { name: 'EP01.srt 公司字幕' }));
    expect(screen.getAllByText('临时存储故障，请稍后重试。').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('历史 TUS')).toBeInTheDocument();
    expect(screen.getByText('旧 TUS 会话不使用 multipart 分片计数')).toBeInTheDocument();
  });

  it('真实点击详情取消打开站内确认，确认后 abort POST 恰好一次并回焦行操作', async () => {
    let current = session({ status: 'uploading', transportKind: 'multipart', fileFingerprint: 'fp-srt' }) as UploadSession;
    let abortCount = 0;
    let resolveAbort!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [current] });
      if (url === `/api/uploads/${uploadId}/abort` && init?.method === 'POST') {
        abortCount += 1;
        return new Promise<Response>((resolve) => { resolveAbort = resolve; });
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });

    renderPage();
    const row = (await screen.findByLabelText('选择 EP01.srt')).closest('tr')!;
    fireEvent.click(within(row).getByLabelText('EP01.srt 更多操作'));
    fireEvent.click(within(row).getByRole('button', { name: '取消未完成上传' }));
    const dialog = await screen.findByRole('dialog', { name: '确认取消未完成上传' });
    expect(within(dialog).getByText('EP01.srt')).toBeInTheDocument();
    const returnButton = within(dialog).getByRole('button', { name: '返回检查' });
    expect(document.activeElement).toBe(returnButton);
    const confirm = within(dialog).getByRole('button', { name: '确认取消未完成上传' });
    fireEvent.click(confirm);
    expect(await within(dialog).findByRole('button', { name: '正在取消…' })).toBeDisabled();
    expect(abortCount).toBe(1);
    fireEvent.click(confirm);
    expect(abortCount).toBe(1);

    current = { ...current, status: 'aborted', version: 2 };
    resolveAbort(json(current));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '确认取消未完成上传' })).not.toBeInTheDocument());
    expect(within(row).getByText('已取消')).toBeInTheDocument();
    await waitFor(() => expect(within(row).getByRole('button', { name: '重新选择原文件' })).toHaveFocus());
  });

  it('关闭站内取消确认不发 abort POST', async () => {
    const current = session({ status: 'uploading', transportKind: 'multipart', fileFingerprint: 'fp-srt' }) as UploadSession;
    let abortCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [current] });
      if (url === `/api/uploads/${uploadId}/abort` && init?.method === 'POST') {
        abortCount += 1;
        return json({ ...current, status: 'aborted' }, 200);
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });

    renderPage();
    const row = (await screen.findByLabelText('选择 EP01.srt')).closest('tr')!;
    fireEvent.click(within(row).getByLabelText('EP01.srt 更多操作'));
    fireEvent.click(within(row).getByRole('button', { name: '取消未完成上传' }));
    const dialog = await screen.findByRole('dialog', { name: '确认取消未完成上传' });
    fireEvent.click(within(dialog).getByRole('button', { name: '返回检查' }));
    expect(screen.queryByRole('dialog', { name: '确认取消未完成上传' })).not.toBeInTheDocument();
    expect(abortCount).toBe(0);
  });

  it('服务端 PATCH offset 达到 2MiB 时总体和行进度立即非零，不读取浏览器本地上传进度', async () => {
    const sizeBytes = 4 * 1024 * 1024;
    const progressBinding = { ...bindings[0]!, sizeBytes, fingerprint: 'fp-progress' };
    const progressManifest = { ...manifest, bindingCount: 1, bindings: [progressBinding] };
    const progressSession = session({ status: 'uploading', sizeBytes, fileFingerprint: 'fp-progress', materialBinding: { manifestId, targets: [{ episodeNumber: 1, role: 'company_srt' as const }] } }) as UploadSession;
    let resolveUpload!: (value: UploadSession) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest: progressManifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [progressSession] });
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    uploadFileWithMultipartMock.mockImplementation(async (_file, initial, control) => {
      control.onProgress?.(2 * 1024 * 1024, sizeBytes);
      return new Promise<UploadSession>((resolve) => { resolveUpload = resolve; });
    });
    const file = new File([new Uint8Array(sizeBytes)], 'EP01.srt', { lastModified: timestamp });
    Object.defineProperty(file, 'webkitRelativePath', { value: '匿名剧/SRT/EP01.srt' });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));
    await waitFor(() => expect(uploadFileWithMultipartMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByLabelText('整批总体进度 50%')).toBeInTheDocument();
    expect(screen.getByText('服务端已确认 50%')).toBeInTheDocument();
    resolveUpload({ ...progressSession, status: 'completed', missingPartNumbers: [], confirmedParts: [] } as UploadSession);
  });

  it('两个并发 create 返回400时离开创建态、显示错误并释放槽位继续处理后续文件', async () => {
    const dedicatedScreen = {
      episodeNumber: 1,
      role: 'screen_video' as const,
      relativePath: '匿名剧/画面字/EP01-screen.mp4',
      fileName: 'EP01-screen.mp4',
      sizeBytes: 9,
      lastModifiedMs: timestamp,
      fingerprint: 'fp-screen',
      mediaType: 'video' as const,
    };
    const threeMaterialManifest = { ...manifest, bindings: [bindings[0]!, bindings[1]!, dedicatedScreen], bindingCount: 3 };
    let createCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest: threeMaterialManifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [] });
      if (url.endsWith('/uploads') && init?.method === 'POST') {
        createCount += 1;
        if (createCount === 1) return new Response('Bad Request', { status: 400 });
        if (createCount === 2) return json({ error: { code: 'VALIDATION_ERROR', message: '请求参数无效', retryable: false, requestId: 'req-create-400' } }, 400);
        return json(session({ originalFileName: 'EP01-screen.mp4', mediaKind: 'video', fileFingerprint: 'fp-screen', sizeBytes: 9, materialBinding: { manifestId, targets: [{ episodeNumber: 1, role: 'screen_video' as const }] } }), 201);
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, {
      target: { files: [
        localFile('EP01.srt', '匿名剧/SRT/EP01.srt'),
        localFile('EP01.mp4', '匿名剧/视频/EP01.mp4', '12345678'),
        localFile('EP01-screen.mp4', '匿名剧/画面字/EP01-screen.mp4', '123456789'),
      ] },
    });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));
    await waitFor(() => expect(createCount).toBe(3));
    await waitFor(() => expect(screen.getAllByText('失败').filter((element) => element.closest('tr'))).toHaveLength(2));
    expect(screen.queryAllByText('正在创建上传任务')).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: '重试' })).toHaveLength(2);
    expect(await screen.findByText('已完成')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /EP01\.mp4/ }));
    expect(screen.getByText('req-create-400')).toBeInTheDocument();
  });

  it('最多两个活跃文件，第三个文件等待前序文件释放队列槽位', async () => {
    const dedicatedScreen = {
      episodeNumber: 1,
      role: 'screen_video' as const,
      relativePath: '匿名剧/画面字/EP01-screen.mp4',
      fileName: 'EP01-screen.mp4',
      sizeBytes: 9,
      lastModifiedMs: timestamp,
      fingerprint: 'fp-screen',
      mediaType: 'video' as const,
    };
    const threeMaterialManifest = { ...manifest, bindings: [bindings[0]!, bindings[1]!, dedicatedScreen], bindingCount: 3 };
    const runs: Array<{ initial: UploadSession; control: Parameters<typeof uploadFileWithMultipartMock>[2]; resolve: (value: UploadSession) => void }> = [];
    uploadFileWithMultipartMock.mockImplementation(async (_file, initial, control) => new Promise<UploadSession>((resolve) => {
      control.onTransport?.({ pause: vi.fn(), resume: vi.fn(), cancel: vi.fn() });
      runs.push({ initial, control, resolve });
    }));
    let createCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest: threeMaterialManifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [] });
      if (url.endsWith('/uploads') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { originalFileName: string; fileFingerprint: string; mediaKind: string; materialBinding: UploadSession['materialBinding'] };
        createCount += 1;
        return json(session({
          id: `b4000000-0000-4000-8000-00000000020${createCount}`,
          originalFileName: body.originalFileName,
          fileFingerprint: body.fileFingerprint,
          mediaKind: body.mediaKind,
          sizeBytes: body.originalFileName === 'EP01-screen.mp4' ? 9 : body.originalFileName === 'EP01.mp4' ? 8 : 1,
          materialBinding: body.materialBinding,
        }), 201);
      }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, { target: { files: [
      localFile('EP01.srt', '匿名剧/SRT/EP01.srt'),
      localFile('EP01.mp4', '匿名剧/视频/EP01.mp4', '12345678'),
      localFile('EP01-screen.mp4', '匿名剧/画面字/EP01-screen.mp4', '123456789'),
    ] } });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));
    await waitFor(() => expect(runs).toHaveLength(2));
    expect(uploadFileWithMultipartMock).toHaveBeenCalledTimes(2);
    const completeRun = (run: typeof runs[number]) => {
      run.control.onTransport?.(undefined);
      const completed = { ...run.initial, status: 'completed' as const, version: run.initial.version + 1, missingPartNumbers: [], confirmedParts: [{ partNumber: 1, sizeBytes: run.initial.sizeBytes, etag: 'etag', checksumValue: 'a'.repeat(64), confirmedAt: new Date().toISOString() }] } as UploadSession;
      run.control.onSession?.(completed);
      run.resolve(completed);
    };
    completeRun(runs[0]!);
    await waitFor(() => expect(runs).toHaveLength(3));
    expect(uploadFileWithMultipartMock).toHaveBeenCalledTimes(3);
    completeRun(runs[1]!);
    completeRun(runs[2]!);
    expect(await screen.findByRole('button', { name: '展开已完成项（3）' })).toBeInTheDocument();
  });

  it('项目切换后新建请求只使用当前项目，旧迟到结果不触发旧接口', async () => {
    const projectB = { ...project, id: 'ca65378e-8935-4c4a-9e8b-13efca3d3199', name: '项目 B' };
    const manifestB = { ...manifest, id: 'ca65378e-8935-4c4a-9e8b-13efca3d3150', projectId: projectB.id };
    const createUrls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project, projectB], total: 2 });
      if (url === `/api/projects/${projectId}/material-manifest`) return json({ project, manifest });
      if (url === `/api/projects/${projectB.id}/material-manifest`) return json({ project: projectB, manifest: manifestB });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [] });
      if (url.endsWith('/uploads') && init?.method === 'POST') { createUrls.push(url); return json(session({ projectId: url.includes(projectB.id) ? projectB.id : projectId }), 201); }
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, { target: { files: [localFile('EP01.srt', '匿名剧/SRT/EP01.srt')] } });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));
    await waitFor(() => expect(createUrls).toEqual([`/api/projects/${projectId}/uploads`]));
    fireEvent.change(screen.getByLabelText('整剧批次'), { target: { value: projectB.id } });
    await waitFor(() => expect(screen.getByLabelText('整剧批次')).toHaveValue(projectB.id));
    fireEvent.change(view.container.querySelector('#upload-files')!, { target: { files: [localFile('EP01.srt', '匿名剧/SRT/EP01.srt')] } });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));
    await waitFor(() => expect(createUrls).toEqual([`/api/projects/${projectId}/uploads`, `/api/projects/${projectB.id}/uploads`]));
    expect(uploadFileWithMultipartMock).toHaveBeenCalledTimes(2);
    expect(uploadFileWithMultipartMock.mock.calls[1]?.[1].projectId).toBe(projectB.id);
  });

  it('整批暂停/继续复用当前 multipart transport，不创建第二会话', async () => {
    let resolveUpload!: (value: UploadSession) => void;
    const pause = vi.fn();
    const resume = vi.fn();
    uploadFileWithMultipartMock.mockImplementation(async (_file, _initial, control) => {
      control.onTransport?.({ pause, resume, cancel: vi.fn() });
      return new Promise<UploadSession>((resolve) => { resolveUpload = (value) => { control.onTransport?.(undefined); resolve(value); }; });
    });
    const createUrls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/uploads') && init?.method === 'POST') { createUrls.push(url); return json(session({ status: 'uploading' }), 201); }
      return baseFetch(input, init);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, { target: { files: [localFile('EP01.srt', '匿名剧/SRT/EP01.srt')] } });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));
    await waitFor(() => expect(uploadFileWithMultipartMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '暂停整批' }));
    expect(pause).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '继续整批' }));
    expect(resume).toHaveBeenCalledTimes(1);
    resolveUpload(session({ status: 'completed', missingPartNumbers: [] }) as UploadSession);
    await waitFor(() => expect(createUrls).toHaveLength(1));
  });

  it('取消选择不写入清单且焦点回到触发按钮', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch);
    const view = renderPage();
    await screen.findByText('EP01.srt');
    const trigger = screen.getByRole('button', { name: '选择多个文件' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent(view.container.querySelector('#upload-files')!, new Event('cancel', { bubbles: true }));
    expect(await screen.findByText(/已取消选择/)).toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(uploadFileWithMultipartMock).not.toHaveBeenCalled();
  });

  it('102 个物理文件的匹配仍保持共享 MP4 只占一个物理行', () => {
    const manyBindings = Array.from({ length: 51 }, (_, index) => {
      const episode = String(index + 1).padStart(3, '0');
      const video = { episodeNumber: index + 1, relativePath: `匿名剧/视频/EP${episode}.mp4`, fileName: `EP${episode}.mp4`, sizeBytes: 2, lastModifiedMs: timestamp, fingerprint: `video-${episode}`, mediaType: 'video' as const };
      return [{ episodeNumber: index + 1, role: 'company_srt' as const, relativePath: `匿名剧/SRT/EP${episode}.srt`, fileName: `EP${episode}.srt`, sizeBytes: 1, lastModifiedMs: timestamp, fingerprint: `srt-${episode}`, mediaType: 'srt' as const }, { ...video, role: 'asr_video' as const }, { ...video, role: 'screen_video' as const }];
    }).flat();
    const rows = buildPhysicalMaterials({ ...manifest, episodeCount: 51, bindingCount: manyBindings.length, bindings: manyBindings });
    expect(rows).toHaveLength(102);
    expect(rows.filter((row) => row.roles.length === 2)).toHaveLength(51);
    expect(matchSelectedFiles(rows.map((row) => localFile(row.fileName, `新根/${row.relativePath.split('/').slice(1).join('/')}`, row.mediaKind === 'srt' ? 'x' : 'xx')), rows).matches).toHaveLength(102);
  });

  it('状态更新/重渲染下重复指纹映射到同一 session 时最多一个 multipart transport', async () => {
    const secondBinding = { ...bindings[0]!, episodeNumber: 2, relativePath: '匿名剧/SRT/EP02.srt', fileName: 'EP02.srt' };
    const duplicateFingerprintManifest = {
      ...manifest,
      episodeCount: 2,
      bindingCount: 2,
      bindings: [bindings[0]!, secondBinding],
    };
    const existing = session({
      status: 'uploading',
      materialBinding: { manifestId, targets: [{ episodeNumber: 1, role: 'company_srt' as const }] },
    }) as UploadSession;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest: duplicateFingerprintManifest });
      if (url.endsWith('/uploads') && !init?.method) return json({ items: [existing] });
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    let activeTransports = 0;
    let maxActiveTransports = 0;
    let release!: () => void;
    uploadFileWithMultipartMock.mockImplementation(async (_file, initial, control) => {
      activeTransports += 1;
      maxActiveTransports = Math.max(maxActiveTransports, activeTransports);
      control.onProgress?.(1, 1);
      await new Promise<void>((resolve) => { release = () => { activeTransports -= 1; resolve(); }; });
      const completed = { ...initial, status: 'completed' as const, version: initial.version + 1, missingPartNumbers: [], confirmedParts: [{ partNumber: 1, sizeBytes: initial.sizeBytes, etag: 'etag', checksumValue: 'a'.repeat(64), confirmedAt: new Date().toISOString() }] } as UploadSession;
      control.onSession?.(completed);
      return completed;
    });
    const view = renderPage();
    await screen.findByText('EP02.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, {
      target: { files: [
        localFile('EP01.srt', '匿名剧/SRT/EP01.srt'),
        localFile('EP02.srt', '匿名剧/SRT/EP02.srt'),
      ] },
    });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));
    await waitFor(() => expect(uploadFileWithMultipartMock).toHaveBeenCalledTimes(1));
    expect(maxActiveTransports).toBe(1);
    release();
    await waitFor(() => expect(screen.getAllByText('已完成').length).toBeGreaterThanOrEqual(1));
    expect(activeTransports).toBe(0);
  });
});
