import { Type, type Static } from '@sinclair/typebox';

const Timestamp = Type.String({ format: 'date-time' });
const Uuid = Type.String({ format: 'uuid' });
const Digest = Type.String({ pattern: '^[0-9a-f]{32,64}$', minLength: 32, maxLength: 64 });
const PageLimit = Type.Optional(Type.String({ pattern: '^[1-9][0-9]?$|^100$' }));
const PageOffset = Type.Optional(Type.String({ pattern: '^(0|[1-9][0-9]{0,5})$' }));

export const SystemControlStrategyArtifactKindSchema = Type.Union([
  Type.Literal('local_rule_pack'), Type.Literal('ai_filter_policy'), Type.Literal('prompt_template'),
  Type.Literal('hotword_projection'), Type.Literal('risk_lexicon'),
]);
export type SystemControlStrategyArtifactKind = Static<typeof SystemControlStrategyArtifactKindSchema>;

export const SystemControlStrategyArtifactStatusSchema = Type.Literal('draft');
export type SystemControlStrategyArtifactStatus = Static<typeof SystemControlStrategyArtifactStatusSchema>;
export const SystemControlStrategyModuleSchema = Type.Union([
  Type.Literal('terms'), Type.Literal('pre_review'), Type.Literal('screen_text'), Type.Literal('subtitle_acceptance'),
]);
export type SystemControlStrategyModule = Static<typeof SystemControlStrategyModuleSchema>;

const RuleSchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 80 }),
  pattern: Type.String({ minLength: 1, maxLength: 500 }),
  replacement: Type.String({ maxLength: 500 }),
  action: Type.Union([Type.Literal('accept'), Type.Literal('reject'), Type.Literal('review')]),
}, { additionalProperties: false });

// 前置审改运行时唯一允许执行的严格载荷；基线值由服务端填写，schema 只约束业务范围。
export const SystemControlPreReviewRulePackSchema = Type.Object({
  payloadType: Type.Literal('pre_review_local_rule_pack_v1'),
  alignmentNearbyGapMs: Type.Integer({ minimum: 0, maximum: 5000 }),
  // 运行时响应也会经过 fast-json-stringify；十进制 multipleOf 在 JS 二进制浮点下
  // 会把合法的 0.8 等值误判为不匹配。精度由后端统一按六位十进制校验，避免响应投影失真。
  alignmentSimilarityThreshold: Type.Number({ minimum: 0, maximum: 1 }),
  maxCharacters: Type.Integer({ minimum: 1, maximum: 200 }),
  forbidSentencePunctuation: Type.Boolean(),
  forbidMarkup: Type.Boolean(),
  forbidBrackets: Type.Boolean(),
  requireSpeakerDashForMultipleLines: Type.Boolean(),
}, { additionalProperties: false });
export type SystemControlPreReviewRulePack = Static<typeof SystemControlPreReviewRulePackSchema>;

export const SystemControlLocalRulePackPayloadSchema = Type.Object({
  rules: Type.Array(RuleSchema, { maxItems: 500 }),
}, { additionalProperties: false });
export const SystemControlAiFilterPolicyPayloadSchema = Type.Object({
  mode: Type.Union([Type.Literal('local_only'), Type.Literal('local_then_ai'), Type.Literal('ai_review_sample')]),
  sampleRate: Type.Number({ minimum: 0, maximum: 1 }),
  riskThreshold: Type.Number({ minimum: 0, maximum: 1 }),
  maxCandidates: Type.Integer({ minimum: 0, maximum: 100000 }),
}, { additionalProperties: false });
export const SystemControlPromptTemplatePayloadSchema = Type.Object({
  template: Type.String({ minLength: 1, maxLength: 20000 }),
  variables: Type.Array(Type.String({ minLength: 1, maxLength: 80 }), { maxItems: 100 }),
}, { additionalProperties: false });
export const SystemControlHotwordProjectionPayloadSchema = Type.Object({
  terms: Type.Array(Type.String({ minLength: 1, maxLength: 120 }), { maxItems: 5000 }),
  caseSensitive: Type.Boolean(),
}, { additionalProperties: false });
export const SystemControlRiskLexiconPayloadSchema = Type.Object({
  terms: Type.Array(Type.String({ minLength: 1, maxLength: 120 }), { maxItems: 5000 }),
  severity: Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')]),
}, { additionalProperties: false });
export const SystemControlStrategyPayloadSchema = Type.Union([
  SystemControlPreReviewRulePackSchema,
  SystemControlLocalRulePackPayloadSchema, SystemControlAiFilterPolicyPayloadSchema,
  SystemControlPromptTemplatePayloadSchema, SystemControlHotwordProjectionPayloadSchema,
  SystemControlRiskLexiconPayloadSchema,
]);
export type SystemControlStrategyPayload = Static<typeof SystemControlStrategyPayloadSchema>;

