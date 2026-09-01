#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`RECOVERY_ENV_MISSING_${name}`);
  return value;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const action = required('ACTION');

const createPoolFor = async (root) => {
  const { createPool } = await import(
    pathToFileURL(join(root, 'backend/dist/database/pool.js')).href
  );
  return createPool();
};

const loadPriorIdentity = async () => {
  const state = JSON.parse(await readFile(required('PRIOR_STATE_PATH'), 'utf8'));
  if (state.version !== 1 || !uuid.test(state.projectId) || !uuid.test(state.batchId)) {
    throw new Error('PRIOR_STATE_INVALID');
  }
  return { projectId: state.projectId, batchId: state.batchId };
};

const loadState = async () => {
  const state = JSON.parse(await readFile(required('STATE_PATH'), 'utf8'));
  if (state.version !== 2 || !uuid.test(state.projectId) || !uuid.test(state.batchId)
    || typeof state.retryKey !== 'string' || state.retryKey.length < 1
    || !/^[0-9a-f]{64}$/.test(state.requestHash)
    || !Array.isArray(state.frozen) || state.frozen.length !== 51
    || state.oldMediaBaseline !== 90) {
    throw new Error('RECOVERY_STATE_INVALID');
  }
  const jobs = new Set();
  const attempts = new Set();
  for (const [index, item] of state.frozen.entries()) {
    if (!uuid.test(item.jobId) || !uuid.test(item.attemptId)
      || item.episodeNumber !== index + 1
      || jobs.has(item.jobId) || attempts.has(item.attemptId)) {
      throw new Error('RECOVERY_FROZEN_IDENTITY_INVALID');
    }
    jobs.add(item.jobId);
    attempts.add(item.attemptId);
  }
  return state;
};

const commandRows = (pool, state) => pool.query(`
  SELECT request_hash,resource_id::text FROM screen_text_commands
  WHERE project_id=$1 AND command_kind='retry_batch' AND idempotency_key=$2
  ORDER BY created_at
`, [state.projectId, state.retryKey]);

const batchProjection = (pool, state) => pool.query(`
  SELECT count(*) FILTER (WHERE status='failed')::int AS failed,
    count(*) FILTER (WHERE status='queued')::int AS queued,
    count(*) FILTER (WHERE status NOT IN ('failed','queued'))::int AS other,
    count(*) FILTER (WHERE id = ANY($2::uuid[]) AND status='queued')::int AS frozen_queued
  FROM screen_text_jobs WHERE batch_id=$1
`, [state.batchId, state.frozen.map((item) => item.jobId)]);

const frozenIdentity = (pool, state) => pool.query(`
  WITH frozen AS (
    SELECT * FROM jsonb_to_recordset($2::jsonb)
      AS item("jobId" uuid,"attemptId" uuid,"episodeNumber" integer)
  )
  SELECT count(*)::int AS total,
    count(*) FILTER (WHERE j.id=frozen."jobId"
      AND j.batch_id=$1 AND j.episode_number=frozen."episodeNumber"
      AND j.current_attempt_id=frozen."attemptId" AND j.status='failed'
      AND a.id=frozen."attemptId" AND a.job_id=frozen."jobId"
      AND a.status='failed'
      AND a.error_code='SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE'
      AND a.external_side_effect_possible=false
      AND a.provider='openvino'
      AND a.adapter='screen_text_openvino_ppocrv6_small'
      AND a.status<>'reconciliation_required'
      AND a.effect_class IS DISTINCT FROM 'external_unknown'
      AND a.receipt IS DISTINCT FROM 'unknown')::int AS exact
  FROM frozen
  LEFT JOIN screen_text_jobs j ON j.id=frozen."jobId"
  LEFT JOIN screen_text_attempts a ON a.id=frozen."attemptId"
`, [state.batchId, JSON.stringify(state.frozen)]);

const oldMediaCount = async (pool, batchId) => {
  const result = await pool.query(`
    SELECT count(*)::int AS count FROM screen_text_attempts a
    JOIN screen_text_jobs j ON j.id=a.job_id
    WHERE j.batch_id=$1
      AND a.error_code='SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE'
  `, [batchId]);
  return result.rows[0]?.count;
};

