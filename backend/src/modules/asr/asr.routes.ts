import {
  ApiErrorSchema,
  AsrBatchDetailSchema,
  AsrBatchHotwordEvidenceSchema,
  AsrBatchListQuerySchema,
  AsrBatchListSchema,
  AsrBatchPreparationQuerySchema,
  AsrBatchPreparationSchema,
  AsrDispatchGroupDetailSchema,
  AsrDispatchGroupListQuerySchema,
  AsrDispatchGroupListSchema,
  AsrEligibilityBodySchema,
  AsrEligibilityListSchema,
  AsrProjectEligibilitySearchQuerySchema,
  AsrProjectEligibilitySearchResultSchema,
  AsrHotwordPreviewQuerySchema,
  AsrHotwordPreviewSchema,
  CancelAsrBatchBodySchema,
  CancelAsrDispatchGroupBodySchema,
  CreateAsrBatchBodySchema,
  CreateAsrDispatchGroupBodySchema,
  RetryAsrBatchBodySchema,
} from '@qimao-terms-cloud/contracts';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';

import { AsrCommandRepository } from './asr-command.repository.js';
import { AsrDispatchRepository } from './asr-dispatch.repository.js';
import { AsrEligibilityRepository } from './asr-eligibility.repository.js';
import { AsrDomainError } from './asr-errors.js';
import { AsrReadRepository } from './asr-read.repository.js';
import { AsrService } from './asr.service.js';

const ProjectParamsSchema = Type.Object({ projectId: Type.String({ format: 'uuid' }) });
const BatchParamsSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  batchId: Type.String({ format: 'uuid' }),
});
const DispatchGroupParamsSchema = Type.Object({ groupId: Type.String({ format: 'uuid' }) });
const IdempotencyHeadersSchema = Type.Object({
  'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }),
});

const sendAsrError = (reply: FastifyReply, requestId: string, error: AsrDomainError) =>
  reply.code(error.statusCode).send({
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      action: error.action,
      requestId,
    },
  });

