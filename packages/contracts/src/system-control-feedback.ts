import { Type, type Static } from '@sinclair/typebox';

const Uuid = () => Type.String({ format: 'uuid' });
const Timestamp = () => Type.String({ format: 'date-time' });
const SafeText = (maxLength: number) => Type.String({ minLength: 1, maxLength });
const SafeId = () => Type.String({ minLength: 1, maxLength: 255, pattern: '^[A-Za-z0-9_.:-]+$' });

export const FeedbackKindSchema = Type.Union([
  Type.Literal('no_response'),
  Type.Literal('display_incorrect'),
  Type.Literal('state_incorrect'),
  Type.Literal('slow'),
  Type.Literal('unclear_next_step'),
  Type.Literal('suggestion'),
]);
export type FeedbackKind = Static<typeof FeedbackKindSchema>;

export const FeedbackStatusSchema = Type.Union([
  Type.Literal('new'),
  Type.Literal('confirmed'),
  Type.Literal('fixing'),
  Type.Literal('retest'),
  Type.Literal('closed'),
]);
export type FeedbackStatus = Static<typeof FeedbackStatusSchema>;

export const FeedbackSurfaceSchema = Type.Union([Type.Literal('employee'), Type.Literal('system_control')]);
export type FeedbackSurface = Static<typeof FeedbackSurfaceSchema>;

export const FeedbackTaskTypeSchema = Type.Union([
  Type.Literal('asr_dispatch'),
  Type.Literal('asr_batch'),
  Type.Literal('screen_text_batch'),
  Type.Literal('term_extraction'),
  Type.Literal('pre_review_preparation'),
  Type.Literal('delivery_generation'),
]);
export type FeedbackTaskType = Static<typeof FeedbackTaskTypeSchema>;

export const FeedbackBrowserSummarySchema = Type.Object({
  family: Type.String({ minLength: 1, maxLength: 60, pattern: '^[A-Za-z0-9._ +()\\-]+$' }),
  version: Type.String({ minLength: 1, maxLength: 60, pattern: '^[A-Za-z0-9._ +()\\-]+$' }),
  platform: Type.Optional(Type.String({ minLength: 1, maxLength: 60, pattern: '^[A-Za-z0-9._ +()\\-]+$' })),
}, { additionalProperties: false });
export type FeedbackBrowserSummary = Static<typeof FeedbackBrowserSummarySchema>;

export const FeedbackViewportSchema = Type.Object({
  width: Type.Integer({ minimum: 1, maximum: 10000 }),
  height: Type.Integer({ minimum: 1, maximum: 10000 }),
}, { additionalProperties: false });
export type FeedbackViewport = Static<typeof FeedbackViewportSchema>;

export const FeedbackPerformanceSummarySchema = Type.Object({
  pageLoadMs: Type.Optional(Type.Integer({ minimum: 0, maximum: 3_600_000 })),
  interactionMs: Type.Optional(Type.Integer({ minimum: 0, maximum: 3_600_000 })),
  apiMs: Type.Optional(Type.Integer({ minimum: 0, maximum: 3_600_000 })),
}, { additionalProperties: false });
export type FeedbackPerformanceSummary = Static<typeof FeedbackPerformanceSummarySchema>;

