import { Type, type Static } from '@sinclair/typebox';

import { LifecycleStatusSchema, WorkflowStatusSchema } from './projects.js';

const EpisodeNumberSchema = Type.Integer({ minimum: 1, maximum: 100 });
const QueryLimitSchema = Type.Union([
  Type.Integer({ minimum: 1, maximum: 100 }),
  Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
]);
const QueryOffsetSchema = Type.Union([
  Type.Integer({ minimum: 0 }),
  Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
]);
const QueryBooleanSchema = Type.Union([
  Type.Boolean(),
  Type.Literal('true'),
  Type.Literal('false'),
]);

export const AsrBatchStatusSchema = Type.Union([
  Type.Literal('blocked'),
  Type.Literal('queued'),
  Type.Literal('running'),
  Type.Literal('cancel_requested'),
  Type.Literal('partial'),
  Type.Literal('completed'),
  Type.Literal('reconciliation_required'),
  Type.Literal('failed'),
  Type.Literal('cancelled'),
]);

export const AsrJobStatusSchema = Type.Union([
  Type.Literal('queued'),
  Type.Literal('leased'),
  Type.Literal('running'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('cancel_requested'),
  Type.Literal('cancelled'),
  Type.Literal('reconciliation_required'),
]);

export const AsrAttemptStatusSchema = Type.Union([
  Type.Literal('leased'),
  Type.Literal('running'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('cancelled'),
  Type.Literal('reconciliation_required'),
]);

export const AsrQualityStatusSchema = Type.Union([
  Type.Literal('pass'),
  Type.Literal('warning'),
  Type.Literal('rejected'),
]);

export const AsrScopeSchema = Type.Union([
  Type.Object({ kind: Type.Literal('all') }, { additionalProperties: false }),
  Type.Object({
    kind: Type.Literal('selected'),
    episodeNumbers: Type.Array(EpisodeNumberSchema, { minItems: 1, maxItems: 100 }),
  }, { additionalProperties: false }),
  Type.Object({
    kind: Type.Literal('single'),
    episodeNumber: EpisodeNumberSchema,
  }, { additionalProperties: false }),
]);

export const CreateAsrBatchBodySchema = Type.Object({
  scope: AsrScopeSchema,
  termVersionId: Type.String({ format: 'uuid' }),
  forceNewRecognition: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });

export const CancelAsrBatchBodySchema = Type.Object({}, { additionalProperties: false });

export const RetryAsrBatchBodySchema = Type.Object({
  episodeNumbers: Type.Optional(Type.Array(EpisodeNumberSchema, { minItems: 1, maxItems: 100 })),
}, { additionalProperties: false });

export const AsrHotwordSummarySchema = Type.Object({
  projectionVersion: Type.String({ minLength: 1, maxLength: 80 }),
  digest: Type.String({ minLength: 64, maxLength: 64 }),
  termCount: Type.Integer({ minimum: 0 }),
  aliasCount: Type.Integer({ minimum: 0 }),
  filteredCount: Type.Integer({ minimum: 0 }),
  truncatedCount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const AsrHotwordReceiptStatusSchema = Type.Union([
  Type.Literal('simulated'),
  Type.Literal('submitted'),
  Type.Literal('partially_submitted'),
  Type.Literal('unsupported'),
  Type.Literal('unknown'),
]);

export const AsrHotwordReceiptReasonSchema = Type.Union([
  Type.Literal('partial_submission'),
  Type.Literal('unsupported'),
  Type.Literal('unknown'),
]);

export const AsrHotwordReceiptFactsSchema = Type.Object({
  submittedCount: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  omittedCount: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  reasonCode: Type.Union([AsrHotwordReceiptReasonSchema, Type.Null()]),
}, { additionalProperties: false });

export const AsrHotwordPayloadSchema = Type.Object({
  projectionVersion: Type.String({ minLength: 1, maxLength: 80 }),
  digest: Type.String({ minLength: 64, maxLength: 64 }),
  itemCount: Type.Integer({ minimum: 0 }),
  characterCount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const AsrHotwordPreviewQuerySchema = Type.Object({
  termVersionId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });

export const AsrHotwordPreviewEntrySchema = Type.Object({
  text: Type.String({ minLength: 1 }),
  source: Type.Union([Type.Literal('term'), Type.Literal('person_alias')]),
}, { additionalProperties: false });

export const AsrHotwordOmissionReasonSchema = Type.Union([
  Type.Literal('rule_filtered'),
  Type.Literal('duplicate_removed'),
  Type.Literal('adapter_unsupported'),
  Type.Literal('adapter_max_entries'),
  Type.Literal('adapter_max_characters'),
]);

export const AsrHotwordOmittedEntrySchema = Type.Object({
  order: Type.Integer({ minimum: 1 }),
  text: Type.String(),
  source: Type.Union([Type.Literal('term'), Type.Literal('person_alias')]),
  reasonCode: AsrHotwordOmissionReasonSchema,
}, { additionalProperties: false });

export const AsrHotwordCapabilitiesSchema = Type.Object({
  supported: Type.Boolean(),
  maxEntries: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  maxCharacters: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
}, { additionalProperties: false });

export const AsrHotwordPreviewSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  termVersionId: Type.String({ format: 'uuid' }),
  provider: Type.String({ minLength: 1, maxLength: 40 }),
  adapter: Type.String({ minLength: 1, maxLength: 80 }),
  model: Type.String({ minLength: 1, maxLength: 80 }),
  language: Type.String({ minLength: 1, maxLength: 20 }),
  configDigest: Type.String({ minLength: 64, maxLength: 64 }),
  capabilities: AsrHotwordCapabilitiesSchema,
  entries: Type.Array(AsrHotwordPreviewEntrySchema),
  omittedEntries: Type.Array(AsrHotwordOmittedEntrySchema),
  summary: AsrHotwordSummarySchema,
}, { additionalProperties: false });

export const AsrBatchHotwordEvidenceSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  batchId: Type.String({ format: 'uuid' }),
  termVersionId: Type.String({ format: 'uuid' }),
  provider: Type.String({ minLength: 1, maxLength: 40 }),
  adapter: Type.String({ minLength: 1, maxLength: 80 }),
  model: Type.String({ minLength: 1, maxLength: 80 }),
  language: Type.String({ minLength: 1, maxLength: 20 }),
  configDigest: Type.String({ minLength: 64, maxLength: 64 }),
  capabilities: AsrHotwordCapabilitiesSchema,
  entries: Type.Array(AsrHotwordPreviewEntrySchema),
  omittedEntries: Type.Array(AsrHotwordOmittedEntrySchema),
  summary: AsrHotwordSummarySchema,
}, { additionalProperties: false });

export const AsrUsageSchema = Type.Object({
  provider: Type.String({ minLength: 1, maxLength: 40 }),
  mediaDurationMs: Type.Integer({ minimum: 0 }),
  billingUnit: Type.String(),
  billingQuantity: Type.Number({ minimum: 0 }),
  currency: Type.String(),
  estimatedAmount: Type.String(),
  finalAmount: Type.String(),
  reconciliationStatus: Type.Union([Type.Literal('final'), Type.Literal('pending')]),
  providerRequestId: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false });

export const AsrQualitySummarySchema = Type.Object({
  audioCoverageRatio: Type.Number({ minimum: 0, maximum: 1 }),
  emptyResult: Type.Boolean(),
  cueCount: Type.Integer({ minimum: 0 }),
  longSegmentCount: Type.Integer({ minimum: 0 }),
  timelineIssueCount: Type.Integer({ minimum: 0 }),
  termHitCount: Type.Integer({ minimum: 0 }),
  lowConfidenceCount: Type.Integer({ minimum: 0 }),
  hallucinationSignalCount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const AsrCueSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  cueIndex: Type.Integer({ minimum: 1 }),
  startMs: Type.Integer({ minimum: 0 }),
  endMs: Type.Integer({ minimum: 1 }),
  text: Type.String(),
  confidence: Type.Union([Type.Number({ minimum: 0, maximum: 1 }), Type.Null()]),
}, { additionalProperties: false });

export const AsrResultSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  revision: Type.Integer({ minimum: 1 }),
  projectId: Type.String({ format: 'uuid' }),
  episodeNumber: EpisodeNumberSchema,
  assetId: Type.String({ format: 'uuid' }),
  termVersionId: Type.String({ format: 'uuid' }),
  configDigest: Type.String({ minLength: 64, maxLength: 64 }),
  hotwordDigest: Type.String({ minLength: 64, maxLength: 64 }),
  qualityStatus: AsrQualityStatusSchema,
  qualitySummary: AsrQualitySummarySchema,
  cues: Type.Array(AsrCueSchema),
  createdAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export const AsrAttemptSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  attemptNumber: Type.Integer({ minimum: 1 }),
  status: AsrAttemptStatusSchema,
  leaseOwner: Type.Union([Type.String(), Type.Null()]),
  leaseExpiresAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  providerRequestId: Type.Union([Type.String(), Type.Null()]),
  errorCode: Type.Union([Type.String(), Type.Null()]),
  errorDetail: Type.Union([Type.String(), Type.Null()]),
  retryable: Type.Boolean(),
  externalSideEffectPossible: Type.Boolean(),
  startedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  completedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  hotwordPayload: Type.Union([AsrHotwordPayloadSchema, Type.Null()]),
  hotwordReceipt: Type.Union([AsrHotwordReceiptStatusSchema, Type.Null()]),
  hotwordReceiptFacts: Type.Union([AsrHotwordReceiptFactsSchema, Type.Null()]),
  usage: Type.Union([AsrUsageSchema, Type.Null()]),
  result: Type.Union([AsrResultSchema, Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export const AsrJobSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  episodeNumber: EpisodeNumberSchema,
  assetId: Type.String({ format: 'uuid' }),
  assetOriginalFilename: Type.String(),
  assetChecksum: Type.String(),
  status: AsrJobStatusSchema,
  currentAttemptId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  currentResultId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  reusedResult: Type.Boolean(),
  cancelRequested: Type.Boolean(),
  attempts: Type.Array(AsrAttemptSchema),
  currentResult: Type.Union([AsrResultSchema, Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export const AsrBatchBlockerSchema = Type.Object({
  episodeNumber: EpisodeNumberSchema,
  code: Type.String(),
  message: Type.String(),
}, { additionalProperties: false });

export const AsrBatchCountsSchema = Type.Object({
  total: Type.Integer({ minimum: 0 }),
  queued: Type.Integer({ minimum: 0 }),
  running: Type.Integer({ minimum: 0 }),
  cancelRequested: Type.Integer({ minimum: 0 }),
  completed: Type.Integer({ minimum: 0 }),
  failed: Type.Integer({ minimum: 0 }),
  cancelled: Type.Integer({ minimum: 0 }),
  reconciliationRequired: Type.Integer({ minimum: 0 }),
  reused: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const AsrBatchSummarySchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  projectId: Type.String({ format: 'uuid' }),
  retryOfBatchId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  scopeKind: Type.Union([Type.Literal('all'), Type.Literal('selected'), Type.Literal('single')]),
  episodeNumbers: Type.Array(EpisodeNumberSchema),
  termVersionId: Type.String({ format: 'uuid' }),
  termVersionIsLatest: Type.Boolean(),
  manifestId: Type.String({ format: 'uuid' }),
  manifestVersion: Type.Integer({ minimum: 1 }),
  provider: Type.String({ minLength: 1, maxLength: 40 }),
  adapter: Type.String({ minLength: 1, maxLength: 80 }),
  model: Type.String({ minLength: 1, maxLength: 80 }),
  language: Type.String({ minLength: 1, maxLength: 20 }),
  configDigest: Type.String({ minLength: 64, maxLength: 64 }),
  hotwords: AsrHotwordSummarySchema,
  status: AsrBatchStatusSchema,
  forceNewRecognition: Type.Boolean(),
  counts: AsrBatchCountsSchema,
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export const AsrBatchDetailSchema = Type.Object({
  ...AsrBatchSummarySchema.properties,
  blockers: Type.Array(AsrBatchBlockerSchema),
  jobs: Type.Array(AsrJobSchema),
}, { additionalProperties: false });

export const AsrBatchListQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 100 })),
  status: Type.Optional(AsrBatchStatusSchema),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('actionPriority'),
    Type.Literal('updatedAt'),
    Type.Literal('createdAt'),
    Type.Literal('status'),
  ])),
  sortDirection: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
  limit: Type.Optional(QueryLimitSchema),
  offset: Type.Optional(QueryOffsetSchema),
}, { additionalProperties: false });

