import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  SystemControlConnectionTest,
  SystemControlConnectionTestStatus,
  SystemControlEngineCapability,
  SystemControlEngineDeployment,
  SystemControlEngineDeploymentVersion,
  SystemControlEngineDetail,
  SystemControlEngineExecutionKind,
  SystemControlScreenTextRuntimeConfig,
  SystemControlEngineStatus,
  SystemControlTermProviderPreset,
} from '@qimao-terms-cloud/contracts';
import { Badge, CommandRecovery, EmptyBlock, ErrorBlock, Field, LoadingBlock, Modal, STATUS_TEXT, formatDate, useAsyncRead } from './controlPrimitives.js';
import { ControlApiError, createEngine, createStableId, createTest, createVersion, getEngine, getEngineStatusCommand, getTest, getVersion, isUnknownResult, listEngines, listTests, listVersions, setEngineStatus } from './systemApi.js';
import { listSecretReferences } from './secretApi.js';

const PAGE_SIZE = 20;
const makeKey = () => createStableId();
type PendingRecovery = { kind: 'deployment' | 'version' | 'test' | 'status'; source?: 'command' | 'history'; deploymentId?: string; versionId?: string; testRunId?: string; statusCommandId?: string; targetStatus?: SystemControlEngineStatus };

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';
const TERM_CATEGORY_ORDER = ['人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件'] as const;
const DEFAULT_TERM_PROMPT = '你是影视字幕术语抽取器。只返回 JSON 对象，不要 Markdown、解释或代码围栏。';
const SCREEN_TEXT_ADAPTER_KEY = 'screen_text_openvino_ppocrv6_small' as const;
const SCREEN_TEXT_FRAME_INTERVAL_MIN_MS = 250;
const SCREEN_TEXT_FRAME_INTERVAL_MAX_MS = 10_000;
const SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS = 1_000;
const SCREEN_TEXT_MAX_FRAMES_MIN = 1;
const SCREEN_TEXT_MAX_FRAMES_MAX = 600;
const SCREEN_TEXT_MAX_FRAMES_DEFAULT = 600;
const capabilityLabel = (capability: SystemControlEngineCapability) => capability === 'asr' ? '语音识别' : capability === 'screen_text' ? '画面字识别' : '术语提取';
type SecretReferenceItem = Awaited<ReturnType<typeof listSecretReferences>>['items'][number];

