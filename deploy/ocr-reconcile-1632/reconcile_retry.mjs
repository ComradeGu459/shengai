#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`OCR_RECONCILE_ENV_MISSING_${name}`);
  return value;
};

const action = required('ACTION');
const projectId = 'af8425c4-65cf-427a-94f2-e3e53ec83baa';
const batchId = 'c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25';
const reconcileKey = 'ocr-reconcile-1631-local-sidecar-v1';
const normalizeAbortKey = 'ocr-normalize-abort-1634-v1';
const retryKey = 'ocr-retry-1632-geometry-r3-v1';
const retryEpisodes = [1, 2, 5, 6];
const reconcileRows = [
  {
    episodeNumber: 1,
    jobId: '72af7c0e-4be4-4097-abb0-6089f25f625f',
    attemptId: '50558f12-c0c7-4654-8190-db2a1892c9d0',
    errorCode: 'SCREEN_TEXT_LOCAL_OCR_TIMEOUT',
  },
  {
    episodeNumber: 5,
    jobId: '61f38856-0a88-4d22-90e0-f74a3280daa1',
    attemptId: '92e7e286-b808-44da-9507-f7a68ddd2866',
    errorCode: 'SCREEN_TEXT_LOCAL_OCR_RESPONSE_GEOMETRY_INVALID',
  },
];
const terminalRows = [
  ...reconcileRows,
  {
    episodeNumber: 2,
    jobId: 'd7af37ab-d8c3-4de8-9cbc-09edfc23a0f8',
    attemptId: '8aebd0bc-0350-47eb-b0fc-2bd1e402b2fe',
    errorCode: 'SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE',
  },
  {
    episodeNumber: 6,
    jobId: '37eac964-dbc1-4188-ac92-1ca38f31c5c6',
    attemptId: 'af686c75-a844-47dc-b842-5b451dc291a2',
    errorCode: 'SCREEN_TEXT_LOCAL_OCR_ABORTED',
  },
].sort((left, right) => left.episodeNumber - right.episodeNumber);

const releaseRoot = () => required('RELEASE_ROOT');

const loadRuntime = async () => {
  const root = releaseRoot();
  const [{ createPool }, { stableHash }] = await Promise.all([
    import(pathToFileURL(join(root, 'backend/dist/database/pool.js')).href),
    import(pathToFileURL(join(root, 'backend/dist/modules/screen-text/screen-text.domain.js')).href),
  ]);
  return { pool: createPool(), stableHash };
};

const number = (value) => Number(value ?? 0);
const jsonNumber = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const command = (pool, kind, key) => pool.query(`
  SELECT request_hash,resource_id::text,response_snapshot,created_at
  FROM screen_text_commands
  WHERE project_id=$1 AND command_kind=$2 AND idempotency_key=$3
  ORDER BY created_at
`, [projectId, kind, key]);

const episodeProjection = (pool, episodes) => pool.query(`
  SELECT j.episode_number,j.id::text AS job_id,j.status::text AS job_status,
    j.current_attempt_id::text,a.id::text AS attempt_id,a.status::text AS attempt_status,
    a.provider,a.adapter,a.provider_request_id,a.receipt,a.effect_class,a.error_code,
    a.retryable,a.external_side_effect_possible,a.budget_reservation_id::text,
    a.usage,a.attempt_number,
    (SELECT count(*)::int FROM screen_text_candidates c WHERE c.job_id=j.id) AS candidate_count
  FROM screen_text_jobs j
  LEFT JOIN screen_text_attempts a ON a.id=j.current_attempt_id
  WHERE j.batch_id=$1 AND j.episode_number=ANY($2::integer[])
  ORDER BY j.episode_number
`, [batchId, episodes]);

const batchProjection = (pool) => pool.query(`
  SELECT b.project_id::text,b.status::text,b.revision,
    count(*) FILTER (WHERE j.status='queued')::int AS queued,
    count(*) FILTER (WHERE j.status='running')::int AS running,
    count(*) FILTER (WHERE j.status='review_pending')::int AS review_pending,
    count(*) FILTER (WHERE j.status IN ('completed','confirmed_empty'))::int AS completed,
    count(*) FILTER (WHERE j.status='failed')::int AS failed,
    count(*) FILTER (WHERE j.status='cancelled')::int AS cancelled,
    count(*) FILTER (WHERE j.status='reconciliation_required')::int AS reconciliation_required,
    count(*) FILTER (WHERE j.status NOT IN (
      'queued','running','review_pending','completed','confirmed_empty','failed',
      'cancelled','reconciliation_required'
    ))::int AS other
  FROM screen_text_batches b
  JOIN screen_text_jobs j ON j.batch_id=b.id
  WHERE b.id=$1
  GROUP BY b.project_id,b.status,b.revision
`, [batchId]);

