import { Static, Type } from '@sinclair/typebox';

const Uuid = () => Type.String({ format: 'uuid' });
const Timestamp = () => Type.String({ format: 'date-time' });

export const TaskTypeSchema = Type.Union([
  Type.Literal('asr_dispatch'),
  Type.Literal('asr_batch'),
  Type.Literal('screen_text_batch'),
  Type.Literal('term_extraction'),
  Type.Literal('pre_review_preparation'),
  Type.Literal('delivery_generation'),
]);
export type TaskType = Static<typeof TaskTypeSchema>;

export const TaskStatusSchema = Type.Union([
  Type.Literal('queued'),
  Type.Literal('running'),
  Type.Literal('waiting_review'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('cancel_requested'),
  Type.Literal('cancelled'),
  Type.Literal('reconciliation_required'),
  Type.Literal('stale'),
  Type.Literal('unknown'),
]);
export type TaskStatus = Static<typeof TaskStatusSchema>;

export const TaskSortBySchema = Type.Union([
  Type.Literal('updatedAt'),
  Type.Literal('createdAt'),
  Type.Literal('attentionPriority'),
]);
export type TaskSortBy = Static<typeof TaskSortBySchema>;

export const TaskSortDirectionSchema = Type.Union([Type.Literal('asc'), Type.Literal('desc')]);
export type TaskSortDirection = Static<typeof TaskSortDirectionSchema>;

const PageNumberSchema = Type.Union([
  Type.Integer({ minimum: 1, maximum: 100 }),
  Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
]);
const OffsetSchema = Type.Union([
  Type.Integer({ minimum: 0 }),
  Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' }),
]);

export const TaskListQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 120 })),
  taskType: Type.Optional(TaskTypeSchema),
  status: Type.Optional(TaskStatusSchema),
  projectId: Type.Optional(Uuid()),
  sortBy: Type.Optional(TaskSortBySchema),
  sortDirection: Type.Optional(TaskSortDirectionSchema),
  limit: Type.Optional(PageNumberSchema),
  offset: Type.Optional(OffsetSchema),
}, { additionalProperties: false });
export type TaskListQuery = Static<typeof TaskListQuerySchema>;

export const TaskProgressSchema = Type.Object({
  completedCount: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  totalCount: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  phase: Type.Union([Type.String({ maxLength: 80 }), Type.Null()]),
}, { additionalProperties: false });
export type TaskProgress = Static<typeof TaskProgressSchema>;

export const TaskErrorSchema = Type.Object({
  code: Type.String({ minLength: 1, maxLength: 120 }),
  reason: Type.String({ minLength: 1, maxLength: 240 }),
  retryable: Type.Boolean(),
  reconciliationRequired: Type.Boolean(),
  requestId: Type.Union([Type.String({ minLength: 1, maxLength: 200 }), Type.Null()]),
}, { additionalProperties: false });
export type TaskError = Static<typeof TaskErrorSchema>;

export const TaskSummarySchema = Type.Object({
  taskType: TaskTypeSchema,
  resourceId: Uuid(),
  shortId: Type.String({ minLength: 1, maxLength: 40 }),
  name: Type.String({ minLength: 1, maxLength: 120 }),
  projectId: Type.Union([Uuid(), Type.Null()]),
  projectName: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  projectIds: Type.Array(Uuid(), { maxItems: 20 }),
  projectNames: Type.Array(Type.String({ minLength: 1, maxLength: 120 }), { maxItems: 20 }),
  status: TaskStatusSchema,
  nativeStatus: Type.String({ minLength: 1, maxLength: 80 }),
  progress: TaskProgressSchema,
  error: Type.Union([TaskErrorSchema, Type.Null()]),
  createdAt: Timestamp(),
  updatedAt: Timestamp(),
  availableActions: Type.Array(Type.String({ minLength: 1, maxLength: 40 }), { maxItems: 8 }),
  returnPath: Type.String({ minLength: 1, maxLength: 240 }),
}, { additionalProperties: false });
export type TaskSummary = Static<typeof TaskSummarySchema>;

export const TaskHistoryEntrySchema = Type.Object({
  resourceId: Uuid(),
  kind: Type.Union([Type.Literal('job'), Type.Literal('attempt'), Type.Literal('run'), Type.Literal('child')]),
  status: TaskStatusSchema,
  nativeStatus: Type.String({ minLength: 1, maxLength: 80 }),
  requestId: Type.Union([Type.String({ minLength: 1, maxLength: 200 }), Type.Null()]),
  error: Type.Union([TaskErrorSchema, Type.Null()]),
  createdAt: Timestamp(),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type TaskHistoryEntry = Static<typeof TaskHistoryEntrySchema>;

export const TaskDispatchAcceptanceStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('ready'),
  Type.Literal('accepted'),
  Type.Literal('blocked'),
]);
export type TaskDispatchAcceptanceStatus = Static<typeof TaskDispatchAcceptanceStatusSchema>;

export const TaskDispatchResultSchema = Type.Object({
  projectId: Uuid(),
  projectName: Type.Union([Type.String({ minLength: 1, maxLength: 120 }), Type.Null()]),
  selectionOrder: Type.Integer({ minimum: 1, maximum: 20 }),
  acceptanceStatus: TaskDispatchAcceptanceStatusSchema,
  batchId: Type.Union([Uuid(), Type.Null()]),
  executionStatus: Type.Union([TaskStatusSchema, Type.Null()]),
  executionUpdatedAt: Type.Union([Timestamp(), Type.Null()]),
  error: Type.Union([TaskErrorSchema, Type.Null()]),
}, { additionalProperties: false });
export type TaskDispatchResult = Static<typeof TaskDispatchResultSchema>;

export const TaskScopeSchema = Type.Object({
  episodeNumbers: Type.Array(Type.Integer({ minimum: 1, maximum: 100 }), { maxItems: 100 }),
  childCount: Type.Integer({ minimum: 0 }),
  childResourceIds: Type.Array(Uuid(), { maxItems: 100 }),
}, { additionalProperties: false });
export type TaskScope = Static<typeof TaskScopeSchema>;

export const TaskDetailSchema = Type.Object({
  summary: TaskSummarySchema,
  scope: TaskScopeSchema,
  history: Type.Array(TaskHistoryEntrySchema, { maxItems: 5 }),
  dispatchResults: Type.Array(TaskDispatchResultSchema, { maxItems: 20 }),
}, { additionalProperties: false });
export type TaskDetail = Static<typeof TaskDetailSchema>;

export const TaskListSchema = Type.Object({
  items: Type.Array(TaskSummarySchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type TaskList = Static<typeof TaskListSchema>;
