import type {
  SystemControlCreateSecretReferenceBody,
  SystemControlCreateSecretValidationBody,
  SystemControlRotateSecretReferenceBody,
  SystemControlRevokeSecretReferenceBody,
  SystemControlSecretAuditList,
  SystemControlSecretCommand,
  SystemControlSecretDiscoveryList,
  SystemControlSecretReference,
  SystemControlSecretReferenceList,
  SystemControlSecretReferenceVersionList,
  SystemControlSecretRevokePreflight,
  SystemControlSecretUsageList,
  SystemControlSecretValidation,
  SystemControlSecretValidationList,
  SystemControlSecurityOverview,
} from '@qimao-terms-cloud/contracts';
import { apiGet, apiPost } from './systemApi.js';

export const getSecurityOverview = (signal?: AbortSignal) => apiGet<SystemControlSecurityOverview>('/api/system-control/security', signal);
export const listSecretDiscovery = (query = '', signal?: AbortSignal) => apiGet<SystemControlSecretDiscoveryList>(`/api/system-control/secrets/discovery${query ? `?${query}` : ''}`, signal);
export const listSecretReferences = (query = '', signal?: AbortSignal) => apiGet<SystemControlSecretReferenceList>(`/api/system-control/secrets${query ? `?${query}` : ''}`, signal);
export const getSecretReference = (id: string, signal?: AbortSignal) => apiGet<SystemControlSecretReference>(`/api/system-control/secrets/${id}`, signal);
export const listSecretVersions = (id: string, query = 'limit=20&offset=0', signal?: AbortSignal) => apiGet<SystemControlSecretReferenceVersionList>(`/api/system-control/secrets/${id}/versions?${query}`, signal);
export const listSecretUsage = (id: string, query = 'limit=20&offset=0', signal?: AbortSignal) => apiGet<SystemControlSecretUsageList>(`/api/system-control/secrets/${id}/usage?${query}`, signal);
export const listSecretAudit = (id: string, query = 'limit=20&offset=0', signal?: AbortSignal) => apiGet<SystemControlSecretAuditList>(`/api/system-control/secrets/${id}/audit-events?${query}`, signal);
export const listSecretValidations = (id: string, versionId: string, query = 'limit=20&offset=0', signal?: AbortSignal) => apiGet<SystemControlSecretValidationList>(`/api/system-control/secrets/${id}/versions/${versionId}/validations?${query}`, signal);
export const getSecretRevokePreflight = (id: string, versionId: string, signal?: AbortSignal) => apiGet<SystemControlSecretRevokePreflight>(`/api/system-control/secrets/${id}/versions/${versionId}/revoke-preflight`, signal);
export const getSecretCommand = (commandId: string, signal?: AbortSignal) => apiGet<SystemControlSecretCommand>(`/api/system-control/secrets/commands/${commandId}`, signal);
export const getSecretValidation = (validationRunId: string, signal?: AbortSignal) => apiGet<SystemControlSecretValidation>(`/api/system-control/secrets/validations/${validationRunId}`, signal);

export const createSecretReference = (body: SystemControlCreateSecretReferenceBody, key: string) => apiPost<SystemControlSecretCommand>('/api/system-control/secrets', body, key);
export const rotateSecretReference = (id: string, body: SystemControlRotateSecretReferenceBody, key: string) => apiPost<SystemControlSecretCommand>(`/api/system-control/secrets/${id}/rotate`, body, key);
export const revokeSecretReference = (id: string, versionId: string, body: SystemControlRevokeSecretReferenceBody, key: string) => apiPost<SystemControlSecretCommand>(`/api/system-control/secrets/${id}/versions/${versionId}/revoke`, body, key);
export const createSecretValidation = (body: SystemControlCreateSecretValidationBody, key: string) => apiPost<SystemControlSecretValidation>('/api/system-control/secrets/validations', body, key);
