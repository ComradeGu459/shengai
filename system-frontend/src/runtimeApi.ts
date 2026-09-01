import type {
  SystemControlOperationDetail,
  SystemControlOperationsList,
  SystemControlRuntimeOverview,
  SystemControlRuntimeResource,
  SystemControlRuntimeResourceList,
} from '@qimao-terms-cloud/contracts';

import { apiGet } from './systemApi.js';

export const getRuntimeOverview = (signal?: AbortSignal) =>
  apiGet<SystemControlRuntimeOverview>('/api/system-control/runtime/overview?environment=development', signal);

export const listRuntimeResources = (query: string, signal?: AbortSignal) =>
  apiGet<SystemControlRuntimeResourceList>(`/api/system-control/runtime/resources?${query}`, signal);

export const getRuntimeResource = (runtimeResourceId: string, signal?: AbortSignal) =>
  apiGet<SystemControlRuntimeResource>(`/api/system-control/runtime/resources/${encodeURIComponent(runtimeResourceId)}`, signal);

export const listOperations = (query: string, signal?: AbortSignal) =>
  apiGet<SystemControlOperationsList>(`/api/system-control/operations?${query}`, signal);

export const getOperation = (operationId: string, signal?: AbortSignal) =>
  apiGet<SystemControlOperationDetail>(`/api/system-control/operations/${encodeURIComponent(operationId)}`, signal);