const FeedbackContextFields = {
  subject: SafeText(255),
  projectId: Type.Union([Uuid(), Type.Null()]),
  taskType: Type.Union([FeedbackTaskTypeSchema, Type.Null()]),
  resourceId: Type.Union([Uuid(), Type.Null()]),
  routeTemplate: Type.String({ minLength: 1, maxLength: 240, pattern: '^/[A-Za-z0-9_./:{}-]+$' }),
  buildVersion: SafeText(120),
  requestIds: Type.Array(SafeId(), { maxItems: 20 }),
  browserSummary: FeedbackBrowserSummarySchema,
  viewport: FeedbackViewportSchema,
  timezone: Type.String({ minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9_+:/.-]+$' }),
  performanceSummary: Type.Union([FeedbackPerformanceSummarySchema, Type.Null()]),
};

export const FeedbackCreateBodySchema = Type.Object({
  feedbackId: Uuid(),
  kind: FeedbackKindSchema,
  description: Type.String({ minLength: 1, maxLength: 1000 }),
  projectId: Type.Optional(Uuid()),
  taskType: Type.Optional(FeedbackTaskTypeSchema),
  resourceId: Type.Optional(Uuid()),
  routeTemplate: FeedbackContextFields.routeTemplate,
  buildVersion: Type.String({ minLength: 1, maxLength: 120, pattern: '^[A-Za-z0-9._+:-]+$' }),
  requestIds: FeedbackContextFields.requestIds,
  browserSummary: FeedbackBrowserSummarySchema,
  viewport: FeedbackViewportSchema,
  timezone: FeedbackContextFields.timezone,
  performanceSummary: Type.Optional(FeedbackPerformanceSummarySchema),
}, { additionalProperties: false });
export type FeedbackCreateBody = Static<typeof FeedbackCreateBodySchema>;

export const FeedbackEventActionSchema = Type.Union([
  Type.Literal('confirmed'),
  Type.Literal('fixing_started'),
  Type.Literal('retest_requested'),
  Type.Literal('closed'),
  Type.Literal('reopened'),
]);
export type FeedbackEventAction = Static<typeof FeedbackEventActionSchema>;

export const FeedbackEventSchema = Type.Object({
  feedbackEventId: Uuid(),
  feedbackId: Uuid(),
  action: Type.Union([Type.Literal('created'), FeedbackEventActionSchema]),
  fromStatus: Type.Union([FeedbackStatusSchema, Type.Null()]),
  toStatus: FeedbackStatusSchema,
  note: Type.Union([Type.String({ maxLength: 1000 }), Type.Null()]),
  actorSubject: SafeText(255),
  requestId: SafeId(),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type FeedbackEvent = Static<typeof FeedbackEventSchema>;

export const FeedbackAttachmentStatusSchema = Type.Union([
  Type.Literal('authorized'),
  Type.Literal('uploaded'),
  Type.Literal('failed'),
]);
export type FeedbackAttachmentStatus = Static<typeof FeedbackAttachmentStatusSchema>;

export const FeedbackScreenshotAttachmentSchema = Type.Object({
  attachmentId: Uuid(),
  feedbackId: Uuid(),
  status: FeedbackAttachmentStatusSchema,
  contentType: Type.Union([Type.Literal('image/png'), Type.Literal('image/jpeg'), Type.Literal('image/webp')]),
  sizeBytes: Type.Integer({ minimum: 1, maximum: 5_000_000 }),
  contentDigest: Type.String({ pattern: '^[0-9a-f]{64}$' }),
  privacyConfirmedAt: Timestamp(),
  createdAt: Timestamp(),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type FeedbackScreenshotAttachment = Static<typeof FeedbackScreenshotAttachmentSchema>;

export const FeedbackLatestEventSummarySchema = Type.Object({
  feedbackEventId: Uuid(),
  action: Type.Union([Type.Literal('created'), FeedbackEventActionSchema]),
  toStatus: FeedbackStatusSchema,
  actorSubject: SafeText(255),
  requestId: SafeId(),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type FeedbackLatestEventSummary = Static<typeof FeedbackLatestEventSummarySchema>;

export const FeedbackListItemSchema = Type.Object({
  feedbackId: Uuid(),
  description: Type.String({ minLength: 1, maxLength: 1000 }),
  surface: FeedbackSurfaceSchema,
  routeTemplate: Type.String({ minLength: 1, maxLength: 240, pattern: '^/[A-Za-z0-9_./:{}-]+$' }),
  kind: FeedbackKindSchema,
  projectId: Type.Union([Uuid(), Type.Null()]),
  status: FeedbackStatusSchema,
  updatedAt: Timestamp(),
  latestEvent: Type.Union([FeedbackLatestEventSummarySchema, Type.Null()]),
}, { additionalProperties: false });
export type FeedbackListItem = Static<typeof FeedbackListItemSchema>;

export const FeedbackReportSchema = Type.Object({
  feedbackId: Uuid(),
  kind: FeedbackKindSchema,
  status: FeedbackStatusSchema,
  description: Type.String({ minLength: 1, maxLength: 1000 }),
  surface: FeedbackSurfaceSchema,
  ...FeedbackContextFields,
  screenshotAttachmentId: Type.Union([Uuid(), Type.Null()]),
  revision: Type.Integer({ minimum: 1 }),
  createdAt: Timestamp(),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type FeedbackReport = Static<typeof FeedbackReportSchema>;

export const FeedbackReportDetailSchema = Type.Object({
  report: FeedbackReportSchema,
  attachment: Type.Union([FeedbackScreenshotAttachmentSchema, Type.Null()]),
  events: Type.Array(FeedbackEventSchema, { maxItems: 100 }),
}, { additionalProperties: false });
export type FeedbackReportDetail = Static<typeof FeedbackReportDetailSchema>;

export const FeedbackListQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  surface: Type.Optional(FeedbackSurfaceSchema),
  kind: Type.Optional(FeedbackKindSchema),
  status: Type.Optional(FeedbackStatusSchema),
  projectId: Type.Optional(Uuid()),
  from: Type.Optional(Timestamp()),
  to: Type.Optional(Timestamp()),
  sort: Type.Optional(Type.Union([Type.Literal('attention'), Type.Literal('updatedAt'), Type.Literal('createdAt')])),
  sortDirection: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type FeedbackListQuery = Static<typeof FeedbackListQuerySchema>;

export const FeedbackListSchema = Type.Object({
  items: Type.Array(FeedbackListItemSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type FeedbackList = Static<typeof FeedbackListSchema>;

export const FeedbackEventListQuerySchema = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
  offset: Type.Optional(Type.String({ pattern: '^(?:0|[1-9][0-9]{0,5})$' })),
}, { additionalProperties: false });
export type FeedbackEventListQuery = Static<typeof FeedbackEventListQuerySchema>;

export const FeedbackEventListSchema = Type.Object({
  items: Type.Array(FeedbackEventSchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 100 }),
  offset: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });
export type FeedbackEventList = Static<typeof FeedbackEventListSchema>;

export const FeedbackEventBodySchema = Type.Object({
  feedbackEventId: Uuid(),
  action: FeedbackEventActionSchema,
  note: Type.Optional(Type.String({ maxLength: 1000 })),
}, { additionalProperties: false });
export type FeedbackEventBody = Static<typeof FeedbackEventBodySchema>;

const AttachmentBodyFields = {
  attachmentId: Uuid(),
  contentType: Type.Union([Type.Literal('image/png'), Type.Literal('image/jpeg'), Type.Literal('image/webp')]),
  sizeBytes: Type.Integer({ minimum: 1, maximum: 5_000_000 }),
  contentDigest: Type.String({ pattern: '^[0-9a-f]{64}$' }),
  privacyConfirmed: Type.Literal(true),
};

export const FeedbackScreenshotAuthorizationBodySchema = Type.Object(AttachmentBodyFields, { additionalProperties: false });
export type FeedbackScreenshotAuthorizationBody = Static<typeof FeedbackScreenshotAuthorizationBodySchema>;
export const FeedbackScreenshotCompletionBodySchema = Type.Object({}, { additionalProperties: false });
export type FeedbackScreenshotCompletionBody = Static<typeof FeedbackScreenshotCompletionBodySchema>;
