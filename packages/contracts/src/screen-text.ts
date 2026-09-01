import { Type, type Static } from '@sinclair/typebox';
import { SystemControlScreenTextRuntimeConfigSchema } from './system-control.js';

const Uuid = () => Type.String({ format: 'uuid' });
const Digest = () => Type.String({ pattern: '^[0-9a-f]{64}$' });
const Timestamp = () => Type.String({ format: 'date-time' });
const EpisodeNumber = () => Type.Integer({ minimum: 1, maximum: 100 });

export const ScreenTextScopeSchema = Type.Union([
  Type.Object({ kind: Type.Literal('all') }, { additionalProperties: false }),
  Type.Object({
    kind: Type.Literal('selected'),
    episodeNumbers: Type.Array(EpisodeNumber(), { minItems: 1, maxItems: 100, uniqueItems: true }),
  }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('single'), episodeNumber: EpisodeNumber() }, { additionalProperties: false }),
]);
export type ScreenTextScope = Static<typeof ScreenTextScopeSchema>;

export const ScreenTextBatchStatusSchema = Type.Union([
  Type.Literal('queued'), Type.Literal('running'), Type.Literal('review_pending'),
  Type.Literal('partial'), Type.Literal('completed'), Type.Literal('failed'),
  Type.Literal('cancel_requested'), Type.Literal('cancelled'),
  Type.Literal('reconciliation_required'), Type.Literal('stale'),
]);
export type ScreenTextBatchStatus = Static<typeof ScreenTextBatchStatusSchema>;

export const ScreenTextEpisodeStatusSchema = Type.Union([
  Type.Literal('not_started'), Type.Literal('queued'), Type.Literal('running'),
  Type.Literal('review_pending'), Type.Literal('completed'), Type.Literal('confirmed_empty'),
  Type.Literal('failed'), Type.Literal('cancel_requested'), Type.Literal('cancelled'),
  Type.Literal('reconciliation_required'), Type.Literal('stale'),
]);
export type ScreenTextEpisodeStatus = Static<typeof ScreenTextEpisodeStatusSchema>;

export const ScreenTextCandidateStatusSchema = Type.Union([
  Type.Literal('pending'), Type.Literal('approved'), Type.Literal('edited'), Type.Literal('rejected'),
]);
export type ScreenTextCandidateStatus = Static<typeof ScreenTextCandidateStatusSchema>;

export const ScreenTextCategorySchema = Type.Union([
  Type.Literal('nameplate'), Type.Literal('place'), Type.Literal('time'), Type.Literal('chapter'),
  Type.Literal('title'), Type.Literal('message'), Type.Literal('interface'), Type.Literal('other'),
]);
export type ScreenTextCategory = Static<typeof ScreenTextCategorySchema>;

export const ScreenTextPositionSchema = Type.Union([
  Type.Literal('left'), Type.Literal('center'), Type.Literal('right'), Type.Literal('full'),
]);
export type ScreenTextPosition = Static<typeof ScreenTextPositionSchema>;

export const ScreenTextUsageSchema = Type.Object({
  provider: Type.String({ minLength: 1, maxLength: 40 }),
  billingUnit: Type.String({ minLength: 1, maxLength: 40 }),
  billingQuantity: Type.Number({ minimum: 0 }),
  currency: Type.String({ minLength: 3, maxLength: 12 }),
  estimatedAmount: Type.String(),
  finalAmount: Type.String(),
  reconciliationStatus: Type.Union([Type.Literal('final'), Type.Literal('pending')]),
  providerRequestId: Type.Union([Type.String(), Type.Null()]),
  conversionSnapshotId: Type.Optional(Type.Union([Uuid(), Type.Null()])),
  rateDigest: Type.Optional(Type.Union([Digest(), Type.Null()])),
  conversionEffectiveAt: Type.Optional(Type.Union([Timestamp(), Type.Null()])),
  originalCurrency: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  originalEstimatedAmount: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  originalFinalAmount: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  estimatedAmountCny: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  finalAmountCny: Type.Optional(Type.Union([Type.String(), Type.Null()])),
}, { additionalProperties: false });
export type ScreenTextUsage = Static<typeof ScreenTextUsageSchema>;

