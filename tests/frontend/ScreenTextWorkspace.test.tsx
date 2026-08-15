// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { ScreenTextWorkspace } from '../../frontend/src/features/screen-text/ScreenTextWorkspace.js';

const projectId = '15d7670f-6a47-4498-ac53-3997cb04b001';
const manifestId = '15d7670f-6a47-4498-ac53-3997cb04b002';
const termVersionId = '15d7670f-6a47-4498-ac53-3997cb04b003';
const batchId = '15d7670f-6a47-4498-ac53-3997cb04b004';
const jobId = '15d7670f-6a47-4498-ac53-3997cb04b005';
const candidateId = '15d7670f-6a47-4498-ac53-3997cb04b006';
const rejectedId = '15d7670f-6a47-4498-ac53-3997cb04b007';
const pendingTwoId = '15d7670f-6a47-4498-ac53-3997cb04b008';
const dualParentId = '15d7670f-6a47-4498-ac53-3997cb04b009';
const splitChildId = '15d7670f-6a47-4498-ac53-3997cb04b010';
const digest = 'a'.repeat(64);

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

const evidenceResponse = () => new Response(new Blob(['screen-text-evidence'], { type: 'image/png' }), {
  status: 200,
  headers: { 'content-type': 'image/png' },
});

const materialState = {
  project: { id: projectId, name: '云端画面字项目', workflowStatus: 'ready', lifecycleStatus: 'active', version: 4, createdAt: '2026-08-15T01:00:00.000Z', updatedAt: '2026-08-15T01:00:00.000Z' },
  manifest: {
    id: manifestId, projectId, version: 3, rootName: 'project', episodeCount: 2, bindingCount: 4,
    confirmedAt: '2026-08-15T01:00:00.000Z', createdBy: 'tester', bindings: [],
    assetBindings: [1, 2].map((episodeNumber) => ({ manifestId, episodeNumber, role: 'screen_video', assetId: `15d7670f-6a47-4498-ac53-3997cb04b01${episodeNumber}`, sourceFingerprint: `video-${episodeNumber}`, boundAt: '2026-08-15T01:00:00.000Z' })),
  },
};

const terms = {
  source: { sourceSrtSetDigest: digest, episodeCount: 2 }, sourceIsCurrent: true, activeDraft: null, latestRun: null,
  latestVersion: { id: termVersionId, projectId, version: 3, sourceSrtSetDigest: digest, promptVersion: 'v1', itemCount: 86, createdAt: '2026-08-15T01:00:00.000Z' },
};

const job = (episodeNumber: number, status = 'review_pending') => ({
  id: episodeNumber === 1 ? jobId : '15d7670f-6a47-4498-ac53-3997cb04b015', episodeNumber,
  assetId: `15d7670f-6a47-4498-ac53-3997cb04b01${episodeNumber}`, status, cancelRequested: false,
  candidateCounts: { total: episodeNumber === 1 ? 2 : 0, pending: episodeNumber === 1 ? 1 : 0, approved: 0, edited: 0, rejected: episodeNumber === 1 ? 1 : 0 },
  stats: { probedFrameCount: 100, ocrFrameCount: 20, deduplicatedFrameCount: 80, candidateCount: episodeNumber === 1 ? 2 : 0, processingDurationMs: 1200 },
  latestAttempt: null, updatedAt: '2026-08-15T02:00:00.000Z',
});

const batch = (status = 'review_pending') => ({
  id: batchId, projectId, requestId: 'REQ-ST-06-018', scope: { kind: 'all' }, episodeNumbers: [1, 2],
  termVersionId, termVersion: 3, manifestId, manifestVersion: 3,
  execution: { kind: 'deterministic_fake', adapter: 'fake', provider: 'local', model: 'fixture', language: 'zh', deployment: 'test', inputVersion: 'v1', outputVersion: 'v1', configDigest: digest, capabilities: { supportsRegions: true, supportsConfidence: true, supportsLanguageHints: true, maxFramesPerEpisode: 100 } },
  frameStrategyVersion: 'v1', dedupeStrategyVersion: 'v1',
  termProjection: { version: 'v1', digest, includedCount: 86, normalizedCount: 86, deduplicatedCount: 86, omittedCount: 0, omissionReasons: [] },
  usage: { aggregation: 'single', reconciliationStatus: 'final', items: [] }, status, revision: 5,
  counts: { total: 2, queued: 0, running: 0, reviewPending: status === 'review_pending' ? 2 : 0, completed: 0, failed: 0, cancelled: 0, reconciliationRequired: 0 },
  jobs: [job(1), job(2)], createdAt: '2026-08-15T01:00:00.000Z', updatedAt: '2026-08-15T02:00:00.000Z',
});

