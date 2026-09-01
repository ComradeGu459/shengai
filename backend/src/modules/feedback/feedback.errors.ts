export type FeedbackErrorCode =
  | 'FEEDBACK_NOT_FOUND'
  | 'FEEDBACK_FORBIDDEN'
  | 'FEEDBACK_ID_REUSED'
  | 'FEEDBACK_IDEMPOTENCY_KEY_REUSED'
  | 'FEEDBACK_EVENT_ID_REUSED'
  | 'FEEDBACK_EVENT_NOT_ALLOWED'
  | 'FEEDBACK_VERSION_CONFLICT'
  | 'FEEDBACK_PROJECT_NOT_FOUND'
  | 'FEEDBACK_TASK_NOT_FOUND'
  | 'FEEDBACK_ATTACHMENT_NOT_FOUND'
  | 'FEEDBACK_ATTACHMENT_ID_REUSED'
  | 'FEEDBACK_ATTACHMENT_NOT_ALLOWED'
  | 'FEEDBACK_ATTACHMENT_MISMATCH'
  | 'FEEDBACK_ATTACHMENT_STORAGE_FAILED'
  | 'FEEDBACK_INVALID_CONTEXT';

export class FeedbackError extends Error {
  constructor(
    readonly code: FeedbackErrorCode,
    message: string,
    readonly statusCode: 400 | 403 | 404 | 409 | 422,
    readonly action: string,
  ) {
    super(message);
    this.name = 'FeedbackError';
  }
}

export const feedbackNotFound = () => new FeedbackError('FEEDBACK_NOT_FOUND', '反馈不存在或当前身份无权查看。', 404, 'refresh_feedback');
export const feedbackForbidden = () => new FeedbackError('FEEDBACK_FORBIDDEN', '当前身份无权访问该反馈。', 403, 'use_feedback_identity');
export const feedbackConflict = (code: FeedbackErrorCode, message: string, action = 'refresh_feedback') => new FeedbackError(code, message, 409, action);
export const feedbackInvalid = (code: FeedbackErrorCode, message: string, action = 'review_feedback_request') => new FeedbackError(code, message, 422, action);
