import { spawn as nodeSpawn, type ChildProcessWithoutNullStreams, type SpawnOptions } from 'node:child_process';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { mkdirSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

export const LOCAL_OCR_PROTOCOL = 'screen_text_local_ocr_v1' as const;
export const LOCAL_OCR_DETECTION_MODEL = 'PP-OCRv6_small_det' as const;
export const LOCAL_OCR_RECOGNITION_MODEL = 'PP-OCRv6_small_rec' as const;
export const LOCAL_OCR_ENDPOINT_PATH = '/ocr' as const;
export const LOCAL_OCR_READY_LINE = JSON.stringify({ ready: LOCAL_OCR_PROTOCOL });
export const LOCAL_OCR_MAX_BODY_BYTES = 48_000_000;
export const LOCAL_OCR_MAX_FRAME_BYTES = 7_500_000;
export const LOCAL_OCR_MAX_TOTAL_FRAME_BYTES = 32_000_000;
export const LOCAL_OCR_MAX_FRAMES = 600;
export const LOCAL_OCR_MAX_PIXELS = 120_000_000;
export const LOCAL_OCR_MAX_RESPONSE_BYTES = 4_000_000;

export type LocalOcrSidecarBackend = 'openvino' | 'onnxruntime';

export type LocalOcrSidecarConfigurationCode =
  | 'CONFIG_INCOMPLETE'
  | 'CONFIG_INVALID'
  | 'MODEL_UNAVAILABLE'
  | 'RUNNER_UNAVAILABLE';

export class LocalOcrSidecarConfigurationError extends Error {
  constructor(readonly code: LocalOcrSidecarConfigurationCode) {
    super(`LOCAL_OCR_SIDECAR_${code}`);
    this.name = 'LocalOcrSidecarConfigurationError';
  }
}

export type LocalOcrSidecarErrorCode =
  | 'REQUEST_INVALID'
  | 'MODEL_MISMATCH'
  | 'CONCURRENCY_LIMIT'
  | 'ENGINE_REJECTED'
  | 'ENGINE_TIMEOUT'
  | 'ENGINE_STARTUP_TIMEOUT'
  | 'ENGINE_CANCELLED'
  | 'ENGINE_UNKNOWN';

export class LocalOcrSidecarError extends Error {
  constructor(readonly code: LocalOcrSidecarErrorCode) {
    super(`LOCAL_OCR_SIDECAR_${code}`);
    this.name = 'LocalOcrSidecarError';
  }
}

export interface LocalOcrSidecarConfig {
  readonly backend: LocalOcrSidecarBackend;
  readonly host: '127.0.0.1';
  readonly port: number;
  readonly endpointPath: '/ocr';
  readonly modelDir: string;
  readonly detModelDir: string;
  readonly recModelDir: string;
  readonly modelDigest: string;
  readonly runnerExecutable: string;
  readonly runnerScript: string;
  readonly startupTimeoutMs: number;
  readonly timeoutMs: number;
  readonly maxConcurrent: 1;
  readonly maxBodyBytes: number;
  readonly maxFrameBytes: number;
  readonly maxTotalFrameBytes: number;
};

export interface LocalOcrSidecarConfigInput {
  backend: LocalOcrSidecarBackend;
  host?: string;
  port: number;
  endpointPath?: string;
  modelDir: string;
  detModelDir?: string;
  recModelDir?: string;
  modelDigest: string;
  runnerExecutable: string;
  runnerScript: string;
  startupTimeoutMs?: number;
  timeoutMs?: number;
  maxBodyBytes?: number;
  maxFrameBytes?: number;
  maxTotalFrameBytes?: number;
}

const SHA256 = /^[0-9a-f]{64}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FRAME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  return expected.length === actual.length && expected.every((key, index) => key === actual[index]);
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LocalOcrSidecarError('REQUEST_INVALID');
  return value as Record<string, unknown>;
};

const asString = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string' || value.length < 1 || value.length > maxLength) throw new LocalOcrSidecarError('REQUEST_INVALID');
  return value;
};

const asInteger = (value: unknown, minimum: number, maximum: number) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) throw new LocalOcrSidecarError('REQUEST_INVALID');
  return value;
};

