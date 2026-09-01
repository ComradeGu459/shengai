// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppShell } from '../../frontend/src/components/AppShell.js';

const id = '15d7670f-6a47-4498-ac53-3997cb04b001';
const detail = { report: { feedbackId: id, kind: 'suggestion', status: 'new', description: '页面有问题', surface: 'employee', subject: '项目', projectId: null, taskType: null, resourceId: null, routeTemplate: '/projects/:id/asr', buildVersion: 'dev', requestIds: [], browserSummary: { family: 'Browser', version: 'unknown' }, viewport: { width: 1280, height: 800 }, timezone: 'Asia/Shanghai', performanceSummary: null, screenshotAttachmentId: null, revision: 1, createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' }, attachment: null, events: [] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('员工反馈入口', () => {
  it('遮罩 mousedown 关闭后回原反馈入口且不被默认鼠标动作改为 BODY', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(detail)));
    render(<MemoryRouter initialEntries={['/projects/test-project/asr']}><AppShell><div>页面</div></AppShell></MemoryRouter>);
    const feedbackEntry = screen.getByRole('button', { name: '反馈问题' });
    feedbackEntry.focus();
    fireEvent.click(feedbackEntry);
    const dialog = screen.getByRole('dialog', { name: '反馈当前页面的问题' });
    const backdrop = dialog.parentElement!;
    fireEvent.mouseDown(backdrop);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '反馈当前页面的问题' })).not.toBeInTheDocument());
    expect(feedbackEntry).toHaveFocus();
  });

  it('提交只发送允许上下文，未知结果只查询同一 feedbackId', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(json({ error: { message: '网络未知', requestId: 'feedback-unknown', retryable: true } }, 503))
      .mockResolvedValueOnce(json(detail));
    vi.stubGlobal('fetch', request);
    render(<MemoryRouter initialEntries={['/projects/test-project/asr']}><AppShell><div>页面</div></AppShell></MemoryRouter>);
    const feedbackEntry = screen.getByRole('button', { name: '反馈问题' });
    fireEvent.click(feedbackEntry);
    expect(screen.getByRole('heading', { name: '反馈当前页面的问题' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('问题描述'), { target: { value: '按钮没有反应' } });
    fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次反馈结果' })).toBeInTheDocument());
    expect(request).toHaveBeenCalledTimes(1);
    const firstBody = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(firstBody).toMatchObject({ kind: 'no_response', description: '按钮没有反应', routeTemplate: '/projects/test-project/asr', buildVersion: 'dev' });
    expect(firstBody).not.toHaveProperty('surface');
    fireEvent.click(screen.getByRole('button', { name: '查询本次反馈结果' }));
    await waitFor(() => expect(screen.getByText('反馈已提交')).toBeInTheDocument());
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1]?.[0]).toContain(`/api/feedback-reports/${firstBody.feedbackId}`);
    fireEvent.click(screen.getByRole('button', { name: '返回当前页面' }));
    await waitFor(() => expect(feedbackEntry).toHaveFocus());
  });

  it('截图先本地预览，授权未知后分阶段诚实恢复且不重发', async () => {
    let attachmentId = '';
    let recoveryReads = 0;
    const attachment = () => ({ attachmentId, feedbackId: id, status: recoveryReads > 1 ? 'uploaded' : 'authorized', contentType: 'image/png', sizeBytes: 2, contentDigest: 'a'.repeat(64), privacyConfirmedAt: '2026-08-19T00:00:00.000Z', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' });
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/feedback-reports') && init?.method === 'POST') return json(detail);
      if (url.endsWith('/screenshot-authorizations') && init?.method === 'POST') { attachmentId = JSON.parse(String(init.body)).attachmentId; return json({ error: { message: '授权结果未知', requestId: 'attachment-unknown', retryable: true } }, 503); }
      if (url.includes('/api/feedback-reports/') && !url.includes('/screenshot-authorizations/')) { recoveryReads += 1; return json({ ...detail, attachment: attachment() }); }
      if (url.includes('/screenshot-authorizations/') && init?.method !== 'POST') return json(attachment());
      return json(detail);
    });
    vi.stubGlobal('fetch', request);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:feedback-preview') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    class PreviewImage { naturalWidth = 640; naturalHeight = 360; onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } }
    vi.stubGlobal('Image', PreviewImage);
    render(<MemoryRouter initialEntries={['/projects/test-project/asr?taskType=not-allowed&resourceId=bad']}><AppShell><div>页面</div></AppShell></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '反馈问题' }));
    fireEvent.change(screen.getByLabelText('问题描述'), { target: { value: '截图上传问题' } });
    fireEvent.change(screen.getByLabelText(/截图（可选/), { target: { files: [new File([new Uint8Array([1, 2])], 'secret.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByText(/640 × 360px/)).toBeInTheDocument());
    expect(screen.queryByText('secret.png')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/我确认截图/));
    fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次反馈结果' })).toBeInTheDocument());
    expect(request.mock.calls.filter(([input, init]) => String(input).includes('/api/feedback-reports') && init?.method === 'POST')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '查询本次反馈结果' }));
    await waitFor(() => expect(screen.getByText('反馈已创建，截图尚未确认完成')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '查询本次反馈结果' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查询本次反馈结果' }));
    await waitFor(() => expect(screen.getByText('反馈和截图已提交')).toBeInTheDocument());
    expect(request.mock.calls.filter(([input, init]) => String(input).includes('/content') && init?.method === 'POST')).toHaveLength(0);
  });

  it('查询确认附件仍未完成后，只能显式续传同一冻结链路', async () => {
    let attachmentId = '';
    let uploaded = false;
    const attachment = () => ({ attachmentId, feedbackId: id, status: uploaded ? 'uploaded' : 'authorized', contentType: 'image/png', sizeBytes: 2, contentDigest: 'a'.repeat(64), privacyConfirmedAt: '2026-08-19T00:00:00.000Z', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' });
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/feedback-reports') && init?.method === 'POST') return json(detail);
      if (url.endsWith('/screenshot-authorizations') && init?.method === 'POST') { attachmentId = JSON.parse(String(init.body)).attachmentId; return json({ error: { message: '授权结果未知', requestId: 'continue-unknown', retryable: true } }, 503); }
      if (url.includes('/content') && init?.method === 'POST') { uploaded = true; return json({ ...detail, attachment: attachment() }); }
      if (url.endsWith('/complete') && init?.method === 'POST') return json({ ...detail, attachment: attachment() });
      if (url.includes('/api/feedback-reports/') && !url.includes('/screenshot-authorizations/')) return json({ ...detail, attachment: attachment() });
      if (url.includes('/screenshot-authorizations/') && init?.method !== 'POST') return json(attachment());
      return json(detail);
    });
    vi.stubGlobal('fetch', request);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:feedback-preview') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    class PreviewImage { naturalWidth = 640; naturalHeight = 360; onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } }
    vi.stubGlobal('Image', PreviewImage);
    render(<MemoryRouter initialEntries={['/projects/test-project/asr']}><AppShell><div>页面</div></AppShell></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '反馈问题' }));
    fireEvent.change(screen.getByLabelText('问题描述'), { target: { value: '截图续传问题' } });
    fireEvent.change(screen.getByLabelText(/截图（可选/), { target: { files: [new File([new Uint8Array([1, 2])], 'screen.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByText(/640 × 360px/)).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/我确认截图/)); fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次反馈结果' })).toBeInTheDocument());
    expect(request.mock.calls.filter(([input, init]) => String(input).includes('/api/feedback-reports') && init?.method === 'POST')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '查询本次反馈结果' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '继续上传已确认截图' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '提交反馈' })).toBeDisabled();
    expect(screen.getByLabelText('问题描述')).toBeDisabled();
    expect(request.mock.calls.filter(([input, init]) => String(input).includes('/content') && init?.method === 'POST')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '继续上传已确认截图' }));
    await waitFor(() => expect(screen.getByText('反馈和截图已提交')).toBeInTheDocument());
    expect(request.mock.calls.filter(([input, init]) => String(input).includes('/content') && init?.method === 'POST')).toHaveLength(1);
    expect(request.mock.calls.filter(([input, init]) => String(input).endsWith('/complete') && init?.method === 'POST')).toHaveLength(1);
  });

  it('创建未知后只查询同一反馈，确认报告已创建后显式从授权继续', async () => {
    let attachmentId = ''; let authorized = false; let uploaded = false;
    const attachment = () => ({ attachmentId, feedbackId: id, status: uploaded ? 'uploaded' : 'authorized', contentType: 'image/png', sizeBytes: 2, contentDigest: 'a'.repeat(64), privacyConfirmedAt: '2026-08-19T00:00:00.000Z', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' });
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/feedback-reports') && init?.method === 'POST') return json({ error: { message: '创建结果未知', requestId: 'create-unknown', retryable: true } }, 503);
      if (url.endsWith('/screenshot-authorizations') && init?.method === 'POST') { attachmentId = JSON.parse(String(init.body)).attachmentId; authorized = true; return json({ ...detail, attachment: attachment() }); }
      if (url.includes('/content') && init?.method === 'POST') { uploaded = true; return json({ ...detail, attachment: attachment() }); }
      if (url.endsWith('/complete') && init?.method === 'POST') return json({ ...detail, attachment: attachment() });
      if (url.includes('/api/feedback-reports/') && !url.includes('/screenshot-authorizations/')) return json({ ...detail, attachment: authorized ? attachment() : null });
      if (url.includes('/screenshot-authorizations/') && init?.method !== 'POST') return authorized ? json(attachment()) : json({ error: { message: '附件尚未创建', requestId: 'attachment-missing', retryable: false } }, 404);
      return json(detail);
    });
    vi.stubGlobal('fetch', request);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:feedback-preview') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    class PreviewImage { naturalWidth = 640; naturalHeight = 360; onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } }
    vi.stubGlobal('Image', PreviewImage);
    render(<MemoryRouter initialEntries={['/projects/test-project/asr']}><AppShell><div>页面</div></AppShell></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '反馈问题' })); fireEvent.change(screen.getByLabelText('问题描述'), { target: { value: '创建未知后的截图续传' } });
    fireEvent.change(screen.getByLabelText(/截图（可选/), { target: { files: [new File([new Uint8Array([1, 2])], 'screen.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByText(/640 × 360px/)).toBeInTheDocument()); fireEvent.click(screen.getByLabelText(/我确认截图/)); fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次反馈结果' })).toBeInTheDocument());
    expect(request.mock.calls.filter(([input, init]) => String(input).endsWith('/api/feedback-reports') && init?.method === 'POST')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '查询本次反馈结果' })); await waitFor(() => expect(screen.getByRole('button', { name: '继续上传已确认截图' })).toBeInTheDocument());
    expect(request.mock.calls.filter(([input, init]) => String(input).endsWith('/screenshot-authorizations') && init?.method === 'POST')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '继续上传已确认截图' })); await waitFor(() => expect(screen.getByText('反馈和截图已提交')).toBeInTheDocument());
    expect(request.mock.calls.filter(([input, init]) => String(input).endsWith('/screenshot-authorizations') && init?.method === 'POST')).toHaveLength(1);
    expect(request.mock.calls.filter(([input, init]) => String(input).includes('/content') && init?.method === 'POST')).toHaveLength(1);
  });

  it('关闭部分完成状态只保留服务端可见事实，不承诺重新打开查询', async () => {
    let attachmentId = '';
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/feedback-reports') && init?.method === 'POST') return json(detail);
      if (url.endsWith('/screenshot-authorizations') && init?.method === 'POST') { attachmentId = JSON.parse(String(init.body)).attachmentId; return json({ error: { message: '授权结果未知', requestId: 'close-unknown', retryable: true } }, 503); }
      if (url.includes('/api/feedback-reports/') && !url.includes('/screenshot-authorizations/')) return json({ ...detail, attachment: { attachmentId, feedbackId: id, status: 'authorized', contentType: 'image/png', sizeBytes: 2, contentDigest: 'a'.repeat(64), privacyConfirmedAt: '2026-08-19T00:00:00.000Z', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' } });
      if (url.includes('/screenshot-authorizations/') && init?.method !== 'POST') return json({ attachmentId, feedbackId: id, status: 'authorized', contentType: 'image/png', sizeBytes: 2, contentDigest: 'a'.repeat(64), privacyConfirmedAt: '2026-08-19T00:00:00.000Z', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' });
      return json(detail);
    });
    vi.stubGlobal('fetch', request); Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:feedback-preview') }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    class PreviewImage { naturalWidth = 640; naturalHeight = 360; onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } }
    vi.stubGlobal('Image', PreviewImage);
    render(<MemoryRouter initialEntries={['/projects/test-project/asr']}><AppShell><div>页面</div></AppShell></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '反馈问题' })); fireEvent.change(screen.getByLabelText('问题描述'), { target: { value: '关闭部分反馈' } }); fireEvent.change(screen.getByLabelText(/截图（可选/), { target: { files: [new File([new Uint8Array([1, 2])], 'screen.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByText(/640 × 360px/)).toBeInTheDocument()); fireEvent.click(screen.getByLabelText(/我确认截图/)); fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次反馈结果' })).toBeInTheDocument()); fireEvent.click(screen.getByRole('button', { name: '查询本次反馈结果' }));
    await waitFor(() => expect(screen.getByText('反馈已创建，截图尚未确认完成')).toBeInTheDocument()); fireEvent.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => expect(screen.getByText('反馈已创建，截图未附上；管理员仍可看到这条反馈。')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.queryByText(/重新打开反馈入口查询/)).not.toBeInTheDocument();
    expect(request.mock.calls.filter(([input, init]) => String(input).endsWith('/api/feedback-reports') && init?.method === 'POST')).toHaveLength(1);
  });

  it('创建确定冲突仍显示未提交并允许重新填写', async () => {
    const request = vi.fn().mockResolvedValue(json({ error: { message: '反馈内容冲突', requestId: 'create-409', retryable: false } }, 409));
    vi.stubGlobal('fetch', request);
    render(<MemoryRouter initialEntries={['/projects/test-project/asr']}><AppShell><div>页面</div></AppShell></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '反馈问题' })); fireEvent.change(screen.getByLabelText('问题描述'), { target: { value: '创建冲突' } }); fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));
    await waitFor(() => expect(screen.getByText('反馈未提交')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getByText(/create-409/)).toBeInTheDocument(); expect(screen.getByRole('button', { name: '重新填写反馈' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重新填写反馈' })); await waitFor(() => expect(screen.getByRole('heading', { name: '反馈当前页面的问题' })).toBeInTheDocument());
  });

  it('截图续传确定冲突只显示一次真实原因并清理旧意图', async () => {
    let attachmentId = '';
    const attachment = () => ({ attachmentId, feedbackId: id, status: 'authorized', contentType: 'image/png', sizeBytes: 2, contentDigest: 'a'.repeat(64), privacyConfirmedAt: '2026-08-19T00:00:00.000Z', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' });
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/feedback-reports') && init?.method === 'POST') return json(detail);
      if (url.endsWith('/screenshot-authorizations') && init?.method === 'POST') { attachmentId = JSON.parse(String(init.body)).attachmentId; return json({ error: { message: '授权未知', requestId: 'auth-unknown', retryable: true } }, 503); }
      if (url.includes('/content') && init?.method === 'POST') return json({ error: { message: '截图版本冲突', requestId: 'upload-409', retryable: false } }, 409);
      if (url.includes('/api/feedback-reports/') && !url.includes('/screenshot-authorizations/')) return json({ ...detail, attachment: attachment() });
      if (url.includes('/screenshot-authorizations/') && init?.method !== 'POST') return json(attachment());
      return json(detail);
    });
    vi.stubGlobal('fetch', request); Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:feedback-preview') }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    class PreviewImage { naturalWidth = 640; naturalHeight = 360; onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } }
    vi.stubGlobal('Image', PreviewImage);
    render(<MemoryRouter initialEntries={['/projects/test-project/asr']}><AppShell><div>页面</div></AppShell></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '反馈问题' })); fireEvent.change(screen.getByLabelText('问题描述'), { target: { value: '续传冲突' } }); fireEvent.change(screen.getByLabelText(/截图（可选/), { target: { files: [new File([new Uint8Array([1, 2])], 'screen.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByText(/640 × 360px/)).toBeInTheDocument()); fireEvent.click(screen.getByLabelText(/我确认截图/)); fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次反馈结果' })).toBeInTheDocument()); fireEvent.click(screen.getByRole('button', { name: '查询本次反馈结果' })); await waitFor(() => expect(screen.getByRole('button', { name: '继续上传已确认截图' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '继续上传已确认截图' })); await waitFor(() => expect(screen.getByText(/反馈已创建，但截图未附上。/)).toBeInTheDocument());
    expect(screen.getByText(/upload-409/)).toBeInTheDocument(); expect(screen.queryByText('反馈已创建，截图尚未确认完成')).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: '重新填写反馈' })).not.toBeInTheDocument();
    expect(request.mock.calls.filter(([input, init]) => String(input).endsWith('/api/feedback-reports') && init?.method === 'POST')).toHaveLength(1);
    expect(request.mock.calls.filter(([input, init]) => String(input).includes('/content') && init?.method === 'POST')).toHaveLength(1);
  });
});
