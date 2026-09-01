import { Type, type Static } from '@sinclair/typebox';

const Timestamp = () => Type.String({ format: 'date-time' });

export const SystemControlRuntimeEnvironmentSchema = Type.Literal('development');
export type SystemControlRuntimeEnvironment = Static<typeof SystemControlRuntimeEnvironmentSchema>;

export const SystemControlRuntimeResourceKindSchema = Type.Union([
  Type.Literal('application'),
  Type.Literal('worker'),
  Type.Literal('database'),
  Type.Literal('storage'),
]);
export type SystemControlRuntimeResourceKind = Static<typeof SystemControlRuntimeResourceKindSchema>;

export const SystemControlRuntimeHealthSchema = Type.Union([
  Type.Literal('healthy'),
  Type.Literal('degraded'),
  Type.Literal('failed'),
  Type.Literal('empty'),
  Type.Literal('unknown'),
  Type.Literal('not_configured'),
]);
export type SystemControlRuntimeHealth = Static<typeof SystemControlRuntimeHealthSchema>;

export const SystemControlRuntimeTelemetryStatusSchema = Type.Union([
  Type.Literal('fresh'),
  Type.Literal('partial'),
  Type.Literal('unknown'),
  Type.Literal('not_configured'),
]);
export type SystemControlRuntimeTelemetryStatus = Static<typeof SystemControlRuntimeTelemetryStatusSchema>;

