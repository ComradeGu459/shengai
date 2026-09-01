// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { ProjectCenter } from '../../frontend/src/features/projects/ProjectCenter.js';
import { UploadQueue } from '../../frontend/src/features/uploads/UploadQueue.js';
import { installRandomUuidFallback } from '../../frontend/src/platform/randomUuid.js';

const project = (index = 1) => ({
  id: `ca65378e-8935-4c4a-9e8b-13efca3d31${String(index).padStart(2, '0')}`,
  name: `匿名项目${index}`,
  workflowStatus: 'ready',
  lifecycleStatus: 'active',
  recycleExpiresAt: null,
  version: index,
  createdAt: '2026-08-12T08:00:00.000Z',
  updatedAt: '2026-08-12T09:00:00.000Z',
  createdBy: 'local-user',
  updatedBy: 'local-user',
});

const eligibilityItem = (item: ReturnType<typeof project>, eligible = true) => ({
  projectId: item.id,
  projectName: item.name,
  workflowStatus: item.workflowStatus,
  lifecycleStatus: item.lifecycleStatus,
  eligibilityStatus: eligible ? 'eligible' : 'missing_terms',
  eligibility: {
    projectId: item.id,
    projectName: item.name,
    eligible,
    termVersionId: eligible ? '11111111-1111-4111-8111-111111111111' : null,
    manifestId: eligible ? '22222222-2222-4222-8222-222222222222' : null,
    totalEpisodeCount: 30,
    readyEpisodeCount: eligible ? 30 : 0,
    newJobCount: eligible ? 28 : 0,
    reusableResultCount: eligible ? 2 : 0,
    activeBatchCount: 0,
    hotwords: eligible ? { totalEntries: 8, submittedEntries: 8, omittedEntries: 0, totalCharacters: 42 } : null,
    blockers: eligible ? [] : [{ code: 'MISSING_TERMS', message: '尚未确认术语版本', action: 'confirm_terms' }],
  },
  latestBatch: null,
  updatedAt: item.updatedAt,
});

const json = (body: unknown, status = 200, headers?: Record<string, string>) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', ...headers },
});

const renderProjectCenter = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter><ProjectCenter /></MemoryRouter></QueryClientProvider>);
};

const renderSharedProjectAndUploadPages = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProjectCenter />
        <UploadQueue />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); });

