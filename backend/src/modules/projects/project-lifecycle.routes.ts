import { createHash } from 'node:crypto';

import {
  ApiErrorSchema,
  ProjectLifecycleCommandBodySchema,
  PurgeProjectCommandParamsSchema,
  PurgeProjectCommandResultSchema,
  RecycleProjectCommandResultSchema,
  RecycleBinListSchema,
  RecycleBinQuerySchema,
  RestoreProjectCommandResultSchema,
} from '@qimao-terms-cloud/contracts';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';

import {
  ProjectLifecycleIdempotencyConflictError,
  ProjectLifecycleNotFoundError,
  ProjectLifecycleRepository,
  ProjectLifecycleStateError,
  ProjectLifecycleVersionConflictError,
} from './project-lifecycle.repository.js';
import { ProjectLifecycleService } from './project-lifecycle.service.js';

const ProjectParamsSchema = Type.Object({ projectId: Type.String({ format: 'uuid' }) });
const IdempotencyHeadersSchema = Type.Object({
  'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }),
});

const requestHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const sendError = (
  reply: FastifyReply,
  requestId: string,
  statusCode: number,
  code: string,
  message: string,
  retryable: boolean,
  action: string,
) => reply.code(statusCode).send({ error: { code, message, retryable, action, requestId } });

export const projectLifecycleRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const repository = new ProjectLifecycleRepository(app.database);
  const service = new ProjectLifecycleService(repository, app.uploadStorage, app.lifecycleConfig);

  app.get('/api/recycle-bin', {
    schema: {
      querystring: RecycleBinQuerySchema,
      response: { 200: RecycleBinListSchema },
    },
  }, async (request) => repository.listRecycleBin({
    ...(request.query.search?.trim() ? { search: request.query.search.trim() } : {}),
    ...(request.query.lifecycleStatus ? { lifecycleStatus: request.query.lifecycleStatus } : {}),
    ...(request.query.cleanupJobStatus ? { cleanupJobStatus: request.query.cleanupJobStatus } : {}),
    ...(request.query.sortBy ? { sortBy: request.query.sortBy } : {}),
    ...(request.query.sortDirection ? { sortDirection: request.query.sortDirection } : {}),
    limit: request.query.limit ?? 50,
    offset: request.query.offset ?? 0,
  }));

  const handleLifecycleError = (error: unknown, requestId: string, reply: FastifyReply) => {
    if (error instanceof ProjectLifecycleNotFoundError) {
      return sendError(reply, requestId, 404, 'PROJECT_NOT_FOUND', error.message, false, 'return_to_projects');
    }
    if (error instanceof ProjectLifecycleIdempotencyConflictError) {
      return sendError(reply, requestId, 409, 'IDEMPOTENCY_KEY_REUSED', error.message, false, 'retry_with_new_idempotency_key');
    }
    if (error instanceof ProjectLifecycleVersionConflictError) {
      return sendError(reply, requestId, 409, 'PROJECT_VERSION_CONFLICT', error.message, false, 'reload_project');
    }
    if (error instanceof ProjectLifecycleStateError) {
      const action = error.code === 'PROJECT_RECYCLE_EXPIRED' || error.code === 'PROJECT_PURGING'
        ? 'reload_recycle_bin'
        : 'reload_project';
      return sendError(reply, requestId, 409, error.code, error.message, false, action);
    }
    throw error;
  };

  app.get('/api/projects/:projectId/purge/commands/:commandId', {
    schema: {
      params: PurgeProjectCommandParamsSchema,
      response: {
        200: PurgeProjectCommandResultSchema,
        404: ApiErrorSchema,
      },
    },
  }, async (request, reply) => {
    const project = await service.findPurgeCommand({
      projectId: request.params.projectId,
      idempotencyKey: request.params.commandId,
    });
    if (!project) {
      return sendError(reply, request.id, 404, 'PURGE_COMMAND_NOT_FOUND', '永久删除命令不存在。', false, 'reload_recycle_bin');
    }
    return reply.send({ project });
  });

  app.post('/api/projects/:projectId/recycle', {
    schema: {
      params: ProjectParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: ProjectLifecycleCommandBodySchema,
      response: {
        200: RecycleProjectCommandResultSchema,
        201: RecycleProjectCommandResultSchema,
        404: ApiErrorSchema,
        409: ApiErrorSchema,
      },
    },
  }, async (request, reply) => {
    try {
      const result = await service.recycle({
        projectId: request.params.projectId,
        expectedVersion: request.body.expectedVersion,
        idempotencyKey: request.headers['idempotency-key'],
        requestHash: requestHash({
          projectId: request.params.projectId,
          expectedVersion: request.body.expectedVersion,
        }),
        actor: request.employeePrincipal?.subject ?? 'local-user',
      });
      return reply.code(result.replay ? 200 : 201).send({
        project: result.project,
        terminatedUploadCount: result.terminatedUploadCount,
      });
    } catch (error) {
      return handleLifecycleError(error, request.id, reply);
    }
  });

  app.post('/api/projects/:projectId/restore', {
    schema: {
      params: ProjectParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: ProjectLifecycleCommandBodySchema,
      response: {
        200: RestoreProjectCommandResultSchema,
        404: ApiErrorSchema,
        409: ApiErrorSchema,
      },
    },
  }, async (request, reply) => {
    try {
      const result = await service.restore({
        projectId: request.params.projectId,
        expectedVersion: request.body.expectedVersion,
        idempotencyKey: request.headers['idempotency-key'],
        requestHash: requestHash({
          projectId: request.params.projectId,
          expectedVersion: request.body.expectedVersion,
        }),
        actor: request.employeePrincipal?.subject ?? 'local-user',
      });
      return reply.send({
        project: result.project,
      });
    } catch (error) {
      return handleLifecycleError(error, request.id, reply);
    }
  });

  app.post('/api/projects/:projectId/purge', {
    schema: {
      params: ProjectParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: ProjectLifecycleCommandBodySchema,
      response: {
        200: PurgeProjectCommandResultSchema,
        201: PurgeProjectCommandResultSchema,
        404: ApiErrorSchema,
        409: ApiErrorSchema,
      },
    },
  }, async (request, reply) => {
    try {
      const result = await service.purge({
        projectId: request.params.projectId,
        expectedVersion: request.body.expectedVersion,
        idempotencyKey: request.headers['idempotency-key'],
        requestHash: requestHash({
          projectId: request.params.projectId,
          expectedVersion: request.body.expectedVersion,
        }),
        actor: request.employeePrincipal?.subject ?? 'local-user',
      });
      return reply.code(result.replay ? 200 : 201).send({ project: result.project });
    } catch (error) {
      return handleLifecycleError(error, request.id, reply);
    }
  });
};
