import type {
  SystemControlStrategyArtifact,
  SystemControlStrategyArtifactList,
  SystemControlStrategyCreateArtifactBody,
  SystemControlStrategyCreateVersionBody,
  SystemControlStrategyEvent,
  SystemControlStrategyEventList,
  SystemControlStrategyVersion,
  SystemControlStrategyVersionList,
  SystemControlCreateOptimizationRunBody,
  SystemControlOptimizationRun,
  SystemControlOptimizationRunList,
  SystemControlStrategyCandidate,
  SystemControlStrategyCandidateList,
  SystemControlStrategyCandidateDecisionBody,
  SystemControlStrategyCandidateDecisionResult,
  SystemControlCreateEvaluationRunBody,
  SystemControlEvaluationRun,
  SystemControlEvaluationRunList,
} from '@qimao-terms-cloud/contracts';

import { apiGet, apiPost } from './systemApi.js';

const queryPath = (path: string, query = '') => `${path}${query ? `?${query}` : ''}`;

export const listStrategyArtifacts = (query = '', signal?: AbortSignal) =>
  apiGet<SystemControlStrategyArtifactList>(queryPath('/api/system-control/strategy/artifacts', query), signal);

export const getStrategyArtifact = (artifactId: string, signal?: AbortSignal) =>
  apiGet<SystemControlStrategyArtifact>(`/api/system-control/strategy/artifacts/${artifactId}`, signal);

export const listStrategyVersions = (artifactId: string, query = 'limit=20&offset=0', signal?: AbortSignal) =>
  apiGet<SystemControlStrategyVersionList>(queryPath(`/api/system-control/strategy/artifacts/${artifactId}/versions`, query), signal);

export const getStrategyVersion = (artifactId: string, versionId: string, signal?: AbortSignal) =>
  apiGet<SystemControlStrategyVersion>(`/api/system-control/strategy/artifacts/${artifactId}/versions/${versionId}`, signal);

export const createStrategyArtifact = (body: SystemControlStrategyCreateArtifactBody, idempotencyKey: string) =>
  apiPost<SystemControlStrategyArtifact>('/api/system-control/strategy/artifacts', body, idempotencyKey);

export const createStrategyVersion = (artifactId: string, body: SystemControlStrategyCreateVersionBody, idempotencyKey: string) =>
  apiPost<SystemControlStrategyVersion>(`/api/system-control/strategy/artifacts/${artifactId}/versions`, body, idempotencyKey);

export const listStrategyEvents = (query = '', signal?: AbortSignal) =>
  apiGet<SystemControlStrategyEventList>(queryPath('/api/system-control/strategy/events', query), signal);

export const getStrategyEvent = (eventRefId: string, signal?: AbortSignal) =>
  apiGet<SystemControlStrategyEvent>(`/api/system-control/strategy/events/${encodeURIComponent(eventRefId)}`, signal);

export const listStrategyOptimizationRuns = (query = '', signal?: AbortSignal) =>
  apiGet<SystemControlOptimizationRunList>(queryPath('/api/system-control/strategy/optimization-runs', query), signal);
export const getStrategyOptimizationRun = (runId: string, signal?: AbortSignal) =>
  apiGet<SystemControlOptimizationRun>(`/api/system-control/strategy/optimization-runs/${runId}`, signal);
export const createStrategyOptimizationRun = (body: SystemControlCreateOptimizationRunBody, key: string) =>
  apiPost<SystemControlOptimizationRun>('/api/system-control/strategy/optimization-runs', body, key);

export const listStrategyCandidates = (query = '', signal?: AbortSignal) =>
  apiGet<SystemControlStrategyCandidateList>(queryPath('/api/system-control/strategy/candidates', query), signal);
export const getStrategyCandidate = (candidateId: string, signal?: AbortSignal) =>
  apiGet<SystemControlStrategyCandidate>(`/api/system-control/strategy/candidates/${candidateId}`, signal);
export const decideStrategyCandidate = (candidateId: string, body: SystemControlStrategyCandidateDecisionBody, key: string) =>
  apiPost<SystemControlStrategyCandidate>(`/api/system-control/strategy/candidates/${candidateId}/decisions`, body, key);
export const getStrategyCandidateDecision = (decisionId: string, signal?: AbortSignal) =>
  apiGet<SystemControlStrategyCandidateDecisionResult>(`/api/system-control/strategy/candidate-decisions/${decisionId}`, signal);

export const listStrategyEvaluations = (query = '', signal?: AbortSignal) =>
  apiGet<SystemControlEvaluationRunList>(queryPath('/api/system-control/strategy/evaluations', query), signal);
export const getStrategyEvaluation = (evaluationRunId: string, signal?: AbortSignal) =>
  apiGet<SystemControlEvaluationRun>(`/api/system-control/strategy/evaluations/${evaluationRunId}`, signal);
export const createStrategyEvaluation = (body: SystemControlCreateEvaluationRunBody, key: string) =>
  apiPost<SystemControlEvaluationRun>('/api/system-control/strategy/evaluations', body, key);
