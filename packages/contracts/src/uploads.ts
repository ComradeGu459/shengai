import { type Static, Type } from '@sinclair/typebox';

export const UploadStatusSchema = Type.Union([
  Type.Literal('created'),
  Type.Literal('uploading'),
  Type.Literal('completing'),
  Type.Literal('verifying'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('aborted'),
  Type.Literal('expired'),
]);

export const UploadMediaKindSchema = Type.Union([
  Type.Literal('srt'),
  Type.Literal('video'),
]);

export const UploadMaterialTargetSchema = Type.Object({
  episodeNumber: Type.Integer({ minimum: 1, maximum: 100 }),
  role: Type.Union([
    Type.Literal('company_srt'),
    Type.Literal('asr_video'),
    Type.Literal('screen_video'),
  ]),
}, { additionalProperties: false });

export const UploadMaterialBindingIntentSchema = Type.Object({
  manifestId: Type.String({ format: 'uuid' }),
  targets: Type.Array(UploadMaterialTargetSchema, { minItems: 1, maxItems: 2 }),
}, { additionalProperties: false });

export const UploadPartSchema = Type.Object({
  partNumber: Type.Integer({ minimum: 1, maximum: 10_000 }),
  sizeBytes: Type.Integer({ minimum: 1 }),
  etag: Type.String({ minLength: 1, maxLength: 200 }),
  checksumValue: Type.String({ pattern: '^[a-f0-9]{64}$' }),
  confirmedAt: Type.String({ format: 'date-time' }),
});

export const UploadAssetSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  projectId: Type.String({ format: 'uuid' }),
  objectKey: Type.String(),
  originalFileName: Type.String(),
  mediaKind: UploadMediaKindSchema,
  sizeBytes: Type.Integer({ minimum: 1 }),
  checksumAlgorithm: Type.Literal('sha256'),
  checksumValue: Type.String({ pattern: '^[a-f0-9]{64}$' }),
  verifiedAt: Type.String({ format: 'date-time' }),
});

export const UploadSessionSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  projectId: Type.String({ format: 'uuid' }),
  objectKey: Type.String(),
  originalFileName: Type.String(),
  mediaKind: UploadMediaKindSchema,
  sizeBytes: Type.Integer({ minimum: 1 }),
  partSizeBytes: Type.Integer({ minimum: 1 }),
  totalParts: Type.Integer({ minimum: 1, maximum: 10_000 }),
  fileFingerprint: Type.String(),
  checksumAlgorithm: Type.Literal('sha256'),
  checksumValue: Type.String({ pattern: '^[a-f0-9]{64}$' }),
  status: UploadStatusSchema,
  expiresAt: Type.String({ format: 'date-time' }),
  version: Type.Integer({ minimum: 1 }),
  errorCode: Type.Union([Type.String(), Type.Null()]),
  errorDetail: Type.Union([Type.String(), Type.Null()]),
  confirmedParts: Type.Array(UploadPartSchema),
  missingPartNumbers: Type.Array(Type.Integer({ minimum: 1, maximum: 10_000 })),
  asset: Type.Union([UploadAssetSchema, Type.Null()]),
  materialBinding: Type.Union([UploadMaterialBindingIntentSchema, Type.Null()]),
});

export const CreateUploadBodySchema = Type.Object({
  originalFileName: Type.String({ minLength: 1, maxLength: 255 }),
  mediaKind: UploadMediaKindSchema,
  sizeBytes: Type.Integer({ minimum: 1 }),
  fileFingerprint: Type.String({ minLength: 1, maxLength: 700 }),
  checksumAlgorithm: Type.Literal('sha256'),
  checksumValue: Type.String({ pattern: '^[a-f0-9]{64}$' }),
  materialBinding: Type.Optional(UploadMaterialBindingIntentSchema),
}, { additionalProperties: false });

export const AuthorizeUploadPartBodySchema = Type.Object({
  partNumber: Type.Integer({ minimum: 1, maximum: 10_000 }),
  fileFingerprint: Type.String({ minLength: 1, maxLength: 700 }),
}, { additionalProperties: false });

export const UploadPartAuthorizationSchema = Type.Object({
  uploadId: Type.String({ format: 'uuid' }),
  objectKey: Type.String(),
  partNumber: Type.Integer({ minimum: 1, maximum: 10_000 }),
  authorizationToken: Type.String(),
  expiresAt: Type.String({ format: 'date-time' }),
  uploadRequest: Type.Union([
    Type.Object({
      url: Type.String(),
      method: Type.Literal('PUT'),
      headers: Type.Record(Type.String(), Type.String()),
    }),
    Type.Null(),
  ]),
});

export const UploadedPartReceiptSchema = Type.Object({
  partNumber: Type.Integer({ minimum: 1, maximum: 10_000 }),
  sizeBytes: Type.Integer({ minimum: 1 }),
  etag: Type.String({ minLength: 1, maxLength: 200 }),
  checksumValue: Type.String({ pattern: '^[a-f0-9]{64}$' }),
});

export const UploadSessionListSchema = Type.Object({
  items: Type.Array(UploadSessionSchema),
});

export const ConfirmUploadPartBodySchema = Type.Object({
  partNumber: Type.Integer({ minimum: 1, maximum: 10_000 }),
  sizeBytes: Type.Integer({ minimum: 1 }),
  etag: Type.String({ minLength: 1, maxLength: 200 }),
  checksumValue: Type.String({ pattern: '^[a-f0-9]{64}$' }),
}, { additionalProperties: false });

export const CompleteUploadBodySchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });

export const AbortUploadBodySchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });

export const UploadApiErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    retryable: Type.Boolean(),
    action: Type.String(),
    requestId: Type.String(),
    missingPartNumbers: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 10_000 }))),
  }),
});

export type UploadSession = Static<typeof UploadSessionSchema>;
export type UploadStatus = Static<typeof UploadStatusSchema>;
export type UploadPart = Static<typeof UploadPartSchema>;
export type UploadAsset = Static<typeof UploadAssetSchema>;
export type UploadMaterialTarget = Static<typeof UploadMaterialTargetSchema>;
export type UploadMaterialBindingIntent = Static<typeof UploadMaterialBindingIntentSchema>;
export type CreateUploadBody = Static<typeof CreateUploadBodySchema>;
export type AuthorizeUploadPartBody = Static<typeof AuthorizeUploadPartBodySchema>;
export type ConfirmUploadPartBody = Static<typeof ConfirmUploadPartBodySchema>;
export type CompleteUploadBody = Static<typeof CompleteUploadBodySchema>;
export type AbortUploadBody = Static<typeof AbortUploadBodySchema>;
