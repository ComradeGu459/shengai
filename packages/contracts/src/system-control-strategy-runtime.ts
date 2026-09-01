import { Static, Type } from '@sinclair/typebox';
import { SystemControlPreReviewRulePackSchema } from './system-control-strategy.js';

const Uuid = Type.String({ format: 'uuid' });
const Timestamp = Type.String({ format: 'date-time' });
const Digest = Type.String({ pattern: '^[0-9a-f]{64}$' });
const PageLimit = Type.Optional(Type.String({ pattern: '^(?:[1-9][0-9]?|100)$' }));
const PageOffset = Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,6})$' }));

export { SystemControlPreReviewRulePackSchema } from './system-control-strategy.js';
export type { SystemControlPreReviewRulePack } from './system-control-strategy.js';

export const SystemControlStrategyRuntimeModuleSchema = Type.Literal('pre_review');
export const SystemControlStrategyRuntimeOriginSchema = Type.Union([
  Type.Literal('system_baseline'), Type.Literal('custom_draft'),
]);
export const SystemControlStrategyRuntimeStatusSchema = Type.Union([
  Type.Literal('draft'), Type.Literal('testing'), Type.Literal('impact_checked'),
  Type.Literal('approved'), Type.Literal('active'), Type.Literal('retired'),
]);

export const SystemControlStrategyRuntimeVersionSchema = Type.Object({
  strategyVersionId: Uuid,
  module: SystemControlStrategyRuntimeModuleSchema,
  origin: SystemControlStrategyRuntimeOriginSchema,
  status: SystemControlStrategyRuntimeStatusSchema,
  contentDigest: Digest,
  baseVersionId: Type.Union([Uuid, Type.Null()]),
  source: Type.Union([Type.Literal('manual'), Type.Literal('system_baseline'), Type.Literal('candidate')]),
  evaluationRunId: Type.Union([Uuid, Type.Null()]),
  candidateDigest: Type.Union([Digest, Type.Null()]),
  rulePack: SystemControlPreReviewRulePackSchema,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}, { additionalProperties: false });
export type SystemControlStrategyRuntimeVersion = Static<typeof SystemControlStrategyRuntimeVersionSchema>;

export const SystemControlStrategyRuntimeTargetSchema = Type.Object({
  module: SystemControlStrategyRuntimeModuleSchema,
  active: Type.Union([SystemControlStrategyRuntimeVersionSchema, Type.Null()]),
}, { additionalProperties: false });
export type SystemControlStrategyRuntimeTarget = Static<typeof SystemControlStrategyRuntimeTargetSchema>;

export const SystemControlStrategyBaselinePreviewSchema = Type.Object({
  module: SystemControlStrategyRuntimeModuleSchema,
  origin: Type.Literal('system_baseline'),
  contentDigest: Digest,
  rulePack: SystemControlPreReviewRulePackSchema,
  imported: Type.Boolean(),
  strategyVersionId: Type.Union([Uuid, Type.Null()]),
}, { additionalProperties: false });
export type SystemControlStrategyBaselinePreview = Static<typeof SystemControlStrategyBaselinePreviewSchema>;

export const SystemControlStrategyBaselineImportBodySchema = Type.Object({
  baselineImportId: Uuid, artifactId: Uuid, versionId: Uuid,
}, { additionalProperties: false });
export type SystemControlStrategyBaselineImportBody = Static<typeof SystemControlStrategyBaselineImportBodySchema>;

export const SystemControlStrategyImpactRunBodySchema = Type.Object({
  impactRunId: Uuid,
  strategyVersionId: Uuid,
}, { additionalProperties: false });
export type SystemControlStrategyImpactRunBody = Static<typeof SystemControlStrategyImpactRunBodySchema>;

export const SystemControlStrategyImpactRunSchema = Type.Object({
  impactRunId: Uuid,
  strategyVersionId: Uuid,
  status: Type.Union([Type.Literal('queued'), Type.Literal('running'), Type.Literal('succeeded'), Type.Literal('failed'), Type.Literal('unknown')]),
  snapshotId: Uuid,
  blockers: Type.Array(Type.String({ minLength: 1, maxLength: 120 })),
  oldUnboundSessionCount: Type.Integer({ minimum: 0 }),
  affectedSessionCount: Type.Integer({ minimum: 0 }), sampleCount: Type.Integer({ minimum: 0 }),
  coverage: Type.Record(Type.String({ maxLength: 80 }), Type.Unknown()),
  fieldDifferences: Type.Array(Type.Object({ field: Type.String({ minLength: 1, maxLength: 80 }), current: Type.Unknown(), candidate: Type.Unknown() }, { additionalProperties: false }), { maxItems: 64 }),
  invariantResults: Type.Object({ oneToOne: Type.Union([Type.Literal('pass'), Type.Literal('fail'), Type.Literal('unknown')]), asrQuality: Type.Union([Type.Literal('pass'), Type.Literal('fail'), Type.Literal('unknown')]), blockingFormat: Type.Union([Type.Literal('pass'), Type.Literal('fail'), Type.Literal('unknown')]), termConflicts: Type.Union([Type.Literal('pass'), Type.Literal('fail'), Type.Literal('unknown')]) }, { additionalProperties: false }),
  snapshotDigest: Digest,
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  startedAt: Type.Union([Timestamp, Type.Null()]), completedAt: Type.Union([Timestamp, Type.Null()]),
  createdAt: Timestamp,
}, { additionalProperties: false });
export type SystemControlStrategyImpactRun = Static<typeof SystemControlStrategyImpactRunSchema>;