export const SystemControlRuntimeLeaseSchema = Type.Object({
  activeCount: Type.Integer({ minimum: 0 }),
  ownerPresentCount: Type.Integer({ minimum: 0 }),
  earliestExpiryAt: Type.Union([Timestamp(), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlRuntimeLease = Static<typeof SystemControlRuntimeLeaseSchema>;

export const SystemControlRuntimeTelemetrySchema = Type.Object({
  status: SystemControlRuntimeTelemetryStatusSchema,
  observedAt: Type.Union([Timestamp(), Type.Null()]),
  reasonCode: Type.Union([Type.String({ minLength: 1, maxLength: 80 }), Type.Null()]),
  cpuPercent: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  gpuPercent: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  memoryBytes: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  storageBytes: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  databaseConnections: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  processCount: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlRuntimeTelemetry = Static<typeof SystemControlRuntimeTelemetrySchema>;

export const SystemControlRuntimeConfigurationSchema = Type.Object({
  status: Type.Union([Type.Literal('configured'), Type.Literal('not_configured'), Type.Literal('unknown')]),
  version: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  routingVersionId: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  deploymentVersionId: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  acceptingNewTasks: Type.Union([Type.Boolean(), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlRuntimeConfiguration = Static<typeof SystemControlRuntimeConfigurationSchema>;

export const SystemControlRuntimeIdentitySchema = Type.Object({
  capability: Type.Union([Type.Literal('asr'), Type.Literal('screen_text'), Type.Literal('delivery'), Type.Null()]),
  executionKind: Type.Union([Type.String({ minLength: 1, maxLength: 40 }), Type.Null()]),
  provider: Type.Union([Type.String({ minLength: 1, maxLength: 80 }), Type.Null()]),
  adapterKey: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  model: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlRuntimeIdentity = Static<typeof SystemControlRuntimeIdentitySchema>;

export const SystemControlRuntimeRoutingScopeSchema = Type.Object({
  workflowStage: Type.Union([Type.Literal('asr'), Type.Literal('screen_text')]),
  poolId: Type.String({ minLength: 1, maxLength: 80 }),
}, { additionalProperties: false });
export type SystemControlRuntimeRoutingScope = Static<typeof SystemControlRuntimeRoutingScopeSchema>;

export const SystemControlRuntimeResourceDescriptorSchema = Type.Object({
  runtimeResourceId: Type.String({ minLength: 1, maxLength: 120, pattern: '^[a-z0-9][a-z0-9:_-]{0,119}$' }),
  environment: SystemControlRuntimeEnvironmentSchema,
  kind: SystemControlRuntimeResourceKindSchema,
  displayName: Type.String({ minLength: 1, maxLength: 120 }),
  identity: SystemControlRuntimeIdentitySchema,
  routingScope: Type.Union([SystemControlRuntimeRoutingScopeSchema, Type.Null()]),
}, { additionalProperties: false });
export type SystemControlRuntimeResourceDescriptor = Static<typeof SystemControlRuntimeResourceDescriptorSchema>;

/**
 * 服务器只读运行快照中的单项遥测。快照文件严格固定 schemaVersion=1，
 * Provider 只投影这些字段，不接受浏览器或业务请求补写。
 */
export const SystemControlRuntimeSnapshotObservationSchema = Type.Object({
  status: Type.Union([
    Type.Literal('fresh'),
    Type.Literal('partial'),
    Type.Literal('unknown'),
  ]),
  observedAt: Type.Union([Timestamp(), Type.Null()]),
  reasonCode: Type.Union([Type.String({ minLength: 1, maxLength: 80 }), Type.Null()]),
  cpuPercent: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  gpuPercent: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  memoryBytes: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  storageBytes: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  databaseConnections: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  processCount: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlRuntimeSnapshotObservation = Static<typeof SystemControlRuntimeSnapshotObservationSchema>;

export const SystemControlRuntimeSnapshotResourceSchema = Type.Composite([
  SystemControlRuntimeResourceDescriptorSchema,
  Type.Object({ telemetry: SystemControlRuntimeSnapshotObservationSchema }),
], { additionalProperties: false });
export type SystemControlRuntimeSnapshotResource = Static<typeof SystemControlRuntimeSnapshotResourceSchema>;

/** 由受保护服务器文件提供的目录与遥测唯一快照。 */
export const SystemControlRuntimeSnapshotSchema = Type.Object({
  schemaVersion: Type.Literal(1),
  environment: SystemControlRuntimeEnvironmentSchema,
  observedAt: Timestamp(),
  expiresAt: Timestamp(),
  resources: Type.Array(SystemControlRuntimeSnapshotResourceSchema),
}, { additionalProperties: false });
export type SystemControlRuntimeSnapshot = Static<typeof SystemControlRuntimeSnapshotSchema>;

export const SystemControlRuntimeThroughputSchema = Type.Object({
  window: Type.Literal('24h'),
  windowStartAt: Timestamp(),
  completedCount: Type.Integer({ minimum: 0 }),
  failedCount: Type.Integer({ minimum: 0 }),
  reconciliationRequiredCount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlRuntimeThroughput = Static<typeof SystemControlRuntimeThroughputSchema>;

export const SystemControlRuntimeResourceSchema = Type.Object({
  runtimeResourceId: Type.String({ minLength: 1, maxLength: 120, pattern: '^[a-z0-9][a-z0-9:_-]{0,119}$' }),
  environment: SystemControlRuntimeEnvironmentSchema,
  kind: SystemControlRuntimeResourceKindSchema,
  displayName: Type.String({ minLength: 1, maxLength: 120 }),
  health: SystemControlRuntimeHealthSchema,
  source: Type.Union([Type.Literal('postgresql'), Type.Literal('provider'), Type.Literal('none')]),
  observedAt: Type.Union([Timestamp(), Type.Null()]),
  updatedAt: Type.Union([Timestamp(), Type.Null()]),
  identity: SystemControlRuntimeIdentitySchema,
  queueDepth: Type.Integer({ minimum: 0 }),
  runningCount: Type.Integer({ minimum: 0 }),
  completedCount: Type.Integer({ minimum: 0 }),
  failedCount: Type.Integer({ minimum: 0 }),
  reconciliationRequiredCount: Type.Integer({ minimum: 0 }),
  throughput: SystemControlRuntimeThroughputSchema,
  lease: SystemControlRuntimeLeaseSchema,
  telemetry: SystemControlRuntimeTelemetrySchema,
  configuration: SystemControlRuntimeConfigurationSchema,
}, { additionalProperties: false });
export type SystemControlRuntimeResource = Static<typeof SystemControlRuntimeResourceSchema>;

export const SystemControlRuntimeOverviewQuerySchema = Type.Object({
  environment: Type.Optional(SystemControlRuntimeEnvironmentSchema),
}, { additionalProperties: false });
export type SystemControlRuntimeOverviewQuery = Static<typeof SystemControlRuntimeOverviewQuerySchema>;

export const SystemControlRuntimeResourcesQuerySchema = Type.Object({
  environment: Type.Optional(SystemControlRuntimeEnvironmentSchema),
  kind: Type.Optional(SystemControlRuntimeResourceKindSchema),
  health: Type.Optional(SystemControlRuntimeHealthSchema),
  search: Type.Optional(Type.String({ maxLength: 120 })),
  sort: Type.Optional(Type.Union([
    Type.Literal('display_asc'),
    Type.Literal('display_desc'),
    Type.Literal('health_asc'),
    Type.Literal('updated_desc'),
  ])),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlRuntimeResourcesQuery = Static<typeof SystemControlRuntimeResourcesQuerySchema>;

export const SystemControlRuntimeOverviewSchema = Type.Object({
  environment: SystemControlRuntimeEnvironmentSchema,
  databaseNow: Timestamp(),
  dataFreshness: Timestamp(),
  overallHealth: SystemControlRuntimeHealthSchema,
  resources: Type.Array(SystemControlRuntimeResourceSchema),
  totals: Type.Object({
    queueDepth: Type.Integer({ minimum: 0 }),
    runningCount: Type.Integer({ minimum: 0 }),
    completedCount: Type.Integer({ minimum: 0 }),
    failedCount: Type.Integer({ minimum: 0 }),
    reconciliationRequiredCount: Type.Integer({ minimum: 0 }),
    activeLeaseCount: Type.Integer({ minimum: 0 }),
  }, { additionalProperties: false }),
}, { additionalProperties: false });
export type SystemControlRuntimeOverview = Static<typeof SystemControlRuntimeOverviewSchema>;

export const SystemControlRuntimeResourceListSchema = Type.Object({
  items: Type.Array(SystemControlRuntimeResourceSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
  databaseNow: Timestamp(),
  dataFreshness: Timestamp(),
}, { additionalProperties: false });
export type SystemControlRuntimeResourceList = Static<typeof SystemControlRuntimeResourceListSchema>;
