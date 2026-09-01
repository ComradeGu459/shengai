import { spawn as spawnChildProcess, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import type { ScreenTextLocalOcrFrame } from './screen-text.local-ocr-sidecar.js';
import {
  SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS,
  SCREEN_TEXT_FRAME_INTERVAL_MAX_MS,
  SCREEN_TEXT_FRAME_INTERVAL_MIN_MS,
} from './screen-text-runtime-config.js';

export const SCREEN_TEXT_MEDIA_MAX_FRAMES = 600;
export const SCREEN_TEXT_MEDIA_MAX_PIXELS = 120_000_000;
export const SCREEN_TEXT_MEDIA_MAX_FRAME_BYTES = 7_500_000;
export const SCREEN_TEXT_MEDIA_MAX_DURATION_MS = 86_400_000;
export const SCREEN_TEXT_MEDIA_EXTRACTOR_TIMEOUT_MS = 5 * 60_000;

export interface ScreenTextFrameExtractorInput {
  sourceUrl: string;
  contentType: string;
  sizeBytes: number;
  checksumValue: string;
  maxFrames: number;
  maxPixels: number;
  /** 固定单位为毫秒；由批次快照传入，旧调用默认约 1fps。 */
  frameIntervalMs?: number;
  signal: AbortSignal;
  tempDir: string;
}

export interface ScreenTextFrameExtractor {
  extract(input: ScreenTextFrameExtractorInput): Promise<{
    frames: ScreenTextLocalOcrFrame[];
    videoDurationMs: number;
  }>;
}

export interface ScreenTextObjectUrlSigner {
  createGetUrl(input: {
    assetId: string;
    objectKey: string;
    expiresInSeconds: number;
  }): Promise<string>;
}

export interface ScreenTextRemoteMediaSource {
  read(input: {
    assetId: string;
    objectKey: string;
    contentType: string;
    sizeBytes: number;
    checksumValue: string;
    frameIntervalMs?: number;
    maxFrames?: number;
    signal: AbortSignal;
  }): Promise<{
    contentType: string;
    sizeBytes: number;
    checksumValue: string;
    videoDurationMs: number;
    frameCount: number;
    pixelCount: number;
    maxFrameCount: number;
    maxPixels: number;
    frames: ScreenTextLocalOcrFrame[];
  }>;
}

export type ScreenTextMediaErrorCode =
  | 'EXTRACTOR_UNAVAILABLE'
  | 'EXTRACTOR_FAILED'
  | 'EXTRACTOR_TIMEOUT'
  | 'EXTRACTOR_CANCELLED'
  | 'SOURCE_URL_INVALID'
  | 'SOURCE_STORAGE_UNAVAILABLE'
  | 'FRAME_OUTPUT_INVALID'
  | 'FRAME_LIMIT_EXCEEDED'
  | 'UNKNOWN';

export class ScreenTextMediaError extends Error {
  constructor(readonly code: ScreenTextMediaErrorCode) {
    super(`SCREEN_TEXT_MEDIA_${code}`);
    this.name = 'ScreenTextMediaError';
  }
}

const validateSourceUrl = (sourceUrl: string) => {
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error();
  } catch {
    throw new ScreenTextMediaError('SOURCE_URL_INVALID');
  }
};

