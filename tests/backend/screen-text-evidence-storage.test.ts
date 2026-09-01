import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { InMemoryDeliveryStorageFake } from '../../backend/src/modules/deliveries/in-memory-delivery-storage.fake.js';
import {
  PersistentScreenTextEvidenceStorage,
  type ScreenTextEvidenceObjectStore,
} from '../../backend/src/modules/screen-text/screen-text.evidence-storage.js';
import { ProductionS3CompatibleUploadStorage } from '../../backend/src/modules/storage/s3-compatible-storage.js';
import { createServerScreenTextEvidenceStorage } from '../../backend/src/server.js';
import { createScreenTextWorkerEvidenceStorageFromEnv } from '../../backend/src/workers/screen-text.worker.entry.js';

class SharedPersistentFake implements ScreenTextEvidenceObjectStore {
  private readonly objects = new Map<string, {
    bytes: Uint8Array;
    objectKey: string;
    sizeBytes: number;
    checksumValue: string;
    contentType: string;
  }>();

  async putObject(input: Parameters<ScreenTextEvidenceObjectStore['putObject']>[0]) {
    const checksumValue = createHash('sha256').update(input.bytes).digest('hex');
    const object = {
      bytes: Uint8Array.from(input.bytes), objectKey: input.objectKey,
      sizeBytes: input.bytes.byteLength, checksumValue, contentType: input.contentType,
    };
    this.objects.set(input.objectKey, object);
    return { objectKey: object.objectKey, sizeBytes: object.sizeBytes, checksumValue: object.checksumValue };
  }

  async headObject(objectKey: string) {
    const object = this.objects.get(objectKey);
    return object ? {
      objectKey: object.objectKey, sizeBytes: object.sizeBytes,
      checksumValue: object.checksumValue, contentType: object.contentType,
    } : null;
  }

  async readObject(objectKey: string) {
    const object = this.objects.get(objectKey);
    return object ? Uint8Array.from(object.bytes) : null;
  }

  async deleteObject(objectKey: string) {
    return this.objects.delete(objectKey) ? 'deleted' as const : 'missing' as const;
  }

  tamperContentType(objectKey: string, contentType: string) {
    const object = this.objects.get(objectKey);
    if (!object) throw new Error('missing test object');
    object.contentType = contentType;
  }
}

const productionS3ForAssembly = () => new ProductionS3CompatibleUploadStorage({
  endpoint: 'https://cos.ap-nanjing.myqcloud.com', bucket: 'bucket', region: 'ap-nanjing',
  forcePathStyle: false, provider: 'tencent-cos', addressingStyle: 'virtual-hosted',
  accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key',
  presignTtlSeconds: 600, uploadMode: 'browser_direct',
}, { client: {} as never });

describe('ScreenTextEvidenceStorage 持久对象事实', () => {
  it('两个独立适配实例共享持久存储，读取校验摘要/大小/contentType并可删除', async () => {
    const backing = new SharedPersistentFake();
    const writer = new PersistentScreenTextEvidenceStorage(backing);
    const reader = new PersistentScreenTextEvidenceStorage(backing);
    const bytes = Uint8Array.from([1, 2, 3, 4]);

    await expect(writer.putObject('screen-text/evidence/a.png', bytes, 'image/png'))
      .resolves.toMatchObject({ sizeBytes: 4, contentType: 'image/png' });
    await expect(reader.readObject('screen-text/evidence/a.png'))
      .resolves.toMatchObject({ bytes, sizeBytes: 4, contentType: 'image/png' });
    await expect(reader.deleteObject('screen-text/evidence/a.png')).resolves.toBe('deleted');
    await expect(writer.readObject('screen-text/evidence/a.png')).resolves.toBeNull();
  });

  it('contentType来自持久Head事实，事实不一致时拒绝', async () => {
    const backing = new SharedPersistentFake();
    const storage = new PersistentScreenTextEvidenceStorage(backing);
    await storage.putObject('screen-text/evidence/b.jpg', Uint8Array.from([9]), 'image/jpeg');
    backing.tamperContentType('screen-text/evidence/b.jpg', '');
    await expect(storage.readObject('screen-text/evidence/b.jpg')).rejects.toThrow('SCREEN_TEXT_EVIDENCE_STORE_MISMATCH');
  });
});

describe('生产 ScreenText 证据装配门', () => {
  it('禁用时不要求持久存储，启用但非生产S3时启动前 fail-closed', () => {
    expect(createServerScreenTextEvidenceStorage({ screenTextEnabled: false })).toBeUndefined();
    expect(() => createServerScreenTextEvidenceStorage({
      storage: new InMemoryDeliveryStorageFake(), screenTextEnabled: true,
    })).toThrow('持久 ScreenText 证据对象存储');
  });

  it('S3生产实例装配为持久适配器', () => {
    expect(createServerScreenTextEvidenceStorage({
      storage: productionS3ForAssembly(), screenTextEnabled: true,
    })).toBeInstanceOf(PersistentScreenTextEvidenceStorage);
  });

  it('S3 HeadObject 暴露持久 ContentType，不依赖进程缓存', async () => {
    const bytes = Uint8Array.from([7, 8]);
    const checksumValue = createHash('sha256').update(bytes).digest('hex');
    const storage = new ProductionS3CompatibleUploadStorage({
      endpoint: 'https://cos.ap-nanjing.myqcloud.com', bucket: 'bucket', region: 'ap-nanjing',
      forcePathStyle: false, provider: 'tencent-cos', addressingStyle: 'virtual-hosted',
      accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key',
      presignTtlSeconds: 600, uploadMode: 'browser_direct',
    }, { client: { send: async () => ({ ContentLength: bytes.byteLength, ContentType: 'image/png', Metadata: { sha256: checksumValue } }) } as never });
    await expect(storage.headObject('screen-text/evidence/head.png'))
      .resolves.toMatchObject({ contentType: 'image/png', checksumValue, sizeBytes: 2 });
  });

  it('Worker启用本地OCR时使用注入的同一S3证据实例，禁用时才用开发默认', () => {
    const shared = productionS3ForAssembly();
    expect(createScreenTextWorkerEvidenceStorageFromEnv({
      env: { QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true', QIMAO_UPLOAD_STORAGE_KIND: 's3' },
      storage: shared,
    })).toBeInstanceOf(PersistentScreenTextEvidenceStorage);
    expect(createScreenTextWorkerEvidenceStorageFromEnv({ env: { NODE_ENV: 'test' } }))
      .toBeDefined();
    expect(() => createScreenTextWorkerEvidenceStorageFromEnv({
      env: { QIMAO_LOCAL_OCR_OPENVINO_ENABLED: 'true', QIMAO_UPLOAD_STORAGE_KIND: 'filesystem' },
    })).toThrow('SOURCE_STORAGE_UNAVAILABLE');
  });
});
