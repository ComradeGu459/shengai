import { createHash } from 'node:crypto';
import { readdir, readFile, rm, stat, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createTusFastifyApp,
  type TusFastifyApp,
  type TusUploadSessionAuthority,
  type TusUploadSessionIdentity,
} from '../../backend/src/modules/uploads/tus/tus-fastify.js';

const roots: string[] = [];
const totalBytes = 48 * 1024 * 1024;
const chunkBytes = 16 * 1024 * 1024;
const tusHeaders = { 'Tus-Resumable': '1.0.0' };
const metadataHeader = 'filename dHVzLXNwaWtlLmJpbg==';

class CommittedUploadAuthority implements TusUploadSessionAuthority {
  private readonly byToken = new Map<string, TusUploadSessionIdentity>();
  private readonly byStorageId = new Map<string, TusUploadSessionIdentity>();
  private readonly byCommand = new Map<string, TusUploadSessionIdentity>();

  commit(commandId: string, accessToken: string, session: TusUploadSessionIdentity) {
    this.byCommand.set(commandId, session);
    this.byToken.set(accessToken, session);
    this.byStorageId.set(session.storageUploadId, session);
  }

  getCreateCommand(commandId: string) {
    return this.byCommand.get(commandId) ?? null;
  }

  async resolveCreate(input: { accessToken: string | null }) {
    return input.accessToken ? this.byToken.get(input.accessToken) ?? null : null;
  }

  async findByStorageUploadId(storageUploadId: string) {
    return this.byStorageId.get(storageUploadId) ?? null;
  }

  async authorize(input: { accessToken: string | null; session: TusUploadSessionIdentity }) {
    return Boolean(input.accessToken && this.byToken.get(input.accessToken) === input.session);
  }
}

const createRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'qimao-upload-tus-spike-'));
  roots.push(root);
  return root;
};

const makeBytes = () => {
  const bytes = Buffer.allocUnsafe(totalBytes);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = index % 251;
  return bytes;
};

const start = async (directory: string, authority: TusUploadSessionAuthority) => {
  const instance = createTusFastifyApp({ directory, maxSizeBytes: totalBytes, authority });
  await instance.app.listen({ host: '127.0.0.1', port: 0 });
  return instance;
};

const session = (storageUploadId: string): TusUploadSessionIdentity => ({
  projectId: 'project-spike-01',
  uploadSessionId: `session-${storageUploadId}`,
  storageUploadId,
  uploadLength: totalBytes,
  metadata: { filename: 'tus-spike.bin' },
});

const urlFor = (base: string, storageUploadId: string) => `${base}/tus/${storageUploadId}`;
const resourceCount = async (root: string) => (await readdir(root)).filter((entry) => !entry.endsWith('.json')).length;