const reconcileRequest = {
  batchId,
  conclusion: 'local_sidecar_terminated_without_persisted_external_result',
  attempts: reconcileRows.map(({ episodeNumber, jobId, attemptId, errorCode }) => ({
    episodeNumber, jobId, attemptId, errorCode,
  })),
};
const normalizeAbortExpected = terminalRows.find((item) => item.episodeNumber === 6);
const normalizeAbortRequest = {
  batchId,
  conclusion: 'local_worker_shutdown_abort_is_cancelled_and_has_no_external_side_effect',
  episodeNumber: 6,
  jobId: normalizeAbortExpected.jobId,
  attemptId: normalizeAbortExpected.attemptId,
  errorCode: normalizeAbortExpected.errorCode,
};

const assertBeforeReconcile = (rows) => {
  if (rows.length !== reconcileRows.length) throw new Error('RECONCILE_IDENTITY_COUNT_CHANGED');
  for (const expected of reconcileRows) {
    const row = rows.find((item) => number(item.episode_number) === expected.episodeNumber);
    const usage = row?.usage ?? {};
    if (!row || row.job_id !== expected.jobId || row.attempt_id !== expected.attemptId
      || row.current_attempt_id !== expected.attemptId
      || row.job_status !== 'reconciliation_required'
      || row.attempt_status !== 'reconciliation_required'
      || row.provider !== 'openvino'
      || row.adapter !== 'screen_text_openvino_ppocrv6_small'
      || row.provider_request_id !== `local-ocr-sidecar:${expected.attemptId}`
      || row.receipt !== 'unknown' || row.effect_class !== 'external_unknown'
      || row.error_code !== expected.errorCode || row.retryable !== false
      || row.external_side_effect_possible !== true
      || row.budget_reservation_id !== null || number(row.candidate_count) !== 0
      || usage.reconciliationStatus !== 'pending'
      || jsonNumber(usage.billingQuantity) !== 0 || jsonNumber(usage.finalAmount) !== 0) {
      throw new Error(`RECONCILE_IDENTITY_CHANGED_EPISODE_${expected.episodeNumber}`);
    }
  }
};

const assertAfterReconcile = (rows) => {
  if (rows.length !== reconcileRows.length) throw new Error('RECONCILE_RESULT_COUNT_INVALID');
  for (const expected of reconcileRows) {
    const row = rows.find((item) => number(item.episode_number) === expected.episodeNumber);
    const usage = row?.usage ?? {};
    if (!row || row.job_id !== expected.jobId || row.attempt_id !== expected.attemptId
      || row.current_attempt_id !== expected.attemptId || row.job_status !== 'failed'
      || row.attempt_status !== 'failed' || row.provider !== 'openvino'
      || row.adapter !== 'screen_text_openvino_ppocrv6_small'
      || row.provider_request_id !== `local-ocr-sidecar:${expected.attemptId}`
      || row.receipt !== 'unsupported' || row.effect_class !== 'external_not_accepted'
      || row.error_code !== expected.errorCode || row.retryable !== true
      || row.external_side_effect_possible !== false
      || row.budget_reservation_id !== null || number(row.candidate_count) !== 0
      || usage.reconciliationStatus !== 'final'
      || jsonNumber(usage.billingQuantity) !== 0 || jsonNumber(usage.finalAmount) !== 0) {
      throw new Error(`RECONCILE_RESULT_INVALID_EPISODE_${expected.episodeNumber}`);
    }
  }
};

