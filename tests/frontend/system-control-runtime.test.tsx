// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { SystemControlOperationDetail, SystemControlOperationListItem, SystemControlRuntimeOverview, SystemControlRuntimeResource } from '@qimao-terms-cloud/contracts';

import { ServersPage } from '../../system-frontend/src/serversPage.js';
import { LogsPage } from '../../system-frontend/src/logsPage.js';
import { ControlShell } from '../../system-frontend/src/ControlShell.js';

const resource: SystemControlRuntimeResource = {
  runtimeResourceId: 'worker:asr-primary', environment: 'development', kind: 'worker', displayName: 'ASR 主执行池', health: 'healthy', source: 'postgresql', observedAt: '2026-08-18T08:00:00.000Z', updatedAt: '2026-08-18T08:01:00.000Z',
  identity: { capability: 'asr', executionKind: 'cloud_api', provider: 'controlled-provider', adapterKey: 'cloud-adapter', model: 'server-model' },
  queueDepth: 2, runningCount: 1, completedCount: 8, failedCount: 1, reconciliationRequiredCount: 1,
  throughput: { window: '24h', windowStartAt: '2026-08-17T08:00:00.000Z', completedCount: 18, failedCount: 1, reconciliationRequiredCount: 1 },
  lease: { activeCount: 1, ownerPresentCount: 1, earliestExpiryAt: '2026-08-18T08:05:00.000Z' },
  telemetry: { status: 'not_configured', observedAt: null, reasonCode: 'provider_not_configured', cpuPercent: null, gpuPercent: null, memoryBytes: null, storageBytes: null, databaseConnections: null, processCount: null },
  configuration: { status: 'configured', version: 'routing-v2', routingVersionId: '11111111-1111-4111-8111-111111111111', deploymentVersionId: '22222222-2222-4222-8222-222222222222', acceptingNewTasks: true },
};

const runtimeOverview: SystemControlRuntimeOverview = {
  environment: 'development', databaseNow: '2026-08-18T08:02:00.000Z', dataFreshness: '2026-08-18T08:01:00.000Z', overallHealth: 'healthy', resources: [resource],
  totals: { queueDepth: 2, runningCount: 1, completedCount: 8, failedCount: 1, reconciliationRequiredCount: 1, activeLeaseCount: 1 },
};

const operation: SystemControlOperationListItem = {
  operationId: 'asr_attempt:33333333-3333-4333-8333-333333333333', environment: 'development', domain: 'asr', projectId: '44444444-4444-4444-8444-444444444444', taskId: '55555555-5555-4555-8555-555555555555', jobId: '66666666-6666-4666-8666-666666666666', attemptId: '33333333-3333-4333-8333-333333333333', requestId: 'request-asr-history-1', status: 'reconciliation_required', effectiveUpdatedAt: '2026-08-18T08:03:00.000Z', amountCny: null, reconciliationStatus: 'reconciliation_required', routeDigest: 'route-asr-v1', routingTargetId: '99999999-9999-4999-8999-999999999999', targetPriority: 1, deploymentVersionId: '22222222-2222-4222-8222-222222222222', effectClass: 'external_unknown',
};