const under = (child: string, root: string) => {
  const rel = relative(root, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${requireSeparator()}`) && !isAbsolute(rel));
};

const requireSeparator = () => process.platform === 'win32' ? '\\' : '/';

const realDirectory = (value: string, code: LocalOcrSidecarConfigurationCode): string => {
  if (!isAbsolute(value)) throw new LocalOcrSidecarConfigurationError(code);
  try {
    const real = realpathSync(resolve(value));
    if (!statSync(real).isDirectory()) throw new Error();
    return real;
  } catch {
    throw new LocalOcrSidecarConfigurationError(code);
  }
};

const realFile = (value: string): string => {
  if (!isAbsolute(value)) throw new LocalOcrSidecarConfigurationError('RUNNER_UNAVAILABLE');
  try {
    const real = realpathSync(resolve(value));
    if (!statSync(real).isFile()) throw new Error();
    return real;
  } catch {
    throw new LocalOcrSidecarConfigurationError('RUNNER_UNAVAILABLE');
  }
};

const launchFile = (value: string): string => {
  if (!isAbsolute(value)) throw new LocalOcrSidecarConfigurationError('RUNNER_UNAVAILABLE');
  const normalized = resolve(value);
  try {
    // stat 跟随链接验证最终目标为普通文件，但返回 launcher 自身路径，
    // 保留 venv/bin/python 的 pyvenv.cfg 解析语义。
    if (!statSync(normalized).isFile()) throw new Error();
    return normalized;
  } catch {
    throw new LocalOcrSidecarConfigurationError('RUNNER_UNAVAILABLE');
  }
};

const numberEnv = (value: string | undefined, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number(value ?? String(fallback));
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) throw new LocalOcrSidecarConfigurationError('CONFIG_INVALID');
  return parsed;
};

const booleanEnv = (value: string | undefined) => value?.trim().toLowerCase() === 'true';

export const modelVersionFor = (digest: string) => `PP-OCRv6-Small@sha256:${digest}`;

export const validateLocalOcrSidecarConfig = (input: LocalOcrSidecarConfigInput): LocalOcrSidecarConfig => {
  if (input.backend !== 'openvino' && input.backend !== 'onnxruntime') throw new LocalOcrSidecarConfigurationError('CONFIG_INVALID');
  if (input.host !== undefined && input.host !== '127.0.0.1') throw new LocalOcrSidecarConfigurationError('CONFIG_INVALID');
  if (!Number.isSafeInteger(input.port) || input.port < 0 || input.port > 65_535) throw new LocalOcrSidecarConfigurationError('CONFIG_INVALID');
  if (input.endpointPath !== undefined && input.endpointPath !== LOCAL_OCR_ENDPOINT_PATH) throw new LocalOcrSidecarConfigurationError('CONFIG_INVALID');
  if (!SHA256.test(input.modelDigest)) throw new LocalOcrSidecarConfigurationError('CONFIG_INVALID');
  const modelDir = realDirectory(input.modelDir, 'MODEL_UNAVAILABLE');
  const detModelDir = realDirectory(input.detModelDir ?? join(modelDir, LOCAL_OCR_DETECTION_MODEL), 'MODEL_UNAVAILABLE');
  const recModelDir = realDirectory(input.recModelDir ?? join(modelDir, LOCAL_OCR_RECOGNITION_MODEL), 'MODEL_UNAVAILABLE');
  if (!under(detModelDir, modelDir) || !under(recModelDir, modelDir)
    || detModelDir === modelDir || recModelDir === modelDir
    || !detModelDir.endsWith(`${requireSeparator()}${LOCAL_OCR_DETECTION_MODEL}`)
    || !recModelDir.endsWith(`${requireSeparator()}${LOCAL_OCR_RECOGNITION_MODEL}`)) {
    throw new LocalOcrSidecarConfigurationError('MODEL_UNAVAILABLE');
  }
  const runnerExecutable = launchFile(input.runnerExecutable);
  const runnerScript = realFile(input.runnerScript);
  const startupTimeoutMs = numberEnv(String(input.startupTimeoutMs ?? 300_000), 300_000, 100, 600_000);
  const timeoutMs = numberEnv(input.timeoutMs === undefined ? undefined : String(input.timeoutMs), 60_000, 100, 120_000);
  const maxBodyBytes = numberEnv(String(input.maxBodyBytes ?? LOCAL_OCR_MAX_BODY_BYTES), LOCAL_OCR_MAX_BODY_BYTES, 1_024, LOCAL_OCR_MAX_BODY_BYTES);
  const maxFrameBytes = numberEnv(String(input.maxFrameBytes ?? LOCAL_OCR_MAX_FRAME_BYTES), LOCAL_OCR_MAX_FRAME_BYTES, 1, LOCAL_OCR_MAX_FRAME_BYTES);
  const maxTotalFrameBytes = numberEnv(String(input.maxTotalFrameBytes ?? LOCAL_OCR_MAX_TOTAL_FRAME_BYTES), LOCAL_OCR_MAX_TOTAL_FRAME_BYTES, maxFrameBytes, LOCAL_OCR_MAX_TOTAL_FRAME_BYTES);
  return Object.freeze({
    backend: input.backend,
    host: '127.0.0.1',
    port: input.port,
    endpointPath: LOCAL_OCR_ENDPOINT_PATH,
    modelDir,
    detModelDir,
    recModelDir,
    modelDigest: input.modelDigest.toLowerCase(),
    runnerExecutable,
    runnerScript,
    startupTimeoutMs,
    timeoutMs,
    maxConcurrent: 1,
    maxBodyBytes,
    maxFrameBytes,
    maxTotalFrameBytes,
  });
};

export const createLocalOcrSidecarConfigFromEnv = (env: NodeJS.ProcessEnv = process.env): LocalOcrSidecarConfig | null => {
  const keys = [
    'QIMAO_LOCAL_OCR_SIDECAR_BACKEND', 'QIMAO_LOCAL_OCR_SIDECAR_HOST', 'QIMAO_LOCAL_OCR_SIDECAR_PORT',
    'QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST', 'QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR',
    'QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE', 'QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT',
    'QIMAO_LOCAL_OCR_SIDECAR_STARTUP_TIMEOUT_MS', 'QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS',
  ];
  const enabled = booleanEnv(env.QIMAO_LOCAL_OCR_SIDECAR_ENABLED);
  const hasConfig = keys.some((key) => env[key] !== undefined);
  if (!enabled) {
    if (hasConfig || (env.QIMAO_LOCAL_OCR_SIDECAR_ENABLED !== undefined && env.QIMAO_LOCAL_OCR_SIDECAR_ENABLED.trim() !== '' && env.QIMAO_LOCAL_OCR_SIDECAR_ENABLED.trim().toLowerCase() !== 'false')) {
      throw new LocalOcrSidecarConfigurationError('CONFIG_INCOMPLETE');
    }
    return null;
  }
  const backend = env.QIMAO_LOCAL_OCR_SIDECAR_BACKEND?.trim();
  const modelDigest = env.QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST?.trim();
  const modelDir = env.QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR?.trim();
  const runnerExecutable = env.QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE?.trim();
  const runnerScript = env.QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT?.trim();
  if ((backend !== 'openvino' && backend !== 'onnxruntime') || !modelDigest || !modelDir || !runnerExecutable || !runnerScript) {
    throw new LocalOcrSidecarConfigurationError('CONFIG_INCOMPLETE');
  }
  return validateLocalOcrSidecarConfig({
    backend,
    host: env.QIMAO_LOCAL_OCR_SIDECAR_HOST?.trim() || '127.0.0.1',
    port: numberEnv(env.QIMAO_LOCAL_OCR_SIDECAR_PORT, 19_000, 1, 65_535),
    modelDir,
    modelDigest,
    runnerExecutable,
    runnerScript,
    startupTimeoutMs: numberEnv(env.QIMAO_LOCAL_OCR_SIDECAR_STARTUP_TIMEOUT_MS, 300_000, 100, 600_000),
    timeoutMs: numberEnv(env.QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS, 60_000, 100, 120_000),
  });
};

export interface LocalOcrSidecarFrame {
  readonly frameIndex: number;
  readonly capturedAtMs: number;
  readonly width: number;
  readonly height: number;
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

export interface LocalOcrEngineInput {
  readonly protocolVersion: typeof LOCAL_OCR_PROTOCOL;
  readonly attemptId: string;
  readonly requestId: string;
  readonly modelVersion: string;
  readonly language: string;
  readonly media: {
    readonly inputKind: 'server_extracted_frames';
    readonly contentType: string;
    readonly sizeBytes: number;
    readonly checksumAlgorithm: 'sha256';
    readonly checksumValue: string;
    readonly videoDurationMs: number;
    readonly maxFrameCount: number;
    readonly maxPixels: number;
  };
  readonly frames: readonly LocalOcrSidecarFrame[];
}

export interface LocalOcrBox {
  readonly frameIndex: number;
  readonly text: string;
  readonly confidence: number;
  readonly language: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly startMs: number;
  readonly endMs: number;
}

export interface LocalOcrEngineResult {
  readonly boxes: readonly LocalOcrBox[];
  readonly providerRequestId?: string | null;
}

export interface LocalOcrEngine {
  start?(): Promise<void>;
  recognize(input: LocalOcrEngineInput, signal: AbortSignal): Promise<LocalOcrEngineResult>;
  close?(): Promise<void> | void;
}

const decodeBase64 = (value: unknown, maxBytes: number): Uint8Array => {
  const encoded = asString(value, Math.ceil(maxBytes * 4 / 3) + 4);
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new LocalOcrSidecarError('REQUEST_INVALID');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.byteLength < 1 || bytes.byteLength > maxBytes || Buffer.from(bytes).toString('base64') !== encoded) throw new LocalOcrSidecarError('REQUEST_INVALID');
  return Uint8Array.from(bytes);
};

const parseRequest = (body: unknown, config: LocalOcrSidecarConfig): LocalOcrEngineInput => {
  const root = asRecord(body);
  if (!hasExactKeys(root, ['protocolVersion', 'attemptId', 'requestId', 'media', 'frames', 'language', 'modelVersion'])
    || root.protocolVersion !== LOCAL_OCR_PROTOCOL
    || typeof root.attemptId !== 'string' || !UUID.test(root.attemptId)
    || typeof root.requestId !== 'string' || root.requestId.length < 1 || root.requestId.length > 200
    || root.modelVersion !== modelVersionFor(config.modelDigest)
    || typeof root.language !== 'string' || root.language.length < 1 || root.language.length > 20) {
    throw new LocalOcrSidecarError(root.modelVersion !== modelVersionFor(config.modelDigest) ? 'MODEL_MISMATCH' : 'REQUEST_INVALID');
  }
  const media = asRecord(root.media);
  if (!hasExactKeys(media, ['inputKind', 'contentType', 'sizeBytes', 'checksumAlgorithm', 'checksumValue', 'videoDurationMs', 'maxFrameCount', 'maxPixels'])
    || media.inputKind !== 'server_extracted_frames' || typeof media.contentType !== 'string' || !VIDEO_TYPES.has(media.contentType)
    || media.checksumAlgorithm !== 'sha256' || typeof media.checksumValue !== 'string' || !SHA256.test(media.checksumValue)
    || typeof media.sizeBytes !== 'number' || !Number.isSafeInteger(media.sizeBytes) || media.sizeBytes < 1 || media.sizeBytes > 50_000_000_000) {
    throw new LocalOcrSidecarError('REQUEST_INVALID');
  }
  const videoDurationMs = asInteger(media.videoDurationMs, 1, 86_400_000);
  const maxFrameCount = asInteger(media.maxFrameCount, 1, LOCAL_OCR_MAX_FRAMES);
  const maxPixels = asInteger(media.maxPixels, 1, LOCAL_OCR_MAX_PIXELS);
  if (!Array.isArray(root.frames) || root.frames.length < 1 || root.frames.length > maxFrameCount) throw new LocalOcrSidecarError('REQUEST_INVALID');
  const frames: LocalOcrSidecarFrame[] = [];
  const ids = new Set<number>();
  let totalBytes = 0;
  let pixels = 0;
  for (const item of root.frames) {
    const frame = asRecord(item);
    if (!hasExactKeys(frame, ['frameIndex', 'capturedAtMs', 'width', 'height', 'contentType', 'bytesBase64'])) throw new LocalOcrSidecarError('REQUEST_INVALID');
    const frameIndex = asInteger(frame.frameIndex, 0, LOCAL_OCR_MAX_FRAMES - 1);
    const capturedAtMs = asInteger(frame.capturedAtMs, 0, videoDurationMs);
    const width = asInteger(frame.width, 1, 7_680);
    const height = asInteger(frame.height, 1, 4_320);
    const contentType = asString(frame.contentType, 120);
    if (!FRAME_TYPES.has(contentType) || ids.has(frameIndex)) throw new LocalOcrSidecarError('REQUEST_INVALID');
    const bytes = decodeBase64(frame.bytesBase64, config.maxFrameBytes);
    totalBytes += bytes.byteLength;
    pixels += width * height;
    if (totalBytes > config.maxTotalFrameBytes || pixels > maxPixels) throw new LocalOcrSidecarError('REQUEST_INVALID');
    ids.add(frameIndex);
    frames.push({ frameIndex, capturedAtMs, width, height, contentType, bytes });
  }
  return {
    protocolVersion: LOCAL_OCR_PROTOCOL,
    attemptId: root.attemptId,
    requestId: root.requestId,
    modelVersion: root.modelVersion,
    language: root.language,
    media: {
      inputKind: 'server_extracted_frames',
      contentType: media.contentType,
      sizeBytes: media.sizeBytes,
      checksumAlgorithm: 'sha256',
      checksumValue: media.checksumValue,
      videoDurationMs,
      maxFrameCount,
      maxPixels,
    },
    frames,
  };
};

const validateEngineResult = (result: LocalOcrEngineResult, input: LocalOcrEngineInput) => {
  if (!result || !Array.isArray(result.boxes) || result.boxes.length > 2_000) throw new LocalOcrSidecarError('ENGINE_UNKNOWN');
  const frames = new Map(input.frames.map((frame) => [frame.frameIndex, frame]));
  return result.boxes.map((raw) => {
    const box = asRecord(raw);
    if (!hasExactKeys(box, ['frameIndex', 'text', 'confidence', 'language', 'x', 'y', 'width', 'height', 'startMs', 'endMs'])) throw new LocalOcrSidecarError('ENGINE_UNKNOWN');
    const frameIndex = asInteger(box.frameIndex, 0, LOCAL_OCR_MAX_FRAMES - 1);
    const frame = frames.get(frameIndex);
    const text = asString(box.text, 500);
    const confidence = typeof box.confidence === 'number' && Number.isFinite(box.confidence) && box.confidence >= 0 && box.confidence <= 1 ? box.confidence : NaN;
    const language = asString(box.language, 20);
    const x = asInteger(box.x, 0, 7_679);
    const y = asInteger(box.y, 0, 4_319);
    const width = asInteger(box.width, 1, 7_680);
    const height = asInteger(box.height, 1, 4_320);
    const startMs = asInteger(box.startMs, 0, 86_400_000);
    const endMs = asInteger(box.endMs, 1, 86_400_000);
    if (!frame || Number.isNaN(confidence) || language !== input.language || x + width > frame.width || y + height > frame.height
      || endMs <= startMs || startMs > frame.capturedAtMs || endMs < frame.capturedAtMs) throw new LocalOcrSidecarError('ENGINE_UNKNOWN');
    return { frameIndex, text, confidence, language, x, y, width, height, startMs, endMs };
  });
};

export type LocalOcrSpawn = (file: string, args: readonly string[], options: SpawnOptions) => ChildProcessWithoutNullStreams;

export class PaddleHpiProcessEngine implements LocalOcrEngine {
  private child: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = '';
  private ready = false;
  private readyPromise: Promise<void> | null = null;
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((error: LocalOcrSidecarError) => void) | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private recognizing = false;
  private pending: {
    input: LocalOcrEngineInput;
    resolve: (result: LocalOcrEngineResult) => void;
    reject: (error: LocalOcrSidecarError) => void;
    timer: ReturnType<typeof setTimeout>;
    signal: AbortSignal;
    onAbort: () => void;
  } | null = null;

  constructor(
    private readonly config: LocalOcrSidecarConfig,
    private readonly spawnImpl: LocalOcrSpawn = nodeSpawn as LocalOcrSpawn,
  ) {}

  private spawnPersistent() {
    if (this.child) return this.child;
    const child = this.spawnImpl(this.config.runnerExecutable, [
      this.config.runnerScript,
      '--backend', this.config.backend,
      '--model-dir', this.config.modelDir,
      '--det-model', LOCAL_OCR_DETECTION_MODEL,
      '--rec-model', LOCAL_OCR_RECOGNITION_MODEL,
      '--model-digest', this.config.modelDigest,
      '--protocol', LOCAL_OCR_PROTOCOL,
    ], {
      shell: false,
      stdio: ['pipe', 'pipe', 'ignore'],
      env: { PATH: process.env.PATH ?? '' },
    });
    this.child = child;
    this.ready = false;
    this.readyPromise = new Promise<void>((resolveReady, rejectReady) => {
      this.resolveReady = resolveReady;
      this.rejectReady = rejectReady;
    });
    this.startupTimer = setTimeout(() => {
      this.failReady('ENGINE_STARTUP_TIMEOUT');
      void this.terminateChild();
    }, this.config.startupTimeoutMs);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => this.onStdout(chunk));
    child.once('error', () => {
      this.failReady('ENGINE_UNKNOWN');
      this.failPending('ENGINE_UNKNOWN');
    });
    child.once('close', () => {
      this.child = null;
      this.stdoutBuffer = '';
      if (!this.ready) this.failReady('ENGINE_UNKNOWN');
      if (this.pending) this.failPending('ENGINE_UNKNOWN');
    });
    return child;
  }

  private settleReady() {
    if (this.ready) return;
    this.ready = true;
    if (this.startupTimer) clearTimeout(this.startupTimer);
    this.startupTimer = null;
    const resolveReady = this.resolveReady;
    this.resolveReady = null;
    this.rejectReady = null;
    resolveReady?.();
  }

  private failReady(code: LocalOcrSidecarErrorCode) {
    if (this.ready) return;
    if (this.startupTimer) clearTimeout(this.startupTimer);
    this.startupTimer = null;
    const rejectReady = this.rejectReady;
    this.resolveReady = null;
    this.rejectReady = null;
    rejectReady?.(new LocalOcrSidecarError(code));
  }

  private onStdout(chunk: string) {
    this.stdoutBuffer += chunk;
    if (Buffer.byteLength(this.stdoutBuffer, 'utf8') > LOCAL_OCR_MAX_RESPONSE_BYTES) {
      this.failPending('ENGINE_UNKNOWN');
      void this.terminateChild();
      return;
    }
    let newline = this.stdoutBuffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.stdoutBuffer.slice(0, newline).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      newline = this.stdoutBuffer.indexOf('\n');
      if (!this.ready) {
        if (line === LOCAL_OCR_READY_LINE) {
          this.settleReady();
          continue;
        }
        if (line) {
          this.failReady('ENGINE_UNKNOWN');
          void this.terminateChild();
          return;
        }
        continue;
      }
      if (!line || !this.pending) continue;
      const pending = this.pending;
      try {
        const parsed = asRecord(JSON.parse(line));
        if (!hasExactKeys(parsed, ['boxes']) && !hasExactKeys(parsed, ['boxes', 'providerRequestId'])) throw new Error();
        this.settle({ boxes: validateEngineResult({ boxes: parsed.boxes as LocalOcrBox[] }, pending.input), providerRequestId: typeof parsed.providerRequestId === 'string' ? parsed.providerRequestId : null });
      } catch {
        this.failPending('ENGINE_UNKNOWN');
        void this.terminateChild();
      }
      break;
    }
  }

  private settle(result: LocalOcrEngineResult) {
    const pending = this.pending;
    if (!pending) return;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.signal.removeEventListener('abort', pending.onAbort);
    this.recognizing = false;
    pending.resolve(result);
  }

  private failPending(code: LocalOcrSidecarErrorCode) {
    const pending = this.pending;
    if (!pending) return;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.signal.removeEventListener('abort', pending.onAbort);
    this.recognizing = false;
    pending.reject(new LocalOcrSidecarError(code));
  }

  private async terminateChild() {
    const child = this.child;
    if (!child) return;
    await new Promise<void>((resolveTerminate) => {
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolveTerminate(); } };
      child.once('close', done);
      child.kill('SIGTERM');
      setTimeout(() => { if (!settled) { child.kill('SIGKILL'); done(); } }, 200);
    });
    this.child = null;
  }

  async start() {
    this.spawnPersistent();
    if (this.ready) return;
    const readyPromise = this.readyPromise;
    if (!readyPromise) throw new LocalOcrSidecarError('ENGINE_UNKNOWN');
    await readyPromise;
  }

  async recognize(input: LocalOcrEngineInput, signal: AbortSignal): Promise<LocalOcrEngineResult> {
    if (signal.aborted) throw new LocalOcrSidecarError('ENGINE_CANCELLED');
    if (this.pending || this.recognizing) throw new LocalOcrSidecarError('CONCURRENCY_LIMIT');
    this.recognizing = true;
    try {
      await this.start();
      if (signal.aborted) throw new LocalOcrSidecarError('ENGINE_CANCELLED');
      const child = this.child;
      if (!child || !this.ready) throw new LocalOcrSidecarError('ENGINE_UNKNOWN');
    const payload = JSON.stringify({
      protocolVersion: input.protocolVersion,
      attemptId: input.attemptId,
      requestId: input.requestId,
      modelVersion: input.modelVersion,
      language: input.language,
      media: input.media,
      frames: input.frames.map((frame) => ({
        frameIndex: frame.frameIndex, capturedAtMs: frame.capturedAtMs, width: frame.width, height: frame.height,
        contentType: frame.contentType, bytesBase64: Buffer.from(frame.bytes).toString('base64'),
      })),
    }) + '\n';
      return await new Promise<LocalOcrEngineResult>((resolveResult, reject) => {
      const onAbort = () => { this.failPending('ENGINE_CANCELLED'); void this.terminateChild(); };
      const timer = setTimeout(() => { this.failPending('ENGINE_TIMEOUT'); void this.terminateChild(); }, this.config.timeoutMs);
      this.pending = { input, resolve: resolveResult, reject, timer, signal, onAbort };
      signal.addEventListener('abort', onAbort, { once: true });
      try { child.stdin.write(payload, 'utf8'); } catch { this.failPending('ENGINE_UNKNOWN'); void this.terminateChild(); }
      });
    } catch (error) {
      this.recognizing = false;
      throw error;
    }
  }

  async close() {
    this.failReady('ENGINE_CANCELLED');
    this.failPending('ENGINE_CANCELLED');
    await this.terminateChild();
    this.ready = false;
    this.readyPromise = null;
  }
}

const readBody = async (request: IncomingMessage, maxBytes: number, signal: AbortSignal): Promise<string> => new Promise((resolveBody, reject) => {
  let total = 0;
  const chunks: Buffer[] = [];
  const abort = () => reject(new LocalOcrSidecarError('ENGINE_CANCELLED'));
  signal.addEventListener('abort', abort, { once: true });
  request.on('data', (chunk: Buffer | string) => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.byteLength;
    if (total > maxBytes) {
      signal.removeEventListener('abort', abort);
      reject(new LocalOcrSidecarError('REQUEST_INVALID'));
      request.resume();
      return;
    }
    chunks.push(bytes);
  });
  request.once('end', () => { signal.removeEventListener('abort', abort); resolveBody(Buffer.concat(chunks).toString('utf8')); });
  request.once('error', () => { signal.removeEventListener('abort', abort); reject(new LocalOcrSidecarError('ENGINE_CANCELLED')); });
});

const sendJson = (response: ServerResponse, statusCode: number, body: unknown) => {
  const payload = JSON.stringify(body);
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.setHeader('x-content-type-options', 'nosniff');
  response.end(payload);
};

const errorStatus = (code: LocalOcrSidecarErrorCode) => {
  if (code === 'REQUEST_INVALID' || code === 'MODEL_MISMATCH') return 400;
  if (code === 'CONCURRENCY_LIMIT') return 429;
  if (code === 'ENGINE_TIMEOUT') return 504;
  if (code === 'ENGINE_STARTUP_TIMEOUT') return 503;
  if (code === 'ENGINE_CANCELLED') return 499;
  if (code === 'ENGINE_REJECTED') return 422;
  return 500;
};

const safeErrorBody = (code: LocalOcrSidecarErrorCode) => ({ error: { code: `LOCAL_OCR_${code}`, message: '本地 OCR 请求未完成。' } });

export interface LocalOcrSidecarServer {
  readonly server: Server;
  readonly config: LocalOcrSidecarConfig;
  start(): Promise<{ host: '127.0.0.1'; port: number }>;
  stop(): Promise<void>;
}

export const createLocalOcrSidecarServer = (input: {
  config: LocalOcrSidecarConfig;
  engine?: LocalOcrEngine;
}): LocalOcrSidecarServer => {
  const config = validateLocalOcrSidecarConfig(input.config);
  const engine = input.engine ?? new PaddleHpiProcessEngine(config);
  let active = 0;
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url?.split('?')[0] !== config.endpointPath) {
      sendJson(response, request.method === 'POST' ? 404 : 405, safeErrorBody('REQUEST_INVALID'));
      return;
    }
    if (request.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
      sendJson(response, 415, safeErrorBody('REQUEST_INVALID'));
      return;
    }
    if (active >= config.maxConcurrent) {
      request.resume();
      sendJson(response, 429, safeErrorBody('CONCURRENCY_LIMIT'));
      return;
    }
    const controller = new AbortController();
    request.once('aborted', () => controller.abort());
    request.once('close', () => { if (!response.writableEnded && request.aborted) controller.abort(); });
    response.once('close', () => { if (!response.writableEnded) controller.abort(); });
    active += 1;
    try {
      const body = await readBody(request, config.maxBodyBytes, controller.signal);
      let parsed: unknown;
      try { parsed = JSON.parse(body); } catch { throw new LocalOcrSidecarError('REQUEST_INVALID'); }
      const engineInput = parseRequest(parsed, config);
      const result = await engine.recognize(engineInput, controller.signal);
      if (controller.signal.aborted) throw new LocalOcrSidecarError('ENGINE_CANCELLED');
      const boxes = validateEngineResult(result, engineInput);
      sendJson(response, 200, {
        protocolVersion: LOCAL_OCR_PROTOCOL,
        attemptId: engineInput.attemptId,
        requestId: engineInput.requestId,
        modelVersion: engineInput.modelVersion,
        language: engineInput.language,
        frameCount: engineInput.frames.length,
        boxes,
      });
    } catch (error) {
      const safeCode = error instanceof LocalOcrSidecarError ? error.code : 'ENGINE_UNKNOWN';
      if (!response.headersSent && !response.writableEnded) sendJson(response, errorStatus(safeCode), safeErrorBody(safeCode));
    } finally {
      active -= 1;
    }
  });
  return {
    server,
    config,
    start: async () => {
      await engine.start?.();
      return await new Promise((resolveStart, rejectStart) => {
      const onError = () => { server.removeListener('error', onError); rejectStart(new LocalOcrSidecarError('ENGINE_UNKNOWN')); };
      server.once('error', onError);
      server.listen(config.port, config.host, () => {
        server.removeListener('error', onError);
        const address = server.address();
        if (!address || typeof address === 'string') { rejectStart(new LocalOcrSidecarError('ENGINE_UNKNOWN')); return; }
        resolveStart({ host: '127.0.0.1', port: address.port });
      });
      });
    },
    stop: () => new Promise((resolveStop) => {
      const finish = () => { void Promise.resolve(engine.close?.()).finally(() => resolveStop()); };
      if (!server.listening) { finish(); return; }
      server.close(finish);
    }),
  };
};

export const createLocalOcrSidecarFromEnv = (input: {
  env?: NodeJS.ProcessEnv;
  engine?: LocalOcrEngine;
} = {}): LocalOcrSidecarServer | null => {
  const config = createLocalOcrSidecarConfigFromEnv(input.env ?? process.env);
  return config ? createLocalOcrSidecarServer({ config, ...(input.engine ? { engine: input.engine } : {}) }) : null;
};
