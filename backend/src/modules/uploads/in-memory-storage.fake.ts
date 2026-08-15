import { createHash, randomUUID } from 'node:crypto';

import {
  StorageAuthorizationExpiredError,
  StorageAuthorizationInvalidError,
  StorageTemporaryError,
  type StoredObjectInfo,
  type StoredPartInfo,
  type UploadStorage,
} from './upload-storage.js';

interface MultipartUpload {
  objectKey: string;
  parts: Map<number, { bytes: Uint8Array; info: StoredPartInfo }>;
}

interface Authorization {
  storageUploadId: string;
  objectKey: string;
  partNumber: number;
  expiresAt: Date;
}

interface OperationGate {
  entered: () => void;
  released: Promise<void>;
}

export class InMemoryStorageFake implements UploadStorage {
  private readonly uploads = new Map<string, MultipartUpload>();
  private readonly authorizations = new Map<string, Authorization>();
  private readonly objects = new Map<string, { bytes: Uint8Array; info: StoredObjectInfo }>();
  private currentTime: () => Date = () => new Date();
  private nextFailure = false;
  private nextCompletionBoundaryFailure = false;
  private nextCompletedObjectFault: 'missing' | 'size' | 'checksum' | null = null;
  private nextPartLookupGate: OperationGate | null = null;
  private nextCompleteGate: OperationGate | null = null;
  private nextDeleteFailure = false;

  setClock(clock: () => Date) {
    this.currentTime = clock;
  }

  failNextOperation() {
    this.nextFailure = true;
  }

  failAfterNextComplete() {
    this.nextCompletionBoundaryFailure = true;
  }

  faultNextCompletedObject(kind: 'missing' | 'size' | 'checksum') {
    this.nextCompletedObjectFault = kind;
  }

  async deleteObject(objectKey: string): Promise<'deleted' | 'missing'> {
    if (this.nextDeleteFailure) {
      this.nextDeleteFailure = false;
      throw new StorageTemporaryError('测试对象删除暂时失败。');
    }
    return this.objects.delete(objectKey) ? 'deleted' : 'missing';
  }

  failNextDeleteObject() {
    this.nextDeleteFailure = true;
  }

  overrideObjectInfo(objectKey: string, info: StoredObjectInfo) {
    const object = this.objects.get(objectKey);
    if (!object) throw new Error('测试对象不存在。');
    this.objects.set(objectKey, { ...object, info });
  }

  hasObject(objectKey: string) {
    return this.objects.has(objectKey);
  }

  hasMultipart(storageUploadId: string) {
    return this.uploads.has(storageUploadId);
  }

  pauseNextPartLookup() {
    return this.createGate((gate) => { this.nextPartLookupGate = gate; });
  }

  pauseNextComplete() {
    return this.createGate((gate) => { this.nextCompleteGate = gate; });
  }

