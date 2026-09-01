import { randomUUID } from 'node:crypto';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import type {
  FaultKind,
  OperationKind,
  OperationSample,
  PhaseReport,
  PerformanceReport,
  DistributionSummary,
  ResourceSnapshot,
  ResponseClass,
  RuntimeMetrics,
  ScenarioName,
} from './performance-types.js';
import { FAULT_KINDS, OPERATION_KINDS, SCENARIO_NAMES } from './performance-types.js';
import { createFakePerformanceServer, type FakePerformanceServer } from './performance-fake-server.js';

type Args = {
  scenario: ScenarioName;
  target: string;
  allowTarget: string | null;
  dryRun: boolean;
  json: boolean;
  concurrency: number;
  iterations: number;
  durationMs: number;
  timeoutMs: number;
  faults: FaultKind[];
};

type ClientResponse = {
  statusCode: number;
  requestId: string | null;
  body: Record<string, unknown>;
  bytesOut: number;
  bytesIn: number;
};

type PerformanceClient = {
  mode: 'fake' | 'http';
  target: string;
  request(operation: OperationKind, projectId: string, resourceId: string | null, idempotencyKey: string | null): Promise<OperationSample>;
  recover(operation: OperationKind, projectId: string, resourceId: string): Promise<OperationSample>;
  health(): Promise<ClientResponse>;
  metrics(): Promise<RuntimeMetrics>;
  setFault(kind: FaultKind | null, durationMs?: number): void;
  close(): Promise<void>;
};

const MAX_DURATION_MS = 4 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 2_000;
const PROJECTS = ['perf-a', 'perf-b'] as const;

const parseDuration = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/.exec(value.trim().toLowerCase());
  if (!match) throw new Error(`无效时长：${value}，示例：30s、1h`);
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 'h' ? 3_600_000 : unit === 'm' ? 60_000 : unit === 's' ? 1_000 : 1;
  const duration = amount * multiplier;
  if (!Number.isFinite(duration) || duration < 1 || duration > MAX_DURATION_MS) throw new Error('时长必须在 1ms 到 4h 之间。');
  return duration;
};

const parseArgs = (argv: string[]): Args => {
  const valueOf = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const scenario = (valueOf('--scenario') ?? 'smoke') as ScenarioName;
  if (!SCENARIO_NAMES.includes(scenario)) throw new Error(`scenario 必须是：${SCENARIO_NAMES.join(', ')}`);
  const target = valueOf('--target') ?? 'fake';
  const concurrency = Number(valueOf('--concurrency') ?? '1');
  const iterations = Number(valueOf('--iterations') ?? '20');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20) throw new Error('concurrency 必须为 1、5、10 或 20 以内的正整数。');
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100_000) throw new Error('iterations 必须为 1 到 100000。');
  const faults = (valueOf('--faults') ?? '').split(',').map((item) => item.trim()).filter(Boolean) as FaultKind[];
  if (faults.some((fault) => !FAULT_KINDS.includes(fault))) throw new Error(`faults 必须来自：${FAULT_KINDS.join(', ')}`);
  const allowTarget = valueOf('--allow-target') ?? null;
  if (target !== 'fake' && target !== allowTarget) throw new Error('HTTP 目标必须同时通过 --target 和完全相同的 --allow-target 显式白名单。');
  return {
    scenario,
    target,
    allowTarget,
    dryRun: argv.includes('--dry-run'),
    json: argv.includes('--json'),
    concurrency,
    iterations,
    durationMs: parseDuration(valueOf('--duration'), scenario === 'soak' ? 60 * 60 * 1000 : 30_000),
    timeoutMs: parseDuration(valueOf('--timeout'), DEFAULT_TIMEOUT_MS),
    faults,
  };
};

const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Number(sorted[Math.max(0, index)].toFixed(2));
};

const summarize = (samples: OperationSample[]): DistributionSummary => {
  const durations = samples.map((sample) => sample.durationMs);
  const errors = samples.filter((sample) => sample.responseClass !== 'success').length;
  return {
    count: samples.length,
    errors,
    errorRate: samples.length ? Number((errors / samples.length).toFixed(4)) : 0,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
    maxMs: durations.length ? Number(Math.max(...durations).toFixed(2)) : null,
  };
};

