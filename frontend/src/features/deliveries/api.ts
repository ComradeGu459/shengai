import type {
  CreateDeliveryBody,
  DeliveryCommandResult,
  DeliveryConfirmation,
  DeliveryListQuery,
  DeliveryProductDetail,
  RecoverDeliveryBody,
  UpdateDeliveryMetadataBody,
  DeliveryProduct,
} from '@qimao-terms-cloud/contracts';

export interface DeliveryListResponse {
  items: DeliveryProduct[];
  total: number;
  limit: number;
  offset: number;
}

interface ApiFailure {
  error?: {
    code?: string;
    message?: string;
    action?: string;
    requestId?: string;
    retryable?: boolean;
  };
}

export class DeliveryApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly action: string,
    readonly requestId: string | null,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'DeliveryApiError';
  }
}

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return new DeliveryApiError(
    response.status,
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.action ?? 'reload_delivery',
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

const post = <T>(url: string, body: unknown, key: string) => request<T>(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'idempotency-key': key },
  body: JSON.stringify(body),
});

const patch = <T>(url: string, body: unknown, key: string) => request<T>(url, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json', 'idempotency-key': key },
  body: JSON.stringify(body),
});

const projectRoot = (projectId: string) => `/api/projects/${projectId}/deliveries`;

const queryString = (query: DeliveryListQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return params.toString();
};

export const getDeliveryConfirmation = (projectId: string, sessionId: string) =>
  request<DeliveryConfirmation>(`${projectRoot(projectId)}/confirm?sessionId=${encodeURIComponent(sessionId)}`);

export const createDelivery = (projectId: string, body: CreateDeliveryBody, key: string) =>
  post<DeliveryCommandResult>(projectRoot(projectId), body, key);

export const recoverDelivery = (projectId: string, deliveryId: string, body: RecoverDeliveryBody, key: string) =>
  post<DeliveryCommandResult>(`${projectRoot(projectId)}/${deliveryId}/recover`, body, key);

export const getProjectDelivery = (projectId: string, deliveryId: string) =>
  request<DeliveryProductDetail>(`${projectRoot(projectId)}/${deliveryId}`);

export const getDelivery = (deliveryId: string) =>
  request<DeliveryProductDetail>(`/api/deliveries/${deliveryId}`);

export const listDeliveries = (query: DeliveryListQuery) => {
  const suffix = queryString(query);
  return request<DeliveryListResponse>(`/api/deliveries${suffix ? `?${suffix}` : ''}`);
};

export const updateDeliveryMetadata = (
  deliveryId: string,
  body: UpdateDeliveryMetadataBody,
  key: string,
) => patch<DeliveryProductDetail>(`/api/deliveries/${deliveryId}`, body, key);

export const deliveryFileUrl = (deliveryId: string, fileId: string) =>
  `/api/deliveries/${deliveryId}/files/${fileId}`;
