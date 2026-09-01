export type DeliveryErrorCode =
  | 'DELIVERY_PROJECT_NOT_FOUND' | 'DELIVERY_PROJECT_NOT_ACTIVE'
  | 'DELIVERY_SESSION_NOT_FOUND' | 'DELIVERY_SESSION_VERSION_CONFLICT'
  | 'DELIVERY_SESSION_NOT_READY' | 'DELIVERY_SOURCE_STALE'
  | 'DELIVERY_SOURCE_VERSION_CONFLICT' | 'DELIVERY_TEMPLATE_VERSION_CONFLICT'
  | 'DELIVERY_TERM_VERSION_NOT_FOUND' | 'DELIVERY_TEMPLATE_NOT_FOUND'
  | 'DELIVERY_GENERATION_BLOCKED' | 'DELIVERY_IDEMPOTENCY_KEY_REUSED' | 'DELIVERY_DELIVERY_ID_REUSED'
  | 'DELIVERY_SESSION_ALREADY_DELIVERED' | 'DELIVERY_JOB_NOT_FOUND'
  | 'DELIVERY_NOT_FOUND' | 'DELIVERY_FILE_NOT_FOUND' | 'DELIVERY_FILE_NOT_AVAILABLE'
  | 'DELIVERY_NOT_MUTABLE' | 'DELIVERY_GENERATION_FAILED' | 'DELIVERY_STORAGE_OBJECT_INVALID';

export class DeliveryDomainError extends Error {
  constructor(
    readonly code: DeliveryErrorCode,
    message: string,
    readonly statusCode: number,
    readonly action: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'DeliveryDomainError';
  }
}

export const deliveryNotFound = (code: DeliveryErrorCode, message: string) =>
  new DeliveryDomainError(code, message, 404, 'reload_deliveries');
export const deliveryConflict = (code: DeliveryErrorCode, message: string, action = 'reload_deliveries') =>
  new DeliveryDomainError(code, message, 409, action);
export const deliveryInvalid = (code: DeliveryErrorCode, message: string, action = 'review_delivery') =>
  new DeliveryDomainError(code, message, 422, action);
