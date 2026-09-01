import type {
  PreEditEpisode,
  PreEditItem,
  PreEditItemQuery,
  PreEditRelease,
  PreEditSession,
  PreEditSessionDetail,
} from '@qimao-terms-cloud/contracts';
import type { QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';

interface SessionRow extends QueryResultRow {
  id: string;
  project_id: string;
  project_version: number;
  source_srt_set_digest: string;
  term_version_id: string;
  manifest_id: string;
  manifest_version: number;
  source_digest: string;
  strategy_version_id: string | null;
  strategy_content_digest: string | null;
  algorithm_version: string;
  format_policy_version: string;
  source_snapshot: any;
  status: PreEditSession['status'];
  default_policy: PreEditSession['defaultPolicy'];
  revision: number;
  error_code: string | null;
  error_detail: string | null;
  episode_total: string;
  episode_completed: string;
  episode_limited: string;
  created_at: Date;
  updated_at: Date;
}

interface EpisodeRow extends QueryResultRow {
  id: string;
  session_id: string;
  episode_number: number;
  company_asset_id: string;
  asr_result_id: string | null;
  asr_result_digest: string | null;
  asr_asset_id: string | null;
  asr_term_version_id: string | null;
  asr_provider: string | null;
  asr_adapter: string | null;
  asr_model: string | null;
  asr_language: string | null;
  asr_config_digest: string | null;
  asr_hotword_digest: string | null;
  asr_quality_status: 'pass' | 'warning' | null;
  video_asset_id: string | null;
  video_duration_ms: string | null;
  status: PreEditEpisode['status'];
  limited_reason: string | null;
  policy_override: PreEditEpisode['policyOverride'];
  default_policy: PreEditEpisode['effectivePolicy'];
  completion_signature: string | null;
  revision: number;
  item_total: string;
  item_pending: string;
  item_blocking: string;
  item_decided: string;
  updated_at: Date;
}

const sessionColumns = `
  session.id, session.project_id, session.project_version, session.source_srt_set_digest,
  session.term_version_id, session.manifest_id, session.manifest_version, session.source_digest,
  session.strategy_version_id, session.strategy_content_digest,
  session.algorithm_version, session.format_policy_version, session.status, session.default_policy,
  session.source_snapshot, session.revision, session.error_code, session.error_detail, session.created_at, session.updated_at,
  count(episode.id)::text AS episode_total,
  count(episode.id) FILTER (WHERE episode.status = 'completed')::text AS episode_completed,
  count(episode.id) FILTER (WHERE episode.limited_reason IS NOT NULL)::text AS episode_limited`;

const mapSession = (row: SessionRow): PreEditSession => ({
  id: row.id,
  projectId: row.project_id,
  projectVersion: row.project_version,
  sourceSrtSetDigest: row.source_srt_set_digest,
  termVersionId: row.term_version_id,
  manifestId: row.manifest_id,
  manifestVersion: row.manifest_version,
  sourceDigest: row.source_digest,
  strategyVersionId: row.strategy_version_id,
  strategyContentDigest: row.strategy_content_digest,
  algorithmVersion: row.algorithm_version,
  formatPolicyVersion: row.format_policy_version,
  screenTextRelease: row.source_snapshot?.screenTextRelease ?? null,
  status: row.status,
  defaultPolicy: row.default_policy,
  revision: row.revision,
  errorCode: row.error_code,
  errorDetail: row.error_detail,
  episodeCounts: {
    total: Number(row.episode_total),
    completed: Number(row.episode_completed),
    limited: Number(row.episode_limited),
  },
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const mapEpisode = (row: EpisodeRow): PreEditEpisode => ({
  id: row.id,
  sessionId: row.session_id,
  episodeNumber: row.episode_number,
  companyAssetId: row.company_asset_id,
  asr: row.asr_result_id ? {
    resultId: row.asr_result_id,
    resultDigest: row.asr_result_digest!,
    assetId: row.asr_asset_id!,
    termVersionId: row.asr_term_version_id!,
    provider: row.asr_provider!,
    adapter: row.asr_adapter!,
    model: row.asr_model!,
    language: row.asr_language!,
    configDigest: row.asr_config_digest!,
    hotwordDigest: row.asr_hotword_digest!,
    qualityStatus: row.asr_quality_status!,
  } : null,
  videoAssetId: row.video_asset_id,
  videoDurationMs: row.video_duration_ms === null ? null : Number(row.video_duration_ms),
  videoDurationStatus: row.video_duration_ms === null ? 'unknown' : 'known',
  status: row.status,
  limitedReason: row.limited_reason,
  policyOverride: row.policy_override,
  effectivePolicy: row.policy_override ?? row.default_policy,
  completionSignature: row.completion_signature,
  revision: row.revision,
  counts: {
    total: Number(row.item_total),
    pending: Number(row.item_pending),
    blocking: Number(row.item_blocking),
    decided: Number(row.item_decided),
  },
  updatedAt: row.updated_at.toISOString(),
});

interface ItemRow extends QueryResultRow {
  id: string;
  session_id: string;
  episode_id: string;
  episode_number: number;
  group_id: string;
  kind: PreEditItem['groupKind'];
  digest: string;
  company_cue_ids: string[];
  asr_cue_ids: string[];
  time_overlap_ms: number;
  text_similarity: string;
  target_company_cue_id: string | null;
  policy_override: PreEditItem['policyOverride'];
  episode_policy_override: PreEditItem['policyOverride'];
  default_policy: PreEditItem['effectivePolicy'];
  system_action: PreEditItem['systemAction'];
  system_text: string;
  current_action: PreEditItem['currentAction'];
  current_text: string;
  decision_origin: PreEditItem['decisionOrigin'];
  current_decision_event_id: string | null;
  requires_review: boolean;
  term_evidence: PreEditItem['termEvidence'];
  format_issues: PreEditItem['formatIssues'];
  format_override_reason: string | null;
  version: number;
  updated_at: Date;
  list_total: string;
}

interface CueRow extends QueryResultRow {
  group_id: string;
  cue_id: string;
  cue_index: number;
  start_ms: number;
  end_ms: number;
  text: string;
  confidence: string | null;
}

const releaseUrl = (projectId: string, releaseId: string, episodeNumber: number) =>
  `/api/projects/${projectId}/pre-review/releases/${releaseId}/episodes/${episodeNumber}/export.srt`;

export class PreReviewReadRepository {
  constructor(private readonly pool: DatabasePool) {}

  async getSession(projectId: string, sessionId: string): Promise<PreEditSessionDetail | null> {
    const session = await this.pool.query<SessionRow>(
      `SELECT ${sessionColumns}
         FROM pre_edit_sessions session
         LEFT JOIN pre_edit_episodes episode ON episode.session_id = session.id
        WHERE session.id = $1 AND session.project_id = $2
        GROUP BY session.id`,
      [sessionId, projectId],
    );
    if (!session.rows[0]) return null;
    const episodes = await this.pool.query<EpisodeRow>(
      `SELECT episode.*, session.default_policy,
              count(item.id)::text AS item_total,
              count(item.id) FILTER (
                WHERE item.requires_review AND item.decision_origin = 'system'
              )::text AS item_pending,
              count(item.id) FILTER (
                WHERE EXISTS (
                  SELECT 1 FROM jsonb_array_elements(item.format_issues) issue
                   WHERE (issue->>'blocking')::boolean
                     AND (NOT (issue->>'overridable')::boolean OR item.format_override_reason IS NULL)
                )
              )::text AS item_blocking,
              count(item.id) FILTER (WHERE item.decision_origin = 'human')::text AS item_decided
         FROM pre_edit_episodes episode
         JOIN pre_edit_sessions session ON session.id = episode.session_id
         LEFT JOIN pre_edit_items item ON item.episode_id = episode.id
        WHERE episode.session_id = $1
        GROUP BY episode.id, session.default_policy
        ORDER BY episode.episode_number`,
      [sessionId],
    );
    return { ...mapSession(session.rows[0]), episodes: episodes.rows.map(mapEpisode) };
  }

  async listSessions(projectId: string) {
    const result = await this.pool.query<SessionRow & { list_total: string }>(
      `SELECT ${sessionColumns}, count(*) OVER()::text AS list_total
         FROM pre_edit_sessions session
         LEFT JOIN pre_edit_episodes episode ON episode.session_id = session.id
        WHERE session.project_id = $1
        GROUP BY session.id
        ORDER BY session.created_at DESC, session.id DESC`,
      [projectId],
    );
    return { items: result.rows.map(mapSession), total: Number(result.rows[0]?.list_total ?? 0) };
  }

  async listItems(projectId: string, sessionId: string, query: PreEditItemQuery) {
    const predicates = ['session.project_id = $1', 'item.session_id = $2', 'episode.episode_number = $3'];
    const values: unknown[] = [projectId, sessionId, query.episodeNumber];
    const status = query.status ?? 'all';
    if (status === 'pending') predicates.push("item.requires_review AND item.decision_origin = 'system'");
    if (status === 'decided') predicates.push("item.decision_origin = 'human'");
    if (status === 'blocking') {
      predicates.push(`EXISTS (
        SELECT 1 FROM jsonb_array_elements(item.format_issues) issue
         WHERE (issue->>'blocking')::boolean
           AND (NOT (issue->>'overridable')::boolean OR item.format_override_reason IS NULL)
      )`);
    }
    const search = query.search?.trim();
    if (search) {
      values.push(`%${search}%`);
      predicates.push(`(item.current_text ILIKE $${values.length} OR group_row.digest ILIKE $${values.length})`);
    }
    values.push(Number(query.limit ?? 50), Number(query.offset ?? 0));
    const result = await this.pool.query<ItemRow>(
      `WITH projected AS (
         SELECT item.*, episode.episode_number, episode.policy_override AS episode_policy_override,
                session.default_policy, session.project_id,
                group_row.kind, group_row.digest, group_row.company_cue_ids, group_row.asr_cue_ids,
                group_row.time_overlap_ms, group_row.text_similarity
           FROM pre_edit_items item
           JOIN pre_edit_episodes episode ON episode.id = item.episode_id
           JOIN pre_edit_sessions session ON session.id = item.session_id
           JOIN pre_edit_alignment_groups group_row ON group_row.id = item.group_id
          WHERE ${predicates.join(' AND ')}
       ), page AS (
         SELECT * FROM projected
          ORDER BY episode_number, coalesce(
            (SELECT cue_index FROM term_cues WHERE id = target_company_cue_id),
            (SELECT min(cue_index) FROM asr_cues WHERE id = ANY(asr_cue_ids))
          ), id
          LIMIT $${values.length - 1} OFFSET $${values.length}
       )
       SELECT page.*, totals.list_total
         FROM (SELECT count(*)::text AS list_total FROM projected) totals
         LEFT JOIN page ON TRUE`,
      values,
    );
    const rows = result.rows.filter((row) => row.id);
    if (!rows.length) return { items: [] as PreEditItem[], total: Number(result.rows[0]?.list_total ?? 0) };
    const groupIds = rows.map((row) => row.group_id);
    const company = await this.pool.query<CueRow>(
      `SELECT group_row.id AS group_id, cue.id AS cue_id, cue.cue_index, cue.start_ms, cue.end_ms,
              cue.text, NULL::text AS confidence
         FROM pre_edit_alignment_groups group_row
         JOIN term_cues cue ON cue.id = ANY(group_row.company_cue_ids)
        WHERE group_row.id = ANY($1::uuid[])
        ORDER BY group_row.id, cue.cue_index, cue.id`,
      [groupIds],
    );
    const asr = await this.pool.query<CueRow>(
      `SELECT group_row.id AS group_id, cue.id::text AS cue_id, cue.cue_index, cue.start_ms, cue.end_ms,
              cue.text, cue.confidence::text AS confidence
         FROM pre_edit_alignment_groups group_row
         JOIN asr_cues cue ON cue.id = ANY(group_row.asr_cue_ids)
        WHERE group_row.id = ANY($1::uuid[])
        ORDER BY group_row.id, cue.cue_index, cue.id`,
      [groupIds],
    );
    const cueMap = (cueRows: CueRow[]) => cueRows.reduce((map, cue) => {
      const valuesForGroup = map.get(cue.group_id) ?? [];
      valuesForGroup.push({
        cueId: cue.cue_id,
        cueIndex: cue.cue_index,
        startMs: cue.start_ms,
        endMs: cue.end_ms,
        text: cue.text,
        confidence: cue.confidence === null ? null : Number(cue.confidence),
      });
      map.set(cue.group_id, valuesForGroup);
      return map;
    }, new Map<string, PreEditItem['companyCues']>());
    const companyByGroup = cueMap(company.rows);
    const asrByGroup = cueMap(asr.rows);
    return {
      items: rows.map((row): PreEditItem => ({
        id: row.id,
        sessionId: row.session_id,
        episodeId: row.episode_id,
        episodeNumber: row.episode_number,
        groupId: row.group_id,
        groupKind: row.kind,
        groupDigest: row.digest,
        targetCompanyCueId: row.target_company_cue_id,
        companyCues: companyByGroup.get(row.group_id) ?? [],
        asrCues: asrByGroup.get(row.group_id) ?? [],
        timeOverlapMs: row.time_overlap_ms,
        textSimilarity: Number(row.text_similarity),
        policyOverride: row.policy_override,
        effectivePolicy: row.policy_override ?? row.episode_policy_override ?? row.default_policy,
        systemAction: row.system_action,
        systemText: row.system_text,
        currentAction: row.current_action,
        currentText: row.current_text,
        decisionOrigin: row.decision_origin,
        currentDecisionEventId: row.current_decision_event_id,
        requiresReview: row.requires_review,
        termEvidence: row.term_evidence,
        formatIssues: row.format_issues,
        formatOverrideReason: row.format_override_reason,
        version: row.version,
        updatedAt: row.updated_at.toISOString(),
      })),
      total: Number(result.rows[0]?.list_total ?? 0),
    };
  }

  async getItem(projectId: string, sessionId: string, itemId: string) {
    const episode = await this.pool.query<{ episode_number: number }>(
      `SELECT episode.episode_number
         FROM pre_edit_items item
         JOIN pre_edit_episodes episode ON episode.id = item.episode_id
         JOIN pre_edit_sessions session ON session.id = item.session_id
        WHERE item.id = $1 AND item.session_id = $2 AND session.project_id = $3`,
      [itemId, sessionId, projectId],
    );
    if (!episode.rows[0]) return null;
    const list = await this.listItems(projectId, sessionId, {
      episodeNumber: episode.rows[0].episode_number,
      status: 'all',
      limit: 100,
      offset: 0,
    });
    return list.items.find((item) => item.id === itemId) ?? null;
  }

  async listDecisionEvents(projectId: string, sessionId: string, itemId: string) {
    const result = await this.pool.query<{
      id: string; session_id: string; episode_id: string; item_id: string;
      event_kind: 'baseline' | 'policy' | 'decision' | 'undo';
      action: PreEditItem['currentAction']; origin: 'system' | 'human';
      before_state: Record<string, unknown>; after_state: Record<string, unknown>;
      reverses_event_id: string | null; created_at: Date;
    }>(
      `SELECT event.*
         FROM pre_edit_decision_events event
         JOIN pre_edit_sessions session ON session.id = event.session_id
        WHERE event.item_id = $1 AND event.session_id = $2 AND session.project_id = $3
        ORDER BY event.created_at, event.id`,
      [itemId, sessionId, projectId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      episodeId: row.episode_id,
      itemId: row.item_id,
      eventKind: row.event_kind,
      action: row.action,
      origin: row.origin,
      beforeState: row.before_state,
      afterState: row.after_state,
      reversesEventId: row.reverses_event_id,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async listReleases(projectId: string): Promise<PreEditRelease[]> {
    const result = await this.pool.query<{
      id: string; project_id: string; session_id: string; version: number; source_digest: string;
      decision_digest: string; release_digest: string; created_at: Date; files: unknown;
    }>(
      `SELECT release.*,
              coalesce(jsonb_agg(jsonb_build_object(
                'episodeNumber', file.episode_number, 'fileName', file.file_name,
                'cueCount', file.cue_count, 'contentDigest', file.content_digest
              ) ORDER BY file.episode_number) FILTER (WHERE file.release_id IS NOT NULL), '[]') AS files
         FROM pre_edit_releases release
         LEFT JOIN pre_edit_release_files file ON file.release_id = release.id
        WHERE release.project_id = $1
        GROUP BY release.id
        ORDER BY release.created_at DESC, release.id DESC`,
      [projectId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      sessionId: row.session_id,
      version: row.version,
      sourceDigest: row.source_digest,
      decisionDigest: row.decision_digest,
      releaseDigest: row.release_digest,
      files: (row.files as Array<{ episodeNumber: number; fileName: string; cueCount: number; contentDigest: string }>)
        .map((file) => ({ ...file, downloadUrl: releaseUrl(projectId, row.id, file.episodeNumber) })),
      createdAt: row.created_at.toISOString(),
    }));
  }
}