const auditBaseline = async (pool) => {
  const [batch, episodes, audit, normalized, retry] = await Promise.all([
    batchProjection(pool),
    episodeProjection(pool, retryEpisodes),
    command(pool, 'reconcile_local_unknown', reconcileKey),
    command(pool, 'normalize_local_abort', normalizeAbortKey),
    command(pool, 'retry_batch', retryKey),
  ]);
  const row = batch.rows[0];
  if (batch.rowCount !== 1 || row.project_id !== projectId || number(row.revision) !== 3
    || number(row.queued) !== 45 || number(row.review_pending) !== 2
    || number(row.running) !== 0 || number(row.completed) !== 0
    || number(row.other) !== 0 || episodes.rowCount !== 4 || retry.rowCount !== 0
    || audit.rowCount > 1 || normalized.rowCount > 1) {
    throw new Error('READ_ONLY_AUDIT_PROJECTION_CHANGED');
  }
  let phase;
  if (audit.rowCount === 0 && normalized.rowCount === 0) {
    if (row.status !== 'reconciliation_required' || number(row.failed) !== 2
      || number(row.cancelled) !== 0 || number(row.reconciliation_required) !== 2) {
      throw new Error('READ_ONLY_AUDIT_PRE_RECONCILE_CHANGED');
    }
    assertBeforeReconcile(episodes.rows.filter((item) => [1, 5].includes(number(item.episode_number))));
    phase = 'before_reconcile';
  } else if (audit.rowCount === 1 && normalized.rowCount === 0) {
    if (row.status !== 'partial' || number(row.failed) !== 4
      || number(row.cancelled) !== 0 || number(row.reconciliation_required) !== 0) {
      throw new Error('READ_ONLY_AUDIT_POST_RECONCILE_CHANGED');
    }
    assertAfterReconcile(episodes.rows.filter((item) => [1, 5].includes(number(item.episode_number))));
    phase = 'after_reconcile';
  } else if (audit.rowCount === 1 && normalized.rowCount === 1) {
    if (row.status !== 'partial' || number(row.failed) !== 3
      || number(row.cancelled) !== 1 || number(row.reconciliation_required) !== 0) {
      throw new Error('READ_ONLY_AUDIT_POST_NORMALIZE_CHANGED');
    }
    assertAfterReconcile(episodes.rows.filter((item) => [1, 5].includes(number(item.episode_number))));
    phase = 'after_normalize';
  } else {
    throw new Error('READ_ONLY_AUDIT_COMMAND_ORDER_INVALID');
  }
  const episode2 = episodes.rows.find((item) => number(item.episode_number) === 2);
  const episode6 = episodes.rows.find((item) => number(item.episode_number) === 6);
  if (!episode2 || episode2.job_id !== terminalRows[1].jobId
    || episode2.attempt_id !== terminalRows[1].attemptId
    || episode2.current_attempt_id !== terminalRows[1].attemptId
    || episode2.job_status !== 'failed' || episode2.attempt_status !== 'failed'
    || episode2.error_code !== 'SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE'
    || episode2.effect_class !== 'external_not_accepted'
    || episode2.provider_request_id !== null || episode2.receipt !== 'simulated'
    || episode2.external_side_effect_possible !== false
    || episode2.budget_reservation_id !== null || number(episode2.candidate_count) !== 0
    || !episode6 || episode6.job_id !== terminalRows[3].jobId
    || episode6.attempt_id !== terminalRows[3].attemptId
    || episode6.current_attempt_id !== terminalRows[3].attemptId
    || episode6.job_status !== (phase === 'after_normalize' ? 'cancelled' : 'failed')
    || episode6.attempt_status !== (phase === 'after_normalize' ? 'cancelled' : 'failed')
    || episode6.error_code !== 'SCREEN_TEXT_LOCAL_OCR_ABORTED'
    || episode6.effect_class !== 'cancelled'
    || episode6.provider_request_id !== `local-ocr-sidecar:${terminalRows[3].attemptId}`
    || episode6.receipt !== 'unsupported'
    || episode6.external_side_effect_possible !== false
    || episode6.budget_reservation_id !== null || number(episode6.candidate_count) !== 0) {
    throw new Error('READ_ONLY_AUDIT_TERMINAL_IDENTITY_CHANGED');
  }
  console.log(`read_only_audit=passed phase:${phase} queued:45 review:2 failed:${row.failed} cancelled:${row.cancelled} unknown:${row.reconciliation_required}`);
};

