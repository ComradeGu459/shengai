import { type Static, Type } from '@sinclair/typebox';

export const WorkflowStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('uploading'),
  Type.Literal('verifying'),
  Type.Literal('ready'),
  Type.Literal('blocked'),
]);

export const LifecycleStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('recycled'),
  Type.Literal('purging'),
  Type.Literal('purged'),
]);

export const ProjectSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String({ minLength: 1, maxLength: 120 }),
  workflowStatus: WorkflowStatusSchema,
  lifecycleStatus: LifecycleStatusSchema,
  recycleExpiresAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  version: Type.Integer({ minimum: 1 }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  createdBy: Type.String(),
  updatedBy: Type.String(),
});

export const CreateProjectBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 120 }),
  },
  { additionalProperties: false },
);

export const ListProjectsQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 120 })),
  workflowStatus: Type.Optional(WorkflowStatusSchema),
  lifecycleStatus: Type.Optional(LifecycleStatusSchema),
  limit: Type.Optional(Type.Union([
    Type.Integer({ minimum: 1, maximum: 100 }),
    Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
  ])),
  offset: Type.Optional(Type.Union([
    Type.Integer({ minimum: 0 }),
    Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
  ])),
});

export const ProjectListSchema = Type.Object({
  items: Type.Array(ProjectSchema),
  total: Type.Integer({ minimum: 0 }),
});

export const ApiErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    retryable: Type.Boolean(),
    action: Type.String(),
    requestId: Type.String(),
  }),
});

export type Project = Static<typeof ProjectSchema>;
export type CreateProjectBody = Static<typeof CreateProjectBodySchema>;
export type ListProjectsQuery = Static<typeof ListProjectsQuerySchema>;
export type ProjectList = Static<typeof ProjectListSchema>;
