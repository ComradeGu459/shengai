import { Type, type Static } from '@sinclair/typebox';

const Timestamp = () => Type.String({ format: 'date-time' });
const DecimalString = Type.String({ pattern: '^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?$' });
const NullableUuid = Type.Union([Type.String({ format: 'uuid' }), Type.Null()]);
const NullableString = (maxLength = 255) => Type.Union([Type.String({ minLength: 1, maxLength }), Type.Null()]);
const NullableInteger = (maximum: number) => Type.Union([Type.Integer({ minimum: 1, maximum }), Type.Null()]);
const EffectClassSchema = Type.Union([
  Type.Literal('completed'),
  Type.Literal('external_not_accepted'),
  Type.Literal('unauthorized'),
  Type.Literal('external_unknown'),
  Type.Literal('quality_rejected'),
  Type.Literal('cancelled'),
  Type.Null(),
]);

export const SystemControlOperationsEnvironmentSchema = Type.Literal('development');
export type SystemControlOperationsEnvironment = Static<typeof SystemControlOperationsEnvironmentSchema>;

export const SystemControlOperationsDomainSchema = Type.Union([
  Type.Literal('asr'),
  Type.Literal('screen_text'),
  Type.Literal('delivery'),
  Type.Literal('system_control'),
  Type.Literal('upload'),
  Type.Literal('terms'),
]);
export type SystemControlOperationsDomain = Static<typeof SystemControlOperationsDomainSchema>;

export const SystemControlOperationsSortSchema = Type.Union([
  Type.Literal('updated_desc'),
  Type.Literal('updated_asc'),
  Type.Literal('status_asc'),
  Type.Literal('domain_asc'),
]);
export type SystemControlOperationsSort = Static<typeof SystemControlOperationsSortSchema>;

