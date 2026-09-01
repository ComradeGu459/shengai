#!/usr/bin/env node

import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_FRAMES = 600;
const MAX_PIXELS = 120_000_000;
const MAX_FRAME_BYTES = 7_500_000;
const MAX_TOTAL_FRAME_BYTES = 32_000_000;
const MAX_DURATION_MS = 86_400_000;
const MIN_FRAME_INTERVAL_MS = 250;
const MAX_FRAME_INTERVAL_MS = 10_000;
const DEFAULT_FRAME_INTERVAL_MS = 1_000;
const MAX_VIDEO_BYTES = 50_000_000_000;
const SHA256 = /^[0-9a-f]{64}$/i;
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const JPEG_SIGNATURE = Uint8Array.from([0xff, 0xd8, 0xff]);

export type FrameExtractorErrorCode =
  | 'CONFIG_INVALID'
  | 'INPUT_INVALID'
  | 'PROBE_FAILED'
  | 'EXTRACT_FAILED'
  | 'OUTPUT_INVALID'
  | 'CANCELLED';

export class FrameExtractorError extends Error {
  constructor(readonly code: FrameExtractorErrorCode) {
    super(`QIMAO_FRAME_EXTRACTOR_${code}`);
    this.name = 'FrameExtractorError';
  }
}

type RunnerChild = ChildProcess;
export type FrameExtractorSpawn = (command: string, args: readonly string[], options: SpawnOptions) => RunnerChild;

export interface FrameExtractorRunOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly signal?: AbortSignal;
  readonly spawnProcess?: FrameExtractorSpawn;
  readonly argv?: readonly string[];
}

type CliInput = {
  readonly sourceUrl: string;
  readonly outputDir: string;
  readonly manifestPath: string;
  readonly contentType: string;
  readonly expectedSize: number;
  readonly expectedSha256: string;
  readonly maxFrames: number;
  readonly frameIntervalMs: number;
  readonly maxPixels: number;
  readonly maxDurationMs: number;
};

type ProbeInfo = { readonly durationMs: number; readonly width: number; readonly height: number; readonly sourceSize?: number };

const fail = (code: FrameExtractorErrorCode): never => { throw new FrameExtractorError(code); };

const asAbsoluteFile = (value: string | undefined): string => {
  if (typeof value !== 'string' || !isAbsolute(value) || value.includes('\0')) fail('CONFIG_INVALID');
  const normalized = resolve(value as string);
  try {
    if (!statSync(normalized).isFile()) fail('CONFIG_INVALID');
  } catch {
    fail('CONFIG_INVALID');
  }
  return normalized;
};

const parseInteger = (value: string | undefined, minimum: number, maximum: number): number => {
  if (!value || !/^\d+$/.test(value)) fail('INPUT_INVALID');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) fail('INPUT_INVALID');
  return parsed;
};

const parseArgs = (argv: readonly string[]): CliInput => {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (typeof key !== 'string' || !key.startsWith('--') || typeof value !== 'string' || values.has(key)) fail('INPUT_INVALID');
    values.set(key as string, value as string);
  }
  const expected = ['--input-url', '--output-dir', '--manifest', '--content-type', '--expected-size', '--expected-sha256', '--max-frames', '--max-pixels', '--max-duration-ms'];
  const allowed = [...expected, '--frame-interval-ms'];
  if ((values.size !== expected.length && values.size !== expected.length + 1)
    || expected.some((key) => !values.has(key)) || [...values.keys()].some((key) => !allowed.includes(key))) fail('INPUT_INVALID');
  const sourceUrl = values.get('--input-url')!;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || /[\r\n]/.test(sourceUrl)) fail('INPUT_INVALID');
  } catch {
    fail('INPUT_INVALID');
  }
  const outputDir = values.get('--output-dir')!;
  const manifestPath = values.get('--manifest')!;
  if (!isAbsolute(outputDir) || !isAbsolute(manifestPath) || outputDir.includes('\0') || manifestPath.includes('\0')
    || resolve(manifestPath) !== join(resolve(outputDir), 'qimao-frames.json')) fail('INPUT_INVALID');
  try {
    if (!statSync(resolve(outputDir)).isDirectory()) fail('INPUT_INVALID');
  } catch {
    fail('INPUT_INVALID');
  }
  const contentType = values.get('--content-type')!;
  if (!VIDEO_TYPES.has(contentType)) fail('INPUT_INVALID');
  const expectedSize = parseInteger(values.get('--expected-size'), 1, MAX_VIDEO_BYTES);
  const expectedSha256 = values.get('--expected-sha256')!;
  if (!SHA256.test(expectedSha256)) fail('INPUT_INVALID');
  const maxFrames = parseInteger(values.get('--max-frames'), 1, MAX_FRAMES);
  const frameIntervalMs = parseInteger(values.get('--frame-interval-ms') ?? String(DEFAULT_FRAME_INTERVAL_MS), MIN_FRAME_INTERVAL_MS, MAX_FRAME_INTERVAL_MS);
  const maxPixels = parseInteger(values.get('--max-pixels'), 1, MAX_PIXELS);
  const maxDurationMs = parseInteger(values.get('--max-duration-ms'), 1, MAX_DURATION_MS);
  return { sourceUrl, outputDir: resolve(outputDir), manifestPath: resolve(manifestPath), contentType, expectedSize, expectedSha256: expectedSha256.toLowerCase(), maxFrames, frameIntervalMs, maxPixels, maxDurationMs };
};

