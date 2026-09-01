import {
  ApiErrorSchema,
  SystemControlConnectionTestSchema,
  SystemControlConnectionTestListQuerySchema,
  SystemControlConnectionTestListSchema,
  SystemControlCreateConnectionTestBodySchema,
  SystemControlCreateEngineDeploymentBodySchema,
  SystemControlCreateEngineVersionBodySchema,
  SystemControlEngineDetailSchema,
  SystemControlEngineListQuerySchema,
  SystemControlEngineListSchema,
  SystemControlEngineVersionListSchema,
  SystemControlEngineVersionListQuerySchema,
  SystemControlEngineDeploymentVersionSchema,
  SystemControlEngineStatusCommandBodySchema,
  SystemControlEngineStatusCommandSchema,
  SystemControlOverviewQuerySchema,
  SystemControlOverviewSchema,
  SystemControlCreateRoutingPolicyBodySchema,
  SystemControlRoutingCommandBodySchema,
  SystemControlRoutingListQuerySchema,
  SystemControlRoutingListSchema,
  SystemControlRoutingCommandSchema,
  SystemControlRoutingPolicyVersionSchema,
  SystemControlRoutingRollbackBodySchema,
  SystemControlRoutingAuditListQuerySchema,
  SystemControlRoutingAuditListSchema,
  SystemControlCreateBudgetPolicyBodySchema,
  SystemControlBudgetPolicySchema,
  SystemControlBudgetPolicyListQuerySchema,
  SystemControlBudgetPolicyListSchema,
  SystemControlBudgetCommandBodySchema,
  SystemControlBudgetReleaseBodySchema,
  SystemControlBudgetRollbackBodySchema,
  SystemControlBudgetCommandSchema,
  SystemControlBudgetUsageListQuerySchema,
  SystemControlBudgetUsageListSchema,
  SystemControlBudgetAuditListQuerySchema,
  SystemControlBudgetAuditListSchema,
  SystemControlBudgetReservationSchema,
  SystemControlBudgetTestRunSchema,
  SystemControlBudgetOverviewSchema,
  SystemControlBudgetTestCommandBodySchema,
  SystemControlBudgetTestRunListQuerySchema,
  SystemControlBudgetTestRunListSchema,
  SystemControlCostConversionSnapshotSchema,
  SystemControlCostConversionSnapshotListQuerySchema,
  SystemControlCostConversionSnapshotListSchema,
  SystemControlCreateCostConversionSnapshotBodySchema,
  SystemControlSecretDiscoveryQuerySchema,
  SystemControlSecretDiscoveryListSchema,
  SystemControlCreateSecretReferenceBodySchema,
  SystemControlSecretCommandSchema,
  SystemControlSecretReferenceSchema,
  SystemControlSecretReferenceListQuerySchema,
  SystemControlSecretReferenceListSchema,
  SystemControlSecretReferenceVersionListSchema,
  SystemControlRotateSecretReferenceBodySchema,
  SystemControlRevokeSecretReferenceBodySchema,
  SystemControlCreateSecretValidationBodySchema,
  SystemControlSecretValidationSchema,
  SystemControlSecretValidationListQuerySchema,
  SystemControlSecretValidationListSchema,
  SystemControlSecurityOverviewSchema,
  SystemControlSecretUsageListQuerySchema,
  SystemControlSecretUsageListSchema,
  SystemControlSecretAuditListQuerySchema,
  SystemControlSecretAuditListSchema,
  SystemControlSecretRevokePreflightSchema,
  SystemControlSecretCommandIdParamsSchema,
  SystemControlSecretPageQuerySchema,
  SystemControlRuntimeOverviewQuerySchema,
  SystemControlRuntimeOverviewSchema,
  SystemControlRuntimeResourcesQuerySchema,
  SystemControlRuntimeResourceListSchema,
  SystemControlRuntimeResourceSchema,
  SystemControlOperationsListQuerySchema,
  SystemControlOperationsListSchema,
  SystemControlOperationDetailSchema,
  SystemControlStrategyArtifactListQuerySchema,
  SystemControlStrategyArtifactListSchema,
  SystemControlStrategyArtifactSchema,
  SystemControlStrategyCreateArtifactBodySchema,
  SystemControlStrategyCreateVersionBodySchema,
  SystemControlStrategyVersionListQuerySchema,
  SystemControlStrategyVersionListSchema,
  SystemControlStrategyVersionSchema,
  SystemControlStrategyEventListQuerySchema,
  SystemControlStrategyEventListSchema,
  SystemControlStrategyEventSchema,
  SystemControlCreateOptimizationRunBodySchema,
  SystemControlOptimizationRunSchema,
  SystemControlOptimizationRunListQuerySchema,
  SystemControlOptimizationRunListSchema,
  SystemControlStrategyCandidateListQuerySchema,
  SystemControlStrategyCandidateListSchema,
  SystemControlStrategyCandidateSchema,
  SystemControlStrategyCandidateDecisionResultSchema,
  SystemControlStrategyCandidateDecisionBodySchema,
  SystemControlCreateEvaluationRunBodySchema,
  SystemControlEvaluationRunSchema,
  SystemControlEvaluationRunListQuerySchema,
  SystemControlEvaluationRunListSchema,
  SystemControlStrategyRuntimeTargetSchema,
  SystemControlStrategyBaselinePreviewSchema,
  SystemControlStrategyBaselineImportBodySchema,
  SystemControlStrategyRuntimeVersionSchema,
  SystemControlStrategyImpactRunBodySchema,
  SystemControlStrategyImpactRunSchema,
  SystemControlStrategyApprovalBodySchema,
  SystemControlStrategyApprovalSchema,
  SystemControlStrategyReleaseBodySchema,
  SystemControlStrategyReleaseCommandSchema,
  SystemControlStrategyHistoryQuerySchema,
  SystemControlStrategyHistorySchema,
} from '@qimao-terms-cloud/contracts';
import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { canReadSystemControl, canUseSystemControlCapability, SYSTEM_CONTROL_ENGINES_READ, SYSTEM_CONTROL_ENGINES_TEST, SYSTEM_CONTROL_ENGINES_WRITE, SYSTEM_CONTROL_SECRETS_READ, SYSTEM_CONTROL_SECRETS_TEST, SYSTEM_CONTROL_SECRETS_WRITE, SYSTEM_CONTROL_ROUTING_PUBLISH, SYSTEM_CONTROL_ROUTING_READ, SYSTEM_CONTROL_ROUTING_ROLLBACK, SYSTEM_CONTROL_ROUTING_WRITE, SYSTEM_CONTROL_BUDGET_READ, SYSTEM_CONTROL_BUDGET_WRITE, SYSTEM_CONTROL_BUDGET_PUBLISH, SYSTEM_CONTROL_RUNTIME_READ, SYSTEM_CONTROL_LOGS_READ, SYSTEM_CONTROL_STRATEGY_READ, SYSTEM_CONTROL_STRATEGY_WRITE, SYSTEM_CONTROL_STRATEGY_EVALUATE, SYSTEM_CONTROL_STRATEGY_APPROVE, SYSTEM_CONTROL_STRATEGY_RELEASE } from './system-control.auth.js';
import { SystemControlReadRepository } from './system-control.repository.js';
import { SystemControlEngineError } from './system-control.engine.errors.js';
import { SystemControlEngineService } from './system-control.engine.service.js';
import { SystemControlRoutingError } from './system-control.routing.errors.js';
import { SystemControlRoutingService } from './system-control.routing.service.js';
import { SystemControlBudgetError } from './system-control.budget.errors.js';
import { SystemControlBudgetService } from './system-control.budget.service.js';
import { SystemControlCostConversionService } from './system-control.cost.service.js';
import { SystemControlSecretService } from './system-control.secret.service.js';
import { SystemControlRuntimeService } from './system-control.runtime.service.js';
import { SystemControlOperationsError, SystemControlOperationsService } from './system-control.operations.service.js';
import { SystemControlStrategyError, SystemControlStrategyService } from './system-control.strategy.service.js';
import { SystemControlStrategyRuntimeError, SystemControlStrategyRuntimeService } from './system-control.strategy-runtime.service.js';
import { SystemControlStrategyOptimizationService } from './system-control.strategy-optimization.service.js';

const UUIDParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) }, { additionalProperties: false });
const EngineVersionParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }), versionId: Type.String({ format: 'uuid' }) }, { additionalProperties: false });
const SecretVersionParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }), versionId: Type.String({ format: 'uuid' }) }, { additionalProperties: false });
const ValidationParamsSchema = Type.Object({ validationRunId: Type.String({ format: 'uuid' }) }, { additionalProperties: false });

const idempotencyKey = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const sendEngineError = (reply: any, requestId: string, error: unknown) => {
  if (!(error instanceof SystemControlEngineError)) throw error;
  return reply.code(error.statusCode).send({ error: {
    code: error.code, message: error.message, retryable: false, action: error.action, requestId,
  } });
};

const forbidden = (reply: any, requestId: string) => reply.code(403).send({ error: {
  code: 'SYSTEM_CONTROL_FORBIDDEN', message: '当前身份无权执行该系统控制台操作。', retryable: false,
  action: 'use_system_control_identity', requestId,
} });

const sendRoutingError = (reply: any, requestId: string, error: unknown) => {
  if (!(error instanceof SystemControlRoutingError)) throw error;
  return reply.code(error.statusCode).send({ error: {
    code: error.code, message: error.message, retryable: false, action: error.action, requestId,
  } });
};

const sendBudgetError = (reply: any, requestId: string, error: unknown) => {
  if (!(error instanceof SystemControlBudgetError)) throw error;
  return reply.code(error.statusCode).send({ error: {
    code: error.code, message: error.message, retryable: false, action: error.action, requestId,
  } });
};