  private createGate(setGate: (gate: OperationGate) => void) {
    let markEntered!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => { markEntered = resolve; });
    const released = new Promise<void>((resolve) => { release = resolve; });
    setGate({ entered: markEntered, released });
    return { entered, release };
  }

  private async waitAtGate(kind: 'part' | 'complete') {
    const gate = kind === 'part' ? this.nextPartLookupGate : this.nextCompleteGate;
    if (!gate) return;
    if (kind === 'part') this.nextPartLookupGate = null;
    else this.nextCompleteGate = null;
    gate.entered();
    await gate.released;
  }

  private checkFailure() {
    if (!this.nextFailure) return;
    this.nextFailure = false;
    throw new StorageTemporaryError();
  }

  async createMultipart(objectKey: string) {
    this.checkFailure();
    const id = randomUUID();
    this.uploads.set(id, { objectKey, parts: new Map() });
    return id;
  }

  async authorizePart(input: {
    storageUploadId: string;
    objectKey: string;
    partNumber: number;
    expiresAt: Date;
  }) {
    this.checkFailure();
    const upload = this.uploads.get(input.storageUploadId);
    if (!upload || upload.objectKey !== input.objectKey) throw new Error('测试分片上传不存在。');
    const authorizationToken = `fake-part-${randomUUID()}`;
    this.authorizations.set(authorizationToken, { ...input });
    return { authorizationToken, expiresAt: input.expiresAt };
  }

  async uploadAuthorizedPart(
    authorizationToken: string,
    bytes: Uint8Array,
    expected?: { storageUploadId: string; objectKey: string; partNumber: number },
  ) {
    this.checkFailure();
    const authorization = this.authorizations.get(authorizationToken);
    if (!authorization) throw new StorageAuthorizationInvalidError();
    if (expected && (authorization.storageUploadId !== expected.storageUploadId
      || authorization.objectKey !== expected.objectKey
      || authorization.partNumber !== expected.partNumber)) {
      throw new StorageAuthorizationInvalidError('分片授权与上传地址不匹配。');
    }
    if (authorization.expiresAt.getTime() <= this.currentTime().getTime()) {
      throw new StorageAuthorizationExpiredError();
    }
    const upload = this.uploads.get(authorization.storageUploadId);
    if (!upload || upload.objectKey !== authorization.objectKey) throw new Error('测试分片上传不存在。');
    const checksumValue = createHash('sha256').update(bytes).digest('hex');
    const etag = createHash('md5').update(bytes).digest('hex');
    const info = { partNumber: authorization.partNumber, sizeBytes: bytes.byteLength, etag, checksumValue };
    upload.parts.set(authorization.partNumber, { bytes: Uint8Array.from(bytes), info });
    return info;
  }

  async getUploadedPart(input: { storageUploadId: string; partNumber: number; etag: string }) {
    this.checkFailure();
    const part = this.uploads.get(input.storageUploadId)?.parts.get(input.partNumber);
    await this.waitAtGate('part');
    return part?.info.etag === input.etag ? part.info : null;
  }

  async completeMultipart(input: {
    storageUploadId: string;
    objectKey: string;
    parts: StoredPartInfo[];
  }) {
    this.checkFailure();
    await this.waitAtGate('complete');
    const upload = this.uploads.get(input.storageUploadId);
    if (!upload || upload.objectKey !== input.objectKey) throw new Error('测试分片上传不存在。');
    const chunks = input.parts.map((expected) => {
      const part = upload.parts.get(expected.partNumber);
      if (!part || part.info.etag !== expected.etag) throw new Error('测试存储缺少已确认分片。');
      return part.bytes;
    });
    const sizeBytes = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const bytes = new Uint8Array(sizeBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    this.objects.set(input.objectKey, {
      bytes,
      info: { sizeBytes, checksumValue: createHash('sha256').update(bytes).digest('hex') },
    });
    if (this.nextCompletedObjectFault === 'missing') this.objects.delete(input.objectKey);
    if (this.nextCompletedObjectFault === 'size') {
      const object = this.objects.get(input.objectKey)!;
      object.info = { ...object.info, sizeBytes: object.info.sizeBytes + 1 };
    }
    if (this.nextCompletedObjectFault === 'checksum') {
      const object = this.objects.get(input.objectKey)!;
      object.info = { ...object.info, checksumValue: '0'.repeat(64) };
    }
    this.nextCompletedObjectFault = null;
    this.uploads.delete(input.storageUploadId);
    if (this.nextCompletionBoundaryFailure) {
      this.nextCompletionBoundaryFailure = false;
      throw new StorageTemporaryError('对象已合并，但完成结果暂时未知。');
    }
  }

  async headObject(objectKey: string) {
    this.checkFailure();
    return this.objects.get(objectKey)?.info ?? null;
  }

  async readObject(objectKey: string) {
    this.checkFailure();
    const object = this.objects.get(objectKey);
    return object ? Uint8Array.from(object.bytes) : null;
  }

  async abortMultipart(storageUploadId: string) {
    this.checkFailure();
    this.uploads.delete(storageUploadId);
  }
}
