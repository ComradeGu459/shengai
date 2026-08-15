import type { TermVersion, TermVersionItem } from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import { termConflict, termNotFound } from './term-errors.js';
import {
  loadTermExport,
  loadTermExportTemplate,
  termExportStructureDigest,
} from './term-export.repository.js';
import { draftColumns, type DraftRow, toDraft, toVersionSummary, type VersionRow } from './term-mappers.js';
import { assertWritableTermDraft } from './term-write-guard.js';

interface VersionItemRow extends QueryResultRow {
  id: string;
  type: TermVersionItem['type'];
  name: string;
  aliases: string[];
  gender: TermVersionItem['gender'];
  note: string;
  first_episode_number: number;
  first_cue_index: number;
}

interface CommandRow extends QueryResultRow {
  request_hash: string;
  target_id: string;
}

const versionColumns = `
  version.id, version.project_id, version.version, version.source_srt_set_digest,
  version.prompt_version, version.created_at,
  COUNT(item.id) AS item_count
`;

const loadVersion = async (client: PoolClient, versionId: string): Promise<TermVersion | null> => {
  const result = await client.query<VersionRow>(
    `SELECT ${versionColumns}
       FROM term_versions version
       LEFT JOIN term_version_items item ON item.term_version_id = version.id
      WHERE version.id = $1
      GROUP BY version.id`,
    [versionId],
  );
  if (!result.rows[0]) return null;
  const itemResult = await client.query<VersionItemRow>(
    `SELECT id, type, name, aliases, gender, note, first_episode_number, first_cue_index
       FROM term_version_items WHERE term_version_id = $1 ORDER BY sort_order`,
    [versionId],
  );
  return {
    ...toVersionSummary(result.rows[0]),
    items: itemResult.rows.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      aliases: item.aliases,
      gender: item.gender,
      note: item.note,
      firstEpisodeNumber: item.first_episode_number,
      firstCueIndex: item.first_cue_index,
    })),
  };
};

export class TermVersionRepository {
  constructor(private readonly pool: DatabasePool) {}

