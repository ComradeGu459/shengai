import { createHash, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import type { FaultKind, OperationKind, RuntimeMetrics } from './performance-types.js';

type StoredOperation = {
  operation: OperationKind;
  projectId: string;
  resourceId: string;
  requestId: string;
  idempotencyKey: string | null;
  bodyDigest: string;
  status: 'queued' | 'completed' | 'failed';
};

type FaultState = { kind: FaultKind; until: number } | null;

export interface FakePerformanceServer {
  server: Server;
  baseUrl: string;
  setFault(kind: FaultKind | null, durationMs?: number): void;
  metrics(): RuntimeMetrics;
  close(): Promise<void>;
}

const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

const writeJson = (response: ServerResponse, statusCode: number, body: unknown, requestId: string) => {
  const payload = JSON.stringify(body);
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('x-request-id', requestId);
  response.setHeader('content-length', Buffer.byteLength(payload));
  response.end(payload);
};

const readBody = async (request: IncomingMessage): Promise<Buffer> => new Promise((resolve, reject) => {
  const chunks: Buffer[] = [];
  let size = 0;
  request.on('data', (chunk: Buffer | string) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 2_000_000) {
      request.destroy();
      reject(new Error('FAKE_BODY_TOO_LARGE'));
      return;
    }
    chunks.push(buffer);
  });
  request.on('end', () => resolve(Buffer.concat(chunks)));
  request.on('error', reject);
});

