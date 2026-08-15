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
