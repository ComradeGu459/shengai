import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UploadSession } from '@qimao-terms-cloud/contracts';

import {
  UploadBrowserDirectRequiredError,
  MAX_OBJECT_STORAGE_PUTS,
  MAX_MULTIPART_WORKERS_PER_FILE,
  UploadPartEtagMissingError,
  UploadTransportUnknownError,
  uploadFileWithMultipart,
} from '../../frontend/src/features/uploads/upload-engine.js';

const sessionId = 'b4000000-0000-4000-8000-000000000101';
const projectId = 'b4000000-0000-4000-8000-000000000102';
const now = '2026-08-22T00:00:00.000Z';
const digest = 'a'.repeat(64);

const makeSession = (overrides: Partial<UploadSession> = {}) => ({
  id: sessionId,
  projectId,
  objectKey: 'projects/redacted/object',
  originalFileName: 'EP01.mp4',
  mediaKind: 'video' as const,
  sizeBytes: 2,
  partSizeBytes: 1,
  totalParts: 2,
  storageUploadId: 'storage-upload-101',
  fileFingerprint: 'fingerprint-101',
  checksumAlgorithm: 'sha256' as const,
  checksumValue: null,
  transportKind: 'multipart' as const,
  tusEndpoint: null,
  status: 'created' as const,
  expiresAt: '2026-08-23T00:00:00.000Z',
  version: 1,
  errorCode: null,
  errorDetail: null,
  confirmedParts: [],
  missingPartNumbers: [1, 2],
  asset: null,
  materialBinding: null,
  ...overrides,
});

const responseJson = (value: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json', ...headers },
});

const progressControl = () => ({
  paused: () => false,
  onSession: vi.fn(),
  onProgress: vi.fn(),
});