export const SystemControlStrategyApprovalBodySchema = Type.Object({
  approvalId: Uuid,
  impactRunId: Uuid,
  strategyVersionId: Uuid,
}, { additionalProperties: false });
export type SystemControlStrategyApprovalBody = Static<typeof SystemControlStrategyApprovalBodySchema>;

export const SystemControlStrategyApprovalSchema = Type.Object({
  approvalId: Uuid,
  impactRunId: Uuid,
  strategyVersionId: Uuid,
  status: Type.Literal('approved'),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  createdAt: Timestamp,
}, { additionalProperties: false });
export type SystemControlStrategyApproval = Static<typeof SystemControlStrategyApprovalSchema>;

export const SystemControlStrategyReleaseBodySchema = Type.Object({
  releaseCommandId: Uuid,
  action: Type.Union([Type.Literal('publish'), Type.Literal('rollback')]),
  strategyVersionId: Uuid,
  expectedPreviousStrategyVersionId: Type.Union([Uuid, Type.Null()]),
  impactRunId: Uuid, approvalId: Uuid, contentDigest: Digest,
}, { additionalProperties: false });
export type SystemControlStrategyReleaseBody = Static<typeof SystemControlStrategyReleaseBodySchema>;

export const SystemControlStrategyReleaseCommandSchema = Type.Object({
  releaseCommandId: Uuid,
  action: Type.Union([Type.Literal('publish'), Type.Literal('rollback')]),
  strategyVersionId: Uuid,
  status: Type.Union([Type.Literal('succeeded'), Type.Literal('failed'), Type.Literal('unknown')]),
  previousStrategyVersionId: Type.Union([Uuid, Type.Null()]),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  createdAt: Timestamp,
}, { additionalProperties: false });
export type SystemControlStrategyReleaseCommand = Static<typeof SystemControlStrategyReleaseCommandSchema>;

export const SystemControlStrategyHistoryQuerySchema = Type.Object({ limit: PageLimit, offset: PageOffset }, { additionalProperties: false });
export type SystemControlStrategyHistoryQuery = Static<typeof SystemControlStrategyHistoryQuerySchema>;
const RuntimeImpactHistorySchema = Type.Object({
  impactRunId: Uuid, status: Type.Union([Type.Literal('queued'), Type.Literal('running'), Type.Literal('succeeded'), Type.Literal('failed'), Type.Literal('unknown')]),
  contentDigest: Digest, snapshotDigest: Digest, createdAt: Timestamp, completedAt: Type.Union([Timestamp, Type.Null()]),
}, { additionalProperties: false });
const RuntimeApprovalHistorySchema = Type.Object({ approvalId: Uuid, impactRunId: Uuid, contentDigest: Digest, createdAt: Timestamp }, { additionalProperties: false });
const RuntimeReleaseHistorySchema = Type.Object({
  eventId: Uuid, releaseCommandId: Uuid, action: Type.Union([Type.Literal('publish'), Type.Literal('rollback')]),
  strategyVersionId: Uuid, previousStrategyVersionId: Type.Union([Uuid, Type.Null()]), createdAt: Timestamp,
}, { additionalProperties: false });
const RuntimeHistoryItemSchema = Type.Object({
  strategyVersionId: Uuid, origin: SystemControlStrategyRuntimeOriginSchema,
  status: SystemControlStrategyRuntimeStatusSchema, contentDigest: Digest,
  baseVersionId: Type.Union([Uuid, Type.Null()]), source: Type.Union([Type.Literal('manual'), Type.Literal('system_baseline'), Type.Literal('candidate')]),
  evaluationRunId: Type.Union([Uuid, Type.Null()]), candidateDigest: Type.Union([Digest, Type.Null()]),
  impacts: Type.Array(RuntimeImpactHistorySchema), approvals: Type.Array(RuntimeApprovalHistorySchema), releaseEvents: Type.Array(RuntimeReleaseHistorySchema),
  createdAt: Timestamp, updatedAt: Timestamp,
}, { additionalProperties: false });
export const SystemControlStrategyHistorySchema = Type.Object({
  items: Type.Array(RuntimeHistoryItemSchema),
  total: Type.Integer({ minimum: 0 }), limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlStrategyHistory = Static<typeof SystemControlStrategyHistorySchema>;
