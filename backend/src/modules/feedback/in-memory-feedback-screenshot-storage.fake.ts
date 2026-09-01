import { createHash } from 'node:crypto';
import type { FeedbackScreenshotStorage, FeedbackScreenshotStorageInfo, FeedbackScreenshotStoredObject } from './feedback-storage.js';

type Reservation = { contentType: string; sizeBytes: number; contentDigest: string; bytes?: Uint8Array };

export class InMemoryFeedbackScreenshotStorageFake implements FeedbackScreenshotStorage {
  private readonly reservations = new Map<string, Reservation>();

  async authorize(input: { objectKey: string; contentType: string; sizeBytes: number; contentDigest: string }) {
    this.reservations.set(input.objectKey, { contentType: input.contentType, sizeBytes: input.sizeBytes, contentDigest: input.contentDigest });
  }

  async upload(input: { objectKey: string; contentType: string; bytes: Uint8Array }) {
    const reserved = this.reservations.get(input.objectKey);
    if (!reserved || reserved.contentType !== input.contentType || input.bytes.byteLength !== reserved.sizeBytes) throw new Error('截图对象上传校验失败。');
    reserved.bytes = new Uint8Array(input.bytes);
  }

  async complete(input: { objectKey: string; contentType: string; sizeBytes: number; contentDigest: string }): Promise<FeedbackScreenshotStorageInfo> {
    const reserved = this.reservations.get(input.objectKey);
    if (!reserved || !reserved.bytes || reserved.contentType !== input.contentType || reserved.sizeBytes !== input.sizeBytes) {
      throw new Error('截图对象校验失败。');
    }
    const contentDigest = createHash('sha256').update(reserved.bytes).digest('hex');
    if (contentDigest !== input.contentDigest || contentDigest !== reserved.contentDigest) throw new Error('截图对象摘要不匹配。');
    return { sizeBytes: reserved.bytes.byteLength, contentDigest };
  }

  async read(input: { objectKey: string }): Promise<FeedbackScreenshotStoredObject> {
    const reserved = this.reservations.get(input.objectKey);
    if (!reserved?.bytes) throw new Error('截图对象不存在。');
    return { contentType: reserved.contentType, sizeBytes: reserved.bytes.byteLength, contentDigest: createHash('sha256').update(reserved.bytes).digest('hex'), bytes: new Uint8Array(reserved.bytes) };
  }

  hasReservation(objectKey: string) { return this.reservations.has(objectKey); }
  clear() { this.reservations.clear(); }
}