const recomputeBatch = (client) => client.query(`
  UPDATE screen_text_batches b SET status=summary.status,updated_at=CURRENT_TIMESTAMP
  FROM (SELECT batch_id,CASE
    WHEN bool_or(status='stale') THEN 'stale'::screen_text_batch_status
    WHEN bool_or(status='reconciliation_required') THEN 'reconciliation_required'::screen_text_batch_status
    WHEN bool_or(status='cancel_requested') THEN 'cancel_requested'::screen_text_batch_status
    WHEN bool_or(status='running') THEN 'running'::screen_text_batch_status
    WHEN bool_or(status='failed') AND bool_or(status IN ('review_pending','completed','confirmed_empty')) THEN 'partial'::screen_text_batch_status
    WHEN bool_or(status='failed') THEN 'failed'::screen_text_batch_status
    WHEN bool_or(status IN ('not_started','queued')) AND bool_or(status IN ('review_pending','completed','confirmed_empty','cancelled')) THEN 'partial'::screen_text_batch_status
    WHEN bool_or(status IN ('not_started','queued')) THEN 'queued'::screen_text_batch_status
    WHEN bool_or(status='review_pending') THEN 'review_pending'::screen_text_batch_status
    WHEN bool_and(status IN ('completed','confirmed_empty')) THEN 'completed'::screen_text_batch_status
    WHEN bool_and(status='cancelled') THEN 'cancelled'::screen_text_batch_status
    ELSE 'partial'::screen_text_batch_status END AS status
  FROM screen_text_jobs WHERE batch_id=$1 GROUP BY batch_id) summary
  WHERE b.id=summary.batch_id
`, [batchId]);