export const SystemControlStrategyCreateArtifactBodySchema = Type.Object({
  artifactId: Uuid, versionId: Uuid, kind: SystemControlStrategyArtifactKindSchema,
  displayName: Type.String({ minLength: 1, maxLength: 200 }), purpose: Type.String({ minLength: 1, maxLength: 500 }),
  applicableModules: Type.Array(SystemControlStrategyModuleSchema, { minItems: 1, maxItems: 4, uniqueItems: true }),
  schemaVersion: Type.Integer({ minimum: 1, maximum: 1000 }),
  payload: SystemControlStrategyPayloadSchema,
  baseVersionId: Type.Optional(Uuid), source: Type.Optional(Type.Union([Type.Literal('manual'), Type.Literal('candidate')])),
  evaluationRunId: Type.Optional(Uuid), candidateDigest: Type.Optional(Digest),
}, { additionalProperties: false });
export type SystemControlStrategyCreateArtifactBody = Static<typeof SystemControlStrategyCreateArtifactBodySchema>;

export const SystemControlStrategyCreateVersionBodySchema = Type.Object({
  versionId: Uuid, schemaVersion: Type.Integer({ minimum: 1, maximum: 1000 }), payload: SystemControlStrategyPayloadSchema,
  baseVersionId: Type.Optional(Uuid),
  source: Type.Optional(Type.Union([Type.Literal('manual'), Type.Literal('candidate')])),
  evaluationRunId: Type.Optional(Uuid), candidateDigest: Type.Optional(Digest),
}, { additionalProperties: false });
export type SystemControlStrategyCreateVersionBody = Static<typeof SystemControlStrategyCreateVersionBodySchema>;

const Sort = Type.Optional(Type.Union([Type.Literal('updated_desc'), Type.Literal('updated_asc'), Type.Literal('kind_asc'), Type.Literal('name_asc')]));
export const SystemControlStrategyArtifactListQuerySchema = Type.Object({
  kind: Type.Optional(SystemControlStrategyArtifactKindSchema), status: Type.Optional(SystemControlStrategyArtifactStatusSchema), applicableModule: Type.Optional(SystemControlStrategyModuleSchema),
  search: Type.Optional(Type.String({ maxLength: 120 })), sort: Sort, limit: PageLimit, offset: PageOffset,
}, { additionalProperties: false });
export type SystemControlStrategyArtifactListQuery = Static<typeof SystemControlStrategyArtifactListQuerySchema>;

export const SystemControlStrategyVersionListQuerySchema = Type.Object({ limit: PageLimit, offset: PageOffset }, { additionalProperties: false });
export type SystemControlStrategyVersionListQuery = Static<typeof SystemControlStrategyVersionListQuerySchema>;

export const SystemControlStrategyEventDomainSchema = Type.Union([
  Type.Literal('terms'), Type.Literal('pre_review'), Type.Literal('screen_text'), Type.Literal('subtitle_acceptance'),
]);
export type SystemControlStrategyEventDomain = Static<typeof SystemControlStrategyEventDomainSchema>;
export const SystemControlStrategyEventListQuerySchema = Type.Object({
  domain: Type.Optional(SystemControlStrategyEventDomainSchema), projectId: Type.Optional(Uuid), action: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
  search: Type.Optional(Type.String({ maxLength: 120 })), from: Type.Optional(Timestamp), to: Type.Optional(Timestamp),
  sort: Type.Optional(Type.Union([Type.Literal('created_desc'), Type.Literal('created_asc'), Type.Literal('domain_asc'), Type.Literal('action_asc')])),
  limit: PageLimit, offset: PageOffset,
}, { additionalProperties: false });
export type SystemControlStrategyEventListQuery = Static<typeof SystemControlStrategyEventListQuerySchema>;

