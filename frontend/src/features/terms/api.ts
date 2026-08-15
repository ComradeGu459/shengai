import type {
  ActivateTermExportTemplateBody,
  BatchTermDecisionBody,
  CreateManualTermCandidateBody,
  CreateTermDraftBody,
  CreateTermExportBody,
  CreateTermExportTemplateBody,
  PublishTermVersionBody,
  TermCandidate,
  TermCandidateDecisionBody,
  TermCandidateDetail,
  TermCandidateQuery,
  TermCue,
  TermCueQuery,
  TermDraft,
  TermExport,
  TermExportTemplateVersion,
  TermExtractionRun,
  TermSourceState,
  TermVersion,
} from '@qimao-terms-cloud/contracts';

export interface TermVersionSummary {
  id: string;
  projectId: string;
  version: number;
  sourceSrtSetDigest: string;
  promptVersion: string;
  itemCount: number;
  createdAt: string;
}

export interface TermWorkspace {
  source: TermSourceState;
  sourceIsCurrent: boolean;
  activeDraft: TermDraft | null;
  latestRun: TermExtractionRun | null;
  latestVersion: TermVersionSummary | null;
}

export interface TermCandidateList { items: TermCandidate[]; total: number }
export interface TermCueList { items: TermCue[]; total: number }
export interface TermTemplateList {
  activeTemplateVersionId: string;
  items: TermExportTemplateVersion[];
}
export interface TermExportList { items: TermExport[] }
export interface BatchTermDecisionResult {
  items: Array<
    | { candidateId: string; ok: true; candidate: TermCandidate }
    | { candidateId: string; ok: false; error: { code: string; message: string } }
  >;
}

interface ApiFailure {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
    action?: string;
    requestId?: string;
  };
}

export class TermApiError extends Error {
  constructor(
    readonly code: string,
    readonly action: string,
    readonly requestId: string | null,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'TermApiError';
  }
}

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return new TermApiError(
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.action ?? 'retry',
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

const jsonInit = (method: 'POST' | 'PATCH', body: unknown, idempotencyKey?: string): RequestInit => ({
  method,
  headers: {
    'content-type': 'application/json',
    ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
  },
  body: JSON.stringify(body),
});

const withQuery = (path: string, input: Record<string, unknown>) => {
  const query = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return `${path}?${query.toString()}`;
};

export const getTermWorkspace = (projectId: string) =>
  request<TermWorkspace>(`/api/projects/${projectId}/terms`);

export const startTermExtraction = (input: {
  projectId: string;
  expectedSourceSrtSetDigest?: string;
  idempotencyKey: string;
}) => request<{ run: TermExtractionRun; draft: TermDraft | null }>(
  `/api/projects/${input.projectId}/terms/extractions`,
  jsonInit('POST', { expectedSourceSrtSetDigest: input.expectedSourceSrtSetDigest }, input.idempotencyKey),
);

export const listTermCandidates = (projectId: string, query: TermCandidateQuery) =>
  request<TermCandidateList>(withQuery(`/api/projects/${projectId}/terms/candidates`, query));

export const listTermCues = (projectId: string, query: TermCueQuery) =>
  request<TermCueList>(withQuery(`/api/projects/${projectId}/terms/cues`, query));

export const getTermCandidate = (projectId: string, candidateId: string) =>
  request<TermCandidateDetail>(`/api/projects/${projectId}/terms/candidates/${candidateId}`);

export const decideTermCandidate = (input: {
  projectId: string;
  candidateId: string;
  body: TermCandidateDecisionBody;
}) => request<TermCandidate>(
  `/api/projects/${input.projectId}/terms/candidates/${input.candidateId}`,
  jsonInit('PATCH', input.body),
);

export const createManualTermCandidate = (input: {
  projectId: string;
  body: CreateManualTermCandidateBody;
}) => request<TermCandidate>(
  `/api/projects/${input.projectId}/terms/candidates`,
  jsonInit('POST', input.body),
);

export const batchDecideTerms = (projectId: string, body: BatchTermDecisionBody) =>
  request<BatchTermDecisionResult>(
    `/api/projects/${projectId}/terms/candidates/batch-decisions`,
    jsonInit('POST', body),
  );

export const createTermDraft = (input: {
  projectId: string;
  body: CreateTermDraftBody;
  idempotencyKey: string;
}) => request<TermDraft>(
  `/api/projects/${input.projectId}/terms/drafts`,
  jsonInit('POST', input.body, input.idempotencyKey),
);

export const publishTermVersion = (input: {
  projectId: string;
  body: PublishTermVersionBody;
  idempotencyKey: string;
}) => request<{ version: TermVersion; export: TermExport }>(
  `/api/projects/${input.projectId}/terms/releases`,
  jsonInit('POST', input.body, input.idempotencyKey),
);

export const listTermVersions = (projectId: string) =>
  request<{ items: TermVersion[] }>(`/api/projects/${projectId}/terms/versions`);

export const listTermTemplates = () => request<TermTemplateList>('/api/terms/export-templates');

export const createTermTemplate = (body: CreateTermExportTemplateBody, idempotencyKey: string) =>
  request<TermExportTemplateVersion>(
    '/api/terms/export-templates',
    jsonInit('POST', body, idempotencyKey),
  );

export const activateTermTemplate = (
  templateVersionId: string,
  body: ActivateTermExportTemplateBody,
) => request<TermExportTemplateVersion>(
  `/api/terms/export-templates/${templateVersionId}/activate`,
  jsonInit('POST', body),
);

export const createTermExport = (input: {
  projectId: string;
  versionId: string;
  body: CreateTermExportBody;
  idempotencyKey: string;
}) => request<TermExport>(
  `/api/projects/${input.projectId}/terms/versions/${input.versionId}/exports`,
  jsonInit('POST', input.body, input.idempotencyKey),
);

export const listTermExports = (projectId: string, versionId: string) =>
  request<TermExportList>(`/api/projects/${projectId}/terms/versions/${versionId}/exports`);

export const termExportDownloadUrl = (projectId: string, exportId: string) =>
  `/api/projects/${projectId}/terms/exports/${exportId}/export.xlsx`;
