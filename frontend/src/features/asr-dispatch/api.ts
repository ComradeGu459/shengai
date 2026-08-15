import type {
  AsrDispatchGroupDetail,
  AsrDispatchGroupListQuery,
  AsrDispatchGroupSummary,
  AsrEligibilityList,
  AsrProjectEligibilitySearchQuery,
  AsrProjectEligibilitySearchResult,
  CreateAsrDispatchGroupBody,
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

export interface AsrDispatchGroupList {
  items: AsrDispatchGroupSummary[];
  total: number;
}

export class DispatchApiError extends Error {
  constructor(
    readonly code: string,
    readonly action: string,
    readonly requestId: string | null,
    readonly retryable: boolean,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DispatchApiError';
  }
}

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return new DispatchApiError(
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.action ?? 'reload_dispatch',
    body.error?.requestId ?? response.headers.get('x-request-id'),
    body.error?.retryable ?? response.status >= 500,
    response.status,
    body.error?.message ?? `请求失败（HTTP ${response.status}）`,
  );
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) throw await readFailure(response);
  return response.json() as Promise<T>;
};

const withQuery = (path: string, input: Record<string, unknown>) => {
  const query = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.size ? `${path}?${query.toString()}` : path;
};

const command = <T>(url: string, body: unknown, idempotencyKey: string) => request<T>(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'idempotency-key': idempotencyKey,
  },
  body: JSON.stringify(body),
});

export const searchAsrEligibility = (query: AsrProjectEligibilitySearchQuery) =>
  request<AsrProjectEligibilitySearchResult>(withQuery('/api/asr/eligibility', query));

export const checkAsrEligibility = (projectIds: string[]) =>
  request<AsrEligibilityList>('/api/asr/eligibility', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ projectIds }),
  });

export const createAsrDispatchGroup = (
  body: CreateAsrDispatchGroupBody,
  idempotencyKey: string,
) => command<AsrDispatchGroupDetail>('/api/asr/dispatch-groups', body, idempotencyKey);

export const listAsrDispatchGroups = (query: AsrDispatchGroupListQuery) =>
  request<AsrDispatchGroupList>(withQuery('/api/asr/dispatch-groups', query));

export const getAsrDispatchGroup = (groupId: string) =>
  request<AsrDispatchGroupDetail>(`/api/asr/dispatch-groups/${groupId}`);

export const cancelAsrDispatchGroup = (groupId: string, idempotencyKey: string) =>
  command<AsrDispatchGroupDetail>(`/api/asr/dispatch-groups/${groupId}/cancel`, {}, idempotencyKey);
