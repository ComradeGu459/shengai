// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AppShell } from '../../frontend/src/components/AppShell.js';
import { SubtitleAcceptanceWorkspace } from '../../frontend/src/features/subtitle-acceptance/SubtitleAcceptanceWorkspace.js';

const projectId = '15d7670f-6a47-4498-ac53-3997cb04b101';
const draftSessionId = '15d7670f-6a47-4498-ac53-3997cb04b102';
const releasedSessionId = '15d7670f-6a47-4498-ac53-3997cb04b103';
const newSessionId = '15d7670f-6a47-4498-ac53-3997cb04b104';
const episodeId = '15d7670f-6a47-4498-ac53-3997cb04b105';
const dialogueCueId = '15d7670f-6a47-4498-ac53-3997cb04b106';
const screenCueId = '15d7670f-6a47-4498-ac53-3997cb04b107';
const warningIssueId = '15d7670f-6a47-4498-ac53-3997cb04b108';
const preEditReleaseId = '15d7670f-6a47-4498-ac53-3997cb04b109';
const screenTextReleaseId = '15d7670f-6a47-4498-ac53-3997cb04b110';
const asrVideoId = '15d7670f-6a47-4498-ac53-3997cb04b111';
const screenVideoId = '15d7670f-6a47-4498-ac53-3997cb04b112';
const digest = 'b'.repeat(64);

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

const failure = (code: string, message: string, requestId: string, status = 503) => response({
  error: { code, message, retryable: status >= 500, action: 'reload_acceptance', requestId },
}, status);

const materialState = {
  project: {
    id: projectId,
    name: '云端字幕验收项目',
    workflowStatus: 'ready',
    lifecycleStatus: 'active',
    version: 9,
    createdAt: '2026-08-15T01:00:00.000Z',
    updatedAt: '2026-08-15T01:00:00.000Z',
  },
  manifest: {
    id: '15d7670f-6a47-4498-ac53-3997cb04b120',
    projectId,
    version: 4,
    rootName: 'project',
    episodeCount: 2,
    bindingCount: 4,
    confirmedAt: '2026-08-15T01:00:00.000Z',
    createdBy: 'tester',
    bindings: [],
    assetBindings: [],
  },
};

const source = {
  preEditReleaseId,
  preEditReleaseVersion: 7,
  preEditHeadReleaseId: preEditReleaseId,
  screenTextReleaseId,
  screenTextReleaseVersion: 3,
  screenTextHeadReleaseId: screenTextReleaseId,
  manifestId: materialState.manifest.id,
  manifestVersion: 4,
  termVersionId: '15d7670f-6a47-4498-ac53-3997cb04b121',
  termVersion: 5,
  ruleVersion: 'acceptance-rules-v1',
  sourceDigest: digest,
};

const sessionSummary = (id = draftSessionId, status = 'draft') => ({
  id,
  projectId,
  projectVersion: 9,
  status,
  source,
  revision: status === 'released' ? 12 : 3,
  episodeCounts: { total: 2, passed: status === 'released' ? 2 : 0, blocked: 0, reworkRequired: 0 },
  createdAt: '2026-08-15T02:00:00.000Z',
  updatedAt: '2026-08-15T02:30:00.000Z',
});

const episode = (overrides: Record<string, unknown> = {}) => ({
  id: episodeId,
  episodeNumber: 1,
  status: 'changes_pending',
  availableVideos: [
    { assetId: asrVideoId, role: 'asr_video', checksum: 'asr-video-checksum' },
    { assetId: screenVideoId, role: 'screen_video', checksum: 'screen-video-checksum' },
  ],
  selectedVideoAssetId: screenVideoId,
  authoritativeDurationMs: 120_000,
  dialogueCueCount: 1,
  screenTextCueCount: 1,
  openErrorCount: 0,
  openWarningCount: 1,
  passSignature: null,
  revision: 5,
  updatedAt: '2026-08-15T02:30:00.000Z',
  ...overrides,
});

const sessionDetail = (options: { id?: string; status?: string; issueFree?: boolean } = {}) => ({
  ...sessionSummary(options.id ?? draftSessionId, options.status ?? 'draft'),
  episodes: [
    episode(options.issueFree ? { openWarningCount: 0 } : undefined),
    {
      ...episode({ id: '15d7670f-6a47-4498-ac53-3997cb04b122', episodeNumber: 2, dialogueCueCount: 0, screenTextCueCount: 0, openWarningCount: 0, revision: 2 }),
      status: 'not_started',
    },
  ],
});

const cue = (id: string, track: 'dialogue' | 'screen_text', text: string, startMs: number, endMs: number) => ({
  id,
  episodeNumber: 1,
  track,
  ordinal: track === 'dialogue' ? 1 : 2,
  startMs,
  endMs,
  text,
  sourceCueId: `source-${id.slice(-3)}`,
  revision: 2,
  deleted: false,
});

