import type {
  ApplyPreEditPolicyBody,
  CompletePreEditEpisodeBody,
  CreatePreEditDecisionBody,
  CreatePreEditReleaseBody,
  CreatePreEditSessionBody,
  PreEditEpisode,
  PreEditItem,
  PreEditItemQuery,
  PreEditRelease,
  PreEditSession,
  PreEditSessionDetail,
  RetryPreEditPreparationBody,
  UndoPreEditDecisionBody,
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

export class PreReviewApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly action: string,
    readonly requestId: string | null,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'PreReviewApiError';
  }
}

export interface PreEditSessionList { items: PreEditSession[]; total: number }
export interface PreEditItemList { items: PreEditItem[]; total: number }
export interface PreEditReleaseList { items: PreEditRelease[] }
export interface SessionCommandResult { session: PreEditSessionDetail; replay: boolean }
export interface ItemCommandResult { item: PreEditItem; replay: boolean }
export interface EpisodeCommandResult { episode: PreEditEpisode; replay: boolean }
export interface ReleaseCommandResult { release: PreEditRelease; replay: boolean }
export interface PolicyPreview {
  sessionId: string;
  sessionRevision: number;
  scope: ApplyPreEditPolicyBody['scope'];
  policy: ApplyPreEditPolicyBody['policy'];
  affectedItemCount: number;
  safeUpdateCount: number;
  protectedHumanDecisionCount: number;
  requiresHumanDecisionCount: number;
}
export interface PolicyResult {
  session: PreEditSession;
  affectedItemCount: number;
  systemDecisionCount: number;
  protectedHumanDecisionCount: number;
  safeUpdateCount: number;
  requiresHumanDecisionCount: number;
  replay: boolean;
}
export interface PlaybackGrant {
  assetId: string;
  episodeNumber: number;
  url: string;
  expiresAt: string;
  seek: { startMs: number; contextEndMs: number };
}

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return new PreReviewApiError(
    response.status,
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.action ?? 'reload_pre_edit',
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

const post = <T>(url: string, body: unknown, idempotencyKey?: string) => request<T>(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
  },
  body: JSON.stringify(body),
});

const withQuery = (url: string, query: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  return search.size ? `${url}?${search.toString()}` : url;
};

const sessionPath = (projectId: string, sessionId: string) =>
  `/api/projects/${projectId}/pre-review/sessions/${sessionId}`;

export const listPreEditSessions = (projectId: string) =>
  request<PreEditSessionList>(`/api/projects/${projectId}/pre-review/sessions`);

export const getPreEditSession = (projectId: string, sessionId: string) =>
  request<PreEditSessionDetail>(sessionPath(projectId, sessionId));

export const createPreEditSession = (
  projectId: string,
  body: CreatePreEditSessionBody,
  key: string,
) => post<SessionCommandResult>(`/api/projects/${projectId}/pre-review/sessions`, body, key);

export const retryPreEditPreparation = (
  projectId: string,
  sessionId: string,
  body: RetryPreEditPreparationBody,
  key: string,
) => post<SessionCommandResult>(`${sessionPath(projectId, sessionId)}/retry-preparation`, body, key);

export const listPreEditItems = (
  projectId: string,
  sessionId: string,
  query: PreEditItemQuery,
) => request<PreEditItemList>(withQuery(`${sessionPath(projectId, sessionId)}/items`, query));

export const previewPreEditPolicy = (
  projectId: string,
  sessionId: string,
  body: ApplyPreEditPolicyBody,
) => post<PolicyPreview>(`${sessionPath(projectId, sessionId)}/policy/preview`, body);

export const applyPreEditPolicy = (
  projectId: string,
  sessionId: string,
  body: ApplyPreEditPolicyBody,
  key: string,
) => post<PolicyResult>(`${sessionPath(projectId, sessionId)}/policy`, body, key);

export const createPreEditDecision = (
  projectId: string,
  sessionId: string,
  itemId: string,
  body: CreatePreEditDecisionBody,
  key: string,
) => post<ItemCommandResult>(`${sessionPath(projectId, sessionId)}/items/${itemId}/decisions`, body, key);

export const undoPreEditDecision = (
  projectId: string,
  sessionId: string,
  itemId: string,
  body: UndoPreEditDecisionBody,
  key: string,
) => post<ItemCommandResult>(`${sessionPath(projectId, sessionId)}/items/${itemId}/undo`, body, key);

export const completePreEditEpisode = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
  body: CompletePreEditEpisodeBody,
  key: string,
) => post<EpisodeCommandResult>(
  `${sessionPath(projectId, sessionId)}/episodes/${episodeNumber}/complete`,
  body,
  key,
);

export const listPreEditReleases = (projectId: string) =>
  request<PreEditReleaseList>(`/api/projects/${projectId}/pre-review/releases`);

export const createPreEditRelease = (
  projectId: string,
  sessionId: string,
  body: CreatePreEditReleaseBody,
  key: string,
) => post<ReleaseCommandResult>(`${sessionPath(projectId, sessionId)}/releases`, body, key);

export const createPreEditPlaybackGrant = (
  projectId: string,
  sessionId: string,
  itemId: string,
  expectedSessionRevision: number,
) => post<PlaybackGrant>(`${sessionPath(projectId, sessionId)}/items/${itemId}/playback`, {
  expectedSessionRevision,
});
