import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  createProductionS3ConfigFromEnv,
  type ProductionS3CompatibleStorageConfig,
} from '../modules/storage/s3-compatible-storage.js';

const TOKEN_HEADER = 'x-ros-probe-token';
const TOKEN_MIN_LENGTH = 43;
const TOKEN_MAX_LENGTH = 4096;
const MAX_TTL_SECONDS = 10 * 60;
const FIRST_PART_SIZE_BYTES = 16 * 1024 * 1024;
const LAST_PART_SIZE_BYTES = 1024;
const RESULT_BODY_LIMIT_BYTES = 32 * 1024;
const PROBE_PREFIX = '/__ros-probe';

type S3ClientLike = { send(command: unknown): Promise<unknown> };
type PresignPart = (command: UploadPartCommand, expiresInSeconds: number) => Promise<string>;
type AnonymousGet = (url: string) => Promise<number>;

export type RosBrowserProbeConfig = ProductionS3CompatibleStorageConfig;

export type RosBrowserProbeOptions = {
  token: string;
  ttlSeconds?: number;
  host?: '127.0.0.1' | string;
  port?: number;
  config?: RosBrowserProbeConfig;
  client?: S3ClientLike;
  presignPart?: PresignPart;
  anonymousGet?: AnonymousGet;
  now?: () => number;
  onTerminalSummary?: (summary: RosBrowserProbeSummary) => void | Promise<void>;
};

export type RosBrowserProbeStartupReason =
  | 'TOKEN_WEAK'
  | 'LOOPBACK_ONLY'
  | 'TTL_INVALID'
  | 'PORT_INVALID'
  | 'CONFIG_INVALID'
  | 'LISTEN_ERROR'
  | 'RUNTIME_ERROR';

export type RosBrowserProbeLifecycle =
  | { event: 'listening'; host: '127.0.0.1'; port: number }
  | { event: 'startup_blocked'; reason: RosBrowserProbeStartupReason };

export const createListeningLifecycle = (address: { host: string; port: number }): RosBrowserProbeLifecycle => ({
  event: 'listening',
  host: '127.0.0.1',
  port: address.port,
});

export const createStartupBlockedLifecycle = (reason: RosBrowserProbeStartupReason): RosBrowserProbeLifecycle => ({
  event: 'startup_blocked',
  reason,
});

export const classifyStartupReason = (error: unknown): RosBrowserProbeStartupReason => {
  const value = error as { message?: unknown; code?: unknown } | null;
  const identifier = value && typeof value === 'object'
    ? (typeof value.code === 'string' ? value.code : typeof value.message === 'string' ? value.message : '')
    : '';
  switch (identifier) {
    case 'ROS_PROBE_TOKEN_WEAK': return 'TOKEN_WEAK';
    case 'ROS_PROBE_LOOPBACK_ONLY': return 'LOOPBACK_ONLY';
    case 'ROS_PROBE_TTL_INVALID': return 'TTL_INVALID';
    case 'ROS_PROBE_PORT_INVALID': return 'PORT_INVALID';
    case 'ROS_PROBE_CONFIG_INVALID': return 'CONFIG_INVALID';
    case 'ROS_PROBE_LISTEN_ERROR':
    case 'EADDRINUSE':
    case 'EACCES':
    case 'EADDRNOTAVAIL':
      return 'LISTEN_ERROR';
    default: return 'RUNTIME_ERROR';
  }
};

export type RosBrowserProbeSummary = {
  status: 'pass' | 'blocked';
  browserPut: boolean;
  etag: boolean;
  sdk: {
    create: boolean;
    presign: boolean;
    listParts: boolean;
    complete: boolean;
    head: boolean;
    privateRead: boolean;
    delete: boolean;
    abort: boolean;
  };
  elapsedMs: number;
  cleanup: { abortCount: number; deleteCount: number; residual: number };
};

export type RosBrowserProbeResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export type RosBrowserProbeRequest = {
  method: string;
  url: string;
  headers?: Record<string, string | undefined>;
  body?: Uint8Array | string;
};

