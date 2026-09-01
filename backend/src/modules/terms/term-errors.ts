export type TermErrorCode =
  | 'TERM_PROJECT_NOT_FOUND'
  | 'TERM_PROJECT_NOT_ACTIVE'
  | 'TERM_SOURCE_NOT_READY'
  | 'TERM_SOURCE_CHANGED'
  | 'TERM_SOURCE_OBJECT_MISSING'
  | 'TERM_SOURCE_CONTENT_INVALID'
  | 'TERM_SRT_INVALID'
  | 'TERM_EXTRACTION_ACTIVE_DRAFT_EXISTS'
  | 'TERM_EXTRACTION_FAILED'
  | 'TERM_EXTRACTION_RUNNING'
  | 'TERM_ROUTING_NOT_ACTIVE'
  | 'TERM_IDEMPOTENCY_KEY_REUSED'
  | 'TERM_DRAFT_NOT_FOUND'
  | 'TERM_DRAFT_NOT_ACTIVE'
  | 'TERM_DRAFT_VERSION_CONFLICT'
  | 'TERM_CANDIDATE_NOT_FOUND'
  | 'TERM_CANDIDATE_VERSION_CONFLICT'
  | 'TERM_CANDIDATE_INVALID'
  | 'TERM_CANDIDATE_STATE_INVALID'
  | 'TERM_VERSION_PENDING_CANDIDATES'
  | 'TERM_VERSION_NOT_FOUND'
  | 'TERM_EXPORT_TEMPLATE_NOT_FOUND'
  | 'TERM_EXPORT_TEMPLATE_INVALID'
  | 'TERM_EXPORT_TEMPLATE_VERSION_CONFLICT'
  | 'TERM_EXPORT_NOT_FOUND';

export class TermDomainError extends Error {
  constructor(
    readonly code: TermErrorCode,
    message: string,
    readonly statusCode: number,
    readonly action: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'TermDomainError';
  }
}

export const termConflict = (code: TermErrorCode, message: string, action = 'reload_terms') =>
  new TermDomainError(code, message, 409, action);

export const termNotFound = (code: TermErrorCode, message: string) =>
  new TermDomainError(code, message, 404, 'reload_terms');

export const termInvalid = (code: TermErrorCode, message: string, action = 'fix_source') =>
  new TermDomainError(code, message, 422, action);
