import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import type { ParsedTermCue } from './srt-parser.js';
import type { ExtractedTermSeed } from './term-extraction.js';
import { termConflict } from './term-errors.js';
import { draftColumns, type DraftRow, type RunRow, toDraft, toRun } from './term-mappers.js';

interface CommandRow extends QueryResultRow {
  request_hash: string;
  run_id: string;
}

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

  async begin(input: {
    projectId: string;
    sourceDigest: string;
    promptVersion: string;
    adapter: string;
    adapterConfig: Record<string, unknown>;
    idempotencyKey: string;
    requestHash: string;
    requestId: string;
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
      const runResult = await client.query<RunRow>(
        `INSERT INTO term_extraction_runs
           (project_id, source_srt_set_digest, prompt_version, adapter, adapter_config, request_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [input.projectId, input.sourceDigest, input.promptVersion, input.adapter,
          JSON.stringify(input.adapterConfig), input.requestId],
      );
      const run = toRun(runResult.rows[0]!);
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

  async complete(input: {
    runId: string;
    projectId: string;
    sourceDigest: string;
    promptVersion: string;
    cues: ParsedTermCue[];
    candidates: ExtractedTermSeed[];
    diagnostics: string[];
    usageSummary: Record<string, number>;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`term-extraction:${input.projectId}`]);
      const runResult = await client.query<RunRow>(
        `SELECT * FROM term_extraction_runs WHERE id = $1 AND project_id = $2 FOR UPDATE`,
        [input.runId, input.projectId],
      );
      if (runResult.rows[0]?.status !== 'running') throw new Error('术语提取运行已经结束。');
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
                diagnostics = $5, usage_summary = $6, completed_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [input.runId, draftId, input.cues.length, input.candidates.length,
          JSON.stringify(input.diagnostics), JSON.stringify(input.usageSummary)],
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

  async fail(runId: string, code: string, detail: string) {
    const result = await this.pool.query<RunRow>(
      `UPDATE term_extraction_runs
          SET status = 'failed', error_code = $2, error_detail = $3, completed_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'running'
      RETURNING *`,
      [runId, code, detail],
    );
    return result.rows[0] ? toRun(result.rows[0]) : null;
  }
}
