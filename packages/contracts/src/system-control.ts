import { Type, type Static } from '@sinclair/typebox';

const Timestamp = () => Type.String({ format: 'date-time' });

export const SystemControlEnvironmentSchema = Type.Literal('development');
export type SystemControlEnvironment = Static<typeof SystemControlEnvironmentSchema>;

export const SystemControlWindowSchema = Type.Literal('24h');
export type SystemControlWindow = Static<typeof SystemControlWindowSchema>;

export const SystemControlOverviewQuerySchema = Type.Object({
  environment: Type.Optional(SystemControlEnvironmentSchema),
  window: Type.Optional(SystemControlWindowSchema),
}, { additionalProperties: false });
export type SystemControlOverviewQuery = Static<typeof SystemControlOverviewQuerySchema>;

export const SystemControlResourcePoolIdSchema = Type.Union([
  Type.Literal('asr_api'),
  Type.Literal('ocr_api'),
  Type.Literal('ocr_self_hosted_worker'),
  Type.Literal('delivery_generation'),
]);
export type SystemControlResourcePoolId = Static<typeof SystemControlResourcePoolIdSchema>;

export const SystemControlStatusSchema = Type.Union([
  Type.Literal('healthy'),
  Type.Literal('degraded'),
  Type.Literal('failed'),
  Type.Literal('empty'),
  Type.Literal('unknown'),
  Type.Literal('not_configured'),
]);
export type SystemControlStatus = Static<typeof SystemControlStatusSchema>;

export const SystemControlFreshnessSchema = Type.Object({
  status: Type.Union([Type.Literal('fresh'), Type.Literal('empty'), Type.Literal('unknown')]),
  observedAt: Type.Union([Timestamp(), Type.Null()]),
  windowStart: Timestamp(),
  windowEnd: Timestamp(),
  timezone: Type.Literal('UTC'),
}, { additionalProperties: false });

