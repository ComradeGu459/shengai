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

export const UploadTransportKindSchema = Type.Union([
  Type.Literal('multipart'),
  Type.Literal('tus'),
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
  storageUploadId: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  fileFingerprint: Type.String(),
  checksumAlgorithm: Type.Literal('sha256'),
  checksumValue: Type.Union([Type.String({ pattern: '^[a-f0-9]{64}$' }), Type.Null()]),
  transportKind: UploadTransportKindSchema,
  tusEndpoint: Type.Union([Type.Literal('/api/uploads/tus'), Type.Null()]),
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
  checksumValue: Type.Optional(Type.Union([
    Type.String({ pattern: '^[a-f0-9]{64}$' }),
    Type.Null(),
  ])),
  transportKind: Type.Optional(UploadTransportKindSchema),
  /** 仅用于显式替换同一素材槽中零进度的旧 tus 会话。 */
  replaceUploadId: Type.Optional(Type.String({ format: 'uuid' })),
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

/**
 * create_upload 的稳定只读恢复身份。
 * commandId 与 POST 的 Idempotency-Key 是同一身份；命令记录只有在
 * UploadSession 事务提交后才存在，因此 GET 不伪造 queued/unknown 状态。
 */
export const UploadCreateCommandParamsSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  commandId: Type.String({ minLength: 8, maxLength: 200 }),
}, { additionalProperties: false });

export const UploadCreateCommandResultSchema = Type.Object({
  commandId: Type.String({ minLength: 8, maxLength: 200 }),
  projectId: Type.String({ format: 'uuid' }),
  status: Type.Literal('succeeded'),
  session: UploadSessionSchema,
}, { additionalProperties: false });

export const UploadDirectCapabilityMethodSchema = Type.Union([
  Type.Literal('POST'),
  Type.Literal('HEAD'),
  Type.Literal('PATCH'),
]);

export const UPLOAD_DIRECT_CORS_ORIGIN = 'https://milaidi.online' as const;
export const UPLOAD_DIRECT_CORS_ALLOWED_HEADERS = [
  'Tus-Resumable',
  'Upload-Length',
  'Upload-Metadata',
  'Upload-Offset',
  'Content-Type',
  'x-qimao-upload-capability',
] as const;
export const UPLOAD_DIRECT_CORS_EXPOSED_HEADERS = [
  'Location',
  'Tus-Resumable',
  'Upload-Offset',
  'Upload-Length',
  'Upload-Metadata',
] as const;

/**
 * 主站为既有 tus UploadSession 签发的短时直连能力；能力本身不是业务完成事实，
 * 也不携带可被前端解释为永久对象路径的身份。
 */
export const UploadDirectCapabilitySchema = Type.Object({
  token: Type.String({ minLength: 32, maxLength: 4096 }),
  tusEndpoint: Type.String({ pattern: '^https://[^/?#]+/api/uploads/tus$' }),
  uploadSessionId: Type.String({ format: 'uuid' }),
  projectId: Type.String({ format: 'uuid' }),
  storageUploadId: Type.String({ minLength: 1, maxLength: 255 }),
  expectedSizeBytes: Type.Integer({ minimum: 1 }),
  allowedMethods: Type.Array(UploadDirectCapabilityMethodSchema, { minItems: 3, maxItems: 3 }),
  expiresAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

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
export type UploadTransportKind = Static<typeof UploadTransportKindSchema>;
export type UploadPart = Static<typeof UploadPartSchema>;
export type UploadAsset = Static<typeof UploadAssetSchema>;
export type UploadMaterialTarget = Static<typeof UploadMaterialTargetSchema>;
export type UploadMaterialBindingIntent = Static<typeof UploadMaterialBindingIntentSchema>;
export type CreateUploadBody = Static<typeof CreateUploadBodySchema>;
export type AuthorizeUploadPartBody = Static<typeof AuthorizeUploadPartBodySchema>;
export type ConfirmUploadPartBody = Static<typeof ConfirmUploadPartBodySchema>;
export type CompleteUploadBody = Static<typeof CompleteUploadBodySchema>;
export type AbortUploadBody = Static<typeof AbortUploadBodySchema>;
export type UploadCreateCommandParams = Static<typeof UploadCreateCommandParamsSchema>;
export type UploadCreateCommandResult = Static<typeof UploadCreateCommandResultSchema>;
export type UploadDirectCapability = Static<typeof UploadDirectCapabilitySchema>;