const runChild = (command: string, args: readonly string[], options: {
  readonly signal: AbortSignal;
  readonly spawnProcess: FrameExtractorSpawn;
  readonly captureStdout: boolean;
  readonly failureCode: 'PROBE_FAILED' | 'EXTRACT_FAILED';
}): Promise<string> => new Promise((resolveResult, rejectResult) => {
  if (options.signal.aborted) {
    rejectResult(new FrameExtractorError('CANCELLED'));
    return;
  }
  let child: RunnerChild;
  try {
    child = options.spawnProcess(command, args, {
      cwd: process.cwd(), shell: false, windowsHide: true,
      stdio: options.captureStdout ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'ignore', 'ignore'],
    });
  } catch {
    rejectResult(new FrameExtractorError(options.failureCode));
    return;
  }
  let settled = false;
  let terminationError: FrameExtractorError | undefined;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  let finalTimer: ReturnType<typeof setTimeout> | undefined;
  let forceKillSent = false;
  let output = '';
  const finish = (error?: FrameExtractorError) => {
    if (settled) return;
    settled = true;
    if (killTimer) clearTimeout(killTimer);
    if (finalTimer) clearTimeout(finalTimer);
    options.signal.removeEventListener('abort', onAbort);
    if (error) rejectResult(error); else resolveResult(output);
  };
  const terminate = (error: FrameExtractorError) => {
    if (settled || terminationError) return;
    terminationError = error;
    try { child.kill('SIGTERM'); } catch { /* 子进程已退出 */ }
    killTimer = setTimeout(() => {
      killTimer = undefined;
      forceKillSent = true;
      try { child.kill('SIGKILL'); } catch { /* 子进程已退出 */ }
      // SIGKILL 后仍等 close/error；仅以最终短门防止异常子进程永远挂起。
      finalTimer = setTimeout(() => finish(terminationError), 1_000);
    }, 1_000);
  };
  const onAbort = () => {
    terminate(new FrameExtractorError('CANCELLED'));
  };
  options.signal.addEventListener('abort', onAbort, { once: true });
  if (options.captureStdout && child.stdout) {
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
      if (Buffer.byteLength(output, 'utf8') > 1_000_000) {
        terminate(new FrameExtractorError(options.failureCode));
      }
    });
  }
  child.once('error', () => {
    if (terminationError && !forceKillSent) return;
    finish(terminationError ?? (options.signal.aborted ? new FrameExtractorError('CANCELLED') : new FrameExtractorError(options.failureCode)));
  });
  child.once('close', (code, signal) => {
    if (terminationError) finish(terminationError);
    else if (options.signal.aborted) finish(new FrameExtractorError('CANCELLED'));
    else if (code !== 0 || signal) finish(new FrameExtractorError(options.failureCode));
    else finish();
  });
  if (options.signal.aborted) onAbort();
});

