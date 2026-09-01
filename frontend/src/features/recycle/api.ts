import type {
  CleanupJobStatus,
  RecycleBinList,
  RecycleBinQuery,
  RecycleProjectCommandResult,
  RestoreProjectCommandResult,
  PurgeProjectCommandResult,
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
  action: 'recycle' | 'restore' | 'purge',
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

export const purgeProject = (
  projectId: string,
  expectedVersion: number,
  idempotencyKey: string,
) => lifecycleCommand<PurgeProjectCommandResult>(projectId, 'purge', expectedVersion, idempotencyKey);

/** 结果未知时只读取该 POST 所用的同一命令身份，绝不补发 purge。 */
export const findPurgeCommand = async (
  projectId: string,
  commandId: string,
): Promise<PurgeProjectCommandResult> => {
  let response: Response;
  try {
    response = await fetch(`/api/projects/${projectId}/purge/commands/${encodeURIComponent(commandId)}`);
  } catch (error) {
    throw new RecycleApiError(error instanceof Error ? error.message : '网络连接失败，无法查询本次永久删除命令。');
  }
  if (!response.ok) throw await readFailure(response);
  return response.json() as Promise<PurgeProjectCommandResult>;
};

const fetchRecycleBin = async (filters: RecycleBinFilters, offset: number, limit: number): Promise<RecycleBinList> => {
  const query = new URLSearchParams({
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
    limit: String(limit),
    offset: String(offset),
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

export const listRecycleBin = async (filters: RecycleBinFilters): Promise<RecycleBinList> => {
  return fetchRecycleBin(filters, 0, 100);
};

/** 仅供高风险确认读取服务端全量权威范围，不能据此自动发起写入。 */
export const listAllRecycleBin = async (): Promise<RecycleBinList['items']> => {
  const filters: RecycleBinFilters = {
    search: '', lifecycleStatus: '', cleanupJobStatus: '', sortBy: 'recycleExpiresAt', sortDirection: 'asc',
  };
  const items: RecycleBinList['items'] = [];
  let offset = 0;
  let total = 0;
  do {
    const page = await fetchRecycleBin(filters, offset, 100);
    items.push(...page.items);
    total = page.total;
    offset += page.items.length;
    if (page.items.length === 0) break;
  } while (offset < total);
  return items;
};
