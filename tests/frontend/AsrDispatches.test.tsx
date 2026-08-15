// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { AsrDispatches } from '../../frontend/src/features/asr-dispatch/AsrDispatches.js';

const groupId = '33333333-3333-4333-8333-333333333333';
const projectId = '44444444-4444-4444-8444-444444444444';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const summary = (executionStatus: 'running' | 'cancel_requested' = 'running') => ({
  id: groupId,
  requestId: 'create-request-persisted',
  acceptanceStatus: 'partial',
  executionStatus,
  projectIds: [projectId],
  allowPartial: true,
  counts: {
    selectedProjects: 2, acceptedProjects: 1, blockedProjects: 1, completedProjects: 0,
    totalEpisodes: 30, newJobs: 28, reusableResults: 2,
    batches: { blocked: 1, queued: 0, running: executionStatus === 'running' ? 1 : 0, cancelRequested: executionStatus === 'cancel_requested' ? 1 : 0, partial: 0, completed: 0, reconciliationRequired: 0, failed: 0, cancelled: 0 },
  },
  quality: { passedEpisodes: 12, warningEpisodes: 2, rejectedEpisodes: 0 },
  processingUsage: { recordedAttempts: 1, mediaDurationMs: 90000, reconciliationStatus: 'recorded' },
  createdAt: '2026-08-14T08:00:00.000Z',
  updatedAt: '2026-08-14T09:00:00.000Z',
});

const detail = (executionStatus: 'running' | 'cancel_requested' = 'running') => ({
  ...summary(executionStatus),
  results: [{
    projectId, selectionOrder: 1, acceptanceStatus: 'accepted',
    eligibility: { projectId, projectName: '匿名项目甲', eligible: true, termVersionId: '11111111-1111-4111-8111-111111111111', manifestId: '22222222-2222-4222-8222-222222222222', totalEpisodeCount: 30, readyEpisodeCount: 30, newJobCount: 28, reusableResultCount: 2, activeBatchCount: 0, hotwords: { totalEntries: 8, submittedEntries: 8, omittedEntries: 0, totalCharacters: 42 }, blockers: [] },
    dispatchError: null, batchId: null, batch: null,
    createdAt: '2026-08-14T08:00:00.000Z', updatedAt: '2026-08-14T09:00:00.000Z',
  }],
});

