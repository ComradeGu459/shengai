import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, readFileSync, statSync } from 'node:fs';

const envPath = '/etc/qimao-terms-cloud/object-storage.env';
const storageModule = await import(new URL('../../../backend/dist/modules/storage/s3-compatible-storage.js', import.meta.url));
const { createProductionS3ConfigFromEnv, ProductionS3CompatibleUploadStorage } = storageModule;

const requiredKeys = [
  'QIMAO_UPLOAD_STORAGE_KIND',
  'QIMAO_S3_ENDPOINT',
  'QIMAO_S3_BUCKET',
  'QIMAO_S3_REGION',
  'QIMAO_S3_ACCESS_KEY_ID',
  'QIMAO_S3_SECRET_ACCESS_KEY',
  'QIMAO_S3_PRESIGN_TTL_SECONDS',
  'QIMAO_S3_UPLOAD_MODE',
];

const fail = (phase, error) => {
  const name = typeof error?.name === 'string' ? error.name.replace(/[^A-Za-z0-9_.-]/g, '_') : 'UnknownError';
  process.stderr.write(`ros_server_relay_probe_failed phase=${phase} error=${name}\n`);
  process.exitCode = 1;
};

const readProtectedEnv = () => {
  const link = lstatSync(envPath);
  if (link.isSymbolicLink()) throw new Error('EnvPathSymlink');
  const file = statSync(envPath);
  if (file.uid !== 0 || (file.mode & 0o777) !== 0o640) throw new Error('EnvPermission');
  const env = Object.create(null);
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index <= 0) throw new Error('EnvSyntax');
    env[line.slice(0, index)] = line.slice(index + 1);
  }
  for (const key of requiredKeys) {
    if (!env[key]) throw new Error('EnvMissing');
  }
  if (env.QIMAO_UPLOAD_STORAGE_KIND !== 's3' || env.QIMAO_S3_UPLOAD_MODE !== 'server_relay') {
    throw new Error('EnvModeMismatch');
  }
  return env;
};

let phase = 'env_preflight';
let storageUploadId;
let objectKey;
let completed = false;

try {
  const env = readProtectedEnv();
  const config = createProductionS3ConfigFromEnv(env);
  if (config.uploadMode !== 'server_relay') throw new Error('ConfigModeMismatch');
  const storage = new ProductionS3CompatibleUploadStorage(config);
  const bytes = Buffer.from('qimao-ros-server-relay-probe-v1', 'utf8');
  const expectedChecksum = createHash('sha256').update(bytes).digest('hex');
  objectKey = `qimao-server-relay-probe/${randomUUID()}`;
  const projectId = randomUUID();
  const uploadSessionId = randomUUID();

  phase = 'create_multipart';
  storageUploadId = await storage.createMultipart(objectKey, { contentType: 'application/octet-stream' });

  phase = 'authorize_server_relay';
  const authorization = await storage.authorizePart({
    storageUploadId,
    objectKey,
    partNumber: 1,
    projectId,
    uploadSessionId,
    sizeBytes: bytes.byteLength,
    contentType: 'application/octet-stream',
    expiresAt: new Date(Date.now() + 60_000),
  });
  if (!authorization.authorizationToken || authorization.uploadRequest?.method !== 'PUT'
    || !authorization.uploadRequest.url.startsWith('/api/local/uploads/')) {
    throw new Error('RelayCapabilityMismatch');
  }

  phase = 'upload_authorized_part';
  const receipt = await storage.uploadAuthorizedPart(authorization.authorizationToken, bytes, {
    storageUploadId,
    objectKey,
    partNumber: 1,
    sizeBytes: bytes.byteLength,
    contentType: 'application/octet-stream',
  });
  if (receipt.sizeBytes !== bytes.byteLength || receipt.checksumValue !== expectedChecksum || !receipt.etag) {
    throw new Error('UploadReceiptMismatch');
  }

  phase = 'list_parts';
  const listed = await storage.getUploadedPart({
    storageUploadId,
    objectKey,
    partNumber: 1,
    etag: receipt.etag,
    checksumValue: receipt.checksumValue,
  });
  if (!listed || listed.sizeBytes !== bytes.byteLength || listed.checksumValue !== expectedChecksum) {
    throw new Error('ListPartsMismatch');
  }

  phase = 'complete_multipart';
  await storage.completeMultipart({ storageUploadId, objectKey, parts: [receipt] });
  completed = true;

  phase = 'head_object';
  const head = await storage.headObject(objectKey);
  if (!head || head.sizeBytes !== bytes.byteLength || head.checksumValue !== expectedChecksum) {
    throw new Error('HeadMismatch');
  }

  phase = 'read_object';
  const read = await storage.readObject(objectKey);
  if (!read || createHash('sha256').update(read).digest('hex') !== expectedChecksum) {
    throw new Error('ReadDigestMismatch');
  }

  phase = 'delete_object';
  if (await storage.deleteObject(objectKey) !== 'deleted') throw new Error('DeleteMissing');
  completed = false;
  storageUploadId = undefined;

  phase = 'verify_delete';
  if (await storage.headObject(objectKey)) throw new Error('DeleteNotObserved');
  process.stdout.write('ros_server_relay_probe_ok mode=server_relay multipart=create_authorize_upload_list_complete_head_get_delete digest=matched cleanup=verified\n');
} catch (error) {
  try {
    const env = readProtectedEnv();
    const storage = new ProductionS3CompatibleUploadStorage(createProductionS3ConfigFromEnv(env));
    if (completed && objectKey) await storage.deleteObject(objectKey);
    else if (storageUploadId && objectKey) await storage.abortMultipart(storageUploadId, objectKey);
  } catch {
    process.stderr.write('ros_server_relay_probe_cleanup=failed\n');
  }
  fail(phase, error);
}
