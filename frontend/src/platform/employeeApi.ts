import type {
  EmployeeAuthLoginBody,
  EmployeeAuthLogout,
  EmployeeAuthSession,
} from '@qimao-terms-cloud/contracts';

export const EMPLOYEE_SESSION_EXPIRED_EVENT = 'qimao:employee-session-expired';

let employeeSessionGeneration = 0;

export const currentEmployeeSessionGeneration = () => employeeSessionGeneration;

export const advanceEmployeeSessionGeneration = () => {
  employeeSessionGeneration += 1;
  return employeeSessionGeneration;
};

interface ApiFailureBody {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    retryable?: boolean;
  };
}

export class EmployeeAuthApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null,
    readonly retryable: boolean,
    message: string,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'EmployeeAuthApiError';
  }
}

const apiFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailureBody;
  const retryAfter = response.headers.get('retry-after');
  const retryAfterSeconds = retryAfter && /^\d+$/.test(retryAfter)
    ? Number.parseInt(retryAfter, 10)
    : null;
  return new EmployeeAuthApiError(
    response.status,
    body.error?.code ?? 'EMPLOYEE_AUTH_REQUEST_FAILED',
    body.error?.requestId ?? response.headers.get('x-request-id'),
    body.error?.retryable ?? response.status >= 500,
    body.error?.message ?? `请求失败（HTTP ${response.status}）`,
    retryAfterSeconds,
  );
};

export const employeeApiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  options: { notifyUnauthorized?: boolean } = {},
) => {
  const requestGeneration = currentEmployeeSessionGeneration();
  const response = await fetch(input, { ...init, credentials: init?.credentials ?? 'same-origin' });
  if (response.status === 401 && options.notifyUnauthorized !== false) {
    window.dispatchEvent(new CustomEvent(EMPLOYEE_SESSION_EXPIRED_EVENT, {
      detail: { generation: requestGeneration },
    }));
  }
  return response;
};

const authRequest = async <T>(url: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await employeeApiFetch(url, init, { notifyUnauthorized: false });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new EmployeeAuthApiError(0, 'EMPLOYEE_AUTH_NETWORK_UNKNOWN', null, true, '网络请求结果未知。');
  }
  if (!response.ok) throw await apiFailure(response);
  return response.json() as Promise<T>;
};

export const readEmployeeSession = (signal?: AbortSignal) =>
  authRequest<EmployeeAuthSession>('/api/employee-auth/session', signal ? { signal } : undefined);

export const loginEmployee = (body: EmployeeAuthLoginBody) => authRequest<EmployeeAuthSession>(
  '/api/employee-auth/login',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  },
);

export const logoutEmployee = () => authRequest<EmployeeAuthLogout>('/api/employee-auth/logout', {
  method: 'POST',
});
