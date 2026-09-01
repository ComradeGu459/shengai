import type {
  AcceptanceCue,
  AcceptanceCueOperation,
  AcceptanceEpisode,
  AcceptanceIssue,
  AcceptanceSession,
  AcceptanceSessionDetail,
  ApplyAcceptanceCueCommandBody,
  CreateAcceptanceIssueBody,
  CreateAcceptanceReworkBody,
  CreateAcceptanceSessionBody,
  PassAcceptanceEpisodeBody,
  PassAcceptanceEpisodesBody,
  ResolveAcceptanceIssueBody,
  SelectAcceptanceVideoBody,
  UndoAcceptanceEditBody,
  PreEditRelease,
  ScreenTextRelease,
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

export class SubtitleAcceptanceApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly action: string,
    readonly requestId: string | null,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'SubtitleAcceptanceApiError';
  }
}

export interface AcceptanceEpisodeDetail {
  episode: AcceptanceEpisode;
  cues: AcceptanceCue[];
  issues: AcceptanceIssue[];
}

export interface AcceptanceSessionList {
  items: AcceptanceSession[];
}

export interface AcceptanceEditEvent {
  id: string;
  kind: 'edit' | 'undo' | 'redo' | 'issue' | 'video' | 'pass' | 'bulk_pass';
  reversesEventId: string | null;
  restoresEventId: string | null;
  actor: string;
  createdAt: string;
}

export interface AcceptanceEditEventList {
  items: AcceptanceEditEvent[];
}

export interface AcceptanceCommandResult {
  session: AcceptanceSessionDetail;
  replay: boolean;
}

export interface AcceptanceEpisodeCommandResult {
  episode: AcceptanceEpisodeDetail;
  replay: boolean;
}

export interface AcceptancePassEpisodesResult {
  session: AcceptanceSessionDetail;
  passedEpisodeNumbers: number[];
  blockedEpisodeNumbers: number[];
  replay: boolean;
}

export interface AcceptanceRework {
  id: string;
  sessionId: string;
  episodeNumbers: number[];
  tracks: Array<'dialogue' | 'screen_text'>;
  reason: string;
  createdAt: string;
}

export interface AcceptanceReworkCommandResult {
  rework: AcceptanceRework;
  replay: boolean;
}

export interface AcceptanceRelease {
  id: string;
  projectId: string;
  sessionId: string;
  version: number;
  sourceDigest: string;
  acceptanceDigest: string;
  cueCount: number;
  createdAt: string;
}

export interface AcceptanceReworkList {
  items: AcceptanceRework[];
}

export interface AcceptanceReleaseList {
  items: AcceptanceRelease[];
}

export interface SourceReleaseList<T> {
  items: T[];
}

export interface AcceptancePreflight {
  sessionId: string;
  sessionRevision: number;
  stale: boolean;
  canRelease: boolean;
  eligibleEpisodeNumbers: number[];
  episodes: Array<{
    episodeNumber: number;
    eligible: boolean;
    errorCodes: string[];
    warningCodes: string[];
  }>;
}

export interface AcceptancePlaybackGrant {
  assetId: string;
  episodeNumber: number;
  url: string;
  expiresAt: string;
}

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return new SubtitleAcceptanceApiError(
    response.status,
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.action ?? 'reload_acceptance',
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

const post = <T>(url: string, body: unknown, key?: string) => request<T>(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    ...(key ? { 'idempotency-key': key } : {}),
  },
  body: JSON.stringify(body),
});

const patch = <T>(url: string, body: unknown, key?: string) => request<T>(url, {
  method: 'PATCH',
  headers: {
    'content-type': 'application/json',
    ...(key ? { 'idempotency-key': key } : {}),
  },
  body: JSON.stringify(body),
});

const root = (projectId: string) => `/api/projects/${projectId}/subtitle-acceptance`;
const sessionRoot = (projectId: string, sessionId: string) => `${root(projectId)}/sessions/${sessionId}`;
const episodeRoot = (projectId: string, sessionId: string, episodeNumber: number) =>
  `${sessionRoot(projectId, sessionId)}/episodes/${episodeNumber}`;

export const listAcceptanceSessions = (projectId: string) =>
  request<AcceptanceSessionList>(`${root(projectId)}/sessions`);

export const createAcceptanceSession = (
  projectId: string,
  body: CreateAcceptanceSessionBody,
  key: string,
) => post<AcceptanceCommandResult>(`${root(projectId)}/sessions`, body, key);