const waitUntil = async (predicate: () => boolean, message: string) => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(message);
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('对象存储 multipart 上传引擎', () => {
  it('新 multipart 会话拒绝旧同源 relay，不发送 PUT 或 complete', async () => {
    const initial = makeSession({ totalParts: 1, missingPartNumbers: [1], sizeBytes: 1 });
    let current = initial;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('window', { location: new URL('https://milaidi.online/uploads') });
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith('/parts/authorize')) return responseJson({
        uploadId: sessionId,
        objectKey: initial.objectKey,
        partNumber: 1,
        authorizationToken: 'redacted',
        expiresAt: now,
        uploadRequest: {
          url: `/api/local/uploads/${sessionId}/parts/1`,
          method: 'PUT',
          headers: { authorization: 'Bearer short-lived-capability', 'content-type': 'video/mp4' },
        },
      });
      if (url === `/api/local/uploads/${sessionId}/parts/1`) {
        return new Response(null, { status: 200, headers: { ETag: 'etag-relay-1' } });
      }
      if (url.endsWith('/parts/confirm')) {
        const body = JSON.parse(String(init?.body));
        current = {
          ...current,
          status: 'uploading',
          version: current.version + 1,
          confirmedParts: [{ partNumber: 1, sizeBytes: 1, etag: body.etag, checksumValue: body.checksumValue, confirmedAt: now }],
          missingPartNumbers: [],
        };
        return responseJson(current);
      }
      if (url.endsWith(`/api/uploads/${sessionId}`)) return responseJson(current);
      if (url.endsWith('/complete')) return responseJson({ ...current, status: 'completed', version: current.version + 1 });
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });

    await expect(uploadFileWithMultipart(new File(['a'], 'EP01.mp4', { type: 'video/mp4' }), initial, progressControl()))
      .rejects.toBeInstanceOf(UploadBrowserDirectRequiredError);
    expect(calls.filter((call) => call.url.startsWith('/api/local/uploads/'))).toHaveLength(0);
    expect(calls.some((call) => call.url.endsWith('/parts/confirm'))).toBe(false);
    expect(calls.some((call) => call.url.endsWith('/complete'))).toBe(false);
  });

  it('按 authorize → presigned PUT → ETag+分片 SHA → confirm → complete，且 PUT 不带 Cookie/Authorization', async () => {
    const initial = makeSession();
    let current = initial;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      const method = init?.method ?? 'GET';
      if (url.endsWith('/parts/authorize')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number };
        return responseJson({ uploadId: sessionId, objectKey: initial.objectKey, partNumber: body.partNumber, authorizationToken: 'redacted', expiresAt: now, uploadRequest: { url: `https://s3.example.test/${body.partNumber}`, method: 'PUT', headers: { 'x-amz-date': 'redacted', 'content-type': 'video/mp4' } } });
      }
      if (url.startsWith('https://s3.example.test/')) return new Response(null, { status: 200, headers: { ETag: `etag-${url.at(-1)}` } });
      if (url.endsWith('/parts/confirm')) {
        const body = JSON.parse(String(init?.body));
        current = { ...current, status: body.partNumber === 2 ? 'uploading' : 'uploading', version: current.version + 1, confirmedParts: [...current.confirmedParts, { partNumber: body.partNumber, sizeBytes: body.sizeBytes, etag: body.etag, checksumValue: body.checksumValue, confirmedAt: now }], missingPartNumbers: body.partNumber === 2 ? [] : [2] };
        return responseJson(current);
      }
      if (url.endsWith(`/api/uploads/${sessionId}`)) return responseJson(current);
      if (url.endsWith('/complete')) return responseJson({ ...current, status: 'completed', version: current.version + 1, asset: { id: 'b4000000-0000-4000-8000-000000000103', projectId, objectKey: current.objectKey, originalFileName: current.originalFileName, mediaKind: current.mediaKind, sizeBytes: 2, checksumAlgorithm: 'sha256', checksumValue: digest, verifiedAt: now } });
      throw new Error(`未处理请求：${method} ${url}`);
    });
    const control = progressControl();
    const result = await uploadFileWithMultipart(new File(['ab'], 'EP01.mp4', { type: 'video/mp4' }), initial, control);
    expect(result.status).toBe('completed');
    expect(calls.filter((call) => call.url.endsWith('/parts/authorize'))).toHaveLength(2);
    expect(calls.filter((call) => call.url.startsWith('https://s3.example.test/'))).toHaveLength(2);
    expect(calls.filter((call) => call.url.endsWith('/parts/confirm'))).toHaveLength(2);
    expect(calls.filter((call) => call.url.endsWith('/complete'))).toHaveLength(1);
    const put = calls.find((call) => call.url.startsWith('https://s3.example.test/'))!;
    expect(put.init?.credentials).toBe('omit');
    expect(put.init?.headers).toEqual({ 'x-amz-date': 'redacted', 'content-type': 'video/mp4' });
    expect(put.init?.headers).not.toHaveProperty('authorization');
    expect(control.onProgress).toHaveBeenLastCalledWith(2, 2);
  });

  it('已有 confirmedParts 恢复只补 missing part，不创建第二业务会话', async () => {
    const first = { partNumber: 1, sizeBytes: 1, etag: 'etag-1', checksumValue: digest, confirmedAt: now };
    const initial = makeSession({ status: 'uploading', version: 4, confirmedParts: [first], missingPartNumbers: [2] });
    let current = initial;
    const calls: string[] = [];
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/parts/authorize')) return responseJson({ uploadId: sessionId, objectKey: initial.objectKey, partNumber: 2, authorizationToken: 'redacted', expiresAt: now, uploadRequest: { url: 'https://s3.example.test/2', method: 'PUT', headers: { 'content-type': 'video/mp4' } } });
      if (url === 'https://s3.example.test/2') return new Response(null, { status: 200, headers: { ETag: 'etag-2' } });
      if (url.endsWith('/parts/confirm')) { current = { ...current, status: 'uploading', version: current.version + 1, confirmedParts: [first, { partNumber: 2, sizeBytes: 1, etag: 'etag-2', checksumValue: digest, confirmedAt: now }], missingPartNumbers: [] }; return responseJson(current); }
      if (url.endsWith(`/api/uploads/${sessionId}`)) return responseJson(current);
      if (url.endsWith('/complete')) return responseJson({ ...current, status: 'completed' });
      throw new Error(`未处理请求：${url}`);
    });
    await uploadFileWithMultipart(new File(['ab'], 'EP01.mp4'), initial, progressControl());
    expect(calls.some((call) => call.includes('/api/projects/') && call.includes('/uploads'))).toBe(false);
    expect(calls.filter((call) => call.includes('/parts/authorize'))).toHaveLength(1);
    expect(calls.filter((call) => call.includes('/parts/confirm'))).toHaveLength(1);
  });

  it('PUT 结果未知先 GET 同一业务会话，不自动第二次上传或 complete', async () => {
    const initial = makeSession({ sizeBytes: 1, totalParts: 1, missingPartNumbers: [1] });
    const calls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/parts/authorize')) return responseJson({ uploadId: sessionId, objectKey: initial.objectKey, partNumber: 1, authorizationToken: 'redacted', expiresAt: now, uploadRequest: { url: 'https://s3.example.test/1', method: 'PUT', headers: {} } });
      if (url === 'https://s3.example.test/1') throw new TypeError('网络断开');
      if (url.endsWith(`/api/uploads/${sessionId}`)) return responseJson(initial);
      throw new Error(`不应调用：${url}`);
    });
    await expect(uploadFileWithMultipart(new File(['ab'], 'EP01.mp4'), initial, progressControl())).rejects.toBeInstanceOf(UploadTransportUnknownError);
    expect(calls.filter((call) => call.startsWith('PUT https://s3.example.test/'))).toHaveLength(1);
    expect(calls.some((call) => call.endsWith('/complete'))).toBe(false);
  });

  it('complete 结果未知只 GET 同一会话，已完成则不重发 complete', async () => {
    const initial = makeSession({ status: 'uploading', confirmedParts: [
      { partNumber: 1, sizeBytes: 1, etag: 'etag-1', checksumValue: digest, confirmedAt: now },
      { partNumber: 2, sizeBytes: 1, etag: 'etag-2', checksumValue: digest, confirmedAt: now },
    ], missingPartNumbers: [] });
    const completed = { ...initial, status: 'completed' as const, asset: {} as never };
    const calls: string[] = [];
    let sessionReads = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith(`/api/uploads/${sessionId}`)) return responseJson(sessionReads++ < 2 ? initial : completed);
      if (url.endsWith('/complete')) throw new TypeError('响应丢失');
      throw new Error(`不应调用：${url}`);
    });
    const result = await uploadFileWithMultipart(new File(['ab'], 'EP01.mp4'), initial, progressControl());
    expect(result.status).toBe('completed');
    expect(calls.filter((call) => call.endsWith('/complete'))).toHaveLength(1);
    expect(calls.filter((call) => call.endsWith(`/api/uploads/${sessionId}`))).toHaveLength(3);
  });

  it('complete 返回 verifying 后再次恢复只 GET 同一会话，不重复 complete', async () => {
    const verifying = makeSession({ status: 'verifying', version: 3, confirmedParts: [
      { partNumber: 1, sizeBytes: 1, etag: 'etag-1', checksumValue: digest, confirmedAt: now },
      { partNumber: 2, sizeBytes: 1, etag: 'etag-2', checksumValue: digest, confirmedAt: now },
    ], missingPartNumbers: [] });
    const calls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith(`/api/uploads/${sessionId}`)) return responseJson(verifying);
      throw new Error(`不应调用：${url}`);
    });
    const result = await uploadFileWithMultipart(new File(['ab'], 'EP01.mp4'), verifying, progressControl());
    expect(result.status).toBe('verifying');
    expect(calls.filter((call) => call.endsWith(`/api/uploads/${sessionId}`))).toHaveLength(1);
    expect(calls.some((call) => call.endsWith('/complete'))).toBe(false);
  });

  it('complete 的 202/verifying 响应作为权威会话返回，后续运行只读该会话', async () => {
    const initial = makeSession({ status: 'uploading', version: 4, confirmedParts: [
      { partNumber: 1, sizeBytes: 1, etag: 'etag-1', checksumValue: digest, confirmedAt: now },
      { partNumber: 2, sizeBytes: 1, etag: 'etag-2', checksumValue: digest, confirmedAt: now },
    ], missingPartNumbers: [] });
    let current = initial;
    const calls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith(`/api/uploads/${sessionId}`)) return responseJson(current);
      if (url.endsWith('/complete')) {
        current = { ...current, status: 'verifying', version: current.version + 1 };
        return responseJson(current, 202);
      }
      throw new Error(`不应调用：${url}`);
    });
    const file = new File(['ab'], 'EP01.mp4');
    const first = await uploadFileWithMultipart(file, initial, progressControl());
    expect(first.status).toBe('verifying');
    const second = await uploadFileWithMultipart(file, first, progressControl());
    expect(second.status).toBe('verifying');
    expect(calls.filter((call) => call.endsWith('/complete'))).toHaveLength(1);
  });

  it('缺失 ETag 立即阻断，不猜测摘要或发送 confirm', async () => {
    const initial = makeSession({ totalParts: 1, missingPartNumbers: [1], sizeBytes: 1 });
    const calls: string[] = [];
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith('/parts/authorize')) return responseJson({ uploadId: sessionId, objectKey: initial.objectKey, partNumber: 1, authorizationToken: 'redacted', expiresAt: now, uploadRequest: { url: 'https://s3.example.test/1', method: 'PUT', headers: {} } });
      if (url === 'https://s3.example.test/1') return new Response(null, { status: 200 });
      if (url.endsWith(`/api/uploads/${sessionId}`)) return responseJson(initial);
      throw new Error(`不应调用：${url}`);
    });
    await expect(uploadFileWithMultipart(new File(['a'], 'EP01.mp4'), initial, progressControl())).rejects.toBeInstanceOf(UploadPartEtagMissingError);
    expect(calls.some((url) => url.endsWith('/parts/confirm'))).toBe(false);
  });

  it('PUT 已开始后 pause 不中止在途写入，确认一次且暂停期间不启动下一片', async () => {
    const initial = makeSession({ id: 'b4000000-0000-4000-8000-000000000110', sizeBytes: 2, partSizeBytes: 1, totalParts: 2, missingPartNumbers: [1, 2] });
    const other = makeSession({ id: 'b4000000-0000-4000-8000-000000000113', sizeBytes: 1, partSizeBytes: 1, totalParts: 1, missingPartNumbers: [1] });
    let current = initial;
    let otherCurrent = other;
    let transport: { pause: () => void; resume: () => void; cancel: () => void } | undefined;
    let putCount = 0;
    let partOnePutCount = 0;
    let firstPutSignal: AbortSignal | undefined;
    let partTwoAuthorizeResolve!: (value: Response) => void;
    let firstPutResolve!: (value: Response) => void;
    let secondAuthorizeReady = false;
    let firstPutReady = false;
    let otherPutCount = 0;
    const calls: string[] = [];
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith(`/api/uploads/${initial.id}`)) return responseJson(current);
      if (url.endsWith(`/api/uploads/${other.id}`)) return responseJson(otherCurrent);
      if (url.endsWith('/parts/authorize')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number };
        const otherRequest = url.includes(other.id);
        const uploadId = otherRequest ? other.id : initial.id;
        const objectKey = otherRequest ? other.objectKey : initial.objectKey;
        const response = responseJson({ uploadId, objectKey, partNumber: body.partNumber, authorizationToken: 'redacted', expiresAt: now, uploadRequest: { url: `https://s3.example.test/${uploadId}/${body.partNumber}`, method: 'PUT', headers: {} } });
        if (!otherRequest && body.partNumber === 2 && !secondAuthorizeReady) return new Promise<Response>((resolve) => { partTwoAuthorizeResolve = resolve; });
        return response;
      }
      if (url.startsWith('https://s3.example.test/')) {
        putCount += 1;
        if (url.includes(other.id)) {
          otherPutCount += 1;
          return new Response(null, { status: 200, headers: { ETag: 'etag-other' } });
        }
        const partNumber = Number(url.split('/').at(-1));
        if (partNumber === 1) {
          partOnePutCount += 1;
          firstPutSignal = init?.signal;
          if (!firstPutReady) return new Promise<Response>((resolve) => { firstPutResolve = resolve; });
        }
        return new Response(null, { status: 200, headers: { ETag: `etag-${partNumber}` } });
      }
      if (url.endsWith('/parts/confirm')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number; sizeBytes: number; etag: string; checksumValue: string };
        if (url.includes(other.id)) {
          otherCurrent = { ...otherCurrent, status: 'uploading', version: otherCurrent.version + 1, confirmedParts: [{ partNumber: body.partNumber, sizeBytes: body.sizeBytes, etag: body.etag, checksumValue: body.checksumValue, confirmedAt: now }], missingPartNumbers: [] };
          return responseJson(otherCurrent);
        }
        current = { ...current, status: 'uploading', version: current.version + 1, confirmedParts: [...current.confirmedParts, { partNumber: body.partNumber, sizeBytes: body.sizeBytes, etag: body.etag, checksumValue: body.checksumValue, confirmedAt: now }], missingPartNumbers: current.missingPartNumbers.filter((partNumber) => partNumber !== body.partNumber) };
        return responseJson(current);
      }
      if (url.endsWith('/complete')) return url.includes(other.id)
        ? responseJson({ ...otherCurrent, status: 'completed', missingPartNumbers: [] })
        : responseJson({ ...current, status: 'completed', missingPartNumbers: [] });
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const waitUntil = async (predicate: () => boolean) => {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      throw new Error('暂停回归未在限定时间内达到预期。');
    };
    const control = {
      ...progressControl(),
      onTransport: (next: typeof transport) => { if (next) transport = next; },
    };
    const upload = uploadFileWithMultipart(new File(['ab'], 'EP01.mp4'), initial, control);
    await waitUntil(() => putCount === 1 && Boolean(transport) && Boolean(partTwoAuthorizeResolve));
    transport!.pause();
    const otherUpload = uploadFileWithMultipart(new File(['x'], 'EP02.mp4'), other, progressControl());
    await waitUntil(() => otherPutCount === 1);
    expect(otherPutCount).toBe(1);
    firstPutReady = true;
    firstPutResolve(new Response(null, { status: 200, headers: { ETag: 'etag-1' } }));
    secondAuthorizeReady = true;
    partTwoAuthorizeResolve(responseJson({ uploadId: initial.id, objectKey: initial.objectKey, partNumber: 2, authorizationToken: 'redacted', expiresAt: now, uploadRequest: { url: `https://s3.example.test/${initial.id}/2`, method: 'PUT', headers: {} } }));
    await waitUntil(() => current.confirmedParts.some((part) => part.partNumber === 1));
    expect(firstPutSignal?.aborted).toBe(false);
    expect(partOnePutCount).toBe(1);
    expect(calls.filter((call) => call.startsWith('PUT https://s3.example.test/') && call.includes(initial.id))).toHaveLength(1);
    transport!.resume();
    await Promise.all([upload, otherUpload]);
    expect(partOnePutCount).toBe(1);
    expect(calls.filter((call) => call.includes(`/api/uploads/${initial.id}/parts/confirm`))).toHaveLength(2);
  });

  it('单文件最多三个并行 PUT，两个活跃文件共享全局六许可且回执不倒退', async () => {
    expect(MAX_OBJECT_STORAGE_PUTS).toBe(6);
    expect(MAX_MULTIPART_WORKERS_PER_FILE).toBe(3);
    const first = makeSession({ id: 'b4000000-0000-4000-8000-000000000111', sizeBytes: 4, partSizeBytes: 1, totalParts: 4, missingPartNumbers: [1, 2, 3, 4] });
    const second = makeSession({ id: 'b4000000-0000-4000-8000-000000000112', sizeBytes: 4, partSizeBytes: 1, totalParts: 4, missingPartNumbers: [1, 2, 3, 4] });
    const states = new Map([[first.id, first], [second.id, second]]);
    const activeBySession = new Map<string, number>();
    const maxBySession = new Map<string, number>();
    let active = 0;
    let maxActive = 0;
    let gateOpen = false;
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolve) => { releaseGate = () => { gateOpen = true; resolve(); }; });
    const putCalls: string[] = [];
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const id = [...states.keys()].find((candidate) => url.includes(`/api/uploads/${candidate}`));
      if (id && url.endsWith(`/api/uploads/${id}`)) return responseJson(states.get(id));
      if (id && url.endsWith('/parts/authorize')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number };
        return responseJson({ uploadId: id, objectKey: states.get(id)!.objectKey, partNumber: body.partNumber, authorizationToken: 'redacted', expiresAt: now, uploadRequest: { url: `https://s3.example.test/${id}/${body.partNumber}`, method: 'PUT', headers: {} } });
      }
      if (url.startsWith('https://s3.example.test/')) {
        const sessionId = url.split('/')[3]!;
        const current = (activeBySession.get(sessionId) ?? 0) + 1;
        activeBySession.set(sessionId, current);
        maxBySession.set(sessionId, Math.max(maxBySession.get(sessionId) ?? 0, current));
        active += 1;
        maxActive = Math.max(maxActive, active);
        putCalls.push(url);
        if (!gateOpen) await gate;
        active -= 1;
        activeBySession.set(sessionId, current - 1);
        return new Response(null, { status: 200, headers: { ETag: `etag-${url.split('/').at(-1)}` } });
      }
      if (id && url.endsWith('/parts/confirm')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number; sizeBytes: number; etag: string; checksumValue: string };
        const current = states.get(id)!;
        const confirmedParts = [...current.confirmedParts.filter((part) => part.partNumber !== body.partNumber), { partNumber: body.partNumber, sizeBytes: body.sizeBytes, etag: body.etag, checksumValue: body.checksumValue, confirmedAt: now }].sort((left, right) => left.partNumber - right.partNumber);
        states.set(id, { ...current, status: 'uploading', version: current.version + 1, confirmedParts, missingPartNumbers: Array.from({ length: current.totalParts }, (_, index) => index + 1).filter((partNumber) => !confirmedParts.some((part) => part.partNumber === partNumber)) });
        return responseJson(states.get(id));
      }
      if (id && url.endsWith('/complete')) return responseJson({ ...states.get(id), status: 'completed', missingPartNumbers: [] });
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const waitUntil = async (predicate: () => boolean) => {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      throw new Error('并发 PUT 未在限定时间内达到预期。');
    };
    const file = new File(['abcd'], 'EP01.mp4', { type: 'video/mp4' });
    const firstRun = uploadFileWithMultipart(file, first, progressControl());
    const secondRun = uploadFileWithMultipart(file, second, progressControl());
    await waitUntil(() => maxActive === 6);
    expect(maxActive).toBeLessThanOrEqual(MAX_OBJECT_STORAGE_PUTS);
    expect(Math.max(...maxBySession.values())).toBeLessThanOrEqual(MAX_MULTIPART_WORKERS_PER_FILE);
    expect(Math.max(...maxBySession.values())).toBeGreaterThan(1);
    releaseGate();
    await Promise.all([firstRun, secondRun]);
    expect(putCalls.filter((url) => url.includes(first.id)).length).toBeGreaterThan(1);
    expect(putCalls.filter((url) => url.includes(second.id)).length).toBeGreaterThan(1);
    expect(active).toBe(0);
  });

  it('PUT 失败释放全局 permit，等待中的第三文件可以继续取得许可', async () => {
    const first = makeSession({ id: 'b4000000-0000-0000-0000-000000000121', sizeBytes: 4, partSizeBytes: 1, totalParts: 4, missingPartNumbers: [1, 2, 3, 4] }) as UploadSession;
    const second = makeSession({ id: 'b4000000-0000-0000-0000-000000000122', sizeBytes: 4, partSizeBytes: 1, totalParts: 4, missingPartNumbers: [1, 2, 3, 4] }) as UploadSession;
    const third = makeSession({ id: 'b4000000-0000-0000-0000-000000000123', sizeBytes: 1, partSizeBytes: 1, totalParts: 1, missingPartNumbers: [1] }) as UploadSession;
    const states = new Map<string, UploadSession>([[first.id, first], [second.id, second], [third.id, third]]);
    const blocked: Array<{ id: string; resolve: (response: Response) => void }> = [];
    let hold = true;
    let failed = false;
    let thirdPutStarted = false;
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const id = [...states.keys()].find((candidate) => url.includes(candidate));
      if (id && url.endsWith(`/api/uploads/${id}`)) return responseJson(states.get(id));
      if (id && url.endsWith('/parts/authorize')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number };
        return responseJson({ uploadId: id, objectKey: states.get(id)!.objectKey, partNumber: body.partNumber, authorizationToken: 'redacted', expiresAt: now, uploadRequest: { url: `https://s3.example.test/${id}/${body.partNumber}`, method: 'PUT', headers: {} } });
      }
      if (url.startsWith('https://s3.example.test/')) {
        const idPart = url.split('/')[3]!;
        const partNumber = Number(url.split('/')[4]);
        if (idPart === first.id && partNumber === 1 && !failed) {
          failed = true;
          throw new Error('模拟 PUT 失败');
        }
        if (idPart === third.id) {
          thirdPutStarted = true;
          return new Response(null, { status: 200, headers: { ETag: `etag-${partNumber}` } });
        }
        if (hold) return new Promise<Response>((resolve) => { blocked.push({ id: idPart!, resolve }); });
        return new Response(null, { status: 200, headers: { ETag: `etag-${partNumber}` } });
      }
      if (id && url.endsWith('/parts/confirm')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number; sizeBytes: number; etag: string; checksumValue: string };
        const current = states.get(id)!;
        const confirmedParts = [...current.confirmedParts.filter((part) => part.partNumber !== body.partNumber), { partNumber: body.partNumber, sizeBytes: body.sizeBytes, etag: body.etag, checksumValue: body.checksumValue, confirmedAt: now }].sort((left, right) => left.partNumber - right.partNumber);
        states.set(id, { ...current, status: 'uploading', version: current.version + 1, confirmedParts, missingPartNumbers: Array.from({ length: current.totalParts }, (_, index) => index + 1).filter((partNumber) => !confirmedParts.some((part) => part.partNumber === partNumber)) });
        return responseJson(states.get(id));
      }
      if (id && url.endsWith('/complete')) return responseJson({ ...states.get(id), status: 'completed', missingPartNumbers: [] });
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const firstRun = uploadFileWithMultipart(new File(['abcd'], 'EP01.mp4'), first, progressControl());
    const firstOutcome = firstRun.then(() => 'fulfilled' as const, () => 'rejected' as const);
    const secondRun = uploadFileWithMultipart(new File(['abcd'], 'EP02.mp4'), second, progressControl());
    const thirdRun = uploadFileWithMultipart(new File(['x'], 'EP03.srt'), third, progressControl());
    await waitUntil(() => failed && blocked.length === 5, '失败后其余 PUT 未达到占满 permit 的状态。');
    await waitUntil(() => thirdPutStarted, '失败释放 permit 后第三文件未开始 PUT。');
    hold = false;
    blocked.splice(0).forEach(({ resolve }) => resolve(new Response(null, { status: 200, headers: { ETag: 'etag-held' } })));
    const outcomes = await Promise.all([firstOutcome, secondRun, thirdRun]);
    expect(outcomes[0]).toBe('rejected');
    expect(outcomes[1]?.status).toBe('completed');
    expect(outcomes[2]?.status).toBe('completed');
  });

  it('暂停后在途 PUT 自然完成并释放 permit，其他文件可继续', async () => {
    const first = makeSession({ id: 'b4000000-0000-0000-0000-000000000131', sizeBytes: 3, partSizeBytes: 1, totalParts: 3, missingPartNumbers: [1, 2, 3] }) as UploadSession;
    const second = makeSession({ id: 'b4000000-0000-0000-0000-000000000132', sizeBytes: 3, partSizeBytes: 1, totalParts: 3, missingPartNumbers: [1, 2, 3] }) as UploadSession;
    const third = makeSession({ id: 'b4000000-0000-0000-0000-000000000133', sizeBytes: 1, partSizeBytes: 1, totalParts: 1, missingPartNumbers: [1] }) as UploadSession;
    const states = new Map<string, UploadSession>([[first.id, first], [second.id, second], [third.id, third]]);
    const blocked: Array<{ id: string; partNumber: number; resolve: (response: Response) => void }> = [];
    let firstTransport: { pause: () => void; resume: () => void; cancel: () => void } | undefined;
    let thirdPutStarted = false;
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const id = [...states.keys()].find((candidate) => url.includes(candidate));
      if (id && url.endsWith(`/api/uploads/${id}`)) return responseJson(states.get(id));
      if (id && url.endsWith('/parts/authorize')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number };
        return responseJson({ uploadId: id, objectKey: states.get(id)!.objectKey, partNumber: body.partNumber, authorizationToken: 'redacted', expiresAt: now, uploadRequest: { url: `https://s3.example.test/${id}/${body.partNumber}`, method: 'PUT', headers: {} } });
      }
      if (url.startsWith('https://s3.example.test/')) {
        const idPart = url.split('/')[3]!;
        const partNumber = Number(url.split('/')[4]);
        if (idPart === third.id) {
          thirdPutStarted = true;
          return new Response(null, { status: 200, headers: { ETag: `etag-${partNumber}` } });
        }
        return new Promise<Response>((resolve) => { blocked.push({ id: idPart!, partNumber, resolve }); });
      }
      if (id && url.endsWith('/parts/confirm')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number; sizeBytes: number; etag: string; checksumValue: string };
        const current = states.get(id)!;
        const confirmedParts = [...current.confirmedParts.filter((part) => part.partNumber !== body.partNumber), { partNumber: body.partNumber, sizeBytes: body.sizeBytes, etag: body.etag, checksumValue: body.checksumValue, confirmedAt: now }].sort((left, right) => left.partNumber - right.partNumber);
        states.set(id, { ...current, status: 'uploading', version: current.version + 1, confirmedParts, missingPartNumbers: Array.from({ length: current.totalParts }, (_, index) => index + 1).filter((partNumber) => !confirmedParts.some((part) => part.partNumber === partNumber)) });
        return responseJson(states.get(id));
      }
      if (id && url.endsWith('/complete')) return responseJson({ ...states.get(id), status: 'completed', missingPartNumbers: [] });
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const firstControl = {
      ...progressControl(),
      onTransport: (next: typeof firstTransport) => { if (next) firstTransport = next; },
    };
    const firstRun = uploadFileWithMultipart(new File(['abc'], 'EP01.mp4'), first, firstControl);
    const secondRun = uploadFileWithMultipart(new File(['abc'], 'EP02.mp4'), second, progressControl());
    await waitUntil(() => blocked.length === 6 && Boolean(firstTransport), '暂停回归未占满六个 PUT permit。');
    firstTransport!.pause();
    const firstBlocked = blocked.filter(({ id }) => id === first.id);
    firstBlocked.forEach((entry) => {
      blocked.splice(blocked.indexOf(entry), 1);
      entry.resolve(new Response(null, { status: 200, headers: { ETag: `etag-${entry.partNumber}` } }));
    });
    await waitUntil(() => states.get(first.id)!.confirmedParts.length === 3, '暂停中的在途 PUT 未全部确认。');
    const thirdRun = uploadFileWithMultipart(new File(['x'], 'EP03.srt'), third, progressControl());
    await waitUntil(() => thirdPutStarted, '暂停释放 permit 后第三文件未开始 PUT。');
    firstTransport!.resume();
    const secondBlocked = blocked.filter(({ id }) => id === second.id);
    secondBlocked.forEach((entry) => {
      blocked.splice(blocked.indexOf(entry), 1);
      entry.resolve(new Response(null, { status: 200, headers: { ETag: `etag-${entry.partNumber}` } }));
    });
    const outcomes = await Promise.allSettled([firstRun, secondRun, thirdRun]);
    expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(true);
  });

  it('取消会中止在途 PUT 并释放 permit，其他文件可继续', async () => {
    const first = makeSession({ id: 'b4000000-0000-0000-0000-000000000141', sizeBytes: 3, partSizeBytes: 1, totalParts: 3, missingPartNumbers: [1, 2, 3] }) as UploadSession;
    const second = makeSession({ id: 'b4000000-0000-0000-0000-000000000142', sizeBytes: 3, partSizeBytes: 1, totalParts: 3, missingPartNumbers: [1, 2, 3] }) as UploadSession;
    const third = makeSession({ id: 'b4000000-0000-0000-0000-000000000143', sizeBytes: 1, partSizeBytes: 1, totalParts: 1, missingPartNumbers: [1] }) as UploadSession;
    const states = new Map<string, UploadSession>([[first.id, first], [second.id, second], [third.id, third]]);
    const blocked: Array<{ id: string; partNumber: number; resolve: (response: Response) => void; reject: (error: unknown) => void; settled: boolean }> = [];
    let firstTransport: { pause: () => void; resume: () => void; cancel: () => void } | undefined;
    let thirdPutStarted = false;
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const id = [...states.keys()].find((candidate) => url.includes(candidate));
      if (id && url.endsWith(`/api/uploads/${id}`)) return responseJson(states.get(id));
      if (id && url.endsWith('/parts/authorize')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number };
        return responseJson({ uploadId: id, objectKey: states.get(id)!.objectKey, partNumber: body.partNumber, authorizationToken: 'redacted', expiresAt: now, uploadRequest: { url: `https://s3.example.test/${id}/${body.partNumber}`, method: 'PUT', headers: {} } });
      }
      if (url.startsWith('https://s3.example.test/')) {
        const idPart = url.split('/')[3]!;
        const partNumber = Number(url.split('/')[4]);
        if (idPart === third.id) {
          thirdPutStarted = true;
          return new Response(null, { status: 200, headers: { ETag: `etag-${partNumber}` } });
        }
        return new Promise<Response>((resolve, reject) => {
          const entry = { id: idPart!, partNumber, resolve, reject, settled: false };
          blocked.push(entry);
          init?.signal?.addEventListener('abort', () => {
            if (entry.settled) return;
            entry.settled = true;
            entry.reject(new DOMException('已取消', 'AbortError'));
          }, { once: true });
        });
      }
      if (id && url.endsWith('/parts/confirm')) {
        const body = JSON.parse(String(init?.body)) as { partNumber: number; sizeBytes: number; etag: string; checksumValue: string };
        const current = states.get(id)!;
        const confirmedParts = [...current.confirmedParts.filter((part) => part.partNumber !== body.partNumber), { partNumber: body.partNumber, sizeBytes: body.sizeBytes, etag: body.etag, checksumValue: body.checksumValue, confirmedAt: now }].sort((left, right) => left.partNumber - right.partNumber);
        states.set(id, { ...current, status: 'uploading', version: current.version + 1, confirmedParts, missingPartNumbers: Array.from({ length: current.totalParts }, (_, index) => index + 1).filter((partNumber) => !confirmedParts.some((part) => part.partNumber === partNumber)) });
        return responseJson(states.get(id));
      }
      if (id && url.endsWith('/complete')) return responseJson({ ...states.get(id), status: 'completed', missingPartNumbers: [] });
      throw new Error(`未处理请求：${init?.method ?? 'GET'} ${url}`);
    });
    const firstControl = {
      ...progressControl(),
      onTransport: (next: typeof firstTransport) => { if (next) firstTransport = next; },
    };
    const firstRun = uploadFileWithMultipart(new File(['abc'], 'EP01.mp4'), first, firstControl);
    const firstOutcome = firstRun.then(() => 'fulfilled' as const, () => 'rejected' as const);
    const secondRun = uploadFileWithMultipart(new File(['abc'], 'EP02.mp4'), second, progressControl());
    await waitUntil(() => blocked.length === 6 && Boolean(firstTransport), '取消回归未占满六个 PUT permit。');
    firstTransport!.cancel();
    const thirdRun = uploadFileWithMultipart(new File(['x'], 'EP03.srt'), third, progressControl());
    await waitUntil(() => thirdPutStarted, '取消释放 permit 后第三文件未开始 PUT。');
    blocked.filter(({ id }) => id === second.id).forEach((entry) => {
      if (entry.settled) return;
      entry.settled = true;
      entry.resolve(new Response(null, { status: 200, headers: { ETag: `etag-${entry.partNumber}` } }));
    });
    const outcomes = await Promise.all([firstOutcome, secondRun, thirdRun]);
    expect(outcomes[0]).toBe('rejected');
    expect(outcomes[1]?.status).toBe('completed');
    expect(outcomes[2]?.status).toBe('completed');
  });
});