  async createDraftFromVersion(input: {
    projectId: string;
    baseVersionId: string;
    sourceDigest: string;
    idempotencyKey: string;
    requestHash: string;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`term-draft:${input.projectId}`]);
      const commandResult = await client.query<CommandRow>(
        `SELECT request_hash, draft_id AS target_id FROM term_draft_commands
          WHERE project_id = $1 AND idempotency_key = $2`,
        [input.projectId, input.idempotencyKey],
      );
      const command = commandResult.rows[0];
      if (command) {
        if (command.request_hash !== input.requestHash) {
          throw termConflict('TERM_IDEMPOTENCY_KEY_REUSED', '该幂等键已用于另一草稿命令。', 'retry_with_new_idempotency_key');
        }
        const replay = await client.query<DraftRow>(
          `SELECT ${draftColumns} FROM term_drafts draft
            LEFT JOIN term_candidates candidate ON candidate.draft_id = draft.id
           WHERE draft.id = $1 GROUP BY draft.id`,
          [command.target_id],
        );
        await client.query('COMMIT');
        return { draft: toDraft(replay.rows[0]!), replay: true };
      }
      const base = await client.query<{ source_srt_set_digest: string; prompt_version: string }>(
        `SELECT source_srt_set_digest, prompt_version FROM term_versions
          WHERE id = $1 AND project_id = $2`,
        [input.baseVersionId, input.projectId],
      );
      if (!base.rows[0]) throw termNotFound('TERM_VERSION_NOT_FOUND', '术语版本不存在。');
      if (base.rows[0].source_srt_set_digest !== input.sourceDigest) {
        throw termConflict('TERM_SOURCE_CHANGED', '公司 SRT 已变化，不能从旧来源版本直接建立草稿。', 'start_extraction');
      }
      const active = await client.query('SELECT id FROM term_drafts WHERE project_id = $1 AND status = \'active\'', [input.projectId]);
      if (active.rowCount) throw termConflict('TERM_DRAFT_NOT_ACTIVE', '项目已有活动术语草稿。', 'open_active_draft');
      const draftResult = await client.query<{ id: string }>(
        `INSERT INTO term_drafts
           (project_id, source_srt_set_digest, prompt_version, base_term_version_id)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [input.projectId, input.sourceDigest, base.rows[0].prompt_version, input.baseVersionId],
      );
      const draftId = draftResult.rows[0]!.id;
      const items = await client.query<{
        source_candidate_id: string; type: string; name: string; aliases: string[];
        gender: string; note: string; origin: string; confidence: string | null;
      }>(
        `SELECT item.source_candidate_id, item.type, item.name, item.aliases,
                item.gender, item.note, candidate.origin, candidate.confidence
           FROM term_version_items item
           JOIN term_candidates candidate ON candidate.id = item.source_candidate_id
          WHERE item.term_version_id = $1 ORDER BY item.sort_order`,
        [input.baseVersionId],
      );
      for (const item of items.rows) {
        const candidate = await client.query<{ id: string }>(
          `INSERT INTO term_candidates
             (draft_id, type, name, aliases, gender, note, origin, confidence, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'approved') RETURNING id`,
          [draftId, item.type, item.name, JSON.stringify(item.aliases), item.gender,
            item.note, item.origin, item.confidence],
        );
        await client.query(
          `INSERT INTO term_evidence (candidate_id, cue_id)
           SELECT $1, cue_id FROM term_evidence WHERE candidate_id = $2`,
          [candidate.rows[0]!.id, item.source_candidate_id],
        );
      }
      await client.query(
        `INSERT INTO term_draft_commands
           (project_id, idempotency_key, request_hash, draft_id)
         VALUES ($1,$2,$3,$4)`,
        [input.projectId, input.idempotencyKey, input.requestHash, draftId],
      );
      const saved = await client.query<DraftRow>(
        `SELECT ${draftColumns} FROM term_drafts draft
          LEFT JOIN term_candidates candidate ON candidate.draft_id = draft.id
         WHERE draft.id = $1 GROUP BY draft.id`,
        [draftId],
      );
      await client.query('COMMIT');
      return { draft: toDraft(saved.rows[0]!), replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async publish(input: {
    projectId: string;
    draftId: string;
    expectedDraftRevision: number;
    sourceDigest: string;
    templateVersionId: string;
    idempotencyKey: string;
    requestHash: string;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`term-version:${input.projectId}`]);
      const commandResult = await client.query<CommandRow>(
        `SELECT request_hash, term_version_id AS target_id FROM term_version_commands
          WHERE project_id = $1 AND idempotency_key = $2`,
        [input.projectId, input.idempotencyKey],
      );
      const command = commandResult.rows[0];
      const exportCommandResult = await client.query<{ request_hash: string; export_id: string }>(
        `SELECT request_hash, export_id FROM term_export_commands
          WHERE project_id = $1 AND idempotency_key = $2`,
        [input.projectId, input.idempotencyKey],
      );
      const exportCommand = exportCommandResult.rows[0];
      if (command || exportCommand) {
        if (!command || !exportCommand) {
          throw termConflict(
            'TERM_IDEMPOTENCY_KEY_REUSED',
            '该幂等键已用于非完整术语发布命令。',
            'retry_with_new_idempotency_key',
          );
        }
        if (command.request_hash !== input.requestHash || exportCommand.request_hash !== input.requestHash) {
          throw termConflict('TERM_IDEMPOTENCY_KEY_REUSED', '该幂等键已用于另一术语发布命令。', 'retry_with_new_idempotency_key');
        }
        const replay = await loadVersion(client, command.target_id);
        const exported = await loadTermExport(client, exportCommand.export_id);
        if (!replay || !exported || exported.termVersionId !== replay.id
          || exported.templateVersionId !== input.templateVersionId) {
          throw termConflict('TERM_IDEMPOTENCY_KEY_REUSED', '术语发布重放记录不完整。', 'contact_support');
        }
        await client.query('COMMIT');
        return { version: replay, export: exported, replay: true };
      }
      const draft = await assertWritableTermDraft(client, input.projectId, input.draftId);
      if (draft.revision !== input.expectedDraftRevision) {
        throw termConflict('TERM_DRAFT_VERSION_CONFLICT', '草稿已被其他操作更新，请刷新后重试。');
      }
      if (draft.source_srt_set_digest !== input.sourceDigest) {
        throw termConflict('TERM_SOURCE_CHANGED', '术语草稿与当前公司 SRT 来源不一致。', 'start_extraction');
      }
      const pending = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM term_candidates WHERE draft_id = $1 AND status = 'pending'`,
        [input.draftId],
      );
      if (Number(pending.rows[0]?.count ?? 0) > 0) {
        throw termConflict('TERM_VERSION_PENDING_CANDIDATES', '仍有待确认候选，不能创建正式术语版本。', 'review_pending_candidates');
      }
      const template = await loadTermExportTemplate(client, input.templateVersionId);
      if (!template) throw termNotFound('TERM_EXPORT_TEMPLATE_NOT_FOUND', '导出模板版本不存在。');
      const next = await client.query<{ version: number }>(
        `SELECT COALESCE(MAX(version), 0)::integer + 1 AS version FROM term_versions WHERE project_id = $1`,
        [input.projectId],
      );
      const versionResult = await client.query<{ id: string }>(
        `INSERT INTO term_versions
           (project_id, version, draft_id, source_srt_set_digest, prompt_version)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [input.projectId, next.rows[0]!.version, input.draftId, input.sourceDigest, draft.prompt_version],
      );
      const versionId = versionResult.rows[0]!.id;
      await client.query(
        `INSERT INTO term_version_items
           (term_version_id, source_candidate_id, sort_order, type, name, aliases,
            gender, note, first_episode_number, first_cue_index)
         SELECT $2, candidate.id,
                ROW_NUMBER() OVER (ORDER BY
                  CASE candidate.type
                    WHEN '人名' THEN 1 WHEN '地名' THEN 2 WHEN '特定物品' THEN 3 WHEN '朝代' THEN 4
                    WHEN '组织名' THEN 5 WHEN '等级' THEN 6 WHEN '物种/种族名' THEN 7 ELSE 8 END,
                  first_cue.episode_number, first_cue.cue_index, candidate.id),
                candidate.type, candidate.name, candidate.aliases, candidate.gender, candidate.note,
                first_cue.episode_number, first_cue.cue_index
           FROM term_candidates candidate
           JOIN LATERAL (
             SELECT cue.episode_number, cue.cue_index
               FROM term_evidence evidence JOIN term_cues cue ON cue.id = evidence.cue_id
              WHERE evidence.candidate_id = candidate.id
              ORDER BY cue.episode_number, cue.cue_index, cue.id LIMIT 1
           ) first_cue ON TRUE
          WHERE candidate.draft_id = $1 AND candidate.status IN ('approved', 'edited')`,
        [input.draftId, versionId],
      );
      await client.query(
        `UPDATE term_drafts SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [input.draftId],
      );
      const exportResult = await client.query<{ id: string }>(
        `INSERT INTO term_exports
           (project_id, term_version_id, template_version_id, structure_digest)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [input.projectId, versionId, input.templateVersionId, termExportStructureDigest(template.columns)],
      );
      const exportId = exportResult.rows[0]!.id;
      await client.query(
        `INSERT INTO term_version_commands
           (project_id, idempotency_key, request_hash, term_version_id)
         VALUES ($1,$2,$3,$4)`,
        [input.projectId, input.idempotencyKey, input.requestHash, versionId],
      );
      await client.query(
        `INSERT INTO term_export_commands
           (project_id, idempotency_key, request_hash, export_id)
         VALUES ($1,$2,$3,$4)`,
        [input.projectId, input.idempotencyKey, input.requestHash, exportId],
      );
      const version = await loadVersion(client, versionId);
      const exported = await loadTermExport(client, exportId);
      if (!version || !exported) throw new Error('术语发布写入后无法读取完整版本与导出。');
      await client.query('COMMIT');
      return { version, export: exported, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async get(projectId: string, versionId: string) {
    const client = await this.pool.connect();
    try {
      const version = await loadVersion(client, versionId);
      return version?.projectId === projectId ? version : null;
    } finally {
      client.release();
    }
  }

  async list(projectId: string) {
    const result = await this.pool.query<VersionRow>(
      `SELECT ${versionColumns}
         FROM term_versions version
         LEFT JOIN term_version_items item ON item.term_version_id = version.id
        WHERE version.project_id = $1
        GROUP BY version.id ORDER BY version.version DESC`,
      [projectId],
    );
    const versions: TermVersion[] = [];
    for (const row of result.rows) {
      const loaded = await this.get(projectId, row.id);
      if (loaded) versions.push(loaded);
    }
    return versions;
  }
}