export type RosBrowserProbeServer = {
  start(): Promise<{ host: string; port: number }>;
  stop(): Promise<RosBrowserProbeSummary>;
  expire(): Promise<RosBrowserProbeSummary>;
  dispatch(request: RosBrowserProbeRequest): Promise<RosBrowserProbeResponse>;
  summary(): RosBrowserProbeSummary;
  basePath: string;
};

type ProbePart = { partNumber: number; sizeBytes: number; url: string; headers: Record<string, string> };
type BrowserPartResult = { partNumber: number; sizeBytes: number; etag: string; checksumValue: string };
type CapabilityResponse = { expiresAt: string; parts: ProbePart[] };
type ProviderPart = { PartNumber?: number; Size?: number; ETag?: string };

type MutableState = {
  startedAt: number;
  expiresAt: number;
  outcome: 'idle' | 'running' | 'passed' | 'blocked';
  reason: 'none' | 'browser_failure' | 'expired' | 'provider_failure' | 'stopped';
  capabilityAttempted: boolean;
  capability?: CapabilityResponse;
  capabilityPromise?: Promise<CapabilityResponse>;
  initial?: {
    uploadId: string;
    objectKey: string;
    completed: boolean;
    deleted: boolean;
    deleteAttempted: boolean;
    aborted: boolean;
    abortAttempted: boolean;
  };
  abortUpload?: { uploadId: string; objectKey: string; aborted: boolean; abortAttempted: boolean };
  createUnknown: boolean;
  browserPut: boolean;
  etag: boolean;
  sdk: RosBrowserProbeSummary['sdk'];
  abortCount: number;
  deleteCount: number;
  cleanupPromise?: Promise<void>;
  terminalSummary?: RosBrowserProbeSummary;
  terminalSummaryPromise?: Promise<RosBrowserProbeSummary>;
  server?: ReturnType<typeof createServer>;
  expiryTimer?: NodeJS.Timeout;
  signalHandlers?: Array<{ signal: NodeJS.Signals; handler: () => void }>;
};

class ProbeFailure extends Error {
  constructor(readonly statusCode = 409) {
    super('ROS_PROBE_BLOCKED');
  }
}

const isStrongToken = (token: string) =>
  token.length >= TOKEN_MIN_LENGTH && token.length <= TOKEN_MAX_LENGTH && /^[A-Za-z0-9_-]+$/.test(token);

const isValidProbeConfig = (value: RosBrowserProbeConfig) => {
  try {
    const endpoint = new URL(value.endpoint);
    return endpoint.protocol === 'https:'
      && !endpoint.username
      && !endpoint.password
      && endpoint.pathname === '/'
      && !endpoint.search
      && !endpoint.hash
      && /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value.bucket)
      && Boolean(value.region.trim())
      && value.forcePathStyle === true
      && Boolean(value.accessKeyId.trim())
      && Boolean(value.secretAccessKey.trim())
      && Number.isInteger(value.presignTtlSeconds)
      && value.presignTtlSeconds >= 60
      && value.presignTtlSeconds <= 3_600
      && (value.uploadMode === 'server_relay' || value.uploadMode === 'browser_direct');
  } catch {
    return false;
  }
};

const equalToken = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

const providerErrorNames = (error: unknown) => {
  if (!error || typeof error !== 'object') return [];
  const value = error as Record<string, unknown>;
  return [value.name, value.Code, value.code].filter((entry): entry is string => typeof entry === 'string');
};

const isMissingObjectError = (error: unknown) => providerErrorNames(error).some((name) =>
  name === 'NotFound' || name === 'NoSuchKey' || name === 'NoSuchObject',
);

const isMissingUploadError = (error: unknown) => providerErrorNames(error).some((name) => name === 'NoSuchUpload');

const sha256Hex = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const normalizeEtag = (value: string) => value.replace(/^"|"$/g, '');

const responseHeaders = (contentType: string) => ({
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none';",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Type': contentType,
});

