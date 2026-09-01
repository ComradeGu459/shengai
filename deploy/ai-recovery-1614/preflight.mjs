#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`PREFLIGHT_ENV_MISSING_${name}`);
  return value;
};

const stage = required('STAGE_ROOT');
const batchId = required('BATCH_ID');
const retryKey = required('RETRY_KEY');
const preflightDir = required('PREFLIGHT_DIR');
const statePath = required('STATE_PATH');

const { createPool } = await import(
  pathToFileURL(join(stage, 'backend/dist/database/pool.js')).href
);
const { stableHash } = await import(
  pathToFileURL(join(stage, 'backend/dist/modules/screen-text/screen-text.domain.js')).href
);
const {
  createProductionS3ConfigFromEnv,
  ProductionS3CompatibleUploadStorage,
} = await import(
  pathToFileURL(join(stage, 'backend/dist/modules/storage/s3-compatible-storage.js')).href
);

const pool = createPool();
try {
  const baseline = await pool.query(`
    SELECT count(*) FILTER (WHERE status='failed')::int AS failed,
      count(*) FILTER (WHERE status='queued')::int AS queued,
      count(*) FILTER (WHERE status NOT IN ('failed','queued'))::int AS other
    FROM screen_text_jobs WHERE batch_id=$1
  `, [batchId]);
  const b = baseline.rows[0];
  if (!b || b.failed !== 39 || b.queued !== 12 || b.other !== 0) {
    throw new Error('BATCH_BASELINE_CHANGED');
  }

  const frozenResult = await pool.query(`
    SELECT batch.project_id,j.id AS job_id,a.id AS attempt_id,j.episode_number,
      asset.asset_id,asset.object_key,asset.original_filename,
      asset.size_bytes::text,asset.checksum_value
    FROM screen_text_batches batch
    JOIN screen_text_jobs j ON j.batch_id=batch.id
    JOIN screen_text_attempts a ON a.id=j.current_attempt_id
    JOIN screen_text_batch_assets asset
      ON asset.batch_id=batch.id AND asset.episode_number=j.episode_number
    WHERE batch.id=$1 AND j.status='failed' AND a.status='failed'
      AND a.error_code='SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE'
      AND a.external_side_effect_possible=false
    ORDER BY j.episode_number
  `, [batchId]);
  if (frozenResult.rowCount !== 39) throw new Error('FROZEN_IDENTITY_COUNT_CHANGED');

  const projectIds = new Set(frozenResult.rows.map((row) => row.project_id));
  const jobIds = new Set(frozenResult.rows.map((row) => row.job_id));
  const attemptIds = new Set(frozenResult.rows.map((row) => row.attempt_id));
  const episodeNumbers = frozenResult.rows.map((row) => Number(row.episode_number));
  if (projectIds.size !== 1 || jobIds.size !== 39 || attemptIds.size !== 39
    || new Set(episodeNumbers).size !== 39
    || episodeNumbers.some((episode, index) => !Number.isInteger(episode)
      || episode < 1 || episode > 100 || (index > 0 && episodeNumbers[index - 1] >= episode))) {
    throw new Error('FROZEN_IDENTITY_INVALID');
  }

  const projectId = frozenResult.rows[0].project_id;
  const command = await pool.query(`
    SELECT count(*)::int AS count FROM screen_text_commands
    WHERE project_id=$1 AND command_kind='retry_batch'
      AND idempotency_key=$2
  `, [projectId, retryKey]);
  if (command.rows[0]?.count !== 0) throw new Error('RETRY_IDENTITY_ALREADY_USED');

  const oldMedia = await pool.query(`
    SELECT count(*)::int AS count FROM screen_text_attempts a
    JOIN screen_text_jobs j ON j.id=a.job_id
    WHERE j.batch_id=$1
      AND a.error_code='SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE'
      AND a.status='failed'
      AND a.external_side_effect_possible=false
  `, [batchId]);
  if (oldMedia.rows[0]?.count !== 39) throw new Error('OLD_MEDIA_IDENTITY_CHANGED');

  const row = frozenResult.rows[0];
  const storage = new ProductionS3CompatibleUploadStorage(createProductionS3ConfigFromEnv());
  const sourceUrl = await storage.createGetUrl({
    assetId: row.asset_id,
    objectKey: row.object_key,
    expiresInSeconds: 600,
  });
  const name = String(row.original_filename ?? '').toLowerCase();
  const contentType = name.endsWith('.webm')
    ? 'video/webm'
    : name.endsWith('.mov')
      ? 'video/quicktime'
      : 'video/mp4';
  const extractor = join(stage, 'backend/dist/sidecars/local-ocr/frame-extractor.js');
  const args = [
    extractor,
    '--input-url', sourceUrl,
    '--output-dir', preflightDir,
    '--manifest', join(preflightDir, 'qimao-frames.json'),
    '--content-type', contentType,
    '--expected-size', String(row.size_bytes),
    '--expected-sha256', String(row.checksum_value),
    '--max-frames', '600',
    '--max-pixels', '120000000',
    '--max-duration-ms', '86400000',
  ];

  await new Promise((resolve, reject) => {
    const child = spawn('/usr/local/bin/node', args, {
      cwd: preflightDir,
      env: process.env,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderrBytes = 0;
    child.stderr?.on('data', (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes > 4096) child.kill('SIGKILL');
    });
    child.once('error', () => reject(new Error('EXTRACTOR_SPAWN_FAILED')));
    child.once('close', (code, signal) => {
      if (code === 0 && !signal) resolve();
      else reject(new Error('EXTRACTOR_FAILED'));
    });
  });

  const frameManifest = JSON.parse(
    await readFile(join(preflightDir, 'qimao-frames.json'), 'utf8'),
  );
  if (!Array.isArray(frameManifest.frames) || frameManifest.frames.length !== 123) {
    throw new Error('FRAME_COUNT_INVALID');
  }
  let totalFrameBytes = 0;
  for (const frame of frameManifest.frames) {
    const info = await stat(join(preflightDir, frame.fileName));
    if (!info.isFile() || info.size < 1 || info.size > 7_500_000) {
      throw new Error('FRAME_FILE_INVALID');
    }
    totalFrameBytes += info.size;
  }
  if (totalFrameBytes < 1 || totalFrameBytes > 32_000_000) {
    throw new Error('FRAME_BYTES_INVALID');
  }

  const requestHash = stableHash({ batchId, episodeNumbers });
  await writeFile(statePath, JSON.stringify({
    version: 1,
    projectId,
    batchId,
    retryKey,
    requestHash,
    frozen: frozenResult.rows.map((item) => ({
      jobId: item.job_id,
      attemptId: item.attempt_id,
      episodeNumber: Number(item.episode_number),
    })),
    frameCount: frameManifest.frames.length,
    totalFrameBytes,
  }), { mode: 0o600, flag: 'wx' });
  console.log('batch_baseline=failed:39 queued:12 frozen:39 retry_command:0');
  console.log(`candidate_preflight=passed frames=${frameManifest.frames.length} total_bytes=${totalFrameBytes}`);
} finally {
  await pool.end();
}
