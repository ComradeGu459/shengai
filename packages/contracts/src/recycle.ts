import { type Static, Type } from '@sinclair/typebox';

import { LifecycleStatusSchema, ProjectSchema, WorkflowStatusSchema } from './projects.js';

export const ProjectLifecycleCommandBodySchema = Type.Object(
  { expectedVersion: Type.Integer({ minimum: 1 }) },
  { additionalProperties: false },
);

export const CleanupJobStatusSchema = Type.Union([
  Type.Literal('scheduled'),
  Type.Literal('leased'),
  Type.Literal('retryable'),
  Type.Literal('failed'),
  Type.Literal('completed'),
  Type.Literal('cancelled'),
]);

export const CleanupJobProjectionSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  status: CleanupJobStatusSchema,
  attemptCount: Type.Integer({ minimum: 0 }),
  leaseExpiresAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  nextAttemptAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  lastError: Type.Union([Type.String(), Type.Null()]),
  completedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

const RecycleBinLimitSchema = Type.Union([
  Type.Integer({ minimum: 1, maximum: 100 }),
  Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
]);

const RecycleBinOffsetSchema = Type.Union([
  Type.Integer({ minimum: 0 }),
  Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
]);

export const RecycleBinItemSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  workflowStatus: WorkflowStatusSchema,
  lifecycleStatus: Type.Union([Type.Literal('recycled'), Type.Literal('purging')]),
  recycledAt: Type.String({ format: 'date-time' }),
  recycleExpiresAt: Type.String({ format: 'date-time' }),
  version: Type.Integer({ minimum: 1 }),
  updatedAt: Type.String({ format: 'date-time' }),
  cleanupJob: CleanupJobProjectionSchema,
});

export const RecycleBinQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 120 })),
  lifecycleStatus: Type.Optional(Type.Union([Type.Literal('recycled'), Type.Literal('purging')])),
  cleanupJobStatus: Type.Optional(CleanupJobStatusSchema),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('recycleExpiresAt'),
    Type.Literal('name'),
    Type.Literal('recycledAt'),
  ])),
  sortDirection: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
  limit: Type.Optional(RecycleBinLimitSchema),
  offset: Type.Optional(RecycleBinOffsetSchema),
});

export const RecycleBinListSchema = Type.Object({
  items: Type.Array(RecycleBinItemSchema),
  total: Type.Integer({ minimum: 0 }),
});

export const RestoreProjectCommandResultSchema = Type.Object({
  project: ProjectSchema,
});

export const RecycleProjectCommandResultSchema = Type.Object({
  project: ProjectSchema,
  terminatedUploadCount: Type.Integer({ minimum: 0 }),
});

export const ProjectLifecycleCommandResultSchema = RestoreProjectCommandResultSchema;

export type ProjectLifecycleCommandBody = Static<typeof ProjectLifecycleCommandBodySchema>;
export type CleanupJobStatus = Static<typeof CleanupJobStatusSchema>;
export type CleanupJobProjection = Static<typeof CleanupJobProjectionSchema>;
export type RecycleBinQuery = Static<typeof RecycleBinQuerySchema>;
export type RecycleBinItem = Static<typeof RecycleBinItemSchema>;
export type RecycleBinList = Static<typeof RecycleBinListSchema>;
export type RestoreProjectCommandResult = Static<typeof RestoreProjectCommandResultSchema>;
export type RecycleProjectCommandResult = Static<typeof RecycleProjectCommandResultSchema>;
export type ProjectLifecycleCommandResult = RestoreProjectCommandResult;

void LifecycleStatusSchema;