export const SystemControlCurrencyUsageSchema = Type.Object({
  currency: Type.String({ minLength: 1, maxLength: 12 }),
  estimatedAmount: Type.Union([Type.String(), Type.Null()]),
  finalAmount: Type.Union([Type.String(), Type.Null()]),
  pendingCount: Type.Integer({ minimum: 0 }),
  unknownCount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlCurrencyUsage = Static<typeof SystemControlCurrencyUsageSchema>;

export const SystemControlCostSchema = Type.Object({
  byCurrency: Type.Array(SystemControlCurrencyUsageSchema),
  pendingCount: Type.Integer({ minimum: 0 }),
  unknownCount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlCost = Static<typeof SystemControlCostSchema>;

export const SystemControlExecutionIdentitySchema = Type.Object({
  executionKind: Type.Union([Type.String({ minLength: 1, maxLength: 40 }), Type.Null()]),
  provider: Type.Union([Type.String({ minLength: 1, maxLength: 80 }), Type.Null()]),
  adapter: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  model: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  deployment: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  jobCount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlExecutionIdentity = Static<typeof SystemControlExecutionIdentitySchema>;

export const SystemControlTelemetrySchema = Type.Object({
  status: Type.Union([Type.Literal('unknown'), Type.Literal('not_configured')]),
  cpuPercent: Type.Null(),
  gpuPercent: Type.Null(),
  memoryBytes: Type.Null(),
  storageBytes: Type.Null(),
}, { additionalProperties: false });

export const SystemControlConfigurationSchema = Type.Object({
  status: Type.Literal('not_configured'),
  version: Type.Null(),
  acceptingNewTasks: Type.Null(),
}, { additionalProperties: false });

export const SystemControlResourcePoolSchema = Type.Object({
  id: SystemControlResourcePoolIdSchema,
  status: SystemControlStatusSchema,
  queueDepth: Type.Integer({ minimum: 0 }),
  runningCount: Type.Integer({ minimum: 0 }),
  completedCount: Type.Integer({ minimum: 0 }),
  failedCount: Type.Integer({ minimum: 0 }),
  reconciliationRequiredCount: Type.Integer({ minimum: 0 }),
  throughput: Type.Integer({ minimum: 0 }),
  errorCount: Type.Integer({ minimum: 0 }),
  identities: Type.Array(SystemControlExecutionIdentitySchema),
  cost: SystemControlCostSchema,
  telemetry: SystemControlTelemetrySchema,
  configuration: SystemControlConfigurationSchema,
  lastObservedAt: Type.Union([Timestamp(), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlResourcePool = Static<typeof SystemControlResourcePoolSchema>;

export const SystemControlMetricsSchema = Type.Object({
  processedProjectCount: Type.Integer({ minimum: 0 }),
  processedEpisodeCount: Type.Integer({ minimum: 0 }),
  runningCount: Type.Integer({ minimum: 0 }),
  queuedCount: Type.Integer({ minimum: 0 }),
  failedCount: Type.Integer({ minimum: 0 }),
  reconciliationRequiredCount: Type.Integer({ minimum: 0 }),
  cost: SystemControlCostSchema,
  storage: Type.Object({
    status: Type.Literal('unknown'),
    assetBytes: Type.Integer({ minimum: 0 }),
    objectStorageBytes: Type.Null(),
    capacityBytes: Type.Null(),
  }, { additionalProperties: false }),
  budget: Type.Object({
    status: Type.Literal('not_configured'),
    byCurrency: Type.Array(SystemControlCurrencyUsageSchema),
  }, { additionalProperties: false }),
}, { additionalProperties: false });
export type SystemControlMetrics = Static<typeof SystemControlMetricsSchema>;

export const SystemControlTrendPointSchema = Type.Object({
  bucketStart: Timestamp(),
  bucketEnd: Timestamp(),
  hasFact: Type.Boolean(),
  value: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlTrendPoint = Static<typeof SystemControlTrendPointSchema>;

export const SystemControlCostTrendPointSchema = Type.Object({
  bucketStart: Timestamp(),
  bucketEnd: Timestamp(),
  hasFact: Type.Boolean(),
  cost: SystemControlCostSchema,
}, { additionalProperties: false });
export type SystemControlCostTrendPoint = Static<typeof SystemControlCostTrendPointSchema>;

export const SystemControlTrendsSchema = Type.Object({
  bucket: Type.Literal('hour'),
  throughput: Type.Array(SystemControlTrendPointSchema),
  queueDepth: Type.Array(SystemControlTrendPointSchema),
  cost: Type.Array(SystemControlCostTrendPointSchema),
}, { additionalProperties: false });
export type SystemControlTrends = Static<typeof SystemControlTrendsSchema>;

export const SystemControlAnomalySchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 200 }),
  resourcePool: SystemControlResourcePoolIdSchema,
  severity: Type.Union([Type.Literal('warning'), Type.Literal('error')]),
  kind: Type.Union([Type.Literal('failed'), Type.Literal('reconciliation_required'), Type.Literal('lease_expired')]),
  projectId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  jobId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  attemptId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  occurredAt: Timestamp(),
  reasonCode: Type.String({ minLength: 1, maxLength: 120 }),
  message: Type.String({ minLength: 1, maxLength: 120 }),
  requestId: Type.Union([Type.String({ minLength: 1, maxLength: 255 }), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlAnomaly = Static<typeof SystemControlAnomalySchema>;

export const SystemControlPendingConfigurationSchema = Type.Object({
  status: Type.Literal('not_configured'),
  items: Type.Array(Type.Object({
    name: Type.String(),
    status: Type.Literal('not_configured'),
  }, { additionalProperties: false })),
}, { additionalProperties: false });

export const SystemControlRecentAuditSchema = Type.Object({
  status: Type.Literal('not_configured'),
  items: Type.Array(Type.Object({
    id: Type.String(),
    occurredAt: Timestamp(),
    result: Type.String(),
  }, { additionalProperties: false })),
}, { additionalProperties: false });

export const SystemControlOverviewSchema = Type.Object({
  environment: SystemControlEnvironmentSchema,
  window: SystemControlWindowSchema,
  generatedAt: Timestamp(),
  freshness: SystemControlFreshnessSchema,
  overallStatus: SystemControlStatusSchema,
  resourcePools: Type.Array(SystemControlResourcePoolSchema, { minItems: 4, maxItems: 4 }),
  metrics: SystemControlMetricsSchema,
  trends: SystemControlTrendsSchema,
  anomalies: Type.Array(SystemControlAnomalySchema),
  pendingConfiguration: SystemControlPendingConfigurationSchema,
  recentAudit: SystemControlRecentAuditSchema,
}, { additionalProperties: false });
export type SystemControlOverview = Static<typeof SystemControlOverviewSchema>;

/* SYSTEM-03 Wave A：引擎部署、不可变版本与零网络连接测试。 */
export const SystemControlEngineCapabilitySchema = Type.Union([
  Type.Literal('asr'),
  Type.Literal('screen_text'),
  Type.Literal('terms'),
]);
export type SystemControlEngineCapability = Static<typeof SystemControlEngineCapabilitySchema>;

export const SystemControlEngineExecutionKindSchema = Type.Union([
  Type.Literal('cloud_api'),
  Type.Literal('self_hosted_worker'),
]);
export type SystemControlEngineExecutionKind = Static<typeof SystemControlEngineExecutionKindSchema>;

export const SystemControlEngineStatusSchema = Type.Union([
  Type.Literal('enabled'),
  Type.Literal('disabled'),
]);
export type SystemControlEngineStatus = Static<typeof SystemControlEngineStatusSchema>;

export const SystemControlEngineStatusCommandBodySchema = Type.Object({
  statusCommandId: Type.String({ format: 'uuid' }),
  status: SystemControlEngineStatusSchema,
}, { additionalProperties: false });
export type SystemControlEngineStatusCommandBody = Static<typeof SystemControlEngineStatusCommandBodySchema>;

export const SystemControlEngineStatusCommandSchema = Type.Object({
  statusCommandId: Type.String({ format: 'uuid' }),
  deploymentId: Type.String({ format: 'uuid' }),
  targetStatus: SystemControlEngineStatusSchema,
  resultingStatus: SystemControlEngineStatusSchema,
  status: Type.Literal('succeeded'),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlEngineStatusCommand = Static<typeof SystemControlEngineStatusCommandSchema>;

/* TERM-CONTROL-BACK-117：术语 Provider 的解析结果随不可变部署版本保存到 runtime_config。 */
export const SystemControlTermProviderPresetSchema = Type.Union([
  Type.Literal('deepseek-v4-flash'),
  Type.Literal('custom'),
]);
export type SystemControlTermProviderPreset = Static<typeof SystemControlTermProviderPresetSchema>;

export const SystemControlTermRuntimeConfigSchema = Type.Object({
  preset: SystemControlTermProviderPresetSchema,
  endpoint: Type.String({ minLength: 1, maxLength: 500, pattern: '^https://[^\\s]+$' }),
  prompt: Type.String({ minLength: 1, maxLength: 20000 }),
  categoryOrder: Type.Array(Type.String({ minLength: 1, maxLength: 40 }), { minItems: 8, maxItems: 8 }),
}, { additionalProperties: false });
export type SystemControlTermRuntimeConfig = Static<typeof SystemControlTermRuntimeConfigSchema>;

export const SystemControlTermRuntimeConfigInputSchema = Type.Object({
  preset: Type.Optional(SystemControlTermProviderPresetSchema),
  endpoint: Type.Optional(Type.String({ minLength: 1, maxLength: 500, pattern: '^https://[^\\s]+$' })),
  prompt: Type.Optional(Type.String({ minLength: 1, maxLength: 20000 })),
  categoryOrder: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 40 }), { minItems: 8, maxItems: 8 })),
}, { additionalProperties: false });
export type SystemControlTermRuntimeConfigInput = Static<typeof SystemControlTermRuntimeConfigInputSchema>;

/* OCR 抽帧策略随 screen-text engine 版本固化；数值边界按 8GB Worker 的有界帧/像素预算设定。 */
export const SystemControlScreenTextRuntimeConfigSchema = Type.Object({
  preset: Type.Literal('screen_text_openvino_ppocrv6_small'),
  frameIntervalMs: Type.Integer({ minimum: 250, maximum: 10_000 }),
  maxFramesPerEpisode: Type.Integer({ minimum: 1, maximum: 600 }),
}, { additionalProperties: false });
export type SystemControlScreenTextRuntimeConfig = Static<typeof SystemControlScreenTextRuntimeConfigSchema>;

export const SystemControlScreenTextRuntimeConfigInputSchema = Type.Object({
  preset: Type.Optional(Type.Literal('screen_text_openvino_ppocrv6_small')),
  /* 保存边界由 service 返回 422；schema 仅保证类型，避免 Fastify 把管理员业务错误降级为 400。 */
  frameIntervalMs: Type.Optional(Type.Integer()),
  maxFramesPerEpisode: Type.Optional(Type.Integer()),
}, { additionalProperties: false });
export type SystemControlScreenTextRuntimeConfigInput = Static<typeof SystemControlScreenTextRuntimeConfigInputSchema>;

export const SystemControlRuntimeConfigSchema = Type.Union([
  SystemControlTermRuntimeConfigSchema,
  SystemControlScreenTextRuntimeConfigSchema,
]);
export type SystemControlRuntimeConfig = Static<typeof SystemControlRuntimeConfigSchema>;

export const SystemControlRuntimeConfigInputSchema = Type.Union([
  SystemControlTermRuntimeConfigInputSchema,
  SystemControlScreenTextRuntimeConfigInputSchema,
]);
export type SystemControlRuntimeConfigInput = Static<typeof SystemControlRuntimeConfigInputSchema>;

/* 供后续 Worker 消费的命名别名；快照中不允许出现 Bearer key。 */
export const SystemControlTermProviderConfigSnapshotSchema = SystemControlTermRuntimeConfigSchema;
export type SystemControlTermProviderConfigSnapshot = SystemControlTermRuntimeConfig;

export const SystemControlConnectionTestStatusSchema = Type.Union([
  Type.Literal('queued'),
  Type.Literal('running'),
  Type.Literal('succeeded'),
  Type.Literal('failed'),
  Type.Literal('unknown'),
]);
export type SystemControlConnectionTestStatus = Static<typeof SystemControlConnectionTestStatusSchema>;

export const SystemControlSecretReferenceSummarySchema = Type.Object({
  present: Type.Boolean(),
  secretReferenceId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  secretReferenceVersionId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  referenceDigest: Type.Union([Type.String({ minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' }), Type.Null()]),
  redactedLabel: Type.Union([Type.String({ minLength: 1, maxLength: 80 }), Type.Null()]),
  status: Type.Optional(Type.Union([
    Type.Literal('available'), Type.Literal('validation_failed'), Type.Literal('unknown'), Type.Literal('rotation_due'), Type.Literal('revoked'), Type.Null(),
  ])),
  rotationDueAt: Type.Optional(Type.Union([Timestamp(), Type.Null()])),
  rotationDue: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });
export type SystemControlSecretReferenceSummary = Static<typeof SystemControlSecretReferenceSummarySchema>;

export const SystemControlCapabilitiesSnapshotSchema = Type.Object({
  capability: SystemControlEngineCapabilitySchema,
  executionKind: SystemControlEngineExecutionKindSchema,
  provider: Type.String({ minLength: 1, maxLength: 80 }),
  adapterKey: Type.String({ minLength: 1, maxLength: 120 }),
  model: Type.String({ minLength: 1, maxLength: 120 }),
  language: Type.String({ minLength: 1, maxLength: 80 }),
  deployment: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
  adapterKind: Type.Optional(Type.String({ minLength: 1, maxLength: 40 })),
  descriptorDigest: Type.String({ minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' }),
  capabilities: Type.Record(Type.String({ minLength: 1, maxLength: 80 }), Type.Unknown()),
}, { additionalProperties: false });
export type SystemControlCapabilitiesSnapshot = Static<typeof SystemControlCapabilitiesSnapshotSchema>;

export const SystemControlEngineDeploymentSchema = Type.Object({
  deploymentId: Type.String({ format: 'uuid' }),
  capability: SystemControlEngineCapabilitySchema,
  executionKind: SystemControlEngineExecutionKindSchema,
  displayName: Type.String({ minLength: 1, maxLength: 200 }),
  provider: Type.String({ minLength: 1, maxLength: 80 }),
  adapterKey: Type.String({ minLength: 1, maxLength: 120 }),
  status: SystemControlEngineStatusSchema,
  latestVersion: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  createdAt: Timestamp(),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlEngineDeployment = Static<typeof SystemControlEngineDeploymentSchema>;

export const SystemControlEngineDeploymentVersionSchema = Type.Object({
  versionId: Type.String({ format: 'uuid' }),
  deploymentId: Type.String({ format: 'uuid' }),
  version: Type.Integer({ minimum: 1 }),
  model: Type.String({ minLength: 1, maxLength: 120 }),
  language: Type.String({ minLength: 1, maxLength: 80 }),
  endpointReference: Type.Union([Type.String({ minLength: 1, maxLength: 255 }), Type.Null()]),
  regionHint: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  capabilitiesSnapshot: SystemControlCapabilitiesSnapshotSchema,
  secretReference: SystemControlSecretReferenceSummarySchema,
  runtimeConfig: Type.Optional(SystemControlRuntimeConfigSchema),
  configDigest: Type.String({ minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' }),
  billingSnapshot: Type.Union([Type.Object({
    billingClass: Type.Union([Type.Literal('metered'), Type.Literal('unmetered_local')]),
    currency: Type.String({ minLength: 3, maxLength: 12 }),
    maximumAmount: Type.String({ pattern: '^(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,12})?$' }),
    billingUnit: Type.String({ minLength: 1, maxLength: 80 }),
    maximumQuantity: Type.String({ pattern: '^(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,12})?$' }),
  }, { additionalProperties: false }), Type.Null()]),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlEngineDeploymentVersion = Static<typeof SystemControlEngineDeploymentVersionSchema>;

export const SystemControlEngineListQuerySchema = Type.Object({
  capability: Type.Optional(SystemControlEngineCapabilitySchema),
  status: Type.Optional(SystemControlEngineStatusSchema),
  search: Type.Optional(Type.String({ maxLength: 120 })),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlEngineListQuery = Static<typeof SystemControlEngineListQuerySchema>;

export const SystemControlEngineListSchema = Type.Object({
  items: Type.Array(SystemControlEngineDeploymentSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlEngineList = Static<typeof SystemControlEngineListSchema>;

export const SystemControlEngineVersionListQuerySchema = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlEngineVersionListQuery = Static<typeof SystemControlEngineVersionListQuerySchema>;

export const SystemControlEngineVersionListSchema = Type.Object({
  items: Type.Array(SystemControlEngineDeploymentVersionSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlEngineVersionList = Static<typeof SystemControlEngineVersionListSchema>;

export const SystemControlSecretVersionActionSchema = Type.Union([
  Type.Object({ action: Type.Literal('inherit') }, { additionalProperties: false }),
  Type.Object({ action: Type.Literal('clear') }, { additionalProperties: false }),
  Type.Object({
    action: Type.Literal('replace'),
    secretReferenceVersionId: Type.String({ format: 'uuid' }),
  }, { additionalProperties: false }),
]);
export type SystemControlSecretVersionAction = Static<typeof SystemControlSecretVersionActionSchema>;

export const SystemControlCreateEngineDeploymentBodySchema = Type.Object({
  deploymentId: Type.String({ format: 'uuid' }),
  versionId: Type.String({ format: 'uuid' }),
  capability: SystemControlEngineCapabilitySchema,
  executionKind: SystemControlEngineExecutionKindSchema,
  displayName: Type.String({ minLength: 1, maxLength: 200 }),
  adapterKey: Type.String({ minLength: 1, maxLength: 120 }),
  endpointReference: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  regionHint: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  model: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  secretReferenceVersionId: Type.Optional(Type.String({ format: 'uuid' })),
  runtimeConfig: Type.Optional(SystemControlRuntimeConfigInputSchema),
}, { additionalProperties: false });
export type SystemControlCreateEngineDeploymentBody = Static<typeof SystemControlCreateEngineDeploymentBodySchema>;

export const SystemControlCreateEngineVersionBodySchema = Type.Object({
  versionId: Type.String({ format: 'uuid' }),
  endpointReference: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  regionHint: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  model: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  secret: SystemControlSecretVersionActionSchema,
  runtimeConfig: Type.Optional(SystemControlRuntimeConfigInputSchema),
}, { additionalProperties: false });
export type SystemControlCreateEngineVersionBody = Static<typeof SystemControlCreateEngineVersionBodySchema>;

export const SystemControlEngineDetailSchema = Type.Object({
  deployment: SystemControlEngineDeploymentSchema,
  latestVersion: Type.Union([SystemControlEngineDeploymentVersionSchema, Type.Null()]),
}, { additionalProperties: false });
export type SystemControlEngineDetail = Static<typeof SystemControlEngineDetailSchema>;

export const SystemControlCreateConnectionTestBodySchema = Type.Object({
  testRunId: Type.String({ format: 'uuid' }),
  deploymentVersionId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });
export type SystemControlCreateConnectionTestBody = Static<typeof SystemControlCreateConnectionTestBodySchema>;

export const SystemControlConnectionTestSchema = Type.Object({
  testRunId: Type.String({ format: 'uuid' }),
  deploymentVersionId: Type.String({ format: 'uuid' }),
  capability: SystemControlEngineCapabilitySchema,
  executionKind: SystemControlEngineExecutionKindSchema,
  adapterKey: Type.String({ minLength: 1, maxLength: 120 }),
  status: SystemControlConnectionTestStatusSchema,
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  attemptCount: Type.Integer({ minimum: 0 }),
  latencyMs: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  capabilitiesSnapshot: Type.Union([SystemControlCapabilitiesSnapshotSchema, Type.Null()]),
  reasonCode: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  reasonMessage: Type.Union([Type.String({ minLength: 1, maxLength: 240 }), Type.Null()]),
  queuedAt: Timestamp(),
  startedAt: Type.Union([Timestamp(), Type.Null()]),
  completedAt: Type.Union([Timestamp(), Type.Null()]),
  attempts: Type.Array(Type.Object({
    attemptNumber: Type.Integer({ minimum: 1 }),
    status: SystemControlConnectionTestStatusSchema,
    latencyMs: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    reasonCode: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
    reasonMessage: Type.Union([Type.String({ minLength: 1, maxLength: 240 }), Type.Null()]),
    startedAt: Type.Union([Timestamp(), Type.Null()]),
    completedAt: Type.Union([Timestamp(), Type.Null()]),
  }, { additionalProperties: false })),
}, { additionalProperties: false });
export type SystemControlConnectionTest = Static<typeof SystemControlConnectionTestSchema>;

export const SystemControlConnectionTestListQuerySchema = Type.Object({
  deploymentId: Type.Optional(Type.String({ format: 'uuid' })),
  deploymentVersionId: Type.Optional(Type.String({ format: 'uuid' })),
  status: Type.Optional(SystemControlConnectionTestStatusSchema),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlConnectionTestListQuery = Static<typeof SystemControlConnectionTestListQuerySchema>;

export const SystemControlConnectionTestListSchema = Type.Object({
  items: Type.Array(SystemControlConnectionTestSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlConnectionTestList = Static<typeof SystemControlConnectionTestListSchema>;

/* SYSTEM-03 Wave B：路由策略与唯一 active 指针。 */
export const SystemControlRoutingWorkflowStageSchema = Type.Union([
  Type.Literal('asr'), Type.Literal('screen_text'), Type.Literal('terms'),
]);
export type SystemControlRoutingWorkflowStage = Static<typeof SystemControlRoutingWorkflowStageSchema>;

export const SystemControlRoutingPoolIdSchema = Type.Union([
  Type.Literal('asr_api'), Type.Literal('ocr_api'), Type.Literal('ocr_self_hosted_worker'), Type.Literal('terms_api'),
]);
export type SystemControlRoutingPoolId = Static<typeof SystemControlRoutingPoolIdSchema>;

export const SystemControlRoutingStatusSchema = Type.Union([
  Type.Literal('draft'), Type.Literal('testing'), Type.Literal('impact_checked'),
  Type.Literal('approved'), Type.Literal('active'), Type.Literal('retired'),
]);
export type SystemControlRoutingStatus = Static<typeof SystemControlRoutingStatusSchema>;

export const SystemControlRoutingPoolSchema = Type.Object({
  poolId: SystemControlRoutingPoolIdSchema,
  targets: Type.Array(Type.Object({
    routingTargetId: Type.String({ format: 'uuid' }),
    deploymentVersionId: Type.String({ format: 'uuid' }),
    priority: Type.Integer({ minimum: 1, maximum: 8 }),
    role: Type.Union([Type.Literal('preferred'), Type.Literal('standard'), Type.Literal('emergency')]),
    maxConcurrentJobs: Type.Integer({ minimum: 1, maximum: 100000 }),
    perProjectMax: Type.Integer({ minimum: 1, maximum: 100000 }),
    queueLimit: Type.Integer({ minimum: 0, maximum: 1000000 }),
  }, { additionalProperties: false }), { minItems: 0, maxItems: 8 }),
}, { additionalProperties: false });
export type SystemControlRoutingPool = Static<typeof SystemControlRoutingPoolSchema>;

export const SystemControlRoutingImpactSchema = Type.Object({
  affectedWorkflowStages: Type.Array(SystemControlRoutingWorkflowStageSchema),
  activeTaskCount: Type.Integer({ minimum: 0 }),
  reconciliationRequiredTaskCount: Type.Integer({ minimum: 0 }),
  failingConnectionTestCount: Type.Integer({ minimum: 0 }),
  capacityDifferences: Type.Array(Type.Object({
    poolId: SystemControlRoutingPoolIdSchema,
    currentMaxConcurrentJobs: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    nextMaxConcurrentJobs: Type.Integer({ minimum: 0 }),
  }, { additionalProperties: false })),
  hardBlocks: Type.Array(Type.String({ minLength: 1, maxLength: 120 })),
}, { additionalProperties: false });
export type SystemControlRoutingImpact = Static<typeof SystemControlRoutingImpactSchema>;

export const SystemControlRoutingPolicyVersionSchema = Type.Object({
  routingVersionId: Type.String({ format: 'uuid' }),
  environment: SystemControlEnvironmentSchema,
  workflowStage: SystemControlRoutingWorkflowStageSchema,
  version: Type.Integer({ minimum: 1 }),
  status: SystemControlRoutingStatusSchema,
  pools: Type.Array(SystemControlRoutingPoolSchema, { minItems: 1, maxItems: 4 }),
  impact: Type.Union([SystemControlRoutingImpactSchema, Type.Null()]),
  createdAt: Timestamp(),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlRoutingPolicyVersion = Static<typeof SystemControlRoutingPolicyVersionSchema>;

export const SystemControlCreateRoutingPolicyBodySchema = Type.Object({
  routingVersionId: Type.String({ format: 'uuid' }),
  environment: SystemControlEnvironmentSchema,
  workflowStage: SystemControlRoutingWorkflowStageSchema,
  pools: Type.Array(SystemControlRoutingPoolSchema, { minItems: 1, maxItems: 4 }),
}, { additionalProperties: false });
export type SystemControlCreateRoutingPolicyBody = Static<typeof SystemControlCreateRoutingPolicyBodySchema>;

export const SystemControlRoutingCommandBodySchema = Type.Object({
  releaseCommandId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });
export type SystemControlRoutingCommandBody = Static<typeof SystemControlRoutingCommandBodySchema>;

export const SystemControlRoutingRollbackBodySchema = Type.Object({
  releaseCommandId: Type.String({ format: 'uuid' }),
  targetRoutingVersionId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });
export type SystemControlRoutingRollbackBody = Static<typeof SystemControlRoutingRollbackBodySchema>;

export const SystemControlRoutingListQuerySchema = Type.Object({
  environment: Type.Optional(SystemControlEnvironmentSchema),
  workflowStage: Type.Optional(SystemControlRoutingWorkflowStageSchema),
  status: Type.Optional(SystemControlRoutingStatusSchema),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlRoutingListQuery = Static<typeof SystemControlRoutingListQuerySchema>;

export const SystemControlRoutingListSchema = Type.Object({
  items: Type.Array(SystemControlRoutingPolicyVersionSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlRoutingList = Static<typeof SystemControlRoutingListSchema>;

export const SystemControlRoutingCommandKindSchema = Type.Union([
  Type.Literal('publish'), Type.Literal('rollback'),
]);
export type SystemControlRoutingCommandKind = Static<typeof SystemControlRoutingCommandKindSchema>;

export const SystemControlRoutingCommandSchema = Type.Object({
  commandId: Type.String({ minLength: 1, maxLength: 200 }),
  commandKind: SystemControlRoutingCommandKindSchema,
  routingVersionId: Type.String({ format: 'uuid' }),
  releaseCommandId: Type.String({ format: 'uuid' }),
  status: Type.Literal('succeeded'),
  policy: SystemControlRoutingPolicyVersionSchema,
}, { additionalProperties: false });
export type SystemControlRoutingCommand = Static<typeof SystemControlRoutingCommandSchema>;

export const SystemControlRoutingAuditActionSchema = Type.Union([
  Type.Literal('routing_policy_created'),
  Type.Literal('routing_testing'),
  Type.Literal('routing_impact_checked'),
  Type.Literal('routing_approved'),
  Type.Literal('routing_published'),
  Type.Literal('routing_rollback'),
]);
export type SystemControlRoutingAuditAction = Static<typeof SystemControlRoutingAuditActionSchema>;

export const SystemControlRoutingAuditListQuerySchema = Type.Object({
  routingVersionId: Type.Optional(Type.String({ format: 'uuid' })),
  action: Type.Optional(SystemControlRoutingAuditActionSchema),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlRoutingAuditListQuery = Static<typeof SystemControlRoutingAuditListQuerySchema>;

export const SystemControlRoutingAuditEventSchema = Type.Object({
  eventId: Type.String({ format: 'uuid' }),
  action: SystemControlRoutingAuditActionSchema,
  routingVersionId: Type.String({ format: 'uuid' }),
  actorSubject: Type.String({ minLength: 1, maxLength: 255 }),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  result: Type.String({ minLength: 1, maxLength: 40 }),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlRoutingAuditEvent = Static<typeof SystemControlRoutingAuditEventSchema>;

export const SystemControlRoutingAuditListSchema = Type.Object({
  items: Type.Array(SystemControlRoutingAuditEventSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlRoutingAuditList = Static<typeof SystemControlRoutingAuditListSchema>;

/* SYSTEM-04：预算策略、报价、预留与只读审计。金额使用十进制字符串，不在浏览器或 Node 中转 Number。 */
export const SystemControlBudgetResourcePoolSchema = Type.Union([
  Type.Literal('asr_api'), Type.Literal('ocr_api'),
]);
export type SystemControlBudgetResourcePool = Static<typeof SystemControlBudgetResourcePoolSchema>;

export const SystemControlBudgetPeriodSchema = Type.Union([Type.Literal('day'), Type.Literal('month')]);
export type SystemControlBudgetPeriod = Static<typeof SystemControlBudgetPeriodSchema>;

export const SystemControlBudgetPolicyStatusSchema = Type.Union([
  Type.Literal('draft'), Type.Literal('testing'), Type.Literal('impact_checked'),
  Type.Literal('approved'), Type.Literal('active'), Type.Literal('retired'),
]);
export type SystemControlBudgetPolicyStatus = Static<typeof SystemControlBudgetPolicyStatusSchema>;

export const SystemControlBudgetReservationStatusSchema = Type.Union([
  Type.Literal('reserved'), Type.Literal('settled'), Type.Literal('released'),
  Type.Literal('unknown'), Type.Literal('reconciliation_required'), Type.Literal('overrun'),
]);
export type SystemControlBudgetReservationStatus = Static<typeof SystemControlBudgetReservationStatusSchema>;

const DecimalString = Type.String({ pattern: '^(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,12})?$' });

export const SystemControlBudgetRuleSchema = Type.Object({
  resourcePool: SystemControlBudgetResourcePoolSchema,
  currency: Type.String({ minLength: 3, maxLength: 12, pattern: '^[A-Z0-9_-]+$' }),
  period: SystemControlBudgetPeriodSchema,
  warningLimit: DecimalString,
  hardLimit: DecimalString,
}, { additionalProperties: false });
export type SystemControlBudgetRule = Static<typeof SystemControlBudgetRuleSchema>;

const SystemControlCreateBudgetRuleSchema = Type.Object({
  resourcePool: SystemControlBudgetResourcePoolSchema,
  currency: Type.Literal('CNY'),
  period: SystemControlBudgetPeriodSchema,
  warningLimit: DecimalString,
  hardLimit: DecimalString,
}, { additionalProperties: false });

export const SystemControlCreateBudgetPolicyBodySchema = Type.Object({
  budgetPolicyVersionId: Type.String({ format: 'uuid' }),
  environment: SystemControlEnvironmentSchema,
  enforcementEnabled: Type.Optional(Type.Boolean({ default: false })),
  rules: Type.Array(SystemControlCreateBudgetRuleSchema, { minItems: 1, maxItems: 20 }),
}, { additionalProperties: false });
export type SystemControlCreateBudgetPolicyBody = Static<typeof SystemControlCreateBudgetPolicyBodySchema>;

export const SystemControlBudgetImpactSchema = Type.Object({
  hardBlocks: Type.Array(Type.String({ minLength: 1, maxLength: 120 })),
  configurationHardBlocks: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 120 }))),
  runtimeBlockedScopes: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 160 }))),
  runtimeWarningScopes: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 160 }))),
  warningCount: Type.Integer({ minimum: 0 }),
  activeReservationCount: Type.Integer({ minimum: 0 }),
  reconciliationRequiredCount: Type.Integer({ minimum: 0 }),
  scopes: Type.Optional(Type.Array(Type.Object({
    resourcePool: SystemControlBudgetResourcePoolSchema,
    currency: Type.String({ minLength: 3, maxLength: 12 }),
    period: SystemControlBudgetPeriodSchema,
    settledAmount: DecimalString,
    reservedAmount: DecimalString,
    unknownAmount: DecimalString,
    totalAmount: DecimalString,
    warningLimit: Type.Union([DecimalString, Type.Null()]),
    hardLimit: Type.Union([DecimalString, Type.Null()]),
    status: Type.Union([Type.Literal('ok'), Type.Literal('warning'), Type.Literal('blocked'), Type.Literal('unblocked'), Type.Literal('missing_rule')]),
  }, { additionalProperties: false }))),
  meteredDeploymentCoverage: Type.Optional(Type.Array(Type.Object({
    deploymentVersionId: Type.String({ format: 'uuid' }),
    resourcePool: SystemControlBudgetResourcePoolSchema,
    currency: Type.Union([Type.String({ minLength: 3, maxLength: 12 }), Type.Null()]),
    covered: Type.Boolean(),
  }, { additionalProperties: false }))),
}, { additionalProperties: false });
export type SystemControlBudgetImpact = Static<typeof SystemControlBudgetImpactSchema>;

export const SystemControlBudgetPolicySchema = Type.Object({
  budgetPolicyVersionId: Type.String({ format: 'uuid' }),
  environment: SystemControlEnvironmentSchema,
  version: Type.Integer({ minimum: 1 }),
  enforcementEnabled: Type.Boolean(),
  status: SystemControlBudgetPolicyStatusSchema,
  rules: Type.Array(SystemControlBudgetRuleSchema),
  impact: Type.Union([SystemControlBudgetImpactSchema, Type.Null()]),
  createdAt: Timestamp(),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlBudgetPolicy = Static<typeof SystemControlBudgetPolicySchema>;

export const SystemControlBudgetPolicyListQuerySchema = Type.Object({
  environment: Type.Optional(SystemControlEnvironmentSchema),
  status: Type.Optional(SystemControlBudgetPolicyStatusSchema),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlBudgetPolicyListQuery = Static<typeof SystemControlBudgetPolicyListQuerySchema>;

export const SystemControlBudgetPolicyListSchema = Type.Object({
  items: Type.Array(SystemControlBudgetPolicySchema), total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlBudgetPolicyList = Static<typeof SystemControlBudgetPolicyListSchema>;

export const SystemControlBudgetCommandBodySchema = Type.Object({
  commandId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });
export type SystemControlBudgetCommandBody = Static<typeof SystemControlBudgetCommandBodySchema>;

export const SystemControlBudgetReleaseBodySchema = Type.Object({
  budgetReleaseCommandId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });
export type SystemControlBudgetReleaseBody = Static<typeof SystemControlBudgetReleaseBodySchema>;

export const SystemControlBudgetRollbackBodySchema = Type.Object({
  budgetReleaseCommandId: Type.String({ format: 'uuid' }),
  targetBudgetPolicyVersionId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });
export type SystemControlBudgetRollbackBody = Static<typeof SystemControlBudgetRollbackBodySchema>;

export const SystemControlBudgetCommandSchema = Type.Object({
  commandId: Type.String({ format: 'uuid' }),
  commandKind: Type.Union([Type.Literal('publish'), Type.Literal('rollback')]),
  budgetReleaseCommandId: Type.String({ format: 'uuid' }),
  status: Type.Literal('succeeded'),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  policy: SystemControlBudgetPolicySchema,
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlBudgetCommand = Static<typeof SystemControlBudgetCommandSchema>;

export const SystemControlBudgetQuoteSchema = Type.Object({
  currency: Type.String({ minLength: 3, maxLength: 12 }),
  maximumAmount: DecimalString,
  billingUnit: Type.String({ minLength: 1, maxLength: 80 }),
  maximumQuantity: DecimalString,
  quoteDigest: Type.String({ minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' }),
  billingClass: Type.Union([Type.Literal('metered'), Type.Literal('unmetered_local')]),
  conversionSnapshotId: Type.Optional(Type.String({ format: 'uuid' })),
}, { additionalProperties: false });
export type SystemControlBudgetQuote = Static<typeof SystemControlBudgetQuoteSchema>;

export const SystemControlBudgetReservationSchema = Type.Object({
  reservationId: Type.String({ format: 'uuid' }),
  attemptId: Type.String({ format: 'uuid' }),
  attemptKind: Type.Union([Type.Literal('asr'), Type.Literal('screen_text')]),
  projectId: Type.String({ format: 'uuid' }),
  deploymentVersionId: Type.String({ format: 'uuid' }),
  resourcePool: SystemControlBudgetResourcePoolSchema,
  currency: Type.String({ minLength: 3, maxLength: 12 }),
  budgetPolicyVersionId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  quoteDigest: Type.String({ minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' }),
  sourceCurrency: Type.Optional(Type.String({ minLength: 3, maxLength: 12 })),
  conversionSnapshotId: Type.Optional(Type.String({ format: 'uuid' })),
  rateDigest: Type.Optional(Type.String({ minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' })),
  maximumAmountCny: Type.Optional(DecimalString),
  originalMaximumAmount: Type.Optional(DecimalString),
  originalFinalAmount: Type.Optional(DecimalString),
  maximumAmount: DecimalString,
  maximumQuantity: DecimalString,
  status: SystemControlBudgetReservationStatusSchema,
  warning: Type.Boolean(),
  createdAt: Timestamp(),
  settledAt: Type.Union([Timestamp(), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlBudgetReservation = Static<typeof SystemControlBudgetReservationSchema>;

export const SystemControlBudgetUsageListQuerySchema = Type.Object({
  resourcePool: Type.Optional(SystemControlBudgetResourcePoolSchema),
  currency: Type.Optional(Type.Literal('CNY')),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlBudgetUsageListQuery = Static<typeof SystemControlBudgetUsageListQuerySchema>;

export const SystemControlBudgetUsageSchema = Type.Object({
  resourcePool: SystemControlBudgetResourcePoolSchema,
  currency: Type.Literal('CNY'),
  estimatedAmount: Type.Union([DecimalString, Type.Null()]),
  settledAmount: Type.Union([DecimalString, Type.Null()]),
  reservedAmount: Type.Union([DecimalString, Type.Null()]),
  pendingCount: Type.Integer({ minimum: 0 }),
  unknownCount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlBudgetUsage = Static<typeof SystemControlBudgetUsageSchema>;

export const SystemControlBudgetUsageListSchema = Type.Object({
  items: Type.Array(SystemControlBudgetUsageSchema), total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlBudgetUsageList = Static<typeof SystemControlBudgetUsageListSchema>;

export const SystemControlBudgetAuditActionSchema = Type.Union([
  Type.Literal('budget_policy_created'), Type.Literal('budget_testing'),
  Type.Literal('budget_impact_checked'), Type.Literal('budget_approved'),
  Type.Literal('budget_published'), Type.Literal('budget_rollback'),
]);
export type SystemControlBudgetAuditAction = Static<typeof SystemControlBudgetAuditActionSchema>;

export const SystemControlBudgetAuditListQuerySchema = Type.Object({
  budgetPolicyVersionId: Type.Optional(Type.String({ format: 'uuid' })),
  action: Type.Optional(SystemControlBudgetAuditActionSchema),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlBudgetAuditListQuery = Static<typeof SystemControlBudgetAuditListQuerySchema>;

export const SystemControlBudgetAuditEventSchema = Type.Object({
  eventId: Type.String({ format: 'uuid' }), action: SystemControlBudgetAuditActionSchema,
  budgetPolicyVersionId: Type.String({ format: 'uuid' }), actorSubject: Type.String({ minLength: 1, maxLength: 255 }),
  requestId: Type.String({ minLength: 1, maxLength: 255 }), result: Type.String({ minLength: 1, maxLength: 40 }), createdAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlBudgetAuditEvent = Static<typeof SystemControlBudgetAuditEventSchema>;

export const SystemControlBudgetAuditListSchema = Type.Object({
  items: Type.Array(SystemControlBudgetAuditEventSchema), total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlBudgetAuditList = Static<typeof SystemControlBudgetAuditListSchema>;
