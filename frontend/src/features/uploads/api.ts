import type {
  AbortUploadBody,
  AuthorizeUploadPartBody,
  CompleteUploadBody,
  ConfirmUploadPartBody,
  CreateUploadBody,
  ProjectMaterialState,
  UploadSession,
} from '@qimao-terms-cloud/contracts';

interface UploadPartAuthorization {
  uploadId: string;
  objectKey: string;
  partNumber: number;
  authorizationToken: string;
  expiresAt: string;
  uploadRequest: { url: string; method: 'PUT'; headers: Record<string, string> } | null;
}

interface UploadedPartReceipt {
  partNumber: number;
  sizeBytes: number;
  etag: string;
  checksumValue: string;
}

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

const command = <T>(url: string, idempotencyKey: string, body: unknown) => jsonRequest<T>(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
  body: JSON.stringify(body),
});

export const getUploadContext = (projectId: string) => Promise.all([
  jsonRequest<ProjectMaterialState>(`/api/projects/${projectId}/material-manifest`),
  jsonRequest<{ items: UploadSession[] }>(`/api/projects/${projectId}/uploads`),
]).then(([materialState, uploads]) => ({ materialState, uploads: uploads.items }));

export const getUpload = (uploadId: string) => jsonRequest<UploadSession>(`/api/uploads/${uploadId}`);

export const createUpload = (projectId: string, idempotencyKey: string, body: CreateUploadBody) =>
  command<UploadSession>(`/api/projects/${projectId}/uploads`, idempotencyKey, body);

export const authorizePart = (uploadId: string, body: AuthorizeUploadPartBody) =>
  jsonRequest<UploadPartAuthorization>(`/api/uploads/${uploadId}/parts/authorize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

export const putPart = async (authorization: UploadPartAuthorization, blob: Blob) => {
  if (!authorization.uploadRequest) {
    throw new UploadApiError(
      'UPLOAD_DIRECT_REQUEST_UNAVAILABLE',
      'contact_admin',
      false,
      'client',
      undefined,
      '当前环境未提供浏览器直传入口。',
    );
  }
  const response = await fetch(authorization.uploadRequest.url, {
    method: authorization.uploadRequest.method,
    headers: authorization.uploadRequest.headers,
    body: blob,
  });
  if (!response.ok) throw await readFailure(response);
  return response.json() as Promise<UploadedPartReceipt>;
};

export const confirmPart = (uploadId: string, idempotencyKey: string, body: ConfirmUploadPartBody) =>
  command<UploadSession>(`/api/uploads/${uploadId}/parts/confirm`, idempotencyKey, body);

export const completeUpload = (uploadId: string, idempotencyKey: string, body: CompleteUploadBody) =>
  command<UploadSession>(`/api/uploads/${uploadId}/complete`, idempotencyKey, body);

export const abortUpload = (uploadId: string, idempotencyKey: string, body: AbortUploadBody) =>
  command<UploadSession>(`/api/uploads/${uploadId}/abort`, idempotencyKey, body);
