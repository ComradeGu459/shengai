import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FrameExtractorError,
  main,
  runFrameExtractor,
  type FrameExtractorSpawn,
} from '../../backend/sidecars/local-ocr/frame-extractor.js';

const digest = 'a'.repeat(64);

const cliArgs = (root: string, overrides: Partial<{
  sourceUrl: string;
  expectedSize: number;
  maxFrames: number;
  frameIntervalMs: number;
  maxPixels: number;
  maxDurationMs: number;
  manifestPath: string;
}> = {}) => [
  '--input-url', overrides.sourceUrl ?? 'https://cdn.invalid/private/video.mp4?sig=opaque',
  '--output-dir', root,
  '--manifest', overrides.manifestPath ?? join(root, 'qimao-frames.json'),
  '--content-type', 'video/mp4',
  '--expected-size', String(overrides.expectedSize ?? 1_234),
  '--expected-sha256', digest,
  '--max-frames', String(overrides.maxFrames ?? 600),
  '--frame-interval-ms', String(overrides.frameIntervalMs ?? 1000),
  '--max-pixels', String(overrides.maxPixels ?? 30_000),
  '--max-duration-ms', String(overrides.maxDurationMs ?? 86_400_000),
];

const makeFakeCommands = async (root: string, mode: 'success' | 'probe-fail' | 'oversize' | 'cumulative' | 'high-entropy' | 'malformed-jpeg' | 'legacy-png' | 'size-na' | 'size-mismatch' | 'slow' | 'ignore-term' | 'slow-ffmpeg') => {
  const probe = join(root, 'fake-ffprobe.cjs');
  const ffmpeg = join(root, 'fake-ffmpeg.cjs');
  const ffmpegCapture = join(root, 'ffmpeg-args.json');
  const probePid = join(root, 'ffprobe-pid.txt');
  const ffmpegPid = join(root, 'ffmpeg-pid.txt');
  const duration = mode === 'cumulative' || mode === 'high-entropy' ? '5' : '2.5';
  const size = mode === 'size-na' ? ',"size":"N/A"' : mode === 'size-mismatch' ? ',"size":"999"' : '';
  const payload = `{"format":{"duration":"${duration}"${size}},"streams":[{"codec_type":"video","width":401,"height":301}]}`;
  const probeCode = mode === 'probe-fail'
    ? 'process.exit(7);\n'
    : mode === 'slow'
      ? `setTimeout(() => process.stdout.write(${JSON.stringify(payload)}), 10_000);\n`
      : mode === 'ignore-term'
        ? `process.on('SIGTERM', () => {}); setTimeout(() => process.stdout.write(${JSON.stringify(payload)}), 10_000);\n`
      : `process.stdout.write(${JSON.stringify(payload)});\n`;
  await writeFile(probe, `#!/usr/bin/env node\nrequire('node:fs').writeFileSync(${JSON.stringify(probePid)}, String(process.pid));\n${probeCode}`, 'utf8');
  const fakePngSource = 'const png=Buffer.alloc(64); Buffer.from([137,80,78,71,13,10,26,10]).copy(png,0); png.write("IHDR",12,"ascii"); png.writeUInt32BE(width,16); png.writeUInt32BE(height,20);';
  const fakeJpegSource = 'const jpeg=Buffer.alloc(32); jpeg[0]=0xff; jpeg[1]=0xd8; jpeg[2]=0xff; jpeg[3]=0xe0; jpeg[4]=0; jpeg[5]=2; jpeg[6]=0xff; jpeg[7]=0xc0; jpeg[8]=0; jpeg[9]=17; jpeg[10]=8; jpeg.writeUInt16BE(height,11); jpeg.writeUInt16BE(width,13); jpeg[15]=1; jpeg[16]=0; jpeg[17]=1; jpeg[18]=0; jpeg[19]=2; jpeg[20]=0; jpeg[30]=0xff; jpeg[31]=0xd9;';
  const ffmpegCode = mode === 'slow-ffmpeg'
    ? `const fs=require('node:fs'); fs.writeFileSync(${JSON.stringify(ffmpegPid)}, String(process.pid)); setTimeout(()=>{}, 10_000);\n`
    : mode === 'oversize'
    ? `const fs=require('node:fs'); const args=process.argv.slice(2); const count=Number(args[args.indexOf('-frames:v')+1]||1); const pattern=args.at(-1); for(let i=1;i<=count;i++){fs.writeFileSync(pattern.replace('%06d',String(i).padStart(6,'0')), Buffer.alloc(7500001));}\n`
    : mode === 'cumulative'
      ? `const fs=require('node:fs'); const args=process.argv.slice(2); const count=Number(args[args.indexOf('-frames:v')+1]||1); const pattern=args.at(-1); const isJpeg=pattern.endsWith('.jpg'); for(let i=1;i<=count;i++){const bytes=Buffer.alloc(6500000); if(isJpeg){bytes[0]=0xff; bytes[1]=0xd8; bytes[2]=0xff; bytes[3]=0xc0; bytes[4]=0; bytes[5]=17; bytes[6]=8; bytes.writeUInt16BE(2,7); bytes.writeUInt16BE(2,9); bytes[bytes.length-2]=0xff; bytes[bytes.length-1]=0xd9;} else {Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes,0); bytes.write('IHDR',12,'ascii'); bytes.writeUInt32BE(2,16); bytes.writeUInt32BE(2,20);} fs.writeFileSync(pattern.replace('%06d',String(i).padStart(6,'0')), bytes);}\n`
    : mode === 'high-entropy'
      ? `const crypto=require('node:crypto'); const fs=require('node:fs'); const args=process.argv.slice(2); const count=Number(args[args.indexOf('-frames:v')+1]||1); const pattern=args.at(-1); const jpeg=pattern.endsWith('.jpg'); for(let i=1;i<=count;i++){const bytes=Buffer.alloc(jpeg ? 1000000 : 6500000); if(jpeg){bytes[0]=0xff; bytes[1]=0xd8; bytes[2]=0xff; bytes[3]=0xe0; bytes[4]=0; bytes[5]=2; bytes[6]=0xff; bytes[7]=0xc0; bytes[8]=0; bytes[9]=17; bytes[10]=8; bytes.writeUInt16BE(301,11); bytes.writeUInt16BE(401,13); bytes[15]=1; bytes[16]=0; bytes[17]=1; bytes[18]=0; bytes[19]=2; bytes[20]=0; bytes[bytes.length-2]=0xff; bytes[bytes.length-1]=0xd9;} else {Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes,0); bytes.write('IHDR',12,'ascii'); bytes.writeUInt32BE(2,16); bytes.writeUInt32BE(2,20); crypto.randomFillSync(bytes,24);} fs.writeFileSync(pattern.replace('%06d',String(i).padStart(6,'0')), bytes);}\n`
    : mode === 'malformed-jpeg'
      ? `const fs=require('node:fs'); const args=process.argv.slice(2); const count=Number(args[args.indexOf('-frames:v')+1]||1); const pattern=args.at(-1); for(let i=1;i<=count;i++){fs.writeFileSync(pattern.replace('%06d',String(i).padStart(6,'0')), Buffer.from([0xff,0xd8,0xff,0xc0,0,1]));}\n`
    : mode === 'legacy-png'
      ? `const fs=require('node:fs'); const args=process.argv.slice(2); const count=Number(args[args.indexOf('-frames:v')+1]||1); const pattern=args.at(-1).replace(/\\.jpg$/,'.png'); for(let i=1;i<=count;i++){const png=Buffer.alloc(64); Buffer.from([137,80,78,71,13,10,26,10]).copy(png,0); png.write('IHDR',12,'ascii'); png.writeUInt32BE(2,16); png.writeUInt32BE(2,20); fs.writeFileSync(pattern.replace('%06d',String(i).padStart(6,'0')), png);}\n`
    : `const fs=require('node:fs'); const args=process.argv.slice(2); fs.writeFileSync(${JSON.stringify(ffmpegCapture)}, JSON.stringify(args)); const vf=args[args.indexOf('-vf')+1]||''; const match=vf.match(/scale=(\\d+):(\\d+)/); const width=Number(match?.[1]||2), height=Number(match?.[2]||2); const count=Number(args[args.indexOf('-frames:v')+1]||1); const pattern=args.at(-1); const isJpeg=pattern.endsWith('.jpg'); ${fakePngSource} ${fakeJpegSource} for(let i=1;i<=count;i++){fs.writeFileSync(pattern.replace('%06d',String(i).padStart(6,'0')), isJpeg ? jpeg : png);}\n`;
  await writeFile(ffmpeg, `#!/usr/bin/env node\n${ffmpegCode}`, 'utf8');
  return { probe, ffmpeg, ffmpegCapture, probePid, ffmpegPid };
};