const parseProbe = (output: string, input: CliInput): ProbeInfo => {
  let value: unknown;
  try { value = JSON.parse(output); } catch { fail('PROBE_FAILED'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('PROBE_FAILED');
  const root = value as Record<string, unknown>;
  const format = root.format;
  const streams = root.streams;
  if (!format || typeof format !== 'object' || Array.isArray(format) || !Array.isArray(streams)) fail('PROBE_FAILED');
  const durationRaw = (format as Record<string, unknown>).duration;
  const durationSeconds = typeof durationRaw === 'number' ? durationRaw : typeof durationRaw === 'string' ? Number(durationRaw) : NaN;
  const stream = (streams as unknown[]).find((candidate: unknown) => candidate && typeof candidate === 'object' && !Array.isArray(candidate) && (candidate as Record<string, unknown>).codec_type === 'video') as Record<string, unknown> | undefined;
  const width = stream?.width;
  const height = stream?.height;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !stream
    || typeof width !== 'number' || typeof height !== 'number'
    || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 2 || height < 2 || width > 7_680 || height > 4_320) {
    fail('PROBE_FAILED');
  }
  const durationMs = Math.ceil(durationSeconds * 1_000);
  if (!Number.isSafeInteger(durationMs) || durationMs < 1 || durationMs > input.maxDurationMs) fail('PROBE_FAILED');
  const sourceSize = (format as Record<string, unknown>).size;
  const parsedSize = typeof sourceSize === 'number'
    ? sourceSize
    : typeof sourceSize === 'string' && sourceSize.trim().toUpperCase() !== 'N/A'
      ? Number(sourceSize.trim())
      : NaN;
  if (Number.isFinite(parsedSize) && Number.isSafeInteger(parsedSize) && parsedSize > 0 && parsedSize !== input.expectedSize) {
    fail('PROBE_FAILED');
  }
  return {
    durationMs,
    width: width as number,
    height: height as number,
    ...(Number.isFinite(parsedSize) && Number.isSafeInteger(parsedSize) && parsedSize > 0 ? { sourceSize: parsedSize } : {}),
  };
};

const evenFloor = (value: number) => Math.max(2, Math.floor(value / 2) * 2);

const samplingPlan = (probe: ProbeInfo, input: CliInput) => {
  let frameCount = Math.min(input.maxFrames, Math.max(1, Math.ceil(probe.durationMs / input.frameIntervalMs)));
  if (frameCount * 4 > input.maxPixels) frameCount = Math.floor(input.maxPixels / 4);
  if (frameCount < 1) fail('INPUT_INVALID');
  const scale = Math.min(1, Math.sqrt(input.maxPixels / (frameCount * probe.width * probe.height)), 7_680 / probe.width, 4_320 / probe.height);
  let width = evenFloor(probe.width * scale);
  let height = evenFloor(probe.height * scale);
  while (width * height * frameCount > input.maxPixels) {
    if (width >= height && width > 2) width -= 2;
    else if (height > 2) height -= 2;
    else if (frameCount > 1) frameCount -= 1;
    else fail('INPUT_INVALID');
  }
  return { frameCount, width, height, fps: frameCount / (probe.durationMs / 1_000) };
};

const pngDimensions = (bytes: Uint8Array): { width: number; height: number } => {
  if (bytes.byteLength < 24 || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)
    || bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) fail('OUTPUT_INVALID');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (!width || !height || width > 7_680 || height > 4_320) fail('OUTPUT_INVALID');
  return { width, height };
};

const jpegDimensions = (bytes: Uint8Array): { width: number; height: number } => {
  if (bytes.byteLength < 4 || !JPEG_SIGNATURE.every((value, index) => bytes[index] === value)) fail('OUTPUT_INVALID');
  if (bytes[bytes.byteLength - 2] !== 0xff || bytes[bytes.byteLength - 1] !== 0xd9) fail('OUTPUT_INVALID');
  let offset = 2;
  while (offset + 1 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) fail('OUTPUT_INVALID');
    while (offset < bytes.byteLength && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.byteLength) fail('OUTPUT_INVALID');
    const marker = bytes[offset]!;
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.byteLength) fail('OUTPUT_INVALID');
    const segmentLength = (bytes[offset]! << 8) | bytes[offset + 1]!;
    if (segmentLength < 2 || offset + segmentLength > bytes.byteLength) fail('OUTPUT_INVALID');
    const isStartOfFrame = (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      if (segmentLength < 7) fail('OUTPUT_INVALID');
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const height = view.getUint16(offset + 3);
      const width = view.getUint16(offset + 5);
      if (!width || !height || width > 7_680 || height > 4_320) fail('OUTPUT_INVALID');
      return { width, height };
    }
    offset += segmentLength;
  }
  return fail('OUTPUT_INVALID');
};

const imageDimensions = (name: string, bytes: Uint8Array) => name.endsWith('.jpg') ? jpegDimensions(bytes) : pngDimensions(bytes);