const jsonResponse = (statusCode: number, body: unknown): RosBrowserProbeResponse => ({
  statusCode,
  headers: responseHeaders('application/json; charset=utf-8'),
  body: JSON.stringify(body),
});

const blockedResponse = (statusCode = 409) => jsonResponse(statusCode, { error: 'ROS_PROBE_BLOCKED' });

const readHeader = (headers: Record<string, string | undefined>, name: string) => {
  const wanted = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === wanted);
  return entry?.[1] ?? null;
};

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > RESULT_BODY_LIMIT_BYTES) throw new ProbeFailure(413);
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
};

const buildObjectUrl = (endpoint: string, bucket: string, objectKey: string) => {
  const url = new URL(endpoint);
  const prefix = url.pathname.replace(/\/$/, '');
  const encodedKey = objectKey.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  url.pathname = `${prefix}/${encodeURIComponent(bucket)}/${encodedKey}`;
  url.search = '';
  url.hash = '';
  return url.toString();
};

const makePage = () => `<!doctype html>
<html><head><meta charset="utf-8"><title>RUNNING</title></head><body><main><p id="status">RUNNING</p></main>
<script>
(() => {
  const segments = location.pathname.split('/');
  const token = segments[segments.length - 2] || '';
  const base = segments.slice(0, -1).join('/');
  const auth = { '${TOKEN_HEADER}': token };
  const digest = async (bytes) => {
    const hash = await crypto.subtle.digest('SHA-256', await bytes.arrayBuffer());
    return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, '0')).join('');
  };
  const setStatus = (value) => {
    const status = value === 'pass' ? 'PASS' : value === 'blocked' ? 'BLOCKED' : value === 'running' ? 'RUNNING' : 'UNKNOWN';
    document.title = status;
    const element = document.getElementById('status');
    if (element) element.textContent = status;
  };
  const report = async (payload) => {
    try {
      const response = await fetch(base + '/result', { method: 'POST', credentials: 'omit', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
      if (!response.ok) {
        setStatus('unknown');
        return null;
      }
      const summary = await response.json();
      setStatus(summary?.status);
      return summary;
    } catch {
      setStatus('unknown');
      return null;
    }
  };
  const run = async () => {
    try {
      const capabilityResponse = await fetch(base + '/capability', { method: 'POST', credentials: 'omit', headers: auth, cache: 'no-store' });
      if (!capabilityResponse.ok) throw new Error('capability');
      const capability = await capabilityResponse.json();
      const parts = [];
      for (const part of capability.parts) {
        const bytes = new Uint8Array(part.sizeBytes);
        const body = new Blob([bytes], { type: 'application/octet-stream' });
        const response = await fetch(part.url, { method: 'PUT', mode: 'cors', credentials: 'omit', headers: part.headers, body, cache: 'no-store' });
        if (!response.ok) throw new Error('put');
        const etag = response.headers.get('etag') || '';
        if (!etag) throw new Error('etag');
        parts.push({ partNumber: part.partNumber, sizeBytes: part.sizeBytes, etag, checksumValue: await digest(body) });
      }
      await report({ status: 'passed', parts });
    } catch {
      await report({ status: 'failed' });
    }
  };
  void run();
})();
</script></body></html>`;