const warningIssue = () => ({
  id: warningIssueId,
  episodeNumber: 1,
  origin: 'automatic',
  code: 'gap_too_short',
  severity: 'warning',
  track: 'dialogue',
  cueId: dialogueCueId,
  timeMs: 10_000,
  note: '同轨间隔过短，需要人工确认。',
  status: 'open',
  resolutionReason: null,
  createdAt: '2026-08-15T02:15:00.000Z',
  updatedAt: '2026-08-15T02:20:00.000Z',
});

const episodeDetail = (issueFree = false) => ({
  episode: episode(issueFree ? { openWarningCount: 0 } : undefined),
  cues: [
    cue(dialogueCueId, 'dialogue', '你好，欢迎来到七猫。', 10_000, 12_000),
    cue(screenCueId, 'screen_text', '门牌：青云楼', 14_000, 17_000),
  ],
  issues: issueFree ? [] : [warningIssue()],
});

const eventList = {
  items: [
    { id: '15d7670f-6a47-4498-ac53-3997cb04b130', kind: 'edit', reversesEventId: null, restoresEventId: null, actor: 'tester', createdAt: '2026-08-15T02:40:00.000Z' },
    { id: '15d7670f-6a47-4498-ac53-3997cb04b131', kind: 'undo', reversesEventId: '15d7670f-6a47-4498-ac53-3997cb04b130', restoresEventId: null, actor: 'tester', createdAt: '2026-08-15T02:41:00.000Z' },
  ],
};

const acceptanceRelease = {
  id: '15d7670f-6a47-4498-ac53-3997cb04b132',
  projectId,
  sessionId: releasedSessionId,
  version: 1,
  sourceDigest: digest,
  acceptanceDigest: 'c'.repeat(64),
  cueCount: 2,
  createdAt: '2026-08-15T03:00:00.000Z',
};

const baseFetch = (options: {
  status?: string;
  issueFree?: boolean;
  preflightFailureOnce?: boolean;
  preEditReleases?: unknown[];
  screenTextReleases?: unknown[];
} = {}) => {
  let preflightReads = 0;
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.endsWith('/material-manifest')) return response(materialState);
    if (url.endsWith('/subtitle-acceptance/sessions') && method === 'GET') {
      return response({ items: [sessionSummary(releasedSessionId, 'released'), sessionSummary(draftSessionId, options.status ?? 'draft')] });
    }
    if (url.endsWith('/subtitle-acceptance/releases')) return response({ items: [acceptanceRelease] });
    if (url.endsWith('/pre-review/releases')) {
      return response({ items: options.preEditReleases ?? [{ id: preEditReleaseId, projectId, version: 7, sourceSrtSetDigest: digest, promptVersion: 'v1', itemCount: 86, createdAt: '2026-08-15T01:30:00.000Z' }] });
    }
    if (url.endsWith('/screen-text/releases')) {
      return response({ items: options.screenTextReleases ?? [{ id: screenTextReleaseId, projectId, version: 3, batchId: '15d7670f-6a47-4498-ac53-3997cb04b133', cueCount: 12, releaseDigest: digest, createdAt: '2026-08-15T01:40:00.000Z' }] });
    }
    if (url.endsWith(`/subtitle-acceptance/sessions/${releasedSessionId}`)) {
      return response(sessionDetail({ id: releasedSessionId, status: 'released', issueFree: true }));
    }
    if (url.endsWith(`/subtitle-acceptance/sessions/${draftSessionId}`)) {
      return response(sessionDetail({ status: options.status ?? 'draft', issueFree: options.issueFree }));
    }
    if (/\/subtitle-acceptance\/sessions\/[^/]+\/episodes\/1$/.test(url)) {
      return response(episodeDetail(options.issueFree));
    }
    if (url.endsWith('/episodes/1/events')) return response(eventList);
    if (url.endsWith('/rework') && method === 'GET') {
      return response({ items: [{ id: '15d7670f-6a47-4498-ac53-3997cb04b134', sessionId: draftSessionId, episodeNumbers: [1], tracks: ['dialogue'], reason: '台词需回源复核一处人名', createdAt: '2026-08-15T02:50:00.000Z' }] });
    }
    if (url.endsWith('/playback') && method === 'POST') {
      return response({ assetId: screenVideoId, episodeNumber: 1, url: 'https://media.invalid/signed.mp4', expiresAt: '2026-08-15T04:00:00.000Z' }, 201);
    }
    if (url.endsWith('/cues') && method === 'POST') return response({ episode: episodeDetail(options.issueFree), replay: false });
    if (url.endsWith('/undo') && method === 'POST') return response({ episode: episodeDetail(options.issueFree), replay: false });
    if (url.endsWith('/redo') && method === 'POST') return response({ episode: episodeDetail(options.issueFree), replay: false });
    if (url.endsWith('/issues') && method === 'POST') return response({ episode: episodeDetail(false), replay: false }, 201);
    if (/\/issues\/[^/]+$/.test(url) && method === 'PATCH') return response({ episode: episodeDetail(true), replay: false });
    if (url.endsWith('/video') && method === 'POST') return response({ episode: episodeDetail(options.issueFree), replay: false });
    if (url.endsWith('/preflight') && method === 'GET') {
      preflightReads += 1;
      if (options.preflightFailureOnce && preflightReads === 1) return failure('PREFLIGHT_SOURCE_STALE', '来源版本已经变化，请重新读取。', 'REQ-PREFLIGHT-503');
      return response({
        sessionId: draftSessionId,
        sessionRevision: 3,
        stale: false,
        canRelease: true,
        eligibleEpisodeNumbers: [1, 2],
        episodes: [
          { episodeNumber: 1, eligible: true, errorCodes: [], warningCodes: [] },
          { episodeNumber: 2, eligible: true, errorCodes: [], warningCodes: [] },
        ],
      });
    }
    if (url.endsWith('/pass-eligible') && method === 'POST') {
      return response({ session: sessionDetail({ status: 'ready_to_release', issueFree: true }), passedEpisodeNumbers: [1, 2], blockedEpisodeNumbers: [], replay: false });
    }
    if (url.endsWith('/pass') && method === 'POST') {
      return response({ session: sessionDetail({ issueFree: true }), passedEpisodeNumbers: [1], blockedEpisodeNumbers: [], replay: false });
    }
    if (url.endsWith('/rework') && method === 'POST') {
      return response({ rework: { id: '15d7670f-6a47-4498-ac53-3997cb04b135', sessionId: draftSessionId, episodeNumbers: [1], tracks: ['dialogue'], reason: '台词需要返工核对', createdAt: '2026-08-15T03:10:00.000Z' }, replay: false }, 201);
    }
    if (url.endsWith('/subtitle-acceptance/sessions') && method === 'POST') {
      return response({ session: sessionDetail({ id: newSessionId, status: 'draft', issueFree: true }), replay: false }, 201);
    }
    throw new Error(`Unhandled fetch: ${url} ${method}`);
  });
};

