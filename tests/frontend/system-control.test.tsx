// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { SystemControlOverview, SystemControlResourcePool } from '@qimao-terms-cloud/contracts';

import { ControlShell } from '../../system-frontend/src/ControlShell.js';

const pool = (id: SystemControlResourcePool['id'], status: SystemControlResourcePool['status'] = 'healthy'): SystemControlResourcePool => ({
  id,
  status,
  queueDepth: 2,
  runningCount: 1,
  completedCount: 4,
  failedCount: status === 'failed' ? 1 : 0,
  reconciliationRequiredCount: 0,
  throughput: 3,
  errorCount: status === 'failed' ? 1 : 0,
  identities: [],
  cost: { byCurrency: [], pendingCount: 0, unknownCount: 0 },
  telemetry: { status: 'unknown', cpuPercent: null, gpuPercent: null, memoryBytes: null, storageBytes: null },
  configuration: { status: 'not_configured', version: null, acceptingNewTasks: null },
  lastObservedAt: '2026-08-16T08:00:00.000Z',
});

const overview = (status: SystemControlOverview['overallStatus'] = 'healthy'): SystemControlOverview => ({
  environment: 'development',
  window: '24h',
  generatedAt: '2026-08-16T08:00:00.000Z',
  freshness: { status: status === 'empty' ? 'empty' : 'fresh', observedAt: '2026-08-16T08:00:00.000Z', windowStart: '2026-08-15T08:00:00.000Z', windowEnd: '2026-08-16T08:00:00.000Z', timezone: 'UTC' },
  overallStatus: status,
  resourcePools: [pool('asr_api', status), pool('ocr_api', status), pool('ocr_self_hosted_worker', status), pool('delivery_generation', status)],
  metrics: { processedProjectCount: 1, processedEpisodeCount: 4, runningCount: 1, queuedCount: 2, failedCount: status === 'failed' ? 1 : 0, reconciliationRequiredCount: 0, cost: { byCurrency: [], pendingCount: 0, unknownCount: 0 }, storage: { status: 'unknown', assetBytes: 1024, objectStorageBytes: null, capacityBytes: null }, budget: { status: 'not_configured', byCurrency: [] } },
  trends: { bucket: 'hour', throughput: [], queueDepth: [], cost: [] },
  anomalies: [],
  pendingConfiguration: { status: 'not_configured', items: [] },
  recentAudit: { status: 'not_configured', items: [] },
});

const jsonResponse = (body: unknown, ok = true) => new Response(JSON.stringify(body), { status: ok ? 200 : 503, headers: { 'Content-Type': 'application/json' } });

