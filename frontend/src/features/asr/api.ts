import type {
  AsrBatchDetail,
  AsrBatchHotwordEvidence,
  AsrBatchListQuery,
  AsrBatchPreparation,
  AsrBatchSummary,
  AsrBatchStatus,
  CreateAsrBatchBody,
  RetryAsrBatchBody,
} from '@qimao-terms-cloud/contracts';

interface ApiFailure {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
    action?: string;
    requestId?: string;
  };
}

export interface AsrBatchList {
  items: AsrBatchSummary[];
  total: number;
}

export class AsrApiError extends Error {
  constructor(
    readonly code: string,
    readonly action: string,
    readonly requestId: string | null,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'AsrApiError';
  }
}

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return new AsrApiError(
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.action ?? 'reload_asr',
    body.error?.requestId ?? response.headers.get('x-request-id'),
    body.error?.retryable ?? response.status >= 500,
    body.error?.message ?? `请求失败（HTTP ${response.status}）`,
  );
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) throw await readFailure(response);
  return response.json() as Promise<T>;
};

const command = <T>(url: string, body: unknown, idempotencyKey: string) => request<T>(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'idempotency-key': idempotencyKey,
  },
  body: JSON.stringify(body),
});

const withQuery = (path: string, input: Record<string, unknown>) => {
  const query = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.size ? `${path}?${query.toString()}` : path;
};

export const listAsrBatches = (projectId: string, query: AsrBatchListQuery) =>
  request<AsrBatchList>(withQuery(`/api/projects/${projectId}/asr/batches`, query));

export const getAsrBatch = (projectId: string, batchId: string) =>
  request<AsrBatchDetail>(`/api/projects/${projectId}/asr/batches/${batchId}`);

export const prepareAsrBatch = (
  projectId: string,
  termVersionId: string,
  forceNewRecognition: boolean,
) => request<AsrBatchPreparation>(withQuery(`/api/projects/${projectId}/asr/batch-preparation`, {
  termVersionId,
  forceNewRecognition,
}));

export const getAsrBatchHotwords = (projectId: string, batchId: string) =>
  request<AsrBatchHotwordEvidence>(`/api/projects/${projectId}/asr/batches/${batchId}/hotwords`);

export const createAsrBatch = (
  projectId: string,
  body: CreateAsrBatchBody,
  idempotencyKey: string,
) => command<AsrBatchDetail>(`/api/projects/${projectId}/asr/batches`, body, idempotencyKey);

export const cancelAsrBatch = (projectId: string, batchId: string, idempotencyKey: string) =>
  command<AsrBatchDetail>(`/api/projects/${projectId}/asr/batches/${batchId}/cancel`, {}, idempotencyKey);

export const retryAsrBatch = (
  projectId: string,
  batchId: string,
  body: RetryAsrBatchBody,
  idempotencyKey: string,
) => command<AsrBatchDetail>(`/api/projects/${projectId}/asr/batches/${batchId}/retries`, body, idempotencyKey);

export const activeAsrBatchStatuses = new Set<AsrBatchStatus>([
  'queued', 'running', 'cancel_requested',
]);
