import type {
  SystemControlConnectionTest,
  SystemControlConnectionTestList,
  SystemControlCreateConnectionTestBody,
  SystemControlCreateEngineDeploymentBody,
  SystemControlCreateEngineVersionBody,
  SystemControlCreateRoutingPolicyBody,
  SystemControlEngineDetail,
  SystemControlEngineDeploymentVersion,
  SystemControlEngineStatus,
  SystemControlEngineStatusCommand,
  SystemControlEngineStatusCommandBody,
  SystemControlEngineList,
  SystemControlEngineVersionList,
  SystemControlRoutingAuditList,
  SystemControlRoutingCommand,
  SystemControlRoutingList,
  SystemControlRoutingPolicyVersion,
} from '@qimao-terms-cloud/contracts';

export class ControlApiError extends Error {
  readonly requestId: string | null;
  readonly code: string | null;
  readonly retryable: boolean;
  readonly action: string | null;
  readonly status: number;
  constructor(message: string, details: { requestId?: string | null; code?: string | null; retryable?: boolean; action?: string | null; status?: number } = {}) {
    super(message);
    this.name = 'ControlApiError';
    this.requestId = details.requestId ?? null;
    this.code = details.code ?? null;
    this.retryable = details.retryable ?? false;
    this.action = details.action ?? null;
    this.status = details.status ?? 0;
  }
}

export const isUnknownResult = (error: unknown) => error instanceof ControlApiError && (error.status === 0 || error.retryable);
export const isDeterministicConflict = (error: unknown) => error instanceof ControlApiError && error.status >= 400 && error.status < 500 && !error.retryable;

const parseError = async (response: Response) => {
  let body: any = null;
  try { body = await response.json(); } catch { /* 非 JSON 失败保持诚实 */ }
  const error = body?.error ?? body;
  return new ControlApiError(error?.message ?? `请求失败（${response.status}）`, {
    requestId: error?.requestId ?? response.headers.get('x-request-id'), code: error?.code,
    retryable: Boolean(error?.retryable), action: error?.action, status: response.status,
  });
};

const rethrowTransportError = (error: unknown): never => {
  if (error instanceof ControlApiError) throw error;
  if (error instanceof Error && error.name === 'AbortError') throw error;
  throw new ControlApiError(error instanceof Error ? error.message : '网络请求失败。', { retryable: true, status: 0 });
};

export const apiGet = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  try {
    const response = await fetch(path, signal ? { method: 'GET', headers: { Accept: 'application/json' }, signal } : { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) throw await parseError(response);
    return await response.json() as T;
  } catch (error) {
    return rethrowTransportError(error);
  }
};

export const apiPost = async <T>(path: string, body: unknown, idempotencyKey: string): Promise<T> => {
  try {
    const response = await fetch(path, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body) });
    if (!response.ok) throw await parseError(response);
    return await response.json() as T;
  } catch (error) {
    return rethrowTransportError(error);
  }
};

export const createStableId = () => {
  const id = globalThis.crypto?.randomUUID?.();
  if (!id) throw new Error('当前浏览器不支持稳定 UUID，未生成管理命令');
  return id;
};

export const listEngines = (query = '', signal?: AbortSignal) => apiGet<SystemControlEngineList>(`/api/system-control/engines${query ? `?${query}` : ''}`, signal);
export const getEngine = (id: string, signal?: AbortSignal) => apiGet<SystemControlEngineDetail>(`/api/system-control/engines/${id}`, signal);
export const listVersions = (id: string, query = 'limit=20&offset=0', signal?: AbortSignal) => apiGet<SystemControlEngineVersionList>(`/api/system-control/engines/${id}/versions?${query}`, signal);
export const getVersion = (deploymentId: string, versionId: string, signal?: AbortSignal) => apiGet<SystemControlEngineDeploymentVersion>(`/api/system-control/engines/${deploymentId}/versions/${versionId}`, signal);
export const listTests = (query: string, signal?: AbortSignal) => apiGet<SystemControlConnectionTestList>(`/api/system-control/engine-connection-tests?${query}`, signal);
export const getTest = (id: string, signal?: AbortSignal) => apiGet<SystemControlConnectionTest>(`/api/system-control/engine-connection-tests/${id}`, signal);
export const createEngine = (body: SystemControlCreateEngineDeploymentBody, key: string) => apiPost<SystemControlEngineDetail>('/api/system-control/engines', body, key);
export const createVersion = (deploymentId: string, body: SystemControlCreateEngineVersionBody, key: string) => apiPost<SystemControlEngineDeploymentVersion>(`/api/system-control/engines/${deploymentId}/versions`, body, key);
export const createTest = (body: SystemControlCreateConnectionTestBody, key: string) => apiPost<SystemControlConnectionTest>('/api/system-control/engine-connection-tests', body, key);
export const setEngineStatus = (deploymentId: string, body: SystemControlEngineStatusCommandBody, key: string) => apiPost<SystemControlEngineStatusCommand>(`/api/system-control/engines/${deploymentId}/status`, body, key);
export const getEngineStatusCommand = (statusCommandId: string, signal?: AbortSignal) => apiGet<SystemControlEngineStatusCommand>(`/api/system-control/engine-status-commands/${statusCommandId}`, signal);

export const listRouting = (query = '', signal?: AbortSignal) => apiGet<SystemControlRoutingList>(`/api/system-control/routing${query ? `?${query}` : ''}`, signal);
export const listAudit = (query = '', signal?: AbortSignal) => apiGet<SystemControlRoutingAuditList>(`/api/system-control/routing-audit-events${query ? `?${query}` : ''}`, signal);
export const getRouting = (id: string, signal?: AbortSignal) => apiGet<SystemControlRoutingPolicyVersion>(`/api/system-control/routing/${id}`, signal);
export const getRoutingCommand = (id: string, signal?: AbortSignal) => apiGet<SystemControlRoutingCommand>(`/api/system-control/routing-commands/${id}`, signal);
export const createRouting = (body: SystemControlCreateRoutingPolicyBody, key: string) => apiPost<SystemControlRoutingPolicyVersion>('/api/system-control/routing', body, key);
export const transitionRouting = (id: string, action: 'test' | 'impact-check' | 'approve', key: string) => apiPost<SystemControlRoutingPolicyVersion>(`/api/system-control/routing/${id}/${action}`, {}, key);
export const publishRouting = (id: string, releaseCommandId: string, key: string) => apiPost<SystemControlRoutingPolicyVersion>(`/api/system-control/routing/${id}/publish`, { releaseCommandId }, key);
export const rollbackRouting = (id: string, releaseCommandId: string, targetRoutingVersionId: string, key: string) => apiPost<SystemControlRoutingPolicyVersion>(`/api/system-control/routing/${id}/rollback`, { releaseCommandId, targetRoutingVersionId }, key);
