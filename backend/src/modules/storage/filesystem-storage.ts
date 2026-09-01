import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { constants } from 'node:fs';
import { access, chmod, mkdir, open, readFile, rm, lstat, rename } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import {
  StorageAuthorizationExpiredError,
  StorageAuthorizationInvalidError,
  StorageTemporaryError,
  type DirectUploadStorage,
  type StoredObjectInfo,
  type StoredPartInfo,
} from '../uploads/upload-storage.js';
import type { UploadStorage } from '../uploads/upload-storage.js';
import { DeliveryStorageTemporaryError, type DeliveryStorage, type DeliveryStorageObject } from '../deliveries/delivery-storage.js';

type PartRecord = StoredPartInfo & { fileName: string };
type AuthorizationRecord = { tokenHash: string; expiresAt: string };
type MultipartManifest = {
  storageUploadId: string;
  objectKey: string;
  createdAt: string;
  authorizations: Record<string, AuthorizationRecord>;
  parts: Record<string, PartRecord>;
};
type ObjectManifest = { objectKey: string; sizeBytes: number; checksumValue: string; contentType?: string; metadata?: Record<string, string> };

const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
const md5 = (value: Uint8Array) => createHash('md5').update(value).digest('hex');
const tokenHash = (value: string) => sha256(value);
const safeKey = (value: string) => sha256(value);
const isInside = (root: string, candidate: string) => {
  const rel = relative(root, candidate);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${requireSeparator()}`) && !rel.startsWith(requireSeparator()));
};
const requireSeparator = () => process.platform === 'win32' ? '\\' : '/';

const writeAtomic = async (filePath: string, bytes: Uint8Array | string, trustedRoot?: string) => {
  if (trustedRoot) await ensureParentChain(trustedRoot, dirname(filePath));
  else await mkdir(dirname(filePath), { recursive: true, mode: 0o750 });
  const temporaryPath = `${filePath}.tmp-${randomUUID()}`;
  const handle = await open(temporaryPath, 'wx', 0o640);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(temporaryPath, 0o640);
  await rename(temporaryPath, filePath);
};

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try { return JSON.parse(await readFile(filePath, 'utf8')) as T; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

const removeIfPresent = async (filePath: string) => {
  await rm(filePath, { recursive: true, force: true });
};

const ensureNoSymlink = async (path: string, expectDirectory: boolean) => {
  const info = await lstat(path);
  if (info.isSymbolicLink() || (expectDirectory ? !info.isDirectory() : !info.isFile())) {
    throw new Error('QIMAO_STORAGE_ROOT 必须是非符号链接的真实目录，存储路径必须是普通文件。');
  }
};

const ensureParentChain = async (root: string, targetDirectory: string) => {
  await ensureNoSymlink(resolve(root), true);
  const pending: string[] = [];
  let current = resolve(targetDirectory);
  while (current !== resolve(root)) {
    if (!isInside(resolve(root), current)) throw new Error('存储路径越界。');
    pending.push(current);
    current = dirname(current);
  }
  for (const path of pending.reverse()) {
    try { await ensureNoSymlink(path, true); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  await mkdir(targetDirectory, { recursive: true, mode: 0o750 });
  for (const path of pending) { await ensureNoSymlink(path, true); await chmod(path, 0o750); }
};

const assertParentChain = async (root: string, targetDirectory: string) => {
  const trustedRoot = resolve(root);
  await ensureNoSymlink(trustedRoot, true);
  let current = resolve(targetDirectory);
  while (current !== trustedRoot) {
    if (!isInside(trustedRoot, current)) throw new Error('存储路径越界。');
    try { await ensureNoSymlink(current, true); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
    current = dirname(current);
  }
  return true;
};

const validateStorageRoot = async (rootValue: string | undefined) => {
  if (!rootValue) throw new Error('生产环境必须配置绝对路径 QIMAO_STORAGE_ROOT。');
  if (!isAbsolute(rootValue)) throw new Error('QIMAO_STORAGE_ROOT 必须是绝对路径。');
  const root = resolve(rootValue);
  await ensureNoSymlink(root, true);
  await access(root, constants.F_OK | constants.R_OK | constants.W_OK | constants.X_OK);
  return root;
};

/** 单一服务器本地对象实现：UploadStorage 与 DeliveryStorage 共用同一根目录但分离命名空间。 */
export class FilesystemUploadStorage implements DirectUploadStorage {
  private readonly mutexes = new Map<string, Promise<void>>();
  private constructor(private readonly root: string, private readonly multipartRoot: string, private readonly objectRoot: string) {}

  static async create(rootValue: string | undefined): Promise<FilesystemUploadStorage> {
    const root = await validateStorageRoot(rootValue);
    const uploadsRoot = join(root, 'uploads');
    const multipartRoot = join(root, 'uploads', 'multipart');
    const objectRoot = join(root, 'uploads', 'objects');
    await ensureParentChain(root, uploadsRoot);
    await ensureParentChain(root, multipartRoot);
    await ensureParentChain(root, objectRoot);
    return new FilesystemUploadStorage(root, multipartRoot, objectRoot);
  }

  private multipartDir(id: string) { const path = join(this.multipartRoot, safeKey(id)); if (!isInside(this.multipartRoot, path)) throw new StorageTemporaryError(); return path; }
  private objectPath(key: string) { const digest = safeKey(key); const path = join(this.objectRoot, digest.slice(0, 2), `${digest}.bin`); if (!isInside(this.objectRoot, path)) throw new StorageTemporaryError(); return path; }
  private objectMetaPath(key: string) { return `${this.objectPath(key)}.json`; }
  private manifestPath(id: string) { return join(this.multipartDir(id), 'manifest.json'); }
  private partPath(id: string, part: number) { return join(this.multipartDir(id), `part-${String(part).padStart(5, '0')}.bin`); }
  private async loadManifest(id: string) {
    const directory = this.multipartDir(id);
    if (!(await assertParentChain(this.multipartRoot, directory))) return null;
    return readJson<MultipartManifest>(join(directory, 'manifest.json'));
  }
  private async saveManifest(manifest: MultipartManifest) { await writeAtomic(this.manifestPath(manifest.storageUploadId), JSON.stringify(manifest), this.multipartRoot); }

  private async withLock<T>(id: string, work: () => Promise<T>): Promise<T> {
    const previous = this.mutexes.get(id) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolvePromise) => { release = resolvePromise; });
    const queued = previous.then(() => current);
    this.mutexes.set(id, queued);
    await previous;
    try { return await work(); } finally { release(); if (this.mutexes.get(id) === queued) this.mutexes.delete(id); }
  }

  async createMultipart(objectKey: string) {
    const storageUploadId = randomUUID();
    await this.saveManifest({ storageUploadId, objectKey, createdAt: new Date().toISOString(), authorizations: {}, parts: {} });
    return storageUploadId;
  }

  async authorizePart(input: { storageUploadId: string; objectKey: string; partNumber: number; expiresAt: Date }) {
    return this.withLock(input.storageUploadId, async () => {
      const manifest = await this.loadManifest(input.storageUploadId);
      if (!manifest || manifest.objectKey !== input.objectKey) throw new StorageTemporaryError('分片上传事实不存在。');
      const authorizationToken = `qimao-${randomBytes(32).toString('base64url')}`;
      manifest.authorizations[String(input.partNumber)] = { tokenHash: tokenHash(authorizationToken), expiresAt: input.expiresAt.toISOString() };
      await this.saveManifest(manifest);
      return { authorizationToken, expiresAt: input.expiresAt };
    });
  }

  async uploadAuthorizedPart(authorizationToken: string, bytes: Uint8Array, expected: { storageUploadId: string; objectKey: string; partNumber: number }) {
    return this.withLock(expected.storageUploadId, async () => {
      const manifest = await this.loadManifest(expected.storageUploadId);
      const auth = manifest?.authorizations[String(expected.partNumber)];
      if (!manifest || manifest.objectKey !== expected.objectKey || !auth) throw new StorageAuthorizationInvalidError('分片上传授权与上传地址不匹配。');
      const left = Buffer.from(auth.tokenHash, 'hex'); const right = Buffer.from(tokenHash(authorizationToken), 'hex');
      if (left.length !== right.length || !timingSafeEqual(left, right)) throw new StorageAuthorizationInvalidError();
      if (Date.parse(auth.expiresAt) <= Date.now()) throw new StorageAuthorizationExpiredError();
      const fileName = `part-${String(expected.partNumber).padStart(5, '0')}.bin`;
      await writeAtomic(join(this.multipartDir(expected.storageUploadId), fileName), bytes, this.multipartRoot);
      const info: PartRecord = { partNumber: expected.partNumber, sizeBytes: bytes.byteLength, etag: md5(bytes), checksumValue: sha256(bytes), fileName };
      manifest.parts[String(expected.partNumber)] = info;
      await this.saveManifest(manifest);
      return info;
    });
  }

  async getUploadedPart(input: { storageUploadId: string; partNumber: number; etag: string }) {
    const manifest = await this.loadManifest(input.storageUploadId); const part = manifest?.parts[String(input.partNumber)];
    return part?.etag === input.etag ? part : null;
  }

  async completeMultipart(input: { storageUploadId: string; objectKey: string; parts: StoredPartInfo[] }) {
    await this.withLock(input.storageUploadId, async () => {
      const manifest = await this.loadManifest(input.storageUploadId);
      if (!manifest) {
        const existing = await this.headObject(input.objectKey);
        if (existing) return;
        throw new StorageTemporaryError('分片上传事实不存在。');
      }
      if (manifest.objectKey !== input.objectKey) throw new StorageTemporaryError('对象身份不匹配。');
      const chunks: Uint8Array[] = [];
      for (const expected of input.parts) {
        const part = manifest.parts[String(expected.partNumber)];
        if (!part || part.etag !== expected.etag || part.checksumValue !== expected.checksumValue) throw new StorageTemporaryError('已确认分片事实不完整。');
        const partPath = join(this.multipartDir(input.storageUploadId), part.fileName);
        await ensureNoSymlink(partPath, false);
        const bytes = await readFile(partPath);
        if (bytes.byteLength !== part.sizeBytes || md5(bytes) !== part.etag || sha256(bytes) !== part.checksumValue) throw new StorageTemporaryError('已确认分片校验失败。');
        chunks.push(bytes);
      }
      const all = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
      const objectPath = this.objectPath(input.objectKey);
      const existing = await readJson<ObjectManifest>(this.objectMetaPath(input.objectKey));
      if (existing) {
        const current = await this.readObject(input.objectKey);
        if (current && existing.sizeBytes === all.byteLength && existing.checksumValue === sha256(all) && sha256(current) === existing.checksumValue) { await removeIfPresent(this.multipartDir(input.storageUploadId)); return; }
        throw new StorageTemporaryError('对象已存在但摘要不一致。');
      }
      await writeAtomic(objectPath, all, this.objectRoot);
      await writeAtomic(this.objectMetaPath(input.objectKey), JSON.stringify({ objectKey: input.objectKey, sizeBytes: all.byteLength, checksumValue: sha256(all) } satisfies ObjectManifest), this.objectRoot);
      await removeIfPresent(this.multipartDir(input.storageUploadId));
    });
  }

  async headObject(objectKey: string): Promise<StoredObjectInfo | null> {
    const meta = await readJson<ObjectManifest>(this.objectMetaPath(objectKey)); if (!meta) return null;
    const objectPath = this.objectPath(objectKey);
    if (!(await assertParentChain(this.objectRoot, dirname(objectPath)))) return null;
    await ensureNoSymlink(objectPath, false);
    const bytes = await readFile(objectPath);
    if (meta.objectKey !== objectKey || bytes.byteLength !== meta.sizeBytes || sha256(bytes) !== meta.checksumValue) throw new StorageTemporaryError('对象摘要校验失败。');
    return { sizeBytes: meta.sizeBytes, checksumValue: meta.checksumValue };
  }
  async readObject(objectKey: string) { const info = await this.headObject(objectKey); if (!info) return null; const path = this.objectPath(objectKey); await ensureNoSymlink(path, false); return Uint8Array.from(await readFile(path)); }
  async abortMultipart(input: { storageUploadId: string; objectKey: string }) {
    await this.withLock(input.storageUploadId, async () => {
      const manifest = await this.loadManifest(input.storageUploadId);
      if (!manifest) return;
      if (manifest.objectKey !== input.objectKey) throw new StorageTemporaryError('对象身份不匹配。');
      const path = this.multipartDir(input.storageUploadId);
      if (await assertParentChain(this.multipartRoot, path)) await removeIfPresent(path);
    });
  }
  async deleteObject(objectKey: string) { const path = this.objectPath(objectKey); if (!(await assertParentChain(this.objectRoot, dirname(path)))) return 'missing' as const; const meta = this.objectMetaPath(objectKey); const exists = await readJson<ObjectManifest>(meta); if (!exists) return 'missing' as const; await ensureNoSymlink(path, false); await removeIfPresent(path); await removeIfPresent(meta); return 'deleted' as const; }

  async putObject(input: { objectKey: string; bytes: Uint8Array; contentType: string; metadata: Record<string, string> }): Promise<DeliveryStorageObject> {
    const bytes = Uint8Array.from(input.bytes); const info = { objectKey: input.objectKey, sizeBytes: bytes.byteLength, checksumValue: sha256(bytes) };
    await writeAtomic(this.objectPath(input.objectKey), bytes, this.objectRoot);
    await writeAtomic(this.objectMetaPath(input.objectKey), JSON.stringify({ ...info, contentType: input.contentType, metadata: input.metadata } satisfies ObjectManifest), this.objectRoot);
    return info;
  }
  async putDeliveryObject(input: { objectKey: string; bytes: Uint8Array; contentType: string; metadata: Record<string, string> }) { return this.putObject(input); }
}

export class FilesystemDeliveryStorage implements DeliveryStorage {
  private constructor(private readonly objectRoot: string) {}
  static async create(rootValue: string | undefined) {
    const root = await validateStorageRoot(rootValue);
    const deliveriesRoot = join(root, 'deliveries'); const objectRoot = join(root, 'deliveries', 'objects');
    await ensureParentChain(root, deliveriesRoot);
    await ensureParentChain(root, objectRoot);
    return new FilesystemDeliveryStorage(objectRoot);
  }
  private objectKeyPath(key: string) { const digest = safeKey(key); const path = join(this.objectRoot, digest.slice(0, 2), `${digest}.bin`); if (!isInside(this.objectRoot, path)) throw new DeliveryStorageTemporaryError(); return path; }
  private metaPath(key: string) { return `${this.objectKeyPath(key)}.json`; }
  async putObject(input: { objectKey: string; bytes: Uint8Array; contentType: string; metadata: Record<string, string> }): Promise<DeliveryStorageObject> { const bytes = Uint8Array.from(input.bytes); const info = { objectKey: input.objectKey, sizeBytes: bytes.byteLength, checksumValue: sha256(bytes) }; await writeAtomic(this.objectKeyPath(input.objectKey), bytes, this.objectRoot); await writeAtomic(this.metaPath(input.objectKey), JSON.stringify({ ...info, contentType: input.contentType, metadata: input.metadata } satisfies ObjectManifest), this.objectRoot); return info; }
  async headObject(objectKey: string) { const path = this.objectKeyPath(objectKey); if (!(await assertParentChain(this.objectRoot, dirname(path)))) return null; const meta = await readJson<ObjectManifest>(this.metaPath(objectKey)); if (!meta) return null; await ensureNoSymlink(path, false); const bytes = await readFile(path); if (meta.objectKey !== objectKey || bytes.byteLength !== meta.sizeBytes || sha256(bytes) !== meta.checksumValue) throw new DeliveryStorageTemporaryError('交付对象摘要校验失败。'); return { objectKey, sizeBytes: meta.sizeBytes, checksumValue: meta.checksumValue }; }
  async readObject(objectKey: string) { const info = await this.headObject(objectKey); if (!info) return null; const path = this.objectKeyPath(objectKey); await ensureNoSymlink(path, false); return Uint8Array.from(await readFile(path)); }
  async deleteObject(objectKey: string) { const path = this.objectKeyPath(objectKey); if (!(await assertParentChain(this.objectRoot, dirname(path)))) return 'missing' as const; const meta = await readJson<ObjectManifest>(this.metaPath(objectKey)); if (!meta) return 'missing' as const; await ensureNoSymlink(path, false); await removeIfPresent(path); await removeIfPresent(this.metaPath(objectKey)); return 'deleted' as const; }
}