export const createRosBrowserProbe = (options: RosBrowserProbeOptions): RosBrowserProbeServer => {
  if (!isStrongToken(options.token)) throw new Error('ROS_PROBE_TOKEN_WEAK');
  const host = options.host ?? '127.0.0.1';
  if (host !== '127.0.0.1') throw new Error('ROS_PROBE_LOOPBACK_ONLY');
  const ttlSeconds = options.ttlSeconds ?? MAX_TTL_SECONDS;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > MAX_TTL_SECONDS) throw new Error('ROS_PROBE_TTL_INVALID');
  const port = options.port ?? 0;
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error('ROS_PROBE_PORT_INVALID');
  let config: RosBrowserProbeConfig;
  try {
    config = options.config ?? createProductionS3ConfigFromEnv();
  } catch {
    throw new Error('ROS_PROBE_CONFIG_INVALID');
  }
  if (!isValidProbeConfig(config)) throw new Error('ROS_PROBE_CONFIG_INVALID');
  const client: S3ClientLike = options.client ?? new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const presignPart: PresignPart = options.presignPart ?? ((command, expiresInSeconds) => getSignedUrl(client as S3Client, command, {
    expiresIn: expiresInSeconds,
    signableHeaders: new Set(['content-type']),
  }));
  const anonymousGet: AnonymousGet = options.anonymousGet ?? (async (url) => (await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    headers: { accept: 'application/octet-stream' },
  })).status);
  const now = options.now ?? (() => Date.now());
  const token = options.token;
  const basePath = `${PROBE_PREFIX}/${token}`;
  const state: MutableState = {
    startedAt: now(),
    expiresAt: now() + ttlSeconds * 1000,
    outcome: 'idle',
    reason: 'none',
    capabilityAttempted: false,
    createUnknown: false,
    browserPut: false,
    etag: false,
    sdk: { create: false, presign: false, listParts: false, complete: false, head: false, privateRead: false, delete: false, abort: false },
    abortCount: 0,
    deleteCount: 0,
  };

  const send = async <T>(command: unknown) => await client.send(command) as T;

  const buildSummary = (): RosBrowserProbeSummary => {
    const residual = (state.createUnknown ? 1 : 0)
      + (state.initial && !state.initial.deleted && !state.initial.aborted ? 1 : 0)
      + (state.abortUpload && !state.abortUpload.aborted ? 1 : 0);
    return {
      status: state.outcome === 'passed' && residual === 0 ? 'pass' : 'blocked',
      browserPut: state.browserPut,
      etag: state.etag,
      sdk: { ...state.sdk },
      elapsedMs: Math.max(0, now() - state.startedAt),
      cleanup: { abortCount: state.abortCount, deleteCount: state.deleteCount, residual },
    };
  };

  const notifyTerminalSummary = async (): Promise<RosBrowserProbeSummary> => {
    if (state.terminalSummaryPromise) return state.terminalSummaryPromise;
    state.terminalSummaryPromise = (async () => {
      const terminal = buildSummary();
      state.terminalSummary = terminal;
      try {
        await options.onTerminalSummary?.(terminal);
      } catch {
        // 终态回调是可选观测通道，不能改变探针清理结果。
      }
      return terminal;
    })();
    return state.terminalSummaryPromise;
  };

  const summary = (): RosBrowserProbeSummary => state.terminalSummary ?? buildSummary();

  const deleteAndVerify = async (resource: NonNullable<MutableState['initial']>) => {
    if (resource.deleted) return true;
    if (resource.deleteAttempted) return false;
    resource.deleteAttempted = true;
    try {
      await send(new DeleteObjectCommand({ Bucket: config.bucket, Key: resource.objectKey }));
    } catch {
      return false;
    }
    try {
      await send(new HeadObjectCommand({ Bucket: config.bucket, Key: resource.objectKey }));
      return false;
    } catch (error) {
      if (!isMissingObjectError(error)) return false;
      resource.deleted = true;
      state.deleteCount += 1;
      state.sdk.delete = true;
      return true;
    }
  };

  const abortAndVerify = async (resource: NonNullable<MutableState['abortUpload']> | NonNullable<MutableState['initial']>) => {
    if (resource.aborted) return true;
    if (resource.abortAttempted) return false;
    resource.abortAttempted = true;
    try {
      await send(new AbortMultipartUploadCommand({ Bucket: config.bucket, Key: resource.objectKey, UploadId: resource.uploadId }));
    } catch {
      return false;
    }
    try {
      await send(new ListPartsCommand({ Bucket: config.bucket, Key: resource.objectKey, UploadId: resource.uploadId }));
      return false;
    } catch (error) {
      if (!isMissingUploadError(error)) return false;
      resource.aborted = true;
      state.abortCount += 1;
      state.sdk.abort = true;
      return true;
    }
  };

  const cleanup = async () => {
    if (state.cleanupPromise) return state.cleanupPromise;
    state.cleanupPromise = (async () => {
      if (state.initial && !state.initial.completed && !state.initial.aborted) {
        await abortAndVerify(state.initial);
      }
      if (state.initial?.completed && !state.initial.deleted) {
        await deleteAndVerify(state.initial);
      }
      if (state.abortUpload && !state.abortUpload.aborted) {
        await abortAndVerify(state.abortUpload);
      }
    })();
    return state.cleanupPromise;
  };

  const markBlocked = async (reason: MutableState['reason']) => {
    state.outcome = 'blocked';
    state.reason = reason;
    await cleanup();
    await notifyTerminalSummary();
  };

  const ensureActive = async () => {
    if (now() >= state.expiresAt) {
      await markBlocked('expired');
      throw new ProbeFailure(410);
    }
    if (state.outcome === 'blocked') throw new ProbeFailure();
  };

  const createCapability = async (): Promise<CapabilityResponse> => {
    state.capabilityAttempted = true;
    const objectKey = `ros-probe/${randomUUID()}`;
    let uploadId = '';
    try {
      const output = await send<{ UploadId?: string }>(new CreateMultipartUploadCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ContentType: 'application/octet-stream',
      }));
      uploadId = output.UploadId ?? '';
      if (!uploadId) throw new Error('missing upload id');
      state.initial = { uploadId, objectKey, completed: false, deleted: false, deleteAttempted: false, aborted: false, abortAttempted: false };
      state.sdk.create = true;
      const parts: ProbePart[] = [];
      for (const [partNumber, sizeBytes] of [[1, FIRST_PART_SIZE_BYTES], [2, LAST_PART_SIZE_BYTES]] as const) {
        const command = new UploadPartCommand({
          Bucket: config.bucket,
          Key: objectKey,
          UploadId: uploadId,
          PartNumber: partNumber,
          ContentLength: sizeBytes,
        });
        command.middlewareStack.add((next) => async (args) => {
          const request = args.request as { headers?: Record<string, string> };
          request.headers = { ...(request.headers ?? {}), 'content-type': 'application/octet-stream' };
          return next({ ...args, request });
        }, { step: 'build', name: `ros-probe-content-type-${partNumber}` });
        const url = await presignPart(command, ttlSeconds);
        if (!/^https:\/\//i.test(url)) throw new Error('presign not https');
        parts.push({ partNumber, sizeBytes, url, headers: { 'content-type': 'application/octet-stream' } });
      }
      state.sdk.presign = true;
      state.capability = { expiresAt: new Date(state.expiresAt).toISOString(), parts };
      state.outcome = 'running';
      return state.capability;
    } catch {
      if (!uploadId) state.createUnknown = true;
      await markBlocked('provider_failure');
      throw new ProbeFailure(503);
    }
  };

  const ensureCapability = async () => {
    await ensureActive();
    if (state.capability) return state.capability;
    if (state.capabilityPromise) return state.capabilityPromise;
    if (state.capabilityAttempted) throw new ProbeFailure();
    state.capabilityPromise = createCapability();
    try {
      return await state.capabilityPromise;
    } finally {
      delete state.capabilityPromise;
    }
  };

  const verifyAndCleanup = async (parts: BrowserPartResult[]) => {
    if (!state.initial || !state.capability) throw new ProbeFailure();
    const expected = new Map(state.capability.parts.map((part) => [part.partNumber, part]));
    if (parts.length !== expected.size || parts.some((part) => {
      const target = expected.get(part.partNumber);
      return !target || target.sizeBytes !== part.sizeBytes || !part.etag || !/^[a-f0-9]{64}$/i.test(part.checksumValue);
    })) throw new ProbeFailure(422);
    state.browserPut = true;
    state.etag = parts.every((part) => Boolean(part.etag));
    const listed = await send<{ Parts?: ProviderPart[] }>(new ListPartsCommand({
      Bucket: config.bucket,
      Key: state.initial.objectKey,
      UploadId: state.initial.uploadId,
    }));
    state.sdk.listParts = true;
    const listedParts = listed.Parts ?? [];
    const providerParts = parts.map((part) => {
      const provider = listedParts.find((candidate) => candidate.PartNumber === part.partNumber);
      if (!provider?.ETag || provider.Size !== part.sizeBytes || normalizeEtag(provider.ETag) !== normalizeEtag(part.etag)) throw new ProbeFailure(422);
      return { PartNumber: part.partNumber, ETag: provider.ETag };
    }).sort((left, right) => left.PartNumber! - right.PartNumber!);
    await send(new CompleteMultipartUploadCommand({
      Bucket: config.bucket,
      Key: state.initial.objectKey,
      UploadId: state.initial.uploadId,
      MultipartUpload: { Parts: providerParts },
    }));
    state.sdk.complete = true;
    state.initial.completed = true;
    const head = await send<{ ContentLength?: number }>(new HeadObjectCommand({ Bucket: config.bucket, Key: state.initial.objectKey }));
    state.sdk.head = true;
    if (Number(head.ContentLength) !== parts.reduce((sum, part) => sum + part.sizeBytes, 0)) throw new ProbeFailure(422);
    const privateStatus = await anonymousGet(buildObjectUrl(config.endpoint, config.bucket, state.initial.objectKey));
    if (![401, 403, 404].includes(privateStatus)) throw new ProbeFailure(422);
    state.sdk.privateRead = true;
    if (!await deleteAndVerify(state.initial)) throw new ProbeFailure(503);
    const abortKey = `ros-probe-abort/${randomUUID()}`;
    const abortOutput = await send<{ UploadId?: string }>(new CreateMultipartUploadCommand({
      Bucket: config.bucket,
      Key: abortKey,
      ContentType: 'application/octet-stream',
    }));
    if (!abortOutput.UploadId) {
      state.createUnknown = true;
      throw new ProbeFailure(503);
    }
    state.abortUpload = { uploadId: abortOutput.UploadId, objectKey: abortKey, aborted: false, abortAttempted: false };
    if (!await abortAndVerify(state.abortUpload)) throw new ProbeFailure(503);
    state.outcome = 'passed';
    await notifyTerminalSummary();
  };

  const dispatch = async (request: RosBrowserProbeRequest): Promise<RosBrowserProbeResponse> => {
    const parsed = new URL(request.url, 'http://127.0.0.1');
    const path = parsed.pathname;
    const tokenPath = `${basePath}/`;
    if (!path.startsWith(tokenPath)) return blockedResponse(404);
    const suffix = path.slice(tokenPath.length);
    if (suffix === 'page' && request.method === 'GET') {
      return { statusCode: 200, headers: { ...responseHeaders('text/html; charset=utf-8'), 'Content-Security-Policy': `default-src 'none'; script-src 'unsafe-inline'; connect-src 'self' ${new URL(config.endpoint).origin}; frame-ancestors 'none'; base-uri 'none';` }, body: makePage() };
    }
    const supplied = readHeader(request.headers ?? {}, TOKEN_HEADER);
    if (!supplied || !equalToken(supplied, token)) return blockedResponse(401);
    if (suffix === 'capability' && request.method === 'POST') {
      try { return jsonResponse(200, await ensureCapability()); } catch (error) { return blockedResponse(error instanceof ProbeFailure ? error.statusCode : 503); }
    }
    if (suffix === 'result' && request.method === 'POST') {
      try {
        await ensureActive();
        if (state.outcome === 'passed' || state.outcome === 'blocked') return jsonResponse(200, summary());
        const raw = typeof request.body === 'string' ? request.body : Buffer.from(request.body ?? []).toString('utf8');
        const body = JSON.parse(raw) as { status?: string; parts?: BrowserPartResult[] };
        if (body.status !== 'passed') {
          await markBlocked('browser_failure');
          return jsonResponse(200, summary());
        }
        await verifyAndCleanup(body.parts ?? []);
        return jsonResponse(200, summary());
      } catch (error) {
        await markBlocked(error instanceof ProbeFailure && error.statusCode === 410 ? 'expired' : 'provider_failure');
        return blockedResponse(error instanceof ProbeFailure ? error.statusCode : 503);
      }
    }
    return blockedResponse(404);
  };

  const stop = async () => {
    if (state.expiryTimer) clearTimeout(state.expiryTimer);
    for (const entry of state.signalHandlers ?? []) process.removeListener(entry.signal, entry.handler);
    state.signalHandlers = [];
    if (state.outcome !== 'passed') await markBlocked('stopped');
    if (state.server) {
      await new Promise<void>((resolve) => state.server?.close(() => resolve()));
      delete state.server;
    }
    return summary();
  };

  const expire = async () => {
    if (state.outcome !== 'passed' && state.outcome !== 'blocked') await markBlocked('expired');
    return summary();
  };

  const start = async () => {
    if (state.server) {
      const address = state.server.address();
      return { host, port: typeof address === 'object' && address ? address.port : port };
    }
    const server = createServer(async (request, response) => {
      try {
        const body = request.method === 'POST' ? await readBody(request) : undefined;
        const dispatchRequest: RosBrowserProbeRequest = {
          method: request.method ?? 'GET',
          url: request.url ?? '/',
          headers: request.headers as Record<string, string | undefined>,
        };
        if (body !== undefined) dispatchRequest.body = body;
        const result = await dispatch(dispatchRequest);
        response.writeHead(result.statusCode, result.headers);
        response.end(result.body);
      } catch (error) {
        await markBlocked('browser_failure');
        const statusCode = error instanceof ProbeFailure ? error.statusCode : 503;
        response.writeHead(statusCode, responseHeaders('application/json; charset=utf-8'));
        response.end(JSON.stringify({ error: 'ROS_PROBE_BLOCKED' }));
      }
    });
    state.server = server;
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => { server.removeListener('error', reject); resolve(); });
      });
    } catch {
      try { server.close(); } catch { /* 未监听时无需关闭。 */ }
      delete state.server;
      throw new Error('ROS_PROBE_LISTEN_ERROR');
    }
    state.expiryTimer = setTimeout(() => { void expire(); }, Math.max(1, state.expiresAt - now()));
    state.expiryTimer.unref?.();
    const handleSignal = () => { void stop().catch(() => undefined); };
    state.signalHandlers = [{ signal: 'SIGINT', handler: handleSignal }, { signal: 'SIGTERM', handler: handleSignal }];
    for (const entry of state.signalHandlers) process.once(entry.signal, entry.handler);
    const address = server.address();
    return { host, port: typeof address === 'object' && address ? address.port : port };
  };

  return { start, stop, expire, dispatch, summary, basePath };
};

