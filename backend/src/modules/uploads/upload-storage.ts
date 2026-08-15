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

export interface UploadStorage {
  createMultipart(objectKey: string): Promise<string>;
  authorizePart(input: {
    storageUploadId: string;
    objectKey: string;
    partNumber: number;
    expiresAt: Date;
  }): Promise<{ authorizationToken: string; expiresAt: Date }>;
  getUploadedPart(input: {
    storageUploadId: string;
    partNumber: number;
    etag: string;
  }): Promise<StoredPartInfo | null>;
  completeMultipart(input: {
    storageUploadId: string;
    objectKey: string;
    parts: StoredPartInfo[];
  }): Promise<void>;
  headObject(objectKey: string): Promise<StoredObjectInfo | null>;
  readObject(objectKey: string): Promise<Uint8Array | null>;
  abortMultipart(storageUploadId: string): Promise<void>;
  deleteObject(objectKey: string): Promise<'deleted' | 'missing'>;
}

export class StorageTemporaryError extends Error {
  constructor(message = '测试存储暂时不可用。') {
    super(message);
    this.name = 'StorageTemporaryError';
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
