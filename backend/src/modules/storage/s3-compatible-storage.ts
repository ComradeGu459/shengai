import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  StorageAuthorizationExpiredError,
  StorageAuthorizationInvalidError,
  type StoredObjectInfo,
  type StoredPartInfo,
  type UploadPartRequest,
  type UploadStorage,
  type StorageFailureCode,
  StorageTemporaryError,
} from '../uploads/upload-storage.js';
import type { DeliveryStorage, DeliveryStorageObject } from '../deliveries/delivery-storage.js';

/**
 * S3 兼容对象存储的服务端配置。region 只供服务端签名使用，绝不拼进浏览器 URL。
 * 雨云 ROS 保持 path-style；腾讯 COS 新桶固定 virtual-hosted-style。
 */
export type S3CompatibleProvider = 'rains3' | 'tencent-cos';
export type S3AddressingStyle = 'path' | 'virtual-hosted';

export interface S3CompatibleStorageConfig {
  endpoint: string;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
  provider?: S3CompatibleProvider;
  addressingStyle?: S3AddressingStyle;
}

export const normalizeS3CompatibleStorageConfig = (input: S3CompatibleStorageConfig): S3CompatibleStorageConfig => {
  const endpoint = new URL(input.endpoint);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password
    || endpoint.pathname !== '/' || endpoint.search || endpoint.hash) {
    throw new Error('对象存储 endpoint 必须是无路径、无凭据的 HTTPS origin。');
  }
  if (!input.bucket || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(input.bucket)) {
    throw new Error('对象存储 bucket 名称无效。');
  }
  if (!input.region.trim()) {
    throw new Error('对象存储必须配置 region。');
  }
  const provider = input.provider ?? 'rains3';
  const addressingStyle = input.addressingStyle ?? (input.forcePathStyle ? 'path' : 'virtual-hosted');
  if (provider !== 'rains3' && provider !== 'tencent-cos') {
    throw new Error('对象存储 provider 无效。');
  }
  if (addressingStyle !== 'path' && addressingStyle !== 'virtual-hosted') {
    throw new Error('对象存储 addressingStyle 无效。');
  }
  const expectedStyle = provider === 'tencent-cos' ? 'virtual-hosted' : 'path';
  if (addressingStyle !== expectedStyle || input.forcePathStyle !== (addressingStyle === 'path')) {
    throw new Error(`${provider} 的对象存储寻址模式不匹配。`);
  }
  return {
    endpoint: endpoint.origin,
    bucket: input.bucket,
    region: input.region.trim(),
    forcePathStyle: addressingStyle === 'path',
    ...(input.provider ? { provider } : {}),
    ...(input.addressingStyle ? { addressingStyle } : {}),
  };
};

interface SignedPartPayload {
  storageUploadId: string;
  objectKey: string;
  projectId: string;
  uploadSessionId: string;
  partNumber: number;
  sizeBytes: number;
  contentType: string;
  expiresAt: number;
}

interface MultipartResource {
  objectKey: string;
  parts: Map<number, { bytes: Uint8Array; info: StoredPartInfo }>;
  completedParts: StoredPartInfo[] | null;
}

const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');
const canonicalPayload = (payload: SignedPartPayload) => JSON.stringify([
  payload.storageUploadId,
  payload.objectKey,
  payload.projectId,
  payload.uploadSessionId,
  payload.partNumber,
  payload.sizeBytes,
  payload.contentType,
  payload.expiresAt,
]);

const header = (headers: Record<string, string>, name: string) => {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry?.[1];
};

const samePartList = (left: StoredPartInfo[], right: StoredPartInfo[]) =>
  left.length === right.length && left.every((part, index) => {
    const other = right[index];
    return other?.partNumber === part.partNumber && other.etag === part.etag
      && other.sizeBytes === part.sizeBytes && other.checksumValue === part.checksumValue;
  });

/**
 * 零网络 S3 multipart 适配器，用来冻结签名字段和完成幂等语义。
 * 它模拟 provider 的 create/presign/PUT/ListParts/Complete/Head，不代表生产 ROS 客户端。
 */
export class InMemoryS3StorageFake implements UploadStorage {
  private readonly config: S3CompatibleStorageConfig;
  private readonly signingSecret: Buffer;
  private readonly uploads = new Map<string, MultipartResource>();
  private readonly objectKeys = new Map<string, string>();
  private readonly objects = new Map<string, { bytes: Uint8Array; info: StoredObjectInfo }>();
  private currentTime: () => Date = () => new Date();

  constructor(config: S3CompatibleStorageConfig, signingSecret = 'test-only-s3-signing-secret') {
    this.config = normalizeS3CompatibleStorageConfig(config);
    this.signingSecret = Buffer.from(signingSecret, 'utf8');
  }

  setClock(clock: () => Date) {
    this.currentTime = clock;
  }

