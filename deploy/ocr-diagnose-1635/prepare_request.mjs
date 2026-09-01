import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const projectId = 'af8425c4-65cf-427a-94f2-e3e53ec83baa';
const batchId = 'c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25';
const episodeNumber = 7;
const expectedAttemptId = '871fa4bb-cb8f-4146-abfa-54c13e882ae6';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`MISSING_${name}`);
  return value;
};

const contentTypeFor = (name) => {
  const normalized = name.toLowerCase();
  if (normalized.endsWith('.webm')) return 'video/webm';
  if (normalized.endsWith('.mov')) return 'video/quicktime';
  return 'video/mp4';
};

const releaseRoot = required('RELEASE_ROOT');
const requestPath = required('REQUEST_PATH');
let stage = 'imports';

try {
  const [{ createPool }, { createProductionS3ConfigFromEnv, ProductionS3CompatibleUploadStorage }, mediaModule] = await Promise.all([
    import(pathToFileURL(`${releaseRoot}/backend/dist/database/pool.js`).href),
    import(pathToFileURL(`${releaseRoot}/backend/dist/modules/storage/s3-compatible-storage.js`).href),
    import(pathToFileURL(`${releaseRoot}/backend/dist/modules/screen-text/screen-text-media.js`).href),
  ]);
  stage = 'database_create';
  const pool = createPool();
  try {
    stage = 'identity_query';
    const result = await pool.query(`
      SELECT j.id::text AS job_id,j.status,a.id::text AS attempt_id,
        a.status AS attempt_status,a.error_code,a.effect_class,a.receipt,
        a.external_side_effect_possible,ba.asset_id::text,ba.object_key,
        ba.original_filename,ba.size_bytes::text,ba.checksum_algorithm,
        ba.checksum_value
      FROM screen_text_jobs j
      JOIN screen_text_attempts a ON a.id=j.current_attempt_id
      JOIN screen_text_batch_assets ba
        ON ba.batch_id=j.batch_id AND ba.episode_number=j.episode_number
      WHERE j.batch_id=$1 AND j.project_id=$2 AND j.episode_number=$3
    `, [batchId, projectId, episodeNumber]);
    const row = result.rows[0];
    if (result.rowCount !== 1 || row?.status !== 'reconciliation_required'
      || row?.attempt_id !== expectedAttemptId
      || row?.attempt_status !== 'reconciliation_required'
      || row?.error_code !== 'LOCAL_OCR_UNKNOWN'
      || row?.effect_class !== 'external_unknown' || row?.receipt !== 'unknown'
      || row?.external_side_effect_possible !== true
      || row?.checksum_algorithm !== 'sha256') {
      throw new Error('EPISODE_7_IDENTITY_CHANGED');
    }
    stage = 'storage_config';
    const storage = new ProductionS3CompatibleUploadStorage(createProductionS3ConfigFromEnv());
    stage = 'extractor_config';
    const extractor = mediaModule.createConfiguredScreenTextFrameExtractorFromEnv();
    const source = mediaModule.createScreenTextRemoteMediaSource({
      signer: storage,
      extractor,
      expiresInSeconds: 600,
    });
    const controller = new AbortController();
    stage = 'media_read';
    const media = await source.read({
      assetId: row.asset_id,
      objectKey: row.object_key,
      contentType: contentTypeFor(row.original_filename),
      sizeBytes: Number(row.size_bytes),
      checksumValue: row.checksum_value,
      signal: controller.signal,
    });
    const attemptId = randomUUID();
    const request = {
      protocolVersion: 'screen_text_local_ocr_v1',
      attemptId,
      requestId: `offline-diagnostic:${attemptId}`,
      modelVersion: `PP-OCRv6-Small@sha256:${required('QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST').toLowerCase()}`,
      language: 'zh-CN',
      media: {
        inputKind: 'server_extracted_frames',
        contentType: media.contentType,
        sizeBytes: media.sizeBytes,
        checksumAlgorithm: 'sha256',
        checksumValue: media.checksumValue,
        videoDurationMs: media.videoDurationMs,
        maxFrameCount: media.maxFrameCount,
        maxPixels: media.maxPixels,
      },
      frames: media.frames.map((frame) => ({
        frameIndex: frame.frameIndex,
        capturedAtMs: frame.capturedAtMs,
        width: frame.width,
        height: frame.height,
        contentType: frame.contentType,
        bytesBase64: Buffer.from(frame.bytes).toString('base64'),
      })),
    };
    stage = 'request_write';
    await writeFile(requestPath, JSON.stringify(request), { mode: 0o600, flag: 'wx' });
    console.log(`prepare=passed episode:7 frames:${media.frameCount} duration_ms:${media.videoDurationMs} request_identity:ephemeral`);
  } finally {
    await pool.end();
  }
} catch (error) {
  const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
    ? error.message
    : 'PREPARE_UNKNOWN';
  const type = error && typeof error === 'object' && error.constructor
    ? String(error.constructor.name).replace(/[^A-Za-z0-9_]/g, '').slice(0, 60)
    : 'Unknown';
  const providerCode = error && typeof error === 'object' && 'code' in error
    && typeof error.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)
    ? error.code
    : 'none';
  const syscall = error && typeof error === 'object' && 'syscall' in error
    && typeof error.syscall === 'string'
    ? error.syscall.replace(/[^A-Za-z0-9_]/g, '').slice(0, 60)
    : 'none';
  console.log(`prepare=failed stage:${stage} type:${type || 'Unknown'} code:${code} provider_code:${providerCode} syscall:${syscall || 'none'}`);
  process.exitCode = 1;
}
