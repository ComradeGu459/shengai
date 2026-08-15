import type { DatabasePool } from '../../database/pool.js';
import {
  draftColumns,
  type DraftRow,
  type RunRow,
  toDraft,
  toRun,
  toVersionSummary,
  type VersionRow,
} from './term-mappers.js';

export class TermWorkspaceRepository {
  constructor(private readonly pool: DatabasePool) {}

  async projection(projectId: string) {
    const draft = await this.pool.query<DraftRow>(
      `SELECT ${draftColumns}
         FROM term_drafts draft
         LEFT JOIN term_candidates candidate ON candidate.draft_id = draft.id
        WHERE draft.project_id = $1 AND draft.status = 'active'
        GROUP BY draft.id`,
      [projectId],
    );
    const run = await this.pool.query<RunRow>(
      `SELECT * FROM term_extraction_runs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [projectId],
    );
    const version = await this.pool.query<VersionRow>(
      `SELECT version.id, version.project_id, version.version, version.source_srt_set_digest,
              version.prompt_version, version.created_at, COUNT(item.id) AS item_count
         FROM term_versions version
         LEFT JOIN term_version_items item ON item.term_version_id = version.id
        WHERE version.project_id = $1
        GROUP BY version.id ORDER BY version.version DESC LIMIT 1`,
      [projectId],
    );
    return {
      activeDraft: draft.rows[0] ? toDraft(draft.rows[0]) : null,
      latestRun: run.rows[0] ? toRun(run.rows[0]) : null,
      latestVersion: version.rows[0] ? toVersionSummary(version.rows[0]) : null,
    };
  }
}
