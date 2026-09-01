// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AppShell } from '../../frontend/src/components/AppShell.js';
import { TasksPage } from '../../frontend/src/features/tasks/TasksPage.js';

const projectId = '10000000-0000-4000-8000-000000000001';
const taskId = '10000000-0000-4000-8000-000000000002';
const now = '2026-08-19T08:00:00.000Z';

const task = (overrides: Record<string, unknown> = {}) => ({
  taskType: 'asr_batch', resourceId: taskId, shortId: 'asr-00000000', name: '中文识别批次', projectId,
  projectName: '测试项目', projectIds: [projectId], projectNames: ['测试项目'], status: 'queued', nativeStatus: 'queued',
  progress: { completedCount: 0, totalCount: 2, phase: null }, error: null, createdAt: now, updatedAt: now,
  availableActions: ['cancel'], returnPath: `/projects/${projectId}/asr?batchId=${taskId}`, ...overrides,
});
const detail = (summary = task()) => ({ summary, scope: { episodeNumbers: [1, 2], childCount: 0, childResourceIds: [] }, history: [], dispatchResults: [] });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-request-id': 'req-task' } });

const renderPage = (entry = '/tasks') => render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/tasks" element={<TasksPage />} /></Routes></MemoryRouter>);

describe('统一任务中心', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return response({ items: [{ id: projectId, name: '测试项目' }], total: 1, limit: 100, offset: 0 });
      if (url.startsWith('/api/tasks?')) {
        const status = new URL(url, 'http://localhost').searchParams.get('status');
        const totals: Record<string, number> = { waiting_review: 2, stale: 1, running: 3, queued: 4, failed: 5, reconciliation_required: 6 };
        if (status) return response({ items: [], total: totals[status] ?? 0, limit: 1, offset: 0 });
        return response({ items: [task()], total: 1, limit: 20, offset: 0 });
      }
      if (url === `/api/tasks/asr_batch/${taskId}`) return response(detail());
      throw new Error(`unexpected ${init?.method ?? 'GET'} ${url}`);
    }));
  });

  afterEach(() => cleanup());

  it('摘要使用服务端 status-specific total，列表不从当前页推算', async () => {
    const fetchMock = vi.mocked(fetch);
    renderPage();
    expect(await screen.findByText('统一任务中心')).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /中文识别批次/ })).toBeInTheDocument();
    const summary = within(screen.getByLabelText('任务摘要'));
    expect(summary.getByText('需处理')).toBeInTheDocument();
    expect(Array.from(screen.getByLabelText('任务摘要').querySelectorAll('strong')).map((node) => node.textContent)).toEqual(['3', '3', '4', '11']);
    const summaryQueries = fetchMock.mock.calls.filter(([input]) => String(input).includes('/api/tasks?') && String(input).includes('limit=1'));
    expect(summaryQueries.length).toBe(6);
  });

  it('详情抽屉读取同一 taskType/resourceId，并显示历史为空的诚实状态', async () => {
    renderPage();
    const trigger = await screen.findByRole('button', { name: '查看详情' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: '中文识别批次' })).toBeInTheDocument();
    const drawer = screen.getByRole('dialog', { name: '中文识别批次' });
    const title = within(drawer).getByRole('heading', { name: '中文识别批次' });
    const cancel = within(drawer).getByRole('button', { name: '取消任务' });
    expect(screen.getByText('暂无历史记录。')).toBeInTheDocument();
    expect(title).toHaveFocus();
    fireEvent.keyDown(title, { key: 'Tab' });
    expect(within(drawer).getByRole('button', { name: '关闭详情' })).toHaveFocus();
    title.focus();
    fireEvent.keyDown(title, { key: 'Tab', shiftKey: true });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(drawer, { key: 'Escape' });
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    const backdrop = document.querySelector('[class*="backdrop"]');
    expect(backdrop).toBeTruthy();
    fireEvent.mouseDown(backdrop as HTMLElement);
    expect(trigger).toHaveFocus();
  });

  it('取消未知只保留同一任务恢复入口，人工恢复只 GET 不重复 POST', async () => {
    let cancelPosts = 0;
    let detailGets = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return response({ items: [], total: 0, limit: 100, offset: 0 });
      if (url.startsWith('/api/tasks?')) {
        const status = new URL(url, 'http://localhost').searchParams.get('status');
        if (status) return response({ items: [], total: 0, limit: 1, offset: 0 });
        return response({ items: [task()], total: 1, limit: 20, offset: 0 });
      }
      if (url === `/api/tasks/asr_batch/${taskId}`) { detailGets += 1; return response(detail()); }
      if (url === `/api/projects/${projectId}/asr/batches/${taskId}/cancel`) { cancelPosts += 1; expect(init?.headers).toMatchObject({ 'idempotency-key': expect.any(String) }); return response({ error: { code: 'TIMEOUT', message: '取消结果未知', retryable: true, requestId: 'req-cancel-unknown' } }, 503); }
      throw new Error(`unexpected ${init?.method ?? 'GET'} ${url}`);
    }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '取消任务' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认取消任务' }));
    expect(await screen.findByRole('button', { name: '查询本次取消结果' })).toBeInTheDocument();
    expect(cancelPosts).toBe(1);
    const before = detailGets;
    fireEvent.click(screen.getByRole('button', { name: '查询本次取消结果' }));
    await waitFor(() => expect(detailGets).toBeGreaterThan(before));
    expect(cancelPosts).toBe(1);
  });

  it('列表初始失败与再次失败都用同一查询身份重读，成功后才替换结果', async () => {
    let listGets = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return response({ items: [], total: 0, limit: 100, offset: 0 });
      if (url.startsWith('/api/tasks?')) {
        const params = new URL(url, 'http://localhost').searchParams;
        if (params.get('status')) return response({ items: [], total: 0, limit: 1, offset: 0 });
        listGets += 1;
        if (listGets < 3) return response({ error: { code: 'TASK_READ_FAILED', message: `读取失败 ${listGets}`, requestId: `req-list-${listGets}`, retryable: true } }, 503);
        return response({ items: [task()], total: 1, limit: 20, offset: 0 });
      }
      throw new Error(`unexpected GET ${url}`);
    }));
    renderPage();
    expect(await screen.findByRole('button', { name: '重新读取任务中心' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重新读取任务中心' }));
    await waitFor(() => expect(listGets).toBe(2));
    expect(screen.getByRole('button', { name: '重新读取任务中心' }).closest('[role="alert"]')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '重新读取任务中心' }));
    expect(await screen.findByRole('row', { name: /中文识别批次/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: '统一任务中心' })).toHaveFocus());
    expect(listGets).toBe(3);
  });

  it('分页外深链直接 GET 固定 taskType/resourceId，失败重读保留请求标识后成功聚焦详情标题', async () => {
    let detailGets = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return response({ items: [], total: 0, limit: 100, offset: 0 });
      if (url.startsWith('/api/tasks?')) {
        const params = new URL(url, 'http://localhost').searchParams;
        if (params.get('status')) return response({ items: [], total: 0, limit: 1, offset: 0 });
        return response({ items: [task({ resourceId: '10000000-0000-4000-8000-000000000099', name: '当前页其他任务' })], total: 99, limit: 20, offset: 0 });
      }
      if (url === `/api/tasks/asr_batch/${taskId}`) {
        detailGets += 1;
        if (detailGets < 3) return response({ error: { code: 'DETAIL_UNAVAILABLE', message: `详情失败 ${detailGets}`, requestId: `req-detail-${detailGets}`, retryable: true } }, 503);
        return response(detail({ ...task({ name: '分页外深链任务', availableActions: [] }) }));
      }
      throw new Error(`unexpected GET ${url}`);
    }));
    renderPage(`/tasks?taskType=asr_batch&resourceId=${taskId}`);
    expect(await screen.findByRole('dialog', { name: '中文识别批次任务详情' })).toBeInTheDocument();
    expect(await screen.findByText(/req-detail-1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重新读取任务中心' }));
    await waitFor(() => expect(detailGets).toBe(2));
    expect(await screen.findByText(/req-detail-2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重新读取任务中心' }));
    expect(await screen.findByRole('heading', { name: '分页外深链任务' })).toHaveFocus();
    expect(detailGets).toBe(3);
  });

  it('取消 transport unknown 时 POST 只发一次，人工恢复只 GET 同一完整身份', async () => {
    let cancelPosts = 0;
    let detailGets = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return response({ items: [], total: 0, limit: 100, offset: 0 });
      if (url.startsWith('/api/tasks?')) {
        const status = new URL(url, 'http://localhost').searchParams.get('status');
        if (status) return response({ items: [], total: 0, limit: 1, offset: 0 });
        return response({ items: [task()], total: 1, limit: 20, offset: 0 });
      }
      if (url === `/api/tasks/asr_batch/${taskId}`) {
        detailGets += 1;
        return response(detail(detailGets === 1 ? task() : task({ status: 'completed', nativeStatus: 'completed', availableActions: [] })));
      }
      if (url === `/api/projects/${projectId}/asr/batches/${taskId}/cancel`) {
        cancelPosts += 1;
        expect(init?.headers).toMatchObject({ 'idempotency-key': expect.any(String) });
        throw new TypeError('Failed to fetch');
      }
      throw new Error(`unexpected ${init?.method ?? 'GET'} ${url}`);
    }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '取消任务' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认取消任务' }));
    expect(await screen.findByRole('button', { name: '查询本次取消结果' })).toBeInTheDocument();
    expect(cancelPosts).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '查询本次取消结果' }));
    await waitFor(() => expect(detailGets).toBeGreaterThanOrEqual(3));
    expect(cancelPosts).toBe(1);
    expect(screen.queryByRole('button', { name: '查询本次取消结果' })).not.toBeInTheDocument();
  });

  it('同 resourceId 的不同 taskType 迟到详情响应不能覆盖当前身份', async () => {
    let resolveAsr!: (value: Response) => void;
    let resolveScreenText!: (value: Response) => void;
    const sameResourceId = '10000000-0000-4000-8000-000000000099';
    const asrTask = task({ resourceId: sameResourceId, name: 'ASR 任务' });
    const screenTask = task({ taskType: 'screen_text_batch', resourceId: sameResourceId, name: '画面字任务', availableActions: [] });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return response({ items: [], total: 0, limit: 100, offset: 0 });
      if (url.startsWith('/api/tasks?')) {
        const params = new URL(url, 'http://localhost').searchParams;
        if (params.get('status')) return response({ items: [], total: 0, limit: 1, offset: 0 });
        return response({ items: [asrTask, screenTask], total: 2, limit: 20, offset: 0 });
      }
      if (url === `/api/tasks/asr_batch/${sameResourceId}`) return new Promise<Response>((resolve) => { resolveAsr = resolve; });
      if (url === `/api/tasks/screen_text_batch/${sameResourceId}`) return new Promise<Response>((resolve) => { resolveScreenText = resolve; });
      throw new Error(`unexpected GET ${url}`);
    }));
    renderPage();
    fireEvent.click(await screen.findByRole('row', { name: /ASR 任务/ }));
    fireEvent.click(screen.getByRole('row', { name: /画面字任务/ }));
    resolveScreenText(detail(screenTask));
    expect(await screen.findByRole('heading', { name: '画面字任务' })).toBeInTheDocument();
    resolveAsr(detail(asrTask));
    await waitFor(() => expect(screen.getByRole('heading', { name: '画面字任务' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'ASR 任务' })).not.toBeInTheDocument();
  });

  it('确定409刷新后唯一错误块保持焦点，下一次动作生成新幂等键', async () => {
    const keys: string[] = [];
    let detailGets = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return response({ items: [], total: 0, limit: 100, offset: 0 });
      if (url.startsWith('/api/tasks?')) {
        const status = new URL(url, 'http://localhost').searchParams.get('status');
        if (status) return response({ items: [], total: 0, limit: 1, offset: 0 });
        return response({ items: [task()], total: 1, limit: 20, offset: 0 });
      }
      if (url === `/api/tasks/asr_batch/${taskId}`) { detailGets += 1; return response(detail(task())); }
      if (url === `/api/projects/${projectId}/asr/batches/${taskId}/cancel`) {
        const key = new Headers(init?.headers).get('idempotency-key');
        if (key) keys.push(key);
        return response({ error: { code: 'TASK_CONFLICT', message: '任务状态已变化', requestId: `req-conflict-${keys.length}`, retryable: false } }, 409);
      }
      throw new Error(`unexpected ${init?.method ?? 'GET'} ${url}`);
    }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '取消任务' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认取消任务' }));
    const error = await screen.findByText('操作未完成，权威事实已刷新');
    expect(error.closest('[role="alert"]')).toHaveFocus();
    expect(detailGets).toBeGreaterThanOrEqual(2);
    const drawer = screen.getByRole('dialog', { name: '中文识别批次' });
    fireEvent.click(within(drawer).getByRole('button', { name: '取消任务' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认取消任务' }));
    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[1]).not.toBe(keys[0]);
  });

  it('tasks 窄屏展开为216px覆盖层并保持侧栏焦点闭环，1440不出现覆盖层', async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 });
    render(<MemoryRouter initialEntries={['/tasks']}><AppShell><div>任务工作区</div></AppShell></MemoryRouter>);
    const expand = await screen.findByRole('button', { name: '展开侧栏' });
    fireEvent.click(expand);
    const overlay = await screen.findByRole('button', { name: '关闭侧栏菜单' });
    const sidebar = screen.getByRole('complementary', { name: '全局导航' });
    const links = within(sidebar).getAllByRole('link');
    const collapse = within(sidebar).getByRole('button', { name: '收起侧栏' });
    expect(collapse).toHaveFocus();
    links[0]?.focus();
    fireEvent.keyDown(sidebar, { key: 'Tab', shiftKey: true });
    expect(collapse).toHaveFocus();
    collapse.focus();
    fireEvent.keyDown(sidebar, { key: 'Tab' });
    expect(links[0]).toHaveFocus();
    fireEvent.click(overlay);
    expect(expand).toHaveFocus();
    cleanup();

    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 });
    render(<MemoryRouter initialEntries={['/tasks']}><AppShell><div>任务工作区</div></AppShell></MemoryRouter>);
    expect(screen.queryByRole('button', { name: '关闭侧栏菜单' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '收起侧栏' })).toBeInTheDocument();
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalWidth });
  });
});
