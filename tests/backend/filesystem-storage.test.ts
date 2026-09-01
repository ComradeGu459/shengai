import { mkdtemp, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { FilesystemDeliveryStorage, FilesystemUploadStorage } from '../../backend/src/modules/storage/filesystem-storage.js';

const roots: string[] = [];
const makeRoot = async () => { const root = await mkdtemp(join(tmpdir(), 'qimao-filesystem-unit-')); roots.push(root); return root; };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('FilesystemUploadStorage', () => {
  it('multipart manifest/part/object 在存储实例重建后可恢复，完成重入不产生第二事实', async () => {
    const root = await makeRoot();
    const first = await FilesystemUploadStorage.create(root);
    const objectKey = `projects/${randomUUID()}/assets/../video.mp4`;
    const uploadId = await first.createMultipart(objectKey);
    if (process.platform !== 'win32') {
      expect((await stat(join(root, 'uploads'))).mode & 0o777).toBe(0o750);
      expect((await stat(join(root, 'uploads', 'multipart', digest(uploadId), 'manifest.json'))).mode & 0o777).toBe(0o640);
    }
    const expiresAt = new Date(Date.now() + 30_000);
    const authorization = await first.authorizePart({ storageUploadId: uploadId, objectKey, partNumber: 1, expiresAt });
    const bytes = Buffer.from('frame-safe');
    const info = await first.uploadAuthorizedPart(authorization.authorizationToken, bytes, { storageUploadId: uploadId, objectKey, partNumber: 1 });
    const second = await FilesystemUploadStorage.create(root);
    await expect(second.getUploadedPart({ storageUploadId: uploadId, partNumber: 1, etag: info.etag })).resolves.toMatchObject(info);
    await second.completeMultipart({ storageUploadId: uploadId, objectKey, parts: [info] });
    const before = await second.headObject(objectKey);
    await second.completeMultipart({ storageUploadId: uploadId, objectKey, parts: [info] });
    await expect(second.headObject(objectKey)).resolves.toEqual(before);
    await expect(second.readObject(objectKey).then((value) => value && Buffer.from(value))).resolves.toEqual(bytes);
    await expect(second.deleteObject(objectKey)).resolves.toBe('deleted');
    await expect(second.headObject(objectKey)).resolves.toBeNull();
  });

  it('root 必须是已存在真实目录，root 与中间路径符号链接均拒绝', async () => {
    await expect(FilesystemUploadStorage.create('relative-root')).rejects.toThrow('绝对路径');
    const missing = join(tmpdir(), `qimao-missing-${randomUUID()}`);
    await expect(FilesystemUploadStorage.create(missing)).rejects.toThrow();
    const root = await makeRoot();
    await FilesystemUploadStorage.create(root);
    const uploadOutside = await makeRoot();
    await rm(join(root, 'uploads'), { recursive: true, force: true });
    await symlink(uploadOutside, join(root, 'uploads'), 'junction');
    await expect(FilesystemUploadStorage.create(root)).rejects.toThrow();
    await rm(join(root, 'uploads'), { recursive: true, force: true });
    const link = join(tmpdir(), `qimao-link-${randomUUID()}`);
    await symlink(root, link, 'junction');
    try { await expect(FilesystemUploadStorage.create(link)).rejects.toThrow(); } finally { await rm(link, { recursive: true, force: true }); }

    const deliveryRoot = await makeRoot();
    await FilesystemDeliveryStorage.create(deliveryRoot);
    const deliveryOutside = await makeRoot();
    await rm(join(deliveryRoot, 'deliveries'), { recursive: true, force: true });
    await symlink(deliveryOutside, join(deliveryRoot, 'deliveries'), 'junction');
    await expect(FilesystemDeliveryStorage.create(deliveryRoot)).rejects.toThrow();
  });

  it('授权过期/异身份/缺失分片均 fail-closed，完成并发只保留一个对象事实', async () => {
    const root = await makeRoot();
    const storage = await FilesystemUploadStorage.create(root);
    const objectKey = `projects/${randomUUID()}/assets/video.mp4`;
    const uploadId = await storage.createMultipart(objectKey);
    const expired = await storage.authorizePart({ storageUploadId: uploadId, objectKey, partNumber: 1, expiresAt: new Date(Date.now() - 1) });
    await expect(storage.uploadAuthorizedPart(expired.authorizationToken, Buffer.from('x'), { storageUploadId: uploadId, objectKey, partNumber: 1 })).rejects.toThrow('过期');
    const valid = await storage.authorizePart({ storageUploadId: uploadId, objectKey, partNumber: 1, expiresAt: new Date(Date.now() + 30_000) });
    const bytes = Buffer.from('safe-part');
    const info = await storage.uploadAuthorizedPart(valid.authorizationToken, bytes, { storageUploadId: uploadId, objectKey, partNumber: 1 });
    await expect(storage.uploadAuthorizedPart(valid.authorizationToken, bytes, { storageUploadId: 'wrong', objectKey, partNumber: 1 })).rejects.toThrow();
    await rm(join(root, 'uploads', 'multipart', digest(uploadId), 'part-00001.bin'));
    await expect(storage.completeMultipart({ storageUploadId: uploadId, objectKey, parts: [info] })).rejects.toThrow();

    const retryId = await storage.createMultipart(objectKey);
    const retryAuth = await storage.authorizePart({ storageUploadId: retryId, objectKey, partNumber: 1, expiresAt: new Date(Date.now() + 30_000) });
    const retryInfo = await storage.uploadAuthorizedPart(retryAuth.authorizationToken, bytes, { storageUploadId: retryId, objectKey, partNumber: 1 });
    await Promise.all([
      storage.completeMultipart({ storageUploadId: retryId, objectKey, parts: [retryInfo] }),
      storage.completeMultipart({ storageUploadId: retryId, objectKey, parts: [retryInfo] }),
    ]);
    await expect(storage.headObject(objectKey)).resolves.toMatchObject({ sizeBytes: bytes.length });
  });

  it('同一 multipart 的不同 part 并发授权都会保留，两个 token 均可上传', async () => {
    const root = await makeRoot();
    const storage = await FilesystemUploadStorage.create(root);
    const objectKey = `projects/${randomUUID()}/assets/video.mp4`;
    const uploadId = await storage.createMultipart(objectKey);
    const [first, second] = await Promise.all([
      storage.authorizePart({ storageUploadId: uploadId, objectKey, partNumber: 1, expiresAt: new Date(Date.now() + 30_000) }),
      storage.authorizePart({ storageUploadId: uploadId, objectKey, partNumber: 2, expiresAt: new Date(Date.now() + 30_000) }),
    ]);
    const [firstInfo, secondInfo] = await Promise.all([
      storage.uploadAuthorizedPart(first.authorizationToken, Buffer.from('one'), { storageUploadId: uploadId, objectKey, partNumber: 1 }),
      storage.uploadAuthorizedPart(second.authorizationToken, Buffer.from('two'), { storageUploadId: uploadId, objectKey, partNumber: 2 }),
    ]);
    await expect(storage.getUploadedPart({ storageUploadId: uploadId, partNumber: 1, etag: firstInfo.etag })).resolves.toMatchObject(firstInfo);
    await expect(storage.getUploadedPart({ storageUploadId: uploadId, partNumber: 2, etag: secondInfo.etag })).resolves.toMatchObject(secondInfo);
  });
});

describe('FilesystemDeliveryStorage', () => {
  it('交付对象 bytes、摘要和删除在重建实例后保持一致', async () => {
    const root = await makeRoot();
    const first = await FilesystemDeliveryStorage.create(root);
    const bytes = Buffer.from('delivery-bytes');
    const objectKey = `projects/${randomUUID()}/deliveries/report.bin`;
    const written = await first.putObject({ objectKey, bytes, contentType: 'application/octet-stream', metadata: { safe: 'true' } });
    const second = await FilesystemDeliveryStorage.create(root);
    await expect(second.headObject(objectKey)).resolves.toEqual(written);
    await expect(second.readObject(objectKey).then((value) => value && Buffer.from(value))).resolves.toEqual(bytes);
    await expect(second.deleteObject!(objectKey)).resolves.toBe('deleted');
    await expect(second.readObject(objectKey)).resolves.toBeNull();
  });
});
