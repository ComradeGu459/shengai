import {
  ApiErrorSchema,
  ApplyPreEditPolicyBodySchema,
  ApplyPreEditPolicyResultSchema,
  CompletePreEditEpisodeBodySchema,
  CompletePreEditEpisodeResultSchema,
  CreatePreEditDecisionBodySchema,
  CreatePreEditPlaybackGrantBodySchema,
  CreatePreEditReleaseBodySchema,
  CreatePreEditSessionBodySchema,
  PreEditDecisionEventListSchema,
  PreEditItemCommandResultSchema,
  PreEditItemListSchema,
  PreEditItemQuerySchema,
  PreEditPlaybackGrantSchema,
  PreviewPreEditPolicyResultSchema,
  PreEditReleaseCommandResultSchema,
  PreEditReleaseListSchema,
  PreEditSessionCommandResultSchema,
  PreEditSessionDetailSchema,
  PreEditSessionListSchema,
  RetryPreEditPreparationBodySchema,
  UndoPreEditDecisionBodySchema,
} from '@qimao-terms-cloud/contracts';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import type { FastifyReply } from 'fastify';

import { PreReviewDomainError } from './pre-review.errors.js';
import { PreReviewReadRepository } from './pre-review.read.repository.js';
import { PreReviewService } from './pre-review.service.js';
import { PreReviewSourceService } from './pre-review.source.js';
import { PreReviewWriteRepository } from './pre-review.write.repository.js';

const ProjectParams = Type.Object({ projectId: Type.String({ format: 'uuid' }) });
const SessionParams = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  sessionId: Type.String({ format: 'uuid' }),
});
const ItemParams = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  sessionId: Type.String({ format: 'uuid' }),
  itemId: Type.String({ format: 'uuid' }),
});
const EpisodeParams = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  sessionId: Type.String({ format: 'uuid' }),
  episodeNumber: Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
});
const ReleaseEpisodeParams = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  releaseId: Type.String({ format: 'uuid' }),
  episodeNumber: Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
});
const PlaybackParams = Type.Object({ token: Type.String({ minLength: 20, maxLength: 200 }) });
const IdempotencyHeaders = Type.Object({
  'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }),
});

const sendError = (reply: FastifyReply, requestId: string, error: PreReviewDomainError) =>
  reply.code(error.statusCode).send({
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      action: error.action,
      requestId,
    },
  });

