import type { UploadSession } from '@qimao-terms-cloud/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FakeRequest = { method: string; headers: Record<string, string>; getMethod: () => string; getURL: () => string; setHeader: (name: string, value: string) => void };
type AttemptPlan = { methods: string[]; reject?: boolean; status?: number; location?: string; offsets?: Array<number | undefined> };
const fakeState = vi.hoisted(() => ({ plans: [] as AttemptPlan[], requests: [] as FakeRequest[], pluginOptions: [] as Array<Record<string, unknown>>, addedFiles: [] as unknown[], attempts: 0 }));
const testSessionStorage = {
  values: new Map<string, string>(),
  getItem(key: string) { return this.values.get(key) ?? null; },
  setItem(key: string, value: string) { this.values.set(key, value); },
  clear() { this.values.clear(); },
};
(globalThis as typeof globalThis & { window?: unknown }).window = { location: { origin: 'http://localhost' }, sessionStorage: testSessionStorage };

vi.mock('../../frontend/src/features/uploads/uppy.js', () => {
  class FakeUppy {
    private readonly handlers = new Map<string, (...args: unknown[]) => void>();
    private readonly fileId = 'file-1';
    private tusOptions: { onBeforeRequest?: (request: FakeRequest) => void | Promise<void>; onAfterResponse?: (request: FakeRequest, response: { getStatus: () => number; getHeader: (name: string) => string | undefined }) => void } | undefined;
    constructor(_options: unknown) {}
    addFile(file: unknown) { fakeState.addedFiles.push(file); return this.fileId; }
    use(_plugin: unknown, options: { onBeforeRequest?: (request: FakeRequest) => void | Promise<void>; onAfterResponse?: (request: FakeRequest, response: { getStatus: () => number; getHeader: (name: string) => string | undefined }) => void } & Record<string, unknown>) { this.tusOptions = options; fakeState.pluginOptions.push(options); return this; }
    on(event: string, handler: (...args: unknown[]) => void) { this.handlers.set(event, handler); return this; }
    pauseAll() {}
    resumeAll() {}
    cancelAll() {}
    destroy() {}
    async upload() {
      const plan = fakeState.plans[fakeState.attempts++] ?? { methods: ['POST', 'PATCH'] };
      for (const [methodIndex, method] of plan.methods.entries()) {
        const request: FakeRequest = { method, headers: {}, getMethod: () => method, getURL: () => String((this.tusOptions as { uploadUrl?: unknown } | undefined)?.uploadUrl ?? (this.tusOptions as { endpoint?: unknown } | undefined)?.endpoint ?? ''), setHeader: (name, value) => { request.headers[name] = value; } };
        await this.tusOptions?.onBeforeRequest?.(request);
        this.tusOptions?.onAfterResponse?.(request, {
          getStatus: () => plan.status ?? (method === 'POST' ? 201 : 204),
          getHeader: (name) => {
            const lower = name.toLowerCase();
            if (lower === 'location' && method === 'POST') return plan.location;
            if (lower === 'upload-offset' && (method === 'HEAD' || method === 'PATCH')) return plan.offsets?.[methodIndex]?.toString();
            return undefined;
          },
        });
        fakeState.requests.push(request);
        this.handlers.get('upload-progress')?.({ id: this.fileId }, { bytesUploaded: 1, bytesTotal: 1 });
      }
      if (plan.reject) throw Object.assign(new Error('transport result unknown'), { originalResponse: { getStatus: () => plan.status ?? 503 } });
      return { successful: [{ id: this.fileId }] };
    }
  }
  return { Uppy: FakeUppy, Tus: class FakeTus {} };
});

vi.resetModules();
const { UploadCompletionUnknownError, UploadTransportUnknownError, UploadTusConflictError, uploadFileWithTus } = await import('../../frontend/src/features/uploads/upload-engine.js');
const { CREATE_UPLOAD_TIMEOUT_MS, createUpload } = await import('../../frontend/src/features/uploads/api.js');

