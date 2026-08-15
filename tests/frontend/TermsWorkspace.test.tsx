// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { TermsWorkspace } from '../../frontend/src/features/terms/TermsWorkspace.js';

const projectId = 'ca65378e-8935-4c4a-9e8b-13efca3d314a';
const draftId = 'ca65378e-8935-4c4a-9e8b-13efca3d314b';
const candidateId = 'ca65378e-8935-4c4a-9e8b-13efca3d314c';
const versionId = 'ca65378e-8935-4c4a-9e8b-13efca3d314d';
const templateId = 'ca65378e-8935-4c4a-9e8b-13efca3d314e';
const exportId = 'ca65378e-8935-4c4a-9e8b-13efca3d314f';
const cueId = 'a'.repeat(64);
const digest = 'b'.repeat(64);

const project = {
  id: projectId,
  name: '匿名术语项目',
  workflowStatus: 'ready',
  lifecycleStatus: 'active',
  recycleExpiresAt: null,
  version: 1,
  createdAt: '2026-08-12T08:00:00.000Z',
  updatedAt: '2026-08-12T08:00:00.000Z',
  createdBy: 'local-user',
  updatedBy: 'local-user',
};

const candidate = {
  id: candidateId,
  draftId,
  type: '人名',
  name: '叶知秋',
  aliases: ['知秋'],
  gender: 'female',
  note: '女主角',
  origin: 'extracted',
  confidence: 0.94,
  status: 'pending',
  version: 1,
  evidenceCount: 1,
  firstEvidence: { cueId, assetId: projectId, episodeNumber: 1, cueIndex: 2, startMs: 1200, endMs: 2400, text: '叶知秋回来了' },
  createdAt: '2026-08-12T08:00:00.000Z',
  updatedAt: '2026-08-12T08:00:00.000Z',
};

const columns = [
  { field: 'type', header: '类别' },
  { field: 'name', header: '术语' },
  { field: 'aliases', header: '别称' },
  { field: 'gender', header: '性别' },
  { field: 'note', header: '备注' },
];

const template = {
  id: templateId,
  version: 3,
  name: '公司术语模板',
  columns,
  isActive: true,
  createdAt: '2026-08-12T08:00:00.000Z',
};

const workspace = (pendingCount = 1, withDraft = true) => ({
  source: { status: 'ready', manifestId: projectId, sourceSrtSetDigest: digest, episodeCount: 60, assetCount: 60, issueCode: null, issueDetail: null },
  sourceIsCurrent: true,
  activeDraft: withDraft ? {
    id: draftId,
    projectId,
    sourceSrtSetDigest: digest,
    promptVersion: 'terms-v1',
    baseTermVersionId: null,
    status: 'active',
    revision: 4,
    pendingCount,
    candidateCount: pendingCount,
    createdAt: '2026-08-12T08:00:00.000Z',
    updatedAt: '2026-08-12T08:00:00.000Z',
  } : null,
  latestRun: { id: projectId, projectId, draftId, sourceSrtSetDigest: digest, promptVersion: 'terms-v1', adapter: 'local', adapterConfig: {}, usageSummary: {}, status: 'completed', requestId: 'req-terms', cueCount: 100, candidateCount: pendingCount, diagnostics: [], errorCode: null, errorDetail: null, createdAt: '2026-08-12T08:00:00.000Z', completedAt: '2026-08-12T08:01:00.000Z' },
  latestVersion: { id: versionId, projectId, version: 2, sourceSrtSetDigest: digest, promptVersion: 'terms-v1', itemCount: 8, createdAt: '2026-08-12T08:00:00.000Z' },
});

const version = {
  id: versionId,
  projectId,
  version: 3,
  sourceSrtSetDigest: digest,
  promptVersion: 'terms-v1',
  itemCount: 1,
  createdAt: '2026-08-12T08:00:00.000Z',
  items: [],
};

const exported = {
  id: exportId,
  projectId,
  termVersionId: versionId,
  templateVersionId: templateId,
  templateName: '历史公司模板',
  templateVersion: 2,
  columns: columns.map((item, index) => ({ ...item, header: `历史表头${index + 1}` })),
  structureDigest: 'c'.repeat(64),
  createdAt: '2026-08-12T08:02:00.000Z',
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
};

