import {
  ApiErrorSchema,
  ConfirmEmptyScreenTextEpisodeBodySchema,
  CreateScreenTextPlaybackGrantBodySchema,
  CreateManualScreenTextCandidateBodySchema,
  CreateScreenTextBatchBodySchema,
  CreateScreenTextDecisionBodySchema,
  CreateScreenTextReleaseBodySchema,
  RetryScreenTextBatchBodySchema,
  ScreenTextBatchSchema,
  ScreenTextBatchListQuerySchema,
  ScreenTextBatchListSchema,
  ScreenTextCandidateListSchema,
  ScreenTextCandidateQuerySchema,
  ScreenTextCandidateSchema,
  ScreenTextDecisionEventListSchema,
  ScreenTextDecisionResultSchema,
  ScreenTextReleaseSchema,
  ScreenTextReleaseListQuerySchema,
  ScreenTextReleaseListSchema,
  ScreenTextPlaybackGrantSchema,
} from '@qimao-terms-cloud/contracts';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';

import { ScreenTextDomainError } from './screen-text.errors.js';
import { ScreenTextReadRepository } from './screen-text.read.repository.js';
import { ScreenTextPlaybackRepository } from './screen-text.playback.repository.js';
import { ScreenTextService } from './screen-text.service.js';
import { ScreenTextWriteRepository } from './screen-text.write.repository.js';
import { SystemControlRoutingService } from '../system-control/system-control.routing.service.js';

const ProjectParams = Type.Object({ projectId: Type.String({ format: 'uuid' }) });
const BatchParams = Type.Object({
  projectId: Type.String({ format: 'uuid' }), batchId: Type.String({ format: 'uuid' }),
});
const EpisodeParams = Type.Object({
  projectId: Type.String({ format: 'uuid' }), batchId: Type.String({ format: 'uuid' }),
  episodeNumber: Type.Union([
    Type.Integer({ minimum: 1, maximum: 100 }),
    Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
  ]),
});
const CandidateParams = Type.Object({
  projectId: Type.String({ format: 'uuid' }), candidateId: Type.String({ format: 'uuid' }),
});
const ReleaseParams = Type.Object({
  projectId: Type.String({ format: 'uuid' }), releaseId: Type.String({ format: 'uuid' }),
});
const ExportParams = Type.Object({
  projectId: Type.String({ format: 'uuid' }), exportId: Type.String({ format: 'uuid' }),
});
const IdempotencyHeaders = Type.Object({
  'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }),
});
const PlaybackParams = Type.Object({ token: Type.String({ minLength: 20, maxLength: 200 }) });

const sendError = (reply: FastifyReply, requestId: string, error: ScreenTextDomainError) =>
  reply.code(error.statusCode).send({ error: {
    code: error.code, message: error.message, retryable: error.retryable,
    action: error.action, requestId,
  } });

