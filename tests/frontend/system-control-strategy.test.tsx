// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { StrategyPage } from '../../system-frontend/src/strategyPage.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const emptyList = (url: URL) => ({ items: [], total: 0, limit: Number(url.searchParams.get('limit') ?? 20), offset: Number(url.searchParams.get('offset') ?? 0) });
const artifact = {
  artifactId: '11111111-1111-4111-8111-111111111111', kind: 'local_rule_pack', displayName: '字幕空格规则', status: 'draft',
  purpose: '统一人工复核前的空格提示', applicableModules: ['subtitle_acceptance'], latestVersionId: '22222222-2222-4222-8222-222222222222',
  versionCount: 1, latestVersionSummary: '1 条本地规则', createdAt: '2026-08-18T01:00:00.000Z', updatedAt: '2026-08-18T01:00:00.000Z',
};
const eventFact = {
  eventRefId: 'terms:event:001', domain: 'terms', projectId: '33333333-3333-4333-8333-333333333333', episodeNumber: 1, track: 'dialogue',
  action: 'candidate_edited', sourceVersionId: '44444444-4444-4444-8444-444444444444', artifactVersionId: null,
  createdAt: '2026-08-18T02:00:00.000Z', beforeDigest: 'a'.repeat(64), afterDigest: 'b'.repeat(64), changedFields: ['name', 'aliases'],
  evidenceCount: 2, reversesEventRefId: null, restoresEventRefId: null,
};

