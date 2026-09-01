export interface DeliveryStorageObject {
  objectKey: string;
  sizeBytes: number;
  checksumValue: string;
}

export interface DeliveryStorage {
  putObject(input: { objectKey: string; bytes: Uint8Array; contentType: string; metadata: Record<string, string> }): Promise<DeliveryStorageObject>;
  headObject(objectKey: string): Promise<DeliveryStorageObject | null>;
  readObject(objectKey: string): Promise<Uint8Array | null>;
  deleteObject?(objectKey: string): Promise<'deleted' | 'missing'>;
}

export class DeliveryStorageTemporaryError extends Error {
  constructor(message = '交付对象存储暂时不可用。') {
    super(message);
    this.name = 'DeliveryStorageTemporaryError';
  }
}
