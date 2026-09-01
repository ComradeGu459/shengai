import { Type, type Static } from '@sinclair/typebox';

const Uuid = () => Type.String({ format: 'uuid' });
const Timestamp = () => Type.String({ format: 'date-time' });
const Digest = () => Type.String({ pattern: '^[0-9a-f]{64}$' });

export const DeliveryProductStatusSchema = Type.Union([
  Type.Literal('preparing'), Type.Literal('ready'),
  Type.Literal('generation_failed'), Type.Literal('recycled'),
]);
export type DeliveryProductStatus = Static<typeof DeliveryProductStatusSchema>;

export const DeliveryFileKindSchema = Type.Union([
  Type.Literal('dialogue_srt'), Type.Literal('screen_text_srt'), Type.Literal('terms_xlsx'),
]);
export type DeliveryFileKind = Static<typeof DeliveryFileKindSchema>;

export const DeliverySourceSchema = Type.Object({
  acceptanceSessionId: Uuid(), acceptanceSessionRevision: Type.Integer({ minimum: 1 }),
  acceptanceReleaseId: Type.Union([Uuid(), Type.Null()]), acceptanceReleaseVersion: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  preEditReleaseId: Uuid(), preEditReleaseVersion: Type.Integer({ minimum: 1 }),
  screenTextReleaseId: Type.Union([Uuid(), Type.Null()]), screenTextReleaseVersion: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  manifestId: Uuid(), manifestVersion: Type.Integer({ minimum: 1 }),
  termVersionId: Uuid(), termVersion: Type.Integer({ minimum: 1 }),
  templateVersionId: Uuid(), templateVersion: Type.Integer({ minimum: 1 }),
  sourceDigest: Digest(),
}, { additionalProperties: false });
export type DeliverySource = Static<typeof DeliverySourceSchema>;

export const DeliveryFileSchema = Type.Object({
  id: Uuid(), kind: DeliveryFileKindSchema, episodeNumber: Type.Union([Type.Integer({ minimum: 1, maximum: 100 }), Type.Null()]),
  fileName: Type.String({ minLength: 1, maxLength: 255 }), contentType: Type.String({ minLength: 1, maxLength: 120 }),
  contentDigest: Digest(), sizeBytes: Type.Integer({ minimum: 0 }), cueCount: Type.Integer({ minimum: 0 }),
  emptyTrack: Type.Boolean(), downloadUrl: Type.String(), createdAt: Timestamp(),
}, { additionalProperties: false });
export type DeliveryFile = Static<typeof DeliveryFileSchema>;

export const DeliveryManifestSchema = Type.Object({
  id: Uuid(), version: Type.Integer({ minimum: 1 }), digest: Digest(), fileCount: Type.Integer({ minimum: 0 }),
  dialogueCueCount: Type.Integer({ minimum: 0 }), screenTextCueCount: Type.Integer({ minimum: 0 }), termCount: Type.Integer({ minimum: 0 }),
  createdAt: Timestamp(), files: Type.Array(DeliveryFileSchema),
}, { additionalProperties: false });
export type DeliveryManifest = Static<typeof DeliveryManifestSchema>;

export const DeliveryEventSchema = Type.Object({
  id: Uuid(), kind: Type.String({ minLength: 1, maxLength: 80 }), requestId: Type.String({ minLength: 1, maxLength: 200 }),
  detail: Type.Record(Type.String(), Type.Unknown()), createdAt: Timestamp(),
}, { additionalProperties: false });
export type DeliveryEvent = Static<typeof DeliveryEventSchema>;

export const DeliveryProductSchema = Type.Object({
  id: Uuid(), deliveryId: Uuid(), projectId: Uuid(), projectName: Type.String(), name: Type.String(), version: Type.Integer({ minimum: 1 }),
  status: DeliveryProductStatusSchema, owner: Type.String(), note: Type.String(), requestId: Type.String(),
  failureReason: Type.Union([Type.String(), Type.Null()]), failureRequestId: Type.Union([Type.String(), Type.Null()]),
  acceptanceSessionId: Uuid(), source: DeliverySourceSchema,
  fileSummary: Type.Object({ dialogueEpisodes: Type.Integer({ minimum: 0 }), dialogueCueCount: Type.Integer({ minimum: 0 }), screenTextEpisodes: Type.Integer({ minimum: 0 }), screenTextNonEmptyEpisodes: Type.Integer({ minimum: 0 }), screenTextCueCount: Type.Integer({ minimum: 0 }), termCount: Type.Integer({ minimum: 0 }) }, { additionalProperties: false }),
  createdAt: Timestamp(), updatedAt: Timestamp(),
}, { additionalProperties: false });
export type DeliveryProduct = Static<typeof DeliveryProductSchema>;

