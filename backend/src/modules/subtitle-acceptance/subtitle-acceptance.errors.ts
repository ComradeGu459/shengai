export type SubtitleAcceptanceErrorCode =
  | 'ACCEPTANCE_PROJECT_NOT_FOUND'
  | 'ACCEPTANCE_PROJECT_NOT_ACTIVE'
  | 'ACCEPTANCE_SOURCE_NOT_READY'
  | 'ACCEPTANCE_SOURCE_CHANGED'
  | 'ACCEPTANCE_SESSION_NOT_FOUND'
  | 'ACCEPTANCE_SESSION_ACTIVE'
  | 'ACCEPTANCE_SESSION_NOT_WRITABLE'
  | 'ACCEPTANCE_SESSION_VERSION_CONFLICT'
  | 'ACCEPTANCE_EPISODE_NOT_FOUND'
  | 'ACCEPTANCE_EPISODE_VERSION_CONFLICT'
  | 'ACCEPTANCE_CUE_NOT_FOUND'
  | 'ACCEPTANCE_ISSUE_NOT_FOUND'
  | 'ACCEPTANCE_EDIT_NOT_REVERSIBLE'
  | 'ACCEPTANCE_PASS_BLOCKED'
  | 'ACCEPTANCE_RELEASE_BLOCKED'
  | 'ACCEPTANCE_RELEASE_NOT_FOUND'
  | 'ACCEPTANCE_PLAYBACK_NOT_AVAILABLE'
  | 'ACCEPTANCE_PLAYBACK_GRANT_INVALID'
  | 'ACCEPTANCE_REWORK_REASON_INVALID'
  | 'ACCEPTANCE_IDEMPOTENCY_KEY_REUSED';

export class SubtitleAcceptanceError extends Error {
  constructor(
    readonly code: SubtitleAcceptanceErrorCode,
    message: string,
    readonly statusCode: number,
    readonly action: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'SubtitleAcceptanceError';
  }
}

export const acceptanceNotFound = (code: SubtitleAcceptanceErrorCode, message: string) =>
  new SubtitleAcceptanceError(code, message, 404, 'reload_acceptance');

export const acceptanceConflict = (
  code: SubtitleAcceptanceErrorCode,
  message: string,
  action = 'reload_acceptance',
) => new SubtitleAcceptanceError(code, message, 409, action);

export const acceptanceInvalid = (
  code: SubtitleAcceptanceErrorCode,
  message: string,
  action = 'edit_acceptance',
) => new SubtitleAcceptanceError(code, message, 422, action);
