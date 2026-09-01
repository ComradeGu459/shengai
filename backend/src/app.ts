import Fastify from 'fastify';
import {
  TypeBoxTypeProvider,
  TypeBoxValidatorCompiler,
} from '@fastify/type-provider-typebox';

import { createPool, type DatabasePool } from './database/pool.js';
import {
  projectLifecycleConfig,
  uploadProtocolConfig,
  DIRECT_UPLOAD_CORS_ORIGIN,
  DIRECT_UPLOAD_RELAY_CORS_EXPOSE_HEADERS,
  DIRECT_UPLOAD_RELAY_CORS_HEADERS,
  DIRECT_UPLOAD_RELAY_CORS_METHODS,
  getDirectUploadOrigin,
  normalizeDirectUploadOrigin,
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
import { deliveryRoutes } from './modules/deliveries/deliveries.routes.js';
import { tasksRoutes } from './modules/tasks/tasks.routes.js';
import { InMemoryDeliveryStorageFake } from './modules/deliveries/in-memory-delivery-storage.fake.js';
import type { DeliveryStorage } from './modules/deliveries/delivery-storage.js';
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
import { tusBusinessRoutes, UPLOAD_DIRECT_CAPABILITY_HEADER } from './modules/uploads/tus/tus-business.routes.js';
import { isDirectUploadStorage, type UploadStorage } from './modules/uploads/upload-storage.js';
import type { SystemControlPrincipal, SystemControlPrincipalResolver } from './modules/system-control/system-control.auth.js';
import { defaultAccessReadiness, rejectUnconfiguredSecretProvider, type SystemControlAccessReadinessProvider, type SystemControlSecretProvider } from './modules/system-control/system-control.secret-provider.js';
import type { CloudflareAccessPrincipalResolver } from './modules/access/cloudflare-access.js';
import { employeeAuthRoutes } from './modules/employee-auth/employee-auth.routes.js';
import { employeeOriginAllowed, EmployeeAuthService, type EmployeePrincipalResolver } from './modules/employee-auth/employee-auth.js';
import { systemControlRoutes } from './modules/system-control/system-control.routes.js';
import { RejectUnknownCostConversionProvider, type CostConversionRateProvider } from './modules/system-control/system-control.cost.service.js';
import type { RuntimeTelemetryProvider } from './modules/system-control/system-control.runtime.service.js';
import { feedbackRoutes } from './modules/feedback/feedback.routes.js';
import { InMemoryFeedbackScreenshotStorageFake } from './modules/feedback/in-memory-feedback-screenshot-storage.fake.js';
import type { FeedbackScreenshotStorage } from './modules/feedback/feedback-storage.js';

const createDefaultUploadStorage = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境尚未配置真实对象存储适配器。');
  }
  return new InMemoryStorageFake();
};

const createDefaultDeliveryStorage = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境尚未配置真实交付对象存储适配器。');
  }
  return new InMemoryDeliveryStorageFake();
};

