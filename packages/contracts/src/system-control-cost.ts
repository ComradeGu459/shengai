import { Type, type Static } from '@sinclair/typebox';

const Timestamp = () => Type.String({ format: 'date-time' });
const DecimalString = Type.String({ pattern: '^(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,18})?$' });

export const SystemControlCostConversionStatusSchema = Type.Union([
  Type.Literal('available'), Type.Literal('expired'), Type.Literal('unknown'),
]);
export type SystemControlCostConversionStatus = Static<typeof SystemControlCostConversionStatusSchema>;

export const SystemControlCostConversionSnapshotSchema = Type.Object({
  conversionSnapshotId: Type.String({ format: 'uuid' }),
  sourceCurrency: Type.String({ minLength: 3, maxLength: 12, pattern: '^[A-Z0-9_-]+$' }),
  targetCurrency: Type.Literal('CNY'),
  rate: DecimalString,
  rateDigest: Type.String({ minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' }),
  effectiveAt: Timestamp(),
  expiresAt: Timestamp(),
  status: SystemControlCostConversionStatusSchema,
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlCostConversionSnapshot = Static<typeof SystemControlCostConversionSnapshotSchema>;

export const SystemControlCreateCostConversionSnapshotBodySchema = Type.Object({
  conversionSnapshotId: Type.String({ format: 'uuid' }),
  sourceCurrency: Type.String({ minLength: 3, maxLength: 12, pattern: '^[A-Z0-9_-]+$' }),
  effectiveAt: Timestamp(),
  expiresAt: Timestamp(),
}, { additionalProperties: false });
export type SystemControlCreateCostConversionSnapshotBody = Static<typeof SystemControlCreateCostConversionSnapshotBodySchema>;

export const SystemControlCostConversionSnapshotListQuerySchema = Type.Object({
  sourceCurrency: Type.Optional(Type.String({ minLength: 3, maxLength: 12, pattern: '^[A-Z0-9_-]+$' })),
  status: Type.Optional(SystemControlCostConversionStatusSchema),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type SystemControlCostConversionSnapshotListQuery = Static<typeof SystemControlCostConversionSnapshotListQuerySchema>;

export const SystemControlCostConversionSnapshotListSchema = Type.Object({
  items: Type.Array(SystemControlCostConversionSnapshotSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type SystemControlCostConversionSnapshotList = Static<typeof SystemControlCostConversionSnapshotListSchema>;