export const AsrBatchListSchema = Type.Object({
  items: Type.Array(AsrBatchSummarySchema),
  total: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const AsrBatchPreparationQuerySchema = Type.Object({
  termVersionId: Type.String({ format: 'uuid' }),
  forceNewRecognition: Type.Optional(QueryBooleanSchema),
}, { additionalProperties: false });

export const AsrBatchPreparationStatusSchema = Type.Union([
  Type.Literal('executable'),
  Type.Literal('reusable'),
  Type.Literal('blocked'),
]);

export const AsrBatchPreparationBlockerSchema = Type.Object({
  code: Type.String({ minLength: 1, maxLength: 100 }),
  message: Type.String({ minLength: 1, maxLength: 500 }),
  action: Type.String({ minLength: 1, maxLength: 100 }),
}, { additionalProperties: false });

export const AsrBatchPreparationEpisodeSchema = Type.Object({
  episodeNumber: EpisodeNumberSchema,
  assetId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  assetOriginalFilename: Type.Union([Type.String(), Type.Null()]),
  assetChecksum: Type.Union([Type.String(), Type.Null()]),
  status: AsrBatchPreparationStatusSchema,
  reusableResultId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  blockers: Type.Array(AsrBatchPreparationBlockerSchema),
}, { additionalProperties: false });

export const AsrBatchPreparationSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  termVersionId: Type.String({ format: 'uuid' }),
  manifestId: Type.String({ format: 'uuid' }),
  manifestVersion: Type.Integer({ minimum: 1 }),
  provider: Type.String({ minLength: 1, maxLength: 40 }),
  adapter: Type.String({ minLength: 1, maxLength: 80 }),
  model: Type.String({ minLength: 1, maxLength: 80 }),
  language: Type.String({ minLength: 1, maxLength: 20 }),
  configDigest: Type.String({ minLength: 64, maxLength: 64 }),
  forceNewRecognition: Type.Boolean(),
  hotwords: AsrHotwordSummarySchema,
  counts: Type.Object({
    total: Type.Integer({ minimum: 0, maximum: 100 }),
    executable: Type.Integer({ minimum: 0, maximum: 100 }),
    reusable: Type.Integer({ minimum: 0, maximum: 100 }),
    blocked: Type.Integer({ minimum: 0, maximum: 100 }),
    newJobs: Type.Integer({ minimum: 0, maximum: 100 }),
  }, { additionalProperties: false }),
  episodes: Type.Array(AsrBatchPreparationEpisodeSchema, { maxItems: 100 }),
}, { additionalProperties: false });