describe('system control strategy and learning Wave A', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/strategy?tab=overview');
    vi.stubGlobal('fetch', vi.fn(async (input) => emptyResponse(new URL(String(input), 'http://system.test'))));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('renders honest empty server facts and keeps later learning waves disabled', async () => {
    render(<StrategyPage />);
    await waitFor(() => expect(screen.getByText('尚未纳管策略资产')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: '学习候选' })).not.toBeDisabled();
    expect(screen.getByRole('tab', { name: '离线评测' })).not.toBeDisabled();
    expect(screen.getByRole('tab', { name: '批准与发布' })).toBeDisabled();
    expect(screen.getByText(/AI、训练、付费调用和自动化操作均未启用/)).toBeInTheDocument();
    expect(screen.queryByText(/匿名示例|模拟策略|已生效规则/)).not.toBeInTheDocument();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(7);
  });

  it('uses server search, module filter and stable sorting without showing full payload in the table', async () => {
    window.history.replaceState({}, '', '/strategy?tab=local_rule_pack');
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/strategy/artifacts') && url.searchParams.get('kind') === 'local_rule_pack') return json({ items: [artifact], total: 1, limit: 20, offset: 0 });
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    await waitFor(() => expect(screen.getByText('字幕空格规则')).toBeInTheDocument());
    expect(screen.queryByText('完整提示词正文')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '策略搜索' }), { target: { value: '空格' } });
    fireEvent.change(screen.getByRole('combobox', { name: '适用模块' }), { target: { value: 'subtitle_acceptance' } });
    fireEvent.change(screen.getByRole('combobox', { name: '策略排序' }), { target: { value: 'name_asc' } });
    await waitFor(() => {
      const urls = vi.mocked(fetch).mock.calls.map((call) => String(call[0]));
      expect(urls.some((url) => url.includes('search=%E7%A9%BA%E6%A0%BC') && url.includes('applicableModule=subtitle_acceptance') && url.includes('sort=name_asc'))).toBe(true);
    });
  });

  it('freezes stable identities and recovers an unknown create only by GET of the same artifact', async () => {
    window.history.replaceState({}, '', '/strategy?tab=local_rule_pack');
    let createdBody: Record<string, unknown> | null = null;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname.endsWith('/strategy/artifacts')) {
        createdBody = JSON.parse(String((init as RequestInit).body));
        return json({ error: { message: '登记结果未知', requestId: 'strategy-unknown-1', retryable: true } }, 503);
      }
      if (method === 'GET' && createdBody && url.pathname.endsWith(`/strategy/artifacts/${createdBody.artifactId}`)) return json({ ...artifact, artifactId: createdBody.artifactId, latestVersionId: createdBody.versionId });
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    await waitFor(() => expect(screen.getByText('当前条件没有策略资产')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '登记策略资产' }));
    const dialog = await screen.findByRole('dialog', { name: '登记策略资产草稿' });
    fireEvent.change(within(dialog).getByLabelText('资产名称'), { target: { value: '空格规则' } });
    fireEvent.change(within(dialog).getByLabelText('用途'), { target: { value: '字幕验收前提示' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '登记草稿' }));
    const recover = await screen.findByRole('button', { name: '查询本次策略资产结果' });
    expect(recover).toHaveFocus();
    expect(screen.getByText(/strategy-unknown-1/)).toBeInTheDocument();
    fireEvent.click(recover);
    await waitFor(() => expect(screen.getByRole('heading', { name: '策略与学习' })).toHaveFocus());
    const posts = vi.mocked(fetch).mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST');
    expect(posts).toHaveLength(1);
    expect((posts[0]![1] as RequestInit).headers).toEqual(expect.objectContaining({ 'Idempotency-Key': expect.any(String) }));
    expect(createdBody).toEqual(expect.objectContaining({ artifactId: expect.any(String), versionId: expect.any(String), applicableModules: ['terms'] }));
    expect(vi.mocked(fetch).mock.calls.filter((call) => createdBody && String(call[0]).endsWith(`/strategy/artifacts/${createdBody.artifactId}`))).toHaveLength(1);
  });

  it('hands successful modal focus to the page result instead of restoring the old trigger', async () => {
    window.history.replaceState({}, '', '/strategy?tab=local_rule_pack');
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      if ((init as RequestInit | undefined)?.method === 'POST') return json(artifact, 201);
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    await waitFor(() => expect(screen.getByText('当前条件没有策略资产')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '登记策略资产' }));
    const dialog = await screen.findByRole('dialog', { name: '登记策略资产草稿' });
    fireEvent.change(within(dialog).getByLabelText('资产名称'), { target: { value: '人工规则' } });
    fireEvent.change(within(dialog).getByLabelText('用途'), { target: { value: '字幕质量复核' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '登记草稿' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '策略与学习' })).toHaveFocus());
    expect(screen.getByText('策略资产草稿已登记；生产规则没有改变。')).toBeInTheDocument();
  });

  it('creates the next immutable version only from a selected baseline and preserves every existing rule', async () => {
    window.history.replaceState({}, '', '/strategy?tab=local_rule_pack');
    const version = {
      versionId: artifact.latestVersionId, artifactId: artifact.artifactId, version: 1, schemaVersion: 1, status: 'draft',
      contentDigest: 'c'.repeat(64), versionSummary: '2 条本地规则', createdAt: artifact.createdAt,
      payload: { rules: [
        { id: 'keep-space', pattern: '\\s{2,}', replacement: ' ', action: 'review' },
        { id: 'keep-name', pattern: '叶凡', replacement: '叶凡', action: 'accept' },
      ] },
    };
    let createdBody: Record<string, unknown> | null = null;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (url.pathname === '/api/system-control/strategy/artifacts' && url.searchParams.get('kind') === 'local_rule_pack') return json({ items: [artifact], total: 1, limit: 20, offset: 0 });
      if (url.pathname === `/api/system-control/strategy/artifacts/${artifact.artifactId}`) return json(artifact);
      if (url.pathname === `/api/system-control/strategy/artifacts/${artifact.artifactId}/versions/${artifact.latestVersionId}`) return json(version);
      if (createdBody && url.pathname === `/api/system-control/strategy/artifacts/${artifact.artifactId}/versions/${String(createdBody.versionId)}`) return json({ ...version, versionId: createdBody.versionId, version: 2, payload: createdBody.payload });
      if (url.pathname === `/api/system-control/strategy/artifacts/${artifact.artifactId}/versions` && method === 'GET') return json({ items: [{ ...version, payload: undefined }], total: 1, limit: 10, offset: 0 });
      if (url.pathname === `/api/system-control/strategy/artifacts/${artifact.artifactId}/versions` && method === 'POST') { createdBody = JSON.parse(String((init as RequestInit).body)); return json({ ...version, ...createdBody, version: 2 }, 201); }
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('button', { name: '查看详情' }));
    const drawer = await screen.findByRole('dialog', { name: '策略资产详情' });
    expect(within(drawer).queryByRole('button', { name: '创建下一不可变版本' })).not.toBeInTheDocument();
    fireEvent.click(await within(drawer).findByRole('button', { name: /v1.*2 条本地规则/ }));
    fireEvent.click(await within(drawer).findByRole('button', { name: '基于 v1 创建下一版本' }));
    const dialog = await screen.findByRole('dialog', { name: '创建下一不可变版本' });
    expect(within(dialog).getByLabelText('匹配规则 1')).toHaveValue('\\s{2,}');
    expect(within(dialog).getByLabelText('匹配规则 2')).toHaveValue('叶凡');
    fireEvent.change(within(dialog).getByLabelText('替换内容 1'), { target: { value: '　' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建版本' }));
    await waitFor(() => expect(screen.getByText('新的不可变草稿版本已创建；生产规则没有改变。')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('heading', { name: '已选择 v2' })).toHaveFocus());
    expect(createdBody).toEqual(expect.objectContaining({ payload: { rules: [
      { id: 'keep-space', pattern: '\\s{2,}', replacement: '　', action: 'review' },
      { id: 'keep-name', pattern: '叶凡', replacement: '叶凡', action: 'accept' },
    ] } }));
  });

  it('opens a safe event projection and returns focus to the trigger on Escape', async () => {
    window.history.replaceState({}, '', '/strategy?tab=events');
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/strategy/events')) return json({ items: [eventFact], total: 1, limit: 20, offset: 0 });
      if (url.pathname.includes('/strategy/events/')) return json(eventFact);
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    const trigger = await screen.findByRole('button', { name: '查看证据' });
    fireEvent.click(trigger);
    const drawer = await screen.findByRole('dialog', { name: '人工事件安全证据' });
    await waitFor(() => expect(within(drawer).getByRole('heading', { name: '人工事件安全证据' })).toHaveFocus());
    expect(within(drawer).getByText('只作为证据，不会自动成为规则')).toBeInTheDocument();
    expect(within(drawer).getByText('name、aliases')).toBeInTheDocument();
    fireEvent.keyDown(drawer, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: '人工事件安全证据' })).not.toBeInTheDocument();
  });

  it('clears an old query identity immediately while the new server result is pending', async () => {
    window.history.replaceState({}, '', '/strategy?tab=local_rule_pack');
    let resolveSecond: ((value: Response) => void) | null = null;
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/strategy/artifacts') && url.searchParams.get('kind') === 'local_rule_pack') {
        if (url.searchParams.get('search') === '新的') return await new Promise<Response>((resolve) => { resolveSecond = resolve; });
        return json({ items: [artifact], total: 1, limit: 20, offset: 0 });
      }
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    await waitFor(() => expect(screen.getByText('字幕空格规则')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: '策略搜索' }), { target: { value: '新的' } });
    await waitFor(() => expect(screen.queryByText('字幕空格规则')).not.toBeInTheDocument());
    expect(screen.getByText('读取当前策略列表…')).toBeInTheDocument();
    resolveSecond?.(json({ items: [], total: 0, limit: 20, offset: 0 }));
    await waitFor(() => expect(screen.getByText('当前条件没有策略资产')).toBeInTheDocument());
  });

  it('creates an optimization run once and recovers an unknown result by the same runId', async () => {
    window.history.replaceState({}, '', '/strategy?tab=runs');
    const run = { runId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', artifactId: artifact.artifactId, baseVersionId: artifact.latestVersionId, module: 'terms', projectId: null, from: null, to: '2026-08-18T03:00:00.000Z', minEvidenceCount: 0, maxEvents: 100, budgetCny: '0.000000', actualCostCny: '0.000000', analyzerKey: 'deterministic_local_v1', status: 'queued', inputDigest: 'a'.repeat(64), eventSnapshotDigest: null, eventCount: 0, candidateCount: 0, requestId: 'run-request-1', failureReason: null, createdAt: '2026-08-18T03:00:00.000Z', startedAt: null, completedAt: null };
    let createdRunId = ''; let recoveryReads = 0;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (url.pathname.endsWith('/optimization-runs') && method === 'GET') return json({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.pathname.endsWith('/strategy/artifacts') && method === 'GET') return json({ items: [artifact], total: 1, limit: 100, offset: 0 });
      if (url.pathname.endsWith('/versions') && method === 'GET') return json({ items: [{ versionId: artifact.latestVersionId, artifactId: artifact.artifactId, version: 1, schemaVersion: 1, status: 'draft', contentDigest: 'c'.repeat(64), versionSummary: '规则版本', createdAt: artifact.createdAt }], total: 1, limit: 100, offset: 0 });
      if (url.pathname.endsWith('/optimization-runs') && method === 'POST') { createdRunId = JSON.parse(String((init as RequestInit).body)).runId; return json({ error: { message: '运行结果未知', requestId: 'run-unknown-1', retryable: true } }, 503); }
      if (url.pathname.endsWith(`/optimization-runs/${createdRunId}`)) { recoveryReads += 1; if (recoveryReads === 1) return json({ error: { message: '第一次人工查询失败', requestId: 'run-recover-failed-1', retryable: true } }, 503); return json({ ...run, runId: createdRunId, status: 'succeeded', requestId: 'run-recovered-request-1' }); }
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('tab', { name: '优化运行' }));
    fireEvent.click(await screen.findByRole('button', { name: '新建优化运行' }));
    const dialog = await screen.findByRole('dialog', { name: '新建优化运行' });
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /字幕空格规则/ })).toBeInTheDocument());
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /规则版本/ })).toBeInTheDocument());
    fireEvent.change(within(dialog).getByRole('combobox', { name: '策略资产' }), { target: { value: artifact.artifactId } });
    fireEvent.change(within(dialog).getByRole('combobox', { name: '固定基线版本' }), { target: { value: artifact.latestVersionId } });
    fireEvent.submit(within(dialog).getByRole('button', { name: '提交优化运行' }).closest('form')!);
    const recover = await screen.findByRole('button', { name: '查询本次优化运行' });
    expect(screen.getByText(/run-unknown-1/)).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.filter((call) => String(call[0]).endsWith(`/optimization-runs/${createdRunId}`))).toHaveLength(0);
    fireEvent.click(recover);
    await waitFor(() => expect(screen.getByText(/run-recover-failed-1/)).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: '查询本次优化运行' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '查询本次优化运行' }));
    await waitFor(() => expect(screen.getByText('run-recovered-request-1')).toBeInTheDocument());
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查询本次优化运行' })).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
    expect(recoveryReads).toBe(3);
    expect(vi.mocked(fetch).mock.calls.filter((call) => String(call[0]).endsWith(`/optimization-runs/${createdRunId}`))).toHaveLength(3);
  });

  it('recovers a historical unknown optimization run with one GET and no POST', async () => {
    window.history.replaceState({}, '', '/strategy?tab=runs');
    const runId = 'abababab-abab-4aba-8aba-abababababab';
    const run = { runId, artifactId: artifact.artifactId, baseVersionId: artifact.latestVersionId, module: 'terms', projectId: null, from: null, to: null, minEvidenceCount: 0, maxEvents: 100, budgetCny: '0.000000', actualCostCny: null, analyzerKey: 'deterministic_local_v1', status: 'unknown', inputDigest: 'a'.repeat(64), eventSnapshotDigest: null, eventCount: 1, candidateCount: 0, requestId: 'historical-unknown-1', failureReason: null, createdAt: artifact.createdAt, startedAt: null, completedAt: null };
    let detailReads = 0;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'GET' && url.pathname.endsWith('/optimization-runs') && !url.pathname.endsWith(`/${runId}`)) return json({ items: [run], total: 1, limit: 20, offset: 0 });
      if (method === 'GET' && url.pathname.endsWith(`/optimization-runs/${runId}`)) { detailReads += 1; return json(detailReads === 1 ? run : { ...run, status: 'succeeded', requestId: 'historical-success-1' }); }
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('button', { name: '查看运行' }));
    const recover = await screen.findByRole('button', { name: '查询本次优化运行' });
    fireEvent.click(recover);
    await waitFor(() => expect(screen.getByText('已完成')).toBeInTheDocument());
    expect(detailReads).toBeGreaterThanOrEqual(2);
    expect(vi.mocked(fetch).mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
    expect(vi.mocked(fetch).mock.calls.filter((call) => String(call[0]).endsWith(`/optimization-runs/${runId}`)).length).toBeGreaterThanOrEqual(2);
  });

  it('creates evaluation from the current authoritative evaluation_ready candidate after refresh', async () => {
    window.history.replaceState({}, '', '/strategy?tab=candidates');
    const run = { runId: 'bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc', artifactId: artifact.artifactId, baseVersionId: artifact.latestVersionId, module: 'terms', projectId: null, from: null, to: null, minEvidenceCount: 0, maxEvents: 100, budgetCny: '0.000000', actualCostCny: null, analyzerKey: 'deterministic_local_v1', status: 'succeeded', inputDigest: 'b'.repeat(64), eventSnapshotDigest: null, eventCount: 1, candidateCount: 1, requestId: 'run-ready-1', failureReason: null, createdAt: artifact.createdAt, startedAt: null, completedAt: null };
    const candidate = { candidateId: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd', runId: run.runId, artifactId: artifact.artifactId, baseVersionId: artifact.latestVersionId, sourceEventRefId: 'terms:event:ready', kind: 'rule_review', status: 'evaluation_ready', revision: 2, module: 'terms', title: '待评测候选', rationale: '证据充分', proposal: { operation: 'review_when_changed', target: 'term', value: 'review', notes: '' }, supportCount: 2, opposeCount: 0, unknownCount: 0, evidenceDigest: 'd'.repeat(64), createdAt: artifact.createdAt, updatedAt: artifact.createdAt };
    let evaluationBody: Record<string, unknown> | null = null;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (url.pathname.endsWith('/optimization-runs') && method === 'GET') return json({ items: [run], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith('/candidates') && method === 'GET') return json({ items: [candidate], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/candidates/${candidate.candidateId}`)) return json(candidate);
      if (url.pathname.endsWith('/evaluations') && method === 'POST') { evaluationBody = JSON.parse(String((init as RequestInit).body)); return json({ evaluationRunId: evaluationBody.evaluationRunId, ...evaluationBody, status: 'queued', actualCostCny: null }, 201); }
      if (url.pathname.endsWith('/evaluations') && method === 'GET') return json(emptyList(url));
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('button', { name: '查看候选' }));
    fireEvent.click(await screen.findByRole('button', { name: '创建离线评测' }));
    const dialog = await screen.findByRole('dialog', { name: '创建离线评测' });
    fireEvent.submit(within(dialog).getByRole('button', { name: '提交评测' }).closest('form')!);
    await waitFor(() => expect(evaluationBody).toEqual(expect.objectContaining({ candidateIds: [candidate.candidateId] })));
    expect(vi.mocked(fetch).mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
  });

  it('drops old candidate actions while the new candidate detail is loading or failed', async () => {
    window.history.replaceState({}, '', '/strategy?tab=candidates');
    const run = { runId: 'dededede-dede-4ded-8ded-dededededede', artifactId: artifact.artifactId, baseVersionId: artifact.latestVersionId, module: 'terms', projectId: null, from: null, to: null, minEvidenceCount: 0, maxEvents: 100, budgetCny: '0.000000', actualCostCny: null, analyzerKey: 'deterministic_local_v1', status: 'succeeded', inputDigest: 'e'.repeat(64), eventSnapshotDigest: null, eventCount: 1, candidateCount: 2, requestId: 'run-candidates-1', failureReason: null, createdAt: artifact.createdAt, startedAt: null, completedAt: null };
    const first = { candidateId: 'dfdfdfdf-dfdf-4dfd-8dfd-dfdfdfdfdfdf', runId: run.runId, artifactId: artifact.artifactId, baseVersionId: artifact.latestVersionId, sourceEventRefId: 'terms:event:first', kind: 'rule_review', status: 'proposed', revision: 1, module: 'terms', title: '首个候选', rationale: '证据充分', proposal: { operation: 'review_when_changed', target: 'term', value: 'review', notes: '' }, supportCount: 1, opposeCount: 0, unknownCount: 0, evidenceDigest: 'f'.repeat(64), createdAt: artifact.createdAt, updatedAt: artifact.createdAt };
    const second = { ...first, candidateId: 'e0e0e0e0-e0e0-4e0e-8e0e-e0e0e0e0e0e0', title: '失败候选', sourceEventRefId: 'terms:event:second' };
    let resolveSecond: ((value: Response) => void) | null = null;
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/optimization-runs') && !url.pathname.includes('/candidates')) return json({ items: [run], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith('/candidates') && !url.pathname.includes('/candidates/')) return json({ items: [first, second], total: 2, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/candidates/${first.candidateId}`)) return json(first);
      if (url.pathname.endsWith(`/candidates/${second.candidateId}`)) return new Promise<Response>((resolve) => { resolveSecond = resolve; });
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    const views = await screen.findAllByRole('button', { name: '查看候选' });
    fireEvent.click(views[0]!);
    expect(await screen.findByRole('button', { name: '编辑建议' })).toBeEnabled();
    fireEvent.click(views[1]!);
    expect(screen.queryByRole('button', { name: '编辑建议' })).not.toBeInTheDocument();
    resolveSecond?.(json({ error: { message: '候选详情读取失败', requestId: 'candidate-detail-1', retryable: false } }, 503));
    await waitFor(() => expect(screen.queryByRole('button', { name: '编辑建议' })).not.toBeInTheDocument());
  });

  it('keeps candidate decision unknown recoverable by one decisionId without a second POST', async () => {
    window.history.replaceState({}, '', '/strategy?tab=candidates');
    const run = { runId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', artifactId: artifact.artifactId, baseVersionId: artifact.latestVersionId, module: 'terms', projectId: null, from: null, to: '2026-08-18T03:00:00.000Z', minEvidenceCount: 0, maxEvents: 100, budgetCny: '0.000000', actualCostCny: '0.000000', analyzerKey: 'deterministic_local_v1', status: 'succeeded', inputDigest: 'b'.repeat(64), eventSnapshotDigest: null, eventCount: 2, candidateCount: 1, requestId: 'run-request-2', failureReason: null, createdAt: artifact.createdAt, startedAt: null, completedAt: null };
    const candidate = { candidateId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', runId: run.runId, artifactId: artifact.artifactId, baseVersionId: artifact.latestVersionId, sourceEventRefId: 'terms:event:1', kind: 'rule_review', status: 'proposed', revision: 1, module: 'terms', title: '检查术语', rationale: '证据充分', proposal: { operation: 'review_when_changed', target: 'term', value: 'review', notes: '' }, supportCount: 2, opposeCount: 0, unknownCount: 0, evidenceDigest: 'd'.repeat(64), createdAt: artifact.createdAt, updatedAt: artifact.createdAt };
    let decisionId = '';
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (url.pathname.endsWith('/optimization-runs') && method === 'GET') return json({ items: [run], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith('/candidates') && method === 'GET') return json({ items: [candidate], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/candidates/${candidate.candidateId}`)) return json(candidate);
      if (url.pathname.endsWith('/decisions') && method === 'POST') { decisionId = JSON.parse(String((init as RequestInit).body)).decisionId; return json({ error: { message: '决定结果未知', requestId: 'decision-unknown-1', retryable: true } }, 503); }
      if (url.pathname.endsWith(`/candidate-decisions/${decisionId}`)) return json({ decisionId, candidateId: candidate.candidateId, action: 'edit', requestId: 'decision-request-1', afterSnapshot: { ...candidate, status: 'edited', revision: 2 } });
      return emptyResponse(url);
    });
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('tab', { name: '学习候选' }));
    const view = await screen.findByRole('button', { name: '查看候选' }); fireEvent.click(view);
    fireEvent.click(await screen.findByRole('button', { name: '编辑建议' }));
    const dialog = await screen.findByRole('dialog', { name: '编辑学习候选' }); fireEvent.change(within(dialog).getByLabelText('标题'), { target: { value: '更新术语检查' } }); fireEvent.click(within(dialog).getByRole('button', { name: '保存决定' }));
    const recover = await screen.findByRole('button', { name: '查询本次候选决定' }); fireEvent.click(recover);
    await waitFor(() => expect(screen.getByText('已编辑 / terms')).toBeInTheDocument());
    expect(vi.mocked(fetch).mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
    expect(vi.mocked(fetch).mock.calls.some((call) => String(call[0]).endsWith(`/candidate-decisions/${decisionId}`))).toBe(true);
  });

  it('renders deterministic offline evaluation metrics without Wave C actions', async () => {
    window.history.replaceState({}, '', '/strategy?tab=evaluations');
    const evaluation = { evaluationRunId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', status: 'succeeded', candidateIds: ['cccccccc-cccc-4ccc-8ccc-cccccccccccc'], candidateDigest: 'e'.repeat(64), budgetCny: '0.000000', actualCostCny: '0.000000', metrics: { baselineManualReviewCount: 3, candidateManualReviewCount: 2, estimatedFalsePositiveCount: 1, estimatedFalseNegativeCount: 0, baselineHandlingSeconds: 20, candidateHandlingSeconds: 15, metricKind: 'deterministic_proxy_v1' }, requestId: 'eval-request-1', failureReason: null, createdAt: artifact.createdAt, startedAt: artifact.createdAt, completedAt: artifact.createdAt };
    vi.mocked(fetch).mockImplementation(async (input) => { const url = new URL(String(input), 'http://system.test'); if (url.pathname.endsWith('/evaluations') && !url.pathname.endsWith('/evaluations/')) return json({ items: [evaluation], total: 1, limit: 20, offset: 0 }); if (url.pathname.endsWith(`/evaluations/${evaluation.evaluationRunId}`)) return json(evaluation); return emptyResponse(url); });
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('tab', { name: '离线评测' }));
    fireEvent.click(await screen.findByRole('button', { name: '查看评测' }));
    await waitFor(() => expect(screen.getByText('3 → 2')).toBeInTheDocument());
    expect(screen.getByText(/仅供人工判断/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /批准|发布/ })).not.toBeInTheDocument();
  });
});

const emptyResponse = (url: URL) => json(emptyList(url));
