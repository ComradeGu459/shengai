// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router';

vi.mock('../../frontend/src/features/uploads/upload-engine.js', () => ({
  MAX_ACTIVE_UPLOAD_FILES: 2,
  uploadFileWithMultipart: vi.fn(),
  UploadCompletionUnknownError: class UploadCompletionUnknownError extends Error {},
  UploadTransportUnknownError: class UploadTransportUnknownError extends Error {},
}));

import { UploadQueue } from '../../frontend/src/features/uploads/UploadQueue.js';
import { ProjectMaterials } from '../../frontend/src/features/materials/ProjectMaterials.js';
import { uploadFileWithMultipart } from '../../frontend/src/features/uploads/upload-engine.js';
import {
  scanMaterialFiles,
  withRelativePathFingerprint,
} from '../../frontend/src/features/materials/scan.js';
import {
  clearDirectoryHandle,
  directoryFileHandoffKey,
  folderSelectionSupported,
  matchSelectedFiles,
  persistDirectoryHandle,
  restoreDirectoryFiles,
} from '../../frontend/src/features/uploads/file-selection.js';
import {
  buildPhysicalMaterials,
  statusLabel,
} from '../../frontend/src/features/uploads/model.js';

const projectAId = 'b4000000-0000-4000-8000-000000000001';
const projectBId = 'b4000000-0000-4000-8000-000000000002';
const manifestId = 'b4000000-0000-4000-8000-000000000003';
const uploadId = 'b4000000-0000-4000-8000-000000000004';
const timestamp = 1_755_000_000_000;

const project = (id: string, name: string) => ({
  id,
  name,
  workflowStatus: 'uploading' as const,
  lifecycleStatus: 'active' as const,
  recycleExpiresAt: null,
  version: 1,
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
  createdBy: 'employee-test',
  updatedBy: 'employee-test',
});

const projectA = project(projectAId, '匿名项目 A');
const projectB = project(projectBId, '匿名项目 B');

const oneEpisodeManifest = (projectId = projectAId) => ({
  id: manifestId,
  projectId,
  version: 1,
  rootName: '匿名系列',
  episodeCount: 1,
  bindingCount: 1,
  confirmedAt: '2026-08-21T00:00:00.000Z',
  createdBy: 'employee-test',
  bindings: [{
    episodeNumber: 1,
    role: 'company_srt' as const,
    relativePath: '匿名系列/SRT/EP01.srt',
    fileName: 'EP01.srt',
    sizeBytes: 1,
    lastModifiedMs: timestamp,
    fingerprint: 'fp-ep01-srt',
    mediaType: 'srt' as const,
  }],
  assetBindings: [],
});

const uploadSession = (overrides: Record<string, unknown> = {}) => ({
  id: uploadId,
  projectId: projectAId,
  objectKey: 'redacted/object',
  originalFileName: 'EP01.srt',
  mediaKind: 'srt',
  transportKind: 'multipart',
  tusEndpoint: null,
  sizeBytes: 1,
  partSizeBytes: 1,
  totalParts: 1,
  fileFingerprint: 'fp-ep01-srt',
  checksumAlgorithm: 'sha256',
  checksumValue: '0'.repeat(64),
  status: 'created',
  expiresAt: '2026-08-22T00:00:00.000Z',
  version: 1,
  errorCode: null,
  errorDetail: null,
  confirmedParts: [],
  missingPartNumbers: [1],
  asset: null,
  materialBinding: {
    manifestId,
    targets: [{ episodeNumber: 1, role: 'company_srt' }],
  },
  ...overrides,
});

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json' },
});

const renderQueue = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><UploadQueue /></MemoryRouter>
    </QueryClientProvider>,
  );
};