export const preReviewRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const reads = new PreReviewReadRepository(app.database);
  const writes = new PreReviewWriteRepository(app.database, app.uploadStorage);
  const service = new PreReviewService(
    new PreReviewSourceService(app.database, app.uploadStorage),
    reads,
    writes,
  );
  const handle = async <T>(reply: FastifyReply, requestId: string, operation: () => Promise<T>) => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof PreReviewDomainError) return sendError(reply, requestId, error);
      app.log.error({ err: error, requestId }, 'pre-review request failed');
      throw error;
    }
  };

  app.post('/api/projects/:projectId/pre-review/sessions', {
    schema: {
      params: ProjectParams,
      headers: IdempotencyHeaders,
      body: CreatePreEditSessionBodySchema,
      response: {
        200: PreEditSessionCommandResultSchema,
        201: PreEditSessionCommandResultSchema,
        404: ApiErrorSchema,
        409: ApiErrorSchema,
        422: ApiErrorSchema,
      },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.createSession(
      request.params.projectId,
      request.body,
      request.headers['idempotency-key'],
    );
    return reply.code(result.replay ? 200 : 201).send(result);
  }));

  app.get('/api/projects/:projectId/pre-review/sessions', {
    schema: { params: ProjectParams, response: { 200: PreEditSessionListSchema } },
  }, async (request) => service.listSessions(request.params.projectId));

  app.get('/api/projects/:projectId/pre-review/sessions/:sessionId', {
    schema: {
      params: SessionParams,
      response: { 200: PreEditSessionDetailSchema, 404: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () =>
    service.getSession(request.params.projectId, request.params.sessionId)));

  app.post('/api/projects/:projectId/pre-review/sessions/:sessionId/retry-preparation', {
    schema: {
      params: SessionParams,
      headers: IdempotencyHeaders,
      body: RetryPreEditPreparationBodySchema,
      response: { 200: PreEditSessionCommandResultSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.retryPreparation(
    request.params.projectId,
    request.params.sessionId,
    request.body,
    request.headers['idempotency-key'],
  )));

  app.get('/api/projects/:projectId/pre-review/sessions/:sessionId/items', {
    schema: {
      params: SessionParams,
      querystring: PreEditItemQuerySchema,
      response: { 200: PreEditItemListSchema, 404: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.listItems(
    request.params.projectId,
    request.params.sessionId,
    request.query,
  )));

  app.get('/api/projects/:projectId/pre-review/sessions/:sessionId/items/:itemId/events', {
    schema: {
      params: ItemParams,
      response: { 200: PreEditDecisionEventListSchema, 404: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.listDecisionEvents(
    request.params.projectId,
    request.params.sessionId,
    request.params.itemId,
  )));

  app.post('/api/projects/:projectId/pre-review/sessions/:sessionId/policy', {
    schema: {
      params: SessionParams,
      headers: IdempotencyHeaders,
      body: ApplyPreEditPolicyBodySchema,
      response: { 200: ApplyPreEditPolicyResultSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.applyPolicy(
    request.params.projectId,
    request.params.sessionId,
    request.body,
    request.headers['idempotency-key'],
  )));

  app.post('/api/projects/:projectId/pre-review/sessions/:sessionId/policy/preview', {
    schema: {
      params: SessionParams,
      body: ApplyPreEditPolicyBodySchema,
      response: { 200: PreviewPreEditPolicyResultSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.previewPolicy(
    request.params.projectId,
    request.params.sessionId,
    request.body,
  )));

  app.post('/api/projects/:projectId/pre-review/sessions/:sessionId/items/:itemId/decisions', {
    schema: {
      params: ItemParams,
      headers: IdempotencyHeaders,
      body: CreatePreEditDecisionBodySchema,
      response: { 200: PreEditItemCommandResultSchema, 201: PreEditItemCommandResultSchema,
        404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.decide(
      request.params.projectId,
      request.params.sessionId,
      request.params.itemId,
      request.body,
      request.headers['idempotency-key'],
    );
    return reply.code(result.replay ? 200 : 201).send(result);
  }));

  app.post('/api/projects/:projectId/pre-review/sessions/:sessionId/items/:itemId/undo', {
    schema: {
      params: ItemParams,
      headers: IdempotencyHeaders,
      body: UndoPreEditDecisionBodySchema,
      response: { 200: PreEditItemCommandResultSchema, 201: PreEditItemCommandResultSchema,
        404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.undo(
      request.params.projectId,
      request.params.sessionId,
      request.params.itemId,
      request.body,
      request.headers['idempotency-key'],
    );
    return reply.code(result.replay ? 200 : 201).send(result);
  }));

  app.post('/api/projects/:projectId/pre-review/sessions/:sessionId/episodes/:episodeNumber/complete', {
    schema: {
      params: EpisodeParams,
      headers: IdempotencyHeaders,
      body: CompletePreEditEpisodeBodySchema,
      response: { 200: CompletePreEditEpisodeResultSchema, 201: CompletePreEditEpisodeResultSchema,
        404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.completeEpisode(
      request.params.projectId,
      request.params.sessionId,
      Number(request.params.episodeNumber),
      request.body.expectedEpisodeRevision,
      request.headers['idempotency-key'],
    );
    return reply.code(result.replay ? 200 : 201).send(result);
  }));

  app.post('/api/projects/:projectId/pre-review/sessions/:sessionId/releases', {
    schema: {
      params: SessionParams,
      headers: IdempotencyHeaders,
      body: CreatePreEditReleaseBodySchema,
      response: { 200: PreEditReleaseCommandResultSchema, 201: PreEditReleaseCommandResultSchema,
        404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.createRelease(
      request.params.projectId,
      request.params.sessionId,
      request.body,
      request.headers['idempotency-key'],
    );
    return reply.code(result.replay ? 200 : 201).send(result);
  }));

  app.get('/api/projects/:projectId/pre-review/releases', {
    schema: { params: ProjectParams, response: { 200: PreEditReleaseListSchema } },
  }, async (request) => service.listReleases(request.params.projectId));

  app.get('/api/projects/:projectId/pre-review/releases/:releaseId/episodes/:episodeNumber/export.srt', {
    schema: { params: ReleaseEpisodeParams },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const file = await service.downloadReleaseFile(
      request.params.projectId,
      request.params.releaseId,
      Number(request.params.episodeNumber),
    );
    reply.header('content-type', 'application/x-subrip; charset=utf-8');
    reply.header('content-disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
    return reply.send(file.bytes);
  }));

  app.post('/api/projects/:projectId/pre-review/sessions/:sessionId/items/:itemId/playback', {
    schema: {
      params: ItemParams,
      body: CreatePreEditPlaybackGrantBodySchema,
      response: { 201: PreEditPlaybackGrantSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => reply.code(201).send(
    await service.createPlaybackGrant(
      request.params.projectId,
      request.params.sessionId,
      request.params.itemId,
      request.body.expectedSessionRevision,
    ),
  )));

  app.get('/api/pre-review/playback/:token', {
    schema: { params: PlaybackParams },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const file = await service.readPlayback(request.params.token);
    reply.header('content-type', 'video/mp4');
    reply.header('content-disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    reply.header('cache-control', 'private, no-store');
    return reply.send(Buffer.from(file.bytes));
  }));
};
