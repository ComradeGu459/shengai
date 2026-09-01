import {
  ApiErrorSchema,
  ActivateTermExportTemplateBodySchema,
  BatchTermDecisionBodySchema,
  BatchTermDecisionResultSchema,
  CreateManualTermCandidateBodySchema,
  CreateTermExportBodySchema,
  CreateTermExportTemplateBodySchema,
  CreateTermDraftBodySchema,
  StartTermExtractionBodySchema,
  StartTermExtractionResultSchema,
  TermCandidateDecisionBodySchema,
  TermCandidateDetailSchema,
  TermCandidateListSchema,
  TermCandidateQuerySchema,
  TermCandidateSchema,
  TermCueListSchema,
  TermCueQuerySchema,
  TermDraftSchema,
  TermExportListSchema,
  TermExportSchema,
  TermExportTemplateListSchema,
  TermExportTemplateVersionSchema,
  PublishTermVersionBodySchema,
  PublishTermVersionResultSchema,
  TermVersionListSchema,
  TermVersionSchema,
  TermWorkspaceSchema,
} from '@qimao-terms-cloud/contracts';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';

import { TermCandidateRepository } from './term-candidate.repository.js';
import { TermCueRepository } from './term-cue.repository.js';
import { TermExtractionRepository } from './term-extraction.repository.js';
import { TermExportRepository } from './term-export.repository.js';
import { TermDomainError } from './term-errors.js';
import { TermService } from './term.service.js';
import { TermSourceRepository } from './term-source.repository.js';
import { TermSourceService } from './term-source.service.js';
import { TermVersionRepository } from './term-version.repository.js';
import { TermWorkspaceRepository } from './term-workspace.repository.js';
import { SystemControlRoutingService } from '../system-control/system-control.routing.service.js';

const ProjectParamsSchema = Type.Object({ projectId: Type.String({ format: 'uuid' }) });
const CandidateParamsSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  candidateId: Type.String({ format: 'uuid' }),
});
const VersionParamsSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  versionId: Type.String({ format: 'uuid' }),
});
const TemplateVersionParamsSchema = Type.Object({
  templateVersionId: Type.String({ format: 'uuid' }),
});
const ExportParamsSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
  exportId: Type.String({ format: 'uuid' }),
});
const IdempotencyHeadersSchema = Type.Object({
  'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }),
});

const sendTermError = (reply: FastifyReply, requestId: string, error: TermDomainError) =>
  reply.code(error.statusCode).send({
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      action: error.action,
      requestId,
    },
  });

