import type {
  ConfirmMaterialManifestBody,
  MaterialManifest,
  ProjectMaterialState,
} from '@qimao-terms-cloud/contracts';

interface ApiFailure {
  error?: { code?: string; message?: string; action?: string };
}

export class MaterialApiError extends Error {
  constructor(readonly code: string, readonly action: string, message: string) {
    super(message);
    this.name = 'MaterialApiError';
  }
}

const readFailure = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as ApiFailure;
  return new MaterialApiError(
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.action ?? 'retry',
    body.error?.message ?? `请求失败（HTTP ${response.status}）`,
  );
};

export const getProjectMaterialState = async (projectId: string): Promise<ProjectMaterialState> => {
  const response = await fetch(`/api/projects/${projectId}/material-manifest`);
  if (!response.ok) throw await readFailure(response);
  return response.json() as Promise<ProjectMaterialState>;
};

export const confirmMaterialManifest = async (input: {
  projectId: string;
  idempotencyKey: string;
  body: ConfirmMaterialManifestBody;
}): Promise<MaterialManifest> => {
  const response = await fetch(`/api/projects/${input.projectId}/material-manifests/confirm`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': input.idempotencyKey,
    },
    body: JSON.stringify(input.body),
  });
  if (!response.ok) throw await readFailure(response);
  return response.json() as Promise<MaterialManifest>;
};