export const screenTextRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const routing = new SystemControlRoutingService(app.database, { asr: app.asrAdapterRegistry, screenText: app.screenTextAdapterRegistry });
  const service = new ScreenTextService(
    new ScreenTextReadRepository(app.database),
    new ScreenTextWriteRepository(app.database, routing, app.screenTextAdapterRegistry),
    new ScreenTextPlaybackRepository(app.database, app.uploadStorage),
    app.screenTextEvidenceStorage,
  );
  const handle = async <T>(reply: FastifyReply, requestId: string, operation: () => Promise<T>) => {
    try { return await operation(); }
    catch (error) {
      if (error instanceof ScreenTextDomainError) return sendError(reply, requestId, error);
      app.log.error({ err: error, requestId }, 'screen-text request failed');
      throw error;
    }
  };

  app.post('/api/projects/:projectId/screen-text/batches', {
    schema: {
      params: ProjectParams, headers: IdempotencyHeaders, body: CreateScreenTextBatchBodySchema,
      response: { 200: ScreenTextBatchSchema, 201: ScreenTextBatchSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 503: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.create(request.params.projectId, request.body, request.headers['idempotency-key'], request.id);
    return reply.code(result.replay ? 200 : 201).send(result.batch);
  }));

  app.get('/api/projects/:projectId/screen-text/batches', {
    schema: {
      params: ProjectParams, querystring: ScreenTextBatchListQuerySchema,
      response: { 200: ScreenTextBatchListSchema },
    },
  }, async (request) => service.listBatches(request.params.projectId, request.query));

  app.get('/api/projects/:projectId/screen-text/batches/:batchId', {
    schema: { params: BatchParams, response: { 200: ScreenTextBatchSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => handle(reply, request.id, () => service.getBatch(request.params.projectId, request.params.batchId)));

  app.get('/api/projects/:projectId/screen-text/batches/:batchId/candidates', {
    schema: { params: BatchParams, querystring: ScreenTextCandidateQuerySchema, response: { 200: ScreenTextCandidateListSchema } },
  }, async (request) => service.listCandidates(request.params.projectId, request.params.batchId, request.query));

  app.get('/api/projects/:projectId/screen-text/batches/:batchId/events', {
    schema: { params: BatchParams, response: { 200: ScreenTextDecisionEventListSchema } },
  }, async (request) => service.listEvents(request.params.projectId, request.params.batchId));

  app.post('/api/projects/:projectId/screen-text/candidates/:candidateId/decisions', {
    schema: {
      params: CandidateParams, headers: IdempotencyHeaders, body: CreateScreenTextDecisionBodySchema,
      response: { 200: ScreenTextDecisionResultSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.decide(request.params.projectId, request.params.candidateId, request.body, request.headers['idempotency-key']);
    return reply.code(200).send(result.result);
  }));

  app.post('/api/projects/:projectId/screen-text/batches/:batchId/episodes/:episodeNumber/candidates', {
    schema: {
      params: EpisodeParams, headers: IdempotencyHeaders, body: CreateManualScreenTextCandidateBodySchema,
      response: { 200: ScreenTextCandidateSchema, 201: ScreenTextCandidateSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.createManual(request.params.projectId, request.params.batchId, Number(request.params.episodeNumber), request.body, request.headers['idempotency-key']);
    return reply.code(result.replay ? 200 : 201).send(result.candidate);
  }));

  app.post('/api/projects/:projectId/screen-text/batches/:batchId/episodes/:episodeNumber/confirm-empty', {
    schema: {
      params: EpisodeParams, headers: IdempotencyHeaders, body: ConfirmEmptyScreenTextEpisodeBodySchema,
      response: { 200: ScreenTextBatchSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.confirmEmpty(request.params.projectId, request.params.batchId, Number(request.params.episodeNumber), request.body, request.headers['idempotency-key']);
    return reply.code(200).send(result.batch);
  }));

  app.post('/api/projects/:projectId/screen-text/batches/:batchId/cancel', {
    schema: {
      params: BatchParams, headers: IdempotencyHeaders,
      body: Type.Object({}, { additionalProperties: false }),
      response: { 200: ScreenTextBatchSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.cancel(request.params.projectId, request.params.batchId, request.headers['idempotency-key']);
    return reply.code(200).send(result.batch);
  }));

  app.post('/api/projects/:projectId/screen-text/batches/:batchId/retries', {
    schema: {
      params: BatchParams, headers: IdempotencyHeaders, body: RetryScreenTextBatchBodySchema,
      response: { 200: ScreenTextBatchSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.retry(request.params.projectId, request.params.batchId, request.body, request.headers['idempotency-key']);
    return reply.code(200).send(result.batch);
  }));

  app.post('/api/projects/:projectId/screen-text/releases', {
    schema: {
      params: ProjectParams, headers: IdempotencyHeaders, body: CreateScreenTextReleaseBodySchema,
      response: { 200: ScreenTextReleaseSchema, 201: ScreenTextReleaseSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.release(request.params.projectId, request.body, request.headers['idempotency-key']);
    return reply.code(result.replay ? 200 : 201).send(result.release);
  }));

  app.get('/api/projects/:projectId/screen-text/releases', {
    schema: {
      params: ProjectParams, querystring: ScreenTextReleaseListQuerySchema,
      response: { 200: ScreenTextReleaseListSchema },
    },
  }, async (request) => service.listReleases(request.params.projectId, request.query));

  app.get('/api/projects/:projectId/screen-text/releases/:releaseId', {
    schema: { params: ReleaseParams, response: { 200: ScreenTextReleaseSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => handle(reply, request.id, () => service.getRelease(request.params.projectId, request.params.releaseId)));

  app.get('/api/projects/:projectId/screen-text/exports/:exportId/download', {
    schema: { params: ExportParams },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const item = await service.getExport(request.params.projectId, request.params.exportId);
    return reply.header('content-type', 'application/x-subrip; charset=utf-8')
      .header('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(item.filename)}`)
      .header('x-content-sha256', item.sha256)
      .send(item.content);
  }));

  app.get('/api/projects/:projectId/screen-text/candidates/:candidateId/evidence', {
    schema: { params: CandidateParams },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const item = await service.getEvidence(request.params.projectId, request.params.candidateId);
    return reply.header('content-type', item.contentType)
      .header('x-content-sha256', item.checksum)
      .header('cache-control', 'private, max-age=60').send(Buffer.from(item.bytes));
  }));

  app.post('/api/projects/:projectId/screen-text/candidates/:candidateId/playback', {
    schema: {
      params: CandidateParams,
      body: CreateScreenTextPlaybackGrantBodySchema,
      response: { 201: ScreenTextPlaybackGrantSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => reply.code(201).send(
    await service.createPlaybackGrant(
      request.params.projectId, request.params.candidateId, request.body.expectedBatchRevision,
    ),
  )));

  app.get('/api/screen-text/playback/:token', {
    schema: { params: PlaybackParams },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const file = await service.readPlayback(request.params.token);
    return reply.header('content-type', 'video/mp4')
      .header('content-disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`)
      .header('cache-control', 'private, no-store')
      .send(Buffer.from(file.bytes));
  }));
};