export const SystemControlStrategyEventSchema = Type.Object({
  eventRefId: Type.String({ minLength: 3, maxLength: 220 }), domain: SystemControlStrategyEventDomainSchema,
  projectId: Type.Union([Uuid, Type.Null()]), episodeNumber: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  track: Type.Union([Type.String({ minLength: 1, maxLength: 40 }), Type.Null()]), action: Type.String({ minLength: 1, maxLength: 80 }),
  sourceVersionId: Type.Union([Uuid, Type.Null()]), artifactVersionId: Type.Union([Uuid, Type.Null()]), createdAt: Timestamp,
  beforeDigest: Type.Union([Digest, Type.Null()]), afterDigest: Type.Union([Digest, Type.Null()]),
  changedFields: Type.Array(Type.String({ minLength: 1, maxLength: 80 }), { maxItems: 32 }), evidenceCount: Type.Integer({ minimum: 0 }),
  reversesEventRefId: Type.Union([Type.String({ minLength: 3, maxLength: 220 }), Type.Null()]),
  restoresEventRefId: Type.Union([Type.String({ minLength: 3, maxLength: 220 }), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlStrategyEvent = Static<typeof SystemControlStrategyEventSchema>;
export const SystemControlStrategyEventListSchema = Type.Object({ items: Type.Array(SystemControlStrategyEventSchema), total: Type.Integer({ minimum: 0 }), limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }) }, { additionalProperties: false });
export type SystemControlStrategyEventList = Static<typeof SystemControlStrategyEventListSchema>;

export const SystemControlStrategyArtifactSchema = Type.Object({
  artifactId: Uuid, kind: SystemControlStrategyArtifactKindSchema, displayName: Type.String(), status: SystemControlStrategyArtifactStatusSchema,
  purpose: Type.String(), applicableModules: Type.Array(SystemControlStrategyModuleSchema), latestVersionId: Type.Union([Uuid, Type.Null()]), versionCount: Type.Integer({ minimum: 0 }),
  latestVersionSummary: Type.Union([Type.String({ maxLength: 200 }), Type.Null()]), createdAt: Timestamp, updatedAt: Timestamp,
}, { additionalProperties: false });
export type SystemControlStrategyArtifact = Static<typeof SystemControlStrategyArtifactSchema>;
export const SystemControlStrategyArtifactListSchema = Type.Object({ items: Type.Array(SystemControlStrategyArtifactSchema), total: Type.Integer({ minimum: 0 }), limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }) }, { additionalProperties: false });
export type SystemControlStrategyArtifactList = Static<typeof SystemControlStrategyArtifactListSchema>;
export const SystemControlStrategyVersionSchema = Type.Object({
  versionId: Uuid, artifactId: Uuid, version: Type.Integer({ minimum: 1 }), schemaVersion: Type.Integer({ minimum: 1 }), status: SystemControlStrategyArtifactStatusSchema,
  contentDigest: Digest, versionSummary: Type.String({ maxLength: 200 }), payload: SystemControlStrategyPayloadSchema,
  baseVersionId: Type.Union([Uuid, Type.Null()]), source: Type.Union([Type.Literal('manual'), Type.Literal('system_baseline'), Type.Literal('candidate')]),
  evaluationRunId: Type.Union([Uuid, Type.Null()]), candidateDigest: Type.Union([Digest, Type.Null()]), createdAt: Timestamp,
}, { additionalProperties: false });
export type SystemControlStrategyVersion = Static<typeof SystemControlStrategyVersionSchema>;
export const SystemControlStrategyVersionListItemSchema = Type.Object({
  versionId: Uuid, artifactId: Uuid, version: Type.Integer({ minimum: 1 }), schemaVersion: Type.Integer({ minimum: 1 }), status: SystemControlStrategyArtifactStatusSchema,
  contentDigest: Digest, versionSummary: Type.String({ maxLength: 200 }), createdAt: Timestamp,
}, { additionalProperties: false });
export const SystemControlStrategyVersionListSchema = Type.Object({ items: Type.Array(SystemControlStrategyVersionListItemSchema), total: Type.Integer({ minimum: 0 }), limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }) }, { additionalProperties: false });
export type SystemControlStrategyVersionList = Static<typeof SystemControlStrategyVersionListSchema>;

const CnyAmount = Type.String({ pattern: '^(0|[1-9][0-9]{0,8})\\.[0-9]{6}$' });
const NullableTimestamp = Type.Union([Timestamp, Type.Null()]);

export const SystemControlOptimizationStatusSchema = Type.Union([
  Type.Literal('queued'), Type.Literal('running'), Type.Literal('succeeded'), Type.Literal('failed'), Type.Literal('unknown'),
]);
export type SystemControlOptimizationStatus = Static<typeof SystemControlOptimizationStatusSchema>;

