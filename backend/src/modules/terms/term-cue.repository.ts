import type { TermCue, TermCueQuery } from '@qimao-terms-cloud/contracts';
import type { QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import { termConflict, termNotFound } from './term-errors.js';

interface DraftRow extends QueryResultRow {
  project_id: string;
  source_srt_set_digest: string;
  status: 'active' | 'confirmed' | 'superseded';
}

interface CueRow extends QueryResultRow {
  cue_id: string;
  asset_id: string;
  episode_number: number;
  cue_index: number;
  start_ms: number;
  end_ms: number;
  text: string;
}

const toCue = (row: CueRow): TermCue => ({
  cueId: row.cue_id,
  assetId: row.asset_id,
  episodeNumber: row.episode_number,
  cueIndex: row.cue_index,
  startMs: row.start_ms,
  endMs: row.end_ms,
  text: row.text,
});

export class TermCueRepository {
  constructor(private readonly pool: DatabasePool) {}

  async list(projectId: string, input: TermCueQuery) {
    const client = await this.pool.connect();
    try {
      const draftResult = await client.query<DraftRow>(
        `SELECT project_id, source_srt_set_digest, status
           FROM term_drafts
          WHERE id = $1`,
        [input.draftId],
      );
      const draft = draftResult.rows[0];
      if (!draft || draft.project_id !== projectId) {
        throw termNotFound('TERM_DRAFT_NOT_FOUND', '术语草稿不存在。');
      }
      if (draft.status !== 'active') {
        throw termConflict('TERM_DRAFT_NOT_ACTIVE', '术语草稿已确认或失效。');
      }

      const values: unknown[] = [projectId, draft.source_srt_set_digest];
      const predicates = ['project_id = $1', 'source_srt_set_digest = $2'];
      if (input.search) {
        values.push(input.search);
        predicates.push(`position(lower($${values.length}) in lower(text)) > 0`);
      }
      if (input.episodeNumber !== undefined) {
        values.push(Number(input.episodeNumber));
        predicates.push(`episode_number = $${values.length}`);
      }

      const where = predicates.join(' AND ');
      const totalResult = await client.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM term_cues WHERE ${where}`,
        values,
      );
      values.push(Number(input.limit ?? 50), Number(input.offset ?? 0));
      const cueResult = await client.query<CueRow>(
        `SELECT id AS cue_id, asset_id, episode_number, cue_index, start_ms, end_ms, text
           FROM term_cues
          WHERE ${where}
          ORDER BY episode_number, cue_index, id
          LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      return { items: cueResult.rows.map(toCue), total: Number(totalResult.rows[0]!.total) };
    } finally {
      client.release();
    }
  }
}