export const termRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const source = new TermSourceService(new TermSourceRepository(app.database), app.uploadStorage);
  const candidateRepository = new TermCandidateRepository(app.database);
  const cueRepository = new TermCueRepository(app.database);
  const versionRepository = new TermVersionRepository(app.database);
  const exportRepository = new TermExportRepository(app.database);
  // deterministic fake 仅保留既有开发/测试兼容路径；生产 OpenAI-compatible adapter 必须经 117 route。
  const routing = app.termExtractionAdapter.name === 'deterministic-marker-fake' && process.env.NODE_ENV !== 'production'
    ? undefined
    : new SystemControlRoutingService(app.database, {
      asr: app.asrAdapterRegistry,
      screenText: app.screenTextAdapterRegistry,
      terms: app.termExtractionAdapter,
    });
  const service = new TermService(
    source,
    new TermExtractionRepository(app.database),
    candidateRepository,
    versionRepository,
    new TermWorkspaceRepository(app.database),
    app.termExtractionAdapter,
    exportRepository,
    routing,
  );
  const handle = async <T>(reply: FastifyReply, requestId: string, operation: () => Promise<T>) => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof TermDomainError) return sendTermError(reply, requestId, error);
      throw error;
    }
  };

  app.get('/api/projects/:projectId/terms', {
    schema: { params: ProjectParamsSchema, response: { 200: TermWorkspaceSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => handle(reply, request.id, () => service.getWorkspace(request.params.projectId)));

  app.post('/api/projects/:projectId/terms/extractions', {
    schema: {
      params: ProjectParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: StartTermExtractionBodySchema,
      response: { 200: StartTermExtractionResultSchema, 202: StartTermExtractionResultSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.startExtraction({
      projectId: request.params.projectId,
      ...(request.body.expectedSourceSrtSetDigest
        ? { expectedSourceDigest: request.body.expectedSourceSrtSetDigest }
        : {}),
      idempotencyKey: request.headers['idempotency-key'],
      requestId: request.id,
    });
    return reply.code(result.replay ? 200 : 202).send({ run: result.run, draft: result.draft });
  }));

  app.get('/api/projects/:projectId/terms/candidates', {
    schema: {
      params: ProjectParamsSchema,
      querystring: TermCandidateQuerySchema,
      response: { 200: TermCandidateListSchema },
    },
  }, async (request) => candidateRepository.list(request.params.projectId, {
    ...request.query,
    ...(request.query.search?.trim() ? { search: request.query.search.trim() } : {}),
  }));

  app.get('/api/projects/:projectId/terms/cues', {
    schema: {
      params: ProjectParamsSchema,
      querystring: TermCueQuerySchema,
      response: { 200: TermCueListSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () => cueRepository.list(request.params.projectId, {
    ...request.query,
    ...(request.query.search?.trim() ? { search: request.query.search.trim() } : {}),
  })));

  app.get('/api/projects/:projectId/terms/candidates/:candidateId', {
    schema: { params: CandidateParamsSchema, response: { 200: TermCandidateDetailSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => handle(reply, request.id, () =>
    candidateRepository.detail(request.params.projectId, request.params.candidateId)));

  app.patch('/api/projects/:projectId/terms/candidates/:candidateId', {
    schema: {
      params: CandidateParamsSchema,
      body: TermCandidateDecisionBodySchema,
      response: { 200: TermCandidateSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () =>
    service.decide(request.params.projectId, request.params.candidateId, request.body)));

  app.post('/api/projects/:projectId/terms/candidates', {
    schema: {
      params: ProjectParamsSchema,
      body: CreateManualTermCandidateBodySchema,
      response: { 201: TermCandidateSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const candidate = await service.createManual(request.params.projectId, request.body);
    return reply.code(201).send(candidate);
  }));

  app.post('/api/projects/:projectId/terms/candidates/batch-decisions', {
    schema: {
      params: ProjectParamsSchema,
      body: BatchTermDecisionBodySchema,
      response: { 200: BatchTermDecisionResultSchema },
    },
  }, async (request) => service.batch(request.params.projectId, request.body));

  app.post('/api/projects/:projectId/terms/drafts', {
    schema: {
      params: ProjectParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: CreateTermDraftBodySchema,
      response: { 200: TermDraftSchema, 201: TermDraftSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.createDraft({
      projectId: request.params.projectId,
      body: request.body,
      idempotencyKey: request.headers['idempotency-key'],
    });
    return reply.code(result.replay ? 200 : 201).send(result.draft);
  }));

  app.post('/api/projects/:projectId/terms/releases', {
    schema: {
      params: ProjectParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: PublishTermVersionBodySchema,
      response: { 200: PublishTermVersionResultSchema, 201: PublishTermVersionResultSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.publishVersion({
      projectId: request.params.projectId,
      body: request.body,
      idempotencyKey: request.headers['idempotency-key'],
    });
    return reply.code(result.replay ? 200 : 201).send({ version: result.version, export: result.export });
  }));

  app.get('/api/projects/:projectId/terms/versions', {
    schema: { params: ProjectParamsSchema, response: { 200: TermVersionListSchema } },
  }, async (request) => ({ items: await versionRepository.list(request.params.projectId) }));

  app.get('/api/projects/:projectId/terms/versions/:versionId', {
    schema: { params: VersionParamsSchema, response: { 200: TermVersionSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const version = await versionRepository.get(request.params.projectId, request.params.versionId);
    if (!version) throw new TermDomainError('TERM_VERSION_NOT_FOUND', '术语版本不存在。', 404, 'reload_terms');
    return version;
  }));

  app.get('/api/terms/export-templates', {
    schema: { response: { 200: TermExportTemplateListSchema } },
  }, async () => service.listExportTemplates());

  app.post('/api/terms/export-templates', {
    schema: {
      headers: IdempotencyHeadersSchema,
      body: CreateTermExportTemplateBodySchema,
      response: {
        200: TermExportTemplateVersionSchema,
        201: TermExportTemplateVersionSchema,
        409: ApiErrorSchema,
        422: ApiErrorSchema,
      },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.createExportTemplate(request.body, request.headers['idempotency-key']);
    return reply.code(result.replay ? 200 : 201).send(result.template);
  }));

  app.post('/api/terms/export-templates/:templateVersionId/activate', {
    schema: {
      params: TemplateVersionParamsSchema,
      body: ActivateTermExportTemplateBodySchema,
      response: { 200: TermExportTemplateVersionSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, () => service.activateExportTemplate(
    request.params.templateVersionId,
    request.body.expectedActiveTemplateVersionId,
  )));

  app.post('/api/projects/:projectId/terms/versions/:versionId/exports', {
    schema: {
      params: VersionParamsSchema,
      headers: IdempotencyHeadersSchema,
      body: CreateTermExportBodySchema,
      response: { 200: TermExportSchema, 201: TermExportSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.createExport({
      projectId: request.params.projectId,
      termVersionId: request.params.versionId,
      body: request.body,
      idempotencyKey: request.headers['idempotency-key'],
    });
    return reply.code(result.replay ? 200 : 201).send(result.export);
  }));

  app.get('/api/projects/:projectId/terms/versions/:versionId/exports', {
    schema: {
      params: VersionParamsSchema,
      response: { 200: TermExportListSchema, 404: ApiErrorSchema },
    },
  }, async (request, reply) => handle(reply, request.id, async () => ({
    items: await exportRepository.listExports(request.params.projectId, request.params.versionId),
  })));

  app.get('/api/projects/:projectId/terms/exports/:exportId', {
    schema: { params: ExportParamsSchema, response: { 200: TermExportSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const exported = await exportRepository.getExport(request.params.projectId, request.params.exportId);
    if (!exported) throw new TermDomainError('TERM_EXPORT_NOT_FOUND', '术语导出不存在。', 404, 'reload_terms');
    return exported;
  }));

  app.get('/api/projects/:projectId/terms/exports/:exportId/export.xlsx', {
    schema: { params: ExportParamsSchema },
  }, async (request, reply) => handle(reply, request.id, async () => {
    const result = await service.downloadExport(request.params.projectId, request.params.exportId);
    reply.header('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header(
      'content-disposition',
      `attachment; filename="terms-v${result.version.version}-template-v${result.export.templateVersion}.xlsx"`,
    );
    return reply.send(result.bytes);
  }));

};
