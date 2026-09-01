// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SecurityPage } from '../../system-frontend/src/securityPage.js';
import { EnginesPage } from '../../system-frontend/src/enginesPage.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const now = '2026-08-17T06:00:00.000Z';
const overview = { generatedAt: now, access: { status: 'ready', employeeAudienceConfigured: true, controlAudienceConfigured: true, issuerConfigured: true, observedAt: now }, provider: { status: 'ready', observedAt: now } };
const candidate = { candidateId: '11111111-1111-4111-8111-111111111111', displayName: 'ASR 主凭据候选', environment: 'development', capability: 'asr', provider: 'fake', redactedLabel: 'API 凭据 · 末尾 8F2A', status: 'available', discoveredAt: now };
const referenceVersionId = '22222222-2222-4222-8222-222222222222';
const reference = { secretReferenceId: '33333333-3333-4333-8333-333333333333', environment: 'development', capability: 'asr', provider: 'fake', displayName: 'ASR 主凭据', createdAt: now, updatedAt: now, latestVersionId: referenceVersionId, latestStatus: 'available', boundDeploymentCount: 0, latestValidationAt: now, rotationDueAt: '2026-11-15T06:00:00.000Z', rotationDue: false };
const emptyPage = { items: [], total: 0, limit: 20, offset: 0 };
const discovery = { items: [candidate], total: 1, limit: 100, offset: 0, providerStatus: 'ready', observedAt: now };

const baseSecurityFetch = async (input: RequestInfo | URL) => {
  const url = new URL(String(input), 'http://system.test');
  if (url.pathname === '/api/system-control/security') return json(overview);
  if (url.pathname === '/api/system-control/secrets/discovery') return json(discovery);
  if (url.pathname === '/api/system-control/secrets') return json(emptyPage);
  return json(emptyPage);
};

describe('system control secret security slice', () => {
  beforeEach(() => { sessionStorage.clear(); vi.stubGlobal('fetch', vi.fn(baseSecurityFetch)); });
  afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('shows an honest empty reference state and the server discovery candidate', async () => {
    render(<SecurityPage />);
    await waitFor(() => expect(screen.getByText('暂无安全引用')).toBeInTheDocument());
    expect(screen.getByText('ASR 主凭据候选')).toBeInTheDocument();
    expect(screen.getByText('API 凭据 · 末尾 8F2A')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Secret/)).not.toBeInTheDocument();
  });

  it('keeps a deterministic registration failure in the dialog and focuses the only refresh action', async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      if ((init as RequestInit | undefined)?.method === 'POST' && url.pathname === '/api/system-control/secrets') return json({ error: { message: '候选已失效', requestId: 'secret-422', retryable: false } }, 422);
      return baseSecurityFetch(input);
    });
    render(<SecurityPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: '登记引用' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '登记引用' }));
    const dialog = await screen.findByRole('dialog', { name: '登记安全引用' });
    fireEvent.click(within(dialog).getByRole('button', { name: '登记安全引用' }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '刷新候选' })).toHaveFocus());
    expect(within(dialog).getByText(/secret-422/)).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
  });

  it('recovers an unknown registration only by GET of the same command id', async () => {
    let commandId = '';
    const request = vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      if ((init as RequestInit | undefined)?.method === 'POST' && url.pathname === '/api/system-control/secrets') {
        commandId = JSON.parse(String((init as RequestInit).body)).commandId as string;
        return json({ error: { message: '登记结果未知', requestId: 'secret-503', retryable: true } }, 503);
      }
      if (commandId && url.pathname === `/api/system-control/secrets/commands/${commandId}`) return json({ commandId, action: 'created', secretReferenceId: reference.secretReferenceId, secretReferenceVersionId: referenceVersionId, status: 'succeeded', requestId: 'secret-created', createdAt: now });
      return baseSecurityFetch(input);
    });
    render(<SecurityPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: '登记引用' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '登记引用' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '登记安全引用' })).getByRole('button', { name: '登记安全引用' }));
    const recover = await screen.findByRole('button', { name: '查询本次登记结果' });
    expect(recover).toHaveFocus();
    fireEvent.click(recover);
    await waitFor(() => expect(screen.getByRole('heading', { name: '密钥与安全' })).toHaveFocus());
    expect(commandId).toBeTruthy();
    expect(request.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST')).toHaveLength(1);
    expect(request.mock.calls.filter((call) => String(call[0]).endsWith(`/secrets/commands/${commandId}`))).toHaveLength(1);
    expect(sessionStorage.getItem('system-control-secret-recovery')).toBeNull();
  });

  it('binds a server-listed immutable secret version when creating a new engine version', async () => {
    const deployment = { deploymentId: '44444444-4444-4444-8444-444444444444', capability: 'asr', executionKind: 'cloud_api', displayName: '服务端 ASR', provider: 'fake', adapterKey: 'deterministic_fake', status: 'enabled', latestVersion: 1, createdAt: now, updatedAt: now };
    const engineVersion = { versionId: '55555555-5555-4555-8555-555555555555', deploymentId: deployment.deploymentId, version: 1, model: 'deterministic-v1', language: 'zh-CN', endpointReference: null, regionHint: null, capabilitiesSnapshot: { capability: 'asr', executionKind: 'cloud_api', provider: 'fake', adapterKey: 'deterministic_fake', model: 'deterministic-v1', language: 'zh-CN', descriptorDigest: 'a'.repeat(64), capabilities: {} }, secretReference: { present: false, referenceDigest: null, redactedLabel: null }, configDigest: 'b'.repeat(64), billingSnapshot: null, createdAt: now };
    let postedSecret: unknown = null;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), 'http://system.test');
      if ((init as RequestInit | undefined)?.method === 'POST' && url.pathname.endsWith('/versions')) { postedSecret = JSON.parse(String((init as RequestInit).body)).secret; return json({ ...engineVersion, versionId: '66666666-6666-4666-8666-666666666666', version: 2, secretReference: { present: true, secretReferenceId: reference.secretReferenceId, secretReferenceVersionId: referenceVersionId, referenceDigest: 'c'.repeat(64), redactedLabel: '末尾 8F2A', status: 'available' } }, 201); }
      if (url.pathname === '/api/system-control/engines') return json({ items: [deployment], total: 1, limit: 20, offset: 0 });
      if (url.pathname === `/api/system-control/engines/${deployment.deploymentId}`) return json({ deployment, latestVersion: engineVersion });
      if (url.pathname.endsWith('/versions')) return json({ items: [engineVersion], total: 1, limit: 20, offset: 0 });
      if (url.pathname === '/api/system-control/engine-connection-tests') return json(emptyPage);
      if (url.pathname === '/api/system-control/secrets') return json({ items: [reference], total: 1, limit: 100, offset: 0 });
      return json(emptyPage);
    });
    render(<EnginesPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: '服务端 ASR' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '服务端 ASR' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '新增版本' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '新增版本' }));
    const dialog = await screen.findByRole('dialog', { name: '新增不可变版本' });
    await waitFor(() => expect(within(dialog).getByRole('option', { name: '替换为：ASR 主凭据' })).toBeInTheDocument());
    fireEvent.change(within(dialog).getByRole('combobox', { name: /密钥语义/ }), { target: { value: `replace:${referenceVersionId}` } });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建版本' }));
    await waitFor(() => expect(postedSecret).toEqual({ action: 'replace', secretReferenceVersionId: referenceVersionId }));
  });
});
