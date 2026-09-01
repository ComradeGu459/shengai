#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`RETRY_ENV_MISSING_${name}`);
  return value;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const action = required('ACTION');

const loadState = async () => {
  const state = JSON.parse(await readFile(required('STATE_PATH'), 'utf8'));
  if (state.version !== 1 || !uuid.test(state.projectId) || !uuid.test(state.batchId)
    || typeof state.retryKey !== 'string' || state.retryKey.length < 1
    || !/^[0-9a-f]{64}$/.test(state.requestHash)
    || !Array.isArray(state.frozen) || state.frozen.length !== 39) {
    throw new Error('RETRY_STATE_INVALID');
  }
  let previousEpisode = 0;
  const jobs = new Set();
  const attempts = new Set();
  for (const item of state.frozen) {
    if (!uuid.test(item.jobId) || !uuid.test(item.attemptId)
      || !Number.isInteger(item.episodeNumber) || item.episodeNumber <= previousEpisode
      || item.episodeNumber < 1 || item.episodeNumber > 100
      || jobs.has(item.jobId) || attempts.has(item.attemptId)) {
      throw new Error('RETRY_FROZEN_IDENTITY_INVALID');
    }
    previousEpisode = item.episodeNumber;
    jobs.add(item.jobId);
    attempts.add(item.attemptId);
  }
  return state;
};

const createPoolFor = async (root) => {
  const { createPool } = await import(
    pathToFileURL(join(root, 'backend/dist/database/pool.js')).href
  );
  return createPool();
};

const commandRows = (pool, state) => pool.query(`
  SELECT request_hash,resource_id::text FROM screen_text_commands
  WHERE project_id=$1 AND command_kind='retry_batch' AND idempotency_key=$2
  ORDER BY created_at
`, [state.projectId, state.retryKey]);

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
      AND a.external_side_effect_possible=false)::int AS exact
  FROM frozen
  LEFT JOIN screen_text_jobs j ON j.id=frozen."jobId"
  LEFT JOIN screen_text_attempts a ON a.id=frozen."attemptId"
`, [state.batchId, JSON.stringify(state.frozen)]);

const batchProjection = (pool, state) => pool.query(`
  SELECT count(*) FILTER (WHERE status='failed')::int AS failed,
    count(*) FILTER (WHERE status='queued')::int AS queued,
    count(*) FILTER (WHERE status NOT IN ('failed','queued'))::int AS other,
    count(*) FILTER (WHERE id = ANY($2::uuid[]) AND status='queued')::int AS frozen_queued
  FROM screen_text_jobs WHERE batch_id=$1
`, [state.batchId, state.frozen.map((item) => item.jobId)]);

const requireUncommittedIdentity = async (pool, state) => {
  const [commands, identity, projection] = await Promise.all([
    commandRows(pool, state), frozenIdentity(pool, state), batchProjection(pool, state),
  ]);
  const exact = identity.rows[0];
  const jobs = projection.rows[0];
  if (commands.rowCount !== 0 || exact?.total !== 39 || exact?.exact !== 39
    || jobs?.failed !== 39 || jobs?.queued !== 12 || jobs?.other !== 0) {
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
    || jobs?.queued !== 51 || jobs?.other !== 0 || jobs?.frozen_queued !== 39) {
    throw new Error('COMMITTED_IDENTITY_INVALID');
  }
};

const requireLocalRoutes = async (pool, state) => {
  const result = await pool.query(`
    WITH jobs AS (
      SELECT j.id,j.routing_version_id,
        CASE WHEN j.current_attempt_id IS NOT NULL THEN current.routing_target_priority
          ELSE COALESCE((SELECT max(a.routing_target_priority)
            FROM screen_text_attempts a WHERE a.job_id=j.id),0)+1 END AS expected_priority
      FROM screen_text_jobs j
      LEFT JOIN screen_text_attempts current ON current.id=j.current_attempt_id
      WHERE j.batch_id=$1 AND j.status='queued'
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
  `, [state.batchId]);
  const row = result.rows[0];
  if (row?.jobs !== 51 || row?.safe !== 51) throw new Error('LOCAL_ROUTE_PROOF_FAILED');
};

if (action === 'project-id') {
  process.stdout.write((await loadState()).projectId);
} else if (action === 'session') {
  const root = required('RELEASE_ROOT');
  const { createEmployeeAuthServiceFromEnv } = await import(
    pathToFileURL(join(root, 'backend/dist/modules/employee-auth/employee-auth.js')).href
  );
  const service = createEmployeeAuthServiceFromEnv();
  if (!service) throw new Error('EMPLOYEE_AUTH_UNAVAILABLE');
  process.stdout.write(service.issueSession().token);
} else {
  const root = required('RELEASE_ROOT');
  const state = await loadState();
  const pool = await createPoolFor(root);
  try {
    if (action === 'pre-submit') {
      await requireUncommittedIdentity(pool, state);
      await writeFile(required('PAYLOAD_PATH'), JSON.stringify({
        episodeNumbers: state.frozen.map((item) => item.episodeNumber),
      }), { mode: 0o600, flag: 'wx' });
      console.log('pre_submit=frozen:39 retry_command:0 payload:explicit');
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
      await requireLocalRoutes(pool, state);
      console.log('batch_projection=queued:51 frozen:39 retry_command:1');
      console.log('route_proof=jobs:51 local_openvino:51 downstream_targets:0');
    } else if (action === 'monitor') {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      let lastFrozenCompleted = -1;
      for (let tick = 0; tick < 120; tick += 1) {
        const result = await pool.query(`
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
            count(*) FILTER (
              WHERE error_code='SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE'
            )::int AS new_old_media
          FROM fresh
        `, [state.batchId, state.projectId, state.retryKey,
          state.requestHash, JSON.stringify(state.frozen)]);
        const row = result.rows[0];
        if (!row || row.non_openvino > 0 || row.tencent > 0
          || row.unknown > 0 || row.failed > 0 || row.new_old_media > 0) {
          throw new Error('WORKER_RESULT_ROUTE_OR_EFFECT_FAILED');
        }
        if (row.frozen_completed !== lastFrozenCompleted || tick % 6 === 0) {
          console.log(`worker_progress=frozen_completed:${row.frozen_completed} frozen_new:${row.frozen_fresh} fresh_total:${row.fresh}`);
          lastFrozenCompleted = row.frozen_completed;
        }
        if (row.frozen_completed > 0) {
          const oldMedia = await pool.query(`
            SELECT count(*)::int AS count FROM screen_text_attempts a
            JOIN screen_text_jobs j ON j.id=a.job_id
            WHERE j.batch_id=$1
              AND a.error_code='SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE'
          `, [state.batchId]);
          if (oldMedia.rows[0]?.count !== 39) throw new Error('OLD_MEDIA_CODE_INCREASED');
          const jobs = await pool.query(`
            SELECT status::text,count(*)::int AS count
            FROM screen_text_jobs WHERE batch_id=$1
            GROUP BY status ORDER BY status::text
          `, [state.batchId]);
          console.log('worker_first_safe_frozen_result=1 old_media_total=39 tencent=0 unknown=0');
          console.log(`batch_live=${jobs.rows.map((item) => `${item.status}:${item.count}`).join(',')}`);
          break;
        }
        if (tick === 119) throw new Error('WORKER_PROGRESS_TIMEOUT');
        await sleep(5000);
      }
    } else {
      throw new Error('RETRY_ACTION_INVALID');
    }
  } finally {
    await pool.end();
  }
}
