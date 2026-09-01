import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import { Metadata, Server as TusServer, type Upload } from '@tus/server';
import { FileStore } from '@tus/file-store';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  UPLOAD_DIRECT_CORS_ALLOWED_HEADERS,
  UPLOAD_DIRECT_CORS_EXPOSED_HEADERS,
  UPLOAD_DIRECT_CORS_ORIGIN,
} from '@qimao-terms-cloud/contracts';

import type { SystemControlPrincipal } from '../../system-control/system-control.auth.js';
import type { UploadDirectCapabilityClaims, UploadDirectCapabilityMethod } from '../../employee-auth/employee-auth.js';
import { ProjectRepository } from '../../projects/project.repository.js';
import { UploadRepository, type InternalUploadSession } from '../upload.repository.js';
import { isUploadObjectWriter, type StoredObjectInfo, type UploadStorage } from '../upload-storage.js';

const SESSION_ID_HEADER = 'x-upload-session-id';
export const UPLOAD_DIRECT_CAPABILITY_HEADER = 'x-qimao-upload-capability';
const TUS_RESUMABLE = '1.0.0';
const TUS_PATH = '/api/uploads/tus';

class TusPatchIncompleteError extends Error {
  status_code = 400;
  body = 'UPLOAD_PATCH_INCOMPLETE';
}

type ExpectedPatch = { length: number };

/**
 * FileStore 只按流结束时实际收到的字节数推进 offset；代理断流若仍以正常 end 到达，
 * tus server 会错误返回 204。这里在同一 FileStore 写入边界核对声明长度，并回滚短写。
 */
class LengthValidatingFileStore extends FileStore {
  private readonly expectedPatches = new Map<string, ExpectedPatch>();

  expectPatchLength(uploadId: string, length: number) {
    const expected: ExpectedPatch = { length };
    this.expectedPatches.set(uploadId, expected);
    return expected;
  }

  clearExpectedPatch(uploadId: string, expected: ExpectedPatch) {
    if (this.expectedPatches.get(uploadId) === expected) this.expectedPatches.delete(uploadId);
  }

  async write(readable: NodeJS.ReadableStream, fileId: string, offset: number): Promise<number> {
    const expected = this.expectedPatches.get(fileId);
    let received = 0;
    const counted = Readable.from((async function* () {
      for await (const chunk of readable as AsyncIterable<Uint8Array>) {
        received += chunk.byteLength;
        yield chunk;
      }
    })());
    try {
      const newOffset = await super.write(counted, fileId, offset);
      if (expected && received !== expected.length) {
        await fs.truncate(join(this.directory, fileId), offset);
        throw new TusPatchIncompleteError();
      }
      return newOffset;
    } catch (error) {
      if (expected && received !== expected.length) {
        await fs.truncate(join(this.directory, fileId), offset).catch(() => undefined);
        throw new TusPatchIncompleteError();
      }
      throw error;
    } finally {
      if (expected) this.clearExpectedPatch(fileId, expected);
    }
  }
}

let activeTusStore: LengthValidatingFileStore | null = null;

export class TusUploadNotCompleteError extends Error {}
export class TusUploadPromotionError extends Error {}
export class TusUploadChecksumMismatchError extends Error {}

export const getTusFileStore = (_app: FastifyInstance) => activeTusStore;

const sha256 = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');

/**
 * 读取已到达 Upload-Length 的 tus 临时对象，并一次性转交现有最终对象写入能力。
 * 内存上限由 UploadSession.sizeBytes 与全局 upload maxFileSizeBytes 共同约束，
 * 临时 tus 文件不会作为 Asset.objectKey 暴露。
 */
