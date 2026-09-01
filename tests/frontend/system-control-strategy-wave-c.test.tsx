// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { StrategyPage } from '../../system-frontend/src/strategyPage.js';
import { CommandRecovery } from '../../system-frontend/src/controlPrimitives.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const pack = { payloadType: 'pre_review_local_rule_pack_v1', alignmentNearbyGapMs: 350, alignmentSimilarityThreshold: 0.75, maxCharacters: 28, forbidSentencePunctuation: true, forbidMarkup: true, forbidBrackets: true, requireSpeakerDashForMultipleLines: true } as const;
const versionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const version = { strategyVersionId: versionId, module: 'pre_review', origin: 'system_baseline', status: 'draft', contentDigest: 'a'.repeat(64), baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, rulePack: pack, createdAt: '2026-08-18T01:00:00.000Z', updatedAt: '2026-08-18T01:00:00.000Z' };
const target = { module: 'pre_review', active: null };
const baselinePreview = { module: 'pre_review', origin: 'system_baseline', contentDigest: 'a'.repeat(64), rulePack: pack, imported: false, strategyVersionId: null };
const emptyHistory = { items: [], total: 0, limit: 20, offset: 0 };
const emptyList = { items: [], total: 0, limit: 20, offset: 0 };

describe('system control strategy Wave C', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/strategy?tab=local_rule_pack'); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('keeps the shared recovery default action label unchanged', () => {
    render(<CommandRecovery kind="strategy-runtime-release" identity="release-command" onRecover={vi.fn()} />);
    expect(screen.getByRole('button', { name: '查询本次发布/恢复命令' })).toBeInTheDocument();
  });

  it('previews and imports the protected baseline with one stable command', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); calls.push({ url: url.pathname + url.search, init });
      if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(target);
      if (url.pathname.endsWith('/baseline-preview')) return json(baselinePreview);
      if (url.pathname.endsWith('/history')) return json(emptyHistory);
      if (url.pathname.endsWith('/baseline-imports') && (init?.method ?? 'GET') === 'POST') return json(version, 201);
      if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json({ ...version, status: 'approved' });
      if (url.pathname.endsWith('/strategy/artifacts')) return json(emptyList);
      return json(emptyList);
    }));
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('button', { name: '预览系统初始基线' }));
    const preview = await screen.findByRole('dialog', { name: '系统初始基线预览' });
    expect(within(preview).getByText(/来源：系统初始基线/)).toBeInTheDocument();
    fireEvent.click(within(preview).getByRole('button', { name: '确认导入系统初始基线' }));
    const modal = await screen.findByRole('dialog', { name: '导入系统初始基线' });
    fireEvent.click(within(modal).getByRole('button', { name: '确认导入' }));
    await waitFor(() => expect(screen.getByText('系统初始基线已导入；当前生效指针未移动。')).toBeInTheDocument());
    expect(await screen.findByText(/已批准 · 内容摘要/)).toBeInTheDocument();
    const posts = calls.filter((call) => call.init?.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0]?.init?.headers).toEqual(expect.objectContaining({ 'Idempotency-Key': expect.any(String) }));
    expect(JSON.parse(String(posts[0]?.init?.body))).toEqual(expect.objectContaining({ baselineImportId: expect.any(String), artifactId: expect.any(String), versionId: expect.any(String) }));
  });

  it('keeps an unknown impact command on the same impactRunId until the GET succeeds', async () => {
    const history = { items: [{ strategyVersionId: versionId, origin: 'system_baseline', status: 'draft', contentDigest: 'a'.repeat(64), baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, impacts: [], approvals: [], releaseEvents: [], createdAt: version.createdAt, updatedAt: version.updatedAt }], total: 1, limit: 20, offset: 0 };
    let impactId = ''; let impactReads = 0; const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); calls.push({ url: url.pathname + url.search, init }); const method = init?.method ?? 'GET';
      if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(target);
      if (url.pathname.endsWith('/baseline-preview')) return json({ ...baselinePreview, imported: true, strategyVersionId: versionId });
      if (url.pathname.endsWith('/history')) return json(history);
      if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json(version);
      if (url.pathname.endsWith('/impact-runs') && method === 'POST') { impactId = JSON.parse(String(init?.body)).impactRunId; return json({ error: { message: '结果未知', requestId: 'impact-unknown-1', retryable: true } }, 503); }
      if (url.pathname.endsWith(`/impact-runs/${impactId}`)) { impactReads += 1; return impactReads === 1 ? json({ impactRunId: impactId, strategyVersionId: versionId, status: 'running', snapshotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', blockers: [], oldUnboundSessionCount: 0, affectedSessionCount: 0, sampleCount: 0, coverage: {}, fieldDifferences: [], invariantResults: { oneToOne: 'unknown', asrQuality: 'unknown', blockingFormat: 'unknown', termConflicts: 'unknown' }, snapshotDigest: 'b'.repeat(64), requestId: 'impact-running-1', startedAt: null, completedAt: null, createdAt: version.createdAt }) : json({ impactRunId: impactId, strategyVersionId: versionId, status: 'succeeded', snapshotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', blockers: [], oldUnboundSessionCount: 0, affectedSessionCount: 1, sampleCount: 1, coverage: {}, fieldDifferences: [], invariantResults: { oneToOne: 'pass', asrQuality: 'pass', blockingFormat: 'pass', termConflicts: 'pass' }, snapshotDigest: 'b'.repeat(64), requestId: 'impact-success-1', startedAt: version.createdAt, completedAt: version.updatedAt, createdAt: version.createdAt }); }
      return json(emptyList);
    }));
    render(<StrategyPage />);
    await screen.findByText('前置审改本地规则');
    fireEvent.click(await screen.findByRole('button', { name: '创建固定快照影子验证' }));
    const modal = await screen.findByRole('dialog', { name: '创建固定快照影子影响验证' }); fireEvent.click(within(modal).getByRole('button', { name: '创建影子验证' }));
    const recover = await screen.findByRole('button', { name: '查询本次影子影响验证' }); expect(screen.getByText('影子影响验证结果未知')).toBeInTheDocument();
    fireEvent.click(recover); await waitFor(() => expect(screen.getByRole('button', { name: '查询本次影子影响验证' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查询本次影子影响验证' })); await waitFor(() => expect(screen.getByText('影子影响验证结果已恢复。')).toBeInTheDocument());
    expect(calls.filter((call) => call.init?.method === 'POST')).toHaveLength(1);
    expect(calls.filter((call) => call.url.endsWith(`/impact-runs/${impactId}`))).toHaveLength(2);
  });

  it('keeps a normal queued impact on one identity and queries it without a second POST', async () => {
    const history = { items: [{ strategyVersionId: versionId, origin: 'system_baseline', status: 'draft', contentDigest: 'a'.repeat(64), baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, impacts: [], approvals: [], releaseEvents: [], createdAt: version.createdAt, updatedAt: version.updatedAt }], total: 1, limit: 20, offset: 0 };
    const calls: Array<{ url: string; init?: RequestInit }> = []; let impactId = ''; let reads = 0; let releaseFirstRead: (() => void) | undefined;
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); calls.push({ url: url.pathname + url.search, init }); const method = init?.method ?? 'GET';
      if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(target);
      if (url.pathname.endsWith('/baseline-preview')) return json({ ...baselinePreview, imported: true, strategyVersionId: versionId });
      if (url.pathname.endsWith('/history')) return json(history);
      if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json(version);
      if (url.pathname.endsWith('/impact-runs') && method === 'POST') { impactId = JSON.parse(String(init?.body)).impactRunId; return json({ impactRunId: impactId, strategyVersionId: versionId, status: 'queued', snapshotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', blockers: [], oldUnboundSessionCount: 0, affectedSessionCount: 0, sampleCount: 0, coverage: {}, fieldDifferences: [], invariantResults: { oneToOne: 'unknown', asrQuality: 'unknown', blockingFormat: 'unknown', termConflicts: 'unknown' }, snapshotDigest: 'b'.repeat(64), requestId: 'impact-queued-1', startedAt: null, completedAt: null, createdAt: version.createdAt }, 201); }
      if (url.pathname.endsWith(`/impact-runs/${impactId}`)) {
        reads += 1;
        if (reads === 1) return new Promise<Response>((resolve) => { releaseFirstRead = () => resolve(json({ impactRunId: impactId, strategyVersionId: versionId, status: 'running', snapshotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', blockers: [], oldUnboundSessionCount: 0, affectedSessionCount: 0, sampleCount: 0, coverage: {}, fieldDifferences: [], invariantResults: { oneToOne: 'unknown', asrQuality: 'unknown', blockingFormat: 'unknown', termConflicts: 'unknown' }, snapshotDigest: 'b'.repeat(64), requestId: 'impact-running-1', startedAt: null, completedAt: null, createdAt: version.createdAt })); });
        return json({ impactRunId: impactId, strategyVersionId: versionId, status: 'succeeded', snapshotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', blockers: [], oldUnboundSessionCount: 0, affectedSessionCount: 1, sampleCount: 1, coverage: {}, fieldDifferences: [], invariantResults: { oneToOne: 'pass', asrQuality: 'pass', blockingFormat: 'pass', termConflicts: 'pass' }, snapshotDigest: 'b'.repeat(64), requestId: 'impact-success-1', startedAt: version.createdAt, completedAt: version.updatedAt, createdAt: version.createdAt });
      }
      return json(emptyList);
    }));
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('button', { name: '创建固定快照影子验证' }));
    const modal = await screen.findByRole('dialog', { name: '创建固定快照影子影响验证' }); fireEvent.click(within(modal).getByRole('button', { name: '创建影子验证' }));
    const recover = await screen.findByRole('button', { name: '查询本次影子影响验证' });
    expect(calls.filter((call) => call.init?.method === 'POST')).toHaveLength(1);
    expect(recover).toBeEnabled();
    fireEvent.click(recover);
    expect(screen.getByRole('button', { name: '查询中…' })).toBeDisabled();
    expect(calls.filter((call) => call.url.endsWith(`/impact-runs/${impactId}`))).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '创建影子影响验证' }));
    expect(screen.getByRole('button', { name: '创建影子影响验证' })).toBeDisabled();
    releaseFirstRead?.();
    await waitFor(() => expect(screen.getByRole('button', { name: '查询本次影子影响验证' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '查询本次影子影响验证' }));
    await waitFor(() => expect(screen.getByText('影子影响验证结果已恢复。')).toBeInTheDocument());
    expect(calls.filter((call) => call.init?.method === 'POST')).toHaveLength(1);
    expect(calls.filter((call) => call.url.endsWith(`/impact-runs/${impactId}`))).toHaveLength(2);
  });

  it('keeps the selected version through impact and approval, then makes history neutral', async () => {
    const history = { items: [{ strategyVersionId: versionId, origin: 'system_baseline', status: 'draft', contentDigest: version.contentDigest, baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, impacts: [], approvals: [], releaseEvents: [], createdAt: version.createdAt, updatedAt: version.updatedAt }], total: 1, limit: 20, offset: 0 };
    let impactId = ''; const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); const method = init?.method ?? 'GET'; calls.push({ url: url.pathname, method });
      if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(target);
      if (url.pathname.endsWith('/baseline-preview')) return json({ ...baselinePreview, imported: true, strategyVersionId: versionId });
      if (url.pathname.endsWith('/history')) return json(history);
      if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json(version);
      if (url.pathname.endsWith('/impact-runs') && method === 'POST') { impactId = JSON.parse(String(init?.body)).impactRunId; return json({ impactRunId: impactId, strategyVersionId: versionId, status: 'succeeded', snapshotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', blockers: [], oldUnboundSessionCount: 0, affectedSessionCount: 1, sampleCount: 1, coverage: {}, fieldDifferences: [], invariantResults: { oneToOne: 'pass', asrQuality: 'pass', blockingFormat: 'pass', termConflicts: 'pass' }, snapshotDigest: 'b'.repeat(64), requestId: 'impact-success-1', startedAt: version.createdAt, completedAt: version.updatedAt, createdAt: version.createdAt }, 201); }
      if (url.pathname.endsWith('/approvals') && method === 'POST') { const body = JSON.parse(String(init?.body)); return json({ approvalId: body.approvalId, impactRunId: impactId, strategyVersionId: versionId, status: 'approved', requestId: 'approval-success-1', createdAt: version.createdAt }, 201); }
      return json(emptyList);
    }));
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('button', { name: '创建固定快照影子验证' }));
    const impactModal = await screen.findByRole('dialog', { name: '创建固定快照影子影响验证' });
    fireEvent.click(within(impactModal).getByRole('button', { name: '创建影子验证' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: '影子验证' })).toHaveAttribute('aria-selected', 'true'));
    fireEvent.click(screen.getAllByRole('tab', { name: '批准与发布' }).at(-1)!);
    const approve = await screen.findByRole('button', { name: '人工批准' });
    expect(screen.getByText('策略版本')).toBeInTheDocument();
    fireEvent.click(approve);
    const approvalModal = await screen.findByRole('dialog', { name: '人工批准策略版本' });
    fireEvent.click(within(approvalModal).getByRole('button', { name: '确认人工批准' }));
    await waitFor(() => expect(screen.getAllByRole('tab', { name: '批准与发布' }).at(-1)).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByText('策略版本')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(2);
    fireEvent.click(screen.getByRole('tab', { name: '历史与恢复' }));
    expect(screen.queryByRole('dialog', { name: '逐字段比较与恢复' })).not.toBeInTheDocument();
  });

  it('keeps the same impact recovery after a GET failure and then succeeds', async () => {
    const history = { items: [{ strategyVersionId: versionId, origin: 'system_baseline', status: 'draft', contentDigest: 'a'.repeat(64), baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, impacts: [], approvals: [], releaseEvents: [], createdAt: version.createdAt, updatedAt: version.updatedAt }], total: 1, limit: 20, offset: 0 };
    const calls: Array<{ url: string; init?: RequestInit }> = []; let impactId = ''; let reads = 0;
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); calls.push({ url: url.pathname + url.search, init }); const method = init?.method ?? 'GET';
      if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(target);
      if (url.pathname.endsWith('/baseline-preview')) return json({ ...baselinePreview, imported: true, strategyVersionId: versionId });
      if (url.pathname.endsWith('/history')) return json(history);
      if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json(version);
      if (url.pathname.endsWith('/impact-runs') && method === 'POST') { impactId = JSON.parse(String(init?.body)).impactRunId; return json({ impactRunId: impactId, strategyVersionId: versionId, status: 'queued', snapshotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', blockers: [], oldUnboundSessionCount: 0, affectedSessionCount: 0, sampleCount: 0, coverage: {}, fieldDifferences: [], invariantResults: { oneToOne: 'unknown', asrQuality: 'unknown', blockingFormat: 'unknown', termConflicts: 'unknown' }, snapshotDigest: 'b'.repeat(64), requestId: 'impact-queued-1', startedAt: null, completedAt: null, createdAt: version.createdAt }, 201); }
      if (url.pathname.endsWith(`/impact-runs/${impactId}`)) { reads += 1; return reads === 1 ? json({ error: { message: '服务暂不可用', requestId: 'impact-read-503', retryable: true } }, 503) : json({ impactRunId: impactId, strategyVersionId: versionId, status: 'succeeded', snapshotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', blockers: [], oldUnboundSessionCount: 0, affectedSessionCount: 1, sampleCount: 1, coverage: {}, fieldDifferences: [], invariantResults: { oneToOne: 'pass', asrQuality: 'pass', blockingFormat: 'pass', termConflicts: 'pass' }, snapshotDigest: 'b'.repeat(64), requestId: 'impact-success-1', startedAt: version.createdAt, completedAt: version.updatedAt, createdAt: version.createdAt }); }
      return json(emptyList);
    }));
    render(<StrategyPage />); fireEvent.click(await screen.findByRole('button', { name: '创建固定快照影子验证' }));
    const modal = await screen.findByRole('dialog', { name: '创建固定快照影子影响验证' }); fireEvent.click(within(modal).getByRole('button', { name: '创建影子验证' }));
    const recover = await screen.findByRole('button', { name: '查询本次影子影响验证' }); fireEvent.click(recover);
    await waitFor(() => expect(screen.getByText(/impact-read-503/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '查询本次影子影响验证' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '查询本次影子影响验证' })); await waitFor(() => expect(screen.getByText('影子影响验证结果已恢复。')).toBeInTheDocument());
    expect(calls.filter((call) => call.init?.method === 'POST')).toHaveLength(1); expect(calls.filter((call) => call.url.endsWith(`/impact-runs/${impactId}`))).toHaveLength(2);
  });

  it('reads a history version only through the stable runtime version endpoint', async () => {
    const history = { items: [{ strategyVersionId: versionId, origin: 'system_baseline', status: 'draft', contentDigest: version.contentDigest, baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, impacts: [], approvals: [], releaseEvents: [], createdAt: version.createdAt, updatedAt: version.updatedAt }], total: 101, limit: 20, offset: 100 };
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input, init) => { const url = new URL(String(input), 'http://system.test'); const method = init?.method ?? 'GET'; calls.push(`${method} ${url.pathname}${url.search}`); if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(target); if (url.pathname.endsWith('/baseline-preview')) return json(baselinePreview); if (url.pathname.endsWith('/history')) return json(history); if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json(version); return json(emptyList); }));
    render(<StrategyPage />); const row = await screen.findByRole('button', { name: /系统初始基线.*草稿/ }); fireEvent.click(row);
    await screen.findByText('七项严格字段');
    expect(calls.some((call) => call.includes(`/runtime-targets/pre_review/versions/${versionId}`))).toBe(true);
    expect(calls.some((call) => call.includes('limit=100'))).toBe(false);
    expect(calls.some((call) => call.includes('/versions?limit=100'))).toBe(false);
  });

  it('closes the history drawer for rollback unknown and recovers the same command in the versions view', async () => {
    const activeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const impactId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const approvalId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const activeVersion = { ...version, strategyVersionId: activeId, status: 'active' as const };
    const retiredVersion = { ...version, status: 'retired' as const };
    const impact = { impactRunId: impactId, strategyVersionId: versionId, status: 'succeeded', snapshotId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', blockers: [], oldUnboundSessionCount: 0, affectedSessionCount: 1, sampleCount: 1, coverage: {}, fieldDifferences: [], invariantResults: { oneToOne: 'pass', asrQuality: 'pass', blockingFormat: 'pass', termConflicts: 'pass' }, snapshotDigest: 'b'.repeat(64), requestId: 'impact-history-1', startedAt: version.createdAt, completedAt: version.updatedAt, createdAt: version.createdAt };
    const approval = { approvalId, impactRunId: impactId, strategyVersionId: versionId, status: 'approved', requestId: 'approval-history-1', createdAt: version.createdAt };
    const historyItem = { ...retiredVersion, impacts: [{ impactRunId: impactId, status: 'succeeded', contentDigest: 'b'.repeat(64), snapshotDigest: 'b'.repeat(64), createdAt: version.createdAt, completedAt: version.updatedAt }], approvals: [{ approvalId, impactRunId: impactId, contentDigest: 'b'.repeat(64), createdAt: version.createdAt }], releaseEvents: [] };
    const calls: Array<{ url: string; init?: RequestInit }> = []; let releaseCommandId = ''; let releaseReads = 0;
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); const method = init?.method ?? 'GET'; calls.push({ url: url.pathname + url.search, init });
      if (url.pathname.endsWith('/runtime-targets/pre_review')) return json({ module: 'pre_review', active: activeVersion });
      if (url.pathname.endsWith('/baseline-preview')) return json({ ...baselinePreview, imported: true, strategyVersionId: activeId });
      if (url.pathname.endsWith('/history')) return json({ items: [historyItem], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json(retiredVersion);
      if (url.pathname.endsWith(`/impact-runs/${impactId}`)) return json(impact);
      if (url.pathname.endsWith(`/approvals/${approvalId}`)) return json(approval);
      if (url.pathname.endsWith('/releases') && method === 'POST') { releaseCommandId = JSON.parse(String(init?.body)).releaseCommandId; return json({ error: { message: '结果未知', requestId: 'rollback-unknown-1', retryable: true } }, 503); }
      if (url.pathname.endsWith(`/release-commands/${releaseCommandId}`)) { releaseReads += 1; return json({ releaseCommandId, action: 'rollback', strategyVersionId: versionId, status: 'succeeded', previousStrategyVersionId: activeId, requestId: `rollback-success-${releaseReads}`, createdAt: version.createdAt }); }
      return json(emptyList);
    }));
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('tab', { name: '历史与恢复' }));
    fireEvent.click(await screen.findByRole('button', { name: '比较' }));
    const drawer = await screen.findByRole('dialog', { name: '逐字段比较与恢复' });
    const restore = await within(drawer).findByRole('button', { name: '创建恢复命令' });
    expect(restore).toBeEnabled(); fireEvent.click(restore);
    const releaseModal = await screen.findByRole('dialog', { name: '确认恢复策略版本' });
    fireEvent.click(within(releaseModal).getByRole('button', { name: '创建恢复命令' }));
    const recovery = await screen.findByRole('button', { name: '查询本次策略恢复结果' });
    expect(screen.queryByRole('dialog', { name: '逐字段比较与恢复' })).not.toBeInTheDocument();
    expect(recovery).toBeVisible(); expect(recovery).toBeEnabled();
    expect(calls.filter((call) => call.init?.method === 'POST')).toHaveLength(1);
    expect(calls.filter((call) => call.url.endsWith(`/release-commands/${releaseCommandId}`))).toHaveLength(0);
    fireEvent.click(recovery);
    await waitFor(() => expect(screen.getByText('恢复结果已恢复。')).toBeInTheDocument());
    expect(calls.filter((call) => call.init?.method === 'POST')).toHaveLength(1);
    expect(calls.filter((call) => call.url.endsWith(`/release-commands/${releaseCommandId}`))).toHaveLength(1);
    expect(screen.queryByRole('dialog', { name: '逐字段比较与恢复' })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: '前置审改本地规则' })));
  });

  it('clears a deterministic conflict intent, refreshes facts, and focuses the Wave C heading', async () => {
    const history = { items: [{ strategyVersionId: versionId, origin: 'system_baseline', status: 'draft', contentDigest: version.contentDigest, baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, impacts: [], approvals: [], releaseEvents: [], createdAt: version.createdAt, updatedAt: version.updatedAt }], total: 1, limit: 20, offset: 0 };
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); const method = init?.method ?? 'GET'; calls.push({ url: url.pathname, method });
      if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(target);
      if (url.pathname.endsWith('/baseline-preview')) return json({ ...baselinePreview, imported: true, strategyVersionId: versionId });
      if (url.pathname.endsWith('/history')) return json(history);
      if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json(version);
      if (url.pathname.endsWith('/impact-runs') && method === 'POST') return json({ error: { message: '版本事实已变化，请重新读取。', requestId: 'impact-conflict-1', retryable: false } }, 409);
      return json(emptyList);
    }));
    render(<StrategyPage />);
    await screen.findByText('前置审改本地规则');
    fireEvent.click(await screen.findByRole('button', { name: '创建固定快照影子验证' }));
    const modal = await screen.findByRole('dialog', { name: '创建固定快照影子影响验证' });
    fireEvent.click(within(modal).getByRole('button', { name: '创建影子验证' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '创建固定快照影子影响验证' })).not.toBeInTheDocument());
    expect(screen.getByText(/impact-conflict-1/)).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('alert'));
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1);
  });

  it('keeps the ErrorBlock focused across approval and release conflicts and uses new identities', async () => {
    const calls: Array<{ url: string; method: string; body?: Record<string, unknown> }> = []; let impactPosts = 0; let approvalPosts = 0; let releasePosts = 0; let impactId = '';
    const successfulImpact = (id: string) => ({ impactRunId: id, strategyVersionId: versionId, status: 'succeeded', snapshotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', blockers: [], oldUnboundSessionCount: 0, affectedSessionCount: 1, sampleCount: 1, coverage: {}, fieldDifferences: [], invariantResults: { oneToOne: 'pass', asrQuality: 'pass', blockingFormat: 'pass', termConflicts: 'pass' }, snapshotDigest: 'b'.repeat(64), requestId: 'impact-ok-1', startedAt: version.createdAt, completedAt: version.updatedAt, createdAt: version.createdAt });
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = new URL(String(input), 'http://system.test'); const method = init?.method ?? 'GET'; const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined; calls.push({ url: url.pathname, method, body });
      if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(target);
      if (url.pathname.endsWith('/baseline-preview')) return json({ ...baselinePreview, imported: true, strategyVersionId: versionId });
      if (url.pathname.endsWith('/history')) return json({ items: [{ ...version, impacts: [], approvals: [], releaseEvents: [] }], total: 1, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json(approvalPosts >= 2 ? { ...version, status: 'approved' } : version);
      if (url.pathname.endsWith('/impact-runs') && method === 'POST') { impactPosts += 1; impactId = String(body?.impactRunId); return impactPosts === 1 ? json({ error: { message: '版本事实已变化，请重新读取。', requestId: 'impact-conflict-1', retryable: false } }, 409) : json(successfulImpact(impactId), 201); }
      if (url.pathname.endsWith('/approvals') && method === 'POST') { approvalPosts += 1; return approvalPosts === 1 ? json({ error: { message: '影子验证事实已变化，请重新读取。', requestId: 'approval-conflict-1', retryable: false } }, 409) : json({ approvalId: String(body?.approvalId), impactRunId: impactId, strategyVersionId: versionId, status: 'approved', requestId: 'approval-ok-1', createdAt: version.createdAt }, 201); }
      if (url.pathname.endsWith('/releases') && method === 'POST') { releasePosts += 1; return releasePosts === 1 ? json({ error: { message: '当前生效指针已变化，请重新读取。', requestId: 'release-conflict-1', retryable: false } }, 409) : json({ releaseCommandId: String(body?.releaseCommandId), action: 'publish', strategyVersionId: versionId, status: 'succeeded', previousStrategyVersionId: null, requestId: 'release-ok-1', createdAt: version.createdAt }, 201); }
      return json(emptyList);
    }));
    render(<StrategyPage />);
    const waitConflict = async (requestId: string) => { await waitFor(() => expect(screen.getByText(new RegExp(requestId))).toBeInTheDocument()); await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('alert'))); };
    fireEvent.click(await screen.findByRole('button', { name: '创建固定快照影子验证' }));
    let modal = await screen.findByRole('dialog', { name: '创建固定快照影子影响验证' }); fireEvent.click(within(modal).getByRole('button', { name: '创建影子验证' })); await waitConflict('impact-conflict-1');
    fireEvent.click(screen.getByRole('button', { name: '创建固定快照影子验证' })); modal = await screen.findByRole('dialog', { name: '创建固定快照影子影响验证' }); fireEvent.click(within(modal).getByRole('button', { name: '创建影子验证' })); await waitFor(() => expect(screen.getByText('影子影响验证已创建；结果由服务端固定快照形成。')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('tab', { name: '批准与发布' }).at(-1)!); fireEvent.click(await screen.findByRole('button', { name: '人工批准' })); modal = await screen.findByRole('dialog', { name: '人工批准策略版本' }); fireEvent.click(within(modal).getByRole('button', { name: '确认人工批准' })); await waitConflict('approval-conflict-1');
    fireEvent.click(screen.getByRole('button', { name: '人工批准' })); modal = await screen.findByRole('dialog', { name: '人工批准策略版本' }); fireEvent.click(within(modal).getByRole('button', { name: '确认人工批准' })); await waitFor(() => expect(screen.getByText('人工批准已记录；当前生效指针未移动。')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: '确认首次发布' })).toBeEnabled()); fireEvent.click(screen.getByRole('button', { name: '确认首次发布' })); modal = await screen.findByRole('dialog', { name: '确认首次发布' }); fireEvent.click(within(modal).getByRole('button', { name: '创建发布命令' })); await waitConflict('release-conflict-1');
    fireEvent.click(screen.getByRole('button', { name: '确认首次发布' })); modal = await screen.findByRole('dialog', { name: '确认首次发布' }); fireEvent.click(within(modal).getByRole('button', { name: '创建发布命令' })); await waitFor(() => expect(screen.getByText('发布已完成；新的当前生效版本已聚焦。')).toBeInTheDocument());
    expect(impactPosts).toBe(2); expect(approvalPosts).toBe(2); expect(releasePosts).toBe(2);
    expect(new Set(calls.filter((call) => call.method === 'POST' && call.url.endsWith('/impact-runs')).map((call) => call.body?.impactRunId)).size).toBe(2);
    expect(new Set(calls.filter((call) => call.method === 'POST' && call.url.endsWith('/approvals')).map((call) => call.body?.approvalId)).size).toBe(2);
    expect(new Set(calls.filter((call) => call.method === 'POST' && call.url.endsWith('/releases')).map((call) => call.body?.releaseCommandId)).size).toBe(2);
  });

  it('does not reopen the history drawer after an explicit close', async () => {
    const history = { items: [{ strategyVersionId: versionId, origin: 'system_baseline', status: 'draft', contentDigest: version.contentDigest, baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, impacts: [], approvals: [], releaseEvents: [], createdAt: version.createdAt, updatedAt: version.updatedAt }], total: 1, limit: 20, offset: 0 };
    const activeVersion = { ...version, status: 'active', origin: 'manual' };
    const activeTarget = { ...target, active: activeVersion };
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      const url = new URL(String(input), 'http://system.test');
      if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(activeTarget);
      if (url.pathname.endsWith('/baseline-preview')) return json({ ...baselinePreview, imported: true, strategyVersionId: versionId });
      if (url.pathname.endsWith('/history')) return json(history);
      if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json(version);
      return json(emptyList);
    }));
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('tab', { name: '历史与恢复' }));
    expect(screen.queryByRole('dialog', { name: '逐字段比较与恢复' })).not.toBeInTheDocument();
    const compare = await screen.findByRole('button', { name: '比较' });
    fireEvent.click(compare);
    const drawer = await screen.findByRole('dialog', { name: '逐字段比较与恢复' });
    const tokens = Array.from(drawer.querySelectorAll('.strategy-runtime-value-token')).map((node) => node.textContent?.trim());
    expect(tokens).toContain('350 ms');
    expect(tokens).toContain('0.750000');
    expect(drawer.querySelectorAll('.strategy-runtime-compare-grid .strategy-runtime-fields')).toHaveLength(2);
    fireEvent.keyDown(drawer, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '逐字段比较与恢复' })).not.toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('dialog', { name: '逐字段比较与恢复' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(compare);
  });

  it('clears history selection when the server history page changes', async () => {
    const item = { strategyVersionId: versionId, origin: 'system_baseline', status: 'draft', contentDigest: version.contentDigest, baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, impacts: [], approvals: [], releaseEvents: [], createdAt: version.createdAt, updatedAt: version.updatedAt };
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      const url = new URL(String(input), 'http://system.test'); calls.push(url.pathname + url.search);
      if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(target);
      if (url.pathname.endsWith('/baseline-preview')) return json({ ...baselinePreview, imported: true, strategyVersionId: versionId });
      if (url.pathname.endsWith('/history')) return json(url.searchParams.get('offset') === '20' ? { items: [], total: 21, limit: 20, offset: 20 } : { items: [item], total: 21, limit: 20, offset: 0 });
      if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return json(version);
      return json(emptyList);
    }));
    render(<StrategyPage />);
    fireEvent.click(await screen.findByRole('tab', { name: '历史与恢复' }));
    fireEvent.click(await screen.findByRole('button', { name: '比较' }));
    const drawer = await screen.findByRole('dialog', { name: '逐字段比较与恢复' });
    fireEvent.click(within(drawer).getByRole('button', { name: '关闭详情' }));
    const nextHistoryPage = screen.getAllByRole('button', { name: '下一页' }).find((button) => !button.hasAttribute('disabled'))!;
    fireEvent.click(nextHistoryPage);
    await waitFor(() => expect(screen.getByText('暂无历史版本')).toBeInTheDocument());
    expect(screen.queryByRole('dialog', { name: '逐字段比较与恢复' })).not.toBeInTheDocument();
    expect(calls.some((call) => call.includes('offset=20'))).toBe(true);
  });

  it('drops a late version response after selecting another history identity', async () => {
    const versionB = { ...version, strategyVersionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', contentDigest: 'b'.repeat(64) };
    const history = { items: [{ strategyVersionId: versionId, origin: 'system_baseline', status: 'draft', contentDigest: version.contentDigest, baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, impacts: [], approvals: [], releaseEvents: [], createdAt: version.createdAt, updatedAt: version.updatedAt }, { strategyVersionId: versionB.strategyVersionId, origin: 'system_baseline', status: 'draft', contentDigest: versionB.contentDigest, baseVersionId: null, source: 'system_baseline', evaluationRunId: null, candidateDigest: null, impacts: [], approvals: [], releaseEvents: [], createdAt: version.createdAt, updatedAt: version.updatedAt }], total: 2, limit: 20, offset: 0 };
    let releaseA: (() => void) | undefined;
    vi.stubGlobal('fetch', vi.fn(async (input) => { const url = new URL(String(input), 'http://system.test'); if (url.pathname.endsWith('/runtime-targets/pre_review')) return json(target); if (url.pathname.endsWith('/baseline-preview')) return json(baselinePreview); if (url.pathname.endsWith('/history')) return json(history); if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionId}`)) return new Promise<Response>((resolve) => { releaseA = () => resolve(json(version)); }); if (url.pathname.endsWith(`/runtime-targets/pre_review/versions/${versionB.strategyVersionId}`)) return json(versionB); return json(emptyList); }));
    render(<StrategyPage />); const rows = await screen.findAllByRole('button', { name: /系统初始基线.*草稿/ }); fireEvent.click(rows[0]!); fireEvent.click(rows[1]!);
    await waitFor(() => expect(rows[1]).toHaveAttribute('aria-pressed', 'true')); releaseA?.();
    await new Promise((resolve) => setTimeout(resolve, 0)); expect(rows[1]).toHaveAttribute('aria-pressed', 'true');
  });
});