  getConfig() {
    return this.config;
  }

  getMultipartResourceCount() {
    return this.uploads.size;
  }

  getObjectCount() {
    return this.objects.size;
  }

  async createMultipart(objectKey: string) {
    const existingId = this.objectKeys.get(objectKey);
    if (existingId && this.uploads.has(existingId)) return existingId;
    const storageUploadId = randomUUID();
    this.objectKeys.set(objectKey, storageUploadId);
    this.uploads.set(storageUploadId, { objectKey, parts: new Map(), completedParts: null });
    return storageUploadId;
  }

  async authorizePart(input: {
    storageUploadId: string;
    objectKey: string;
    partNumber: number;
    expiresAt: Date;
    projectId?: string;
    uploadSessionId?: string;
    sizeBytes?: number;
    contentType?: string;
  }): Promise<{ authorizationToken: string; expiresAt: Date; uploadRequest: UploadPartRequest }> {
    const upload = this.uploads.get(input.storageUploadId);
    if (!upload || upload.objectKey !== input.objectKey || upload.completedParts) {
      throw new StorageAuthorizationInvalidError('分片授权与对象存储上传身份不匹配。');
    }
    if (!input.projectId || !input.uploadSessionId || !input.sizeBytes || !input.contentType) {
      throw new StorageAuthorizationInvalidError('分片授权缺少业务绑定字段。');
    }
    const expiresAt = input.expiresAt.getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= this.currentTime().getTime()) {
      throw new StorageAuthorizationExpiredError();
    }
    const payload: SignedPartPayload = {
      storageUploadId: input.storageUploadId,
      objectKey: input.objectKey,
      projectId: input.projectId,
      uploadSessionId: input.uploadSessionId,
      partNumber: input.partNumber,
      sizeBytes: input.sizeBytes,
      contentType: input.contentType,
      expiresAt,
    };
    const encodedPayload = encode(canonicalPayload(payload));
    const signature = createHmac('sha256', this.signingSecret).update(encodedPayload).digest('base64url');
    const authorizationToken = `${encodedPayload}.${signature}`;
    const url = new URL(`${this.config.endpoint}/${encodeURIComponent(this.config.bucket)}
      /${encodeURIComponent(input.storageUploadId)}/${input.partNumber}`.replace(/\s+/g, ''));
    url.searchParams.set('qimao-part-token', authorizationToken);
    return {
      authorizationToken,
      expiresAt: input.expiresAt,
      uploadRequest: {
        url: url.toString(),
        method: 'PUT',
        headers: { 'content-type': input.contentType },
      },
    };
  }

  /** 模拟浏览器对 presigned URL 的 HTTPS PUT；不走 Fastify，不产生网络请求。 */
  async putPresignedPart(input: { url: string; bytes: Uint8Array; headers: Record<string, string> }) {
    const target = new URL(input.url);
    if (target.origin !== this.config.endpoint) throw new StorageAuthorizationInvalidError();
    const segments = target.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
    if (segments.length !== 3 || segments[0] !== this.config.bucket) throw new StorageAuthorizationInvalidError();
    const token = target.searchParams.get('qimao-part-token');
    if (!token) throw new StorageAuthorizationInvalidError();
    const payload = this.verifyToken(token);
    const partNumber = Number(segments[2]);
    if (segments[1] !== payload.storageUploadId || partNumber !== payload.partNumber) {
      throw new StorageAuthorizationInvalidError('预签名 URL 与分片身份不匹配。');
    }
    if (header(input.headers, 'content-type') !== payload.contentType
      || (header(input.headers, 'content-length') && Number(header(input.headers, 'content-length')) !== input.bytes.byteLength)) {
      throw new StorageAuthorizationInvalidError('分片请求头与预签名约束不匹配。');
    }
    if (input.bytes.byteLength !== payload.sizeBytes) {
      throw new StorageAuthorizationInvalidError('分片大小与预签名约束不匹配。');
    }
    const upload = this.uploads.get(payload.storageUploadId);
    if (!upload || upload.objectKey !== payload.objectKey || upload.completedParts) {
      throw new StorageAuthorizationInvalidError('对象存储上传身份不可用。');
    }
    const bytes = Uint8Array.from(input.bytes);
    const info: StoredPartInfo = {
      partNumber,
      sizeBytes: bytes.byteLength,
      etag: createHash('md5').update(bytes).digest('hex'),
      checksumValue: createHash('sha256').update(bytes).digest('hex'),
    };
    upload.parts.set(partNumber, { bytes, info });
    return info;
  }

  private verifyToken(token: string) {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) throw new StorageAuthorizationInvalidError();
    const expected = createHmac('sha256', this.signingSecret).update(encodedPayload).digest('base64url');
    if (signature !== expected) throw new StorageAuthorizationInvalidError();
    let payload: SignedPartPayload;
    try {
      const values = JSON.parse(decode(encodedPayload)) as [string, string, string, string, number, number, string, number];
      payload = {
        storageUploadId: values[0], objectKey: values[1], projectId: values[2], uploadSessionId: values[3],
        partNumber: values[4], sizeBytes: values[5], contentType: values[6], expiresAt: values[7],
      };
    } catch {
      throw new StorageAuthorizationInvalidError();
    }
    if (!payload.storageUploadId || !payload.objectKey || !payload.projectId || !payload.uploadSessionId
      || !Number.isInteger(payload.partNumber) || payload.partNumber < 1 || !Number.isInteger(payload.sizeBytes)
      || payload.sizeBytes < 1 || !payload.contentType || !Number.isFinite(payload.expiresAt)) {
      throw new StorageAuthorizationInvalidError();
    }
    if (payload.expiresAt <= this.currentTime().getTime()) throw new StorageAuthorizationExpiredError();
    return payload;
  }

  async listParts(storageUploadId: string) {
    const upload = this.uploads.get(storageUploadId);
    if (!upload) return [];
    return [...upload.parts.values()].map(({ info }) => info).sort((left, right) => left.partNumber - right.partNumber);
  }

  async getUploadedPart(input: { storageUploadId: string; partNumber: number; etag: string }) {
    const part = this.uploads.get(input.storageUploadId)?.parts.get(input.partNumber);
    return part?.info.etag === input.etag ? part.info : null;
  }

  async completeMultipart(input: { storageUploadId: string; objectKey: string; parts: StoredPartInfo[] }) {
    const upload = this.uploads.get(input.storageUploadId);
    if (!upload || upload.objectKey !== input.objectKey) throw new Error('对象存储 multipart 身份不存在。');
    if (upload.completedParts) {
      if (!samePartList(upload.completedParts, input.parts)) throw new Error('对象存储完成请求与既有事实冲突。');
      return;
    }
    const ordered = [...input.parts].sort((left, right) => left.partNumber - right.partNumber);
    if (ordered.length === 0 || ordered.some((part, index) => part.partNumber !== index + 1)) {
      throw new Error('对象存储完成请求缺少连续分片。');
    }
    const chunks = ordered.map((part) => {
      const stored = upload.parts.get(part.partNumber);
      if (!stored || stored.info.etag !== part.etag || stored.info.checksumValue !== part.checksumValue
        || stored.info.sizeBytes !== part.sizeBytes) throw new Error('对象存储分片事实不匹配。');
      return stored.bytes;
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
    upload.completedParts = ordered.map((part) => ({ ...part }));
  }

  async headObject(objectKey: string) {
    return this.objects.get(objectKey)?.info ?? null;
  }

  async readObject(objectKey: string) {
    const object = this.objects.get(objectKey);
    return object ? Uint8Array.from(object.bytes) : null;
  }

  async abortMultipart(input: { storageUploadId: string; objectKey: string }) {
    const upload = this.uploads.get(input.storageUploadId);
    if (!upload || upload.completedParts) return;
    if (upload.objectKey !== input.objectKey) throw new StorageTemporaryError('对象存储上传身份不匹配。');
    this.uploads.delete(input.storageUploadId);
    if (this.objectKeys.get(upload.objectKey) === input.storageUploadId) this.objectKeys.delete(upload.objectKey);
  }

  async deleteObject(objectKey: string): Promise<'deleted' | 'missing'> {
    return this.objects.delete(objectKey) ? 'deleted' : 'missing';
  }
}

export interface ProductionS3CompatibleStorageConfig extends S3CompatibleStorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  presignTtlSeconds: number;
  uploadMode: 'server_relay' | 'browser_direct';
}