const validateExtraction = (
  result: { frames: ScreenTextLocalOcrFrame[]; videoDurationMs: number },
  input: ScreenTextFrameExtractorInput,
) => {
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 1
    || !Number.isInteger(input.maxFrames) || input.maxFrames < 1 || input.maxFrames > SCREEN_TEXT_MEDIA_MAX_FRAMES
    || (input.frameIntervalMs !== undefined && (!Number.isSafeInteger(input.frameIntervalMs)
      || input.frameIntervalMs < SCREEN_TEXT_FRAME_INTERVAL_MIN_MS || input.frameIntervalMs > SCREEN_TEXT_FRAME_INTERVAL_MAX_MS))
    || !Number.isInteger(input.maxPixels) || input.maxPixels < 1 || input.maxPixels > SCREEN_TEXT_MEDIA_MAX_PIXELS
    || !Number.isInteger(result.videoDurationMs) || result.videoDurationMs < 1 || result.videoDurationMs > SCREEN_TEXT_MEDIA_MAX_DURATION_MS
    || !Array.isArray(result.frames) || result.frames.length < 1 || result.frames.length > input.maxFrames) {
    throw new ScreenTextMediaError('FRAME_LIMIT_EXCEEDED');
  }
  const seen = new Set<number>();
  let pixels = 0;
  for (const frame of result.frames) {
    if (!Number.isInteger(frame.frameIndex) || seen.has(frame.frameIndex) || frame.frameIndex < 0
      || frame.frameIndex >= result.frames.length || !Number.isInteger(frame.capturedAtMs)
      || frame.capturedAtMs < 0 || frame.capturedAtMs > result.videoDurationMs
      || (frame.contentType !== 'image/png' && frame.contentType !== 'image/jpeg')
      || !(frame.bytes instanceof Uint8Array) || frame.bytes.byteLength < 1 || frame.bytes.byteLength > SCREEN_TEXT_MEDIA_MAX_FRAME_BYTES
      || !Number.isInteger(frame.width) || frame.width < 1 || frame.width > 7_680
      || !Number.isInteger(frame.height) || frame.height < 1 || frame.height > 4_320) {
      throw new ScreenTextMediaError('FRAME_OUTPUT_INVALID');
    }
    seen.add(frame.frameIndex);
    pixels += frame.width * frame.height;
    if (pixels > input.maxPixels) throw new ScreenTextMediaError('FRAME_LIMIT_EXCEEDED');
  }
  return {
    frames: result.frames.map((frame) => ({ ...frame, bytes: Uint8Array.from(frame.bytes) })),
    videoDurationMs: result.videoDurationMs,
    pixelCount: pixels,
  };
};

/** 抽帧器只接收 presigned HTTPS URL；整段视频不会进入 Node 内存。 */
export class BoundedScreenTextFrameExtractor implements ScreenTextFrameExtractor {
  constructor(
    private readonly runner: ScreenTextFrameExtractor,
    private readonly createTempDirectory: () => Promise<string> = () => mkdtemp(join(tmpdir(), 'qimao-screen-text-')),
    private readonly removeTempDirectory: (path: string) => Promise<void> = (path) => rm(path, { recursive: true, force: true }),
  ) {}

  async extract(input: ScreenTextFrameExtractorInput) {
    validateSourceUrl(input.sourceUrl);
    if (input.signal.aborted) throw new ScreenTextMediaError('EXTRACTOR_CANCELLED');
    const tempDir = await this.createTempDirectory();
    try {
      const result = await this.runner.extract({ ...input, tempDir });
      return validateExtraction(result, input);
    } finally {
      await this.removeTempDirectory(tempDir);
    }
  }
}

type FrameManifest = {
  videoDurationMs: number;
  frames: Array<{
    frameIndex: number;
    capturedAtMs: number;
    width: number;
    height: number;
    contentType: string;
    fileName: string;
  }>;
};

export interface ScreenTextProcessExtractorOptions {
  timeoutMs?: number;
  spawnProcess?: (command: string, args: string[], options: SpawnOptions) => ChildProcess;
}

const frameFilePath = (tempDir: string, fileName: string) => {
  if (!fileName || isAbsolute(fileName) || fileName.includes('\0')) throw new ScreenTextMediaError('FRAME_OUTPUT_INVALID');
  const candidate = resolve(tempDir, fileName);
  const rel = relative(resolve(tempDir), candidate);
  if (!rel || rel.startsWith('..') || isAbsolute(rel) || dirname(rel) !== '.') {
    throw new ScreenTextMediaError('FRAME_OUTPUT_INVALID');
  }
  return candidate;
};

const parseManifest = (value: unknown): FrameManifest => {
  if (!value || typeof value !== 'object') throw new ScreenTextMediaError('FRAME_OUTPUT_INVALID');
  const manifest = value as Partial<FrameManifest>;
  if (!Number.isInteger(manifest.videoDurationMs) || !Array.isArray(manifest.frames)) {
    throw new ScreenTextMediaError('FRAME_OUTPUT_INVALID');
  }
  return manifest as FrameManifest;
};