const sendOperationsError = (reply: any, requestId: string, error: unknown) => {
  if (!(error instanceof SystemControlOperationsError)) throw error;
  return reply.code(error.statusCode).send({ error: {
    code: error.code, message: error.message, retryable: false,
    action: error.statusCode === 404 ? 'refresh_operations' : 'edit_request', requestId,
  } });
};

const sendStrategyError = (reply: any, requestId: string, error: unknown) => {
  if (!(error instanceof SystemControlStrategyError) && !(error instanceof SystemControlStrategyRuntimeError)) throw error;
  return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message, retryable: false, action: error.statusCode === 404 ? 'reload_strategy' : 'review_strategy_request', requestId } });
};

export const systemControlRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const repository = new SystemControlReadRepository(app.database);
  const secretService = new SystemControlSecretService(app.database, app.systemControlSecretProvider, app.systemControlAccessReadinessProvider);
  const engineRegistries = { asr: app.asrAdapterRegistry, screenText: app.screenTextAdapterRegistry, terms: app.termExtractionAdapter };
  const engineService = new SystemControlEngineService(app.database, engineRegistries, secretService);
  const routingService = new SystemControlRoutingService(app.database, engineRegistries);
  const budgetService = new SystemControlBudgetService(app.database);
  const costConversionService = new SystemControlCostConversionService(app.database, app.systemControlCostConversionProvider);
  const runtimeService = new SystemControlRuntimeService(app.database, app.systemControlRuntimeTelemetryProvider ?? undefined);
  const operationsService = new SystemControlOperationsService(app.database);
  const strategyService = new SystemControlStrategyService(app.database);
  const strategyRuntimeService = new SystemControlStrategyRuntimeService(app.database);
  const strategyOptimizationService = new SystemControlStrategyOptimizationService(app.database);
  app.get('/api/system-control/overview', {
    schema: {
      querystring: SystemControlOverviewQuerySchema,
      response: { 200: SystemControlOverviewSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canReadSystemControl(principal)) {
      return reply.code(403).send({
        error: {
          code: 'SYSTEM_CONTROL_FORBIDDEN',
          message: '当前身份无权读取系统控制台。',
          retryable: false,
          action: 'use_system_control_identity',
          requestId: request.id,
        },
      });
    }
    return repository.getOverview();
  });

  app.get('/api/system-control/runtime/overview', {
    schema: { querystring: SystemControlRuntimeOverviewQuerySchema, response: { 200: SystemControlRuntimeOverviewSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_RUNTIME_READ)) return forbidden(reply, request.id);
    return runtimeService.getOverview();
  });

  app.get('/api/system-control/runtime/resources', {
    schema: { querystring: SystemControlRuntimeResourcesQuerySchema, response: { 200: SystemControlRuntimeResourceListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_RUNTIME_READ)) return forbidden(reply, request.id);
    return runtimeService.listResources(request.query);
  });

  app.get('/api/system-control/runtime/resources/:runtimeResourceId', {
    schema: { params: Type.Object({ runtimeResourceId: Type.String({ minLength: 1, maxLength: 120, pattern: '^[a-z0-9][a-z0-9:_-]{0,119}$' }) }, { additionalProperties: false }), response: { 200: SystemControlRuntimeResourceSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_RUNTIME_READ)) return forbidden(reply, request.id);
    const resource = await runtimeService.getResource(request.params.runtimeResourceId);
    if (!resource) return reply.code(404).send({ error: { code: 'SYSTEM_CONTROL_RUNTIME_RESOURCE_NOT_FOUND', message: '运行资源不存在。', retryable: false, action: 'refresh_runtime_resources', requestId: request.id } });
    return resource;
  });

  app.get('/api/system-control/operations', {
    schema: { querystring: SystemControlOperationsListQuerySchema, response: { 200: SystemControlOperationsListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_LOGS_READ)) return forbidden(reply, request.id);
    try { return await operationsService.list(request.query); } catch (error) { return sendOperationsError(reply, request.id, error); }
  });

  app.get('/api/system-control/operations/:operationId', {
    schema: { params: Type.Object({ operationId: Type.String({ minLength: 3, maxLength: 180, pattern: '^[a-z_]+:[0-9a-f-]{36}$' }) }, { additionalProperties: false }), response: { 200: SystemControlOperationDetailSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_LOGS_READ)) return forbidden(reply, request.id);
    try { return await operationsService.get(request.params.operationId); } catch (error) { return sendOperationsError(reply, request.id, error); }
  });

  app.get('/api/system-control/security', {
    schema: { response: { 200: SystemControlSecurityOverviewSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.securityOverview(); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets/discovery', {
    schema: { querystring: SystemControlSecretDiscoveryQuerySchema, response: { 200: SystemControlSecretDiscoveryListSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.listDiscovery(request.query); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets', {
    schema: { querystring: SystemControlSecretReferenceListQuerySchema, response: { 200: SystemControlSecretReferenceListSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.listReferences(request.query); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.post('/api/system-control/secrets', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlCreateSecretReferenceBodySchema, response: { 201: SystemControlSecretCommandSchema, 200: SystemControlSecretCommandSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_WRITE)) return forbidden(reply, request.id);
    try { const result = await secretService.createReference({ body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.command); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.post('/api/system-control/secrets/validations', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlCreateSecretValidationBodySchema, response: { 202: SystemControlSecretValidationSchema, 200: SystemControlSecretValidationSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_TEST)) return forbidden(reply, request.id);
    try { const result = await secretService.createValidation({ body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 202).header('x-idempotent-replay', String(result.replay)).send(result.validation); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets/validations', {
    schema: { querystring: SystemControlSecretValidationListQuerySchema, response: { 200: SystemControlSecretValidationListSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.listValidations(request.query); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets/validations/:validationRunId', {
    schema: { params: ValidationParamsSchema, response: { 200: SystemControlSecretValidationSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.getValidation(request.params.validationRunId); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets/commands/:commandId', {
    schema: { params: SystemControlSecretCommandIdParamsSchema, response: { 200: SystemControlSecretCommandSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.getCommand(request.params.commandId); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets/:id/usage', {
    schema: { params: UUIDParamsSchema, querystring: SystemControlSecretUsageListQuerySchema, response: { 200: SystemControlSecretUsageListSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.listUsage(request.params.id, request.query); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets/:id/audit-events', {
    schema: { params: UUIDParamsSchema, querystring: SystemControlSecretAuditListQuerySchema, response: { 200: SystemControlSecretAuditListSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.listAudit(request.params.id, request.query); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets/:id/versions/:versionId/validations', {
    schema: { params: SecretVersionParamsSchema, querystring: SystemControlSecretPageQuerySchema, response: { 200: SystemControlSecretValidationListSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.listVersionValidations(request.params.id, request.params.versionId, request.query); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets/:id/versions/:versionId/revoke-preflight', {
    schema: { params: SecretVersionParamsSchema, response: { 200: SystemControlSecretRevokePreflightSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.getRevokePreflight(request.params.id, request.params.versionId); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets/:id', {
    schema: { params: UUIDParamsSchema, response: { 200: SystemControlSecretReferenceSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.getReference(request.params.id); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/secrets/:id/versions', {
    schema: { params: UUIDParamsSchema, querystring: SystemControlSecretPageQuerySchema, response: { 200: SystemControlSecretReferenceVersionListSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_READ)) return forbidden(reply, request.id);
    try { return await secretService.listVersions(request.params.id, request.query); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.post('/api/system-control/secrets/:id/rotate', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlRotateSecretReferenceBodySchema, response: { 201: SystemControlSecretCommandSchema, 200: SystemControlSecretCommandSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_WRITE)) return forbidden(reply, request.id);
    try { const result = await secretService.rotateReference({ referenceId: request.params.id, body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.command); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.post('/api/system-control/secrets/:id/versions/:versionId/revoke', {
    schema: { params: SecretVersionParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlRevokeSecretReferenceBodySchema, response: { 201: SystemControlSecretCommandSchema, 200: SystemControlSecretCommandSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_SECRETS_WRITE)) return forbidden(reply, request.id);
    try { const result = await secretService.revokeReference({ referenceId: request.params.id, versionId: request.params.versionId, body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.command); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/engines', {
    schema: {
      querystring: SystemControlEngineListQuerySchema,
      response: { 200: SystemControlEngineListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_READ)) return forbidden(reply, request.id);
    try { return engineService.listDeployments(request.query); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/engines/:id', {
    schema: { params: UUIDParamsSchema, response: { 200: SystemControlEngineDetailSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_READ)) return forbidden(reply, request.id);
    try { return engineService.getDetail(request.params.id); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/engines/:id/versions', {
    schema: { params: UUIDParamsSchema, querystring: SystemControlEngineVersionListQuerySchema, response: { 200: SystemControlEngineVersionListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_READ)) return forbidden(reply, request.id);
    try { return engineService.listVersions(request.params.id, request.query); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/engines/:id/versions/:versionId', {
    schema: { params: EngineVersionParamsSchema, response: { 200: SystemControlEngineDeploymentVersionSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_READ)) return forbidden(reply, request.id);
    try { return engineService.getVersion(request.params.id, request.params.versionId); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.post('/api/system-control/engines', {
    schema: { body: SystemControlCreateEngineDeploymentBodySchema, response: { 201: SystemControlEngineDetailSchema, 200: SystemControlEngineDetailSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_WRITE)) return forbidden(reply, request.id);
    try {
      const result = await engineService.createDeployment({ body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! });
      return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.detail);
    } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.post('/api/system-control/engines/:id/versions', {
    schema: { params: UUIDParamsSchema, body: SystemControlCreateEngineVersionBodySchema, response: { 201: SystemControlEngineDeploymentVersionSchema, 200: SystemControlEngineDeploymentVersionSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_WRITE)) return forbidden(reply, request.id);
    try {
      const result = await engineService.createVersion({ deploymentId: request.params.id, body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! });
      return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.version);
    } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.post('/api/system-control/engines/:id/status', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlEngineStatusCommandBodySchema, response: { 201: SystemControlEngineStatusCommandSchema, 200: SystemControlEngineStatusCommandSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_WRITE)) return forbidden(reply, request.id);
    try {
      const result = await engineService.setDeploymentStatus({ deploymentId: request.params.id, body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! });
      return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.command);
    } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/engine-status-commands/:statusCommandId', {
    schema: { params: Type.Object({ statusCommandId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlEngineStatusCommandSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_READ)) return forbidden(reply, request.id);
    try { return await engineService.getStatusCommand(request.params.statusCommandId); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.post('/api/system-control/engine-connection-tests', {
    schema: { body: SystemControlCreateConnectionTestBodySchema, response: { 202: SystemControlConnectionTestSchema, 200: SystemControlConnectionTestSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_TEST)) return forbidden(reply, request.id);
    try {
      const result = await engineService.createConnectionTest({ body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! });
      return reply.code(result.replay ? 200 : 202).header('x-idempotent-replay', String(result.replay)).send(result.test);
    } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/engine-connection-tests', {
    schema: { querystring: SystemControlConnectionTestListQuerySchema, response: { 200: SystemControlConnectionTestListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_READ)) return forbidden(reply, request.id);
    try { return engineService.listConnectionTests(request.query); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.get('/api/system-control/engine-connection-tests/:id', {
    schema: { params: UUIDParamsSchema, response: { 200: SystemControlConnectionTestSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ENGINES_READ)) return forbidden(reply, request.id);
    try { return engineService.getConnectionTest(request.params.id); } catch (error) { return sendEngineError(reply, request.id, error); }
  });

  app.post('/api/system-control/cost-conversion-snapshots', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlCreateCostConversionSnapshotBodySchema, response: { 201: SystemControlCostConversionSnapshotSchema, 200: SystemControlCostConversionSnapshotSchema, 403: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_WRITE)) return forbidden(reply, request.id);
    try {
      const result = await costConversionService.create({ body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! });
      return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.snapshot);
    } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/cost-conversion-snapshots', {
    schema: { querystring: SystemControlCostConversionSnapshotListQuerySchema, response: { 200: SystemControlCostConversionSnapshotListSchema, 403: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { return await costConversionService.list(request.query); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/cost-conversion-snapshots/:id', {
    schema: { params: UUIDParamsSchema, response: { 200: SystemControlCostConversionSnapshotSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { return await costConversionService.get(request.params.id); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/budget-policies', {
    schema: { querystring: SystemControlBudgetPolicyListQuerySchema, response: { 200: SystemControlBudgetPolicyListSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { return await budgetService.list(request.query); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/budget-policies/:id', {
    schema: { params: UUIDParamsSchema, response: { 200: SystemControlBudgetPolicySchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { return await budgetService.get(request.params.id); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.post('/api/system-control/budget-policies', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlCreateBudgetPolicyBodySchema, response: { 201: SystemControlBudgetPolicySchema, 200: SystemControlBudgetPolicySchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_WRITE)) return forbidden(reply, request.id);
    try { const result = await budgetService.create({ body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.policy); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.post('/api/system-control/budget-policies/:id/tests', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlBudgetTestCommandBodySchema, response: { 200: SystemControlBudgetTestRunSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_WRITE)) return forbidden(reply, request.id);
    try { const result = await budgetService.test(request.params.id, request.body, { key: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); const test = await budgetService.getTestRun(request.body.budgetTestRunId); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(test); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/budget-policies/:id/tests/:testRunId', {
    schema: { params: Type.Object({ id: Type.String({ format: 'uuid' }), testRunId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlBudgetTestRunSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { const test = await budgetService.getTestRun(request.params.testRunId); if (test.budgetPolicyVersionId !== request.params.id) return reply.code(404).send({ error: { code: 'SYSTEM_CONTROL_BUDGET_POLICY_NOT_FOUND', message: '预算测试运行不存在。', retryable: false, action: 'reload_budget_policy', requestId: request.id } }); return test; } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/budget-policies/:id/tests', {
    schema: { params: UUIDParamsSchema, querystring: SystemControlBudgetTestRunListQuerySchema, response: { 200: SystemControlBudgetTestRunListSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { return await budgetService.listTestRuns(request.params.id, request.query); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.post('/api/system-control/budget-policies/:id/impact-check', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlBudgetCommandBodySchema, response: { 200: SystemControlBudgetPolicySchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_WRITE)) return forbidden(reply, request.id);
    try { const result = await budgetService.impactCheck(request.params.id, request.body, { key: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(result.policy); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.post('/api/system-control/budget-policies/:id/approve', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlBudgetCommandBodySchema, response: { 200: SystemControlBudgetPolicySchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_WRITE)) return forbidden(reply, request.id);
    try { const result = await budgetService.approve(request.params.id, request.body, { key: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(result.policy); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.post('/api/system-control/budget-policies/:id/publish', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlBudgetReleaseBodySchema, response: { 200: SystemControlBudgetCommandSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_PUBLISH)) return forbidden(reply, request.id);
    try { const result = await budgetService.publish(request.params.id, request.body, { key: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(result.command); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.post('/api/system-control/budget-policies/:id/rollback', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlBudgetRollbackBodySchema, response: { 200: SystemControlBudgetCommandSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_PUBLISH)) return forbidden(reply, request.id);
    try { const result = await budgetService.rollback(request.body, { key: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(result.command); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/budget-release-commands/:commandId', {
    schema: { params: Type.Object({ commandId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlBudgetCommandSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { return await budgetService.getCommand(request.params.commandId); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/budget-usage', {
    schema: { querystring: SystemControlBudgetUsageListQuerySchema, response: { 200: SystemControlBudgetUsageListSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { return await budgetService.listUsage(request.query); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/budget-overview', {
    schema: { response: { 200: SystemControlBudgetOverviewSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { return await budgetService.overview(); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/budget-audit-events', {
    schema: { querystring: SystemControlBudgetAuditListQuerySchema, response: { 200: SystemControlBudgetAuditListSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { return await budgetService.listAudit(request.query); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/budget-reservations/:id', {
    schema: { params: UUIDParamsSchema, response: { 200: SystemControlBudgetReservationSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_BUDGET_READ)) return forbidden(reply, request.id);
    try { return await budgetService.getReservation(request.params.id); } catch (error) { return sendBudgetError(reply, request.id, error); }
  });

  app.get('/api/system-control/routing', {
    schema: { querystring: SystemControlRoutingListQuerySchema, response: { 200: SystemControlRoutingListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ROUTING_READ)) return forbidden(reply, request.id);
    try { return await routingService.list(request.query); } catch (error) { return sendRoutingError(reply, request.id, error); }
  });

  app.get('/api/system-control/routing-audit-events', {
    schema: { querystring: SystemControlRoutingAuditListQuerySchema, response: { 200: SystemControlRoutingAuditListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ROUTING_READ)) return forbidden(reply, request.id);
    try { return await routingService.listAuditEvents(request.query); } catch (error) { return sendRoutingError(reply, request.id, error); }
  });

  app.get('/api/system-control/routing-commands/:commandId', {
    schema: { params: Type.Object({ commandId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlRoutingCommandSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ROUTING_READ)) return forbidden(reply, request.id);
    try { return await routingService.getCommand(request.params.commandId); } catch (error) { return sendRoutingError(reply, request.id, error); }
  });

  app.get('/api/system-control/routing/:id', {
    schema: { params: UUIDParamsSchema, response: { 200: SystemControlRoutingPolicyVersionSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ROUTING_READ)) return forbidden(reply, request.id);
    try { return await routingService.get(request.params.id); } catch (error) { return sendRoutingError(reply, request.id, error); }
  });

  app.post('/api/system-control/routing', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlCreateRoutingPolicyBodySchema, response: { 201: SystemControlRoutingPolicyVersionSchema, 200: SystemControlRoutingPolicyVersionSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ROUTING_WRITE)) return forbidden(reply, request.id);
    try { const result = await routingService.create({ body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, actor: principal!.subject }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.policy); } catch (error) { return sendRoutingError(reply, request.id, error); }
  });

  app.post('/api/system-control/routing/:id/test', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: Type.Object({}, { additionalProperties: false }), response: { 200: SystemControlRoutingPolicyVersionSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ROUTING_WRITE)) return forbidden(reply, request.id);
    try { const result = await routingService.test(request.params.id, { key: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, actor: principal!.subject }); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(result.policy); } catch (error) { return sendRoutingError(reply, request.id, error); }
  });

  app.post('/api/system-control/routing/:id/impact-check', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: Type.Object({}, { additionalProperties: false }), response: { 200: SystemControlRoutingPolicyVersionSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ROUTING_WRITE)) return forbidden(reply, request.id);
    try { const result = await routingService.impactCheck(request.params.id, { key: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, actor: principal!.subject }); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(result.policy); } catch (error) { return sendRoutingError(reply, request.id, error); }
  });

  app.post('/api/system-control/routing/:id/approve', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: Type.Object({}, { additionalProperties: false }), response: { 200: SystemControlRoutingPolicyVersionSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ROUTING_WRITE)) return forbidden(reply, request.id);
    try { const result = await routingService.approve(request.params.id, { key: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, actor: principal!.subject }); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(result.policy); } catch (error) { return sendRoutingError(reply, request.id, error); }
  });

  app.post('/api/system-control/routing/:id/publish', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlRoutingCommandBodySchema, response: { 200: SystemControlRoutingPolicyVersionSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ROUTING_PUBLISH)) return forbidden(reply, request.id);
    try { const result = await routingService.publish(request.params.id, { releaseCommandId: request.body.releaseCommandId, key: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, actor: principal!.subject }); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(result.policy); } catch (error) { return sendRoutingError(reply, request.id, error); }
  });

  app.post('/api/system-control/routing/:id/rollback', {
    schema: { params: UUIDParamsSchema, headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlRoutingRollbackBodySchema, response: { 200: SystemControlRoutingPolicyVersionSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_ROUTING_ROLLBACK)) return forbidden(reply, request.id);
    try { const result = await routingService.rollback({ targetRoutingVersionId: request.body.targetRoutingVersionId, releaseCommandId: request.body.releaseCommandId, key: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, actor: principal!.subject }); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(result.policy); } catch (error) { return sendRoutingError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/runtime-targets/pre_review', {
    schema: { response: { 200: SystemControlStrategyRuntimeTargetSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyRuntimeService.getTarget(); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.get('/api/system-control/strategy/runtime-targets/pre_review/versions/:strategyVersionId', {
    schema: { params: Type.Object({ strategyVersionId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlStrategyRuntimeVersionSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyRuntimeService.getVersion(request.params.strategyVersionId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.get('/api/system-control/strategy/runtime-targets/pre_review/baseline-preview', {
    schema: { response: { 200: SystemControlStrategyBaselinePreviewSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyRuntimeService.getBaselinePreview(); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.post('/api/system-control/strategy/runtime-targets/pre_review/baseline-imports', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlStrategyBaselineImportBodySchema, response: { 201: SystemControlStrategyRuntimeVersionSchema, 200: SystemControlStrategyRuntimeVersionSchema, 403: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_WRITE)) return forbidden(reply, request.id);
    try { const result = await strategyRuntimeService.importBaseline({ ...request.body, idempotencyKey: request.headers['idempotency-key'], requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.version); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.get('/api/system-control/strategy/runtime-targets/pre_review/baseline-imports/:baselineImportId', {
    schema: { params: Type.Object({ baselineImportId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlStrategyRuntimeVersionSchema, 403: ApiErrorSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyRuntimeService.getBaselineImport(request.params.baselineImportId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.post('/api/system-control/strategy/runtime-targets/pre_review/impact-runs', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlStrategyImpactRunBodySchema, response: { 201: SystemControlStrategyImpactRunSchema, 200: SystemControlStrategyImpactRunSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_EVALUATE)) return forbidden(reply, request.id);
    try { const result = await strategyRuntimeService.createImpact({ impactRunId: request.body.impactRunId, strategyVersionId: request.body.strategyVersionId, idempotencyKey: request.headers['idempotency-key'], requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.run); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.get('/api/system-control/strategy/runtime-targets/pre_review/impact-runs/:impactRunId', {
    schema: { params: Type.Object({ impactRunId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlStrategyImpactRunSchema, 403: ApiErrorSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyRuntimeService.getImpact(request.params.impactRunId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.post('/api/system-control/strategy/runtime-targets/pre_review/approvals', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlStrategyApprovalBodySchema, response: { 201: SystemControlStrategyApprovalSchema, 200: SystemControlStrategyApprovalSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_APPROVE)) return forbidden(reply, request.id);
    try { const result = await strategyRuntimeService.approve({ ...request.body, idempotencyKey: request.headers['idempotency-key'], requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.approval); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.get('/api/system-control/strategy/runtime-targets/pre_review/approvals/:approvalId', {
    schema: { params: Type.Object({ approvalId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlStrategyApprovalSchema, 403: ApiErrorSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyRuntimeService.getApproval(request.params.approvalId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.post('/api/system-control/strategy/runtime-targets/pre_review/releases', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlStrategyReleaseBodySchema, response: { 201: SystemControlStrategyReleaseCommandSchema, 200: SystemControlStrategyReleaseCommandSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_RELEASE)) return forbidden(reply, request.id);
    try { const result = await strategyRuntimeService.release({ ...request.body, idempotencyKey: request.headers['idempotency-key'], requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.command); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.get('/api/system-control/strategy/runtime-targets/pre_review/release-commands/:releaseCommandId', {
    schema: { params: Type.Object({ releaseCommandId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlStrategyReleaseCommandSchema, 403: ApiErrorSchema, 404: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyRuntimeService.getReleaseCommand(request.params.releaseCommandId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
  app.get('/api/system-control/strategy/runtime-targets/pre_review/history', {
    schema: { querystring: SystemControlStrategyHistoryQuerySchema, response: { 200: SystemControlStrategyHistorySchema, 400: ApiErrorSchema, 403: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request); if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyRuntimeService.listHistory(request.query); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/events', {
    schema: { querystring: SystemControlStrategyEventListQuerySchema, response: { 200: SystemControlStrategyEventListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyService.listEvents(request.query); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/events/:eventRefId', {
    schema: { params: Type.Object({ eventRefId: Type.String({ minLength: 3, maxLength: 220 }) }, { additionalProperties: false }), response: { 200: SystemControlStrategyEventSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyService.getEvent(request.params.eventRefId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/artifacts', {
    schema: { querystring: SystemControlStrategyArtifactListQuerySchema, response: { 200: SystemControlStrategyArtifactListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyService.listArtifacts(request.query); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/artifacts/:artifactId', {
    schema: { params: Type.Object({ artifactId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlStrategyArtifactSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyService.getArtifact(request.params.artifactId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/artifacts/:artifactId/versions', {
    schema: { params: Type.Object({ artifactId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), querystring: SystemControlStrategyVersionListQuerySchema, response: { 200: SystemControlStrategyVersionListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyService.listVersions(request.params.artifactId, request.query); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/artifacts/:artifactId/versions/:versionId', {
    schema: { params: Type.Object({ artifactId: Type.String({ format: 'uuid' }), versionId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlStrategyVersionSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyService.getVersion(request.params.artifactId, request.params.versionId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.post('/api/system-control/strategy/artifacts', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlStrategyCreateArtifactBodySchema, response: { 201: SystemControlStrategyArtifactSchema, 200: SystemControlStrategyArtifactSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_WRITE)) return forbidden(reply, request.id);
    try { const result = await strategyService.createArtifact({ body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.artifact); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.post('/api/system-control/strategy/artifacts/:artifactId/versions', {
    schema: { params: Type.Object({ artifactId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlStrategyCreateVersionBodySchema, response: { 201: SystemControlStrategyVersionSchema, 200: SystemControlStrategyVersionSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_WRITE)) return forbidden(reply, request.id);
    try { const result = await strategyService.createVersion({ artifactId: request.params.artifactId, body: request.body, idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 201).header('x-idempotent-replay', String(result.replay)).send(result.version); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/optimization-runs', {
    schema: { querystring: SystemControlOptimizationRunListQuerySchema, response: { 200: SystemControlOptimizationRunListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyOptimizationService.listRuns(request.query); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/optimization-runs/:runId', {
    schema: { params: Type.Object({ runId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlOptimizationRunSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyOptimizationService.getRun(request.params.runId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.post('/api/system-control/strategy/optimization-runs', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlCreateOptimizationRunBodySchema, response: { 202: SystemControlOptimizationRunSchema, 200: SystemControlOptimizationRunSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_WRITE)) return forbidden(reply, request.id);
    try { const result = await strategyOptimizationService.createOptimization(request.body, { idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 202).header('x-idempotent-replay', String(result.replay)).send(result.run); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/candidates', {
    schema: { querystring: SystemControlStrategyCandidateListQuerySchema, response: { 200: SystemControlStrategyCandidateListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyOptimizationService.listCandidates(request.query); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/candidates/:candidateId', {
    schema: { params: Type.Object({ candidateId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlStrategyCandidateSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyOptimizationService.getCandidate(request.params.candidateId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.post('/api/system-control/strategy/candidates/:candidateId/decisions', {
    schema: { params: Type.Object({ candidateId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlStrategyCandidateDecisionBodySchema, response: { 200: SystemControlStrategyCandidateSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_WRITE)) return forbidden(reply, request.id);
    try { const result = await strategyOptimizationService.decide(request.params.candidateId, request.body, { idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(200).header('x-idempotent-replay', String(result.replay)).send(result.candidate); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/candidate-decisions/:decisionId', {
    schema: { params: Type.Object({ decisionId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlStrategyCandidateDecisionResultSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyOptimizationService.getDecision(request.params.decisionId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/evaluations', {
    schema: { querystring: SystemControlEvaluationRunListQuerySchema, response: { 200: SystemControlEvaluationRunListSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyOptimizationService.listEvaluations(request.query); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.get('/api/system-control/strategy/evaluations/:evaluationRunId', {
    schema: { params: Type.Object({ evaluationRunId: Type.String({ format: 'uuid' }) }, { additionalProperties: false }), response: { 200: SystemControlEvaluationRunSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_READ)) return forbidden(reply, request.id);
    try { return await strategyOptimizationService.getEvaluation(request.params.evaluationRunId); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });

  app.post('/api/system-control/strategy/evaluations', {
    schema: { headers: Type.Object({ 'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }) }), body: SystemControlCreateEvaluationRunBodySchema, response: { 202: SystemControlEvaluationRunSchema, 200: SystemControlEvaluationRunSchema, 400: ApiErrorSchema, 403: ApiErrorSchema, 404: ApiErrorSchema, 409: ApiErrorSchema, 422: ApiErrorSchema, 500: ApiErrorSchema } },
  }, async (request, reply) => {
    const principal = await app.systemControlPrincipalResolver(request);
    if (!canUseSystemControlCapability(principal, SYSTEM_CONTROL_STRATEGY_EVALUATE)) return forbidden(reply, request.id);
    try { const result = await strategyOptimizationService.createEvaluation(request.body, { idempotencyKey: idempotencyKey(request.headers['idempotency-key']) ?? '', requestId: request.id, principal: principal! }); return reply.code(result.replay ? 200 : 202).header('x-idempotent-replay', String(result.replay)).send(result.evaluation); } catch (error) { return sendStrategyError(reply, request.id, error); }
  });
};
