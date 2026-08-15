// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AppShell } from '../../frontend/src/components/AppShell.js';
import { PreReviewWorkspace } from '../../frontend/src/features/pre-review/PreReviewWorkspace.js';

const projectId = '10000000-0000-4000-8000-000000000001';
const sessionId = '10000000-0000-4000-8000-000000000002';
const episodeOneId = '10000000-0000-4000-8000-000000000003';
const episodeTwoId = '10000000-0000-4000-8000-000000000004';
const termVersionId = '10000000-0000-4000-8000-000000000005';
const manifestId = '10000000-0000-4000-8000-000000000006';
const companyAssetId = '10000000-0000-4000-8000-000000000007';
const videoAssetId = '10000000-0000-4000-8000-000000000008';
const asrResultId = '10000000-0000-4000-8000-000000000009';
const digest = 'a'.repeat(64);
const now = '2026-08-14T08:00:00.000Z';

const project = {
  id: projectId,
  name: '匿名审改项目',
  workflowStatus: 'ready',
  lifecycleStatus: 'active',
  recycleExpiresAt: null,
  version: 3,
  createdAt: now,
  updatedAt: now,
  createdBy: 'local-user',
  updatedBy: 'local-user',
};

const termWorkspace = {
  source: { status: 'ready', manifestId, sourceSrtSetDigest: digest, episodeCount: 2, assetCount: 2, issueCode: null, issueDetail: null },
  sourceIsCurrent: true,
  activeDraft: null,
  latestRun: null,
  latestVersion: { id: termVersionId, projectId, version: 4, sourceSrtSetDigest: digest, promptVersion: 'terms-v1', itemCount: 8, createdAt: now },
};

const episode = (episodeNumber: number, options: { status?: 'ready' | 'limited' | 'completed'; pending?: number; blocking?: number } = {}) => ({
  id: episodeNumber === 1 ? episodeOneId : episodeTwoId,
  sessionId,
  episodeNumber,
  companyAssetId,
  asr: options.status === 'limited' ? null : {
    resultId: asrResultId,
    resultDigest: digest,
    assetId: videoAssetId,
    termVersionId,
    provider: 'fake',
    adapter: 'deterministic_fake',
    model: 'fake-v1',
    language: 'zh-CN',
    configDigest: digest,
    hotwordDigest: digest,
    qualityStatus: 'pass',
  },
  videoAssetId,
  videoDurationMs: 60_000,
  videoDurationStatus: 'known',
  status: options.status ?? 'ready',
  limitedReason: options.status === 'limited' ? '没有可用的中文识别结果' : null,
  policyOverride: null,
  effectivePolicy: 'company_primary',
  completionSignature: options.status === 'completed' ? digest : null,
  revision: 2,
  counts: { total: 3, pending: options.pending ?? 3, blocking: options.blocking ?? 0, decided: 0 },
  updatedAt: now,
});

const sessionDetail = (options: { status?: 'ready' | 'limited' | 'stale' | 'completed'; limited?: boolean; complete?: boolean } = {}) => ({
  id: sessionId,
  projectId,
  projectVersion: 3,
  sourceSrtSetDigest: digest,
  termVersionId,
  manifestId,
  manifestVersion: 2,
  sourceDigest: digest,
  algorithmVersion: 'pre-edit-v1',
  formatPolicyVersion: 'format-v1',
  status: options.status ?? 'ready',
  defaultPolicy: 'company_primary',
  revision: 5,
  errorCode: null,
  errorDetail: null,
  episodeCounts: { total: 2, completed: options.complete ? 2 : 0, limited: options.limited ? 1 : 0 },
  createdAt: now,
  updatedAt: now,
  episodes: options.complete
    ? [episode(1, { status: 'completed', pending: 0 }), episode(2, { status: 'completed', pending: 0 })]
    : [episode(1), episode(2, options.limited ? { status: 'limited' } : {})],
});