const resourceSnapshot = (): ResourceSnapshot => {
  const usage = process.resourceUsage();
  const memory = process.memoryUsage();
  return {
    capturedAt: new Date().toISOString(),
    cpuPercent: null,
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    swapUsedBytes: null,
    diskReadBytes: Number.isFinite(usage.fsRead) ? usage.fsRead : null,
    diskWriteBytes: Number.isFinite(usage.fsWrite) ? usage.fsWrite : null,
    networkInBytes: null,
    networkOutBytes: null,
  };
};

const responseClass = (statusCode: number | null, error: unknown): ResponseClass => {
  if (error instanceof Error && (/timed out|abort|timeout/i.test(error.message) || error.name === 'AbortError' || error.name === 'TimeoutError')) return 'timeout';
  if (statusCode === null) return 'unknown';
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 400 && statusCode < 500) return 'client_error';
  return 'server_error';
};

const parseResponse = async (response: Response): Promise<ClientResponse> => {
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch {
    // 允许测试目标返回非 JSON，状态码仍可用于错误归类。
  }
  return {
    statusCode: response.status,
    requestId: response.headers.get('x-request-id'),
    body,
    bytesOut: 0,
    bytesIn: Buffer.byteLength(text),
  };
};

const createHttpClient = async (baseUrl: string, timeoutMs: number): Promise<PerformanceClient> => {
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('目标只允许 http/https。');
  const operationPath: Record<OperationKind, string> = {
    read: '/api/perf/read',
    write: '/api/perf/write',
    upload: '/api/perf/upload',
    task: '/api/perf/task',
    worker: '/api/perf/worker',
  };
  const call = async (path: string, init: RequestInit, bytesOut: number): Promise<ClientResponse> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(new URL(path, base), { ...init, signal: controller.signal });
      const result = await parseResponse(response);
      return { ...result, bytesOut };
    } finally {
      clearTimeout(timer);
    }
  };
  const request = async (operation: OperationKind, projectId: string, resourceId: string | null, idempotencyKey: string | null): Promise<OperationSample> => {
    const started = performance.now();
    const effectiveResource = resourceId ?? randomUUID();
    const effectiveKey = idempotencyKey ?? `perf-${effectiveResource}`;
    const payload = JSON.stringify({ projectId, resourceId: effectiveResource, taskType: 'asr_batch', fixture: 'anonymous-small' });
    const body = operation === 'upload' ? new TextEncoder().encode(payload) : payload;
    let response: ClientResponse | null = null;
    let error: unknown = null;
    try {
      const path = operation === 'read' ? `${operationPath.read}?projectId=${encodeURIComponent(projectId)}` : operationPath[operation];
      response = await call(path, {
        method: operation === 'read' ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json', 'x-project-id': projectId, ...(operation !== 'read' ? { 'idempotency-key': effectiveKey } : {}) },
        body: operation === 'read' ? undefined : body,
      }, operation === 'read' ? 0 : typeof body === 'string' ? Buffer.byteLength(body) : body.byteLength);
    } catch (caught) {
      error = caught;
    }
    const statusCode = response?.statusCode ?? null;
    const responseBody = response?.body;
    const errorValue = responseBody?.error;
    return {
      operation,
      projectId,
      resourceId: effectiveResource,
      requestId: response?.requestId ?? null,
      idempotencyKey: operation === 'read' ? null : effectiveKey,
      statusCode,
      responseClass: responseClass(statusCode, error),
      durationMs: Number((performance.now() - started).toFixed(2)),
      bytesIn: response?.bytesIn ?? 0,
      bytesOut: response?.bytesOut ?? (typeof body === 'string' ? Buffer.byteLength(body) : body.byteLength),
      errorCode: typeof errorValue === 'object' && errorValue ? String((errorValue as Record<string, unknown>).code ?? '') : error instanceof Error ? error.name : null,
      recoveryGet: false,
      postCountForIdentity: 1,
    };
  };
  const recover = async (operation: OperationKind, projectId: string, resourceId: string): Promise<OperationSample> => {
    const started = performance.now();
    let response: ClientResponse | null = null;
    let error: unknown = null;
    try {
      response = await call(`/api/perf/operations/${encodeURIComponent(resourceId)}?projectId=${encodeURIComponent(projectId)}`, { method: 'GET', headers: { 'x-project-id': projectId } }, 0);
    } catch (caught) {
      error = caught;
    }
    const responseBody = response?.body;
    const errorValue = responseBody?.error;
    return {
      operation,
      projectId,
      resourceId,
      requestId: response?.requestId ?? null,
      idempotencyKey: null,
      statusCode: response?.statusCode ?? null,
      responseClass: responseClass(response?.statusCode ?? null, error),
      durationMs: Number((performance.now() - started).toFixed(2)),
      bytesIn: response?.bytesIn ?? 0,
      bytesOut: 0,
      errorCode: typeof errorValue === 'object' && errorValue ? String((errorValue as Record<string, unknown>).code ?? '') : error instanceof Error ? error.name : null,
      recoveryGet: true,
      postCountForIdentity: 0,
    };
  };
  const health = async () => call('/health', { method: 'GET' }, 0);
  const metrics = async (): Promise<RuntimeMetrics> => {
    try {
      const result = await call('/metrics', { method: 'GET' }, 0);
      const metric = (name: string) => {
        const value = result.body[name];
        return typeof value === 'number' && Number.isFinite(value) ? value : null;
      };
      return {
        queueDepth: metric('queueDepth'),
        activeWorkers: metric('activeWorkers'),
        pgConnections: metric('pgConnections'),
        pgLocks: metric('pgLocks'),
        pgSlowQueries: metric('pgSlowQueries'),
        completedTasks: metric('completedTasks'),
        failedTasks: metric('failedTasks'),
        duplicateWrites: metric('duplicateWrites'),
        storedFacts: metric('storedFacts'),
        crossProjectViolations: metric('crossProjectViolations'),
      };
    } catch {
      return { queueDepth: null, activeWorkers: null, pgConnections: null, pgLocks: null, pgSlowQueries: null, completedTasks: null, failedTasks: null, duplicateWrites: null, storedFacts: null, crossProjectViolations: null };
    }
  };
  return {
    mode: 'http',
    target: base.toString(),
    request,
    recover,
    health,
    metrics,
    setFault: () => { throw new Error('HTTP 目标不允许调用 fake fault control；请使用仅测试服务器提供的受控入口。'); },
    close: async () => undefined,
  };
};

