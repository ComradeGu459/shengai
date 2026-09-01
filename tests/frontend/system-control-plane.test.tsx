// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EnginesPage } from '../../system-frontend/src/enginesPage.js';
import { RoutingPage } from '../../system-frontend/src/routingPage.js';
import { ChangesPage } from '../../system-frontend/src/changesPage.js';
import { BudgetsPage } from '../../system-frontend/src/budgetsPage.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const deployment = { deploymentId: '11111111-1111-4111-8111-111111111111', capability: 'asr', executionKind: 'cloud_api', displayName: '服务端 ASR', provider: 'controlled', adapterKey: 'deterministic_fake', status: 'enabled', latestVersion: 1, createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z' };
const version = { versionId: '22222222-2222-4222-8222-222222222222', deploymentId: deployment.deploymentId, version: 1, model: 'server-derived', language: 'zh-CN', endpointReference: null, regionHint: null, capabilitiesSnapshot: { capability: 'asr', executionKind: 'cloud_api', provider: 'controlled', adapterKey: 'deterministic_fake', model: 'server-derived', language: 'zh-CN', descriptorDigest: 'a'.repeat(64), capabilities: {} }, secretReference: { present: false, referenceDigest: null, redactedLabel: null }, configDigest: 'b'.repeat(64), createdAt: '2026-08-16T00:00:00.000Z' };
const policy = (status: string) => ({ routingVersionId: '33333333-3333-4333-8333-333333333333', environment: 'development', workflowStage: 'asr', version: 1, status, pools: [{ poolId: 'asr_api', targets: [{ routingTargetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', deploymentVersionId: version.versionId, priority: 1, role: 'preferred', maxConcurrentJobs: 1, perProjectMax: 1, queueLimit: 0 }] }, { poolId: 'ocr_api', targets: [] }, { poolId: 'ocr_self_hosted_worker', targets: [] }], impact: status === 'impact_checked' ? { affectedWorkflowStages: ['asr'], activeTaskCount: 2, reconciliationRequiredTaskCount: 0, failingConnectionTestCount: 0, capacityDifferences: [], hardBlocks: [] } : null, createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z' });
const termsDeployment = { deploymentId: '12121212-1212-4121-8121-121212121212', capability: 'terms', executionKind: 'cloud_api', displayName: 'DeepSeek 术语提取', provider: 'deepseek', adapterKey: 'terms_api', status: 'enabled', latestVersion: 1, createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z' };
const termsVersion = { versionId: '23232323-2323-4232-8232-232323232323', deploymentId: termsDeployment.deploymentId, version: 1, model: 'deepseek-v4-flash', language: 'zh-CN', endpointReference: null, regionHint: null, capabilitiesSnapshot: { capability: 'terms', executionKind: 'cloud_api', provider: 'deepseek', adapterKey: 'terms_api', model: 'deepseek-v4-flash', language: 'zh-CN', descriptorDigest: 'c'.repeat(64), capabilities: { preset: 'deepseek-v4-flash', categoryOrder: ['人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件'] } }, secretReference: { present: true, secretReferenceId: '34343434-3434-4343-8343-343434343434', secretReferenceVersionId: '45454545-4545-4454-8454-454545454545', referenceDigest: 'd'.repeat(64), redactedLabel: 'DeepSeek 主密钥', status: 'available' }, runtimeConfig: { preset: 'deepseek-v4-flash', endpoint: 'https://api.deepseek.com/chat/completions', prompt: '提取影视术语并只返回 JSON。', categoryOrder: ['人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件'] }, configDigest: 'e'.repeat(64), billingSnapshot: null, createdAt: '2026-08-16T00:00:00.000Z' };
const screenTextDeployment = { deploymentId: '13131313-1313-4131-8131-131313131313', capability: 'screen_text', executionKind: 'self_hosted_worker', displayName: 'OpenVINO OCR', provider: 'openvino', adapterKey: 'screen_text_openvino_ppocrv6_small', status: 'enabled', latestVersion: 1, createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z' };
const screenTextVersion = { versionId: '24242424-2424-4242-8242-242424242424', deploymentId: screenTextDeployment.deploymentId, version: 1, model: 'pp-ocrv6-small', language: 'multi', endpointReference: null, regionHint: null, capabilitiesSnapshot: { capability: 'screen_text', executionKind: 'self_hosted_worker', provider: 'openvino', adapterKey: 'screen_text_openvino_ppocrv6_small', model: 'pp-ocrv6-small', language: 'multi', descriptorDigest: 'f'.repeat(64), capabilities: {} }, secretReference: { present: false, referenceDigest: null, redactedLabel: null }, runtimeConfig: { preset: 'screen_text_openvino_ppocrv6_small', frameIntervalMs: 1000, maxFramesPerEpisode: 600 }, configDigest: 'g'.repeat(64), billingSnapshot: null, createdAt: '2026-08-16T00:00:00.000Z' };
const termsPolicy = (status: string) => ({ routingVersionId: '56565656-5656-4565-8565-565656565656', environment: 'development', workflowStage: 'terms', version: 1, status, pools: [{ poolId: 'terms_api', targets: [{ routingTargetId: '67676767-6767-4676-8676-676767676767', deploymentVersionId: termsVersion.versionId, priority: 1, role: 'preferred', maxConcurrentJobs: 1, perProjectMax: 1, queueLimit: 0 }] }], impact: null, createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z' });

const budgetPolicyId = '77777777-7777-4777-8777-777777777777';
const oldBudgetPolicyId = '88888888-8888-4888-8888-888888888888';
const budgetTestRunId = '99999999-9999-4999-8999-999999999999';
const budgetRule = { resourcePool: 'asr_api', currency: 'CNY', period: 'month', warningLimit: '100.00', hardLimit: '120.00' };
const budgetPolicy = (status: string, id = budgetPolicyId) => ({ budgetPolicyVersionId: id, environment: 'development', version: id === oldBudgetPolicyId ? 1 : 2, enforcementEnabled: false, status, rules: [budgetRule], impact: status === 'impact_checked' || status === 'approved' ? { hardBlocks: [], warningCount: 0, activeReservationCount: 0, reconciliationRequiredCount: 0 } : null, createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z' });
const budgetScope = (period: 'day' | 'month') => ({ resourcePool: 'asr_api', currency: 'CNY', period, settledAmount: '1.25', reservedAmount: '0.75', unknownAmount: '0.10', totalAmount: '2.10', warningLimit: period === 'day' ? '10.00' : '100.00', hardLimit: period === 'day' ? '12.00' : '120.00', remaining: period === 'day' ? '9.90' : '117.90', status: 'warning', periodStart: period === 'day' ? '2026-08-16T00:00:00.000Z' : '2026-08-01T00:00:00.000Z', nextResetAt: period === 'day' ? '2026-08-17T00:00:00.000Z' : '2026-09-01T00:00:00.000Z' });
const budgetOverview = (activePolicy: { budgetPolicyVersionId: string; version: number; enforcementEnabled: boolean } | null = { budgetPolicyVersionId: oldBudgetPolicyId, version: 1, enforcementEnabled: false }) => ({ databaseNow: '2026-08-16T01:00:00.000Z', dataFreshness: '2026-08-16T01:00:00.000Z', activePolicy, noActivePolicy: activePolicy === null, hardBlocks: [], runtimeBlockedScopes: [], runtimeWarningScopes: [], scopes: [budgetScope('day'), budgetScope('month')], meteredDeploymentCoverage: [{ deploymentVersionId: version.versionId, resourcePool: 'asr_api', currency: 'CNY', covered: true }] });
const budgetUsage = { items: [{ resourcePool: 'asr_api', currency: 'CNY', estimatedAmount: '2.10', settledAmount: '1.25', reservedAmount: '0.75', pendingCount: 1, unknownCount: 1 }], total: 1, limit: 20, offset: 0 };
const budgetAudit = { items: [{ eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', action: 'budget_policy_created', budgetPolicyVersionId: budgetPolicyId, actorSubject: 'system-admin', requestId: 'budget-audit-1', result: 'succeeded', createdAt: '2026-08-16T00:00:00.000Z' }], total: 1, limit: 20, offset: 0 };
const budgetTest = (status: string, id = budgetTestRunId) => ({ budgetTestRunId: id, budgetPolicyVersionId: budgetPolicyId, status, inputDigest: 'c'.repeat(64), requestId: 'budget-test-request', result: null, reasonCode: status === 'unknown' ? 'timeout' : null, reasonMessage: status === 'unknown' ? '回放结果未知' : null, createdAt: '2026-08-16T00:00:00.000Z', startedAt: null, completedAt: null });

const budgetEmptyList = { items: [], total: 0, limit: 20, offset: 0 };

describe('system ControlShell engine/routing/change slices', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('engines keeps an honest empty state and never emits anonymous deployments', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ items: [], total: 0, limit: 50, offset: 0 }));
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('暂无引擎部署')).toBeInTheDocument());
    expect(screen.queryByText('示例')).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain('/api/system-control/engines');
  });

  it('engines renders server deployment and sends same-origin POST with idempotency key', async () => {
    const request = vi.mocked(fetch).mockResolvedValueOnce(json({ items: [deployment], total: 1, limit: 50, offset: 0 })).mockResolvedValueOnce(json({ deployment, latestVersion: version })).mockResolvedValueOnce(json({ items: [version], total: 1, limit: 100, offset: 0 }));
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '服务端 ASR' }));
    await waitFor(() => expect(screen.getByText('不可变版本')).toBeInTheDocument());
    expect(request.mock.calls.every((call) => !(call[1] as RequestInit | undefined)?.headers || !Object.keys((call[1] as RequestInit).headers as Record<string, string>).some((key) => key.toLowerCase().includes('test-identity')))).toBe(true);
  });

  it('engines exposes request id and one retry on a stable read failure', async () => {
    const request = vi.mocked(fetch).mockResolvedValueOnce(json({ error: { message: '拒绝读取', requestId: 'eng-403' } }, 403)).mockResolvedValueOnce(json({ items: [], total: 0, limit: 50, offset: 0 }));
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText(/eng-403/)).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveFocus();
    fireEvent.click(screen.getAllByRole('button', { name: '重新读取' }).at(-1)!);
    await waitFor(() => expect(screen.getByText('暂无引擎部署')).toBeInTheDocument());
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('routing distinguishes no active fact and only shows server policies', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ items: [policy('draft')], total: 1, limit: 100, offset: 0 })).mockResolvedValueOnce(json({ items: [], total: 0, limit: 100, offset: 0 }));
    render(<RoutingPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('暂无 active 路由')).toBeInTheDocument());
    expect(screen.getByText('草稿与历史')).toBeInTheDocument();
  });

  it('routing draft modal returns focus to its exact trigger on Escape, backdrop, and cancel', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ items: [], total: 0, limit: 20, offset: 0 }));
    render(<RoutingPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('暂无草稿或历史')).toBeInTheDocument());
    const trigger = screen.getByRole('button', { name: '新建路由草稿' });

    trigger.focus();
    fireEvent.click(trigger);
    let dialog = await screen.findByRole('dialog', { name: '新建路由草稿' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(trigger).toHaveFocus();

    trigger.focus();
    fireEvent.click(trigger);
    dialog = await screen.findByRole('dialog', { name: '新建路由草稿' });
    const backdrop = dialog.parentElement!;
    fireEvent.mouseDown(backdrop);
    fireEvent.mouseUp(backdrop);
    fireEvent.click(backdrop);
    expect(trigger).toHaveFocus();

    trigger.focus();
    fireEvent.click(trigger);
    dialog = await screen.findByRole('dialog', { name: '新建路由草稿' });
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(trigger).toHaveFocus();
  });

  it('routing surfaces impact hard blocks and does not enable approve', async () => {
    const blocked = { ...policy('impact_checked'), impact: { ...policy('impact_checked').impact!, hardBlocks: ['连接测试尚未成功'] } };
    vi.mocked(fetch).mockResolvedValueOnce(json({ items: [blocked], total: 1, limit: 100, offset: 0 })).mockResolvedValueOnce(json({ items: [], total: 0, limit: 100, offset: 0 }));
    render(<RoutingPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('v1 · 语音识别')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /v1 · 语音识别/ }));
    await waitFor(() => expect(screen.getByText('影响检查存在硬阻断')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '批准变更' })).toBeDisabled();
  });

  it('routing keeps the service active pointer independent from history filters and pages', async () => {
    const active = policy('active');
    const history = { ...policy('draft'), routingVersionId: '88888888-8888-4888-8888-888888888888' };
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/routing')) {
        return url.searchParams.get('status') === 'active'
          ? json({ items: [active], total: 1, limit: 1, offset: 0 })
          : json({ items: [history], total: 21, limit: 20, offset: Number(url.searchParams.get('offset') ?? 0) });
      }
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<RoutingPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText('v1 · 语音识别')).toHaveLength(2));
    const currentPanel = screen.getByText('当前生效').closest('section')!;
    expect(within(currentPanel).getAllByText('生效中')).toHaveLength(2);
    fireEvent.change(screen.getByRole('combobox', { name: '路由状态筛选' }), { target: { value: 'retired' } });
    await waitFor(() => expect(within(screen.getByText('当前生效').closest('section')!).getAllByText('生效中')).toHaveLength(2));
    expect(request.mock.calls.some((call) => String(call[0]).includes('status=active'))).toBe(true);
    expect(request.mock.calls.some((call) => String(call[0]).includes('status=retired'))).toBe(true);
  });

  it('routing editor clears a version that leaves the visible server page and blocks stale submission', async () => {
    const version21 = { ...version, versionId: '99999999-9999-4999-8999-999999999999', version: 21 };
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/engines')) return json({ items: [deployment], total: 1, limit: 20, offset: Number(url.searchParams.get('offset') ?? 0) });
      if (url.pathname.includes('/versions')) return Number(url.searchParams.get('offset') ?? 0) === 20
        ? json({ items: [version21], total: 21, limit: 20, offset: 20 })
        : json({ items: [version], total: 21, limit: 20, offset: 0 });
      if (url.pathname.endsWith('/routing')) return json({ items: [], total: 0, limit: 20, offset: 0 });
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<RoutingPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('暂无草稿或历史')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '新建路由草稿' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: '新建路由草稿' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '新增真实目标' }));
    fireEvent.change(screen.getByRole('combobox', { name: '目标1部署选择' }), { target: { value: deployment.deploymentId } });
    await waitFor(() => expect(screen.getAllByText(/服务端版本 21 条/).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByRole('combobox', { name: '部署版本选择' }), { target: { value: version.versionId } });
    const enabledNext = screen.getAllByRole('button', { name: '下一页' }).find((button) => !button.hasAttribute('disabled'))!;
    fireEvent.click(enabledNext);
    await waitFor(() => expect(request.mock.calls.some((call) => String(call[0]).includes('/versions?limit=20&offset=20'))).toBe(true));
    expect(screen.getAllByRole('option', { name: /v21/ }).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByRole('combobox', { name: '部署版本选择' })).toHaveValue(''));
    fireEvent.click(screen.getByRole('button', { name: '创建草稿' }));
    expect(screen.getByText(/分页切换后已失效/)).toBeInTheDocument();
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
  });

  it('routing keeps screen-text cross-pool target order in the create body and blocks a broken preferred position', async () => {
    const localDeployment = { ...deployment, deploymentId: '33333333-3333-4333-8333-333333333333', capability: 'screen_text', executionKind: 'self_hosted_worker', displayName: '本地 OCR' };
    const cloudDeployment = { ...deployment, deploymentId: '44444444-4444-4444-8444-444444444444', capability: 'screen_text', displayName: '云 OCR' };
    const localVersion1 = { ...version, versionId: '55555555-5555-4555-8555-555555555551', deploymentId: localDeployment.deploymentId, version: 1 };
    const localVersion2 = { ...version, versionId: '55555555-5555-4555-8555-555555555552', deploymentId: localDeployment.deploymentId, version: 2 };
    const cloudVersion = { ...version, versionId: '66666666-6666-4666-8666-666666666661', deploymentId: cloudDeployment.deploymentId, version: 1 };
    let submitted: { pools: Array<{ targets: Array<{ deploymentVersionId: string; priority: number; role: string }> }> } | null = null;
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname === '/api/system-control/routing') {
        submitted = JSON.parse(String((init as RequestInit).body)) as typeof submitted;
        return json(policy('draft'));
      }
      if (url.pathname.endsWith('/engines')) return json({ items: [localDeployment, cloudDeployment], total: 2, limit: 20, offset: 0 });
      if (url.pathname.includes(`/engines/${localDeployment.deploymentId}/versions`)) return json({ items: [localVersion1, localVersion2], total: 2, limit: 20, offset: 0 });
      if (url.pathname.includes(`/engines/${cloudDeployment.deploymentId}/versions`)) return json({ items: [cloudVersion], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith('/routing')) return json({ items: [], total: 0, limit: 20, offset: 0 });
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<RoutingPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('暂无草稿或历史')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: '画面字' }));
    await waitFor(() => expect(request.mock.calls.some(([input]) => String(input).includes('capability=screen_text'))).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: '新建路由草稿' }));
    const dialog = await screen.findByRole('dialog', { name: '新建路由草稿' });
    const cloudPool = () => dialog.querySelector('h3')?.textContent === 'OCR 云服务' ? dialog.querySelector('h3')?.closest('section') : Array.from(dialog.querySelectorAll('section')).find((section) => section.querySelector('h3')?.textContent === 'OCR 云服务');
    const localPool = () => Array.from(dialog.querySelectorAll('section')).find((section) => section.querySelector('h3')?.textContent === 'OCR 本地 Worker');
    const addTarget = async (pool: Element, deploymentId: string, versionId: string, targetLabel: string) => {
      fireEvent.click(within(pool).getByRole('button', { name: '新增真实目标' }));
      const article = within(pool).getByText(`目标 ${targetLabel}`).closest('article')!;
      fireEvent.change(within(article).getByRole('combobox', { name: `目标${targetLabel}部署选择` }), { target: { value: deploymentId } });
      await waitFor(() => expect(within(article).getByRole('combobox', { name: '部署版本选择' })).toBeInTheDocument());
      fireEvent.change(within(article).getByRole('combobox', { name: '部署版本选择' }), { target: { value: versionId } });
    };
    await addTarget(localPool()!, localDeployment.deploymentId, localVersion1.versionId, '1');
    await addTarget(cloudPool()!, cloudDeployment.deploymentId, cloudVersion.versionId, '2');
    await addTarget(localPool()!, localDeployment.deploymentId, localVersion2.versionId, '3');
    const firstTarget = screen.getByText('目标 1').closest('article')!;
    fireEvent.click(within(firstTarget).getByRole('button', { name: '删除' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: '目标1角色' })).toBeInTheDocument());
    fireEvent.click(within(dialog).getByRole('button', { name: '创建草稿' }));
    expect(screen.getByText('第 1 个目标必须保持“首选”角色。')).toBeInTheDocument();
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
    fireEvent.change(screen.getByRole('combobox', { name: '目标1角色' }), { target: { value: 'preferred' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建草稿' }));
    await waitFor(() => expect(submitted).not.toBeNull());
    const ordered = submitted!.pools.flatMap((pool) => pool.targets).sort((a, b) => a.priority - b.priority);
    expect(ordered.map((target) => [target.deploymentVersionId, target.priority])).toEqual([[cloudVersion.versionId, 1], [localVersion2.versionId, 2]]);
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
  });

  it('routing deterministic draft failure keeps the only error inside the active modal and clears it on close', async () => {
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname === '/api/system-control/routing') return json({ error: { message: '草稿版本冲突', requestId: 'routing-draft-409', retryable: false } }, 409);
      if (url.pathname.endsWith('/engines')) return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
      if (url.pathname.includes('/versions')) return json({ items: [version], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith('/routing')) return json({ items: [], total: 0, limit: 20, offset: 0 });
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<RoutingPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('暂无草稿或历史')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '新建路由草稿' }));
    const dialog = await screen.findByRole('dialog', { name: '新建路由草稿' });
    fireEvent.click(within(dialog).getByRole('button', { name: '新增真实目标' }));
    fireEvent.change(within(dialog).getByRole('combobox', { name: '目标1部署选择' }), { target: { value: deployment.deploymentId } });
    await waitFor(() => expect(within(dialog).getByRole('combobox', { name: '部署版本选择' })).toBeInTheDocument());
    fireEvent.change(within(dialog).getByRole('combobox', { name: '部署版本选择' }), { target: { value: version.versionId } });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建草稿' }));
    await waitFor(() => expect(within(dialog).getByText(/routing-draft-409/)).toBeInTheDocument());
    expect(within(dialog).getByRole('alert')).toHaveFocus();
    expect(Array.from(screen.getAllByRole('alert')).filter((node) => !dialog.contains(node))).toHaveLength(0);
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole('button', { name: '关闭' }));
    expect(screen.queryByText(/routing-draft-409/)).not.toBeInTheDocument();
  });

  it('routing unknown closes the editor and recovers only the same routingVersionId before focusing the page title', async () => {
    let routingVersionId = '';
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname === '/api/system-control/routing') {
        routingVersionId = JSON.parse(String((init as RequestInit).body)).routingVersionId as string;
        return json({ error: { message: '创建结果未知', requestId: 'routing-create-unknown', retryable: true } }, 503);
      }
      if (routingVersionId && url.pathname === `/api/system-control/routing/${routingVersionId}`) return json({ ...policy('draft'), routingVersionId });
      if (url.pathname.endsWith('/engines')) return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
      if (url.pathname.includes('/versions')) return json({ items: [version], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith('/routing')) return json({ items: [], total: 0, limit: 20, offset: 0 });
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<RoutingPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('暂无草稿或历史')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '新建路由草稿' }));
    const dialog = await screen.findByRole('dialog', { name: '新建路由草稿' });
    fireEvent.click(within(dialog).getByRole('button', { name: '新增真实目标' }));
    fireEvent.change(within(dialog).getByRole('combobox', { name: '目标1部署选择' }), { target: { value: deployment.deploymentId } });
    await waitFor(() => expect(within(dialog).getByRole('combobox', { name: '部署版本选择' })).toBeInTheDocument());
    fireEvent.change(within(dialog).getByRole('combobox', { name: '部署版本选择' }), { target: { value: version.versionId } });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建草稿' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次路由结果' })).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: '新建路由草稿' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查询本次路由结果' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '路由与调度' })).toHaveFocus());
    expect(routingVersionId).toBeTruthy();
    expect(request.mock.calls.filter((call) => String(call[0]).endsWith(`/routing/${routingVersionId}`))).toHaveLength(1);
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('changes uses one stable release command recovery GET after an unknown publish', async () => {
    const current = policy('approved');
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.includes('/publish')) return json({ error: { message: '结果未知', requestId: 'release-unknown', retryable: true } }, 503);
      if (url.includes('/routing-commands/')) return json({ commandId: 'cmd-1', commandKind: 'publish', routingVersionId: current.routingVersionId, releaseCommandId: '44444444-4444-4444-8444-444444444444', status: 'succeeded', policy: { ...current, status: 'active' } });
      if (url.includes('/routing-audit-events')) return json({ items: [], total: 0, limit: 20, offset: 0 });
      return json({ items: [current], total: 1, limit: 20, offset: 0 });
    });
    render(<ChangesPage />);
    await waitFor(() => expect(screen.getByText('v1 · 语音识别')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /v1 · 语音识别/ }));
    fireEvent.click(screen.getByRole('button', { name: '发布到 active' }));
    fireEvent.click(screen.getByRole('button', { name: '确认发布' }));
    await waitFor(() => expect(screen.getByText('发布结果未知')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查询本次命令结果' }));
    await waitFor(() => expect(screen.getByText('生效中')).toBeInTheDocument());
    const posts = request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(request.mock.calls.find((call) => String(call[0]).includes('/routing-commands/'))?.[0]).toMatch(/routing-commands\//);
  });

  it('engines sends statusCommandId/status and recovers the same unknown status command', async () => {
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.includes('/status')) return json({ error: { message: '结果未知', requestId: 'status-unknown', retryable: true } }, 503);
      if (url.includes('/engine-status-commands/')) return json({ statusCommandId: '55555555-5555-4555-8555-555555555555', deploymentId: deployment.deploymentId, status: 'disabled', result: 'succeeded', deployment: { ...deployment, status: 'disabled' } });
      if (url.includes(`/engines/${deployment.deploymentId}/versions`)) return json({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}`)) return json({ deployment, latestVersion: version });
      return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '停用' }));
    fireEvent.click(screen.getByRole('button', { name: '确认状态变更' }));
    await waitFor(() => expect(screen.getByText('状态命令结果未知')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '查询本次状态命令' })).toHaveFocus();
    const post = request.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === 'POST');
    expect(post?.[0]).toContain(`/engines/${deployment.deploymentId}/status`);
    expect(JSON.parse(String((post?.[1] as RequestInit).body))).toEqual(expect.objectContaining({ statusCommandId: expect.any(String), status: 'disabled' }));
    expect((post?.[1] as RequestInit).headers).toEqual(expect.objectContaining({ 'Idempotency-Key': expect.any(String) }));
    fireEvent.click(screen.getByRole('button', { name: '查询本次状态命令' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveFocus());
    expect(request.mock.calls.filter((call) => String(call[0]).includes('/engine-status-commands/'))).toHaveLength(1);
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
  });

  it('keeps controlled modal input focus while typing and exposes server test history without duplicate runs', async () => {
    const queuedTest = { testRunId: '66666666-6666-4666-8666-666666666666', deploymentVersionId: version.versionId, status: 'queued', attemptCount: 1, queuedAt: '2026-08-16T00:00:00.000Z', startedAt: null, finishedAt: null, latencyMs: null, reasonCode: null, reasonMessage: null, requestId: 'test-queued' };
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/engine-connection-tests')) return json({ items: [queuedTest], total: 1, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}/versions`)) return json({ items: [version], total: 1, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}`)) return json({ deployment, latestVersion: version });
      return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '登记引擎部署' }));
    const displayName = screen.getByRole('textbox', { name: '显示名称' });
    displayName.focus();
    fireEvent.change(displayName, { target: { value: '中文 空格' } });
    expect(displayName).toHaveValue('中文 空格');
    expect(displayName).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    fireEvent.click(screen.getByRole('button', { name: '服务端 ASR' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'v1' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'v1' }));
    await waitFor(() => expect(screen.getByText('queued')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '运行连接测试' })).toBeDisabled();
    expect(request.mock.calls.some((call) => String(call[0]).includes('/engine-connection-tests?deploymentVersionId='))).toBe(true);
  });

  it('terms engine exposes fixed DeepSeek values, editable custom values, full category order and immutable version history', async () => {
    let createdBody: Record<string, unknown> | null = null;
    const secret = { secretReferenceId: '34343434-3434-4343-8434-343434343434', displayName: 'DeepSeek 主密钥', latestVersionId: '45454545-4545-4454-8454-454545454545', latestStatus: 'available' };
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname === '/api/system-control/engines') {
        createdBody = JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>;
        return json({ deployment: termsDeployment, latestVersion: termsVersion });
      }
      if (url.pathname === '/api/system-control/secrets') return json({ items: [secret], total: 1, limit: 100, offset: 0 });
      if (url.pathname === `/api/system-control/engines/${termsDeployment.deploymentId}`) return json({ deployment: termsDeployment, latestVersion: termsVersion });
      if (url.pathname.includes(`/api/system-control/engines/${termsDeployment.deploymentId}/versions`)) return json({ items: [termsVersion], total: 1, limit: 20, offset: 0 });
      if (url.pathname === '/api/system-control/engines') return json({ items: [termsDeployment], total: 1, limit: 20, offset: 0 });
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('DeepSeek 术语提取')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '登记引擎部署' }));
    fireEvent.change(screen.getByRole('combobox', { name: '能力' }), { target: { value: 'terms' } });
    const endpoint = await screen.findByRole('textbox', { name: '术语 endpoint' });
    const model = screen.getByRole('textbox', { name: '术语 model' });
    expect(endpoint).toHaveValue('https://api.deepseek.com/chat/completions');
    expect(endpoint).toHaveAttribute('readonly');
    expect(model).toHaveValue('deepseek-v4-flash');
    expect(model).toHaveAttribute('readonly');
    fireEvent.change(screen.getByRole('combobox', { name: '术语 preset' }), { target: { value: 'custom' } });
    await waitFor(() => expect(endpoint).not.toHaveAttribute('readonly'));
    fireEvent.change(endpoint, { target: { value: 'https://terms.example.test/v1/chat/completions' } });
    fireEvent.change(model, { target: { value: 'custom-terms-model' } });
    fireEvent.click(screen.getByRole('button', { name: '下移 人名' }));
    fireEvent.change(screen.getByRole('textbox', { name: '显示名称' }), { target: { value: '自定义术语部署' } });
    fireEvent.click(screen.getByRole('button', { name: '登记并创建首版' }));
    await waitFor(() => expect(createdBody).not.toBeNull());
    expect(createdBody).toEqual(expect.objectContaining({ capability: 'terms', model: 'custom-terms-model', adapterKey: 'terms_api' }));
    expect(createdBody?.runtimeConfig).toEqual(expect.objectContaining({ preset: 'custom', endpoint: 'https://terms.example.test/v1/chat/completions', categoryOrder: ['地名', '人名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件'] }));
    fireEvent.click(screen.getByRole('button', { name: 'DeepSeek 术语提取' }));
    await waitFor(() => expect(screen.getByText('八类顺序')).toBeInTheDocument());
    expect(screen.getAllByText(/DeepSeek V4 Flash|deepseek-v4-flash/).length).toBeGreaterThan(0);
    expect(screen.getByText(/人名 → 地名/)).toBeInTheDocument();
  });

  it('screen-text OpenVINO version reads existing抽帧配置, validates bounds, and saves an immutable runtime snapshot', async () => {
    let createdBody: Record<string, any> | null = null;
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname === `/api/system-control/engines/${screenTextDeployment.deploymentId}/versions`) {
        createdBody = JSON.parse(String((init as RequestInit).body)) as Record<string, any>;
        return json({ ...screenTextVersion, versionId: createdBody.versionId, version: 2, runtimeConfig: createdBody.runtimeConfig });
      }
      if (url.pathname === '/api/system-control/secrets') return json({ items: [], total: 0, limit: 100, offset: 0 });
      if (url.pathname === `/api/system-control/engines/${screenTextDeployment.deploymentId}`) return json({ deployment: screenTextDeployment, latestVersion: screenTextVersion });
      if (url.pathname.includes(`/api/system-control/engines/${screenTextDeployment.deploymentId}/versions`)) return json({ items: [screenTextVersion], total: 1, limit: 20, offset: 0 });
      if (url.pathname === '/api/system-control/engines') return json({ items: [screenTextDeployment], total: 1, limit: 20, offset: 0 });
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('OpenVINO OCR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'OpenVINO OCR' }));
    await waitFor(() => expect(screen.getByText('抽帧间隔')).toBeInTheDocument());
    expect(screen.getByText('1000 毫秒 / 帧')).toBeInTheDocument();
    expect(screen.getByText('600 帧')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '新增版本' }));
    const dialog = await screen.findByRole('dialog', { name: '新增不可变版本' });
    const frameInterval = within(dialog).getByRole('spinbutton', { name: '抽帧间隔（毫秒）' });
    const maxFrames = within(dialog).getByRole('spinbutton', { name: '每集最大帧数' });
    expect(frameInterval).toHaveValue(1000);
    expect(maxFrames).toHaveValue(600);
    expect(frameInterval).toHaveAttribute('min', '250');
    expect(frameInterval).toHaveAttribute('max', '10000');
    expect(maxFrames).toHaveAttribute('min', '1');
    expect(maxFrames).toHaveAttribute('max', '600');
    fireEvent.change(frameInterval, { target: { value: '249' } });
    fireEvent.change(maxFrames, { target: { value: '601' } });
    expect(within(dialog).getAllByRole('alert')).toHaveLength(2);
    expect(within(dialog).getByText('抽帧间隔必须是 250–10000 毫秒范围内的整数。')).toBeInTheDocument();
    expect(within(dialog).getByText('每集最大帧数必须是 1–600 帧范围内的整数。')).toBeInTheDocument();
    fireEvent.change(frameInterval, { target: { value: '250' } });
    fireEvent.change(maxFrames, { target: { value: '600' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建版本' }));
    await waitFor(() => expect(createdBody).not.toBeNull());
    expect(createdBody).toEqual(expect.objectContaining({ versionId: expect.any(String) }));
    expect(createdBody?.runtimeConfig).toEqual({ preset: 'screen_text_openvino_ppocrv6_small', frameIntervalMs: 250, maxFramesPerEpisode: 600 });
    expect(createdBody).not.toHaveProperty('maxConcurrentJobs');
    expect(createdBody).not.toHaveProperty('perProjectMax');
    expect(createdBody).not.toHaveProperty('queueLimit');
    expect(request.mock.calls.some((call) => String(call[0]).includes('/versions') && (call[1] as RequestInit | undefined)?.headers && Object.keys((call[1] as RequestInit).headers as Record<string, string>).some((key) => key.toLowerCase() === 'idempotency-key'))).toBe(true);
  });

  it('screen-text OpenVINO registration exposes the bounded defaults and includes the first runtime snapshot', async () => {
    let createdBody: Record<string, any> | null = null;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname === '/api/system-control/engines') {
        createdBody = JSON.parse(String((init as RequestInit).body)) as Record<string, any>;
        return json({ deployment: screenTextDeployment, latestVersion: screenTextVersion });
      }
      if (url.pathname === '/api/system-control/secrets') return json({ items: [], total: 0, limit: 100, offset: 0 });
      if (url.pathname === '/api/system-control/engines') return json({ items: [], total: 0, limit: 20, offset: 0 });
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('暂无引擎部署')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '登记引擎部署' }));
    fireEvent.change(screen.getByRole('combobox', { name: '能力' }), { target: { value: 'screen_text' } });
    fireEvent.change(screen.getByRole('combobox', { name: '执行方式' }), { target: { value: 'self_hosted_worker' } });
    fireEvent.change(screen.getByRole('textbox', { name: '显示名称' }), { target: { value: '新 OpenVINO OCR' } });
    fireEvent.change(screen.getByRole('textbox', { name: /服务端 Registry 组件/ }), { target: { value: 'screen_text_openvino_ppocrv6_small' } });
    expect(screen.getByRole('spinbutton', { name: '抽帧间隔（毫秒）' })).toHaveValue(1000);
    expect(screen.getByRole('spinbutton', { name: '每集最大帧数' })).toHaveValue(600);
    fireEvent.click(screen.getByRole('button', { name: '登记并创建首版' }));
    await waitFor(() => expect(createdBody).not.toBeNull());
    expect(createdBody).toEqual(expect.objectContaining({ capability: 'screen_text', executionKind: 'self_hosted_worker', adapterKey: 'screen_text_openvino_ppocrv6_small' }));
    expect(createdBody?.runtimeConfig).toEqual({ preset: 'screen_text_openvino_ppocrv6_small', frameIntervalMs: 1000, maxFramesPerEpisode: 600 });
  });

  it('terms routing tab reads terms_api, filters the right deployments and submits ordered preferred target', async () => {
    let createdBody: Record<string, unknown> | null = null;
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname === '/api/system-control/routing') {
        createdBody = JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>;
        return json(termsPolicy('draft'));
      }
      if (url.pathname === '/api/system-control/engines') return json({ items: [termsDeployment], total: 1, limit: 20, offset: 0 });
      if (url.pathname.includes(`/api/system-control/engines/${termsDeployment.deploymentId}/versions`)) return json({ items: [termsVersion], total: 1, limit: 20, offset: 0 });
      if (url.pathname === '/api/system-control/routing' && url.searchParams.get('workflowStage') === 'terms') return json({ items: [termsPolicy('active')], total: 1, limit: 20, offset: 0 });
      if (url.pathname === '/api/system-control/routing') return json({ items: [], total: 0, limit: 20, offset: 0 });
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<RoutingPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('暂无草稿或历史')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: '术语提取' }));
    await waitFor(() => expect(request.mock.calls.some(([input]) => String(input).includes('workflowStage=terms'))).toBe(true));
    expect(screen.getByText('术语 API')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '新建路由草稿' }));
    const dialog = await screen.findByRole('dialog', { name: '新建路由草稿' });
    fireEvent.click(within(dialog).getByRole('button', { name: '新增真实目标' }));
    const target = within(dialog).getByText('目标 1').closest('article')!;
    fireEvent.change(within(target).getByRole('combobox', { name: '目标1部署选择' }), { target: { value: termsDeployment.deploymentId } });
    await waitFor(() => expect(within(target).getByRole('combobox', { name: '部署版本选择' })).toBeInTheDocument());
    fireEvent.change(within(target).getByRole('combobox', { name: '部署版本选择' }), { target: { value: termsVersion.versionId } });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建草稿' }));
    await waitFor(() => expect(createdBody).not.toBeNull());
    expect(createdBody).toEqual(expect.objectContaining({ workflowStage: 'terms' }));
    expect(createdBody?.pools).toEqual([{ poolId: 'terms_api', targets: [expect.objectContaining({ deploymentVersionId: termsVersion.versionId, priority: 1, role: 'preferred' })] }]);
  });

  it('new version secret controls only consume server-listed immutable references and keep no arbitrary reference input', async () => {
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/system-control/secrets?')) return json({ items: [], total: 0, limit: 100, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}/versions`)) return json({ items: [version], total: 1, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}`)) return json({ deployment, latestVersion: version });
      return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '服务端 ASR' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '新增版本' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '新增版本' }));
    expect(screen.getByText('继承上一版本')).toBeInTheDocument();
    expect(screen.getByText('明确清除')).toBeInTheDocument();
    expect(screen.queryByText(/替换为：/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /密钥与安全/ })).toBeEnabled();
    expect(screen.queryByRole('textbox', { name: /referenceId/i })).not.toBeInTheDocument();
    expect(request.mock.calls.some((call) => {
      const url = String(call[0]);
      return url.includes('/api/system-control/secrets?') && url.includes('capability=asr') && url.includes('provider=controlled');
    })).toBe(true);
  });

  it('connection test checks the target version authority before POST even when it was not selected', async () => {
    const queuedTest = { testRunId: '66666666-6666-4666-8666-666666666666', deploymentVersionId: version.versionId, status: 'queued', attemptCount: 1, queuedAt: '2026-08-16T00:00:00.000Z', startedAt: null, finishedAt: null, latencyMs: null, reasonCode: null, reasonMessage: null, requestId: 'test-queued' };
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if ((init as RequestInit | undefined)?.method === 'POST') return json({ error: { message: '不应提交', requestId: 'unexpected-post' } }, 500);
      if (url.includes('/engine-connection-tests?') && url.includes('status=queued')) return json({ items: [queuedTest], total: 1, limit: 20, offset: 0 });
      if (url.includes('/engine-connection-tests?')) return json({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}/versions`)) return json({ items: [version], total: 1, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}`)) return json({ deployment, latestVersion: version });
      return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '服务端 ASR' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '运行连接测试' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '运行连接测试' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('排队中'));
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
    expect(request.mock.calls.some((call) => String(call[0]).includes('status=queued'))).toBe(true);
  });

  it('renders real audit facts and does not offer rollback to the active version', async () => {
    const active = policy('active');
    const event = { eventId: '77777777-7777-4777-8777-777777777777', action: 'routing_published', routingVersionId: active.routingVersionId, actorSubject: 'operator-1', result: 'succeeded', requestId: 'audit-request-1', createdAt: '2026-08-16T00:00:00.000Z' };
    const request = vi.mocked(fetch).mockImplementation(async (input) => String(input).includes('/routing-audit-events') ? json({ items: [event], total: 21, limit: 20, offset: 0 }) : json({ items: [active], total: 1, limit: 20, offset: 0 }));
    render(<ChangesPage />);
    await waitFor(() => expect(screen.getAllByText('发布路由变更').length).toBeGreaterThan(1));
    expect(screen.getByText(/operator-1/)).toBeInTheDocument();
    expect(screen.getByText(/audit-request-1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /v1 · 语音识别/ }));
    expect(screen.queryByRole('button', { name: '回滚到此版本' })).not.toBeInTheDocument();
    const auditNext = screen.getAllByRole('button', { name: '下一页' }).at(-1)!;
    fireEvent.click(auditNext);
    await waitFor(() => expect(request.mock.calls.some((call) => String(call[0]).includes('/routing-audit-events?limit=20&offset=20'))).toBe(true));
  });

  it('engines keeps the last successful list as stale with one request-id recovery and focuses the title after success', async () => {
    let listReads = 0;
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/system-control/engines?')) {
        listReads += 1;
        if (listReads === 2) return json({ error: { message: '读取暂时失败', requestId: 'stale-engine-180' } }, 503);
        return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
      }
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByText('上一次服务端事实已保留，当前读取失败')).toBeInTheDocument());
    expect(screen.getByText(/stale-engine-180/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getAllByRole('button', { name: '重新读取' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '引擎与 API' })).toHaveFocus());
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('engines initial and repeated read failures keep exactly one recovery action', async () => {
    let listReads = 0;
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).includes('/api/system-control/engines?')) {
        listReads += 1;
        return json({ error: { message: `失败 ${listReads}`, requestId: `initial-engine-${listReads}` } }, 503);
      }
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText(/initial-engine-1/)).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getAllByRole('button', { name: '重新读取' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByText(/initial-engine-2/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
    expect(screen.getAllByRole('button', { name: '重新读取' })).toHaveLength(1);
  });

  it('unknown connection tests expose one same-testRunId query and refresh the history after recovery', async () => {
    let testRunId: string | null = null;
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url === '/api/system-control/engine-connection-tests') {
        testRunId = JSON.parse(String((init as RequestInit).body)).testRunId as string;
        return json({ error: { message: '结果未知', requestId: 'test-write-unknown', retryable: true } }, 503);
      }
      if (testRunId && url.endsWith(`/engine-connection-tests/${testRunId}`)) return json({ testRunId, deploymentVersionId: version.versionId, status: 'unknown', capability: 'asr', executionKind: 'cloud_api', adapterKey: 'deterministic_fake', requestId: 'test-unknown-180', attemptCount: 1, latencyMs: null, capabilitiesSnapshot: null, reasonCode: 'timeout', reasonMessage: '结果未知', queuedAt: '2026-08-16T00:00:00.000Z', startedAt: null, completedAt: null, attempts: [] });
      if (url.includes('/engine-connection-tests?')) return json({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}/versions`)) return json({ items: [version], total: 1, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}`)) return json({ deployment, latestVersion: version });
      return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '服务端 ASR' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '运行连接测试' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '运行连接测试' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次测试结果' })).toBeInTheDocument());
    const detailDrawer = screen.getByRole('complementary', { name: '引擎详情' });
    expect(within(detailDrawer).getByRole('button', { name: '查询本次测试结果' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '查询本次测试结果' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '查询本次测试结果' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveFocus());
    expect(testRunId).toBeTruthy();
    expect(request.mock.calls.filter((call) => String(call[0]).endsWith(`/engine-connection-tests/${testRunId}`))).toHaveLength(1);
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '查询本次测试结果' })).not.toBeInTheDocument();
  });

  it('historical unknown test rows query their real testRunId without creating a command', async () => {
    const testRunId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    let historyReads = 0;
    let itemReads = 0;
    const unknown = { testRunId, deploymentVersionId: version.versionId, status: 'unknown', capability: 'asr', executionKind: 'cloud_api', adapterKey: 'deterministic_fake', requestId: 'historical-unknown', attemptCount: 1, latencyMs: null, capabilitiesSnapshot: null, reasonCode: 'timeout', reasonMessage: '结果未知', queuedAt: '2026-08-16T00:00:00.000Z', startedAt: null, completedAt: null, attempts: [] };
    const succeeded = { ...unknown, status: 'succeeded', requestId: 'historical-success', reasonCode: null, reasonMessage: null };
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST') return json({ error: { message: '不应创建连接测试', requestId: 'historical-unexpected-post' } }, 500);
      if (url.endsWith(`/engine-connection-tests/${testRunId}`)) { itemReads += 1; return json(succeeded); }
      if (url.includes('/engine-connection-tests?')) { historyReads += 1; return json({ items: [historyReads === 1 ? unknown : succeeded], total: 1, limit: 20, offset: 0 }); }
      if (url.includes(`/engines/${deployment.deploymentId}/versions`)) return json({ items: [version], total: 1, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}`)) return json({ deployment, latestVersion: version });
      return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '服务端 ASR' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'v1' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'v1' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次测试结果' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查询本次测试结果' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '查询本次测试结果' })).not.toBeInTheDocument());
    expect(itemReads).toBe(1);
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveFocus();
  });

  it('historical unknown recovery keeps one same-ID action after a failed GET and retries only that GET', async () => {
    const testRunId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    let historyReads = 0;
    let itemReads = 0;
    const unknown = { testRunId, deploymentVersionId: version.versionId, status: 'unknown', capability: 'asr', executionKind: 'cloud_api', adapterKey: 'deterministic_fake', requestId: 'historical-retry', attemptCount: 1, latencyMs: null, capabilitiesSnapshot: null, reasonCode: 'timeout', reasonMessage: '结果未知', queuedAt: '2026-08-16T00:00:00.000Z', startedAt: null, completedAt: null, attempts: [] };
    const succeeded = { ...unknown, status: 'succeeded', requestId: 'historical-recovered', reasonCode: null, reasonMessage: null };
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST') return json({ error: { message: '不应创建连接测试', requestId: 'historical-unexpected-post' } }, 500);
      if (url.endsWith(`/engine-connection-tests/${testRunId}`)) { itemReads += 1; return itemReads === 1 ? json({ error: { message: '查询暂时失败', requestId: 'historical-query-503', retryable: true } }, 503) : json(succeeded); }
      if (url.includes('/engine-connection-tests?')) { historyReads += 1; return json({ items: [historyReads === 1 ? unknown : succeeded], total: 1, limit: 20, offset: 0 }); }
      if (url.includes(`/engines/${deployment.deploymentId}/versions`)) return json({ items: [version], total: 1, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}`)) return json({ deployment, latestVersion: version });
      return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '服务端 ASR' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'v1' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'v1' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次测试结果' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查询本次测试结果' }));
    await waitFor(() => expect(screen.getByText(/historical-query-503/)).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: '查询本次测试结果' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: '查询本次测试结果' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '查询本次测试结果' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '查询本次测试结果' })).not.toBeInTheDocument());
    expect(itemReads).toBe(2);
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveFocus();
  });

  it('pending status command keeps the modal dialog as the focus owner while the POST is unresolved', async () => {
    let resolvePost: ((response: Response) => void) | null = null;
    const pendingPost = new Promise<Response>((resolve) => { resolvePost = resolve; });
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if ((init as RequestInit | undefined)?.method === 'POST' && url.includes('/status')) return pendingPost;
      if (url.includes(`/engines/${deployment.deploymentId}/versions`)) return json({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.includes(`/engines/${deployment.deploymentId}`)) return json({ deployment, latestVersion: version });
      return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '停用' }));
    fireEvent.click(screen.getByRole('button', { name: '确认状态变更' }));
    await waitFor(() => expect(screen.getByTestId('modal-dialog')).toHaveAttribute('aria-busy', 'true'));
    const dialog = screen.getByTestId('modal-dialog');
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(dialog).toHaveFocus();
    resolvePost?.(json({ error: { message: '结果未知', retryable: true } }, 503));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次状态命令' })).toHaveFocus());
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
  });

  it('successful reads do not steal an existing input focus and modal close restores its trigger', async () => {
    let resolveInitial: ((response: Response) => void) | null = null;
    const initial = new Promise<Response>((resolve) => { resolveInitial = resolve; });
    const request = vi.mocked(fetch).mockImplementation(async (input) => String(input).includes('/api/system-control/engines?') ? (resolveInitial ? initial : json({ items: [deployment], total: 1, limit: 20, offset: 0 })) : json({ items: [], total: 0, limit: 20, offset: 0 }));
    render(<EnginesPage />);
    const search = screen.getByRole('textbox', { name: '搜索引擎' });
    search.focus();
    resolveInitial?.(json({ items: [deployment], total: 1, limit: 20, offset: 0 }));
    await waitFor(() => expect(screen.getByText('服务端 ASR')).toBeInTheDocument());
    expect(search).toHaveFocus();
    const register = screen.getByRole('button', { name: '登记引擎部署' });
    register.focus();
    fireEvent.click(register);
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(register).toHaveFocus();
  });
});

describe('system ControlShell budget guardrail slice', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const budgetRead = (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://system.test');
    if (url.pathname.endsWith('/budget-overview')) return json(budgetOverview());
    if (url.pathname === `/api/system-control/budget-policies/${oldBudgetPolicyId}`) return json(budgetPolicy('active', oldBudgetPolicyId));
    if (url.pathname.endsWith('/budget-policies')) return json({ items: [budgetPolicy('approved')], total: 1, limit: 20, offset: 0 });
    if (url.pathname.endsWith('/budget-usage')) return json(budgetUsage);
    if (url.pathname.endsWith('/budget-audit-events')) return json(budgetAudit);
    return json(budgetEmptyList);
  };

  it('budgets renders raw server amounts and the real active/no-active fact without browser aggregation', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => budgetRead(input));
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    const mainState = screen.getByLabelText('ASR 预算主状态');
    expect(screen.getAllByText('1.25').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.75').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2.10').length).toBeGreaterThan(0);
    expect(within(mainState).getByText(/下一步：继续关注日\/月用量与提醒/)).toBeInTheDocument();
    expect(mainState).not.toHaveTextContent(oldBudgetPolicyId);
    expect(screen.getByText('查看策略与计量覆盖')).toBeInTheDocument();
    expect(screen.getByText(oldBudgetPolicyId)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'ASR 日月限额与用量' })).toHaveTextContent('ASR 日限额');
    expect(screen.getByRole('list', { name: 'ASR 日月限额与用量' })).toHaveTextContent('ASR 月限额');
    expect(screen.queryByText('服务端硬阻断')).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes('/budget-overview'))).toBe(true);
  });

  it('budget overview shows the server enforcement switch for both enabled and accounting-only policies', async () => {
    let enforcementEnabled = false;
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/budget-overview')) {
        return json({ ...budgetOverview(), activePolicy: { ...budgetOverview().activePolicy!, enforcementEnabled } });
      }
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('只统计和提醒，不阻断')).toBeInTheDocument());
    enforcementEnabled = true;
    fireEvent.click(screen.getByRole('button', { name: '重新读取' }));
    await waitFor(() => expect(screen.getByText('已开启，达到限额将阻断')).toBeInTheDocument());
    expect(screen.queryByText('只统计和提醒，不阻断')).not.toBeInTheDocument();
  });

  it('enabled ASR hard gate exposes a missing day rule as a server fact instead of inventing a limit', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/budget-overview')) return json({ ...budgetOverview(), activePolicy: { ...budgetOverview().activePolicy!, enforcementEnabled: true }, scopes: [budgetScope('month')] });
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    const limits = await screen.findByRole('list', { name: 'ASR 日月限额与用量' });
    expect(within(limits).getByText('当前服务端未返回该账期规则；开启硬门前请补齐。')).toBeInTheDocument();
    expect(within(limits).getByText('ASR 月限额')).toBeInTheDocument();
    expect(within(limits).getAllByText('缺少规则')).toHaveLength(1);
  });

  it('publish confirmation projects server old/new thresholds and every blocking scope without browser recomputation', async () => {
    const target = {
      ...budgetPolicy('approved'),
      rules: [{ ...budgetRule, warningLimit: '1.00', hardLimit: '2.00' }],
      impact: { hardBlocks: [], configurationHardBlocks: ['缺少币种规则：OCR API · USD · 日'], runtimeBlockedScopes: ['OCR API · USD · 日'], runtimeWarningScopes: [], warningCount: 3, activeReservationCount: 4, reconciliationRequiredCount: 2, scopes: [] },
    };
    const active = { ...budgetPolicy('active', oldBudgetPolicyId), rules: [{ ...budgetRule, warningLimit: '0.50', hardLimit: '1.00' }] };
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname === `/api/system-control/budget-policies/${budgetPolicyId}`) return json(target);
      if (url.pathname === `/api/system-control/budget-policies/${oldBudgetPolicyId}`) return json(active);
      if (url.pathname.endsWith('/budget-policies')) return json({ items: [target], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/budget-policies/${budgetPolicyId}/tests`)) return json(budgetEmptyList);
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /v2 ·/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: '确认发布' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '确认发布' }));
    const dialog = await screen.findByRole('dialog', { name: '确认发布预算策略' });
    await waitFor(() => expect(within(dialog).getByText('ASR API · CNY · 月')).toBeInTheDocument());
    expect(within(dialog).getByText('0.50')).toBeInTheDocument();
    expect(within(dialog).getAllByText('1.00').length).toBeGreaterThanOrEqual(2);
    expect(within(dialog).getByText('2.00')).toBeInTheDocument();
    expect(within(dialog).getByText(/在途预留 4 · 待对账 2 · 提醒 3/)).toBeInTheDocument();
    expect(within(dialog).getByText(/将阻断的新请求范围：OCR API · USD · 日/)).toBeInTheDocument();
    expect(within(dialog).getByText(/配置阻断范围：缺少币种规则：OCR API · USD · 日/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/0 项硬阻断/)).not.toBeInTheDocument();
    expect(request.mock.calls.some(([input]) => String(input).endsWith(`/budget-policies/${oldBudgetPolicyId}`))).toBe(true);
  });

  it('publish confirmation keeps the no-active baseline accounting-only until the selected policy succeeds', async () => {
    const target = budgetPolicy('approved');
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/budget-overview')) return json(budgetOverview(null));
      if (url.pathname === `/api/system-control/budget-policies/${budgetPolicyId}`) return json(target);
      if (url.pathname.endsWith('/budget-policies')) return json({ items: [target], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/budget-policies/${budgetPolicyId}/tests`)) return json(budgetEmptyList);
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await screen.findByText('预算账本总览');
    fireEvent.click(screen.getByRole('button', { name: /v2 ·/ }));
    fireEvent.click(await screen.findByRole('button', { name: '确认发布' }));
    const dialog = await screen.findByRole('dialog', { name: '确认发布预算策略' });
    expect(within(dialog).getByText('当前没有生效策略；发布成功前保持默认关闭，只统计用量和提醒，不阻断新请求。')).toBeInTheDocument();
    expect(within(dialog).queryByText(/继续阻断新的付费请求/)).not.toBeInTheDocument();
  });

  it('keeps approve available when runtime blocked scopes are server impact facts without hard configuration blocks', async () => {
    const impactChecked = {
      ...budgetPolicy('impact_checked'),
      impact: { hardBlocks: [], configurationHardBlocks: [], runtimeBlockedScopes: ['OCR API · USD · 日'], runtimeWarningScopes: [], warningCount: 0, activeReservationCount: 0, reconciliationRequiredCount: 0, scopes: [] },
    };
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname === `/api/system-control/budget-policies/${budgetPolicyId}`) return json(impactChecked);
      if (url.pathname.endsWith('/budget-policies')) return json({ items: [impactChecked], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/budget-policies/${budgetPolicyId}/tests`)) return json(budgetEmptyList);
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /v2 ·/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: '批准策略' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '批准策略' })).toBeEnabled();
    expect(screen.getByText(/将阻断的新请求范围：OCR API · USD · 日/)).toBeInTheDocument();
    expect(request.mock.calls.some(([input]) => String(input).endsWith(`/budget-policies/${budgetPolicyId}`))).toBe(true);
  });

  it('projects budget engineering facts into Chinese business labels while retaining requestId in audit', async () => {
    const request = vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/budget-overview')) return json({ ...budgetOverview(null), hardBlocks: ['no_active_policy', 'billing PostgreSQL actor active'], runtimeWarningScopes: ['missing_currency_rule:USD'] });
      if (url.pathname.endsWith('/budget-audit-events')) return json({ ...budgetAudit, items: [{ ...budgetAudit.items[0], requestId: 'budget-label-request' }] });
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    expect(screen.getByText('当前没有生效策略')).toBeInTheDocument();
    expect(screen.getByText('计费 服务端账本 执行身份 当前生效')).toBeInTheDocument();
    expect(screen.getByText('缺少币种规则:USD')).toBeInTheDocument();
    expect(screen.queryByText('no_active_policy')).not.toBeInTheDocument();
    expect(screen.queryByText('missing_currency_rule:USD')).not.toBeInTheDocument();
    expect(await screen.findByText(/budget-label-request/)).toBeInTheDocument();
    expect(request.mock.calls.some(([input]) => String(input).includes('/budget-overview'))).toBe(true);
  });

  it('successful budget test refreshes the policy to testing and exposes impact check while locking another test', async () => {
    let policyStatus = 'draft';
    let testPosts = 0;
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname === `/api/system-control/budget-policies/${budgetPolicyId}/tests`) {
        testPosts += 1;
        policyStatus = 'testing';
        return json({ ...budgetTest('succeeded'), status: 'succeeded' });
      }
      if (url.pathname === `/api/system-control/budget-policies/${budgetPolicyId}`) return json(budgetPolicy(policyStatus));
      if (url.pathname.endsWith('/budget-policies')) return json({ items: [budgetPolicy(policyStatus)], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/budget-policies/${budgetPolicyId}/tests`)) return json(budgetEmptyList);
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /v2 ·/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: '运行零网络回放' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '运行零网络回放' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '运行影响检查' })).toBeInTheDocument());
    expect(screen.getAllByText('测试中').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '运行零网络回放' })).toBeDisabled();
    expect(testPosts).toBe(1);
    expect(request.mock.calls.some(([input]) => String(input).endsWith(`/budget-policies/${budgetPolicyId}`))).toBe(true);
    expect(request.mock.calls.some(([input]) => String(input).includes('/budget-policies?'))).toBe(true);
  });

  it('impact-check unknown keeps one recovery until the same policy reaches impact_checked', async () => {
    let postCount = 0;
    let policyReads = 0;
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname.endsWith('/impact-check')) {
        postCount += 1;
        return json({ error: { message: '影响检查结果未知', requestId: 'budget-impact-unknown', retryable: true } }, 503);
      }
      if (url.pathname === `/api/system-control/budget-policies/${budgetPolicyId}`) {
        policyReads += 1;
        return policyReads <= 2 ? json(budgetPolicy('testing')) : json({ ...budgetPolicy('impact_checked'), impact: { hardBlocks: [], warningCount: 0, activeReservationCount: 0, reconciliationRequiredCount: 0 } });
      }
      if (url.pathname.endsWith('/budget-policies')) return json({ items: [budgetPolicy('testing')], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/budget-policies/${budgetPolicyId}/tests`)) return json(budgetEmptyList);
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /v2 ·/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: '运行影响检查' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '运行影响检查' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次预算结果' })).toBeInTheDocument());
    expect(screen.queryByText(/命令尚未形成/)).not.toBeInTheDocument();
    const readsBeforeRecovery = policyReads;
    fireEvent.click(screen.getByRole('button', { name: '查询本次预算结果' }));
    await waitFor(() => expect(screen.getByText(/命令尚未形成/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '查询本次预算结果' })).toHaveFocus();
    expect(policyReads).toBe(readsBeforeRecovery + 1);
    expect(postCount).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '查询本次预算结果' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '批准策略' })).toBeInTheDocument());
    expect(policyReads).toBeGreaterThanOrEqual(readsBeforeRecovery + 2);
    expect(postCount).toBe(1);
  });

  it('approve unknown keeps impact_checked until the same policy reaches approved', async () => {
    let postCount = 0;
    let policyReads = 0;
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname.endsWith('/approve')) {
        postCount += 1;
        return json({ error: { message: '批准结果未知', requestId: 'budget-approve-unknown', retryable: true } }, 503);
      }
      if (url.pathname === `/api/system-control/budget-policies/${budgetPolicyId}`) {
        policyReads += 1;
        return policyReads <= 2 ? json(budgetPolicy('impact_checked')) : json(budgetPolicy('approved'));
      }
      if (url.pathname.endsWith('/budget-policies')) return json({ items: [budgetPolicy('impact_checked')], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/budget-policies/${budgetPolicyId}/tests`)) return json(budgetEmptyList);
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /v2 ·/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: '批准策略' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '批准策略' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次预算结果' })).toBeInTheDocument());
    const readsBeforeRecovery = policyReads;
    fireEvent.click(screen.getByRole('button', { name: '查询本次预算结果' }));
    await waitFor(() => expect(screen.getByText(/命令尚未形成/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '查询本次预算结果' })).toHaveFocus();
    expect(screen.getAllByText('影响已检查').length).toBeGreaterThan(0);
    expect(policyReads).toBe(readsBeforeRecovery + 1);
    fireEvent.click(screen.getByRole('button', { name: '查询本次预算结果' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '确认发布' })).toBeInTheDocument());
    expect(policyReads).toBeGreaterThanOrEqual(readsBeforeRecovery + 2);
    expect(postCount).toBe(1);
  });

  it('budget draft unknown keeps one stable recovery and never posts a second command', async () => {
    let policyPostCount = 0;
    let createdId = '';
    let submittedRules: Array<{ currency: string }> = [];
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname === '/api/system-control/budget-policies') {
        policyPostCount += 1;
        const body = JSON.parse(String((init as RequestInit).body)) as { budgetPolicyVersionId: string; enforcementEnabled: boolean; rules: Array<{ currency: string }> };
        createdId = body.budgetPolicyVersionId;
        expect(body.enforcementEnabled).toBe(false);
        submittedRules = body.rules;
        return json({ error: { message: '预算草稿结果未知', requestId: 'budget-create-unknown', retryable: true } }, 503);
      }
      if (createdId && url.pathname === `/api/system-control/budget-policies/${createdId}`) return json(budgetPolicy('draft', createdId));
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '新建预算草稿' }));
    const dialog = await screen.findByRole('dialog', { name: '新建预算策略草稿' });
    fireEvent.change(within(dialog).getAllByRole('textbox')[0]!, { target: { value: '100.00' } });
    fireEvent.change(within(dialog).getAllByRole('textbox')[1]!, { target: { value: '120.00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '保存不可变草稿' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次预算结果' })).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: '查询本次预算结果' })).toHaveLength(1);
    expect(policyPostCount).toBe(1);
    expect(within(dialog).getAllByRole('textbox')).toHaveLength(8);
    expect(submittedRules).toEqual([{ currency: 'CNY', resourcePool: 'asr_api', period: 'day', warningLimit: '100.00', hardLimit: '120.00' }]);
    fireEvent.click(screen.getByRole('button', { name: '查询本次预算结果' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '预算与限额' })).toHaveFocus());
    expect(request.mock.calls.filter(([input]) => String(input).endsWith(`/budget-policies/${createdId}`))).toHaveLength(1);
    expect(policyPostCount).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '新建预算草稿' }));
    const reopened = await screen.findByRole('dialog', { name: '新建预算策略草稿' });
    expect(within(reopened).getByRole('checkbox', { name: '开启预算硬门（ASR / OCR）' })).not.toBeChecked();
  });

  it('admin can explicitly enable the hard gate and submit ASR day and month limits', async () => {
    let submitted: { enforcementEnabled: boolean; rules: Array<{ resourcePool: string; period: string; warningLimit: string; hardLimit: string }> } | null = null;
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname === '/api/system-control/budget-policies') {
        const body = JSON.parse(String((init as RequestInit).body)) as { budgetPolicyVersionId: string; enforcementEnabled: boolean; rules: Array<{ resourcePool: string; period: string; warningLimit: string; hardLimit: string }> };
        submitted = body;
        return json({ ...budgetPolicy('draft', body.budgetPolicyVersionId), enforcementEnabled: body.enforcementEnabled, rules: body.rules }, 201);
      }
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await screen.findByText('预算账本总览');
    fireEvent.click(screen.getByRole('button', { name: '新建预算草稿' }));
    const dialog = await screen.findByRole('dialog', { name: '新建预算策略草稿' });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '开启预算硬门（ASR / OCR）' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'ASR API · CNY · 日提醒阈值' }), { target: { value: '10.00' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'ASR API · CNY · 日硬阻断阈值' }), { target: { value: '12.00' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'ASR API · CNY · 月提醒阈值' }), { target: { value: '100.00' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'ASR API · CNY · 月硬阻断阈值' }), { target: { value: '120.00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '保存不可变草稿' }));
    await waitFor(() => expect(submitted).not.toBeNull());
    expect(submitted).toMatchObject({
      enforcementEnabled: true,
      rules: [
        { resourcePool: 'asr_api', period: 'day', warningLimit: '10.00', hardLimit: '12.00' },
        { resourcePool: 'asr_api', period: 'month', warningLimit: '100.00', hardLimit: '120.00' },
      ],
    });
    expect(request.mock.calls.filter(([input]) => String(input).endsWith('/budget-policies') && !String(input).includes('?'))).toHaveLength(1);
  });

  it('historical unknown budget test queries the same id, preserves requestId after failure, and never POSTs', async () => {
    let testReads = 0;
    let historyReads = 0;
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST') return json({ error: { message: '不应创建新的预算回放', requestId: 'budget-test-unexpected-post' } }, 500);
      if (url.pathname.endsWith(`/tests/${budgetTestRunId}`)) {
        testReads += 1;
        return testReads === 1 ? json({ error: { message: '预算回放查询失败', requestId: 'budget-test-query-503', retryable: true } }, 503) : json({ ...budgetTest('succeeded'), requestId: 'budget-test-recovered' });
      }
      if (url.pathname.endsWith(`/budget-policies/${budgetPolicyId}/tests`)) {
        historyReads += 1;
        return json({ items: [historyReads === 1 ? budgetTest('unknown') : budgetTest('succeeded')], total: 1, limit: 20, offset: 0 });
      }
      if (url.pathname === `/api/system-control/budget-policies/${budgetPolicyId}`) return json(budgetPolicy('approved'));
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /v2 ·/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次预算回放结果' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查询本次预算回放结果' }));
    await waitFor(() => expect(screen.getByText(/budget-test-query-503/)).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: '查询本次预算回放结果' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: '查询本次预算回放结果' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '查询本次预算回放结果' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '查询本次预算回放结果' })).not.toBeInTheDocument());
    expect(testReads).toBe(2);
    expect(historyReads).toBeGreaterThanOrEqual(2);
    expect(request.mock.calls.filter(([input]) => String(input).endsWith(`/tests/${budgetTestRunId}`))).toHaveLength(2);
    expect(request.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveFocus();
  });

  it('budget publish unknown keeps the old active pointer until same release command recovery succeeds', async () => {
    let publishPosts = 0;
    let releaseId = '';
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname.endsWith('/publish')) {
        publishPosts += 1;
        releaseId = JSON.parse(String((init as RequestInit).body)).budgetReleaseCommandId as string;
        return json({ error: { message: '发布结果未知', requestId: 'budget-release-unknown', retryable: true } }, 503);
      }
      if (url.pathname === `/api/system-control/budget-policies/${budgetPolicyId}`) return json(budgetPolicy('approved'));
      if (releaseId && url.pathname === `/api/system-control/budget-release-commands/${releaseId}`) return json({ commandId: releaseId, commandKind: 'publish', budgetReleaseCommandId: releaseId, status: 'succeeded', requestId: 'budget-release-ok', policy: budgetPolicy('active'), createdAt: '2026-08-16T02:00:00.000Z' });
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /v2 ·/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: '确认发布' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '确认发布' }));
    const dialog = await screen.findByRole('dialog', { name: '确认发布预算策略' });
    fireEvent.click(within(dialog).getByRole('button', { name: '确认发布' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次预算发布结果' })).toBeInTheDocument());
    expect(screen.getByText(oldBudgetPolicyId)).toBeInTheDocument();
    expect(publishPosts).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '查询本次预算发布结果' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '预算与限额' })).toHaveFocus());
    expect(request.mock.calls.filter(([input]) => String(input).endsWith(`/budget-release-commands/${releaseId}`))).toHaveLength(1);
    expect(publishPosts).toBe(1);
  });

  it('budget rollback unknown keeps the same command and exposes rollback-specific recovery copy', async () => {
    let rollbackPosts = 0;
    let releaseId = '';
    const retired = budgetPolicy('retired');
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (method === 'POST' && url.pathname.endsWith('/rollback')) {
        rollbackPosts += 1;
        releaseId = JSON.parse(String((init as RequestInit).body)).budgetReleaseCommandId as string;
        return json({ error: { message: '回滚结果未知', requestId: 'budget-rollback-unknown', retryable: true } }, 503);
      }
      if (url.pathname === `/api/system-control/budget-policies/${budgetPolicyId}`) return json(retired);
      if (releaseId && url.pathname === `/api/system-control/budget-release-commands/${releaseId}`) return json({ commandId: releaseId, commandKind: 'rollback', budgetReleaseCommandId: releaseId, status: 'succeeded', requestId: 'budget-rollback-ok', policy: budgetPolicy('active'), createdAt: '2026-08-16T02:00:00.000Z' });
      if (url.pathname.endsWith('/budget-policies')) return json({ items: [retired], total: 1, limit: 20, offset: 0 });
      return budgetRead(input);
    });
    render(<BudgetsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('预算账本总览')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /v2 ·/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: '回滚至此版本' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '回滚至此版本' }));
    const dialog = await screen.findByRole('dialog', { name: '确认回滚预算策略' });
    fireEvent.click(within(dialog).getByRole('button', { name: '确认回滚' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次预算回滚结果' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '查询本次预算发布结果' })).not.toBeInTheDocument();
    expect(rollbackPosts).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '查询本次预算回滚结果' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '预算与限额' })).toHaveFocus());
    expect(request.mock.calls.filter(([input]) => String(input).endsWith(`/budget-release-commands/${releaseId}`))).toHaveLength(1);
    expect(rollbackPosts).toBe(1);
  });
});
