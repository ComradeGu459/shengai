import { describe, expect, it } from 'vitest';

import {
  classifyStartupReason,
  createRosBrowserProbe,
  createListeningLifecycle,
  createStartupBlockedLifecycle,
  type RosBrowserProbeConfig,
  type RosBrowserProbeResponse,
} from '../../backend/src/tools/ros-browser-probe.js';

const token = 'R'.repeat(64);
const secret = 'server-only-secret-value';
const objectKey = 'ros-probe/internal-object-key';
const config: RosBrowserProbeConfig = {
  endpoint: 'https://ros.example.invalid',
  bucket: 'private-bucket',
  region: 'cn-test-1',
  forcePathStyle: true,
  uploadMode: 'browser_direct',
  accessKeyId: 'server-only-access-key',
  secretAccessKey: secret,
  presignTtlSeconds: 600,
};

const parse = <T>(response: RosBrowserProbeResponse) => JSON.parse(response.body) as T;

const createFakeProvider = (anonymousStatus = 403, behavior: { deleteRemains?: boolean; abortRemains?: boolean } = {}) => {
  const calls: Array<{ name: string; input: Record<string, unknown> }> = [];
  const anonymousUrls: string[] = [];
  let createCount = 0;
  let headCount = 0;
  let listPartsCount = 0;
  let abortCommandCount = 0;
  const client = {
    send: async (raw: unknown) => {
      const command = raw as { constructor: { name: string }; input: Record<string, unknown> };
      const name = command.constructor.name;
      calls.push({ name, input: command.input });
      switch (name) {
        case 'CreateMultipartUploadCommand':
          createCount += 1;
          return { UploadId: `probe-upload-${createCount}` };
        case 'ListPartsCommand':
          listPartsCount += 1;
          if (abortCommandCount > 0 && !behavior.abortRemains) throw Object.assign(new Error('NoSuchUpload'), { name: 'NoSuchUpload' });
          return { Parts: [
            { PartNumber: 1, Size: 16 * 1024 * 1024, ETag: '"etag-first"' },
            { PartNumber: 2, Size: 1024, ETag: '"etag-last"' },
          ] };
        case 'CompleteMultipartUploadCommand':
        case 'DeleteObjectCommand':
          return {};
        case 'AbortMultipartUploadCommand':
          abortCommandCount += 1;
          return {};
        case 'HeadObjectCommand':
          headCount += 1;
          if (headCount > 1 && !behavior.deleteRemains) throw Object.assign(new Error('NotFound'), { name: 'NotFound' });
          return { ContentLength: 16 * 1024 * 1024 + 1024 };
        case 'GetObjectCommand':
          throw new Error('GetObject must not be used by probe head verification');
        default:
          throw new Error(`unexpected ${name}`);
      }
    },
  };
  const presignPart = async (command: { input: Record<string, unknown> }) => {
    const partNumber = Number(command.input.PartNumber);
    return `https://ros.example.invalid/signed-part-${partNumber}?X-Amz-Signature=${secret}`;
  };
  const anonymousGet = async (url: string) => {
    anonymousUrls.push(url);
    return anonymousStatus;
  };
  return { client, presignPart, anonymousGet, calls, anonymousUrls, objectKey };
};

const createProbe = (fake = createFakeProvider(), overrides: Partial<Parameters<typeof createRosBrowserProbe>[0]> = {}) =>
  createRosBrowserProbe({ token, config, client: fake.client, presignPart: fake.presignPart, anonymousGet: fake.anonymousGet, ...overrides });

const capabilityRequest = (probe: ReturnType<typeof createRosBrowserProbe>) => ({
  method: 'POST',
  url: `${probe.basePath}/capability`,
  headers: { 'x-ros-probe-token': token },
});

