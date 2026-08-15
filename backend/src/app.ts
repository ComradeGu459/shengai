import Fastify from 'fastify';
import {
  TypeBoxTypeProvider,
  TypeBoxValidatorCompiler,
} from '@fastify/type-provider-typebox';

import { createPool, type DatabasePool } from './database/pool.js';
import {
  projectLifecycleConfig,
  uploadProtocolConfig,
  type ProjectLifecycleConfig,
  type UploadProtocolConfig,
} from './config.js';
import { materialRoutes } from './modules/materials/material.routes.js';
import { asrRoutes } from './modules/asr/asr.routes.js';
import {
  AsrAdapterRegistry,
  createDefaultAsrAdapterRegistry,
} from './modules/asr/asr-adapter-registry.js';
import { DeterministicFakeTermExtractionAdapter, type TermExtractionAdapter } from './modules/terms/term-extraction.js';
import { termRoutes } from './modules/terms/term.routes.js';
import { projectLifecycleRoutes } from './modules/projects/project-lifecycle.routes.js';
import { projectRoutes } from './modules/projects/project.routes.js';
import { preReviewRoutes } from './modules/pre-review/pre-review.routes.js';
import { screenTextRoutes } from './modules/screen-text/screen-text.routes.js';
import { subtitleAcceptanceRoutes } from './modules/subtitle-acceptance/subtitle-acceptance.routes.js';
import {
  ScreenTextAdapterRegistry,
  createDefaultScreenTextAdapterRegistry,
} from './modules/screen-text/screen-text.adapter-registry.js';
import {
  getDefaultScreenTextEvidenceStorage,
  type ScreenTextEvidenceStorage,
} from './modules/screen-text/screen-text.evidence-storage.js';
import { InMemoryStorageFake } from './modules/uploads/in-memory-storage.fake.js';
import { uploadRoutes } from './modules/uploads/upload.routes.js';
import type { UploadStorage } from './modules/uploads/upload-storage.js';

const createDefaultUploadStorage = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境尚未配置真实对象存储适配器。');
  }
  return new InMemoryStorageFake();
};

export const createApp = (options: {
  database?: DatabasePool;
  uploadStorage?: UploadStorage;
  uploadConfig?: UploadProtocolConfig;
  lifecycleConfig?: ProjectLifecycleConfig;
  termExtractionAdapter?: TermExtractionAdapter;
  asrAdapterRegistry?: AsrAdapterRegistry;
  screenTextAdapterRegistry?: ScreenTextAdapterRegistry;
  screenTextEvidenceStorage?: ScreenTextEvidenceStorage;
} = {}) => {
  const database = options.database ?? createPool();
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    genReqId: () => crypto.randomUUID(),
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.setValidatorCompiler(TypeBoxValidatorCompiler);
  if (process.env.NODE_ENV !== 'production') {
    app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_request, body, done) => {
      done(null, body);
    });
  }
  app.decorate('database', database);
  app.decorate('uploadStorage', options.uploadStorage ?? createDefaultUploadStorage());
  app.decorate('uploadConfig', options.uploadConfig ?? uploadProtocolConfig);
  app.decorate('lifecycleConfig', options.lifecycleConfig ?? projectLifecycleConfig);
  app.decorate('termExtractionAdapter', options.termExtractionAdapter ?? new DeterministicFakeTermExtractionAdapter());
  app.decorate('asrAdapterRegistry', options.asrAdapterRegistry ?? createDefaultAsrAdapterRegistry());
  app.decorate('screenTextAdapterRegistry', options.screenTextAdapterRegistry ?? createDefaultScreenTextAdapterRegistry());
  app.decorate('screenTextEvidenceStorage', options.screenTextEvidenceStorage ?? getDefaultScreenTextEvidenceStorage());
  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    return payload;
  });
  app.addHook('onClose', async () => {
    await database.end();
  });

  app.get('/health', async () => {
    await database.query('SELECT 1');
    return {
      service: 'qimao-terms-cloud-backend',
      status: 'ok',
      milestone: 'm2-projects',
      database: 'connected',
    };
  });

  app.register(projectRoutes);
  app.register(projectLifecycleRoutes);
  app.register(materialRoutes);
  app.register(uploadRoutes);
  app.register(termRoutes);
  app.register(asrRoutes);
  app.register(preReviewRoutes);
  app.register(screenTextRoutes);
  app.register(subtitleAcceptanceRoutes);
  app.setErrorHandler((error, request, reply) => {
    const reportedStatus =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    const statusCode = reportedStatus < 500 ? reportedStatus : 500;
    const validationError = statusCode === 400;
    void reply.code(statusCode).send({
      error: {
        code: validationError ? 'REQUEST_VALIDATION_FAILED' : 'INTERNAL_ERROR',
        message: validationError ? '请求内容不符合接口要求。' : '服务暂时无法完成请求，请稍后重试。',
        retryable: !validationError,
        action: validationError ? 'edit_request' : 'retry',
        requestId: request.id,
      },
    });
  });

  return app;
};
