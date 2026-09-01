export type SystemControlRoutingErrorCode =
  | 'SYSTEM_CONTROL_ROUTING_NOT_FOUND'
  | 'SYSTEM_CONTROL_ROUTING_IDEMPOTENCY_KEY_REUSED'
  | 'SYSTEM_CONTROL_ROUTING_ID_REUSED'
  | 'SYSTEM_CONTROL_ROUTING_INVALID_TRANSITION'
  | 'SYSTEM_CONTROL_ROUTING_IMPACT_BLOCKED'
  | 'SYSTEM_CONTROL_ROUTING_NO_ACTIVE'
  | 'SYSTEM_CONTROL_ROUTING_DEPLOYMENT_INVALID'
  | 'SYSTEM_CONTROL_ROUTING_COMMAND_ID_REUSED';

export class SystemControlRoutingError extends Error {
  constructor(
    readonly code: SystemControlRoutingErrorCode,
    message: string,
    readonly statusCode: 404 | 409 | 422,
    readonly action: string,
  ) { super(message); this.name = 'SystemControlRoutingError'; }
}

export const routingNotFound = (message: string) => new SystemControlRoutingError('SYSTEM_CONTROL_ROUTING_NOT_FOUND', message, 404, 'reload_routing');
export const routingConflict = (code: SystemControlRoutingErrorCode, message: string, action = 'retry_with_new_idempotency_key') => new SystemControlRoutingError(code, message, 409, action);
export const routingInvalid = (code: SystemControlRoutingErrorCode, message: string, action = 'review_routing_request') => new SystemControlRoutingError(code, message, 422, action);
