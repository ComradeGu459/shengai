import { createHash } from 'node:crypto';

import { DeliveryStorageTemporaryError, type DeliveryStorage, type DeliveryStorageObject } from './delivery-storage.js';

type Stored = { bytes: Uint8Array; info: DeliveryStorageObject; contentType: string; metadata: Record<string, string> };

export class InMemoryDeliveryStorageFake implements DeliveryStorage {
  private readonly objects = new Map<string, Stored>();
  private nextFailure: Error | null = null;
  private nextFault: 'missing' | 'size' | 'checksum' | null = null;

  async putObject(input: { objectKey: string; bytes: Uint8Array; contentType: string; metadata: Record<string, string> }) {
    if (this.nextFailure) { const error = this.nextFailure; this.nextFailure = null; throw error; }
    const bytes = Uint8Array.from(input.bytes);
    const info: DeliveryStorageObject = { objectKey: input.objectKey, sizeBytes: bytes.byteLength, checksumValue: createHash('sha256').update(bytes).digest('hex') };
    this.objects.set(input.objectKey, { bytes, info, contentType: input.contentType, metadata: { ...input.metadata } });
    return info;
  }

  async headObject(objectKey: string) {
    if (this.nextFailure) { const error = this.nextFailure; this.nextFailure = null; throw error; }
    const object = this.objects.get(objectKey);
    if (!object) return null;
    if (this.nextFault === 'missing') { this.nextFault = null; this.objects.delete(objectKey); return null; }
    if (this.nextFault === 'size') { this.nextFault = null; return { ...object.info, sizeBytes: object.info.sizeBytes + 1 }; }
    if (this.nextFault === 'checksum') { this.nextFault = null; return { ...object.info, checksumValue: '0'.repeat(64) }; }
    return { ...object.info };
  }

  async readObject(objectKey: string) {
    if (this.nextFailure) { const error = this.nextFailure; this.nextFailure = null; throw error; }
    const object = this.objects.get(objectKey);
    return object ? Uint8Array.from(object.bytes) : null;
  }

  async deleteObject(objectKey: string) {
    return this.objects.delete(objectKey) ? 'deleted' as const : 'missing' as const;
  }

  failNextOperation(message = '交付对象存储暂时不可用。') { this.nextFailure = new DeliveryStorageTemporaryError(message); }
  faultNextObject(kind: 'missing' | 'size' | 'checksum') { this.nextFault = kind; }
  hasObject(objectKey: string) { return this.objects.has(objectKey); }
  objectKeys() { return [...this.objects.keys()]; }
  removeObject(objectKey: string) { this.objects.delete(objectKey); }
  clear() { this.objects.clear(); this.nextFailure = null; this.nextFault = null; }
  overrideObjectInfo(objectKey: string, info: Partial<Pick<DeliveryStorageObject, 'sizeBytes' | 'checksumValue'>>) {
    const object = this.objects.get(objectKey);
    if (!object) throw new Error('测试对象不存在。');
    object.info = { ...object.info, ...info };
  }
}
