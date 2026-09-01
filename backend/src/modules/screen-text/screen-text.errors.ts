export type ScreenTextErrorCode =
  | 'SCREEN_TEXT_PROJECT_NOT_FOUND' | 'SCREEN_TEXT_PROJECT_NOT_ACTIVE'
  | 'SCREEN_TEXT_MANIFEST_NOT_FOUND' | 'SCREEN_TEXT_VIDEO_NOT_READY'
  | 'SCREEN_TEXT_TERM_VERSION_NOT_FOUND' | 'SCREEN_TEXT_BATCH_ACTIVE'
  | 'SCREEN_TEXT_BATCH_NOT_FOUND' | 'SCREEN_TEXT_BATCH_STALE'
  | 'SCREEN_TEXT_JOB_NOT_FOUND' | 'SCREEN_TEXT_CANDIDATE_NOT_FOUND'
  | 'SCREEN_TEXT_CANDIDATE_VERSION_CONFLICT' | 'SCREEN_TEXT_DECISION_INVALID'
  | 'SCREEN_TEXT_IDEMPOTENCY_KEY_REUSED' | 'SCREEN_TEXT_EPISODE_NOT_EMPTY'
  | 'SCREEN_TEXT_RETRY_INVALID' | 'SCREEN_TEXT_RELEASE_BLOCKED'
  | 'SCREEN_TEXT_PARTIAL_RELEASE_BLOCKED'
  | 'SCREEN_TEXT_RELEASE_NOT_FOUND' | 'SCREEN_TEXT_EXPORT_NOT_FOUND'
  | 'SCREEN_TEXT_PLAYBACK_GRANT_INVALID' | 'SCREEN_TEXT_PLAYBACK_NOT_AVAILABLE'
  | 'SCREEN_TEXT_EVIDENCE_NOT_AVAILABLE'
  | 'SCREEN_TEXT_TERM_VERSION_NOT_LATEST' | 'SCREEN_TEXT_PAIR_INVALID'
  | 'SCREEN_TEXT_ADAPTER_UNAVAILABLE'
  | 'SCREEN_TEXT_ROUTING_NOT_ACTIVE';

export class ScreenTextDomainError extends Error {
  constructor(
    readonly code: ScreenTextErrorCode,
    message: string,
    readonly statusCode: number,
    readonly action: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'ScreenTextDomainError';
  }
}

export const screenTextConflict = (
  code: ScreenTextErrorCode,
  message: string,
  action = 'reload_screen_text',
) => new ScreenTextDomainError(code, message, 409, action);

export const screenTextInvalid = (
  code: ScreenTextErrorCode,
  message: string,
  action = 'edit_screen_text',
) => new ScreenTextDomainError(code, message, 422, action);

export const screenTextNotFound = (code: ScreenTextErrorCode, message: string) =>
  new ScreenTextDomainError(code, message, 404, 'reload_screen_text');