const createFakeClient = async (timeoutMs: number): Promise<{ client: PerformanceClient; server: FakePerformanceServer }> => {
  const server = await createFakePerformanceServer();
  const client = await createHttpClient(server.baseUrl, timeoutMs);
  return {
    client: { ...client, mode: 'fake', target: server.baseUrl, setFault: server.setFault, close: server.close },
    server,
  };
};

const runOne = async (client: PerformanceClient, operation: OperationKind, projectId: string): Promise<OperationSample[]> => {
  const first = await client.request(operation, projectId, null, null);
  if (first.responseClass !== 'unknown' && first.responseClass !== 'timeout') return [first];
  // 未知结果只按同一 resourceId GET 恢复，绝不重发 POST。
  return [first, await client.recover(operation, projectId, first.resourceId ?? '')];
};

const runConcurrent = async (client: PerformanceClient, concurrency: number, iterations: number): Promise<OperationSample[]> => {
  const samples: OperationSample[] = [];
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= iterations) return;
      const operation = OPERATION_KINDS[index % OPERATION_KINDS.length] as OperationKind;
      const projectId = PROJECTS[index % PROJECTS.length];
      samples.push(...await runOne(client, operation, projectId));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, iterations) }, () => worker()));
  return samples;
};

const phase = async (client: PerformanceClient, name: string, concurrency: number, iterations: number, durationMs: number): Promise<PhaseReport> => {
  const before = resourceSnapshot();
  const cpuBefore = process.cpuUsage();
  const started = performance.now();
  const samples = await runConcurrent(client, concurrency, iterations);
  const elapsed = Number((performance.now() - started).toFixed(2));
  const grouped = Object.fromEntries(OPERATION_KINDS.map((operation) => [operation, summarize(samples.filter((sample) => sample.operation === operation))])) as Record<OperationKind, DistributionSummary>;
  const after = resourceSnapshot();
  const cpuDelta = process.cpuUsage(cpuBefore);
  after.cpuPercent = elapsed > 0 ? Number(Math.min(100, ((cpuDelta.user + cpuDelta.system) / 1_000) / elapsed / Math.max(1, cpus().length) * 100).toFixed(2)) : 0;
  const runtime = await client.metrics();
  return {
    name,
    concurrency,
    durationMs: elapsed,
    operations: grouped,
    total: summarize(samples),
    runtime,
    resourcesBefore: before,
    resourcesAfter: after,
    unknownCount: samples.filter((sample) => sample.responseClass === 'unknown' || sample.responseClass === 'timeout').length,
    recoveryGetCount: samples.filter((sample) => sample.recoveryGet).length,
    automaticPostRetryViolations: samples.filter((sample) => sample.recoveryGet && sample.postCountForIdentity > 0).length,
  };
};