const jsonBody = (body: Buffer): Record<string, unknown> => {
  if (body.byteLength === 0) return {};
  try {
    const parsed: unknown = JSON.parse(body.toString('utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
};

const projectFor = (request: IncomingMessage, body?: Record<string, unknown>) => {
  const value = request.headers['x-project-id'] ?? body?.projectId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const requestIdFor = (request: IncomingMessage) => {
  const value = request.headers['x-request-id'];
  return typeof value === 'string' && value.trim() ? value.trim() : `perf-${randomUUID()}`;
};

const idempotencyFor = (request: IncomingMessage, body?: Record<string, unknown>) => {
  const value = request.headers['idempotency-key'] ?? body?.idempotencyKey;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const createFakePerformanceServer = async (): Promise<FakePerformanceServer> => {
  const operations = new Map<string, StoredOperation>();
  const byIdempotency = new Map<string, string>();
  const projectWrites = new Map<string, Set<string>>();
  let queueDepth = 0;
  let activeWorkers = 0;
  let completedTasks = 0;
  let failedTasks = 0;
  let duplicateWrites = 0;
  let crossProjectViolations = 0;
  let pgConnections = 1;
  let pgLocks = 0;
  let pgSlowQueries = 0;
  let fault: FaultState = null;
  let faultTimer: NodeJS.Timeout | null = null;

  const currentFault = () => {
    if (fault && fault.until !== 0 && Date.now() >= fault.until) {
      fault = null;
    }
    return fault?.kind ?? null;
  };

  const setFault = (kind: FaultKind | null, durationMs = 0) => {
    if (faultTimer) clearTimeout(faultTimer);
    fault = kind ? { kind, until: durationMs > 0 ? Date.now() + durationMs : 0 } : null;
    if (!kind || kind !== 'database_disconnect') pgConnections = 1;
    if (kind && durationMs > 0) faultTimer = setTimeout(() => { fault = null; faultTimer = null; }, durationMs);
  };

  const runtimeMetrics = (): RuntimeMetrics => ({
    queueDepth,
    activeWorkers,
    pgConnections,
    pgLocks,
    pgSlowQueries,
    completedTasks,
    failedTasks,
    duplicateWrites,
    storedFacts: operations.size,
    crossProjectViolations,
  });

  const failIfFaulted = async (request: IncomingMessage, response: ServerResponse, requestId: string, body: Record<string, unknown>) => {
    const activeFault = currentFault();
    if (!activeFault) return false;
    if (activeFault === 'worker_exit' && request.url?.startsWith('/api/perf/worker')) {
      writeJson(response, 503, { error: { code: 'WORKER_EXITED', retryable: true, requestId } }, requestId);
      return true;
    }
    if (activeFault === 'database_disconnect') {
      pgConnections = 0;
      writeJson(response, 503, { error: { code: 'DATABASE_UNAVAILABLE', retryable: true, requestId } }, requestId);
      return true;
    }
    if (activeFault === 'rate_limit') {
      writeJson(response, 429, { error: { code: 'RATE_LIMITED', retryable: true, requestId } }, requestId);
      return true;
    }
    if (activeFault === 'server_error') {
      writeJson(response, 500, { error: { code: 'CONTROLLED_SERVER_ERROR', retryable: true, requestId } }, requestId);
      return true;
    }
    if (activeFault === 'timeout') {
      pgSlowQueries += 1;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 2_500);
        response.once('close', () => { clearTimeout(timer); resolve(); });
      });
      if (response.destroyed) return true;
      writeJson(response, 504, { error: { code: 'CONTROLLED_TIMEOUT', retryable: true, requestId } }, requestId);
      return true;
    }
    if (activeFault === 'response_lost') {
      // 写命令继续落唯一事实，然后只断开响应；客户端必须用同一身份 GET 恢复。
      void body;
      return false;
    }
    return false;
  };

  const ensureProject = (projectId: string | null, response: ServerResponse, requestId: string) => {
    if (projectId) return true;
    writeJson(response, 400, { error: { code: 'PROJECT_REQUIRED', retryable: false, requestId } }, requestId);
    return false;
  };

  const handleWrite = (operation: OperationKind, request: IncomingMessage, response: ServerResponse, requestId: string, body: Record<string, unknown>) => {
    const projectId = projectFor(request, body);
    if (!ensureProject(projectId, response, requestId)) return;
    if (!projectId) return;
    const resourceId = typeof body.resourceId === 'string' ? body.resourceId : randomUUID();
    const key = idempotencyFor(request, body);
    const bodyDigest = digest(JSON.stringify({ ...body, projectId }));
    if (key) {
      const dedupeKey = `${projectId}:${key}`;
      const existingId = byIdempotency.get(dedupeKey);
      if (existingId) {
        const existing = operations.get(existingId);
        if (existing?.bodyDigest !== bodyDigest || existing.operation !== operation) {
          duplicateWrites += 1;
          writeJson(response, 409, { error: { code: 'IDEMPOTENCY_CONFLICT', retryable: false, requestId } }, requestId);
          return;
        }
        duplicateWrites += 1;
        writeJson(response, 200, { resourceId: existingId, replay: true, status: existing.status, requestId: existing.requestId }, requestId);
        return;
      }
      byIdempotency.set(dedupeKey, resourceId);
    }
    const existingResource = operations.get(resourceId);
    if (existingResource && existingResource.projectId !== projectId) {
      writeJson(response, 404, { error: { code: 'NOT_FOUND', retryable: false, requestId } }, requestId);
      return;
    }
    if (existingResource) {
      duplicateWrites += 1;
      writeJson(response, 409, { error: { code: 'RESOURCE_ID_REUSED', retryable: false, requestId } }, requestId);
      return;
    }
    const record: StoredOperation = { operation, projectId, resourceId, requestId, idempotencyKey: key, bodyDigest, status: operation === 'task' ? 'queued' : 'completed' };
    operations.set(resourceId, record);
    if (!projectWrites.has(projectId)) projectWrites.set(projectId, new Set());
    projectWrites.get(projectId)?.add(resourceId);
    if (operation === 'task') queueDepth += 1;
    if (currentFault() === 'response_lost') {
      response.destroy();
      return;
    }
    if (operation === 'write' || operation === 'upload') {
      writeJson(response, operation === 'upload' ? 201 : 200, { resourceId, status: record.status, replay: false, requestId }, requestId);
    } else {
      writeJson(response, 202, { resourceId, status: record.status, replay: false, requestId }, requestId);
    }
  };

  const server = createServer(async (request, response) => {
    const requestId = requestIdFor(request);
    const method = request.method ?? 'GET';
    const parsed = new URL(request.url ?? '/', 'http://127.0.0.1');
    let body: Uint8Array = new Uint8Array();
    if (method !== 'GET' && method !== 'HEAD') {
      try { body = await readBody(request); } catch { writeJson(response, 400, { error: { code: 'INVALID_BODY', retryable: false, requestId } }, requestId); return; }
    }
    const parsedBody = jsonBody(Buffer.from(body));
    const faulted = await failIfFaulted(request, response, requestId, parsedBody);
    if (faulted) return;

    if (method === 'GET' && parsed.pathname === '/health') {
      writeJson(response, 200, { status: 'ok', service: 'performance-fake', requestId }, requestId);
      return;
    }
    if (method === 'GET' && parsed.pathname === '/metrics') {
      writeJson(response, 200, { ...runtimeMetrics(), requestId }, requestId);
      return;
    }
    if (method === 'POST' && parsed.pathname === '/__control/fault') {
      const kind = parsedBody.kind;
      if (kind !== null && typeof kind !== 'string') { writeJson(response, 400, { error: { code: 'INVALID_FAULT', retryable: false, requestId } }, requestId); return; }
      setFault(kind as FaultKind | null, typeof parsedBody.durationMs === 'number' ? parsedBody.durationMs : 0);
      writeJson(response, 200, { fault: kind ?? null, requestId }, requestId);
      return;
    }
    if (method === 'GET' && parsed.pathname === '/api/perf/read') {
      const projectId = parsed.searchParams.get('projectId');
      if (!ensureProject(projectId, response, requestId)) return;
      writeJson(response, 200, { projectId, status: 'ok', requestId }, requestId);
      return;
    }
    if (method === 'GET' && parsed.pathname.startsWith('/api/perf/operations/')) {
      const resourceId = parsed.pathname.split('/').pop() ?? '';
      const record = operations.get(resourceId);
      const projectId = parsed.searchParams.get('projectId');
      if (!record || record.projectId !== projectId) {
        writeJson(response, 404, { error: { code: 'NOT_FOUND', retryable: false, requestId } }, requestId);
        return;
      }
      writeJson(response, 200, { resourceId, projectId, operation: record.operation, status: record.status, requestId: record.requestId }, requestId);
      return;
    }
    if (method === 'POST' && parsed.pathname === '/api/perf/write') { handleWrite('write', request, response, requestId, parsedBody); return; }
    if (method === 'POST' && parsed.pathname === '/api/perf/upload') { handleWrite('upload', request, response, requestId, { ...parsedBody, bytes: body.byteLength }); return; }
    if (method === 'POST' && parsed.pathname === '/api/perf/task') { handleWrite('task', request, response, requestId, parsedBody); return; }
    if (method === 'POST' && parsed.pathname === '/api/perf/worker') {
      const projectId = projectFor(request, parsedBody);
      if (!ensureProject(projectId, response, requestId)) return;
      activeWorkers += 1;
      const queued = [...operations.values()].find((item) => item.operation === 'task' && item.projectId === projectId && item.status === 'queued');
      if (!queued) { activeWorkers = Math.max(0, activeWorkers - 1); writeJson(response, 200, { consumed: false, requestId }, requestId); return; }
      queued.status = 'completed';
      queueDepth = Math.max(0, queueDepth - 1);
      completedTasks += 1;
      activeWorkers = Math.max(0, activeWorkers - 1);
      writeJson(response, 200, { consumed: true, resourceId: queued.resourceId, requestId }, requestId);
      return;
    }
    writeJson(response, 404, { error: { code: 'NOT_FOUND', retryable: false, requestId } }, requestId);
  });

  await new Promise<void>((resolve) => server.listen({ host: '127.0.0.1', port: 0 }, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('FAKE_SERVER_ADDRESS_UNAVAILABLE');
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    setFault,
    metrics: runtimeMetrics,
    async close() {
      if (faultTimer) clearTimeout(faultTimer);
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
};
