// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AsrWorkspace } from '../../frontend/src/features/asr/AsrWorkspace.js';

const projectId = 'ca65378e-8935-4c4a-9e8b-13efca3d3100';
const manifestId = 'ca65378e-8935-4c4a-9e8b-13efca3d3101';
const termVersionId = 'ca65378e-8935-4c4a-9e8b-13efca3d3102';
const batchId = 'ca65378e-8935-4c4a-9e8b-13efca3d3103';
const jobOneId = 'ca65378e-8935-4c4a-9e8b-13efca3d3104';
const jobTwoId = 'ca65378e-8935-4c4a-9e8b-13efca3d3105';
const assetOneId = 'ca65378e-8935-4c4a-9e8b-13efca3d3106';
const assetTwoId = 'ca65378e-8935-4c4a-9e8b-13efca3d3107';
const digest = 'a'.repeat(64);
const configDigest = 'b'.repeat(64);

const project = {
  id: projectId,
  name: '匿名中文识别项目',
  workflowStatus: 'ready',
  lifecycleStatus: 'active',
  recycleExpiresAt: null,
  version: 2,
  createdAt: '2026-08-14T08:00:00.000Z',
  updatedAt: '2026-08-14T08:00:00.000Z',
  createdBy: 'local-user',
  updatedBy: 'local-user',
};

const manifest = (readyTwo = true) => ({
  id: manifestId,
  projectId,
  version: 3,
  rootName: '匿名素材',
  episodeCount: 2,
  bindingCount: 4,
  confirmedAt: '2026-08-14T08:00:00.000Z',
  createdBy: 'local-user',
  bindings: [1, 2].flatMap((episodeNumber) => ([
    { episodeNumber, role: 'company_srt', relativePath: `${episodeNumber}.srt`, fileName: `${episodeNumber}.srt`, sizeBytes: 10, lastModifiedMs: 1, fingerprint: `srt-${episodeNumber}`, mediaType: 'srt' },
    { episodeNumber, role: 'asr_video', relativePath: `${episodeNumber}.mp4`, fileName: `${episodeNumber}.mp4`, sizeBytes: 20, lastModifiedMs: 1, fingerprint: `video-${episodeNumber}`, mediaType: 'video' },
  ])),
  assetBindings: [
    { manifestId, episodeNumber: 1, role: 'asr_video', assetId: assetOneId, sourceFingerprint: 'video-1', boundAt: '2026-08-14T08:01:00.000Z' },
    ...(readyTwo ? [{ manifestId, episodeNumber: 2, role: 'asr_video', assetId: assetTwoId, sourceFingerprint: 'video-2', boundAt: '2026-08-14T08:01:00.000Z' }] : []),
  ],
});

const terms = (sourceIsCurrent = true) => ({
  source: { status: 'ready', manifestId, sourceSrtSetDigest: digest, episodeCount: 2, assetCount: 2, issueCode: null, issueDetail: null },
  sourceIsCurrent,
  activeDraft: null,
  latestRun: null,
  latestVersion: { id: termVersionId, projectId, version: 4, sourceSrtSetDigest: digest, promptVersion: 'terms-v1', itemCount: 18, createdAt: '2026-08-14T08:02:00.000Z' },
});

const hotwords = { projectionVersion: 'asr-hotwords-v2', digest, termCount: 12, aliasCount: 2, filteredCount: 2, truncatedCount: 2 };
const hotwordEvidence = {
  projectId,
  batchId,
  termVersionId,
  provider: 'fake',
  adapter: 'deterministic_fake',
  model: 'fake-v1',
  language: 'zh-CN',
  configDigest,
  capabilities: { supported: true, maxEntries: 100, maxCharacters: 2_000 },
  entries: [{ order: 1, text: '林川', source: 'term' }, { order: 2, text: '小川', source: 'person_alias' }],
  omittedEntries: [
    { order: 3, text: '先生', source: 'person_alias', reasonCode: 'rule_filtered' },
    { order: 4, text: '林川', source: 'term', reasonCode: 'duplicate_removed' },
    { order: 5, text: '北城特别调查组', source: 'term', reasonCode: 'adapter_max_entries' },
    { order: 6, text: '超长匿名术语', source: 'term', reasonCode: 'adapter_max_characters' },
  ],
  summary: hotwords,
};
const usage = { provider: 'fake', mediaDurationMs: 61_000, billingUnit: 'second', billingQuantity: 61, currency: 'CNY', estimatedAmount: '0', finalAmount: '0', reconciliationStatus: 'final', providerRequestId: 'req-anon-1' };
const qualitySummary = { audioCoverageRatio: 0.98, emptyResult: false, cueCount: 3, longSegmentCount: 0, timelineIssueCount: 0, termHitCount: 2, lowConfidenceCount: 1, hallucinationSignalCount: 0 };

