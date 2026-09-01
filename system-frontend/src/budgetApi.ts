import type {
  SystemControlBudgetAuditList,
  SystemControlBudgetCommand,
  SystemControlBudgetOverview,
  SystemControlBudgetPolicy,
  SystemControlBudgetPolicyList,
  SystemControlBudgetReservation,
  SystemControlBudgetTestRun,
  SystemControlBudgetTestRunList,
  SystemControlBudgetUsageList,
  SystemControlBudgetTestCommandBody,
  SystemControlCreateBudgetPolicyBody,
  SystemControlBudgetCommandBody,
  SystemControlBudgetReleaseBody,
  SystemControlBudgetRollbackBody,
} from '@qimao-terms-cloud/contracts';
import { apiGet, apiPost } from './systemApi.js';

export const listBudgetPolicies = (query: string, signal?: AbortSignal) => apiGet<SystemControlBudgetPolicyList>(`/api/system-control/budget-policies?${query}`, signal);
export const getBudgetPolicy = (id: string, signal?: AbortSignal) => apiGet<SystemControlBudgetPolicy>(`/api/system-control/budget-policies/${id}`, signal);
export const createBudgetPolicy = (body: SystemControlCreateBudgetPolicyBody, key: string) => apiPost<SystemControlBudgetPolicy>('/api/system-control/budget-policies', body, key);
export const listBudgetTests = (id: string, query: string, signal?: AbortSignal) => apiGet<SystemControlBudgetTestRunList>(`/api/system-control/budget-policies/${id}/tests?${query}`, signal);
export const getBudgetTest = (id: string, testRunId: string, signal?: AbortSignal) => apiGet<SystemControlBudgetTestRun>(`/api/system-control/budget-policies/${id}/tests/${testRunId}`, signal);
export const createBudgetTest = (id: string, body: SystemControlBudgetTestCommandBody, key: string) => apiPost<SystemControlBudgetTestRun>(`/api/system-control/budget-policies/${id}/tests`, body, key);
export const impactCheckBudget = (id: string, body: SystemControlBudgetCommandBody, key: string) => apiPost<SystemControlBudgetPolicy>(`/api/system-control/budget-policies/${id}/impact-check`, body, key);
export const approveBudget = (id: string, body: SystemControlBudgetCommandBody, key: string) => apiPost<SystemControlBudgetPolicy>(`/api/system-control/budget-policies/${id}/approve`, body, key);
export const publishBudget = (id: string, body: SystemControlBudgetReleaseBody, key: string) => apiPost<SystemControlBudgetCommand>(`/api/system-control/budget-policies/${id}/publish`, body, key);
export const rollbackBudget = (id: string, body: SystemControlBudgetRollbackBody, key: string) => apiPost<SystemControlBudgetCommand>(`/api/system-control/budget-policies/${id}/rollback`, body, key);
export const getBudgetReleaseCommand = (id: string, signal?: AbortSignal) => apiGet<SystemControlBudgetCommand>(`/api/system-control/budget-release-commands/${id}`, signal);
export const getBudgetOverview = (signal?: AbortSignal) => apiGet<SystemControlBudgetOverview>('/api/system-control/budget-overview', signal);
export const listBudgetUsage = (query: string, signal?: AbortSignal) => apiGet<SystemControlBudgetUsageList>(`/api/system-control/budget-usage?${query}`, signal);
export const listBudgetAudit = (query: string, signal?: AbortSignal) => apiGet<SystemControlBudgetAuditList>(`/api/system-control/budget-audit-events?${query}`, signal);
export const getBudgetReservation = (id: string, signal?: AbortSignal) => apiGet<SystemControlBudgetReservation>(`/api/system-control/budget-reservations/${id}`, signal);
