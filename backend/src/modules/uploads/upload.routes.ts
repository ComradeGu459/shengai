import { createHash, randomUUID } from 'node:crypto';

import {
  AbortUploadBodySchema,
  ApiErrorSchema,
  AuthorizeUploadPartBodySchema,
  CompleteUploadBodySchema,
  ConfirmUploadPartBodySchema,
  CreateUploadBodySchema,
  UploadApiErrorSchema,
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
} from './upload.repository.js';
import { InMemoryStorageFake } from './in-memory-storage.fake.js';
import {
  StorageAuthorizationExpiredError,
  StorageAuthorizationInvalidError,
  StorageTemporaryError,
} from './upload-storage.js';

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

const validFileName = (fileName: string, mediaKind: 'srt' | 'video') => {
  if (fileName.includes('/') || fileName.includes('\\') || fileName === '.' || fileName === '..') return false;
  return fileName.toLowerCase().endsWith(mediaKind === 'srt' ? '.srt' : '.mp4');
};

const activeUploadStatus = (status: UploadSession['status']) =>
  status === 'created' || status === 'uploading' || status === 'failed';

export const uploadRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const projects = new ProjectRepository(app.database);
  const uploads = new UploadRepository(app.database);
  const localStorage = app.uploadStorage instanceof InMemoryStorageFake ? app.uploadStorage : null;

  app.get('/api/projects/:projectId/uploads', {
    schema: {
      params: ProjectParamsSchema,
      response: { 200: UploadSessionListSchema, 404: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const project = await projects.findById(request.params.projectId);
    if (!project) return sendError(reply, request.id, 404, 'PROJECT_NOT_FOUND', '项目不存在。', false, 'return_to_projects');
    return { items: await uploads.listByProject(project.id) };
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
      originalFileName: request.body.originalFileName.trim(),
      fileFingerprint: request.body.fileFingerprint.trim(),
      checksumValue: request.body.checksumValue.toLowerCase(),
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
    const hash = requestHash({ projectId: project.id, ...body });
    const objectKey = `projects/${project.id}/assets/${randomUUID()}-${body.mediaKind === 'srt' ? 'subtitle.srt' : 'video.mp4'}`;
    let storageUploadId: string | null = null;
    try {
      storageUploadId = await app.uploadStorage.createMultipart(objectKey);
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
        checksumValue: body.checksumValue,
        expiresAt: new Date(Date.now() + app.uploadConfig.sessionTtlMs),
        ...(body.materialBinding ? { materialBinding: body.materialBinding } : {}),
      });
      if (!result.created) await app.uploadStorage.abortMultipart(storageUploadId);
      return reply.code(result.created ? 201 : 200).send(result.session);
    } catch (error) {
      if (storageUploadId) await app.uploadStorage.abortMultipart(storageUploadId).catch(() => undefined);
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
        return sendError(reply, request.id, 503, 'STORAGE_TEMPORARY_FAILURE', error.message, true, 'retry');
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
      return reply.send(expired);
    }
    return session;
  });

  app.post('/api/uploads/:uploadId/parts/authorize', {
    schema: { params: UploadParamsSchema,
      body: AuthorizeUploadPartBodySchema,
      response: { 200: UploadPartAuthorizationSchema, 404: ApiErrorSchema, 409: UploadApiErrorSchema,
        410: UploadApiErrorSchema, 503: UploadApiErrorSchema } },
  }, async (request, reply) => {
    const session = await uploads.findById(request.params.uploadId);
    if (!session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
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
      const authorization = await app.uploadStorage.authorizePart({
        storageUploadId: session.storageUploadId,
        objectKey: session.objectKey,
        partNumber: request.body.partNumber,
        expiresAt,
      });
      return { uploadId: session.id, objectKey: session.objectKey, partNumber: request.body.partNumber,
        authorizationToken: authorization.authorizationToken, expiresAt: authorization.expiresAt.toISOString(),
        uploadRequest: localStorage
          ? {
              url: `/api/local/uploads/${session.id}/parts/${request.body.partNumber}`,
              method: 'PUT' as const,
              headers: {
                authorization: `Bearer ${authorization.authorizationToken}`,
                'content-type': 'application/octet-stream',
              },
            }
          : null };
    } catch (error) {
      if (error instanceof StorageTemporaryError) {
        return sendError(reply, request.id, 503, 'STORAGE_TEMPORARY_FAILURE', error.message, true, 'retry_authorization');
      }
      throw error;
    }
  });

  if (process.env.NODE_ENV !== 'production' && localStorage) {
    app.put('/api/local/uploads/:uploadId/parts/:partNumber', {
      bodyLimit: app.uploadConfig.partSizeBytes,
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
        return await localStorage.uploadAuthorizedPart(token, body, {
          storageUploadId: session.storageUploadId,
          objectKey: session.objectKey,
          partNumber,
        });
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
      if (replay) return reply.send(replay);
    } catch (error) {
      if (error instanceof UploadIdempotencyConflictError) {
        return sendError(reply, request.id, 409, 'IDEMPOTENCY_KEY_REUSED', error.message, false, 'retry_with_new_idempotency_key');
      }
      throw error;
    }
    const session = await uploads.findById(request.params.uploadId);
    if (!session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
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
      return reply.send(updated);
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
      response: { 200: UploadSessionSchema, 404: ApiErrorSchema, 409: UploadApiErrorSchema,
        503: UploadApiErrorSchema } },
  }, async (request, reply) => {
    const hash = requestHash({ uploadId: request.params.uploadId, ...request.body });
    try {
      const prepared = await uploads.prepareCompletion({ uploadId: request.params.uploadId,
        idempotencyKey: request.headers['idempotency-key'], requestHash: hash,
        expectedVersion: request.body.expectedVersion });
      if (!prepared.session) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
      if (prepared.replay) return reply.send(prepared.session);
      if (prepared.missing) {
        return sendError(reply, request.id, 409, 'UPLOAD_PARTS_MISSING', '仍有分片尚未确认。', false,
          'upload_missing_parts', prepared.session.missingPartNumbers);
      }
      const session = prepared.session;
      if (!activeUploadStatus(session.status) && session.status !== 'completing') {
        return sendError(reply, request.id, 409, 'UPLOAD_STATE_INVALID', '当前上传状态不能完成。', false, 'reload_upload');
      }
      let object = prepared.recovery
        ? await app.uploadStorage.headObject(session.objectKey)
        : null;
      if (!object && prepared.recovery && session.errorCode === 'STORAGE_OBJECT_NOT_FOUND') {
        return sendError(reply, request.id, 409, 'STORAGE_OBJECT_NOT_FOUND', '存储合并后未找到对象。', false, 'restart_upload');
      }
      if (!object) {
        await app.uploadStorage.completeMultipart({
          storageUploadId: session.storageUploadId,
          objectKey: session.objectKey,
          parts: session.confirmedParts,
        });
        object = await app.uploadStorage.headObject(session.objectKey);
      }
      if (!object) {
        await uploads.fail(session.id, 'STORAGE_OBJECT_NOT_FOUND', '合并后未找到对象。');
        return sendError(reply, request.id, 409, 'STORAGE_OBJECT_NOT_FOUND', '存储合并后未找到对象。', false, 'restart_upload');
      }
      if (object.sizeBytes !== session.sizeBytes) {
        await uploads.fail(session.id, 'UPLOAD_SIZE_MISMATCH', '对象总大小不一致。');
        return sendError(reply, request.id, 409, 'UPLOAD_SIZE_MISMATCH', '对象总大小与声明不一致。', false, 'restart_upload');
      }
      if (object.checksumValue !== session.checksumValue) {
        await uploads.fail(session.id, 'UPLOAD_CHECKSUM_MISMATCH', '对象校验值不一致。');
        return sendError(reply, request.id, 409, 'UPLOAD_CHECKSUM_MISMATCH', '对象校验失败。', false, 'restart_upload');
      }
      const completed = await uploads.complete({ uploadId: session.id,
        idempotencyKey: request.headers['idempotency-key'], requestHash: hash });
      if (!completed) return sendError(reply, request.id, 404, 'UPLOAD_NOT_FOUND', '上传会话不存在。', false, 'return_to_project');
      return reply.send(completed);
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
      const latest = await uploads.findById(request.params.uploadId);
      if (latest) {
        const project = await projects.findById(latest.projectId);
        if (!project || project.lifecycleStatus !== 'active') {
          return sendError(reply, request.id, 409, 'PROJECT_NOT_ACTIVE',
            '项目当前不可继续上传素材。', false, 'return_to_project');
        }
      }
      if (error instanceof StorageTemporaryError) {
        await uploads.fail(request.params.uploadId, 'STORAGE_TEMPORARY_FAILURE', error.message);
        return sendError(reply, request.id, 503, 'STORAGE_TEMPORARY_FAILURE', error.message, true, 'reload_and_retry');
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
      await app.uploadStorage.abortMultipart(prepared.session.storageUploadId);
      return reply.send(prepared.session);
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
