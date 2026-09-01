import type { SystemControlOverview } from '@qimao-terms-cloud/contracts';

export type SystemControlReadError = Error & {
  requestId: string | null;
  retryable: boolean | null;
};

const asReadError = (message: string, requestId: string | null, retryable: boolean | null): SystemControlReadError => {
  const error = new Error(message) as SystemControlReadError;
  error.requestId = requestId;
  error.retryable = retryable;
  return error;
};

const readErrorBody = async (response: Response) => {
  try {
    const body = (await response.json()) as {
      error?: { message?: unknown; requestId?: unknown; retryable?: unknown };
    };
    return {
      message: typeof body.error?.message === 'string' ? body.error.message : '系统控制台摘要暂时不可用。',
      requestId: typeof body.error?.requestId === 'string' ? body.error.requestId : null,
      retryable: typeof body.error?.retryable === 'boolean' ? body.error.retryable : null,
    };
  } catch {
    return { message: '系统控制台摘要暂时不可用。', requestId: null, retryable: null };
  }
};

export const fetchSystemControlOverview = async (signal?: AbortSignal): Promise<SystemControlOverview> => {
  const response = await fetch('/api/system-control/overview?environment=development&window=24h', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    const body = await readErrorBody(response);
    throw asReadError(body.message, body.requestId, body.retryable);
  }
  try {
    return (await response.json()) as SystemControlOverview;
  } catch {
    throw asReadError('系统控制台返回的数据无法读取。', null, null);
  }
};
