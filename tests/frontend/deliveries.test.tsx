// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { DeliveryConfirmPage } from '../../frontend/src/features/deliveries/DeliveryConfirmPage.js';
import { DeliveryDetailPage } from '../../frontend/src/features/deliveries/DeliveryDetailPage.js';
import { DeliveryLibraryPage } from '../../frontend/src/features/deliveries/DeliveryLibraryPage.js';

const projectId = '15d7670f-6a47-4498-ac53-3997cb04b201';
const sessionId = '15d7670f-6a47-4498-ac53-3997cb04b202';
const deliveryId = '15d7670f-6a47-4498-ac53-3997cb04b203';
const sourceDigest = 'a'.repeat(64);
const ids = {
  acceptance: '15d7670f-6a47-4498-ac53-3997cb04b204',
  preEdit: '15d7670f-6a47-4498-ac53-3997cb04b205',
  screenText: '15d7670f-6a47-4498-ac53-3997cb04b206',
  manifest: '15d7670f-6a47-4498-ac53-3997cb04b207',
  term: '15d7670f-6a47-4498-ac53-3997cb04b208',
  template: '15d7670f-6a47-4498-ac53-3997cb04b209',
  fileDialogue: '15d7670f-6a47-4498-ac53-3997cb04b210',
  fileScreen: '15d7670f-6a47-4498-ac53-3997cb04b211',
  fileTerms: '15d7670f-6a47-4498-ac53-3997cb04b212',
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

const source = {
  acceptanceSessionId: sessionId,
  acceptanceSessionRevision: 8,
  acceptanceReleaseId: ids.acceptance,
  acceptanceReleaseVersion: 2,
  preEditReleaseId: ids.preEdit,
  preEditReleaseVersion: 5,
  screenTextReleaseId: ids.screenText,
  screenTextReleaseVersion: 3,
  manifestId: ids.manifest,
  manifestVersion: 4,
  termVersionId: ids.term,
  termVersion: 7,
  templateVersionId: ids.template,
  templateVersion: 1,
  sourceDigest,
};

const confirmation = {
  projectId,
  projectName: '竖屏短剧项目',
  sessionId,
  sessionRevision: 8,
  canGenerate: true,
  blockers: [],
  owner: '验收员',
  note: '',
  productNamePreview: '竖屏短剧项目 · 交付产品',
  nextVersion: 2,
  source,
  sourceDigest,
  templateVersionId: ids.template,
  summaries: { dialogueEpisodes: 2, dialogueCueCount: 12, screenTextEpisodes: 2, screenTextNonEmptyEpisodes: 1, screenTextCueCount: 3, termCount: 24, templateName: '交付模板', templateVersion: 1 },
  episodes: [
    { episodeNumber: 1, dialogueCueCount: 7, screenTextCueCount: 3, dialogueFileName: 'ep-001-dialogue.srt', screenTextFileName: 'ep-001-screen-text.srt', screenTextEmpty: false, status: 'passed' },
    { episodeNumber: 2, dialogueCueCount: 5, screenTextCueCount: 0, dialogueFileName: 'ep-002-dialogue.srt', screenTextFileName: 'ep-002-screen-text.srt', screenTextEmpty: true, status: 'passed' },
  ],
};

const files = [
  { id: ids.fileDialogue, kind: 'dialogue_srt', episodeNumber: 1, fileName: 'ep-001-dialogue.srt', contentType: 'application/x-subrip', contentDigest: 'b'.repeat(64), sizeBytes: 1200, cueCount: 7, emptyTrack: false, downloadUrl: `/api/deliveries/${deliveryId}/files/${ids.fileDialogue}`, createdAt: '2026-08-15T03:00:00.000Z' },
  { id: ids.fileScreen, kind: 'screen_text_srt', episodeNumber: 2, fileName: 'ep-002-screen-text.srt', contentType: 'application/x-subrip', contentDigest: 'c'.repeat(64), sizeBytes: 32, cueCount: 0, emptyTrack: true, downloadUrl: `/api/deliveries/${deliveryId}/files/${ids.fileScreen}`, createdAt: '2026-08-15T03:00:00.000Z' },
  { id: ids.fileTerms, kind: 'terms_xlsx', episodeNumber: null, fileName: 'terms.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', contentDigest: 'd'.repeat(64), sizeBytes: 2048, cueCount: 0, emptyTrack: false, downloadUrl: `/api/deliveries/${deliveryId}/files/${ids.fileTerms}`, createdAt: '2026-08-15T03:00:00.000Z' },
];

const product = (status: 'preparing' | 'ready' | 'generation_failed' | 'recycled' = 'ready') => ({
  id: deliveryId,
  deliveryId,
  projectId,
  projectName: '竖屏短剧项目',
  name: '竖屏短剧项目 · 交付产品',
  version: 2,
  status,
  owner: '验收员',
  note: '首版交付',
  requestId: 'req-delivery-1',
  failureReason: status === 'generation_failed' ? '对象生成失败，请恢复同一产品。' : null,
  failureRequestId: status === 'generation_failed' ? 'req-failed-1' : null,
  acceptanceSessionId: sessionId,
  source,
  fileSummary: { dialogueEpisodes: 2, dialogueCueCount: 12, screenTextEpisodes: 2, screenTextNonEmptyEpisodes: 1, screenTextCueCount: 3, termCount: 24 },
  createdAt: '2026-08-15T03:00:00.000Z',
  updatedAt: '2026-08-15T03:05:00.000Z',
});

const detail = (status: 'preparing' | 'ready' | 'generation_failed' | 'recycled' = 'ready', eventKind = 'delivery.created') => ({
  product: product(status),
  manifest: status === 'ready' ? { id: ids.manifest, version: 1, digest: 'e'.repeat(64), fileCount: files.length, dialogueCueCount: 7, screenTextCueCount: 0, termCount: 24, createdAt: '2026-08-15T03:00:00.000Z', files } : null,
  events: [{ id: '15d7670f-6a47-4498-ac53-3997cb04b213', kind: eventKind, requestId: 'req-delivery-1', detail: {}, createdAt: '2026-08-15T03:00:00.000Z' }],
});

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const renderWithRoute = (element: ReactNode, initialEntries: string[], path: string) => render(
  <QueryClientProvider client={makeClient()}><MemoryRouter initialEntries={initialEntries}><Routes><Route path={path} element={element} /></Routes></MemoryRouter></QueryClientProvider>,
);

describe('S7 交付产品前端', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => cleanup());

  it('确认页只消费服务端摘要，并用稳定 deliveryId/idempotency-key 创建', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes('/confirm?sessionId=')) return response(confirmation);
      if (url === `/api/projects/${projectId}/deliveries`) return response({ product: detail('preparing'), replay: false });
      if (url === `/api/deliveries/${deliveryId}`) return response(detail('preparing'));
      throw new Error(`unexpected ${url}`);
    }));

    renderWithRoute(<DeliveryConfirmPage />, [`/projects/${projectId}/deliveries/confirm?sessionId=${sessionId}`], '/projects/:projectId/deliveries/confirm');
    expect(await screen.findByRole('heading', { name: '核对并生成交付产品' })).toBeInTheDocument();
    expect(screen.getByText('空轨文件 / 0 条 · UTF-8 BOM')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '生成交付产品' }));
    expect(screen.getByRole('dialog', { name: '确认生成不可变交付产品' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认生成' }));
    await waitFor(() => expect(calls.some((call) => call.url === `/api/projects/${projectId}/deliveries`)).toBe(true));
    const createCall = calls.find((call) => call.url === `/api/projects/${projectId}/deliveries`);
    const body = JSON.parse(String(createCall?.init?.body)) as Record<string, unknown>;
    expect(body.sessionId).toBe(sessionId);
    expect(body.expectedSessionRevision).toBe(8);
    expect(typeof body.deliveryId).toBe('string');
    expect(createCall?.init?.headers).toMatchObject({ 'idempotency-key': expect.stringContaining('delivery-create-') });
  });

  it('创建未知时只 GET 同一 deliveryId，不重复 POST', async () => {
    let postCount = 0;
    let detailCount = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/confirm?sessionId=')) return response(confirmation);
      if (url === `/api/projects/${projectId}/deliveries`) { postCount += 1; return response({ error: { code: 'TIMEOUT', message: '结果未知', retryable: true, requestId: 'req-unknown' } }, 503); }
      if (url === `/api/deliveries/${deliveryId}`) { detailCount += 1; return response(detail('ready')); }
      throw new Error(`unexpected ${url} ${init?.method ?? ''}`);
    }));
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(deliveryId);
    renderWithRoute(<DeliveryConfirmPage />, [`/projects/${projectId}/deliveries/confirm?sessionId=${sessionId}`], '/projects/:projectId/deliveries/confirm');
    await screen.findByRole('heading', { name: '核对并生成交付产品' });
    fireEvent.click(screen.getByRole('button', { name: '生成交付产品' }));
    const confirmDialog = screen.getByRole('dialog', { name: '确认生成不可变交付产品' });
    const safeReturn = within(confirmDialog).getByRole('button', { name: '安全返回' });
    const confirmButton = within(confirmDialog).getByRole('button', { name: '确认生成' });
    await waitFor(() => expect(safeReturn).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(confirmButton).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(safeReturn).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(confirmButton).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '确认生成' }));
    expect(await screen.findByText('生成结果未知')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查询本次生成结果' }));
    await waitFor(() => expect(detailCount).toBe(1));
    expect(postCount).toBe(1);
  });

  it('产品库使用服务端查询并展示四种真实状态', async () => {
    const items = (['preparing', 'ready', 'generation_failed', 'recycled'] as const).map((status, index) => ({ ...product(status), id: `15d7670f-6a47-4498-ac53-3997cb04b2${20 + index}`, deliveryId: `15d7670f-6a47-4498-ac53-3997cb04b2${20 + index}` }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/api/deliveries?');
      expect(String(input)).toContain('limit=10');
      return response({ items, total: 4, limit: 10, offset: 0 });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderWithRoute(<DeliveryLibraryPage />, ['/deliveries'], '/deliveries');
    expect(await screen.findByRole('heading', { name: '交付产品库' })).toBeInTheDocument();
    expect(screen.getByText('生成中')).toBeInTheDocument();
    expect(screen.getByText('已就绪')).toBeInTheDocument();
    expect(screen.getByText('生成失败')).toBeInTheDocument();
    expect(screen.getByText('已回收')).toBeInTheDocument();
    const table = await screen.findByRole('table');
    expect(table.className).toContain('dataTable');
    expect(table.parentElement?.className).toContain('tableWrap');
    fireEvent.change(screen.getByLabelText(/搜索产品/), { target: { value: '竖屏' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('search=%E7%AB%96%E5%B1%8F');
  });

  it('详情页呈现三类只读文件、空画面字轨、来源事件并提交元数据', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === `/api/deliveries/${deliveryId}` && init?.method === 'PATCH') return response(detail('ready'));
      if (url === `/api/deliveries/${deliveryId}`) return response(detail('ready'));
      throw new Error(`unexpected ${url}`);
    }));
    renderWithRoute(<DeliveryDetailPage />, [`/deliveries/${deliveryId}`], '/deliveries/:deliveryId');
    expect(await screen.findByRole('heading', { name: '竖屏短剧项目 · 交付产品' })).toBeInTheDocument();
    expect(screen.getByText('台词字幕')).toBeInTheDocument();
    expect(screen.getByText('画面字字幕')).toBeInTheDocument();
    expect(screen.getByText('术语表')).toBeInTheDocument();
    expect(screen.getByText(/空轨 \/ 0 条/)).toBeInTheDocument();
    expect(screen.getByText('来源与版本')).toBeInTheDocument();
    expect(screen.getByText('验收会话')).toBeInTheDocument();
    expect(screen.queryByText(ids.acceptance)).not.toBeInTheDocument();
    expect(screen.getByText('已创建交付产品')).toBeInTheDocument();
    expect(screen.queryByText('Acceptance 来源')).not.toBeInTheDocument();
    expect(screen.queryByText('delivery.created')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: '更新后的交付说明' } });
    fireEvent.click(screen.getByRole('button', { name: '保存信息' }));
    await waitFor(() => expect(calls.some((call) => call.init?.method === 'PATCH')).toBe(true));
  });

  it('未知历史事件只显示通用员工文案，不泄露实现 kind', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(`/api/deliveries/${deliveryId}`);
      return response(detail('ready', 'future_internal_event_v2'));
    }));
    renderWithRoute(<DeliveryDetailPage />, [`/deliveries/${deliveryId}`], '/deliveries/:deliveryId');
    expect(await screen.findByText('交付状态已更新')).toBeInTheDocument();
    expect(screen.queryByText('future_internal_event_v2')).not.toBeInTheDocument();
  });

  it('ready 转场把成功标题置于焦点并提供可取消倒计时', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(`/api/deliveries/${deliveryId}`);
      return response(detail('ready'));
    }));
    renderWithRoute(<DeliveryDetailPage />, [`/deliveries/${deliveryId}?transition=success`], '/deliveries/:deliveryId');
    const successTitle = await screen.findByRole('heading', { name: '交付产品生成成功' });
    await waitFor(() => expect(document.activeElement).toBe(successTitle));
    expect(screen.getByText(/秒后自动进入详情/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '取消自动进入' }));
    expect(await screen.findByRole('heading', { name: '竖屏短剧项目 · 交付产品' })).toBeInTheDocument();
  });

  it('生成失败恢复复用同一 deliveryId，失败状态不伪造 ready 文件', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let detailReads = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === `/api/deliveries/${deliveryId}`) { detailReads += 1; return response(detail(detailReads === 1 ? 'generation_failed' : 'ready')); }
      if (url === `/api/projects/${projectId}/deliveries/${deliveryId}/recover`) return response({ product: detail('preparing'), replay: false });
      throw new Error(`unexpected ${url}`);
    }));
    renderWithRoute(<DeliveryDetailPage />, [`/deliveries/${deliveryId}`], '/deliveries/:deliveryId');
    expect(await screen.findByText('交付产品生成失败')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '恢复本次生成' })).toHaveFocus());
    expect(screen.queryByText('下载全部文件')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '恢复本次生成' }));
    await waitFor(() => expect(calls.some((call) => call.url === `/api/projects/${projectId}/deliveries/${deliveryId}/recover`)).toBe(true));
    const recoverCall = calls.find((call) => call.url.endsWith('/recover'));
    expect(recoverCall?.init?.headers).toMatchObject({ 'idempotency-key': expect.stringContaining('delivery-recover-') });
    expect(await screen.findByRole('heading', { name: '交付产品生成成功' }, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: '交付产品生成成功' })));
    expect(screen.getByText(/秒后自动进入详情/)).toBeInTheDocument();
    expect(calls.filter((call) => call.url.endsWith('/recover')).length).toBe(1);
  });

  it('恢复未知后查询到再次失败退出查询态，并可用同一 deliveryId 再次恢复', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let detailReads = 0;
    let recoverCalls = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === `/api/deliveries/${deliveryId}`) {
        detailReads += 1;
        return response(detail(detailReads === 1 || detailReads === 2 ? 'generation_failed' : 'ready'));
      }
      if (url === `/api/projects/${projectId}/deliveries/${deliveryId}/recover`) {
        recoverCalls += 1;
        if (recoverCalls === 1) return response({ error: { code: 'TIMEOUT', message: '恢复结果未知', retryable: true, requestId: 'req-recover-unknown' } }, 503);
        return response({ product: detail('preparing'), replay: false });
      }
      throw new Error(`unexpected ${url}`);
    }));
    renderWithRoute(<DeliveryDetailPage />, [`/deliveries/${deliveryId}`], '/deliveries/:deliveryId');
    expect(await screen.findByRole('button', { name: '恢复本次生成' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '恢复本次生成' }));
    const queryButton = await screen.findByRole('button', { name: '查询本次生成结果' });
    await waitFor(() => expect(queryButton).toHaveFocus());
    fireEvent.click(queryButton);
    const recoverAgain = await screen.findByRole('button', { name: '恢复本次生成' });
    await waitFor(() => expect(recoverAgain).toHaveFocus());
    expect(detailReads).toBe(2);
    fireEvent.click(recoverAgain);
    await waitFor(() => expect(recoverCalls).toBe(2));
    expect(calls.filter((call) => call.url.endsWith('/recover')).every((call) => call.url.includes(deliveryId))).toBe(true);
  });
});
