import type {
  FeedbackCreateBody,
  FeedbackReport,
  FeedbackReportDetail,
  FeedbackScreenshotAttachment,
  FeedbackScreenshotAuthorizationBody,
} from '@qimao-terms-cloud/contracts';

export class FeedbackApiError extends Error {
  readonly requestId: string | null;
  readonly retryable: boolean;
  readonly status: number;
  constructor(message: string, status: number, requestId: string | null = null, retryable = false) {
    super(message);
    this.name = 'FeedbackApiError';
    this.status = status;
    this.requestId = requestId;
    this.retryable = retryable;
  }
}

const parseError = async (response: Response) => {
  let body: { error?: { message?: string; requestId?: string | null; retryable?: boolean } } | null = null;
  try { body = await response.json() as { error?: { message?: string; requestId?: string | null; retryable?: boolean } }; } catch { /* non-JSON response */ }
  const error = body?.error;
  return new FeedbackApiError(error?.message ?? `请求失败（${response.status}）`, response.status, error?.requestId ?? null, error?.retryable ?? response.status >= 500);
};

const requestJson = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  let response: Response;
  try { response = await fetch(input, { credentials: 'same-origin', ...init }); }
  catch (error) { throw new FeedbackApiError(error instanceof Error ? error.message : '网络请求失败', 0, null, true); }
  if (!response.ok) throw await parseError(response);
  return await response.json() as T;
};

export const createFeedback = (body: FeedbackCreateBody, key: string) => requestJson<FeedbackReport>('/api/feedback-reports', { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) });
export const getFeedback = (feedbackId: string) => requestJson<FeedbackReportDetail>(`/api/feedback-reports/${encodeURIComponent(feedbackId)}`);
export const getFeedbackAttachment = (feedbackId: string, attachmentId: string) => requestJson<FeedbackScreenshotAttachment>(`/api/feedback-reports/${encodeURIComponent(feedbackId)}/screenshot-authorizations/${encodeURIComponent(attachmentId)}`);
export const authorizeScreenshot = (feedbackId: string, body: FeedbackScreenshotAuthorizationBody, key: string) => requestJson<FeedbackReportDetail>(`/api/feedback-reports/${encodeURIComponent(feedbackId)}/screenshot-authorizations`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) });
export const uploadScreenshot = (feedbackId: string, attachmentId: string, bytes: ArrayBuffer, contentType: string, key: string) => requestJson<FeedbackReportDetail>(`/api/feedback-reports/${encodeURIComponent(feedbackId)}/screenshot-authorizations/${encodeURIComponent(attachmentId)}/content`, { method: 'POST', headers: { 'content-type': contentType, 'Idempotency-Key': key }, body: bytes });
export const completeScreenshot = (feedbackId: string, attachmentId: string, key: string) => requestJson<FeedbackReportDetail>(`/api/feedback-reports/${encodeURIComponent(feedbackId)}/screenshot-authorizations/${encodeURIComponent(attachmentId)}/complete`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: '{}' });
