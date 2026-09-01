export type PreReviewErrorCode =
  | 'PRE_EDIT_PROJECT_NOT_FOUND'
  | 'PRE_EDIT_PROJECT_NOT_ACTIVE'
  | 'PRE_EDIT_STRATEGY_NOT_ACTIVE'
  | 'PRE_EDIT_SOURCE_NOT_READY'
  | 'PRE_EDIT_SOURCE_CHANGED'
  | 'PRE_EDIT_TERM_VERSION_NOT_FOUND'
  | 'PRE_EDIT_TERM_VERSION_STALE'
  | 'PRE_EDIT_SESSION_NOT_FOUND'
  | 'PRE_EDIT_SESSION_ACTIVE'
  | 'PRE_EDIT_SESSION_NOT_WRITABLE'
  | 'PRE_EDIT_SESSION_VERSION_CONFLICT'
  | 'PRE_EDIT_EPISODE_NOT_FOUND'
  | 'PRE_EDIT_EPISODE_VERSION_CONFLICT'
  | 'PRE_EDIT_ITEM_NOT_FOUND'
  | 'PRE_EDIT_ITEM_VERSION_CONFLICT'
  | 'PRE_EDIT_ACTION_INVALID'
  | 'PRE_EDIT_DECISION_NOT_REVERSIBLE'
  | 'PRE_EDIT_POLICY_SCOPE_INVALID'
  | 'PRE_EDIT_COMPLETION_BLOCKED'
  | 'PRE_EDIT_RELEASE_BLOCKED'
  | 'PRE_EDIT_RELEASE_NOT_FOUND'
  | 'PRE_EDIT_PLAYBACK_NOT_AVAILABLE'
  | 'PRE_EDIT_PLAYBACK_GRANT_INVALID'
  | 'PRE_EDIT_IDEMPOTENCY_KEY_REUSED';

export class PreReviewDomainError extends Error {
  constructor(
    readonly code: PreReviewErrorCode,
    message: string,
    readonly statusCode: number,
    readonly action: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'PreReviewDomainError';
  }
}

export const preReviewConflict = (
  code: PreReviewErrorCode,
  message: string,
  action = 'reload_pre_edit',
) => new PreReviewDomainError(code, message, 409, action);

export const preReviewInvalid = (
  code: PreReviewErrorCode,
  message: string,
  action = 'edit_pre_edit',
) => new PreReviewDomainError(code, message, 422, action);

export const preReviewNotFound = (code: PreReviewErrorCode, message: string) =>
  new PreReviewDomainError(code, message, 404, 'reload_pre_edit');
