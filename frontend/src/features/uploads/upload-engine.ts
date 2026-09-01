import type { UploadSession } from '@qimao-terms-cloud/contracts';

import {
  authorizeUploadPart,
  completeUpload,
  confirmUploadPart,
  getUpload,
  UploadApiError,
  type UploadPartAuthorization,
} from './api.js';

/** 与服务端默认策略对齐；实际分片大小以当前 UploadSession 为准。 */
export const MULTIPART_PART_SIZE = 16 * 1024 * 1024;
/** 同时占用文件级队列槽位的物理文件数。 */
export const MAX_ACTIVE_UPLOAD_FILES = 2;
/** 单个物理文件同时运行的 multipart worker 数；每个 worker 一次只占一个 PUT permit。 */
export const MAX_MULTIPART_WORKERS_PER_FILE = 3;
/** 全局对象存储 PUT 许可数；authorize/confirm/complete 不占用。 */
export const MAX_OBJECT_STORAGE_PUTS = 6;

const completionIntents = new Map<string, { key: string; expectedVersion: number }>();
const completionUnknown = new Set<string>();

export interface MultipartTransportController {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

export class UploadCompletionUnknownError extends Error {
  constructor(readonly observedSession: UploadSession | undefined, cause: unknown) {
    super('上传已到达服务端，但完成请求结果未知；已读取最新会话，请人工恢复，不会自动重发完成请求。', { cause });
    this.name = 'UploadCompletionUnknownError';
  }
}

export class UploadTransportUnknownError extends Error {
  constructor(readonly observedSession: UploadSession | undefined, cause: unknown) {
    super('分片传输结果未知；已读取同一上传会话，请人工继续，不会创建第二个上传任务。', { cause });
    this.name = 'UploadTransportUnknownError';
  }
}

export class UploadPartEtagMissingError extends Error {
  constructor() {
    super('对象存储未返回分片 ETag，无法安全确认该分片；请重试当前文件。');
    this.name = 'UploadPartEtagMissingError';
  }
}

/** 新 multipart 会话只允许 COS browser_direct 预签名地址，不能回退到同源 relay。 */
export class UploadBrowserDirectRequiredError extends Error {
  constructor() {
    super('当前上传会话未返回 COS 浏览器直传地址；为避免误走旧 relay，请重新读取上传会话。');
    this.name = 'UploadBrowserDirectRequiredError';
  }
}

export interface UploadEngineControl {
  paused: () => boolean;
  onSession: (session: UploadSession) => void;
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
  onTransport?: (transport: MultipartTransportController | undefined) => void;
  resumeFromExisting?: boolean;
  signal?: AbortSignal;
}

const withAbort = (signal: AbortSignal | undefined) => signal ? { signal } : {};

const isUnknown = (error: unknown) => error instanceof TypeError || (error instanceof UploadApiError && error.retryable);

type PutPermit = () => void;
type PutWaiter = { grant: () => void };
let activeObjectStoragePuts = 0;
const putWaiters: PutWaiter[] = [];

const drainPutWaiters = () => {
  while (activeObjectStoragePuts < MAX_OBJECT_STORAGE_PUTS && putWaiters.length > 0) {
    putWaiters.shift()?.grant();
  }
};

const acquireObjectStoragePut = (signal?: AbortSignal): Promise<PutPermit> => {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException('上传已取消。', 'AbortError'));
  return new Promise<PutPermit>((resolve, reject) => {
    let settled = false;
    let onAbort: (() => void) | undefined;
    const cleanup = () => {
      if (onAbort && signal) signal.removeEventListener('abort', onAbort);
    };
    const grant = () => {
      if (settled) return;
      if (signal?.aborted) {
        settled = true;
        cleanup();
        reject(signal.reason ?? new DOMException('上传已取消。', 'AbortError'));
        return;
      }
      settled = true;
      cleanup();
      activeObjectStoragePuts += 1;
      let released = false;
      resolve(() => {
        if (released) return;
        released = true;
        activeObjectStoragePuts = Math.max(0, activeObjectStoragePuts - 1);
        drainPutWaiters();
      });
    };
    onAbort = () => {
      if (settled) return;
      settled = true;
      const index = putWaiters.findIndex((waiter) => waiter.grant === grant);
      if (index >= 0) putWaiters.splice(index, 1);
      cleanup();
      reject(signal?.reason ?? new DOMException('上传已取消。', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (activeObjectStoragePuts < MAX_OBJECT_STORAGE_PUTS) grant();
    else putWaiters.push({ grant });
  });
};

const PUT_CANCELLED = Symbol('multipart-put-cancelled');

const mergeSessionSnapshots = (current: UploadSession, next: UploadSession) => {
  if (current.id !== next.id) return next;
  const confirmed = new Map(current.confirmedParts.map((part) => [part.partNumber, part]));
  next.confirmedParts.forEach((part) => confirmed.set(part.partNumber, part));
  const totalParts = Math.max(current.totalParts, next.totalParts);
  const confirmedParts = [...confirmed.values()].sort((left, right) => left.partNumber - right.partNumber);
  const base = next.version >= current.version ? next : current;
  return {
    ...base,
    version: Math.max(current.version, next.version),
    totalParts,
    confirmedParts,
    missingPartNumbers: Array.from({ length: totalParts }, (_, index) => index + 1)
      .filter((partNumber) => !confirmed.has(partNumber)),
  };
};

const checksumPart = async (part: Blob) => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('当前浏览器不支持分片校验。');
  const digest = await subtle.digest('SHA-256', await part.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const uploadRequestFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as { error?: {
    code?: string; action?: string; retryable?: boolean; requestId?: string; missingPartNumbers?: number[]; message?: string;
  } };
  return new UploadApiError(
    body.error?.code ?? 'UPLOAD_PART_FAILED',
    body.error?.action ?? 'retry_part_upload',
    body.error?.retryable ?? false,
    body.error?.requestId ?? 'unknown',
    body.error?.missingPartNumbers,
    body.error?.message ?? `分片上传失败（HTTP ${response.status}）`,
  );
};

const putAuthorizedPart = async (
  authorization: UploadPartAuthorization,
  part: Blob,
  signal: AbortSignal | undefined,
) => {
  const request = authorization.uploadRequest;
  if (!request || request.method !== 'PUT') throw new Error('服务端未返回有效的对象存储上传地址。');
  // COS browser_direct 的 authorize 合同返回绝对 HTTPS 预签名 URL。
  // 相对 URL 或旧 /api/local relay 不能被新 multipart 会话消费，避免隐式双轨。
  let target: URL;
  try {
    target = new URL(request.url);
  } catch {
    throw new UploadBrowserDirectRequiredError();
  }
  if (target.protocol !== 'https:' || target.pathname.startsWith('/api/local/uploads/')) {
    throw new UploadBrowserDirectRequiredError();
  }
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    credentials: 'omit',
    body: part,
    ...withAbort(signal),
  });
  if (!response.ok) throw await uploadRequestFailure(response);
  const etag = response.headers.get('ETag') ?? response.headers.get('etag');
  if (!etag) throw new UploadPartEtagMissingError();
  return etag;
};

const waitGate = async (
  isPaused: () => boolean,
  cancelled: () => boolean,
  signal: AbortSignal | undefined,
  waitForResume: () => Promise<void>,
) => {
  while (isPaused() && !cancelled()) await waitForResume();
  if (cancelled() || signal?.aborted) throw signal?.reason ?? new DOMException('上传已取消。', 'AbortError');
};

const confirmedBytes = (session: UploadSession) => session.confirmedParts.reduce((sum, part) => sum + part.sizeBytes, 0);

const partNumbersFor = (session: UploadSession) => {
  const confirmed = new Set(session.confirmedParts.map((part) => part.partNumber));
  return (session.missingPartNumbers.length > 0
    ? session.missingPartNumbers
    : Array.from({ length: session.totalParts }, (_, index) => index + 1))
    .filter((partNumber) => !confirmed.has(partNumber));
};

const completeWithRecovery = async (initial: UploadSession, control: UploadEngineControl) => {
  // complete 返回 202 后会话进入 verifying；后续调度只读同一会话，
  // 由服务端 worker 完成对象校验与 Asset 落账，不能再次 POST complete。
  if (['completed', 'completing', 'verifying'].includes(initial.status)) return initial;
  if (completionUnknown.has(initial.id)) {
    const observed = await getUpload(initial.id, control.signal);
    if (observed.status === 'completed') {
      completionUnknown.delete(initial.id);
      return observed;
    }
    throw new UploadCompletionUnknownError(observed, new Error('此前完成请求结果未知。'));
  }
  const intent = completionIntents.get(initial.id) ?? {
    key: `browser-${initial.id}-complete`,
    expectedVersion: initial.version,
  };
  completionIntents.set(initial.id, intent);
  try {
    const completed = await completeUpload(initial.id, intent.key, { expectedVersion: intent.expectedVersion }, control.signal);
    if (completed.status === 'completed') completionIntents.delete(initial.id);
    return completed;
  } catch (error) {
    if (error instanceof UploadApiError && !error.retryable) throw error;
    const observed = await getUpload(initial.id, control.signal).catch(() => undefined);
    if (observed?.status === 'completed') {
      completionIntents.delete(initial.id);
      return observed;
    }
    completionUnknown.add(initial.id);
    throw new UploadCompletionUnknownError(observed, error);
  }
};

const runMultipartParts = async (file: File, initial: UploadSession, control: UploadEngineControl) => {
  let session = initial;
  let cancelled = false;
  let paused = false;
  let stopScheduling = false;
  const resumeWaiters = new Set<() => void>();
  const waitForResume = () => new Promise<void>((resolve) => { resumeWaiters.add(resolve); });
  const wakeResumeWaiters = () => {
    resumeWaiters.forEach((resolve) => resolve());
    resumeWaiters.clear();
  };
  const lifecycleAbort = new AbortController();
  const activePutControllers = new Set<AbortController>();
  const abortActivePuts = (reason: unknown) => {
    activePutControllers.forEach((controller) => controller.abort(reason));
  };
  const isPaused = () => paused || control.paused();
  const transport: MultipartTransportController = {
    pause: () => {
      if (cancelled) return;
      paused = true;
    },
    resume: () => {
      if (cancelled) return;
      paused = false;
      wakeResumeWaiters();
    },
    cancel: () => {
      cancelled = true;
      paused = false;
      stopScheduling = true;
      lifecycleAbort.abort(PUT_CANCELLED);
      abortActivePuts(PUT_CANCELLED);
      wakeResumeWaiters();
    },
  };
  const abort = () => {
    cancelled = true;
    paused = false;
    stopScheduling = true;
    lifecycleAbort.abort(control.signal?.reason ?? new DOMException('上传已取消。', 'AbortError'));
    abortActivePuts(control.signal?.reason ?? new DOMException('上传已取消。', 'AbortError'));
    wakeResumeWaiters();
  };
  control.signal?.addEventListener('abort', abort, { once: true });
  control.onTransport?.(transport);
  control.onProgress?.(confirmedBytes(session), file.size);
  const pendingParts = partNumbersFor(session);
  const worker = async () => {
    while (!stopScheduling && !cancelled) {
      await waitGate(isPaused, () => cancelled || stopScheduling, control.signal, waitForResume);
      if (stopScheduling || cancelled) return;
      const partNumber = pendingParts.shift();
      if (partNumber === undefined) return;
      try {
        const start = (partNumber - 1) * session.partSizeBytes;
        const end = Math.min(file.size, start + session.partSizeBytes);
        const part = file.slice(start, end);
        const authorization = await authorizeUploadPart(session.id, {
          partNumber,
          fileFingerprint: session.fileFingerprint,
        }, control.signal);
        if (!authorization.uploadRequest) {
          const refreshed = await getUpload(session.id, control.signal);
          session = mergeSessionSnapshots(session, refreshed);
          control.onSession(session);
          if (session.confirmedParts.some((confirmed) => confirmed.partNumber === partNumber)) continue;
          throw new Error('服务端未返回该分片的上传地址。');
        }
        await waitGate(isPaused, () => cancelled || stopScheduling, control.signal, waitForResume);
        if (stopScheduling || cancelled) return;
        const permit = await acquireObjectStoragePut(lifecycleAbort.signal);
        let putController: AbortController | undefined;
        let putAbortForwarder: (() => void) | undefined;
        let etag: string;
        try {
          if (stopScheduling || cancelled) return;
          if (isPaused()) {
            pendingParts.unshift(partNumber);
            continue;
          }
          putController = new AbortController();
          putAbortForwarder = () => putController?.abort(lifecycleAbort.signal.reason);
          lifecycleAbort.signal.addEventListener('abort', putAbortForwarder, { once: true });
          activePutControllers.add(putController);
          etag = await putAuthorizedPart(authorization, part, putController.signal);
        } catch (error) {
          if (putController?.signal.reason === PUT_CANCELLED || cancelled) return;
          stopScheduling = true;
          throw error;
        } finally {
          if (putAbortForwarder) lifecycleAbort.signal.removeEventListener('abort', putAbortForwarder);
          if (putController) activePutControllers.delete(putController);
          permit();
        }
        const checksumValue = await checksumPart(part);
        if (stopScheduling || cancelled) return;
        const nextSession = await confirmUploadPart(session.id, `browser-${session.id}-part-${partNumber}`, {
          partNumber,
          sizeBytes: end - start,
          etag,
          checksumValue,
        }, control.signal);
        session = mergeSessionSnapshots(session, nextSession);
        control.onSession(session);
        control.onProgress?.(confirmedBytes(session), file.size);
      } catch (error) {
        if (cancelled) return;
        stopScheduling = true;
        throw error;
      }
    }
  };
  try {
    const workerCount = Math.min(MAX_MULTIPART_WORKERS_PER_FILE, pendingParts.length);
    const outcomes = await Promise.allSettled(Array.from({ length: workerCount }, () => worker()));
    const failure = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
    if (failure) throw failure.reason;
    if (cancelled) throw new DOMException('上传已取消。', 'AbortError');
    return session;
  } finally {
    control.signal?.removeEventListener('abort', abort);
    lifecycleAbort.abort(PUT_CANCELLED);
    activePutControllers.clear();
    control.onTransport?.(undefined);
  }
};

export const uploadFileWithMultipart = async (file: File, initial: UploadSession, control: UploadEngineControl) => {
  if (initial.status === 'completed') return initial;
  try {
    // create 返回后也读取一次同一业务会话，确保 missingParts/confirmedParts 来自服务端权威快照。
    const recovered = await getUpload(initial.id, control.signal);
    control.onSession(recovered);
    if (['completed', 'completing', 'verifying'].includes(recovered.status)) return recovered;
    if (recovered.transportKind !== 'multipart') throw new Error('该上传会话不是对象存储 multipart 会话，请重新开始当前文件。');
    const uploaded = await runMultipartParts(file, recovered, control);
    if (control.signal?.aborted) return uploaded;
    const latest = await getUpload(uploaded.id, control.signal);
    control.onSession(latest);
    if (['completed', 'completing', 'verifying'].includes(latest.status)) return latest;
    return completeWithRecovery(latest, control);
  } catch (error) {
    if (!isUnknown(error)) throw error;
    const observed = await getUpload(initial.id, control.signal).catch(() => undefined);
    if (observed?.status === 'completed') return observed;
    throw new UploadTransportUnknownError(observed, error);
  }
};