const attempt = (id: string, receipt: 'simulated' | 'submitted' | 'partially_submitted' | 'unsupported' | 'unknown' = 'simulated') => ({
  id,
  attemptNumber: 1,
  status: receipt === 'unknown' ? 'reconciliation_required' : 'completed',
  leaseOwner: null,
  leaseExpiresAt: null,
  providerRequestId: `req-${receipt}`,
  errorCode: null,
  errorDetail: null,
  retryable: false,
  externalSideEffectPossible: receipt === 'unknown',
  startedAt: '2026-08-14T08:03:00.000Z',
  completedAt: '2026-08-14T08:04:00.000Z',
  hotwordPayload: { projectionVersion: 'asr-hotwords-v2', digest, itemCount: receipt === 'partially_submitted' ? 10 : 14, characterCount: 42 },
  hotwordReceipt: receipt,
  hotwordReceiptFacts: receipt === 'unknown'
    ? { submittedCount: null, omittedCount: null, reasonCode: 'unknown' }
    : receipt === 'partially_submitted'
      ? { submittedCount: 10, omittedCount: 4, reasonCode: 'partial_submission' }
      : receipt === 'unsupported'
        ? { submittedCount: 0, omittedCount: 14, reasonCode: 'unsupported' }
        : { submittedCount: 14, omittedCount: 0, reasonCode: null },
  usage: receipt === 'unknown' ? { ...usage, reconciliationStatus: 'pending' } : usage,
  result: null,
  createdAt: '2026-08-14T08:03:00.000Z',
});

const result = (episodeNumber: number, assetId: string, qualityStatus: 'pass' | 'warning' = 'pass') => ({
  id: `ca65378e-8935-4c4a-9e8b-13efca3d32${episodeNumber.toString().padStart(2, '0')}`,
  revision: 1,
  projectId,
  episodeNumber,
  assetId,
  termVersionId,
  configDigest,
  hotwordDigest: digest,
  qualityStatus,
  qualitySummary,
  cues: [],
  createdAt: '2026-08-14T08:04:00.000Z',
});

const batch = (status: 'running' | 'partial' | 'reconciliation_required' | 'completed' = 'running') => ({
  id: batchId,
  projectId,
  retryOfBatchId: null,
  scopeKind: 'all',
  episodeNumbers: [1, 2],
  termVersionId,
  termVersionIsLatest: true,
  manifestId,
  manifestVersion: 3,
  provider: 'fake',
  adapter: 'deterministic_fake',
  model: 'fake-v1',
  language: 'zh-CN',
  configDigest,
  hotwords,
  status,
  forceNewRecognition: false,
  counts: {
    total: 2,
    queued: status === 'running' ? 1 : 0,
    running: status === 'running' ? 1 : 0,
    cancelRequested: 0,
    completed: status === 'completed' ? 2 : status === 'partial' ? 1 : 0,
    failed: status === 'partial' ? 1 : 0,
    cancelled: 0,
    reconciliationRequired: status === 'reconciliation_required' ? 2 : 0,
    reused: 0,
  },
  createdAt: '2026-08-14T08:02:00.000Z',
  updatedAt: '2026-08-14T08:04:00.000Z',
});