export const createApp = (options: {
  database?: DatabasePool;
  uploadStorage?: UploadStorage;
  deliveryStorage?: DeliveryStorage;
  uploadConfig?: UploadProtocolConfig;
  lifecycleConfig?: ProjectLifecycleConfig;
  termExtractionAdapter?: TermExtractionAdapter;
  asrAdapterRegistry?: AsrAdapterRegistry;
  screenTextAdapterRegistry?: ScreenTextAdapterRegistry;
  screenTextEvidenceStorage?: ScreenTextEvidenceStorage;
  systemControlPrincipalResolver?: SystemControlPrincipalResolver;
  systemControlSecretProvider?: SystemControlSecretProvider;
  systemControlAccessReadinessProvider?: SystemControlAccessReadinessProvider;
  systemControlCostConversionProvider?: CostConversionRateProvider;
  systemControlRuntimeTelemetryProvider?: RuntimeTelemetryProvider;
  feedbackScreenshotStorage?: FeedbackScreenshotStorage;
  accessPrincipalResolver?: CloudflareAccessPrincipalResolver;
  employeePrincipalResolver?: EmployeePrincipalResolver;
  employeeAuthService?: EmployeeAuthService;
  employeeSessionRequired?: boolean;
  directUploadOrigin?: string | null;
  tusDirectory?: string;
  accessRequired?: boolean;
} = {}) => {
  const database = options.database ?? createPool();
  const accessRequired = options.accessRequired ?? process.env.QIMAO_ACCESS_REQUIRED?.trim().toLowerCase() === 'true';
  const employeeSessionRequired = options.employeeSessionRequired ?? Boolean(options.employeeAuthService);
  const directUploadOrigin = options.directUploadOrigin === undefined
    ? getDirectUploadOrigin()
    : normalizeDirectUploadOrigin(options.directUploadOrigin);
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    genReqId: () => crypto.randomUUID(),
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.setValidatorCompiler(TypeBoxValidatorCompiler);
  app.addContentTypeParser(['image/png', 'image/jpeg', 'image/webp'], { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });
  const uploadStorage = options.uploadStorage ?? createDefaultUploadStorage();
  const deliveryStorage = options.deliveryStorage ?? createDefaultDeliveryStorage();
  if (isDirectUploadStorage(uploadStorage)) {
    app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_request, body, done) => {
      done(null, body);
    });
  }
  app.decorate('database', database);
  app.decorate('uploadStorage', uploadStorage);
  app.decorate('deliveryStorage', deliveryStorage);
  app.decorate('uploadConfig', options.uploadConfig ?? uploadProtocolConfig);
  app.decorate('lifecycleConfig', options.lifecycleConfig ?? projectLifecycleConfig);
  app.decorate('termExtractionAdapter', options.termExtractionAdapter ?? new DeterministicFakeTermExtractionAdapter());
  app.decorate('asrAdapterRegistry', options.asrAdapterRegistry ?? createDefaultAsrAdapterRegistry());
  app.decorate('screenTextAdapterRegistry', options.screenTextAdapterRegistry ?? createDefaultScreenTextAdapterRegistry());
  app.decorate('screenTextEvidenceStorage', options.screenTextEvidenceStorage ?? getDefaultScreenTextEvidenceStorage());
  app.decorateRequest('accessPrincipal', null);
  app.decorateRequest('employeePrincipal', null);
  app.decorate('employeeAuthService', options.employeeAuthService ?? null);
  app.decorate('directUploadOrigin', directUploadOrigin);
  app.decorate('legacyTusEnabled', Boolean(options.tusDirectory));
  const isSystemControlPath = (request: { url: string }) => {
    const path = request.url.split('?')[0] ?? '';
    return path === '/api/system-control' || path.startsWith('/api/system-control/');
  };
  const isSystemControlPrincipal = (principal: SystemControlPrincipal | null) => {
    if (!principal) return false;
    const audiences = Array.isArray(principal.audience) ? principal.audience : [principal.audience];
    return audiences.includes('system-control');
  };
  app.decorate('systemControlPrincipalResolver', async (request) => {
    if (isSystemControlPath(request)) {
      if (isSystemControlPrincipal(request.accessPrincipal)) return request.accessPrincipal;
      return accessRequired ? null : options.systemControlPrincipalResolver ? options.systemControlPrincipalResolver(request) : null;
    }
    if (request.employeePrincipal) return request.employeePrincipal;
    if (options.employeePrincipalResolver) return options.employeePrincipalResolver(request);
    if (employeeSessionRequired) return null;
    return options.systemControlPrincipalResolver ? options.systemControlPrincipalResolver(request) : null;
  });
  app.decorate('systemControlSecretProvider', options.systemControlSecretProvider ?? rejectUnconfiguredSecretProvider);
  app.decorate('systemControlAccessReadinessProvider', options.systemControlAccessReadinessProvider ?? defaultAccessReadiness);
  app.decorate('systemControlCostConversionProvider', options.systemControlCostConversionProvider ?? new RejectUnknownCostConversionProvider());
  app.decorate('systemControlRuntimeTelemetryProvider', options.systemControlRuntimeTelemetryProvider ?? null);
  app.decorate('feedbackScreenshotStorage', options.feedbackScreenshotStorage ?? new InMemoryFeedbackScreenshotStorageFake());
  app.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0] ?? '';
    if (path === '/health' || !path.startsWith('/api/')) return;
    const localRelayPartPath = /^\/api\/local\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/parts\/[1-9][0-9]*$/i.test(path);
    const requestOrigin = typeof request.headers.origin === 'string' ? request.headers.origin : null;
    if (localRelayPartPath) {
      if (requestOrigin && requestOrigin !== DIRECT_UPLOAD_CORS_ORIGIN) {
        return reply.code(403).send({ error: { code: 'UPLOAD_CORS_ORIGIN_INVALID', message: '请求来源未通过校验。', retryable: false, action: 'use_employee_origin', requestId: request.id } });
      }
      if (requestOrigin === DIRECT_UPLOAD_CORS_ORIGIN) {
        reply.header('Access-Control-Allow-Origin', DIRECT_UPLOAD_CORS_ORIGIN);
        reply.header('Access-Control-Allow-Methods', DIRECT_UPLOAD_RELAY_CORS_METHODS);
        reply.header('Access-Control-Allow-Headers', DIRECT_UPLOAD_RELAY_CORS_HEADERS);
        reply.header('Access-Control-Expose-Headers', DIRECT_UPLOAD_RELAY_CORS_EXPOSE_HEADERS);
        reply.header('Vary', 'Origin');
      }
      if (request.method === 'OPTIONS') {
        if (requestOrigin !== DIRECT_UPLOAD_CORS_ORIGIN) {
          return reply.code(403).send({ error: { code: 'UPLOAD_CORS_ORIGIN_INVALID', message: '请求来源未通过校验。', retryable: false, action: 'use_employee_origin', requestId: request.id } });
        }
        return reply.code(204).send();
      }
    }
    const systemControlPath = path === '/api/system-control' || path.startsWith('/api/system-control/');
    if (systemControlPath) {
      if (!accessRequired) return;
      let principal: SystemControlPrincipal | null = null;
      try { principal = options.accessPrincipalResolver ? await options.accessPrincipalResolver(request, 'system-control') : null; } catch { principal = null; }
      if (!isSystemControlPrincipal(principal)) {
        return reply.code(403).send({ error: { code: 'ACCESS_FORBIDDEN', message: '当前访问未通过身份验证。', retryable: false, action: 'authenticate', requestId: request.id } });
      }
      request.accessPrincipal = principal;
      return;
    }
    const anonymousLogin = path === '/api/employee-auth/login' && request.method === 'POST';
    if (anonymousLogin) {
      if (options.employeeAuthService && !employeeOriginAllowed(request, options.employeeAuthService.origin)) {
        return reply.code(403).send({ error: { code: 'EMPLOYEE_CSRF_ORIGIN_INVALID', message: '请求来源未通过校验。', retryable: false, action: 'use_employee_origin', requestId: request.id } });
      }
      return;
    }
    if (request.method === 'OPTIONS') return;
    if (employeeSessionRequired) {
      const tusPath = path === '/api/uploads/tus' || path.startsWith('/api/uploads/tus/');
      const hasDirectUploadCapability = tusPath && typeof request.headers[UPLOAD_DIRECT_CAPABILITY_HEADER] === 'string';
      const hasDirectRelayCapability = localRelayPartPath && request.method === 'PUT'
        && typeof request.headers.authorization === 'string'
        && /^Bearer\s+\S+$/.test(request.headers.authorization);
      // 直连数据面不携带主站 __Host- Cookie；只允许 TUS 路径携带短时、签名能力继续到业务授权层。
      // 能力的签名、会话归属、项目状态和允许方法仍由 tusBusinessRoutes 每次请求复核。
      if (hasDirectUploadCapability || hasDirectRelayCapability) return;
      if (request.method !== 'GET' && request.method !== 'HEAD' && options.employeeAuthService && !employeeOriginAllowed(request, options.employeeAuthService.origin)) {
        return reply.code(403).send({ error: { code: 'EMPLOYEE_CSRF_ORIGIN_INVALID', message: '请求来源未通过校验。', retryable: false, action: 'use_employee_origin', requestId: request.id } });
      }
      const principal = options.employeePrincipalResolver
        ? await options.employeePrincipalResolver(request)
        : options.employeeAuthService?.resolvePrincipal(request) ?? null;
      if (!principal) {
        return reply.code(401).send({ error: { code: 'EMPLOYEE_AUTH_REQUIRED', message: '请先登录员工工作台。', retryable: false, action: 'login_employee', requestId: request.id } });
      }
      request.employeePrincipal = principal;
    }
  });
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
  if (options.tusDirectory) {
    app.register(tusBusinessRoutes, { directory: options.tusDirectory, maxSizeBytes: (options.uploadConfig ?? uploadProtocolConfig).maxFileSizeBytes });
  }
  app.register(uploadRoutes);
  app.register(termRoutes);
  app.register(asrRoutes);
  app.register(preReviewRoutes);
  app.register(screenTextRoutes);
  app.register(subtitleAcceptanceRoutes);
  app.register(deliveryRoutes);
  app.register(tasksRoutes);
  app.register(feedbackRoutes);
  app.register(employeeAuthRoutes);
  app.register(systemControlRoutes);
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
