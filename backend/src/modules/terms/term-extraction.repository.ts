import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import type { ParsedTermCue } from './srt-parser.js';
import type { ExtractedTermSeed } from './term-extraction.js';
import { termConflict } from './term-errors.js';
import { draftColumns, type DraftRow, type RunRow, toDraft, toRun } from './term-mappers.js';
import type { TermsRouteSnapshot } from '../system-control/system-control.routing.service.js';

interface CommandRow extends QueryResultRow {
  request_hash: string;
  run_id: string;
}

export interface TermExtractionAttemptRow extends QueryResultRow {
  id: string;
  run_id: string;
  routing_target_id: string;
  deployment_version_id: string;
  routing_version_id: string;
  priority: number;
  role: 'preferred' | 'standard' | 'emergency';
  adapter: string;
  adapter_config: Record<string, unknown>;
  config_digest: string;
  route_digest: string;
  secret_reference_version_id: string | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown' | 'skipped';
  claimed_by: string | null;
  claim_expires_at: Date | null;
  provider_started_at: Date | null;
  usage_summary: Record<string, number>;
  error_code: string | null;
  error_detail: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export type TermExtractionAttemptClaim = { run: RunRow; attempt: TermExtractionAttemptRow };

const UNKNOWN_PROVIDER_CODE = 'TERM_PROVIDER_UNKNOWN';
const UNKNOWN_PROVIDER_DETAIL = '术语 Provider attempt 已在请求开始后失去租约，结果未知；未自动重发或切换备用。';

const loadRun = async (client: PoolClient, runId: string) => {
  const result = await client.query<RunRow>('SELECT * FROM term_extraction_runs WHERE id = $1', [runId]);
  return result.rows[0] ? toRun(result.rows[0]) : null;
};

const loadDraft = async (client: PoolClient, draftId: string) => {
  const result = await client.query<DraftRow>(
    `SELECT ${draftColumns}
       FROM term_drafts draft
       LEFT JOIN term_candidates candidate ON candidate.draft_id = draft.id
      WHERE draft.id = $1
      GROUP BY draft.id`,
    [draftId],
  );
  return result.rows[0] ? toDraft(result.rows[0]) : null;
};

export class TermExtractionRepository {
  constructor(private readonly pool: DatabasePool) {}