const reconcile = async (pool, stableHash) => {
  const requestHash = stableHash(reconcileRequest);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('qimao:ocr-reconcile-1631'))");
    const existing = await command(client, 'reconcile_local_unknown', reconcileKey);
    if (existing.rowCount > 1) throw new Error('RECONCILE_COMMAND_DUPLICATED');
    if (existing.rowCount === 1) {
      if (existing.rows[0].request_hash !== requestHash
        || existing.rows[0].resource_id !== batchId) {
        throw new Error('RECONCILE_COMMAND_CONFLICT');
      }
      const projection = await episodeProjection(client, [1, 5]);
      assertAfterReconcile(projection.rows);
      await client.query('COMMIT');
      console.log('reconcile=replay command_unique:1 episodes:1,5');
      return;
    }
    const batch = await client.query(`
      SELECT id,project_id::text,status::text,revision FROM screen_text_batches
      WHERE id=$1 AND project_id=$2 FOR UPDATE
    `, [batchId, projectId]);
    if (batch.rowCount !== 1 || batch.rows[0].status !== 'reconciliation_required'
      || number(batch.rows[0].revision) !== 3) {
      throw new Error('RECONCILE_BATCH_BASELINE_CHANGED');
    }
    const locked = await client.query(`
      SELECT j.episode_number,j.id::text AS job_id,j.status::text AS job_status,
        j.current_attempt_id::text,a.id::text AS attempt_id,a.status::text AS attempt_status,
        a.provider,a.adapter,a.provider_request_id,a.receipt,a.effect_class,a.error_code,
        a.retryable,a.external_side_effect_possible,a.budget_reservation_id::text,
        a.usage,a.attempt_number,
        (SELECT count(*)::int FROM screen_text_candidates c WHERE c.job_id=j.id) AS candidate_count
      FROM screen_text_jobs j
      JOIN screen_text_attempts a ON a.id=j.current_attempt_id
      WHERE j.batch_id=$1 AND j.episode_number=ANY($2::integer[])
      ORDER BY j.episode_number
      FOR UPDATE OF j,a
    `, [batchId, [1, 5]]);
    assertBeforeReconcile(locked.rows);
    const updatedAttempts = await client.query(`
      UPDATE screen_text_attempts SET
        status='failed',effect_class='external_not_accepted',receipt='unsupported',
        retryable=true,external_side_effect_possible=false,
        usage=jsonb_set(COALESCE(usage,'{}'::jsonb),'{reconciliationStatus}','"final"'::jsonb,true),
        lease_owner=NULL,lease_expires_at=NULL,
        error_detail=concat_ws('；',NULLIF(error_detail,''),'已对账：本地OpenVINO进程已终止且无持久外部结果'),
        completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP)
      WHERE id=ANY($1::uuid[])
        AND status='reconciliation_required' AND effect_class='external_unknown'
      RETURNING id
    `, [reconcileRows.map((item) => item.attemptId)]);
    if (updatedAttempts.rowCount !== 2) throw new Error('RECONCILE_ATTEMPT_UPDATE_COUNT_INVALID');
    const updatedJobs = await client.query(`
      UPDATE screen_text_jobs SET status='failed',cancel_requested=false,updated_at=CURRENT_TIMESTAMP
      WHERE id=ANY($1::uuid[]) AND status='reconciliation_required'
      RETURNING id
    `, [reconcileRows.map((item) => item.jobId)]);
    if (updatedJobs.rowCount !== 2) throw new Error('RECONCILE_JOB_UPDATE_COUNT_INVALID');
    await recomputeBatch(client);
    await client.query(`
      INSERT INTO screen_text_commands (
        project_id,command_kind,idempotency_key,request_hash,resource_id,response_snapshot
      ) VALUES ($1,'reconcile_local_unknown',$2,$3,$4,$5::jsonb)
    `, [projectId, reconcileKey, requestHash, batchId, JSON.stringify({
      outcome: 'failed_local_process_terminated_no_persisted_result',
      episodes: reconcileRows.map((item) => item.episodeNumber),
      attempts: reconcileRows.map((item) => item.attemptId),
    })]);
    const projection = await episodeProjection(client, [1, 5]);
    assertAfterReconcile(projection.rows);
    await client.query('COMMIT');
    console.log('reconcile=committed command_unique:1 episodes:1,5 external_result:none');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const normalizeAbort = async (pool, stableHash) => {
  const expected = normalizeAbortExpected;
  const requestHash = stableHash(normalizeAbortRequest);
  const client = await pool.connect();
  const assertNormalized = async () => {
    const projection = await episodeProjection(client, [6]);
    const row = projection.rows[0];
    if (projection.rowCount !== 1 || row.job_id !== expected.jobId
      || row.attempt_id !== expected.attemptId || row.current_attempt_id !== expected.attemptId
      || row.job_status !== 'cancelled' || row.attempt_status !== 'cancelled'
      || row.error_code !== expected.errorCode || row.effect_class !== 'cancelled'
      || row.receipt !== 'unsupported'
      || row.provider_request_id !== `local-ocr-sidecar:${expected.attemptId}`
      || row.retryable !== false || row.external_side_effect_possible !== false
      || row.budget_reservation_id !== null || number(row.candidate_count) !== 0) {
      throw new Error('NORMALIZE_ABORT_RESULT_INVALID');
    }
  };
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('qimao:ocr-normalize-abort-1634'))");
    const existing = await command(client, 'normalize_local_abort', normalizeAbortKey);
    if (existing.rowCount > 1) throw new Error('NORMALIZE_ABORT_COMMAND_DUPLICATED');
    if (existing.rowCount === 1) {
      if (existing.rows[0].request_hash !== requestHash
        || existing.rows[0].resource_id !== batchId) {
        throw new Error('NORMALIZE_ABORT_COMMAND_CONFLICT');
      }
      await assertNormalized();
      await client.query('COMMIT');
      console.log('normalize_abort=replay command_unique:1 episode:6');
      return;
    }
    const locked = await client.query(`
      SELECT j.episode_number,j.id::text AS job_id,j.status::text AS job_status,
        j.current_attempt_id::text,a.id::text AS attempt_id,a.status::text AS attempt_status,
        a.provider,a.adapter,a.provider_request_id,a.receipt,a.effect_class,a.error_code,
        a.retryable,a.external_side_effect_possible,a.budget_reservation_id::text,
        (SELECT count(*)::int FROM screen_text_candidates c WHERE c.job_id=j.id) AS candidate_count
      FROM screen_text_jobs j JOIN screen_text_attempts a ON a.id=j.current_attempt_id
      WHERE j.batch_id=$1 AND j.episode_number=6 FOR UPDATE OF j,a
    `, [batchId]);
    const row = locked.rows[0];
    if (locked.rowCount !== 1 || row.job_id !== expected.jobId
      || row.attempt_id !== expected.attemptId || row.current_attempt_id !== expected.attemptId
      || row.job_status !== 'failed' || row.attempt_status !== 'failed'
      || row.provider !== 'openvino' || row.adapter !== 'screen_text_openvino_ppocrv6_small'
      || row.provider_request_id !== `local-ocr-sidecar:${expected.attemptId}`
      || row.receipt !== 'unsupported' || row.effect_class !== 'cancelled'
      || row.error_code !== expected.errorCode || row.retryable !== false
      || row.external_side_effect_possible !== false
      || row.budget_reservation_id !== null || number(row.candidate_count) !== 0) {
      throw new Error('NORMALIZE_ABORT_IDENTITY_CHANGED');
    }
    const attempt = await client.query(`
      UPDATE screen_text_attempts SET status='cancelled',lease_owner=NULL,lease_expires_at=NULL,
        completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP)
      WHERE id=$1 AND status='failed' AND effect_class='cancelled'
        AND external_side_effect_possible=false RETURNING id
    `, [expected.attemptId]);
    const job = await client.query(`
      UPDATE screen_text_jobs SET status='cancelled',cancel_requested=false,updated_at=CURRENT_TIMESTAMP
      WHERE id=$1 AND status='failed' RETURNING id
    `, [expected.jobId]);
    if (attempt.rowCount !== 1 || job.rowCount !== 1) {
      throw new Error('NORMALIZE_ABORT_UPDATE_COUNT_INVALID');
    }
    await recomputeBatch(client);
    await client.query(`
      INSERT INTO screen_text_commands (
        project_id,command_kind,idempotency_key,request_hash,resource_id,response_snapshot
      ) VALUES ($1,'normalize_local_abort',$2,$3,$4,$5::jsonb)
    `, [projectId, normalizeAbortKey, requestHash, batchId, JSON.stringify({
      outcome: 'cancelled_local_worker_shutdown_no_external_side_effect',
      episodeNumber: 6,
      attemptId: expected.attemptId,
    })]);
    await assertNormalized();
    await client.query('COMMIT');
    console.log('normalize_abort=committed command_unique:1 episode:6 external_result:none');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const assertRetryBaseline = async (pool, stableHash) => {
  const [audit, normalized, retry, batch, episodes, eligible] = await Promise.all([
    command(pool, 'reconcile_local_unknown', reconcileKey),
    command(pool, 'normalize_local_abort', normalizeAbortKey),
    command(pool, 'retry_batch', retryKey),
    batchProjection(pool),
    episodeProjection(pool, retryEpisodes),
    pool.query(`
      SELECT count(*)::int AS count
      FROM screen_text_jobs j
      JOIN screen_text_attempts a ON a.id=j.current_attempt_id
      WHERE j.batch_id=$1 AND j.episode_number=ANY($2::integer[])
        AND ((j.status='failed' AND a.status='failed'
          AND (a.retryable=true OR a.error_code='SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE')
          AND a.external_side_effect_possible=false)
        OR (j.status='cancelled' AND a.status='cancelled'
          AND a.external_side_effect_possible=false))
    `, [batchId, retryEpisodes]),
  ]);
  const requestHash = stableHash(reconcileRequest);
  const row = batch.rows[0];
  if (audit.rowCount !== 1 || audit.rows[0].request_hash !== requestHash
    || audit.rows[0].resource_id !== batchId || normalized.rowCount !== 1
    || normalized.rows[0].request_hash !== stableHash(normalizeAbortRequest)
    || normalized.rows[0].resource_id !== batchId || retry.rowCount !== 0
    || batch.rowCount !== 1 || row.project_id !== projectId || row.status !== 'partial'
    || number(row.revision) !== 3 || number(row.queued) !== 45
    || number(row.review_pending) !== 2 || number(row.failed) !== 3
    || number(row.cancelled) !== 1
    || number(row.running) !== 0 || number(row.completed) !== 0
    || number(row.reconciliation_required) !== 0 || number(row.other) !== 0
    || eligible.rows[0]?.count !== 4 || episodes.rowCount !== 4) {
    throw new Error('RETRY_PRE_SUBMIT_PROJECTION_CHANGED');
  }
  for (const expected of terminalRows) {
    const item = episodes.rows.find((candidate) => number(candidate.episode_number) === expected.episodeNumber);
    if (!item || item.job_id !== expected.jobId || item.current_attempt_id !== expected.attemptId
      || item.attempt_id !== expected.attemptId
      || item.job_status !== (expected.episodeNumber === 6 ? 'cancelled' : 'failed')
      || item.attempt_status !== (expected.episodeNumber === 6 ? 'cancelled' : 'failed')
      || item.error_code !== expected.errorCode
      || item.external_side_effect_possible !== false || number(item.candidate_count) !== 0
      || item.budget_reservation_id !== null) {
      throw new Error(`RETRY_IDENTITY_CHANGED_EPISODE_${expected.episodeNumber}`);
    }
  }
};