export const DeliveryProductDetailSchema = Type.Object({
  product: DeliveryProductSchema, manifest: Type.Union([DeliveryManifestSchema, Type.Null()]), events: Type.Array(DeliveryEventSchema),
}, { additionalProperties: false });
export type DeliveryProductDetail = Static<typeof DeliveryProductDetailSchema>;

export const DeliveryConfirmationEpisodeSchema = Type.Object({
  episodeNumber: Type.Integer({ minimum: 1, maximum: 100 }), dialogueCueCount: Type.Integer({ minimum: 0 }), screenTextCueCount: Type.Integer({ minimum: 0 }),
  dialogueFileName: Type.String(), screenTextFileName: Type.String(), screenTextEmpty: Type.Boolean(), status: Type.String(),
}, { additionalProperties: false });
export const DeliveryConfirmationSchema = Type.Object({
  projectId: Uuid(), projectName: Type.String(), sessionId: Uuid(), sessionRevision: Type.Integer({ minimum: 1 }),
  canGenerate: Type.Boolean(), blockers: Type.Array(Type.String()), owner: Type.String(), note: Type.String(),
  productNamePreview: Type.String(), nextVersion: Type.Integer({ minimum: 1 }), source: DeliverySourceSchema, sourceDigest: Digest(), templateVersionId: Uuid(),
  summaries: Type.Object({ dialogueEpisodes: Type.Integer({ minimum: 0 }), dialogueCueCount: Type.Integer({ minimum: 0 }), screenTextEpisodes: Type.Integer({ minimum: 0 }), screenTextNonEmptyEpisodes: Type.Integer({ minimum: 0 }), screenTextCueCount: Type.Integer({ minimum: 0 }), termCount: Type.Integer({ minimum: 0 }), templateName: Type.String(), templateVersion: Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
  episodes: Type.Array(DeliveryConfirmationEpisodeSchema),
}, { additionalProperties: false });
export type DeliveryConfirmation = Static<typeof DeliveryConfirmationSchema>;

export const CreateDeliveryBodySchema = Type.Object({
  sessionId: Uuid(), expectedSessionRevision: Type.Integer({ minimum: 1 }), deliveryId: Uuid(), sourceDigest: Digest(), templateVersionId: Uuid(),
  owner: Type.Optional(Type.String({ maxLength: 120 })), note: Type.Optional(Type.String({ maxLength: 2_000 })),
}, { additionalProperties: false });
export type CreateDeliveryBody = Static<typeof CreateDeliveryBodySchema>;

export const RecoverDeliveryBodySchema = Type.Object({}, { additionalProperties: false });
export type RecoverDeliveryBody = Static<typeof RecoverDeliveryBodySchema>;

export const UpdateDeliveryMetadataBodySchema = Type.Object({
  note: Type.Optional(Type.String({ maxLength: 2_000 })), owner: Type.Optional(Type.String({ maxLength: 120 })),
}, { additionalProperties: false });
export type UpdateDeliveryMetadataBody = Static<typeof UpdateDeliveryMetadataBodySchema>;

const QueryLimit = Type.Union([Type.Integer({ minimum: 1, maximum: 100 }), Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })]);
const QueryOffset = Type.Union([Type.Integer({ minimum: 0 }), Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' })]);
export const DeliveryListQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 120 })), status: Type.Optional(DeliveryProductStatusSchema),
  sortBy: Type.Optional(Type.Union([Type.Literal('createdAt'), Type.Literal('updatedAt')])),
  sortDirection: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])), limit: Type.Optional(QueryLimit), offset: Type.Optional(QueryOffset),
}, { additionalProperties: false });
export type DeliveryListQuery = Static<typeof DeliveryListQuerySchema>;
export const DeliveryListSchema = Type.Object({ items: Type.Array(DeliveryProductSchema), total: Type.Integer({ minimum: 0 }), limit: Type.Integer({ minimum: 1 }), offset: Type.Integer({ minimum: 0 }) }, { additionalProperties: false });

export const DeliveryCommandResultSchema = Type.Object({ product: DeliveryProductDetailSchema, replay: Type.Boolean() }, { additionalProperties: false });
export type DeliveryCommandResult = Static<typeof DeliveryCommandResultSchema>;

// 兼容模块内更直观的命名，语义仍由上面的唯一 Schema 持有。
export const DeliveryStatusSchema = DeliveryProductStatusSchema;
export type DeliveryStatus = DeliveryProductStatus;
export const DeliverySchema = DeliveryProductSchema;
export type Delivery = DeliveryProduct;
export const DeliveryProductCommandResultSchema = DeliveryCommandResultSchema;
export type DeliveryProductCommandResult = DeliveryCommandResult;
export const CreateDeliveryProductBodySchema = CreateDeliveryBodySchema;
export type CreateDeliveryProductBody = CreateDeliveryBody;
