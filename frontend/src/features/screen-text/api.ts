import type {
  ConfirmEmptyScreenTextEpisodeBody,
  CreateManualScreenTextCandidateBody,
  CreateScreenTextBatchBody,
  CreateScreenTextDecisionBody,
  CreateScreenTextReleaseBody,
  RetryScreenTextBatchBody,
  ScreenTextBatch,
  ScreenTextBatchListQuery,
  ScreenTextBatchSummary,
  ScreenTextCandidate,
  ScreenTextCandidateQuery,
  ScreenTextDecisionResult,
  ScreenTextPlaybackGrant,
  ScreenTextRelease,
  ScreenTextReleaseListQuery,
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

export class ScreenTextApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly action: string,
    readonly requestId: string | null,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'ScreenTextApiError';
  }
}

export interface ScreenTextBatchList {
  items: ScreenTextBatchSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface ScreenTextCandidateList {
  items: ScreenTextCandidate[];
  total: number;
  limit: number;
  offset: number;
}

export interface ScreenTextReleaseList {
  items: ScreenTextRelease[];
  total: number;
  limit: number;
  offset: number;
}

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return new ScreenTextApiError(
    response.status,
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.action ?? 'reload_screen_text',
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

const requestBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) throw await readFailure(response);
  return response.blob();
};

const post = <T>(url: string, body: unknown, key?: string) => request<T>(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    ...(key ? { 'idempotency-key': key } : {}),
  },
  body: JSON.stringify(body),
});

const withQuery = (url: string, values: Record<string, unknown>) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.size ? `${url}?${query.toString()}` : url;
};

const root = (projectId: string) => `/api/projects/${projectId}/screen-text`;

export const listScreenTextBatches = (projectId: string, query: ScreenTextBatchListQuery) =>
  request<ScreenTextBatchList>(withQuery(`${root(projectId)}/batches`, query));

export const getScreenTextBatch = (projectId: string, batchId: string) =>
  request<ScreenTextBatch>(`${root(projectId)}/batches/${batchId}`);

export const createScreenTextBatch = (
  projectId: string,
  body: CreateScreenTextBatchBody,
  key: string,
) => post<ScreenTextBatch>(`${root(projectId)}/batches`, body, key);

export const listScreenTextCandidates = (
  projectId: string,
  batchId: string,
  query: ScreenTextCandidateQuery,
) => request<ScreenTextCandidateList>(withQuery(`${root(projectId)}/batches/${batchId}/candidates`, query));

export const getScreenTextCandidateEvidence = (projectId: string, candidateId: string) =>
  requestBlob(`${root(projectId)}/candidates/${candidateId}/evidence`);

export const decideScreenTextCandidate = (
  projectId: string,
  candidateId: string,
  body: CreateScreenTextDecisionBody,
  key: string,
) => post<ScreenTextDecisionResult>(`${root(projectId)}/candidates/${candidateId}/decisions`, body, key);

export const createManualScreenTextCandidate = (
  projectId: string,
  batchId: string,
  episodeNumber: number,
  body: CreateManualScreenTextCandidateBody,
  key: string,
) => post<ScreenTextCandidate>(
  `${root(projectId)}/batches/${batchId}/episodes/${episodeNumber}/candidates`,
  body,
  key,
);

export const confirmEmptyScreenTextEpisode = (
  projectId: string,
  batchId: string,
  episodeNumber: number,
  body: ConfirmEmptyScreenTextEpisodeBody,
  key: string,
) => post<ScreenTextBatch>(
  `${root(projectId)}/batches/${batchId}/episodes/${episodeNumber}/confirm-empty`,
  body,
  key,
);

export const cancelScreenTextBatch = (projectId: string, batchId: string, key: string) =>
  post<ScreenTextBatch>(`${root(projectId)}/batches/${batchId}/cancel`, {}, key);

export const retryScreenTextBatch = (
  projectId: string,
  batchId: string,
  body: RetryScreenTextBatchBody,
  key: string,
) => post<ScreenTextBatch>(`${root(projectId)}/batches/${batchId}/retries`, body, key);

export const listScreenTextReleases = (projectId: string, query: ScreenTextReleaseListQuery) =>
  request<ScreenTextReleaseList>(withQuery(`${root(projectId)}/releases`, query));

export const createScreenTextRelease = (
  projectId: string,
  body: CreateScreenTextReleaseBody,
  key: string,
) => post<ScreenTextRelease>(`${root(projectId)}/releases`, body, key);

export const screenTextExportDownloadUrl = (projectId: string, exportId: string) =>
  `${root(projectId)}/exports/${exportId}/download`;

export const createScreenTextPlaybackGrant = (
  projectId: string,
  candidateId: string,
  expectedBatchRevision: number,
) => post<ScreenTextPlaybackGrant>(`${root(projectId)}/candidates/${candidateId}/playback`, {
  expectedBatchRevision,
});
