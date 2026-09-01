import { createHash, randomUUID } from 'node:crypto';

import {
  AbortUploadBodySchema,
  ApiErrorSchema,
  AuthorizeUploadPartBodySchema,
  CompleteUploadBodySchema,
  ConfirmUploadPartBodySchema,
  CreateUploadBodySchema,
  UploadApiErrorSchema,
  UploadCreateCommandParamsSchema,
  UploadCreateCommandResultSchema,
  UploadDirectCapabilitySchema,
  UploadPartAuthorizationSchema,
  UploadedPartReceiptSchema,
  UploadSessionListSchema,
  UploadSessionSchema,
  type CreateUploadBody,
  type UploadSession,
} from '@qimao-terms-cloud/contracts';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';

import { UPLOAD_RELAY_BODY_LIMIT_BYTES } from '../../config.js';
import { ProjectRepository } from '../projects/project.repository.js';
import {
  UploadIdempotencyConflictError,
  UploadMaterialBindingError,
  UploadPartConflictError,
  UploadProjectInactiveError,
  UploadRepository,
  UploadSessionExpiredError,
  UploadStateConflictError,
  UploadVersionConflictError,
  type InternalUploadSession,
} from './upload.repository.js';
import {
  StorageAuthorizationExpiredError,
  StorageAuthorizationInvalidError,
  StorageTemporaryError,
} from './upload-storage.js';
import { isServerRelayUploadStorage } from './upload-storage.js';
import {
  getTusFileStore,
  canTusProjectAccess,
  isTusEmployeePrincipal,
  promoteTusUpload,
  removeTusUpload,
  TusUploadChecksumMismatchError,
  TusUploadNotCompleteError,
  TusUploadPromotionError,
} from './tus/tus-business.routes.js';
import { UPLOAD_DIRECT_CAPABILITY_METHODS, UPLOAD_DIRECT_CAPABILITY_TTL_SECONDS } from '../employee-auth/employee-auth.js';

const ProjectParamsSchema = Type.Object({ projectId: Type.String({ format: 'uuid' }) });
const UploadParamsSchema = Type.Object({ uploadId: Type.String({ format: 'uuid' }) });
const LocalPartParamsSchema = Type.Object({
  uploadId: Type.String({ format: 'uuid' }),
  partNumber: Type.String({ pattern: '^[1-9][0-9]{0,3}$|^10000$' }),
});
const LocalAuthorizationHeadersSchema = Type.Object({
  authorization: Type.String({ pattern: '^Bearer .+' }),
  'content-type': Type.Literal('application/octet-stream'),
});
const IdempotencyHeadersSchema = Type.Object({
  'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }),
});

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
const requestHash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');

const sendError = (
  reply: FastifyReply,
  requestId: string,
  statusCode: number,
  code: string,
  message: string,
  retryable: boolean,
  action: string,
  missingPartNumbers?: number[],
) => reply.code(statusCode).send({
  error: { code, message, retryable, action, requestId, ...(missingPartNumbers ? { missingPartNumbers } : {}) },
});

/** 创建 multipart 失败时只投影稳定分类；不把供应商原始错误正文带出存储边界。 */
export const projectCreateStorageFailure = (error: StorageTemporaryError) => {
  if (!error.code.startsWith('STORAGE_PROVIDER_')) {
    return { code: 'STORAGE_TEMPORARY_FAILURE', message: '对象存储暂时不可用，请稍后重试。', retryable: true, action: 'retry' };
  }
  const retryable = error.code === 'STORAGE_PROVIDER_UNAVAILABLE' || error.code === 'STORAGE_PROVIDER_RATE_LIMITED';
  return {
    code: error.code,
    message: retryable ? '对象存储暂时不可用，请稍后重试。' : '对象存储配置或请求未被接受，请联系管理员。',
    retryable,
    action: retryable ? 'retry' : 'contact_server_admin',
  };
};

export const createUploadStorageFailureLog = (
  requestId: string,
  projectId: string,
  projected: ReturnType<typeof projectCreateStorageFailure>,
) => projected.code.startsWith('STORAGE_PROVIDER_')
  ? {
      event: 'upload_create_storage_failure' as const,
      requestId,
      projectId,
      code: projected.code,
      retryable: projected.retryable,
    }
  : null;

const validFileName = (fileName: string, mediaKind: 'srt' | 'video') => {
  if (fileName.includes('/') || fileName.includes('\\') || fileName === '.' || fileName === '..') return false;
  return fileName.toLowerCase().endsWith(mediaKind === 'srt' ? '.srt' : '.mp4');
};

const activeUploadStatus = (status: UploadSession['status']) =>
  status === 'created' || status === 'uploading' || status === 'failed';