const buildManifest = async (input: CliInput, probe: ProbeInfo, plan: ReturnType<typeof samplingPlan>, signal?: AbortSignal) => {
  const names = readdirSync(input.outputDir).filter((name) => /^frame-\d{6}\.(?:jpg|png)$/.test(name)).sort();
  if (names.length !== plan.frameCount || names.length < 1 || names.length > input.maxFrames) fail('OUTPUT_INVALID');
  const extensions = new Set(names.map((name) => name.slice(-3)));
  if (extensions.size !== 1) fail('OUTPUT_INVALID');
  let pixels = 0;
  let totalBytes = 0;
  const frames = [] as Array<{ frameIndex: number; capturedAtMs: number; width: number; height: number; contentType: 'image/png' | 'image/jpeg'; fileName: string }>;
  for (let index = 0; index < names.length; index += 1) {
    if (signal?.aborted) fail('CANCELLED');
    const name = names[index]!;
    const path = join(input.outputDir, name);
    if (basename(path) !== name) fail('OUTPUT_INVALID');
    const bytes = await readFile(path);
    if (bytes.byteLength < 1 || bytes.byteLength > MAX_FRAME_BYTES) fail('OUTPUT_INVALID');
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_TOTAL_FRAME_BYTES) fail('OUTPUT_INVALID');
    const dimensions = imageDimensions(name, bytes);
    pixels += dimensions.width * dimensions.height;
    if (pixels > input.maxPixels) fail('OUTPUT_INVALID');
    frames.push({ frameIndex: index, capturedAtMs: Math.min(probe.durationMs, Math.floor(index * probe.durationMs / names.length)), width: dimensions.width, height: dimensions.height, contentType: name.endsWith('.jpg') ? 'image/jpeg' : 'image/png', fileName: name });
  }
  if (frames.length > plan.frameCount) fail('OUTPUT_INVALID');
  if (signal?.aborted) fail('CANCELLED');
  await writeFile(input.manifestPath, JSON.stringify({ videoDurationMs: probe.durationMs, frames }, null, 2) + '\n', 'utf8');
};

export const runFrameExtractor = async (options: FrameExtractorRunOptions = {}): Promise<void> => {
  const env = options.env ?? process.env;
  const signal = options.signal ?? new AbortController().signal;
  if (signal.aborted) fail('CANCELLED');
  const ffprobe = asAbsoluteFile(env.QIMAO_SCREEN_TEXT_FFPROBE_BIN);
  const ffmpeg = asAbsoluteFile(env.QIMAO_SCREEN_TEXT_FFMPEG_BIN);
  const input = parseArgs(options.argv ?? process.argv.slice(2));
  const existing = readdirSync(input.outputDir);
  if (existing.some((name) => /^frame-\d{6}\.(?:jpg|jpeg|png)$/.test(name)) || statSync(input.manifestPath, { throwIfNoEntry: false })) fail('INPUT_INVALID');
  const spawnProcess = options.spawnProcess ?? (nodeSpawn as FrameExtractorSpawn);
  const probeOutput = await runChild(ffprobe, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', '-i', input.sourceUrl], { signal, spawnProcess, captureStdout: true, failureCode: 'PROBE_FAILED' });
  const probe = parseProbe(probeOutput, input);
  if (signal.aborted) fail('CANCELLED');
  const plan = samplingPlan(probe, input);
  const outputPattern = join(input.outputDir, 'frame-%06d.jpg');
  await runChild(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', input.sourceUrl,
    '-map', '0:v:0', '-vf', `fps=${plan.fps.toFixed(12)},scale=${plan.width}:${plan.height}:flags=lanczos`,
    '-frames:v', String(plan.frameCount), '-vsync', 'vfr', '-f', 'image2', '-c:v', 'mjpeg', '-q:v', '5', outputPattern,
  ], { signal, spawnProcess, captureStdout: false, failureCode: 'EXTRACT_FAILED' });
  if (signal.aborted) fail('CANCELLED');
  await buildManifest(input, probe, plan, signal);
};

const main = async (options: FrameExtractorRunOptions = {}) => {
  const controller = new AbortController();
  const onSignal = () => controller.abort();
  process.once('SIGTERM', onSignal);
  process.once('SIGINT', onSignal);
  try {
    await runFrameExtractor({ ...options, signal: controller.signal });
  } catch (error) {
    const code = error instanceof FrameExtractorError ? error.code : 'EXTRACT_FAILED';
    process.stderr.write(`QIMAO_FRAME_EXTRACTOR_${code}\n`);
    process.exitCode = 2;
  } finally {
    process.removeListener('SIGTERM', onSignal);
    process.removeListener('SIGINT', onSignal);
  }
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) await main();

export { main };