const resultRequest = (probe: ReturnType<typeof createRosBrowserProbe>, body: unknown) => ({
  method: 'POST',
  url: `${probe.basePath}/result`,
  headers: { 'x-ros-probe-token': token, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const passedParts = {
  status: 'passed',
  parts: [
    { partNumber: 1, sizeBytes: 16 * 1024 * 1024, etag: 'etag-first', checksumValue: 'a'.repeat(64) },
    { partNumber: 2, sizeBytes: 1024, etag: 'etag-last', checksumValue: 'b'.repeat(64) },
  ],
};

describe('ROS 浏览器直传能力探针', () => {
  it('启动 lifecycle 只输出安全字段，并将启动异常归入 allowlist', () => {
    const listening = createListeningLifecycle({ host: '127.0.0.1', port: 45_321 });
    expect(listening).toEqual({ event: 'listening', host: '127.0.0.1', port: 45_321 });
    const listeningJson = JSON.stringify(listening);
    expect(listeningJson).not.toContain(token);
    expect(listeningJson).not.toContain(secret);
    expect(listeningJson).not.toContain('ros.example.invalid');
    expect(listeningJson).not.toContain('private-bucket');
    expect(listeningJson).not.toContain('ros-probe/');

    const known = [
      ['ROS_PROBE_TOKEN_WEAK', 'TOKEN_WEAK'],
      ['ROS_PROBE_LOOPBACK_ONLY', 'LOOPBACK_ONLY'],
      ['ROS_PROBE_TTL_INVALID', 'TTL_INVALID'],
      ['ROS_PROBE_PORT_INVALID', 'PORT_INVALID'],
      ['ROS_PROBE_CONFIG_INVALID', 'CONFIG_INVALID'],
      ['ROS_PROBE_LISTEN_ERROR', 'LISTEN_ERROR'],
    ] as const;
    for (const [identifier, reason] of known) expect(classifyStartupReason(new Error(identifier))).toBe(reason);
    expect(classifyStartupReason(Object.assign(new Error('provider raw failure'), { code: 'EADDRINUSE' }))).toBe('LISTEN_ERROR');

    const unknown = `${secret} https://ros.example.invalid/private-bucket/ros-probe/internal-object-key`;
    expect(classifyStartupReason(new Error(unknown))).toBe('RUNTIME_ERROR');
    const blockedJson = JSON.stringify(createStartupBlockedLifecycle('RUNTIME_ERROR'));
    expect(blockedJson).not.toContain(secret);
    expect(blockedJson).not.toContain('https://');
    expect(blockedJson).not.toContain('private-bucket');
  });

  it('仅允许回环、强 token、十分钟以内 TTL，且 start 不会默认执行外部动作', async () => {
    expect(() => createRosBrowserProbe({ token: 'weak', config })).toThrow('ROS_PROBE_TOKEN_WEAK');
    expect(() => createRosBrowserProbe({ token, config, host: '0.0.0.0' })).toThrow('ROS_PROBE_LOOPBACK_ONLY');
    expect(() => createRosBrowserProbe({ token, config, ttlSeconds: 601 })).toThrow('ROS_PROBE_TTL_INVALID');
    expect(() => createRosBrowserProbe({ token, config, port: 65_536 })).toThrow('ROS_PROBE_PORT_INVALID');
    expect(() => createRosBrowserProbe({ token, config: { ...config, endpoint: 'http://unsafe.invalid' } })).toThrow('ROS_PROBE_CONFIG_INVALID');

    const fake = createFakeProvider();
    const probe = createProbe(fake, { port: 0 });
    expect(fake.calls).toHaveLength(0);
    const address = await probe.start();
    expect(address.host).toBe('127.0.0.1');
    expect(address.port).toBeGreaterThan(0);
    await probe.stop();
    expect(fake.calls).toHaveLength(0);
  });

  it('页面 no-store/CSP/no-referrer，capability 重放只创建一个 multipart', async () => {
    const fake = createFakeProvider();
    const probe = createProbe(fake);
    const page = await probe.dispatch({ method: 'GET', url: `${probe.basePath}/page` });
    expect(page.statusCode).toBe(200);
    expect(page.headers['Cache-Control']).toContain('no-store');
    expect(page.headers['Content-Security-Policy']).toContain("default-src 'none'");
    expect(page.headers['Referrer-Policy']).toBe('no-referrer');
    expect(page.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(page.body).toContain('<title>RUNNING</title>');
    expect(page.body).toContain('>RUNNING<');
    expect(page.body).toContain("setStatus('unknown')");
    expect(page.body).toContain('PASS');
    expect(page.body).toContain('BLOCKED');
    expect(page.body).toContain('UNKNOWN');
    expect(page.body).not.toContain(token);
    expect(page.body).not.toContain(secret);
    expect(page.body).not.toContain('https://');
    expect(page.body).not.toContain(objectKey);

    const first = await probe.dispatch(capabilityRequest(probe));
    const second = await probe.dispatch(capabilityRequest(probe));
    expect(first.statusCode).toBe(200);
    expect(second.body).toBe(first.body);
    expect(first.body).not.toContain('ros-probe/');
    expect(fake.calls.filter((call) => call.name === 'CreateMultipartUploadCommand')).toHaveLength(1);
    expect(parse<{ parts: Array<{ sizeBytes: number }> }>(first).parts.map((part) => part.sizeBytes)).toEqual([16 * 1024 * 1024, 1024]);
  });

  it('两片浏览器事实经 List/Complete/Head/私有读/Delete，并独立 Abort；Head 不回读对象', async () => {
    const fake = createFakeProvider();
    const probe = createProbe(fake);
    await probe.dispatch(capabilityRequest(probe));
    const passed = await probe.dispatch(resultRequest(probe, {
      status: 'passed',
      parts: [
        { partNumber: 1, sizeBytes: 16 * 1024 * 1024, etag: 'etag-first', checksumValue: 'a'.repeat(64) },
        { partNumber: 2, sizeBytes: 1024, etag: 'etag-last', checksumValue: 'b'.repeat(64) },
      ],
    }));
    expect(passed.statusCode).toBe(200);
    expect(parse<{ status: string; sdk: Record<string, boolean>; cleanup: { residual: number } }>(passed)).toMatchObject({
      status: 'pass',
      sdk: { create: true, presign: true, listParts: true, complete: true, head: true, privateRead: true, delete: true, abort: true },
      cleanup: { residual: 0 },
    });
    expect(fake.calls.map((call) => call.name)).not.toContain('GetObjectCommand');
    expect(fake.calls.map((call) => call.name)).not.toContain('ListMultipartUploadsCommand');
    expect(fake.calls.filter((call) => call.name === 'CreateMultipartUploadCommand')).toHaveLength(2);
    expect(fake.calls.filter((call) => call.name === 'CompleteMultipartUploadCommand')).toHaveLength(1);
    expect(fake.calls.filter((call) => call.name === 'AbortMultipartUploadCommand')).toHaveLength(1);
    expect(fake.anonymousUrls).toHaveLength(1);
    expect(parse<{ status: string; cleanup: { residual: number } }>(await probe.dispatch(resultRequest(probe, { status: 'passed', parts: [] })))).toMatchObject({ status: 'pass', cleanup: { residual: 0 } });
    expect(fake.calls.filter((call) => call.name === 'CompleteMultipartUploadCommand')).toHaveLength(1);
  });

  it('Delete 回执后 Head 仍存在时保持 blocked，不重发 Delete', async () => {
    const fake = createFakeProvider(403, { deleteRemains: true });
    const probe = createProbe(fake);
    await probe.dispatch(capabilityRequest(probe));
    const response = await probe.dispatch(resultRequest(probe, passedParts));
    expect(response.statusCode).toBe(503);
    expect(probe.summary()).toMatchObject({ status: 'blocked', sdk: { delete: false }, cleanup: { deleteCount: 0, residual: 1 } });
    expect(fake.calls.filter((call) => call.name === 'DeleteObjectCommand')).toHaveLength(1);
    expect(fake.calls.filter((call) => call.name === 'HeadObjectCommand')).toHaveLength(2);
  });

  it('Abort 回执后 ListParts 仍返回时保持 blocked，不重发 Abort', async () => {
    const fake = createFakeProvider(403, { abortRemains: true });
    const probe = createProbe(fake);
    await probe.dispatch(capabilityRequest(probe));
    const response = await probe.dispatch(resultRequest(probe, passedParts));
    expect(response.statusCode).toBe(503);
    expect(probe.summary()).toMatchObject({ status: 'blocked', sdk: { delete: true, abort: false }, cleanup: { abortCount: 0, residual: 1 } });
    expect(fake.calls.filter((call) => call.name === 'AbortMultipartUploadCommand')).toHaveLength(1);
    expect(fake.calls.filter((call) => call.name === 'ListPartsCommand')).toHaveLength(2);
  });

  it('浏览器失败、TTL 和 stop/signal 路径只清理已知 multipart', async () => {
    const failedFake = createFakeProvider();
    const failedSummaries: unknown[] = [];
    const failedProbe = createProbe(failedFake, { onTerminalSummary: (summary) => { failedSummaries.push(summary); } });
    await failedProbe.dispatch(capabilityRequest(failedProbe));
    const failed = await failedProbe.dispatch(resultRequest(failedProbe, { status: 'failed' }));
    expect(parse<{ status: string; cleanup: { abortCount: number; residual: number } }>(failed)).toMatchObject({ status: 'blocked', cleanup: { abortCount: 1, residual: 0 } });
    expect(failedSummaries).toHaveLength(1);
    expect(failedSummaries[0]).toEqual(parse(failed));
    expect(failedFake.calls.filter((call) => call.name === 'CompleteMultipartUploadCommand')).toHaveLength(0);

    let now = 10_000;
    const ttlFake = createFakeProvider();
    const ttlSummaries: unknown[] = [];
    const ttlProbe = createProbe(ttlFake, { ttlSeconds: 1, now: () => now, onTerminalSummary: (summary) => { ttlSummaries.push(summary); } });
    await ttlProbe.dispatch(capabilityRequest(ttlProbe));
    now += 1_001;
    expect((await ttlProbe.dispatch(capabilityRequest(ttlProbe))).statusCode).toBe(410);
    expect(ttlProbe.summary().cleanup.abortCount).toBe(1);
    await ttlProbe.expire();
    expect(ttlSummaries).toHaveLength(1);

    const signalFake = createFakeProvider();
    const signalSummaries: unknown[] = [];
    const signalProbe = createProbe(signalFake, { onTerminalSummary: (summary) => { signalSummaries.push(summary); } });
    await signalProbe.dispatch(capabilityRequest(signalProbe));
    await signalProbe.start();
    process.emit('SIGTERM');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(signalProbe.summary().cleanup.abortCount).toBe(1);
    expect(signalProbe.summary().cleanup.residual).toBe(0);
    await signalProbe.stop();
    expect(signalSummaries).toHaveLength(1);
  });

  it('pass、provider failure 与重复 result 的终态回调均 exactly-once，并复用同一摘要', async () => {
    const passFake = createFakeProvider();
    const passSummaries: unknown[] = [];
    const passProbe = createProbe(passFake, { onTerminalSummary: (summary) => { passSummaries.push(summary); } });
    await passProbe.dispatch(capabilityRequest(passProbe));
    const passResponse = await passProbe.dispatch(resultRequest(passProbe, passedParts));
    const repeatedPass = await passProbe.dispatch(resultRequest(passProbe, { status: 'failed' }));
    expect(passResponse.statusCode).toBe(200);
    expect(passSummaries).toHaveLength(1);
    expect(passSummaries[0]).toEqual(parse(passResponse));
    expect(repeatedPass.body).toBe(passResponse.body);

    const providerFake = createFakeProvider();
    const providerSummaries: unknown[] = [];
    const providerProbe = createProbe(providerFake, {
      presignPart: async () => { throw new Error('provider failure'); },
      onTerminalSummary: (summary) => { providerSummaries.push(summary); },
    });
    const providerCapability = await providerProbe.dispatch(capabilityRequest(providerProbe));
    expect(providerCapability.statusCode).toBe(503);
    expect(providerSummaries).toHaveLength(1);
    expect(providerSummaries[0]).toEqual(providerProbe.summary());
    await providerProbe.expire();
    expect(providerSummaries).toHaveLength(1);
  });

  it('错误响应和 stdout 摘要不泄露 Secret、X-Amz、完整 URL 或对象键', async () => {
    const fake = createFakeProvider();
    const probe = createProbe(fake);
    const error = await probe.dispatch({ method: 'POST', url: `${probe.basePath}/result`, headers: { 'x-ros-probe-token': 'wrong' }, body: '{}' });
    expect(error.statusCode).toBe(401);
    expect(error.body).not.toContain(secret);
    expect(error.body).not.toContain('X-Amz');
    const summary = JSON.stringify(probe.summary());
    expect(summary).not.toContain(secret);
    expect(summary).not.toContain('X-Amz');
    expect(summary).not.toContain('ros-probe/');
    expect(summary).not.toContain('https://');
  });
});
