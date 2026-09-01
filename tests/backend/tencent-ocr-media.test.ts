import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  BoundedScreenTextFrameExtractor,
  createConfiguredScreenTextFrameExtractorFromEnv,
  createScreenTextRemoteMediaSource,
  ExecutableScreenTextFrameExtractor,
  ScreenTextMediaError,
  type ScreenTextFrameExtractorInput,
} from '../../backend/src/modules/screen-text/screen-text-media.js';
import { InMemoryScreenTextEvidenceStorage } from '../../backend/src/modules/screen-text/screen-text.evidence-storage.js';
import { ScreenTextWorker } from '../../backend/src/workers/screen-text.worker.js';
import { createScreenTextWorkerMediaSourceFromEnv } from '../../backend/src/workers/screen-text.worker.entry.js';

const checksum = 'a'.repeat(64);
const frame = (overrides: Partial<{ frameIndex: number; contentType: string; width: number; height: number }> = {}) => ({
  frameIndex: overrides.frameIndex ?? 0,
  capturedAtMs: 500,
  width: overrides.width ?? 640,
  height: overrides.height ?? 360,
  contentType: overrides.contentType ?? 'image/png',
  bytes: Uint8Array.from([1, 2, 3]),
});
const extractorInput = (overrides: Partial<ScreenTextFrameExtractorInput> = {}): ScreenTextFrameExtractorInput => ({
  sourceUrl: 'https://private.example.invalid/video.mp4?signature=redacted',
  contentType: 'video/mp4',
  sizeBytes: 10_000,
  checksumValue: checksum,
  maxFrames: 600,
  maxPixels: 120_000_000,
  signal: new AbortController().signal,
  tempDir: 'C:\\temp\\screen-text',
  ...overrides,
});