const requireUncommittedIdentity = async (pool, state) => {
  const [commands, identity, projection, oldMedia] = await Promise.all([
    commandRows(pool, state), frozenIdentity(pool, state), batchProjection(pool, state),
    oldMediaCount(pool, state.batchId),
  ]);
  const exact = identity.rows[0];
  const jobs = projection.rows[0];
  if (commands.rowCount !== 0 || exact?.total !== 51 || exact?.exact !== 51
    || jobs?.failed !== 51 || jobs?.queued !== 0 || jobs?.other !== 0
    || oldMedia !== state.oldMediaBaseline) {
    throw new Error('PRE_SUBMIT_IDENTITY_CHANGED');
  }
};

const requireCommittedIdentity = async (pool, state) => {
  const [commands, projection] = await Promise.all([
    commandRows(pool, state), batchProjection(pool, state),
  ]);
  const command = commands.rows[0];
  const jobs = projection.rows[0];
  if (commands.rowCount !== 1 || command?.request_hash !== state.requestHash
    || command?.resource_id !== state.batchId || jobs?.failed !== 0
    || jobs?.queued !== 51 || jobs?.other !== 0 || jobs?.frozen_queued !== 51) {
    throw new Error('COMMITTED_IDENTITY_INVALID');
  }
};

const requireLocalRoutes = async (pool, state, status) => {
  const result = await pool.query(`
    WITH jobs AS (
      SELECT j.id,j.routing_version_id,
        CASE WHEN j.current_attempt_id IS NOT NULL THEN current.routing_target_priority
          ELSE COALESCE((SELECT max(a.routing_target_priority)
            FROM screen_text_attempts a WHERE a.job_id=j.id),0)+1 END AS expected_priority
      FROM screen_text_jobs j
      LEFT JOIN screen_text_attempts current ON current.id=j.current_attempt_id
      WHERE j.batch_id=$1 AND j.status=$2
    ), resolved AS (
      SELECT jobs.id,
        (SELECT count(*)::int FROM routing_policy_targets target
          WHERE target.routing_version_id=jobs.routing_version_id
            AND target.priority=jobs.expected_priority) AS target_count,
        (SELECT count(*)::int FROM routing_policy_targets target
          JOIN engine_deployment_versions version ON version.id=target.deployment_version_id
          JOIN engine_deployments engine ON engine.id=version.deployment_id
          WHERE target.routing_version_id=jobs.routing_version_id
            AND target.priority=jobs.expected_priority
            AND target.pool_id='ocr_self_hosted_worker'
            AND engine.execution_kind='self_hosted_worker'
            AND engine.provider='openvino'
            AND engine.adapter_key='screen_text_openvino_ppocrv6_small'
            AND version.capabilities_snapshot->>'adapterKind'='self_hosted_worker'
            AND version.capabilities_snapshot->>'deployment'='loopback_http') AS local_count,
        (SELECT count(*)::int FROM routing_policy_targets target
          JOIN engine_deployment_versions version ON version.id=target.deployment_version_id
          JOIN engine_deployments engine ON engine.id=version.deployment_id
          WHERE target.routing_version_id=jobs.routing_version_id
            AND target.priority=jobs.expected_priority
            AND (target.pool_id='ocr_api' OR engine.execution_kind='cloud_api'
              OR engine.provider ILIKE '%tencent%'
              OR engine.adapter_key ILIKE '%tencent%')) AS unsafe_count,
        (SELECT count(*)::int FROM routing_policy_targets later
          WHERE later.routing_version_id=jobs.routing_version_id
            AND later.priority>jobs.expected_priority) AS downstream_count
      FROM jobs
    )
    SELECT count(*)::int AS jobs,
      count(*) FILTER (WHERE target_count=1 AND local_count=1
        AND unsafe_count=0 AND downstream_count=0)::int AS safe
    FROM resolved
  `, [state.batchId, status]);
  const row = result.rows[0];
  if (row?.jobs !== 51 || row?.safe !== 51) throw new Error('LOCAL_ROUTE_PROOF_FAILED');
};

