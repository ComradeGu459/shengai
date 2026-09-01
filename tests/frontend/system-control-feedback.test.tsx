// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { FeedbackPage } from '../../system-frontend/src/feedbackPage.js';
import { Modal } from '../../system-frontend/src/controlPrimitives.js';
import { ReadOnlyDrawer } from '../../system-frontend/src/runtimeCommon.js';

const id = '15d7670f-6a47-4498-ac53-3997cb04b001';
const item = { feedbackId: id, description: '按钮没有反应', surface: 'employee', routeTemplate: '/projects/:id/asr', kind: 'no_response', projectId: null, status: 'new', updatedAt: '2026-08-19T00:00:00.000Z', latestEvent: null };
const detail = { report: { feedbackId: id, kind: 'no_response', status: 'new', description: '按钮没有反应', surface: 'employee', subject: '项目', projectId: null, taskType: null, resourceId: null, routeTemplate: '/projects/:id/asr', buildVersion: 'dev', requestIds: [], browserSummary: { family: 'Browser', version: 'unknown' }, viewport: { width: 1280, height: 800 }, timezone: 'Asia/Shanghai', performanceSummary: null, screenshotAttachmentId: null, revision: 1, createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' }, attachment: null, events: [] };
const list = (items = [item], total = items.length) => ({ items, total, limit: 20, offset: 0 });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => { cleanup(); document.body.removeAttribute('tabindex'); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('管理员反馈观测', () => {
  it('列表错误重读与普通刷新保持独立焦点意图并防止迟到响应聚焦新查询', async () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({ ...item, feedbackId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, description: `stale-row-${index}` }));
    const nextRows = rows.map((entry, index) => ({ ...entry, feedbackId: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`, description: `new-identity-row-${index}` }));
    let unscopedListCall = 0;
    let resolveSuccess: ((response: Response) => void) | null = null;
    let resolveLate: ((response: Response) => void) | null = null;
    const request = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      const params = new URL(url, window.location.origin).searchParams;
      if (params.get('status')) return Promise.resolve(json(list([], 0)));
      const searchValue = params.get('search');
      const call = ++unscopedListCall;
      if (!searchValue) return Promise.resolve(json(list(rows, 20)));
      if (call === 2) return Promise.resolve(json(list(rows, 20)));
      if (call === 3) return Promise.resolve(json({ error: { message: '列表暂不可用', requestId: 'stale-1', retryable: true } }, 503));
      if (call === 4) return Promise.resolve(json({ error: { message: '列表仍不可用', requestId: 'stale-2', retryable: true } }, 503));
      if (call === 5) return new Promise<Response>((resolve) => { resolveSuccess = resolve; });
      if (call === 6) return Promise.resolve(json(list(rows, 20)));
      if (call === 7) return Promise.resolve(json({ error: { message: '列表再次不可用', requestId: 'stale-3', retryable: true } }, 503));
      if (call === 8) return new Promise<Response>((resolve) => { resolveLate = resolve; });
      return Promise.resolve(json(list(nextRows, 20)));
    });
    vi.stubGlobal('fetch', request);
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText('stale-row-19')).toBeInTheDocument());
    const search = screen.getByLabelText('搜索反馈');
    fireEvent.change(search, { target: { value: 'FIFO280 stale target' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(screen.getByText('stale-row-19')).toBeInTheDocument());

    const toolbarRefresh = screen.getByRole('button', { name: '重新读取' });
    fireEvent.click(toolbarRefresh);
    await waitFor(() => expect(screen.getByText(/stale-1/)).toBeInTheDocument());
    expect(screen.getAllByRole('row')).toHaveLength(21);
    const firstError = screen.getByRole('alert');
    fireEvent.click(within(firstError).getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByText(/stale-2/)).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveFocus();
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(resolveSuccess).not.toBeNull());
    expect(screen.getByRole('heading', { name: '反馈问题' })).not.toHaveFocus();
    await waitFor(() => expect(toolbarRefresh).toBeDisabled());
    resolveSuccess!(json(list(rows, 20)));
    await waitFor(() => expect(screen.getByRole('heading', { name: '反馈问题' })).toHaveFocus());

    search.focus();
    fireEvent.click(toolbarRefresh);
    await waitFor(() => expect(unscopedListCall).toBeGreaterThanOrEqual(6));
    expect(search).toHaveFocus();

    fireEvent.click(toolbarRefresh);
    await waitFor(() => expect(screen.getByText(/stale-3/)).toBeInTheDocument());
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(resolveLate).not.toBeNull());
    fireEvent.change(search, { target: { value: 'FIFO280 new identity' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(screen.getByText('new-identity-row-19')).toBeInTheDocument());
    resolveLate!(json(list(rows, 20)));
    await waitFor(() => expect(screen.getByText('new-identity-row-19')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: '反馈问题' })).not.toHaveFocus();
  });

  it('错误重读 pending 时翻页清除完整 queryKey 意图，迟到响应与返回原页均不聚焦标题', async () => {
    const pageOne = Array.from({ length: 20 }, (_, index) => ({ ...item, feedbackId: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`, description: `page-one-${index}` }));
    const pageTwo = pageOne.map((entry, index) => ({ ...entry, feedbackId: `30000000-0000-4000-8000-${String(index).padStart(12, '0')}`, description: `page-two-${index}` }));
    let unscopedListCall = 0;
    let resolveRetry: ((response: Response) => void) | null = null;
    const request = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const params = new URL(String(input), window.location.origin).searchParams;
      if (params.get('status')) return Promise.resolve(json(list([], 0)));
      const offset = params.get('offset');
      const call = ++unscopedListCall;
      if (call === 1) return Promise.resolve(json(list(pageOne, 40)));
      if (call === 2) return Promise.resolve(json({ error: { message: '列表暂不可用', requestId: 'page-stale-1', retryable: true } }, 503));
      if (call === 3) return new Promise<Response>((resolve) => { resolveRetry = resolve; });
      return Promise.resolve(json(list(offset === '20' ? pageTwo : pageOne, 40)));
    });
    vi.stubGlobal('fetch', request);
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText('page-one-19')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByText(/page-stale-1/)).toBeInTheDocument());
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(resolveRetry).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() => expect(screen.getByText('page-two-19')).toBeInTheDocument());
    resolveRetry!(json(list(pageOne, 40)));
    await waitFor(() => expect(screen.getByText('page-two-19')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: '反馈问题' })).not.toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '上一页' }));
    await waitFor(() => expect(screen.getByText('page-one-19')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: '反馈问题' })).not.toHaveFocus();
  });

  it('摘要来自服务端 total，详情状态事件失败保留同身份恢复', async () => {
    const request = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/events') && init?.method === 'POST') return Promise.resolve(json({ error: { message: '未知', requestId: 'event-unknown', retryable: true } }, 503));
      if (url.includes('/feedback-events/')) return Promise.resolve(json({ feedbackEventId: '15d7670f-6a47-4498-ac53-3997cb04b009', feedbackId: id, action: 'confirmed', fromStatus: 'new', toStatus: 'confirmed', note: null, actorSubject: '管理员', requestId: 'event-read', createdAt: '2026-08-19T00:00:00.000Z' }));
      if (url.endsWith(id)) return Promise.resolve(json(detail));
      if (url.includes('/events')) return Promise.resolve(json({ items: [], total: 0, limit: 20, offset: 0 }));
      const status = new URL(url, window.location.origin).searchParams.get('status');
      return Promise.resolve(json(list(!status || status === 'new' ? [item] : [], !status || status === 'new' ? 3 : 0)));
    });
    vi.stubGlobal('fetch', request);
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText('按钮没有反应')).toBeInTheDocument());
    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /反馈详情/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '确认反馈' }));
    fireEvent.submit(screen.getAllByRole('dialog').at(-1)!.querySelector('form')!);
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次状态操作' })).toBeInTheDocument());
    const recoveryButton = screen.getByRole('button', { name: '查询本次状态操作' });
    expect(screen.getByRole('dialog').contains(recoveryButton)).toBe(true);
    await waitFor(() => expect(recoveryButton).toHaveFocus());
    expect(request.mock.calls.filter(([input, init]) => String(input).includes('/events') && init?.method === 'POST')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '查询本次状态操作' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /反馈详情/ })).toHaveFocus());
  });

  it('项目筛选草稿不触发请求，非法提交保留安全焦点，合法提交才改变查询身份', async () => {
    const request = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input); const query = new URL(url, window.location.origin).search;
      return Promise.resolve(json(query.includes('projectId=') ? list([], 0) : list([item], 1)));
    });
    vi.stubGlobal('fetch', request);
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText('按钮没有反应')).toBeInTheDocument());
    const initialCount = request.mock.calls.length;
    const project = screen.getByLabelText('项目编号');
    fireEvent.change(project, { target: { value: 'not-a-uuid' } });
    expect(request).toHaveBeenCalledTimes(initialCount);
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(screen.getByRole('alert', { name: /项目筛选无法提交/ })).toHaveFocus());
    expect(request).toHaveBeenCalledTimes(initialCount);
    fireEvent.change(project, { target: { value: id } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(request.mock.calls.length).toBeGreaterThan(initialCount));
    expect(request.mock.calls.some(([input]) => String(input).includes(`projectId=${id}`))).toBe(true);
  });

  it('选择状态后摘要只消费同一筛选范围的服务端 total', async () => {
    const urls: string[] = [];
    const request = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input); urls.push(url);
      const status = new URL(url, window.location.origin).searchParams.get('status');
      return Promise.resolve(json(list(status === 'confirmed' ? [] : [item], status === 'confirmed' ? 7 : 1)));
    });
    vi.stubGlobal('fetch', request);
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText('按钮没有反应')).toBeInTheDocument());
    urls.length = 0;
    fireEvent.change(screen.getByLabelText('反馈状态'), { target: { value: 'confirmed' } });
    await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument());
    const refreshed = urls.filter((url) => url.includes('/api/system-control/feedback-reports'));
    expect(refreshed).toHaveLength(1);
    expect(new URL(refreshed[0]!, window.location.origin).searchParams.get('status')).toBe('confirmed');
  });

  it.each([
    ['new', ['7', '0', '0', '0']],
    ['confirmed', ['0', '7', '0', '0']],
    ['fixing', ['0', '7', '0', '0']],
    ['retest', ['0', '0', '7', '0']],
    ['closed', ['0', '0', '0', '7']],
  ] as const)('选中 status=%s 时互斥摘要确定为0', async (selected, expected) => {
    const request = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const queryStatus = new URL(String(input), window.location.origin).searchParams.get('status');
      return Promise.resolve(json(list(queryStatus ? [] : [item], queryStatus === selected ? 7 : 1)));
    });
    vi.stubGlobal('fetch', request);
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText('按钮没有反应')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('反馈状态'), { target: { value: selected } });
    await waitFor(() => expect(screen.getByRole('region', { name: '反馈摘要' })).toBeInTheDocument());
    await waitFor(() => expect([...screen.getByRole('region', { name: '反馈摘要' }).querySelectorAll('strong')].map((node) => node.textContent)).toEqual(expected));
  });

  it('事件 POST 成功后仍把焦点留在活动详情 Drawer', async () => {
    const request = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/events') && init?.method === 'POST') return Promise.resolve(json({ ...detail, report: { ...detail.report, status: 'confirmed' } }));
      if (url.endsWith(id)) return Promise.resolve(json(detail));
      if (url.includes('/events')) return Promise.resolve(json({ items: [], total: 0, limit: 20, offset: 0 }));
      return Promise.resolve(json(list([item], 1)));
    });
    vi.stubGlobal('fetch', request);
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText('按钮没有反应')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /反馈详情/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '确认反馈' }));
    fireEvent.submit(screen.getAllByRole('dialog').at(-1)!.querySelector('form')!);
    await waitFor(() => expect(screen.getByRole('heading', { name: /反馈详情/ })).toHaveFocus());
    expect(request.mock.calls.filter(([input, init]) => String(input).includes('/events') && init?.method === 'POST')).toHaveLength(1);
  });

  it('事件分页加载新页时由 Drawer 标题接管焦点，Escape 回查看详情触发点', async () => {
    const firstEvent = { feedbackEventId: '15d7670f-6a47-4498-ac53-3997cb04b011', feedbackId: id, action: 'created', fromStatus: 'new', toStatus: 'new', note: null, actorSubject: '系统', requestId: 'event-1', createdAt: '2026-08-19T00:00:00.000Z' };
    const secondEvent = { ...firstEvent, feedbackEventId: '15d7670f-6a47-4498-ac53-3997cb04b012', requestId: 'event-2' };
    let resolveNext: ((response: Response) => void) | null = null;
    const request = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/events?')) {
        const offset = new URL(url, window.location.origin).searchParams.get('offset');
        if (offset === '20') return new Promise<Response>((resolve) => { resolveNext = resolve; });
        return Promise.resolve(json({ items: [offset === '20' ? secondEvent : firstEvent], total: 40, limit: 20, offset: Number(offset ?? 0) }));
      }
      if (url.endsWith(id)) return Promise.resolve(json(detail));
      return Promise.resolve(json(list([item], 1)));
    });
    vi.stubGlobal('fetch', request);
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText('按钮没有反应')).toBeInTheDocument());
    const trigger = screen.getByRole('button', { name: '查看详情' });
    fireEvent.click(trigger);
    const drawer = await screen.findByRole('dialog');
    await waitFor(() => expect(within(drawer).getByText(/event-1/)).toBeInTheDocument());
    const nextButton = within(drawer).getByRole('button', { name: '下一页' });
    nextButton.focus();
    expect(nextButton).toHaveFocus();
    fireEvent.click(nextButton);
    await waitFor(() => expect(resolveNext).not.toBeNull());
    expect(within(drawer).getByRole('heading', { name: /反馈详情/ })).toHaveFocus();
    resolveNext!(json({ items: [secondEvent], total: 40, limit: 20, offset: 20 }));
    await waitFor(() => expect(within(drawer).getByText(/event-2/)).toBeInTheDocument());
    expect(within(drawer).getByRole('heading', { name: /反馈详情/ })).toHaveFocus();
    document.body.tabIndex = -1;
    document.body.focus();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('上层 Modal 持有 Escape/Tab 时 Drawer 不抢事件，泄漏到 BODY 后 Drawer 可恢复键盘所有权', async () => {
    const Layered = () => {
      const [drawerOpen, setDrawerOpen] = useState(true);
      const [modalOpen, setModalOpen] = useState(true);
      return <>{drawerOpen ? <ReadOnlyDrawer title="反馈详情" kicker="测试" onClose={() => setDrawerOpen(false)}>{modalOpen ? <Modal title="上层操作" onClose={() => setModalOpen(false)}><p>上层内容</p></Modal> : <p>Drawer 内容</p>}</ReadOnlyDrawer> : null}</>;
    };
    render(<Layered />);
    const dialogs = screen.getAllByRole('dialog');
    const modal = dialogs.at(-1)!;
    fireEvent.keyDown(modal, { key: 'Escape' });
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    const drawer = screen.getByRole('dialog');
    document.body.tabIndex = -1;
    document.body.focus();
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(within(drawer).getByRole('heading', { name: '反馈详情' })).toHaveFocus();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('详情直接消费附件摘要，查看大图只读取 binary content 路径', async () => {
    const attachment = { attachmentId: '15d7670f-6a47-4498-ac53-3997cb04b009', feedbackId: id, status: 'uploaded', contentType: 'image/png', sizeBytes: 2048, contentDigest: 'a'.repeat(64), privacyConfirmedAt: '2026-08-19T00:00:00.000Z', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' };
    const request = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/content')) return Promise.resolve(new Response(new Blob(['png']), { status: 200, headers: { 'content-type': 'image/png' } }));
      if (url.includes('/events')) return Promise.resolve(json({ items: [], total: 0, limit: 20, offset: 0 }));
      if (url.endsWith(id)) return Promise.resolve(json({ ...detail, attachment }));
      return Promise.resolve(json(list([item], 1)));
    });
    vi.stubGlobal('fetch', request);
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText('按钮没有反应')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    await waitFor(() => expect(screen.getByText(/image\/png · 2 KB/)).toBeInTheDocument());
    expect(request.mock.calls.some(([input]) => String(input).includes('/screenshot-authorizations/') && !String(input).includes('/content'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '查看大图' }));
    await waitFor(() => expect(screen.getByRole('img', { name: '用户确认上传的反馈截图' })).toBeInTheDocument());
    expect(request.mock.calls.some(([input]) => String(input).includes(`/screenshot-authorizations/${attachment.attachmentId}/content`))).toBe(true);
  });

  it('事件确定冲突后错误块留在详情抽屉并持有焦点', async () => {
    const request = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/events') && init?.method === 'POST') return Promise.resolve(json({ error: { message: '状态已变化', requestId: 'event-conflict', retryable: false } }, 409));
      if (url.endsWith(id)) return Promise.resolve(json(detail));
      if (url.includes('/events')) return Promise.resolve(json({ items: [], total: 0, limit: 20, offset: 0 }));
      return Promise.resolve(json(list([item], 1)));
    });
    vi.stubGlobal('fetch', request);
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText('按钮没有反应')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /反馈详情/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '确认反馈' }));
    fireEvent.submit(screen.getAllByRole('dialog').at(-1)!.querySelector('form')!);
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('状态操作未完成');
    await waitFor(() => expect(error).toHaveFocus());
    expect(screen.getByRole('dialog').contains(error)).toBe(true);
    expect(screen.queryByRole('button', { name: '查询本次状态操作' })).not.toBeInTheDocument();
  });
});