const committedProjection = async (pool, stableHash) => {
  const [retry, batch, episodes] = await Promise.all([
    command(pool, 'retry_batch', retryKey),
    batchProjection(pool),
    episodeProjection(pool, retryEpisodes),
  ]);
  const requestHash = stableHash({ batchId, episodeNumbers: retryEpisodes });
  const row = batch.rows[0];
  if (retry.rowCount !== 1 || retry.rows[0].request_hash !== requestHash
    || retry.rows[0].resource_id !== batchId || batch.rowCount !== 1
    || row.project_id !== projectId || row.status !== 'partial'
    || number(row.revision) !== 4 || number(row.queued) !== 49
    || number(row.review_pending) !== 2 || number(row.failed) !== 0
    || number(row.cancelled) !== 0
    || number(row.running) !== 0 || number(row.completed) !== 0
    || number(row.reconciliation_required) !== 0 || number(row.other) !== 0
    || episodes.rowCount !== 4
    || episodes.rows.some((item) => item.job_status !== 'queued')) {
    throw new Error('RETRY_COMMITTED_PROJECTION_INVALID');
  }
};

const freshProjection = (pool) => pool.query(`
  WITH retry AS (
    SELECT created_at FROM screen_text_commands
    WHERE project_id=$1 AND command_kind='retry_batch' AND idempotency_key=$3
  ), fresh AS (
    SELECT a.status::text,a.effect_class,a.error_code,a.provider,a.provider_request_id
    FROM screen_text_attempts a
    JOIN screen_text_jobs j ON j.id=a.job_id
    CROSS JOIN retry
    WHERE j.batch_id=$2 AND a.created_at>=retry.created_at
  )
  SELECT count(*)::int AS attempts,
    count(*) FILTER (WHERE status IN ('leased','running'))::int AS active,
    count(*) FILTER (WHERE status='completed')::int AS completed,
    count(*) FILTER (WHERE status='failed')::int AS failed,
    count(*) FILTER (WHERE status='cancelled')::int AS cancelled,
    count(*) FILTER (WHERE status='reconciliation_required'
      OR effect_class='external_unknown')::int AS unknown,
    count(*) FILTER (WHERE provider<>'openvino')::int AS non_local,
    count(*) FILTER (WHERE provider_request_id IS NOT NULL
      AND provider_request_id NOT LIKE 'local-ocr-sidecar:%')::int AS external_identity,
    count(*) FILTER (WHERE error_code IN (
      'SCREEN_TEXT_LOCAL_OCR_TIMEOUT',
      'SCREEN_TEXT_LOCAL_OCR_RESPONSE_GEOMETRY_INVALID'
    ))::int AS repeated_known_error,
    COALESCE(string_agg(DISTINCT error_code,',' ORDER BY error_code)
      FILTER (WHERE error_code IS NOT NULL),'') AS error_codes
  FROM fresh
`, [projectId, batchId, retryKey]);