const apiError = (requestId: string, message: string, status = 503) => json({ error: { code: 'ASR_TEMPORARY', message, retryable: true, action: 'reload_dispatch', requestId } }, status);

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><AsrDispatches /></MemoryRouter></QueryClientProvider>);
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('中文识别任务', () => {
  it('列表稳定失败显示本次请求标识，唯一重读成功后聚焦状态消息', async () => {
    let resolveRetry!: (response: Response) => void;
    let reads = 0;
    const retryPending = new Promise<Response>((resolve) => { resolveRetry = resolve; });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/asr/dispatch-groups?')) {
        reads += 1;
        if (reads === 1) return apiError('list-read-503', '任务服务暂时不可用');
        if (reads === 2) return retryPending;
        return json({ total: 1, items: [summary()] });
      }
      throw new Error(`unexpected ${url}`);
    });
    renderPage();
    expect(await screen.findByText('任务列表暂时无法加载')).toBeInTheDocument();
    expect(screen.getByText('请求标识 list-read-503')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: '重新读取' });
    expect(screen.getAllByRole('button', { name: '重新读取' })).toHaveLength(1);
    fireEvent.click(retry);
    const pendingRetry = await screen.findByRole('button', { name: '正在重新读取' });
    expect(pendingRetry).toBeDisabled();
    fireEvent.click(pendingRetry);
    expect(reads).toBe(2);
    await act(async () => resolveRetry(apiError('list-read-503-again', '任务服务仍不可用')));
    expect(await screen.findByText('请求标识 list-read-503-again')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新读取' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    const notice = await screen.findByText('中文识别任务列表已重新读取。');
    expect(notice).toHaveTextContent('任务列表已重新读取');
    expect(notice).toHaveFocus();
    expect(screen.getByText('创建请求标识 create-request-persisted')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('详情人工重读锁定重复点击，再次失败保留且成功聚焦关闭按钮', async () => {
    let detailReads = 0;
    let resolveRetry!: (response: Response) => void;
    const retryPending = new Promise<Response>((resolve) => { resolveRetry = resolve; });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/asr/dispatch-groups?')) return json({ total: 1, items: [summary()] });
      if (url === `/api/asr/dispatch-groups/${groupId}`) {
        detailReads += 1;
        if (detailReads === 1) return apiError('detail-503', '详情不可用');
        if (detailReads === 2) return retryPending;
        return json(detail());
      }
      throw new Error(`unexpected ${url}`);
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '查看任务' }));
    expect(await screen.findByText('派发详情读取失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    const pendingRetry = await screen.findByRole('button', { name: '正在重新读取' });
    const detailDrawer = screen.getByRole('dialog', { name: 'DSP-33333333' });
    await waitFor(() => expect(detailDrawer).toHaveFocus());
    expect(pendingRetry).toBeDisabled();
    expect(screen.getByRole('button', { name: '关闭任务详情' })).toBeDisabled();
    expect(fireEvent.keyDown(detailDrawer, { key: 'Tab' })).toBe(false);
    expect(fireEvent.keyDown(detailDrawer, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(fireEvent.keyDown(detailDrawer, { key: 'Escape' })).toBe(false);
    expect(screen.getByRole('dialog', { name: 'DSP-33333333' })).toBeInTheDocument();
    fireEvent.mouseDown(detailDrawer.parentElement!);
    expect(screen.getByRole('dialog', { name: 'DSP-33333333' })).toBeInTheDocument();
    fireEvent.click(pendingRetry);
    expect(detailReads).toBe(2);
    await act(async () => resolveRetry(apiError('detail-503-again', '详情仍不可用')));
    expect(await screen.findByText('请求标识 detail-503-again')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新读取' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await screen.findByText('匿名项目甲');
    expect(screen.getByRole('button', { name: '关闭任务详情' })).toHaveFocus();
    expect(detailReads).toBe(3);
  });

  it('确定性取消失败保留详情和内部焦点，并以同一幂等键显式重试', async () => {
    let cancelCalls = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/asr/dispatch-groups?')) return json({ total: 1, items: [summary()] });
      if (url === `/api/asr/dispatch-groups/${groupId}`) return json(detail());
      if (url.endsWith('/cancel') && init?.method === 'POST') {
        cancelCalls += 1;
        return cancelCalls === 1 ? apiError('cancel-409', '状态已变化', 409) : json(detail('cancel_requested'));
      }
      throw new Error(`unexpected ${url}`);
    });
    renderPage();
    const trigger = await screen.findByRole('button', { name: '查看任务' });
    fireEvent.click(trigger);
    await screen.findByText('匿名项目甲');
    fireEvent.click(screen.getByRole('button', { name: '取消未终结项目' }));
    expect(screen.getByRole('button', { name: '暂不取消' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '确认取消未终结项目' }));
    expect(await screen.findByText('取消意图保存失败')).toBeInTheDocument();
    expect(screen.getByText('请求标识 cancel-409')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '暂不取消' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '再次保存同一取消意图' }));
    const notice = await screen.findByText('取消意图已保存，未终结的项目批次将进入取消请求中。');
    expect(notice).toHaveFocus();
    const calls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/cancel'));
    expect(calls).toHaveLength(2);
    const firstKey = (calls[0]![1]?.headers as Record<string, string>)['idempotency-key'];
    expect((calls[1]![1]?.headers as Record<string, string>)['idempotency-key']).toBe(firstKey);
  });

  it('取消未知结果只发一次命令，重复读取失败后仍可恢复成功', async () => {
    let rejectCancel!: (reason: unknown) => void;
    const pendingCancel = new Promise<Response>((_, reject) => { rejectCancel = reject; });
    let resolveCancelRead!: (response: Response) => void;
    const pendingCancelRead = new Promise<Response>((resolve) => { resolveCancelRead = resolve; });
    let detailReads = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/asr/dispatch-groups?')) return json({ total: 1, items: [summary()] });
      if (url === `/api/asr/dispatch-groups/${groupId}`) {
        detailReads += 1;
        if (detailReads === 1) return json(detail());
        if (detailReads === 2) return pendingCancelRead;
        if (detailReads === 3) return json(detail());
        return json(detail('cancel_requested'));
      }
      if (url.endsWith('/cancel') && init?.method === 'POST') return pendingCancel;
      throw new Error(`unexpected ${url}`);
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '查看任务' }));
    await screen.findByText('匿名项目甲');
    fireEvent.click(screen.getByRole('button', { name: '取消未终结项目' }));
    fireEvent.click(screen.getByRole('button', { name: '确认取消未终结项目' }));
    const dialog = screen.getByRole('dialog', { name: '取消未终结的项目批次？' });
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(fireEvent.keyDown(dialog, { key: 'Tab' })).toBe(false);
    await act(async () => rejectCancel(new TypeError('网络结果未知')));
    expect(await screen.findByText('取消结果未知')).toBeInTheDocument();
    const recovery = screen.getByRole('button', { name: '重新读取取消结果' });
    expect(recovery).toHaveFocus();
    expect(screen.getByRole('button', { name: '暂不取消' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '确认取消未终结项目' })).toBeDisabled();
    expect(fireEvent.keyDown(dialog, { key: 'Escape' })).toBe(false);
    fireEvent.mouseDown(dialog.parentElement!, { target: dialog.parentElement });
    expect(screen.getByText('取消结果未知')).toBeInTheDocument();
    fireEvent.click(recovery);
    await waitFor(() => expect(screen.getByRole('button', { name: '重新读取取消结果' })).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: '重新读取取消结果' }));
    expect(detailReads).toBe(2);
    await act(async () => resolveCancelRead(apiError('cancel-read-503', '取消状态暂时无法读取')));
    expect(await screen.findByText('取消状态暂时无法读取')).toBeInTheDocument();
    expect(screen.getByText('本次读取请求标识 cancel-read-503')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新读取取消结果' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '重新读取取消结果' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '重新读取取消结果' })).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: '重新读取取消结果' }));
    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('已确认取消意图保存成功');
    expect(notice).toHaveFocus();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/cancel'))).toHaveLength(1);
  });
});