describe('system ControlShell overview', () => {
  const originalMatchMedia = window.matchMedia;
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => {
    cleanup();
    if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
    else delete (window as Window & { matchMedia?: typeof window.matchMedia }).matchMedia;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const setViewport = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  };

  it('only reads the same-origin overview API and exposes the independent ten-entry shell', async () => {
    const request = vi.mocked(fetch).mockResolvedValue(jsonResponse(overview()));
    render(<ControlShell />);
    expect(screen.getByText('最近 24 小时处理量')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: '系统总览' })).toBeInTheDocument());
    expect(request).toHaveBeenCalledWith('/api/system-control/overview?environment=development&window=24h', expect.objectContaining({ method: 'GET', headers: { Accept: 'application/json' } }));
    expect(request.mock.calls[0]?.[1]).not.toEqual(expect.objectContaining({ headers: expect.objectContaining({ 'x-system-control-test-identity': expect.anything() }) }));
    const navigation = screen.getByRole('navigation');
    expect(within(navigation).getAllByRole('button')).toHaveLength(10);
    expect(within(navigation).getAllByRole('button').filter((button) => button.hasAttribute('disabled'))).toHaveLength(0);
    expect(within(navigation).getByRole('button', { name: '服务器与运行环境' })).toBeEnabled();
    expect(within(navigation).getByRole('button', { name: '日志与质量' })).toBeEnabled();
    expect(within(navigation).getByRole('button', { name: '策略与学习' })).toBeEnabled();
    expect(within(navigation).getByRole('button', { name: '密钥与安全' })).toBeEnabled();
    expect(within(navigation).getByRole('button', { name: '反馈问题' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '系统总览' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('status', { name: '系统状态' })).toHaveTextContent('系统运行正常');
    expect(screen.getByRole('status', { name: '系统状态' })).toHaveTextContent('无需处理');
    expect(screen.queryByText('系统运行带')).not.toBeInTheDocument();
  });

  it('keeps loading geometry and then renders unknown/not-configured facts without invented values', async () => {
    let resolve: (response: Response) => void = () => undefined;
    const pending = new Promise<Response>((next) => { resolve = next; });
    vi.mocked(fetch).mockReturnValue(pending);
    render(<ControlShell />);
    expect(screen.getByText('读取服务端摘要…')).toBeInTheDocument();
    resolve(jsonResponse(overview('empty')));
    await waitFor(() => expect(screen.getByRole('heading', { name: '系统总览' })).toBeInTheDocument());
    expect(screen.getByRole('status', { name: '系统状态' })).toHaveTextContent('当前没有处理任务');
    expect(screen.getByRole('region', { name: '最近 24 小时处理量' })).toHaveTextContent('最近 24 小时处理 1 个项目 / 4 集');
  });

  it('keeps the initial error actionable with one retry, then focuses the recovered overview heading', async () => {
    const request = vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: { message: '监控摘要服务暂时不可用。', requestId: 'ctrl-test-123', retryable: true } }, false))
      .mockResolvedValueOnce(jsonResponse(overview()));
    render(<ControlShell />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText(/ctrl-test-123/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '重新读取' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '系统总览' })).toHaveFocus());
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('retains the last success as stale after a refresh failure and supports closing automatic refresh', async () => {
    const request = vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(overview())).mockRejectedValueOnce(Object.assign(new Error('网络暂时不可用'), { requestId: 'ctrl-stale-456', retryable: true }));
    render(<ControlShell />);
    await waitFor(() => expect(screen.getByRole('heading', { name: '系统总览' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '立即刷新' }));
    await waitFor(() => expect(screen.getByText('数据已过期')).toBeInTheDocument());
    expect(screen.getByRole('status', { name: '系统状态' })).toHaveTextContent('状态暂时无法确认');
    expect(screen.getAllByRole('button', { name: '重新读取' })).toHaveLength(1);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps the 1024 main column explicit and keeps the four-question summary usable without another GET', async () => {
    setViewport(true);
    const request = vi.mocked(fetch).mockResolvedValue(jsonResponse(overview()));
    render(<ControlShell />);
    await waitFor(() => expect(screen.getByRole('heading', { name: '系统总览' })).toBeInTheDocument());

    expect(screen.getByTestId('main-content')).toHaveAttribute('data-grid-column', '2');
    expect(screen.getByRole('status', { name: '系统状态' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '最近 24 小时处理量' })).toBeInTheDocument();
    expect(screen.queryByTestId('trend-panel')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('lets the 1024 overlay sidebar own Escape and returns focus from BODY to its trigger', async () => {
    setViewport(true);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(overview()));
    render(<ControlShell />);
    await waitFor(() => expect(screen.getByRole('heading', { name: '系统总览' })).toBeInTheDocument());
    const openTrigger = screen.getByRole('button', { name: '展开侧栏' });
    openTrigger.focus();
    fireEvent.click(openTrigger);
    const closeTrigger = screen.getByRole('button', { name: '收起侧栏' });
    expect(closeTrigger).toHaveAttribute('aria-expanded', 'true');
    const overlay = screen.getByTestId('sidebar-overlay');
    expect(overlay).toBeInTheDocument();
    document.body.focus();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByRole('button', { name: '展开侧栏' })).toHaveFocus();

    openTrigger.focus();
    fireEvent.click(openTrigger);
    const secondOverlay = screen.getByTestId('sidebar-overlay');
    fireEvent.mouseDown(secondOverlay);
    fireEvent.mouseUp(secondOverlay);
    fireEvent.click(secondOverlay);
    expect(screen.queryByTestId('sidebar-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '展开侧栏' })).toHaveFocus();
  });

  it('keeps the desktop first screen focused on status, throughput and current causes', async () => {
    setViewport(false);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(overview()));
    render(<ControlShell />);
    await waitFor(() => expect(screen.getByRole('heading', { name: '系统总览' })).toBeInTheDocument());

    expect(screen.getByRole('status', { name: '系统状态' })).toBeInTheDocument();
    expect(screen.getByText('最近 24 小时处理量')).toBeInTheDocument();
    expect(screen.getByText('当前需要处理的原因')).toBeInTheDocument();
    expect(screen.queryByTestId('trend-panel')).not.toBeInTheDocument();
  });

  it.each([
    ['degraded', '有事项需要处理', '处理当前问题', '日志与质量'],
    ['failed', '当前处理受阻', '处理当前问题', '日志与质量'],
    ['not_configured', '关键能力尚未接入', '查看接入详情', '服务器与运行环境'],
  ] as const)('maps %s to one status and one next action', async (status, title, action, destination) => {
    const navigate = vi.fn();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(overview(status)));
    render(<ControlShell onNavigate={navigate} />);
    await waitFor(() => expect(screen.getByRole('status', { name: '系统状态' })).toHaveTextContent(title));
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(navigate).toHaveBeenCalledWith(destination === '日志与质量' ? 'logs' : 'engines');
  });

  it('maps unknown freshness to a safe reload action and never renders stale counts', async () => {
    const navigate = vi.fn();
    const data = overview('healthy');
    data.freshness = { ...data.freshness, status: 'unknown' };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(data));
    render(<ControlShell onNavigate={navigate} />);
    await waitFor(() => expect(screen.getByRole('status', { name: '系统状态' })).toHaveTextContent('状态暂时无法确认'));
    expect(screen.getByRole('region', { name: '最近 24 小时处理量' })).toHaveTextContent('未知');
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows at most three business-level anomaly reasons without technical identifiers', async () => {
    const data = overview('degraded');
    data.anomalies = [
      { id: 'a1', resourcePool: 'asr_api', severity: 'warning', kind: 'lease_expired', projectId: null, jobId: null, attemptId: null, occurredAt: '2026-08-16T08:00:00.000Z', reasonCode: 'secret_reason', message: 'secret-message', requestId: 'secret-request' },
      { id: 'a2', resourcePool: 'ocr_api', severity: 'error', kind: 'failed', projectId: null, jobId: null, attemptId: null, occurredAt: '2026-08-16T07:00:00.000Z', reasonCode: 'other_reason', message: 'other-message', requestId: null },
      { id: 'a3', resourcePool: 'delivery_generation', severity: 'warning', kind: 'reconciliation_required', projectId: null, jobId: null, attemptId: null, occurredAt: '2026-08-16T06:00:00.000Z', reasonCode: 'third_reason', message: 'third-message', requestId: null },
      { id: 'a4', resourcePool: 'asr_api', severity: 'warning', kind: 'failed', projectId: null, jobId: null, attemptId: null, occurredAt: '2026-08-16T05:00:00.000Z', reasonCode: 'fourth_reason', message: 'fourth-message', requestId: null },
    ];
    vi.mocked(fetch).mockResolvedValue(jsonResponse(data));
    render(<ControlShell />);
    await waitFor(() => expect(screen.getByRole('heading', { name: '系统总览' })).toBeInTheDocument());
    const reasons = screen.getByRole('region', { name: '当前需要管理员处理的原因' });
    expect(within(reasons).getAllByRole('listitem')).toHaveLength(3);
    expect(within(reasons).getByText('当前任务处理失败')).toBeInTheDocument();
    expect(within(reasons).getByText('处理结果需要确认')).toBeInTheDocument();
    expect(within(reasons).getByText('当前任务等待恢复')).toBeInTheDocument();
    expect(reasons).not.toHaveTextContent('secret_reason');
    expect(reasons).not.toHaveTextContent('secret-request');
    expect(reasons).not.toHaveTextContent('asr_api');
  });
});
