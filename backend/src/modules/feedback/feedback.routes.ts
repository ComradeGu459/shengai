import {
  ApiErrorSchema,
  FeedbackCreateBodySchema,
  FeedbackEventBodySchema,
  FeedbackEventSchema,
  FeedbackEventListQuerySchema,
  FeedbackEventListSchema,
  FeedbackListQuerySchema,
  FeedbackListSchema,
  FeedbackReportDetailSchema,
  FeedbackReportSchema,
  FeedbackScreenshotAuthorizationBodySchema,
  FeedbackScreenshotCompletionBodySchema,
  FeedbackScreenshotAttachmentSchema,
} from '@qimao-terms-cloud/contracts';
import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { canCreateFeedback, canReadFeedback, canWriteFeedback } from './feedback.auth.js';
import { FeedbackError } from './feedback.errors.js';
import { FeedbackService } from './feedback.service.js';

const FeedbackParamsSchema = Type.Object({ feedbackId: Type.String({ format: 'uuid' }) }, { additionalProperties: false });
const AttachmentParamsSchema = Type.Object({
  feedbackId: Type.String({ format: 'uuid' }),
  attachmentId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });

const sendError = (reply: any, requestId: string, error: FeedbackError) => reply.code(error.statusCode).send({
  error: { code: error.code, message: error.message, retryable: false, action: error.action, requestId },
});

const forbidden = (reply: any, requestId: string) => reply.code(403).send({
  error: { code: 'FEEDBACK_FORBIDDEN', message: '当前身份无权访问测试反馈。', retryable: false, action: 'use_feedback_identity', requestId },
});

const idempotencyKey = (request: { headers: Record<string, string | string[] | undefined> }) => {
  const value = request.headers['idempotency-key'];
  return Array.isArray(value) ? value[0] : value;
};

