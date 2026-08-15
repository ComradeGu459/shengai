// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { UploadQueue } from '../../frontend/src/features/uploads/UploadQueue.js';
import { buildPhysicalMaterials, statusLabel } from '../../frontend/src/features/uploads/model.js';
import { sha256Blob } from '../../frontend/src/features/uploads/sha256.js';
import { uploadMissingParts } from '../../frontend/src/features/uploads/upload-engine.js';

const projectId = 'ca65378e-8935-4c4a-9e8b-13efca3d314a';
const manifestId = 'ca65378e-8935-4c4a-9e8b-13efca3d314b';
const uploadId = 'ca65378e-8935-4c4a-9e8b-13efca3d314c';
const assetId = 'ca65378e-8935-4c4a-9e8b-13efca3d314d';
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

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><UploadQueue /></MemoryRouter></QueryClientProvider>);
};

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json' },
});

const session = (overrides: Record<string, unknown> = {}) => ({
  id: uploadId,
  projectId,
  objectKey: 'anonymous/object',
  originalFileName: 'EP01.srt',
  mediaKind: 'srt',
  sizeBytes: 1,
  partSizeBytes: 64,
  totalParts: 1,
  fileFingerprint: 'fp-srt',
  checksumAlgorithm: 'sha256',
  checksumValue: '0'.repeat(64),
  status: 'created',
  expiresAt: '2026-08-14T08:00:00.000Z',
  version: 1,
  errorCode: null,
  errorDetail: null,
  confirmedParts: [],
  missingPartNumbers: [1],
  asset: null,
  materialBinding: { manifestId, targets: [{ episodeNumber: 1, role: 'company_srt' }] },
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('正式多文件上传队列', () => {
  it('分块 SHA-256 与标准摘要一致', async () => {
    expect(await sha256Blob(new Blob(['abc']))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('把后端会话事实和浏览器暂停投影为可读状态', () => {
    expect(statusLabel(undefined, undefined, false)).toBe('等待本地文件');
    expect(statusLabel(undefined, { file: new File(['x'], 'x.srt') }, false)).toBe('待上传');
    expect(statusLabel(session() as never, { queued: true }, false)).toBe('排队中');
    expect(statusLabel(session({ status: 'uploading' }) as never, { paused: true }, false)).toBe('本机已暂停');
    expect(statusLabel(session({ status: 'uploading' }) as never, undefined, false)).toBe('等待重新选择');
    expect(statusLabel(session({ status: 'verifying' }) as never, undefined, false)).toBe('校验中');
    expect(statusLabel(session({ status: 'failed' }) as never, undefined, false)).toBe('失败');
    expect(statusLabel(session({ status: 'expired' }) as never, undefined, false)).toBe('会话已过期');
    expect(statusLabel(session({ status: 'completed' }) as never, undefined, false)).toBe('已完成');
  });

  it('按唯一物理文件合并共享视频角色', () => {
    const rows = buildPhysicalMaterials(manifest);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.fileName === 'EP01.mp4')?.roles).toEqual(['asr_video', 'screen_video']);
  });

  it('展示双入口、唯一总体进度、共享文件单行和选择后批量栏', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads')) return json({ items: [] });
      throw new Error(`未处理请求：${url}`);
    });
    renderPage();
    expect(await screen.findByText('整批总体进度')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择素材文件夹' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择多个文件' })).toBeInTheDocument();
    expect(await screen.findAllByText('EP01.mp4')).toHaveLength(1);
    expect(screen.getByText('共享文件 · 上传一次')).toBeInTheDocument();
    expect(screen.queryByText(/单文件.*%/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('选择 EP01.srt'));
    expect(screen.getByText('已选择 1 项')).toBeInTheDocument();
    expect(screen.getByText('已完成 Asset 不受影响')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '取消未完成上传' })).toHaveLength(3);
  });

  it('匹配本地文件后依次创建、上传、确认并以服务端 completed 标记完成', async () => {
    const digest = await sha256Blob(new Blob(['x']));
    const created = session({ checksumValue: digest });
    const confirmed = session({
      checksumValue: digest,
      status: 'uploading',
      version: 2,
      confirmedParts: [{ partNumber: 1, sizeBytes: 1, etag: 'etag-1', checksumValue: digest, confirmedAt: '2026-08-13T08:01:00.000Z' }],
      missingPartNumbers: [],
    });
    const completed = session({
      ...confirmed,
      status: 'completed',
      version: 3,
      asset: { id: assetId, projectId, objectKey: 'anonymous/object', originalFileName: 'EP01.srt', mediaKind: 'srt', sizeBytes: 1, checksumAlgorithm: 'sha256', checksumValue: digest, verifiedAt: '2026-08-13T08:02:00.000Z' },
    });
    const calls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url === `/api/projects/${projectId}/uploads` && !init?.method) return json({ items: [] });
      if (url === `/api/projects/${projectId}/uploads`) return json(created, 201);
      if (url.endsWith('/parts/authorize')) return json({ uploadId, objectKey: 'anonymous/object', partNumber: 1, authorizationToken: 'token', expiresAt: '2026-08-13T08:10:00.000Z', uploadRequest: { url: `/api/local/uploads/${uploadId}/parts/1`, method: 'PUT', headers: { authorization: 'Bearer token', 'content-type': 'application/octet-stream' } } });
      if (url.includes('/api/local/uploads/')) return json({ partNumber: 1, sizeBytes: 1, etag: 'etag-1', checksumValue: digest });
      if (url.endsWith('/parts/confirm')) return json(confirmed);
      if (url === `/api/uploads/${uploadId}`) return json(confirmed);
      if (url.endsWith('/complete')) return json(completed);
      throw new Error(`未处理请求：${url}`);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    const file = new File(['x'], 'EP01.srt', { lastModified: timestamp });
    Object.defineProperty(file, 'webkitRelativePath', { value: '匿名剧/SRT/EP01.srt' });
    fireEvent.change(view.container.querySelector('#upload-folder')!, { target: { files: [file] } });
    expect(await screen.findByText('已完成')).toBeInTheDocument();
    await waitFor(() => expect(calls).toEqual(expect.arrayContaining([
      `POST /api/projects/${projectId}/uploads`,
      `POST /api/uploads/${uploadId}/parts/authorize`,
      `PUT /api/local/uploads/${uploadId}/parts/1`,
      `POST /api/uploads/${uploadId}/parts/confirm`,
      `POST /api/uploads/${uploadId}/complete`,
    ])));
  });

  it('直传授权过期时自动续签一次后继续缺失分片', async () => {
    const digest = await sha256Blob(new Blob(['x']));
    const confirmed = session({
      status: 'uploading',
      version: 2,
      confirmedParts: [{ partNumber: 1, sizeBytes: 1, etag: 'etag-1', checksumValue: digest, confirmedAt: '2026-08-13T08:01:00.000Z' }],
      missingPartNumbers: [],
    });
    const completed = session({ ...confirmed, status: 'completed', version: 3 });
    let authorizationCount = 0;
    let putCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/parts/authorize')) {
        authorizationCount += 1;
        return json({ uploadId, objectKey: 'anonymous/object', partNumber: 1, authorizationToken: `token-${authorizationCount}`, expiresAt: '2026-08-13T08:10:00.000Z', uploadRequest: { url: `/api/local/uploads/${uploadId}/parts/1`, method: 'PUT', headers: { authorization: `Bearer token-${authorizationCount}` } } });
      }
      if (url.includes('/api/local/uploads/')) {
        putCount += 1;
        if (putCount === 1) return json({ error: { code: 'UPLOAD_AUTHORIZATION_EXPIRED', message: '授权已过期', retryable: true, action: 'renew_authorization', requestId: 'req-expired' } }, 401);
        return json({ partNumber: 1, sizeBytes: 1, etag: 'etag-1', checksumValue: digest });
      }
      if (url.endsWith('/parts/confirm')) return json(confirmed);
      if (url === `/api/uploads/${uploadId}`) return json(confirmed);
      if (url.endsWith('/complete')) return json(completed);
      throw new Error(`未处理请求：${url}`);
    });
    const result = await uploadMissingParts(new File(['x'], 'EP01.srt'), session() as never, {
      paused: () => false,
      onSession: () => undefined,
    });
    expect(result.status).toBe('completed');
    expect(authorizationCount).toBe(2);
    expect(putCount).toBe(2);
  });

  it('重新选择错误文件时保留服务端会话并展示指纹差异', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads')) return json({ items: [session({ status: 'uploading', confirmedParts: [], missingPartNumbers: [1] })] });
      throw new Error(`未处理请求：${url}`);
    });
    const view = renderPage();
    await screen.findByText('EP01.srt');
    const srtRow = screen.getByLabelText('选择 EP01.srt').closest('tr')!;
    fireEvent.click(srtRow.querySelector('button[class*="rowAction"]')!);
    const wrong = new File(['wrong'], 'EP01.srt', { lastModified: timestamp });
    fireEvent.change(view.container.querySelector('#upload-replace')!, { target: { files: [wrong] } });
    fireEvent.click(screen.getByText('EP01.srt'));
    expect(screen.getByText(/文件指纹不符/)).toBeInTheDocument();
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
  });
});