const TENCENT_COS_ENDPOINT = 'https://cos.ap-nanjing.myqcloud.com';
const TENCENT_COS_BUCKET = 'milaidi-upload-1310313248';

const requiredEnv = (env: NodeJS.ProcessEnv, name: string) => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} 未配置。`);
  return value;
};

/** 只从服务端环境读取 S3 配置；Secret 不会进入合同、日志或异常消息。 */
export const createProductionS3ConfigFromEnv = (env: NodeJS.ProcessEnv = process.env): ProductionS3CompatibleStorageConfig => {
  const provider = env.QIMAO_S3_PROVIDER?.trim() || 'rains3';
  if (provider !== 'rains3' && provider !== 'tencent-cos') {
    throw new Error('QIMAO_S3_PROVIDER 无效。');
  }
  const isTencentCos = provider === 'tencent-cos';
  const endpoint = isTencentCos ? TENCENT_COS_ENDPOINT : requiredEnv(env, 'QIMAO_S3_ENDPOINT');
  const bucket = isTencentCos
    ? (env.QIMAO_S3_BUCKET?.trim() || TENCENT_COS_BUCKET)
    : requiredEnv(env, 'QIMAO_S3_BUCKET');
  if (isTencentCos && bucket !== TENCENT_COS_BUCKET) {
    throw new Error('腾讯 COS bucket 配置不匹配。');
  }
  const base = normalizeS3CompatibleStorageConfig({
    endpoint,
    bucket,
    region: requiredEnv(env, 'QIMAO_S3_REGION'),
    forcePathStyle: !isTencentCos,
    provider,
    addressingStyle: isTencentCos ? 'virtual-hosted' : 'path',
  });
  const rawTtl = env.QIMAO_S3_PRESIGN_TTL_SECONDS?.trim() ?? (isTencentCos ? '600' : '900');
  const presignTtlSeconds = Number(rawTtl);
  if (!Number.isInteger(presignTtlSeconds) || presignTtlSeconds < 60 || presignTtlSeconds > 3_600) {
    throw new Error('QIMAO_S3_PRESIGN_TTL_SECONDS 必须是 60 到 3600 秒的整数。');
  }
  const uploadMode = env.QIMAO_S3_UPLOAD_MODE?.trim();
  if (uploadMode !== 'server_relay' && uploadMode !== 'browser_direct') {
    throw new Error('QIMAO_S3_UPLOAD_MODE 必须明确配置为 server_relay 或 browser_direct。');
  }
  if (isTencentCos && uploadMode !== 'browser_direct') {
    throw new Error('腾讯 COS 仅允许 browser_direct multipart。');
  }
  return {
    ...base,
    accessKeyId: requiredEnv(env, 'QIMAO_S3_ACCESS_KEY_ID'),
    secretAccessKey: requiredEnv(env, 'QIMAO_S3_SECRET_ACCESS_KEY'),
    presignTtlSeconds,
    uploadMode,
  };
};

export interface ProductionS3ClientHooks {
  /** 测试注入 mock client；生产默认创建 AWS SDK S3Client。 */
  client?: S3Client;
  /** 测试注入无网络 presigner；生产固定使用 AWS SDK getSignedUrl。 */
  presignPart?: (command: UploadPartCommand, expiresInSeconds: number) => Promise<string>;
  /** 测试注入对象读取 presigner；生产固定使用 AWS SDK getSignedUrl。 */
  presignGet?: (command: GetObjectCommand, expiresInSeconds: number) => Promise<string>;
}

type ProviderPart = {
  PartNumber?: number;
  Size?: number;
  ETag?: string;
  ChecksumSHA256?: string;
};
type ListPartsWire = { Parts?: ProviderPart[]; IsTruncated?: boolean; NextPartNumberMarker?: number };
type HeadObjectWire = { ContentLength?: number; ContentType?: string; Metadata?: Record<string, string>; ChecksumSHA256?: string };
type GetObjectWire = { Body?: unknown };
type RelayCapability = {
  storageUploadId: string;
  objectKey: string;
  partNumber: number;
  sizeBytes: number;
  contentType: string;
  expiresAt: number;
  state: 'ready' | 'in_flight' | 'completed';
  receipt?: StoredPartInfo;
};

const providerErrorName = (error: unknown) => {
  if (!error || typeof error !== 'object') return '';
  const record = error as { name?: unknown; Code?: unknown; code?: unknown };
  return String(record.name ?? record.Code ?? record.code ?? '');
};
const providerHttpStatus = (error: unknown) => {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as { $metadata?: { httpStatusCode?: unknown }; statusCode?: unknown; status?: unknown };
  const value = record.$metadata?.httpStatusCode ?? record.statusCode ?? record.status;
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
};

/** 将 AWS/S3 供应商失败归一化为不含原始载荷的稳定分类。 */
export const classifyStorageProviderError = (error: unknown): Exclude<StorageFailureCode, 'STORAGE_TEMPORARY_FAILURE'> => {
  const name = providerErrorName(error).toLowerCase();
  const status = providerHttpStatus(error);
  if (status === 401 || status === 403 || [
    'accessdenied', 'invalidaccesskeyid', 'signaturedoesnotmatch', 'invalidtoken', 'expiredtoken',
  ].includes(name)) return 'STORAGE_PROVIDER_AUTH';
  if (status === 404 || ['nosuchbucket', 'nosuchkey', 'nosuchobject'].includes(name)) return 'STORAGE_PROVIDER_NOT_FOUND';
  if (status === 429 || ['slowdown', 'toomanyrequests', 'requestlimitexceeded'].includes(name)) {
    return 'STORAGE_PROVIDER_RATE_LIMITED';
  }
  if (status !== undefined && status >= 400 && status < 500) return 'STORAGE_PROVIDER_REJECTED';
  if (status === 501 || ['notimplemented', 'invalidrequest', 'invalidargument'].includes(name)) {
    return 'STORAGE_PROVIDER_REJECTED';
  }
  if (['networkingerror', 'timeout', 'requesttimeout', 'aborterror'].includes(name)
    || (status !== undefined && status >= 500)) return 'STORAGE_PROVIDER_UNAVAILABLE';
  return 'STORAGE_PROVIDER_UNAVAILABLE';
};
class StorageProviderProtocolError extends Error {}
const isNotFound = (error: unknown) => ['NotFound', 'NoSuchKey', 'NoSuchObject'].includes(providerErrorName(error));
const isNoSuchUpload = (error: unknown) => providerErrorName(error) === 'NoSuchUpload';
const etagEqual = (left: string | undefined, right: string) =>
  (left ?? '').replace(/^"|"$/g, '') === right.replace(/^"|"$/g, '');
const sha256Hex = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const checksumHeaderToHex = (value: string | undefined) => {
  if (!value) return null;
  if (/^[a-f0-9]{64}$/i.test(value)) return value.toLowerCase();
  try {
    const decoded = Buffer.from(value, 'base64').toString('hex');
    return decoded.length === 64 ? decoded : null;
  } catch {
    return null;
  }
};

/**
 * 正式 AWS SDK v3 S3 multipart 适配器。它只保存现有 UploadStorage/DeliveryStorage
 * 所需的 provider 事实，不创建新的业务会话或 Asset 状态源。
 */
export class ProductionS3CompatibleUploadStorage implements UploadStorage, DeliveryStorage {
  readonly uploadMode: ProductionS3CompatibleStorageConfig['uploadMode'];
  private readonly client: S3Client;
  private readonly presignPart: (command: UploadPartCommand, expiresInSeconds: number) => Promise<string>;
  private readonly presignGet: (command: GetObjectCommand, expiresInSeconds: number) => Promise<string>;
  private readonly config: ProductionS3CompatibleStorageConfig;
  private readonly checksumCache = new Map<string, { sizeBytes: number; checksumValue: string }>();
  private readonly relayCapabilities = new Map<string, RelayCapability>();
  private currentTime: () => Date = () => new Date();

  constructor(config: ProductionS3CompatibleStorageConfig, hooks: ProductionS3ClientHooks = {}) {
    const base = normalizeS3CompatibleStorageConfig(config);
    if (!config.accessKeyId.trim() || !config.secretAccessKey.trim()
      || !Number.isInteger(config.presignTtlSeconds) || config.presignTtlSeconds < 60 || config.presignTtlSeconds > 3_600
      || (config.uploadMode !== 'server_relay' && config.uploadMode !== 'browser_direct')
      || (base.provider === 'tencent-cos' && config.uploadMode !== 'browser_direct')) {
      throw new Error('S3 生产配置不完整。');
    }
    this.config = {
      ...base,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      presignTtlSeconds: config.presignTtlSeconds,
      uploadMode: config.uploadMode,
    };
    this.uploadMode = config.uploadMode;
    this.client = hooks.client ?? new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: base.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
    this.presignPart = hooks.presignPart
      ?? ((command, expiresInSeconds) => getSignedUrl(this.client, command, {
        expiresIn: expiresInSeconds,
        signableHeaders: new Set(['content-type']),
      }));
    this.presignGet = hooks.presignGet
      ?? ((command, expiresInSeconds) => getSignedUrl(this.client, command, { expiresIn: expiresInSeconds }));
  }

  setClock(clock: () => Date) {
    this.currentTime = clock;
  }

  /**
   * 为 ASR 等服务端调用方签发单对象私有 GET。对象身份来自既有 Asset，
   * 只返回 HTTPS 短时地址；不读取对象、不把 provider 凭据交给调用方。
   */
  async createGetUrl(input: {
    assetId: string;
    objectKey: string;
    expiresInSeconds: number;
  }): Promise<string> {
    if (!input.assetId.trim() || !input.objectKey.trim()) {
      throw new StorageAuthorizationInvalidError('对象读取授权缺少资源身份。');
    }
    if (!Number.isFinite(input.expiresInSeconds) || input.expiresInSeconds < 1) {
      throw new StorageAuthorizationInvalidError('对象读取授权有效期无效。');
    }
    const expiresInSeconds = Math.min(600, this.config.presignTtlSeconds, Math.trunc(input.expiresInSeconds));
    if (expiresInSeconds < 1) throw new StorageAuthorizationInvalidError('对象读取授权有效期无效。');
    try {
      const url = await this.presignGet(new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: input.objectKey,
      }), expiresInSeconds);
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('invalid presigned object URL');
      if (this.config.provider === 'tencent-cos') {
        const expectedHost = `${this.config.bucket}.cos.ap-nanjing.myqcloud.com`;
        if (parsed.hostname.toLowerCase() !== expectedHost) throw new Error('腾讯 COS 预签名地址寻址模式不匹配。');
      }
      return url;
    } catch (error) {
      if (error instanceof StorageAuthorizationInvalidError || error instanceof StorageAuthorizationExpiredError) throw error;
      throw new StorageTemporaryError('对象存储无法签发对象读取地址。');
    }
  }

  private async send<T>(command: unknown): Promise<T> {
    const client = this.client as unknown as { send(input: unknown): Promise<unknown> };
    return await client.send(command) as T;
  }

  async createMultipart(objectKey: string, options: { contentType?: string } = {}) {
    try {
      const output = await this.send<{ UploadId?: string }>(new CreateMultipartUploadCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
        ...(options.contentType ? { ContentType: options.contentType } : {}),
      }));
      if (!output.UploadId) throw new StorageProviderProtocolError();
      return output.UploadId;
    } catch (error) {
      if (error instanceof StorageProviderProtocolError) {
        throw new StorageTemporaryError('对象存储返回的分片上传身份无效。', 'STORAGE_PROVIDER_PROTOCOL_INVALID');
      }
      throw new StorageTemporaryError('对象存储无法创建分片上传。', classifyStorageProviderError(error));
    }
  }

  async authorizePart(input: {
    storageUploadId: string;
    objectKey: string;
    partNumber: number;
    expiresAt: Date;
    projectId?: string;
    uploadSessionId?: string;
    sizeBytes?: number;
    contentType?: string;
  }): Promise<{ authorizationToken: string; expiresAt: Date; uploadRequest: UploadPartRequest }> {
    if (!input.projectId || !input.uploadSessionId || !input.sizeBytes || !input.contentType) {
      throw new StorageAuthorizationInvalidError('分片授权缺少业务绑定字段。');
    }
    const now = Date.now();
    const requestedExpiry = input.expiresAt.getTime();
    if (!Number.isFinite(requestedExpiry) || requestedExpiry <= now) throw new StorageAuthorizationExpiredError();
    const expiresAtMs = Math.min(requestedExpiry, now + this.config.presignTtlSeconds * 1000);
    const expiresInSeconds = Math.max(1, Math.ceil((expiresAtMs - now) / 1000));
    if (this.uploadMode === 'server_relay') {
      const authorizationToken = `qimao-s3-relay-${randomBytes(32).toString('base64url')}`;
      this.relayCapabilities.set(authorizationToken, {
        storageUploadId: input.storageUploadId,
        objectKey: input.objectKey,
        partNumber: input.partNumber,
        sizeBytes: input.sizeBytes,
        contentType: input.contentType,
        expiresAt: expiresAtMs,
        state: 'ready',
      });
      return {
        authorizationToken,
        expiresAt: new Date(expiresAtMs),
        uploadRequest: {
          url: `/api/local/uploads/${input.uploadSessionId}/parts/${input.partNumber}`,
          method: 'PUT',
          headers: {
            authorization: `Bearer ${authorizationToken}`,
            'content-type': 'application/octet-stream',
          },
        },
      };
    }
    const command = new UploadPartCommand({
      Bucket: this.config.bucket,
      Key: input.objectKey,
      UploadId: input.storageUploadId,
      PartNumber: input.partNumber,
      ContentLength: input.sizeBytes,
    });
    // UploadPart 的 S3 API 模型没有 ContentType 字段；通过 SDK middleware 将
    // Content-Type 放入待签名请求，并由 presigner 的 signableHeaders 固定它。
    command.middlewareStack.add((next) => async (args) => {
      const request = args.request as { headers?: Record<string, string> };
      request.headers = { ...(request.headers ?? {}), 'content-type': input.contentType! };
      return next({ ...args, request });
    }, { step: 'build', name: 'qimao-signed-content-type' });
    try {
      const url = await this.presignPart(command, expiresInSeconds);
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') throw new Error('non-https presigned URL');
      if (this.config.provider === 'tencent-cos') {
        const expectedHost = `${this.config.bucket}.cos.ap-nanjing.myqcloud.com`;
        if (parsed.hostname.toLowerCase() !== expectedHost) throw new Error('腾讯 COS 预签名地址寻址模式不匹配。');
      }
      return {
        authorizationToken: `s3-${sha256Hex(new TextEncoder().encode(url))}`,
        expiresAt: new Date(expiresAtMs),
        uploadRequest: { url, method: 'PUT', headers: { 'content-type': input.contentType } },
      };
    } catch (error) {
      if (error instanceof StorageAuthorizationInvalidError || error instanceof StorageAuthorizationExpiredError) throw error;
      throw new StorageTemporaryError('对象存储无法签发分片上传地址。');
    }
  }

  async uploadAuthorizedPart(
    authorizationToken: string,
    bytes: Uint8Array,
    expected: {
      storageUploadId: string;
      objectKey: string;
      partNumber: number;
      sizeBytes?: number;
      contentType?: string;
    },
  ): Promise<StoredPartInfo> {
    if (this.uploadMode !== 'server_relay') throw new StorageAuthorizationInvalidError('当前对象存储仅允许 browser_direct。');
    const capability = this.relayCapabilities.get(authorizationToken);
    if (!capability) throw new StorageAuthorizationInvalidError();
    if (capability.expiresAt <= this.currentTime().getTime()) {
      this.relayCapabilities.delete(authorizationToken);
      throw new StorageAuthorizationExpiredError();
    }
    if (capability.storageUploadId !== expected.storageUploadId || capability.objectKey !== expected.objectKey
      || capability.partNumber !== expected.partNumber || capability.sizeBytes !== bytes.byteLength
      || (expected.sizeBytes !== undefined && expected.sizeBytes !== capability.sizeBytes)
      || (expected.contentType !== undefined && expected.contentType !== capability.contentType)) {
      throw new StorageAuthorizationInvalidError('分片授权与请求身份不匹配。');
    }
    if (capability.state === 'in_flight') throw new StorageAuthorizationInvalidError('分片授权正在使用。');
    if (capability.state === 'completed' && capability.receipt) return capability.receipt;
    capability.state = 'in_flight';
    try {
      const output = await this.send<{ ETag?: string }>(new UploadPartCommand({
        Bucket: this.config.bucket,
        Key: capability.objectKey,
        UploadId: capability.storageUploadId,
        PartNumber: capability.partNumber,
        Body: Buffer.from(bytes),
        ContentLength: bytes.byteLength,
        ContentMD5: createHash('md5').update(bytes).digest('base64'),
      }));
      if (!output.ETag) throw new Error('missing provider etag');
      const receipt: StoredPartInfo = {
        partNumber: capability.partNumber,
        sizeBytes: bytes.byteLength,
        etag: output.ETag.replace(/^"|"$/g, ''),
        checksumValue: sha256Hex(bytes),
      };
      capability.receipt = receipt;
      capability.state = 'completed';
      return receipt;
    } catch (error) {
      capability.state = 'ready';
      if (error instanceof StorageAuthorizationInvalidError || error instanceof StorageAuthorizationExpiredError) throw error;
      throw new StorageTemporaryError('对象存储分片写入失败。');
    }
  }

  private async listProviderParts(storageUploadId: string, objectKey: string) {
    const parts: ProviderPart[] = [];
    let marker: number | undefined;
    do {
      const output = await this.send<ListPartsWire>(new ListPartsCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
        UploadId: storageUploadId,
        ...(marker ? { PartNumberMarker: String(marker) } : {}),
      }));
      parts.push(...(output.Parts ?? []));
      marker = output.IsTruncated ? output.NextPartNumberMarker : undefined;
    } while (marker);
    return parts;
  }

  async getUploadedPart(input: { storageUploadId: string; partNumber: number; etag: string; objectKey?: string; checksumValue?: string }) {
    if (!input.objectKey) throw new StorageTemporaryError('对象存储分片查询缺少对象身份。');
    try {
      const part = (await this.listProviderParts(input.storageUploadId, input.objectKey))
        .find((candidate) => candidate.PartNumber === input.partNumber && etagEqual(candidate.ETag, input.etag));
      if (!part || !part.Size || !part.ETag) return null;
      const checksumValue = checksumHeaderToHex(part.ChecksumSHA256) ?? input.checksumValue;
      if (!checksumValue) throw new Error('missing part checksum');
      return { partNumber: input.partNumber, sizeBytes: part.Size, etag: input.etag, checksumValue };
    } catch (error) {
      if (isNoSuchUpload(error) || isNotFound(error)) return null;
      if (error instanceof StorageTemporaryError) throw error;
      throw new StorageTemporaryError('对象存储分片查询失败。');
    }
  }

  async completeMultipart(input: { storageUploadId: string; objectKey: string; parts: StoredPartInfo[] }) {
    try {
      const providerParts = await this.listProviderParts(input.storageUploadId, input.objectKey);
      const completedParts = [...input.parts].sort((left, right) => left.partNumber - right.partNumber).map((part) => {
        const provider = providerParts.find((candidate) => candidate.PartNumber === part.partNumber);
        if (!provider || !provider.ETag || !etagEqual(provider.ETag, part.etag) || provider.Size !== part.sizeBytes) {
          throw new Error('provider part mismatch');
        }
        return { PartNumber: part.partNumber, ETag: provider.ETag };
      });
      await this.send(new CompleteMultipartUploadCommand({
        Bucket: this.config.bucket,
        Key: input.objectKey,
        UploadId: input.storageUploadId,
        MultipartUpload: { Parts: completedParts },
      }));
    } catch (error) {
      if (isNoSuchUpload(error)) {
        const existing = await this.headObject(input.objectKey);
        if (existing) return;
      }
      if (error instanceof StorageTemporaryError) throw error;
      throw new StorageTemporaryError('对象存储无法完成分片合并。');
    }
  }

  async abortMultipart(input: { storageUploadId: string; objectKey: string }) {
    try {
      await this.send(new AbortMultipartUploadCommand({
        Bucket: this.config.bucket,
        Key: input.objectKey,
        UploadId: input.storageUploadId,
      }));
    } catch (error) {
      if (isNoSuchUpload(error) || isNotFound(error)) return;
      throw new StorageTemporaryError('对象存储无法取消分片上传。');
    }
  }

  async headObject(objectKey: string): Promise<StoredObjectInfo & { objectKey: string; contentType?: string } | null> {
    try {
      const output = await this.send<HeadObjectWire>(new HeadObjectCommand({ Bucket: this.config.bucket, Key: objectKey }));
      const sizeBytes = Number(output.ContentLength);
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) throw new Error('missing object size');
      const checksumValue = checksumHeaderToHex(output.ChecksumSHA256)
        ?? checksumHeaderToHex(output.Metadata?.sha256)
        ?? this.checksumCache.get(objectKey)?.checksumValue;
      if (checksumValue) {
        this.checksumCache.set(objectKey, { sizeBytes, checksumValue });
        return { objectKey, sizeBytes, checksumValue, ...(output.ContentType ? { contentType: output.ContentType } : {}) };
      }
      const computed = await this.digestObject(objectKey);
      if (!computed) return null;
      this.checksumCache.set(objectKey, computed);
      return { objectKey, ...computed, ...(output.ContentType ? { contentType: output.ContentType } : {}) };
    } catch (error) {
      if (isNotFound(error)) return null;
      if (error instanceof StorageTemporaryError) throw error;
      throw new StorageTemporaryError('对象存储对象元数据读取失败。');
    }
  }

  private async digestObject(objectKey: string) {
    try {
      const output = await this.send<GetObjectWire>(new GetObjectCommand({ Bucket: this.config.bucket, Key: objectKey }));
      if (!output.Body) return null;
      const hash = createHash('sha256');
      let sizeBytes = 0;
      if (output.Body instanceof Uint8Array) {
        hash.update(output.Body);
        sizeBytes = output.Body.byteLength;
      } else {
        const body = output.Body as { transformToByteArray?: () => Promise<Uint8Array> } & Partial<AsyncIterable<Uint8Array>>;
        if (body[Symbol.asyncIterator]) {
          for await (const chunk of body as AsyncIterable<Uint8Array>) {
            hash.update(chunk);
            sizeBytes += chunk.byteLength;
          }
        } else if (body.transformToByteArray) {
          const bytes = await body.transformToByteArray();
          hash.update(bytes);
          sizeBytes = bytes.byteLength;
        } else {
          throw new Error('unsupported object body');
        }
      }
      return { sizeBytes, checksumValue: hash.digest('hex') };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw new StorageTemporaryError('对象存储对象摘要读取失败。');
    }
  }

  async readObject(objectKey: string) {
    try {
      const output = await this.send<GetObjectWire>(new GetObjectCommand({ Bucket: this.config.bucket, Key: objectKey }));
      if (!output.Body) return null;
      if (output.Body instanceof Uint8Array) return Uint8Array.from(output.Body);
      const body = output.Body as { transformToByteArray?: () => Promise<Uint8Array> } & AsyncIterable<Uint8Array>;
      if (body.transformToByteArray) return Uint8Array.from(await body.transformToByteArray());
      const chunks: Uint8Array[] = [];
      for await (const chunk of body) chunks.push(Uint8Array.from(chunk));
      const sizeBytes = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const bytes = new Uint8Array(sizeBytes);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return bytes;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw new StorageTemporaryError('对象存储对象读取失败。');
    }
  }

  async deleteObject(objectKey: string): Promise<'deleted' | 'missing'> {
    try {
      await this.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: objectKey }));
      this.checksumCache.delete(objectKey);
      return 'deleted';
    } catch (error) {
      if (isNotFound(error)) return 'missing';
      throw new StorageTemporaryError('对象存储对象删除失败。');
    }
  }

  async putObject(input: { objectKey: string; bytes: Uint8Array; contentType: string; metadata: Record<string, string> }): Promise<DeliveryStorageObject> {
    const bytes = Uint8Array.from(input.bytes);
    const checksumValue = sha256Hex(bytes);
    try {
      await this.send(new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.objectKey,
        Body: Buffer.from(bytes),
        ContentType: input.contentType,
        Metadata: { ...input.metadata, sha256: checksumValue },
      }));
      this.checksumCache.set(input.objectKey, { sizeBytes: bytes.byteLength, checksumValue });
      return { objectKey: input.objectKey, sizeBytes: bytes.byteLength, checksumValue };
    } catch {
      throw new StorageTemporaryError('对象存储对象写入失败。');
    }
  }
}