const detail = (status: 'running' | 'partial' | 'reconciliation_required' | 'completed' = 'running') => ({
  ...batch(status),
  blockers: [],
  jobs: [
    {
      id: jobOneId, episodeNumber: 1, assetId: assetOneId, assetOriginalFilename: '1.mp4', assetChecksum: digest,
      status: status === 'reconciliation_required' ? 'reconciliation_required' : 'completed', currentAttemptId: null, currentResultId: status === 'reconciliation_required' ? null : result(1, assetOneId).id,
      reusedResult: false, cancelRequested: false, attempts: status === 'completed'
        ? [
            { ...attempt(`${jobOneId}-simulated`, 'simulated'), attemptNumber: 1 },
            { ...attempt(`${jobOneId}-submitted`, 'submitted'), attemptNumber: 2 },
          ]
        : [attempt(`${jobOneId}-attempt`, status === 'reconciliation_required' ? 'unknown' : 'simulated')],
      currentResult: status === 'reconciliation_required' ? null : result(1, assetOneId), createdAt: '2026-08-14T08:02:00.000Z', updatedAt: '2026-08-14T08:04:00.000Z',
    },
    {
      id: jobTwoId, episodeNumber: 2, assetId: assetTwoId, assetOriginalFilename: '2.mp4', assetChecksum: digest,
      status: status === 'partial' ? 'failed' : status === 'reconciliation_required' ? 'reconciliation_required' : status === 'completed' ? 'completed' : 'running',
      currentAttemptId: null, currentResultId: status === 'completed' ? result(2, assetTwoId, 'warning').id : null,
      reusedResult: false, cancelRequested: false, attempts: status === 'completed'
        ? [
            { ...attempt(`${jobTwoId}-partial`, 'partially_submitted'), attemptNumber: 1 },
            { ...attempt(`${jobTwoId}-unsupported`, 'unsupported'), attemptNumber: 2 },
            { ...attempt(`${jobTwoId}-unknown`, 'unknown'), attemptNumber: 3 },
          ]
        : [attempt(`${jobTwoId}-attempt`, status === 'reconciliation_required' ? 'unknown' : 'partially_submitted')],
      currentResult: status === 'completed' ? result(2, assetTwoId, 'warning') : null, createdAt: '2026-08-14T08:02:00.000Z', updatedAt: '2026-08-14T08:04:00.000Z',
    },
  ],
});

const preparation = (readyTwo = true, forceNewRecognition = false) => ({
  projectId,
  termVersionId,
  manifestId,
  manifestVersion: 3,
  provider: 'fake',
  adapter: 'deterministic_fake',
  model: 'fake-v1',
  language: 'zh-CN',
  configDigest,
  forceNewRecognition,
  hotwords,
  counts: {
    total: 2,
    executable: forceNewRecognition ? (readyTwo ? 2 : 1) : (readyTwo ? 1 : 0),
    reusable: forceNewRecognition ? 0 : 1,
    blocked: readyTwo ? 0 : 1,
  },
  episodes: [
    {
      episodeNumber: 1,
      status: forceNewRecognition ? 'executable' : 'reusable',
      assetId: assetOneId,
      assetOriginalFilename: '1.mp4',
      assetChecksum: digest,
      reusableResultId: result(1, assetOneId).id,
      blockers: [],
    },
    {
      episodeNumber: 2,
      status: readyTwo ? 'executable' : 'blocked',
      assetId: readyTwo ? assetTwoId : null,
      assetOriginalFilename: readyTwo ? '2.mp4' : null,
      assetChecksum: readyTwo ? digest : null,
      reusableResultId: null,
      blockers: readyTwo ? [] : [{ code: 'asset_not_ready', message: '第 2 集识别视频尚未校验完成。' }],
    },
  ],
});

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

interface FetchState {
  batchStatus?: 'running' | 'partial' | 'reconciliation_required' | 'completed';
  batches?: boolean;
  sourceIsCurrent?: boolean;
  readyTwo?: boolean;
}

