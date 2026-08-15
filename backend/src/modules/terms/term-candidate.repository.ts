import type {
  CreateManualTermCandidateBody,
  TermCandidateDecisionBody,
  TermCandidateDetail,
  TermCandidateQuery,
  TermDecisionEvent,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import { termConflict, termInvalid, termNotFound } from './term-errors.js';
import {
  candidateColumns,
  candidateEvidenceJoin,
  type CandidateRow,
  draftColumns,
  type DraftRow,
  toCandidate,
  toDraft,
} from './term-mappers.js';
import { assertWritableTermDraft } from './term-write-guard.js';

interface DecisionEventRow extends QueryResultRow {
  id: string;
  action: TermDecisionEvent['action'];
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown>;
  actor: string | null;
  created_at: Date;
}

const candidateSnapshot = (row: CandidateRow) => ({
  type: row.type,
  name: row.name,
  aliases: row.aliases,
  gender: row.gender,
  note: row.note,
  status: row.status,
  version: row.version,
});

const loadCandidateRow = async (client: PoolClient, candidateId: string) => {
  const result = await client.query<CandidateRow>(
    `SELECT ${candidateColumns}
       FROM term_candidates candidate
       ${candidateEvidenceJoin}
      WHERE candidate.id = $1`,
    [candidateId],
  );
  return result.rows[0] ?? null;
};

const loadDraftRow = async (client: PoolClient, draftId: string) => {
  const result = await client.query<DraftRow>(
    `SELECT ${draftColumns}
       FROM term_drafts draft
       LEFT JOIN term_candidates candidate ON candidate.draft_id = draft.id
      WHERE draft.id = $1
      GROUP BY draft.id`,
    [draftId],
  );
  return result.rows[0] ?? null;
};

const normalizeAliases = (aliases: string[]) => [...new Set(aliases.map((item) => item.trim()).filter(Boolean))];
const duplicateCandidateMessage = '同一草稿中已存在相同中文术语的候选。';

export class TermCandidateRepository {
  constructor(private readonly pool: DatabasePool) {}

  async list(projectId: string, input: TermCandidateQuery) {
    const values: unknown[] = [input.draftId, projectId];
    const predicates = ['candidate.draft_id = $1', 'candidate_draft.project_id = $2'];
    if (input.search) {
      values.push(`%${input.search}%`);
      predicates.push(`(candidate.name ILIKE $${values.length}
        OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(candidate.aliases) alias WHERE alias ILIKE $${values.length}))`);
    }
    if (input.status) {
      values.push(input.status);
      predicates.push(`candidate.status = $${values.length}`);
    }
    if (input.type) {
      values.push(input.type);
      predicates.push(`candidate.type = $${values.length}`);
    }
    const sortColumn = {
      firstEvidence: 'evidence_summary.episode_number',
      name: 'lower(candidate.name)',
      type: `CASE candidate.type
        WHEN '人名' THEN 1 WHEN '地名' THEN 2 WHEN '特定物品' THEN 3 WHEN '朝代' THEN 4
        WHEN '组织名' THEN 5 WHEN '等级' THEN 6 WHEN '物种/种族名' THEN 7 ELSE 8 END`,
      status: `CASE candidate.status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 WHEN 'edited' THEN 3 ELSE 4 END`,
      updatedAt: 'candidate.updated_at',
    }[input.sortBy ?? 'firstEvidence'];
    const direction = input.sortDirection === 'desc' ? 'DESC' : 'ASC';
    values.push(Number(input.limit ?? 50), Number(input.offset ?? 0));
    const result = await this.pool.query<CandidateRow>(
      `SELECT ${candidateColumns}, COUNT(*) OVER() AS total_count
         FROM term_candidates candidate
         JOIN term_drafts candidate_draft ON candidate_draft.id = candidate.draft_id
         ${candidateEvidenceJoin}
        WHERE ${predicates.join(' AND ')}
        ORDER BY ${sortColumn} ${direction},
                 evidence_summary.episode_number ${direction},
                 evidence_summary.cue_index ${direction}, candidate.id ASC
        LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return { items: result.rows.map(toCandidate), total: Number(result.rows[0]?.total_count ?? 0) };
  }

  async detail(projectId: string, candidateId: string): Promise<TermCandidateDetail> {
    const client = await this.pool.connect();
    try {
      const row = await loadCandidateRow(client, candidateId);
      if (!row) throw termNotFound('TERM_CANDIDATE_NOT_FOUND', '术语候选不存在。');
      const owner = await client.query<{ project_id: string }>('SELECT project_id FROM term_drafts WHERE id = $1', [row.draft_id]);
      if (owner.rows[0]?.project_id !== projectId) throw termNotFound('TERM_CANDIDATE_NOT_FOUND', '术语候选不存在。');
      const evidenceResult = await client.query<{
        cue_id: string; asset_id: string; episode_number: number; cue_index: number;
        start_ms: number; end_ms: number; text: string;
      }>(
        `SELECT cue.id AS cue_id, cue.asset_id, cue.episode_number, cue.cue_index,
                cue.start_ms, cue.end_ms, cue.text
           FROM term_evidence evidence
           JOIN term_cues cue ON cue.id = evidence.cue_id
          WHERE evidence.candidate_id = $1
          ORDER BY cue.episode_number, cue.cue_index, cue.id`,
        [candidateId],
      );
      const eventResult = await client.query<DecisionEventRow>(
        `SELECT id, action, before_state, after_state, actor, created_at
           FROM term_decision_events WHERE candidate_id = $1 ORDER BY id`,
        [candidateId],
      );
      return {
        ...toCandidate(row),
        evidence: evidenceResult.rows.map((item) => ({
          cueId: item.cue_id,
          assetId: item.asset_id,
          episodeNumber: item.episode_number,
          cueIndex: item.cue_index,
          startMs: item.start_ms,
          endMs: item.end_ms,
          text: item.text,
        })),
        decisionEvents: eventResult.rows.map((event) => ({
          id: Number(event.id),
          action: event.action,
          before: event.before_state,
          after: event.after_state,
          actor: event.actor,
          createdAt: event.created_at.toISOString(),
        })),
      };
    } finally {
      client.release();
    }
  }

  async decide(projectId: string, candidateId: string, body: TermCandidateDecisionBody, actor: string | null) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const owner = await client.query<{ draft_id: string; project_id: string }>(
        `SELECT candidate.draft_id, draft.project_id
           FROM term_candidates candidate
           JOIN term_drafts draft ON draft.id = candidate.draft_id
          WHERE candidate.id = $1`,
        [candidateId],
      );
      if (!owner.rows[0] || owner.rows[0].project_id !== projectId) {
        throw termNotFound('TERM_CANDIDATE_NOT_FOUND', '术语候选不存在。');
      }
      await assertWritableTermDraft(client, projectId, owner.rows[0].draft_id);
      const candidateResult = await client.query<CandidateRow>(
        `SELECT candidate.*, '0' AS evidence_count, '' AS cue_id, gen_random_uuid() AS asset_id,
                1 AS episode_number, 1 AS cue_index, 0 AS start_ms, 1 AS end_ms, '' AS cue_text
           FROM term_candidates candidate WHERE candidate.id = $1 FOR UPDATE`,
        [candidateId],
      );
      const current = candidateResult.rows[0];
      if (!current) throw termNotFound('TERM_CANDIDATE_NOT_FOUND', '术语候选不存在。');
      if (current.version !== body.expectedVersion) {
        throw termConflict('TERM_CANDIDATE_VERSION_CONFLICT', '候选已被其他操作更新，请刷新后重试。');
      }
      const transitionAllowed = body.action === 'approve' || body.action === 'reject'
        ? current.status === 'pending'
        : body.action === 'restore'
          ? current.status === 'rejected'
          : current.status !== 'rejected';
      if (!transitionAllowed) {
        throw termConflict(
          'TERM_CANDIDATE_STATE_INVALID',
          `候选当前状态 ${current.status} 不允许执行 ${body.action}。`,
        );
      }
      const nextType = body.action === 'edit' && body.type ? body.type : current.type;
      const next = {
        type: nextType,
        name: body.action === 'edit' && body.name ? body.name.trim() : current.name,
        aliases: body.action === 'edit' && body.aliases ? normalizeAliases(body.aliases) : current.aliases,
        gender: nextType === '人名'
          ? (body.action === 'edit' && body.gender ? body.gender : current.gender)
          : 'unknown',
        note: body.action === 'edit' && body.note !== undefined ? body.note.trim() : current.note,
        status: body.action === 'approve' ? 'approved'
          : body.action === 'edit' ? 'edited'
            : body.action === 'reject' ? 'rejected' : 'pending',
      } as const;
      if (!next.name) throw termInvalid('TERM_CANDIDATE_INVALID', '中文术语不能为空。', 'edit_candidate');
      const updated = await client.query(
        `UPDATE term_candidates
            SET type = $2, name = $3, aliases = $4, gender = $5, note = $6,
                status = $7, version = version + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [candidateId, next.type, next.name, JSON.stringify(next.aliases), next.gender, next.note, next.status],
      );
      if (updated.rowCount !== 1) throw new Error('术语候选更新失败。');
      const afterResult = await client.query<CandidateRow>('SELECT * FROM term_candidates WHERE id = $1', [candidateId]);
      const after = afterResult.rows[0]!;
      const action = body.action === 'approve' ? 'approved'
        : body.action === 'edit' ? 'edited'
          : body.action === 'reject' ? 'rejected' : 'restored';
      await client.query(
        `INSERT INTO term_decision_events
           (candidate_id, draft_id, action, before_state, after_state, actor)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [candidateId, current.draft_id, action, JSON.stringify(candidateSnapshot(current)),
          JSON.stringify(candidateSnapshot(after)), actor],
      );
      await client.query(
        `UPDATE term_drafts SET revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [current.draft_id],
      );
      const saved = await loadCandidateRow(client, candidateId);
      await client.query('COMMIT');
      return toCandidate(saved!);
    } catch (error) {
      await client.query('ROLLBACK');
      if ((error as { code?: string }).code === '23505') {
        throw termConflict('TERM_CANDIDATE_INVALID', duplicateCandidateMessage, 'edit_candidate');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async createManual(projectId: string, body: CreateManualTermCandidateBody, actor: string | null) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const draft = await assertWritableTermDraft(client, projectId, body.draftId);
      if (draft.revision !== body.expectedDraftRevision) {
        throw termConflict('TERM_DRAFT_VERSION_CONFLICT', '草稿已被其他操作更新，请刷新后重试。');
      }
      const normalizedName = body.name.trim();
      if (!normalizedName) {
        throw termInvalid('TERM_CANDIDATE_INVALID', '中文术语不能为空。', 'edit_candidate');
      }
      const cues = await client.query<{ id: string }>(
        `SELECT id FROM term_cues
          WHERE project_id = $1 AND source_srt_set_digest = $2 AND id = ANY($3::varchar[])`,
        [projectId, draft.source_srt_set_digest, body.evidenceCueIds],
      );
      if (cues.rowCount !== new Set(body.evidenceCueIds).size) {
        throw termInvalid('TERM_CANDIDATE_INVALID', '人工新增候选必须引用当前公司 SRT 的真实证据。', 'select_evidence');
      }
      const created = await client.query<{ id: string }>(
        `INSERT INTO term_candidates
           (draft_id, type, name, aliases, gender, note, origin, status)
         VALUES ($1,$2,$3,$4,$5,$6,'manual','edited') RETURNING id`,
        [body.draftId, body.type, normalizedName, JSON.stringify(normalizeAliases(body.aliases)),
          body.type === '人名' ? body.gender : 'unknown', body.note.trim()],
      );
      const candidateId = created.rows[0]!.id;
      for (const cueId of new Set(body.evidenceCueIds)) {
        await client.query('INSERT INTO term_evidence (candidate_id, cue_id) VALUES ($1,$2)', [candidateId, cueId]);
      }
      const saved = await loadCandidateRow(client, candidateId);
      await client.query(
        `INSERT INTO term_decision_events
           (candidate_id, draft_id, action, before_state, after_state, actor)
         VALUES ($1,$2,'added',NULL,$3,$4)`,
        [candidateId, body.draftId, JSON.stringify(candidateSnapshot(saved!)), actor],
      );
      await client.query(
        `UPDATE term_drafts SET revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [body.draftId],
      );
      await client.query('COMMIT');
      return toCandidate(saved!);
    } catch (error) {
      await client.query('ROLLBACK');
      if ((error as { code?: string }).code === '23505') {
        throw termConflict('TERM_CANDIDATE_INVALID', duplicateCandidateMessage, 'edit_candidate');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async getDraft(draftId: string) {
    const client = await this.pool.connect();
    try {
      const row = await loadDraftRow(client, draftId);
      return row ? toDraft(row) : null;
    } finally {
      client.release();
    }
  }
}