export const ScreenTextUsageSummarySchema = Type.Object({
  aggregation: Type.Union([Type.Literal('single'), Type.Literal('split')]),
  reconciliationStatus: Type.Union([Type.Literal('final'), Type.Literal('pending')]),
  items: Type.Array(ScreenTextUsageSchema),
}, { additionalProperties: false });
export type ScreenTextUsageSummary = Static<typeof ScreenTextUsageSummarySchema>;

export const ScreenTextExecutionKindSchema = Type.Union([
  Type.Literal('cloud_api'), Type.Literal('self_hosted_worker'), Type.Literal('deterministic_fake'),
]);
export type ScreenTextExecutionKind = Static<typeof ScreenTextExecutionKindSchema>;

export const ScreenTextAdapterCapabilitiesSchema = Type.Object({
  supportsRegions: Type.Boolean(),
  supportsConfidence: Type.Boolean(),
  supportsLanguageHints: Type.Boolean(),
  maxFramesPerEpisode: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
}, { additionalProperties: false });
export type ScreenTextAdapterCapabilities = Static<typeof ScreenTextAdapterCapabilitiesSchema>;

export const ScreenTextExecutionSchema = Type.Object({
  kind: ScreenTextExecutionKindSchema,
  adapter: Type.String({ minLength: 1, maxLength: 80 }),
  provider: Type.String({ minLength: 1, maxLength: 40 }),
  model: Type.String({ minLength: 1, maxLength: 160 }),
  language: Type.String({ minLength: 1, maxLength: 20 }),
  deployment: Type.String({ minLength: 1, maxLength: 80 }),
  inputVersion: Type.String({ minLength: 1, maxLength: 40 }),
  outputVersion: Type.String({ minLength: 1, maxLength: 40 }),
  configDigest: Digest(),
  capabilities: ScreenTextAdapterCapabilitiesSchema,
}, { additionalProperties: false });
export type ScreenTextExecution = Static<typeof ScreenTextExecutionSchema>;

export const ScreenTextTermProjectionSchema = Type.Object({
  version: Type.String({ minLength: 1, maxLength: 80 }),
  digest: Digest(),
  includedCount: Type.Integer({ minimum: 0 }),
  normalizedCount: Type.Integer({ minimum: 0 }),
  deduplicatedCount: Type.Integer({ minimum: 0 }),
  omittedCount: Type.Integer({ minimum: 0 }),
  omissionReasons: Type.Array(Type.Object({
    code: Type.String({ minLength: 1, maxLength: 80 }),
    count: Type.Integer({ minimum: 1 }),
  }, { additionalProperties: false })),
}, { additionalProperties: false });
export type ScreenTextTermProjection = Static<typeof ScreenTextTermProjectionSchema>;