const PageButtons = ({ offset, total, onChange }: { offset: number; total: number; onChange: (next: number) => void }) => <div className="cp-pagination"><span>{total === 0 ? '0 条' : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} / ${total}`}</span><button className="cp-secondary" type="button" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))}>上一页</button><button className="cp-secondary" type="button" disabled={offset + PAGE_SIZE >= total} onClick={() => onChange(offset + PAGE_SIZE)}>下一页</button></div>;

const TermRuntimeFields = () => {
  const [preset, setPreset] = useState<SystemControlTermProviderPreset>('deepseek-v4-flash');
  const [endpoint, setEndpoint] = useState(DEEPSEEK_ENDPOINT);
  const [model, setModel] = useState(DEEPSEEK_MODEL);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([...TERM_CATEGORY_ORDER]);
  useEffect(() => {
    if (preset === 'deepseek-v4-flash') {
      setEndpoint(DEEPSEEK_ENDPOINT);
      setModel(DEEPSEEK_MODEL);
    } else {
      setEndpoint('');
      setModel('');
    }
  }, [preset]);
  const moveCategory = (index: number, direction: -1 | 1) => setCategoryOrder((current) => {
    const next = index + direction;
    if (next < 0 || next >= current.length) return current;
    const reordered = [...current];
    [reordered[index], reordered[next]] = [reordered[next]!, reordered[index]!];
    return reordered;
  });
  return <fieldset className="cp-subcard"><legend>术语 Provider 配置</legend><div className="cp-form-grid"><Field label="术语 preset"><select aria-label="术语 preset" name="termPreset" value={preset} onChange={(event) => setPreset(event.target.value as SystemControlTermProviderPreset)}><option value="deepseek-v4-flash">DeepSeek V4 Flash</option><option value="custom">自定义 OpenAI-compatible</option></select></Field><Field label="endpoint" hint={preset === 'deepseek-v4-flash' ? 'DeepSeek preset 使用固定 HTTPS endpoint。' : '必须是 HTTPS endpoint。'}><input aria-label="术语 endpoint" name="termEndpoint" value={endpoint} readOnly={preset === 'deepseek-v4-flash'} onChange={(event) => setEndpoint(event.target.value)} required /></Field><Field label="model" hint={preset === 'deepseek-v4-flash' ? 'DeepSeek preset 使用固定 model。' : ''}><input aria-label="术语 model" name="termModel" value={model} readOnly={preset === 'deepseek-v4-flash'} onChange={(event) => setModel(event.target.value)} required /></Field></div><Field label="术语 prompt"><textarea aria-label="术语 prompt" name="termPrompt" defaultValue={DEFAULT_TERM_PROMPT} required maxLength={20000} rows={4} /></Field><input type="hidden" name="termCategoryOrder" value={categoryOrder.join('\u001f')} /><div className="cp-category-order"><strong>八类处理顺序</strong><ol aria-label="术语八类顺序">{categoryOrder.map((category, index) => <li key={category}><span>{index + 1}. {category}</span><span className="cp-row-actions"><button className="cp-link" type="button" aria-label={`上移 ${category}`} onClick={() => moveCategory(index, -1)} disabled={index === 0}>上移</button><button className="cp-link" type="button" aria-label={`下移 ${category}`} onClick={() => moveCategory(index, 1)} disabled={index === categoryOrder.length - 1}>下移</button></span></li>)}</ol></div></fieldset>;
};

const runtimeNumberError = (label: string, value: string, min: number, max: number, unit: string) => {
  if (!value.trim()) return `${label}不能为空。`;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? null : `${label}必须是 ${min}–${max} ${unit}范围内的整数。`;
};

const ScreenTextRuntimeFields = ({ initial }: { initial?: SystemControlScreenTextRuntimeConfig | undefined }) => {
  const [frameIntervalMs, setFrameIntervalMs] = useState(String(initial?.frameIntervalMs ?? SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS));
  const [maxFramesPerEpisode, setMaxFramesPerEpisode] = useState(String(initial?.maxFramesPerEpisode ?? SCREEN_TEXT_MAX_FRAMES_DEFAULT));
  const frameError = runtimeNumberError('抽帧间隔', frameIntervalMs, SCREEN_TEXT_FRAME_INTERVAL_MIN_MS, SCREEN_TEXT_FRAME_INTERVAL_MAX_MS, '毫秒');
  const maxFramesError = runtimeNumberError('每集最大帧数', maxFramesPerEpisode, SCREEN_TEXT_MAX_FRAMES_MIN, SCREEN_TEXT_MAX_FRAMES_MAX, '帧');
  return <fieldset className="cp-subcard" aria-label="OpenVINO 抽帧配置"><legend>OpenVINO 抽帧配置</legend><p className="cp-notice">本页只保存抽帧策略；并发量、项目并发和队列上限继续在路由容量页配置。</p><div className="cp-form-grid"><Field label="抽帧间隔（毫秒）"><input aria-label="抽帧间隔（毫秒）" name="frameIntervalMs" type="number" inputMode="numeric" min={SCREEN_TEXT_FRAME_INTERVAL_MIN_MS} max={SCREEN_TEXT_FRAME_INTERVAL_MAX_MS} step="1" required value={frameIntervalMs} aria-invalid={Boolean(frameError)} aria-describedby="screen-text-frame-interval-hint" onChange={(event) => { const next = event.target.value; setFrameIntervalMs(next); event.currentTarget.setCustomValidity(runtimeNumberError('抽帧间隔', next, SCREEN_TEXT_FRAME_INTERVAL_MIN_MS, SCREEN_TEXT_FRAME_INTERVAL_MAX_MS, '毫秒') ?? ''); }} /><small id="screen-text-frame-interval-hint" className={frameError ? 'cp-field-error' : undefined} style={frameError ? { color: '#aa3a2c' } : undefined} role={frameError ? 'alert' : undefined}>{frameError ?? `每隔 ${SCREEN_TEXT_FRAME_INTERVAL_MIN_MS}–${SCREEN_TEXT_FRAME_INTERVAL_MAX_MS} 毫秒取一帧，默认 ${SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS} 毫秒。`}</small></Field><Field label="每集最大帧数"><input aria-label="每集最大帧数" name="maxFramesPerEpisode" type="number" inputMode="numeric" min={SCREEN_TEXT_MAX_FRAMES_MIN} max={SCREEN_TEXT_MAX_FRAMES_MAX} step="1" required value={maxFramesPerEpisode} aria-invalid={Boolean(maxFramesError)} aria-describedby="screen-text-max-frames-hint" onChange={(event) => { const next = event.target.value; setMaxFramesPerEpisode(next); event.currentTarget.setCustomValidity(runtimeNumberError('每集最大帧数', next, SCREEN_TEXT_MAX_FRAMES_MIN, SCREEN_TEXT_MAX_FRAMES_MAX, '帧') ?? ''); }} /><small id="screen-text-max-frames-hint" className={maxFramesError ? 'cp-field-error' : undefined} style={maxFramesError ? { color: '#aa3a2c' } : undefined} role={maxFramesError ? 'alert' : undefined}>{maxFramesError ?? `每集允许 ${SCREEN_TEXT_MAX_FRAMES_MIN}–${SCREEN_TEXT_MAX_FRAMES_MAX} 帧，默认 ${SCREEN_TEXT_MAX_FRAMES_DEFAULT} 帧。`}</small></Field></div></fieldset>;
};

const SecretReferenceChoice = ({ items, name = 'secretReferenceVersionId', valuePrefix = '', includeActions = false }: { items: SecretReferenceItem[]; name?: string; valuePrefix?: string; includeActions?: boolean }) => <Field label="Secret 引用" hint="只绑定服务端返回的脱敏引用版本，不接收 Secret 原文。"><select aria-label="Secret 引用" name={name} defaultValue={includeActions ? 'inherit' : ''}>{includeActions ? <><option value="inherit">继承上一版本</option><option value="clear">明确清除</option></> : <option value="">不绑定 Secret</option>}{items.filter((item) => item.latestVersionId && (item.latestStatus === 'available' || item.latestStatus === 'rotation_due')).map((item) => <option key={item.latestVersionId} value={`${valuePrefix}${item.latestVersionId!}`}>{includeActions ? '替换为：' : ''}{item.displayName}{item.latestStatus === 'rotation_due' ? '（待轮换）' : ''}</option>)}</select></Field>;

const EngineRow = ({ item, onOpen, onStatus }: { item: SystemControlEngineDeployment; onOpen: () => void; onStatus: (target: SystemControlEngineStatus) => void }) => <tr><td><button className="cp-link" type="button" onClick={onOpen}>{item.displayName}</button><small>{item.deploymentId}</small></td><td>{capabilityLabel(item.capability)}</td><td>{item.provider} · {item.adapterKey}</td><td>{item.latestVersion ? `v${item.latestVersion}` : '暂无版本'}</td><td><Badge value={item.status} /></td><td><button className="cp-secondary" type="button" onClick={() => onStatus(item.status === 'enabled' ? 'disabled' : 'enabled')}>{item.status === 'enabled' ? '停用' : '启用'}</button></td></tr>;

const RuntimeConfigSummary = ({ runtimeConfig }: { runtimeConfig: NonNullable<SystemControlEngineDeploymentVersion['runtimeConfig']> }) => runtimeConfig.preset === SCREEN_TEXT_ADAPTER_KEY
  ? <div className="cp-definition"><div><dt>抽帧 preset</dt><dd><code>{runtimeConfig.preset}</code></dd></div><div><dt>抽帧间隔</dt><dd>{runtimeConfig.frameIntervalMs} 毫秒 / 帧</dd></div><div><dt>每集最大帧数</dt><dd>{runtimeConfig.maxFramesPerEpisode} 帧</dd></div><div><dt>并发配置</dt><dd>由路由容量页面统一管理</dd></div></div>
  : <div className="cp-definition"><div><dt>preset</dt><dd>{runtimeConfig.preset}</dd></div><div><dt>endpoint</dt><dd><code>{runtimeConfig.endpoint}</code></dd></div><div><dt>prompt</dt><dd>{runtimeConfig.prompt}</dd></div><div><dt>八类顺序</dt><dd>{runtimeConfig.categoryOrder.join(' → ')}</dd></div></div>;

const VersionSummary = ({ version, selected, onSelect, onTest, testBusy, testBlocked }: { version: SystemControlEngineDeploymentVersion; selected: boolean; onSelect: () => void; onTest: () => void; testBusy: boolean; testBlocked: boolean }) => <article className={`cp-subcard ${selected ? 'selected' : ''}`}><div className="cp-row-between"><button className="cp-link" type="button" onClick={onSelect}>v{version.version}</button><span>{version.model} · {version.language}</span></div>{version.runtimeConfig ? <RuntimeConfigSummary runtimeConfig={version.runtimeConfig} /> : null}<div className="cp-muted">创建于 {formatDate(version.createdAt)} · 配置摘要 {version.configDigest.slice(0, 12)}…</div><div className="cp-row-actions"><span>{version.secretReference.present ? `密钥：${version.secretReference.redactedLabel ?? '已脱敏'}` : '不需要密钥'}</span><button className="cp-secondary" type="button" onClick={onSelect}>查看测试历史</button><button className="cp-secondary" type="button" onClick={onTest} disabled={testBusy || testBlocked} title={testBlocked ? '该版本已有排队、运行中或未知测试' : undefined}>{testBusy ? '提交中…' : '运行连接测试'}</button></div></article>;
const TestRow = ({ item, pending, busy, onQuery }: { item: SystemControlConnectionTest; pending: boolean; busy: boolean; onQuery: () => void }) => <tr><td>{formatDate(item.queuedAt)}</td><td><Badge value={item.status} /></td><td>{item.attemptCount}</td><td>{item.latencyMs === null ? '—' : `${item.latencyMs} ms`}</td><td><span>{item.reasonMessage ?? '—'}</span><small>{item.requestId}</small>{item.status === 'unknown' ? pending ? <CommandRecovery kind="test" identity={item.testRunId} onRecover={onQuery} busy={busy} /> : <button className="cp-primary" type="button" onClick={onQuery}>查询本次测试结果</button> : null}</td></tr>;

const RegistrationFields = ({ secretItems }: { secretItems: SecretReferenceItem[] }) => {
  const [capability, setCapability] = useState<SystemControlEngineCapability>('asr');
  const [adapterKey, setAdapterKey] = useState('');
  useEffect(() => { setAdapterKey(capability === 'terms' ? 'terms_api' : ''); }, [capability]);
  const openvinoSelected = capability === 'screen_text' && adapterKey.trim() === SCREEN_TEXT_ADAPTER_KEY;
  return <><div className="cp-form-grid"><Field label="显示名称"><input name="displayName" required maxLength={200} /></Field><Field label="能力"><select name="capability" value={capability} onChange={(event) => setCapability(event.target.value as SystemControlEngineCapability)}><option value="asr">语音识别</option><option value="screen_text">画面字识别</option><option value="terms">术语提取</option></select></Field><Field label="执行方式">{capability === 'terms' ? <><input aria-label="执行方式" value="云 API" readOnly /><input type="hidden" name="executionKind" value="cloud_api" /></> : <select name="executionKind" defaultValue="cloud_api"><option value="cloud_api">云 API</option><option value="self_hosted_worker">自建 Worker</option></select>}</Field><Field label="服务端 Registry 组件" hint="必须是后端已登记的受控组件，浏览器不生成模型事实"><input name="adapterKey" required maxLength={120} placeholder={capability === 'terms' ? 'terms_api' : '由服务端 Registry 校验'} value={adapterKey} onChange={(event) => setAdapterKey(event.target.value)} /></Field></div>{capability === 'terms' ? <><TermRuntimeFields /><SecretReferenceChoice items={secretItems} /></> : <><div className="cp-form-grid"><Field label="端点引用（可选）"><input name="endpointReference" maxLength={255} /></Field><Field label="区域提示（可选）"><input name="regionHint" maxLength={120} /></Field></div>{openvinoSelected ? <ScreenTextRuntimeFields /> : null}</>}</>;
};

export const EnginesPage = ({ onNavigateSecurity }: { onNavigateSecurity?: () => void } = {}) => {
  const [search, setSearch] = useState('');
  const [capability, setCapability] = useState('');
  const [status, setStatus] = useState('');
  const [engineOffset, setEngineOffset] = useState(0);
  const [versionOffset, setVersionOffset] = useState(0);
  const [testOffset, setTestOffset] = useState(0);
  const [testStatus, setTestStatus] = useState('');
  const [selected, setSelected] = useState<SystemControlEngineDeployment | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<SystemControlEngineDeploymentVersion | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showVersion, setShowVersion] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ deployment: SystemControlEngineDeployment; target: SystemControlEngineStatus } | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [testNotice, setTestNotice] = useState('');
  const [pendingRecovery, setPendingRecovery] = useState<PendingRecovery | null>(null);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const query = useMemo(() => { const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(engineOffset) }); if (search.trim()) params.set('search', search.trim()); if (capability) params.set('capability', capability); if (status) params.set('status', status); return params.toString(); }, [search, capability, status, engineOffset]);
  const engines = useAsyncRead((signal) => listEngines(query, signal), [query]);
  const detail = useAsyncRead((signal) => selected ? getEngine(selected.deploymentId, signal) : Promise.resolve<SystemControlEngineDetail | null>(null), [selected?.deploymentId]);
  const versions = useAsyncRead((signal) => selected ? listVersions(selected.deploymentId, `limit=${PAGE_SIZE}&offset=${versionOffset}`, signal) : Promise.resolve({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 }), [selected?.deploymentId, versionOffset]);
  const testsQuery = useMemo(() => { const params = new URLSearchParams({ deploymentVersionId: selectedVersion?.versionId ?? '', limit: String(PAGE_SIZE), offset: String(testOffset) }); if (testStatus) params.set('status', testStatus); return params.toString(); }, [selectedVersion?.versionId, testOffset, testStatus]);
  const tests = useAsyncRead((signal) => selectedVersion ? listTests(testsQuery, signal) : Promise.resolve({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 }), [selectedVersion?.versionId, testsQuery]);
  const bindableSecretsQuery = useMemo(() => { const params = new URLSearchParams({ limit: '100', offset: '0', sort: 'validation_desc' }); if (showRegister) params.set('capability', 'terms'); else if (selected) { params.set('capability', selected.capability); params.set('provider', selected.provider); } else params.set('capability', 'terms'); return params.toString(); }, [showRegister, selected?.capability, selected?.provider]);
  const bindableSecrets = useAsyncRead((signal) => (showVersion && selected) || showRegister ? listSecretReferences(bindableSecretsQuery, signal) : Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }), [showVersion, showRegister, selected?.deploymentId, bindableSecretsQuery]);
  useEffect(() => { setEngineOffset(0); setSelected(null); setSelectedVersion(null); }, [search, capability, status]);
  useEffect(() => { setSelected(null); setSelectedVersion(null); }, [engineOffset]);
  useEffect(() => { setVersionOffset(0); setTestOffset(0); }, [selected?.deploymentId]);
  useEffect(() => { setSelectedVersion(null); }, [versionOffset]);
  useEffect(() => { setTestOffset(0); }, [selectedVersion?.versionId, testStatus]);
  const refreshAuthority = async () => { await Promise.all([engines.reload(), detail.reload(), versions.reload(), tests.reload()]); };
  const failWrite = async (error: unknown, pending: PendingRecovery | null) => { setActionError(error); if (isUnknownResult(error)) { setPendingRecovery(pending); return; } setPendingRecovery(null); await refreshAuthority(); };
  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    const form = new FormData(event.currentTarget);
    const deploymentId = createStableId();
    const versionId = createStableId();
    try {
      const capability = form.get('capability') as SystemControlEngineCapability;
      const base = {
        deploymentId,
        versionId,
        capability,
        executionKind: form.get('executionKind') as SystemControlEngineExecutionKind,
        displayName: String(form.get('displayName') ?? ''),
        adapterKey: String(form.get('adapterKey') ?? ''),
      };
      const openvinoSelected = capability === 'screen_text' && base.adapterKey.trim() === SCREEN_TEXT_ADAPTER_KEY;
      const body: Parameters<typeof createEngine>[0] = capability === 'terms'
        ? {
          ...base,
          model: String(form.get('termModel') || ''),
          runtimeConfig: {
            preset: String(form.get('termPreset') || 'deepseek-v4-flash') as SystemControlTermProviderPreset,
            endpoint: String(form.get('termEndpoint') || ''),
            prompt: String(form.get('termPrompt') || ''),
            categoryOrder: String(form.get('termCategoryOrder') || '').split('\u001f').filter(Boolean),
          },
          ...(String(form.get('secretReferenceVersionId') || '') ? { secretReferenceVersionId: String(form.get('secretReferenceVersionId')) } : {}),
        }
        : {
          ...base,
          ...(openvinoSelected ? {
            runtimeConfig: {
              preset: SCREEN_TEXT_ADAPTER_KEY,
              frameIntervalMs: Number(form.get('frameIntervalMs') ?? SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS),
              maxFramesPerEpisode: Number(form.get('maxFramesPerEpisode') ?? SCREEN_TEXT_MAX_FRAMES_DEFAULT),
            },
          } : {}),
          ...(String(form.get('endpointReference') || '') ? { endpointReference: String(form.get('endpointReference')) } : {}),
          ...(String(form.get('regionHint') || '') ? { regionHint: String(form.get('regionHint')) } : {}),
        };
      await createEngine(body, makeKey());
      setShowRegister(false);
      await engines.reload();
    } catch (error) {
      if (isUnknownResult(error)) setShowRegister(false);
      await failWrite(error, { kind: 'deployment', deploymentId, versionId });
    } finally { setBusy(false); }
  };
  const addVersion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    const form = new FormData(event.currentTarget);
    const versionId = createStableId();
    try {
      const isTerms = selected.capability === 'terms';
      const isOpenvino = selected.capability === 'screen_text' && selected.adapterKey === SCREEN_TEXT_ADAPTER_KEY;
      const secretValue = String(form.get('secret') || 'inherit');
      const secret = secretValue.startsWith('replace:') ? { action: 'replace' as const, secretReferenceVersionId: secretValue.slice('replace:'.length) } : { action: secretValue as 'inherit' | 'clear' };
      const body: Parameters<typeof createVersion>[1] = isTerms
        ? {
          versionId,
          model: String(form.get('termModel') || ''),
          runtimeConfig: {
            preset: String(form.get('termPreset') || 'deepseek-v4-flash') as SystemControlTermProviderPreset,
            endpoint: String(form.get('termEndpoint') || ''),
            prompt: String(form.get('termPrompt') || ''),
            categoryOrder: String(form.get('termCategoryOrder') || '').split('\u001f').filter(Boolean),
          },
          secret,
        }
        : {
          versionId,
          ...(isOpenvino ? {
            runtimeConfig: {
              preset: SCREEN_TEXT_ADAPTER_KEY,
              frameIntervalMs: Number(form.get('frameIntervalMs') ?? SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS),
              maxFramesPerEpisode: Number(form.get('maxFramesPerEpisode') ?? SCREEN_TEXT_MAX_FRAMES_DEFAULT),
            },
          } : {}),
          ...(String(form.get('endpointReference') || '') ? { endpointReference: String(form.get('endpointReference')) } : {}),
          ...(String(form.get('regionHint') || '') ? { regionHint: String(form.get('regionHint')) } : {}),
          secret,
        };
      await createVersion(selected.deploymentId, body, makeKey());
      setShowVersion(false);
      await Promise.all([versions.reload(), detail.reload()]);
    } catch (error) {
      if (isUnknownResult(error)) setShowVersion(false);
      await failWrite(error, { kind: 'version', deploymentId: selected.deploymentId, versionId });
    } finally { setBusy(false); }
  };
  const runTest = async (version: SystemControlEngineDeploymentVersion) => {
    setSelectedVersion(version);
    setBusy(true);
    setActionError(null);
    setTestNotice('');
    let testRunId: string | null = null;
    try {
      const activeResults = await Promise.all((['queued', 'running', 'unknown'] as const).map((status) => listTests(new URLSearchParams({ deploymentVersionId: version.versionId, status, limit: String(PAGE_SIZE), offset: '0' }).toString())));
      const activeTests = activeResults.flatMap((result) => result.items);
      if (activeTests.length) {
        const statuses = Array.from(new Set(activeTests.map((item) => STATUS_TEXT[item.status] ?? item.status))).join('、');
        setTestNotice(`服务端已有该版本的连接测试：${statuses}；未提交新的测试命令。`);
        return;
      }
      testRunId = createStableId();
      await createTest({ testRunId, deploymentVersionId: version.versionId }, makeKey());
      await tests.reload();
    } catch (error) {
      if (testRunId) await failWrite(error, { kind: 'test', testRunId });
      else { setActionError(error); setPendingRecovery(null); }
    } finally { setBusy(false); }
  };
  const changeStatus = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!statusTarget) return; setBusy(true); setActionError(null); const statusCommandId = createStableId(); try { await setEngineStatus(statusTarget.deployment.deploymentId, { statusCommandId, status: statusTarget.target }, makeKey()); setStatusTarget(null); setPendingRecovery(null); await refreshAuthority(); feedback.current?.focus(); } catch (error) { if (isUnknownResult(error)) setPendingRecovery({ kind: 'status', statusCommandId, targetStatus: statusTarget.target, deploymentId: statusTarget.deployment.deploymentId }); else { setStatusTarget(null); await failWrite(error, null); } } finally { setBusy(false); } };
  const executeRecovery = async (recovery: PendingRecovery) => { const recoveryKind = recovery.kind; setBusy(true); setActionError(null); try { if (recoveryKind === 'deployment' && recovery.deploymentId) { const found = await getEngine(recovery.deploymentId); setSelected(found.deployment); } else if (recoveryKind === 'version' && recovery.deploymentId && recovery.versionId) setSelectedVersion(await getVersion(recovery.deploymentId, recovery.versionId)); else if (recoveryKind === 'test' && recovery.testRunId) await getTest(recovery.testRunId); else if (recoveryKind === 'status' && recovery.statusCommandId) await getEngineStatusCommand(recovery.statusCommandId); setPendingRecovery(null); if (recoveryKind === 'status') setStatusTarget(null); if (recoveryKind === 'test' && recovery.source === 'history') tests.reload(() => feedback.current?.focus()); else { await refreshAuthority(); feedback.current?.focus(); } } catch (error) { setActionError(error); } finally { setBusy(false); } };
  const recover = async () => { if (pendingRecovery) await executeRecovery(pendingRecovery); };
  const queryHistoricalTest = (testRunId: string) => { const recovery: PendingRecovery = { kind: 'test', source: 'history', testRunId }; setActionError(null); setPendingRecovery(recovery); void executeRecovery(recovery); };
  const statusError = actionError instanceof ControlApiError && actionError.code === 'SYSTEM_CONTROL_ENGINE_DISABLED_ACTIVE_ROUTE' ? '请先切换当前路由，再停用此部署。' : null;
  const latestRuntimeConfig = detail.data?.latestVersion?.runtimeConfig;
  const initialScreenTextRuntime = latestRuntimeConfig?.preset === SCREEN_TEXT_ADAPTER_KEY ? latestRuntimeConfig : undefined;
  return <div className="cp-page" data-testid="engines-page"><header className="cp-page-head"><div><h1 ref={titleRef} tabIndex={-1}>引擎与 API</h1><p>只读取已登记的 EngineDeployment、不可变版本与零网络连接测试。</p></div><button className="cp-primary" type="button" onClick={() => setShowRegister(true)}>登记引擎部署</button></header>
    <section className="cp-toolbar"><input aria-label="搜索引擎" placeholder="搜索显示名称或组件" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="能力筛选" value={capability} onChange={(event) => setCapability(event.target.value)}><option value="">全部能力</option><option value="asr">语音识别</option><option value="screen_text">画面字识别</option><option value="terms">术语提取</option></select><select aria-label="部署状态筛选" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option value="enabled">可用于草稿</option><option value="disabled">已停用</option></select>{!engines.error ? <button className="cp-secondary" type="button" onClick={() => void engines.reload()} disabled={engines.refreshing}>重新读取</button> : null}</section>
    <div ref={feedback} tabIndex={-1} className="cp-feedback" role="status" aria-live="polite">{pendingRecovery ? '存在未确定的写命令，请查询同一稳定 ID。' : actionError ? '操作失败，已保留服务端错误事实。' : testNotice}</div>
    {actionError ? <><ErrorBlock error={actionError} showRetry={false} focusOnMount={!pendingRecovery} title="操作失败，服务端事实未被伪造。" />{statusError ? <div className="cp-notice">{statusError}</div> : null}</> : null}{pendingRecovery && !statusTarget && pendingRecovery.kind !== 'test' && pendingRecovery.source !== 'history' ? <CommandRecovery kind={pendingRecovery.kind} identity={pendingRecovery.testRunId ?? pendingRecovery.statusCommandId ?? pendingRecovery.deploymentId ?? pendingRecovery.versionId ?? 'unknown'} onRecover={() => void recover()} busy={busy} /> : null}
    {engines.error ? <ErrorBlock error={engines.error} stale={Boolean(engines.data)} onRetry={() => engines.reload(() => titleRef.current?.focus())} busy={engines.refreshing} focusOnMount /> : null}{engines.loading && !engines.data ? <LoadingBlock /> : engines.data?.items.length === 0 ? <EmptyBlock title="暂无引擎部署" detail="服务端尚未登记可用的 EngineDeployment；请通过明确的登记动作创建。" /> : engines.data ? <><div className="cp-table-wrap"><table className="cp-table"><thead><tr><th>显示名称 / ID</th><th>能力</th><th>服务端组件</th><th>最新版本</th><th>状态</th><th>动作</th></tr></thead><tbody>{engines.data.items.map((item) => <EngineRow key={item.deploymentId} item={item} onOpen={() => { setSelected(item); setSelectedVersion(null); }} onStatus={(target) => { setActionError(null); setStatusTarget({ deployment: item, target }); }} />)}</tbody></table></div><PageButtons offset={engines.data.offset} total={engines.data.total} onChange={setEngineOffset} /></> : null}
    {selected ? <aside className="cp-drawer" aria-label="引擎详情"><div className="cp-drawer-head"><div><h2>{detail.data?.deployment.displayName ?? selected.displayName}</h2><span>{selected.deploymentId}</span></div><button className="cp-icon-button" type="button" aria-label="关闭详情" onClick={() => setSelected(null)}>×</button></div>{detail.error ? <ErrorBlock error={detail.error} stale={Boolean(detail.data)} onRetry={() => detail.reload(() => titleRef.current?.focus())} busy={detail.refreshing} /> : null}{detail.loading && !detail.data ? <LoadingBlock /> : detail.data ? <><div className="cp-detail-grid"><div><span>能力</span><strong>{detail.data.deployment.capability}</strong></div><div><span>提供方</span><strong>{detail.data.deployment.provider}</strong></div><div><span>组件</span><strong>{detail.data.deployment.adapterKey}</strong></div><div><span>状态</span><Badge value={detail.data.deployment.status} /></div></div><div className="cp-section-head"><h3>不可变版本</h3><button className="cp-secondary" type="button" onClick={() => setShowVersion(true)}>新增版本</button></div>{versions.error ? <ErrorBlock error={versions.error} stale={Boolean(versions.data)} onRetry={() => versions.reload(() => titleRef.current?.focus())} busy={versions.refreshing} /> : null}{versions.loading && !versions.data ? <LoadingBlock /> : versions.data?.items.length ? <>{versions.data.items.map((version) => <VersionSummary key={version.versionId} version={version} selected={selectedVersion?.versionId === version.versionId} onSelect={() => setSelectedVersion(version)} onTest={() => void runTest(version)} testBusy={busy} testBlocked={selectedVersion?.versionId === version.versionId && (tests.loading || Boolean(tests.data?.items.some((item) => item.status === 'queued' || item.status === 'running' || item.status === 'unknown')))} />)}<PageButtons offset={versions.data.offset} total={versions.data.total} onChange={setVersionOffset} /></> : <EmptyBlock title="暂无版本" detail="创建部署时的首个版本尚未读取到。" />}<div className="cp-section-head"><h3>连接测试历史</h3><div className="cp-row-actions"><select aria-label="测试状态筛选" value={testStatus} onChange={(event) => setTestStatus(event.target.value)}><option value="">全部测试状态</option>{(['queued', 'running', 'succeeded', 'failed', 'unknown'] as SystemControlConnectionTestStatus[]).map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>{pendingRecovery?.kind === 'test' && pendingRecovery.source !== 'history' ? <CommandRecovery kind="test" identity={pendingRecovery.testRunId ?? 'unknown'} onRecover={() => void recover()} busy={busy} /> : null}{selectedVersion ? tests.error ? <ErrorBlock error={tests.error} stale={Boolean(tests.data)} onRetry={() => tests.reload(() => titleRef.current?.focus())} busy={tests.refreshing} /> : tests.loading && !tests.data ? <LoadingBlock /> : tests.data?.items.length ? <><div className="cp-table-wrap"><table className="cp-table"><thead><tr><th>排队时间</th><th>状态</th><th>尝试</th><th>延迟</th><th>结果 / requestId</th></tr></thead><tbody>{tests.data.items.map((test) => <TestRow key={test.testRunId} item={test} pending={pendingRecovery?.source === 'history' && pendingRecovery.testRunId === test.testRunId} busy={busy} onQuery={() => queryHistoricalTest(test.testRunId)} />)}</tbody></table></div><PageButtons offset={tests.data.offset} total={tests.data.total} onChange={setTestOffset} /></> : <EmptyBlock title="暂无测试记录" detail="选择任意版本查看真实测试历史；排队/运行/未知状态不会重复创建。" /> : <p className="cp-muted">选择版本查看该版本真实测试历史。</p>}</> : null}</aside> : null}
    {showRegister ? <Modal title="登记引擎部署" onClose={() => setShowRegister(false)} onSubmit={register} busy={busy} submitLabel="登记并创建首版"><RegistrationFields secretItems={bindableSecrets.data?.items ?? []} /><p className="cp-notice">模型、语言、能力快照由服务端 Registry 派生；密钥只接受服务端脱敏引用，不在此表单回显原文。</p>{bindableSecrets.loading ? <LoadingBlock label="读取可绑定 Secret 引用…" /> : bindableSecrets.error ? <ErrorBlock error={bindableSecrets.error} stale={Boolean(bindableSecrets.data)} onRetry={() => bindableSecrets.reload()} busy={bindableSecrets.refreshing} /> : null}</Modal> : null}
    {showVersion && selected ? <Modal title="新增不可变版本" onClose={() => setShowVersion(false)} onSubmit={addVersion} busy={busy} submitLabel="创建版本">{selected.capability === 'terms' ? <><TermRuntimeFields /><SecretReferenceChoice items={bindableSecrets.data?.items ?? []} name="secret" valuePrefix="replace:" includeActions /></> : <><div className="cp-form-grid"><Field label="端点引用（可选）"><input name="endpointReference" maxLength={255} /></Field><Field label="区域提示（可选）"><input name="regionHint" maxLength={120} /></Field><Field label="密钥语义" hint="只列出服务端返回且当前可绑定的同能力、同提供方引用版本"><select name="secret" defaultValue="inherit"><option value="inherit">继承上一版本</option><option value="clear">明确清除</option>{bindableSecrets.data?.items.filter((item) => item.latestVersionId && (item.latestStatus === 'available' || item.latestStatus === 'rotation_due')).map((item) => <option key={item.secretReferenceId} value={`replace:${item.latestVersionId}`}>替换为：{item.displayName}{item.latestStatus === 'rotation_due' ? '（待轮换）' : ''}</option>)}</select></Field></div>{selected.adapterKey === SCREEN_TEXT_ADAPTER_KEY ? <ScreenTextRuntimeFields initial={initialScreenTextRuntime} /> : null}</>}{bindableSecrets.loading ? <LoadingBlock label="读取可绑定安全引用…" /> : bindableSecrets.error ? <ErrorBlock error={bindableSecrets.error} stale={Boolean(bindableSecrets.data)} onRetry={() => bindableSecrets.reload()} busy={bindableSecrets.refreshing} /> : null}<div className="cp-notice"><p>不需要密钥时使用“明确清除”；替换只绑定不可变引用版本，不接收或保存 Secret 原文。</p>{bindableSecrets.data && bindableSecrets.data.total > bindableSecrets.data.items.length ? <p>服务端可用引用超过当前页，请前往“密钥与安全”缩小范围后再创建版本。</p> : null}<button className="cp-link" type="button" onClick={onNavigateSecurity}>前往“密钥与安全”</button></div></Modal> : null}
    {statusTarget ? <Modal title={`${statusTarget.target === 'disabled' ? '停用' : '启用'}部署`} onClose={() => { if (!busy && !pendingRecovery) setStatusTarget(null); }} onSubmit={changeStatus} busy={busy} locked={busy || pendingRecovery?.kind === 'status'} submitLabel="确认状态变更"><p className="cp-notice">部署状态变化由服务端命令决定；目标状态：{statusTarget.target === 'disabled' ? '已停用' : '可用于草稿'}。网络未知时只查询同一 statusCommandId。</p>{pendingRecovery?.kind === 'status' ? <CommandRecovery kind="status" identity={pendingRecovery.statusCommandId ?? 'unknown'} onRecover={() => void recover()} busy={busy} /> : null}</Modal> : null}
  </div>;
};