export const SystemControlCreateOptimizationRunBodySchema = Type.Object({
  runId: Uuid,
  artifactId: Uuid,
  baseVersionId: Uuid,
  module: SystemControlStrategyModuleSchema,
  projectId: Type.Union([Uuid, Type.Null()]),
  from: Type.Union([Timestamp, Type.Null()]),
  to: Type.Union([Timestamp, Type.Null()]),
  minEvidenceCount: Type.Integer({ minimum: 0, maximum: 10000 }),
  maxEvents: Type.Integer({ minimum: 1, maximum: 100 }),
  budgetCny: CnyAmount,
}, { additionalProperties: false });
export type SystemControlCreateOptimizationRunBody = Static<typeof SystemControlCreateOptimizationRunBodySchema>;

export const SystemControlOptimizationRunSchema = Type.Object({
  runId: Uuid,
  artifactId: Uuid,
  baseVersionId: Uuid,
  module: SystemControlStrategyModuleSchema,
  projectId: Type.Union([Uuid, Type.Null()]),
  from: Type.Union([Timestamp, Type.Null()]),
  to: Timestamp,
  minEvidenceCount: Type.Integer({ minimum: 0 }),
  maxEvents: Type.Integer({ minimum: 1, maximum: 100 }),
  budgetCny: CnyAmount,
  actualCostCny: Type.Union([CnyAmount, Type.Null()]),
  analyzerKey: Type.Literal('deterministic_local_v1'),
  status: SystemControlOptimizationStatusSchema,
  inputDigest: Digest,
  eventSnapshotDigest: Type.Union([Digest, Type.Null()]),
  eventCount: Type.Integer({ minimum: 0 }),
  candidateCount: Type.Integer({ minimum: 0 }),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  failureReason: Type.Union([Type.String({ minLength: 1, maxLength: 240 }), Type.Null()]),
  createdAt: Timestamp,
  startedAt: NullableTimestamp,
  completedAt: NullableTimestamp,
}, { additionalProperties: false });
export type SystemControlOptimizationRun = Static<typeof SystemControlOptimizationRunSchema>;

export const SystemControlOptimizationRunListQuerySchema = Type.Object({
  artifactId: Type.Optional(Uuid), module: Type.Optional(SystemControlStrategyModuleSchema),
  status: Type.Optional(SystemControlOptimizationStatusSchema), limit: PageLimit, offset: PageOffset,
}, { additionalProperties: false });
export type SystemControlOptimizationRunListQuery = Static<typeof SystemControlOptimizationRunListQuerySchema>;
export const SystemControlOptimizationRunListSchema = Type.Object({ items: Type.Array(SystemControlOptimizationRunSchema), total: Type.Integer({ minimum: 0 }), limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }) }, { additionalProperties: false });
export type SystemControlOptimizationRunList = Static<typeof SystemControlOptimizationRunListSchema>;

export const SystemControlStrategyCandidateKindSchema = Type.Union([
  Type.Literal('rule_review'), Type.Literal('risk_review'), Type.Literal('prompt_review'), Type.Literal('test_case'),
]);
export const SystemControlStrategyCandidateStatusSchema = Type.Union([
  Type.Literal('proposed'), Type.Literal('edited'), Type.Literal('rejected'), Type.Literal('evaluation_ready'),
]);
export const SystemControlStrategyCandidateProposalSchema = Type.Object({
  operation: Type.Literal('review_when_changed'),
  target: Type.String({ minLength: 1, maxLength: 80 }),
  value: Type.String({ minLength: 1, maxLength: 240 }),
  notes: Type.String({ maxLength: 500 }),
}, { additionalProperties: false });
export type SystemControlStrategyCandidateProposal = Static<typeof SystemControlStrategyCandidateProposalSchema>;

export const SystemControlStrategyCandidateSchema = Type.Object({
  candidateId: Uuid, runId: Uuid, artifactId: Uuid, baseVersionId: Uuid, sourceEventRefId: Type.String({ minLength: 3, maxLength: 220 }),
  kind: SystemControlStrategyCandidateKindSchema, status: SystemControlStrategyCandidateStatusSchema,
  revision: Type.Integer({ minimum: 1 }), module: SystemControlStrategyModuleSchema,
  title: Type.String({ minLength: 1, maxLength: 200 }), rationale: Type.String({ minLength: 1, maxLength: 500 }),
  proposal: SystemControlStrategyCandidateProposalSchema,
  supportCount: Type.Integer({ minimum: 0 }), opposeCount: Type.Integer({ minimum: 0 }), unknownCount: Type.Integer({ minimum: 0 }),
  evidenceDigest: Digest, createdAt: Timestamp, updatedAt: Timestamp,
}, { additionalProperties: false });
export type SystemControlStrategyCandidate = Static<typeof SystemControlStrategyCandidateSchema>;

