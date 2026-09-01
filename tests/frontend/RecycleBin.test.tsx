// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RecycleBin } from '../../frontend/src/features/recycle/RecycleBin.js';

const recycledProject = {
  id: 'de65378e-8935-4c4a-9e8b-13efca3d314a', name: '可恢复项目', workflowStatus: 'ready', lifecycleStatus: 'recycled', recycledAt: '2026-08-13T02:00:00.000Z', recycleExpiresAt: '2099-08-15T02:00:00.000Z', version: 6, updatedAt: '2026-08-13T02:00:00.000Z',
  cleanupJob: { id: 'aa65378e-8935-4c4a-9e8b-13efca3d314a', status: 'scheduled', attemptCount: 0, leaseExpiresAt: null, nextAttemptAt: null, lastError: null, completedAt: null },
} as const;

const purging = (project = recycledProject) => ({ ...project, lifecycleStatus: 'purging' as const, version: project.version + 1, cleanupJob: { ...project.cleanupJob, status: 'leased' as const, attemptCount: 1 } });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const renderRecycleBin = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const result = render(<QueryClientProvider client={queryClient}><RecycleBin /></QueryClientProvider>);
  return { ...result, queryClient };
};

const mockApi = (state: { items: Array<typeof recycledProject | ReturnType<typeof purging>>; purge?: (url: string, init?: RequestInit) => Promise<Response> | Response }) => vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
  const url = String(input);
  if (url.startsWith('/api/recycle-bin')) return Promise.resolve(json({ total: state.items.length, items: state.items }));
  if (init?.method === 'POST' && url.endsWith('/restore')) return Promise.resolve(json({ project: {} }));
  if (init?.method === 'POST' && url.endsWith('/purge')) return Promise.resolve(state.purge?.(url, init) ?? json({ project: {} }, 201));
  if (url.includes('/purge/commands/')) return Promise.resolve(json({ project: {} }));
  return Promise.resolve(json({ error: { message: 'unexpected request' } }, 500));
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('项目回收站永久删除与清空', () => {
  it('仅 recycled 行有永久删除，空回收站禁用清空入口', async () => {
    const purgingProject = purging();
    mockApi({ items: [purgingProject] });
    renderRecycleBin();
    await screen.findByText('清理中');
    expect(screen.queryByRole('button', { name: '永久删除' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '恢复项目' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清空回收站' })).toBeDisabled();
    expect(screen.getByText('没有可清理的已回收项目。')).toBeInTheDocument();
  });

  it('单项确认要求完整项目名和勾选，取消及 Escape 回到触发点', async () => {
    mockApi({ items: [recycledProject] });
    renderRecycleBin();
    const trigger = await screen.findByRole('button', { name: '永久删除' });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: '永久删除「可恢复项目」？' });
    const returnButton = screen.getByRole('button', { name: '返回回收站' });
    await waitFor(() => expect(document.activeElement).toBe(returnButton));
    const deleteButton = screen.getAllByRole('button', { name: '永久删除' }).at(-1)!;
    expect(deleteButton).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '可恢复项目' } });
    expect(deleteButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText('我已了解进入清理后无法恢复'));
    expect(deleteButton).toBeEnabled();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
  });

  it('单项 pending 锁定全部关闭入口，服务端接受后只显示进入清理', async () => {
    let resolvePost: ((response: Response) => void) | undefined;
    const state = { items: [recycledProject] as Array<typeof recycledProject | ReturnType<typeof purging>>, purge: () => new Promise<Response>((resolve) => { resolvePost = resolve; }) };
    mockApi(state);
    renderRecycleBin();
    fireEvent.click(await screen.findByRole('button', { name: '永久删除' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '可恢复项目' } });
    fireEvent.click(screen.getByLabelText('我已了解进入清理后无法恢复'));
    fireEvent.click(screen.getAllByRole('button', { name: '永久删除' }).at(-1)!);
    expect(await screen.findByText('正在提交永久删除……')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回回收站' })).toBeDisabled();
    expect(screen.getByLabelText('我已了解进入清理后无法恢复')).toBeDisabled();
    state.items = [purging()];
    await act(async () => { resolvePost?.(json({ project: {} }, 201)); });
    expect(await screen.findByText('项目“可恢复项目”已进入清理流程，现已不可恢复。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '永久删除' })).not.toBeInTheDocument();
    expect(screen.getAllByText('清理中')).toHaveLength(2);
  });

  it('单项 unknown 只用原 Idempotency-Key GET 查询，绝不二次 POST', async () => {
    const fetchMock = mockApi({ items: [recycledProject], purge: () => Promise.reject(new TypeError('连接中断')) });
    renderRecycleBin();
    fireEvent.click(await screen.findByRole('button', { name: '永久删除' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '可恢复项目' } });
    fireEvent.click(screen.getByLabelText('我已了解进入清理后无法恢复'));
    fireEvent.click(screen.getAllByRole('button', { name: '永久删除' }).at(-1)!);
    expect(await screen.findByText('永久删除结果未知')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查询本次命令' }));
    expect(await screen.findByText(/已进入清理流程/)).toBeInTheDocument();
    const posts = fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    const commandGets = fetchMock.mock.calls.filter(([url]) => String(url).includes('/purge/commands/'));
    expect(posts).toHaveLength(1);
    expect(commandGets).toHaveLength(1);
    const postKey = (posts[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(String(commandGets[0]?.[0])).toContain(encodeURIComponent(postKey['idempotency-key']));
  });

  it('清空忽略当前筛选并全量逐项提交，显示 X/N、S/F', async () => {
    const second = { ...recycledProject, id: 'de65378e-8935-4c4a-9e8b-13efca3d314b', name: '第二项目', version: 9, cleanupJob: { ...recycledProject.cleanupJob, id: 'aa65378e-8935-4c4a-9e8b-13efca3d314b' } } as const;
    const fetchMock = mockApi({ items: [recycledProject, second] });
    renderRecycleBin();
    await screen.findByText('第二项目');
    fireEvent.change(screen.getByLabelText('生命周期'), { target: { value: 'purging' } });
    fireEvent.click(screen.getByRole('button', { name: '清空回收站' }));
    expect(await screen.findByRole('dialog', { name: '清空回收站？' })).toHaveTextContent('将处理服务端全量快照中的 2 个已回收项目');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '清空回收站' } });
    fireEvent.click(screen.getByLabelText('我已核对项目数量并了解成功项目无法恢复'));
    fireEvent.click(screen.getByRole('button', { name: '开始清空' }));
    expect(await screen.findByText('已处理 2 / 总数 2，成功 2，失败 0')).toBeInTheDocument();
    expect(screen.getAllByText('已进入清理')).toHaveLength(2);
    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '清空回收站' })).toBeEnabled();
    expect(screen.getAllByRole('button', { name: '恢复项目' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: '恢复项目' }).every((button) => !button.hasAttribute('disabled'))).toBe(true);
  });

  it('清空确认前集合变化会清除旧确认且不发送 POST', async () => {
    const second = { ...recycledProject, id: 'de65378e-8935-4c4a-9e8b-13efca3d314b', name: '第二项目', version: 9, cleanupJob: { ...recycledProject.cleanupJob, id: 'aa65378e-8935-4c4a-9e8b-13efca3d314b' } } as const;
    const state = { items: [recycledProject, second] as Array<typeof recycledProject | typeof second> };
    const fetchMock = mockApi(state);
    renderRecycleBin();
    await screen.findByText('第二项目');
    fireEvent.click(screen.getByRole('button', { name: '清空回收站' }));
    await screen.findByRole('dialog', { name: '清空回收站？' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '清空回收站' } });
    fireEvent.click(screen.getByLabelText('我已核对项目数量并了解成功项目无法恢复'));
    state.items = [recycledProject];
    fireEvent.click(screen.getByRole('button', { name: '开始清空' }));
    expect(await screen.findByText('回收站中的可清理项目已变化。已清除原确认，请重新核对数量并再次确认。')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByLabelText('我已核对项目数量并了解成功项目无法恢复')).not.toBeChecked();
    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
  });

  it('批量部分失败保留失败理由，继续项重新进入高风险确认', async () => {
    const second = { ...recycledProject, id: 'de65378e-8935-4c4a-9e8b-13efca3d314b', name: '第二项目', version: 9, cleanupJob: { ...recycledProject.cleanupJob, id: 'aa65378e-8935-4c4a-9e8b-13efca3d314b' } } as const;
    let postCount = 0;
    mockApi({ items: [recycledProject, second], purge: () => { postCount += 1; return postCount === 1 ? json({ project: {} }, 201) : json({ error: { message: '版本已变化', requestId: 'purge-failed' } }, 409); } });
    renderRecycleBin();
    await screen.findByText('第二项目');
    fireEvent.click(screen.getByRole('button', { name: '清空回收站' }));
    await screen.findByRole('dialog', { name: '清空回收站？' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '清空回收站' } }); fireEvent.click(screen.getByLabelText('我已核对项目数量并了解成功项目无法恢复')); fireEvent.click(screen.getByRole('button', { name: '开始清空' }));
    expect(await screen.findByText('已处理 2 / 总数 2，成功 1，失败 1')).toBeInTheDocument();
    expect(screen.getByText(/版本已变化；请求标识 purge-failed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清空回收站' })).toBeEnabled();
    expect(screen.getAllByRole('button', { name: '恢复项目' }).every((button) => !button.hasAttribute('disabled'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '继续处理未完成项' }));
    expect(await screen.findByRole('dialog', { name: '清空回收站？' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始清空' })).toBeDisabled();
  });

  it('页面加载、轮询式失效和筛选不自动发送 purge', async () => {
    const fetchMock = mockApi({ items: [recycledProject] });
    const { queryClient } = renderRecycleBin();
    await screen.findByText('可恢复项目');
    fireEvent.change(screen.getByLabelText('生命周期'), { target: { value: 'recycled' } });
    await act(async () => { await queryClient.invalidateQueries({ queryKey: ['recycle-bin'] }); });
    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
  });

  it('批量运行中锁定页面，完成后进度面板仍保留但操作恢复', async () => {
    let resolvePost: ((response: Response) => void) | undefined;
    const state = { items: [recycledProject] as Array<typeof recycledProject | ReturnType<typeof purging>>, purge: () => new Promise<Response>((resolve) => { resolvePost = resolve; }) };
    mockApi(state);
    renderRecycleBin();
    await screen.findByText('可恢复项目');
    fireEvent.click(screen.getByRole('button', { name: '清空回收站' }));
    await screen.findByRole('dialog', { name: '清空回收站？' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '清空回收站' } });
    fireEvent.click(screen.getByLabelText('我已核对项目数量并了解成功项目无法恢复'));
    fireEvent.click(screen.getByRole('button', { name: '开始清空' }));
    expect(await screen.findByText('正在提交')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清空回收站' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '恢复项目' })).toBeDisabled();
    await act(async () => { resolvePost?.(json({ project: {} }, 201)); });
    expect(await screen.findByText('已处理 1 / 总数 1，成功 1，失败 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清空回收站' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '恢复项目' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: '清空回收站进度' })).toBeInTheDocument();
  });
});