export const ScreenTextProcessingStatsSchema = Type.Object({
  probedFrameCount: Type.Integer({ minimum: 0 }),
  ocrFrameCount: Type.Integer({ minimum: 0 }),
  deduplicatedFrameCount: Type.Integer({ minimum: 0 }),
  candidateCount: Type.Integer({ minimum: 0 }),
  processingDurationMs: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type ScreenTextProcessingStats = Static<typeof ScreenTextProcessingStatsSchema>;

export const ScreenTextEvidenceSchema = Type.Object({
  evidenceDigest: Digest(),
  width: Type.Integer({ minimum: 1 }),
  height: Type.Integer({ minimum: 1 }),
  capturedAtMs: Type.Integer({ minimum: 0 }),
  previewPath: Type.String({ minLength: 1 }),
}, { additionalProperties: false });
export type ScreenTextEvidence = Static<typeof ScreenTextEvidenceSchema>;

export const ScreenTextTermHitSchema = Type.Object({
  termVersionItemId: Uuid(),
  type: Type.String(),
  canonicalName: Type.String(),
  matchedText: Type.String(),
  identityEvidence: Type.Array(Type.String()),
}, { additionalProperties: false });
export type ScreenTextTermHit = Static<typeof ScreenTextTermHitSchema>;

export const ScreenTextCandidateSchema = Type.Object({
  id: Uuid(),
  batchId: Uuid(),
  jobId: Uuid(),
  episodeNumber: EpisodeNumber(),
  source: Type.Union([Type.Literal('ocr'), Type.Literal('manual'), Type.Literal('split')]),
  rawText: Type.String(),
  text: Type.String(),
  startMs: Type.Integer({ minimum: 0 }),
  endMs: Type.Integer({ minimum: 1 }),
  category: ScreenTextCategorySchema,
  position: ScreenTextPositionSchema,
  confidence: Type.Union([Type.Number({ minimum: 0, maximum: 1 }), Type.Null()]),
  status: ScreenTextCandidateStatusSchema,
  systemSuggestion: Type.Union([Type.Literal('approve'), Type.Literal('ignore'), Type.Null()]),
  suggestionReason: Type.Union([Type.String(), Type.Null()]),
  pairGroupId: Type.Union([Uuid(), Type.Null()]),
  evidence: ScreenTextEvidenceSchema,
  termHits: Type.Array(ScreenTextTermHitSchema),
  revision: Type.Integer({ minimum: 1 }),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type ScreenTextCandidate = Static<typeof ScreenTextCandidateSchema>;

export const ScreenTextAttemptSchema = Type.Object({
  id: Uuid(),
  attemptNumber: Type.Integer({ minimum: 1 }),
  status: Type.Union([
    Type.Literal('leased'), Type.Literal('running'), Type.Literal('completed'),
    Type.Literal('failed'), Type.Literal('cancelled'), Type.Literal('reconciliation_required'),
  ]),
  execution: ScreenTextExecutionSchema,
  runtimeConfig: Type.Optional(SystemControlScreenTextRuntimeConfigSchema),
  runtimeConfigDigest: Type.Optional(Digest()),
  inputDigest: Digest(),
  receipt: Type.Union([
    Type.Literal('simulated'), Type.Literal('submitted'), Type.Literal('unsupported'), Type.Literal('unknown'),
  ]),
  stats: ScreenTextProcessingStatsSchema,
  usage: Type.Union([ScreenTextUsageSchema, Type.Null()]),
  errorCode: Type.Union([Type.String(), Type.Null()]),
  errorDetail: Type.Union([Type.String(), Type.Null()]),
  retryable: Type.Boolean(),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type ScreenTextAttempt = Static<typeof ScreenTextAttemptSchema>;

export const ScreenTextEpisodeJobSchema = Type.Object({
  id: Uuid(),
  episodeNumber: EpisodeNumber(),
  assetId: Uuid(),
  status: ScreenTextEpisodeStatusSchema,
  cancelRequested: Type.Boolean(),
  candidateCounts: Type.Object({
    total: Type.Integer({ minimum: 0 }), pending: Type.Integer({ minimum: 0 }),
    approved: Type.Integer({ minimum: 0 }), edited: Type.Integer({ minimum: 0 }),
    rejected: Type.Integer({ minimum: 0 }),
  }, { additionalProperties: false }),
  stats: ScreenTextProcessingStatsSchema,
  latestAttempt: Type.Union([ScreenTextAttemptSchema, Type.Null()]),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type ScreenTextEpisodeJob = Static<typeof ScreenTextEpisodeJobSchema>;

export const ScreenTextBatchCountsSchema = Type.Object({
  total: Type.Integer({ minimum: 1 }), queued: Type.Integer({ minimum: 0 }),
  running: Type.Integer({ minimum: 0 }), reviewPending: Type.Integer({ minimum: 0 }),
  completed: Type.Integer({ minimum: 0 }), failed: Type.Integer({ minimum: 0 }),
  cancelled: Type.Integer({ minimum: 0 }), reconciliationRequired: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const ScreenTextBatchSchema = Type.Object({
  id: Uuid(), projectId: Uuid(), requestId: Type.String(),
  scope: ScreenTextScopeSchema, episodeNumbers: Type.Array(EpisodeNumber()),
  termVersionId: Uuid(), termVersion: Type.Integer({ minimum: 1 }),
  manifestId: Uuid(), manifestVersion: Type.Integer({ minimum: 1 }),
  execution: ScreenTextExecutionSchema,
  runtimeConfig: Type.Optional(SystemControlScreenTextRuntimeConfigSchema),
  runtimeConfigDigest: Type.Optional(Digest()),
  frameStrategyVersion: Type.String(), dedupeStrategyVersion: Type.String(),
  termProjection: ScreenTextTermProjectionSchema,
  usage: ScreenTextUsageSummarySchema,
  status: ScreenTextBatchStatusSchema, revision: Type.Integer({ minimum: 1 }),
  counts: ScreenTextBatchCountsSchema,
  routingVersionId: Type.Union([Uuid(), Type.Null()]),
  deploymentVersionId: Type.Union([Uuid(), Type.Null()]),
  jobs: Type.Array(ScreenTextEpisodeJobSchema), createdAt: Timestamp(), updatedAt: Timestamp(),
}, { additionalProperties: false });
export type ScreenTextBatch = Static<typeof ScreenTextBatchSchema>;

export const ScreenTextBatchSummarySchema = Type.Object({
  id: Uuid(), requestId: Type.String(), scope: ScreenTextScopeSchema,
  episodeNumbers: Type.Array(EpisodeNumber()),
  termVersionId: Uuid(), termVersion: Type.Integer({ minimum: 1 }),
  manifestId: Uuid(), manifestVersion: Type.Integer({ minimum: 1 }),
  status: ScreenTextBatchStatusSchema, revision: Type.Integer({ minimum: 1 }),
  counts: ScreenTextBatchCountsSchema,
  routingVersionId: Type.Union([Uuid(), Type.Null()]),
  deploymentVersionId: Type.Union([Uuid(), Type.Null()]),
  createdAt: Timestamp(), updatedAt: Timestamp(),
}, { additionalProperties: false });
export type ScreenTextBatchSummary = Static<typeof ScreenTextBatchSummarySchema>;

export const ScreenTextBatchListQuerySchema = Type.Object({
  status: Type.Optional(ScreenTextBatchStatusSchema),
  search: Type.Optional(Type.String({ maxLength: 120 })),
  sort: Type.Optional(Type.Union([Type.Literal('updated_desc'), Type.Literal('created_desc')])),
  limit: Type.Optional(Type.Union([Type.Integer({ minimum: 1, maximum: 100 }), Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })])),
  offset: Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' })])),
}, { additionalProperties: false });
export type ScreenTextBatchListQuery = Static<typeof ScreenTextBatchListQuerySchema>;

export const ScreenTextBatchListSchema = Type.Object({
  items: Type.Array(ScreenTextBatchSummarySchema), total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const CreateScreenTextBatchBodySchema = Type.Object({
  scope: ScreenTextScopeSchema,
  termVersionId: Uuid(),
}, { additionalProperties: false });
export type CreateScreenTextBatchBody = Static<typeof CreateScreenTextBatchBodySchema>;

export const RetryScreenTextBatchBodySchema = Type.Object({
  episodeNumbers: Type.Optional(Type.Array(EpisodeNumber(), { minItems: 1, maxItems: 100, uniqueItems: true })),
}, { additionalProperties: false });
export type RetryScreenTextBatchBody = Static<typeof RetryScreenTextBatchBodySchema>;

export const ScreenTextCandidateQuerySchema = Type.Object({
  episodeNumber: Type.Optional(Type.Union([EpisodeNumber(), Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })])),
  status: Type.Optional(ScreenTextCandidateStatusSchema),
  category: Type.Optional(ScreenTextCategorySchema),
  search: Type.Optional(Type.String({ maxLength: 120 })),
  sort: Type.Optional(Type.Union([
    Type.Literal('identity_first'), Type.Literal('time_asc'),
    Type.Literal('confidence_desc'), Type.Literal('pending_first'),
  ])),
  limit: Type.Optional(Type.Union([Type.Integer({ minimum: 1, maximum: 100 }), Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })])),
  offset: Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' })])),
}, { additionalProperties: false });
export type ScreenTextCandidateQuery = Static<typeof ScreenTextCandidateQuerySchema>;

export const ScreenTextCandidateListSchema = Type.Object({
  items: Type.Array(ScreenTextCandidateSchema), total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const ScreenTextDecisionActionSchema = Type.Union([
  Type.Literal('approve'), Type.Literal('reject'), Type.Literal('restore'),
  Type.Literal('edit'), Type.Literal('split_left_right'),
]);
export const CreateScreenTextDecisionBodySchema = Type.Object({
  action: ScreenTextDecisionActionSchema,
  expectedRevision: Type.Integer({ minimum: 1 }),
  text: Type.Optional(Type.String({ maxLength: 500 })),
  startMs: Type.Optional(Type.Integer({ minimum: 0 })),
  endMs: Type.Optional(Type.Integer({ minimum: 1 })),
  category: Type.Optional(ScreenTextCategorySchema),
  position: Type.Optional(ScreenTextPositionSchema),
  leftText: Type.Optional(Type.String({ minLength: 1, maxLength: 250 })),
  rightText: Type.Optional(Type.String({ minLength: 1, maxLength: 250 })),
}, { additionalProperties: false });
export type CreateScreenTextDecisionBody = Static<typeof CreateScreenTextDecisionBodySchema>;

export const ScreenTextDecisionResultSchema = Type.Object({
  candidate: ScreenTextCandidateSchema,
  createdCandidates: Type.Array(ScreenTextCandidateSchema),
}, { additionalProperties: false });
export type ScreenTextDecisionResult = Static<typeof ScreenTextDecisionResultSchema>;

export const ScreenTextDecisionEventSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
  candidateId: Type.Union([Uuid(), Type.Null()]),
  episodeNumber: EpisodeNumber(),
  action: Type.Union([
    ScreenTextDecisionActionSchema, Type.Literal('manual_add'), Type.Literal('confirm_empty'),
  ]),
  beforeState: Type.Union([Type.Unknown(), Type.Null()]),
  afterState: Type.Unknown(),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export const ScreenTextDecisionEventListSchema = Type.Object({
  items: Type.Array(ScreenTextDecisionEventSchema),
}, { additionalProperties: false });

export const CreateManualScreenTextCandidateBodySchema = Type.Object({
  text: Type.String({ minLength: 1, maxLength: 500 }),
  startMs: Type.Integer({ minimum: 0 }), endMs: Type.Integer({ minimum: 1 }),
  category: ScreenTextCategorySchema, position: ScreenTextPositionSchema,
  evidenceCapturedAtMs: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type CreateManualScreenTextCandidateBody = Static<typeof CreateManualScreenTextCandidateBodySchema>;

export const ConfirmEmptyScreenTextEpisodeBodySchema = Type.Object({
  expectedBatchRevision: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });
export type ConfirmEmptyScreenTextEpisodeBody = Static<typeof ConfirmEmptyScreenTextEpisodeBodySchema>;

export const ScreenTextReleaseExportSchema = Type.Object({
  id: Uuid(), episodeNumber: EpisodeNumber(), filename: Type.String(),
  sha256: Digest(), sizeBytes: Type.Integer({ minimum: 1 }), downloadPath: Type.String(),
}, { additionalProperties: false });
export const ScreenTextReleaseExclusionSchema = Type.Object({
  episodeNumber: EpisodeNumber(), jobId: Uuid(),
  status: Type.Union([
    Type.Literal('failed'), Type.Literal('reconciliation_required'), Type.Literal('cancelled'),
  ]),
  attemptId: Type.Union([Uuid(), Type.Null()]),
  errorCode: Type.Union([Type.String({ minLength: 1, maxLength: 160 }), Type.Null()]),
  effectClass: Type.Union([
    Type.Literal('external_not_accepted'), Type.Literal('unauthorized'),
    Type.Literal('external_unknown'), Type.Literal('quality_rejected'), Type.Literal('cancelled'),
    Type.Null(),
  ]),
  providerRequestId: Type.Union([Type.String({ minLength: 1, maxLength: 255 }), Type.Null()]),
}, { additionalProperties: false });
export type ScreenTextReleaseExclusion = Static<typeof ScreenTextReleaseExclusionSchema>;
export const ScreenTextReleaseSourceSchema = Type.Object({
  id: Uuid(), version: Type.Integer({ minimum: 1 }), releaseDigest: Digest(),
  partial: Type.Boolean(), excludedEpisodes: Type.Array(ScreenTextReleaseExclusionSchema),
}, { additionalProperties: false });
export type ScreenTextReleaseSource = Static<typeof ScreenTextReleaseSourceSchema>;
export const ScreenTextReleaseSchema = Type.Object({
  id: Uuid(), projectId: Uuid(), version: Type.Integer({ minimum: 1 }), batchId: Uuid(),
  termVersionId: Uuid(), manifestId: Uuid(), draftRevision: Type.Integer({ minimum: 1 }),
  releaseDigest: Digest(), cueCount: Type.Integer({ minimum: 0 }),
  partial: Type.Boolean(), excludedEpisodes: Type.Array(ScreenTextReleaseExclusionSchema),
  exports: Type.Array(ScreenTextReleaseExportSchema), createdAt: Timestamp(),
}, { additionalProperties: false });
export type ScreenTextRelease = Static<typeof ScreenTextReleaseSchema>;

export const ScreenTextReleaseListQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 120 })),
  sort: Type.Optional(Type.Union([Type.Literal('version_desc'), Type.Literal('created_desc')])),
  limit: Type.Optional(Type.Union([Type.Integer({ minimum: 1, maximum: 100 }), Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })])),
  offset: Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' })])),
}, { additionalProperties: false });
export type ScreenTextReleaseListQuery = Static<typeof ScreenTextReleaseListQuerySchema>;

export const ScreenTextReleaseListSchema = Type.Object({
  items: Type.Array(ScreenTextReleaseSchema), total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const CreateScreenTextReleaseBodySchema = Type.Object({
  batchId: Uuid(), expectedBatchRevision: Type.Integer({ minimum: 1 }),
  allowPartial: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });
export type CreateScreenTextReleaseBody = Static<typeof CreateScreenTextReleaseBodySchema>;

export const CreateScreenTextPlaybackGrantBodySchema = Type.Object({
  expectedBatchRevision: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });
export type CreateScreenTextPlaybackGrantBody = Static<typeof CreateScreenTextPlaybackGrantBodySchema>;

/** 零网络本地 OCR sidecar 的安全协议元数据；实际媒体字节只在服务端受控 transport 内流转。 */
export const ScreenTextLocalOcrSidecarProtocolVersionSchema = Type.Literal('screen_text_local_ocr_v1');
export const ScreenTextLocalOcrSidecarMediaSchema = Type.Object({
  inputKind: Type.Literal('server_extracted_frames'),
  contentType: Type.String({ minLength: 1, maxLength: 120 }),
  // 视频对象可达现有上传上限；本地 sidecar 的整对象路径仍由 adapter 20MB 限制，
  // streamed media 只传服务端核验的对象元数据与有界帧。
  sizeBytes: Type.Integer({ minimum: 1, maximum: 50_000_000_000 }),
  checksumAlgorithm: Type.Literal('sha256'),
  checksumValue: Digest(),
  videoDurationMs: Type.Integer({ minimum: 1, maximum: 86_400_000 }),
  maxFrameCount: Type.Integer({ minimum: 1, maximum: 600 }),
  maxPixels: Type.Integer({ minimum: 1, maximum: 120_000_000 }),
}, { additionalProperties: false });
export type ScreenTextLocalOcrSidecarMedia = Static<typeof ScreenTextLocalOcrSidecarMediaSchema>;

export const ScreenTextLocalOcrSidecarFrameSchema = Type.Object({
  frameIndex: Type.Integer({ minimum: 0, maximum: 599 }),
  capturedAtMs: Type.Integer({ minimum: 0, maximum: 86_400_000 }),
  width: Type.Integer({ minimum: 1, maximum: 7_680 }),
  height: Type.Integer({ minimum: 1, maximum: 4_320 }),
}, { additionalProperties: false });
export type ScreenTextLocalOcrSidecarFrame = Static<typeof ScreenTextLocalOcrSidecarFrameSchema>;

export const ScreenTextLocalOcrSidecarRequestSchema = Type.Object({
  protocolVersion: ScreenTextLocalOcrSidecarProtocolVersionSchema,
  attemptId: Uuid(),
  requestId: Type.String({ minLength: 1, maxLength: 200 }),
  media: ScreenTextLocalOcrSidecarMediaSchema,
  frames: Type.Array(ScreenTextLocalOcrSidecarFrameSchema, { minItems: 1, maxItems: 600 }),
  language: Type.String({ minLength: 1, maxLength: 20 }),
  modelVersion: Type.String({ minLength: 1, maxLength: 120 }),
}, { additionalProperties: false });
export type ScreenTextLocalOcrSidecarRequest = Static<typeof ScreenTextLocalOcrSidecarRequestSchema>;

export const ScreenTextLocalOcrSidecarBoxSchema = Type.Object({
  frameIndex: Type.Integer({ minimum: 0, maximum: 599 }),
  text: Type.String({ minLength: 1, maxLength: 500 }),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  language: Type.String({ minLength: 1, maxLength: 20 }),
  x: Type.Integer({ minimum: 0, maximum: 7_679 }),
  y: Type.Integer({ minimum: 0, maximum: 4_319 }),
  width: Type.Integer({ minimum: 1, maximum: 7_680 }),
  height: Type.Integer({ minimum: 1, maximum: 4_320 }),
  startMs: Type.Integer({ minimum: 0, maximum: 86_400_000 }),
  endMs: Type.Integer({ minimum: 1, maximum: 86_400_000 }),
}, { additionalProperties: false });
export type ScreenTextLocalOcrSidecarBox = Static<typeof ScreenTextLocalOcrSidecarBoxSchema>;

export const ScreenTextLocalOcrSidecarResponseSchema = Type.Object({
  protocolVersion: ScreenTextLocalOcrSidecarProtocolVersionSchema,
  attemptId: Uuid(),
  requestId: Type.String({ minLength: 1, maxLength: 200 }),
  modelVersion: Type.String({ minLength: 1, maxLength: 120 }),
  language: Type.String({ minLength: 1, maxLength: 20 }),
  frameCount: Type.Integer({ minimum: 0, maximum: 600 }),
  boxes: Type.Array(ScreenTextLocalOcrSidecarBoxSchema, { maxItems: 2_000 }),
}, { additionalProperties: false });
export type ScreenTextLocalOcrSidecarResponse = Static<typeof ScreenTextLocalOcrSidecarResponseSchema>;

export const ScreenTextPlaybackGrantSchema = Type.Object({
  assetId: Uuid(), episodeNumber: EpisodeNumber(), url: Type.String(), expiresAt: Timestamp(),
  seek: Type.Object({
    startMs: Type.Integer({ minimum: 0 }), contextEndMs: Type.Integer({ minimum: 0 }),
  }, { additionalProperties: false }),
}, { additionalProperties: false });
export type ScreenTextPlaybackGrant = Static<typeof ScreenTextPlaybackGrantSchema>;