const operationDetail: SystemControlOperationDetail = {
  ...operation, providerRequestId: 'provider-safe-id', engineDeploymentVersionId: '22222222-2222-4222-8222-222222222222', routingVersionId: '11111111-1111-4111-8111-111111111111', budgetPolicyVersionId: '77777777-7777-4777-8777-777777777777', conversionSnapshotId: '88888888-8888-4888-8888-888888888888', startedAt: '2026-08-18T08:00:00.000Z', completedAt: '2026-08-18T08:03:00.000Z', durationMs: 180_000,
  attemptChain: [
    { attemptId: '33333333-3333-4333-8333-333333333333', attemptNumber: 1, status: 'failed', requestId: 'request-asr-1', routeDigest: 'route-asr-v1', routingTargetId: '99999999-9999-4999-8999-999999999999', targetPriority: 1, deploymentVersionId: '22222222-2222-4222-8222-222222222222', effectClass: 'external_not_accepted', providerRequestId: 'provider-asr-1', externalNotAccepted: true, externalSideEffectPossible: false, errorCode: 'ASR_NOT_ACCEPTED', createdAt: '2026-08-18T08:00:00.000Z', startedAt: '2026-08-18T08:00:00.000Z', completedAt: '2026-08-18T08:01:00.000Z' },
    { attemptId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', attemptNumber: 2, status: 'unknown', requestId: 'request-asr-2', routeDigest: 'route-asr-v1', routingTargetId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', targetPriority: 2, deploymentVersionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', effectClass: 'external_unknown', providerRequestId: 'provider-asr-2', externalNotAccepted: false, externalSideEffectPossible: true, errorCode: 'ASR_UNKNOWN', createdAt: '2026-08-18T08:02:00.000Z', startedAt: '2026-08-18T08:02:00.000Z', completedAt: null },
  ],
  routingAdvanceEvents: [{ eventId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', jobId: '66666666-6666-4666-8666-666666666666', fromAttemptId: '33333333-3333-4333-8333-333333333333', toAttemptId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fromTargetId: '99999999-9999-4999-8999-999999999999', toTargetId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', fromTargetPriority: 1, toTargetPriority: 2, reasonCode: 'external_not_accepted', providerRequestId: 'provider-asr-1', requestId: 'request-asr-1', externalNotAccepted: true, externalSideEffectPossible: false, createdAt: '2026-08-18T08:01:00.000Z' }],
  qualitySummary: { status: 'partial', cueCount: 42, candidateCount: null, processingDurationMs: 177_000 }, originalCurrency: 'USD', originalAmount: '0.25', error: { code: 'ASR_RESULT_UNKNOWN', reason: '供应商结果尚未确认；诊断细节已脱敏。', retryable: false, reconciliationRequired: true },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('SYSTEM-06 runtime and operations pages', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('renders only server resources, keeps missing telemetry unknown and deep-links to the existing owners', async () => {
    const navigate = vi.fn();
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      const path = String(input);
      if (path.includes('/runtime/overview')) return json(runtimeOverview);
      if (path.includes('/runtime/resources/worker%3Aasr-primary')) return json(resource);
      return json({ items: [resource], total: 1, limit: 20, offset: 0, databaseNow: runtimeOverview.databaseNow, dataFreshness: runtimeOverview.dataFreshness });
    });
    render(<ServersPage onNavigate={navigate} />);
    await waitFor(() => expect(screen.getByText('ASR 主执行池')).toBeInTheDocument());
    expect(screen.getByText('未配置')).toBeInTheDocument();
    expect(screen.queryByText(/62%|GPU 0/)).not.toBeInTheDocument();
    const detailTrigger = screen.getByRole('button', { name: '查看详情' });
    detailTrigger.focus();
    fireEvent.click(detailTrigger);
    const drawer = await screen.findByRole('dialog', { name: 'ASR 主执行池' });
    expect(within(drawer).getByRole('heading', { name: 'ASR 主执行池' })).toHaveFocus();
    fireEvent.keyDown(drawer, { key: 'Tab', shiftKey: true });
    expect(within(drawer).getByRole('button', { name: '查看路由版本' })).toHaveFocus();
    expect(within(drawer).getAllByText('未知')).toHaveLength(6);
    fireEvent.click(within(drawer).getByRole('button', { name: '查看关联执行记录' }));
    expect(navigate).toHaveBeenCalledWith('logs');
    expect(request.mock.calls.some((call) => String(call[0]).includes('/runtime/resources/worker%3Aasr-primary'))).toBe(true);
    fireEvent.keyDown(drawer, { key: 'Escape' });
    expect(detailTrigger).toHaveFocus();
  });

  it('does not let a late resource response overwrite a newer server query identity', async () => {
    let resolveFirst: (value: Response) => void = () => undefined;
    const firstList = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const newer = { ...resource, runtimeResourceId: 'worker:newer', displayName: '新查询资源' };
    vi.mocked(fetch).mockImplementation(async (input) => {
      const path = String(input);
      if (path.includes('/runtime/overview')) return json(runtimeOverview);
      if (path.includes('search=%E6%96%B0')) return json({ items: [newer], total: 1, limit: 20, offset: 0, databaseNow: runtimeOverview.databaseNow, dataFreshness: runtimeOverview.dataFreshness });
      return firstList;
    });
    render(<ServersPage onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: '搜索运行资源' }), { target: { value: '新' } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(screen.getByText('新查询资源')).toBeInTheDocument());
    resolveFirst(json({ items: [resource], total: 1, limit: 20, offset: 0, databaseNow: runtimeOverview.databaseNow, dataFreshness: runtimeOverview.dataFreshness }));
    await Promise.resolve();
    expect(screen.getByText('新查询资源')).toBeInTheDocument();
    expect(screen.queryByText('ASR 主执行池')).not.toBeInTheDocument();
  });

  it('retains stale resources on failure, exposes requestId and focuses the recovered title', async () => {
    const list = { items: [resource], total: 1, limit: 20, offset: 0, databaseNow: runtimeOverview.databaseNow, dataFreshness: runtimeOverview.dataFreshness };
    let overviewCalls = 0;
    let listCalls = 0;
    vi.mocked(fetch).mockImplementation(async (input) => {
      const path = String(input);
      if (path.includes('/runtime/overview')) {
        overviewCalls += 1;
        if (overviewCalls === 2) return json({ error: { message: '运行摘要暂时不可用', requestId: 'runtime-overview-503', retryable: true } }, 503);
        return json(runtimeOverview);
      }
      if (path.includes('/runtime/resources?')) {
        listCalls += 1;
        if (listCalls === 2) return json({ error: { message: '运行资源暂时不可用', requestId: 'runtime-read-503', retryable: true } }, 503);
        return json(list);
      }
      return json(resource);
    });
    render(<ServersPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('ASR 主执行池')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '立即刷新' }));
    await waitFor(() => expect(screen.getByText(/runtime-read-503/)).toBeInTheDocument());
    expect(screen.getByText('ASR 主执行池')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '重新读取' })).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '服务器与运行环境' })).toHaveFocus());
  });

  it('renders a historical Attempt with CNY/reconciliation semantics and a redacted detail drawer', async () => {
    const navigate = vi.fn();
    const request = vi.mocked(fetch).mockImplementation(async (input) => String(input).includes('/operations/asr_attempt%3A') ? json(operationDetail) : json({ items: [operation], total: 1, limit: 20, offset: 0, databaseNow: '2026-08-18T08:04:00.000Z', dataFreshness: '2026-08-18T08:03:00.000Z' }));
    render(<LogsPage onNavigate={navigate} />);
    await waitFor(() => expect(within(screen.getByRole('table')).getByText('中文语音识别')).toBeInTheDocument());
    expect(screen.getAllByText('待对账').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    const drawer = await screen.findByRole('dialog', { name: '中文语音识别执行详情' });
    expect(within(drawer).getByText('有序执行链')).toBeInTheDocument();
    expect(within(drawer).getByTestId('attempt-1')).toHaveTextContent('已证明未受理');
    expect(within(drawer).getByText(/明确未受理，已进入下一目标/)).toBeInTheDocument();
    expect(within(drawer).getByTestId('attempt-2')).toHaveTextContent('结果未知');
    expect(within(drawer).getByText('人工处理出口')).toBeInTheDocument();
    expect(drawer).not.toHaveTextContent('ASR_RESULT_UNKNOWN');
    expect(within(drawer).getByText(/0.25 USD/)).toBeInTheDocument();
    expect(drawer).not.toHaveTextContent(/objectKey|password|SELECT \*/i);
    fireEvent.click(within(drawer).getByRole('button', { name: '查看路由版本' }));
    expect(navigate).toHaveBeenCalledWith('routing');
    expect(request.mock.calls.some((call) => String(call[0]).includes('asr_attempt%3A'))).toBe(true);
  });

  it('keeps a ScreenText unknown attempt as a stopping result and does not imply failover', async () => {
    const screenOperation: SystemControlOperationListItem = { ...operation, operationId: 'screen_text_attempt:eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', domain: 'screen_text', effectClass: 'external_unknown' };
    const screenDetail: SystemControlOperationDetail = { ...operationDetail, ...screenOperation, providerRequestId: 'provider-screen-text', attemptChain: [{ ...operationDetail.attemptChain[0]!, attemptId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', effectClass: 'external_unknown', externalNotAccepted: false, externalSideEffectPossible: true, requestId: 'request-screen-text', providerRequestId: 'provider-screen-text' }], routingAdvanceEvents: [] };
    const request = vi.mocked(fetch).mockImplementation(async (input) => String(input).includes('/operations/screen_text_attempt%3A') ? json(screenDetail) : json({ items: [screenOperation], total: 1, limit: 20, offset: 0, databaseNow: '2026-08-18T08:04:00.000Z', dataFreshness: '2026-08-18T08:03:00.000Z' }));
    render(<LogsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('画面字识别')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    const drawer = await screen.findByRole('dialog', { name: '画面字识别执行详情' });
    expect(within(drawer).getByTestId('attempt-1')).toHaveTextContent('结果未知');
    expect(within(drawer).queryByText(/已进入下一目标/)).not.toBeInTheDocument();
    expect(request.mock.calls.some((call) => String(call[0]).includes('screen_text_attempt%3A'))).toBe(true);
  });

  it('states connection-test unknown without claiming it was unaccepted', async () => {
    const connectionOperation: SystemControlOperationListItem = { ...operation, operationId: 'system_control_attempt:ffffffff-ffff-4fff-8fff-ffffffffffff', domain: 'system_control', status: 'unknown', effectClass: 'external_unknown', reconciliationStatus: 'unknown' };
    const connectionDetail: SystemControlOperationDetail = { ...operationDetail, ...connectionOperation, attemptChain: [], routingAdvanceEvents: [], error: null };
    vi.mocked(fetch).mockImplementation(async (input) => String(input).includes('/operations/system_control_attempt%3A') ? json(connectionDetail) : json({ items: [connectionOperation], total: 1, limit: 20, offset: 0, databaseNow: '2026-08-18T08:04:00.000Z', dataFreshness: '2026-08-18T08:03:00.000Z' }));
    render(<LogsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('系统控制')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    const drawer = await screen.findByRole('dialog', { name: '系统控制执行详情' });
    expect(within(drawer).getByText('连接测试结果未知')).toBeInTheDocument();
    expect(within(drawer).getByText(/可能已产生外部副作用/)).toBeInTheDocument();
    expect(drawer).not.toHaveTextContent('明确未受理');
  });

  it('passes server filters and pagination without replacing the authoritative total', async () => {
    const requests: string[] = [];
    vi.mocked(fetch).mockImplementation(async (input) => {
      requests.push(String(input));
      return json({ items: [operation], total: 21, limit: 20, offset: String(input).includes('offset=20') ? 20 : 0, databaseNow: '2026-08-18T08:04:00.000Z', dataFreshness: '2026-08-18T08:03:00.000Z' });
    });
    render(<LogsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('服务端总记录')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('combobox', { name: '执行领域' }), { target: { value: 'asr' } });
    fireEvent.change(screen.getByRole('textbox', { name: '项目 ID' }), { target: { value: operation.projectId } });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(requests.some((url) => url.includes('domain=asr') && url.includes('projectId=44444444-4444-4444-8444-444444444444') && url.includes('to='))).toBe(true));
    expect(screen.getByText('21')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() => expect(requests.some((url) => url.includes('offset=20'))).toBe(true));
  });

  it('retains stale operations and offers one retry that restores the page title focus', async () => {
    let calls = 0;
    vi.mocked(fetch).mockImplementation(async () => {
      calls += 1;
      if (calls === 2) return json({ error: { message: '执行记录暂时不可用', requestId: 'logs-stale-503', retryable: true } }, 503);
      return json({ items: [operation], total: 1, limit: 20, offset: 0, databaseNow: '2026-08-18T08:04:00.000Z', dataFreshness: '2026-08-18T08:03:00.000Z' });
    });
    render(<LogsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('中文语音识别')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '立即刷新' }));
    await waitFor(() => expect(screen.getByText(/logs-stale-503/)).toBeInTheDocument());
    expect(within(screen.getByRole('table')).getByText('中文语音识别')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '重新读取' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '日志与质量' })).toHaveFocus());
  });

  it('keeps the only operation retry after repeated failure and focuses the title after recovery', async () => {
    let calls = 0;
    const request = vi.mocked(fetch).mockImplementation(async () => {
      calls += 1;
      if (calls <= 2) return json({ error: { message: calls === 1 ? '执行记录不可用' : '执行记录仍不可用', requestId: `ops-${calls}`, retryable: true } }, 503);
      return json({ items: [], total: 0, limit: 20, offset: 0, databaseNow: '2026-08-18T08:04:00.000Z', dataFreshness: '2026-08-18T08:03:00.000Z' });
    });
    render(<LogsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/ops-1/)).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: '重新读取' })).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByText(/ops-2/)).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: '重新读取' })).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '日志与质量' })).toHaveFocus());
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('does not focus the title before the same-query recovery request really resolves', async () => {
    let calls = 0;
    let resolveRecovery: (value: Response) => void = () => undefined;
    const pendingRecovery = new Promise<Response>((resolve) => { resolveRecovery = resolve; });
    const list = { items: [operation], total: 1, limit: 20, offset: 0, databaseNow: '2026-08-18T08:04:00.000Z', dataFreshness: '2026-08-18T08:03:00.000Z' };
    const request = vi.mocked(fetch).mockImplementation(async () => {
      calls += 1;
      if (calls === 2 || calls === 3) return json({ error: { message: `执行记录错误 ${calls}`, requestId: `logs-recovery-${calls}`, retryable: true } }, 503);
      if (calls === 4) return pendingRecovery;
      return json(list);
    });
    render(<LogsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('中文语音识别')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '立即刷新' }));
    await waitFor(() => expect(screen.getByText(/logs-recovery-2/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByText(/logs-recovery-3/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    expect(screen.getByRole('heading', { name: '日志与质量' })).not.toHaveFocus();
    expect(screen.getByRole('button', { name: '立即刷新' })).toBeDisabled();
    expect(screen.getByText(/logs-recovery-3/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '读取中…' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveFocus();
    resolveRecovery(json(list));
    await waitFor(() => expect(screen.getByRole('heading', { name: '日志与质量' })).toHaveFocus());
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('uses one shell refresh owner and stops page polling when automatic refresh is off', async () => {
    vi.useFakeTimers();
    const list = { items: [resource], total: 1, limit: 20, offset: 0, databaseNow: runtimeOverview.databaseNow, dataFreshness: runtimeOverview.dataFreshness };
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      const path = String(input);
      if (path.includes('/runtime/overview')) return json(runtimeOverview);
      if (path.includes('/runtime/resources?')) return json(list);
      return json({ overallStatus: 'healthy', anomalies: [], pendingConfiguration: { items: [] } });
    });
    render(<ControlShell activeNav="servers"><ServersPage onNavigate={vi.fn()} /></ControlShell>);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByText('ASR 主执行池')).toBeInTheDocument();
    const initialCalls = request.mock.calls.length;
    fireEvent.click(screen.getByRole('switch', { name: '自动刷新' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(request).toHaveBeenCalledTimes(initialCalls);
    expect(screen.getAllByText('自动刷新已关闭').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: '立即刷新' })[0]!);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(request.mock.calls.length).toBeGreaterThan(initialCalls);
    expect(request.mock.calls.some((call) => String(call[0]).includes('/runtime/resources?'))).toBe(true);
    vi.useRealTimers();
  });

  it('展示上传与术语领域的真实状态，按领域/状态筛选，并在详情中不虚构费用路由或 Attempt', async () => {
    const uploadSessionId = '12121212-1212-4121-8121-121212121212';
    const termsRunId = '13131313-1313-4131-8131-131313131313';
    const uploadOperation: SystemControlOperationListItem = {
      ...operation,
      operationId: `upload:${uploadSessionId}`,
      domain: 'upload',
      taskId: uploadSessionId,
      jobId: null,
      attemptId: null,
      requestId: 'upload-request-1',
      status: 'uploading',
      amountCny: null,
      reconciliationStatus: 'pending',
      routeDigest: null,
      routingTargetId: null,
      targetPriority: null,
      deploymentVersionId: null,
      effectClass: null,
    };
    const termsOperation: SystemControlOperationListItem = {
      ...operation,
      operationId: `terms:${termsRunId}`,
      domain: 'terms',
      taskId: termsRunId,
      jobId: null,
      attemptId: null,
      requestId: 'terms-request-1',
      status: 'completed',
      amountCny: null,
      reconciliationStatus: 'final',
      routeDigest: null,
      routingTargetId: null,
      targetPriority: null,
      deploymentVersionId: null,
      effectClass: 'completed',
    };
    const uploadDetail: SystemControlOperationDetail = {
      ...uploadOperation,
      providerRequestId: null,
      engineDeploymentVersionId: null,
      routingVersionId: null,
      budgetPolicyVersionId: null,
      conversionSnapshotId: null,
      startedAt: '2026-08-18T08:00:00.000Z',
      completedAt: null,
      durationMs: null,
      qualitySummary: null,
      originalCurrency: null,
      originalAmount: null,
      error: null,
      attemptChain: [],
      routingAdvanceEvents: [],
    };
    const termsDetail: SystemControlOperationDetail = {
      ...termsOperation,
      providerRequestId: null,
      engineDeploymentVersionId: null,
      routingVersionId: null,
      budgetPolicyVersionId: null,
      conversionSnapshotId: null,
      startedAt: '2026-08-18T08:00:00.000Z',
      completedAt: '2026-08-18T08:03:00.000Z',
      durationMs: 180_000,
      qualitySummary: { status: 'completed', cueCount: null, candidateCount: 12, processingDurationMs: null },
      originalCurrency: null,
      originalAmount: null,
      error: null,
      attemptChain: [],
      routingAdvanceEvents: [],
    };
    const requests: string[] = [];
    vi.mocked(fetch).mockImplementation(async (input) => {
      const path = String(input);
      requests.push(path);
      if (path.includes(`/operations/upload%3A${uploadSessionId}`)) return json(uploadDetail);
      if (path.includes(`/operations/terms%3A${termsRunId}`)) return json(termsDetail);
      const items = path.includes('domain=upload') ? [uploadOperation] : path.includes('domain=terms') ? [termsOperation] : [uploadOperation, termsOperation];
      return json({ items, total: items.length, limit: 20, offset: 0, databaseNow: '2026-08-18T08:04:00.000Z', dataFreshness: '2026-08-18T08:03:00.000Z' });
    });
    render(<LogsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('文件上传')).toBeInTheDocument());
    expect(within(screen.getByRole('table')).getByText('上传中')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('术语提取')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('已完成')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: '执行领域' }), { target: { value: 'upload' } });
    await waitFor(() => expect(requests.some((url) => url.includes('domain=upload'))).toBe(true));
    fireEvent.change(screen.getByRole('combobox', { name: '执行状态' }), { target: { value: 'uploading' } });
    await waitFor(() => expect(requests.some((url) => url.includes('domain=upload') && url.includes('status=uploading'))).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    const drawer = await screen.findByRole('dialog', { name: '文件上传执行详情' });
    expect(within(drawer).getByText('上传会话')).toBeInTheDocument();
    expect(within(drawer).getByText('完成任务')).toBeInTheDocument();
    expect(within(drawer).queryByText('人民币金额')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('结算状态')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('有序执行链')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('路由版本')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('任务 / Job / Attempt')).not.toBeInTheDocument();
  });
});