const uploadId = 'd4000000-0000-4000-8000-000000000001';
const baseSession = (overrides: Record<string, unknown> = {}) => ({
  id: uploadId,
  projectId: 'd4000000-0000-4000-8000-000000000002',
  objectKey: 'redacted/object',
  originalFileName: 'EP01.srt',
  mediaKind: 'srt',
  sizeBytes: 1,
  partSizeBytes: 1,
  totalParts: 1,
  storageUploadId: 'storage-1',
  transportKind: 'tus' as const,
  tusEndpoint: '/api/uploads/tus',
  fileFingerprint: 'fingerprint-1',
  checksumAlgorithm: 'sha256' as const,
  checksumValue: null,
  status: 'created' as const,
  expiresAt: '2026-08-22T00:00:00.000Z',
  version: 1,
  errorCode: null,
  errorDetail: null,
  confirmedParts: [],
  missingPartNumbers: [1],
  asset: null,
  materialBinding: { manifestId: 'd4000000-0000-4000-8000-000000000003', targets: [{ episodeNumber: 1, role: 'company_srt' as const }] },
  ...overrides,
});
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const run = (initial: UploadSession, plans: AttemptPlan[], fetchImpl: typeof fetch, resumeFromExisting = false, onProgress?: (bytesUploaded: number, bytesTotal: number) => void, fileData: BlobPart = 'x', capabilityResponses: Array<Record<string, unknown>> = []) => {
  fakeState.plans = plans;
  fakeState.requests = [];
  fakeState.pluginOptions = [];
  fakeState.addedFiles = [];
  fakeState.attempts = 0;
  const capability = {
    token: 'capability-token-for-tests-1234567890abcdef',
    tusEndpoint: 'https://upload.milaidi.online/api/uploads/tus',
    uploadSessionId: initial.id,
    projectId: initial.projectId,
    storageUploadId: initial.storageUploadId,
    expectedSizeBytes: initial.sizeBytes,
    allowedMethods: ['POST', 'HEAD', 'PATCH'] as const,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
  let capabilityCall = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    if (String(input) === `/api/uploads/${initial.id}/direct-capability`) {
      return response(capabilityResponses[capabilityCall++] ?? capability);
    }
    return fetchImpl(input, init);
  });
  return uploadFileWithTus(new File([fileData], 'EP01.srt'), initial, { paused: () => false, onSession: () => undefined, onProgress, resumeFromExisting });
};

afterEach(() => vi.restoreAllMocks());
beforeEach(() => { fakeState.plans = []; fakeState.requests = []; fakeState.pluginOptions = []; fakeState.addedFiles = []; fakeState.attempts = 0; window.sessionStorage.clear(); });