const baseFetch = (state: FetchState = {}) => async (input: RequestInfo | URL) => {
  const url = String(input);
  const current = state.batchStatus ?? 'running';
  if (url.endsWith('/material-manifest')) return response({ project, manifest: manifest(state.readyTwo ?? true) });
  if (url.endsWith(`/projects/${projectId}/terms`)) return response(terms(state.sourceIsCurrent ?? true));
  if (url.includes('/asr/batch-preparation?')) {
    const forceNewRecognition = new URL(url, 'http://localhost').searchParams.get('forceNewRecognition') === 'true';
    return response(preparation(state.readyTwo ?? true, forceNewRecognition));
  }
  if (url.includes('/asr/batches?')) return response({ items: state.batches === false ? [] : [batch(current)], total: state.batches === false ? 0 : 1 });
  if (url.endsWith(`/asr/batches/${batchId}/hotwords`)) return response(hotwordEvidence);
  if (url.endsWith(`/asr/batches/${batchId}`)) return response(detail(current));
  throw new Error(`未模拟请求：${url}`);
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/projects/${projectId}/asr`]}>
        <Routes><Route path="/projects/:projectId/asr" element={<AsrWorkspace />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('正式单剧中文识别工作台', () => {
  it('读取后端批次与逐集事实，并展示权威热词证据和回执', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch({ batchStatus: 'completed' }));
    renderPage();

    expect(await screen.findByText('匿名中文识别项目')).toBeInTheDocument();
    expect(screen.getByText('已确认 V4')).toBeInTheDocument();
    expect(screen.getByText('2 / 2 集')).toBeInTheDocument();
    expect(screen.queryByText('员工页边界')).not.toBeInTheDocument();
    expect(screen.queryByText('系统控制台')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看批次' }));
    expect(await screen.findByText('质量警告')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '本批次热词' }));
    expect(await screen.findByRole('dialog', { name: '本批次热词证据' })).toBeInTheDocument();
    expect(await screen.findByText('热词链路已接通，准确率未验证。已发送不等于准确率已提升。')).toBeInTheDocument();
    const evidence = screen.getByRole('dialog', { name: '本批次热词证据' });
    for (const receipt of ['模拟已应用', '已提交', '部分提交', '不支持热词', '回执未知']) {
      const label = within(evidence).getByText(receipt);
      expect(label).toBeInTheDocument();
      expect(label.closest('span')?.querySelector('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(within(evidence).getByText(/已发送 10 项，省略 4 项/)).toBeInTheDocument();
    expect(within(evidence).getByText(/适配器不支持热词/)).toBeInTheDocument();
    expect(within(evidence).getByText(/不得推断热词已经提交/)).toBeInTheDocument();
    fireEvent.click(within(evidence).getByText('过滤与截断证据'));
    expect(within(evidence).getByText((_, element) => element?.tagName === 'LI' && element.textContent?.includes('重复项去除') === true)).toBeInTheDocument();
    expect(vi.mocked(globalThis.fetch).mock.calls.some(([input]) => String(input).endsWith(`/asr/batches/${batchId}/hotwords`))).toBe(true);
    expect(vi.mocked(globalThis.fetch).mock.calls.some(([input]) => String(input).includes('/asr/hotwords/preview'))).toBe(false);
  });

  it('逐集准备失败显示请求标识并只用原查询重新读取', async () => {
    let resolveFirst!: (value: Response) => void;
    const firstPreparation = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    let preparationCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/asr/batch-preparation?')) {
        preparationCalls += 1;
        if (preparationCalls === 1) return firstPreparation;
        return response(preparation());
      }
      return baseFetch({ batches: false })(input);
    });
    renderPage();

    fireEvent.click((await screen.findAllByRole('button', { name: '新建模拟识别批次' }))[0]!);
    const panel = screen.getByRole('dialog', { name: '新建模拟识别批次' });
    expect(await within(panel).findByText('正在读取服务端逐集准备事实…')).toBeInTheDocument();
    resolveFirst(response({ error: { code: 'ASR_PREPARATION_UNAVAILABLE', message: '逐集准备服务暂不可用。', retryable: true, action: 'reload_asr', requestId: 'req-preparation-503' } }, 503));

    const alert = await within(panel).findByRole('alert');
    expect(within(alert).getByText('逐集准备服务暂不可用。')).toBeInTheDocument();
    expect(within(alert).getByText('请求标识：req-preparation-503')).toBeInTheDocument();
    expect(within(alert).getAllByRole('button')).toHaveLength(1);
    const retryPreparation = within(alert).getByRole('button', { name: '重新读取准备事实' });
    retryPreparation.focus();
    expect(retryPreparation).toHaveFocus();
    fireEvent.click(retryPreparation);

    expect(await within(panel).findByText('可复用')).toBeInTheDocument();
    const closePanel = within(panel).getByRole('button', { name: '关闭新建批次' });
    await waitFor(() => expect(closePanel).toHaveFocus());
    expect(panel.contains(document.activeElement)).toBe(true);
    expect(preparationCalls).toBe(2);
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('热词证据失败显示请求标识，唯一恢复动作只重读原热词查询', async () => {
    let resolveFirst!: (value: Response) => void;
    const firstHotwords = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    let hotwordCalls = 0;
    let detailCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith(`/asr/batches/${batchId}/hotwords`)) {
        hotwordCalls += 1;
        if (hotwordCalls === 1) return firstHotwords;
        return response(hotwordEvidence);
      }
      if (url.endsWith(`/asr/batches/${batchId}`)) detailCalls += 1;
      return baseFetch({ batchStatus: 'completed' })(input);
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '查看批次' }));
    fireEvent.click(await screen.findByRole('button', { name: '本批次热词' }));
    const evidence = screen.getByRole('dialog', { name: '本批次热词证据' });
    expect(await within(evidence).findByText('正在读取批次绑定热词证据…')).toBeInTheDocument();
    resolveFirst(response({ error: { code: 'ASR_HOTWORDS_UNAVAILABLE', message: '批次热词证据暂不可用。', retryable: true, action: 'reload_asr', requestId: 'req-hotwords-503' } }, 503));

    const alert = await within(evidence).findByRole('alert');
    expect(within(alert).getByText('批次热词证据暂不可用。')).toBeInTheDocument();
    expect(within(alert).getByText('请求标识：req-hotwords-503')).toBeInTheDocument();
    expect(within(alert).getAllByRole('button')).toHaveLength(1);
    const detailCallsBeforeRetry = detailCalls;
    const retryHotwords = within(alert).getByRole('button', { name: '重新读取热词证据' });
    retryHotwords.focus();
    expect(retryHotwords).toHaveFocus();
    fireEvent.click(retryHotwords);

    expect(await within(evidence).findByText('热词链路已接通，准确率未验证。已发送不等于准确率已提升。')).toBeInTheDocument();
    const closeEvidence = within(evidence).getByRole('button', { name: '关闭本批次热词证据' });
    await waitFor(() => expect(closeEvidence).toHaveFocus());
    expect(evidence.contains(document.activeElement)).toBe(true);
    expect(hotwordCalls).toBe(2);
    expect(detailCalls).toBe(detailCallsBeforeRetry);
    expect(within(evidence).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('未知创建结果显式重试复用同一幂等键，pending 与失败焦点留在确认框', async () => {
    let rejectFirst!: (reason: unknown) => void;
    const firstPost = new Promise<Response>((_, reject) => { rejectFirst = reject; });
    const postKeys: string[] = [];
    let postCount = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/asr/batches') && init?.method === 'POST') {
        postKeys.push(new Headers(init.headers).get('idempotency-key')!);
        postCount += 1;
        if (postCount === 1) return firstPost;
        return response(detail('running'), 201);
      }
      return baseFetch({ batches: false })(input);
    });
    renderPage();

    const newButton = (await screen.findAllByRole('button', { name: '新建模拟识别批次' }))[0]!;
    fireEvent.click(newButton);
    await screen.findByText('可复用');
    expect(screen.getByRole('button', { name: '关闭新建批次' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '确认批次信息' }));
    const dialog = screen.getByRole('dialog', { name: '确认创建模拟识别批次' });
    expect(within(dialog).getByRole('button', { name: '取消' })).toHaveFocus();

    fireEvent.click(within(dialog).getByRole('button', { name: '创建模拟识别批次' }));
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(within(dialog).getByRole('button', { name: '处理中…' })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(dialog).toBeInTheDocument();

    rejectFirst(new TypeError('网络响应未知'));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '取消' })).toHaveFocus());
    expect(screen.getByText('网络响应未知')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '创建模拟识别批次' }));

    const success = await screen.findByText(/模拟识别批次 ca65378e 已创建/);
    await waitFor(() => expect(success).toHaveFocus());
    expect(postKeys).toHaveLength(2);
    expect(postKeys[0]).toBe(postKeys[1]);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(2);
    expect(JSON.parse(String(fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')?.[1]?.body))).toMatchObject({ scope: { kind: 'all' } });
  });

  it('选中集与单集按规范化范围提交，不把未选集混入批次', async () => {
    const bodies: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/asr/batches') && init?.method === 'POST') {
        bodies.push(JSON.parse(String(init.body)));
        return response(detail('running'), 201);
      }
      return baseFetch({ batches: false })(input);
    });
    renderPage();

    fireEvent.click((await screen.findAllByRole('button', { name: '新建模拟识别批次' }))[0]!);
    let panel = screen.getByRole('dialog', { name: '新建模拟识别批次' });
    await within(panel).findByText('可复用');
    fireEvent.click(within(panel).getByRole('radio', { name: '选中集' }));
    fireEvent.click(within(panel).getAllByRole('checkbox')[1]!);
    fireEvent.click(within(panel).getByRole('button', { name: '确认批次信息' }));
    let dialog = screen.getByRole('dialog', { name: '确认创建模拟识别批次' });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建模拟识别批次' }));
    await screen.findByText(/模拟识别批次 ca65378e 已创建/);

    fireEvent.click((await screen.findAllByRole('button', { name: '新建模拟识别批次' }))[0]!);
    panel = screen.getByRole('dialog', { name: '新建模拟识别批次' });
    await within(panel).findByText('可复用');
    fireEvent.click(within(panel).getByRole('radio', { name: '单集' }));
    fireEvent.change(within(panel).getByRole('combobox', { name: '选择集数' }), { target: { value: '2' } });
    fireEvent.click(within(panel).getByRole('button', { name: '确认批次信息' }));
    dialog = screen.getByRole('dialog', { name: '确认创建模拟识别批次' });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建模拟识别批次' }));
    await waitFor(() => expect(bodies).toHaveLength(2));

    expect(bodies).toEqual([
      { scope: { kind: 'selected', episodeNumbers: [2] }, termVersionId },
      { scope: { kind: 'single', episodeNumber: 2 }, termVersionId },
    ]);
  });

  it('术语来源变化保持门禁阻断并提供唯一上游动作', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch({ batches: false, sourceIsCurrent: false }));
    renderPage();

    const newButton = (await screen.findAllByRole('button', { name: '新建模拟识别批次' }))[0]!;
    expect(newButton).toBeDisabled();
    expect(screen.getAllByText('术语门禁尚未满足').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '返回术语确认' })).toHaveAttribute('href', `/projects/${projectId}/terms`);
  });

  it('整剧含未校验视频时不静默排除，改选已就绪子集后才可继续', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch({ batches: false, readyTwo: false }));
    renderPage();

    fireEvent.click((await screen.findAllByRole('button', { name: '新建模拟识别批次' }))[0]!);
    const panel = screen.getByRole('dialog', { name: '新建模拟识别批次' });
    expect(await within(panel).findByText(/所选范围含 1 集未校验视频/)).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: '确认批次信息' })).toBeDisabled();

    fireEvent.click(within(panel).getByRole('radio', { name: '选中集' }));
    fireEvent.click(within(panel).getAllByRole('checkbox')[0]!);
    expect(within(panel).getByRole('button', { name: '确认批次信息' })).toBeEnabled();
  });

  it('部分完成批次只提交失败集重试，成功结果不进入请求', async () => {
    const bodies: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/asr/batches/${batchId}/retries`) && init?.method === 'POST') {
        bodies.push(JSON.parse(String(init.body)));
        return response({ ...detail('running'), id: 'ca65378e-8935-4c4a-9e8b-13efca3d3199', retryOfBatchId: batchId }, 201);
      }
      return baseFetch({ batchStatus: 'partial' })(input);
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '查看批次' }));
    const retry = await screen.findByRole('button', { name: '仅重试失败集' });
    fireEvent.click(retry);
    const dialog = screen.getByRole('dialog', { name: '确认仅重试失败集' });
    expect(within(dialog).getByText(/重试第 2 集/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '仅重试失败集' }));
    await screen.findByText(/失败集重试批次 ca65378e 已创建/);
    expect(bodies).toEqual([{ episodeNumbers: [2] }]);
  });

  it('取消只保存意图并继续读取权威状态，不立即伪装成已取消', async () => {
    const keys: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith(`/asr/batches/${batchId}/cancel`) && init?.method === 'POST') {
        keys.push(new Headers(init.headers).get('idempotency-key')!);
        return response({ ...detail('running'), status: 'cancel_requested' });
      }
      return baseFetch({ batchStatus: 'running' })(input);
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '查看批次' }));
    fireEvent.click(await screen.findByRole('button', { name: '取消批次' }));
    const dialog = screen.getByRole('dialog', { name: '确认取消批次' });
    expect(within(dialog).getByText(/可能先变为取消请求中或需对账/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '保存取消意图' }));

    expect(await screen.findByText(/取消意图已保存/)).toBeInTheDocument();
    expect(keys).toHaveLength(1);
    const batchRow = screen.getByRole('button', { name: '#ca65378e' }).closest('tr')!;
    expect(within(batchRow).queryByText('已取消')).not.toBeInTheDocument();
  });

  it('需对账批次没有普通重试，并显示请求标识与自动重试暂停', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch({ batchStatus: 'reconciliation_required' }));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '查看批次' }));
    expect(await screen.findByText('结果或用量未知')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '仅重试失败集' })).not.toBeInTheDocument();
    fireEvent.click((await screen.findAllByRole('button', { name: '查看对账说明' }))[0]!);
    const panel = await screen.findByRole('dialog', { name: '需对账说明' });
    expect(within(panel).getByText(/自动重试已暂停/)).toBeInTheDocument();
    expect(within(panel).getAllByText(/req-unknown/)).toHaveLength(2);
  });

  it('新建面板只读取一次权威准备结果，强制重识别由服务端重算可执行状态', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch({ batches: false }));
    renderPage();

    fireEvent.click((await screen.findAllByRole('button', { name: '新建模拟识别批次' }))[0]!);
    const panel = screen.getByRole('dialog', { name: '新建模拟识别批次' });
    expect(await within(panel).findByText('可复用')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes('/asr/batch-preparation?'))).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([input]) => /\/asr\/batches\/[0-9a-f-]+$/.test(String(input)))).toBe(false);

    fireEvent.click(within(panel).getByRole('checkbox', { name: /创建新的结果修订/ }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes('forceNewRecognition=true'))).toBe(true));
    expect(await within(panel).findAllByText('可执行')).toHaveLength(2);
  });

  it('搜索、状态、正式排序和分页均提交给服务端，不在当前页假筛选', async () => {
    const listUrls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/asr/batches?')) {
        listUrls.push(url);
        return response({ items: [batch('running')], total: 25 });
      }
      return baseFetch()(input);
    });
    renderPage();

    await screen.findByText('匿名中文识别项目');
    fireEvent.change(screen.getByRole('textbox', { name: '搜索批次编号' }), { target: { value: 'ca65378e' } });
    fireEvent.change(screen.getByRole('combobox', { name: '状态' }), { target: { value: 'failed' } });
    fireEvent.change(screen.getByRole('combobox', { name: '排序' }), { target: { value: 'updated-asc' } });
    await waitFor(() => expect(listUrls.some((url) => url.includes('search=ca65378e') && url.includes('status=failed') && url.includes('sortBy=updatedAt') && url.includes('sortDirection=asc'))).toBe(true));

    fireEvent.change(screen.getByRole('combobox', { name: '状态' }), { target: { value: '' } });
    await waitFor(() => expect(screen.getByRole('button', { name: '下一页' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() => expect(listUrls.some((url) => url.includes('offset=20'))).toBe(true));
  });
});
