/*
THESIS: 术语页是一张由公司 SRT 证据驱动的人工审核台账，任何确认、版本和导出事实都来自后端。
STORY: 项目上下文 → 来源/提取门禁 → 正式筛选表格 → 证据与裁决 → 不可变版本和显式模板导出。
FIRST VIEWPORT: 桌面首屏同时显示项目身份、来源覆盖、待确认门禁、当前模板、筛选栏与候选表。
FORM: Operate 高密度工作台，继承冷灰/白/靛青外壳，不引入术语专属视觉系统。
*/
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublishTermVersionBody, TermCandidate, TermCandidateStatus, TermType } from '@qimao-terms-cloud/contracts';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useParams } from 'react-router';

import { projectModules } from '../../modules.js';
import { getProjectMaterialState } from '../materials/api.js';
import {
  batchDecideTerms,
  createTermDraft,
  decideTermCandidate,
  getTermCandidate,
  getTermWorkspace,
  listTermCandidates,
  listTermExports,
  listTermTemplates,
  listTermVersions,
  publishTermVersion,
  startTermExtraction,
  termExportDownloadUrl,
  TermApiError,
} from './api.js';
import { CandidatePanel, ConfirmDialog, TemplateDialog, termTypes } from './TermsPanels.js';
import styles from './TermsWorkspace.module.css';

const statusLabels: Record<TermCandidateStatus, string> = {
  pending: '待确认', approved: '已确认', edited: '已修改', rejected: '已驳回',
};
const workflowLabels = { draft: '草稿', uploading: '上传中', verifying: '校验中', ready: '就绪', blocked: '阻塞' } as const;
const PAGE_SIZE = 20;

type PanelState =
  | { mode: 'manual' }
  | { mode: 'evidence' | 'edit'; candidateId: string }
  | null;
type SortBy = 'firstEvidence' | 'name' | 'type' | 'status' | 'updatedAt';
type FailedCandidate = { candidate: TermCandidate; action: 'approve' | 'reject' };
type PublishIntent = { signature: string; key: string; body: PublishTermVersionBody };

const newIntent = (current: { signature: string; key: string } | null, signature: string) =>
  current?.signature === signature ? current : { signature, key: crypto.randomUUID() };

const invalidateTerms = async (queryClient: ReturnType<typeof useQueryClient>, projectId: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['term-workspace', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['term-candidates', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['term-versions', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['term-exports', projectId] }),
  ]);
};

const RequestError = ({ error, retry }: { error: Error; retry?: () => void }) => (
  <div className={styles.pageNotice} role="alert">
    <div>
      <strong>{error instanceof TermApiError ? error.code : 'REQUEST_FAILED'}</strong>
      <p>{error.message}</p>
      {error instanceof TermApiError && error.requestId && <small>请求标识：{error.requestId}</small>}
    </div>
    {retry && <button type="button" onClick={retry}>重试读取</button>}
  </div>
);