const printSummary = (value: RosBrowserProbeSummary): void => { process.stdout.write(`${JSON.stringify(value)}\n`); };
const printLifecycle = (value: RosBrowserProbeLifecycle): void => { process.stdout.write(`${JSON.stringify(value)}\n`); };

const main = async () => {
  if (process.env.QIMAO_ROS_PROBE_ENABLE !== 'true') {
    printSummary({ status: 'blocked', browserPut: false, etag: false, sdk: { create: false, presign: false, listParts: false, complete: false, head: false, privateRead: false, delete: false, abort: false }, elapsedMs: 0, cleanup: { abortCount: 0, deleteCount: 0, residual: 0 } });
    return;
  }
  try {
    const token = process.env.QIMAO_ROS_PROBE_TOKEN ?? '';
    const port = Number(process.env.QIMAO_ROS_PROBE_PORT ?? '0');
    const probe = createRosBrowserProbe({ token, port, onTerminalSummary: printSummary });
    printLifecycle(createListeningLifecycle(await probe.start()));
  } catch (error) {
    printLifecycle(createStartupBlockedLifecycle(classifyStartupReason(error)));
  }
};

const executedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === executedPath && process.argv[1]?.replaceAll('\\', '/').endsWith('/dist/tools/ros-browser-probe.js')) void main();
