import { Type, type Static } from '@sinclair/typebox';
import { SystemControlEngineCapabilitySchema, SystemControlEngineStatusSchema } from './system-control.js';

const Timestamp = () => Type.String({ format: 'date-time' });
const UUID = () => Type.String({ format: 'uuid' });

export const SystemControlSecretReferenceStatusSchema = Type.Union([
  Type.Literal('available'),
  Type.Literal('validation_failed'),
  Type.Literal('unknown'),
  Type.Literal('rotation_due'),
  Type.Literal('revoked'),
]);
export type SystemControlSecretReferenceStatus = Static<typeof SystemControlSecretReferenceStatusSchema>;

export const SystemControlSecretValidationStatusSchema = Type.Union([
  Type.Literal('queued'),
  Type.Literal('running'),
  Type.Literal('succeeded'),
  Type.Literal('failed'),
  Type.Literal('unknown'),
]);
export type SystemControlSecretValidationStatus = Static<typeof SystemControlSecretValidationStatusSchema>;

export const SystemControlSecretProviderStatusSchema = Type.Union([
  Type.Literal('ready'),
  Type.Literal('not_configured'),
  Type.Literal('unknown'),
]);
export type SystemControlSecretProviderStatus = Static<typeof SystemControlSecretProviderStatusSchema>;

export const SystemControlAccessReadinessStatusSchema = Type.Union([
  Type.Literal('ready'),
  Type.Literal('not_configured'),
  Type.Literal('unknown'),
]);

