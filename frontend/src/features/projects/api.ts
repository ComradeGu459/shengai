import type { CreateProjectBody, Project, ProjectList } from '@qimao-terms-cloud/contracts';

interface ApiFailure {
  error?: {
    message?: string;
  };
}

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return body.error?.message ?? `请求失败（HTTP ${response.status}）`;
};

export const listProjects = async (search: string): Promise<ProjectList> => {
  const query = new URLSearchParams({ lifecycleStatus: 'active', limit: '100' });
  if (search.trim()) {
    query.set('search', search.trim());
  }
  const response = await fetch(`/api/projects?${query.toString()}`);
  if (!response.ok) {
    throw new Error(await readFailure(response));
  }
  return response.json() as Promise<ProjectList>;
};

export interface CreateProjectRequest {
  body: CreateProjectBody;
  idempotencyKey: string;
}

export const createProject = async ({ body, idempotencyKey }: CreateProjectRequest): Promise<Project> => {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readFailure(response));
  }
  return response.json() as Promise<Project>;
};