const releasableBatch = (revision = 5) => {
  const current = batch('completed');
  return {
    ...current,
    revision,
    counts: { ...current.counts, reviewPending: 0, completed: 2 },
    jobs: current.jobs.map((item, index) => ({
      ...item,
      status: index === 0 ? 'completed' : 'confirmed_empty',
      candidateCounts: { total: 0, pending: 0, approved: 0, edited: 0, rejected: 0 },
    })),
  };
};

const summary = (status = 'review_pending') => {
  const detail = batch(status);
  const { execution: _execution, frameStrategyVersion: _frame, dedupeStrategyVersion: _dedupe, termProjection: _projection, usage: _usage, jobs: _jobs, ...item } = detail;
  return item;
};

const candidate = (id = candidateId, status = 'pending') => ({
  id, batchId, jobId, episodeNumber: 1, source: 'ocr', rawText: id === candidateId ? '顾淮' : '系统提示', text: id === candidateId ? '顾淮' : '系统提示',
  startMs: 72_400, endMs: 75_600, category: id === candidateId ? 'nameplate' : 'interface', position: 'center', confidence: 0.96,
  status, systemSuggestion: status === 'pending' ? 'approve' : 'ignore', suggestionReason: '确定性规则', pairGroupId: null,
  evidence: { evidenceDigest: digest, width: 1080, height: 1920, capturedAtMs: 72_400, previewPath: `/api/projects/${projectId}/screen-text/candidates/${id}/evidence` },
  termHits: id === candidateId ? [{ termVersionItemId: '15d7670f-6a47-4498-ac53-3997cb04b020', type: 'person', canonicalName: '顾淮', matchedText: '顾淮', identityEvidence: ['已确认术语'] }] : [],
  revision: 2, updatedAt: '2026-08-15T02:00:00.000Z',
});

const dualParent = () => ({
  ...candidate(dualParentId, 'pending'),
  rawText: '左侧文字\n右侧文字',
  text: '左侧文字 / 右侧文字',
  category: 'interface',
  position: 'full',
  pairGroupId: '15d7670f-6a47-4498-ac53-3997cb04b021',
});

const splitChild = () => ({
  ...candidate(splitChildId, 'pending'),
  source: 'split',
  rawText: '左侧文字',
  text: '左侧文字',
  category: 'interface',
  position: 'left',
  pairGroupId: '15d7670f-6a47-4498-ac53-3997cb04b021',
});

