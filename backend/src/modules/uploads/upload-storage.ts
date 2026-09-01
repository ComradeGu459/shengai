export interface StoredPartInfo {
  partNumber: number;
  sizeBytes: number;
  etag: string;
  checksumValue: string;
}

export interface StoredObjectInfo {
  sizeBytes: number;
  checksumValue: string;
}

/**
 * 服务端签发给浏览器的单分片写入请求。
 * URL 是短时、最小权限的 presigned capability，不包含供应商 Secret。
 */
export interface UploadPartRequest {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface UploadStorage {
  createMultipart(objectKey: string, options?: { contentType?: string }): Promise<string>;
  authorizePart(input: {
    storageUploadId: string;
    objectKey: string;
    partNumber: number;
    expiresAt: Date;
    /** 由既有 UploadSession 派生的签名绑定字段。旧适配器可忽略，S3 适配器必须校验。 */
    projectId?: string;
    uploadSessionId?: string;
    sizeBytes?: number;
    contentType?: string;
  }): Promise<{ authorizationToken: string; expiresAt: Date; uploadRequest?: UploadPartRequest }>;
  getUploadedPart(input: {
    storageUploadId: string;
    partNumber: number;
    etag: string;
    objectKey?: string;
    checksumValue?: string;
  }): Promise<StoredPartInfo | null>;
  completeMultipart(input: {
    storageUploadId: string;
    objectKey: string;
    parts: StoredPartInfo[];
  }): Promise<void>;
  headObject(objectKey: string): Promise<StoredObjectInfo | null>;
  readObject(objectKey: string): Promise<Uint8Array | null>;
  abortMultipart(input: { storageUploadId: string; objectKey: string }): Promise<void>;
  deleteObject(objectKey: string): Promise<'deleted' | 'missing'>;
}

/** 只有能把已校验字节写入最终对象命名空间的存储才可接收 tus 成品。 */
export interface UploadObjectWriter {
  putObject(input: {
    objectKey: string;
    bytes: Uint8Array;
    contentType: string;
    metadata: Record<string, string>;
  }): Promise<StoredObjectInfo & { objectKey?: string }>;
}

export const isUploadObjectWriter = (storage: UploadStorage): storage is UploadStorage & UploadObjectWriter =>
  typeof (storage as Partial<UploadObjectWriter>).putObject === 'function';

/** 只有明确实现该能力的存储才允许后端同源二进制分片入口。 */
export interface DirectUploadStorage extends UploadStorage {
  uploadAuthorizedPart(
    authorizationToken: string,
    bytes: Uint8Array,
    expected: {
      storageUploadId: string;
      objectKey: string;
      partNumber: number;
      sizeBytes?: number;
      contentType?: string;
    },
  ): Promise<StoredPartInfo>;
}

export const isDirectUploadStorage = (storage: UploadStorage): storage is DirectUploadStorage =>
  typeof (storage as Partial<DirectUploadStorage>).uploadAuthorizedPart === 'function';

/** browser_direct 仍只返回 presigned URL；仅 server_relay 暴露同源二进制入口。 */
export const isServerRelayUploadStorage = (storage: UploadStorage): storage is DirectUploadStorage =>
  isDirectUploadStorage(storage) && (storage as { uploadMode?: string }).uploadMode !== 'browser_direct';

/**
 * 对象存储失败只允许通过稳定的公共分类离开存储边界；供应商的原始
 * error.name/message、响应正文和请求标识不得进入 HTTP 响应或日志。
 */
export type StorageFailureCode =
  | 'STORAGE_TEMPORARY_FAILURE'
  | 'STORAGE_PROVIDER_AUTH'
  | 'STORAGE_PROVIDER_NOT_FOUND'
  | 'STORAGE_PROVIDER_RATE_LIMITED'
  | 'STORAGE_PROVIDER_REJECTED'
  | 'STORAGE_PROVIDER_UNAVAILABLE'
  | 'STORAGE_PROVIDER_PROTOCOL_INVALID';

export class StorageTemporaryError extends Error {
  readonly code: StorageFailureCode;

  constructor(message = '测试存储暂时不可用。', code: StorageFailureCode = 'STORAGE_TEMPORARY_FAILURE') {
    super(message);
    this.name = 'StorageTemporaryError';
    this.code = code;
  }
}

export class StorageAuthorizationExpiredError extends Error {
  constructor() {
    super('分片授权已经过期。');
    this.name = 'StorageAuthorizationExpiredError';
  }
}

export class StorageAuthorizationInvalidError extends Error {
  constructor(message = '分片上传授权无效。') {
    super(message);
    this.name = 'StorageAuthorizationInvalidError';
  }
}
