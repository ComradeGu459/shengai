import { createHash } from 'node:crypto';

export interface ScreenTextEvidenceObject {
  bytes: Uint8Array;
  checksum: string;
  contentType: string;
  sizeBytes: number;
}

export interface ScreenTextEvidenceStorage {
  putObject(objectKey: string, bytes: Uint8Array, contentType: string): Promise<ScreenTextEvidenceObject>;
  readObject(objectKey: string): Promise<ScreenTextEvidenceObject | null>;
  deleteObject(objectKey: string): Promise<'deleted' | 'missing'>;
}

/**
 * 可持久化交付对象存储的最小事实边界。
 * contentType 必须来自 headObject 的持久对象元数据，不能由进程内缓存补齐。
 */
export interface ScreenTextEvidenceObjectStore {
  putObject(input: {
    objectKey: string;
    bytes: Uint8Array;
    contentType: string;
    metadata: Record<string, string>;
  }): Promise<{ objectKey: string; sizeBytes: number; checksumValue: string }>;
  headObject(objectKey: string): Promise<{
    objectKey: string;
    sizeBytes: number;
    checksumValue: string;
    contentType?: string;
  } | null>;
  readObject(objectKey: string): Promise<Uint8Array | null>;
  deleteObject(objectKey: string): Promise<'deleted' | 'missing'>;
}

const evidenceStoreError = () => new Error('SCREEN_TEXT_EVIDENCE_STORE_MISMATCH');
const isSha256 = (value: string) => /^[a-f0-9]{64}$/.test(value);
const assertObjectKey = (objectKey: string) => {
  if (!objectKey || objectKey.includes('\0')) throw evidenceStoreError();
};

/**
 * 将 OCR 衍生截图写入与上传/交付共用的持久对象命名空间。
 * 每次读取都会先取持久 Head 事实，再校验实际字节，故不依赖进程内 Map。
 */
export class PersistentScreenTextEvidenceStorage implements ScreenTextEvidenceStorage {
  constructor(private readonly objectStore: ScreenTextEvidenceObjectStore) {}

  async putObject(objectKey: string, bytes: Uint8Array, contentType: string): Promise<ScreenTextEvidenceObject> {
    assertObjectKey(objectKey);
    if (!contentType.trim()) throw evidenceStoreError();
    const copy = Uint8Array.from(bytes);
    const checksum = createHash('sha256').update(copy).digest('hex');
    const written = await this.objectStore.putObject({
      objectKey,
      bytes: copy,
      contentType,
      metadata: { purpose: 'screen-text-evidence', sha256: checksum },
    });
    if (written.objectKey !== objectKey || written.sizeBytes !== copy.byteLength
      || written.checksumValue !== checksum) throw evidenceStoreError();
    const fact = await this.objectStore.headObject(objectKey);
    if (!fact || fact.objectKey !== objectKey || fact.sizeBytes !== copy.byteLength
      || fact.checksumValue !== checksum || fact.contentType !== contentType) throw evidenceStoreError();
    return { bytes: copy, checksum, contentType, sizeBytes: copy.byteLength };
  }

  async readObject(objectKey: string): Promise<ScreenTextEvidenceObject | null> {
    assertObjectKey(objectKey);
    const fact = await this.objectStore.headObject(objectKey);
    if (!fact) return null;
    if (fact.objectKey !== objectKey || !Number.isSafeInteger(fact.sizeBytes) || fact.sizeBytes < 0
      || !isSha256(fact.checksumValue) || !fact.contentType?.trim()) throw evidenceStoreError();
    const bytes = await this.objectStore.readObject(objectKey);
    if (!bytes) throw evidenceStoreError();
    const copy = Uint8Array.from(bytes);
    const checksum = createHash('sha256').update(copy).digest('hex');
    if (copy.byteLength !== fact.sizeBytes || checksum !== fact.checksumValue) throw evidenceStoreError();
    return { bytes: copy, checksum, contentType: fact.contentType, sizeBytes: copy.byteLength };
  }

  async deleteObject(objectKey: string): Promise<'deleted' | 'missing'> {
    assertObjectKey(objectKey);
    return this.objectStore.deleteObject(objectKey);
  }
}

export class InMemoryScreenTextEvidenceStorage implements ScreenTextEvidenceStorage {
  private readonly objects = new Map<string, ScreenTextEvidenceObject>();

  async putObject(objectKey: string, bytes: Uint8Array, contentType: string) {
    const stored = {
      bytes: Uint8Array.from(bytes),
      checksum: createHash('sha256').update(bytes).digest('hex'),
      contentType,
      sizeBytes: bytes.byteLength,
    };
    this.objects.set(objectKey, stored);
    return { ...stored, bytes: Uint8Array.from(stored.bytes) };
  }

  async readObject(objectKey: string) {
    const stored = this.objects.get(objectKey);
    return stored ? { ...stored, bytes: Uint8Array.from(stored.bytes) } : null;
  }

  async deleteObject(objectKey: string) {
    return this.objects.delete(objectKey) ? 'deleted' as const : 'missing' as const;
  }
}

const defaultEvidenceStorage = new InMemoryScreenTextEvidenceStorage();
export const getDefaultScreenTextEvidenceStorage = () => defaultEvidenceStorage;
