import {
  ApiErrorSchema, CreateDeliveryBodySchema, DeliveryCommandResultSchema, DeliveryConfirmationSchema,
  DeliveryListQuerySchema, DeliveryListSchema, DeliveryProductDetailSchema, RecoverDeliveryBodySchema, UpdateDeliveryMetadataBodySchema,
} from '@qimao-terms-cloud/contracts';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';

import { DeliveryDomainError } from './deliveries.errors.js';
import { DeliveryRepository } from './deliveries.repository.js';
import { DeliveryService } from './deliveries.service.js';

const ProjectParams = Type.Object({ projectId: Type.String({ format: 'uuid' }) });
const SessionQuery = Type.Object({ sessionId: Type.String({ format: 'uuid' }) });
const DeliveryParams = Type.Object({ deliveryId: Type.String({ format: 'uuid' }) });
const ProjectDeliveryParams = Type.Object({ projectId: Type.String({ format: 'uuid' }), deliveryId: Type.String({ format: 'uuid' }) });
const FileParams = Type.Object({ deliveryId: Type.String({ format: 'uuid' }), fileId: Type.String({ format: 'uuid' }) });
const ProjectFileParams = Type.Object({ projectId: Type.String({ format: 'uuid' }), deliveryId: Type.String({ format: 'uuid' }), fileId: Type.String({ format: 'uuid' }) });
const IdempotencyHeaders = Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) });
const sendError = (reply: FastifyReply, requestId: string, error: DeliveryDomainError) => reply.code(error.statusCode).send({ error: { code: error.code, message: error.message, retryable: error.retryable, action: error.action, requestId } });

export const deliveryRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const service = new DeliveryService(new DeliveryRepository(app.database, app.deliveryStorage));
  const handle = async <T>(reply: FastifyReply, requestId: string, operation: () => Promise<T>) => { try { return await operation(); } catch (error) { if (error instanceof DeliveryDomainError) return sendError(reply, requestId, error); app.log.error({ err: error, requestId }, 'delivery request failed'); throw error; } };
  app.get('/api/projects/:projectId/deliveries/confirm', { schema: { params: ProjectParams, querystring: SessionQuery, response: { 200: DeliveryConfirmationSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema } } }, async (request, reply) => handle(reply, request.id, () => service.confirmation(request.params.projectId, request.query.sessionId)));
  const createSchema = { params: ProjectParams, headers: IdempotencyHeaders, body: CreateDeliveryBodySchema, response: { 200: DeliveryCommandResultSchema, 202: DeliveryCommandResultSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema } };
  app.post('/api/projects/:projectId/deliveries', { schema: createSchema }, async (request, reply) => handle(reply, request.id, async () => { const result = await service.create(request.params.projectId, request.body, request.headers['idempotency-key'], request.id); return reply.code(result.replay ? 200 : 202).send({ product: result.detail!, replay: result.replay }); }));
  app.post('/api/projects/:projectId/deliveries/:deliveryId/recover', { schema: { params: ProjectDeliveryParams, headers: IdempotencyHeaders, body: RecoverDeliveryBodySchema, response: { 200: DeliveryCommandResultSchema, 202: DeliveryCommandResultSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema } } }, async (request, reply) => handle(reply, request.id, async () => { const result = await service.recover(request.params.projectId, request.params.deliveryId, request.body, request.headers['idempotency-key'], request.id); return reply.code(result.replay ? 200 : 202).send({ product: result.detail!, replay: result.replay }); }));
  app.get('/api/projects/:projectId/deliveries', { schema: { params: ProjectParams, querystring: DeliveryListQuerySchema, response: { 200: DeliveryListSchema } } }, async (request) => service.list(request.params.projectId, request.query));
  app.get('/api/projects/:projectId/deliveries/:deliveryId', { schema: { params: ProjectDeliveryParams, response: { 200: DeliveryProductDetailSchema, 404: ApiErrorSchema } } }, async (request, reply) => handle(reply, request.id, () => service.detail(request.params.projectId, request.params.deliveryId)));
  app.patch('/api/projects/:projectId/deliveries/:deliveryId', { schema: { params: ProjectDeliveryParams, headers: IdempotencyHeaders, body: UpdateDeliveryMetadataBodySchema, response: { 200: DeliveryProductDetailSchema, 404: ApiErrorSchema, 409: ApiErrorSchema } } }, async (request, reply) => handle(reply, request.id, async () => { const result = await service.updateMetadata(request.params.projectId, request.params.deliveryId, request.body, request.headers['idempotency-key'], request.id); return reply.send(result.detail!); }));
  app.get('/api/deliveries', { schema: { querystring: DeliveryListQuerySchema, response: { 200: DeliveryListSchema } } }, async (request) => service.list(null, request.query));
  app.get('/api/deliveries/:deliveryId', { schema: { params: DeliveryParams, response: { 200: DeliveryProductDetailSchema, 404: ApiErrorSchema } } }, async (request, reply) => handle(reply, request.id, () => service.detailGlobal(request.params.deliveryId)));
  app.patch('/api/deliveries/:deliveryId', { schema: { params: DeliveryParams, headers: IdempotencyHeaders, body: UpdateDeliveryMetadataBodySchema, response: { 200: DeliveryProductDetailSchema, 404: ApiErrorSchema, 409: ApiErrorSchema } } }, async (request, reply) => handle(reply, request.id, async () => { const result = await service.updateMetadataGlobal(request.params.deliveryId, request.body, request.headers['idempotency-key'], request.id); return reply.send(result.detail!); }));
  app.get('/api/deliveries/:deliveryId/files/:fileId', { schema: { params: FileParams, response: { 200: Type.Any(), 404: ApiErrorSchema, 409: ApiErrorSchema } } }, async (request, reply) => handle(reply, request.id, async () => { const file = await service.readFile(null, request.params.deliveryId, request.params.fileId); reply.type(file.file.content_type).header('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.file.file_name)}`); return reply.send(file.bytes); }));
  app.get('/api/projects/:projectId/deliveries/:deliveryId/files/:fileId', { schema: { params: ProjectFileParams, response: { 200: Type.Any(), 404: ApiErrorSchema, 409: ApiErrorSchema } } }, async (request, reply) => handle(reply, request.id, async () => { const file = await service.readFile(request.params.projectId, request.params.deliveryId, request.params.fileId); reply.type(file.file.content_type).header('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.file.file_name)}`); return reply.send(file.bytes); }));
};