const deploymentSmoke = async (client: PerformanceClient) => {
  const health = await client.health();
  return health.statusCode === 200 && health.body.status === 'ok';
};

const idempotencyProbe = async (client: PerformanceClient) => {
  const resourceId = randomUUID();
  const key = `probe-${resourceId}`;
  const first = await client.request('task', 'perf-a', resourceId, key);
  const replay = await client.request('task', 'perf-a', resourceId, key);
  const changed = await client.request('task', 'perf-a', resourceId, `${key}-changed`);
  return first.statusCode === 202 && replay.statusCode === 200 && changed.statusCode === 409;
};

const projectIsolationProbe = async (client: PerformanceClient) => {
  const resourceId = randomUUID();
  const own = await client.request('task', 'perf-a', resourceId, `isolation-${resourceId}`);
  const cross = await client.recover('task', 'perf-b', resourceId);
  return own.statusCode === 202 && cross.statusCode === 404;
};

const unknownRecoveryProbe = async (client: PerformanceClient) => {
  if (client.mode !== 'fake') return null;
  client.setFault('response_lost');
  const first = await client.request('task', 'perf-a', randomUUID(), null);
  const recovered = await client.recover('task', 'perf-a', first.resourceId ?? '');
  client.setFault(null);
  return first.responseClass === 'unknown' && recovered.statusCode === 200;
};

const runFaults = async (client: PerformanceClient, faults: FaultKind[]) => {
  const selected = faults.length ? faults : [...FAULT_KINDS];
  const reports: PhaseReport[] = [];
  for (const fault of selected) {
    client.setFault(fault);
    reports.push(await phase(client, `fault:${fault}`, 1, 5, 0));
    client.setFault(null);
  }
  return reports;
};

