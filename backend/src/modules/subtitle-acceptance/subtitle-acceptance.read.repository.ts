import type { AcceptanceCue, AcceptanceEpisode, AcceptanceIssue, AcceptanceSession, AcceptanceSessionDetail } from '@qimao-terms-cloud/contracts';
import type { QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';

interface SessionRow extends QueryResultRow {
  id: string; project_id: string; project_version: number; status: AcceptanceSession['status']; revision: number;
  source_snapshot: any; source_digest: string; created_at: Date; updated_at: Date;
  episode_total: string; episode_passed: string; episode_blocked: string; episode_rework: string;
}

const mapSession = (row: SessionRow): AcceptanceSession => ({
  id: row.id, projectId: row.project_id, projectVersion: row.project_version, status: row.status,
  source: { ...row.source_snapshot, sourceDigest: row.source_digest }, revision: row.revision,
  episodeCounts: { total: Number(row.episode_total), passed: Number(row.episode_passed), blocked: Number(row.episode_blocked), reworkRequired: Number(row.episode_rework) },
  createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
});

const mapEpisode = (row: any): AcceptanceEpisode => ({
  id: row.id, episodeNumber: row.episode_number, status: row.status, availableVideos: row.available_videos,
  selectedVideoAssetId: row.selected_video_asset_id, authoritativeDurationMs: row.authoritative_duration_ms === null ? null : Number(row.authoritative_duration_ms),
  dialogueCueCount: Number(row.dialogue_count), screenTextCueCount: Number(row.screen_count),
  openErrorCount: Number(row.error_count), openWarningCount: Number(row.warning_count), passSignature: row.pass_signature,
  revision: row.revision, updatedAt: row.updated_at.toISOString(),
});

const mapCue = (row: any): AcceptanceCue => ({
  id: row.id, episodeNumber: row.episode_number, track: row.track, ordinal: row.ordinal,
  startMs: row.start_ms, endMs: row.end_ms, text: row.text, sourceCueId: row.source_cue_id,
  revision: row.revision, deleted: row.deleted,
});

const mapIssue = (row: any): AcceptanceIssue => ({
  id: row.id, episodeNumber: row.episode_number, origin: row.origin, code: row.code, severity: row.severity,
  track: row.track, cueId: row.cue_id, timeMs: row.time_ms, note: row.note, status: row.status,
  resolutionReason: row.resolution_reason, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
});

const sessionColumns = `session.id, session.project_id, session.project_version, session.status,
  session.revision, session.source_snapshot, session.source_digest, session.created_at, session.updated_at,
  count(episode.id)::text AS episode_total,
  count(episode.id) FILTER (WHERE episode.status = 'passed')::text AS episode_passed,
  count(episode.id) FILTER (WHERE episode.status = 'blocked')::text AS episode_blocked,
  count(episode.id) FILTER (WHERE episode.status = 'rework_required')::text AS episode_rework`;

const episodeColumns = `episode.*,
  count(cue.id) FILTER (WHERE NOT cue.deleted AND cue.track = 'dialogue')::text AS dialogue_count,
  count(cue.id) FILTER (WHERE NOT cue.deleted AND cue.track = 'screen_text')::text AS screen_count,
  (SELECT count(*) FROM acceptance_issues issue WHERE issue.episode_id = episode.id AND issue.status = 'open' AND issue.severity = 'error')::text AS error_count,
  (SELECT count(*) FROM acceptance_issues issue WHERE issue.episode_id = episode.id AND issue.status = 'open' AND issue.severity = 'warning')::text AS warning_count`;

export class SubtitleAcceptanceReadRepository {
  constructor(private readonly pool: DatabasePool) {}

  async getSession(projectId: string, sessionId: string): Promise<AcceptanceSessionDetail | null> {
    const session = await this.pool.query<SessionRow>(`SELECT ${sessionColumns} FROM acceptance_sessions session LEFT JOIN acceptance_episodes episode ON episode.session_id = session.id WHERE session.id = $1 AND session.project_id = $2 GROUP BY session.id`, [sessionId, projectId]);
    if (!session.rows[0]) return null;
    const episodes = await this.pool.query(`SELECT ${episodeColumns} FROM acceptance_episodes episode LEFT JOIN acceptance_cues cue ON cue.episode_id = episode.id WHERE episode.session_id = $1 GROUP BY episode.id ORDER BY episode.episode_number`, [sessionId]);
    return { ...mapSession(session.rows[0]), episodes: episodes.rows.map(mapEpisode) };
  }

  async listSessions(projectId: string) {
    const result = await this.pool.query<SessionRow>(`SELECT ${sessionColumns} FROM acceptance_sessions session LEFT JOIN acceptance_episodes episode ON episode.session_id = session.id WHERE session.project_id = $1 GROUP BY session.id ORDER BY session.created_at DESC, session.id DESC`, [projectId]);
    return { items: result.rows.map(mapSession) };
  }

  async getEpisode(projectId: string, sessionId: string, episodeNumber: number) {
    const result = await this.pool.query(`SELECT ${episodeColumns} FROM acceptance_episodes episode JOIN acceptance_sessions session ON session.id = episode.session_id LEFT JOIN acceptance_cues cue ON cue.episode_id = episode.id WHERE session.project_id = $1 AND session.id = $2 AND episode.episode_number = $3 GROUP BY episode.id`, [projectId, sessionId, episodeNumber]);
    if (!result.rows[0]) return null;
    const [cues, issues] = await Promise.all([
      this.pool.query('SELECT * FROM acceptance_cues WHERE episode_id = $1 ORDER BY track, start_ms, end_ms, id', [result.rows[0].id]),
      this.pool.query('SELECT * FROM acceptance_issues WHERE episode_id = $1 ORDER BY created_at, id', [result.rows[0].id]),
    ]);
    return { episode: mapEpisode(result.rows[0]), cues: cues.rows.map(mapCue), issues: issues.rows.map(mapIssue) };
  }

  async listEvents(projectId: string, sessionId: string, episodeNumber: number) {
    const result = await this.pool.query(
      `SELECT event.id, event.event_kind, event.reverses_event_id, event.restores_event_id, event.actor, event.created_at
         FROM acceptance_edit_events event JOIN acceptance_episodes episode ON episode.id = event.episode_id
         JOIN acceptance_sessions session ON session.id = event.session_id
        WHERE session.project_id = $1 AND session.id = $2 AND episode.episode_number = $3
        ORDER BY event.created_at, event.id`, [projectId, sessionId, episodeNumber],
    );
    return { items: result.rows.map((row: any) => ({ id: row.id, kind: row.event_kind, reversesEventId: row.reverses_event_id, restoresEventId: row.restores_event_id, actor: row.actor, createdAt: row.created_at.toISOString() })) };
  }

  async listRework(projectId: string, sessionId: string) {
    const result = await this.pool.query('SELECT * FROM acceptance_rework_requests WHERE project_id = $1 AND session_id = $2 ORDER BY created_at DESC, id DESC', [projectId, sessionId]);
    return { items: result.rows.map((row: any) => ({ id: row.id, sessionId: row.session_id, episodeNumbers: row.episode_numbers, tracks: row.tracks, reason: row.reason, createdAt: row.created_at.toISOString() })) };
  }

  async listReleases(projectId: string) {
    const result = await this.pool.query('SELECT * FROM acceptance_releases WHERE project_id = $1 ORDER BY version DESC, id DESC', [projectId]);
    return { items: result.rows.map((row: any) => ({ id: row.id, projectId: row.project_id, sessionId: row.session_id, version: row.version, sourceDigest: row.source_digest, acceptanceDigest: row.acceptance_digest, cueCount: row.cue_count, createdAt: row.created_at.toISOString() })) };
  }

  async readSourceInspection(projectId: string, sessionId: string) {
    const result = await this.pool.query('SELECT source_snapshot, source_digest FROM acceptance_sessions WHERE id = $1 AND project_id = $2', [sessionId, projectId]);
    if (!result.rows[0]) return null;
    return { ...result.rows[0].source_snapshot, sourceDigest: result.rows[0].source_digest };
  }
}