describe('项目中心多剧派发', () => {
  it('消费服务端资格查询并展示正式项目列', async () => {
    const item = project(1);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/asr/eligibility?')) return json({ total: 1, items: [eligibilityItem(item)] });
      if (url.startsWith('/api/projects?')) return json({ total: 1, items: [item] });
      throw new Error(`unexpected ${url}`);
    });
    renderProjectCenter();
    expect(await screen.findByText('匿名项目1')).toBeInTheDocument();
    expect(screen.getByText('30/30 集就绪')).toBeInTheDocument();
    expect(screen.getAllByText('可识别')).toHaveLength(2);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('sortBy=actionPriority'))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('lifecycleStatus=active'))).toBe(true);
  });

  it('项目资格列表人工重读锁定重复点击，再次失败保留且成功聚焦反馈', async () => {
    const item = project(8);
    let resolveRetry!: (response: Response) => void;
    let reads = 0;
    const retryPending = new Promise<Response>((resolve) => { resolveRetry = resolve; });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ total: 1, items: [item] });
      if (url.startsWith('/api/asr/eligibility?')) {
        reads += 1;
        if (reads === 1) return json({ error: { code: 'ASR_TEMPORARY', message: '资格列表不可用', retryable: true, action: 'reload_dispatch', requestId: 'elig-list-1' } }, 503);
        if (reads === 2) return retryPending;
        return json({ total: 1, items: [eligibilityItem(item)] });
      }
      throw new Error(`unexpected ${url}`);
    });
    renderProjectCenter();
    expect(await screen.findByText('项目资格暂时无法加载')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: '重新读取' });
    fireEvent.click(retry);
    const pendingRetry = await screen.findByRole('button', { name: '正在重新读取' });
    expect(pendingRetry).toBeDisabled();
    fireEvent.click(pendingRetry);
    expect(reads).toBe(2);
    await act(async () => resolveRetry(json({ error: { code: 'ASR_TEMPORARY', message: '资格列表仍不可用', retryable: true, action: 'reload_dispatch', requestId: 'elig-list-2' } }, 503)));
    expect(await screen.findByText('请求标识 elig-list-2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新读取' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    const notice = await screen.findByText('项目资格列表已重新读取。');
    expect(notice).toHaveFocus();
    expect(reads).toBe(3);
  });

  it('批量资格人工重读锁定重复点击，再次失败保留且成功聚焦关闭按钮', async () => {
    const item = project(9);
    let resolveRetry!: (response: Response) => void;
    let checks = 0;
    const retryPending = new Promise<Response>((resolve) => { resolveRetry = resolve; });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ total: 1, items: [item] });
      if (url.startsWith('/api/asr/eligibility?')) return json({ total: 1, items: [eligibilityItem(item)] });
      if (url === '/api/asr/eligibility' && init?.method === 'POST') {
        checks += 1;
        if (checks === 1) return json({ error: { code: 'ASR_TEMPORARY', message: '资格核对不可用', retryable: true, action: 'reload_dispatch', requestId: 'elig-check-1' } }, 503);
        if (checks === 2) return retryPending;
        return json({ items: [eligibilityItem(item).eligibility], counts: { selectedProjects: 1, eligibleProjects: 1, blockedProjects: 0, totalEpisodes: 30, newJobs: 28, reusableResults: 2 } });
      }
      throw new Error(`unexpected ${url}`);
    });
    renderProjectCenter();
    fireEvent.click(await screen.findByRole('checkbox', { name: '选择项目 匿名项目9' }));
    fireEvent.click(screen.getByRole('button', { name: '批量中文识别' }));
    expect(await screen.findByText('项目资格核对失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    const pendingRetry = await screen.findByRole('button', { name: '正在重新读取' });
    expect(pendingRetry).toBeDisabled();
    fireEvent.click(pendingRetry);
    expect(checks).toBe(2);
    await act(async () => resolveRetry(json({ error: { code: 'ASR_TEMPORARY', message: '资格核对仍不可用', retryable: true, action: 'reload_dispatch', requestId: 'elig-check-2' } }, 503)));
    expect(await screen.findByText('请求标识 elig-check-2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新读取' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await screen.findByText('预计新任务');
    expect(screen.getByRole('button', { name: '关闭批量确认' })).toHaveFocus();
    expect(checks).toBe(3);
  });

  it('创建表单在空名称时给出可操作错误', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => String(input).startsWith('/api/projects?')
      ? json({ total: 0, items: [] })
      : json({ total: 0, items: [] }));
    renderProjectCenter();
    await screen.findByText('没有符合条件的项目');
    fireEvent.click(screen.getByRole('button', { name: '创建项目' }));
    fireEvent.click(screen.getByRole('button', { name: '确认创建' }));
    expect(await screen.findByText('请输入项目名称。')).toBeInTheDocument();
  });

  it('纯 HTTP 缺少原生 randomUUID 时仍只创建一次并发送合法幂等键', async () => {
    const cryptoApi = globalThis.crypto as Crypto & { randomUUID?: () => string };
    const originalDescriptor = Object.getOwnPropertyDescriptor(cryptoApi, 'randomUUID');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ total: 0, items: [] });
      if (url.startsWith('/api/asr/eligibility?')) return json({ total: 0, items: [] });
      if (url === '/api/projects' && init?.method === 'POST') return json(project(21), 201);
      throw new Error(`unexpected ${url}`);
    });
    try {
      Object.defineProperty(cryptoApi, 'randomUUID', { configurable: true, writable: true, value: undefined });
      installRandomUuidFallback();
      renderProjectCenter();
      await screen.findByText('没有符合条件的项目');
      fireEvent.click(screen.getByRole('button', { name: '创建项目' }));
      fireEvent.change(screen.getByLabelText('项目名称'), { target: { value: 'HTTP 项目' } });
      fireEvent.click(screen.getByRole('button', { name: '确认创建' }));
      await waitFor(() => expect(fetchMock.mock.calls.filter(([url, options]) => String(url) === '/api/projects' && options?.method === 'POST')).toHaveLength(1));
      const call = fetchMock.mock.calls.find(([url, options]) => String(url) === '/api/projects' && options?.method === 'POST');
      expect(call?.[1]?.headers).toMatchObject({ 'idempotency-key': expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) });
    } finally {
      if (originalDescriptor) Object.defineProperty(cryptoApi, 'randomUUID', originalDescriptor);
      else delete cryptoApi.randomUUID;
    }
  });

  it('项目创建 201 后同一 QueryClient 立即同步上传页选择器，再由项目 GET 权威对账', async () => {
    const initial = project(22);
    const created = { ...project(23), name: '刚创建项目' };
    let projectReads = 0;
    let resolveReconcile!: (response: Response) => void;
    const pendingReconcile = new Promise<Response>((resolve) => { resolveReconcile = resolve; });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) {
        projectReads += 1;
        return projectReads === 1 ? json({ total: 1, items: [initial] }) : pendingReconcile;
      }
      if (url.startsWith('/api/asr/eligibility?')) return json({ total: 1, items: [eligibilityItem(initial)] });
      if (url === `/api/projects/${initial.id}/material-manifest`) return json({ project: initial, manifest: null });
      if (url === `/api/projects/${initial.id}/uploads`) return json({ items: [] });
      if (url === '/api/projects' && init?.method === 'POST') return json(created, 201);
      throw new Error(`unexpected ${url} ${init?.method ?? 'GET'}`);
    });

    renderSharedProjectAndUploadPages();
    await screen.findByRole('option', { name: initial.name });
    fireEvent.click(screen.getByRole('button', { name: '创建项目' }));
    fireEvent.change(screen.getByLabelText('项目名称'), { target: { value: created.name } });
    fireEvent.click(screen.getByRole('button', { name: '确认创建' }));

    await screen.findByRole('option', { name: created.name });
    expect(fetchMock.mock.calls.filter(([url, options]) => String(url) === '/api/projects' && options?.method === 'POST')).toHaveLength(1);
    expect(projectReads).toBeGreaterThanOrEqual(2);
    resolveReconcile(json({ total: 2, items: [created, initial] }));
    await waitFor(() => expect(projectReads).toBeGreaterThanOrEqual(2));
  });

  it('回收确认保持三项影响、pending 焦点和后端数量反馈', async () => {
    const item = project(2);
    let resolveRecycle!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolveRecycle = resolve; });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/recycle')) return pending;
      if (url.startsWith('/api/asr/eligibility?')) return json({ total: 1, items: [eligibilityItem(item)] });
      if (url.startsWith('/api/projects?')) return json({ total: 1, items: [item] });
      throw new Error(`unexpected ${url} ${init?.method ?? 'GET'}`);
    });
    renderProjectCenter();
    await screen.findByText('匿名项目2');
    const trigger = screen.getByRole('button', { name: '移入回收站' });
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
    expect(screen.getByText(/立即终止全部未完成上传/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认移入回收站' }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(fireEvent.keyDown(dialog, { key: 'Escape' })).toBe(false);
    await act(async () => resolveRecycle(json({ project: { ...item, lifecycleStatus: 'recycled', version: 3 }, terminatedUploadCount: 3 }, 201)));
    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('3 个未完成上传已终止');
    expect(notice).toHaveFocus();
    const recycleCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/recycle'))!;
    expect(recycleCall[1]?.body).toBe(JSON.stringify({ expectedVersion: 2 }));
  });

  it('当前页选择、显式跨页全选与成员集合变化遵循服务端结果', async () => {
    const items = [project(3), project(4), project(5)];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ total: 3, items });
      if (url.startsWith('/api/asr/eligibility?')) {
        const limit = new URL(`http://local${url}`).searchParams.get('limit');
        return json({ total: 3, items: (limit === '20' ? items : items.slice(0, 2)).map((entry) => eligibilityItem(entry)) });
      }
      if (url === '/api/asr/eligibility' && init?.method === 'POST') throw new Error('panel should not open');
      throw new Error(`unexpected ${url}`);
    });
    renderProjectCenter();
    await screen.findByText('匿名项目3');
    fireEvent.click(screen.getByRole('checkbox', { name: '选择当前页项目' }));
    expect(screen.getByText('已选择 2 部')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '清除选择' }));
    fireEvent.click(screen.getByRole('button', { name: '选择全部 3 部符合当前条件的项目' }));
    expect(await screen.findByText('已选择 3 部')).toBeInTheDocument();
    expect(screen.getByText('跨页全部选择')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('中文识别资格'), { target: { value: 'eligible' } });
    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('中文识别资格');
    expect(screen.queryByText(/已选择 3 部/)).not.toBeInTheDocument();
  });

  it('选择全部锁定重复激活，失败可再次读取且响应超限不形成伪全选', async () => {
    const items = Array.from({ length: 21 }, (_, index) => project(index + 20));
    let resolveAll!: (response: Response) => void;
    let rejectReadAgain!: (response: Response) => void;
    let allReads = 0;
    const firstRead = new Promise<Response>((resolve) => { resolveAll = resolve; });
    const secondRead = new Promise<Response>((resolve) => { rejectReadAgain = resolve; });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ total: 3, items: items.slice(0, 3) });
      if (url.startsWith('/api/asr/eligibility?')) {
        const params = new URL(`http://local${url}`).searchParams;
        if (params.get('limit') !== '20') return json({ total: 3, items: items.slice(0, 2).map((entry) => eligibilityItem(entry)) });
        allReads += 1;
        if (allReads === 1) return firstRead;
        if (allReads === 2) return secondRead;
        return json({ total: 21, items: items.slice(0, 20).map((entry) => eligibilityItem(entry)) });
      }
      throw new Error(`unexpected ${url}`);
    });
    renderProjectCenter();
    await screen.findByText('匿名项目20');
    const selectAll = screen.getByRole('button', { name: '选择全部 3 部符合当前条件的项目' });
    fireEvent.click(selectAll);
    const pendingAll = await screen.findByRole('button', { name: '正在读取全部项目…' });
    expect(pendingAll).toBeDisabled();
    fireEvent.click(pendingAll);
    expect(allReads).toBe(1);
    await act(async () => resolveAll(json({ error: { code: 'ASR_TEMPORARY', message: '全部项目暂时不可用', retryable: true, action: 'reload_dispatch', requestId: 'all-read-1' } }, 503)));
    const retry = await screen.findByRole('button', { name: '重新读取全部项目' });
    expect(screen.getByText('请求标识 all-read-1')).toBeInTheDocument();
    expect(retry).toHaveFocus();
    fireEvent.click(retry);
    const pendingAllRetry = await screen.findByRole('button', { name: '正在重新读取全部项目' });
    expect(pendingAllRetry).toBeDisabled();
    fireEvent.click(pendingAllRetry);
    expect(allReads).toBe(2);
    await act(async () => rejectReadAgain(json({ error: { code: 'ASR_TEMPORARY', message: '仍然不可用', retryable: true, action: 'reload_dispatch', requestId: 'all-read-2' } }, 503)));
    expect(await screen.findByText('请求标识 all-read-2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新读取全部项目' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '重新读取全部项目' }));
    const notice = await screen.findByText('服务端结果现为 21 部，超过单次 20 部上限，未形成全部选择。');
    expect(notice).toHaveFocus();
    expect(screen.queryByText('跨页全部选择')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('limit=20'))).toHaveLength(3);
  });

  it('创建未知结果跨关闭和刷新只恢复预生成 ID，成功后清理句柄且 POST 恒为一次', async () => {
    const item = project(6);
    let rejectCreate!: (reason: unknown) => void;
    const pendingCreate = new Promise<Response>((_, reject) => { rejectCreate = reject; });
    let detailReads = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/projects?')) return json({ total: 1, items: [item] });
      if (url.startsWith('/api/asr/eligibility?')) return json({ total: 1, items: [eligibilityItem(item)] });
      if (url === '/api/asr/eligibility' && init?.method === 'POST') return json({ items: [eligibilityItem(item).eligibility], counts: { selectedProjects: 1, eligibleProjects: 1, blockedProjects: 0, totalEpisodes: 30, newJobs: 28, reusableResults: 2 } });
      if (url === '/api/asr/dispatch-groups' && init?.method === 'POST') return pendingCreate;
      if (url.startsWith('/api/asr/dispatch-groups/') && !url.endsWith('/cancel')) {
        detailReads += 1;
        if (detailReads <= 2) return json({ error: { code: 'ASR_DISPATCH_NOT_FOUND', message: '多项目识别任务不存在。', retryable: false, action: 'reload_asr', requestId: `read-404-${detailReads}` } }, 404);
        const id = url.split('/').at(-1)!;
        return json(dispatchDetail(id, item));
      }
      throw new Error(`unexpected ${url}`);
    });
    const firstView = renderProjectCenter();
    await screen.findByText('匿名项目6');
    fireEvent.click(screen.getByRole('checkbox', { name: '选择项目 匿名项目6' }));
    fireEvent.click(screen.getByRole('button', { name: '批量中文识别' }));
    await screen.findByText('预计新任务');
    fireEvent.click(screen.getByRole('button', { name: '为 1 部项目创建' }));
    const drawer = screen.getByRole('dialog', { name: '批量中文识别' });
    await waitFor(() => expect(drawer).toHaveFocus());
    await act(async () => rejectCreate(new TypeError('网络结果未知')));
    expect(await screen.findByText('创建结果未知')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭批量确认' }));
    fireEvent.click(screen.getByRole('button', { name: '继续确认派发' }));
    fireEvent.click(screen.getByRole('button', { name: '重新读取派发' }));
    expect(await screen.findByText('派发尚未确认')).toBeInTheDocument();
    expect(screen.getByText('本次读取请求标识 read-404-1')).toBeInTheDocument();
    expect(sessionStorage.getItem('qimao.asr.dispatch-create-recovery.v1')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '重新读取派发' }));
    expect(await screen.findByText('本次读取请求标识 read-404-2')).toBeInTheDocument();
    expect(sessionStorage.getItem('qimao.asr.dispatch-create-recovery.v1')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '关闭批量确认' }));
    firstView.unmount();
    renderProjectCenter();
    fireEvent.click(await screen.findByRole('button', { name: '继续确认派发' }));
    fireEvent.click(screen.getByRole('button', { name: '重新读取派发' }));
    expect(await screen.findByText('派发已创建')).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
    const createCalls = fetchMock.mock.calls.filter(([url, options]) => String(url) === '/api/asr/dispatch-groups' && options?.method === 'POST');
    expect(createCalls).toHaveLength(1);
    const createBody = JSON.parse(String(createCalls[0]![1]?.body));
    expect(createBody.projectIds).toEqual([item.id]);
    expect(createBody.dispatchGroupId).toMatch(/^[0-9a-f-]{36}$/);
    const getUrls = fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/api/asr/dispatch-groups/'));
    expect(getUrls).toEqual([
      `/api/asr/dispatch-groups/${createBody.dispatchGroupId}`,
      `/api/asr/dispatch-groups/${createBody.dispatchGroupId}`,
      `/api/asr/dispatch-groups/${createBody.dispatchGroupId}`,
    ]);
  });
});

const dispatchDetail = (id: string, item: ReturnType<typeof project>) => ({
  id, requestId: 'create-request-1', acceptanceStatus: 'accepted', executionStatus: 'queued', projectIds: [item.id], allowPartial: true,
  counts: { selectedProjects: 1, acceptedProjects: 1, blockedProjects: 0, completedProjects: 0, totalEpisodes: 30, newJobs: 28, reusableResults: 2, batches: { blocked: 0, queued: 1, running: 0, cancelRequested: 0, partial: 0, completed: 0, reconciliationRequired: 0, failed: 0, cancelled: 0 } },
  quality: { passedEpisodes: 0, warningEpisodes: 0, rejectedEpisodes: 0 }, processingUsage: { recordedAttempts: 0, mediaDurationMs: 0, reconciliationStatus: 'not_recorded' },
  createdAt: '2026-08-14T08:00:00.000Z', updatedAt: '2026-08-14T08:00:00.000Z',
  results: [{ projectId: item.id, selectionOrder: 1, acceptanceStatus: 'accepted', eligibility: eligibilityItem(item).eligibility, dispatchError: null, batchId: null, batch: null, createdAt: '2026-08-14T08:00:00.000Z', updatedAt: '2026-08-14T08:00:00.000Z' }],
});
