import type {
  SystemControlStrategyApproval,
  SystemControlStrategyApprovalBody,
  SystemControlStrategyBaselineImportBody,
  SystemControlStrategyBaselinePreview,
  SystemControlStrategyHistory,
  SystemControlStrategyHistoryQuery,
  SystemControlStrategyImpactRun,
  SystemControlStrategyImpactRunBody,
  SystemControlStrategyReleaseBody,
  SystemControlStrategyReleaseCommand,
  SystemControlStrategyRuntimeTarget,
  SystemControlStrategyRuntimeVersion,
} from '@qimao-terms-cloud/contracts';

import { apiGet, apiPost } from './systemApi.js';

const ROOT = '/api/system-control/strategy/runtime-targets/pre_review';
const withQuery = (path: string, query: URLSearchParams) => {
  const value = query.toString();
  return value ? `${path}?${value}` : path;
};

export const getRuntimeTarget = (signal?: AbortSignal) => apiGet<SystemControlStrategyRuntimeTarget>(`${ROOT}`, signal);
export const getRuntimeVersion = (strategyVersionId: string, signal?: AbortSignal) => apiGet<SystemControlStrategyRuntimeVersion>(`${ROOT}/versions/${strategyVersionId}`, signal);
export const getBaselinePreview = (signal?: AbortSignal) => apiGet<SystemControlStrategyBaselinePreview>(`${ROOT}/baseline-preview`, signal);
export const importBaseline = (body: SystemControlStrategyBaselineImportBody, key: string) => apiPost<SystemControlStrategyRuntimeVersion>(`${ROOT}/baseline-imports`, body, key);
export const getBaselineImport = (baselineImportId: string, signal?: AbortSignal) => apiGet<SystemControlStrategyRuntimeVersion>(`${ROOT}/baseline-imports/${baselineImportId}`, signal);
export const createImpactRun = (body: SystemControlStrategyImpactRunBody, key: string) => apiPost<SystemControlStrategyImpactRun>(`${ROOT}/impact-runs`, body, key);
export const getImpactRun = (impactRunId: string, signal?: AbortSignal) => apiGet<SystemControlStrategyImpactRun>(`${ROOT}/impact-runs/${impactRunId}`, signal);
export const createApproval = (body: SystemControlStrategyApprovalBody, key: string) => apiPost<SystemControlStrategyApproval>(`${ROOT}/approvals`, body, key);
export const getApproval = (approvalId: string, signal?: AbortSignal) => apiGet<SystemControlStrategyApproval>(`${ROOT}/approvals/${approvalId}`, signal);
export const createReleaseCommand = (body: SystemControlStrategyReleaseBody, key: string) => apiPost<SystemControlStrategyReleaseCommand>(`${ROOT}/releases`, body, key);
export const getReleaseCommand = (releaseCommandId: string, signal?: AbortSignal) => apiGet<SystemControlStrategyReleaseCommand>(`${ROOT}/release-commands/${releaseCommandId}`, signal);
export const listRuntimeHistory = (query: SystemControlStrategyHistoryQuery = {}, signal?: AbortSignal) => {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  return apiGet<SystemControlStrategyHistory>(withQuery(`${ROOT}/history`, params), signal);
};
