import {
  ApiErrorSchema,
  EmployeeAuthLoginBodySchema,
  EmployeeAuthLogoutSchema,
  EmployeeAuthSessionSchema,
} from '@qimao-terms-cloud/contracts';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

// 当前员工站只有一个共享测试账号。使用服务端固定键可避免客户端伪造代理来源头绕过限速；
// 代价是任意来源累计五次失败都会让该共享账号全局锁定十五分钟。
const SHARED_EMPLOYEE_LOGIN_RATE_KEY = 'employee-shared-account';

const unauthorized = (reply: any, requestId: string) => reply.code(401).send({ error: {
  code: 'EMPLOYEE_AUTH_REQUIRED',
  message: '请先登录员工工作台。',
  retryable: false,
  action: 'login_employee',
  requestId,
} });

const unavailable = (reply: any, requestId: string) => reply.code(503).send({ error: {
  code: 'EMPLOYEE_AUTH_NOT_CONFIGURED',
  message: '员工登录暂未配置。',
  retryable: false,
  action: 'contact_operator',
  requestId,
} });

const rateLimited = (reply: any, requestId: string, retryAfterSeconds: number) => {
  reply.header('retry-after', String(retryAfterSeconds));
  return reply.code(429).send({ error: {
    code: 'EMPLOYEE_LOGIN_RATE_LIMITED',
    message: '登录尝试过于频繁，请稍后再试。',
    retryable: true,
    action: 'retry_later',
    requestId,
  } });
};

export const employeeAuthRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('cache-control', 'no-store');
    return payload;
  });

  app.post('/api/employee-auth/login', {
    schema: {
      body: EmployeeAuthLoginBodySchema,
      response: { 200: EmployeeAuthSessionSchema, 401: ApiErrorSchema, 429: ApiErrorSchema, 503: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const service = app.employeeAuthService;
    if (!service) return unavailable(reply, request.id);
    const sourceKey = SHARED_EMPLOYEE_LOGIN_RATE_KEY;
    const existingRetryAfter = service.loginRetryAfterSeconds(sourceKey);
    if (existingRetryAfter) return rateLimited(reply, request.id, existingRetryAfter);
    if (!service.verifyPassword(request.body.username, request.body.password)) {
      const retryAfter = service.recordLoginFailure(sourceKey);
      return retryAfter ? rateLimited(reply, request.id, retryAfter) : unauthorized(reply, request.id);
    }
    service.clearLoginFailures(sourceKey);
    const session = service.issueSession();
    reply.header('set-cookie', service.cookie(session.token));
    return reply.send({ subject: service.subject, expiresAt: session.expiresAt, requestId: request.id });
  });

  app.get('/api/employee-auth/session', {
    schema: { response: { 200: EmployeeAuthSessionSchema, 401: ApiErrorSchema, 503: ApiErrorSchema } },
  }, async (request, reply) => {
    const service = app.employeeAuthService;
    if (!service) return unavailable(reply, request.id);
    const session = service.readSession(request);
    if (!session) return unauthorized(reply, request.id);
    return reply.send({ subject: session.principal.subject, expiresAt: session.expiresAt, requestId: request.id });
  });

  app.post('/api/employee-auth/logout', {
    schema: { response: { 200: EmployeeAuthLogoutSchema, 401: ApiErrorSchema, 503: ApiErrorSchema } },
  }, async (request, reply) => {
    const service = app.employeeAuthService;
    if (!service) return unavailable(reply, request.id);
    if (!service.resolvePrincipal(request)) return unauthorized(reply, request.id);
    reply.header('set-cookie', service.cookie('', 0));
    return reply.send({ loggedOut: true, requestId: request.id });
  });
};
