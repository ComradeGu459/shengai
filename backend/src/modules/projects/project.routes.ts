import {
  ApiErrorSchema,
  CreateProjectBodySchema,
  LifecycleStatusSchema,
  ListProjectsQuerySchema,
  ProjectListSchema,
  ProjectSchema,
  WorkflowStatusSchema,
} from '@qimao-terms-cloud/contracts';
import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import { IdempotencyConflictError, ProjectRepository } from './project.repository.js';

const IdempotencyHeadersSchema = Type.Object({
  'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }),
});
const ProjectParamsSchema = Type.Object({ projectId: Type.String({ format: 'uuid' }) });

export const projectRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const repository = new ProjectRepository(app.database);

  app.get('/api/projects/:projectId', {
    schema: {
      params: ProjectParamsSchema,
      response: { 200: ProjectSchema, 404: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const project = await repository.findById(request.params.projectId);
    if (!project) {
      return reply.code(404).send({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: '项目不存在或已被清理。',
          retryable: false,
          action: 'return_to_projects',
          requestId: request.id,
        },
      });
    }
    return project;
  });

  app.get(
    '/api/projects',
    {
      schema: {
        querystring: ListProjectsQuerySchema,
        response: {
          200: ProjectListSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request) => {
      const query = request.query;
      return repository.list({
        ...(query.search?.trim() ? { search: query.search.trim() } : {}),
        ...(query.workflowStatus ? { workflowStatus: query.workflowStatus } : {}),
        lifecycleStatus: query.lifecycleStatus ?? 'active',
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
      });
    },
  );

  app.post(
    '/api/projects',
    {
      schema: {
        headers: IdempotencyHeadersSchema,
        body: CreateProjectBodySchema,
        response: {
          200: ProjectSchema,
          201: ProjectSchema,
          400: ApiErrorSchema,
          409: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const name = request.body.name.trim();
      if (!name) {
        return reply.code(400).send({
          error: {
            code: 'PROJECT_NAME_REQUIRED',
            message: '请输入项目名称。',
            retryable: false,
            action: 'edit_project_name',
            requestId: request.id,
          },
        });
      }
      let result;
      try {
        result = await repository.create({
          name,
          idempotencyKey: request.headers['idempotency-key'],
          actor: 'local-user',
        });
      } catch (error) {
        if (error instanceof IdempotencyConflictError) {
          return reply.code(409).send({
            error: {
              code: 'IDEMPOTENCY_KEY_REUSED',
              message: error.message,
              retryable: false,
              action: 'retry_with_new_idempotency_key',
              requestId: request.id,
            },
          });
        }
        throw error;
      }
      reply.header('location', `/api/projects/${result.project.id}`);
      return reply.code(result.created ? 201 : 200).send(result.project);
    },
  );
};

void WorkflowStatusSchema;
void LifecycleStatusSchema;
