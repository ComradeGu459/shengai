import type {
  FeedbackEvent,
  FeedbackEventBody,
  FeedbackEventList,
  FeedbackList,
  FeedbackListQuery,
  FeedbackReportDetail,
} from '@qimao-terms-cloud/contracts';

export class FeedbackApiError extends Error {
  readonly requestId: string | null;
  readonly retryable: boolean;
  readonly status: number;
  constructor(message: string, status: number, requestId: string | null = null, retryable = false) { super(message); this.name = 'FeedbackApiError'; this.status = status; this.requestId = requestId; this.retryable = retryable; }
}
const parseError = async (response: Response) => {
  let body: { error?: { message?: string; requestId?: string | null; retryable?: boolean } } | null = null;
  try { body = await response.json() as { error?: { message?: string; requestId?: string | null; retryable?: boolean } }; } catch { /* non-json */ }
  const value = body?.error;
  return new FeedbackApiError(value?.message ?? `请求失败（${response.status}）`, response.status, value?.requestId ?? null, value?.retryable ?? response.status >= 500);
};
const requestJson = async <T>(url: string, init?: RequestInit) => {
  let response: Response;
  try { response = await fetch(url, { credentials: 'same-origin', ...init }); }
  catch (error) { throw new FeedbackApiError(error instanceof Error ? error.message : '网络请求结果未知', 0, null, true); }
  if (!response.ok) throw await parseError(response);
  return await response.json() as T;
};
const queryString = (query: FeedbackListQuery) => Object.entries(query).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');
const withSignal = (signal?: AbortSignal): RequestInit => signal ? { signal } : {};
export const listFeedback = (query: FeedbackListQuery, signal?: AbortSignal) => requestJson<FeedbackList>(`/api/system-control/feedback-reports${queryString(query) ? `?${queryString(query)}` : ''}`, withSignal(signal));
export const getFeedback = (feedbackId: string, signal?: AbortSignal) => requestJson<FeedbackReportDetail>(`/api/system-control/feedback-reports/${encodeURIComponent(feedbackId)}`, withSignal(signal));
export const listFeedbackEvents = (feedbackId: string, offset: number, signal?: AbortSignal) => requestJson<FeedbackEventList>(`/api/system-control/feedback-reports/${encodeURIComponent(feedbackId)}/events?limit=20&offset=${offset}`, withSignal(signal));
export const getFeedbackEvent = (eventId: string, signal?: AbortSignal) => requestJson<FeedbackEvent>(`/api/system-control/feedback-events/${encodeURIComponent(eventId)}`, withSignal(signal));
export const addFeedbackEvent = (feedbackId: string, body: FeedbackEventBody, key: string) => requestJson<FeedbackReportDetail>(`/api/system-control/feedback-reports/${encodeURIComponent(feedbackId)}/events`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) });
export const readFeedbackScreenshot = async (feedbackId: string, attachmentId: string, signal?: AbortSignal) => {
  let response: Response;
  try { response = await fetch(`/api/system-control/feedback-reports/${encodeURIComponent(feedbackId)}/screenshot-authorizations/${encodeURIComponent(attachmentId)}/content`, { credentials: 'same-origin', ...withSignal(signal) }); }
  catch (error) { throw new FeedbackApiError(error instanceof Error ? error.message : '附件读取失败', 0, null, true); }
  if (!response.ok) throw await parseError(response);
  return response.blob();
};