const spawnFake = (): FrameExtractorSpawn => (command, args, options) => {
  return spawn(process.execPath, [command, ...args], { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
};

describe('本地 screen-text ffprobe/ffmpeg 抽帧 sidecar', () => {
  it('按管理员快照的毫秒间隔计算帧数并把参数传入 ffmpeg', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qimao-frame-extractor-'));
    try {
      const commands = await makeFakeCommands(root, 'success');
      await runFrameExtractor({
        argv: cliArgs(root, { frameIntervalMs: 2000 }),
        env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: commands.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: commands.ffmpeg },
        spawnProcess: spawnFake(),
      });
      const manifest = JSON.parse(await readFile(join(root, 'qimao-frames.json'), 'utf8')) as { frames: unknown[] };
      expect(manifest.frames).toHaveLength(2);
      const args = JSON.parse(await readFile(commands.ffmpegCapture, 'utf8')) as string[];
      expect(args).toEqual(expect.arrayContaining(['-frames:v', '2']));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('单次 ffprobe+ffmpeg 按真实时长/尺寸计算偶数缩放与采样，并写固定 manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qimao-frame-extractor-'));
    try {
      const commands = await makeFakeCommands(root, 'success');
      await runFrameExtractor({
        argv: cliArgs(root),
        env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: commands.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: commands.ffmpeg },
        spawnProcess: spawnFake(),
      });
      const manifest = JSON.parse(await readFile(join(root, 'qimao-frames.json'), 'utf8')) as { videoDurationMs: number; frames: Array<{ width: number; height: number; frameIndex: number; fileName: string; contentType: string }> };
      expect(manifest.videoDurationMs).toBe(2_500);
      expect(manifest.frames).toHaveLength(3);
      expect(manifest.frames.every((frame) => frame.width % 2 === 0 && frame.height % 2 === 0)).toBe(true);
      expect(manifest.frames.every((frame) => frame.contentType === 'image/jpeg' && /^frame-\d{6}\.jpg$/.test(frame.fileName))).toBe(true);
      expect((await readFile(join(root, 'frame-000001.jpg'))).subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
      const args = JSON.parse(await readFile(commands.ffmpegCapture, 'utf8')) as string[];
      expect(args.filter((value) => value === '-frames:v')).toHaveLength(1);
      const frameCount = Number(args[args.indexOf('-frames:v') + 1]);
      const scale = args[args.indexOf('-vf') + 1]!.match(/scale=(\d+):(\d+)/)!;
      expect(frameCount).toBe(3);
      expect(Number(scale[1]) * Number(scale[2]) * frameCount).toBeLessThanOrEqual(30_000);
      expect(args).toEqual(expect.arrayContaining(['-f', 'image2', '-c:v', 'mjpeg', '-q:v', '5']));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('严格拒绝非 HTTPS、路径逃逸、探测失败和超大帧，并返回稳定错误码', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qimao-frame-extractor-'));
    try {
      const commands = await makeFakeCommands(root, 'success');
      await expect(runFrameExtractor({
        argv: cliArgs(root, { sourceUrl: 'http://cdn.invalid/video.mp4' }),
        env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: commands.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: commands.ffmpeg },
        spawnProcess: spawnFake(),
      })).rejects.toMatchObject({ code: 'INPUT_INVALID' });
      await expect(runFrameExtractor({
        argv: cliArgs(root, { manifestPath: join(root, '..', 'escape.json') }),
        env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: commands.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: commands.ffmpeg },
        spawnProcess: spawnFake(),
      })).rejects.toMatchObject({ code: 'INPUT_INVALID' });

      const probeFailure = await makeFakeCommands(root, 'probe-fail');
      await expect(runFrameExtractor({
        argv: cliArgs(root),
        env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: probeFailure.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: probeFailure.ffmpeg },
        spawnProcess: spawnFake(),
      })).rejects.toMatchObject({ code: 'PROBE_FAILED' });

      const oversize = await makeFakeCommands(root, 'oversize');
      await expect(runFrameExtractor({
        argv: cliArgs(root),
        env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: oversize.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: oversize.ffmpeg },
        spawnProcess: spawnFake(),
      })).rejects.toMatchObject({ code: 'OUTPUT_INVALID' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('把缺失/N/A 的远端大小视为不可得，仅校验有限正整数，并拒绝累计帧超 32MB', async () => {
    const roots = await Promise.all([
      mkdtemp(join(tmpdir(), 'qimao-frame-extractor-')),
      mkdtemp(join(tmpdir(), 'qimao-frame-extractor-')),
      mkdtemp(join(tmpdir(), 'qimao-frame-extractor-')),
      mkdtemp(join(tmpdir(), 'qimao-frame-extractor-')),
    ]);
    try {
      const missing = await makeFakeCommands(roots[0]!, 'success');
      await runFrameExtractor({ argv: cliArgs(roots[0]!), env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: missing.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: missing.ffmpeg }, spawnProcess: spawnFake() });
      const missingManifest = JSON.parse(await readFile(join(roots[0]!, 'qimao-frames.json'), 'utf8')) as { frames: unknown[] };
      expect(missingManifest.frames).toHaveLength(3);

      const notAvailable = await makeFakeCommands(roots[1]!, 'size-na');
      await runFrameExtractor({ argv: cliArgs(roots[1]!), env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: notAvailable.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: notAvailable.ffmpeg }, spawnProcess: spawnFake() });
      await expect(readFile(join(roots[1]!, 'qimao-frames.json'), 'utf8')).resolves.toContain('videoDurationMs');

      const mismatch = await makeFakeCommands(roots[2]!, 'size-mismatch');
      await expect(runFrameExtractor({ argv: cliArgs(roots[2]!), env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: mismatch.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: mismatch.ffmpeg }, spawnProcess: spawnFake() })).rejects.toMatchObject({ code: 'PROBE_FAILED' });

      const cumulative = await makeFakeCommands(roots[3]!, 'cumulative');
      await expect(runFrameExtractor({ argv: cliArgs(roots[3]!, { maxFrames: 5, maxPixels: 1_000_000 }), env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: cumulative.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: cumulative.ffmpeg }, spawnProcess: spawnFake() })).rejects.toMatchObject({ code: 'OUTPUT_INVALID' });
      await expect(readFile(join(roots[3]!, 'qimao-frames.json'), 'utf8')).rejects.toThrow();
    } finally {
      await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
    }
  });

  it('保留 PNG manifest 兼容读取，并拒绝畸形 JPEG 输出', async () => {
    const roots = await Promise.all([
      mkdtemp(join(tmpdir(), 'qimao-frame-extractor-')),
      mkdtemp(join(tmpdir(), 'qimao-frame-extractor-')),
    ]);
    try {
      const legacy = await makeFakeCommands(roots[0]!, 'legacy-png');
      await runFrameExtractor({ argv: cliArgs(roots[0]!), env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: legacy.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: legacy.ffmpeg }, spawnProcess: spawnFake() });
      const legacyManifest = JSON.parse(await readFile(join(roots[0]!, 'qimao-frames.json'), 'utf8')) as { frames: Array<{ contentType: string; fileName: string }> };
      expect(legacyManifest.frames.every((frame) => frame.contentType === 'image/png' && /^frame-\d{6}\.png$/.test(frame.fileName))).toBe(true);

      const malformed = await makeFakeCommands(roots[1]!, 'malformed-jpeg');
      await expect(runFrameExtractor({ argv: cliArgs(roots[1]!), env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: malformed.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: malformed.ffmpeg }, spawnProcess: spawnFake() })).rejects.toMatchObject({ code: 'OUTPUT_INVALID' });
      await expect(readFile(join(roots[1]!, 'qimao-frames.json'), 'utf8')).rejects.toThrow();
    } finally {
      await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
    }
  });

  it('高熵大帧改走 JPEG 后保持签名/尺寸与 32MB 总字节界限', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qimao-frame-extractor-'));
    try {
      const commands = await makeFakeCommands(root, 'high-entropy');
      await runFrameExtractor({
        argv: cliArgs(root, { maxFrames: 5, maxPixels: 1_000_000 }),
        env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: commands.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: commands.ffmpeg },
        spawnProcess: spawnFake(),
      });
      const manifest = JSON.parse(await readFile(join(root, 'qimao-frames.json'), 'utf8')) as { frames: Array<{ width: number; height: number; contentType: string; fileName: string }> };
      expect(manifest.frames).toHaveLength(5);
      expect(manifest.frames.every((frame) => frame.contentType === 'image/jpeg' && /^frame-\d{6}\.jpg$/.test(frame.fileName))).toBe(true);
      expect(manifest.frames.every((frame) => frame.width === 401 && frame.height === 301)).toBe(true);
      const totalBytes = (await Promise.all(manifest.frames.map((frame) => readFile(join(root, frame.fileName))))).reduce((sum, bytes) => sum + bytes.byteLength, 0);
      expect(totalBytes).toBeLessThanOrEqual(32_000_000);
      expect((await readFile(join(root, manifest.frames[0]!.fileName))).subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('取消会终止当前 ffprobe，未知/失败不写 manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qimao-frame-extractor-'));
    const controller = new AbortController();
    try {
      const commands = await makeFakeCommands(root, 'slow');
      const pending = runFrameExtractor({
        argv: cliArgs(root),
        env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: commands.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: commands.ffmpeg },
        signal: controller.signal,
        spawnProcess: spawnFake(),
      });
      let pidText: string | undefined;
      for (let attempt = 0; attempt < 50 && !pidText; attempt += 1) {
        try { pidText = await readFile(commands.probePid, 'utf8'); } catch { await new Promise((resolve) => setTimeout(resolve, 10)); }
      }
      expect(pidText).toBeTruthy();
      controller.abort();
      await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
      const pid = Number(pidText);
      await new Promise((resolve) => setTimeout(resolve, 100));
      let alive = true;
      try { process.kill(pid, 0); } catch { alive = false; }
      expect(alive).toBe(false);
      await expect(readFile(join(root, 'qimao-frames.json'), 'utf8')).rejects.toThrow();
      expect(new FrameExtractorError('CANCELLED').message).toBe('QIMAO_FRAME_EXTRACTOR_CANCELLED');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('忽略 SIGTERM 时经 SIGKILL 后等待 close，promise 返回前 PID 已退出', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qimao-frame-extractor-'));
    const controller = new AbortController();
    try {
      const commands = await makeFakeCommands(root, 'ignore-term');
      const pending = runFrameExtractor({
        argv: cliArgs(root),
        env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: commands.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: commands.ffmpeg },
        signal: controller.signal,
        spawnProcess: spawnFake(),
      });
      let pidText: string | undefined;
      for (let attempt = 0; attempt < 50 && !pidText; attempt += 1) {
        try { pidText = await readFile(commands.probePid, 'utf8'); } catch { await new Promise((resolve) => setTimeout(resolve, 10)); }
      }
      expect(pidText).toBeTruthy();
      controller.abort();
      await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
      let alive = true;
      try { process.kill(Number(pidText), 0); } catch { alive = false; }
      expect(alive).toBe(false);
      await expect(readFile(join(root, 'qimao-frames.json'), 'utf8')).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('CLI 顶层 SIGTERM 通过同一 AbortController 终止子进程且不写 manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qimao-frame-extractor-'));
    const previousArgv = process.argv;
    const previousProbe = process.env.QIMAO_SCREEN_TEXT_FFPROBE_BIN;
    const previousFfmpeg = process.env.QIMAO_SCREEN_TEXT_FFMPEG_BIN;
    const previousExitCode = process.exitCode;
    try {
      const commands = await makeFakeCommands(root, 'slow');
      process.argv = [previousArgv[0]!, previousArgv[1]!, ...cliArgs(root)];
      process.env.QIMAO_SCREEN_TEXT_FFPROBE_BIN = commands.probe;
      process.env.QIMAO_SCREEN_TEXT_FFMPEG_BIN = commands.ffmpeg;
      const pending = main({ spawnProcess: spawnFake() });
      let pidText: string | undefined;
      for (let attempt = 0; attempt < 50 && !pidText; attempt += 1) {
        try { pidText = await readFile(commands.probePid, 'utf8'); } catch { await new Promise((resolve) => setTimeout(resolve, 10)); }
      }
      expect(pidText).toBeTruthy();
      process.emit('SIGTERM');
      await pending;
      expect(process.exitCode).toBe(2);
      await new Promise((resolve) => setTimeout(resolve, 100));
      let alive = true;
      try { process.kill(Number(pidText), 0); } catch { alive = false; }
      expect(alive).toBe(false);
      await expect(readFile(join(root, 'qimao-frames.json'), 'utf8')).rejects.toThrow();
    } finally {
      process.argv = previousArgv;
      if (previousProbe === undefined) delete process.env.QIMAO_SCREEN_TEXT_FFPROBE_BIN;
      else process.env.QIMAO_SCREEN_TEXT_FFPROBE_BIN = previousProbe;
      if (previousFfmpeg === undefined) delete process.env.QIMAO_SCREEN_TEXT_FFMPEG_BIN;
      else process.env.QIMAO_SCREEN_TEXT_FFMPEG_BIN = previousFfmpeg;
      process.exitCode = previousExitCode;
      await rm(root, { recursive: true, force: true });
    }
  });

  it('抽帧阶段收到取消也会终止并等待 ffmpeg', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qimao-frame-extractor-'));
    const controller = new AbortController();
    try {
      const commands = await makeFakeCommands(root, 'slow-ffmpeg');
      const pending = runFrameExtractor({
        argv: cliArgs(root),
        env: { QIMAO_SCREEN_TEXT_FFPROBE_BIN: commands.probe, QIMAO_SCREEN_TEXT_FFMPEG_BIN: commands.ffmpeg },
        signal: controller.signal,
        spawnProcess: spawnFake(),
      });
      let pidText: string | undefined;
      for (let attempt = 0; attempt < 50 && !pidText; attempt += 1) {
        try { pidText = await readFile(commands.ffmpegPid, 'utf8'); } catch { await new Promise((resolve) => setTimeout(resolve, 10)); }
      }
      expect(pidText).toBeTruthy();
      controller.abort();
      await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
      await new Promise((resolve) => setTimeout(resolve, 100));
      let alive = true;
      try { process.kill(Number(pidText), 0); } catch { alive = false; }
      expect(alive).toBe(false);
      await expect(readFile(join(root, 'qimao-frames.json'), 'utf8')).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
