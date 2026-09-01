// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import { uploadFileWithMultipart } from '../../frontend/src/features/uploads/upload-engine.js';

const multipartEngine = vi.mocked(uploadFileWithMultipart);
const projectId = 'b4000000-0000-4000-8000-000000000201';
const manifestId = 'b4000000-0000-4000-8000-000000000202';
const oldUploadId = 'b4000000-0000-4000-8000-000000000203';
const newUploadId = 'b4000000-0000-4000-8000-000000000204';
const timestamp = 1_785_468_061_000;
const fingerprint = `匿名系列/SRT/1.srt|8|${timestamp}`;

const project = {
  id: projectId, name: '匿名传输替换', workflowStatus: 'uploading' as const, lifecycleStatus: 'active' as const,
  recycleExpiresAt: null, version: 1, createdAt: '2026-08-22T00:00:00.000Z', updatedAt: '2026-08-22T00:00:00.000Z',
  createdBy: 'employee-test', updatedBy: 'employee-test',
};
const srtBinding = { episodeNumber: 1, role: 'company_srt' as const, relativePath: '匿名系列/SRT/1.srt', fileName: '1.srt', sizeBytes: 8, lastModifiedMs: timestamp, fingerprint, mediaType: 'srt' as const };
const videoBinding = { episodeNumber: 1, role: 'asr_video' as const, relativePath: '匿名系列/视频/1.mp4', fileName: '1.mp4', sizeBytes: 16, lastModifiedMs: timestamp, fingerprint: `匿名系列/视频/1.mp4|16|${timestamp}`, mediaType: 'video' as const };
const manifest = {
  id: manifestId, projectId, version: 1, rootName: '匿名系列', episodeCount: 1, bindingCount: 2,
  confirmedAt: '2026-08-22T00:00:00.000Z', createdBy: 'employee-test', bindings: [srtBinding, videoBinding], assetBindings: [],
};
const oldTus = {
  id: oldUploadId, projectId, objectKey: 'redacted/old', originalFileName: '1.srt', mediaKind: 'srt' as const,
  sizeBytes: 8, partSizeBytes: 16 * 1024 * 1024, totalParts: 1,
  transportKind: 'tus' as const, tusEndpoint: '/api/uploads/tus' as const, fileFingerprint: fingerprint,
  checksumAlgorithm: 'sha256' as const, checksumValue: null, status: 'created' as const,
  expiresAt: '2026-08-23T00:00:00.000Z', version: 1, errorCode: null, errorDetail: null,
  confirmedParts: [], missingPartNumbers: [1], asset: null,
  materialBinding: { manifestId, targets: [{ episodeNumber: 1, role: 'company_srt' as const }] },
} satisfies UploadSession;
const newMultipart = {
  ...oldTus, id: newUploadId, objectKey: 'redacted/new',
  transportKind: 'multipart' as const, tusEndpoint: null, status: 'created' as const,
} satisfies UploadSession;

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><UploadQueue /></MemoryRouter></QueryClientProvider>);
};

beforeEach(() => {
  multipartEngine.mockReset();
  multipartEngine.mockImplementation(async (_file, initial, control) => {
    expect(initial.id).toBe(newUploadId);
    expect(initial.transportKind).toBe('multipart');
    const completed = { ...initial, status: 'completed' as const, missingPartNumbers: [], asset: null };
    control.onSession?.(completed);
    return completed;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('浏览器从旧 tus 会话显式切换到 multipart', () => {
  it('不把旧 tus 交给 multipart 执行器，只创建一个新 multipart 会话', async () => {
    const createBodies: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.startsWith('/api/projects?')) return json({ items: [project], total: 1 });
      if (url.endsWith('/material-manifest')) return json({ project, manifest });
      if (url.endsWith('/uploads') && method === 'GET') return json({ items: [oldTus] });
      if (url.endsWith('/uploads') && method === 'POST') {
        createBodies.push(JSON.parse(String(init?.body)));
        return json(newMultipart, 201);
      }
      throw new Error(`未处理请求：${method} ${url}`);
    });

    const file = new File([new Uint8Array(8)], '1.srt', { lastModified: timestamp });
    Object.defineProperty(file, 'webkitRelativePath', { value: '匿名系列/SRT/1.srt' });
    const view = renderPage();
    await screen.findByText('1.srt');
    fireEvent.change(view.container.querySelector('#upload-files')!, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: '确认并开始上传' }));

    await waitFor(() => expect(multipartEngine).toHaveBeenCalledTimes(1));
    expect(createBodies).toHaveLength(1);
    expect(createBodies[0]).toMatchObject({
      transportKind: 'multipart',
      fileFingerprint: fingerprint,
      replaceUploadId: oldUploadId,
    });
    expect(multipartEngine.mock.calls[0]?.[1]).toMatchObject({ id: newUploadId, transportKind: 'multipart' });
    expect(multipartEngine.mock.calls[0]?.[1]).not.toMatchObject({ id: oldUploadId, transportKind: 'tus' });
  });
});