  /**
   * 在 Worker 领取新任务前收敛 marker 后失联的 attempt。
   * 该事务同时终结 run；queued 备用保持原样，后续 claim 因 run 已终态而不会调用 Provider。
   */
  async sweepExpiredAttemptClaims(input: { now?: Date } = {}) {
    const client = await this.pool.connect();
    const now = input.now ?? new Date();
    try {
      await client.query('BEGIN');
      const attempts = await client.query<{ id: string; run_id: string }>(
        `UPDATE term_extraction_attempts attempt
            SET status = 'unknown', error_code = $2, error_detail = $3,
                completed_at = CURRENT_TIMESTAMP, claimed_by = NULL, claim_expires_at = NULL
           FROM term_extraction_runs run
          WHERE attempt.run_id = run.id
            AND run.status = 'running'
            AND attempt.status = 'running'
            AND attempt.provider_started_at IS NOT NULL
            AND attempt.claim_expires_at IS NOT NULL
            AND attempt.claim_expires_at <= $1
          RETURNING attempt.id, attempt.run_id`,
        [now, UNKNOWN_PROVIDER_CODE, UNKNOWN_PROVIDER_DETAIL],
      );
      const runIds = [...new Set(attempts.rows.map((row) => row.run_id))];
      let runs = 0;
      if (runIds.length > 0) {
        const runResult = await client.query(
          `UPDATE term_extraction_runs
              SET status = 'failed', error_code = $2, error_detail = $3,
                  completed_at = CURRENT_TIMESTAMP, claimed_by = NULL, claim_expires_at = NULL
            WHERE id = ANY($1::uuid[]) AND status = 'running'`,
          [runIds, UNKNOWN_PROVIDER_CODE, UNKNOWN_PROVIDER_DETAIL],
        );
        runs = runResult.rowCount ?? 0;
      }
      await client.query('COMMIT');
      return { attempts: attempts.rowCount, runs };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async begin(input: {
    projectId: string;
    sourceDigest: string;
    promptVersion: string;
    adapter: string;
    adapterConfig: Record<string, unknown>;
    idempotencyKey: string;
    requestHash: string;
    requestId: string;
    routeSnapshot?: TermsRouteSnapshot;
    routeResolver?: (client: PoolClient) => Promise<TermsRouteSnapshot>;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`term-extraction:${input.projectId}`]);
      const commandResult = await client.query<CommandRow>(
        `SELECT request_hash, run_id FROM term_extraction_commands
          WHERE project_id = $1 AND idempotency_key = $2`,
        [input.projectId, input.idempotencyKey],
      );
      const command = commandResult.rows[0];
      if (command) {
        if (command.request_hash !== input.requestHash) {
          throw termConflict('TERM_IDEMPOTENCY_KEY_REUSED', '该幂等键已用于另一术语提取请求。', 'retry_with_new_idempotency_key');
        }
        const run = await loadRun(client, command.run_id);
        const draft = run?.draftId ? await loadDraft(client, run.draftId) : null;
        await client.query('COMMIT');
        return { run: run!, draft, replay: true };
      }
      const running = await client.query<{ id: string }>(
        `SELECT id FROM term_extraction_runs
          WHERE project_id = $1 AND source_srt_set_digest = $2 AND status = 'running'
          LIMIT 1`,
        [input.projectId, input.sourceDigest],
      );
      if (running.rows[0]) {
        throw termConflict('TERM_EXTRACTION_RUNNING', '当前公司 SRT 的术语提取仍在运行，请稍后读取结果。', 'wait_for_extraction');
      }
      const active = await client.query<{ source_srt_set_digest: string }>(
        `SELECT source_srt_set_digest FROM term_drafts
          WHERE project_id = $1 AND status = 'active' FOR UPDATE`,
        [input.projectId],
      );
      if (active.rows[0]?.source_srt_set_digest === input.sourceDigest) {
        throw termConflict(
          'TERM_EXTRACTION_ACTIVE_DRAFT_EXISTS',
          '当前公司 SRT 已有活动术语草稿，请继续裁决或先确认版本。',
          'open_active_draft',
        );
      }
      const routeSnapshot = input.routeResolver
        ? await input.routeResolver(client)
        : input.routeSnapshot ?? null;
      const primaryTarget = routeSnapshot?.targets[0];
      const adapter = primaryTarget?.adapterKey ?? input.adapter;
      const adapterConfig = primaryTarget?.adapterConfig ?? input.adapterConfig;
      const runResult = await client.query<RunRow>(
        `INSERT INTO term_extraction_runs
           (project_id, source_srt_set_digest, prompt_version, adapter, adapter_config,
            request_id, routing_version_id, route_digest, config_digest, route_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [input.projectId, input.sourceDigest, input.promptVersion, adapter,
          JSON.stringify(adapterConfig), input.requestId,
          routeSnapshot?.routingVersionId ?? null, routeSnapshot?.routeDigest ?? null,
          routeSnapshot?.configDigest ?? null, routeSnapshot ? JSON.stringify(routeSnapshot) : null],
      );
      const run = toRun(runResult.rows[0]!);
      if (routeSnapshot) {
        for (const target of routeSnapshot.targets) {
          await client.query(
            `INSERT INTO term_extraction_attempts
               (run_id, routing_target_id, deployment_version_id, routing_version_id, priority, role,
                adapter, adapter_config, config_digest, route_digest, secret_reference_version_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [run.id, target.routingTargetId, target.deploymentVersionId, target.routingVersionId,
              target.priority, target.role, target.adapterKey, JSON.stringify(target.adapterConfig),
              target.configDigest, routeSnapshot.routeDigest, target.secretReferenceVersionId],
          );
        }
      }
      await client.query(
        `INSERT INTO term_extraction_commands
           (project_id, idempotency_key, request_hash, run_id)
         VALUES ($1, $2, $3, $4)`,
        [input.projectId, input.idempotencyKey, input.requestHash, run.id],
      );
      await client.query('COMMIT');
      return { run, draft: null, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** 按 run 创建时的 priority 串行领取下一个预固化 target。 */
  async claimAttempt(input: { workerId: string; leaseMs: number; now?: Date }): Promise<TermExtractionAttemptClaim | null> {
    const client = await this.pool.connect();
    const now = input.now ?? new Date();
    try {
      await client.query('BEGIN');
      const candidate = await client.query<{ id: string }>(
        `SELECT attempt.id
           FROM term_extraction_attempts attempt
           JOIN term_extraction_runs run ON run.id = attempt.run_id
          WHERE run.status = 'running'
            AND attempt.status IN ('queued','running')
            AND attempt.provider_started_at IS NULL
            AND (attempt.claimed_by IS NULL OR attempt.claim_expires_at <= $1)
            AND NOT EXISTS (
              SELECT 1 FROM term_extraction_attempts prior
               WHERE prior.run_id = attempt.run_id
                 AND (prior.priority < attempt.priority
                   OR (prior.priority = attempt.priority AND prior.routing_target_id < attempt.routing_target_id))
                 AND prior.status IN ('queued','running')
            )
          ORDER BY run.created_at, run.id, attempt.priority, attempt.routing_target_id
          LIMIT 1
          FOR UPDATE OF attempt SKIP LOCKED`,
        [now],
      );
      const id = candidate.rows[0]?.id;
      if (!id) {
        await client.query('COMMIT');
        return null;
      }
      const attemptResult = await client.query<TermExtractionAttemptRow>(
        `UPDATE term_extraction_attempts
            SET status = 'running', claimed_by = $2, claim_expires_at = $3
          WHERE id = $1 AND status IN ('queued','running')
          RETURNING *`,
        [id, input.workerId, new Date(now.getTime() + input.leaseMs)],
      );
      const attempt = attemptResult.rows[0];
      if (!attempt) {
        await client.query('COMMIT');
        return null;
      }
      const runResult = await client.query<RunRow>(
        `UPDATE term_extraction_runs
            SET claimed_by = $2, claim_expires_at = $3
          WHERE id = $1 AND status = 'running'
          RETURNING *`,
        [attempt.run_id, input.workerId, new Date(now.getTime() + input.leaseMs)],
      );
      if (!runResult.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      await client.query('COMMIT');
      return { run: runResult.rows[0], attempt };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markAttemptProviderStarted(input: { runId: string; attemptId: string; workerId: string; now?: Date }) {
    const result = await this.pool.query(
      `UPDATE term_extraction_attempts
          SET provider_started_at = $4
        WHERE id = $1 AND run_id = $2 AND status = 'running' AND claimed_by = $3
          AND provider_started_at IS NULL`,
      [input.attemptId, input.runId, input.workerId, input.now ?? new Date()],
    );
    return result.rowCount === 1;
  }

  async claim(input: { workerId: string; leaseMs: number; now?: Date }) {
    const client = await this.pool.connect();
    const now = input.now ?? new Date();
    try {
      await client.query('BEGIN');
      const candidate = await client.query<{ id: string }>(
        `SELECT id FROM term_extraction_runs
          WHERE status = 'running'
            AND provider_started_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM term_extraction_attempts attempt WHERE attempt.run_id = term_extraction_runs.id)
            AND (claimed_by IS NULL OR claim_expires_at <= $1)
          ORDER BY created_at, id
          LIMIT 1
          FOR UPDATE SKIP LOCKED`,
        [now],
      );
      const id = candidate.rows[0]?.id;
      if (!id) {
        await client.query('COMMIT');
        return null;
      }
      const result = await client.query<RunRow>(
        `UPDATE term_extraction_runs
            SET claimed_by = $2, claim_expires_at = $3
          WHERE id = $1 AND status = 'running'
          RETURNING *`,
        [id, input.workerId, new Date(now.getTime() + input.leaseMs)],
      );
      await client.query('COMMIT');
      return result.rows[0] ?? null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markProviderStarted(input: { runId: string; workerId: string; now?: Date }) {
    const result = await this.pool.query(
      `UPDATE term_extraction_runs
          SET provider_started_at = $3
        WHERE id = $1 AND status = 'running' AND claimed_by = $2
          AND provider_started_at IS NULL`,
      [input.runId, input.workerId, input.now ?? new Date()],
    );
    return result.rowCount === 1;
  }

  async complete(input: {
    runId: string;
    projectId: string;
    sourceDigest: string;
    promptVersion: string;
    cues: ParsedTermCue[];
    candidates: ExtractedTermSeed[];
    diagnostics: string[];
    usageSummary: Record<string, number>;
    workerId?: string;
    attemptId?: string;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`term-extraction:${input.projectId}`]);
      const runResult = await client.query<RunRow>(
        `SELECT * FROM term_extraction_runs WHERE id = $1 AND project_id = $2 FOR UPDATE`,
        [input.runId, input.projectId],
      );
      const claimedRun = runResult.rows[0];
      if (claimedRun?.status !== 'running'
        || (input.workerId !== undefined && claimedRun.claimed_by !== input.workerId)) {
        throw new Error('术语提取运行已经结束或不属于当前 Worker。');
      }
      if (input.attemptId) {
        const attempt = await client.query(
          `UPDATE term_extraction_attempts
              SET status = 'succeeded', usage_summary = $3, completed_at = CURRENT_TIMESTAMP,
                  claimed_by = NULL, claim_expires_at = NULL
            WHERE id = $1 AND run_id = $2 AND status = 'running' AND claimed_by = $4
            RETURNING id`,
          [input.attemptId, input.runId, JSON.stringify(input.usageSummary), input.workerId ?? null],
        );
        if (!attempt.rows[0]) throw new Error('术语提取 attempt claim 已失效。');
      }
      await client.query(
        `UPDATE term_drafts SET status = 'superseded', updated_at = CURRENT_TIMESTAMP
          WHERE project_id = $1 AND status = 'active'`,
        [input.projectId],
      );
      await client.query(
        `INSERT INTO term_cues
           (id, project_id, source_srt_set_digest, asset_id, episode_number,
            cue_index, start_ms, end_ms, text)
         SELECT cue.id, $2, $3, cue.asset_id, cue.episode_number,
                cue.cue_index, cue.start_ms, cue.end_ms, cue.text
           FROM jsonb_to_recordset($1::jsonb) AS cue(
             id varchar(64), asset_id uuid, episode_number integer,
             cue_index integer, start_ms integer, end_ms integer, text text
           )
         ON CONFLICT (id) DO NOTHING`,
        [JSON.stringify(input.cues.map((cue) => ({
          id: cue.id,
          asset_id: cue.assetId,
          episode_number: cue.episodeNumber,
          cue_index: cue.cueIndex,
          start_ms: cue.startMs,
          end_ms: cue.endMs,
          text: cue.text,
        }))), input.projectId, input.sourceDigest],
      );
      const draftResult = await client.query<{ id: string }>(
        `INSERT INTO term_drafts (project_id, source_srt_set_digest, prompt_version)
         VALUES ($1, $2, $3) RETURNING id`,
        [input.projectId, input.sourceDigest, input.promptVersion],
      );
      const draftId = draftResult.rows[0]!.id;
      for (const seed of input.candidates) {
        const candidateResult = await client.query<{ id: string }>(
          `INSERT INTO term_candidates
             (draft_id, type, name, aliases, gender, note, origin, confidence)
           VALUES ($1,$2,$3,$4,$5,$6,'extracted',$7)
           RETURNING id`,
          [draftId, seed.type, seed.name, JSON.stringify(seed.aliases), seed.gender,
            seed.note, seed.confidence],
        );
        for (const cueId of seed.evidenceCueIds) {
          await client.query(
            `INSERT INTO term_evidence (candidate_id, cue_id) VALUES ($1, $2)`,
            [candidateResult.rows[0]!.id, cueId],
          );
        }
      }
      await client.query(
        `UPDATE term_extraction_runs
            SET draft_id = $2, status = 'completed', cue_count = $3, candidate_count = $4,
                diagnostics = $5, usage_summary = $6, completed_at = CURRENT_TIMESTAMP,
                claimed_by = NULL, claim_expires_at = NULL
          WHERE id = $1 AND ($7::text IS NULL OR claimed_by = $7)`,
        [input.runId, draftId, input.cues.length, input.candidates.length,
          JSON.stringify(input.diagnostics), JSON.stringify(input.usageSummary), input.workerId ?? null],
      );
      const run = await loadRun(client, input.runId);
      const draft = await loadDraft(client, draftId);
      await client.query('COMMIT');
      return { run: run!, draft: draft! };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async fail(runId: string, code: string, detail: string, workerId?: string) {
    const result = await this.pool.query<RunRow>(
      `UPDATE term_extraction_runs
          SET status = 'failed', error_code = $2, error_detail = $3, completed_at = CURRENT_TIMESTAMP,
              claimed_by = NULL, claim_expires_at = NULL
        WHERE id = $1 AND status = 'running' AND ($4::text IS NULL OR claimed_by = $4)
      RETURNING *`,
      [runId, code, detail, workerId ?? null],
    );
    return result.rows[0] ? toRun(result.rows[0]) : null;
  }

  async failAttempt(input: {
    runId: string;
    attemptId: string;
    workerId: string;
    code: string;
    detail: string;
    disposition: 'external_not_accepted' | 'stop' | 'unknown';
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const attempt = await client.query<TermExtractionAttemptRow>(
        `UPDATE term_extraction_attempts
            SET status = $4, error_code = $5, error_detail = $6, completed_at = CURRENT_TIMESTAMP,
                claimed_by = NULL, claim_expires_at = NULL
          WHERE id = $1 AND run_id = $2 AND status = 'running' AND claimed_by = $3
          RETURNING *`,
        [input.attemptId, input.runId, input.workerId,
          input.disposition === 'unknown' ? 'unknown' : 'failed', input.code, input.detail],
      );
      if (!attempt.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      const next = input.disposition === 'external_not_accepted'
        ? await client.query<{ id: string }>(
          `SELECT id FROM term_extraction_attempts
            WHERE run_id = $1 AND status = 'queued'
            ORDER BY priority, routing_target_id LIMIT 1`, [input.runId])
        : { rows: [] as { id: string }[] };
      const shouldFallback = input.disposition === 'external_not_accepted' && next.rows.length > 0;
      const runResult = await client.query<RunRow>(
        `UPDATE term_extraction_runs
            SET status = CASE WHEN $2::boolean THEN 'running'::term_extraction_status ELSE 'failed'::term_extraction_status END,
                error_code = CASE WHEN $2::boolean THEN NULL ELSE $3 END,
                error_detail = CASE WHEN $2::boolean THEN NULL ELSE $4 END,
                completed_at = CASE WHEN $2::boolean THEN NULL ELSE CURRENT_TIMESTAMP END,
                claimed_by = NULL, claim_expires_at = NULL
          WHERE id = $1 AND status = 'running'
          RETURNING *`,
        [input.runId, shouldFallback, input.code, input.detail],
      );
      await client.query('COMMIT');
      return { run: runResult.rows[0] ? toRun(runResult.rows[0]) : null, attempt: attempt.rows[0], shouldFallback };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