export const asrRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const commands = new AsrCommandRepository(app.database, app.asrAdapterRegistry.defaultDescriptor);
  const reads = new AsrReadRepository(app.database, app.asrAdapterRegistry.defaultDescriptor);
  const eligibility = new AsrEligibilityRepository(
    app.database,
    app.asrAdapterRegistry.defaultDescriptor,
  );
  const service = new AsrService(
    commands,
    reads,
    eligibility,
    new AsrDispatchRepository(app.database, eligibility, commands),
    process.env.NODE_ENV !== 'production',
  );
  const handle = async <T>(reply: FastifyReply, requestId: string, operation: () => Promise<T>) => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AsrDomainError) return sendAsrError(reply, requestId, error);
      throw error;
    }
  };

  app.post('/api/asr/eligibility', {
    schema: {
      body: AsrEligibilityBodySchema,
      response: { 200: AsrEligibilityListSchema },
    },
  }, async (request) => service.evaluateEligibility(request.body));

  app.get('/api/asr/eligibility', {
    schema: {
      querystring: AsrProjectEligibilitySearchQuerySchema,
      response: { 200: AsrProjectEligibilitySearchResultSchema },
    },
  }, async (request) => service.searchEligibility(request.query));

  app.post('/api/asr/dispatch-groups', {
    schema: {
      headers: IdempotencyHeadersSchema,
      body: CreateAsrDispatchGroupBodySchema,
      response: {
        200: AsrDispatchGroupDetailSchema,
        201: AsrDispatchGroupDetailSchema,
        409: ApiErrorSchema,
        503: ApiErrorSchema,
      },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.createDispatchGroup(
      request.body,
      request.headers['idempotency-key'],
      request.id,
    );
    return reply.code(result.replay ? 200 : 201).send(result.group);
  }));

  app.get('/api/asr/dispatch-groups', {
    schema: {
      querystring: AsrDispatchGroupListQuerySchema,
      response: { 200: AsrDispatchGroupListSchema },
    },
  }, async (request) => service.listDispatchGroups(request.query));

  app.get('/api/asr/dispatch-groups/:groupId', {
    schema: {
      params: DispatchGroupParamsSchema,
      response: { 200: AsrDispatchGroupDetailSchema, 404: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.getDispatchGroup(
    request.params.groupId,
  )));

  app.post('/api/asr/dispatch-groups/:groupId/cancel', {
    schema: {
      params: DispatchGroupParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: CancelAsrDispatchGroupBodySchema,
      response: {
        200: AsrDispatchGroupDetailSchema,
        404: ApiErrorSchema,
        409: ApiErrorSchema,
      },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.cancelDispatchGroup(
      request.params.groupId,
      request.headers['idempotency-key'],
    );
    return reply.code(200).send(result.group);
  }));

  app.get('/api/projects/:projectId/asr/hotwords/preview', {
    schema: {
      params: ProjectParamsSchema,
      querystring: AsrHotwordPreviewQuerySchema,
      response: { 200: AsrHotwordPreviewSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.previewHotwords(
    request.params.projectId,
    request.query.termVersionId,
  )));

  app.get('/api/projects/:projectId/asr/batch-preparation', {
    schema: {
      params: ProjectParamsSchema,
      querystring: AsrBatchPreparationQuerySchema,
      response: {
        200: AsrBatchPreparationSchema,
        404: ApiErrorSchema,
        409: ApiErrorSchema,
        422: ApiErrorSchema,
      },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.prepareBatch(
    request.params.projectId,
    request.query,
  )));

  app.post('/api/projects/:projectId/asr/batches', {
    schema: {
      params: ProjectParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: CreateAsrBatchBodySchema,
      response: {
        200: AsrBatchDetailSchema,
        201: AsrBatchDetailSchema,
        404: ApiErrorSchema,
        409: ApiErrorSchema,
        422: ApiErrorSchema,
        503: ApiErrorSchema,
      },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.create(
      request.params.projectId,
      request.body,
      request.headers['idempotency-key'],
    );
    return reply.code(result.replay ? 200 : 201).send(result.batch);
  }));

  app.get('/api/projects/:projectId/asr/batches', {
    schema: {
      params: ProjectParamsSchema,
      querystring: AsrBatchListQuerySchema,
      response: { 200: AsrBatchListSchema },
    },
  }, async (request) => service.list(request.params.projectId, request.query));

  app.get('/api/projects/:projectId/asr/batches/:batchId', {
    schema: {
      params: BatchParamsSchema,
      response: { 200: AsrBatchDetailSchema, 404: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.get(
    request.params.projectId,
    request.params.batchId,
  )));

  app.get('/api/projects/:projectId/asr/batches/:batchId/hotwords', {
    schema: {
      params: BatchParamsSchema,
      response: {
        200: AsrBatchHotwordEvidenceSchema,
        404: ApiErrorSchema,
        422: ApiErrorSchema,
      },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.batchHotwords(
    request.params.projectId,
    request.params.batchId,
  )));

  app.post('/api/projects/:projectId/asr/batches/:batchId/cancel', {
    schema: {
      params: BatchParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: CancelAsrBatchBodySchema,
      response: { 200: AsrBatchDetailSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.cancel(
      request.params.projectId,
      request.params.batchId,
      request.headers['idempotency-key'],
    );
    return reply.code(200).send(result.batch);
  }));

  app.post('/api/projects/:projectId/asr/batches/:batchId/retries', {
    schema: {
      params: BatchParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: RetryAsrBatchBodySchema,
      response: {
        200: AsrBatchDetailSchema,
        201: AsrBatchDetailSchema,
        404: ApiErrorSchema,
        409: ApiErrorSchema,
        503: ApiErrorSchema,
      },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.retry(
      request.params.projectId,
      request.params.batchId,
      request.body,
      request.headers['idempotency-key'],
    );
    return reply.code(result.replay ? 200 : 201).send(result.batch);
  }));
};