const cue = (source: 'company' | 'asr', index: number, text: string) => ({
  cueId: `${source}-${index}`,
  cueIndex: index,
  startMs: index * 1_000,
  endMs: index * 1_000 + 800,
  text,
  confidence: source === 'asr' ? 0.94 : null,
});

type Kind = 'one_to_one' | 'company_only' | 'asr_only' | 'one_company_many_asr' | 'many_company_one_asr' | 'uncertain';
const item = (index: number, groupKind: Kind, options: { blocking?: boolean; human?: boolean } = {}) => {
  const hasCompany = groupKind !== 'asr_only';
  const hasAsr = groupKind !== 'company_only';
  const companyCues = hasCompany
    ? [cue('company', index, options.blocking ? '这是一个去掉空白以后明确超过二十八个汉字并且需要人工填写保留理由的匿名长句台词' : `公司稿${index}`)]
    : [];
  const asrCues = hasAsr ? [cue('asr', index, `识别文本${index}`)] : [];
  return {
    id: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    sessionId,
    episodeId: episodeOneId,
    episodeNumber: 1,
    groupId: `30000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    groupKind,
    groupDigest: digest,
    targetCompanyCueId: hasCompany ? companyCues[0]!.cueId : null,
    companyCues,
    asrCues,
    timeOverlapMs: hasCompany && hasAsr ? 800 : 0,
    textSimilarity: hasCompany && hasAsr ? 0.72 : 0,
    policyOverride: null,
    effectivePolicy: 'company_primary',
    systemAction: hasCompany ? 'keep_company' : 'add_asr',
    systemText: hasCompany ? companyCues[0]!.text : asrCues[0]!.text,
    currentAction: hasCompany ? 'keep_company' : 'add_asr',
    currentText: hasCompany ? companyCues[0]!.text : asrCues[0]!.text,
    decisionOrigin: options.human ? 'human' : 'system',
    currentDecisionEventId: options.human ? '40000000-0000-4000-8000-000000000001' : null,
    requiresReview: true,
    termEvidence: [],
    formatIssues: options.blocking ? [{ code: 'long_line', message: '有效文字超过 28 字', blocking: true, overridable: true }] : [],
    formatOverrideReason: null,
    version: 2,
    updatedAt: now,
  };
};

const normalItems = [item(1, 'company_only'), item(2, 'asr_only'), item(3, 'one_to_one'), item(4, 'one_company_many_asr'), item(5, 'many_company_one_asr'), item(6, 'uncertain')];
const itemForEpisode = (episodeNumber: number, index: number, text: string) => ({
  ...item(index, 'one_to_one'),
  id: `50000000-0000-4000-8000-${String(episodeNumber * 100 + index).padStart(12, '0')}`,
  episodeId: episodeNumber === 1 ? episodeOneId : episodeTwoId,
  episodeNumber,
  companyCues: [cue('company', index, text)],
  currentText: text,
  systemText: text,
});
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const apiFailure = (
  requestId: string,
  message = '权威事实暂时不可用',
  status = 503,
  retryable = status >= 500,
  code = 'PRE_EDIT_READ_FAILED',
) => response({ error: { code, message, retryable, action: 'reload_pre_edit', requestId } }, status);

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
};

const baseFetch = (options: { detail?: ReturnType<typeof sessionDetail>; items?: ReturnType<typeof item>[] } = {}) => {
  const detail = options.detail ?? sessionDetail();
  const rows = options.items ?? normalItems;
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.endsWith('/material-manifest')) return response({ project, manifest: null });
    if (url.endsWith(`/projects/${projectId}/terms`)) return response(termWorkspace);
    if (url.endsWith('/pre-review/sessions') && method === 'GET') return response({ items: [{ ...detail, episodes: undefined }], total: 1 });
    if (url.endsWith(`/pre-review/sessions/${sessionId}`)) return response(detail);
    if (url.includes(`/pre-review/sessions/${sessionId}/items?`)) return response({ items: rows, total: rows.length });
    if (url.endsWith('/pre-review/releases')) return response({ items: [] });
    if (url.endsWith('/playback')) return response({ assetId: videoAssetId, episodeNumber: 1, url: '/media/episode.mp4', expiresAt: now, seek: { startMs: 1_000, contextEndMs: 6_000 } });
    throw new Error(`未模拟请求：${method} ${url}`);
  });
};

const Destination = ({ name, onRender }: { name: string; onRender?: (name: string) => void }) => {
  onRender?.(name);
  return <div>{name}</div>;
};

const renderPage = (options: { withShell?: boolean; onDestination?: (name: string) => void } = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const routes = <Routes>
    <Route path="/projects/:projectId/pre-review" element={<PreReviewWorkspace />} />
    <Route path="/projects/:projectId/terms" element={<div>术语页</div>} />
    <Route path="/projects" element={<Destination name="项目中心页" onRender={options.onDestination} />} />
    <Route path="/uploads" element={<Destination name="上传任务页" onRender={options.onDestination} />} />
    <Route path="/recycle-bin" element={<Destination name="回收站页" onRender={options.onDestination} />} />
    <Route path="/asr-dispatches" element={<Destination name="中文识别任务页" onRender={options.onDestination} />} />
  </Routes>;
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[`/projects/${projectId}/pre-review`]}>{options.withShell ? <AppShell>{routes}</AppShell> : routes}</MemoryRouter></QueryClientProvider>);
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('FRONT-M3-03B 前置审改工作台', () => {
  it('消费权威六类对齐并按关系渐进显示决定，同时不伪造 AI 与风险事实', async () => {
    vi.stubGlobal('fetch', baseFetch());
    const view = renderPage();
    expect(await screen.findByText('唯一最终采纳稿')).toBeInTheDocument();
    expect(screen.getByText('AI 快速筛选').nextElementSibling).toHaveTextContent('未启用');
    fireEvent.click(screen.getByRole('tab', { name: '问题列表' }));
    expect(screen.getByRole('button', { name: '删除公司轴' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '采用识别文本' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /仅识别轴/ }));
    expect(screen.getByRole('button', { name: '补入识别轴' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '忽略识别轴' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /一对一/ }));
    expect(screen.getByRole('button', { name: '采用识别文本' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '本集全轴' }));
    const drawer = await screen.findByRole('dialog', { name: /本集全轴/ });
    expect((await within(drawer).findAllByText('未启用')).length).toBeGreaterThan(0);
    expect(within(drawer).queryByRole('button', { name: /编辑|决定|修改时间/ })).not.toBeInTheDocument();
    expect(view.container.textContent).not.toContain('⇄');
    const blend = view.container.querySelector('[class*="sourceBlend"]');
    expect(blend).toHaveTextContent('');
    expect(blend).toHaveAttribute('aria-hidden', 'true');
  });

  it('切集、翻页和筛选等待新身份响应时卸载旧条目，稳定后只选择新身份条目', async () => {
    const episodeTwoPending = deferred<Response>();
    const pagePending = deferred<Response>();
    const filterPending = deferred<Response>();
    const first = itemForEpisode(1, 11, '第一集旧条目');
    const second = itemForEpisode(2, 21, '第二集新条目');
    const nextPage = itemForEpisode(2, 31, '第二集后页条目');
    const decided = itemForEpisode(2, 41, '第二集已决定条目');
    let decisionPosts = 0;
    const fallback = baseFetch();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/decisions')) {
        decisionPosts += 1;
        return response({ item: second, replay: false });
      }
      if (url.includes(`/pre-review/sessions/${sessionId}/items?`)) {
        const query = new URL(url, 'http://localhost').searchParams;
        if (query.get('status') === 'all') return response({ items: [first], total: 1 });
        if (query.get('episodeNumber') === '1') return response({ items: [first], total: 1 });
        if (query.get('status') === 'decided') return filterPending.promise;
        if (query.get('offset') === '30') return pagePending.promise;
        return episodeTwoPending.promise;
      }
      return fallback(input, init);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await waitFor(() => expect(screen.getAllByText('第一集旧条目')).not.toHaveLength(0));

    fireEvent.click(screen.getByRole('button', { name: /第 2 集/ }));
    expect(screen.queryAllByText('第一集旧条目')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: '保留公司稿' })).not.toBeInTheDocument();
    expect(decisionPosts).toBe(0);
    act(() => episodeTwoPending.resolve(response({ items: [second], total: 61 })));
    await waitFor(() => expect(screen.getAllByText('第二集新条目')).not.toHaveLength(0));
    const finalDraft = screen.getByText('唯一最终采纳稿').closest('section')!;
    expect(within(finalDraft).getByText('第二集新条目')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '问题列表' }));

    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    expect(screen.queryAllByText('第二集新条目')).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: '保留公司稿' })).toHaveLength(0);
    act(() => pagePending.resolve(response({ items: [nextPage], total: 61 })));
    await waitFor(() => expect(screen.getAllByText('第二集后页条目')).not.toHaveLength(0));

    fireEvent.change(screen.getByRole('combobox', { name: '问题状态' }), { target: { value: 'decided' } });
    expect(screen.queryAllByText('第二集后页条目')).toHaveLength(0);
    act(() => filterPending.resolve(response({ items: [decided], total: 1 })));
    await waitFor(() => expect(screen.getAllByText('第二集已决定条目')).not.toHaveLength(0));
    expect(decisionPosts).toBe(0);
  });

  it('决定提交中锁定语境，503 与网络未知都聚焦唯一恢复并复用同一幂等键', async () => {
    const pending = deferred<Response>();
    const keys: Array<string | null> = [];
    let decisionCalls = 0;
    const fetchMock = baseFetch();
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/decisions')) {
        decisionCalls += 1;
        keys.push(new Headers(init?.headers).get('idempotency-key'));
        if (decisionCalls === 1) return pending.promise;
        if (decisionCalls === 2) throw new TypeError('网络连接已中断');
        return response({ item: { ...normalItems[0], requiresReview: false, decisionOrigin: 'human' }, replay: true });
      }
      return baseFetch()(input, init);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByText('唯一最终采纳稿');
    fireEvent.click(screen.getByRole('button', { name: '保留公司稿' }));
    const decisionPane = screen.getByRole('main');
    await waitFor(() => expect(decisionPane).toHaveFocus());
    expect(screen.getByRole('button', { name: /第 2 集/ })).toBeDisabled();
    fireEvent.keyDown(decisionPane, { key: 'Tab' });
    expect(decisionPane).toHaveFocus();
    act(() => pending.resolve(apiFailure('req_decision_01', '决定服务暂时不可用', 503, true)));
    const retry = await screen.findByRole('button', { name: '重试同一决定' });
    await waitFor(() => expect(retry).toHaveFocus());
    expect(screen.getByText(/req_decision_01/)).toBeInTheDocument();
    fireEvent.click(retry);
    const networkRetry = await screen.findByRole('button', { name: '重试同一决定' });
    await waitFor(() => expect(networkRetry).toHaveFocus());
    expect(screen.getByText(/网络连接已中断/)).toBeInTheDocument();
    fireEvent.click(networkRetry);
    await screen.findByText(/已保存“保留公司稿”/);
    expect(keys).toHaveLength(3);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).toBe(keys[0]);
    expect(screen.getByText(/已保存“保留公司稿”/)).toHaveFocus();
  });

  it('确定性 409 清除旧意图并刷新权威版本，下一次显式提交使用新 body 和新键', async () => {
    const keys: Array<string | null> = [];
    const versions: number[] = [];
    let decisionCalls = 0;
    let authorityVersion = 2;
    let sessionReads = 0;
    const fallback = baseFetch();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith(`/pre-review/sessions/${sessionId}`)) {
        sessionReads += 1;
        return response(sessionDetail());
      }
      if (url.includes(`/pre-review/sessions/${sessionId}/items?`) && !url.includes('status=all')) {
        return response({ items: [{ ...normalItems[0], version: authorityVersion }], total: 1 });
      }
      if (url.endsWith('/decisions')) {
        decisionCalls += 1;
        keys.push(new Headers(init?.headers).get('idempotency-key'));
        versions.push((JSON.parse(String(init?.body)) as { expectedVersion: number }).expectedVersion);
        if (decisionCalls === 1) {
          authorityVersion = 3;
          return apiFailure('req_conflict_01', '决定版本冲突', 409, false, 'PRE_EDIT_VERSION_CONFLICT');
        }
        return response({ item: { ...normalItems[0], version: 4, requiresReview: false, decisionOrigin: 'human' }, replay: false });
      }
      return fallback(input, init);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByText('唯一最终采纳稿');
    fireEvent.click(screen.getByRole('button', { name: '保留公司稿' }));
    const reload = await screen.findByRole('button', { name: '重新读取权威事实' });
    expect(screen.getByText(/req_conflict_01/)).toBeInTheDocument();
    await waitFor(() => expect(sessionReads).toBeGreaterThan(1));
    expect(decisionCalls).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: '保留公司稿' }));
    await screen.findByText(/已保存“保留公司稿”/);
    expect(reload).not.toBeInTheDocument();
    expect(decisionCalls).toBe(2);
    expect(versions).toEqual([2, 3]);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBeTruthy();
    expect(keys[1]).not.toBe(keys[0]);
  });

  it('脏态阻止切换并把焦点放在保存；长句理由不足八字不能提交', async () => {
    vi.stubGlobal('fetch', baseFetch({ items: [item(7, 'company_only', { blocking: true })] }));
    renderPage();
    await screen.findByText(/有效文字超过 28 字/);
    fireEvent.click(screen.getByRole('button', { name: '手动修改' }));
    const editor = screen.getByRole('textbox', { name: '最终文本' });
    fireEvent.change(editor, { target: { value: '尚未保存的新文案' } });
    fireEvent.click(screen.getByRole('button', { name: /第 2 集/ }));
    const dirtyAlert = screen.getByText('修改尚未保存').closest('[role="alert"]')!;
    expect(within(dirtyAlert).getByRole('button', { name: '保存修改' })).toHaveFocus();

    fireEvent.click(within(dirtyAlert).getByRole('button', { name: '放弃修改' }));
    fireEvent.click(screen.getByRole('button', { name: '明确保留并记录理由' }));
    const reason = screen.getByRole('textbox', { name: /保留理由/ });
    fireEvent.change(reason, { target: { value: '理由太短' } });
    expect(screen.getByRole('button', { name: '保存修改' })).toBeDisabled();
    fireEvent.change(reason, { target: { value: '角色一口气说完才能保留情绪节奏' } });
    expect(screen.getByRole('button', { name: '保存修改' })).toBeEnabled();
  });

  it('全局侧栏离开进入同一行内脏态门禁，放弃只导航一次且理由保存保持原决定语义', async () => {
    const destinations: string[] = [];
    vi.stubGlobal('fetch', baseFetch({ items: [item(7, 'company_only', { blocking: true })] }));
    const firstView = renderPage({ withShell: true, onDestination: (name) => destinations.push(name) });
    await screen.findByText(/有效文字超过 28 字/);
    fireEvent.click(screen.getByRole('button', { name: '手动修改' }));
    fireEvent.change(screen.getByRole('textbox', { name: '最终文本' }), { target: { value: '全局导航前尚未保存' } });
    const globalNavigation = screen.getByLabelText('全局导航');
    fireEvent.click(within(globalNavigation).getByRole('link', { name: '上传任务' }));
    const guard = screen.getByText('修改尚未保存').closest('[role="alert"]')!;
    expect(within(guard).getByRole('button', { name: '保存修改' })).toHaveFocus();
    expect(screen.queryByText('上传任务页')).not.toBeInTheDocument();
    fireEvent.click(within(guard).getByRole('button', { name: '放弃修改' }));
    await screen.findByText('上传任务页');
    expect(destinations).toEqual(['上传任务页']);
    firstView.unmount();

    let savedBody: Record<string, unknown> | null = null;
    let decisionCalls = 0;
    const fallback = baseFetch({ items: [item(7, 'company_only', { blocking: true })] });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/decisions')) {
        decisionCalls += 1;
        savedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return response({ item: { ...item(7, 'company_only', { blocking: true }), formatOverrideReason: savedBody.formatOverrideReason, decisionOrigin: 'human' }, replay: false });
      }
      return fallback(input, init);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage({ withShell: true, onDestination: (name) => destinations.push(name) });
    await screen.findByText(/有效文字超过 28 字/);
    fireEvent.click(screen.getByRole('button', { name: '明确保留并记录理由' }));
    fireEvent.change(screen.getByRole('textbox', { name: /保留理由/ }), { target: { value: '角色必须一口气说完才能保留情绪节奏' } });
    fireEvent.click(within(screen.getByLabelText('全局导航')).getByRole('link', { name: '项目中心' }));
    const reasonGuard = screen.getByText('修改尚未保存').closest('[role="alert"]')!;
    fireEvent.click(within(reasonGuard).getByRole('button', { name: '保存修改' }));
    await screen.findByText('项目中心页');
    expect(decisionCalls).toBe(1);
    expect(savedBody).toMatchObject({ action: 'keep_company', formatOverrideReason: '角色必须一口气说完才能保留情绪节奏' });
    expect(savedBody).not.toHaveProperty('text');
    expect(destinations).toEqual(['上传任务页', '项目中心页']);
  });

  it('有限审改隐藏 ASR 决定并禁止冒充完成双源对照', async () => {
    const detail = sessionDetail({ status: 'limited', limited: true });
    detail.episodes = [episode(1, { status: 'limited' }), episode(2)];
    vi.stubGlobal('fetch', baseFetch({ detail, items: [item(1, 'company_only')] }));
    renderPage();
    expect(await screen.findByText(/仅公司稿有限审改/)).toBeInTheDocument();
    expect(await screen.findByText(/本集缺少可用 ASR/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保留公司稿' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '手动处理公司稿格式' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /采用识别|补入识别|忽略识别/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /完成本集/ })).toBeDisabled();
    expect(screen.getByText(/有限审改不可完成双源对照/)).toBeInTheDocument();
  });

  it('基准与危险决定形成键盘闭环，视频按真实元数据识别竖屏并从放大层恢复焦点', async () => {
    const fetchMock = baseFetch();
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/policy/preview')) return response({ sessionId, sessionRevision: 5, scope: 'series', policy: 'company_primary', affectedItemCount: 6, safeUpdateCount: 2, protectedHumanDecisionCount: 1, requiresHumanDecisionCount: 3 });
      return baseFetch()(input, init);
    });
    vi.stubGlobal('fetch', fetchMock);
    const view = renderPage();
    await screen.findByText('唯一最终采纳稿');

    const baselineTrigger = screen.getByRole('button', { name: '调整文本基准' });
    fireEvent.click(baselineTrigger);
    const baseline = await screen.findByRole('dialog', { name: '调整文本基准' });
    expect(within(baseline).getByRole('button', { name: '取消' })).toHaveFocus();
    fireEvent.keyDown(baseline, { key: 'Escape' });
    await waitFor(() => expect(baselineTrigger).toHaveFocus());

    const dangerTrigger = screen.getByRole('button', { name: '删除公司轴' });
    fireEvent.click(dangerTrigger);
    const danger = await screen.findByRole('dialog', { name: '删除这个公司轴？' });
    const cancel = within(danger).getByRole('button', { name: '取消' });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(danger, { key: 'Tab', shiftKey: true });
    expect(within(danger).getByRole('button', { name: '确认' })).toHaveFocus();
    fireEvent.keyDown(danger, { key: 'Escape' });
    await waitFor(() => expect(dangerTrigger).toHaveFocus());

    const video = view.container.querySelector('video')!;
    expect(video).toHaveAccessibleName('第 1 集视频证据');
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 1080 });
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 1920 });
    fireEvent.loadedMetadata(video);
    expect(screen.getByText(/1080×1920 · 竖屏/)).toBeInTheDocument();
    const enlarge = screen.getByRole('button', { name: '放大' });
    fireEvent.click(enlarge);
    const close = await screen.findByRole('button', { name: '关闭放大视频' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog', { name: '放大视频证据' }), { key: 'Escape' });
    await waitFor(() => expect(enlarge).toHaveFocus());
  });

  it('切换条目清理旧画幅事实，媒体 error 与 play rejection 都显示兼容代理阻断', async () => {
    vi.stubGlobal('fetch', baseFetch({ items: [normalItems[0]!, normalItems[2]!] }));
    const firstView = renderPage();
    await screen.findByText('唯一最终采纳稿');
    const firstVideo = await screen.findByLabelText('第 1 集视频证据');
    Object.defineProperty(firstVideo, 'videoWidth', { configurable: true, value: 1080 });
    Object.defineProperty(firstVideo, 'videoHeight', { configurable: true, value: 1920 });
    fireEvent.loadedMetadata(firstVideo);
    expect(screen.getByText(/1080×1920 · 竖屏/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '问题列表' }));
    fireEvent.click(screen.getByRole('button', { name: /一对一/ }));
    await waitFor(() => expect(screen.queryByText(/1080×1920 · 竖屏/)).not.toBeInTheDocument());
    const switchedVideo = await screen.findByLabelText('第 1 集视频证据');
    expect(switchedVideo).not.toBe(firstVideo);
    fireEvent.error(switchedVideo);
    const mediaError = await screen.findByRole('alert');
    expect(mediaError).toHaveTextContent('当前编码不受浏览器支持');
    expect(mediaError).toHaveTextContent('需要后续兼容代理');
    await waitFor(() => expect(mediaError).toHaveFocus());
    expect(screen.queryByRole('button', { name: '播放' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '放大' })).toBeDisabled();
    firstView.unmount();

    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockRejectedValue(new DOMException('decode failed', 'NotSupportedError'));
    renderPage();
    await screen.findByText('唯一最终采纳稿');
    fireEvent.click(await screen.findByRole('button', { name: '播放' }));
    const rejected = await screen.findByRole('alert');
    expect(rejected).toHaveTextContent('当前编码不受浏览器支持');
    expect(rejected).toHaveTextContent('需要后续兼容代理');
    await waitFor(() => expect(rejected).toHaveFocus());
  });

  it('全轴定位触发媒体错误时保留模态焦点，定位节点卸载后回到抽屉容器', async () => {
    vi.stubGlobal('fetch', baseFetch());
    const firstView = renderPage();
    await screen.findByText('唯一最终采纳稿');
    const initialVideo = await screen.findByLabelText('第 1 集视频证据');
    fireEvent.click(screen.getByRole('button', { name: '本集全轴' }));
    const drawer = await screen.findByRole('dialog', { name: /本集全轴/ });
    const locate = (await within(drawer).findAllByRole('button', { name: '定位' }))[2]!;
    locate.focus();
    fireEvent.click(locate);
    await waitFor(() => expect(screen.getByLabelText('第 1 集视频证据')).not.toBe(initialVideo));
    locate.focus();
    expect(locate).toHaveFocus();
    fireEvent.error(screen.getByLabelText('第 1 集视频证据'));
    const mediaError = await screen.findByRole('alert');
    expect(mediaError).not.toHaveFocus();
    expect(locate).toHaveFocus();
    expect(drawer.contains(document.activeElement)).toBe(true);
    firstView.unmount();

    const nextPagePending = deferred<Response>();
    const fallback = baseFetch();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/items?') && url.includes('status=all')) {
        const query = new URL(url, 'http://localhost').searchParams;
        if (query.get('offset') === '20') return nextPagePending.promise;
        return response({ items: normalItems, total: 26 });
      }
      return fallback(input, init);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByText('唯一最终采纳稿');
    const secondInitialVideo = await screen.findByLabelText('第 1 集视频证据');
    fireEvent.click(screen.getByRole('button', { name: '本集全轴' }));
    const refreshedDrawer = await screen.findByRole('dialog', { name: /本集全轴/ });
    const refreshedLocate = (await within(refreshedDrawer).findAllByRole('button', { name: '定位' }))[2]!;
    refreshedLocate.focus();
    fireEvent.click(refreshedLocate);
    await waitFor(() => expect(screen.getByLabelText('第 1 集视频证据')).not.toBe(secondInitialVideo));
    refreshedLocate.focus();
    fireEvent.click(within(refreshedDrawer).getByRole('button', { name: '下一页' }));
    expect(refreshedLocate).not.toBeInTheDocument();
    fireEvent.error(screen.getByLabelText('第 1 集视频证据'));
    await screen.findByRole('alert');
    await waitFor(() => expect(refreshedDrawer).toHaveFocus());
    expect(refreshedDrawer.contains(document.activeElement)).toBe(true);
  });

  it('全轴读取再次失败保留唯一恢复动作，恢复后聚焦关闭并支持分页定位', async () => {
    let axisCalls = 0;
    const nextPagePending = deferred<Response>();
    const fetchMock = baseFetch();
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/items?') && url.includes('status=all')) {
        axisCalls += 1;
        if (axisCalls === 1) return apiFailure('req_axis_01');
        if (axisCalls === 2) return apiFailure('req_axis_02');
        if (axisCalls === 4) return nextPagePending.promise;
        return response({ items: normalItems, total: 26 });
      }
      return baseFetch()(input, init);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByText('唯一最终采纳稿');
    fireEvent.click(screen.getByRole('button', { name: '本集全轴' }));
    let retry = await screen.findByRole('button', { name: '重新读取全轴' });
    expect(screen.getByText(/req_axis_01/)).toBeInTheDocument();
    fireEvent.click(retry);
    retry = await screen.findByRole('button', { name: '重新读取全轴' });
    await waitFor(() => expect(retry).toHaveFocus());
    expect(screen.getByText(/req_axis_02/)).toBeInTheDocument();
    fireEvent.click(retry);
    const close = await screen.findByRole('button', { name: '关闭本集全轴' });
    await waitFor(() => expect(close).toHaveFocus());
    const drawer = screen.getByRole('dialog', { name: /本集全轴/ });
    expect(within(drawer).getByRole('button', { name: '下一页' })).toBeEnabled();
    expect(within(drawer).getAllByRole('button', { name: '定位' })).toHaveLength(6);
    fireEvent.click(within(drawer).getByRole('button', { name: '下一页' }));
    expect(within(drawer).queryByRole('button', { name: '定位' })).not.toBeInTheDocument();
    expect(within(drawer).getByText('正在读取本集全部轴…')).toBeInTheDocument();
    act(() => nextPagePending.resolve(response({ items: [itemForEpisode(1, 99, '全轴后页新条目')], total: 26 })));
    await within(drawer).findByText('全轴后页新条目');
    expect(within(drawer).getAllByRole('button', { name: '定位' })).toHaveLength(1);
  });

  it('来源失效保持历史只读，整剧完成只暴露不可变 SRT 发布动作', async () => {
    vi.stubGlobal('fetch', baseFetch({ detail: sessionDetail({ status: 'stale' }), items: [normalItems[0]!] }));
    const view = renderPage();
    expect(await screen.findByText('来源已经变化，历史会话只读')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除公司轴' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '从新来源创建会话' })).toBeEnabled();
    view.unmount();

    vi.stubGlobal('fetch', baseFetch({ detail: sessionDetail({ status: 'completed', complete: true }), items: [normalItems[0]!] }));
    renderPage();
    expect(await screen.findByRole('button', { name: '生成待验收修订 SRT' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '完成本集并进入下一未完成集' })).not.toBeInTheDocument();
  });
});