export const AsrEligibilityBlockerSchema = Type.Object({
  code: Type.String({ minLength: 1, maxLength: 100 }),
  message: Type.String({ minLength: 1, maxLength: 500 }),
  action: Type.String({ minLength: 1, maxLength: 100 }),
}, { additionalProperties: false });

export const AsrProjectEligibilitySchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  projectName: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  eligible: Type.Boolean(),
  termVersionId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  manifestId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  totalEpisodeCount: Type.Integer({ minimum: 0 }),
  readyEpisodeCount: Type.Integer({ minimum: 0 }),
  newJobCount: Type.Integer({ minimum: 0 }),
  reusableResultCount: Type.Integer({ minimum: 0 }),
  activeBatchCount: Type.Integer({ minimum: 0 }),
  hotwords: Type.Union([AsrHotwordSummarySchema, Type.Null()]),
  blockers: Type.Array(AsrEligibilityBlockerSchema),
}, { additionalProperties: false });

export const AsrEligibilityBodySchema = Type.Object({
  projectIds: Type.Array(Type.String({ format: 'uuid' }), { minItems: 1, maxItems: 20 }),
}, { additionalProperties: false });

export const AsrEligibilityListSchema = Type.Object({
  items: Type.Array(AsrProjectEligibilitySchema),
  counts: Type.Object({
    selectedProjects: Type.Integer({ minimum: 1, maximum: 20 }),
    eligibleProjects: Type.Integer({ minimum: 0, maximum: 20 }),
    blockedProjects: Type.Integer({ minimum: 0, maximum: 20 }),
    totalEpisodes: Type.Integer({ minimum: 0 }),
    newJobs: Type.Integer({ minimum: 0 }),
    reusableResults: Type.Integer({ minimum: 0 }),
  }, { additionalProperties: false }),
}, { additionalProperties: false });