const freshProjection = (pool, state) => pool.query(`
  WITH command AS (
    SELECT created_at FROM screen_text_commands
    WHERE project_id=$2 AND command_kind='retry_batch'
      AND idempotency_key=$3 AND resource_id=$1 AND request_hash=$4
  ), frozen AS (
    SELECT * FROM jsonb_to_recordset($5::jsonb)
      AS item("jobId" uuid,"attemptId" uuid,"episodeNumber" integer)
  ), fresh AS (
    SELECT a.*,(frozen."jobId" IS NOT NULL) AS is_frozen
    FROM screen_text_attempts a
    JOIN screen_text_jobs j ON j.id=a.job_id
    LEFT JOIN frozen ON frozen."jobId"=j.id
    WHERE j.batch_id=$1 AND a.created_at >= (SELECT created_at FROM command)
      AND a.id NOT IN (SELECT "attemptId" FROM frozen)
  )
  SELECT count(*)::int AS fresh,
    count(*) FILTER (WHERE is_frozen)::int AS frozen_fresh,
    count(*) FILTER (WHERE is_frozen AND status='completed')::int AS frozen_completed,
    count(*) FILTER (WHERE provider IS DISTINCT FROM 'openvino'
      OR adapter IS DISTINCT FROM 'screen_text_openvino_ppocrv6_small')::int AS non_openvino,
    count(*) FILTER (WHERE provider ILIKE '%tencent%'
      OR adapter ILIKE '%tencent%')::int AS tencent,
    count(*) FILTER (WHERE status='reconciliation_required'
      OR effect_class='external_unknown' OR receipt='unknown'
      OR external_side_effect_possible=true)::int AS unknown,
    count(*) FILTER (WHERE status IN ('failed','cancelled'))::int AS failed,
    count(*) FILTER (WHERE error_code='SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE')::int AS new_old_media
  FROM fresh
`, [state.batchId, state.projectId, state.retryKey,
  state.requestHash, JSON.stringify(state.frozen)]);

const jobProjection = (pool, state) => pool.query(`
  SELECT count(*)::int AS total,
    count(*) FILTER (WHERE status IN ('not_started','queued'))::int AS queued,
    count(*) FILTER (WHERE status IN ('running','cancel_requested'))::int AS running,
    count(*) FILTER (WHERE status IN (
      'failed','cancelled','reconciliation_required','stale'
    ))::int AS failed,
    count(*) FILTER (WHERE status IN (
      'review_pending','completed','confirmed_empty'
    ))::int AS settled,
    count(*) FILTER (WHERE status NOT IN (
      'not_started','queued','running','cancel_requested','failed','cancelled',
      'reconciliation_required','stale','review_pending','completed','confirmed_empty'
    ))::int AS other
  FROM screen_text_jobs WHERE batch_id=$1
`, [state.batchId]);

const requireSafeFresh = (row) => {
  if (!row || row.fresh > 51 || row.frozen_fresh !== row.fresh
    || row.frozen_completed > 51 || row.non_openvino > 0 || row.tencent > 0
    || row.unknown > 0 || row.failed > 0 || row.new_old_media > 0) {
    throw new Error('WORKER_RESULT_ROUTE_OR_EFFECT_FAILED');
  }
};

const requireSafeJobs = (row) => {
  if (!row || row.total !== 51 || row.failed > 0 || row.other > 0
    || row.queued + row.running + row.settled !== 51) {
    throw new Error('WORKER_JOB_PROJECTION_FAILED');
  }
};

const isFullRecovery = (fresh, jobs) => fresh.fresh === 51
  && fresh.frozen_fresh === 51 && fresh.frozen_completed === 51
  && jobs.queued === 0 && jobs.running === 0 && jobs.failed === 0
  && jobs.settled === 51;