const patch = async (base: string, path: string, offset: number, bytes: Uint8Array, token: string) => {
  const response = await fetch(`${base}${path}`, {
    method: 'PATCH',
    headers: {
      ...tusHeaders,
      'X-Upload-Session-Token': token,
      'Content-Type': 'application/offset+octet-stream',
      'Upload-Offset': String(offset),
      'Content-Length': String(bytes.byteLength),
    },
    body: bytes,
  });
  expect(response.status).toBe(204);
  expect(response.headers.get('upload-offset')).toBe(String(offset + bytes.byteLength));
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('真实 tus + Fastify 传输内核 spike', () => {
  it('create → HEAD → PATCH → 停止/重建 → HEAD 恢复 → PATCH 完成', async () => {
    const root = await createRoot();
    const bytes = makeBytes();
    const authority = new CommittedUploadAuthority();
    const storageUploadId = 'storage-m1a-resume';
    authority.commit('command-m1a', 'token-m1a', session(storageUploadId));
    let first: TusFastifyApp | undefined;
    let second: TusFastifyApp | undefined;
    try {
      first = await start(root, authority);
      const firstBase = first.app.server.address();
      if (!firstBase || typeof firstBase === 'string') throw new Error('Fastify 未分配 TCP 端口。');
      const base = `http://127.0.0.1:${firstBase.port}`;

      const created = await fetch(`${base}/tus`, {
        method: 'POST',
        headers: { ...tusHeaders, 'Upload-Length': String(totalBytes), 'Upload-Metadata': metadataHeader,
          'X-Upload-Session-Token': 'token-m1a', 'X-Upload-Storage-Id': 'browser-cannot-choose-this' },
      });
      expect(created.status).toBe(201);
      const location = created.headers.get('location');
      expect(location).toBeTruthy();
      const resourcePath = new URL(location!, base).pathname;
      expect(resourcePath).toBe(`/tus/${storageUploadId}`);

      const initial = await fetch(`${base}${resourcePath}`, { method: 'HEAD', headers: { ...tusHeaders, 'X-Upload-Session-Token': 'token-m1a' } });
      expect(initial.status).toBe(200);
      expect(initial.headers.get('upload-offset')).toBe('0');
      expect(initial.headers.get('upload-length')).toBe(String(totalBytes));

      await patch(base, resourcePath, 0, bytes.subarray(0, chunkBytes), 'token-m1a');
      await first.app.close();
      first = undefined;

      second = await start(root, authority);
      const secondAddress = second.app.server.address();
      if (!secondAddress || typeof secondAddress === 'string') throw new Error('重建 Fastify 未分配 TCP 端口。');
      const resumedBase = `http://127.0.0.1:${secondAddress.port}`;
      const resumed = await fetch(`${resumedBase}${resourcePath}`, { method: 'HEAD', headers: { ...tusHeaders, 'X-Upload-Session-Token': 'token-m1a' } });
      expect(resumed.status).toBe(200);
      expect(resumed.headers.get('upload-offset')).toBe(String(chunkBytes));

      await patch(resumedBase, resourcePath, chunkBytes, bytes.subarray(chunkBytes, chunkBytes * 2), 'token-m1a');
      await patch(resumedBase, resourcePath, chunkBytes * 2, bytes.subarray(chunkBytes * 2), 'token-m1a');
      const completed = await fetch(`${resumedBase}${resourcePath}`, { method: 'HEAD', headers: { ...tusHeaders, 'X-Upload-Session-Token': 'token-m1a' } });
      expect(completed.status).toBe(200);
      expect(completed.headers.get('upload-offset')).toBe(String(totalBytes));

      const uploadId = resourcePath.split('/').filter(Boolean).at(-1);
      expect(uploadId).toBeTruthy();
      const savedPath = join(root, uploadId!);
      const saved = await readFile(savedPath);
      expect((await stat(savedPath)).size).toBe(totalBytes);
      expect(saved.equals(bytes)).toBe(true);
      expect(createHash('sha256').update(saved).digest('hex')).toBe(createHash('sha256').update(bytes).digest('hex'));
      expect(await resourceCount(root)).toBe(1);
    } finally {
      if (first) await first.app.close();
      if (second) await second.app.close();
    }
  });

  it('create command 已提交且 POST 响应丢失时，GET 同命令恢复同一 tus 资源并继续 PATCH', async () => {
    const root = await createRoot();
    const bytes = makeBytes();
    const authority = new CommittedUploadAuthority();
    const storageUploadId = 'storage-m1b-lost-response';
    authority.commit('command-lost-response', 'token-lost-response', session(storageUploadId));
    let app: TusFastifyApp | undefined;
    try {
      app = await start(root, authority);
      const address = app.app.server.address();
      if (!address || typeof address === 'string') throw new Error('Fastify 未分配 TCP 端口。');
      const base = `http://127.0.0.1:${address.port}`;
      const first = await fetch(`${base}/tus`, {
        method: 'POST',
        headers: { ...tusHeaders, 'Upload-Length': String(totalBytes), 'Upload-Metadata': metadataHeader,
          'X-Upload-Session-Token': 'token-lost-response' },
      });
      expect(first.status).toBe(201);
      // 丢弃首次 201 的 Location；客户端改为 GET 同一业务 create command。
      const recovered = authority.getCreateCommand('command-lost-response');
      expect(recovered?.storageUploadId).toBe(storageUploadId);
      const resourceUrl = urlFor(base, recovered!.storageUploadId);
      const head = await fetch(resourceUrl, { method: 'HEAD', headers: { ...tusHeaders, 'X-Upload-Session-Token': 'token-lost-response' } });
      expect(head.status).toBe(200);
      expect(head.headers.get('upload-offset')).toBe('0');
      await patch(base, `/tus/${recovered!.storageUploadId}`, 0, bytes.subarray(0, chunkBytes), 'token-lost-response');
      await patch(base, `/tus/${recovered!.storageUploadId}`, chunkBytes, bytes.subarray(chunkBytes, chunkBytes * 2), 'token-lost-response');
      await patch(base, `/tus/${recovered!.storageUploadId}`, chunkBytes * 2, bytes.subarray(chunkBytes * 2), 'token-lost-response');
      expect((await fetch(resourceUrl, { method: 'HEAD', headers: { ...tusHeaders, 'X-Upload-Session-Token': 'token-lost-response' } })).headers.get('upload-offset')).toBe(String(totalBytes));
      expect(await resourceCount(root)).toBe(1);
    } finally {
      if (app) await app.app.close();
    }
  });

  it('命令存在但 tus 资源尚未创建时只创建一次；重复 POST 不覆盖 offset，错误 token 不能 HEAD/PATCH', async () => {
    const root = await createRoot();
    const bytes = makeBytes();
    const authority = new CommittedUploadAuthority();
    const storageUploadId = 'storage-m1b-create-once';
    authority.commit('command-create-once', 'token-create-once', session(storageUploadId));
    let app: TusFastifyApp | undefined;
    try {
      app = await start(root, authority);
      const address = app.app.server.address();
      if (!address || typeof address === 'string') throw new Error('Fastify 未分配 TCP 端口。');
      const base = `http://127.0.0.1:${address.port}`;
      const resourcePath = `/tus/${storageUploadId}`;
      const absent = await fetch(`${base}${resourcePath}`, { method: 'HEAD', headers: { ...tusHeaders, 'X-Upload-Session-Token': 'token-create-once' } });
      expect(absent.status).toBe(404);
      const created = await fetch(`${base}/tus`, {
        method: 'POST',
        headers: { ...tusHeaders, 'Upload-Length': String(totalBytes), 'Upload-Metadata': metadataHeader,
          'X-Upload-Session-Token': 'token-create-once' },
      });
      expect(created.status).toBe(201);
      await patch(base, resourcePath, 0, bytes.subarray(0, chunkBytes), 'token-create-once');
      const duplicate = await fetch(`${base}/tus`, {
        method: 'POST',
        headers: { ...tusHeaders, 'Upload-Length': String(totalBytes), 'Upload-Metadata': metadataHeader,
          'X-Upload-Session-Token': 'token-create-once' },
      });
      expect(duplicate.status).toBe(201);
      expect(duplicate.headers.get('location')).toBe(resourcePath);
      const preserved = await fetch(`${base}${resourcePath}`, { method: 'HEAD', headers: { ...tusHeaders, 'X-Upload-Session-Token': 'token-create-once' } });
      expect(preserved.headers.get('upload-offset')).toBe(String(chunkBytes));
      const guessedHead = await fetch(`${base}${resourcePath}`, { method: 'HEAD', headers: { ...tusHeaders, 'X-Upload-Session-Token': 'wrong-token' } });
      expect(guessedHead.status).toBe(404);
      const guessedPatch = await fetch(`${base}${resourcePath}`, {
        method: 'PATCH',
        headers: { ...tusHeaders, 'X-Upload-Session-Token': 'wrong-token', 'Upload-Offset': String(chunkBytes), 'Content-Type': 'application/offset+octet-stream', 'Content-Length': '1' },
        body: Buffer.from([1]),
      });
      expect(guessedPatch.status).toBe(404);
      expect(await resourceCount(root)).toBe(1);
    } finally {
      if (app) await app.app.close();
    }
  });
});
