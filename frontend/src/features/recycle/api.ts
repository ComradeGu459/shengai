import type {
  CleanupJobStatus,
  RecycleBinList,
  RecycleBinQuery,
  RecycleProjectCommandResult,
  RestoreProjectCommandResult,
} from '@qimao-terms-cloud/contracts';

interface ApiFailure {
  error?: {
    message?: string;
    requestId?: string;
    retryable?: boolean;
  };
}

type SortDirection = NonNullable<RecycleBinQuery['sortDirection']>;
type SortBy = NonNullable<RecycleBinQuery['sortBy']>;

export interface RecycleBinFilters {
  search: string;
  lifecycleStatus: RecycleBinQuery['lifecycleStatus'] | '';
  cleanupJobStatus: CleanupJobStatus | '';
  sortBy: SortBy;
  sortDirection: SortDirection;
}

export class RecycleApiError extends Error {
  constructor(
    message: string,
    readonly requestId?: string,
    readonly resultUnknown = false,
  ) {
    super(message);
    this.name = 'RecycleApiError';
  }
}

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return new RecycleApiError(
    body.error?.message ?? `请求失败（HTTP ${response.status}）`,
    body.error?.requestId,
    response.status >= 500 || body.error?.retryable === true,
  );
};

const lifecycleCommand = async <T>(
  projectId: string,
  action: 'recycle' | 'restore',
  expectedVersion: number,
  idempotencyKey: string,
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`/api/projects/${projectId}/${action}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({ expectedVersion }),
    });
  } catch (error) {
    throw new RecycleApiError(
      error instanceof Error ? error.message : '网络连接失败，请重试。',
      undefined,
      true,
    );
  }
  if (!response.ok) throw await readFailure(response);
  return response.json() as Promise<T>;
};

export const recycleProject = (
  projectId: string,
  expectedVersion: number,
  idempotencyKey: string,
) => lifecycleCommand<RecycleProjectCommandResult>(projectId, 'recycle', expectedVersion, idempotencyKey);

export const restoreProject = (
  projectId: string,
  expectedVersion: number,
  idempotencyKey: string,
) => lifecycleCommand<RestoreProjectCommandResult>(projectId, 'restore', expectedVersion, idempotencyKey);

export const listRecycleBin = async (filters: RecycleBinFilters): Promise<RecycleBinList> => {
  const query = new URLSearchParams({
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
    limit: '100',
    offset: '0',
  });
  if (filters.search.trim()) query.set('search', filters.search.trim());
  if (filters.lifecycleStatus) query.set('lifecycleStatus', filters.lifecycleStatus);
  if (filters.cleanupJobStatus) query.set('cleanupJobStatus', filters.cleanupJobStatus);

  let response: Response;
  try {
    response = await fetch(`/api/recycle-bin?${query.toString()}`);
  } catch (error) {
    throw new RecycleApiError(error instanceof Error ? error.message : '网络连接失败，请重试。');
  }
  if (!response.ok) throw await readFailure(response);
  return response.json() as Promise<RecycleBinList>;
};
