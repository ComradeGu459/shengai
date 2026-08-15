export type AsrErrorCode =
  | 'ASR_PROJECT_NOT_FOUND'
  | 'ASR_PROJECT_NOT_ACTIVE'
  | 'ASR_BATCH_NOT_FOUND'
  | 'ASR_BATCH_SCOPE_EMPTY'
  | 'ASR_SOURCE_NOT_READY'
  | 'ASR_TERM_VERSION_NOT_FOUND'
  | 'ASR_IDEMPOTENCY_KEY_REUSED'
  | 'ASR_RETRY_SCOPE_INVALID'
  | 'ASR_SOURCE_CHANGED'
  | 'ASR_BATCH_ALREADY_ACTIVE'
  | 'ASR_HOTWORD_EVIDENCE_MISMATCH'
  | 'ASR_DISPATCH_NOT_FOUND'
  | 'ASR_DISPATCH_IDEMPOTENCY_KEY_REUSED'
  | 'ASR_DISPATCH_GROUP_ID_REUSED'
  | 'ASR_DISPATCH_CANCEL_IDEMPOTENCY_KEY_REUSED'
  | 'ASR_FAKE_DISABLED';

export class AsrDomainError extends Error {
  constructor(
    readonly code: AsrErrorCode,
    message: string,
    readonly statusCode: number,
    readonly action: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'AsrDomainError';
  }
}

export const asrConflict = (code: AsrErrorCode, message: string, action = 'reload_asr') =>
  new AsrDomainError(code, message, 409, action);

export const asrNotFound = (code: AsrErrorCode, message: string) =>
  new AsrDomainError(code, message, 404, 'reload_asr');

export const asrInvalid = (code: AsrErrorCode, message: string, action = 'edit_asr_scope') =>
  new AsrDomainError(code, message, 422, action);
