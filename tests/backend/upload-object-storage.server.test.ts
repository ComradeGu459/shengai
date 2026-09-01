import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { S3Client } from '@aws-sdk/client-s3';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../backend/src/app.js';
import {
  getDatabaseUrl,
  UPLOAD_RELAY_BODY_LIMIT_BYTES,
  uploadProtocolConfig,
} from '../../backend/src/config.js';
import {
  createProductionS3ConfigFromEnv,
  ProductionS3CompatibleUploadStorage,
  type ProductionS3CompatibleStorageConfig,
} from '../../backend/src/modules/storage/s3-compatible-storage.js';
import { startServer } from '../../backend/src/server.js';
import { UploadCompletionWorker } from '../../backend/src/workers/upload-completion.worker.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');

type MockCommand = { input: Record<string, unknown>; constructor: { name: string } };

const config: ProductionS3CompatibleStorageConfig = {
  endpoint: 'https://cn-sy1.rains3.com',
  bucket: 'milaidi',
  region: 'cn-sy1',
  forcePathStyle: true,
  uploadMode: 'browser_direct',
  accessKeyId: 'server-only-access-key',
  secretAccessKey: 'server-only-secret',
  presignTtlSeconds: 900,
};

describe('ProductionS3CompatibleUploadStorage', () => {
  it('使用 AWS SDK command 完成 create/presign/ListParts/Complete/Head/Get/Delete/Abort', async () => {
    const bytes = new TextEncoder().encode('s3-object');
    const checksum = 'eb007b776561e27481743c3a4d40568fee20eae5949b99c2235946004246bc60';
    const calls: string[] = [];
    let abortInput: Record<string, unknown> | undefined;
    const client = {
      send: async (raw: unknown) => {
        const command = raw as MockCommand;
        calls.push(command.constructor.name);
        switch (command.constructor.name) {
          case 'CreateMultipartUploadCommand': return { UploadId: 'provider-upload-1' };
          case 'ListPartsCommand': return {
            Parts: [{
              PartNumber: 1,
              Size: bytes.byteLength,
              ETag: '"etag-1"',
              ChecksumSHA256: Buffer.from(checksum, 'hex').toString('base64'),
            }],
          };
          case 'CompleteMultipartUploadCommand': return {};
          case 'HeadObjectCommand': return { ContentLength: bytes.byteLength, Metadata: { sha256: checksum } };
          case 'GetObjectCommand': return { Body: { transformToByteArray: async () => bytes } };
          case 'PutObjectCommand': return {};
          case 'DeleteObjectCommand': return {};
          case 'AbortMultipartUploadCommand':
            abortInput = command.input;
            return {};
          case 'ListMultipartUploadsCommand': throw new Error('ListMultipartUploadsCommand must not be called');
          default: throw new Error(`unexpected command ${command.constructor.name}`);
        }
      },
    } as unknown as S3Client;
    const storage = new ProductionS3CompatibleUploadStorage(config, {
      client,
      presignPart: async (command, expiresInSeconds) => {
        expect((command as unknown as MockCommand).input.ContentLength).toBe(bytes.byteLength);
        expect(expiresInSeconds).toBeLessThanOrEqual(900);
        return 'https://cn-sy1.rains3.com/milaidi/presigned-part?X-Amz-Signature=opaque';
      },
    });
    const objectKey = 'projects/p/assets/video.mp4';
    const uploadId = await storage.createMultipart(objectKey, { contentType: 'video/mp4' });
    const authorization = await storage.authorizePart({
      storageUploadId: uploadId,
      objectKey,
      projectId: 'project-1',
      uploadSessionId: 'session-1',
      partNumber: 1,
      sizeBytes: bytes.byteLength,
      contentType: 'video/mp4',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const part = await storage.getUploadedPart({
      storageUploadId: uploadId,
      objectKey,
      partNumber: 1,
      etag: 'etag-1',
      checksumValue: checksum,
    });
    expect(authorization.uploadRequest).toMatchObject({ method: 'PUT', url: expect.stringMatching(/^https:\/\//) });
    expect(part).toMatchObject({ partNumber: 1, sizeBytes: bytes.byteLength, etag: 'etag-1', checksumValue: checksum });

    await storage.completeMultipart({ storageUploadId: uploadId, objectKey, parts: [part!] });
    expect(await storage.headObject(objectKey)).toMatchObject({ objectKey, sizeBytes: bytes.byteLength, checksumValue: checksum });
    expect(await storage.readObject(objectKey)).toEqual(bytes);
    expect(await storage.putObject({ objectKey: 'deliveries/file.srt', bytes, contentType: 'text/plain', metadata: {} })).toMatchObject({ objectKey: 'deliveries/file.srt', sizeBytes: bytes.byteLength });
    expect(await storage.deleteObject(objectKey)).toBe('deleted');
    await storage.abortMultipart({ storageUploadId: uploadId, objectKey });
    expect(abortInput).toMatchObject({ Bucket: config.bucket, Key: objectKey, UploadId: uploadId });
    expect(calls).not.toContain('ListMultipartUploadsCommand');

    expect(calls).toEqual(expect.arrayContaining([
      'CreateMultipartUploadCommand', 'ListPartsCommand', 'CompleteMultipartUploadCommand',
      'HeadObjectCommand', 'GetObjectCommand', 'PutObjectCommand', 'DeleteObjectCommand',
    ]));

    const sdkPresigner = new ProductionS3CompatibleUploadStorage(config);
    const sdkAuthorization = await sdkPresigner.authorizePart({
      storageUploadId: 'provider-upload-1',
      objectKey,
      projectId: 'project-1',
      uploadSessionId: 'session-1',
      partNumber: 1,
      sizeBytes: bytes.byteLength,
      contentType: 'video/mp4',
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(sdkAuthorization.uploadRequest.url).toMatch(/^https:\/\/cn-sy1\.rains3\.com\//);
  });

  it('生产 env 必须完整配置 S3，固定 forcePathStyle=true，Secret 只留在服务端配置对象', () => {
    const env = {
      QIMAO_S3_ENDPOINT: config.endpoint,
      QIMAO_S3_BUCKET: config.bucket,
      QIMAO_S3_REGION: config.region,
      QIMAO_S3_ACCESS_KEY_ID: config.accessKeyId,
      QIMAO_S3_SECRET_ACCESS_KEY: config.secretAccessKey,
      QIMAO_S3_PRESIGN_TTL_SECONDS: '600',
      QIMAO_S3_UPLOAD_MODE: 'browser_direct',
    };
    const parsed = createProductionS3ConfigFromEnv(env);
    expect(parsed).toMatchObject({ endpoint: config.endpoint, bucket: config.bucket, region: config.region, forcePathStyle: true, presignTtlSeconds: 600 });
    expect(() => createProductionS3ConfigFromEnv({ ...env, QIMAO_S3_SECRET_ACCESS_KEY: '' })).toThrow('QIMAO_S3_SECRET_ACCESS_KEY');
    expect(() => createProductionS3ConfigFromEnv({ ...env, QIMAO_S3_ENDPOINT: 'http://cn-sy1.rains3.com' })).toThrow();
  });

  it('腾讯 COS 新桶固定 virtual-hosted-style，预签名 host 不走 path-style', async () => {
    const parsed = createProductionS3ConfigFromEnv({
      QIMAO_S3_PROVIDER: 'tencent-cos',
      QIMAO_S3_REGION: 'ap-nanjing',
      QIMAO_S3_ACCESS_KEY_ID: 'server-only-access-key',
      QIMAO_S3_SECRET_ACCESS_KEY: 'server-only-secret',
      QIMAO_S3_UPLOAD_MODE: 'browser_direct',
    });
    expect(parsed).toMatchObject({
      endpoint: 'https://cos.ap-nanjing.myqcloud.com',
      bucket: 'milaidi-upload-1310313248',
      forcePathStyle: false,
      provider: 'tencent-cos',
      addressingStyle: 'virtual-hosted',
      presignTtlSeconds: 600,
    });
    const storage = new ProductionS3CompatibleUploadStorage(parsed, {
      presignPart: async () => 'https://milaidi-upload-1310313248.cos.ap-nanjing.myqcloud.com/objects/part?X-Amz-Signature=opaque',
    });
    const authorization = await storage.authorizePart({
      storageUploadId: 'cos-upload-1',
      objectKey: 'projects/p/video.mp4',
      projectId: 'project-1',
      uploadSessionId: 'session-1',
      partNumber: 1,
      sizeBytes: 16 * 1024 * 1024,
      contentType: 'video/mp4',
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(new URL(authorization.uploadRequest.url).hostname).toBe('milaidi-upload-1310313248.cos.ap-nanjing.myqcloud.com');
    expect(authorization.uploadRequest.url).not.toContain('server-only');

    const sdkStorage = new ProductionS3CompatibleUploadStorage(parsed);
    const sdkAuthorization = await sdkStorage.authorizePart({
      storageUploadId: 'cos-upload-1', objectKey: 'projects/p/video.mp4', projectId: 'project-1',
      uploadSessionId: 'session-1', partNumber: 1, sizeBytes: 16 * 1024 * 1024,
      contentType: 'video/mp4', expiresAt: new Date(Date.now() + 60_000),
    });
    expect(new URL(sdkAuthorization.uploadRequest.url).hostname).toBe('milaidi-upload-1310313248.cos.ap-nanjing.myqcloud.com');
    expect(() => createProductionS3ConfigFromEnv({
      QIMAO_S3_PROVIDER: 'tencent-cos', QIMAO_S3_REGION: 'ap-nanjing',
      QIMAO_S3_ACCESS_KEY_ID: 'server-only-access-key', QIMAO_S3_SECRET_ACCESS_KEY: 'server-only-secret',
      QIMAO_S3_UPLOAD_MODE: 'server_relay',
    })).toThrow('browser_direct');
  });

  it('QIMAO_UPLOAD_STORAGE_KIND=s3 且配置不完整时，server 在监听前 fail-closed', async () => {
    const names = [
      'QIMAO_UPLOAD_STORAGE_KIND', 'QIMAO_S3_ENDPOINT', 'QIMAO_S3_BUCKET', 'QIMAO_S3_REGION',
      'QIMAO_S3_ACCESS_KEY_ID', 'QIMAO_S3_SECRET_ACCESS_KEY',
    ] as const;
    const previous = new Map(names.map((name) => [name, process.env[name]]));
    try {
      process.env.QIMAO_UPLOAD_STORAGE_KIND = 's3';
      for (const name of names.slice(1)) delete process.env[name];
      await expect(startServer({ port: 0 })).rejects.toThrow('QIMAO_S3_ENDPOINT');
    } finally {
      for (const name of names) {
        const value = previous.get(name);
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });
});

describe('S3 server_relay 真实 Fastify 路由（零网络 provider mock）', () => {
  let databaseName = '';
  let admin: any;
  let pool: any;
  let app: any;
  const relayBytes = new TextEncoder().encode('abcd');
  const relayChecksum = '88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589';
  let uploadedPart: { PartNumber: number; Size: number; ETag: string } | null = null;
  const calls: string[] = [];
  const relayClient = {
    send: async (raw: unknown) => {
      const command = raw as MockCommand;
      calls.push(command.constructor.name);
      switch (command.constructor.name) {
        case 'CreateMultipartUploadCommand': return { UploadId: 'relay-upload-1' };
        case 'UploadPartCommand':
          uploadedPart = { PartNumber: Number(command.input.PartNumber), Size: Number(command.input.ContentLength), ETag: 'relay-etag-1' };
          return { ETag: '"relay-etag-1"' };
        case 'ListPartsCommand': return { Parts: uploadedPart ? [uploadedPart] : [] };
        case 'CompleteMultipartUploadCommand': return {};
        case 'HeadObjectCommand': return { ContentLength: relayBytes.byteLength, Metadata: { sha256: relayChecksum } };
        default: throw new Error(`unexpected relay command ${command.constructor.name}`);
      }
    },
  } as unknown as S3Client;
  const storage = new ProductionS3CompatibleUploadStorage({
    endpoint: 'https://cn-sy1.rains3.com',
    bucket: 'milaidi',
    region: 'cn-sy1',
    forcePathStyle: true,
    accessKeyId: 'server-only-access-key',
    secretAccessKey: 'server-only-secret',
    presignTtlSeconds: 900,
    uploadMode: 'server_relay',
  }, { client: relayClient });
  beforeAll(async () => {
    const source = new URL(getDatabaseUrl());
    const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
    databaseName = `qimao_upload_s3_relay_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
    admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    const databaseUrl = new URL(source); databaseUrl.pathname = `/${databaseName}`;
    await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
    pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
    app = createApp({
      database: { query: (...args: any[]) => pool.query(...args), connect: (...args: any[]) => pool.connect(...args), end: async () => undefined },
      uploadStorage: storage,
    });
    await app.ready();
  });
  beforeEach(async () => {
    uploadedPart = null;
    calls.length = 0;
    await pool.query('TRUNCATE project_commands, projects CASCADE');
  });
  afterAll(async () => {
    if (app) await app.close();
    if (pool) await pool.end();
    if (admin && databaseName) {
      await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [databaseName]);
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      const remaining = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [databaseName]);
      expect(remaining.rowCount).toBe(0);
    }
    if (admin) await admin.end();
  });

  it('authorize 返回同源 relay URL，PUT 只触发一次 UploadPart 并保持既有 confirm/complete', async () => {
    const project = await app.inject({ method: 'POST', url: '/api/projects', headers: { 'idempotency-key': 'relay-project-key' }, payload: { name: 'relay 专项' } });
    const projectId = project.json().id as string;
    const create = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/uploads`,
      headers: { 'idempotency-key': 'relay-upload-key' },
      payload: {
        originalFileName: 'EP01.srt', mediaKind: 'srt', sizeBytes: relayBytes.byteLength,
        fileFingerprint: 'relay-fingerprint', checksumAlgorithm: 'sha256',
        checksumValue: relayChecksum,
      },
    });
    expect(create.statusCode).toBe(201);
    const session = create.json();
    expect(session.partSizeBytes).toBe(16 * 1024 * 1024);
    const authorization = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/parts/authorize`,
      headers: { 'idempotency-key': 'relay-authorize-key' },
      payload: { partNumber: 1, fileFingerprint: session.fileFingerprint },
    });
    expect(authorization.statusCode).toBe(200);
    const auth = authorization.json();
    expect(auth.uploadRequest).toMatchObject({ url: `/api/local/uploads/${session.id}/parts/1`, method: 'PUT' });
    expect(auth.uploadRequest.url).not.toContain('rains3');

    const put = await app.inject({
      method: 'PUT', url: auth.uploadRequest.url,
      headers: { authorization: `Bearer ${auth.authorizationToken}`, 'content-type': 'application/octet-stream' },
      payload: Buffer.from(relayBytes),
    });
    expect(put.statusCode).toBe(200);
    expect(calls.filter((name) => name === 'UploadPartCommand')).toHaveLength(1);

    const confirm = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/parts/confirm`,
      headers: { 'idempotency-key': 'relay-confirm-key' }, payload: put.json(),
    });
    expect(confirm.statusCode).toBe(200);
    const complete = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/complete`,
      headers: { 'idempotency-key': 'relay-complete-key' }, payload: { expectedVersion: confirm.json().version },
    });
    expect(complete.statusCode).toBe(202);
    expect(complete.json().status).toBe('verifying');
    const worker = new UploadCompletionWorker(
      pool,
      storage,
      { leaseMs: 60_000, retryDelayMs: 0, maxAttempts: 3 },
      { workerId: randomUUID() },
    );
    expect(await worker.runOnce()).toMatchObject({ processed: true, status: 'completed' });
    const completedSession = await app.inject({ method: 'GET', url: `/api/uploads/${session.id}` });
    expect(completedSession.json().status).toBe('completed');
    expect(calls.filter((name) => name === 'UploadPartCommand')).toHaveLength(1);
  });

  it('149.5MiB新会话约10片，历史64MiB会话仍可中继且超出会话分片大小会拒绝', async () => {
    expect(uploadProtocolConfig.partSizeBytes).toBe(16 * 1024 * 1024);
    expect(UPLOAD_RELAY_BODY_LIMIT_BYTES).toBe(64 * 1024 * 1024);
    const targetSizeBytes = Math.round(149.5 * 1024 * 1024);
    const expectedPartCount = Math.ceil(targetSizeBytes / uploadProtocolConfig.partSizeBytes);
    expect(expectedPartCount).toBe(10);
    const legacyPartSize = 64 * 1024 * 1024;
    const project = await app.inject({ method: 'POST', url: '/api/projects', headers: { 'idempotency-key': 'relay-legacy-project-key' }, payload: { name: 'relay 历史分片专项' } });
    const projectId = project.json().id as string;
    const create = await app.inject({
      method: 'POST', url: `/api/projects/${projectId}/uploads`,
      headers: { 'idempotency-key': 'relay-legacy-upload-key' },
      payload: {
        originalFileName: 'legacy.mp4', mediaKind: 'video', sizeBytes: targetSizeBytes,
        fileFingerprint: `legacy.mp4|${targetSizeBytes}|legacy`, checksumAlgorithm: 'sha256',
      },
    });
    expect(create.statusCode).toBe(201);
    const session = create.json() as { id: string; fileFingerprint: string; partSizeBytes: number };
    expect(session.partSizeBytes).toBe(16 * 1024 * 1024);

    // 模拟升级前已经持久化的64MiB会话；生产升级不会迁移或重写这些字段。
    await pool.query('UPDATE upload_sessions SET size_bytes=$2,part_size_bytes=$3,total_parts=1 WHERE id=$1', [session.id, legacyPartSize, legacyPartSize]);
    const legacyAuthorization = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/parts/authorize`,
      headers: { 'idempotency-key': 'relay-legacy-authorize-key' },
      payload: { partNumber: 1, fileFingerprint: session.fileFingerprint },
    });
    expect(legacyAuthorization.statusCode).toBe(200);
    const legacyAuth = legacyAuthorization.json();
    const accepted = await app.inject({
      method: 'PUT', url: legacyAuth.uploadRequest.url,
      headers: { authorization: `Bearer ${legacyAuth.authorizationToken}`, 'content-type': 'application/octet-stream' },
      payload: Buffer.alloc(legacyPartSize, 0x61),
    });
    expect(accepted.statusCode).toBe(200);

    // 小于全局兼容上限但超过该会话持久化分片大小，仍由业务层精确拒绝。
    const currentPartSize = 16 * 1024 * 1024;
    await pool.query('UPDATE upload_sessions SET part_size_bytes=$2,total_parts=4 WHERE id=$1', [session.id, currentPartSize]);
    const currentAuthorization = await app.inject({
      method: 'POST', url: `/api/uploads/${session.id}/parts/authorize`,
      headers: { 'idempotency-key': 'relay-current-authorize-key' },
      payload: { partNumber: 1, fileFingerprint: session.fileFingerprint },
    });
    expect(currentAuthorization.statusCode).toBe(200);
    const currentAuth = currentAuthorization.json();
    const rejected = await app.inject({
      method: 'PUT', url: currentAuth.uploadRequest.url,
      headers: { authorization: `Bearer ${currentAuth.authorizationToken}`, 'content-type': 'application/octet-stream' },
      payload: Buffer.alloc(currentPartSize + 1, 0x62),
    });
    expect(rejected.statusCode).toBe(409);
    expect(rejected.json()).toMatchObject({ error: { code: 'UPLOAD_PART_SIZE_MISMATCH' } });
  }, 30_000);
});
