import { createServer as createHttpServer, request as httpRequest } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LOCAL_OCR_DETECTION_MODEL,
  LOCAL_OCR_RECOGNITION_MODEL,
  LocalOcrSidecarError,
  PaddleHpiProcessEngine,
  createLocalOcrSidecarConfigFromEnv,
  createLocalOcrSidecarServer,
  modelVersionFor,
  validateLocalOcrSidecarConfig,
  type LocalOcrEngine,
  type LocalOcrEngineInput,
  type LocalOcrSidecarConfig,
} from '../../backend/sidecars/local-ocr/sidecar.js';

const digest = 'c'.repeat(64);

const makeFixture = async (backend: 'openvino' | 'onnxruntime') => {
  const root = await mkdtemp(join(tmpdir(), 'qimao-local-ocr-'));
  const modelDir = join(root, 'ppocrv6-small');
  await mkdir(join(modelDir, LOCAL_OCR_DETECTION_MODEL), { recursive: true });
  await mkdir(join(modelDir, LOCAL_OCR_RECOGNITION_MODEL), { recursive: true });
  await writeFile(join(modelDir, LOCAL_OCR_DETECTION_MODEL, 'PP-OCRv6_det_small.onnx'), 'fixture', 'utf8');
  await writeFile(join(modelDir, LOCAL_OCR_RECOGNITION_MODEL, 'PP-OCRv6_rec_small.onnx'), 'fixture', 'utf8');
  await writeFile(join(modelDir, 'ch_ppocr_mobile_v2.0_cls_mobile.onnx'), 'fixture', 'utf8');
  const runnerScript = join(root, 'runner.mjs');
  await writeFile(runnerScript, 'let b=""; process.stdin.setEncoding("utf8"); process.stdin.on("data", c => { b += c; let i; while ((i=b.indexOf("\\n")) >= 0) { b=b.slice(i+1); process.stdout.write(JSON.stringify({boxes:[]})+"\\n"); } });\n', 'utf8');
  const config = validateLocalOcrSidecarConfig({
    backend,
    port: 0,
    modelDir,
    modelDigest: digest,
    runnerExecutable: process.execPath,
    runnerScript,
    timeoutMs: 1_000,
  });
  return { root, config };
};

const requestBody = (config: LocalOcrSidecarConfig, overrides: Record<string, unknown> = {}) => ({
  protocolVersion: 'screen_text_local_ocr_v1',
  attemptId: '00000000-0000-4000-8000-000000000010',
  requestId: 'local-test-request',
  media: {
    inputKind: 'server_extracted_frames',
    contentType: 'video/mp4',
    sizeBytes: 5_000_000_000,
    checksumAlgorithm: 'sha256',
    checksumValue: digest,
    videoDurationMs: 8_000,
    maxFrameCount: 600,
    maxPixels: 120_000_000,
  },
  frames: [{
    frameIndex: 0,
    capturedAtMs: 100,
    width: 640,
    height: 360,
    contentType: 'image/png',
    bytesBase64: Buffer.from([1, 2, 3]).toString('base64'),
  }],
  language: 'zh-CN',
  modelVersion: modelVersionFor(config.modelDigest),
  ...overrides,
});

const validEngine: LocalOcrEngine = {
  recognize: async (input) => ({
    boxes: [{
      frameIndex: input.frames[0]!.frameIndex,
      text: '测试文本',
      confidence: 0.92,
      language: input.language,
      x: 10,
      y: 10,
      width: 120,
      height: 30,
      startMs: 100,
      endMs: 1_100,
    }],
  }),
};

const start = async (config: LocalOcrSidecarConfig, engine: LocalOcrEngine) => {
  const sidecar = createLocalOcrSidecarServer({ config, engine });
  const address = await sidecar.start();
  return { sidecar, url: `http://127.0.0.1:${address.port}${config.endpointPath}` };
};