const renderWorkspace = (entry = `/projects/${projectId}/subtitle-acceptance`) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const routes = (
    <Routes>
      <Route path="/projects/:projectId/subtitle-acceptance" element={<SubtitleAcceptanceWorkspace />} />
    </Routes>
  );
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[entry]}>
          <AppShell>{routes}</AppShell>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
    queryClient,
  };
};

const callsEndingWith = (fetchMock: ReturnType<typeof baseFetch>, suffix: string, method?: string) =>
  fetchMock.mock.calls.filter(([input, init]) => String(input).endsWith(suffix) && (!method || (init?.method ?? 'GET') === method));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

describe('SubtitleAcceptanceWorkspace', () => {
  it('从项目路由恢复当前会话，并把 released 历史会话作为全写锁只读事实查看', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace();

    expect(await screen.findByText('云端字幕验收项目')).toBeInTheDocument();
    expect(screen.getByLabelText('全局导航')).toBeInTheDocument();
    expect(screen.getByText('项目中心是唯一跨项目选择器')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回项目中心' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('button', { name: '切换项目' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '选择项目' })).not.toBeInTheDocument();

    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith(`/subtitle-acceptance/sessions/${draftSessionId}`))).toBe(true));
    fireEvent.change(screen.getByRole('combobox', { name: '选择验收会话' }), { target: { value: releasedSessionId } });

    expect(await screen.findByText('历史验收版本已发布，当前会话只读。')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '新增台词' }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
      expect(screen.getAllByRole('button', { name: '新增画面字' }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    });
  });

  it('提供双轨显式新增，全部筛选下 Ctrl+N 必须选择轨道，并冻结请求 body 与幂等键', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getAllByRole('button', { name: '新增画面字' })[0]!);

    await waitFor(() => expect(callsEndingWith(fetchMock, '/cues', 'POST')).toHaveLength(1));
    const addScreenCall = callsEndingWith(fetchMock, '/cues', 'POST')[0]!;
    expect((addScreenCall[1]?.headers as Record<string, string>)['idempotency-key']).toMatch(/^subtitle-acceptance-[a-z0-9_-]+-[0-9a-f-]+/);
    expect((addScreenCall[1]?.headers as Record<string, string>)['idempotency-key']).not.toMatch(/[^\x00-\x7F]/);
    expect(JSON.parse(String(addScreenCall[1]?.body))).toMatchObject({
      expectedSessionRevision: 3,
      expectedEpisodeRevision: 5,
      operations: [{ kind: 'add', cue: { track: 'screen_text', text: '新增画面字' } }],
    });

    fireEvent.click(within(screen.getByRole('group', { name: '字幕轨道筛选' })).getByRole('button', { name: '全部' }));
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    const addTrackDialog = await screen.findByRole('dialog', { name: '选择目标轨道' });
    expect(addTrackDialog).toHaveTextContent('必须明确目标轨道');
    fireEvent.click(within(addTrackDialog).getByRole('button', { name: '台词' }));

    await waitFor(() => expect(callsEndingWith(fetchMock, '/cues', 'POST')).toHaveLength(2));
    const addDialogueCall = callsEndingWith(fetchMock, '/cues', 'POST')[1]!;
    expect(JSON.parse(String(addDialogueCall[1]?.body))).toMatchObject({
      operations: [{ kind: 'add', cue: { track: 'dialogue', text: '新增台词' } }],
    });
  });

  it('支持文字与时间轻量编辑并自动保存到服务端权威工作副本', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    const rightPane = await screen.findByRole('complementary', { name: '字幕与问题编辑' });
    fireEvent.click(within(rightPane).getByRole('button', { name: /你好，欢迎来到七猫。/ }));
    expect(screen.getByText(/转到另一轨道请复制\/剪切后粘贴到目标轨道/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('文字'), { target: { value: '你好，欢迎来到七猫。修订' } });
    fireEvent.change(screen.getByLabelText('入点'), { target: { value: '00:09.500' } });
    fireEvent.change(screen.getByLabelText('出点'), { target: { value: '00:12.500' } });

    await waitFor(() => expect(callsEndingWith(fetchMock, '/cues', 'POST')).toHaveLength(1), { timeout: 2_500 });
    expect(JSON.parse(String(callsEndingWith(fetchMock, '/cues', 'POST')[0]![1]?.body))).toMatchObject({
      expectedSessionRevision: 3,
      expectedEpisodeRevision: 5,
      operations: [{
        kind: 'update',
        cueId: dialogueCueId,
        text: '你好，欢迎来到七猫。修订',
        startMs: 9_500,
        endMs: 12_500,
      }],
    });
  });

  it('覆盖多选复制剪切粘贴删除、人工 warning 八字理由解决和局部返工历史读取', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    const rightPane = await screen.findByRole('complementary', { name: '字幕与问题编辑' });
    fireEvent.click(within(rightPane).getByRole('button', { name: /你好，欢迎来到七猫。/ }));
    fireEvent.click(screen.getByRole('button', { name: '复制' }));
    fireEvent.click(screen.getByRole('button', { name: '粘贴' }));
    const pasteTrackDialog = await screen.findByRole('dialog', { name: '选择目标轨道' });
    fireEvent.click(within(pasteTrackDialog).getByRole('button', { name: '画面字' }));

    await waitFor(() => expect(callsEndingWith(fetchMock, '/cues', 'POST')).toHaveLength(1));
    expect(JSON.parse(String(callsEndingWith(fetchMock, '/cues', 'POST')[0]![1]?.body))).toMatchObject({
      operations: [{ kind: 'paste', cues: [{ track: 'screen_text', text: '你好，欢迎来到七猫。' }] }],
    });

    fireEvent.click(within(rightPane).getByRole('button', { name: /你好，欢迎来到七猫。/ }));
    fireEvent.click(screen.getByRole('button', { name: '删除选中' }));
    expect(await screen.findByRole('dialog', { name: '删除字幕确认' })).toHaveTextContent('仅删除当前验收工作副本');
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }));

    await waitFor(() => expect(callsEndingWith(fetchMock, '/cues', 'POST')).toHaveLength(2));
    expect(JSON.parse(String(callsEndingWith(fetchMock, '/cues', 'POST')[1]![1]?.body))).toMatchObject({
      operations: [{ kind: 'delete', cueIds: [dialogueCueId] }],
    });

    fireEvent.click(screen.getByRole('tab', { name: '问题' }));
    expect(await screen.findByText('局部返工历史')).toBeInTheDocument();
    expect(screen.getByText('台词需回源复核一处人名')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '通过并下一集' })).toBeDisabled();
    const reason = screen.getByPlaceholderText('处理理由至少 8 字');
    expect(screen.getByRole('button', { name: '已解决' })).toBeDisabled();
    fireEvent.change(reason, { target: { value: '已经人工核对通过' } });
    fireEvent.click(screen.getByRole('button', { name: '已解决' }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => /\/issues\/[^/]+$/.test(String(input)) && init?.method === 'PATCH')).toBe(true));
    const resolveCall = fetchMock.mock.calls.find(([input, init]) => /\/issues\/[^/]+$/.test(String(input)) && init?.method === 'PATCH')!;
    expect(JSON.parse(String(resolveCall[1]?.body))).toMatchObject({ status: 'resolved', reason: '已经人工核对通过' });
  });

  it('同步 GET 预检失败只显示唯一人工重读，成功后才按最近成功结果一键通过', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch({ issueFree: true, preflightFailureOnce: true }));
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '整剧预检' }));

    expect(await screen.findByText('请求标识：REQ-PREFLIGHT-503')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '重新读取预检' })).toHaveFocus());
    expect(callsEndingWith(fetchMock, '/preflight', 'GET')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '一键通过可通过集' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '重新读取预检' }));
    expect(await screen.findByText(/可通过 2 集/)).toBeInTheDocument();
    expect(callsEndingWith(fetchMock, '/preflight', 'GET')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '一键通过可通过集' }));

    await waitFor(() => expect(callsEndingWith(fetchMock, '/pass-eligible', 'POST')).toHaveLength(1));
    expect(JSON.parse(String(callsEndingWith(fetchMock, '/pass-eligible', 'POST')[0]![1]?.body))).toEqual({
      expectedSessionRevision: 3,
      episodeNumbers: [1, 2],
    });
  });

  it('未知写入结果锁定工作区，并只能用同一 body 与同一幂等键恢复', async () => {
    const healthy = baseFetch();
    let cueWrites = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith('/cues') && init?.method === 'POST') {
        cueWrites += 1;
        if (cueWrites === 1) throw new TypeError('network lost');
      }
      return healthy(input, init);
    });
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getAllByRole('button', { name: '新增台词' })[0]!);

    expect(await screen.findByText('新增台词 结果未知')).toBeInTheDocument();
    const firstWrite = callsEndingWith(fetchMock, '/cues', 'POST')[0]!;
    expect(screen.getByText((firstWrite[1]?.headers as Record<string, string>)['idempotency-key'])).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '新增画面字' }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '恢复本次新增台词' }));
    await waitFor(() => expect(callsEndingWith(fetchMock, '/cues', 'POST')).toHaveLength(2));
    const retryWrite = callsEndingWith(fetchMock, '/cues', 'POST')[1]!;
    expect(retryWrite[1]?.body).toBe(firstWrite[1]?.body);
    expect((retryWrite[1]?.headers as Record<string, string>)['idempotency-key']).toBe((firstWrite[1]?.headers as Record<string, string>)['idempotency-key']);
  });

  it('新建验收会话显式固定 S3 台词 Release 与可选 S4 画面字 Release', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '从来源版本新建会话' }));
    const sourcePanel = await screen.findByRole('region', { name: '新建验收会话来源版本' });
    await within(sourcePanel).findByText(/V7/);
    fireEvent.change(within(sourcePanel).getByLabelText('S3 台词 Release'), { target: { value: preEditReleaseId } });
    fireEvent.change(within(sourcePanel).getByLabelText('S4 画面字 Release'), { target: { value: 'none' } });
    fireEvent.click(within(sourcePanel).getByRole('button', { name: '创建并固定来源' }));

    await waitFor(() => expect(callsEndingWith(fetchMock, '/subtitle-acceptance/sessions', 'POST')).toHaveLength(1));
    const createCall = callsEndingWith(fetchMock, '/subtitle-acceptance/sessions', 'POST')[0]!;
    expect(JSON.parse(String(createCall[1]?.body))).toEqual({
      expectedProjectVersion: 9,
      preEditReleaseId,
      screenTextReleaseId: null,
    });
  });

  it('上游画面字为部分 Release 时展示排除集与异常事实，不伪造完整来源', async () => {
    const partialRelease = {
      id: screenTextReleaseId,
      projectId,
      version: 4,
      batchId: '15d7670f-6a47-4498-ac53-3997cb04b133',
      termVersionId: source.termVersionId,
      manifestId: materialState.manifest.id,
      draftRevision: 6,
      cueCount: 8,
      releaseDigest: digest,
      partial: true,
      excludedEpisodes: [{
        episodeNumber: 2,
        jobId: '15d7670f-6a47-4498-ac53-3997cb04b134',
        status: 'failed',
        attemptId: null,
        errorCode: 'OCR_TIMEOUT',
        effectClass: 'quality_rejected',
        providerRequestId: null,
      }],
      exports: [],
      createdAt: '2026-08-15T01:40:00.000Z',
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch({ screenTextReleases: [partialRelease] }));
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '从来源版本新建会话' }));
    const sourcePanel = await screen.findByRole('region', { name: '新建验收会话来源版本' });
    expect(await within(sourcePanel).findByText('画面字 Release V4 为部分发布')).toBeInTheDocument();
    expect(await within(sourcePanel).findByRole('status')).toHaveTextContent('排除 1 集');
    expect(within(sourcePanel).getByText('第 2 集 · failed · OCR_TIMEOUT')).toBeInTheDocument();
    expect(within(sourcePanel).getByRole('button', { name: '创建并固定来源' })).toBeEnabled();
  });

  it('缺少画面字 Release 时明确允许不绑定，但没有台词 Release 不能创建', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch({ screenTextReleases: [] }));
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '从来源版本新建会话' }));
    const sourcePanel = await screen.findByRole('region', { name: '新建验收会话来源版本' });
    expect(await within(sourcePanel).findByText('尚无 S4 画面字 Release')).toBeInTheDocument();
    expect(within(sourcePanel).getByRole('link', { name: '前往画面字' })).toHaveAttribute('href', `/projects/${projectId}/screen-text`);
    expect(within(sourcePanel).getByRole('button', { name: '创建并固定来源' })).toBeDisabled();
    fireEvent.change(within(sourcePanel).getByLabelText('S4 画面字 Release'), { target: { value: 'none' } });
    expect(within(sourcePanel).getByRole('button', { name: '创建并固定来源' })).toBeEnabled();
  });

  it('缺少台词 Release 时阻止创建并提供前置审改入口', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch({ preEditReleases: [] }));
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '从来源版本新建会话' }));
    const sourcePanel = await screen.findByRole('region', { name: '新建验收会话来源版本' });
    expect(await within(sourcePanel).findByText('缺少 S3 台词 Release')).toBeInTheDocument();
    expect(within(sourcePanel).getByRole('link', { name: '前往前置审改' })).toHaveAttribute('href', `/projects/${projectId}/pre-review`);
    expect(within(sourcePanel).getByRole('button', { name: '创建并固定来源' })).toBeDisabled();
  });

  it('预检成功后的唯一交付下一步在抽屉内，工作台不显示员工可见发布或下载入口', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch({ status: 'ready_to_release', issueFree: true }));
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    expect(screen.queryByRole('button', { name: '发布不可变验收版本' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /下载交付产物/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '整剧预检' }));
    expect(await screen.findByRole('button', { name: '前往交付确认' })).toBeInTheDocument();
    expect(callsEndingWith(fetchMock, '/preflight', 'GET')).toHaveLength(1);
  });

  it('只读快捷键不打开写入语境，脏草稿切会话会被同一离开门拦截', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${releasedSessionId}&episode=1`);

    expect(await screen.findByText('历史验收版本已发布，当前会话只读。')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(screen.queryByRole('dialog', { name: '选择新增轨道' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '删除字幕确认' })).not.toBeInTheDocument();

    cleanup();
    vi.restoreAllMocks();
    const draftFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);
    const rightPane = await screen.findByRole('complementary', { name: '字幕与问题编辑' });
    fireEvent.click(within(rightPane).getByRole('button', { name: /你好，欢迎来到七猫。/ }));
    fireEvent.change(screen.getByLabelText('文字'), { target: { value: '尚未提交的草稿' } });
    fireEvent.change(screen.getByRole('combobox', { name: '选择验收会话' }), { target: { value: releasedSessionId } });
    expect(screen.getByRole('combobox', { name: '选择验收会话' })).toHaveValue(draftSessionId);
    expect(await screen.findByText(/已阻止离开以保护未提交修改/)).toBeInTheDocument();
    expect(callsEndingWith(draftFetch, `/subtitle-acceptance/sessions/${releasedSessionId}`)).toHaveLength(0);
  });

  it('切换会话会立即清空旧媒体授权、错误、时长、进度和播放状态', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '获取播放授权' }));
    await waitFor(() => expect(document.querySelector('video')).toBeInTheDocument());
    const video = document.querySelector('video')!;
    fireEvent.error(video);
    fireEvent.change(screen.getByRole('slider', { name: '播放进度' }), { target: { value: '1000' } });
    expect(screen.getByRole('slider', { name: '播放进度' })).toHaveValue('1000');
    expect(screen.getByRole('alert')).toHaveTextContent('媒体解码失败');

    fireEvent.change(screen.getByRole('combobox', { name: '选择验收会话' }), { target: { value: releasedSessionId } });
    expect(await screen.findByText('历史验收版本已发布，当前会话只读。')).toBeInTheDocument();
    expect(document.querySelector('video')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('slider', { name: '播放进度' })).toHaveValue('0');
    expect(screen.getByRole('button', { name: '获取播放授权' })).toBeEnabled();
    expect(callsEndingWith(fetchMock, '/playback', 'POST')).toHaveLength(1);
  });

  it('换 Asset 或切集会清空当前视频授权与播放状态', async () => {
    const healthy = baseFetch();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith(`/subtitle-acceptance/sessions/${draftSessionId}/episodes/2`)) {
        return Promise.resolve(response({
          ...episodeDetail(true),
          episode: episode({ id: '15d7670f-6a47-4498-ac53-3997cb04b122', episodeNumber: 2, status: 'not_started', openWarningCount: 0 }),
        }));
      }
      if (url.endsWith(`/subtitle-acceptance/sessions/${draftSessionId}/episodes/2/events`)) return Promise.resolve(response(eventList));
      return healthy(input, init);
    });
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '获取播放授权' }));
    await waitFor(() => expect(document.querySelector('video')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '中文识别视频' }));
    await waitFor(() => expect(callsEndingWith(fetchMock, '/video', 'POST')).toHaveLength(1));
    expect(document.querySelector('video')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole('button', { name: '获取播放授权' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '获取播放授权' }));
    await waitFor(() => expect(document.querySelector('video')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /第 2 集/ }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith(`/subtitle-acceptance/sessions/${draftSessionId}/episodes/2`))).toBe(true));
    expect(document.querySelector('video')).not.toBeInTheDocument();
  });

  it('乱序播放授权只接受仍属于当前媒体身份的响应', async () => {
    const healthy = baseFetch();
    const pending: Array<{ sessionId: string; resolve: (value: Response) => void }> = [];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (String(input).endsWith('/playback') && init?.method === 'POST') {
        const sessionMatch = String(input).match(/\/sessions\/([^/]+)\/episodes/);
        return new Promise<Response>((resolve) => {
          pending.push({ sessionId: sessionMatch?.[1] ?? '', resolve });
        });
      }
      return healthy(input, init);
    });
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);

    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '获取播放授权' }));
    await waitFor(() => expect(pending).toHaveLength(1));
    fireEvent.change(screen.getByRole('combobox', { name: '选择验收会话' }), { target: { value: releasedSessionId } });
    expect(await screen.findByText('历史验收版本已发布，当前会话只读。')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: '选择验收会话' }), { target: { value: draftSessionId } });
    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '获取播放授权' }));
    await waitFor(() => expect(pending).toHaveLength(2));

    pending[1]!.resolve(response({ assetId: screenVideoId, episodeNumber: 1, url: 'https://media.invalid/current.mp4', expiresAt: '2026-08-15T04:00:00.000Z' }, 201));
    await waitFor(() => expect(document.querySelector('video')).toHaveAttribute('src', 'https://media.invalid/current.mp4'));
    pending[0]!.resolve(response({ assetId: screenVideoId, episodeNumber: 1, url: 'https://media.invalid/stale.mp4', expiresAt: '2026-08-15T04:00:00.000Z' }, 201));
    await waitFor(() => expect(document.querySelector('video')).toHaveAttribute('src', 'https://media.invalid/current.mp4'));
    expect(callsEndingWith(fetchMock, '/playback', 'POST')).toHaveLength(2);
  });

  it('任一模态打开时后台快捷键均无副作用，只由活动模态处理 Tab 与 Escape', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);
    const rightPane = await screen.findByRole('complementary', { name: '字幕与问题编辑' });
    fireEvent.click(within(rightPane).getByRole('button', { name: /你好，欢迎来到七猫。/ }));
    fireEvent.click(within(rightPane).getByRole('button', { name: '全部' }));
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    expect(await screen.findByRole('dialog', { name: '选择目标轨道' })).toBeInTheDocument();
    const before = fetchMock.mock.calls.length;
    for (const event of [
      { key: 'n', ctrlKey: true }, { key: 'Delete' }, { key: 'c', ctrlKey: true }, { key: 'x', ctrlKey: true },
      { key: 'v', ctrlKey: true }, { key: 'z', ctrlKey: true }, { key: 'y', ctrlKey: true }, { key: ' ' },
      { key: 'j' }, { key: 'k' }, { key: 'l' }, { key: 'ArrowLeft' }, { key: 'ArrowRight' },
    ]) fireEvent.keyDown(window, event);
    expect(fetchMock.mock.calls).toHaveLength(before);
    expect(screen.getByRole('dialog', { name: '选择目标轨道' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '删除字幕确认' })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '选择目标轨道' })).not.toBeInTheDocument());
  });

  it('人工问题与返工模态保留中文、空格输入和按钮表单操作', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);
    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('tab', { name: '问题' }));
    fireEvent.click(screen.getByRole('button', { name: '记录问题' }));
    const issueDialog = await screen.findByRole('dialog', { name: '记录人工问题' });
    const issueNote = within(issueDialog).getByLabelText('备注');
    fireEvent.change(issueNote, { target: { value: '中文问题 需要复核' } });
    const issueSpace = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    issueNote.dispatchEvent(issueSpace);
    expect(issueSpace.defaultPrevented).toBe(false);
    fireEvent.click(within(issueDialog).getByRole('button', { name: '保存问题' }));
    await waitFor(() => expect(callsEndingWith(fetchMock, '/issues', 'POST')).toHaveLength(1));
    expect(JSON.parse(String(callsEndingWith(fetchMock, '/issues', 'POST')[0]![1]?.body))).toMatchObject({ note: '中文问题 需要复核' });

    fireEvent.click(screen.getByRole('button', { name: '发起局部返工' }));
    const reworkDialog = await screen.findByRole('dialog', { name: '发起局部返工' });
    const reworkReason = within(reworkDialog).getByPlaceholderText('返工原因至少 8 字');
    fireEvent.change(reworkReason, { target: { value: '中文 需要重新核对台词' } });
    const reworkSpace = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    reworkReason.dispatchEvent(reworkSpace);
    expect(reworkSpace.defaultPrevented).toBe(false);
    fireEvent.click(within(reworkDialog).getByRole('button', { name: '提交返工' }));
    await waitFor(() => expect(callsEndingWith(fetchMock, '/rework', 'POST')).toHaveLength(1));
    expect(JSON.parse(String(callsEndingWith(fetchMock, '/rework', 'POST')[0]![1]?.body))).toMatchObject({ reason: '中文 需要重新核对台词' });
  });

  it('同集保存导致 session revision 增长时保留同一视频，旧 revision 授权响应仍丢弃', async () => {
    const healthy = baseFetch();
    let sessionRevision = 3;
    let resolvePlayback: ((value: Response) => void) | undefined;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.endsWith('/playback') && method === 'POST') {
        return new Promise<Response>((resolve) => { resolvePlayback = resolve; });
      }
      if (url.endsWith(`/subtitle-acceptance/sessions/${draftSessionId}`) && method === 'GET') {
        return response({ ...sessionDetail({ status: 'draft' }), revision: sessionRevision });
      }
      if (url.endsWith('/cues') && method === 'POST') {
        const result = await healthy(input, init);
        sessionRevision = 4;
        return result;
      }
      return healthy(input, init);
    });
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);
    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '获取播放授权' }));
    await waitFor(() => expect(resolvePlayback).toBeDefined());

    const rightPane = screen.getByRole('complementary', { name: '字幕与问题编辑' });
    fireEvent.click(within(rightPane).getByRole('button', { name: /你好，欢迎来到七猫。/ }));
    fireEvent.change(screen.getByLabelText('文字'), { target: { value: '同集保存但视频保持' } });
    await waitFor(() => expect(callsEndingWith(fetchMock, '/cues', 'POST')).toHaveLength(1), { timeout: 2_500 });
    expect(screen.getByRole('button', { name: '获取中…' })).toBeInTheDocument();

    resolvePlayback?.(response({ assetId: screenVideoId, episodeNumber: 1, url: 'https://media.invalid/stale-revision.mp4', expiresAt: '2026-08-15T04:00:00.000Z' }, 201));
    await waitFor(() => expect(screen.getByRole('button', { name: '获取播放授权' })).toBeEnabled());
    expect(document.querySelector('video')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('所有关键弹窗提供安全初始焦点、边界闭环、Escape 与触发点恢复', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);
    const rightPane = await screen.findByRole('complementary', { name: '字幕与问题编辑' });

    fireEvent.click(within(rightPane).getByRole('button', { name: /你好，欢迎来到七猫。/ }));
    const deleteTrigger = screen.getByRole('button', { name: '删除选中' });
    fireEvent.click(deleteTrigger);
    const deleteDialog = await screen.findByRole('dialog', { name: '删除字幕确认' });
    await waitFor(() => expect(screen.getByRole('button', { name: '安全返回' })).toHaveFocus());
    const deleteConfirm = within(deleteDialog).getByRole('button', { name: '确认删除' });
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(deleteConfirm).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: '安全返回' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(deleteConfirm).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '删除字幕确认' })).not.toBeInTheDocument());
    expect(deleteTrigger).toHaveFocus();

    fireEvent.click(within(rightPane).getByRole('button', { name: '全部' }));
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    const trackDialog = await screen.findByRole('dialog', { name: '选择目标轨道' });
    await waitFor(() => expect(within(trackDialog).getByRole('button', { name: '台词' })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '选择目标轨道' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: '问题' }));
    const issueTrigger = screen.getByRole('button', { name: '记录问题' });
    fireEvent.click(issueTrigger);
    const issueDialog = await screen.findByRole('dialog', { name: '记录人工问题' });
    await waitFor(() => expect(within(issueDialog).getByRole('button', { name: '取消' })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '记录人工问题' })).not.toBeInTheDocument());
    expect(issueTrigger).toHaveFocus();

    const reworkTrigger = screen.getByRole('button', { name: '发起局部返工' });
    fireEvent.click(reworkTrigger);
    const reworkDialog = await screen.findByRole('dialog', { name: '发起局部返工' });
    await waitFor(() => expect(within(reworkDialog).getByRole('button', { name: '取消' })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '发起局部返工' })).not.toBeInTheDocument());
    expect(reworkTrigger).toHaveFocus();
  });

  it('preflight 绑定打开时会话并防止 loading 重复读取，旧会话响应不污染新会话', async () => {
    let resolvePreflight: ((value: Response) => void) | undefined;
    const healthy = baseFetch();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (String(input).endsWith('/preflight')) {
        return new Promise<Response>((resolve) => { resolvePreflight = resolve; });
      }
      return healthy(input, init);
    });
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);
    await screen.findAllByText('你好，欢迎来到七猫。');
    fireEvent.click(screen.getByRole('button', { name: '整剧预检' }));
    fireEvent.click(screen.getByRole('button', { name: '整剧预检' }));
    expect(callsEndingWith(fetchMock, '/preflight', 'GET')).toHaveLength(1);
    fireEvent.change(screen.getByRole('combobox', { name: '选择验收会话' }), { target: { value: releasedSessionId } });
    resolvePreflight?.(response({
      sessionId: draftSessionId,
      sessionRevision: 3,
      stale: false,
      canRelease: true,
      eligibleEpisodeNumbers: [1, 2],
      episodes: [
        { episodeNumber: 1, eligible: true, errorCodes: [], warningCodes: [] },
        { episodeNumber: 2, eligible: true, errorCodes: [], warningCodes: [] },
      ],
    }));
    await waitFor(() => expect(screen.queryByText(/最近成功/)).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '前往交付确认' })).not.toBeInTheDocument();
  });

  it('正式播放器保留 9:16 contain 安全区并暴露完整播放控制 DOM', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(baseFetch());
    renderWorkspace(`/projects/${projectId}/subtitle-acceptance?sessionId=${draftSessionId}&episode=1`);
    await screen.findAllByText('你好，欢迎来到七猫。');
    expect(document.querySelector('[data-primary-viewport="9:16"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: '播放进度' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: '音量' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '播放倍速' })).toHaveDisplayValue('1×');
    fireEvent.click(screen.getByRole('button', { name: '获取播放授权' }));
    await waitFor(() => expect(document.querySelector('video')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '-40 ms' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+40 ms' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+40 ms' }));
    expect(screen.getByRole('slider', { name: '播放进度' })).toHaveValue('40');
    fireEvent.click(screen.getByRole('button', { name: '-40 ms' }));
    expect(screen.getByRole('slider', { name: '播放进度' })).toHaveValue('0');
    expect(screen.getByRole('button', { name: '-1 秒' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+1 秒' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '静音' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '放大播放器' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全屏' })).toBeInTheDocument();
  });
});
