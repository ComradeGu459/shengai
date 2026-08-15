// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RecycleBin } from '../../frontend/src/features/recycle/RecycleBin.js';

const recycledProject = {
  id: 'de65378e-8935-4c4a-9e8b-13efca3d314a',
  name: '可恢复项目',
  workflowStatus: 'ready',
  lifecycleStatus: 'recycled',
  recycledAt: '2026-08-13T02:00:00.000Z',
  recycleExpiresAt: '2099-08-15T02:00:00.000Z',
  version: 6,
  updatedAt: '2026-08-13T02:00:00.000Z',
  cleanupJob: {
    id: 'aa65378e-8935-4c4a-9e8b-13efca3d314a',
    status: 'scheduled',
    attemptCount: 0,
    leaseExpiresAt: null,
    nextAttemptAt: null,
    lastError: null,
    completedAt: null,
  },
} as const;

const renderRecycleBin = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RecycleBin />
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('项目回收站', () => {
  it('显示后端生命周期、清理失败事实和请求标识', async () => {
    const purgingProject = {
      ...recycledProject,
      id: 'de65378e-8935-4c4a-9e8b-13efca3d3140',
      name: '正在清理项目',
      lifecycleStatus: 'purging',
      version: 7,
      cleanupJob: {
        ...recycledProject.cleanupJob,
        id: 'aa65378e-8935-4c4a-9e8b-13efca3d3140',
        status: 'leased',
        attemptCount: 1,
      },
    } as const;
    const retryableProject = {
      ...recycledProject,
      id: 'de65378e-8935-4c4a-9e8b-13efca3d314b',
      name: '等待重试项目',
      lifecycleStatus: 'purging',
      version: 8,
      cleanupJob: {
        ...recycledProject.cleanupJob,
        id: 'aa65378e-8935-4c4a-9e8b-13efca3d314b',
        status: 'retryable',
        attemptCount: 2,
        nextAttemptAt: '2026-08-13T05:00:00.000Z',
        lastError: '临时对象存储故障',
      },
    } as const;
    const failedProject = {
      ...retryableProject,
      id: 'de65378e-8935-4c4a-9e8b-13efca3d314c',
      name: '最终失败项目',
      cleanupJob: {
        ...retryableProject.cleanupJob,
        id: 'aa65378e-8935-4c4a-9e8b-13efca3d314c',
        status: 'failed',
        attemptCount: 5,
        nextAttemptAt: null,
        lastError: '达到后台重试上限',
      },
    } as const;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      total: 4,
      items: [recycledProject, purgingProject, retryableProject, failedProject],
    }), { status: 200 }));

    renderRecycleBin();

    expect(await screen.findByText('可恢复项目')).toBeInTheDocument();
    expect(screen.getAllByText('已回收')).toHaveLength(2);
    expect(screen.getAllByText('清理中')).toHaveLength(2);
    expect(screen.getAllByText('等待后台重试')).toHaveLength(2);
    expect(screen.getByText('原因：临时对象存储故障')).toBeInTheDocument();
    expect(screen.getByText('请求标识 aa65378e-8935-4c4a-9e8b-13efca3d314b')).toBeInTheDocument();
    expect(screen.getAllByText('清理最终失败')).toHaveLength(2);
    expect(screen.getByText('原因：达到后台重试上限')).toBeInTheDocument();
    expect(screen.getAllByText('不可恢复')).toHaveLength(3);
  });

  it('加载时保留筛选与表头骨架', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => undefined));
    renderRecycleBin();

    expect(screen.getByLabelText('生命周期')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '项目' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('正在加载回收站项目')).toHaveLength(3);
    expect(screen.queryByText('回收站为空')).not.toBeInTheDocument();
  });

  it('把搜索、三类排序和两类状态筛选提交给服务端', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ total: 0, items: [] }), { status: 200 }),
    );
    renderRecycleBin();
    await screen.findByText('回收站为空');

    const firstUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(firstUrl).toContain('sortBy=recycleExpiresAt');
    expect(firstUrl).toContain('sortDirection=asc');

    fireEvent.change(screen.getByPlaceholderText('搜索项目名称'), { target: { value: '匿名项目' } });
    fireEvent.change(screen.getByLabelText('生命周期'), { target: { value: 'purging' } });
    fireEvent.change(screen.getByLabelText('后台处理'), { target: { value: 'retryable' } });
    fireEvent.change(screen.getByLabelText('排序'), { target: { value: 'recycledAt' } });
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'desc' } });

    await waitFor(() => {
      const url = String(fetchMock.mock.calls.at(-1)?.[0]);
      expect(url).toContain('search=%E5%8C%BF%E5%90%8D%E9%A1%B9%E7%9B%AE');
      expect(url).toContain('lifecycleStatus=purging');
      expect(url).toContain('cleanupJobStatus=retryable');
      expect(url).toContain('sortBy=recycledAt');
      expect(url).toContain('sortDirection=desc');
    });
  });

  it('恢复失败保留项目并展示后端请求标识', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 1, items: [recycledProject] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          code: 'PROJECT_VERSION_CONFLICT',
          message: '项目版本已变化。',
          retryable: false,
          action: 'reload_project',
          requestId: 'request-version-conflict',
        },
      }), { status: 409 }));

    renderRecycleBin();
    await screen.findByText('可恢复项目');
    fireEvent.click(screen.getByRole('button', { name: '恢复项目' }));

    expect(await screen.findByText(/恢复失败：项目版本已变化。/)).toHaveTextContent('请求标识 request-version-conflict');
    expect(screen.getByText('可恢复项目')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '恢复项目' })).toBeEnabled();
  });

  it('恢复结果未知时以同一幂等键重试，成功后移出列表', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 1, items: [recycledProject] }), { status: 200 }))
      .mockRejectedValueOnce(new TypeError('连接中断'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        project: {
          id: recycledProject.id,
          name: recycledProject.name,
          workflowStatus: 'ready',
          lifecycleStatus: 'active',
          recycleExpiresAt: null,
          version: 7,
          createdAt: '2026-08-12T02:00:00.000Z',
          updatedAt: '2026-08-13T04:00:00.000Z',
          createdBy: 'local-user',
          updatedBy: 'local-user',
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 0, items: [] }), { status: 200 }));

    renderRecycleBin();
    await screen.findByText('可恢复项目');
    fireEvent.click(screen.getByRole('button', { name: '恢复项目' }));
    expect(await screen.findByText(/恢复失败：连接中断/)).toHaveTextContent('结果未知');

    fireEvent.click(screen.getByRole('button', { name: '恢复项目' }));
    expect(await screen.findByText(/项目“可恢复项目”已恢复/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('可恢复项目')).not.toBeInTheDocument());

    const firstHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
    const retryHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Record<string, string>;
    expect(firstHeaders['idempotency-key']).toBeTruthy();
    expect(retryHeaders['idempotency-key']).toBe(firstHeaders['idempotency-key']);
  });

  it('同一查询刷新确认清理完成时显示轻提示并移除项目', async () => {
    const purgingProject = {
      ...recycledProject,
      id: 'de65378e-8935-4c4a-9e8b-13efca3d314e',
      name: '即将清理完成项目',
      lifecycleStatus: 'purging',
      cleanupJob: {
        ...recycledProject.cleanupJob,
        id: 'aa65378e-8935-4c4a-9e8b-13efca3d314e',
        status: 'leased',
        attemptCount: 1,
      },
    } as const;
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 1, items: [purgingProject] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 0, items: [] }), { status: 200 }));

    const { queryClient } = renderRecycleBin();
    await screen.findByText('即将清理完成项目');
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['recycle-bin'] });
    });

    expect(await screen.findByText('项目“即将清理完成项目”已清理，已从普通回收站列表移除。')).toBeInTheDocument();
    expect(screen.queryByText('即将清理完成项目')).not.toBeInTheDocument();
  });

  it('CleanupJob 状态筛选中 retryable 转 leased 并消失时不误报已清理', async () => {
    const retryableProject = {
      ...recycledProject,
      id: 'de65378e-8935-4c4a-9e8b-13efca3d314f',
      name: '状态迁移项目',
      lifecycleStatus: 'purging',
      cleanupJob: {
        ...recycledProject.cleanupJob,
        id: 'aa65378e-8935-4c4a-9e8b-13efca3d314f',
        status: 'retryable',
        attemptCount: 2,
      },
    } as const;
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 0, items: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 1, items: [retryableProject] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 0, items: [] }), { status: 200 }));

    const { queryClient } = renderRecycleBin();
    await screen.findByText('回收站为空');
    fireEvent.change(screen.getByLabelText('后台处理'), { target: { value: 'retryable' } });
    await screen.findByText('状态迁移项目');
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['recycle-bin'] });
    });

    await screen.findByText('没有匹配的回收项目');
    expect(screen.queryByText(/状态迁移项目.*已清理/)).not.toBeInTheDocument();
    expect(screen.queryByText(/已从普通回收站列表移除/)).not.toBeInTheDocument();
  });

  it('前后响应均为不完整结果窗口时项目缺席不误报已清理', async () => {
    const firstWindowProject = {
      ...recycledProject,
      id: 'de65378e-8935-4c4a-9e8b-13efca3d3150',
      name: '窗口第一页项目',
      lifecycleStatus: 'purging',
      cleanupJob: {
        ...recycledProject.cleanupJob,
        id: 'aa65378e-8935-4c4a-9e8b-13efca3d3150',
        status: 'leased',
      },
    } as const;
    const secondWindowProject = {
      ...firstWindowProject,
      id: 'de65378e-8935-4c4a-9e8b-13efca3d3151',
      name: '窗口第二页项目',
      cleanupJob: {
        ...firstWindowProject.cleanupJob,
        id: 'aa65378e-8935-4c4a-9e8b-13efca3d3151',
      },
    } as const;
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 2, items: [firstWindowProject] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 2, items: [secondWindowProject] }), { status: 200 }));

    const { queryClient } = renderRecycleBin();
    await screen.findByText('窗口第一页项目');
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['recycle-bin'] });
    });

    await screen.findByText('窗口第二页项目');
    expect(screen.queryByText('窗口第一页项目')).not.toBeInTheDocument();
    expect(screen.queryByText(/已从普通回收站列表移除/)).not.toBeInTheDocument();
  });
});