export const promoteTusUpload = async (input: {
  app: FastifyInstance;
  storage: UploadStorage;
  storageUploadId: string;
  objectKey: string;
  expectedSizeBytes: number;
  uploadSessionId: string;
  expectedChecksumValue?: string | null;
}): Promise<StoredObjectInfo> => {
  const store = getTusFileStore(input.app);
  if (!store) throw new TusUploadPromotionError('tus 临时存储未注册。');
  const upload = await store.getUpload(input.storageUploadId).catch(() => null);
  if (!upload || upload.size !== input.expectedSizeBytes || upload.offset !== input.expectedSizeBytes) {
    throw new TusUploadNotCompleteError('tus 上传尚未到达声明长度。');
  }
  if (!isUploadObjectWriter(input.storage)) {
    throw new TusUploadPromotionError('当前最终对象存储未提供安全写入能力。');
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of store.read(input.storageUploadId)) {
    const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : Uint8Array.from(chunk);
    total += bytes.byteLength;
    if (total > input.expectedSizeBytes) throw new TusUploadPromotionError('tus 对象读取长度超过会话声明。');
    chunks.push(bytes);
  }
  const bytes = Uint8Array.from(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  if (bytes.byteLength !== input.expectedSizeBytes) throw new TusUploadPromotionError('tus 对象读取长度不一致。');
  const checksumValue = sha256(bytes);
  if (input.expectedChecksumValue && checksumValue !== input.expectedChecksumValue) {
    throw new TusUploadChecksumMismatchError('tus 对象摘要与创建时的期望值不一致。');
  }
  const stored = await input.storage.putObject({
    objectKey: input.objectKey,
    bytes,
    contentType: 'application/octet-stream',
    metadata: { uploadSessionId: input.uploadSessionId, checksumAlgorithm: 'sha256' },
  });
  if (stored.sizeBytes !== bytes.byteLength || stored.checksumValue !== checksumValue) {
    throw new TusUploadPromotionError('最终对象写入后的摘要或大小不一致。');
  }
  return { sizeBytes: stored.sizeBytes, checksumValue: stored.checksumValue };
};

export const removeTusUpload = async (app: FastifyInstance, storageUploadId: string) => {
  const store = getTusFileStore(app);
  if (!store) return;
  const upload = await store.getUpload(storageUploadId).catch(() => null);
  if (upload) await store.remove(storageUploadId);
};

const header = (request: { headers: Record<string, string | string[] | undefined> }, name: string) => {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
};

export const isTusEmployeePrincipal = (principal: SystemControlPrincipal | null) => {
  if (!principal || !principal.subject.trim()) return false;
  const audiences = Array.isArray(principal.audience) ? principal.audience : [principal.audience];
  return audiences.includes('employee');
};

export const canTusProjectAccess = (principal: SystemControlPrincipal, projectId: string) => {
  if (principal.projectAccess === 'all') return true;
  return principal.projectAccess === 'listed' && principal.projectIds?.includes(projectId) === true;
};

type DirectCapabilityRead =
  | { present: false }
  | { present: true; claims: UploadDirectCapabilityClaims | null };

const safeStorageUploadId = (value: string) => /^[A-Za-z0-9_-]{1,255}$/.test(value);

const metadataMatchesSession = (metadata: Upload['metadata'], session: InternalUploadSession) => {
  // @uppy/tus 同时发送源字段名和 tus 别名；白名单保持显式，且每个文件名别名
  // 都必须匹配服务端权威业务会话身份。
  const allowedKeys = new Set(['filename', 'filetype', 'name', 'type']);
  if (metadata && Object.keys(metadata).some((key) => !allowedKeys.has(key))) return false;

  const filenames = [metadata?.filename, metadata?.name]
    .filter((value): value is string => typeof value === 'string');
  return filenames.every((filename) => filename === session.originalFileName);
};

const sessionMetadata = (request: { headers: Record<string, string | string[] | undefined> }) => {
  try {
    return Metadata.parse(header(request, 'upload-metadata') ?? undefined);
  } catch {
    throw { status_code: 400, body: 'UPLOAD_METADATA_INVALID' };
  }
};

const sendTusError = (reply: { code: (status: number) => any; header: (name: string, value: string) => any; send: (body: string) => any }, status: number, body: string) =>
  reply.code(status).header('Tus-Resumable', TUS_RESUMABLE).send(body);

export const tusBusinessRoutes: FastifyPluginAsync<{ directory: string; maxSizeBytes: number }> = async (app, options) => {
  const uploads = new UploadRepository(app.database);
  const projects = new ProjectRepository(app.database);
  const datastore = new LengthValidatingFileStore({ directory: options.directory });
  const readDirectCapability = (request: { headers: { get: (name: string) => string | null } }, method: string): DirectCapabilityRead => {
    const token = request.headers.get(UPLOAD_DIRECT_CAPABILITY_HEADER);
    if (token === null) return { present: false };
    const claims = app.employeeAuthService?.verifyUploadDirectCapability(token) ?? null;
    if (!claims || !claims.methods.includes(method as UploadDirectCapabilityMethod)) return { present: true, claims: null };
    return { present: true, claims };
  };
  const findCapabilitySession = async (request: { headers: { get: (name: string) => string | null } }, method: string, storageUploadId?: string) => {
    const capability = readDirectCapability(request, method);
    if (!capability.present) return { present: false as const };
    if (!capability.claims) return { present: true as const, status: 401 as const };
    const claims = capability.claims;
    if (storageUploadId && claims.storageUploadId !== storageUploadId) return { present: true as const, status: 404 as const };
    const session = await uploads.findById(claims.uploadSessionId);
    const project = session ? await projects.findById(session.projectId) : null;
    if (!session || session.transportKind !== 'tus' || session.projectId !== claims.projectId
      || session.storageUploadId !== claims.storageUploadId || session.sizeBytes !== claims.sizeBytes
      || !project || project.lifecycleStatus !== 'active') return { present: true as const, status: 404 as const };
    if (new Date(session.expiresAt).getTime() <= Date.now() || !['created', 'uploading', 'failed'].includes(session.status)) {
      return { present: true as const, status: 409 as const };
    }
    return { present: true as const, session, claims };
  };
  const sessionForTusRequest = async (request: { headers: { get: (name: string) => string | null } }, method: string, storageUploadId?: string) => {
    const capability = await findCapabilitySession(request, method, storageUploadId);
    if (capability.present) return capability;
    const sessionId = request.headers.get(SESSION_ID_HEADER);
    const session = sessionId ? await uploads.findById(sessionId) : null;
    if (!session || session.transportKind !== 'tus' || (storageUploadId && session.storageUploadId !== storageUploadId)) {
      return { present: false as const, status: 404 as const };
    }
    return { present: false as const, session };
  };
  const tus = new TusServer({
    path: TUS_PATH,
    maxSize: options.maxSizeBytes,
    relativeLocation: true,
    datastore,
    // 直连上传只允许主站 Origin、签名头和 tus 所需协议头，不带 Cookie。
    allowedOrigins: [UPLOAD_DIRECT_CORS_ORIGIN],
    allowedCredentials: false,
    allowedHeaders: [...UPLOAD_DIRECT_CORS_ALLOWED_HEADERS],
    exposedHeaders: [...UPLOAD_DIRECT_CORS_EXPOSED_HEADERS],
    namingFunction: async (request) => {
      const resolved = await sessionForTusRequest(request, 'POST');
      const session = resolved.session;
      if (!session || session.transportKind !== 'tus' || !safeStorageUploadId(session.storageUploadId)) {
        throw { status_code: 404, body: 'UPLOAD_NOT_FOUND' };
      }
      return session.storageUploadId;
    },
    onUploadCreate: async (request, upload) => {
      const resolved = await sessionForTusRequest(request, 'POST', upload.id);
      const session = resolved.session;
      if (!session || session.transportKind !== 'tus' || session.storageUploadId !== upload.id
        || session.sizeBytes !== upload.size || !metadataMatchesSession(upload.metadata, session)) {
        throw { status_code: 409, body: 'UPLOAD_INTENT_CONFLICT' };
      }
      return {};
    },
    onIncomingRequest: async (request, uploadId) => {
      const capability = await findCapabilitySession(request, request.method, uploadId);
      if (capability.present && 'status' in capability) {
        throw { status_code: capability.status, body: capability.status === 401 ? 'EMPLOYEE_AUTH_REQUIRED' : 'UPLOAD_NOT_FOUND' };
      }
      const session = await uploads.findByStorageUploadId(uploadId);
      if (!session || session.transportKind !== 'tus') throw { status_code: 404, body: 'UPLOAD_NOT_FOUND' };
      if (request.method === 'PATCH') {
        const rawLength = request.headers.get('content-length');
        const length = rawLength === null ? Number.NaN : Number(rawLength);
        if (!Number.isSafeInteger(length) || length < 0) {
          throw { status_code: 400, body: 'UPLOAD_PATCH_LENGTH_REQUIRED' };
        }
        const expected = datastore.expectPatchLength(uploadId, length);
        request.signal.addEventListener('abort', () => datastore.clearExpectedPatch(uploadId, expected), { once: true });
      }
    },
  });
  activeTusStore = datastore;

  app.addContentTypeParser('application/offset+octet-stream', (_request, _payload, done) => done(null));

  const forward = (request: any, reply: any) => {
    reply.hijack();
    return tus.handle(request.raw, reply.raw);
  };

  const authorizeSession = async (request: any, sessionId: string, method: string) => {
    const capability = await findCapabilitySession({ headers: { get: (name: string) => header(request, name) } }, method);
    if (capability.present) {
      if ('status' in capability) return { status: capability.status };
      if (capability.session.id !== sessionId) return { status: 404 as const };
      return { session: capability.session };
    }
    const principal = request.employeePrincipal as SystemControlPrincipal | null;
    if (!isTusEmployeePrincipal(principal)) return { status: 401 as const };
    const session = await uploads.findById(sessionId);
    if (!session || session.transportKind !== 'tus') return { status: 404 as const };
    const project = await projects.findById(session.projectId);
    if (!project || project.lifecycleStatus !== 'active' || !canTusProjectAccess(principal!, session.projectId)) {
      return { status: 404 as const };
    }
    if (!['created', 'uploading', 'failed'].includes(session.status)) return { status: 409 as const };
    return { session };
  };

  const authorizeStorage = async (request: any, storageUploadId: string, method: string) => {
    const capability = await findCapabilitySession({ headers: { get: (name: string) => header(request, name) } }, method, storageUploadId);
    if (capability.present) {
      if ('status' in capability) return { status: capability.status };
      return { session: capability.session };
    }
    const principal = request.employeePrincipal as SystemControlPrincipal | null;
    if (!isTusEmployeePrincipal(principal)) return { status: 401 as const };
    const session = await uploads.findByStorageUploadId(storageUploadId);
    if (!session || session.transportKind !== 'tus') return { status: 404 as const };
    const project = await projects.findById(session.projectId);
    if (!project || project.lifecycleStatus !== 'active' || !canTusProjectAccess(principal!, session.projectId)) {
      return { status: 404 as const };
    }
    if (!['created', 'uploading', 'failed'].includes(session.status)) return { status: 409 as const };
    return { session };
  };

  app.all(TUS_PATH, async (request, reply) => {
    if (request.method !== 'POST') return forward(request, reply);
    const sessionId = header(request, SESSION_ID_HEADER);
    const direct = await findCapabilitySession({ headers: { get: (name: string) => header(request, name) } }, 'POST');
    if (!sessionId && !direct.present) return sendTusError(reply, 404, 'UPLOAD_NOT_FOUND');
    const authorized = direct.present
      ? direct
      : await authorizeSession(request, sessionId!, 'POST');
    if ('status' in authorized) return sendTusError(reply, authorized.status, authorized.status === 401 ? 'EMPLOYEE_AUTH_REQUIRED' : authorized.status === 409 ? 'UPLOAD_STATE_INVALID' : 'UPLOAD_NOT_FOUND');
    if (sessionId && authorized.session.id !== sessionId) return sendTusError(reply, 404, 'UPLOAD_NOT_FOUND');
    const length = Number(header(request, 'upload-length'));
    const metadata = sessionMetadata(request);
    if (!Number.isSafeInteger(length) || length !== authorized.session.sizeBytes || !metadataMatchesSession(metadata, authorized.session)) {
      return sendTusError(reply, 409, 'UPLOAD_INTENT_CONFLICT');
    }
    const existing = await tus.datastore.getUpload(authorized.session.storageUploadId).catch(() => undefined);
    if (existing) {
      return reply.code(201).header('Tus-Resumable', TUS_RESUMABLE)
        .header('Location', `${TUS_PATH}/${authorized.session.storageUploadId}`).send();
    }
    return forward(request, reply);
  });

  app.all(`${TUS_PATH}/*`, async (request, reply) => {
    if (request.method === 'OPTIONS') return forward(request, reply);
    const wildcard = (request.params as Record<string, string>)['*'] ?? '';
    const storageUploadId = decodeURIComponent(wildcard || (request.url.slice(`${TUS_PATH}/`.length).split('?')[0] ?? ''));
    if (!safeStorageUploadId(storageUploadId)) return sendTusError(reply, 404, 'UPLOAD_NOT_FOUND');
    const authorized = await authorizeStorage(request, storageUploadId, request.method);
    if ('status' in authorized) return sendTusError(reply, authorized.status, authorized.status === 401 ? 'EMPLOYEE_AUTH_REQUIRED' : authorized.status === 409 ? 'UPLOAD_STATE_INVALID' : 'UPLOAD_NOT_FOUND');
    return forward(request, reply);
  });
};
