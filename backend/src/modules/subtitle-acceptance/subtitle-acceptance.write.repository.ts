import { randomUUID } from 'node:crypto';

import type {
  AcceptanceCue, AcceptanceCueOperation, AcceptanceTrack,
  ApplyAcceptanceCueCommandBody, CreateAcceptanceIssueBody, CreateAcceptanceReworkBody,
  CreateAcceptanceSessionBody, PassAcceptanceEpisodesBody, ResolveAcceptanceIssueBody,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import { acceptanceSignature, scanAcceptanceQuality, stableDigest } from './subtitle-acceptance.domain.js';
import { acceptanceConflict, acceptanceInvalid, acceptanceNotFound } from './subtitle-acceptance.errors.js';
import type { AcceptanceSourceInspection } from './subtitle-acceptance.source.js';

type CommandResult = { replay: boolean; resourceId: string };
type EpisodeLock = { id: string; session_id: string; episode_number: number; revision: number; status: string; selected_video_asset_id: string | null; authoritative_duration_ms: string | null };

const cueSnapshot = async (client: PoolClient, episodeId: string): Promise<AcceptanceCue[]> => {
  const result = await client.query('SELECT * FROM acceptance_cues WHERE episode_id = $1 ORDER BY track, start_ms, end_ms, id', [episodeId]);
  return result.rows.map((row: any) => ({ id: row.id, episodeNumber: row.episode_number, track: row.track, ordinal: row.ordinal, startMs: row.start_ms, endMs: row.end_ms, text: row.text, sourceCueId: row.source_cue_id, revision: row.revision, deleted: row.deleted }));
};

const requireVersions = (session: any, episode: EpisodeLock, input: { expectedSessionRevision: number; expectedEpisodeRevision: number }) => {
  if (session.revision !== input.expectedSessionRevision) throw acceptanceConflict('ACCEPTANCE_SESSION_VERSION_CONFLICT', '验收会话已被其他操作更新。');
  if (episode.revision !== input.expectedEpisodeRevision) throw acceptanceConflict('ACCEPTANCE_EPISODE_VERSION_CONFLICT', '本集已被其他操作更新。');
};

export class SubtitleAcceptanceWriteRepository {
  constructor(private readonly pool: DatabasePool) {}

  private async transaction<T>(fn: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  private async lockProject(client: PoolClient, projectId: string) {
    const result = await client.query('SELECT id, version, lifecycle_status FROM projects WHERE id = $1 FOR UPDATE', [projectId]);
    if (!result.rows[0]) throw acceptanceNotFound('ACCEPTANCE_PROJECT_NOT_FOUND', '项目不存在或已被清理。');
    if (result.rows[0].lifecycle_status !== 'active') throw acceptanceConflict('ACCEPTANCE_PROJECT_NOT_ACTIVE', '项目不在可验收状态。', 'return_to_projects');
    return result.rows[0];
  }

  private async replay(client: PoolClient, projectId: string, key: string, kind: string, hash: string) {
    const existing = await client.query('SELECT command_kind, request_hash, response_payload FROM acceptance_commands WHERE project_id = $1 AND idempotency_key = $2', [projectId, key]);
    if (!existing.rows[0]) return null;
    if (existing.rows[0].command_kind !== kind || existing.rows[0].request_hash !== hash) {
      throw acceptanceConflict('ACCEPTANCE_IDEMPOTENCY_KEY_REUSED', '幂等键已用于不同请求。', 'use_new_idempotency_key');
    }
    return existing.rows[0].response_payload as { resourceId: string };
  }

  private async saveCommand(client: PoolClient, projectId: string, key: string, kind: string, hash: string, resourceId: string, payload: object) {
    await client.query('INSERT INTO acceptance_commands(project_id, idempotency_key, command_kind, request_hash, resource_id, response_payload) VALUES($1,$2,$3,$4,$5,$6)', [projectId, key, kind, hash, resourceId, JSON.stringify(payload)]);
  }

  async createSession(input: { projectId: string; body: CreateAcceptanceSessionBody; key: string; snapshot: AcceptanceSourceInspection }): Promise<CommandResult> {
    const hash = stableDigest(input.body);
    return this.transaction(async (client) => {
      const project = await this.lockProject(client, input.projectId);
      const replay = await this.replay(client, input.projectId, input.key, 'create_session', hash);
      if (replay) return { replay: true, resourceId: replay.resourceId };
      if (project.version !== input.body.expectedProjectVersion) throw acceptanceConflict('ACCEPTANCE_SESSION_VERSION_CONFLICT', '项目版本已变化。', 'reload_projects');
      const active = await client.query("SELECT id FROM acceptance_sessions WHERE project_id = $1 AND status IN ('draft','preflighting','ready_to_release','blocked') FOR UPDATE", [input.projectId]);
      if (active.rows[0]) throw acceptanceConflict('ACCEPTANCE_SESSION_ACTIVE', '同一项目已有可写验收会话。', 'resume_acceptance');
      const sessionId = randomUUID();
      const sourceSnapshot = { preEditReleaseId: input.snapshot.preEditReleaseId, preEditReleaseVersion: input.snapshot.preEditReleaseVersion, preEditHeadReleaseId: input.snapshot.preEditHeadReleaseId, screenTextReleaseId: input.snapshot.screenTextReleaseId, screenTextReleaseVersion: input.snapshot.screenTextReleaseVersion, screenTextHeadReleaseId: input.snapshot.screenTextHeadReleaseId, screenTextExcludedEpisodes: input.snapshot.screenTextExcludedEpisodes, manifestId: input.snapshot.manifestId, manifestVersion: input.snapshot.manifestVersion, termVersionId: input.snapshot.termVersionId, termVersion: input.snapshot.termVersion, ruleVersion: input.snapshot.ruleVersion };
      await client.query(`INSERT INTO acceptance_sessions(id,project_id,project_version,pre_edit_release_id,pre_edit_head_release_id,screen_text_release_id,screen_text_head_release_id,manifest_id,manifest_version,term_version_id,rule_version,source_digest,source_snapshot,status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft')`, [sessionId, input.projectId, project.version, input.snapshot.preEditReleaseId, input.snapshot.preEditHeadReleaseId, input.snapshot.screenTextReleaseId, input.snapshot.screenTextHeadReleaseId, input.snapshot.manifestId, input.snapshot.manifestVersion, input.snapshot.termVersionId, input.snapshot.ruleVersion, input.snapshot.sourceDigest, JSON.stringify(sourceSnapshot)]);
      for (const sourceEpisode of input.snapshot.episodes) {
        const episodeId = randomUUID();
        await client.query(`INSERT INTO acceptance_episodes(id,session_id,episode_number,available_videos,selected_video_asset_id,authoritative_duration_ms,status)
          VALUES($1,$2,$3,$4,$5,$6,$7)`, [episodeId, sessionId, sourceEpisode.episodeNumber, JSON.stringify(sourceEpisode.availableVideos), sourceEpisode.selectedVideoAssetId, sourceEpisode.authoritativeDurationMs, sourceEpisode.selectedVideoAssetId && sourceEpisode.authoritativeDurationMs ? 'in_review' : 'blocked']);
        for (const cue of sourceEpisode.cues) {
          await client.query(`INSERT INTO acceptance_cues(id,session_id,episode_id,episode_number,track,ordinal,source_cue_id,start_ms,end_ms,text,source_metadata)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [randomUUID(), sessionId, episodeId, sourceEpisode.episodeNumber, cue.track, cue.ordinal, cue.sourceCueId, cue.startMs, cue.endMs, cue.text, JSON.stringify(cue.metadata)]);
        }
        await this.syncAutomaticIssues(client, sessionId, episodeId);
      }
      await this.saveCommand(client, input.projectId, input.key, 'create_session', hash, sessionId, { resourceId: sessionId });
      return { replay: false, resourceId: sessionId };
    });
  }

  async markStale(projectId: string, sessionId: string) {
    await this.transaction(async (client) => {
      await this.lockProject(client, projectId);
      const result = await client.query("UPDATE acceptance_sessions SET status = 'stale', revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND project_id = $2 AND status <> 'stale' RETURNING id", [sessionId, projectId]);
      if (result.rows[0]) await client.query("UPDATE acceptance_episodes SET status = 'blocked', pass_signature = NULL, passed_at = NULL, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE session_id = $1 AND status <> 'passed'", [sessionId]);
    });
  }

  private async lockEpisode(client: PoolClient, projectId: string, sessionId: string, episodeNumber: number) {
    const session = await client.query('SELECT * FROM acceptance_sessions WHERE id = $1 AND project_id = $2 FOR UPDATE', [sessionId, projectId]);
    if (!session.rows[0]) throw acceptanceNotFound('ACCEPTANCE_SESSION_NOT_FOUND', '验收会话不存在。');
    if (['stale', 'released'].includes(session.rows[0].status)) throw acceptanceConflict('ACCEPTANCE_SESSION_NOT_WRITABLE', '验收会话已经只读。', 'create_acceptance_session');
    const episode = await client.query<EpisodeLock>('SELECT * FROM acceptance_episodes WHERE session_id = $1 AND episode_number = $2 FOR UPDATE', [sessionId, episodeNumber]);
    if (!episode.rows[0]) throw acceptanceNotFound('ACCEPTANCE_EPISODE_NOT_FOUND', '验收集不存在。');
    return { session: session.rows[0], episode: episode.rows[0] };
  }

  private async syncAutomaticIssues(client: PoolClient, sessionId: string, episodeId: string) {
    const closedResult = await client.query(`SELECT code, track, cue_id, time_ms, status, resolution_reason
      FROM acceptance_issues WHERE episode_id = $1 AND origin = 'automatic' AND status <> 'open'`, [episodeId]);
    const closedByIdentity = new Map(closedResult.rows.map((row: any) => [
      stableDigest({ code: row.code, track: row.track, cueId: row.cue_id, timeMs: row.time_ms }),
      { status: row.status, resolutionReason: row.resolution_reason },
    ]));
    const episodeResult = await client.query('SELECT selected_video_asset_id, authoritative_duration_ms FROM acceptance_episodes WHERE id = $1', [episodeId]);
    const cuesResult = await cueSnapshot(client, episodeId);
    const metadataResult = await client.query('SELECT id, source_metadata FROM acceptance_cues WHERE episode_id = $1 AND NOT deleted', [episodeId]);
    const metadata = new Map(metadataResult.rows.filter((row: any) => row.source_metadata?.pairGroupId).map((row: any) => [row.id, { groupId: row.source_metadata.pairGroupId, position: row.source_metadata.position }]));
    const episode = episodeResult.rows[0];
    const issues = scanAcceptanceQuality({ cues: cuesResult, selectedVideoAssetId: episode.selected_video_asset_id, durationMs: episode.authoritative_duration_ms === null ? null : Number(episode.authoritative_duration_ms), pairByCueId: metadata });
    await client.query("DELETE FROM acceptance_issues WHERE episode_id = $1 AND origin = 'automatic'", [episodeId]);
    for (const issue of issues) {
      const closed = closedByIdentity.get(stableDigest({ code: issue.code, track: issue.track, cueId: issue.cueId, timeMs: issue.timeMs }));
      await client.query(`INSERT INTO acceptance_issues(session_id,episode_id,episode_number,origin,code,severity,track,cue_id,time_ms,note,status,resolution_reason)
        SELECT $1,$2,episode_number,'automatic',$3,$4,$5,$6,$7,$8,$9,$10 FROM acceptance_episodes WHERE id = $2`, [sessionId, episodeId, issue.code, issue.severity, issue.track, issue.cueId, issue.timeMs, issue.note, closed?.status ?? 'open', closed?.resolutionReason ?? null]);
    }
  }

  private async afterEpisodeMutation(client: PoolClient, sessionId: string, episodeId: string, status = 'changes_pending') {
    await this.syncAutomaticIssues(client, sessionId, episodeId);
    await client.query(`UPDATE acceptance_episodes SET status = $2, pass_signature = NULL, passed_at = NULL, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [episodeId, status]);
    await client.query("UPDATE acceptance_sessions SET revision = revision + 1, status = CASE WHEN status = 'ready_to_release' THEN 'draft' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [sessionId]);
  }

  async applyCueCommand(input: { projectId: string; sessionId: string; episodeNumber: number; body: ApplyAcceptanceCueCommandBody; key: string }) {
    const hash = stableDigest(input.body);
    return this.transaction(async (client) => {
      await this.lockProject(client, input.projectId); const replay = await this.replay(client, input.projectId, input.key, 'edit_cues', hash); if (replay) return { replay: true, resourceId: replay.resourceId };
      const { session, episode } = await this.lockEpisode(client, input.projectId, input.sessionId, input.episodeNumber); requireVersions(session, episode, input.body);
      const before = await cueSnapshot(client, episode.id);
      for (const operation of input.body.operations) await this.applyOperation(client, episode, operation);
      const after = await cueSnapshot(client, episode.id);
      const eventId = randomUUID();
      await client.query('INSERT INTO acceptance_edit_events(id,session_id,episode_id,event_kind,before_snapshot,after_snapshot) VALUES($1,$2,$3,$4,$5,$6)', [eventId, input.sessionId, episode.id, 'edit', JSON.stringify(before), JSON.stringify(after)]);
      await this.afterEpisodeMutation(client, input.sessionId, episode.id);
      await this.saveCommand(client, input.projectId, input.key, 'edit_cues', hash, eventId, { resourceId: eventId }); return { replay: false, resourceId: eventId };
    });
  }

  private async applyOperation(client: PoolClient, episode: EpisodeLock, operation: AcceptanceCueOperation) {
    const cue = async (cueId: string) => {
      const result = await client.query('SELECT * FROM acceptance_cues WHERE id = $1 AND episode_id = $2 FOR UPDATE', [cueId, episode.id]);
      if (!result.rows[0]) throw acceptanceNotFound('ACCEPTANCE_CUE_NOT_FOUND', '字幕轴不存在于当前集。'); return result.rows[0];
    };
    if (operation.kind === 'update') { await cue(operation.cueId); await client.query('UPDATE acceptance_cues SET text = COALESCE($2,text), start_ms = COALESCE($3,start_ms), end_ms = COALESCE($4,end_ms), revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [operation.cueId, operation.text, operation.startMs, operation.endMs]); return; }
    if (operation.kind === 'move') { await cue(operation.cueId); await client.query('UPDATE acceptance_cues SET start_ms = start_ms + $2, end_ms = end_ms + $2, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [operation.cueId, operation.deltaMs]); return; }
    if (operation.kind === 'delete' || operation.kind === 'cut') { for (const cueId of operation.cueIds) { await cue(cueId); await client.query('UPDATE acceptance_cues SET deleted = true, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [cueId]); } return; }
    const drafts = operation.kind === 'add' ? [operation.cue] : operation.cues;
    const ordinal = await client.query('SELECT COALESCE(max(ordinal),0) AS value FROM acceptance_cues WHERE episode_id = $1', [episode.id]); let next = Number(ordinal.rows[0].value);
    for (const draft of drafts) { next += 1; await client.query(`INSERT INTO acceptance_cues(id,session_id,episode_id,episode_number,track,ordinal,start_ms,end_ms,text,source_metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'{}')`, [randomUUID(), episode.session_id, episode.id, episode.episode_number, draft.track, next, draft.startMs, draft.endMs, draft.text]); }
  }

  async restoreEdit(input: { projectId: string; sessionId: string; episodeNumber: number; eventId: string; expectedSessionRevision: number; expectedEpisodeRevision: number; key: string; direction: 'undo' | 'redo' }) {
    const hash = stableDigest({ eventId: input.eventId, expectedSessionRevision: input.expectedSessionRevision, expectedEpisodeRevision: input.expectedEpisodeRevision, direction: input.direction });
    return this.transaction(async (client) => {
      await this.lockProject(client, input.projectId); const kind = input.direction === 'undo' ? 'undo_edit' : 'redo_edit'; const replay = await this.replay(client, input.projectId, input.key, kind, hash); if (replay) return { replay: true, resourceId: replay.resourceId };
      const { session, episode } = await this.lockEpisode(client, input.projectId, input.sessionId, input.episodeNumber); requireVersions(session, episode, input);
      const event = await client.query('SELECT * FROM acceptance_edit_events WHERE id = $1 AND episode_id = $2 FOR UPDATE', [input.eventId, episode.id]);
      if (!event.rows[0] || event.rows[0].event_kind === 'pass') throw acceptanceInvalid('ACCEPTANCE_EDIT_NOT_REVERSIBLE', '指定事件不可撤销或恢复。');
      const before = await cueSnapshot(client, episode.id); const target: AcceptanceCue[] = input.direction === 'undo' ? event.rows[0].before_snapshot : event.rows[0].after_snapshot;
      const metadataResult = await client.query('SELECT id, source_metadata FROM acceptance_cues WHERE episode_id = $1', [episode.id]);
      const metadataByCueId = new Map(metadataResult.rows.map((row: any) => [row.id, row.source_metadata]));
      await client.query('DELETE FROM acceptance_cues WHERE episode_id = $1', [episode.id]);
      for (const cue of target) await client.query(`INSERT INTO acceptance_cues(id,session_id,episode_id,episode_number,track,ordinal,source_cue_id,start_ms,end_ms,text,deleted,revision,source_metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [cue.id, input.sessionId, episode.id, episode.episode_number, cue.track, cue.ordinal, cue.sourceCueId, cue.startMs, cue.endMs, cue.text, cue.deleted, cue.revision, JSON.stringify(metadataByCueId.get(cue.id) ?? {})]);
      const after = await cueSnapshot(client, episode.id); const restoredId = randomUUID();
      await client.query('INSERT INTO acceptance_edit_events(id,session_id,episode_id,event_kind,before_snapshot,after_snapshot,reverses_event_id,restores_event_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [restoredId, input.sessionId, episode.id, input.direction, JSON.stringify(before), JSON.stringify(after), input.direction === 'undo' ? input.eventId : null, input.direction === 'redo' ? input.eventId : null]);
      await this.afterEpisodeMutation(client, input.sessionId, episode.id); await this.saveCommand(client, input.projectId, input.key, kind, hash, restoredId, { resourceId: restoredId }); return { replay: false, resourceId: restoredId };
    });
  }

  async createIssue(input: { projectId: string; sessionId: string; episodeNumber: number; body: CreateAcceptanceIssueBody; key: string }) {
    const hash = stableDigest(input.body); return this.transaction(async (client) => {
      await this.lockProject(client, input.projectId); const replay = await this.replay(client, input.projectId, input.key, 'create_issue', hash); if (replay) return { replay: true, resourceId: replay.resourceId };
      const { session, episode } = await this.lockEpisode(client, input.projectId, input.sessionId, input.episodeNumber); requireVersions(session, episode, input.body);
      if (input.body.cueId) { const cue = await client.query('SELECT 1 FROM acceptance_cues WHERE id = $1 AND episode_id = $2', [input.body.cueId, episode.id]); if (!cue.rows[0]) throw acceptanceNotFound('ACCEPTANCE_CUE_NOT_FOUND', '问题关联字幕不属于当前集。'); }
      const id = randomUUID(); await client.query(`INSERT INTO acceptance_issues(id,session_id,episode_id,episode_number,origin,code,severity,track,cue_id,time_ms,note) VALUES($1,$2,$3,$4,'manual','manual','warning',$5,$6,$7,$8)`, [id, input.sessionId, episode.id, episode.episode_number, input.body.track ?? null, input.body.cueId ?? null, input.body.timeMs ?? null, input.body.note.trim()]);
      await this.afterEpisodeMutation(client, input.sessionId, episode.id); await this.saveCommand(client, input.projectId, input.key, 'create_issue', hash, id, { resourceId: id }); return { replay: false, resourceId: id };
    });
  }

  async resolveIssue(input: { projectId: string; sessionId: string; episodeNumber: number; issueId: string; body: ResolveAcceptanceIssueBody; key: string }) {
    const hash = stableDigest(input.body); return this.transaction(async (client) => {
      await this.lockProject(client, input.projectId); const replay = await this.replay(client, input.projectId, input.key, 'resolve_issue', hash); if (replay) return { replay: true, resourceId: replay.resourceId };
      const { session, episode } = await this.lockEpisode(client, input.projectId, input.sessionId, input.episodeNumber); requireVersions(session, episode, input.body);
      const issue = await client.query('SELECT id FROM acceptance_issues WHERE id = $1 AND episode_id = $2 FOR UPDATE', [input.issueId, episode.id]); if (!issue.rows[0]) throw acceptanceNotFound('ACCEPTANCE_ISSUE_NOT_FOUND', '问题不存在。');
      await client.query('UPDATE acceptance_issues SET status = $2, resolution_reason = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [input.issueId, input.body.status, input.body.reason.trim()]); await this.afterEpisodeMutation(client, input.sessionId, episode.id); await this.saveCommand(client, input.projectId, input.key, 'resolve_issue', hash, input.issueId, { resourceId: input.issueId }); return { replay: false, resourceId: input.issueId };
    });
  }

  async selectVideo(input: { projectId: string; sessionId: string; episodeNumber: number; assetId: string; expectedSessionRevision: number; expectedEpisodeRevision: number; key: string }) {
    const hash = stableDigest({ assetId: input.assetId, expectedSessionRevision: input.expectedSessionRevision, expectedEpisodeRevision: input.expectedEpisodeRevision }); return this.transaction(async (client) => {
      await this.lockProject(client, input.projectId); const replay = await this.replay(client, input.projectId, input.key, 'select_video', hash); if (replay) return { replay: true, resourceId: replay.resourceId };
      const { session, episode } = await this.lockEpisode(client, input.projectId, input.sessionId, input.episodeNumber); requireVersions(session, episode, input);
      const allowed = await client.query("SELECT 1 FROM jsonb_array_elements((SELECT available_videos FROM acceptance_episodes WHERE id = $1)) video WHERE video->>'assetId' = $2", [episode.id, input.assetId]); if (!allowed.rows[0]) throw acceptanceInvalid('ACCEPTANCE_PLAYBACK_NOT_AVAILABLE', '只能选择来源快照中的已校验视频。');
      await client.query('UPDATE acceptance_episodes SET selected_video_asset_id = $2 WHERE id = $1', [episode.id, input.assetId]); await this.afterEpisodeMutation(client, input.sessionId, episode.id, 'changes_pending'); await this.saveCommand(client, input.projectId, input.key, 'select_video', hash, episode.id, { resourceId: episode.id }); return { replay: false, resourceId: episode.id };
    });
  }

  private async assertPassable(client: PoolClient, episode: EpisodeLock) {
    await this.syncAutomaticIssues(client, episode.session_id, episode.id);
    const blockers = await client.query("SELECT 1 FROM acceptance_issues WHERE episode_id = $1 AND status = 'open' LIMIT 1", [episode.id]);
    if (!episode.selected_video_asset_id || !episode.authoritative_duration_ms || blockers.rows[0]) throw acceptanceInvalid('ACCEPTANCE_PASS_BLOCKED', '本集尚有未完成的硬检查或人工问题。', 'resolve_acceptance_issues');
  }

  async passEpisodes(input: { projectId: string; sessionId: string; body: PassAcceptanceEpisodesBody; episodeNumbers?: number[]; expectedEpisodeRevision?: number; key: string }) {
    const hash = stableDigest({ ...input.body, episodeNumbers: input.episodeNumbers ?? null }); return this.transaction(async (client) => {
      await this.lockProject(client, input.projectId); const replay = await this.replay(client, input.projectId, input.key, 'pass_episodes', hash); if (replay) return { replay: true, resourceId: replay.resourceId, passed: (replay as any).passed ?? [], blocked: (replay as any).blocked ?? [] };
      const sessionResult = await client.query('SELECT * FROM acceptance_sessions WHERE id = $1 AND project_id = $2 FOR UPDATE', [input.sessionId, input.projectId]); const session = sessionResult.rows[0]; if (!session) throw acceptanceNotFound('ACCEPTANCE_SESSION_NOT_FOUND', '验收会话不存在。'); if (session.revision !== input.body.expectedSessionRevision) throw acceptanceConflict('ACCEPTANCE_SESSION_VERSION_CONFLICT', '验收会话已变化。'); if (['stale','released'].includes(session.status)) throw acceptanceConflict('ACCEPTANCE_SESSION_NOT_WRITABLE', '验收会话已经只读。');
      const episodes = await client.query<EpisodeLock>('SELECT * FROM acceptance_episodes WHERE session_id = $1 AND ($2::integer[] IS NULL OR episode_number = ANY($2)) ORDER BY episode_number FOR UPDATE', [input.sessionId, input.episodeNumbers ?? null]);
      if (input.expectedEpisodeRevision !== undefined && (episodes.rows.length !== 1 || episodes.rows[0]!.revision !== input.expectedEpisodeRevision)) throw acceptanceConflict('ACCEPTANCE_EPISODE_VERSION_CONFLICT', '本集已被其他操作更新。');
      const passed: number[] = []; const blocked: number[] = [];
      for (const episode of episodes.rows) {
        try { await this.assertPassable(client, episode); const signature = acceptanceSignature({ selectedVideoAssetId: episode.selected_video_asset_id, authoritativeDurationMs: episode.authoritative_duration_ms === null ? null : Number(episode.authoritative_duration_ms) }, await cueSnapshot(client, episode.id)); await client.query("UPDATE acceptance_episodes SET status = 'passed', pass_signature = $2, passed_at = CURRENT_TIMESTAMP, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [episode.id, signature]); await client.query('INSERT INTO acceptance_edit_events(id,session_id,episode_id,event_kind,before_snapshot,after_snapshot) VALUES($1,$2,$3,\'pass\',\'[]\',\'[]\')', [randomUUID(), input.sessionId, episode.id]); passed.push(episode.episode_number); } catch (error) { if (error instanceof Error && error.name === 'SubtitleAcceptanceError') { blocked.push(episode.episode_number); continue; } throw error; }
      }
      const allEpisodes = await client.query('SELECT status FROM acceptance_episodes WHERE session_id = $1', [input.sessionId]);
      const status = allEpisodes.rows.length > 0 && allEpisodes.rows.every((episode) => episode.status === 'passed') ? 'ready_to_release' : 'draft';
      await client.query('UPDATE acceptance_sessions SET revision = revision + 1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [input.sessionId, status]); const id = randomUUID(); await this.saveCommand(client, input.projectId, input.key, 'pass_episodes', hash, id, { resourceId: id, passed, blocked }); return { replay: false, resourceId: id, passed, blocked };
    });
  }

  async createRework(input: { projectId: string; sessionId: string; body: CreateAcceptanceReworkBody; key: string }) {
    const hash = stableDigest(input.body); return this.transaction(async (client) => {
      await this.lockProject(client, input.projectId); const replay = await this.replay(client, input.projectId, input.key, 'create_rework', hash); if (replay) return { replay: true, resourceId: replay.resourceId };
      const session = await client.query('SELECT * FROM acceptance_sessions WHERE id = $1 AND project_id = $2 FOR UPDATE', [input.sessionId, input.projectId]); if (!session.rows[0]) throw acceptanceNotFound('ACCEPTANCE_SESSION_NOT_FOUND', '验收会话不存在。'); if (session.rows[0].revision !== input.body.expectedSessionRevision) throw acceptanceConflict('ACCEPTANCE_SESSION_VERSION_CONFLICT', '验收会话已变化。');
      if (['stale', 'released'].includes(session.rows[0].status)) throw acceptanceConflict('ACCEPTANCE_SESSION_NOT_WRITABLE', '验收会话已经只读。');
      const selectedEpisodes = await client.query('SELECT episode_number FROM acceptance_episodes WHERE session_id = $1 AND episode_number = ANY($2::integer[]) FOR UPDATE', [input.sessionId, input.body.episodeNumbers]);
      if (selectedEpisodes.rowCount !== input.body.episodeNumbers.length) throw acceptanceInvalid('ACCEPTANCE_EPISODE_NOT_FOUND', '返工集数必须全部属于当前验收会话。');
      const id = randomUUID(); await client.query('INSERT INTO acceptance_rework_requests(id,project_id,session_id,episode_numbers,tracks,reason) VALUES($1,$2,$3,$4,$5,$6)', [id, input.projectId, input.sessionId, input.body.episodeNumbers, input.body.tracks, input.body.reason.trim()]); await client.query("UPDATE acceptance_episodes SET status = 'rework_required', pass_signature = NULL, passed_at = NULL, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE session_id = $1 AND episode_number = ANY($2::integer[])", [input.sessionId, input.body.episodeNumbers]); await client.query("UPDATE acceptance_sessions SET revision = revision + 1, status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [input.sessionId]); await this.saveCommand(client, input.projectId, input.key, 'create_rework', hash, id, { resourceId: id }); return { replay: false, resourceId: id };
    });
  }

}
