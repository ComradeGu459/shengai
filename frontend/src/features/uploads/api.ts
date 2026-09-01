import type {
  AbortUploadBody,
  AuthorizeUploadPartBody,
  CompleteUploadBody,
  ConfirmUploadPartBody,
  CreateUploadBody,
  ProjectMaterialState,
  UploadCreateCommandResult,
  UploadSession,
} from '@qimao-terms-cloud/contracts';

interface ApiFailureBody {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
    action?: string;
    requestId?: string;
    missingPartNumbers?: number[];
  };
}

export class UploadApiError extends Error {
  constructor(
    readonly code: string,
    readonly action: string,
    readonly retryable: boolean,
    readonly requestId: string,
    readonly missingPartNumbers: number[] | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'UploadApiError';
  }
}

export const CREATE_UPLOAD_TIMEOUT_MS = 30_000;

const composeTimeoutSignal = (signal: AbortSignal | undefined, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException('创建上传任务超时。', 'TimeoutError'));
  }, timeoutMs);
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener('abort', forwardAbort, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forwardAbort);
    },
  };
};

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailureBody;
  return new UploadApiError(
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.action ?? 'retry',
    body.error?.retryable ?? false,
    body.error?.requestId ?? 'unknown',
    body.error?.missingPartNumbers,
    body.error?.message ?? `请求失败（HTTP ${response.status}）`,
  );
};

const jsonRequest = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) throw await readFailure(response);
  return response.json() as Promise<T>;
};

const withSignal = (signal?: AbortSignal) => signal ? { signal } : {};

const command = <T>(url: string, idempotencyKey: string, body: unknown, signal?: AbortSignal) => jsonRequest<T>(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
  body: JSON.stringify(body),
  ...withSignal(signal),
});

export const getUploadContext = (projectId: string) => Promise.all([
  jsonRequest<ProjectMaterialState>(`/api/projects/${projectId}/material-manifest`),
  jsonRequest<{ items: UploadSession[] }>(`/api/projects/${projectId}/uploads`),
]).then(([materialState, uploads]) => ({ materialState, uploads: uploads.items }));

export const getUpload = (uploadId: string, signal?: AbortSignal) =>
  jsonRequest<UploadSession>(`/api/uploads/${uploadId}`, withSignal(signal));

export interface UploadPartAuthorization {
  uploadId: string;
  objectKey: string;
  partNumber: number;
  authorizationToken: string;
  expiresAt: string;
  uploadRequest: {
    url: string;
    method: 'PUT';
    headers: Record<string, string>;
  } | null;
}

export interface UploadedPartReceipt {
  partNumber: number;
  sizeBytes: number;
  etag: string;
  checksumValue: string;
}

export const authorizeUploadPart = (
  uploadId: string,
  body: AuthorizeUploadPartBody,
  signal?: AbortSignal,
) => jsonRequest<UploadPartAuthorization>(`/api/uploads/${uploadId}/parts/authorize`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
  ...withSignal(signal),
});

export const confirmUploadPart = (
  uploadId: string,
  idempotencyKey: string,
  body: ConfirmUploadPartBody,
  signal?: AbortSignal,
) => command<UploadSession>(`/api/uploads/${uploadId}/parts/confirm`, idempotencyKey, body, signal);

export const createUpload = (projectId: string, idempotencyKey: string, body: CreateUploadBody, signal?: AbortSignal) => {
  const bounded = composeTimeoutSignal(signal, CREATE_UPLOAD_TIMEOUT_MS);
  return command<UploadSession>(`/api/projects/${projectId}/uploads`, idempotencyKey, body, bounded.signal)
    .finally(bounded.cleanup);
};

export const getUploadCreateCommand = (projectId: string, commandId: string) =>
  jsonRequest<UploadCreateCommandResult>(`/api/projects/${projectId}/uploads/commands/${commandId}`);

export const completeUpload = (uploadId: string, idempotencyKey: string, body: CompleteUploadBody, signal?: AbortSignal) =>
  command<UploadSession>(`/api/uploads/${uploadId}/complete`, idempotencyKey, body, signal);

export const abortUpload = (uploadId: string, idempotencyKey: string, body: AbortUploadBody) =>
  command<UploadSession>(`/api/uploads/${uploadId}/abort`, idempotencyKey, body);