export const AsrProjectEligibilityStatusSchema = Type.Union([
  Type.Literal('eligible'),
  Type.Literal('missing_terms'),
  Type.Literal('missing_videos'),
  Type.Literal('active'),
  Type.Literal('failed'),
  Type.Literal('blocked'),
]);

export const AsrRecentBatchSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  status: AsrBatchStatusSchema,
  totalEpisodes: Type.Integer({ minimum: 0 }),
  resultEpisodes: Type.Integer({ minimum: 0 }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export const AsrProjectEligibilitySearchQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 120 })),
  eligibilityStatus: Type.Optional(AsrProjectEligibilityStatusSchema),
  workflowStatus: Type.Optional(WorkflowStatusSchema),
  lifecycleStatus: Type.Optional(LifecycleStatusSchema),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('actionPriority'),
    Type.Literal('updatedAt'),
    Type.Literal('name'),
  ])),
  sortDirection: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
  limit: Type.Optional(QueryLimitSchema),
  offset: Type.Optional(QueryOffsetSchema),
}, { additionalProperties: false });

export const AsrProjectEligibilitySearchItemSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  projectName: Type.String({ minLength: 1, maxLength: 120 }),
  workflowStatus: WorkflowStatusSchema,
  lifecycleStatus: LifecycleStatusSchema,
  eligibilityStatus: AsrProjectEligibilityStatusSchema,
  eligibility: AsrProjectEligibilitySchema,
  latestBatch: Type.Union([AsrRecentBatchSchema, Type.Null()]),
  updatedAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export const AsrProjectEligibilitySearchResultSchema = Type.Object({
  items: Type.Array(AsrProjectEligibilitySearchItemSchema),
  total: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const CreateAsrDispatchGroupBodySchema = Type.Object({
  dispatchGroupId: Type.String({ format: 'uuid' }),
  projectIds: Type.Array(Type.String({ format: 'uuid' }), { minItems: 1, maxItems: 20 }),
  allowPartial: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });

export const AsrDispatchAcceptanceStatusSchema = Type.Union([
  Type.Literal('accepted'),
  Type.Literal('partial'),
  Type.Literal('blocked'),
]);

export const AsrDispatchExecutionStatusSchema = Type.Union([
  Type.Literal('queued'),
  Type.Literal('running'),
  Type.Literal('partial'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('cancel_requested'),
  Type.Literal('reconciliation_required'),
  Type.Literal('cancelled'),
]);

export const AsrDispatchProjectStatusSchema = Type.Union([
  Type.Literal('accepted'),
  Type.Literal('blocked'),
]);

export const AsrDispatchProjectResultSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  selectionOrder: Type.Integer({ minimum: 1, maximum: 20 }),
  acceptanceStatus: AsrDispatchProjectStatusSchema,
  eligibility: Type.Union([AsrProjectEligibilitySchema, Type.Null()]),
  dispatchError: Type.Union([AsrEligibilityBlockerSchema, Type.Null()]),
  batchId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  batch: Type.Union([AsrBatchSummarySchema, Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

const AsrDispatchBatchStatusCountsSchema = Type.Object({
  blocked: Type.Integer({ minimum: 0 }),
  queued: Type.Integer({ minimum: 0 }),
  running: Type.Integer({ minimum: 0 }),
  cancelRequested: Type.Integer({ minimum: 0 }),
  partial: Type.Integer({ minimum: 0 }),
  completed: Type.Integer({ minimum: 0 }),
  reconciliationRequired: Type.Integer({ minimum: 0 }),
  failed: Type.Integer({ minimum: 0 }),
  cancelled: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

const AsrDispatchQualitySummarySchema = Type.Object({
  passedEpisodes: Type.Integer({ minimum: 0 }),
  warningEpisodes: Type.Integer({ minimum: 0 }),
  rejectedEpisodes: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

const AsrDispatchProcessingUsageSummarySchema = Type.Object({
  recordedAttempts: Type.Integer({ minimum: 0 }),
  mediaDurationMs: Type.Integer({ minimum: 0 }),
  reconciliationStatus: Type.Union([
    Type.Literal('not_recorded'),
    Type.Literal('recorded'),
    Type.Literal('pending'),
  ]),
}, { additionalProperties: false });

export const AsrDispatchGroupSummarySchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  requestId: Type.String({ minLength: 1, maxLength: 200 }),
  acceptanceStatus: AsrDispatchAcceptanceStatusSchema,
  executionStatus: Type.Union([AsrDispatchExecutionStatusSchema, Type.Null()]),
  projectIds: Type.Array(Type.String({ format: 'uuid' }), { minItems: 1, maxItems: 20 }),
  allowPartial: Type.Boolean(),
  counts: Type.Object({
    selectedProjects: Type.Integer({ minimum: 1, maximum: 20 }),
    acceptedProjects: Type.Integer({ minimum: 0, maximum: 20 }),
    blockedProjects: Type.Integer({ minimum: 0, maximum: 20 }),
    completedProjects: Type.Integer({ minimum: 0, maximum: 20 }),
    totalEpisodes: Type.Integer({ minimum: 0 }),
    newJobs: Type.Integer({ minimum: 0 }),
    reusableResults: Type.Integer({ minimum: 0 }),
    batches: AsrDispatchBatchStatusCountsSchema,
  }, { additionalProperties: false }),
  quality: AsrDispatchQualitySummarySchema,
  processingUsage: AsrDispatchProcessingUsageSummarySchema,
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export const AsrDispatchGroupDetailSchema = Type.Object({
  ...AsrDispatchGroupSummarySchema.properties,
  results: Type.Array(AsrDispatchProjectResultSchema),
}, { additionalProperties: false });

export const AsrDispatchGroupListQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 120 })),
  acceptanceStatus: Type.Optional(AsrDispatchAcceptanceStatusSchema),
  executionStatus: Type.Optional(AsrDispatchExecutionStatusSchema),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('actionPriority'),
    Type.Literal('updatedAt'),
    Type.Literal('createdAt'),
  ])),
  sortDirection: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
  limit: Type.Optional(QueryLimitSchema),
  offset: Type.Optional(QueryOffsetSchema),
}, { additionalProperties: false });

export const AsrDispatchGroupListSchema = Type.Object({
  items: Type.Array(AsrDispatchGroupSummarySchema),
  total: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const CancelAsrDispatchGroupBodySchema = Type.Object({}, { additionalProperties: false });

export type AsrBatchStatus = Static<typeof AsrBatchStatusSchema>;
export type AsrJobStatus = Static<typeof AsrJobStatusSchema>;
export type AsrAttemptStatus = Static<typeof AsrAttemptStatusSchema>;
export type AsrQualityStatus = Static<typeof AsrQualityStatusSchema>;
export type AsrScope = Static<typeof AsrScopeSchema>;
export type CreateAsrBatchBody = Static<typeof CreateAsrBatchBodySchema>;
export type RetryAsrBatchBody = Static<typeof RetryAsrBatchBodySchema>;
export type AsrHotwordSummary = Static<typeof AsrHotwordSummarySchema>;
export type AsrHotwordReceiptStatus = Static<typeof AsrHotwordReceiptStatusSchema>;
export type AsrHotwordReceiptReason = Static<typeof AsrHotwordReceiptReasonSchema>;
export type AsrHotwordReceiptFacts = Static<typeof AsrHotwordReceiptFactsSchema>;
export type AsrHotwordPayload = Static<typeof AsrHotwordPayloadSchema>;
export type AsrHotwordPreview = Static<typeof AsrHotwordPreviewSchema>;
export type AsrBatchHotwordEvidence = Static<typeof AsrBatchHotwordEvidenceSchema>;
export type AsrHotwordOmissionReason = Static<typeof AsrHotwordOmissionReasonSchema>;
export type AsrUsage = Static<typeof AsrUsageSchema>;
export type AsrQualitySummary = Static<typeof AsrQualitySummarySchema>;
export type AsrCue = Static<typeof AsrCueSchema>;
export type AsrResult = Static<typeof AsrResultSchema>;
export type AsrAttempt = Static<typeof AsrAttemptSchema>;
export type AsrJob = Static<typeof AsrJobSchema>;
export type AsrBatchSummary = Static<typeof AsrBatchSummarySchema>;
export type AsrBatchDetail = Static<typeof AsrBatchDetailSchema>;
export type AsrBatchListQuery = Static<typeof AsrBatchListQuerySchema>;
export type AsrBatchPreparationQuery = Static<typeof AsrBatchPreparationQuerySchema>;
export type AsrBatchPreparation = Static<typeof AsrBatchPreparationSchema>;
export type AsrProjectEligibility = Static<typeof AsrProjectEligibilitySchema>;
export type AsrEligibilityBody = Static<typeof AsrEligibilityBodySchema>;
export type AsrEligibilityList = Static<typeof AsrEligibilityListSchema>;
export type AsrProjectEligibilityStatus = Static<typeof AsrProjectEligibilityStatusSchema>;
export type AsrProjectEligibilitySearchQuery = Static<typeof AsrProjectEligibilitySearchQuerySchema>;
export type AsrProjectEligibilitySearchItem = Static<typeof AsrProjectEligibilitySearchItemSchema>;
export type AsrProjectEligibilitySearchResult = Static<typeof AsrProjectEligibilitySearchResultSchema>;
export type CreateAsrDispatchGroupBody = Static<typeof CreateAsrDispatchGroupBodySchema>;
export type AsrDispatchAcceptanceStatus = Static<typeof AsrDispatchAcceptanceStatusSchema>;
export type AsrDispatchExecutionStatus = Static<typeof AsrDispatchExecutionStatusSchema>;
export type AsrDispatchProjectStatus = Static<typeof AsrDispatchProjectStatusSchema>;
export type AsrDispatchProjectResult = Static<typeof AsrDispatchProjectResultSchema>;
export type AsrDispatchGroupSummary = Static<typeof AsrDispatchGroupSummarySchema>;
export type AsrDispatchGroupDetail = Static<typeof AsrDispatchGroupDetailSchema>;
export type AsrDispatchGroupListQuery = Static<typeof AsrDispatchGroupListQuerySchema>;
