import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { lstatSync, readFileSync, statSync } from 'node:fs';
const require = createRequire(new URL('../../../backend/package.json', import.meta.url));
const {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetBucketCorsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  PutBucketCorsCommand,
  S3Client,
  UploadPartCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const envPath = '/etc/qimao-terms-cloud/object-storage.env';
const requiredKeys = [
  'QIMAO_UPLOAD_STORAGE_KIND',
  'QIMAO_S3_ENDPOINT',
  'QIMAO_S3_BUCKET',
  'QIMAO_S3_REGION',
  'QIMAO_S3_ACCESS_KEY_ID',
  'QIMAO_S3_SECRET_ACCESS_KEY',
  'QIMAO_S3_PRESIGN_TTL_SECONDS',
];
const expectedCorsRule = {
  AllowedOrigins: ['https://milaidi.online'],
  AllowedMethods: ['PUT', 'GET', 'HEAD'],
  AllowedHeaders: ['content-type', 'x-amz-*'],
  ExposeHeaders: ['ETag', 'x-amz-checksum-sha256'],
  MaxAgeSeconds: 900,
};

const fail = (phase, error) => {
  const name = typeof error?.name === 'string' ? error.name.replace(/[^A-Za-z0-9_.-]/g, '_') : 'UnknownError';
  const status = Number.isInteger(error?.$metadata?.httpStatusCode) ? error.$metadata.httpStatusCode : 'none';
  process.stderr.write(`ros_probe_failed phase=${phase} error=${name} status=${status}\n`);
  process.exitCode = 1;
};

const requireConfig = () => {
  const link = lstatSync(envPath);
  if (link.isSymbolicLink()) throw new Error('EnvPathSymlink');
  const file = statSync(envPath);
  if (file.uid !== 0 || (file.mode & 0o777) !== 0o640) throw new Error('EnvPermission');

  const values = Object.create(null);
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index <= 0) throw new Error('EnvSyntax');
    values[line.slice(0, index)] = line.slice(index + 1);
  }
  for (const key of requiredKeys) {
    if (!values[key]) throw new Error('EnvMissing');
  }
  if (values.QIMAO_UPLOAD_STORAGE_KIND !== 's3'
    || values.QIMAO_S3_ENDPOINT !== 'https://cn-nb1.rains3.com'
    || values.QIMAO_S3_BUCKET !== 'milaidi'
    || values.QIMAO_S3_REGION !== 'cn-nb1'
    || values.QIMAO_S3_PRESIGN_TTL_SECONDS !== '900') {
    throw new Error('EnvContractMismatch');
  }
  return values;
};

const sameList = (actual, expected) => actual.length === expected.length
  && actual.every((value, index) => value === expected[index]);

const corsMatches = (rules) => rules?.length === 1
  && sameList(rules[0].AllowedOrigins ?? [], expectedCorsRule.AllowedOrigins)
  && sameList(rules[0].AllowedMethods ?? [], expectedCorsRule.AllowedMethods)
  && sameList(rules[0].AllowedHeaders ?? [], expectedCorsRule.AllowedHeaders)
  && sameList(rules[0].ExposeHeaders ?? [], expectedCorsRule.ExposeHeaders)
  && rules[0].MaxAgeSeconds === expectedCorsRule.MaxAgeSeconds;

const config = (() => {
  try {
    return requireConfig();
  } catch (error) {
    fail('env_preflight', error);
    return null;
  }
})();

if (config) {
  const client = new S3Client({
    endpoint: config.QIMAO_S3_ENDPOINT,
    region: config.QIMAO_S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.QIMAO_S3_ACCESS_KEY_ID,
      secretAccessKey: config.QIMAO_S3_SECRET_ACCESS_KEY,
    },
  });
  const bucket = config.QIMAO_S3_BUCKET;
  const objectKey = `qimao-server-probe/${randomUUID()}`;
  const body = Buffer.from('qimao-ros-probe-v1', 'utf8');
  const expectedDigest = createHash('sha256').update(body).digest('hex');
  let phase = 'put_cors';
  let uploadId;
  let completed = false;

  try {
    await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: [expectedCorsRule] } }));
    phase = 'get_cors';
    const cors = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    if (!corsMatches(cors.CORSRules)) throw new Error('CorsReadbackMismatch');

    phase = 'create_multipart';
    const created = await client.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: objectKey, ContentType: 'application/octet-stream' }));
    if (!created.UploadId) throw new Error('MissingUploadId');
    uploadId = created.UploadId;

    phase = 'presign_part';
    const uploadCommand = new UploadPartCommand({ Bucket: bucket, Key: objectKey, UploadId: uploadId, PartNumber: 1, ContentLength: body.length });
    const presignedUrl = await getSignedUrl(client, uploadCommand, { expiresIn: 60 });

    phase = 'put_part';
    const putResponse = await fetch(presignedUrl, { method: 'PUT', body, redirect: 'error' });
    if (!putResponse.ok) throw Object.assign(new Error('PresignedPutRejected'), { name: `Http${putResponse.status}` });
    const uploadedEtag = putResponse.headers.get('etag');
    if (!uploadedEtag) throw new Error('MissingUploadEtag');

    phase = 'list_parts';
    const listed = await client.send(new ListPartsCommand({ Bucket: bucket, Key: objectKey, UploadId: uploadId }));
    const listedPart = listed.Parts?.find((part) => part.PartNumber === 1);
    if (!listedPart?.ETag || listedPart.ETag !== uploadedEtag || listedPart.Size !== body.length) {
      throw new Error('ListPartsMismatch');
    }

    phase = 'complete_multipart';
    const completedUpload = await client.send(new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: objectKey,
      UploadId: uploadId,
      MultipartUpload: { Parts: [{ PartNumber: 1, ETag: uploadedEtag }] },
    }));
    completed = true;
    if (!completedUpload.ETag) throw new Error('MissingCompleteEtag');

    phase = 'head_object';
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
    if (head.ContentLength !== body.length || !head.ETag) throw new Error('HeadMismatch');

    phase = 'get_object';
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
    const returnedBody = Buffer.from(await object.Body.transformToByteArray());
    if (createHash('sha256').update(returnedBody).digest('hex') !== expectedDigest) throw new Error('BodyDigestMismatch');

    phase = 'delete_object';
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    completed = false;
    uploadId = undefined;

    phase = 'verify_delete';
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
      throw new Error('DeleteNotObserved');
    } catch (error) {
      if (error?.name === 'DeleteNotObserved') throw error;
      if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== 'NotFound' && error?.name !== 'NoSuchKey') throw error;
    }

    process.stdout.write('ros_probe_ok cors=exact multipart=create_presign_put_list_complete_head_get_delete body_digest=matched etag=observed cleanup=verified\n');
  } catch (error) {
    try {
      if (completed) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
      } else if (uploadId) {
        await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: objectKey, UploadId: uploadId }));
      }
    } catch {
      process.stderr.write('ros_probe_cleanup=failed\n');
    }
    fail(phase, error);
  }
}
