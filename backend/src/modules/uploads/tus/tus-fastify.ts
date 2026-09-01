import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { FileStore } from '@tus/file-store';
import { Metadata, Server as TusServer, type Upload } from '@tus/server';

const sessionTokenHeader = 'x-upload-session-token';
type TusServerOptions = ConstructorParameters<typeof TusServer>[0];
type TusRequest = Parameters<NonNullable<TusServerOptions['namingFunction']>>[0];

export interface TusUploadSessionIdentity {
  projectId: string;
  uploadSessionId: string;
  storageUploadId: string;
  uploadLength: number;
  metadata?: Record<string, string | null>;
}

/**
 * 生产实现应由 PostgreSQL upload_commands/upload_sessions 实现此接口。
 * 浏览器只持有受控 token，不能通过 header 自行指定 storageUploadId。
 */
export interface TusUploadSessionAuthority {
  resolveCreate(input: { accessToken: string | null }): Promise<TusUploadSessionIdentity | null>;
  findByStorageUploadId(storageUploadId: string): Promise<TusUploadSessionIdentity | null>;
  authorize(input: { accessToken: string | null; session: TusUploadSessionIdentity }): Promise<boolean>;
}

export interface TusFastifyApp {
  app: FastifyInstance;
  tus: TusServer;
}

const safeStorageUploadId = (storageUploadId: string) => {
  if (!/^[A-Za-z0-9_-]{1,255}$/.test(storageUploadId)) throw { status_code: 403, body: 'UPLOAD_ACCESS_DENIED' };
  return storageUploadId;
};

const accessToken = (request: TusRequest) => request.headers.get(sessionTokenHeader);
const fastifyHeader = (request: FastifyRequest, name: string) => {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
};
const requestMetadata = (request: FastifyRequest) => {
  try {
    return Metadata.parse(fastifyHeader(request, 'upload-metadata') ?? undefined);
  } catch {
    throw { status_code: 400, body: 'UPLOAD_METADATA_INVALID' };
  }
};
const metadataMatches = (expected: Record<string, string | null> | undefined, actual: Upload['metadata']) => {
  const left = expected ?? {};
  const right = actual ?? {};
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
};
const deny = (status_code: number, body: string) => ({ status_code, body });

/**
 * 将真实 tus server 挂到 Fastify；该隔离适配器只负责 tus 临时字节与 offset。
 * 业务 session、Asset 和 manifest 绑定由后续业务层负责。
 */
export const createTusFastifyApp = (input: {
  directory: string;
  maxSizeBytes: number;
  authority: TusUploadSessionAuthority;
}): TusFastifyApp => {
  const tus = new TusServer({
    path: '/tus',
    maxSize: input.maxSizeBytes,
    relativeLocation: true,
    datastore: new FileStore({ directory: input.directory }),
    namingFunction: async (request) => {
      const session = await input.authority.resolveCreate({ accessToken: accessToken(request) });
      if (!session) throw deny(404, 'UPLOAD_NOT_FOUND');
      return safeStorageUploadId(session.storageUploadId);
    },
    onUploadCreate: async (request, upload) => {
      const session = await input.authority.resolveCreate({ accessToken: accessToken(request) });
      if (!session || session.storageUploadId !== upload.id || session.uploadLength !== upload.size
        || !metadataMatches(session.metadata, upload.metadata)) {
        throw deny(409, 'UPLOAD_INTENT_CONFLICT');
      }
      return {};
    },
    onIncomingRequest: async (request, uploadId) => {
      const session = await input.authority.findByStorageUploadId(uploadId);
      if (!session || !await input.authority.authorize({ accessToken: accessToken(request), session })) {
        throw deny(404, 'UPLOAD_NOT_FOUND');
      }
    },
  });
  const app = Fastify({ logger: false });
  app.addContentTypeParser('application/offset+octet-stream', (_request, _payload, done) => done(null));

  const handle = (request: FastifyRequest, reply: FastifyReply) => {
    reply.hijack();
    return tus.handle(request.raw, reply.raw);
  };
  const create = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await input.authority.resolveCreate({ accessToken: fastifyHeader(request, sessionTokenHeader) });
    if (!session) return reply.code(404).header('Tus-Resumable', '1.0.0').send('UPLOAD_NOT_FOUND');
    const length = Number(fastifyHeader(request, 'upload-length'));
    const metadata = requestMetadata(request);
    if (!Number.isSafeInteger(length) || length !== session.uploadLength || !metadataMatches(session.metadata, metadata)) {
      return reply.code(409).header('Tus-Resumable', '1.0.0').send('UPLOAD_INTENT_CONFLICT');
    }
    const storageUploadId = safeStorageUploadId(session.storageUploadId);
    const existing = await tus.datastore.getUpload(storageUploadId).catch(() => undefined);
    if (existing) {
      return reply.code(201)
        .header('Tus-Resumable', '1.0.0')
        .header('Location', `/tus/${storageUploadId}`)
        .send();
    }
    return handle(request, reply);
  };
  app.all('/tus', (request, reply) => request.method === 'POST' ? create(request, reply) : handle(request, reply));
  app.all('/tus/*', handle);
  return { app, tus };
};