/**
 * 服务器提供的抽帧可执行文件适配器。可执行文件必须把帧写入 tempDir，
 * 并在 qimao-frames.json 输出 JSON manifest；Node 只逐帧读有界 PNG/JPEG。
 */
export class ExecutableScreenTextFrameExtractor implements ScreenTextFrameExtractor {
  private readonly timeoutMs: number;
  private readonly spawnProcess: (command: string, args: string[], options: SpawnOptions) => ChildProcess;

  constructor(private readonly command: string, options: ScreenTextProcessExtractorOptions = {}) {
    if (!command.trim() || command.includes('\0')) throw new ScreenTextMediaError('EXTRACTOR_UNAVAILABLE');
    const timeoutMs = Math.trunc(options.timeoutMs ?? SCREEN_TEXT_MEDIA_EXTRACTOR_TIMEOUT_MS);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100) throw new ScreenTextMediaError('EXTRACTOR_UNAVAILABLE');
    this.timeoutMs = Math.min(10 * 60_000, timeoutMs);
    this.spawnProcess = options.spawnProcess ?? ((file, args, spawnOptions) => spawnChildProcess(file, args, spawnOptions));
  }

  async extract(input: ScreenTextFrameExtractorInput) {
    if (input.signal.aborted) throw new ScreenTextMediaError('EXTRACTOR_CANCELLED');
    const manifestPath = join(input.tempDir, 'qimao-frames.json');
    const frameIntervalMs = input.frameIntervalMs ?? SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS;
    let child: ChildProcess;
    try {
      child = this.spawnProcess(this.command, [
        '--input-url', input.sourceUrl,
        '--output-dir', input.tempDir,
        '--manifest', manifestPath,
        '--content-type', input.contentType,
        '--expected-size', String(input.sizeBytes),
        '--expected-sha256', input.checksumValue,
        '--max-frames', String(input.maxFrames),
        '--frame-interval-ms', String(frameIntervalMs),
        '--max-pixels', String(input.maxPixels),
        '--max-duration-ms', String(SCREEN_TEXT_MEDIA_MAX_DURATION_MS),
      ], { cwd: input.tempDir, shell: false, stdio: 'ignore', windowsHide: true });
    } catch {
      throw new ScreenTextMediaError('EXTRACTOR_FAILED');
    }
    return await new Promise<{ frames: ScreenTextLocalOcrFrame[]; videoDurationMs: number }>((resolveResult, reject) => {
      let settled = false;
      let killTimer: ReturnType<typeof setTimeout> | undefined;
      let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
      let abortListener: (() => void) | undefined;
      let pendingTermination: ScreenTextMediaError | undefined;
      const cleanup = () => {
        if (killTimer) clearTimeout(killTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (abortListener) input.signal.removeEventListener('abort', abortListener);
      };
      const fail = (error: ScreenTextMediaError) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const finish = async (code: number | null, signal: NodeJS.Signals | null) => {
        if (settled) return;
        if (pendingTermination) return fail(pendingTermination);
        if (code !== 0 || signal) return fail(new ScreenTextMediaError('EXTRACTOR_FAILED'));
        try {
          const parsed = parseManifest(JSON.parse(await readFile(manifestPath, 'utf8')) as unknown);
          const frames: ScreenTextLocalOcrFrame[] = [];
          for (const frame of parsed.frames) {
            if (!frame || typeof frame !== 'object') throw new ScreenTextMediaError('FRAME_OUTPUT_INVALID');
            const framePath = frameFilePath(input.tempDir, frame.fileName);
            const frameStat = await stat(framePath);
            if (!frameStat.isFile() || frameStat.size < 1 || frameStat.size > SCREEN_TEXT_MEDIA_MAX_FRAME_BYTES) {
              throw new ScreenTextMediaError('FRAME_OUTPUT_INVALID');
            }
            const bytes = Uint8Array.from(await readFile(framePath));
            frames.push({
              frameIndex: frame.frameIndex,
              capturedAtMs: frame.capturedAtMs,
              width: frame.width,
              height: frame.height,
              contentType: frame.contentType,
              bytes,
            });
          }
          if (!settled) {
            settled = true;
            cleanup();
            resolveResult(validateExtraction({ frames, videoDurationMs: parsed.videoDurationMs }, input));
          }
        } catch (error) {
          fail(error instanceof ScreenTextMediaError ? error : new ScreenTextMediaError('FRAME_OUTPUT_INVALID'));
        }
      };
      const terminate = (error: ScreenTextMediaError) => {
        if (settled || pendingTermination) return;
        pendingTermination = error;
        try { child.kill('SIGTERM'); } catch { /* 进程已退出 */ }
        killTimer = setTimeout(() => {
          try { child.kill('SIGKILL'); } catch { /* 进程已退出 */ }
          fail(error);
        }, 100);
      };
      child.once('error', () => fail(pendingTermination ?? new ScreenTextMediaError('EXTRACTOR_FAILED')));
      child.once('exit', (code, signal) => { void finish(code, signal); });
      abortListener = () => terminate(new ScreenTextMediaError('EXTRACTOR_CANCELLED'));
      input.signal.addEventListener('abort', abortListener, { once: true });
      timeoutTimer = setTimeout(() => terminate(new ScreenTextMediaError('EXTRACTOR_TIMEOUT')), this.timeoutMs);
    });
  }
}