export const SystemControlOperationsListQuerySchema = Type.Object({
  environment: Type.Optional(SystemControlOperationsEnvironmentSchema),
  domain: Type.Optional(SystemControlOperationsDomainSchema),
  projectId: Type.Optional(Type.String({ format: 'uuid' })),
  status: Type.Optional(Type.String({ minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9_.:-]+$' })),
  search: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  from: Type.Optional(Timestamp()),
  to: Type.Optional(Timestamp()),
  sort: Type.Optional(SystemControlOperationsSortSchema),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlOperationsListQuery = Static<typeof SystemControlOperationsListQuerySchema>;

export const SystemControlOperationErrorSchema = Type.Object({
  code: Type.String({ minLength: 1, maxLength: 100, pattern: '^[A-Z0-9_.:-]+$' }),
  reason: Type.Union([Type.String({ minLength: 1, maxLength: 240 }), Type.Null()]),
  retryable: Type.Boolean(),
  reconciliationRequired: Type.Boolean(),
}, { additionalProperties: false });
export type SystemControlOperationError = Static<typeof SystemControlOperationErrorSchema>;

export const SystemControlOperationQualitySummarySchema = Type.Object({
  status: Type.Union([Type.String({ minLength: 1, maxLength: 40 }), Type.Null()]),
  cueCount: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  candidateCount: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  processingDurationMs: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlOperationQualitySummary = Static<typeof SystemControlOperationQualitySummarySchema>;

export const SystemControlOperationListItemSchema = Type.Object({
  operationId: Type.String({ minLength: 3, maxLength: 180, pattern: '^[a-z_]+:[0-9a-f-]{36}$' }),
  environment: SystemControlOperationsEnvironmentSchema,
  domain: SystemControlOperationsDomainSchema,
  projectId: NullableUuid,
  taskId: NullableUuid,
  jobId: NullableUuid,
  attemptId: NullableUuid,
  requestId: Type.Union([Type.String({ minLength: 1, maxLength: 255 }), Type.Null()]),
  status: Type.String({ minLength: 1, maxLength: 80 }),
  effectiveUpdatedAt: Timestamp(),
  amountCny: Type.Union([DecimalString, Type.Null()]),
  reconciliationStatus: Type.Union([Type.Literal('pending'), Type.Literal('final'), Type.Literal('unknown'), Type.Literal('reconciliation_required'), Type.Null()]),
  routeDigest: NullableString(128),
  routingTargetId: NullableUuid,
  targetPriority: NullableInteger(8),
  deploymentVersionId: NullableUuid,
  effectClass: EffectClassSchema,
}, { additionalProperties: false });
export type SystemControlOperationListItem = Static<typeof SystemControlOperationListItemSchema>;

export const SystemControlOperationAttemptSchema = Type.Object({
  attemptId: Type.String({ format: 'uuid' }),
  attemptNumber: Type.Integer({ minimum: 1 }),
  status: Type.String({ minLength: 1, maxLength: 80 }),
  requestId: NullableString(),
  routeDigest: NullableString(128),
  routingTargetId: NullableUuid,
  targetPriority: NullableInteger(8),
  deploymentVersionId: NullableUuid,
  effectClass: EffectClassSchema,
  providerRequestId: NullableString(),
  externalNotAccepted: Type.Boolean(),
  externalSideEffectPossible: Type.Boolean(),
  errorCode: NullableString(100),
  createdAt: Timestamp(),
  startedAt: Type.Union([Timestamp(), Type.Null()]),
  completedAt: Type.Union([Timestamp(), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlOperationAttempt = Static<typeof SystemControlOperationAttemptSchema>;

export const SystemControlRoutingAdvanceEventSchema = Type.Object({
  eventId: Type.String({ format: 'uuid' }),
  jobId: Type.String({ format: 'uuid' }),
  fromAttemptId: Type.String({ format: 'uuid' }),
  toAttemptId: NullableUuid,
  fromTargetId: Type.String({ format: 'uuid' }),
  toTargetId: Type.String({ format: 'uuid' }),
  fromTargetPriority: NullableInteger(8),
  toTargetPriority: NullableInteger(8),
  reasonCode: Type.String({ minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9_.:-]+$' }),
  providerRequestId: NullableString(),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  externalNotAccepted: Type.Boolean(),
  externalSideEffectPossible: Type.Boolean(),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlRoutingAdvanceEvent = Static<typeof SystemControlRoutingAdvanceEventSchema>;

export const SystemControlOperationDetailSchema = Type.Intersect([
  SystemControlOperationListItemSchema,
  Type.Object({
    providerRequestId: Type.Union([Type.String({ minLength: 1, maxLength: 255 }), Type.Null()]),
    engineDeploymentVersionId: NullableUuid,
    routingVersionId: NullableUuid,
    budgetPolicyVersionId: NullableUuid,
    conversionSnapshotId: NullableUuid,
    startedAt: Type.Union([Timestamp(), Type.Null()]),
    completedAt: Type.Union([Timestamp(), Type.Null()]),
    durationMs: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    qualitySummary: Type.Union([SystemControlOperationQualitySummarySchema, Type.Null()]),
    originalCurrency: Type.Union([Type.String({ minLength: 3, maxLength: 12 }), Type.Null()]),
    originalAmount: Type.Union([DecimalString, Type.Null()]),
    error: Type.Union([SystemControlOperationErrorSchema, Type.Null()]),
    attemptChain: Type.Array(SystemControlOperationAttemptSchema, { maxItems: 100 }),
    routingAdvanceEvents: Type.Array(SystemControlRoutingAdvanceEventSchema, { maxItems: 100 }),
  }, { additionalProperties: false }),
]);
export type SystemControlOperationDetail = Static<typeof SystemControlOperationDetailSchema>;

export const SystemControlOperationsListSchema = Type.Object({
  items: Type.Array(SystemControlOperationListItemSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
  databaseNow: Timestamp(),
  dataFreshness: Timestamp(),
}, { additionalProperties: false });
export type SystemControlOperationsList = Static<typeof SystemControlOperationsListSchema>;