if (action === 'session') {
  const root = required('RELEASE_ROOT');
  const { createEmployeeAuthServiceFromEnv } = await import(
    pathToFileURL(join(root, 'backend/dist/modules/employee-auth/employee-auth.js')).href
  );
  const service = createEmployeeAuthServiceFromEnv();
  if (!service) throw new Error('EMPLOYEE_AUTH_UNAVAILABLE');
  process.stdout.write(service.issueSession().token);
} else if (action === 'prepare-state') {
  const root = required('RELEASE_ROOT');
  const extractor = required('EXTRACTOR_PATH');
  const retryKey = required('RETRY_KEY');
  const preflightDir = required('PREFLIGHT_DIR');
  const statePath = required('STATE_PATH');
  const { projectId, batchId } = await loadPriorIdentity();
  const { stableHash } = await import(
    pathToFileURL(join(root, 'backend/dist/modules/screen-text/screen-text.domain.js')).href
  );
  const {
    createProductionS3ConfigFromEnv,
    ProductionS3CompatibleUploadStorage,
  } = await import(
    pathToFileURL(join(root, 'backend/dist/modules/storage/s3-compatible-storage.js')).href
  );
  const pool = await createPoolFor(root);
  try {
    const frozenResult = await pool.query(`
      SELECT batch.project_id,j.id AS job_id,a.id AS attempt_id,j.episode_number,
        asset.asset_id,asset.object_key,asset.original_filename,
        asset.size_bytes::text,asset.checksum_value
      FROM screen_text_batches batch
      JOIN screen_text_jobs j ON j.batch_id=batch.id
      JOIN screen_text_attempts a ON a.id=j.current_attempt_id
      JOIN screen_text_batch_assets asset
        ON asset.batch_id=batch.id AND asset.episode_number=j.episode_number
      WHERE batch.id=$1 AND batch.project_id=$2
        AND j.status='failed' AND a.status='failed'
        AND a.error_code='SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE'
        AND a.external_side_effect_possible=false
        AND a.provider='openvino'
        AND a.adapter='screen_text_openvino_ppocrv6_small'
        AND a.status<>'reconciliation_required'
        AND a.effect_class IS DISTINCT FROM 'external_unknown'
        AND a.receipt IS DISTINCT FROM 'unknown'
      ORDER BY j.episode_number
    `, [batchId, projectId]);
    const episodeNumbers = frozenResult.rows.map((row) => Number(row.episode_number));
    if (frozenResult.rowCount !== 51
      || episodeNumbers.some((episode, index) => episode !== index + 1)) {
      throw new Error('FROZEN_51_IDENTITY_INVALID');
    }
    const command = await pool.query(`
      SELECT count(*)::int AS count FROM screen_text_commands
      WHERE project_id=$1 AND command_kind='retry_batch' AND idempotency_key=$2
    `, [projectId, retryKey]);
    if (command.rows[0]?.count !== 0) throw new Error('RETRY_IDENTITY_ALREADY_USED');
    if (await oldMediaCount(pool, batchId) !== 90) throw new Error('OLD_MEDIA_BASELINE_INVALID');

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
      : name.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
    const args = [
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
      const child = spawn(extractor, args, {
        cwd: preflightDir,
        env: process.env,
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let stderrBytes = 0;
      child.stderr?.on('data', (chunk) => {
        stderrBytes += chunk.length;
        if (stderrBytes > 4096) child.kill('SIGKILL');
      });
      child.once('error', () => reject(new Error('EXTRACTOR_DIRECT_SPAWN_FAILED')));
      child.once('close', (code, signal) => {
        if (code === 0 && !signal) resolve();
        else reject(new Error('EXTRACTOR_DIRECT_EXECUTION_FAILED'));
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
    const state = {
      version: 2,
      projectId,
      batchId,
      retryKey,
      requestHash: stableHash({ batchId, episodeNumbers }),
      oldMediaBaseline: 90,
      frozen: frozenResult.rows.map((item) => ({
        jobId: item.job_id,
        attemptId: item.attempt_id,
        episodeNumber: Number(item.episode_number),
      })),
      frameCount: frameManifest.frames.length,
      totalFrameBytes,
    };
    await writeFile(statePath, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
    console.log('batch_baseline=failed:51 queued:0 frozen:51 episodes:1..51 old_media_total:90');
    console.log(`direct_extractor_preflight=passed frames=${frameManifest.frames.length} total_bytes=${totalFrameBytes}`);
  } finally {
    await pool.end();
  }
} else if (action === 'project-id') {
  process.stdout.write((await loadState()).projectId);
} else {
  const root = required('RELEASE_ROOT');
  const state = await loadState();
  const pool = await createPoolFor(root);
  try {
    if (action === 'pre-submit') {
      await requireUncommittedIdentity(pool, state);
      await requireLocalRoutes(pool, state, 'failed');
      await writeFile(required('PAYLOAD_PATH'), JSON.stringify({
        episodeNumbers: state.frozen.map((item) => item.episodeNumber),
      }), { mode: 0o600, flag: 'wx' });
      console.log('pre_submit=frozen:51 retry_command:0 payload:explicit_1..51');
      console.log('route_proof=jobs:51 local_openvino:51 downstream_targets:0 tencent:0 unknown:0');
    } else if (action === 'commit-state') {
      const commands = await commandRows(pool, state);
      if (commands.rowCount === 0) {
        try {
          await requireUncommittedIdentity(pool, state);
          process.stdout.write('not_committed');
        } catch {
          process.stdout.write('unknown');
        }
      } else if (commands.rowCount === 1) {
        try {
          await requireCommittedIdentity(pool, state);
          process.stdout.write('committed');
        } catch {
          process.stdout.write('unknown');
        }
      } else {
        process.stdout.write('unknown');
      }
    } else if (action === 'projection') {
      await requireCommittedIdentity(pool, state);
      await requireLocalRoutes(pool, state, 'queued');
      console.log('batch_projection=queued:51 frozen:51 retry_command:1');
      console.log('route_proof=jobs:51 local_openvino:51 downstream_targets:0');
    } else if (action === 'monitor') {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      let lastCompleted = -1;
      for (let tick = 0; tick < 120; tick += 1) {
        const [freshResult, jobResult, oldMedia] = await Promise.all([
          freshProjection(pool, state), jobProjection(pool, state),
          oldMediaCount(pool, state.batchId),
        ]);
        const fresh = freshResult.rows[0];
        const jobs = jobResult.rows[0];
        requireSafeFresh(fresh);
        requireSafeJobs(jobs);
        if (oldMedia !== state.oldMediaBaseline) throw new Error('OLD_MEDIA_CODE_INCREASED');
        if (fresh.frozen_completed !== lastCompleted || tick % 6 === 0) {
          console.log(`worker_progress=attempts_completed:${fresh.frozen_completed}/51 fresh_total:${fresh.fresh} jobs_queued:${jobs.queued} jobs_running:${jobs.running} jobs_failed:${jobs.failed} jobs_settled:${jobs.settled}`);
          lastCompleted = fresh.frozen_completed;
        }
        if (isFullRecovery(fresh, jobs)) {
          console.log('worker_full_recovery=attempts_completed:51/51 jobs_queued:0 jobs_running:0 jobs_failed:0 new_failed:0 tencent:0 unknown:0 new_old_media:0');
          break;
        }
        if (tick === 119) {
          console.log(`mode_fix_validated=1 continuation_required=1 attempts_completed:${fresh.frozen_completed}/51 jobs_queued:${jobs.queued} jobs_running:${jobs.running} jobs_failed:0`);
          break;
        }
        await sleep(5000);
      }
    } else if (action === 'final') {
      const [freshResult, jobResult, commands, oldMedia] = await Promise.all([
        freshProjection(pool, state),
        jobProjection(pool, state),
        commandRows(pool, state),
        oldMediaCount(pool, state.batchId),
      ]);
      const fresh = freshResult.rows[0];
      const jobs = jobResult.rows[0];
      requireSafeFresh(fresh);
      requireSafeJobs(jobs);
      if (commands.rowCount !== 1 || oldMedia !== state.oldMediaBaseline) {
        throw new Error('FINAL_PROJECTION_INVALID');
      }
      console.log(`final_new_attempts=${fresh.fresh} attempts_completed=${fresh.frozen_completed}/51 new_failed=${fresh.failed} tencent=${fresh.tencent} unknown=${fresh.unknown} new_old_media=${fresh.new_old_media}`);
      console.log(`jobs_live=queued:${jobs.queued} running:${jobs.running} failed:${jobs.failed} settled:${jobs.settled}`);
      console.log('retry_command_unique=1 old_media_total=90');
      console.log(isFullRecovery(fresh, jobs)
        ? 'recovery_final=complete'
        : 'recovery_final=continuation_required');
    } else {
      throw new Error('RECOVERY_ACTION_INVALID');
    }
  } finally {
    await pool.end();
  }
}