const monitor = async (pool) => {
  let lastProgress = -1;
  let lastChange = Date.now();
  for (let tick = 0; tick < 240; tick += 1) {
    const [batch, fresh] = await Promise.all([batchProjection(pool), freshProjection(pool)]);
    const jobs = batch.rows[0];
    const attempts = fresh.rows[0];
    const progress = number(jobs.review_pending) + number(jobs.completed);
    if (number(attempts.failed) > 0 || number(attempts.cancelled) > 0
      || number(attempts.unknown) > 0 || number(attempts.non_local) > 0
      || number(attempts.external_identity) > 0 || number(attempts.repeated_known_error) > 0
      || number(jobs.failed) > 0 || number(jobs.cancelled) > 0
      || number(jobs.reconciliation_required) > 0) {
      console.log(`monitor_failure=jobs_failed:${jobs.failed} jobs_cancelled:${jobs.cancelled} jobs_unknown:${jobs.reconciliation_required} fresh_failed:${attempts.failed} fresh_unknown:${attempts.unknown} errors:${attempts.error_codes || 'none'}`);
      throw new Error('OCR_MONITOR_NEW_FAILURE');
    }
    if (progress !== lastProgress) {
      lastProgress = progress;
      lastChange = Date.now();
    }
    if (tick % 6 === 0 || progress >= 51) {
      console.log(`worker_progress=settled:${progress}/51 queued:${jobs.queued} running:${jobs.running} fresh_attempts:${attempts.attempts} fresh_active:${attempts.active}`);
    }
    if (progress === 51 && number(jobs.queued) === 0 && number(jobs.running) === 0) {
      console.log('monitor_terminal=complete settled:51/51 failed:0 unknown:0 provider:openvino');
      return;
    }
    if (Date.now() - lastChange > 180_000) throw new Error('OCR_MONITOR_PROGRESS_STALLED');
    if (tick === 239) {
      console.log(`monitor_terminal=continuation_required settled:${progress}/51 queued:${jobs.queued} running:${jobs.running} failed:0 unknown:0`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};

if (action === 'session') {
  const root = releaseRoot();
  const { createEmployeeAuthServiceFromEnv } = await import(
    pathToFileURL(join(root, 'backend/dist/modules/employee-auth/employee-auth.js')).href
  );
  const service = createEmployeeAuthServiceFromEnv();
  if (!service) throw new Error('EMPLOYEE_AUTH_UNAVAILABLE');
  process.stdout.write(service.issueSession().token);
} else if (action === 'project-id') {
  process.stdout.write(projectId);
} else if (action === 'batch-id') {
  process.stdout.write(batchId);
} else {
  const { pool, stableHash } = await loadRuntime();
  try {
    if (action === 'audit') {
      await auditBaseline(pool);
    } else if (action === 'reconcile') {
      await reconcile(pool, stableHash);
    } else if (action === 'normalize-abort') {
      await normalizeAbort(pool, stableHash);
    } else if (action === 'pre-submit') {
      await assertRetryBaseline(pool, stableHash);
      await writeFile(required('PAYLOAD_PATH'), JSON.stringify({
        episodeNumbers: retryEpisodes,
      }), { mode: 0o600, flag: 'wx' });
      console.log('pre_submit=passed jobs:45_queued+2_review+3_failed+1_cancelled retry_eligible:4 payload:1,2,5,6');
    } else if (action === 'commit-state') {
      const retry = await command(pool, 'retry_batch', retryKey);
      if (retry.rowCount === 0) {
        try {
          await assertRetryBaseline(pool, stableHash);
          process.stdout.write('not_committed');
        } catch {
          process.stdout.write('unknown');
        }
      } else if (retry.rowCount === 1) {
        try {
          await committedProjection(pool, stableHash);
          process.stdout.write('committed');
        } catch {
          process.stdout.write('unknown');
        }
      } else {
        process.stdout.write('unknown');
      }
    } else if (action === 'projection') {
      await committedProjection(pool, stableHash);
      console.log('retry_projection=committed command_unique:1 jobs:49_queued+2_review route:unchanged');
    } else if (action === 'monitor') {
      await monitor(pool);
    } else if (action === 'snapshot') {
      const [batch, fresh] = await Promise.all([batchProjection(pool), freshProjection(pool)]);
      const jobs = batch.rows[0];
      const attempts = fresh.rows[0];
      console.log(`snapshot=batch:${jobs.status} queued:${jobs.queued} running:${jobs.running} review:${jobs.review_pending} completed:${jobs.completed} failed:${jobs.failed} cancelled:${jobs.cancelled} unknown:${jobs.reconciliation_required}`);
      console.log(`snapshot_fresh=attempts:${attempts.attempts} active:${attempts.active} completed:${attempts.completed} failed:${attempts.failed} unknown:${attempts.unknown} non_local:${attempts.non_local} errors:${attempts.error_codes || 'none'}`);
    } else {
      throw new Error('OCR_RECONCILE_ACTION_INVALID');
    }
  } finally {
    await pool.end();
  }
}