export const feedbackRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const service = new FeedbackService(app.database, app.feedbackScreenshotStorage);

  app.post('/api/feedback-reports', {
    schema: { body: FeedbackCreateBodySchema, response: { 201: FeedbackReportSchema, 200: FeedbackReportSchema, 403: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!principal || !canCreateFeedback(principal)) return forbidden(reply, request.id);
    try {
      const result = await service.create({ body: request.body, idempotencyKey: idempotencyKey(request), requestId: request.id, principal });
      return reply.code(result.replay ? 200 : 201).send(result.detail.report);
    } catch (error) {
      if (error instanceof FeedbackError) return sendError(reply, request.id, error);
      throw error;
    }
  });

  app.get('/api/feedback-reports/:feedbackId', {
    schema: { params: FeedbackParamsSchema, response: { 200: FeedbackReportDetailSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    const manager = Boolean(principal && canReadFeedback(principal));
    if (!principal || (!manager && !canCreateFeedback(principal))) return forbidden(reply, request.id);
    try { return await service.get(request.params.feedbackId, principal, manager); }
    catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });

  app.post('/api/feedback-reports/:feedbackId/screenshot-authorizations', {
    schema: { params: FeedbackParamsSchema, body: FeedbackScreenshotAuthorizationBodySchema, response: { 201: FeedbackReportDetailSchema, 200: FeedbackReportDetailSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    const manager = Boolean(principal && canReadFeedback(principal));
    if (!principal || !canCreateFeedback(principal)) return forbidden(reply, request.id);
    try {
      const result = await service.authorizeScreenshot({ feedbackId: request.params.feedbackId, body: request.body, idempotencyKey: idempotencyKey(request), requestId: request.id, principal, manager });
      return reply.code(result.replay ? 200 : 201).send(result.detail);
    } catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });

  app.post('/api/feedback-reports/:feedbackId/screenshot-authorizations/:attachmentId/complete', {
    schema: { params: AttachmentParamsSchema, body: FeedbackScreenshotCompletionBodySchema, response: { 200: FeedbackReportDetailSchema, 201: FeedbackReportDetailSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    const manager = Boolean(principal && canReadFeedback(principal));
    if (!principal || !canCreateFeedback(principal)) return forbidden(reply, request.id);
    try {
      const result = await service.completeScreenshot({ feedbackId: request.params.feedbackId, attachmentId: request.params.attachmentId, idempotencyKey: idempotencyKey(request), requestId: request.id, principal, manager });
      return reply.code(result.replay ? 200 : 201).send(result.detail);
    } catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });

  app.post('/api/feedback-reports/:feedbackId/screenshot-authorizations/:attachmentId/content', {
    schema: { params: AttachmentParamsSchema, response: { 200: FeedbackReportDetailSchema, 201: FeedbackReportDetailSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    const manager = Boolean(principal && canReadFeedback(principal));
    if (!principal || !canCreateFeedback(principal)) return forbidden(reply, request.id);
    const contentType = String(request.headers['content-type'] ?? '').split(';', 1)[0]?.trim() ?? '';
    const body = request.body;
    if (!Buffer.isBuffer(body)) return sendError(reply, request.id, new FeedbackError('FEEDBACK_INVALID_CONTEXT', '截图内容必须是二进制。', 422, 'upload_binary_screenshot'));
    try {
      const result = await service.uploadScreenshot({ feedbackId: request.params.feedbackId, attachmentId: request.params.attachmentId, bytes: body, contentType, idempotencyKey: idempotencyKey(request), requestId: request.id, principal, manager });
      return reply.code(result.replay ? 200 : 201).send(result.detail);
    } catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });

  app.get('/api/feedback-reports/:feedbackId/screenshot-authorizations/:attachmentId', {
    schema: { params: AttachmentParamsSchema, response: { 200: FeedbackScreenshotAttachmentSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    const manager = Boolean(principal && canReadFeedback(principal));
    if (!principal || (!manager && !canCreateFeedback(principal))) return forbidden(reply, request.id);
    try { return await service.getAttachment(request.params.feedbackId, request.params.attachmentId, principal, manager); }
    catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });

  app.get('/api/system-control/feedback-reports/:feedbackId/screenshot-authorizations/:attachmentId/content', {
    schema: { params: AttachmentParamsSchema, response: { 403: ApiErrorSchema, 404: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!principal || !canReadFeedback(principal)) return forbidden(reply, request.id);
    try {
      const result = await service.readScreenshot(request.params.feedbackId, request.params.attachmentId, principal, true);
      return (reply as any).type(result.contentType).header('content-length', result.bytes.byteLength).send(Buffer.from(result.bytes));
    } catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });

  app.get('/api/system-control/feedback-reports', {
    schema: { querystring: FeedbackListQuerySchema, response: { 200: FeedbackListSchema, 403: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!principal || !canReadFeedback(principal)) return forbidden(reply, request.id);
    try { return await service.list(request.query); }
    catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });

  app.get('/api/system-control/feedback-reports/:feedbackId', {
    schema: { params: FeedbackParamsSchema, response: { 200: FeedbackReportDetailSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!principal || !canReadFeedback(principal)) return forbidden(reply, request.id);
    try { return await service.get(request.params.feedbackId, principal, true); }
    catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });

  app.get('/api/system-control/feedback-reports/:feedbackId/events', {
    schema: { params: FeedbackParamsSchema, querystring: FeedbackEventListQuerySchema, response: { 200: FeedbackEventListSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!principal || !canReadFeedback(principal)) return forbidden(reply, request.id);
    try { return await service.listEvents(request.params.feedbackId, request.query, principal, true); }
    catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });

  app.get('/api/system-control/feedback-events/:feedbackEventId', {
    schema: { params: Type.Object({ feedbackEventId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: FeedbackEventSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!principal || !canReadFeedback(principal)) return forbidden(reply, request.id);
    try { return await service.getEvent(request.params.feedbackEventId, principal, true); }
    catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });

  app.post('/api/system-control/feedback-reports/:feedbackId/events', {
    schema: { params: FeedbackParamsSchema, body: FeedbackEventBodySchema, response: { 201: FeedbackReportDetailSchema, 200: FeedbackReportDetailSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!principal || !canWriteFeedback(principal)) return forbidden(reply, request.id);
    try {
      const result = await service.addEvent({ feedbackId: request.params.feedbackId, body: request.body, idempotencyKey: idempotencyKey(request), requestId: request.id, principal });
      return reply.code(result.replay ? 200 : 201).send(result.detail);
    } catch (error) { if (error instanceof FeedbackError) return sendError(reply, request.id, error); throw error; }
  });
};
