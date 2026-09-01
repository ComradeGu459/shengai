import type { PreEditCue } from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import {
  alignEpisode,
  effectiveSystemDecision,
  normalizePreEditText,
  scanFormatIssues,
  type AlignmentCue,
} from './pre-review.domain.js';

interface PrepareJobRow extends QueryResultRow {
  id: string;
  session_id: string;
}

interface EpisodeRow extends QueryResultRow {
  id: string;
  episode_number: number;
  company_asset_id: string;
  asr_result_id: string | null;
  asr_quality_status: 'pass' | 'warning' | null;
  video_duration_ms: string | null;
}

interface TermItemRow extends QueryResultRow {
  id: string;
  type: string;
  name: string;
  aliases: string[];
}

interface CueRow extends QueryResultRow {
  id: string;
  cue_index: number;
  start_ms: number;
  end_ms: number;
  text: string;
  confidence: string | null;
}

const mapCue = (row: CueRow): AlignmentCue => ({
  cueId: row.id,
  cueIndex: row.cue_index,
  startMs: row.start_ms,
  endMs: row.end_ms,
  text: row.text,
  confidence: row.confidence === null ? null : Number(row.confidence),
});

export class PreReviewWorkerRepository {
  constructor(private readonly pool: DatabasePool) {}

  async claim(workerId: string, leaseMs: number): Promise<PrepareJobRow | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<PrepareJobRow>(
        `SELECT id, session_id
           FROM pre_edit_prepare_jobs
          WHERE status = 'queued' OR (status = 'leased' AND lease_expires_at <= CURRENT_TIMESTAMP)
          ORDER BY created_at, id
          FOR UPDATE SKIP LOCKED
          LIMIT 1`,
      );
      const job = result.rows[0];
      if (!job) {
        await client.query('COMMIT');
        return null;
      }
      await client.query(
        `UPDATE pre_edit_prepare_jobs
            SET status = 'leased', lease_owner = $2,
                lease_expires_at = CURRENT_TIMESTAMP + ($3 * interval '1 millisecond'),
                attempt_count = attempt_count + 1, error_code = NULL, error_detail = NULL,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [job.id, workerId, leaseMs],
      );
      await client.query('COMMIT');
      return job;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async loadCues(client: PoolClient, episode: EpisodeRow, sourceDigest: string) {
    const company = await client.query<CueRow>(
      `SELECT id, cue_index, start_ms, end_ms, text, NULL::text AS confidence
         FROM term_cues
        WHERE source_srt_set_digest = $1 AND asset_id = $2 AND episode_number = $3
        ORDER BY cue_index, id`,
      [sourceDigest, episode.company_asset_id, episode.episode_number],
    );
    const asr = episode.asr_result_id ? await client.query<CueRow>(
      `SELECT id::text AS id, cue_index, start_ms, end_ms, text, confidence::text AS confidence
         FROM asr_cues WHERE result_id = $1 ORDER BY cue_index, id`,
      [episode.asr_result_id],
    ) : { rows: [] as CueRow[] };
    return { company: company.rows.map(mapCue), asr: asr.rows.map(mapCue) };
  }

  async failOwnedLease(jobId: string, workerId: string, detail: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const failed = await client.query<{ session_id: string }>(
        `UPDATE pre_edit_prepare_jobs
            SET status = 'failed', lease_owner = NULL, lease_expires_at = NULL,
                error_code = 'PRE_EDIT_PREPARATION_FAILED', error_detail = $3,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status = 'leased' AND lease_owner = $2
          RETURNING session_id`,
        [jobId, workerId, detail],
      );
      if (!failed.rows[0]) {
        await client.query('COMMIT');
        return false;
      }
      await client.query(
        `UPDATE pre_edit_sessions
            SET status = 'failed', error_code = 'PRE_EDIT_PREPARATION_FAILED', error_detail = $2,
                revision = revision + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status IN ('preparing', 'failed')`,
        [failed.rows[0].session_id, detail],
      );
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async prepare(jobId: string, workerId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const job = await client.query<PrepareJobRow & { status: string; lease_owner: string | null }>(
        'SELECT id, session_id, status, lease_owner FROM pre_edit_prepare_jobs WHERE id = $1 FOR UPDATE',
        [jobId],
      );
      const currentJob = job.rows[0];
      if (!currentJob || currentJob.status === 'completed') {
        await client.query('COMMIT');
        return false;
      }
      if (currentJob.status !== 'leased' || currentJob.lease_owner !== workerId) {
        await client.query('ROLLBACK');
        return false;
      }
      const session = await client.query<{ source_srt_set_digest: string; term_version_id: string; strategy_version_id: string | null; status: string }>(
        'SELECT source_srt_set_digest, term_version_id, strategy_version_id, status FROM pre_edit_sessions WHERE id = $1 FOR UPDATE',
        [currentJob.session_id],
      );
      if (!session.rows[0] || !['preparing', 'failed'].includes(session.rows[0].status)) {
        await client.query('ROLLBACK');
        return false;
      }
      if (!session.rows[0].strategy_version_id) throw new Error('前置审改会话缺少已绑定策略版本。');
      const strategy = await client.query<{ rule_pack: Record<string, unknown> }>(
        `SELECT v.payload AS rule_pack FROM strategy_artifact_versions v JOIN strategy_artifacts a ON a.id=v.artifact_id WHERE v.id = $1 AND a.runtime_module='pre_review' AND v.runtime_status IN ('active','retired','approved') FOR SHARE`,
        [session.rows[0].strategy_version_id],
      );
      if (!strategy.rows[0]) throw new Error('前置审改会话绑定的策略版本不可读取。');
      const rulePack = strategy.rows[0].rule_pack as any;
      const episodes = await client.query<EpisodeRow>(
        `SELECT id, episode_number, company_asset_id, asr_result_id, asr_quality_status,
                video_duration_ms::text
           FROM pre_edit_episodes WHERE session_id = $1 ORDER BY episode_number FOR UPDATE`,
        [currentJob.session_id],
      );
      const terms = await client.query<TermItemRow>(
        `SELECT id, type::text, name, aliases
           FROM term_version_items WHERE term_version_id = $1
          ORDER BY type, first_episode_number, first_cue_index, id`,
        [session.rows[0].term_version_id],
      );
      for (const episode of episodes.rows) {
        const cues = await this.loadCues(client, episode, session.rows[0].source_srt_set_digest);
        if (!cues.company.length) throw new Error(`第 ${episode.episode_number} 集缺少公司稿 Cue。`);
        const groups = alignEpisode(cues.company, cues.asr, rulePack);
        for (const group of groups) {
          const insertedGroup = await client.query<{ id: string }>(
            `INSERT INTO pre_edit_alignment_groups (
               session_id, episode_id, kind, company_cue_ids, asr_cue_ids,
               time_overlap_ms, text_similarity, algorithm_version, digest
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
              currentJob.session_id, episode.id, group.kind,
              group.companyCues.map((cue) => cue.cueId), group.asrCues.map((cue) => cue.cueId),
              group.timeOverlapMs, group.textSimilarity, `pre-review-rule-pack:${session.rows[0].strategy_version_id}`, group.digest,
            ],
          );
          const targets: Array<AlignmentCue | null> = group.companyCues.length ? group.companyCues : [null];
          for (const target of targets) {
            const system = effectiveSystemDecision({
              kind: group.kind,
              policy: 'company_primary',
              companyCue: target,
              asrCues: group.asrCues,
            });
            const timing = target ?? group.asrCues[0] ?? null;
            const companyText = group.companyCues.map((cue) => cue.text).join(' ');
            const asrText = group.asrCues.map((cue) => cue.text).join(' ');
            const normalizedCompany = normalizePreEditText(companyText);
            const normalizedAsr = normalizePreEditText(asrText);
            const termEvidence = terms.rows.flatMap((term) => {
              const forms = [...new Set([term.name, ...term.aliases].filter(Boolean))];
              const companyMatched = forms.some((form) => normalizedCompany.includes(normalizePreEditText(form)));
              const asrMatched = forms.some((form) => normalizedAsr.includes(normalizePreEditText(form)));
              if (!companyMatched && !asrMatched) return [];
              return [{
                termItemId: term.id, type: term.type, name: term.name,
                matchedForms: forms.filter((form) => normalizedCompany.includes(normalizePreEditText(form))
                  || normalizedAsr.includes(normalizePreEditText(form))),
                companyMatched, asrMatched, conflict: companyMatched !== asrMatched,
              }];
            });
            const issues = scanFormatIssues(system.text, rulePack, timing ? {
              startMs: timing.startMs,
              endMs: target?.endMs ?? group.asrCues.at(-1)!.endMs,
              videoDurationMs: episode.video_duration_ms === null ? null : Number(episode.video_duration_ms),
            } : undefined);
            const requiresReview = episode.asr_result_id
              ? group.kind !== 'one_to_one' || group.textSimilarity < 0.99999
                || episode.asr_quality_status === 'warning' || issues.some((issue) => issue.blocking)
                || termEvidence.some((evidence) => evidence.conflict)
              : issues.some((issue) => issue.blocking);
            const item = await client.query<{ id: string }>(
              `INSERT INTO pre_edit_items (
                 session_id, episode_id, group_id, target_company_cue_id,
                 system_action, system_text, current_action, current_text,
                 decision_origin, requires_review, format_issues, term_evidence
               ) VALUES ($1, $2, $3, $4, $5, $6, $5, $6, 'system', $7, $8, $9)
               RETURNING id`,
              [
                currentJob.session_id, episode.id, insertedGroup.rows[0]!.id, target?.cueId ?? null,
                system.action, system.text, requiresReview, JSON.stringify(issues), JSON.stringify(termEvidence),
              ],
            );
            const event = await client.query<{ id: string }>(
              `INSERT INTO pre_edit_decision_events (
                 session_id, episode_id, item_id, event_kind, action, origin, before_state, after_state
               ) VALUES ($1, $2, $3, 'baseline', $4, 'system', '{}'::jsonb, $5)
               RETURNING id`,
              [
                currentJob.session_id, episode.id, item.rows[0]!.id, system.action,
                JSON.stringify({ action: system.action, text: system.text, formatOverrideReason: null }),
              ],
            );
            await client.query(
              'UPDATE pre_edit_items SET current_decision_event_id = $2 WHERE id = $1',
              [item.rows[0]!.id, event.rows[0]!.id],
            );
          }
        }
        await client.query(
          `UPDATE pre_edit_episodes
              SET status = $2, limited_reason = $3, revision = revision + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [
            episode.id,
            episode.asr_result_id ? 'ready' : 'limited',
            episode.asr_result_id ? null : '本集没有可用 ASR 结果，仅可执行公司稿格式审改。',
          ],
        );
      }
      const limited = episodes.rows.some((episode) => !episode.asr_result_id);
      await client.query(
        `UPDATE pre_edit_sessions
            SET status = $2, revision = revision + 1, error_code = NULL, error_detail = NULL,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [currentJob.session_id, limited ? 'limited' : 'ready'],
      );
      await client.query(
        `UPDATE pre_edit_prepare_jobs
            SET status = 'completed', lease_owner = NULL, lease_expires_at = NULL,
                error_code = NULL, error_detail = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [jobId],
      );
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      const detail = error instanceof Error ? error.message : String(error);
      await this.failOwnedLease(jobId, workerId, detail);
      return false;
    } finally {
      client.release();
    }
  }
}