/** 由既有 Asset 身份签发单对象短时 GET，再交给有界抽帧器。 */
export const createScreenTextRemoteMediaSource = (input: {
  signer: ScreenTextObjectUrlSigner;
  extractor: ScreenTextFrameExtractor;
  expiresInSeconds?: number;
}): ScreenTextRemoteMediaSource => {
  const boundedExtractor = new BoundedScreenTextFrameExtractor(input.extractor);
  return {
    async read(media) {
      const maxFrames = media.maxFrames ?? SCREEN_TEXT_MEDIA_MAX_FRAMES;
      const frameIntervalMs = media.frameIntervalMs ?? SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS;
      const expiresInSeconds = Math.min(600, Math.max(1, Math.trunc(input.expiresInSeconds ?? 600)));
      const sourceUrl = await input.signer.createGetUrl({
        assetId: media.assetId,
        objectKey: media.objectKey,
        expiresInSeconds,
      });
      validateSourceUrl(sourceUrl);
      const extracted = await boundedExtractor.extract({
        sourceUrl,
        contentType: media.contentType,
        sizeBytes: media.sizeBytes,
        checksumValue: media.checksumValue,
        maxFrames,
        maxPixels: SCREEN_TEXT_MEDIA_MAX_PIXELS,
        frameIntervalMs,
        signal: media.signal,
        tempDir: '',
      });
      return {
        contentType: media.contentType,
        sizeBytes: media.sizeBytes,
        checksumValue: media.checksumValue,
        videoDurationMs: extracted.videoDurationMs,
        frameCount: extracted.frames.length,
        pixelCount: extracted.pixelCount,
        maxFrameCount: maxFrames,
        maxPixels: SCREEN_TEXT_MEDIA_MAX_PIXELS,
        frames: extracted.frames,
      };
    },
  };
};

export const createConfiguredScreenTextFrameExtractorFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
  options: ScreenTextProcessExtractorOptions = {},
) => {
  const command = env.QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN?.trim();
  if (!command) throw new ScreenTextMediaError('EXTRACTOR_UNAVAILABLE');
  return new ExecutableScreenTextFrameExtractor(command, options);
};

/** 兼容既有调用名：配置了路径时返回可执行 runner，未配置时稳定 fail-closed。 */
export const requireConfiguredScreenTextExtractor = (
  env: NodeJS.ProcessEnv = process.env,
  options: ScreenTextProcessExtractorOptions = {},
) => createConfiguredScreenTextFrameExtractorFromEnv(env, options);
