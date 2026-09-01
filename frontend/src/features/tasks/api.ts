import type { TaskDetail, TaskList, TaskListQuery } from '@qimao-terms-cloud/contracts';
import { employeeApiFetch } from '../../platform/employeeApi.js';

interface ApiFailure {
  error?: { code?: string; message?: string; action?: string; requestId?: string; retryable?: boolean };
}

export class TaskApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly action: string,
    readonly requestId: string | null,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'TaskApiError';
  }
}

const failure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return new TaskApiError(
    response.status,
    body.error?.code ?? 'TASK_REQUEST_FAILED',
    body.error?.action ?? 'reload_tasks',
    body.error?.requestId ?? response.headers.get('x-request-id'),
    body.error?.retryable ?? response.status >= 500,
    body.error?.message ?? `请求失败（HTTP ${response.status}）`,
  );
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await employeeApiFetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new TaskApiError(0, 'TASK_NETWORK_UNKNOWN', 'reload_tasks', null, true, '网络请求结果未知，请查询同一任务。');
  }
  if (!response.ok) throw await failure(response);
  return response.json() as Promise<T>;
};

const queryString = (query: TaskListQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : '';
};

export const listTasks = (query: TaskListQuery, signal?: AbortSignal) =>
  request<TaskList>(`/api/tasks${queryString(query)}`, signal ? { signal } : undefined);

export const getTask = (taskType: string, resourceId: string, signal?: AbortSignal) =>
  request<TaskDetail>(`/api/tasks/${encodeURIComponent(taskType)}/${encodeURIComponent(resourceId)}`, signal ? { signal } : undefined);