const ensureProductionSidecarBuild = async () => {
  const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe') : 'pnpm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'pnpm.cmd --filter @qimao-terms-cloud/backend run build:sidecars']
    : ['--filter', '@qimao-terms-cloud/backend', 'run', 'build:sidecars'];
  await new Promise<void>((resolveBuild, rejectBuild) => {
    const child = spawn(command, args, { cwd: resolve('.'), env: { ...process.env }, stdio: ['ignore', 'ignore', 'ignore'] });
    const timer = setTimeout(() => { child.kill('SIGTERM'); rejectBuild(new Error('LOCAL_OCR_SIDECAR_BUILD_TIMEOUT')); }, 30_000);
    child.once('error', (error) => { clearTimeout(timer); rejectBuild(error); });
    child.once('close', (code) => { clearTimeout(timer); code === 0 ? resolveBuild() : rejectBuild(new Error('LOCAL_OCR_SIDECAR_BUILD_FAILED')); });
  });
};

const freePort = async () => {
  const server = createHttpServer();
  await new Promise<void>((resolveListen, rejectListen) => server.listen(0, '127.0.0.1', () => resolveListen()));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise<void>((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  if (!port) throw new Error('LOCAL_OCR_TEST_PORT_UNAVAILABLE');
  return port;
};

const pythonExecutable = () => {
  const command = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = execFileSync(command, ['python'], { encoding: 'utf8' }).split(/\r?\n/).map((value) => value.trim()).find(Boolean);
  if (!result) throw new Error('LOCAL_OCR_TEST_PYTHON_UNAVAILABLE');
  return result;
};

const makeExecutableLauncherAlias = async (root: string, executable: string) => {
  if (process.platform === 'win32') {
    const targetDirectory = dirname(executable);
    const linkDirectory = join(root, 'python-directory-link');
    await symlink(targetDirectory, linkDirectory, 'junction');
    return join(linkDirectory, basename(executable));
  }
  const linkFile = join(root, 'python-file-link');
  await symlink(executable, linkFile);
  return linkFile;
};

const makeFilePathAlias = async (root: string, targetFile: string) => {
  if (process.platform === 'win32') {
    const linkDirectory = join(root, 'script-directory-link');
    await symlink(dirname(targetFile), linkDirectory, 'junction');
    return join(linkDirectory, basename(targetFile));
  }
  const linkFile = join(root, 'script-file-link');
  await symlink(targetFile, linkFile);
  return linkFile;
};

const postJson = (url: string, body: unknown) => new Promise<{ status: number; body: string }>((resolveResponse, rejectResponse) => {
  const request = httpRequest(url, { method: 'POST', headers: { 'content-type': 'application/json', connection: 'close' } }, (response) => {
    let payload = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { payload += chunk; });
    response.once('end', () => resolveResponse({ status: response.statusCode ?? 0, body: payload }));
  });
  request.once('error', rejectResponse);
  request.end(JSON.stringify(body));
});

describe('本地 OCR sidecar 进程包装', () => {
  it('sidecar 请求 timeout 默认 60 秒，允许 120 秒但拒绝越界配置', async () => {
    const fixture = await makeFixture('openvino');
    const baseEnv = {
      QIMAO_LOCAL_OCR_SIDECAR_ENABLED: 'true',
      QIMAO_LOCAL_OCR_SIDECAR_BACKEND: fixture.config.backend,
      QIMAO_LOCAL_OCR_SIDECAR_HOST: '127.0.0.1',
      QIMAO_LOCAL_OCR_SIDECAR_PORT: '19000',
      QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: digest,
      QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR: fixture.config.modelDir,
      QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE: fixture.config.runnerExecutable,
      QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT: fixture.config.runnerScript,
    };
    try {
      expect(validateLocalOcrSidecarConfig({ ...fixture.config, timeoutMs: undefined }).timeoutMs).toBe(60_000);
      expect(createLocalOcrSidecarConfigFromEnv(baseEnv)?.timeoutMs).toBe(60_000);
      expect(createLocalOcrSidecarConfigFromEnv({ ...baseEnv, QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS: '120000' })?.timeoutMs).toBe(120_000);
      expect(() => createLocalOcrSidecarConfigFromEnv({ ...baseEnv, QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS: '120001' }))
        .toThrowError('LOCAL_OCR_SIDECAR_CONFIG_INVALID');
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('默认关闭，缺摘要/模型/runner、非回环和越界模型目录均 fail-closed', async () => {
    expect(createLocalOcrSidecarConfigFromEnv({ NODE_ENV: 'test' })).toBeNull();
    expect(() => createLocalOcrSidecarConfigFromEnv({ QIMAO_LOCAL_OCR_SIDECAR_ENABLED: 'true' })).toThrowError('LOCAL_OCR_SIDECAR_CONFIG_INCOMPLETE');
    const fixture = await makeFixture('openvino');
    try {
      expect(() => validateLocalOcrSidecarConfig({ ...fixture.config, host: '0.0.0.0' })).toThrowError('LOCAL_OCR_SIDECAR_CONFIG_INVALID');
      expect(() => validateLocalOcrSidecarConfig({ ...fixture.config, modelDigest: 'not-a-digest' })).toThrowError('LOCAL_OCR_SIDECAR_CONFIG_INVALID');
      expect(() => validateLocalOcrSidecarConfig({ ...fixture.config, detModelDir: fixture.root })).toThrowError('LOCAL_OCR_SIDECAR_MODEL_UNAVAILABLE');
      expect(() => validateLocalOcrSidecarConfig({ ...fixture.config, runnerScript: join(fixture.root, 'missing.py') })).toThrowError('LOCAL_OCR_SIDECAR_RUNNER_UNAVAILABLE');
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('验证 runner 最终为普通文件但保留 venv launcher 的规范化路径', async () => {
    const fixture = await makeFixture('openvino');
    try {
      const launcherPath = await makeExecutableLauncherAlias(fixture.root, process.execPath);
      const scriptTargetDirectory = join(fixture.root, 'script-target');
      await mkdir(scriptTargetDirectory, { recursive: true });
      const scriptTarget = join(scriptTargetDirectory, 'runner.mjs');
      await writeFile(scriptTarget, await readFile(fixture.config.runnerScript), 'utf8');
      const scriptLink = await makeFilePathAlias(fixture.root, scriptTarget);
      const config = validateLocalOcrSidecarConfig({ ...fixture.config, runnerExecutable: launcherPath, runnerScript: scriptLink });
      expect(config.runnerExecutable).toBe(resolve(launcherPath));
      expect(config.runnerExecutable).not.toBe(resolve(process.execPath));
      expect(config.runnerScript).toBe(resolve(scriptTarget));
      expect(config.runnerScript).not.toBe(resolve(scriptLink));
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it.each(['openvino', 'onnxruntime'] as const)('以 %s 参数化 RapidOCR 直载包装并映射严格协议结果', async (backend) => {
    const fixture = await makeFixture(backend);
    const { sidecar, url } = await start(fixture.config, validEngine);
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody(fixture.config)) });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const body = await response.json() as Record<string, unknown>;
      expect(body).toMatchObject({
        protocolVersion: 'screen_text_local_ocr_v1',
        attemptId: '00000000-0000-4000-8000-000000000010',
        requestId: 'local-test-request',
        modelVersion: modelVersionFor(digest),
        language: 'zh-CN',
        frameCount: 1,
      });
      expect(body.boxes).toEqual([expect.objectContaining({ text: '测试文本', confidence: 0.92, frameIndex: 0 })]);
    } finally {
      await sidecar.stop();
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('拒绝身份不匹配、帧/请求体超限且不调用引擎', async () => {
    const fixture = await makeFixture('openvino');
    let calls = 0;
    const engine: LocalOcrEngine = { recognize: async () => { calls += 1; return { boxes: [] }; } };
    const { sidecar, url } = await start(fixture.config, engine);
    try {
      const wrongModel = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody(fixture.config, { modelVersion: modelVersionFor('d'.repeat(64)) })) });
      expect(wrongModel.status).toBe(400);
      const tooManyBytes = { ...fixture.config, maxFrameBytes: 2 } as LocalOcrSidecarConfig;
      await sidecar.stop();
      const limited = createLocalOcrSidecarServer({ config: tooManyBytes, engine });
      const address = await limited.start();
      const response = await fetch(`http://127.0.0.1:${address.port}/ocr`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody(fixture.config)) });
      expect(response.status).toBe(400);
      expect(calls).toBe(0);
      await limited.stop();
    } finally {
      await sidecar.stop();
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('最大并发为1，timeout/unknown稳定脱敏，HTTP取消会传递到引擎', async () => {
    const fixture = await makeFixture('onnxruntime');
    let release: (() => void) | undefined;
    let entered: (() => void) | undefined;
    const firstEntered = new Promise<void>((resolve) => { entered = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const blocking: LocalOcrEngine = { recognize: async (input) => { entered?.(); await gate; return validEngine.recognize(input, new AbortController().signal); } };
    const { sidecar, url } = await start(fixture.config, blocking);
    try {
      const first = fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody(fixture.config)) });
      await firstEntered;
      const second = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody(fixture.config, { requestId: 'second' })) });
      expect(second.status).toBe(429);
      release?.();
      expect((await first).status).toBe(200);
    } finally {
      await sidecar.stop();
      await rm(fixture.root, { recursive: true, force: true });
    }

    const timeoutFixture = await makeFixture('openvino');
    const timeoutSidecar = createLocalOcrSidecarServer({ config: timeoutFixture.config, engine: { recognize: async () => { throw new LocalOcrSidecarError('ENGINE_TIMEOUT'); } } });
    const timeoutAddress = await timeoutSidecar.start();
    const timeoutResponse = await fetch(`http://127.0.0.1:${timeoutAddress.port}/ocr`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody(timeoutFixture.config)) });
    expect(timeoutResponse.status).toBe(504);
    expect(await timeoutResponse.text()).not.toContain('测试文本');
    await timeoutSidecar.stop();
    await rm(timeoutFixture.root, { recursive: true, force: true });

    const unknownFixture = await makeFixture('openvino');
    const unknownSidecar = createLocalOcrSidecarServer({ config: unknownFixture.config, engine: { recognize: async () => { throw new Error('provider-sensitive-payload'); } } });
    const unknownAddress = await unknownSidecar.start();
    const unknownResponse = await fetch(`http://127.0.0.1:${unknownAddress.port}/ocr`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody(unknownFixture.config)) });
    expect(unknownResponse.status).toBe(500);
    expect(await unknownResponse.text()).not.toContain('provider-sensitive-payload');
    await unknownSidecar.stop();
    await rm(unknownFixture.root, { recursive: true, force: true });

    const cancelFixture = await makeFixture('onnxruntime');
    let aborted = false;
    let resolveCancelEntered: (() => void) | undefined;
    const cancelEntered = new Promise<void>((resolve) => { resolveCancelEntered = resolve; });
    let resolveAbort: (() => void) | undefined;
    const abortSeen = new Promise<void>((resolve) => { resolveAbort = resolve; });
    const cancelEngine: LocalOcrEngine = { recognize: async (_input, signal) => await new Promise<never>((_resolve, reject) => {
      resolveCancelEntered?.();
      signal.addEventListener('abort', () => { aborted = true; resolveAbort?.(); reject(new LocalOcrSidecarError('ENGINE_CANCELLED')); }, { once: true });
    }) };
    const cancelSidecar = createLocalOcrSidecarServer({ config: cancelFixture.config, engine: cancelEngine });
    const cancelAddress = await cancelSidecar.start();
    const pending = httpRequest(`http://127.0.0.1:${cancelAddress.port}/ocr`, { method: 'POST', headers: { 'content-type': 'application/json' } });
    pending.on('error', () => undefined);
    pending.end(JSON.stringify(requestBody(cancelFixture.config)));
    await cancelEntered;
    pending.destroy();
    await abortSeen;
    expect(aborted).toBe(true);
    await cancelSidecar.stop();
    await rm(cancelFixture.root, { recursive: true, force: true });
  });

  it('RapidOCR runner 只接收固定参数和严格 JSON，非零退出/超时不泄露输出', async () => {
    const fixture = await makeFixture('openvino');
    const runnerScript = join(fixture.root, 'echo-runner.mjs');
    await writeFile(runnerScript, 'process.stdout.write(JSON.stringify({ready:"screen_text_local_ocr_v1"})+"\\n"); let b=""; process.stdin.setEncoding("utf8"); process.stdin.on("data", c => { b += c; let i; while ((i=b.indexOf("\\n")) >= 0) { b=b.slice(i+1); process.stdout.write(JSON.stringify({boxes:[{frameIndex:0,text:"HPI",confidence:0.8,language:"zh-CN",x:1,y:1,width:10,height:10,startMs:100,endMs:200}]})+"\\n"); } });\n', 'utf8');
    const config = validateLocalOcrSidecarConfig({ ...fixture.config, runnerScript });
    const engine = new PaddleHpiProcessEngine(config);
    const input: LocalOcrEngineInput = {
      protocolVersion: 'screen_text_local_ocr_v1', attemptId: '00000000-0000-4000-8000-000000000010', requestId: 'hpi-test',
      modelVersion: modelVersionFor(digest), language: 'zh-CN',
      media: { inputKind: 'server_extracted_frames', contentType: 'video/mp4', sizeBytes: 1, checksumAlgorithm: 'sha256', checksumValue: digest, videoDurationMs: 8_000, maxFrameCount: 600, maxPixels: 120_000_000 },
      frames: [{ frameIndex: 0, capturedAtMs: 100, width: 640, height: 360, contentType: 'image/png', bytes: Uint8Array.from([1]) }],
    };
    const result = await engine.recognize(input, new AbortController().signal);
    expect(result.boxes[0]?.text).toBe('HPI');
    expect(config.backend).toBe('openvino');
    expect(config.modelDigest).toBe(digest);
    const second = await engine.recognize(input, new AbortController().signal);
    expect(second.boxes[0]?.text).toBe('HPI');
    await engine.close();
    await rm(fixture.root, { recursive: true, force: true });
  });

  it('READY 握手完成前不监听 HTTP，初始化超时则 fail-closed', async () => {
    const fixture = await makeFixture('openvino');
    const delayedRunner = join(fixture.root, 'delayed-ready.mjs');
    await writeFile(delayedRunner, 'setTimeout(() => process.stdout.write(JSON.stringify({ready:"screen_text_local_ocr_v1"})+"\\n"), 120); process.stdin.resume();\n', 'utf8');
    const delayedConfig = validateLocalOcrSidecarConfig({ ...fixture.config, runnerScript: delayedRunner, startupTimeoutMs: 1_000 });
    const delayedEngine = new PaddleHpiProcessEngine(delayedConfig);
    const delayedSidecar = createLocalOcrSidecarServer({ config: delayedConfig, engine: delayedEngine });
    const startPromise = delayedSidecar.start();
    expect(delayedSidecar.server.listening).toBe(false);
    await startPromise;
    expect(delayedSidecar.server.listening).toBe(true);
    await delayedSidecar.stop();
    await rm(fixture.root, { recursive: true, force: true });

    const timeoutFixture = await makeFixture('onnxruntime');
    const noReadyRunner = join(timeoutFixture.root, 'no-ready.mjs');
    await writeFile(noReadyRunner, 'process.stdin.resume();\n', 'utf8');
    const timeoutConfig = validateLocalOcrSidecarConfig({ ...timeoutFixture.config, runnerScript: noReadyRunner, startupTimeoutMs: 100 });
    const timeoutEngine = new PaddleHpiProcessEngine(timeoutConfig);
    await expect(timeoutEngine.start()).rejects.toMatchObject({ code: 'ENGINE_STARTUP_TIMEOUT' });
    await timeoutEngine.close();
    await rm(timeoutFixture.root, { recursive: true, force: true });
  });

  it.each(['openvino', 'onnxruntime'] as const)('真实 Python runner 在单进程内只建一次 RapidOCR，并回传两种结果框形状（%s）', async (backend) => {
    const fixture = await makeFixture(backend);
    const fakeRoot = join(fixture.root, 'fake-python');
    await mkdir(fakeRoot, { recursive: true });
    const countFile = join(fakeRoot, 'pipeline-count.txt');
    await writeFile(join(fakeRoot, 'cv2.py'), 'IMREAD_COLOR=1\ndef imdecode(values, mode):\n    return object()\n', 'utf8');
    await writeFile(join(fakeRoot, 'numpy.py'), 'def frombuffer(raw, dtype=None):\n    return raw\nuint8=object()\n', 'utf8');
    await writeFile(join(fakeRoot, 'rapidocr.py'), [
      'import os',
      'from enum import Enum',
      'COUNT = os.environ["QIMAO_FAKE_PIPELINE_COUNT"]',
      'class EngineType(Enum):',
      '    OPENVINO = "openvino"',
      '    ONNXRUNTIME = "onnxruntime"',
      'class ModelType(Enum):',
      '    MOBILE = "mobile"',
      '    SMALL = "small"',
      'class OCRVersion(Enum):',
      '    PPOCRV4 = "PP-OCRv4"',
      '    PPOCRV6 = "PP-OCRv6"',
      'class Result:',
      '    def __init__(self, index):',
      '        if index == 1:',
      '            boxes = [[1, 2, 8, 12]]',
      '            text = "vector"',
      '        else:',
      '            boxes = [[[2, 3], [9, 3], [9, 13], [2, 13]]]',
      '            text = "polygon"',
      '        self.boxes = boxes',
      '        self.txts = (text,)',
      '        self.scores = (0.8,)',
      'class RapidOCR:',
      '    def __init__(self, params=None):',
      '        self.calls = 0',
      '        try:',
      '            with open(COUNT, "r", encoding="utf8") as handle: current = int(handle.read() or "0")',
      '        except FileNotFoundError:',
      '            current = 0',
      '        current += 1',
      '        with open(COUNT, "w", encoding="utf8") as handle: handle.write(str(current))',
      '        os.write(1, b"native-init-stdout" + bytes([10]))',
      '        os.write(2, b"native-init-stderr" + bytes([10]))',
      '        assert params["Global.use_cls"] is False',
      '        expected_engine = EngineType.OPENVINO if os.environ["QIMAO_FAKE_BACKEND"] == "openvino" else EngineType.ONNXRUNTIME',
      '        assert isinstance(params["Det.engine_type"], EngineType) and params["Det.engine_type"] is expected_engine',
      '        assert isinstance(params["Rec.engine_type"], EngineType) and params["Rec.engine_type"] is expected_engine',
      '        assert isinstance(params["Cls.engine_type"], EngineType) and params["Cls.engine_type"] is expected_engine',
      '        assert params["Det.ocr_version"] is OCRVersion.PPOCRV6 and params["Det.model_type"] is ModelType.SMALL',
      '        assert params["Rec.ocr_version"] is OCRVersion.PPOCRV6 and params["Rec.model_type"] is ModelType.SMALL',
      '        assert params["Cls.ocr_version"] is OCRVersion.PPOCRV4 and params["Cls.model_type"] is ModelType.MOBILE',
      '        assert params["Det.model_path"].endswith("PP-OCRv6_det_small.onnx")',
      '        assert params["Rec.model_path"].endswith("PP-OCRv6_rec_small.onnx")',
      '        assert params["Cls.model_path"].endswith("ch_ppocr_mobile_v2.0_cls_mobile.onnx")',
      '    def __call__(self, input, **kwargs):',
      '        self.calls += 1',
      '        os.write(1, b"native-predict-stdout" + bytes([10]))',
      '        os.write(2, b"native-predict-stderr" + bytes([10]))',
      '        return Result(self.calls)',
    ].join('\n') + '\n', 'utf8');
    const python = process.env.PYTHON ?? 'python';
    const runnerPath = resolve('backend/sidecars/local-ocr/paddle_hpi_runner.py');
    const baseRequest = (id: string, capturedAtMs: number, videoDurationMs: number) => ({
      protocolVersion: 'screen_text_local_ocr_v1',
      attemptId: `00000000-0000-4000-8000-${id}`,
      requestId: `python-${id}`,
      modelVersion: modelVersionFor(digest),
      language: 'zh-CN',
      media: { inputKind: 'server_extracted_frames', contentType: 'video/mp4', sizeBytes: 1, checksumAlgorithm: 'sha256', checksumValue: digest, videoDurationMs, maxFrameCount: 600, maxPixels: 120_000_000 },
      frames: [{ frameIndex: 0, capturedAtMs, width: 100, height: 80, contentType: 'image/png', bytesBase64: Buffer.from([1, 2, 3]).toString('base64') }],
    });
    const child = spawn(python, [runnerPath, '--backend', backend, '--model-dir', fixture.config.modelDir, '--det-model', LOCAL_OCR_DETECTION_MODEL, '--rec-model', LOCAL_OCR_RECOGNITION_MODEL, '--model-digest', digest, '--protocol', 'screen_text_local_ocr_v1'], {
      cwd: resolve('.'),
      env: { ...process.env, PYTHONPATH: fakeRoot, QIMAO_FAKE_PIPELINE_COUNT: countFile, QIMAO_FAKE_BACKEND: backend },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolveClose, rejectClose) => {
      child.once('error', rejectClose);
      child.once('close', (code, signal) => resolveClose({ code, signal }));
    });
    try {
      child.stdin.write(`${JSON.stringify(baseRequest('000000000011', 9_500, 10_000))}\n`);
      child.stdin.write(`${JSON.stringify(baseRequest('000000000012', 10_000, 10_000))}\n`);
      child.stdin.write(`${JSON.stringify(baseRequest('000000000013', 1, 1))}\n`);
      child.stdin.end();
      const result = await Promise.race([closed, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('runner timeout')), 5_000))]);
      expect(result.code).toBe(0);
      const lines = stdout.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as { ready?: string; boxes?: Array<{ text: string; x: number; width: number; startMs: number; endMs: number }> });
      expect(lines[0]).toEqual({ ready: 'screen_text_local_ocr_v1' });
      expect(lines).toHaveLength(4);
      expect(lines[1]?.boxes?.[0]).toMatchObject({ text: 'vector', x: 1, width: 7, startMs: 9_500, endMs: 10_000 });
      expect(lines[2]?.boxes?.[0]).toMatchObject({ text: 'polygon', x: 2, width: 7, startMs: 9_999, endMs: 10_000 });
      expect(lines[3]?.boxes?.[0]).toMatchObject({ text: 'polygon', x: 2, width: 7, startMs: 0, endMs: 1 });
      expect(stdout).not.toContain('native-');
      expect(stderr).toBe('');
      expect(await readFile(countFile, 'utf8')).toBe('1');
    } finally {
      if (child.exitCode === null) child.kill('SIGTERM');
      await closed.catch(() => undefined);
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it.each(['openvino', 'onnxruntime'] as const)('生产 entry 经 PaddleHpiProcessEngine 启动真实 Python runner 并完成两次请求（%s）', async (backend) => {
    await ensureProductionSidecarBuild();
    const fixture = await makeFixture(backend);
    // fake 模块与 production runner 同目录，验证当前最小 env 也能按 Python
    // 的脚本目录导入，不把 PYTHONPATH 人为变成新的生产依赖。
    const countFile = join(fixture.root, 'pipeline-count.txt');
    await writeFile(join(fixture.root, 'cv2.py'), 'IMREAD_COLOR=1\ndef imdecode(values, mode):\n    return object()\n', 'utf8');
    await writeFile(join(fixture.root, 'numpy.py'), 'def frombuffer(raw, dtype=None):\n    return raw\nuint8=object()\n', 'utf8');
    await writeFile(join(fixture.root, 'rapidocr.py'), [
      'import os',
      'from enum import Enum',
      `COUNT = ${JSON.stringify(countFile)}`,
      `EXPECTED_BACKEND = ${JSON.stringify(backend)}`,
      'class EngineType(Enum):',
      '    OPENVINO = "openvino"',
      '    ONNXRUNTIME = "onnxruntime"',
      'class ModelType(Enum):',
      '    MOBILE = "mobile"',
      '    SMALL = "small"',
      'class OCRVersion(Enum):',
      '    PPOCRV4 = "PP-OCRv4"',
      '    PPOCRV6 = "PP-OCRv6"',
      'class Result:',
      '    def __init__(self, index):',
      '        self.boxes = [[1, 2, 8, 12]] if index == 1 else [[[2, 3], [9, 3], [9, 13], [2, 13]]]',
      '        self.txts = ("vector",) if index == 1 else ("polygon",)',
      '        self.scores = (0.8,)',
      'class RapidOCR:',
      '    def __init__(self, params=None):',
      '        expected = EngineType.OPENVINO if EXPECTED_BACKEND == "openvino" else EngineType.ONNXRUNTIME',
      '        assert params["Det.engine_type"] is expected and params["Rec.engine_type"] is expected and params["Cls.engine_type"] is expected',
      '        assert params["Det.model_type"] is ModelType.SMALL and params["Rec.model_type"] is ModelType.SMALL',
      '        assert params["Det.ocr_version"] is OCRVersion.PPOCRV6 and params["Rec.ocr_version"] is OCRVersion.PPOCRV6',
      '        try:',
      '            current = int(open(COUNT, "r", encoding="utf8").read() or "0")',
      '        except FileNotFoundError:',
      '            current = 0',
      '        with open(COUNT, "w", encoding="utf8") as handle: handle.write(str(current + 1))',
      '        os.write(1, b"native-init-stdout\\n")',
      '        os.write(2, b"native-init-stderr\\n")',
      '        self.calls = 0',
      '    def __call__(self, image, **kwargs):',
      '        self.calls += 1',
      '        os.write(1, b"native-predict-stdout\\n")',
      '        os.write(2, b"native-predict-stderr\\n")',
      '        return Result(self.calls)',
    ].join('\n') + '\n', 'utf8');
    const port = await freePort();
    const entryPath = resolve('backend/dist/sidecars/local-ocr/entry.js');
    const launcherPath = await makeExecutableLauncherAlias(fixture.root, pythonExecutable());
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH ?? '',
      NODE_ENV: 'test',
      QIMAO_LOCAL_OCR_SIDECAR_ENABLED: 'true',
      QIMAO_LOCAL_OCR_SIDECAR_BACKEND: backend,
      QIMAO_LOCAL_OCR_SIDECAR_HOST: '127.0.0.1',
      QIMAO_LOCAL_OCR_SIDECAR_PORT: String(port),
      QIMAO_LOCAL_OCR_SIDECAR_STARTUP_TIMEOUT_MS: '5000',
      QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS: '2000',
      QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST: digest,
      QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR: fixture.config.modelDir,
      QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE: launcherPath,
      QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT: resolve(fixture.root, 'paddle_hpi_runner.py'),
    };
    await writeFile(env.QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT, await readFile(resolve('backend/sidecars/local-ocr/paddle_hpi_runner.py')), 'utf8');
    const child = spawn(process.execPath, [entryPath], { cwd: resolve('.'), env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolveClose, rejectClose) => {
      child.once('error', rejectClose);
      child.once('close', (code, signal) => resolveClose({ code, signal }));
    });
    const listening = new Promise<void>((resolveListening, rejectListening) => {
      const timer = setTimeout(() => rejectListening(new Error('LOCAL_OCR_ENTRY_LISTEN_TIMEOUT')), 8_000);
      const onData = () => {
        for (const line of stdout.split('\n').filter(Boolean)) {
          try {
            const parsed = JSON.parse(line) as { event?: string; host?: string; port?: number };
            if (parsed.event === 'listening') {
              clearTimeout(timer);
              expect(parsed.host).toBe('127.0.0.1');
              expect(parsed.port).toBe(port);
              resolveListening();
              return;
            }
          } catch { /* 监听行未完整到达，等待下一块。 */ }
        }
      };
      child.stdout.on('data', onData);
      child.once('close', () => { clearTimeout(timer); rejectListening(new Error('LOCAL_OCR_ENTRY_EXITED_BEFORE_READY')); });
    });
    try {
      await listening;
      const url = `http://127.0.0.1:${port}/ocr`;
      const first = await postJson(url, requestBody(fixture.config, { requestId: 'production-entry-first' }));
      const second = await postJson(url, requestBody(fixture.config, { requestId: 'production-entry-second' }));
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect((JSON.parse(first.body) as Record<string, unknown>).requestId).toBe('production-entry-first');
      expect((JSON.parse(second.body) as Record<string, unknown>).requestId).toBe('production-entry-second');
      expect(await readFile(countFile, 'utf8')).toBe('1');
      expect(stdout.trim().split('\n').filter(Boolean)).toHaveLength(1);
      expect(stderr).toBe('');
    } finally {
      if (child.exitCode === null) child.kill('SIGTERM');
      let result = await Promise.race([closed, new Promise<null>((resolveTimeout) => setTimeout(() => resolveTimeout(null), 1_000))]);
      if (result === null) {
        child.kill('SIGKILL');
        result = await closed;
      }
      expect(result.code === 0 || result.signal === 'SIGTERM' || result.signal === 'SIGKILL', `entry exit ${result.code}; signal=${result.signal}; stdout=${stdout}; stderr=${stderr}`).toBe(true);
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});
