import {
  ApiErrorSchema,
  TaskDetailSchema,
  TaskListQuerySchema,
  TaskListSchema,
} from '@qimao-terms-cloud/contracts';
import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { canReadTasks, visibleProjectIds } from './tasks.auth.js';
import { TaskNotFoundError } from './tasks.errors.js';
import { TasksRepository } from './tasks.repository.js';

const TaskParamsSchema = Type.Object({
  taskType: Type.String({ minLength: 1, maxLength: 80 }),
  resourceId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });

const forbidden = (reply: any, requestId: string) => reply.code(403).send({ error: {
  code: 'TASKS_FORBIDDEN',
  message: '当前员工身份无权读取任务中心。',
  retryable: false,
  action: 'use_employee_identity',
  requestId,
} });

const notFound = (reply: any, requestId: string) => reply.code(404).send({ error: {
  code: 'TASK_NOT_FOUND',
  message: '任务不存在或当前身份无权查看。',
  retryable: false,
  action: 'refresh_tasks',
  requestId,
} });

export const tasksRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const repository = new TasksRepository(app.database);

  app.get('/api/tasks', {
    schema: {
      querystring: TaskListQuerySchema,
      response: { 200: TaskListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!principal || !canReadTasks(principal)) return forbidden(reply, request.id);
    return repository.list(request.query, visibleProjectIds(principal));
  });

  app.get('/api/tasks/:taskType/:resourceId', {
    schema: {
      params: TaskParamsSchema,
      response: { 200: TaskDetailSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!principal || !canReadTasks(principal)) return forbidden(reply, request.id);
    try {
      return await repository.get(request.params.taskType, request.params.resourceId, visibleProjectIds(principal));
    } catch (error) {
      if (error instanceof TaskNotFoundError) return notFound(reply, request.id);
      throw error;
    }
  });
};