/** Multipart 的 provider upload id 只供服务端恢复，TUS 资源地址仍需返回给客户端。 */
const toPublicUploadSession = (session: InternalUploadSession, legacyTusEnabled = true): UploadSession => {
  if (session.transportKind === 'tus') {
    return legacyTusEnabled ? session : { ...session, tusEndpoint: null };
  }
  const { storageUploadId: _storageUploadId, ...publicSession } = session;
  return publicSession;
};

export const uploadRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const projects = new ProjectRepository(app.database);
  const uploads = new UploadRepository(app.database);
  const directStorage = isServerRelayUploadStorage(app.uploadStorage) ? app.uploadStorage : null;

  app.get('/api/projects/:projectId/uploads', {
    schema: {
      params: ProjectParamsSchema,
      response: { 200: UploadSessionListSchema, 404: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const project = await projects.findById(request.params.projectId);
    if (!project) return sendError(reply, request.id, 404, 'PROJECT_NOT_FOUND', '项目不存在。', false, 'return_to_projects');
    return { items: (await uploads.listByProject(project.id)).map((session) => toPublicUploadSession(session, app.legacyTusEnabled)) };
  });

  // create_upload 的未知结果只按同一稳定 Idempotency-Key 读取，禁止通过列表猜测。
  app.get('/api/projects/:projectId/uploads/commands/:commandId', {
    schema: {
      params: UploadCreateCommandParamsSchema,
      response: { 200: UploadCreateCommandResultSchema, 404: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const project = await projects.findById(request.params.projectId);
    if (!project) return sendError(reply, request.id, 404, 'PROJECT_NOT_FOUND', '项目不存在。', false, 'return_to_projects');
    const session = await uploads.findCreateCommand(project.id, request.params.commandId);
    if (!session) return sendError(reply, request.id, 404, 'UPLOAD_CREATE_COMMAND_NOT_FOUND', '上传创建命令不存在。', false, 'reload_upload_command');
    return reply.send({
      commandId: request.params.commandId,
      projectId: project.id,
      status: 'succeeded' as const,
      session: toPublicUploadSession(session, app.legacyTusEnabled),
    });
  });

  // 主站登录后为已经创建的 tus 会话签发短时直连能力；不创建新会话、不写第二状态源。
  app.post('/api/uploads/:uploadId/direct-capability', {
    schema: {
      params: UploadParamsSchema,
      response: { 200: UploadDirectCapabilitySchema, 401: UploadApiErrorSchema, 404: ApiErrorSchema,
        409: UploadApiErrorSchema, 503: UploadApiErrorSchema },
    },
  }, async (request, reply) => {
    const principal = request.employeePrincipal;
    if (!principal || !isTusEmployeePrincipal(principal)) {
      return sendError(reply, request.id, 401, 'EMPLOYEE_AUTH_REQUIRED', '请先登录员工工作台。', false, 'login_employee');
    }
    const session = await uploads.findById(request.params.uploadId);
    if (!session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
    if (session.transportKind !== 'tus') {
      return sendError(reply, request.id, 409, 'UPLOAD_TRANSPORT_MISMATCH', '该上传会话未使用 tus 传输。', false, 'use_tus_upload_endpoint');
    }
    if (!app.legacyTusEnabled) {
      return sendError(reply, request.id, 409, 'UPLOAD_TRANSPORT_DISABLED',
        '旧 TUS 传输入口已关闭，请显式放弃后重新上传。', false, 'abandon_and_restart_upload');
    }
    const project = await projects.findById(session.projectId);
    if (!project || project.lifecycleStatus !== 'active' || !canTusProjectAccess(principal, session.projectId)) {
      return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
    }
    if (!activeUploadStatus(session.status)) {
      return sendError(reply, request.id, 409, 'UPLOAD_STATE_INVALID', '当前上传状态不能签发直连能力。', false, 'reload_upload');
    }
    const sessionExpiresAt = new Date(session.expiresAt).getTime();
    if (!Number.isFinite(sessionExpiresAt) || sessionExpiresAt <= Date.now()) {
      return sendError(reply, request.id, 409, 'UPLOAD_SESSION_EXPIRED', '上传会话已过期，请重新创建。', false, 'restart_upload');
    }
    if (!session.storageUploadId || !/^[A-Za-z0-9_-]{1,255}$/.test(session.storageUploadId)) {
      return sendError(reply, request.id, 409, 'UPLOAD_STORAGE_ID_INVALID', '上传会话缺少可恢复的传输身份。', false, 'reload_upload');
    }
    if (!app.directUploadOrigin) {
      return sendError(reply, request.id, 503, 'UPLOAD_DIRECT_CAPABILITY_UNAVAILABLE', '直连上传入口尚未配置。', true, 'retry');
    }
    const service = app.employeeAuthService;
    if (!service) {
      return sendError(reply, request.id, 503, 'UPLOAD_DIRECT_CAPABILITY_UNAVAILABLE', '直连上传能力暂不可用。', true, 'retry');
    }
    const issued = service.issueUploadDirectCapability({
      subject: principal.subject,
      projectId: session.projectId,
      uploadSessionId: session.id,
      storageUploadId: session.storageUploadId,
      sizeBytes: session.sizeBytes,
      expiresAt: Math.min(sessionExpiresAt, Date.now() + UPLOAD_DIRECT_CAPABILITY_TTL_SECONDS * 1000),
    });
    return reply.send({
      token: issued.token,
      tusEndpoint: `${app.directUploadOrigin}/api/uploads/tus`,
      uploadSessionId: session.id,
      projectId: session.projectId,
      storageUploadId: session.storageUploadId,
      expectedSizeBytes: session.sizeBytes,
      allowedMethods: [...UPLOAD_DIRECT_CAPABILITY_METHODS],
      expiresAt: issued.expiresAt,
    });
  });

  app.post('/api/projects/:projectId/uploads', {
    schema: {
      params: ProjectParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: CreateUploadBodySchema,
      response: { 200: UploadSessionSchema, 201: UploadSessionSchema, 400: UploadApiErrorSchema,
        404: ApiErrorSchema, 409: UploadApiErrorSchema, 503: UploadApiErrorSchema },
    },
  }, async (request, reply) => {
    const project = await projects.findById(request.params.projectId);
    if (!project) return sendError(reply, request.id, 404, 'PROJECT_NOT_FOUND', '项目不存在。', false, 'return_to_projects');
    if (project.lifecycleStatus !== 'active') {
      return sendError(reply, request.id, 409, 'PROJECT_NOT_ACTIVE', '项目当前不可上传素材。', false, 'return_to_projects');
    }
    const body: CreateUploadBody = {
      ...request.body,
      transportKind: request.body.transportKind ?? 'multipart',
      originalFileName: request.body.originalFileName.trim(),
      fileFingerprint: request.body.fileFingerprint.trim(),
      ...(request.body.checksumValue ? { checksumValue: request.body.checksumValue.toLowerCase() } : {}),
      ...(request.body.materialBinding
        ? {
            materialBinding: {
              manifestId: request.body.materialBinding.manifestId,
              targets: [...request.body.materialBinding.targets].sort((left, right) =>
                left.episodeNumber - right.episodeNumber || left.role.localeCompare(right.role)),
            },
          }
        : {}),
    };
    if (body.transportKind === 'tus' && !app.legacyTusEnabled) {
      return sendError(reply, request.id, 409, 'UPLOAD_TRANSPORT_DISABLED',
        '新上传仅允许 multipart 对象存储传输。', false, 'use_multipart_upload');
    }
    if (!validFileName(body.originalFileName, body.mediaKind)) {
      return sendError(reply, request.id, 400, 'UPLOAD_FILE_TYPE_INVALID', '首期只允许 SRT 与 MP4 文件。', false, 'select_supported_file');
    }
    if (body.sizeBytes > app.uploadConfig.maxFileSizeBytes) {
      return sendError(reply, request.id, 400, 'UPLOAD_FILE_SIZE_INVALID', '文件大小超过当前集中配置上限。', false, 'select_smaller_file');
    }
    const totalParts = Math.ceil(body.sizeBytes / app.uploadConfig.partSizeBytes);
    if (totalParts > 10_000) {
      return sendError(reply, request.id, 400, 'UPLOAD_FILE_SIZE_INVALID', '文件需要的分片数超过协议上限。', false, 'select_smaller_file');
    }
    const contentType = body.mediaKind === 'srt' ? 'application/x-subrip' : 'video/mp4';
    const hash = requestHash({ projectId: project.id, ...body });
    const existingCommand = await uploads.findCreateCommandDetails(project.id, request.headers['idempotency-key']);
    if (existingCommand) {
      if (existingCommand.requestHash !== hash) {
        return sendError(reply, request.id, 409, 'IDEMPOTENCY_KEY_REUSED', '该幂等键已用于另一上传请求。', false, 'retry_with_new_idempotency_key');
      }
      return reply.code(200).send(toPublicUploadSession(existingCommand.session, app.legacyTusEnabled));
    }
    if (body.replaceUploadId) {
      const replacement = await uploads.findById(body.replaceUploadId);
      const store = getTusFileStore(app);
      if (!replacement || replacement.projectId !== project.id || body.transportKind !== 'multipart'
        || replacement.transportKind !== 'tus' || replacement.status !== 'created'
        || replacement.asset !== null || replacement.confirmedParts.length !== 0 || !store) {
        return sendError(reply, request.id, 409, 'UPLOAD_REPLACEMENT_UNSAFE',
          '旧上传会话不能证明为零进度的协议不兼容会话。', false, 'reload_material_uploads');
      }
      const tusUpload = await store.getUpload(replacement.storageUploadId).catch(() => null);
      if (tusUpload && (tusUpload.offset !== 0 || tusUpload.size !== replacement.sizeBytes)) {
        return sendError(reply, request.id, 409, 'UPLOAD_REPLACEMENT_UNSAFE',
          '旧上传会话已经接收字节，不能由新协议覆盖。', false, 'continue_or_abort_existing_upload');
      }
    }
    const objectKey = `projects/${project.id}/assets/${randomUUID()}-${body.mediaKind === 'srt' ? 'subtitle.srt' : 'video.mp4'}`;
    let storageUploadId: string | null = null;
    const usesMultipartStorage = (body.transportKind ?? 'multipart') === 'multipart';
    try {
      storageUploadId = usesMultipartStorage ? await app.uploadStorage.createMultipart(objectKey, { contentType }) : randomUUID();
      const result = await uploads.create({
        projectId: project.id,
        idempotencyKey: request.headers['idempotency-key'],
        requestHash: hash,
        objectKey,
        originalFileName: body.originalFileName,
        mediaKind: body.mediaKind,
        sizeBytes: body.sizeBytes,
        partSizeBytes: app.uploadConfig.partSizeBytes,
        totalParts,
        storageUploadId,
        fileFingerprint: body.fileFingerprint,
        checksumValue: body.checksumValue ?? null,
        transportKind: body.transportKind ?? 'multipart',
        expiresAt: new Date(Date.now() + app.uploadConfig.sessionTtlMs),
        ...(body.replaceUploadId ? { replaceUploadId: body.replaceUploadId } : {}),
        ...(body.materialBinding ? { materialBinding: body.materialBinding } : {}),
      });
      if (!result.created && usesMultipartStorage) await app.uploadStorage.abortMultipart({ storageUploadId, objectKey });
      if (result.created && result.supersededTusStorageUploadId) {
        await removeTusUpload(app, result.supersededTusStorageUploadId).catch(() => undefined);
      }
      return reply.code(result.created ? 201 : 200).send(toPublicUploadSession(result.session, app.legacyTusEnabled));
    } catch (error) {
      if (storageUploadId && usesMultipartStorage) await app.uploadStorage.abortMultipart({ storageUploadId, objectKey }).catch(() => undefined);
      if (error instanceof UploadIdempotencyConflictError) {
        return sendError(reply, request.id, 409, 'IDEMPOTENCY_KEY_REUSED', error.message, false, 'retry_with_new_idempotency_key');
      }
      if (error instanceof UploadMaterialBindingError) {
        const action = error.code === 'MATERIAL_MANIFEST_VERSION_CONFLICT'
          ? 'reload_latest_manifest'
          : error.code === 'FILE_FINGERPRINT_MISMATCH'
            ? 'reselect_original_file'
            : 'reload_material_uploads';
        return sendError(reply, request.id, 409, error.code, error.message, false, action);
      }
      if (error instanceof UploadProjectInactiveError) {
        return sendError(reply, request.id, 409, 'PROJECT_NOT_ACTIVE', error.message, false, 'return_to_projects');
      }
      if (error instanceof StorageTemporaryError) {
        const projected = projectCreateStorageFailure(error);
        const failureLog = createUploadStorageFailureLog(request.id, project.id, projected);
        if (failureLog) request.log.warn(failureLog);
        return sendError(reply, request.id, 503, projected.code, projected.message, projected.retryable, projected.action);
      }
      throw error;
    }
  });

  app.get('/api/uploads/:uploadId', {
    schema: { params: UploadParamsSchema, response: { 200: UploadSessionSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => {
    const session = await uploads.findById(request.params.uploadId);
    if (!session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
    if (new Date(session.expiresAt).getTime() <= Date.now() && activeUploadStatus(session.status)) {
      await uploads.expire(session.id);
      const expired = await uploads.findById(session.id);
      if (!expired) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
      return reply.send(toPublicUploadSession(expired, app.legacyTusEnabled));
    }
    return toPublicUploadSession(session, app.legacyTusEnabled);
  });

  app.post('/api/uploads/:uploadId/parts/authorize', {
    schema: { params: UploadParamsSchema,
      body: AuthorizeUploadPartBodySchema,
      response: { 200: UploadPartAuthorizationSchema, 404: ApiErrorSchema, 409: UploadApiErrorSchema,
        410: UploadApiErrorSchema, 503: UploadApiErrorSchema } },
  }, async (request, reply) => {
    const session = await uploads.findById(request.params.uploadId);
    if (!session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
    if (session.transportKind === 'tus') {
      return sendError(reply, request.id, 409,
        app.legacyTusEnabled ? 'UPLOAD_TRANSPORT_MISMATCH' : 'UPLOAD_TRANSPORT_DISABLED',
        app.legacyTusEnabled ? '该上传会话由 tus 传输接管。' : '旧 TUS 传输入口已关闭，请显式放弃后重新上传。',
        false, app.legacyTusEnabled ? 'use_tus_upload_endpoint' : 'abandon_and_restart_upload');
    }
    const project = await projects.findById(session.projectId);
    if (!project || project.lifecycleStatus !== 'active') {
      return sendError(reply, request.id, 409, 'PROJECT_NOT_ACTIVE', '项目当前不可继续上传素材。', false, 'return_to_project');
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await uploads.expire(session.id);
      return sendError(reply, request.id, 410, 'UPLOAD_SESSION_EXPIRED', '上传会话已过期，请重新创建。', false, 'restart_upload');
    }
    if (!activeUploadStatus(session.status)) {
      return sendError(reply, request.id, 409, 'UPLOAD_STATE_INVALID', '当前上传状态不能签发分片授权。', false, 'reload_upload');
    }
    if (session.fileFingerprint !== request.body.fileFingerprint) {
      return sendError(reply, request.id, 409, 'FILE_FINGERPRINT_MISMATCH', '重新选择的文件与原上传文件不一致。', false, 'reselect_original_file');
    }
    if (request.body.partNumber > session.totalParts) {
      return sendError(reply, request.id, 409, 'UPLOAD_PART_INVALID', '分片号不在当前会话范围内。', false, 'reload_upload');
    }
    if (session.confirmedParts.some((part) => part.partNumber === request.body.partNumber)) {
      return sendError(reply, request.id, 409, 'UPLOAD_PART_ALREADY_CONFIRMED', '该分片已经确认，无需重复上传。', false, 'upload_missing_parts');
    }
    try {
      const expiresAt = new Date(Date.now() + app.uploadConfig.authorizationTtlMs);
      const expectedSizeBytes = request.body.partNumber === session.totalParts
        ? session.sizeBytes - session.partSizeBytes * (session.totalParts - 1)
        : session.partSizeBytes;
      const contentType = session.mediaKind === 'srt' ? 'application/x-subrip' : 'video/mp4';
      const authorization = await app.uploadStorage.authorizePart({
        storageUploadId: session.storageUploadId,
        objectKey: session.objectKey,
        partNumber: request.body.partNumber,
        expiresAt,
        projectId: session.projectId,
        uploadSessionId: session.id,
        sizeBytes: expectedSizeBytes,
        contentType,
      });
      const uploadRequest = authorization.uploadRequest ?? (directStorage
        ? {
            url: `/api/local/uploads/${session.id}/parts/${request.body.partNumber}`,
            method: 'PUT' as const,
            headers: {
              authorization: `Bearer ${authorization.authorizationToken}`,
              'content-type': 'application/octet-stream',
            },
          }
        : null);
      const resolvedUploadRequest = uploadRequest && app.directUploadOrigin && uploadRequest.url.startsWith('/api/local/')
        ? { ...uploadRequest, url: `${app.directUploadOrigin}${uploadRequest.url}` }
        : uploadRequest;
      return { uploadId: session.id, objectKey: session.objectKey, partNumber: request.body.partNumber,
        authorizationToken: authorization.authorizationToken, expiresAt: authorization.expiresAt.toISOString(),
        uploadRequest: resolvedUploadRequest };
    } catch (error) {
      if (error instanceof StorageTemporaryError) {
        return sendError(reply, request.id, 503, 'STORAGE_TEMPORARY_FAILURE', error.message, true, 'retry_authorization');
      }
      throw error;
    }
  });

  if (directStorage) {
    app.put('/api/local/uploads/:uploadId/parts/:partNumber', {
      bodyLimit: UPLOAD_RELAY_BODY_LIMIT_BYTES,
      schema: {
        params: LocalPartParamsSchema,
        headers: LocalAuthorizationHeadersSchema,
        response: {
          200: UploadedPartReceiptSchema,
          400: UploadApiErrorSchema,
          404: ApiErrorSchema,
          409: UploadApiErrorSchema,
          410: UploadApiErrorSchema,
          503: UploadApiErrorSchema,
        },
      },
    }, async (request, reply) => {
      const session = await uploads.findById(request.params.uploadId);
      if (!session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
      if (session.transportKind === 'tus') return sendError(reply, request.id, 409, 'UPLOAD_TRANSPORT_MISMATCH', '该上传会话由 tus 传输接管。', false, 'use_tus_upload_endpoint');
      const partNumber = Number(request.params.partNumber);
      const project = await projects.findById(session.projectId);
      if (!project || project.lifecycleStatus !== 'active') {
        return sendError(reply, request.id, 409, 'PROJECT_NOT_ACTIVE', '项目当前不可继续上传素材。', false, 'return_to_project');
      }
      if (!activeUploadStatus(session.status)) {
        return sendError(reply, request.id, 409, 'UPLOAD_STATE_INVALID', '当前上传状态不能接收分片。', false, 'reload_upload');
      }
      if (partNumber > session.totalParts) {
        return sendError(reply, request.id, 409, 'UPLOAD_PART_INVALID', '分片号不在当前会话范围内。', false, 'reload_upload');
      }
      const body = request.body;
      if (!Buffer.isBuffer(body) || body.byteLength === 0) {
        return sendError(reply, request.id, 400, 'UPLOAD_PART_BODY_INVALID', '分片内容必须是非空二进制数据。', false, 'reupload_part');
      }
      const expectedSize = partNumber === session.totalParts
        ? session.sizeBytes - session.partSizeBytes * (session.totalParts - 1)
        : session.partSizeBytes;
      if (body.byteLength !== expectedSize) {
        return sendError(reply, request.id, 409, 'UPLOAD_PART_SIZE_MISMATCH', '分片大小与会话策略不一致。', false, 'reupload_part');
      }
      try {
        const token = request.headers.authorization.slice('Bearer '.length);
        const receipt = await directStorage.uploadAuthorizedPart(token, body, {
          storageUploadId: session.storageUploadId,
          objectKey: session.objectKey,
          partNumber,
          sizeBytes: body.byteLength,
          contentType: session.mediaKind === 'srt' ? 'application/x-subrip' : 'video/mp4',
        });
        reply.header('ETag', receipt.etag);
        return receipt;
      } catch (error) {
        if (error instanceof StorageAuthorizationExpiredError) {
          return sendError(reply, request.id, 410, 'UPLOAD_AUTHORIZATION_EXPIRED', error.message, false, 'renew_part_authorization');
        }
        if (error instanceof StorageAuthorizationInvalidError) {
          return sendError(reply, request.id, 409, 'UPLOAD_AUTHORIZATION_INVALID', error.message, false, 'renew_part_authorization');
        }
        if (error instanceof StorageTemporaryError) {
          return sendError(reply, request.id, 503, 'STORAGE_TEMPORARY_FAILURE', error.message, true, 'retry_part_upload');
        }
        throw error;
      }
    });
  }

  app.post('/api/uploads/:uploadId/parts/confirm', {
    schema: { params: UploadParamsSchema, headers: IdempotencyHeadersSchema,
      body: ConfirmUploadPartBodySchema,
      response: { 200: UploadSessionSchema, 404: ApiErrorSchema, 409: UploadApiErrorSchema,
        410: UploadApiErrorSchema, 503: UploadApiErrorSchema } },
  }, async (request, reply) => {
    const hash = requestHash({ uploadId: request.params.uploadId, ...request.body });
    try {
      const replay = await uploads.replayPartConfirmation({
        uploadId: request.params.uploadId,
        idempotencyKey: request.headers['idempotency-key'],
        requestHash: hash,
      });
      if (replay) return reply.send(toPublicUploadSession(replay, app.legacyTusEnabled));
    } catch (error) {
      if (error instanceof UploadIdempotencyConflictError) {
        return sendError(reply, request.id, 409, 'IDEMPOTENCY_KEY_REUSED', error.message, false, 'retry_with_new_idempotency_key');
      }
      throw error;
    }
    const session = await uploads.findById(request.params.uploadId);
    if (!session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
    if (session.transportKind === 'tus') return sendError(reply, request.id, 409, 'UPLOAD_TRANSPORT_MISMATCH', '该上传会话由 tus 传输接管。', false, 'use_tus_upload_endpoint');
    const project = await projects.findById(session.projectId);
    if (!project || project.lifecycleStatus !== 'active') {
      return sendError(reply, request.id, 409, 'PROJECT_NOT_ACTIVE', '项目当前不可继续上传素材。', false, 'return_to_project');
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await uploads.expire(session.id);
      return sendError(reply, request.id, 410, 'UPLOAD_SESSION_EXPIRED', '上传会话已过期，请重新创建。', false, 'restart_upload');
    }
    if (!activeUploadStatus(session.status) || request.body.partNumber > session.totalParts) {
      return sendError(reply, request.id, 409, 'UPLOAD_STATE_INVALID', '当前上传状态或分片号不能确认。', false, 'reload_upload');
    }
    const expectedSize = request.body.partNumber === session.totalParts
      ? session.sizeBytes - session.partSizeBytes * (session.totalParts - 1)
      : session.partSizeBytes;
    if (request.body.sizeBytes !== expectedSize) {
      return sendError(reply, request.id, 409, 'UPLOAD_PART_SIZE_MISMATCH', '分片大小与会话策略不一致。', false, 'reupload_part');
    }
    try {
      const stored = await app.uploadStorage.getUploadedPart({
        storageUploadId: session.storageUploadId,
        partNumber: request.body.partNumber,
        etag: request.body.etag,
        objectKey: session.objectKey,
        checksumValue: request.body.checksumValue,
      });
      if (!stored || stored.sizeBytes !== request.body.sizeBytes || stored.checksumValue !== request.body.checksumValue) {
        return sendError(reply, request.id, 409, 'UPLOAD_PART_STORAGE_MISMATCH', '存储中的分片信息与确认请求不一致。', false, 'reupload_part');
      }
      const updated = await uploads.confirmPart({
        uploadId: session.id,
        idempotencyKey: request.headers['idempotency-key'],
        requestHash: hash,
        part: request.body,
      });
      if (!updated) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
      return reply.send(toPublicUploadSession(updated, app.legacyTusEnabled));
    } catch (error) {
      if (error instanceof UploadIdempotencyConflictError) {
        return sendError(reply, request.id, 409, 'IDEMPOTENCY_KEY_REUSED', error.message, false, 'retry_with_new_idempotency_key');
      }
      if (error instanceof UploadPartConflictError) {
        return sendError(reply, request.id, 409, 'UPLOAD_PART_CONFIRM_CONFLICT', error.message, false, 'reload_upload');
      }
      if (error instanceof UploadProjectInactiveError) {
        return sendError(reply, request.id, 409, 'PROJECT_NOT_ACTIVE', error.message, false, 'return_to_project');
      }
      if (error instanceof UploadSessionExpiredError) {
        await uploads.expire(request.params.uploadId);
        return sendError(reply, request.id, 410, 'UPLOAD_SESSION_EXPIRED', error.message, false, 'restart_upload');
      }
      if (error instanceof UploadStateConflictError) {
        return sendError(reply, request.id, 409, 'UPLOAD_STATE_INVALID', error.message, false, 'reload_upload');
      }
      if (error instanceof StorageTemporaryError) {
        return sendError(reply, request.id, 503, 'STORAGE_TEMPORARY_FAILURE', error.message, true, 'retry_part_confirmation');
      }
      throw error;
    }
  });

  app.post('/api/uploads/:uploadId/complete', {
    schema: { params: UploadParamsSchema, headers: IdempotencyHeadersSchema, body: CompleteUploadBodySchema,
      response: { 200: UploadSessionSchema, 202: UploadSessionSchema, 404: ApiErrorSchema, 409: UploadApiErrorSchema } },
  }, async (request, reply) => {
    const hash = requestHash({ uploadId: request.params.uploadId, ...request.body });
    try {
      // TUS 仍保留原有完成兼容链；本任务的异步 job 只接管 multipart。
      const requestedSession = await uploads.findById(request.params.uploadId);
      if (requestedSession?.transportKind === 'tus') {
        const principal = request.employeePrincipal;
        if (!principal || !isTusEmployeePrincipal(principal)
          || !canTusProjectAccess(principal, requestedSession.projectId)) {
          return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
        }
        if (requestedSession.status === 'completed') return reply.code(200).send(requestedSession);
        const project = await projects.findById(requestedSession.projectId);
        if (!project || project.lifecycleStatus !== 'active') {
          return sendError(reply, request.id, 409, 'PROJECT_NOT_ACTIVE', '项目当前不可继续上传素材。', false, 'return_to_project');
        }
        let object: { sizeBytes: number; checksumValue: string };
        try {
          object = await promoteTusUpload({
            app,
            storage: app.uploadStorage,
            storageUploadId: requestedSession.storageUploadId,
            objectKey: requestedSession.objectKey,
            expectedSizeBytes: requestedSession.sizeBytes,
            uploadSessionId: requestedSession.id,
            expectedChecksumValue: requestedSession.checksumValue,
          });
        } catch (error) {
          if (error instanceof TusUploadNotCompleteError) {
            return sendError(reply, request.id, 409, 'UPLOAD_TUS_NOT_COMPLETE', error.message, false, 'continue_upload');
          }
          if (error instanceof TusUploadChecksumMismatchError) {
            return sendError(reply, request.id, 409, 'UPLOAD_CHECKSUM_MISMATCH', error.message, false, 'restart_upload');
          }
          if (error instanceof TusUploadPromotionError) {
            return sendError(reply, request.id, 503, 'STORAGE_TEMPORARY_FAILURE', error.message, true, 'retry_complete');
          }
          throw error;
        }
        const preparedTus = await uploads.prepareTusCompletion({
          uploadId: requestedSession.id,
          idempotencyKey: request.headers['idempotency-key'],
          requestHash: hash,
          expectedVersion: request.body.expectedVersion,
        });
        if (!preparedTus.session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
        if (preparedTus.replay) return reply.code(200).send(preparedTus.session);
        try {
          const completedTus = await uploads.complete({
            uploadId: requestedSession.id,
            idempotencyKey: request.headers['idempotency-key'],
            requestHash: hash,
            checksumValue: object.checksumValue,
          });
          if (!completedTus) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
          await removeTusUpload(app, requestedSession.storageUploadId);
          return reply.code(200).send(completedTus);
        } catch (error) {
          await uploads.fail(requestedSession.id, 'UPLOAD_COMPLETION_FAILED', error instanceof Error ? error.message : 'tus 完成落账失败。');
          throw error;
        }
      }
      const prepared = await uploads.prepareCompletion({ uploadId: request.params.uploadId,
        idempotencyKey: request.headers['idempotency-key'], requestHash: hash,
        expectedVersion: request.body.expectedVersion });
      if (!prepared.session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
      if (prepared.replay) return reply.code(200).send(toPublicUploadSession(prepared.session, app.legacyTusEnabled));
      if (prepared.missing) {
        return sendError(reply, request.id, 409, 'UPLOAD_PARTS_MISSING', '仍有分片尚未确认。', false,
          'upload_missing_parts', prepared.session.missingPartNumbers);
      }
      return reply.code(202).send(toPublicUploadSession(prepared.session, app.legacyTusEnabled));
    } catch (error) {
      if (error instanceof UploadIdempotencyConflictError) {
        return sendError(reply, request.id, 409, 'IDEMPOTENCY_KEY_REUSED', error.message, false, 'retry_with_new_idempotency_key');
      }
      if (error instanceof UploadVersionConflictError) {
        return sendError(reply, request.id, 409, 'UPLOAD_VERSION_CONFLICT', error.message, false, 'reload_upload');
      }
      if (error instanceof UploadStateConflictError) {
        return sendError(reply, request.id, 409, 'UPLOAD_STATE_INVALID', error.message, false, 'reload_upload');
      }
      if (error instanceof UploadProjectInactiveError) {
        return sendError(reply, request.id, 409, 'PROJECT_NOT_ACTIVE', error.message, false, 'return_to_project');
      }
      throw error;
    }
  });

  app.post('/api/uploads/:uploadId/abort', {
    schema: { params: UploadParamsSchema, headers: IdempotencyHeadersSchema, body: AbortUploadBodySchema,
      response: { 200: UploadSessionSchema, 404: ApiErrorSchema, 409: UploadApiErrorSchema,
        503: UploadApiErrorSchema } },
  }, async (request, reply) => {
    const hash = requestHash({ uploadId: request.params.uploadId, ...request.body });
    try {
      const prepared = await uploads.prepareAbort({ uploadId: request.params.uploadId,
        idempotencyKey: request.headers['idempotency-key'], requestHash: hash,
        expectedVersion: request.body.expectedVersion });
      if (!prepared.session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
      if (prepared.session.transportKind === 'tus') {
        try {
          await removeTusUpload(app, prepared.session.storageUploadId);
        } catch {
          return sendError(reply, request.id, 503, 'STORAGE_TEMPORARY_FAILURE',
            '临时上传数据清理失败。', true, 'retry_abort');
        }
        return reply.send(toPublicUploadSession(prepared.session, app.legacyTusEnabled));
      }
      await app.uploadStorage.abortMultipart({ storageUploadId: prepared.session.storageUploadId, objectKey: prepared.session.objectKey });
      return reply.send(toPublicUploadSession(prepared.session, app.legacyTusEnabled));
    } catch (error) {
      if (error instanceof UploadIdempotencyConflictError) {
        return sendError(reply, request.id, 409, 'IDEMPOTENCY_KEY_REUSED', error.message, false, 'retry_with_new_idempotency_key');
      }
      if (error instanceof UploadVersionConflictError) {
        return sendError(reply, request.id, 409, 'UPLOAD_VERSION_CONFLICT', error.message, false, 'reload_upload');
      }
      if (error instanceof UploadStateConflictError) {
        return sendError(reply, request.id, 409, 'UPLOAD_STATE_INVALID', error.message, false, 'reload_upload');
      }
      if (error instanceof StorageTemporaryError) {
        return sendError(reply, request.id, 503, 'STORAGE_TEMPORARY_FAILURE', error.message, true, 'retry_abort');
      }
      throw error;
    }
  });
};
