export const OPERATION_KINDS = ['read', 'write', 'upload', 'task', 'worker'] as const;
export type OperationKind = (typeof OPERATION_KINDS)[number];

export const FAULT_KINDS = [
  'database_disconnect',
  'worker_exit',
  'rate_limit',
  'server_error',
  'timeout',
  'response_lost',
] as const;
export type FaultKind = (typeof FAULT_KINDS)[number];

export const SCENARIO_NAMES = ['smoke', 'baseline', 'step', 'spike', 'soak', 'faults'] as const;
export type ScenarioName = (typeof SCENARIO_NAMES)[number];

export type ResponseClass = 'success' | 'client_error' | 'server_error' | 'timeout' | 'unknown';

export interface OperationSample {
  operation: OperationKind;
  projectId: string;
  resourceId: string | null;
  requestId: string | null;
  idempotencyKey: string | null;
  statusCode: number | null;
  responseClass: ResponseClass;
  durationMs: number;
  bytesIn: number;
  bytesOut: number;
  errorCode: string | null;
  recoveryGet: boolean;
  postCountForIdentity: number;
}

export interface DistributionSummary {
  count: number;
  errors: number;
  errorRate: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  maxMs: number | null;
}

export interface ResourceSnapshot {
  capturedAt: string;
  cpuPercent: number | null;
  rssBytes: number | null;
  heapUsedBytes: number | null;
  swapUsedBytes: number | null;
  diskReadBytes: number | null;
  diskWriteBytes: number | null;
  networkInBytes: number | null;
  networkOutBytes: number | null;
}

export interface RuntimeMetrics {
  queueDepth: number | null;
  activeWorkers: number | null;
  pgConnections: number | null;
  pgLocks: number | null;
  pgSlowQueries: number | null;
  completedTasks: number | null;
  failedTasks: number | null;
  duplicateWrites: number | null;
  storedFacts: number | null;
  crossProjectViolations: number | null;
}

export interface PhaseReport {
  name: string;
  concurrency: number;
  durationMs: number;
  operations: Record<OperationKind, DistributionSummary>;
  total: DistributionSummary;
  runtime: RuntimeMetrics;
  resourcesBefore: ResourceSnapshot;
  resourcesAfter: ResourceSnapshot;
  unknownCount: number;
  recoveryGetCount: number;
  automaticPostRetryViolations: number;
}

export interface PerformanceReport {
  generatedAt: string;
  mode: 'fake' | 'http';
  target: string;
  scenario: ScenarioName;
  zeroCostCny: '0.00';
  phases: PhaseReport[];
  assertions: {
    deploymentSmoke: 'pass' | 'fail' | 'not_run';
    projectIsolation: 'pass' | 'fail' | 'not_run';
    idempotency: 'pass' | 'fail' | 'not_run';
    unknownReadOnlyRecovery: 'pass' | 'fail' | 'not_run';
    noPublicTarget: 'pass' | 'fail';
  };
  limitations: string[];
}
