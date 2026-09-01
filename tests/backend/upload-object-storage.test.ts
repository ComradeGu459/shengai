import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  createUploadStorageFailureLog,
  projectCreateStorageFailure,
} from '../../backend/src/modules/uploads/upload.routes.js';
import {
  InMemoryS3StorageFake,
  ProductionS3CompatibleUploadStorage,
  normalizeS3CompatibleStorageConfig,
} from '../../backend/src/modules/storage/s3-compatible-storage.js';
import {
  StorageAuthorizationExpiredError,
  StorageAuthorizationInvalidError,
  StorageTemporaryError,
} from '../../backend/src/modules/uploads/upload-storage.js';

const config = {
  endpoint: 'https://cn-sy1.rains3.com',
  bucket: 'milaidi',
  region: 'cn-sy1',
  forcePathStyle: true as const,
  uploadMode: 'browser_direct' as const,
};

describe('S3 兼容对象存储 multipart 合同（零网络 fake）', () => {
  it('upload-create provider 失败日志只保留 requestId/projectId/稳定 code/retryable', () => {
    const projected = projectCreateStorageFailure(new StorageTemporaryError(
      'provider secret=must-not-leak', 'STORAGE_PROVIDER_AUTH',
    ));
    const log = createUploadStorageFailureLog('req-123', 'project-123', projected);
    expect(log).toEqual({
      event: 'upload_create_storage_failure',
      requestId: 'req-123',
      projectId: 'project-123',
      code: 'STORAGE_PROVIDER_AUTH',
      retryable: false,
    });
    expect(Object.keys(log!)).toEqual(['event', 'requestId', 'projectId', 'code', 'retryable']);
    expect(JSON.stringify(log)).not.toContain('secret');
    expect(JSON.stringify(log)).not.toContain('objectKey');

    const generic = projectCreateStorageFailure(new StorageTemporaryError('raw provider payload'));
    expect(createUploadStorageFailureLog('req-123', 'project-123', generic)).toBeNull();
  });

  it('createMultipart 保留安全的 provider 分类，不回传原始错误载荷', async () => {
    const productionConfig = {
      ...config,
      accessKeyId: 'server-only-access-key',
      secretAccessKey: 'server-only-secret',
      presignTtlSeconds: 600,
    } as const;
    const cases = [
      [{ name: 'AccessDenied', message: 'secret=must-not-leak', $metadata: { httpStatusCode: 403 } }, 'STORAGE_PROVIDER_AUTH'],
      [{ name: 'NoSuchBucket', message: 'bucket=private', $metadata: { httpStatusCode: 404 } }, 'STORAGE_PROVIDER_NOT_FOUND'],
      [{ name: 'SlowDown', message: 'provider payload', $metadata: { httpStatusCode: 503 } }, 'STORAGE_PROVIDER_RATE_LIMITED'],
      [{ name: 'NotImplemented', message: 'raw XML', $metadata: { httpStatusCode: 501 } }, 'STORAGE_PROVIDER_REJECTED'],
    ] as const;

    for (const [providerError, expectedCode] of cases) {
      const storage = new ProductionS3CompatibleUploadStorage(productionConfig, {
        client: { send: async () => { throw providerError; } } as never,
      });
      try {
        await storage.createMultipart('projects/p/assets/video.mp4');
        throw new Error('expected createMultipart to fail');
      } catch (error) {
        expect(error).toMatchObject({ code: expectedCode, message: '对象存储无法创建分片上传。' });
        expect(String((error as Error).message)).not.toContain('secret=must-not-leak');
        expect(String((error as Error).message)).not.toContain('provider payload');
      }
    }

    const malformed = new ProductionS3CompatibleUploadStorage(productionConfig, {
      client: { send: async () => ({}) } as never,
    });
    await expect(malformed.createMultipart('projects/p/assets/video.mp4')).rejects.toMatchObject({
      code: 'STORAGE_PROVIDER_PROTOCOL_INVALID',
      message: '对象存储返回的分片上传身份无效。',
    });
    expect(new StorageTemporaryError().code).toBe('STORAGE_TEMPORARY_FAILURE');
  });

  it('按既有 UploadSession 身份签名单分片，ListParts/Complete/Head 可恢复且完成幂等', async () => {
    const storage = new InMemoryS3StorageFake(config, 'server-only-secret');
    const objectKey = `projects/${randomUUID()}/assets/video.mp4`;
    const storageUploadId = await storage.createMultipart(objectKey);
    const replayedUploadId = await storage.createMultipart(objectKey);
    const projectId = randomUUID();
    const uploadSessionId = randomUUID();
    const firstBytes = new TextEncoder().encode('part');
    const secondBytes = new TextEncoder().encode('tail');

    expect(replayedUploadId).toBe(storageUploadId);
    expect(storage.getMultipartResourceCount()).toBe(1);

    const first = await storage.authorizePart({
      storageUploadId,
      objectKey,
      projectId,
      uploadSessionId,
      partNumber: 1,
      sizeBytes: firstBytes.byteLength,
      contentType: 'video/mp4',
      expiresAt: new Date(Date.now() + 30_000),
    });
    const second = await storage.authorizePart({
      storageUploadId,
      objectKey,
      projectId,
      uploadSessionId,
      partNumber: 2,
      sizeBytes: secondBytes.byteLength,
      contentType: 'video/mp4',
      expiresAt: new Date(Date.now() + 30_000),
    });

    expect(first.uploadRequest.url).toMatch(/^https:\/\/cn-sy1\.rains3\.com\/milaidi\//);
    expect(first.uploadRequest.url).not.toContain('server-only-secret');
    expect(new URL(first.uploadRequest.url).searchParams.has('region')).toBe(false);
    expect(first.uploadRequest.headers).toEqual({ 'content-type': 'video/mp4' });

    const firstInfo = await storage.putPresignedPart({
      url: first.uploadRequest.url,
      bytes: firstBytes,
      headers: first.uploadRequest.headers,
    });
    const secondInfo = await storage.putPresignedPart({
      url: second.uploadRequest.url,
      bytes: secondBytes,
      headers: second.uploadRequest.headers,
    });
    expect(await storage.listParts(storageUploadId)).toEqual([firstInfo, secondInfo]);

    await storage.completeMultipart({ storageUploadId, objectKey, parts: [firstInfo, secondInfo] });
    await storage.completeMultipart({ storageUploadId, objectKey, parts: [firstInfo, secondInfo] });

    expect(await storage.headObject(objectKey)).toMatchObject({ sizeBytes: 8 });
    expect(new TextDecoder().decode(await storage.readObject(objectKey))).toBe('parttail');
    expect(storage.getObjectCount()).toBe(1);
    expect(storage.getMultipartResourceCount()).toBe(1);
  });

  it('预签名严格绑定项目/会话/对象/分片大小/Content-Type，篡改或过期只拒绝不推进状态', async () => {
    const storage = new InMemoryS3StorageFake(config);
    const objectKey = `projects/${randomUUID()}/assets/subtitle.srt`;
    const storageUploadId = await storage.createMultipart(objectKey);
    const authorization = await storage.authorizePart({
      storageUploadId,
      objectKey,
      projectId: randomUUID(),
      uploadSessionId: randomUUID(),
      partNumber: 1,
      sizeBytes: 4,
      contentType: 'application/x-subrip',
      expiresAt: new Date(Date.now() + 30_000),
    });

    await expect(storage.putPresignedPart({
      url: authorization.uploadRequest.url.replace(/.$/, 'x'),
      bytes: new TextEncoder().encode('part'),
      headers: authorization.uploadRequest.headers,
    })).rejects.toBeInstanceOf(StorageAuthorizationInvalidError);
    await expect(storage.putPresignedPart({
      url: authorization.uploadRequest.url,
      bytes: new TextEncoder().encode('bad'),
      headers: { 'content-type': 'video/mp4' },
    })).rejects.toBeInstanceOf(StorageAuthorizationInvalidError);
    await expect(storage.putPresignedPart({
      url: authorization.uploadRequest.url,
      bytes: new TextEncoder().encode('too-long'),
      headers: authorization.uploadRequest.headers,
    })).rejects.toBeInstanceOf(StorageAuthorizationInvalidError);
    expect(await storage.listParts(storageUploadId)).toEqual([]);

    storage.setClock(() => new Date(Date.now() + 31_000));
    await expect(storage.putPresignedPart({
      url: authorization.uploadRequest.url,
      bytes: new TextEncoder().encode('part'),
      headers: authorization.uploadRequest.headers,
    })).rejects.toBeInstanceOf(StorageAuthorizationExpiredError);
  });

  it('配置固定 HTTPS endpoint 与 path-style，拒绝把 region/Secret 交给浏览器', () => {
    expect(normalizeS3CompatibleStorageConfig(config)).toEqual({
      endpoint: config.endpoint, bucket: config.bucket, region: config.region, forcePathStyle: true,
    });
    expect(() => normalizeS3CompatibleStorageConfig({
      ...config,
      endpoint: 'https://cn-sy1.rains3.com/private',
    })).toThrow();
    expect(() => normalizeS3CompatibleStorageConfig({
      ...config,
      forcePathStyle: false as true,
    })).toThrow();
  });
});