const localFile = (name: string, relativePath: string, contents = 'x') => {
  const file = new File([contents], name, { lastModified: timestamp });
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
  return file;
};

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLInputElement.prototype, 'webkitdirectory');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('TEST-MATERIAL-FOLDER-01 独立验收', () => {
  it('单文件或角色目录重定位后同步重算服务端可验证的元数据指纹', () => {
    const source = new File([new Uint8Array(8)], '1.mp4', { lastModified: timestamp });
    const scanned = scanMaterialFiles([source]).files[0]!;
    const rebased = withRelativePathFingerprint(scanned, '匿名系列/视频/1.mp4');

    expect(rebased).toMatchObject({
      relativePath: '匿名系列/视频/1.mp4',
      sizeBytes: 8,
      lastModifiedMs: timestamp,
      fingerprint: `匿名系列/视频/1.mp4|8|${timestamp}`,
    });
  });

  it('51 集 102 个物理文件不重复上传共享视频，改名单根仍全量匹配', () => {
    const bindings = Array.from({ length: 51 }, (_, index) => {
      const episodeNumber = index + 1;
      const episode = String(episodeNumber).padStart(2, '0');
      const video = {
        episodeNumber,
        relativePath: `匿名系列/视频/EP${episode}.mp4`,
        fileName: `EP${episode}.mp4`,
        sizeBytes: 2,
        lastModifiedMs: timestamp,
        fingerprint: `video-${episode}`,
        mediaType: 'video' as const,
      };
      return [
        {
          episodeNumber,
          role: 'company_srt' as const,
          relativePath: `匿名系列/SRT/EP${episode}.srt`,
          fileName: `EP${episode}.srt`,
          sizeBytes: 1,
          lastModifiedMs: timestamp,
          fingerprint: `srt-${episode}`,
          mediaType: 'srt' as const,
        },
        { ...video, role: 'asr_video' as const },
        { ...video, role: 'screen_video' as const },
      ];
    }).flat();
    const manifest = {
      ...oneEpisodeManifest(),
      episodeCount: 51,
      bindingCount: bindings.length,
      bindings,
    };

    const materials = buildPhysicalMaterials(manifest);
    expect(materials).toHaveLength(102);
    expect(materials.filter((material) => material.roles.length === 2)).toHaveLength(51);

    const files = materials.map((material) => localFile(
      material.fileName,
      `新根名/${material.relativePath.split('/').slice(1).join('/')}`,
      material.mediaKind === 'srt' ? 'x' : 'xx',
    ));
    const result = matchSelectedFiles(files, materials);
    expect(result).toMatchObject({
      mixedRoots: false,
      unmatched: [],
      ambiguous: [],
      duplicateMaterialKeys: [],
    });
    expect(result.matches).toHaveLength(102);
  });

  it('拒绝混合根目录、重复文件和无路径歧义，不静默猜测', () => {
    const materials = buildPhysicalMaterials(oneEpisodeManifest());
    const first = localFile('EP01.srt', '根A/SRT/EP01.srt');
    const secondRoot = localFile('EP01.srt', '根B/SRT/EP01.srt');
    const mixed = matchSelectedFiles([first, secondRoot], materials);
    expect(mixed.mixedRoots).toBe(true);
    expect(mixed.matches).toHaveLength(0);
    expect(mixed.ambiguous).toHaveLength(2);

    const duplicate = localFile('EP01.srt', '根A/SRT/EP01.srt');
    const repeated = matchSelectedFiles([first, duplicate], materials);
    expect(repeated.matches).toHaveLength(0);
    expect(repeated.duplicateMaterialKeys).toHaveLength(1);
    expect(repeated.ambiguous).toHaveLength(2);

    const ambiguousMaterials = [
      ...materials,
      { ...materials[0]!, key: 'second-candidate', relativePath: '匿名系列/备份/EP01.srt' },
    ];
    const withoutPath = new File(['x'], 'EP01.srt', { lastModified: timestamp });
    const ambiguous = matchSelectedFiles([withoutPath], ambiguousMaterials);
    expect(ambiguous.matches).toHaveLength(0);
    expect(ambiguous.ambiguous).toEqual([withoutPath]);
  });

  it('Chromium 目录句柄按清单身份恢复 File，权限不足时不伪装成功', async () => {
    const key = directoryFileHandoffKey(projectAId, manifestId, 1);
    const restoredFile = localFile('EP01.srt', '匿名系列/SRT/EP01.srt');
    const handle = {
      kind: 'directory' as const,
      name: '匿名系列',
      async *values() {
        yield { kind: 'file' as const, name: restoredFile.name, getFile: async () => restoredFile };
      },
      queryPermission: async () => 'granted' as const,
    };
    await persistDirectoryHandle(key, handle);
    const restored = await restoreDirectoryFiles(key);
    expect(restored.status).toBe('granted');
    expect(restored.files[0]).toBe(restoredFile);

    const deniedHandle = {
      ...handle,
      queryPermission: async () => 'prompt' as const,
      requestPermission: async () => 'denied' as const,
    };
    await persistDirectoryHandle(key, deniedHandle);
    expect((await restoreDirectoryFiles(key)).status).toBe('needs-permission');
    await clearDirectoryHandle(key);
  });

  it('目录能力不可用时保留主入口并明示多文件替代，不伪装支持', async () => {
    expect(folderSelectionSupported()).toBe(false);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [projectA], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project: projectA, manifest: oneEpisodeManifest() });
      if (url.endsWith('/uploads')) return json({ items: [] });
      throw new Error(`未处理请求：${url}`);
    });
    renderQueue();
    await screen.findByText('本地素材分配');
    const folder = screen.getByRole('button', { name: '选择系列文件夹' });
    expect(folder).toBeEnabled();
    expect(screen.getByRole('button', { name: '选择多个文件' })).toBeEnabled();
    expect(screen.getByText(/当前浏览器不支持文件夹选择/)).toBeInTheDocument();
    fireEvent.click(folder);
    expect(screen.getByText(/不会改动素材清单/)).toBeInTheDocument();
  });

  it('重复选择同一系列文件夹会先清空 input，并立即进入匹配状态', async () => {
    Object.defineProperty(HTMLInputElement.prototype, 'webkitdirectory', { configurable: true, value: true });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [projectA], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project: projectA, manifest: oneEpisodeManifest() });
      if (url.endsWith('/uploads')) return json({ items: [] });
      throw new Error(`未处理请求：${url}`);
    });
    const view = renderQueue();
    await screen.findByText('本地素材分配');
    const folder = screen.getByRole('button', { name: '选择系列文件夹' });
    const input = view.container.querySelector('#upload-folder') as HTMLInputElement;
    let value = 'stale-selection';
    let clearCount = 0;
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => value,
      set: (next: string) => {
        value = next;
        if (next === '') clearCount += 1;
      },
    });
    const file = localFile('EP01.srt', '新根/SRT/EP01.srt');

    fireEvent.click(folder);
    expect(value).toBe('');
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.queryByText('尚未选择')).not.toBeInTheDocument();
    expect(screen.getByText(/已读取到1个文件，正在匹配/)).toBeInTheDocument();
    await screen.findByText('安全匹配');

    value = 'stale-selection';
    fireEvent.click(folder);
    expect(value).toBe('');
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText('安全匹配');
    expect(clearCount).toBe(2);
  });

  it('三个角色文件夹按角色重算，并保留同轮其他角色分配', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [projectA], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project: projectA, manifest: oneEpisodeManifest() });
      if (url.endsWith('/uploads')) return json({ items: [] });
      throw new Error(`未处理请求：${url}`);
    });
    const view = renderQueue();
    await screen.findByText('本地素材分配');
    fireEvent.change(view.container.querySelector('#upload-role-folder-asr_video')!, {
      target: { files: [localFile('EP01.mp4', '新根/EP01.mp4', 'xx')] },
    });
    await screen.findByRole('heading', { name: '分配预览' });
    fireEvent.change(view.container.querySelector('#upload-role-folder-screen_video')!, {
      target: { files: [localFile('EP01-screen.mp4', '新根/EP01-screen.mp4', 'xx')] },
    });
    await waitFor(() => expect(screen.getByLabelText('第 1 集公司字幕')).toHaveValue('匿名系列/SRT/EP01.srt'));
    expect(screen.getByLabelText('第 1 集中文识别视频')).toHaveValue('匿名系列/EP01.mp4');
    expect(screen.getByLabelText('第 1 集画面字视频')).toHaveValue('匿名系列/EP01-screen.mp4');
  });

  it('角色文件夹沿用既有清单根时，用重写后的相对路径生成真实浏览器元数据指纹', async () => {
    const realSizeBytes = 156_739_874;
    const realLastModifiedMs = 1_785_468_061_000; // 2026-07-31 11:21:01 Asia/Shanghai
    const existingSrt = {
      ...oneEpisodeManifest().bindings[0]!,
      fingerprint: `匿名系列/SRT/EP01.srt|1|${timestamp}`,
    };
    const currentManifest = {
      ...oneEpisodeManifest(),
      bindings: [existingSrt],
    };
    let confirmBody: { bindings: Array<{ role: string; relativePath: string; sizeBytes: number; lastModifiedMs: number; fingerprint: string }> } | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.startsWith('/api/projects?')) return json({ items: [projectA], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project: projectA, manifest: currentManifest });
      if (url.endsWith('/uploads') && method === 'GET') return json({ items: [] });
      if (url.endsWith('/material-manifests/confirm') && method === 'POST') {
        confirmBody = JSON.parse(String(init?.body));
        return json({
          error: {
            code: 'MATERIAL_MANIFEST_INVALID',
            message: '文件 1.mp4 的元数据指纹无效。',
            retryable: false,
            action: 'review_material_manifest',
            requestId: 'fingerprint-regression',
          },
        }, 400);
      }
      throw new Error(`未处理请求：${method} ${url}`);
    });

    const video = new File([new Uint8Array(1)], '1.mp4', { lastModified: realLastModifiedMs });
    Object.defineProperty(video, 'size', { configurable: true, value: realSizeBytes });
    Object.defineProperty(video, 'webkitRelativePath', { value: '原始素材/视频/1.mp4' });

    const view = renderQueue();
    await screen.findByText('本地素材分配');
    fireEvent.change(view.container.querySelector('#upload-role-folder-asr_video')!, {
      target: { files: [video] },
    });
    await screen.findByRole('heading', { name: '分配预览' });
    fireEvent.click(screen.getByRole('button', { name: '确认分配并开始上传' }));
    await waitFor(() => expect(confirmBody).toBeDefined());

    const binding = confirmBody!.bindings.find((item) => item.role === 'asr_video');
    expect(binding).toEqual(expect.objectContaining({
      role: 'asr_video',
      relativePath: '匿名系列/视频/1.mp4',
      sizeBytes: realSizeBytes,
      lastModifiedMs: realLastModifiedMs,
      fingerprint: `匿名系列/视频/1.mp4|${realSizeBytes}|${realLastModifiedMs}`,
    }));
  });

  it('创建结果 unknown 只人工 GET 同 commandId，已完成结果不再发任何写请求', async () => {
    const digest = 'a'.repeat(64);
    const recovered = uploadSession({
      checksumValue: digest,
      status: 'completed',
      missingPartNumbers: [],
      asset: {
        id: 'b4000000-0000-4000-8000-000000000005',
        projectId: projectAId,
        objectKey: 'redacted/object',
        originalFileName: 'EP01.srt',
        mediaKind: 'srt',
        sizeBytes: 1,
        checksumAlgorithm: 'sha256',
        checksumValue: digest,
        verifiedAt: '2026-08-21T00:00:00.000Z',
      },
    });
    const writes: string[] = [];
    const commandGets: string[] = [];
    let commandId = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.startsWith('/api/projects?')) return json({ items: [projectA], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project: projectA, manifest: oneEpisodeManifest() });
      if (url === `/api/projects/${projectAId}/uploads` && method === 'GET') return json({ items: [] });
      if (url === `/api/projects/${projectAId}/uploads` && method === 'POST') {
        writes.push(`${method} ${url}`);
        commandId = new Headers(init?.headers).get('idempotency-key') ?? '';
        throw new TypeError('响应丢失');
      }
      if (url === `/api/projects/${projectAId}/uploads/commands/${commandId}` && method === 'GET') {
        commandGets.push(url);
        return json({ commandId, projectId: projectAId, status: 'succeeded', session: recovered });
      }
      if (method !== 'GET') writes.push(`${method} ${url}`);
      if (url === `/api/uploads/${uploadId}`) return json(recovered);
      if (url.endsWith('/complete')) return json(recovered);
      throw new Error(`未处理请求：${method} ${url}`);
    });

    const view = renderQueue();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, {
      target: { files: [localFile('EP01.srt', 'EP01.srt')] },
    });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));
    fireEvent.click(await screen.findByRole('button', { name: '检查创建结果' }));
    expect(await screen.findByText('已完成')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(commandGets).toEqual([`/api/projects/${projectAId}/uploads/commands/${commandId}`]);
    expect(writes).toEqual([`POST /api/projects/${projectAId}/uploads`]);
  });

  it('项目 A 文件校验期间切换到 B，迟到结果不向 B 创建也不泄露 A 路径', async () => {
    let releaseRead: (() => void) | undefined;
    const NativeFileReader = globalThis.FileReader;
    class DelayedFileReader extends NativeFileReader {
      override readAsArrayBuffer(blob: Blob) {
        releaseRead = () => super.readAsArrayBuffer(blob);
      }
    }
    vi.stubGlobal('FileReader', DelayedFileReader);
    const writes: Array<{ url: string; body: string }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.startsWith('/api/projects?')) return json({ items: [projectA, projectB], total: 2 });
      if (url.endsWith('/material-manifest')) {
        const isB = url.includes(projectBId);
        return json({ project: isB ? projectB : projectA, manifest: oneEpisodeManifest(isB ? projectBId : projectAId) });
      }
      if (url.endsWith('/uploads') && method === 'GET') return json({ items: [] });
      if (method !== 'GET') {
        writes.push({ url, body: String(init?.body ?? '') });
        return json(uploadSession());
      }
      throw new Error(`未处理请求：${method} ${url}`);
    });

    const view = renderQueue();
    await screen.findByText('EP01.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, {
      target: { files: [localFile('EP01.srt', 'EP01.srt')] },
    });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));
    fireEvent.change(screen.getByLabelText('整剧批次'), { target: { value: projectBId } });
    releaseRead?.();
    await waitFor(() => expect(screen.getByLabelText('整剧批次')).toHaveValue(projectBId));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(writes).toEqual([]);
    expect(document.body.textContent).not.toContain('C:\\');
  });

  it('同一 SPA 会话确认清单后进入上传页会交接原始 File，不要求再次选择', async () => {
    sessionStorage.clear();
    const confirmedManifest = {
      ...oneEpisodeManifest(),
      bindingCount: 3,
      bindings: [
        oneEpisodeManifest().bindings[0]!,
        {
          episodeNumber: 1,
          role: 'asr_video' as const,
          relativePath: '匿名系列/视频/EP01.mp4',
          fileName: 'EP01.mp4',
          sizeBytes: 1,
          lastModifiedMs: timestamp,
          fingerprint: `匿名系列/视频/EP01.mp4|1|${timestamp}`,
          mediaType: 'video' as const,
        },
        {
          episodeNumber: 1,
          role: 'screen_video' as const,
          relativePath: '匿名系列/视频/EP01.mp4',
          fileName: 'EP01.mp4',
          sizeBytes: 1,
          lastModifiedMs: timestamp,
          fingerprint: `匿名系列/视频/EP01.mp4|1|${timestamp}`,
          mediaType: 'video' as const,
        },
      ],
      assetBindings: [],
    };
    vi.mocked(uploadFileWithMultipart).mockImplementation(() => Promise.reject(new Error('测试停止上传')));
    let manifestConfirmed = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.startsWith('/api/projects?')) return json({ items: [projectA], total: 1 });
      if (url === `/api/projects/${projectAId}/material-manifest` && method === 'GET') {
        return json({ project: projectA, manifest: manifestConfirmed ? confirmedManifest : null });
      }
      if (url === `/api/projects/${projectAId}/material-manifests/confirm` && method === 'POST') {
        manifestConfirmed = true;
        return json(confirmedManifest, 201);
      }
      if (url === `/api/projects/${projectAId}/uploads` && method === 'GET') return json({ items: [] });
      if (url === `/api/projects/${projectAId}/uploads` && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return json(uploadSession({
          originalFileName: body.originalFileName,
          mediaKind: body.mediaKind,
          sizeBytes: body.sizeBytes,
          fileFingerprint: body.fileFingerprint,
          materialBinding: body.materialBinding,
        }), 201);
      }
      throw new Error(`未处理请求：${method} ${url}`);
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/projects/${projectAId}/materials`]}>
          <Routes>
            <Route path="/projects/:projectId/materials" element={<><ProjectMaterials /><Link to="/uploads">去上传</Link></>} />
            <Route path="/uploads" element={<UploadQueue />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText('尚未建立素材清单');
    const originalFiles = [
      localFile('EP01.srt', '匿名系列/SRT/EP01.srt'),
      localFile('EP01.mp4', '匿名系列/视频/EP01.mp4'),
    ];
    fireEvent.change(view.container.querySelector('#material-folder')!, { target: { files: originalFiles } });
    fireEvent.click(await screen.findByRole('button', { name: '确认整剧素材' }));
    fireEvent.click(screen.getByRole('button', { name: '保存清单' }));
    await screen.findByText('已确认素材清单 v1');
    fireEvent.click(screen.getByRole('link', { name: '去上传' }));
    await screen.findByText('本地素材分配');
    await waitFor(() => expect(uploadFileWithMultipart).toHaveBeenCalled());
    const handedFile = vi.mocked(uploadFileWithMultipart).mock.calls[0]?.[0];
    expect(handedFile).toBe(originalFiles[0]);
    expect(screen.queryByText('等待本地文件')).not.toBeInTheDocument();
  });
});