export const SystemControlStrategyCandidateDecisionResultSchema = Type.Object({
  decisionId: Uuid, candidateId: Uuid,
  action: Type.Union([Type.Literal('edit'), Type.Literal('reject'), Type.Literal('restore'), Type.Literal('send_to_evaluation')]),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  afterSnapshot: SystemControlStrategyCandidateSchema,
}, { additionalProperties: false });
export type SystemControlStrategyCandidateDecisionResult = Static<typeof SystemControlStrategyCandidateDecisionResultSchema>;

export const SystemControlStrategyCandidateListQuerySchema = Type.Object({
  runId: Type.Optional(Uuid), status: Type.Optional(SystemControlStrategyCandidateStatusSchema), limit: PageLimit, offset: PageOffset,
}, { additionalProperties: false });
export type SystemControlStrategyCandidateListQuery = Static<typeof SystemControlStrategyCandidateListQuerySchema>;
export const SystemControlStrategyCandidateListSchema = Type.Object({ items: Type.Array(SystemControlStrategyCandidateSchema), total: Type.Integer({ minimum: 0 }), limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }) }, { additionalProperties: false });
export type SystemControlStrategyCandidateList = Static<typeof SystemControlStrategyCandidateListSchema>;

export const SystemControlStrategyCandidateDecisionBodySchema = Type.Object({
  decisionId: Uuid, expectedRevision: Type.Integer({ minimum: 1 }),
  action: Type.Union([Type.Literal('edit'), Type.Literal('reject'), Type.Literal('restore'), Type.Literal('send_to_evaluation')]),
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  rationale: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
  proposal: Type.Optional(SystemControlStrategyCandidateProposalSchema),
}, { additionalProperties: false });
export type SystemControlStrategyCandidateDecisionBody = Static<typeof SystemControlStrategyCandidateDecisionBodySchema>;

export const SystemControlCreateEvaluationRunBodySchema = Type.Object({
  evaluationRunId: Uuid,
  candidateIds: Type.Array(Uuid, { minItems: 1, maxItems: 50, uniqueItems: true }),
  budgetCny: CnyAmount,
}, { additionalProperties: false });
export type SystemControlCreateEvaluationRunBody = Static<typeof SystemControlCreateEvaluationRunBodySchema>;

export const SystemControlEvaluationMetricsSchema = Type.Object({
  baselineManualReviewCount: Type.Integer({ minimum: 0 }), candidateManualReviewCount: Type.Integer({ minimum: 0 }),
  estimatedFalsePositiveCount: Type.Integer({ minimum: 0 }), estimatedFalseNegativeCount: Type.Integer({ minimum: 0 }),
  baselineHandlingSeconds: Type.Integer({ minimum: 0 }), candidateHandlingSeconds: Type.Integer({ minimum: 0 }),
  metricKind: Type.Literal('deterministic_proxy_v1'),
}, { additionalProperties: false });
export const SystemControlEvaluationRunSchema = Type.Object({
  evaluationRunId: Uuid, status: SystemControlOptimizationStatusSchema,
  candidateIds: Type.Array(Uuid, { minItems: 1, maxItems: 50 }), candidateDigest: Digest,
  budgetCny: CnyAmount, actualCostCny: Type.Union([CnyAmount, Type.Null()]),
  metrics: Type.Union([SystemControlEvaluationMetricsSchema, Type.Null()]),
  requestId: Type.String({ minLength: 1, maxLength: 255 }), failureReason: Type.Union([Type.String({ minLength: 1, maxLength: 240 }), Type.Null()]),
  createdAt: Timestamp, startedAt: NullableTimestamp, completedAt: NullableTimestamp,
}, { additionalProperties: false });
export type SystemControlEvaluationRun = Static<typeof SystemControlEvaluationRunSchema>;
export const SystemControlEvaluationRunListQuerySchema = Type.Object({ status: Type.Optional(SystemControlOptimizationStatusSchema), limit: PageLimit, offset: PageOffset }, { additionalProperties: false });
export type SystemControlEvaluationRunListQuery = Static<typeof SystemControlEvaluationRunListQuerySchema>;
export const SystemControlEvaluationRunListSchema = Type.Object({ items: Type.Array(SystemControlEvaluationRunSchema), total: Type.Integer({ minimum: 0 }), limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }) }, { additionalProperties: false });
export type SystemControlEvaluationRunList = Static<typeof SystemControlEvaluationRunListSchema>;