describe('upload-engine Tus 合同', () => {
  it('首次传输只 POST 一次、PATCH 后 complete 一次，并带业务 session header', async () => {
    const initial = baseSession();
    const completed = baseSession({ status: 'completed', version: 3, missingPartNumbers: [] });
    const result = await run(initial as UploadSession, [{ methods: ['POST', 'PATCH'], location: '/api/uploads/tus/server-upload-1' }], vi.fn(async (input) => {
      const url = String(input);
      if (url === `/api/uploads/${uploadId}`) return response(initial);
      if (url.endsWith('/complete')) return response(completed);
      throw new Error(`unexpected ${url}`);
    }));
    expect(result.status).toBe('completed');
    expect(fakeState.requests.filter((request) => request.method === 'POST')).toHaveLength(1);
    expect(fakeState.requests.filter((request) => request.method === 'PATCH')).toHaveLength(1);
    expect(fakeState.requests.find((request) => request.method === 'POST')?.headers['X-Upload-Session-Id']).toBe(uploadId);
    expect(fakeState.pluginOptions[0]).toMatchObject({ chunkSize: 2 * 1024 * 1024, parallelUploads: 1, limit: 1, endpoint: 'https://upload.milaidi.online/api/uploads/tus', withCredentials: false });
    expect(fakeState.pluginOptions[0]?.allowedMetaFields).toEqual(['filename', 'filetype']);
    expect((fakeState.addedFiles[0] as { meta?: unknown }).meta).toEqual({ filename: 'EP01.srt', filetype: 'application/x-subrip' });
    expect([...testSessionStorage.values.values()]).toContain('https://upload.milaidi.online/api/uploads/tus/server-upload-1');
    expect(fakeState.requests.every((request) => request.headers['x-qimao-upload-capability'] === 'capability-token-for-tests-1234567890abcdef')).toBe(true);
  });

  it('连续三片进度只采用服务端 PATCH offset，不采用 Uppy 本地读取量', async () => {
    const chunk = 2 * 1024 * 1024;
    const progress: number[] = [];
    const initial = baseSession({ sizeBytes: chunk * 3 });
    const completed = baseSession({ sizeBytes: chunk * 3, status: 'completed', version: 3, missingPartNumbers: [] });
    const result = await run(initial as UploadSession, [{
      methods: ['POST', 'PATCH', 'PATCH', 'PATCH'],
      location: '/api/uploads/tus/server-upload-3-chunks',
      offsets: [undefined, chunk, chunk * 2, chunk * 3],
    }], vi.fn(async (input) => {
      const url = String(input);
      if (url === `/api/uploads/${uploadId}`) return response(initial);
      if (url.endsWith('/complete')) return response(completed);
      throw new Error(`unexpected ${url}`);
    }), false, (bytesUploaded) => progress.push(bytesUploaded), new Uint8Array(chunk * 3));
    expect(result.status).toBe('completed');
    expect(fakeState.pluginOptions[0]?.chunkSize).toBe(chunk);
    expect(progress).toEqual([chunk, chunk * 2, chunk * 3]);
    expect(progress.every((offset, index) => index === 0 || offset >= progress[index - 1]!)).toBe(true);
  });

  it('异常中断后先 HEAD 读取权威 offset 再续传，进度不倒退', async () => {
    const chunk = 2 * 1024 * 1024;
    const progress: number[] = [];
    const initial = baseSession({ sizeBytes: chunk * 3 });
    const observed = baseSession({ sizeBytes: chunk * 3, status: 'uploading' });
    const completed = baseSession({ sizeBytes: chunk * 3, status: 'completed', version: 4, missingPartNumbers: [] });
    const result = await run(initial as UploadSession, [
      { methods: ['POST', 'PATCH'], reject: true, status: 503, location: '/api/uploads/tus/server-upload-resume', offsets: [undefined, chunk] },
      { methods: ['HEAD', 'PATCH', 'PATCH'], offsets: [chunk, chunk * 2, chunk * 3] },
    ], vi.fn(async (input) => {
      const url = String(input);
      if (url === `/api/uploads/${uploadId}`) return response(observed);
      if (url.endsWith('/complete')) return response(completed);
      throw new Error(`unexpected ${url}`);
    }), false, (bytesUploaded) => progress.push(bytesUploaded), new Uint8Array(chunk * 3));
    expect(result.status).toBe('completed');
    expect(fakeState.requests.map((request) => request.method)).toEqual(['POST', 'PATCH', 'HEAD', 'PATCH', 'PATCH']);
    expect(progress).toEqual([chunk, chunk * 2, chunk * 3]);
    expect(progress.every((offset, index) => index === 0 || offset >= progress[index - 1]!)).toBe(true);
  });

  it('已有服务端 Location 恢复只 HEAD/PATCH，不再次 Tus POST', async () => {
    const initial = baseSession({ status: 'uploading' });
    window.sessionStorage.setItem(`qimao.upload.tus-location.${encodeURIComponent('https://upload.milaidi.online/api/uploads/tus')}.${uploadId}`, 'https://upload.milaidi.online/api/uploads/tus/server-upload-1');
    const completed = baseSession({ status: 'completed', version: 3, missingPartNumbers: [] });
    const result = await run(initial as UploadSession, [{ methods: ['HEAD', 'PATCH'] }], vi.fn(async (input) => {
      const url = String(input);
      if (url === `/api/uploads/${uploadId}`) return response(initial);
      if (url.endsWith('/complete')) return response(completed);
      throw new Error(`unexpected ${url}`);
    }), true);
    expect(result.status).toBe('completed');
    expect(fakeState.requests.map((request) => request.method)).toEqual(['HEAD', 'PATCH']);
    expect(fakeState.pluginOptions[0]?.uploadUrl).toBe('https://upload.milaidi.online/api/uploads/tus/server-upload-1');
  });

  it('Tus 409 带权威 Location 时先恢复同一资源，禁止第二次 POST', async () => {
    const initial = baseSession();
    const observed = baseSession({ status: 'uploading' });
    const completed = baseSession({ status: 'completed', version: 3, missingPartNumbers: [] });
    const result = await run(initial as UploadSession, [{ methods: ['POST'], reject: true, status: 409, location: '/api/uploads/tus/server-upload-409' }, { methods: ['HEAD', 'PATCH'] }], vi.fn(async (input) => {
      const url = String(input);
      if (url === `/api/uploads/${uploadId}`) return response(observed);
      if (url.endsWith('/complete')) return response(completed);
      throw new Error(`unexpected ${url}`);
    }));
    expect(result.status).toBe('completed');
    expect(fakeState.requests.map((request) => request.method)).toEqual(['POST', 'HEAD', 'PATCH']);
    expect(fakeState.pluginOptions[1]?.uploadUrl).toBe('https://upload.milaidi.online/api/uploads/tus/server-upload-409');
  });

  it('Tus POST 结果未知且没有 Location 只 GET 业务会话，不发随机 HEAD/PATCH', async () => {
    const initial = baseSession();
    const observed = baseSession({ status: 'uploading' });
    const error = await run(initial as UploadSession, [{ methods: ['POST'], reject: true, status: 503 }], vi.fn(async (input) => {
      if (String(input) === `/api/uploads/${uploadId}`) return response(observed);
      throw new Error('unexpected');
    })).then(() => undefined, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(UploadTransportUnknownError);
    expect(fakeState.requests.map((request) => request.method)).toEqual(['POST']);
  });

  it('完成 POST 结果未知只 GET 同一会话，不自动第二次 complete', async () => {
    const initial = baseSession();
    let completeCount = 0;
    const error = await run(initial as UploadSession, [{ methods: ['POST', 'PATCH'], location: '/api/uploads/tus/server-upload-complete' }], vi.fn(async (input) => {
      const url = String(input);
      if (url === `/api/uploads/${uploadId}`) return response(initial);
      if (url.endsWith('/complete')) { completeCount += 1; throw new TypeError('response lost'); }
      throw new Error(`unexpected ${url}`);
    })).then(() => undefined, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(UploadCompletionUnknownError);
    expect(completeCount).toBe(1);
    expect(fakeState.requests.filter((request) => request.method === 'POST')).toHaveLength(1);
  });

  it('能力临近过期时同一 session 只刷新一次，token 不进入持久化存储', async () => {
    const initial = baseSession({ id: 'd4000000-0000-4000-8000-000000000099' });
    const capabilityBase = {
      tusEndpoint: 'https://upload.milaidi.online/api/uploads/tus',
      uploadSessionId: initial.id,
      projectId: initial.projectId,
      storageUploadId: initial.storageUploadId,
      expectedSizeBytes: initial.sizeBytes,
      allowedMethods: ['POST', 'HEAD', 'PATCH'],
    };
    const nearExpiry = { ...capabilityBase, token: 'near-expiry-token-1234567890abcdef', expiresAt: new Date(Date.now() + 30_000).toISOString() };
    const refreshed = { ...capabilityBase, token: 'refreshed-token-1234567890abcdef', expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() };
    const completed = baseSession({ id: initial.id, status: 'completed', version: 3, missingPartNumbers: [] });
    const result = await run(initial as UploadSession, [{ methods: ['POST', 'PATCH'], location: '/api/uploads/tus/server-upload-refresh' }], vi.fn(async (input) => {
      const url = String(input);
      if (url === `/api/uploads/${initial.id}`) return response(initial);
      if (url.endsWith('/complete')) return response(completed);
      throw new Error(`unexpected ${url}`);
    }), false, undefined, 'x', [nearExpiry, refreshed]);
    expect(result.status).toBe('completed');
    const capabilityCalls = (globalThis.fetch as typeof fetch & { mock?: { calls: unknown[][] } }).mock?.calls.filter(([input]) => String(input).endsWith('/direct-capability')) ?? [];
    expect(capabilityCalls).toHaveLength(2);
    expect(fakeState.requests.every((request) => request.headers['x-qimao-upload-capability'] === refreshed.token)).toBe(true);
    expect([...testSessionStorage.values.values()]).not.toContain(nearExpiry.token);
    expect([...testSessionStorage.values.values()]).not.toContain(refreshed.token);
  });

  it('传输恢复缺少 storageUploadId 时以 unknown 结束，不创建第二任务', async () => {
    const initial = baseSession({ storageUploadId: null });
    const error = await run(initial as UploadSession, [{ methods: ['POST'], reject: true }], vi.fn(async (input) => {
      if (String(input) === `/api/uploads/${uploadId}`) return response({ ...initial, storageUploadId: null });
      throw new Error('unexpected');
    })).then(() => undefined, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(UploadTransportUnknownError);
    expect(fakeState.requests.filter((request) => request.method === 'POST')).toHaveLength(1);
  });

  it('Tus 409 没有服务端 Location 立即报确定冲突，不发随机 HEAD', async () => {
    const initial = baseSession();
    const error = await run(initial as UploadSession, [{ methods: ['POST'], reject: true, status: 409 }], vi.fn(async (input) => {
      throw new Error(`unexpected ${String(input)}`);
    })).then(() => undefined, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(UploadTusConflictError);
    expect(fakeState.requests.map((request) => request.method)).toEqual(['POST']);
  });

  it('create 请求超时会 Abort 收口而不是永久占用队列槽位', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      }));
      const pending = createUpload('project-1', 'command-1', {} as never);
      const rejection = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
      await vi.advanceTimersByTimeAsync(CREATE_UPLOAD_TIMEOUT_MS);
      await rejection;
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