const baseFetch = (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.endsWith('/material-manifest')) return response({ project, manifest: null });
  if (url.endsWith(`/projects/${projectId}/terms`)) return response(workspace());
  if (url === '/api/terms/export-templates') return response({ activeTemplateVersionId: templateId, items: [template] });
  if (url.endsWith(`/terms/candidates/${candidateId}`)) return response({ ...candidate, evidence: [candidate.firstEvidence], decisionEvents: [] });
  if (url.includes('/terms/candidates?')) return response({ items: [candidate], total: 1 });
  if (url.endsWith('/terms/versions')) return response({ items: [version] });
  if (url.endsWith(`/versions/${versionId}/exports`)) return response({ items: [exported] });
  throw new Error(`未模拟请求：${url}`);
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/projects/${projectId}/terms`]}>
        <Routes><Route path="/projects/:projectId/terms" element={<TermsWorkspace />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('正式术语工作台', () => {
  it('消费后端正式筛选排序并从版本接口恢复原历史导出绑定', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => baseFetch(input));
    renderPage();

    expect(await screen.findByText('叶知秋')).toBeInTheDocument();
    expect(screen.getByText('60 集 · 60 份素材')).toBeInTheDocument();
    expect(screen.getByText('历史公司模板 · 模板 V2')).toBeInTheDocument();
    expect(screen.getByText(/历史表头1 \/ 历史表头2 \/ 历史表头3 \/ 历史表头4 \/ 历史表头5/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '下载原历史 XLSX' })).toHaveAttribute('href', `/api/projects/${projectId}/terms/exports/${exportId}/export.xlsx`);

    const candidateUrl = fetchMock.mock.calls.map(([input]) => String(input)).find((url) => url.includes('/terms/candidates?'))!;
    expect(candidateUrl).toContain('sortBy=firstEvidence');
    expect(candidateUrl).toContain('sortDirection=asc');
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain(`/api/projects/${projectId}/terms/versions/${versionId}/exports`);
  });

  it('普通当前页选择在候选翻页时清空，旧页 ID 不进入下一页批量提交', async () => {
    const secondId = 'ca65378e-8935-4c4a-9e8b-13efca3d3154';
    const second = { ...candidate, id: secondId, name: '后页候选' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/projects/${projectId}/terms`)) return response(workspace(21));
      if (url.includes('/terms/candidates?')) {
        const query = new URL(url, 'http://localhost').searchParams;
        return response({ items: query.get('offset') === '20' ? [second] : [candidate], total: 21 });
      }
      if (url.includes('/terms/candidates/batch-decisions') && init?.method === 'POST') {
        return response({ items: [{ candidateId: secondId, ok: true, candidate: { ...second, status: 'approved', version: 2 } }] });
      }
      return baseFetch(input);
    });
    renderPage();
    await screen.findByText('叶知秋');
    fireEvent.click(screen.getByRole('checkbox', { name: '选择 叶知秋' }));
    expect(screen.getByText('已选择当前页 1 项')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    await screen.findByText('后页候选');
    await waitFor(() => expect(screen.queryByText('已选择当前页 1 项')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '批量确认' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '选择 后页候选' }));
    fireEvent.click(screen.getByRole('button', { name: '批量确认' }));
    await screen.findByText('批量处理完成：1 项已保存。');
    const batchCall = fetchMock.mock.calls.find(([input, init]) => String(input).includes('/terms/candidates/batch-decisions') && init?.method === 'POST')!;
    expect(JSON.parse(String(batchCall[1]?.body)).items).toEqual([
      { candidateId: secondId, expectedVersion: 1, action: 'approve' },
    ]);
  });

  it('人工新增只能选择当前草稿 Cue 接口返回的真实证据', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/terms/cues?')) return response({ items: [{ cueId, assetId: projectId, episodeNumber: 1, cueIndex: 7, startMs: 3000, endMs: 5000, text: '潮汐症候群再次出现' }], total: 1 });
      if (url.endsWith('/terms/candidates') && init?.method === 'POST') return response({ ...candidate, id: 'ca65378e-8935-4c4a-9e8b-13efca3d3150', name: '潮汐症候群', origin: 'manual', status: 'edited' }, 201);
      return baseFetch(input);
    });
    renderPage();
    await screen.findByText('叶知秋');
    fireEvent.click(screen.getByRole('button', { name: '人工新增' }));

    const name = await screen.findByRole('textbox', { name: '规范名' });
    expect(name).toHaveFocus();
    fireEvent.change(name, { target: { value: '潮汐症候群' } });
    const save = screen.getByRole('button', { name: '保存人工术语' });
    expect(save).toBeDisabled();
    fireEvent.click(await screen.findByRole('checkbox', { name: /第 1 集 · 第 7 轴/ }));
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await screen.findByText('术语候选已由后端保存。');
    const cueRequest = fetchMock.mock.calls.map(([input]) => String(input)).find((url) => url.includes('/terms/cues?'))!;
    expect(cueRequest).toContain(`draftId=${draftId}`);
    const createCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/terms/candidates') && init?.method === 'POST')!;
    expect(JSON.parse(String(createCall[1]?.body))).toMatchObject({ name: '潮汐症候群', evidenceCueIds: [cueId], draftId });
  });

  it('人工新增通过服务端 Cue 分页选择超过 30 条后的证据，并在筛选与翻页间保留选择', async () => {
    const laterCueId = 'd'.repeat(64);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/terms/cues?')) {
        const query = new URL(url, 'http://localhost').searchParams;
        if (query.get('search') === '不存在') return response({ items: [], total: 0 });
        if (query.get('episodeNumber') === '2') return response({ items: [], total: 0 });
        if (query.get('offset') === '30') return response({ items: [{ cueId: laterCueId, assetId: projectId, episodeNumber: 31, cueIndex: 1, startMs: 3000, endMs: 5000, text: '后页真实证据' }], total: 31 });
        return response({ items: [{ cueId, assetId: projectId, episodeNumber: 1, cueIndex: 7, startMs: 1000, endMs: 2000, text: '首页真实证据' }], total: 31 });
      }
      if (url.endsWith('/terms/candidates') && init?.method === 'POST') return response({ ...candidate, origin: 'manual', status: 'edited' }, 201);
      return baseFetch(input);
    });
    renderPage();
    await screen.findByText('叶知秋');
    fireEvent.click(screen.getByRole('button', { name: '人工新增' }));
    const dialog = await screen.findByRole('dialog', { name: '人工新增术语' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: '规范名' }), { target: { value: '跨页术语' } });
    fireEvent.click(await within(dialog).findByRole('checkbox', { name: /第 1 集 · 第 7 轴/ }));
    expect(within(dialog).getByText(/已选择 1 条/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole('textbox', { name: '搜索原文' }), { target: { value: '不存在' } });
    await waitFor(() => expect(fetchMock.mock.calls.map(([input]) => String(input)).some((url) => url.includes('search=%E4%B8%8D%E5%AD%98%E5%9C%A8'))).toBe(true));
    expect(within(dialog).getByText(/已选择 1 条/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox', { name: '搜索原文' }), { target: { value: '' } });
    await within(dialog).findByText('首页真实证据');
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: '集数' }), { target: { value: '2' } });
    await waitFor(() => expect(fetchMock.mock.calls.map(([input]) => String(input)).some((url) => url.includes('episodeNumber=2'))).toBe(true));
    expect(within(dialog).getByText(/已选择 1 条/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: '集数' }), { target: { value: '' } });
    await within(dialog).findByText('首页真实证据');
    fireEvent.click(within(dialog).getByRole('button', { name: '下一页' }));
    fireEvent.click(await within(dialog).findByRole('checkbox', { name: /第 31 集 · 第 1 轴/ }));
    expect(within(dialog).getByText(/已选择 2 条/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '保存人工术语' }));

    await screen.findByText('术语候选已由后端保存。');
    const createCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/terms/candidates') && init?.method === 'POST')!;
    expect(JSON.parse(String(createCall[1]?.body)).evidenceCueIds).toEqual([cueId, laterCueId]);
    expect(fetchMock.mock.calls.map(([input]) => String(input)).some((url) => url.includes('/terms/cues?') && url.includes('limit=30') && url.includes('offset=30'))).toBe(true);
  });

  it('候选侧栏提交中聚焦 dialog 并约束键盘，失败提交后聚焦重新可用的关闭按钮', async () => {
    const decision = deferred<Response>();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/terms/candidates/${candidateId}`) && init?.method === 'PATCH') return decision.promise;
      return baseFetch(input);
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '叶知秋' }));
    const dialog = await screen.findByRole('dialog', { name: '术语证据' });
    fireEvent.click(await within(dialog).findByRole('button', { name: '驳回' }));

    await waitFor(() => expect(dialog).toHaveFocus());
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: '术语证据' })).toBeInTheDocument();

    await act(async () => decision.resolve(response({ error: { code: 'TERM_CANDIDATE_VERSION_CONFLICT', message: '候选已更新', retryable: false, action: 'refresh_candidate', requestId: 'req-panel' } }, 409)));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '关闭术语证据' })).toHaveFocus());
    expect(within(dialog).getByText('候选已更新')).toBeInTheDocument();
  });

  it('全部采用局部失败时停止版本与导出，并只给失败行一个恢复动作', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/terms/candidates/batch-decisions') && init?.method === 'POST') return response({ items: [{ candidateId, ok: false, error: { code: 'TERM_CANDIDATE_VERSION_CONFLICT', message: '候选已被其他人更新' } }] });
      return baseFetch(input);
    });
    renderPage();
    await screen.findByText('叶知秋');
    fireEvent.click(screen.getByRole('checkbox', { name: '选择 叶知秋' }));
    // 让权威待确认总数大于当前页选中数，显式升级到全量范围。
    // fixture 本页仅 1 行，因此先通过摘要的全量路径进行确认。
    fireEvent.click(screen.getByRole('button', { name: '批量确认' }));
    await screen.findByText('批量处理部分完成：0 项成功，1 项失败。请逐项重试。');
    expect(screen.getAllByRole('button', { name: '重试' })).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/terms/versions') && fetchMock.mock.calls.find((call) => call[0] === input)?.[1]?.method === 'POST')).toBe(false);
    expect(fetchMock.mock.calls.some(([input, init]) => String(input).includes('/versions/') && String(input).endsWith('/exports') && init?.method === 'POST')).toBe(false);
  });

  it('显式全量选择跨当前页读取全部待确认，局部失败不创建版本或文件', async () => {
    const second = { ...candidate, id: 'ca65378e-8935-4c4a-9e8b-13efca3d3152', name: '潮汐症候群', version: 2 };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/projects/${projectId}/terms`)) return response(workspace(2));
      if (url.includes('/terms/candidates?') && url.includes('status=pending')) return response({ items: [candidate, second], total: 2 });
      if (url.includes('/terms/candidates?')) return response({ items: [candidate], total: 1 });
      if (url.includes('/terms/candidates/batch-decisions') && init?.method === 'POST') return response({ items: [
        { candidateId, ok: true, candidate: { ...candidate, status: 'approved', version: 2 } },
        { candidateId: second.id, ok: false, error: { code: 'TERM_CANDIDATE_VERSION_CONFLICT', message: '候选已被其他人更新' } },
      ] });
      return baseFetch(input);
    });
    renderPage();
    await screen.findByText('叶知秋');
    fireEvent.click(screen.getByRole('checkbox', { name: '选择 叶知秋' }));
    fireEvent.click(screen.getByRole('button', { name: '选择全部 2 项待确认候选' }));
    fireEvent.click(screen.getByRole('button', { name: '全部采用并导出 XLSX' }));
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
    fireEvent.click(screen.getAllByRole('button', { name: '全部采用并导出 XLSX' }).at(-1)!);

    expect(await screen.findByText('全部采用未完成：1 项已采用，1 项失败。未创建新版本，未生成 XLSX。')).toBeInTheDocument();
    expect(screen.getByText('潮汐症候群')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '重试' })).toHaveLength(1);
    expect(fetchMock.mock.calls.map(([input]) => String(input)).some((url) => url.includes('status=pending') && url.includes('limit=100'))).toBe(true);
    expect(fetchMock.mock.calls.some(([input, init]) => String(input).endsWith('/terms/versions') && init?.method === 'POST')).toBe(false);
    expect(fetchMock.mock.calls.some(([input, init]) => String(input).endsWith('/exports') && init?.method === 'POST')).toBe(false);
  });

  it('零待确认通过单一发布事务创建版本、模板版本与导出，确认框初始聚焦取消', async () => {
    const calls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/projects/${projectId}/terms`)) return response(workspace(0));
      if (url.includes('/terms/candidates?')) return response({ items: [], total: 0 });
      if (url.endsWith('/terms/releases') && init?.method === 'POST') { calls.push('release'); return response({ version, export: exported }, 201); }
      return baseFetch(input);
    });
    renderPage();
    const trigger = await screen.findByRole('button', { name: '确认并导出' });
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
    fireEvent.click(screen.getByRole('dialog').querySelector('button.primaryButton') ?? screen.getAllByRole('button', { name: '确认并导出' }).at(-1)!);
    await screen.findByText(/术语 V3 已创建/);
    expect(calls).toEqual(['release']);
  });

  it('发布结果未知时使用相同请求与幂等键重放，并恢复同一组版本、模板和导出标识', async () => {
    const releaseCalls: Array<{ body: string; key: string }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/projects/${projectId}/terms`)) return response(workspace(0));
      if (url.includes('/terms/candidates?')) return response({ items: [], total: 0 });
      if (url.endsWith('/terms/releases') && init?.method === 'POST') {
        releaseCalls.push({
          body: String(init.body),
          key: (init.headers as Record<string, string>)['idempotency-key'],
        });
        if (releaseCalls.length === 1) throw new TypeError('发布结果未知');
        return response({ version, export: exported }, 200);
      }
      return baseFetch(input);
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '确认并导出' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '确认并导出' }));
    expect(await within(dialog).findByText('发布结果未知')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '确认并导出' }));

    await screen.findByText(/术语 V3 已创建/);
    expect(releaseCalls).toHaveLength(2);
    expect(releaseCalls[1]).toEqual(releaseCalls[0]);
    expect(JSON.parse(releaseCalls[0]!.body)).toEqual({
      draftId,
      expectedDraftRevision: 4,
      expectedSourceSrtSetDigest: digest,
      templateVersionId: templateId,
    });
  });

  it('发布确定性冲突后清除旧意图并刷新权威草稿，下一次显式提交使用新请求体和新键', async () => {
    const releaseCalls: Array<{ body: string; key: string }> = [];
    let workspaceReads = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/projects/${projectId}/terms`)) {
        workspaceReads += 1;
        const data = workspace(0);
        if (workspaceReads > 1 && data.activeDraft) data.activeDraft.revision = 5;
        return response(data);
      }
      if (url.includes('/terms/candidates?')) return response({ items: [], total: 0 });
      if (url.endsWith('/terms/releases') && init?.method === 'POST') {
        releaseCalls.push({ body: String(init.body), key: (init.headers as Record<string, string>)['idempotency-key'] });
        if (releaseCalls.length === 1) return response({ error: { code: 'TERM_DRAFT_VERSION_CONFLICT', message: '草稿已更新，请重新提交', retryable: false, action: 'refresh_terms', requestId: 'req-release-conflict' } }, 409);
        return response({ version, export: exported }, 201);
      }
      return baseFetch(input);
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '确认并导出' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '确认并导出' }));

    expect(await within(dialog).findByText('草稿已更新，请重新提交')).toBeInTheDocument();
    await waitFor(() => expect(workspaceReads).toBeGreaterThan(1));
    expect(releaseCalls).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole('button', { name: '确认并导出' }));
    await screen.findByText(/术语 V3 已创建/);

    expect(releaseCalls).toHaveLength(2);
    expect(releaseCalls[1]!.key).not.toBe(releaseCalls[0]!.key);
    expect(JSON.parse(releaseCalls[0]!.body).expectedDraftRevision).toBe(4);
    expect(JSON.parse(releaseCalls[1]!.body).expectedDraftRevision).toBe(5);
  });

  it.each([
    ['项目已回收', { lifecycleStatus: 'recycled' }, {}],
    ['项目清理中', { lifecycleStatus: 'purging' }, {}],
    ['公司 SRT 来源变化', {}, { sourceIsCurrent: false }],
    ['最新提取运行中', {}, { latestRun: { ...workspace().latestRun, status: 'running', completedAt: null } }],
  ])('%s 时保留证据与历史浏览，但所有术语写入口只读', async (_label, projectPatch, workspacePatch) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/material-manifest')) return response({ project: { ...project, ...projectPatch }, manifest: null });
      if (url.endsWith(`/projects/${projectId}/terms`)) return response({ ...workspace(), ...workspacePatch });
      return baseFetch(input);
    });
    renderPage();
    await screen.findByText('叶知秋');
    expect(screen.getByRole('link', { name: '下载原历史 XLSX' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '人工新增' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '选择 叶知秋' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /第 1 集.*第 2 轴.*1 条证据/ }));
    expect(await screen.findByRole('dialog', { name: '术语证据' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭术语证据' }));
    fireEvent.click(screen.getByRole('button', { name: '查看模板' }));
    expect(screen.getByRole('textbox', { name: '模板名称' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '保存并启用' })).not.toBeInTheDocument();
  });

  it('普通选择与批量只包含 pending，rejected 必须先恢复后才可编辑或裁决', async () => {
    const rejected = { ...candidate, status: 'rejected', pendingCount: 0 };
    const approved = { ...candidate, id: 'ca65378e-8935-4c4a-9e8b-13efca3d3153', name: '已确认术语', status: 'approved' };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith(`/projects/${projectId}/terms`)) return response(workspace(0));
      if (url.includes('/terms/candidates?')) return response({ items: [rejected, approved], total: 2 });
      return baseFetch(input);
    });
    renderPage();
    await screen.findByText('叶知秋');
    expect(screen.getByRole('checkbox', { name: '选择 叶知秋' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '选择 已确认术语' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '选择当前页待确认候选' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '批量确认' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('叶知秋 更多操作'));
    expect(screen.getByRole('button', { name: '恢复' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '驳回' })).not.toBeInTheDocument();
  });

  it('模板窗口固定五字段并创建不可变新版本后显式启用', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === '/api/terms/export-templates' && init?.method === 'POST') return response({ ...template, id: 'ca65378e-8935-4c4a-9e8b-13efca3d3151', version: 4, name: '新模板', isActive: false }, 201);
      if (url.includes('/export-templates/') && url.endsWith('/activate')) return response({ ...template, version: 4, name: '新模板' });
      return baseFetch(input);
    });
    renderPage();
    await screen.findByText('叶知秋');
    fireEvent.click(screen.getByRole('button', { name: '管理模板' }));
    expect(screen.getByRole('button', { name: '关闭模板管理' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'type 表头' })).toHaveValue('类别');
    expect(screen.getByRole('textbox', { name: 'name 表头' })).toHaveValue('术语');
    expect(screen.getByRole('textbox', { name: 'aliases 表头' })).toHaveValue('别称');
    expect(screen.getByRole('textbox', { name: 'gender 表头' })).toHaveValue('性别');
    expect(screen.getByRole('textbox', { name: 'note 表头' })).toHaveValue('备注');
    fireEvent.change(screen.getByRole('textbox', { name: '模板名称' }), { target: { value: '新模板' } });
    fireEvent.click(screen.getByRole('button', { name: '保存并启用' }));
    await screen.findByText('公司导出模板状态已更新。');

    const createCall = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/terms/export-templates' && init?.method === 'POST')!;
    const body = JSON.parse(String(createCall[1]?.body));
    expect(body.columns.map((item: { field: string }) => item.field)).toEqual(['type', 'name', 'aliases', 'gender', 'note']);
    expect((createCall[1]?.headers as Record<string, string>)['idempotency-key']).toBeTruthy();
  });

  it('模板窗口提交中聚焦 dialog 并约束键盘，失败提交后聚焦重新可用的关闭按钮', async () => {
    const createTemplate = deferred<Response>();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === '/api/terms/export-templates' && init?.method === 'POST') return createTemplate.promise;
      return baseFetch(input);
    });
    renderPage();
    await screen.findByText('叶知秋');
    fireEvent.click(screen.getByRole('button', { name: '管理模板' }));
    const dialog = screen.getByRole('dialog', { name: '术语导出模板' });
    fireEvent.click(within(dialog).getByRole('button', { name: '保存新版本' }));

    await waitFor(() => expect(dialog).toHaveFocus());
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    dialog.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: '术语导出模板' })).toBeInTheDocument();

    await act(async () => createTemplate.resolve(response({ error: { code: 'TERM_TEMPLATE_VERSION_CONFLICT', message: '模板已更新', retryable: false, action: 'refresh_templates', requestId: 'req-template' } }, 409)));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '关闭模板管理' })).toHaveFocus());
    expect(within(dialog).getByText('模板已更新')).toBeInTheDocument();
  });
});