export const SystemControlAccessReadinessSchema = Type.Object({
  status: SystemControlAccessReadinessStatusSchema,
  employeeAudienceConfigured: Type.Boolean(),
  controlAudienceConfigured: Type.Boolean(),
  issuerConfigured: Type.Boolean(),
  observedAt: Type.Union([Timestamp(), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlAccessReadiness = Static<typeof SystemControlAccessReadinessSchema>;

export const SystemControlSecretDiscoveryCandidateSchema = Type.Object({
  candidateId: UUID(),
  displayName: Type.String({ minLength: 1, maxLength: 120 }),
  environment: Type.Literal('development'),
  capability: SystemControlEngineCapabilitySchema,
  provider: Type.String({ minLength: 1, maxLength: 80 }),
  redactedLabel: Type.String({ minLength: 1, maxLength: 80 }),
  status: Type.Union([Type.Literal('available'), Type.Literal('unknown')]),
  discoveredAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlSecretDiscoveryCandidate = Static<typeof SystemControlSecretDiscoveryCandidateSchema>;

export const SystemControlSecretDiscoveryQuerySchema = Type.Object({
  environment: Type.Optional(Type.Literal('development')),
  capability: Type.Optional(SystemControlEngineCapabilitySchema),
  provider: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
  search: Type.Optional(Type.String({ maxLength: 120 })),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlSecretDiscoveryQuery = Static<typeof SystemControlSecretDiscoveryQuerySchema>;

export const SystemControlSecretDiscoveryListSchema = Type.Object({
  items: Type.Array(SystemControlSecretDiscoveryCandidateSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
  providerStatus: SystemControlSecretProviderStatusSchema,
  observedAt: Type.Union([Timestamp(), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlSecretDiscoveryList = Static<typeof SystemControlSecretDiscoveryListSchema>;

export const SystemControlSecretReferenceSchema = Type.Object({
  secretReferenceId: UUID(),
  environment: Type.Literal('development'),
  capability: SystemControlEngineCapabilitySchema,
  provider: Type.String({ minLength: 1, maxLength: 80 }),
  displayName: Type.String({ minLength: 1, maxLength: 120 }),
  createdAt: Timestamp(),
  updatedAt: Timestamp(),
  latestVersionId: Type.Union([UUID(), Type.Null()]),
  latestStatus: Type.Union([SystemControlSecretReferenceStatusSchema, Type.Null()]),
  boundDeploymentCount: Type.Integer({ minimum: 0 }),
  latestValidationAt: Type.Union([Timestamp(), Type.Null()]),
  rotationDueAt: Type.Union([Timestamp(), Type.Null()]),
  rotationDue: Type.Boolean(),
}, { additionalProperties: false });
export type SystemControlSecretReference = Static<typeof SystemControlSecretReferenceSchema>;

export const SystemControlSecretReferenceVersionSchema = Type.Object({
  secretReferenceVersionId: UUID(),
  secretReferenceId: UUID(),
  version: Type.Integer({ minimum: 1 }),
  environment: Type.Literal('development'),
  capability: SystemControlEngineCapabilitySchema,
  provider: Type.String({ minLength: 1, maxLength: 80 }),
  redactedLabel: Type.String({ minLength: 1, maxLength: 80 }),
  referenceDigest: Type.String({ minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' }),
  status: SystemControlSecretReferenceStatusSchema,
  createdAt: Timestamp(),
  validatedAt: Type.Union([Timestamp(), Type.Null()]),
  revokedAt: Type.Union([Timestamp(), Type.Null()]),
  rotationDueAt: Type.Union([Timestamp(), Type.Null()]),
  rotationDue: Type.Boolean(),
}, { additionalProperties: false });
export type SystemControlSecretReferenceVersion = Static<typeof SystemControlSecretReferenceVersionSchema>;

export const SystemControlSecretReferenceListQuerySchema = Type.Object({
  capability: Type.Optional(SystemControlEngineCapabilitySchema),
  provider: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
  search: Type.Optional(Type.String({ maxLength: 120 })),
  status: Type.Optional(SystemControlSecretReferenceStatusSchema),
  sort: Type.Optional(Type.Union([
    Type.Literal('created_desc'),
    Type.Literal('created_asc'),
    Type.Literal('updated_desc'),
    Type.Literal('updated_asc'),
    Type.Literal('display_name_asc'),
    Type.Literal('display_name_desc'),
    Type.Literal('validation_desc'),
  ])),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlSecretReferenceListQuery = Static<typeof SystemControlSecretReferenceListQuerySchema>;

export const SystemControlSecretPageQuerySchema = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlSecretPageQuery = Static<typeof SystemControlSecretPageQuerySchema>;

export const SystemControlSecretReferenceListSchema = Type.Object({
  items: Type.Array(SystemControlSecretReferenceSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlSecretReferenceList = Static<typeof SystemControlSecretReferenceListSchema>;

export const SystemControlSecretReferenceVersionListSchema = Type.Object({
  items: Type.Array(SystemControlSecretReferenceVersionSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlSecretReferenceVersionList = Static<typeof SystemControlSecretReferenceVersionListSchema>;

export const SystemControlCreateSecretReferenceBodySchema = Type.Object({
  commandId: UUID(),
  secretReferenceId: UUID(),
  secretReferenceVersionId: UUID(),
  candidateId: UUID(),
  displayName: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
}, { additionalProperties: false });
export type SystemControlCreateSecretReferenceBody = Static<typeof SystemControlCreateSecretReferenceBodySchema>;

export const SystemControlRotateSecretReferenceBodySchema = Type.Object({
  rotationCommandId: UUID(),
  secretReferenceVersionId: UUID(),
  candidateId: UUID(),
}, { additionalProperties: false });
export type SystemControlRotateSecretReferenceBody = Static<typeof SystemControlRotateSecretReferenceBodySchema>;

export const SystemControlRevokeSecretReferenceBodySchema = Type.Object({
  revokeCommandId: UUID(),
  reason: Type.String({ minLength: 8, maxLength: 240 }),
}, { additionalProperties: false });
export type SystemControlRevokeSecretReferenceBody = Static<typeof SystemControlRevokeSecretReferenceBodySchema>;

export const SystemControlSecretCommandSchema = Type.Object({
  commandId: UUID(),
  action: Type.Union([Type.Literal('created'), Type.Literal('rotated'), Type.Literal('revoked')]),
  secretReferenceId: UUID(),
  secretReferenceVersionId: UUID(),
  status: Type.Literal('succeeded'),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlSecretCommand = Static<typeof SystemControlSecretCommandSchema>;

export const SystemControlCreateSecretValidationBodySchema = Type.Object({
  validationRunId: UUID(),
  secretReferenceVersionId: UUID(),
}, { additionalProperties: false });
export type SystemControlCreateSecretValidationBody = Static<typeof SystemControlCreateSecretValidationBodySchema>;

export const SystemControlSecretValidationAttemptSchema = Type.Object({
  attemptNumber: Type.Integer({ minimum: 1 }),
  status: SystemControlSecretValidationStatusSchema,
  latencyMs: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  reasonCode: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  reasonMessage: Type.Union([Type.String({ minLength: 1, maxLength: 240 }), Type.Null()]),
  startedAt: Type.Union([Timestamp(), Type.Null()]),
  completedAt: Type.Union([Timestamp(), Type.Null()]),
}, { additionalProperties: false });

export const SystemControlSecretValidationSchema = Type.Object({
  validationRunId: UUID(),
  secretReferenceVersionId: UUID(),
  status: SystemControlSecretValidationStatusSchema,
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  attemptCount: Type.Integer({ minimum: 0 }),
  latencyMs: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  reasonCode: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  reasonMessage: Type.Union([Type.String({ minLength: 1, maxLength: 240 }), Type.Null()]),
  queuedAt: Timestamp(),
  startedAt: Type.Union([Timestamp(), Type.Null()]),
  completedAt: Type.Union([Timestamp(), Type.Null()]),
  attempts: Type.Array(SystemControlSecretValidationAttemptSchema),
}, { additionalProperties: false });
export type SystemControlSecretValidation = Static<typeof SystemControlSecretValidationSchema>;

export const SystemControlSecretValidationListQuerySchema = Type.Object({
  status: Type.Optional(SystemControlSecretValidationStatusSchema),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlSecretValidationListQuery = Static<typeof SystemControlSecretValidationListQuerySchema>;

export const SystemControlSecretValidationListSchema = Type.Object({
  items: Type.Array(SystemControlSecretValidationSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlSecretValidationList = Static<typeof SystemControlSecretValidationListSchema>;

export const SystemControlSecretUsageSchema = Type.Object({
  deploymentId: UUID(),
  deploymentVersionId: UUID(),
  deploymentVersion: Type.Integer({ minimum: 1 }),
  deploymentDisplayName: Type.String({ minLength: 1, maxLength: 200 }),
  deploymentStatus: SystemControlEngineStatusSchema,
  capability: SystemControlEngineCapabilitySchema,
  provider: Type.String({ minLength: 1, maxLength: 80 }),
  secretReferenceVersionId: UUID(),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlSecretUsage = Static<typeof SystemControlSecretUsageSchema>;

export const SystemControlSecretUsageListQuerySchema = Type.Object({
  versionId: Type.Optional(UUID()),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlSecretUsageListQuery = Static<typeof SystemControlSecretUsageListQuerySchema>;

export const SystemControlSecretUsageListSchema = Type.Object({
  items: Type.Array(SystemControlSecretUsageSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlSecretUsageList = Static<typeof SystemControlSecretUsageListSchema>;

export const SystemControlSecretAuditEventSchema = Type.Object({
  eventId: UUID(),
  action: Type.String({ minLength: 1, maxLength: 120 }),
  resourceType: Type.String({ minLength: 1, maxLength: 80 }),
  resourceId: Type.Union([UUID(), Type.Null()]),
  actorSubject: Type.String({ minLength: 1, maxLength: 255 }),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  result: Type.String({ minLength: 1, maxLength: 80 }),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlSecretAuditEvent = Static<typeof SystemControlSecretAuditEventSchema>;

export const SystemControlSecretAuditListQuerySchema = Type.Object({
  versionId: Type.Optional(UUID()),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlSecretAuditListQuery = Static<typeof SystemControlSecretAuditListQuerySchema>;

export const SystemControlSecretAuditListSchema = Type.Object({
  items: Type.Array(SystemControlSecretAuditEventSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlSecretAuditList = Static<typeof SystemControlSecretAuditListSchema>;

export const SystemControlSecretRevokePreflightSchema = Type.Object({
  secretReferenceId: UUID(),
  secretReferenceVersionId: UUID(),
  currentStatus: SystemControlSecretReferenceStatusSchema,
  activeRouteReferenceCount: Type.Integer({ minimum: 0 }),
  nonTerminalAttemptCount: Type.Integer({ minimum: 0 }),
  affectedEngineDeploymentVersionCount: Type.Integer({ minimum: 0 }),
  affectedEngineVersions: Type.Array(SystemControlSecretUsageSchema, { maxItems: 100 }),
  truncated: Type.Boolean(),
  canRevoke: Type.Boolean(),
  checkedAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlSecretRevokePreflight = Static<typeof SystemControlSecretRevokePreflightSchema>;

export const SystemControlSecretCommandIdParamsSchema = Type.Object({ commandId: UUID() }, { additionalProperties: false });

export const SystemControlSecurityOverviewSchema = Type.Object({
  generatedAt: Timestamp(),
  access: SystemControlAccessReadinessSchema,
  provider: Type.Object({
    status: SystemControlSecretProviderStatusSchema,
    observedAt: Type.Union([Timestamp(), Type.Null()]),
  }, { additionalProperties: false }),
}, { additionalProperties: false });
export type SystemControlSecurityOverview = Static<typeof SystemControlSecurityOverviewSchema>;