const defaultFetch = (options: { status?: string; candidateError?: boolean } = {}) => vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.endsWith('/material-manifest')) return response(materialState);
  if (url.endsWith('/terms')) return response(terms);
  if (/\/screen-text\/candidates\/[^/]+\/evidence$/.test(url)) return evidenceResponse();
  if (url.includes('/screen-text/releases')) return response({ items: [], total: 0, limit: 100, offset: 0 });
  if (url.endsWith(`/screen-text/batches/${batchId}`)) return response(batch(options.status));
  if (url.includes(`/screen-text/batches/${batchId}/candidates`)) {
    if (options.candidateError) return response({ error: { code: 'SCREEN_TEXT_READ_FAILED', message: '候选暂时不可读。', retryable: true, action: 'reload_screen_text', requestId: 'REQ-ST-READ-503' } }, 503);
    const query = new URL(url, 'http://local').searchParams;
    const pendingItems = [candidate(), candidate(pendingTwoId, 'pending')];
    const normalItems = [candidate(), candidate(rejectedId, 'rejected')];
    const items = (query.get('status') === 'pending' ? pendingItems : normalItems).filter((item) => !query.get('status') || item.status === query.get('status'));
    return response({ items: query.get('limit') === '1' ? items.slice(0, 1) : items, total: items.length, limit: Number(query.get('limit') ?? 30), offset: Number(query.get('offset') ?? 0) });
  }
  if (url.endsWith('/screen-text/batches') && init?.method === 'POST') return response(batch('queued'), 201);
  if (url.includes('/screen-text/candidates/') && url.endsWith('/decisions') && init?.method === 'POST') {
    const body = JSON.parse(String(init.body));
    return response({ candidate: { ...candidate(url.includes(rejectedId) ? rejectedId : candidateId, body.action === 'reject' ? 'rejected' : body.action === 'restore' ? 'pending' : body.action === 'edit' ? 'edited' : 'approved'), revision: 3 }, createdCandidates: [] });
  }
  if (url.includes('/screen-text/batches?') || url.endsWith('/screen-text/batches')) return response({ items: [summary(options.status)], total: 1, limit: 20, offset: 0 });
  throw new Error(`Unhandled fetch: ${url}`);
});

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return {
    ...render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[`/projects/${projectId}/screen-text`]}><Routes><Route path="/projects/:projectId/screen-text" element={<ScreenTextWorkspace />} /></Routes></MemoryRouter></QueryClientProvider>),
    queryClient,
  };
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('ScreenTextWorkspace', () => {
  it('消费正式门禁、批次、候选与证据事实，渲染紧凑三栏工作台', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(defaultFetch());
    renderPage();

    expect(await screen.findByText('云端画面字项目')).toBeInTheDocument();
    expect(screen.getByText('V3 · 已固定')).toBeInTheDocument();
    expect(screen.getByText('2 / 2 集就绪')).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: '选择候选 顾淮' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '集与批次队列' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '画面字候选' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '候选证据与编辑' })).toBeInTheDocument();
    expect(screen.getAllByText('顾淮').length).toBeGreaterThan(0);
    expect(await screen.findByRole('img', { name: '第 1 集画面字代表截图' })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith(`/screen-text/candidates/${candidateId}/evidence`))).toBe(true);
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('sort=identity_first') && String(input).includes('episodeNumber=1'))).toBe(true);
  });

  it('候选证据加载和真实 503 统一锁定写入，唯一重读成功后恢复动作与焦点', async () => {
    const healthy = defaultFetch();
    let evidenceCalls = 0;
    let resolveFirst!: (value: Response) => void;
    let resolveSecond!: (value: Response) => void;
    const firstEvidence = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const secondEvidence = new Promise<Response>((resolve) => { resolveSecond = resolve; });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith(`/screen-text/candidates/${candidateId}/evidence`)) {
        evidenceCalls += 1;
        return evidenceCalls === 1 ? firstEvidence : secondEvidence;
      }
      return healthy(input, init);
    });
    renderPage();

    const rowCheckbox = await screen.findByRole('checkbox', { name: '选择候选 顾淮' });
    await waitFor(() => expect(evidenceCalls).toBe(1));
    expect(rowCheckbox).toBeDisabled();
    expect(screen.getByRole('button', { name: '人工新增' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '保留并下一条' })).toBeDisabled();

    resolveFirst(response({ error: { code: 'SCREEN_TEXT_EVIDENCE_UNAVAILABLE', message: '代表截图对象暂不可读取。', retryable: true, action: 'reload_screen_text_evidence', requestId: 'REQ-ST-EVIDENCE-503' } }, 503));
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('代表截图对象暂不可读取。')).toBeInTheDocument();
    expect(within(alert).getByText('请求标识：REQ-ST-EVIDENCE-503')).toBeInTheDocument();
    const retry = within(alert).getByRole('button', { name: '重新读取候选证据' });
    expect(within(alert).getAllByRole('button')).toHaveLength(1);
    retry.focus();
    fireEvent.click(retry);
    expect(await within(alert).findByRole('button', { name: '正在读取…' })).toBeDisabled();
    expect(evidenceCalls).toBe(2);

    resolveSecond(evidenceResponse());
    expect(await screen.findByRole('img', { name: '第 1 集画面字代表截图' })).toBeInTheDocument();
    const evidencePane = screen.getByRole('complementary', { name: '候选证据与编辑' });
    await waitFor(() => expect(evidencePane).toHaveFocus());
    expect(rowCheckbox).toBeEnabled();
    expect(screen.getByRole('button', { name: '人工新增' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '保留并下一条' })).toBeEnabled();
  });

  it('来源门禁不满足时统一锁定候选选择、批量、决定、保存和人工新增', async () => {
    const healthy = defaultFetch();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith('/terms')) return response({ ...terms, sourceIsCurrent: false });
      return healthy(input, init);
    });
    renderPage();

    expect(await screen.findByRole('img', { name: '第 1 集画面字代表截图' })).toBeInTheDocument();
    expect(screen.getByText('来源门禁尚未满足')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '人工新增' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '选择当前页' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '选择候选 顾淮' })).toBeDisabled();
    screen.getAllByRole('button', { name: '处理' }).forEach((button) => expect(button).toBeDisabled());
    expect(screen.getByRole('button', { name: '忽略' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '拆分左右' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '保留并下一条' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '保存修改' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '保留并下一条' }));
    expect(fetchMock.mock.calls.filter(([input, init]) => String(input).endsWith('/decisions') && init?.method === 'POST')).toHaveLength(0);
  });

  it('未拆分左右同屏父候选只允许忽略或拆分，批量保留跳过父项并保持待确认', async () => {
    const healthy = defaultFetch();
    const decisionUrls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes(`/screen-text/batches/${batchId}/candidates`)) {
        const query = new URL(url, 'http://local').searchParams;
        const items = [dualParent(), candidate(), splitChild()].filter((item) => !query.get('status') || item.status === query.get('status'));
        return response({ items: query.get('limit') === '1' ? items.slice(0, 1) : items, total: items.length, limit: Number(query.get('limit') ?? 30), offset: Number(query.get('offset') ?? 0) });
      }
      if (url.endsWith('/decisions') && init?.method === 'POST') decisionUrls.push(url);
      return healthy(input, init);
    });
    renderPage();

    const parentRow = (await screen.findByText('左侧文字 / 右侧文字')).closest('tr')!;
    await waitFor(() => expect(screen.getByRole('button', { name: '忽略' })).toBeEnabled());
    expect(screen.getByRole('button', { name: '拆分左右' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '保留并下一条' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存修改' })).not.toBeInTheDocument();

    const normalRow = screen.getByText('顾淮').closest('tr')!;
    fireEvent.click(within(normalRow).getByRole('button', { name: '处理' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '保留并下一条' })).toBeEnabled());
    expect(screen.getByRole('button', { name: '保存修改' })).toBeEnabled();
    const childRow = screen.getByText('左侧文字').closest('tr')!;
    fireEvent.click(within(childRow).getByRole('button', { name: '处理' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '保留并下一条' })).toBeEnabled());
    expect(screen.getByRole('button', { name: '保存修改' })).toBeEnabled();

    fireEvent.click(within(parentRow).getByRole('button', { name: '处理' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '忽略' })).toBeEnabled());
    fireEvent.click(within(parentRow).getByRole('checkbox', { name: '选择候选 左侧文字 / 右侧文字' }));
    fireEvent.click(within(normalRow).getByRole('checkbox', { name: '选择候选 顾淮' }));
    fireEvent.click(screen.getByRole('button', { name: '批量保留' }));

    await waitFor(() => expect(decisionUrls).toHaveLength(1));
    expect(decisionUrls[0]).toContain(candidateId);
    expect(decisionUrls[0]).not.toContain(dualParentId);
    expect(await screen.findByText('1 项已完成。1 项左右同屏候选必须先拆分，已保持待确认。')).toBeInTheDocument();
    expect(within(parentRow).getByText('待确认')).toBeInTheDocument();
  });

  it('搜索、状态、分类、四排序与分页参数只交给服务端', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(defaultFetch());
    renderPage();
    await screen.findByRole('checkbox', { name: '选择候选 顾淮' });

    fireEvent.click(screen.getByRole('checkbox', { name: '选择候选 顾淮' }));
    expect(screen.getByText('普通选择仅作用当前页')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: '候选排序' }), { target: { value: 'confidence_desc' } });
    await waitFor(() => expect(screen.queryByText('普通选择仅作用当前页')).not.toBeInTheDocument());

    fireEvent.change(screen.getByRole('textbox', { name: '搜索候选' }), { target: { value: '顾' } });
    fireEvent.change(screen.getByRole('combobox', { name: '候选状态' }), { target: { value: 'pending' } });
    fireEvent.change(screen.getByRole('combobox', { name: '候选分类' }), { target: { value: 'nameplate' } });

    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => {
      const url = String(input);
      return url.includes('search=%E9%A1%BE') && url.includes('status=pending') && url.includes('category=nameplate') && url.includes('sort=confidence_desc');
    })).toBe(true));
  });

  it('普通选择只作用当前页，显式全选按服务端 pending 集合逐项提交', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(defaultFetch());
    renderPage();
    await screen.findByRole('checkbox', { name: '选择候选 顾淮' });

    fireEvent.click(screen.getByRole('checkbox', { name: '选择候选 顾淮' }));
    expect(screen.getByText('普通选择仅作用当前页')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '选择全部 2 项待确认候选' }));
    expect(screen.getByText('成员来自当前服务端筛选范围')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '批量保留' }));

    await waitFor(() => expect(fetchMock.mock.calls.filter(([input, init]) => String(input).endsWith('/decisions') && init?.method === 'POST')).toHaveLength(2));
    const decisionCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/decisions') && init?.method === 'POST')!;
    expect(JSON.parse(String(decisionCall[1]?.body))).toMatchObject({ action: 'approve', expectedRevision: 2 });
  });

  it('来源 stale 时旧批次保持只读，唯一业务写入口是从新来源新建批次', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(defaultFetch({ status: 'stale' }));
    renderPage();

    const primary = await screen.findByRole('button', { name: '从新来源新建批次' });
    expect(primary).toBeEnabled();
    expect(screen.getByText('来源已变化 · 旧草稿只读')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '人工新增' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '忽略' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存修改' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '选择候选 顾淮' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: '查看' }).length).toBeGreaterThan(0);
  });

  it('候选失败显示原因、请求标识和唯一恢复，成功后焦点确定落回工作台状态', async () => {
    let calls = 0;
    const healthy = defaultFetch();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).includes(`/screen-text/batches/${batchId}/candidates`)) {
        calls += 1;
        if (calls <= 2) return response({ error: { code: 'SCREEN_TEXT_READ_FAILED', message: '候选暂时不可读。', retryable: true, action: 'reload_screen_text', requestId: 'REQ-ST-READ-503' } }, 503);
      }
      return healthy(input, init);
    });
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('候选暂时不可读。')).toBeInTheDocument();
    expect(within(alert).getByText('请求标识：REQ-ST-READ-503')).toBeInTheDocument();
    const retry = within(alert).getByRole('button', { name: '重新读取候选' });
    expect(within(alert).getAllByRole('button')).toHaveLength(1);
    fireEvent.click(retry);
    expect(await screen.findByRole('checkbox', { name: '选择候选 顾淮' })).toBeInTheDocument();
  });

  it('创建提交中将焦点锁定在弹窗，重复激活不产生第二个请求', async () => {
    let resolveCreate!: (value: Response) => void;
    const pendingCreate = new Promise<Response>((resolve) => { resolveCreate = resolve; });
    const healthy = defaultFetch();
    let createCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith('/screen-text/batches') && init?.method === 'POST') {
        createCalls += 1;
        return pendingCreate;
      }
      return healthy(input, init);
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '新建识别批次' }));
    const dialog = screen.getByRole('dialog', { name: '新建识别批次' });
    expect(within(dialog).getByRole('button', { name: '关闭新建识别批次' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: '创建识别批次' }));
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(within(dialog).getByRole('button', { name: '正在创建…' })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(dialog).toBeInTheDocument();
    expect(createCalls).toBe(1);
    resolveCreate(response(batch('queued'), 201));
    const success = await screen.findByText(/识别批次 15d7670f 已创建/);
    await waitFor(() => expect(success).toHaveFocus());
  });

  it('人工新增未知结果只以原 kind、body 和幂等键恢复，不受失败后表单编辑影响', async () => {
    const healthy = defaultFetch();
    const manualCalls: Array<{ key: string | null; body: Record<string, unknown> }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith(`/screen-text/batches/${batchId}/episodes/1/candidates`) && init?.method === 'POST') {
        manualCalls.push({
          key: new Headers(init.headers).get('idempotency-key'),
          body: JSON.parse(String(init.body)) as Record<string, unknown>,
        });
        if (manualCalls.length === 1) return response({ error: { code: 'SCREEN_TEXT_WRITE_UNKNOWN', message: '人工新增结果尚未确认。', retryable: true, action: 'retry_screen_text_command', requestId: 'REQ-ST-WRITE-503' } }, 503);
        return response({ ...candidate(candidateId, 'pending'), source: 'manual', rawText: '原始新增', text: '原始新增', confidence: null }, 201);
      }
      return healthy(input, init);
    });
    renderPage();

    const manualButton = await screen.findByRole('button', { name: '人工新增' });
    await waitFor(() => expect(manualButton).toBeEnabled());
    fireEvent.click(manualButton);
    const dialog = screen.getByRole('dialog', { name: '人工新增画面字' });
    const textInput = within(dialog).getByRole('textbox', { name: '文字' });
    fireEvent.change(textInput, { target: { value: '原始新增' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '新增候选' }));
    expect(await within(dialog).findByText('人工新增结果尚未确认。')).toBeInTheDocument();
    fireEvent.change(textInput, { target: { value: '失败后编辑' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '重试同一意图' }));

    await waitFor(() => expect(manualCalls).toHaveLength(2));
    expect(manualCalls[1]?.key).toBe(manualCalls[0]?.key);
    expect(manualCalls[1]?.body).toEqual(manualCalls[0]?.body);
    expect(manualCalls[1]?.body.text).toBe('原始新增');
  });

  it('明确空集未知结果在详情修订变化后仍以同一 key 和完整原请求体恢复', async () => {
    const healthy = defaultFetch();
    let serverRevision = 5;
    let resolveFirstEmpty!: (value: Response) => void;
    const firstEmpty = new Promise<Response>((resolve) => { resolveFirstEmpty = resolve; });
    const emptyCalls: Array<{ key: string | null; body: Record<string, unknown> }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/screen-text/batches/${batchId}`) && init?.method !== 'POST') {
        return response({ ...batch(), revision: serverRevision });
      }
      if (url.endsWith(`/screen-text/batches/${batchId}/episodes/2/confirm-empty`) && init?.method === 'POST') {
        emptyCalls.push({
          key: new Headers(init.headers).get('idempotency-key'),
          body: JSON.parse(String(init.body)) as Record<string, unknown>,
        });
        if (emptyCalls.length === 1) return firstEmpty;
        return response({ ...batch(), revision: serverRevision });
      }
      return healthy(input, init);
    });
    const { queryClient } = renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /第 02 集/ }));
    const dialog = screen.getByRole('dialog', { name: '确认本集无画面字' });
    fireEvent.click(within(dialog).getByRole('button', { name: '确认本集无画面字' }));
    expect(await within(dialog).findByRole('button', { name: '正在提交…' })).toBeDisabled();
    resolveFirstEmpty(response({ error: { code: 'SCREEN_TEXT_WRITE_UNKNOWN', message: '空集确认结果尚未确认。', retryable: true, action: 'retry_screen_text_command', requestId: 'REQ-ST-EMPTY-503' } }, 503));
    expect(await within(dialog).findByText('空集确认结果尚未确认。')).toBeInTheDocument();

    serverRevision = 6;
    await queryClient.refetchQueries({ queryKey: ['screen-text-batch', projectId, batchId] });
    fireEvent.click(within(dialog).getByRole('button', { name: '重试同一意图' }));

    await waitFor(() => expect(emptyCalls).toHaveLength(2));
    expect(emptyCalls[1]?.key).toBe(emptyCalls[0]?.key);
    expect(emptyCalls[1]?.body).toEqual(emptyCalls[0]?.body);
    expect(emptyCalls[1]?.body).toEqual({ expectedBatchRevision: 5 });
  });

  it('发布未知结果在详情修订变化后仍以同一 key 和完整原请求体恢复', async () => {
    const healthy = defaultFetch();
    let serverRevision = 5;
    let resolveFirstRelease!: (value: Response) => void;
    const firstRelease = new Promise<Response>((resolve) => { resolveFirstRelease = resolve; });
    const releaseCalls: Array<{ key: string | null; body: Record<string, unknown> }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/screen-text/batches/${batchId}`) && init?.method !== 'POST') {
        return response(releasableBatch(serverRevision));
      }
      if (url.endsWith('/screen-text/releases') && init?.method === 'POST') {
        releaseCalls.push({
          key: new Headers(init.headers).get('idempotency-key'),
          body: JSON.parse(String(init.body)) as Record<string, unknown>,
        });
        if (releaseCalls.length === 1) return firstRelease;
        return response({ id: '15d7670f-6a47-4498-ac53-3997cb04b030' }, 201);
      }
      return healthy(input, init);
    });
    const { queryClient } = renderPage();

    const releaseButton = await screen.findByRole('button', { name: '发布画面字版本' });
    await waitFor(() => expect(releaseButton).toBeEnabled());
    fireEvent.click(releaseButton);
    const dialog = screen.getByRole('dialog', { name: '发布不可变画面字版本' });
    fireEvent.click(within(dialog).getByRole('button', { name: '发布版本' }));
    expect(await within(dialog).findByRole('button', { name: '正在提交…' })).toBeDisabled();
    resolveFirstRelease(response({ error: { code: 'SCREEN_TEXT_WRITE_UNKNOWN', message: '发布结果尚未确认。', retryable: true, action: 'retry_screen_text_command', requestId: 'REQ-ST-RELEASE-503' } }, 503));
    expect(await within(dialog).findByText('发布结果尚未确认。')).toBeInTheDocument();

    serverRevision = 6;
    await queryClient.refetchQueries({ queryKey: ['screen-text-batch', projectId, batchId] });
    fireEvent.click(within(dialog).getByRole('button', { name: '重试同一意图' }));

    await waitFor(() => expect(releaseCalls).toHaveLength(2));
    expect(releaseCalls[1]?.key).toBe(releaseCalls[0]?.key);
    expect(releaseCalls[1]?.body).toEqual(releaseCalls[0]?.body);
    expect(releaseCalls[1]?.body).toEqual({ batchId, expectedBatchRevision: 5 });
  });

  it('明确空集确定性冲突清除旧意图，刷新后显式提交使用新 key 和新修订', async () => {
    const healthy = defaultFetch();
    let serverRevision = 5;
    const emptyCalls: Array<{ key: string | null; body: Record<string, unknown> }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/screen-text/batches/${batchId}`) && init?.method !== 'POST') {
        return response({ ...batch(), revision: serverRevision });
      }
      if (url.endsWith(`/screen-text/batches/${batchId}/episodes/2/confirm-empty`) && init?.method === 'POST') {
        emptyCalls.push({
          key: new Headers(init.headers).get('idempotency-key'),
          body: JSON.parse(String(init.body)) as Record<string, unknown>,
        });
        if (emptyCalls.length === 1) {
          serverRevision = 6;
          return response({ error: { code: 'SCREEN_TEXT_BATCH_REVISION_CONFLICT', message: '批次修订已变化。', retryable: false, action: 'reload_screen_text', requestId: 'REQ-ST-EMPTY-409' } }, 409);
        }
        return response({ ...batch(), revision: 7 });
      }
      return healthy(input, init);
    });
    const { queryClient } = renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /第 02 集/ }));
    let dialog = screen.getByRole('dialog', { name: '确认本集无画面字' });
    fireEvent.click(within(dialog).getByRole('button', { name: '确认本集无画面字' }));
    expect(await within(dialog).findByText('批次修订已变化。')).toBeInTheDocument();
    await waitFor(() => expect((queryClient.getQueryData(['screen-text-batch', projectId, batchId]) as { revision?: number } | undefined)?.revision).toBe(6));
    fireEvent.click(within(dialog).getByRole('button', { name: '重新读取权威事实' }));

    fireEvent.click(await screen.findByRole('button', { name: /第 02 集/ }));
    dialog = screen.getByRole('dialog', { name: '确认本集无画面字' });
    fireEvent.click(within(dialog).getByRole('button', { name: '确认本集无画面字' }));

    await waitFor(() => expect(emptyCalls).toHaveLength(2));
    expect(emptyCalls[1]?.key).not.toBe(emptyCalls[0]?.key);
    expect(emptyCalls[0]?.body).toEqual({ expectedBatchRevision: 5 });
    expect(emptyCalls[1]?.body).toEqual({ expectedBatchRevision: 6 });
  });

  it('历史发布下载使用服务端恢复的 exportId 和 filename', async () => {
    const healthy = defaultFetch();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).includes('/screen-text/releases')) return response({ items: [{ id: '15d7670f-6a47-4498-ac53-3997cb04b030', projectId, version: 2, batchId, termVersionId, manifestId, draftRevision: 5, releaseDigest: digest, cueCount: 1, exports: [{ id: '15d7670f-6a47-4498-ac53-3997cb04b031', episodeNumber: 1, filename: '画面字_第01集_V2.srt', sha256: digest, sizeBytes: 42, downloadPath: '/ignored' }], createdAt: '2026-08-15T03:00:00.000Z' }], total: 1, limit: 100, offset: 0 });
      return healthy(input, init);
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '历史版本' }));
    const link = await screen.findByRole('link', { name: /画面字_第01集_V2.srt/ });
    expect(link).toHaveAttribute('href', `/api/projects/${projectId}/screen-text/exports/15d7670f-6a47-4498-ac53-3997cb04b031/download`);
  });
});