export const TermsWorkspace = () => {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TermCandidateStatus | ''>('');
  const [type, setType] = useState<TermType | ''>('');
  const [sortBy, setSortBy] = useState<SortBy>('firstEvidence');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [allPendingSelected, setAllPendingSelected] = useState(false);
  const [panel, setPanel] = useState<PanelState>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [batchFailures, setBatchFailures] = useState<Record<string, string>>({});
  const [failedCandidates, setFailedCandidates] = useState<Record<string, FailedCandidate>>({});
  const panelTriggerRef = useRef<HTMLElement | null>(null);
  const templateTriggerRef = useRef<HTMLElement | null>(null);
  const confirmTriggerRef = useRef<HTMLElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const extractionIntent = useRef<{ signature: string; key: string } | null>(null);
  const draftIntent = useRef<{ signature: string; key: string } | null>(null);
  const publishIntent = useRef<PublishIntent | null>(null);

  const materialState = useQuery({
    queryKey: ['project-material-state', projectId],
    queryFn: () => getProjectMaterialState(projectId),
    enabled: Boolean(projectId),
  });
  const workspace = useQuery({
    queryKey: ['term-workspace', projectId],
    queryFn: () => getTermWorkspace(projectId),
    enabled: Boolean(projectId),
    refetchInterval: (query) => query.state.data?.latestRun?.status === 'running' ? 1500 : false,
  });
  const templates = useQuery({ queryKey: ['term-templates'], queryFn: listTermTemplates });
  const draft = workspace.data?.activeDraft;
  const candidates = useQuery({
    queryKey: ['term-candidates', projectId, draft?.id, search, status, type, sortBy, sortDirection, page],
    queryFn: () => listTermCandidates(projectId, {
      draftId: draft!.id,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      sortBy,
      sortDirection,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    enabled: Boolean(draft),
  });
  const versions = useQuery({
    queryKey: ['term-versions', projectId],
    queryFn: () => listTermVersions(projectId),
    enabled: Boolean(workspace.data?.latestVersion),
  });
  const versionForExports = selectedVersionId || workspace.data?.latestVersion?.id || '';
  const exportsQuery = useQuery({
    queryKey: ['term-exports', projectId, versionForExports],
    queryFn: () => listTermExports(projectId, versionForExports),
    enabled: Boolean(versionForExports),
  });
  const sourceReady = workspace.data?.source.status === 'ready';
  const lifecycleReady = materialState.data?.project.lifecycleStatus === 'active';
  const extractionRunning = workspace.data?.latestRun?.status === 'running';
  const canRunExtraction = Boolean(lifecycleReady && sourceReady && workspace.data?.sourceIsCurrent && !extractionRunning);
  const writable = Boolean(draft && canRunExtraction);

  useEffect(() => {
    setPage(0);
    setSelected([]);
    setAllPendingSelected(false);
  }, [search, status, type, sortBy, sortDirection, draft?.id]);

  useEffect(() => {
    setSelected([]);
  }, [page]);

  useEffect(() => {
    if (writable) return;
    setSelected([]);
    setAllPendingSelected(false);
    setConfirmOpen(false);
    setPanel((current) => current?.mode === 'evidence' ? current : null);
  }, [writable]);

  useEffect(() => {
    if (resultMessage) resultRef.current?.focus();
  }, [resultMessage]);

  const activeTemplate = templates.data?.items.find(
    (item) => item.id === templates.data?.activeTemplateVersionId,
  );
  const rows = candidates.data?.items ?? [];
  const pendingRows = rows.filter((row) => row.status === 'pending');
  const selectedRows = pendingRows.filter((row) => selected.includes(row.id));
  const totalPages = Math.max(1, Math.ceil((candidates.data?.total ?? 0) / PAGE_SIZE));

  const openPanel = (next: Exclude<PanelState, null>, trigger: HTMLElement) => {
    if (next.mode !== 'evidence' && !writable) return;
    panelTriggerRef.current = trigger;
    setPanel(next);
  };

  const changed = async (message: string) => {
    setResultMessage(message);
    setSelected([]);
    setAllPendingSelected(false);
    await invalidateTerms(queryClient, projectId);
  };

  const extractionMutation = useMutation({
    mutationFn: async () => {
      const digest = workspace.data?.source.sourceSrtSetDigest ?? '';
      const intent = newIntent(extractionIntent.current, digest);
      extractionIntent.current = intent;
      return startTermExtraction({ projectId, ...(digest ? { expectedSourceSrtSetDigest: digest } : {}), idempotencyKey: intent.key });
    },
    onSuccess: async () => {
      extractionIntent.current = null;
      await changed('已开始从当前公司 SRT 来源建立术语候选。');
    },
  });

  const rowMutation = useMutation({
    mutationFn: ({ candidate, action }: { candidate: TermCandidate; action: 'approve' | 'reject' | 'restore' }) => {
      if (!writable) throw new Error('当前术语草稿为只读状态。');
      if (action !== 'restore' && candidate.status !== 'pending') throw new Error('仅待确认候选可裁决。');
      return decideTermCandidate({ projectId, candidateId: candidate.id, body: { expectedVersion: candidate.version, action } });
    },
    onSuccess: async (_, variables) => {
      setBatchFailures((current) => { const next = { ...current }; delete next[variables.candidate.id]; return next; });
      setFailedCandidates((current) => { const next = { ...current }; delete next[variables.candidate.id]; return next; });
      await changed('候选状态已由后端保存。');
    },
  });

  const failureRetryMutation = useMutation({
    mutationFn: async ({ candidateId, action }: { candidateId: string; action: 'approve' | 'reject' }) => {
      if (!writable) throw new Error('当前术语草稿为只读状态。');
      const latest = await getTermCandidate(projectId, candidateId);
      if (latest.status !== 'pending') throw new Error('该候选已不是待确认状态，请先重新读取。');
      return decideTermCandidate({
        projectId,
        candidateId,
        body: { expectedVersion: latest.version, action },
      });
    },
    onSuccess: async (_, variables) => {
      setBatchFailures((current) => { const next = { ...current }; delete next[variables.candidateId]; return next; });
      setFailedCandidates((current) => { const next = { ...current }; delete next[variables.candidateId]; return next; });
      await changed('失败候选已按最新后端版本重试成功。');
    },
  });

  const partialBatchMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      if (!writable) throw new Error('当前术语草稿为只读状态。');
      return batchDecideTerms(projectId, {
      items: selectedRows.map((candidate) => ({ candidateId: candidate.id, expectedVersion: candidate.version, action })),
      });
    },
    onSuccess: async (result, action) => {
      const failures: Record<string, string> = {};
      const failed: Record<string, FailedCandidate> = {};
      result.items.forEach((item) => {
        if (!item.ok) {
          failures[item.candidateId] = item.error.message;
          const candidate = selectedRows.find((row) => row.id === item.candidateId);
          if (candidate) failed[item.candidateId] = { candidate, action };
        }
      });
      setBatchFailures(failures);
      setFailedCandidates(failed);
      const succeeded = result.items.length - Object.keys(failures).length;
      setResultMessage(Object.keys(failures).length
        ? `批量处理部分完成：${succeeded} 项成功，${Object.keys(failures).length} 项失败。请逐项重试。`
        : `批量处理完成：${succeeded} 项已保存。`);
      setSelected([]);
      await invalidateTerms(queryClient, projectId);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!writable || !workspace.data?.activeDraft || !activeTemplate || !workspace.data.source.sourceSrtSetDigest) {
        throw new Error('确认条件已变化，请重新读取页面。');
      }
      if (publishIntent.current) {
        const released = await publishTermVersion({
          projectId,
          body: publishIntent.current.body,
          idempotencyKey: publishIntent.current.key,
        });
        return { version: released.version, exported: released.export, failures: {}, failed: {}, approved: 0 };
      }
      let workingDraft = workspace.data.activeDraft;
      const pendingCandidates: TermCandidate[] = [];
      if (allPendingSelected) {
        for (let offset = 0; ; offset += 100) {
          const result = await listTermCandidates(projectId, {
            draftId: workingDraft.id,
            status: 'pending',
            sortBy: 'firstEvidence',
            sortDirection: 'asc',
            limit: 100,
            offset,
          });
          pendingCandidates.push(...result.items);
          if (pendingCandidates.length >= result.total) break;
        }
        const failures: Record<string, string> = {};
        const failed: Record<string, FailedCandidate> = {};
        for (let index = 0; index < pendingCandidates.length; index += 100) {
          const batch = pendingCandidates.slice(index, index + 100);
          const result = await batchDecideTerms(projectId, {
            items: batch.map((candidate) => ({ candidateId: candidate.id, expectedVersion: candidate.version, action: 'approve' })),
          });
          result.items.forEach((item) => {
            if (!item.ok) {
              failures[item.candidateId] = item.error.message;
              const candidate = batch.find((row) => row.id === item.candidateId);
              if (candidate) failed[item.candidateId] = { candidate, action: 'approve' };
            }
          });
        }
        if (Object.keys(failures).length) return { failures, failed, approved: pendingCandidates.length - Object.keys(failures).length };
        workingDraft = (await getTermWorkspace(projectId)).activeDraft ?? workingDraft;
      }
      const publishBody: PublishTermVersionBody = {
        draftId: workingDraft.id,
        expectedDraftRevision: workingDraft.revision,
        expectedSourceSrtSetDigest: workspace.data.source.sourceSrtSetDigest,
        templateVersionId: activeTemplate.id,
      };
      const signature = JSON.stringify(publishBody);
      publishIntent.current = { signature, key: crypto.randomUUID(), body: publishBody };
      const released = await publishTermVersion({
        projectId,
        body: publishIntent.current.body,
        idempotencyKey: publishIntent.current.key,
      });
      return { version: released.version, exported: released.export, failures: {}, failed: {}, approved: pendingCandidates.length };
    },
    onSuccess: async (result) => {
      if (Object.keys(result.failures).length) {
        setBatchFailures(result.failures);
        setFailedCandidates(result.failed);
        setResultMessage(`全部采用未完成：${result.approved} 项已采用，${Object.keys(result.failures).length} 项失败。未创建新版本，未生成 XLSX。`);
        setConfirmOpen(false);
        setAllPendingSelected(false);
        await invalidateTerms(queryClient, projectId);
        return;
      }
      if (!('version' in result) || !result.version || !result.exported) return;
      publishIntent.current = null;
      setConfirmOpen(false);
      setAllPendingSelected(false);
      setResultMessage(`术语 V${result.version.version} 已创建，并按 ${result.exported.templateName} · V${result.exported.templateVersion} 生成 XLSX。`);
      setSelectedVersionId(result.version.id);
      await invalidateTerms(queryClient, projectId);
    },
    onError: async (error) => {
      if (!(error instanceof TermApiError) || error.retryable) return;
      publishIntent.current = null;
      await Promise.all([
        invalidateTerms(queryClient, projectId),
        queryClient.invalidateQueries({ queryKey: ['term-templates'] }),
      ]);
    },
  });

  const newDraftMutation = useMutation({
    mutationFn: async () => {
      if (!workspace.data?.latestVersion || !workspace.data.source.sourceSrtSetDigest) throw new Error('当前没有可作为基础的术语版本。');
      const body = {
        baseTermVersionId: workspace.data.latestVersion.id,
        expectedSourceSrtSetDigest: workspace.data.source.sourceSrtSetDigest,
      };
      draftIntent.current = newIntent(draftIntent.current, JSON.stringify(body));
      return createTermDraft({ projectId, body, idempotencyKey: draftIntent.current.key });
    },
    onSuccess: async () => {
      draftIntent.current = null;
      await changed('已基于最新不可变版本建立新草稿。');
    },
  });

  const canConfirm = Boolean(writable && activeTemplate);
  const loading = materialState.isLoading || workspace.isLoading || templates.isLoading;
  const loadError = materialState.error ?? workspace.error ?? templates.error;

  if (loading) return <PageState title="正在读取术语草稿与来源状态" detail="正在核对公司 SRT 来源、人工审核状态和公司导出模板。" />;
  if (loadError) return <PageState title="术语工作台读取失败" detail={loadError.message} action={<button type="button" onClick={() => { materialState.refetch(); workspace.refetch(); templates.refetch(); }}>重试读取</button>} />;
  if (!workspace.data || !materialState.data || !templates.data) return null;

  const project = materialState.data.project;
  const openConfirm = (trigger: HTMLElement) => {
    confirmTriggerRef.current = trigger;
    setConfirmOpen(true);
  };

  return (
    <section className={styles.page}>
      <div className={styles.projectContext}>
        <div>
          <Link to="/projects">← 返回项目中心</Link>
          <strong title={project.name}>{project.name}</strong>
          <span className={styles.projectStatus}>{workflowLabels[project.workflowStatus]}</span>
        </div>
        <nav aria-label="项目工作台模块">
          {projectModules.map((module) => module.status === 'active' ? (
            <Link key={module.id} to={module.route.replace(':projectId', projectId)} aria-current={module.id === 'project-terms' ? 'page' : undefined}>{module.title}</Link>
          ) : <span key={module.id} aria-disabled="true">{module.title}</span>)}
        </nav>
      </div>

      <section className={styles.sourceSummary} aria-label="术语来源摘要">
        <div><span>公司 SRT 来源</span><strong>{workspace.data.source.episodeCount} 集 · {workspace.data.source.assetCount} 份素材</strong></div>
        <div><span>提取状态</span><strong>{workspace.data.latestRun?.status === 'running' ? '提取中' : workspace.data.latestRun?.status === 'failed' ? '提取失败' : draft ? '可审核' : '待建立草稿'}</strong></div>
        <div><span>待确认</span><strong>{draft?.pendingCount ?? 0} 项</strong></div>
        <div><span>当前模板</span><strong>{activeTemplate ? `${activeTemplate.name} · V${activeTemplate.version}` : '未配置'}</strong></div>
        <button ref={templateTriggerRef as RefObject<HTMLButtonElement>} type="button" onClick={() => setTemplateOpen(true)}>{writable ? '管理模板' : '查看模板'}</button>
        {draft && draft.pendingCount === 0 && canConfirm && <button ref={confirmTriggerRef as RefObject<HTMLButtonElement>} className={styles.primaryButton} type="button" onClick={(event) => openConfirm(event.currentTarget)}>确认并导出</button>}
      </section>

      {!lifecycleReady && <div className={styles.pageNotice} role="alert"><div><strong>项目当前不可编辑</strong><p>项目已进入回收或清理生命周期，术语页只保留后端历史事实。</p></div></div>}
      {!sourceReady && <div className={styles.pageNotice} role="alert"><div><strong>公司 SRT 尚未就绪</strong><p>{workspace.data.source.issueDetail ?? '请先完成整剧公司 SRT 素材确认。'}</p></div><Link to={`/projects/${projectId}/materials`}>返回概览与素材</Link></div>}
      {sourceReady && !workspace.data.sourceIsCurrent && <div className={`${styles.pageNotice} ${styles.warningNotice}`} role="alert"><div><strong>公司 SRT 内容已变化</strong><p>当前草稿、证据与历史版本保留为只读事实，不能继续写入或发布。</p></div></div>}
      {workspace.data.latestRun?.status === 'failed' && <RequestError error={new TermApiError(workspace.data.latestRun.errorCode ?? 'TERM_EXTRACTION_FAILED', 'retry_extraction', workspace.data.latestRun.requestId, true, workspace.data.latestRun.errorDetail ?? '术语提取失败。')} {...(canRunExtraction ? { retry: () => extractionMutation.mutate() } : {})} />}
      {(extractionMutation.error || newDraftMutation.error) && <RequestError error={(extractionMutation.error ?? newDraftMutation.error)!} />}

      {sourceReady && !draft && workspace.data.latestRun?.status !== 'running' && !workspace.data.latestVersion && (
        <PageState title="尚未建立术语草稿" detail="将从当前已确认的公司 SRT 来源建立候选；本地适配器不会触发真实 AI 或付费调用。" action={canRunExtraction ? <button type="button" disabled={extractionMutation.isPending} onClick={() => extractionMutation.mutate()}>开始提取术语</button> : undefined} />
      )}
      {workspace.data.latestRun?.status === 'running' && <PageState title="正在提取术语候选" detail={`请求标识：${workspace.data.latestRun.requestId}。页面会自动读取后端运行状态。`} loading />}

      {!draft && workspace.data.latestVersion && workspace.data.latestRun?.status !== 'running' && (
        <section className={styles.versionOnly}>
          <div><strong>当前不可变术语版本 V{workspace.data.latestVersion.version}</strong><p>{workspace.data.latestVersion.itemCount} 项 · {new Date(workspace.data.latestVersion.createdAt).toLocaleString('zh-CN')}</p></div>
          {canRunExtraction && <button type="button" disabled={newDraftMutation.isPending} onClick={() => newDraftMutation.mutate()}>基于此版本建立新草稿</button>}
        </section>
      )}

      {resultMessage && <div ref={resultRef} className={styles.resultMessage} role="status" tabIndex={-1}>{resultMessage}</div>}
      {Object.keys(batchFailures).length > 0 && (
        <section className={styles.failureList} aria-label="待恢复的失败候选">
          {Object.entries(batchFailures).map(([candidateId, reason]) => {
            const failure = failedCandidates[candidateId];
            if (!failure) return null;
            return (
              <div key={candidateId}>
                <span><strong>{failure.candidate.name}</strong><small>{reason}</small></span>
                {writable && <button type="button" disabled={failureRetryMutation.isPending} onClick={() => failureRetryMutation.mutate({ candidateId, action: failure.action })}>重试</button>}
              </div>
            );
          })}
        </section>
      )}

      {draft && (
        <>
          {writable && (selected.length || allPendingSelected) ? (
            <div className={styles.batchBar}>
              <div><strong>{allPendingSelected ? `已选择全部 ${draft.pendingCount} 项待确认候选` : `已选择当前页 ${selected.length} 项`}</strong><span>{allPendingSelected ? '范围独立于当前搜索与筛选。' : '逐项保存，局部失败不会回滚已成功项。'}</span></div>
              <div>
                {!allPendingSelected && selectedRows.length > 0 && draft.pendingCount > selectedRows.length && <button type="button" onClick={() => { setAllPendingSelected(true); setSelected([]); }}>选择全部 {draft.pendingCount} 项待确认候选</button>}
                {!allPendingSelected && <button type="button" disabled={!selectedRows.length || partialBatchMutation.isPending} onClick={() => partialBatchMutation.mutate('reject')}>批量驳回</button>}
                {!allPendingSelected && <button className={styles.primaryButton} type="button" disabled={!selectedRows.length || partialBatchMutation.isPending} onClick={() => partialBatchMutation.mutate('approve')}>批量确认</button>}
                {allPendingSelected && <button className={styles.primaryButton} type="button" disabled={!canConfirm} onClick={(event) => openConfirm(event.currentTarget)}>全部采用并导出 XLSX</button>}
                <button type="button" onClick={() => { setSelected([]); setAllPendingSelected(false); }}>取消选择</button>
              </div>
            </div>
          ) : (
            <div className={styles.toolbar}>
              <label className={styles.searchField}><span className="sr-only">搜索名称或别称</span><input type="search" value={search} placeholder="搜索名称或别称" onChange={(event) => setSearch(event.target.value)} /></label>
              <label>状态<select value={status} onChange={(event) => setStatus(event.target.value as TermCandidateStatus | '')}><option value="">全部状态</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>类型<select value={type} onChange={(event) => setType(event.target.value as TermType | '')}><option value="">全部类型</option>{termTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>排序<select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}><option value="firstEvidence">首次证据</option><option value="name">名称</option><option value="type">类型</option><option value="status">状态</option><option value="updatedAt">更新时间</option></select></label>
              <button type="button" onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')} aria-label={`当前${sortDirection === 'asc' ? '升序' : '降序'}，切换排序方向`}>{sortDirection === 'asc' ? '升序 ↑' : '降序 ↓'}</button>
              {writable && <button type="button" onClick={(event) => openPanel({ mode: 'manual' }, event.currentTarget)}>人工新增</button>}
            </div>
          )}

          {candidates.error && <RequestError error={candidates.error} retry={() => candidates.refetch()} />}
          <div className={styles.tableFrame}>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr>
                  <th><input type="checkbox" aria-label="选择当前页待确认候选" disabled={!writable || pendingRows.length === 0} checked={pendingRows.length > 0 && pendingRows.every((row) => selected.includes(row.id))} onChange={(event) => setSelected(event.target.checked ? pendingRows.map((row) => row.id) : [])} /></th>
                  <th>术语</th><th>类型</th><th>别称 / 备注</th><th>首次证据</th><th>状态</th><th>更新时间</th><th>操作</th>
                </tr></thead>
                <tbody>
                  {rows.map((candidate) => (
                    <tr key={candidate.id}>
                      <td><input type="checkbox" aria-label={`选择 ${candidate.name}`} disabled={!writable || candidate.status !== 'pending'} checked={selected.includes(candidate.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} /></td>
                      <td><button className={styles.termName} type="button" onClick={(event) => openPanel({ mode: 'evidence', candidateId: candidate.id }, event.currentTarget)}>{candidate.name}</button><small>{candidate.origin === 'manual' ? '人工新增' : '提取候选'}</small></td>
                      <td>{candidate.type}</td>
                      <td><span>{candidate.aliases.join('、') || '—'}</span><small>{candidate.note || '无备注'}</small></td>
                      <td><button className={styles.evidenceButton} type="button" onClick={(event) => openPanel({ mode: 'evidence', candidateId: candidate.id }, event.currentTarget)}>第 {candidate.firstEvidence.episodeNumber} 集 · 第 {candidate.firstEvidence.cueIndex} 轴<br />{candidate.evidenceCount} 条证据</button></td>
                      <td><span className={`${styles.statusTag} ${styles[candidate.status]}`}>{statusLabels[candidate.status]}</span></td>
                      <td>{new Date(candidate.updatedAt).toLocaleDateString('zh-CN')}</td>
                      <td className={styles.rowActions}>
                        {writable && candidate.status === 'pending' ? <button type="button" onClick={() => rowMutation.mutate({ candidate, action: 'approve' })}>确认</button> : null}
                        {writable && (candidate.status === 'pending' || candidate.status === 'rejected') && <details><summary aria-label={`${candidate.name} 更多操作`}>•••</summary><div>
                          {candidate.status === 'pending' && <button type="button" onClick={(event) => openPanel({ mode: 'edit', candidateId: candidate.id }, event.currentTarget)}>编辑</button>}
                          {candidate.status === 'pending' && <button type="button" onClick={() => rowMutation.mutate({ candidate, action: 'reject' })}>驳回</button>}
                          {candidate.status === 'rejected' && <button type="button" onClick={() => rowMutation.mutate({ candidate, action: 'restore' })}>恢复</button>}
                        </div></details>}
                      </td>
                    </tr>
                  ))}
                  {!candidates.isLoading && rows.length === 0 && <tr><td colSpan={8} className={styles.emptyCell}>{draft.candidateCount === 0 ? `公司 SRT 已完整扫描，没有提取到可审核术语${writable ? '；仍可人工新增。' : '。'}` : '当前搜索或筛选没有匹配候选。'}</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className={styles.tableFooter}><span>共 {candidates.data?.total ?? 0} 项 · 默认按正式类型优先级与首次证据排序</span><div><button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>上一页</button><span>{page + 1} / {totalPages}</span><button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)}>下一页</button></div></footer>
          </div>
        </>
      )}

      {workspace.data.latestVersion && (
        <section className={styles.exportHistory}>
          <header><div><span>不可变版本与历史导出</span><strong>刷新后从后端恢复原始绑定</strong></div><label>术语版本<select value={versionForExports} onChange={(event) => setSelectedVersionId(event.target.value)}>{versions.data?.items.map((item) => <option key={item.id} value={item.id}>V{item.version} · {item.itemCount} 项</option>)}</select></label></header>
          {exportsQuery.isLoading && <p>正在读取该版本的历史导出绑定…</p>}
          {exportsQuery.error && <RequestError error={exportsQuery.error} retry={() => exportsQuery.refetch()} />}
          {exportsQuery.data?.items.map((item) => <div key={item.id}><span><strong>{item.templateName} · 模板 V{item.templateVersion}</strong><small>{item.columns.map((column) => column.header).join(' / ')} · {new Date(item.createdAt).toLocaleString('zh-CN')}</small></span><a href={termExportDownloadUrl(projectId, item.id)}>下载原历史 XLSX</a></div>)}
          {exportsQuery.data?.items.length === 0 && <p>该术语版本尚无导出绑定；不会按当前模板自动重建。</p>}
        </section>
      )}

      {panel && draft && <CandidatePanel projectId={projectId} draftId={draft.id} draftRevision={draft.revision} mode={panel.mode} {...('candidateId' in panel ? { candidateId: panel.candidateId } : {})} writable={writable} returnFocus={panelTriggerRef} onClose={() => setPanel(null)} onChanged={() => changed('术语候选已由后端保存。')} />}
      {templateOpen && <TemplateDialog data={templates.data} writable={writable} returnFocus={templateTriggerRef} onClose={() => setTemplateOpen(false)} onChanged={() => setResultMessage('公司导出模板状态已更新。')} />}
      {confirmOpen && canConfirm && draft && activeTemplate && <ConfirmDialog
        title={allPendingSelected ? '全部采用并导出 XLSX？' : '确认当前草稿并导出？'}
        description={`${workspace.data.source.episodeCount} 集公司 SRT · ${allPendingSelected ? `${draft.pendingCount} 项待确认将逐项采用` : '当前没有待确认项'}。`}
        detail={`将创建不可变术语 V${(workspace.data.latestVersion?.version ?? 0) + 1}，并绑定 ${activeTemplate.name} · V${activeTemplate.version}。任一候选失败时不会创建版本或文件。`}
        confirmLabel={allPendingSelected ? '全部采用并导出 XLSX' : '确认并导出'}
        pending={confirmMutation.isPending}
        error={confirmMutation.error}
        returnFocus={confirmTriggerRef}
        onConfirm={() => confirmMutation.mutate()}
        onClose={() => setConfirmOpen(false)}
      />}
    </section>
  );
};

const PageState = ({ title, detail, action, loading = false }: { title: string; detail: string; action?: React.ReactNode; loading?: boolean }) => (
  <div className={styles.pageState} role={title.includes('失败') ? 'alert' : 'status'}>
    {loading && <span className={styles.spinner} aria-hidden="true" />}
    <strong>{title}</strong><p>{detail}</p>{action}
  </div>
);