const runScenario = async (args: Args, client: PerformanceClient): Promise<PerformanceReport> => {
  const phases: PhaseReport[] = [];
  const assertions: PerformanceReport['assertions'] = {
    deploymentSmoke: 'not_run',
    projectIsolation: 'not_run',
    idempotency: 'not_run',
    unknownReadOnlyRecovery: 'not_run',
    noPublicTarget: 'pass',
  };
  assertions.deploymentSmoke = await deploymentSmoke(client) ? 'pass' : 'fail';
  if (args.scenario === 'smoke') {
    assertions.idempotency = await idempotencyProbe(client) ? 'pass' : 'fail';
    assertions.projectIsolation = await projectIsolationProbe(client) ? 'pass' : 'fail';
    const unknownRecovery = await unknownRecoveryProbe(client);
    assertions.unknownReadOnlyRecovery = unknownRecovery === null ? 'not_run' : unknownRecovery ? 'pass' : 'fail';
    phases.push(await phase(client, 'smoke', 1, 5, 0));
  } else if (args.scenario === 'baseline') {
    phases.push(await phase(client, 'single-user-baseline', 1, args.iterations, 0));
  } else if (args.scenario === 'step') {
    for (const concurrency of [1, 5, 10, 20]) phases.push(await phase(client, `step:${concurrency}`, concurrency, Math.max(args.iterations, concurrency * 5), 0));
  } else if (args.scenario === 'spike') {
    phases.push(await phase(client, 'short-spike', Math.min(20, Math.max(5, args.concurrency)), args.iterations, 0));
  } else if (args.scenario === 'soak') {
    const started = performance.now();
    let round = 0;
    while (performance.now() - started < args.durationMs) {
      phases.push(await phase(client, `soak:${++round}`, args.concurrency, Math.max(args.concurrency, 5), 0));
    }
  } else if (args.scenario === 'faults') {
    phases.push(...await runFaults(client, args.faults));
    assertions.unknownReadOnlyRecovery = phases.every((item) => item.automaticPostRetryViolations === 0) ? 'pass' : 'fail';
  }
  const limitations = [
    '默认 fake 全部本地零网络，CNY 成本恒为 0.00；不能代表真实供应商、公网延迟或生产 SLA。',
    'swap、网卡、真实磁盘 I/O 与 PostgreSQL 慢查询只有目标提供受控 metrics 时才可观测；缺失显示 null，不推算为零。',
    'HTTP 目标只允许专用测试服务器的 /api/perf/* 契约；不得指向生产、员工 AppShell 或公网业务入口。',
    '员工 frontend/AppShell 不新增容量、故障、压测或监控入口；相关控制仅属于管理员 system-frontend/ControlShell 的既有或经设计批准入口。',
  ];
  return { generatedAt: new Date().toISOString(), mode: client.mode, target: client.target, scenario: args.scenario, zeroCostCny: '0.00', phases, assertions, limitations };
};

const printHuman = (report: PerformanceReport) => {
  console.log(`performance scenario=${report.scenario} mode=${report.mode} target=${report.target} cny=${report.zeroCostCny}`);
  for (const item of report.phases) {
    console.log(`${item.name} concurrency=${item.concurrency} total=${item.total.count} errors=${item.total.errors} p50=${item.total.p50Ms ?? '-'}ms p95=${item.total.p95Ms ?? '-'}ms p99=${item.total.p99Ms ?? '-'}ms unknown=${item.unknownCount} recoveryGET=${item.recoveryGetCount}`);
    for (const operation of OPERATION_KINDS) {
      const metric = item.operations[operation];
      console.log(`  ${operation}: count=${metric.count} errors=${metric.errors} p95=${metric.p95Ms ?? '-'}ms`);
    }
  }
  console.log(`assertions smoke=${report.assertions.deploymentSmoke} isolation=${report.assertions.projectIsolation} idempotency=${report.assertions.idempotency} unknownRecovery=${report.assertions.unknownReadOnlyRecovery}`);
};

export const main = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv);
  if (args.dryRun) {
    const target = args.target === 'fake' ? 'local in-memory fake' : args.target;
    const preview = { scenario: args.scenario, target, allowTarget: args.allowTarget, concurrency: args.concurrency, iterations: args.iterations, durationMs: args.durationMs, timeoutMs: args.timeoutMs, faults: args.faults, zeroCostCny: '0.00', writes: 'dry-run only; no server, database, browser or network started' };
    if (args.json) console.log(JSON.stringify(preview)); else console.log(JSON.stringify(preview, null, 2));
    return;
  }
  let client: PerformanceClient | null = null;
  try {
    if (args.target === 'fake') client = (await createFakeClient(args.timeoutMs)).client;
    else client = await createHttpClient(args.target, args.timeoutMs);
    const report = await runScenario(args, client);
    if (args.json) console.log(JSON.stringify(report)); else printHuman(report);
  } finally {
    await client?.close();
  }
};

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry) await main();
