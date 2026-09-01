import { Type, type Static } from '@sinclair/typebox';
import {
  SystemControlBudgetPeriodSchema,
  SystemControlBudgetResourcePoolSchema,
} from './system-control.js';

const Timestamp = () => Type.String({ format: 'date-time' });
const DecimalString = Type.String({ pattern: '^(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,12})?$' });

export const SystemControlBudgetTestStatusSchema = Type.Union([
  Type.Literal('queued'), Type.Literal('running'), Type.Literal('succeeded'),
  Type.Literal('failed'), Type.Literal('unknown'),
]);
export type SystemControlBudgetTestStatus = Static<typeof SystemControlBudgetTestStatusSchema>;

export const SystemControlBudgetTestCommandBodySchema = Type.Object({
  commandId: Type.String({ format: 'uuid' }),
  budgetTestRunId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });
export type SystemControlBudgetTestCommandBody = Static<typeof SystemControlBudgetTestCommandBodySchema>;

export const SystemControlBudgetTestRunSchema = Type.Object({
  budgetTestRunId: Type.String({ format: 'uuid' }),
  budgetPolicyVersionId: Type.String({ format: 'uuid' }),
  status: SystemControlBudgetTestStatusSchema,
  inputDigest: Type.String({ minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' }),
  requestId: Type.String({ minLength: 1, maxLength: 255 }),
  result: Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  reasonCode: Type.Union([Type.String({ minLength: 1, maxLength: 100 }), Type.Null()]),
  reasonMessage: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  createdAt: Timestamp(), startedAt: Type.Union([Timestamp(), Type.Null()]), completedAt: Type.Union([Timestamp(), Type.Null()]),
}, { additionalProperties: false });
export type SystemControlBudgetTestRun = Static<typeof SystemControlBudgetTestRunSchema>;

export const SystemControlBudgetTestRunListQuerySchema = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlBudgetTestRunListQuery = Static<typeof SystemControlBudgetTestRunListQuerySchema>;
export const SystemControlBudgetTestRunListSchema = Type.Object({
  items: Type.Array(SystemControlBudgetTestRunSchema), total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }), offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlBudgetTestRunList = Static<typeof SystemControlBudgetTestRunListSchema>;

export const SystemControlBudgetOverviewScopeSchema = Type.Object({
  resourcePool: SystemControlBudgetResourcePoolSchema,
  currency: Type.Literal('CNY'),
  period: SystemControlBudgetPeriodSchema,
  settledAmount: DecimalString, reservedAmount: DecimalString, unknownAmount: DecimalString, totalAmount: DecimalString,
  warningLimit: Type.Union([DecimalString, Type.Null()]), hardLimit: Type.Union([DecimalString, Type.Null()]), remaining: Type.Union([DecimalString, Type.Null()]),
  status: Type.Union([Type.Literal('ok'), Type.Literal('warning'), Type.Literal('blocked'), Type.Literal('unblocked'), Type.Literal('missing_rule')]),
  periodStart: Timestamp(), nextResetAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlBudgetOverviewScope = Static<typeof SystemControlBudgetOverviewScopeSchema>;

export const SystemControlBudgetOverviewSchema = Type.Object({
  databaseNow: Timestamp(), dataFreshness: Timestamp(),
  activePolicy: Type.Union([Type.Object({ budgetPolicyVersionId: Type.String({ format: 'uuid' }), version: Type.Integer({ minimum: 1 }), enforcementEnabled: Type.Boolean() }, { additionalProperties: false }), Type.Null()]),
  noActivePolicy: Type.Boolean(), hardBlocks: Type.Array(Type.String({ minLength: 1, maxLength: 120 })),
  runtimeBlockedScopes: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 160 }))), runtimeWarningScopes: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 160 }))),
  scopes: Type.Array(SystemControlBudgetOverviewScopeSchema),
  meteredDeploymentCoverage: Type.Array(Type.Object({ deploymentVersionId: Type.String({ format: 'uuid' }), resourcePool: SystemControlBudgetResourcePoolSchema, currency: Type.Union([Type.String({ minLength: 3, maxLength: 12 }), Type.Null()]), covered: Type.Boolean() }, { additionalProperties: false })),
}, { additionalProperties: false });
export type SystemControlBudgetOverview = Static<typeof SystemControlBudgetOverviewSchema>;
