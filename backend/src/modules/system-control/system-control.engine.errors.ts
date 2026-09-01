export type SystemControlEngineErrorCode =
  | 'SYSTEM_CONTROL_ENGINE_NOT_FOUND'
  | 'SYSTEM_CONTROL_ENGINE_VERSION_NOT_FOUND'
  | 'SYSTEM_CONTROL_ENGINE_IDEMPOTENCY_KEY_REUSED'
  | 'SYSTEM_CONTROL_ENGINE_ID_REUSED'
  | 'SYSTEM_CONTROL_ENGINE_VERSION_ID_REUSED'
  | 'SYSTEM_CONTROL_ENGINE_INVALID_REFERENCE'
  | 'SYSTEM_CONTROL_ENGINE_SECRET_REFERENCE_UNKNOWN'
  | 'SYSTEM_CONTROL_ENGINE_SECRET_REFERENCE_UNAVAILABLE'
  | 'SYSTEM_CONTROL_ENGINE_ADAPTER_NOT_REGISTERED'
  | 'SYSTEM_CONTROL_ENGINE_CAPABILITY_MISMATCH'
  | 'SYSTEM_CONTROL_ENGINE_EXECUTION_KIND_MISMATCH'
  | 'SYSTEM_CONTROL_ENGINE_VERSION_IMMUTABLE'
  | 'SYSTEM_CONTROL_ENGINE_STATUS_COMMAND_NOT_FOUND'
  | 'SYSTEM_CONTROL_ENGINE_STATUS_COMMAND_ID_REUSED'
  | 'SYSTEM_CONTROL_ENGINE_DISABLED_ACTIVE_ROUTE'
  | 'SYSTEM_CONTROL_CONNECTION_TEST_NOT_FOUND'
  | 'SYSTEM_CONTROL_CONNECTION_TEST_ID_REUSED'
  | 'SYSTEM_CONTROL_SECRET_REFERENCE_NOT_FOUND'
  | 'SYSTEM_CONTROL_SECRET_REFERENCE_VERSION_NOT_FOUND'
  | 'SYSTEM_CONTROL_SECRET_CANDIDATE_UNKNOWN'
  | 'SYSTEM_CONTROL_SECRET_PROVIDER_UNAVAILABLE'
  | 'SYSTEM_CONTROL_SECRET_REFERENCE_ID_REUSED'
  | 'SYSTEM_CONTROL_SECRET_REFERENCE_VERSION_ID_REUSED'
  | 'SYSTEM_CONTROL_SECRET_COMMAND_ID_REUSED'
  | 'SYSTEM_CONTROL_SECRET_VALIDATION_NOT_FOUND'
  | 'SYSTEM_CONTROL_SECRET_VALIDATION_ID_REUSED'
  | 'SYSTEM_CONTROL_SECRET_REVOKE_ACTIVE'
  | 'SYSTEM_CONTROL_SECRET_REVOKE_NON_TERMINAL'
  | 'SYSTEM_CONTROL_SECRET_REVOKE_REASON_INVALID'
  | 'SYSTEM_CONTROL_SECRET_COMMAND_NOT_FOUND';

export class SystemControlEngineError extends Error {
  constructor(
    readonly code: SystemControlEngineErrorCode,
    message: string,
    readonly statusCode: 400 | 404 | 409 | 422,
    readonly action: string,
  ) {
    super(message);
    this.name = 'SystemControlEngineError';
  }
}

export const engineNotFound = (message: string) => new SystemControlEngineError(
  'SYSTEM_CONTROL_ENGINE_NOT_FOUND', message, 404, 'reload_engines',
);

export const versionNotFound = (message: string) => new SystemControlEngineError(
  'SYSTEM_CONTROL_ENGINE_VERSION_NOT_FOUND', message, 404, 'reload_engine_versions',
);

export const connectionTestNotFound = (message: string) => new SystemControlEngineError(
  'SYSTEM_CONTROL_CONNECTION_TEST_NOT_FOUND', message, 404, 'reload_connection_test',
);

export const statusCommandNotFound = (message: string) => new SystemControlEngineError(
  'SYSTEM_CONTROL_ENGINE_STATUS_COMMAND_NOT_FOUND', message, 404, 'reload_engine_status_command',
);

export const engineConflict = (code: SystemControlEngineErrorCode, message: string, action = 'retry_with_new_idempotency_key') =>
  new SystemControlEngineError(code, message, 409, action);

export const engineInvalid = (code: SystemControlEngineErrorCode, message: string, action = 'review_engine_request') =>
  new SystemControlEngineError(code, message, 422, action);

export const secretCommandNotFound = (message: string) => new SystemControlEngineError(
  'SYSTEM_CONTROL_SECRET_COMMAND_NOT_FOUND', message, 404, 'reload_secret_command',
);