export const getAcceptanceSession = (projectId: string, sessionId: string) =>
  request<AcceptanceSessionDetail>(sessionRoot(projectId, sessionId));

export const getAcceptanceEpisode = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
) => request<AcceptanceEpisodeDetail>(episodeRoot(projectId, sessionId, episodeNumber));

export const listAcceptanceEvents = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
) => request<AcceptanceEditEventList>(`${episodeRoot(projectId, sessionId, episodeNumber)}/events`);

export const applyAcceptanceCueCommand = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
  body: ApplyAcceptanceCueCommandBody,
  key: string,
) => post<AcceptanceEpisodeCommandResult>(
  `${episodeRoot(projectId, sessionId, episodeNumber)}/cues`,
  body,
  key,
);

export const applyCueOperations = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
  expectedSessionRevision: number,
  expectedEpisodeRevision: number,
  operations: AcceptanceCueOperation[],
  key: string,
) => applyAcceptanceCueCommand(projectId, sessionId, episodeNumber, {
  expectedSessionRevision,
  expectedEpisodeRevision,
  operations,
}, key);

export const undoAcceptanceEdit = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
  body: UndoAcceptanceEditBody,
  key: string,
) => post<AcceptanceEpisodeCommandResult>(`${episodeRoot(projectId, sessionId, episodeNumber)}/undo`, body, key);

export const redoAcceptanceEdit = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
  body: UndoAcceptanceEditBody,
  key: string,
) => post<AcceptanceEpisodeCommandResult>(`${episodeRoot(projectId, sessionId, episodeNumber)}/redo`, body, key);

export const createAcceptanceIssue = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
  body: CreateAcceptanceIssueBody,
  key: string,
) => post<AcceptanceEpisodeCommandResult>(`${episodeRoot(projectId, sessionId, episodeNumber)}/issues`, body, key);

export const resolveAcceptanceIssue = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
  issueId: string,
  body: ResolveAcceptanceIssueBody,
  key: string,
) => patch<AcceptanceEpisodeCommandResult>(
  `${episodeRoot(projectId, sessionId, episodeNumber)}/issues/${issueId}`,
  body,
  key,
);

export const selectAcceptanceVideo = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
  body: SelectAcceptanceVideoBody,
  key: string,
) => post<AcceptanceEpisodeCommandResult>(`${episodeRoot(projectId, sessionId, episodeNumber)}/video`, body, key);

export const getAcceptancePreflight = (projectId: string, sessionId: string) =>
  request<AcceptancePreflight>(`${sessionRoot(projectId, sessionId)}/preflight`);

export const passAcceptanceEpisode = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
  body: PassAcceptanceEpisodeBody,
  key: string,
) => post<AcceptancePassEpisodesResult>(`${episodeRoot(projectId, sessionId, episodeNumber)}/pass`, body, key);

export const passEligibleAcceptanceEpisodes = (
  projectId: string,
  sessionId: string,
  body: PassAcceptanceEpisodesBody,
  key: string,
) => post<AcceptancePassEpisodesResult>(`${sessionRoot(projectId, sessionId)}/pass-eligible`, body, key);

export const createAcceptanceRework = (
  projectId: string,
  sessionId: string,
  body: CreateAcceptanceReworkBody,
  key: string,
) => post<AcceptanceReworkCommandResult>(`${sessionRoot(projectId, sessionId)}/rework`, body, key);

export const listAcceptanceRework = (projectId: string, sessionId: string) =>
  request<AcceptanceReworkList>(`${sessionRoot(projectId, sessionId)}/rework`);

export const listAcceptanceReleases = (projectId: string) =>
  request<AcceptanceReleaseList>(`${root(projectId)}/releases`);

export const createAcceptancePlaybackGrant = (
  projectId: string,
  sessionId: string,
  episodeNumber: number,
  body: { expectedSessionRevision: number },
) => post<AcceptancePlaybackGrant>(`${episodeRoot(projectId, sessionId, episodeNumber)}/playback`, body);

export const listPreEditSourceReleases = (projectId: string) =>
  request<SourceReleaseList<PreEditRelease>>(`/api/projects/${projectId}/pre-review/releases`);

export const listScreenTextSourceReleases = (projectId: string) =>
  request<SourceReleaseList<ScreenTextRelease>>(`/api/projects/${projectId}/screen-text/releases`);