describe('腾讯 OCR 私有 COS 媒体数据面', () => {
  it('按 Asset/objectKey 签同一私有 HTTPS GET，提取器只收到 URL 和元数据，不调用 readObject', async () => {
    const signer = { createGetUrl: vi.fn(async () => 'https://bucket.cos.ap-nanjing.myqcloud.com/private/video.mp4?X-Amz-Signature=redacted') };
    const extractor = { extract: vi.fn(async (input: ScreenTextFrameExtractorInput) => ({
      frames: [frame(), frame({ frameIndex: 1, contentType: 'image/jpeg' })], videoDurationMs: 2_000,
    })) };
    const source = createScreenTextRemoteMediaSource({ signer, extractor, expiresInSeconds: 900 });
    const result = await source.read({
      assetId: 'asset-1', objectKey: 'private/project-1/video.mp4', contentType: 'video/mp4',
      sizeBytes: 10_000, checksumValue: checksum, signal: new AbortController().signal,
    });
    expect(signer.createGetUrl).toHaveBeenCalledWith({ assetId: 'asset-1', objectKey: 'private/project-1/video.mp4', expiresInSeconds: 600 });
    expect(extractor.extract).toHaveBeenCalledWith(expect.objectContaining({
      sourceUrl: expect.stringMatching(/^https:\/\//), sizeBytes: 10_000, checksumValue: checksum,
    }));
    expect(result).toMatchObject({ frameCount: 2, pixelCount: 460_800, contentType: 'video/mp4' });
    expect(result.frames.every((item) => item.contentType === 'image/png' || item.contentType === 'image/jpeg')).toBe(true);
    expect(JSON.stringify(result)).not.toContain('objectKey');
  });

  it('成功、异常和限制路径都 finally 清理临时目录，并拒绝 WebP/超像素', async () => {
    const removed: string[] = [];
    const makeBounded = (runner: any) => new BoundedScreenTextFrameExtractor(
      runner,
      async () => 'temp-screen-text',
      async (path) => { removed.push(path); },
    );
    await expect(makeBounded({ extract: async () => ({ frames: [frame()], videoDurationMs: 1_000 }) }).extract(extractorInput())).resolves.toMatchObject({ pixelCount: 230_400 });
    await expect(makeBounded({ extract: async () => { throw new Error('extractor failure'); } }).extract(extractorInput())).rejects.toThrow('extractor failure');
    await expect(makeBounded({ extract: async () => ({ frames: [frame({ contentType: 'image/webp' })], videoDurationMs: 1_000 }) }).extract(extractorInput())).rejects.toMatchObject({ code: 'FRAME_OUTPUT_INVALID' });
    await expect(makeBounded({ extract: async () => ({ frames: [frame({ width: 2, height: 2 })], videoDurationMs: 1_000 }) }).extract(extractorInput({ maxPixels: 1 }))).rejects.toMatchObject({ code: 'FRAME_LIMIT_EXCEEDED' });
    expect(removed).toHaveLength(4);
  });

  it('可执行抽帧器使用参数数组和隔离目录读取有界帧，不把原始异常回传', async () => {
    class FakeChild extends EventEmitter {
      killSignals: string[] = [];
      kill(signal?: string) { this.killSignals.push(signal ?? ''); queueMicrotask(() => this.emit('exit', 0, null)); return true; }
    }
    const tempDir = await mkdtemp(join(tmpdir(), 'qimao-ocr-media-test-'));
    try {
      const child = new FakeChild();
      const extractor = new ExecutableScreenTextFrameExtractor('approved-frame-tool', {
        spawnProcess: (_command, args, options) => {
          expect(options.shell).toBe(false);
          expect(args).toContain('--input-url');
          const manifest = args[args.indexOf('--manifest') + 1]!;
          const outputDir = args[args.indexOf('--output-dir') + 1]!;
          void Promise.all([
            writeFile(join(outputDir, 'frame-0.png'), Uint8Array.from([7, 8, 9])),
            writeFile(manifest, JSON.stringify({ videoDurationMs: 1_000, frames: [{ frameIndex: 0, capturedAtMs: 500, width: 640, height: 360, contentType: 'image/png', fileName: 'frame-0.png' }] })),
          ]).then(() => child.emit('exit', 0, null));
          return child as never;
        },
      });
      const result = await extractor.extract(extractorInput({ tempDir }));
      expect(result.frames[0]?.bytes).toEqual(Uint8Array.from([7, 8, 9]));
      expect(result.videoDurationMs).toBe(1_000);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('可执行文件失败、超时、取消均终止子进程并返回稳定错误', async () => {
    class IdleChild extends EventEmitter {
      killSignals: string[] = [];
      kill(signal?: string) { this.killSignals.push(signal ?? ''); queueMicrotask(() => this.emit('exit', null, signal ?? 'SIGTERM')); return true; }
    }
    const make = (timeoutMs = 200) => {
      const child = new IdleChild();
      const extractor = new ExecutableScreenTextFrameExtractor('approved-frame-tool', { timeoutMs, spawnProcess: () => child as never });
      return { child, extractor };
    };
    const timeout = make();
    await expect(timeout.extractor.extract(extractorInput())).rejects.toMatchObject({ code: 'EXTRACTOR_TIMEOUT' });
    expect(timeout.child.killSignals[0]).toBe('SIGTERM');
    const cancelled = make(5_000);
    const controller = new AbortController();
    const pending = cancelled.extractor.extract(extractorInput({ signal: controller.signal }));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'EXTRACTOR_CANCELLED' });
    expect(cancelled.child.killSignals[0]).toBe('SIGTERM');
    const failed = new ExecutableScreenTextFrameExtractor('approved-frame-tool', { spawnProcess: () => { throw new Error('SECRET_VALUE'); } });
    await expect(failed.extract(extractorInput())).rejects.toMatchObject({ code: 'EXTRACTOR_FAILED' });
    await expect(failed.extract(extractorInput())).rejects.not.toThrow('SECRET_VALUE');
  });

  it('媒体 Worker 装配只在显式 OCR+S3+抽帧器时启用，缺 bin 稳定 fail-closed', () => {
    expect(createScreenTextWorkerMediaSourceFromEnv({ env: { QIMAO_TENCENT_OCR_ENABLED: 'false' } })).toBeNull();
    const env = { QIMAO_TENCENT_OCR_ENABLED: 'true', QIMAO_UPLOAD_STORAGE_KIND: 's3' };
    const source = createScreenTextWorkerMediaSourceFromEnv({
      env,
      storage: { createGetUrl: vi.fn(async () => 'https://private.example.invalid/object?sig=redacted') },
      extractor: { extract: vi.fn(async () => ({ frames: [frame()], videoDurationMs: 1_000 })) },
    });
    expect(source).not.toBeNull();
    expect(() => createScreenTextWorkerMediaSourceFromEnv({
      env,
      storage: { createGetUrl: vi.fn(async () => 'https://private.example.invalid/object?sig=redacted') },
    })).toThrowError(new ScreenTextMediaError('EXTRACTOR_UNAVAILABLE'));
    expect(() => createScreenTextWorkerMediaSourceFromEnv({ env: { QIMAO_TENCENT_OCR_ENABLED: 'true', QIMAO_UPLOAD_STORAGE_KIND: 'filesystem' } })).toThrowError(new ScreenTextMediaError('SOURCE_STORAGE_UNAVAILABLE'));
    expect(() => createConfiguredScreenTextFrameExtractorFromEnv({})).toThrowError(new ScreenTextMediaError('EXTRACTOR_UNAVAILABLE'));
  });

  it('Tencent streamed Worker 路径只读同一 object 身份，绝不调用整对象 readObject', async () => {
    const sourceRead = vi.fn(async () => ({
      contentType: 'video/mp4', sizeBytes: 10_000, checksumValue: checksum, videoDurationMs: 1_000,
      frameCount: 1, pixelCount: 230_400, maxFrameCount: 600, maxPixels: 120_000_000, frames: [frame()],
    }));
    const worker = new ScreenTextWorker({} as never, {} as never, new InMemoryScreenTextEvidenceStorage(), undefined, {
      remoteMediaSource: { read: sourceRead },
      mediaStorage: { readObject: async () => { throw new Error('readObject must not be called'); } } as never,
    });
    const reader = worker as unknown as { readLocalOcrMedia(claim: any, signal: AbortSignal, streamed: boolean): Promise<any> };
    const media = await reader.readLocalOcrMedia({ asset: {
      assetId: 'asset-1', objectKey: 'private/project-1/video.mp4', originalFilename: 'episode.mp4', sizeBytes: 10_000, checksumValue: checksum,
    } }, new AbortController().signal, true);
    expect(sourceRead).toHaveBeenCalledWith(expect.objectContaining({ assetId: 'asset-1', objectKey: 'private/project-1/video.mp4', sizeBytes: 10_000 }));
    expect(media.sourceBytes).toBeUndefined();
    expect(media.frames).toHaveLength(1);
  });

  it('抽帧器 manifest 只允许临时目录内普通文件', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'qimao-ocr-media-test-'));
    try {
      const child = new EventEmitter() as EventEmitter & { kill: () => boolean };
      child.kill = () => true;
      const extractor = new ExecutableScreenTextFrameExtractor('approved-frame-tool', {
        spawnProcess: (_command, args) => {
          const manifest = args[args.indexOf('--manifest') + 1]!;
          void writeFile(manifest, JSON.stringify({ videoDurationMs: 1_000, frames: [{ frameIndex: 0, capturedAtMs: 1, width: 1, height: 1, contentType: 'image/png', fileName: '../escape.png' }] })).then(() => child.emit('exit', 0, null));
          return child as never;
        },
      });
      await expect(extractor.extract(extractorInput({ tempDir }))).rejects.toMatchObject({ code: 'FRAME_OUTPUT_INVALID' });
      await expect(readFile(join(tempDir, '..', 'escape.png'))).rejects.toBeDefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
